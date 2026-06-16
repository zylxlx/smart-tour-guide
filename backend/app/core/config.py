import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # LLM
    llm_provider: str = "deepseek"
    deepseek_api_key: str = os.getenv("DEEPSEEK_API_KEY", "")
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    deepseek_model: str = "deepseek-chat"

    # 多模态模型
    qwen_api_key: str = os.getenv("QWEN_API_KEY", "")
    qwen_vl_model: str = "qwen-vl-max"

    # TTS
    tts_provider: str = "edge"

    # RAG
    faiss_index_path: str = "app/data/faiss_index"
    embedding_model: str = "BAAI/bge-small-zh-v1.5"

    # Database
    database_url: str = "sqlite:///app/data/tour_guide.db"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    class Config:
        env_file = ".env"

settings = Settings()
