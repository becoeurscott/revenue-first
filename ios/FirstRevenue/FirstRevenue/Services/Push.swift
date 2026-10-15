import Foundation
import OneSignalFramework

/// Remote push notifications through OneSignal.
///
/// The admin dashboard sends pushes with OneSignal's REST API and targets one user by their Vaulten account id
/// (OneSignal "external id"), or everyone. The app id is public and lives in Monitoring.plist (`OneSignalAppID`);
/// when it is empty, push stays off and nothing else changes. The REST key never ships in the app.
enum Push {
    private(set) static var enabled = false

    /// Posted on the main queue when the user taps a push; `object` is the in-app link (e.g. "/plan/day/7").
    static let openedLink = Notification.Name("Push.openedLink")

    static func start() {
        let config = Bundle.main.url(forResource: "Monitoring", withExtension: "plist")
            .flatMap { NSDictionary(contentsOf: $0) as? [String: Any] } ?? [:]
        let appId = (config["OneSignalAppID"] as? String)?.trimmingCharacters(in: .whitespaces) ?? ""
        guard !appId.isEmpty else { return }
        #if DEBUG
        if ProcessInfo.processInfo.environment["MONITORING_DEBUG"] == "1" { OneSignal.Debug.setLogLevel(.LL_VERBOSE) }
        #endif
        OneSignal.initialize(appId, withLaunchOptions: nil)
        OneSignal.Notifications.addClickListener(ClickHandler.shared)
        enabled = true
    }

    /// Ties this device to the Vaulten account so the admin can push to one user.
    static func identify(userId: String, path: String?) {
        guard enabled else { return }
        OneSignal.login(userId)
        if let path { OneSignal.User.addTag(key: "path", value: path) }
    }

    static func reset() {
        guard enabled else { return }
        OneSignal.logout()
    }

    /// Asks iOS for permission once; afterwards the Settings toggle only opts in or out.
    static func requestPermission() {
        guard enabled else { return }
        OneSignal.Notifications.requestPermission({ accepted in
            Monitoring.track("push_permission", ["accepted": accepted])
        }, fallbackToSettings: false)
    }

    /// The "Push notifications" switch in Settings.
    static func setOptedIn(_ on: Bool) {
        guard enabled else { return }
        if on {
            if OneSignal.Notifications.permission { OneSignal.User.pushSubscription.optIn() } else { requestPermission() }
        } else {
            OneSignal.User.pushSubscription.optOut()
        }
    }

    final class ClickHandler: NSObject, OSNotificationClickListener {
        static let shared = ClickHandler()
        func onClick(event: OSNotificationClickEvent) {
            let n = event.notification
            let link = (n.additionalData?["link"] as? String) ?? "/home"
            let item = OpenedPush(title: n.title ?? "Vaulten", body: n.body ?? "", link: link)
            DispatchQueue.main.async { NotificationCenter.default.post(name: Push.openedLink, object: item) }
            Monitoring.track("push_opened", ["link": link])
        }
    }
}

/// What a tapped push carries into the app (saved to the in-app inbox, then opened).
struct OpenedPush {
    let title: String
    let body: String
    let link: String
}
