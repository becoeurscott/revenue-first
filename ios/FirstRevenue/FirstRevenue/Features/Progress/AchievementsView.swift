import SwiftUI

private enum AchievementFilter: String, CaseIterable { case all = "All", unlocked = "Unlocked", locked = "Locked" }

struct AchievementsView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.horizontalSizeClass) private var hSize
    @State private var filter: AchievementFilter = .all
    @State private var selected: Achievement?

    private var all: [Achievement] { MockData.shared.achievements }

    var body: some View {
        let stats = store.stats
        let unlocked = all.filter { stats.value($0.metric) >= $0.target }.count
        Screen(title: "Achievements") {
            VStack(alignment: .leading, spacing: Space.l) {
                header(unlocked: unlocked).fadeUp(0)
                FilterChips(options: AchievementFilter.allCases, selection: $filter, title: { $0.rawValue }, count: { f in
                    switch f {
                    case .all: all.count
                    case .unlocked: unlocked
                    case .locked: all.count - unlocked
                    }
                })
                grid(stats)
            }
        }
        .sheet(item: $selected) { a in
            AchievementDetailSheet(achievement: a) { selected = nil }
        }
    }

    private func header(unlocked: Int) -> some View {
        let pct = all.isEmpty ? 0 : Int((Double(unlocked) / Double(all.count) * 100).rounded())
        return VStack(alignment: .leading, spacing: Space.l) {
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("YOUR COLLECTION").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.brand300)
                    Text("\(unlocked) of \(all.count) unlocked").font(.title2.weight(.heavy)).monospacedDigit().foregroundStyle(Theme.ink)
                        .contentTransition(.numericText())
                }
                Spacer()
                Text("\(pct)%").font(.number(32)).foregroundStyle(Theme.textGradient)
            }
            ProgressBar(value: all.isEmpty ? 0 : Double(unlocked) / Double(all.count), label: "Achievements unlocked")
        }
        .card(.hero)
        .accessibilityElement(children: .combine)
    }

    private func visible(_ stats: Stats) -> [Achievement] {
        all.filter { a in
            let on = stats.value(a.metric) >= a.target
            switch filter {
            case .all: return true
            case .unlocked: return on
            case .locked: return !on
            }
        }
    }

    @ViewBuilder private func grid(_ stats: Stats) -> some View {
        let items = visible(stats)
        if items.isEmpty {
            emptyState
        } else {
            let cols = Array(repeating: GridItem(.flexible(), spacing: Space.m, alignment: .top), count: hSize == .regular ? 4 : 2)
            LazyVGrid(columns: cols, spacing: Space.m) {
                ForEach(Array(items.enumerated()), id: \.element.id) { i, a in
                    AchievementBadgeView(achievement: a, current: stats.value(a.metric)) { selected = a }
                        .fadeUp(i)
                }
            }
            .id(filter)
        }
    }

    @ViewBuilder private var emptyState: some View {
        if filter == .unlocked {
            EmptyStateView(title: "No achievements yet", message: "Complete your first daily mission and your first badge unlocks right away.") {
                Button("Go to my plan") { store.tab = .plan }.buttonStyle(.fr(.primary))
            }
        } else {
            EmptyStateView(title: "Nothing left to unlock", message: "You collected every badge. That is the whole set.", mood: .love) {
                Button("Show all badges") { withAnimation(.snappy) { filter = .all } }.buttonStyle(.fr(.secondary))
            }
        }
    }
}

// MARK: - Detail sheet

private struct AchievementHint { let cta: String; let tip: String; let icon: String }

private struct AchievementDetailSheet: View {
    let achievement: Achievement
    let close: () -> Void
    @Environment(AppStore.self) private var store
    @State private var popped = false

    var body: some View {
        let p = AchievementProgressInfo(achievement, current: store.stats.value(achievement.metric))
        let hint = Self.hint(achievement.metric)
        ScrollView {
            VStack(spacing: Space.l) {
                AchievementMedalView(icon: achievement.icon, unlocked: p.unlocked, size: 120)
                    .scaleEffect(popped ? 1 : 0.6)
                    .opacity(popped ? 1 : 0)
                    .padding(.top, Space.xl)
                VStack(spacing: Space.s) {
                    Text(achievement.title).font(.title2.weight(.heavy)).foregroundStyle(Theme.ink).multilineTextAlignment(.center)
                    Badge(p.unlocked ? "Unlocked" : "Locked", tone: p.unlocked ? .success : .neutral, systemImage: p.unlocked ? "checkmark" : "lock.fill")
                    Text(achievement.description).font(.callout).foregroundStyle(Theme.muted).multilineTextAlignment(.center).frame(maxWidth: 320)
                }
                progressBox(p, hint: hint)
                cta(p, hint: hint)
            }
            .padding(.horizontal, Space.xl)
            .padding(.bottom, Space.xl)
        }
        .background(Theme.bgSunken.ignoresSafeArea())
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .onAppear {
            withAnimation(.bouncy.delay(0.05)) { popped = true }
            if p.unlocked { Haptics.notify(.success) }
        }
    }

    private func progressBox(_ p: AchievementProgressInfo, hint: AchievementHint) -> some View {
        VStack(alignment: .leading, spacing: Space.s) {
            HStack {
                Text("Progress").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink)
                Spacer()
                Text(p.text).font(.footnote).monospacedDigit().foregroundStyle(Theme.muted)
            }
            ProgressBar(value: p.value, tone: p.unlocked ? .success : .brand, label: "\(achievement.title) progress")
            if !p.unlocked {
                Text(hint.tip).font(.footnote).foregroundStyle(Theme.faint).fixedSize(horizontal: false, vertical: true).padding(.top, 4)
            }
        }
        .card(padding: Space.l)
    }

    @ViewBuilder private func cta(_ p: AchievementProgressInfo, hint: AchievementHint) -> some View {
        if p.unlocked {
            Button("Done", action: close).buttonStyle(.fr(.secondary, size: .lg, full: true))
        } else {
            Button { go() } label: { Label(hint.cta, systemImage: hint.icon) }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
        }
    }

    private func go() {
        close()
        switch achievement.metric {
        case .missions, .daysCompleted: store.tab = .plan
        case .prospects, .contacted, .replies, .clients: store.push(.outreach(.prospects))
        case .revenue: store.push(.revenue)
        case .lessons: store.push(.lessons)
        case .streak: store.push(.streak)
        }
    }

    private static func hint(_ m: StatMetric) -> AchievementHint {
        switch m {
        case .missions: AchievementHint(cta: "Open my plan", tip: "Complete daily missions to move this forward.", icon: "calendar")
        case .daysCompleted: AchievementHint(cta: "Open my plan", tip: "Finish every day of your 30-day plan.", icon: "calendar")
        case .streak: AchievementHint(cta: "View my streak", tip: "Complete a mission every day without skipping.", icon: "flame.fill")
        case .prospects: AchievementHint(cta: "Add prospects", tip: "Add potential clients to your prospect list.", icon: "person.badge.plus")
        case .contacted: AchievementHint(cta: "Open prospects", tip: "Send outreach to the prospects on your list.", icon: "paperplane.fill")
        case .replies: AchievementHint(cta: "Open prospects", tip: "Keep sending personalized outreach. Replies follow volume.", icon: "bubble.left.and.bubble.right.fill")
        case .clients: AchievementHint(cta: "Open prospects", tip: "Move an interested prospect to Won.", icon: "person.2.fill")
        case .revenue: AchievementHint(cta: "Open revenue tracker", tip: "Mark a deal as collected once the client pays.", icon: "dollarsign.circle.fill")
        case .lessons: AchievementHint(cta: "Browse lessons", tip: "Watch lessons from the library to the end.", icon: "play.rectangle.fill")
        }
    }
}
