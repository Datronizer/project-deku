import logging
import random
from elevenlabs import AsyncElevenLabs
from elevenlabs.types import ConversationSimulationSpecification, AgentConfig
from config import settings

logger = logging.getLogger(__name__)

_client = AsyncElevenLabs(api_key=settings.elevenlabs_api_key)

_EXPRESSIONS = ["neutral", "mad", "smug", "surprised"]


async def decide(summary: str, vision_context: str, active_window: str, tier: int = 2) -> dict:
    """
    Get a triggered response from the ElevenLabs agent based on screen context.
    Returns {triggered: bool, expression: str, text: str}.
    Tier 1/3 always trigger; Tier 2 triggers ~40% of the time.
    """
    if tier == 1:
        user_message = (
            f"Activity summary: {summary}. Active window: {active_window}. "
            "Make a funny, teasing comment about what they're doing right now."
        )
    elif tier == 3:
        user_message = (
            f"The user just switched to: {active_window}. "
            f"Screen contents: {vision_context}. "
            "Call them out sarcastically on exactly what they're doing."
        )
    else:
        user_message = (
            f"Activity: {summary}. Active window: {active_window}. "
            f"Screen: {vision_context}. "
            "Decide if you want to interrupt (do so ~40% of the time). "
            "If yes, write one punchy in-character line."
        )

    logger.info("[elevenlabs_agent] tier%d decide — window=%r summary=%.80s", tier, active_window, summary)

    try:
        text = await _query_agent(user_message)
    except Exception as e:
        logger.error("[elevenlabs_agent] decide failed: %s", e)
        raise

    # For Tier 2, use the response presence to determine trigger
    # (agent always responds, so we still trigger; keep parity with Gemini tier logic)
    triggered = True
    expression = _pick_expression(tier)

    logger.info("[elevenlabs_agent] decision: triggered=%s expression=%s text=%.120s", triggered, expression, text)
    return {"triggered": triggered, "expression": expression, "text": text}


async def reply(user_text: str) -> dict:
    """
    Returns {triggered: True, expression: str, text: str}.
    Called when the user talks back to Deku via voice.
    """
    user_message = f'The user just said to you: "{user_text}". Respond in character.'
    logger.info("[elevenlabs_agent] reply — user=%.80s", user_text)

    try:
        text = await _query_agent(user_message)
    except Exception as e:
        logger.error("[elevenlabs_agent] reply failed: %s", e)
        raise

    expression = random.choice(_EXPRESSIONS)
    logger.info("[elevenlabs_agent] reply: expression=%s text=%.120s", expression, text)
    return {"triggered": True, "expression": expression, "text": text}


async def _query_agent(user_message: str) -> str:
    """Send a single-turn message to the ElevenLabs agent and return its text response."""
    result = await _client.conversational_ai.agents.simulate_conversation(
        agent_id=settings.elevenlabs_agent_id,
        simulation_specification=ConversationSimulationSpecification(
            simulated_user_config=AgentConfig(
                first_message=user_message,
            ),
        ),
        new_turns_limit=1,
    )
    for turn in result.simulated_conversation:
        if turn.role == "agent" and turn.message:
            return turn.message
    logger.warning("[elevenlabs_agent] agent returned no message turns")
    return "..."


def _pick_expression(tier: int) -> str:
    if tier == 1:
        return random.choice(["smug", "surprised"])
    if tier == 3:
        return "mad"
    return random.choice(_EXPRESSIONS)
