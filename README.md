# ENS Registration Agent - MCP Server
<!-- test change - can be removed -->

An MCP server that exposes ENS registration capabilities to other AI agents.

## Status: MVP Complete

All three core MCP tools are implemented and tested:
- `checkAvailability` - Check if an ENS name is available
- `getRegistrationPrice` - Get the price for registering an ENS name
- `registerName` - Register an ENS name (commit-reveal process)

## Quick Start

### Prerequisites
- [Deno 2.x](https://deno.land/)

### Run Tests
```bash
deno task test
```

### Start MCP Server
```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your RPC_URL and optionally PRIVATE_KEY

# Start the server
deno task dev
```

### Configure with Claude Desktop
Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ens-agent": {
      "command": "deno",
      "args": ["run", "--allow-net", "--allow-env", "--allow-read", "/path/to/montevideo/src/main.ts"],
      "env": {
        "NETWORK": "mainnet",
        "RPC_URL": "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
      }
    }
  }
}
```

## MCP Tools

### checkAvailability
Check if an ENS name is available for registration.

**Input:**
- `name` (string): ENS name (must end with .eth)

**Output:**
```json
{ "name": "example.eth", "available": true }
```

### getRegistrationPrice
Get the price for registering an ENS name.

**Input:**
- `name` (string): ENS name (must end with .eth)
- `years` (number, default: 1): Registration duration

**Output:**
```json
{
  "name": "example.eth",
  "years": 1,
  "baseWei": "3155760000000000",
  "premiumWei": "0",
  "totalWei": "3155760000000000",
  "totalEth": "0.00315576"
}
```

### registerName
Register an ENS name. Requires `PRIVATE_KEY` environment variable.

**Input:**
- `name` (string): ENS name (must end with .eth)
- `years` (number, default: 1): Registration duration
- `owner` (string): Owner - accepts Ethereum address (0x...) or any ENS-resolvable name

**Output:**
```json
{
  "success": true,
  "name": "example.eth",
  "owner": "0x...",
  "durationSeconds": 31536000,
  "commitTxHash": "0x...",
  "registerTxHash": "0x..."
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NETWORK` | No | `mainnet` (default) or `sepolia` |
| `RPC_URL` | No | RPC endpoint (uses public if not set) |
| `PRIVATE_KEY` | For registerName | Wallet private key for transactions |

## Tech Stack
- **Runtime**: Deno 2.x
- **ENS**: @ensdomains/ensjs v4 + viem v2
- **MCP**: @modelcontextprotocol/sdk v1
- **Testing**: Deno's built-in test runner

## Project Structure
```
ens-registration-agent/
├── deno.json           # Deno config + imports
├── .env.example        # Required env vars
├── src/
│   ├── main.ts         # MCP server entry point
│   └── ens/
│       ├── client.ts   # ENS client setup
│       ├── availability.ts
│       ├── pricing.ts
│       ├── registration.ts
│       └── utils.ts
└── tests/
    ├── availability.test.ts
    ├── pricing.test.ts
    └── registration.test.ts
```

## Development with Devcontainer

For isolated development where Claude Code can run with `--dangerously-skip-permissions`:

1. Open in VS Code/Cursor → **"Reopen in Container"**
2. Inside the container, run: `claude --dangerously-skip-permissions`

The container includes Deno, Foundry (`cast`), GitHub CLI, and Claude Code. No secrets (like `PRIVATE_KEY`) are mounted — only non-sensitive config. ENS registrations should be done from the host.

**Browser testing:** To give the container access to Chrome on your host:
```bash
# On host
./scripts/launch-chrome-debug.sh
# From container, connect to host.docker.internal:9222
```

## Contributing

Follow TDD (Test-Driven Development) with small, atomic commits:

1. **Write a failing test** → commit
2. **Make the test pass** → commit
3. **Refactor if needed** → commit

Each commit should be independently revertible. Keep changes small and focused.

### Commit messages
- `test: add failing test for X`
- `feat: implement X`
- `refactor: extract Y into Z`
- `fix: handle edge case in X`
- `chore: update dependencies`

## Next Steps
- [x] x402 payment integration for charging callers
- [ ] Test on Ethereum mainnet
- [ ] Deploy (Fly.io or Railway)
- [ ] ENS name for the agent (ens-agent.ses.eth)
- [ ] Add to ERC-8004 registry
- [ ] Marketing — list on directories (see below)
- [ ] Extend existing names feature
- [ ] Base names / Celo names support
- [ ] Name suggestions

## Agent Directories & Registries
- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) — on-chain agent registry (Ethereum, Base, BNB Chain)
- [agent.ai](https://agent.ai/) — professional network for AI agents
- [AI Agents Directory](https://aiagentsdirectory.com/) — 2,100+ agents, 73+ categories
- [awesome-ai-agents](https://github.com/e2b-dev/awesome-ai-agents) — popular GitHub list
- [AI Agent Store](https://aiagentstore.ai/) — marketplace with free listing
- [TrillionAgent](https://trillionagent.com) — free to submit
- [Google Cloud Agent Finder](https://cloud.withgoogle.com/agentfinder/) — Google's directory

## Resources
- [ENS Documentation](https://docs.ens.domains/)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [x402 Payments](https://www.x402.org/)
- [ERC-8004](https://ai.ethereum.foundation/blog/intro-erc-8004)
