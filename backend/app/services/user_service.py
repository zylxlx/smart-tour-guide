"""用户对话历史 & 反馈存储"""
import json
import os
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
HISTORY_FILE = os.path.join(DATA_DIR, "chat_history.json")
FEEDBACK_FILE = os.path.join(DATA_DIR, "feedback.json")


def _load(path):
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _save(path, data):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def save_conversation(session_id: str, user_msg: str, assistant_reply: str):
    history = _load(HISTORY_FILE)
    history.append({
        "session_id": session_id,
        "user": user_msg,
        "assistant": assistant_reply,
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    })
    # 只保留最近 500 条
    if len(history) > 500:
        history = history[-500:]
    _save(HISTORY_FILE, history)


def get_history(session_id: str = None, limit: int = 50):
    history = _load(HISTORY_FILE)
    if session_id:
        history = [h for h in history if h["session_id"] == session_id]
    return history[-limit:]


def save_feedback(session_id: str, message: str, rating: str, comment: str = ""):
    feedbacks = _load(FEEDBACK_FILE)
    feedbacks.append({
        "session_id": session_id,
        "message": message,
        "rating": rating,
        "comment": comment,
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    })
    if len(feedbacks) > 500:
        feedbacks = feedbacks[-500:]
    _save(FEEDBACK_FILE, feedbacks)


def get_feedback_stats():
    feedbacks = _load(FEEDBACK_FILE)
    good = sum(1 for f in feedbacks if f["rating"] == "good")
    bad = sum(1 for f in feedbacks if f["rating"] == "bad")
    total = len(feedbacks)
    return {
        "total": total,
        "good": good,
        "bad": bad,
        "rate": round(good / total * 100, 1) if total > 0 else 0,
        "recent": feedbacks[-10:][::-1],
    }
