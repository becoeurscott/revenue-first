import SwiftUI

@main
struct FirstRevenueApp: App {
    @State private var store = AppStore()

    init() { Monitoring.start() }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .preferredColorScheme(store.s.settings.darkMode ? .dark : .light)
                .tint(Theme.brand500)
        }
    }
}
