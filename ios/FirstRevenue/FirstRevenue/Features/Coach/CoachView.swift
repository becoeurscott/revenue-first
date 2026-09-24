import SwiftUI

private let coachGateMessage = "Get instant, practical answers about clients, pricing and outreach, tailored to your path."

struct CoachView: View {
    @Environment(AppStore.self) private var store
    @State private var loading = true
    @State private var pendingDelete: CoachConversation?

    var body: some View {
        Screen(title: "Your Business Coach", subtitle: "Ask me anything about your path.", large: true) {
            PremiumGate(feature: "AI Coach", message: coachGateMessage) {
                content
            }
        }
        .safeAreaInset(edge: .bottom) {
            if store.isPremium {
                CoachComposerBar { send($0) }
            }
        }
        .task {
            try? await Task.sleep(for: .milliseconds(450))
            withAnimation(.snappy) { loading = false }
        }
        .confirmationDialog("Delete this conversation?", isPresented: deleteBinding, titleVisibility: .visible, presenting: pendingDelete) { c in
            Button("Delete", role: .destructive) {
                withAnimation(.snappy) { store.deleteConversation(c.id) }
                store.showToast("Conversation deleted")
            }
        } message: { _ in
            Text("The messages will be removed from your history. This can't be undone.")
        }
    }

    private var deleteBinding: Binding<Bool> {
        Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } })
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: Space.xl) {
            hero.fadeUp(0)
            Adaptive2Col(leadingWeight: 0.6) {
                conversations
            } trailing: {
                tipCard.fadeUp(2)
            }
        }
    }

    // MARK: Hero

    private var hero: some View {
        let first = store.s.user.firstName
        let prompts = MockData.shared.coach.suggestedPrompts[store.s.pathId.rawValue] ?? []
        return VStack(alignment: .leading, spacing: Space.l) {
            HStack(spacing: Space.m) {
                MascotView(mood: .happy, size: 76, float: false)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Hi\(first.isEmpty ? "" : " \(first)"), what are you stuck on?")
                        .font(.title3.weight(.heavy)).foregroundStyle(Theme.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("Short answers, exact words, and one next step. Pick a question or type your own.")
                        .font(.subheadline).foregroundStyle(Theme.muted)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            FlowLayout(spacing: 8) {
                ForEach(prompts, id: \.self) { p in
                    CoachPromptChip(text: p) { send(p) }
                }
            }
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Suggested questions")
        }
        .card(.hero)
    }

    // MARK: Conversations

    private var conversations: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            SectionHeader(title: "Recent conversations")
            if loading {
                SkeletonList(count: 3)
            } else if store.s.conversations.isEmpty {
                EmptyStateView(title: "No conversations yet", message: "Ask your first question below. Your chats are saved here so you can come back to the advice.", mood: .thinking, compact: true)
            } else {
                VStack(spacing: Space.m) {
                    ForEach(Array(store.s.conversations.enumerated()), id: \.element.id) { i, c in
                        RevealSwipeRow(actions: [RevealSwipeAction(title: "Delete", systemImage: "trash", tint: Theme.danger) { pendingDelete = c }]) {
                            CoachConversationRow(conversation: c) { store.push(.coachConversation(c.id)) }
                        }
                        .contextMenu {
                            Button { store.push(.coachConversation(c.id)) } label: { Label("Open", systemImage: "bubble.left.and.bubble.right") }
                            Button(role: .destructive) { pendingDelete = c } label: { Label("Delete", systemImage: "trash") }
                        }
                        .fadeUp(i + 1)
                    }
                }
            }
        }
    }

    // MARK: Tip

    private var tipCard: some View {
        let tips = MockData.shared.coach.tips[store.s.pathId.rawValue] ?? []
        let tip = tips.isEmpty ? "" : tips[Calendar.current.component(.day, from: Date()) % tips.count]
        return VStack(alignment: .leading, spacing: Space.s) {
            SectionHeader(title: "Coach tip")
            HStack(alignment: .top, spacing: Space.m) {
                Image(systemName: "lightbulb.fill")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Theme.warning)
                    .frame(width: 40, height: 40)
                    .background(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous).fill(Theme.warning.opacity(0.12)))
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text(tip).font(.subheadline).foregroundStyle(Theme.inkSoft).fixedSize(horizontal: false, vertical: true)
                    Button { send("Tell me more about this tip: \"\(tip)\"") } label: {
                        Label("Ask the coach about this", systemImage: "sparkles")
                            .font(.footnote.weight(.semibold)).foregroundStyle(Theme.brand300)
                            .frame(minHeight: 44)
                    }
                    .buttonStyle(.plain)
                }
            }
            .card()
        }
    }

    // MARK: Actions

    private func send(_ text: String) {
        let id = store.startConversation(text)
        store.addChatMessage(id, from: "user", text)
        store.push(.coachConversation(id))
    }
}

private struct CoachConversationRow: View {
    let conversation: CoachConversation
    let open: () -> Void

    private var preview: String {
        guard let last = conversation.messages.last else { return "No messages yet" }
        let flat = last.text.split(whereSeparator: \.isWhitespace).joined(separator: " ")
        return (last.isUser ? "You: " : "") + flat
    }

    var body: some View {
        Button { Haptics.tap(); open() } label: {
            HStack(spacing: Space.m) {
                OutreachIconTile(systemImage: "bubble.left.and.text.bubble.right.fill", size: 44)
                VStack(alignment: .leading, spacing: 3) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(conversation.title).font(.body.weight(.semibold)).foregroundStyle(Theme.ink).lineLimit(1)
                        Spacer(minLength: 8)
                        Text(conversation.date.timeAgo).font(.caption).monospacedDigit().foregroundStyle(Theme.faint)
                    }
                    Text(preview).font(.footnote).foregroundStyle(Theme.muted).lineLimit(2)
                }
                Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Theme.faint)
            }
            .card(padding: Space.l)
        }
        .buttonStyle(.pressable)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(conversation.title), \(conversation.date.timeAgo). \(preview)")
        .accessibilityHint("Swipe left or use actions to delete")
    }
}
