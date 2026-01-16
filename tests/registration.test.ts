import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { registerName } from "../src/ens/registration.ts";

// Note: Full integration tests require a funded Sepolia wallet
// These tests verify the function interface and error handling

Deno.test("registerName throws without private key configured", async () => {
  // Without PRIVATE_KEY env var, should throw
  await assertRejects(
    async () => {
      await registerName("testname12345.eth", 1, "0x0000000000000000000000000000000000000001");
    },
    Error,
    "PRIVATE_KEY" // Should mention missing private key
  );
});

Deno.test("registerName validates name parameter", async () => {
  // Empty name should throw
  await assertRejects(
    async () => {
      await registerName("", 1, "0x0000000000000000000000000000000000000001");
    },
    Error
  );
});

Deno.test("registerName validates duration", async () => {
  // Zero or negative years should throw
  await assertRejects(
    async () => {
      await registerName("testname.eth", 0, "0x0000000000000000000000000000000000000001");
    },
    Error
  );
});

Deno.test("registerName validates owner address", async () => {
  // Invalid address should throw
  await assertRejects(
    async () => {
      await registerName("testname.eth", 1, "invalid-address");
    },
    Error
  );
});
