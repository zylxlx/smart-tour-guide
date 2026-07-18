@echo off
chcp 65001 >nul
title 灵山AI禅意导游 — 一键启动

echo ============================================
echo   灵山AI禅意导游 系统启动中...
echo   后端: http://192.168.2.72:8000
echo   API文档: http://192.168.2.72:8000/docs
echo ============================================
echo.

:: 启动后端
echo [1/2] 启动 FastAPI 后端...
start "TourGuide-Backend" cmd /c "cd /d D:\igron-lab\smart-tour-guide\backend && .venv\Scripts\activate.bat && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
echo       后端已启动 → http://192.168.2.72:8000
echo.

:: 编译小程序
echo [2/2] 编译微信小程序...
cd /d D:\igron-lab\smart-tour-guide\miniapp
call npm run build:weapp
echo.
echo ============================================
echo   后端运行中，小程序已编译完成！
echo   请用微信开发者工具打开:
echo     D:\igron-lab\smart-tour-guide\miniapp\dist
echo ============================================
pause
