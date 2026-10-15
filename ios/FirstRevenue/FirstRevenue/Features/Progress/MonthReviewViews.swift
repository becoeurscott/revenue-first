import SwiftUI

/// Progress before money: the journey's funnel (output → reach → money) with the next step to reach,
/// and an honest timeline, so a user with $0 so far can still see that they are moving.
struct MomentumCard: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let steps = MonthCoach.funnel(for: store.journey)
        let stats = store.stats
        let next = steps.first { stats.value($0.metric) == 0 }
        VStack(alignment: .leading, spacing: Space.s) {
            HStack {
                Text(store.month > 1 ? "MONTH \(store.month) MOMENTUM" : "YOUR MOMENTUM").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.faint)
                Spacer()
            }
            VStack(alignment: .leading, spacing: Space.m) {
                HStack(spacing: 0) {
                    ForEach(Array(steps.enumerated()), id: \.element) { i, step in
                        if i > 0 {
                            Image(systemName: "chevron.right").font(.caption2.weight(.bold)).foregroundStyle(Theme.faint)
                                .frame(maxWidth: 18)
                        }
                        stepView(step, value: stats.value(step.metric), reached: stats.value(step.metric) > 0)
                    }
                }
                if let next {
                    Label("Next: your first \(next.label.lowercased() == "earned" ? "income" : singular(next.label))", systemImage: "flag.fill")
                        .font(.footnote.weight(.semibold)).foregroundStyle(Theme.brand300)
                } else if !steps.isEmpty {
                    Label("Every step is moving. Keep the rhythm.", systemImage: "checkmark.seal.fill")
                        .font(.footnote.weight(.semibold)).foregroundStyle(Theme.success)
                }
                if let focus = store.enrollment?.focus {
                    Text("This month's focus: \(focus.lowercasedFirst).").font(.footnote).foregroundStyle(Theme.ink)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Text(MonthCoach.timeline(store.journey.id)).font(.caption).foregroundStyle(Theme.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .card(padding: Space.l)
        }
        .accessibilityElement(children: .combine)
    }

    private func stepView(_ step: FunnelStep, value: Int, reached: Bool) -> some View {
        VStack(spacing: 4) {
            Image(systemName: step.icon).font(.system(size: 13, weight: .semibold))
                .foregroundStyle(reached ? Theme.brand300 : Theme.faint)
            Text(step.isMoney ? money(value) : value.formatted())
                .font(.number(18)).foregroundStyle(reached ? Theme.ink : Theme.faint)
                .lineLimit(1).minimumScaleFactor(0.6)
            Text(step.label).font(.caption2).foregroundStyle(Theme.muted).lineLimit(1).minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity)
    }

    private func singular(_ label: String) -> String {
        let l = label.lowercased()
        if l == "replies" { return "reply" }
        return l.hasSuffix("s") ? String(l.dropLast()) : l
    }
}

/// The honest month review on the Day 30 screen: what happened, the most likely reason money hasn't
/// come yet (or that it did), and the focus of next month, which starts from here.
struct MonthReviewSection: View {
    let onStartNext: () -> Void
    @Environment(AppStore.self) private var store

    var body: some View {
        let stats = store.stats
        let diagnosis = MonthCoach.diagnose(journey: store.journey, stats: stats)
        let text = MonthCoach.explanation(diagnosis, journey: store.journey, stats: stats)
        VStack(alignment: .leading, spacing: Space.l) {
            VStack(alignment: .leading, spacing: 4) {
                Text("YOUR MONTH \(store.month) REVIEW").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.faint)
                Text(diagnosis.title).font(.title2).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Text(text.why).font(.body).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
            HStack(alignment: .top, spacing: Space.m) {
                Image(systemName: "scope").font(.system(size: 16, weight: .semibold)).foregroundStyle(.white)
                    .frame(width: 36, height: 36).background(Circle().fill(Theme.brandGradient))
                VStack(alignment: .leading, spacing: 2) {
                    Text("MONTH \(store.month + 1) FOCUS").font(.eyebrow).tracking(0.6).foregroundStyle(Theme.faint)
                    Text(text.focus).font(.body.weight(.semibold)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                }
            }
            if diagnosis != .earned {
                Text(MonthCoach.timeline(store.journey.id)).font(.footnote).foregroundStyle(Theme.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Button { Haptics.tap(); onStartNext() } label: {
                Label("Start Month \(store.month + 1)", systemImage: "arrow.right").labelStyle(TrailingIconLabel())
            }
            .buttonStyle(.fr(.primary, size: .lg, full: true))
            Text("A new 30-day plan built around this focus. Your lessons, numbers and history stay.")
                .font(.caption).foregroundStyle(Theme.faint).frame(maxWidth: .infinity)
                .multilineTextAlignment(.center)
        }
        .card(.selected, padding: Space.xl)
    }
}
