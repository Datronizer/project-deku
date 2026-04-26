import json
import logging
import asyncio
import random
from config import settings
from services import elevenlabs_conversation

logger = logging.getLogger(__name__)

_EXPRESSIONS = ["neutral", "mad", "smug", "surprised"]


async def decide(summary: str, vision_context: str, active_window: str) -> dict:
    """
    Makes a decision on whether to interrupt.
    Returns {triggered: bool, expression: Expression, text: str, audio_base64: str}.
    
    Always triggers and uses ElevenLabs Agent API to generate contextual commentary.
    """
    logger.info(
        "[elevenlabs_agent] making decision — window=%r summary=%.80s",
        active_window,
        summary,
    )

    # Always trigger - agent talks constantly
    triggered = True
    
    # Generate contextual response using ElevenLabs Agent API
    context = f"{summary} | {active_window}"
    agent_response = await _get_agent_response(context)
    
    # Pick a random expression
    expression = random.choice(_EXPRESSIONS)
    
    decision = {
        "triggered": triggered,
        "expression": expression,
        "text": agent_response.get("text", ""),
        "audio_base64": agent_response.get("audio_base64", ""),
    }

    logger.info(
        "[elevenlabs_agent] decision: triggered=%s expression=%s text=%.120s",
        decision.get("triggered"),
        decision.get("expression"),
        decision.get("text", ""),
    )
    return decision


async def _get_agent_response(context: str) -> dict:
    """Get response from ElevenLabs Agent API."""
    try:
        response = await elevenlabs_conversation.get_agent_response(context)
        return response
    except Exception as e:
        logger.error("[elevenlabs_agent] ElevenLabs agent API failed: %s", e)
        # Fallback to simple patterns if agent fails
        patterns = [
            "hey, you're doing the thing again",
            "interesting move there",
            "i see you",
            "caught red-handed",
            "so that's what you're up to",
            "classic you",
            "i can't look away",
        ]
        return {
            "text": random.choice(patterns),
            "audio_base64": "",
        }
