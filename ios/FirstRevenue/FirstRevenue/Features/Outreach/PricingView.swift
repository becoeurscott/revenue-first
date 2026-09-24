import SwiftUI

struct PricingView: View {
    var body: some View {
        Screen(title: "Pricing Assistant", subtitle: "Answer five quick questions and get a price you can quote with confidence.") {
            PremiumGate(feature: "Pricing Assistant", message: "Get a recommended price range, a breakdown and negotiation tips for any job.") {
                PricingCalculator()
            }
        }
    }
}

private struct PricingCalculator: View {
    @Environment(AppStore.self) private var store
    @State private var didInit = false
    @State private var service = ""
    @State private var experience = ""
    @State private var clientSize = ""
    @State private var scope = ""
    @State private var turnaround = ""

    private var data: PricingData { MockData.shared.pricing }
    private var pathOptions: PricingPathOptions? { data.options[store.s.pathId.rawValue] }

    private var result: PriceRecommendation {
        PricingEngine.recommend(path: store.s.pathId, service: service, experience: experience, clientSize: clientSize, scope: scope, turnaround: turnaround)
    }

    var body: some View {
        let r = result
        Adaptive2Col(leadingWeight: 0.46) {
            form
        } trailing: {
            PricingResultCard(result: r)
            tips(r)
            Text(data.disclaimer).font(.caption).foregroundStyle(Theme.faint).padding(.horizontal, 4)
        }
        .onAppear(perform: setup)
    }

    private var form: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            Text("About the job").font(.section).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
            SelectRow(label: "Service", selection: $service, options: pathOptions?.services.map(\.label) ?? [])
            SelectRow(label: "Your experience", selection: $experience, options: data.experienceLevels.map(\.label))
            SelectRow(label: "Client size", selection: $clientSize, options: data.clientSizes.map(\.label))
            SelectRow(label: "Work scope", selection: $scope, options: pathOptions?.scopes.map(\.label) ?? [])
            SelectRow(label: "Turnaround", selection: $turnaround, options: data.turnarounds.map(\.label))
        }
        .card()
        .fadeUp(0)
    }

    private func tips(_ r: PriceRecommendation) -> some View {
        VStack(alignment: .leading, spacing: Space.m) {
            Label("Pricing tips", systemImage: "lightbulb.fill")
                .font(.headline).foregroundStyle(Theme.ink)
                .symbolRenderingMode(.multicolor)
                .accessibilityAddTraits(.isHeader)
            ForEach(Array(r.tips.enumerated()), id: \.offset) { i, tip in
                HStack(alignment: .top, spacing: Space.m) {
                    Text("\(i + 1)").font(.caption2.weight(.bold)).monospacedDigit().foregroundStyle(Theme.brand300)
                        .frame(width: 22, height: 22).background(Circle().fill(Theme.brand500.opacity(0.15)))
                        .accessibilityHidden(true)
                    Text(tip).font(.subheadline).foregroundStyle(Theme.inkSoft).fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .card()
        .fadeUp(2)
    }

    private func setup() {
        guard !didInit else { return }
        didInit = true
        service = pathOptions?.services.first?.label ?? ""
        experience = data.experienceLevels.first?.label ?? ""
        clientSize = data.clientSizes.first?.label ?? ""
        scope = pathOptions?.scopes.first?.label ?? ""
        turnaround = data.turnarounds.first?.label ?? ""
    }
}

private struct PricingResultCard: View {
    let result: PriceRecommendation
    @Environment(AppStore.self) private var store

    var body: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            price
            breakdown
            Text(result.rationale).font(.subheadline).foregroundStyle(Theme.inkSoft).lineSpacing(2)
                .fixedSize(horizontal: false, vertical: true)
            buttons
        }
        .card(.hero)
        .fadeUp(1)
    }

    private var price: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("RECOMMENDED STARTING PRICE").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.brand300)
            Text("\(money(result.low))–\(money(result.high))")
                .font(.number(42))
                .foregroundStyle(Theme.textGradient)
                .lineLimit(1).minimumScaleFactor(0.6)
                .contentTransition(.numericText())
                .animation(.snappy, value: result.low)
            (Text("Quote ") + Text(money(result.mid)).fontWeight(.semibold).foregroundStyle(Theme.ink) + Text(" as your target price."))
                .font(.subheadline).monospacedDigit().foregroundStyle(Theme.muted)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Recommended starting price \(money(result.low)) to \(money(result.high)). Target \(money(result.mid)).")
    }

    private var breakdown: some View {
        let rows = Array(result.breakdown.enumerated()).filter { $0.element.amount != 0 }
        return VStack(spacing: 0) {
            ForEach(rows, id: \.element.label) { i, row in
                breakdownRow(row.label, (i == 0 ? "" : "+") + money(row.amount), strong: false)
                Divider().overlay(Theme.line)
            }
            breakdownRow("Target price", money(result.mid), strong: true)
        }
        .animation(.snappy, value: result)
    }

    private func breakdownRow(_ label: String, _ value: String, strong: Bool) -> some View {
        HStack {
            Text(label).font(strong ? .subheadline.weight(.semibold) : .subheadline).foregroundStyle(strong ? Theme.ink : Theme.muted)
            Spacer()
            Text(value).font(strong ? .body.weight(.heavy) : .subheadline.weight(.semibold)).monospacedDigit().foregroundStyle(Theme.ink)
                .contentTransition(.numericText())
        }
        .padding(.vertical, 10)
        .accessibilityElement(children: .combine)
    }

    private var buttons: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 10) { proposalButton; coachButton }
            VStack(spacing: 10) { proposalButton; coachButton }
        }
    }

    private var proposalButton: some View {
        Button { store.push(.resource("res-proposal-template")) } label: { Label("Use in a proposal", systemImage: "doc.text") }
            .buttonStyle(.fr(.primary, full: true))
    }

    private var coachButton: some View {
        Button { store.tab = .coach } label: { Label("Ask the coach", systemImage: "sparkles") }
            .buttonStyle(.fr(.secondary, full: true))
    }
}
