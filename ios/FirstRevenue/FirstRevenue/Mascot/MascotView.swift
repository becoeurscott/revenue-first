import SwiftUI

enum MascotMood: CaseIterable { case happy, thinking, excited, wink, sad, sleepy, love, focused }

private let ink = Color(red: 0.18, green: 0.06, blue: 0.40)
private let limb = Color(red: 0.49, green: 0.23, blue: 0.93)

/// Penny — FirstRevenue's brain mascot, drawn natively in SwiftUI.
/// Pupils follow touches (and the iPad pointer), she blinks on her own,
/// floats, and jumps with a new line + haptic when tapped.
struct MascotView: View {
    var mood: MascotMood = .happy
    var size: CGFloat = 160
    var interactive = true
    var say: String? = nil
    var tapLines: [String] = ["Hehe, that tickles!", "Less theory. More action.", "One mission a day. That's the whole trick.", "I believe in you. Statistically AND emotionally.", "Your first client is closer than you think."]
    var float = true
    var bubbleSide: BubbleSide = .top

    enum BubbleSide { case top, trailing }

    @State private var look = CGSize.zero
    @State private var blinking = false
    @State private var jumping = false
    @State private var tapCount = -1
    @State private var reaction: String?
    @State private var bob = false
    @State private var bubbleHeight: CGFloat = 40
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var activeMood: MascotMood { jumping ? .excited : mood }
    private var bubble: String? { reaction ?? say }

    var body: some View {
        ZStack {
            Circle()
                .fill(Theme.brand500.opacity(0.35))
                .frame(width: size * 0.8, height: size * 0.8)
                .blur(radius: size * 0.16)
                .scaleEffect(bob ? 1.06 : 0.96)
                .offset(y: -size * 0.04)

            PennyBody(mood: activeMood, look: activeMood == .thinking ? CGSize(width: 0.6, height: -0.8) : look, blinking: blinking)
                .frame(width: size, height: size)
                .offset(y: float && !reduceMotion ? (bob ? -size * 0.045 : 0) : 0)
                .scaleEffect(x: jumping ? 0.95 : 1, y: jumping ? 1.06 : 1, anchor: .bottom)
                .offset(y: jumping ? -size * 0.14 : 0)
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
        .gesture(interactive ? trackGesture : nil)
        .onContinuousHover { phase in
            guard interactive else { return }
            if case .active(let p) = phase { lookToward(p) } else { withAnimation(.snappy) { look = .zero } }
        }
        .accessibilityElement()
        .accessibilityLabel("Penny, your FirstRevenue mascot")
        .accessibilityValue(bubble ?? "")
        .accessibilityHint(interactive ? "Double tap to say hi" : "")
        .accessibilityAddTraits(interactive ? .isButton : [])
        .accessibilityAction { if interactive { tap() } }
        .task { await blinkLoop() }
        .task(id: interactive) { if interactive { await idleLookLoop() } }
        .onAppear {
            guard float, !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) { bob = true }
        }
    }

    // Touch: drag moves the eyes; a short touch is a tap.
    private var trackGesture: some Gesture {
        DragGesture(minimumDistance: 0)
            .onChanged { v in lookToward(v.location) }
            .onEnded { v in
                withAnimation(.snappy) { look = .zero }
                if hypot(v.translation.width, v.translation.height) < 8 { tap() }
            }
    }

    private func lookToward(_ p: CGPoint) {
        let dx = p.x - size / 2, dy = p.y - size / 2
        let dist = max(hypot(dx, dy), 1)
        let reach = min(dist / (size * 0.6), 1)
        withAnimation(.interactiveSpring(response: 0.18)) { look = CGSize(width: dx / dist * reach, height: dy / dist * reach) }
    }

    private func tap() {
        Haptics.soft()
        tapCount += 1
        withAnimation(.bouncy) { jumping = true; reaction = tapLines[tapCount % tapLines.count] }
        let count = tapCount
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(420))
            withAnimation(.bouncy) { jumping = false }
            try? await Task.sleep(for: .seconds(2.4))
            if tapCount == count { withAnimation(.easeOut(duration: 0.2)) { reaction = nil } }
        }
    }

    private func blinkLoop() async {
        while !Task.isCancelled {
            try? await Task.sleep(for: .milliseconds(Int.random(in: 2400...5000)))
            withAnimation(.easeInOut(duration: 0.07)) { blinking = true }
            try? await Task.sleep(for: .milliseconds(140))
            withAnimation(.easeInOut(duration: 0.07)) { blinking = false }
        }
    }

    /// On a touch screen there is no pointer, so she glances around on her own between touches.
    private func idleLookLoop() async {
        let glances = [CGSize(width: -0.7, height: 0.1), CGSize(width: 0.7, height: -0.2), CGSize(width: 0, height: 0.6), .zero]
        var i = 0
        while !Task.isCancelled {
            try? await Task.sleep(for: .seconds(Double.random(in: 2.5...4.5)))
            withAnimation(.easeInOut(duration: 0.35)) { look = glances[i % glances.count] }
            i += 1
        }
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

/// The drawing itself, in a 200×200 design space scaled to fit.
private struct PennyBody: View {
    let mood: MascotMood
    let look: CGSize
    let blinking: Bool

    var body: some View {
        GeometryReader { geo in
            let k = geo.size.width / 200
            ZStack {
                // ground shadow
                Ellipse().fill(.black.opacity(0.35)).frame(width: 76 * k, height: 10 * k).position(x: 100 * k, y: 186 * k)
                // legs + feet
                Path { p in p.move(to: pt(86, 146, k)); p.addLine(to: pt(84, 172, k)); p.move(to: pt(114, 146, k)); p.addLine(to: pt(116, 172, k)) }
                    .stroke(limb, style: StrokeStyle(lineWidth: 7 * k, lineCap: .round))
                Ellipse().fill(limb).frame(width: 22 * k, height: 12 * k).position(pt(80, 175, k))
                Ellipse().fill(limb).frame(width: 22 * k, height: 12 * k).position(pt(120, 175, k))
                // arms
                arms(k).stroke(limb, style: StrokeStyle(lineWidth: 7 * k, lineCap: .round))
                // brain body: overlapping lobes share one gradient so they read as one shape
                lobes(k).fill(LinearGradient(colors: [Color(red: 0.96, green: 0.72, blue: 1), Color(red: 0.75, green: 0.52, blue: 0.99), Color(red: 0.49, green: 0.23, blue: 0.93)], startPoint: UnitPoint(x: 0.2, y: 0.15), endPoint: UnitPoint(x: 0.8, y: 0.8)))
                lobes(k).fill(RadialGradient(colors: [.white.opacity(0.5), .clear], center: UnitPoint(x: 0.32, y: 0.22), startRadius: 0, endRadius: 90 * k))
                gyri(k).stroke(Color(red: 0.43, green: 0.16, blue: 0.85).opacity(0.42), style: StrokeStyle(lineWidth: 3.5 * k, lineCap: .round))
                // cheeks
                Ellipse().fill(Color(red: 0.98, green: 0.44, blue: 0.52).opacity(0.55)).frame(width: 18 * k, height: 11 * k).position(pt(68, 116, k))
                Ellipse().fill(Color(red: 0.98, green: 0.44, blue: 0.52).opacity(0.55)).frame(width: 18 * k, height: 11 * k).position(pt(132, 116, k))
                // eyes
                EyeView(closed: blinking || mood == .sleepy, wink: false, mood: mood, look: look, k: k).position(pt(82, 98, k))
                EyeView(closed: blinking || mood == .sleepy || mood == .wink, wink: mood == .wink, mood: mood, look: look, k: k).position(pt(118, 98, k))
                brows(k)
                mouth(k)
                extras(k)
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .accessibilityHidden(true)
    }

    private func pt(_ x: CGFloat, _ y: CGFloat, _ k: CGFloat) -> CGPoint { CGPoint(x: x * k, y: y * k) }

    private func lobes(_ k: CGFloat) -> Path {
        var p = Path()
        for (x, y, r) in [(62.0, 80.0, 30.0), (86, 58, 30), (116, 58, 30), (140, 80, 30), (148, 108, 24), (52, 108, 24), (74, 124, 26), (100, 128, 28), (126, 124, 26)] {
            p.addEllipse(in: CGRect(x: (x - r) * k, y: (y - r) * k, width: r * 2 * k, height: r * 2 * k))
        }
        p.addEllipse(in: CGRect(x: 46 * k, y: 52 * k, width: 108 * k, height: 84 * k))
        return p
    }

    private func gyri(_ k: CGFloat) -> Path {
        var p = Path()
        p.move(to: pt(100, 30, k)); p.addQuadCurve(to: pt(100, 46, k), control: pt(94, 38, k)); p.addQuadCurve(to: pt(100, 62, k), control: pt(106, 54, k))
        p.move(to: pt(62, 62, k)); p.addQuadCurve(to: pt(86, 58, k), control: pt(72, 48, k))
        p.move(to: pt(44, 88, k)); p.addQuadCurve(to: pt(60, 78, k), control: pt(48, 76, k))
        p.move(to: pt(138, 62, k)); p.addQuadCurve(to: pt(114, 58, k), control: pt(128, 48, k))
        p.move(to: pt(156, 88, k)); p.addQuadCurve(to: pt(140, 78, k), control: pt(152, 76, k))
        p.move(to: pt(74, 44, k)); p.addQuadCurve(to: pt(88, 46, k), control: pt(82, 38, k))
        p.move(to: pt(126, 44, k)); p.addQuadCurve(to: pt(112, 46, k), control: pt(118, 38, k))
        return p
    }

    private func arms(_ k: CGFloat) -> Path {
        var p = Path()
        func arm(_ a: (CGFloat, CGFloat), _ c: (CGFloat, CGFloat), _ b: (CGFloat, CGFloat)) {
            p.move(to: pt(a.0, a.1, k)); p.addQuadCurve(to: pt(b.0, b.1, k), control: pt(c.0, c.1, k))
        }
        switch mood {
        case .excited, .love: arm((40, 96), (22, 80), (22, 58)); arm((160, 96), (178, 80), (178, 58))
        case .thinking: arm((40, 108), (26, 120), (30, 136)); arm((158, 112), (160, 134), (128, 130))
        case .wink: arm((40, 108), (26, 120), (30, 136)); arm((160, 100), (180, 88), (176, 64))
        case .sad: arm((42, 112), (34, 130), (40, 144)); arm((158, 112), (166, 130), (160, 144))
        default: arm((40, 108), (24, 118), (26, 134)); arm((160, 108), (176, 118), (174, 134))
        }
        return p
    }

    @ViewBuilder private func brows(_ k: CGFloat) -> some View {
        if mood == .sad || mood == .focused {
            Path { p in
                if mood == .sad { p.move(to: pt(72, 84, k)); p.addLine(to: pt(90, 79, k)); p.move(to: pt(128, 84, k)); p.addLine(to: pt(110, 79, k)) }
                else { p.move(to: pt(72, 80, k)); p.addLine(to: pt(90, 84, k)); p.move(to: pt(128, 80, k)); p.addLine(to: pt(110, 84, k)) }
            }
            .stroke(ink, style: StrokeStyle(lineWidth: 3.5 * k, lineCap: .round))
        }
    }

    @ViewBuilder private func mouth(_ k: CGFloat) -> some View {
        let stroke = StrokeStyle(lineWidth: 3.5 * k, lineCap: .round)
        switch mood {
        case .excited, .love:
            ZStack {
                Path { p in p.move(to: pt(88, 116, k)); p.addQuadCurve(to: pt(112, 116, k), control: pt(100, 134, k)); p.closeSubpath() }.fill(ink)
                Path { p in p.move(to: pt(94, 124, k)); p.addQuadCurve(to: pt(106, 124, k), control: pt(100, 130, k)); p.addQuadCurve(to: pt(94, 124, k), control: pt(100, 121, k)) }.fill(Color(red: 0.98, green: 0.44, blue: 0.52))
            }
        case .thinking: Path { p in p.move(to: pt(94, 121, k)); p.addQuadCurve(to: pt(107, 121, k), control: pt(100, 118, k)) }.stroke(ink, style: stroke)
        case .sad: Path { p in p.move(to: pt(90, 124, k)); p.addQuadCurve(to: pt(110, 124, k), control: pt(100, 114, k)) }.stroke(ink, style: stroke)
        case .sleepy: Ellipse().fill(ink).frame(width: 8 * k, height: 10 * k).position(pt(100, 121, k))
        case .focused: Path { p in p.move(to: pt(92, 120, k)); p.addLine(to: pt(108, 120, k)) }.stroke(ink, style: stroke)
        default: Path { p in p.move(to: pt(89, 116, k)); p.addQuadCurve(to: pt(111, 116, k), control: pt(100, 129, k)) }.stroke(ink, style: stroke)
        }
    }

    @ViewBuilder private func extras(_ k: CGFloat) -> some View {
        switch mood {
        case .thinking:
            TimelineView(.animation) { t in
                let phase = t.date.timeIntervalSinceReferenceDate
                ForEach(0..<3, id: \.self) { i in
                    Circle().fill(Theme.brand300)
                        .frame(width: CGFloat(8 + i * 3) * k, height: CGFloat(8 + i * 3) * k)
                        .opacity(0.3 + 0.7 * (0.5 + 0.5 * sin(phase * 4 - Double(i))))
                        .position(pt([150, 164, 182][i], [40, 28, 14][i], k))
                }
            }
        case .sleepy:
            Text("z Z").font(.system(size: 20 * k, weight: .heavy)).foregroundStyle(Theme.brand300).position(pt(168, 34, k))
        case .excited, .love:
            TimelineView(.animation) { t in
                let phase = t.date.timeIntervalSinceReferenceDate
                ForEach(0..<3, id: \.self) { i in
                    Image(systemName: "sparkle")
                        .font(.system(size: [22, 18, 12][i] * k, weight: .bold))
                        .foregroundStyle(Color(red: 0.99, green: 0.9, blue: 0.54))
                        .scaleEffect(0.7 + 0.35 * sin(phase * 5 + Double(i) * 1.7))
                        .position(pt([24, 176, 160][i], [34, 30, 8][i], k))
                }
            }
        default: EmptyView()
        }
    }
}

private struct EyeView: View {
    let closed: Bool
    let wink: Bool
    let mood: MascotMood
    let look: CGSize
    let k: CGFloat

    var body: some View {
        ZStack {
            if closed {
                Path { p in
                    if mood == .sleepy && !wink { p.move(to: CGPoint(x: 0, y: 12 * k)); p.addQuadCurve(to: CGPoint(x: 18 * k, y: 12 * k), control: CGPoint(x: 9 * k, y: 18 * k)) }
                    else { p.move(to: CGPoint(x: 0, y: 14 * k)); p.addQuadCurve(to: CGPoint(x: 18 * k, y: 14 * k), control: CGPoint(x: 9 * k, y: 4 * k)) }
                }
                .stroke(ink, style: StrokeStyle(lineWidth: 4 * k, lineCap: .round))
                .frame(width: 18 * k, height: 24 * k)
            } else if mood == .love {
                Image(systemName: "heart.fill").font(.system(size: 20 * k)).foregroundStyle(Color(red: 0.96, green: 0.25, blue: 0.37))
            } else {
                Ellipse().fill(.white).frame(width: 23 * k, height: 25 * k)
                if mood == .excited {
                    Circle().fill(ink).frame(width: 18 * k)
                    Image(systemName: "sparkle").font(.system(size: 12 * k, weight: .black)).foregroundStyle(Color(red: 0.99, green: 0.9, blue: 0.54))
                } else {
                    ZStack {
                        Circle().fill(ink).frame(width: 13 * k)
                        Circle().fill(.white).frame(width: 4.4 * k).offset(x: 2.2 * k, y: -2.4 * k)
                    }
                    .offset(x: look.width * 4.5 * k, y: look.height * 3.5 * k)
                }
            }
        }
        .frame(width: 26 * k, height: 26 * k)
    }
}

/// Loading state: Penny thinks while an orbit spins around her.
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
