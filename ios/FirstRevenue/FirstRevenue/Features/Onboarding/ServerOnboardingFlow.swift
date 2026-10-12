import SwiftUI

/// Onboarding for real Vaulten accounts: questions come from the API, each answer is saved as the user
/// goes (so it resumes on another device), the backend recommends a path, and choosing it enrolls the
/// account server-side — which is what lets later sign-ins skip onboarding.
struct ServerOnboardingFlow: View {
    @Environment(AppStore.self) private var store

    private enum Phase { case loading, failed(String), questions, computing, results(PathRecommendation) }

    @State private var phase: Phase = .loading
    @State private var questions: [(category: String, question: Question)] = []
    @State private var answers: [String: AnswerValue] = [:]
    @State private var index = 0
    @State private var forward = true
    @State private var saving = false
    @State private var stepError: String?
    @State private var autoAdvance: Task<Void, Never>?

    var body: some View {
        Group {
            switch phase {
            case .loading:
                VStack(spacing: Space.l) {
                    MascotView(mood: .thinking, size: 120)
                    ProgressView().tint(Theme.brand400)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            case .failed(let message):
                VStack(spacing: Space.l) {
                    MascotView(mood: .sad, size: 120)
                    Text(message).font(.callout).foregroundStyle(Theme.muted).multilineTextAlignment(.center).frame(maxWidth: 320)
                    Button("Try Again") { Task { await load() } }.buttonStyle(.fr(.primary))
                    Button("Sign Out") { store.logout() }.buttonStyle(.fr(.ghost))
                }
                .padding(Space.xl)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            case .questions:
                questionsView
            case .computing:
                VStack(spacing: Space.l) {
                    MascotView(mood: .focused, size: 140)
                    Text("Building your Vaulten plan…").font(.title2.weight(.heavy)).foregroundStyle(Theme.ink).multilineTextAlignment(.center)
                    ProgressView().tint(Theme.brand400)
                }
                .padding(Space.xl)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            case .results(let rec):
                ServerResultsView(recommendation: rec)
            }
        }
        .background(Theme.bg.ignoresSafeArea())
        .task { await load() }
    }

    // MARK: Loading

    private func load() async {
        phase = .loading
        do {
            async let categories = OnboardingAPI.questionnaire()
            async let saved = OnboardingAPI.savedAnswers()
            let flat: [(category: String, question: Question)] = try await categories.flatMap { c in c.questions.map { (category: c.title, question: $0) } }
            let savedAnswers = (try? await saved) ?? [:]
            guard !flat.isEmpty else { phase = .failed("The questionnaire isn't available right now."); return }
            questions = flat
            answers = savedAnswers
            // Resume at the first required question that isn't answered yet.
            index = flat.firstIndex { $0.question.isRequired && (savedAnswers[$0.question.key]?.isEmpty ?? true) } ?? 0
            phase = .questions
        } catch {
            phase = .failed(AuthErrorCopy.message(error))
        }
    }

    // MARK: Questions

    private var current: Question { questions[index].question }
    private var value: AnswerValue { answers[current.key] ?? AnswerValue() }
    private var canContinue: Bool { !current.isRequired || !value.isEmpty }

    private var questionsView: some View {
        VStack(spacing: 0) {
            VStack(spacing: Space.m) {
                ProgressBar(value: max(Double(index) / Double(questions.count), 0.04), height: 6, label: "Onboarding progress")
                HStack {
                    Button(action: back) {
                        HStack(spacing: 4) { Image(systemName: "chevron.left").font(.caption.weight(.bold)); Text("Back") }
                            .font(.footnote.weight(.semibold)).foregroundStyle(Theme.inkSoft)
                            .padding(.horizontal, 12).frame(height: 36)
                            .background(Capsule().fill(Theme.surface)).overlay(Capsule().strokeBorder(Theme.line))
                    }
                    .frame(minHeight: 44)
                    Spacer()
                    Text("\(index + 1) / \(questions.count)").font(.footnote.weight(.semibold)).monospacedDigit().foregroundStyle(Theme.brand300)
                        .accessibilityLabel("Question \(index + 1) of \(questions.count)")
                }
            }
            .padding(.horizontal, Space.xl).padding(.top, Space.s)

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    HStack { MascotView(mood: index % 3 == 2 ? .wink : .happy, size: 76, float: false); Spacer() }.padding(.top, Space.l)
                    Text(questions[index].category.uppercased()).font(.eyebrow).tracking(0.8).foregroundStyle(Theme.brand300).padding(.top, Space.l)
                    Text(current.prompt).font(.system(size: 26, weight: .heavy)).foregroundStyle(Theme.ink).padding(.top, Space.s)
                        .accessibilityAddTraits(.isHeader)
                    if let help = current.helpText, !help.isEmpty {
                        Text(help).font(.callout).foregroundStyle(Theme.muted).padding(.top, Space.s)
                    }
                    input.padding(.top, Space.xl)
                    if let stepError {
                        Label(stepError, systemImage: "exclamationmark.circle.fill").font(.footnote).foregroundStyle(Theme.danger).padding(.top, Space.m)
                    }
                }
                .padding(.horizontal, Space.xl).padding(.bottom, Space.xl)
                .id(current.key)
                .transition(.asymmetric(insertion: .move(edge: forward ? .trailing : .leading).combined(with: .opacity), removal: .opacity))
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .frame(maxWidth: 520).frame(maxWidth: .infinity)
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: 4) {
                Button(action: next) {
                    LoadingLabel(title: index == questions.count - 1 ? "Build My Plan" : "Continue", loading: saving)
                }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
                .disabled(!canContinue || saving)
                if !current.isRequired && value.isEmpty {
                    Text("Optional — you can skip this one.").font(.caption).foregroundStyle(Theme.faint)
                }
            }
            .frame(maxWidth: 520)
            .padding(.horizontal, Space.xl).padding(.bottom, Space.s).padding(.top, Space.m)
            .background(LinearGradient(colors: [Theme.bg.opacity(0), Theme.bg], startPoint: .top, endPoint: .center))
        }
    }

    @ViewBuilder private var input: some View {
        switch current.type {
        case .singleChoice:
            VStack(spacing: 10) {
                ForEach(Array(current.options.enumerated()), id: \.element.value) { i, o in
                    ChoiceRow(label: o.label, multi: false, selected: value.options?.first == o.value) { choose(o.value) }.fadeUp(i)
                }
            }
        case .multipleChoice:
            VStack(spacing: 10) {
                ForEach(Array(current.options.enumerated()), id: \.element.value) { i, o in
                    ChoiceRow(label: o.label, multi: true, selected: value.options?.contains(o.value) ?? false) { toggle(o.value) }.fadeUp(i)
                }
            }
        case .scale:
            let lo = Int(current.minValue ?? 1), hi = max(Int(current.maxValue ?? 5), lo)
            HStack(spacing: 8) {
                ForEach(lo...hi, id: \.self) { n in
                    let selected = value.number.map { Int($0) == n } ?? false
                    Button { Haptics.select(); set(AnswerValue(number: Double(n))) } label: {
                        Text("\(n)").font(.headline).monospacedDigit().foregroundStyle(selected ? .white : Theme.ink)
                            .frame(maxWidth: .infinity, minHeight: 52)
                            .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(selected ? AnyShapeStyle(Theme.brandGradient) : AnyShapeStyle(Theme.surface)))
                            .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).strokeBorder(selected ? .clear : Theme.line))
                    }
                    .buttonStyle(.pressable)
                    .accessibilityAddTraits(selected ? .isSelected : [])
                }
            }
        case .number:
            FRTextField(label: boundsLabel, text: Binding(
                get: { value.number.map { $0.truncatingRemainder(dividingBy: 1) == 0 ? String(Int($0)) : String($0) } ?? "" },
                set: { set(AnswerValue(number: Double($0.replacingOccurrences(of: ",", with: ".")))) }
            ), placeholder: "0", keyboard: .decimalPad)
        case .text:
            FRTextField(label: "Your answer", text: Binding(get: { value.text ?? "" }, set: { set(AnswerValue(text: String($0.prefix(500)))) }), placeholder: "Type here")
        }
    }

    private var boundsLabel: String {
        switch (current.minValue, current.maxValue) {
        case let (lo?, hi?): "Between \(Int(lo)) and \(Int(hi))"
        case let (lo?, nil): "At least \(Int(lo))"
        case let (nil, hi?): "Up to \(Int(hi))"
        default: "Your answer"
        }
    }

    private func set(_ v: AnswerValue) {
        stepError = nil
        answers[current.key] = v
    }

    private func choose(_ option: String) {
        Haptics.select()
        set(AnswerValue(options: [option]))
        autoAdvance?.cancel()
        autoAdvance = Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(340))
            if !Task.isCancelled { next() }
        }
    }

    private func toggle(_ option: String) {
        Haptics.select()
        var selected = value.options ?? []
        if let i = selected.firstIndex(of: option) { selected.remove(at: i) } else { selected.append(option) }
        set(AnswerValue(options: selected))
    }

    private func next() {
        autoAdvance?.cancel()
        guard canContinue, !saving else { return }
        let key = current.key, v = value
        saving = true
        Task { @MainActor in
            defer { saving = false }
            do {
                if !v.isEmpty { try await OnboardingAPI.save(key, v) }
            } catch APIError.problem(let p) where p.code == "INVALID_ANSWER" || p.code == "VALIDATION_FAILED" {
                withAnimation { stepError = current.type == .number ? "Enter a number \(boundsLabel.lowercased())." : "Check your answer and try again." }
                Haptics.notify(.error)
                return
            } catch {
                withAnimation { stepError = AuthErrorCopy.message(error) }
                return
            }
            forward = true
            if index == questions.count - 1 { await finish() } else { withAnimation(.snappy) { index += 1 } }
        }
    }

    private func back() {
        autoAdvance?.cancel()
        stepError = nil
        forward = false
        if index == 0 { store.logout(); return }
        withAnimation(.snappy) { index -= 1 }
    }

    private func finish() async {
        withAnimation(.easeInOut) { phase = .computing }
        do {
            let rec = try await OnboardingAPI.complete()
            withAnimation(.easeInOut) { phase = .results(rec) }
        } catch APIError.problem(let p) where p.code == "ONBOARDING_INCOMPLETE" {
            // A required question is still unanswered: jump back to it.
            index = questions.firstIndex { $0.question.isRequired && (answers[$0.question.key]?.isEmpty ?? true) } ?? 0
            stepError = "Please answer this question to continue."
            withAnimation { phase = .questions }
        } catch {
            stepError = AuthErrorCopy.message(error)
            withAnimation { phase = .questions }
        }
    }
}

private struct ChoiceRow: View {
    let label: String
    let multi: Bool
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Text(label).font(.body.weight(.semibold)).foregroundStyle(Theme.ink).multilineTextAlignment(.leading)
                Spacer(minLength: 4)
                ZStack {
                    RoundedRectangle(cornerRadius: multi ? 7 : 12).strokeBorder(selected ? .clear : Theme.lineStrong, lineWidth: 1.5)
                    if selected {
                        RoundedRectangle(cornerRadius: multi ? 7 : 12).fill(Theme.brandGradient)
                        Image(systemName: "checkmark").font(.caption.weight(.heavy)).foregroundStyle(.white)
                    }
                }
                .frame(width: 24, height: 24)
            }
            .padding(.horizontal, 16).padding(.vertical, 12)
            .frame(maxWidth: .infinity, minHeight: 60, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).fill(selected ? Theme.brand500.opacity(0.15) : Theme.surface))
            .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(selected ? Theme.brand500.opacity(0.6) : Theme.line))
            .animation(.snappy, value: selected)
        }
        .buttonStyle(.pressable)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

// MARK: - PathRecommendation + path choice

private struct ServerResultsView: View {
    let recommendation: PathRecommendation
    @Environment(AppStore.self) private var store
    @State private var chosenSlug: String?
    @State private var paywall = false
    @State private var plan = "yearly"
    @State private var loading = false
    @State private var enrolling = false
    @State private var error: String?

    /// Paths the user may choose (blocked ones are excluded by the API), mapped to the app's paths.
    private var choices: [RankedPath] { recommendation.ranked.filter { PathID(slug: $0.slug) != nil } }
    private var selected: RankedPath? { choices.first { $0.slug == chosenSlug } ?? recommendation.recommended ?? choices.first }

    var body: some View {
        ScrollView {
            VStack(spacing: Space.l) {
                MascotView(mood: .excited, size: 130).padding(.top, Space.xl)
                Text("YOUR PATH IS READY").font(.eyebrow).tracking(1).foregroundStyle(Theme.brand300)
                if let selected, let pathId = PathID(slug: selected.slug) {
                    let path = MockData.path(pathId)
                    VStack(alignment: .leading, spacing: Space.m) {
                        HStack(alignment: .top) {
                            SymbolTile(icon: path.icon, tint: .white, size: 48)
                            Spacer()
                            Badge(selected.slug == recommendation.recommended?.slug ? "Recommended for you" : "Your choice", tone: selected.slug == recommendation.recommended?.slug ? .success : .neutral)
                                .background(Capsule().fill(.black.opacity(0.4)))
                        }
                        Text(selected.name.uppercased()).font(.system(size: 30, weight: .heavy)).foregroundStyle(.white).fixedSize(horizontal: false, vertical: true)
                        Text(path.tagline).font(.callout).foregroundStyle(.white.opacity(0.85))
                    }
                    .padding(Space.xl)
                    .background(Theme.hueGradient(path.hue))
                    .clipShape(RoundedRectangle(cornerRadius: Radius.xxl, style: .continuous))
                    .shadow(color: Theme.brand600.opacity(0.35), radius: 24, y: 10)
                } else {
                    Text("No path matches your answers yet. Contact support so we can help you get started.")
                        .font(.callout).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
                }

                if choices.count > 1 {
                    VStack(alignment: .leading, spacing: Space.s) {
                        Text("Prefer another path?").font(.section).foregroundStyle(Theme.ink)
                        ForEach(choices, id: \.slug) { p in
                            ChoiceRow(label: p.name, multi: false, selected: p.slug == selected?.slug) { Haptics.select(); chosenSlug = p.slug }
                        }
                    }
                }
                ForEach(recommendation.blocked, id: \.slug) { b in
                    Label("\(b.name) isn't available: \(b.reason ?? "based on your answers").", systemImage: "lock.fill")
                        .font(.footnote).foregroundStyle(Theme.faint).frame(maxWidth: .infinity, alignment: .leading)
                }
                if let error { Label(error, systemImage: "exclamationmark.circle.fill").font(.footnote).foregroundStyle(Theme.danger) }
            }
            .padding(.horizontal, Space.xl).padding(.bottom, Space.xl)
            .frame(maxWidth: 520).frame(maxWidth: .infinity)
        }
        .safeAreaInset(edge: .bottom) {
            BottomBar {
                Button { store.isPremium ? enroll() : (paywall = true) } label: {
                    LoadingLabel(title: "Start My 30-Day Journey", loading: enrolling)
                }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
                .disabled(selected == nil || enrolling)
            }
        }
        .sheet(isPresented: $paywall) { journeyPaywall }
    }

    private var journeyPaywall: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            Text("Start your journey with Premium").font(.title2).foregroundStyle(Theme.ink).padding(.top, Space.xl)
            Text("Your full 30-day program, AI Coach, lessons and every tool.").font(.subheadline).foregroundStyle(Theme.muted)
            PlanPicker(selection: $plan).padding(.top, Space.s)
            Spacer()
            Button {
                mockCheckout(store: store, plan: plan, loading: $loading) {
                    paywall = false
                    store.showToast("Premium unlocked")
                    enroll()
                }
            } label: { LoadingLabel(title: "Start Premium", systemImage: "crown.fill", loading: loading) }
            .buttonStyle(.fr(.primary, size: .lg, full: true)).disabled(loading)
            Button("Maybe later — start with Day 1") { paywall = false; enroll() }
                .buttonStyle(.fr(.ghost, full: true)).disabled(loading)
        }
        .padding(.horizontal, Space.xl)
        .background(Theme.bgSunken.ignoresSafeArea())
        .presentationDetents([.fraction(0.72), .large])
        .presentationDragIndicator(.visible)
    }

    /// Records the choice on the server, then opens the app on that path.
    private func enroll() {
        guard let selected, let pathId = PathID(slug: selected.slug) else { return }
        enrolling = true
        error = nil
        Task { @MainActor in
            defer { enrolling = false }
            do {
                let enrollment = try await OnboardingAPI.choosePath(slug: selected.slug)
                store.completeServerOnboarding(path: pathId, day: enrollment.currentDay)
            } catch APIError.problem(let p) where p.code == "SUBSCRIPTION_REQUIRED" {
                // Free plan: the backend only enrolls subscribers, so keep the choice on this device for now.
                store.completeServerOnboarding(path: pathId, day: 1)
            } catch {
                Haptics.notify(.error)
                withAnimation { self.error = AuthErrorCopy.message(error) }
            }
        }
    }
}
