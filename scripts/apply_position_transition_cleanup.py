#!/usr/bin/env python3
"""一次性删除 th_15 中已由 th_19 接管的位置过渡实现。"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TH15 = ROOT / "code" / "th_15_extra.js"
BOUNDARIES = ROOT / "MODULE_BOUNDARIES.json"
DEAD_REPORT_SCRIPT = ROOT / "scripts" / "report_dead_module_symbols.py"
VERIFY_WORKFLOW = ROOT / ".github" / "workflows" / "verify.yml"
SIGN_WORKFLOW = ROOT / ".github" / "workflows" / "sign-toolhub.yml"
TRANSITION_SCRIPT = ROOT / "scripts" / "verify_position_transition_load_order.py"
TRANSITION_REPORT = ROOT / "POSITION_TRANSITION_AUDIT.md"
SELF = Path(__file__).resolve()
SELF_WORKFLOW = ROOT / ".github" / "workflows" / "apply-position-transition-cleanup.yml"

TARGET_COUNTS = {
    "applyConfiguredBallPosition": 1,
    "cancelConfiguredBallPositionApply": 1,
    "createBallLayoutParams": 2,
    "getConfiguredBallPosition": 1,
    "isBallPositionEffectKey": 1,
    "loadSavedPos": 1,
    "scheduleConfiguredBallPositionApply": 1,
    "snapToEdgeDocked": 1,
}


def fail(message):
    raise SystemExit("FAIL: " + message)


def find_function_end(text, open_brace):
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
            if ch in ("'", '"'):
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
                    return i
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
                quote = ""
            i += 1
            continue

    fail("unterminated function body at offset %d" % open_brace)


def remove_method_definitions(text, method, expected_count):
    pattern = re.compile(
        r"(?m)^[ \t]*(?:FloatBallAppWM\.prototype|proto)\."
        + re.escape(method)
        + r"\s*=\s*function\b"
    )
    removed = 0
    while True:
        match = pattern.search(text)
        if not match:
            break
        open_brace = text.find("{", match.end())
        if open_brace < 0:
            fail("opening brace missing for " + method)
        close_brace = find_function_end(text, open_brace)
        end = close_brace + 1
        while end < len(text) and text[end] in " \t":
            end += 1
        if end < len(text) and text[end] == ";":
            end += 1
        if end < len(text) and text[end] == "\r":
            end += 1
        if end < len(text) and text[end] == "\n":
            end += 1
        if end < len(text) and text[end] == "\n":
            end += 1
        text = text[:match.start()] + text[end:]
        removed += 1

    if removed != expected_count:
        fail("%s expected %d definitions, removed %d" % (method, expected_count, removed))
    return text


def update_th15():
    text = TH15.read_text(encoding="utf-8")
    if not text.startswith("// @version 1.1.3\n"):
        fail("unexpected th_15 version header")
    text = text.replace("// @version 1.1.3\n", "// @version 1.1.4\n", 1)

    for method, expected in TARGET_COUNTS.items():
        text = remove_method_definitions(text, method, expected)

    for method in TARGET_COUNTS:
        pattern = re.compile(
            r"(?:FloatBallAppWM\.prototype|proto)\."
            + re.escape(method)
            + r"\s*=\s*function\b"
        )
        if pattern.search(text):
            fail("target definition remains in th_15: " + method)

    TH15.write_text(text, encoding="utf-8")


def update_boundaries():
    data = json.loads(BOUNDARIES.read_text(encoding="utf-8"))
    direct = data.setdefault("directOwners", {})
    records = data.get("duplicateDefinitions") or []
    updated = []
    seen = set()

    for record in records:
        method = str(record.get("method", ""))
        if method not in TARGET_COUNTS:
            updated.append(record)
            continue

        seen.add(method)
        definitions = [
            module for module in (record.get("definitions") or [])
            if module != "th_15_extra.js"
        ]
        if not definitions:
            fail("boundary became empty for " + method)

        if len(definitions) == 1:
            direct[method] = str(record.get("effectiveOwner") or definitions[0])
            continue

        record["definitions"] = definitions
        if method == "snapToEdgeDocked":
            record["type"] = "temporary_override"
            record["reason"] = "通用吸边实现由 th_19 固定位置状态机覆盖"
        updated.append(record)

    missing = sorted(set(TARGET_COUNTS) - seen)
    if missing:
        fail("boundary records missing: " + ", ".join(missing))

    data["duplicateDefinitions"] = updated
    BOUNDARIES.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def update_dead_report_script():
    text = DEAD_REPORT_SCRIPT.read_text(encoding="utf-8")
    block = '''POSITION_TRANSITION_METHODS = {
    "applyConfiguredBallPosition",
    "cancelConfiguredBallPositionApply",
    "createBallLayoutParams",
    "getConfiguredBallPosition",
    "isBallPositionEffectKey",
    "loadSavedPos",
    "scheduleConfiguredBallPositionApply",
    "snapToEdgeDocked",
}

'''
    if block not in text:
        fail("POSITION_TRANSITION_METHODS block not found")
    text = text.replace(block, "", 1)

    classify_block = '''    if module == "th_15_extra.js" and method in POSITION_TRANSITION_METHODS:
        return (
            "B",
            "位置过渡候选",
            "th_19 在实例创建前无条件覆盖；仍需确认模块加载期没有调用及设备位置基线一致。",
        )
'''
    if classify_block not in text:
        fail("position transition classify block not found")
    text = text.replace(classify_block, "", 1)
    DEAD_REPORT_SCRIPT.write_text(text, encoding="utf-8")


def update_verify_workflow():
    text = VERIFY_WORKFLOW.read_text(encoding="utf-8")
    start_marker = "      - name: Verify position transition audit\n"
    end_marker = "      - name: Run ToolHub verification\n"
    start = text.find(start_marker)
    end = text.find(end_marker, start + len(start_marker)) if start >= 0 else -1
    if start < 0 or end < 0:
        fail("position transition workflow block not found")
    text = text[:start] + text[end:]
    VERIFY_WORKFLOW.write_text(text, encoding="utf-8")


def update_sign_workflow():
    text = SIGN_WORKFLOW.read_text(encoding="utf-8")
    old = '''          python3 .github/scripts/es5_scan.py
          python3 scripts/verify_manifest.py
          python3 scripts/verify_toolapp_single_root.py
          python3 scripts/verify_toolapp_adaptive_size.py
          python3 scripts/verify_button_editor_layout.py
          python3 scripts/verify_schema_validator.py
          python3 .github/scripts/verify_manifest_signature.py
          git diff --check
'''
    new = '''          python3 .github/scripts/es5_scan.py
          python3 scripts/verify_js_syntax.py
          python3 scripts/verify_sqlite_storage.py
          python3 scripts/verify_ball_position_state.py
          python3 scripts/verify_toolapp_layout.py
          python3 scripts/verify_button_editor_layout.py
          python3 scripts/verify_schema_validator.py
          python3 scripts/verify_pointer_regressions.py
          python3 .github/scripts/verify_manifest_signature.py
          git diff --check
'''
    if old not in text:
        fail("obsolete sign verification block not found")
    SIGN_WORKFLOW.write_text(text.replace(old, new, 1), encoding="utf-8")


def remove_stage_files():
    for path in (TRANSITION_SCRIPT, TRANSITION_REPORT):
        if not path.exists():
            fail("stage file missing: " + str(path.relative_to(ROOT)))
        path.unlink()


def remove_one_time_files():
    for path in (SELF, SELF_WORKFLOW):
        if path.exists():
            path.unlink()


def main():
    update_th15()
    update_boundaries()
    update_dead_report_script()
    update_verify_workflow()
    update_sign_workflow()
    remove_stage_files()
    remove_one_time_files()
    print("OK position transition fallbacks removed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
