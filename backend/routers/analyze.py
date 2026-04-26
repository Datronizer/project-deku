from fastapi import APIRouter, BackgroundTasks, HTTPException
from models import ActivityPayload, AnalyzeResponse, DialoguePayload
from services import vision, gemini, elevenlabs_tts, desktop
from config import settings
import asyncio

router = APIRouter(prefix="/analyze", tags=["analyze"])

@router.post("", response_model=AnalyzeResponse)
async def analyze(payload: ActivityPayload, background: BackgroundTasks):
    try:
        vision_context = await vision.describe_screenshot(payload.screenshot_b64)
    except Exception as e:
        vision_context = f"Vision API unavailable: {e}"

    decision = await gemini.decide(payload.summary, vision_context, payload.active_window)

    if not decision.get("triggered"):
        return AnalyzeResponse(triggered=False)

    dialogue = DialoguePayload(
        characterName=settings.character_name,
        expression=decision.get("expression", "neutral"),
        text=decision["text"],
    )

    # TTS and desktop push run in background so we can return quickly
    background.add_task(_deliver, dialogue)

    return AnalyzeResponse(triggered=True, dialogue=dialogue)


@router.post("/trigger", response_model=AnalyzeResponse)
async def trigger(background: BackgroundTasks):
    """Force a dialogue with a canned payload — useful for testing without the desktop capture loop."""
    decision = await gemini.decide(
        summary="User is sitting at their computer doing something",
        vision_context="No screenshot available",
        active_window="unknown",
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
    except Exception:
        pass  # audio is optional — dialogue still shows without it

    await desktop.push_dialogue(dialogue)
