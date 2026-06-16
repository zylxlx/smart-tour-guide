import os
from typing import List, Dict, Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import settings

class RAGService:
    def __init__(self):
        self.index_path = settings.faiss_index_path
        self.embeddings = None  # 延迟加载
        self.vectorstore: Optional[object] = None
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500, chunk_overlap=50,
            separators=["\n\n", "\n", "。", "！", "？", "；", "，", " ", ""]
        )
        self._documents: List[Dict] = []
        self._usage_stats = {"total_chats": 0, "emotions": {"正面": 0, "中性": 0, "负面": 0}}
        self._load_or_create_index()

    def _ensure_embeddings(self):
        if self.embeddings is None:
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
        return doc_id

    def search(self, query: str, k: int = 3) -> str:
        if self.vectorstore is None:
            return ""
        docs = self.vectorstore.similarity_search(query, k=k)
        return "\n\n".join([d.page_content for d in docs])

    def recommend_spots(self, preference: str) -> List[str]:
        if self.vectorstore is None:
            return ["灵山大佛", "九龙灌浴", "灵山梵宫", "五印坛城", "祥符禅寺", "拈花广场"]
        query_map = {
            "佛教朝圣": "佛教 朝圣 佛陀 寺庙 祈福 佛像 禅宗",
            "自然观光": "自然风光 花海 山林 湖泊 景观 银杏",
            "亲子互动": "亲子 互动 孩子 嬉戏 家庭 娱乐",
            "禅修体验": "禅修 抄经 冥想 茶道 静心 禅意",
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
        return spots[:6]

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
                return True
        return False

    def delete_document(self, doc_id: str):
        self._documents = [d for d in self._documents if d["id"] != doc_id]
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
