import { assertEquals, assertRejects } from "@std/assert";
import { checkAvailability } from "../src/ens/availability.ts";

Deno.test("checkAvailability returns true for unregistered name", async () => {
  // This name is extremely unlikely to be registered
  const result = await checkAvailability("thisisaverylongnamethatnobodywouldeverbuy12345.eth");
  assertEquals(result, true);
});

Deno.test("checkAvailability returns false for registered name", async () => {
  // vitalik.eth is definitely registered
  const result = await checkAvailability("vitalik.eth");
  assertEquals(result, false);
});

Deno.test("checkAvailability throws for name without .eth suffix", async () => {
  await assertRejects(
    async () => {
      await checkAvailability("vitalik");
    },
    Error,
    ".eth"
  );
});
