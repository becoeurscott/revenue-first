import AVFoundation
import SwiftUI

/// Each mood plays the looping clip of the same name (`Mascot/Clips/mascot-<mood>.mov`).
enum MascotMood: String, CaseIterable { case happy, thinking, excited, wink, sad, sleepy, love, focused }

/// One-shot clips that play over the mood loop, then hand back to it.
enum MascotReaction: String { case tap, greeting, celebrate }

/// Vault — Vaulten's cat mascot, played from generated video clips with a transparent background.
/// Clips are made by `scripts/mascot-clips.sh` from `assets/mascot/clips`. Each mood loops; tapping
/// her plays a reaction (a hop, or a celebration while she's excited) and a new speech-bubble line.
struct MascotView: View {
    var mood: MascotMood = .happy
    var size: CGFloat = 160
    var interactive = true
    var say: String? = nil
    var tapLines: [String] = ["Hehe, that tickles!", "Less theory. More action.", "One mission a day. That's the whole trick.", "I believe in you. Statistically AND emotionally.", "Your first client is closer than you think."]
    var float = true
    var bubbleSide: BubbleSide = .top
    /// Played once when she first appears, before the mood loop.
    var entrance: MascotReaction? = nil

    enum BubbleSide { case top, trailing }

    @StateObject private var player = MascotPlayer()
    @State private var tapCount = -1
    @State private var reaction: String?
    @State private var bob = false
    @State private var bubbleHeight: CGFloat = 40
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var bubble: String? { reaction ?? say }

    var body: some View {
        ZStack {
            Circle()
                .fill(Theme.brand500.opacity(0.35))
                .frame(width: size * 0.8, height: size * 0.8)
                .blur(radius: size * 0.16)
                .scaleEffect(bob ? 1.06 : 0.96)
                .offset(y: -size * 0.04)

            MascotVideo(player: player.player)
                .frame(width: size, height: size)
                .offset(y: float && !reduceMotion ? (bob ? -size * 0.03 : 0) : 0)
                .allowsHitTesting(false)
        }
        .frame(width: size, height: size)
        .overlay(alignment: bubbleSide == .top ? .top : .topTrailing) {
            if let bubble {
                SpeechBubble(text: bubble, side: bubbleSide)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(width: 220, alignment: bubbleSide == .top ? .center : .leading)
                    .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { bubbleHeight = $0 }
                    // Sit fully above her head (top) or just past her right edge (trailing).
                    .offset(x: bubbleSide == .top ? 0 : 224, y: bubbleSide == .top ? -(bubbleHeight + 4) : size * 0.02)
                    .transition(.scale(scale: 0.7, anchor: bubbleSide == .top ? .bottom : .leading).combined(with: .opacity))
                    .id(bubble)
                    .allowsHitTesting(false)
            }
        }
        .contentShape(Circle())
        .onTapGesture { if interactive { tap() } }
        .accessibilityElement()
        .accessibilityLabel("Vault, your Vaulten mascot")
        .accessibilityValue(bubble ?? "")
        .accessibilityHint(interactive ? "Double tap to say hi" : "")
        .accessibilityAddTraits(interactive ? .isButton : [])
        .accessibilityAction { if interactive { tap() } }
        .onAppear {
            player.start(mood: mood, entrance: reduceMotion ? nil : entrance, animated: !reduceMotion)
            guard float, !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) { bob = true }
        }
        .onDisappear { player.stop() }
        .onChange(of: mood) { _, new in player.setMood(new) }
    }

    private func tap() {
        Haptics.soft()
        tapCount += 1
        if !reduceMotion { player.react(mood == .excited ? .celebrate : .tap) }
        withAnimation(.bouncy) { reaction = tapLines[tapCount % tapLines.count] }
        let count = tapCount
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(2.8))
            if tapCount == count { withAnimation(.easeOut(duration: 0.2)) { reaction = nil } }
        }
    }
}

/// Drives one mascot's clips: loops the mood clip, and plays reactions once before returning to it.
@MainActor
final class MascotPlayer: ObservableObject {
    let player = AVQueuePlayer()
    private var looper: AVPlayerLooper?
    private var mood: MascotMood = .happy
    private var animated = true
    private var reactionEnd: NSObjectProtocol?

    init() {
        player.isMuted = true
        player.preventsDisplaySleepDuringVideoPlayback = false
        player.allowsExternalPlayback = false
    }

    func start(mood: MascotMood, entrance: MascotReaction?, animated: Bool) {
        self.mood = mood
        self.animated = animated
        if let entrance { react(entrance) } else { loop() }
    }

    func setMood(_ new: MascotMood) {
        guard new != mood else { return }
        mood = new
        // A reaction in progress returns to the new mood when it ends.
        if reactionEnd == nil { loop() }
    }

    func react(_ reaction: MascotReaction) {
        guard let url = Self.url(reaction.rawValue) else { return }
        clear()
        let item = AVPlayerItem(url: url)
        reactionEnd = NotificationCenter.default.addObserver(forName: AVPlayerItem.didPlayToEndTimeNotification, object: item, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.loop() }
        }
        player.insert(item, after: nil)
        player.play()
    }

    func stop() {
        clear()
    }

    private func loop() {
        clear()
        guard let url = Self.url(mood.rawValue) ?? Self.url(MascotMood.happy.rawValue) else { return }
        looper = AVPlayerLooper(player: player, templateItem: AVPlayerItem(url: url))
        // With reduced motion she holds still on the clip's first frame.
        if animated { player.play() }
    }

    private func clear() {
        if let reactionEnd { NotificationCenter.default.removeObserver(reactionEnd) }
        reactionEnd = nil
        looper?.disableLooping()
        looper = nil
        player.pause()
        player.removeAllItems()
    }

    private static func url(_ clip: String) -> URL? {
        Bundle.main.url(forResource: "mascot-\(clip)", withExtension: "mov")
    }
}

/// Plays one mascot clip once and holds its last frame (e.g. Vault holding out a gift), then calls `onEnd`.
struct MascotClipView: View {
    let clip: String
    var size: CGFloat = 160
    var onEnd: (() -> Void)? = nil
    @State private var player = AVPlayer()
    @State private var endObserver: NSObjectProtocol?

    static func exists(_ clip: String) -> Bool { Bundle.main.url(forResource: "mascot-\(clip)", withExtension: "mov") != nil }

    var body: some View {
        MascotVideo(player: player)
            .frame(width: size, height: size)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
            .onAppear {
                guard let url = Bundle.main.url(forResource: "mascot-\(clip)", withExtension: "mov") else { onEnd?(); return }
                let item = AVPlayerItem(url: url)
                player.isMuted = true
                player.actionAtItemEnd = .pause
                player.replaceCurrentItem(with: item)
                endObserver = NotificationCenter.default.addObserver(forName: AVPlayerItem.didPlayToEndTimeNotification, object: item, queue: .main) { _ in
                    MainActor.assumeIsolated { onEnd?() }
                }
                player.play()
            }
            .onDisappear {
                player.pause()
                if let endObserver { NotificationCenter.default.removeObserver(endObserver) }
            }
    }
}

/// Shows an AVPlayer with its alpha channel intact (the clips are HEVC with transparency).
private struct MascotVideo: UIViewRepresentable {
    let player: AVPlayer

    func makeUIView(context: Context) -> PlayerView {
        let view = PlayerView()
        view.playerLayer.player = player
        view.playerLayer.videoGravity = .resizeAspect
        return view
    }

    func updateUIView(_ view: PlayerView, context: Context) {
        view.playerLayer.player = player
    }

    final class PlayerView: UIView {
        override class var layerClass: AnyClass { AVPlayerLayer.self }
        var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }

        override init(frame: CGRect) {
            super.init(frame: frame)
            backgroundColor = .clear
            isOpaque = false
            playerLayer.backgroundColor = UIColor.clear.cgColor
        }

        required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }
    }
}

private struct SpeechBubble: View {
    let text: String
    let side: MascotView.BubbleSide
    var body: some View {
        Text(text)
            .font(.footnote.weight(.medium))
            .foregroundStyle(Theme.inkSoft)
            .multilineTextAlignment(side == .top ? .center : .leading)
            .padding(.horizontal, 14).padding(.vertical, 9)
            .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Theme.surface3))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(Theme.lineStrong))
            .shadow(color: .black.opacity(0.3), radius: 10, y: 4)
    }
}

/// Loading state: Vault thinks while an orbit spins around it.
struct MascotLoader: View {
    var label: String? = nil
    private let lines = ["Warming up the neurons…", "Fetching your plan…", "Counting your wins…", "Almost there…"]
    @State private var i = 0
    @State private var spin = false

    var body: some View {
        VStack(spacing: Space.xl) {
            ZStack {
                Circle()
                    .strokeBorder(Theme.brand500.opacity(0.4), style: StrokeStyle(lineWidth: 1, dash: [4, 5]))
                    .overlay(alignment: .top) { Circle().fill(Theme.brand400).frame(width: 12).shadow(color: Theme.brand500, radius: 6).offset(y: -6) }
                    .overlay(alignment: .trailing) { Circle().fill(Theme.accent).frame(width: 8).offset(x: 4) }
                    .rotationEffect(.degrees(spin ? 360 : 0))
                MascotView(mood: .thinking, size: 120, interactive: false, float: false)
            }
            .frame(width: 176, height: 176)
            Text(label ?? lines[i]).font(.subheadline.weight(.medium)).foregroundStyle(Theme.muted).contentTransition(.opacity).id(i)
        }
        .onAppear { withAnimation(.linear(duration: 9).repeatForever(autoreverses: false)) { spin = true } }
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1.4))
                withAnimation { i = (i + 1) % lines.count }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(label ?? "Loading")
    }
}

#Preview {
    ScrollView {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 140))], spacing: 40) {
            ForEach(MascotMood.allCases, id: \.self) { MascotView(mood: $0, size: 130) }
        }.padding(.top, 60)
    }
    .background(Theme.bg)
}
