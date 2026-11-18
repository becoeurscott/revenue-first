import SwiftUI

private enum SettingsSheet: String, Identifiable {
    case profile, password, reminder, language, privacy, terms, data, sessions
    var id: String { rawValue }
}

struct SettingsView: View {
    @Environment(AppStore.self) private var store
    @State private var sheet: SettingsSheet?
    @State private var twoFactor = false
    @State private var askExportPassword = false
    @State private var exportPassword = ""
    @State private var exportFile: ExportFile?
    @State private var exporting = false
    @State private var askDelete = false
    @State private var deletePassword = ""
    @State private var deleting = false

    private static let reminderTimes = ["7:00 AM", "8:00 AM", "9:00 AM", "12:00 PM", "6:00 PM", "8:00 PM", "9:00 PM"]
    private static let languages = ["English", "Español", "Français", "Deutsch", "Português"]

    var body: some View {
        Screen(title: "Settings") {
            VStack(spacing: Space.xl) {
                Adaptive2Col {
                    accountGroup
                    notificationsGroup
                    appearanceGroup
                    privacyGroup
                } trailing: {
                    securityGroup
                    ListGroup(title: "Subscription") {
                        ListRow(icon: "crown", title: "Manage subscription", detail: subscriptionDetail) { store.push(.subscription) }
                    }
                    ListGroup(title: "Help") {
                        ListRow(icon: "lifepreserver", title: "Help & support", detail: "FAQ, contact and problem reports") { store.push(.help) }
                    }
                }
                VStack(spacing: Space.s) {
                    LogoMark(size: 36)
                    Text("Vaulten \(VaultenConfig.appVersion)").font(.caption).foregroundStyle(Theme.faint)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .sheet(item: $sheet) { sheetView($0) }
        .alert("Download account data", isPresented: $askExportPassword) {
            SecureField("Password", text: $exportPassword)
            Button("Cancel", role: .cancel) { exportPassword = "" }
            Button("Download") { Task { await runExport() } }
        } message: {
            Text("Enter your password to download everything stored on your Vaulten account.")
        }
        .alert("Delete your account?", isPresented: $askDelete) {
            SecureField("Password", text: $deletePassword)
            Button("Cancel", role: .cancel) { deletePassword = "" }
            Button("Delete account", role: .destructive) { Task { await runDelete() } }
        } message: {
            Text("This permanently deletes your Vaulten account, plan and progress. It can't be undone. An App Store subscription isn't cancelled automatically; manage it in your Apple ID settings. Enter your password to confirm.")
        }
        .sheet(item: $exportFile) { file in
            VStack(spacing: Space.l) {
                Image(systemName: "doc.text").font(.system(size: 40)).foregroundStyle(Theme.ink)
                Text("Your account data is ready").font(.section)
                ShareLink(item: file.url) { Label("Save or share", systemImage: "square.and.arrow.up") }
                    .buttonStyle(.fr(.primary, size: .lg, full: true))
            }
            .padding(Space.xl)
            .presentationDetents([.medium])
        }
    }

    // MARK: Groups

    private var accountGroup: some View {
        let user = store.s.user
        return ListGroup(title: "Account") {
            ListRow(icon: "person", title: "Name", detail: user.name.isEmpty ? "Add your name" : user.name) { sheet = .profile }
            ListRow(icon: "at", title: "Email", detail: user.email.isEmpty ? "Add your email" : user.email) { sheet = .profile }
            ListRow(icon: "key", title: "Change password") { sheet = .password }
        }
    }

    private var notificationsGroup: some View {
        let settings = store.s.settings
        return ListGroup(title: "Notifications") {
            FRToggleRow(icon: "bell", title: "Push notifications", detail: "Replies, payments and milestones", isOn: pushBinding)
            FRToggleRow(icon: "calendar.badge.clock", title: "Daily reminders", detail: "A nudge to do today's mission", isOn: toggle(\.dailyReminders, "Daily reminders"))
            FRToggleRow(icon: "calendar.badge.checkmark", title: "Weekly check-ins", detail: "A 3-minute review every 7 days", isOn: toggle(\.weeklyCheckins, "Weekly check-ins"))
            FRToggleRow(icon: "bubble.left.and.bubble.right", title: "Coach messages", detail: "Tips and answers from your coach", isOn: toggle(\.coachMessages, "Coach messages"))
            ListRow(icon: "clock", title: "Reminder time", detail: settings.dailyReminders ? settings.reminderTime : "Daily reminders are off") { sheet = .reminder }
        }
    }

    private var appearanceGroup: some View {
        let dark = store.s.settings.darkMode
        return ListGroup(title: "Appearance") {
            FRToggleRow(icon: dark ? "moon.fill" : "sun.max.fill", title: "Dark mode", detail: dark ? "On" : "Off — using the light theme", isOn: darkModeBinding)
            ListRow(icon: "globe", title: "Language", detail: store.s.settings.language) { sheet = .language }
        }
    }

    private var privacyGroup: some View {
        ListGroup(title: "Privacy") {
            ListRow(icon: "hand.raised", title: "Privacy policy") { sheet = .privacy }
            ListRow(icon: "doc.text", title: "Terms of service") { sheet = .terms }
            ListRow(icon: "externaldrive", title: "Your data", detail: "Stored on this device · Export anytime") { sheet = .data }
            ShareLink(item: SettingsExport.json(store.s), subject: Text("My Vaulten data"), preview: SharePreview("Vaulten data export", image: Image(systemName: "doc.text"))) {
                ListRow(icon: "square.and.arrow.up", title: "Export my data", detail: "JSON · profile, progress, prospects, deals", showChevron: false, action: nil) { EmptyView() }
            }
            .buttonStyle(.pressable)
            if store.s.authed {
                ListRow(icon: "icloud.and.arrow.down", title: "Download account data", detail: exporting ? "Preparing…" : "Everything on your Vaulten account") { askExportPassword = true }
            }
        }
    }

    private func runExport() async {
        let password = exportPassword
        exportPassword = ""
        guard !password.isEmpty else { return }
        exporting = true
        defer { exporting = false }
        do { exportFile = ExportFile(url: try await BackendSync.exportAccount(password: password)) }
        catch BackendSync.ExportFailure.wrongPassword { store.showToast("Wrong password", .error) }
        catch BackendSync.ExportFailure.tooMany { store.showToast("Too many exports. Try again in an hour.", .error) }
        catch { store.showToast("Couldn't download your data. Try again later.", .error) }
    }

    private func runDelete() async {
        let password = deletePassword
        deletePassword = ""
        guard !password.isEmpty else { return }
        deleting = true
        defer { deleting = false }
        do {
            try await AuthAPI.deleteAccount(password: password)
            Monitoring.track("account_deleted")
            store.logout()
            store.showToast("Your account was deleted")
        }
        catch AuthAPI.DeleteFailure.wrongPassword { store.showToast("Wrong password", .error) }
        catch AuthAPI.DeleteFailure.tooMany { store.showToast("Too many attempts. Try again later.", .error) }
        catch { store.showToast("Couldn't delete your account. Try again or contact support.", .error) }
    }

    private var securityGroup: some View {
        ListGroup(title: "Security") {
            if BiometricLock.shared.available {
                FRToggleRow(icon: BiometricLock.shared.icon, title: "Sign in with \(BiometricLock.shared.name)",
                            detail: BiometricLock.shared.enabled ? "On · Asked when you open the app" : "Off", isOn: biometricBinding)
            }
            FRToggleRow(icon: "lock.shield", title: "Two-factor authentication", detail: twoFactor ? "On · Code sent by email" : "Off", isOn: twoFactorBinding)
            ListRow(icon: "laptopcomputer.and.iphone", title: "Active sessions", detail: "Manage signed-in devices") { sheet = .sessions }
            if store.s.authed {
                ListRow(icon: "trash", title: "Delete account", detail: deleting ? "Deleting…" : "Permanently remove your account and data") { askDelete = true }
            }
        }
    }

    private var subscriptionDetail: String { RevenueCatService.shared.planLabel }

    // MARK: Bindings

    private var biometricBinding: Binding<Bool> {
        Binding(get: { BiometricLock.shared.enabled }, set: { on in
            if on { Task { if !(await BiometricLock.shared.enable()) { store.showToast("\(BiometricLock.shared.name) wasn't turned on") } } }
            else { BiometricLock.shared.disable() }
        })
    }

    private var pushBinding: Binding<Bool> {
        Binding(
            get: { store.s.settings.push },
            set: { v in
                store.s.settings.push = v
                Push.setOptedIn(v)
                store.showToast("Push notifications \(v ? "on" : "off")", v ? .success : .info)
            }
        )
    }

    private func toggle(_ key: WritableKeyPath<AppSettings, Bool>, _ title: String) -> Binding<Bool> {
        Binding(
            get: { store.s.settings[keyPath: key] },
            set: { v in
                store.s.settings[keyPath: key] = v
                store.showToast("\(title) \(v ? "on" : "off")", v ? .success : .info)
            }
        )
    }

    private var darkModeBinding: Binding<Bool> {
        Binding(get: { store.s.settings.darkMode }, set: { v in
            withAnimation(.easeInOut(duration: 0.3)) { store.s.settings.darkMode = v }
            store.showToast(v ? "Dark mode on" : "Light mode on")
        })
    }

    private var twoFactorBinding: Binding<Bool> {
        Binding(get: { twoFactor }, set: { v in
            twoFactor = v
            store.showToast(v ? "Two-factor authentication on (demo)" : "Two-factor authentication off (demo)", v ? .success : .info)
        })
    }

    // MARK: Sheets

    @ViewBuilder private func sheetView(_ s: SettingsSheet) -> some View {
        switch s {
        case .profile: AccountEditProfileSheet()
        case .password: SettingsPasswordSheet()
        case .reminder:
            AccountOptionSheet(title: "Reminder time", description: "When should we nudge you to do today's mission?", options: Self.reminderTimes.map { AccountOption(value: $0) }, selected: store.s.settings.reminderTime) { v in
                store.s.settings.reminderTime = v
                store.s.settings.dailyReminders = true
                store.showToast("Daily reminder set for \(v)")
            }
        case .language:
            AccountOptionSheet(title: "Language", description: "Lessons and missions are in English in this prototype.", options: Self.languages.map { AccountOption(value: $0) }, selected: store.s.settings.language) { v in
                store.s.settings.language = v
                store.showToast("Language set to \(v)")
            }
        case .privacy: AccountLegalSheet(doc: .privacy)
        case .terms: AccountLegalSheet(doc: .terms)
        case .data: SettingsDataSheet()
        case .sessions: SettingsSessionsSheet()
        }
    }
}

// MARK: Export

private enum SettingsExport {
    @MainActor static func json(_ snapshot: Snapshot) -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        guard let data = try? encoder.encode(snapshot), let text = String(data: data, encoding: .utf8) else { return "{}" }
        return text
    }
}

// MARK: Password

private struct SettingsPasswordSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var next = ""
    @State private var confirm = ""
    @State private var errors: [String: String] = [:]
    @State private var saving = false

    var body: some View {
        AccountSheetScaffold(title: "Change password", description: "Demo only — nothing you type here is stored.", detents: [.large]) {
            VStack(spacing: Space.l) {
                FRTextField(label: "New password", text: $next, placeholder: "At least 8 characters", systemImage: "lock", secure: true, error: errors["next"], contentType: .newPassword)
                FRTextField(label: "Confirm new password", text: $confirm, placeholder: "Repeat it", systemImage: "lock.rotation", secure: true, error: errors["confirm"], contentType: .newPassword)
            }
            .animation(.snappy, value: errors)
        } footer: {
            Button(action: save) { LoadingLabel(title: "Update password", loading: saving) }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
                .disabled(saving)
        }
    }

    private func save() {
        var e: [String: String] = [:]
        if next.count < 8 { e["next"] = "Use at least 8 characters." }
        if confirm != next { e["confirm"] = "Passwords do not match." }
        errors = e
        guard e.isEmpty else { Haptics.notify(.error); return }
        saving = true
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(700))
            store.showToast("Password updated (demo)")
            dismiss()
        }
    }
}

// MARK: Your data

private struct SettingsDataSheet: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        AccountSheetScaffold(title: "Your data", description: "What Vaulten stores, and where.", detents: [.medium, .large]) {
            VStack(alignment: .leading, spacing: Space.m) {
                Text("Everything in this prototype is **fictitious**. The prospects, clients, messages and payments are made-up examples.")
                Text("Anything you add is stored **locally on this device**. Nothing is sent to a server, and nobody else can see it.")
            }
            .font(.subheadline).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
            HStack(spacing: Space.s) {
                stat(store.s.prospects.count, "Prospects")
                stat(store.s.deals.count, "Deals")
                stat(store.s.conversations.count, "Coach chats")
            }
            Text("The export is a JSON file with your profile, progress, prospects, deals and settings.")
                .font(.footnote).foregroundStyle(Theme.faint)
        } footer: {
            ShareLink(item: SettingsExport.json(store.s), subject: Text("My Vaulten data"), preview: SharePreview("Vaulten data export", image: Image(systemName: "doc.text"))) {
                Label("Export my data", systemImage: "square.and.arrow.up")
            }
            .buttonStyle(.fr(.primary, size: .lg, full: true))
        }
    }

    private func stat(_ n: Int, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text("\(n)").font(.number(22)).foregroundStyle(Theme.ink)
            Text(label).font(.caption).foregroundStyle(Theme.faint).lineLimit(1).minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Space.m)
        .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.surface))
        .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).strokeBorder(Theme.line))
        .accessibilityElement(children: .combine)
    }
}

// MARK: Sessions

private struct SettingsDevice: Identifiable, Hashable {
    let id: String
    let name: String
    let detail: String
    let icon: String
    let current: Bool
}

private struct SettingsSessionsSheet: View {
    @Environment(AppStore.self) private var store
    @State private var sessions: [SettingsDevice] = [
        SettingsDevice(id: "s-1", name: "This iPhone", detail: "Vaulten app · Active now", icon: "iphone", current: true),
        SettingsDevice(id: "s-2", name: "MacBook Air", detail: "Austin, TX · 2 hours ago", icon: "laptopcomputer", current: false),
        SettingsDevice(id: "s-3", name: "iPad Air", detail: "Austin, TX · 5 days ago", icon: "ipad", current: false),
    ]

    var body: some View {
        AccountSheetScaffold(title: "Active sessions", description: "Devices currently signed in to your account. All fictitious.", detents: [.medium, .large]) {
            ListGroup {
                ForEach(sessions) { s in row(s) }
            }
        } footer: {
            Button("Sign out of all other devices", role: .destructive) {
                withAnimation(.snappy) { sessions.removeAll { !$0.current } }
                store.showToast("Signed out of all other devices (demo)")
            }
            .buttonStyle(.fr(.danger, full: true))
            .disabled(!sessions.contains { !$0.current })
        }
    }

    private func row(_ s: SettingsDevice) -> some View {
        ListRow(icon: s.icon, title: s.name, detail: s.detail, showChevron: false, action: nil) {
            if s.current {
                Badge("Current", tone: .success)
            } else {
                Button("Sign out") {
                    withAnimation(.snappy) { sessions.removeAll { $0.id == s.id } }
                    store.showToast("Signed out of \(s.name) (demo)", .info)
                }
                .buttonStyle(.fr(.ghost, size: .sm))
                .frame(minHeight: 44)
            }
        }
    }
}

struct ExportFile: Identifiable { let url: URL; var id: String { url.path } }
