import Foundation

// Lesson videos: GET /lesson-videos on the Vaulten API, one stored YouTube pick per app lesson id (picked by the
// backend AI or an admin, see docs/api/lesson-videos.md). The app no longer searches YouTube (GET /videos), so it
// uses none of the shared daily YouTube quota.

struct LessonVideo: Identifiable, Hashable {
    let id: String
    let title: String
    let channel: String
    let thumbnail: String
    let durationSeconds: Int
    let views: Int?

    var durationText: String {
        let m = durationSeconds / 60, s = durationSeconds % 60
        return m >= 60 ? String(format: "%d:%02d:%02d", m / 60, m % 60, s) : String(format: "%d:%02d", m, s)
    }
}

enum VideosAPI {
    private struct Dto: Decodable {
        let videoId: String
        let title: String
        let channelTitle: String
        let thumbnailUrl: String
        let durationSeconds: Double
    }

    /// The stored video for a lesson, or nil when it has none yet (the lesson then shows without a video).
    @MainActor
    static func lessonVideo(_ lesson: Lesson, niche: String? = nil, refresh: Bool = false) async -> LessonVideo? {
        await video(forLessonId: lesson.id, refresh: refresh)
    }

    @MainActor
    static func video(forLessonId id: String, refresh: Bool = false) async -> LessonVideo? {
        await storedPicks(refresh: refresh)[id]
    }

    private static var picks: Task<[String: LessonVideo]?, Never>?
    private static var fetchedAt: Date?

    /// All stored picks, fetched once and reused for an hour (the API sends `Cache-Control: max-age=3600`).
    /// A failure (signed out, no subscription, VIDEOS_DISABLED, offline) is not cached, so the next screen retries.
    @MainActor
    private static func storedPicks(refresh: Bool = false) async -> [String: LessonVideo] {
        if !refresh, let p = picks, let t = fetchedAt, Date().timeIntervalSince(t) < 3600, let rows = await p.value { return rows }
        if !refresh, let p = picks, fetchedAt == nil { return await p.value ?? [:] }   // a fetch is already running
        let p = Task { @MainActor () -> [String: LessonVideo]? in
            guard Keychain.load() != nil else { return nil }
            do {
                let rows = try await VaultenAPI.shared.send("GET", "lesson-videos", as: [String: Dto].self)
                return rows.mapValues { LessonVideo(id: $0.videoId, title: $0.title, channel: $0.channelTitle, thumbnail: $0.thumbnailUrl,
                                                    durationSeconds: Int($0.durationSeconds), views: nil) }
            } catch {
                Monitoring.track("lesson_videos_failed", ["code": (error as? APIError)?.code ?? "network"])
                return nil
            }
        }
        picks = p
        fetchedAt = nil
        let rows = await p.value
        if rows == nil { picks = nil } else { fetchedAt = Date() }
        return rows ?? [:]
    }
}
