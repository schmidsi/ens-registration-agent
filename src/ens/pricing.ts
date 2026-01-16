import { getPrice } from "@ensdomains/ensjs/public";
import { createEnsClient, getConfigFromEnv, type SupportedNetwork } from "./client.ts";
import { validateName, SECONDS_PER_YEAR } from "./utils.ts";

export interface RegistrationPrice {
  base: bigint;
  premium: bigint;
}

/**
 * Get the price for registering an ENS name for a specified duration.
 * @param name - The ENS name (must end with .eth)
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
  const validatedName = validateName(name);
  const durationSeconds = Math.floor(years * SECONDS_PER_YEAR);

  const result = await getPrice(client, {
    nameOrNames: validatedName,
    duration: durationSeconds,
  });

  return {
    base: result.base,
    premium: result.premium,
  };
}
