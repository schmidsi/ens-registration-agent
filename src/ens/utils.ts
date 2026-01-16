/**
 * Validate and return ENS name. Throws if name doesn't end with .eth.
 */
export function validateName(name: string): string {
  if (!name.endsWith(".eth")) {
    throw new Error("Name must end with .eth");
  }
  return name;
}

/**
 * Seconds in a year (365 days).
 */
export const SECONDS_PER_YEAR = 31536000;
