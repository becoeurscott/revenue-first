import SwiftUI
import WebKit

/// "Watch & learn": the stored YouTube video for today's lesson, played inside the app.
/// Hidden when the lesson has no video yet or videos are unavailable.
struct LessonVideosSection: View {
    let lessonId: String
    @State private var videos: [LessonVideo] = []
    @State private var playing: LessonVideo?
    @State private var loaded = false

    var body: some View {
        // A VStack (not a Group) so `.task` still runs while the section is empty and loading.
        VStack(alignment: .leading, spacing: 0) {
            if !videos.isEmpty {
                VStack(alignment: .leading, spacing: Space.m) {
                    Label("Watch & learn", systemImage: "play.rectangle.fill")
                        .font(.section).foregroundStyle(Theme.ink)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: Space.m) {
                            ForEach(videos) { v in
                                Button { Haptics.tap(); playing = v } label: { card(v) }
                                    .buttonStyle(.pressable)
                            }
                        }
                    }
                    .scrollClipDisabled()
                }
                .padding(.top, Space.xl)
                .transition(.opacity)
            }
        }
        .task(id: lessonId) {
            let found = await VideosAPI.video(forLessonId: lessonId).map { [$0] } ?? []
            withAnimation(.snappy) { videos = found; loaded = true }
            if !found.isEmpty { Monitoring.track("lesson_videos_shown", ["count": found.count]) }
        }
        .sheet(item: $playing) { VideoPlayerSheet(video: $0) }
    }


    private func card(_ v: LessonVideo) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            AsyncImage(url: URL(string: v.thumbnail)) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Theme.surface
            }
            .frame(width: 220, height: 124)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(alignment: .bottomTrailing) {
                Text(v.durationText).font(.caption2.weight(.bold)).monospacedDigit().foregroundStyle(.white)
                    .padding(.horizontal, 6).padding(.vertical, 3)
                    .background(Capsule().fill(.black.opacity(0.75))).padding(6)
            }
            .overlay { Image(systemName: "play.circle.fill").font(.system(size: 36)).foregroundStyle(.white.opacity(0.9)).shadow(radius: 6) }
            Text(v.title).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink)
                .lineLimit(2).multilineTextAlignment(.leading).frame(width: 220, alignment: .leading)
            Text(v.channel).font(.caption).foregroundStyle(Theme.muted).lineLimit(1)
        }
        .frame(width: 220, alignment: .leading)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(v.title), by \(v.channel), \(v.durationText)")
    }
}

private struct VideoPlayerSheet: View {
    let video: LessonVideo
    @State private var watched = 0.0
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: Space.m) {
            HStack {
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark").font(.system(size: 16, weight: .bold)).foregroundStyle(Theme.muted).frame(width: 44, height: 44)
                }
                .accessibilityLabel("Close video")
            }
            YouTubeIFramePlayer(videoID: video.id, onProgress: { f in watched = max(watched, f) }, onEnded: { watched = 1 })
                .aspectRatio(16 / 9, contentMode: .fit)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            Text(video.title).font(.title3.weight(.bold)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
            Text(video.channel).font(.subheadline).foregroundStyle(Theme.muted)
            Spacer()
        }
        .padding(.horizontal, Space.gutter)
        .background(Theme.bg.ignoresSafeArea())
        .presentationDragIndicator(.visible)
        .onAppear { Monitoring.track("lesson_video_played", ["video": video.id]) }
        .onDisappear {
            Monitoring.track("lesson_video_watched", ["video": video.id, "percent": Int(watched * 100),
                                                      "seconds": Int(watched * Double(video.durationSeconds)), "source": "mission"])
        }
    }
}
