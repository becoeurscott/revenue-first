import SwiftUI

/// Celebration shown inside the mission cover right after a mission is completed.
struct MissionCompleteView: View {
    let plan: DayPlan
    @Environment(AppStore.self) private var store
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = false
    @State private var wiggle = false

    private var finale: Bool { plan.day >= MockData.totalDays }
    private var lesson: Lesson? { MockData.lesson(plan.lessonId) }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            Circle()
                .fill(Theme.brand600.opacity(0.28))
                .frame(width: 420, height: 420)
                .blur(radius: 100)
                .offset(y: -200)
                .allowsHitTesting(false)
                .accessibilityHidden(true)
            VStack(spacing: 0) {
                GeometryReader { geo in
                    ScrollView {
                        hero
                            .frame(maxWidth: 440)
                            .padding(.horizontal, Space.xl)
                            .frame(maxWidth: .infinity, minHeight: geo.size.height)
                    }
                    .scrollBounceBehavior(.basedOnSize)
                }
                actions
            }
            ConfettiView()
        }
        .onAppear {
            Haptics.notify(.success)
            withAnimation(.bouncy.delay(0.1)) { shown = true }
            if !reduceMotion {
                withAnimation(.easeInOut(duration: 0.35).repeatForever(autoreverses: true)) { wiggle = true }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Mission complete")
    }

    // MARK: Hero

    private var hero: some View {
        VStack(spacing: 0) {
            MascotView(mood: .excited, size: 170, tapLines: ["We did it!", "That is how first clients happen.", "Same time tomorrow?"])
            headline.padding(.top, Space.xl)
            Text("Day \(plan.day) completed.")
                .font(.body).foregroundStyle(Theme.muted)
                .padding(.top, Space.m)
                .opacity(shown ? 1 : 0)
            statTiles.padding(.top, Space.xxl)
            if let lesson, !finale {
                unlockedCard(lesson).padding(.top, Space.m)
            }
        }
        .padding(.vertical, Space.xxl)
    }

    private var headline: some View {
        (Text("MISSION COMPLETE ").foregroundStyle(Theme.textGradient) + Text(Image(systemName: "party.popper.fill")).foregroundStyle(Theme.warning))
            .font(.display)
            .accessibilityLabel("Mission complete")
            .multilineTextAlignment(.center)
            .scaleEffect(shown ? 1 : 0.6)
            .opacity(shown ? 1 : 0)
            .accessibilityAddTraits(.isHeader)
    }

    private var statTiles: some View {
        let streak = store.s.streak
        return HStack(spacing: Space.m) {
            MissionCompleteTile(tone: Theme.brand500, value: "+\(plan.xp) XP", label: "Earned") {
                Image(systemName: "bolt.fill").font(.system(size: 18, weight: .bold)).foregroundStyle(Theme.brand300)
            }
            MissionCompleteTile(tone: Theme.warning, value: "\(streak) day\(streak == 1 ? "" : "s")", label: "Streak updated") {
                Image(systemName: "flame.fill").font(.system(size: 20, weight: .bold)).foregroundStyle(Theme.warning)
                    .rotationEffect(.degrees(wiggle ? 8 : -8))
            }
        }
        .fadeUp(2)
    }

    private func unlockedCard(_ lesson: Lesson) -> some View {
        Button { watchLesson() } label: {
            HStack(spacing: Space.m) {
                Image(systemName: "play.fill")
                    .font(.system(size: 15, weight: .bold)).foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(Circle().fill(Theme.brandGradient))
                VStack(alignment: .leading, spacing: 2) {
                    Text("UNLOCKED · TODAY'S LESSON").font(.caption.weight(.bold)).tracking(0.5).foregroundStyle(Theme.success)
                    Text(lesson.title).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink).lineLimit(1)
                    Text(lesson.duration).font(.caption).monospacedDigit().foregroundStyle(Theme.faint)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Theme.faint)
            }
            .card(padding: Space.l)
        }
        .buttonStyle(.pressable)
        .fadeUp(4)
        .accessibilityLabel("Unlocked lesson: \(lesson.title), \(lesson.duration)")
    }

    // MARK: Actions

    private var actions: some View {
        VStack(spacing: Space.s) {
            if finale {
                Button { Haptics.tap(); store.cover = .complete } label: {
                    Label("See My 30-Day Results", systemImage: "arrow.right").labelStyle(TrailingIconLabel())
                }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
            } else {
                Button { watchLesson() } label: { Label("Watch Lesson", systemImage: "play.fill") }
                    .buttonStyle(.fr(.primary, size: .lg, full: true))
            }
            Button("Back to Home") {
                Haptics.tap()
                store.cover = nil
                store.tab = .home
            }
            .buttonStyle(.fr(.ghost, size: .md, full: true))
        }
        .frame(maxWidth: 440)
        .padding(.horizontal, Space.xl)
        .padding(.bottom, Space.s)
        .frame(maxWidth: .infinity)
    }

    private func watchLesson() {
        Haptics.tap()
        store.cover = nil
        let s = store
        let lessonId = plan.lessonId
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(450))
            s.push(.lesson(lessonId), on: s.tab)
        }
    }
}

private struct MissionCompleteTile<Icon: View>: View {
    let tone: Color
    let value: String
    let label: String
    @ViewBuilder var icon: Icon

    var body: some View {
        VStack(spacing: 6) {
            icon.frame(height: 24)
            Text(value).font(.number(24)).foregroundStyle(Theme.ink)
                .lineLimit(1).minimumScaleFactor(0.7)
                .contentTransition(.numericText())
            Text(label).font(.caption).foregroundStyle(Theme.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(Space.l)
        .background(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).fill(tone.opacity(0.1)))
        .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(tone.opacity(0.3)))
        .accessibilityElement(children: .combine)
    }
}
