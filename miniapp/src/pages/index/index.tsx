import { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, Input, Button, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import DigitalHuman from "../../components/DigitalHuman";
import "./index.scss";

const API_URL = "http://192.168.2.72:8001";

interface Message {
  role: "user" | "assistant";
  text: string;
  emotion?: string;
  latency?: number;
}

const PREFERENCES = ["佛教朝圣", "自然观光", "亲子互动", "禅修体验", "历史文化"];

export default function Index() {
  // ===== 欢迎页 =====
  const [entered, setEntered] = useState(false);

  const [speaking, setSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dhStatus, setDhStatus] = useState<"idle" | "speaking">("idle");
  const [preference, setPreference] = useState("");
  const [sessionId] = useState(() => `session_${Date.now()}`);

  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdInput, setPwdInput] = useState("");
  const [pwdError, setPwdError] = useState(false);

  const hasMessages = messages.length > 0;

  // ===== 伴随式讲解 =====
  const [tourMode, setTourMode] = useState("idle");
  const [tourItems, setTourItems] = useState([]);
  const [tourIndex, setTourIndex] = useState(0);

  function playTourSpot(idx, items) {
    if (idx >= items.length) {
      setDhStatus("idle");
      setTimeout(function() { setTourMode("idle"); setDhStatus("idle"); }, 3000);
      return;
    }
    setTourIndex(idx);
    var item = items[idx];
    var nextIdx = idx + 1;
    if (item && item.tts_url) {
      setDhStatus("speaking");
      var a = Taro.createInnerAudioContext();
      audioRef.current = a;
      a.src = API_URL + item.tts_url;
      a.onEnded(function() {
        a.destroy(); audioRef.current = null; setSpeaking(false);
        setDhStatus("idle");
        setTimeout(function() { playTourSpot(nextIdx, items); }, 400);
      });
      a.onError(function() { a.destroy(); audioRef.current = null; setSpeaking(false); });
      a.play(); setSpeaking(true);
    } else {
      setTimeout(function() { playTourSpot(nextIdx, items); }, 300);
    }
  }

  var _tourPlaying = false;
  function startTour(pref) {
    Taro.showLoading({ title: "生成讲解中..." });
    Taro.request({
      url: API_URL + "/api/chat/tour/start",
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: { preference: pref },
    }).then(function(r) {
      Taro.hideLoading();
      if (r.statusCode === 200) {
        var d = r.data;
        var items = d.items || [];
        if (items.length === 0) { Taro.showToast({ title: "暂无讲解数据", icon: "none" }); return; }
        _tourPlaying = true;
        setTourItems(items); setTourIndex(0); setTourMode("playing");
        setMessages(function(prev) { return prev.concat([{ role: "assistant", text: "🎙 开始伴随讲解：" + (d.route_name || pref) + "\n共" + items.length + "站" }]); });
        doScroll();
        setTimeout(function() { playTourSpot(0, items); }, 500);
      }
    }).catch(function(e) {
      Taro.hideLoading(); Taro.showToast({ title: "讲解生成失败", icon: "none" });
    });
  }

  function pauseTour() {
    if (tourMode !== "playing") return;
    _tourPlaying = false; stopAudio(); setTourMode("paused"); setDhStatus("idle");
  }

  function resumeTour() {
    if (tourMode !== "paused") return;
    setTourMode("playing");
    var item = tourItems[tourIndex];
    if (item && item.tts_url) {
      setDhStatus("speaking");
      var a = Taro.createInnerAudioContext(); audioRef.current = a;
      a.src = API_URL + item.tts_url;
      a.onEnded(function() {
        a.destroy(); audioRef.current = null; setSpeaking(false);
        setDhStatus("idle"); setTourMode("paused");
      });
      a.onError(function() { a.destroy(); audioRef.current = null; setSpeaking(false); });
      a.play(); setSpeaking(true);
    }
  }

  function skipTour() {
    stopAudio(); _tourPlaying = true;
    var nextIdx = tourIndex + 1;
    var items = tourItems;
    if (nextIdx >= items.length) {
      setDhStatus("idle"); setTourMode("idle"); _tourPlaying = false;
      setTimeout(function() { setDhStatus("idle"); }, 3000); return;
    }
    setTourIndex(nextIdx); setTourMode("playing");
    setDhStatus("speaking");
    var item = items[nextIdx];
    if (item && item.tts_url) {
      var a = Taro.createInnerAudioContext(); audioRef.current = a;
      a.src = API_URL + item.tts_url;
      a.onEnded(function() {
        a.destroy(); audioRef.current = null; setSpeaking(false);
        setDhStatus("idle"); setTourMode("paused");
      });
      a.onError(function() { a.destroy(); audioRef.current = null; setSpeaking(false); });
      a.play(); setSpeaking(true);
    }
  }

  function endTour() {
    stopAudio(); _tourPlaying = false;
    setTourMode("idle"); setTourItems([]); setTourIndex(0); setDhStatus("idle");
    setMessages(function(prev) { return prev.concat([{ role: "assistant", text: "伴随讲解已结束，欢迎随时提问 🙏" }]); });
    doScroll();
  }

  // ===== 滚动控制 =====
  const [msgScroll, setMsgScroll] = useState(0);
  const doScroll = () => {
    setMsgScroll(8888 + messages.length * 100);
    setTimeout(() => setMsgScroll(9999 + messages.length * 200), 300);
    setTimeout(() => setMsgScroll(9999 + messages.length * 300), 700);
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => setMsgScroll(9999 + messages.length * 500), 400);
    }
  }, [messages]);

  const submitFeedback = (rating: string, msg: string) => {
    Taro.request({
      url: `${API_URL}/api/admin/user/feedback`,
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: { session_id: sessionId, message: msg, rating },
    }).catch(() => {});
    Taro.showToast({ title: rating === "good" ? "感谢好评 🙏" : "已记录，我们会改进", icon: "none", duration: 1000 });
  };

  // TTS 播完/停止后恢复 idle
  useEffect(() => {
    if (!speaking && dhStatus === "speaking") setDhStatus("idle");
  }, [speaking, dhStatus]);

  // 进入后：只播语音问候，不输出文字
  useEffect(() => {
    if (!entered) return;
    const t = setTimeout(() => {
      setDhStatus("speaking");
      playTTS("你好，我是你的导游慧行");
    }, 600);
    Taro.request({
      url: `${API_URL}/api/chat/send`,
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: { message: "你好", session_id: sessionId },
    }).catch(() => {});
    return () => clearTimeout(t);
  }, [entered]);

  const handleAdminLogin = () => {
    if (pwdInput === "Lingshan001") {
      setShowPwdModal(false);
      setPwdInput("");
      setPwdError(false);
      Taro.navigateTo({ url: "/pages/admin/index" });
    } else {
      setPwdError(true);
    }
  };

  // ===== 音频管理 =====
  const audioRef = useRef<Taro.InnerAudioContext | null>(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      try { audioRef.current.stop(); } catch {}
      try { audioRef.current.destroy(); } catch {}
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const cleanForTTS = (raw: string) => {
    return raw
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
      .replace(/[\u{2600}-\u{27BF}]/gu, "")
      .replace(/[\u{FE00}-\u{FEFF}]/gu, "")
      .replace(/[^一-鿿　-〿＀-￯0-9\n]/g, "")
      .replace(/\n+/g, "，")
      .replace(/路线路线/g, "路线")
      .trim();
  };

  const playTTS = useCallback(async (text: string) => {
    stopAudio();
    const clean = cleanForTTS(text);
    if (!clean) return;
    try {
      const res = await Taro.request({
        url: `${API_URL}/api/chat/tts`,
        method: "POST",
        data: { text: clean },
      });
      if (res.statusCode === 200) {
        const data: any = res.data;
        if (data.url) {
          const audio = Taro.createInnerAudioContext();
          audioRef.current = audio;
          audio.src = `${API_URL}${data.url}`;
          audio.onEnded(() => { audio.destroy(); audioRef.current = null; setSpeaking(false); });
          audio.onError(() => { audio.destroy(); audioRef.current = null; setSpeaking(false); });
          audio.play();
          setSpeaking(true);
        }
      }
    } catch {}
  }, [stopAudio]);

  const playTTSFromUrl = useCallback((relativeUrl: string) => {
    stopAudio();
    if (!relativeUrl) return;
    const audio = Taro.createInnerAudioContext();
    audioRef.current = audio;
    audio.src = `${API_URL}${relativeUrl}`;
    audio.onEnded(() => { audio.destroy(); audioRef.current = null; setSpeaking(false); });
    audio.onError(() => { audio.destroy(); audioRef.current = null; setSpeaking(false); });
    audio.play();
    setSpeaking(true);
  }, [stopAudio]);

  // ===== 点击录音 =====
  const recorderRef = useRef(Taro.getRecorderManager());
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const stopTimer = useRef<any>(null);
  const handleSendRef = useRef<any>(null);

  const stopRecord = useCallback(() => {
    if (stopTimer.current) { clearTimeout(stopTimer.current); stopTimer.current = null; }
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setIsRecording(false);
    setDhStatus("idle");
    try { recorderRef.current.stop(); } catch {}
  }, []);

  // 点击开始/再点停止
  const toggleRecord = useCallback(() => {
    if (isRecordingRef.current) {
      stopRecord();
      return;
    }
    // 先申请录音权限
    Taro.authorize({ scope: "scope.record" }).then(() => {
      isRecordingRef.current = true;
      setIsRecording(true);
      setDhStatus("idle");
      recorderRef.current.start({
        duration: 10000, sampleRate: 16000, numberOfChannels: 1,
        encodeBitRate: 48000, format: "wav",
      });
      stopTimer.current = setTimeout(() => { stopRecord(); }, 10500);
    }).catch(() => {
      Taro.showToast({ title: "请授权录音权限", icon: "none" });
    });
  }, [stopRecord]);

  useEffect(() => {
    const rm = recorderRef.current;
    rm.onStop(async (res) => {
      if (stopTimer.current) { clearTimeout(stopTimer.current); stopTimer.current = null; }
      isRecordingRef.current = false;
      setIsRecording(false);
      setDhStatus("idle");
      if (!res.tempFilePath) return;
      Taro.showLoading({ title: "识别中..." });
      try {
        const uploadRes = await Taro.uploadFile({
          url: `${API_URL}/api/chat/voice`, filePath: res.tempFilePath, name: "file",
        });
        Taro.hideLoading();
        if (uploadRes.statusCode === 200) {
          const data = JSON.parse(uploadRes.data);
          if (data.text && data.text !== "未识别到语音内容") {
            handleSendRef.current && handleSendRef.current(data.text);
          } else {
            Taro.showToast({ title: "未识别，请说清楚一点", icon: "none" });
          }
        }
      } catch { Taro.hideLoading(); }
    });
    rm.onError(() => {
      if (stopTimer.current) { clearTimeout(stopTimer.current); stopTimer.current = null; }
      isRecordingRef.current = false;
      setIsRecording(false);
      setDhStatus("idle");
    });
  }, []);

  // ===== 发送消息 =====
  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    stopAudio();
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setInput("");
    setLoading(true);
    doScroll();
    const t0 = Date.now();
    try {
      const res = await Taro.request({
        url: `${API_URL}/api/chat/send`,
        method: "POST",
        header: { "Content-Type": "application/json" },
        data: { message: msg, session_id: sessionId },
      });
      if (res.statusCode === 200) {
        const data: any = res.data;
        const reply = data.reply || "慧行一时语塞，请稍后再问。";
        const emotion = data.emotion || "中性";
        const latency = ((Date.now() - t0) / 1000).toFixed(1);
        setMessages((prev) => [...prev, { role: "assistant", text: reply, emotion, latency: parseFloat(latency) }]);
        doScroll();
        if (data.tts_url) { setDhStatus("speaking"); playTTSFromUrl(data.tts_url); }
        else { setDhStatus("idle"); }
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "慧行暂时无法回答，请确认后端服务已启动。" }]);
      doScroll();
      setDhStatus("idle");
    }
    setLoading(false);
  };
  handleSendRef.current = handleSend;

  // ===== 推荐 =====
  const handleRecommend = async (pref: string) => {
    setPreference(pref);
    setDhStatus("idle");
    setMessages((prev) => [...prev, { role: "user", text: `我想体验：${pref}` }]);
    setLoading(true);
    doScroll();
    const t0 = Date.now();
    try {
      const res = await Taro.request({
        url: `${API_URL}/api/chat/recommend`,
        method: "POST",
        header: { "Content-Type": "application/json" },
        data: { preference: pref },
      });
      if (res.statusCode === 200) {
        try {
          const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
          let routeText = "";
          if (data.route_name && data.duration && data.path) {
            routeText = `${data.route_name}（${data.duration}）
${data.path}`;
            if (data.highlights && data.highlights.length > 0)
              routeText += `
亮点：${data.highlights.slice(0, 2).join("；")}`;
          } else {
            routeText = `为您推荐${pref}路线：`;
            const spots = data.spots || data.route || [];
            if (spots.length > 0) routeText += spots.slice(0, 4).map((s: string, i: number) => `${i + 1}. ${s}`).join("  ");
          }
          const latency = parseFloat(((Date.now() - t0) / 1000).toFixed(1));
          setMessages((prev) => [...prev, { role: "assistant", text: routeText, latency }]);
          doScroll();
          // 自动启动伴随式讲解
          var _pref = pref;
          setTimeout(function() { startTour(_pref); }, 800);
        } catch {
          setMessages((prev) => [...prev, { role: "assistant", text: `推荐结果：${JSON.stringify(res.data)}` }]);
          doScroll();
        }
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "路线推荐服务暂不可用。" }]);
      doScroll();
    }
    setLoading(false);
    setTimeout(() => setDhStatus("idle"), 2000);
  };

  // ===== 欢迎页 =====
  if (!entered) {
    return (
      <View className="page">
        <View className="header" style="padding-top:56px">
          <View className="gear-btn" onClick={() => { setShowPwdModal(true); setPwdInput(""); setPwdError(false); }}>
            <Text>⚙</Text>
          </View>
          <Text className="header-title">灵山AI禅意导游</Text>
        </View>
        <View className="dh-area" style="padding-top:50px">
          <DigitalHuman status="idle" />
          <Text className="dh-name">慧行 · AI数字人导游</Text>
          <View className="welcome-text">
            <Text className="title">欢迎来到灵山胜境</Text>
            <Text className="sub">我是您的AI导游「慧行」</Text>
          </View>
        </View>
        <View className="chat-area" style="display:flex;align-items:center;justify-content:center">
          <Button className="splash-btn" onClick={function(){setEntered(true)}}>开启禅意之旅</Button>
        </View>
        <View className="input-bar" style="justify-content:center">
          <Text className="tip">点击上方按钮开启禅意之旅</Text>
        </View>
      </View>
    );
  }

  // ===== 主界面 =====
  return (
    <View className="page">
      <View className="header" style="padding-top:56px">
        <View className="gear-btn" onClick={() => { setShowPwdModal(true); setPwdInput(""); setPwdError(false); }}>
          <Text>⚙</Text>
        </View>
        <Text className="header-title">灵山AI禅意导游</Text>
      </View>

      <View className="pref-bar">
        {PREFERENCES.map((p) => (
          <View key={p} className={`pref-tag ${preference === p ? "active" : ""}`} onClick={() => handleRecommend(p)}>
            <Text>{p}</Text>
          </View>
        ))}
      </View>

      <View className="dh-area">
        <DigitalHuman status={dhStatus} />
        <Text className="dh-name">慧行 · AI数字人导游</Text>
        {!hasMessages ? (
          <View className="welcome-text">
            <Text className="title">欢迎来到灵山胜境</Text>
            <Text className="sub">我是您的AI导游「慧行」</Text>
          </View>
        ) : (
          <Text className="dh-status-text">正在为您服务</Text>
        )}
      </View>

      {/* 伴随式讲解控制栏 */}
      {tourMode !== "idle" && (
        <View className="tour-bar">
          <View className="tour-info">
            <Text className="tour-label">🎙 当前讲解：{tourItems[tourIndex] ? tourItems[tourIndex].spot : "-"}</Text>
            <Text className="tour-next">下一站：{tourIndex + 1 < tourItems.length ? tourItems[tourIndex + 1].spot : "终点"}</Text>
          </View>
          <View className="tour-btns">
            {tourMode === "playing" ? (
              <View className="tour-btn pause" onClick={pauseTour}><Text>⏸ 暂停</Text></View>
            ) : (
              <View className="tour-btn resume" onClick={resumeTour}><Text>▶ 继续</Text></View>
            )}
            <View className="tour-btn skip" onClick={skipTour}><Text>⏭ 下一站</Text></View>
            <View className="tour-btn end" onClick={endTour}><Text>⏹ 结束</Text></View>
          </View>
        </View>
      )}

      <View className="chat-area">
        {!hasMessages ? (
          <View className="welcome-tip-area">
            <Text className="tip">输入文字或点击🎤语音提问</Text>
          </View>
        ) : (
          <ScrollView className="msg-list" scrollY enhanced show-scrollbar={false} scroll-top={msgScroll} scroll-with-animation>
            {messages.map((m, i) => (
              <View key={i} className={`msg-row ${m.role}`}>
                <View className={`msg-bubble ${m.role}`}>
                  {m.role === "assistant" && m.emotion && (
                    <Text className={`emo-tag ${m.emotion.includes("正面") ? "emo-pos" : m.emotion.includes("负面") ? "emo-neg" : ""}`}>
                      {m.emotion.includes("正面") ? "😊" : m.emotion.includes("负面") ? "😔" : ""}
                    </Text>
                  )}
                  <Text>{m.text}</Text>
                  {m.role === "assistant" && m.latency != null && (
                    <View className="latency"><Text>{m.latency}s</Text></View>
                  )}
                  {m.role === "assistant" && (
                    <View className="fb-btns">
                      <Text className="fb-btn" onClick={() => submitFeedback("good", m.text)}>👍</Text>
                      <Text className="fb-btn" onClick={() => submitFeedback("bad", m.text)}>👎</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
            {loading && (
              <View className="msg-row assistant">
                <View className="msg-bubble assistant thinking"><Text>慧行正在思考...</Text></View>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <View className="input-bar">
        <View className="voice-wrap">
          <View
            className={`voice-btn ${isRecording ? "recording" : ""}`}
            onClick={toggleRecord}
          >
            <Text>{isRecording ? "🔴" : "🎤"}</Text>
          </View>
          <Text className="voice-label">{isRecording ? "点击停止" : "点击录音"}</Text>
        </View>
        {speaking && (
          <View className="stop-speak-btn" onClick={stopAudio}>
            <Text>⏹</Text>
          </View>
        )}
        <Input className="msg-input" value={input} onInput={(e) => setInput(e.detail.value)} onConfirm={() => handleSend()}
          placeholder="输入问题，如：灵山大佛有多高？" confirmType="send" />
        <Button className="send-btn" size="mini" onClick={() => handleSend()} disabled={loading || !input.trim()}>
          发送
        </Button>
      </View>

      {showPwdModal && (
        <View className="pwd-overlay" onClick={() => { setShowPwdModal(false); setPwdInput(""); }}>
          <View className="pwd-modal" onClick={(e: any) => e.stopPropagation()}>
            <Text className="pwd-title">运营管理</Text>
            <Text className="pwd-desc">请输入管理密码以继续</Text>
            <Input className={`pwd-input ${pwdError ? "pwd-err" : ""}`} password value={pwdInput}
              onInput={(e) => { setPwdInput(e.detail.value); setPwdError(false); }} onConfirm={handleAdminLogin} placeholder="请输入密码" focus />
            {pwdError && <Text className="pwd-error-text">密码错误，请重试</Text>}
            <View className="pwd-btns">
              <Button className="pwd-btn cancel" onClick={() => { setShowPwdModal(false); setPwdInput(""); }}>取消</Button>
              <Button className="pwd-btn confirm" onClick={handleAdminLogin} disabled={!pwdInput.trim()}>确认</Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
