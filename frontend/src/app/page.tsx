"use client";

import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; text: string };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [preference, setPreference] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [messages]);

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("您的浏览器不支持语音识别，请使用Chrome浏览器");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput(text);
      handleSend(text);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || loading) return;
    const userMsg: Message = { role: "user", text: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "阿弥陀佛，小僧暂时无法回答，请稍后再试。" }]);
    }
    setLoading(false);
  };

  const handleRecommend = async (pref: string) => {
    setPreference(pref);
    try {
      const res = await fetch("http://localhost:8000/api/chat/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preference: pref }),
      });
      const data = await res.json();
      const routeText = "为您推荐路线：\n" + data.route.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n");
      setMessages((prev) => [...prev, { role: "assistant", text: routeText }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "路线推荐服务暂不可用。" }]);
    }
  };

  return (
    <main className="flex h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <div className="w-1/2 flex flex-col items-center justify-center p-8 border-r border-amber-200">
        <div className="w-80 h-96 rounded-2xl bg-amber-100/50 border-2 border-amber-300 flex items-center justify-center mb-4 shadow-lg">
          <div className="text-center text-amber-800">
            <div className="text-6xl mb-4">🙏</div>
            <p className="text-lg font-bold">慧行 · AI数字人导游</p>
            <p className="text-sm text-amber-600 mt-2">Live2D组件将在此渲染</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          {["佛教朝圣", "自然观光", "亲子互动", "禅修体验", "文化深度游"].map((p) => (
            <button key={p} onClick={() => handleRecommend(p)}
              className={`px-3 py-1 rounded-full text-sm border transition ${
                preference === p ? "bg-amber-600 text-white" : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
              }`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="w-1/2 flex flex-col bg-white/80 backdrop-blur">
        <div className="bg-amber-600 text-white p-4 text-center font-bold text-lg">灵山AI禅意导游</div>
        <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-20">
              <p className="text-4xl mb-4">🏯</p>
              <p className="text-lg">阿弥陀佛，欢迎来到灵山胜境</p>
              <p className="text-sm mt-2">我是您的AI导游"慧行"，请问有什么可以帮您的？</p>
              <p className="text-xs mt-1 text-gray-300">点击下方🎤语音提问，或输入文字</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] p-3 rounded-xl text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-800"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && <div className="text-center text-amber-500 text-sm">慧行正在思考...</div>}
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-2 items-center">
          <button onClick={startListening} disabled={loading}
            className={`w-12 h-12 rounded-full text-2xl flex items-center justify-center transition ${
              listening ? "bg-red-500 animate-pulse" : "bg-amber-100 hover:bg-amber-200"
            }`}>
            🎤
          </button>
          <input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="输入您的问题..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-amber-400"
          />
          <button onClick={() => handleSend()} disabled={loading}
            className="px-5 py-2 bg-amber-600 text-white rounded-full text-sm hover:bg-amber-700 transition">
            发送
          </button>
        </div>
      </div>
    </main>
  );
}
