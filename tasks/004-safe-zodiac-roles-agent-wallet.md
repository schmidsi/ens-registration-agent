# 004: Migrate Agent Wallet to Safe + Zodiac Roles Modifier v2

## Goal

Replace the agent's raw private key with a Safe multisig + Zodiac Roles Modifier v2 setup, so the agent key can only execute whitelisted contract functions. The Safe address becomes the agent's on-chain identity.

## Architecture

```
EOA (0x6B4D...537f) — full owner, 1/1 threshold
    │
    ▼
  [Safe]  ← agent identity / wallet
    │
    └── Roles Modifier v2 (enabled as module)
          └── Role: "ens_agent"
                Members: [agent private key address]
                Permissions:
                  - ENS ETHRegistrarController.commit()
                  - ENS ETHRegistrarController.register() [with ETH send]
                  - ERC-8004 Registry.setAgentURI(19151, *)
```

- Agent key calls `execTransactionWithRole()` on the Roles Modifier — a normal tx, no ERC-4337 infra needed
- Roles Modifier checks permissions, then calls `execTransactionFromModule()` on the Safe
- If permissions don't match, the tx reverts

## Why Zodiac Roles v2

- **Exact match**: function selector + parameter-level scoping (e.g., lock `agentId` to `19151`)
- **Battle-tested**: Gnosis Pay (every Visa card tx), ENS DAO, GnosisDAO, Balancer use it in production
- **Audited**: by G0 Group and Omniscia
- **No ERC-4337 needed**: agent key sends a regular Ethereum tx
- **TypeScript SDK**: `zodiac-roles-sdk` with "permissions as code" workflow, fits our Deno stack
- **Deployed on our chains**: Base + Ethereum mainnet at `0x9646fDAD06d3e24444381f44362a3B0eB343D337`

## Alternatives Considered

| Option | Why not |
|---|---|
| Safe Allowance Module | Only restricts token transfers, can't whitelist contract functions |
| ERC-7579 Smart Sessions (Rhinestone) | Explicitly "experimental", needs ERC-4337 bundler |
| Transaction Guards | Requires custom Solidity, broken guard can permanently lock Safe |
| MetaMask Delegation Toolkit | Different custody model, more complexity |
| Lit Protocol Agent Wallet | MPC-based, adds dependency on Lit network |

## Steps

1. Deploy 1/1 Safe on mainnet and Base (Safe UI or `@safe-global/protocol-kit`)
2. Install `zodiac-roles-sdk` in the project
3. Define permissions in TypeScript using the SDK's typed allow kits
4. Enable Roles Modifier on each Safe and apply permissions (Safe txs from EOA)
5. Assign agent key as role member
6. Update agent code: replace direct signing with `execTransactionWithRole()` calls via viem
7. Update ERC-8004 registration to use Safe address as agent wallet (`setAgentWallet()`)
8. Test on testnets first (Base Sepolia, Sepolia)

## Key Resources

- Zodiac Roles docs: https://docs.roles.gnosisguild.org/
- SDK getting started: https://docs.roles.gnosisguild.org/sdk/getting-started
- Permissions Starter Kit: https://github.com/gnosisguild/permissions-starter-kit
- Roles Modifier contract (all chains): `0x9646fDAD06d3e24444381f44362a3B0eB343D337`
- Safe AI agent quickstarts: https://docs.safe.global/home/ai-agent-quickstarts/human-approval

## Priority

Nice-to-have / security hardening. Not urgent but good practice before the agent handles real funds or performs irreversible on-chain actions autonomously.
