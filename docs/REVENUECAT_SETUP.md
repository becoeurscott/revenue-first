# RevenueCat setup for Vaulten

The iOS project is wired to RevenueCat through Swift Package Manager. The package URL is:

`https://github.com/RevenueCat/purchases-ios-spm.git`

The app uses the RevenueCat public test API key and the entitlement `vaulten_pro`.

## RevenueCat dashboard setup

1. Create or open the RevenueCat project for the bundle ID `com.vaulten.app`.
2. Connect the iOS app and configure the App Store Connect credentials required by RevenueCat.
3. Create two App Store Connect auto-renewable subscriptions:
   - Product ID `monthly`
   - Product ID `yearly`
4. In RevenueCat, create the entitlement `vaulten_pro`.
5. Attach both products to `vaulten_pro`.
6. Create an Offering, normally with identifier `default` or mark the desired Offering as Current.
7. Add packages to that Offering:
   - Monthly package → product `monthly`
   - Annual package → product `yearly`
8. Create and publish a RevenueCat Paywall for the Current Offering.
9. Enable Customer Center and configure cancellation, restore, support, and refund behavior.

The app reads Offerings at runtime. Product prices and paywall copy should be changed in RevenueCat and App Store Connect, rather than hardcoded in Swift.

## App behavior

`RevenueCatService` configures the SDK at launch, identifies signed-in Vaulten users with their Vaulten account ID, loads CustomerInfo and Offerings, checks `vaulten_pro`, purchases RevenueCat Packages, restores purchases, and exposes errors suitable for the UI.

The subscription screen shows RevenueCat's native `PaywallView` when `vaulten_pro` is inactive. When it is active, it shows a Customer Center button for subscription management.

## Backend requirements

The backend must treat RevenueCat as the billing source of truth. Do not grant premium access from a client-side boolean or from the selected package name.

Configure a RevenueCat webhook endpoint, for example:

`POST /api/billing/revenuecat/webhook`

Requirements:

- Verify the webhook authorization header or configured signing secret.
- Make processing idempotent using the RevenueCat event ID.
- Store the RevenueCat app user ID, entitlement state, product ID, expiration date, and event type.
- Handle at least `INITIAL_PURCHASE`, `RENEWAL`, `PRODUCT_CHANGE`, `CANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, and `NON_RENEWING_PURCHASE`.
- Revoke `vaulten_pro` on expiration, while preserving the user's progress and account data.
- Treat a RevenueCat `app_user_id` as the Vaulten user ID used by the app after login.
- Provide an authenticated endpoint such as `GET /api/billing/status` for the app or other clients to read the server's current entitlement state.

Recommended record:

```text
user_id
revenuecat_app_user_id
entitlement_id
is_active
product_id
store
expires_at
will_renew
latest_event_id
updated_at
```

The RevenueCat public SDK key can be included in the app. RevenueCat secret API keys and webhook secrets must remain on the backend.

## Testing checklist

- Use a RevenueCat Test Store or App Store sandbox tester.
- Verify a new user sees the Paywall.
- Purchase `monthly`; verify `vaulten_pro` becomes active.
- Purchase `yearly`; verify the entitlement remains active and the product changes correctly.
- Kill and relaunch the app; verify the entitlement is restored from CustomerInfo.
- Sign out and sign in as another Vaulten account; verify RevenueCat identity changes with the account.
- Tap Restore Purchases.
- Open Customer Center and test cancellation or plan management.
- Deliver duplicate webhooks; verify the backend processes each event once.
