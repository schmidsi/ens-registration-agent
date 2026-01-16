# x402 HTTP API for ENS Registration Agent

## Overview
Add a paid HTTP API alongside the existing MCP stdio server. The HTTP API uses x402 for payments.

## Key Decisions
- **Facilitator**: Coinbase CDP (simplest, handles verification & compliance)
- **Payment Token**: USDC (EIP-3009 for gasless transfers)
- **Network**: Ethereum Sepolia for testing, mainnet for production
- **ETH payments**: Not directly supported (x402 requires EIP-3009 tokens)

## Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    src/ens/                             │
│   (checkAvailability, getRegistrationPrice, registerName)│
└─────────────────────────────────────────────────────────┘
              ▲                           ▲
              │                           │
┌─────────────┴─────────────┐ ┌──────────┴──────────────┐
│   src/main.ts             │ │   src/http.ts           │
│   MCP stdio server        │ │   Hono HTTP API         │
│   (free, local)           │ │   + x402 payments       │
└───────────────────────────┘ └─────────────────────────┘
```

## New Dependencies
```json
"hono": "npm:hono@4",
"x402-hono": "npm:x402-hono"
```

## Implementation Steps

### Phase 1: Add Hono HTTP Server (no payments yet)
1. Add `hono` to deno.json imports
2. Create `src/http.ts` with basic routes:
   - `GET /api/availability/:name` → checkAvailability
   - `GET /api/price/:name?years=1` → getRegistrationPrice
   - `POST /api/register` → registerName (body: {name, years, owner})
3. Add task: `"http": "deno run --env --allow-net --allow-env --allow-read src/http.ts"`
4. Test locally with curl

### Phase 2: Add x402 Payment Middleware
1. Add `x402-hono` to deno.json imports
2. Configure x402 middleware with:
   - Network: `eip155:11155111` (Sepolia) for testing, `eip155:1` (mainnet) for production
   - Token: USDC (EIP-3009)
   - Receiving address: Your wallet
   - Pricing per endpoint
3. Apply middleware to paid routes

### Phase 3: Test x402 Locally
1. Start HTTP server: `deno task http`
2. Test free endpoint (if any) with curl
3. Test paid endpoint - should return 402 with payment instructions
4. Use x402 client library to make paid request

## x402 Configuration

```typescript
// src/http.ts
import { Hono } from "hono";
import { x402Paywall } from "x402-hono";

const app = new Hono();

// x402 middleware for paid routes
app.use("/api/*", x402Paywall({
  receivingAddress: Deno.env.get("PAYMENT_ADDRESS")!,
  routes: {
    "/api/availability/:name": {
      price: "$0.001",
      network: "eip155:11155111", // Sepolia for testing
      description: "Check ENS name availability"
    },
    "/api/price/:name": {
      price: "$0.001",
      network: "eip155:11155111",
      description: "Get ENS registration price"
    },
    "/api/register": {
      price: "$1.00", // Higher for registration
      network: "eip155:11155111",
      description: "Register ENS name"
    }
  }
}));

// Routes reuse existing ENS logic
app.get("/api/availability/:name", async (c) => {
  const available = await checkAvailability(c.req.param("name"));
  return c.json({ name: c.req.param("name"), available });
});

Deno.serve({ port: 3000 }, app.fetch);
```

## Environment Variables (updated)
```
# ENS config (existing)
NETWORK=sepolia
RPC_URL=https://...
PRIVATE_KEY=0x...

# x402 payment config (new)
PAYMENT_ADDRESS=0x...  # Your wallet to receive USDC payments
PAYMENT_NETWORK=eip155:11155111  # Sepolia for testing
```

## Files to Create/Modify
- `deno.json` - Add hono, x402-hono imports and http task
- `src/http.ts` - New HTTP server with x402 middleware
- `.env.example` - Add payment config vars

## Testing Plan
1. `deno task test` - Existing tests still pass
2. `deno task http` - Start HTTP server on port 3000
3. `curl http://localhost:3000/api/availability/test.eth` - Returns 402
4. Use x402 test client to make paid request

## Deployment (later)
- **Local**: Run with `deno task http`
- **Production**: Fly.io or Railway (handles 65s timeout)
- **NOT recommended**: Deno Deploy (uncertain timeout behavior for 65s registration)

## Resources
- [x402 Documentation](https://x402.gitbook.io/x402)
- [x402-hono npm](https://www.npmjs.com/package/x402-hono)
- [Network IDs](https://x402.gitbook.io/x402/core-concepts/network-and-token-support)
- [Hono](https://hono.dev/)
- [CDP x402 Docs](https://docs.cdp.coinbase.com/x402/welcome)
