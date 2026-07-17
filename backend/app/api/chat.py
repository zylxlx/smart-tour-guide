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
    """TTS → 保存为文件，返回静态URL给小程序播放"""
    import hashlib
    cache_dir = os.path.join(os.path.dirname(__file__), "..", "data", "tts_cache")
    os.makedirs(cache_dir, exist_ok=True)
    key = hashlib.md5(req.text.encode()).hexdigest()[:12]
    filename = f"{key}.wav"
    filepath = os.path.join(cache_dir, filename)
    if not os.path.exists(filepath):
        await tts_service.synthesize_to_file(req.text, filepath)
    return {"url": f"/static/tts/{filename}", "status": "ok"}

@router.post("/recommend")
async def recommend(req: RecommendRequest):
    """个性化路线推荐 — 每条路线返回完全不同内容"""
    result = rag_service.recommend_spots(req.preference)
    return result

_whisper_model = None

def _get_whisper():
    global _whisper_model
    if _whisper_model is None:
        # 用 imageio-ffmpeg 自带的 ffmpeg
        import imageio_ffmpeg
        ffmpeg_dir = os.path.dirname(imageio_ffmpeg.get_ffmpeg_exe())
        os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
        import whisper
        _whisper_model = whisper.load_model("tiny")
    return _whisper_model

@router.post("/voice")
async def voice_to_text(file: UploadFile = File(...)):
    """语音文件上传 → whisper 转文字"""
    model = _get_whisper()
    suffix = os.path.splitext(file.filename or "audio.mp3")[1] or ".mp3"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    try:
        result = model.transcribe(tmp_path, language="zh", fp16=False)
        text = result["text"].strip()
        return {"text": text if text else "未识别到语音内容", "status": "ok"}
    finally:
        os.unlink(tmp_path)

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
