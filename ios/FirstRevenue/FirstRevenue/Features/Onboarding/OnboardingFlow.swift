import SwiftUI

/// Journey setup for every account: earning method (with the YouTube follow-up), niche, starting stage
/// and constraints. Real accounts on a service journey then answer the backend questionnaire, which enrolls
/// them server-side; the owned-channel journey has no server path yet, so it is enrolled on this device.
struct OnboardingFlow: View {
    @Environment(AppStore.self) private var store

    enum Phase: Equatable { case questions, pickJourney, comingSoon(EarningMethod), analysis, results, server }

    @State private var phase: Phase = .questions
    @State private var answers = JourneyAnswers()
    /// Raw earning-method option ("youtube" is resolved by the follow-up question).
    @State private var choice = ""
    @State private var key = "name"
    @State private var forward = true
    @State private var autoAdvance: Task<Void, Never>?

    private var method: EarningMethod? { Journeys.method(choice: choice, youtubeMode: answers.youtubeMode) }
    private var config: JourneyConfig? { method.flatMap(Journeys.config) }

    /// Questions that apply to the answers so far: the list branches as soon as the earning method is known,
    /// and again on answers like "no channel yet" (no subscriber question) or "local clients" (city question).
    private var steps: [JourneyQuestion] {
        Journeys.catalog.onboarding.filter { q in
            if q.key == "nicheDetail" { return !answers.niche.isEmpty && NicheResolver.isTooBroad(answers.niche) }
            guard q.applies(to: method) else { return false }
            if let c = q.showIf {
                let v = value(c.key)
                if let anyOf = c.anyOf, !anyOf.contains(v) { return false }
                if let noneOf = c.noneOf, v.isEmpty || noneOf.contains(v) { return false }
            }
            return true
        }
    }
    /// The current question, worded and optioned for the chosen method.
    private var step: JourneyQuestion { (steps.first { $0.key == key } ?? steps[0]).resolved(for: method) }
    private var position: Int { steps.firstIndex { $0.key == key } ?? 0 }

    var body: some View {
        Group {
            switch phase {
            case .questions: questions
            case .pickJourney: PickJourneyView { picked in pick(picked) } onBack: { go(.questions, key: "earningMethod") }
            case .comingSoon(let m): comingSoon(m)
            case .analysis: AnalysisView(niche: answers.niche) { withAnimation(.easeInOut) { phase = .results } }.transition(.opacity)
            case .results:
                if let config {
                    JourneyResultsView(config: config, answers: answers, onStart: start, onEditNiche: { go(.questions, key: "niche") }, onChangeMethod: { go(.questions, key: "earningMethod") })
                        .transition(.opacity)
                }
            case .server:
                if let config {
                    ServerOnboardingFlow(journey: config, onEnrolled: { day in store.startJourney(answers, day: day) }, onChangeMethod: { go(.questions, key: "earningMethod") })
                }
            }
        }
    }

    // MARK: Questions

    private var isValid: Bool {
        switch step.kind {
        case "multi": return !selectedMulti.isEmpty
        case "text":
            let v = text(step.key).trimmingCharacters(in: .whitespaces)
            return !step.required || v.count >= 2
        default: return !value(step.key).isEmpty
        }
    }

    private var questions: some View {
        VStack(spacing: 0) {
            VStack(spacing: Space.m) {
                ProgressBar(value: max(Double(position) / Double(steps.count), 0.04), height: 6, label: "Onboarding progress")
                HStack {
                    Button(action: back) {
                        HStack(spacing: 4) { Image(systemName: "chevron.left").font(.caption.weight(.bold)); Text("Back") }
                            .font(.footnote.weight(.semibold)).foregroundStyle(Theme.inkSoft)
                            .padding(.horizontal, 12).frame(height: 36)
                            .background(Capsule().fill(Theme.surface)).overlay(Capsule().strokeBorder(Theme.line))
                    }
                    .frame(minHeight: 44)
                    Spacer()
                    Text("\(position + 1) / \(steps.count)").font(.footnote.weight(.semibold)).monospacedDigit().foregroundStyle(Theme.brand300)
                        .accessibilityLabel("Step \(position + 1) of \(steps.count)")
                }
            }
            .padding(.horizontal, Space.xl).padding(.top, Space.s)

            stepView.id(key).transition(slide).frame(maxHeight: .infinity, alignment: .top)
        }
        .frame(maxWidth: 520)
        .frame(maxWidth: .infinity)
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: 4) {
                Button(action: next) {
                    Label(key == steps.last?.key ? "Build My Plan" : "Continue", systemImage: "arrow.right").labelStyle(TrailingIconLabel())
                }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
                .disabled(!isValid)
                if !step.required { Text("Optional — you can skip this one.").font(.caption).foregroundStyle(Theme.faint) }
            }
            .frame(maxWidth: 520)
            .padding(.horizontal, Space.xl).padding(.bottom, Space.s).padding(.top, Space.m)
            .background(LinearGradient(colors: [Theme.bg.opacity(0), Theme.bg], startPoint: .top, endPoint: .center))
        }
        .background(Theme.bg.ignoresSafeArea())
    }

    private var slide: AnyTransition {
        .asymmetric(insertion: .move(edge: forward ? .trailing : .leading).combined(with: .opacity), removal: .move(edge: forward ? .leading : .trailing).combined(with: .opacity))
    }

    private var stepView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .top) {
                    MascotView(mood: key == "goal" ? .excited : position % 3 == 2 ? .wink : .happy, size: 76, say: step.mascotLine, float: false, bubbleSide: .trailing)
                    Spacer()
                }
                .padding(.top, Space.l)
                SymbolTile(icon: step.icon, size: 36).padding(.top, Space.l)
                Text(title).font(.system(size: 26, weight: .heavy)).foregroundStyle(Theme.ink).padding(.top, Space.m)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityAddTraits(.isHeader)
                Text(subtitle).font(.callout).foregroundStyle(Theme.muted).padding(.top, Space.s)
                input.padding(.top, Space.xl)
            }
            .padding(.horizontal, Space.xl)
            .padding(.bottom, Space.xl)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    /// "{name}" in catalog copy becomes the user's first name ("Nice to meet you, {name}!" → "Nice to meet you!" without one).
    private var title: String {
        let name = store.s.answers.name.trimmingCharacters(in: .whitespaces)
        return name.isEmpty ? step.title.replacingOccurrences(of: ", {name}", with: "") : step.title.replacingOccurrences(of: "{name}", with: name)
    }
    private var subtitle: String {
        key == "nicheDetail" ? "“\(answers.niche)” is broad. \(step.subtitle)" : step.subtitle
    }

    @ViewBuilder private var input: some View {
        switch step.kind {
        case "text":
            VStack(alignment: .leading, spacing: Space.m) {
                OnboardingTextField(text: binding(step.key), placeholder: step.placeholder ?? "", contentType: step.key == "name" ? .givenName : nil, onSubmit: { if isValid { next() } })
                if step.key == "niche" {
                    FlowLayout {
                        ForEach(Journeys.catalog.niches.prefix(12).map(\.label), id: \.self) { label in
                            Button { Haptics.select(); answers.niche = label } label: { Badge(label, tone: answers.niche == label ? .brand : .neutral) }
                                .buttonStyle(.pressable)
                        }
                    }
                }
            }
        case "multi":
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 10)], spacing: 10) {
                ForEach(Array((step.options ?? []).enumerated()), id: \.element.value) { i, o in
                    OptionCard(option: o, multi: true, selected: selectedMulti.contains(o.value)) { toggle(o.value) }.fadeUp(i)
                }
            }
        case "goal":
            VStack(spacing: 10) {
                ForEach(Array((config?.goalOptions ?? []).enumerated()), id: \.element.label) { i, g in
                    let option = JourneyQuestionOption(value: g.label, label: g.label, icon: g.isMoney ? "dollarsign.circle.fill" : Journeys.metric(g.metric).icon, hint: nil)
                    OptionCard(option: option, multi: false, selected: answers.goal == g.label) { choose(g.label) }.fadeUp(i)
                }
            }
        default:
            VStack(spacing: 10) {
                ForEach(Array((step.options ?? []).enumerated()), id: \.element.value) { i, o in
                    OptionCard(option: o, multi: false, selected: value(step.key) == o.value) { choose(o.value) }.fadeUp(i)
                }
            }
        }
    }

    // MARK: Answers

    private func text(_ key: String) -> String {
        switch key {
        case "name": store.s.answers.name
        case "niche": answers.niche
        case "nicheDetail": answers.nicheDetail
        case "location": answers.location
        default: ""
        }
    }

    private func binding(_ key: String) -> Binding<String> {
        Binding(get: { text(key) }, set: { v in
            switch key {
            case "name": store.s.answers.name = String(v.prefix(24))
            case "niche": answers.niche = String(v.prefix(80))
            case "nicheDetail": answers.nicheDetail = String(v.prefix(80))
            case "location": answers.location = String(v.prefix(60))
            default: break
            }
        })
    }

    private func value(_ key: String) -> String {
        switch key {
        case "earningMethod": choice
        case "youtubeMode": answers.youtubeMode
        case "weeklyTime": answers.weeklyTime
        case "budget": answers.budget
        case "goal": answers.goal
        default: answers.answer(key)
        }
    }

    private func setValue(_ key: String, _ v: String) {
        switch key {
        case "earningMethod":
            if v != choice { resetMethodAnswers() }
            choice = v
        case "youtubeMode":
            if v != answers.youtubeMode { resetMethodAnswers() }
            answers.youtubeMode = v
        case "weeklyTime": answers.weeklyTime = v
        case "budget": answers.budget = v
        case "goal": answers.goal = v
        default:
            var extra = answers.extra ?? [:]
            extra[key] = [v]
            answers.extra = extra
            // Status questions ("Do you already have a channel?") set where the plan starts.
            if let stage = step.options?.first(where: { $0.value == v })?.stage { answers.startingStage = stage }
        }
    }

    /// Switching methods changes every question after it, so answers given for the old method are dropped.
    private func resetMethodAnswers() {
        answers.youtubeMode = ""
        answers.goal = ""
        answers.extra = nil
        answers.startingStage = nil
        answers.skills = []
        answers.equipment = []
        answers.location = ""
    }

    private var selectedMulti: [String] {
        switch step.key {
        case "skills": answers.skills
        case "equipment": answers.equipment
        default: answers.extra?[step.key] ?? []
        }
    }

    private func toggle(_ v: String) {
        Haptics.select()
        let none = step.options?.first { $0.value.hasPrefix("None") }?.value
        var list = selectedMulti
        if v == none { list = list.contains(v) ? [] : [v] } else { list.removeAll { $0 == none }; list.toggle(v) }
        switch step.key {
        case "skills": answers.skills = list
        case "equipment": answers.equipment = list
        default:
            var extra = answers.extra ?? [:]
            extra[step.key] = list
            answers.extra = extra
        }
    }

    private func choose(_ v: String) {
        Haptics.select()
        setValue(step.key, v)
        autoAdvance?.cancel()
        autoAdvance = Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(340))
            if !Task.isCancelled { next() }
        }
    }

    // MARK: Navigation

    private func next() {
        autoAdvance?.cancel()
        guard isValid else { return }
        forward = true
        if key == "earningMethod" {
            if choice == "unknown" { withAnimation(.snappy) { phase = .pickJourney }; return }
            if let m = EarningMethod(rawValue: choice), Journeys.config(m)?.isActive == false { withAnimation(.snappy) { phase = .comingSoon(m) }; return }
        }
        let list = steps
        guard let i = list.firstIndex(where: { $0.key == key }) else { return }
        if i == list.count - 1 {
            guard let method else { return }
            answers.earningMethod = method
            withAnimation(.easeInOut) { phase = .analysis }
            return
        }
        withAnimation(.snappy) { key = list[i + 1].key }
    }

    private func back() {
        autoAdvance?.cancel()
        forward = false
        let list = steps
        guard let i = list.firstIndex(where: { $0.key == key }), i > 0 else { store.logout(); return }
        withAnimation(.snappy) { key = list[i - 1].key }
    }

    private func go(_ p: Phase, key k: String) {
        forward = false
        key = k
        withAnimation(.snappy) { phase = p }
    }

    /// "Not sure yet": the user picks one explicitly; we never pick for them.
    private func pick(_ m: EarningMethod) {
        resetMethodAnswers()
        switch m {
        case .youtubeOwnedChannel: choice = "youtube"; answers.youtubeMode = "own_channel"
        case .youtubeServices: choice = "youtube"; answers.youtubeMode = "services"
        default: choice = m.rawValue
        }
        forward = true
        key = "niche"
        withAnimation(.snappy) { phase = .questions }
    }

    private func start() {
        guard let config else { return }
        answers.earningMethod = config.id
        if store.s.account != nil && config.sellsServices {
            withAnimation(.easeInOut) { phase = .server }
        } else {
            store.startJourney(answers)
        }
    }

    private func comingSoon(_ m: EarningMethod) -> some View {
        VStack(spacing: Space.l) {
            Spacer()
            MascotView(mood: .thinking, size: 140)
            if let c = Journeys.config(m) {
                Text("\(c.label) isn't ready yet").font(.title2.weight(.heavy)).foregroundStyle(Theme.ink).multilineTextAlignment(.center)
                Text("We'd rather tell you than hand you a plan for something else. Join the list and we'll tell you when it opens, or choose another way to earn today.")
                    .font(.callout).foregroundStyle(Theme.muted).multilineTextAlignment(.center).frame(maxWidth: 340)
                JourneyComingSoonCard(config: c).frame(maxWidth: 420)
            }
            Spacer()
            Button("Choose a Different Method") { go(.questions, key: "earningMethod") }
                .buttonStyle(.fr(.primary, size: .lg, full: true)).frame(maxWidth: 420)
        }
        .padding(Space.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.bg.ignoresSafeArea())
    }
}

// MARK: - "Not sure yet"

private struct PickJourneyView: View {
    let onPick: (EarningMethod) -> Void
    let onBack: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Space.l) {
                MascotView(mood: .happy, size: 96).padding(.top, Space.xl)
                Text("Here's what you can start today").font(.system(size: 26, weight: .heavy)).foregroundStyle(Theme.ink)
                Text("Each one is a different way to earn, with its own plan and tools. Pick the one that sounds most like you — you can add another later.")
                    .font(.callout).foregroundStyle(Theme.muted)
                ForEach(Array(Journeys.active.enumerated()), id: \.element.id) { i, j in
                    Button { Haptics.select(); onPick(j.id) } label: {
                        HStack(alignment: .top, spacing: Space.m) {
                            SymbolTile(icon: j.icon, size: 44)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(j.label).font(.body.weight(.bold)).foregroundStyle(Theme.ink)
                                Text(j.description).font(.footnote).foregroundStyle(Theme.muted).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                            }
                            Spacer(minLength: 0)
                            Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Theme.faint)
                        }
                        .card()
                    }
                    .buttonStyle(.pressable)
                    .fadeUp(i)
                }
                Button("Back") { onBack() }.buttonStyle(.fr(.ghost, full: true))
            }
            .padding(.horizontal, Space.xl).padding(.bottom, Space.xl)
            .frame(maxWidth: 520).frame(maxWidth: .infinity)
        }
        .background(Theme.bg.ignoresSafeArea())
    }
}

// MARK: - Results

private struct JourneyResultsView: View {
    let config: JourneyConfig
    let answers: JourneyAnswers
    let onStart: () -> Void
    let onEditNiche: () -> Void
    let onChangeMethod: () -> Void
    @Environment(AppStore.self) private var store
    @State private var paywall = false
    @State private var plan = "yearly"
    @State private var loading = false

    private var niche: NicheContext { NicheResolver.resolve(answers.niche, detail: answers.nicheDetail, method: config.id) }
    private var path: PathInfo? { config.track.map(MockData.path) }
    private var serverService: Bool { store.s.account != nil && config.sellsServices }

    var body: some View {
        ScrollView {
            VStack(spacing: Space.l) {
                VStack(spacing: Space.l) {
                    MascotView(mood: .excited, size: 130)
                    Text("YOUR JOURNEY IS READY\(store.s.answers.name.isEmpty ? "" : ", \(store.s.answers.name.uppercased())")").font(.eyebrow).tracking(1).foregroundStyle(Theme.brand300)
                }
                .padding(.top, Space.xl)

                VStack(alignment: .leading, spacing: Space.m) {
                    HStack(alignment: .top) {
                        SymbolTile(icon: config.icon, tint: .white, size: 48)
                        Spacer()
                        Badge("Your choice", tone: .success).background(Capsule().fill(.black.opacity(0.4)))
                    }
                    Text(config.label.uppercased()).font(.system(size: 28, weight: .heavy)).foregroundStyle(.white).fixedSize(horizontal: false, vertical: true)
                    Text(config.description).font(.callout).foregroundStyle(.white.opacity(0.85)).fixedSize(horizontal: false, vertical: true)
                }
                .padding(Space.xl)
                .background(Theme.hueGradient(config.hue))
                .clipShape(RoundedRectangle(cornerRadius: Radius.xxl, style: .continuous))
                .shadow(color: Theme.brand600.opacity(0.35), radius: 24, y: 10)
                .fadeUp(1)

                nicheCard.fadeUp(2)
                setupCard.fadeUp(2)

                if let path {
                    VStack(alignment: .leading, spacing: Space.m) {
                        Text("Your first steps").font(.section).foregroundStyle(Theme.ink)
                        ForEach(Array(path.firstTasks.enumerated()), id: \.offset) { i, t in
                            HStack(alignment: .top, spacing: 12) {
                                Text("\(i + 1)").font(.caption.weight(.bold)).foregroundStyle(Theme.brand300).frame(width: 24, height: 24).background(Circle().fill(Theme.brand500.opacity(0.15)))
                                Text(t).font(.subheadline).foregroundStyle(Theme.inkSoft)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .card().fadeUp(3)
                }

                VStack(alignment: .leading, spacing: Space.m) {
                    Text("What you'll track").font(.section).foregroundStyle(Theme.ink)
                    FlowLayout {
                        ForEach(config.metrics, id: \.self) { m in Badge(Journeys.metric(m).label, tone: .brand, systemImage: Journeys.metric(m).icon) }
                    }
                    Text("First goal: \(answers.goal)").font(.footnote).foregroundStyle(Theme.faint)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .card().fadeUp(4)
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
                Button { serverService || store.isPremium || store.s.isDemo == true ? onStart() : (paywall = true) } label: {
                    Label("Start My 30-Day Journey", systemImage: "arrow.right").labelStyle(TrailingIconLabel())
                }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
                Button { onChangeMethod() } label: { Label("Change Earning Method", systemImage: "arrow.triangle.branch") }
                    .buttonStyle(.fr(.ghost, full: true))
            }
        }
        .sheet(isPresented: $paywall) { journeyPaywall }
    }

    private var nicheCard: some View {
        let n = niche
        return VStack(alignment: .leading, spacing: Space.m) {
            HStack {
                Text("Your niche").font(.section).foregroundStyle(Theme.ink)
                Spacer()
                Button("Edit", action: onEditNiche).font(.footnote.weight(.semibold)).foregroundStyle(Theme.brand300).frame(minHeight: 44)
            }
            Text(n.normalizedLabel).font(.title3.weight(.bold)).foregroundStyle(Theme.ink)
            fact("person.2.fill", "For \(n.audience)")
            fact("target", "Helping with \(n.problemOrDesire)")
            if !n.exampleTerms.isEmpty { fact("text.magnifyingglass", n.exampleTerms.joined(separator: ", ")) }
            if let stage = answers.startingStage {
                fact("flag.fill", "Starting point: \(Journeys.stageLabel(stage, method: config.id))")
            }
            if let note = n.cautionNote {
                Label(note, systemImage: "exclamationmark.shield.fill").font(.footnote).foregroundStyle(Theme.warning).fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }

    /// What the method-specific answers changed in the plan.
    @ViewBuilder private var setupCard: some View {
        let summary = Journeys.setupSummary(answers, method: config.id)
        let notes = Journeys.planNotes(answers, method: config.id)
        if !summary.isEmpty || !notes.isEmpty {
            VStack(alignment: .leading, spacing: Space.m) {
                Text("Your setup").font(.section).foregroundStyle(Theme.ink)
                if !summary.isEmpty {
                    FlowLayout {
                        ForEach(summary, id: \.label) { item in Badge("\(item.label): \(item.value)", tone: .brand) }
                    }
                }
                ForEach(notes, id: \.self) { note in fact("wand.and.stars", note) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .card()
        }
    }

    private func fact(_ icon: String, _ text: String) -> some View {
        Label(text, systemImage: icon).font(.subheadline).foregroundStyle(Theme.inkSoft).fixedSize(horizontal: false, vertical: true)
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
                    onStart()
                }
            } label: { LoadingLabel(title: "Start Premium", systemImage: "crown.fill", loading: loading) }
            .buttonStyle(.fr(.primary, size: .lg, full: true)).disabled(loading)
            Button("Maybe later — look around first") { paywall = false; onStart() }
                .buttonStyle(.fr(.ghost, full: true)).disabled(loading)
            Text("Prototype checkout — no payment is taken.").font(.caption).foregroundStyle(Theme.faint).frame(maxWidth: .infinity)
        }
        .padding(.horizontal, Space.xl)
        .background(Theme.bgSunken.ignoresSafeArea())
        .presentationDetents([.fraction(0.72), .large])
        .presentationDragIndicator(.visible)
    }
}

// MARK: - Shared pieces

private struct OnboardingTextField: View {
    @Binding var text: String
    let placeholder: String
    let contentType: UITextContentType?
    let onSubmit: () -> Void
    @FocusState private var focused: Bool
    var body: some View {
        TextField(placeholder, text: $text)
            .font(.title2.weight(.semibold))
            .textContentType(contentType)
            .submitLabel(.continue)
            .onSubmit(onSubmit)
            .focused($focused)
            .padding(.horizontal, 20).frame(height: 64)
            .background(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).fill(Theme.surface))
            .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(focused ? Theme.brand500 : Theme.line, lineWidth: focused ? 1.5 : 1))
            .onAppear { focused = true }
            .accessibilityLabel(placeholder)
    }
}

private struct OptionCard: View {
    let option: JourneyQuestionOption
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

    private var row: some View {
        HStack(spacing: 14) {
            SymbolTile(icon: option.icon, tint: selected ? Theme.brand300 : Theme.muted, size: 36)
            VStack(alignment: .leading, spacing: 2) {
                Text(option.label).font(.body.weight(.semibold)).foregroundStyle(Theme.ink).multilineTextAlignment(.leading)
                if let hint = option.hint { Text(hint).font(.footnote).foregroundStyle(Theme.muted).multilineTextAlignment(.leading) }
            }
            Spacer(minLength: 4)
            check
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
        .frame(minHeight: 60)
    }

    private var tile: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack { SymbolTile(icon: option.icon, tint: selected ? Theme.brand300 : Theme.muted, size: 34); Spacer(); check }
            Text(option.label).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink)
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

private struct AnalysisView: View {
    let niche: String
    let onDone: () -> Void
    @State private var step = 0
    private var labels: [String] {
        ["Reading your niche: \(niche)", "Matching missions to your starting point", "Fitting the plan to your weekly time", "Picking the tools and numbers you'll track"]
    }

    var body: some View {
        VStack(spacing: 0) {
            Spacer()
            ProgressRing(value: Double(step) / Double(labels.count), size: 230, lineWidth: 6, label: "Building your plan") {
                MascotView(mood: step >= labels.count ? .excited : .thinking, size: 150, interactive: false)
            }
            Text("Building your Vaulten plan…").font(.title2.weight(.heavy)).foregroundStyle(Theme.ink).multilineTextAlignment(.center).padding(.top, Space.xxl)
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
        .background(Theme.bg.ignoresSafeArea())
        .task {
            for i in 1...labels.count {
                try? await Task.sleep(for: .milliseconds(750))
                withAnimation(.snappy) { step = i }
                Haptics.select()
            }
            try? await Task.sleep(for: .milliseconds(400))
            Haptics.notify(.success)
            onDone()
        }
    }
}
