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
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'JetBrains Mono', 'Courier New', monospace; background: #000; color: #00ff41; min-height: 100vh; display: flex; flex-direction: column; align-items: center; }
  .container { max-width: 720px; width: 100%; padding: 40px 20px; }
  h1 { font-size: 2rem; color: #00ff41; text-align: center; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.1em; }
  h2 { font-size: 1.1rem; color: #00ff41; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
  h3 { font-size: 0.95rem; color: #00cc33; margin-bottom: 8px; }
  .subtitle { text-align: center; color: #00cc33; margin-bottom: 40px; font-size: 0.85rem; }
  .field { margin-bottom: 20px; }
  label { display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 6px; color: #00cc33; text-transform: uppercase; letter-spacing: 0.05em; }
  .input-wrap { display: flex; align-items: center; background: #0a0a0a; border: 2px solid #00ff41; overflow: hidden; transition: border-color 0.2s; }
  .input-wrap:focus-within { border-color: #00ff99; box-shadow: 0 0 10px rgba(0,255,65,0.3); }
  input { flex: 1; border: none; outline: none; padding: 14px 16px; font-size: 1rem; background: transparent; color: #00ff41; font-family: 'JetBrains Mono', monospace; }
  input::placeholder { color: #006618; }
  .suffix { padding: 14px 16px 14px 0; color: #00cc33; font-size: 1rem; font-weight: 500; }
  .status { font-size: 0.8rem; margin-top: 6px; min-height: 20px; font-family: 'JetBrains Mono', monospace; }
  .status.available { color: #00ff41; }
  .status.taken { color: #ff0040; }
  .status.error { color: #ff0040; }
  .status.checking { color: #00cc33; }
  .price { font-size: 0.8rem; color: #00cc33; margin-top: 4px; }
  button { width: 100%; padding: 14px; font-size: 1rem; font-weight: 700; border: 2px solid #00ff41; cursor: pointer; transition: all 0.15s; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.1em; }
  button:disabled { opacity: 0.3; cursor: not-allowed; }
  .btn-primary { background: #00ff41; color: #000; }
  .btn-primary:hover:not(:disabled) { background: #000; color: #00ff41; box-shadow: 0 0 20px rgba(0,255,65,0.4); }
  .warning { background: #0a0a0a; border: 2px solid #ffaa00; padding: 12px; font-size: 0.8rem; margin-bottom: 20px; color: #ffaa00; }
  .info { text-align: center; font-size: 0.75rem; color: #006618; margin-top: 24px; }
  .result { background: #0a0a0a; padding: 24px; margin-top: 20px; }
  .result.success { border: 2px solid #00ff41; }
  .result.fail { border: 2px solid #ff0040; }
  .result h2 { font-size: 1.1rem; margin-bottom: 12px; }
  .result p { font-size: 0.85rem; margin-bottom: 8px; color: #00cc33; }
  .result code { background: #111; padding: 2px 6px; font-size: 0.8rem; word-break: break-all; color: #00ff41; border: 1px solid #003300; }
  a { color: #00ff41; text-decoration: none; border-bottom: 1px solid #00ff41; }
  a:hover { color: #00ff99; border-color: #00ff99; }
  .section { border: 2px solid #003300; padding: 24px; margin-bottom: 24px; background: #0a0a0a; }
  .section:hover { border-color: #00ff41; }
  pre { background: #111; border: 1px solid #003300; padding: 16px; overflow-x: auto; font-size: 0.8rem; line-height: 1.6; color: #00cc33; margin: 12px 0; }
  pre .kw { color: #00ff41; }
  pre .str { color: #00ff99; }
  pre .cmt { color: #006618; }
  code { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; }
  .tag { display: inline-block; border: 1px solid #00ff41; padding: 2px 8px; font-size: 0.7rem; text-transform: uppercase; margin-right: 6px; margin-bottom: 4px; }
  .tag.free { border-color: #00cc33; color: #00cc33; }
  .tag.paid { border-color: #ffaa00; color: #ffaa00; }
  .tag.method { border-color: #00ff41; color: #00ff41; }
  .endpoint { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #001a00; }
  .endpoint:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
  .endpoint-path { font-weight: 700; color: #00ff41; font-size: 0.9rem; margin-bottom: 4px; }
  .endpoint-desc { color: #00cc33; font-size: 0.8rem; }
  hr { border: none; border-top: 1px solid #003300; margin: 32px 0; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
  .blink { animation: blink 1s step-end infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  .glow { text-shadow: 0 0 10px rgba(0,255,65,0.5); }
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
  const baseUrl = Deno.env.get("BASE_URL") ?? "";
  return pageShell("ENS Registration Agent", `
  <h1 class="glow">ENS Registration Agent</h1>
  <p class="subtitle">Register .eth names via API &middot; Paid with USDC via <a href="https://x402.org" target="_blank">x402</a></p>

  <!-- AGENT-READABLE DOCUMENTATION -->
  <!-- This service registers ENS (.eth) names on Ethereum mainnet.
       Payment is handled via x402 protocol (USDC on Base).
       Two integration paths: HTTP API (x402) or MCP server (stdio).

       Quick start for agents:
       1. GET /api/availability/{name}.eth  (free, no auth)
       2. GET /api/price/{name}.eth         (free, no auth)
       3. POST /api/register                (x402 paywall, ${SERVICE_FEE} USDC)
          Body: {"name": "example.eth", "owner": "0x..."}
          Payment: x402 protocol auto-negotiates via 402 response header

       Constraints: ${MIN_NAME_LENGTH}+ character names, ${REGISTRATION_YEARS}-year registration, ~65s commit-reveal
       MCP: Connect via stdio transport to use checkAvailability, getRegistrationPrice, registerName tools
  -->

  <div class="section">
    <h2>// What is this?</h2>
    <p style="font-size:0.85rem;line-height:1.6">
      An autonomous ENS registration service. Point your agent at this API,
      pay with USDC via the <a href="https://x402.org" target="_blank">x402 payment protocol</a>,
      and get a .eth name registered on Ethereum mainnet. No wallet connection needed &mdash;
      the service holds an operational wallet and handles the two-step commit-reveal process.
    </p>
  </div>

  <div class="section">
    <h2>// For Agents</h2>
    <p style="font-size:0.8rem;color:#00cc33;margin-bottom:16px">Two integration paths. Pick what fits your stack.</p>

    <div class="grid">
      <div style="border:1px solid #003300;padding:16px">
        <h3>HTTP + x402</h3>
        <p style="font-size:0.75rem;color:#00cc33;margin-bottom:8px">
          Standard REST API. Payment handled automatically via the
          <a href="https://x402.org" target="_blank">x402 protocol</a> &mdash;
          send a request, get a 402 response with payment details,
          pay on Base (USDC), retry with receipt.
        </p>
        <span class="tag">REST</span><span class="tag">x402</span><span class="tag">USDC</span>
      </div>
      <div style="border:1px solid #003300;padding:16px">
        <h3>MCP Server</h3>
        <p style="font-size:0.75rem;color:#00cc33;margin-bottom:8px">
          <a href="https://modelcontextprotocol.io" target="_blank">Model Context Protocol</a> server
          over stdio. Connect directly from Claude, Cursor, or any MCP-compatible client.
          Requires a co-located wallet (PRIVATE_KEY env).
        </p>
        <span class="tag">MCP</span><span class="tag">stdio</span><span class="tag">tools</span>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>// API Endpoints</h2>

    <div class="endpoint">
      <div class="endpoint-path"><span class="tag method">GET</span> /api/availability/:name</div>
      <div class="endpoint-desc">Check if an ENS name is available. <span class="tag free">Free</span></div>
<pre>curl ${baseUrl}/api/availability/example.eth
<span class="cmt">// {"name":"example.eth","available":true}</span></pre>
    </div>

    <div class="endpoint">
      <div class="endpoint-path"><span class="tag method">GET</span> /api/price/:name</div>
      <div class="endpoint-desc">Get registration price in ETH. Optional <code>?years=1</code> param. <span class="tag free">Free</span></div>
<pre>curl ${baseUrl}/api/price/example.eth?years=1
<span class="cmt">// {"name":"example.eth","years":1,"totalEth":"0.003..."}</span></pre>
    </div>

    <div class="endpoint">
      <div class="endpoint-path"><span class="tag method">POST</span> /api/register</div>
      <div class="endpoint-desc">Register an ENS name. <span class="tag paid">${SERVICE_FEE} USDC</span></div>
<pre><span class="cmt"># First request returns 402 with x402 payment details.</span>
<span class="cmt"># Pay via x402, then retry with payment receipt header.</span>
curl -X POST ${baseUrl}/api/register \\
  -H "Content-Type: application/json" \\
  -d '{"name":"example.eth","owner":"0xYourAddress"}'

<span class="cmt"># Response on success:</span>
<span class="cmt">// {"success":true,"name":"example.eth","owner":"0x...",</span>
<span class="cmt">//  "commitTxHash":"0x...","registerTxHash":"0x..."}</span></pre>
    </div>

    <div class="endpoint">
      <div class="endpoint-path"><span class="tag method">GET</span> /api/health</div>
      <div class="endpoint-desc">Health check. <span class="tag free">Free</span></div>
    </div>
  </div>

  <div class="section">
    <h2>// MCP Tools</h2>
    <p style="font-size:0.8rem;color:#00cc33;margin-bottom:12px">
      Available when connected via MCP stdio transport.
    </p>

    <div class="endpoint">
      <div class="endpoint-path">checkAvailability</div>
      <div class="endpoint-desc">Check if an ENS name is available for registration.</div>
      <pre><span class="cmt">params:</span> { name: <span class="str">"example.eth"</span> }</pre>
    </div>

    <div class="endpoint">
      <div class="endpoint-path">getRegistrationPrice</div>
      <div class="endpoint-desc">Get price for registering an ENS name.</div>
      <pre><span class="cmt">params:</span> { name: <span class="str">"example.eth"</span>, years: <span class="str">1</span> }</pre>
    </div>

    <div class="endpoint">
      <div class="endpoint-path">registerName</div>
      <div class="endpoint-desc">Register an ENS name (commit-reveal, ~60s).</div>
      <pre><span class="cmt">params:</span> { name: <span class="str">"example.eth"</span>, years: <span class="str">1</span>, owner: <span class="str">"0x..."</span> }</pre>
    </div>
  </div>

  <div class="section">
    <h2>// x402 Payment Flow</h2>
    <p style="font-size:0.8rem;color:#00cc33;line-height:1.6;margin-bottom:12px">
      The <a href="https://x402.org" target="_blank">x402 protocol</a> enables machine-to-machine payments.
      When you hit a paid endpoint, you get a <code>402 Payment Required</code> response
      with payment details in the headers. Your agent pays on-chain (USDC on Base),
      then retries with the payment receipt.
    </p>
<pre><span class="cmt">// 1. Agent calls POST /api/register</span>
<span class="cmt">// 2. Server returns 402 + x402 payment header</span>
<span class="cmt">// 3. Agent pays ${SERVICE_FEE} USDC on Base (chain ${network})</span>
<span class="cmt">// 4. Agent retries with X-PAYMENT header</span>
<span class="cmt">// 5. Server verifies payment, registers ENS name</span></pre>
    <p style="font-size:0.75rem;color:#006618;margin-top:8px">
      Payment address: <code>${payTo}</code><br>
      Network: <code>${network}</code>${isTestnet ? " (testnet)" : ""}<br>
      Facilitator: <code>${facilitatorUrl}</code>
    </p>
  </div>

  <hr>

  <div class="section">
    <h2>// Register a Name</h2>
    <p style="font-size:0.8rem;color:#00cc33;margin-bottom:16px">Or just use the form. Humans welcome too.</p>

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
      &#9888; Registration takes ~65 seconds (commit-reveal). Do not close the tab after paying.
    </div>

    <button id="register" class="btn-primary" disabled>Register<span class="blink">_</span></button>

    <p class="info">Service fee: ${SERVICE_FEE} USDC &middot; ${MIN_NAME_LENGTH}+ characters &middot; ${REGISTRATION_YEARS} year</p>
  </div>

  <p style="text-align:center;font-size:0.7rem;color:#003300;margin-top:32px">
    Built with <a href="https://x402.org">x402</a> + <a href="https://docs.ens.domains">ENS</a> + <a href="https://modelcontextprotocol.io">MCP</a>
  </p>

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
  <h1 class="glow">Registration Complete</h1>
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
  <h1 style="color:#ff0040">Registration Failed</h1>
  <div class="result fail">
    <p style="color:#ff0040">${message}</p>
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
