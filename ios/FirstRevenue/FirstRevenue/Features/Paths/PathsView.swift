import SwiftUI

struct PathsView: View {
    @Environment(AppStore.self) private var store
    @State private var switchTarget: PathID?

    var body: some View {
        Screen(title: "Paths", subtitle: "Two proven ways to earn your first money online.", large: true) {
            Adaptive2Col(spacing: Space.xl) {
                VStack(alignment: .leading, spacing: Space.s) {
                    SectionHeader(title: "Current path")
                    PathCurrentHero().fadeUp(0)
                }
            } trailing: {
                VStack(alignment: .leading, spacing: Space.s) {
                    SectionHeader(title: "Other path")
                    PathOtherCard { id in PathSwitch.request(id, store: store, target: $switchTarget) }.fadeUp(1)
                }
                PathExplainerCard().fadeUp(2)
            }
        }
        .pathSwitchAlert(target: $switchTarget)
    }
}

// MARK: - Current path hero

private struct PathCurrentHero: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let program = store.program
        let path = program.path
        VStack(alignment: .leading, spacing: Space.l + 4) {
            header(path)
            progress(program)
            PathObjectiveBox(objective: path.objective)
            skills(path)
            VStack(alignment: .leading, spacing: Space.m) {
                PathEyebrow(text: "Expected workflow")
                PathNumberedList(items: path.workflow)
            }
            Button { Haptics.tap(); store.push(.path(path.id)) } label: {
                Label("Open path dashboard", systemImage: "arrow.right").labelStyle(TrailingIconLabel())
            }
            .buttonStyle(.fr(.primary, size: .lg, full: true))
        }
        .padding(Space.l + 2)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(PathHeroBackdrop(hue: path.hue))
        .clipShape(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).strokeBorder(Theme.brand500.opacity(0.28)))
        .shadow(color: Theme.brand600.opacity(0.18), radius: 16, y: 8)
    }

    private func header(_ path: PathInfo) -> some View {
        HStack(alignment: .top, spacing: Space.l) {
            PathEmojiTile(path: path)
            VStack(alignment: .leading, spacing: 6) {
                Badge("Active", tone: .brand, systemImage: "checkmark")
                Text(path.name).font(.title2.weight(.heavy)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                Text(path.tagline).font(.subheadline).foregroundStyle(Theme.inkSoft.opacity(0.8)).fixedSize(horizontal: false, vertical: true)
            }
        }
        .accessibilityElement(children: .combine)
    }

    private func progress(_ program: Program) -> some View {
        let done = program.daysCompleted
        return VStack(spacing: Space.s) {
            HStack(alignment: .firstTextBaseline) {
                Text("Day \(program.currentDay) of \(program.totalDays)").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink)
                Spacer()
                Text("\(done) \(done == 1 ? "day" : "days") completed").font(.footnote).monospacedDigit().foregroundStyle(Theme.muted)
            }
            ProgressBar(value: Double(done) / Double(program.totalDays), label: "\(program.path.name) progress")
        }
    }

    private func skills(_ path: PathInfo) -> some View {
        VStack(alignment: .leading, spacing: Space.s + 2) {
            PathEyebrow(text: "Skills you build")
            FlowLayout(spacing: 8) {
                ForEach(path.skills, id: \.self) { PathTagChip(text: $0) }
            }
        }
    }
}

// MARK: - Other path

private struct PathOtherCard: View {
    let onSwitch: (PathID) -> Void
    @Environment(AppStore.self) private var store

    var body: some View {
        let premium = store.isPremium
        let other = MockData.path(store.s.pathId.other)
        VStack(alignment: .leading, spacing: Space.l) {
            summary(other, premium: premium)
            tiles(other)
            actions(other, premium: premium)
        }
        .card(premium ? .plain : .locked)
    }

    @ViewBuilder private func summary(_ other: PathInfo, premium: Bool) -> some View {
        let content = HStack(alignment: .top, spacing: Space.l) {
            PathEmojiTile(path: other, size: 56, locked: !premium)
            VStack(alignment: .leading, spacing: 6) {
                if premium { Badge("Available", tone: .success) } else { Badge("Premium", tone: .brand, systemImage: "crown.fill") }
                Text(other.name).font(.headline.weight(.bold)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                Text(other.tagline).font(.subheadline).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        if premium {
            content.accessibilityElement(children: .combine)
        } else {
            Button { onSwitch(other.id) } label: { content.contentShape(Rectangle()) }
                .buttonStyle(.pressable)
                .accessibilityLabel("\(other.name). Unlock path switching with Premium")
        }
    }

    private func tiles(_ other: PathInfo) -> some View {
        let done = store.s.progress[other.id]?.completedDays.count ?? 0
        return HStack(spacing: Space.m) {
            PathInfoTile(label: "Typical price", value: other.typicalPrice)
            PathInfoTile(label: "Your progress", value: done > 0 ? "\(done) / \(MockData.totalDays) days" : "Not started")
        }
    }

    private func actions(_ other: PathInfo, premium: Bool) -> some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: Space.m) { exploreButton(other); switchButton(other, premium: premium) }
            VStack(spacing: Space.m) { exploreButton(other); switchButton(other, premium: premium) }
        }
    }

    private func exploreButton(_ other: PathInfo) -> some View {
        Button { Haptics.tap(); store.push(.path(other.id)) } label: { Label("Explore", systemImage: "binoculars") }
            .buttonStyle(.fr(.secondary, full: true))
    }

    private func switchButton(_ other: PathInfo, premium: Bool) -> some View {
        Button { onSwitch(other.id) } label: {
            Label(premium ? "Switch to this path" : "Unlock switching", systemImage: premium ? "arrow.triangle.2.circlepath" : "lock.fill")
        }
        .buttonStyle(.fr(.primary, full: true))
    }
}

// MARK: - Explainer

private struct PathExplainerCard: View {
    private let items: [(icon: String, title: String, body: String)] = [
        ("safari", "One path at a time", "Your daily missions, lessons and resources follow the path you are on, so you always know what to do next."),
        ("externaldrive.badge.checkmark", "Progress is never lost", "Each path keeps its own day count. Switch away and come back — you pick up exactly where you stopped."),
        ("arrow.triangle.2.circlepath", "Switching is a Premium feature", "Exploring any path is free. Running both programs is part of Premium."),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: Space.l) {
            Text("How paths work").font(.section).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
            ForEach(items, id: \.title) { item in
                HStack(alignment: .top, spacing: Space.m) {
                    Image(systemName: item.icon).font(.system(size: 15, weight: .semibold)).foregroundStyle(Theme.brand300)
                        .frame(width: 36, height: 36)
                        .background(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous).fill(Theme.surface3))
                    VStack(alignment: .leading, spacing: 3) {
                        Text(item.title).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink)
                        Text(item.body).font(.footnote).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
                    }
                }
                .accessibilityElement(children: .combine)
            }
        }
        .card()
    }
}
