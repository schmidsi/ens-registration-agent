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

// Health check (free)
app.get("/", (c) => {
  return c.json({ status: "ok", service: "ens-agent" });
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

// Register ENS name (GET — returns API info after payment)
app.get("/api/register", (c) => {
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
Deno.serve({ port }, app.fetch);
