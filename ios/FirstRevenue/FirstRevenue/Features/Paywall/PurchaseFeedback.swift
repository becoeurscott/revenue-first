import SwiftUI

/// Horizontal "no" shake. Increment `shakes` inside `withAnimation` to play it once.
struct Shake: GeometryEffect {
    var shakes: CGFloat
    var animatableData: CGFloat {
        get { shakes }
        set { shakes = newValue }
    }
    func effectValue(size: CGSize) -> ProjectionTransform {
        ProjectionTransform(CGAffineTransform(translationX: 10 * sin(shakes * .pi * 4), y: 0))
    }
}

/// Shown above the buy button when a purchase didn't go through, or is waiting for approval.
struct PurchaseErrorCard: View {
    let message: String
    let pending: Bool
    let onDismiss: () -> Void

    private var tint: Color { pending ? Theme.warning : Theme.danger }

    var body: some View {
        HStack(alignment: .center, spacing: 10) {
            MascotView(mood: pending ? .thinking : .sad, size: 52, interactive: false, float: false)
            VStack(alignment: .leading, spacing: 2) {
                Text(pending ? "Almost there" : "That didn't go through")
                    .font(.play(15, .heavy)).foregroundStyle(Theme.ink)
                Text(message).font(.play(13, .medium)).foregroundStyle(Theme.inkSoft)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
            Button(action: onDismiss) {
                Image(systemName: "xmark").font(.system(size: 12, weight: .bold)).foregroundStyle(Theme.muted)
                    .frame(width: 32, height: 32)
            }
            .accessibilityLabel("Dismiss")
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(tint.opacity(0.12)))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(tint.opacity(0.45), lineWidth: 2))
        .transition(.move(edge: .bottom).combined(with: .opacity))
        .accessibilityElement(children: .combine)
    }
}
