"""
AI 服务模块

核心服务：
- LLMService    — DeepSeek-V3 大模型对话（chat / chat_stream / analyze_emotion）
- RAGService     — LangChain + FAISS 知识检索增强生成（search / recommend_spots / 知识库管理）
- TTSService     — Edge-TTS 文本转语音（synthesize / synthesize_to_file）

数字人导游"慧行"：温文尔雅的小沙弥形象，禅意温润的语气风格
"""
from app.services.llm_service import llm_service
from app.services.rag_service import rag_service
from app.services.tts_service import tts_service

__all__ = ["llm_service", "rag_service", "tts_service"]
