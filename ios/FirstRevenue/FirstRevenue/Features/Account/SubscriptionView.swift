import SwiftUI

struct SubscriptionView: View {
    @Environment(AppStore.self) private var store
    @State private var justSubscribed = false

    var body: some View {
        let status = store.s.subscription.status
        Group {
            if justSubscribed && status == .active {
                Screen(title: "Premium") { SubSuccessView() }
                    .overlay { ConfettiView() }
            } else if status == .active {
                Screen(title: "Subscription") { SubManageView() }
            } else {
                Screen(title: status == .expired ? "Subscription" : "Premium") {
                    SubPaywallView(expired: status == .expired) { withAnimation(.snappy) { justSubscribed = true } }
                }
            }
        }
        .animation(.easeInOut(duration: 0.3), value: status)
    }
}

// MARK: Paywall (none / expired)

private struct SubPaywallView: View {
    let expired: Bool
    let onSuccess: () -> Void
    @Environment(AppStore.self) private var store
    @State private var plan = "yearly"
    @State private var loading = false

    var body: some View {
        Adaptive2Col(spacing: Space.xl) {
            SubHero(expired: expired).fadeUp(0)
            checkout.fadeUp(1)
        } trailing: {
            VStack(alignment: .leading, spacing: Space.m) {
                SectionHeader(title: expired ? "What you've lost access to" : "What's included")
                SubBenefitsList(lost: expired)
            }
            .fadeUp(2)
        }
    }

    private var selectedPlan: SubscriptionPlan? { MockData.shared.subscription.plans.first { $0.id == plan } }

    private var checkout: some View {
        VStack(spacing: Space.m) {
            PlanPicker(selection: $plan).padding(.top, Space.m)
            Button {
                mockCheckout(store: store, plan: plan, loading: $loading) {
                    Haptics.notify(.success)
                    onSuccess()
                }
            } label: {
                LoadingLabel(title: loading ? "Processing…" : (expired ? "Renew Premium" : "Start Premium"), systemImage: "crown.fill", loading: loading)
            }
            .buttonStyle(.fr(.primary, size: .lg, full: true))
            .disabled(loading)
            if let p = selectedPlan {
                Text("\(p.price)\(p.period) · \(p.note)").font(.footnote).monospacedDigit().foregroundStyle(Theme.muted).multilineTextAlignment(.center)
            }
            SubRestoreButton()
            SubLegalLinks()
        }
    }
}

private struct SubHero: View {
    let expired: Bool
    @State private var float = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: Space.m) {
            icon
            if expired {
                Text("Your Premium has expired").font(.title1).foregroundStyle(Theme.ink).multilineTextAlignment(.center)
            } else {
                Text("Premium").font(.system(size: 36, weight: .heavy)).foregroundStyle(Theme.textGradient)
            }
            Text(expired ? "Your progress, prospects and revenue are safe. Renew to pick up exactly where you left off." : "Unlock your complete FirstRevenue journey.")
                .font(.callout).foregroundStyle(Theme.muted).multilineTextAlignment(.center).frame(maxWidth: 340)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, Space.s)
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder private var icon: some View {
        if expired {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 34, weight: .semibold)).foregroundStyle(Theme.warning)
                .frame(width: 84, height: 84)
                .background(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).fill(Theme.warning.opacity(0.12)))
                .overlay(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).strokeBorder(Theme.warning.opacity(0.3)))
        } else {
            Image(systemName: "crown.fill")
                .font(.system(size: 36, weight: .semibold)).foregroundStyle(.white)
                .frame(width: 84, height: 84)
                .background(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).fill(Theme.brandGradient))
                .shadow(color: Theme.brand600.opacity(0.55), radius: 22, y: 8)
                .offset(y: float ? -5 : 3)
                .onAppear {
                    guard !reduceMotion else { return }
                    withAnimation(.easeInOut(duration: 2.2).repeatForever(autoreverses: true)) { float = true }
                }
        }
    }
}

// MARK: Success

private struct SubSuccessView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        VStack(spacing: Space.xl) {
            VStack(spacing: Space.m) {
                MascotView(mood: .love, size: 148, say: "We're doing this!")
                (Text("You're ").foregroundStyle(Theme.ink) + Text("Premium!").foregroundStyle(Theme.textGradient))
                    .font(.system(size: 32, weight: .heavy))
                    .multilineTextAlignment(.center)
                Text("Your full 30-day program, the AI Coach and every tool are unlocked. Let's get you to your first payment.")
                    .font(.callout).foregroundStyle(Theme.muted).multilineTextAlignment(.center).frame(maxWidth: 360)
            }
            .fadeUp(0)
            VStack(alignment: .leading, spacing: Space.m) {
                SectionHeader(title: "What's unlocked")
                SubBenefitsList(compact: true)
            }
            .fadeUp(1)
            Button {
                store.popToRoot()
                store.tab = .plan
            } label: { Label("Go to my plan", systemImage: "arrow.right").labelStyle(TrailingIconLabel()) }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
                .fadeUp(2)
        }
        .frame(maxWidth: 560)
        .frame(maxWidth: .infinity)
        .padding(.top, Space.l)
    }
}

// MARK: Manage (active)

private struct SubManageView: View {
    @Environment(AppStore.self) private var store
    @State private var switching = false
    @State private var confirmCancel = false

    private var current: SubscriptionPlan {
        let plans = MockData.shared.subscription.plans
        return plans.first { $0.id == store.s.subscription.plan } ?? plans[0]
    }

    var body: some View {
        Adaptive2Col(spacing: Space.xl) {
            VStack(spacing: Space.m) {
                planCard.fadeUp(0)
                Button { switching = true } label: { Label("Switch plan", systemImage: "arrow.left.arrow.right") }
                    .buttonStyle(.fr(.secondary, full: true))
                Button("Cancel subscription", role: .destructive) { confirmCancel = true }
                    .buttonStyle(.fr(.danger, full: true))
                SubRestoreButton()
                Text("Prototype billing — no payment is taken.").font(.caption).foregroundStyle(Theme.faint)
            }
        } trailing: {
            VStack(alignment: .leading, spacing: Space.m) {
                SectionHeader(title: "Included in your plan")
                SubBenefitsList(compact: true)
            }
            .fadeUp(1)
        }
        .sheet(isPresented: $switching) { SubSwitchPlanSheet(current: current.id) }
        .confirmationDialog("Cancel Premium?", isPresented: $confirmCancel, titleVisibility: .visible) {
            Button("Cancel subscription", role: .destructive) {
                store.setSubscription(.expired)
                store.showToast("Subscription cancelled. You can renew any time.", .info)
            }
            Button("Keep Premium", role: .cancel) {}
        } message: {
            Text("You'll lose access to your 30-day program, the AI Coach and your tools. Your prospects and revenue data stay saved.")
        }
    }

    private var planCard: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            HStack(alignment: .top) {
                Image(systemName: "crown.fill").font(.system(size: 22, weight: .semibold)).foregroundStyle(.white)
                    .frame(width: 48, height: 48)
                    .background(RoundedRectangle(cornerRadius: Radius.md, style: .continuous).fill(Theme.brandGradient))
                    .shadow(color: Theme.brand600.opacity(0.45), radius: 10, y: 4)
                Spacer()
                Badge("Active", tone: .success, systemImage: "checkmark")
            }
            Text("CURRENT PLAN").font(.eyebrow).tracking(0.8).foregroundStyle(Theme.brand300).padding(.top, Space.s)
            Text("Premium \(current.name)").font(.title2).foregroundStyle(Theme.ink)
            (Text(current.price).font(.body.weight(.bold)).foregroundStyle(Theme.ink) + Text(current.period).foregroundStyle(Theme.muted))
                .monospacedDigit()
            if let renews = store.s.subscription.renews {
                Divider().overlay(Theme.line).padding(.vertical, Space.s)
                Label("Renews \(renews.formatted(date: .long, time: .omitted))", systemImage: "calendar.badge.clock")
                    .font(.footnote).foregroundStyle(Theme.muted)
            }
        }
        .card(.hero)
        .accessibilityElement(children: .combine)
    }
}

private struct SubSwitchPlanSheet: View {
    let current: String
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var draft = ""

    var body: some View {
        AccountSheetScaffold(title: "Switch plan", description: "Your new plan starts today. Nothing is charged in this prototype.", detents: [.medium]) {
            PlanPicker(selection: $draft).padding(.top, Space.m)
        } footer: {
            Button(draft == current ? "This is your current plan" : "Confirm switch") {
                store.subscribe(draft)
                let name = MockData.shared.subscription.plans.first { $0.id == draft }?.name ?? ""
                store.showToast("Switched to the \(name) plan")
                dismiss()
            }
            .buttonStyle(.fr(.primary, size: .lg, full: true))
            .disabled(draft == current)
        }
        .onAppear { draft = current }
    }
}

// MARK: Shared parts

private struct SubBenefitsList: View {
    var lost = false
    var compact = false
    @Environment(\.horizontalSizeClass) private var hSize

    var body: some View {
        let cols = hSize == .regular || compact ? [GridItem(.flexible())] : adaptiveColumns(min: 300, spacing: Space.s)
        LazyVGrid(columns: cols, spacing: Space.s) {
            ForEach(Array(MockData.shared.subscription.benefits.enumerated()), id: \.element.title) { i, b in
                row(b).fadeUp(i)
            }
        }
    }

    private func row(_ b: Benefit) -> some View {
        HStack(alignment: .top, spacing: Space.m) {
            SymbolTile(icon: b.icon, tint: lost ? Theme.faint : Theme.brand300, size: 40)
                .opacity(lost ? 0.7 : 1)
            VStack(alignment: .leading, spacing: 2) {
                Text(b.title).font(.subheadline.weight(.semibold)).foregroundStyle(lost ? Theme.inkSoft : Theme.ink)
                if !compact { Text(b.description).font(.footnote).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Image(systemName: lost ? "xmark" : "checkmark")
                .font(.caption2.weight(.heavy))
                .foregroundStyle(lost ? Theme.danger : Theme.success)
                .frame(width: 22, height: 22)
                .background(Circle().fill((lost ? Theme.danger : Theme.success).opacity(0.15)))
                .accessibilityLabel(lost ? "Locked" : "Included")
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).fill(Theme.surface))
        .overlay(RoundedRectangle(cornerRadius: Radius.lg, style: .continuous).strokeBorder(Theme.line))
        .accessibilityElement(children: .combine)
    }
}

private struct SubRestoreButton: View {
    @Environment(AppStore.self) private var store
    @State private var loading = false

    var body: some View {
        Button {
            loading = true
            Task { @MainActor in
                try? await Task.sleep(for: .seconds(1))
                loading = false
                store.showToast("No previous purchase found on this account (demo)", .info)
            }
        } label: {
            HStack(spacing: 8) {
                if loading { ProgressView().controlSize(.small).tint(Theme.muted) } else { Image(systemName: "arrow.clockwise") }
                Text("Restore Purchase")
            }
        }
        .buttonStyle(.fr(.ghost, full: true))
        .disabled(loading)
    }
}

private struct SubLegalLinks: View {
    @State private var doc: AccountLegalDoc?

    var body: some View {
        VStack(spacing: 2) {
            HStack(spacing: Space.s) {
                link("Terms", .terms)
                Text("·").foregroundStyle(Theme.faint).accessibilityHidden(true)
                link("Privacy", .privacy)
            }
            Text("Prototype checkout — no payment is taken.").font(.caption).foregroundStyle(Theme.faint)
        }
        .sheet(item: $doc) { AccountLegalSheet(doc: $0) }
    }

    private func link(_ title: String, _ d: AccountLegalDoc) -> some View {
        Button(title) { doc = d }
            .font(.footnote.weight(.medium))
            .foregroundStyle(Theme.muted)
            .frame(minWidth: 44, minHeight: 44)
    }
}
