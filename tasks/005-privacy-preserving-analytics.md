# 005: Privacy-Preserving Analytics & API Tracking

## Goal

Track API calls, MCP tool usage, and page views in a privacy-preserving way. Self-host the analytics server on Coolify. No cookies, no Google Analytics, no personal data collection.

## What ENS Domains Uses

- **ens.domains** (landing): Plausible (hosted, `plausible.io`)
- **app.ens.domains** (manager): Plausible + PostHog (EU region) + Intercom
- PostHog tracks wallet-aware events (connect, register, commit) with custom event types
- Plausible handles lightweight page views + outbound link tracking

## Recommendation: Umami

**Umami** is the best fit for this project:

| Criteria | Umami |
|---|---|
| License | MIT — fully open source, no gated features |
| Coolify | One-click template |
| Cookies | None — GDPR-compliant without banners |
| Script size | ~2KB (for frontend) |
| Server-side API | `POST /api/send` — track events from Deno backend |
| Custom events | Yes, with arbitrary properties |
| DB | PostgreSQL |
| RAM | ~500MB |

### Why Umami over Plausible

- MIT vs AGPL — simpler licensing
- Lower resource usage (500MB vs 2GB, no ClickHouse dependency)
- Both have server-side event APIs
- Both have Coolify one-click templates
- Plausible CE lacks advanced bot filtering (cloud-only feature)

### Runner-up: GoatCounter

- Single Go binary + SQLite, ~128MB RAM
- Can parse server access logs (zero code changes)
- But: no custom events — can't track "MCP tool X called with params Y"

## What to Track

### Frontend (JS snippet)
- Page views on `/` and `/about`
- Outbound link clicks (GitHub, 8004scan, ENS)

### Server-side (API events from Deno)
- API calls: `GET /api/availability/:name`, `POST /api/register`
- MCP tool invocations: which tools, success/failure
- x402 payment events: attempted, succeeded, failed
- ENS registration lifecycle: commit, wait, register, success/failure

### Example integration

```typescript
// src/analytics.ts
const UMAMI_URL = Deno.env.get("UMAMI_URL");
const UMAMI_WEBSITE_ID = Deno.env.get("UMAMI_WEBSITE_ID");

export async function trackEvent(name: string, data?: Record<string, string | number>) {
  if (!UMAMI_URL || !UMAMI_WEBSITE_ID) return;
  try {
    await fetch(`${UMAMI_URL}/api/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "ENS-Agent/1.0" },
      body: JSON.stringify({
        type: "event",
        payload: { website: UMAMI_WEBSITE_ID, url: "/api", name, data },
      }),
    });
  } catch { /* fire and forget */ }
}

// Usage:
// trackEvent("ens-register", { name: "example.eth", step: "commit" })
// trackEvent("mcp-tool", { tool: "check-availability", result: "available" })
```

## Implementation Steps

1. Deploy Umami on Coolify (one-click template, PostgreSQL)
2. Create a site in Umami, get the website ID and tracking script
3. Add the JS snippet to `pageShell()` in `src/http.ts` for frontend tracking
4. Create `src/analytics.ts` with a server-side `trackEvent()` helper
5. Instrument API routes (availability check, registration) with `trackEvent()`
6. Instrument MCP tool handlers with `trackEvent()`
7. Add `UMAMI_URL` and `UMAMI_WEBSITE_ID` to `.env` / container env
8. Verify events show up in Umami dashboard

## Alternatives Considered

| Tool | Self-host | Coolify | No cookies | API tracking | Custom events | License | Verdict |
|---|---|---|---|---|---|---|---|
| **Umami** | Easy | Yes | Yes | Yes (REST) | Yes | MIT | **Winner** |
| **Plausible CE** | Easy | Yes | Yes | Yes (Events API) | Yes | AGPL (open core) | Good alternative |
| **GoatCounter** | Very easy | Yes | Yes | Yes (API + logs) | No | EUPL | Too basic |
| **Matomo** | Medium | No template | Configurable | Yes (HTTP API) | Yes | GPL (open core) | Overkill, heavy |
| **PostHog** | Complex | Broken template | Configurable | Yes (full SDKs) | Yes | MIT (open core) | Overkill for this |
| **Shynet** | Easy | No template | Yes | Pixel only | No | Apache-2.0 | Too basic |
| **Ackee** | Medium | No template | Yes | Yes (GraphQL) | Yes | MIT | Needs MongoDB |
| **Fathom Lite** | N/A | No | Uses cookies | No | No | MIT (abandoned) | Dead project |
| **Pirsch** | Not free | No | Yes | Yes (Go lib) | Yes | AGPL (cloud-dep) | Not free self-host |

## Priority

Low — nice-to-have for understanding usage patterns. Can be done anytime after the core agent is stable.
