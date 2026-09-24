import SwiftUI

enum Tone { case neutral, brand, success, warning, danger, info
    var color: Color {
        switch self {
        case .neutral: Theme.muted
        case .brand: Theme.brand300
        case .success: Theme.success
        case .warning: Theme.warning
        case .danger: Theme.danger
        case .info: Theme.info
        }
    }
}

struct Badge: View {
    let text: String
    var tone: Tone = .neutral
    var systemImage: String? = nil
    init(_ text: String, tone: Tone = .neutral, systemImage: String? = nil) { self.text = text; self.tone = tone; self.systemImage = systemImage }
    var body: some View {
        HStack(spacing: 4) {
            if let systemImage { Image(systemName: systemImage).font(.system(size: 9, weight: .bold)) }
            Text(text).font(.system(size: 11, weight: .semibold)).lineLimit(1)
        }
        .foregroundStyle(tone.color)
        .padding(.horizontal, 10)
        .frame(height: 24)
        .background(Capsule().fill(tone == .neutral ? Theme.surface3 : tone.color.opacity(0.13)))
        .overlay(Capsule().strokeBorder(tone == .neutral ? Theme.line : tone.color.opacity(0.25)))
        .fixedSize()
    }
}

struct AvatarView: View {
    let name: String
    var size: CGFloat = 44
    var body: some View {
        let initials = name.split(separator: " ").prefix(2).compactMap { $0.first.map { String($0).uppercased() } }.joined()
        let hue = Double(name.unicodeScalars.reduce(0) { ($0 + Int($1.value) * 7) % 360 }) / 360
        Text(initials.isEmpty ? "?" : initials)
            .font(.system(size: size * 0.36, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(Circle().fill(LinearGradient(colors: [Color(hue: hue, saturation: 0.6, brightness: 0.85), Color(hue: (hue + 0.11).truncatingRemainder(dividingBy: 1), saturation: 0.7, brightness: 0.6)], startPoint: .topLeading, endPoint: .bottomTrailing)))
            .accessibilityHidden(true)
    }
}

/// Wrapping horizontal layout for chips and tags.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0, maxX: CGFloat = 0
        for v in subviews {
            let s = v.sizeThatFits(.unspecified)
            if x + s.width > width, x > 0 { x = 0; y += rowHeight + spacing; rowHeight = 0 }
            x += s.width + spacing; rowHeight = max(rowHeight, s.height); maxX = max(maxX, x - spacing)
        }
        return CGSize(width: min(maxX, width), height: y + rowHeight)
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for v in subviews {
            let s = v.sizeThatFits(.unspecified)
            if x + s.width > bounds.maxX, x > bounds.minX { x = bounds.minX; y += rowHeight + spacing; rowHeight = 0 }
            v.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(s))
            x += s.width + spacing; rowHeight = max(rowHeight, s.height)
        }
    }
}
