from typing import Literal
from pydantic import BaseModel

Expression = Literal["neutral", "mad", "smug", "surprised"]

class ActivityPayload(BaseModel):
    summary: str
    active_window: str
    screenshot_b64: str  # base64-encoded JPG; empty string for Tier 1
    tier: int = 2        # 1=random surprise, 2=screen observer, 3=urgent event

class DialoguePayload(BaseModel):
    characterName: str
    expression: Expression
    text: str
    audioUrl: str | None = None  # base64 data URI or None

class AnalyzeResponse(BaseModel):
    triggered: bool
    dialogue: DialoguePayload | None = None
