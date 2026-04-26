import base64
from elevenlabs import ElevenLabs
from config import settings

_client = ElevenLabs(api_key=settings.elevenlabs_api_key)

def synthesize(text: str) -> str:
    """Returns a base64 data URI (audio/mpeg) for the given text."""
    audio_bytes = b"".join(
        _client.text_to_speech.convert(
            voice_id=settings.elevenlabs_voice_id,
            text=text,
            model_id="eleven_v3",
            output_format="mp3_44100_128",
        )
    )
    b64 = base64.b64encode(audio_bytes).decode()
    return f"data:audio/mpeg;base64,{b64}"
