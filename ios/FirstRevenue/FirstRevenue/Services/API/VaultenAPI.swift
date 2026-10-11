import Foundation
import Security

// Client for the Vaulten REST API. Contract: docs/api/vaulten-openapi.json (Swagger is the source of truth).
// Conventions: every body is wrapped in { data, meta }, errors are RFC 9457 problem+json, and the app
// branches only on the stable `code`, never on `title`/`detail`.

enum VaultenConfig {
    static let baseURL = URL(string: "https://api.vaulten-staging.jerseycollection.shop/api/v1/")!
    static let platform = "ios"
    static var appVersion: String { Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0" }
}

struct FieldError: Decodable, Hashable {
    let field: String
    let code: String
}

struct Problem: Decodable, Error {
    let status: Int
    let code: String
    let title: String?
    let detail: String?
    let requestId: String?
    let errors: [FieldError]?
}

enum APIError: Error {
    case problem(Problem)
    /// Session ended (expired, revoked, or refresh token reused) — the user must sign in again.
    case sessionExpired
    case network
    case decoding
}

extension APIError {
    var code: String? { if case .problem(let p) = self { p.code } else { nil } }
    func fieldCode(_ field: String) -> String? {
        guard case .problem(let p) = self else { return nil }
        return p.errors?.first { $0.field == field }?.code
    }
}

private struct Envelope<T: Decodable>: Decodable { let data: T }
struct Empty: Decodable {}
private struct RefreshBody: Encodable { let refreshToken: String }

/// Refresh token lives in the Keychain (per the integration guide); the access token only in memory.
enum Keychain {
    private static let service = "com.firstrevenue.vaulten"
    private static let account = "refreshToken"

    static func save(_ token: String?) {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account]
        SecItemDelete(query as CFDictionary)
        guard let token, let data = token.data(using: .utf8) else { return }
        var add = query
        add[kSecValueData as String] = data
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(add as CFDictionary, nil)
    }

    static func load() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: account,
            kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
}

actor VaultenAPI {
    static let shared = VaultenAPI()

    private var accessToken: String?
    private var refreshTask: Task<Void, Error>?
    private let session = URLSession(configuration: .default)
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    /// Called when the session can no longer be renewed, so the UI can return to sign-in.
    nonisolated static let sessionEndedNotification = Notification.Name("VaultenSessionEnded")

    var hasStoredSession: Bool { Keychain.load() != nil }

    func setSession(accessToken: String, refreshToken: String?) {
        self.accessToken = accessToken
        if let refreshToken { Keychain.save(refreshToken) }
    }

    func clearSession() {
        accessToken = nil
        refreshTask?.cancel()
        refreshTask = nil
        Keychain.save(nil)
    }

    // MARK: Requests

    func send<T: Decodable>(_ method: String, _ path: String, body: (any Encodable)? = nil, authenticated: Bool = true, idempotencyKey: String? = nil, as: T.Type = T.self) async throws -> T {
        do {
            return try await perform(method, path, body: body, authenticated: authenticated, idempotencyKey: idempotencyKey)
        } catch APIError.problem(let p) where p.status == 401 && authenticated {
            try await refresh()
            return try await perform(method, path, body: body, authenticated: authenticated, idempotencyKey: idempotencyKey)
        }
    }

    private func perform<T: Decodable>(_ method: String, _ path: String, body: (any Encodable)?, authenticated: Bool, idempotencyKey: String?) async throws -> T {
        var request = URLRequest(url: VaultenConfig.baseURL.appendingPathComponent(path))
        request.httpMethod = method
        request.setValue(VaultenConfig.platform, forHTTPHeaderField: "X-Client-Platform")
        request.setValue(VaultenConfig.appVersion, forHTTPHeaderField: "X-Client-Version")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if authenticated {
            if accessToken == nil { try await refresh() }
            if let accessToken { request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization") }
        }
        if let idempotencyKey { request.setValue(idempotencyKey, forHTTPHeaderField: "Idempotency-Key") }
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try encoder.encode(body)
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.network
        }
        guard let http = response as? HTTPURLResponse else { throw APIError.network }

        guard (200..<300).contains(http.statusCode) else {
            if let problem = try? decoder.decode(Problem.self, from: data) { throw APIError.problem(problem) }
            throw APIError.problem(Problem(status: http.statusCode, code: "HTTP_\(http.statusCode)", title: nil, detail: nil, requestId: nil, errors: nil))
        }
        if http.statusCode == 204 || data.isEmpty {
            if let empty = Empty() as? T { return empty }
            throw APIError.decoding
        }
        do {
            return try decoder.decode(Envelope<T>.self, from: data).data
        } catch {
            throw APIError.decoding
        }
    }

    // MARK: Session refresh

    /// Single-flight: concurrent 401s share one refresh, because each refresh rotates the token.
    private func refresh() async throws {
        if let refreshTask { return try await refreshTask.value }
        let task = Task { try await self.performRefresh() }
        refreshTask = task
        defer { refreshTask = nil }
        try await task.value
    }

    private func performRefresh() async throws {
        guard let token = Keychain.load() else { throw APIError.sessionExpired }
        do {
            let session: AuthSession = try await perform("POST", "auth/refresh", body: RefreshBody(refreshToken: token), authenticated: false, idempotencyKey: nil)
            setSession(accessToken: session.accessToken, refreshToken: session.refreshToken)
        } catch APIError.problem(let p) where p.status == 401 || p.status == 403 || p.code == "INVALID_REFRESH_TOKEN" {
            // Expired, revoked, or a reused (stolen) token: the server killed the session.
            clearSession()
            await MainActor.run { NotificationCenter.default.post(name: Self.sessionEndedNotification, object: nil) }
            throw APIError.sessionExpired
        }
    }
}
