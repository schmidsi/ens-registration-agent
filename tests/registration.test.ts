import { assertRejects } from "@std/assert";
import { registerName } from "../src/ens/registration.ts";

// Note: Full integration tests require a funded Sepolia wallet
// These tests verify the function interface and error handling

Deno.test("registerName throws without RPC_URL configured", async () => {
  // Without RPC_URL env var, should throw
  await assertRejects(
    async () => {
      await registerName("testname12345.eth", 1, "0x0000000000000000000000000000000000000001");
    },
    Error,
    "RPC_URL"
  );
});

Deno.test("registerName throws without private key configured", async () => {
  // Set RPC_URL but not PRIVATE_KEY
  const originalRpcUrl = Deno.env.get("RPC_URL");
  Deno.env.set("RPC_URL", "https://eth.example.com");

  try {
    await assertRejects(
      async () => {
        await registerName("testname12345.eth", 1, "0x0000000000000000000000000000000000000001");
      },
      Error,
      "PRIVATE_KEY"
    );
  } finally {
    // Restore original env
    if (originalRpcUrl) {
      Deno.env.set("RPC_URL", originalRpcUrl);
    } else {
      Deno.env.delete("RPC_URL");
    }
  }
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
