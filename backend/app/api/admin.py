from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
from app.services.rag_service import rag_service
from app.services.llm_service import llm_service
from typing import Optional

router = APIRouter()

class KnowledgeDoc(BaseModel):
    title: str
    content: str
    category: str = "general"

class KnowledgeUpdate(BaseModel):
    id: str
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None

class DigitalHumanConfig(BaseModel):
    appearance: str = "zen_monk"
    voice: str = "zh-CN-XiaoxiaoNeural"
    speed: float = 1.0
    pitch: float = 0.0

# 知识库管理
@router.get("/knowledge/list")
async def list_knowledge():
    docs = rag_service.list_documents()
    return {"documents": docs}

@router.post("/knowledge/upload")
async def upload_knowledge(file: UploadFile = File(...)):
    content = await file.read()
    doc_id = rag_service.add_document(file.filename, content.decode("utf-8"))
    return {"status": "ok", "doc_id": doc_id}

@router.post("/knowledge/add")
async def add_knowledge(doc: KnowledgeDoc):
    doc_id = rag_service.add_document(doc.title, doc.content, doc.category)
    return {"status": "ok", "doc_id": doc_id}

@router.put("/knowledge/update")
async def update_knowledge(doc: KnowledgeUpdate):
    success = rag_service.update_document(doc.id, doc.title, doc.content, doc.category)
    return {"status": "ok" if success else "error"}

@router.delete("/knowledge/{doc_id}")
async def delete_knowledge(doc_id: str):
    rag_service.delete_document(doc_id)
    return {"status": "ok"}

# 数字人形象管理
@router.get("/digital-human/config")
async def get_dh_config():
    return {"appearance": "zen_monk", "voice": "zh-CN-XiaoxiaoNeural", "speed": 1.0, "pitch": 0.0}

@router.post("/digital-human/config")
async def update_dh_config(config: DigitalHumanConfig):
    return {"status": "ok", "config": config.model_dump()}

# 数据统计
@router.get("/stats/overview")
async def get_stats():
    return rag_service.get_usage_stats()

@router.get("/stats/emotion-report")
async def get_emotion_report():
    return rag_service.get_emotion_report()

@router.get("/stats/hot-questions")
async def get_hot_questions():
    return rag_service.get_hot_questions()
