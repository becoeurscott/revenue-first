import SwiftUI

/// Lesson player + notes. Curriculum lessons stay locked until their day's mission is done.
struct LessonDetailView: View {
    let id: String
    @Environment(AppStore.self) private var store

    var body: some View {
        if let lesson = MockData.lesson(id) {
            LessonDetailContent(lesson: lesson)
        } else {
            Screen(title: "Lesson") {
                EmptyStateView(title: "Lesson not found", message: "It may have moved. Browse the library to find what you need.", mood: .sad) {
                    Button("Open Library") { store.push(.lessons) }.buttonStyle(.fr(.primary))
                }
            }
        }
    }
}

private struct LessonDetailContent: View {
    let lesson: Lesson
    @Environment(AppStore.self) private var store
    @State private var watched = 0.0

    private var locked: Bool { store.isLessonLocked(lesson) }
    private var done: Bool { store.s.completedLessons.contains(lesson.id) }
    private var saved: Bool { store.s.savedLessons.contains(lesson.id) }
    private var day: Int? { MockData.lessonDay(lesson, path: store.s.pathId) }

    private var linked: [Resource] { lesson.resourceIds.compactMap { MockData.resource($0) } }
    private var templates: [Resource] { linked.filter { $0.type == "Template" || $0.type == "Script" } }
    private var others: [Resource] { linked.filter { $0.type != "Template" && $0.type != "Script" } }

    private var upNext: Lesson? {
        let pool = MockData.lessons(for: store.s.pathId)
        guard let i = pool.firstIndex(where: { $0.id == lesson.id }) else { return nil }
        return pool[safe: i + 1]
    }

    var body: some View {
        Screen(title: "Lesson") {
            Adaptive2Col {
                player
                meta
                learnSection
                takeawaysSection
            } trailing: {
                resourceSections
                upNextSection
            }
        }
        .toolbar { ToolbarItem(placement: .topBarTrailing) { bookmark } }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if !locked { BottomBar { cta } }
        }
        .onAppear { if !locked { store.touchLesson(lesson.id) } }
    }

    // MARK: Toolbar

    private var bookmark: some View {
        Button {
            Haptics.tap()
            let was = saved
            store.toggleSavedLesson(lesson.id)
            store.showToast(was ? "Removed from saved" : "Saved for later", was ? .info : .success)
        } label: {
            Image(systemName: saved ? "bookmark.fill" : "bookmark")
                .foregroundStyle(saved ? Theme.brand300 : Theme.ink)
                .contentTransition(.symbolEffect(.replace))
        }
        .accessibilityLabel(saved ? "Remove from saved" : "Save lesson")
    }

    // MARK: Player

    @ViewBuilder private var player: some View {
        if locked {
            lockedPlayer
        } else {
            VideoPlayerMock(
                lesson: lesson,
                onProgress: { f in if f > watched { watched = f } },
                onEnded: { store.showToast("Lesson finished — mark it complete to earn XP", .info) }
            )
            .id(lesson.id)
        }
    }

    private var lockedPlayer: some View {
        let shape = RoundedRectangle(cornerRadius: Radius.xl, style: .continuous)
        return ZStack {
            Color.clear.aspectRatio(16 / 9, contentMode: .fit)
            VStack(spacing: Space.s) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 22, weight: .semibold)).foregroundStyle(Theme.muted)
                    .frame(width: 56, height: 56)
                    .background(Circle().fill(Theme.surface3))
                Text("Complete Day \(day ?? 1) to unlock").font(.headline).foregroundStyle(Theme.ink)
                Text("Lessons follow action here. Do the mission first, then learn how to do it better.")
                    .font(.footnote).foregroundStyle(Theme.muted)
                    .multilineTextAlignment(.center).frame(maxWidth: 300)
                lockedAction.padding(.top, Space.xs)
            }
            .padding(Space.l)
        }
        .frame(maxWidth: .infinity)
        .background(shape.fill(Theme.bgRaised))
        .overlay(shape.strokeBorder(Theme.lineStrong, style: StrokeStyle(lineWidth: 1, dash: [6, 5])))
    }

    @ViewBuilder private var lockedAction: some View {
        if let day {
            if day <= store.program.currentDay {
                Button { Haptics.tap(); store.cover = .mission(day) } label: {
                    Label("Go to Mission", systemImage: "arrow.right").labelStyle(TrailingIconLabel())
                }
                .buttonStyle(.fr(.primary, size: .sm))
            } else {
                Button { Haptics.tap(); store.push(.day(day)) } label: {
                    Label("View Day \(day)", systemImage: "calendar")
                }
                .buttonStyle(.fr(.secondary, size: .sm))
            }
        }
    }

    // MARK: Content

    private var meta: some View {
        VStack(alignment: .leading, spacing: Space.m) {
            FlowLayout(spacing: 8) {
                Badge(lesson.category, tone: .brand)
                if let day { Badge("Day \(day)") }
                if done { Badge("Completed", tone: .success, systemImage: "checkmark") }
            }
            Text(lesson.title).font(.title1).foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
            instructorRow
            Text(lesson.summary).font(.callout).foregroundStyle(Theme.muted).lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)
            if !locked && !done { progress.padding(.top, Space.xs) }
        }
    }

    private var instructorRow: some View {
        HStack(spacing: 10) {
            AvatarView(name: lesson.instructor, size: 28)
            Text(lesson.instructor)
            Text("·").accessibilityHidden(true)
            Text(lesson.duration).monospacedDigit()
        }
        .font(.footnote).foregroundStyle(Theme.muted)
        .accessibilityElement(children: .combine)
    }

    private var progress: some View {
        VStack(spacing: 6) {
            HStack {
                Text("Your progress")
                Spacer()
                Text("\(Int((watched * 100).rounded()))%").monospacedDigit().contentTransition(.numericText())
            }
            .font(.caption.weight(.medium)).foregroundStyle(Theme.muted)
            ProgressBar(value: watched, label: "Lesson progress")
        }
    }

    private var learnSection: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            SectionHeader(title: "What you'll learn")
            VStack(alignment: .leading, spacing: Space.m) {
                ForEach(lesson.learn, id: \.self) { item in
                    HStack(alignment: .top, spacing: Space.m) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 10, weight: .heavy)).foregroundStyle(Theme.brand300)
                            .frame(width: 22, height: 22)
                            .background(Circle().fill(Theme.brand500.opacity(0.15)))
                        Text(item).font(.subheadline).foregroundStyle(Theme.inkSoft)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .accessibilityElement(children: .combine)
                }
            }
            .card()
        }
    }

    private var takeawaysSection: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            SectionHeader(title: "Key Takeaways")
            VStack(spacing: 10) {
                ForEach(lesson.takeaways, id: \.self) { t in
                    HStack(alignment: .top, spacing: Space.m) {
                        Image(systemName: "lightbulb.fill").font(.subheadline).foregroundStyle(Theme.warning)
                        Text(t).font(.subheadline).foregroundStyle(Theme.inkSoft).lineSpacing(2)
                            .fixedSize(horizontal: false, vertical: true)
                        Spacer(minLength: 0)
                    }
                    .card(padding: Space.l)
                    .accessibilityElement(children: .combine)
                }
            }
        }
    }

    @ViewBuilder private var resourceSections: some View {
        if !others.isEmpty {
            VStack(alignment: .leading, spacing: Space.s) {
                SectionHeader(title: "Resources", action: "All") { store.push(.resources) }
                VStack(spacing: 10) { ForEach(others) { ResourceCard(resource: $0) } }
            }
        }
        if !templates.isEmpty {
            VStack(alignment: .leading, spacing: Space.s) {
                SectionHeader(title: "Templates", action: "All") { store.push(.outreach(.templates)) }
                VStack(spacing: 10) { ForEach(templates) { ResourceCard(resource: $0) } }
            }
        }
    }

    @ViewBuilder private var upNextSection: some View {
        if let next = upNext {
            VStack(alignment: .leading, spacing: Space.s) {
                SectionHeader(title: "Up next")
                LessonCard(lesson: next, row: true)
            }
        }
    }

    // MARK: CTA

    @ViewBuilder private var cta: some View {
        if done {
            Button {
                Haptics.tap()
                store.popToRoot()
                store.tab = .home
            } label: {
                Label("Back to Today", systemImage: "arrow.right").labelStyle(TrailingIconLabel())
            }
            .buttonStyle(.fr(.secondary, size: .lg, full: true))
        } else {
            Button {
                withAnimation(.snappy) { store.completeLesson(lesson.id) }
                store.showToast("Lesson complete · +25 XP")
            } label: {
                Label("Mark Lesson Complete", systemImage: "checkmark.circle.fill")
            }
            .buttonStyle(.fr(.primary, size: .lg, full: true))
        }
    }
}
