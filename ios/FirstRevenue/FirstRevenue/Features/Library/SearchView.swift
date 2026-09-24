import SwiftUI

private enum SearchConfig {
    static let popular = ["outreach", "pricing", "follow-up", "portfolio", "objections", "audit"]
    static let limit = 4
}

private struct SearchResults {
    var lessons: [Lesson] = []
    var resources: [Resource] = []
    var missions: [DayPlan] = []
    var prospects: [Prospect] = []
    var paths: [PathInfo] = []
    var total: Int { lessons.count + resources.count + missions.count + prospects.count + paths.count }
}

struct SearchView: View {
    @Environment(AppStore.self) private var store
    @State private var query = ""
    @State private var debounced = ""
    @State private var searchActive = false

    private var typed: String { query.trimmingCharacters(in: .whitespaces) }
    private var pending: Bool { typed != debounced }

    var body: some View {
        Screen(title: "Search") {
            content
                .animation(.snappy, value: typed.isEmpty)
                .animation(.snappy, value: pending)
        }
        .searchable(text: $query, isPresented: $searchActive, placement: .navigationBarDrawer(displayMode: .always), prompt: "Lessons, resources, prospects…")
        .onSubmit(of: .search) { remember() }
        .task(id: query) {
            let value = typed
            if value.isEmpty { debounced = ""; return }
            try? await Task.sleep(for: .milliseconds(200))
            guard !Task.isCancelled else { return }
            debounced = value
        }
        .task {
            try? await Task.sleep(for: .milliseconds(350))
            searchActive = true
        }
    }

    @ViewBuilder private var content: some View {
        if typed.isEmpty {
            idle.transition(.opacity)
        } else if pending {
            VStack(alignment: .leading, spacing: Space.m) {
                SkeletonBlock(height: 18, width: 120)
                SkeletonList(count: 3)
            }
        } else {
            let results = search(debounced.lowercased())
            if results.total == 0 {
                noResults
            } else {
                SearchResultsList(results: results, query: debounced, onTap: remember)
                    .transition(.opacity)
            }
        }
    }

    // MARK: Before typing

    private var idle: some View {
        VStack(alignment: .leading, spacing: Space.xxl) {
            if !store.s.recentSearches.isEmpty {
                VStack(alignment: .leading, spacing: Space.s) {
                    SectionHeader(title: "Recent searches", action: "Clear") {
                        withAnimation(.snappy) { store.s.recentSearches = [] }
                    }
                    ListGroup {
                        ForEach(store.s.recentSearches, id: \.self) { r in
                            ListRow(icon: "clock.arrow.circlepath", title: r) { query = r }
                        }
                    }
                }
            }
            VStack(alignment: .leading, spacing: Space.m) {
                HStack(spacing: Space.s) {
                    Image(systemName: "chart.line.uptrend.xyaxis").foregroundStyle(Theme.brand300)
                    Text("Popular searches").font(.section).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                }
                chips(SearchConfig.popular)
            }
        }
    }

    private func chips(_ items: [String]) -> some View {
        FlowLayout(spacing: Space.s) {
            ForEach(items, id: \.self) { p in
                Button { Haptics.select(); query = p } label: {
                    Text(p)
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(Theme.muted)
                        .padding(.horizontal, 16)
                        .frame(minHeight: 44)
                        .background(Capsule().fill(Theme.surface))
                        .overlay(Capsule().strokeBorder(Theme.line))
                }
                .buttonStyle(.pressable)
                .accessibilityLabel("Search for \(p)")
            }
        }
    }

    private var noResults: some View {
        EmptyStateView(title: "No results for \"\(debounced)\"", message: "Check the spelling or try a broader word. These usually find something:", mood: .sad) {
            chips(Array(SearchConfig.popular.prefix(4)))
        }
    }

    // MARK: Logic

    private func remember() {
        if typed.count >= 2 { store.addRecentSearch(typed) }
    }

    private func search(_ q: String) -> SearchResults {
        guard !q.isEmpty else { return SearchResults() }
        let pathId = store.s.pathId
        func has(_ parts: String...) -> Bool { parts.joined(separator: " ").lowercased().contains(q) }
        var r = SearchResults()
        r.lessons = MockData.lessons(for: pathId).filter { has($0.title, $0.category, $0.summary) }
        r.resources = MockData.resources(for: pathId).filter { has($0.title, $0.type, $0.description) }
        r.missions = MockData.plan(pathId).filter { has($0.theme, $0.missionTitle) }
        r.prospects = store.s.prospects.filter { has($0.name, $0.business, $0.platform, $0.status.rawValue) }
        r.paths = MockData.paths.filter { has($0.name, $0.tagline, $0.service) }
        return r
    }
}

// MARK: Results

private struct SearchResultsList: View {
    let results: SearchResults
    let query: String
    let onTap: () -> Void
    @Environment(AppStore.self) private var store

    var body: some View {
        VStack(alignment: .leading, spacing: Space.xxl) {
            Text("\(results.total) result\(results.total == 1 ? "" : "s") for \"\(query)\"")
                .font(.footnote).monospacedDigit().foregroundStyle(Theme.faint)
                .padding(.bottom, -Space.l)
            group("Lessons", results.lessons.count) {
                ForEach(results.lessons.prefix(SearchConfig.limit)) { LessonCard(lesson: $0, row: true) }
            }
            group("Resources", results.resources.count) {
                ForEach(results.resources.prefix(SearchConfig.limit)) { ResourceCard(resource: $0) }
            }
            group("Missions", results.missions.count) {
                ForEach(results.missions.prefix(SearchConfig.limit)) { missionRow($0) }
            }
            group("Prospects", results.prospects.count) {
                ForEach(results.prospects.prefix(SearchConfig.limit)) { ProspectCard(prospect: $0) }
            }
            group("Paths", results.paths.count) {
                ForEach(results.paths) { pathRow($0) }
            }
        }
        .simultaneousGesture(TapGesture().onEnded { onTap() })
    }

    @ViewBuilder private func group<C: View>(_ title: String, _ count: Int, @ViewBuilder content: () -> C) -> some View {
        if count > 0 {
            VStack(alignment: .leading, spacing: Space.m) {
                HStack(alignment: .firstTextBaseline, spacing: Space.s) {
                    Text(title).font(.section).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                    Text(count > SearchConfig.limit ? "\(SearchConfig.limit) of \(count)" : "\(count)")
                        .font(.footnote).monospacedDigit().foregroundStyle(Theme.faint)
                }
                LazyVGrid(columns: adaptiveColumns(min: 320), spacing: Space.m) { content() }
            }
        }
    }

    private func missionRow(_ d: DayPlan) -> some View {
        let progress = store.program.progress
        let locked = d.day > progress.currentDay
        let done = progress.completedDays.contains(d.day)
        return Button { Haptics.tap(); store.push(.day(d.day)) } label: {
            HStack(spacing: Space.m) {
                Image(systemName: locked ? "lock.fill" : done ? "checkmark.circle.fill" : "target")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(locked ? Theme.faint : done ? Theme.success : Theme.brand300)
                    .frame(width: 44, height: 44)
                    .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.brand500.opacity(0.12)))
                VStack(alignment: .leading, spacing: 2) {
                    Text(d.theme).font(.body.weight(.semibold)).foregroundStyle(Theme.ink).lineLimit(1)
                    Text("Day \(d.day) · \(d.missionTitle)").font(.caption).foregroundStyle(Theme.faint).lineLimit(1)
                }
                Spacer(minLength: 4)
                if locked { Badge("Locked") } else { Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Theme.faint) }
            }
            .card(padding: Space.l)
        }
        .buttonStyle(.pressable)
        .accessibilityLabel("Day \(d.day), \(d.theme)\(locked ? ", locked" : done ? ", completed" : "")")
    }

    private func pathRow(_ p: PathInfo) -> some View {
        Button { Haptics.tap(); store.push(.path(p.id)) } label: {
            HStack(spacing: Space.m) {
                SymbolTile(icon: p.icon, size: 44)
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(p.name).font(.body.weight(.semibold)).foregroundStyle(Theme.ink).lineLimit(1)
                        if p.id == store.s.pathId { Badge("Current", tone: .brand) }
                    }
                    Text(p.tagline).font(.caption).foregroundStyle(Theme.faint).lineLimit(1)
                }
                Spacer(minLength: 4)
                Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Theme.faint)
            }
            .card(padding: Space.l)
        }
        .buttonStyle(.pressable)
    }
}
