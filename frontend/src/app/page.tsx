"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Message = { role: "user" | "assistant"; text: string };

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h3 class='text-lg font-bold mt-3 mb-1'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class='text-xl font-bold mt-3 mb-1'>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class='text-2xl font-bold mt-3 mb-1'>$1</h1>")
    .replace(/^- (.+)$/gm, "<li class='ml-4 list-disc'>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li class='ml-4 list-decimal'>$2</li>")
    .replace(/\n/g, "<br/>");
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [preference, setPreference] = useState("");
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const chatRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [messages]);

  const playTTS = useCallback(async (text: string) => {
    try {
      const res = await fetch(`${API_URL}/api/chat/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      } else {
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.play();
      }
    } catch {
      // TTS is optional, fail silently
    }
  }, []);

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("您的浏览器不支持语音识别，请使用Chrome或Edge浏览器");
      return;
    }
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput(text);
      handleSend(text);
    };
    recognition.onerror = (e: any) => {
      setListening(false);
      if (e.error !== "aborted" && e.error !== "no-speech") {
        console.error("语音识别错误:", e.error);
      }
    };
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    const userMsg: Message = { role: "user", text: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, session_id: sessionId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.reply || "阿弥陀佛，小僧一时语塞，请稍后再问。";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      playTTS(reply);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "阿弥陀佛，小僧暂时无法回答，请确认后端服务已启动。" },
      ]);
    }
    setLoading(false);
  };

  const handleRecommend = async (pref: string) => {
    setPreference(pref);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: `我想体验：${pref}` },
    ]);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chat/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preference: pref }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const routeText =
        `为您推荐 **${pref}** 路线：\n\n` +
        data.route.map((s: string, i: number) => `${i + 1}. **${s}**`).join("\n");
      setMessages((prev) => [...prev, { role: "assistant", text: routeText }]);
      playTTS(`为您推荐${pref}路线，共${data.route.length}个景点`);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "路线推荐服务暂不可用，请确认后端服务已启动。" },
      ]);
    }
    setLoading(false);
  };

  const preferences = ["佛教朝圣", "自然观光", "亲子互动", "禅修体验", "文化深度游"];

  return (
    <main className="flex h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* 左侧：数字人展示区 + 偏好选择 */}
      <div className="w-1/2 flex flex-col items-center justify-center p-8 border-r border-amber-200">
        <div className="w-80 h-96 rounded-2xl bg-amber-100/50 border-2 border-amber-300 flex flex-col items-center justify-center mb-4 shadow-lg relative overflow-hidden">
          <div className="text-center text-amber-800">
            <div className="text-6xl mb-4">🙏</div>
            <p className="text-lg font-bold">慧行 · AI数字人导游</p>
            <p className="text-sm text-amber-600 mt-2">Live2D组件将在此渲染</p>
          </div>
          {loading && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <span className="inline-flex gap-1">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          )}
        </div>

        {/* 偏好标签按钮 */}
        <p className="text-sm text-amber-700 mb-2 font-medium">选择您的游览偏好：</p>
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          {preferences.map((p) => (
            <button
              key={p}
              onClick={() => handleRecommend(p)}
              disabled={loading}
              className={`px-3 py-1 rounded-full text-sm border transition disabled:opacity-50 ${
                preference === p
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* 右侧：对话区 */}
      <div className="w-1/2 flex flex-col bg-white/80 backdrop-blur">
        <div className="bg-amber-600 text-white p-4 text-center font-bold text-lg shadow-md">
          灵山AI禅意导游
        </div>

        <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-20">
              <p className="text-5xl mb-4">🏯</p>
              <p className="text-lg font-medium text-gray-600">阿弥陀佛，欢迎来到灵山胜境</p>
              <p className="text-sm mt-2 text-gray-400">
                我是您的AI导游「慧行」，有什么可以帮您的？
              </p>
              <p className="text-xs mt-3 text-gray-300">
                点击下方 🎤 语音提问，或直接输入文字
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-xl text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-amber-500 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}
              >
                {m.role === "assistant" ? (
                  <span dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
                ) : (
                  m.text
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-amber-600 text-sm p-3 rounded-xl rounded-bl-sm">
                慧行正在思考...
              </div>
            </div>
          )}
        </div>

        {/* 底部输入栏 */}
        <div className="p-4 border-t border-gray-200 flex gap-2 items-center bg-white/90">
          <button
            onClick={startListening}
            disabled={loading}
            className={`w-11 h-11 rounded-full text-xl flex items-center justify-center transition flex-shrink-0 ${
              listening
                ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-300"
                : "bg-amber-100 hover:bg-amber-200 text-amber-700"
            }`}
            title="语音输入"
          >
            🎤
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="输入您的问题，如：灵山大佛有多高？"
            disabled={loading}
            className="flex-1 border border-gray-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-amber-600 text-white rounded-full text-sm hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            发送
          </button>
        </div>
      </div>
    </main>
  );
}
