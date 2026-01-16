import { assertEquals, assertGreater, assertRejects } from "@std/assert";
import { getRegistrationPrice } from "../src/ens/pricing.ts";

Deno.test("getRegistrationPrice returns price for 1 year registration", async () => {
  const result = await getRegistrationPrice("test12345.eth", 1);

  // Price should be a positive bigint
  assertGreater(result.base, 0n);
  assertEquals(typeof result.base, "bigint");
  assertEquals(typeof result.premium, "bigint");
});

Deno.test("getRegistrationPrice throws for name without .eth suffix", async () => {
  await assertRejects(
    async () => {
      await getRegistrationPrice("test12345", 1);
    },
    Error,
    ".eth"
  );
});

Deno.test("getRegistrationPrice returns higher price for shorter names", async () => {
  const longName = await getRegistrationPrice("longtestname.eth", 1);
  const shortName = await getRegistrationPrice("abc.eth", 1); // 3-letter names are more expensive

  // 3-letter names should be more expensive than 10+ letter names
  assertGreater(shortName.base, longName.base);
});
