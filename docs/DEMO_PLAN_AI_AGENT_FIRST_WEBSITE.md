# Demo Plan: AI-Agent-First Website Over MCP

## Demo Goal

Show that a website can be designed for AI agents first:

1. The website exposes its capabilities through MCP.
2. The AI agent runs remotely on a separate machine.
3. The agent uses MCP to discover and operate the website.
4. The website sends UI components back through MCP.
5. The agent chat renders those UI components.
6. The user interacts with the UI inside chat, not by navigating the site manually.

The key message is:

`The website is no longer just a page for humans. It is an MCP-native application that an AI agent can operate and surface as interactive UI.`

## Core Story

The strongest narrative is not "we built a shopping chatbot."

It is:

`We turned a website into an agent-operable system.`

The demo should make that obvious:

- The website owns the business logic and UI components.
- The AI agent is remote and generic.
- The website exposes tools and UI via MCP.
- The chat becomes the user's interface to the website.

That is the wow.

## Demo Architecture

### Actors

1. **Website / App**
   - Owns products, product details, cart, checkout logic
   - Exposes MCP tools
   - Returns UI resources (HTML cards, lists, checkout views)

2. **Remote AI Agent**
   - Runs on a separate machine
   - Connects to the website's MCP endpoint
   - Calls tools and relays UI responses into chat

3. **Frontend Chat Host**
   - Renders the agent chat
   - Renders MCP-provided UI components inline
   - Handles UI interactions (buttons, cart state, follow-up actions)

### MCP Responsibilities

The MCP layer should be clearly positioned as the website interface for agents:

- `list_products`
- `product_details`
- `sample_product_card`
- future:
  - `view_cart`
  - `checkout_summary`
  - `complete_checkout`

Each tool can return:

- structured data
- MCP `resource` blocks
- JSON payloads that the chat host can render as UI

## What Creates the "Wow" Effect

### 1. The agent is remote

The audience should understand quickly:

- the agent is not embedded in the website
- the website is exposed over MCP
- the agent can be anywhere

This makes the architecture feel real and extensible, not like a local toy.

### 2. UI comes from the website, not hardcoded in the chat app

The strongest technical moment:

- the website returns a product card
- the chat renders it live
- the button works

That proves the UI is being sent over MCP as part of the application protocol.

### 3. The user can transact inside chat

This is where it feels magical:

- list products
- render cards
- add to cart
- select product
- view details
- move toward checkout

The user never leaves the conversation, but still uses real app functionality.

### 4. The agent uses the website as an interface, not just a data source

This is a subtle but important distinction:

- not just "agent reads catalog data"
- but "agent can operate the site's workflows and render its UI"

That makes the system feel like an agent-native application.

## Best Demo Flow

Keep the flow fast, visual, and progressive.

### Phase 1: Establish the Architecture

Open with a simple explanation:

1. This website exposes itself over MCP.
2. The AI agent is running on another machine.
3. The chat connects to that agent.
4. The agent uses the website through MCP.

Then immediately prove it with a tool-backed interaction.

### Phase 2: Catalog Interaction

Prompt:

`Show me the catalog`

Expected result:

- Agent calls `list_products`
- Chat renders a list of product cards
- Cards are interactive

This is the first "oh, this is different" moment.

### Phase 3: Detail Interaction From UI

User clicks:

`Select product`

Expected result:

- The card sends a message to the host
- The host injects a chat message
- Agent calls `product_details`
- Chat shows product details

This demonstrates that UI rendered from MCP can drive new agent actions.

### Phase 4: Cart Interaction

User clicks:

`Add to cart`

Expected result:

- Frontend stores cart state locally
- UI confirms item count
- User can add multiple items from multiple cards

This creates a tangible stateful workflow.

### Phase 5: Agent-Aware Checkout

Prompt:

`Checkout`

Expected result:

- Frontend reads cart state
- Agent is given the cart context
- Agent calls a checkout-related MCP tool
- Chat renders a checkout summary or confirmation UI

This is the strongest closing move because it shows:

- state
- workflow
- UI
- agent coordination

all in one interaction.

## Recommended Demo Script

### Opening

`This is an AI-agent-first website. The site exposes itself over MCP, and the AI agent is running remotely. Instead of hardcoding business logic into the chatbot, the agent uses the website as an MCP application.`

### Step 1

`Show me the catalog`

Talk track:

`The agent is calling the website's MCP tools, and the website is sending UI components back, not just text.`

### Step 2

Click `Select product`

Talk track:

`This button came from the website's MCP-delivered UI. Clicking it triggers a host-side action, which sends a new instruction through the agent.`

### Step 3

Click `Add to cart`

Talk track:

`Now the user is building state directly from within the chat interface.`

### Step 4

`Checkout`

Talk track:

`The agent can now complete a workflow using both conversational context and application state.`

### Closing

`This is the shift: the website is no longer just something an agent reads. It is something an agent can operate, render, and transact through.`

## Features To Prioritize For The Demo

### Must Have

1. Product list rendered as cards
2. Product detail flow triggered from a card click
3. Add to cart stored locally
4. Checkout command that uses cart state

### Should Have

1. A rendered cart summary
2. A rendered checkout summary card
3. Clear visual confirmation after each action

### Nice To Have

1. Quantity editing in chat
2. Remove from cart
3. A success confirmation UI after checkout

## Demo Risks

### Risk: It looks like a normal chatbot

Mitigation:

- Emphasize that the agent is remote
- Emphasize that the website exposes MCP tools
- Show the UI cards rendering from tool results

### Risk: Too much text, not enough interaction

Mitigation:

- Use short prompts
- Prefer clicks over long typed instructions
- Keep the sequence visual

### Risk: The audience misses why MCP matters

Mitigation:

- Explicitly say the website is exposing business logic and UI through MCP
- Treat MCP as the application interface layer, not just a transport

## Concrete Next Build Steps

1. Add a `view_cart` flow that renders cart contents in chat.
2. Add a `checkout_summary` MCP tool that returns a checkout UI component.
3. Add a frontend path that reads `localStorage` cart state and includes it when the user says `checkout`.
4. Add one polished end-state UI for purchase confirmation.
5. Tighten agent instructions so catalog, details, cart, and checkout are deterministic during the demo.

## Ideal End State

By the end of the demo, the audience should believe:

- the website can be consumed by agents through MCP
- the agent can render app-native UI in chat
- the user can interact with that UI
- the agent can complete real workflows without the user browsing the traditional site

That is the product story worth demonstrating.
