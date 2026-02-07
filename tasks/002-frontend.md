# Frontend for ENS Registration

## Status: ✅ Implemented

## Problem

The x402 paywall UI shows "Payment Required" with wallet connect + pay, but there's no way for users to specify which ENS name to register or provide an owner address.

## Key Insight

The x402 paywall retries requests as **GET to `currentUrl`** (which preserves query params). So we pass `name` and `owner` as query params — no custom wallet integration needed.

## User Flow

1. User visits `/` → sees a simple registration page
2. Types an ENS name → auto-checks availability via `/api/availability/:name`
3. If available → shows price via `/api/price/:name`
4. Enters owner address → clicks "Register"
5. Browser navigates to `GET /api/register?name=foo.eth&owner=0x...`
6. x402 middleware returns 402 → paywall UI shows (wallet connect + pay)
7. User pays $6 USDC on Base → paywall retries same URL with payment header
8. Handler reads query params, performs registration (~65s commit-reveal)
9. Returns success HTML page with tx hashes

## Changes (single file: `src/http.ts`)

### 1. Move health check from `/` to `/api/health`

### 2. Add `GET /` — serve inline HTML frontend

- Clean minimal CSS (no framework, no build step)
- ENS name input with `.eth` suffix
- Debounced availability check (calls free API)
- Price display
- Owner address input
- "Register" button → `window.location.href = /api/register?name=X&owner=Y`

### 3. Modify `GET /api/register` handler

- Read `name` and `owner` from query params
- If present: validate, check availability, register (reuse POST logic)
- If browser (`Accept: text/html`): return success/error HTML page
- If no params: return API usage JSON (backward compatible)

### 4. Keep `POST /api/register` unchanged

For programmatic/agent access via `@x402/fetch`.

## Potential Issues

1. **Long registration (~65s)**: Commit-reveal takes over a minute. The browser fetch won't timeout (default unlimited), and x402 `maxTimeoutSeconds` is 300s. But user might close the tab — show a warning before redirecting.

2. **Registration fails after payment**: Name could be taken between payment and commit. Mitigate by checking availability inside the handler before starting.

3. **Paywall renders JSON as blob URL**: When the paywall gets a JSON response, it creates a blob URL redirect (raw JSON in browser). Solution: detect browser via `Accept` header in the GET handler and return a nice HTML success page instead.

## Verification

1. `deno task http` — server starts
2. Open `http://localhost:3000/` in browser — see registration form
3. Enter a name → availability + price shown
4. Click register → paywall UI appears
5. `curl http://localhost:3000/api/health` → JSON health check still works
6. `curl -X POST http://localhost:3000/api/register` → 402 JSON (agent flow unchanged)
