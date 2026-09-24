import SwiftUI

/// Plan tab root: the 30-day program as a vertical timeline, grouped by week.
struct PlanView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.horizontalSizeClass) private var hSize
    @State private var didAutoScroll = false

    var body: some View {
        let program = store.program
        ScrollViewReader { proxy in
            Screen(title: "Your 30-Day Plan", subtitle: program.path.name, large: true) {
                VStack(alignment: .leading, spacing: Space.xl) {
                    PlanSummaryCard(program: program).fadeUp(0)
                    weeks(program)
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { Haptics.tap(); scrollToToday(proxy, animated: true) } label: {
                        Label("Today", systemImage: "scope").labelStyle(.titleAndIcon)
                    }
                    .accessibilityLabel("Scroll to today")
                }
            }
            .task {
                guard !didAutoScroll else { return }
                didAutoScroll = true
                try? await Task.sleep(for: .milliseconds(120))
                scrollToToday(proxy, animated: false)
            }
        }
    }

    private func scrollToToday(_ proxy: ScrollViewProxy, animated: Bool) {
        let target = PlanDayRow.anchor(store.program.currentDay)
        if animated {
            withAnimation(.snappy) { proxy.scrollTo(target, anchor: .center) }
        } else {
            proxy.scrollTo(target, anchor: .center)
        }
    }

    @ViewBuilder private func weeks(_ program: Program) -> some View {
        let sections = program.path.weeks
        if hSize == .regular {
            VStack(alignment: .leading, spacing: Space.xl) {
                ForEach(Array(stride(from: 0, to: sections.count, by: 2)), id: \.self) { i in
                    HStack(alignment: .top, spacing: Space.xl) {
                        PlanWeekSection(week: sections[i], program: program)
                        if let next = sections[safe: i + 1] {
                            PlanWeekSection(week: next, program: program)
                        } else {
                            Color.clear.frame(maxWidth: .infinity)
                        }
                    }
                }
            }
        } else {
            VStack(alignment: .leading, spacing: Space.xl) {
                ForEach(sections, id: \.week) { PlanWeekSection(week: $0, program: program) }
            }
        }
    }
}

// MARK: Summary

private struct PlanSummaryCard: View {
    let program: Program
    @Environment(AppStore.self) private var store

    var body: some View {
        let done = program.daysCompleted
        VStack(alignment: .leading, spacing: Space.m) {
            HStack(alignment: .lastTextBaseline) {
                dayLabel
                Spacer(minLength: Space.s)
                Text("\(done) completed · \(program.totalDays - done) to go")
                    .font(.footnote).monospacedDigit().foregroundStyle(Theme.muted)
            }
            ProgressBar(value: Double(done) / Double(program.totalDays), label: "Plan completion")
            if program.finished {
                Button { Haptics.tap(); store.cover = .complete } label: {
                    Label("View My 30-Day Results", systemImage: "arrow.right").labelStyle(TrailingIconLabel())
                }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
                .padding(.top, Space.xs)
            }
        }
        .card()
    }

    private var dayLabel: some View {
        (Text("Day \(program.currentDay)").font(.number(28)).foregroundStyle(Theme.ink)
         + Text(" / \(program.totalDays)").font(.body.weight(.semibold)).foregroundStyle(Theme.faint))
            .accessibilityLabel("Day \(program.currentDay) of \(program.totalDays)")
    }
}

// MARK: Week

private struct PlanWeekSection: View {
    let week: PathWeek
    let program: Program
    @Environment(AppStore.self) private var store

    var body: some View {
        let days = program.plan.filter { $0.week == week.week }
        let weekDone = days.filter { program.progress.completedDays.contains($0.day) }.count
        VStack(alignment: .leading, spacing: Space.m) {
            HStack(alignment: .firstTextBaseline) {
                Text("Week \(week.week) · \(week.title)")
                    .font(.section).foregroundStyle(Theme.ink)
                    .accessibilityAddTraits(.isHeader)
                Spacer(minLength: Space.s)
                Text("\(weekDone)/\(days.count)")
                    .font(.caption.weight(.semibold)).monospacedDigit()
                    .foregroundStyle(weekDone == days.count && !days.isEmpty ? Theme.success : Theme.faint)
                    .accessibilityLabel("\(weekDone) of \(days.count) days done")
            }
            .padding(.horizontal, 4)

            VStack(spacing: 0) {
                ForEach(Array(days.enumerated()), id: \.element.day) { i, d in
                    PlanDayRow(plan: d, status: store.dayStatus(d.day), last: i == days.count - 1)
                        .id(PlanDayRow.anchor(d.day))
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: Day row

private struct PlanDayRow: View {
    let plan: DayPlan
    let status: DayStatus
    let last: Bool
    @Environment(AppStore.self) private var store

    static func anchor(_ day: Int) -> String { "plan-day-\(day)" }

    private var active: Bool { status == .today || status == .inProgress }

    var body: some View {
        HStack(alignment: .top, spacing: Space.l) {
            rail
            Button { Haptics.tap(); store.push(.day(plan.day)) } label: { card }
                .buttonStyle(.pressable)
                .padding(.bottom, Space.m)
                .accessibilityLabel("Day \(plan.day): \(plan.theme), \(statusText)")
                .accessibilityHint("Opens the day")
                .contextMenu { menu }
        }
        .fixedSize(horizontal: false, vertical: true)
    }

    private var rail: some View {
        VStack(spacing: 0) {
            PlanDayNode(day: plan.day, status: status).padding(.top, 4)
            if !last {
                Capsule()
                    .fill(status == .completed ? Theme.success.opacity(0.3) : Theme.line)
                    .frame(width: 2)
                    .frame(maxHeight: .infinity)
                    .padding(.top, 4)
            }
        }
        .frame(width: 44)
    }

    private var card: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: Space.s) {
                Text("DAY \(plan.day)").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.faint)
                Spacer(minLength: 4)
                badge
            }
            HStack(spacing: Space.s) {
                Text(plan.theme).font(.headline).foregroundStyle(Theme.ink).lineLimit(1)
                Spacer(minLength: 4)
                Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Theme.faint)
            }
            if active || status == .completed, let title = MockData.lesson(plan.lessonId)?.title {
                Label(title, systemImage: "play.fill")
                    .font(.footnote).foregroundStyle(Theme.muted).lineLimit(1)
                    .labelStyle(PlanCompactLabel())
            }
            Text("\(plan.minutes) min · \(plan.difficulty) · +\(plan.xp) XP")
                .font(.caption).monospacedDigit().foregroundStyle(Theme.faint)
        }
        .card(active ? .selected : .plain, padding: Space.l)
        .opacity(status == .locked ? 0.6 : 1)
    }

    @ViewBuilder private var badge: some View {
        switch status {
        case .today: Badge("Today's mission", tone: .brand)
        case .inProgress: Badge("In progress", tone: .brand)
        case .completed: Badge("Completed", tone: .success)
        case .locked: EmptyView()
        }
    }

    @ViewBuilder private var menu: some View {
        Button { store.push(.day(plan.day)) } label: { Label("Open Day \(plan.day)", systemImage: "calendar") }
        if status != .locked {
            Button { store.cover = .mission(plan.day) } label: {
                Label(missionTitle, systemImage: status == .completed ? "checklist.checked" : "play.fill")
            }
        }
        if status == .completed {
            Button { store.push(.lesson(plan.lessonId)) } label: { Label("Watch Lesson", systemImage: "play.rectangle") }
        }
    }

    private var missionTitle: String {
        switch status {
        case .completed: "Review Mission"
        case .inProgress: "Continue Mission"
        default: "Start Mission"
        }
    }

    private var statusText: String {
        switch status {
        case .completed: "completed"
        case .today: "today's mission"
        case .inProgress: "in progress"
        case .locked: "locked"
        }
    }
}

/// Status node on the timeline rail. Active days get a soft pulsing ring.
private struct PlanDayNode: View {
    let day: Int
    let status: DayStatus
    @State private var pulse = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var active: Bool { status == .today || status == .inProgress }

    var body: some View {
        ZStack {
            if active {
                Circle()
                    .fill(Theme.brand500.opacity(0.35))
                    .scaleEffect(pulse ? 1.6 : 1)
                    .opacity(pulse ? 0 : 0.9)
            }
            Circle().fill(fill)
            Circle().strokeBorder(border)
            glyph
        }
        .frame(width: 44, height: 44)
        .shadow(color: active ? Theme.brand600.opacity(0.45) : .clear, radius: 10, y: 3)
        .accessibilityHidden(true)
        .onAppear {
            guard active, !reduceMotion else { return }
            withAnimation(.easeOut(duration: 2.2).repeatForever(autoreverses: false)) { pulse = true }
        }
    }

    private var fill: AnyShapeStyle {
        switch status {
        case .completed: AnyShapeStyle(Theme.success.opacity(0.15))
        case .today, .inProgress: AnyShapeStyle(Theme.brandGradient)
        case .locked: AnyShapeStyle(Theme.surface2)
        }
    }

    private var border: Color {
        switch status {
        case .completed: Theme.success.opacity(0.3)
        case .today, .inProgress: .clear
        case .locked: Theme.line
        }
    }

    @ViewBuilder private var glyph: some View {
        switch status {
        case .completed:
            Image(systemName: "checkmark").font(.system(size: 17, weight: .bold)).foregroundStyle(Theme.success)
        case .locked:
            Image(systemName: "lock.fill").font(.system(size: 14, weight: .semibold)).foregroundStyle(Theme.faint)
        case .today, .inProgress:
            Text("\(day)").font(.system(size: 15, weight: .bold, design: .rounded)).monospacedDigit().foregroundStyle(.white)
        }
    }
}

/// Small icon + text label with tight spacing (lesson line on day rows).
private struct PlanCompactLabel: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 6) {
            configuration.icon.font(.system(size: 9, weight: .bold))
            configuration.title
        }
    }
}
