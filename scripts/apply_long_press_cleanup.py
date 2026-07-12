#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TH15 = ROOT / "code" / "th_15_extra.js"
TH19 = ROOT / "code" / "th_19_position_state.js"
BOUNDARIES = ROOT / "MODULE_BOUNDARIES.json"
REPORT_SCRIPT = ROOT / "scripts" / "report_dead_module_symbols.py"
SELF = ROOT / "scripts" / "apply_long_press_cleanup.py"
WORKFLOW = ROOT / ".github" / "workflows" / "apply-long-press-cleanup.yml"

ASSIGN_RE = re.compile(
    r"(?:FloatBallAppWM\.prototype|proto)\.armLongPress\s*=\s*function\s*\([^)]*\)\s*\{"
)


def fail(message):
    raise SystemExit("FAIL: " + message)


def find_block_end(text, open_brace):
    depth = 0
    state = "code"
    quote = ""
    escaped = False
    i = open_brace
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
                    while end < len(text) and text[end] in " \t":
                        end += 1
                    if end < len(text) and text[end] == ";":
                        end += 1
                    while end < len(text) and text[end] in " \t":
                        end += 1
                    if end < len(text) and text[end] == "\r":
                        end += 1
                    if end < len(text) and text[end] == "\n":
                        end += 1
                    return end
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
        if state == "string":
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                state = "code"
            i += 1
    fail("unterminated armLongPress assignment")


def remove_assignments(text):
    ranges = []
    for match in ASSIGN_RE.finditer(text):
        open_brace = text.find("{", match.start(), match.end())
        if open_brace < 0:
            fail("armLongPress opening brace missing")
        ranges.append((match.start(), find_block_end(text, open_brace)))
    if len(ranges) != 2:
        fail("expected 2 th_15 armLongPress definitions, got %d" % len(ranges))
    for start, end in reversed(ranges):
        text = text[:start] + text[end:]
    return text


def update_boundaries():
    data = json.loads(BOUNDARIES.read_text(encoding="utf-8"))
    records = data.get("duplicateDefinitions") or []
    matches = [r for r in records if str(r.get("method", "")) == "armLongPress"]
    if len(matches) != 1:
        fail("expected one armLongPress boundary record, got %d" % len(matches))
    record = matches[0]
    if list(record.get("definitions") or []) != [
        "th_15_extra.js", "th_15_extra.js", "th_19_position_state.js"
    ]:
        fail("unexpected armLongPress definition chain")
    data["duplicateDefinitions"] = [
        r for r in records if str(r.get("method", "")) != "armLongPress"
    ]
    direct = data.setdefault("directOwners", {})
    direct["armLongPress"] = "th_19_position_state.js"
    BOUNDARIES.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def update_report_script():
    text = REPORT_SCRIPT.read_text(encoding="utf-8")
    block = '''    if method == "armLongPress":\n        return (\n            "C",\n            "暂缓删除",\n            "涉及设置入口与长按状态辅助方法；应先单独审查调用方和交互契约。",\n        )\n'''
    if text.count(block) != 1:
        fail("armLongPress classify block missing or duplicated")
    REPORT_SCRIPT.write_text(text.replace(block, ""), encoding="utf-8")


def main():
    th15 = TH15.read_text(encoding="utf-8")
    if not th15.startswith("// @version 1.1.4\n"):
        fail("unexpected th_15 version")
    cleaned = remove_assignments(th15)
    cleaned = cleaned.replace("// @version 1.1.4\n", "// @version 1.1.5\n", 1)
    if ASSIGN_RE.search(cleaned):
        fail("th_15 armLongPress definition remains")

    th19 = TH19.read_text(encoding="utf-8")
    if len(ASSIGN_RE.findall(th19)) != 1:
        fail("th_19 must keep exactly one armLongPress implementation")
    required = (
        "proto.armLongPress = function()",
        "this.cancelLongPressTimer()",
        "this.resetLongPressState()",
        "return false;",
    )
    for marker in required:
        if marker not in th19:
            fail("th_19 long-press guard missing: " + marker)

    TH15.write_text(cleaned, encoding="utf-8")
    update_boundaries()
    update_report_script()

    if SELF.exists():
        SELF.unlink()
    if WORKFLOW.exists():
        WORKFLOW.unlink()
    print("OK removed th_15 armLongPress definitions=2; th_19 owner retained")


if __name__ == "__main__":
    main()
