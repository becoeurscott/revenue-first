import Foundation

// Journeys: how the user earns (earning method), what they focus on (niche), where they start
// (starting stage) and what limits them (constraints). Mirrors docs/JOURNEY_ARCHITECTURE_HANDOFF.md.
// The catalog is loaded from Resources/Data/journeys.json until the backend serves GET /journeys.

enum EarningMethod: String, Codable, CaseIterable, Identifiable, Hashable, CodingKeyRepresentable {
    case youtubeOwnedChannel = "youtube_owned_channel"
    case youtubeServices = "youtube_services"
    case freelanceServices = "freelance_services"
    case digitalProducts = "digital_products"
    case affiliateContent = "affiliate_content"
    case creatorBrand = "creator_brand"
    case unknown
    var id: String { rawValue }
}

enum StartingStage: String, Codable, CaseIterable, Identifiable, Hashable {
    case idea, started
    case someTraction = "some_traction"
    case alreadyEarning = "already_earning"
    var id: String { rawValue }
}

enum JourneyStatus: String, Codable, Hashable { case active, comingSoon = "coming_soon" }
enum EnrollmentStatus: String, Codable, Hashable { case active, paused, completed, abandoned }

/// The single interpretation of the user's niche that every surface reads.
struct NicheContext: Codable, Hashable {
    enum Source: String, Codable, Hashable { case catalog, userConfirmed = "user_confirmed", aiGenerated = "ai_generated", generated }
    var rawInput: String
    var normalizedLabel: String
    var audience: String
    var problemOrDesire: String
    var allowedClaims: [String]
    var restrictedTopics: [String]
    var exampleTerms: [String]
    var monetizationOptions: [String]
    var source: Source
    var version: Int
    /// Shown wherever advice could drift into professional claims (health, finance, legal).
    var cautionNote: String?

    /// Fills {niche}, {audience}, {problem} and {terms} in catalog copy.
    func fill(_ template: String) -> String {
        template
            .replacingOccurrences(of: "{niche}", with: normalizedLabel)
            .replacingOccurrences(of: "{audience}", with: audience)
            .replacingOccurrences(of: "{problem}", with: problemOrDesire)
            .replacingOccurrences(of: "{terms}", with: exampleTerms.prefix(3).joined(separator: ", "))
    }
}

struct GoalOption: Codable, Hashable {
    let label: String
    let metric: StatMetric
    let target: Int
    var money: Bool? = nil
    var isMoney: Bool { money == true }
}

struct JourneyConfig: Codable, Identifiable, Hashable {
    let id: EarningMethod
    let version: Int
    let status: JourneyStatus
    let label: String
    let shortLabel: String
    let description: String
    /// SF Symbol name
    let icon: String
    let hue: Double
    /// Content track for plan, lessons, resources and coach copy. Nil while the journey is coming soon.
    let track: PathID?
    let planId: String?
    let primaryAction: String
    let modules: [String]
    let metrics: [StatMetric]
    let achievementIds: [String]
    let monetizationStages: [String]
    let requiresProspects: Bool
    let requiresDeals: Bool
    let goalOptions: [GoalOption]
    let checkinMetrics: [StatMetric]
    let quickActions: [String]

    var isActive: Bool { status == .active && track != nil }
    func has(_ module: String) -> Bool { modules.contains(module) }
    var sellsServices: Bool { requiresProspects }
}

struct MetricDef: Codable, Hashable {
    enum Kind: String, Codable, Hashable { case count, sum, latest, derived }
    enum Format: String, Codable, Hashable { case number, money, percent, minutes }
    let label: String
    /// SF Symbol name
    let icon: String
    let kind: Kind
    let format: Format
    let hint: String
}

struct MonetizationStageInfo: Codable, Hashable, Identifiable {
    let id: String
    let title: String
    let summary: String
    let readyWhen: [String]
    let actions: [String]
}

struct CatalogNiche: Codable, Hashable {
    let keywords: [String]
    let label: String
    let audience: String
    let problemOrDesire: String
    let allowedClaims: [String]
    let restrictedTopics: [String]
    let exampleTerms: [String]
    let monetizationOptions: [String]
    let cautionNote: String?
}

struct JourneyQuestionOption: Codable, Hashable {
    let value: String
    let label: String
    /// SF Symbol name
    let icon: String
    let hint: String?
    /// Status questions: the starting stage this answer means.
    var stage: StartingStage? = nil
    /// How this answer changes the plan; shown on mission cards.
    var planNote: String? = nil
}

/// The onboarding branches: each question can be limited to some earning methods, depend on an
/// earlier answer, and reword itself (or swap its options) per method.
struct JourneyQuestion: Codable, Hashable {
    struct Condition: Codable, Hashable {
        let key: String
        var anyOf: [String]? = nil
        var noneOf: [String]? = nil
    }
    struct Variant: Codable, Hashable {
        var title: String? = nil
        var subtitle: String? = nil
        var placeholder: String? = nil
        var options: [JourneyQuestionOption]? = nil
    }

    /// Built-ins: name | earningMethod | youtubeMode | niche | nicheDetail | weeklyTime | budget | skills | equipment | location | goal.
    /// Any other key is method-specific and stored in `JourneyAnswers.extra`.
    let key: String
    let icon: String
    let title: String
    let subtitle: String
    /// text | single | multi | goal
    let kind: String
    let options: [JourneyQuestionOption]?
    let placeholder: String?
    let required: Bool
    let mascotLine: String
    /// Asked only for these earning methods (nil = everyone).
    var methods: [EarningMethod]? = nil
    var showIf: Condition? = nil
    var variants: [EarningMethod: Variant]? = nil
    /// Short label for the "Your setup" summary (nil = not summarized).
    var summary: String? = nil

    func resolved(for method: EarningMethod?) -> JourneyQuestion {
        guard let method, let v = variants?[method] else { return self }
        var q = JourneyQuestion(key: key, icon: icon, title: v.title ?? title, subtitle: v.subtitle ?? subtitle, kind: kind,
                                options: v.options ?? options, placeholder: v.placeholder ?? placeholder, required: required, mascotLine: mascotLine)
        q.methods = methods; q.showIf = showIf; q.summary = summary
        return q
    }

    func applies(to method: EarningMethod?) -> Bool {
        guard let methods else { return true }
        return method.map(methods.contains) ?? false
    }
}

struct ContentStageInfo: Codable, Hashable {
    let stage: ContentStage
    let label: String
    let icon: String
    let nextAction: String
}

/// What the user answered while setting up a journey.
struct JourneyAnswers: Codable, Hashable {
    var earningMethod: EarningMethod = .unknown
    /// "own_channel" | "services" when the user picked YouTube.
    var youtubeMode: String = ""
    var niche = ""
    var nicheDetail = ""
    var startingStage: StartingStage? = nil
    var weeklyTime = ""
    var budget = ""
    var skills: [String] = []
    var equipment: [String] = []
    var location = ""
    var goal = ""
    /// Method-specific answers keyed by question key (e.g. "videoFormat": ["shorts"]). Optional so older saves load.
    var extra: [String: [String]]? = nil

    func answer(_ key: String) -> String { extra?[key]?.first ?? "" }
}

enum ContentStage: String, Codable, CaseIterable, Identifiable, Hashable {
    case idea, researched, scripted, recorded, edited, published
    var id: String { rawValue }
    var next: ContentStage? {
        let all = Self.allCases
        guard let i = all.firstIndex(of: self), i + 1 < all.count else { return nil }
        return all[i + 1]
    }
}

struct ContentItem: Codable, Hashable, Identifiable {
    let id: String
    var title: String
    var format: String
    var stage: ContentStage
    var notes: String
    var link: String
    let createdAt: Date
    var publishedAt: Date?
}

struct MetricEvent: Codable, Hashable, Identifiable {
    let id: String
    let key: StatMetric
    let value: Double
    let date: Date
    var note: String? = nil
    /// The content item or income entry this event came from.
    var refId: String? = nil
}

struct JourneyEnrollment: Codable, Hashable, Identifiable {
    let id: String
    let journeyId: EarningMethod
    let journeyVersion: Int
    let planId: String
    /// Every niche interpretation this enrollment has used, oldest first; the last one is current.
    var nicheHistory: [NicheContext]
    /// Niche version in force when each day was completed, so later niche changes don't rewrite history.
    var completedDayNiche: [Int: Int] = [:]
    var startingStage: StartingStage
    var answers: JourneyAnswers
    var goal: GoalOption
    let startedAt: Date
    var completedAt: Date?
    var status: EnrollmentStatus
    var monetizationStage: String
    var contentItems: [ContentItem] = []
    var metricEvents: [MetricEvent] = []

    var niche: NicheContext { nicheHistory[nicheHistory.count - 1] }

    func niche(forDay day: Int) -> NicheContext {
        guard let v = completedDayNiche[day], let n = nicheHistory.first(where: { $0.version == v }) else { return niche }
        return n
    }
}

/// Persisted journey state. Optional in `Snapshot` so saves from before journeys still load.
struct JourneyState: Codable, Hashable {
    var activeId: EarningMethod
    var enrollments: [EarningMethod: JourneyEnrollment]
    /// Coming-soon methods the user asked to hear about.
    var waitlist: [EarningMethod] = []
}

extension JourneyConfig {
    var coachGateMessage: String {
        sellsServices
            ? "Get instant, practical answers about clients, pricing and outreach, tailored to your journey."
            : "Get instant, practical answers about ideas, scripts, packaging, analytics and monetization, tailored to your channel."
    }
}
