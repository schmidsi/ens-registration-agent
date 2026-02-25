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

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROMPT="${1:-}"
SSH_KEY="$HOME/.ssh/ens-agent-key"

# --- Load SSH key into agent (prompts for passphrase if not already loaded) ---
if ssh-add -l 2>/dev/null | grep -q "$(ssh-keygen -lf "$SSH_KEY" 2>/dev/null | awk '{print $2}')"; then
  echo "==> SSH key already in agent."
else
  echo "==> Loading SSH key (passphrase prompt)..."
  ssh-add "$SSH_KEY"
fi

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
