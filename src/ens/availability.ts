import { getAvailable } from "@ensdomains/ensjs/public";
import { createEnsClient, getConfigFromEnv, type SupportedNetwork } from "./client.ts";

/**
 * Normalize ENS name by ensuring it has .eth suffix.
 */
function normalizeName(name: string): string {
  return name.endsWith(".eth") ? name : `${name}.eth`;
}

/**
 * Check if an ENS name is available for registration.
 * @param name - The ENS name to check (with or without .eth suffix)
 * @param network - Network to use (defaults to env or mainnet)
 * @param rpcUrl - RPC URL to use (defaults to env or public RPC)
 * @returns true if the name is available, false otherwise
 */
export async function checkAvailability(
  name: string,
  network?: SupportedNetwork,
  rpcUrl?: string
): Promise<boolean> {
  const config = getConfigFromEnv();
  const client = createEnsClient(network ?? config.network, rpcUrl ?? config.rpcUrl);
  const normalizedName = normalizeName(name);

  const available = await getAvailable(client, { name: normalizedName });
  return available ?? false;
}
