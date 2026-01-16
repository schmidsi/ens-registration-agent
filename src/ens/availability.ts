/**
 * Check if an ENS name is available for registration.
 * @param name - The ENS name to check (with or without .eth suffix)
 * @returns true if the name is available, false otherwise
 */
export async function checkAvailability(_name: string): Promise<boolean> {
  // TODO: Implement using ensjs
  throw new Error("Not implemented");
}
