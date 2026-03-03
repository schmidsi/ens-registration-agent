import { getAddressRecord } from "@ensdomains/ensjs/public";
import { isAddress, type Address } from "viem";
import { createEnsClient } from "./client.ts";

/**
 * Resolve an ENS name to its ETH address (cointype 60).
 * Always resolves against mainnet where real ENS names live.
 * Supports any TLD: .eth, .xyz, .com, .box, etc.
 */
export async function resolveAddress(nameOrAddress: string): Promise<Address> {
  if (isAddress(nameOrAddress)) {
    return nameOrAddress;
  }

  const client = createEnsClient("mainnet");
  const result = await getAddressRecord(client, { name: nameOrAddress, coin: 60 });
  if (result?.value) {
    return result.value as Address;
  }
  throw new Error(`Could not resolve "${nameOrAddress}" to an ETH address`);
}
