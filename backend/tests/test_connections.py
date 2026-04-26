"""
Integration tests — each makes one real API call.
Run:  cd backend && pytest tests/test_connections.py -v
Skip Gemma (requires Ollama):  pytest tests/test_connections.py -v -k "not gemma"
"""
import pytest

pytestmark = pytest.mark.asyncio


async def test_elevenlabs_tts():
    """ElevenLabs TTS returns a valid base64 audio data URI."""
    from services.elevenlabs_tts import synthesize

    result = synthesize("Hello!")

    assert result.startswith("data:audio/mpeg;base64,"), f"unexpected prefix: {result[:40]}"
    assert len(result) > 200, "audio data suspiciously short"


async def test_elevenlabs_agent_decide():
    """ElevenLabs agent returns a valid triggered decision for Tier 1."""
    from services.elevenlabs_agent import decide

    result = await decide(
        summary="User is typing quickly in VS Code",
        vision_context="No screenshot",
        active_window="VS Code",
        tier=1,
    )

    assert isinstance(result, dict), f"expected dict, got {type(result)}"
    assert result.get("triggered") is True, "Tier 1 must always trigger"
    assert isinstance(result.get("text"), str), "text must be a string"
    assert len(result["text"]) > 0, "text must not be empty"
    assert result.get("expression") in (
        "neutral", "mad", "smug", "surprised"
    ), f"unexpected expression: {result.get('expression')}"


async def test_elevenlabs_agent_reply():
    """ElevenLabs agent reply() always returns a triggered response."""
    from services.elevenlabs_agent import reply

    result = await reply("Wow, you really caught me!")

    assert isinstance(result, dict)
    assert result.get("triggered") is True
    assert isinstance(result.get("text"), str)
    assert len(result["text"]) > 0


async def test_gemma_ollama():
    """Ollama + Gemma4:2b returns a text response (requires Ollama running locally)."""
    import httpx

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "gemma4:2b",
                "prompt": "In one sentence, summarize: user has been typing in VS Code for 5 minutes.",
                "stream": False,
            },
            timeout=60.0,
        )

    assert resp.status_code == 200, f"Ollama returned {resp.status_code}"
    data = resp.json()
    assert "response" in data, f"missing 'response' key: {data.keys()}"
    assert len(data["response"]) > 0, "response is empty"
