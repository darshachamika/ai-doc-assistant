from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class ChatRequest(BaseModel):
    prompt: str = Field(..., min_length=2, max_length=1000, description="User prompt text")
    session_id: Optional[str] = Field(None, description="Optional conversation session ID for context ID")

class ChatResponse(BaseModel):
    session_id: str
    response: str
    status: str
    timestamp: datetime