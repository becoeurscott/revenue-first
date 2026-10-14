import Foundation

/// The mock data layer. Everything the app shows comes from `mock.json`
/// (exported from the web prototype by `scripts/export-data.mjs`).
/// To connect a real backend, replace this loader with API calls that return the same models.
struct MockDataBundle: Decodable {
    let paths: [PathInfo]
    let plans: [String: [DayPlan]]
    let lessons: [Lesson]
    let lessonCategories: [String]
    let resources: [Resource]
    let prospects: [Prospect]
    let deals: [Deal]
    let templates: [OutreachTemplate]
    let generatorOptions: GeneratorOptions
    let pricing: PricingData
    let notifications: [AppNotification]
    let achievements: [Achievement]
    let coach: CoachData
    let help: HelpData
    let subscription: SubscriptionData
    let onboarding: OnboardingData
    let mentorCheck: MentorCheckData
    let user: UserProfile
    let answers: OnboardingAnswers
}

enum MockData {
    static let shared: MockDataBundle = load()

    static let totalDays = 30

    static var paths: [PathInfo] { shared.paths + Journeys.tracks.values.map(\.path).sorted { $0.name < $1.name } }
    static func path(_ id: PathID) -> PathInfo {
        guard let p = paths.first(where: { $0.id == id }) else { fatalError("No content for track \(id.rawValue)") }
        return p
    }
    static func path(slug: String) -> PathInfo? { paths.first { $0.slug == slug } }

    static func plan(_ id: PathID) -> [DayPlan] { shared.plans[id.rawValue] ?? Journeys.tracks[id]?.plan ?? [] }
    static func day(_ id: PathID, _ day: Int) -> DayPlan? { plan(id).first { $0.day == day } }

    static var allLessons: [Lesson] { shared.lessons + Journeys.tracks.values.flatMap(\.lessons) }
    static var allResources: [Resource] { shared.resources + Journeys.tracks.values.flatMap(\.resources) }
    static var lessonCategories: [String] { (shared.lessonCategories + Journeys.tracks.values.flatMap(\.lessonCategories)).uniqued() }

    static func lesson(_ id: String?) -> Lesson? { allLessons.first { $0.id == id } }
    static func lessons(for path: PathID) -> [Lesson] { allLessons.filter { inScope($0.path, $0.id, path, Journeys.catalog.universalLessonIds) } }
    static func resource(_ id: String?) -> Resource? { allResources.first { $0.id == id } }
    static func resources(for path: PathID) -> [Resource] { allResources.filter { inScope($0.path, $0.id, path, Journeys.catalog.universalResourceIds) } }

    /// "all" content in mock.json is written for client work: only service tracks get all of it.
    private static func inScope(_ scope: String, _ id: String, _ path: PathID, _ universal: [String]) -> Bool {
        scope == path.rawValue || (scope == "all" && (path.isService || universal.contains(id)))
    }

    static func achievements(for journey: JourneyConfig) -> [Achievement] {
        shared.achievements.filter { journey.achievementIds.contains($0.id) } + (journey.track.flatMap { Journeys.tracks[$0]?.achievements } ?? [])
    }

    static func coachPrompts(_ path: PathID) -> [String] { shared.coach.suggestedPrompts[path.rawValue] ?? Journeys.tracks[path]?.coach.suggestedPrompts ?? [] }
    static func coachTips(_ path: PathID) -> [String] { shared.coach.tips[path.rawValue] ?? Journeys.tracks[path]?.coach.tips ?? [] }
    static func coachReplies(_ path: PathID) -> [CoachReply] { shared.coach.replies + (Journeys.tracks[path]?.coach.replies ?? []) }
    static func coachFallback(_ path: PathID) -> CoachReply { Journeys.tracks[path]?.coach.fallback ?? shared.coach.fallback }

    /// Day whose mission unlocks a curriculum lesson (nil for library lessons, which are always open).
    static func lessonDay(_ lesson: Lesson, path: PathID) -> Int? { plan(path).first { $0.lessonId == lesson.id }?.day }

    private static func load() -> MockDataBundle {
        guard let url = Bundle.main.url(forResource: "mock", withExtension: "json"), let data = try? Data(contentsOf: url) else {
            fatalError("mock.json is missing from the app bundle")
        }
        // Mock dates were frozen at export time. Shift every date by the time since export
        // so "2 days ago" in the data still reads as 2 days ago today.
        let exportedAt = (try? JSONDecoder().decode(ExportStamp.self, from: data)).flatMap { ISO.parse($0.exportedAt) } ?? Date()
        let offset = Date().timeIntervalSince(exportedAt)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { d in
            let raw = try d.singleValueContainer().decode(String.self)
            guard let date = ISO.parse(raw) else { throw DecodingError.dataCorrupted(.init(codingPath: d.codingPath, debugDescription: "Bad date \(raw)")) }
            return date.addingTimeInterval(offset)
        }
        do {
            return try decoder.decode(MockDataBundle.self, from: data)
        } catch {
            fatalError("mock.json failed to decode: \(error)")
        }
    }

    private struct ExportStamp: Decodable { let exportedAt: String }
}

enum ISO {
    private static let fractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    private static let plain = ISO8601DateFormatter()
    static func parse(_ s: String) -> Date? { fractional.date(from: s) ?? plain.date(from: s) }
}
