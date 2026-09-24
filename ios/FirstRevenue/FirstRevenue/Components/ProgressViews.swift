import SwiftUI

struct ProgressRing<Center: View>: View {
    let value: Double
    var size: CGFloat = 120
    var lineWidth: CGFloat = 10
    let label: String
    @ViewBuilder var center: Center
    @State private var shown = 0.0

    var body: some View {
        ZStack {
            Circle().stroke(Theme.surface3, lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: shown)
                .stroke(AngularGradient(colors: [Theme.brand600, Theme.brand400, Theme.brand600], center: .center), style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .shadow(color: Theme.brand500.opacity(0.5), radius: 6)
            center
        }
        .frame(width: size, height: size)
        .onAppear { withAnimation(.easeOut(duration: 1.1)) { shown = min(max(value, 0), 1) } }
        .onChange(of: value) { _, v in withAnimation(.easeOut(duration: 0.8)) { shown = min(max(v, 0), 1) } }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(label)
        .accessibilityValue("\(Int(value * 100)) percent")
    }
}

struct ProgressBar: View {
    let value: Double
    var tone: Tone = .brand
    var height: CGFloat = 8
    var label = "Progress"
    @State private var shown = 0.0

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Theme.surface3)
                Capsule()
                    .fill(tone == .success ? AnyShapeStyle(Theme.success) : AnyShapeStyle(Theme.brandGradient))
                    .frame(width: max(0, geo.size.width * shown))
            }
        }
        .frame(height: height)
        .onAppear { withAnimation(.easeOut(duration: 0.9)) { shown = min(max(value, 0), 1) } }
        .onChange(of: value) { _, v in withAnimation(.easeOut(duration: 0.6)) { shown = min(max(v, 0), 1) } }
        .accessibilityElement()
        .accessibilityLabel(label)
        .accessibilityValue("\(Int(min(max(value, 0), 1) * 100)) percent")
    }
}
