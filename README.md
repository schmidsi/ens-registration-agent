# ENS Registration Agent - MCP Server

An MCP server that exposes ENS registration capabilities to other AI agents, with x402 payment integration for charging callers.

## Decisions Made
- **Tech**: Deno (accept Claude Code Cloud limitation)
- **Network**: Support both mainnet and Sepolia via config
- **Payment model**: Agent charges callers via x402, uses its own ETH for ENS fees
- **First tool**: `checkAvailability` (simplest, read-only)

## Tech Stack
- **Runtime**: Deno 2.x
- **ENS**: `npm:@ensdomains/ensjs` + `npm:viem`
- **MCP**: `npm:@modelcontextprotocol/sdk`
- **x402**: `npm:@x402/hono` (Deno-friendly)
- **Testing**: Deno's built-in test runner

## MVP Tools
1. `checkAvailability(name)` → boolean
2. `getRegistrationPrice(name, durationYears)` → price in ETH
3. `registerName(name, durationYears, ownerAddress)` → tx hash

## Project Structure
```
montevideo/
├── deno.json           # Deno config + imports
├── .env.example        # Required env vars
├── src/
│   ├── main.ts         # MCP server entry point
│   ├── ens/
│   │   ├── client.ts   # ENS client setup
│   │   ├── availability.ts
│   │   ├── pricing.ts
│   │   └── registration.ts
│   └── tools/
│       ├── checkAvailability.ts
│       ├── getPrice.ts
│       └── registerName.ts
└── tests/
    ├── availability.test.ts
    ├── pricing.test.ts
    └── registration.test.ts
```

## Implementation Plan (TDD)

### Phase 1: Project Setup
1. Initialize `deno.json` with dependencies
2. Create `.env.example` with required vars (RPC_URL, PRIVATE_KEY, NETWORK)
3. **Commit**: "chore: initialize Deno project"

### Phase 2: Check Availability Tool
1. Write failing test for `checkAvailability`
2. **Commit**: "test: add failing test for checkAvailability"
3. Implement ENS client setup (`src/ens/client.ts`)
4. Implement `checkAvailability` function
5. **Commit**: "feat: implement checkAvailability"
6. Refactor if needed
7. **Commit**: "refactor: ..." (if applicable)

### Phase 3: MCP Server with First Tool
1. Write failing test for MCP tool registration
2. **Commit**: "test: add failing test for MCP checkAvailability tool"
3. Create MCP server with `checkAvailability` tool
4. **Commit**: "feat: add MCP server with checkAvailability tool"
5. Test manually with Claude Desktop or MCP client

### Phase 4: Get Price Tool (same TDD pattern)
1. Test → Commit
2. Implement → Commit
3. Refactor → Commit

### Phase 5: Register Name Tool (same TDD pattern)
1. Test → Commit
2. Implement commit + wait + register flow → Commit
3. Refactor → Commit

### Phase 6: x402 Integration (later)
- Add payment middleware
- Configure pricing for each tool

## Environment Variables
```
NETWORK=mainnet|sepolia
RPC_URL=https://...
PRIVATE_KEY=0x... (for registration)
```

## Verification
1. Run tests: `deno test`
2. Start server: `deno run --allow-net --allow-env src/main.ts`
3. Test with MCP Inspector or Claude Desktop
4. Verify on-chain results via Etherscan

## Resources
- [Viem Deno compatibility](https://viem.sh/docs/compatibility)
- [MCP with Deno](https://www.shruggingface.com/microblog/2024/12/02/exploring-the-model-context-protocol-with-deno-2-and-playwright)
- [x402 GitHub](https://github.com/coinbase/x402)
- [ensjs docs](https://github.com/ensdomains/ensjs)
