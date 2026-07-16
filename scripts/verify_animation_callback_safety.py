#!/usr/bin/env python3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
files = {
    "base": ROOT / "code" / "th_01_base.js",
    "major": ROOT / "code" / "th_08_content.js",
    "undock": ROOT / "code" / "th_09_animation.js",
    "panel": ROOT / "code" / "th_15_extra.js",
    "animation": ROOT / "code" / "th_19_position_state.js",
}
text = {name: path.read_text(encoding="utf-8") for name, path in files.items()}
errors = []

def require(name, token):
    if token not in text[name]:
        errors.append("%s missing: %s" % (name, token))

for token in (
    "callbackCompleted",
    'typeof endCb !== "function"',
    'typeof stateObj.wm.updateViewLayout === "function"',
    '"BALL_ANIM_CALLBACK_BEGIN"',
    '"BALL_ANIM_CALLBACK_DONE"',
    '"BALL_ANIM_CALLBACK_FAIL"',
    'invokeEndCallback("animation_end")',
    'commitFinalLayout("animation_end")',
):
    require("animation", token)

for token in (
    "callbackCompleted",
    'typeof endCb !== "function"',
    'typeof this.animateBallLayout === "function"',
    'typeof self.state.wm.updateViewLayout !== "function"',
    '"BALL_UNDOCK_CALLBACK_BEGIN"',
    '"BALL_UNDOCK_CALLBACK_DONE"',
    '"BALL_UNDOCK_CALLBACK_FAIL"',
):
    require("undock", token)

for token in (
    'typeof self.showMask !== "function"',
    'typeof self.buildPanelView !== "function"',
    'typeof self.addPanel !== "function"',
    'typeof this.undockToFull !== "function"',
    '"PANEL_SHOW_CALLBACK_BEGIN"',
    '"PANEL_SHOW_MASK_BEGIN"',
    '"PANEL_BUILD_CALL_BEGIN"',
    '"PANEL_ADD_CALL_BEGIN"',
    '"PANEL_SHOW_CALLBACK_FAIL"',
    "maskAddedByCallback",
    "hideMaskIfNoPanelVisible",
):
    require("panel", token)

for name in ("base", "major"):
    require(name, "isToolHubSystemServerProcess")
    require(name, "global crash handler skipped in system_server")
    guard = text[name].find("if (isToolHubSystemServerProcess")
    if name == "major":
        guard = text[name].find("if (systemServer)")
    setter = text[name].find("java.lang.Thread.setDefaultUncaughtExceptionHandler")
    if guard < 0 or setter < 0 or guard > setter:
        errors.append("%s system_server guard must precede global handler install" % name)

for name in ("animation", "undock"):
    for forbidden in (
        "if (endCb) endCb()",
        "try { if (endCb) endCb(); } catch",
        "catch (eCb) {}",
    ):
        if forbidden in text[name]:
            errors.append("%s unsafe callback pattern remains: %s" % (name, forbidden))

for name, source in text.items():
    for pattern, label in (
        (r"\blet\s+[A-Za-z_$]", "let"),
        (r"\bconst\s+[A-Za-z_$]", "const"),
        (r"=>", "arrow"),
        (r"\?\.[A-Za-z_$]", "optional-chain"),
        (r"\?\?\s*[A-Za-z_$0-9(]", "nullish"),
        (r"`", "template-literal"),
    ):
        if re.search(pattern, source):
            errors.append("%s Rhino ES5 forbidden syntax: %s" % (name, label))

if errors:
    print("ANIMATION_CALLBACK_SAFETY_ERRORS %d" % len(errors))
    for error in errors:
        print("ERROR", error)
    raise SystemExit(1)

print("OK animation_callback_safety callback_once=1 method_preflight=1 stage_logging=1 mask_rollback=1 system_server_global_handler=skipped es5=1")
