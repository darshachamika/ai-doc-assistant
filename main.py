from fastapi import FastAPI,HTTPException,Depends,status
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uuid
from models import ChatLog
from schemas import ChatRequest
from ai_service import stream_ai_response
from database import get_db
from pydantic import BaseModel


app = FastAPI(title="AI Document Assistant", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def health_check():
    return {"status": "healthy", "service": "FastApi AI Backend"}

@app.post("/api/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    return StreamingResponse(
        stream_ai_response(request.prompt),
        media_type="text/event-stream"
    )

# History save කරන non-streaming endpoint එක
class SaveChatPayload(BaseModel):
    request: ChatRequest
    ai_response: str

@app.post("/api/chat/save")
async def save_chat_entry(payload: SaveChatPayload, db: Session = Depends(get_db)):
    session_id = payload.request.session_id if payload.request.session_id else str(uuid.uuid4())
    log_entry = ChatLog(
        session_id=session_id,
        user_prompt=payload.request.prompt,
        ai_response=payload.ai_response
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return {"status": "saved", "id": log_entry.id, "session_id": session_id}


# Session එකක history එක retrieve කරන endpoint එක
@app.get("/api/chat/history/{session_id}")
async def get_session_history(session_id: str, db: Session = Depends(get_db)):
    logs = db.query(ChatLog).filter(ChatLog.session_id == session_id).order_by(ChatLog.created_at.asc()).all()
    return logs