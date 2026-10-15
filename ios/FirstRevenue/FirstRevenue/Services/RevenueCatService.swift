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
    /// The last purchase is waiting for approval (Ask to Buy, bank confirmation). It unlocks on its own when approved.
    private(set) var purchasePending = false
    @ObservationIgnored private let updates = CustomerInfoListener()

    var isPro: Bool {
        customerInfo?.entitlements[Self.entitlementID]?.isActive == true
    }

    /// "Free plan", or e.g. "Premium · Monthly · Free trial", from the live entitlements.
    var planLabel: String {
        guard isPro || isUltimate else { return "Free plan" }
        let entitlement = customerInfo?.entitlements[isUltimate ? Self.ultimateEntitlementID : Self.entitlementID]
        let period = entitlement.map { $0.productIdentifier.contains("monthly") ? " · Monthly" : " · Yearly" } ?? ""
        let trial = entitlement?.periodType == .trial ? " · Free trial" : ""
        return (isUltimate ? "Ultimate" : "Premium") + period + trial
    }

    var isUltimate: Bool {
        customerInfo?.entitlements[Self.ultimateEntitlementID]?.isActive == true
    }

    func update(customerInfo: CustomerInfo) {
        self.customerInfo = customerInfo
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
                if info.entitlements[Self.entitlementID]?.isActive == true { self?.purchasePending = false }
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
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            async let info = Purchases.shared.customerInfo()
            async let available = Purchases.shared.offerings()
            customerInfo = try await info
            offerings = try await available
        } catch {
            errorMessage = userMessage(for: error)
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
