import type { SupportedNetwork } from "./client.ts";
import type { Address, Hex } from "viem";

export interface RegistrationResult {
  name: string;
  owner: Address;
  duration: number;
  commitTxHash: Hex;
  registerTxHash: Hex;
}

/**
 * Register an ENS name.
 *
 * This is a two-step process:
 * 1. Commit the name (transaction 1)
 * 2. Wait for commitment period (~60 seconds)
 * 3. Register the name (transaction 2)
 *
 * @param name - The ENS name to register (with or without .eth suffix)
 * @param years - Number of years to register for
 * @param owner - Address that will own the name
 * @param network - Network to use
 * @param rpcUrl - RPC URL to use
 * @returns Registration result with transaction hashes
 */
export async function registerName(
  _name: string,
  _years: number,
  _owner: string,
  _network?: SupportedNetwork,
  _rpcUrl?: string
): Promise<RegistrationResult> {
  // TODO: Implement using ensjs
  throw new Error("Not implemented");
}
