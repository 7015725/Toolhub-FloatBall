#!/usr/bin/env python3
"""临时修正启动失败与降级错误的优先级。"""

from pathlib import Path

path = Path(__file__).resolve().parents[1] / "ToolHub.js"
text = path.read_text(encoding="utf-8")
old = '''  if (loadInfo.count > 0) {
    out.加载异常 = loadInfo.modules;
    out.降级原因 = loadInfo.msg;
    out.错误 = loadInfo.msg;
  } else if (!started) {
    out.错误 = runtimeOptString(startRet && startRet.err) || "未知错误";
  }
'''
new = '''  if (loadInfo.count > 0) out.加载异常 = loadInfo.modules;
  if (!started) {
    out.错误 = runtimeOptString(startRet && startRet.err) || (loadInfo.count > 0 ? loadInfo.msg : "未知错误");
  } else if (degraded) {
    out.降级原因 = loadInfo.msg;
    out.错误 = loadInfo.msg;
  }
'''
if text.count(old) != 1:
    raise SystemExit(f"startup error priority: expected one match, got {text.count(old)}")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
