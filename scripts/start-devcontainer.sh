#!/usr/bin/env bash
# Start the devcontainer and launch Claude Code with --dangerously-skip-permissions.
#
# Usage:
#   ./scripts/start-devcontainer.sh                  # interactive Claude Code session
#   ./scripts/start-devcontainer.sh "fix the bug"    # non-interactive with a prompt
#
# Prerequisites:
#   brew install --cask 1password-cli   (for `op`)
#   npm install -g @devcontainers/cli   (for `devcontainer`)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROMPT="${1:-}"
KEY_TTL="8h"

# --- SSH agent setup (one-time 1Password prompt) ---
echo "==> Loading SSH key from 1Password (you'll be prompted once)..."
op read "op://Private/simon-agent-ssh-key/private key" | ssh-add -t "$KEY_TTL" - 2>/dev/null
echo "    Key loaded into agent (expires in $KEY_TTL)."

# --- Git config for the agent inside the container ---
echo "==> Building & starting devcontainer..."
devcontainer up --workspace-folder "$REPO_ROOT"

devcontainer exec --workspace-folder "$REPO_ROOT" bash -c "
  ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null
  git config --global user.email 'simon+agent@schmid.io'
  git config --global user.name 'Simon Agent'
"

# --- Launch Claude Code ---
echo "==> Launching Claude Code..."
if [ -n "$PROMPT" ]; then
  devcontainer exec --workspace-folder "$REPO_ROOT" c --print "$PROMPT"
else
  devcontainer exec --workspace-folder "$REPO_ROOT" c
fi
