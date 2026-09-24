import SwiftUI
import Charts

struct RevenueView: View {
    @Environment(AppStore.self) private var store
    @State private var loading = true
    @State private var filter = "All"
    @State private var adding = false
    @State private var activeDeal: Deal?
    @State private var celebrate = false

    private var sorted: [Deal] { store.s.deals.sorted { $0.date > $1.date } }
    private var visible: [Deal] { sorted.filter { filter == "All" || $0.status.rawValue == filter } }

    var body: some View {
        Screen(title: "Revenue", subtitle: "Every dollar, from first chat to paid.", large: true) {
            if store.s.deals.isEmpty && !loading {
                emptyState
            } else {
                content
            }
        }
        .overlay { if celebrate { ConfettiView() } }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { adding = true } label: { Image(systemName: "plus") }
                    .accessibilityLabel("Add deal")
            }
        }
        .sheet(isPresented: $adding) { RevenueAddDealSheet() }
        .confirmationDialog(dialogTitle, isPresented: dialogBinding, titleVisibility: .visible, presenting: activeDeal) { d in
            dealActions(d)
        } message: { d in
            Text(d.status == .collected ? "Paid in full. Nice work." : "\(d.service) · updated \(d.date.timeAgo.lowercased())")
        }
        .task {
            try? await Task.sleep(for: .milliseconds(450))
            withAnimation(.snappy) { loading = false }
        }
        .task(id: celebrate) {
            guard celebrate else { return }
            try? await Task.sleep(for: .seconds(2))
            celebrate = false
        }
    }

    private var emptyState: some View {
        EmptyStateView(title: "No revenue yet", message: "Your first deal starts with a conversation. Mark a prospect as Interested and it shows up here automatically.") {
            VStack(spacing: Space.s) {
                Button { store.push(.outreach(.prospects)) } label: { Label("Go to prospects", systemImage: "arrow.right").labelStyle(TrailingIconLabel()) }
                    .buttonStyle(.fr(.primary))
                Button("Add a deal manually") { adding = true }
                    .buttonStyle(.fr(.ghost))
            }
        }
    }

    private var content: some View {
        let stats = store.stats
        return VStack(alignment: .leading, spacing: Space.xl) {
            Adaptive2Col(spacing: Space.l, leadingWeight: 0.55) {
                RevenueHeroCard(collected: stats.revenue, goal: max(store.s.user.goalAmount, 1)).fadeUp(0)
            } trailing: {
                statGrid(stats).fadeUp(1)
            }
            VStack(alignment: .leading, spacing: Space.s) {
                SectionHeader(title: "Pipeline")
                RevenuePipelineChart(deals: store.s.deals).card().fadeUp(2)
            }
            dealsSection
        }
    }

    private func statGrid(_ stats: Stats) -> some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: Space.m), GridItem(.flexible(), spacing: Space.m)], spacing: Space.m) {
            StatCard(icon: "leaf.fill", value: money(stats.potential), label: "Potential")
            StatCard(icon: "calendar.badge.checkmark", value: money(stats.booked), label: "Booked")
            StatCard(icon: "person.2.fill", value: "\(stats.clients)", label: "Clients") { store.push(.outreach(.prospects)) }
            StatCard(icon: "target", value: "\(stats.conversion)%", label: "Conversion rate")
        }
    }

    // MARK: Deals

    private var dealsSection: some View {
        let deals = store.s.deals
        return VStack(alignment: .leading, spacing: Space.m) {
            SectionHeader(title: "Recent deals", action: "Add deal") { adding = true }
            FilterChips(options: ["All"] + DealStatus.allCases.map(\.rawValue), selection: $filter) { opt in
                opt == "All" ? deals.count : deals.filter { $0.status.rawValue == opt }.count
            }
            dealList
        }
    }

    @ViewBuilder private var dealList: some View {
        if loading {
            SkeletonList(count: 3)
        } else if visible.isEmpty {
            EmptyStateView(title: "No \(filter.lowercased()) deals", message: "Deals move here as you update their status.", mood: .thinking, compact: true) {
                Button("Show all deals") { withAnimation(.snappy) { filter = "All" } }.buttonStyle(.fr(.secondary))
            }
        } else {
            LazyVGrid(columns: adaptiveColumns(min: 320), spacing: Space.m) {
                ForEach(Array(visible.enumerated()), id: \.element.id) { i, d in
                    RevenueDealRow(deal: d) { activeDeal = d }.fadeUp(i)
                }
            }
        }
    }

    private var dialogTitle: String { activeDeal.map { "\($0.client) · \(money($0.amount))" } ?? "Deal" }

    private var dialogBinding: Binding<Bool> {
        Binding(get: { activeDeal != nil }, set: { if !$0 { activeDeal = nil } })
    }

    @ViewBuilder private func dealActions(_ d: Deal) -> some View {
        if d.status == .potential { Button("Mark Booked") { move(d, .booked) } }
        if d.status != .collected { Button("Mark Collected") { move(d, .collected) } }
        if d.status == .booked { Button("Move back to Potential") { move(d, .potential) } }
        if let pid = d.prospectId, store.s.prospects.contains(where: { $0.id == pid }) {
            Button("View prospect") { store.push(.prospect(pid)) }
        }
        Button("Cancel", role: .cancel) {}
    }

    private func move(_ d: Deal, _ status: DealStatus) {
        withAnimation(.snappy) { store.setDealStatus(d.id, status) }
        if status == .collected {
            celebrate = true
            store.showToast("\(money(d.amount)) collected from \(d.client)!")
        } else {
            store.showToast("\(d.client) marked as \(status.rawValue)")
        }
    }
}

// MARK: - Hero

private struct RevenueHeroCard: View {
    let collected: Int
    let goal: Int

    var body: some View {
        let pct = Int((Double(collected) / Double(goal) * 100).rounded())
        let remaining = max(goal - collected, 0)
        VStack(alignment: .leading, spacing: Space.l) {
            VStack(alignment: .leading, spacing: 4) {
                Text("COLLECTED").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.brand300)
                Text(money(collected)).font(.number(48)).foregroundStyle(Theme.textGradient)
                    .lineLimit(1).minimumScaleFactor(0.6)
                    .contentTransition(.numericText())
            }
            Spacer(minLength: 0)
            VStack(alignment: .leading, spacing: Space.s) {
                ProgressBar(value: Double(collected) / Double(goal), tone: .brand, height: 10, label: "Progress toward your first \(money(goal))")
                HStack {
                    (Text("\(pct)%").fontWeight(.semibold).foregroundStyle(Theme.ink) + Text(" of your first \(money(goal))"))
                    Spacer()
                    if remaining > 0 { Text("\(money(remaining)) to go") } else { Label("Goal reached", systemImage: "checkmark.seal.fill").foregroundStyle(Theme.success) }
                }
                .font(.footnote).monospacedDigit().foregroundStyle(Theme.muted)
            }
        }
        .frame(maxHeight: .infinity)
        .card(.hero)
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Chart

private struct RevenuePipelineChart: View {
    let deals: [Deal]
    @State private var grown = false

    private struct Bar: Identifiable {
        let status: DealStatus
        let amount: Int
        let count: Int
        var id: String { status.rawValue }
        var hint: String {
            switch status {
            case .potential: "In conversation"
            case .booked: "Agreed, not paid"
            case .collected: "Money received"
            }
        }
    }

    private var bars: [Bar] {
        DealStatus.allCases.map { s in
            let matching = deals.filter { $0.status == s }
            return Bar(status: s, amount: matching.reduce(0) { $0 + $1.amount }, count: matching.count)
        }
    }

    private func style(_ s: DealStatus) -> AnyShapeStyle {
        switch s {
        case .potential: AnyShapeStyle(Theme.surface3)
        case .booked: AnyShapeStyle(Theme.warning.opacity(0.8))
        case .collected: AnyShapeStyle(Theme.brandGradient)
        }
    }

    var body: some View {
        let data = bars
        let top = Double(max(data.map(\.amount).max() ?? 0, 1)) * 1.25
        VStack(spacing: Space.m) {
            chart(data, top: top)
            legend(data)
        }
        .onAppear { withAnimation(.easeOut(duration: 0.9)) { grown = true } }
    }

    private func chart(_ data: [Bar], top: Double) -> some View {
        Chart(data) { bar in
            BarMark(x: .value("Stage", bar.status.rawValue), y: .value("Amount", grown ? bar.amount : 0), width: .ratio(0.55))
                .foregroundStyle(style(bar.status))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                .annotation(position: .top, spacing: 6) {
                    Text(money(bar.amount)).font(.subheadline.weight(.heavy)).monospacedDigit().foregroundStyle(Theme.ink)
                }
                .accessibilityLabel(bar.status.rawValue)
                .accessibilityValue("\(money(bar.amount)) across \(bar.count) deal\(bar.count == 1 ? "" : "s")")
        }
        .chartYScale(domain: 0...top)
        .chartYAxis(.hidden)
        .chartXAxis {
            AxisMarks { _ in
                AxisValueLabel().font(.footnote.weight(.semibold)).foregroundStyle(Theme.muted)
            }
        }
        .frame(height: 190)
    }

    private func legend(_ data: [Bar]) -> some View {
        HStack(alignment: .top) {
            ForEach(data) { bar in
                Text("\(bar.count) deal\(bar.count == 1 ? "" : "s") · \(bar.hint)")
                    .font(.caption2).foregroundStyle(Theme.faint)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
            }
        }
        .accessibilityHidden(true)
    }
}

// MARK: - Deal row

private struct RevenueDealRow: View {
    let deal: Deal
    let open: () -> Void

    var body: some View {
        Button { Haptics.tap(); open() } label: {
            HStack(spacing: Space.m) {
                AvatarView(name: deal.client, size: 40)
                VStack(alignment: .leading, spacing: 2) {
                    Text(deal.client).font(.body.weight(.semibold)).foregroundStyle(Theme.ink).lineLimit(1)
                    Text(deal.service).font(.footnote).foregroundStyle(Theme.muted).lineLimit(1)
                    Text(deal.date.timeAgo).font(.caption).monospacedDigit().foregroundStyle(Theme.faint)
                }
                Spacer(minLength: 8)
                VStack(alignment: .trailing, spacing: 6) {
                    Text(money(deal.amount)).font(.body.weight(.heavy)).monospacedDigit().foregroundStyle(Theme.ink)
                        .contentTransition(.numericText())
                    Badge(deal.status.rawValue, tone: deal.status.tone)
                }
            }
            .card(padding: Space.l)
        }
        .buttonStyle(.pressable)
        .accessibilityElement(children: .combine)
        .accessibilityHint("Update the deal status")
    }
}

// MARK: - Add deal sheet

private struct RevenueAddDealSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var client = ""
    @State private var service = ""
    @State private var amount = ""
    @State private var status: DealStatus = .potential
    @State private var touched = false

    private var services: [String] { MockData.shared.generatorOptions.services[store.s.pathId.rawValue] ?? [] }
    private var amountValue: Int { Int(amount.filter(\.isNumber)) ?? 0 }
    private var clientError: String? { touched && client.trimmingCharacters(in: .whitespaces).isEmpty ? "Add the client name" : nil }
    private var amountError: String? { touched && amountValue <= 0 ? "Enter an amount above $0" : nil }

    var body: some View {
        NavigationStack {
            ScrollView {
                form
                    .padding(Space.xl)
                    .frame(maxWidth: 620)
                    .frame(maxWidth: .infinity)
            }
            .navigationTitle("Add deal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Save", action: save).fontWeight(.semibold) }
            }
            .outreachSheetChrome()
        }
        .onAppear { if service.isEmpty { service = services.first ?? "" } }
    }

    private var form: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            Text("Track money from the first conversation to the payment.").font(.subheadline).foregroundStyle(Theme.muted)
            FRTextField(label: "Client", text: $client, placeholder: "Client name", systemImage: "person", error: clientError)
            SelectRow(label: "Service", selection: $service, options: services)
            FRTextField(label: "Amount ($)", text: $amount, placeholder: "150", systemImage: "dollarsign", error: amountError, keyboard: .numberPad)
            VStack(alignment: .leading, spacing: 6) {
                Text("Status").font(.footnote.weight(.medium)).foregroundStyle(Theme.muted)
                SegmentedTabs(options: DealStatus.allCases, selection: $status, title: { $0.rawValue })
            }
            Button("Save deal", action: save)
                .buttonStyle(.fr(.primary, size: .lg, full: true))
                .padding(.top, Space.s)
        }
        .animation(.snappy, value: touched)
    }

    private func save() {
        touched = true
        let name = client.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty, amountValue > 0 else { Haptics.notify(.error); return }
        store.addDeal(client: name, service: service.isEmpty ? (services.first ?? "Service") : service, amount: amountValue, status: status)
        dismiss()
        store.showToast("\(money(amountValue)) deal added as \(status.rawValue)")
    }
}
