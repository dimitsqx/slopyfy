# Slopyfy
An online shop that uses interactive agent actions to guide customers through
personalized shopping journeys.

## Overview
Slopyfy combines a storefront experience with an AI shopping assistant. The
assistant can be hosted on Amazon Bedrock, personalized per user, and invoked
through interactive actions in the shop to recommend products, answer questions,
and streamline checkout.


## Agent Capabilities
- Personalized shopping assistant for each user.
- Interactive actions embedded in the shopping flow.
- Deployable on Amazon Bedrock for scalable hosting.

## Development
### MCP
`npm run dev:http`

### Agent
`uv run --env-file "../.env" app.py`

### Frontend
`npm run dev`