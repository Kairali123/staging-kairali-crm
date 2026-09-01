# Phase 6 — Environment Variable Matrix (repo-local)

Date: 2026-08-01
Snapshot: worktree `/Users/kritikakairali/.codex/worktrees/65c6/KairaliCRM_workbook`, HEAD `5110e96`, with the uncommitted Phase 1–3 working tree in place.

## 1. Scope and method

This document inventories **every environment variable referenced in the checked-in source of this repository** — every `process.env.*` access, the one dynamic `process.env[name]` access, and every `NEXT_PUBLIC_*` variable — and records for each one: where it is read, whether it reaches the browser, whether it is required or optional, what happens when it is missing, how sensitive it is, and whether `.env.example` and `README.md` cover it.

Produced by **read-only repo-local inspection only**. No Vercel project, `.env.local`, `.env` file, secret store, password manager, Google Cloud console, or any other external system was accessed. No network calls were made. No application source or behaviour was inspected for change, and none was modified.

### What this document establishes

- The complete set of environment variable **names** referenced in checked-in source.
- Every `file:line` that reads each name, and whether that reference is live or commented out.
- Server-side vs. browser-visible exposure of each name, as determined by which module reads it and whether that module ships to the client.
- Required vs. optional, and the exact **observed** fallback / default / failure behaviour at each site.
- A sensitivity classification (secret / token-like / config / public) argued from what the value is, not from any value seen.
- Coverage against the tracked `.env.example` template and `README.md`.

### What this document does NOT establish

Nothing about **actual values or actual provisioning** is asserted anywhere below. For every variable, all of the following are **pending external verification**:

- Whether the variable is in fact set in any environment (Vercel Production / Preview / Development, or any local `.env.local`).
- What its value is, or whether the value is currently valid.
- Whether the value is **separated per environment** or shared across Production, Preview, and Development.
- Where the value is **stored** (Vercel environment variables, a password manager, a shared document, individual laptops).
- Who **owns** it, who can read it, and who can change it.
- Its **rotation status**, last rotation date, and expiry.

**No secret, credential, key, token, password, connection string, or any other value is reproduced anywhere in this document.** Only variable names and repo-visible non-secret literals (the string `'dummy-key-for-build'`, the integer default `3306`) appear. `.env*` is git-ignored with an allowlist exception for `/.env.example`, and no `.env` file is tracked; no ignored file was opened for this document.

`app/api/calendar/mobile/route.ts` and files under `app/api/meetings/**` are **owner-deferred** (`ECOSYSTEM.md` §10, `docs/REVIEW_CHANGELOG.md` Phase 1 deferred list). They are listed here **only** as reference sites for the inventory to be complete. They were not inspected for change, nothing about mobile authentication or the Meetings wildcard CORS policy is addressed, and no change to either is proposed.

## 2. Legend

### Exposure

| Value | Meaning |
|---|---|
| **server** | Read only in `app/api/**`, `middleware.ts`, a `'use server'` module, or a `lib/` module whose only importers are server-side. The value never reaches the browser from any reference site in this snapshot. |
| **client** | Read in a `"use client"` module. Next.js inlines the value into the browser bundle at build time. |
| **public-by-convention** | Name carries the `NEXT_PUBLIC_` prefix, so Next.js treats it as safe to inline into the client bundle. See §6 — in this snapshot all three such variables are read **only from a server route**, so nothing is currently inlined. |

### Requiredness

| Value | Meaning |
|---|---|
| **required (hard)** | Some code path explicitly throws or returns an error status when the variable is unset. |
| **required (implicit)** | No check exists; the code assumes a value (often via a TypeScript `!` non-null assertion, which is erased at compile time). Missing → a downstream failure that does not name the variable. |
| **optional** | A documented default or fallback chain applies when unset. |
| **framework** | Set by Next.js / the runtime. Never provisioned by hand. |

### Sensitivity class

| Class | Meaning |
|---|---|
| **secret** | Disclosure grants access, incurs cost, or forges identity. Must never appear in a bundle, log, URL, or document. |
| **credential** | Identity half of a credential pair; not secret alone, but names an account. |
| **token-like** | Not a password, but functions as an unguessable capability. Apps Script deployment URLs are in this class: the deployment ID is the only thing standing between a caller and the endpoint (`docs/PHASE_6_APPS_SCRIPT_DEPLOYMENT_MATRIX.md` §1). |
| **config** | Non-secret operational configuration. Disclosure is low-impact but may aid reconnaissance. |

### Coverage

`.env.example` and `README.md` columns record whether the variable **name** appears in the tracked template / the tracked README. Neither contains any real value.

## 3. Master matrix

**25 distinct variables.** 24 are application-provisioned; `NODE_ENV` is framework-set.

| # | Variable | Read in | Exposure | Required? | Fallback / behaviour when unset | Class | `.env.example` | `README` |
|---|---|---|---|---|---|---|---|---|
| 1 | `DB_HOST` | `lib/db.ts:10` (via `requireEnv`) | server | **required (hard)** | `requireEnv` **throws** `"<name> is not set — check .env.local (dev) or Vercel project env vars (prod)."` at module load | config | ✅ | ✅ |
| 2 | `DB_NAME` | `lib/db.ts:12` (via `requireEnv`) | server | **required (hard)** | Same throw | config | ✅ | ✅ |
| 3 | `DB_USER` | `lib/db.ts:13` (via `requireEnv`) | server | **required (hard)** | Same throw | credential | ✅ | ✅ |
| 4 | `DB_PASSWORD` | `lib/db.ts:14` (via `requireEnv`) | server | **required (hard)** | Same throw | **secret** | ✅ | ✅ |
| 5 | `DB_PORT` | `lib/db.ts:11` | server | optional | `Number(process.env.DB_PORT \|\| 3306)` → default **3306**. A non-numeric value yields `NaN` silently (§5.1) | config | ✅ | ✅ |
| 6 | `NEXTAUTH_SECRET` | `lib/session.ts:6`; `app/api/auth/[...nextauth]/route.ts:99` | server | **required (hard)** at `lib/session.ts`; passed through unchecked to NextAuth | `sign()` **throws** `'NEXTAUTH_SECRET is not set'` → every signed-cookie mint/verify fails. NextAuth receives `undefined` | **secret** | ✅ | ❌ |
| 7 | `GAS_SHARED_SECRET` | `app/api/ktahv-bookings/actions/{accounts:33, approval:26, cancellation:26, checkout:28, fo-pms:32, payment:26}/route.ts` | server | **required (hard)** | Each of the six proxies returns **503** with a per-route "… is not configured" message before touching the upstream | **secret** | ✅ | ✅ |
| 8 | `GOOGLE_CLIENT_ID` | `app/api/auth/[...nextauth]/route.ts:32,56`; `app/api/calendar/mobile/route.ts:20` | server | **required (implicit)** (`!`) | No check. `URLSearchParams` stringifies `undefined` → OAuth/refresh fails with a Google-side error that does not name the variable | config | ❌ | ❌ |
| 9 | `GOOGLE_CLIENT_SECRET` | `app/api/auth/[...nextauth]/route.ts:33,57`; `app/api/calendar/mobile/route.ts:21` | server | **required (implicit)** (`!`) | Same as above | **secret** | ❌ | ❌ |
| 10 | `GOOGLE_SERVICE_ACCOUNT_JSON` | `lib/google-drive.ts:72`; `app/api/meetings/create-upload-session/route.ts:9`; `app/api/meetings/audio/route.ts:12`; **commented** `lib/google-drive.ts:6` | server | **required (hard)** at all three live sites | Throws `'GOOGLE_SERVICE_ACCOUNT_JSON is not set in .env'` / `'… not set'`. A malformed value throws from `JSON.parse` instead (§5.2) | **secret** (private key material) | ❌ | ❌ |
| 11 | `GOOGLE_DRIVE_FOLDER_ID` | `lib/google-drive.ts:87`; `app/api/meetings/create-upload-session/route.ts:80`; **commented** `lib/google-drive.ts:23` | server | **split** — required (hard) in `lib/google-drive.ts`, **optional** in `create-upload-session` | `lib/google-drive.ts:88` throws `'GOOGLE_DRIVE_FOLDER_ID is not set in .env'`; `create-upload-session:82` uses `parents: folderId ? [folderId] : []` (§5.3) | token-like | ❌ | ❌ |
| 12 | `ZOOM_CLIENT_ID` | `app/api/zoom/connect/route.ts:6`; `app/api/zoom/callback/route.ts:15` | server | **required (implicit)** (`!`) | No check. Unset → the literal string `undefined` is placed in the Zoom authorize URL / Basic credential | config | ❌ | ❌ |
| 13 | `ZOOM_CLIENT_SECRET` | `app/api/zoom/callback/route.ts:16` | server | **required (implicit)** (`!`) | Same; folded into the Basic auth header | **secret** | ❌ | ❌ |
| 14 | `ZOOM_REDIRECT_URI` | `app/api/zoom/connect/route.ts:7`; `app/api/zoom/callback/route.ts:17` | server | **required (implicit)** (`!`) | Same; must byte-match the value registered in the Zoom app | config | ❌ | ❌ |
| 15 | `OPENAI_API_KEY` | `app/api/meetings/{transcribe:8,538,574, diarize:10, process:9, extract-tasks:129}/route.ts`; **commented** `app/api/meetings/extract-tasks/route.ts:7` | server | **required (implicit)** | Four module-scope client constructions use `\|\| 'dummy-key-for-build'`; two `transcribe` sites interpolate it raw into an `Authorization: Bearer` header (§5.4) | **secret** (billable) | ❌ | ❌ |
| 16 | `GEMINI_API_KEY` | `app/api/generate-followup/route.ts:107` | server | **required (hard)** | Returns **500** with a message that names the variable and instructs the reader to add it to `.env.local` (§5.5) | **secret** (billable) | ❌ | ❌ |
| 17 | `MEASUREMENT_API_TOKEN` | `lib/api-auth.ts:20,45` | server | optional (fail-closed) | Guarded by `expected && …`. Unset → **no bearer request can ever authorize**; callers fall back to the signed session cookie | **token** | ❌ | ❌ |
| 18 | `MEASUREMENT_API_TOKEN_EXPIRES_AT` | `lib/api-auth.ts:21,46` | server | optional (**fail-open**) | Unset **or unparseable** → `notExpired` is `true` → the token never expires (§5.6) | config | ❌ | ❌ |
| 19 | `GAS_URL` | `app/api/b2b-leads/route.ts:3`; `app/api/ktahv-partners/route.ts:3`; `app/api/rejected-partners/route.ts:12` | server | **split** — required (implicit, `!`) in two routes, optional in the third | b2b-leads / ktahv-partners: unset → fetch against the literal `undefined?action=…` → caught, 500-class response. rejected-partners: first link of a fallback chain ending at a checked-in literal (§5.7) | token-like | ❌ | ❌ |
| 20 | `GAS_WRITE_URL` | `app/api/rejected-partners/route.ts:18` | server | optional | Second link of the write fallback chain (§5.7) | token-like | ❌ | ❌ |
| 21 | `GAS_REJECT_URL` | `app/api/rejected-partners/route.ts:17` | server | optional | First link of the write fallback chain (§5.7) | token-like | ❌ | ❌ |
| 22 | `NEXT_PUBLIC_GAS_URL` | `app/api/rejected-partners/route.ts:13` | **public-by-convention**, read server-side only (§6) | optional | Second link of the read fallback chain (§5.7) | token-like / **public** | ❌ | ❌ |
| 23 | `NEXT_PUBLIC_GAS_REJECT_URL` | `app/api/rejected-partners/route.ts:19` | **public-by-convention**, read server-side only (§6) | optional | Third link of the write fallback chain (§5.7) | token-like / **public** | ❌ | ❌ |
| 24 | `NEXT_PUBLIC_GAS_WRITE_URL` | `app/api/rejected-partners/route.ts:20` | **public-by-convention**, read server-side only (§6) | optional | Fourth link of the write fallback chain (§5.7) | token-like / **public** | ❌ | ❌ |
| 25 | `NODE_ENV` | `app/api/auth/login/route.ts:161`; `app/api/auth/logout/route.ts:8`; `app/api/zoom/connect/route.ts:23`; `app/api/zoom/callback/route.ts:71`; **`components/marketing/error-boundary.tsx:68`** | server + **client** | framework | Set by Next.js. Compared against `'production'` to gate the cookie `secure` flag, and against `'development'` to gate an error-detail panel | config | n/a | n/a |

## 4. Per-reference index

**53 reference sites**, of which **50 are live** and **3 are commented out**. Every `process.env` occurrence in checked-in source appears exactly once below.

| Variable | File : line | State | What the reference does |
|---|---|---|---|
| *(dynamic)* | `lib/db.ts:4` | live | `const value = process.env[name]` — the single dynamic access; `name` is supplied only as the four string literals `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` at `:10`, `:12`, `:13`, `:14` |
| `DB_PORT` | `lib/db.ts:11` | live | `Number(process.env.DB_PORT \|\| 3306)` in the pool config |
| `NEXTAUTH_SECRET` | `lib/session.ts:6` | live | HMAC-SHA256 signing key for the `kairali_user` session cookie |
| `NEXTAUTH_SECRET` | `app/api/auth/[...nextauth]/route.ts:99` | live | `secret:` option handed to NextAuth v4 |
| `MEASUREMENT_API_TOKEN` | `lib/api-auth.ts:20` | live | Expected bearer value in `authorizeApiRequest`, compared with `timingSafeEqual` |
| `MEASUREMENT_API_TOKEN` | `lib/api-auth.ts:45` | live | Same, in `unauthorizedResponse`, to distinguish "expired" from "invalid" |
| `MEASUREMENT_API_TOKEN_EXPIRES_AT` | `lib/api-auth.ts:21` | live | ISO cutoff parsed into `expiresAt` |
| `MEASUREMENT_API_TOKEN_EXPIRES_AT` | `lib/api-auth.ts:46` | live | Same, for the expiry-specific 401 message |
| `GAS_SHARED_SECRET` | `app/api/ktahv-bookings/actions/accounts/route.ts:33` | live | Read after session check; 503 if unset; overrides any client-supplied value on the upstream payload |
| `GAS_SHARED_SECRET` | `app/api/ktahv-bookings/actions/approval/route.ts:26` | live | Same pattern |
| `GAS_SHARED_SECRET` | `app/api/ktahv-bookings/actions/cancellation/route.ts:26` | live | Same pattern |
| `GAS_SHARED_SECRET` | `app/api/ktahv-bookings/actions/checkout/route.ts:28` | live | Same pattern |
| `GAS_SHARED_SECRET` | `app/api/ktahv-bookings/actions/fo-pms/route.ts:32` | live | Same pattern |
| `GAS_SHARED_SECRET` | `app/api/ktahv-bookings/actions/payment/route.ts:26` | live | Same pattern |
| `GOOGLE_CLIENT_ID` | `app/api/auth/[...nextauth]/route.ts:32` | live | `refreshAccessToken` body to `oauth2.googleapis.com/token` |
| `GOOGLE_CLIENT_ID` | `app/api/auth/[...nextauth]/route.ts:56` | live | `GoogleProvider({ clientId })` |
| `GOOGLE_CLIENT_ID` | `app/api/calendar/mobile/route.ts:20` | live | Refresh-token exchange. **Owner-deferred route — listed for inventory completeness only** |
| `GOOGLE_CLIENT_SECRET` | `app/api/auth/[...nextauth]/route.ts:33` | live | Same refresh body |
| `GOOGLE_CLIENT_SECRET` | `app/api/auth/[...nextauth]/route.ts:57` | live | `GoogleProvider({ clientSecret })` |
| `GOOGLE_CLIENT_SECRET` | `app/api/calendar/mobile/route.ts:21` | live | **Owner-deferred route — inventory only** |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | `lib/google-drive.ts:72` | live | `getDriveClient()` → `JSON.parse` → `google.auth.GoogleAuth` credentials, `drive` scope |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | `app/api/meetings/audio/route.ts:12` | live | Local `getDriveClient()`, `drive.readonly` scope. **Owner-deferred path — inventory only** |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | `app/api/meetings/create-upload-session/route.ts:9` | live | Parsed to pull `client_email` / `private_key` for a hand-rolled JWT. **Owner-deferred path — inventory only** |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | `lib/google-drive.ts:6` | **commented** | Earlier copy of `getDriveClient` in the leading comment block |
| `GOOGLE_DRIVE_FOLDER_ID` | `lib/google-drive.ts:87` | live | Upload parent; throws if unset |
| `GOOGLE_DRIVE_FOLDER_ID` | `app/api/meetings/create-upload-session/route.ts:80` | live | Optional parent for the resumable session. **Owner-deferred path — inventory only** |
| `GOOGLE_DRIVE_FOLDER_ID` | `lib/google-drive.ts:23` | **commented** | Same leading comment block |
| `ZOOM_CLIENT_ID` | `app/api/zoom/connect/route.ts:6` | live | `client_id` in the Zoom authorize redirect |
| `ZOOM_CLIENT_ID` | `app/api/zoom/callback/route.ts:15` | live | Basic-auth username half of the token exchange |
| `ZOOM_CLIENT_SECRET` | `app/api/zoom/callback/route.ts:16` | live | Basic-auth password half |
| `ZOOM_REDIRECT_URI` | `app/api/zoom/connect/route.ts:7` | live | `redirect_uri` on authorize |
| `ZOOM_REDIRECT_URI` | `app/api/zoom/callback/route.ts:17` | live | `redirect_uri` on token exchange |
| `OPENAI_API_KEY` | `app/api/meetings/transcribe/route.ts:8` | live | Module-scope `new OpenAI({ apiKey: … \|\| 'dummy-key-for-build' })`. **Owner-deferred path — inventory only** |
| `OPENAI_API_KEY` | `app/api/meetings/transcribe/route.ts:538` | live | Raw interpolation into an `Authorization: Bearer` header. **Owner-deferred path — inventory only** |
| `OPENAI_API_KEY` | `app/api/meetings/transcribe/route.ts:574` | live | Second raw `Authorization: Bearer` interpolation. **Owner-deferred path — inventory only** |
| `OPENAI_API_KEY` | `app/api/meetings/diarize/route.ts:10` | live | Module-scope client with the build dummy. **Owner-deferred path — inventory only** |
| `OPENAI_API_KEY` | `app/api/meetings/process/route.ts:9` | live | Client construction with the build dummy. **Owner-deferred path — inventory only** |
| `OPENAI_API_KEY` | `app/api/meetings/extract-tasks/route.ts:129` | live | Module-scope client with the build dummy. **Owner-deferred path — inventory only** |
| `OPENAI_API_KEY` | `app/api/meetings/extract-tasks/route.ts:7` | **commented** | Earlier client construction, no dummy fallback |
| `GEMINI_API_KEY` | `app/api/generate-followup/route.ts:107` | live | Read inside `POST`, explicitly validated (including empty-after-trim) before the `generativelanguage.googleapis.com` call |
| `GAS_URL` | `app/api/b2b-leads/route.ts:3` | live | `process.env.GAS_URL!` at module scope; used as `${GAS_URL}?action=b2b` |
| `GAS_URL` | `app/api/ktahv-partners/route.ts:3` | live | `process.env.GAS_URL!` at module scope; used as `${GAS_URL}?action=travel` |
| `GAS_URL` | `app/api/rejected-partners/route.ts:12` | live | First link of the **read** URL chain |
| `NEXT_PUBLIC_GAS_URL` | `app/api/rejected-partners/route.ts:13` | live | Second link of the read chain |
| `GAS_REJECT_URL` | `app/api/rejected-partners/route.ts:17` | live | First link of the **write** URL chain |
| `GAS_WRITE_URL` | `app/api/rejected-partners/route.ts:18` | live | Second link of the write chain |
| `NEXT_PUBLIC_GAS_REJECT_URL` | `app/api/rejected-partners/route.ts:19` | live | Third link of the write chain |
| `NEXT_PUBLIC_GAS_WRITE_URL` | `app/api/rejected-partners/route.ts:20` | live | Fourth link of the write chain |
| `NODE_ENV` | `app/api/auth/login/route.ts:161` | live | `secure:` flag on the `kairali_user` session cookie |
| `NODE_ENV` | `app/api/auth/logout/route.ts:8` | live | `secure:` flag on the clearing cookie |
| `NODE_ENV` | `app/api/zoom/connect/route.ts:23` | live | `secure:` flag on `zoom_oauth_state` |
| `NODE_ENV` | `app/api/zoom/callback/route.ts:71` | live | `secure:` flag on the Zoom token cookie |
| `NODE_ENV` | `components/marketing/error-boundary.tsx:68` | live | **Only browser-bundled reference in the repo.** `"use client"` file; gates a development-only stack-trace `<details>` panel |

## 5. Fallback, default, and build-time behaviour notes

### 5.1 `DB_PORT` — silent `NaN`

`lib/db.ts:11` is `Number(process.env.DB_PORT || 3306)`. The `||` guards the *unset* case correctly (default 3306), but a set-but-non-numeric value (a stray quote, a trailing comment, a `:` prefix) produces `NaN`, which is passed to `mysql.createPool` without validation. The four `requireEnv` variables around it get an explicit named error; `DB_PORT` does not. Recorded as an observation; no change is proposed here.

### 5.2 Service-account JSON — two different failure shapes

`GOOGLE_SERVICE_ACCOUNT_JSON` is checked for presence at all three live sites and throws a named error when unset. When it is **set but malformed**, the failure instead comes from `JSON.parse` (`lib/google-drive.ts:75`, `app/api/meetings/create-upload-session/route.ts:11`, `app/api/meetings/audio/route.ts:15`) and does not name the variable. `create-upload-session:14` additionally applies `.replace(/\\n/g, '\n')` to `private_key`, i.e. the variable is expected to hold the newline-escaped form — a provisioning detail that is documented nowhere in the repo.

### 5.3 `GOOGLE_DRIVE_FOLDER_ID` — required in one path, optional in the other

The same variable is treated inconsistently:

- `lib/google-drive.ts:87–88` **throws** when it is unset.
- `app/api/meetings/create-upload-session/route.ts:80` reads it and `:83` uses `parents: folderId ? [folderId] : []`, so an unset value silently changes the upload destination to the service account's own Drive root rather than the intended shared folder.

Recorded as an observation. Which folder is intended, and whether the service account's Drive root has ever received uploads, is **pending external verification**.

### 5.4 `OPENAI_API_KEY` — the build-time dummy value

Four live module-scope OpenAI client constructions use the literal fallback `'dummy-key-for-build'`:

`app/api/meetings/transcribe/route.ts:8`, `diarize/route.ts:10`, `process/route.ts:9`, `extract-tasks/route.ts:129`

The `openai` SDK throws at construction time when `apiKey` is undefined. Because these constructions are at **module scope**, that throw would break `next build`, which evaluates the module. The dummy string exists to keep the build green without the real key.

Consequences, all repo-verified:

- A build succeeding proves **nothing** about whether `OPENAI_API_KEY` is provisioned.
- When the key is genuinely missing at runtime, the failure surfaces as an OpenAI-side **401** rather than a configuration error naming the variable.
- The two `transcribe` sites at `:538` and `:574` do **not** use the dummy — they interpolate `process.env.OPENAI_API_KEY` directly into an `Authorization: Bearer` header, so an unset key sends the literal `Bearer undefined`.

This is the only build-time dummy/fallback value pattern in the repository. `rg` finds no other `dummy`, `placeholder`, or `changeme`-style env fallback in checked-in source.

### 5.5 `GEMINI_API_KEY` — the only variable with a first-class runtime check

`app/api/generate-followup/route.ts:107–113` validates presence *and* emptiness-after-trim and returns a 500 whose body names the variable and tells the reader to add it to `.env.local` and restart. This is the clearest missing-config signal in the codebase. It is also the only place a variable name is returned to an HTTP client; the route sits behind the middleware session boundary, so the audience is authenticated users. Recorded as an observation, not a change request.

### 5.6 `MEASUREMENT_API_TOKEN_EXPIRES_AT` — fail-open expiry

`lib/api-auth.ts:22–23`:

```
const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null
const notExpired = !expiresAt || isNaN(expiresAt.getTime()) || Date.now() < expiresAt.getTime()
```

If the variable is unset, **or set to anything `Date` cannot parse**, `notExpired` is `true` and the bearer token never expires. The source comment states the intent — "forcing rotation rather than a silent forever-token" — but that intent holds only when the value is both provisioned and parseable. Since neither is verifiable from this repository, **whether the expiry mechanism is active at all is pending external verification**, and it should be treated as inactive until confirmed.

`MEASUREMENT_API_TOKEN` itself is fail-**closed** in the opposite direction: `expected &&` means an unset token can never authorize anything.

### 5.7 The partner GAS URL chains — env-optional, literal-terminated

`app/api/rejected-partners/route.ts:11–21` defines two chains that both terminate at `DEFAULT_GAS_READ_URL`, a hard-coded Apps Script deployment URL checked in at `:7–8`:

```
GAS_READ_URL  = GAS_URL?.trim() || NEXT_PUBLIC_GAS_URL?.trim() || DEFAULT_GAS_READ_URL

GAS_WRITE_URL = GAS_REJECT_URL?.trim() || GAS_WRITE_URL?.trim()
             || NEXT_PUBLIC_GAS_REJECT_URL?.trim() || NEXT_PUBLIC_GAS_WRITE_URL?.trim()
             || DEFAULT_GAS_READ_URL
```

Each link is `?.trim()` followed by `||`, so a variable set to an empty or whitespace-only string falls through to the next link exactly as if it were unset — there is no way to blank one of these out.

Three repo-verified consequences:

1. **None of these six variables is required.** With all six unset, the route still functions against the checked-in deployment. A missing or misprovisioned variable is therefore invisible — there is no error, only a silent change of destination.
2. **The write chain's final fallback is the *read* deployment URL.** This is deployment ID **#10** in `docs/PHASE_6_APPS_SCRIPT_DEPLOYMENT_MATRIX.md` §3, already recorded there as "also the final fallback for `GAS_WRITE_URL`". Whether that deployment accepts the write payload is script-side and **pending external verification**.
3. `GAS_URL` behaves differently in the other two routes that read it. `app/api/b2b-leads/route.ts:3` and `app/api/ktahv-partners/route.ts:3` use `process.env.GAS_URL!` with **no fallback**, so those two routes are the only places where an unset `GAS_URL` produces a visible failure — a fetch against the string `undefined?action=…`, caught by the surrounding `try`. The same variable is thus optional in one route and effectively required in two others.

### 5.8 TypeScript `!` assertions are not runtime checks

Ten reference sites use the non-null assertion operator: `GOOGLE_CLIENT_ID` (×3), `GOOGLE_CLIENT_SECRET` (×3), `ZOOM_CLIENT_ID` (×2), `ZOOM_CLIENT_SECRET`, `ZOOM_REDIRECT_URI` (×2), `GAS_URL` (×2). The operator is erased at compile time and enforces nothing. Combined with `next.config.mjs` setting `typescript.ignoreBuildErrors: true`, these variables have **no** compile-time or runtime guarantee; an unset value propagates as the string `"undefined"` into an OAuth URL, a Basic credential, or a fetch target.

### 5.9 Build-time vs. runtime reading

`README.md` records that environment variables are read at build **and** runtime and that existing deployments keep old values until redeployed. Repo-verified consequences specific to this codebase:

- **Module-scope reads are frozen per server instance, and evaluated during `next build`.** `lib/db.ts:9–18` (pool config), `lib/api-auth.ts` (per-call, not frozen), `app/api/b2b-leads/route.ts:3`, `app/api/ktahv-partners/route.ts:3`, `app/api/rejected-partners/route.ts:11–21`, and the four OpenAI clients all read at module load. `lib/db.ts` in particular **throws during the build** if a `DB_*` variable is absent from the build environment, not only the runtime environment — which is why the OpenAI dummy fallback exists for the AI routes.
- **`NEXT_PUBLIC_*` values are inlined at build time**, not read at runtime, wherever they are referenced from client code. Changing one requires a rebuild, not just a restart. See §6.
- **`NODE_ENV` in a client component is inlined as a string literal** at build time (`components/marketing/error-boundary.tsx:68`), so the development-only panel is eliminated from a production bundle rather than evaluated in the browser.

## 6. `NEXT_PUBLIC_` variables — browser visibility

Three `NEXT_PUBLIC_*` variables are referenced in checked-in source:

| Variable | Only reference site | Currently inlined into the client bundle? |
|---|---|---|
| `NEXT_PUBLIC_GAS_URL` | `app/api/rejected-partners/route.ts:13` | **No** |
| `NEXT_PUBLIC_GAS_REJECT_URL` | `app/api/rejected-partners/route.ts:19` | **No** |
| `NEXT_PUBLIC_GAS_WRITE_URL` | `app/api/rejected-partners/route.ts:20` | **No** |

Four precise statements, each repo-verified:

1. **All three are read only from a server route.** `rg` over the whole tree finds no other reference. Next.js inlines a `NEXT_PUBLIC_` value into the browser bundle at each **client-side** reference site; with zero such sites, nothing is inlined from these three today.
2. **The prefix still declares them public.** The `NEXT_PUBLIC_` convention is a standing statement that the value is safe to ship to browsers. Anyone adding a single client-component reference — the exact thing the prefix invites — publishes the value in the bundle with no further review step.
3. **The values they would carry are Apps Script deployment URLs**, whose IDs are unguessable capability tokens for endpoints that are in several cases unauthenticated at the script end (`docs/PHASE_6_APPS_SCRIPT_DEPLOYMENT_MATRIX.md` §1, §8). Two of the three (`…REJECT_URL`, `…WRITE_URL`) would name a **write** destination.
4. **The naming and the use disagree.** Three variables named "public" are the fallback configuration for a **server-side write path** in the partner rejection flow. A value provisioned on the assumption it is browser-safe controls where server-side rejection writes go. Recorded as an observation; no change is proposed in this document.

**Whether any of the three is actually set in any environment is pending external verification.** Because the chain in §5.7 terminates at a checked-in literal, the route behaves identically whether they are set or not, so the repository cannot distinguish "unset" from "set to the same value".

### Other browser-visible environment data

`NODE_ENV` at `components/marketing/error-boundary.tsx:68` is the **only** environment reference in a `"use client"` module in this repository. It is inlined as `"production"` or `"development"` and carries no sensitive information.

Every other reference sits in `app/api/**`, `middleware.ts`, an `'use server'` module, or a `lib/` module whose importers are all server-side — verified by tracing importers: `lib/session.ts` is imported only by `middleware.ts` and `lib/api-auth.ts`; `lib/api-auth.ts` only by API routes; `lib/google-drive.ts` only by API routes; `lib/db.ts` only by API routes, `app/villa-bookings/route.ts`, and `app/actions/crmData.ts` (a `'use server'` module). **No secret-class variable is referenced from any client module in this snapshot.**

## 7. Coverage against `.env.example` and `README.md`

### `.env.example` (tracked, placeholders only)

Covers **7 of 25** variables: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `NEXTAUTH_SECRET`, `GAS_SHARED_SECRET`.

The file states in its own header that it is "a template for the database and Phase 1 security variables … not a complete list of application configuration". The gap is therefore **deliberate and disclosed**, not an oversight — but it is still a gap: a new environment provisioned from the template alone will start with 17 application variables unset, and per §5.7 and §5.4 several of those failures are silent.

### `README.md`

Names **6** variables explicitly: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`, `GAS_SHARED_SECRET`. It describes the remainder only by category — "AI providers, Google services, Zoom, measurement, and the Apps Script endpoint" — and repeats the partial-template caveat.

**`NEXTAUTH_SECRET` is in `.env.example` but is not named anywhere in `README.md`**, despite being the signing key for every CRM session cookie and the variable `ECOSYSTEM.md` §5 singles out for per-environment separation.

### Uncovered variables (18)

| Group | Variables |
|---|---|
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Google service account / Drive | `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_DRIVE_FOLDER_ID` |
| Zoom | `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_REDIRECT_URI` |
| AI providers | `OPENAI_API_KEY`, `GEMINI_API_KEY` |
| Measurement API | `MEASUREMENT_API_TOKEN`, `MEASUREMENT_API_TOKEN_EXPIRES_AT` |
| Partner Apps Script (server) | `GAS_URL`, `GAS_WRITE_URL`, `GAS_REJECT_URL` |
| Partner Apps Script (public-by-convention) | `NEXT_PUBLIC_GAS_URL`, `NEXT_PUBLIC_GAS_WRITE_URL`, `NEXT_PUBLIC_GAS_REJECT_URL` |
| Framework | `NODE_ENV` — **not a gap**; set by the runtime and must not be provisioned by hand |

**17 application variables** lack template coverage. `ECOSYSTEM.md` §5 states "Twelve non-`NEXT_PUBLIC` secrets above have no template entry"; the exact figure is **14** non-`NEXT_PUBLIC` variables (the row-grouped table there collapses two pairs). See §9.

## 8. Summary

### Totals

| Measure | Count |
|---|---:|
| **Distinct environment variables referenced in checked-in source** | **25** |
| Application-provisioned (excluding framework-set `NODE_ENV`) | 24 |
| Total `process.env` reference sites | **53** |
| Live reference sites | 50 |
| Commented-out reference sites | 3 |
| Distinct source files reading environment variables | **27** (22 under `app/api/**`, 4 in `lib/`, 1 client component) |
| Dynamic accesses (`process.env[name]`) | 1 (`lib/db.ts:4`, four literal call sites) |

### Coverage

| Measure | Count |
|---|---:|
| Covered by `.env.example` | **7** |
| **Missing from `.env.example`** (application variables) | **17** |
| Named in `README.md` | 6 |
| In `.env.example` but not named in `README.md` | 1 (`NEXTAUTH_SECRET`) |

### Sensitivity classes

| Class | Count | Variables |
|---|---:|---|
| **secret** | **8** | `DB_PASSWORD`, `NEXTAUTH_SECRET`, `GAS_SHARED_SECRET`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `ZOOM_CLIENT_SECRET`, `OPENAI_API_KEY`, `GEMINI_API_KEY` |
| **credential** | 1 | `DB_USER` |
| **token-like** | 7 | `MEASUREMENT_API_TOKEN`, `GAS_URL`, `GAS_WRITE_URL`, `GAS_REJECT_URL`, `NEXT_PUBLIC_GAS_URL`, `NEXT_PUBLIC_GAS_WRITE_URL`, `NEXT_PUBLIC_GAS_REJECT_URL` |
| **config** | 9 | `DB_HOST`, `DB_NAME`, `DB_PORT`, `GOOGLE_CLIENT_ID`, `GOOGLE_DRIVE_FOLDER_ID`, `ZOOM_CLIENT_ID`, `ZOOM_REDIRECT_URI`, `MEASUREMENT_API_TOKEN_EXPIRES_AT`, `NODE_ENV` |

**High-sensitivity set — 9 variables** (8 secret + 1 credential). **None of the nine is referenced from any client module in this snapshot.** Template coverage splits 4 / 5:

| Covered by `.env.example` (4) | **Not covered (5)** |
|---|---|
| `DB_USER`, `DB_PASSWORD`, `NEXTAUTH_SECRET`, `GAS_SHARED_SECRET` | `GOOGLE_CLIENT_SECRET`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `ZOOM_CLIENT_SECRET`, `OPENAI_API_KEY`, `GEMINI_API_KEY` |

The four covered ones are exactly the database and Phase 1 security variables the template was scoped to. The five uncovered ones are the two AI provider keys (billable), the Drive service-account private key material, and the Google and Zoom OAuth client secrets.

### Public variables

| Measure | Count |
|---|---:|
| `NEXT_PUBLIC_*` variables referenced | **3** |
| …that are inlined into the client bundle in this snapshot | **0** (all three are read only from `app/api/rejected-partners/route.ts`) |
| …that would carry an Apps Script **write** destination | 2 |
| Other environment references reaching the browser | 1 (`NODE_ENV`, non-sensitive) |

### Requiredness

| Requiredness | Count | Variables |
|---|---:|---|
| required (hard) | 8 | `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `NEXTAUTH_SECRET`, `GAS_SHARED_SECRET`, `GEMINI_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON` |
| required (implicit — `!` or unguarded) | 6 | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_REDIRECT_URI`, `OPENAI_API_KEY` |
| split (required on one path, optional on another) | 2 | `GOOGLE_DRIVE_FOLDER_ID`, `GAS_URL` |
| optional (default or fallback chain) | 8 | `DB_PORT`, `MEASUREMENT_API_TOKEN`, `MEASUREMENT_API_TOKEN_EXPIRES_AT`, `GAS_WRITE_URL`, `GAS_REJECT_URL`, `NEXT_PUBLIC_GAS_URL`, `NEXT_PUBLIC_GAS_WRITE_URL`, `NEXT_PUBLIC_GAS_REJECT_URL` |
| framework | 1 | `NODE_ENV` |

**14 of 24 application variables fail silently or opaquely when unset** — the 6 implicit-required ones, the 8 optional ones. Only the 8 hard-required variables produce a message that names the missing variable.

### Manual follow-ups

Owner/operations actions. **None can be closed from inside this repository**, and none is a code change proposed by this document.

1. **Confirm actual provisioning.** For all 24 application variables, confirm whether each is set in Vercel Production, Preview, and Development, and in the documented local `.env.local` flow. The repository cannot distinguish "unset" from "set" for any of them.
2. **Confirm per-environment separation**, especially `NEXTAUTH_SECRET` — a value shared between Preview and Production makes a Preview-issued session cookie valid in Production (`ECOSYSTEM.md` §5).
3. **Record a storage location** for every value: Vercel environment variables, a password manager, a shared document, or individual laptops.
4. **Assign an owner** per variable — who can read it, who can change it, and who is accountable for rotating it.
5. **Record rotation status and dates** for the 9 high-sensitivity variables, and confirm the previously committed database credentials were rotated and the old ones are rejected (`README.md`, `docs/REVIEW_CHANGELOG.md`, `ECOSYSTEM.md` §9 items 8–9 — still open).
6. **Set an expiry policy for `MEASUREMENT_API_TOKEN`** and verify `MEASUREMENT_API_TOKEN_EXPIRES_AT` is set to a value `Date` can parse. Per §5.6, an unset or unparseable value silently disables expiry; treat the mechanism as inactive until confirmed.
7. **Decide the fate of the three `NEXT_PUBLIC_GAS_*` variables** (§6): provision them under non-public names, or record deliberately why a public-prefixed variable configures a server-side write path.
8. **Confirm the partner Apps Script destinations.** Per §5.7, `app/api/rejected-partners/route.ts` works identically whether all six GAS URL variables are set or unset, and its write fallback is a read deployment. Confirm which deployment should receive rejection writes and whether the environment currently overrides the literal.
9. **Confirm `GOOGLE_DRIVE_FOLDER_ID` is set in every environment that runs `create-upload-session`** (§5.3), and check whether the service account's own Drive root has received stray uploads.
10. **Confirm `GOOGLE_SERVICE_ACCOUNT_JSON` newline encoding** (§5.2) and record the expected format, since no repo document states it.
11. **Confirm `OPENAI_API_KEY` is provisioned** (§5.4). A green build proves nothing — the dummy fallback makes build success independent of the key.
12. **Provision and enforce `GAS_SHARED_SECRET` end-to-end** — set in every runtime *and* validated by each deployed Apps Script handler. Already open as `ECOSYSTEM.md` §9 item 10 and in the Phase 1 deferred list; the six proxies return 503 until it is set on this side.
13. **Extend `.env.example` to the 17 uncovered application variables, or record deliberately why not** (`ECOSYSTEM.md` §9 item 12). Names and placeholders only.
14. **Add `NEXTAUTH_SECRET` to the README's named variables**, or state why the template covers it and the README does not.
15. **Confirm the Zoom redirect URI registered in the Zoom app** matches `ZOOM_REDIRECT_URI` in each environment, since neither side is verifiable here.
16. **Owner-deferred, listed only for completeness:** the variables read by `app/api/calendar/mobile/route.ts` and `app/api/meetings/**` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_DRIVE_FOLDER_ID`, `OPENAI_API_KEY`) inherit whatever provisioning decision is made for those paths. No change to them is proposed.

## 9. Reconciliation with earlier documents

`ECOSYSTEM.md` §5 lists environment variables in grouped rows. This matrix expands the same source to one row per variable and finds three differences, all counting or attribution, none contradicting a security conclusion:

| Item | `ECOSYSTEM.md` §5 | This matrix | Explanation |
|---|---|---|---|
| Untemplated non-`NEXT_PUBLIC` variables | "Twelve" | **14** | The grouped table collapses `GAS_URL`/`GAS_WRITE_URL`/`GAS_REJECT_URL` into one row and the two `MEASUREMENT_*` variables into another. Counting distinct names gives 14. Adding the three `NEXT_PUBLIC_*` gives **17** uncovered application variables. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` consumers | "NextAuth, calendar, meetings" | `app/api/auth/[...nextauth]/route.ts` and `app/api/calendar/mobile/route.ts` only | No file under `app/api/meetings/**` reads either variable; the meetings paths use `GOOGLE_SERVICE_ACCOUNT_JSON` instead. Within `app/api/calendar/**`, only `mobile/route.ts` reads them. |
| `GAS_URL` / `GAS_WRITE_URL` / `GAS_REJECT_URL` consumers | "partner routes" | `GAS_URL` in 3 routes (`b2b-leads`, `ktahv-partners`, `rejected-partners`); `GAS_WRITE_URL` and `GAS_REJECT_URL` in `rejected-partners` only | Accurate as a grouping, but the three variables have different scopes and different requiredness (§5.7). |

`docs/PHASE_0_DISCOVERY.md:426` lists 18 non-database variable names. That list matches this matrix exactly for the names it covers; it predates the Phase 1 additions (`GAS_SHARED_SECRET`, the `DB_*` set becoming environment-driven) and omits `NODE_ENV`.

`docs/PHASE_6_APPS_SCRIPT_DEPLOYMENT_MATRIX.md` §7 already records the `GAS_URL` / `GAS_WRITE_URL` / `GAS_REJECT_URL` overrides and their literal fallback; §5.7 here is the environment-variable-side view of the same finding, and the two agree.

## 10. How this document was produced

Read-only inspection of the working tree on 2026-08-01:

- `rg -n 'process\.env'` across the tree (excluding `node_modules` and `.next`) to enumerate every reference site with `file:line`; re-run with `-uu` to include hidden files, and cross-checked against `git grep -n 'process\.env'` over tracked files — all three produce **53** occurrences, confirming no reference is hidden by an ignore rule and that the untracked working-tree additions introduce none.
- `rg -o 'NEXT_PUBLIC[A-Za-z0-9_]*'` as an independent sweep for any `NEXT_PUBLIC_` reference in a form other than `process.env.X`, including client code, config, and documentation. Only the three names in §6 appear in source; the remaining hits are in `ECOSYSTEM.md`, `docs/PHASE_0_DISCOVERY.md`, and `docs/PHASE_6_APPS_SCRIPT_DEPLOYMENT_MATRIX.md`.
- A small `node -e` one-liner to group reference sites by variable name and compute the per-variable reference and file counts in §3 and §8.
- `sed -n` context reads around every reference site to establish live-vs-commented state, the surrounding guard or fallback expression, and the observed failure behaviour recorded in §3 and §5.
- Direct reads of `lib/db.ts`, `lib/session.ts`, `lib/api-auth.ts`, `lib/google-drive.ts`, `next.config.mjs`, `package.json`, `.env.example`, `.gitignore`, and `README.md`.
- `rg -l '@/lib/(db|session|api-auth|google-drive)'` plus `head -1` on each env-reading module to trace importers and confirm which modules ship to the browser (§6).
- `rg -n 'NEXTAUTH_URL|AUTH_SECRET|VERCEL_|dotenv'` to check for framework- or platform-implicit variables not accessed through `process.env`. None is referenced in source. NextAuth v4 (`next-auth ^4.24.14`) and the Vercel platform may consult additional variables of their own at runtime; whether any is set is **pending external verification** and none is asserted here.
- `git status --porcelain` to confirm the working tree state and that nothing was staged.

No external system was accessed, no network call was made, no `.env` or otherwise ignored file was opened, no application source was modified, and nothing was staged, committed, or pushed. `/api/calendar/mobile`, `/api/meetings/*`, mobile authentication, and the Meetings wildcard CORS policy were not inspected for change; their environment variable reads are listed in §4 for inventory completeness only.
