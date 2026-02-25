/**
 * Privacy-preserving analytics via Umami server-side API.
 * Fire-and-forget — never blocks request handling.
 * No-ops gracefully when env vars are missing.
 */

const UMAMI_URL = Deno.env.get("UMAMI_URL");
const UMAMI_WEBSITE_ID = Deno.env.get("UMAMI_WEBSITE_ID");

const enabled = !!(UMAMI_URL && UMAMI_WEBSITE_ID);

function send(payload: Record<string, unknown>): void {
  if (!enabled) return;
  fetch(`${UMAMI_URL}/api/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "event", payload: { ...payload, website: UMAMI_WEBSITE_ID } }),
  }).catch(() => {});
}

export function trackPageView(url: string, referrer?: string): void {
  send({ url, referrer, hostname: "ens-registration.oskamai.com" });
}

export function trackEvent(name: string, url: string, data?: Record<string, string | number>): void {
  send({ url, hostname: "ens-registration.oskamai.com", name, data });
}
