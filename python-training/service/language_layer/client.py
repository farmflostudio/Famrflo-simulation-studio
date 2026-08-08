import asyncio
import uuid

from google.adk.runners import InMemoryRunner
from google.genai import types

APP_NAME = "farmflo_language_layer"


async def _run_once_async(agent, user_message):
    runner = InMemoryRunner(agent=agent, app_name=APP_NAME)
    user_id = "farmflo_service"
    session_id = str(uuid.uuid4())
    await runner.session_service.create_session(app_name=APP_NAME, user_id=user_id, session_id=session_id)

    message = types.Content(role="user", parts=[types.Part(text=user_message)])

    final_text = None
    async for event in runner.run_async(user_id=user_id, session_id=session_id, new_message=message):
        if event.content and event.content.parts:
            for part in event.content.parts:
                if getattr(part, "text", None):
                    final_text = part.text

    if final_text is None:
        raise RuntimeError("The language model returned no output")

    return final_text


def run_once(agent, user_message):
    return asyncio.run(_run_once_async(agent, user_message))
