import { getPrice } from "@ensdomains/ensjs/public";
import { createEnsClient, getConfigFromEnv, type SupportedNetwork } from "./client.ts";

export interface RegistrationPrice {
  base: bigint;
  premium: bigint;
}

const SECONDS_PER_YEAR = 31536000;

/**
 * Normalize ENS name by ensuring it has .eth suffix.
 */
function normalizeName(name: string): string {
  return name.endsWith(".eth") ? name : `${name}.eth`;
}

/**
 * Get the price for registering an ENS name for a specified duration.
 * @param name - The ENS name (with or without .eth suffix)
 * @param years - Number of years to register for
 * @param network - Network to use
 * @param rpcUrl - RPC URL to use
 * @returns Object with base and premium prices in wei
 */
export async function getRegistrationPrice(
  name: string,
  years: number,
  network?: SupportedNetwork,
  rpcUrl?: string
): Promise<RegistrationPrice> {
  const config = getConfigFromEnv();
  const client = createEnsClient(network ?? config.network, rpcUrl ?? config.rpcUrl);
  const normalizedName = normalizeName(name);
  const durationSeconds = Math.floor(years * SECONDS_PER_YEAR);

  const result = await getPrice(client, {
    nameOrNames: normalizedName,
    duration: durationSeconds,
  });

  return {
    base: result.base,
    premium: result.premium,
  };
}
