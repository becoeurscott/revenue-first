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
                // Journey setup for every account; real accounts on a service journey continue into the backend questionnaire.
                OnboardingFlow()
                .transition(.move(edge: .trailing).combined(with: .opacity))
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
            Tab("Coach", systemImage: "sparkles", value: AppTab.coach) { stack(.coach) { CoachView().premiumLocked("the AI Coach") } }
            Tab("Progress", systemImage: "chart.bar.fill", value: AppTab.progress) { stack(.progress) { ProgressScreen().premiumLocked("your progress") } }
            Tab("Profile", systemImage: "person.fill", value: AppTab.profile) { stack(.profile) { ProfileView() } }
                .badge(store.unreadCount)
            // iPad/Mac sidebar also lists the rest of the product (desktop-style navigation).
            // Only added at regular width, so the iPhone tab bar keeps exactly 5 tabs (no "More").
            if hSize == .regular {
            TabSection("Grow") {
                sidebarTab("Journeys", "map.fill", .paths) { PathsView().premiumLocked("journeys") }
                // Each journey shows only its own tools: the client pipeline for services, the channel for creators.
                if store.journey.sellsServices {
                    sidebarTab("Prospects", "person.2.fill", .prospects) { OutreachHubView(initialTab: .prospects).premiumLocked("prospects & outreach") }
                    sidebarTab("Revenue", "dollarsign.circle.fill", .revenue) { RevenueView().premiumLocked("revenue tracking") }
                }
                if store.journey.has("channel") {
                    sidebarTab("Channel", "play.rectangle.fill", .channel) { ChannelHubView(initialTab: .content).premiumLocked("your channel tools") }
                }
            }
            TabSection("Learn") {
                sidebarTab("Lessons", "play.rectangle.fill", .lessons) { LessonsView().premiumLocked("all lessons") }
                sidebarTab("Resources", "folder.fill", .resources) { ResourcesView().premiumLocked("the resource library") }
                sidebarTab("Achievements", "trophy.fill", .achievements) { AchievementsView().premiumLocked("achievements") }
            }
            }
        }
        .tabViewStyle(.sidebarAdaptable)
        .onChange(of: store.tab) { _, _ in Haptics.select() }
        .fullScreenCover(item: $store.cover) { cover in
            Group {
                switch cover {
                case .mission(let day): MissionView(day: day).premiumLocked(store.isDayPremiumLocked(day) ? "the full 30-day plan" : nil)
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
    @Environment(AppStore.self) private var store

    var body: some View {
        if let message = outsideJourney {
            JourneyGateView(message: message)
        } else {
            screen.premiumLocked(lockedFeature)
        }
    }

    /// Tools that belong to another journey (e.g. an old notification link) explain themselves instead of opening.
    private var outsideJourney: String? {
        switch route {
        case .outreach, .prospect, .generate, .pricing, .revenue:
            store.journey.sellsServices ? nil : "Prospects, outreach, pricing and client revenue belong to service journeys. \(store.journey.shortLabel) tracks your content and audience instead."
        case .channel:
            store.journey.has("channel") ? nil : "The channel board, analytics and monetization belong to the own-channel journey."
        default: nil
        }
    }

    /// On the free plan only Day 1, its lesson, and account screens stay open.
    private var lockedFeature: String? {
        switch route {
        case .day, .notifications, .settings, .subscription, .help: nil
        case .lesson(let id): MockData.day(store.s.pathId, 1)?.lessonId == id ? nil : "all lessons"
        case .lessons: "all lessons"
        case .coachConversation: "the AI Coach"
        case .outreach, .prospect, .generate: "prospects & outreach"
        case .pricing: "the pricing assistant"
        case .revenue: "revenue tracking"
        case .channel: "your channel tools"
        case .paths, .path: "journeys"
        case .streak, .achievements: "your progress"
        case .resources, .resource: "the resource library"
        case .search: "search"
        case .mentorCheck: "Mentor Check"
        }
    }

    @ViewBuilder private var screen: some View {
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
        case .channel(let t): ChannelHubView(initialTab: t)
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
