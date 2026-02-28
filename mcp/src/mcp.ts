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

const PRODUCT_CARDS_URI = 'ui://slopyfy/product-cards';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function productCardHtml(product: Product): string {
  return `
    <article class="product-card" data-product-id="${escapeHtml(product.id)}" style="
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
      overflow: hidden;
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 300px;
      transition: box-shadow 0.2s ease;
    ">
      <div style="padding: 1rem 1.25rem;">
        <span style="display: inline-block; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 0.35rem;">${escapeHtml(product.category)}</span>
        <h3 style="margin: 0 0 0.5rem; font-size: 1.1rem; font-weight: 700; color: #0f172a; line-height: 1.3;">${escapeHtml(product.name)}</h3>
        <p style="margin: 0 0 0.6rem; font-size: 0.85rem; color: #475569; line-height: 1.45;">${escapeHtml(product.description)}</p>
        <div style="font-size: 1.15rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem;">$${product.priceUsd}</div>
        <div style="font-size: 0.75rem; color: #64748b;">
          <span>Sizes: ${escapeHtml(product.sizes.join(', '))}</span>
          <span style="margin-left: 0.6rem;">Colors: ${escapeHtml(product.colors.join(', '))}</span>
        </div>
        <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.25rem;">In stock: ${product.inventory}</div>
      </div>
    </article>`;
}

function renderAllProductCardsHtml(products: Product[]): string {
  const cards = products.map((p) => productCardHtml(p)).join('\n');
  return `
    <div style="
      background: #f1f5f9;
      padding: 1.5rem;
      border-radius: 16px;
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <h2 style="margin: 0 0 1rem; font-size: 1.25rem; font-weight: 700; color: #0f172a;">Product catalog</h2>
      <div style="
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.25rem;
      ">
        ${cards}
      </div>
    </div>`;
}

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
      const normalizedQuery = query?.toLowerCase();
      let results = PRODUCTS.filter((product) => {
        const matchesQuery = normalizedQuery
          ? `${product.name} ${product.description}`.toLowerCase().includes(normalizedQuery)
          : true;
        const matchesCategory = category ? product.category === category : true;
        return matchesQuery && matchesCategory;
      });
      if (limit) results = results.slice(0, limit);
      const html = renderAllProductCardsHtml(results);
      return {
        content: [
          { type: 'text', text: `Showing ${results.length} product(s).` },
          {
            type: 'resource',
            resource: {
              uri: PRODUCT_CARDS_URI,
              mimeType: 'text/html',
              text: html,
            },
          },
        ],
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
