#!/usr/bin/env -S deno run --env --allow-net --allow-env --allow-read
/**
 * Test script for x402 payment flow.
 *
 * Prerequisites:
 * 1. Get Base Sepolia USDC from faucet: https://faucet.circle.com/
 * 2. Start the HTTP server: deno task http
 * 3. Run this script: deno run --env --allow-net --allow-env --allow-read scripts/test-x402.ts
 */

import { wrapFetchWithPayment, x402Client } from "npm:@x402/fetch";
import { ExactEvmScheme } from "npm:@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const SERVER_URL = Deno.env.get("SERVER_URL") ?? "http://localhost:3000";

// Wallet for x402 payments (needs Base Sepolia USDC)
// Falls back to PRIVATE_KEY if PAYER_PRIVATE_KEY not set
const payerPrivateKey = Deno.env.get("PAYER_PRIVATE_KEY") ?? Deno.env.get("PRIVATE_KEY");
if (!payerPrivateKey) {
  console.error("Error: PAYER_PRIVATE_KEY or PRIVATE_KEY environment variable required");
  console.error("This wallet needs Base Sepolia USDC for payments");
  Deno.exit(1);
}

const account = privateKeyToAccount(payerPrivateKey as `0x${string}`);
console.log(`Payer wallet: ${account.address}`);

// Create x402 client with EVM scheme for Base Sepolia
// The account from privateKeyToAccount has address + signTypedData which is what x402 needs
const client = new x402Client().register(
  "eip155:84532", // Base Sepolia
  new ExactEvmScheme(account)
);

// Wrap fetch with x402 payment capability
const x402Fetch = wrapFetchWithPayment(fetch, client);

// Test name to register
const testName = `test${Date.now()}.eth`;
const owner = account.address;

console.log(`\n🔍 Testing x402 flow for: ${testName}`);
console.log(`   Owner: ${owner}`);

// Step 1: Check availability (free)
console.log(`\n1. Checking availability...`);
const availRes = await fetch(`${SERVER_URL}/api/availability/${testName}`);
const availData = await availRes.json();
console.log(`   Result:`, availData);

if (!availData.available) {
  console.error("Name not available, try a different name");
  Deno.exit(1);
}

// Step 2: Get price (free)
console.log(`\n2. Getting price...`);
const priceRes = await fetch(`${SERVER_URL}/api/price/${testName}`);
const priceData = await priceRes.json();
console.log(`   Result:`, priceData);

// Step 3: Register with x402 payment (paid)
console.log(`\n3. Registering with x402 payment...`);
console.log(`   This will pay the service fee in USDC on Base Sepolia`);

try {
  const registerRes = await x402Fetch(`${SERVER_URL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: testName, owner }),
  });

  console.log(`   Status: ${registerRes.status} ${registerRes.statusText}`);

  // Log x402-related headers if present
  const paymentHeader = registerRes.headers.get("X-Payment");
  const wwwAuth = registerRes.headers.get("WWW-Authenticate");
  if (paymentHeader) console.log(`   X-Payment: ${paymentHeader}`);
  if (wwwAuth) console.log(`   WWW-Authenticate: ${wwwAuth}`);

  const responseText = await registerRes.text();
  let registerData;
  try {
    registerData = JSON.parse(responseText);
  } catch {
    registerData = responseText;
  }

  if (registerRes.ok) {
    console.log(`\n🎉 Registration successful!`);
    console.log(`   Name: ${registerData.name}`);
    console.log(`   Owner: ${registerData.owner}`);
    console.log(`   Commit TX: ${registerData.commitTxHash}`);
    console.log(`   Register TX: ${registerData.registerTxHash}`);
  } else if (registerRes.status === 402) {
    console.error(`\n💰 Payment required (402)`);
    console.error(`   The x402 payment was not accepted.`);
    console.error(`   Make sure your wallet has Base Sepolia USDC.`);
    console.error(`   Get test USDC from: https://faucet.circle.com/`);
    console.error(`   Response:`, registerData);
  } else {
    console.error(`\n❌ Registration failed (${registerRes.status}):`);
    console.error(`   Response:`, registerData);
  }
} catch (error) {
  console.error(`\n❌ Error:`, error);
  if (error instanceof Error && error.message.includes("Connection refused")) {
    console.error(`\n💡 Hint: Make sure the HTTP server is running:`);
    console.error(`   deno task http`);
  }
}
