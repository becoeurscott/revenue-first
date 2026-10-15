import Foundation

/// Writes the personal program. Claude writes it through api/program.ts when the AI endpoint is configured
/// and the user is signed in; otherwise (offline, endpoint down) it is composed on the device from the
/// journey's plan and the user's niche, so the flow never blocks on the network.
///
/// The free/paid boundary lives here and on the server: `preview` only ever writes Week 1, and `complete`
/// (Days 8–30) is only called by the store once the user has Premium — the server re-checks with RevenueCat.
enum ProgramGenerator {
    static func preview(for e: JourneyEnrollment, name: String) async -> GeneratedProgram {
        let plan = skeleton(e)
        if let remote = try? await ProgramAPI.write(.preview, enrollment: e, name: name, plan: plan, header: nil),
           let title = remote.title, let summary = remote.summary {
            return GeneratedProgram(title: title, summary: summary, weeks: remote.weeks, days: remote.days, source: .ai,
                                    nicheVersion: e.niche.version, generatedAt: Date())
        }
        return OnDeviceProgram.preview(e, plan: plan)
    }

    /// Adds Days 8–30 (and Weeks 2–4) to a program that has Week 1.
    static func complete(_ program: GeneratedProgram, for e: JourneyEnrollment, name: String) async -> GeneratedProgram {
        let plan = skeleton(e)
        var out = program
        if let remote = try? await ProgramAPI.write(.full, enrollment: e, name: name, plan: plan, header: program) {
            out.weeks = merge(out.weeks, remote.weeks, by: \.week)
            out.days = merge(out.days, remote.days, by: \.day)
        }
        // Anything the server didn't write (offline, not configured, an error) is filled in on the device.
        let device = OnDeviceProgram.full(e, plan: plan)
        out.weeks = merge(device.weeks, out.weeks, by: \.week)
        out.days = merge(device.days, out.days, by: \.day)
        out.generatedAt = Date()
        return out
    }

    private static func skeleton(_ e: JourneyEnrollment) -> [DayPlan] {
        Journeys.config(e.journeyId)?.track.map(MockData.plan) ?? []
    }

    /// `newer` wins on the same key; the result is sorted by key.
    private static func merge<T, K: Comparable & Hashable>(_ base: [T], _ newer: [T], by key: KeyPath<T, K>) -> [T] {
        var map = Dictionary(base.map { ($0[keyPath: key], $0) }, uniquingKeysWith: { _, b in b })
        for item in newer { map[item[keyPath: key]] = item }
        return map.values.sorted { $0[keyPath: key] < $1[keyPath: key] }
    }
}

// MARK: - On the device

/// The program composed from the journey's own plan, the niche and the setup answers. Same shape as the AI one.
enum OnDeviceProgram {
    static func preview(_ e: JourneyEnrollment, plan: [DayPlan]) -> GeneratedProgram {
        build(e, plan: plan, days: 1...GeneratedProgram.freeDays)
    }

    static func full(_ e: JourneyEnrollment, plan: [DayPlan]) -> GeneratedProgram {
        build(e, plan: plan, days: 1...MockData.totalDays)
    }

    private static func build(_ e: JourneyEnrollment, plan: [DayPlan], days: ClosedRange<Int>) -> GeneratedProgram {
        let config = Journeys.config(e.journeyId)
        let path = config?.track.map(MockData.path)
        let niche = e.niche
        let weekCount = (days.upperBound + 6) / 7
        let weeks = (path?.weeks ?? []).filter { $0.week <= min(weekCount, 4) }.map { w in
            ProgramWeek(week: w.week, title: w.title, outcome: w.focus.joined(separator: ", ").capitalizedFirst)
        }
        let programDays = plan.filter { days.contains($0.day) }.map { d in
            ProgramDay(day: d.day, title: d.theme, objective: d.missionTitle, steps: [],
                       tip: d.nicheHint.map(niche.fill) ?? d.stageHints?[e.startingStage.rawValue] ?? d.goal,
                       deliverable: d.goal)
        }
        return GeneratedProgram(
            title: "\(niche.normalizedLabel): \(path?.name ?? config?.label ?? "your 30-day plan")",
            summary: summary(e),
            weeks: weeks,
            days: programDays,
            source: .onDevice,
            nicheVersion: niche.version,
            generatedAt: Date()
        )
    }

    private static func summary(_ e: JourneyEnrollment) -> String {
        let time = e.answers.weeklyTime.isEmpty ? "" : ", built around \(e.answers.weeklyTime.lowercased()) a week"
        return "30 days of missions for \(e.niche.audience)\(time). First goal: \(e.goal.label.lowercasedFirst)."
    }
}

// MARK: - Claude, through api/program.ts

enum ProgramAPI {
    enum Scope: String, Encodable { case preview, full }

    struct Written: Decodable {
        let title: String?
        let summary: String?
        let weeks: [ProgramWeek]
        let days: [ProgramDay]
    }

    enum Failure: Error { case notConfigured, signedOut, http(Int) }

    private struct Body: Encodable {
        struct Context: Encodable {
            struct Profile: Encodable {
                let normalizedLabel, audience, problemOrDesire: String
                let allowedClaims, restrictedTopics, exampleTerms, monetizationOptions: [String]
            }
            struct Constraints: Encodable { let weeklyTime, budget: String; let equipment, skills: [String]; let location: String }
            let journeyId: String
            let journeyVersion: Int
            let niche: String
            let nicheProfile: Profile
            let startingStage: String
            let constraints: Constraints
            let name, goal: String
            let currentDay: Int?
            let currentMission: String
            let metrics: [String: Double]
            /// Month of the journey (1 = first plan) and what this month is aimed at, from the last review.
            let month: Int
            let focus: String
        }
        struct Day: Encodable { let day, week: Int; let theme, mission, goal: String }
        struct Header: Encodable { let title, summary: String }
        struct AI: Encodable { let distinctId, sessionId, traceId: String }
        let scope: Scope
        let context: Context
        let plan: [Day]
        let program: Header?
        let ai: AI
    }

    static func write(_ scope: Scope, enrollment e: JourneyEnrollment, name: String, plan: [DayPlan], header: GeneratedProgram?) async throws -> Written {
        guard let base = VaultenConfig.aiBaseURL else { throw Failure.notConfigured }
        guard await VaultenAPI.shared.hasStoredSession else { throw Failure.signedOut }
        let token = try await VaultenAPI.shared.bearerToken()
        let n = e.niche
        let a = e.answers
        let body = Body(
            scope: scope,
            context: .init(
                journeyId: e.journeyId.rawValue, journeyVersion: e.journeyVersion, niche: n.normalizedLabel,
                nicheProfile: .init(normalizedLabel: n.normalizedLabel, audience: n.audience, problemOrDesire: n.problemOrDesire,
                                    allowedClaims: n.allowedClaims, restrictedTopics: n.restrictedTopics, exampleTerms: n.exampleTerms,
                                    monetizationOptions: n.monetizationOptions),
                startingStage: e.startingStage.rawValue,
                constraints: .init(weeklyTime: a.weeklyTime, budget: a.budget, equipment: a.equipment, skills: a.skills, location: a.location),
                name: name, goal: e.goal.label, currentDay: nil, currentMission: "", metrics: [:],
                month: e.month ?? 1, focus: e.focus ?? ""),
            plan: plan.map { .init(day: $0.day, week: $0.week, theme: $0.theme, mission: $0.missionTitle, goal: $0.goal) },
            program: header.map { .init(title: $0.title, summary: $0.summary) },
            ai: .init(distinctId: "enrollment:\(e.id)", sessionId: UUID().uuidString, traceId: UUID().uuidString)
        )

        var request = URLRequest(url: base.appendingPathComponent(VaultenConfig.aiPath("program")), timeoutInterval: 200)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(body)
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard status == 200 else { throw Failure.http(status) }
        return try JSONDecoder().decode(Written.self, from: data)
    }
}

extension String {
    var capitalizedFirst: String { prefix(1).uppercased() + dropFirst() }
    var lowercasedFirst: String { prefix(1).lowercased() + dropFirst() }
}
