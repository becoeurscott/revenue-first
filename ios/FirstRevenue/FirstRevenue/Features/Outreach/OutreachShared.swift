import SwiftUI
import UIKit

// Helpers shared by the Outreach, Coach and Revenue screens.

// MARK: - Swipe-to-reveal row (swipe actions for rows that live in a ScrollView, not a List)

struct RevealSwipeAction: Identifiable {
    let title: String
    let systemImage: String
    let tint: Color
    let action: () -> Void
    var id: String { title }
}

/// Swipe left to reveal trailing action buttons. Also exposes each action to VoiceOver.
struct RevealSwipeRow<Content: View>: View {
    let actions: [RevealSwipeAction]
    @ViewBuilder var content: Content
    @State private var offset: CGFloat = 0
    @State private var base: CGFloat = 0
    @State private var horizontal: Bool?
    private let slot: CGFloat = 80

    var body: some View {
        if actions.isEmpty {
            content
        } else {
            swipeable
        }
    }

    private var revealWidth: CGFloat { CGFloat(actions.count) * slot }

    private var swipeable: some View {
        content
            .overlay {
                if offset < 0 {
                    Color.clear.contentShape(Rectangle()).onTapGesture { close() }
                }
            }
            .offset(x: offset)
            .frame(maxWidth: .infinity)
            .background(alignment: .trailing) {
                if offset < 0 { buttons }
            }
            .simultaneousGesture(drag)
            .accessibilityActions {
                ForEach(actions) { a in
                    Button(a.title) { a.action() }
                }
            }
    }

    private var buttons: some View {
        HStack(spacing: 8) {
            ForEach(actions) { a in
                Button {
                    Haptics.tap()
                    close()
                    a.action()
                } label: {
                    VStack(spacing: 6) {
                        Image(systemName: a.systemImage).font(.system(size: 17, weight: .semibold))
                        Text(a.title).font(.caption2.weight(.bold)).lineLimit(1).minimumScaleFactor(0.7)
                    }
                    .foregroundStyle(.white)
                    .frame(width: slot - 8)
                    .frame(maxHeight: .infinity)
                    .background(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).fill(a.tint))
                }
                .buttonStyle(.pressable)
            }
        }
        .opacity(min(1, Double(-offset / 40)))
    }

    private var drag: some Gesture {
        DragGesture(minimumDistance: 18)
            .onChanged { v in
                if horizontal == nil { horizontal = abs(v.translation.width) > abs(v.translation.height) * 1.3 }
                guard horizontal == true else { return }
                offset = min(0, max(-revealWidth - 40, base + v.translation.width))
            }
            .onEnded { v in
                defer { horizontal = nil }
                guard horizontal == true else { return }
                let open = offset < -revealWidth * 0.45 || v.predictedEndTranslation.width < -revealWidth
                withAnimation(.snappy) { offset = open ? -revealWidth : 0 }
                base = open ? -revealWidth : 0
                if open { Haptics.soft() }
            }
    }

    private func close() {
        withAnimation(.snappy) { offset = 0 }
        base = 0
    }
}

// MARK: - Clipboard

@MainActor
enum OutreachClipboard {
    static func copy(_ text: String, store: AppStore, toast: String = "Copied to clipboard") {
        UIPasteboard.general.string = text
        store.showToast(toast)
    }
}

// MARK: - Static option lists

enum OutreachPlatforms {
    static func list(_ path: PathID) -> [String] {
        path == .clipping
            ? ["YouTube", "Podcast", "Twitch", "TikTok", "Instagram", "X (Twitter)", "Other"]
            : ["Google Maps", "Facebook", "Instagram", "Website", "Walk-in", "Other"]
    }
}

enum OutreachStage {
    static let all = ["All", "First touch", "Follow-up", "Reply", "Closing"]
    static func tone(_ stage: String) -> Tone {
        switch stage {
        case "First touch": .brand
        case "Follow-up": .warning
        case "Reply": .info
        case "Closing": .success
        default: .neutral
        }
    }
}

extension DealStatus {
    var tone: Tone {
        switch self {
        case .potential: .neutral
        case .booked: .warning
        case .collected: .success
        }
    }
}

// MARK: - Sheet chrome

extension View {
    /// Consistent look for the form / detail sheets presented from these screens.
    func outreachSheetChrome(_ detents: Set<PresentationDetent> = [.large]) -> some View {
        self
            .scrollDismissesKeyboard(.interactively)
            .background(Theme.bgSunken.ignoresSafeArea())
            .toolbarBackground(Theme.bgSunken, for: .navigationBar)
            .overlay { ToastOverlay() }
            .presentationDetents(detents)
            .presentationDragIndicator(.visible)
            .presentationBackground(Theme.bgSunken)
    }
}

/// Small rounded icon tile used in list rows across these screens.
struct OutreachIconTile: View {
    let systemImage: String
    var tint: Color = Theme.brand300
    var size: CGFloat = 40
    var body: some View {
        Image(systemName: systemImage)
            .font(.system(size: size * 0.42, weight: .semibold))
            .foregroundStyle(tint)
            .frame(width: size, height: size)
            .background(Circle().fill(tint.opacity(0.14)))
            .accessibilityHidden(true)
    }
}
