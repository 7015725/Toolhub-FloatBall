#!/usr/bin/env python3
"""临时应用 ToolHub 启动结果真实性补丁。"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "ToolHub.js"


def replace_once(text: str, old: str, new: str, name: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{name}: expected one match, got {count}")
    return text.replace(old, new, 1)


def main() -> None:
    text = TARGET.read_text(encoding="utf-8")

    old = '''  var started = !!(startRet && startRet.ok);
  if (!started) unregisterToolHubAppInstance(app);
  var layoutObj = startRet && startRet.layout || null;
  var layoutText = layoutObj ? (String(layoutObj.cols || "?") + "×" + String(layoutObj.rows || "?")) : "未知";
  var syncText = syncInfo.count > 0
    ? ("✓ 启动已补全/修复 " + syncInfo.count + " 个模块：" + syncInfo.modules.join("、"))
    : (pendingInfo.count > 0 ? ("↻ 有 " + pendingInfo.count + " 个子模块可更新") : "✓ 子模块已是最新");

  var out = {
    ok: started,
    状态: started ? "ToolHub 启动成功" : "ToolHub 启动失败",
    安全: securityText,
    同步: syncText,
    更新状态: TOOLHUB_UPDATE_STATE.status,
    布局: layoutText,
    关闭广播: runtimeOptString(startRet && startRet.closeAction)
  };
  if (TOOLHUB_UPDATE_STATE.title) out.更新标题 = TOOLHUB_UPDATE_STATE.title;
  if (TOOLHUB_UPDATE_STATE.changes && TOOLHUB_UPDATE_STATE.changes.length > 0) out.更新内容 = TOOLHUB_UPDATE_STATE.changes;
  if (syncInfo.count > 0) out.启动修复模块 = syncInfo.modules;
  if (pendingInfo.count > 0) out.可更新模块 = pendingInfo.modules;
  if (loadInfo.count > 0) out.加载异常 = loadInfo.modules;
  if (!started) out.错误 = runtimeOptString(startRet && startRet.err) || (loadInfo.modules && loadInfo.modules.join(", ")) || "未知错误";
  return out;
'''

    new = '''  var started = !!(startRet && startRet.ok);
  var degraded = started && loadInfo.count > 0;
  var healthy = started && !degraded;
  if (!started) unregisterToolHubAppInstance(app);
  var layoutObj = startRet && startRet.layout || null;
  var layoutText = layoutObj ? (String(layoutObj.cols || "?") + "×" + String(layoutObj.rows || "?")) : "未知";
  var syncText = syncInfo.count > 0
    ? ("✓ 启动已补全/修复 " + syncInfo.count + " 个模块：" + syncInfo.modules.join("、"))
    : (pendingInfo.count > 0 ? ("↻ 有 " + pendingInfo.count + " 个子模块可更新") : "✓ 子模块已是最新");
  var startupStatus = !started ? "failed" : (degraded ? "degraded" : "healthy");
  var startupText = !started ? "ToolHub 启动失败" : (degraded ? "ToolHub 降级启动" : "ToolHub 启动成功");

  var out = {
    ok: healthy,
    started: started,
    degraded: degraded,
    启动状态: startupStatus,
    状态: startupText,
    安全: securityText,
    同步: syncText,
    更新状态: TOOLHUB_UPDATE_STATE.status,
    布局: layoutText,
    关闭广播: runtimeOptString(startRet && startRet.closeAction)
  };
  if (TOOLHUB_UPDATE_STATE.title) out.更新标题 = TOOLHUB_UPDATE_STATE.title;
  if (TOOLHUB_UPDATE_STATE.changes && TOOLHUB_UPDATE_STATE.changes.length > 0) out.更新内容 = TOOLHUB_UPDATE_STATE.changes;
  if (syncInfo.count > 0) out.启动修复模块 = syncInfo.modules;
  if (pendingInfo.count > 0) out.可更新模块 = pendingInfo.modules;
  if (loadInfo.count > 0) {
    out.加载异常 = loadInfo.modules;
    out.降级原因 = loadInfo.msg;
    out.错误 = loadInfo.msg;
  } else if (!started) {
    out.错误 = runtimeOptString(startRet && startRet.err) || "未知错误";
  }
  try {
    writeLog("Startup result status=" + startupStatus + " started=" + String(started) + " degraded=" + String(degraded) + " loadErrors=" + String(loadInfo.count || 0));
  } catch (eStartupStatusLog) {}
  return out;
'''

    text = replace_once(text, old, new, "startup output block")
    TARGET.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
