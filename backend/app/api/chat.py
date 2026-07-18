from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.services.llm_service import llm_service
from app.services.tts_service import tts_service
from app.services.rag_service import rag_service
import asyncio
import hashlib
import json
import os
import re
import tempfile

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

class RecommendRequest(BaseModel):
    preference: str

class TTSRequest(BaseModel):
    text: str


# ---- shared TTS helpers ----

def _clean_for_tts(text: str) -> str:
    """Remove emoji/special chars, keep CJK + digits + basic punctuation."""
    # Strip emoji ranges
    cleaned = re.sub(r'[\U0001F000-\U0001FFFF]', '', text)
    cleaned = re.sub(r'[☀-➿]', '', cleaned)
    cleaned = re.sub(r'[︀-﻿]', '', cleaned)
    # Keep only CJK, fullwidth forms, digits, whitespace, common punctuation
    cleaned = re.sub(r'[^一-鿿　-〿＀-￯\d\n,，。.!！?？:：、\s]', '', cleaned)
    cleaned = re.sub(r'\n+', '，', cleaned)
    return cleaned.strip()


async def _generate_tts_url(text: str, speed: str = "+0%") -> str:
    """Generate TTS audio file (cached) and return the static URL path."""
    cache_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'tts_cache')
    os.makedirs(cache_dir, exist_ok=True)
    key = hashlib.md5((text + speed).encode()).hexdigest()[:12]
    filename = f'{key}.wav'
    filepath = os.path.join(cache_dir, filename)
    if not os.path.exists(filepath):
        old_rate = tts_service.rate
        tts_service.rate = speed
        await tts_service.synthesize_to_file(text, filepath)
        tts_service.rate = old_rate
    return f'/static/tts/{filename}'


@router.post("/send")
async def chat(req: ChatRequest):
    """文本对话接口 — 含情感分析 + TTS（并行化LLM调用）"""
    context = rag_service.search(req.message)

    # 并行：LLM 对话 + 情感分析（容错：API 失败时降级本地回复）
    try:
        reply, emotion = await asyncio.gather(
            llm_service.chat(req.message, context),
            llm_service.analyze_emotion(req.message),
        )
    except Exception:
        reply = llm_service.chat_sync(req.message, context) if hasattr(llm_service, 'chat_sync') else (
            "阿弥陀佛，慧行暂时无法联网回答，请您稍后再试。\n"
            "您可以尝试以下操作：\n"
            "1. 选择上方偏好标签获取游览路线\n"
            "2. 询问常见问题（灵山大佛多高、九龙灌浴几点等）\n"
            "3. 联系现场工作人员"
        )
        emotion = "中性"

    # 生成 TTS（AI 回复用快速语速）
    tts_text = _clean_for_tts(reply)
    tts_url = await _generate_tts_url(tts_text) if tts_text else None

    # 保存对话记录（首次自动记录登录）
    from app.services.user_service import save_conversation, save_login
    import os as _os
    _login_flag = _os.path.join(_os.path.dirname(__file__), "..", "data", f"_login_{req.session_id}")
    if not _os.path.exists(_login_flag):
        save_login(req.session_id)
        with open(_login_flag, "w") as _f: _f.write("1")
    save_conversation(req.session_id, req.message, reply)
    return {"reply": reply, "session_id": req.session_id, "emotion": emotion, "tts_url": tts_url}

@router.post("/tts")
async def text_to_speech(req: TTSRequest):
    """TTS → 保存为文件，返回静态URL给小程序播放"""
    url = await _generate_tts_url(req.text)
    return {"url": url, "status": "ok"}

@router.post("/recommend")
async def recommend(req: RecommendRequest):
    """个性化路线推荐 — 返回结构化路线数据 + TTS 语音"""
    result = rag_service.recommend_spots(req.preference)

    # TTS 语音文本 — 只说路线名和景点数
    tts_text = ""
    if result.get("route_name"):
        spot_count = len(result.get("path", "").split("→")) if result.get("path") else 0
        tts_text = f"为您推荐{result['route_name']}"
        if result.get("duration"):
            tts_text += f"，约{result['duration']}"
        tts_text += f"，共{spot_count}个景点"
    if not tts_text:
        tts_text = f"为您推荐{req.preference}路线"

    tts_url = await _generate_tts_url(tts_text) if tts_text else None
    result["tts_url"] = tts_url
    return result


class TourStartRequest(BaseModel):
    preference: str

@router.post("/tour/start")
async def start_tour(req: TourStartRequest):
    """伴随式讲解：根据偏好生成路线每景点的语音讲解"""
    import asyncio as _asyncio
    result = rag_service.recommend_spots(req.preference)
    spots = [s.strip() for s in result.get("path", "").split("→") if s.strip()]
    route_name = result.get("route_name", req.preference)

    # 并发生成每个景点的LLM讲解 + TTS
    async def _spot_item(spot: str, idx: int):
        try:
            prompt = f"你是灵山胜境AI导游慧行。请用1-2句话简洁介绍景点「{spot}」，语气亲切自然，适合语音导游讲解。不要用感叹号。"
            reply = await llm_service.chat(prompt)
            if not reply or "API密钥" in reply or "暂无法" in reply:
                reply = f"{spot}是灵山胜境的重要景点，欢迎您参观游览。"
            tts_text = _clean_for_tts(reply)
            tts_url = await _generate_tts_url(tts_text) if tts_text else None
            return {"spot": spot, "text": reply, "tts_url": tts_url, "idx": idx}
        except:
            return {"spot": spot, "text": f"欢迎来到{spot}", "tts_url": None, "idx": idx}

    items = await _asyncio.gather(*[_spot_item(s, i) for i, s in enumerate(spots)])
    items = sorted([i for i in items if i and i.get("tts_url")], key=lambda x: x["idx"])
    return {"route_name": route_name, "items": items, "total": len(items)}


_asr_model = None
_asr_loading = False

def get_asr_model():
    global _asr_model, _asr_loading
    if _asr_model is None and not _asr_loading:
        _asr_loading = True
        try:
            from funasr import AutoModel
            _asr_model = AutoModel(
                model="paraformer-zh",
                device="cpu",
                disable_pbar=True,
            )
        finally:
            _asr_loading = False
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

    # 模糊纠错已禁用（太容易误纠正），只保留精确词典
    return text

@router.post("/voice")
async def voice_to_text(file: UploadFile = File(...)):
    """语音文件上传 → whisper 转文字 + 景点名纠错"""
    model = get_asr_model()
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
