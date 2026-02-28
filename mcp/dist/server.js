import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createShopServer } from './mcp.js';
const server = createShopServer();
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    console.error('MCP server failed to start:', error);
    process.exit(1);
});
