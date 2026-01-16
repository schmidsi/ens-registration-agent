import { assertEquals, assertGreater } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getRegistrationPrice } from "../src/ens/pricing.ts";

Deno.test("getRegistrationPrice returns price for 1 year registration", async () => {
  const result = await getRegistrationPrice("test12345.eth", 1);

  // Price should be a positive bigint
  assertGreater(result.base, 0n);
  assertEquals(typeof result.base, "bigint");
  assertEquals(typeof result.premium, "bigint");
});

Deno.test("getRegistrationPrice handles name without .eth suffix", async () => {
  const result = await getRegistrationPrice("test12345", 1);

  assertGreater(result.base, 0n);
});

Deno.test("getRegistrationPrice returns higher price for shorter names", async () => {
  const longName = await getRegistrationPrice("longtestname.eth", 1);
  const shortName = await getRegistrationPrice("abc.eth", 1); // 3-letter names are more expensive

  // 3-letter names should be more expensive than 10+ letter names
  assertGreater(shortName.base, longName.base);
});
