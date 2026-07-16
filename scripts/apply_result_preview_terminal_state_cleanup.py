#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PREVIEW_PATH = ROOT / "code" / "th_21_result_preview.js"
VERIFY_PATH = ROOT / "scripts" / "verify_result_preview.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s replacement count=%d" % (label, count))
    return text.replace(old, new, 1)


def assert_no_external_access():
    patterns = (
        re.compile(r"resultPreview\s*\.\s*lastReason\b"),
        re.compile(r"resultPreview\s*\[\s*['\"]lastReason['\"]\s*\]"),
        re.compile(r"resultPreview\s*\.\s*rootRender\s*\.\s*visibleStartedAt\b"),
        re.compile(r"resultPreview\s*\.\s*rootRender\s*\[\s*['\"]visibleStartedAt['\"]\s*\]"),
    )
    allowed = {PREVIEW_PATH.resolve(), Path(__file__).resolve()}
    failures = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.resolve() in allowed:
            continue
        if path.suffix.lower() not in (".js", ".py", ".json", ".yml", ".yaml", ".md", ".txt"):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except Exception:
            continue
        for pattern in patterns:
            match = pattern.search(text)
            if match:
                failures.append("%s: %s" % (path.relative_to(ROOT), match.group(0)))
    if failures:
        raise SystemExit("external terminal preview state access found:\n" + "\n".join(failures))


assert_no_external_access()
preview = PREVIEW_PATH.read_text(encoding="utf-8")
preview = replace_once(preview, "// @version 1.2.4", "// @version 1.2.5", "preview version")

for old, label in (
    ("        lastReason: \"\"\n", "last reason initial state"),
    ("    render.visibleStartedAt = 0;\n", "render visible time reset"),
    ("    render.visibleStartedAt = render.firstDrawAt;\n", "render visible time mirror"),
    ("        st.lastReason = String(reason || \"\");\n", "dismiss reason mirror"),
    ("        st.lastReason = String(reason || \"dispose\");\n", "dispose reason mirror"),
):
    preview = replace_once(preview, old, "", label)

for forbidden in (
    "render.visibleStartedAt",
    "lastReason:",
    "st.lastReason",
):
    if forbidden in preview:
        raise SystemExit("forbidden terminal preview state remains: " + forbidden)

for required in (
    "render.firstDrawAt",
    "st.visibleStartedAt",
    "render.line1",
    "render.line2",
    "render.copyVisible",
    "st.measuredWidth",
    "st.measuredHeight",
    "st.generation",
    "st.rootToken",
):
    if required not in preview:
        raise SystemExit("required preview state missing: " + required)

PREVIEW_PATH.write_text(preview, encoding="utf-8")

verify = VERIFY_PATH.read_text(encoding="utf-8")
old = '''        and "st.visibleStartedAt" in preview,\n        "preview state must retain only lifecycle values that participate in rendering, timing or stale-callback isolation",\n'''
new = '''        and "render.visibleStartedAt" not in preview\n        and "lastReason:" not in state_init\n        and "st.lastReason" not in preview\n        and "render.firstDrawAt" in preview\n        and "st.visibleStartedAt" in preview,\n        "preview state must retain only values that participate in rendering, timing or stale-callback isolation",\n'''
verify = replace_once(verify, old, new, "terminal state verifier")
VERIFY_PATH.write_text(verify, encoding="utf-8")

print("Applied result preview terminal state cleanup")
