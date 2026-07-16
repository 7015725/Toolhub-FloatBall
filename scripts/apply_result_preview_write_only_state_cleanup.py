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


def assert_no_external_direct_access():
    fields = (
        "visible",
        "entering",
        "exiting",
        "drawCount",
        "firstDrawLogged",
        "dismissScheduledAt",
        "downAt",
    )
    joined = "|".join(re.escape(field) for field in fields)
    patterns = (
        re.compile(r"resultPreview\s*\.\s*(?:%s)\b" % joined),
        re.compile(r"resultPreview\s*\[\s*['\"](?:%s)['\"]\s*\]" % joined),
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
        raise SystemExit("external resultPreview state access found:\n" + "\n".join(failures))


assert_no_external_direct_access()
preview = PREVIEW_PATH.read_text(encoding="utf-8")
preview = replace_once(preview, "// @version 1.2.3", "// @version 1.2.4", "preview version")

for old, label in (
    ("        visible: false,\n", "visible initial state"),
    ("        entering: false,\n", "entering initial state"),
    ("        exiting: false,\n", "exiting initial state"),
    ("        drawCount: 0,\n", "state draw count"),
    ("        firstDrawLogged: false,\n", "state first draw logged"),
    ("        dismissScheduledAt: 0,\n", "dismiss scheduled state"),
    ("        downAt: 0,\n", "touch down timestamp state"),
    ("    render.firstDrawLogged = false;\n", "render first draw reset"),
    ("    st.drawCount = 0;\n", "state draw count sync reset"),
    ("    st.firstDrawLogged = false;\n", "state first draw sync reset"),
    ("    st.dismissScheduledAt = 0;\n", "state dismiss sync reset"),
    ("    st.dismissScheduledAt = now21();\n", "dismiss schedule timestamp"),
    ("    st.drawCount = Number(render.drawCount || 0);\n", "state draw count mirror"),
    ("    render.firstDrawLogged = true;\n", "render first draw marker"),
    ("    st.firstDrawLogged = true;\n", "state first draw marker"),
    ("    st.visible = true;\n", "state visible marker"),
    ("            st.downAt = now21();\n", "touch down timestamp assignment"),
    ("      st.visible = false;\n", "detach visible reset"),
    ("      st.entering = false;\n", "detach entering reset"),
    ("      st.exiting = false;\n", "detach exiting reset"),
    ("    st.firstDrawLogged = false;\n", "remove first draw reset"),
    ("    st.dismissScheduledAt = 0;\n", "remove dismiss timestamp reset"),
    ("    st.visible = false;\n", "attach visible reset"),
    ("    st.entering = true;\n", "attach entering marker"),
    ("    st.entering = false;\n", "attach entering clear"),
    ("    st.visible = false;\n", "update visible reset"),
    ("            current.exiting = true;\n", "dismiss exiting marker"),
):
    preview = replace_once(preview, old, "", label)

# cancelDismiss21() and scheduleDismiss21() each contain an additional timestamp reset.
preview = replace_once(preview, "    st.dismissScheduledAt = 0;\n", "", "cancel dismiss timestamp reset")
preview = replace_once(preview, "      st.dismissScheduledAt = 0;\n", "", "dismiss post failure timestamp reset")
# removeView21() contains one additional state draw-count reset.
preview = replace_once(preview, "    st.drawCount = 0;\n", "", "remove state draw count reset")

for forbidden in (
    "st.visible =",
    "st.entering =",
    "st.exiting =",
    "current.exiting =",
    "st.drawCount =",
    "firstDrawLogged",
    "dismissScheduledAt",
    "st.downAt =",
):
    if forbidden in preview:
        raise SystemExit("forbidden write-only state remains: " + forbidden)

for required in (
    "render.drawCount",
    "render.firstDrawAt",
    "st.visibleStartedAt",
    "st.touchMoved",
    "st.rootToken",
    "st.generation",
):
    if required not in preview:
        raise SystemExit("required runtime state missing: " + required)

PREVIEW_PATH.write_text(preview, encoding="utf-8")

verify = VERIFY_PATH.read_text(encoding="utf-8")
marker = '''    require(
        "preview / canvas-only custom rendering",
'''
insert = '''    state_init = section(preview, "appObj.state.resultPreview = {", "var st = appObj.state.resultPreview;")
    require(
        "preview / no write-only lifecycle mirrors",
        "visible: false" not in state_init
        and "entering: false" not in state_init
        and "exiting: false" not in state_init
        and "drawCount: 0" not in state_init
        and "firstDrawLogged: false" not in state_init
        and "dismissScheduledAt: 0" not in state_init
        and "downAt: 0" not in state_init
        and "st.visible =" not in preview
        and "st.entering =" not in preview
        and "st.exiting =" not in preview
        and "current.exiting =" not in preview
        and "st.drawCount =" not in preview
        and "firstDrawLogged" not in preview
        and "dismissScheduledAt" not in preview
        and "st.downAt =" not in preview
        and "render.drawCount" in preview
        and "render.firstDrawAt" in preview
        and "st.visibleStartedAt" in preview,
        "preview state must retain only lifecycle values that participate in rendering, timing or stale-callback isolation",
        failures,
    )

'''
verify = replace_once(verify, marker, insert + marker, "write-only preview state verifier")
VERIFY_PATH.write_text(verify, encoding="utf-8")

print("Applied result preview write-only state cleanup")
