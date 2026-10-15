import SwiftUI

// Pieces of the personal program shared by onboarding, the plan tab, missions and the unlock flow.

/// Title, summary and who wrote it.
struct ProgramHeaderCard: View {
    let program: GeneratedProgram
    var compact = false

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            HStack(spacing: Space.s) {
                Label(program.source == .ai ? "WRITTEN FOR YOU BY AI" : "PERSONALIZED FOR YOU", systemImage: "wand.and.stars")
                    .font(.eyebrow).tracking(0.8).foregroundStyle(Theme.brand300)
                Spacer(minLength: 0)
                if program.isComplete && !compact { Badge("30 days", tone: .success, systemImage: "checkmark") }
            }
            Text(program.title).font(compact ? .headline : .title3.weight(.heavy)).foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
            if !compact {
                Text(program.summary).font(.subheadline).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card(.hero)
    }
}

/// One week of written days: the week's outcome, then each day's title and objective.
struct ProgramWeekCard: View {
    let number: Int
    let week: ProgramWeek?
    let days: [ProgramDay]

    var body: some View {
        VStack(alignment: .leading, spacing: Space.m) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Week \(number)\(week.map { " · \($0.title)" } ?? "")").font(.section).foregroundStyle(Theme.ink)
                    .accessibilityAddTraits(.isHeader)
                if let outcome = week?.outcome, !outcome.isEmpty {
                    Text(outcome).font(.footnote).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
                }
            }
            VStack(spacing: 0) {
                ForEach(Array(days.enumerated()), id: \.element.day) { i, d in
                    HStack(alignment: .top, spacing: Space.m) {
                        Text("\(d.day)").font(.system(size: 13, weight: .bold, design: .rounded)).monospacedDigit().foregroundStyle(Theme.brand300)
                            .frame(width: 28, height: 28).background(Circle().fill(Theme.brand500.opacity(0.15)))
                        VStack(alignment: .leading, spacing: 2) {
                            Text(d.title).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                            Text(d.objective).font(.footnote).foregroundStyle(Theme.muted).lineLimit(2)
                        }
                        Spacer(minLength: 0)
                    }
                    .padding(.vertical, 10)
                    .accessibilityElement(children: .combine)
                    if i < days.count - 1 { Divider().overlay(Theme.line).padding(.leading, 40) }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }
}

/// Weeks 2–4 on the free plan. Nothing real is under the blur: those days are only written after
/// payment, so the cards are placeholders and can't be read even by turning the blur off.
struct ProgramLockedWeeks: View {
    var weeks: ClosedRange<Int> = 2...4
    let onUnlock: () -> Void

    var body: some View {
        VStack(spacing: Space.m) {
            ForEach(Array(weeks), id: \.self) { w in skeletonWeek(w) }
        }
        .blur(radius: 6)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
        .overlay { callToAction }
        .clipShape(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous))
    }

    private func skeletonWeek(_ week: Int) -> some View {
        VStack(alignment: .leading, spacing: Space.m) {
            HStack(spacing: Space.s) {
                Text("Week \(week)").font(.section).foregroundStyle(Theme.ink)
                Capsule().fill(Theme.muted.opacity(0.45)).frame(width: 110, height: 12)
            }
            ForEach(0..<3, id: \.self) { row in
                HStack(spacing: Space.m) {
                    Circle().fill(Theme.brand500.opacity(0.3)).frame(width: 28, height: 28)
                    VStack(alignment: .leading, spacing: 6) {
                        Capsule().fill(Theme.ink.opacity(0.45)).frame(width: [170, 140, 190][(row + week) % 3], height: 11)
                        Capsule().fill(Theme.muted.opacity(0.35)).frame(width: [230, 200, 250][(row + week) % 3], height: 9)
                    }
                    Spacer(minLength: 0)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }

    private var callToAction: some View {
        VStack(spacing: Space.m) {
            Image(systemName: "lock.fill").font(.system(size: 22, weight: .semibold)).foregroundStyle(.white)
                .frame(width: 56, height: 56).background(Circle().fill(Theme.brandGradient))
                .shadow(color: Theme.brand600.opacity(0.5), radius: 14)
            Text("Weeks 2 to 4 are locked").font(.title3.weight(.bold)).foregroundStyle(Theme.ink).multilineTextAlignment(.center)
            Text("\(MockData.totalDays - GeneratedProgram.freeDays) more missions, written for you the moment you unlock your program.")
                .font(.subheadline).foregroundStyle(Theme.muted).multilineTextAlignment(.center).frame(maxWidth: 300)
            Button { Haptics.tap(); onUnlock() } label: { Label("Unlock Full Program", systemImage: "crown.fill") }
                .buttonStyle(.fr(.primary, size: .lg))
        }
        .padding(Space.xl)
        .background(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).fill(Theme.bgRaised.opacity(0.9)))
        .overlay(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).strokeBorder(Theme.brand500.opacity(0.35)))
        .padding(Space.l)
    }
}

/// The program as far as the user is entitled: Week 1 open, then the rest open or locked.
struct ProgramOverview: View {
    let program: GeneratedProgram
    let unlocked: Bool
    let onUnlock: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Space.m) {
            ProgramHeaderCard(program: program)
            ForEach(1...4, id: \.self) { w in
                let days = program.days.filter { $0.week == w }
                if w == 1 || (unlocked && !days.isEmpty) {
                    ProgramWeekCard(number: w, week: program.week(w), days: days)
                }
            }
            if !unlocked { ProgramLockedWeeks(onUnlock: onUnlock) }
        }
    }
}

/// Today's AI-written how-to on the day and mission screens. Programs written on the device have no
/// steps (the checklist already covers them), so nothing is shown for those.
struct ProgramBriefCard: View {
    let day: Int
    @Environment(AppStore.self) private var store

    var body: some View {
        if let brief = store.generatedProgram?.day(day), !brief.steps.isEmpty {
            VStack(alignment: .leading, spacing: Space.s) {
                Label("YOUR PROGRAM · DAY \(day)", systemImage: "wand.and.stars").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.brand300)
                Text(brief.title).font(.headline).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                Text(brief.objective).font(.subheadline).foregroundStyle(Theme.inkSoft).fixedSize(horizontal: false, vertical: true)
                ForEach(Array(brief.steps.enumerated()), id: \.offset) { i, step in
                    HStack(alignment: .top, spacing: 10) {
                        Text("\(i + 1)").font(.caption.weight(.bold)).foregroundStyle(Theme.brand300)
                            .frame(width: 22, height: 22).background(Circle().fill(Theme.brand500.opacity(0.15)))
                        Text(step).font(.subheadline).foregroundStyle(Theme.inkSoft).fixedSize(horizontal: false, vertical: true)
                    }
                }
                Label(brief.tip, systemImage: "lightbulb.fill").font(.footnote).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
                Label("By the end: \(brief.deliverable)", systemImage: "flag.checkered").font(.footnote.weight(.semibold)).foregroundStyle(Theme.success)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .card()
            .accessibilityElement(children: .combine)
        }
    }
}
