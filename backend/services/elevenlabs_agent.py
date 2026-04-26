import logging
import random
from collections import deque
from elevenlabs import AsyncElevenLabs
from elevenlabs.types import ConversationSimulationSpecification, AgentConfig, ConversationHistoryTranscriptCommonModelInput
from config import settings

logger = logging.getLogger(__name__)

_client = AsyncElevenLabs(api_key=settings.elevenlabs_api_key)

# Rolling history of recent turns so the agent doesn't repeat itself
_HISTORY_LIMIT = 10
_history: deque[ConversationHistoryTranscriptCommonModelInput] = deque(maxlen=_HISTORY_LIMIT)

_EXPRESSIONS = ["neutral", "mad", "smug", "surprised"]

# Demo context
_DEMO_CONTEXT = (
    "CONTEXT: We are currently at a hackathon demoing this app to judges. "
    "You are Bakugou (or Deku if configured). Respond with intensity and personality. "
    "CRITICAL: ONLY react to what is actually described in the current screenshot and activity summary. "
    "Do NOT mention Devpost, YouTube links, or other hackathon assets UNLESS they are explicitly mentioned in the context. "
    "Keep responses natural and engaging, roughly 3 to 4 sentences long. "
)

def reset_history():
    _history.clear()
    logger.info("[elevenlabs_agent] rolling history cleared")

async def decide(summary: str, vision_context: str, active_window: str, tier: int = 2) -> dict:
    """
    Get a triggered response from the ElevenLabs agent based on screen context.
    Returns {triggered: bool, expression: str, text: str}.
    Tier 1/3 always trigger; Tier 2 triggers ~40% of the time.
    """
    base_instruction = _DEMO_CONTEXT
    
    if tier == 1:
        user_message = (
            f"{base_instruction}Activity summary: {summary}. Active window: {active_window}. "
            "Make a funny, teasing comment about what they're doing right now. "
            "Use audio tags like [chuckles] or [sigh] to add personality."
        )
    elif tier == 3:
        user_message = (
            f"{base_instruction}The user just switched to: {active_window}. "
            f"Screen contents: {vision_context}. "
            "Call them out sarcastically on exactly what they're doing. "
            "Feel free to use audio tags like [laughs] or [sigh] for emphasis."
        )
    else:
        user_message = (
            f"{base_instruction}Activity: {summary}. Active window: {active_window}. "
            f"Screen: {vision_context}. "
            "Decide if you want to interrupt (do so ~40% of the time). "
            "If yes, write a natural, in-character response (3-4 sentences). "
            "Use audio tags like [chuckles] if it fits."
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


async def decide_with_analysis(analysis_critique: str, analysis_expression: str) -> dict:
    """
    Get a triggered response from the ElevenLabs agent based on a Gemini-provided critique.
    Returns {triggered: bool, expression: str, text: str}.
    """
    user_message = (
        f"{_DEMO_CONTEXT}Based on this analysis of what the user is doing: '{analysis_critique}', "
        "react in character to scold or tease them. "
        "Make it a full 3-4 sentence response that fits the hackathon demo context. "
        "Enhance your performance with audio tags like [chuckles], [sigh], [laughs], or [clears throat]."
    )
    
    logger.info("[elevenlabs_agent] decide_with_analysis — critique=%.80s", analysis_critique)

    try:
        text = await _query_agent(user_message)
    except Exception as e:
        logger.error("[elevenlabs_agent] decide_with_analysis failed: %s", e)
        raise

    return {"triggered": True, "expression": analysis_expression, "text": text}


async def reply(user_text: str) -> dict:
    """
    Returns {triggered: True, expression: str, text: str}.
    Called when the user talks back to Deku via voice.
    """
    user_message = (
        f"{_DEMO_CONTEXT}The user just said to you: \"{user_text}\". Respond in character. "
        "Keep the conversation flowing naturally with 3-4 sentences. "
        "Use expressive audio tags like [chuckles] or [sigh] where appropriate."
    )
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
    """Send a single-turn message to the ElevenLabs agent, passing recent history so it doesn't repeat."""
    _history.append(ConversationHistoryTranscriptCommonModelInput(role="user", message=user_message, time_in_call_secs=0))

    result = await _client.conversational_ai.agents.simulate_conversation(
        agent_id=settings.elevenlabs_agent_id,
        simulation_specification=ConversationSimulationSpecification(
            agent_config=AgentConfig(first_message=""),
            simulated_user_config=AgentConfig(first_message=""),
            partial_conversation_history=list(_history),
        ),
        new_turns_limit=1,
    )

    agent_text = ""
    for turn in result.simulated_conversation:
        if turn.role == "agent" and turn.message:
            agent_text = turn.message
            break

    if agent_text:
        _history.append(ConversationHistoryTranscriptCommonModelInput(role="agent", message=agent_text, time_in_call_secs=0))
    else:
        logger.warning("[elevenlabs_agent] agent returned no message turns")
        agent_text = "..."

    return agent_text


def _pick_expression(tier: int) -> str:
    if tier == 1:
        return random.choice(["smug", "surprised"])
    if tier == 3:
        return "mad"
    return random.choice(_EXPRESSIONS)
