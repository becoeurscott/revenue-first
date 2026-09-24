import SwiftUI

/// One day of the program: theme, goal, checklist preview, lesson and the mission CTA.
struct DayDetailView: View {
    let day: Int
    @Environment(AppStore.self) private var store

    var body: some View {
        if let plan = MockData.day(store.s.pathId, day) {
            DayDetailContent(plan: plan)
        } else {
            Screen(title: "Day not found") {
                EmptyStateView(title: "That day isn't in your plan", message: "Your program runs from Day 1 to Day 30.", mood: .sad) {
                    Button("Back to Plan") { store.popToRoot(); store.tab = .plan }
                        .buttonStyle(.fr(.primary))
                }
            }
        }
    }
}

private struct DayDetailContent: View {
    let plan: DayPlan
    @Environment(AppStore.self) private var store

    private var status: DayStatus { store.dayStatus(plan.day) }

    var body: some View {
        Screen(title: "Day \(plan.day)") {
            Adaptive2Col {
                header.fadeUp(0)
                stats.fadeUp(1)
                goal.fadeUp(2)
                checklist.fadeUp(3)
            } trailing: {
                lessonSection.fadeUp(4)
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) { BottomBar { cta } }
    }

    // MARK: Sections

    private var header: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            FlowLayout(spacing: 8) {
                Badge("Week \(plan.week) · \(store.program.path.weeks[safe: plan.week - 1]?.title ?? "")", tone: .brand)
                statusBadge
            }
            Text("DAY \(plan.day)").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.faint).padding(.top, Space.s)
            Text(plan.theme).font(.title1).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
            Text(plan.missionTitle).font(.body).foregroundStyle(Theme.muted).lineSpacing(2)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    @ViewBuilder private var statusBadge: some View {
        switch status {
        case .completed: Badge("Completed", tone: .success, systemImage: "checkmark")
        case .inProgress: Badge("In progress", tone: .warning)
        case .locked: Badge("Locked", systemImage: "lock.fill")
        case .today: Badge("Today", tone: .brand, systemImage: "sparkles")
        }
    }

    private var stats: some View {
        HStack(spacing: 10) {
            DayStatTile(icon: "clock", value: "\(plan.minutes) min", label: "Duration")
            DayStatTile(icon: "tag", value: plan.difficulty, label: "Difficulty")
            DayStatTile(icon: "bolt.fill", value: "+\(plan.xp) XP", label: "Reward")
        }
    }

    private var goal: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("TODAY'S GOAL", systemImage: "target")
                .font(.footnote.weight(.bold)).tracking(0.6).foregroundStyle(Theme.brand300)
            Text(plan.goal).font(.title3.weight(.bold)).foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
        }
        .card(.hero)
        .accessibilityElement(children: .combine)
    }

    private var checklist: some View {
        let resolved = plan.tasks.filter { store.s.tasks[$0.id] != nil }.count
        return VStack(alignment: .leading, spacing: Space.s) {
            SectionHeader(title: "Checklist · \(resolved)/\(plan.tasks.count)")
            VStack(spacing: 0) {
                ForEach(Array(plan.tasks.enumerated()), id: \.element.id) { i, task in
                    DayChecklistRow(task: task, state: store.s.tasks[task.id])
                    if i < plan.tasks.count - 1 { Divider().overlay(Theme.line).padding(.leading, 52) }
                }
            }
            .card(padding: 0)
        }
    }

    @ViewBuilder private var lessonSection: some View {
        if let lesson = MockData.lesson(plan.lessonId) {
            VStack(alignment: .leading, spacing: Space.s) {
                SectionHeader(title: "Today's lesson")
                LessonCard(lesson: lesson)
                if status != .completed {
                    Label("Unlocks when you complete this mission", systemImage: "lock.fill")
                        .font(.caption).foregroundStyle(Theme.faint).padding(.horizontal, 4)
                }
            }
        }
    }

    // MARK: CTA

    @ViewBuilder private var cta: some View {
        if status == .locked {
            lockedCTA
        } else {
            Button { Haptics.tap(); store.cover = .mission(plan.day) } label: {
                Label(ctaTitle, systemImage: "arrow.right").labelStyle(TrailingIconLabel())
            }
            .buttonStyle(.fr(status == .completed ? .secondary : .primary, size: .lg, full: true))
        }
    }

    private var lockedCTA: some View {
        let current = store.program.currentDay
        return HStack(spacing: Space.m) {
            Image(systemName: "lock.fill").font(.system(size: 17, weight: .semibold)).foregroundStyle(Theme.faint)
            Text("Complete Day \(current) to move forward. One day at a time.")
                .font(.footnote).foregroundStyle(Theme.muted)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
            Button("Go to Day \(current)") { Haptics.tap(); store.push(.day(current)) }
                .buttonStyle(.fr(.secondary, size: .sm))
                .fixedSize()
        }
        .card(.locked, padding: Space.m)
    }

    private var ctaTitle: String {
        switch status {
        case .completed: "Review Mission"
        case .inProgress: "Continue Mission"
        default: "Start Mission"
        }
    }
}

private struct DayStatTile: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Image(systemName: icon).font(.system(size: 14, weight: .semibold)).foregroundStyle(Theme.brand300)
                .padding(.bottom, 4)
            Text(value).font(.subheadline.weight(.bold)).foregroundStyle(Theme.ink)
                .lineLimit(1).minimumScaleFactor(0.75)
            Text(label).font(.caption).foregroundStyle(Theme.faint).lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Space.m)
        .background(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).fill(Theme.surface))
        .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(Theme.line))
        .accessibilityElement(children: .combine)
    }
}

private struct DayChecklistRow: View {
    let task: MissionTask
    let state: TaskState?

    var body: some View {
        HStack(spacing: Space.m) {
            box
            Text(task.title)
                .font(.subheadline)
                .foregroundStyle(state == nil ? Theme.inkSoft : Theme.muted)
                .strikethrough(state != nil, color: Theme.lineStrong)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, Space.l)
        .padding(.vertical, 14)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(task.title), \(stateText)")
    }

    private var box: some View {
        let shape = RoundedRectangle(cornerRadius: 7, style: .continuous)
        return ZStack {
            switch state {
            case .done:
                shape.fill(Theme.success)
                Image(systemName: "checkmark").font(.system(size: 12, weight: .heavy)).foregroundStyle(.black)
            case .skipped:
                shape.fill(Theme.surface3).overlay(shape.strokeBorder(Theme.lineStrong))
                Image(systemName: "minus").font(.system(size: 12, weight: .heavy)).foregroundStyle(Theme.faint)
            case nil:
                shape.strokeBorder(Theme.lineStrong, lineWidth: 1.5)
            }
        }
        .frame(width: 24, height: 24)
    }

    private var stateText: String {
        switch state {
        case .done: "done"
        case .skipped: "skipped"
        case nil: "not started"
        }
    }
}
