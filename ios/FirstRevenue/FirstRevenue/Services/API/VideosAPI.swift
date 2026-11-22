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

    /// The video for a lesson: the stored pick (AI or admin) when there is one, otherwise the best YouTube search
    /// match from `GET /videos`. Cached per lesson so every card and player shows the same video.
    private static var cache: [String: Task<LessonVideo?, Never>] = [:]

    @MainActor
    static func lessonVideo(_ lesson: Lesson, niche: String? = nil, refresh: Bool = false) async -> LessonVideo? {
        if !refresh, let t = cache[lesson.id] { return await t.value }
        let t = Task { @MainActor () -> LessonVideo? in
            if let stored = await storedPicks(refresh: refresh)[lesson.id] { return stored }
            let q = [lesson.title, niche, lesson.category, "tutorial for beginners"].compactMap { $0 }.joined(separator: " ")
            return await search(q).first { isLessonFit($0, lesson: lesson) }
        }
        cache[lesson.id] = t
        let v = await t.value
        if v == nil { cache[lesson.id] = nil }   // retry next time instead of caching a miss
        return v
    }

    @MainActor
    static func video(forLessonId id: String, refresh: Bool = false) async -> LessonVideo? {
        if let lesson = MockData.lesson(id) { return await lessonVideo(lesson, refresh: refresh) }
        return await storedPicks(refresh: refresh)[id]
    }

    /// YouTube search through `GET /videos`, or [] when signed out, disabled by the admin, or failing.
    @MainActor
    static func search(_ query: String) async -> [LessonVideo] {
        guard Keychain.load() != nil else { return [] }
        do {
            let found = try await VaultenAPI.shared.send("GET", "videos", query: [URLQueryItem(name: "q", value: query)], as: [Dto].self)
            if found.isEmpty { lastFailure = "YouTube search found nothing" }
            return found.map { LessonVideo(id: $0.videoId, title: $0.title.htmlDecoded, channel: $0.channelTitle.htmlDecoded,
                                           thumbnail: $0.thumbnailUrl, durationSeconds: Int($0.durationSeconds), views: nil) }
        } catch {
            let code = (error as? APIError)?.code ?? "network"
            lastFailure = code == "network" ? "Connection problem: \(error.localizedDescription)" : "YouTube search refused: \(code)"
            Monitoring.track("lesson_videos_failed", ["code": code, "source": "search"])
            return []
        }
    }

    /// Keeps only videos that can stand in for a lesson: no music or ambient tracks, 3-30 min, and a title
    /// that shares at least one real word with the lesson.
    static func isLessonFit(_ v: LessonVideo, lesson: Lesson) -> Bool {
        guard (180...1800).contains(v.durationSeconds) else { return false }
        let title = v.title.lowercased(), channel = v.channel.lowercased()
        if channel.hasSuffix(" - topic") || channel.contains("vevo") || channel.contains("records") || channel.contains("music") { return false }
        let banned = ["music", "lofi", "lo-fi", "beats", "playlist", "mix", "remix", "lyrics", "official audio", "official video",
                      "instrumental", "ambient", "relaxing", "sleep", "study with me", "asmr", "song", "album", "ft.", "feat."]
        if banned.contains(where: { title.contains($0) }) { return false }
        let stop: Set<String> = ["the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "your", "you", "how", "that", "with", "is", "it", "what", "first", "next"]
        let words = { (s: String) in Set(s.lowercased().split { !$0.isLetter }.map(String.init).filter { $0.count > 2 && !stop.contains($0) }) }
        // Stems count: "clip" matches "clipping". The lesson category counts too.
        let lessonWords = words(lesson.title + " " + lesson.category), videoWords = words(v.title)
        return lessonWords.contains { lw in videoWords.contains { vw in vw.hasPrefix(lw) || lw.hasPrefix(vw) } }
    }

    /// Why the last lookup came back empty, shown on the video card: nil when the fetch worked.
    @MainActor static var lastFailure: String?

    private static var picks: Task<[String: LessonVideo]?, Never>?
    private static var fetchedAt: Date?

    /// All stored picks, fetched once and reused for an hour (the API sends `Cache-Control: max-age=3600`).
    /// A failure (signed out, no subscription, VIDEOS_DISABLED, offline) is not cached, so the next screen retries.
    @MainActor
    private static func storedPicks(refresh: Bool = false) async -> [String: LessonVideo] {
        if !refresh, let p = picks, let t = fetchedAt, Date().timeIntervalSince(t) < 3600, let rows = await p.value { return rows }
        if !refresh, let p = picks, fetchedAt == nil { return await p.value ?? [:] }   // a fetch is already running
        let p = Task { @MainActor () -> [String: LessonVideo]? in
            guard Keychain.load() != nil else { lastFailure = "Not signed in (no session on this device)"; return nil }
            do {
                let rows = try await VaultenAPI.shared.send("GET", "lesson-videos", as: [String: Dto].self)
                lastFailure = nil
                return rows.mapValues { LessonVideo(id: $0.videoId, title: $0.title, channel: $0.channelTitle, thumbnail: $0.thumbnailUrl,
                                                    durationSeconds: Int($0.durationSeconds), views: nil) }
            } catch {
                let code = (error as? APIError)?.code ?? "network"
                lastFailure = code == "network" ? "Connection problem: \(error.localizedDescription)" : "Server refused: \(code)"
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

private extension String {
    /// YouTube titles arrive HTML-escaped (for example `It&#39;s`).
    var htmlDecoded: String {
        guard contains("&") else { return self }
        return replacingOccurrences(of: "&#39;", with: "'").replacingOccurrences(of: "&quot;", with: "\"")
            .replacingOccurrences(of: "&amp;", with: "&").replacingOccurrences(of: "&lt;", with: "<").replacingOccurrences(of: "&gt;", with: ">")
    }
}
