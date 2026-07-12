#!/usr/bin/env python3
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TH15 = ROOT / "code" / "th_15_extra.js"
BOUNDARIES = ROOT / "MODULE_BOUNDARIES.json"
REPORT_SCRIPT = ROOT / "scripts" / "report_dead_module_symbols.py"
REPORT = ROOT / "DEAD_CODE_AUDIT.md"
GATE = ROOT / "code" / "__cleanup_pending.js"

OLD_BLOCK = '''    if (typeof proto.rebuildBallForNewSize === "function") {
      var oldRebuildBallForNewSize = proto.rebuildBallForNewSize;
      proto.rebuildBallForNewSize = function(keepPanels) {
        var ret = oldRebuildBallForNewSize.call(this, keepPanels);
        if (ret) this.applyConfiguredBallPosition(false, "ball_rebuild");
        return ret;
      };
    }
'''

OLD_ADVICE = '''    lines.append("1. 单独清理 `th_15_extra.js` 中不再可能安装的 `rebuildBallForNewSize` 条件包装器。")
    lines.append("2. 对 `th_15_extra.js` 的固定位置过渡方法做一次模块加载期调用审查和真机位置基线，再按一组清理。")
    lines.append("3. 将 `armLongPress` 与长按辅助状态作为独立交互审查，不与位置方法混删。")
    lines.append("4. 最后处理 `th_09_animation.js` 的旧动画、吸边和屏幕重排实现，必须包含旋转、尺寸变化和动画开关真机测试。")
'''

NEW_ADVICE = '''    lines.append("1. 对 `th_15_extra.js` 的固定位置过渡方法做一次模块加载期调用审查和真机位置基线，再按一组清理。")
    lines.append("2. 将 `armLongPress` 与长按辅助状态作为独立交互审查，不与位置方法混删。")
    lines.append("3. 最后处理 `th_09_animation.js` 的旧动画、吸边和屏幕重排实现，必须包含旋转、尺寸变化和动画开关真机测试。")
'''


def fail(message):
    raise SystemExit("FAIL: " + message)


def update_th15():
    text = TH15.read_text(encoding="utf-8")
    if not text.startswith("// @version 1.1.2\n"):
        fail("unexpected th_15 version")
    if text.count(OLD_BLOCK) != 1:
        fail("rebuild wrapper block count is not 1")
    text = text.replace("// @version 1.1.2\n", "// @version 1.1.3\n", 1)
    text = text.replace(OLD_BLOCK, "", 1)
    if "oldRebuildBallForNewSize" in text:
        fail("oldRebuildBallForNewSize still present")
    TH15.write_text(text, encoding="utf-8")


def update_boundaries():
    data = json.loads(BOUNDARIES.read_text(encoding="utf-8"))
    records = data.get("duplicateDefinitions") or []
    matches = [item for item in records if item.get("method") == "rebuildBallForNewSize"]
    if len(matches) != 1:
        fail("boundary rebuild record count is not 1")
    record = matches[0]
    if record.get("definitions") != ["th_15_extra.js", "th_19_position_state.js"]:
        fail("unexpected rebuild definition chain")
    if record.get("effectiveOwner") != "th_19_position_state.js":
        fail("unexpected rebuild effective owner")
    data["duplicateDefinitions"] = [
        item for item in records if item.get("method") != "rebuildBallForNewSize"
    ]
    direct = data.setdefault("directOwners", {})
    existing = direct.get("rebuildBallForNewSize")
    if existing not in (None, "th_19_position_state.js"):
        fail("unexpected direct owner")
    direct["rebuildBallForNewSize"] = "th_19_position_state.js"
    forbidden = data.setdefault("forbiddenDefinitions", {})
    th15_forbidden = forbidden.setdefault("th_15_extra.js", [])
    if "rebuildBallForNewSize" not in th15_forbidden:
        th15_forbidden.append("rebuildBallForNewSize")
    BOUNDARIES.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def update_report_generator():
    text = REPORT_SCRIPT.read_text(encoding="utf-8")
    if text.count(OLD_ADVICE) != 1:
        fail("old advice block count is not 1")
    text = text.replace(OLD_ADVICE, NEW_ADVICE, 1)
    REPORT_SCRIPT.write_text(text, encoding="utf-8")


def regenerate_report():
    subprocess.check_call([
        "python3",
        str(REPORT_SCRIPT.relative_to(ROOT)),
        "--write",
        str(REPORT.relative_to(ROOT)),
    ], cwd=str(ROOT))


def main():
    update_th15()
    update_boundaries()
    update_report_generator()
    if GATE.exists():
        GATE.unlink()
    regenerate_report()
    print("OK removed dead rebuild wrapper")


if __name__ == "__main__":
    main()
