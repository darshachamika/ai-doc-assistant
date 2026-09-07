from fastapi import FastAPI,HTTPException,Depends,status
from schemas import ChatRequest, ChatResponse
from datetime import datetime
import uuid

app = FastAPI(title="AI Document Assistant", version="1.0.0")

#Dependency: Session ID generator
async def get_or_create_session(request: ChatRequest) -> str:
    #Client can provide a session_id, if not provided, generate a new one
    return request.session_id if request.session_id else str(uuid.uuid4())

@app.get("/")
async def health_check():
    return {"status": "healthy", "service": "FastApi AI Backend"}

@app.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def handle_chat(
request: ChatRequest, 
session_id: str = Depends(get_or_create_session)
):
    return {"response": "Chat response", "session_id": session_id};