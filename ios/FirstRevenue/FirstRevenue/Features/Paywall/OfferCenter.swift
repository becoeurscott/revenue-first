import SwiftUI
import RevenueCat
import OSLog

private let offerLog = Logger(subsystem: "com.vaulten.app", category: "paywall")

/// A discount ready to present: which offer, the package to buy, and the regular yearly plan to compare with.
struct OfferPresentation: Identifiable {
    let id = UUID()
    let offer: DiscountOffer
    let package: Package
    let regular: StoreProduct?
}

/// Decides when the "gift" popups appear:
/// - 1 second after the paywall is closed (25% the first time, then the last-chance 50%),
/// - or 3 minutes after the 25% offer was closed, if the user is still in the app.
@MainActor
@Observable
final class OfferCenter {
    static let shared = OfferCenter()

    /// The gift popup on screen now (presented by RootView over whatever is on top).
    var current: OfferPresentation?

    @ObservationIgnored private var lastChanceTimer: Task<Void, Never>?
    /// Why the last offer couldn't be shown (for test builds and logs).
    @ObservationIgnored private var lastSkipReason: String?
    private init() {}

    /// The paywall was just closed: show the next gift a second later, back on the screen the user came from.
    func paywallClosed(store: AppStore) {
        lastChanceTimer?.cancel()
        Task { @MainActor in
            guard let next = store.discountOfferAfterClose() else {
                explainSkip(store.isPremium ? "already subscribed" : "both gifts were already shown on this phone", store: store)
                return
            }
            guard let presentation = await resolve(next) else {
                explainSkip(lastSkipReason ?? "unknown", store: store)
                return
            }
            try? await Task.sleep(for: .seconds(1))
            guard !store.isPremium, store.paywallFeature == nil, current == nil else { return }
            current = presentation
        }
    }

    /// TestFlight and Xcode builds say why no gift appeared (App Store builds stay silent).
    private func explainSkip(_ reason: String, store: AppStore) {
        offerLog.notice("gift skipped: \(reason)")
        guard Purchases.isConfigured, Purchases.shared.isSandbox else { return }
        store.showToast("Test build: no gift, \(reason).", .info)
    }

    /// The 25% offer was closed: if the user is still here in 3 minutes, bring the last chance.
    func scheduleLastChance(store: AppStore) {
        lastChanceTimer?.cancel()
        lastChanceTimer = Task { @MainActor in
            try? await Task.sleep(for: .seconds(180))
            guard !Task.isCancelled, !store.isPremium, store.paywallFeature == nil, current == nil,
                  store.discountOfferAfterClose() == .b, let presentation = await resolve(.b) else { return }
            current = presentation
        }
    }

    func cancelTimers() { lastChanceTimer?.cancel() }

    /// The regular Premium Yearly plan the offers are compared with.
    private var regularYearly: StoreProduct? {
        RevenueCatService.shared.offerings?.current?.availablePackages.first { $0.identifier == "$rc_annual" }?.storeProduct
    }

    /// The offer's package, if it is a real discount this user can get; nil otherwise (then nothing is shown).
    private func resolve(_ offer: DiscountOffer) async -> OfferPresentation? {
        let revenueCat = RevenueCatService.shared
        // Offerings can be stale (cached before the offer existed): refresh once if it's missing.
        if revenueCat.offerings?.offering(identifier: offer.rawValue) == nil { await revenueCat.load() }
        guard let package = revenueCat.offerings?.offering(identifier: offer.rawValue)?.availablePackages.first else {
            offerLog.notice("offer \(offer.rawValue) skipped: not configured")
            lastSkipReason = "the \(offer.rawValue) offering didn't load"
            Monitoring.track("discount_offer_skipped", ["offer": offer.rawValue, "reason": "not_configured"])
            return nil
        }
        let product = package.storeProduct
        let regular = regularYearly
        if product.introductoryDiscount != nil {
            // "Unknown" means no purchase history yet (and is what the Test Store returns): that user can get the
            // intro price. Only someone who already used an intro offer is skipped.
            let eligibility = await Purchases.shared.checkTrialOrIntroDiscountEligibility(product: product)
            guard eligibility != .ineligible else {
                lastSkipReason = "this Apple ID already had a trial or subscription, so Apple won't give it an intro price"
                Monitoring.track("discount_offer_skipped", ["offer": offer.rawValue, "reason": "ineligible"])
                return nil
            }
        } else if let regular, product.price < regular.price {
            // Test Store: the offer is a product priced below the regular yearly plan.
        } else {
            offerLog.notice("offer \(offer.rawValue) skipped: no discount")
            lastSkipReason = "the offer has no intro price and isn't cheaper than the yearly plan"
            Monitoring.track("discount_offer_skipped", ["offer": offer.rawValue, "reason": "no_discount"])
            return nil
        }
        return OfferPresentation(offer: offer, package: package, regular: regular)
    }
}

/// The gift popup: Vault holds out a present, it bursts open, then the discount appears.
struct OfferFlowView: View {
    let presentation: OfferPresentation
    @Environment(AppStore.self) private var store

    private enum Stage { case teaser, opening, offer }
    @State private var stage: Stage = .teaser
    @State private var appeared = false
    @State private var wiggle = false
    @State private var burst = false

    private var lastChance: Bool { presentation.offer == .b }

    var body: some View {
        ZStack {
            switch stage {
            case .teaser:
                Color.black.opacity(appeared ? 0.6 : 0).ignoresSafeArea()
                    .onTapGesture { close() }
                teaser
                    .scaleEffect(appeared ? 1 : 0.6)
                    .opacity(appeared ? 1 : 0)
                    .transition(.scale(scale: 1.4).combined(with: .opacity))
            case .opening:
                opening.transition(.opacity)
            case .offer:
                DiscountOfferView(offer: presentation.offer, package: presentation.package, regular: presentation.regular,
                                  onUnlocked: unlocked, onClose: close)
                    .transition(.asymmetric(insertion: .scale(scale: 0.85).combined(with: .opacity), removal: .opacity))
            }
        }
        .onAppear {
            Haptics.notify(.success)
            SFX.giftAppear.play()
            withAnimation(.spring(response: 0.5, dampingFraction: 0.65)) { appeared = true }
            Monitoring.track("gift_teaser_shown", ["offer": presentation.offer.rawValue])
        }
    }

    private var teaser: some View {
        VStack(spacing: Space.l) {
            if lastChance {
                Text("LAST CHANCE").font(.play(14, .black)).tracking(1.5)
                    .foregroundStyle(Color(red: 0.95, green: 0.78, blue: 0.35))
            }
            if MascotClipView.exists("gift-offer") {
                // Vault pulls out the gift and keeps holding it out.
                MascotClipView(clip: "gift-offer", size: 190)
                    .rotationEffect(.degrees(wiggle ? 3 : -3))
            } else {
            ZStack(alignment: .bottomTrailing) {
                MascotView(mood: .excited, size: 150, interactive: false, float: true, entrance: .celebrate)
                Image(systemName: "gift.fill")
                    .font(.system(size: 54, weight: .bold))
                    .foregroundStyle(LinearGradient(colors: [Color(red: 0.98, green: 0.45, blue: 0.55), Theme.brand400], startPoint: .top, endPoint: .bottom))
                    .symbolEffect(.bounce, options: .repeating.speed(0.7), isActive: stage == .teaser)
                    .rotationEffect(.degrees(wiggle ? 12 : -12))
                    .scaleEffect(stage == .opening ? 1.7 : 1)
                    .opacity(stage == .opening ? 0 : 1)
                    .offset(x: 8, y: -6)
            }
            }
            VStack(spacing: 8) {
                Text(lastChance ? "Wait! I saved one more surprise for you." : "Not ready to spend that much?")
                    .font(.play(24, .heavy)).foregroundStyle(Theme.ink).multilineTextAlignment(.center)
                Text(lastChance ? "It's my best one, and it won't come back." : "I got you something!")
                    .font(.play(17, .medium)).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
            }
            Button { open() } label: { Text(lastChance ? "Open It" : "Open My Gift") }
                .buttonStyle(.chunky())
                .disabled(stage == .opening)
            Button("No thanks") { close() }
                .font(.play(15, .semibold)).foregroundStyle(Theme.muted).frame(minHeight: 40)
        }
        .padding(Space.xl)
        .background(RoundedRectangle(cornerRadius: 32, style: .continuous).fill(Theme.bgRaised))
        .overlay(RoundedRectangle(cornerRadius: 32, style: .continuous).strokeBorder(Theme.brand500.opacity(0.4), lineWidth: 2))
        .padding(.horizontal, Space.xl)
        .frame(maxWidth: 480)
    }

    /// Full screen: Vault opens the gift, light bursts, confetti; the discount appears when the clip ends.
    private var opening: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            RadialGradient(colors: [Theme.brand500.opacity(0.55), .clear], center: .center, startRadius: 10, endRadius: 420)
                .ignoresSafeArea()
                .scaleEffect(burst ? 1.2 : 0.3)
                .animation(.easeOut(duration: 1.2), value: burst)
            if MascotClipView.exists("gift-open") {
                MascotClipView(clip: "gift-open", size: 360) { revealOffer() }
            } else {
                MascotView(mood: .excited, size: 260, interactive: false, float: true, entrance: .celebrate)
            }
            ConfettiView(count: 120, sound: false)
            VStack {
                Spacer()
                Text(lastChance ? "Your last surprise…" : "Opening your gift…")
                    .font(.play(22, .heavy)).foregroundStyle(Theme.ink)
                    .padding(.bottom, 60)
            }
        }
        .onAppear { burst = true }
    }

    private func open() {
        Monitoring.track("gift_opened", ["offer": presentation.offer.rawValue])
        Haptics.tap()
        // Wiggle, burst, then the discount.
        Task { @MainActor in
            for _ in 0..<4 {
                withAnimation(.easeInOut(duration: 0.08)) { wiggle.toggle() }
                try? await Task.sleep(for: .milliseconds(90))
            }
            Haptics.notify(.success)
            SFX.giftOpen.play()
            withAnimation(.spring(response: 0.35, dampingFraction: 0.6)) { stage = .opening }
            // With the opening clip, the offer appears when it ends; without it, after a short burst.
            if !MascotClipView.exists("gift-open") {
                try? await Task.sleep(for: .milliseconds(650))
                revealOffer()
            }
        }
    }

    private func revealOffer() {
        guard stage == .opening else { return }
        SFX.reveal.play()
        withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) { stage = .offer }
    }

    private func close() {
        OfferCenter.shared.current = nil
        // After the first gift, the last chance comes back if they're still here in 3 minutes.
        if presentation.offer == .a { OfferCenter.shared.scheduleLastChance(store: store) }
    }

    private func unlocked() {
        OfferCenter.shared.cancelTimers()
        OfferCenter.shared.current = nil
        store.showToast("Welcome to Premium")
    }
}
