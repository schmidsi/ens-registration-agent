#!/usr/bin/env bash
# Start the devcontainer and launch Claude Code with --dangerously-skip-permissions.
#
# Usage:
#   ./dev.sh                          # interactive Claude Code session
#   ./dev.sh --rebuild                # rebuild container before starting
#
# Prerequisites:
#   npm install -g @devcontainers/cli
#   Passphrase-encrypted SSH key at ~/.ssh/ens-agent-key

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
REBUILD=false

for arg in "$@"; do
  if [ "$arg" = "--rebuild" ]; then
    REBUILD=true
  fi
done

# --- Preflight: Docker running? ---
if ! docker info &>/dev/null; then
  echo "ERROR: Docker is not running. Start Docker Desktop first."
  exit 1
fi

# --- Build & start devcontainer ---
if [ "$REBUILD" = true ]; then
  echo "==> Rebuilding devcontainer (--rebuild)..."
  devcontainer up --workspace-folder "$REPO_ROOT" --remove-existing-container
else
  echo "==> Building & starting devcontainer..."
  devcontainer up --workspace-folder "$REPO_ROOT"
fi

# --- Setup git, start ssh-agent, add key, launch Claude — all in one shell ---
echo "==> Starting session (passphrase prompt for SSH key)..."
devcontainer exec --workspace-folder "$REPO_ROOT" bash -c "
  mkdir -p ~/.ssh
  ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null
  git config --global user.email 'simon+agent@schmid.io'
  git config --global user.name 'Simon Agent'
  eval \$(ssh-agent -s)
  ssh-add ~/.ssh/ens-agent-key
  cd /workspace
  exec claude --dangerously-skip-permissions
"
