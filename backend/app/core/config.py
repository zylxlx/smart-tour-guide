import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    llm_provider: str = "deepseek"
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    deepseek_model: str = "deepseek-chat"

    qwen_api_key: str = ""
    qwen_vl_model: str = "qwen-vl-max"

    tts_provider: str = "edge"

    faiss_index_path: str = "app/data/faiss_index"
    embedding_model: str = "BAAI/bge-small-zh-v1.5"

    database_url: str = "sqlite:///app/data/tour_guide.db"

    host: str = "0.0.0.0"
    port: int = 8000

settings = Settings()
