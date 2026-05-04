"""
Pydantic Schemas - Request/Response cho Chat RAG + LLM.
"""
from typing import Literal

from pydantic import BaseModel, Field, field_validator


StageName = Literal["healthy", "early", "middle", "late", "unknown"]


class ChatMessage(BaseModel):
    """Một tin nhắn trong lịch sử hội thoại."""
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=1200)


class ChatRequest(BaseModel):
    """Request gửi câu hỏi tới AI Assistant."""
    disease_key: str = Field(..., min_length=1, max_length=128)
    disease_name: str = Field(..., min_length=1, max_length=200)
    predicted_stage: StageName = "unknown"
    confidence: float = Field(default=0.0, ge=0.0, le=100.0)
    conversation_history: list[ChatMessage] = Field(default_factory=list, max_length=20)
    message: str = Field(..., min_length=1, max_length=1200)

    @field_validator("conversation_history")
    @classmethod
    def validate_history_budget(cls, history: list[ChatMessage]) -> list[ChatMessage]:
        total_chars = sum(len(message.content) for message in history)
        if total_chars > 12000:
            raise ValueError("conversation_history quá dài, vui lòng rút gọn hội thoại.")
        return history


class ChatResponse(BaseModel):
    """Response từ AI Assistant."""
    reply: str
    disease_key: str
    citations: list[str] = Field(default_factory=list)
