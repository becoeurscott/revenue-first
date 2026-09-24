import Foundation

// Mentor Check models. Mirror the Mentor* types in src/data/types.ts.

struct MentorOption: Codable, Hashable {
    let label: String
    /// 0 = healthy sign, 1 = caution, 2 = red flag
    let risk: Int
}

struct MentorQuestion: Codable, Identifiable, Hashable {
    let id: String
    let question: String
    let why: String
    let options: [MentorOption]
}

struct MentorFlag: Codable, Hashable {
    let title: String
    let detail: String
}

struct MentorVerdict: Codable, Identifiable, Hashable {
    /// trust | caution | avoid
    let id: String
    let maxScore: Int
    let title: String
    let summary: String
    let next: [String]
}

struct MentorCheckData: Codable {
    let redFlags: [MentorFlag]
    let greenFlags: [MentorFlag]
    let questions: [MentorQuestion]
    let verdicts: [MentorVerdict]

    /// Risk score from 0 (all healthy) to 100 (all red flags). Same formula as mentorScore() on web.
    func score(_ answers: [Int]) -> Int {
        let total = answers.enumerated().reduce(0) { sum, pair in
            sum + (questions[safe: pair.offset]?.options[safe: pair.element]?.risk ?? 0)
        }
        return Int((Double(total) / Double(max(questions.count * 2, 1)) * 100).rounded())
    }

    func verdict(_ score: Int) -> MentorVerdict {
        verdicts.first { score <= $0.maxScore } ?? verdicts[verdicts.count - 1]
    }
}
