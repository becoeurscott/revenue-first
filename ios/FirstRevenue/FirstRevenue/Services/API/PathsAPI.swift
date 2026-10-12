import Foundation

// Path enrollment (/paths/me/enrollment). The backend slugs are "gbp" and "clipping".

struct Enrollment: Decodable {
    let pathId: String
    let pathSlug: String
    /// Calendar date (YYYY-MM-DD) the user enrolled; the current mission day counts from it.
    let startedOn: String

    var path: PathID? { PathID(slug: pathSlug) }

    /// Day N = days since enrollment + 1, capped at 30, in the user's time zone (same rule as the backend).
    var currentDay: Int {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        f.dateFormat = "yyyy-MM-dd"
        guard let start = f.date(from: startedOn) else { return 1 }
        let days = Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: start), to: Calendar.current.startOfDay(for: Date())).day ?? 0
        return min(MockData.totalDays, max(1, days + 1))
    }
}

enum PathsAPI {
    /// nil when the account isn't enrolled in a path yet (404 NO_ACTIVE_ENROLLMENT).
    static func myEnrollment() async throws -> Enrollment? {
        do {
            return try await VaultenAPI.shared.send("GET", "paths/me/enrollment")
        } catch APIError.problem(let p) where p.code == "NO_ACTIVE_ENROLLMENT" || p.status == 404 {
            return nil
        }
    }
}
