from openai import AsyncOpenAI
from app.core.config import settings
from typing import AsyncGenerator

SYSTEM_PROMPT = """你是一位灵山胜境的AI数字人导游，法号"慧行"。
你的形象是一位温文尔雅的小沙弥，性格亲切和善、知识渊博。

你的职责：
1. 为游客讲解灵山胜境和拈花湾禅意小镇的各个景点
2. 回答关于佛教文化、建筑特色、游览路线的问题
3. 根据游客的兴趣推荐合适的游览路线

注意事项：
- 只基于给定的知识库内容回答，如果知识库没有相关信息，礼貌告知游客可以咨询现场工作人员
- 使用带有禅意的温润语气，但信息要准确清晰
- 回答末尾可以加一句禅意小语或温馨提示
- 不要编造任何事实信息
"""

class LLMService:
    def __init__(self):
        self.client = None
        self.model = settings.deepseek_model

    def _ensure_client(self):
        if self.client is None and settings.deepseek_api_key:
            self.client = AsyncOpenAI(
                api_key=settings.deepseek_api_key,
                base_url=settings.deepseek_base_url
            )

    def is_ready(self) -> bool:
        self._ensure_client()
        return self.client is not None

    async def chat(self, message: str, context: str = "") -> str:
        self._ensure_client()
        if self.client is None:
            return (
                "阿弥陀佛，慧行尚未配置API密钥，暂时无法为您解答。\n"
                "请在 backend/.env 文件中设置 DEEPSEEK_API_KEY=sk-你的密钥\n"
                "注册地址：https://platform.deepseek.com"
            )
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        if context:
            messages.append({"role": "system", "content": f"以下是你可以参考的知识库信息：\n{context}"})
        messages.append({"role": "user", "content": message})
        resp = await self.client.chat.completions.create(
            model=self.model, messages=messages, temperature=0.7, max_tokens=1024
        )
        return resp.choices[0].message.content

    async def chat_stream(self, message: str, context: str = "") -> AsyncGenerator[str, None]:
        self._ensure_client()
        if self.client is None:
            yield "未配置API Key，请在 backend/.env 中设置 DEEPSEEK_API_KEY"
            return
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        if context:
            messages.append({"role": "system", "content": f"以下是你可以参考的知识库信息：\n{context}"})
        messages.append({"role": "user", "content": message})
        stream = await self.client.chat.completions.create(
            model=self.model, messages=messages, temperature=0.7, max_tokens=1024, stream=True
        )
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def analyze_emotion(self, text: str) -> str:
        self._ensure_client()
        if self.client is None:
            return "中性"
        prompt = f"分析以下用户消息的情感倾向，只回复一个词：正面、中性、负面\n消息：{text}"
        resp = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0, max_tokens=10
        )
        return resp.choices[0].message.content.strip()

llm_service = LLMService()
