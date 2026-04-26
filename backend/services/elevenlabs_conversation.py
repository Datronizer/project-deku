import logging
import asyncio
from elevenlabs import ElevenLabs
from config import settings

logger = logging.getLogger(__name__)

_client = ElevenLabs(api_key=settings.elevenlabs_api_key)

# Global conversation session
_current_conversation_id = None


async def initialize_conversation() -> str:
    """Create and initialize a new conversation session with the agent."""
    global _current_conversation_id
    
    try:
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: _client.convai.create_conversation(
                agent_id=settings.elevenlabs_agent_id,
            ),
        )
        _current_conversation_id = response.conversation_id
        logger.info("[elevenlabs_conversation] initialized conversation: %s", _current_conversation_id)
        return _current_conversation_id
    except Exception as e:
        logger.error("[elevenlabs_conversation] failed to create conversation: %s", e)
        raise


async def get_conversation_id() -> str:
    """Get current conversation ID or create new one."""
    global _current_conversation_id
    if not _current_conversation_id:
        return await initialize_conversation()
    return _current_conversation_id


async def send_user_message(user_input: str) -> dict:
    """
    Send user message to the agent and get response.
    Returns {"text": str, "audio_base64": str, "conversation_id": str}
    """
    conversation_id = await get_conversation_id()
    
    try:
        logger.info(
            "[elevenlabs_conversation] user message — conv=%s input=%.80s",
            conversation_id,
            user_input,
        )

        # Send user input to agent via ConvAI API
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: _client.convai.send_message(
                agent_id=settings.elevenlabs_agent_id,
                conversation_id=conversation_id,
                message=user_input,
            ),
        )

        # Extract response - ConvAI API returns audio and transcript
        agent_message = response.response if hasattr(response, 'response') else str(response)
        agent_audio = response.audio if hasattr(response, 'audio') else ""

        logger.info(
            "[elevenlabs_conversation] agent response — text=%.80s audio_len=%d",
            agent_message,
            len(agent_audio) if agent_audio else 0,
        )

        return {
            "text": agent_message,
            "audio_base64": agent_audio,
            "conversation_id": conversation_id,
        }

    except Exception as e:
        logger.error("[elevenlabs_conversation] send_user_message failed: %s", e)
        raise


async def get_agent_response(context: str) -> dict:
    """
    Get initial agent response based on screen context.
    Used when agent speaks first based on screen activity.
    """
    return await send_user_message(context)


async def reset_conversation() -> None:
    """Reset conversation for a new session."""
    global _current_conversation_id
    _current_conversation_id = None
