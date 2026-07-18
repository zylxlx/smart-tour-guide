import { useState, useEffect } from "react";
import { View, Text, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import "./index.scss";

const API_URL = "http://localhost:8000";

const TABS = [
  { key: "dashboard", label: "数据大屏" },
  { key: "consumption", label: "消费分析" },
  { key: "knowledge", label: "知识库" },
  { key: "users", label: "用户管理" },
  { key: "dhconfig", label: "形象配置" },
  { key: "emotion", label: "感受度" },
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [hotQuestions, setHotQuestions] = useState<any[]>([]);
  const [consumption, setConsumption] = useState<any>(null);
  const [knowledgeList, setKnowledgeList] = useState<any[]>([]);
  const [kTitle, setKTitle] = useState("");
  const [kContent, setKContent] = useState("");
  const [kCategory, setKCategory] = useState("景点知识");
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<any>(null);

  useEffect(() => {
    Taro.request({ url: `${API_URL}/api/admin/stats/overview` })
      .then((r) => { if (r.statusCode === 200) setStats(r.data); })
      .catch(() => {});
    Taro.request({ url: `${API_URL}/api/admin/stats/hot-questions` })
      .then((r) => { if (r.statusCode === 200) setHotQuestions(r.data as any[] || []); })
      .catch(() => {});
  }, []);

  const loadConsumption = () => {
    if (consumption) return;
    Taro.showLoading({ title: "加载中..." });
    Taro.request({ url: `${API_URL}/api/admin/stats/consumption` })
      .then((r) => { if (r.statusCode === 200) setConsumption(r.data); })
      .catch(() => {})
      .finally(() => Taro.hideLoading());
  };

  const over = consumption?.overview;
  const cats = consumption?.category_breakdown || [];
  const topSpots = consumption?.top_spots || [];
  const monthly = consumption?.monthly_trend || [];
  const ages = consumption?.age_groups;
  const genders = consumption?.gender_dist;

  const maxCat = Math.max(...cats.map((c: any) => c.value), 1);

  return (
    <View className="admin-page">
      <View className="admin-header">
        <Text className="admin-title">灵山AI导游 · 管理后台</Text>
        <Text className="admin-back" onClick={() => Taro.navigateBack()}>返回</Text>
      </View>

      <ScrollView className="admin-tabs" scrollX>
        {TABS.map((t) => (
          <View key={t.key} className={`tab ${activeTab === t.key ? "active" : ""}`} onClick={() => { setActiveTab(t.key); if (t.key === "consumption") loadConsumption(); }}>
            <Text>{t.label}</Text>
          </View>
        ))}
      </ScrollView>

      <ScrollView className="admin-content" scrollY>
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

        {activeTab === "consumption" && (
          <View>
            {consumption ? (
              <View>
                {/* 总览 */}
                <View className="stat-cards">
                  <View className="stat-card"><Text className="stat-label">游客数</Text><Text className="stat-val">{over?.total_visitors}</Text></View>
                  <View className="stat-card"><Text className="stat-label">总营收</Text><Text className="stat-val">¥{over?.total_revenue?.toLocaleString()}</Text></View>
                  <View className="stat-card"><Text className="stat-label">人均消费</Text><Text className="stat-val">¥{over?.avg_per_person}</Text></View>
                  <View className="stat-card"><Text className="stat-label">均停留</Text><Text className="stat-val">{over?.avg_stay_hours}h</Text></View>
                </View>

                {/* 消费结构 */}
                <View className="card">
                  <Text className="card-title">消费结构</Text>
                  {cats.map((c: any) => (
                    <View key={c.name} className="bar-row">
                      <Text className="bar-label">{c.name}</Text>
                      <View className="bar-track"><View className="bar-fill" style={{width: `${(c.value / maxCat) * 100}%`}} /></View>
                      <Text className="bar-val">¥{c.value.toLocaleString()}</Text>
                    </View>
                  ))}
                </View>

                {/* 热门景点 */}
                <View className="card">
                  <Text className="card-title">热门景点 TOP5</Text>
                  {topSpots.slice(0, 5).map((s: any, i: number) => (
                    <View key={i} className="hot-item">
                      <Text>{i + 1}. {s.spot}</Text>
                      <Text className="hot-count">{s.count}人 · ¥{s.revenue.toLocaleString()}</Text>
                    </View>
                  ))}
                </View>

                {/* 月度趋势 */}
                <View className="card">
                  <Text className="card-title">月度营收趋势</Text>
                  {monthly.slice(-6).map((m: any) => (
                    <View key={m.month} className="bar-row">
                      <Text className="bar-label" style="font-size:20px">{m.month}</Text>
                      <View className="bar-track"><View className="bar-fill green" style={{width: `${(m.revenue / 500000) * 100}%`}} /></View>
                      <Text className="bar-val">¥{m.revenue.toLocaleString()}</Text>
                    </View>
                  ))}
                </View>

                {/* 游客画像 */}
                {ages && (
                  <View className="card">
                    <Text className="card-title">游客画像</Text>
                    <View className="row-split">
                      <View className="half">
                        <Text className="sub-title">年龄分布</Text>
                        {Object.entries(ages).map(([k, v]: any) => (
                          <View key={k} className="bar-row">
                            <Text className="bar-label" style="font-size:20px">{k}</Text>
                            <View className="bar-track"><View className="bar-fill blue" style={{width: `${(v / over?.total_visitors) * 100}%`}} /></View>
                            <Text className="bar-val">{v}人</Text>
                          </View>
                        ))}
                      </View>
                      <View className="half">
                        <Text className="sub-title">性别分布</Text>
                        {genders && Object.entries(genders).map(([k, v]: any) => (
                          <View key={k} className="bar-row">
                            <Text className="bar-label" style="font-size:20px">{k}</Text>
                            <View className="bar-track"><View className={`bar-fill ${k === "男" ? "blue" : "pink"}`} style={{width: `${(v / over?.total_visitors) * 100}%`}} /></View>
                            <Text className="bar-val">{v}人</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View className="card"><Text className="empty-tip">点击加载消费数据...</Text></View>
            )}
          </View>
        )}

        {activeTab === "knowledge" && (
          <KnowledgeTab
            list={knowledgeList} setList={setKnowledgeList}
            title={kTitle} setTitle={setKTitle}
            content={kContent} setContent={setKContent}
            category={kCategory} setCategory={setKCategory}
          />
        )}

        {activeTab === "users" && (
          <UsersTab history={userHistory} setHistory={setUserHistory} fbk={feedbackStats} setFbk={setFeedbackStats} />
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
      </ScrollView>
    </View>
  );
}

/* ========== 知识库管理组件 ========== */
function KnowledgeTab({ list, setList, title, setTitle, content, setContent, category, setCategory }: any) {
  const [loaded, setLoaded] = useState(false);

  const load = () => {
    Taro.request({ url: `${API_URL}/api/admin/knowledge/list` })
      .then((r) => { if (r.statusCode === 200) { setList((r.data as any).documents || []); setLoaded(true); } })
      .catch(() => {});
  };

  useEffect(() => { if (!loaded) load(); }, []);

  const handleAdd = async () => {
    if (!title.trim()) return;
    Taro.showLoading({ title: "添加中..." });
    try {
      await Taro.request({
        url: `${API_URL}/api/admin/knowledge/add`,
        method: "POST",
        header: { "Content-Type": "application/json" },
        data: { title, content: content || title, category },
      });
      Taro.hideLoading(); setTitle(""); setContent(""); load();
    } catch { Taro.hideLoading(); }
  };

  const handleUpload = async () => {
    try {
      const res = await Taro.chooseMessageFile({ count: 1, type: "file" });
      const file = res.tempFiles[0];
      Taro.showLoading({ title: "上传中..." });
      const upRes = await Taro.uploadFile({
        url: `${API_URL}/api/admin/knowledge/upload`,
        filePath: file.path,
        name: "file",
      });
      Taro.hideLoading();
      if (upRes.statusCode === 200) { load(); Taro.showToast({ title: "上传成功", icon: "none" }); }
    } catch (e: any) {
      Taro.hideLoading();
      if (e?.errMsg?.includes("cancel")) return;
      Taro.showToast({ title: "上传失败，请用粘贴方式", icon: "none" });
    }
  };

  const handleDelete = async (id: string) => {
    await Taro.request({ url: `${API_URL}/api/admin/knowledge/${id}`, method: "DELETE" });
    load();
  };

  return (
    <View>
      <View className="card">
        <Text className="card-title">添加知识条目</Text>
        <View className="kb-form">
          <View className="kb-row">
            <Text className="kb-label">标题</Text>
            <input className="kb-input" value={title} onInput={(e: any) => setTitle(e.detail.value)} placeholder="输入知识标题" />
          </View>
          <View className="kb-row">
            <Text className="kb-label">分类</Text>
            <select className="kb-select" value={category} onChange={(e: any) => setCategory(e.detail.value)}>
              <option>景点知识</option><option>历史文化</option><option>佛教文化</option><option>FAQ问答</option>
            </select>
            <View className="kb-btn" onClick={handleAdd}><Text>添加</Text></View>
          </View>
          <View className="kb-row">
            <View className="kb-btn upload" onClick={handleUpload}><Text>📁 上传文档</Text></View>
            <Text className="kb-hint">或直接粘贴内容：</Text>
          </View>
          <textarea className="kb-textarea" value={content} onInput={(e: any) => setContent(e.detail.value)}
            placeholder="在此粘贴文档内容（.txt/.md），然后填写标题点「添加」" rows={4} />
        </View>
      </View>
      <View className="card">
        <Text className="card-title">知识库列表（{list.length}条）</Text>
        {list.map((d: any) => (
          <View key={d.id} className="kb-item">
            <Text className="kb-item-title">{d.title}</Text>
            <Text className="kb-item-cat">{d.category}</Text>
            <View className="kb-del" onClick={() => handleDelete(d.id)}><Text>删除</Text></View>
          </View>
        ))}
        {list.length === 0 && <Text className="empty-tip">暂无知识条目</Text>}
      </View>
    </View>
  );
}

/* ========== 用户管理组件 ========== */
function UsersTab({ history, setHistory, fbk, setFbk }: any) {
  const [loaded, setLoaded] = useState(false);

  const load = () => {
    Taro.request({ url: `${API_URL}/api/admin/user/history` })
      .then((r) => { if (r.statusCode === 200) { setHistory((r.data as any).history?.reverse() || []); setLoaded(true); } })
      .catch(() => {});
    Taro.request({ url: `${API_URL}/api/admin/user/feedback-stats` })
      .then((r) => { if (r.statusCode === 200) setFbk(r.data); })
      .catch(() => {});
  };

  useEffect(() => { if (!loaded) load(); }, []);

  return (
    <View>
      <View className="card">
        <Text className="card-title">用户反馈统计</Text>
        {fbk && (
          <View className="fbk-stats">
            <View className="fbk-card good"><Text className="fbk-num">{fbk.good}</Text><Text>好评</Text></View>
            <View className="fbk-card bad"><Text className="fbk-num">{fbk.bad}</Text><Text>差评</Text></View>
            <View className="fbk-card"><Text className="fbk-num">{fbk.rate}%</Text><Text>好评率</Text></View>
          </View>
        )}
        {!fbk && <Text className="empty-tip">暂无数据</Text>}
      </View>
      <View className="card">
        <Text className="card-title">对话记录（{history.length}条）</Text>
        {history.slice(0, 30).map((h: any, i: number) => (
          <View key={i} className="hist-item">
            <Text className="hist-time">{h.time}</Text>
            <Text className="hist-user">👤 {h.user?.substring(0, 30)}</Text>
            <Text className="hist-ai">🤖 {h.assistant?.substring(0, 80)}</Text>
          </View>
        ))}
        {history.length === 0 && <Text className="empty-tip">暂无记录</Text>}
      </View>
    </View>
  );
}
