# Architecture Role Mapping

This repo has three main runtime roles.

## Role Map

```text
/frontend  -> Host UI / attempted MCP Apps host
/agent     -> Agent
/mcp       -> MCP server (shop backend)
```

## What Each Folder Means

### `/frontend`

This is the user-facing chat application.

It is responsible for:

- rendering the chat UI
- rendering tool-driven UI inside the chat
- handling browser-side interactions
- acting as the host-side UI runtime

In MCP Apps terms, this is the layer that most naturally wants to be the **MCP Apps host**.

That means it is the place that would ideally:

- receive tool results that reference UI
- fetch UI resources
- render them
- handle UI actions from embedded apps

## `/agent`

This is the agent runtime.

It is responsible for:

- interpreting user requests
- deciding which tool to call
- orchestrating tool usage
- producing the conversational flow

In this repo, the agent currently lives in Python and talks to the MCP server.

So this folder is the **agent** role, not the UI host.

## `/mcp`

This is the shop service exposed over MCP.

It is responsible for:

- defining tools such as `list_products` and `product_details`
- returning structured product data
- returning UI resources / app resources for product UIs

This is the **MCP server** role.

Conceptually, this is the remote shop backend.

Even though it is local code in this repo for development, in production this same role could run on a separate remote server.

## Important Distinction

The roles are different:

- **MCP server** provides tools and UI resources
- **Agent** decides when and how to use those tools
- **MCP Apps host** renders the UI resources and brokers UI interactions

They can live in the same runtime in some architectures, but they are not the same job.

## Current Architectural Tension

Right now, the role split is slightly awkward:

- `/frontend` renders the UI, so it behaves like the host
- `/agent` owns MCP connectivity, so it sits between the host and the MCP server

That means the MCP Apps host role is effectively split across two layers:

```text
UI rendering happens in /frontend
MCP access happens in /agent
```

This is why a fully standard MCP Apps flow is harder in the current setup.

The cleanest MCP Apps setup is usually:

```text
Host runtime and MCP connectivity live in the same runtime boundary
```

## Summary

Use this mental model for this repo:

```text
/frontend = host
/agent    = agent
/mcp      = remote shop MCP server
```
