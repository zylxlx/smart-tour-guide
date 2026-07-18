# -*- coding: utf-8 -*-
"""自动化准确率测试：逐题问 AI → 比对答案 → 算正确率 ≥ 90%"""
import urllib.request
import urllib.error
import json
import time
import os
import sys
import io

# Fix console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

API = "http://localhost:8001"
TEST_FILE = os.path.join(os.path.dirname(__file__), "test_questions.txt")

def load_questions():
    qa = []
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("|")
            if len(parts) >= 2:
                qa.append({"question": parts[0].strip(), "answer_contains": [a.strip() for a in parts[1:]]})
    return qa

def ask_ai(question):
    data = json.dumps({"message": question, "session_id": "test_session"}).encode("utf-8")
    req = urllib.request.Request(
        f"{API}/api/chat/send",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    try:
        resp = urllib.request.urlopen(req, timeout=60)
        result = json.loads(resp.read().decode("utf-8"))
        return result.get("reply", "")
    except Exception as e:
        return f"[ERROR: {e}]"

def check_answer(ai_reply, expected_contains):
    """Check if AI reply contains at least one expected answer keyword"""
    for keyword in expected_contains:
        if keyword in ai_reply:
            return True
    return False

def main():
    print("=" * 60)
    print("灵山AI禅意导游 — 问答准确率自动化测试")
    print("=" * 60)

    questions = load_questions()
    print(f"\n加载测试题: {len(questions)} 道\n")

    correct = 0
    failed = []

    for i, qa in enumerate(questions):
        q = qa["question"]
        expected = qa["answer_contains"]

        print(f"[{i+1}/{len(questions)}] Q: {q}")
        print(f"    期望包含: {expected}")

        reply = ask_ai(q)
        ok = check_answer(reply, expected)

        if ok:
            correct += 1
            print(f"    ✅ 正确 (回复前60字: {reply[:60]}...)")
            print(f"    📊 当前正确率: {correct}/{i+1} = {correct/(i+1)*100:.1f}%")
        else:
            failed.append({"q": q, "expected": expected, "reply": reply[:120]})
            print(f"    ❌ 错误 (回复前60字: {reply[:60]}...)")
            print(f"    📊 当前正确率: {correct}/{i+1} = {correct/(i+1)*100:.1f}%")

        print()

        if i < len(questions) - 1:
            time.sleep(0.3)  # Rate limit

    accuracy = correct / len(questions) * 100

    print("=" * 60)
    print(f"测试结果: {correct}/{len(questions)} = {accuracy:.1f}%")
    print(f"是否达到90%标准: {'✅ 达标' if accuracy >= 90 else '❌ 未达标'}")
    print("=" * 60)

    if failed:
        print(f"\n失败题目 ({len(failed)} 道):")
        for f in failed:
            print(f"  Q: {f['q']}")
            print(f"  期望: {f['expected']}")
            print(f"  AI回复: {f['reply']}")
            print()

    # Save result
    result_path = os.path.join(os.path.dirname(__file__), "accuracy_result.txt")
    with open(result_path, "w", encoding="utf-8") as f:
        f.write(f"灵山AI禅意导游 问答准确率测试\n")
        f.write(f"测试时间: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"测试题数: {len(questions)}\n")
        f.write(f"正确数: {correct}\n")
        f.write(f"准确率: {accuracy:.1f}%\n")
        f.write(f"达标情况: {'达标✅' if accuracy >= 90 else '未达标❌'}\n")
        if failed:
            f.write(f"\n失败题目:\n")
            for item in failed:
                f.write(f"  Q: {item['q']}\n")
                f.write(f"  期望: {item['expected']}\n")
                f.write(f"  回复: {item['reply']}\n\n")

    print(f"\n结果已保存: {result_path}")
    return accuracy

if __name__ == "__main__":
    main()
