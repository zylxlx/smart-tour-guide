import os
from typing import List, Dict, Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import settings

# ============================================================
# 路线知识库（来自灵山胜境官方资料）
# 每条路线有独立的路径、讲解重点、特色体验，确保不同路线回答完全不同
# ============================================================
ROUTE_DATABASE = {
    "佛教朝圣路线": {
        "name": "佛教朝圣路线",
        "duration": "5小时",
        "path": "南门 → 大照壁 → 佛足坛 → 五智门 → 祥符禅寺 → 灵山大佛 → 灵山梵宫 → 五印坛城",
        "highlights": [
            "佛足坛：释迦牟尼佛足印圣迹，信徒绕坛祈福",
            "祥符禅寺：千年古刹，玄奘法师渊源，撞钟祈福",
            "灵山大佛：88米青铜立像，登顶抱佛脚，感受无上庄严",
            "五印坛城：藏传佛教风格，转经筒祈福体验"
        ],
        "experiences": [
            "祥符禅寺撞响江南第一钟",
            "大佛脚下静心祈福",
            "五印坛城转经静思",
            "梵宫素斋体验禅食文化"
        ],
        "suitable_for": "对佛教文化、朝圣祈福感兴趣的游客"
    },
    "历史文化深度路线": {
        "name": "历史文化深度路线",
        "duration": "6小时",
        "path": "南门 → 大照壁 → 胜境广场 → 佛手广场（天下第一掌） → 祥符禅寺（千年古刹） → 杏坛广场 → 灵山大佛 → 灵山梵宫 → 五印坛城 → 三圣殿 → 出口",
        "highlights": [
            "灵山大照壁：全长39.8米，最高处7米，大型浮雕展现佛教文化辉煌",
            "祥符禅寺：千年古刹，玄奘法师与「小灵山」的渊源，12.8吨江南第一钟",
            "灵山大佛：88米青铜立像，216级登云道（108烦恼+108愿望），抱佛脚祈福",
            "灵山梵宫：7.2万㎡，星空穹顶、琉璃壁画《华藏世界》、东阳木雕，《吉祥颂》演出",
            "五印坛城：藏传佛教风格，金顶红墙，转经筒祈福"
        ],
        "experiences": [
            "祥符禅寺撞响12.8吨江南第一钟",
            "梵宫观看《吉祥颂》全息投影演出（10:35/11:30/14:00/16:00）",
            "登大佛平台俯瞰太湖全景",
            "五印坛城转经筒祈福"
        ],
        "suitable_for": "对佛教文化、历史建筑感兴趣的游客"
    },
    "自然风光爱好者路线": {
        "name": "自然风光爱好者路线",
        "duration": "5小时",
        "path": "南门 → 佛足坛 → 九龙灌浴（接圣水） → 菩提大道 → 灵山大佛（登顶观太湖） → 曼飞龙塔（傣族风格） → 灵山精舍（禅意园林） → 梵宫广场 → 出口",
        "highlights": [
            "菩提大道：银杏枝繁叶茂象征佛法繁荣，沿途观赏太湖、白虎山、龙珠山自然地貌",
            "灵山大佛：选址三山环抱、面朝太湖，前有照中有靠后有抱风水格局",
            "曼飞龙塔：傣族风格建筑，与自然园林和谐融合",
            "灵山精舍：禅意园林，「天人合一」传统园林文化"
        ],
        "experiences": [
            "九龙灌浴处接取祈福圣水，观看水幕激光七彩佛光",
            "登大佛平台看太湖日落/晨雾，拍摄绝美风光",
            "灵山精舍品尝素斋，感受「禅食一味」",
            "菩提大道漫步，感受佛教文化与自然融合"
        ],
        "suitable_for": "热爱自然风光、摄影、户外漫步的游客"
    },
    "亲子家庭路线": {
        "name": "亲子家庭路线",
        "duration": "4小时",
        "path": "南门 → 九龙灌浴（动态表演） → 佛手广场（天下第一掌） → 百子戏弥勒（亲子互动） → 灵山梵宫（琉璃壁画） → 五印坛城（转经筒互动） → 出口",
        "highlights": [
            "九龙灌浴：释迦牟尼诞生故事，「九龙吐水」传说，「花开见佛」仪式感",
            "百子戏弥勒：青铜雕塑，百子环绕弥勒佛，感受「皆大欢喜」生活态度",
            "灵山梵宫：琉璃壁画、飞天雕塑色彩丰富，激发孩子艺术兴趣",
            "五印坛城：转经筒互动、唐卡色彩，体验不同民族文化"
        ],
        "experiences": [
            "参加「抱佛脚」亲子活动，家长陪同登顶大佛",
            "梵宫观看《吉祥颂》全息投影演出",
            "品尝特色儿童套餐，清淡健康适合孩子口味",
            "百子戏弥勒前拍照留念"
        ],
        "suitable_for": "带孩子的家庭游客"
    },
    "禅修体验路线": {
        "name": "禅修体验路线",
        "duration": "4-5小时",
        "path": "灵山精舍 → 祥符禅寺 → 灵山大佛 → 灵山梵宫 → 五印坛城",
        "highlights": [
            "灵山精舍：禅意酒店，抄经、品茶、冥想、早课体验",
            "祥符禅寺：千年古刹，撞钟祈福，感受佛门清净",
            "灵山大佛：登顶抱佛脚，静心远眺太湖",
            "梵宫与五印坛城：汉传与藏传佛教文化对比体验"
        ],
        "experiences": [
            "灵山精舍参加早课或抄经体验",
            "祥符禅寺撞钟静心",
            "梵宫素斋50元/位，体验禅食文化",
            "五印坛城转经静思"
        ],
        "suitable_for": "寻求心灵宁静、禅修体验的游客"
    }
}

# 偏好到路线的映射
PREFERENCE_TO_ROUTE = {
    "佛教朝圣": "佛教朝圣路线",
    "圣地巡礼": "佛教朝圣路线",
    "历史文化": "历史文化深度路线",
    "文化深度游": "历史文化深度路线",
    "自然观光": "自然风光爱好者路线",
    "亲子互动": "亲子家庭路线",
    "禅修体验": "禅修体验路线",
}


class RAGService:
    def __init__(self):
        self.index_path = settings.faiss_index_path
        self.doc_path = os.path.join(os.path.dirname(self.index_path), "documents.json")
        self.embeddings = None
        self.vectorstore: Optional[object] = None
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500, chunk_overlap=50,
            separators=["\n\n", "\n", "。", "！", "？", "；", "，", " ", ""]
        )
        self._documents: List[Dict] = self._load_documents()
        self._usage_stats = {"total_chats": 0, "emotions": {"正面": 0, "中性": 0, "负面": 0}}
        self._load_or_create_index()

    def _load_documents(self) -> List[Dict]:
        import json
        if os.path.exists(self.doc_path):
            try:
                with open(self.doc_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except: pass
        return []

    def _save_documents(self):
        import json
        os.makedirs(os.path.dirname(self.doc_path), exist_ok=True)
        with open(self.doc_path, "w", encoding="utf-8") as f:
            json.dump(self._documents, f, ensure_ascii=False, indent=2)

    def _ensure_embeddings(self):
        if self.embeddings is None:
            # 使用国内镜像下载模型，避免 SSL 证书问题
            os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"
            os.environ["CURL_CA_BUNDLE"] = ""
            from langchain_community.embeddings import HuggingFaceEmbeddings
            self.embeddings = HuggingFaceEmbeddings(
                model_name=settings.embedding_model,
                model_kwargs={"device": "cpu"}
            )

    def _load_or_create_index(self):
        if os.path.exists(self.index_path):
            try:
                self._ensure_embeddings()
                from langchain_community.vectorstores import FAISS
                self.vectorstore = FAISS.load_local(
                    self.index_path, self.embeddings, allow_dangerous_deserialization=True
                )
            except Exception:
                self.vectorstore = None

    def is_ready(self) -> bool:
        return self.vectorstore is not None

    def add_document(self, title: str, content: str, category: str = "general") -> str:
        self._ensure_embeddings()
        from langchain_community.vectorstores import FAISS
        doc_id = f"{category}_{len(self._documents)}"
        chunks = self.text_splitter.split_text(content)
        texts = [f"[{title}]\n{chunk}" for chunk in chunks]
        if self.vectorstore is None:
            self.vectorstore = FAISS.from_texts(texts, self.embeddings)
        else:
            self.vectorstore.add_texts(texts)
        os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
        self.vectorstore.save_local(self.index_path)
        self._documents.append({"id": doc_id, "title": title, "content": content, "category": category})
        self._save_documents()
        return doc_id

    def search(self, query: str, k: int = 3) -> str:
        if self.vectorstore is None:
            return ""
        docs = self.vectorstore.similarity_search(query, k=k)
        return "\n\n".join([d.page_content for d in docs])

    def recommend_spots(self, preference: str) -> dict:
        """根据偏好返回详细路线信息，每条路线内容完全不同"""
        route_name = PREFERENCE_TO_ROUTE.get(preference)
        if route_name and route_name in ROUTE_DATABASE:
            route = ROUTE_DATABASE[route_name]
            return {
                "preference": preference,
                "route_name": route["name"],
                "duration": route["duration"],
                "path": route["path"],
                "highlights": route["highlights"],
                "experiences": route["experiences"],
                "spots": route["path"].split("→"),
                "suitable_for": route["suitable_for"],
            }
        # fallback: 尝试向量搜索
        if self.vectorstore is not None:
            query_map = {
                "佛教朝圣": "佛教 朝圣 佛陀 寺庙 祈福 佛像 禅宗",
                "圣地巡礼": "佛教 朝圣 佛陀 寺庙 祈福 佛像 禅宗",
                "自然观光": "自然风光 花海 山林 湖泊 景观 银杏",
                "亲子互动": "亲子 互动 孩子 嬉戏 家庭 娱乐",
                "禅修体验": "禅修 抄经 冥想 茶道 静心 禅意",
                "历史文化": "历史 文化 建筑 艺术 非遗 博物馆 文物",
                "文化深度游": "历史 文化 建筑 艺术 非遗 博物馆 文物",
            }
            keywords = query_map.get(preference, preference)
            docs = self.vectorstore.similarity_search(keywords, k=8)
            seen = set()
            spots = []
            for d in docs:
                spot_name = self._extract_spot_name(d.page_content)
                if spot_name and spot_name not in seen:
                    seen.add(spot_name)
                    spots.append(spot_name)
            return {"preference": preference, "route_name": preference, "spots": spots[:6]}
        # 最终兜底
        return {
            "preference": preference,
            "route_name": preference,
            "spots": ["灵山大佛", "九龙灌浴", "灵山梵宫", "五印坛城", "祥符禅寺"],
        }

    def get_route_detail(self, route_name: str) -> dict:
        """获取指定名称路线的详细信息"""
        for key, route in ROUTE_DATABASE.items():
            if route_name in key or key in route_name:
                return route
        return None

    def list_routes(self) -> List[dict]:
        """列出所有可用路线"""
        return [
            {"name": r["name"], "duration": r["duration"], "suitable_for": r["suitable_for"]}
            for r in ROUTE_DATABASE.values()
        ]

    def _extract_spot_name(self, text: str) -> str:
        for line in text.split("\n"):
            line = line.strip()
            if line.startswith("[") and "]" in line:
                return line.split("]")[0][1:]
        return ""

    def list_documents(self) -> List[Dict]:
        return self._documents

    def update_document(self, doc_id: str, title: str = None, content: str = None, category: str = None) -> bool:
        for doc in self._documents:
            if doc["id"] == doc_id:
                if title: doc["title"] = title
                if content: doc["content"] = content
                if category: doc["category"] = category
                self._save_documents()
                return True
        return False

    def delete_document(self, doc_id: str):
        self._documents = [d for d in self._documents if d["id"] != doc_id]
        self._save_documents()
        self._rebuild_index()

    def _rebuild_index(self):
        if not self._documents:
            return
        self._ensure_embeddings()
        from langchain_community.vectorstores import FAISS
        all_texts = []
        for doc in self._documents:
            chunks = self.text_splitter.split_text(doc["content"])
            all_texts.extend([f"[{doc['title']}]\n{chunk}" for chunk in chunks])
        self.vectorstore = FAISS.from_texts(all_texts, self.embeddings)
        self.vectorstore.save_local(self.index_path)

    def get_usage_stats(self) -> Dict:
        return {"total_chats": self._usage_stats["total_chats"], "emotion_distribution": self._usage_stats["emotions"]}

    def get_emotion_report(self) -> Dict:
        return {"emotions": self._usage_stats["emotions"], "trend": "stable"}

    def get_hot_questions(self) -> List[Dict]:
        return [{"rank": 1, "question": "灵山大佛有多高？", "count": 156},
                {"rank": 2, "question": "九龙灌浴表演几点开始？", "count": 132}]

rag_service = RAGService()
