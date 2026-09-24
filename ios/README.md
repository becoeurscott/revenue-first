# FirstRevenue — native iOS app (SwiftUI)

Native SwiftUI version of the FirstRevenue prototype. **Frontend only, all data fictitious.** No backend, accounts, payments or AI APIs — everything is simulated and saved on the device.

- iOS 18+, iPhone and iPad (tab bar on iPhone, adaptive sidebar on iPad)
- Swift 5 mode, SwiftUI + Observation, Swift Charts. No third-party packages.
- No emoji: every icon is an SF Symbol.

## Run

Open `FirstRevenue/FirstRevenue.xcodeproj` in Xcode and run the **FirstRevenue** scheme on a simulator, or:

```bash
xcodebuild -project ios/FirstRevenue/FirstRevenue.xcodeproj -scheme FirstRevenue -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build
```

**Two ways in:** "I Already Have an Account → Log In" loads the demo user (Alex Carter, Day 7). "Get Started" creates a new account and runs onboarding. Settings → Prototype controls can jump days, simulate offline, change subscription state and reset the demo.

## Structure (`FirstRevenue/FirstRevenue/`)

| Folder | What's in it |
| --- | --- |
| `App/` | App entry, root flow (splash → auth → onboarding → tabs), tab/sidebar navigation, route table |
| `Design/Theme.swift` | Design tokens: colors (dark + light), spacing, radius, type scale, motion |
| `Components/` | Reusable UI: buttons, cards, badges, progress, inputs, toasts, skeletons, confetti, paywall, symbol tiles, domain cards, mock video player |
| `Mascot/` | Penny, the interactive brain mascot (SwiftUI drawing, 8 moods, eye tracking, blink, tap reactions) |
| `Models/` | Codable domain models |
| `Services/` | `MockData` loader, mock engines (path recommendation, pricing, outreach generator, coach), date helpers, haptics |
| `Store/` | `AppStore` (single source of truth, persisted to Application Support), selectors, routes |
| `Features/` | One folder per product area |
| `Resources/Data/mock.json` | All mock data |

## Mock data

`mock.json` is generated from the web prototype's TypeScript data layer, so both apps share one source of truth:

```bash
node scripts/export-data.mjs
```

The export turns every emoji into an SF Symbol name (`icon`). Dates are shifted at load time so relative dates ("2 days ago") stay current.

To connect a real backend, replace `MockData` and the functions in `Services/Engines.swift` with API calls that return the same models, and make the `AppStore` actions call the API.
