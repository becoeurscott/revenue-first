import SwiftUI

/// Owned-channel workspace: the content board (idea → published), YouTube Studio numbers,
/// and stage-appropriate monetization. Replaces prospects/pricing/revenue for channel journeys.
struct ChannelHubView: View {
    let initialTab: ChannelTab
    @Environment(AppStore.self) private var store
    @State private var tab: ChannelTab = .content
    @State private var didSetTab = false

    var body: some View {
        Screen(title: "Your Channel", subtitle: store.niche.map { "\($0.normalizedLabel) · \(store.journey.primaryAction)" }) {
            VStack(alignment: .leading, spacing: Space.l) {
                SegmentedTabs(options: ChannelTab.allCases, selection: $tab, title: { $0.rawValue })
                switch tab {
                case .content: ChannelContentTab()
                case .analytics: ChannelAnalyticsTab()
                case .monetization: ChannelMonetizationTab()
                }
            }
        }
        .onAppear { if !didSetTab { tab = initialTab; didSetTab = true } }
    }
}

// MARK: - Content board

private struct ChannelContentTab: View {
    @Environment(AppStore.self) private var store
    @State private var filter = "All"
    @State private var adding = false
    @State private var editing: ContentItem?
    @State private var publishing: ContentItem?

    private var items: [ContentItem] { store.enrollment?.contentItems ?? [] }
    private var shown: [ContentItem] { filter == "All" ? items : items.filter { Journeys.stage($0.stage).label == filter } }

    var body: some View {
        let stats = store.stats
        VStack(alignment: .leading, spacing: Space.l) {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: Space.m), GridItem(.flexible(), spacing: Space.m)], spacing: Space.m) {
                StatCard(icon: "play.rectangle.fill", value: "\(stats.videosPublished)", label: "Videos published", accent: true)
                StatCard(icon: "calendar.badge.clock", value: "\(stats.uploadsThisWeek)", label: "Uploads this week")
            }
            Button { adding = true } label: { Label("Add a Video Idea", systemImage: "plus") }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
            FilterChips(options: ["All"] + ContentStage.allCases.map { Journeys.stage($0).label }, selection: $filter) { opt in
                opt == "All" ? items.count : items.filter { Journeys.stage($0.stage).label == opt }.count
            }
            if shown.isEmpty {
                EmptyStateView(title: items.isEmpty ? "No video ideas yet" : "Nothing at this stage",
                               message: items.isEmpty ? "Add the first idea \(store.niche?.audience ?? "your viewers") would search for. Twenty ideas is a content plan." : "Move an idea forward and it shows up here.") {
                    if items.isEmpty { Button("Add an Idea") { adding = true }.buttonStyle(.fr(.primary)) }
                }
            } else {
                ForEach(Array(shown.enumerated()), id: \.element.id) { i, item in
                    ChannelContentRow(item: item, onAdvance: { advance(item) }, onEdit: { editing = item })
                        .fadeUp(i)
                }
            }
        }
        .sheet(isPresented: $adding) { ChannelContentSheet(item: nil) }
        .sheet(item: $editing) { ChannelContentSheet(item: $0) }
        .confirmationDialog("Mark as published?", isPresented: Binding(get: { publishing != nil }, set: { if !$0 { publishing = nil } }), titleVisibility: .visible, presenting: publishing) { item in
            Button("It's live on YouTube") { store.advanceContent(item.id); Haptics.notify(.success); store.showToast("Published. Check its numbers in 48 hours.") }
        } message: { item in
            Text("“\(item.title)” counts toward your publishing goal and weekly uploads.")
        }
    }

    private func advance(_ item: ContentItem) {
        guard let next = item.stage.next else { return }
        if next == .published { publishing = item; return }
        Haptics.tap()
        withAnimation(.snappy) { store.advanceContent(item.id) }
    }
}

private struct ChannelContentRow: View {
    let item: ContentItem
    let onAdvance: () -> Void
    let onEdit: () -> Void
    @Environment(AppStore.self) private var store
    @State private var confirmDelete = false

    var body: some View {
        let info = Journeys.stage(item.stage)
        HStack(alignment: .top, spacing: Space.m) {
            SymbolTile(icon: info.icon, tint: item.stage == .published ? Theme.success : Theme.brand300, size: 40)
            VStack(alignment: .leading, spacing: 6) {
                Text(item.title).font(.body.weight(.semibold)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 6) {
                    Badge(info.label, tone: item.stage == .published ? .success : .brand)
                    Badge(item.format)
                    Text(item.publishedAt.map { "Published \($0.timeAgo)" } ?? "Added \(item.createdAt.timeAgo)").font(.caption).foregroundStyle(Theme.faint)
                }
                if item.stage != .published {
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
        .alert("Delete this video?", isPresented: $confirmDelete) {
            Button("Delete", role: .destructive) { store.deleteContent(item.id); store.showToast("Video removed") }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(item.stage == .published ? "It will no longer count toward your published videos." : "The idea and its notes will be removed.")
        }
        .accessibilityAction(named: "Edit", onEdit)
    }
}

private struct ChannelContentSheet: View {
    let item: ContentItem?
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var format = "Long-form"
    @State private var notes = ""
    @State private var link = ""
    @State private var touched = false

    private static let formats = ["Long-form", "Short"]
    private var titleError: String? { touched && title.trimmingCharacters(in: .whitespaces).count < 3 ? "Give the idea a working title" : nil }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Space.l) {
                    if item == nil, let niche = store.niche {
                        Text("Start from a question \(niche.audience) actually search for, like “\(niche.exampleTerms.first ?? niche.normalizedLabel)”.")
                            .font(.subheadline).foregroundStyle(Theme.muted)
                    }
                    FRTextField(label: "Working title", text: $title, placeholder: "e.g. 5 mistakes every beginner makes", systemImage: "lightbulb", error: titleError)
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Format").font(.footnote.weight(.medium)).foregroundStyle(Theme.muted)
                        SegmentedTabs(options: Self.formats, selection: $format)
                    }
                    if item != nil {
                        FRTextArea(label: "Notes", text: $notes)
                        FRTextField(label: "Video link", text: $link, placeholder: "https://youtube.com/…", systemImage: "link", keyboard: .URL)
                    }
                    Button(item == nil ? "Add Idea" : "Save Changes", action: save).buttonStyle(.fr(.primary, size: .lg, full: true))
                }
                .padding(Space.xl).frame(maxWidth: 620).frame(maxWidth: .infinity)
            }
            .navigationTitle(item == nil ? "New video idea" : "Edit video")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
            .outreachSheetChrome()
        }
        .onAppear {
            guard let item else {
                if store.enrollment?.answers.answer("videoFormat") == "shorts" { format = "Short" }
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

// MARK: - Analytics

private struct ChannelAnalyticsTab: View {
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
                    StatCard(icon: Journeys.metric(m).icon, value: stats.display(m), label: Journeys.metric(m).label, accent: m == .videosPublished)
                }
            }
            Button { logging = true } label: { Label("Log Numbers from YouTube Studio", systemImage: "square.and.pencil") }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
            VStack(alignment: .leading, spacing: Space.s) {
                SectionHeader(title: "What to look at")
                VStack(alignment: .leading, spacing: 10) {
                    guide("cursorarrow.click.2", "Click-through rate", "Low means the title and thumbnail aren't earning the click. Change one of them, not both.")
                    guide("clock.fill", "Watch time", "Grows when the first 30 seconds deliver what the title promised.")
                    guide("arrow.triangle.2.circlepath", "Returning viewers", "Your clearest sign of an audience. Series and a steady schedule raise it.")
                }
                .card()
            }
            VStack(alignment: .leading, spacing: Space.s) {
                SectionHeader(title: "History")
                if history.isEmpty {
                    EmptyStateView(title: "No numbers logged yet", message: "After your first upload, copy subscribers, watch time, click-through rate and returning viewers from YouTube Studio once a week.", mood: .thinking, compact: true)
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(history.prefix(12).enumerated()), id: \.element.id) { i, e in
                            HStack {
                                Label(Journeys.metric(e.key).label, systemImage: Journeys.metric(e.key).icon).font(.subheadline).foregroundStyle(Theme.inkSoft)
                                Spacer()
                                Text(value(e)).font(.subheadline.weight(.semibold)).monospacedDigit().foregroundStyle(Theme.ink)
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
        .sheet(isPresented: $logging) { ChannelStatsSheet() }
    }

    private func value(_ e: MetricEvent) -> String {
        var s = Stats()
        switch e.key {
        case .watchTime: s.watchTime = e.value
        case .subscribers: s.subscribers = e.value
        case .clickThroughRate: s.clickThroughRate = e.value
        case .returningViewers: s.returningViewers = e.value
        default: break
        }
        return s.display(e.key)
    }

    private func guide(_ icon: String, _ title: String, _ body: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon).foregroundStyle(Theme.brand300).frame(width: 22)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink)
                Text(body).font(.footnote).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

private struct ChannelStatsSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var subscribers = ""
    @State private var watchTime = ""
    @State private var ctr = ""
    @State private var returning = ""
    @State private var touched = false

    private func number(_ s: String) -> Double? { Double(s.replacingOccurrences(of: ",", with: ".").filter { $0.isNumber || $0 == "." }) }
    private var percentError: String? {
        guard touched else { return nil }
        return [ctr, returning].compactMap(number).contains { $0 > 100 } ? "Percentages go from 0 to 100" : nil
    }
    private var hasValue: Bool { [subscribers, watchTime, ctr, returning].contains { number($0) != nil } }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Space.l) {
                    Text("Open YouTube Studio > Analytics, pick the last 28 days, and copy what you see. Leave anything you can't find empty.")
                        .font(.subheadline).foregroundStyle(Theme.muted)
                    FRTextField(label: "Subscribers (total)", text: $subscribers, placeholder: "127", systemImage: "person.3", keyboard: .numberPad)
                    FRTextField(label: "Watch time (minutes)", text: $watchTime, placeholder: "84", systemImage: "clock", keyboard: .numberPad)
                    FRTextField(label: "Impressions click-through rate (%)", text: $ctr, placeholder: "4.2", systemImage: "cursorarrow.click.2", error: percentError, keyboard: .decimalPad)
                    FRTextField(label: "Returning viewers (%)", text: $returning, placeholder: "18", systemImage: "arrow.triangle.2.circlepath", keyboard: .decimalPad)
                    Button("Save Numbers", action: save).buttonStyle(.fr(.primary, size: .lg, full: true)).disabled(!hasValue)
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
        guard hasValue, percentError == nil else { Haptics.notify(.error); return }
        store.logChannelStats(subscribers: number(subscribers), watchTime: number(watchTime), clickThroughRate: number(ctr), returningViewers: number(returning))
        store.showToast("Numbers saved")
        dismiss()
    }
}

// MARK: - Monetization

private struct ChannelMonetizationTab: View {
    @Environment(AppStore.self) private var store
    @State private var expanded: String?
    @State private var loggingIncome = false

    private var stages: [MonetizationStageInfo] { store.journey.monetizationStages.compactMap(Journeys.monetization) }
    private var current: String { store.enrollment?.monetizationStage ?? "" }
    private var income: [MetricEvent] { (store.enrollment?.metricEvents ?? []).filter { $0.key == .channelIncome }.sorted { $0.date > $1.date } }

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
            SectionHeader(title: "Your monetization stage")
            ForEach(Array(stages.enumerated()), id: \.element.id) { i, stage in
                stageCard(stage, index: i + 1)
            }
            VStack(alignment: .leading, spacing: Space.s) {
                SectionHeader(title: "Channel income", action: "Log income") { loggingIncome = true }
                VStack(alignment: .leading, spacing: Space.m) {
                    Text(money(store.stats.channelIncome)).font(.number(30)).foregroundStyle(Theme.ink)
                    if income.isEmpty {
                        Text("Log every dollar from affiliates, sponsors, products or ads. The first one usually comes from an affiliate link, not ads.")
                            .font(.footnote).foregroundStyle(Theme.muted)
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
                    Button { loggingIncome = true } label: { Label("Log Income", systemImage: "plus") }.buttonStyle(.fr(.secondary, full: true))
                }
                .card()
            }
        }
        .sheet(isPresented: $loggingIncome) { ChannelIncomeSheet() }
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

private struct ChannelIncomeSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var amount = ""
    @State private var source = "Affiliate link"
    @State private var touched = false

    private static let sources = ["Affiliate link", "Sponsorship", "Digital product", "Ad revenue", "Other"]
    private var value: Int { Int(amount.filter(\.isNumber)) ?? 0 }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Space.l) {
                    Text("Log money once it has actually been paid out to you.").font(.subheadline).foregroundStyle(Theme.muted)
                    FRTextField(label: "Amount ($)", text: $amount, placeholder: "25", systemImage: "dollarsign", error: touched && value <= 0 ? "Enter an amount above $0" : nil, keyboard: .numberPad)
                    SelectRow(label: "Source", selection: $source, options: Self.sources)
                    Button("Save Income", action: save).buttonStyle(.fr(.primary, size: .lg, full: true))
                }
                .padding(Space.xl).frame(maxWidth: 620).frame(maxWidth: .infinity)
            }
            .navigationTitle("Log income")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
            .outreachSheetChrome([.medium, .large])
        }
    }

    private func save() {
        touched = true
        guard value > 0 else { Haptics.notify(.error); return }
        store.logChannelIncome(amount: value, source: source)
        store.showToast("\(money(value)) logged")
        dismiss()
    }
}
