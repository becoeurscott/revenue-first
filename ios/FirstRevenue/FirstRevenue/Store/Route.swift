import Foundation

enum OutreachTab: String, CaseIterable, Hashable { case prospects = "Prospects", messages = "Messages", templates = "Templates", followUps = "Follow-ups" }

/// Every pushable screen. Top-level tabs and full-screen covers live elsewhere (AppTab, Cover).
enum Route: Hashable {
    case day(Int)
    case lessons
    case lesson(String)
    case coachConversation(String)
    case outreach(OutreachTab)
    case prospect(String)
    case generate(prospectId: String?)
    case pricing
    case revenue
    case paths
    case path(PathID)
    case streak
    case achievements
    case resources
    case resource(String)
    case notifications
    case settings
    case subscription
    case help
    case search
    case mentorCheck

    /// Parses the web-style links stored in mock data (e.g. notification links).
    init?(link: String) {
        let parts = link.split(separator: "/").map(String.init)
        switch (parts.first, parts.count) {
        case ("plan", 3) where parts[1] == "day": guard let d = Int(parts[2]) else { return nil }; self = .day(d)
        case ("lessons", 1): self = .lessons
        case ("lessons", 2): self = .lesson(parts[1])
        case ("coach", 3): self = .coachConversation(parts[2])
        case ("prospects", 1): self = .outreach(.prospects)
        case ("prospects", 2): self = .prospect(parts[1])
        case ("outreach", 1): self = .outreach(.messages)
        case ("outreach", 2):
            switch parts[1] {
            case "templates": self = .outreach(.templates)
            case "follow-ups": self = .outreach(.followUps)
            case "generate": self = .generate(prospectId: nil)
            default: return nil
            }
        case ("pricing", _): self = .pricing
        case ("revenue", _): self = .revenue
        case ("paths", 1): self = .paths
        case ("paths", 2): guard let p = MockData.path(slug: parts[1]) else { return nil }; self = .path(p.id)
        case ("streak", _): self = .streak
        case ("achievements", _): self = .achievements
        case ("resources", 1): self = .resources
        case ("resources", 2): self = .resource(parts[1])
        case ("notifications", _): self = .notifications
        case ("settings", _): self = .settings
        case ("subscription", _): self = .subscription
        case ("help", _): self = .help
        case ("search", _): self = .search
        case ("mentor-check", _): self = .mentorCheck
        default: return nil
        }
    }
}
