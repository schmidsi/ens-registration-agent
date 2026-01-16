import { commitName, registerName as ensRegisterName } from "@ensdomains/ensjs/wallet";
import { getPrice, getAddressRecord } from "@ensdomains/ensjs/public";
import { isAddress, type Address, type Hex } from "viem";
import { createEnsClient, createEnsWalletClient, getConfigFromEnv, type SupportedNetwork } from "./client.ts";
import { validateName, SECONDS_PER_YEAR } from "./utils.ts";

type EnsClient = ReturnType<typeof createEnsClient>;

export interface RegistrationResult {
  name: string;
  owner: Address;
  duration: number;
  commitTxHash: Hex;
  registerTxHash: Hex;
}

/**
 * Generate a random 32-byte secret for the commit-reveal scheme.
 */
function generateSecret(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as Hex;
}

/**
 * Wait for a specified number of milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Resolve owner to an address. Accepts either an Ethereum address or any ENS-resolvable name.
 */
async function resolveOwner(owner: string, client: EnsClient): Promise<Address> {
  // If it's already a valid address, return it
  if (isAddress(owner)) {
    return owner;
  }

  // Try to resolve as ENS name (supports any TLD: .eth, .xyz, .com, etc.)
  const result = await getAddressRecord(client, { name: owner });
  if (result?.value) {
    return result.value as Address;
  }
  throw new Error(`Could not resolve: ${owner}`);
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
  name: string,
  years: number,
  owner: string,
  network?: SupportedNetwork,
  rpcUrl?: string
): Promise<RegistrationResult> {
  // Validate inputs
  if (!name || name.trim() === "") {
    throw new Error("Name is required");
  }

  if (years <= 0) {
    throw new Error("Duration must be positive");
  }

  // Get config from environment
  const config = getConfigFromEnv();

  const selectedRpcUrl = rpcUrl ?? config.rpcUrl;
  if (!selectedRpcUrl) {
    throw new Error("RPC_URL environment variable is required for registration");
  }

  const privateKey = config.privateKey;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is required for registration");
  }

  const selectedNetwork = network ?? config.network;

  // Create clients
  const publicClient = createEnsClient(selectedNetwork, selectedRpcUrl);
  const walletClient = createEnsWalletClient(privateKey, selectedNetwork, selectedRpcUrl);

  // Resolve owner (accepts address or ENS name)
  const resolvedOwner = await resolveOwner(owner, publicClient);

  const validatedName = validateName(name);
  const durationSeconds = Math.floor(years * SECONDS_PER_YEAR);
  const secret = generateSecret();

  // Step 1: Commit
  const commitTxHash = await commitName(walletClient, {
    name: validatedName,
    owner: resolvedOwner,
    duration: durationSeconds,
    secret,
  });

  // Wait for commit transaction to be mined
  await publicClient.waitForTransactionReceipt({ hash: commitTxHash });

  // Step 2: Wait for commitment period (minimum 60 seconds on all networks)
  // Add a small buffer
  const commitmentWaitTime = 65_000;
  console.error(`Waiting ${commitmentWaitTime / 1000}s for commitment to mature...`);
  await delay(commitmentWaitTime);

  // Step 3: Get price for registration
  const price = await getPrice(publicClient, {
    nameOrNames: validatedName,
    duration: durationSeconds,
  });

  // Add 10% buffer for price fluctuations
  const value = ((price.base + price.premium) * 110n) / 100n;

  // Step 4: Register
  const registerTxHash = await ensRegisterName(walletClient, {
    name: validatedName,
    owner: resolvedOwner,
    duration: durationSeconds,
    secret,
    value,
  });

  // Wait for register transaction to be mined
  await publicClient.waitForTransactionReceipt({ hash: registerTxHash });

  return {
    name: validatedName,
    owner: resolvedOwner,
    duration: durationSeconds,
    commitTxHash,
    registerTxHash,
  };
}
