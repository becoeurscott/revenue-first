import SwiftUI
import RevenueCatUI

/// Journey setup for every account: earning method (with the YouTube follow-up), niche, starting stage
/// and constraints. Real accounts on a service journey then answer the backend questionnaire, which enrolls
/// them server-side; the owned-channel journey has no server path yet, so it is enrolled on this device.
struct OnboardingFlow: View {
    @Environment(AppStore.self) private var store

    enum Phase: Equatable { case questions, pickJourney, comingSoon(EarningMethod), analysis, results, unlocking, server }

    @State private var phase: Phase = .questions
    @State private var answers = JourneyAnswers()
    /// Raw earning-method option ("youtube" is resolved by the follow-up question).
    @State private var choice = ""
    @State private var key = "welcome"
    @State private var forward = true
    @State private var autoAdvance: Task<Void, Never>?
    /// Budget: "A specific amount" picked, and the amount typed (digits only).
    @State private var customBudget = false
    @State private var budgetAmount = ""
    /// "Add another skill" search text.
    @State private var skillQuery = ""
    /// Written during the analysis step: Week 1 only until the user pays.
    @State private var program: GeneratedProgram?

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
            case .analysis:
                AnalysisView(niche: answers.niche, track: config?.track, work: writePreview) { withAnimation(.easeInOut) { phase = .results } }
                    .overlay(alignment: .topLeading) { OnboardingBackButton { go(.questions, key: steps.last?.key ?? "goal") } }
                    .transition(.opacity)
            case .results:
                if let config {
                    JourneyResultsView(config: config, answers: answers, program: program, onStart: { start() }, onUnlocked: { withAnimation(.easeInOut) { phase = .unlocking } },
                                       onEditNiche: { go(.questions, key: "niche") }, onChangeMethod: { go(.questions, key: "earningMethod") },
                                       onBack: { go(.questions, key: steps.last?.key ?? "goal") })
                        .transition(.opacity)
                }
            case .unlocking:
                if let config {
                    ProgramUnlockFlow(weekTitles: weekTitles(config), write: writeFull, finishLabel: "Start Day 1") { full in
                        program = full ?? program
                        start(unlocked: true)
                    }
                    .transition(.opacity)
                }
            case .server:
                if let config {
                    ServerOnboardingFlow(journey: config, onEnrolled: { day in store.startJourney(answers, day: day, program: program) }, onChangeMethod: { go(.questions, key: "earningMethod") })
                }
            }
        }
    }

    // MARK: Questions

    private var isValid: Bool {
        switch step.kind {
        case "info": return true
        case "multi": return !selectedMulti.isEmpty
        case "text":
            let v = text(step.key).trimmingCharacters(in: .whitespaces)
            return !step.required || v.count >= 2
        default: return !value(step.key).isEmpty
        }
    }

    private var questions: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Button(action: back) {
                    Image(systemName: "chevron.left").font(.system(size: 20, weight: .bold)).foregroundStyle(Theme.inkSoft)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel("Back")
                ChunkyProgress(value: max(Double(position + 1) / Double(steps.count), 0.06))
                    .accessibilityLabel("Step \(position + 1) of \(steps.count)")
                Button {
                    Haptics.tap()
                    let muted = !(store.s.settings.voiceMuted ?? false)
                    store.s.settings.voiceMuted = muted
                    if muted { Voice.shared.stop() } else { speak() }
                } label: {
                    Image(systemName: store.s.settings.voiceMuted == true ? "speaker.slash.fill" : "speaker.wave.2.fill")
                        .font(.system(size: 18, weight: .semibold)).foregroundStyle(Theme.inkSoft)
                        .frame(width: 44, height: 44)
                        .contentTransition(.symbolEffect(.replace))
                }
                .accessibilityLabel(store.s.settings.voiceMuted == true ? "Turn voice on" : "Mute voice")
            }
            .padding(.horizontal, Space.m).padding(.top, Space.s)

            stepView.id(key).transition(slide).frame(maxHeight: .infinity, alignment: .top)
        }
        .frame(maxWidth: 560)
        .frame(maxWidth: .infinity)
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: 6) {
                Button(action: next) { Text(key == steps.last?.key ? "Build My Plan" : "Continue") }
                    .buttonStyle(.chunky())
                    .disabled(!isValid)
                if !step.required { Text("Optional — you can skip this one.").font(.play(13, .medium)).foregroundStyle(Theme.faint) }
            }
            .frame(maxWidth: 560)
            .padding(.horizontal, Space.xl).padding(.bottom, Space.s).padding(.top, Space.m)
            .background(LinearGradient(colors: [Theme.bg.opacity(0), Theme.bg], startPoint: .top, endPoint: .center))
        }
        .background(Theme.bg.ignoresSafeArea())
        .onChange(of: key, initial: true) { _, _ in speak() }
        .onDisappear { Voice.shared.stop() }
    }

    /// Vault reads the step: a recording for this journey if there is one, else the general one.
    private func speak() {
        var names = ["onb-\(key)"]
        if let method { names.insert("onb-\(key)-\(method.rawValue)", at: 0) }
        Voice.shared.play(names, muted: store.s.settings.voiceMuted == true)
    }

    private var slide: AnyTransition {
        .asymmetric(insertion: .move(edge: forward ? .trailing : .leading).combined(with: .opacity), removal: .move(edge: forward ? .leading : .trailing).combined(with: .opacity))
    }

    private var stepView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                if step.illustration == "hello" {
                    // The welcome screen's big mascot speaks the line itself.
                    QuestionBubble(text: title, tail: false).padding(.top, Space.xl)
                } else {
                    HStack(alignment: .center, spacing: 6) {
                        MascotView(mood: key == "goal" ? .excited : position % 3 == 2 ? .wink : .happy, size: 96, float: false)
                            .scaleEffect(Voice.shared.speaking ? 1.05 : 1, anchor: .bottom)
                            .animation(Voice.shared.speaking ? .easeInOut(duration: 0.32).repeatForever(autoreverses: true) : .snappy, value: Voice.shared.speaking)
                        QuestionBubble(text: title)
                    }
                    .padding(.top, Space.l)
                }
                if !subtitle.isEmpty {
                    Text(subtitle).font(.play(16, .medium)).foregroundStyle(Theme.muted)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.top, Space.l)
                }
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

    /// Before typing: niches that fit the route. While typing: every industry that matches what's typed.
    private var nicheSuggestions: [String] {
        let typed = answers.niche.trimmingCharacters(in: .whitespaces)
        if typed.isEmpty { return NicheSuggestions.starters(for: method) }
        let found = NicheSuggestions.matches(typed)
        // Once a suggestion is picked exactly, keep the route's set visible instead of a single chip.
        return found == [typed] ? NicheSuggestions.starters(for: method) : found
    }

    @ViewBuilder private var input: some View {
        switch step.kind {
        case "info":
            OnboardingIllustration(name: step.illustration ?? "", config: config)
        case "slider":
            ChoiceSlider(options: step.options ?? [], value: value(step.key)) { setValue(step.key, $0) }
        case "text":
            VStack(alignment: .leading, spacing: Space.m) {
                OnboardingTextField(text: binding(step.key), placeholder: step.placeholder ?? "", contentType: step.key == "name" ? .givenName : nil, onSubmit: { if isValid { next() } })
                if step.key == "niche" {
                    FlowLayout {
                        ForEach(nicheSuggestions, id: \.self) { label in
                            Button { Haptics.select(); answers.niche = label } label: { Badge(label, tone: answers.niche == label ? .brand : .neutral) }
                                .buttonStyle(.pressable)
                        }
                    }
                }
            }
        case "multi":
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                ForEach(Array((step.options ?? []).enumerated()), id: \.element.value) { i, o in
                    OptionCard(option: o, multi: true, selected: selectedMulti.contains(o.value)) { toggle(o.value) }.fadeUp(i)
                }
            }
            if step.key == "skills" { otherSkills.padding(.top, Space.l) }
        case "goal":
            VStack(spacing: 12) {
                ForEach(Array((config?.goalOptions ?? []).enumerated()), id: \.element.label) { i, g in
                    let option = JourneyQuestionOption(value: g.label, label: g.label, icon: g.isMoney ? "dollarsign.circle.fill" : Journeys.metric(g.metric).icon, hint: nil)
                    OptionCard(option: option, multi: false, selected: answers.goal == g.label) { choose(g.label) }.fadeUp(i)
                }
            }
        default:
            VStack(spacing: 12) {
                ForEach(Array((step.options ?? []).enumerated()), id: \.element.value) { i, o in
                    OptionCard(option: o, multi: false, selected: isSelected(o)) {
                        if step.key == "budget" && o.value == "custom" {
                            Haptics.select()
                            autoAdvance?.cancel()
                            customBudget = true
                            answers.budget = budgetAmount.isEmpty ? "" : "$\(budgetAmount)"
                        } else if step.key == "ageRange" && o.value == "under_18" {
                            // Under 18: no onboarding, no plan, no paywall. The block screen explains why.
                            Voice.shared.stop()
                            Monitoring.track("age_blocked")
                            withAnimation(.easeInOut(duration: 0.35)) { store.ageBlocked = true }
                        } else {
                            if step.key == "budget" { customBudget = false }
                            choose(o.value)
                        }
                    }.fadeUp(i)
                }
                if step.key == "budget" && customBudget {
                    BudgetAmountField(amount: $budgetAmount) { answers.budget = $0.isEmpty ? "" : "$\($0)" }
                        .onSubmit { if isValid { next() } }
                        .transition(.opacity.combined(with: .move(edge: .top)))
                }
            }
            .animation(.snappy, value: customBudget)
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
            if v != choice { resetMethodAnswers(clearNiche: !choice.isEmpty) }
            choice = v
        case "youtubeMode":
            if v != answers.youtubeMode { resetMethodAnswers(clearNiche: !answers.youtubeMode.isEmpty) }
            answers.youtubeMode = v
        case "weeklyTime": answers.weeklyTime = v
        case "budget": answers.budget = v
        case "goal": answers.goal = v
        default:
            var extra = answers.extra ?? [:]
            extra[key] = [v]
            answers.extra = extra
            if key == "heardFrom" { Monitoring.track("onboarding_heard_from", ["source": v]) }
            if key == "ageRange" { Monitoring.track("onboarding_age_range", ["range": v]) }
            // Status questions ("Do you already have a channel?") set where the plan starts.
            if let stage = step.options?.first(where: { $0.value == v })?.stage { answers.startingStage = stage }
        }
    }

    /// Answers about the person, not the method: they survive a method switch.
    private static let personalKeys: Set<String> = ["heardFrom", "ageRange"]

    /// Switching methods changes every question after it, so answers given for the old method are dropped
    /// (and the niche too, once a method had been chosen: "fitness YouTubers" doesn't fit freelance).
    private func resetMethodAnswers(clearNiche: Bool = true) {
        answers.youtubeMode = ""
        answers.goal = ""
        answers.extra = answers.extra?.filter { Self.personalKeys.contains($0.key) }
        if clearNiche { answers.niche = ""; answers.nicheDetail = "" }
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

    /// Skills beyond the listed choices: search the full list or type your own, shown as removable chips.
    private var otherSkills: some View {
        let listed = Set((step.options ?? []).map(\.value))
        let custom = answers.skills.filter { !listed.contains($0) }
        let typed = skillQuery.trimmingCharacters(in: .whitespaces)
        let found = NicheSuggestions.search(typed, in: NicheSuggestions.skills, limit: 8).filter { !answers.skills.contains($0) && !listed.contains($0) }
        return VStack(alignment: .leading, spacing: Space.m) {
            Text("Something else?").font(.play(15, .bold)).foregroundStyle(Theme.muted)
            if !custom.isEmpty {
                FlowLayout {
                    ForEach(custom, id: \.self) { skill in
                        Button { Haptics.select(); answers.skills.removeAll { $0 == skill } } label: {
                            Label(skill, systemImage: "xmark").labelStyle(.titleAndIcon)
                                .font(.subheadline.weight(.semibold)).foregroundStyle(.white)
                                .padding(.horizontal, 12).padding(.vertical, 8)
                                .background(Capsule().fill(Theme.brand500))
                        }
                        .buttonStyle(.pressable)
                        .accessibilityLabel("Remove \(skill)")
                    }
                }
            }
            HStack(spacing: 8) {
                Image(systemName: "plus.magnifyingglass").foregroundStyle(Theme.muted)
                TextField("Add another skill", text: $skillQuery)
                    .submitLabel(.done)
                    .onSubmit { addSkill(found.first ?? typed) }
            }
            .padding(.horizontal, 16).frame(height: 52)
            .background(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).fill(Theme.surface))
            .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(Theme.line))
            if !typed.isEmpty {
                FlowLayout {
                    ForEach(found, id: \.self) { skill in
                        Button { addSkill(skill) } label: { Badge(skill, tone: .neutral) }.buttonStyle(.pressable)
                    }
                    if !found.contains(where: { $0.caseInsensitiveCompare(typed) == .orderedSame }) && typed.count >= 2 {
                        Button { addSkill(typed) } label: { Badge("Add “\(typed)”", tone: .brand) }.buttonStyle(.pressable)
                    }
                }
            }
        }
        .animation(.snappy, value: answers.skills)
    }

    private func addSkill(_ raw: String) {
        let skill = String(raw.trimmingCharacters(in: .whitespaces).prefix(40))
        guard skill.count >= 2, !answers.skills.contains(where: { $0.caseInsensitiveCompare(skill) == .orderedSame }) else { skillQuery = ""; return }
        Haptics.select()
        answers.skills.removeAll { $0 == "None yet" }
        answers.skills.append(skill)
        skillQuery = ""
    }

    private func isSelected(_ o: JourneyQuestionOption) -> Bool {
        guard step.key == "budget" else { return value(step.key) == o.value }
        return o.value == "custom" ? customBudget : !customBudget && value(step.key) == o.value
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
        guard let i = list.firstIndex(where: { $0.key == key }), i > 0 else {
            // A guest goes back to the welcome screen; a signed-in account stays here (Back never signs anyone out).
            if store.s.account == nil { store.leaveGuest() }
            return
        }
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
        // Same order as choosing directly: the "one mission a day" screen, then the niche.
        key = steps.contains(where: { $0.key == "valueMissions" }) ? "valueMissions" : "niche"
        withAnimation(.snappy) { phase = .questions }
    }

    private func start(unlocked: Bool = false) {
        guard let config else { return }
        answers.earningMethod = config.id
        if store.s.account != nil && config.sellsServices {
            withAnimation(.easeInOut) { phase = .server }
        } else {
            store.startJourney(answers, program: program, programUnlocked: unlocked)
        }
    }

    // MARK: Program

    /// The enrollment these answers will create, so the program can be written before the user commits.
    private var draft: JourneyEnrollment? {
        guard let method, Journeys.config(method)?.isActive == true else { return nil }
        var a = answers
        a.earningMethod = method
        return AppStore.enrollment(method, answers: a)
    }

    /// Week 1 and the program header; the paid weeks are never written here.
    private func writePreview() async {
        guard let draft else { return }
        program = await ProgramGenerator.preview(for: draft, name: store.s.answers.name)
    }

    /// Days 8–30, only after a purchase or restore made the account Premium.
    private func writeFull() async -> GeneratedProgram? {
        guard store.isPremium, let draft else { return program }
        let preview: GeneratedProgram
        if let program { preview = program } else { preview = await ProgramGenerator.preview(for: draft, name: store.s.answers.name) }
        return await ProgramGenerator.complete(preview, for: draft, name: store.s.answers.name)
    }

    private func weekTitles(_ config: JourneyConfig) -> [Int: String] {
        Dictionary((config.track.map(MockData.path)?.weeks ?? []).map { ($0.week, $0.title) }, uniquingKeysWith: { a, _ in a })
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
    let program: GeneratedProgram?
    let onStart: () -> Void
    /// Premium is active (bought or restored here): unlock and write the rest of the program.
    let onUnlocked: () -> Void
    let onEditNiche: () -> Void
    let onChangeMethod: () -> Void
    /// Back to the last question, answers kept.
    let onBack: () -> Void
    @Environment(AppStore.self) private var store
    @State private var paywall = false
    @State private var plan = "yearly"
    @State private var loading = false
    /// Guests create their account here, then the plan is saved and the flow continues.
    @State private var createAccount = false

    private var isGuest: Bool { store.s.account == nil }
    private var niche: NicheContext { NicheResolver.resolve(answers.niche, detail: answers.nicheDetail, method: config.id) }
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

                if let program {
                    VStack(alignment: .leading, spacing: Space.m) {
                        Text("Your 30-day program").font(.section).foregroundStyle(Theme.ink).padding(.top, Space.s)
                        ProgramOverview(program: program, unlocked: store.isPremium) { paywall = true }
                    }
                    .fadeUp(2)
                }
                nicheCard.fadeUp(3)
                setupCard.fadeUp(3)


                VStack(alignment: .leading, spacing: Space.m) {
                    Text("What you'll track").font(.section).foregroundStyle(Theme.ink)
                    FlowLayout {
                        ForEach(config.metrics, id: \.self) { m in Badge(Journeys.metric(m).label, tone: .brand, systemImage: Journeys.metric(m).icon) }
                    }
                    Text("First goal: \(answers.goal)").font(.footnote).foregroundStyle(Theme.faint)
                    Label {
                        Text("Honest timeline: \(MonthCoach.timeline(config.id)) Each month after the first, you get a new plan built from your results.")
                    } icon: { Image(systemName: "clock.fill") }
                    .font(.footnote).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
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
        .overlay(alignment: .topLeading) { OnboardingBackButton(action: onBack) }
        .safeAreaInset(edge: .bottom) {
            BottomBar {
                Button {
                    if isGuest { createAccount = true }
                    else if store.isPremium && !serverService { onUnlocked() }
                    else if serverService || store.isPremium { onStart() }
                    else {
                        // Save the plan, then offer the subscription over the app (closing it leads to the offers, then explore).
                        onStart()
                        store.paywallFeature = "your plan"
                    }
                } label: {
                    Text(isGuest ? "Save My Plan" : store.isPremium || serverService ? "Start My 30-Day Program" : "Unlock My Full Program")
                }
                .buttonStyle(.chunky())
                if isGuest {
                    Text("Create a free account to keep your plan.").font(.play(13, .medium)).foregroundStyle(Theme.faint)
                }
                Button { onChangeMethod() } label: { Label("Change Earning Method", systemImage: "arrow.triangle.branch") }
                    .buttonStyle(.fr(.ghost, full: true))
            }
        }
        .sheet(isPresented: $paywall) { journeyPaywall }
        .sheet(isPresented: $createAccount) { CreateAccountSheet() }
        // The account now exists: save the plan (enroll) and continue to the subscription.
        .onChange(of: store.s.account?.id) { _, id in
            guard id != nil else { return }
            createAccount = false
            guard !store.s.onboarded else { return }
            Monitoring.track("account_created_after_onboarding", ["journey": config.id.rawValue])
            if store.isPremium { onUnlocked() } else {
                onStart()
                // Account created and plan saved: now offer the subscription (closing it leads to explore mode).
                store.paywallFeature = "your plan"
            }
        }
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
        VStack(spacing: 0) {
            // Closing the paywall still saves the plan: the user explores the app until they start.
            PlanPaywallView(onUnlocked: { paywall = false; onUnlocked() }, onClose: {
                paywall = false
                onStart()
                OfferCenter.shared.paywallClosed(store: store)
            })
                .interactiveDismissDisabled()
        }
        .background(Theme.bgSunken.ignoresSafeArea())
    }
}

// MARK: - Shared pieces

/// "$ ___": how much the user plans to spend, digits only.
private struct BudgetAmountField: View {
    @Binding var amount: String
    let onChange: (String) -> Void
    @FocusState private var focused: Bool
    var body: some View {
        HStack(spacing: 6) {
            Text("$").font(.title2.weight(.bold)).foregroundStyle(Theme.muted)
            TextField("Amount", text: $amount)
                .font(.title2.weight(.semibold))
                .keyboardType(.numberPad)
                .focused($focused)
                .onChange(of: amount) { _, v in
                    let digits = String(v.filter(\.isNumber).prefix(6))
                    if digits != v { amount = digits }
                    onChange(digits)
                }
        }
        .padding(.horizontal, 20).frame(height: 64)
        .background(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).fill(Theme.surface))
        .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(focused ? Theme.brand500 : Theme.line, lineWidth: focused ? 1.5 : 1))
        .padding(.top, 4)
        .onAppear { focused = true }
        .accessibilityLabel("Amount in dollars")
    }
}

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
            VStack(spacing: 3) {
                HStack(spacing: 10) {
                    Image(systemName: option.icon).font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(selected ? .white : Theme.brand300)
                    Text(option.label).lineLimit(2).minimumScaleFactor(0.85)
                }
                if let hint = option.hint, !multi {
                    Text(hint).font(.play(13, .medium)).foregroundStyle(selected ? .white.opacity(0.85) : Theme.muted)
                        .lineLimit(2)
                }
            }
            .padding(.vertical, 10)
        }
        .buttonStyle(.chunky(.option(selected: selected), height: multi ? 72 : 64))
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

/// The question, spoken by the mascot: a rounded bubble with a tail pointing at it.
private struct QuestionBubble: View {
    let text: String
    var tail = true
    var body: some View {
        Text(text)
            .font(.play(21, .bold))
            .foregroundStyle(Theme.ink)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, 18).padding(.vertical, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(Theme.surface))
            .overlay(RoundedRectangle(cornerRadius: 22, style: .continuous).strokeBorder(Theme.line, lineWidth: 2))
            .overlay(alignment: .leading) {
                if tail {
                BubbleTail().fill(Theme.surface)
                    .overlay(BubbleTail().stroke(Theme.line, lineWidth: 2))
                    .frame(width: 12, height: 18)
                    .offset(x: -10)
                }
            }
            .accessibilityAddTraits(.isHeader)
    }
}

private struct BubbleTail: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: r.maxX, y: r.minY))
        p.addLine(to: CGPoint(x: r.minX, y: r.midY))
        p.addLine(to: CGPoint(x: r.maxX, y: r.maxY))
        return p
    }
}

/// Thick rounded progress bar with a soft highlight, like a game level meter.
private struct ChunkyProgress: View {
    let value: Double
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(Theme.surface2)
                Capsule().fill(Theme.brandGradient)
                    .frame(width: max(g.size.width * value, 18))
                    .overlay(alignment: .top) {
                        Capsule().fill(.white.opacity(0.35)).frame(height: 3).padding(.horizontal, 8).padding(.top, 3)
                    }
                    .animation(.spring(response: 0.5, dampingFraction: 0.7), value: value)
            }
        }
        .frame(height: 16)
    }
}

private struct AnalysisView: View {
    let niche: String
    let track: PathID?
    /// Writes Week 1 of the program; the last step waits for it.
    let work: () async -> Void
    let onDone: () -> Void
    @State private var step = 0
    private var labels: [String] {
        ["Let me build your plan…", "Reading your niche: \(niche)", "Matching missions to where you start", "Fitting it to your weekly time", "Writing your first missions"]
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .center, spacing: 6) {
                MascotView(mood: step >= labels.count ? .excited : .thinking, size: 96, interactive: false, float: false)
                QuestionBubble(text: labels[min(step, labels.count - 1)])
                    .id(step)
                    .transition(.opacity.combined(with: .scale(scale: 0.96, anchor: .leading)))
            }
            .padding(.horizontal, Space.xl)
            .padding(.top, Space.xl)

            LessonWall(track: track)
                .frame(maxHeight: .infinity)
                .padding(.top, Space.l)
                .accessibilityHidden(true)

            ChunkyProgress(value: max(Double(step) / Double(labels.count), 0.06))
                .padding(.horizontal, Space.xl)
                .padding(.bottom, Space.xl)
                .accessibilityLabel("Building your plan")
        }
        .frame(maxWidth: .infinity)
        .background(Theme.bg.ignoresSafeArea())
        .task {
            async let written: Void = work()
            for i in 1..<labels.count {
                try? await Task.sleep(for: .milliseconds(900))
                withAnimation(.snappy) { step = i }
                Haptics.select()
            }
            await written
            try? await Task.sleep(for: .milliseconds(500))
            withAnimation(.snappy) { step = labels.count }
            try? await Task.sleep(for: .milliseconds(400))
            Haptics.notify(.success)
            onDone()
        }
    }
}

/// Columns of the journey's real lesson cards gliding up and down, with soft faded edges.
private struct LessonWall: View {
    let track: PathID?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var lessons: [Lesson] {
        let list = track.map { MockData.lessons(for: $0) } ?? []
        return list.isEmpty ? Array(MockData.allLessons.prefix(18)) : list
    }

    var body: some View {
        let all = lessons
        let columns = 3
        TimelineView(.animation(paused: reduceMotion)) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            GeometryReader { g in
                let width = (g.size.width - CGFloat(columns + 1) * 12) / CGFloat(columns)
                HStack(alignment: .top, spacing: 12) {
                    ForEach(0..<columns, id: \.self) { c in
                        let items = stride(from: c, to: all.count, by: columns).map { all[$0] }
                        let cardHeight = width * 1.3
                        let loop = CGFloat(max(items.count, 1)) * (cardHeight + 12)
                        let speed = 18.0 + Double(c) * 6
                        let raw = CGFloat((t * speed).truncatingRemainder(dividingBy: Double(loop)))
                        let shift = c.isMultiple(of: 2) ? -raw : raw - loop
                        VStack(spacing: 12) {
                            ForEach(0..<2, id: \.self) { _ in
                                ForEach(items) { LessonTile(lesson: $0, width: width, height: cardHeight) }
                            }
                        }
                        .offset(y: shift)
                    }
                }
                .padding(.horizontal, 12)
            }
            .clipped()
        }
        .mask(LinearGradient(stops: [.init(color: .clear, location: 0), .init(color: .black, location: 0.12), .init(color: .black, location: 0.88), .init(color: .clear, location: 1)], startPoint: .top, endPoint: .bottom))
    }
}

private struct LessonTile: View {
    let lesson: Lesson
    let width: CGFloat
    let height: CGFloat

    var body: some View {
        let color = Color(hue: lesson.hue / 360, saturation: 0.55, brightness: 0.75)
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: "play.fill").font(.system(size: 12, weight: .bold)).foregroundStyle(.white.opacity(0.9))
                .frame(width: 26, height: 26).background(Circle().fill(.white.opacity(0.18)))
            Spacer(minLength: 0)
            Text(lesson.title).font(.play(14, .heavy)).foregroundStyle(.white)
                .lineLimit(4).minimumScaleFactor(0.8)
            Text(lesson.category.uppercased()).font(.play(10, .bold)).foregroundStyle(.white.opacity(0.75)).lineLimit(1)
        }
        .padding(12)
        .frame(width: width, height: height, alignment: .topLeading)
        .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(LinearGradient(colors: [color, color.mix(with: .black, by: 0.35)], startPoint: .topLeading, endPoint: .bottomTrailing)))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(.white.opacity(0.12)))
    }
}

/// Back chevron for the full-screen onboarding steps (building the plan, the plan itself).
private struct OnboardingBackButton: View {
    let action: () -> Void
    var body: some View {
        Button { Haptics.tap(); action() } label: {
            Image(systemName: "chevron.left").font(.system(size: 20, weight: .bold)).foregroundStyle(Theme.inkSoft)
                .frame(width: 44, height: 44)
                .background(Circle().fill(Theme.surface.opacity(0.85)))
        }
        .accessibilityLabel("Back")
        .padding(.leading, Space.m)
        .padding(.top, Space.xs)
    }
}
