/**
 * Test setup and environment validation.
 * Import this at the top of each test file.
 */

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    console.error(`
╔════════════════════════════════════════════════════════════════╗
║                    MISSING ENVIRONMENT VARIABLE                ║
╠════════════════════════════════════════════════════════════════╣
║  ${name.padEnd(60)} ║
╠════════════════════════════════════════════════════════════════╣
║  To run tests:                                                 ║
║                                                                ║
║  1. Copy the example env file:                                 ║
║     cp .env.example .env                                       ║
║                                                                ║
║  2. Edit .env and set:                                         ║
║     ${name}=<your-value>
║                                                                ║
║  3. Load env and run tests:                                    ║
║     source .env && deno task test                              ║
║                                                                ║
║  Or run with env inline:                                       ║
║     ${name}=<value> deno task test
╚════════════════════════════════════════════════════════════════╝
`);
    throw new Error(`${name} environment variable is required to run tests`);
  }
  return value;
}

/**
 * Validates that RPC_URL is configured.
 * Required for availability and pricing tests.
 */
export function requireRpcUrl(): string {
  return requireEnv("RPC_URL");
}

/**
 * Validates that PRIVATE_KEY is configured.
 * Required for registration tests.
 */
export function requirePrivateKey(): string {
  return requireEnv("PRIVATE_KEY");
}
