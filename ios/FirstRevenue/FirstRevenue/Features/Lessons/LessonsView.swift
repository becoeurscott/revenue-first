import SwiftUI

private enum LessonsScope: String, CaseIterable, Hashable {
    case all = "All", recent = "Recently watched", saved = "Saved"
}

/// Lesson library: the path curriculum plus shared lessons, with search and filters.
struct LessonsView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.isPresented) private var isPresented
    @State private var scope: LessonsScope = .all
    @State private var category = "All"
    @State private var query = ""
    @State private var loading = true

    private var all: [Lesson] { MockData.lessons(for: store.s.pathId) }

    private var categories: [String] {
        let pool = all
        return ["All"] + MockData.shared.lessonCategories.filter { c in pool.contains { $0.category == c } }
    }

    private var filtered: [Lesson] {
        let pool = all
        var items = pool
        switch scope {
        case .all: break
        case .saved: items = store.s.savedLessons.compactMap { id in pool.first { $0.id == id } }
        case .recent: items = store.s.recentLessons.compactMap { id in pool.first { $0.id == id } }
        }
        if category != "All" { items = items.filter { $0.category == category } }
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        if !q.isEmpty { items = items.filter { "\($0.title) \($0.category) \($0.summary)".lowercased().contains(q) } }
        return items
    }

    private var pristine: Bool { query.trimmingCharacters(in: .whitespaces).isEmpty && category == "All" }

    var body: some View {
        Screen(title: "Lessons", subtitle: "\(store.program.path.name) curriculum + the shared library", large: !isPresented) {
            VStack(alignment: .leading, spacing: Space.l) {
                watchedCard.fadeUp(0)
                controls
                results.padding(.top, Space.xs)
            }
        }
        .task {
            guard loading else { return }
            try? await Task.sleep(for: .milliseconds(450))
            withAnimation(.snappy) { loading = false }
        }
        .onChange(of: store.s.pathId) { _, _ in category = "All" }
    }

    // MARK: Sections

    private var watchedCard: some View {
        let pool = all
        let watched = pool.filter { store.s.completedLessons.contains($0.id) }.count
        return VStack(alignment: .leading, spacing: Space.s) {
            HStack {
                Text("Lessons watched").font(.footnote.weight(.medium)).foregroundStyle(Theme.muted)
                Spacer()
                Text("\(watched) / \(pool.count)").font(.footnote.weight(.semibold)).monospacedDigit().foregroundStyle(Theme.ink)
            }
            ProgressBar(value: pool.isEmpty ? 0 : Double(watched) / Double(pool.count), label: "Lessons watched")
        }
        .card(padding: Space.l)
    }

    private var controls: some View {
        VStack(alignment: .leading, spacing: Space.m) {
            SearchField(text: $query, placeholder: "Search lessons")
            SegmentedTabs(options: LessonsScope.allCases, selection: $scope, title: { $0.rawValue })
            FilterChips(options: categories, selection: $category)
        }
    }

    @ViewBuilder private var results: some View {
        let items = filtered
        if loading {
            skeletonGrid
        } else if !items.isEmpty {
            LazyVGrid(columns: adaptiveColumns(min: 160), spacing: Space.m) {
                ForEach(Array(items.enumerated()), id: \.element.id) { i, lesson in
                    LessonCard(lesson: lesson).fadeUp(i)
                }
            }
        } else {
            emptyState
        }
    }

    @ViewBuilder private var emptyState: some View {
        if scope == .saved && pristine {
            EmptyStateView(title: "No saved lessons", message: "Tap the bookmark on any lesson to keep it here for later.") {
                Button("Browse Lessons") { withAnimation(.snappy) { scope = .all } }.buttonStyle(.fr(.secondary))
            }
        } else if scope == .recent && pristine {
            EmptyStateView(title: "Nothing watched yet", message: "Lessons you open will show up here so you can pick up where you left off.", mood: .sleepy) {
                Button("Browse Lessons") { withAnimation(.snappy) { scope = .all } }.buttonStyle(.fr(.secondary))
            }
        } else {
            EmptyStateView(title: "No lessons found", message: noResultsMessage, mood: .thinking) {
                Button("Clear Filters") { clearFilters() }.buttonStyle(.fr(.secondary))
            }
        }
    }

    private var noResultsMessage: String {
        let q = query.trimmingCharacters(in: .whitespaces)
        return q.isEmpty ? "No lessons in this category yet." : "Nothing matches “\(q)”. Try a broader word like “outreach” or “pricing”."
    }

    private var skeletonGrid: some View {
        LazyVGrid(columns: adaptiveColumns(min: 160), spacing: Space.m) {
            ForEach(0..<6, id: \.self) { _ in
                VStack(alignment: .leading, spacing: 10) {
                    SkeletonBlock(height: 92, radius: Radius.md)
                    SkeletonBlock(height: 14).padding(.trailing, 24)
                    SkeletonBlock(height: 12, width: 70).padding(.bottom, 4)
                }
                .card(padding: 10)
            }
        }
        .accessibilityElement()
        .accessibilityLabel("Loading lessons")
    }

    private func clearFilters() {
        Haptics.tap()
        withAnimation(.snappy) {
            query = ""
            category = "All"
            scope = .all
        }
    }
}
