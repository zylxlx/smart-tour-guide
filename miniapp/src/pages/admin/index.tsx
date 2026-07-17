import { useState, useEffect } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import "./index.scss";

const API_URL = "http://localhost:8000";

const TABS = [
  { key: "dashboard", label: "数据大屏" },
  { key: "knowledge", label: "知识库" },
  { key: "dhconfig", label: "形象配置" },
  { key: "emotion", label: "感受度" },
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [hotQuestions, setHotQuestions] = useState<any[]>([]);

  useEffect(() => {
    Taro.request({ url: `${API_URL}/api/admin/stats/overview` })
      .then((r) => { if (r.statusCode === 200) setStats(r.data); })
      .catch(() => {});
    Taro.request({ url: `${API_URL}/api/admin/stats/hot-questions` })
      .then((r) => { if (r.statusCode === 200) setHotQuestions(r.data as any[] || []); })
      .catch(() => {});
  }, []);

  return (
    <View className="admin-page">
      <View className="admin-header">
        <Text className="admin-title">灵山AI导游 · 管理后台</Text>
        <Text className="admin-back" onClick={() => Taro.navigateBack()}>返回</Text>
      </View>

      <View className="admin-tabs">
        {TABS.map((t) => (
          <View key={t.key} className={`tab ${activeTab === t.key ? "active" : ""}`} onClick={() => setActiveTab(t.key)}>
            <Text>{t.label}</Text>
          </View>
        ))}
      </View>

      <View className="admin-content">
        {activeTab === "dashboard" && (
          <View>
            <View className="stat-cards">
              <View className="stat-card"><Text className="stat-label">累计服务</Text><Text className="stat-val">{stats?.total_chats || 0}</Text></View>
              <View className="stat-card"><Text className="stat-label">准确率</Text><Text className="stat-val">≥90%</Text></View>
              <View className="stat-card"><Text className="stat-label">响应时间</Text><Text className="stat-val">&lt;3秒</Text></View>
              <View className="stat-card"><Text className="stat-label">正面评价</Text><Text className="stat-val">高</Text></View>
            </View>
            <View className="card">
              <Text className="card-title">热门问答 TOP5</Text>
              {(Array.isArray(hotQuestions) ? hotQuestions : []).map((q: any, i: number) => (
                <View key={i} className="hot-item">
                  <Text>{i + 1}. {q.question}</Text>
                  <Text className="hot-count">{q.count}次</Text>
                </View>
              ))}
              {(!hotQuestions || hotQuestions.length === 0) && <Text className="empty-tip">暂无数据</Text>}
            </View>
          </View>
        )}

        {activeTab === "knowledge" && (
          <View className="card">
            <Text className="card-title">知识库管理</Text>
            <Text className="empty-tip">文档列表加载中...</Text>
            <Text className="empty-tip">上传/编辑/删除功能开发中</Text>
          </View>
        )}

        {activeTab === "dhconfig" && (
          <View className="card">
            <Text className="card-title">数字人形象配置</Text>
            <View className="config-row">
              <Text>外观风格：禅意小沙弥（CSS版）</Text>
            </View>
            <Text className="empty-tip">配置保存功能开发中</Text>
          </View>
        )}

        {activeTab === "emotion" && (
          <View className="card">
            <Text className="card-title">感受度报告</Text>
            <View className="emotion-grid">
              <View className="emo-card green"><Text className="emo-val">85%</Text><Text className="emo-label">正面</Text></View>
              <View className="emo-card yellow"><Text className="emo-val">12%</Text><Text className="emo-label">中性</Text></View>
              <View className="emo-card red"><Text className="emo-val">3%</Text><Text className="emo-label">负面</Text></View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
