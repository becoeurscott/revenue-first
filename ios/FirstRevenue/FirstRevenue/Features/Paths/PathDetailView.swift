import SwiftUI

enum PathDetailTab: String, CaseIterable, Hashable {
    case overview = "Overview", plan = "30-Day Plan", skills = "Skills", tools = "Tools", lessons = "Lessons", resources = "Resources", clients = "Clients"
}

struct PathDetailView: View {
    let pathId: PathID
    @Environment(AppStore.self) private var store
    @State private var tab: PathDetailTab = .overview
    @State private var switchTarget: PathID?
    @State private var loadedTabs: Set<PathDetailTab> = [.overview, .plan, .skills, .tools]
    @State private var loading = false

    private var path: PathInfo { MockData.path(pathId) }
    private var active: Bool { store.s.pathId == pathId }

    var body: some View {
        Screen(title: path.name) {
            VStack(alignment: .leading, spacing: Space.l) {
                PathDetailHero(path: path, active: active).fadeUp(0)
                LazyVStack(alignment: .leading, spacing: Space.l, pinnedViews: [.sectionHeaders]) {
                    Section {
                        tabContent
                            .id(tab)
                            .transition(.opacity.combined(with: .offset(y: 8)))
                    } header: {
                        tabBar
                    }
                }
            }
        }
        .pathSwitchAlert(target: $switchTarget)
        .task(id: tab) { await fakeLoad(tab) }
    }

    private var tabBar: some View {
        SegmentedTabs(options: PathDetailTab.allCases, selection: $tab, title: { $0.rawValue })
            .padding(.vertical, Space.s)
            .padding(.horizontal, Space.gutter)
            .background(Theme.bg.opacity(0.94))
            .padding(.horizontal, -Space.gutter)
            .accessibilityLabel("\(path.name) sections")
    }

    @ViewBuilder private var tabContent: some View {
        if loading {
            SkeletonList(count: 3)
        } else {
            switch tab {
            case .overview: PathOverviewTab(path: path, active: active) { PathSwitch.request(pathId, store: store, target: $switchTarget) }
            case .plan: PathPlanTabView(path: path, active: active)
            case .skills: PathSkillsTab(path: path)
            case .tools: PathToolsTab(path: path)
            case .lessons: PathLessonsTab(pathId: pathId)
            case .resources: PathResourcesTab(pathId: pathId)
            case .clients: PathClientsTab(path: path, active: active)
            }
        }
    }

    /// Lists that would come from an API show a brief skeleton the first time they open.
    private func fakeLoad(_ t: PathDetailTab) async {
        guard !loadedTabs.contains(t) else { return }
        loading = true
        try? await Task.sleep(for: .milliseconds(450))
        loadedTabs.insert(t)
        withAnimation(.snappy) { loading = false }
    }
}

// MARK: - Hero

private struct PathDetailHero: View {
    let path: PathInfo
    let active: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            HStack(alignment: .top, spacing: Space.l) {
                Image(systemName: path.icon).font(.system(size: 26, weight: .semibold)).foregroundStyle(.white)
                    .frame(width: 64, height: 64)
                    .background(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).fill(.black.opacity(0.25)))
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: Radius.lg, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(.white.opacity(0.15)))
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 6) {
                        if active { Badge("Active path", tone: .brand) }
                        Badge(path.difficulty, tone: .success)
                    }
                    Text(path.name).font(.title1).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                    Text(path.tagline).font(.callout).foregroundStyle(Theme.inkSoft.opacity(0.85)).fixedSize(horizontal: false, vertical: true)
                }
            }
            .accessibilityElement(children: .combine)
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .top, spacing: Space.m) { tiles }
                VStack(spacing: Space.m) { tiles }
            }
        }
        .padding(Space.l + 4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(PathHeroBackdrop(hue: path.hue, strength: 0.55))
        .clipShape(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).strokeBorder(Theme.line))
    }

    @ViewBuilder private var tiles: some View {
        PathInfoTile(label: "Typical price", value: path.typicalPrice)
        PathInfoTile(label: "What you sell", value: path.service)
    }
}

// MARK: - Overview

private struct PathOverviewTab: View {
    let path: PathInfo
    let active: Bool
    let onSwitch: () -> Void
    @Environment(AppStore.self) private var store

    var body: some View {
        Adaptive2Col(spacing: Space.l) {
            status
            about
        } trailing: {
            listCard("Typical first tasks", items: path.firstTasks)
            listCard("How the work flows", items: path.workflow)
        }
    }

    private var progress: PathProgress { store.s.progress[path.id] ?? PathProgress() }

    @ViewBuilder private var status: some View {
        let done = progress.completedDays.count
        if active {
            VStack(alignment: .leading, spacing: Space.m) {
                HStack {
                    Text("Your progress").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink)
                    Spacer()
                    Text("\(done) / \(MockData.totalDays) days").font(.footnote).monospacedDigit().foregroundStyle(Theme.muted)
                }
                ProgressBar(value: Double(done) / Double(MockData.totalDays), label: "\(path.name) progress")
                Button { Haptics.tap(); store.push(.day(progress.currentDay)) } label: {
                    Label("Continue Day \(progress.currentDay)", systemImage: "arrow.right").labelStyle(TrailingIconLabel())
                }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
                .padding(.top, 4)
            }
            .card(.hero)
        } else {
            VStack(alignment: .leading, spacing: Space.s) {
                Text(done > 0 ? "You completed \(done) of \(MockData.totalDays) days here" : "You are not on this path yet")
                    .font(.body.weight(.semibold)).foregroundStyle(Theme.ink)
                Text("Switching keeps all progress on your current path. \(store.isPremium ? "You can switch back at any time." : "Path switching is part of Premium.")")
                    .font(.subheadline).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
                Button(action: onSwitch) {
                    Label("Switch to this path", systemImage: store.isPremium ? "arrow.triangle.2.circlepath" : "lock.fill")
                }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
                .padding(.top, Space.s)
            }
            .card(.hero)
        }
    }

    private var about: some View {
        VStack(alignment: .leading, spacing: Space.m) {
            Text("About this path").font(.section).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
            Text(path.description).font(.subheadline).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
            PathObjectiveBox(objective: path.objective, title: "30-day objective")
        }
        .card()
    }

    private func listCard(_ title: String, items: [String]) -> some View {
        VStack(alignment: .leading, spacing: Space.m) {
            Text(title).font(.section).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
            PathNumberedList(items: items)
        }
        .card()
    }
}
