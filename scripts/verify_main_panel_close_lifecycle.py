#!/usr/bin/env python3
# 验证主面板稳定显示、mask 生命周期、退出清理与 WindowManager 移除顺序。

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "code" / "th_09_animation.js"
MAIN_PANEL_PATH = ROOT / "code" / "th_15_main_panel.js"
EXTRA_PATH = ROOT / "code" / "th_15_extra.js"
WORKFLOW_PATH = ROOT / ".github" / "workflows" / "verify.yml"
ENTRY_PATH = ROOT / "ToolHub.js"
README_PATH = ROOT / "README.md"
ARCH_PATH = ROOT / "docs/ARCHITECTURE.md"

SOURCE = MODULE_PATH.read_text(encoding="utf-8")
MAIN_PANEL = MAIN_PANEL_PATH.read_text(encoding="utf-8")
EXTRA = EXTRA_PATH.read_text(encoding="utf-8")
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
if not version:
    fail("th_09_animation.js version marker missing")
actual_version = tuple(int(part) for part in version.group(1).split("."))
if actual_version < (1, 0, 12):
    fail("expected th_09_animation.js version >= 1.0.12, actual %s" % version.group(1))

extra_version = re.search(r"(?m)^// @version ([0-9]+\.[0-9]+\.[0-9]+)$", EXTRA)
if not extra_version:
    fail("th_15_extra.js version marker missing")
actual_extra_version = tuple(int(part) for part in extra_version.group(1).split("."))
if actual_extra_version < (1, 1, 21):
    fail("expected th_15_extra.js version >= 1.1.21, actual %s" % extra_version.group(1))

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
    ('self.hideMaskIfNoPanelVisible("main_panel_exit")', "conditional mask invocation"),
):
    require(SOURCE, marker, label)

for marker, label in (
    ("showMask = function(options)", "mask preparation options"),
    ("opts.hidden === true", "hidden mask preparation"),
    ("mask.setAlpha(0)", "mask alpha prepared before add"),
    ("mask.setVisibility(android.view.View.INVISIBLE)", "mask invisible preparation"),
    ("this.state.wm.addView(mask, lp)", "mask WindowManager add"),
    ("maskGeneration", "mask generation identity"),
    ("expectedMask && expectedMask !== mask", "mask View identity guard"),
    ("Number(expectedGeneration) !== generation", "mask generation guard"),
    ('this.safeRemoveView(mask, "mask", {', "captured mask removal"),
    ("immediate: true", "mask immediate removal"),
    ("keepInvisible: true", "mask invisible removal"),
    ("resetVisual: false", "mask no visual reset"),
    ("this.state.addedViewer === true", "ToolApp viewer presence guard"),
    ("__viewer !== null && __viewer !== undefined", "non-null viewer identity"),
):
    require(SOURCE, marker, label)

for marker, label in (
    ('var __stableOverlayRoot = __toolAppPanel || String(which || "") === "main"', "stable main overlay root"),
    ("main panel visual prepared alpha=1 scale=1 beforeAdd=true", "main pre-add visual log"),
    ("return false;", "addPanel failure result"),
    ("return true;", "addPanel success result"),
    ("hidden: true", "hidden main mask request"),
    ('reason: "main_panel_prepare"', "main mask preparation reason"),
    ("var addOk = self.addPanel(panelView, pos.x, pos.y, which) === true", "panel add result"),
    ("preparedMask.mask.setAlpha(1)", "mask reveal alpha"),
    ("preparedMask.mask.setVisibility(android.view.View.VISIBLE)", "mask reveal visibility"),
    ("mask reveal reason=main_panel_added", "mask reveal log"),
    ("main_panel_add_failed", "mask rollback on add failure"),
):
    require(EXTRA, marker, label)

show_start = EXTRA.find("FloatBallAppWM.prototype.showPanelAvoidBall = function(which)")
show_end = EXTRA.find("// =======================【辅助：包装可拖拽面板】", show_start)
if show_start < 0 or show_end <= show_start:
    fail("cannot isolate showPanelAvoidBall")
show_source = EXTRA[show_start:show_end]
build_pos = show_source.find('panelStage("PANEL_BUILD_CALL_BEGIN"')
main_mask_pos = show_source.find('reason: "main_panel_prepare"')
add_pos = show_source.find("var addOk = self.addPanel")
reveal_pos = show_source.find("preparedMask.mask.setVisibility(android.view.View.VISIBLE)")
if not (0 <= build_pos < main_mask_pos < add_pos < reveal_pos):
    fail("main open order must be build/layout -> hidden mask -> panel add -> mask reveal")

add_start = EXTRA.find("FloatBallAppWM.prototype.addPanel = function(panel, x, y, which)")
add_end = EXTRA.find("// =======================【设置类 UI：App 页面栈实验框架】", add_start)
if add_start < 0 or add_end <= add_start:
    fail("cannot isolate addPanel")
add_source = EXTRA[add_start:add_end]
visual_pos = add_source.find("main panel visual prepared alpha=1 scale=1 beforeAdd=true")
window_add_pos = add_source.find("this.state.wm.addView(panel, lp)")
if not (0 <= visual_pos < window_add_pos):
    fail("main panel stable alpha/scale must be applied before addView")
if "animateMainPanelEnter(panel" in add_source:
    fail("main panel root enter animation call must be removed from addPanel")

show_mask_start = SOURCE.find("FloatBallAppWM.prototype.showMask = function(options)")
show_mask_end = SOURCE.find("FloatBallAppWM.prototype.undockToFull", show_mask_start)
if show_mask_start < 0 or show_mask_end <= show_mask_start:
    fail("cannot isolate showMask")
show_mask_source = SOURCE[show_mask_start:show_mask_end]
hidden_alpha_pos = show_mask_source.find("mask.setAlpha(0)")
hidden_visibility_pos = show_mask_source.find("mask.setVisibility(android.view.View.INVISIBLE)")
mask_add_pos = show_mask_source.find("this.state.wm.addView(mask, lp)")
if not (0 <= hidden_alpha_pos < mask_add_pos and 0 <= hidden_visibility_pos < mask_add_pos):
    fail("mask alpha and visibility must be initialized before addView")

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
require(ENTRY, "var TOOLHUB_ENTRY_VERSION = 20260721201500;", "current entry version")
require(README, "关闭闪烁", "README close lifecycle note")
require(ARCH, "退出动画", "architecture close lifecycle note")

raw = MODULE_PATH.read_bytes()
if not raw.endswith(b"\n") or raw.endswith(b"\n\n"):
    fail("module EOF must be exactly one LF")

print(
    "OK main_panel_close_lifecycle "
    "open=stable mask=identity_guarded reveal=after_panel immediate_remove=1 exit_generation=guarded"
)
