#!/usr/bin/env bash
# Start the devcontainer and launch Claude Code with --dangerously-skip-permissions.
#
# Usage:
#   ./scripts/start-devcontainer.sh                  # interactive Claude Code session
#   ./scripts/start-devcontainer.sh "fix the bug"    # non-interactive with a prompt
#
# Prerequisites:
#   npm install -g @devcontainers/cli
#   An SSH key loaded in your agent: ssh-add -t 8h /path/to/key
#
# The script forwards your host SSH agent into the container.
# Load your GitHub deploy key before running:
#   ssh-add -t 8h ~/.ssh/agent-key

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROMPT="${1:-}"

# --- Verify SSH agent has a key ---
if ! ssh-add -l &>/dev/null; then
  echo "ERROR: No SSH keys in agent. Load one first:"
  echo "  ssh-add -t 8h /path/to/your-key"
  exit 1
fi
echo "==> SSH agent has keys loaded. Forwarding into container."

# --- Build & start devcontainer ---
echo "==> Building & starting devcontainer..."
devcontainer up --workspace-folder "$REPO_ROOT"

devcontainer exec --workspace-folder "$REPO_ROOT" bash -c "
  mkdir -p ~/.ssh
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
