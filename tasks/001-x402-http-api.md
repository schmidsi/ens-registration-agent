# x402 HTTP API for ENS Registration Agent

## Status: ✅ Implemented

## Overview
Add a paid HTTP API alongside the existing MCP stdio server. The HTTP API uses x402 for payments.

## Key Decisions
- **Facilitator**: Coinbase CDP (simplest, handles verification & compliance)
- **Payment Token**: USDC (EIP-3009 for gasless transfers)
- **Network**: Base Sepolia (`eip155:84532`) for testing, Ethereum Mainnet (`eip155:1`) for production
- **ETH payments**: Not directly supported (x402 requires EIP-3009 tokens)
- **Pricing**: $6.00 flat fee covers service + ENS registration cost

## Constraints
- **Name length**: 5+ characters only (excluding .eth) - guarantees $5/year tier
- **Duration**: 1 year only
- **No premium names**: Rejects names in temporary premium period
- **Safety limit**: Price verified BEFORE commit with `maxPrice` parameter (prevents TOCTOU attacks)

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

## Dependencies (x402 v2)
```json
"hono": "npm:hono@4",
"@x402/hono": "npm:@x402/hono",
"@x402/evm/exact/server": "npm:@x402/evm/exact/server",
"@x402/core/server": "npm:@x402/core/server"
```

## Implementation

### Endpoints
| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/` | GET | Free | Health check |
| `/api/availability/:name` | GET | Free | Check ENS name availability |
| `/api/price/:name?years=1` | GET | Free | Get registration price |
| `/api/register` | POST | $6.00 | Register ENS name (5+ chars, 1 year) |

> **Note**: The $6.00 fee covers both our service and the on-chain ENS registration cost for 5+ character names.

### Run the HTTP server
```bash
deno task http
```

### Test endpoints
```bash
# Health check (free)
curl http://localhost:3000/

# Free endpoints
curl http://localhost:3000/api/availability/test.eth
curl http://localhost:3000/api/price/test.eth

# Paid endpoint (returns 402 Payment Required)
curl -i -X POST http://localhost:3000/api/register
```

## Environment Variables
```
# ENS config (existing)
NETWORK=sepolia
RPC_URL=https://...
PRIVATE_KEY=0x...

# x402 payment config (new)
PAYMENT_ADDRESS=0x...  # Your wallet to receive USDC payments
PAYMENT_NETWORK=eip155:84532  # Base Sepolia for testing
```

## Files Modified
- `deno.json` - Added hono, x402 imports and http task
- `src/http.ts` - New HTTP server with x402 middleware
- `.env.example` - Added payment config vars

## x402 Response Example
When calling the paid `/api/register` endpoint without payment:
```
HTTP/1.1 402 Payment Required
payment-required: <base64-encoded JSON>
```

Decoded payment-required header:
```json
{
  "x402Version": 2,
  "error": "Payment required",
  "resource": {
    "url": "http://localhost:3000/api/register",
    "description": "Register ENS name (5+ chars, 1 year)",
    "mimeType": "application/json"
  },
  "accepts": [{
    "scheme": "exact",
    "network": "eip155:84532",
    "amount": "6000000",
    "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "payTo": "0x...",
    "maxTimeoutSeconds": 300,
    "extra": { "name": "USDC", "version": "2" }
  }]
}
```

## Deployment (later)
- **Local**: Run with `deno task http`
- **Production**: Fly.io or Railway (handles 65s timeout)
- **NOT recommended**: Deno Deploy (uncertain timeout behavior for 65s registration)

## Resources
- [x402 Documentation](https://docs.cdp.coinbase.com/x402/welcome)
- [Hono](https://hono.dev/)
- [Network Support](https://docs.cdp.coinbase.com/x402/network-support)
