import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { PRODUCTS, type Product } from './data.js';

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

export function createShopServer() {
  const server = new McpServer({
    name: 'slopyfy-shop',
    version: '0.1.0',
  });

  const listProductsInput = z
    .object({
      query: z.string().min(1).optional(),
      category: z.enum(['tops', 'bottoms', 'outerwear', 'accessories', 'footwear']).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    })
    .partial();

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
