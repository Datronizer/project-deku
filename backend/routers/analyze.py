import logging
import asyncio
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from models import ActivityPayload, AnalyzeResponse, DialoguePayload
from services import vision, elevenlabs_agent, elevenlabs_tts, desktop, elevenlabs_conversation, twitter_poster, gemini
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analyze", tags=["analyze"])


class UserMessagePayload(BaseModel):
    text: str


@router.post("/user-message", response_model=AnalyzeResponse)
async def user_message(payload: UserMessagePayload, background: BackgroundTasks):
    """User sends a voice reply to Deku; Gemini responds in character."""
    logger.info("[user_message] user said: %.100s", payload.text)
    try:
        decision = await elevenlabs_agent.reply(payload.text)
    except Exception as e:
        logger.error("[user_message] elevenlabs_agent.reply failed: %s", e)
        return AnalyzeResponse(triggered=False)

    dialogue = DialoguePayload(
        characterName=settings.character_name,
        expression=decision.get("expression", "neutral"),
        text=decision.get("text", ""),
    )
    background.add_task(_deliver, dialogue)
    return AnalyzeResponse(triggered=True, dialogue=dialogue)


@router.post("", response_model=AnalyzeResponse)
async def analyze(payload: ActivityPayload, background: BackgroundTasks):
    logger.info(
        "[analyze] cycle — window=%r summary=%.100s screenshot=%dKB",
        payload.active_window,
        payload.summary,
        len(payload.screenshot_b64) * 3 // 4 // 1024 if payload.screenshot_b64 else 0,
    )

    # Strategy: Use Gemini for rich analysis if we have a screenshot or if tier is high.
    # Otherwise, fallback to the standard decision logic.
    decision = None
    if payload.screenshot_b64 or payload.tier == 3:
        try:
            analysis = await gemini.analyze_screen(payload.summary, payload.screenshot_b64)
            decision = await elevenlabs_agent.decide_with_analysis(analysis.critique, analysis.expression)
        except Exception as e:
            logger.warning("[analyze] gemini analysis failed, falling back to vision: %s", e)
            # Continue to fallback logic below
    
    if not decision:
        try:
            # Fallback to Vision API description + standard decide for tier 1, no-screenshot tier 2, or gemini failure
            vision_context = await vision.describe_screenshot(payload.screenshot_b64) if payload.screenshot_b64 else "No screenshot."
            decision = await elevenlabs_agent.decide(
                payload.summary, vision_context, payload.active_window, tier=payload.tier
            )
        except Exception as e:
            logger.error("[analyze] fallback analysis failed: %s", e)
            return AnalyzeResponse(triggered=False)

    # Force triggered for Tier 1 and Tier 3 (safety net)
    if payload.tier in (1, 3):
        decision["triggered"] = True

    if not decision.get("triggered"):
        logger.info("[analyze] not triggered this cycle")
        return AnalyzeResponse(triggered=False)

    dialogue = DialoguePayload(
        characterName=settings.character_name,
        expression=decision.get("expression", "neutral"),
        text=decision["text"],
    )
    logger.info("[analyze] triggering dialogue: %r", dialogue.text)
    background.add_task(_deliver, dialogue)
    if payload.tier == 3:
        background.add_task(twitter_poster.post_mischief_tweet, payload.active_window, payload.summary)
    return AnalyzeResponse(triggered=True, dialogue=dialogue)


@router.post("/trigger", response_model=AnalyzeResponse)
async def trigger(background: BackgroundTasks):
    """Force a dialogue — useful for testing without the desktop capture loop."""
    try:
        decision = await elevenlabs_agent.decide(
            summary="User is sitting at their computer doing something",
            vision_context="No screenshot available",
            active_window="unknown",
            tier=2,
        )
    except Exception as e:
        logger.error("[trigger] elevenlabs_agent.decide failed: %s", e)
        decision = {}

    decision["triggered"] = True
    decision.setdefault("expression", "smug")
    decision.setdefault("text", "I see you.")

    dialogue = DialoguePayload(
        characterName=settings.character_name,
        expression=decision["expression"],
        text=decision["text"],
    )
    background.add_task(_deliver, dialogue)
    return AnalyzeResponse(triggered=True, dialogue=dialogue)


# ── Camila's conversation endpoints (stateful multi-turn via partial_conversation_history) ──

@router.post("/conversation/init")
async def conversation_init():
    """Clear conversation history and start a fresh session."""
    elevenlabs_conversation.reset_conversation()
    elevenlabs_agent.reset_history()
    return {"status": "ok", "history_length": 0}

@router.post("/reset-agent")
async def reset_agent():
    """Clear the agent's rolling memory (tiered triggers)."""
    elevenlabs_agent.reset_history()
    return {"status": "ok"}


@router.post("/conversation/reset")
async def conversation_reset():
    """Alias for /conversation/init."""
    elevenlabs_conversation.reset_conversation()
    return {"status": "ok"}


@router.get("/conversation/history")
async def conversation_history():
    """Return the current in-memory conversation history."""
    return {"history": elevenlabs_conversation.get_history()}


@router.post("/conversation/message", response_model=AnalyzeResponse)
async def conversation_message(payload: UserMessagePayload, background: BackgroundTasks):
    """
    Send a user message using stateful multi-turn conversation history.
    Each call appends to history so the agent remembers prior turns.
    """
    logger.info("[conversation_message] user said: %.100s", payload.text)
    try:
        agent_response = await elevenlabs_conversation.send_user_message(payload.text)
    except Exception as e:
        logger.error("[conversation_message] failed: %s", e)
        return AnalyzeResponse(triggered=False)

    dialogue = DialoguePayload(
        characterName=settings.character_name,
        expression="neutral",
        text=agent_response.get("text", ""),
    )
    background.add_task(_deliver, dialogue)
    return AnalyzeResponse(triggered=True, dialogue=dialogue)


async def _deliver(dialogue: DialoguePayload) -> None:
    if not dialogue.audioUrl:
        try:
            loop = asyncio.get_running_loop()
            audio_url = await loop.run_in_executor(None, elevenlabs_tts.synthesize, dialogue.text)
            dialogue.audioUrl = audio_url
            logger.info("[deliver] TTS ready (%d bytes)", len(audio_url))
        except Exception as e:
            logger.warning("[deliver] TTS failed, pushing dialogue without audio: %s", e)

    try:
        await desktop.push_dialogue(dialogue)
        logger.info("[deliver] pushed to desktop")
    except Exception as e:
        logger.error("[deliver] desktop push failed: %s", e)
