import SwiftUI

// MARK: - Step content

struct CheckInStepContent: View {
    let step: CheckInStep
    let week: Int
    @Binding var answers: CheckInAnswers

    private static let quickPicks = ["Send more outreach", "Write better openers", "Follow up faster", "Be more consistent", "Price with confidence"]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("WEEK \(week) CHECK-IN").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.brand300)
            Image(systemName: step.icon)
                .font(.system(size: 24, weight: .semibold)).foregroundStyle(Theme.textGradient)
                .frame(width: 56, height: 56)
                .background(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).fill(Theme.surface))
                .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(Theme.line))
                .padding(.top, Space.l)
                .accessibilityHidden(true)
            Text(step.title).font(.title1).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                .padding(.top, Space.l).accessibilityAddTraits(.isHeader)
            Text(step.subtitle).font(.callout).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
                .padding(.top, Space.s)
            input.padding(.top, Space.xxl)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder private var input: some View {
        switch step.kind {
        case .accomplished: textInput(\.accomplished)
        case .difficult: textInput(\.difficult)
        case .improve:
            VStack(alignment: .leading, spacing: Space.l) {
                textInput(\.improve)
                quickPickChips
            }
        case .prospects:
            CheckInCounter(value: $answers.prospects, label: "Prospects contacted")
        case .replies:
            VStack(spacing: Space.xl) {
                CheckInCounter(value: $answers.replies, label: "Replies received")
                repliesNote
            }
        case .madeMoney:
            HStack(spacing: Space.m) {
                moneyChoice(true, icon: "banknote.fill", title: "Yes", note: "Money came in")
                moneyChoice(false, icon: "leaf.fill", title: "Not yet", note: "Still planting seeds")
            }
        }
    }

    private func textInput(_ key: WritableKeyPath<CheckInAnswers, String>) -> some View {
        let text = answers[keyPath: key]
        let binding = Binding(get: { answers[keyPath: key] }, set: { answers[keyPath: key] = String($0.prefix(400)) })
        return VStack(alignment: .leading, spacing: 6) {
            FRTextArea(label: "Your answer", text: binding, placeholder: step.placeholder, minHeight: 140)
            Text(text.trimmingCharacters(in: .whitespacesAndNewlines).count < 3 ? "Write at least a few words to continue." : "\(text.count)/400")
                .font(.caption).monospacedDigit().foregroundStyle(Theme.faint)
        }
    }

    private var quickPickChips: some View {
        FlowLayout(spacing: 8) {
            ForEach(Self.quickPicks, id: \.self) { q in
                let on = answers.improve.contains(q)
                Button {
                    Haptics.select()
                    let base = answers.improve.trimmingCharacters(in: .whitespacesAndNewlines)
                    answers.improve = String((base.isEmpty ? q : "\(base). \(q)").prefix(400))
                } label: {
                    Label(q, systemImage: on ? "checkmark" : "plus")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(on ? Theme.brand300 : Theme.muted)
                        .padding(.horizontal, 14).frame(minHeight: 40)
                        .background(Capsule().fill(on ? Theme.brand500.opacity(0.15) : Theme.surface))
                        .overlay(Capsule().strokeBorder(on ? Theme.brand500.opacity(0.5) : Theme.line))
                }
                .buttonStyle(.pressable)
                .disabled(on)
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
    }

    private var repliesNote: some View {
        let a = answers
        let over = a.replies > a.prospects
        let text = over
            ? "That is more replies than the \(a.prospects) prospects you contacted."
            : a.prospects > 0
                ? "\(Int((Double(a.replies) / Double(a.prospects) * 100).rounded()))% reply rate on \(a.prospects) contacted."
                : "No outreach yet — replies start with the first message."
        return Text(text)
            .font(.footnote).multilineTextAlignment(.center)
            .foregroundStyle(over ? Theme.danger : Theme.faint)
            .frame(maxWidth: .infinity)
            .animation(.snappy, value: over)
    }

    private func moneyChoice(_ value: Bool, icon: String, title: String, note: String) -> some View {
        let on = answers.moneyAnswered && answers.madeMoney == value
        return Button {
            Haptics.select()
            withAnimation(.snappy) { answers.madeMoney = value; answers.moneyAnswered = true }
        } label: {
            VStack(spacing: 6) {
                Image(systemName: icon).font(.system(size: 34, weight: .semibold))
                    .foregroundStyle(on ? AnyShapeStyle(Theme.textGradient) : AnyShapeStyle(Theme.muted))
                    .symbolEffect(.bounce, value: on)
                    .padding(.bottom, 6)
                Text(title).font(.title3.weight(.bold)).foregroundStyle(Theme.ink)
                Text(note).font(.footnote).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Space.xxl)
            .padding(.horizontal, Space.m)
            .card(on ? .selected : .plain, padding: 0)
        }
        .buttonStyle(.pressable)
        .accessibilityAddTraits(on ? [.isSelected] : [])
        .accessibilityLabel("\(title), \(note)")
    }
}

// MARK: - Big number stepper

struct CheckInCounter: View {
    @Binding var value: Int
    let label: String

    var body: some View {
        HStack(spacing: Space.xl) {
            roundButton("minus", label: "Decrease") { set(value - 1) }.disabled(value <= 0)
            Text("\(value)")
                .font(.number(64)).foregroundStyle(Theme.ink)
                .contentTransition(.numericText(value: Double(value)))
                .frame(minWidth: 110)
                .lineLimit(1).minimumScaleFactor(0.6)
            roundButton("plus", label: "Increase") { set(value + 1) }.disabled(value >= 999)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label)
        .accessibilityValue("\(value)")
        .accessibilityAdjustableAction { dir in set(dir == .increment ? value + 1 : value - 1) }
    }

    private func set(_ n: Int) {
        Haptics.select()
        withAnimation(.snappy) { value = min(max(n, 0), 999) }
    }

    private func roundButton(_ icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon).font(.system(size: 22, weight: .bold)).foregroundStyle(Theme.ink)
                .frame(width: 60, height: 60)
                .background(Circle().fill(Theme.surface))
                .overlay(Circle().strokeBorder(Theme.lineStrong))
        }
        .buttonStyle(.pressable)
        .buttonRepeatBehavior(.enabled)
        .accessibilityLabel(label)
    }
}

// MARK: - Weekly summary

struct CheckInSummaryData {
    let wins: [String]
    let challenges: [String]
    let focus: [String]
    let rate: Int

    /// Turns raw answers + live stats into the three summary lists. Pure, so an API can replace it later.
    init(_ a: CheckInAnswers, stats: Stats) {
        func sentence(_ t: String) -> String {
            let s = t.trimmingCharacters(in: .whitespacesAndNewlines).split(whereSeparator: \.isWhitespace).joined(separator: " ")
            return s.prefix(1).uppercased() + s.dropFirst()
        }
        let rate = a.prospects > 0 ? Int((Double(a.replies) / Double(a.prospects) * 100).rounded()) : 0

        var wins = [sentence(a.accomplished)]
        if stats.daysCompleted > 0 { wins.append("\(stats.daysCompleted) \(stats.daysCompleted == 1 ? "mission" : "missions") completed on your plan") }
        if a.prospects > 0 { wins.append("You contacted \(a.prospects) \(a.prospects == 1 ? "prospect" : "prospects") — most beginners never send one message") }
        if a.replies > 0 { wins.append("\(a.replies) \(a.replies == 1 ? "reply" : "replies") received (\(rate)% reply rate)") }
        if a.madeMoney { wins.append(stats.revenue > 0 ? "You made money — \(money(stats.revenue)) collected so far" : "You made money this week") }
        if stats.streak >= 3 { wins.append("\(stats.streak)-day streak and counting") }

        var challenges = [sentence(a.difficult)]
        if a.prospects > 0 && a.replies == 0 { challenges.append("No replies yet — normal below 20 messages, but worth testing a new opener") }
        else if a.prospects >= 5 && rate < 10 { challenges.append("Reply rate is \(rate)% — the first line of your message is not landing yet") }
        if a.prospects < 5 { challenges.append("Outreach volume is low — results come from conversations, not preparation") }
        if !a.madeMoney { challenges.append("No revenue yet — that is expected this early, and fixable with more conversations") }

        var focus: [String] = []
        if a.prospects < 5 { focus.append("Contact at least 10 new prospects before anything else") }
        else if rate < 10 { focus.append("Rewrite your opener and send 10 more") }
        else if !a.madeMoney { focus.append("Follow up with every reply and make one clear, priced offer") }
        if a.madeMoney { focus.append("Ask your client for a testimonial and pitch a monthly retainer") }
        focus.append("Your own focus: \(sentence(a.improve))")
        if focus.count < 3 { focus.append("Finish every daily mission — keep the streak alive") }

        self.wins = wins
        self.challenges = challenges
        self.focus = focus
        self.rate = rate
    }
}

struct CheckInSummaryView: View {
    let week: Int
    let answers: CheckInAnswers
    let stats: Stats
    let onContinue: () -> Void
    @State private var xpShown = false

    var body: some View {
        let s = CheckInSummaryData(answers, stats: stats)
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: Space.l) {
                    header
                    numbers(s)
                    CheckInSummaryBlock(icon: "trophy.fill", tint: Theme.success, title: "Wins", items: s.wins).fadeUp(1)
                    CheckInSummaryBlock(icon: "exclamationmark.triangle.fill", tint: Theme.warning, title: "Challenges", items: s.challenges).fadeUp(2)
                    CheckInSummaryBlock(icon: "safari.fill", tint: Theme.brand300, title: "Next week’s focus", items: s.focus).fadeUp(3)
                }
                .padding(.horizontal, Space.gutter)
                .padding(.top, Space.s)
                .padding(.bottom, Space.xl)
            }
            BottomBar {
                Button(action: onContinue) {
                    Label("Continue My Plan", systemImage: "arrow.right").labelStyle(TrailingIconLabel())
                }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
            }
        }
        .onAppear { withAnimation(.bouncy.delay(0.3)) { xpShown = true } }
    }

    private var header: some View {
        VStack(spacing: Space.s) {
            MascotView(mood: answers.madeMoney ? .excited : .happy, size: 104)
            Text("WEEK \(week) · WEEKLY SUMMARY").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.brand300).padding(.top, Space.s)
            Text("Here’s how your week went").font(.title1).foregroundStyle(Theme.ink).multilineTextAlignment(.center)
            Label("+50 XP", systemImage: "bolt.fill")
                .font(.footnote.weight(.bold)).foregroundStyle(Theme.brand300)
                .padding(.horizontal, 14).frame(height: 32)
                .background(Capsule().fill(Theme.brand500.opacity(0.15)))
                .overlay(Capsule().strokeBorder(Theme.brand500.opacity(0.3)))
                .scaleEffect(xpShown ? 1 : 0.4).opacity(xpShown ? 1 : 0)
                .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
    }

    private func numbers(_ s: CheckInSummaryData) -> some View {
        HStack(spacing: Space.m) {
            tile("\(answers.prospects)", "Contacted")
            tile("\(answers.replies)", "Replies")
            tile("\(s.rate)%", "Reply rate")
        }
    }

    private func tile(_ value: String, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.number(24)).foregroundStyle(Theme.ink).lineLimit(1).minimumScaleFactor(0.6)
            Text(label).font(.caption).foregroundStyle(Theme.muted).lineLimit(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Space.m)
        .background(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).fill(Theme.surface))
        .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(Theme.line))
        .accessibilityElement(children: .combine)
    }
}

private struct CheckInSummaryBlock: View {
    let icon: String
    let tint: Color
    let title: String
    let items: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: Space.m) {
            HStack(spacing: Space.m) {
                Image(systemName: icon).font(.system(size: 15, weight: .semibold)).foregroundStyle(tint)
                    .frame(width: 36, height: 36)
                    .background(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous).fill(tint.opacity(0.12)))
                Text(title).font(.section).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
            }
            ForEach(Array(items.enumerated()), id: \.offset) { _, t in
                HStack(alignment: .firstTextBaseline, spacing: Space.s + 2) {
                    Circle().fill(Theme.brand400).frame(width: 6, height: 6).alignmentGuide(.firstTextBaseline) { d in d[VerticalAlignment.center] + 4 }
                    Text(t).font(.subheadline).foregroundStyle(Theme.inkSoft).fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .card()
    }
}
