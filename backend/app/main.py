
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

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