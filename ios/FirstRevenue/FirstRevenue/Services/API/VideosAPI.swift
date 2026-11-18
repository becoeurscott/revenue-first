import Foundation

// Lesson videos: GET /videos?q= on the Vaulten API (YouTube search, cached and filtered server-side).

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

    /// Videos for a topic from `GET /videos`, or [] when signed out, switched off by the admin, or failing
    /// (the section then stays hidden).
    @MainActor
    static func search(_ query: String) async -> [LessonVideo] {
        guard Keychain.load() != nil else { return [] }
        let found: [Dto]
        do { found = try await VaultenAPI.shared.send("GET", "videos", query: [URLQueryItem(name: "q", value: query)], as: [Dto].self) }
        catch {
            // VIDEOS_DISABLED = admin setting videos.enabled is off; other codes = missing YouTube key or quota.
            Monitoring.track("lesson_videos_failed", ["code": (error as? APIError)?.code ?? "network"])
            return []
        }
        return found.map { LessonVideo(id: $0.videoId, title: $0.title, channel: $0.channelTitle, thumbnail: $0.thumbnailUrl,
                                       durationSeconds: Int($0.durationSeconds), views: nil) }
    }

    /// The video shown for a lesson (first match for title + niche). Cached and de-duplicated so every card,
    /// preview and player shows the same video without repeating searches.
    private static var cache: [String: Task<LessonVideo?, Never>] = [:]

    @MainActor
    static func lessonVideo(_ lesson: Lesson, niche: String?, refresh: Bool = false) async -> LessonVideo? {
        let q = [lesson.title, niche, lesson.category, "tutorial for beginners"].compactMap { $0 }.joined(separator: " ")
        if !refresh, let t = cache[q] { return await t.value }
        let t = Task { @MainActor () -> LessonVideo? in
            // A stored pick (AI or admin, see docs/api/lesson-videos.md) wins and costs no YouTube quota.
            if let stored = await storedPicks()[lesson.id] { return stored }
            return await search(q).first { isLessonFit($0, lesson: lesson) }
        }
        cache[q] = t
        let v = await t.value
        if v == nil { cache[q] = nil }   // retry next time instead of caching a failure
        return v
    }

    /// Keeps only videos that can stand in for a lesson: no music, mixes, lyrics or ambient tracks,
    /// a lesson-sized length (3-30 min), and a title that shares at least one real word with the lesson.
    static func isLessonFit(_ v: LessonVideo, lesson: Lesson) -> Bool {
        guard (180...1800).contains(v.durationSeconds) else { return false }
        let title = v.title.lowercased(), channel = v.channel.lowercased()
        if channel.hasSuffix(" - topic") || channel.contains("vevo") || channel.contains("records") || channel.contains("music") { return false }
        let banned = ["music", "lofi", "lo-fi", "beats", "playlist", "mix", "remix", "lyrics", "official audio", "official video",
                      "instrumental", "ambient", "relaxing", "sleep", "study with me", "asmr", "song", "album", "ft.", "feat."]
        if banned.contains(where: { title.contains($0) }) { return false }
        let stop: Set<String> = ["the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "your", "you", "how", "that", "with", "is", "it", "what", "first", "next"]
        let words = { (s: String) in Set(s.lowercased().split { !$0.isLetter }.map(String.init).filter { $0.count > 2 && !stop.contains($0) }) }
        return !words(lesson.title).isDisjoint(with: words(v.title))
    }

    private struct StoredDto: Decodable {
        let videoId: String
        let title: String
        let channelTitle: String
        let thumbnailUrl: String
        let durationSeconds: Double
    }
    private static var picks: Task<[String: LessonVideo], Never>?

    /// Stored video per app lesson id from `GET /lesson-videos`, fetched once per launch.
    /// Empty when the endpoint is not live yet, so lessons fall back to search.
    @MainActor
    private static func storedPicks() async -> [String: LessonVideo] {
        if let p = picks { return await p.value }
        let p = Task { @MainActor () -> [String: LessonVideo] in
            guard Keychain.load() != nil,
                  let rows = try? await VaultenAPI.shared.send("GET", "lesson-videos", as: [String: StoredDto].self) else { return [:] }
            return rows.mapValues { LessonVideo(id: $0.videoId, title: $0.title, channel: $0.channelTitle, thumbnail: $0.thumbnailUrl,
                                                durationSeconds: Int($0.durationSeconds), views: nil) }
        }
        picks = p
        return await p.value
    }
}
