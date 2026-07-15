#!/usr/bin/env python3
# 验证主面板退出动画、预测性返回清理与 WindowManager 移除顺序。

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "code" / "th_09_animation.js"
MAIN_PANEL_PATH = ROOT / "code" / "th_15_main_panel.js"
WORKFLOW_PATH = ROOT / ".github" / "workflows" / "verify.yml"
ENTRY_PATH = ROOT / "ToolHub.js"
README_PATH = ROOT / "README.md"
ARCH_PATH = ROOT / "ARCHITECTURE.md"

SOURCE = MODULE_PATH.read_text(encoding="utf-8")
MAIN_PANEL = MAIN_PANEL_PATH.read_text(encoding="utf-8")
WORKFLOW = WORKFLOW_PATH.read_text(encoding="utf-8")
ENTRY = ENTRY_PATH.read_text(encoding="utf-8")
README = README_PATH.read_text(encoding="utf-8")
ARCH = ARCH_PATH.read_text(encoding="utf-8")


def fail(message):
    raise SystemExit("FAIL main-panel-close-lifecycle: " + message)


def require(text, fragment, label):
    if fragment not in text:
        fail("missing %s: %s" % (label, fragment))


version = re.search(r"(?m)^// @version ([0-9]+\.[0-9]+\.[0-9]+)$", SOURCE)
if not version or version.group(1) != "1.0.8":
    fail("expected th_09_animation.js version 1.0.8")

for method in (
    "safeRemoveView",
    "hideMaskIfNoPanelVisible",
    "hideMainPanel",
    "unregisterPanelPredictiveBack",
):
    marker = "FloatBallAppWM.prototype.%s = function" % method
    if SOURCE.count(marker) != 1:
        fail("%s must have exactly one definition" % method)

for marker, label in (
    ("unregisterPanelPredictiveBack = function(panel, resetVisual)", "visual-reset option"),
    ("if (resetVisual !== false)", "conditional visual reset"),
    ("this.hidePanelPredictiveBackIndicator()", "non-reset indicator cleanup"),
    ("safeRemoveView = function(v, whichName, options)", "remove options"),
    ("opts.keepInvisible === true", "invisible removal option"),
    ("opts.resetVisual !== false", "reset option default"),
    ("opts.immediate === true", "immediate removal option"),
    ("v.setVisibility(android.view.View.INVISIBLE)", "pre-remove invisibility"),
    ("v.setAlpha(0)", "pre-remove alpha lock"),
    ("this.unregisterPanelPredictiveBack(v, resetVisual)", "unregister option forwarding"),
    ("this.state.wm.removeViewImmediate(v)", "immediate WindowManager removal"),
    ("hideMaskIfNoPanelVisible", "conditional mask cleanup"),
    ("mainPanelExitGeneration", "exit generation"),
    ("var finished = false", "idempotent finish guard"),
    ("if (finished) return", "duplicate callback guard"),
    ("isLatest = Number(self.state.mainPanelExitGeneration || 0) === generation", "latest generation check"),
    ("isCurrent = self.state.panel === panel", "panel identity check"),
    ('self.safeRemoveView(panel, "panel", {', "captured panel removal"),
    ("immediate: true", "main panel immediate removal"),
    ("resetVisual: false", "main panel no visual reset"),
    ("keepInvisible: true", "main panel remains invisible"),
    ("if (isCurrent && isLatest)", "state clear isolation"),
    ("if (isLatest)", "latest-only shared cleanup"),
    ("self.hideMaskIfNoPanelVisible()", "conditional mask invocation"),
):
    require(SOURCE, marker, label)

hide_start = SOURCE.find(
    "FloatBallAppWM.prototype.hideMainPanel = function(immediate)"
)
hide_end = SOURCE.find(
    "FloatBallAppWM.prototype.hideSettingsPanel = function",
    hide_start,
)
if hide_start < 0 or hide_end <= hide_start:
    fail("cannot isolate hideMainPanel")
hide_source = SOURCE[hide_start:hide_end]

if "if (self.state.panel !== panel) return;" in hide_source:
    fail("old panel identity early-return is still present")

remove_pos = hide_source.find('self.safeRemoveView(panel, "panel", {')
clear_pos = hide_source.find("self.state.panel = null")
if remove_pos < 0 or clear_pos < 0 or remove_pos > clear_pos:
    fail("captured View must be removed before current-state clearing")

safe_start = SOURCE.find(
    "FloatBallAppWM.prototype.safeRemoveView = function"
)
safe_end = SOURCE.find(
    "FloatBallAppWM.prototype.hideMask = function",
    safe_start,
)
if safe_start < 0 or safe_end <= safe_start:
    fail("cannot isolate safeRemoveView")
safe_source = SOURCE[safe_start:safe_end]

invisible_pos = safe_source.find(
    "v.setVisibility(android.view.View.INVISIBLE)"
)
unregister_pos = safe_source.find(
    "this.unregisterPanelPredictiveBack(v, resetVisual)"
)
remove_immediate_pos = safe_source.find(
    "this.state.wm.removeViewImmediate(v)"
)
if not (
    0 <= invisible_pos < unregister_pos < remove_immediate_pos
):
    fail("required order is invisible -> unregister without reset -> immediate remove")

if 'version.group(1) != "1.5.8"' not in (
    ROOT / "scripts" / "verify_main_panel_paging.py"
).read_text(encoding="utf-8"):
    fail("main panel paging verifier version changed unexpectedly")

require(MAIN_PANEL, "// @version 1.5.8", "unchanged main panel module version")
require(WORKFLOW, "python3 scripts/verify_main_panel_close_lifecycle.py", "workflow close verification")
require(ENTRY, "var TOOLHUB_ENTRY_VERSION = 20260714081104;", "unchanged entry version")
require(README, "关闭闪烁", "README close lifecycle note")
require(ARCH, "退出动画", "architecture close lifecycle note")

raw = MODULE_PATH.read_bytes()
if not raw.endswith(b"\n") or raw.endswith(b"\n\n"):
    fail("module EOF must be exactly one LF")

print(
    "OK main_panel_close_lifecycle "
    "visual_reset=skipped immediate_remove=1 generation=guarded mask=conditional"
)
