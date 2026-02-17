FROM node:20

ARG CLAUDE_CODE_VERSION=latest
ARG DENO_VERSION=2.6.4
ARG TZ=UTC

# System packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl sudo ca-certificates \
    ripgrep fd-find jq tree vim unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Deno
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh -s -- --version v${DENO_VERSION}

# Install Foundry (cast for Ethereum queries)
RUN curl -L https://foundry.paradigm.xyz | bash && \
    /root/.foundry/bin/foundryup && \
    cp /root/.foundry/bin/cast /usr/local/bin/ && \
    rm -rf /root/.foundry

# Install GitHub CLI
RUN ARCH=$(dpkg --print-architecture) && \
    curl -fsSL "https://github.com/cli/cli/releases/latest/download/gh_$(curl -fsSL https://api.github.com/repos/cli/cli/releases/latest | jq -r '.tag_name' | sed 's/^v//')_linux_${ARCH}.tar.gz" \
    | tar xz --strip-components=1 -C /usr/local

# Install Claude Code via npm (fast in Docker; auto-updates not needed in container)
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}

# Convenience shortcut: `c` runs Claude Code with --dangerously-skip-permissions
RUN echo '#!/bin/bash\ncd /workspace && exec claude --dangerously-skip-permissions "$@"' \
    > /usr/local/bin/c && chmod +x /usr/local/bin/c

ENV DEVCONTAINER=true
USER node
WORKDIR /workspace
