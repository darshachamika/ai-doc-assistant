from fastapi import FastAPI,HTTPException,Depends,status
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from schemas import ChatRequest
from ai_service import stream_ai_response


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
async def chat_stream(request: ChatRequest):
    """
    Server-sent Events (SSE) pattern for plain text token streaming. This endpoint streams the AI response in real-time as tokens are generated.
    """
    try:
        return StreamingResponse(
            stream_ai_response(request.prompt),
            media_type="text/event-stream"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Internal Processing Error: {str(e)}")