import os
from uuid import uuid4

from fastapi import HTTPException
from mcp.client.streamable_http import streamable_http_client
from pydantic import BaseModel
from strands import Agent
from strands.models import BedrockModel
from strands.tools.mcp import MCPClient
from ag_ui_strands import StrandsAgent, create_strands_app

# Suppress OpenTelemetry context warnings
os.environ["OTEL_SDK_DISABLED"] = "true"
os.environ["OTEL_PYTHON_DISABLED_INSTRUMENTATIONS"] = "all"

# MCP server URL (Streamable HTTP). Start with: npm run dev:http
MCP_URL = os.getenv("MCP_URL", "http://127.0.0.1:3333/mcp")

# Bedrock auth: boto3 reads AWS_BEARER_TOKEN_BEDROCK from the environment when set (Bedrock API key).
# Ensure .env is loaded before this runs and contains AWS_BEARER_TOKEN_BEDROCK and AWS_DEFAULT_REGION.
# Do not set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY when using the API key.
model = BedrockModel(
    model_id=os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-20250514-v1:0"),
    region_name=os.getenv("AWS_DEFAULT_REGION", "us-west-2"),
    temperature=0.3,
)

# Connect to the MCP server over Streamable HTTP (list_products, product_details, sample_product_card, etc.)
mcp_client = MCPClient(
    transport_callable=lambda: streamable_http_client(MCP_URL),
    startup_timeout=30,
)

agent = Agent(
    model=model,
    tools=[mcp_client],
    system_prompt="You are a helpful AI assistant. Use the MCP tools (e.g. list_products, product_details, sample_product_card) when the user asks about products or wants a product card UI.",
)
# Wrap with AG-UI integration
agui_agent = StrandsAgent(
    agent=agent,
    name="strands_agent",
)


class ReadResourceRequest(BaseModel):
    uri: str


class ToolCallRequest(BaseModel):
    name: str
    arguments: dict[str, object] | None = None


def _to_jsonable(value):
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    if isinstance(value, dict):
        return {key: _to_jsonable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_to_jsonable(item) for item in value]
    return value


# Create the FastAPI app
app = create_strands_app(agui_agent, "/")


@app.post("/mcp-apps/resources/read")
def read_mcp_app_resource(payload: ReadResourceRequest):
    try:
        result = mcp_client.read_resource_sync(payload.uri)
        return _to_jsonable(result)
    except Exception as exc:  # pragma: no cover - integration path
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/mcp-apps/tools/call")
def call_mcp_app_tool(payload: ToolCallRequest):
    try:
        result = mcp_client.call_tool_sync(
            tool_use_id=f"mcp-app-host-{uuid4()}",
            name=payload.name,
            arguments=payload.arguments,
        )
        return _to_jsonable(result)
    except Exception as exc:  # pragma: no cover - integration path
        raise HTTPException(status_code=500, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
