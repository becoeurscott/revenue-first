import SwiftUI
import WebKit

/// Real lesson video: the best YouTube match for the lesson (picked server-side from `GET /videos`), played inline
/// with the YouTube IFrame API so watch progress feeds the "watch X% to skip" rule.
struct LessonYouTubePlayer: View {
    let lesson: Lesson
    var onProgress: (Double) -> Void
    var onEnded: () -> Void
    var onVideo: (LessonVideo?) -> Void = { _ in }

    @Environment(AppStore.self) private var store
    @State private var video: LessonVideo?
    @State private var loaded = false
    @State private var best = 0.0
    @State private var playing = false

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: Radius.xl, style: .continuous)
        ZStack {
            Color.black
            if let video, playing {
                YouTubeIFramePlayer(videoID: video.id, onProgress: { f in best = max(best, f); onProgress(f) }, onEnded: onEnded)
            } else if let video {
                preview(video)
            } else if loaded {
                VStack(spacing: Space.s) {
                    Image(systemName: "play.slash.fill").font(.system(size: 28)).foregroundStyle(Theme.muted)
                    Text("Video unavailable right now").font(.headline).foregroundStyle(.white)
                    Text(VideosAPI.lastFailure ?? "No video stored for lesson \(lesson.id) yet")
                        .font(.caption).foregroundStyle(.white.opacity(0.7)).multilineTextAlignment(.center)
                    Button { Task { await load() } } label: { Label("Try again", systemImage: "arrow.clockwise") }
                        .buttonStyle(.fr(.secondary, size: .sm))
                }
                .padding(Space.l)
            } else {
                ProgressView().tint(.white)
            }
        }
        .aspectRatio(16 / 9, contentMode: .fit)
        .clipShape(shape)
        .task(id: lesson.id) { await load() }
        .onDisappear {
            guard let v = video else { return }
            Monitoring.track("lesson_video_watched", ["lesson": lesson.id, "video": v.id, "percent": Int(best * 100),
                                                      "seconds": Int(best * Double(v.durationSeconds)), "source": "lesson"])
        }
    }

    /// Thumbnail, title, channel and length before playback; tapping starts the video in place.
    private func preview(_ v: LessonVideo) -> some View {
        Button { Haptics.tap(); playing = true; Monitoring.track("lesson_video_played", ["lesson": lesson.id, "video": v.id]) } label: {
            ZStack {
                AsyncImage(url: URL(string: v.thumbnail)) { img in img.resizable().scaledToFill() } placeholder: { Theme.surface }
                LinearGradient(colors: [.clear, .black.opacity(0.75)], startPoint: .center, endPoint: .bottom)
                Image(systemName: "play.fill").font(.system(size: 26, weight: .bold)).foregroundStyle(.white)
                    .frame(width: 64, height: 64).background(Circle().fill(Theme.brand500.opacity(0.9)))
                VStack(alignment: .leading, spacing: 2) {
                    Spacer()
                    HStack(alignment: .bottom) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(v.title).font(.subheadline.weight(.semibold)).foregroundStyle(.white).lineLimit(2)
                            Text(v.channel).font(.caption).foregroundStyle(.white.opacity(0.75)).lineLimit(1)
                        }
                        Spacer(minLength: Space.s)
                        Text(v.durationText).font(.caption.weight(.bold)).monospacedDigit().foregroundStyle(.white)
                            .padding(.horizontal, 6).padding(.vertical, 2).background(Capsule().fill(.black.opacity(0.7)))
                    }
                }
                .padding(Space.m)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Play \(v.title)")
    }

    private func load() async {
        loaded = false
        playing = false
        video = await VideosAPI.lessonVideo(lesson, niche: store.niche?.normalizedLabel)
        loaded = true
        onVideo(video)
        if let v = video { Monitoring.track("lesson_video_loaded", ["lesson": lesson.id, "video": v.id]) }
    }
}

/// YouTube IFrame API in a web view. Reports the furthest watched share (0...1) about once a second.
struct YouTubeIFramePlayer: UIViewRepresentable {
    let videoID: String
    var onProgress: (Double) -> Void
    var onEnded: () -> Void

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.userContentController.add(context.coordinator, name: "yt")
        let web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = false
        web.backgroundColor = .black
        web.scrollView.isScrollEnabled = false
        // Load YouTube's own embed page with a Referer: an iframe inside loadHTMLString gets refused on devices
        // ("Error 153") because YouTube now requires an identifiable embedding site.
        let script = """
        (function(){ var best = 0, ended = false;
          function post(m){ try { window.webkit.messageHandlers.yt.postMessage(m); } catch(e){} }
          setInterval(function(){
            var v = document.querySelector('video'); if (!v || !(v.duration > 0)) return;
            if (v.paused && v.currentTime === 0) { v.play && v.play().catch(function(){}); }
            var f = Math.min(1, v.currentTime / v.duration);
            if (f > best + 0.005) { best = f; post({progress: f}); }
            if (v.ended && !ended) { ended = true; post({ended: true}); }
          }, 1000);
        })();
        """
        config.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        var url = URLComponents(string: "https://www.youtube.com/embed/\(videoID)")!
        url.queryItems = [.init(name: "playsinline", value: "1"), .init(name: "autoplay", value: "1"), .init(name: "rel", value: "0"),
                          .init(name: "modestbranding", value: "1"), .init(name: "origin", value: "https://vaulten.app")]
        var req = URLRequest(url: url.url!)
        req.setValue("https://vaulten.app/", forHTTPHeaderField: "Referer")
        web.load(req)
        return web
    }

    func updateUIView(_ web: WKWebView, context: Context) { context.coordinator.parent = self }

    static func dismantleUIView(_ web: WKWebView, coordinator: Coordinator) {
        web.configuration.userContentController.removeScriptMessageHandler(forName: "yt")
    }

    final class Coordinator: NSObject, WKScriptMessageHandler {
        var parent: YouTubeIFramePlayer
        init(_ parent: YouTubeIFramePlayer) { self.parent = parent }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let body = message.body as? [String: Any] else { return }
            if let f = body["progress"] as? Double { parent.onProgress(f) }
            if body["ended"] as? Bool == true { parent.onProgress(1); parent.onEnded() }
        }
    }
}
