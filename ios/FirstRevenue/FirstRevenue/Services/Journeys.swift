import Foundation

/// Journey catalog + per-track content. Stands in for GET /journeys and the journey plan endpoints.
struct JourneyCatalogBundle: Decodable {
    let catalogVersion: Int
    let journeys: [JourneyConfig]
    let metrics: [StatMetric: MetricDef]
    let monetization: [MonetizationStageInfo]
    let universalLessonIds: [String]
    let universalResourceIds: [String]
    let broadNicheTerms: [String]
    let niches: [CatalogNiche]
    let onboarding: [JourneyQuestion]
}

/// Content for a track that isn't part of mock.json (e.g. youtube_owned.json).
struct TrackContent: Decodable {
    struct Coach: Decodable {
        let suggestedPrompts: [String]
        let tips: [String]
        let replies: [CoachReply]
        let fallback: CoachReply
    }
    let path: PathInfo
    let lessonCategories: [String]
    let plan: [DayPlan]
    let lessons: [Lesson]
    let resources: [Resource]
    let achievements: [Achievement]
    let coach: Coach
}

enum Journeys {
    static let catalog: JourneyCatalogBundle = decode("journeys")

    /// Tracks whose content ships in their own file, keyed by track.
    static let tracks: [PathID: TrackContent] = {
        var out: [PathID: TrackContent] = [:]
        for config in catalog.journeys where config.isActive {
            guard let track = config.track, MockData.shared.plans[track.rawValue] == nil else { continue }
            out[track] = decode(track.rawValue)
        }
        return out
    }()

    static var all: [JourneyConfig] { catalog.journeys }
    static var active: [JourneyConfig] { catalog.journeys.filter(\.isActive) }
    static func config(_ id: EarningMethod) -> JourneyConfig? { catalog.journeys.first { $0.id == id } }
    static func config(track: PathID) -> JourneyConfig? { catalog.journeys.first { $0.track == track } }

    static func metric(_ m: StatMetric) -> MetricDef {
        catalog.metrics[m] ?? MetricDef(label: m.rawValue, icon: "chart.bar.fill", kind: .derived, format: .number, hint: "")
    }
    static func monetization(_ id: String) -> MonetizationStageInfo? { catalog.monetization.first { $0.id == id } }

    /// The question that tells us where this method's user starts (its options carry a stage).
    static func stageQuestion(for method: EarningMethod) -> JourneyQuestion? {
        catalog.onboarding.first { $0.applies(to: method) && $0.resolved(for: method).options?.contains { $0.stage != nil } == true }?.resolved(for: method)
    }

    /// "Not yet" / "1–2 paid clients"… in the words of the method's own status question.
    static func stageLabel(_ stage: StartingStage, method: EarningMethod) -> String {
        stageQuestion(for: method)?.options?.first { $0.stage == stage }?.label ?? stage.rawValue.replacingOccurrences(of: "_", with: " ").capitalized
    }

    /// Method-specific answers that change how the plan should be done, as one sentence each.
    static func planNotes(_ answers: JourneyAnswers, method: EarningMethod) -> [String] {
        catalog.onboarding.filter { $0.applies(to: method) }.compactMap { q in
            let picked = answers.extra?[q.key] ?? []
            return q.resolved(for: method).options?.first { picked.contains($0.value) }?.planNote
        }
    }

    /// "Format: Shorts", "Offer: Thumbnails"… for the results and profile screens.
    static func setupSummary(_ answers: JourneyAnswers, method: EarningMethod) -> [(label: String, value: String)] {
        catalog.onboarding.filter { $0.applies(to: method) && $0.summary != nil }.compactMap { q in
            let picked = answers.extra?[q.key] ?? []
            guard let summary = q.summary, let option = q.resolved(for: method).options?.first(where: { picked.contains($0.value) }) else { return nil }
            return (summary, option.label)
        }
    }

    /// Resolves the onboarding answer to a journey. YouTube needs `youtubeMode`; nil means "ask, don't guess".
    static func method(choice: String, youtubeMode: String) -> EarningMethod? {
        if choice == "youtube" {
            switch youtubeMode {
            case "own_channel": return .youtubeOwnedChannel
            case "services": return .youtubeServices
            default: return nil
            }
        }
        return EarningMethod(rawValue: choice)
    }

    private static func decode<T: Decodable>(_ name: String) -> T {
        guard let url = Bundle.main.url(forResource: name, withExtension: "json"), let data = try? Data(contentsOf: url) else {
            fatalError("\(name).json is missing from the app bundle")
        }
        do { return try JSONDecoder().decode(T.self, from: data) } catch { fatalError("\(name).json failed to decode: \(error)") }
    }
}

/// Turns the user's free-text niche into one shared `NicheContext`. Catalog niches get curated
/// audience, claims and restrictions; anything else gets a draft built from the user's own words
/// for the selected earning method — never a generic business plan.
enum NicheResolver {
    private static let stopWords: Set<String> = ["the", "and", "for", "with", "who", "that", "about", "into", "from", "your", "their", "people", "beginners", "beginner"]
    private static let sensitive: [(keywords: [String], restricted: [String], note: String)] = [
        (["law", "legal", "lawyer", "immigration", "visa", "contract"], ["legal advice for specific situations"], "Stay educational: explain general rules and point people to a licensed lawyer."),
        (["tax", "taxes", "insurance", "trading", "crypto", "forex", "invest", "stocks", "loan", "credit"], ["personalised financial advice", "guaranteed returns"], "Educational only: no personalised advice or promised returns, and add a not-financial-advice note."),
        (["medical", "therapy", "therapist", "supplement", "supplements", "disease", "diet", "weight loss", "pregnancy", "mental"], ["diagnosis or treatment", "cure or guaranteed result claims"], "Educational only: never diagnose or promise outcomes, and tell people to consult a professional."),
    ]

    static func isTooBroad(_ raw: String) -> Bool {
        let text = clean(raw).lowercased()
        if text.count < 3 { return true }
        let words = text.split(whereSeparator: { !$0.isLetter && !$0.isNumber }).map(String.init)
        return words.count <= 2 && words.allSatisfy { Journeys.catalog.broadNicheTerms.contains($0) || stopWords.contains($0) }
            || Journeys.catalog.broadNicheTerms.contains(text)
    }

    static func resolve(_ raw: String, detail: String = "", method: EarningMethod, version: Int = 1) -> NicheContext {
        let base = clean(raw)
        let extra = clean(detail)
        let label = extra.isEmpty ? base : (isTooBroad(base) ? extra : "\(base): \(extra)")
        let display = label.prefix(1).uppercased() + label.dropFirst()
        let haystack = " " + label.lowercased() + " "
        let owned = method == .youtubeOwnedChannel
        let products = method == .digitalProducts

        if let match = Journeys.catalog.niches.first(where: { n in n.keywords.contains { haystack.contains(" \($0) ") || haystack.contains(" \($0)s ") } }) {
            let specific = label.lowercased() != match.label.lowercased() && !match.keywords.contains(label.lowercased())
            let client = clientAudience(method, topic: (specific ? label : match.label).lowercased(), catalogLabel: match.label)
            return NicheContext(
                rawInput: [base, extra].filter { !$0.isEmpty }.joined(separator: " — "),
                normalizedLabel: specific ? String(display) : match.label,
                audience: client?.audience ?? match.audience,
                problemOrDesire: client?.problem ?? match.problemOrDesire,
                allowedClaims: match.allowedClaims,
                restrictedTopics: match.restrictedTopics,
                exampleTerms: Array(((specific ? keywords(in: label) : []) + match.exampleTerms).uniqued().prefix(5)),
                monetizationOptions: products ? productMonetization : owned ? match.monetizationOptions : servicesMonetization,
                source: .catalog,
                version: version,
                cautionNote: match.cautionNote
            )
        }

        let flagged = sensitive.filter { s in s.keywords.contains { haystack.contains(" \($0) ") || haystack.contains(" \($0)s ") } }
        let lower = label.lowercased()
        return NicheContext(
            rawInput: [base, extra].filter { !$0.isEmpty }.joined(separator: " — "),
            normalizedLabel: String(display),
            audience: products ? "people who want help with \(lower)" : owned ? "viewers interested in \(lower)" : "people and businesses in \(lower)",
            problemOrDesire: products ? "a ready-made shortcut for \(lower)" : owned ? "clear, trustworthy help with \(lower)" : "getting more done in \(lower) without doing it all themselves",
            allowedClaims: ["general education", "your own experience and results"],
            restrictedTopics: flagged.flatMap(\.restricted),
            exampleTerms: Array((keywords(in: label) + ["\(lower) for beginners"]).uniqued().prefix(5)),
            monetizationOptions: products ? productMonetization : owned ? ["affiliate links for products you use", "sponsorships from brands your viewers use", "a small digital product"] : servicesMonetization,
            source: .generated,
            version: version,
            cautionNote: flagged.first?.note
        )
    }

    /// On a service journey the niche names the client, not the viewer: "gaming" means gaming creators
    /// (or gaming businesses), so the audience is who pays. Client-type catalog niches already describe them.
    private static func clientAudience(_ method: EarningMethod, topic: String, catalogLabel: String) -> (audience: String, problem: String)? {
        guard !["Local businesses", "Podcasters and creators"].contains(catalogLabel) else { return nil }
        switch method {
        case .youtubeServices: return ("YouTube creators in \(topic)", "more reach and better videos without doing all the work themselves")
        case .freelanceServices: return ("businesses in \(topic)", "more customers finding and choosing them")
        default: return nil
        }
    }

    private static let productMonetization = ["one small, specific product to start", "a bundle once the first product sells", "an email list for every launch"]

    private static let servicesMonetization = ["a small paid starter package", "a monthly retainer once results show"]

    private static func clean(_ s: String) -> String {
        s.trimmingCharacters(in: .whitespacesAndNewlines.union(.punctuationCharacters))
            .split(whereSeparator: \.isWhitespace).joined(separator: " ")
            .prefix(80).description
    }

    private static func keywords(in label: String) -> [String] {
        label.lowercased().split(whereSeparator: { !$0.isLetter && !$0.isNumber }).map(String.init)
            .filter { $0.count >= 4 && !stopWords.contains($0) && !Journeys.catalog.broadNicheTerms.contains($0) }
    }
}

extension Array where Element: Hashable {
    func uniqued() -> [Element] {
        var seen = Set<Element>()
        return filter { seen.insert($0).inserted }
    }
}
