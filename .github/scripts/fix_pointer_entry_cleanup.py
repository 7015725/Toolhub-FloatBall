#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[2] / "ToolHub.js"
text = path.read_text(encoding="utf-8")
block = '''
  // 模块热重载会重新定义指针原型，必须重新安装取字提交修复。
  if (typeof installToolHubPointerAccessibilityTextReleaseFix === "function") {
    installToolHubPointerAccessibilityTextReleaseFix(true);
  }
'''
if block in text:
    text = text.replace(block, "", 1)
elif "installToolHubPointerAccessibilityTextReleaseFix" in text:
    raise SystemExit("unexpected pointer entry hotfix residue")
path.write_text(text, encoding="utf-8")
print("pointer entry hotfix residue removed")
