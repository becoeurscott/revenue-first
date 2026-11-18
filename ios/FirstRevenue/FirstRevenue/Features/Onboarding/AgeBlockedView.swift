import SwiftUI

/// Shown instead of the app to someone who said they're under 18. It stays on this phone (logging out or starting
/// over doesn't lift it) and explains why, kindly, with nothing to buy.
struct AgeBlockedView: View {
    @Environment(AppStore.self) private var store
    @State private var legal: AccountLegalDoc?

    private let reasons: [(String, String)] = [
        ("creditcard.fill", "Getting paid needs an adult account. Payment services like PayPal and Stripe, and the platforms you'd sell on, only open accounts at 18."),
        ("signature", "Working with clients means agreements, invoices and taxes that only adults can take on."),
        ("lock.shield.fill", "Vaulten includes paid plans. In-app subscriptions are for adults, and we won't sell them to anyone younger."),
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: Space.l) {
                MascotView(mood: .love, size: 150, interactive: false, float: true)
                    .padding(.top, Space.xl)
                VStack(spacing: Space.s) {
                    Text("Vaulten is for adults").font(.play(30, .heavy)).foregroundStyle(Theme.ink).multilineTextAlignment(.center)
                    Text("You told us you're under 18, so the app isn't available to you yet. Here's why.")
                        .font(.play(17, .medium)).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
                }
                VStack(alignment: .leading, spacing: Space.m) {
                    ForEach(reasons, id: \.1) { icon, text in
                        HStack(alignment: .top, spacing: 12) {
                            Image(systemName: icon).font(.system(size: 16, weight: .bold)).foregroundStyle(Theme.brand300)
                                .frame(width: 36, height: 36)
                                .background(RoundedRectangle(cornerRadius: 11, style: .continuous).fill(Theme.brand500.opacity(0.14)))
                            Text(text).font(.play(15, .medium)).foregroundStyle(Theme.inkSoft).fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                .padding(Space.l)
                .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(Theme.surface))
                Text("Learning about money early is a great idea. Keep going with school projects and skills like writing, design or video, and come back when you're 18. We'd love to have you then.")
                    .font(.play(15, .medium)).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
                if store.s.authed {
                    Button("Log Out") { store.logout() }.buttonStyle(.fr(.secondary, full: true))
                }
                Button("Read our Terms of Use") { legal = .terms }
                    .font(.play(14, .semibold)).foregroundStyle(Theme.brand300).frame(minHeight: 44)
            }
            .frame(maxWidth: 520)
            .padding(.horizontal, Space.xl)
            .padding(.bottom, Space.xl)
            .frame(maxWidth: .infinity)
        }
        .background(Theme.bg.ignoresSafeArea())
        .sheet(item: $legal) { AccountLegalSheet(doc: $0) }
    }
}
