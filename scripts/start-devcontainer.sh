#!/usr/bin/env bash
# Start the devcontainer and launch Claude Code with --dangerously-skip-permissions.
#
# Usage:
#   ./scripts/start-devcontainer.sh                  # interactive Claude Code session
#   ./scripts/start-devcontainer.sh "fix the bug"    # non-interactive with a prompt
#
# Prerequisites:
#   npm install -g @devcontainers/cli
#   Passphrase-encrypted SSH key at ~/.ssh/ens-agent-key

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
PROMPT="${1:-}"

# --- Preflight: Docker running? ---
if ! docker info &>/dev/null; then
  echo "ERROR: Docker is not running. Start Docker Desktop first."
  exit 1
fi

# --- Build & start devcontainer ---
echo "==> Building & starting devcontainer..."
devcontainer up --workspace-folder "$REPO_ROOT"

# --- Setup git, start ssh-agent, add key, launch Claude — all in one shell ---
echo "==> Starting session (passphrase prompt for SSH key)..."
if [ -n "$PROMPT" ]; then
  CLAUDE_CMD="claude --dangerously-skip-permissions --print $(printf '%q' "$PROMPT")"
else
  CLAUDE_CMD="claude --dangerously-skip-permissions"
fi

devcontainer exec --workspace-folder "$REPO_ROOT" bash -c "
  mkdir -p ~/.ssh
  ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null
  git config --global user.email 'simon+agent@schmid.io'
  git config --global user.name 'Simon Agent'
  eval \$(ssh-agent -s)
  ssh-add ~/.ssh/ens-agent-key
  cd /workspace
  exec $CLAUDE_CMD
"
