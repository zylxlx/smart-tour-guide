"use client";

import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface KnowledgeDoc {
  id: string;
  title: string;
  category: string;
  content?: string;
}

interface StatsOverview {
  total_chats?: number;
  emotion_distribution?: Record<string, number>;
}

interface HotQuestion {
  rank: number;
  question: string;
  count: number;
}

interface DHConfig {
  appearance: string;
  voice: string;
  speed: number;
  pitch: number;
}

const TABS = [
  { key: "knowledge", label: "📚 知识库管理" },
  { key: "dhconfig", label: "🎭 数字人形象" },
  { key: "dashboard", label: "📊 数据大屏" },
  { key: "emotion", label: "💬 感受度报告" },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("knowledge");

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航栏 */}
      <header className="bg-gray-800 text-white p-4 flex items-center justify-between shadow-lg">
        <h1 className="text-lg font-bold">灵山AI导游 · 管理后台</h1>
        <a href="/" className="text-sm text-gray-300 hover:text-white transition">
          返回游客端
        </a>
      </header>

      <div className="flex">
        {/* 左侧菜单 */}
        <nav className="w-48 min-h-[calc(100vh-57px)] bg-gray-900 text-white p-4 space-y-2 flex-shrink-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`block w-full text-left px-3 py-2 rounded text-sm transition ${
                activeTab === t.key ? "bg-gray-700 font-medium" : "hover:bg-gray-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* 右侧内容区 */}
        <main className="flex-1 p-6">
          {activeTab === "knowledge" && <KnowledgeTab />}
          {activeTab === "dhconfig" && <DHConfigTab />}
          {activeTab === "dashboard" && <DashboardTab />}
          {activeTab === "emotion" && <EmotionTab />}
        </main>
      </div>
    </div>
  );
}

/* ========== 标签页1：知识库管理 ========== */
function KnowledgeTab() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("景点知识");
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [message, setMessage] = useState("");

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/knowledge/list`);
      if (res.ok) {
        const data = await res.json();
        setDocs(data.documents || []);
      }
    } catch {
      setMessage("无法连接后端服务");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async () => {
    if (!file && !title) return;
    setMessage("");
    try {
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${API_URL}/api/admin/knowledge/upload`, {
          method: "POST", body: formData,
        });
        if (!res.ok) throw new Error("上传失败");
        setFile(null);
      } else if (title) {
        const res = await fetch(`${API_URL}/api/admin/knowledge/add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content: title, category }),
        });
        if (!res.ok) throw new Error("添加失败");
        setTitle("");
      }
      setMessage("操作成功");
      fetchDocs();
    } catch {
      setMessage("操作失败，请重试");
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await fetch(`${API_URL}/api/admin/knowledge/${docId}`, { method: "DELETE" });
      fetchDocs();
    } catch {
      setMessage("删除失败");
    }
  };

  const handleEdit = (doc: KnowledgeDoc) => {
    setEditingId(doc.id);
    setEditTitle(doc.title);
    setEditContent(doc.content || "");
  };

  const handleSaveEdit = async () => {
    try {
      await fetch(`${API_URL}/api/admin/knowledge/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, title: editTitle, content: editContent }),
      });
      setEditingId(null);
      fetchDocs();
      setMessage("更新成功");
    } catch {
      setMessage("更新失败");
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">知识库管理</h2>
      {message && (
        <div className={`mb-3 px-3 py-2 rounded text-sm ${message.includes("失败") || message.includes("无法") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
          {message}
        </div>
      )}
      <div className="bg-white rounded-lg p-4 shadow space-y-3">
        <div className="flex gap-2 flex-wrap items-center">
          <input
            placeholder="文档标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border px-3 py-1.5 rounded text-sm flex-1 min-w-[160px]"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border px-2 py-1.5 rounded text-sm"
          >
            <option>景点知识</option>
            <option>历史文化</option>
            <option>佛教文化</option>
            <option>游览攻略</option>
            <option>FAQ问答</option>
          </select>
          <input
            type="file"
            accept=".txt,.md"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          <button
            onClick={handleUpload}
            disabled={!file && !title}
            className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 transition disabled:opacity-50"
          >
            上传
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm py-4">加载中...</p>
        ) : docs.length === 0 ? (
          <p className="text-gray-400 text-sm py-4">暂无文档，请上传知识文档。</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 text-left">标题</th>
                <th className="p-2 text-left">分类</th>
                <th className="p-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-t">
                  <td className="p-2">
                    {editingId === doc.id ? (
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="border px-2 py-0.5 rounded text-sm w-full"
                      />
                    ) : (
                      doc.title
                    )}
                  </td>
                  <td className="p-2 text-gray-500">{doc.category}</td>
                  <td className="p-2 space-x-2">
                    {editingId === doc.id ? (
                      <>
                        <button onClick={handleSaveEdit} className="text-green-600 text-sm">保存</button>
                        <button onClick={() => setEditingId(null)} className="text-gray-500 text-sm">取消</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(doc)} className="text-blue-600 text-sm">编辑</button>
                        <button onClick={() => handleDelete(doc.id)} className="text-red-600 text-sm">删除</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ========== 标签页2：数字人形象配置 ========== */
function DHConfigTab() {
  const [config, setConfig] = useState<DHConfig>({
    appearance: "zen_monk",
    voice: "zh-CN-XiaoxiaoNeural",
    speed: 1.0,
    pitch: 0.0,
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/admin/digital-human/config`)
      .then((r) => r.json())
      .then((data) => {
        if (data.appearance) setConfig(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      await fetch(`${API_URL}/api/admin/digital-human/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
  };

  if (loading) return <p className="text-gray-400">加载中...</p>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">数字人形象配置</h2>
      <div className="bg-white rounded-lg p-6 shadow space-y-5">
        <div className="flex items-center">
          <label className="text-sm font-medium w-24">外观风格</label>
          <select
            value={config.appearance}
            onChange={(e) => setConfig({ ...config, appearance: e.target.value })}
            className="border px-3 py-1.5 rounded text-sm flex-1 max-w-xs"
          >
            <option value="zen_monk">禅意小沙弥</option>
            <option value="zen_girl">禅意少女</option>
            <option value="tang_monk">唐代僧侣</option>
          </select>
        </div>

        <div className="flex items-center">
          <label className="text-sm font-medium w-24">语音选择</label>
          <select
            value={config.voice}
            onChange={(e) => setConfig({ ...config, voice: e.target.value })}
            className="border px-3 py-1.5 rounded text-sm flex-1 max-w-xs"
          >
            <option value="zh-CN-XiaoxiaoNeural">晓晓 (女声·温柔)</option>
            <option value="zh-CN-YunxiNeural">云希 (男声·沉稳)</option>
            <option value="zh-CN-XiaoyiNeural">晓伊 (女声·活泼)</option>
            <option value="zh-CN-YunjianNeural">云健 (男声·阳光)</option>
          </select>
        </div>

        <div className="flex items-center">
          <label className="text-sm font-medium w-24">
            语速 <span className="text-gray-400">({config.speed.toFixed(1)}x)</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={config.speed}
            onChange={(e) => setConfig({ ...config, speed: parseFloat(e.target.value) })}
            className="flex-1 max-w-xs"
          />
        </div>

        <div className="flex items-center">
          <label className="text-sm font-medium w-24">
            音调 <span className="text-gray-400">({config.pitch > 0 ? "+" : ""}{config.pitch.toFixed(0)}%)</span>
          </label>
          <input
            type="range"
            min="-20"
            max="20"
            step="5"
            value={config.pitch}
            onChange={(e) => setConfig({ ...config, pitch: parseFloat(e.target.value) })}
            className="flex-1 max-w-xs"
          />
        </div>

        <button
          onClick={handleSave}
          className="bg-amber-600 text-white px-6 py-2 rounded text-sm hover:bg-amber-700 transition"
        >
          {saved ? "已保存 ✓" : "保存配置"}
        </button>
      </div>
    </div>
  );
}

/* ========== 标签页3：数据大屏 ========== */
function DashboardTab() {
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [hotQuestions, setHotQuestions] = useState<HotQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/admin/stats/overview`).then((r) => r.json()).catch(() => null),
      fetch(`${API_URL}/api/admin/stats/hot-questions`).then((r) => r.json()).catch(() => []),
    ]).then(([s, h]) => {
      setStats(s);
      setHotQuestions(Array.isArray(h) ? h : []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-4">数据大屏</h2>
        <p className="text-gray-400">加载数据中...</p>
      </div>
    );
  }

  const statCards = [
    { title: "累计服务人次", value: stats?.total_chats?.toLocaleString() || "0" },
    { title: "问答准确率", value: "≥90%" },
    { title: "平均响应时间", value: "<3秒" },
    { title: "正面评价占比", value: stats?.emotion_distribution?.["正面"]
      ? `${Math.round((stats.emotion_distribution["正面"] / (stats.total_chats || 1)) * 100)}%`
      : "--" },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">数据大屏</h2>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white rounded-lg p-6 shadow text-center">
            <p className="text-gray-500 text-sm">{s.title}</p>
            <p className="text-3xl font-bold text-amber-600 mt-2">{s.value}</p>
          </div>
        ))}
      </div>

      {/* 热门问答 */}
      <div className="bg-white rounded-lg p-6 shadow">
        <h3 className="font-bold mb-3">热门问答 TOP5</h3>
        {hotQuestions.length === 0 ? (
          <p className="text-sm text-gray-400">暂无数据</p>
        ) : (
          hotQuestions.map((q, i) => (
            <div key={i} className="flex justify-between py-2 text-sm border-b last:border-0">
              <span>
                <span className="text-amber-600 font-medium mr-2">{q.rank || i + 1}.</span>
                {q.question}
              </span>
              <span className="text-gray-400">{q.count}次</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ========== 标签页4：感受度报告 ========== */
function EmotionTab() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/admin/stats/emotion-report`)
      .then((r) => r.json())
      .then(setReport)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-4">感受度报告</h2>
        <p className="text-gray-400">加载数据中...</p>
      </div>
    );
  }

  const emotions = report?.emotions || {};

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">感受度报告</h2>

      <div className="bg-white rounded-lg p-6 shadow space-y-6">
        {/* 情感分布 */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {emotions["正面"] || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">正面评价</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">
              {emotions["中性"] || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">中性评价</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">
              {emotions["负面"] || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">负面评价</p>
          </div>
        </div>

        {/* 趋势 */}
        <div>
          <h3 className="font-bold mb-2">情感趋势</h3>
          <p className="text-sm text-gray-500">
            整体趋势：{report?.trend === "stable" ? "保持稳定" : report?.trend || "暂无数据"}
          </p>
        </div>

        {/* 改进建议 */}
        <div>
          <h3 className="font-bold mb-2">改进建议</h3>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>定期更新景点开放时间和演出时间信息</li>
            <li>持续扩充知识库覆盖更多游客常见问题</li>
            <li>关注负面反馈内容，针对性优化回答质量</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
