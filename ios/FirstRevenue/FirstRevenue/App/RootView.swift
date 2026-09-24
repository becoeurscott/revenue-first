import SwiftUI

/// Splash → signed-out flow → onboarding → main app.
struct RootView: View {
    @Environment(AppStore.self) private var store
    @State private var splashDone = false

    var body: some View {
        @Bindable var store = store
        ZStack {
            Theme.bg.ignoresSafeArea()
            if !splashDone {
                SplashView { withAnimation(.easeInOut(duration: 0.4)) { splashDone = true } }
                    .transition(.opacity)
            } else if !store.s.authed {
                AuthFlow().transition(.opacity)
            } else if !store.s.onboarded {
                OnboardingFlow().transition(.move(edge: .trailing).combined(with: .opacity))
            } else {
                MainTabView().transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.35), value: store.s.authed)
        .animation(.easeInOut(duration: 0.35), value: store.s.onboarded)
        .overlay { ToastOverlay() }
        .sheet(item: Binding(get: { store.paywallFeature.map(IdentifiedString.init) }, set: { store.paywallFeature = $0?.value })) { f in
            PaywallSheet(feature: f.value)
        }
    }
}

struct IdentifiedString: Identifiable { let value: String; var id: String { value } }

struct MainTabView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.horizontalSizeClass) private var hSize

    var body: some View {
        @Bindable var store = store
        TabView(selection: $store.tab) {
            Tab("Home", systemImage: "house.fill", value: AppTab.home) { stack(.home) { HomeView() } }
            Tab("Plan", systemImage: "calendar.badge.checkmark", value: AppTab.plan) { stack(.plan) { PlanView() } }
            Tab("Coach", systemImage: "sparkles", value: AppTab.coach) { stack(.coach) { CoachView() } }
            Tab("Progress", systemImage: "chart.bar.fill", value: AppTab.progress) { stack(.progress) { ProgressScreen() } }
            Tab("Profile", systemImage: "person.fill", value: AppTab.profile) { stack(.profile) { ProfileView() } }
                .badge(store.unreadCount)
            // iPad/Mac sidebar also lists the rest of the product (desktop-style navigation).
            // Only added at regular width, so the iPhone tab bar keeps exactly 5 tabs (no "More").
            if hSize == .regular {
            TabSection("Grow") {
                sidebarTab("Paths", "map.fill", .paths) { PathsView() }
                sidebarTab("Prospects", "person.2.fill", .prospects) { OutreachHubView(initialTab: .prospects) }
                sidebarTab("Revenue", "dollarsign.circle.fill", .revenue) { RevenueView() }
            }
            TabSection("Learn") {
                sidebarTab("Lessons", "play.rectangle.fill", .lessons) { LessonsView() }
                sidebarTab("Resources", "folder.fill", .resources) { ResourcesView() }
                sidebarTab("Achievements", "trophy.fill", .achievements) { AchievementsView() }
            }
            }
        }
        .tabViewStyle(.sidebarAdaptable)
        .onChange(of: store.tab) { _, _ in Haptics.select() }
        .fullScreenCover(item: $store.cover) { cover in
            Group {
                switch cover {
                case .mission(let day): MissionView(day: day)
                case .checkIn: CheckInView()
                case .complete: CompleteView()
                }
            }
            .environment(store)
            .preferredColorScheme(store.s.settings.darkMode ? .dark : .light)
            .overlay { ToastOverlay() }
        }
        .overlay(alignment: .top) { OfflineBanner() }
    }

    private func sidebarTab<Root: View>(_ title: String, _ icon: String, _ tab: AppTab, @ViewBuilder root: @escaping () -> Root) -> some TabContent<AppTab> {
        Tab(title, systemImage: icon, value: tab) { stack(tab, root: root) }
            .defaultVisibility(.hidden, for: .tabBar)
    }

    private func stack<Root: View>(_ tab: AppTab, @ViewBuilder root: () -> Root) -> some View {
        NavigationStack(path: store.binding(for: tab)) {
            root().navigationDestination(for: Route.self) { RouteView(route: $0) }
        }
    }
}

struct OfflineBanner: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        if store.isOffline {
            Label("You're offline. Changes are saved on this device.", systemImage: "wifi.slash")
                .font(.caption.weight(.semibold)).foregroundStyle(Theme.warning)
                .padding(.horizontal, 14).padding(.vertical, 7)
                .background(Capsule().fill(Theme.warning.opacity(0.15))).background(.ultraThinMaterial, in: Capsule())
                .padding(.top, 2)
                .allowsHitTesting(false)
        }
    }
}

/// Maps every pushable route to its screen.
struct RouteView: View {
    let route: Route
    var body: some View {
        switch route {
        case .day(let d): DayDetailView(day: d)
        case .lessons: LessonsView()
        case .lesson(let id): LessonDetailView(id: id)
        case .coachConversation(let id): CoachConversationView(id: id)
        case .outreach(let tab): OutreachHubView(initialTab: tab)
        case .prospect(let id): ProspectDetailView(id: id)
        case .generate(let pid): OutreachGenerateView(prospectId: pid)
        case .pricing: PricingView()
        case .revenue: RevenueView()
        case .paths: PathsView()
        case .path(let p): PathDetailView(pathId: p)
        case .streak: StreakView()
        case .achievements: AchievementsView()
        case .resources: ResourcesView()
        case .resource(let id): ResourceDetailView(id: id)
        case .notifications: NotificationsView()
        case .settings: SettingsView()
        case .subscription: SubscriptionView()
        case .help: HelpView()
        case .search: SearchView()
        case .mentorCheck: MentorCheckView()
        }
    }
}
