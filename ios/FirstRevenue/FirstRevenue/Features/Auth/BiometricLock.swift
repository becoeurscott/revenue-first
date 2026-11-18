import SwiftUI
import LocalAuthentication

/// Face ID / Touch ID unlock. The session stays in the Keychain as before; when this is on, the app
/// is covered by a lock screen at launch and after 5 minutes in the background until biometrics pass.
@MainActor @Observable
final class BiometricLock {
    static let shared = BiometricLock()

    private let key = "biometric.enabled"
    private let askedKey = "biometric.offered"
    private static let relockAfter: TimeInterval = 5 * 60

    var enabled: Bool { didSet { UserDefaults.standard.set(enabled, forKey: key) } }
    /// True while the lock screen should cover the app.
    var locked: Bool
    /// Set right after an account is created; RootView shows the "Use Face ID?" prompt.
    var offerPending = false
    private var backgroundedAt: Date?

    private init() {
        let on = UserDefaults.standard.bool(forKey: key)
        enabled = on
        locked = on
    }

    enum Kind { case faceID, touchID, opticID, none }

    var kind: Kind {
        let ctx = LAContext()
        guard ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil) else { return .none }
        switch ctx.biometryType {
        case .faceID: return .faceID
        case .touchID: return .touchID
        case .opticID: return .opticID
        default: return .none
        }
    }
    var available: Bool { kind != .none }
    var name: String {
        switch kind { case .touchID: "Touch ID"; case .opticID: "Optic ID"; default: "Face ID" }
    }
    var icon: String {
        switch kind { case .touchID: "touchid"; case .opticID: "opticid"; default: "faceid" }
    }

    /// Called once a new account exists. Asks only once per install, and only if the device has biometrics.
    func offerAfterSignUp() {
        guard !enabled, available, !UserDefaults.standard.bool(forKey: askedKey) else { return }
        UserDefaults.standard.set(true, forKey: askedKey)
        offerPending = true
    }

    /// Runs the system prompt. Returns true on success.
    func authenticate(reason: String) async -> Bool {
        let ctx = LAContext()
        ctx.localizedCancelTitle = "Not now"
        do {
            return try await ctx.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason)
        } catch {
            return false
        }
    }

    /// Turning it on asks for biometrics once, so the user knows it works.
    func enable() async -> Bool {
        guard await authenticate(reason: "Turn on \(name) to open Vaulten quickly and safely.") else { return false }
        enabled = true
        locked = false
        Monitoring.track("biometric_enabled", ["kind": name])
        return true
    }

    func disable() {
        enabled = false
        locked = false
        Monitoring.track("biometric_disabled")
    }

    func unlock() async {
        if await authenticate(reason: "Unlock Vaulten") {
            withAnimation(.easeOut(duration: 0.25)) { locked = false }
        }
    }

    func sceneChanged(_ phase: ScenePhase, authed: Bool) {
        guard enabled, authed else { return }
        switch phase {
        case .background: backgroundedAt = Date()
        case .active:
            if let t = backgroundedAt, Date().timeIntervalSince(t) > Self.relockAfter { locked = true }
            backgroundedAt = nil
        default: break
        }
    }

    /// Signing out removes the lock: the next person signs in with their own password.
    func reset() {
        enabled = false
        locked = false
        offerPending = false
    }
}

/// Covers the app until Face ID passes. "Use password" signs out to the normal login screen.
struct BiometricLockView: View {
    @Environment(AppStore.self) private var store
    private let lock = BiometricLock.shared

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            VStack(spacing: Space.l) {
                Spacer()
                Image(systemName: lock.icon)
                    .font(.system(size: 64, weight: .regular))
                    .foregroundStyle(Theme.brand500)
                Text("Vaulten is locked").font(.title2.weight(.bold))
                Text("Use \(lock.name) to continue.")
                    .font(.body).foregroundStyle(Theme.faint)
                Spacer()
                Button("Unlock with \(lock.name)") { Task { await lock.unlock() } }
                    .buttonStyle(.chunky())
                Button("Use password instead") {
                    lock.reset()
                    store.logout()
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.faint)
                .padding(.bottom, Space.xl)
            }
            .padding(.horizontal, Space.xl)
        }
        .task { await lock.unlock() }
    }
}

/// Shown once after the account is created, as a card over the home screen. It waits until the paywall
/// and gift popups are closed (RootView decides), so it never fights another sheet.
struct BiometricOfferView: View {
    private let lock = BiometricLock.shared
    @State private var working = false

    var body: some View {
        ZStack {
            Color.black.opacity(0.55).ignoresSafeArea()
            VStack(spacing: Space.l) {
                Image(systemName: lock.icon)
                    .font(.system(size: 52))
                    .foregroundStyle(Theme.brand500)
                Text("Sign in with \(lock.name)?").font(.title2.weight(.bold)).multilineTextAlignment(.center)
                Text("Open Vaulten with a glance instead of typing your password. You can change this anytime in Settings.")
                    .font(.body).foregroundStyle(Theme.faint).multilineTextAlignment(.center)
                Button {
                    working = true
                    Task {
                        let ok = await lock.enable()
                        working = false
                        if ok { Haptics.notify(.success) }
                        withAnimation { lock.offerPending = false }
                    }
                } label: { Text("Turn on \(lock.name)") }
                    .buttonStyle(.chunky())
                    .disabled(working)
                Button("Not now") {
                    Monitoring.track("biometric_declined")
                    withAnimation { lock.offerPending = false }
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.faint)
            }
            .padding(Space.xl)
            .background(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).fill(Theme.bgRaised))
            .padding(.horizontal, Space.xl)
            .frame(maxWidth: 460)
        }
        .transition(.opacity)
    }
}
