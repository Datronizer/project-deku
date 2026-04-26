import logging
from elevenlabs import AsyncElevenLabs
from elevenlabs.types import (
    ConversationSimulationSpecification,
    AgentConfig,
    ConversationHistoryTranscriptCommonModelInput,
)
from config import settings

logger = logging.getLogger(__name__)

_client = AsyncElevenLabs(api_key=settings.elevenlabs_api_key)

# In-memory conversation history: list of {role, message} turns
_history: list[ConversationHistoryTranscriptCommonModelInput] = []


def get_history() -> list[dict]:
    return [{"role": t.role, "message": t.message} for t in _history]


def reset_conversation() -> None:
    _history.clear()
    logger.info("[elevenlabs_conversation] history cleared")


async def send_user_message(user_input: str) -> dict:
    """
    Append user turn to history, call simulate_conversation with full history,
    append agent turn, return {"text": str, "conversation_id": None}.
    """
    _history.append(
        ConversationHistoryTranscriptCommonModelInput(role="user", message=user_input, time_in_call_secs=0)
    )
    logger.info(
        "[elevenlabs_conversation] user turn — history_len=%d input=%.80s",
        len(_history), user_input,
    )

    result = await _client.conversational_ai.agents.simulate_conversation(
        agent_id=settings.elevenlabs_agent_id,
        simulation_specification=ConversationSimulationSpecification(
            agent_config=AgentConfig(first_message=""),
            simulated_user_config=AgentConfig(first_message=""),
            partial_conversation_history=_history,
        ),
        new_turns_limit=1,
    )

    agent_text = ""
    for turn in result.simulated_conversation:
        if turn.role == "agent" and turn.message:
            agent_text = turn.message
            break

    if agent_text:
        _history.append(
            ConversationHistoryTranscriptCommonModelInput(role="agent", message=agent_text, time_in_call_secs=0)
        )

    logger.info("[elevenlabs_conversation] agent turn — text=%.80s", agent_text)
    return {"text": agent_text, "history_length": len(_history)}
