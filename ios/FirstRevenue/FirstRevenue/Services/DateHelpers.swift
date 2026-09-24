import Foundation

extension Date {
    static func daysAgo(_ n: Int, hour: Int = 9) -> Date {
        let cal = Calendar.current
        let d = cal.date(byAdding: .day, value: -n, to: Date())!
        return cal.date(bySettingHour: hour, minute: 0, second: 0, of: d) ?? d
    }
    static func daysFromNow(_ n: Int, hour: Int = 9) -> Date { daysAgo(-n, hour: hour) }

    /// Local calendar key, e.g. 2026-09-18
    var dayKey: String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: self)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }

    var shortDate: String { formatted(.dateTime.month(.abbreviated).day()) }
    var shortTime: String { formatted(date: .omitted, time: .shortened) }

    /// "Just now", "3h ago", "Yesterday", "In 3 days"…
    var timeAgo: String {
        let diff = Date().timeIntervalSince(self)
        if diff < 0 {
            let days = Int(ceil(-diff / 86_400))
            return days <= 1 ? "Tomorrow" : "In \(days) days"
        }
        let mins = Int(diff / 60)
        if mins < 1 { return "Just now" }
        if mins < 60 { return "\(mins)m ago" }
        let hours = mins / 60
        if hours < 24 { return "\(hours)h ago" }
        let days = hours / 24
        if days == 1 { return "Yesterday" }
        if days < 7 { return "\(days) days ago" }
        return shortDate
    }
}

extension Optional where Wrapped == Date {
    var timeAgo: String { self?.timeAgo ?? "Never" }
}

func greeting() -> String {
    let h = Calendar.current.component(.hour, from: Date())
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}

func money(_ n: Int) -> String { "$" + n.formatted(.number.grouping(.automatic)) }
