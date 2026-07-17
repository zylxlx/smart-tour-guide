@echo off
cd /d D:\zhengyuD\smart-tour-guide\backend
echo Starting FastAPI backend on http://localhost:8000
echo API docs at http://localhost:8000/docs
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
