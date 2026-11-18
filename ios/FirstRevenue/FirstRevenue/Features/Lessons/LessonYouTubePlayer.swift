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
        let origin = "https://vaulten.app"
        let html = """
        <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
        <style>html,body{margin:0;height:100%;background:#000}#p{width:100%;height:100%}</style></head><body><div id="p"></div>
        <script src="https://www.youtube.com/iframe_api"></script>
        <script>
        var player, best = 0;
        function post(m){ window.webkit.messageHandlers.yt.postMessage(m); }
        function onYouTubeIframeAPIReady(){
          player = new YT.Player('p', { videoId: '\(videoID)', host: 'https://www.youtube-nocookie.com',
            playerVars: { playsinline: 1, rel: 0, modestbranding: 1, autoplay: 1, origin: '\(origin)' },
            events: { onReady: function(e){ e.target.playVideo(); }, onStateChange: function(e){ if (e.data === YT.PlayerState.ENDED) post({ended: true}); } } });
          setInterval(function(){
            if (!player || !player.getDuration) return;
            var d = player.getDuration(), t = player.getCurrentTime();
            if (d > 0 && player.getPlayerState() === YT.PlayerState.PLAYING) { var f = Math.min(1, t / d); if (f > best) { best = f; post({progress: f}); } }
          }, 1000);
        }
        </script></body></html>
        """
        web.loadHTMLString(html, baseURL: URL(string: origin))
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
