
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.api import chat, admin

app = FastAPI(title="Smart Tour Guide API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# TTS 音频缓存静态目录
tts_cache_dir = os.path.join(os.path.dirname(__file__), "data", "tts_cache")
os.makedirs(tts_cache_dir, exist_ok=True)
app.mount("/static/tts", StaticFiles(directory=tts_cache_dir), name="tts_static")

app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

@app.on_event("startup")
async def startup_event():
    """预加载语音识别模型"""
    import threading
    threading.Thread(target=lambda: chat.get_asr_model(), daemon=True).start()

@app.get("/")
def root():
    return {"message": "Smart Tour Guide API is running"}
# 适配中文的分块设置
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=700,       # 单块合适长度
    chunk_overlap=200,    # 增加重叠保证上下文连续
    separators=["\n\n", "\n", "。", "，", "？", "！"],  # 优先按中文句号分句
    length_function=len
)