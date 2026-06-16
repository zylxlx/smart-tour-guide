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
    preference: str  # 如: 佛教朝圣, 自然观光, 亲子互动, 禅修体验, 文化深度游

@router.post("/send")
async def chat(req: ChatRequest):
    """文本对话接口"""
    # RAG检索相关知识
    context = rag_service.search(req.message)
    # LLM生成回复
    reply = await llm_service.chat(req.message, context)
    return {"reply": reply, "session_id": req.session_id}

@router.post("/tts")
async def text_to_speech(message: str):
    """文本转语音，返回音频流"""
    audio_stream = await tts_service.synthesize(message)
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
            # RAG检索
            context = rag_service.search(message)
            # 流式LLM回复
            async for chunk in llm_service.chat_stream(message, context):
                await ws.send_text(json.dumps({"type": "text", "content": chunk}))
            # TTS合成
            audio = await tts_service.synthesize(message)
            await ws.send_text(json.dumps({"type": "audio", "content": "done"}))
    except WebSocketDisconnect:
        pass
