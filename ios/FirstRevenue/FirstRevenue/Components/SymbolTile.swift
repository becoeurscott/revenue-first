import SwiftUI

/// The app's icon container. SF Symbols only — the product uses no emoji.
struct SymbolTile: View {
    let icon: String
    var tint: Color = Theme.brand300
    var size: CGFloat = 40
    /// Gradient-filled tile for hero / achieved states.
    var filled = false
    var circle = false

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: circle ? size / 2 : size * 0.3, style: .continuous)
        Image(systemName: icon)
            .font(.system(size: size * 0.44, weight: .semibold))
            .symbolRenderingMode(.hierarchical)
            .foregroundStyle(filled ? .white : tint)
            .frame(width: size, height: size)
            .background {
                if filled { shape.fill(Theme.brandGradient).shadow(color: Theme.brand600.opacity(0.4), radius: 8, y: 3) }
                else { shape.fill(tint.opacity(0.13)) }
            }
            .overlay { if !filled { shape.strokeBorder(tint.opacity(0.18)) } }
            .accessibilityHidden(true)
    }
}

/// Warm gradient flame used for streaks (replaces the fire emoji).
struct StreakFlame: View {
    var size: CGFloat = 18
    var body: some View {
        Image(systemName: "flame.fill")
            .font(.system(size: size, weight: .bold))
            .foregroundStyle(LinearGradient(colors: [Color(red: 1, green: 0.8, blue: 0.3), Theme.warning, Color(red: 0.96, green: 0.3, blue: 0.2)], startPoint: .top, endPoint: .bottom))
            .accessibilityHidden(true)
    }
}
