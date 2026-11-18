import Foundation
import UIKit

// Support messages (POST /support/messages; spec: docs/api/admin-extensions.md). Staff read them in the admin
// Support inbox. Until the backend has the endpoint, the app offers a pre-filled email to `supportEmail` instead,
// so no message is lost. Messages written offline are kept and sent the next time the app is opened.

enum Support {
    /// Where users can always write to us. Change it here when the support mailbox exists.
    static let supportEmail = "support@vaulten.app"
}

struct SupportMessage: Codable, Hashable {
    enum Kind: String, Codable { case contact, problem }
    let kind: Kind
    let email: String
    let message: String
    let category: String?
    let appVersion: String
    let platform: String
    let device: String
    let osVersion: String
    let clientId: String
    /// Extra context the user agreed to attach (report form "Include diagnostic info").
    let diagnostics: String?

    @MainActor
    static func make(kind: Kind, email: String, message: String, category: String?, diagnostics: String? = nil) -> SupportMessage {
        SupportMessage(kind: kind, email: email, message: message, category: category, appVersion: VaultenConfig.appVersion,
                       platform: VaultenConfig.platform, device: UIDevice.current.model, osVersion: UIDevice.current.systemVersion,
                       clientId: UUID().uuidString, diagnostics: diagnostics)
    }

    /// A mailto: link with the message pre-filled, for when the backend can't take it.
    var mailURL: URL? {
        var c = URLComponents()
        c.scheme = "mailto"
        c.path = Support.supportEmail
        let subject = kind == .problem ? "Problem report: \(category ?? "Other")" : "Support: \(category ?? "Question")"
        let body = "\(message)\n\n---\nReply to: \(email)\nApp \(appVersion) · iOS \(osVersion) · \(device)\(diagnostics.map { " · \($0)" } ?? "")"
        c.queryItems = [URLQueryItem(name: "subject", value: subject), URLQueryItem(name: "body", value: body)]
        return c.url
    }
}

/// POST /support/messages → { message: { id, status, ... }, replyPromise }.
struct SupportTicket: Decodable {
    struct Stored: Decodable { let id: String }
    let message: Stored
    let replyPromise: String?
    /// Short reference shown to the user.
    var ticketNumber: String { String(message.id.suffix(6)).uppercased() }
}

/// The backend takes only `body` (≤ 5000 chars), so the form fields and device info go into it.
private struct SupportBody: Encodable {
    let body: String
    init(_ m: SupportMessage) {
        let head = m.kind == .problem ? "Problem report: \(m.category ?? "Other")" : "Support: \(m.category ?? "Question")"
        let foot = "Reply to: \(m.email) · App \(m.appVersion) · iOS \(m.osVersion) · \(m.device)\(m.diagnostics.map { " · \($0)" } ?? "")"
        body = String("\(head)\n\n\(m.message)\n\n---\n\(foot)".prefix(5000))
    }
}

enum SupportResult {
    /// Received by the backend; shows the real ticket number.
    case sent(ticketNumber: String)
    /// No connection: kept on the phone and sent later.
    case queued
    /// The backend can't take it (endpoint missing, server error): offer the email instead.
    case useEmail(URL?)
}

enum SupportAPI {
    private static let pendingKey = "support.pending"

    /// Sends the message as the signed-in user when there is one (so staff see who wrote), anonymously otherwise.
    static func submit(_ m: SupportMessage, signedIn: Bool) async -> SupportResult {
        do {
            let ticket = try await post(m, signedIn: signedIn)
            Monitoring.track("support_message_sent", ["kind": m.kind.rawValue])
            return .sent(ticketNumber: ticket.ticketNumber)
        } catch APIError.network {
            savePending(m)
            Monitoring.track("support_message_queued", ["kind": m.kind.rawValue])
            return .queued
        } catch {
            Monitoring.track("support_message_fallback_email", ["kind": m.kind.rawValue, "code": (error as? APIError)?.code ?? "unknown"])
            return .useEmail(m.mailURL)
        }
    }

    /// Sends what was written offline. Called at launch; anything that still can't go out stays for next time.
    static func flushPending(signedIn: Bool) async {
        var left: [SupportMessage] = []
        for m in loadPending() {
            do { _ = try await post(m, signedIn: signedIn) } catch APIError.network { left.append(m) } catch {}
        }
        save(left)
    }

    private static func post(_ m: SupportMessage, signedIn: Bool) async throws -> SupportTicket {
        // The endpoint requires an account; signed-out users get the email fallback.
        guard signedIn else { throw APIError.problem(Problem(status: 401, code: "UNAUTHENTICATED", title: nil, detail: nil, requestId: nil, errors: nil, params: nil)) }
        return try await VaultenAPI.shared.send("POST", "support/messages", body: SupportBody(m), idempotencyKey: m.clientId)
    }

    private static func loadPending() -> [SupportMessage] {
        guard let data = UserDefaults.standard.data(forKey: pendingKey) else { return [] }
        return (try? JSONDecoder().decode([SupportMessage].self, from: data)) ?? []
    }

    private static func savePending(_ m: SupportMessage) { save(loadPending() + [m]) }

    private static func save(_ list: [SupportMessage]) {
        if list.isEmpty { UserDefaults.standard.removeObject(forKey: pendingKey) }
        else { UserDefaults.standard.set(try? JSONEncoder().encode(list), forKey: pendingKey) }
    }
}
