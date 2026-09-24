import SwiftUI

/// Full-screen mission flow (presented via `store.cover = .mission(day)`).
struct MissionView: View {
    let day: Int
    @Environment(AppStore.self) private var store

    var body: some View {
        Group {
            if let plan = MockData.day(store.s.pathId, day), day <= store.program.currentDay {
                MissionFlow(plan: plan)
            } else {
                MissionUnavailable()
            }
        }
        .background(Theme.bg.ignoresSafeArea())
    }
}

// MARK: Unavailable

private struct MissionUnavailable: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                MissionCloseButton()
                Spacer()
            }
            .padding(.horizontal, Space.gutter)
            Spacer()
            EmptyStateView(title: "This mission is still locked", message: "Finish today's mission first. Your plan unlocks one day at a time.", mood: .thinking) {
                Button("Back to Plan") { store.cover = nil }.buttonStyle(.fr(.primary))
            }
            .frame(maxWidth: 520)
            .padding(.horizontal, Space.gutter)
            Spacer()
        }
    }
}

private struct MissionCloseButton: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        Button { Haptics.tap(); store.cover = nil } label: {
            Image(systemName: "xmark")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(Theme.ink)
                .frame(width: 44, height: 44)
                .background(Circle().fill(Theme.surface))
                .overlay(Circle().strokeBorder(Theme.line))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Close mission")
    }
}

// MARK: Flow

private struct MissionFlow: View {
    let plan: DayPlan
    @Environment(AppStore.self) private var store
    @State private var celebrate = false
    @State private var noteFor: MissionTask?
    @State private var draft = ""
    @State private var confirmSkips = false

    private var alreadyDone: Bool { store.program.progress.completedDays.contains(plan.day) }
    private var readOnly: Bool { alreadyDone && !celebrate }
    private var doneCount: Int { plan.tasks.filter { store.s.tasks[$0.id] == .done }.count }
    private var skippedCount: Int { plan.tasks.filter { store.s.tasks[$0.id] == .skipped }.count }
    private var resolved: Int { doneCount + skippedCount }
    private var canComplete: Bool { resolved == plan.tasks.count && doneCount > 0 }

    var body: some View {
        ZStack {
            if celebrate {
                MissionCompleteView(plan: plan)
                    .transition(.opacity.combined(with: .scale(scale: 1.04)))
            } else {
                checklist.transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.35), value: celebrate)
        .sheet(item: $noteFor) { task in
            MissionNoteSheet(task: task, draft: $draft) { save(task) }
        }
        .confirmationDialog(skipTitle, isPresented: $confirmSkips, titleVisibility: .visible) {
            Button("Complete Mission") { finish() }
            Button("Keep Working", role: .cancel) {}
        } message: {
            Text("You'll still earn your XP and keep your streak. You can come back to skipped tasks any time from your plan.")
        }
    }

    private var skipTitle: String {
        "Complete with \(skippedCount) skipped task\(skippedCount == 1 ? "" : "s")?"
    }

    private var checklist: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                intro
                taskList
            }
            .frame(maxWidth: 680, alignment: .leading)
            .padding(.horizontal, Space.gutter)
            .padding(.bottom, Space.xl)
            .frame(maxWidth: .infinity)
        }
        .safeAreaInset(edge: .top, spacing: 0) { header }
        .safeAreaInset(edge: .bottom, spacing: 0) { footer }
        .background(Theme.bg.ignoresSafeArea())
    }

    // MARK: Header

    private var header: some View {
        VStack(spacing: Space.m) {
            ZStack {
                Text("DAY \(plan.day) MISSION").font(.eyebrow).tracking(1).foregroundStyle(Theme.faint)
                    .accessibilityAddTraits(.isHeader)
                HStack {
                    MissionCloseButton()
                    Spacer()
                    Badge("+\(plan.xp) XP", tone: .brand, systemImage: "bolt.fill")
                }
            }
            HStack(spacing: Space.m) {
                ProgressBar(value: Double(resolved) / Double(max(plan.tasks.count, 1)), tone: canComplete || alreadyDone ? .success : .brand, label: "Tasks completed")
                Text("\(doneCount) / \(plan.tasks.count) tasks completed")
                    .font(.footnote.weight(.semibold)).monospacedDigit()
                    .foregroundStyle(Theme.muted)
                    .contentTransition(.numericText())
                    .fixedSize()
            }
        }
        .padding(.horizontal, Space.gutter)
        .padding(.top, Space.xs)
        .padding(.bottom, Space.m)
        .frame(maxWidth: 680)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
        .background(Theme.bg.opacity(0.7))
        .overlay(alignment: .bottom) { Divider().overlay(Theme.line) }
    }

    private var intro: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            Text(plan.theme).font(.title1).foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
            Text(plan.missionTitle).font(.callout).foregroundStyle(Theme.muted).lineSpacing(2)
                .fixedSize(horizontal: false, vertical: true)
            if readOnly {
                Label("You completed this mission. Here's what you did.", systemImage: "checkmark.seal.fill")
                    .font(.subheadline.weight(.medium)).foregroundStyle(Theme.success)
                    .padding(.horizontal, Space.l).padding(.vertical, Space.m)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).fill(Theme.success.opacity(0.08)))
                    .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(Theme.success.opacity(0.25)))
                    .padding(.top, Space.s)
            }
        }
        .padding(.top, Space.l)
    }

    private var taskList: some View {
        VStack(spacing: Space.m) {
            ForEach(Array(plan.tasks.enumerated()), id: \.element.id) { i, task in
                MissionTaskCard(
                    task: task,
                    index: i,
                    state: store.s.tasks[task.id],
                    note: store.s.taskNotes[task.id],
                    readOnly: readOnly,
                    onToggle: { toggle(task) },
                    onSkip: { skip(task) },
                    onNote: { openNote(task) },
                    onResource: { openResource($0) }
                )
                .fadeUp(i)
            }
        }
        .padding(.top, Space.xl)
    }

    // MARK: Footer

    private var footer: some View {
        BottomBar {
            if readOnly {
                Button { goToLesson() } label: { Label("Go to Lesson", systemImage: "play.fill") }
                    .buttonStyle(.fr(.primary, size: .lg, full: true))
            } else {
                if !canComplete {
                    Text(helperText)
                        .font(.footnote).foregroundStyle(Theme.faint)
                        .multilineTextAlignment(.center)
                        .contentTransition(.numericText())
                }
                Button { attemptFinish() } label: { Label("Complete Mission", systemImage: "checkmark.seal.fill") }
                    .buttonStyle(.fr(.primary, size: .lg, full: true))
                    .disabled(!canComplete)
            }
        }
    }

    private var helperText: String {
        let left = plan.tasks.count - resolved
        if doneCount == 0 && left == 0 { return "Complete at least one task — skipping everything does not count." }
        return "\(left) task\(left == 1 ? "" : "s") left. Check them off or skip."
    }

    // MARK: Actions

    private func toggle(_ task: MissionTask) {
        let current = store.s.tasks[task.id]
        if current == .done { Haptics.select() } else { Haptics.soft() }
        withAnimation(.bouncy) { store.setTask(task.id, current == .done ? nil : .done) }
    }

    private func skip(_ task: MissionTask) {
        Haptics.select()
        let current = store.s.tasks[task.id]
        withAnimation(.snappy) { store.setTask(task.id, current == .skipped ? nil : .skipped) }
    }

    private func openNote(_ task: MissionTask) {
        draft = store.s.taskNotes[task.id] ?? ""
        noteFor = task
    }

    private func save(_ task: MissionTask) {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        let had = store.s.taskNotes[task.id] != nil
        withAnimation(.snappy) { store.setTaskNote(task.id, text) }
        if !text.isEmpty { store.showToast("Note saved") } else if had { store.showToast("Note removed", .info) }
    }

    private func openResource(_ id: String) {
        store.cover = nil
        let tab = store.tab
        let s = store
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(400))
            s.push(.resource(id), on: tab)
        }
    }

    private func goToLesson() {
        store.cover = nil
        let s = store
        let lessonId = plan.lessonId
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(400))
            s.push(.lesson(lessonId), on: s.tab)
        }
    }

    private func attemptFinish() {
        if skippedCount > 0 { confirmSkips = true } else { finish() }
    }

    private func finish() {
        store.completeMission(day: plan.day)
        withAnimation(.easeInOut(duration: 0.35)) { celebrate = true }
    }
}

// MARK: Task card

private struct MissionTaskCard: View {
    let task: MissionTask
    let index: Int
    let state: TaskState?
    let note: String?
    let readOnly: Bool
    let onToggle: () -> Void
    let onSkip: () -> Void
    let onNote: () -> Void
    let onResource: (String) -> Void

    var body: some View {
        HStack(alignment: .top, spacing: Space.m) {
            MissionCheckbox(state: state, title: task.title, readOnly: readOnly, action: onToggle)
                .padding(.top, -8)
                .padding(.leading, -6)
            VStack(alignment: .leading, spacing: 4) {
                Text("TASK \(index + 1)").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.faint)
                Text(task.title)
                    .font(.body.weight(.semibold))
                    .foregroundStyle(state == nil ? Theme.ink : Theme.muted)
                    .strikethrough(state != nil, color: Theme.lineStrong)
                    .fixedSize(horizontal: false, vertical: true)
                Text(task.description)
                    .font(.subheadline).foregroundStyle(Theme.muted).lineSpacing(2)
                    .fixedSize(horizontal: false, vertical: true)
                extras
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(Space.l)
        .background(background)
        .overlay(border)
        .opacity(state == .skipped ? 0.7 : 1)
        .animation(.snappy, value: state)
        .contentShape(.contextMenuPreview, RoundedRectangle(cornerRadius: Radius.lg, style: .continuous))
        .contextMenu { if !readOnly { menu } }
    }

    @ViewBuilder private var extras: some View {
        if let resource = MockData.resource(task.resourceId) {
            Button { Haptics.tap(); onResource(resource.id) } label: {
                Label(resource.title, systemImage: ResourceIcon.name(resource.type))
                    .font(.footnote.weight(.semibold)).foregroundStyle(Theme.brand300).lineLimit(1)
                    .padding(.horizontal, Space.m).frame(minHeight: 36)
                    .background(Capsule().fill(Theme.brand500.opacity(0.1)))
                    .overlay(Capsule().strokeBorder(Theme.brand500.opacity(0.25)))
            }
            .buttonStyle(.pressable)
            .padding(.top, Space.s)
            .accessibilityHint("Opens the resource")
        }
        if let note, !note.isEmpty {
            Text(note)
                .font(.footnote).foregroundStyle(Theme.inkSoft).lineSpacing(2)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, Space.m).padding(.vertical, Space.s)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous).fill(Theme.surface2))
                .overlay(alignment: .leading) { Capsule().fill(Theme.brand400).frame(width: 3).padding(.vertical, 4) }
                .padding(.top, Space.s)
                .accessibilityLabel("Note: \(note)")
        }
        if !readOnly { actions }
    }

    private var actions: some View {
        HStack(spacing: 4) {
            Button { Haptics.tap(); onNote() } label: {
                Label(note == nil ? "Add note" : "Edit note", systemImage: "square.and.pencil")
            }
            .buttonStyle(.fr(.ghost, size: .sm))
            if state != .done {
                Button { onSkip() } label: {
                    Label(state == .skipped ? "Undo skip" : "Skip", systemImage: state == .skipped ? "arrow.uturn.backward" : "forward")
                }
                .buttonStyle(.fr(.ghost, size: .sm))
            }
        }
        .padding(.leading, -14)
        .padding(.top, 2)
    }

    @ViewBuilder private var menu: some View {
        Button { onToggle() } label: {
            Label(state == .done ? "Mark as Not Done" : "Complete", systemImage: state == .done ? "circle" : "checkmark.circle")
        }
        if state != .done {
            Button { onSkip() } label: {
                Label(state == .skipped ? "Undo Skip" : "Skip", systemImage: state == .skipped ? "arrow.uturn.backward" : "forward")
            }
        }
        Button { onNote() } label: { Label(note == nil ? "Add Note" : "Edit Note", systemImage: "square.and.pencil") }
    }

    private var background: some View {
        let shape = RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
        return Group {
            switch state {
            case .done: shape.fill(Theme.success.opacity(0.06))
            case .skipped: shape.fill(Theme.bgRaised)
            case nil: shape.fill(Theme.surface)
            }
        }
    }

    private var border: some View {
        RoundedRectangle(cornerRadius: Radius.lg, style: .continuous)
            .strokeBorder(state == .done ? Theme.success.opacity(0.25) : Theme.line)
    }
}

/// Big round checkbox with a 44pt hit area and a springy checkmark.
private struct MissionCheckbox: View {
    let state: TaskState?
    let title: String
    let readOnly: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Circle()
                    .fill(state == .done ? Theme.success : .clear)
                Circle()
                    .strokeBorder(state == .done ? Theme.success : Theme.lineStrong, lineWidth: 2)
                if state == .done {
                    Image(systemName: "checkmark")
                        .font(.system(size: 14, weight: .heavy)).foregroundStyle(.black)
                        .transition(.scale(scale: 0.2).combined(with: .opacity))
                } else if state == .skipped {
                    Image(systemName: "minus")
                        .font(.system(size: 13, weight: .heavy)).foregroundStyle(Theme.faint)
                        .transition(.opacity)
                }
            }
            .frame(width: 30, height: 30)
            .scaleEffect(state == .done ? 1.0 : 0.96)
            .frame(width: 44, height: 44)
            .contentShape(Circle())
        }
        .buttonStyle(MissionCheckboxStyle())
        .disabled(readOnly)
        .animation(.bouncy, value: state)
        .accessibilityLabel(state == .skipped ? "\(title) (skipped)" : title)
        .accessibilityValue(state == .done ? "Checked" : "Unchecked")
        .accessibilityAddTraits(.isToggle)
    }
}

private struct MissionCheckboxStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.86 : 1)
            .animation(.snappy, value: configuration.isPressed)
    }
}

// MARK: Note sheet

private struct MissionNoteSheet: View {
    let task: MissionTask
    @Binding var draft: String
    let onSave: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Space.l) {
                    Text(task.title).font(.subheadline).foregroundStyle(Theme.muted)
                        .fixedSize(horizontal: false, vertical: true)
                    FRTextArea(label: "What did you find, learn or decide?", text: $draft, placeholder: "e.g. Found 4 podcasters in the fitness niche with no clips channel.")
                    Button("Save Note") { saveAndClose() }
                        .buttonStyle(.fr(.primary, size: .lg, full: true))
                }
                .padding(Space.gutter)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Theme.bgSunken.ignoresSafeArea())
            .navigationTitle("Task note")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Save") { saveAndClose() }.fontWeight(.semibold) }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .presentationBackground(Theme.bgSunken)
    }

    private func saveAndClose() {
        onSave()
        dismiss()
    }
}
