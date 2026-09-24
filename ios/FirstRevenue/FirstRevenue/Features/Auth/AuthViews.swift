import SwiftUI

// MARK: - Splash

struct SplashView: View {
    let onFinish: () -> Void
    @State private var progress = 0.0
    @State private var appeared = false
    @State private var spin = false

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            Circle().fill(Theme.brand600.opacity(0.28)).frame(width: 460).blur(radius: 110)
            Circle()
                .strokeBorder(Theme.brand500.opacity(0.25), style: StrokeStyle(lineWidth: 1, dash: [4, 6]))
                .frame(width: 290)
                .overlay(alignment: .top) { Circle().fill(Theme.brand400).frame(width: 12).shadow(color: Theme.brand500, radius: 6).offset(y: -6) }
                .overlay(alignment: .leading) { Circle().fill(Theme.accent).frame(width: 8).offset(x: -4) }
                .overlay(alignment: .bottomTrailing) { Circle().fill(Theme.success).frame(width: 10).offset(x: -24, y: -14) }
                .rotationEffect(.degrees(spin ? 360 : 0))
                .offset(y: -70)

            VStack(spacing: 0) {
                MascotView(mood: progress > 0.85 ? .excited : .happy, size: 168, interactive: false)
                    .scaleEffect(appeared ? 1 : 0.7).opacity(appeared ? 1 : 0)
                HStack(spacing: 12) {
                    LogoMark(size: 44)
                    (Text("First").foregroundStyle(Theme.ink) + Text("Revenue").foregroundStyle(Theme.textGradient))
                        .font(.system(size: 32, weight: .heavy))
                }
                .padding(.top, 32)
                .opacity(appeared ? 1 : 0).offset(y: appeared ? 0 : 12)
                Text("Your first client starts here.").font(.callout).foregroundStyle(Theme.muted).padding(.top, 10)
                    .opacity(appeared ? 1 : 0)
                ProgressBar(value: progress, height: 4, label: "Loading FirstRevenue").frame(width: 160).padding(.top, 40).opacity(appeared ? 1 : 0)
            }
        }
        .onAppear {
            withAnimation(.spring(response: 0.7, dampingFraction: 0.7)) { appeared = true }
            withAnimation(.linear(duration: 9).repeatForever(autoreverses: false)) { spin = true }
        }
        .task {
            for step in 1...12 {
                try? await Task.sleep(for: .milliseconds(180))
                progress = 1 - pow(1 - Double(step) / 12, 3)
            }
            try? await Task.sleep(for: .milliseconds(250))
            onFinish()
        }
    }
}

struct LogoMark: View {
    var size: CGFloat = 40
    var body: some View {
        RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
            .fill(Theme.brandGradient)
            .frame(width: size, height: size)
            .overlay {
                GeometryReader { g in
                    let s = g.size.width / 64
                    ZStack {
                        Path { p in
                            p.move(to: CGPoint(x: 16 * s, y: 46 * s)); p.addLine(to: CGPoint(x: 27 * s, y: 33 * s))
                            p.addLine(to: CGPoint(x: 35 * s, y: 39 * s)); p.addLine(to: CGPoint(x: 48 * s, y: 20 * s))
                        }
                        .stroke(.white, style: StrokeStyle(lineWidth: 6.5 * s, lineCap: .round, lineJoin: .round))
                        Circle().fill(.white).frame(width: 9 * s).position(x: 48 * s, y: 20 * s)
                    }
                }
            }
            .shadow(color: Theme.brand600.opacity(0.35), radius: 8, y: 4)
            .accessibilityHidden(true)
    }
}

// MARK: - Signed-out flow

enum AuthRoute: Hashable { case login, signup, forgot }

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

struct WelcomeView: View {
    @Binding var path: [AuthRoute]
    private let points = [("calendar.badge.checkmark", "One clear mission every day"), ("sparkles", "An AI coach for every question"), ("text.bubble", "Outreach written with you")]

    var body: some View {
        AuthScaffold {
            HStack(spacing: 10) {
                LogoMark(size: 36)
                (Text("First").foregroundStyle(Theme.ink) + Text("Revenue").foregroundStyle(Theme.textGradient)).font(.title3.weight(.heavy))
            }
            .padding(.top, Space.s)
            VStack(spacing: 0) {
                MascotView(mood: .wink, size: 150, say: "Tap me. I don't bite.", tapLines: ["30 days. One mission a day.", "Less theory. More action.", "Ready when you are!"])
                    .padding(.top, 64)
                (Text("Earn your first ").foregroundStyle(Theme.ink) + Text("money online.").foregroundStyle(Theme.textGradient))
                    .font(.system(size: 38, weight: .heavy)).multilineTextAlignment(.center).padding(.top, Space.xl)
                Text("No experience required. Pick a path. Follow the plan. Take action every day.")
                    .font(.body).foregroundStyle(Theme.muted).multilineTextAlignment(.center).padding(.top, Space.m)
                VStack(spacing: 10) {
                    ForEach(Array(points.enumerated()), id: \.offset) { i, p in
                        HStack(spacing: 12) {
                            Image(systemName: p.0).foregroundStyle(Theme.brand300).frame(width: 22)
                            Text(p.1).font(.subheadline.weight(.medium)).foregroundStyle(Theme.inkSoft)
                            Spacer()
                        }
                        .padding(.horizontal, 16).frame(height: 48)
                        .background(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).fill(Theme.surface.opacity(0.7)))
                        .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(Theme.line))
                        .fadeUp(i + 2)
                    }
                }
                .padding(.top, Space.xl)
            }
            .frame(maxWidth: .infinity)
        } footer: {
            Button { path.append(.signup) } label: { Label("Get Started", systemImage: "arrow.right").labelStyle(TrailingIconLabel()) }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
            Button("I Already Have an Account") { path.append(.login) }
                .buttonStyle(.fr(.ghost, size: .lg, full: true))
        }
        .toolbar(.hidden, for: .navigationBar)
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
    @State private var email = MockData.shared.user.email
    @State private var password = "demo-password"
    @State private var errors: [String: String] = [:]
    @State private var loading = false

    var body: some View {
        AuthScaffold {
            Text("Welcome back").font(.system(size: 32, weight: .heavy)).foregroundStyle(Theme.ink).padding(.top, Space.l)
            Text("Pick up where you left off. Your streak is waiting.").font(.callout).foregroundStyle(Theme.muted).padding(.top, 6)
            VStack(spacing: Space.l) {
                FRTextField(label: "Email", text: $email, systemImage: "envelope", error: errors["email"], keyboard: .emailAddress, contentType: .emailAddress)
                FRTextField(label: "Password", text: $password, systemImage: "lock", secure: true, error: errors["password"], contentType: .password)
                HStack { Spacer(); Button("Forgot Password?") { path.append(.forgot) }.font(.subheadline.weight(.semibold)).foregroundStyle(Theme.brand300).frame(minHeight: 44) }
                Button(action: submit) { LoadingLabel(title: "Log In", loading: loading) }
                    .buttonStyle(.fr(.primary, size: .lg, full: true)).disabled(loading)
            }
            .padding(.top, Space.xxl)
            SocialButtons(disabled: loading, onContinue: signIn).padding(.top, Space.xl)
            Text("Demo account is pre-filled. Logging in loads **Alex Carter** on Day 7.")
                .font(.footnote).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
                .frame(maxWidth: .infinity).card(padding: Space.m).padding(.top, Space.l)
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
        if password.count < 6 { e["password"] = "Password must be at least 6 characters." }
        withAnimation { errors = e }
        if e.isEmpty { signIn() } else { Haptics.notify(.error) }
    }

    private func signIn() {
        loading = true
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(900))
            store.login()
            store.showToast("Welcome back, \(store.s.user.firstName)")
        }
    }
}

private struct SocialButtons: View {
    var disabled = false
    let onContinue: () -> Void
    var body: some View {
        VStack(spacing: Space.m) {
            HStack(spacing: 12) {
                Rectangle().fill(Theme.line).frame(height: 1)
                Text("or").font(.caption.weight(.medium)).foregroundStyle(Theme.faint)
                Rectangle().fill(Theme.line).frame(height: 1)
            }
            Button(action: onContinue) { Label { Text("Continue with Google") } icon: { Text("G").font(.headline.weight(.bold)) } }
                .buttonStyle(.fr(.secondary, size: .lg, full: true)).disabled(disabled)
            Button(action: onContinue) { Label("Continue with Apple", systemImage: "apple.logo") }
                .buttonStyle(.fr(.secondary, size: .lg, full: true)).disabled(disabled)
        }
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
    @State private var loading = false
    @State private var legal = false

    var body: some View {
        AuthScaffold {
            Text("Create your account").font(.system(size: 32, weight: .heavy)).foregroundStyle(Theme.ink).padding(.top, Space.l)
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
                Button(action: submit) { LoadingLabel(title: "Create Account", loading: loading) }
                    .buttonStyle(.fr(.primary, size: .lg, full: true)).disabled(loading)
            }
            .padding(.top, Space.xxl)
            SocialButtons(disabled: loading) { create(name: "", email: "you@social-login.demo") }.padding(.top, Space.xl)
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
                Text("FirstRevenue is a prototype. Every name, business, message and dollar amount you see is fictitious.")
                Text("Nothing you enter leaves this device: your progress is stored locally and can be reset at any time from Settings.")
                Text("No payment is ever taken, and income examples are illustrations — not guarantees of earnings.")
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
        withAnimation { errors = e }
        if e.isEmpty { create(name: name.trimmingCharacters(in: .whitespaces), email: email) } else { Haptics.notify(.error) }
    }

    private func create(name: String, email: String) {
        loading = true
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(900))
            store.signup(name: name, email: email)
        }
    }
}

struct ForgotPasswordView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AppStore.self) private var store
    @State private var email = ""
    @State private var error: String?
    @State private var loading = false
    @State private var sent = false

    var body: some View {
        AuthScaffold {
            if sent {
                VStack(spacing: Space.m) {
                    MascotView(mood: .wink, size: 140).padding(.top, 60)
                    Image(systemName: "envelope.badge.fill").font(.title2).foregroundStyle(Theme.success).frame(width: 52, height: 52).background(Circle().fill(Theme.success.opacity(0.15)))
                    Text("Check your inbox").font(.system(size: 28, weight: .heavy)).foregroundStyle(Theme.ink)
                    (Text("We sent a reset link to ") + Text(email).fontWeight(.semibold).foregroundStyle(Theme.ink) + Text(". It expires in 30 minutes."))
                        .font(.callout).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
                    Button("Didn't get it? Resend") { store.showToast("Reset link sent again", .info) }
                        .font(.subheadline.weight(.semibold)).foregroundStyle(Theme.brand300).frame(minHeight: 44)
                }
                .frame(maxWidth: .infinity)
                .transition(.scale(scale: 0.95).combined(with: .opacity))
            } else {
                Text("Reset your password").font(.system(size: 32, weight: .heavy)).foregroundStyle(Theme.ink).padding(.top, Space.l)
                Text("Enter your email and we'll send you a link to get back in.").font(.callout).foregroundStyle(Theme.muted).padding(.top, 6)
                VStack(spacing: Space.l) {
                    FRTextField(label: "Email", text: $email, placeholder: "you@example.com", systemImage: "envelope", error: error, keyboard: .emailAddress, contentType: .emailAddress)
                    Button(action: submit) { LoadingLabel(title: "Send Reset Link", loading: loading) }
                        .buttonStyle(.fr(.primary, size: .lg, full: true)).disabled(loading)
                }
                .padding(.top, Space.xxl)
            }
        } footer: {
            if sent { Button("Back to Log In") { dismiss() }.buttonStyle(.fr(.primary, size: .lg, full: true)) }
        }
    }

    private func submit() {
        guard isEmail(email) else { withAnimation { error = "Enter the email you signed up with." }; Haptics.notify(.error); return }
        error = nil
        loading = true
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(1))
            loading = false
            withAnimation(.snappy) { sent = true }
            Haptics.notify(.success)
        }
    }
}
