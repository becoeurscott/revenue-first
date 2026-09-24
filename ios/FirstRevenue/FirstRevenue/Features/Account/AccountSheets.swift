import SwiftUI

// Shared sheets for the Account feature (Profile, Settings, Subscription, Help).

/// Native sheet chrome: inline title, close button, scrolling body and an optional pinned footer.
struct AccountSheetScaffold<Content: View, Footer: View>: View {
    let title: String
    var description: String? = nil
    var detents: Set<PresentationDetent> = [.medium, .large]
    @ViewBuilder var content: Content
    @ViewBuilder var footer: Footer
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Space.l) {
                    if let description {
                        Text(description).font(.subheadline).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
                    }
                    content
                }
                .padding(.horizontal, Space.xl)
                .padding(.top, Space.s)
                .padding(.bottom, Space.xl)
                .frame(maxWidth: 620)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
            .safeAreaInset(edge: .bottom) { footerArea }
            .background(Theme.bgSunken.ignoresSafeArea())
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark").font(.subheadline.weight(.bold)).foregroundStyle(Theme.muted)
                            .frame(width: 30, height: 30).background(Circle().fill(Theme.surface3))
                    }
                    .frame(minWidth: 44, minHeight: 44)
                    .accessibilityLabel("Close")
                }
            }
        }
        .presentationDetents(detents)
        .presentationDragIndicator(.visible)
        .presentationBackground(Theme.bgSunken)
        .presentationCornerRadius(Radius.xxl)
    }

    @ViewBuilder private var footerArea: some View {
        if Footer.self != EmptyView.self {
            VStack(spacing: Space.s) { footer }
                .frame(maxWidth: 620)
                .padding(.horizontal, Space.xl)
                .padding(.top, Space.m)
                .padding(.bottom, Space.s)
                .frame(maxWidth: .infinity)
                .background(Theme.bgSunken)
        }
    }
}

extension AccountSheetScaffold where Footer == EmptyView {
    init(title: String, description: String? = nil, detents: Set<PresentationDetent> = [.medium, .large], @ViewBuilder content: () -> Content) {
        self.init(title: title, description: description, detents: detents, content: content, footer: { EmptyView() })
    }
}

// MARK: Edit profile

enum AccountProfileOptions {
    static var goals: [String] {
        MockData.shared.onboarding.steps.first { $0.key == "goal" }?.options?.map(\.value) ?? ["$50", "$100", "$250", "$500", "$1,000+"]
    }
    static var skills: [OnboardingOption] {
        (MockData.shared.onboarding.steps.first { $0.key == "skills" }?.options ?? []).filter { $0.value != "None yet" }
    }
    static func isEmail(_ s: String) -> Bool { s.range(of: #"^[^\s@]+@[^\s@]+\.[^\s@]+$"#, options: .regularExpression) != nil }
}

/// Edit name, email and income goal. Used by Profile and Settings.
struct AccountEditProfileSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var goal = ""
    @State private var errors: [String: String] = [:]

    var body: some View {
        AccountSheetScaffold(title: "Edit profile", description: "This is how you appear across FirstRevenue.", detents: [.large]) {
            VStack(spacing: Space.l) {
                FRTextField(label: "Name", text: $name, placeholder: "Your name", systemImage: "person", error: errors["name"], contentType: .name)
                FRTextField(label: "Email", text: $email, placeholder: "you@example.com", systemImage: "envelope", error: errors["email"], keyboard: .emailAddress, contentType: .emailAddress)
                SelectRow(label: "First income goal (30 days)", selection: $goal, options: AccountProfileOptions.goals)
            }
            .animation(.snappy, value: errors)
        } footer: {
            Button(action: save) { Text("Save changes") }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
        }
        .onAppear(perform: load)
    }

    private func load() {
        let u = store.s.user
        name = u.name
        email = u.email
        let options = AccountProfileOptions.goals
        goal = options.contains(u.goal) ? u.goal : (options.first { Int($0.filter(\.isNumber)) == u.goalAmount } ?? options[safe: 3] ?? "")
    }

    private func save() {
        var next: [String: String] = [:]
        if name.trimmingCharacters(in: .whitespaces).count < 2 { next["name"] = "Enter your name." }
        if !AccountProfileOptions.isEmail(email.trimmingCharacters(in: .whitespaces)) { next["email"] = "Enter a valid email address." }
        errors = next
        guard next.isEmpty else { Haptics.notify(.error); return }
        store.s.user.name = name.trimmingCharacters(in: .whitespaces)
        store.s.user.email = email.trimmingCharacters(in: .whitespaces)
        store.s.user.goal = goal
        store.s.user.goalAmount = Int(goal.filter(\.isNumber)) ?? store.s.user.goalAmount
        store.s.answers.goal = goal
        store.showToast("Profile updated")
        dismiss()
    }
}

// MARK: Legal

enum AccountLegalDoc: String, Identifiable {
    case privacy, terms
    var id: String { rawValue }

    var title: String { self == .privacy ? "Privacy policy" : "Terms of service" }
    var summary: String { self == .privacy ? "The short version: your data never leaves this device." : "Plain-language terms for the FirstRevenue prototype." }
    var sections: [(String, String)] {
        switch self {
        case .privacy:
            [("What we collect", "Only what you type into the app: your name, email, onboarding answers, prospects, deals and messages. In this prototype none of it is sent to a server."),
             ("Where it lives", "Everything is stored in a single file on this device. Deleting the app, or using \"Reset demo data\" in Settings, removes it completely."),
             ("Who we share it with", "Nobody. There are no analytics, no ad trackers and no third-party SDKs in this build."),
             ("Your choices", "You can export a copy of your data as JSON or wipe it at any time from Settings → Privacy → Your data.")]
        case .terms:
            [("A prototype, not a product", "FirstRevenue is a demonstration. Every person, business, message and payment you see is fictitious. Checkout is simulated and no payment is ever taken."),
             ("No income guarantee", "The program teaches a process for finding your first clients. Results depend on your effort, your market and your follow-through. We do not promise earnings."),
             ("Use it responsibly", "When you contact real people, be honest about who you are, respect opt-outs and follow the rules of the platform you are using. No spam."),
             ("Subscriptions", "In a live version Premium would renew automatically until cancelled, and you would keep access until the end of the paid period. In this prototype plans only change local state.")]
        }
    }
}

struct AccountLegalSheet: View {
    let doc: AccountLegalDoc
    var body: some View {
        AccountSheetScaffold(title: doc.title, description: doc.summary, detents: [.medium, .large]) {
            VStack(alignment: .leading, spacing: Space.l) {
                ForEach(doc.sections.indices, id: \.self) { i in
                    let s = doc.sections[i]
                    VStack(alignment: .leading, spacing: 4) {
                        Text(s.0).font(.bodyStrong).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                        Text(s.1).font(.subheadline).foregroundStyle(Theme.muted).lineSpacing(2).fixedSize(horizontal: false, vertical: true)
                    }
                }
                Text("Last updated for prototype build 0.9.").font(.caption).foregroundStyle(Theme.faint)
            }
        }
    }
}

// MARK: Single-choice option sheet

struct AccountOption: Hashable {
    let value: String
    var label: String? = nil
    var hint: String? = nil
}

struct AccountOptionSheet: View {
    let title: String
    var description: String? = nil
    let options: [AccountOption]
    let selected: String?
    let onSelect: (String) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        AccountSheetScaffold(title: title, description: description, detents: [.medium, .large]) {
            VStack(spacing: Space.s) {
                ForEach(options, id: \.value) { o in row(o) }
            }
        }
    }

    private func row(_ o: AccountOption) -> some View {
        let on = o.value == selected
        return Button {
            Haptics.select()
            onSelect(o.value)
            dismiss()
        } label: {
            HStack(spacing: Space.m) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(o.label ?? o.value).font(.body.weight(.medium)).foregroundStyle(Theme.ink)
                    if let hint = o.hint { Text(hint).font(.footnote).foregroundStyle(Theme.faint) }
                }
                Spacer()
                Image(systemName: on ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(on ? Theme.brand400 : Theme.lineStrong)
            }
            .padding(.horizontal, Space.l)
            .padding(.vertical, 10)
            .frame(minHeight: 56)
            .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(on ? Theme.brand500.opacity(0.12) : Theme.surface))
            .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).strokeBorder(on ? Theme.brand500.opacity(0.5) : Theme.line))
            .contentShape(Rectangle())
        }
        .buttonStyle(.pressable)
        .accessibilityAddTraits(on ? .isSelected : [])
    }
}

// MARK: Small shared bits

/// Emoji fact tile used in goal / data summaries.
struct AccountFactTile: View {
    let label: String
    let value: String
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label).font(.caption).foregroundStyle(Theme.faint)
            Text(value.isEmpty ? "Not set" : value).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.surface))
        .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).strokeBorder(Theme.line))
        .accessibilityElement(children: .combine)
    }
}
