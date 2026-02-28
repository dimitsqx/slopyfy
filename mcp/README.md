# slopyfy

V1 MCP prototype for a clothing shop.

## Quickstart (stdio)
1. Install deps
2. Run client (it will spawn the server via stdio)

```bash
npm install
npm run dev:client
```

## Quickstart (HTTP MCP server)
1. Start the server
2. Run the client with `--url`

```bash
npm install
npm run dev:http
```

```bash
npm run dev:client -- --url http://127.0.0.1:3333/mcp
```

## Scripts
- `npm run dev:server` starts the MCP server on stdio.
- `npm run dev:http` starts the MCP server over Streamable HTTP on `/mcp`.
- `npm run dev:client` runs a minimal CLI agent that calls `list_products` and `product_details`.
- `npm run build` compiles to `dist/`.
- `npm run start:server` runs compiled server.
- `npm run start:http` runs compiled HTTP server.
- `npm run start:client` runs compiled client.

## MCP tools
- `list_products` optional filters: `query`, `category`, `limit`
- `product_details` argument: `productId`
- `sample_product_card` optional argument: `productId`, returns an inline `text/html` UI resource for a lightweight product card
