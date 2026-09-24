import SwiftUI

struct OnboardingFlow: View {
    @Environment(AppStore.self) private var store
    @State private var index = 0
    @State private var interstitial = false
    @State private var phase: Phase = .questions
    @State private var forward = true
    @State private var autoAdvance: Task<Void, Never>?

    enum Phase { case questions, analysis, results }

    private let steps = MockData.shared.onboarding.steps
    /// A breather screen shown once, before this step.
    private let interstitialBefore = 7

    var body: some View {
        switch phase {
        case .questions: questions
        case .analysis: AnalysisView { withAnimation(.easeInOut) { phase = .results } }.transition(.opacity)
        case .results: ResultsView().transition(.opacity)
        }
    }

    private var step: OnboardingStep { steps[index] }

    private var isValid: Bool {
        if interstitial { return true }
        if step.kind == "multi" { return !store.s.answers.skills.isEmpty }
        let v = store.s.answers[step.key].trimmingCharacters(in: .whitespaces)
        return v.count >= (step.kind == "text" ? 2 : 1)
    }

    private var questions: some View {
        VStack(spacing: 0) {
            // Progress + nav
            VStack(spacing: Space.m) {
                ProgressBar(value: max(Double(index + (interstitial ? 1 : 0)) / Double(steps.count), 0.04), height: 6, label: "Onboarding progress")
                HStack {
                    Button(action: back) {
                        HStack(spacing: 4) { Image(systemName: "chevron.left").font(.caption.weight(.bold)); Text("Back") }
                            .font(.footnote.weight(.semibold)).foregroundStyle(Theme.inkSoft)
                            .padding(.horizontal, 12).frame(height: 36)
                            .background(Capsule().fill(Theme.surface)).overlay(Capsule().strokeBorder(Theme.line))
                    }
                    .frame(minHeight: 44)
                    Spacer()
                    Text("\(index + 1) / \(steps.count)").font(.footnote.weight(.semibold)).monospacedDigit().foregroundStyle(Theme.brand300)
                        .accessibilityLabel("Step \(index + 1) of \(steps.count)")
                }
            }
            .padding(.horizontal, Space.xl).padding(.top, Space.s)

            ZStack {
                if interstitial {
                    interstitialView.transition(slide)
                } else {
                    stepView.id(index).transition(slide)
                }
            }
            .frame(maxHeight: .infinity, alignment: .top)
        }
        .frame(maxWidth: 520)
        .frame(maxWidth: .infinity)
        .safeAreaInset(edge: .bottom) {
            Button(action: next) {
                Label(index == steps.count - 1 ? "Build My Plan" : "Continue", systemImage: "arrow.right").labelStyle(TrailingIconLabel())
            }
            .buttonStyle(.fr(.primary, size: .lg, full: true))
            .disabled(!isValid)
            .frame(maxWidth: 520)
            .padding(.horizontal, Space.xl).padding(.bottom, Space.s).padding(.top, Space.m)
            .background(LinearGradient(colors: [Theme.bg.opacity(0), Theme.bg], startPoint: .top, endPoint: .center))
        }
        .background(Theme.bg.ignoresSafeArea())
    }

    private var slide: AnyTransition {
        .asymmetric(insertion: .move(edge: forward ? .trailing : .leading).combined(with: .opacity), removal: .move(edge: forward ? .leading : .trailing).combined(with: .opacity))
    }

    private var interstitialView: some View {
        VStack(spacing: Space.l) {
            Spacer()
            MascotView(mood: .excited, size: 190)
            Text("We got your back\(store.s.answers.name.isEmpty ? "" : ", \(store.s.answers.name)")")
                .font(.title.weight(.heavy)).foregroundStyle(Theme.ink).multilineTextAlignment(.center).padding(.top, Space.l)
            Text("With hands-on daily missions and a coach in your pocket, you'll reach your first client with a lot less guesswork.")
                .font(.callout).foregroundStyle(Theme.muted).multilineTextAlignment(.center).frame(maxWidth: 320)
            Spacer(); Spacer()
        }
        .padding(.horizontal, Space.xl)
    }

    private var stepView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .top) {
                    MascotView(mood: index == steps.count - 1 ? .excited : index % 3 == 2 ? .wink : .happy, size: 76, say: step.mascotLine, float: false, bubbleSide: .trailing)
                    Spacer()
                }
                .padding(.top, Space.l)
                SymbolTile(icon: step.icon, size: 36).padding(.top, Space.l)
                Text(step.title)
                    .font(.system(size: 26, weight: .heavy)).foregroundStyle(Theme.ink).padding(.top, Space.m)
                    .accessibilityAddTraits(.isHeader)
                Text(step.subtitle).font(.callout).foregroundStyle(Theme.muted).padding(.top, Space.s)

                if step.kind == "text" {
                    NameField(text: Binding(get: { store.s.answers.name }, set: { store.s.answers.name = String($0.prefix(24)) }), placeholder: step.placeholder ?? "", onSubmit: { if isValid { next() } })
                        .padding(.top, Space.xl)
                } else if let options = step.options {
                    let multi = step.kind == "multi"
                    let columns = multi ? [GridItem(.adaptive(minimum: 150), spacing: 10)] : [GridItem(.flexible())]
                    LazyVGrid(columns: columns, spacing: 10) {
                        ForEach(Array(options.enumerated()), id: \.element.value) { i, o in
                            OptionCard(option: o, multi: multi, selected: isSelected(o.value)) { select(o.value) }
                                .fadeUp(i)
                        }
                    }
                    .padding(.top, Space.xl)
                }
            }
            .padding(.horizontal, Space.xl)
            .padding(.bottom, Space.xl)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    private func isSelected(_ v: String) -> Bool {
        step.kind == "multi" ? store.s.answers.skills.contains(v) : store.s.answers[step.key] == v
    }

    private func select(_ v: String) {
        Haptics.select()
        if step.kind == "multi" {
            var skills = store.s.answers.skills
            if v == "None yet" { skills = skills.contains(v) ? [] : [v] }
            else { skills.removeAll { $0 == "None yet" }; skills.toggle(v) }
            store.s.answers.skills = skills
        } else {
            store.s.answers[step.key] = v
            // Single choice glides forward on its own; Continue still works.
            autoAdvance?.cancel()
            autoAdvance = Task { @MainActor in
                try? await Task.sleep(for: .milliseconds(340))
                if !Task.isCancelled { next() }
            }
        }
    }

    private func next() {
        autoAdvance?.cancel()
        forward = true
        if index == steps.count - 1 { withAnimation(.easeInOut) { phase = .analysis }; return }
        if index + 1 == interstitialBefore && !interstitial { withAnimation(.snappy) { interstitial = true }; return }
        withAnimation(.snappy) { interstitial = false; index += 1 }
    }

    private func back() {
        autoAdvance?.cancel()
        forward = false
        if interstitial { withAnimation(.snappy) { interstitial = false }; return }
        if index == 0 { store.logout(); return }
        withAnimation(.snappy) { index -= 1 }
    }
}

private struct NameField: View {
    @Binding var text: String
    let placeholder: String
    let onSubmit: () -> Void
    @FocusState private var focused: Bool
    var body: some View {
        TextField(placeholder, text: $text)
            .font(.title2.weight(.semibold))
            .textContentType(.givenName)
            .submitLabel(.continue)
            .onSubmit(onSubmit)
            .focused($focused)
            .padding(.horizontal, 20).frame(height: 64)
            .background(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).fill(Theme.surface))
            .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(focused ? Theme.brand500 : Theme.line, lineWidth: focused ? 1.5 : 1))
            .onAppear { focused = true }
            .accessibilityLabel("Your first name")
    }
}

private struct OptionCard: View {
    let option: OnboardingOption
    let multi: Bool
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Group { if multi { tile } else { row } }
                .background(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).fill(selected ? Theme.brand500.opacity(0.15) : Theme.surface))
                .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(selected ? Theme.brand500.opacity(0.6) : Theme.line))
                .shadow(color: selected ? Theme.brand600.opacity(0.25) : .clear, radius: 10, y: 4)
                .animation(.snappy, value: selected)
        }
        .buttonStyle(.pressable)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    /// Single choice: full-width row.
    private var row: some View {
        HStack(spacing: 14) {
            SymbolTile(icon: option.icon, tint: selected ? Theme.brand300 : Theme.muted, size: 36)
            VStack(alignment: .leading, spacing: 2) {
                Text(option.value).font(.body.weight(.semibold)).foregroundStyle(Theme.ink).multilineTextAlignment(.leading)
                if let hint = option.hint { Text(hint).font(.footnote).foregroundStyle(Theme.muted).multilineTextAlignment(.leading) }
            }
            Spacer(minLength: 4)
            check
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
        .frame(minHeight: 60)
    }

    /// Multi choice: compact tile for a 2-column grid (emoji + check on top, label below).
    private var tile: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack { SymbolTile(icon: option.icon, tint: selected ? Theme.brand300 : Theme.muted, size: 34); Spacer(); check }
            Text(option.value).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink)
                .lineLimit(2).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
        }
        .padding(14)
        .frame(maxWidth: .infinity, minHeight: 96, alignment: .topLeading)
    }

    private var check: some View {
        ZStack {
            RoundedRectangle(cornerRadius: multi ? 7 : 12).strokeBorder(selected ? .clear : Theme.lineStrong, lineWidth: 1.5)
            if selected {
                RoundedRectangle(cornerRadius: multi ? 7 : 12).fill(Theme.brandGradient)
                Image(systemName: "checkmark").font(.caption.weight(.heavy)).foregroundStyle(.white).transition(.scale)
            }
        }
        .frame(width: 24, height: 24)
    }
}

// MARK: - Plan-building animation

private struct AnalysisView: View {
    let onDone: () -> Void
    @State private var step = 0
    private let labels = MockData.shared.onboarding.analysisSteps

    var body: some View {
        VStack(spacing: 0) {
            Spacer()
            ProgressRing(value: Double(step) / Double(labels.count), size: 230, lineWidth: 6, label: "Building your plan") {
                MascotView(mood: step >= labels.count ? .excited : .thinking, size: 150, interactive: false)
            }
            Text("Building your FirstRevenue plan…").font(.title2.weight(.heavy)).foregroundStyle(Theme.ink).multilineTextAlignment(.center).padding(.top, Space.xxl)
            VStack(alignment: .leading, spacing: 14) {
                ForEach(Array(labels.enumerated()), id: \.offset) { i, label in
                    HStack(spacing: 12) {
                        ZStack {
                            Circle().fill(i < step ? Theme.success.opacity(0.15) : Theme.surface2).frame(width: 26, height: 26)
                            if i < step { Image(systemName: "checkmark").font(.caption.weight(.heavy)).foregroundStyle(Theme.success).transition(.scale) }
                            else if i == step { ProgressView().controlSize(.mini) }
                        }
                        Text(label).font(.callout).foregroundStyle(i < step ? Theme.ink : i == step ? Theme.muted : Theme.faint)
                    }
                    .opacity(i > step ? 0.5 : 1)
                }
            }
            .padding(.top, Space.xl)
            Spacer(); Spacer()
        }
        .padding(.horizontal, Space.xl)
        .frame(maxWidth: .infinity)
        .background(Theme.bg.ignoresSafeArea())
        .task {
            for i in 1...labels.count {
                try? await Task.sleep(for: .milliseconds(850))
                withAnimation(.snappy) { step = i }
                Haptics.select()
            }
            try? await Task.sleep(for: .milliseconds(500))
            Haptics.notify(.success)
            onDone()
        }
    }
}

// MARK: - Personalized recommendation

private struct ResultsView: View {
    @Environment(AppStore.self) private var store
    @State private var chosen: PathID?
    @State private var exploring = false
    @State private var paywall = false
    @State private var plan = "yearly"
    @State private var loading = false

    var body: some View {
        let rec = RecommendationEngine.recommend(store.s.answers)
        let pathId = chosen ?? rec.pathId
        let path = MockData.path(pathId)
        let recommended = pathId == rec.pathId

        ScrollView {
            VStack(spacing: Space.l) {
                VStack(spacing: Space.l) {
                    MascotView(mood: .excited, size: 130)
                    Text("YOUR PATH IS READY\(store.s.answers.name.isEmpty ? "" : ", \(store.s.answers.name.uppercased())")").font(.eyebrow).tracking(1).foregroundStyle(Theme.brand300)
                }
                .padding(.top, Space.xl)

                VStack(alignment: .leading, spacing: Space.m) {
                    HStack(alignment: .top) {
                        SymbolTile(icon: path.icon, tint: .white, size: 48)
                        Spacer()
                        Badge(recommended ? "\(rec.match)% match" : "Your choice", tone: recommended ? .success : .neutral).background(Capsule().fill(.black.opacity(0.4)))
                    }
                    Text(path.name.uppercased()).font(.system(size: 30, weight: .heavy)).foregroundStyle(.white).fixedSize(horizontal: false, vertical: true)
                    Text(recommended ? rec.summary : path.description).font(.callout).foregroundStyle(.white.opacity(0.85))
                }
                .padding(Space.xl)
                .background(Theme.hueGradient(path.hue))
                .clipShape(RoundedRectangle(cornerRadius: Radius.xxl, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: Radius.xxl, style: .continuous).strokeBorder(Theme.brand500.opacity(0.3)))
                .shadow(color: Theme.brand600.opacity(0.35), radius: 24, y: 10)
                .fadeUp(1)

                if recommended {
                    VStack(alignment: .leading, spacing: Space.m) {
                        Text("Why this path").font(.section).foregroundStyle(Theme.ink)
                        ForEach(rec.reasons, id: \.self) { r in
                            HStack(alignment: .top, spacing: 12) {
                                Image(systemName: "checkmark").font(.caption2.weight(.heavy)).foregroundStyle(Theme.success).frame(width: 20, height: 20).background(Circle().fill(Theme.success.opacity(0.15)))
                                Text(r).font(.subheadline).foregroundStyle(Theme.inkSoft)
                            }
                        }
                    }
                    .card().fadeUp(2)
                }

                HStack(spacing: Space.m) {
                    fact("Starting difficulty", path.difficulty)
                    fact("Typical first deal", path.typicalPrice.components(separatedBy: " per").first ?? path.typicalPrice)
                }
                .fadeUp(3)

                VStack(alignment: .leading, spacing: Space.m) {
                    Text("Skills required").font(.section).foregroundStyle(Theme.ink)
                    FlowLayout {
                        ForEach(path.skills, id: \.self) { s in
                            let have = store.s.answers.skills.contains { s.lowercased().contains($0.lowercased().split(separator: " ").first.map(String.init) ?? "~") }
                            Badge(s, tone: have ? .success : .neutral)
                        }
                    }
                    Text("Green = you already have it. We teach the rest.").font(.footnote).foregroundStyle(Theme.faint)
                }
                .card().fadeUp(4)

                VStack(alignment: .leading, spacing: Space.m) {
                    Text("Typical first tasks").font(.section).foregroundStyle(Theme.ink)
                    ForEach(Array(path.firstTasks.enumerated()), id: \.offset) { i, t in
                        HStack(alignment: .top, spacing: 12) {
                            Text("\(i + 1)").font(.caption.weight(.bold)).foregroundStyle(Theme.brand300).frame(width: 24, height: 24).background(Circle().fill(Theme.brand500.opacity(0.15)))
                            Text(t).font(.subheadline).foregroundStyle(Theme.inkSoft)
                        }
                    }
                }
                .card().fadeUp(5)

                VStack(alignment: .leading, spacing: 8) {
                    Label("30-DAY OBJECTIVE", systemImage: "target").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.brand300)
                    Text(path.objective).font(.title3.weight(.bold)).foregroundStyle(Theme.ink)
                }
                .card(.hero).fadeUp(6)
            }
            .frame(maxWidth: 520)
            .padding(.horizontal, Space.xl)
            .padding(.bottom, Space.xl)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.bg.ignoresSafeArea())
        .overlay { ConfettiView(count: 50) }
        .safeAreaInset(edge: .bottom) {
            BottomBar {
                Button { store.isPremium ? store.completeOnboarding(path: pathId) : (paywall = true) } label: {
                    Label("Start My 30-Day Journey", systemImage: "arrow.right").labelStyle(TrailingIconLabel())
                }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
                Button { exploring = true } label: { Label("Explore Other Paths", systemImage: "safari") }
                    .buttonStyle(.fr(.ghost, full: true))
            }
        }
        .sheet(isPresented: $exploring) { explore(other: pathId.other, recommended: rec.pathId) }
        .sheet(isPresented: $paywall) { journeyPaywall(pathId: pathId) }
    }

    private func fact(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption.weight(.medium)).foregroundStyle(Theme.faint)
            Text(value).font(.headline).foregroundStyle(Theme.ink)
        }
        .card()
    }

    private func explore(other: PathID, recommended: PathID) -> some View {
        let p = MockData.path(other)
        return ScrollView {
            VStack(alignment: .leading, spacing: Space.l) {
                Text(p.name).font(.title2).foregroundStyle(Theme.ink).padding(.top, Space.xl)
                Text(p.tagline).font(.subheadline).foregroundStyle(Theme.muted)
                ZStack { Theme.hueGradient(p.hue); Image(systemName: p.icon).font(.system(size: 44, weight: .semibold)).foregroundStyle(.white) }
                    .frame(height: 110).clipShape(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous))
                Text(p.description).font(.subheadline).foregroundStyle(Theme.muted)
                HStack { Badge(p.difficulty, tone: .brand); Badge(p.typicalPrice) }
                Text("What the 4 weeks look like").font(.section).foregroundStyle(Theme.ink)
                ForEach(p.weeks, id: \.week) { w in
                    (Text("Week \(w.week) · \(w.title): ").fontWeight(.semibold).foregroundStyle(Theme.inkSoft) + Text(w.focus.joined(separator: ", ")))
                        .font(.subheadline).foregroundStyle(Theme.muted)
                }
                if other != recommended {
                    Text("We recommended \(MockData.path(recommended).name) for you, but you can switch any time.").font(.footnote).foregroundStyle(Theme.faint)
                }
            }
            .padding(.horizontal, Space.xl)
        }
        .safeAreaInset(edge: .bottom) {
            Button("Choose this path instead") {
                chosen = other
                exploring = false
                store.showToast("Switched to \(p.name)", .info)
            }
            .buttonStyle(.fr(.secondary, size: .lg, full: true))
            .padding(.horizontal, Space.xl).padding(.top, Space.m)
        }
        .background(Theme.bgSunken.ignoresSafeArea())
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    private func journeyPaywall(pathId: PathID) -> some View {
        VStack(alignment: .leading, spacing: Space.l) {
            Text("Start your journey with Premium").font(.title2).foregroundStyle(Theme.ink).padding(.top, Space.xl)
            Text("Your full 30-day program, AI Coach, lessons and every tool.").font(.subheadline).foregroundStyle(Theme.muted)
            PlanPicker(selection: $plan).padding(.top, Space.s)
            Spacer()
            Button {
                mockCheckout(store: store, plan: plan, loading: $loading) {
                    paywall = false
                    store.showToast("Premium unlocked")
                    store.completeOnboarding(path: pathId)
                }
            } label: { LoadingLabel(title: "Start Premium", systemImage: "crown.fill", loading: loading) }
            .buttonStyle(.fr(.primary, size: .lg, full: true)).disabled(loading)
            Button("Maybe later — look around first") { paywall = false; store.completeOnboarding(path: pathId) }
                .buttonStyle(.fr(.ghost, full: true)).disabled(loading)
            Text("Prototype checkout — no payment is taken.").font(.caption).foregroundStyle(Theme.faint).frame(maxWidth: .infinity)
        }
        .padding(.horizontal, Space.xl)
        .background(Theme.bgSunken.ignoresSafeArea())
        .presentationDetents([.fraction(0.72), .large])
        .presentationDragIndicator(.visible)
    }
}
