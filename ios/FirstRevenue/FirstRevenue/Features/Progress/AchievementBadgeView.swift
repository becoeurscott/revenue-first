import SwiftUI

/// Progress of one achievement against the live stats.
struct AchievementProgressInfo {
    let value: Double
    let unlocked: Bool
    let text: String

    init(_ a: Achievement, current: Int) {
        let capped = min(max(current, 0), a.target)
        let fmt: (Int) -> String = { a.money == true ? money($0) : "\($0)" }
        value = a.target > 0 ? Double(capped) / Double(a.target) : 1
        unlocked = current >= a.target
        text = "\(fmt(capped)) / \(fmt(a.target))"
    }
}

/// Round medallion. Unlocked = gradient ring + glow; locked = grayscale, dim, with a lock.
struct AchievementMedalView: View {
    let icon: String
    let unlocked: Bool
    var size: CGFloat = 72
    @State private var pulse = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            if unlocked {
                Circle().fill(Theme.brand500.opacity(0.45))
                    .frame(width: size * 0.9, height: size * 0.9)
                    .blur(radius: size * 0.18)
                    .scaleEffect(pulse ? 1.08 : 0.92)
                    .opacity(pulse ? 1 : 0.7)
            }
            ring
            Image(systemName: icon)
                .font(.system(size: size * 0.36, weight: .bold))
                .foregroundStyle(unlocked ? AnyShapeStyle(Theme.textGradient) : AnyShapeStyle(Theme.faint))
                .symbolRenderingMode(.monochrome)
        }
        .frame(width: size, height: size)
        .overlay(alignment: .bottomTrailing) { if !unlocked { lockBadge } }
        .onAppear {
            guard unlocked, !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 1.8).repeatForever(autoreverses: true)) { pulse = true }
        }
        .accessibilityHidden(true)
    }

    private var ring: some View {
        Circle()
            .fill(unlocked ? AnyShapeStyle(Theme.brandGradient) : AnyShapeStyle(Theme.lineStrong))
            .overlay(Circle().fill(Theme.surface2).padding(3))
            .shadow(color: unlocked ? Theme.brand600.opacity(0.45) : .clear, radius: 8)
    }

    private var lockBadge: some View {
        Image(systemName: "lock.fill")
            .font(.system(size: max(9, size * 0.13), weight: .bold))
            .foregroundStyle(Theme.muted)
            .frame(width: max(22, size * 0.32), height: max(22, size * 0.32))
            .background(Circle().fill(Theme.surface3))
            .overlay(Circle().strokeBorder(Theme.lineStrong))
    }
}

/// Grid tile for the achievements screen.
struct AchievementBadgeView: View {
    let achievement: Achievement
    let current: Int
    let onSelect: () -> Void

    var body: some View {
        let p = AchievementProgressInfo(achievement, current: current)
        Button { Haptics.tap(); onSelect() } label: {
            VStack(spacing: 0) {
                AchievementMedalView(icon: achievement.icon, unlocked: p.unlocked)
                Text(achievement.title)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(p.unlocked ? Theme.ink : Theme.muted)
                    .lineLimit(1).minimumScaleFactor(0.85)
                    .padding(.top, Space.m)
                footer(p)
            }
            .frame(maxWidth: .infinity)
            .padding(Space.l)
            .background(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).fill(p.unlocked ? Theme.brand500.opacity(0.07) : Theme.surface))
            .overlay(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).strokeBorder(p.unlocked ? Theme.brand500.opacity(0.3) : Theme.line))
        }
        .buttonStyle(.pressable)
        .accessibilityLabel("\(achievement.title), \(p.unlocked ? "unlocked" : "locked, \(p.text)")")
        .accessibilityHint("Shows details")
    }

    @ViewBuilder private func footer(_ p: AchievementProgressInfo) -> some View {
        if p.unlocked {
            Label("Unlocked", systemImage: "checkmark.seal.fill")
                .font(.caption.weight(.semibold)).foregroundStyle(Theme.brand300)
                .padding(.top, 6)
        } else {
            VStack(spacing: 6) {
                ProgressBar(value: p.value, height: 6, label: "\(achievement.title) progress")
                Text(p.text).font(.caption).monospacedDigit().foregroundStyle(Theme.faint)
            }
            .padding(.top, Space.s + 2)
        }
    }
}
