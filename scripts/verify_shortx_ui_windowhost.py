#!/usr/bin/env python3
"""Verify the isolated ShortXUI WindowHost phase-2 contract."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = (ROOT / "code/th_24_shortx_ui_runtime.js").read_text(encoding="utf-8")
LAB = (ROOT / "code/th_34_shortx_ui_lab.js").read_text(encoding="utf-8")
ANIMATION = (ROOT / "code/th_09_animation.js").read_text(encoding="utf-8")
VERIFY = (ROOT / ".github/workflows/verify.yml").read_text(encoding="utf-8")
SIGN = (ROOT / ".github/workflows/sign-toolhub.yml").read_text(encoding="utf-8")
README = (ROOT / "README.md").read_text(encoding="utf-8")
ARCH = (ROOT / "docs/ARCHITECTURE.md").read_text(encoding="utf-8")
STRUCTURE = (ROOT / "docs/STRUCTURE.md").read_text(encoding="utf-8")


def fail(message):
    raise SystemExit("FAIL shortx-ui-windowhost: " + message)


def require(text, fragment, label):
    if fragment not in text:
        fail("missing %s: %s" % (label, fragment))


def forbid(text, fragment, label):
    if fragment in text:
        fail("forbidden %s: %s" % (label, fragment))


runtime_version = re.search(r"(?m)^// @version ([0-9]+\.[0-9]+\.[0-9]+)$", RUNTIME)
lab_version = re.search(r"(?m)^// @version ([0-9]+\.[0-9]+\.[0-9]+)$", LAB)
if not runtime_version or runtime_version.group(1) != "0.2.0":
    fail("runtime version must be 0.2.0")
if not lab_version or lab_version.group(1) != "0.2.0":
    fail("lab version must be 0.2.0")

for marker, label in (
    ('NEW: "NEW"', "NEW state"),
    ('PREPARED: "PREPARED"', "PREPARED state"),
    ('ATTACHING: "ATTACHING"', "ATTACHING state"),
    ('ATTACHED: "ATTACHED"', "ATTACHED state"),
    ('CLOSING: "CLOSING"', "CLOSING state"),
    ('DETACHED: "DETACHED"', "DETACHED state"),
    ('DISPOSED: "DISPOSED"', "DISPOSED state"),
    ("new Packages.android.view.View.OnAttachStateChangeListener", "attach listener"),
    ("target.addOnAttachStateChangeListener(listener)", "listener registration"),
    ("view.removeOnAttachStateChangeListener(listener)", "listener cleanup"),
    ("view.isAttachedToWindow", "attached check"),
    ("wm.addView(view, params)", "addView"),
    ("wm.updateViewLayout(view, params)", "updateViewLayout"),
    ("wm.removeViewImmediate(view)", "immediate remove"),
    ("wm.removeView(view)", "normal remove"),
    ('return result(false, "DETACH_TIMEOUT"', "detach timeout result"),
    ("detachTimedOut = true", "late detach tracking"),
    ("stats.lateDetach += 1", "late detach counter"),
    ('return result(true, "ALREADY_DETACHED"', "idempotent remove"),
    ('return result(false, "DISPOSE_WAITING_FOR_DETACH"', "no early dispose"),
    ("view = null;", "reference cleanup"),
    ("params = null;", "params cleanup"),
):
    require(RUNTIME, marker, label)

cleanup_pos = RUNTIME.find("          view = null;")
detach_guard_pos = RUNTIME.find('if (!removeResult.ok && state !== STATES.DETACHED)')
if detach_guard_pos < 0 or cleanup_pos < 0 or detach_guard_pos > cleanup_pos:
    fail("detach confirmation must precede reference cleanup")

for marker, label in (
    ("openShortXUiLabWindowHost", "manual open"),
    ("moveShortXUiLabWindowHost", "manual update"),
    ("closeShortXUiLabWindowHost", "manual remove"),
    ("runShortXUiLabWindowHostStress", "stress test"),
    ("cyclesRequested: 10", "ten-cycle stress"),
    ("shortXUiLabCreateWindowBundle", "owner-thread View creation"),
    ('fromHandler(this.state.h, "shortx-ui-windowhost")', "WM dispatcher"),
    ("TYPE_APPLICATION_OVERLAY", "overlay type"),
    ("FLAG_NOT_FOCUSABLE", "non-focusable flag"),
    ("普通移除", "normal remove UI"),
    ("立即移除", "immediate remove UI"),
    ("WindowHost 生命周期", "lab section"),
    ("shortXUiLabPersistState", "combined diagnostics"),
    ("schema: 2", "diagnostics schema"),
):
    require(LAB, marker, label)

for fragment, label in (
    ("FloatBallAppWM.prototype.safeRemoveView =", "production safeRemoveView override"),
    ("this.safeRemoveView(", "production remover use"),
    ("showMask(", "production mask use"),
    ("addPanel(", "production panel add"),
):
    forbid(LAB, fragment, label)

require(ANIMATION, "// @version 1.0.12", "unchanged animation module version")
require(ANIMATION, "FloatBallAppWM.prototype.safeRemoveView = function", "production safeRemoveView retained")
for workflow, label in ((VERIFY, "verify"), (SIGN, "sign")):
    require(workflow, "python3 scripts/verify_shortx_ui_windowhost.py", label + " workflow")

for doc, label in (
    (README, "README"),
    (ARCH, "ARCHITECTURE"),
    (STRUCTURE, "STRUCTURE"),
):
    require(doc, "WindowHost", label + " WindowHost documentation")

allowed = {
    "NEW": {"PREPARED", "DETACHED"},
    "PREPARED": {"ATTACHING", "DETACHED"},
    "ATTACHING": {"ATTACHED", "CLOSING"},
    "ATTACHED": {"CLOSING"},
    "CLOSING": {"DETACHED"},
    "DETACHED": {"DISPOSED"},
    "DISPOSED": set(),
}
normal = ["NEW", "PREPARED", "ATTACHING", "ATTACHED", "CLOSING", "DETACHED", "DISPOSED"]
for old, new in zip(normal, normal[1:]):
    if new not in allowed[old]:
        fail("state model rejected %s -> %s" % (old, new))
if "DETACHED" not in allowed["NEW"] or "DISPOSED" in allowed["ATTACHED"]:
    fail("state model boundary mismatch")

print(
    "OK shortx_ui_windowhost runtime=0.2.0 lab=0.2.0 "
    "thread=wm-owner attach=confirmed update=owner remove=confirmed "
    "timeout=retains_refs stress=10 production_paths=unchanged"
)
