import SwiftUI

struct CoachConversationView: View {
    let id: String
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var failed = false
    @State private var attempt = 0
    @State private var confirmDelete = false
    @State private var leaving = false

    private var conversation: CoachConversation? { store.s.conversations.first { $0.id == id } }

    var body: some View {
        if let c = conversation {
            CoachThreadScreen(
                conversation: c,
                failed: failed,
                onSend: { send($0) },
                onRetry: { withAnimation { failed = false }; attempt += 1 }
            )
            .task(id: "\(c.messages.last?.id ?? "none")-\(attempt)") { await respond() }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { confirmDelete = true } label: { Image(systemName: "trash") }
                        .accessibilityLabel("Delete conversation")
                }
            }
            .confirmationDialog("Delete this conversation?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Delete", role: .destructive) { delete() }
            } message: {
                Text("The messages will be removed from your history. This can't be undone.")
            }
        } else if !leaving {
            notFound
        }
    }

    private var notFound: some View {
        Screen(title: "Conversation") {
            EmptyStateView(title: "Conversation not found", message: "It may have been deleted. Start a new chat and your coach will pick things up from there.", mood: .sad) {
                Button("Back to coach") { dismiss() }.buttonStyle(.fr(.primary))
            }
        }
    }

    // MARK: Reply (driven by state, so it survives navigation)

    private func respond() async {
        guard store.isPremium, let last = conversation?.messages.last, last.isUser else { return }
        failed = false
        let reply = CoachEngine.reply(to: last.text).text(for: store.s.pathId)
        try? await Task.sleep(for: CoachEngine.typingDelay(for: reply))
        guard !Task.isCancelled else { return }
        if store.isOffline {
            withAnimation(.snappy) { failed = true }
            Haptics.notify(.error)
            return
        }
        withAnimation(.snappy) { store.addChatMessage(id, from: "coach", reply) }
        Haptics.soft()
    }

    private func send(_ text: String) {
        withAnimation(.snappy) { store.addChatMessage(id, from: "user", text) }
    }

    private func delete() {
        leaving = true
        dismiss()
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(450))
            store.deleteConversation(id)
            store.showToast("Conversation deleted")
        }
    }
}

/// Message list + composer for one conversation.
private struct CoachThreadScreen: View {
    let conversation: CoachConversation
    let failed: Bool
    let onSend: (String) -> Void
    let onRetry: () -> Void
    @Environment(AppStore.self) private var store

    private var messages: [ChatMessage] { conversation.messages }
    private var awaiting: Bool { messages.last?.isUser == true }
    private var typing: Bool { awaiting && !failed && store.isPremium }

    private var followUps: [String] {
        guard let last = messages.last, !last.isUser else { return [] }
        if let prevUser = messages.last(where: { $0.isUser }) { return CoachEngine.reply(to: prevUser.text).followUps }
        return MockData.shared.coach.fallback.followUps
    }

    var body: some View {
        ScrollViewReader { proxy in
            Screen(title: conversation.title) {
                PremiumGate(feature: "AI Coach", message: "Get instant, practical answers about clients, pricing and outreach, tailored to your path.") {
                    thread
                }
            }
            .defaultScrollAnchor(.bottom)
            .onAppear { scrollToBottom(proxy, animated: false) }
            .onChange(of: messages.count) { _, _ in scrollToBottom(proxy) }
            .onChange(of: typing) { _, _ in scrollToBottom(proxy) }
            .onChange(of: failed) { _, _ in scrollToBottom(proxy) }
        }
        .safeAreaInset(edge: .bottom) {
            if store.isPremium {
                CoachComposerBar(placeholder: typing ? "Coach is typing…" : "Reply to your coach…", disabled: typing, onSend: onSend)
            }
        }
    }

    private var thread: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            ForEach(Array(messages.enumerated()), id: \.element.id) { i, m in
                if i == 0 || !Calendar.current.isDate(messages[i - 1].date, inSameDayAs: m.date) {
                    CoachDaySeparator(date: m.date)
                }
                CoachBubble(message: m)
                    .transition(.asymmetric(insertion: .opacity.combined(with: .move(edge: .bottom)), removal: .opacity))
            }
            if typing { CoachTypingIndicator() }
            if awaiting && failed { CoachErrorBubble(onRetry: onRetry) }
            if !followUps.isEmpty { suggestions }
            Color.clear.frame(height: 1).id("bottom")
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Conversation with your coach")
    }

    private var suggestions: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            Text("SUGGESTED REPLIES").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.faint)
            FlowLayout(spacing: 8) {
                ForEach(followUps, id: \.self) { f in
                    CoachPromptChip(text: f, accent: true) { onSend(f) }
                }
            }
        }
        .padding(.leading, 38)
        .padding(.top, Space.xs)
        .transition(.opacity)
    }

    private func scrollToBottom(_ proxy: ScrollViewProxy, animated: Bool = true) {
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(60))
            if animated {
                withAnimation(.snappy) { proxy.scrollTo("bottom", anchor: .bottom) }
            } else {
                proxy.scrollTo("bottom", anchor: .bottom)
            }
        }
    }
}
