from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.llm_service import llm_service
from app.services.tts_service import tts_service
from app.services.rag_service import rag_service
import json

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

class RecommendRequest(BaseModel):
    preference: str

class TTSRequest(BaseModel):
    text: str

@router.post("/send")
async def chat(req: ChatRequest):
    """文本对话接口"""
    context = rag_service.search(req.message)
    reply = await llm_service.chat(req.message, context)
    return {"reply": reply, "session_id": req.session_id}

@router.post("/tts")
async def text_to_speech(req: TTSRequest):
    """文本转语音，返回音频流"""
    audio_stream = await tts_service.synthesize(req.text)
    return StreamingResponse(audio_stream, media_type="audio/wav")

@router.post("/recommend")
async def recommend(req: RecommendRequest):
    """个性化路线推荐"""
    spots = rag_service.recommend_spots(req.preference)
    return {"preference": req.preference, "route": spots}

@router.websocket("/ws")
async def websocket_chat(ws: WebSocket):
    """WebSocket流式对话"""
    await ws.accept()
    try:
        while True:
            data = await ws.receive_text()
            req = json.loads(data)
            message = req.get("message", "")
            context = rag_service.search(message)
            full_reply = ""
            async for chunk in llm_service.chat_stream(message, context):
                full_reply += chunk
                await ws.send_text(json.dumps({"type": "text", "content": chunk}))
            await ws.send_text(json.dumps({"type": "done", "full_reply": full_reply}))
    except WebSocketDisconnect:
        pass
