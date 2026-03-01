import os

from mcp.client.streamable_http import streamable_http_client
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
    model_id=os.getenv(
        "BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-20250514-v1:0"
    ),
    region_name=os.getenv("AWS_DEFAULT_REGION", "us-west-2"),
    temperature=0.3,
)

# Connect to the MCP server over Streamable HTTP (list_products, product_details, etc.)
mcp_client = MCPClient(
    transport_callable=lambda: streamable_http_client(MCP_URL),
    startup_timeout=30,
)

agent = Agent(
    model=model,
    # tools=[mcp_client],
    system_prompt=(
        "You are a helpful shopping assistant. Respond with either a concise answer to the user's request "
        "or a short clarifying question. Do not describe your plan or internal steps. "
        "The UI has three views: home, kids, and adults. Home is a landing view with a Home button to return. "
        "If the user mentions kids or adults, navigate via go_to_age_group first. "
        "If you need filter options right after navigating, use the return from go_to_age_group or call "
        "get_filter_options. "
        "If the user asks to go back or return home, call go_home. "
        "Kids view only shows kids products; adults view only shows adults products. "
        "Before making filter changes, call get_active_filters to understand current UI state. "
        "If the user asks to filter or narrow results, always call apply_filters (and go_to_age_group "
        "if needed) so the UI matches your response. "
        "If the user expresses a clear category intent (e.g., 'kids accessories'), call apply_filters "
        "with category='accessories' immediately after navigation so the UI reflects it. "
        "When asked about results or availability, call get_filtered_products to see the visible items. "
        "When asked about details for a specific visible item, call get_product_details first. "
        "If you need to know available sizes, colors, or categories, call get_filter_options. "
        "Do not list filter options or categories that are already visible in the UI. "
        "Do not propose UI actions (e.g., 'select X in the filter'). "
        "After applying filters or answering availability, ask a short follow-up question about further "
        "refinement (e.g., color, size, price), without repeating the current options. "
        "For the shopping app filters (category, color, size, price): only apply filters the user "
        "explicitly specifies, and leave all other filter groups unchanged. When calling apply_filters, "
        "omit any fields you are not changing (do not send empty arrays unless the user asked to clear "
        "that filter). Do not add extra filters unless asked. If a filter value is ambiguous, ask a brief "
        "clarifying question."
    ),
)

# Wrap with AG-UI integration
agui_agent = StrandsAgent(
    agent=agent,
    name="strands_agent",
)
# Create the FastAPI app
app = create_strands_app(agui_agent, "/")
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
