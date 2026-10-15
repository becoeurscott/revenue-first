import SwiftUI
import RevenueCat

/// The two "don't go yet" offers shown after the paywall is closed. Each is Premium Yearly with a discounted
/// first year (an App Store introductory "pay up front" price), renewing at the normal yearly price.
enum DiscountOffer: String {
    /// After the first close: 25% off.
    case a = "offer_a"
    /// After a later close: 50% off, valid 24 hours from the moment it is first shown.
    case b = "offer_b"

    static let offerBLifetime: TimeInterval = 24 * 60 * 60
}

extension AppStore {
    /// Which offer to show when the paywall is closed now, or nil for none (each is shown once; B expires).
    func discountOfferAfterClose() -> DiscountOffer? {
        guard !isPremium else { return nil }
        if s.offerAShown != true { return .a }
        if let shown = s.offerBShownAt { return Date().timeIntervalSince(shown) < DiscountOffer.offerBLifetime ? .b : nil }
        return .b
    }

    func markOfferShown(_ offer: DiscountOffer) {
        switch offer {
        case .a: s.offerAShown = true
        case .b: if s.offerBShownAt == nil { s.offerBShownAt = Date() }
        }
        Monitoring.track("discount_offer_shown", ["offer": offer.rawValue])
    }
}

struct DiscountOfferView: View {
    let offer: DiscountOffer
    let package: Package
    /// The normal Premium Yearly plan, for the "was" price when the offer is a cheaper product instead of an intro price.
    let regular: StoreProduct?
    let onUnlocked: () -> Void
    let onClose: () -> Void

    @Environment(AppStore.self) private var store
    @State private var buying = false
    @State private var failure: String?
    @State private var shakes: CGFloat = 0
    @State private var legal: AccountLegalDoc?

    private var product: StoreProduct { package.storeProduct }
    private var intro: StoreProductDiscount? { product.introductoryDiscount }
    /// What they pay now: the first-year intro price, or the offer product's own (lower) price.
    private var nowPrice: Decimal { intro?.price ?? product.price }
    private var nowPriceString: String { intro?.localizedPriceString ?? product.localizedPriceString }
    /// The struck-through price: the offer product's full price (intro case) or the regular yearly plan.
    private var wasPriceString: String { intro != nil ? product.localizedPriceString : (regular?.localizedPriceString ?? product.localizedPriceString) }
    private var wasPrice: Decimal { intro != nil ? product.price : (regular?.price ?? product.price) }
    private var percentOff: Int {
        guard wasPrice > 0 else { return offer == .a ? 25 : 50 }
        let saved = 1 - (nowPrice as NSDecimalNumber).doubleValue / (wasPrice as NSDecimalNumber).doubleValue
        return Int((saved * 100).rounded())
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button { Haptics.tap(); onClose() } label: {
                    Image(systemName: "xmark").font(.system(size: 18, weight: .bold)).foregroundStyle(Theme.muted).frame(width: 44, height: 44)
                }
                .accessibilityLabel("Close")
                Spacer()
            }
            .padding(.horizontal, Space.m)

            Spacer(minLength: 0)
            VStack(spacing: Space.l) {
                Text(offer == .b ? "Last chance" : "Special offer")
                    .font(.play(17, .bold)).foregroundStyle(Color(red: 0.95, green: 0.78, blue: 0.35))
                    .padding(.horizontal, 18).padding(.vertical, 8)
                    .overlay(Capsule().strokeBorder(Color(red: 0.95, green: 0.78, blue: 0.35).opacity(0.7), lineWidth: 2))
                    .shadow(color: Color(red: 0.95, green: 0.78, blue: 0.35).opacity(0.4), radius: 10)
                Text("\(percentOff)% OFF")
                    .font(.play(72, .black)).foregroundStyle(Theme.brandGradient)
                    .minimumScaleFactor(0.6).lineLimit(1)
                MascotView(mood: .excited, size: 170, entrance: .celebrate)
                prices
                if offer == .b, let shown = store.s.offerBShownAt { Countdown(until: shown.addingTimeInterval(DiscountOffer.offerBLifetime)) }
            }
            .padding(.horizontal, Space.xl)
            Spacer(minLength: 0)

            VStack(spacing: 8) {
                if let failure {
                    PurchaseErrorCard(message: failure, pending: RevenueCatService.shared.purchasePending) { withAnimation(.snappy) { self.failure = nil } }
                }
                Button { claim() } label: { if buying { ProgressView().tint(.white) } else { Text("Claim Offer") } }
                    .buttonStyle(.chunky())
                    .modifier(Shake(shakes: shakes))
                    .disabled(buying)
                Text(renewal).font(.play(12, .medium)).foregroundStyle(Theme.faint).multilineTextAlignment(.center)
                HStack(spacing: Space.l) {
                    Button("Restore") { restore() }
                    Button("Terms") { legal = .terms }
                    Button("Privacy") { legal = .privacy }
                }
                .font(.play(13, .semibold)).foregroundStyle(Theme.muted).frame(minHeight: 36)
            }
            .padding(.horizontal, Space.xl).padding(.bottom, Space.s)
            .frame(maxWidth: 560)
        }
        .frame(maxWidth: .infinity)
        .background(Theme.bg.ignoresSafeArea())
        .sheet(item: $legal) { AccountLegalSheet(doc: $0) }
        .onAppear { store.markOfferShown(offer) }
        .onChange(of: RevenueCatService.shared.isPro) { _, pro in if pro { onUnlocked() } }
    }

    private var prices: some View {
        VStack(spacing: 4) {
            HStack(spacing: 10) {
                Text(wasPriceString).strikethrough().foregroundStyle(Theme.muted)
                Text("\(nowPriceString)/year").foregroundStyle(Theme.ink)
            }
            .font(.play(30, .heavy))
            Text("Only \(perMonth) per month\(intro != nil ? " for your first year" : "")").font(.play(16, .medium)).foregroundStyle(Theme.muted)
        }
    }

    private var perMonth: String {
        ((nowPrice as NSDecimalNumber).doubleValue / 12).formatted(.currency(code: product.currencyCode ?? "USD"))
    }

    private var renewal: String {
        intro != nil
            ? "\(nowPriceString) for the first year, then \(product.localizedPriceString)/year. Auto-renews until canceled. Cancel anytime in Settings."
            : "\(nowPriceString)/year. Auto-renews until canceled. Cancel anytime in Settings."
    }

    private func claim() {
        buying = true
        withAnimation(.snappy) { failure = nil }
        Monitoring.track("discount_offer_claim_tapped", ["offer": offer.rawValue])
        Task { @MainActor in
            let ok = await RevenueCatService.shared.purchase(package)
            buying = false
            if ok {
                Haptics.notify(.success)
                SFX.success.play()
                Monitoring.track("discount_offer_purchased", ["offer": offer.rawValue])
                onUnlocked()
            } else if let error = RevenueCatService.shared.errorMessage {
                Haptics.notify(RevenueCatService.shared.purchasePending ? .warning : .error)
                SFX.error.play()
                withAnimation(.spring(response: 0.4, dampingFraction: 0.75)) { failure = error }
                withAnimation(.linear(duration: 0.45)) { shakes += 1 }
            }
        }
    }

    private func restore() {
        Task { @MainActor in
            let ok = await RevenueCatService.shared.restore()
            store.showToast(ok ? "Purchase restored" : "No active subscription found on this Apple ID", ok ? .success : .info)
            if ok { onUnlocked() }
        }
    }
}

/// "Offer ends in 23:59:12", ticking every second until the real expiry.
private struct Countdown: View {
    let until: Date
    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let left = max(until.timeIntervalSince(context.date), 0)
            let h = Int(left) / 3600, m = Int(left) % 3600 / 60, s = Int(left) % 60
            Label("Offer ends in \(String(format: "%02d:%02d:%02d", h, m, s))", systemImage: "clock.fill")
                .font(.play(17, .bold)).monospacedDigit()
                .foregroundStyle(Color(red: 0.95, green: 0.78, blue: 0.35))
                .contentTransition(.numericText())
        }
    }
}
