import SwiftUI

/// Mentor Check: a 10-question risk score that helps users tell a real mentor from a fake guru.
struct MentorCheckView: View {
    @Environment(AppStore.self) private var store
    private let data = MockData.shared.mentorCheck

    private enum Stage { case intro, quiz, result }
    @State private var stage: Stage = .intro
    @State private var name = ""
    @State private var answers: [Int] = []

    var body: some View {
        Screen(title: "Mentor Check", subtitle: stage == .intro ? "Tell a real mentor from a fake guru — in any field." : nil) {
            switch stage {
            case .intro: intro
            case .quiz: quiz
            case .result: result
            }
        }
        .animation(.snappy, value: answers)
    }

    // MARK: Intro

    private var intro: some View {
        VStack(alignment: .leading, spacing: Space.xl) {
            VStack(alignment: .leading, spacing: Space.m) {
                Text("BEFORE YOU PAY ANYONE").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.brand300)
                Text("Is this mentor worth your money?").font(.title2.weight(.heavy)).foregroundStyle(Theme.ink)
                Text("Answer 10 quick questions about a course, coach or influencer. You get a risk score and the exact red flags to ask about.")
                    .font(.subheadline).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
                FRTextField(label: "Who are you checking? (optional)", text: $name, placeholder: "Name, course or account")
                    .padding(.top, Space.xs)
                Button {
                    Haptics.tap()
                    stage = .quiz
                } label: { Label("Start the 2-Minute Check", systemImage: "arrow.right") }
                    .buttonStyle(.fr(.primary, size: .lg, full: true))
            }
            .card(.hero)
            .fadeUp(0)

            Adaptive2Col {
                flagList(title: "7 Red Flags", flags: data.redFlags, icon: "exclamationmark.triangle.fill", tint: Theme.danger)
            } trailing: {
                flagList(title: "5 Green Flags", flags: data.greenFlags, icon: "checkmark.circle.fill", tint: Theme.success)
            }
            .fadeUp(1)

            let lessons = MockData.shared.lessons.filter { $0.category == "Choosing Mentors" }
            if !lessons.isEmpty {
                VStack(alignment: .leading, spacing: Space.s) {
                    SectionHeader(title: "Learn to Spot Them", action: "Library") { store.push(.lessons) }
                    ForEach(lessons) { LessonCard(lesson: $0, row: true) }
                }
                .fadeUp(2)
            }
        }
    }

    private func flagList(title: String, flags: [MentorFlag], icon: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: Space.s) {
            SectionHeader(title: title)
            VStack(spacing: 0) {
                ForEach(Array(flags.enumerated()), id: \.offset) { i, f in
                    flagRow(icon: icon, tint: tint, title: f.title, detail: f.detail)
                    if i < flags.count - 1 { Divider().overlay(Theme.line) }
                }
            }
            .card(padding: 0)
        }
    }

    private func flagRow(icon: String, tint: Color, title: String, detail: String) -> some View {
        HStack(alignment: .top, spacing: Space.m) {
            Image(systemName: icon).font(.system(size: 15, weight: .semibold)).foregroundStyle(tint).padding(.top, 2)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink)
                Text(detail).font(.footnote).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, Space.l).padding(.vertical, 14)
        .accessibilityElement(children: .combine)
    }

    // MARK: Quiz

    @ViewBuilder private var quiz: some View {
        let index = answers.count
        if let q = data.questions[safe: index] {
            VStack(alignment: .leading, spacing: Space.l) {
                HStack {
                    Text("Question \(index + 1) of \(data.questions.count)")
                    Spacer()
                    Text("\(Int(Double(index) / Double(data.questions.count) * 100))%").monospacedDigit()
                }
                .font(.caption.weight(.medium)).foregroundStyle(Theme.muted)
                ProgressBar(value: Double(index) / Double(data.questions.count), label: "Mentor check progress")

                Text(q.question).font(.title2.weight(.heavy)).foregroundStyle(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, Space.s)
                    .id(q.id)
                    .transition(.opacity.combined(with: .move(edge: .trailing)))

                VStack(spacing: 10) {
                    ForEach(Array(q.options.enumerated()), id: \.offset) { i, o in
                        Button { choose(i) } label: {
                            HStack(spacing: Space.m) {
                                Text(String(UnicodeScalar(65 + i)!)).font(.caption.weight(.bold)).foregroundStyle(Theme.muted)
                                    .frame(width: 28, height: 28).background(Circle().fill(Theme.surface3))
                                Text(o.label).font(.callout.weight(.medium)).foregroundStyle(Theme.ink)
                                    .multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                                Spacer(minLength: 0)
                            }
                            .padding(.horizontal, Space.l).padding(.vertical, 14)
                            .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
                            .card(padding: 0)
                        }
                        .buttonStyle(.pressable)
                    }
                }
                .id("\(q.id)-options")

                Button {
                    Haptics.tap()
                    if answers.isEmpty { stage = .intro } else { answers.removeLast() }
                } label: { Label(index == 0 ? "Back to Intro" : "Previous Question", systemImage: "arrow.left") }
                    .buttonStyle(.fr(.ghost))
            }
            .frame(maxWidth: 620, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
    }

    private func choose(_ option: Int) {
        Haptics.select()
        answers.append(option)
        if answers.count == data.questions.count {
            let verdict = data.verdict(data.score(answers))
            Haptics.notify(verdict.id == "trust" ? .success : verdict.id == "caution" ? .warning : .error)
            stage = .result
        }
    }

    // MARK: Result

    private var result: some View {
        let score = data.score(answers)
        let verdict = data.verdict(score)
        let tone: Tone = verdict.id == "trust" ? .success : verdict.id == "caution" ? .warning : .danger
        let flagged = data.questions.enumerated()
            .compactMap { i, q -> (MentorQuestion, MentorOption)? in
                guard let o = q.options[safe: answers[safe: i] ?? -1], o.risk > 0 else { return nil }
                return (q, o)
            }
            .sorted { $0.1.risk > $1.1.risk }

        return VStack(alignment: .leading, spacing: Space.xl) {
            HStack(spacing: Space.l) {
                ProgressRing(value: Double(score) / 100, size: 118, label: "Risk score") {
                    VStack(spacing: 2) {
                        Text("\(score)").font(.number(30)).foregroundStyle(Theme.ink)
                        Text("RISK / 100").font(.caption2.weight(.bold)).tracking(1).foregroundStyle(Theme.faint)
                    }
                }
                VStack(alignment: .leading, spacing: 6) {
                    Badge(name.trimmingCharacters(in: .whitespaces).isEmpty ? "This mentor" : name, tone: tone)
                    Text(verdict.title).font(.title3.weight(.heavy)).foregroundStyle(tone.color)
                    Text(verdict.summary).font(.subheadline).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
                }
            }
            .card()
            .fadeUp(0)

            Adaptive2Col {
                VStack(alignment: .leading, spacing: Space.s) {
                    SectionHeader(title: "What to Do Next")
                    VStack(spacing: 0) {
                        ForEach(Array(verdict.next.enumerated()), id: \.offset) { i, step in
                            HStack(spacing: Space.m) {
                                Text("\(i + 1)").font(.caption.weight(.bold)).monospacedDigit().foregroundStyle(Theme.brand300)
                                    .frame(width: 28, height: 28).background(Circle().fill(Theme.brand500.opacity(0.15)))
                                Text(step).font(.subheadline).foregroundStyle(Theme.inkSoft).fixedSize(horizontal: false, vertical: true)
                                Spacer(minLength: 0)
                            }
                            .padding(.horizontal, Space.l).padding(.vertical, 14)
                            if i < verdict.next.count - 1 { Divider().overlay(Theme.line) }
                        }
                    }
                    .card(padding: 0)
                }
            } trailing: {
                VStack(alignment: .leading, spacing: Space.s) {
                    SectionHeader(title: flagged.isEmpty ? "Flags Found" : "Flags Found (\(flagged.count))")
                    if flagged.isEmpty {
                        Label("No red flags. Still apply their free content for a week before you pay.", systemImage: "checkmark.shield.fill")
                            .font(.subheadline).foregroundStyle(Theme.inkSoft)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .card(.completed)
                    } else {
                        VStack(spacing: 0) {
                            ForEach(Array(flagged.enumerated()), id: \.offset) { i, pair in
                                flagRow(icon: "exclamationmark.triangle.fill", tint: pair.1.risk == 2 ? Theme.danger : Theme.warning, title: pair.1.label, detail: pair.0.why)
                                if i < flagged.count - 1 { Divider().overlay(Theme.line) }
                            }
                        }
                        .card(padding: 0)
                    }
                }
            }
            .fadeUp(1)

            VStack(spacing: 10) {
                Button {
                    Haptics.tap()
                    answers = []
                    name = ""
                    stage = .intro
                } label: { Label("Check Another Mentor", systemImage: "arrow.counterclockwise") }
                    .buttonStyle(.fr(.primary, size: .lg, full: true))
                Button {
                    Haptics.tap()
                    store.tab = .coach
                } label: { Label("Ask the Coach", systemImage: "sparkles") }
                    .buttonStyle(.fr(.secondary, size: .lg, full: true))
            }
            .fadeUp(2)
        }
    }
}
