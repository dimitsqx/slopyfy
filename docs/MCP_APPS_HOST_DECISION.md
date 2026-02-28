# MCP Apps Host Decision

## Decision

We are keeping the runtime split and moving toward this architecture:

```text
MCP server -> Python agent -> Next runtime (MCP Apps host) -> Frontend
```

## Why This Matches Our Constraints

Our constraints are:

- the MCP server is a remote shop and should be treated like an external system
- the agent should not need to know shop implementation details
- the UI components should be implemented by the MCP side
- the chat product should render those MCP-provided UIs and interact with them

This architecture preserves that model:

- `/mcp` stays the remote shop role
- `/agent` stays the agent-facing integration layer
- `/frontend` becomes the browser-facing app host layer

## Role Split

```text
/mcp       = remote shop MCP server
/agent     = agent + MCP access layer
/frontend  = MCP Apps host surface + browser UI
```

## Important Distinction

The **MCP server** provides:

- tools
- resources
- UI implementations

The **MCP Apps host** is responsible for:

- rendering MCP-provided UI
- fetching UI resources
- receiving UI events
- proxying app actions back upstream

The **agent** is responsible for:

- deciding what tool to call
- orchestrating the workflow

These are different jobs.

## Why We Are Not Collapsing Everything Into Next

We are not moving the whole agent into the Next runtime because:

- the agent is already implemented in Python
- the agent should remain implementation-agnostic about the shop backend
- the remote MCP server should remain behind the agent-facing integration layer

So instead of changing that ownership model, we are introducing an explicit bridge:

```text
Next runtime renders apps
Python agent provides/proxies app data and app operations
Python agent talks to the remote MCP server
```

## What Python Must Provide

For Next to behave as the browser-facing MCP Apps host while Python keeps MCP access, Python must provide a host-facing bridge for:

1. app metadata
2. resource fetches
3. tool-call proxying

That means Next cannot be a full host by itself unless Python exposes enough capability for:

- `resources/read`
- `tools/call`
- app/session correlation

## Practical Implementation Direction

We are implementing this in stages:

1. Keep tool invocation through the Python agent.
2. Let tool results include app references / app-ready payloads.
3. Add explicit API endpoints on the Python side for:
   - reading app resources
   - proxying app tool calls
4. Let the Next runtime call those endpoints when embedded UI requests them.
5. Keep the frontend as the browser-rendered chat surface.

## Summary

The chosen direction is:

```text
Remote MCP server stays remote
Python agent keeps MCP connectivity
Next runtime becomes the browser-facing MCP app host layer
Frontend remains the visual chat surface
```

This is a split-host design, not the single-runtime design from the CopilotKit article, but it matches the current repo structure and our product constraints.
