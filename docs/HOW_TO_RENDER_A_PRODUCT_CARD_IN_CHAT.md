# How To Render a Product Card in Chat

This project renders a product card in chat by sending inline HTML from the MCP server and teaching the frontend chat UI to render that tool result as an `iframe`.

## Flow

1. The MCP tool returns a product payload and a `uiResource`.
2. The MCP tool also includes the same payload as JSON text in the tool result.
3. The agent passes that tool result through to the chat runtime.
4. The frontend chat uses a custom `RenderResultMessage` hook.
5. That renderer parses the JSON, extracts `uiResource`, and renders the HTML in a sandboxed `iframe`.

## MCP Side

The MCP tool is `sample_product_card` in [mcp.ts](/Users/adilet/hackmistral/slopyfy/mcp/src/mcp.ts).

It returns:

- A native MCP `resource` block with:
  - `type: "resource"`
  - `resource.uri`: `ui://product-card/...`
  - `resource.mimeType`: `text/html`
  - `resource.text`: the HTML string
- A text block containing `JSON.stringify(payload)`
- `structuredContent` containing the same payload

The important detail in this stack is that the frontend renderer is reading the tool message text, so the text block must contain JSON, not a plain sentence.

The payload shape is:

```json
{
  "product": {
    "id": "tee-001",
    "name": "Nimbus Cotton Tee"
  },
  "uiResource": {
    "uri": "ui://product-card/tee-001",
    "mimeType": "text/html",
    "text": "<!DOCTYPE html>..."
  }
}
```

## Frontend Side

The chat renderer lives in [ChatShell.tsx](/Users/adilet/hackmistral/slopyfy/frontend/app/ChatShell.tsx).

It passes a custom `RenderResultMessage` into `CopilotSidebar`:

```tsx
<CopilotSidebar
  defaultOpen
  instructions="You are a shopping assistant. When the user asks to show a product card, call sample_product_card."
  RenderResultMessage={ProductCardResultMessage}
/>
```

`ProductCardResultMessage` does this:

1. Reads `message.content`
2. Parses it as JSON
3. Looks for `uiResource`
4. If `uiResource.mimeType === "text/html"`, renders `uiResource.text` in an `iframe`
5. Listens for `window.postMessage` events from that iframe

The iframe is sandboxed:

```tsx
<iframe
  srcDoc={html}
  sandbox="allow-scripts allow-same-origin allow-forms"
/>
```

## Why This Works

In this repo's current agent/chat bridge, CopilotKit is exposing tool result text to `RenderResultMessage`, not the original MCP `structuredContent`.

That means:

- If the tool returns only a human-readable sentence, the frontend has nothing machine-readable to parse.
- If the tool returns JSON text, the frontend can parse it and render the UI.

## How To Add Another Chat-Rendered UI

To add another UI card or widget:

1. Create a new MCP tool that builds a `uiResource` with inline HTML.
2. Put that `uiResource` inside a payload object.
3. Return the payload as:
   - a `resource` content block
   - a text content block using `JSON.stringify(payload)`
   - `structuredContent`
4. Update the frontend result renderer to detect the new payload shape.
5. Render the HTML in a sandboxed `iframe`.

## Testing

1. Restart the MCP server after changing `mcp/src/mcp.ts`.
2. Restart the Python agent so it refreshes the MCP tool schema.
3. Restart the frontend if needed.
4. In chat, ask: `show me a product card`

If the UI renders correctly, you should see the embedded product card instead of a plain text summary or HTML code block.
