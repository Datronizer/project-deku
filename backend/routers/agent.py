import logging
import httpx
from fastapi import APIRouter, HTTPException
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/token")
async def get_agent_token():
    """Returns a signed WebSocket URL for the ElevenLabs React SDK ConvAI session."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"https://api.elevenlabs.io/v1/convai/agents/{settings.elevenlabs_agent_id}/link",
                headers={"xi-api-key": settings.elevenlabs_api_key},
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json()  # {"signed_url": "wss://..."}
        except httpx.HTTPStatusError as e:
            logger.error("[agent/token] ElevenLabs returned %d: %s", e.response.status_code, e.response.text)
            raise HTTPException(status_code=502, detail=f"ElevenLabs API error: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error("[agent/token] request failed: %s", e)
            raise HTTPException(status_code=502, detail="Could not reach ElevenLabs API")
