import Foundation

enum DayStatus { case completed, today, inProgress, locked }

struct Program {
    let pathId: PathID
    let path: PathInfo
    let plan: [DayPlan]
    let progress: PathProgress
    let today: DayPlan
    let todayDone: Bool
    let tasksDone: Int
    let finished: Bool
    var totalDays: Int { MockData.totalDays }
    var daysCompleted: Int { progress.completedDays.count }
    var currentDay: Int { progress.currentDay }
}

struct Stats {
    var missions = 0, daysCompleted = 0, lessons = 0, streak = 0, longestStreak = 0
    var prospects = 0, contacted = 0, replies = 0, clients = 0
    var revenue = 0, booked = 0, potential = 0, conversion = 0
    /// Journey metrics computed from logged events (totals, weekly totals, or the latest logged value).
    /// A "latest" metric that was never logged is absent, so it can show "—" instead of 0.
    var logged: [StatMetric: Double] = [:]
    var xp = 0, level = 1
    var levelProgress = 0.0

    func value(_ m: StatMetric) -> Int {
        switch m {
        case .missions: missions
        case .lessons: lessons
        case .streak: streak
        case .prospects: prospects
        case .contacted: contacted
        case .replies: replies
        case .clients: clients
        case .revenue: revenue
        case .daysCompleted: daysCompleted
        default: Int((logged[m] ?? 0).rounded())
        }
    }

    /// Display string in the metric's own format ("—" for values the user has never logged).
    func display(_ m: StatMetric) -> String {
        let def = Journeys.metric(m)
        let raw: Double? = def.kind == .latest ? logged[m] : (def.kind == .derived ? Double(value(m)) : logged[m] ?? 0)
        guard let v = raw else { return "—" }
        switch def.format {
        case .money: return money(Int(v.rounded()))
        case .percent: return v.formatted(.number.precision(.fractionLength(0...1))) + "%"
        case .minutes: return v >= 120 ? (v / 60).formatted(.number.precision(.fractionLength(0...1))) + " h" : "\(Int(v.rounded())) min"
        case .number: return Int(v.rounded()).formatted()
        }
    }

    /// Computes every event-based metric from a journey's log.
    static func logged(from events: [MetricEvent]) -> [StatMetric: Double] {
        var out: [StatMetric: Double] = [:]
        for (metric, def) in Journeys.catalog.metrics {
            switch def.kind {
            case .count, .sum:
                out[metric] = events.filter { $0.key == metric }.reduce(0) { $0 + $1.value }
            case .latest:
                if let v = events.last(where: { $0.key == metric })?.value { out[metric] = v }
            case .weekly:
                guard let of = def.of else { continue }
                out[metric] = events.filter { $0.key == of && $0.date > Date.daysAgo(7) }.reduce(0) { $0 + $1.value }
            case .derived:
                continue
            }
        }
        return out
    }
}

extension AppStore {
    /// The active journey. Before onboarding it falls back to the journey of the stored track.
    var journey: JourneyConfig {
        if let id = s.journey?.activeId, let c = Journeys.config(id), c.isActive { return c }
        guard let c = Journeys.config(track: s.pathId) else { fatalError("No journey for track \(s.pathId.rawValue)") }
        return c
    }

    var enrollment: JourneyEnrollment? { s.journey.flatMap { $0.enrollments[$0.activeId] } }
    var niche: NicheContext? { enrollment?.niche }
    var enrolledJourneys: [EarningMethod] { Journeys.active.map(\.id).filter { s.journey?.enrollments[$0] != nil } }

    /// The first goal the user picked for the active journey.
    var goal: GoalOption {
        enrollment?.goal ?? GoalOption(label: money(s.user.goalAmount), metric: .revenue, target: max(s.user.goalAmount, 1), money: true)
    }

    var achievements: [Achievement] { MockData.achievements(for: journey) }

    /// The board format the user chose in onboarding (Shorts, Printable…), or the workspace's first format.
    var defaultFormat: String {
        let picked: [String: String] = ["shorts": "Short", "long": "Long-form", "template": "Template", "guide": "Guide", "printable": "Printable", "course": "Mini-course"]
        let a = enrollment?.answers
        let formats = journey.workspace?.formats ?? []
        let choice = picked[a?.answer("videoFormat") ?? ""] ?? picked[a?.answer("productType") ?? ""]
        return choice.flatMap { formats.contains($0) ? $0 : nil } ?? formats.first ?? ""
    }

    /// Coach chats belong to the journey they were started in.
    var coachConversations: [CoachConversation] {
        s.conversations.filter { $0.journeyId == journey.id.rawValue || ($0.journeyId == nil && journey.sellsServices) }
    }

    var program: Program {
        let pathId = s.pathId
        let progress = s.progress[pathId] ?? PathProgress()
        let today = MockData.day(pathId, progress.currentDay) ?? MockData.plan(pathId)[0]
        return Program(
            pathId: pathId,
            path: MockData.path(pathId),
            plan: MockData.plan(pathId),
            progress: progress,
            today: today,
            todayDone: progress.completedDays.contains(progress.currentDay),
            tasksDone: today.tasks.filter { s.tasks[$0.id] != nil }.count,
            finished: progress.completedDays.count >= MockData.totalDays
        )
    }

    /// Explore mode: without a subscription every mission is a preview; starting one opens the paywall.
    func isDayPremiumLocked(_ day: Int) -> Bool { !isPremium }

    /// Why a future day is still hidden.
    func lockReason(_ day: Int) -> String {
        if isDayPremiumLocked(day) { return "Unlock with Premium" }
        let p = s.progress[s.pathId] ?? PathProgress()
        return p.completedDays.contains(day - 1) ? "Unlocks tomorrow" : "Finish Day \(day - 1) to unlock"
    }

    func dayStatus(_ day: Int) -> DayStatus {
        let p = s.progress[s.pathId] ?? PathProgress()
        if p.completedDays.contains(day) { return .completed }
        if day > p.currentDay || isDayPremiumLocked(day) { return .locked }
        let started = MockData.day(s.pathId, day)?.tasks.contains { s.tasks[$0.id] != nil } ?? false
        return started ? .inProgress : .today
    }

    var stats: Stats {
        var st = Stats()
        st.daysCompleted = s.progress[s.pathId]?.completedDays.count ?? 0
        st.missions = st.daysCompleted
        st.lessons = s.completedLessons.count
        st.streak = s.streak
        st.longestStreak = s.longestStreak
        // Every metric belongs to the active journey: a service journey counts only its own track's pipeline.
        let prospects = s.prospects.filter { $0.path == s.pathId }
        let deals = s.deals.filter { $0.path == s.pathId }
        st.prospects = prospects.count
        st.contacted = prospects.filter { $0.status != .new }.count
        st.replies = prospects.filter { ProspectStatus.repliedGroup.contains($0.status) }.count
        st.clients = prospects.filter { $0.status == .won }.count
        func sum(_ status: DealStatus) -> Int { deals.filter { $0.status == status }.reduce(0) { $0 + $1.amount } }
        st.revenue = sum(.collected)
        st.booked = sum(.booked)
        st.potential = sum(.potential)
        st.conversion = st.contacted > 0 ? Int((Double(st.clients) / Double(st.contacted) * 100).rounded()) : 0
        st.logged = Stats.logged(from: enrollment?.metricEvents ?? [])
        st.xp = s.xp
        st.level = s.xp / 400 + 1
        st.levelProgress = Double(s.xp % 400) / 400
        return st
    }

    /// RevenueCat is authoritative; the local flag backs the prototype controls in Settings.
    var isPremium: Bool { s.subscription.status == .active || RevenueCatService.shared.isPro }
    var unreadCount: Int { s.notifications.filter { !$0.read }.count }
    var isOffline: Bool { s.settings.offline }

    func isLessonLocked(_ lesson: Lesson) -> Bool {
        guard let day = MockData.lessonDay(lesson, path: s.pathId) else { return false }
        return !(s.progress[s.pathId]?.completedDays.contains(day) ?? false)
    }

    /// Runs `action` if Premium; otherwise opens the paywall for `feature`.
    func requirePremium(_ feature: String, _ action: () -> Void) {
        if isPremium { action() } else { paywallFeature = feature }
    }
}
