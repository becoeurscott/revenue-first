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
        }
    }
}

extension AppStore {
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

    func dayStatus(_ day: Int) -> DayStatus {
        let p = s.progress[s.pathId] ?? PathProgress()
        if p.completedDays.contains(day) { return .completed }
        if day > p.currentDay { return .locked }
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
        st.prospects = s.prospects.count
        st.contacted = s.prospects.filter { $0.status != .new }.count
        st.replies = s.prospects.filter { ProspectStatus.repliedGroup.contains($0.status) }.count
        st.clients = s.prospects.filter { $0.status == .won }.count
        func sum(_ status: DealStatus) -> Int { s.deals.filter { $0.status == status }.reduce(0) { $0 + $1.amount } }
        st.revenue = sum(.collected)
        st.booked = sum(.booked)
        st.potential = sum(.potential)
        st.conversion = st.contacted > 0 ? Int((Double(st.clients) / Double(st.contacted) * 100).rounded()) : 0
        st.xp = s.xp
        st.level = s.xp / 400 + 1
        st.levelProgress = Double(s.xp % 400) / 400
        return st
    }

    var isPremium: Bool { s.subscription.status == .active }
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
