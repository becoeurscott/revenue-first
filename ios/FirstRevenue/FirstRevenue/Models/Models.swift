import Foundation

// Domain models. They mirror src/data/types.ts in the web prototype and decode
// Resources/Data/mock.json, which is exported from that TypeScript data layer.
// ALL DATA IN THIS APP IS FICTITIOUS.

enum PathID: String, Codable, CaseIterable, Identifiable, Hashable {
    case clipping, gbp
    var id: String { rawValue }
    var other: PathID { self == .clipping ? .gbp : .clipping }
}

struct PathWeek: Codable, Hashable { let week: Int; let title: String; let focus: [String] }
struct PathTool: Codable, Hashable { let name: String; let purpose: String; let cost: String }

struct PathInfo: Codable, Identifiable, Hashable {
    let id: PathID
    let slug: String
    let name: String
    let tagline: String
    /// SF Symbol name
    let icon: String
    let hue: Double
    let description: String
    let difficulty: String
    let objective: String
    let service: String
    let typicalPrice: String
    let skills: [String]
    let firstTasks: [String]
    let workflow: [String]
    let weeks: [PathWeek]
    let tools: [PathTool]
}

struct MissionTask: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let description: String
    let resourceId: String?
}

struct DayPlan: Codable, Identifiable, Hashable {
    var id: Int { day }
    let day: Int
    let week: Int
    let theme: String
    let missionTitle: String
    let goal: String
    let minutes: Int
    let difficulty: String
    let xp: Int
    let lessonId: String
    let tasks: [MissionTask]
}

struct Lesson: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let category: String
    /// "clipping" | "gbp" | "all"
    let path: String
    let duration: String
    let minutes: Int
    let hue: Double
    let summary: String
    let learn: [String]
    let takeaways: [String]
    let resourceIds: [String]
    let instructor: String

    var seconds: Int {
        let parts = duration.split(separator: ":").compactMap { Int($0) }
        return parts.count == 2 ? parts[0] * 60 + parts[1] : minutes * 60
    }
}

struct ResourceSection: Codable, Hashable { let heading: String; let body: [String] }

struct Resource: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    /// Template | Tool | Guide | Checklist | Script | Calculator
    let type: String
    let path: String
    let description: String
    let minutes: Int
    let sections: [ResourceSection]
    let link: String?
}

enum ProspectStatus: String, Codable, CaseIterable, Identifiable, Hashable {
    case new = "New", contacted = "Contacted", replied = "Replied", interested = "Interested"
    case negotiating = "Negotiating", won = "Won", lost = "Lost"
    var id: String { rawValue }
    static let repliedGroup: [ProspectStatus] = [.replied, .interested, .negotiating, .won]
}

struct ProspectNote: Codable, Identifiable, Hashable { let id: String; let text: String; let date: Date }

struct ContactEvent: Codable, Identifiable, Hashable {
    let id: String
    /// message | reply | call | status | note | followup
    let kind: String
    let text: String
    let date: Date
}

struct GbpAudit: Codable, Hashable {
    let rating: Double
    let reviews: Int
    let category: String
    let city: String
    let problems: [String]
    let service: String
}

struct Prospect: Codable, Identifiable, Hashable {
    let id: String
    var path: PathID
    var name: String
    var business: String
    var platform: String
    var audience: String
    var handle: String
    var about: String
    var status: ProspectStatus
    var lastContact: Date?
    var followUp: Date?
    var value: Int
    var notes: [ProspectNote]
    var history: [ContactEvent]
    var gbp: GbpAudit?
}

enum DealStatus: String, Codable, CaseIterable, Identifiable, Hashable {
    case potential = "Potential", booked = "Booked", collected = "Collected"
    var id: String { rawValue }
}

struct Deal: Codable, Identifiable, Hashable {
    let id: String
    var prospectId: String?
    var path: PathID
    var client: String
    var service: String
    var amount: Int
    var status: DealStatus
    var date: Date
}

struct OutreachTemplate: Codable, Identifiable, Hashable {
    let id: String
    let path: String
    let title: String
    /// First touch | Follow-up | Reply | Closing
    let stage: String
    let body: String
    var custom: Bool?
}

struct AppNotification: Codable, Identifiable, Hashable {
    let id: String
    /// SF Symbol name
    let icon: String
    let title: String
    let body: String
    let date: Date
    var read: Bool
    /// Web-style route, e.g. "/plan/day/7". Parsed by `Route(link:)`.
    let link: String
}

enum StatMetric: String, Codable, Hashable {
    case missions, lessons, streak, prospects, contacted, replies, clients, revenue, daysCompleted
}

struct Achievement: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let description: String
    /// SF Symbol name
    let icon: String
    let metric: StatMetric
    let target: Int
    let money: Bool?
}

struct ChatMessage: Codable, Identifiable, Hashable {
    let id: String
    /// "user" | "coach"
    let from: String
    let text: String
    let date: Date
    var isUser: Bool { from == "user" }
}

struct CoachConversation: Codable, Identifiable, Hashable {
    let id: String
    var title: String
    var date: Date
    var messages: [ChatMessage]
}

struct CoachReply: Codable, Hashable {
    let id: String
    let keywords: [String]
    /// keyed by "clipping" / "gbp" / "all"
    let text: [String: String]
    let followUps: [String]
    func text(for path: PathID) -> String { text[path.rawValue] ?? text["all"] ?? text.values.first ?? "" }
}

struct WeeklyCheckin: Codable, Identifiable, Hashable {
    let id: String
    let week: Int
    let date: Date
    let accomplished: String
    let difficult: String
    let prospects: Int
    let replies: Int
    let madeMoney: Bool
    let improve: String
}

struct FaqItem: Codable, Hashable { let q: String; let a: String }
struct HelpTopic: Codable, Identifiable, Hashable { let id: String; let icon: String; let title: String; let description: String }
struct SubscriptionPlan: Codable, Identifiable, Hashable {
    let id: String // monthly | yearly
    let name: String
    let price: String
    let period: String
    let note: String
    let badge: String?
}
struct Benefit: Codable, Hashable { let icon: String; let title: String; let description: String }

struct OnboardingOption: Codable, Hashable { let value: String; let icon: String; let hint: String? }
struct OnboardingStep: Codable, Hashable {
    let key: String
    /// SF Symbol name
    let icon: String
    let title: String
    let subtitle: String
    /// text | single | multi
    let kind: String
    let options: [OnboardingOption]?
    let placeholder: String?
    let mascotLine: String
}

struct OnboardingAnswers: Codable, Hashable {
    var name = ""
    var role = ""
    var skills: [String] = []
    var experience = ""
    var time = ""
    var budget = ""
    var comfort = ""
    var interest = ""
    var goal = ""
    var blocker = ""
    var learning = ""
    var commitment = ""

    subscript(key: String) -> String {
        get {
            switch key {
            case "name": name
            case "role": role
            case "experience": experience
            case "time": time
            case "budget": budget
            case "comfort": comfort
            case "interest": interest
            case "goal": goal
            case "blocker": blocker
            case "learning": learning
            case "commitment": commitment
            default: ""
            }
        }
        set {
            switch key {
            case "name": name = newValue
            case "role": role = newValue
            case "experience": experience = newValue
            case "time": time = newValue
            case "budget": budget = newValue
            case "comfort": comfort = newValue
            case "interest": interest = newValue
            case "goal": goal = newValue
            case "blocker": blocker = newValue
            case "learning": learning = newValue
            case "commitment": commitment = newValue
            default: break
            }
        }
    }
}

struct UserProfile: Codable, Hashable {
    var name: String
    var email: String
    var age: Int
    var role: String
    var skills: [String]
    var experience: String
    var budget: String
    var time: String
    var goal: String
    var goalAmount: Int
    var confidence: String
    var joined: Date

    var firstName: String { name.split(separator: " ").first.map(String.init) ?? "" }
}

struct LabeledMultiplier: Codable, Hashable { let label: String; let mult: Double }
struct PricedService: Codable, Hashable { let label: String; let base: Double }
struct PricingPathOptions: Codable, Hashable { let services: [PricedService]; let scopes: [LabeledMultiplier] }
struct PricingData: Codable, Hashable {
    let options: [String: PricingPathOptions]
    let experienceLevels: [LabeledMultiplier]
    let clientSizes: [LabeledMultiplier]
    let turnarounds: [LabeledMultiplier]
    let disclaimer: String
}

struct GeneratorOptions: Codable, Hashable {
    let services: [String: [String]]
    let tones: [String]
    let goals: [String]
}

struct CoachData: Codable, Hashable {
    let suggestedPrompts: [String: [String]]
    let replies: [CoachReply]
    let fallback: CoachReply
    let tips: [String: [String]]
    let conversations: [CoachConversation]
}

struct HelpData: Codable, Hashable { let faqs: [FaqItem]; let topics: [HelpTopic]; let problemCategories: [String] }
struct SubscriptionData: Codable, Hashable { let plans: [SubscriptionPlan]; let benefits: [Benefit] }
struct OnboardingData: Codable, Hashable { let steps: [OnboardingStep]; let analysisSteps: [String] }
