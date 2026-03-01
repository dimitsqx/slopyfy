import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';
import { PRODUCTS, type Product } from './data.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const productOutput = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['tops', 'bottoms', 'outerwear', 'accessories', 'footwear']),
  priceUsd: z.number(),
  sizes: z.array(z.string()),
  colors: z.array(z.string()),
  description: z.string(),
  inventory: z.number(),
});

const PRODUCT_CARDS_URI = 'ui://slopyfy/product-cards.html';
const PRODUCT_CARDS_HTML_PATH = path.join(process.cwd(), 'dist-app', 'index.html');

async function loadProductCardsHtml(): Promise<string> {
  try {
    return await readFile(PRODUCT_CARDS_HTML_PATH, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Slopyfy Product Cards</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 0; padding: 1.5rem; }
      .notice { background: #fff4f4; border: 1px solid #fecaca; border-radius: 12px; padding: 1rem; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    </style>
  </head>
  <body>
    <div class="notice">
      <strong>Product cards app bundle missing.</strong>
      <p>Run <code>npm run build:app</code> in <code>mcp/</code>.</p>
      <p>Error: ${message}</p>
    </div>
  </body>
</html>`;
  }
}

function filterProducts({
  query,
  category,
  limit,
}: {
  query?: string;
  category?: Product['category'];
  limit?: number;
}): Product[] {
  const normalizedQuery = query?.toLowerCase();
  let results = PRODUCTS.filter((product) => {
    const matchesQuery = normalizedQuery
      ? `${product.name} ${product.description}`.toLowerCase().includes(normalizedQuery)
      : true;
    const matchesCategory = category ? product.category === category : true;
    return matchesQuery && matchesCategory;
  });

  if (limit) {
    results = results.slice(0, limit);
  }

  return results;
}

export function createShopServer() {
  const server = new McpServer({
    name: 'slopyfy-shop',
    version: '0.1.0',
  });

  registerAppResource(
    server,
    'Product cards UI',
    PRODUCT_CARDS_URI,
    {
      description: 'Interactive product catalog app.',
      mimeType: RESOURCE_MIME_TYPE,
    },
    async () => {
      const html = await loadProductCardsHtml();
      return {
        contents: [
          {
            uri: PRODUCT_CARDS_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
          },
        ],
      };
    },
  );

  const listProductsInput = z.object({
    query: z.string().min(1).optional(),
    category: z.enum(['tops', 'bottoms', 'outerwear', 'accessories', 'footwear']).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  });

  server.registerTool(
    'list_products',
    {
      title: 'List products',
      description: 'List products in the clothing shop. Optional filters: query, category, limit.',
      inputSchema: listProductsInput,
      outputSchema: z.object({
        products: z.array(productOutput),
      }),
    },
    async ({ query, category, limit }) => {
      const results = filterProducts({ query, category, limit });

      const payload = { products: results };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload, null, 2),
          },
        ],
        structuredContent: payload,
      };
    },
  );

  server.registerTool(
    'show_product_cards',
    {
      title: 'Show product cards',
      description:
        'Returns product cards as HTML UI. Use when the user wants to see products displayed as cards. Optional filters: query, category, limit.',
      inputSchema: listProductsInput,
      outputSchema: z.object({
        products: z.array(productOutput),
      }),
    },
    async ({ query, category, limit }) => {
      const results = filterProducts({ query, category, limit });
      return {
        content: [
          { type: 'text', text: `Showing ${results.length} product(s).` },
        ],
        _meta: {
          ui: {
            resourceUri: PRODUCT_CARDS_URI,
          },
        },
        structuredContent: { products: results },
      };
    },
  );

  server.registerTool(
    'product_details',
    {
      title: 'Product details',
      description: 'Get details for a single product by id.',
      inputSchema: z.object({
        productId: z.string().min(1),
      }),
      outputSchema: z.object({
        product: productOutput.nullable(),
      }),
    },
    async ({ productId }) => {
      const product: Product | undefined = PRODUCTS.find((item) => item.id === productId);

      if (!product) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Product not found: ${productId}`,
            },
          ],
          structuredContent: { product: null },
        };
      }

      const payload = { product };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload, null, 2),
          },
        ],
        structuredContent: payload,
      };
    },
  );

  return server;
}
