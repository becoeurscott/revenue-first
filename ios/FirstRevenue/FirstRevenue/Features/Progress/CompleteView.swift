import SwiftUI

/// Results shown on the celebration screen.
private struct CompleteResults {
    let missions, lessons, contacted, replies, clients, revenue: Int
    /// Fictitious sample results shown when someone previews the screen before finishing.
    static let showcase = CompleteResults(missions: 30, lessons: 28, contacted: 87, replies: 12, clients: 3, revenue: 850)
}

struct CompleteView: View {
    @Environment(AppStore.self) private var store
    @State private var showAdvanced = false
    @ScaledMetric(relativeTo: .largeTitle) private var headlineSize: CGFloat = 46

    private var firstName: String { store.s.user.firstName }

    private var results: CompleteResults {
        guard store.program.finished else { return .showcase }
        let st = store.stats
        return CompleteResults(missions: st.missions, lessons: st.lessons, contacted: st.contacted, replies: st.replies, clients: st.clients, revenue: st.revenue)
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
        .sheet(isPresented: $showAdvanced) { CompleteAdvancedSheet() }
        .onAppear { Haptics.notify(.success) }
    }

    // MARK: Sections

    private var hero: some View {
        VStack(spacing: Space.l) {
            MascotView(mood: .excited, size: 176, say: firstName.isEmpty ? "You did it!" : "You did it, \(firstName)!")
                .padding(.top, 40)
            Text("30 DAYS COMPLETE")
                .font(.system(size: headlineSize, weight: .heavy))
                .foregroundStyle(Theme.textGradient)
                .multilineTextAlignment(.center)
                .minimumScaleFactor(0.6)
                .fadeUp(1)
                .accessibilityAddTraits(.isHeader)
            Text("\(firstName.isEmpty ? "You" : "\(firstName), you") showed up for 30 days and built a real skill people pay for. Most people never get past day three.")
                .font(.body).foregroundStyle(Theme.muted).multilineTextAlignment(.center).frame(maxWidth: 440)
                .fadeUp(2)
            if !store.program.finished {
                Badge("Preview with sample results", tone: .info, systemImage: "eye")
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var shareText: String {
        let r = results
        return "I just finished the FirstRevenue 30-day \(store.program.path.name) program: \(r.missions) missions, \(r.contacted) prospects contacted, \(r.clients) \(r.clients == 1 ? "client" : "clients") and \(money(r.revenue)) earned."
    }

    private var stats: some View {
        let r = results
        return VStack(spacing: Space.l) {
            LazyVGrid(columns: adaptiveColumns(min: 150), spacing: Space.m) {
                CompleteCountStat(icon: "target", value: r.missions, label: "Missions completed")
                CompleteCountStat(icon: "play.rectangle.fill", value: r.lessons, label: "Lessons watched")
                CompleteCountStat(icon: "paperplane.fill", value: r.contacted, label: "Prospects contacted")
                CompleteCountStat(icon: "bubble.left.and.bubble.right.fill", value: r.replies, label: "Replies")
                CompleteCountStat(icon: "person.2.fill", value: r.clients, label: r.clients == 1 ? "Client" : "Clients")
                CompleteCountStat(icon: "dollarsign.circle.fill", value: r.revenue, label: "Earned", isMoney: true)
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
                Text("Pick a direction. You can change your mind later.").font(.callout).foregroundStyle(Theme.muted)
            }
            LazyVGrid(columns: adaptiveColumns(min: 220), spacing: Space.m) {
                CompleteOptionCard(icon: "play.fill", title: "Continue Your Path", detail: "Keep working your \(store.program.path.name) pipeline and grow the clients you have.", featured: true) {
                    finish(toast: "Your path stays open. Keep the momentum going.")
                }
                CompleteOptionCard(icon: "arrow.triangle.2.circlepath", title: "Switch Paths", detail: "Add a second income skill. Your progress here stays saved.") {
                    store.cover = nil
                    store.push(.paths, on: .home)
                }
                CompleteOptionCard(icon: "chart.line.uptrend.xyaxis", title: "Start Advanced Program", detail: "Scale from first revenue to a steady $2K/month.") {
                    showAdvanced = true
                }
            }
        }
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

// MARK: - Advanced program sheet (fictitious)

private struct CompleteAdvancedSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    private let weeks: [(title: String, body: String)] = [
        ("Productize your offer", "Turn one-off jobs into two fixed packages with clear scope and pricing."),
        ("Build a referral engine", "Testimonials, case studies and a simple ask that brings warm leads every week."),
        ("Retainers, not projects", "Convert your best clients to monthly plans so revenue stops resetting to zero."),
        ("Systems and leverage", "Templates, batching and your first subcontractor so you can take on more work."),
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Space.l) {
                VStack(alignment: .leading, spacing: Space.s) {
                    Text("Advanced: Scale to $2K/month").font(.title2).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                    Text("A second 30-day program for people who already have their first client.").font(.callout).foregroundStyle(Theme.muted)
                    HStack(spacing: 6) {
                        Badge("30 days", tone: .brand)
                        Badge("Intermediate", tone: .warning)
                        Badge("Waitlist open")
                    }
                    .padding(.top, 4)
                }
                ForEach(Array(weeks.enumerated()), id: \.offset) { i, w in weekRow(i, w.title, w.body) }
            }
            .padding(.horizontal, Space.xl)
            .padding(.top, Space.xl)
        }
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: 6) {
                Button {
                    dismiss()
                    store.showToast("You’re on the waitlist. We’ll notify you first.")
                } label: { Label("Join the waitlist", systemImage: "chart.line.uptrend.xyaxis") }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
                Text("Free to join. Opens to 30-day finishers first.").font(.caption).foregroundStyle(Theme.faint)
            }
            .padding(.horizontal, Space.xl).padding(.top, Space.m)
            .background(Theme.bgSunken)
        }
        .background(Theme.bgSunken.ignoresSafeArea())
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private func weekRow(_ i: Int, _ title: String, _ body: String) -> some View {
        HStack(alignment: .top, spacing: Space.m) {
            Text("\(i + 1)").font(.footnote.weight(.bold)).monospacedDigit().foregroundStyle(.white)
                .frame(width: 32, height: 32).background(Circle().fill(Theme.brandGradient))
            VStack(alignment: .leading, spacing: 2) {
                Text("WEEK \(i + 1)").font(.eyebrow).tracking(0.6).foregroundStyle(Theme.faint)
                Text(title).font(.body.weight(.semibold)).foregroundStyle(Theme.ink)
                Text(body).font(.footnote).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .card(padding: Space.m + 2)
        .accessibilityElement(children: .combine)
    }
}
