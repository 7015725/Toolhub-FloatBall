#!/usr/bin/env python3
# 验证 system_server 中主面板、共享遮罩和 ToolApp 仅使用跨消息边界的普通移除。

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ANIMATION_PATH = ROOT / "code" / "th_09_animation.js"
ENTRY_MODULE_PATH = ROOT / "code" / "th_16_entry.js"
MAIN_PANEL_PATH = ROOT / "code" / "th_15_main_panel.js"
WORKFLOW_PATH = ROOT / ".github" / "workflows" / "verify.yml"
ROOT_ENTRY_PATH = ROOT / "ToolHub.js"

ANIMATION = ANIMATION_PATH.read_text(encoding="utf-8")
ENTRY_MODULE = ENTRY_MODULE_PATH.read_text(encoding="utf-8")
MAIN_PANEL = MAIN_PANEL_PATH.read_text(encoding="utf-8")
WORKFLOW = WORKFLOW_PATH.read_text(encoding="utf-8")
ROOT_ENTRY = ROOT_ENTRY_PATH.read_text(encoding="utf-8")


def fail(message):
    raise SystemExit("FAIL main-panel-close-lifecycle: " + message)


def version_at_least(text, expected):
    match = re.search(r"(?m)^// @version ([0-9]+)\.([0-9]+)\.([0-9]+)$", text)
    return bool(match) and tuple(map(int, match.groups())) >= expected


def isolate(text, start_marker, end_marker):
    start = text.find(start_marker)
    end = text.find(end_marker, start + 1)
    if start < 0 or end <= start:
        fail("cannot isolate %s" % start_marker)
    return text[start:end]


if not version_at_least(ANIMATION, (1, 0, 14)):
    fail("expected th_09_animation.js >= 1.0.14")
if not version_at_least(ENTRY_MODULE, (1, 0, 18)):
    fail("expected th_16_entry.js >= 1.0.18")
if "// @version 1.5.9" not in MAIN_PANEL:
    fail("main panel UI module must remain unchanged")

safe = isolate(
    ANIMATION,
    "FloatBallAppWM.prototype.safeRemoveView = function",
    "FloatBallAppWM.prototype.hideMask = function",
)
if "removeViewImmediate" in safe:
    fail("safeRemoveView must not synchronously destroy ViewRoot")
for marker in (
    "var requestedImmediate = opts.immediate === true",
    "var immediate = false",
    "v.setVisibility(android.view.View.INVISIBLE)",
    "v.setAlpha(0)",
    "this.unregisterPanelPredictiveBack(v, resetVisual)",
    "this.detachPanelImeAvoidance(v)",
    "this.state.wm.removeView(v)",
    "requestedImmediate: requestedImmediate",
):
    if marker not in safe:
        fail("safeRemoveView missing: %s" % marker)

hide_main = isolate(
    ANIMATION,
    "FloatBallAppWM.prototype.hideMainPanel = function",
    "FloatBallAppWM.prototype.hideSettingsPanel = function",
)
for marker in (
    "mainPanelExitGeneration",
    "var finished = false",
    "isCurrent = self.state.panel === panel",
    "immediate: false",
    "resetVisual: false",
    "keepInvisible: true",
    "toolAppGenerationAtHide",
    "main panel mask cleanup skipped for toolapp transition",
    "self.state.h.post(maskCleanup)",
):
    if marker not in hide_main:
        fail("hideMainPanel missing: %s" % marker)

hide_mask = isolate(
    ANIMATION,
    "FloatBallAppWM.prototype.hideMask = function",
    "FloatBallAppWM.prototype.hideMaskIfNoPanelVisible = function",
)
if "immediate: false" not in hide_mask:
    fail("mask must use deferred removal")

tool_remove = ENTRY_MODULE[
    ENTRY_MODULE.find("FloatBallAppWM.prototype.removeToolAppOnMain = function"):
]
if "removeViewImmediate" in tool_remove:
    fail("ToolApp removal must not call removeViewImmediate")
for marker in (
    "root.setVisibility(android.view.View.INVISIBLE)",
    "root.setAlpha(0)",
    "this.detachPanelImeAvoidance(root)",
    "s.wm.removeView(root)",
    "toolapp deferred remove fail",
    'hideMaskIfNoPanelVisible("toolapp_build_fail")',
):
    if marker not in ENTRY_MODULE:
        fail("ToolApp lifecycle missing: %s" % marker)

if "python3 scripts/verify_main_panel_close_lifecycle.py" not in WORKFLOW:
    fail("workflow verification missing")
entry_version = re.search(
    r"(?m)^var TOOLHUB_ENTRY_VERSION = ([0-9]+);",
    ROOT_ENTRY,
)
if not entry_version:
    fail("TOOLHUB_ENTRY_VERSION declaration missing")
if int(entry_version.group(1)) < 20260809223000:
    fail("entry version regressed below channel detach barrier baseline")

for path in (ANIMATION_PATH, ENTRY_MODULE_PATH):
    raw = path.read_bytes()
    if not raw.endswith(b"\n") or raw.endswith(b"\n\n"):
        fail("invalid EOF: %s" % path.relative_to(ROOT))

print(
    "OK main_panel_close_lifecycle deferred_remove=1 "
    "main_mask=toolapp_generation_guarded toolapp_failure=mask_rollback "
    "channel_detach_barrier=1"
)
