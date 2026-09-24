import SwiftUI

enum ResLibrary {
    static let filters = ["All", "Saved", "Templates", "Tools", "Guides", "Checklists", "Scripts", "Calculators"]
    static let typeByFilter: [String: String] = [
        "Templates": "Template", "Tools": "Tool", "Guides": "Guide",
        "Checklists": "Checklist", "Scripts": "Script", "Calculators": "Calculator",
    ]
    /// Display order for the grouped "All" view.
    static let groups: [ResGroupDef] = [
        ResGroupDef(type: "Template", title: "Templates"), ResGroupDef(type: "Script", title: "Scripts"),
        ResGroupDef(type: "Checklist", title: "Checklists"), ResGroupDef(type: "Guide", title: "Guides"),
        ResGroupDef(type: "Tool", title: "Tools"), ResGroupDef(type: "Calculator", title: "Calculators"),
    ]
}

struct ResGroupDef: Hashable { let type: String; let title: String }

struct ResourcesView: View {
    @Environment(AppStore.self) private var store
    @State private var filter = "All"
    @State private var query = ""
    @State private var loading = true

    private var available: [Resource] { MockData.resources(for: store.s.pathId) }
    private var q: String { query.trimmingCharacters(in: .whitespaces).lowercased() }

    private var visible: [Resource] {
        var list = available
        if filter == "Saved" { list = list.filter { store.s.savedResources.contains($0.id) } }
        if let type = ResLibrary.typeByFilter[filter] { list = list.filter { $0.type == type } }
        if !q.isEmpty { list = list.filter { "\($0.title) \($0.description) \($0.type)".lowercased().contains(q) } }
        return list
    }

    var body: some View {
        Screen(title: "Resources", subtitle: "Templates, scripts and tools — ready to use.") {
            VStack(alignment: .leading, spacing: Space.m) {
                SearchField(text: $query, placeholder: "Search resources")
                FilterChips(options: ResLibrary.filters, selection: $filter, count: count(for:))
                content
                    .padding(.top, Space.s)
            }
        }
        .animation(.snappy, value: filter)
        .animation(.snappy, value: loading)
        .task {
            guard loading else { return }
            try? await Task.sleep(for: .milliseconds(400))
            loading = false
        }
    }

    private func count(for f: String) -> Int? {
        switch f {
        case "All": return available.count
        case "Saved": return available.filter { store.s.savedResources.contains($0.id) }.count
        default:
            guard let type = ResLibrary.typeByFilter[f] else { return nil }
            return available.filter { $0.type == type }.count
        }
    }

    @ViewBuilder private var content: some View {
        let items = visible
        if loading {
            SkeletonList(count: 5)
        } else if items.isEmpty {
            emptyState
        } else if filter == "All" {
            grouped(items)
        } else {
            ResGrid(items: items)
        }
    }

    private func grouped(_ items: [Resource]) -> some View {
        VStack(alignment: .leading, spacing: Space.xxl) {
            ForEach(ResLibrary.groups, id: \.type) { g in
                let group = items.filter { $0.type == g.type }
                if !group.isEmpty {
                    VStack(alignment: .leading, spacing: Space.m) {
                        HStack(spacing: Space.s) {
                            Image(systemName: ResourceIcon.name(g.type)).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.brand300)
                            Text(g.title).font(.section).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                            Text("\(group.count)").font(.footnote).monospacedDigit().foregroundStyle(Theme.faint)
                            Spacer()
                        }
                        ResGrid(items: group)
                    }
                }
            }
        }
    }

    @ViewBuilder private var emptyState: some View {
        if !q.isEmpty {
            EmptyStateView(title: "No resources found", message: "Nothing matches \"\(query.trimmingCharacters(in: .whitespaces))\". Try a shorter word like \"outreach\", \"pricing\" or \"checklist\".", mood: .thinking) {
                Button("Clear search") { query = ""; filter = "All" }.buttonStyle(.fr(.secondary))
            }
        } else if filter == "Saved" {
            EmptyStateView(title: "Nothing saved yet", message: "Tap the bookmark on any template, script or checklist and it will be waiting for you here.", mood: .wink) {
                Button("Browse resources") { filter = "All" }.buttonStyle(.fr(.primary))
            }
        } else {
            EmptyStateView(title: "No \(filter.lowercased()) on this path yet", message: "Everything else in the library is still ready to use.", mood: .thinking) {
                Button("Show all resources") { filter = "All" }.buttonStyle(.fr(.secondary))
            }
        }
    }
}

/// One column on iPhone, two on iPad.
struct ResGrid: View {
    let items: [Resource]
    var body: some View {
        LazyVGrid(columns: adaptiveColumns(min: 320), spacing: Space.m) {
            ForEach(Array(items.enumerated()), id: \.element.id) { i, r in
                ResourceCard(resource: r).fadeUp(i)
            }
        }
    }
}
