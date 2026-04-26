import base64
import json
import logging
import httpx
from config import settings

logger = logging.getLogger(__name__)

_twitter_access_token: str | None = None
_twitter_access_token_secret: str | None = None


def has_twitter_token() -> bool:
    return bool(_twitter_access_token and _twitter_access_token_secret)


def get_twitter_tokens() -> tuple[str, str] | None:
    if _twitter_access_token and _twitter_access_token_secret:
        return _twitter_access_token, _twitter_access_token_secret
    return None


def get_authorization_url() -> str:
    return (
        f"https://{settings.auth0_domain}/authorize"
        f"?response_type=code"
        f"&client_id={settings.auth0_client_id}"
        f"&redirect_uri={settings.auth0_callback_url}"
        f"&scope=openid profile email"
        f"&connection=twitter"
    )


async def handle_callback(code: str) -> bool:
    """Exchange auth code → get user id → fetch Twitter tokens from Management API."""
    global _twitter_access_token, _twitter_access_token_secret

    async with httpx.AsyncClient() as client:
        # Exchange code for tokens
        resp = await client.post(
            f"https://{settings.auth0_domain}/oauth/token",
            json={
                "grant_type": "authorization_code",
                "client_id": settings.auth0_client_id,
                "client_secret": settings.auth0_client_secret,
                "code": code,
                "redirect_uri": settings.auth0_callback_url,
            },
            timeout=10,
        )
        resp.raise_for_status()
        tokens = resp.json()
        user_id = _decode_jwt(tokens["id_token"])["sub"]
        logger.info("[auth0] authenticated user: %s", user_id)

        # Get Management API token via M2M app client credentials
        resp = await client.post(
            f"https://{settings.auth0_domain}/oauth/token",
            json={
                "grant_type": "client_credentials",
                "client_id": settings.auth0_mgmt_client_id,
                "client_secret": settings.auth0_mgmt_client_secret,
                "audience": f"https://{settings.auth0_domain}/api/v2/",
            },
            timeout=10,
        )
        resp.raise_for_status()
        mgmt_token = resp.json()["access_token"]

        # Fetch user profile — identities contain the Twitter OAuth token pair
        resp = await client.get(
            f"https://{settings.auth0_domain}/api/v2/users/{user_id}",
            headers={"Authorization": f"Bearer {mgmt_token}"},
            params={"fields": "identities"},
            timeout=10,
        )
        resp.raise_for_status()
        user = resp.json()

    for identity in user.get("identities", []):
        if identity.get("provider") == "twitter":
            _twitter_access_token = identity.get("access_token")
            _twitter_access_token_secret = identity.get("access_token_secret")
            logger.info("[auth0] Twitter tokens stored")
            return True

    logger.warning("[auth0] No Twitter identity found for user %s", user_id)
    return False


def _decode_jwt(token: str) -> dict:
    """Decode JWT payload without signature verification (demo only)."""
    payload_b64 = token.split(".")[1]
    payload_b64 += "=" * (4 - len(payload_b64) % 4)
    return json.loads(base64.urlsafe_b64decode(payload_b64))
