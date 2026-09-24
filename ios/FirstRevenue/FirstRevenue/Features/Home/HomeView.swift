import SwiftUI

struct HomeView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let program = store.program
        let stats = store.stats
        Screen(title: "\(greeting()), \(store.s.user.firstName.isEmpty ? "there" : store.s.user.firstName)", subtitle: "Day \(program.currentDay) of \(program.totalDays) · \(program.path.name)", large: true) {
            VStack(alignment: .leading, spacing: Space.xl) {
                Adaptive2Col(spacing: Space.l) {
                    MissionHero().fadeUp(0)
                } trailing: {
                    progressCard(program: program, stats: stats).fadeUp(1)
                }

                if !store.isPremium {
                    Button { store.push(.subscription) } label: {
                        HStack(spacing: Space.m) {
                            Image(systemName: "crown.fill").foregroundStyle(.white).frame(width: 40, height: 40).background(Circle().fill(Theme.brandGradient))
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Unlock your full journey").font(.body.weight(.bold)).foregroundStyle(Theme.ink)
                                Text("AI Coach, outreach assistant, pricing and path switching.").font(.footnote).foregroundStyle(Theme.muted)
                            }
                            Spacer()
                            Image(systemName: "arrow.right").foregroundStyle(Theme.brand300)
                        }
                        .card(.selected, padding: Space.l)
                    }
                    .buttonStyle(.pressable)
                }

                quickActions

                Adaptive2Col {
                    todaysLesson(program)
                    currentGoal(stats)
                    yourPath(program, stats: stats)
                } trailing: {
                    milestone(stats)
                    recentWins(stats)
                    coachTip(program)
                }
            }
        }
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button { store.push(.search) } label: { Image(systemName: "magnifyingglass") }.accessibilityLabel("Search")
                Button { store.push(.notifications) } label: {
                    Image(systemName: store.unreadCount > 0 ? "bell.badge.fill" : "bell")
                        .symbolRenderingMode(.palette)
                        .foregroundStyle(Theme.danger, Theme.ink)
                }
                .accessibilityLabel(store.unreadCount > 0 ? "Notifications, \(store.unreadCount) unread" : "Notifications")
            }
        }
    }

    // MARK: Sections

    private func progressCard(program: Program, stats: Stats) -> some View {
        HStack(spacing: Space.l) {
            ProgressRing(value: Double(stats.daysCompleted) / Double(program.totalDays), size: 118, label: "30-day completion") {
                VStack(spacing: 2) {
                    (Text("\(program.currentDay)").font(.number(30)) + Text(" / \(program.totalDays)").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.faint))
                        .foregroundStyle(Theme.ink)
                    Text("DAY").font(.caption2.weight(.bold)).tracking(1).foregroundStyle(Theme.faint)
                }
            }
            VStack(spacing: 10) {
                pill("Streak", "\(stats.streak) day\(stats.streak == 1 ? "" : "s")", icon: AnyView(StreakFlame(size: 15))) { store.push(.streak) }
                pill("Level \(stats.level)", "\(stats.xp) XP", icon: AnyView(Image(systemName: "bolt.fill").font(.system(size: 13, weight: .bold)).foregroundStyle(Theme.brand300))) { store.tab = .progress }
            }
        }
        .frame(maxHeight: .infinity)
        .card()
    }

    private func pill(_ label: String, _ value: String, icon: AnyView, action: @escaping () -> Void) -> some View {
        Button { Haptics.tap(); action() } label: {
            HStack(spacing: 6) {
                Text(label).font(.subheadline).foregroundStyle(Theme.muted)
                Spacer(minLength: 4)
                icon
                Text(value).font(.body.weight(.bold)).monospacedDigit().foregroundStyle(Theme.ink).lineLimit(1).minimumScaleFactor(0.8)
            }
            .padding(.horizontal, 14).frame(minHeight: 48)
            .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.surface2))
            .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).strokeBorder(Theme.line))
        }
        .buttonStyle(.pressable)
    }

    private var quickActions: some View {
        let actions: [(String, String, Route)] = [("Prospects", "person.2", .outreach(.prospects)), ("Pricing", "tag", .pricing), ("Revenue", "dollarsign.circle", .revenue), ("Resources", "folder", .resources)]
        return HStack(spacing: 10) {
            ForEach(actions, id: \.0) { a in
                Button { Haptics.tap(); store.push(a.2) } label: {
                    VStack(spacing: 6) {
                        Image(systemName: a.1).font(.system(size: 19, weight: .semibold)).foregroundStyle(Theme.brand300)
                        Text(a.0).font(.caption.weight(.semibold)).foregroundStyle(Theme.muted).lineLimit(1).minimumScaleFactor(0.8)
                    }
                    .frame(maxWidth: .infinity, minHeight: 76)
                    .background(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).fill(Theme.surface))
                    .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(Theme.line))
                }
                .buttonStyle(.pressable)
            }
        }
    }

    @ViewBuilder private func todaysLesson(_ program: Program) -> some View {
        if let lesson = MockData.lesson(program.today.lessonId) {
            VStack(alignment: .leading, spacing: Space.s) {
                SectionHeader(title: "Today's Lesson", action: "Library") { store.push(.lessons) }
                LessonCard(lesson: lesson, row: true)
                if !program.todayDone {
                    Label("Unlocks when you complete today's mission", systemImage: "lock.fill").font(.caption).foregroundStyle(Theme.faint).padding(.horizontal, 4)
                }
            }
        }
    }

    private func currentGoal(_ stats: Stats) -> some View {
        let goal = max(store.s.user.goalAmount, 1)
        let pct = min(100, Int(Double(stats.revenue) / Double(goal) * 100))
        return VStack(alignment: .leading, spacing: Space.s) {
            SectionHeader(title: "Current Goal", action: "Revenue") { store.push(.revenue) }
            VStack(alignment: .leading, spacing: Space.m) {
                HStack(alignment: .bottom) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Earn your first \(money(goal))").font(.footnote).foregroundStyle(Theme.muted)
                        (Text(money(stats.revenue)).font(.number(30)).foregroundStyle(Theme.ink) + Text(" / \(money(goal))").font(.body.weight(.semibold)).foregroundStyle(Theme.faint))
                    }
                    Spacer()
                    Badge("\(pct)%", tone: stats.revenue > 0 ? .success : .neutral)
                }
                ProgressBar(value: Double(stats.revenue) / Double(goal), tone: .success, label: "Progress to income goal")
                Text(stats.booked > 0 ? "\(money(stats.booked)) more is booked and \(money(stats.potential)) is in your pipeline."
                     : stats.potential > 0 ? "\(money(stats.potential)) in your pipeline. Keep following up."
                     : "Your first dollar comes from your first conversation. Start with today's mission.")
                    .font(.footnote).foregroundStyle(Theme.faint)
            }
            .card()
        }
    }

    private func yourPath(_ program: Program, stats: Stats) -> some View {
        VStack(alignment: .leading, spacing: Space.s) {
            SectionHeader(title: "Your Path", action: "All paths") { store.push(.paths) }
            Button { store.push(.path(program.pathId)) } label: {
                HStack(spacing: Space.l) {
                    SymbolTile(icon: program.path.icon, size: 56)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(program.path.name).font(.body.weight(.bold)).foregroundStyle(Theme.ink)
                        Text("Week \(program.today.week) · \(program.path.weeks[safe: program.today.week - 1]?.title ?? "")").font(.footnote).foregroundStyle(Theme.muted)
                        ProgressBar(value: Double(stats.daysCompleted) / Double(program.totalDays), height: 6, label: "Path progress").padding(.top, 6)
                    }
                    Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Theme.faint)
                }
                .card()
            }
            .buttonStyle(.pressable)
        }
    }

    @ViewBuilder private func milestone(_ stats: Stats) -> some View {
        if let next = MockData.shared.achievements.first(where: { stats.value($0.metric) < $0.target }) {
            let v = stats.value(next.metric)
            VStack(alignment: .leading, spacing: Space.s) {
                SectionHeader(title: "Upcoming Milestone", action: "Badges") { store.push(.achievements) }
                Button { store.push(.achievements) } label: {
                    HStack(spacing: Space.l) {
                        SymbolTile(icon: next.icon, tint: Theme.muted, size: 56, circle: true)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(next.title).font(.body.weight(.bold)).foregroundStyle(Theme.ink)
                            Text(next.description).font(.footnote).foregroundStyle(Theme.muted).lineLimit(1)
                            HStack(spacing: 10) {
                                ProgressBar(value: Double(v) / Double(next.target), height: 6, label: "\(next.title) progress")
                                Text(next.money == true ? "\(money(v)) / \(money(next.target))" : "\(v) / \(next.target)").font(.caption.weight(.semibold)).monospacedDigit().foregroundStyle(Theme.muted).fixedSize()
                            }
                            .padding(.top, 6)
                        }
                    }
                    .card()
                }
                .buttonStyle(.pressable)
            }
        }
    }

    private func recentWins(_ stats: Stats) -> some View {
        var wins: [(String, String, Color)] = []
        if let c = store.s.deals.first(where: { $0.status == .collected }) { wins.append(("dollarsign.circle.fill", "\(c.client) paid you \(money(c.amount))", Theme.success)) }
        if let w = store.s.prospects.first(where: { $0.status == .won }) { wins.append(("trophy.fill", "You won \(w.business) as a client", Theme.warning)) }
        if stats.replies > 0 { wins.append(("bubble.left.and.bubble.right.fill", "\(stats.replies) prospect\(stats.replies > 1 ? "s" : "") replied to your outreach", Theme.info)) }
        if stats.daysCompleted > 0 { wins.append(("checkmark.seal.fill", "\(stats.daysCompleted) mission\(stats.daysCompleted > 1 ? "s" : "") completed on this path", Theme.brand300)) }
        if stats.streak >= 3 { wins.append(("flame.fill", "\(stats.streak)-day streak and counting", Theme.warning)) }
        return VStack(alignment: .leading, spacing: Space.s) {
            SectionHeader(title: "Recent Wins", action: "Progress") { store.tab = .progress }
            if wins.isEmpty {
                Text("Your wins will show up here. The first one is a single mission away.").font(.subheadline).foregroundStyle(Theme.muted).card()
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(wins.prefix(4).enumerated()), id: \.offset) { i, w in
                        HStack(spacing: 12) { SymbolTile(icon: w.0, tint: w.2, size: 32); Text(w.1).font(.subheadline).foregroundStyle(Theme.inkSoft); Spacer() }
                            .padding(.horizontal, Space.l).padding(.vertical, 14)
                        if i < min(wins.count, 4) - 1 { Divider().overlay(Theme.line) }
                    }
                }
                .card(padding: 0)
            }
        }
    }

    private func coachTip(_ program: Program) -> some View {
        let tips = MockData.shared.coach.tips[program.pathId.rawValue] ?? []
        let tip = tips.isEmpty ? "" : tips[program.currentDay % tips.count]
        return VStack(alignment: .leading, spacing: Space.s) {
            SectionHeader(title: "Coach Tip", action: "Ask coach") { store.tab = .coach }
            HStack(alignment: .top, spacing: Space.m) {
                MascotView(mood: .wink, size: 64, float: false)
                VStack(alignment: .leading, spacing: 6) {
                    Text(tip).font(.subheadline).foregroundStyle(Theme.inkSoft).fixedSize(horizontal: false, vertical: true)
                    Button { store.tab = .coach } label: { Label("Ask a follow-up", systemImage: "sparkles").font(.footnote.weight(.semibold)).foregroundStyle(Theme.brand300).frame(minHeight: 44) }
                }
            }
            .card()
        }
    }
}

/// Today's mission card — changes with state: not started, in progress, done, program finished.
private struct MissionHero: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let p = store.program
        let lessonDone = store.s.completedLessons.contains(p.today.lessonId)
        Group {
            if p.finished {
                VStack(alignment: .leading, spacing: Space.m) {
                    Badge("Program complete", tone: .success)
                    Label("You finished all 30 days", systemImage: "party.popper.fill").font(.title2.weight(.heavy)).foregroundStyle(Theme.ink)
                    Text("See your results and choose what happens next.").font(.subheadline).foregroundStyle(Theme.muted)
                    Spacer(minLength: 0)
                    Button { store.cover = .complete } label: { Label("View My Results", systemImage: "arrow.right").labelStyle(TrailingIconLabel()) }
                        .buttonStyle(.fr(.primary, size: .lg, full: true))
                }
                .card(.hero)
            } else if p.todayDone {
                VStack(alignment: .leading, spacing: Space.m) {
                    Label("DAY \(p.today.day) COMPLETE", systemImage: "checkmark.circle.fill").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.success)
                    Text(p.today.theme).font(.title2.weight(.heavy)).foregroundStyle(Theme.ink)
                    Text(lessonDone ? "Mission and lesson done. Rest up — or get ahead while you have momentum." : "Nice work. Your lesson is unlocked — it takes a few minutes and makes tomorrow easier.")
                        .font(.subheadline).foregroundStyle(Theme.muted)
                    Spacer(minLength: 0)
                    if !lessonDone {
                        Button("Watch Today's Lesson") { store.push(.lesson(p.today.lessonId)) }.buttonStyle(.fr(.primary, size: .lg, full: true))
                    }
                    if p.today.day < p.totalDays {
                        Button {
                            withAnimation(.snappy) { store.advanceDay() }
                            Haptics.notify(.success)
                        } label: { Label("Start Day \(p.today.day + 1) Early", systemImage: "arrow.right").labelStyle(TrailingIconLabel()) }
                        .buttonStyle(.fr(lessonDone ? .primary : .secondary, size: .lg, full: true))
                    }
                }
                .card(.completed)
            } else {
                VStack(alignment: .leading, spacing: Space.m) {
                    HStack {
                        Text("TODAY'S MISSION").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.brand300)
                        Spacer()
                        Badge("+\(p.today.xp) XP", tone: .brand, systemImage: "bolt.fill")
                    }
                    Text(p.today.missionTitle).font(.title2.weight(.heavy)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                    HStack(spacing: Space.l) {
                        Label("\(p.today.minutes) min", systemImage: "clock")
                        Label(p.today.difficulty, systemImage: "tag")
                    }
                    .font(.footnote).foregroundStyle(Theme.muted)
                    if p.tasksDone > 0 {
                        VStack(spacing: 6) {
                            HStack { Text("In progress"); Spacer(); Text("\(p.tasksDone) / \(p.today.tasks.count) tasks").monospacedDigit() }
                                .font(.caption.weight(.medium)).foregroundStyle(Theme.muted)
                            ProgressBar(value: Double(p.tasksDone) / Double(p.today.tasks.count), label: "Mission progress")
                        }
                    }
                    Spacer(minLength: 0)
                    Button { store.cover = .mission(p.currentDay) } label: {
                        Label(p.tasksDone > 0 ? "Continue Mission" : "Start Mission", systemImage: "arrow.right").labelStyle(TrailingIconLabel())
                    }
                    .buttonStyle(.fr(.primary, size: .lg, full: true))
                }
                .card(.hero)
            }
        }
    }
}

extension Array {
    subscript(safe i: Int) -> Element? { indices.contains(i) ? self[i] : nil }
}
