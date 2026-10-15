# Vaulten Admin

Admin dashboard for the Vaulten iOS app. See `PLAN.md` for the module map and `../docs/api/admin-extensions.md`
for the backend endpoints the real API still has to add (everything else uses `docs/api/vaulten-openapi.json`).

```bash
npm install
npm run mock-api                                   # local upstream on :4310 (admin@vaulten.app / admin1234, MFA 000000)
API_URL=http://127.0.0.1:4310/api/v1 npm run dev   # dashboard on :3010 (also .env.local)
npm run typecheck
```

Against staging: `API_URL=https://api.vaulten-staging.jerseycollection.shop/api/v1 npm run dev` with a staff account.

Note: this repo lives in iCloud Desktop; `node_modules` gets evicted ("dataless") and builds hang.
Copy the folder outside iCloud (e.g. `~/Developer`) or run `brctl download admin/node_modules` before building.

## Real analytics

Overview and Analytics read `app/api/analytics` (server route): accounts and signups from the Vaulten API, engagement
(sessions, events, lessons, missions, funnel, paths, DAU/WAU) from PostHog, which the iOS app reports to. Set on the server:
`POSTHOG_PERSONAL_API_KEY` (a *personal* key, phx_…, created in PostHog → Settings → Personal API keys, scope: query read),
`POSTHOG_PROJECT_ID=659186`, `POSTHOG_HOST=https://us.posthog.com`. Without the key the pages show accounts only and say why.

## Hosted (Vercel)

- Dashboard: https://vaulten-admin.vercel.app (project `vaulten-admin`, redeploy with `vercel deploy --prod` from `admin/`)
- Mock API: https://vaulten-mock-api.vercel.app/api/v1 (project `vaulten-mock-api`, redeploy from `admin/mock-api/`)
- Production `API_URL` points at the real staging API (sign in with a staff account). The hosted mock is only for demos:
  `vercel env rm API_URL production --yes && printf 'https://vaulten-mock-api.vercel.app/api/v1' | vercel env add API_URL production && vercel deploy --prod --yes`
