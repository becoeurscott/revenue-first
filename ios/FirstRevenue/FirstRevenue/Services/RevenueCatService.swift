import Foundation
import Observation
import RevenueCat

@MainActor
@Observable
final class RevenueCatService {
    static let shared = RevenueCatService()

    static let entitlementID = "vaulten_pro"
    /// Ultimate adds 300 AI Coach messages a month; its products also unlock `vaulten_pro`.
    static let ultimateEntitlementID = "vaulten_ultimate"
    static let yearlyProductID = "yearly"
    static let monthlyProductID = "monthly"

    private static let revenueCatErrorDomain = "RevenueCat.ErrorCode"
    private static let purchaseCancelledErrorCode = 1
    private static let productNotAvailableErrorCode = 5
    private static let receiptAlreadyInUseErrorCode = 7
    private static let networkErrorCode = 10
    private static let paymentPendingErrorCode = 20
    private static let configurationErrorCode = 23

    private(set) var customerInfo: CustomerInfo?
    private(set) var offerings: Offerings?
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    /// The raw error behind the last failed load (code and underlying causes), for diagnostics.
    private(set) var loadErrorDetail: String?
    /// The last purchase is waiting for approval (Ask to Buy, bank confirmation). It unlocks on its own when approved.
    private(set) var purchasePending = false
    @ObservationIgnored private let updates = CustomerInfoListener()

    /// Paid access from the store or from the backend (webhook mirror, complimentary grants from the dashboard).
    var isPro: Bool {
        customerInfo?.entitlements.active.isEmpty == false || backend?.entitlement.active == true
    }

    // MARK: Backend entitlement — GET /subscriptions/me is the source of truth, tiers come from GET /subscriptions/tiers.

    private(set) var backend: BackendSubscription?
    private(set) var tiers: [SubscriptionTier] = []

    /// Whether the user's tier unlocks a capability (e.g. "coach"). Before the tier list loads, any paid access counts.
    func hasFeature(_ key: String) -> Bool {
        guard !tiers.isEmpty else { return isPro }
        let storeActive = Set(customerInfo?.entitlements.active.keys.map { $0 } ?? [])
        let held = Set(backend?.entitlement.tiers ?? []).union(tiers.filter { storeActive.contains($0.revenueCatEntitlementId) }.map(\.key))
        if held.isEmpty { return isPro }
        return tiers.contains { held.contains($0.key) && $0.features.contains(key) }
    }

    /// `sync` asks the backend to re-read RevenueCat first (after a purchase or restore, or to recover a missed webhook).
    func refreshEntitlement(sync: Bool = false) async {
        guard Keychain.load() != nil else { backend = nil; return }
        if tiers.isEmpty, let loaded = try? await VaultenAPI.shared.send("GET", "subscriptions/tiers", as: [SubscriptionTier].self) {
            tiers = loaded
        }
        if let mine = try? await VaultenAPI.shared.send(sync ? "POST" : "GET", sync ? "subscriptions/sync" : "subscriptions/me", as: BackendSubscription.self) {
            backend = mine
        }
    }

    func clearBackendEntitlement() { backend = nil }

    /// "Free plan", or e.g. "Premium · Monthly · Free trial", from the live entitlements.
    var planLabel: String {
        guard isPro || isUltimate else { return "Free plan" }
        let backendTier = backend?.tierKey.flatMap { key in tiers.first { $0.key == key } }
        let entitlement = backendTier.flatMap { customerInfo?.entitlements[$0.revenueCatEntitlementId] }
            ?? customerInfo?.entitlements[isUltimate ? Self.ultimateEntitlementID : Self.entitlementID]
            ?? customerInfo?.entitlements.active.values.first
        let period = entitlement.map { $0.productIdentifier.contains("monthly") ? " · Monthly" : " · Yearly" } ?? ""
        let trial = entitlement?.periodType == .trial ? " · Free trial" : ""
        let name = backendTier?.label ?? (isUltimate ? "Ultimate" : "Premium")
        return name + period + (backend?.entitlement.source == "complimentary" ? " · Complimentary" : trial)
    }

    var isUltimate: Bool {
        customerInfo?.entitlements[Self.ultimateEntitlementID]?.isActive == true
    }

    func update(customerInfo: CustomerInfo) {
        self.customerInfo = customerInfo
        Task { await refreshEntitlement(sync: true) }
    }

    /// Debug builds use RevenueCat's Test Store, so purchases work on the simulator without App Store Connect.
    /// Release builds use the App Store app.
    #if DEBUG
    private static let apiKey = "test_pzbSTYRkhTcfpkUGUDWFQkkhRay"
    #else
    private static let apiKey = "appl_ZWhWeAZAYxtmVzVDBjOXFfsTeCM"
    #endif

    private init() {
        updates.onUpdate = { [weak self] info in
            Task { @MainActor in
                self?.customerInfo = info
                if !info.entitlements.active.isEmpty { self?.purchasePending = false }
            }
        }
    }

    func configure(appUserID: String? = nil) {
        guard !Purchases.isConfigured else { return }
        Purchases.logLevel = .warn
        if let appUserID {
            Purchases.configure(with: Configuration.Builder(withAPIKey: Self.apiKey)
                .with(appUserID: appUserID).build())
        } else {
            Purchases.configure(withAPIKey: Self.apiKey)
        }
        // Renewals, approvals of pending purchases and purchases from other devices arrive here.
        Purchases.shared.delegate = updates
    }

    func identify(appUserID: String) async {
        do {
            let result = try await Purchases.shared.logIn(appUserID)
            customerInfo = result.customerInfo
        } catch {
            errorMessage = userMessage(for: error)
        }
        // RevenueCat already shows a plan (bought on another device, restored, or a promotional grant):
        // ask the API to re-read RevenueCat, or it keeps answering SUBSCRIPTION_REQUIRED until a webhook arrives.
        await refreshEntitlement(sync: isPro || isUltimate)
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        loadErrorDetail = nil
        defer { isLoading = false }
        do {
            async let info = Purchases.shared.customerInfo()
            async let available = Purchases.shared.offerings()
            customerInfo = try await info
            offerings = try await available
        } catch {
            errorMessage = userMessage(for: error)
            loadErrorDetail = "Error \((error as NSError).code): " + ([error.localizedDescription] + Self.underlyingChain(error)).joined(separator: " | ")
            Monitoring.track("revenuecat_load_failed", ["code": (error as NSError).code, "message": errorMessage ?? "", "causes": Self.underlyingChain(error).joined(separator: " | ")])
        }
    }

    func purchase(_ package: Package) async -> Bool {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        purchasePending = false
        do {
            let result = try await Purchases.shared.purchase(package: package)
            customerInfo = result.customerInfo
            await refreshEntitlement(sync: true)
            return isPro
        } catch {
            let code = revenueCatErrorCode(from: error)
            guard code != Self.purchaseCancelledErrorCode else { return false }
            purchasePending = code == Self.paymentPendingErrorCode
            errorMessage = userMessage(for: error)
            Monitoring.track("purchase_failed", [
                "package": package.identifier, "product": package.storeProduct.productIdentifier,
                "code": code ?? -1, "pending": purchasePending,
                "detail": ([error.localizedDescription] + Self.underlyingChain(error)).joined(separator: " | "),
            ])
            return false
        }
    }

    func restore() async -> Bool {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            customerInfo = try await Purchases.shared.restorePurchases()
            await refreshEntitlement(sync: true)
            return isPro
        } catch {
            errorMessage = userMessage(for: error)
            return false
        }
    }

    private func userMessage(for error: Error) -> String {
        guard let code = revenueCatErrorCode(from: error) else {
            return "We couldn't complete that request. Check your connection and try again."
        }

        switch code {
        case Self.purchaseCancelledErrorCode:
            return "Purchase cancelled."
        case Self.productNotAvailableErrorCode:
            return "This plan is not available right now."
        case Self.networkErrorCode:
            return "No connection. Check your internet and try again."
        case Self.receiptAlreadyInUseErrorCode:
            return "This purchase belongs to another account."
        case Self.paymentPendingErrorCode:
            return "Your purchase is waiting for approval. You'll get access as soon as it's confirmed."
        case Self.configurationErrorCode:
            // Configuration errors hide the real cause in the underlying error; show it so it can be fixed.
            return ([error.localizedDescription] + Self.underlyingChain(error)).joined(separator: "\n")
        default:
            return "Payment didn't go through. Check your payment method in Settings > Apple ID, then try again."
        }
    }

    /// The nested causes of an error, outermost first (RevenueCat wraps StoreKit and backend errors).
    static func underlyingChain(_ error: Error) -> [String] {
        var out: [String] = []
        var current = (error as NSError).userInfo[NSUnderlyingErrorKey] as? NSError
        while let e = current, out.count < 4 {
            out.append("\(e.domain) \(e.code): \(e.localizedDescription)")
            current = e.userInfo[NSUnderlyingErrorKey] as? NSError
        }
        return out
    }

    private func isRevenueCatError(_ error: Error, code expectedCode: Int) -> Bool {
        revenueCatErrorCode(from: error) == expectedCode
    }

    private func revenueCatErrorCode(from error: Error) -> Int? {
        let nsError = error as NSError
        guard nsError.domain == Self.revenueCatErrorDomain else { return nil }
        return nsError.code
    }
}

/// Receives customer info pushed by RevenueCat (approved pending purchases, renewals, other devices).
private final class CustomerInfoListener: NSObject, PurchasesDelegate {
    var onUpdate: ((CustomerInfo) -> Void)?
    func purchases(_ purchases: Purchases, receivedUpdated customerInfo: CustomerInfo) { onUpdate?(customerInfo) }
}

struct BackendSubscription: Decodable {
    struct Entitlement: Decodable {
        let active: Bool
        let tiers: [String]
        let source: String?
        let expiresAt: String?
    }
    let entitlement: Entitlement
    let status: String?
    let tierKey: String?
    let expiresAt: String?
    let willRenew: Bool
}

struct SubscriptionTier: Decodable {
    let key: String
    let label: String
    let revenueCatEntitlementId: String
    let displayOrder: Int
    let features: [String]
    let coachMonthlyLimit: Int?
}
