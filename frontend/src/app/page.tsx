"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [preference, setPreference] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdInput, setPwdInput] = useState("");
  const [pwdError, setPwdError] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const chatRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const speakingRef = useRef(false);

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight);
  }, [messages]);

  // 初始化浏览器语音引擎 — 优先少女音
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synthRef.current = synth;
    const loadVoices = () => {
      const voices = synth.getVoices();
      // 少女音优先级：Xiaoxiao > Yaoyao > 其他 zh-CN 女声 > Huihui > 任意中文
      voiceRef.current =
        voices.find((v) => v.lang === "zh-CN" && v.name.includes("Xiaoxiao")) ||
        voices.find((v) => v.lang === "zh-CN" && v.name.includes("Yaoyao")) ||
        voices.find((v) => v.lang === "zh-CN" && /女|girl|female/i.test(v.name)) ||
        voices.find((v) => v.lang === "zh-CN") ||
        voices.find((v) => v.lang.startsWith("zh")) ||
        voices[0];
    };
    loadVoices();
    synth.onvoiceschanged = loadVoices;
    return () => { synth.cancel(); };
  }, []);

  // 启动时：立即语音问候 + 后台预热模型
  useEffect(() => {
    // 语音立即打招呼，不等后端
    const t = setTimeout(() => speakText("你好，我是你的导游慧行"), 50);
    // 后台静默发预热请求
    fetch(`${API_URL}/api/chat/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "你好", session_id: sessionId }),
    }).catch(() => {});
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopSpeaking = useCallback(() => {
    const synth = synthRef.current;
    if (synth) {
      synth.cancel();
      if (synth.paused) synth.resume();  // 防止引擎卡住
      speakingRef.current = false;
      setSpeaking(false);
    }
  }, []);

  const handleAdminLogin = () => {
    if (pwdInput === "Lingshan001") {
      setShowPwdModal(false);
      setPwdInput("");
      setPwdError(false);
      router.push("/admin");
    } else {
      setPwdError(true);
    }
  };

  const speakText = useCallback((raw: string) => {
    const synth = synthRef.current;
    if (!synth) return;
    // Chrome bug: cancel() 后引擎卡 paused=true，下次 speak() 会等 2s 超时。
    // 解法：cancel → 如果 paused 就 resume → 立即 speak
    synth.cancel();
    if (synth.paused) synth.resume();
    const clean = raw
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/[_~`#>]/g, "")
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
      .replace(/[\u{2600}-\u{27BF}]/gu, "")
      .replace(/[\u{FE00}-\u{FEFF}]/gu, "")
      .replace(/^\s*[•●▪▸-]\s*/gm, "")
      .trim();
    if (!clean) return;

    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "zh-CN";
    u.rate = 1.2;
    u.pitch = 1.15;
    if (voiceRef.current) u.voice = voiceRef.current;

    speakingRef.current = true;
    setSpeaking(true);
    u.onend = () => {
      speakingRef.current = false;
      setSpeaking(false);
    };
    u.onerror = () => {
      speakingRef.current = false;
      setSpeaking(false);
    };
    synth.speak(u);
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
      speakText(reply);
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

      // 根据后端返回的详细信息，构建每条路线专属的展示内容
      let routeText = "";
      if (data.route_name && data.duration && data.path) {
        // 新版详细路线回复
        routeText = `🏯 **${data.route_name}**（${data.duration}）\n\n`;
        routeText += `📍 **路线**：${data.path}\n\n`;
        if (data.highlights && data.highlights.length > 0) {
          routeText += `🌟 **核心亮点**：\n${data.highlights.map((h: string) => `  • ${h}`).join("\n")}\n\n`;
        }
        if (data.experiences && data.experiences.length > 0) {
          routeText += `✨ **特色体验**：\n${data.experiences.map((e: string) => `  • ${e}`).join("\n")}`;
        }
      } else if (data.spots) {
        // 兼容旧版格式
        routeText =
          `为您推荐 **${pref}** 路线：\n\n` +
          data.spots.map((s: string, i: number) => `${i + 1}. **${s}**`).join("\n");
      } else {
        routeText = `为您推荐 **${pref}** 路线，请参考以上景点游览。`;
      }

      setMessages((prev) => [...prev, { role: "assistant", text: routeText }]);
      speakText(`为您推荐${data.route_name || pref}，${data.duration || ""}，共${data.spots ? data.spots.length : "多个"}个站点`);
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
    <main className="flex flex-col h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* 顶部标题栏 */}
      <div className="bg-amber-600 text-white p-3 text-center font-bold text-lg shadow-md flex-shrink-0 flex items-center justify-center gap-3">
        <span>灵山AI禅意导游</span>
        {speaking && (
          <button
            onClick={stopSpeaking}
            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-full transition flex items-center gap-1"
            title="停止语音"
          >
            ⏹ 停止说话
          </button>
        )}
      </div>

      {/* 数字人区域 — 固定占上方 2/3 */}
      <div className="flex-[2] flex flex-col items-center justify-center p-6 relative overflow-hidden min-h-0">
        <div className="w-72 h-[22rem] rounded-2xl bg-amber-100/50 border-2 border-amber-300 flex flex-col items-center justify-center shadow-lg relative overflow-hidden flex-shrink-0">
          <div className="text-center text-amber-800">
            <div className="text-7xl mb-4">🙏</div>
            <p className="text-xl font-bold">慧行 · AI数字人导游</p>
            <p className="text-sm text-amber-600 mt-2">AI数字人导游</p>
          </div>
          {speaking && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-4 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-6 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: "120ms" }} />
                <span className="w-1.5 h-5 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: "240ms" }} />
                <span className="w-1.5 h-4 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: "360ms" }} />
              </span>
            </div>
          )}
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

        {/* 欢迎文字 */}
        {messages.length === 0 ? (
          <div className="text-center mt-4 flex-shrink-0">
            <p className="text-lg font-medium text-amber-900">阿弥陀佛，欢迎来到灵山胜境</p>
            <p className="text-sm text-gray-400 mt-1">我是您的AI导游「慧行」</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400 mt-3 flex-shrink-0">正在为您服务</p>
        )}

        {/* 偏好标签按钮 */}
        <p className="text-sm text-amber-700 mt-4 mb-1 font-medium flex-shrink-0">选择您的游览偏好：</p>
        <div className="flex flex-wrap gap-2 justify-center flex-shrink-0">
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

      {/* 文字对话区 — 占下方 1/3，可滚动 */}
      <div className="flex-[1] flex flex-col bg-white/80 backdrop-blur border-t border-amber-200 min-h-0">
        <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-300">输入文字或点击 🎤 语音提问</p>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-2.5 rounded-xl text-sm whitespace-pre-wrap ${
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
              <div className="bg-gray-100 text-amber-600 text-sm p-2.5 rounded-xl rounded-bl-sm">
                慧行正在思考...
              </div>
            </div>
          )}
        </div>

        {/* 底部输入栏 */}
        <div className="p-3 border-t border-gray-200 flex gap-2 items-center bg-white/90 flex-shrink-0">
          <button
            onClick={startListening}
            disabled={loading}
            className={`w-10 h-10 rounded-full text-lg flex items-center justify-center transition flex-shrink-0 ${
              listening
                ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-300"
                : "bg-amber-100 hover:bg-amber-200 text-amber-700"
            }`}
            title="语音输入"
          >
            🎤
          </button>
          {speaking && (
            <button
              onClick={stopSpeaking}
              className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white text-lg flex items-center justify-center transition flex-shrink-0"
              title="停止播报"
            >
              ⏹
            </button>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="输入您的问题，如：灵山大佛有多高？"
            disabled={loading}
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-amber-600 text-white rounded-full text-sm hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            发送
          </button>
        </div>
      </div>

      {/* 运营管理入口 — 右上角极隐齿轮 */}
      <button
        onClick={() => { setShowPwdModal(true); setPwdInput(""); setPwdError(false); }}
        className="fixed top-3 right-3 w-7 h-7 bg-transparent hover:bg-white/40 rounded-full flex items-center justify-center text-gray-300 hover:text-gray-500 transition z-40"
        title="运营管理"
      >
        ⚙
      </button>

      {/* 密码验证弹窗 */}
      {showPwdModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-80">
            <h3 className="text-lg font-bold text-gray-800 mb-1">运营管理</h3>
            <p className="text-xs text-gray-400 mb-4">请输入管理密码以继续</p>
            <input
              type="password"
              value={pwdInput}
              onChange={(e) => { setPwdInput(e.target.value); setPwdError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
              placeholder="请输入密码"
              autoFocus
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                pwdError
                  ? "border-red-400 focus:ring-red-300"
                  : "border-gray-300 focus:ring-amber-300"
              }`}
            />
            {pwdError && (
              <p className="text-red-500 text-xs mt-1">密码错误，请重试</p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setShowPwdModal(false); setPwdInput(""); setPwdError(false); }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                取消
              </button>
              <button
                onClick={handleAdminLogin}
                disabled={!pwdInput.trim()}
                className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition disabled:opacity-50"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
