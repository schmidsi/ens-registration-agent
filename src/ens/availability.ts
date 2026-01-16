import { getAvailable } from "@ensdomains/ensjs/public";
import { createEnsClient, getConfigFromEnv, type SupportedNetwork } from "./client.ts";
import { validateName } from "./utils.ts";

/**
 * Check if an ENS name is available for registration.
 * @param name - The ENS name to check (must end with .eth)
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
  const validatedName = validateName(name);

  const available = await getAvailable(client, { name: validatedName });
  return available ?? false;
}
