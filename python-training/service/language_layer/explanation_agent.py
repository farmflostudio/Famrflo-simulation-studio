from google.adk.agents import LlmAgent

from .client import run_once
from .guardrail import template_explanation, verify_explanation

MODEL_NAME = "gemini-flash-latest"

_cached_agent = None


def _get_agent():
    global _cached_agent
    if _cached_agent is not None:
        return _cached_agent

    agent = LlmAgent(
        name="schedule_explanation_agent",
        model=MODEL_NAME,
        instruction=(
            "You write a short, plain language explanation of an irrigation plan for a UK farmer. "
            "You are given the exact real numbers for the plan. Use only those numbers, do not invent "
            "or change any figure. Mention the total irrigation amount in millimetres and the number "
            "of irrigation days somewhere in your answer. Keep it to two or three sentences, plain "
            "prose, no headings and no markdown."
        ),
    )
    _cached_agent = agent
    return agent


def _build_prompt(farm_name, reference_site, numbers):
    return (
        f"Farm: {farm_name or 'this farm'}\n"
        f"Reference monitoring site: {reference_site or 'unknown'}\n"
        f"Planning horizon: {numbers['horizonDays']} days\n"
        f"Total irrigation recommended: {numbers['totalWaterMm']:.1f} mm\n"
        f"Number of irrigation days: {numbers['irrigationDays']}\n"
        "Explain this plan to the farmer in plain language."
    )


def explain_schedule(farm_name, reference_site, numbers):
    try:
        agent = _get_agent()
        prompt = _build_prompt(farm_name, reference_site, numbers)
        raw_text = run_once(agent, prompt).strip()
    except Exception:
        return {"explanation": template_explanation(numbers), "source": "template", "guardrailPassed": False}

    if verify_explanation(raw_text, numbers):
        return {"explanation": raw_text, "source": "gemini", "guardrailPassed": True}

    return {"explanation": template_explanation(numbers), "source": "template", "guardrailPassed": False}
