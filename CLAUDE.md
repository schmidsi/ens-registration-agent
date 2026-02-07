# ENS Registration Agent

## Stack

- **Runtime**: Deno 2.x
- **ENS**: @ensdomains/ensjs v4 + viem v2
- **MCP**: @modelcontextprotocol/sdk v1
- **Testing**: `deno task test`
- **HTTP server**: `deno task http` (port 3000)
- **MCP server**: `deno task dev` (stdio)

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
deno task dev     # Start MCP server (stdio)
deno task http    # Start HTTP server (port 3000)
cast --version    # Ethereum CLI (Foundry)
```

## Conventions

- TDD: write failing test → make it pass → refactor
- Small, atomic commits with conventional prefixes (feat/fix/test/chore/refactor)
- Simple is better than complex
