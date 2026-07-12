#!/usr/bin/env python3
"""校验 ToolHub 启动超时、迟到任务和广播接收器生命周期契约。"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY_MODULE = ROOT / "code" / "th_16_entry.js"


def require(name, condition, detail, failures):
    if condition:
        print("PASS:", name)
        return
    failures.append((name, detail))
    print("FAIL:", name)


def section(text, start_marker, end_marker):
    start = text.find(start_marker)
    if start < 0:
        return ""
    end = text.find(end_marker, start + len(start_marker))
    if end < 0:
        return text[start:]
    return text[start:end]


def main():
    text = ENTRY_MODULE.read_text(encoding="utf-8")
    failures = []

    main_sync = section(
        text,
        "function runOnMainSync(fn, timeoutMs, onLateSuccess)",
        "function registerReceiverOnMain(actions, callback)",
    )
    receiver = section(
        text,
        "function registerReceiverOnMain(actions, callback)",
        "FloatBallAppWM.prototype.close = function()",
    )
    start_async = section(
        text,
        "FloatBallAppWM.prototype.startAsync = function(entryProcInfo, closeRule)",
        "\n};",
    )

    require(
        "主线程同步任务支持迟到清理",
        "onLateSuccess" in main_sync
        and "box.active = false" in main_sync
        and "h.removeCallbacks(task)" in main_sync
        and "timedOut: true" in main_sync,
        "runOnMainSync 必须在超时后使任务失效、移除未开始任务并暴露迟到清理回调",
        failures,
    )
    require(
        "迟到接收器会主动注销",
        "function unregisterLateReceiver()" in receiver
        and "appCtx.unregisterReceiver(rcv)" in receiver
        and "2000, unregisterLateReceiver" in receiver,
        "广播注册超时后必须注销可能迟到注册的接收器",
        failures,
    )
    require(
        "Android 13 以上明确限制动态接收器导出",
        "android.os.Build.VERSION.SDK_INT >= 33" in receiver
        and "android.content.Context.RECEIVER_NOT_EXPORTED" in receiver,
        "自定义动态接收器必须指定 RECEIVER_NOT_EXPORTED",
        failures,
    )
    require(
        "启动任务使用 generation token",
        "var startToken = Number(this.state.startGeneration || 0) + 1;" in start_async
        and "Number(self.state.startGeneration || 0) === startToken" in start_async,
        "启动任务必须绑定会话 token，防止旧 Runnable 成为有效实例",
        failures,
    )
    require(
        "addView 前后均校验启动 token",
        'closeLateStart("before_add_view")' in start_async
        and 'closeLateStart("after_add_view")' in start_async
        and 'closeLateStart("after_start_hooks")' in start_async,
        "启动任务必须在 addView 前、addView 后和启动钩子后检查是否仍有效",
        failures,
    )
    require(
        "启动确认超时会取消迟到启动",
        'startBox.err = "启动确认超时，已取消迟到启动";' in start_async
        and "this.state.startGeneration = startToken + 1;" in start_async
        and "h.removeCallbacks(startTask)" in start_async
        and 'closeLateStart("confirm_timeout")' in start_async,
        "确认超时必须使 token 失效、移除任务并执行清理",
        failures,
    )
    require(
        "启动结果暴露超时状态",
        "startTimedOut: startBox.timedOut === true" in start_async
        and "startGeneration: startToken" in start_async,
        "调用方需要区分普通失败和启动确认超时",
        failures,
    )
    require(
        "旧的不确定超时日志已移除",
        "addView result unknown" not in text,
        "不应继续保留无法清理迟到实例的旧超时路径",
        failures,
    )

    if failures:
        print("\nEntry lifecycle verification failed:")
        for name, detail in failures:
            print("- %s: %s" % (name, detail))
        return 1

    print("\nEntry lifecycle verification passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
