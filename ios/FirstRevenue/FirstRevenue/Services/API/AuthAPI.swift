import Foundation

// Auth + profile endpoints (/auth/*, /users/me).

struct AuthUser: Codable, Hashable {
    let id: String
    let email: String
    let firstName: String?
    let lastName: String?
    let role: String
}

struct AuthSession: Decodable {
    let accessToken: String
    let refreshToken: String?
    let user: AuthUser
}

struct RegisteredAccount: Decodable {
    let userId: String
    let email: String
    let verificationRequired: Bool
    /// Only returned outside production (staging), so accounts can be verified without email.
    let verificationCode: String?
}

private struct LoginResponse: Decodable {
    let mfaRequired: Bool
    let accessToken: String?
    let refreshToken: String?
    let user: AuthUser?
}

private struct RegisterBody: Encodable { let email, password, timeZone: String; let firstName, lastName: String? }
private struct VerifyBody: Encodable { let email, code, deviceLabel: String }
private struct LoginBody: Encodable { let email, password, deviceLabel: String }
private struct EmailBody: Encodable { let email: String }
private struct ResetBody: Encodable { let email, code, newPassword: String }

enum AuthAPI {
    private static var deviceLabel: String { "Vaulten iOS" }

    static func register(name: String, email: String, password: String) async throws -> RegisteredAccount {
        let parts = name.split(separator: " ", maxSplits: 1).map(String.init)
        return try await VaultenAPI.shared.send(
            "POST", "auth/register",
            body: RegisterBody(email: email, password: password, timeZone: TimeZone.current.identifier, firstName: parts.first, lastName: parts.count > 1 ? parts[1] : nil),
            authenticated: false)
    }

    static func verifyEmail(email: String, code: String) async throws -> AuthUser {
        let session: AuthSession = try await VaultenAPI.shared.send("POST", "auth/email/verify", body: VerifyBody(email: email, code: code, deviceLabel: deviceLabel), authenticated: false)
        await VaultenAPI.shared.setSession(accessToken: session.accessToken, refreshToken: session.refreshToken)
        return session.user
    }

    static func resendCode(email: String) async throws -> String? {
        struct Accepted: Decodable { let verificationCode: String? }
        let res: Accepted = try await VaultenAPI.shared.send("POST", "auth/email/resend", body: EmailBody(email: email), authenticated: false)
        return res.verificationCode
    }

    static func login(email: String, password: String) async throws -> AuthUser {
        let res: LoginResponse = try await VaultenAPI.shared.send("POST", "auth/login", body: LoginBody(email: email, password: password, deviceLabel: deviceLabel), authenticated: false)
        // MFA is staff-only; customer accounts never get it.
        guard !res.mfaRequired, let access = res.accessToken, let user = res.user else {
            throw APIError.problem(Problem(status: 403, code: "MFA_ENROLLMENT_REQUIRED", title: nil, detail: nil, requestId: nil, errors: nil))
        }
        await VaultenAPI.shared.setSession(accessToken: access, refreshToken: res.refreshToken)
        return user
    }

    static func forgotPassword(email: String) async throws {
        let _: Empty = try await VaultenAPI.shared.send("POST", "auth/password/forgot", body: EmailBody(email: email), authenticated: false)
    }

    static func resetPassword(email: String, code: String, newPassword: String) async throws {
        let _: Empty = try await VaultenAPI.shared.send("POST", "auth/password/reset", body: ResetBody(email: email, code: code, newPassword: newPassword), authenticated: false)
    }

    static func me() async throws -> AuthUser {
        try await VaultenAPI.shared.send("GET", "users/me")
    }

    static func logout() async {
        let _: Empty? = try? await VaultenAPI.shared.send("POST", "auth/logout")
        await VaultenAPI.shared.clearSession()
    }
}

/// User-facing copy for the stable error codes. Never show `title`/`detail` (English log text).
enum AuthErrorCopy {
    static func message(_ error: Error) -> String {
        guard let api = error as? APIError else { return "Something went wrong. Try again." }
        switch api {
        case .network: return "No connection. Check your internet and try again."
        case .sessionExpired: return "Your session ended. Please sign in again."
        case .decoding: return "Something went wrong. Try again."
        case .problem(let p):
            switch p.code {
            case "INVALID_CREDENTIALS": return "Email or password is incorrect."
            case "TOO_MANY_LOGIN_ATTEMPTS": return "Too many attempts. Your account is locked for 15 minutes."
            case "EMAIL_NOT_VERIFIED": return "Verify your email first — we sent you a 6-digit code."
            case "EMAIL_ALREADY_REGISTERED": return "An account already exists with this email. Log in instead."
            case "PASSWORD_TOO_WEAK": return "Choose a stronger password: at least 8 characters with letters and numbers."
            case "INVALID_OR_EXPIRED_CODE": return "That code is wrong or expired. Request a new one."
            case "ACCOUNT_SUSPENDED": return "This account is suspended. Contact support."
            case "MFA_ENROLLMENT_REQUIRED": return "This is a staff account. Use the admin dashboard."
            case "RATE_LIMITED": return "Too many requests. Wait a moment and try again."
            case "VALIDATION_FAILED":
                if p.errors?.contains(where: { $0.field == "email" }) == true { return "Enter a valid email address." }
                if p.errors?.contains(where: { $0.field == "password" || $0.field == "newPassword" }) == true { return "Choose a stronger password: at least 8 characters." }
                return "Check the fields and try again."
            default: return "Something went wrong. Try again."
            }
        }
    }
}
