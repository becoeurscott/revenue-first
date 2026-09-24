import SwiftUI

struct PlanPicker: View {
    @Binding var selection: String
    var body: some View {
        HStack(spacing: Space.m) {
            ForEach(MockData.shared.subscription.plans) { p in
                let on = selection == p.id
                Button { Haptics.select(); withAnimation(.snappy) { selection = p.id } } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(p.name).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.muted)
                            Spacer()
                            Image(systemName: on ? "checkmark.circle.fill" : "circle").foregroundStyle(on ? Theme.brand400 : Theme.lineStrong)
                        }
                        Text(p.price).font(.number(26)).foregroundStyle(Theme.ink).padding(.top, 6)
                        Text(p.period).font(.caption).foregroundStyle(Theme.faint)
                        Text(p.note).font(.caption).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true).padding(.top, 4)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .card(on ? .selected : .plain, padding: Space.l)
                    .overlay(alignment: .topTrailing) { if let b = p.badge { Badge(b, tone: .success).background(Capsule().fill(Theme.bg)).offset(x: -10, y: -12) } }
                }
                .buttonStyle(.pressable)
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
    }
}

/// Simulated checkout. No payment is processed — it only flips local state.
@MainActor
func mockCheckout(store: AppStore, plan: String, loading: Binding<Bool>, done: @escaping () -> Void) {
    guard !store.isOffline else { store.showToast("You're offline. Try again when you're connected.", .error); return }
    loading.wrappedValue = true
    Task { @MainActor in
        try? await Task.sleep(for: .seconds(1.4))
        store.subscribe(plan)
        loading.wrappedValue = false
        done()
    }
}

/// Presented app-wide whenever `store.paywallFeature` is set.
struct PaywallSheet: View {
    let feature: String
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var plan = "yearly"
    @State private var loading = false

    var body: some View {
        ScrollView {
            VStack(spacing: Space.l) {
                MascotView(mood: .love, size: 104).padding(.top, Space.l)
                VStack(spacing: 6) {
                    Text("Unlock with Premium").font(.title2).foregroundStyle(Theme.ink)
                    Text("\(feature) is part of your complete FirstRevenue journey.").font(.subheadline).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
                }
                PlanPicker(selection: $plan).padding(.top, 6)
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(MockData.shared.subscription.benefits.prefix(4), id: \.title) { b in
                        HStack(spacing: 10) { SymbolTile(icon: b.icon, size: 28); Text(b.title).font(.subheadline.weight(.medium)).foregroundStyle(Theme.inkSoft) }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.horizontal, Space.xl)
        }
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: 6) {
                Button {
                    mockCheckout(store: store, plan: plan, loading: $loading) {
                        dismiss()
                        store.showToast("Welcome to Premium")
                    }
                } label: { LoadingLabel(title: "Start Premium", systemImage: "crown.fill", loading: loading) }
                .buttonStyle(.fr(.primary, size: .lg, full: true))
                .disabled(loading)
                Text("Prototype checkout — no payment is taken.").font(.caption).foregroundStyle(Theme.faint)
            }
            .padding(.horizontal, Space.xl).padding(.top, Space.m).background(Theme.bgSunken)
        }
        .background(Theme.bgSunken.ignoresSafeArea())
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }
}

/// Locked feature state shown in place of premium content.
struct LockedView: View {
    let feature: String
    var message = "Upgrade to unlock your full 30-day program, the AI Coach and every tool."
    @Environment(AppStore.self) private var store
    var body: some View {
        VStack(spacing: Space.m) {
            Image(systemName: "lock.fill").font(.system(size: 22, weight: .semibold)).foregroundStyle(.white)
                .frame(width: 56, height: 56).background(Circle().fill(Theme.brandGradient)).shadow(color: Theme.brand600.opacity(0.5), radius: 14)
            Text("\(feature) is a Premium feature").font(.title3.weight(.bold)).foregroundStyle(Theme.ink).multilineTextAlignment(.center)
            Text(message).font(.subheadline).foregroundStyle(Theme.muted).multilineTextAlignment(.center).frame(maxWidth: 300)
            Button { store.paywallFeature = feature } label: { Label("Unlock Premium", systemImage: "crown.fill") }
                .buttonStyle(.fr(.primary)).padding(.top, 6)
        }
        .padding(.vertical, 40).padding(.horizontal, Space.xl)
        .frame(maxWidth: .infinity)
        .background(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).fill(Theme.brand500.opacity(0.05)))
        .overlay(RoundedRectangle(cornerRadius: Radius.xl, style: .continuous).strokeBorder(Theme.brand500.opacity(0.3), style: StrokeStyle(lineWidth: 1, dash: [6, 5])))
    }
}

struct PremiumGate<Content: View>: View {
    let feature: String
    var message: String? = nil
    @ViewBuilder var content: Content
    @Environment(AppStore.self) private var store
    var body: some View {
        if store.isPremium { content } else if let message { LockedView(feature: feature, message: message) } else { LockedView(feature: feature) }
    }
}
