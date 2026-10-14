import SwiftUI

/// Shown when a route belongs to a different journey than the active one.
struct JourneyGateView: View {
    let message: String
    @Environment(AppStore.self) private var store

    var body: some View {
        Screen(title: "Not in this journey") {
            EmptyStateView(title: "Not part of \(store.journey.shortLabel)", message: message, mood: .thinking) {
                VStack(spacing: Space.s) {
                    Button("Go to Today's Mission") { store.popToRoot(); store.tab = .home }.buttonStyle(.fr(.primary))
                    Button("See All Journeys") { store.push(.paths) }.buttonStyle(.fr(.ghost))
                }
            }
        }
    }
}

/// The niche layer and the stage layer of a mission: how today's universal action applies to
/// this user's niche, adjusted for where they started. Completed days keep the niche they were done with.
struct MissionNicheCard: View {
    let plan: DayPlan
    @Environment(AppStore.self) private var store

    var body: some View {
        if let enrollment = store.enrollment {
            let niche = enrollment.niche(forDay: plan.day)
            let nicheLine = plan.nicheHint.map(niche.fill)
            let stageLine = plan.stageHints?[enrollment.startingStage.rawValue]
            if nicheLine != nil || stageLine != nil || niche.cautionNote != nil {
                VStack(alignment: .leading, spacing: Space.s) {
                    Label("FOR \(niche.normalizedLabel.uppercased())", systemImage: "scope").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.brand300)
                    if let nicheLine { Text(nicheLine).font(.subheadline).foregroundStyle(Theme.inkSoft).fixedSize(horizontal: false, vertical: true) }
                    if let stageLine {
                        Label(stageLine, systemImage: "flag.fill").font(.footnote).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
                    }
                    if let note = niche.cautionNote {
                        Label(note, systemImage: "exclamationmark.shield.fill").font(.footnote).foregroundStyle(Theme.warning).fixedSize(horizontal: false, vertical: true)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .card()
                .accessibilityElement(children: .combine)
            }
        }
    }
}

/// Honest state for an earning method we can't coach yet. Never routes to a different journey on its own.
struct JourneyComingSoonCard: View {
    let config: JourneyConfig
    @Environment(AppStore.self) private var store

    var body: some View {
        let joined = store.isOnWaitlist(config.id)
        VStack(alignment: .leading, spacing: Space.m) {
            HStack(spacing: Space.m) {
                SymbolTile(icon: config.icon, tint: Theme.muted, size: 44)
                VStack(alignment: .leading, spacing: 2) {
                    Text(config.label).font(.body.weight(.bold)).foregroundStyle(Theme.ink)
                    Text(config.description).font(.footnote).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
                Badge("Coming soon", tone: .warning)
            }
            Button {
                store.joinWaitlist(config.id)
                store.showToast("We'll let you know when \(config.shortLabel.lowercased()) opens")
            } label: {
                Label(joined ? "You're on the list" : "Notify Me", systemImage: joined ? "checkmark" : "bell")
            }
            .buttonStyle(.fr(.secondary, full: true))
            .disabled(joined)
        }
        .card()
    }
}

extension AppStore {
    /// Where a metric is worked on, for tappable stat cards.
    func route(for metric: StatMetric) -> Route? {
        switch metric {
        case .prospects, .contacted, .replies, .clients: .outreach(.prospects)
        case .revenue: .revenue
        case .lessons: .lessons
        case .streak: .streak
        case .videosPublished, .uploadsThisWeek: .channel(.content)
        case .watchTime, .subscribers, .clickThroughRate, .returningViewers: .channel(.analytics)
        case .channelIncome: .channel(.monetization)
        case .missions, .daysCompleted: nil
        }
    }
}
