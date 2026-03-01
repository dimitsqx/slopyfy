# Live Filtering Progress

This document captures the current implementation state of the isolated `/live-filtering` prototype.

## Scope Boundary

- The root route `/` remains separate from this feature.
- The live filtering prototype is mounted at `/live-filtering`.
- Styling for the prototype is loaded through the route-local layout under `app/live-filtering/`.
- The root layout does not import `globals.css`, to avoid interfering with the existing Copilot/root UI.

## Implemented

### Separate Prototype Route

- `app/live-filtering/page.tsx` exists and renders the live filtering prototype.
- `app/live-filtering/layout.tsx` exists and imports `app/live-filtering/live-filtering.css`.
- `app/live-filtering/live-filtering.css` currently imports Tailwind for the prototype route only.

### Typed Streaming Filtering

- The prototype supports typed transcript input.
- Input is re-parsed on a short debounce.
- Deterministic parsing runs locally on the client.
- The in-memory catalog is filtered immediately based on the parsed result.

### Deterministic Parsing

The parser currently supports:

- category
- max price
- currency
- gender
- size
- color

The parser recomputes from the full transcript each time instead of mutating incremental state token-by-token.

### Cerebras Integration

- A dedicated API route exists at `app/api/live-filtering/interpret/route.ts`.
- The route targets Cerebras `llama3.1-8b`.
- The request asks for strict JSON schema output.
- The UI now has a toggle:
  - off: local deterministic parsing only
  - on: always call Cerebras for interpretation

### Debug UI

The `/live-filtering` page currently shows:

- raw transcript
- active source (`deterministic` or `cerebras`)
- parsed filters
- raw Cerebras response
- filtered product table

### Product Display

- The product list is rendered as a table for easier debugging.
- Each row is a product.
- Columns show the filterable attributes:
  - Product
  - Category
  - Price
  - Gender
  - Sizes
  - Colors
- Table cell borders were strengthened for visibility.

## Important Environment Note

- `CEREBRAS_API_KEY` is read by the Next app in `frontend/`.
- For local development, the key should be placed in `frontend/.env.local`.
- A repo-root `.env` file is not automatically used by the `frontend` Next app.

## Validation Status

The current stage has been checked with:

- `npm run lint`
- `npx next typegen`
- `npx tsc --noEmit`

## Known Constraints

- The root page still uses Tailwind utility classes, so Tailwind cannot be removed globally without affecting `/`.
- To avoid impacting the root UI, the prototype uses route-local styling instead of root-level styling.
- If Cerebras mode is enabled and no API key is available to the `frontend` app, the UI will show the configuration error from the API route.

## Suggested Commit Meaning

This checkpoint represents:

- isolated `/live-filtering` route in place
- local typed filtering working
- optional Cerebras-backed interpretation path wired
- debug-oriented table view for inspecting filtered catalog results
