import SwiftUI
import UIKit

// FirstRevenue design tokens. Dark-first; light values back the Appearance setting.
// Views never hard-code colors or spacing: use `Theme` and the modifiers below.

private extension UIColor {
    convenience init(hex: UInt32, alpha: CGFloat = 1) {
        self.init(red: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255, blue: CGFloat(hex & 0xFF) / 255, alpha: alpha)
    }
}

private func adaptive(_ dark: UIColor, _ light: UIColor) -> Color {
    Color(UIColor { $0.userInterfaceStyle == .light ? light : dark })
}

enum Theme {
    // Surfaces
    static let bg = adaptive(UIColor(hex: 0x050505), UIColor(hex: 0xF6F5FB))
    static let bgRaised = adaptive(UIColor(hex: 0x0A0A0A), UIColor(hex: 0xFFFFFF))
    static let bgSunken = adaptive(UIColor(hex: 0x111111), UIColor(hex: 0xEFEDF7))
    static let surface = adaptive(UIColor(hex: 0x151515), UIColor(hex: 0xFFFFFF))
    static let surface2 = adaptive(UIColor(hex: 0x1B1B1B), UIColor(hex: 0xF4F2FB))
    static let surface3 = adaptive(UIColor(hex: 0x202020), UIColor(hex: 0xEBE8F6))
    static let line = adaptive(UIColor(white: 1, alpha: 0.08), UIColor(hex: 0x0F0A28, alpha: 0.09))
    static let lineStrong = adaptive(UIColor(white: 1, alpha: 0.16), UIColor(hex: 0x0F0A28, alpha: 0.18))

    // Text
    static let ink = adaptive(UIColor(hex: 0xFFFFFF), UIColor(hex: 0x0B0A14))
    static let inkSoft = adaptive(UIColor(hex: 0xF5F5F5), UIColor(hex: 0x1C1A2B))
    static let muted = adaptive(UIColor(hex: 0xA1A1AA), UIColor(hex: 0x5B5870))
    static let faint = adaptive(UIColor(hex: 0x71717A), UIColor(hex: 0x86839A))

    // Brand
    static let brand600 = Color(UIColor(hex: 0x7C3AED))
    static let brand500 = Color(UIColor(hex: 0x8B5CF6))
    static let brand400 = Color(UIColor(hex: 0xA855F7))
    static let brand300 = adaptive(UIColor(hex: 0xC4B5FD), UIColor(hex: 0x6D28D9))
    static let accent = Color(UIColor(hex: 0x6366F1))

    // Status
    static let success = Color(UIColor(hex: 0x22C55E))
    static let warning = Color(UIColor(hex: 0xF59E0B))
    static let danger = Color(UIColor(hex: 0xEF4444))
    static let info = Color(UIColor(hex: 0x60A5FA))

    static let brandGradient = LinearGradient(colors: [brand600, brand400], startPoint: .topLeading, endPoint: .bottomTrailing)
    static let textGradient = LinearGradient(colors: [brand300, brand400], startPoint: .topLeading, endPoint: .bottomTrailing)

    /// Deterministic lesson/path artwork from a hue (0–360).
    static func hueGradient(_ hue: Double) -> some View {
        let h = hue / 360
        return ZStack {
            LinearGradient(colors: [Color(hue: h, saturation: 0.6, brightness: 0.2), Color(hue: (h + 0.08).truncatingRemainder(dividingBy: 1), saturation: 0.7, brightness: 0.12)], startPoint: .topLeading, endPoint: .bottomTrailing)
            RadialGradient(colors: [Color(hue: h, saturation: 0.75, brightness: 0.95).opacity(0.9), .clear], center: .topLeading, startRadius: 0, endRadius: 260)
            RadialGradient(colors: [Color(hue: (h + 0.14).truncatingRemainder(dividingBy: 1), saturation: 0.75, brightness: 0.7).opacity(0.85), .clear], center: .bottomTrailing, startRadius: 0, endRadius: 240)
        }
    }
}

/// 8pt spacing scale.
enum Space {
    static let xs: CGFloat = 4
    static let s: CGFloat = 8
    static let m: CGFloat = 12
    static let l: CGFloat = 16
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    /// Horizontal screen gutter.
    static let gutter: CGFloat = 16
}

enum Radius {
    static let sm: CGFloat = 10
    static let md: CGFloat = 14
    static let lg: CGFloat = 18
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
}

/// Type scale. Uses Dynamic Type text styles so it scales with accessibility settings.
extension Font {
    static let display = Font.system(.largeTitle, design: .default).weight(.heavy)
    static let title1 = Font.system(.title, design: .default).weight(.heavy)
    static let title2 = Font.system(.title2, design: .default).weight(.bold)
    static let section = Font.system(.headline, design: .default).weight(.bold)
    static let bodyStrong = Font.system(.body).weight(.semibold)
    static let meta = Font.system(.footnote).weight(.medium)
    static let eyebrow = Font.system(.caption).weight(.bold)
    static func number(_ size: CGFloat) -> Font { .system(size: size, weight: .heavy, design: .rounded).monospacedDigit() }
}

extension Animation {
    static let snappy = Animation.spring(response: 0.35, dampingFraction: 0.82)
    static let bouncy = Animation.spring(response: 0.45, dampingFraction: 0.6)
}
