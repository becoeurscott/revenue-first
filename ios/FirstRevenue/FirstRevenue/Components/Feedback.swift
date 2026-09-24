import SwiftUI

/// Top-of-screen toast, driven by `store.toast`.
struct ToastOverlay: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        VStack {
            if let t = store.toast {
                HStack(spacing: 10) {
                    Image(systemName: icon(t.tone)).foregroundStyle(color(t.tone)).font(.system(size: 18, weight: .semibold))
                    Text(t.message).font(.subheadline.weight(.medium)).foregroundStyle(Theme.ink).lineLimit(2)
                }
                .padding(.leading, 14).padding(.trailing, 18).padding(.vertical, 11)
                .background(Capsule().fill(.ultraThinMaterial))
                .background(Capsule().fill(Theme.surface3.opacity(0.85)))
                .overlay(Capsule().strokeBorder(Theme.lineStrong))
                .shadow(color: .black.opacity(0.35), radius: 16, y: 8)
                .padding(.horizontal, 24)
                .transition(.move(edge: .top).combined(with: .opacity))
                .onTapGesture { withAnimation { store.toast = nil } }
                .accessibilityAddTraits(.isStaticText)
                .onAppear { UIAccessibility.post(notification: .announcement, argument: t.message) }
            }
            Spacer()
        }
        .padding(.top, 8)
        .animation(.spring(duration: 0.35), value: store.toast)
    }
    private func icon(_ t: Toast.Tone) -> String {
        switch t { case .success: "checkmark.circle.fill"; case .error: "xmark.circle.fill"; case .info: "info.circle.fill"; case .warning: "exclamationmark.triangle.fill" }
    }
    private func color(_ t: Toast.Tone) -> Color {
        switch t { case .success: Theme.success; case .error: Theme.danger; case .info: Theme.info; case .warning: Theme.warning }
    }
}

/// One polished pattern for empty, error and offline states.
struct EmptyStateView<Action: View>: View {
    let title: String
    let message: String
    var mood: MascotMood = .wink
    var compact = false
    @ViewBuilder var action: Action

    var body: some View {
        VStack(spacing: 0) {
            MascotView(mood: mood, size: compact ? 88 : 116)
            Text(title).font(.title3.weight(.bold)).foregroundStyle(Theme.ink).padding(.top, Space.l).multilineTextAlignment(.center)
            Text(message).font(.subheadline).foregroundStyle(Theme.muted).multilineTextAlignment(.center).lineSpacing(2).frame(maxWidth: 300).padding(.top, 6)
            action.padding(.top, Space.l + 4)
        }
        .padding(.horizontal, Space.xl)
        .padding(.vertical, compact ? Space.xl : 44)
        .frame(maxWidth: .infinity)
        .overlay(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).strokeBorder(Theme.line, style: StrokeStyle(lineWidth: 1, dash: [6, 5])))
        .transition(.opacity.combined(with: .move(edge: .bottom)))
    }
}

extension EmptyStateView where Action == EmptyView {
    init(title: String, message: String, mood: MascotMood = .wink, compact: Bool = false) {
        self.init(title: title, message: message, mood: mood, compact: compact) { EmptyView() }
    }
}

/// Shimmering placeholder.
struct SkeletonBlock: View {
    var height: CGFloat = 14
    var width: CGFloat? = nil
    var radius: CGFloat = 8
    @State private var phase: CGFloat = -1
    var body: some View {
        RoundedRectangle(cornerRadius: radius, style: .continuous)
            .fill(Theme.surface2)
            .overlay {
                GeometryReader { g in
                    LinearGradient(colors: [.clear, Theme.surface3.opacity(0.9), .clear], startPoint: .leading, endPoint: .trailing)
                        .frame(width: g.size.width * 0.6)
                        .offset(x: phase * g.size.width * 1.6)
                }
                .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            }
            .frame(width: width, height: height)
            .onAppear { withAnimation(.linear(duration: 1.4).repeatForever(autoreverses: false)) { phase = 1 } }
            .accessibilityHidden(true)
    }
}

struct SkeletonList: View {
    var count = 4
    var body: some View {
        VStack(spacing: Space.m) {
            ForEach(0..<count, id: \.self) { _ in
                HStack(spacing: Space.m) {
                    SkeletonBlock(height: 44, width: 44, radius: 22)
                    VStack(alignment: .leading, spacing: 8) { SkeletonBlock(height: 14).frame(maxWidth: 200); SkeletonBlock(height: 12, width: 110) }
                    Spacer()
                }
                .card()
            }
        }
        .accessibilityElement()
        .accessibilityLabel("Loading")
    }
}

/// Lightweight confetti burst. Decorative only; skipped with Reduce Motion.
struct ConfettiView: View {
    var count = 70
    @State private var start = Date()
    @State private var pieces: [Piece] = []
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    struct Piece { let x, drift, spin, delay, size, speed: Double; let color: Color; let round: Bool }
    private static let colors: [Color] = [Theme.brand400, Theme.brand500, Theme.accent, Theme.success, Theme.warning, Color(red: 0.96, green: 0.45, blue: 0.71), .white]

    var body: some View {
        if !reduceMotion {
            TimelineView(.animation) { tl in
                Canvas { ctx, size in
                    let t = tl.date.timeIntervalSince(start)
                    for p in pieces {
                        let lt = t - p.delay
                        guard lt > 0 else { continue }
                        let y = size.height * 0.1 + lt * p.speed * size.height * 0.45 + lt * lt * 60
                        let x = p.x * size.width + sin(lt * 3 + p.drift * 6) * 24 + p.drift * lt * 60
                        let alpha = max(0, 1 - lt / 2.4)
                        guard alpha > 0 else { continue }
                        var c = ctx
                        c.opacity = alpha
                        c.translateBy(x: x, y: y)
                        c.rotate(by: .degrees(lt * p.spin))
                        let rect = CGRect(x: -p.size / 2, y: -p.size / 4, width: p.size, height: p.round ? p.size : p.size * 0.45)
                        c.fill(p.round ? Path(ellipseIn: rect) : Path(roundedRect: rect, cornerRadius: 1.5), with: .color(p.color))
                    }
                }
            }
            .allowsHitTesting(false)
            .ignoresSafeArea()
            .accessibilityHidden(true)
            .onAppear {
                start = Date()
                pieces = (0..<count).map { i in
                    Piece(x: .random(in: 0.08...0.92), drift: .random(in: -1...1), spin: .random(in: -540...540), delay: .random(in: 0...0.5), size: .random(in: 6...12), speed: .random(in: 0.6...1.4), color: Self.colors[i % Self.colors.count], round: Bool.random())
                }
            }
        }
    }
}
