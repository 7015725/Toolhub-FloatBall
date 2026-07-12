#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TH09 = ROOT / "code" / "th_09_animation.js"
BOUNDARIES = ROOT / "MODULE_BOUNDARIES.json"
VERIFY = ROOT / ".github" / "workflows" / "verify.yml"
DEAD_REPORTER = ROOT / "scripts" / "report_dead_module_symbols.py"
ANALYSIS_REPORT = ROOT / "TH09_SCREEN_REFLOW_ANALYSIS.md"
ANALYSIS_SCRIPT = ROOT / "scripts" / "verify_th09_screen_reflow_pair.py"
METHODS = ("onScreenChangedReflow", "scheduleScreenReflow")


def fail(message):
    raise SystemExit("FAIL: " + message)


def remove_function(text, marker):
    start = text.find(marker)
    if start < 0:
        fail("marker missing: " + marker)
    brace = text.find("{", start)
    if brace < 0:
        fail("function body missing: " + marker)
    depth = 0
    state = "code"
    quote = ""
    escaped = False
    i = brace
    end = -1
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if state == "code":
            if ch == "/" and nxt == "/":
                state = "line_comment"
                i += 2
                continue
            if ch == "/" and nxt == "*":
                state = "block_comment"
                i += 2
                continue
            if ch in ("'", '"', "`"):
                state = "string"
                quote = ch
                escaped = False
                i += 1
                continue
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
            i += 1
            continue
        if state == "line_comment":
            if ch in "\r\n":
                state = "code"
            i += 1
            continue
        if state == "block_comment":
            if ch == "*" and nxt == "/":
                state = "code"
                i += 2
            else:
                i += 1
            continue
        if escaped:
            escaped = False
        elif ch == "\\":
            escaped = True
        elif ch == quote:
            state = "code"
        i += 1
    if end < 0:
        fail("unterminated function: " + marker)
    while end < len(text) and text[end] in " \t":
        end += 1
    if end < len(text) and text[end] == ";":
        end += 1
    while end < len(text) and text[end] in " \t":
        end += 1
    if text.startswith("\r\n", end):
        end += 2
    elif end < len(text) and text[end] == "\n":
        end += 1
    if text.startswith("\r\n", end):
        end += 2
    elif end < len(text) and text[end] == "\n":
        end += 1
    return text[:start] + text[end:]


def update_th09():
    text = TH09.read_text(encoding="utf-8")
    if text.count("// @version 1.0.2") != 1:
        fail("unexpected th_09 version")
    text = text.replace("// @version 1.0.2", "// @version 1.0.3", 1)
    for method in METHODS:
        marker = "FloatBallAppWM.prototype.%s = function" % method
        if text.count(marker) != 1:
            fail("expected one definition: " + marker)
        text = remove_function(text, marker)
        if marker in text:
            fail("definition still present: " + marker)
    TH09.write_text(text, encoding="utf-8")


def update_boundaries():
    data = json.loads(BOUNDARIES.read_text(encoding="utf-8"))
    records = list(data.get("duplicateDefinitions") or [])
    kept = []
    removed = []
    for record in records:
        method = str(record.get("method", ""))
        if method not in METHODS:
            kept.append(record)
            continue
        expected = ["th_09_animation.js", "th_19_position_state.js"]
        if list(record.get("definitions") or []) != expected:
            fail("unexpected boundary definitions for " + method)
        if str(record.get("effectiveOwner", "")) != "th_19_position_state.js":
            fail("unexpected boundary owner for " + method)
        removed.append(method)
    if sorted(removed) != sorted(METHODS):
        fail("did not remove both boundary records: %r" % removed)
    data["duplicateDefinitions"] = kept
    BOUNDARIES.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def update_verify():
    text = VERIFY.read_text(encoding="utf-8")
    start_marker = "      - name: Verify th_09 screen reflow analysis\n"
    end_marker = "      - name: Run ToolHub verification\n"
    start = text.find(start_marker)
    if start < 0:
        fail("verify analysis step missing")
    end = text.find(end_marker, start)
    if end < 0:
        fail("verify run step missing after analysis")
    text = text[:start] + text[end:]
    VERIFY.write_text(text, encoding="utf-8")


def update_dead_reporter():
    text = DEAD_REPORTER.read_text(encoding="utf-8")
    old = '''    lines.append("1. 先完成 `th_09_animation.js` 独立审查，区分唯一实现、受保护链和后续覆盖候选。")
    lines.append("2. 优先将 `onScreenChangedReflow` 与 `scheduleScreenReflow` 作为同一屏幕变化链定位、验证和处理。")
    lines.append("3. 再分别审查 `animateBallLayout` 与 `snapToEdgeDocked`，必须包含动画开关、旋转、尺寸变化、面板和指针场景。")'''
    new = '''    lines.append("1. `th_09_animation.js` 独立审查已完成，后续只处理报告中的剩余覆盖候选。")
    lines.append("2. 下一组单独审查 `animateBallLayout`，验证动画开关、取消、结束回调、尺寸变化和 token 失效。")
    lines.append("3. 最后审查 `snapToEdgeDocked`，验证闲置吸边、面板、指针、左右侧和动画开关。")'''
    if text.count(old) != 1:
        fail("stale dead-code recommendation block not found exactly once")
    DEAD_REPORTER.write_text(text.replace(old, new), encoding="utf-8")


def remove_stage_files():
    for path in (ANALYSIS_REPORT, ANALYSIS_SCRIPT):
        if not path.exists():
            fail(str(path.relative_to(ROOT)) + " missing")
        path.unlink()


def main():
    update_th09()
    update_boundaries()
    update_verify()
    update_dead_reporter()
    remove_stage_files()
    print("OK removed th_09 screen reflow fallbacks")


if __name__ == "__main__":
    main()
