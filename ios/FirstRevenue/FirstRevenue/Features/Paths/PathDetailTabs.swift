import SwiftUI

// Tab panels of PathDetailView.

// MARK: - 30-Day plan

struct PathPlanTabView: View {
    let path: PathInfo
    let active: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            if !active {
                Label("Preview only. Switch to this path to open its daily missions.", systemImage: "eye")
                    .font(.footnote).foregroundStyle(Theme.muted)
                    .card(padding: Space.m + 2)
            }
            LazyVGrid(columns: adaptiveColumns(min: 320, spacing: Space.l), alignment: .leading, spacing: Space.l) {
                ForEach(Array(path.weeks.enumerated()), id: \.element.week) { i, week in
                    PathWeekCard(path: path, week: week, active: active).fadeUp(i)
                }
            }
        }
    }
}

private enum PathDayState { case completed, current, locked, preview }

private struct PathWeekCard: View {
    let path: PathInfo
    let week: PathWeek
    let active: Bool
    @Environment(AppStore.self) private var store

    private var progress: PathProgress { store.s.progress[path.id] ?? PathProgress() }
    private var days: [DayPlan] { MockData.plan(path.id).filter { $0.week == week.week } }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header.padding(Space.l)
            Divider().overlay(Theme.line)
            ForEach(Array(days.enumerated()), id: \.element.day) { i, d in
                row(d)
                if i < days.count - 1 { Divider().overlay(Theme.line).padding(.leading, 64) }
            }
        }
        .card(padding: 0)
        .clipShape(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous))
    }

    private var header: some View {
        let done = days.filter { progress.completedDays.contains($0.day) }.count
        return VStack(alignment: .leading, spacing: Space.s) {
            HStack {
                Text("WEEK \(week.week)").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.brand300)
                Spacer()
                if active { Badge("\(done)/\(days.count) days", tone: done == days.count && !days.isEmpty ? .success : .neutral) }
            }
            Text(week.title).font(.headline.weight(.bold)).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
            FlowLayout(spacing: 6) {
                ForEach(week.focus, id: \.self) { f in
                    Text(f).font(.caption.weight(.medium)).foregroundStyle(Theme.muted)
                        .padding(.horizontal, 10).padding(.vertical, 5)
                        .background(Capsule().fill(Theme.surface2)).overlay(Capsule().strokeBorder(Theme.line))
                }
            }
            .padding(.top, 2)
        }
    }

    private func state(_ d: DayPlan) -> PathDayState {
        guard active else { return .preview }
        if progress.completedDays.contains(d.day) { return .completed }
        if d.day == progress.currentDay { return .current }
        return d.day > progress.currentDay ? .locked : .preview
    }

    @ViewBuilder private func row(_ d: DayPlan) -> some View {
        let s = state(d)
        if active {
            Button { Haptics.tap(); store.push(.day(d.day)) } label: { PathDayRow(day: d, state: s) }
                .buttonStyle(.pressable)
        } else {
            PathDayRow(day: d, state: s)
        }
    }
}

private struct PathDayRow: View {
    let day: DayPlan
    let state: PathDayState

    var body: some View {
        HStack(spacing: Space.m) {
            number
            VStack(alignment: .leading, spacing: 2) {
                Text(day.theme).font(.subheadline.weight(.semibold)).foregroundStyle(state == .locked ? Theme.muted : Theme.ink).lineLimit(1)
                HStack(spacing: 4) {
                    Image(systemName: "clock")
                    Text("\(day.minutes) min").monospacedDigit()
                    if state == .current { Text("· Today").fontWeight(.semibold).foregroundStyle(Theme.brand300) }
                }
                .font(.caption).foregroundStyle(Theme.faint)
            }
            Spacer(minLength: 4)
            trailing
        }
        .padding(.horizontal, Space.l)
        .padding(.vertical, 8)
        .frame(minHeight: 56)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Day \(day.day), \(day.theme), \(day.minutes) minutes\(stateLabel)")
    }

    private var stateLabel: String {
        switch state {
        case .completed: ", completed"
        case .current: ", today"
        case .locked: ", locked"
        case .preview: ""
        }
    }

    private var number: some View {
        Text("\(day.day)")
            .font(.footnote.weight(.bold)).monospacedDigit()
            .foregroundStyle(state == .completed ? Theme.success : state == .current ? .white : Theme.muted)
            .frame(width: 36, height: 36)
            .background {
                switch state {
                case .completed: Circle().fill(Theme.success.opacity(0.12))
                case .current: Circle().fill(Theme.brandGradient).shadow(color: Theme.brand600.opacity(0.5), radius: 8)
                default: Circle().fill(Theme.surface3)
                }
            }
    }

    @ViewBuilder private var trailing: some View {
        switch state {
        case .completed: Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.success)
        case .locked: Image(systemName: "lock.fill").font(.footnote).foregroundStyle(Theme.faint)
        case .current: Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Theme.brand300)
        case .preview: EmptyView()
        }
    }
}

// MARK: - Skills & tools

struct PathSkillsTab: View {
    let path: PathInfo

    var body: some View {
        LazyVGrid(columns: adaptiveColumns(min: 300), alignment: .leading, spacing: Space.m) {
            ForEach(Array(path.skills.enumerated()), id: \.offset) { i, skill in
                card(i, skill).fadeUp(i)
            }
        }
    }

    private func week(for i: Int) -> PathWeek? {
        guard !path.weeks.isEmpty, !path.skills.isEmpty else { return nil }
        let idx = min(path.weeks.count - 1, (i * path.weeks.count) / path.skills.count)
        return path.weeks[idx]
    }

    private func card(_ i: Int, _ skill: String) -> some View {
        HStack(alignment: .top, spacing: Space.m) {
            Text("\(i + 1)").font(.subheadline.weight(.bold)).monospacedDigit().foregroundStyle(.white)
                .frame(width: 36, height: 36).background(Circle().fill(Theme.brandGradient))
            VStack(alignment: .leading, spacing: 3) {
                Text(skill).font(.body.weight(.semibold)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                if let w = week(for: i) {
                    Text("Practised from Week \(w.week) · \(w.title)").font(.footnote).foregroundStyle(Theme.faint).fixedSize(horizontal: false, vertical: true)
                }
            }
            Spacer(minLength: 0)
        }
        .card(padding: Space.l)
        .accessibilityElement(children: .combine)
    }
}

struct PathToolsTab: View {
    let path: PathInfo

    var body: some View {
        LazyVGrid(columns: adaptiveColumns(min: 300), alignment: .leading, spacing: Space.m) {
            ForEach(Array(path.tools.enumerated()), id: \.element.name) { i, tool in
                card(tool).fadeUp(i)
            }
        }
    }

    private func card(_ tool: PathTool) -> some View {
        HStack(alignment: .top, spacing: Space.m) {
            Image(systemName: "wrench.and.screwdriver").font(.system(size: 17, weight: .semibold)).foregroundStyle(Theme.brand300)
                .frame(width: 44, height: 44)
                .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.brand500.opacity(0.12)))
            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .firstTextBaseline) {
                    Text(tool.name).font(.body.weight(.semibold)).foregroundStyle(Theme.ink).lineLimit(1)
                    Spacer(minLength: 6)
                    Badge(tool.cost, tone: tool.cost == "Free" ? .success : .neutral)
                }
                Text(tool.purpose).font(.footnote).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
            }
        }
        .card(padding: Space.l)
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Lessons & resources

struct PathLessonsTab: View {
    let pathId: PathID
    @Environment(AppStore.self) private var store

    private var lessons: [Lesson] { MockData.shared.lessons.filter { $0.path == pathId.rawValue } }

    var body: some View {
        if lessons.isEmpty {
            EmptyStateView(title: "No lessons yet", message: "Lessons for this path will appear here.", compact: true) {
                Button("Browse the library") { store.push(.lessons) }.buttonStyle(.fr(.primary))
            }
        } else {
            VStack(spacing: Space.l) {
                LazyVGrid(columns: adaptiveColumns(min: 160), alignment: .leading, spacing: Space.m) {
                    ForEach(Array(lessons.prefix(9).enumerated()), id: \.element.id) { i, l in
                        LessonCard(lesson: l).fadeUp(i)
                    }
                }
                Button { store.push(.lessons) } label: {
                    Label("See all lessons", systemImage: "arrow.right").labelStyle(TrailingIconLabel())
                }
                .buttonStyle(.fr(.secondary))
                .frame(maxWidth: .infinity)
            }
        }
    }
}

struct PathResourcesTab: View {
    let pathId: PathID
    @Environment(AppStore.self) private var store

    var body: some View {
        let items = MockData.resources(for: pathId)
        if items.isEmpty {
            EmptyStateView(title: "No resources yet", message: "Templates and tools for this path will appear here.", compact: true) {
                Button("Browse resources") { store.push(.resources) }.buttonStyle(.fr(.primary))
            }
        } else {
            LazyVGrid(columns: adaptiveColumns(min: 320), alignment: .leading, spacing: Space.m) {
                ForEach(Array(items.enumerated()), id: \.element.id) { i, r in
                    ResourceCard(resource: r).fadeUp(i)
                }
            }
        }
    }
}

// MARK: - Clients

struct PathClientsTab: View {
    let path: PathInfo
    let active: Bool
    @Environment(AppStore.self) private var store

    private var won: [Prospect] { store.s.prospects.filter { $0.path == path.id && $0.status == .won } }
    private var practice: [Prospect] { path.id == .gbp ? MockData.shared.prospects.filter { $0.path == .gbp && $0.gbp != nil } : [] }

    var body: some View {
        VStack(alignment: .leading, spacing: Space.xxl) {
            clients
            if !practice.isEmpty { practiceSection }
        }
    }

    @ViewBuilder private var clients: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            if won.isEmpty {
                SectionHeader(title: "Your clients")
                EmptyStateView(
                    title: "No clients yet",
                    message: active ? "Every client starts as a prospect. Add a few, reach out, and your first win shows up here." : "Clients you win on this path will show up here.",
                    mood: .focused,
                    compact: true
                ) {
                    Button("Go to prospects") { store.push(.outreach(.prospects)) }.buttonStyle(.fr(.primary))
                }
            } else {
                SectionHeader(title: "Your clients", action: "All prospects") { store.push(.outreach(.prospects)) }
                LazyVGrid(columns: adaptiveColumns(min: 300), alignment: .leading, spacing: Space.m) {
                    ForEach(won) { ProspectCard(prospect: $0) }
                }
            }
        }
    }

    private var practiceSection: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            SectionHeader(title: "Practice businesses")
            Text("Fictitious local businesses with pre-run audits. Use them to practise spotting problems and pitching a fix.")
                .font(.subheadline).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
                .padding(.bottom, Space.s)
            LazyVGrid(columns: adaptiveColumns(min: 280), alignment: .leading, spacing: Space.m) {
                ForEach(Array(practice.enumerated()), id: \.element.id) { i, p in
                    PathPracticeCard(business: p).fadeUp(i)
                }
            }
        }
    }
}

/// Audit-style card for a fictitious local business the user can practise on.
private struct PathPracticeCard: View {
    let business: Prospect
    @Environment(AppStore.self) private var store

    private var added: Bool { store.s.prospects.contains { $0.business == business.business } }

    var body: some View {
        if let audit = business.gbp {
            VStack(alignment: .leading, spacing: Space.m) {
                header(audit)
                problems(audit)
                Divider().overlay(Theme.line)
                footer(audit)
                action(audit)
            }
            .card(padding: Space.l)
        }
    }

    private func header(_ audit: GbpAudit) -> some View {
        HStack(alignment: .top, spacing: Space.m) {
            VStack(alignment: .leading, spacing: 3) {
                Text(business.business).font(.body.weight(.semibold)).foregroundStyle(Theme.ink).lineLimit(1)
                Label("\(audit.category) · \(audit.city)", systemImage: "mappin.and.ellipse")
                    .font(.footnote).foregroundStyle(Theme.muted).lineLimit(1)
            }
            Spacer(minLength: 6)
            VStack(alignment: .trailing, spacing: 2) {
                HStack(spacing: 3) {
                    Text(audit.rating, format: .number.precision(.fractionLength(1))).font(.body.weight(.bold)).monospacedDigit().foregroundStyle(Theme.ink)
                    Image(systemName: "star.fill").font(.caption).foregroundStyle(Theme.warning)
                }
                Text("\(audit.reviews) reviews").font(.caption).monospacedDigit().foregroundStyle(Theme.faint)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel(String(format: "%.1f stars, %d reviews", audit.rating, audit.reviews))
        }
    }

    private func problems(_ audit: GbpAudit) -> some View {
        VStack(alignment: .leading, spacing: Space.s) {
            PathEyebrow(text: "Problems found")
            FlowLayout(spacing: 6) {
                ForEach(Array(audit.problems.enumerated()), id: \.offset) { i, p in
                    Badge(p, tone: i < 2 ? .danger : .warning)
                }
            }
        }
    }

    private func footer(_ audit: GbpAudit) -> some View {
        HStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Suggested service").font(.caption).foregroundStyle(Theme.faint)
                Text(audit.service).font(.footnote.weight(.medium)).foregroundStyle(Theme.ink).lineLimit(1)
            }
            Spacer(minLength: 8)
            Text(money(business.value)).font(.title3.weight(.heavy)).monospacedDigit().foregroundStyle(Theme.ink)
        }
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder private func action(_ audit: GbpAudit) -> some View {
        if added {
            Label("Added", systemImage: "checkmark")
                .font(.subheadline.weight(.semibold)).foregroundStyle(Theme.success)
                .frame(maxWidth: .infinity, minHeight: 44)
                .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.success.opacity(0.12)))
                .accessibilityLabel("Added to your prospects")
        } else {
            Button { add(audit) } label: { Label("Add to prospects", systemImage: "plus") }
                .buttonStyle(.fr(.secondary, full: true))
        }
    }

    private func add(_ audit: GbpAudit) {
        let b = business
        withAnimation(.snappy) {
            store.addProspect(path: .gbp, name: b.name, business: b.business, platform: b.platform, audience: b.audience, handle: b.handle, about: b.about, value: b.value, gbp: audit)
        }
        store.showToast("\(b.business) added to your prospects")
    }
}
