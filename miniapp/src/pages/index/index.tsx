import { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, Input, Button, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import DigitalHuman from "../../components/DigitalHuman";
import "./index.scss";

const API_URL = "http://192.168.2.72:8001";
const STATUS_BAR_HEIGHT = Taro.getSystemInfoSync().statusBarHeight || 44;

interface Message {
  role: "user" | "assistant";
  text: string;
  emotion?: string;
  latency?: number;
}

const PREFERENCES = ["佛教朝圣", "自然观光", "亲子互动", "禅修体验", "文化深度游"];

export default function Index() {
  // ===== 欢迎页 =====
  const [entered, setEntered] = useState(false);

  const [speaking, setSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dhStatus, setDhStatus] = useState<"idle" | "listening" | "speaking" | "happy">("idle");
  const [preference, setPreference] = useState("");
  const [sessionId] = useState(() => `session_${Date.now()}`);

  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdInput, setPwdInput] = useState("");
  const [pwdError, setPwdError] = useState(false);

  const hasMessages = messages.length > 0;

  // ===== 滚动控制 =====
  const [scrollTopVal, setScrollTopVal] = useState(99999);
  const doScroll = () => {
    setScrollTopVal(99999 + messages.length);
    setTimeout(() => setScrollTopVal(99999 + messages.length + 1000), 300);
  };

  const submitFeedback = (rating: string, msg: string) => {
    Taro.request({
      url: `${API_URL}/api/admin/user/feedback`,
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: { session_id: sessionId, message: msg, rating },
    }).catch(() => {});
    Taro.showToast({ title: rating === "good" ? "感谢好评 🙏" : "已记录，我们会改进", icon: "none", duration: 1000 });
  };

  // 进入后：只播语音问候，不输出文字
  useEffect(() => {
    if (!entered) return;
    const timer = setTimeout(() => {
      setDhStatus("speaking");
      playTTS("你好，我是你的导游慧行");
      setTimeout(() => setDhStatus("idle"), 4000);
    }, 600);
    Taro.request({
      url: `${API_URL}/api/chat/send`,
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: { message: "你好", session_id: sessionId },
    }).catch(() => {});
    return () => clearTimeout(timer);
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

  // ===== 长按录音 =====
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
      setDhStatus("listening");
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
    setDhStatus("speaking");
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
        const reply = data.reply || "阿弥陀佛，小僧一时语塞。";
        const emotion = data.emotion || "中性";
        const latency = ((Date.now() - t0) / 1000).toFixed(1);
        setMessages((prev) => [...prev, { role: "assistant", text: reply, emotion, latency: parseFloat(latency) }]);
        doScroll();
        if (emotion.includes("负面")) setDhStatus("sad" as any);
        else if (emotion.includes("正面")) setDhStatus("happy");
        else setDhStatus("speaking");
        setTimeout(() => setDhStatus("idle"), 3000);
        if (data.tts_url) playTTSFromUrl(data.tts_url);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "阿弥陀佛，小僧暂时无法回答，请确认后端服务已启动。" }]);
      doScroll();
    }
    setLoading(false);
    setDhStatus("idle");
  };
  handleSendRef.current = handleSend;

  // ===== 推荐 =====
  const handleRecommend = async (pref: string) => {
    setPreference(pref);
    setDhStatus("happy");
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
          if (data.tts_url) playTTSFromUrl(data.tts_url);
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
        <View className="header" style={`padding-top:${STATUS_BAR_HEIGHT + 12}px`}>
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
      <View className="header" style={`padding-top:${STATUS_BAR_HEIGHT + 12}px`}>
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

      <View className="chat-area">
        {!hasMessages ? (
          <View className="welcome-tip-area">
            <Text className="tip">输入文字或长按语音提问</Text>
          </View>
        ) : (
          <ScrollView className="msg-list" scrollY scrollTop={scrollTopVal} scrollWithAnimation>
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
