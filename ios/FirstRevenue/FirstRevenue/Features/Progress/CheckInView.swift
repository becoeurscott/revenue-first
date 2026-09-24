import SwiftUI

/// Mutable answers for the weekly check-in.
struct CheckInAnswers {
    var accomplished = ""
    var difficult = ""
    var prospects = 0
    var replies = 0
    var madeMoney = false
    var moneyAnswered = false
    var improve = ""
}

enum CheckInStepKind { case accomplished, difficult, prospects, replies, madeMoney, improve }

struct CheckInStep {
    let kind: CheckInStepKind
    let icon: String
    let title: String
    let subtitle: String
    var placeholder = ""

    static let all: [CheckInStep] = [
        CheckInStep(kind: .accomplished, icon: "flag.checkered", title: "What did you accomplish?", subtitle: "Big or small. Missions, samples, messages sent — it all counts.", placeholder: "e.g. Finished my portfolio and sent my first 10 messages"),
        CheckInStep(kind: .difficult, icon: "mountain.2.fill", title: "What was difficult?", subtitle: "Naming the hard part is how you get past it.", placeholder: "e.g. Finding creators who actually reply"),
        CheckInStep(kind: .prospects, icon: "paperplane.fill", title: "How many prospects did you contact?", subtitle: "Prefilled from your prospect list. Adjust if you reached out elsewhere."),
        CheckInStep(kind: .replies, icon: "bubble.left.and.bubble.right.fill", title: "How many replies did you receive?", subtitle: "Any reply counts — even a “not right now”."),
        CheckInStep(kind: .madeMoney, icon: "dollarsign.circle.fill", title: "Did you make money?", subtitle: "Be honest. “Not yet” is a perfectly normal answer."),
        CheckInStep(kind: .improve, icon: "scope", title: "What do you want to improve?", subtitle: "Pick one thing. This becomes part of next week’s focus.", placeholder: "e.g. Writing better first lines"),
    ]
}

private enum CheckInPhase { case form, analysing, summary }

struct CheckInView: View {
    @Environment(AppStore.self) private var store
    @State private var step = 0
    @State private var forward = true
    @State private var phase: CheckInPhase = .form
    @State private var answers = CheckInAnswers()
    @State private var prefilled = false
    @State private var confirmClose = false

    private let steps = CheckInStep.all

    /// The week that was just completed (Day 8 → week 1, Day 14 → week 2).
    private var week: Int {
        let d = store.program.currentDay
        return max(1, Int(ceil(Double(d) / 7)) - (d % 7 == 0 ? 0 : 1))
    }

    var body: some View {
        VStack(spacing: 0) {
            topBar
            ZStack {
                switch phase {
                case .form: form.transition(.opacity)
                case .analysing: analysing.transition(.opacity)
                case .summary:
                    CheckInSummaryView(week: week, answers: answers, stats: store.stats, onContinue: save)
                        .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
            }
            .frame(maxHeight: .infinity)
        }
        .frame(maxWidth: 640)
        .frame(maxWidth: .infinity)
        .background(Theme.bg.ignoresSafeArea())
        .onAppear(perform: prefill)
        .confirmationDialog("Discard this check-in?", isPresented: $confirmClose, titleVisibility: .visible) {
            Button("Discard", role: .destructive) { store.cover = nil }
            Button("Keep going", role: .cancel) {}
        } message: {
            Text("Your answers so far will not be saved.")
        }
    }

    private func prefill() {
        guard !prefilled else { return }
        prefilled = true
        let st = store.stats
        answers.prospects = st.contacted
        answers.replies = st.replies
    }

    // MARK: Chrome

    private var topBar: some View {
        let value = phase == .form ? Double(step + 1) / Double(steps.count) : 1
        return HStack(spacing: Space.m) {
            IconButton(systemImage: "xmark", label: "Close check-in") { close() }
            ProgressBar(value: value, label: "Check-in progress")
            Text(phase == .form ? "\(step + 1)/\(steps.count)" : "Done")
                .font(.footnote.weight(.semibold)).monospacedDigit().foregroundStyle(Theme.muted)
                .frame(minWidth: 40, alignment: .trailing)
        }
        .padding(.horizontal, Space.gutter)
        .padding(.vertical, Space.s)
    }

    private func close() {
        let dirty = phase == .form && !(answers.accomplished + answers.difficult + answers.improve).trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        if dirty { confirmClose = true } else { store.cover = nil }
    }

    // MARK: Form

    private var form: some View {
        VStack(spacing: 0) {
            ScrollView {
                CheckInStepContent(step: steps[step], week: week, answers: $answers)
                    .id(step)
                    .transition(.asymmetric(
                        insertion: .move(edge: forward ? .trailing : .leading).combined(with: .opacity),
                        removal: .move(edge: forward ? .leading : .trailing).combined(with: .opacity)
                    ))
                    .padding(.horizontal, Space.gutter)
                    .padding(.top, Space.l)
                    .padding(.bottom, Space.xl)
            }
            .scrollDismissesKeyboard(.interactively)
            .clipped()
            bottomBar
        }
    }

    private var valid: Bool {
        switch steps[step].kind {
        case .accomplished: answers.accomplished.trimmingCharacters(in: .whitespacesAndNewlines).count >= 3
        case .difficult: answers.difficult.trimmingCharacters(in: .whitespacesAndNewlines).count >= 3
        case .improve: answers.improve.trimmingCharacters(in: .whitespacesAndNewlines).count >= 3
        case .madeMoney: answers.moneyAnswered
        case .replies: answers.replies <= answers.prospects
        case .prospects: true
        }
    }

    private var bottomBar: some View {
        BottomBar {
            HStack(spacing: Space.m) {
                if step > 0 {
                    Button { go(-1) } label: { Label("Back", systemImage: "arrow.left") }
                        .buttonStyle(.fr(.secondary, size: .lg))
                }
                Button { next() } label: {
                    Label(step == steps.count - 1 ? "See my summary" : "Continue", systemImage: "arrow.right").labelStyle(TrailingIconLabel())
                }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
                .disabled(!valid)
            }
        }
    }

    private func go(_ delta: Int) {
        Haptics.select()
        forward = delta > 0
        withAnimation(.snappy) { step = min(max(step + delta, 0), steps.count - 1) }
    }

    private func next() {
        guard valid else { return }
        if step < steps.count - 1 {
            go(1)
        } else {
            Haptics.tap()
            withAnimation(.easeInOut(duration: 0.3)) { phase = .analysing }
        }
    }

    // MARK: Analysing & save

    private var analysing: some View {
        VStack(spacing: Space.s) {
            MascotLoader(label: "Penny is putting together your summary.")
            Text("Reading your week…").font(.title2.weight(.heavy)).foregroundStyle(Theme.ink).padding(.top, Space.s)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.bottom, 60)
        .task {
            try? await Task.sleep(for: .seconds(1.2))
            Haptics.notify(.success)
            withAnimation(.spring(response: 0.5, dampingFraction: 0.85)) { phase = .summary }
        }
    }

    private func save() {
        store.addCheckin(
            week: week,
            accomplished: answers.accomplished.trimmingCharacters(in: .whitespacesAndNewlines),
            difficult: answers.difficult.trimmingCharacters(in: .whitespacesAndNewlines),
            prospects: answers.prospects,
            replies: answers.replies,
            madeMoney: answers.madeMoney,
            improve: answers.improve.trimmingCharacters(in: .whitespacesAndNewlines)
        )
        store.cover = nil
        store.tab = .plan
        store.showToast("Check-in saved · +50 XP")
    }
}
