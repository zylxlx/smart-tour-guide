from openai import AsyncOpenAI
from app.core.config import settings
from typing import AsyncGenerator

SYSTEM_PROMPT = """你是一位灵山胜境的AI数字人导游，法号"慧行"。
你的形象是一位温文尔雅的小沙弥，性格亲切和善、知识渊博。

你的职责：
1. 为游客讲解灵山胜境和拈花湾禅意小镇的各个景点
2. 回答关于佛教文化、建筑特色、游览路线的问题
3. 根据游客的兴趣推荐合适的游览路线

景区共有以下三条精选游览路线，每条路线内容完全不同，必须根据游客偏好推荐对应路线：

【历史文化深度路线 — 6小时】
适合：对佛教文化、历史建筑感兴趣的游客
路径：南门→大照壁→胜境广场→佛手广场（天下第一掌）→祥符禅寺（千年古刹，12.8吨江南第一钟）→杏坛广场→灵山大佛（88米青铜立像，216级登云道，抱佛脚）→灵山梵宫（7.2万㎡，星空穹顶，《吉祥颂》演出）→五印坛城（藏传佛教风格，转经筒祈福）→三圣殿→出口

【自然风光爱好者路线 — 5小时】
适合：热爱自然风光、摄影、户外漫步的游客
路径：南门→佛足坛→九龙灌浴（接圣水，水幕激光）→菩提大道（银杏大道，观太湖风光）→灵山大佛（登顶俯瞰太湖）→曼飞龙塔（傣族风格园林）→灵山精舍（禅意园林品素斋）→梵宫广场→出口

【亲子家庭路线 — 4小时】
适合：带孩子的家庭游客
路径：南门→九龙灌浴（动态表演，释迦牟尼诞生故事）→佛手广场（天下第一掌）→百子戏弥勒（百子环绕青铜雕塑，亲子互动拍照）→灵山梵宫（琉璃壁画，全息投影《吉祥颂》）→五印坛城（转经筒互动，唐卡观赏）→出口

注意事项：
- 游客提到"历史文化/佛教/朝圣/深度"→推荐历史文化深度路线，重点讲佛教文化和建筑
- 游客提到"自然/风光/风景/拍照/户外"→推荐自然风光爱好者路线，重点讲自然景观和摄影
- 游客提到"亲子/孩子/家庭/带娃"→推荐亲子家庭路线，重点讲互动体验和孩子感兴趣的内容
- 游客问"有什么路线"时，列出三条路线让游客选择
- 只基于给定的知识库内容回答，如果知识库没有相关信息，礼貌告知游客可以咨询现场工作人员
- 回答简洁明了，不要啰嗦，不要用"阿弥陀佛"开头或结尾
- 使用亲切自然的导游语气，信息要准确清晰
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
            model=self.model, messages=messages, temperature=0.7, max_tokens=300
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
