import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { checkAvailability } from "./ens/availability.ts";

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
