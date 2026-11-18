import Foundation

/// Mirrors the local journey to the Vaulten backend, which needs a server-side enrollment for the
/// AI program, the goal and per-journey data. Every call is best effort: on failure the app keeps working
/// on the device.
enum BackendSync {
    private struct Enrollment: Decodable { let id: String; let journeyId: String; let status: String? }
    private struct CreateBody: Encodable {
        let id: String?
        let journeyId: String
        let answers: JourneyAnswers
        let startingStage: String
        let goal: String
        let niche: Niche
        struct Niche: Encodable {
            let rawInput, normalizedLabel, audience, problemOrDesire: String
            let allowedClaims, restrictedTopics, exampleTerms, monetizationOptions: [String]
            let cautionNote: String?
            let source: String
        }
    }

    static func isUUID(_ s: String) -> Bool { UUID(uuidString: s) != nil }
    private static let cacheKey = "backend.enrollmentIds"

    /// The backend enrollment id for this local journey, creating or activating it if needed.
    @MainActor
    static func enrollmentId(for e: JourneyEnrollment) async -> String? {
        guard Keychain.load() != nil else { return nil }
        var cache = (UserDefaults.standard.dictionary(forKey: cacheKey) as? [String: String]) ?? [:]
        if let id = cache[e.id] { return id }
        let api = VaultenAPI.shared
        var found: String?
        if let active: Enrollment = try? await api.send("GET", "enrollments/active"), active.journeyId == e.journeyId.rawValue {
            found = active.id
        } else if let all: [Enrollment] = try? await api.send("GET", "enrollments"),
                  let match = all.first(where: { $0.journeyId == e.journeyId.rawValue && ($0.status == "active" || $0.status == "paused") }) {
            let activated: Enrollment? = try? await api.send("POST", "enrollments/\(match.id)/activate")
            found = activated?.id ?? match.id
        } else {
            let n = e.niche
            let body = CreateBody(
                id: isUUID(e.id) ? e.id : nil, journeyId: e.journeyId.rawValue, answers: e.answers,
                startingStage: e.startingStage.rawValue, goal: e.goal.label,
                niche: .init(rawInput: n.rawInput.isEmpty ? n.normalizedLabel : n.rawInput, normalizedLabel: n.normalizedLabel,
                             audience: n.audience, problemOrDesire: n.problemOrDesire, allowedClaims: n.allowedClaims,
                             restrictedTopics: n.restrictedTopics, exampleTerms: n.exampleTerms,
                             monetizationOptions: n.monetizationOptions, cautionNote: n.cautionNote, source: n.source.rawValue))
            let created: Enrollment? = try? await api.send("POST", "enrollments", body: body)
            found = created?.id
        }
        if let found { cache[e.id] = found; UserDefaults.standard.set(cache, forKey: cacheKey) }
        return found
    }

    // MARK: AI program (POST /me/program/generate)

    private struct Generated: Decodable { let program: Program; let programUnlocked: Bool? }
    private struct Program: Decodable {
        let title: String?
        let summary: String?
        let weeks: [Week]?
        let days: [Day]
        struct Week: Decodable { let week: Int; let title: String?; let outcome: String?; let objective: String? }
        struct Day: Decodable {
            let day: Int
            let title: String?
            let objective: String?
            let steps: [String]?
            let tasks: [Task]?
            let tip: String?
            let deliverable: String?
            struct Task: Decodable { let title: String? }
        }
    }

    /// The AI-written program for the active journey, or nil (off, not entitled, failed) — the caller falls back.
    @MainActor
    static func generateProgram(for e: JourneyEnrollment) async -> ProgramAPI.Written? {
        guard await enrollmentId(for: e) != nil,
              let g: Generated = try? await VaultenAPI.shared.send("POST", "me/program/generate") else { return nil }
        let days = g.program.days.map { d in
            ProgramDay(day: d.day, title: d.title ?? "Day \(d.day)", objective: d.objective ?? "",
                       steps: d.steps ?? (d.tasks ?? []).compactMap(\.title), tip: d.tip ?? "", deliverable: d.deliverable ?? "")
        }
        guard !days.isEmpty else { return nil }
        let weeks = (g.program.weeks ?? []).map {
            ProgramWeek(week: $0.week, title: $0.title ?? "Week \($0.week)", outcome: $0.outcome ?? $0.objective ?? "")
        }
        return ProgramAPI.Written(title: g.program.title ?? "Your 30-day plan", summary: g.program.summary ?? "",
                                  weeks: weeks, days: days)
    }

    // MARK: Goal (PUT /enrollments/{id}/goal)

    private struct GoalBody: Encodable { let label: String; let target: Int?; let currency: String? }

    @MainActor
    static func pushGoal(for e: JourneyEnrollment) {
        Task {
            guard let id = await enrollmentId(for: e) else { return }
            let _: Empty? = try? await VaultenAPI.shared.send("PUT", "enrollments/\(id)/goal",
                body: GoalBody(label: e.goal.label, target: e.goal.target > 0 ? e.goal.target : nil, currency: e.goal.isMoney ? "USD" : nil))
        }
    }

    // MARK: Saved items (PUT/DELETE /me/saved/{kind}/{id})

    /// Only backend content (UUID ids) and YouTube videos can be saved server-side; local catalog items stay local.
    @MainActor
    static func setSaved(kind: String, id: String, saved: Bool) {
        guard Keychain.load() != nil else { return }
        let ok = kind == "video" ? id.count == 11 : isUUID(id)
        guard ok else { return }
        Task { let _: Empty? = try? await VaultenAPI.shared.send(saved ? "PUT" : "DELETE", "me/saved/\(kind)/\(id)") }
    }

    // MARK: Data export (POST /users/me/export)

    private struct ExportBody: Encodable { let password: String }
    enum ExportFailure: Error { case wrongPassword, tooMany, other }

    /// Downloads the account's server-side data as a JSON file and returns its URL.
    static func exportAccount(password: String) async throws -> URL {
        do {
            let data: AnyJSON = try await VaultenAPI.shared.send("POST", "users/me/export", body: ExportBody(password: password))
            let json = try JSONEncoder().encode(data)
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("vaulten-account-export.json")
            try json.write(to: url)
            return url
        } catch let APIError.problem(p) {
            switch p.code {
            case "REAUTHENTICATION_REQUIRED", "CURRENT_PASSWORD_INCORRECT", "INVALID_CREDENTIALS": throw ExportFailure.wrongPassword
            case "RATE_LIMITED": throw ExportFailure.tooMany
            default: throw ExportFailure.other
            }
        }
    }
}

/// Any JSON value, kept as is (used to save the export file unchanged).
indirect enum AnyJSON: Codable {
    case null, bool(Bool), number(Double), string(String), array([AnyJSON]), object([String: AnyJSON])
    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let b = try? c.decode(Bool.self) { self = .bool(b) }
        else if let n = try? c.decode(Double.self) { self = .number(n) }
        else if let s = try? c.decode(String.self) { self = .string(s) }
        else if let a = try? c.decode([AnyJSON].self) { self = .array(a) }
        else { self = .object(try c.decode([String: AnyJSON].self)) }
    }
    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .null: try c.encodeNil()
        case .bool(let b): try c.encode(b)
        case .number(let n): try c.encode(n)
        case .string(let s): try c.encode(s)
        case .array(let a): try c.encode(a)
        case .object(let o): try c.encode(o)
        }
    }
}
