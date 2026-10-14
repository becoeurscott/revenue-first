import SwiftUI

/// The workspace of a non-service journey: a board that moves items to "done" (videos to published,
/// products to launched), the numbers the user copies from their dashboard, and income by growth stage.
/// Every label and stage comes from the journey's `Workspace` config.
struct ChannelHubView: View {
    let initialTab: ChannelTab
    @Environment(AppStore.self) private var store
    @State private var tab: ChannelTab = .content
    @State private var didSetTab = false

    var body: some View {
        if let w = store.journey.workspace {
            Screen(title: w.title, subtitle: store.niche.map { "\($0.normalizedLabel) · \(store.journey.primaryAction)" }) {
                VStack(alignment: .leading, spacing: Space.l) {
                    SegmentedTabs(options: ChannelTab.allCases, selection: $tab, title: { w.tab($0) })
                    switch tab {
                    case .content: WorkspaceBoardTab(w: w)
                    case .analytics: WorkspaceNumbersTab(w: w)
                    case .monetization: WorkspaceIncomeTab(w: w)
                    }
                }
            }
            .onAppear { if !didSetTab { tab = initialTab; didSetTab = true } }
        }
    }
}

// MARK: - Board

private struct WorkspaceBoardTab: View {
    let w: Workspace
    @Environment(AppStore.self) private var store
    @State private var filter = "All"
    @State private var adding = false
    @State private var editing: ContentItem?
    @State private var finishing: ContentItem?

    private var items: [ContentItem] { store.enrollment?.contentItems ?? [] }
    private var shown: [ContentItem] { filter == "All" ? items : items.filter { w.stage($0.stage).label == filter } }

    var body: some View {
        let stats = store.stats
        VStack(alignment: .leading, spacing: Space.l) {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: Space.m), GridItem(.flexible(), spacing: Space.m)], spacing: Space.m) {
                StatCard(icon: Journeys.metric(w.doneMetric).icon, value: stats.display(w.doneMetric), label: Journeys.metric(w.doneMetric).label, accent: true)
                StatCard(icon: Journeys.metric(w.weeklyMetric).icon, value: stats.display(w.weeklyMetric), label: Journeys.metric(w.weeklyMetric).label)
            }
            Button { adding = true } label: { Label(w.addLabel, systemImage: "plus") }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
            FilterChips(options: ["All"] + w.stages.map(\.label), selection: $filter) { opt in
                opt == "All" ? items.count : items.filter { w.stage($0.stage).label == opt }.count
            }
            if shown.isEmpty {
                EmptyStateView(title: items.isEmpty ? w.emptyTitle : "Nothing at this stage",
                               message: items.isEmpty ? "Add the first idea \(store.niche?.audience ?? "people in your niche") would love. A handful of ideas is plenty to start." : "Move an idea forward and it shows up here.") {
                    if items.isEmpty { Button("Add an Idea") { adding = true }.buttonStyle(.fr(.primary)) }
                }
            } else {
                ForEach(Array(shown.enumerated()), id: \.element.id) { i, item in
                    WorkspaceItemRow(w: w, item: item, onAdvance: { advance(item) }, onEdit: { editing = item })
                        .fadeUp(i)
                }
            }
        }
        .sheet(isPresented: $adding) { WorkspaceItemSheet(w: w, item: nil) }
        .sheet(item: $editing) { WorkspaceItemSheet(w: w, item: $0) }
        .confirmationDialog(w.doneTitle, isPresented: Binding(get: { finishing != nil }, set: { if !$0 { finishing = nil } }), titleVisibility: .visible, presenting: finishing) { item in
            Button(w.doneConfirm) { store.advanceContent(item.id); Haptics.notify(.success); store.showToast(w.doneToast) }
        } message: { item in
            Text("“\(item.title)” counts toward your goal and your weekly progress.")
        }
    }

    private func advance(_ item: ContentItem) {
        guard let next = w.next(after: item.stage) else { return }
        if next == w.doneStage { finishing = item; return }
        Haptics.tap()
        withAnimation(.snappy) { store.advanceContent(item.id) }
    }
}

private struct WorkspaceItemRow: View {
    let w: Workspace
    let item: ContentItem
    let onAdvance: () -> Void
    let onEdit: () -> Void
    @Environment(AppStore.self) private var store
    @State private var confirmDelete = false

    var body: some View {
        let info = w.stage(item.stage)
        let done = item.stage == w.doneStage
        HStack(alignment: .top, spacing: Space.m) {
            SymbolTile(icon: info.icon, tint: done ? Theme.success : Theme.brand300, size: 40)
            VStack(alignment: .leading, spacing: 6) {
                Text(item.title).font(.body.weight(.semibold)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 6) {
                    Badge(info.label, tone: done ? .success : .brand)
                    if !item.format.isEmpty { Badge(item.format) }
                    Text(item.publishedAt.map { "\(w.stage(w.doneStage).label) \($0.timeAgo)" } ?? "Added \(item.createdAt.timeAgo)").font(.caption).foregroundStyle(Theme.faint)
                }
                if !done {
                    Button(action: onAdvance) {
                        Label(info.nextAction, systemImage: "arrow.right").labelStyle(TrailingIconLabel()).font(.footnote.weight(.semibold))
                    }
                    .buttonStyle(.fr(.secondary, size: .sm))
                    .padding(.top, 2)
                }
            }
            Spacer(minLength: 0)
        }
        .card()
        .contentShape(Rectangle())
        .onTapGesture(perform: onEdit)
        .contextMenu {
            Button { onEdit() } label: { Label("Edit", systemImage: "pencil") }
            Button(role: .destructive) { confirmDelete = true } label: { Label("Delete", systemImage: "trash") }
        }
        .alert("Delete this \(w.itemNoun)?", isPresented: $confirmDelete) {
            Button("Delete", role: .destructive) { store.deleteContent(item.id); store.showToast("Removed") }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(done ? "It will no longer count toward your \(Journeys.metric(w.doneMetric).label.lowercased())." : "The idea and its notes will be removed.")
        }
        .accessibilityAction(named: "Edit", onEdit)
    }
}

private struct WorkspaceItemSheet: View {
    let w: Workspace
    let item: ContentItem?
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var format = ""
    @State private var notes = ""
    @State private var link = ""
    @State private var touched = false

    private var titleError: String? { touched && title.trimmingCharacters(in: .whitespaces).count < 3 ? "Give it a working title" : nil }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Space.l) {
                    if item == nil, let niche = store.niche {
                        Text("Start from something \(niche.audience) already ask about, like “\(niche.exampleTerms.first ?? niche.normalizedLabel)”.")
                            .font(.subheadline).foregroundStyle(Theme.muted)
                    }
                    FRTextField(label: "Working title", text: $title, placeholder: w.titlePlaceholder, systemImage: "lightbulb", error: titleError)
                    if !w.formats.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Format").font(.footnote.weight(.medium)).foregroundStyle(Theme.muted)
                            if w.formats.count <= 3 {
                                SegmentedTabs(options: w.formats, selection: $format)
                            } else {
                                SelectRow(label: "", selection: $format, options: w.formats)
                            }
                        }
                    }
                    if item != nil {
                        FRTextArea(label: "Notes", text: $notes)
                        FRTextField(label: "Link", text: $link, placeholder: "https://…", systemImage: "link", keyboard: .URL)
                    }
                    Button(item == nil ? "Add Idea" : "Save Changes", action: save).buttonStyle(.fr(.primary, size: .lg, full: true))
                }
                .padding(Space.xl).frame(maxWidth: 620).frame(maxWidth: .infinity)
            }
            .navigationTitle(item == nil ? w.newItemTitle : "Edit \(w.itemNoun)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
            .outreachSheetChrome()
        }
        .onAppear {
            guard let item else {
                format = store.defaultFormat
                return
            }
            title = item.title; format = item.format; notes = item.notes; link = item.link
        }
    }

    private func save() {
        touched = true
        let clean = title.trimmingCharacters(in: .whitespaces)
        guard clean.count >= 3 else { Haptics.notify(.error); return }
        if let item {
            store.updateContent(item.id, title: clean, format: format, notes: notes, link: link.trimmingCharacters(in: .whitespaces))
            store.showToast("Saved")
        } else {
            store.addContent(title: clean, format: format)
            store.showToast("Idea added to your board")
        }
        dismiss()
    }
}

// MARK: - Numbers

private struct WorkspaceNumbersTab: View {
    let w: Workspace
    @Environment(AppStore.self) private var store
    @State private var logging = false

    private var history: [MetricEvent] {
        (store.enrollment?.metricEvents ?? []).filter { Journeys.metric($0.key).kind == .latest }.sorted { $0.date > $1.date }
    }

    var body: some View {
        let stats = store.stats
        VStack(alignment: .leading, spacing: Space.l) {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: Space.m), GridItem(.flexible(), spacing: Space.m)], spacing: Space.m) {
                ForEach(store.journey.metrics, id: \.self) { m in
                    StatCard(icon: Journeys.metric(m).icon, value: stats.display(m), label: Journeys.metric(m).label, accent: m == w.doneMetric)
                }
            }
            Button { logging = true } label: { Label("Log Numbers from \(w.logSource.prefix(1).uppercased() + w.logSource.dropFirst())", systemImage: "square.and.pencil") }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
            VStack(alignment: .leading, spacing: Space.s) {
                SectionHeader(title: "What to look at")
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(w.guide, id: \.title) { g in guide(g) }
                }
                .card()
            }
            VStack(alignment: .leading, spacing: Space.s) {
                SectionHeader(title: "History")
                if history.isEmpty {
                    EmptyStateView(title: "No numbers logged yet", message: "Once a week, copy your totals from \(w.logSource). It takes a minute and shows you what's working.", mood: .thinking, compact: true)
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(history.prefix(12).enumerated()), id: \.element.id) { i, e in
                            HStack {
                                Label(Journeys.metric(e.key).label, systemImage: Journeys.metric(e.key).icon).font(.subheadline).foregroundStyle(Theme.inkSoft)
                                Spacer()
                                Text(Stats(logged: [e.key: e.value]).display(e.key)).font(.subheadline.weight(.semibold)).monospacedDigit().foregroundStyle(Theme.ink)
                                Text(e.date.shortDate).font(.caption).foregroundStyle(Theme.faint).frame(width: 52, alignment: .trailing)
                            }
                            .padding(.horizontal, Space.l).padding(.vertical, 12)
                            if i < min(history.count, 12) - 1 { Divider().overlay(Theme.line) }
                        }
                    }
                    .card(padding: 0)
                }
            }
        }
        .sheet(isPresented: $logging) { WorkspaceNumbersSheet(w: w) }
    }

    private func guide(_ g: Workspace.Guide) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: g.icon).foregroundStyle(Theme.brand300).frame(width: 22)
            VStack(alignment: .leading, spacing: 2) {
                Text(g.title).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink)
                Text(g.body).font(.footnote).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

private struct WorkspaceNumbersSheet: View {
    let w: Workspace
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var values: [StatMetric: String] = [:]
    @State private var touched = false

    private func number(_ s: String?) -> Double? { s.flatMap { Double($0.replacingOccurrences(of: ",", with: ".").filter { $0.isNumber || $0 == "." }) } }
    private var parsed: [StatMetric: Double] { values.compactMapValues(number) }
    private var percentError: String? {
        guard touched else { return nil }
        return parsed.contains { Journeys.metric($0.key).format == .percent && $0.value > 100 } ? "Percentages go from 0 to 100" : nil
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Space.l) {
                    Text(w.logHint).font(.subheadline).foregroundStyle(Theme.muted)
                    ForEach(w.logMetrics, id: \.self) { m in
                        let def = Journeys.metric(m)
                        FRTextField(label: def.label + (def.format == .percent ? " (%)" : def.format == .minutes ? " (minutes)" : ""),
                                    text: Binding(get: { values[m] ?? "" }, set: { values[m] = $0 }),
                                    placeholder: "0", systemImage: def.icon,
                                    error: def.format == .percent ? percentError : nil,
                                    keyboard: def.format == .percent ? .decimalPad : .numberPad)
                    }
                    Button("Save Numbers", action: save).buttonStyle(.fr(.primary, size: .lg, full: true)).disabled(parsed.isEmpty)
                }
                .padding(Space.xl).frame(maxWidth: 620).frame(maxWidth: .infinity)
            }
            .navigationTitle("Log your numbers")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
            .outreachSheetChrome()
        }
    }

    private func save() {
        touched = true
        guard !parsed.isEmpty, percentError == nil else { Haptics.notify(.error); return }
        store.logNumbers(parsed)
        store.showToast("Numbers saved")
        dismiss()
    }
}

// MARK: - Income and growth stages

private struct WorkspaceIncomeTab: View {
    let w: Workspace
    @Environment(AppStore.self) private var store
    @State private var expanded: String?
    @State private var logging = false

    private var stages: [MonetizationStageInfo] { store.journey.monetizationStages.compactMap(Journeys.monetization) }
    private var current: String { store.enrollment?.monetizationStage ?? "" }
    private var income: [MetricEvent] { (store.enrollment?.metricEvents ?? []).filter { $0.key == w.incomeMetric }.sorted { $0.date > $1.date } }

    var body: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            if let niche = store.niche, !niche.monetizationOptions.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Label("FITS \(niche.normalizedLabel.uppercased())", systemImage: "sparkles").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.brand300)
                    ForEach(niche.monetizationOptions, id: \.self) { o in
                        Label(o.prefix(1).uppercased() + o.dropFirst(), systemImage: "checkmark").font(.subheadline).foregroundStyle(Theme.inkSoft)
                    }
                    if let note = niche.cautionNote {
                        Label(note, systemImage: "exclamationmark.shield.fill").font(.footnote).foregroundStyle(Theme.warning).padding(.top, 4)
                    }
                }
                .card(.hero)
            }
            VStack(alignment: .leading, spacing: Space.s) {
                SectionHeader(title: w.incomeTitle, action: "Log") { logging = true }
                VStack(alignment: .leading, spacing: Space.m) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(store.stats.display(w.incomeMetric)).font(.number(30)).foregroundStyle(Theme.ink)
                        if let sales = w.salesMetric {
                            Text("from \(store.stats.display(sales)) \(store.stats.value(sales) == 1 ? "sale" : "sales")").font(.footnote).foregroundStyle(Theme.muted)
                        }
                    }
                    if income.isEmpty {
                        Text(w.incomeHint).font(.footnote).foregroundStyle(Theme.muted)
                    } else {
                        ForEach(income.prefix(6)) { e in
                            HStack {
                                Text(e.note ?? "Income").font(.subheadline).foregroundStyle(Theme.inkSoft)
                                Spacer()
                                Text(money(Int(e.value))).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.success)
                                Text(e.date.shortDate).font(.caption).foregroundStyle(Theme.faint).frame(width: 52, alignment: .trailing)
                            }
                        }
                    }
                    Button { logging = true } label: { Label(w.salesMetric == nil ? "Log Income" : "Log a Sale", systemImage: "plus") }.buttonStyle(.fr(.secondary, full: true))
                }
                .card()
            }
            SectionHeader(title: w.stagesTitle)
            ForEach(Array(stages.enumerated()), id: \.element.id) { i, stage in
                stageCard(stage, index: i + 1)
            }
        }
        .sheet(isPresented: $logging) { WorkspaceIncomeSheet(w: w) }
    }

    private func stageCard(_ stage: MonetizationStageInfo, index: Int) -> some View {
        let isCurrent = stage.id == current
        let open = expanded == stage.id || (expanded == nil && isCurrent)
        return VStack(alignment: .leading, spacing: Space.m) {
            Button { withAnimation(.snappy) { expanded = open ? "" : stage.id } } label: {
                HStack(spacing: Space.m) {
                    Text("\(index)").font(.caption.weight(.bold)).foregroundStyle(isCurrent ? .white : Theme.brand300)
                        .frame(width: 28, height: 28).background(Circle().fill(isCurrent ? AnyShapeStyle(Theme.brandGradient) : AnyShapeStyle(Theme.brand500.opacity(0.15))))
                    Text(stage.title).font(.body.weight(.bold)).foregroundStyle(Theme.ink)
                    Spacer()
                    if isCurrent { Badge("You are here", tone: .success) }
                    Image(systemName: open ? "chevron.up" : "chevron.down").font(.footnote.weight(.semibold)).foregroundStyle(Theme.faint)
                }
            }
            .buttonStyle(.plain)
            if open {
                Text(stage.summary).font(.subheadline).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
                bullets("Ready when", stage.readyWhen, icon: "checkmark.circle")
                bullets("Do next", stage.actions, icon: "arrow.right.circle")
                if !isCurrent {
                    Button("This Is My Stage Now") { store.setMonetizationStage(stage.id); store.showToast("Stage updated to \(stage.title)") }
                        .buttonStyle(.fr(.secondary, full: true))
                }
            }
        }
        .card(isCurrent ? .selected : .plain)
    }

    private func bullets(_ title: String, _ items: [String], icon: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title.uppercased()).font(.eyebrow).tracking(0.8).foregroundStyle(Theme.faint)
            ForEach(items, id: \.self) { item in
                Label(item, systemImage: icon).font(.footnote).foregroundStyle(Theme.inkSoft)
            }
        }
    }
}

private struct WorkspaceIncomeSheet: View {
    let w: Workspace
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var amount = ""
    @State private var sales = "1"
    @State private var source = ""
    @State private var touched = false

    private var value: Int { Int(amount.filter(\.isNumber)) ?? 0 }
    private var salesValue: Int { Int(sales.filter(\.isNumber)) ?? 0 }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Space.l) {
                    Text("Log money once it has actually been paid to you.").font(.subheadline).foregroundStyle(Theme.muted)
                    FRTextField(label: "Amount ($)", text: $amount, placeholder: "25", systemImage: "dollarsign", error: touched && value <= 0 ? "Enter an amount above $0" : nil, keyboard: .numberPad)
                    if w.salesMetric != nil {
                        FRTextField(label: "Number of sales", text: $sales, placeholder: "1", systemImage: "cart", error: touched && salesValue <= 0 ? "At least one sale" : nil, keyboard: .numberPad)
                    }
                    SelectRow(label: "Where from", selection: $source, options: w.incomeSources)
                    Button(w.salesMetric == nil ? "Save Income" : "Save Sale", action: save).buttonStyle(.fr(.primary, size: .lg, full: true))
                }
                .padding(Space.xl).frame(maxWidth: 620).frame(maxWidth: .infinity)
            }
            .navigationTitle(w.salesMetric == nil ? "Log income" : "Log a sale")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
            .outreachSheetChrome([.medium, .large])
        }
        .onAppear { if source.isEmpty { source = w.incomeSources.first ?? "" } }
    }

    private func save() {
        touched = true
        guard value > 0, w.salesMetric == nil || salesValue > 0 else { Haptics.notify(.error); return }
        store.logIncome(amount: value, source: source, sales: w.salesMetric == nil ? nil : salesValue)
        store.showToast("\(money(value)) logged")
        dismiss()
    }
}
