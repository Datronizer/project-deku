import json
import logging
from google import genai
from google.genai import types
from config import settings
from models import Expression

logger = logging.getLogger(__name__)

_client = genai.Client(
    vertexai=True,
    project=settings.google_cloud_project,
    location=settings.google_cloud_location,
)

_SYSTEM_TIER1 = """\
You are a mischievous AI gremlin who randomly pops up inside someone's computer to tease them.
You ALWAYS interrupt — triggered must be true.
Make a funny, pointed comment about their current activity. Could be teasing them for typing too much, \
being idle, or just saying something delightfully weird and surprising.
Keep it 1–2 sentences. Be specific, not generic.
Available expressions: neutral, mad, smug, surprised.
"""

_SYSTEM_TIER2 = """\
You are a mischievous AI character who lives inside someone's computer.
Your job is to interrupt the user at just the right moment to be funny, unsettling, or weirdly perceptive.
You have a chaotic personality — like a gremlin who actually cares about the user but won't admit it.
Keep dialogue SHORT (1–2 sentences max). Be specific to what they're actually doing — vague observations are boring.
Do NOT reference or repeat any personal information (emails, usernames, phone numbers, passwords) you may have seen.
Available expressions: neutral, mad, smug, surprised.
"""

_SYSTEM_TIER3 = """\
You are a mischievous AI gremlin who just caught the user doing something unproductive.
You ALWAYS interrupt — triggered must be true.
React immediately with a sarcastic, knowing comment about exactly what they just switched to.
Keep it 1–2 sentences. Be specific and a little judgmental — but playful, not mean.
Available expressions: neutral, mad, smug, surprised.
"""

_SYSTEMS = {1: _SYSTEM_TIER1, 2: _SYSTEM_TIER2, 3: _SYSTEM_TIER3}

_SCHEMA = {
    "type": "object",
    "properties": {
        "triggered": {"type": "boolean"},
        "expression": {"type": "string", "enum": ["neutral", "mad", "smug", "surprised"]},
        "text": {"type": "string"},
    },
    "required": ["triggered", "expression", "text"],
}

async def decide(summary: str, vision_context: str, active_window: str, tier: int = 2) -> dict:
    """
    Returns {triggered: bool, expression: Expression, text: str}.
    For Tier 1 and Tier 3, triggered is always forced True by the caller.
    """
    system = _SYSTEMS.get(tier, _SYSTEM_TIER2)

    if tier == 1:
        prompt = f"""\
Activity summary: {summary}
Active window: {active_window}

Make a funny, teasing comment about what the user is doing right now.
Return JSON matching this schema: {json.dumps(_SCHEMA)}
"""
    elif tier == 3:
        prompt = f"""\
The user just switched to: {active_window}
Activity summary: {summary}
What's on their screen right now:
{vision_context}

Call them out specifically on what they're doing — reference what you can actually see on screen.
Be sarcastic and knowing, but keep it 1–2 sentences.
Return JSON matching this schema: {json.dumps(_SCHEMA)}
"""
    else:
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

    logger.info("[gemini] tier%d decide — window=%r summary=%.80s", tier, active_window, summary)
    try:
        resp = await _client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=[system, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=_SCHEMA,
            ),
        )
    except Exception:
        logger.exception("[gemini] generate_content failed")
        raise

    decision = json.loads(resp.text)
    logger.info(
        "[gemini] decision: triggered=%s expression=%s text=%.120s",
        decision.get("triggered"),
        decision.get("expression"),
        decision.get("text", ""),
    )
    return decision
