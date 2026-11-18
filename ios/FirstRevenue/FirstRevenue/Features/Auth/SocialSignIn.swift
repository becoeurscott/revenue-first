import SwiftUI
import AuthenticationServices
import CryptoKit

/// Sign in with Apple and Google (POST /auth/social/{provider} on the Vaulten API). Google stays hidden until its
/// iOS client ID is set.
enum AuthProviders {
    /// Needs the "Sign in with Apple" capability (FirstRevenue.entitlements) and APPLE_CLIENT_IDS=com.vaulten.app on the API.
    /// Off until the API answers /auth/social/apple (it returns 503 SOCIAL_LOGIN_UNAVAILABLE while APPLE_BUNDLE_ID / APPLE_TEAM_ID are missing).
    static let appleEnabled = false
    /// The iOS OAuth client ID from Google Cloud ("….apps.googleusercontent.com"). Nil hides the button.
    static let googleClientID: String? = nil

    static var any: Bool { appleEnabled || googleClientID != nil }
}

/// "Continue with Apple / Google", then an "or" divider before the email form.
struct SocialSignInButtons: View {
    @Environment(AppStore.self) private var store
    @Environment(\.colorScheme) private var scheme
    @State private var loading: String?
    @State private var error: String?
    @State private var nonce = ""

    var body: some View {
        if AuthProviders.any {
            VStack(spacing: Space.m) {
                if AuthProviders.appleEnabled {
                    SignInWithAppleButton(.continue) { request in
                        nonce = Self.randomNonce()
                        request.requestedScopes = [.fullName, .email]
                        request.nonce = Self.sha256(nonce)
                    } onCompletion: { result in
                        Task { await apple(result) }
                    }
                    .signInWithAppleButtonStyle(scheme == .dark ? .white : .black)
                    .frame(height: 54)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .disabled(loading != nil)
                }
                if let clientID = AuthProviders.googleClientID {
                    Button { Task { await google(clientID) } } label: {
                        HStack(spacing: 10) {
                            if loading == "google" { ProgressView() } else { Image(systemName: "g.circle.fill").font(.system(size: 20, weight: .bold)) }
                            Text("Continue with Google")
                        }
                    }
                    .buttonStyle(.chunky(.option(selected: false), height: 54))
                    .disabled(loading != nil)
                }
                if let error { FormErrorBanner(message: error) }
                HStack(spacing: 12) {
                    Rectangle().fill(Theme.line).frame(height: 1)
                    Text("or").font(.footnote.weight(.semibold)).foregroundStyle(Theme.faint)
                    Rectangle().fill(Theme.line).frame(height: 1)
                }
            }
            .padding(.top, Space.xl)
        }
    }

    // MARK: Apple

    private func apple(_ result: Result<ASAuthorization, Error>) async {
        switch result {
        case .failure(let e):
            if (e as? ASAuthorizationError)?.code != .canceled { error = "Apple sign-in didn't finish. Try again." }
        case .success(let auth):
            guard let cred = auth.credential as? ASAuthorizationAppleIDCredential,
                  let token = cred.identityToken.flatMap({ String(data: $0, encoding: .utf8) }) else {
                error = "Apple sign-in didn't return an account. Try again."; return
            }
            await finish("apple") {
                try await AuthAPI.signInWithApple(identityToken: token, nonce: nonce,
                                                  firstName: cred.fullName?.givenName, lastName: cred.fullName?.familyName)
            }
        }
    }

    // MARK: Google (OAuth 2 + PKCE in the system browser sheet; no SDK)

    private func google(_ clientID: String) async {
        let scheme = clientID.components(separatedBy: ".").reversed().joined(separator: ".")
        let verifier = Self.randomNonce(length: 64)
        let challenge = Data(SHA256.hash(data: Data(verifier.utf8))).base64URL
        var c = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        c.queryItems = [
            .init(name: "client_id", value: clientID), .init(name: "redirect_uri", value: "\(scheme):/oauth2redirect"),
            .init(name: "response_type", value: "code"), .init(name: "scope", value: "openid email profile"),
            .init(name: "code_challenge", value: challenge), .init(name: "code_challenge_method", value: "S256"),
        ]
        loading = "google"
        defer { loading = nil }
        do {
            let callback = try await WebAuth.start(url: c.url!, scheme: scheme)
            guard let code = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "code" })?.value else {
                error = "Google sign-in didn't finish. Try again."; return
            }
            let idToken = try await Self.googleIDToken(code: code, verifier: verifier, clientID: clientID, redirect: "\(scheme):/oauth2redirect")
            await finish("google") { try await AuthAPI.signInWithGoogle(idToken: idToken) }
        } catch let e as ASWebAuthenticationSessionError where e.code == .canceledLogin {
        } catch {
            self.error = "Google sign-in didn't finish. Try again."
        }
    }

    private static func googleIDToken(code: String, verifier: String, clientID: String, redirect: String) async throws -> String {
        var req = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
        req.httpMethod = "POST"
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        var form = URLComponents()
        form.queryItems = [.init(name: "code", value: code), .init(name: "client_id", value: clientID), .init(name: "code_verifier", value: verifier),
                           .init(name: "grant_type", value: "authorization_code"), .init(name: "redirect_uri", value: redirect)]
        req.httpBody = form.percentEncodedQuery?.data(using: .utf8)
        struct TokenResponse: Decodable { let id_token: String }
        let (data, _) = try await URLSession.shared.data(for: req)
        return try JSONDecoder().decode(TokenResponse.self, from: data).id_token
    }

    // MARK: Shared

    private func finish(_ provider: String, _ signIn: () async throws -> AuthUser) async {
        loading = provider
        error = nil
        defer { loading = nil }
        do {
            let user = try await signIn()
            let enrollment = try? await PathsAPI.myEnrollment()
            Haptics.notify(.success)
            Monitoring.track("signed_in", ["method": provider])
            store.signedIn(user, enrollment: enrollment ?? nil)
        } catch {
            Haptics.notify(.error)
            let name = provider == "apple" ? "Apple" : "Google"
            Monitoring.track("social_sign_in_failed", ["method": provider, "code": (error as? APIError)?.code ?? "unknown"])
            self.error = (error as? APIError)?.code == "SOCIAL_LOGIN_UNAVAILABLE"
                ? "Sign in with \(name) isn't available right now. Use your email for now."
                : "We couldn't sign you in with \(name). Try again or use email."
        }
    }

    static func randomNonce(length: Int = 32) -> String {
        let chars = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        return String((0..<length).map { _ in chars[Int.random(in: 0..<chars.count)] })
    }

    static func sha256(_ s: String) -> String { SHA256.hash(data: Data(s.utf8)).map { String(format: "%02x", $0) }.joined() }
}

private extension Data {
    var base64URL: String { base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "") }
}

/// async wrapper around ASWebAuthenticationSession.
@MainActor
private enum WebAuth {
    private static let anchor = Anchor()
    private static var session: ASWebAuthenticationSession?

    static func start(url: URL, scheme: String) async throws -> URL {
        try await withCheckedThrowingContinuation { cont in
            let s = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme) { callback, error in
                if let callback { cont.resume(returning: callback) } else { cont.resume(throwing: error ?? URLError(.cancelled)) }
            }
            s.presentationContextProvider = anchor
            s.prefersEphemeralWebBrowserSession = false
            session = s
            s.start()
        }
    }

    private final class Anchor: NSObject, ASWebAuthenticationPresentationContextProviding {
        func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
            UIApplication.shared.connectedScenes.compactMap { ($0 as? UIWindowScene)?.keyWindow }.first ?? ASPresentationAnchor()
        }
    }
}
