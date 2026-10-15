import SwiftUI

/// The coach composer with the plan's message allowance: a small counter above the field, and an upgrade
/// card in its place once the allowance is spent. Without real AI it is just the composer.
struct CoachInputArea: View {
    var placeholder = "Ask your coach anything…"
    var disabled = false
    let onSend: (String) -> Void
    @Environment(AppStore.self) private var store
    private var meter: CoachMeter { CoachMeter.shared }

    var body: some View {
        VStack(spacing: 0) {
            if CoachAPI.isAvailable, let u = meter.usage, u.isSpent {
                CoachLimitCard(usage: u)
                    .padding(.horizontal, Space.gutter)
                    .padding(.vertical, 10)
                    .frame(maxWidth: 920)
                    .frame(maxWidth: .infinity)
                    .background(.ultraThinMaterial)
                    .background(Theme.bg.opacity(0.75))
            } else {
                if CoachAPI.isAvailable, let u = meter.usage, u.tier != .ultimate || u.remaining <= 30 {
                    counter(u)
                }
                CoachComposerBar(placeholder: placeholder, disabled: disabled, onSend: onSend)
            }
        }
        // Refreshes after sign-in and after any purchase, so an upgrade shows its new allowance right away.
        .task(id: "\(store.s.account?.id ?? "")-\(store.isPremium)-\(store.isUltimate)") {
            if CoachAPI.isAvailable { await meter.refresh() }
        }
    }

    private func counter(_ u: CoachUsage) -> some View {
        HStack(spacing: 6) {
            Image(systemName: "bubble.left.and.text.bubble.right").font(.caption2)
            Text(u.summary).font(.caption.weight(.medium))
            Spacer()
            if u.tier == .free || u.tier == .premium {
                Button { Haptics.tap(); store.paywallFeature = "more AI coaching" } label: {
                    Text("Get more").font(.caption.weight(.semibold)).foregroundStyle(Theme.brand300)
                }
                .frame(minHeight: 32)
            }
        }
        .foregroundStyle(u.remaining <= 2 ? Theme.warning : Theme.muted)
        .padding(.horizontal, Space.gutter)
        .padding(.top, 6)
        .frame(maxWidth: 920)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
        .background(Theme.bg.opacity(0.75))
        .overlay(alignment: .top) { Divider().overlay(Theme.line) }
        .accessibilityElement(children: .combine)
    }
}

/// Shown when the plan's coach allowance is spent.
struct CoachLimitCard: View {
    let usage: CoachUsage
    @Environment(AppStore.self) private var store

    private var title: String {
        switch usage.tier {
        case .free: "You've used your free coach messages"
        case .premium: "You've used this month's coach messages"
        case .ultimate: "You've used this month's 300 messages"
        case .trial: "You've used your trial's coach messages"
        }
    }

    private var message: String {
        let reset = usage.resetsAt.map { "They reset on \($0.formatted(.dateTime.month(.wide).day()))." } ?? ""
        switch usage.tier {
        case .free: return "Upgrade to keep asking. Ultimate gives you 300 coach messages a month for your journey and niche."
        case .premium: return "\(reset) Need more now? Ultimate gives you 300 messages a month."
        case .ultimate: return "\(reset) Your plan, lessons and tools still work as usual."
        case .trial: return "Your full allowance starts when your trial ends: 10 a month on Premium, 300 on Ultimate. Your plan, lessons and tools still work as usual."
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            HStack(spacing: 10) {
                Image(systemName: usage.tier == .ultimate || usage.tier == .trial ? "hourglass" : "sparkles")
                    .font(.system(size: 15, weight: .semibold)).foregroundStyle(.white)
                    .frame(width: 32, height: 32).background(Circle().fill(Theme.brandGradient))
                Text(title).font(.subheadline.weight(.bold)).foregroundStyle(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Text(message.trimmingCharacters(in: .whitespaces)).font(.footnote).foregroundStyle(Theme.muted)
                .fixedSize(horizontal: false, vertical: true)
            if usage.tier == .free || usage.tier == .premium {
                Button { Haptics.tap(); store.paywallFeature = "more AI coaching" } label: {
                    Label("Get More Coaching", systemImage: "crown.fill")
                }
                .buttonStyle(.fr(.primary, full: true))
                .padding(.top, 4)
            }
        }
        .padding(Space.l)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).fill(Theme.brand500.opacity(0.08)))
        .overlay(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).strokeBorder(Theme.brand500.opacity(0.35)))
        .transition(.opacity)
    }
}
