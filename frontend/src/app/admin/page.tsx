"use client";

import { useState, useEffect } from "react";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("knowledge");
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/admin/stats/overview")
      .then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-800 text-white p-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">灵山AI导游 · 管理后台</h1>
        <a href="/" className="text-sm text-gray-300 hover:text-white">返回游客端</a>
      </header>

      <div className="flex">
        <nav className="w-48 min-h-screen bg-gray-900 text-white p-4 space-y-2">
          {[
            { key: "knowledge", label: "📚 知识库管理" },
            { key: "dhconfig", label: "🎭 数字人形象" },
            { key: "dashboard", label: "📊 数据大屏" },
            { key: "emotion", label: "💬 感受度报告" },
          ].map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`block w-full text-left px-3 py-2 rounded text-sm ${
                activeTab === t.key ? "bg-gray-700" : "hover:bg-gray-800"
              }`}>
              {t.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 p-6">
          {activeTab === "knowledge" && (
            <div>
              <h2 className="text-xl font-bold mb-4">知识库管理</h2>
              <div className="bg-white rounded-lg p-4 shadow space-y-3">
                <div className="flex gap-2">
                  <input placeholder="文档标题" className="border px-3 py-1 rounded text-sm flex-1" />
                  <input type="file" className="text-sm" />
                  <button className="bg-blue-600 text-white px-4 py-1 rounded text-sm">上传</button>
                </div>
                <table className="w-full text-sm border-collapse">
                  <thead><tr className="bg-gray-50"><th className="p-2 text-left">标题</th><th className="p-2 text-left">分类</th><th className="p-2 text-left">操作</th></tr></thead>
                  <tbody>
                    <tr><td className="p-2">灵山胜境景点数据集</td><td className="p-2">景点知识</td><td className="p-2"><button className="text-blue-600 mr-2">编辑</button><button className="text-red-600">删除</button></td></tr>
                    <tr><td className="p-2">拈花湾禅意小镇数据集</td><td className="p-2">景点知识</td><td className="p-2"><button className="text-blue-600 mr-2">编辑</button><button className="text-red-600">删除</button></td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "dhconfig" && (
            <div>
              <h2 className="text-xl font-bold mb-4">数字人形象配置</h2>
              <div className="bg-white rounded-lg p-6 shadow space-y-4">
                <div><label className="text-sm font-medium">外观风格</label>
                  <select className="ml-2 border px-2 py-1 rounded text-sm">
                    <option>禅意小沙弥</option><option>禅意少女</option><option>唐代僧侣</option>
                  </select>
                </div>
                <div><label className="text-sm font-medium">语音选择</label>
                  <select className="ml-2 border px-2 py-1 rounded text-sm">
                    <option>xiaoxiao (女声-温柔)</option><option>yunxi (男声-沉稳)</option><option>xiaoyi (女声-活泼)</option>
                  </select>
                </div>
                <div><label className="text-sm font-medium">语速</label>
                  <input type="range" min="0.5" max="2" step="0.1" defaultValue="1" className="ml-2" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "dashboard" && (
            <div>
              <h2 className="text-xl font-bold mb-4">数据大屏</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { title: "今日服务人次", value: "1,256" },
                  { title: "问答准确率", value: "93.7%" },
                  { title: "平均响应时间", value: "2.8秒" },
                  { title: "游客满意度", value: "96.2%" },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-lg p-6 shadow text-center">
                    <p className="text-gray-500 text-sm">{s.title}</p>
                    <p className="text-3xl font-bold text-amber-600 mt-2">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-lg p-6 shadow mt-4">
                <h3 className="font-bold mb-2">热门问答 TOP5</h3>
                {["灵山大佛有多高？", "九龙灌浴表演时间？", "灵山梵宫门票多少钱？", "拈花湾几点关门？", "如何从无锡站到灵山？"].map((q, i) => (
                  <div key={i} className="flex justify-between py-1 text-sm border-b last:border-0">
                    <span>{i + 1}. {q}</span><span className="text-gray-400">{150 - i * 25}次</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "emotion" && (
            <div>
              <h2 className="text-xl font-bold mb-4">感受度报告</h2>
              <div className="bg-white rounded-lg p-6 shadow space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-green-50 rounded-lg"><p className="text-2xl font-bold text-green-600">85%</p><p className="text-sm text-gray-500">正面评价</p></div>
                  <div className="p-4 bg-yellow-50 rounded-lg"><p className="text-2xl font-bold text-yellow-600">12%</p><p className="text-sm text-gray-500">中性评价</p></div>
                  <div className="p-4 bg-red-50 rounded-lg"><p className="text-2xl font-bold text-red-600">3%</p><p className="text-sm text-gray-500">负面评价</p></div>
                </div>
                <div><h3 className="font-bold mb-2">改进建议</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>部分景点开放时间信息需更新</li>
                    <li>建议增加周边餐饮推荐功能</li>
                    <li>语音识别在嘈杂环境下准确率有所下降</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
