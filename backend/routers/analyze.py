import logging
import asyncio
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from models import ActivityPayload, AnalyzeResponse, DialoguePayload
from services import vision, elevenlabs_agent, elevenlabs_tts, desktop, elevenlabs_conversation
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analyze", tags=["analyze"])


class UserMessagePayload(BaseModel):
    """User input to send to the agent."""
    text: str


@router.post("/init-conversation")
async def init_conversation():
    """Initialize a new conversation session with the agent."""
    try:
        conversation_id = await elevenlabs_conversation.initialize_conversation()
        return {"status": "ok", "conversation_id": conversation_id}
    except Exception as e:
        logger.error("[init_conversation] failed: %s", e)
        return {"status": "error", "message": str(e)}


@router.post("/user-message", response_model=AnalyzeResponse)
async def user_message(payload: UserMessagePayload, background: BackgroundTasks):
    """
    User sends a message to the agent.
    Agent responds with dialogue and audio.
    """
    logger.info("[user_message] user said: %.100s", payload.text)
    
    try:
        # Send user message to agent and get response
        agent_response = await elevenlabs_conversation.send_user_message(payload.text)
    except Exception as e:
        logger.error("[user_message] failed: %s", e)
        return AnalyzeResponse(triggered=False)
    
    # Build audio URL from agent's audio response if available
    audio_url = None
    if agent_response.get("audio_base64"):
        audio_url = f"data:audio/mpeg;base64,{agent_response['audio_base64']}"
    
    dialogue = DialoguePayload(
        characterName=settings.character_name,
        expression="neutral",  # Let frontend vary expressions
        text=agent_response.get("text", ""),
        audioUrl=audio_url,
    )
    logger.info("[user_message] agent response: %r", dialogue.text)

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

    try:
        if payload.screenshot_b64:
            vision_context = await vision.describe_screenshot(payload.screenshot_b64)
        else:
            vision_context = "No screenshot provided."
    except Exception as e:
        logger.error("[analyze] vision failed, continuing without it: %s", e)
        vision_context = f"Vision API unavailable: {e}"

    try:
        decision = await elevenlabs_agent.decide(payload.summary, vision_context, payload.active_window)
    except Exception as e:
        logger.error("[analyze] elevenlabs_agent failed: %s", e)
        return AnalyzeResponse(triggered=False)

    if not decision.get("triggered"):
        logger.info("[analyze] not triggered this cycle")
        return AnalyzeResponse(triggered=False)

    # Build audio URL from agent's audio response if available
    audio_url = None
    if decision.get("audio_base64"):
        audio_url = f"data:audio/mpeg;base64,{decision['audio_base64']}"
    
    dialogue = DialoguePayload(
        characterName=settings.character_name,
        expression=decision.get("expression", "neutral"),
        text=decision["text"],
        audioUrl=audio_url,
    )
    logger.info("[analyze] triggering dialogue: %r", dialogue.text)

    background.add_task(_deliver, dialogue)
    return AnalyzeResponse(triggered=True, dialogue=dialogue)


@router.post("/trigger", response_model=AnalyzeResponse)
async def trigger(background: BackgroundTasks):
    """Force a dialogue with a canned payload — useful for testing without the desktop capture loop."""
    decision = await elevenlabs_agent.decide(
        summary="User is sitting at their computer doing something",
        vision_context="No screenshot available",
        active_window="unknown",
    )

    if not decision.get("triggered"):
        decision["triggered"] = True
        decision.setdefault("expression", "smug")
        decision.setdefault("text", "I see you.")

    audio_url = None
    if decision.get("audio_base64"):
        audio_url = f"data:audio/mpeg;base64,{decision['audio_base64']}"

    dialogue = DialoguePayload(
        characterName=settings.character_name,
        expression=decision.get("expression", "neutral"),
        text=decision["text"],
        audioUrl=audio_url,
    )
    background.add_task(_deliver, dialogue)
    return AnalyzeResponse(triggered=True, dialogue=dialogue)


async def _deliver(dialogue: DialoguePayload) -> None:
    # If agent didn't provide audio, generate it with TTS
    if not dialogue.audioUrl:
        try:
            audio_url = await asyncio.get_event_loop().run_in_executor(
                None, elevenlabs_tts.synthesize, dialogue.text
            )
            dialogue.audioUrl = audio_url
            logger.info("[deliver] TTS ready (%d bytes)", len(audio_url))
        except Exception as e:
            logger.warning("[deliver] TTS failed, pushing dialogue without audio: %s", e)

    try:
        await desktop.push_dialogue(dialogue)
        logger.info("[deliver] pushed to desktop")
    except Exception as e:
        logger.error("[deliver] desktop push failed: %s", e)
    logger.info("[analyze] triggering dialogue: %r", dialogue.text)

    background.add_task(_deliver, dialogue)
    return AnalyzeResponse(triggered=True, dialogue=dialogue)


@router.post("/trigger", response_model=AnalyzeResponse)
async def trigger(background: BackgroundTasks):
    """Force a dialogue with a canned payload — useful for testing without the desktop capture loop."""
    decision = await gemini.decide(
        summary="User is sitting at their computer doing something",
        vision_context="No screenshot available",
        active_window="unknown",
        tier=2,
    )

    if not decision.get("triggered"):
        decision["triggered"] = True
        decision.setdefault("expression", "smug")
        decision.setdefault("text", "I see you.")

    dialogue = DialoguePayload(
        characterName=settings.character_name,
        expression=decision.get("expression", "neutral"),
        text=decision["text"],
    )
    background.add_task(_deliver, dialogue)
    return AnalyzeResponse(triggered=True, dialogue=dialogue)


async def _deliver(dialogue: DialoguePayload) -> None:
    try:
        audio_url = await asyncio.get_event_loop().run_in_executor(
            None, elevenlabs_tts.synthesize, dialogue.text
        )
        dialogue.audioUrl = audio_url
        logger.info("[deliver] TTS ready (%d bytes)", len(audio_url))
    except Exception as e:
        logger.warning("[deliver] TTS failed, pushing dialogue without audio: %s", e)

    try:
        await desktop.push_dialogue(dialogue)
        logger.info("[deliver] pushed to desktop")
    except Exception as e:
        logger.error("[deliver] desktop push failed: %s", e)
