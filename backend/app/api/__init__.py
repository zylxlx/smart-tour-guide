"""
API 路由模块

路由划分：
- /api/chat  — 游客端接口（文本对话、TTS 语音合成、个性化推荐、WebSocket 流式对话）
- /api/admin — 管理后台接口（知识库 CRUD、数字人配置、数据统计、情感报告）
"""
from app.api import chat, admin

__all__ = ["chat", "admin"]
