import SwiftUI

struct OutreachHubView: View {
    let initialTab: OutreachTab
    @State private var tab: OutreachTab

    init(initialTab: OutreachTab) {
        self.initialTab = initialTab
        _tab = State(initialValue: initialTab)
    }

    var body: some View {
        Screen(title: "Outreach", subtitle: "Find them, message them, follow up.", large: true) {
            VStack(alignment: .leading, spacing: Space.l) {
                OutreachQuickActions()
                SegmentedTabs(options: OutreachTab.allCases, selection: $tab, title: { $0.rawValue })
                    .accessibilityLabel("Outreach sections")
                section
                    .padding(.top, Space.xs)
            }
        }
    }

    @ViewBuilder private var section: some View {
        switch tab {
        case .prospects: OutreachProspectsSection()
        case .messages: OutreachMessagesSection()
        case .templates: OutreachTemplatesSection()
        case .followUps: OutreachFollowUpsSection()
        }
    }
}

private struct OutreachQuickActions: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                chip("Write a message", "square.and.pencil", primary: true) { store.push(.generate(prospectId: nil)) }
                chip("Pricing help", "tag", primary: false) { store.push(.pricing) }
                chip("Revenue", "dollarsign.circle", primary: false) { store.push(.revenue) }
            }
            .padding(.horizontal, Space.gutter)
        }
        .padding(.horizontal, -Space.gutter)
    }

    private func chip(_ title: String, _ icon: String, primary: Bool, action: @escaping () -> Void) -> some View {
        Button { Haptics.tap(); action() } label: {
            Label(title, systemImage: icon)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(primary ? Color.white : Theme.inkSoft)
                .padding(.horizontal, 16)
                .frame(height: 44)
                .background(Capsule().fill(primary ? AnyShapeStyle(Theme.brandGradient) : AnyShapeStyle(Theme.surface)))
                .overlay(Capsule().strokeBorder(primary ? Color.clear : Theme.line))
                .shadow(color: primary ? Theme.brand600.opacity(0.35) : .clear, radius: 8, y: 3)
        }
        .buttonStyle(.pressable)
    }
}

// MARK: - Prospects

struct OutreachProspectsSection: View {
    @Environment(AppStore.self) private var store
    @State private var loading = true
    @State private var filter = "All"
    @State private var query = ""
    @State private var adding = false

    private var mine: [Prospect] { store.s.prospects.filter { $0.path == store.s.pathId } }
    private var pipeline: Int { mine.filter { $0.status != .won && $0.status != .lost }.reduce(0) { $0 + $1.value } }
    private var trimmedQuery: String { query.trimmingCharacters(in: .whitespaces).lowercased() }

    private var visible: [Prospect] {
        let q = trimmedQuery
        return mine.filter { p in
            (filter == "All" || p.status.rawValue == filter)
                && (q.isEmpty || [p.name, p.business, p.platform, p.handle].contains { $0.lowercased().contains(q) })
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            header
            if !mine.isEmpty { controls }
            list
        }
        .task {
            try? await Task.sleep(for: .milliseconds(500))
            withAnimation(.snappy) { loading = false }
        }
        .sheet(isPresented: $adding) { OutreachAddProspectSheet() }
    }

    private var header: some View {
        HStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Open pipeline").font(.footnote).foregroundStyle(Theme.muted)
                (Text(money(pipeline)).font(.number(28)).foregroundStyle(Theme.ink)
                    + Text("  ·  \(mine.count) prospect\(mine.count == 1 ? "" : "s")").font(.footnote.weight(.medium)).foregroundStyle(Theme.faint))
                    .contentTransition(.numericText())
            }
            .accessibilityElement(children: .combine)
            Spacer()
            Button { adding = true } label: { Label("Add prospect", systemImage: "plus") }
                .buttonStyle(.fr(.primary, size: .sm))
        }
    }

    private var controls: some View {
        VStack(alignment: .leading, spacing: Space.m) {
            SearchField(text: $query, placeholder: "Search prospects")
            FilterChips(options: ["All"] + ProspectStatus.allCases.map(\.rawValue), selection: $filter) { opt in
                opt == "All" ? mine.count : mine.filter { $0.status.rawValue == opt }.count
            }
        }
    }

    @ViewBuilder private var list: some View {
        if loading {
            SkeletonList(count: 4)
        } else if mine.isEmpty {
            EmptyStateView(title: "No prospects yet", message: store.s.pathId == .clipping ? "Add the first creator you would love to clip for. Ten names is a pipeline." : "Add the first local business whose profile you could improve. Ten names is a pipeline.") {
                Button { adding = true } label: { Label("Add your first prospect", systemImage: "person.badge.plus") }
                    .buttonStyle(.fr(.primary))
            }
        } else if visible.isEmpty {
            EmptyStateView(title: "No results", message: noResultsMessage, mood: .thinking, compact: true) {
                Button("Clear filters") { withAnimation(.snappy) { query = ""; filter = "All" } }
                    .buttonStyle(.fr(.secondary))
            }
        } else {
            LazyVGrid(columns: adaptiveColumns(min: 320), spacing: Space.m) {
                ForEach(Array(visible.enumerated()), id: \.element.id) { i, p in
                    row(p).fadeUp(i)
                }
            }
        }
    }

    private var noResultsMessage: String {
        let q = query.trimmingCharacters(in: .whitespaces)
        if !q.isEmpty { return "Nothing matches \"\(q)\"\(filter != "All" ? " in \(filter)" : "")." }
        return "No prospects are marked \(filter) right now."
    }

    private func row(_ p: Prospect) -> some View {
        RevealSwipeRow(actions: swipeActions(p)) {
            ProspectCard(prospect: p)
        }
        .contextMenu {
            Button { store.push(.prospect(p.id)) } label: { Label("Open", systemImage: "person.crop.circle") }
            Button { store.push(.generate(prospectId: p.id)) } label: { Label("Write a message", systemImage: "square.and.pencil") }
            Menu {
                ForEach(ProspectStatus.allCases) { s in
                    Button { setStatus(p, s) } label: {
                        if s == p.status { Label(s.rawValue, systemImage: "checkmark") } else { Text(s.rawValue) }
                    }
                }
            } label: { Label("Set status", systemImage: "arrow.triangle.swap") }
        }
    }

    private func swipeActions(_ p: Prospect) -> [RevealSwipeAction] {
        var actions: [RevealSwipeAction] = []
        if p.status == .new {
            actions.append(RevealSwipeAction(title: "Contacted", systemImage: "paperplane.fill", tint: Theme.info) { setStatus(p, .contacted) })
        }
        if p.status != .won && p.status != .lost {
            actions.append(RevealSwipeAction(title: "Won", systemImage: "trophy.fill", tint: Theme.success) { setStatus(p, .won) })
        }
        return actions
    }

    private func setStatus(_ p: Prospect, _ status: ProspectStatus) {
        guard p.status != status else { return }
        withAnimation(.snappy) { store.setProspectStatus(p.id, status) }
        let first = p.name.split(separator: " ").first.map(String.init) ?? p.name
        store.showToast(status == .won ? "Client won! Deal added to revenue" : "\(first) marked as \(status.rawValue)")
    }
}

// MARK: - Add prospect sheet

struct OutreachAddProspectSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var business = ""
    @State private var platform = ""
    @State private var audience = ""
    @State private var handle = ""
    @State private var value = ""
    @State private var about = ""
    @State private var touched = false

    private var path: PathID { store.s.pathId }
    private var nameError: String? { touched && name.trimmingCharacters(in: .whitespaces).isEmpty ? "Add a contact name" : nil }
    private var businessError: String? {
        guard touched, business.trimmingCharacters(in: .whitespaces).isEmpty else { return nil }
        return path == .clipping ? "Add their channel or brand" : "Add the business name"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                form
                    .padding(.horizontal, Space.xl)
                    .padding(.vertical, Space.l)
                    .frame(maxWidth: 620)
                    .frame(maxWidth: .infinity)
            }
            .navigationTitle("Add prospect")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Save", action: save).fontWeight(.semibold) }
            }
            .outreachSheetChrome()
        }
        .onAppear { if platform.isEmpty { platform = OutreachPlatforms.list(path)[0] } }
    }

    private var form: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            Text("Just the basics. You can add notes later.").font(.subheadline).foregroundStyle(Theme.muted)
            FRTextField(label: "Contact name", text: $name, placeholder: "Jamie Rivera", systemImage: "person", error: nameError, contentType: .name)
            FRTextField(label: path == .clipping ? "Channel or brand" : "Business name", text: $business, placeholder: path == .clipping ? "The Growth Hour Podcast" : "Rivera Family Dental", systemImage: path == .clipping ? "play.rectangle" : "storefront", error: businessError)
            SelectRow(label: "Platform", selection: $platform, options: OutreachPlatforms.list(path))
            FRTextField(label: "Audience", text: $audience, placeholder: path == .clipping ? "52K subscribers" : "127 reviews", systemImage: "person.3")
            FRTextField(label: "Handle or email", text: $handle, placeholder: "@handle", systemImage: "at", keyboard: .emailAddress)
            FRTextField(label: "Potential value ($)", text: $value, placeholder: "150", systemImage: "dollarsign", keyboard: .numberPad)
            FRTextArea(label: "About", text: $about, placeholder: "Why are they a good fit? What did you notice?")
            Button("Save prospect", action: save)
                .buttonStyle(.fr(.primary, size: .lg, full: true))
                .padding(.top, Space.s)
        }
        .animation(.snappy, value: touched)
    }

    private func save() {
        touched = true
        let n = name.trimmingCharacters(in: .whitespaces)
        let b = business.trimmingCharacters(in: .whitespaces)
        guard !n.isEmpty, !b.isEmpty else { Haptics.notify(.error); return }
        let a = audience.trimmingCharacters(in: .whitespaces)
        store.addProspect(
            path: path,
            name: n,
            business: b,
            platform: platform.isEmpty ? OutreachPlatforms.list(path)[0] : platform,
            audience: a.isEmpty ? "Audience unknown" : a,
            handle: handle.trimmingCharacters(in: .whitespaces),
            about: about.trimmingCharacters(in: .whitespacesAndNewlines),
            value: max(0, Int(value.filter(\.isNumber)) ?? 0)
        )
        dismiss()
        store.showToast("\(n) added to your prospects")
    }
}
