from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.llm_service import llm_service
from app.services.tts_service import tts_service
from app.services.rag_service import rag_service
import json
import os
import tempfile

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
    """个性化路线推荐 — 每条路线返回完全不同内容"""
    result = rag_service.recommend_spots(req.preference)
    return result

@router.post("/voice")
async def voice_to_text(file: UploadFile = File(...)):
    """语音文件上传 → 转文字（需配置ASR）"""
    # 要在比赛时使用语音识别，选择其一：
    # 方案1: pip install faster-whisper（轻量，推荐）
    # 方案2: 百度语音识别API（每天5万次免费）
    # 方案3: 用正式AppID启用微信同声传译插件
    return {
        "text": "语音已收到。文字输入正常可用，语音识别待配置ASR服务。",
        "status": "asr_not_configured",
    }

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
