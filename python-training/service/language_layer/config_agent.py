from google.adk.agents import LlmAgent

from model_store import get_store

from .client import run_once
from .schemas import build_config_schema

MODEL_NAME = "gemini-flash-latest"

_cached_agent = None
_cached_schema = None


def _get_agent():
    global _cached_agent, _cached_schema
    if _cached_agent is not None:
        return _cached_agent, _cached_schema

    categories = get_store().categories
    schema = build_config_schema(categories)

    agent = LlmAgent(
        name="farm_config_agent",
        model=MODEL_NAME,
        instruction=(
            "You turn a short, plain language description of a UK farm into a structured "
            "configuration for a soil moisture simulation. Only choose soilType and landCover from "
            "the allowed values given by the schema, picking the closest realistic match. Only fill "
            "locationLabel or areaHectares if the description actually mentions them; leave them null "
            "otherwise. Never invent facts that are not implied by the description."
        ),
        output_schema=schema,
        output_key="result",
    )
    _cached_agent = agent
    _cached_schema = schema
    return agent, schema


def suggest_farm_config(description):
    description = (description or "").strip()
    if not description:
        raise ValueError("A farm description is required")

    agent, schema = _get_agent()
    raw_text = run_once(agent, description)
    suggestion = schema.model_validate_json(raw_text)
    return suggestion.model_dump()
