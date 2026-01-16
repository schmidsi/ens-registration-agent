import { assertRejects } from "@std/assert";
import { requireRpcUrl, requirePrivateKey } from "./setup.ts";
import { registerName } from "../src/ens/registration.ts";

// Validate environment before running tests
requireRpcUrl();
requirePrivateKey();

// Note: Full integration tests require a funded Sepolia wallet
// These tests verify the function interface and error handling

Deno.test("registerName validates name parameter", async () => {
  // Empty name should throw
  await assertRejects(
    async () => {
      await registerName("", 1, "0x0000000000000000000000000000000000000001");
    },
    Error
  );
});

Deno.test("registerName validates duration is positive", async () => {
  // Zero or negative years should throw
  await assertRejects(
    async () => {
      await registerName("testname.eth", 0, "0x0000000000000000000000000000000000000001");
    },
    Error,
    "positive"
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
