import SwiftUI

// MARK: - Splash

struct SplashView: View {
    let onFinish: () -> Void
    @State private var logoIn = false
    @State private var textIn = false
    @State private var glow = false
    @State private var dot = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            RadialGradient(colors: [Theme.brand600.opacity(glow ? 0.45 : 0.25), .clear], center: .center, startRadius: 0, endRadius: 360)
                .ignoresSafeArea()
                .accessibilityHidden(true)

            VStack(spacing: 0) {
                ZStack {
                    RoundedRectangle(cornerRadius: 40, style: .continuous)
                        .fill(Theme.brand500.opacity(0.45))
                        .frame(width: 128, height: 128)
                        .blur(radius: glow ? 36 : 22)
                    LogoMark(size: 128)
                }
                .scaleEffect(logoIn ? 1 : 0.82)
                .opacity(logoIn ? 1 : 0)

                (Text("Vault").foregroundStyle(Theme.ink) + Text("en").foregroundStyle(Theme.textGradient))
                    .font(.system(size: 40, weight: .heavy))
                    .padding(.top, 28)
                    .opacity(textIn ? 1 : 0).offset(y: textIn ? 0 : 10)
                Text("Your first online income starts here.")
                    .font(.callout).foregroundStyle(Theme.muted)
                    .padding(.top, 8)
                    .opacity(textIn ? 1 : 0)
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Vaulten. Your first online income starts here.")

            VStack {
                Spacer()
                HStack(spacing: 8) {
                    ForEach(0..<3) { i in
                        Circle().fill(Theme.brand300)
                            .frame(width: 7, height: 7)
                            .opacity(dot == i ? 1 : 0.3)
                            .scaleEffect(dot == i ? 1.15 : 1)
                    }
                }
                .opacity(textIn ? 1 : 0)
                .padding(.bottom, 64)
                .accessibilityHidden(true)
            }
        }
        .task {
            if reduceMotion {
                logoIn = true; textIn = true
                try? await Task.sleep(for: .milliseconds(900))
                onFinish()
                return
            }
            withAnimation(.spring(response: 0.6, dampingFraction: 0.72)) { logoIn = true }
            withAnimation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true)) { glow = true }
            try? await Task.sleep(for: .milliseconds(250))
            withAnimation(.easeOut(duration: 0.45)) { textIn = true }
            for step in 1...5 {
                try? await Task.sleep(for: .milliseconds(230))
                withAnimation(.easeInOut(duration: 0.2)) { dot = step % 3 }
            }
            onFinish()
        }
    }
}

/// The Vaulten logo: the app icon artwork (Assets `Logo`), so the app and the home screen match.
struct LogoMark: View {
    var size: CGFloat = 40
    var body: some View {
        Image("Logo")
            .resizable()
            .interpolation(.high)
            .scaledToFill()
            .frame(width: size, height: size)
            .clipShape(RoundedRectangle(cornerRadius: size * 0.28, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: size * 0.28, style: .continuous).strokeBorder(.white.opacity(0.12)))
            .shadow(color: Theme.brand600.opacity(0.35), radius: 8, y: 4)
            .accessibilityHidden(true)
    }
}

/// Logo plus the "Vaulten" wordmark, for headers.
struct BrandLockup: View {
    var size: CGFloat = 36
    var body: some View {
        HStack(spacing: size * 0.3) {
            LogoMark(size: size)
            (Text("Vault").foregroundStyle(Theme.ink) + Text("en").foregroundStyle(Theme.textGradient))
                .font(.system(size: size * 0.6, weight: .heavy))
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Vaulten")
    }
}

/// Creating the account at the end of guest onboarding: sign-up first, log in one tap away.
/// Dismisses itself once the account exists (RootView keeps the onboarding state through it).
struct CreateAccountSheet: View {
    @State private var path: [AuthRoute] = []
    var body: some View {
        NavigationStack(path: $path) {
            SignupView(path: $path)
                .navigationDestination(for: AuthRoute.self) { r in
                    switch r {
                    case .login: LoginView(path: $path)
                    case .signup: SignupView(path: $path)
                    case .forgot: ForgotPasswordView()
                    case .verify(let email, let code): VerifyEmailView(path: $path, email: email, stagingCode: code)
                    }
                }
        }
        .presentationDragIndicator(.visible)
    }
}

// MARK: - Signed-out flow

enum AuthRoute: Hashable { case login, signup, forgot, verify(email: String, code: String?) }

struct AuthFlow: View {
    @State private var path: [AuthRoute] = []
    var body: some View {
        NavigationStack(path: $path) {
            WelcomeView(path: $path)
                .navigationDestination(for: AuthRoute.self) { r in
                    switch r {
                    case .login: LoginView(path: $path)
                    case .signup: SignupView(path: $path)
                    case .forgot: ForgotPasswordView()
                    case .verify(let email, let code): VerifyEmailView(path: $path, email: email, stagingCode: code)
                    }
                }
        }
    }
}

private struct AuthScaffold<Content: View, Footer: View>: View {
    @ViewBuilder var content: Content
    @ViewBuilder var footer: Footer
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) { content }
                .frame(maxWidth: 440, alignment: .leading)
                .padding(.horizontal, Space.xl)
                .padding(.bottom, Space.xl)
                .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: Space.s) { footer }.frame(maxWidth: 440).padding(.horizontal, Space.xl).padding(.bottom, Space.s).frame(maxWidth: .infinity)
        }
        .background {
            ZStack(alignment: .top) {
                Theme.bg
                Circle().fill(Theme.brand600.opacity(0.2)).frame(width: 520).blur(radius: 120).offset(y: -300)
            }
            .ignoresSafeArea()
        }
        .toolbarBackground(.hidden, for: .navigationBar)
    }
}

/// "By continuing you agree to the Terms of Use and Privacy Policy", readable, with both names tappable.
struct LegalConsentText: View {
    @State private var doc: AccountLegalDoc?

    private var text: AttributedString {
        var s = AttributedString("By continuing you agree to our ")
        var terms = AttributedString("Terms of Use")
        terms.link = URL(string: "vaulten-legal://terms")
        terms.foregroundColor = Theme.brand300
        terms.inlinePresentationIntent = .stronglyEmphasized
        var privacy = AttributedString("Privacy Policy")
        privacy.link = URL(string: "vaulten-legal://privacy")
        privacy.foregroundColor = Theme.brand300
        privacy.inlinePresentationIntent = .stronglyEmphasized
        s += terms
        s += AttributedString(" and ")
        s += privacy
        s += AttributedString(".")
        return s
    }

    var body: some View {
        Text(text)
            .font(.footnote)
            .foregroundStyle(Theme.muted)
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
            .environment(\.openURL, OpenURLAction { url in
                doc = url.host == "privacy" ? .privacy : .terms
                return .handled
            })
            .sheet(item: $doc) { AccountLegalSheet(doc: $0) }
    }
}

struct WelcomeView: View {
    @Binding var path: [AuthRoute]
    @Environment(AppStore.self) private var store
    @State private var shown = false
    @State private var bob = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: Space.l)
            VStack(spacing: 2) {
                Text("Hey!")
                    .font(.system(size: 84, weight: .black, design: .rounded))
                    .foregroundStyle(Theme.ink)
                    .rotationEffect(.degrees(-3))
                Text("Ready to earn?")
                    .font(.system(size: 26, weight: .heavy, design: .rounded))
                    .foregroundStyle(Theme.textGradient)
                    .rotationEffect(.degrees(-2))
            }
            .scaleEffect(shown ? 1 : 0.8).opacity(shown ? 1 : 0)
            .accessibilityElement(children: .combine)

            // Vault loops its clip while gently floating; the shadow breathes with it.
            ZStack(alignment: .bottom) {
                Ellipse()
                    .fill(Theme.brand600.opacity(0.35))
                    .frame(width: bob ? 120 : 160, height: 22)
                    .blur(radius: 10)
                    .offset(y: 6)
                MascotView(mood: .happy, size: 250, tapLines: ["30 days. One mission a day.", "Less theory. More action.", "Ready when you are!"], float: false, entrance: .greeting)
                    .offset(y: bob ? -14 : 0)
            }
            .padding(.top, Space.l)
            .scaleEffect(shown ? 1 : 0.7).opacity(shown ? 1 : 0)

            Spacer(minLength: Space.l)

            VStack(spacing: Space.s) {
                Text("Welcome to Vaulten")
                    .font(.system(size: 30, weight: .heavy)).foregroundStyle(Theme.ink)
                    .accessibilityAddTraits(.isHeader)
                Text("Pick how you want to earn and get a step-by-step plan to your first money online.")
                    .font(.body).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
            }
            .padding(.horizontal, Space.s)
            .opacity(shown ? 1 : 0).offset(y: shown ? 0 : 16)

            VStack(spacing: Space.m) {
                Button { Haptics.tap(); store.startGuest() } label: { Text("Get Started") }
                    .buttonStyle(.fr(.primary, size: .lg, full: true))
                Button { path.append(.login) } label: {
                    (Text("Already have an account? ").foregroundStyle(Theme.muted) + Text("Log in").foregroundStyle(Theme.brand300).fontWeight(.semibold))
                        .font(.subheadline)
                }
                .frame(minHeight: 44)
                LegalConsentText()
            }
            .padding(.top, Space.xl)
            .opacity(shown ? 1 : 0)
        }
        .frame(maxWidth: 440)
        .padding(.horizontal, Space.xl)
        .padding(.bottom, Space.s)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background {
            LinearGradient(colors: [Theme.brand500.opacity(0.55), Theme.brand600.opacity(0.18), Theme.bg], startPoint: .top, endPoint: .center)
                .background(Theme.bg)
                .ignoresSafeArea()
        }
        .toolbar(.hidden, for: .navigationBar)
        .onAppear {
            withAnimation(.spring(response: 0.7, dampingFraction: 0.75)) { shown = true }
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 1.8).repeatForever(autoreverses: true)) { bob = true }
        }
    }
}

/// Switches between Log In and Sign Up. Replacing the stack in place doesn't navigate,
/// so pop back to Welcome first, then push the other screen.
@MainActor
private func swapAuth(to route: AuthRoute, path: Binding<[AuthRoute]>) {
    path.wrappedValue.removeAll()
    Task { @MainActor in
        try? await Task.sleep(for: .milliseconds(380))
        path.wrappedValue = [route]
    }
}

struct TrailingIconLabel: LabelStyle {
    func makeBody(configuration: Configuration) -> some View { HStack(spacing: 8) { configuration.title; configuration.icon } }
}

private func isEmail(_ s: String) -> Bool { s.range(of: #"^\S+@\S+\.\S+$"#, options: .regularExpression) != nil }

struct LoginView: View {
    @Binding var path: [AuthRoute]
    @Environment(AppStore.self) private var store
    @State private var email = ""
    @State private var password = ""
    @State private var errors: [String: String] = [:]
    @State private var formError: String?
    @State private var loading = false

    var body: some View {
        AuthScaffold {
            LogoMark(size: 48).padding(.top, Space.l)
            Text("Welcome back").font(.system(size: 32, weight: .heavy)).foregroundStyle(Theme.ink).padding(.top, Space.m)
            Text("Pick up where you left off. Your streak is waiting.").font(.callout).foregroundStyle(Theme.muted).padding(.top, 6)
            VStack(spacing: Space.l) {
                FRTextField(label: "Email", text: $email, systemImage: "envelope", error: errors["email"], keyboard: .emailAddress, contentType: .emailAddress)
                FRTextField(label: "Password", text: $password, systemImage: "lock", secure: true, error: errors["password"], contentType: .password)
                HStack { Spacer(); Button("Forgot Password?") { path.append(.forgot) }.font(.subheadline.weight(.semibold)).foregroundStyle(Theme.brand300).frame(minHeight: 44) }
                if let formError { FormErrorBanner(message: formError) }
                Button(action: submit) { LoadingLabel(title: "Log In", loading: loading) }
                    .buttonStyle(.fr(.primary, size: .lg, full: true)).disabled(loading)
            }
            .padding(.top, Space.xxl)
        } footer: {
            HStack(spacing: 4) {
                Text("New here?").foregroundStyle(Theme.muted)
                Button("Create an account") { swapAuth(to: .signup, path: $path) }.fontWeight(.semibold).foregroundStyle(Theme.brand300)
            }
            .font(.subheadline).frame(minHeight: 44)
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private func submit() {
        var e: [String: String] = [:]
        if !isEmail(email) { e["email"] = "Enter a valid email address." }
        if password.isEmpty { e["password"] = "Enter your password." }
        withAnimation { errors = e; formError = nil }
        guard e.isEmpty else { Haptics.notify(.error); return }
        loading = true
        let email = email.trimmingCharacters(in: .whitespaces)
        Task { @MainActor in
            defer { loading = false }
            do {
                let user = try await AuthAPI.login(email: email, password: password)
                let enrollment = try? await PathsAPI.myEnrollment()
                store.signedIn(user, enrollment: enrollment ?? nil)
                store.showToast("Welcome back\(user.firstName.map { ", \($0)" } ?? "")")
            } catch APIError.problem(let p) where p.code == "EMAIL_NOT_VERIFIED" {
                let code = try? await AuthAPI.resendCode(email: email)
                path.append(.verify(email: email, code: code))
            } catch {
                Haptics.notify(.error)
                withAnimation { formError = AuthErrorCopy.message(error) }
            }
        }
    }
}

/// Error from the server shown above the primary button.
private struct FormErrorBanner: View {
    let message: String
    var body: some View {
        Label(message, systemImage: "exclamationmark.circle.fill")
            .font(.subheadline).foregroundStyle(Theme.danger)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(Space.m)
            .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.danger.opacity(0.1)))
            .transition(.opacity)
    }
}

struct SignupView: View {
    @Binding var path: [AuthRoute]
    @Environment(AppStore.self) private var store
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var agree = false
    @State private var errors: [String: String] = [:]
    @State private var formError: String?
    @State private var loading = false
    @State private var legal = false

    var body: some View {
        AuthScaffold {
            LogoMark(size: 48).padding(.top, Space.l)
            Text("Create your account").font(.system(size: 32, weight: .heavy)).foregroundStyle(Theme.ink).padding(.top, Space.m)
            Text("Two minutes from now you'll have a 30-day plan.").font(.callout).foregroundStyle(Theme.muted).padding(.top, 6)
            VStack(spacing: Space.l) {
                FRTextField(label: "Name", text: $name, placeholder: "Alex Carter", systemImage: "person", error: errors["name"], contentType: .name)
                FRTextField(label: "Email", text: $email, placeholder: "you@example.com", systemImage: "envelope", error: errors["email"], keyboard: .emailAddress, contentType: .emailAddress)
                VStack(alignment: .leading, spacing: 8) {
                    FRTextField(label: "Password", text: $password, placeholder: "At least 8 characters", systemImage: "lock", secure: true, error: errors["password"], contentType: .newPassword)
                    let strength = min(4, password.count / 3)
                    HStack(spacing: 6) {
                        ForEach(1...4, id: \.self) { i in
                            Capsule().fill(i <= strength ? (strength < 3 ? Theme.warning : Theme.success) : Theme.surface3).frame(height: 4)
                        }
                    }
                    .animation(.snappy, value: strength)
                    .accessibilityHidden(true)
                }
                VStack(alignment: .leading, spacing: 4) {
                    HStack(alignment: .top, spacing: 12) {
                        Button { Haptics.select(); withAnimation(.snappy) { agree.toggle() } } label: {
                            Image(systemName: agree ? "checkmark.square.fill" : "square").font(.title3).foregroundStyle(agree ? Theme.brand400 : Theme.lineStrong).frame(width: 30, height: 30)
                        }
                        .accessibilityLabel("Accept the terms")
                        .accessibilityValue(agree ? "checked" : "unchecked")
                        (Text("I agree to the ") + Text("Terms of Service").foregroundStyle(Theme.brand300).fontWeight(.semibold) + Text(" and ") + Text("Privacy Policy").foregroundStyle(Theme.brand300).fontWeight(.semibold) + Text("."))
                            .font(.subheadline).foregroundStyle(Theme.muted)
                            .onTapGesture { legal = true }
                    }
                    if let e = errors["agree"] { Text(e).font(.footnote).foregroundStyle(Theme.danger) }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                if let formError { FormErrorBanner(message: formError) }
                Button(action: submit) { LoadingLabel(title: "Create Account", loading: loading) }
                    .buttonStyle(.fr(.primary, size: .lg, full: true)).disabled(loading)
            }
            .padding(.top, Space.xxl)
        } footer: {
            HStack(spacing: 4) {
                Text("Already have an account?").foregroundStyle(Theme.muted)
                Button("Log in") { swapAuth(to: .login, path: $path) }.fontWeight(.semibold).foregroundStyle(Theme.brand300)
            }
            .font(.subheadline).frame(minHeight: 44)
        }
        .sheet(isPresented: $legal) {
            VStack(alignment: .leading, spacing: Space.m) {
                Text("Terms & Privacy").font(.title2).foregroundStyle(Theme.ink)
                Text("Your account and progress are stored securely on our servers so you can pick up on any device.")
                Text("We never sell your data. You can delete your account at any time from Settings.")
                Text("Income examples are illustrations — not guarantees of earnings.")
                Spacer()
                Button("Got it") { legal = false }.buttonStyle(.fr(.primary, size: .lg, full: true))
            }
            .font(.subheadline).foregroundStyle(Theme.muted)
            .padding(Space.xl).padding(.top, Space.s)
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
            .background(Theme.bgSunken)
        }
    }

    private func submit() {
        var e: [String: String] = [:]
        if name.trimmingCharacters(in: .whitespaces).count < 2 { e["name"] = "Tell us your name." }
        if !isEmail(email) { e["email"] = "Enter a valid email address." }
        if password.count < 8 { e["password"] = "Use at least 8 characters." }
        if !agree { e["agree"] = "Please accept the terms to continue." }
        withAnimation { errors = e; formError = nil }
        guard e.isEmpty else { Haptics.notify(.error); return }
        loading = true
        let email = email.trimmingCharacters(in: .whitespaces)
        Task { @MainActor in
            defer { loading = false }
            do {
                let account = try await AuthAPI.register(name: name.trimmingCharacters(in: .whitespaces), email: email, password: password)
                path.append(.verify(email: account.email, code: account.verificationCode))
            } catch APIError.problem(let p) where p.code == "EMAIL_ALREADY_REGISTERED" {
                Haptics.notify(.error)
                withAnimation { errors["email"] = "An account already exists with this email. Log in instead." }
            } catch {
                Haptics.notify(.error)
                withAnimation { formError = AuthErrorCopy.message(error) }
            }
        }
    }
}

/// Enter the 6-digit code sent by email. Verifying it signs the user in.
struct VerifyEmailView: View {
    @Binding var path: [AuthRoute]
    let email: String
    /// Staging returns the code in the API response so accounts can be tested without email.
    let stagingCode: String?
    @Environment(AppStore.self) private var store
    @State private var code = ""
    @State private var error: String?
    @State private var loading = false
    @State private var resending = false
    @State private var hint: String?

    var body: some View {
        AuthScaffold {
            Image(systemName: "envelope.badge.fill").font(.title2).foregroundStyle(Theme.brand300)
                .frame(width: 52, height: 52).background(Circle().fill(Theme.brand500.opacity(0.15))).padding(.top, Space.l)
            Text("Check your email").font(.system(size: 32, weight: .heavy)).foregroundStyle(Theme.ink).padding(.top, Space.m)
            (Text("Enter the 6-digit code we sent to ") + Text(email).fontWeight(.semibold).foregroundStyle(Theme.ink) + Text("."))
                .font(.callout).foregroundStyle(Theme.muted).padding(.top, 6)
            VStack(spacing: Space.l) {
                FRTextField(label: "Verification code", text: $code, placeholder: "123456", systemImage: "number", error: error, keyboard: .numberPad, contentType: .oneTimeCode)
                if let hint {
                    Label(hint, systemImage: "hammer.fill").font(.footnote).foregroundStyle(Theme.warning).frame(maxWidth: .infinity, alignment: .leading)
                }
                Button(action: verify) { LoadingLabel(title: "Verify & Continue", loading: loading) }
                    .buttonStyle(.fr(.primary, size: .lg, full: true)).disabled(loading || code.count < 6)
                Button(action: resend) { Text(resending ? "Sending…" : "Didn't get it? Send a new code") }
                    .font(.subheadline.weight(.semibold)).foregroundStyle(Theme.brand300).frame(minHeight: 44).disabled(resending)
            }
            .padding(.top, Space.xxl)
        } footer: {
            EmptyView()
        }
        .onAppear(perform: fillStagingCode)
        .onChange(of: code) { _, v in
            let digits = String(v.filter(\.isNumber).prefix(6))
            if digits != v { code = digits }
        }
    }

    private func fillStagingCode() {
        guard let stagingCode, code.isEmpty else { return }
        code = stagingCode
        hint = "Test server: the code was filled in for you."
    }

    private func verify() {
        error = nil
        loading = true
        Task { @MainActor in
            defer { loading = false }
            do {
                let user = try await AuthAPI.verifyEmail(email: email, code: code)
                let enrollment = try? await PathsAPI.myEnrollment()
                Haptics.notify(.success)
                store.signedIn(user, enrollment: enrollment ?? nil)
            } catch {
                Haptics.notify(.error)
                withAnimation { self.error = AuthErrorCopy.message(error) }
            }
        }
    }

    private func resend() {
        resending = true
        Task { @MainActor in
            defer { resending = false }
            do {
                if let newCode = try await AuthAPI.resendCode(email: email) {
                    code = newCode
                    hint = "Test server: the new code was filled in for you."
                }
                store.showToast("New code sent", .info)
            } catch {
                withAnimation { self.error = AuthErrorCopy.message(error) }
            }
        }
    }
}

/// Two steps: request a reset code by email, then set a new password with it.
struct ForgotPasswordView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppStore.self) private var store
    @State private var email = ""
    @State private var code = ""
    @State private var newPassword = ""
    @State private var error: String?
    @State private var loading = false
    @State private var sent = false

    var body: some View {
        AuthScaffold {
            LogoMark(size: 48).padding(.top, Space.l)
            if sent {
                Text("Set a new password").font(.system(size: 32, weight: .heavy)).foregroundStyle(Theme.ink).padding(.top, Space.m)
                (Text("If an account exists for ") + Text(email).fontWeight(.semibold).foregroundStyle(Theme.ink) + Text(", we sent it a 6-digit code."))
                    .font(.callout).foregroundStyle(Theme.muted).padding(.top, 6)
                VStack(spacing: Space.l) {
                    FRTextField(label: "Code", text: $code, placeholder: "123456", systemImage: "number", keyboard: .numberPad, contentType: .oneTimeCode)
                    FRTextField(label: "New password", text: $newPassword, placeholder: "At least 8 characters", systemImage: "lock", secure: true, contentType: .newPassword)
                    if let error { FormErrorBanner(message: error) }
                    Button(action: reset) { LoadingLabel(title: "Reset Password", loading: loading) }
                        .buttonStyle(.fr(.primary, size: .lg, full: true)).disabled(loading || code.count < 6 || newPassword.count < 8)
                }
                .padding(.top, Space.xxl)
                .transition(.opacity)
            } else {
                Text("Reset your password").font(.system(size: 32, weight: .heavy)).foregroundStyle(Theme.ink).padding(.top, Space.m)
                Text("Enter your email and we'll send you a code to get back in.").font(.callout).foregroundStyle(Theme.muted).padding(.top, 6)
                VStack(spacing: Space.l) {
                    FRTextField(label: "Email", text: $email, placeholder: "you@example.com", systemImage: "envelope", error: error, keyboard: .emailAddress, contentType: .emailAddress)
                    Button(action: request) { LoadingLabel(title: "Send Code", loading: loading) }
                        .buttonStyle(.fr(.primary, size: .lg, full: true)).disabled(loading)
                }
                .padding(.top, Space.xxl)
            }
        } footer: {
            EmptyView()
        }
    }

    private func request() {
        guard isEmail(email) else { withAnimation { error = "Enter the email you signed up with." }; Haptics.notify(.error); return }
        error = nil
        loading = true
        Task { @MainActor in
            defer { loading = false }
            do {
                try await AuthAPI.forgotPassword(email: email.trimmingCharacters(in: .whitespaces))
                withAnimation(.snappy) { sent = true }
            } catch {
                withAnimation { self.error = AuthErrorCopy.message(error) }
            }
        }
    }

    private func reset() {
        error = nil
        loading = true
        Task { @MainActor in
            defer { loading = false }
            do {
                try await AuthAPI.resetPassword(email: email.trimmingCharacters(in: .whitespaces), code: code, newPassword: newPassword)
                Haptics.notify(.success)
                store.showToast("Password updated. Log in with your new password.")
                dismiss()
            } catch {
                Haptics.notify(.error)
                withAnimation { self.error = AuthErrorCopy.message(error) }
            }
        }
    }
}
