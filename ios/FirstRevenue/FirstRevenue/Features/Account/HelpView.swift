import SwiftUI

private enum HelpTab: String, CaseIterable, Hashable {
    case center = "Help Center", faq = "FAQ", contact = "Contact", report = "Report"
}

private enum HelpContent {
    static var faqs: [FaqItem] { MockData.shared.help.faqs }
    static var topics: [HelpTopic] { MockData.shared.help.topics }

    /// Which FAQ entries belong to each topic (matched against question + answer).
    static let topicKeywords: [String: [String]] = [
        "getting-started": ["path get selected", "change paths", "spend money"],
        "program": ["30-day program", "streak", "day 30"],
        "coach": ["coach"],
        "prospects": ["outreach", "guarantee"],
        "revenue": ["billing", "guarantee", "spend money"],
        "billing": ["billing", "data real", "change paths"],
    ]

    static let guidance: [String: [String]] = [
        "getting-started": ["Answer the onboarding questions honestly — your path is picked from your skills, time and budget.", "Day 1 takes about 20 minutes. Start it the same day you sign up while motivation is high.", "You can switch paths later from Profile → My Path. Progress on each path is kept."],
        "program": ["One mission unlocks per day. Finish every task to complete the day and earn XP.", "Completing a mission unlocks that day's lesson and keeps your streak alive.", "Every 7 days a weekly check-in asks what worked and sets next week's focus."],
        "coach": ["Ask specific questions: \"How much should I charge a local gym?\" gets a better answer than \"help\".", "Answers adapt to your current path and day.", "Every conversation is saved in the Coach tab so you can pick it up later."],
        "prospects": ["Add every person you contact to Prospects so follow-ups never slip.", "Move a prospect through statuses as the conversation progresses — deals are created for you.", "Use templates and the message generator as a starting point, then personalise the first line."],
        "revenue": ["Deals move from Potential to Booked to Collected. Only collected money counts toward your goal.", "Use the pricing calculator before quoting — it adjusts for scope, client size and turnaround.", "Change your income goal any time from Profile → My Goals."],
        "billing": ["Premium unlocks the full 30-day program, the AI Coach and every tool.", "You can switch between monthly and yearly, or cancel, from Settings → Subscription.", "Your data is stored on this device. Export or reset it from Settings → Privacy."],
    ]

    static func matches(_ f: FaqItem, _ q: String) -> Bool { "\(f.q) \(f.a)".lowercased().contains(q) }

    static func faqs(for topic: HelpTopic) -> [FaqItem] {
        let keys = topicKeywords[topic.id] ?? [topic.title.lowercased()]
        return faqs.filter { f in keys.contains { matches(f, $0) } }
    }
}

struct HelpView: View {
    @Environment(AppStore.self) private var store
    @State private var tab: HelpTab = .center
    @State private var query = ""
    @State private var topic: HelpTopic?
    @State private var openFaq: String?

    private var q: String { query.trimmingCharacters(in: .whitespaces).lowercased() }
    private var topicResults: [HelpTopic] { HelpContent.topics.filter { q.isEmpty || "\($0.title) \($0.description)".lowercased().contains(q) } }
    private var faqResults: [FaqItem] { HelpContent.faqs.filter { q.isEmpty || HelpContent.matches($0, q) } }

    var body: some View {
        Screen(title: "Help") {
            VStack(alignment: .leading, spacing: Space.xl) {
                SegmentedTabs(options: HelpTab.allCases, selection: tabBinding, title: { $0.rawValue })
                tabContent
                    .transition(.opacity)
                    .id(tab)
            }
        }
        .sheet(item: $topic) { t in
            HelpTopicSheet(topic: t, onFaq: showFaq, onContact: { topic = nil; switchTab(.contact) }, onCoach: {
                topic = nil
                store.tab = .coach
            })
        }
    }

    private var tabBinding: Binding<HelpTab> {
        Binding(get: { tab }, set: { switchTab($0) })
    }

    private func switchTab(_ t: HelpTab) {
        withAnimation(.snappy) {
            tab = t
            if t != .faq { openFaq = nil }
        }
    }

    private func showFaq(_ question: String) {
        topic = nil
        query = ""
        openFaq = question
        withAnimation(.snappy) { tab = .faq }
    }

    @ViewBuilder private var tabContent: some View {
        switch tab {
        case .center: centerTab
        case .faq: faqTab
        case .contact:
            formSection("Contact support", "A real person reads every message.") { HelpContactForm() }
        case .report:
            formSection("Report a problem", "Found a bug or something that looks wrong? Tell us and we'll fix it.") { HelpReportForm() }
        }
    }

    private func formSection<C: View>(_ title: String, _ subtitle: String, @ViewBuilder content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: Space.l) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.title2).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                Text(subtitle).font(.subheadline).foregroundStyle(Theme.muted)
            }
            content()
        }
        .frame(maxWidth: 620, alignment: .leading)
        .frame(maxWidth: .infinity)
    }

    // MARK: Help Center

    private var centerTab: some View {
        VStack(alignment: .leading, spacing: Space.xl) {
            VStack(alignment: .leading, spacing: Space.m) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("How can we help?").font(.title1).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                    Text("Search topics and common questions.").font(.subheadline).foregroundStyle(Theme.muted)
                }
                SearchField(text: $query, placeholder: "Search help")
            }
            if !q.isEmpty && topicResults.isEmpty && faqResults.isEmpty {
                noResults
            } else {
                centerResults
            }
        }
    }

    @ViewBuilder private var centerResults: some View {
        if !topicResults.isEmpty {
            VStack(alignment: .leading, spacing: Space.m) {
                SectionHeader(title: "Topics")
                LazyVGrid(columns: adaptiveColumns(min: 280), spacing: Space.m) {
                    ForEach(Array(topicResults.enumerated()), id: \.element.id) { i, t in
                        topicCard(t).fadeUp(i)
                    }
                }
            }
        }
        if !q.isEmpty && !faqResults.isEmpty {
            VStack(alignment: .leading, spacing: Space.m) {
                SectionHeader(title: "Questions · \(faqResults.count)")
                HelpFaqAccordion(items: faqResults, open: $openFaq)
            }
        }
        LazyVGrid(columns: adaptiveColumns(min: 300), spacing: Space.m) {
            coachCard
            stuckCard
        }
    }

    private func topicCard(_ t: HelpTopic) -> some View {
        Button { Haptics.tap(); topic = t } label: {
            HStack(spacing: Space.m) {
                HelpSymbol(icon: t.icon)
                VStack(alignment: .leading, spacing: 2) {
                    Text(t.title).font(.body.weight(.semibold)).foregroundStyle(Theme.ink)
                    Text(t.description).font(.footnote).foregroundStyle(Theme.muted).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 4)
                Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Theme.faint)
            }
            .frame(maxHeight: .infinity)
            .card(padding: Space.l)
        }
        .buttonStyle(.pressable)
        .accessibilityElement(children: .combine)
        .accessibilityHint("Opens guidance and related questions")
    }

    private var coachCard: some View {
        HStack(spacing: Space.m) {
            Image(systemName: "sparkles").font(.system(size: 20, weight: .semibold)).foregroundStyle(.white)
                .frame(width: 48, height: 48).background(Circle().fill(Theme.brandGradient))
            VStack(alignment: .leading, spacing: 2) {
                Text("Ask your coach").font(.body.weight(.bold)).foregroundStyle(Theme.ink)
                Text("Pricing, outreach, what to do next — answered in seconds.").font(.footnote).foregroundStyle(Theme.muted)
            }
            Spacer(minLength: 4)
            Button("Ask") { store.tab = .coach }.buttonStyle(.fr(.primary, size: .sm))
        }
        .card(.hero, padding: Space.l)
    }

    private var stuckCard: some View {
        HStack(spacing: Space.m) {
            Image(systemName: "envelope").font(.system(size: 20, weight: .semibold)).foregroundStyle(Theme.brand300)
                .frame(width: 48, height: 48).background(Circle().fill(Theme.surface3))
            VStack(alignment: .leading, spacing: 2) {
                Text("Still stuck?").font(.body.weight(.bold)).foregroundStyle(Theme.ink)
                Text("Message support. We reply within 24 hours.").font(.footnote).foregroundStyle(Theme.muted)
            }
            Spacer(minLength: 4)
            Button("Contact") { switchTab(.contact) }.buttonStyle(.fr(.secondary, size: .sm))
        }
        .card(padding: Space.l)
    }

    // MARK: FAQ

    private var faqTab: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            SearchField(text: $query, placeholder: "Search questions")
            if faqResults.isEmpty {
                noResults
            } else {
                HelpFaqAccordion(items: faqResults, open: $openFaq)
            }
        }
    }

    private var noResults: some View {
        EmptyStateView(title: "No answers found", message: "Nothing matches \"\(query.trimmingCharacters(in: .whitespaces))\". Try another word, or send us a message.", mood: .thinking) {
            HStack(spacing: Space.s) {
                Button("Clear search") { query = "" }.buttonStyle(.fr(.secondary))
                Button("Contact support") { switchTab(.contact) }.buttonStyle(.fr(.primary))
            }
        }
    }
}

// MARK: Pieces

private struct HelpSymbol: View {
    let icon: String
    var body: some View {
        SymbolTile(icon: icon, size: 44)
    }
}

private struct HelpFaqAccordion: View {
    let items: [FaqItem]
    @Binding var open: String?

    var body: some View {
        VStack(spacing: 0) {
            ForEach(Array(items.enumerated()), id: \.element.q) { i, item in
                row(item)
                if i < items.count - 1 { Divider().overlay(Theme.line) }
            }
        }
        .background(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).fill(Theme.surface))
        .overlay(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).strokeBorder(Theme.line))
        .clipShape(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous))
    }

    private func row(_ item: FaqItem) -> some View {
        let on = open == item.q
        return VStack(alignment: .leading, spacing: 0) {
            Button {
                Haptics.select()
                withAnimation(.spring(response: 0.38, dampingFraction: 0.86)) { open = on ? nil : item.q }
            } label: {
                HStack(spacing: Space.m) {
                    Text(item.q).font(.body.weight(.semibold)).foregroundStyle(on ? Theme.brand300 : Theme.ink).multilineTextAlignment(.leading)
                    Spacer(minLength: 4)
                    Image(systemName: "chevron.down").font(.footnote.weight(.bold)).foregroundStyle(on ? Theme.brand300 : Theme.faint)
                        .rotationEffect(.degrees(on ? 180 : 0))
                }
                .padding(.horizontal, Space.l)
                .padding(.vertical, 14)
                .frame(minHeight: 56)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(.isHeader)
            .accessibilityValue(on ? "Expanded" : "Collapsed")
            .accessibilityHint(on ? "Collapses the answer" : "Shows the answer")
            if on {
                Text(item.a).font(.subheadline).foregroundStyle(Theme.muted).lineSpacing(2).fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, Space.l).padding(.bottom, Space.l)
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .clipped()
    }
}

private struct HelpTopicSheet: View {
    let topic: HelpTopic
    let onFaq: (String) -> Void
    let onContact: () -> Void
    let onCoach: () -> Void

    var body: some View {
        AccountSheetScaffold(title: topic.title, description: topic.description, detents: [.medium, .large]) {
            VStack(alignment: .leading, spacing: Space.m) {
                ForEach(Array((HelpContent.guidance[topic.id] ?? []).enumerated()), id: \.offset) { i, tip in
                    HStack(alignment: .top, spacing: Space.m) {
                        Text("\(i + 1)").font(.caption.weight(.bold)).monospacedDigit().foregroundStyle(Theme.brand300)
                            .frame(width: 26, height: 26).background(Circle().fill(Theme.brand500.opacity(0.15)))
                        Text(tip).font(.subheadline).foregroundStyle(Theme.inkSoft).fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            related
        } footer: {
            HStack(spacing: Space.m) {
                Button("Contact support", action: onContact).buttonStyle(.fr(.secondary, full: true))
                Button("Ask your coach", action: onCoach).buttonStyle(.fr(.primary, full: true))
            }
        }
    }

    @ViewBuilder private var related: some View {
        let faqs = HelpContent.faqs(for: topic)
        if !faqs.isEmpty {
            VStack(alignment: .leading, spacing: Space.s) {
                Text("COMMON QUESTIONS").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.faint).padding(.horizontal, 4).accessibilityAddTraits(.isHeader)
                ListGroup {
                    ForEach(faqs, id: \.q) { f in
                        ListRow(icon: "questionmark.circle", title: f.q) { onFaq(f.q) }
                    }
                }
            }
            .padding(.top, Space.s)
        }
    }
}

// MARK: Forms

private enum HelpForms {
    static var subjects: [String] { HelpContent.topics.map(\.title) + ["Something else"] }
    static func ticket() -> String { "FR-\(Int.random(in: 10000...99999))" }
    static let offlineMessage = "You're offline. Try again when you're connected."
}

private struct HelpContactForm: View {
    @Environment(AppStore.self) private var store
    @State private var subject = HelpForms.subjects.first ?? ""
    @State private var message = ""
    @State private var email = ""
    @State private var errors: [String: String] = [:]
    @State private var loading = false
    @State private var ticket: String?

    var body: some View {
        Group {
            if let ticket { success(ticket).transition(.scale(scale: 0.96).combined(with: .opacity)) } else { form }
        }
        .animation(.snappy, value: ticket)
        .onAppear { if email.isEmpty { email = store.s.user.email } }
    }

    private var form: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            SelectRow(label: "Subject", selection: $subject, options: HelpForms.subjects)
            VStack(alignment: .leading, spacing: 6) {
                FRTextArea(label: "Message", text: $message, placeholder: "What do you need help with?", minHeight: 140)
                if let e = errors["message"] { Text(e).font(.footnote).foregroundStyle(Theme.danger) }
            }
            FRTextField(label: "Your email", text: $email, placeholder: "you@example.com", systemImage: "envelope", error: errors["email"], keyboard: .emailAddress, contentType: .emailAddress)
            Button(action: submit) { LoadingLabel(title: loading ? "Sending…" : "Send message", systemImage: "paperplane.fill", loading: loading) }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
                .disabled(loading)
            Text("We usually reply within 24 hours, Monday to Friday.").font(.footnote).foregroundStyle(Theme.faint).frame(maxWidth: .infinity)
        }
        .animation(.snappy, value: errors)
    }

    private func success(_ ticket: String) -> some View {
        VStack(spacing: Space.m) {
            Image(systemName: "checkmark.circle.fill").font(.system(size: 48)).foregroundStyle(Theme.success).symbolEffect(.bounce, value: ticket)
            Text("Message sent").font(.title2).foregroundStyle(Theme.ink)
            Text("We'll reply to \(email.trimmingCharacters(in: .whitespaces)).").font(.subheadline).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
            HStack(spacing: Space.m) {
                AccountFactTile(label: "Ticket", value: ticket)
                AccountFactTile(label: "Expected reply", value: "Within 24 hours")
            }
            .padding(.top, Space.s)
            Text("Demo only — no message was actually sent.").font(.caption).foregroundStyle(Theme.faint)
            Button("Send another message") {
                self.ticket = nil
                message = ""
            }
            .buttonStyle(.fr(.secondary))
        }
        .frame(maxWidth: .infinity)
        .card(.completed)
    }

    private func submit() {
        var e: [String: String] = [:]
        if message.trimmingCharacters(in: .whitespacesAndNewlines).count < 10 { e["message"] = "Tell us a little more — at least 10 characters." }
        if !AccountProfileOptions.isEmail(email.trimmingCharacters(in: .whitespaces)) { e["email"] = "Enter a valid email so we can reply." }
        errors = e
        guard e.isEmpty else { Haptics.notify(.error); return }
        guard !store.isOffline else { store.showToast(HelpForms.offlineMessage, .error); return }
        loading = true
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(1))
            loading = false
            Haptics.notify(.success)
            ticket = HelpForms.ticket()
        }
    }
}

private struct HelpReportForm: View {
    @Environment(AppStore.self) private var store
    @State private var category: String?
    @State private var details = ""
    @State private var diagnostics = true
    @State private var error: String?
    @State private var loading = false
    @State private var ticket: String?

    var body: some View {
        Group {
            if let ticket { success(ticket).transition(.opacity.combined(with: .move(edge: .bottom))) } else { form }
        }
        .animation(.snappy, value: ticket)
    }

    private var form: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            VStack(alignment: .leading, spacing: Space.s) {
                Text("What went wrong?").font(.footnote.weight(.medium)).foregroundStyle(Theme.muted)
                FlowLayout(spacing: Space.s) {
                    ForEach(MockData.shared.help.problemCategories, id: \.self) { c in chip(c) }
                }
            }
            FRTextArea(label: "What happened?", text: $details, placeholder: "What were you doing, what did you expect, and what happened instead?", minHeight: 140)
            ListGroup {
                FRToggleRow(icon: "stethoscope", title: "Include diagnostic info", detail: diagnosticsDetail, isOn: $diagnostics)
            }
            if let error {
                Label(error, systemImage: "exclamationmark.circle.fill").font(.footnote).foregroundStyle(Theme.danger)
                    .transition(.opacity)
            }
            Button(action: submit) { LoadingLabel(title: loading ? "Submitting…" : "Submit report", systemImage: "paperplane.fill", loading: loading) }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
                .disabled(loading)
        }
        .animation(.snappy, value: error)
    }

    private var diagnosticsDetail: String {
        let p = store.program
        return diagnostics ? "App 0.9 · \(p.path.name) · Day \(p.currentDay)" : "Only your description will be sent"
    }

    private func chip(_ c: String) -> some View {
        let on = category == c
        return Button {
            Haptics.select()
            withAnimation(.snappy) { category = c; error = nil }
        } label: {
            Text(c)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(on ? Theme.brand300 : Theme.muted)
                .multilineTextAlignment(.leading)
                .padding(.horizontal, 14)
                .frame(minHeight: 44)
                .background(Capsule().fill(on ? Theme.brand500.opacity(0.15) : Theme.surface))
                .overlay(Capsule().strokeBorder(on ? Theme.brand500.opacity(0.5) : Theme.line))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? .isSelected : [])
    }

    private func success(_ ticket: String) -> some View {
        VStack(spacing: Space.m) {
            MascotView(mood: .love, size: 116, say: "Thank you!")
            Text("Report received").font(.title2).foregroundStyle(Theme.ink)
            Text("Reference \(ticket). \(diagnostics ? "Diagnostic info was attached, which helps us fix it faster." : "No diagnostic info was attached.")")
                .font(.subheadline).foregroundStyle(Theme.muted).multilineTextAlignment(.center).frame(maxWidth: 320)
            Text("Demo only — nothing was actually sent.").font(.caption).foregroundStyle(Theme.faint)
            Button("Report another problem") {
                self.ticket = nil
                category = nil
                details = ""
            }
            .buttonStyle(.fr(.secondary))
            .padding(.top, Space.s)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Space.xl)
        .card()
    }

    private func submit() {
        guard category != nil else { error = "Pick the category that fits best."; Haptics.notify(.error); return }
        guard details.trimmingCharacters(in: .whitespacesAndNewlines).count >= 10 else { error = "Describe what happened — at least 10 characters."; Haptics.notify(.error); return }
        error = nil
        guard !store.isOffline else { store.showToast(HelpForms.offlineMessage, .error); return }
        loading = true
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(1))
            loading = false
            Haptics.notify(.success)
            ticket = HelpForms.ticket()
        }
    }
}
