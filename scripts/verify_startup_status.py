#!/usr/bin/env python3
"""校验 ToolHub 完整启动、降级启动与启动失败的结果契约。"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "ToolHub.js").read_text(encoding="utf-8")


def require(fragment: str, label: str) -> None:
    if fragment not in SOURCE:
        raise SystemExit(f"missing {label}: {fragment}")


def classify(started: bool, load_error_count: int, start_error: str = "") -> dict:
    degraded = started and load_error_count > 0
    healthy = started and not degraded
    status = "failed" if not started else ("degraded" if degraded else "healthy")
    text = "ToolHub 启动失败" if not started else ("ToolHub 降级启动" if degraded else "ToolHub 启动成功")
    load_message = f"有 {load_error_count} 个子模块加载失败" if load_error_count else ""
    error = ""
    degraded_reason = ""
    if not started:
        error = start_error or load_message or "未知错误"
    elif degraded:
        error = load_message
        degraded_reason = load_message
    return {
        "ok": healthy,
        "started": started,
        "degraded": degraded,
        "status": status,
        "text": text,
        "error": error,
        "degraded_reason": degraded_reason,
    }


def main() -> None:
    required = [
        ('var degraded = started && loadInfo.count > 0;', "degraded predicate"),
        ('var healthy = started && !degraded;', "healthy predicate"),
        ('var startupStatus = !started ? "failed" : (degraded ? "degraded" : "healthy");', "machine status"),
        ('var startupText = !started ? "ToolHub 启动失败" : (degraded ? "ToolHub 降级启动" : "ToolHub 启动成功");', "display status"),
        ('ok: healthy,', "truthful ok field"),
        ('started: started,', "started field"),
        ('degraded: degraded,', "degraded field"),
        ('启动状态: startupStatus,', "startup status field"),
        ('if (loadInfo.count > 0) out.加载异常 = loadInfo.modules;', "load error reporting"),
        ('if (!started) {', "failure branch"),
        ('runtimeOptString(startRet && startRet.err) || (loadInfo.count > 0 ? loadInfo.msg : "未知错误")', "failure error priority"),
        ('} else if (degraded) {', "degraded branch"),
        ('out.降级原因 = loadInfo.msg;', "degraded reason"),
        ('Startup result status=', "startup status log"),
    ]
    for fragment, label in required:
        require(fragment, label)

    forbidden = [
        ('ok: started,', "legacy started-is-ok result"),
        ('状态: started ? "ToolHub 启动成功" : "ToolHub 启动失败"', "legacy binary status"),
    ]
    for fragment, label in forbidden:
        if fragment in SOURCE:
            raise SystemExit(f"forbidden {label}: {fragment}")

    healthy = classify(True, 0)
    assert healthy == {
        "ok": True,
        "started": True,
        "degraded": False,
        "status": "healthy",
        "text": "ToolHub 启动成功",
        "error": "",
        "degraded_reason": "",
    }

    degraded = classify(True, 2)
    assert degraded["ok"] is False
    assert degraded["started"] is True
    assert degraded["degraded"] is True
    assert degraded["status"] == "degraded"
    assert degraded["text"] == "ToolHub 降级启动"
    assert degraded["error"] == "有 2 个子模块加载失败"
    assert degraded["degraded_reason"] == degraded["error"]

    failed = classify(False, 0, "addView failed")
    assert failed["ok"] is False
    assert failed["started"] is False
    assert failed["degraded"] is False
    assert failed["status"] == "failed"
    assert failed["text"] == "ToolHub 启动失败"
    assert failed["error"] == "addView failed"

    failed_with_load_errors = classify(False, 2, "start timeout")
    assert failed_with_load_errors["degraded"] is False
    assert failed_with_load_errors["error"] == "start timeout"
    assert failed_with_load_errors["degraded_reason"] == ""

    print("startup status verification passed")


if __name__ == "__main__":
    main()
