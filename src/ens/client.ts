import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet, sepolia } from "viem/chains";
import { addEnsContracts } from "@ensdomains/ensjs";

export type SupportedNetwork = "mainnet" | "sepolia";

/**
 * Get the chain configuration for the given network.
 */
function getChain(network: SupportedNetwork) {
  return network === "mainnet" ? mainnet : sepolia;
}

/**
 * Create an ENS-enabled public client for the specified network.
 */
export function createEnsClient(
  network: SupportedNetwork = "mainnet",
  rpcUrl?: string
) {
  const chain = getChain(network);
  const transport = rpcUrl ? http(rpcUrl) : http();

  return createPublicClient({
    chain: addEnsContracts(chain),
    transport,
  });
}

/**
 * Create an ENS-enabled wallet client for the specified network.
 * Requires a private key.
 */
export function createEnsWalletClient(
  privateKey: Hex,
  network: SupportedNetwork = "mainnet",
  rpcUrl?: string
) {
  const chain = getChain(network);
  const transport = rpcUrl ? http(rpcUrl) : http();
  const account = privateKeyToAccount(privateKey);

  return createWalletClient({
    account,
    chain: addEnsContracts(chain),
    transport,
  });
}

/**
 * Get network and RPC URL from environment variables.
 */
export function getConfigFromEnv(): { network: SupportedNetwork; rpcUrl?: string; privateKey?: Hex } {
  const network = (Deno.env.get("NETWORK") || "mainnet") as SupportedNetwork;
  const rpcUrl = Deno.env.get("RPC_URL");
  const privateKey = Deno.env.get("PRIVATE_KEY") as Hex | undefined;
  return { network, rpcUrl, privateKey };
}
