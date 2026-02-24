# ENS Registration Agent

## Stack

- **Runtime**: Deno 2.x
- **ENS**: @ensdomains/ensjs v4 + viem v2
- **MCP**: @modelcontextprotocol/sdk v1
- **Testing**: `deno task test`
- **HTTP server**: `deno task http` (port 3000)
- **MCP server**: Streamable HTTP at `/mcp` (served by HTTP server)

## Devcontainer

This project uses a devcontainer for isolated Claude Code execution with
`--dangerously-skip-permissions`. No secrets (PRIVATE_KEY) are in the container.

### Browser Control (Playwright MCP)

The Playwright MCP connects to Chrome running on the **host** via CDP.

**NEVER call `browser_install`.** Browsers are not installed in the container.
The host Chrome is already running with remote debugging enabled.

Setup:
1. On the host, run: `./scripts/launch-chrome-debug.sh`
2. This starts Chrome (port 9222) + a CDP proxy (port 9223)
3. Playwright MCP connects to `host.docker.internal:9223` automatically

### Commands

```bash
deno task test    # Run tests
deno task http    # Serves both HTTP API and MCP at /mcp
cast --version    # Ethereum CLI (Foundry)
```

## ERC-8004 Agent Registry

- **Agent ID**: 19151 on Base (chain 8453)
- **Identity Registry**: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` (same address all chains)
- **Owner wallet**: `0x6B4D6eaFAE2dC638e991f66825c1eb46f561537f`
- **Registration JSON**: `agent-registration.json` (project root), served at `/.well-known/agent-registration.json`
- **On-chain URI**: base64-encoded data URI of the JSON above

### Updating the on-chain registration

After editing `agent-registration.json`, update on-chain:

```bash
source .env && cast send 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 \
  "setAgentURI(uint256,string)" 19151 \
  "data:application/json;base64,$(jq -c . agent-registration.json | base64 -w 0)" \
  --rpc-url https://mainnet.base.org --private-key $PRIVATE_KEY
```

### 8004scan

- **Agent page**: https://www.8004scan.io/agents/base/19151
- **API**: `https://www.8004scan.io/api/v1/agents/{chain_id}/{token_id}`
- **Auth**: `X-API-Key` header, key stored in `.env` as `SCAN8004_API_KEY`
- **API examples**:
  - List agents: `curl -H "X-API-Key: $KEY" https://www.8004scan.io/api/v1/agents`
  - Get agent: `curl -H "X-API-Key: $KEY" https://www.8004scan.io/api/v1/agents/8453/19151`
  - Search: `curl -H "X-API-Key: $KEY" "https://www.8004scan.io/api/v1/agents?search=ens&limit=10"`

### Registration JSON best practices

- `agentWallet`: set on-chain only (via `setAgentWallet()`), do NOT duplicate in off-chain JSON
- MCP `version`: use date format `YYYY-MM-DD`, not semver
- `supportedTrust`: valid values are `reputation`, `crypto-economic`, `tee-attestation`
- `registrations`: must include `agentId` + `agentRegistry` after on-chain registration
- Serve `/.well-known/agent-registration.json` for domain verification

## Conventions

- TDD: write failing test → make it pass → refactor
- Small, atomic commits with conventional prefixes (feat/fix/test/chore/refactor)
- Simple is better than complex
