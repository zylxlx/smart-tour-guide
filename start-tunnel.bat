@echo off
chcp 65001 >nul
title 灵山AI禅意导游 — 开发隧道模式

echo ============================================
echo   灵山AI禅意导游 — 手机开发测试模式
echo ============================================
echo.

:: 1. 启动后端
echo [1/3] 启动 FastAPI 后端...
start "TourGuide-Backend" cmd /c "cd /d D:\igron-lab\smart-tour-guide\backend && .venv\Scripts\activate.bat && uvicorn app.main:app --host 0.0.0.0 --port 8000"
ping -n 4 127.0.0.1 >nul
echo       后端: http://localhost:8000

:: 2. 启动公网隧道 (localtunnel — 无需注册)
echo [2/3] 启动公网隧道...
echo       浏览器会打开一个页面，记下显示的 https 地址
echo       按 Ctrl+C 可关闭隧道
echo.
echo [3/3] 提示:
echo       1. 拿到隧道 https 地址后 (如 https://xxx.loca.lt)
echo       2. 去微信开发者工具 → 详情 → 本地设置
echo       3. 勾选 "不校验合法域名"
echo       4. 修改 miniapp/src/pages/index/index.tsx 里的 API_URL
echo          改为: https://xxx.loca.lt (你的隧道地址)
echo       5. 重新编译小程序
echo ============================================
echo.

npx localtunnel --port 8000 --subdomain lingshan-tour
