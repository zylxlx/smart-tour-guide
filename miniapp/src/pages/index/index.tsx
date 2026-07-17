import { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, Input, Button, ScrollView } from "@tarojs/components";
import Taro from "@tarojs/taro";
import DigitalHuman from "../../components/DigitalHuman";
import "./index.scss";

const API_URL = "http://localhost:8000";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const PREFERENCES = ["佛教朝圣", "自然观光", "亲子互动", "禅修体验", "文化深度游"];

export default function Index() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dhStatus, setDhStatus] = useState<"idle" | "listening" | "speaking" | "happy">("idle");
  const [preference, setPreference] = useState("");
  const [sessionId] = useState(() => `session_${Date.now()}`);

  const hasMessages = messages.length > 0;

  const playTTS = useCallback(async (text: string) => {
    try {
      await Taro.request({
        url: `${API_URL}/api/chat/tts`,
        method: "POST",
        data: { text },
        responseType: "arraybuffer",
      });
    } catch {}
  }, []);

  // ===== 长按录音 =====
  const recorderRef = useRef(Taro.getRecorderManager());
  const [isRecording, setIsRecording] = useState(false);

  const startRecord = useCallback(() => {
    setIsRecording(true);
    setDhStatus("listening");
    Taro.vibrateShort();
    recorderRef.current.start({
      duration: 30000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: "mp3",
    });
  }, []);

  const stopRecord = useCallback(() => {
    if (!isRecording) return;
    setIsRecording(false);
    recorderRef.current.stop();
  }, [isRecording]);

  useEffect(() => {
    const rm = recorderRef.current;
    rm.onStop(async (res) => {
      setDhStatus("idle");
      if (!res.tempFilePath) return;
      Taro.showLoading({ title: "识别中..." });
      try {
        const uploadRes = await Taro.uploadFile({
          url: `${API_URL}/api/chat/voice`,
          filePath: res.tempFilePath,
          name: "file",
        });
        Taro.hideLoading();
        if (uploadRes.statusCode === 200) {
          const data = JSON.parse(uploadRes.data);
          if (data.text) handleSend(data.text);
        }
      } catch {
        Taro.hideLoading();
      }
    });
    rm.onError(() => {
      setIsRecording(false);
      setDhStatus("idle");
    });
  }, []);

  // ===== 发送消息 =====
  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setInput("");
    setLoading(true);
    setDhStatus("speaking");
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
        setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
        playTTS(reply);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "阿弥陀佛，小僧暂时无法回答，请确认后端服务已启动。" },
      ]);
    }
    setLoading(false);
    setDhStatus("idle");
  };

  // ===== 推荐 =====
  const handleRecommend = async (pref: string) => {
    setPreference(pref);
    setDhStatus("happy");
    setMessages((prev) => [...prev, { role: "user", text: `我想体验：${pref}` }]);
    setLoading(true);
    try {
      const res = await Taro.request({
        url: `${API_URL}/api/chat/recommend`,
        method: "POST",
        header: { "Content-Type": "application/json" },
        data: { preference: pref },
      });
      if (res.statusCode === 200) {
        const data: any = res.data;
        const routeText =
          `为您推荐${pref}路线：\n` +
          data.route.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n");
        setMessages((prev) => [...prev, { role: "assistant", text: routeText }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "路线推荐服务暂不可用。" }]);
    }
    setLoading(false);
    setTimeout(() => setDhStatus("idle"), 2000);
  };

  return (
    <View className="page">
      {/* 顶部标题 */}
      <View className="header">
        <Text className="header-title">灵山AI禅意导游</Text>
      </View>

      {/* 偏好标签栏 */}
      <View className="pref-bar">
        {PREFERENCES.map((p) => (
          <View
            key={p}
            className={`pref-tag ${preference === p ? "active" : ""}`}
            onClick={() => handleRecommend(p)}
          >
            <Text>{p}</Text>
          </View>
        ))}
      </View>

      {/* 对话区 */}
      <View className="chat-area">
        <ScrollView className="msg-list" scrollY>
          {/* 数字人：无消息居中 / 有消息置顶 */}
          <View className={`dh-wrapper ${hasMessages ? "top" : "center"}`}>
            <View className="dh-box">
              <DigitalHuman status={dhStatus} />
            </View>
            <Text className="dh-name">慧行 · AI数字人导游</Text>
            {!hasMessages && (
              <View className="welcome-text">
                <Text className="title">阿弥陀佛，欢迎来到灵山胜境</Text>
                <Text className="sub">我是您的AI导游「慧行」</Text>
                <Text className="tip">输入文字或长按语音提问</Text>
              </View>
            )}
          </View>

          {/* 消息列表 */}
          {hasMessages && messages.map((m, i) => (
            <View key={i} className={`msg-row ${m.role}`}>
              <View className={`msg-bubble ${m.role}`}>
                <Text>{m.text}</Text>
              </View>
            </View>
          ))}

          {loading && (
            <View className="msg-row assistant">
              <View className="msg-bubble assistant thinking">
                <Text>慧行正在思考...</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* 输入栏 */}
      <View className="input-bar">
        <View
          className={`voice-btn ${isRecording ? "recording" : ""}`}
          onTouchStart={startRecord}
          onTouchEnd={stopRecord}
          onTouchCancel={stopRecord}
        >
          <Text>{isRecording ? "🔴" : "🎤"}</Text>
        </View>
        <Input
          className="msg-input"
          value={input}
          onInput={(e) => setInput(e.detail.value)}
          onConfirm={() => handleSend()}
          placeholder="输入问题，如：灵山大佛有多高？"
          confirmType="send"
        />
        <Button
          className="send-btn"
          size="mini"
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
        >
          发送
        </Button>
      </View>
    </View>
  );
}
