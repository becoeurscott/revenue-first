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
            .task(id: "\(c.messages.last?.id ?? "none")-\(attempt)-\(CoachMeter.shared.usage?.isSpent == true)") { await respond() }
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
        guard store.canUseCoach, let c = conversation, let last = c.messages.last, last.isUser else { return }
        failed = false
        if CoachAPI.isAvailable {
            // The server counts the message; a spent allowance shows the upgrade card instead of an answer.
            guard CoachMeter.shared.usage?.isSpent != true else { return }
            do {
                let answer = try await CoachAPI.reply(to: c.messages, conversationId: id, store: store)
                guard !Task.isCancelled else { return }
                CoachMeter.shared.update(answer.usage)
                withAnimation(.snappy) { store.addChatMessage(id, from: "coach", answer.text) }
                Haptics.soft()
            } catch CoachAPI.Failure.limitReached(let usage) {
                withAnimation(.snappy) { CoachMeter.shared.update(usage) }
                Haptics.notify(.warning)
            } catch let failure as CoachAPI.Failure where failure.meansUnavailable {
                guard !Task.isCancelled else { return }
                // The API hadn't caught up with the subscription: re-sync so the next message reaches the AI coach.
                if case .subscriptionNotSynced = failure { Task { await RevenueCatService.shared.refreshEntitlement(sync: true) } }
                let reply = CoachEngine.reply(to: last.text, path: store.s.pathId).text
                withAnimation(.snappy) { store.addChatMessage(id, from: "coach", reply) }
                Haptics.soft()
            } catch {
                guard !Task.isCancelled else { return }
                withAnimation(.snappy) { failed = true }
                Haptics.notify(.error)
            }
            return
        }
        // Without the AI endpoint (or signed out), Premium keeps the built-in coach answers.
        guard store.isPremium else { return }
        let reply = CoachEngine.reply(to: last.text, path: store.s.pathId).text
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
    private var spent: CoachUsage? { CoachAPI.isAvailable ? CoachMeter.shared.usage.flatMap { $0.isSpent ? $0 : nil } : nil }
    private var typing: Bool { awaiting && !failed && spent == nil && store.canUseCoach }

    private var followUps: [String] {
        guard let last = messages.last, !last.isUser else { return [] }
        if let prevUser = messages.last(where: { $0.isUser }) { return CoachEngine.reply(to: prevUser.text, path: store.s.pathId).followUps }
        return MockData.coachFallback(store.s.pathId).followUps
    }

    var body: some View {
        ScrollViewReader { proxy in
            Screen(title: conversation.title) {
                if store.canUseCoach { thread } else { LockedView(feature: "AI Coach", message: store.journey.coachGateMessage) }
            }
            .defaultScrollAnchor(.bottom)
            .onAppear { scrollToBottom(proxy, animated: false) }
            .onChange(of: messages.count) { _, _ in scrollToBottom(proxy) }
            .onChange(of: typing) { _, _ in scrollToBottom(proxy) }
            .onChange(of: failed) { _, _ in scrollToBottom(proxy) }
        }
        .safeAreaInset(edge: .bottom) {
            if store.canUseCoach {
                CoachInputArea(placeholder: typing ? "Coach is typing…" : "Reply to your coach…", disabled: typing, onSend: onSend)
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
