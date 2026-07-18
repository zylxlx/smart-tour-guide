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
    """文本对话接口 — 含情感分析"""
    context = rag_service.search(req.message)
    reply = await llm_service.chat(req.message, context)
    emotion = await llm_service.analyze_emotion(req.message)
    # 保存对话记录
    from app.services.user_service import save_conversation
    save_conversation(req.session_id, req.message, reply)
    return {"reply": reply, "session_id": req.session_id, "emotion": emotion}

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

_asr_model = None

def _get_asr_model():
    global _asr_model
    if _asr_model is None:
        from funasr import AutoModel
        _asr_model = AutoModel(
            model="paraformer-zh",
            vad_model="fsmn-vad",
            punc_model="ct-punc",
            spk_model=None,
            device="cpu",
            disable_pbar=True,
        )
    return _asr_model

def _correct_spots(text: str) -> str:
    """用拼音相似度把 ASR 输出纠正到已知景点名"""
    import re
    from difflib import SequenceMatcher

    # 灵山胜境已知景点名 + 常见误识别纠正
    known_spots = [
        "灵山大佛", "九龙灌浴", "灵山梵宫", "五印坛城", "祥符禅寺",
        "灵山大照壁", "五明桥", "佛足坛", "五智门", "菩提大道",
        "降魔浮雕", "阿育王柱", "百子戏弥勒", "三圣殿", "曼飞龙塔",
        "无尽意斋", "灵山精舍", "拈花湾", "拈花广场", "梵天花海",
        "香月花街", "拈花堂", "五灯湖", "鹿鸣谷", "胜境广场",
        "杏坛广场", "佛手广场", "天下第一掌", "南门", "出口",
    ]
    # 常见ASR同音误识别 → 正确景点名
    corrections = {
        "灵山金射": "灵山精舍", "灵山金色": "灵山精舍", "零山精舍": "灵山精舍",
        "灵山打佛": "灵山大佛", "灵山大幅": "灵山大佛",
        "九楼关羽": "九龙灌浴", "九龙关羽": "九龙灌浴",
        "灵山反攻": "灵山梵宫", "灵山凡宫": "灵山梵宫",
        "舞印谈成": "五印坛城", "五音坛城": "五印坛城",
        "香福禅寺": "祥符禅寺", "降服禅寺": "祥符禅寺",
        "拈花弯": "拈花湾", "年花湾": "拈花湾",
        "菩提大盗": "菩提大道", "菩萨大道": "菩提大道",
    }
    for wrong, right in corrections.items():
        if wrong in text:
            text = text.replace(wrong, right)

    def _similar(a, b):
        return SequenceMatcher(None, a, b).ratio()

    # 对文本中每个 2-5 字片段进行匹配
    result = text
    for spot in sorted(known_spots, key=len, reverse=True):
        if spot in text:  # 已正确识别，跳过
            continue
        spot_len = len(spot)
        for i in range(len(text) - spot_len + 1):
            chunk = text[i:i + spot_len]
            if not re.match(r'^[一-鿿]+$', chunk):
                continue
            if chunk in known_spots:  # 已是正确景点名，跳过
                continue
            sim = _similar(chunk, spot)
            if sim > 0.4 and sim < 1.0:
                result = result.replace(chunk, spot, 1)
                break
    return result

@router.post("/voice")
async def voice_to_text(file: UploadFile = File(...)):
    """语音文件上传 → whisper 转文字 + 景点名纠错"""
    model = _get_asr_model()
    suffix = os.path.splitext(file.filename or "audio.mp3")[1] or ".mp3"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    try:
        result = model.generate(input=tmp_path)
        text = ""
        if result and len(result) > 0:
            text = result[0].get("text", "").strip()
        if text:
            text = _correct_spots(text)
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
