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
        /// The server says this plan has no AI coach (COACH_TIER_REQUIRED). The app has already checked the
        /// subscription, so this is a server-side tier mapping gap: answer with the built-in coach, never an error.
        case tierRequired
        /// The API doesn't see the subscription yet (SUBSCRIPTION_REQUIRED) while the app does.
        case subscriptionNotSynced

        /// The AI server isn't deployed or set up yet (missing route, no API key, no usage store):
        /// the app answers with its built-in coach instead of showing an error.
        var meansUnavailable: Bool {
            if case .tierRequired = self { return true }
            if case .subscriptionNotSynced = self { return true }
            if case .http(let status) = self { return status == 404 || status == 405 || status == 501 || status == 503 }
            return false
        }
    }

    /// True when real AI answers are possible: the user has an account session.
    static var isAvailable: Bool { Keychain.load() != nil }

    private struct StartBody: Encodable { let title: String? }
    private struct Conversation: Decodable { let id: String }
    private struct MessageBody: Encodable { let message: String }
    private struct Sent: Decodable { let content: String }
    /// GET /coach/usage. Fields are read leniently; the monthly counts are the ones shown.
    private struct UsageDto: Decodable {
        let used: Int?
        let limit: Int?
        let resetsAt: String?
        let tier: String?
    }

    /// Local conversation id → backend conversation id.
    private static let mapKey = "coach.remoteConversations"
    @MainActor private static func remoteId(for local: String) -> String? {
        (UserDefaults.standard.dictionary(forKey: mapKey) as? [String: String])?[local]
    }
    @MainActor private static func setRemoteId(_ remote: String?, for local: String) {
        var map = (UserDefaults.standard.dictionary(forKey: mapKey) as? [String: String]) ?? [:]
        map[local] = remote
        UserDefaults.standard.set(map, forKey: mapKey)
    }

    /// Sends the latest user message (the server builds the context and history itself) and returns the reply.
    @MainActor
    static func reply(to messages: [ChatMessage], conversationId: String, store: AppStore) async throws -> (text: String, usage: CoachUsage?) {
        guard Keychain.load() != nil else { throw Failure.signedOut }
        guard let last = messages.last(where: { $0.from == "user" }) ?? messages.last else { throw Failure.notConfigured }
        do {
            let text = try await send(last.text, local: conversationId, retry: true)
            let usage = try? await Self.usage()
            return (text, usage)
        } catch let APIError.problem(p) {
            throw map(p)
        } catch APIError.sessionExpired { throw Failure.signedOut }
    }

    @MainActor
    private static func send(_ text: String, local: String, retry: Bool) async throws -> String {
        let remote: String
        if let id = remoteId(for: local) { remote = id } else {
            let c: Conversation = try await VaultenAPI.shared.send("POST", "coach/conversations",
                                                                  body: StartBody(title: String(text.prefix(80))))
            setRemoteId(c.id, for: local)
            remote = c.id
        }
        do {
            let sent: Sent = try await VaultenAPI.shared.send("POST", "coach/conversations/\(remote)/messages",
                                                             body: MessageBody(message: String(text.prefix(8000))))
            return sent.content
        } catch let APIError.problem(p) where p.code == "CONVERSATION_NOT_FOUND" && retry {
            setRemoteId(nil, for: local)
            return try await send(text, local: local, retry: false)
        }
    }

    @MainActor
    private static func map(_ p: Problem) -> Failure {
        switch p.code {
        case "COACH_USAGE_LIMIT_REACHED":
            let limit = p.params?["limit"]?.int ?? CoachMeter.shared.usage?.limit ?? 0
            let used = p.params?["used"]?.int ?? limit
            let resets = p.params?["resetsAt"]?.string.flatMap(parseDate)
            return .limitReached(CoachUsage(tier: currentTier, used: used, limit: limit, period: "month", resetsAt: resets))
        case "SUBSCRIPTION_REQUIRED":
            return .subscriptionNotSynced
        case "COACH_TIER_REQUIRED":
            Monitoring.track("coach_tier_required", ["tier": "\(currentTier)"])
            return .tierRequired
        default:
            return .http(p.status)   // 503 COACH_UNAVAILABLE → built-in answers
        }
    }

    @MainActor private static var currentTier: CoachUsage.Tier {
        RevenueCatService.shared.isUltimate ? .ultimate : .premium
    }

    private static func parseDate(_ s: String) -> Date? {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.date(from: s) ?? ISO8601DateFormatter().date(from: s)
    }

    /// The current allowance, without spending a message (GET /coach/usage).
    @MainActor
    static func usage() async throws -> CoachUsage {
        do {
            let u: UsageDto = try await VaultenAPI.shared.send("GET", "coach/usage")
            guard let limit = u.limit else { throw Failure.http(200) }
            let tier = u.tier.flatMap { CoachUsage.Tier(rawValue: $0.lowercased()) } ?? currentTier
            return CoachUsage(tier: tier, used: u.used ?? 0, limit: limit, period: "month", resetsAt: u.resetsAt.flatMap(parseDate))
        } catch let APIError.problem(p) { throw map(p) }
    }
}

extension AppStore {
    var isUltimate: Bool { RevenueCatService.shared.isUltimate }
    /// Only tiers whose backend features include "coach" chat with it; others see it and get the paywall.
    var canUseCoach: Bool { RevenueCatService.shared.hasFeature("coach") || s.subscription.status == .active }
}
