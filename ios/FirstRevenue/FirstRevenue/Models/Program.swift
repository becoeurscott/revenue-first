import Foundation

// The personal program written for one enrollment from the onboarding answers. Week 1 is written for
// everyone; Days 8–30 are only written once the user has Premium (see ProgramGenerator and api/program.ts),
// so a free account never holds the paid part of its program, not even hidden behind a blur.

struct ProgramDay: Codable, Hashable, Identifiable {
    var id: Int { day }
    let day: Int
    let title: String
    let objective: String
    /// Niche-specific how-to steps. Empty for programs written on the device (the day's checklist covers them).
    let steps: [String]
    let tip: String
    let deliverable: String

    /// Days 29 and 30 close Week 4, as in every journey's plan.
    var week: Int { min(4, (day - 1) / 7 + 1) }
}

struct ProgramWeek: Codable, Hashable, Identifiable {
    var id: Int { week }
    let week: Int
    let title: String
    let outcome: String
}

struct GeneratedProgram: Codable, Hashable {
    enum Source: String, Codable, Hashable { case ai, onDevice = "on_device" }

    /// Days a free account gets: Week 1.
    static let freeDays = 7

    var title: String
    var summary: String
    var weeks: [ProgramWeek]
    var days: [ProgramDay]
    var source: Source
    /// The niche version it was written for; a niche change rewrites the days not done yet.
    var nicheVersion: Int
    var generatedAt: Date

    var isComplete: Bool { Set(days.map(\.day)).isSuperset(of: 1...MockData.totalDays) }
    func day(_ n: Int) -> ProgramDay? { days.first { $0.day == n } }
    func week(_ n: Int) -> ProgramWeek? { weeks.first { $0.week == n } }
    /// Missions still waiting behind the paywall.
    var lockedCount: Int { MockData.totalDays - Self.freeDays }
}
