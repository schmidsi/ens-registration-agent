import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { checkAvailability } from "./ens/availability.ts";
import { getRegistrationPrice } from "./ens/pricing.ts";
import { registerName } from "./ens/registration.ts";
import { formatEther } from "viem";

const server = new McpServer({
  name: "ens-agent",
  version: "0.1.0",
});

// Register the checkAvailability tool
server.tool(
  "checkAvailability",
  "Check if an ENS name is available for registration",
  {
    name: z.string().describe("The ENS name to check (with or without .eth suffix)"),
  },
  async ({ name }) => {
    try {
      const available = await checkAvailability(name);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ name, available }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: error instanceof Error ? error.message : "Unknown error",
            }),
          },
        ],
        isError: true,
      };
    }
  }
);

// Register the getRegistrationPrice tool
server.tool(
  "getRegistrationPrice",
  "Get the price for registering an ENS name for a specified duration",
  {
    name: z.string().describe("The ENS name to check (with or without .eth suffix)"),
    years: z.number().min(1).default(1).describe("Number of years to register for (default: 1)"),
  },
  async ({ name, years }) => {
    try {
      const price = await getRegistrationPrice(name, years);
      const totalWei = price.base + price.premium;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              name,
              years,
              baseWei: price.base.toString(),
              premiumWei: price.premium.toString(),
              totalWei: totalWei.toString(),
              totalEth: formatEther(totalWei),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: error instanceof Error ? error.message : "Unknown error",
            }),
          },
        ],
        isError: true,
      };
    }
  }
);

// Register the registerName tool
server.tool(
  "registerName",
  "Register an ENS name. Requires PRIVATE_KEY environment variable. This performs a two-step commit-reveal process and may take ~60 seconds.",
  {
    name: z.string().describe("The ENS name to register (with or without .eth suffix)"),
    years: z.number().min(1).default(1).describe("Number of years to register for (default: 1)"),
    owner: z.string().describe("Ethereum address that will own the name"),
  },
  async ({ name, years, owner }) => {
    try {
      const result = await registerName(name, years, owner);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              name: result.name,
              owner: result.owner,
              durationSeconds: result.duration,
              commitTxHash: result.commitTxHash,
              registerTxHash: result.registerTxHash,
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: error instanceof Error ? error.message : "Unknown error",
            }),
          },
        ],
        isError: true,
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ENS Agent MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  Deno.exit(1);
});
