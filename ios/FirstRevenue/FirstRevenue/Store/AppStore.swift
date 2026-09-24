import Foundation
import Observation
import SwiftUI

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
    /// Demo switch: simulates losing the connection.
    var offline = false
}

struct Subscription: Codable, Hashable {
    var status: SubscriptionStatus = .none
    var plan: String? = nil // monthly | yearly
    var renews: Date? = nil
}

/// Everything that is persisted. Mirrors the web store's snapshot so both prototypes behave the same.
struct Snapshot: Codable {
    var authed = false
    var onboarded = false
    var user: UserProfile
    var answers = OnboardingAnswers()
    var pathId: PathID = .clipping
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
    var id: String {
        switch self {
        case .mission(let d): "mission-\(d)"
        case .checkIn: "checkin"
        case .complete: "complete"
        }
    }
}

enum AppTab: String, Hashable, CaseIterable {
    case home, plan, coach, progress, profile
    // Sidebar-only destinations (iPad / regular width)
    case paths, prospects, revenue, lessons, resources, achievements
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
    }

    // MARK: Persistence

    private func scheduleSave() {
        saveTask?.cancel()
        let snapshot = s
        let url = fileURL
        saveTask = Task.detached(priority: .utility) {
            try? await Task.sleep(for: .milliseconds(250))
            guard !Task.isCancelled, let data = try? JSONEncoder().encode(snapshot) else { return }
            try? data.write(to: url, options: .atomic)
        }
    }

    static func fresh() -> Snapshot {
        var user = MockData.shared.user
        user.name = ""; user.email = ""; user.skills = []; user.joined = Date()
        return Snapshot(user: user)
    }

    /// Alex Carter on Day 7 — the returning-user demo account.
    static func demo() -> Snapshot {
        var s = fresh()
        let d = MockData.shared
        s.authed = true
        s.onboarded = true
        s.user = d.user
        s.answers = d.answers
        s.pathId = .clipping
        s.subscription = Subscription(status: .active, plan: "yearly", renews: Date.daysFromNow(359))
        s.progress = [.clipping: PathProgress(currentDay: 7, completedDays: [1, 2, 3, 4, 5, 6]), .gbp: PathProgress()]
        for day in 1...6 { for t in MockData.day(.clipping, day)?.tasks ?? [] { s.tasks[t.id] = .done } }
        for t in (MockData.day(.clipping, 7)?.tasks ?? []).prefix(3) { s.tasks[t.id] = .done }
        s.completedLessons = ["clip-01", "clip-02", "clip-03", "clip-04", "clip-05", "gen-01"]
        s.savedLessons = ["clip-04", "gen-02"]
        s.recentLessons = ["clip-06", "clip-05", "gen-01"]
        s.savedResources = ["res-cold-outreach", "res-pricing-calculator"]
        s.xp = 650
        s.streak = 6
        s.longestStreak = 6
        s.activeDays = (1...6).map { Date.daysAgo($0).dayKey }
        s.prospects = d.prospects.filter { $0.path == .clipping }
        s.deals = d.deals
        s.notifications = d.notifications
        s.conversations = d.coach.conversations
        s.recentSearches = ["outreach template", "pricing", "follow-up"]
        return s
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

    func login() {
        if s.onboarded && !s.user.name.isEmpty { s.authed = true } else { s = AppStore.demo() }
        tab = .home; paths = [:]
    }

    func signup(name: String, email: String) {
        var snap = AppStore.fresh()
        snap.authed = true
        snap.user.name = name
        snap.user.email = email
        snap.answers.name = name.split(separator: " ").first.map(String.init) ?? ""
        s = snap
    }

    func logout() { s.authed = false; paths = [:]; cover = nil }

    func completeOnboarding(path: PathID) {
        let a = s.answers
        s.onboarded = true
        s.pathId = path
        if s.user.name.isEmpty { s.user.name = a.name }
        s.user.role = a.role
        s.user.skills = a.skills
        s.user.experience = a.experience
        s.user.budget = a.budget
        s.user.time = a.time
        s.user.goal = a.goal
        s.user.goalAmount = Int(a.goal.filter(\.isNumber)) ?? 500
        s.user.confidence = a.comfort
        notify("paperplane.fill", "Your 30-day plan is ready", "Day 1 is unlocked. It takes about 20 minutes — start while the motivation is fresh.", "/plan/day/1")
        tab = .home; paths = [:]
    }

    // MARK: Subscription

    func subscribe(_ plan: String) {
        s.subscription = Subscription(status: .active, plan: plan, renews: Date.daysFromNow(plan == "yearly" ? 365 : 30))
    }
    func setSubscription(_ status: SubscriptionStatus) { s.subscription.status = status }

    // MARK: Missions

    func setTask(_ id: String, _ state: TaskState?) { s.tasks[id] = state }
    func setTaskNote(_ id: String, _ note: String) { s.taskNotes[id] = note.isEmpty ? nil : note }

    func completeMission(day: Int) {
        var p = s.progress[s.pathId] ?? .init()
        guard !p.completedDays.contains(day) else { return }
        let plan = MockData.day(s.pathId, day)
        p.completedDays = (p.completedDays + [day]).sorted()
        s.progress[s.pathId] = p
        s.xp += plan?.xp ?? 100
        s.streak += 1
        s.longestStreak = max(s.longestStreak, s.streak)
        // First free calendar slot from today onward (lets the demo run several days in one sitting).
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
        guard p.completedDays.contains(p.currentDay), p.currentDay < MockData.totalDays else { return }
        p.currentDay += 1
        s.progress[s.pathId] = p
    }

    // MARK: Lessons & resources

    func completeLesson(_ id: String) {
        guard !s.completedLessons.contains(id) else { return }
        s.completedLessons.append(id)
        s.xp += 25
    }
    func toggleSavedLesson(_ id: String) { s.savedLessons.toggle(id) }
    func touchLesson(_ id: String) { s.recentLessons = Array(([id] + s.recentLessons.filter { $0 != id }).prefix(8)) }
    func toggleSavedResource(_ id: String) { s.savedResources.toggle(id) }
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
        return id
    }

    func setProspectStatus(_ id: String, _ status: ProspectStatus) {
        guard let i = s.prospects.firstIndex(where: { $0.id == id }), s.prospects[i].status != status else { return }
        let prospect = s.prospects[i]
        s.prospects[i].status = status
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
    }

    func removeProspect(_ id: String) {
        s.prospects.removeAll { $0.id == id }
        s.deals.removeAll { $0.prospectId == id && $0.status == .potential }
    }

    // MARK: Revenue

    func addDeal(client: String, service: String, amount: Int, status: DealStatus) {
        s.deals.insert(Deal(id: UID.make("d"), prospectId: nil, path: s.pathId, client: client, service: service, amount: amount, status: status, date: Date()), at: 0)
    }

    func setDealStatus(_ id: String, _ status: DealStatus) {
        guard let i = s.deals.firstIndex(where: { $0.id == id }) else { return }
        s.deals[i].status = status
        s.deals[i].date = Date()
        if status == .collected {
            notify("dollarsign.circle.fill", "\(s.deals[i].client) paid $\(s.deals[i].amount)", "Money in the bank. Your revenue tracker is updated.", "/revenue")
        }
    }

    // MARK: Notifications

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
        s.conversations.insert(CoachConversation(id: id, title: title, date: Date(), messages: []), at: 0)
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

    func addCheckin(week: Int, accomplished: String, difficult: String, prospects: Int, replies: Int, madeMoney: Bool, improve: String) {
        s.checkins.insert(WeeklyCheckin(id: UID.make("w"), week: week, date: Date(), accomplished: accomplished, difficult: difficult, prospects: prospects, replies: replies, madeMoney: madeMoney, improve: improve), at: 0)
        s.xp += 50
    }

    func addRecentSearch(_ q: String) {
        let q = q.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return }
        s.recentSearches = Array(([q] + s.recentSearches.filter { $0.lowercased() != q.lowercased() }).prefix(6))
    }

    // MARK: Profile, settings, paths

    func switchPath(_ path: PathID) {
        guard s.pathId != path else { return }
        s.pathId = path
        notify("safari.fill", "Path switched", "Your plan, lessons and resources now follow your new path. Progress on the old path is saved.", "/plan")
    }

    func jumpToDay(_ day: Int) {
        let target = min(max(day, 1), MockData.totalDays)
        let completed = Array(1..<target)
        for d in completed { for t in MockData.day(s.pathId, d)?.tasks ?? [] { s.tasks[t.id] = .done } }
        s.progress[s.pathId] = PathProgress(currentDay: target, completedDays: completed)
        s.streak = max(s.streak, target - 1)
        s.longestStreak = max(s.longestStreak, s.streak)
        s.activeDays = (0..<(target - 1)).map { Date.daysAgo($0 + 1).dayKey }
    }

    func resetDemo() {
        s = AppStore.demo()
        tab = .home; paths = [:]; cover = nil
    }

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
