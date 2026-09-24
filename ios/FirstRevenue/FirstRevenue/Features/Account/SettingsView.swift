import SwiftUI

private enum SettingsSheet: String, Identifiable {
    case profile, password, reminder, language, privacy, terms, data, sessions
    var id: String { rawValue }
}

private enum SettingsDialog: String, Identifiable {
    case subState, jump, jump30, reset
    var id: String { rawValue }
}

struct SettingsView: View {
    @Environment(AppStore.self) private var store
    @State private var sheet: SettingsSheet?
    @State private var dialog: SettingsDialog?
    @State private var twoFactor = false

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
                    prototypeGroup
                }
                Text("FirstRevenue 0.9 (prototype) · All data is fictitious")
                    .font(.caption).foregroundStyle(Theme.faint)
                    .frame(maxWidth: .infinity)
            }
        }
        .sheet(item: $sheet) { sheetView($0) }
        .confirmationDialog(dialogTitle, isPresented: dialogBinding, titleVisibility: .visible, presenting: dialog) { d in
            dialogActions(d)
        } message: { d in
            Text(dialogMessage(d))
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
            FRToggleRow(icon: "bell", title: "Push notifications", detail: "Replies, payments and milestones", isOn: toggle(\.push, "Push notifications"))
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
            ShareLink(item: SettingsExport.json(store.s), subject: Text("My FirstRevenue data"), preview: SharePreview("FirstRevenue data export", image: Image(systemName: "doc.text"))) {
                ListRow(icon: "square.and.arrow.up", title: "Export my data", detail: "JSON · profile, progress, prospects, deals", showChevron: false, action: nil) { EmptyView() }
            }
            .buttonStyle(.pressable)
        }
    }

    private var securityGroup: some View {
        ListGroup(title: "Security") {
            FRToggleRow(icon: "lock.shield", title: "Two-factor authentication", detail: twoFactor ? "On · Code sent by email" : "Off", isOn: twoFactorBinding)
            ListRow(icon: "laptopcomputer.and.iphone", title: "Active sessions", detail: "Manage signed-in devices") { sheet = .sessions }
        }
    }

    private var prototypeGroup: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            HStack(spacing: Space.s) {
                Text("PROTOTYPE CONTROLS").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.faint).accessibilityAddTraits(.isHeader)
                Badge("Demo", tone: .warning)
            }
            .padding(.horizontal, 4)
            ListGroup {
                FRToggleRow(icon: "wifi.slash", title: "Simulate offline", detail: "Coach, generator and checkout will fail", isOn: offlineBinding)
                ListRow(icon: "crown", title: "Subscription state", detail: store.s.subscription.status.rawValue.capitalized) { dialog = .subState }
                ListRow(icon: "forward.end", title: "Jump to Day 30", detail: "See the finish line and completion flow") { dialog = .jump30 }
                ListRow(icon: "forward", title: "Jump to day…", detail: "Currently on Day \(store.program.currentDay)") { dialog = .jump }
                ListRow(icon: "arrow.counterclockwise", title: "Reset demo data", danger: true) { dialog = .reset }
            }
            .padding(4)
            .overlay(RoundedRectangle(cornerRadius: Radius.xl + 4, style: .continuous).strokeBorder(Theme.warning.opacity(0.3), style: StrokeStyle(lineWidth: 1, dash: [6, 5])))
        }
    }

    private var subscriptionDetail: String {
        let sub = store.s.subscription
        let planName = MockData.shared.subscription.plans.first { $0.id == sub.plan }?.name
        switch sub.status {
        case .active: return "Premium\(planName.map { " · \($0)" } ?? "")"
        case .expired: return "Expired"
        case .none: return "Free plan"
        }
    }

    // MARK: Bindings

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

    private var offlineBinding: Binding<Bool> {
        Binding(get: { store.s.settings.offline }, set: { v in
            store.s.settings.offline = v
            if v { store.showToast("Offline mode on — network actions will fail", .warning) } else { store.showToast("Back online") }
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

    // MARK: Dialogs

    private var dialogBinding: Binding<Bool> {
        Binding(get: { dialog != nil }, set: { if !$0 { dialog = nil } })
    }

    private var dialogTitle: String {
        switch dialog {
        case .subState: "Subscription state"
        case .jump: "Jump to day…"
        case .jump30: "Jump to Day 30?"
        case .reset: "Reset demo data?"
        case nil: ""
        }
    }

    private func dialogMessage(_ d: SettingsDialog) -> String {
        switch d {
        case .subState: "Switch states to preview the paywall, manage and expired screens."
        case .jump: "Earlier days are marked complete so the plan looks realistic."
        case .jump30: "Days 1–29 will be marked complete on your current path. You can undo this with Reset demo data."
        case .reset: "This replaces everything with the original demo account (Alex Carter, Day 7). Anything you added will be lost."
        }
    }

    @ViewBuilder private func dialogActions(_ d: SettingsDialog) -> some View {
        switch d {
        case .subState:
            Button("Active — Premium unlocked") { setSub(.active) }
            Button("Expired — renewal prompts") { setSub(.expired) }
            Button("None — free account") { setSub(.none) }
            Button("Cancel", role: .cancel) {}
        case .jump:
            ForEach([1, 7, 14, 21, 29], id: \.self) { n in
                Button("Day \(n)") { jump(n) }
            }
            Button("Cancel", role: .cancel) {}
        case .jump30:
            Button("Jump to Day 30") { jump(MockData.totalDays) }
            Button("Cancel", role: .cancel) {}
        case .reset:
            Button("Reset everything", role: .destructive) {
                store.resetDemo()
                store.showToast("Demo data reset — welcome back, Alex")
            }
            Button("Cancel", role: .cancel) {}
        }
    }

    private func setSub(_ status: SubscriptionStatus) {
        if status == .active && store.s.subscription.renews == nil {
            store.subscribe(store.s.subscription.plan ?? "yearly")
        } else {
            store.setSubscription(status)
        }
        store.showToast("Subscription state: \(status.rawValue)")
    }

    private func jump(_ day: Int) {
        store.jumpToDay(day)
        store.showToast("Jumped to Day \(day)")
        store.popToRoot()
        store.tab = .home
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
        AccountSheetScaffold(title: "Your data", description: "What FirstRevenue stores, and where.", detents: [.medium, .large]) {
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
            ShareLink(item: SettingsExport.json(store.s), subject: Text("My FirstRevenue data"), preview: SharePreview("FirstRevenue data export", image: Image(systemName: "doc.text"))) {
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
        SettingsDevice(id: "s-1", name: "This iPhone", detail: "FirstRevenue app · Active now", icon: "iphone", current: true),
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
