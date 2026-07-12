#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "scripts" / "report_dead_module_symbols.py"
SELF = ROOT / "scripts" / "apply_screen_reflow_audit_wording.py"
WORKFLOW = ROOT / ".github" / "workflows" / "fix-screen-reflow-audit-wording.yml"

OLD = '''    if method == "onScreenChangedReflow":
        return (
            "C",
            "暂缓删除",
            "存在 th_09 基础实现与 th_15 包装链；需先证明屏幕变化监听没有加载期或延迟引用。",
        )
'''

NEW = '''    if method == "onScreenChangedReflow":
        return (
            "C",
            "设备验证后再定",
            "th_09 旧比例重排仍由 th_19 覆盖；涉及屏幕旋转和指针窗口重排，需完成独立设备验证后再处理。",
        )
'''


def main():
    text = TARGET.read_text(encoding="utf-8")
    if text.count(OLD) != 1:
        raise SystemExit("FAIL: expected one stale onScreenChangedReflow classification block")
    TARGET.write_text(text.replace(OLD, NEW), encoding="utf-8")
    if SELF.exists():
        SELF.unlink()
    if WORKFLOW.exists():
        WORKFLOW.unlink()
    print("OK updated onScreenChangedReflow audit wording")


if __name__ == "__main__":
    main()
