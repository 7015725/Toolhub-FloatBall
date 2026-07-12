#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TH09 = ROOT / "code" / "th_09_animation.js"
TH15 = ROOT / "code" / "th_15_extra.js"
TH19 = ROOT / "code" / "th_19_position_state.js"
BOUNDARIES = ROOT / "MODULE_BOUNDARIES.json"
VERIFY_WORKFLOW = ROOT / ".github" / "workflows" / "verify.yml"
ANALYSIS_REPORT = ROOT / "TH15_SCREEN_REFLOW_ANALYSIS.md"
ANALYSIS_SCRIPT = ROOT / "scripts" / "verify_th15_screen_reflow_candidate.py"
SELF = ROOT / "scripts" / "apply_th15_screen_reflow_cleanup.py"
WORKFLOW = ROOT / ".github" / "workflows" / "apply-th15-screen-reflow-cleanup.yml"

DEF_RE = re.compile(
    r"(?:FloatBallAppWM\.prototype|proto)\.onScreenChangedReflow"
    r"\s*=\s*function\b"
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
                    if end < len(text) and text[end] == "\r":
                        end += 1
                    if end < len(text) and text[end] == "\n":
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
    fail("unterminated th_15 onScreenChangedReflow wrapper")


def remove_th15_wrapper():
    text = TH15.read_text(encoding="utf-8")
    if not text.startswith("// @version 1.1.5\n"):
        fail("unexpected th_15 version")
    if len(DEF_RE.findall(text)) != 1:
        fail("expected exactly one th_15 onScreenChangedReflow definition")

    marker = '    if (typeof proto.onScreenChangedReflow === "function") {'
    start = text.find(marker)
    if start < 0:
        fail("th_15 wrapper start marker missing")
    open_brace = text.find("{", start, start + len(marker))
    if open_brace < 0:
        fail("th_15 wrapper opening brace missing")
    end = find_block_end(text, open_brace)
    cleaned = text[:start] + text[end:]
    cleaned = cleaned.replace("// @version 1.1.5\n", "// @version 1.1.6\n", 1)
    if DEF_RE.search(cleaned):
        fail("th_15 onScreenChangedReflow definition remains")

    if len(DEF_RE.findall(TH09.read_text(encoding="utf-8"))) != 1:
        fail("th_09 must retain one onScreenChangedReflow definition")
    th19 = TH19.read_text(encoding="utf-8")
    if len(DEF_RE.findall(th19)) != 1:
        fail("th_19 must retain one onScreenChangedReflow definition")
    for marker in (
        'this.cancelPointerSemanticUpdate(null, "screen_reflow")',
        'typeof this.onPointerScreenChangedReflow === "function"',
        'this.applyConfiguredBallPosition(false, "screen_reflow:"',
    ):
        if marker not in th19:
            fail("th_19 final reflow marker missing: " + marker)

    TH15.write_text(cleaned, encoding="utf-8")


def update_boundaries():
    data = json.loads(BOUNDARIES.read_text(encoding="utf-8"))
    records = data.get("duplicateDefinitions") or []
    matches = [r for r in records if str(r.get("method", "")) == "onScreenChangedReflow"]
    if len(matches) != 1:
        fail("expected one onScreenChangedReflow boundary record")
    record = matches[0]
    expected = [
        "th_09_animation.js",
        "th_15_extra.js",
        "th_19_position_state.js",
    ]
    if list(record.get("definitions") or []) != expected:
        fail("unexpected onScreenChangedReflow definition chain")
    if str(record.get("effectiveOwner", "")) != "th_19_position_state.js":
        fail("unexpected onScreenChangedReflow final owner")

    record["definitions"] = ["th_09_animation.js", "th_19_position_state.js"]
    record["type"] = "temporary_override"
    record["reason"] = "旧比例坐标重排由 th_19 固定位置与指针重排实现覆盖"
    record.pop("wrappers", None)
    BOUNDARIES.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def update_verify_workflow():
    text = VERIFY_WORKFLOW.read_text(encoding="utf-8")
    start_marker = "      - name: Verify th_15 screen reflow candidate\n"
    end_marker = "      - name: Run ToolHub verification\n"
    start = text.find(start_marker)
    end = text.find(end_marker, start if start >= 0 else 0)
    if start < 0 or end < 0 or end <= start:
        fail("screen reflow verification steps missing from verify workflow")
    cleaned = text[:start] + text[end:]
    VERIFY_WORKFLOW.write_text(cleaned, encoding="utf-8")


def remove_stage_files():
    for path in (ANALYSIS_REPORT, ANALYSIS_SCRIPT, SELF, WORKFLOW):
        if path.exists():
            path.unlink()


def main():
    remove_th15_wrapper()
    update_boundaries()
    update_verify_workflow()
    remove_stage_files()
    print("OK removed th_15 onScreenChangedReflow wrapper; th_09 and th_19 retained")


if __name__ == "__main__":
    main()
