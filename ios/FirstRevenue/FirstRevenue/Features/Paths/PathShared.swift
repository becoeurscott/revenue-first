import SwiftUI

// Shared building blocks for the Paths feature (PathsView + PathDetailView).

/// Premium-gated path switching. Premium users confirm in an alert; free users see the paywall.
struct PathSwitchModifier: ViewModifier {
    @Binding var target: PathID?
    @Environment(AppStore.self) private var store

    func body(content: Content) -> some View {
        content.alert(title, isPresented: presented, presenting: target) { id in
            Button("Switch path") { confirm(id) }
            Button("Cancel", role: .cancel) { target = nil }
        } message: { _ in
            Text("Your progress on \(store.program.path.name) is saved — days, streak, prospects and revenue stay exactly where they are. You can switch back at any time.")
        }
    }

    private var title: String { target.map { "Switch to \(MockData.path($0).name)?" } ?? "Switch path?" }

    private var presented: Binding<Bool> {
        Binding(get: { target != nil }, set: { if !$0 { target = nil } })
    }

    private func confirm(_ id: PathID) {
        target = nil
        store.switchPath(id)
        Haptics.notify(.success)
        store.showToast("Switched to \(MockData.path(id).name)")
        store.popToRoot()
        store.tab = .home
    }
}

extension View {
    func pathSwitchAlert(target: Binding<PathID?>) -> some View { modifier(PathSwitchModifier(target: target)) }
}

@MainActor
enum PathSwitch {
    /// Call from a button: premium → sets `target` (shows the confirm alert); free → paywall.
    static func request(_ id: PathID, store: AppStore, target: Binding<PathID?>) {
        guard id != store.s.pathId else { return }
        Haptics.tap()
        if store.isPremium { target.wrappedValue = id } else { store.paywallFeature = "Path switching" }
    }
}

/// 1, 2, 3… list used for workflows and first tasks.
struct PathNumberedList: View {
    let items: [String]
    var body: some View {
        VStack(alignment: .leading, spacing: Space.m) {
            ForEach(Array(items.enumerated()), id: \.offset) { i, step in
                HStack(alignment: .firstTextBaseline, spacing: Space.m) {
                    Text("\(i + 1)")
                        .font(.caption.weight(.bold)).monospacedDigit()
                        .foregroundStyle(Theme.brand300)
                        .frame(width: 26, height: 26)
                        .background(Circle().fill(Theme.brand500.opacity(0.15)))
                        .alignmentGuide(.firstTextBaseline) { d in d[VerticalAlignment.center] + 5 }
                    Text(step).font(.subheadline).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
                }
                .accessibilityElement(children: .combine)
            }
        }
    }
}

/// Emoji tile painted with the path's hue.
struct PathEmojiTile: View {
    let path: PathInfo
    var size: CGFloat = 64
    var locked = false
    var body: some View {
        Image(systemName: path.icon)
            .font(.system(size: size * 0.4, weight: .semibold))
            .foregroundStyle(.white)
            .opacity(locked ? 0.5 : 1)
            .frame(width: size, height: size)
            .background(Theme.hueGradient(path.hue).saturation(locked ? 0 : 1))
            .clipShape(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(.white.opacity(0.15)))
            .overlay(alignment: .bottomTrailing) {
                if locked {
                    Image(systemName: "lock.fill").font(.system(size: 10, weight: .bold)).foregroundStyle(Theme.ink)
                        .frame(width: 24, height: 24)
                        .background(Circle().fill(Theme.surface3)).overlay(Circle().strokeBorder(Theme.lineStrong))
                        .offset(x: 6, y: 6)
                }
            }
            .shadow(color: locked ? .clear : Color(hue: path.hue / 360, saturation: 0.7, brightness: 0.8).opacity(0.35), radius: 12, y: 4)
            .accessibilityHidden(true)
    }
}

/// Hue-tinted backdrop that fades into the card surface.
struct PathHeroBackdrop: View {
    let hue: Double
    var strength = 0.45
    var body: some View {
        ZStack {
            Theme.surface2
            Theme.hueGradient(hue).opacity(strength)
            LinearGradient(colors: [.clear, Theme.surface2.opacity(0.85), Theme.surface2], startPoint: .top, endPoint: .bottom)
        }
    }
}

/// Small eyebrow + value tile (typical price, progress…).
struct PathInfoTile: View {
    let label: String
    let value: String
    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label.uppercased()).font(.eyebrow).tracking(0.6).foregroundStyle(Theme.faint)
            Text(value).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
        }
        .padding(Space.m)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.bg.opacity(0.45)))
        .overlay(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).strokeBorder(Theme.line))
        .accessibilityElement(children: .combine)
    }
}

/// "30-day objective" callout.
struct PathObjectiveBox: View {
    let objective: String
    var title = "30-day goal"
    var body: some View {
        HStack(alignment: .top, spacing: Space.m) {
            Image(systemName: "scope").font(.body.weight(.semibold)).foregroundStyle(Theme.brand300).padding(.top, 2)
            VStack(alignment: .leading, spacing: 3) {
                Text(title.uppercased()).font(.eyebrow).tracking(0.6).foregroundStyle(Theme.faint)
                Text(objective).font(.callout.weight(.medium)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(Space.m + 2)
        .background(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).fill(Theme.brand500.opacity(0.07)))
        .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(Theme.brand500.opacity(0.25)))
        .accessibilityElement(children: .combine)
    }
}

/// Neutral chip used for skills and weekly focus tags.
struct PathTagChip: View {
    let text: String
    var body: some View {
        Text(text)
            .font(.footnote.weight(.medium)).foregroundStyle(Theme.inkSoft)
            .padding(.horizontal, 12).padding(.vertical, 7)
            .background(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous).fill(Theme.surface3))
            .overlay(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous).strokeBorder(Theme.line))
    }
}

/// Eyebrow title used inside path cards.
struct PathEyebrow: View {
    let text: String
    var body: some View {
        Text(text.uppercased()).font(.eyebrow).tracking(0.8).foregroundStyle(Theme.faint).accessibilityAddTraits(.isHeader)
    }
}
