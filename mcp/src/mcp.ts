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

const uiResourceOutput = z.object({
  uri: z.string(),
  mimeType: z.string(),
  text: z.string(),
});

const appOutput = z.object({
  name: z.string(),
  title: z.string(),
  resourceUri: z.string(),
});

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildProductCardHtml(product: Product) {
  const colorChips = product.colors
    .map(
      (color) =>
        `<span style="display:inline-block;padding:4px 8px;border-radius:999px;background:#f2f4f5;color:#334155;font-size:12px;">${escapeHtml(color)}</span>`,
    )
    .join('');

  const sizeText = escapeHtml(product.sizes.join(' · '));

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(product.name)}</title>
  </head>
  <body style="margin:0;padding:16px;background:#f7f7f2;font-family:Arial,sans-serif;color:#111827;">
    <article style="max-width:320px;border:1px solid #d6d3d1;border-radius:16px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,0.08);overflow:hidden;">
      <div style="padding:14px 16px;background:linear-gradient(135deg,#f5f5f4,#e7e5e4);border-bottom:1px solid #e7e5e4;">
        <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#57534e;">${escapeHtml(product.category)}</div>
        <h2 style="margin:8px 0 4px;font-size:20px;line-height:1.2;">${escapeHtml(product.name)}</h2>
        <p style="margin:0;font-size:14px;color:#44403c;">${escapeHtml(product.description)}</p>
      </div>
      <div style="padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;">
          <div>
            <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Price</div>
            <div style="font-size:24px;font-weight:700;">$${product.priceUsd}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Stock</div>
            <div style="font-size:14px;color:#1f2937;">${product.inventory} left</div>
          </div>
        </div>
        <div style="margin-top:14px;">
          <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Colors</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">${colorChips}</div>
        </div>
        <div style="margin-top:14px;">
          <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Sizes</div>
          <div style="margin-top:6px;font-size:14px;color:#1f2937;">${sizeText}</div>
        </div>
        <button
          type="button"
          onclick="window.parent.postMessage({ type: 'tool', payload: { toolName: 'select_product', params: { productId: '${escapeHtml(product.id)}' } } }, '*')"
          style="margin-top:16px;width:100%;border:0;border-radius:10px;padding:12px 14px;background:#111827;color:#fff;font-size:14px;font-weight:600;cursor:pointer;"
        >
          Select product
        </button>
      </div>
    </article>
  </body>
</html>`;
}

function buildProductCardResource(product: Product) {
  return {
    type: 'resource' as const,
    resource: {
      uri: `ui://product-card/${product.id}`,
      mimeType: 'text/html',
      text: buildProductCardHtml(product),
    },
  };
}

function buildProductCardApp(product: Product) {
  return {
    name: 'product-card',
    title: product.name,
    resourceUri: `ui://product-card/${product.id}`,
  };
}

function buildProductDetailsHtml(product: Product) {
  const colorItems = product.colors
    .map(
      (color) =>
        `<li style="margin:0;padding:0;color:#374151;font-size:14px;">${escapeHtml(color)}</li>`,
    )
    .join('');

  const sizeItems = product.sizes
    .map(
      (size) =>
        `<li style="margin:0;padding:0;color:#374151;font-size:14px;">${escapeHtml(size)}</li>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(product.name)} Details</title>
  </head>
  <body style="margin:0;padding:16px;background:#f7f7f2;font-family:Arial,sans-serif;color:#111827;">
    <article style="max-width:420px;border:1px solid #d6d3d1;border-radius:18px;background:#fff;box-shadow:0 10px 28px rgba(15,23,42,0.08);overflow:hidden;">
      <div style="padding:16px 18px;background:linear-gradient(135deg,#111827,#374151);color:#fff;">
        <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#d1d5db;">${escapeHtml(product.category)}</div>
        <h2 style="margin:8px 0 4px;font-size:22px;line-height:1.2;">${escapeHtml(product.name)}</h2>
        <p style="margin:0;font-size:14px;line-height:1.5;color:#e5e7eb;">${escapeHtml(product.description)}</p>
      </div>
      <div style="padding:18px;">
        <div style="display:flex;justify-content:space-between;gap:12px;">
          <div style="padding:12px 14px;border-radius:12px;background:#f5f5f4;flex:1;">
            <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Price</div>
            <div style="margin-top:4px;font-size:24px;font-weight:700;color:#111827;">$${product.priceUsd}</div>
          </div>
          <div style="padding:12px 14px;border-radius:12px;background:#f5f5f4;flex:1;">
            <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Inventory</div>
            <div style="margin-top:4px;font-size:18px;font-weight:700;color:#111827;">${product.inventory} left</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px;">
          <section>
            <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Available colors</div>
            <ul style="margin:8px 0 0;padding-left:18px;">${colorItems}</ul>
          </section>
          <section>
            <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">Available sizes</div>
            <ul style="margin:8px 0 0;padding-left:18px;">${sizeItems}</ul>
          </section>
        </div>
        <button
          type="button"
          onclick="window.parent.postMessage({ type: 'tool', payload: { toolName: 'add_to_cart', params: { productId: '${escapeHtml(product.id)}', name: '${escapeHtml(product.name)}', priceUsd: ${product.priceUsd} } } }, '*')"
          style="margin-top:18px;width:100%;border:0;border-radius:12px;padding:13px 14px;background:#111827;color:#fff;font-size:14px;font-weight:600;cursor:pointer;"
        >
          Add to cart
        </button>
      </div>
    </article>
  </body>
</html>`;
}

function buildProductDetailsResource(product: Product) {
  return {
    type: 'resource' as const,
    resource: {
      uri: `ui://product-details/${product.id}`,
      mimeType: 'text/html',
      text: buildProductDetailsHtml(product),
    },
  };
}

function buildProductDetailsApp(product: Product) {
  return {
    name: 'product-details',
    title: `${product.name} details`,
    resourceUri: `ui://product-details/${product.id}`,
  };
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
        apps: z.array(appOutput),
        resources: z.array(uiResourceOutput),
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

      const resources = results.map((product) => buildProductCardResource(product).resource);
      const apps = results.map((product) => buildProductCardApp(product));
      const payload = { products: results, apps, resources };

      return {
        content: [
          ...resources.map((resource) => ({
            type: 'resource' as const,
            resource,
          })),
          {
            type: 'text',
            text: JSON.stringify(payload),
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
        app: appOutput.nullable(),
        resources: z.array(uiResourceOutput),
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
          structuredContent: { product: null, app: null, resources: [] },
        };
      }

      const resource = buildProductDetailsResource(product);
      const app = buildProductDetailsApp(product);
      const payload = {
        product,
        app,
        resources: [resource.resource],
      };

      return {
        content: [
          resource as any,
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
    'sample_product_card',
    {
      title: 'Sample product card',
      description: 'Return a lightweight inline HTML product card as a UI resource.',
      inputSchema: z.object({
        productId: z.string().min(1).optional(),
      }),
      outputSchema: z.object({
        product: productOutput,
        app: appOutput,
        resources: z.array(uiResourceOutput),
      }),
    },
    async ({ productId }) => {
      const product = productId
        ? PRODUCTS.find((item) => item.id === productId) ?? PRODUCTS[0]
        : PRODUCTS[0];

      const resource = buildProductCardResource(product);
      const app = buildProductCardApp(product);
      const payload = {
        product,
        app,
        resources: [resource.resource],
      };

      return {
        content: [
          resource as any,
          {
            type: 'text',
            text: JSON.stringify(payload),
          },
        ],
        structuredContent: payload,
      };
    },
  );

  return server;
}
