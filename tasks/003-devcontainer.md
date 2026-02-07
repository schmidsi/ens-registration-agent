# 003: Docker Devcontainer for Isolated Development

## Goal

Set up a devcontainer so Claude Code can run with `--dangerously-skip-permissions` safely, with access to the host Chrome browser for frontend testing.

## Security Model: No Secrets in Container

Instead of a restrictive firewall (which conflicts with research/browsing needs), we keep **no secrets inside the container**. The `.env` file is NOT mounted — only non-sensitive config is passed via `containerEnv`.

**What's in the container:**
- Source code (already public on GitHub)
- DRPC API key (low-value, rate-limited, easily rotated)
- Claude auth token (only risk: burning API credits)

**What stays on the host only:**
- `PRIVATE_KEY` (Ethereum wallet — the only real secret)

**Consequence:** The firewall can be **permissive** — open network for research, web browsing, package installs. Nothing valuable to exfiltrate.

When you need to actually register an ENS name, do it from the host, not the container.

## Research Summary

### Approach: Anthropic's Official Devcontainer (customized for Deno)

Anthropic provides a reference `.devcontainer/` at [github.com/anthropics/claude-code/.devcontainer](https://github.com/anthropics/claude-code/tree/main/.devcontainer). It consists of:

- **Dockerfile** — `node:20` base, installs Claude Code via npm, git, iptables, GitHub CLI
- **devcontainer.json** — capabilities, volumes, env vars, firewall post-start
- **init-firewall.sh** — default-deny iptables, whitelists only Anthropic API, npm, GitHub, Sentry, statsig

We customize this for our stack: **Deno** runtime, **Foundry/cast** for Ethereum. We skip the strict firewall since we have no secrets to protect.

### Browser Control: Host Chrome via CDP

Launch Chrome on the host with remote debugging, connect from container:

```bash
# On macOS host
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug-profile
```

From inside the container, connect to `host.docker.internal:9222` via Chrome DevTools Protocol.

---

## Steps

### Step 1: Create `.devcontainer/Dockerfile`

Base on `node:20` (needed for Claude Code npm install), then add Deno and Foundry:

```dockerfile
FROM node:20

ARG CLAUDE_CODE_VERSION=latest
ARG DENO_VERSION=2.1.4
ARG TZ=UTC

# System packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl sudo ca-certificates \
    ripgrep fd-find jq tree vim unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Deno
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh -s -- --version v${DENO_VERSION}

# Install Foundry (cast)
RUN curl -L https://foundry.paradigm.xyz | bash && \
    /root/.foundry/bin/foundryup && \
    cp /root/.foundry/bin/cast /usr/local/bin/

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && apt-get install -y gh && rm -rf /var/lib/apt/lists/*

# Install Claude Code
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}

ENV DEVCONTAINER=true
USER node
WORKDIR /workspace
```

### Step 2: Create `.devcontainer/devcontainer.json`

Note: No `.env` mount. Secrets stay on the host. Non-sensitive config passed via `containerEnv`.

```json
{
  "name": "ENS Registration Agent",
  "build": {
    "dockerfile": "Dockerfile",
    "args": {
      "TZ": "${localEnv:TZ:UTC}",
      "CLAUDE_CODE_VERSION": "latest"
    }
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "anthropic.claude-code",
        "denoland.vscode-deno"
      ]
    }
  },
  "remoteUser": "node",
  "mounts": [
    "source=ens-agent-bashhistory-${devcontainerId},target=/commandhistory,type=volume",
    "source=ens-agent-claude-config-${devcontainerId},target=/home/node/.claude,type=volume"
  ],
  "containerEnv": {
    "NODE_OPTIONS": "--max-old-space-size=4096",
    "CLAUDE_CONFIG_DIR": "/home/node/.claude",
    "NETWORK": "sepolia",
    "RPC_URL": "https://lb.drpc.live/sepolia/Aqddx4Z48kzCoJ6EtjKYmKkdG05ovpUR8JE5QmlfqV1j"
  },
  "workspaceMount": "source=${localWorkspaceFolder},target=/workspace,type=bind,consistency=delegated",
  "workspaceFolder": "/workspace",
  "postCreateCommand": "deno install"
}
```

### Step 3: Create `.env.example` update

Update `.env.example` to document that `PRIVATE_KEY` is not needed in the container:

```
# PRIVATE_KEY is intentionally NOT set in the container.
# ENS registrations should be done from the host.
# PRIVATE_KEY=0x...
```

### Step 4: Add Chrome CDP helper script

Create a `scripts/launch-chrome-debug.sh` for the host:

```bash
#!/bin/bash
# Run on host to enable Chrome remote debugging for the container
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug-profile \
  "$@"
```

### Step 5: Update `.gitignore`

Ensure `.devcontainer/` is NOT gitignored (it should be committed). Verify `.env` stays gitignored.

### Step 6: Test the setup

1. Open project in VS Code/Cursor → "Reopen in Container"
2. Verify: `deno --version`, `cast --version`, `claude --version`
3. Verify: `deno task test` passes
4. Verify: `claude --dangerously-skip-permissions` works
5. Verify: can connect to host Chrome at `host.docker.internal:9222` (if Chrome is running with CDP)
6. Verify: `.env` with `PRIVATE_KEY` is NOT accessible inside the container

### Step 7: Document in README

Add a "Development with Devcontainer" section to README.

---

## Decisions Made

1. **Chrome: host CDP** — Launch Chrome on host with `--remote-debugging-port=9222`, connect from container via `host.docker.internal`. Simple, no extra container weight.

2. **Devcontainer over Docker Sandbox** — We need Deno + Foundry pre-installed. `docker sandbox` doesn't support custom images.

3. **No firewall, no secrets** — Instead of restrictive firewall (which blocks research/browsing), we simply don't put secrets in the container. Permissive network, nothing valuable to steal.

## Files to Create/Modify

- `NEW` `.devcontainer/Dockerfile`
- `NEW` `.devcontainer/devcontainer.json`
- `NEW` `scripts/launch-chrome-debug.sh` (host-side helper)
- `EDIT` `.gitignore` (verify .devcontainer not ignored)
- `EDIT` `README.md` (add devcontainer section)
