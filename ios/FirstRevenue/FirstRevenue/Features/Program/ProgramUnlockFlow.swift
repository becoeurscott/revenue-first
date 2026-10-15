import SwiftUI

/// After payment: the lock opens, the paid weeks are written while the user watches, then the full program is
/// revealed. `write` only runs once Premium is active — callers never present this flow on the free plan.
struct ProgramUnlockFlow: View {
    /// Week titles shown while unlocking and writing (Weeks 2–4 of the journey's plan).
    let weekTitles: [Int: String]
    let write: () async -> GeneratedProgram?
    let finishLabel: String
    let onFinish: (GeneratedProgram?) -> Void

    private enum Phase: Equatable { case unlocking, writing, ready }
    @State private var phase: Phase = .unlocking
    @State private var program: GeneratedProgram?

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            switch phase {
            case .unlocking:
                ProgramUnlockAnimation(weekTitles: weekTitles) { withAnimation(.easeInOut(duration: 0.4)) { phase = .writing } }
                    .transition(.opacity)
            case .writing:
                ProgramWritingView(weekTitles: weekTitles, write: write) { written in
                    program = written
                    withAnimation(.easeInOut(duration: 0.4)) { phase = .ready }
                }
                .transition(.opacity)
            case .ready:
                ProgramRevealView(program: program, finishLabel: finishLabel) { onFinish(program) }
                    .transition(.opacity)
            }
        }
        .interactiveDismissDisabled()
    }
}

/// The cover shown inside the app when Premium arrives after onboarding.
struct InAppProgramUnlock: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let weeks = Dictionary(store.program.path.weeks.map { ($0.week, $0.title) }, uniquingKeysWith: { a, _ in a })
        ProgramUnlockFlow(weekTitles: weeks, write: {
            await store.syncProgram()
            return store.generatedProgram
        }, finishLabel: "Open My Plan") { _ in
            store.markProgramUnlocked()
            store.cover = nil
            store.tab = .plan
            store.popToRoot(.plan)
        }
    }
}

// MARK: - Unlock animation

/// A lock on top of the blurred weeks: it shakes, snaps open with a burst, and the weeks come into focus.
private struct ProgramUnlockAnimation: View {
    let weekTitles: [Int: String]
    let onDone: () -> Void

    @State private var shake = false
    @State private var open = false
    @State private var burst = false
    @State private var clear = false
    @State private var glow = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: Space.xl) {
            Spacer()
            ZStack {
                weeks
                lock
            }
            ZStack {
                VStack(spacing: Space.s) {
                    Text(clear ? "Your program is unlocked" : "Unlocking your program…")
                        .font(.title2.weight(.heavy)).foregroundStyle(Theme.ink).multilineTextAlignment(.center)
                    Text(clear ? "Weeks 2 to 4 are yours. Let's write them for you." : "Premium is active on your account.")
                        .font(.callout).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
                }
                .id(clear)
                .transition(.blurReplace)
            }
            .frame(maxWidth: 340)
            Spacer(); Spacer()
        }
        .padding(.horizontal, Space.xl)
        .frame(maxWidth: .infinity)
        .overlay { if clear { ConfettiView(count: 60).allowsHitTesting(false) } }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(clear ? "Your program is unlocked" : "Unlocking your program")
        .task { await run() }
    }

    /// The three paid weeks, blurred until the lock opens.
    private var weeks: some View {
        VStack(spacing: 10) {
            ForEach(2...4, id: \.self) { w in
                HStack(spacing: Space.m) {
                    Image(systemName: clear ? "checkmark.circle.fill" : "lock.fill")
                        .font(.footnote.weight(.bold)).foregroundStyle(clear ? Theme.success : Theme.faint)
                        .contentTransition(.symbolEffect(.replace))
                    Text("Week \(w) · \(weekTitles[w] ?? "")").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink)
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, Space.l).frame(height: 52)
                .background(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).fill(Theme.surface))
                .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(clear ? Theme.brand500.opacity(0.45) : Theme.line))
            }
        }
        .frame(maxWidth: 360)
        .blur(radius: clear ? 0 : 10)
        .opacity(clear ? 1 : 0.7)
        .scaleEffect(clear ? 1 : 0.96)
        .offset(y: 70)
    }

    private var lock: some View {
        ZStack {
            ForEach(0..<3, id: \.self) { i in
                Circle()
                    .strokeBorder(Theme.brand400.opacity(0.6), lineWidth: 2)
                    .frame(width: 110, height: 110)
                    .scaleEffect(burst ? 2.6 + Double(i) * 0.5 : 0.8)
                    .opacity(burst ? 0 : (open ? 0.8 : 0))
                    .animation(.easeOut(duration: 0.9).delay(Double(i) * 0.12), value: burst)
            }
            ForEach(0..<8, id: \.self) { i in
                Image(systemName: "sparkle")
                    .font(.system(size: 14, weight: .bold)).foregroundStyle(Theme.brand300)
                    .offset(x: burst ? 95 : 20)
                    .rotationEffect(.degrees(Double(i) * 45))
                    .opacity(burst ? 0 : (open ? 1 : 0))
                    .animation(.easeOut(duration: 0.8), value: burst)
            }
            Circle()
                .fill(Theme.brand500.opacity(0.45))
                .frame(width: 130, height: 130)
                .blur(radius: 30)
                .scaleEffect(glow ? 1.15 : 0.85)
            Image(systemName: open ? "lock.open.fill" : "lock.fill")
                .font(.system(size: 44, weight: .semibold))
                .foregroundStyle(.white)
                .contentTransition(.symbolEffect(.replace))
                .frame(width: 110, height: 110)
                .background(Circle().fill(Theme.brandGradient))
                .shadow(color: Theme.brand600.opacity(0.6), radius: 20)
                .rotationEffect(.degrees(shake ? 9 : 0), anchor: .top)
        }
        .scaleEffect(clear ? 0.55 : 1)
        .opacity(clear ? 0 : 1)
        .offset(y: clear ? -60 : -40)
    }

    private func run() async {
        if reduceMotion {
            open = true; clear = true
            Haptics.notify(.success)
            try? await Task.sleep(for: .seconds(1.6))
            onDone()
            return
        }
        withAnimation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true)) { glow = true }
        try? await Task.sleep(for: .milliseconds(500))
        // Three quick jiggles, as if the key is turning.
        for _ in 0..<3 {
            Haptics.select()
            withAnimation(.easeInOut(duration: 0.07)) { shake = true }
            try? await Task.sleep(for: .milliseconds(80))
            withAnimation(.easeInOut(duration: 0.07)) { shake = false }
            try? await Task.sleep(for: .milliseconds(90))
        }
        try? await Task.sleep(for: .milliseconds(150))
        Haptics.notify(.success)
        withAnimation(.spring(response: 0.35, dampingFraction: 0.5)) { open = true }
        burst = true
        try? await Task.sleep(for: .milliseconds(650))
        withAnimation(.spring(response: 0.6, dampingFraction: 0.85)) { clear = true }
        try? await Task.sleep(for: .seconds(1.6))
        onDone()
    }
}

// MARK: - Writing the paid weeks

private struct ProgramWritingView: View {
    let weekTitles: [Int: String]
    let write: () async -> GeneratedProgram?
    let onDone: (GeneratedProgram?) -> Void
    @State private var step = 0

    private var labels: [String] {
        (2...4).map { "Writing Week \($0)\(weekTitles[$0].map { " · \($0)" } ?? "")" } + ["Checking every mission fits your week"]
    }

    var body: some View {
        VStack(spacing: 0) {
            Spacer()
            ProgressRing(value: Double(step) / Double(labels.count), size: 230, lineWidth: 6, label: "Writing your program") {
                MascotView(mood: step >= labels.count ? .excited : .focused, size: 150, interactive: false)
            }
            Text("Writing your full program…").font(.title2.weight(.heavy)).foregroundStyle(Theme.ink).multilineTextAlignment(.center).padding(.top, Space.xxl)
            Text("\(MockData.totalDays - GeneratedProgram.freeDays) missions, one for each remaining day").font(.callout).foregroundStyle(Theme.muted).padding(.top, Space.xs)
            VStack(alignment: .leading, spacing: 14) {
                ForEach(Array(labels.enumerated()), id: \.offset) { i, label in
                    HStack(spacing: 12) {
                        ZStack {
                            Circle().fill(i < step ? Theme.success.opacity(0.15) : Theme.surface2).frame(width: 26, height: 26)
                            if i < step { Image(systemName: "checkmark").font(.caption.weight(.heavy)).foregroundStyle(Theme.success).transition(.scale) }
                            else if i == step { ProgressView().controlSize(.mini) }
                        }
                        Text(label).font(.callout).foregroundStyle(i < step ? Theme.ink : i == step ? Theme.muted : Theme.faint).lineLimit(1)
                    }
                    .opacity(i > step ? 0.5 : 1)
                }
            }
            .padding(.top, Space.xl)
            Spacer(); Spacer()
        }
        .padding(.horizontal, Space.xl)
        .frame(maxWidth: .infinity)
        .task {
            // The steps pace themselves; the last one waits for the real write to finish.
            async let written = write()
            for i in 1..<labels.count {
                try? await Task.sleep(for: .milliseconds(1100))
                withAnimation(.snappy) { step = i }
                Haptics.select()
            }
            let program = await written
            withAnimation(.snappy) { step = labels.count }
            Haptics.notify(.success)
            try? await Task.sleep(for: .milliseconds(500))
            onDone(program)
        }
    }
}

// MARK: - Reveal

private struct ProgramRevealView: View {
    let program: GeneratedProgram?
    let finishLabel: String
    let onFinish: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Space.l) {
                HStack {
                    Spacer()
                    MascotView(mood: .excited, size: 110, entrance: .celebrate)
                    Spacer()
                }
                .padding(.top, Space.xl)
                Text("YOUR FULL PROGRAM IS READY").font(.eyebrow).tracking(1).foregroundStyle(Theme.brand300).frame(maxWidth: .infinity)
                if let program {
                    ProgramHeaderCard(program: program).fadeUp(1)
                    ForEach(1...4, id: \.self) { w in
                        ProgramWeekCard(number: w, week: program.week(w), days: program.days.filter { $0.week == w }).fadeUp(w + 1)
                    }
                }
            }
            .padding(.horizontal, Space.xl).padding(.bottom, Space.xl)
            .frame(maxWidth: 520).frame(maxWidth: .infinity)
        }
        .overlay { ConfettiView(count: 40).allowsHitTesting(false) }
        .safeAreaInset(edge: .bottom) {
            BottomBar {
                Button { Haptics.tap(); onFinish() } label: { Label(finishLabel, systemImage: "arrow.right").labelStyle(TrailingIconLabel()) }
                    .buttonStyle(.fr(.primary, size: .lg, full: true))
            }
        }
    }
}
