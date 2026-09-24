import SwiftUI

struct ProgressScreen: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let program = store.program
        let stats = store.stats
        Screen(title: "Progress", subtitle: "Day \(program.currentDay) of \(program.totalDays) · \(program.path.name)", large: true) {
            VStack(alignment: .leading, spacing: Space.xl) {
                ProgressHeroCard(program: program, stats: stats).fadeUp(0)
                if program.finished { finishedCard.fadeUp(1) }
                statGrid(stats)
                Adaptive2Col(spacing: Space.xl) {
                    ProgressMilestonesCard(stats: stats)
                } trailing: {
                    keepGoing(stats)
                }
            }
        }
    }

    private var finishedCard: some View {
        Button { Haptics.tap(); store.cover = .complete } label: {
            HStack(spacing: Space.l) {
                Image(systemName: "party.popper.fill").font(.title2).foregroundStyle(.white)
                    .frame(width: 52, height: 52).background(Circle().fill(Theme.brandGradient))
                    .shadow(color: Theme.brand600.opacity(0.5), radius: 12)
                VStack(alignment: .leading, spacing: 2) {
                    Text("You finished all 30 days").font(.headline.weight(.bold)).foregroundStyle(Theme.ink)
                    Text("See your results and choose what happens next.").font(.subheadline).foregroundStyle(Theme.muted)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right").font(.body.weight(.semibold)).foregroundStyle(Theme.brand300)
            }
            .card(.selected)
        }
        .buttonStyle(.pressable)
    }

    private func statGrid(_ stats: Stats) -> some View {
        VStack(alignment: .leading, spacing: Space.s) {
            SectionHeader(title: "Your numbers")
            LazyVGrid(columns: adaptiveColumns(min: 150), spacing: Space.m) {
                StatCard(icon: "flame.fill", value: "\(stats.streak)", label: "Current streak") { store.push(.streak) }
                StatCard(icon: "medal.fill", value: "\(stats.longestStreak)", label: "Longest streak")
                StatCard(icon: "target", value: "\(stats.missions)", label: "Missions completed")
                StatCard(icon: "play.rectangle.fill", value: "\(stats.lessons)", label: "Lessons watched") { store.push(.lessons) }
                StatCard(icon: "paperplane.fill", value: "\(stats.contacted)", label: "Prospects contacted") { store.push(.outreach(.prospects)) }
                StatCard(icon: "bubble.left.and.bubble.right.fill", value: "\(stats.replies)", label: "Replies")
                StatCard(icon: "person.2.fill", value: "\(stats.clients)", label: "Clients won")
                StatCard(icon: "dollarsign.circle.fill", value: money(stats.revenue), label: "Revenue earned", accent: true) { store.push(.revenue) }
            }
        }
    }

    private func keepGoing(_ stats: Stats) -> some View {
        VStack(alignment: .leading, spacing: Space.m) {
            SectionHeader(title: "Keep going")
            ProgressLinkCard(icon: "checklist.checked", tint: Theme.brand300, title: "Weekly check-in", detail: "3 minutes to reflect and set next week's focus. +50 XP") {
                store.cover = .checkIn
            }
            ProgressLinkCard(icon: "trophy.fill", tint: Theme.warning, title: "All achievements", detail: "See every badge you can unlock.") {
                store.push(.achievements)
            }
            ProgressLinkCard(icon: "flame.fill", tint: Theme.danger, title: "Streak", detail: "\(stats.streak) \(stats.streak == 1 ? "day" : "days") in a row · best \(stats.longestStreak)") {
                store.push(.streak)
            }
        }
    }
}

// MARK: - Hero

private struct ProgressHeroCard: View {
    let program: Program
    let stats: Stats
    @Environment(AppStore.self) private var store
    @Environment(\.horizontalSizeClass) private var hSize

    var body: some View {
        let layout = hSize == .regular ? AnyLayout(HStackLayout(spacing: Space.xxl)) : AnyLayout(VStackLayout(spacing: Space.xl))
        layout {
            ring
            VStack(alignment: .leading, spacing: Space.xl) {
                level
                revenue
            }
            .frame(maxWidth: .infinity)
        }
        .frame(maxWidth: .infinity)
        .card(.hero)
    }

    private var ring: some View {
        let done = program.daysCompleted
        let pct = Int((Double(done) / Double(program.totalDays) * 100).rounded())
        return ProgressRing(value: Double(done) / Double(program.totalDays), size: 168, lineWidth: 14, label: "30-day completion") {
            VStack(spacing: 2) {
                Text("\(pct)%").font(.number(40)).foregroundStyle(Theme.ink).contentTransition(.numericText())
                Text("\(done)/\(program.totalDays) days").font(.footnote).monospacedDigit().foregroundStyle(Theme.muted)
            }
        }
    }

    private var level: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            HStack {
                Label {
                    Text("Level \(stats.level)").font(.body.weight(.bold)).foregroundStyle(Theme.ink)
                } icon: {
                    Image(systemName: "bolt.fill").font(.caption.weight(.bold)).foregroundStyle(.white)
                        .frame(width: 28, height: 28).background(Circle().fill(Theme.brandGradient))
                }
                Spacer(minLength: 6)
                Text("\(stats.xp.formatted()) XP · \(400 - stats.xp % 400) to next level")
                    .font(.footnote).monospacedDigit().foregroundStyle(Theme.muted).lineLimit(1).minimumScaleFactor(0.8)
            }
            ProgressBar(value: stats.levelProgress, label: "Level \(stats.level) progress")
        }
        .accessibilityElement(children: .combine)
    }

    private var revenue: some View {
        let goal = max(store.s.user.goalAmount, 1)
        let note = stats.revenue >= goal
            ? "Goal reached. Time to set a bigger one."
            : "\(money(goal - stats.revenue)) to go. " + (stats.booked > 0 ? "\(money(stats.booked)) is already booked." : "One client can close most of that gap.")
        return VStack(alignment: .leading, spacing: Space.s) {
            HStack(alignment: .firstTextBaseline) {
                Text("Revenue goal").font(.body.weight(.bold)).foregroundStyle(Theme.ink)
                Spacer(minLength: 6)
                (Text(money(stats.revenue)).fontWeight(.semibold).foregroundStyle(Theme.ink) + Text(" of \(money(goal))").foregroundStyle(Theme.muted))
                    .font(.footnote).monospacedDigit()
            }
            ProgressBar(value: Double(stats.revenue) / Double(goal), tone: .success, label: "Revenue goal progress")
            Text(note).font(.footnote).foregroundStyle(Theme.faint).fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Milestones timeline

private struct ProgressMilestone: Identifiable {
    let title: String
    let icon: String
    let current: Int
    let target: Int
    var isMoney = false
    let hint: String
    var id: String { title }
    var achieved: Bool { current >= target }
    func fmt(_ n: Int) -> String { isMoney ? money(n) : "\(n)" }
}

private struct ProgressMilestonesCard: View {
    let stats: Stats
    @Environment(AppStore.self) private var store

    private var items: [ProgressMilestone] {
        [
            ProgressMilestone(title: "First Mission", icon: "flag.fill", current: stats.missions, target: 1, hint: "Complete your first daily mission"),
            ProgressMilestone(title: "3-Day Streak", icon: "flame.fill", current: max(stats.streak, min(stats.longestStreak, 3)), target: 3, hint: "Show up three days in a row"),
            ProgressMilestone(title: "First Prospect", icon: "magnifyingglass", current: stats.prospects, target: 1, hint: "Add one potential client"),
            ProgressMilestone(title: "10 Prospects", icon: "list.bullet.clipboard.fill", current: stats.prospects, target: 10, hint: "Build a list of 10 potential clients"),
            ProgressMilestone(title: "First Reply", icon: "bubble.left.fill", current: stats.replies, target: 1, hint: "Get a reply from a prospect"),
            ProgressMilestone(title: "First Client", icon: "person.crop.circle.badge.checkmark", current: stats.clients, target: 1, hint: "Turn a prospect into a paying client"),
            ProgressMilestone(title: "First $100", icon: "dollarsign.circle.fill", current: stats.revenue, target: 100, isMoney: true, hint: "Collect your first $100"),
            ProgressMilestone(title: "First $500", icon: "banknote.fill", current: stats.revenue, target: 500, isMoney: true, hint: "Reach $500 collected"),
        ]
    }

    var body: some View {
        let list = items
        let next = list.firstIndex { !$0.achieved }
        VStack(alignment: .leading, spacing: Space.s) {
            SectionHeader(title: "Milestones", action: "All achievements") { store.push(.achievements) }
            VStack(alignment: .leading, spacing: 0) {
                Text("\(list.filter(\.achieved).count) of \(list.count) reached").font(.footnote).monospacedDigit().foregroundStyle(Theme.muted)
                    .padding(.bottom, Space.l)
                ForEach(Array(list.enumerated()), id: \.element.id) { i, m in
                    ProgressMilestoneRow(milestone: m, isNext: i == next, isLast: i == list.count - 1)
                }
            }
            .card()
        }
    }
}

private struct ProgressMilestoneRow: View {
    let milestone: ProgressMilestone
    let isNext: Bool
    let isLast: Bool

    var body: some View {
        HStack(alignment: .top, spacing: Space.l) {
            VStack(spacing: 0) {
                medallion
                if !isLast {
                    Capsule().fill(milestone.achieved ? Theme.brand500.opacity(0.5) : Theme.line)
                        .frame(width: 2).frame(maxHeight: .infinity)
                        .padding(.vertical, 4)
                }
            }
            content.padding(.bottom, isLast ? 0 : Space.l)
        }
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(milestone.title), \(milestone.achieved ? "reached" : isNext ? "next up, \(milestone.fmt(min(milestone.current, milestone.target))) of \(milestone.fmt(milestone.target))" : "locked")")
    }

    @ViewBuilder private var medallion: some View {
        let shape = Circle()
        if milestone.achieved {
            Image(systemName: "checkmark").font(.system(size: 16, weight: .heavy)).foregroundStyle(.white)
                .frame(width: 40, height: 40).background(shape.fill(Theme.brandGradient))
                .shadow(color: Theme.brand600.opacity(0.45), radius: 8)
        } else if isNext {
            Image(systemName: milestone.icon).font(.system(size: 16, weight: .semibold)).foregroundStyle(Theme.brand300)
                .frame(width: 40, height: 40).background(shape.fill(Theme.brand500.opacity(0.15)))
                .overlay(shape.strokeBorder(Theme.brand500.opacity(0.6), lineWidth: 2))
        } else {
            Image(systemName: "lock.fill").font(.system(size: 13, weight: .semibold)).foregroundStyle(Theme.faint)
                .frame(width: 40, height: 40).background(shape.fill(Theme.surface2)).overlay(shape.strokeBorder(Theme.line))
        }
    }

    @ViewBuilder private var content: some View {
        let inner = VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: Space.s) {
                Text(milestone.title).font(.subheadline.weight(.semibold))
                    .foregroundStyle(milestone.achieved || isNext ? Theme.ink : Theme.muted).lineLimit(1)
                Spacer(minLength: 4)
                if milestone.achieved { Badge("Reached", tone: .success) }
                if isNext { Badge("Next up", tone: .brand) }
            }
            Text(milestone.hint).font(.footnote).foregroundStyle(Theme.faint).fixedSize(horizontal: false, vertical: true)
            if isNext { nextProgress }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        if isNext {
            inner.padding(Space.m)
                .background(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).fill(Theme.brand500.opacity(0.07)))
                .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(Theme.brand500.opacity(0.3)))
                .padding(.top, -6)
        } else {
            inner.padding(.top, 2)
        }
    }

    private var nextProgress: some View {
        let m = milestone
        return VStack(alignment: .leading, spacing: 6) {
            ProgressBar(value: Double(m.current) / Double(m.target), label: "\(m.title) progress")
            Text("\(m.fmt(min(m.current, m.target))) of \(m.fmt(m.target)) · \(m.fmt(m.target - m.current)) to go")
                .font(.caption.weight(.medium)).monospacedDigit().foregroundStyle(Theme.muted)
        }
        .padding(.top, Space.s)
    }
}

// MARK: - Link card

private struct ProgressLinkCard: View {
    let icon: String
    let tint: Color
    let title: String
    let detail: String
    let action: () -> Void

    var body: some View {
        Button { Haptics.tap(); action() } label: {
            HStack(spacing: Space.m) {
                Image(systemName: icon).font(.system(size: 18, weight: .semibold)).foregroundStyle(tint)
                    .frame(width: 44, height: 44)
                    .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(tint.opacity(0.12)))
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.body.weight(.semibold)).foregroundStyle(Theme.ink)
                    Text(detail).font(.footnote).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 4)
                Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Theme.faint)
            }
            .card(padding: Space.l)
        }
        .buttonStyle(.pressable)
    }
}
