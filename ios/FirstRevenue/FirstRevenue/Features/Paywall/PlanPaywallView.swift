import SwiftUI
import RevenueCat
import StoreKit

/// Vaulten's own paywall, built on the current RevenueCat offering: a Premium / Ultimate switch, the plans
/// of that tier, and one big button. Free trials show only to people who are eligible, and the full price
/// and renewal terms are always visible under the button (App Store guideline 3.1.2).
struct PlanPaywallView: View {
    var title = "Unlock your full plan"
    /// Called after a purchase or restore that unlocked Premium.
    let onUnlocked: () -> Void
    /// Called when the user closes the paywall without buying.
    let onClose: () -> Void

    enum Tier: String, CaseIterable { case premium = "Premium", ultimate = "Ultimate" }

    @Environment(AppStore.self) private var store
    @State private var tier: Tier = .premium
    @State private var selectedId: String?
    @State private var eligible: Set<String> = []
    @State private var buying = false
    @State private var failure: String?
    @State private var shakes: CGFloat = 0
    @State private var legal: AccountLegalDoc?
    /// True once a load attempt has finished, so an empty result shows a message instead of spinning forever.
    @State private var loaded = false
    /// Why no plans showed, for support and TestFlight debugging (e.g. "timed out", "offering default: 0 of 4 plans").
    @State private var diagnostic: String?

    private var revenueCat: RevenueCatService { RevenueCatService.shared }
    private var packages: [Package] {
        let all = revenueCat.offerings?.current?.availablePackages ?? []
        return all.filter { ($0.identifier.contains("ultimate") ? Tier.ultimate : .premium) == tier }
            .sorted { ($0.storeProduct.subscriptionPeriod?.unit == .year ? 0 : 1) < ($1.storeProduct.subscriptionPeriod?.unit == .year ? 0 : 1) }
    }
    private var selected: Package? { packages.first { $0.identifier == selectedId } ?? packages.first }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button { Haptics.tap(); onClose() } label: {
                    Image(systemName: "xmark").font(.system(size: 18, weight: .bold)).foregroundStyle(Theme.muted)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel("Close")
                Spacer()
            }
            .padding(.horizontal, Space.m)

            ScrollView {
                VStack(spacing: Space.l) {
                    // Compact header so both plans are visible without scrolling; benefits follow below.
                    HStack(spacing: 10) {
                        MascotView(mood: .excited, size: 72, float: false)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(title).font(.play(24, .heavy)).foregroundStyle(Theme.ink)
                                .fixedSize(horizontal: false, vertical: true)
                            Text("Start today, then get a new plan every month.")
                                .font(.play(14, .medium)).foregroundStyle(Theme.muted)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        Spacer(minLength: 0)
                    }
                    tierSwitch
                    if packages.isEmpty { loadingOrError } else { plans }
                    benefits.padding(.top, Space.s)
                }
                .padding(.horizontal, Space.xl)
                .padding(.bottom, Space.xl)
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
            }

            footer
        }
        .background(Theme.bg.ignoresSafeArea())
        .task { await reload(force: false) }
        .onChange(of: tier) { _, _ in selectedId = nil; failure = nil }
        // A purchase that was waiting for approval went through: unlock right away.
        .onChange(of: revenueCat.isPro) { _, pro in if pro { onUnlocked() } }
        .sheet(item: $legal) { AccountLegalSheet(doc: $0) }
    }

    // MARK: Sections

    private var tierSwitch: some View {
        HStack(spacing: 10) {
            ForEach(Tier.allCases, id: \.self) { t in
                Button { withAnimation(.snappy) { tier = t } } label: {
                    VStack(spacing: 0) {
                        Text(t.rawValue)
                        if t == .ultimate { Text("Most help").font(.play(12, .bold)).foregroundStyle(tier == t ? .white.opacity(0.85) : Theme.brand300) }
                    }
                }
                .buttonStyle(.chunky(.option(selected: tier == t), height: 54))
            }
        }
    }

    private var benefits: some View {
        let rows: [(String, String)] = tier == .premium
            ? [("map.fill", "Your 30-day plan, then a new one every month"), ("wrench.and.screwdriver.fill", "Every template, script and tool"), ("chart.line.uptrend.xyaxis", "Weekly check-ins and progress"), ("sparkles", "AI Coach: 10 messages a month")]
            : [("checkmark.seal.fill", "Everything in Premium"), ("sparkles", "AI Coach: 300 messages a month"), ("arrow.triangle.2.circlepath", "Your plan rewritten when you change niche"), ("bolt.fill", "Priority on new features")]
        return VStack(alignment: .leading, spacing: 12) {
            ForEach(rows, id: \.1) { icon, text in
                HStack(spacing: 12) {
                    Image(systemName: icon).font(.system(size: 16, weight: .bold)).foregroundStyle(Theme.brand300)
                        .frame(width: 36, height: 36).background(RoundedRectangle(cornerRadius: 11, style: .continuous).fill(Theme.brand500.opacity(0.14)))
                    Text(text).font(.play(16, .semibold)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                }
            }
        }
        .animation(.snappy, value: tier)
    }

    private var plans: some View {
        VStack(spacing: 12) {
            ForEach(packages, id: \.identifier) { p in
                let on = p.identifier == (selected?.identifier ?? "")
                Button { withAnimation(.snappy) { selectedId = p.identifier } } label: {
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 8) {
                                Text(periodName(p)).font(.play(17, .heavy))
                                if let badge = badge(p) {
                                    Text(badge).font(.play(12, .heavy)).foregroundStyle(on ? Theme.brand600 : .white)
                                        .padding(.horizontal, 8).padding(.vertical, 3)
                                        .background(Capsule().fill(on ? .white : Theme.brand500))
                                }
                            }
                            Text(subline(p)).font(.play(13, .medium)).opacity(0.85)
                        }
                        Spacer()
                        Text(p.storeProduct.localizedPriceString).font(.play(18, .heavy))
                    }
                    .padding(.horizontal, 4)
                }
                .buttonStyle(.chunky(.option(selected: on), height: 72))
            }
        }
    }

    @ViewBuilder private var loadingOrError: some View {
        if loaded {
            VStack(spacing: Space.m) {
                Label(revenueCat.errorMessage ?? "The plans couldn't be loaded from the App Store right now.", systemImage: "exclamationmark.circle.fill")
                    .font(.footnote).foregroundStyle(Theme.danger).multilineTextAlignment(.center)
                if let diagnostic {
                    Text(diagnostic).font(.caption2.monospaced()).foregroundStyle(Theme.faint).multilineTextAlignment(.center).textSelection(.enabled)
                }
                Button("Try again") { Task { await reload(force: true) } }.buttonStyle(.fr(.secondary))
            }
            .padding(.vertical, Space.l)
        } else {
            ProgressView().controlSize(.large).tint(Theme.brand300).padding(.vertical, Space.xl)
        }
    }

    private var footer: some View {
        VStack(spacing: 8) {
            if let failure {
                PurchaseErrorCard(message: failure, pending: revenueCat.purchasePending) { withAnimation(.snappy) { self.failure = nil } }
            }
            Button { buy() } label: {
                if buying { ProgressView().tint(.white) } else { Text(ctaTitle) }
            }
            .buttonStyle(.chunky())
            .modifier(Shake(shakes: shakes))
            .disabled(selected == nil || buying)
            Text(renewalLine).font(.play(12, .medium)).foregroundStyle(Theme.faint).multilineTextAlignment(.center)
            HStack(spacing: Space.l) {
                Button("Restore") { restore() }
                Button("Terms") { legal = .terms }
                Button("Privacy") { legal = .privacy }
            }
            .font(.play(13, .semibold)).foregroundStyle(Theme.muted)
            .frame(minHeight: 36)
        }
        .padding(.horizontal, Space.xl).padding(.top, Space.s).padding(.bottom, Space.s)
        .frame(maxWidth: 560)
        .frame(maxWidth: .infinity)
        .background(Theme.bg)
    }

    // MARK: Copy

    private func trial(_ p: Package) -> StoreProductDiscount? {
        guard let intro = p.storeProduct.introductoryDiscount, intro.paymentMode == .freeTrial, eligible.contains(p.storeProduct.productIdentifier) else { return nil }
        return intro
    }

    private func periodText(_ period: RevenueCat.SubscriptionPeriod) -> String {
        let unit: String
        switch period.unit {
        case .day: unit = period.value == 7 ? "week" : "day"
        case .week: unit = "week"
        case .month: unit = "month"
        case .year: unit = "year"
        @unknown default: unit = "period"
        }
        if period.unit == .day && period.value == 7 { return "1 week" }
        return "\(period.value) \(unit)\(period.value == 1 ? "" : "s")"
    }

    private func periodName(_ p: Package) -> String { p.storeProduct.subscriptionPeriod?.unit == .year ? "Yearly" : "Monthly" }

    private func perUnit(_ p: Package) -> String { p.storeProduct.subscriptionPeriod?.unit == .year ? "year" : "month" }

    private func badge(_ p: Package) -> String? {
        if let t = trial(p) { return "\(periodText(t.subscriptionPeriod)) free" }
        return p.storeProduct.subscriptionPeriod?.unit == .year ? "Best value" : nil
    }

    private func subline(_ p: Package) -> String {
        if let t = trial(p) { return "Free for \(periodText(t.subscriptionPeriod)), then \(p.storeProduct.localizedPriceString)/\(perUnit(p))" }
        if p.storeProduct.subscriptionPeriod?.unit == .year, let m = p.storeProduct.localizedPricePerMonth { return "Just \(m)/month, billed yearly" }
        return "Billed monthly"
    }

    private var ctaTitle: String {
        guard let p = selected else { return "Continue" }
        return trial(p) != nil ? "Start My Free Trial" : "Unlock \(tier.rawValue)"
    }

    private var renewalLine: String {
        guard let p = selected else { return "Auto-renews until canceled. Cancel anytime in Settings." }
        if let t = trial(p) {
            return "Free for \(periodText(t.subscriptionPeriod)), then \(p.storeProduct.localizedPriceString)/\(perUnit(p)). Auto-renews until canceled. Cancel anytime in Settings."
        }
        return "\(p.storeProduct.localizedPriceString)/\(perUnit(p)). Auto-renews until canceled. Cancel anytime in Settings."
    }

    // MARK: Actions

    /// Loads the plans (again if forced or if the cached offering is empty), at most ~15 s, then checks trials.
    private func reload(force: Bool) async {
        loaded = false
        diagnostic = nil
        var timedOut = false
        if force || packages.isEmpty {
            timedOut = await withTaskGroup(of: Bool.self) { group in
                group.addTask { @MainActor in await RevenueCatService.shared.load(); return false }
                group.addTask { try? await Task.sleep(for: .seconds(30)); return true }
                let first = await group.next() ?? false
                group.cancelAll()
                return first
            }
        }
        if packages.isEmpty {
            diagnostic = Self.diagnose(timedOut: timedOut, revenueCat: revenueCat) + "\n" + (await Self.storeKitCheck())
            Monitoring.track("paywall_no_packages", ["diagnostic": diagnostic ?? "", "error": revenueCat.errorMessage ?? ""])
        }
        loaded = true
        await checkEligibility()
    }

    /// Asks the App Store directly (StoreKit 2, no RevenueCat) which plan IDs it knows, to tell a store-side problem
    /// from a RevenueCat one.
    private static func storeKitCheck() async -> String {
        let ids = ["com.vaulten.app.premium.monthly", "com.vaulten.app.premium.yearly", "com.vaulten.app.ultimate.monthly",
                   "com.vaulten.app.ultimate.yearly", "com.vaulten.app.premium.yearly.offer25"]
        do {
            let found = Set(try await StoreKit.Product.products(for: ids).map(\.id))
            return "App Store: " + ids.map { "\($0.replacingOccurrences(of: "com.vaulten.app.", with: "")) \(found.contains($0) ? "OK" : "MISSING")" }.joined(separator: ", ")
        } catch {
            return "App Store check failed: \(error.localizedDescription)"
        }
    }

    private static func diagnose(timedOut: Bool, revenueCat: RevenueCatService) -> String {
        if timedOut { return "Timed out after 30 s waiting for the App Store." }
        guard let offerings = revenueCat.offerings else { return "No offerings returned. \(revenueCat.loadErrorDetail ?? "")" }
        guard let current = offerings.current else { return "No current offering (\(offerings.all.count) offerings)." }
        return "Offering \(current.identifier): \(current.availablePackages.count) plans from the App Store. \(revenueCat.loadErrorDetail ?? "")"
    }

    private func checkEligibility() async {
        let all = revenueCat.offerings?.current?.availablePackages.map(\.storeProduct) ?? []
        let withTrial = all.filter { $0.introductoryDiscount?.paymentMode == .freeTrial }
        guard !withTrial.isEmpty else { return }
        let result = await Purchases.shared.checkTrialOrIntroDiscountEligibility(product: withTrial[0])
        // One trial per subscription group: eligibility for one product is eligibility for all of them.
        if result != .ineligible { eligible = Set(withTrial.map(\.productIdentifier)) }
    }

    private func buy() {
        guard let p = selected else { return }
        buying = true
        withAnimation(.snappy) { failure = nil }
        Monitoring.track("paywall_purchase_tapped", ["package": p.identifier, "trial": trial(p) != nil])
        Task { @MainActor in
            let ok = await revenueCat.purchase(p)
            buying = false
            if ok {
                Haptics.notify(.success)
                SFX.success.play()
                Monitoring.track("paywall_purchased", ["package": p.identifier])
                onUnlocked()
            } else if let error = revenueCat.errorMessage {
                Haptics.notify(revenueCat.purchasePending ? .warning : .error)
                SFX.error.play()
                withAnimation(.spring(response: 0.4, dampingFraction: 0.75)) { failure = error }
                withAnimation(.linear(duration: 0.45)) { shakes += 1 }
            }
        }
    }

    private func restore() {
        Task { @MainActor in
            let ok = await revenueCat.restore()
            store.showToast(ok ? "Purchase restored" : "No active subscription found on this Apple ID", ok ? .success : .info)
            if ok { onUnlocked() }
        }
    }
}
