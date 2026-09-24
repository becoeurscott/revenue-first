import SwiftUI

private let streakGoals = [3, 7, 14, 30]

struct StreakView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        Screen(title: "Streak") {
            VStack(alignment: .leading, spacing: Space.xl) {
                StreakHero(streak: store.s.streak).fadeUp(0)
                Adaptive2Col(spacing: Space.l) {
                    stats.fadeUp(1)
                    activity.fadeUp(2)
                } trailing: {
                    StreakMotivationCard().fadeUp(3)
                    StreakMilestoneCard(streak: store.s.streak).fadeUp(4)
                }
            }
        }
    }

    private var stats: some View {
        let cols = Array(repeating: GridItem(.flexible(), spacing: Space.m, alignment: .top), count: 3)
        return LazyVGrid(columns: cols, spacing: Space.m) {
            StatCard(value: "\(store.s.streak)", label: "Current")
            StatCard(value: "\(store.s.longestStreak)", label: "Longest")
            StatCard(value: "\(store.s.activeDays.count)", label: "Active days")
        }
    }

    private var activity: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            SectionHeader(title: "Your activity")
            VStack(alignment: .leading, spacing: Space.l) {
                HeatmapView(activeDays: store.s.activeDays)
                HStack(spacing: Space.l) {
                    legend(fill: AnyShapeStyle(Theme.brandGradient), "Mission completed")
                    legend(fill: AnyShapeStyle(Theme.surface3), "No activity")
                }
                .font(.caption).foregroundStyle(Theme.faint)
            }
            .card()
        }
    }

    private func legend(fill: AnyShapeStyle, _ text: String) -> some View {
        HStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 4, style: .continuous).fill(fill).frame(width: 12, height: 12)
            Text(text)
        }
    }
}

// MARK: - Hero

private struct StreakHero: View {
    let streak: Int
    @State private var float = false
    @State private var glow = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: Space.s) {
            ZStack {
                Circle().fill(Theme.warning.opacity(0.35)).frame(width: 128, height: 128).blur(radius: 34)
                    .scaleEffect(glow ? 1.12 : 0.9).opacity(glow ? 1 : 0.7)
                Circle().fill(Theme.brand500.opacity(0.35)).frame(width: 90, height: 90).blur(radius: 24)
                Image(systemName: "flame.fill").font(.system(size: 84, weight: .bold))
                    .foregroundStyle(LinearGradient(colors: [Theme.warning, Theme.danger], startPoint: .top, endPoint: .bottom))
                    .shadow(color: Theme.warning.opacity(0.6), radius: 18)
                    .offset(y: float ? -7 : 3)
                    .rotationEffect(.degrees(float ? 4 : -4), anchor: .bottom)
                    .accessibilityHidden(true)
            }
            .frame(width: 150, height: 150)
            Text("CURRENT STREAK").font(.eyebrow).tracking(1).foregroundStyle(Theme.brand300)
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("\(streak)").font(.number(64)).foregroundStyle(Theme.ink).contentTransition(.numericText(value: Double(streak)))
                Text(streak == 1 ? "day" : "days").font(.title.weight(.bold)).foregroundStyle(Theme.muted)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, Space.s)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Current streak: \(streak) \(streak == 1 ? "day" : "days")")
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 2.2).repeatForever(autoreverses: true)) { float = true }
            withAnimation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true)) { glow = true }
        }
    }
}

// MARK: - Motivation

private struct StreakMotivationCard: View {
    @Environment(AppStore.self) private var store

    private struct Message { let mood: MascotMood; let title: String; let body: String }

    private func message(_ streak: Int) -> Message {
        switch streak {
        case 0: Message(mood: .wink, title: "Every streak starts at one", body: "Finish today’s mission and light the fire. It takes about 20 minutes.")
        case 1...2: Message(mood: .happy, title: "You’ve started. That’s the hard part.", body: "The first three days decide whether a habit sticks. Show up again tomorrow.")
        case 3...6: Message(mood: .focused, title: "Momentum is building", body: "You’re past the point where most people quit. A full week is within reach.")
        case 7...13: Message(mood: .excited, title: "A full week of showing up", body: "This is how first clients happen — small, boring, daily action. Keep stacking days.")
        default: Message(mood: .love, title: "You’re in rare company", body: "Two weeks or more of daily action. At this point the streak is part of who you are.")
        }
    }

    var body: some View {
        let program = store.program
        let msg = message(store.s.streak)
        VStack(alignment: .leading, spacing: Space.l) {
            HStack(alignment: .center, spacing: Space.l) {
                MascotView(mood: program.todayDone ? .happy : msg.mood, size: 88, float: false)
                VStack(alignment: .leading, spacing: 4) {
                    Text(msg.title).font(.headline.weight(.bold)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                    Text(msg.body).font(.subheadline).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
                }
            }
            cta(program)
        }
        .card(program.todayDone ? .completed : .hero)
    }

    @ViewBuilder private func cta(_ program: Program) -> some View {
        if program.todayDone {
            Label("Today is done. See you tomorrow.", systemImage: "checkmark.circle.fill")
                .font(.subheadline.weight(.semibold)).foregroundStyle(Theme.success)
                .frame(maxWidth: .infinity, minHeight: 48)
                .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.success.opacity(0.12)))
        } else {
            Button { Haptics.tap(); store.cover = .mission(program.currentDay) } label: {
                Label("Keep it alive — start today’s mission", systemImage: "arrow.right").labelStyle(TrailingIconLabel())
                    .minimumScaleFactor(0.8)
            }
            .buttonStyle(.fr(.primary, size: .lg, full: true))
        }
    }
}

// MARK: - Next milestone

private struct StreakMilestoneCard: View {
    let streak: Int

    var body: some View {
        VStack(alignment: .leading, spacing: Space.m) {
            summary
            HStack(spacing: Space.s) {
                ForEach(streakGoals, id: \.self) { g in tile(g) }
            }
            .padding(.top, 4)
        }
        .card()
    }

    @ViewBuilder private var summary: some View {
        if let goal = streakGoals.first(where: { $0 > streak }) {
            let prev = streakGoals.last(where: { $0 <= streak }) ?? 0
            HStack(alignment: .firstTextBaseline) {
                Text("Next milestone: \(goal)-day streak").font(.subheadline.weight(.bold)).foregroundStyle(Theme.ink)
                Spacer()
                Text("\(streak)/\(goal)").font(.footnote).monospacedDigit().foregroundStyle(Theme.muted)
            }
            ProgressBar(value: Double(streak - prev) / Double(goal - prev), label: "Progress to a \(goal)-day streak")
            Text("\(goal - streak) more \(goal - streak == 1 ? "day" : "days") to go.").font(.footnote).foregroundStyle(Theme.faint)
        } else {
            Text("Every streak milestone reached").font(.subheadline.weight(.bold)).foregroundStyle(Theme.ink)
            ProgressBar(value: 1, tone: .success, label: "All streak milestones reached")
            Text("30 days in a row. Nothing left to unlock here — just keep going.").font(.footnote).foregroundStyle(Theme.faint)
        }
    }

    private func tile(_ g: Int) -> some View {
        let reached = streak >= g
        return VStack(spacing: 0) {
            Text("\(g)").font(.number(18))
            Text("days").font(.caption2.weight(.medium))
        }
        .foregroundStyle(reached ? Theme.brand300 : Theme.faint)
        .frame(maxWidth: .infinity, minHeight: 52)
        .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(reached ? Theme.brand500.opacity(0.15) : Theme.surface2))
        .overlay(alignment: .topTrailing) {
            if reached { Image(systemName: "checkmark.circle.fill").font(.caption2).foregroundStyle(Theme.brand300).padding(4) }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(g)-day streak, \(reached ? "reached" : "not reached")")
    }
}
