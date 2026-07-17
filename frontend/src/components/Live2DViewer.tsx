"use client";

import { useEffect, useRef, useState } from "react";

const MODELS: Record<string, { path: string; label: string }> = {
  shizuku: { path: "/live2d/shizuku/shizuku.model.json", label: "Shizuku · 雫" },
  chitose: { path: "/live2d/chitose/chitose.model.json", label: "Chitose · 千岁" },
  haru: { path: "/live2d/haru/haru01.model.json", label: "Haru · 春" },
  koharu: { path: "/live2d/koharu/koharu.model.json", label: "Koharu · 小春" },
  haruto: { path: "/live2d/haruto/haruto.model.json", label: "Haruto · 春人" },
};

interface Live2DViewerProps {
  modelName?: string;
}

export default function Live2DViewer({ modelName = "shizuku" }: Live2DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const cubeLoadedRef = useRef(false);

  useEffect(() => {
    let destroyed = false;

    async function init() {
      try {
        // 1. 加载 Cubism 2.1 运行时
        if (!cubeLoadedRef.current) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "/live2d/live2d.min.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Cubism 2.1 运行库加载失败"));
            document.head.appendChild(script);
          });
          cubeLoadedRef.current = true;
        }

        // 2. 加载依赖
        const PIXI = (await import("pixi.js")).default || (await import("pixi.js"));
        (window as any).PIXI = PIXI;
        const { Live2DModel } = await import("pixi-live2d-display/cubism2");

        if (destroyed || !containerRef.current) return;

        // 3. 清理旧 app
        if (appRef.current) {
          try {
            const oldView = appRef.current.view;
            if (oldView && oldView.parentNode) {
              oldView.parentNode.removeChild(oldView);
            }
            appRef.current.destroy(false, true);
          } catch {}
          appRef.current = null;
          modelRef.current = null;
        }

        const parent = containerRef.current;
        const width = parent.clientWidth || 320;
        const height = parent.clientHeight || 384;

        // 4. 让 PIXI 自己创建 canvas（不传 view），避免 canvas 上下文冲突
        const app = new PIXI.Application({
          width,
          height,
          backgroundAlpha: 0,
          antialias: false,
          resolution: 1,
        });
        appRef.current = app;

        // 把 PIXI 的 canvas 添加到容器
        const view = app.view as HTMLCanvasElement;
        if (view.parentNode !== containerRef.current) {
          containerRef.current.appendChild(view);
        }

        // 5. 加载模型
        const modelInfo = MODELS[modelName] || MODELS.shizuku;
        const model = await Live2DModel.from(modelInfo.path);
        modelRef.current = model;

        // 6. 缩放居中
        const scale = Math.min(
          (width * 0.55) / model.width,
          (height * 0.7) / model.height
        );
        model.scale.set(scale);
        model.x = width / 2;
        model.y = height * 0.4;
        model.anchor.set(0.5, 0.5);

        // 7. 点击交互
        model.on("hit", (hitAreas: string[]) => {
          if (hitAreas.includes("body")) model.motion("tap_body");
          if (hitAreas.includes("head")) model.motion("tap_head");
        });

        app.stage.addChild(model);
        if (!destroyed) setStatus("ready");
      } catch (err) {
        console.error("Live2D 加载失败:", err);
        if (!destroyed) setStatus("error");
      }
    }

    setStatus("loading");
    init();

    // 缩放处理
    const handleResize = () => {
      if (!appRef.current || !modelRef.current || !containerRef.current) return;
      const app = appRef.current;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      app.renderer.resize(w, h);
      const model = modelRef.current;
      const scale = Math.min((w * 0.55) / model.width, (h * 0.7) / model.height);
      model.scale.set(scale);
      model.x = w / 2;
      model.y = h * 0.4;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      destroyed = true;
      window.removeEventListener("resize", handleResize);
      if (appRef.current) {
        try { appRef.current.destroy(false, true); } catch {}
      }
    };
  }, [modelName]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="w-full h-full" />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-amber-100/50 z-10">
          <div className="text-center">
            <span className="inline-flex gap-1 mb-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
            <p className="text-xs text-amber-600">数字人加载中...</p>
          </div>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-amber-100/50 z-10">
          <div className="text-center text-amber-800">
            <div className="text-4xl mb-2">🙏</div>
            <p className="text-sm font-bold">慧行 · AI数字人导游</p>
            <p className="text-xs text-amber-600 mt-1">Live2D 加载失败</p>
          </div>
        </div>
      )}
    </div>
  );
}

export { MODELS };
