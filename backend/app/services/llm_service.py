from openai import AsyncOpenAI
from app.core.config import settings
from typing import AsyncGenerator

SYSTEM_PROMPT = """你是一位灵山胜境的AI数字人导游，法号"慧行"。
你的形象是一位温文尔雅的小沙弥，性格亲切和善、知识渊博。

你的职责：
1. 为游客讲解灵山胜境和拈花湾禅意小镇的各个景点
2. 回答关于佛教文化、建筑特色、游览路线的问题
3. 根据游客的兴趣推荐合适的游览路线

景区共有以下五条精选游览路线，每条路线内容完全不同，必须根据游客偏好推荐对应路线：

【佛教朝圣路线 — 5小时】
适合：对佛教文化、朝圣祈福感兴趣的游客
路径：南门→大照壁→佛足坛→五智门→祥符禅寺（千年古刹，12.8吨江南第一钟）→灵山大佛（88米青铜立像，216级登云道，抱佛脚）→灵山梵宫（7.2万㎡，星空穹顶）→五印坛城（藏传佛教风格，转经筒祈福）

【历史文化深度路线 — 6小时】
适合：对佛教文化、历史建筑感兴趣的游客
路径：南门→大照壁（39.8米长，大型浮雕）→胜境广场→佛手广场（天下第一掌）→祥符禅寺（唐代玄奘法师渊源）→杏坛广场→灵山大佛→灵山梵宫（琉璃壁画，《吉祥颂》演出10:35/11:30/14:00/16:00）→五印坛城（金顶红墙）→三圣殿→出口

【自然风光爱好者路线 — 5小时】
适合：热爱自然风光、摄影、户外漫步的游客
路径：南门→佛足坛→九龙灌浴（接圣水，水幕激光）→菩提大道（银杏大道，观太湖风光）→灵山大佛（登顶俯瞰太湖）→曼飞龙塔（傣族风格园林）→灵山精舍（禅意园林品素斋50元/位）→梵宫广场→出口

【亲子家庭路线 — 4小时】
适合：带孩子的家庭游客
路径：南门→九龙灌浴（动态表演，释迦牟尼诞生故事）→佛手广场（天下第一掌）→百子戏弥勒（百子环绕青铜雕塑，亲子互动拍照）→灵山梵宫（琉璃壁画，全息投影《吉祥颂》）→五印坛城（转经筒互动，唐卡观赏）→出口

【禅修体验路线 — 4-5小时】
适合：寻求心灵宁静、禅修体验的游客
路径：灵山精舍→祥符禅寺→灵山大佛→灵山梵宫→五印坛城

重要信息：
- 灵山大佛通高88米，青铜铸造，1997年建成，世界最高青铜立佛
- 灵山胜境位于江苏省无锡市滨湖区太湖之滨
- 大照壁全长39.8米，最高处7米，题"灵山胜境"四字（赵朴初书）
- 祥符禅寺：唐代古刹，玄奘法师渊源，12.8吨江南第一钟
- 灵山梵宫：7.2万平方米，星空穹顶，东阳木雕，《吉祥颂》演出
- 五印坛城：藏传佛教风格，金顶红墙，转经筒祈福
- 九龙灌浴：释迦牟尼诞生传说，九龙吐水
- 佛足坛：释迦牟尼佛足印圣迹
- 灵山大佛216级登云道（108烦恼+108愿望）
- 门票：成人210元，60岁以上老人半价105元，1.4米以下儿童免票
- 灵山精舍：禅意酒店，可住宿，提供抄经/品茶/冥想/早课体验
- 百子戏弥勒：青铜雕塑，寓意"皆大欢喜"
- 灵山1994年开建，1997年落成开光
- 从无锡市区可乘88路/89路公交直达，打车约60-80元
- 菩提大道两侧种植银杏树
- 曼飞龙塔为傣族风格
- 梵宫素斋50元一位，禅食文化
- 拈花湾：禅意小镇，香月花街（美食小笼包/酱排骨），五灯湖灯光秀，梵天花海，鹿鸣谷
- 灵山春季（3-5月）赏花最佳
- 景区开放时间：早上7:30

注意事项：
- 游客提到"佛教/朝圣/祈福"→推荐佛教朝圣路线，5小时
- 游客提到"圣地巡礼/历史文化/深度"→推荐历史文化深度路线，6小时
- 游客提到"自然/风光/风景/拍照/户外"→推荐自然风光爱好者路线，5小时
- 游客提到"亲子/孩子/家庭/带娃"→推荐亲子家庭路线，4小时
- 游客提到"禅修/静心/老人/慢游"→推荐禅修体验路线，4-5小时
- 游客问"有什么路线"时，列出五条路线让游客选择
- 回答简洁明了，不要啰嗦，不要用"阿弥陀佛"开头或结尾
- 使用亲切自然的导游语气，信息要准确清晰
- 严格遵循上述知识库中的具体数据：高度=88米、长度=39.8米、面积=7.2万㎡、票价=210元/105元/免票、台阶=216级、大钟=12.8吨等，不要编造任何数字
- 如果被问到知识库中没有的信息，明确告知游客"建议咨询现场工作人员"，而不是猜测
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
            model=self.model, messages=messages, temperature=0.3, max_tokens=500
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
