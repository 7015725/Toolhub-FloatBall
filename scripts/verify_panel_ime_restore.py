#!/usr/bin/env python3
"""Verify unified overlay IME avoidance restores exact geometry and Back semantics."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
EXTRA = (ROOT / "code" / "th_15_extra.js").read_text(encoding="utf-8")
ANIMATION = (ROOT / "code" / "th_09_animation.js").read_text(encoding="utf-8")
PANELS = (ROOT / "code" / "th_14_panels.js").read_text(encoding="utf-8")
ICON_PICKER = (ROOT / "code" / "th_14_icon_picker.js").read_text(encoding="utf-8")


def fail(message):
    raise SystemExit("FAIL panel-ime-restore: " + message)


def version_at_least(text, expected, label):
    match = re.search(r"(?m)^// @version (\d+)\.(\d+)\.(\d+)$", text)
    if not match or tuple(map(int, match.groups())) < expected:
        fail("%s version below %s" % (label, ".".join(map(str, expected))))


def isolate(text, start_marker, end_marker):
    start = text.find(start_marker)
    end = text.find(end_marker, start + len(start_marker))
    if start < 0 or end <= start:
        fail("cannot isolate %s" % start_marker)
    return text[start:end]


version_at_least(EXTRA, (1, 1, 25), "th_15_extra.js")
version_at_least(ANIMATION, (1, 0, 15), "th_09_animation.js")
version_at_least(PANELS, (1, 1, 17), "th_14_panels.js")
version_at_least(ICON_PICKER, (1, 0, 5), "th_14_icon_picker.js")

capture = isolate(
    EXTRA,
    "FloatBallAppWM.prototype.capturePanelImeGeometry = function",
    "FloatBallAppWM.prototype.findPanelFocusedImeInput = function",
)
restore = isolate(
    EXTRA,
    "FloatBallAppWM.prototype.restorePanelImeGeometry = function",
    "FloatBallAppWM.prototype.handlePanelImeBack = function",
)
update = isolate(
    EXTRA,
    "FloatBallAppWM.prototype.updatePanelImeLayout = function",
    "FloatBallAppWM.prototype.ensurePanelFocusedInputVisible = function",
)
attach = isolate(
    EXTRA,
    "FloatBallAppWM.prototype.attachPanelImeAvoidance = function",
    "FloatBallAppWM.prototype.detachPanelImeAvoidance = function",
)
detach = isolate(
    EXTRA,
    "FloatBallAppWM.prototype.detachPanelImeAvoidance = function",
    "FloatBallAppWM.prototype.addPanel = function",
)

for field in ("width", "height", "gravity", "x", "y"):
    if "%s: Number(lp.%s" % (field, field) not in capture:
        fail("capture missing original %s" % field)
    if "lp.%s = restore.%s" % (field, field) not in restore:
        fail("restore missing exact %s" % field)

for marker in (
    "this.state.wm.updateViewLayout(binding.root, lp)",
    "binding.restore = null",
    "binding.applied = false",
    "binding.lastImeVisible = false",
    "if (releaseFocus === true) this.releasePanelImeFocus(binding, reason)",
):
    if marker not in restore:
        fail("restore contract missing: %s" % marker)
if restore.index("updateViewLayout") > restore.index("binding.restore = null"):
    fail("snapshot must clear only after WindowManager restore succeeds")

for marker in (
    "if (!ime.visible || !focusedInput)",
    '"input_blur"',
    '"ime_hidden"',
    "this.restorePanelImeGeometry(binding, restoreReason, releaseFocus, true)",
    "var needsApply = changed || !binding.applied",
):
    if marker not in update:
        fail("update path missing: %s" % marker)

for marker in (
    "newFocus && newFocus instanceof android.widget.EditText",
    "oldFocus && oldFocus instanceof android.widget.EditText",
    "!self.findPanelFocusedImeInput(binding.root)",
    "binding.handler.postDelayed(binding.focusRestoreRunnable, 80)",
):
    if marker not in attach:
        fail("focus transition missing: %s" % marker)

for marker in (
    'this.restorePanelImeGeometry(binding, "detach", false, false)',
    "removeCallbacks(binding.pollRunnable)",
    "removeCallbacks(binding.focusRestoreRunnable)",
    "removeOnGlobalLayoutListener(binding.layoutListener)",
    "removeOnGlobalFocusChangeListener(binding.focusListener)",
    "binding.restore = null",
):
    if marker not in detach:
        fail("detach cleanup missing: %s" % marker)

ime_back = isolate(
    EXTRA,
    "FloatBallAppWM.prototype.handlePanelImeBack = function",
    "FloatBallAppWM.prototype.updatePanelImeLayout = function",
)
for marker in (
    "if (!binding || binding.detached || !binding.restore) return false",
    "hideSoftInputFromWindow(token, 0)",
    "this.restorePanelImeGeometry(binding, reason || \"ime_back\", true, true)",
    "return true",
):
    if marker not in ime_back:
        fail("first-Back contract missing: %s" % marker)

for text, label in (
    (ANIMATION, "common panel"),
    (PANELS, "fullscreen/color popup"),
    (ICON_PICKER, "icon picker"),
):
    if "handlePanelImeBack" not in text or "back_key" not in text or "on_back_invoked" not in text:
        fail("%s must consume first legacy and predictive Back for IME" % label)

for owner in ('"settings"', '"btn_editor"', '"schema_editor"', '"tool_app"'):
    if owner not in EXTRA:
        fail("modal owner missing from unified attachment: %s" % owner)
if '"fullscreen_input_popup"' not in PANELS or '"shortx_icon_picker"' not in ICON_PICKER:
    fail("special popup owner missing from unified attachment")

# Model the invariant that every cycle starts from the same immutable snapshot.
original = {"width": 1080, "height": 1800, "gravity": 51, "x": 0, "y": 96}
layout = dict(original)
for _ in range(12):
    snapshot = dict(layout)
    layout.update({"height": 930, "gravity": 51, "y": 48})
    layout.update(snapshot)
    if layout != original:
        fail("repeated IME cycles accumulated geometry drift")

print(
    "OK panel_ime_restore exact_geometry=width,height,gravity,x,y "
    "triggers=hidden,blur,back,detach focus_handoff=1 drift=0 owners=6"
)
