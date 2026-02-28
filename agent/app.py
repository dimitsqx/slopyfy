from strands import Agent
from strands.models.mistral import MistralModel
import os

from ag_ui_strands import StrandsAgent, create_strands_app


model = MistralModel(
    api_key=os.getenv("MISTRAL_API_KEY"),
    # **model_config
    model_id="open-mistral-nemo",  # cheapest Mistral model (~$0.02/$0.04 per M tokens)
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