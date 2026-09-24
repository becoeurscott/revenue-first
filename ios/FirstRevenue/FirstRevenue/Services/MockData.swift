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
    let user: UserProfile
    let answers: OnboardingAnswers
}

enum MockData {
    static let shared: MockDataBundle = load()

    static let totalDays = 30

    static var paths: [PathInfo] { shared.paths }
    static func path(_ id: PathID) -> PathInfo { shared.paths.first { $0.id == id }! }
    static func path(slug: String) -> PathInfo? { shared.paths.first { $0.slug == slug } }

    static func plan(_ id: PathID) -> [DayPlan] { shared.plans[id.rawValue] ?? [] }
    static func day(_ id: PathID, _ day: Int) -> DayPlan? { plan(id).first { $0.day == day } }

    static func lesson(_ id: String?) -> Lesson? { shared.lessons.first { $0.id == id } }
    static func lessons(for path: PathID) -> [Lesson] { shared.lessons.filter { $0.path == path.rawValue || $0.path == "all" } }
    static func resource(_ id: String?) -> Resource? { shared.resources.first { $0.id == id } }
    static func resources(for path: PathID) -> [Resource] { shared.resources.filter { $0.path == path.rawValue || $0.path == "all" } }

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
