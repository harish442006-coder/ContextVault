import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { createMcpServer } from "./mcp-server.js";

const server = createMcpServer();

void serveStdio(() => server);

console.error(
  "ContextVault MCP server running on stdio"
);