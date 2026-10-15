import SwiftUI

/// One result tile on the celebration screen.
private struct CompleteResult: Hashable {
    let icon: String
    let value: Int
    let label: String
    var isMoney = false
}

struct CompleteView: View {
    @Environment(AppStore.self) private var store
    @ScaledMetric(relativeTo: .largeTitle) private var headlineSize: CGFloat = 46

    private var firstName: String { store.s.user.firstName }
    private var earned: Bool { MonthCoach.diagnose(journey: store.journey, stats: store.stats) == .earned }

    /// The active journey's own numbers. Before finishing, fictitious sample results preview the screen.
    private var results: [CompleteResult] {
        let st = store.stats
        let real = store.program.finished
        let base = [CompleteResult(icon: "target", value: real ? st.missions : 30, label: "Missions completed"),
                    CompleteResult(icon: "play.rectangle.fill", value: real ? st.lessons : 28, label: "Lessons watched")]
        if let w = store.journey.workspace {
            let shown = ([w.doneMetric] + w.headline + w.logMetrics.prefix(1) + [w.incomeMetric]).uniqued().prefix(4)
            let samples = [8, 140, 960, 35]
            return base + shown.enumerated().map { i, m in
                let def = Journeys.metric(m)
                return CompleteResult(icon: def.icon, value: real ? st.value(m) : samples[i], label: def.label, isMoney: def.format == .money)
            }
        }
        return base + [
            CompleteResult(icon: "paperplane.fill", value: real ? st.contacted : 87, label: "Prospects contacted"),
            CompleteResult(icon: "bubble.left.and.bubble.right.fill", value: real ? st.replies : 12, label: "Replies"),
            CompleteResult(icon: "person.2.fill", value: real ? st.clients : 3, label: (real ? st.clients : 3) == 1 ? "Client" : "Clients"),
            CompleteResult(icon: "dollarsign.circle.fill", value: real ? st.revenue : 850, label: "Earned", isMoney: true),
        ]
    }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            RadialGradient(colors: [Theme.brand600.opacity(0.35), .clear], center: .top, startRadius: 0, endRadius: 420)
                .ignoresSafeArea()
                .accessibilityHidden(true)
            ScrollView {
                VStack(spacing: Space.xxl) {
                    hero
                    stats
                    if store.program.finished {
                        MonthReviewSection { startNextMonth() }
                    }
                    nextSteps
                    Button("Back to home") { finish(toast: nil) }.buttonStyle(.fr(.ghost))
                }
                .frame(maxWidth: 760)
                .padding(.horizontal, Space.gutter)
                .padding(.top, 72)
                .padding(.bottom, Space.xxl)
                .frame(maxWidth: .infinity)
            }
            ConfettiView(count: 90)
        }
        .overlay(alignment: .topTrailing) {
            IconButton(systemImage: "xmark", label: "Close") { store.cover = nil }
                .padding(.horizontal, Space.gutter).padding(.top, Space.s)
        }
        .onAppear { Haptics.notify(.success) }
    }

    // MARK: Sections

    private var hero: some View {
        VStack(spacing: Space.l) {
            MascotView(mood: .excited, size: 176, say: firstName.isEmpty ? "You did it!" : "You did it, \(firstName)!", entrance: .celebrate)
                .padding(.top, 40)
            Text("MONTH \(store.month) COMPLETE")
                .font(.system(size: headlineSize, weight: .heavy))
                .foregroundStyle(Theme.textGradient)
                .multilineTextAlignment(.center)
                .minimumScaleFactor(0.6)
                .fadeUp(1)
                .accessibilityAddTraits(.isHeader)
            Text(earned
                 ? "\(firstName.isEmpty ? "You" : "\(firstName), you") showed up for 30 days and earned real money. Most people never get past day three."
                 : "\(firstName.isEmpty ? "You" : "\(firstName), you") showed up for 30 days. No income yet is normal this early, and below is exactly what to change next.")
                .font(.body).foregroundStyle(Theme.muted).multilineTextAlignment(.center).frame(maxWidth: 440)
                .fadeUp(2)
            if !store.program.finished {
                Badge("Preview with sample results", tone: .info, systemImage: "eye")
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var shareText: String {
        let parts = results.map { "\($0.isMoney ? money($0.value) : $0.value.formatted()) \($0.label.lowercased())" }
        return "I just finished month \(store.month) of my Vaulten \(store.program.path.name) journey: \(parts.joined(separator: ", "))."
    }

    private var stats: some View {
        return VStack(spacing: Space.l) {
            LazyVGrid(columns: adaptiveColumns(min: 150), spacing: Space.m) {
                ForEach(results, id: \.label) { r in CompleteCountStat(icon: r.icon, value: r.value, label: r.label, isMoney: r.isMoney) }
            }
            ShareLink(item: shareText, subject: Text("30 days complete"), message: Text(shareText)) {
                Label("Share my results", systemImage: "square.and.arrow.up")
            }
            .buttonStyle(.fr(.secondary, size: .lg, full: true))
        }
    }

    private var nextSteps: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            VStack(alignment: .leading, spacing: 4) {
                Text("What happens next?").font(.title2).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                Text("Or pick another direction. You can change your mind later.").font(.callout).foregroundStyle(Theme.muted)
            }
            LazyVGrid(columns: adaptiveColumns(min: 220), spacing: Space.m) {
                if store.journey.sellsServices {
                    CompleteOptionCard(icon: "play.fill", title: "Continue Your Journey", detail: "Keep working your \(store.program.path.name) pipeline and grow the clients you have.") {
                        finish(toast: "Your journey stays open. Keep the momentum going.")
                    }
                } else {
                    CompleteOptionCard(icon: "play.fill", title: "Keep Publishing", detail: "Plan your next month on your board and keep your schedule.") {
                        store.cover = nil
                        store.push(.channel(.content), on: .home)
                    }
                }
                CompleteOptionCard(icon: "arrow.triangle.2.circlepath", title: "Add Another Journey", detail: "Add a second way to earn. Your progress here stays saved.") {
                    store.cover = nil
                    store.push(.paths, on: .home)
                }
                if !store.journey.sellsServices {
                    CompleteOptionCard(icon: "dollarsign.circle", title: "Next Monetization Step", detail: "See which income source fits your channel's stage now.") {
                        store.cover = nil
                        store.push(.channel(.monetization), on: .home)
                    }
                }
            }
        }
    }

    private func startNextMonth() {
        store.startNextMonth()
        Task { await store.syncProgram() }
        finish(toast: "Month \(store.month) starts today. Day 1 is ready.")
    }

    private func finish(toast: String?) {
        store.cover = nil
        store.popToRoot(.home)
        store.tab = .home
        if let toast { store.showToast(toast) }
    }
}

// MARK: - Count-up stat

private struct CompleteCountStat: View {
    let icon: String
    let value: Int
    let label: String
    var isMoney = false
    @State private var shown = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Image(systemName: icon).font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.brand300)
                .frame(width: 36, height: 36)
                .background(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous).fill(Theme.surface3))
                .padding(.bottom, 4)
            Text(isMoney ? money(shown) : shown.formatted())
                .font(.number(30))
                .foregroundStyle(isMoney ? AnyShapeStyle(Theme.textGradient) : AnyShapeStyle(Theme.ink))
                .lineLimit(1).minimumScaleFactor(0.6)
            Text(label).font(.footnote).foregroundStyle(Theme.muted).lineLimit(1)
        }
        .card(padding: Space.l)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(isMoney ? money(value) : value.formatted()) \(label)")
        .task(id: value) { await countUp() }
    }

    private func countUp() async {
        guard !reduceMotion, value > 0 else { shown = value; return }
        let frames = 45
        for i in 1...frames {
            try? await Task.sleep(for: .milliseconds(30))
            if Task.isCancelled { break }
            let t = Double(i) / Double(frames)
            shown = Int((Double(value) * (1 - pow(1 - t, 3))).rounded())
        }
        shown = value
    }
}

// MARK: - Option card

private struct CompleteOptionCard: View {
    let icon: String
    let title: String
    let detail: String
    var featured = false
    let action: () -> Void

    var body: some View {
        Button { Haptics.tap(); action() } label: {
            HStack(alignment: .top, spacing: Space.m) {
                Image(systemName: icon).font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(featured ? .white : Theme.brand300)
                    .frame(width: 44, height: 44)
                    .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(featured ? AnyShapeStyle(Theme.brandGradient) : AnyShapeStyle(Theme.brand500.opacity(0.12))))
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(.body.weight(.bold)).foregroundStyle(Theme.ink)
                    Text(detail).font(.footnote).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Theme.faint).padding(.top, 14)
            }
            .card(featured ? .selected : .plain, padding: Space.l)
        }
        .buttonStyle(.pressable)
    }
}
