# Sign in with Apple and Google

The app shows "Continue with Apple" and "Continue with Google" above the email form on Create account and Log in.
Both are hidden until these endpoints exist (`AuthProviders` in `ios/.../Features/Auth/SocialSignIn.swift`).
Both return the same `AuthSession` as `POST /auth/email/verify` and `POST /auth/login`:
`{ accessToken, refreshToken, user: { id, email, firstName, lastName, role } }`, wrapped in `{ data, meta }`.

Both endpoints are unauthenticated, rate limited like `/auth/login`, and audited.

## POST /auth/apple

Body:

| Field | Type | Notes |
|---|---|---|
| `identityToken` | string | JWT from Apple |
| `authorizationCode` | string? | Single use, valid 5 minutes. Exchange it to get a refresh token, which is needed to revoke on account deletion |
| `nonce` | string | Raw nonce. The token's `nonce` claim is its SHA-256 hex |
| `firstName`, `lastName` | string? | Apple sends the name **only the first time**. Save it then |
| `deviceLabel`, `timeZone` | string | Same as email sign-up |

Server steps:
1. Verify the JWT signature with Apple's keys (`https://appleid.apple.com/auth/keys`, cache them).
   - Check `iss = https://appleid.apple.com`, `aud = com.vaulten.app`, `exp`, and `nonce == sha256(body.nonce)`.
2. Look up the user by `sub` (Apple user ID, stable) in a new `user_identities(provider, subject, userId)` table.
3. If there is no identity but the email matches an existing **verified** account, link it.
   - The email may be a private relay (`…@privaterelay.appleid.com`); still treat it as a real email.
4. Otherwise create the user. The email is already verified by Apple, so no code is needed, and there is no password.
5. Exchange `authorizationCode` at `https://appleid.apple.com/auth/token` and store the Apple refresh token.

Errors:
- 401 `INVALID_IDENTITY_TOKEN`
- 409 `ACCOUNT_DISABLED`
- 422 `EMAIL_MISSING` (no email on the token and no existing identity)

**Account deletion (required by Apple):** when a user deletes their account, call `https://appleid.apple.com/auth/revoke` with the stored refresh token.

**Server-to-server notifications:** set the endpoint in the Apple Developer portal so the server learns when someone stops using Apple sign-in or changes the email-relay setting.

## POST /auth/google

Body: `{ idToken, deviceLabel, timeZone }`

Server steps:
1. Verify the token, either with Google's keys or with a Google client library.
   - Check `iss` is `accounts.google.com` or `https://accounts.google.com`.
   - Check `aud` is the **iOS client ID**, and that `exp` has not passed.
   - Check `email_verified == true`.
2. Look up by `sub` in `user_identities`. Otherwise link to an existing verified account with the same email, or create the user (already verified, no password).

Errors:
- 401 `INVALID_ID_TOKEN`
- 409 `ACCOUNT_DISABLED`
- 422 `EMAIL_NOT_VERIFIED`

## Accounts without a password

- `POST /auth/password/forgot` lets a social-only user set a password.
- `GET /users/me` adds `signInMethods: ["email" | "apple" | "google"]` so Settings can show them.
- Deleting the account removes the identities, and revokes with Apple as described above.

## Turning it on in the app

**Apple**
1. In the Apple Developer portal, go to Identifiers → `com.vaulten.app` and enable **Sign in with Apple**.
2. In Xcode, go to the target → Signing & Capabilities and add **Sign in with Apple**.
   - This adds `com.apple.developer.applesignin = [Default]` to `FirstRevenue.entitlements`.
3. Set `AuthProviders.appleEnabled = true`.

**Google**
1. In Google Cloud Console, create an OAuth client of type **iOS** with bundle ID `com.vaulten.app`. Use its client ID as the backend `aud`.
2. Set `AuthProviders.googleClientID` to that client ID.
3. Add a URL type to Info.plist whose scheme is the reversed client ID (`com.googleusercontent.apps.<id>`).

App Store rule 4.8: an app that offers Google sign-in must also offer Sign in with Apple, so turn Google on only together with Apple.
