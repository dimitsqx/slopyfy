import os

from strands import Agent
from strands.models import BedrockModel
from ag_ui_strands import StrandsAgent, create_strands_app

# Suppress OpenTelemetry context warnings
os.environ["OTEL_SDK_DISABLED"] = "true"
os.environ["OTEL_PYTHON_DISABLED_INSTRUMENTATIONS"] = "all"

# Bedrock auth: boto3 reads AWS_BEARER_TOKEN_BEDROCK from the environment when set (Bedrock API key).
# Ensure .env is loaded before this runs and contains AWS_BEARER_TOKEN_BEDROCK and AWS_DEFAULT_REGION.
# Do not set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY when using the API key.
model = BedrockModel(
    model_id=os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-20250514-v1:0"),
    region_name=os.getenv("AWS_DEFAULT_REGION", "us-west-2"),
    temperature=0.3,
)


agent = Agent(
    model=model,
    system_prompt="You are a helpful AI assistant.",
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
