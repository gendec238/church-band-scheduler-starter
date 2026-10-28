# Verification record

Prepared 2026-10-28 on Windows with Node 24.20.0 and npm 11.19.0.

## Passed

- `npm install --ignore-scripts`: installed dependencies and generated `package-lock.json`; npm reported zero known vulnerabilities at installation time (not a security guarantee).
- `npm test`: 11 tests passed. Tests cover authentication failing closed, encrypted session expiry/tampering/key rotation, ID validation, monthly/substitute/empty-slot draft behavior, duplicate musicians, paginated GET-only reads, malicious pagination rejection, upstream failures, publishing blocked without network calls, OAuth state and PKCE generation, invalid-state rejection, and mocked expected-church acceptance/wrong-church rejection.
- `npm run typecheck`: passed.
- `npm run lint`: passed. npm warned that the ESLint 9 release line is no longer supported; this build uses the compatible Next.js lint configuration and the lockfile records exact installed versions. Plan a validated lint-tool upgrade during maintenance.
- `npm run build`: production build passed with Next.js 16.4.3. All app/API routes compile; the app page is dynamic.
- `node scripts/smoke.mjs`: production HTTP checks passed for the authenticated page, anonymous page/API/OAuth denial, invalid password, missing OAuth setup, disconnected data access and authenticated/anonymous publish refusal. The restricted sandbox initially could not connect to the loopback server; the approved local execution rerun passed. No provider requests were made.

## Source findings and changes

The inspected upstream homepage was incomplete and ended mid-function. Its server routes hardcoded a single service/team, despite broader README claims. Its availability endpoint returned empty blockout/conflict lists and could label a person available based only on same-plan assignments. Its publish endpoint had no app-level authentication or enforced conflict review.

The isolated starter replaces the incomplete UI with service/team/position selection, monthly drafts and date substitutes. It adds app authentication to every page and API, OAuth with state/PKCE and expected-church verification, encrypted short-lived sessions and safe paginated reads. The live publish handler is replaced with an unconditional refusal. There is no write-capable Services API adapter in this package.

## Not live-verified

- OAuth provider registration, callback acceptance, consent, scopes, token format and identity responses: mocked only; need the friend's own application and approval.
- Real Services service/team/position/person responses and permissions: untested against live church data. Validate with approved read access before relying on the draft.
- Full browser interaction with real data: not performed. Route smoke checks and build do not replace browser acceptance testing.
- Blockouts, cross-service conflicts, existing assignments, eligibility and schedule publication: not implemented; manual review and scheduling required.
- Hosting, HTTPS/proxy settings, rate limiting, secret-manager setup, consent revocation and notifications: no external deployment or live action performed.

Run `node scripts/smoke.mjs` after the production build for local HTTP route checks with fake-only configuration. The smoke server binds only to 127.0.0.1:3107 and does not call Planning Center.
