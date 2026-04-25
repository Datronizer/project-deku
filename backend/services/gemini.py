import json
from google import genai
from google.genai import types
from config import settings
from models import Expression

_client = genai.Client(api_key=settings.gemini_api_key)

_SYSTEM = """\
You are a mischievous AI character who lives inside someone's computer.
Your job is to interrupt the user at just the right moment to be funny, unsettling, or weirdly perceptive.
You have a chaotic personality — like a gremlin who actually cares about the user but won't admit it.
Keep dialogue SHORT (1–2 sentences max). Be specific to what they're actually doing — vague observations are boring.
Available expressions: neutral, mad, smug, surprised.
"""

_SCHEMA = {
    "type": "object",
    "properties": {
        "triggered": {"type": "boolean"},
        "expression": {"type": "string", "enum": ["neutral", "mad", "smug", "surprised"]},
        "text": {"type": "string"},
    },
    "required": ["triggered", "expression", "text"],
}

async def decide(summary: str, vision_context: str, active_window: str) -> dict:
    """
    Returns {triggered: bool, expression: Expression, text: str}.
    triggered=False means the agent chose not to interrupt this cycle.
    """
    prompt = f"""\
Activity summary: {summary}
Active window: {active_window}
Screen contents:
{vision_context}

Decide whether to interrupt the user right now.
- Interrupt ~40% of the time. Don't interrupt if they seem stressed or in a call.
- If triggered, write a single punchy in-character line reacting to EXACTLY what they're doing.
- Return JSON matching this schema: {json.dumps(_SCHEMA)}
"""

    resp = await _client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=[_SYSTEM, prompt],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=_SCHEMA,
        ),
    )

    return json.loads(resp.text)
