import { assertRejects } from "@std/assert";
import { requireRpcUrl, requirePrivateKey } from "./setup.ts";
import { registerName } from "../src/ens/registration.ts";

// Validate environment before running tests
requireRpcUrl();
requirePrivateKey();

// Note: Full integration tests require a funded Sepolia wallet
// These tests verify the function interface and error handling

// Dummy maxPrice for tests - validation errors occur before price check
const DUMMY_MAX_PRICE = 1000000000000000000n; // 1 ETH

Deno.test("registerName validates name parameter", async () => {
  // Empty name should throw
  await assertRejects(
    async () => {
      await registerName("", 1, "0x0000000000000000000000000000000000000001", DUMMY_MAX_PRICE);
    },
    Error
  );
});

Deno.test("registerName validates duration is positive", async () => {
  // Zero or negative years should throw
  await assertRejects(
    async () => {
      await registerName("testname.eth", 0, "0x0000000000000000000000000000000000000001", DUMMY_MAX_PRICE);
    },
    Error,
    "positive"
  );
});

Deno.test("registerName validates owner address", async () => {
  // Invalid address should throw
  await assertRejects(
    async () => {
      await registerName("testname.eth", 1, "invalid-address", DUMMY_MAX_PRICE);
    },
    Error
  );
});

Deno.test("registerName resolves ENS name as owner", async () => {
  // ENS name that doesn't resolve should throw with specific message
  await assertRejects(
    async () => {
      await registerName("testname.eth", 1, "nonexistent-name-12345.eth", DUMMY_MAX_PRICE);
    },
    Error,
    "Could not resolve"
  );
});

Deno.test("registerName resolves non-.eth ENS names as owner", async () => {
  // Any domain that doesn't resolve should throw (not just .eth)
  await assertRejects(
    async () => {
      await registerName("testname.eth", 1, "nonexistent-domain.xyz", DUMMY_MAX_PRICE);
    },
    Error,
    "Could not resolve"
  );
});
