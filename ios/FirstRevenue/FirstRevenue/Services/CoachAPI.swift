import Foundation
import Observation

/// How many AI Coach messages the user has left. The server (api/coach.ts) counts and enforces them;
/// the app only displays what it last heard.
struct CoachUsage: Decodable, Hashable {
    enum Tier: String, Decodable { case free, premium, ultimate, trial }
    let tier: Tier
    let used: Int
    let limit: Int
    /// "lifetime" for the free taste, "month" for the paid plans.
    let period: String
    let resetsAt: Date?

    var remaining: Int { max(limit - used, 0) }
    var isSpent: Bool { remaining == 0 }

    /// "7 of 10 messages left this month" / "2 of 3 free messages left".
    var summary: String {
        switch tier {
        case .free: "\(remaining) of \(limit) free coach \(limit == 1 ? "message" : "messages") left"
        case .premium: "\(remaining) of \(limit) coach messages left this month"
        case .ultimate: "\(remaining) of \(limit) coach messages left this month"
        case .trial: "\(remaining) of \(limit) coach messages left in your trial"
        }
    }
}

/// The last allowance the server reported, shared by every coach screen.
@MainActor
@Observable
final class CoachMeter {
    static let shared = CoachMeter()
    private(set) var usage: CoachUsage?
    private init() {}

    func update(_ usage: CoachUsage?) { if let usage { self.usage = usage } }
    func reset() { usage = nil }

    /// Fetches the current allowance (GET api/coach). Silent on failure.
    func refresh() async {
        guard let u = try? await CoachAPI.usage() else { return }
        usage = u
    }
}

/// Claude answers through api/coach.ts, metered per account and plan.
enum CoachAPI {
    enum Failure: Error {
        case notConfigured, signedOut
        /// The plan's allowance is spent; carries the usage to show.
        case limitReached(CoachUsage)
        case http(Int)

        /// The AI server isn't deployed or set up yet (missing route, no API key, no usage store):
        /// the app answers with its built-in coach instead of showing an error.
        var meansUnavailable: Bool {
            if case .http(let status) = self { return status == 404 || status == 405 || status == 501 || status == 503 }
            return false
        }
    }

    /// True when real AI answers are possible: the endpoint is configured and the user has an account session.
    static var isAvailable: Bool { VaultenConfig.aiBaseURL != nil && Keychain.load() != nil }

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
            let month: Int
            let focus: String
        }
        struct Message: Encodable { let from, text: String }
        struct AI: Encodable { let distinctId, sessionId, traceId: String }
        let context: Context
        let messages: [Message]
        let ai: AI
    }

    private struct Reply: Decodable { let reply: String; let usage: CoachUsage? }
    private struct LimitBody: Decodable { let usage: CoachUsage }
    private struct UsageBody: Decodable { let usage: CoachUsage }

    private static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .custom { decoder in
            let s = try decoder.singleValueContainer().decode(String.self)
            let f = ISO8601DateFormatter()
            f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = f.date(from: s) ?? ISO8601DateFormatter().date(from: s) { return date }
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Bad date \(s)"))
        }
        return d
    }()

    /// Sends the conversation and returns the coach's answer. Counts one message against the user's plan.
    @MainActor
    static func reply(to messages: [ChatMessage], conversationId: String, store: AppStore) async throws -> (text: String, usage: CoachUsage?) {
        guard let e = store.enrollment else { throw Failure.notConfigured }
        let n = e.niche
        let a = e.answers
        let day = store.program.currentDay
        let body = Body(
            context: .init(
                journeyId: e.journeyId.rawValue, journeyVersion: e.journeyVersion, niche: n.normalizedLabel,
                nicheProfile: .init(normalizedLabel: n.normalizedLabel, audience: n.audience, problemOrDesire: n.problemOrDesire,
                                    allowedClaims: n.allowedClaims, restrictedTopics: n.restrictedTopics, exampleTerms: n.exampleTerms,
                                    monetizationOptions: n.monetizationOptions),
                startingStage: e.startingStage.rawValue,
                constraints: .init(weeklyTime: a.weeklyTime, budget: a.budget, equipment: a.equipment, skills: a.skills, location: a.location),
                name: store.s.user.firstName, goal: e.goal.label, currentDay: day,
                currentMission: MockData.day(store.s.pathId, day)?.missionTitle ?? "",
                metrics: Dictionary(uniqueKeysWithValues: store.stats.logged.prefix(12).map { ($0.key.rawValue, $0.value) }),
                month: e.month ?? 1, focus: e.focus ?? ""),
            messages: messages.suffix(12).map { .init(from: $0.from, text: $0.text) },
            ai: .init(distinctId: "enrollment:\(e.id)", sessionId: conversationId, traceId: UUID().uuidString)
        )
        let (data, status) = try await send(method: "POST", body: try JSONEncoder().encode(body), timeout: 90)
        if status == 402, let limit = try? decoder.decode(LimitBody.self, from: data) { throw Failure.limitReached(limit.usage) }
        guard status == 200 else { throw Failure.http(status) }
        let reply = try decoder.decode(Reply.self, from: data)
        return (reply.reply, reply.usage)
    }

    /// The current allowance, without spending a message.
    @MainActor
    static func usage() async throws -> CoachUsage {
        let (data, status) = try await send(method: "GET", body: nil, timeout: 20)
        guard status == 200 else { throw Failure.http(status) }
        return try decoder.decode(UsageBody.self, from: data).usage
    }

    @MainActor
    private static func send(method: String, body: Data?, timeout: TimeInterval) async throws -> (Data, Int) {
        guard let base = VaultenConfig.aiBaseURL else { throw Failure.notConfigured }
        guard Keychain.load() != nil else { throw Failure.signedOut }
        let token = try await VaultenAPI.shared.bearerToken()
        var request = URLRequest(url: base.appendingPathComponent(VaultenConfig.aiPath("coach")), timeoutInterval: timeout)
        request.httpMethod = method
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = body
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        return (data, (response as? HTTPURLResponse)?.statusCode ?? 0)
    }
}

extension AppStore {
    var isUltimate: Bool { RevenueCatService.shared.isUltimate }
    /// Only subscribers (including free trials) chat with the coach; explorers see it and get the paywall.
    var canUseCoach: Bool { isPremium }
}
