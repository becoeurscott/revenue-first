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
    static var skills: [OnboardingOption] {
        (MockData.shared.onboarding.steps.first { $0.key == "skills" }?.options ?? []).filter { $0.value != "None yet" }
    }
    static func isEmail(_ s: String) -> Bool { s.range(of: #"^[^\s@]+@[^\s@]+\.[^\s@]+$"#, options: .regularExpression) != nil }
}

/// Edit name, email, niche and the active journey's goal. Used by Profile and Settings.
struct AccountEditProfileSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var niche = ""
    @State private var goal = ""
    @State private var errors: [String: String] = [:]

    var body: some View {
        AccountSheetScaffold(title: "Edit profile", description: "This is how you appear across Vaulten.", detents: [.large]) {
            VStack(spacing: Space.l) {
                FRTextField(label: "Name", text: $name, placeholder: "Your name", systemImage: "person", error: errors["name"], contentType: .name)
                FRTextField(label: "Email", text: $email, placeholder: "you@example.com", systemImage: "envelope", error: errors["email"], keyboard: .emailAddress, contentType: .emailAddress)
                if store.enrollment != nil {
                    FRTextField(label: "Niche", text: $niche, placeholder: "e.g. beginner home workouts", systemImage: "scope", error: errors["niche"])
                    Text("Changing your niche updates upcoming missions and coaching. Days you've completed keep the niche they were done with.")
                        .font(.footnote).foregroundStyle(Theme.faint).frame(maxWidth: .infinity, alignment: .leading)
                }
                SelectRow(label: "First goal (30 days)", selection: $goal, options: store.journey.goalOptions.map(\.label))
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
        niche = store.enrollment?.answers.niche ?? ""
        goal = store.goal.label
    }

    private func save() {
        var next: [String: String] = [:]
        if name.trimmingCharacters(in: .whitespaces).count < 2 { next["name"] = "Enter your name." }
        if !AccountProfileOptions.isEmail(email.trimmingCharacters(in: .whitespaces)) { next["email"] = "Enter a valid email address." }
        let cleanNiche = niche.trimmingCharacters(in: .whitespaces)
        if store.enrollment != nil && (cleanNiche.count < 2 || NicheResolver.isTooBroad(cleanNiche)) { next["niche"] = "Be a bit more specific, e.g. who it's for." }
        errors = next
        guard next.isEmpty else { Haptics.notify(.error); return }
        store.s.user.name = name.trimmingCharacters(in: .whitespaces)
        store.s.user.email = email.trimmingCharacters(in: .whitespaces)
        if cleanNiche != store.enrollment?.answers.niche { store.updateNiche(cleanNiche) }
        if let option = store.journey.goalOptions.first(where: { $0.label == goal }) {
            store.updateEnrollment { $0.goal = option; $0.answers.goal = option.label }
            store.s.user.goal = option.label
            if option.metric == .revenue { store.s.user.goalAmount = option.target }
        }
        store.showToast("Profile updated")
        dismiss()
    }
}

// MARK: Legal

enum AccountLegalDoc: String, Identifiable {
    case privacy, terms
    var id: String { rawValue }

    var title: String { self == .privacy ? "Privacy Policy" : "Terms of Use" }
    var summary: String {
        self == .privacy
            ? "The short version: we collect what we need to run your account and build your plan. We never sell your data or track you across apps."
            : "The short version: Vaulten is an educational coaching tool. We help you work toward your first online income, but we can't guarantee you'll earn money."
    }
    var sections: [(String, String)] {
        switch self {
        case .privacy:
            [("What we collect", "Your account details (name, email), your onboarding answers (how you want to earn, your niche, time, budget, goal), what you track in the app (missions, notes, numbers, prospects, check-ins), and messages you send to the AI Coach or support. We also collect usage data and crash reports to keep the app working. We never receive your card details; Apple handles payment."),
             ("How we use it", "To run your account, sync your progress, personalise your plan and AI Coach answers, process your subscription, fix bugs and improve the app. We don't make decisions about you with legal or similar effects."),
             ("AI processing", "To answer the AI Coach and write your plan, we send the relevant details (your question, journey, niche, stage, goal and progress) to our AI provider, Anthropic, which does not use them to train its models. Please don't share passwords, bank details or health information with the coach."),
             ("Who we share it with", "Only service providers that run the app for us: our hosting and backend, Anthropic (AI), Vercel (AI hosting), RevenueCat (subscriptions), Apple (payments), PostHog (product analytics) and Sentry (crash reports). We do not sell or rent your personal data, and we don't use it for third-party advertising."),
             ("Your choices", "You can edit your details in the app, export your data and delete your account from Settings. Deleting your account doesn't cancel an App Store subscription; manage that in your Apple ID settings. Depending on where you live you may have more rights, such as access, correction and objection."),
             ("Children", "Vaulten is for people aged 18 and over.")]
        case .terms:
            [("No income guarantee", "Plans, lessons, templates, numbers and AI answers are educational. They are not financial, legal, tax or other professional advice. Results depend on you, your market and many things outside our control. Many people earn little or nothing at first."),
             ("AI can be wrong", "AI Coach answers and AI-written plans can be inaccurate or incomplete. Use your own judgment and check important facts before acting on them."),
             ("Your responsibilities", "When you contact businesses or creators, publish content, sell or use affiliate links, you act for yourself. Follow the law and every platform's rules: no spam, no false claims, disclose affiliate links and sponsorships, and handle your own taxes."),
             ("Subscriptions", "Premium and Ultimate are auto-renewing subscriptions bought through the App Store. Payment is charged to your Apple ID at confirmation, and the subscription renews unless you turn off auto-renew at least 24 hours before the period ends. Manage or cancel anytime in Settings > your name > Subscriptions. If a free trial is offered, it turns into a paid subscription unless you cancel before it ends. Refunds are handled by Apple."),
             ("Our content", "You can use the templates and scripts in your own outreach and business. You may not resell or republish our lessons, plans or templates."),
             ("Limits", "To the extent the law allows, the app is provided as is, and our liability is limited to what you paid us in the last 12 months. Your rights as a consumer are not affected.")]
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
                Text("Last updated October 14, 2026. This is a summary of the full document.").font(.caption).foregroundStyle(Theme.faint)
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
