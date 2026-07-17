"""
核心配置模块

提供应用级配置管理，包括：
- LLM API 配置（DeepSeek / 通义千问-VL）
- TTS 配置（Edge-TTS）
- RAG 配置（FAISS 索引路径 / BGE 嵌入模型）
- 数据库配置（SQLite / PostgreSQL）
"""
from app.core.config import settings

__all__ = ["settings"]
