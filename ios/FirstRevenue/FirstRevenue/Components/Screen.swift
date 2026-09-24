import SwiftUI

/// Standard scrolling screen: dark background, gutter, readable max width on iPad,
/// and space for the tab bar. Top-level tabs pass `large: true` for a big title.
struct Screen<Content: View>: View {
    let title: String
    var subtitle: String? = nil
    var eyebrow: String? = nil
    var large = false
    var maxWidth: CGFloat = 920
    @ViewBuilder var content: Content

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                if large {
                    VStack(alignment: .leading, spacing: 6) {
                        if let eyebrow { Text(eyebrow.uppercased()).font(.eyebrow).tracking(0.8).foregroundStyle(Theme.brand300) }
                        Text(title).font(.display).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
                        if let subtitle { Text(subtitle).font(.callout).foregroundStyle(Theme.muted) }
                    }
                    .padding(.top, 4)
                    .padding(.bottom, Space.xl)
                } else if let subtitle {
                    Text(subtitle).font(.callout).foregroundStyle(Theme.muted).padding(.bottom, Space.l)
                }
                content
            }
            .frame(maxWidth: maxWidth, alignment: .leading)
            .padding(.horizontal, Space.gutter)
            .padding(.top, large ? 0 : Space.s)
            .padding(.bottom, 40)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Theme.bg.ignoresSafeArea())
        .navigationTitle(large ? "" : title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Theme.bg.opacity(0.9), for: .navigationBar)
    }
}

/// Bottom-pinned action area used by detail screens (primary CTA always reachable).
struct BottomBar<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        VStack(spacing: Space.s) { content }
            .frame(maxWidth: 620)
            .padding(.horizontal, Space.gutter)
            .padding(.top, Space.m)
            .padding(.bottom, Space.s)
            .frame(maxWidth: .infinity)
            .background(.ultraThinMaterial)
            .background(Theme.bg.opacity(0.7))
            .overlay(alignment: .top) { Divider().overlay(Theme.line) }
    }
}

/// Adaptive two-column layout: side-by-side on regular width, stacked on phones.
struct Adaptive2Col<Leading: View, Trailing: View>: View {
    var spacing: CGFloat = Space.xl
    var leadingWeight: CGFloat = 0.58
    @ViewBuilder var leading: Leading
    @ViewBuilder var trailing: Trailing
    @Environment(\.horizontalSizeClass) private var hSize

    var body: some View {
        if hSize == .regular {
            HStack(alignment: .top, spacing: spacing) {
                VStack(alignment: .leading, spacing: spacing) { leading }.frame(maxWidth: .infinity)
                VStack(alignment: .leading, spacing: spacing) { trailing }.frame(maxWidth: .infinity)
            }
        } else {
            VStack(alignment: .leading, spacing: spacing) { leading; trailing }
        }
    }
}

/// Grid that grows from 1–2 columns on phones to 3–4 on iPad.
func adaptiveColumns(min: CGFloat = 160, spacing: CGFloat = Space.m) -> [GridItem] {
    [GridItem(.adaptive(minimum: min), spacing: spacing, alignment: .top)]
}

struct FadeUp: ViewModifier {
    var delay: Double = 0
    @State private var shown = false
    func body(content: Content) -> some View {
        content
            .opacity(shown ? 1 : 0)
            .offset(y: shown ? 0 : 12)
            .onAppear { withAnimation(.spring(response: 0.5, dampingFraction: 0.85).delay(delay)) { shown = true } }
    }
}
extension View {
    /// Card-entrance animation. Pass an index to stagger lists.
    func fadeUp(_ index: Int = 0) -> some View { modifier(FadeUp(delay: min(Double(index), 6) * 0.05)) }
}
