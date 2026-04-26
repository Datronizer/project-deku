import httpx
from fastapi import APIRouter
from config import settings

router = APIRouter(prefix="/agent", tags=["agent"])

# TEST
@router.post("/token")
async def get_agent_token():
    """
    Returns a single-use signed URL for ElevenLabs React SDK
    """
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.elevenlabs.io/v1/agents/signed-url",
            headers={
                "xi-api-key": settings.elevenlabs_api_key,
                "Content-Type": "application/json",
            },
            json={"agent_id": settings.elevenlabs_agent_id},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()
    