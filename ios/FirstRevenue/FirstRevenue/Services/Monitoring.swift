import Foundation
import PostHog
import Sentry

/// Crash reporting (Sentry) and product analytics (PostHog).
/// Both read public client identifiers from Monitoring.plist; when a value is empty that SDK stays off.
/// Never put secrets here (Sentry auth token, PostHog personal/secret keys) — those belong to the backend.
enum Monitoring {
    private static var analyticsOn = false

    static func start() {
        let config = Bundle.main.url(forResource: "Monitoring", withExtension: "plist")
            .flatMap { NSDictionary(contentsOf: $0) as? [String: Any] } ?? [:]
        let value = { (key: String) in (config[key] as? String)?.trimmingCharacters(in: .whitespaces) ?? "" }
        // Set MONITORING_DEBUG=1 in the scheme's environment to see SDK logs in the console.
        let debugLogs = ProcessInfo.processInfo.environment["MONITORING_DEBUG"] == "1"

        let dsn = value("SentryDSN")
        if !dsn.isEmpty {
            SentrySDK.start { options in
                options.dsn = dsn
                options.debug = debugLogs
                options.sendDefaultPii = false
                options.tracesSampleRate = 0.2
                #if DEBUG
                options.environment = "development"
                #else
                options.environment = "production"
                #endif
            }
        }

        let key = value("PostHogAPIKey")
        if !key.isEmpty {
            let host = value("PostHogHost")
            let posthog = PostHogConfig(apiKey: key, host: host.isEmpty ? "https://us.i.posthog.com" : host)
            posthog.captureApplicationLifecycleEvents = true
            posthog.captureScreenViews = false
            posthog.debug = debugLogs
            PostHogSDK.shared.setup(posthog)
            analyticsOn = true
        }
    }

    /// Links events and crashes to the account id only — never email or name.
    static func identify(userId: String, path: String?) {
        SentrySDK.setUser(User(userId: userId))
        guard analyticsOn else { return }
        PostHogSDK.shared.identify(userId, userProperties: path.map { ["path": $0] })
    }

    static func reset() {
        SentrySDK.setUser(nil)
        if analyticsOn { PostHogSDK.shared.reset() }
    }

    static func track(_ event: String, _ properties: [String: Any] = [:]) {
        guard analyticsOn else { return }
        PostHogSDK.shared.capture(event, properties: properties)
    }
}
