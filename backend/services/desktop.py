import httpx
from config import settings
from models import DialoguePayload

async def push_dialogue(payload: DialoguePayload) -> None:
    """Sends a dialogue payload to the Electron overlay."""
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{settings.desktop_url}/dialogue",
            json=payload.model_dump(),
            timeout=5,
        )
