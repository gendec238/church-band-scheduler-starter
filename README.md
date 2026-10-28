# Church Band Scheduler starter

A private, single-church **draft planner** built with Next.js, React and TypeScript. Choose a service type, band team and instrumental positions from your own Planning Center account, assign monthly musicians, choose date-specific substitutes, review, and download a private draft JSON file.

**This is a usable draft-planning starter, not a finished automatic scheduler.** Live publishing is intentionally unavailable: `/api/planning-center/publish` always refuses writes. There is no environment switch that bypasses this. Availability, blockouts, assignments in other services, and musician eligibility are not verified. Review those in Planning Center and schedule manually. It sends no scheduling invitations or notifications.

## What you need

- Your church's own Planning Center account with Services permissions.
- A computer with Node.js 22.13 or newer (Node 24 recommended) and npm.
- An OAuth application you own, a deployment you control, and your church's organization ID.
- A secure password manager and access to your hosting provider's secret settings.

No original church credentials, IDs, people, Git history or deployment settings are included. Keep each church's deployment and secrets separate. This is not a hosted multi-tenant platform.

## 1. Run locally

1. Extract the ZIP into a new folder. Do not merge it into an existing app.
2. Run `npm ci`, then copy `.env.example` to `.env.local`.
3. Set `APP_USERNAME`. Generate a random `APP_PASSWORD` of at least 32 characters using a password manager or the command below. Generate a **different** value for `SESSION_KEY`.
   ```sh
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. Keep secrets in `.env.local` or your host's secret manager. Never paste them in ChatGPT, screenshots, Git, client-side code or a `NEXT_PUBLIC_` variable.
5. Leave `APP_ORIGIN=http://localhost:3000` for local development. Set `CHURCH_NAME` to your own display name.
6. Run `npm run dev`, open `http://localhost:3000`, and enter your app username/password in the browser prompt. The app remains closed if the password is missing or too short.

You can inspect the interface before connecting, but loading real service data requires the next step. No sample people or live credentials are supplied.

## 2. Register and connect OAuth

Follow [Planning Center's official authentication guidance](https://api.planningcenteronline.com/docs/overview/authentication). For an integration distributed across churches, use OAuth, not shared personal access tokens. This source uses a confidential OAuth authorization-code flow with PKCE and state verification.

1. Sign into [your Planning Center developer account](https://api.planningcenteronline.com/) and create your own OAuth application. Review the provider's requirements and grant consent yourself; an assistant should not create credentials or authorize access without your approval.
2. Register the **exact** redirect URI `http://localhost:3000/api/auth/callback` for local use if accepted by the provider. If local HTTP is not supported, use your own approved HTTPS development origin and register its exact callback. Do not use someone else's deployment.
3. Set the server-only `PCO_CLIENT_ID` and `PCO_CLIENT_SECRET` securely. The app requests `services openid`; identity is fetched server-side from `/oauth/userinfo` and checked against `PCO_ORGANIZATION_ID`. It does not trust an unverified ID token.
4. Obtain your church's **organization ID**, not a service/team/person ID, from your administrator/developer account or Planning Center support. Set `PCO_ORGANIZATION_ID` before connecting. Do not disable the church check to resolve a mismatch.
5. Set `PCO_USER_AGENT` to an app name and your contact URL or email, for example `ChurchBandPlanner (https://your-church.example/contact)`, replacing the example with your own real contact. Restart after changing environment variables.
6. Click **Connect / reconnect Planning Center**. Check the church and requested access on the provider's consent screen, then approve only if correct. A wrong church, invalid state, denied consent or failed token exchange cannot create a session.

Access tokens are encrypted in an HttpOnly, SameSite cookie; production requires HTTPS and Secure cookies. Refresh tokens are not retained. Reconnect after one hour or token expiry, whichever comes first. The client secret and tokens are never included in app JSON responses. “Clear connection” removes this browser's token cookie; it does not revoke provider consent. Revoke the application in Planning Center to revoke access completely. Browser Basic authentication may remain cached until the browser closes; rotate `APP_PASSWORD` to end app-password access and `SESSION_KEY` to invalidate encrypted sessions.

## 3. Make a draft

Load service types, select one service and its band team, and check only instrumental positions. Select a month from future plans, choose monthly musicians, then optional substitutes or empty slots. Review before downloading the private JSON draft. The app warns when a musician occupies multiple positions in the same plan.

Drafts are in browser memory only; changing service, team or month clears them. Downloads contain your musicians' names: keep them private. Multiple services can be selected **one at a time**, with independent drafts. There is no simultaneous multi-service conflict check. A position with no returned eligible assignments may show no musicians; verify the team configuration and API permissions. All collection pages are fetched up to 50 pages; exceeding that limit fails instead of presenting partial results.

## 4. Deploy a separate private instance

Choose your own Node-compatible host and new project/repository. Ask for explicit approval before uploading code, creating repositories, provisioning hosting or deploying. Do not connect to the original author's repository or deployment.

- Set all environment variables in the host's secret manager. Use new secrets and an HTTPS `APP_ORIGIN` without a trailing slash.
- Register `https://YOUR-OWN-HOST/api/auth/callback` exactly in your OAuth application's redirect settings. Reconnect on that origin.
- Use `npm ci` and `npm run build`. The bundled `npm start` binds to loopback for use behind an HTTPS reverse proxy. Managed hosts may use their native Next.js runtime; for a container, deliberately configure the required listener without exposing an unprotected HTTP origin.
- Configure host/reverse-proxy request limits against password guessing and preserve Authorization headers. This small starter has one shared administrator password, not individual user roles, per-user revocation, audit logs or built-in distributed rate limiting. For a larger staff team, add a maintained identity provider before opening access widely.
- Disable caching of authenticated responses. Do not log Authorization headers, cookie values, OAuth callback query strings or token bodies. Ensure previews and custom domains are equally protected.
- Verify unauthenticated page and API requests return 401, wrong passwords fail, and publishing returns 403 even with correct credentials.

## Before adding automatic scheduling

Implement and test actual blockouts, same-plan occupancy, cross-service time overlaps, stale draft revalidation, team/person/plan membership, idempotency and partial failure recovery. Add server-side approval tied to the exact reviewed draft and CSRF protection. Preserve an explicit user confirmation immediately before any live publish; clarify possible notifications first. Test with mocks and then an approved test plan. Do not reintroduce the old unsafe publish route or equate missing availability data with availability.

## Validation

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

See `VERIFICATION.md` for what was actually run and what still needs your own accounts. No OAuth grant, real musician request, schedule write, deployment or notification was made while preparing this starter. See `FRIEND-SETUP-PROMPT.txt` for the prompt to paste into your assistant.
