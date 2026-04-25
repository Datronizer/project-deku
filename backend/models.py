from typing import Literal
from pydantic import BaseModel

Expression = Literal["neutral", "mad", "smug", "surprised"]

class ActivityPayload(BaseModel):
    summary: str
    active_window: str
    screenshot_b64: str  # base64-encoded PNG

class DialoguePayload(BaseModel):
    characterName: str
    expression: Expression
    text: str
    audioUrl: str | None = None  # base64 data URI or None

class AnalyzeResponse(BaseModel):
    triggered: bool
    dialogue: DialoguePayload | None = None
