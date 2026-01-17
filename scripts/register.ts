#!/usr/bin/env -S deno run --env --allow-net --allow-env --allow-read
/**
 * Integration script to register an ENS name on Sepolia.
 *
 * Usage:
 *   deno task register <name.eth> [owner-address]
 *
 * Examples:
 *   deno task register myname.eth
 *   deno task register myname.eth 0x1234...
 */

import { checkAvailability } from "../src/ens/availability.ts";
import { getRegistrationPrice } from "../src/ens/pricing.ts";
import { registerName } from "../src/ens/registration.ts";
import { privateKeyToAccount } from "viem/accounts";
import { formatEther } from "viem";

const name = Deno.args[0];
if (!name) {
  console.error("Usage: deno task register <name.eth> [owner-address]");
  console.error("Example: deno task register myname.eth");
  Deno.exit(1);
}

if (!name.endsWith(".eth")) {
  console.error("Error: Name must end with .eth");
  Deno.exit(1);
}

const privateKey = Deno.env.get("PRIVATE_KEY");
if (!privateKey) {
  console.error("Error: PRIVATE_KEY environment variable required");
  Deno.exit(1);
}

// Default owner to the wallet address if not provided
const account = privateKeyToAccount(privateKey as `0x${string}`);
const owner = Deno.args[1] || account.address;

console.log(`\n🔍 Checking availability for: ${name}`);
const available = await checkAvailability(name);

if (!available) {
  console.error(`❌ ${name} is not available for registration`);
  Deno.exit(1);
}
console.log(`✅ ${name} is available!`);

console.log(`\n💰 Getting price...`);
const price = await getRegistrationPrice(name, 1);
const totalWei = price.base + price.premium;
console.log(`   Base: ${formatEther(price.base)} ETH`);
console.log(`   Premium: ${formatEther(price.premium)} ETH`);
console.log(`   Total: ${formatEther(totalWei)} ETH`);

console.log(`\n📝 Registering ${name} for 1 year...`);
console.log(`   Owner: ${owner}`);
console.log(`   (This will take ~15 seconds for commit-reveal on Sepolia)\n`);

// Set maxPrice with 10% buffer for price fluctuations
const maxPrice = (totalWei * 110n) / 100n;

try {
  const result = await registerName(name, 1, owner, maxPrice);

  console.log(`\n🎉 Registration successful!`);
  console.log(`   Name: ${result.name}`);
  console.log(`   Owner: ${result.owner}`);
  console.log(`   Duration: ${result.duration} seconds`);
  console.log(`   Commit TX: ${result.commitTxHash}`);
  console.log(`   Register TX: ${result.registerTxHash}`);
  console.log(`\n   View on Etherscan: https://sepolia.etherscan.io/tx/${result.registerTxHash}`);
} catch (error) {
  console.error(`\n❌ Registration failed:`, error);
  Deno.exit(1);
}
