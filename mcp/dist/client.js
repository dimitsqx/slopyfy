import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createInterface } from 'node:readline/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const IS_DEV = process.argv.includes('--dev');
const urlFlagIndex = process.argv.findIndex((value) => value === '--url');
const MCP_URL = urlFlagIndex === -1 ? undefined : process.argv[urlFlagIndex + 1];
function getServerCommand() {
    if (IS_DEV) {
        return { command: 'npx', args: ['tsx', 'src/server.ts'] };
    }
    const distPath = resolve('dist/server.js');
    if (!existsSync(distPath)) {
        return { command: 'npx', args: ['tsx', 'src/server.ts'] };
    }
    return { command: process.execPath, args: [distPath] };
}
async function main() {
    const transport = MCP_URL
        ? new StreamableHTTPClientTransport(new URL(MCP_URL))
        : new StdioClientTransport(getServerCommand());
    const client = new Client({
        name: 'slopyfy-agent',
        version: '0.1.0',
    });
    await client.connect(transport);
    const listResult = await client.callTool({
        name: 'list_products',
        arguments: {},
    });
    const products = listResult.structuredContent
        .products;
    console.log('\nProducts:');
    products.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} (${product.id}) - $${product.priceUsd}`);
    });
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('\nChoose a product by number or id: ');
    rl.close();
    const trimmed = answer.trim();
    const byIndex = Number(trimmed);
    const selectedId = !Number.isNaN(byIndex) && byIndex > 0 && byIndex <= products.length
        ? products[byIndex - 1].id
        : trimmed;
    const detailResult = await client.callTool({
        name: 'product_details',
        arguments: { productId: selectedId },
    });
    if (detailResult.isError) {
        console.error('\nError:', detailResult.content?.[0]?.text ?? 'Unknown error');
        await client.close();
        return;
    }
    console.log('\nDetails:');
    console.log(JSON.stringify(detailResult.structuredContent, null, 2));
    await client.close();
}
main().catch((error) => {
    console.error('Client failed:', error);
    process.exit(1);
});
