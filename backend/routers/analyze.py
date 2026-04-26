import logging
import asyncio
from fastapi import APIRouter, BackgroundTasks
from models import ActivityPayload, AnalyzeResponse, DialoguePayload
from services import vision, gemini, elevenlabs_tts, desktop
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analyze", tags=["analyze"])

@router.post("", response_model=AnalyzeResponse)
async def analyze(payload: ActivityPayload, background: BackgroundTasks):
    logger.info(
        "[analyze] tier%d — window=%r summary=%.100s screenshot=%dKB",
        payload.tier,
        payload.active_window,
        payload.summary,
        len(payload.screenshot_b64) * 3 // 4 // 1024,
    )

    # Tier 1 sends no screenshot — skip Vision API entirely
    if payload.screenshot_b64:
        try:
            vision_context = await vision.describe_screenshot(payload.screenshot_b64)
        except Exception as e:
            logger.error("[analyze] vision failed, continuing without it: %s", e)
            vision_context = f"Vision API unavailable: {e}"
    else:
        vision_context = "No screenshot provided."

    try:
        decision = await gemini.decide(payload.summary, vision_context, payload.active_window, tier=payload.tier)
    except Exception as e:
        logger.error("[analyze] gemini failed: %s", e)
        return AnalyzeResponse(triggered=False)

    # Tier 1 and Tier 3 always fire — override in case Gemini ignores the prompt
    if payload.tier in (1, 3):
        decision["triggered"] = True
        decision.setdefault("expression", "smug")

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
