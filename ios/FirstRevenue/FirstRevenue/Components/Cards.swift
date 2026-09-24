import SwiftUI

enum CardVariant { case plain, selected, locked, completed, hero }

struct CardModifier: ViewModifier {
    var variant: CardVariant
    var padding: CGFloat?
    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: Radius.xl, style: .continuous)
        content
            .padding(padding ?? Space.l + 2)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                switch variant {
                case .plain: shape.fill(Theme.surface)
                case .selected: shape.fill(Theme.brand500.opacity(0.12))
                case .locked: shape.fill(Theme.bgRaised)
                case .completed: shape.fill(Theme.success.opacity(0.06))
                case .hero:
                    shape.fill(Theme.surface2).overlay(
                        shape.fill(RadialGradient(colors: [Theme.brand600.opacity(0.32), .clear], center: .topLeading, startRadius: 0, endRadius: 320))
                    )
                }
            }
            .overlay {
                switch variant {
                case .selected: shape.strokeBorder(Theme.brand500.opacity(0.5))
                case .locked: shape.strokeBorder(Theme.line, style: StrokeStyle(lineWidth: 1, dash: [5, 4]))
                case .completed: shape.strokeBorder(Theme.success.opacity(0.25))
                case .hero: shape.strokeBorder(Theme.brand500.opacity(0.28))
                case .plain: shape.strokeBorder(Theme.line)
                }
            }
            .shadow(color: variant == .hero || variant == .selected ? Theme.brand600.opacity(0.18) : .clear, radius: 16, y: 8)
    }
}

extension View {
    func card(_ variant: CardVariant = .plain, padding: CGFloat? = nil) -> some View { modifier(CardModifier(variant: variant, padding: padding)) }
}

/// Makes any row feel pressable (scale + dim) when used as a Button/NavigationLink label.
struct PressableStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
            .opacity(configuration.isPressed ? 0.85 : 1)
            .animation(.snappy, value: configuration.isPressed)
    }
}
extension ButtonStyle where Self == PressableStyle { static var pressable: PressableStyle { PressableStyle() } }

struct SectionHeader: View {
    let title: String
    var action: String? = nil
    var onAction: (() -> Void)? = nil
    var body: some View {
        HStack {
            Text(title).font(.section).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
            Spacer()
            if let action, let onAction {
                Button { Haptics.tap(); onAction() } label: {
                    HStack(spacing: 2) { Text(action); Image(systemName: "chevron.right").font(.caption.weight(.bold)) }
                        .font(.subheadline.weight(.semibold)).foregroundStyle(Theme.brand300)
                        .frame(minHeight: 44)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.bottom, 2)
    }
}

/// Settings-style grouped list.
struct ListGroup<Content: View>: View {
    var title: String? = nil
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            if let title {
                Text(title.uppercased()).font(.eyebrow).tracking(0.8).foregroundStyle(Theme.faint).padding(.horizontal, 4)
            }
            VStack(spacing: 0) {
                Group(subviews: content) { subviews in
                    ForEach(Array(subviews.enumerated()), id: \.offset) { i, sub in
                        sub
                        if i < subviews.count - 1 { Divider().overlay(Theme.line).padding(.leading, 60) }
                    }
                }
            }
            .background(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).fill(Theme.surface))
            .overlay(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).strokeBorder(Theme.line))
            .clipShape(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous))
        }
    }
}

struct ListRow<Trailing: View>: View {
    var icon: String? = nil
    let title: String
    var detail: String? = nil
    var danger = false
    var showChevron = true
    var action: (() -> Void)? = nil
    @ViewBuilder var trailing: Trailing

    var body: some View {
        let row = HStack(spacing: Space.m) {
            if let icon {
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(danger ? Theme.danger : Theme.brand300)
                    .frame(width: 36, height: 36)
                    .background(RoundedRectangle(cornerRadius: Radius.sm).fill(danger ? Theme.danger.opacity(0.1) : Theme.surface3))
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.body.weight(.medium)).foregroundStyle(danger ? Theme.danger : Theme.ink)
                if let detail { Text(detail).font(.footnote).foregroundStyle(Theme.faint).lineLimit(1) }
            }
            Spacer(minLength: 8)
            trailing
            if action != nil && showChevron { Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Theme.faint) }
        }
        .padding(.horizontal, Space.l)
        .padding(.vertical, 10)
        .frame(minHeight: 56)
        .contentShape(Rectangle())

        if let action {
            Button { Haptics.tap(); action() } label: { row }.buttonStyle(.pressable)
        } else {
            row
        }
    }
}

extension ListRow where Trailing == EmptyView {
    init(icon: String? = nil, title: String, detail: String? = nil, danger: Bool = false, action: (() -> Void)? = nil) {
        self.init(icon: icon, title: title, detail: detail, danger: danger, showChevron: true, action: action) { EmptyView() }
    }
}

struct StatCard: View {
    var icon: String? = nil
    let value: String
    let label: String
    var accent = false
    var action: (() -> Void)? = nil

    var body: some View {
        let content = VStack(alignment: .leading, spacing: 4) {
            if let icon {
                SymbolTile(icon: icon, tint: accent ? Theme.brand300 : Theme.muted, size: 32).padding(.bottom, 4)
            }
            Text(value)
                .font(.number(26))
                .foregroundStyle(accent ? AnyShapeStyle(Theme.textGradient) : AnyShapeStyle(Theme.ink))
                .lineLimit(1).minimumScaleFactor(0.6)
                .contentTransition(.numericText())
            Text(label).font(.footnote).foregroundStyle(Theme.muted).lineLimit(1)
        }
        .card(padding: Space.l)
        .accessibilityElement(children: .combine)

        if let action {
            Button { Haptics.tap(); action() } label: { content }.buttonStyle(.pressable)
        } else {
            content
        }
    }
}
