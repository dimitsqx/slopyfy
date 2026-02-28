# Serving HTML From an Agent With `mcp-ui`

The simplest setup is:

Your agent returns a structured `UIResource` object containing HTML, and your frontend chat app renders that object with `@mcp-ui/client`.

`mcp-ui` is a contract between:

1. The backend or agent that emits UI resources
2. The frontend host that knows how to render them

For this use case, start with the `rawHtml` path. It has the fewest moving parts.

## Mental Model

On the agent side, instead of returning only plain text, return something like:

```ts
{
  type: 'resource',
  resource: {
    uri: 'ui://my-widget/123',
    mimeType: 'text/html',
    text: '<html><body><h1>Hello</h1></body></html>'
  }
}
```

On the frontend side, the chat app receives that object and passes `resource` into `UIResourceRenderer`:

```tsx
<UIResourceRenderer resource={item.resource} onUIAction={handleUIAction} />
```

`mcp-ui` renders the HTML in a sandboxed iframe.

## End-to-End Flow

1. User sends a chat message.
2. Your agent decides the response should include UI.
3. Your agent returns a `UIResource` with:
   - `uri`: must use `ui://...`
   - `mimeType: 'text/html'`
   - `text`: the HTML string
4. Your frontend chat app detects that this message item is a UI resource.
5. The frontend renders it with `@mcp-ui/client`.
6. If the HTML calls `window.parent.postMessage(...)`, the frontend can catch that through `onUIAction`.

The core architecture is:

- Server creates UI resources
- Client renders them
- Iframe and host communicate via `postMessage`

## What You Need To Implement

Backend or agent:

- Return a UI resource object in the response payload.
- If you use the TypeScript SDK, `createUIResource()` builds the correct shape for you.
- If not, you can still manually emit the same JSON shape.

Frontend chat app:

- Install `@mcp-ui/client`
- When a message item is a UI resource, render it with `UIResourceRenderer`
- Implement `onUIAction` if the embedded HTML needs to trigger actions back in the host

## Minimal Backend Example

Using `@mcp-ui/server`:

```ts
import { createUIResource } from '@mcp-ui/server';

const card = createUIResource({
  uri: 'ui://demo/card-1',
  content: {
    type: 'rawHtml',
    htmlString: `
      <html>
        <body>
          <h2>Welcome</h2>
          <button onclick="window.parent.postMessage({ type: 'tool', payload: { toolName: 'doSomething', params: { id: 1 } } }, '*')">
            Run action
          </button>
        </body>
      </html>
    `,
  },
  encoding: 'text',
});
```

Then include that object in the content your agent returns.

## Minimal Frontend Example

```tsx
import { UIResourceRenderer } from '@mcp-ui/client';

function ChatMessage({ item }) {
  if (item?.type === 'resource' && item.resource?.uri?.startsWith('ui://')) {
    return (
      <UIResourceRenderer
        resource={item.resource}
        onUIAction={async (action) => {
          if (action.type === 'tool') {
            console.log('UI requested tool:', action.payload.toolName, action.payload.params);
            return { ok: true };
          }
          return { ignored: true };
        }}
      />
    );
  }

  return <div>{item.text}</div>;
}
```

## Important Constraints

- The HTML is rendered in an iframe, not injected directly into your chat DOM.
- That is good for isolation and security.
- Interactive HTML should communicate with the host via `window.parent.postMessage(...)`.
- If you need to embed an external app instead of inline HTML, use `mimeType: 'text/uri-list'` instead of `text/html`.

## Practical Recommendation

Start with this exact scope:

1. Make your agent return one static `text/html` UI resource.
2. Make your chat frontend detect and render it with `UIResourceRenderer`.
3. Add one button inside the HTML that posts a `tool` message.
4. Wire `onUIAction` in the frontend and confirm the round-trip works.

Once that works, you can decide whether to stay with raw HTML or move to `remote-dom` for tighter host-native integration.

## Reference Docs

- `UIResource` structure: <https://raw.githubusercontent.com/idosal/mcp-ui/main/docs/src/guide/introduction.md>
- Client renderer: <https://raw.githubusercontent.com/idosal/mcp-ui/main/docs/src/guide/client/resource-renderer.md>
- HTML rendering and `onUIAction`: <https://raw.githubusercontent.com/idosal/mcp-ui/main/docs/src/guide/client/html-resource.md>
- TypeScript server examples: <https://raw.githubusercontent.com/idosal/mcp-ui/main/docs/src/guide/server/typescript/usage-examples.md>
- Iframe messaging protocol: <https://raw.githubusercontent.com/idosal/mcp-ui/main/docs/src/guide/embeddable-ui.md>
