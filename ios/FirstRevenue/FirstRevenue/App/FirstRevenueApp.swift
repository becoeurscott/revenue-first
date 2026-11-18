import SwiftUI

@main
struct FirstRevenueApp: App {
    @State private var store = AppStore()
    @State private var revenueCat = RevenueCatService.shared
    @Environment(\.scenePhase) private var scenePhase

    init() {
        Monitoring.start()
        Reminders.start()
        Push.start()
        RevenueCatService.shared.configure()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .environment(revenueCat)
                .preferredColorScheme(store.s.settings.darkMode ? .dark : .light)
                .tint(Theme.brand500)
                // Support messages written offline go out at the next launch.
                .task { await SupportAPI.flushPending(signedIn: store.s.account != nil) }
                // Reminders are planned a week ahead; replan on every return to the app.
                .onChange(of: scenePhase, initial: true) { _, phase in
                    if phase == .active { store.syncReminders(force: true) }
                    BiometricLock.shared.sceneChanged(phase, authed: store.s.authed)
                }
                // A tapped push lands in the inbox and opens its screen.
                .onReceive(NotificationCenter.default.publisher(for: Push.openedLink)) { note in
                    guard let push = note.object as? OpenedPush else { return }
                    store.receivePush(push)
                }
        }
    }
}
