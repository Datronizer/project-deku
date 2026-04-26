import logging
from fastapi import APIRouter
from fastapi.responses import RedirectResponse, HTMLResponse
from services import auth0_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/connect")
async def connect():
    """Redirect to Auth0 → Twitter OAuth. Open this in a browser once before the demo."""
    url = auth0_client.get_authorization_url()
    return RedirectResponse(url)


@router.get("/callback")
async def callback(code: str):
    """Auth0 redirects here after Twitter OAuth. Stores the Twitter token."""
    try:
        ok = await auth0_client.handle_callback(code)
        if ok:
            return HTMLResponse("<h2>✓ X account connected. You can close this tab.</h2>")
        return HTMLResponse("<h2>✗ Twitter identity not found on this Auth0 account.</h2>", status_code=400)
    except Exception as e:
        logger.error("[auth/callback] failed: %s", e)
        return HTMLResponse(f"<h2>✗ Auth failed: {e}</h2>", status_code=500)


@router.get("/status")
async def status():
    """Check whether a Twitter token is connected."""
    return {"connected": auth0_client.has_twitter_token()}
