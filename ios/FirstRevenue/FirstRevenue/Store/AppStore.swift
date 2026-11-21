import Foundation
import Observation
import SwiftUI
import RevenueCat

enum TaskState: String, Codable, Hashable { case done, skipped }
enum SubscriptionStatus: String, Codable, Hashable { case none, active, expired }

struct PathProgress: Codable, Hashable {
    var currentDay = 1
    var completedDays: [Int] = []
}

struct AppSettings: Codable, Hashable {
    var push = true
    var dailyReminders = true
    var weeklyCheckins = true
    var coachMessages = true
    var darkMode = true
    var language = "English"
    var reminderTime = "9:00 AM"
    /// Kept so older saves decode; the switch was removed and is always reset to false.
    var offline = false
    /// The onboarding voice is muted (nil in older saves = on).
    var voiceMuted: Bool? = nil
}

struct Subscription: Codable, Hashable {
    var status: SubscriptionStatus = .none
    var plan: String? = nil // monthly | yearly
    var renews: Date? = nil
}

/// Everything that is persisted. Mirrors the web store's snapshot so both prototypes behave the same.
struct Snapshot: Codable {
    var authed = false
    /// The signed-in Vaulten account.
    var account: AuthUser?
    var onboarded = false
    var user: UserProfile
    var answers = OnboardingAnswers()
    /// Active content track; always the track of the active journey once onboarded.
    var pathId: PathID = .clipping
    /// Nil until onboarding finishes (and in saves from before journeys, which `migrate` fills in).
    var journey: JourneyState?
    /// Onboarding as a guest: the account is created at the end, once the plan is ready.
    var guest: Bool?
    /// The 25% offer after the first paywall close has been shown.
    var offerAShown: Bool?
    /// When the 50% offer was first shown; it expires 24 hours later.
    var offerBShownAt: Date?
    var subscription = Subscription()
    var progress: [PathID: PathProgress] = [.clipping: .init(), .gbp: .init()]
    var tasks: [String: TaskState] = [:]
    var taskNotes: [String: String] = [:]
    var completedLessons: [String] = []
    var savedLessons: [String] = []
    var recentLessons: [String] = []
    var savedResources: [String] = []
    var xp = 0
    var streak = 0
    var longestStreak = 0
    var activeDays: [String] = []
    var prospects: [Prospect] = []
    var deals: [Deal] = []
    var notifications: [AppNotification] = []
    var conversations: [CoachConversation] = []
    var customTemplates: [OutreachTemplate] = []
    var checkins: [WeeklyCheckin] = []
    var recentSearches: [String] = []
    var checklistState: [String: [String]] = [:]
    var settings = AppSettings()
}

struct Toast: Identifiable, Equatable {
    enum Tone { case success, error, info, warning }
    let id = UUID()
    let message: String
    let tone: Tone
}

/// Screens presented full-screen, outside the tab bar.
enum Cover: Identifiable, Hashable {
    case mission(Int), checkIn, complete
    /// Premium just arrived: the unlock animation, then the rest of the program is written.
    case programUnlock
    var id: String {
        switch self {
        case .mission(let d): "mission-\(d)"
        case .checkIn: "checkin"
        case .complete: "complete"
        case .programUnlock: "program-unlock"
        }
    }
}

enum AppTab: String, Hashable, CaseIterable {
    case home, plan, coach, progress, profile
    // Sidebar-only destinations (iPad / regular width)
    case paths, prospects, revenue, channel, lessons, resources, achievements
}

/// Single source of truth. Every mutation below maps 1:1 to a future API call.
@Observable
@MainActor
final class AppStore {
    var s: Snapshot { didSet { scheduleSave() } }

    // Transient UI state (not persisted)
    var tab: AppTab = .home
    var paths: [AppTab: NavigationPath] = [:]
    var cover: Cover?
    var toast: Toast?
    var paywallFeature: String?
    /// Someone answered "Under 18" in onboarding. Kept outside the snapshot so logging out or starting over
    /// doesn't lift it on this phone.
    /// Debug builds (Xcode, simulator) start unblocked on every launch so the flow can be tested again;
    /// TestFlight and App Store builds keep the block.
    var ageBlocked = AppStore.debugBuild ? false : UserDefaults.standard.bool(forKey: "vaulten.ageBlocked") {
        didSet { UserDefaults.standard.set(ageBlocked, forKey: "vaulten.ageBlocked") }
    }
    /// The program write in flight, so the plan tab and the unlock screen share one run.
    var programTask: Task<Void, Never>?

    private let fileURL: URL = {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("firstrevenue-state.json")
    }()
    private var saveTask: Task<Void, Never>?

    init() {
        if let data = try? Data(contentsOf: fileURL), let saved = try? JSONDecoder().decode(Snapshot.self, from: data) {
            s = saved
        } else {
            s = AppStore.fresh()
        }
        // Every session needs a real account with a stored token. Saves from the removed offline demo had
        // no account, so they start over at sign-in.
        if s.authed, s.account == nil { s = AppStore.fresh() }
        if s.authed, Keychain.load() == nil { s.authed = false }
        s.settings.offline = false
        AppStore.migrate(&s)
        NotificationCenter.default.addObserver(forName: VaultenAPI.sessionEndedNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self, self.s.account != nil else { return }
                self.s.authed = false
                self.paths = [:]
                self.cover = nil
                self.showToast("Your session ended. Please sign in again.", .info)
            }
        }
    }

    // MARK: Persistence

    private func scheduleSave() {
        syncReminders()
        saveTask?.cancel()
        let snapshot = s
        let url = fileURL
        saveTask = Task.detached(priority: .utility) {
            try? await Task.sleep(for: .milliseconds(250))
            guard !Task.isCancelled, let data = try? JSONEncoder().encode(snapshot) else { return }
            try? data.write(to: url, options: .atomic)
        }
    }

    #if DEBUG
    static let debugBuild = true
    #else
    static let debugBuild = false
    #endif

    static func fresh() -> Snapshot {
        var user = MockData.shared.user
        user.name = ""; user.email = ""; user.skills = []; user.joined = Date()
        return Snapshot(user: user)
    }

    /// Saves from before journeys only knew a service path: map it to its service journey, keeping all progress.
    static func migrate(_ s: inout Snapshot) {
        guard s.onboarded, s.journey == nil else { return }
        var state = JourneyState(activeId: .youtubeServices, enrollments: [:])
        for track in [PathID.clipping, .gbp] where track == s.pathId || !(s.progress[track]?.completedDays.isEmpty ?? true) {
            guard let config = Journeys.config(track: track) else { continue }
            let answers = JourneyAnswers(earningMethod: config.id, youtubeMode: track == .clipping ? "services" : "", niche: track == .clipping ? "Podcasters and creators" : "Local businesses", startingStage: .idea, weeklyTime: s.user.time, budget: s.user.budget, skills: s.user.skills, goal: s.user.goal)
            var e = enrollment(config.id, answers: answers, startedAt: s.user.joined)
            e.goal = GoalOption(label: money(s.user.goalAmount), metric: .revenue, target: max(s.user.goalAmount, 1), money: true)
            e.status = track == s.pathId ? .active : .paused
            state.enrollments[config.id] = e
            if track == s.pathId { state.activeId = config.id }
        }
        s.journey = state
    }

    /// A fresh enrollment for an active journey. The niche is resolved once here and shared by every screen.
    static func enrollment(_ method: EarningMethod, answers: JourneyAnswers, startedAt: Date = Date()) -> JourneyEnrollment {
        guard let config = Journeys.config(method), config.isActive, let track = config.track else {
            fatalError("enrollment(\(method.rawValue)) requires an active journey")
        }
        let niche = NicheResolver.resolve(answers.niche, detail: answers.nicheDetail, method: method)
        let goal = config.goalOptions.first { $0.label == answers.goal } ?? config.goalOptions[0]
        let stage = answers.startingStage ?? .idea
        let monetization: String = {
            let stages = config.monetizationStages
            switch stage {
            case .idea, .started: return stages.first ?? ""
            case .someTraction: return stages[safe: 1] ?? stages.first ?? ""
            case .alreadyEarning: return stages[safe: 2] ?? stages.last ?? ""
            }
        }()
        return JourneyEnrollment(id: UID.make("en"), journeyId: method, journeyVersion: config.version, planId: config.planId ?? track.rawValue,
                                 nicheHistory: [niche], startingStage: stage, answers: answers, goal: goal, startedAt: startedAt,
                                 completedAt: nil, status: .active, monetizationStage: monetization)
    }

    // MARK: Feedback & navigation

    func showToast(_ message: String, _ tone: Toast.Tone = .success) {
        let t = Toast(message: message, tone: tone)
        withAnimation(.spring(duration: 0.35)) { toast = t }
        Haptics.notify(tone == .error ? .error : tone == .warning ? .warning : .success)
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(2.8))
            if toast == t { withAnimation(.easeOut(duration: 0.25)) { toast = nil } }
        }
    }

    func push(_ route: Route, on tab: AppTab? = nil) {
        let target = tab ?? self.tab
        self.tab = target
        paths[target, default: NavigationPath()].append(route)
    }

    func popToRoot(_ tab: AppTab? = nil) { paths[tab ?? self.tab] = NavigationPath() }

    func binding(for tab: AppTab) -> Binding<NavigationPath> {
        Binding(get: { self.paths[tab] ?? NavigationPath() }, set: { self.paths[tab] = $0 })
    }

    /// Opens a web-style link from mock data (notifications) natively.
    func open(link: String) {
        switch link {
        case "/check-in": cover = .checkIn
        case "/30-day-complete": cover = .complete
        case "/home": tab = .home; popToRoot(.home)
        case "/plan": tab = .plan; popToRoot(.plan)
        case "/coach": tab = .coach; popToRoot(.coach)
        case "/progress": tab = .progress; popToRoot(.progress)
        case "/profile": tab = .profile; popToRoot(.profile)
        default:
            if let route = Route(link: link) { push(route) }
        }
    }

    // MARK: Auth

    /// A real Vaulten session was created. The same account resumes its local progress;
    /// a different account starts fresh (the server is the source of truth for identity).
    func signedIn(_ user: AuthUser, enrollment: Enrollment? = nil) {
        Task { await RevenueCatService.shared.identify(appUserID: user.id) }
        BackendSync.ensureEnglish()
        let name = [user.firstName, user.lastName].compactMap { $0 }.joined(separator: " ")
        if s.account == nil, s.guest == true {
            // A guest finishing onboarding: keep everything they answered and attach the new account.
            s.account = user
            s.authed = true
            s.guest = nil
            if s.user.name.isEmpty { s.user.name = name }
            s.user.email = user.email
            if s.answers.name.isEmpty { s.answers.name = user.firstName ?? "" }
            // An existing account that is already enrolled resumes it instead of the guest plan.
            if let enrollment, let path = enrollment.path { applyEnrollment(path, day: enrollment.currentDay) }
        } else if s.account?.id == user.id {
            s.account = user
            s.authed = true
            if let enrollment, let path = enrollment.path, !s.onboarded { applyEnrollment(path, day: enrollment.currentDay) }
        } else {
            var snap = AppStore.fresh()
            snap.authed = true
            snap.account = user
            snap.user.name = name
            snap.user.email = user.email
            snap.answers.name = user.firstName ?? ""
            s = snap
            // Already enrolled on the server (e.g. a new phone): skip onboarding, resume the path.
            if let enrollment, let path = enrollment.path { applyEnrollment(path, day: enrollment.currentDay) }
        }
        tab = .home; paths = [:]
        Monitoring.identify(userId: user.id, path: s.onboarded ? s.pathId.rawValue : nil)
        Push.identify(userId: user.id, path: s.onboarded ? s.pathId.rawValue : nil)
        if s.onboarded && s.settings.push { Push.requestPermission() }
        Monitoring.track("signed_in")
    }

    /// A server enrollment found at sign-in (e.g. a new phone). The backend only knows service tracks today,
    /// so the journey is rebuilt from the track; unknown slugs never reach here (`Enrollment.path` is exact).
    private func applyEnrollment(_ path: PathID, day: Int) {
        guard let config = Journeys.config(track: path) else { return }
        if s.journey?.enrollments[config.id] != nil {
            activate(config.id)
        } else {
            let answers = JourneyAnswers(earningMethod: config.id, youtubeMode: path == .clipping ? "services" : "", niche: path == .clipping ? "Podcasters and creators" : "Local businesses", startingStage: .idea, weeklyTime: s.user.time, budget: s.user.budget, skills: s.user.skills)
            add(AppStore.enrollment(config.id, answers: answers))
        }
        s.onboarded = true
        var p = s.progress[path] ?? .init()
        p.currentDay = max(p.currentDay, day)
        s.progress[path] = p
    }

    /// "Get started" on the welcome screen: onboarding first, account at the end.
    func startGuest() {
        // Signed out but still holding a previous account's finished onboarding (saves from before logout cleared
        // them): start the new guest from a clean slate, or onboarding would be skipped and nothing would happen.
        if !s.authed, s.onboarded {
            let settings = s.settings
            s = AppStore.fresh()
            s.settings = settings
            paths = [:]
        }
        s.guest = true
        Monitoring.track("onboarding_started", ["as": "guest"])
    }

    /// Back out of guest onboarding to the welcome screen.
    func leaveGuest() { s.guest = nil }

    func logout() {
        if s.account != nil { Task { await AuthAPI.logout() } }
        Task { try? await Purchases.shared.logOut() }
        RevenueCatService.shared.clearBackendEntitlement()
        Monitoring.track("signed_out")
        BiometricLock.shared.reset()
        Monitoring.reset()
        Push.reset()
        // Start over clean: the next person on this phone gets the welcome screen and a fresh onboarding,
        // not the previous account's plan. Display preferences (dark mode, sounds) stay.
        let settings = s.settings
        s = AppStore.fresh()
        s.settings = settings
        paths = [:]; cover = nil; tab = .home; paywallFeature = nil
        OfferCenter.shared.cancelTimers()
        OfferCenter.shared.current = nil
    }

    // MARK: Journeys

    /// End of onboarding: enrolls the chosen journey. `day` is the server's current day for enrolled accounts;
    /// `program` is the one written during onboarding (`programUnlocked` once its unlock animation has played).
    func startJourney(_ a: JourneyAnswers, day: Int = 1, program: GeneratedProgram? = nil, programUnlocked: Bool = false) {
        var e = AppStore.enrollment(a.earningMethod, answers: a)
        e.program = program
        if programUnlocked { e.programUnlocked = true }
        add(e)
        guard let track = journey.track else { return }
        s.onboarded = true
        var p = s.progress[track] ?? .init()
        p.currentDay = max(p.currentDay, day)
        s.progress[track] = p
        if s.user.name.isEmpty { s.user.name = s.answers.name }
        s.user.skills = a.skills
        s.user.budget = a.budget
        s.user.time = a.weeklyTime
        s.user.goal = e.goal.label
        if e.goal.metric == .revenue { s.user.goalAmount = e.goal.target }
        notify("paperplane.fill", "Your 30-day plan is ready", "\(isPremium ? "Day 1" : "Week 1") is unlocked: \(journey.primaryAction.lowercased()) starts here. Begin while the motivation is fresh.", "/plan/day/1")
        tab = .home; paths = [:]
        if s.settings.push { Push.requestPermission() }
        // Signed-in accounts: create the matching enrollment on the API now (best effort; subscribers only).
        if s.account != nil { Task { _ = await BackendSync.enrollmentId(for: e) } }
        Monitoring.track("onboarding_completed", ["journey": a.earningMethod.rawValue, "starting_stage": e.startingStage.rawValue, "niche_source": e.niche.source.rawValue, "weekly_time": a.weeklyTime, "goal": e.goal.label])
    }

    /// Adds a journey the user hasn't tried yet and makes it active. Other enrollments are paused, never reset.
    func enroll(_ a: JourneyAnswers) {
        let from = s.journey?.activeId
        add(AppStore.enrollment(a.earningMethod, answers: a))
        Monitoring.track("journey_switched", ["from": from?.rawValue ?? "", "to": a.earningMethod.rawValue, "new_enrollment": true])
        notify(journey.icon, "Journey added", "Your plan, tools and coach now follow \(journey.shortLabel). Progress on your other journey is saved.", "/plan")
        tab = .home; paths = [:]
    }

    /// Switches to a journey the user already has. Its progress resumes exactly where it stopped.
    func switchJourney(_ method: EarningMethod) {
        guard let state = s.journey, state.activeId != method, state.enrollments[method] != nil else { return }
        Monitoring.track("journey_switched", ["from": state.activeId.rawValue, "to": method.rawValue, "new_enrollment": false])
        activate(method)
        notify(journey.icon, "Journey switched", "Your plan, tools and coach now follow \(journey.shortLabel). Progress on your other journey is saved.", "/plan")
    }

    private func add(_ e: JourneyEnrollment) {
        var state = s.journey ?? JourneyState(activeId: e.journeyId, enrollments: [:])
        state.enrollments[e.journeyId] = e
        s.journey = state
        activate(e.journeyId)
    }

    private func activate(_ method: EarningMethod) {
        guard var state = s.journey, let track = Journeys.config(method)?.track else { return }
        for (id, var e) in state.enrollments {
            e.status = id == method ? .active : (e.status == .active ? .paused : e.status)
            state.enrollments[id] = e
        }
        state.activeId = method
        s.journey = state
        s.pathId = track
    }

    func joinWaitlist(_ method: EarningMethod) {
        var state = s.journey ?? JourneyState(activeId: .unknown, enrollments: [:])
        guard !state.waitlist.contains(method) else { return }
        state.waitlist.append(method)
        s.journey = state
        Monitoring.track("journey_waitlist_joined", ["journey": method.rawValue])
    }

    func isOnWaitlist(_ method: EarningMethod) -> Bool { s.journey?.waitlist.contains(method) ?? false }

    /// Applies `change` to the active enrollment.
    func updateEnrollment(_ change: (inout JourneyEnrollment) -> Void) {
        guard var state = s.journey, var e = state.enrollments[state.activeId] else { return }
        change(&e)
        state.enrollments[state.activeId] = e
        s.journey = state
    }

    /// A new niche shapes future missions and coaching; completed days keep the niche they were done with.
    func updateNiche(_ raw: String, detail: String = "") {
        guard let current = enrollment else { return }
        let next = NicheResolver.resolve(raw, detail: detail, method: current.journeyId, version: current.niche.version + 1)
        guard next.normalizedLabel != current.niche.normalizedLabel else { return }
        updateEnrollment {
            $0.nicheHistory.append(next)
            $0.answers.niche = raw
            $0.answers.nicheDetail = detail
        }
        Monitoring.track("niche_updated", ["journey": current.journeyId.rawValue, "source": next.source.rawValue])
    }

    // MARK: Workspace (own channel, digital products…)

    @discardableResult
    func addContent(title: String, format: String) -> String {
        let id = UID.make("v")
        let first = journey.workspace?.stages.first?.stage ?? "idea"
        updateEnrollment { $0.contentItems.insert(ContentItem(id: id, title: title, format: format, stage: first, notes: "", link: "", createdAt: Date(), publishedAt: nil), at: 0) }
        Monitoring.track("content_idea_added", ["format": format, "journey": journey.id.rawValue])
        return id
    }

    /// Moves a board item to its next stage. Reaching the workspace's "done" stage (published, launched…)
    /// logs the done metric, which feeds goals, streak-free progress and achievements.
    func advanceContent(_ id: String) {
        guard let w = journey.workspace, let item = enrollment?.contentItems.first(where: { $0.id == id }), let next = w.next(after: item.stage) else { return }
        let done = next == w.doneStage
        updateEnrollment { e in
            guard let i = e.contentItems.firstIndex(where: { $0.id == id }) else { return }
            e.contentItems[i].stage = next
            if done {
                e.contentItems[i].publishedAt = Date()
                e.metricEvents.append(MetricEvent(id: UID.make("me"), key: w.doneMetric, value: 1, date: Date(), refId: id))
            }
        }
        Monitoring.track("content_stage_advanced", ["to": next, "journey": journey.id.rawValue])
        if done {
            s.xp += 40
            let count = stats.value(w.doneMetric)
            notify(w.icon, count == 1 ? w.doneNoticeFirst : w.fill(w.doneNotice, n: count), "“\(item.title)” is live. Log its numbers in a couple of days to see how it's doing.", "/channel/analytics")
        }
    }

    func updateContent(_ id: String, title: String, format: String, notes: String, link: String) {
        updateEnrollment { e in
            guard let i = e.contentItems.firstIndex(where: { $0.id == id }) else { return }
            e.contentItems[i].title = title
            e.contentItems[i].format = format
            e.contentItems[i].notes = notes
            e.contentItems[i].link = link
        }
    }

    func deleteContent(_ id: String) {
        updateEnrollment { e in
            e.contentItems.removeAll { $0.id == id }
            e.metricEvents.removeAll { $0.refId == id }
        }
    }

    /// Logs a snapshot copied from YouTube Studio, a store dashboard… Only filled-in values are recorded.
    func logNumbers(_ values: [StatMetric: Double]) {
        let events = values.map { MetricEvent(id: UID.make("me"), key: $0.key, value: $0.value, date: Date()) }
        guard !events.isEmpty else { return }
        updateEnrollment { $0.metricEvents.append(contentsOf: events) }
        Monitoring.track("numbers_logged", ["fields": events.map(\.key.rawValue), "journey": journey.id.rawValue])
    }

    /// Logs money from the workspace's income source; for products, also the number of sales.
    func logIncome(amount: Int, source: String, sales: Int? = nil) {
        guard let w = journey.workspace else { return }
        let first = stats.value(w.incomeMetric) == 0
        updateEnrollment { e in
            e.metricEvents.append(MetricEvent(id: UID.make("me"), key: w.incomeMetric, value: Double(amount), date: Date(), note: source))
            if let metric = w.salesMetric, let sales, sales > 0 { e.metricEvents.append(MetricEvent(id: UID.make("me"), key: metric, value: Double(sales), date: Date(), note: source)) }
        }
        Monitoring.track("income_logged", ["source": source, "amount": amount, "first_revenue": first, "journey": journey.id.rawValue])
        if first { notify("dollarsign.circle.fill", "You earned your first \(money(amount))", "From \(source). That's the hardest dollar — the next ones come faster.", "/channel/monetization") }
    }

    func setMonetizationStage(_ id: String) {
        updateEnrollment { $0.monetizationStage = id }
        Monitoring.track("monetization_stage_set", ["stage": id])
    }

    // MARK: Subscription

    func subscribe(_ plan: String) {
        s.subscription = Subscription(status: .active, plan: plan, renews: Date.daysFromNow(plan == "yearly" ? 365 : 30))
        Monitoring.track("subscription_started", ["plan": plan])
    }
    func setSubscription(_ status: SubscriptionStatus) { s.subscription.status = status }

    // MARK: Missions

    func setTask(_ id: String, _ state: TaskState?) {
        s.tasks[id] = state
        if let state { Monitoring.track("mission_task_\(state.rawValue)", ["task_id": id, "path": s.pathId.rawValue]) }
    }
    func setTaskNote(_ id: String, _ note: String) { s.taskNotes[id] = note.isEmpty ? nil : note }

    func completeMission(day: Int) {
        var p = s.progress[s.pathId] ?? .init()
        guard !p.completedDays.contains(day) else { return }
        let plan = MockData.day(s.pathId, day)
        p.completedDays = (p.completedDays + [day]).sorted()
        s.progress[s.pathId] = p
        if let version = enrollment?.niche.version { updateEnrollment { $0.completedDayNiche[day] = version } }
        Monitoring.track("mission_completed", ["day": day, "path": s.pathId.rawValue])
        s.xp += plan?.xp ?? 100
        s.streak += 1
        s.longestStreak = max(s.longestStreak, s.streak)
        // First free calendar slot from today onward (lets testers run several days in one sitting).
        var active = Set(s.activeDays)
        var offset = 0
        while active.contains(Date.daysFromNow(offset).dayKey) { offset += 1 }
        active.insert(Date.daysFromNow(offset).dayKey)
        s.activeDays = Array(active)

        notify("play.rectangle.fill", "You unlocked a new lesson", "Day \(day) mission complete. Your lesson is ready to watch.", plan.map { "/lessons/\($0.lessonId)" } ?? "/lessons")
        if [3, 7, 14, 30].contains(s.streak) {
            notify("flame.fill", "\(s.streak)-day streak!", "Consistency is the whole game. Keep it alive tomorrow.", "/streak")
        }
        if day % 7 == 0 && day < MockData.totalDays {
            notify("square.and.pencil", "Your weekly check-in is ready", "Week \(day / 7) is done. Take 3 minutes to reflect and set next week's focus.", "/check-in")
        }
    }

    func advanceDay() {
        var p = s.progress[s.pathId] ?? .init()
        guard !isDayPremiumLocked(p.currentDay + 1) else { paywallFeature = "the full 30-day plan"; return }
        guard p.completedDays.contains(p.currentDay), p.currentDay < MockData.totalDays else { return }
        p.currentDay += 1
        s.progress[s.pathId] = p
    }

    // MARK: Lessons & resources

    func completeLesson(_ id: String) {
        guard !s.completedLessons.contains(id) else { return }
        s.completedLessons.append(id)
        s.xp += 25
        Monitoring.track("lesson_completed", ["lesson_id": id])
    }
    func toggleSavedLesson(_ id: String) { s.savedLessons.toggle(id); BackendSync.setSaved(kind: "lesson", id: id, saved: s.savedLessons.contains(id)) }
    func touchLesson(_ id: String) { s.recentLessons = Array(([id] + s.recentLessons.filter { $0 != id }).prefix(8)) }
    func toggleSavedResource(_ id: String) { s.savedResources.toggle(id); BackendSync.setSaved(kind: "resource", id: id, saved: s.savedResources.contains(id)) }
    func toggleChecklistItem(resource: String, item: String) {
        var items = s.checklistState[resource] ?? []
        items.toggle(item)
        s.checklistState[resource] = items
    }

    // MARK: Prospects (CRM)

    @discardableResult
    func addProspect(path: PathID, name: String, business: String, platform: String, audience: String, handle: String, about: String, value: Int, gbp: GbpAudit? = nil, status: ProspectStatus = .new) -> String {
        let id = UID.make("p")
        let p = Prospect(id: id, path: path, name: name, business: business, platform: platform, audience: audience, handle: handle, about: about, status: status, lastContact: nil, followUp: nil, value: value, notes: [], history: [event("status", "Added to your prospect list")], gbp: gbp)
        s.prospects.insert(p, at: 0)
        Monitoring.track("prospect_added", ["path": path.rawValue, "platform": platform])
        return id
    }

    func setProspectStatus(_ id: String, _ status: ProspectStatus) {
        guard let i = s.prospects.firstIndex(where: { $0.id == id }), s.prospects[i].status != status else { return }
        let prospect = s.prospects[i]
        s.prospects[i].status = status
        Monitoring.track("prospect_status_updated", ["from": prospect.status.rawValue, "to": status.rawValue])
        if status != .new { s.prospects[i].lastContact = Date() }
        s.prospects[i].history.insert(event("status", "Marked as \(status.rawValue)"), at: 0)

        // Keep the revenue pipeline in sync with the CRM.
        let open = s.deals.firstIndex { $0.prospectId == id && $0.status == .potential }
        let service = prospect.gbp?.service ?? (prospect.path == .clipping ? "Clip starter pack" : "Profile optimization")
        if [.interested, .negotiating].contains(status) && open == nil {
            s.deals.insert(Deal(id: UID.make("d"), prospectId: id, path: prospect.path, client: prospect.name, service: service, amount: prospect.value, status: .potential, date: Date()), at: 0)
        }
        if status == .won {
            if let open {
                s.deals[open].status = .booked
                s.deals[open].date = Date()
            } else {
                s.deals.insert(Deal(id: UID.make("d"), prospectId: id, path: prospect.path, client: prospect.name, service: service, amount: prospect.value, status: .booked, date: Date()), at: 0)
            }
            notify("trophy.fill", "You won \(prospect.business)!", "$\(prospect.value) booked. Send the invoice, then mark it collected in your revenue tracker.", "/revenue")
        }
        if status == .lost, let open { s.deals.remove(at: open) }
    }

    func addProspectNote(_ id: String, _ text: String) {
        guard let i = s.prospects.firstIndex(where: { $0.id == id }) else { return }
        s.prospects[i].notes.insert(ProspectNote(id: UID.make("note"), text: text, date: Date()), at: 0)
        s.prospects[i].history.insert(event("note", "Added a note"), at: 0)
    }

    func setFollowUp(_ id: String, days: Int?) {
        guard let i = s.prospects.firstIndex(where: { $0.id == id }) else { return }
        s.prospects[i].followUp = days.map { Date.daysFromNow($0) }
        if let days { s.prospects[i].history.insert(event("followup", "Follow-up set for \(days == 1 ? "tomorrow" : "in \(days) days")"), at: 0) }
    }

    func logOutreach(_ id: String, _ text: String) {
        guard let i = s.prospects.firstIndex(where: { $0.id == id }) else { return }
        if s.prospects[i].status == .new { s.prospects[i].status = .contacted }
        s.prospects[i].lastContact = Date()
        s.prospects[i].history.insert(event("message", text), at: 0)
        Monitoring.track("outreach_logged", ["path": s.prospects[i].path.rawValue])
    }

    func removeProspect(_ id: String) {
        s.prospects.removeAll { $0.id == id }
        s.deals.removeAll { $0.prospectId == id && $0.status == .potential }
    }

    // MARK: Revenue

    func addDeal(client: String, service: String, amount: Int, status: DealStatus) {
        s.deals.insert(Deal(id: UID.make("d"), prospectId: nil, path: s.pathId, client: client, service: service, amount: amount, status: status, date: Date()), at: 0)
        Monitoring.track("deal_added", ["status": status.rawValue, "amount": amount])
    }

    func setDealStatus(_ id: String, _ status: DealStatus) {
        guard let i = s.deals.firstIndex(where: { $0.id == id }) else { return }
        s.deals[i].status = status
        s.deals[i].date = Date()
        Monitoring.track("deal_status_updated", ["to": status.rawValue, "amount": s.deals[i].amount, "first_revenue": status == .collected && !s.deals.contains { $0.id != id && $0.status == .collected }])
        if status == .collected {
            notify("dollarsign.circle.fill", "\(s.deals[i].client) paid $\(s.deals[i].amount)", "Money in the bank. Your revenue tracker is updated.", "/revenue")
        }
    }

    // MARK: Notifications

    /// Keeps the on-device reminders in step with settings and progress (cheap: replans only on change).
    func syncReminders(force: Bool = false) {
        let program = self.program
        Reminders.sync(force: force, .init(
            enabled: s.authed && s.onboarded,
            daily: s.settings.dailyReminders,
            weekly: s.settings.weeklyCheckins,
            time: s.settings.reminderTime,
            currentDay: program.currentDay,
            todayDone: program.todayDone,
            finished: program.finished,
            todayTitle: program.today.missionTitle,
            lastCheckIn: s.checkins.map(\.date).max()
        ))
    }

    /// A push the user tapped: keep it in the inbox (already read) and go to its screen.
    func receivePush(_ push: OpenedPush) {
        s.notifications.insert(AppNotification(id: UID.make("n"), icon: "bell.fill", title: push.title, body: push.body, date: Date(), read: true, link: push.link), at: 0)
        guard s.authed else { return }
        open(link: push.link)
    }

    func notify(_ icon: String, _ title: String, _ body: String, _ link: String) {
        s.notifications.insert(AppNotification(id: UID.make("n"), icon: icon, title: title, body: body, date: Date(), read: false, link: link), at: 0)
    }
    func toggleRead(_ id: String) {
        if let i = s.notifications.firstIndex(where: { $0.id == id }) { s.notifications[i].read.toggle() }
    }
    func markRead(_ id: String) {
        if let i = s.notifications.firstIndex(where: { $0.id == id }) { s.notifications[i].read = true }
    }
    func markAllRead() { for i in s.notifications.indices { s.notifications[i].read = true } }

    // MARK: Coach

    func startConversation(_ text: String) -> String {
        let id = UID.make("c")
        let title = text.count > 42 ? String(text.prefix(42)) + "…" : text
        s.conversations.insert(CoachConversation(id: id, title: title, date: Date(), messages: [], journeyId: journey.id.rawValue), at: 0)
        return id
    }
    func addChatMessage(_ conversationId: String, from: String, _ text: String) {
        guard let i = s.conversations.firstIndex(where: { $0.id == conversationId }) else { return }
        s.conversations[i].messages.append(ChatMessage(id: UID.make("m"), from: from, text: text, date: Date()))
        s.conversations[i].date = Date()
    }
    func deleteConversation(_ id: String) { s.conversations.removeAll { $0.id == id } }

    // MARK: Templates, check-ins, search

    func saveTemplate(title: String, body: String, stage: String = "First touch") {
        s.customTemplates.insert(OutreachTemplate(id: UID.make("t"), path: s.pathId.rawValue, title: title, stage: stage, body: body, custom: true), at: 0)
    }
    func deleteTemplate(_ id: String) { s.customTemplates.removeAll { $0.id == id } }

    func addCheckin(week: Int, accomplished: String, difficult: String, prospects: Int, replies: Int, published: Int? = nil, madeMoney: Bool, improve: String) {
        Monitoring.track("check_in_saved", ["week": week, "made_money": madeMoney, "prospects": prospects, "replies": replies, "published": published ?? 0, "journey": journey.id.rawValue])
        s.checkins.insert(WeeklyCheckin(id: UID.make("w"), week: week, date: Date(), accomplished: accomplished, difficult: difficult, prospects: prospects, replies: replies, madeMoney: madeMoney, improve: improve,
                                        journeyId: journey.id.rawValue, metrics: published.map { [(journey.workspace?.weeklyMetric ?? .uploadsThisWeek).rawValue: $0] }), at: 0)
        s.xp += 50
    }

    func addRecentSearch(_ q: String) {
        let q = q.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return }
        s.recentSearches = Array(([q] + s.recentSearches.filter { $0.lowercased() != q.lowercased() }).prefix(6))
    }

    // MARK: Helpers

    private func event(_ kind: String, _ text: String) -> ContactEvent { ContactEvent(id: UID.make("e"), kind: kind, text: text, date: Date()) }
}

enum UID {
    static func make(_ prefix: String) -> String { "\(prefix)-\(UUID().uuidString.prefix(8).lowercased())" }
}

extension Array where Element: Equatable {
    mutating func toggle(_ e: Element) {
        if let i = firstIndex(of: e) { remove(at: i) } else { insert(e, at: 0) }
    }
}
