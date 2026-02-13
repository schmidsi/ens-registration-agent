import { Hono } from "hono";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { createPaywall } from "@x402/paywall";
import { evmPaywall } from "@x402/paywall/evm";
import { checkAvailability } from "./ens/availability.ts";
import { getRegistrationPrice } from "./ens/pricing.ts";
import { registerName } from "./ens/registration.ts";
import { formatEther } from "viem";

const app = new Hono();

// Payment configuration
const payTo = Deno.env.get("PAYMENT_ADDRESS");
if (!payTo) {
  throw new Error("PAYMENT_ADDRESS environment variable is required");
}
const network = (Deno.env.get("PAYMENT_NETWORK") ?? "eip155:84532") as `${string}:${string}`; // Base Sepolia by default

// Registration constraints
const isTestnet = network.includes("84532"); // Base Sepolia
const SERVICE_FEE = isTestnet ? "$0.10" : "$6.00"; // Lower fee for testnet
const MIN_NAME_LENGTH = 5; // Minimum characters (excluding .eth)
const REGISTRATION_YEARS = 1; // Fixed to 1 year

// Create facilitator client
// x402.org/facilitator is testnet-only; use open facilitator for mainnet support
const facilitatorUrl = isTestnet
  ? "https://x402.org/facilitator"
  : "https://facilitator.payai.network";
const facilitatorClient = new HTTPFacilitatorClient({
  url: facilitatorUrl,
});

// Create x402 resource server and register EVM scheme
const server = new x402ResourceServer(facilitatorClient).register(
  network,
  new ExactEvmScheme()
);

// Build paywall UI for browser-based payments
const paywall = createPaywall()
  .withNetwork(evmPaywall)
  .withConfig({
    appName: "ENS Registration Agent",
    testnet: isTestnet,
  })
  .build();

// Apply x402 payment middleware
// Note: availability and price endpoints are FREE to encourage usage
// Only registration requires payment (service fee covers ENS cost for 5+ char names)
app.use(
  paymentMiddleware(
    {
      "POST /api/register": {
        accepts: [
          {
            scheme: "exact",
            price: SERVICE_FEE,
            network,
            payTo,
          },
        ],
        description: `Register ENS name (${MIN_NAME_LENGTH}+ chars, ${REGISTRATION_YEARS} year)`,
        mimeType: "application/json",
      },
      "GET /api/register": {
        accepts: [
          {
            scheme: "exact",
            price: SERVICE_FEE,
            network,
            payTo,
          },
        ],
        description: `Register ENS name (${MIN_NAME_LENGTH}+ chars, ${REGISTRATION_YEARS} year)`,
        mimeType: "application/json",
      },
    },
    server,
    undefined,
    paywall,
  )
);

// --- HTML rendering ---

function pageShell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f7f7f8; color: #333; min-height: 100vh; display: flex; flex-direction: column; align-items: center; }
  .container { max-width: 480px; width: 100%; padding: 60px 20px; }
  h1 { font-size: 2rem; color: #5298ff; text-align: center; margin-bottom: 8px; }
  .subtitle { text-align: center; color: #888; margin-bottom: 40px; font-size: 0.95rem; }
  .field { margin-bottom: 20px; }
  label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; color: #555; }
  .input-wrap { display: flex; align-items: center; background: #fff; border: 2px solid #e0e0e0; border-radius: 12px; overflow: hidden; transition: border-color 0.2s; }
  .input-wrap:focus-within { border-color: #5298ff; }
  input { flex: 1; border: none; outline: none; padding: 14px 16px; font-size: 1rem; background: transparent; }
  .suffix { padding: 14px 16px 14px 0; color: #888; font-size: 1rem; font-weight: 500; }
  .status { font-size: 0.85rem; margin-top: 6px; min-height: 20px; }
  .status.available { color: #2ecc40; }
  .status.taken { color: #e74c3c; }
  .status.error { color: #e74c3c; }
  .status.checking { color: #888; }
  .price { font-size: 0.85rem; color: #555; margin-top: 4px; }
  button { width: 100%; padding: 14px; font-size: 1rem; font-weight: 600; border: none; border-radius: 12px; cursor: pointer; transition: background 0.2s, opacity 0.2s; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary { background: #5298ff; color: #fff; }
  .btn-primary:hover:not(:disabled) { background: #3b7de8; }
  .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 12px; font-size: 0.85rem; margin-bottom: 20px; color: #856404; }
  .info { text-align: center; font-size: 0.8rem; color: #aaa; margin-top: 24px; }
  .result { background: #fff; border-radius: 12px; padding: 24px; margin-top: 20px; }
  .result.success { border: 2px solid #2ecc40; }
  .result.fail { border: 2px solid #e74c3c; }
  .result h2 { font-size: 1.2rem; margin-bottom: 12px; }
  .result p { font-size: 0.9rem; margin-bottom: 8px; color: #555; }
  .result code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; word-break: break-all; }
  a { color: #5298ff; }
</style>
</head>
<body>
<div class="container">
${body}
</div>
</body>
</html>`;
}

function renderFrontend(): string {
  return pageShell("ENS Registration", `
  <h1>ENS Registration</h1>
  <p class="subtitle">Register a .eth name, paid with USDC via x402</p>

  <div class="field">
    <label for="name">ENS Name</label>
    <div class="input-wrap">
      <input type="text" id="name" placeholder="myname" autocomplete="off" autofocus>
      <span class="suffix">.eth</span>
    </div>
    <div id="status" class="status"></div>
    <div id="price" class="price"></div>
  </div>

  <div class="field">
    <label for="owner">Owner Address</label>
    <div class="input-wrap">
      <input type="text" id="owner" placeholder="0x...">
    </div>
  </div>

  <div class="warning">
    Registration takes ~65 seconds (commit-reveal). Do not close the tab after paying.
  </div>

  <button id="register" class="btn-primary" disabled>Register</button>

  <p class="info">Service fee: ${SERVICE_FEE} USDC &middot; ${MIN_NAME_LENGTH}+ characters &middot; ${REGISTRATION_YEARS} year</p>

  <script>
    const nameInput = document.getElementById("name");
    const ownerInput = document.getElementById("owner");
    const statusEl = document.getElementById("status");
    const priceEl = document.getElementById("price");
    const btn = document.getElementById("register");
    let debounce = null;
    let nameAvailable = false;

    function updateButton() {
      const label = nameInput.value.trim();
      const owner = ownerInput.value.trim();
      btn.disabled = !(nameAvailable && label.length >= ${MIN_NAME_LENGTH} && /^0x[a-fA-F0-9]{40}$/.test(owner));
    }

    nameInput.addEventListener("input", () => {
      nameAvailable = false;
      updateButton();
      const label = nameInput.value.trim().toLowerCase();
      priceEl.textContent = "";
      if (!label || label.length < ${MIN_NAME_LENGTH}) {
        statusEl.textContent = label ? "Name must be at least ${MIN_NAME_LENGTH} characters" : "";
        statusEl.className = "status error";
        return;
      }
      clearTimeout(debounce);
      statusEl.textContent = "Checking...";
      statusEl.className = "status checking";
      debounce = setTimeout(async () => {
        try {
          const name = label + ".eth";
          const [avail, priceRes] = await Promise.all([
            fetch("/api/availability/" + encodeURIComponent(name)).then(r => r.json()),
            fetch("/api/price/" + encodeURIComponent(name)).then(r => r.json()),
          ]);
          if (nameInput.value.trim().toLowerCase() !== label) return;
          if (avail.error) { statusEl.textContent = avail.error; statusEl.className = "status error"; return; }
          if (avail.available) {
            nameAvailable = true;
            statusEl.textContent = "Available!";
            statusEl.className = "status available";
            if (priceRes.totalEth) priceEl.textContent = "ENS cost: " + priceRes.totalEth + " ETH";
          } else {
            statusEl.textContent = "Taken";
            statusEl.className = "status taken";
          }
        } catch {
          statusEl.textContent = "Error checking availability";
          statusEl.className = "status error";
        }
        updateButton();
      }, 400);
    });

    ownerInput.addEventListener("input", updateButton);

    btn.addEventListener("click", () => {
      const name = nameInput.value.trim().toLowerCase() + ".eth";
      const owner = ownerInput.value.trim();
      window.location.href = "/api/register?name=" + encodeURIComponent(name) + "&owner=" + encodeURIComponent(owner);
    });
  </script>`);
}

function renderSuccess(data: { name: string; owner: string; commitTxHash: string; registerTxHash: string; ensCostEth: string }): string {
  return pageShell("Registration Complete", `
  <h1>Registration Complete</h1>
  <div class="result success">
    <h2>${data.name}</h2>
    <p><strong>Owner:</strong> <code>${data.owner}</code></p>
    <p><strong>Commit TX:</strong> <code>${data.commitTxHash}</code></p>
    <p><strong>Register TX:</strong> <code>${data.registerTxHash}</code></p>
    <p><strong>ENS cost:</strong> ${data.ensCostEth} ETH</p>
  </div>
  <p class="info" style="margin-top:16px"><a href="/">Register another name</a></p>`);
}

function renderError(message: string): string {
  return pageShell("Registration Failed", `
  <h1>Registration Failed</h1>
  <div class="result fail">
    <p>${message}</p>
  </div>
  <p class="info" style="margin-top:16px"><a href="/">Try again</a></p>`);
}

// Health check (free)
app.get("/api/health", (c) => {
  return c.json({ status: "ok", service: "ens-agent" });
});

// Frontend (free)
app.get("/", (c) => {
  return c.html(renderFrontend());
});

// Check ENS name availability
app.get("/api/availability/:name", async (c) => {
  const name = c.req.param("name");
  try {
    const available = await checkAvailability(name);
    return c.json({ name, available });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      400
    );
  }
});

// Get ENS registration price
app.get("/api/price/:name", async (c) => {
  const name = c.req.param("name");
  const yearsParam = c.req.query("years");
  const years = yearsParam ? parseFloat(yearsParam) : 1;

  if (isNaN(years) || years <= 0) {
    return c.json({ error: "Invalid years parameter" }, 400);
  }

  try {
    const price = await getRegistrationPrice(name, years);
    const totalWei = price.base + price.premium;
    return c.json({
      name,
      years,
      baseWei: price.base.toString(),
      premiumWei: price.premium.toString(),
      totalWei: totalWei.toString(),
      totalEth: formatEther(totalWei),
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      400
    );
  }
});

// Helper to extract label from ENS name (removes .eth suffix)
function getLabel(name: string): string {
  return name.toLowerCase().replace(/\.eth$/, "");
}

// Register ENS name (GET — browser flow with query params, or API info)
app.get("/api/register", async (c) => {
  const name = c.req.query("name");
  const owner = c.req.query("owner");
  const wantHtml = (c.req.header("accept") ?? "").includes("text/html");

  // No query params → return API usage info (backward compatible)
  if (!name && !owner) {
    return c.json({
      service: "ens-agent",
      description: `Register ENS name (${MIN_NAME_LENGTH}+ chars, ${REGISTRATION_YEARS} year)`,
      usage: {
        method: "POST",
        url: "/api/register",
        body: { name: "example.eth", owner: "0x..." },
      },
      freeEndpoints: {
        availability: "GET /api/availability/:name",
        price: "GET /api/price/:name?years=1",
      },
    });
  }

  // Validate params
  if (!name) {
    return wantHtml ? c.html(renderError("Name is required."), 400) : c.json({ error: "name query param is required" }, 400);
  }
  if (!owner) {
    return wantHtml ? c.html(renderError("Owner address is required."), 400) : c.json({ error: "owner query param is required" }, 400);
  }

  const label = getLabel(name);
  if (label.length < MIN_NAME_LENGTH) {
    const msg = `Name must be at least ${MIN_NAME_LENGTH} characters (excluding .eth). Got: ${label.length}`;
    return wantHtml ? c.html(renderError(msg), 400) : c.json({ error: msg }, 400);
  }

  // Check availability
  let available: boolean;
  try {
    available = await checkAvailability(name);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return wantHtml ? c.html(renderError(msg), 400) : c.json({ error: msg }, 400);
  }
  if (!available) {
    const msg = "Name is not available.";
    return wantHtml ? c.html(renderError(msg), 400) : c.json({ error: msg }, 400);
  }

  // Get price
  let price: { base: bigint; premium: bigint };
  try {
    price = await getRegistrationPrice(name, REGISTRATION_YEARS);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return wantHtml ? c.html(renderError(msg), 500) : c.json({ error: msg }, 500);
  }
  if (price.premium > 0n) {
    const msg = "Name is in temporary premium period. Please wait for premium to expire.";
    return wantHtml ? c.html(renderError(msg), 400) : c.json({ error: msg }, 400);
  }

  const totalCost = price.base + price.premium;
  const maxPrice = (totalCost * 110n) / 100n;

  try {
    const result = await registerName(name, REGISTRATION_YEARS, owner, maxPrice);
    const data = {
      success: true,
      name: result.name,
      owner: result.owner,
      durationSeconds: result.duration,
      commitTxHash: result.commitTxHash,
      registerTxHash: result.registerTxHash,
      ensCostEth: formatEther(totalCost),
    };
    if (wantHtml) {
      return c.html(renderSuccess({ name: data.name, owner: data.owner, commitTxHash: data.commitTxHash, registerTxHash: data.registerTxHash, ensCostEth: data.ensCostEth }));
    }
    return c.json(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return wantHtml ? c.html(renderError(msg), 500) : c.json({ error: msg }, 500);
  }
});

// Register ENS name (POST — performs registration)
app.post("/api/register", async (c) => {
  let body: { name?: string; owner?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { name, owner } = body;

  if (!name) {
    return c.json({ error: "name is required" }, 400);
  }
  if (!owner) {
    return c.json({ error: "owner is required" }, 400);
  }

  // Validate name length (5+ characters excluding .eth)
  const label = getLabel(name);
  if (label.length < MIN_NAME_LENGTH) {
    return c.json(
      { error: `Name must be at least ${MIN_NAME_LENGTH} characters (excluding .eth). Got: ${label.length}` },
      400
    );
  }

  // Check availability
  const available = await checkAvailability(name);
  if (!available) {
    return c.json({ error: "Name is not available" }, 400);
  }

  // Get price and verify no temporary premium
  const price = await getRegistrationPrice(name, REGISTRATION_YEARS);
  if (price.premium > 0n) {
    return c.json(
      { error: "Name is in temporary premium period. Please wait for premium to expire." },
      400
    );
  }

  // Calculate max price with 10% buffer for minor fluctuations
  // Security: registerName will verify price hasn't increased BEFORE committing
  const totalCost = price.base + price.premium;
  const maxPrice = (totalCost * 110n) / 100n;

  try {
    const result = await registerName(name, REGISTRATION_YEARS, owner, maxPrice);
    return c.json({
      success: true,
      name: result.name,
      owner: result.owner,
      durationSeconds: result.duration,
      commitTxHash: result.commitTxHash,
      registerTxHash: result.registerTxHash,
      ensCostEth: formatEther(totalCost),
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

const port = parseInt(Deno.env.get("PORT") ?? "3000");
console.log(`ENS Agent HTTP server running on http://localhost:${port}`);
console.log(`Payment address: ${payTo}`);
console.log(`Payment network: ${network}${isTestnet ? " (testnet)" : ""}`);
console.log(`Service fee: ${SERVICE_FEE}`);
Deno.serve({ port }, (req) => {
  // Fix request URL protocol behind reverse proxy (Traefik)
  // so x402 payment-required header contains https:// resource URL
  const proto = req.headers.get("x-forwarded-proto");
  if (proto === "https" && req.url.startsWith("http://")) {
    const url = new URL(req.url);
    url.protocol = "https:";
    req = new Request(url.toString(), req);
  }
  return app.fetch(req);
});
