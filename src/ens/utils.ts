/**
 * Normalize ENS name by ensuring it has .eth suffix.
 */
export function normalizeName(name: string): string {
  return name.endsWith(".eth") ? name : `${name}.eth`;
}

/**
 * Seconds in a year (365 days).
 */
export const SECONDS_PER_YEAR = 31536000;
