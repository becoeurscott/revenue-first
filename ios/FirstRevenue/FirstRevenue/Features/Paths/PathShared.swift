import SwiftUI

// Shared building blocks for the Paths feature (PathsView + PathDetailView).

/// Premium-gated journey switching. A journey the user already has resumes after a confirm alert;
/// a new one first asks for its niche, stage and goal (never silently reusing another journey's).
struct PathSwitchModifier: ViewModifier {
    @Binding var target: EarningMethod?
    @Environment(AppStore.self) private var store

    func body(content: Content) -> some View {
        content
            .alert(title, isPresented: presented(enrolled: true), presenting: target) { id in
                Button("Switch journey") { confirm(id) }
                Button("Cancel", role: .cancel) { target = nil }
            } message: { _ in
                Text("Your progress on \(store.journey.shortLabel) is saved — days, streak and your numbers stay exactly where they are. You can switch back at any time.")
            }
            .sheet(isPresented: presented(enrolled: false)) {
                if let id = target, let config = Journeys.config(id) { JourneyAddSheet(config: config) { target = nil } }
            }
    }

    private var title: String { target.flatMap(Journeys.config).map { "Switch to \($0.shortLabel)?" } ?? "Switch journey?" }

    private func presented(enrolled: Bool) -> Binding<Bool> {
        Binding(get: { target.map { (store.s.journey?.enrollments[$0] != nil) == enrolled } ?? false }, set: { if !$0 { target = nil } })
    }

    private func confirm(_ id: EarningMethod) {
        target = nil
        store.switchJourney(id)
        Haptics.notify(.success)
        store.showToast("Switched to \(store.journey.shortLabel)")
        store.popToRoot()
        store.tab = .home
    }
}

extension View {
    func pathSwitchAlert(target: Binding<EarningMethod?>) -> some View { modifier(PathSwitchModifier(target: target)) }
}

@MainActor
enum PathSwitch {
    /// Call from a button: premium → sets `target` (confirm alert or setup sheet); free → paywall.
    static func request(_ id: EarningMethod, store: AppStore, target: Binding<EarningMethod?>) {
        guard id != store.journey.id, Journeys.config(id)?.isActive == true else { return }
        Haptics.tap()
        if store.isPremium { target.wrappedValue = id } else { store.paywallFeature = "Journey switching" }
    }
}

/// Sets up a journey the user hasn't tried: its own niche, starting stage and goal. Time, budget,
/// skills and equipment carry over from the current journey because they describe the person, not the method.
struct JourneyAddSheet: View {
    let config: JourneyConfig
    let onDone: () -> Void
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var niche = ""
    @State private var stage = StartingStage.idea.rawValue
    @State private var goal = ""
    @State private var touched = false

    private var stageOptions: [JourneyQuestionOption] { Journeys.catalog.onboarding.first { $0.key == "startingStage" }?.options ?? [] }
    private var nicheError: String? { touched && niche.trimmingCharacters(in: .whitespaces).count < 2 ? "Add the niche for this journey" : nil }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Space.l) {
                    Text(config.description).font(.subheadline).foregroundStyle(Theme.muted)
                    FRTextField(label: config.sellsServices ? "Who will you serve?" : "What will your channel be about?", text: $niche, placeholder: "e.g. beginner home workouts", systemImage: "scope", error: nicheError)
                    if !niche.isEmpty && NicheResolver.isTooBroad(niche) {
                        Label("That's broad. Add who it's for, e.g. “\(niche) for busy parents”.", systemImage: "lightbulb").font(.footnote).foregroundStyle(Theme.warning)
                    }
                    SelectRow(label: "Where are you starting from?", selection: Binding(get: { stageOptions.first { $0.value == stage }?.label ?? "" }, set: { l in stage = stageOptions.first { $0.label == l }?.value ?? stage }), options: stageOptions.map(\.label))
                    SelectRow(label: "First goal", selection: $goal, options: config.goalOptions.map(\.label))
                    Button("Start \(config.shortLabel)", action: save).buttonStyle(.fr(.primary, size: .lg, full: true))
                }
                .padding(Space.xl).frame(maxWidth: 620).frame(maxWidth: .infinity)
            }
            .navigationTitle(config.shortLabel)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss(); onDone() } } }
            .outreachSheetChrome()
        }
        .onAppear { if goal.isEmpty { goal = config.goalOptions.first?.label ?? "" } }
    }

    private func save() {
        touched = true
        guard nicheError == nil, !NicheResolver.isTooBroad(niche) else { Haptics.notify(.error); return }
        let current = store.enrollment?.answers ?? JourneyAnswers()
        var a = JourneyAnswers()
        a.earningMethod = config.id
        a.youtubeMode = config.id == .youtubeOwnedChannel ? "own_channel" : config.id == .youtubeServices ? "services" : ""
        a.niche = niche.trimmingCharacters(in: .whitespaces)
        a.startingStage = StartingStage(rawValue: stage)
        a.weeklyTime = current.weeklyTime
        a.budget = current.budget
        a.skills = current.skills
        a.equipment = current.equipment
        a.location = current.location
        a.goal = goal
        store.enroll(a)
        Haptics.notify(.success)
        store.showToast("\(config.shortLabel) started")
        dismiss()
        onDone()
        store.popToRoot()
    }
}

/// 1, 2, 3… list used for workflows and first tasks.
struct PathNumberedList: View {
    let items: [String]
    var body: some View {
        VStack(alignment: .leading, spacing: Space.m) {
            ForEach(Array(items.enumerated()), id: \.offset) { i, step in
                HStack(alignment: .firstTextBaseline, spacing: Space.m) {
                    Text("\(i + 1)")
                        .font(.caption.weight(.bold)).monospacedDigit()
                        .foregroundStyle(Theme.brand300)
                        .frame(width: 26, height: 26)
                        .background(Circle().fill(Theme.brand500.opacity(0.15)))
                        .alignmentGuide(.firstTextBaseline) { d in d[VerticalAlignment.center] + 5 }
                    Text(step).font(.subheadline).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
                }
                .accessibilityElement(children: .combine)
            }
        }
    }
}

/// Emoji tile painted with the path's hue.
struct PathEmojiTile: View {
    let path: PathInfo
    var size: CGFloat = 64
    var locked = false
    var body: some View {
        Image(systemName: path.icon)
            .font(.system(size: size * 0.4, weight: .semibold))
            .foregroundStyle(.white)
            .opacity(locked ? 0.5 : 1)
            .frame(width: size, height: size)
            .background(Theme.hueGradient(path.hue).saturation(locked ? 0 : 1))
            .clipShape(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(.white.opacity(0.15)))
            .overlay(alignment: .bottomTrailing) {
                if locked {
                    Image(systemName: "lock.fill").font(.system(size: 10, weight: .bold)).foregroundStyle(Theme.ink)
                        .frame(width: 24, height: 24)
                        .background(Circle().fill(Theme.surface3)).overlay(Circle().strokeBorder(Theme.lineStrong))
                        .offset(x: 6, y: 6)
                }
            }
            .shadow(color: locked ? .clear : Color(hue: path.hue / 360, saturation: 0.7, brightness: 0.8).opacity(0.35), radius: 12, y: 4)
            .accessibilityHidden(true)
    }
}

/// Hue-tinted backdrop that fades into the card surface.
struct PathHeroBackdrop: View {
    let hue: Double
    var strength = 0.45
    var body: some View {
        ZStack {
            Theme.surface2
            Theme.hueGradient(hue).opacity(strength)
            LinearGradient(colors: [.clear, Theme.surface2.opacity(0.85), Theme.surface2], startPoint: .top, endPoint: .bottom)
        }
    }
}

/// Small eyebrow + value tile (typical price, progress…).
struct PathInfoTile: View {
    let label: String
    let value: String
    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label.uppercased()).font(.eyebrow).tracking(0.6).foregroundStyle(Theme.faint)
            Text(value).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
        }
        .padding(Space.m)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.bg.opacity(0.45)))
        .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).strokeBorder(Theme.line))
        .accessibilityElement(children: .combine)
    }
}

/// "30-day objective" callout.
struct PathObjectiveBox: View {
    let objective: String
    var title = "30-day goal"
    var body: some View {
        HStack(alignment: .top, spacing: Space.m) {
            Image(systemName: "scope").font(.body.weight(.semibold)).foregroundStyle(Theme.brand300).padding(.top, 2)
            VStack(alignment: .leading, spacing: 3) {
                Text(title.uppercased()).font(.eyebrow).tracking(0.6).foregroundStyle(Theme.faint)
                Text(objective).font(.callout.weight(.medium)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(Space.m + 2)
        .background(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).fill(Theme.brand500.opacity(0.07)))
        .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(Theme.brand500.opacity(0.25)))
        .accessibilityElement(children: .combine)
    }
}

/// Neutral chip used for skills and weekly focus tags.
struct PathTagChip: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.footnote.weight(.medium)).foregroundStyle(Theme.inkSoft)
            .padding(.horizontal, 12).padding(.vertical, 7)
            .background(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous).fill(Theme.surface3))
            .overlay(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous).strokeBorder(Theme.line))
    }
}

/// Eyebrow title used inside path cards.
struct PathEyebrow: View {
    let text: String
    var body: some View {
        Text(text.uppercased()).font(.eyebrow).tracking(0.8).foregroundStyle(Theme.faint).accessibilityAddTraits(.isHeader)
    }
}
