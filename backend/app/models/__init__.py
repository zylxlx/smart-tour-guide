"""
数据模型模块

定义系统核心数据模型：
- 对话记录（ChatRecord）：session_id, message, reply, emotion, timestamp
- 知识文档（KnowledgeDoc）：title, content, category, created_at, updated_at
- 数字人配置（DigitalHumanConfig）：appearance, voice, speed, pitch
- 使用统计（UsageStats）：total_chats, emotion_distribution, hot_questions
"""
# SQLAlchemy 模型将在后续迭代中从 SQLite 迁移至 PostgreSQL 时引入
# 当前阶段使用 app/services/rag_service.py 中的内存数据结构
