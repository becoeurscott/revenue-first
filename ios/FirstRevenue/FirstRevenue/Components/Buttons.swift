import SwiftUI

enum ButtonVariant { case primary, secondary, ghost, danger, success }
enum ButtonSize { case sm, md, lg }

/// The app's one button style. `Button("Start") {}.buttonStyle(.fr(.primary, size: .lg, full: true))`
struct FRButtonStyle: ButtonStyle {
    var variant: ButtonVariant = .primary
    var size: ButtonSize = .md
    var full = false
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        let height: CGFloat = size == .sm ? 36 : size == .md ? 46 : 56
        let font: Font = size == .sm ? .subheadline.weight(.semibold) : size == .md ? .callout.weight(.semibold) : .body.weight(.bold)
        let radius: CGFloat = size == .sm ? Radius.sm : size == .md ? Radius.md : Radius.lg
        configuration.label
            .font(font)
            .lineLimit(1)
            .padding(.horizontal, size == .sm ? 14 : 20)
            .frame(maxWidth: full ? .infinity : nil, minHeight: height)
            .foregroundStyle(foreground)
            .background { background(radius: radius) }
            .contentShape(RoundedRectangle(cornerRadius: radius))
            .opacity(isEnabled ? 1 : 0.4)
            // Solid backing so a disabled (faded) button never lets content show through it.
            .background { if variant != .ghost { RoundedRectangle(cornerRadius: radius, style: .continuous).fill(Theme.bg) } }
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.snappy, value: configuration.isPressed)
    }

    private var foreground: Color {
        switch variant {
        case .primary: .white
        case .secondary: Theme.ink
        case .ghost: Theme.muted
        case .danger: Theme.danger
        case .success: Theme.success
        }
    }

    @ViewBuilder private func background(radius: CGFloat) -> some View {
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
        switch variant {
        case .primary:
            shape.fill(Theme.brandGradient).shadow(color: Theme.brand600.opacity(isEnabled ? 0.35 : 0), radius: 12, y: 6)
        case .secondary:
            shape.fill(Theme.surface2).overlay(shape.strokeBorder(Theme.line))
        case .ghost:
            Color.clear
        case .danger:
            shape.fill(Theme.danger.opacity(0.12)).overlay(shape.strokeBorder(Theme.danger.opacity(0.25)))
        case .success:
            shape.fill(Theme.success.opacity(0.12)).overlay(shape.strokeBorder(Theme.success.opacity(0.25)))
        }
    }
}

extension ButtonStyle where Self == FRButtonStyle {
    static func fr(_ variant: ButtonVariant = .primary, size: ButtonSize = .md, full: Bool = false) -> FRButtonStyle {
        FRButtonStyle(variant: variant, size: size, full: full)
    }
}

/// Button with a spinner state.
struct LoadingLabel: View {
    let title: String
    var systemImage: String? = nil
    var loading = false
    var body: some View {
        HStack(spacing: 8) {
            if loading { ProgressView().tint(.white).controlSize(.small) }
            else if let systemImage { Image(systemName: systemImage) }
            Text(title)
        }
    }
}

/// 44pt circular icon button (top bars, toolbars).
struct IconButton: View {
    let systemImage: String
    let label: String
    var active = false
    var badge = false
    let action: () -> Void

    var body: some View {
        Button(action: { Haptics.tap(); action() }) {
            Image(systemName: systemImage)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(active ? Theme.brand300 : Theme.muted)
                .frame(width: 44, height: 44)
                .background(Circle().fill(active ? Theme.brand500.opacity(0.15) : Theme.surface))
                .overlay(Circle().strokeBorder(active ? Theme.brand500.opacity(0.4) : Theme.line))
                .overlay(alignment: .topTrailing) {
                    if badge { Circle().fill(Theme.danger).frame(width: 10, height: 10).overlay(Circle().stroke(Theme.surface, lineWidth: 2)).offset(x: -8, y: 8) }
                }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }
}
