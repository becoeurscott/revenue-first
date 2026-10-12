import Foundation

// Onboarding (/onboarding/*): the questionnaire lives in the backend database, answers are saved
// progressively, the backend computes the recommendation, and choose-path enrolls the user.

struct QuestionOption: Decodable, Hashable {
    let value: String
    let label: String
}

struct Question: Decodable, Identifiable, Hashable {
    enum Kind: String, Decodable { case singleChoice = "SINGLE_CHOICE", multipleChoice = "MULTIPLE_CHOICE", scale = "SCALE", number = "NUMBER", text = "TEXT" }
    var id: String { key }
    let key: String
    let prompt: String
    let helpText: String?
    let type: Kind
    let isRequired: Bool
    let minValue: Double?
    let maxValue: Double?
    let options: [QuestionOption]
}

struct QuestionCategory: Decodable {
    let title: String
    let description: String
    let questions: [Question]
}

/// One answer, in the shape the API both returns and accepts.
struct AnswerValue: Codable, Hashable {
    var options: [String]?
    var number: Double?
    var text: String?

    var isEmpty: Bool {
        (options ?? []).isEmpty && number == nil && (text ?? "").trimmingCharacters(in: .whitespaces).isEmpty
    }
}

struct RankedPath: Decodable, Hashable {
    let pathId: String
    let slug: String
    let name: String
    let score: Double
}

struct BlockedPath: Decodable, Hashable {
    let slug: String
    let name: String
    let reason: String?
}

struct PathRecommendation: Decodable {
    let recommended: RankedPath?
    let ranked: [RankedPath]
    let blocked: [BlockedPath]
}

private struct ProgressDTO: Decodable {
    struct Answer: Decodable { let questionKey: String; let options: [String]?; let number: Double?; let text: String? }
    let status: String
    let answers: [Answer]
}

private struct AnswerInput: Encodable {
    let questionKey: String
    let options: [String]?
    let number: Double?
    let text: String?
}
private struct SaveAnswersBody: Encodable { let answers: [AnswerInput] }
private struct ChoosePathBody: Encodable { let pathSlug: String }

extension PathID {
    /// Backend slugs are "gbp" and "clipping".
    init?(slug: String) {
        let s = slug.lowercased()
        if s.contains("gbp") || s.contains("google") { self = .gbp } else if s.contains("clip") { self = .clipping } else { return nil }
    }
}

enum OnboardingAPI {
    static func questionnaire() async throws -> [QuestionCategory] {
        try await VaultenAPI.shared.send("GET", "onboarding/questionnaire")
    }

    /// Answers already saved on the server, so an interrupted onboarding resumes where it stopped.
    static func savedAnswers() async throws -> [String: AnswerValue] {
        let progress: ProgressDTO = try await VaultenAPI.shared.send("GET", "onboarding/me")
        return Dictionary(progress.answers.map { ($0.questionKey, AnswerValue(options: $0.options, number: $0.number, text: $0.text)) }, uniquingKeysWith: { a, _ in a })
    }

    static func save(_ key: String, _ value: AnswerValue) async throws {
        let body = SaveAnswersBody(answers: [AnswerInput(questionKey: key, options: value.options, number: value.number, text: value.text)])
        let _: Empty = try await VaultenAPI.shared.send("PUT", "onboarding/answers", body: body)
    }

    static func complete() async throws -> PathRecommendation {
        try await VaultenAPI.shared.send("POST", "onboarding/complete")
    }

    static func choosePath(slug: String) async throws -> Enrollment {
        try await VaultenAPI.shared.send("POST", "onboarding/choose-path", body: ChoosePathBody(pathSlug: slug))
    }
}
