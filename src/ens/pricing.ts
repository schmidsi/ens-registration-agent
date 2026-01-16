import type { SupportedNetwork } from "./client.ts";

export interface RegistrationPrice {
  base: bigint;
  premium: bigint;
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
  _name: string,
  _years: number,
  _network?: SupportedNetwork,
  _rpcUrl?: string
): Promise<RegistrationPrice> {
  // TODO: Implement using ensjs
  throw new Error("Not implemented");
}
