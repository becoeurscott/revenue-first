import SwiftUI

/// The pictures on onboarding's "info" steps. Each one shows something true about the product
/// (a real Day 1 mission, real coach questions) instead of claims or numbers.
struct OnboardingIllustration: View {
    let name: String
    let config: JourneyConfig?

    var body: some View {
        switch name {
        case "hello": hello
        case "missions": SampleMissionCard(config: config)
        case "coach": CoachQuestionsCloud(config: config)
        default: EmptyView()
        }
    }

    private var hello: some View {
        MascotView(mood: .happy, size: 230, tapLines: ["Let's do this!", "One step a day.", "I believe in you!"], entrance: .greeting)
            .frame(maxWidth: .infinity)
            .padding(.top, Space.l)
    }
}

/// Day 1 of the journey the user just picked, ticking itself off task by task.
private struct SampleMissionCard: View {
    let config: JourneyConfig?
    @State private var done = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var day: DayPlan? { config?.track.flatMap { MockData.plan($0).first } }
    private var tasks: [String] {
        let real = day?.tasks.prefix(3).map(\.title) ?? []
        return real.isEmpty ? ["Pick one small, specific niche", "Write down who it's for", "Take the first action today"] : Array(real)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Space.m) {
            HStack {
                Text("DAY 1").font(.play(13, .heavy)).tracking(1).foregroundStyle(Theme.brand300)
                Spacer()
                Label("\(day?.minutes ?? 20) min", systemImage: "clock").font(.play(13, .semibold)).foregroundStyle(Theme.muted)
            }
            Text(day?.missionTitle ?? "Your first mission").font(.play(22, .heavy)).foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
            VStack(alignment: .leading, spacing: 12) {
                ForEach(Array(tasks.enumerated()), id: \.offset) { i, task in
                    HStack(alignment: .top, spacing: 12) {
                        ZStack {
                            Circle().strokeBorder(i < done ? .clear : Theme.lineStrong, lineWidth: 2)
                            if i < done {
                                Circle().fill(Theme.brandGradient)
                                Image(systemName: "checkmark").font(.system(size: 12, weight: .heavy)).foregroundStyle(.white)
                                    .transition(.scale.combined(with: .opacity))
                            }
                        }
                        .frame(width: 26, height: 26)
                        Text(task).font(.play(16, .semibold))
                            .foregroundStyle(i < done ? Theme.muted : Theme.ink)
                            .strikethrough(i < done, color: Theme.muted)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            .padding(.top, 4)
        }
        .padding(Space.l)
        .background(RoundedRectangle(cornerRadius: 26, style: .continuous).fill(Theme.surface))
        .overlay(RoundedRectangle(cornerRadius: 26, style: .continuous).strokeBorder(Theme.line, lineWidth: 2))
        .rotationEffect(.degrees(-1.5))
        .padding(.top, Space.s)
        .accessibilityElement(children: .combine)
        .task {
            if reduceMotion { done = tasks.count; return }
            for i in 1...tasks.count {
                try? await Task.sleep(for: .milliseconds(i == 1 ? 700 : 650))
                withAnimation(.spring(response: 0.35, dampingFraction: 0.6)) { done = i }
                Haptics.soft()
            }
        }
    }
}

/// Real questions the coach answers for this journey, popping in as colourful bubbles.
private struct CoachQuestionsCloud: View {
    let config: JourneyConfig?
    @State private var shown = 0

    private var prompts: [String] {
        let real = config?.track.map { MockData.coachPrompts($0) } ?? []
        return Array((real.isEmpty ? ["Where do I find my first clients?", "How much should I charge?", "What should I post this week?", "Why isn't anyone replying?"] : real).prefix(5))
    }
    private static let tints: [Color] = [Color(red: 0.55, green: 0.40, blue: 0.95), Color(red: 0.85, green: 0.65, blue: 0.25), Color(red: 0.35, green: 0.55, blue: 0.75), Color(red: 0.80, green: 0.40, blue: 0.35), Color(red: 0.35, green: 0.65, blue: 0.45)]

    var body: some View {
        VStack(spacing: 14) {
            ForEach(Array(prompts.enumerated()), id: \.offset) { i, p in
                let tint = Self.tints[i % Self.tints.count]
                Text(p)
                    .font(.play(17, .bold))
                    .foregroundStyle(tint.mix(with: .white, by: 0.35))
                    .padding(.horizontal, 18).padding(.vertical, 12)
                    .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(tint.opacity(0.22)))
                    .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(tint.opacity(0.7), lineWidth: 2))
                    .frame(maxWidth: .infinity, alignment: i.isMultiple(of: 2) ? .leading : .trailing)
                    .opacity(i < shown ? 1 : 0)
                    .scaleEffect(i < shown ? 1 : 0.8, anchor: i.isMultiple(of: 2) ? .leading : .trailing)
            }
        }
        .accessibilityElement(children: .combine)
        .task {
            for i in 1...prompts.count {
                try? await Task.sleep(for: .milliseconds(260))
                withAnimation(.spring(response: 0.4, dampingFraction: 0.65)) { shown = i }
            }
        }
    }
}

/// A single choice picked by sliding, with the current answer shown big above the track.
struct ChoiceSlider: View {
    let options: [JourneyQuestionOption]
    let value: String
    let onChange: (String) -> Void

    private var index: Int { options.firstIndex { $0.value == value } ?? 1 }
    private var current: JourneyQuestionOption? { options.indices.contains(index) ? options[index] : nil }

    var body: some View {
        VStack(spacing: Space.xl) {
            VStack(spacing: 8) {
                Image(systemName: current?.icon ?? "clock.fill")
                    .font(.system(size: 54 + CGFloat(index) * 10, weight: .bold))
                    .foregroundStyle(Theme.brandGradient)
                    .frame(height: 110)
                    .contentTransition(.symbolEffect(.replace))
                Text(current?.label ?? "").font(.play(28, .heavy)).foregroundStyle(Theme.ink)
                    .contentTransition(.numericText())
                if let hint = current?.hint { Text(hint).font(.play(15, .medium)).foregroundStyle(Theme.muted) }
            }
            .frame(maxWidth: .infinity)
            .animation(.spring(response: 0.35, dampingFraction: 0.65), value: index)

            VStack(spacing: 10) {
                Slider(value: Binding(get: { Double(index) }, set: { v in
                    let i = Int(v.rounded())
                    guard options.indices.contains(i), options[i].value != value else { return }
                    Haptics.select()
                    onChange(options[i].value)
                }), in: 0...Double(max(options.count - 1, 1)), step: 1)
                .tint(Theme.brand400)
                .accessibilityValue(current?.label ?? "")
                HStack {
                    ForEach(options.indices, id: \.self) { i in
                        Circle().fill(i <= index ? Theme.brand300 : Theme.lineStrong).frame(width: 8, height: 8)
                        if i < options.count - 1 { Spacer() }
                    }
                }
                .padding(.horizontal, 6)
                .accessibilityHidden(true)
            }
        }
        .padding(.top, Space.l)
        // The slider always shows an answer, so the step is never stuck without one.
        .onAppear { if value.isEmpty, let o = options.indices.contains(1) ? options[1] : options.first { onChange(o.value) } }
    }
}
