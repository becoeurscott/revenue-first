import SwiftUI

// Building blocks for the Coach home and conversation screens.

struct CoachSparkleAvatar: View {
    var size: CGFloat = 30
    var body: some View {
        Image(systemName: "sparkles")
            .font(.system(size: size * 0.46, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(Circle().fill(Theme.brandGradient))
            .shadow(color: Theme.brand600.opacity(0.45), radius: 6)
            .accessibilityHidden(true)
    }
}

/// Tappable suggestion chip (hero prompts and follow-up replies).
struct CoachPromptChip: View {
    let text: String
    var accent = false
    let action: () -> Void

    var body: some View {
        Button { Haptics.tap(); action() } label: {
            Text(text)
                .font(.footnote.weight(.semibold))
                .multilineTextAlignment(.leading)
                .foregroundStyle(accent ? Theme.brand300 : Theme.inkSoft)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .frame(minHeight: 44)
                .background(Capsule().fill(accent ? Theme.brand500.opacity(0.12) : Theme.surface.opacity(0.85)))
                .overlay(Capsule().strokeBorder(accent ? Theme.brand500.opacity(0.35) : Theme.line))
        }
        .buttonStyle(.pressable)
        .accessibilityHint("Sends this question to your coach")
    }
}

/// Composer pinned above the tab bar with `.safeAreaInset(edge: .bottom)`.
struct CoachComposerBar: View {
    var placeholder = "Ask your coach anything…"
    var disabled = false
    let onSend: (String) -> Void
    @State private var text = ""
    @FocusState private var focused: Bool

    private var value: String { text.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var canSend: Bool { !value.isEmpty && !disabled }

    var body: some View {
        HStack(alignment: .bottom, spacing: 10) {
            field
            sendButton
        }
        .frame(maxWidth: 920)
        .padding(.horizontal, Space.gutter)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
        .background(Theme.bg.opacity(0.75))
        .overlay(alignment: .top) { Divider().overlay(Theme.line) }
    }

    private var field: some View {
        TextField(placeholder, text: $text, axis: .vertical)
            .lineLimit(1...5)
            .focused($focused)
            .foregroundStyle(Theme.ink)
            .tint(Theme.brand400)
            .padding(.horizontal, 16)
            .padding(.vertical, 13)
            .background(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).fill(Theme.surface))
            .overlay(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).strokeBorder(focused ? Theme.brand500 : Theme.line, lineWidth: focused ? 1.5 : 1))
            .accessibilityLabel("Message your coach")
            .animation(.snappy, value: focused)
    }

    private var sendButton: some View {
        Button(action: submit) {
            Image(systemName: "arrow.up")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(canSend ? Color.white : Theme.faint)
                .frame(width: 48, height: 48)
                .background(Circle().fill(canSend ? AnyShapeStyle(Theme.brandGradient) : AnyShapeStyle(Theme.surface3)))
                .shadow(color: canSend ? Theme.brand600.opacity(0.4) : .clear, radius: 8, y: 3)
        }
        .buttonStyle(.pressable)
        .disabled(!canSend)
        .accessibilityLabel("Send message")
        .animation(.snappy, value: canSend)
    }

    private func submit() {
        guard canSend else { return }
        Haptics.tap()
        onSend(value)
        text = ""
    }
}

struct CoachBubble: View {
    let message: ChatMessage

    private var isUser: Bool { message.isUser }
    private var shape: UnevenRoundedRectangle {
        UnevenRoundedRectangle(topLeadingRadius: 20, bottomLeadingRadius: isUser ? 20 : 6, bottomTrailingRadius: isUser ? 6 : 20, topTrailingRadius: 20, style: .continuous)
    }

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if isUser { Spacer(minLength: 44) } else { CoachSparkleAvatar() }
            VStack(alignment: isUser ? .trailing : .leading, spacing: 4) {
                bubble
                Text(message.date.shortTime)
                    .font(.caption2).monospacedDigit()
                    .foregroundStyle(Theme.faint)
                    .padding(.horizontal, 4)
            }
            if !isUser { Spacer(minLength: 44) }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(isUser ? "You said" : "Coach said"): \(message.text)")
    }

    @ViewBuilder private var bubble: some View {
        let text = Text(message.text)
            .font(.body)
            .lineSpacing(3)
            .textSelection(.enabled)
            .padding(.horizontal, 15)
            .padding(.vertical, 11)
        if isUser {
            text.foregroundStyle(.white)
                .background(shape.fill(Theme.brandGradient))
                .shadow(color: Theme.brand600.opacity(0.3), radius: 10, y: 4)
        } else {
            text.foregroundStyle(Theme.inkSoft)
                .background(shape.fill(Theme.surface))
                .overlay(shape.strokeBorder(Theme.line))
        }
    }
}

struct CoachTypingIndicator: View {
    @State private var bouncing = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            CoachSparkleAvatar()
            HStack(spacing: 5) {
                ForEach(0..<3, id: \.self) { i in
                    Circle()
                        .fill(Theme.brand300)
                        .frame(width: 8, height: 8)
                        .offset(y: bouncing && !reduceMotion ? -4 : 2)
                        .opacity(bouncing ? 1 : 0.5)
                        .animation(.easeInOut(duration: 0.42).repeatForever(autoreverses: true).delay(Double(i) * 0.14), value: bouncing)
                }
            }
            .padding(.horizontal, 16)
            .frame(height: 44)
            .background(UnevenRoundedRectangle(topLeadingRadius: 20, bottomLeadingRadius: 6, bottomTrailingRadius: 20, topTrailingRadius: 20, style: .continuous).fill(Theme.surface))
            .overlay(UnevenRoundedRectangle(topLeadingRadius: 20, bottomLeadingRadius: 6, bottomTrailingRadius: 20, topTrailingRadius: 20, style: .continuous).strokeBorder(Theme.line))
            Spacer(minLength: 0)
        }
        .onAppear { bouncing = true }
        .accessibilityElement()
        .accessibilityLabel("Coach is typing")
        .transition(.opacity.combined(with: .move(edge: .bottom)))
    }
}

/// Inline failure bubble shown in place of a coach reply while offline.
struct CoachErrorBubble: View {
    let onRetry: () -> Void

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            OutreachIconTile(systemImage: "wifi.slash", tint: Theme.danger, size: 30)
            VStack(alignment: .leading, spacing: 4) {
                Text("Couldn't reach your coach").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink)
                Text("You seem to be offline. Your message is saved. Try again when you're back.")
                    .font(.footnote).foregroundStyle(Theme.muted)
                    .fixedSize(horizontal: false, vertical: true)
                Button { Haptics.tap(); onRetry() } label: {
                    Label("Retry", systemImage: "arrow.clockwise")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Theme.danger)
                        .frame(minHeight: 44)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 15)
            .padding(.top, 11)
            .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Theme.danger.opacity(0.08)))
            .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(Theme.danger.opacity(0.25)))
            Spacer(minLength: 44)
        }
        .transition(.opacity.combined(with: .move(edge: .bottom)))
    }
}

struct CoachDaySeparator: View {
    let date: Date
    var body: some View {
        let cal = Calendar.current
        let label = cal.isDateInToday(date) ? "Today" : cal.isDateInYesterday(date) ? "Yesterday" : date.formatted(.dateTime.weekday(.wide).month(.abbreviated).day())
        HStack(spacing: 10) {
            Rectangle().fill(Theme.line).frame(height: 1)
            Text(label).font(.caption.weight(.semibold)).foregroundStyle(Theme.faint).fixedSize()
            Rectangle().fill(Theme.line).frame(height: 1)
        }
        .padding(.vertical, 4)
        .accessibilityAddTraits(.isHeader)
    }
}
