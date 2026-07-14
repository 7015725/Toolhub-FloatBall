#!/usr/bin/env python3
# 验证主按钮面板第三阶段拖动排序、临时副本和事务保存约束。

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "code" / "th_15_main_panel.js"
WORKFLOW_PATH = ROOT / ".github" / "workflows" / "verify.yml"
RUNTIME_VERIFY_PATH = ROOT / "scripts" / "verify_main_panel_runtime_status.py"
ENTRY_PATH = ROOT / "ToolHub.js"
DOC_PATHS = (
    ROOT / "README.md",
    ROOT / "ARCHITECTURE.md",
    ROOT / "STRUCTURE.md",
)

SOURCE = MODULE_PATH.read_text(encoding="utf-8")
WORKFLOW = WORKFLOW_PATH.read_text(encoding="utf-8")
RUNTIME_VERIFY = RUNTIME_VERIFY_PATH.read_text(encoding="utf-8")
ENTRY = ENTRY_PATH.read_text(encoding="utf-8")


def fail(message):
    raise SystemExit("FAIL main-panel-drag-sort: " + message)


def require(text, fragment, label):
    if fragment not in text:
        fail("missing %s: %s" % (label, fragment))


def forbid(text, fragment, label):
    if fragment in text:
        fail("forbidden %s: %s" % (label, fragment))


version = re.search(r"(?m)^// @version ([0-9]+\.[0-9]+\.[0-9]+)$", SOURCE)
if not version or version.group(1) != "1.3.0":
    fail("expected th_15_main_panel.js version 1.3.0")

methods = (
    "isMainPanelEditMode",
    "getMainPanelEditPermutationSignature",
    "cloneMainPanelButtonsForEdit",
    "clearMainPanelEditState",
    "rebuildMainPanelForEditMode",
    "startMainPanelEditMode",
    "cancelMainPanelEditMode",
    "saveMainPanelEditMode",
    "handleMainPanelEditPanelDetached",
    "buildMainPanelRenderItems",
    "getMainPanelEditVisibleSlots",
    "reorderMainPanelEditItems",
    "findMainPanelDragTargetIndex",
    "applyMainPanelEditDragVisual",
    "updateMainPanelEditDropTarget",
    "clearMainPanelEditDropTarget",
    "autoScrollMainPanelEdit",
    "postMainPanelEditGridRender",
)
for method in methods:
    marker = "FloatBallAppWM.prototype.%s = function" % method
    if SOURCE.count(marker) != 1:
        fail("%s must have exactly one definition" % method)

for marker, label in (
    ("JSON.parse(JSON.stringify(source))", "temporary clone"),
    ("mainPanelEditOriginalSignature", "original permutation signature"),
    ("parts.sort()", "order-independent signature"),
    ("editedSignature !== originalSignature", "save permutation guard"),
    ("ConfigManager.saveButtons(savedButtons)", "existing button persistence entry"),
    ("this.panels.main = savedButtons", "in-memory panel commit"),
    ("this.clearMainPanelEditState('cancel')", "cancel discard"),
    ("this.clearMainPanelEditState('panel_detached')", "detach discard"),
    ("mainPanelEditPreserveDetachPanel", "rebuild detach preservation"),
    ("b.enabled === false", "disabled button exclusion"),
    ("String(b.id || '') === 'builtin_settings'", "built-in settings exclusion"),
    ("if (editMode === true)", "edit-only render branch"),
    ("if (!editMode) {", "normal add-card branch"),
    ("slots.sort(function(a, b) { return a - b; });", "fixed visible slots"),
    ("raw[slots[i]] = items[i].config", "hidden slot preservation"),
    ("items.splice(from, 1)", "drag move removal"),
    ("items.splice(to, 0, moved)", "drag move insertion"),
    ("requestDisallowInterceptTouchEvent(true)", "drag intercept lock"),
    ("android.view.MotionEvent.ACTION_MOVE", "drag move event"),
    ("android.view.MotionEvent.ACTION_UP", "drag drop event"),
    ("android.view.MotionEvent.ACTION_CANCEL", "drag cancel event"),
    ("android.view.HapticFeedbackConstants.LONG_PRESS", "drag haptic"),
    ("findMainPanelDragTargetIndex", "drop target hit testing"),
    ("autoScrollMainPanelEdit", "edge auto scroll"),
    ("postMainPanelEditGridRender", "post-event grid rerender"),
    ("'取消排序'", "cancel toolbar action"),
    ("'保存排序'", "save toolbar action"),
    ("self.startMainPanelEditMode()", "edit toolbar entry"),
    ("self.execButtonAction(item.config, item.rawIndex)", "normal button action retained"),
    ("'拖动调整顺序：'", "accessibility drag description"),
):
    require(SOURCE, marker, label)

if SOURCE.count("ConfigManager.saveButtons(savedButtons)") != 1:
    fail("saveButtons must be called exactly once")

reorder_start = SOURCE.find("FloatBallAppWM.prototype.reorderMainPanelEditItems = function")
reorder_end = SOURCE.find("FloatBallAppWM.prototype.findMainPanelDragTargetIndex = function")
if reorder_start < 0 or reorder_end <= reorder_start:
    fail("cannot isolate reorder method")
if "saveButtons" in SOURCE[reorder_start:reorder_end]:
    fail("drag move must not persist buttons")

forbid(SOURCE, "SQLiteDatabase", "direct SQLite access")
forbid(SOURCE, "execSQL(", "direct SQL write")
forbid(SOURCE, "FileIO.writeText", "direct file persistence")
forbid(SOURCE, "setInterval(", "unmanaged drag timer")
forbid(SOURCE, "new java.lang.Thread", "dedicated drag thread")

require(RUNTIME_VERIFY, 'version.group(1) != "1.3.0"', "runtime verifier current version")
require(WORKFLOW, "python3 scripts/verify_main_panel_drag_sort.py", "workflow drag-sort verification")
require(ENTRY, "var TOOLHUB_ENTRY_VERSION = 20260714081104;", "unchanged entry version")

for path in DOC_PATHS:
    text = path.read_text(encoding="utf-8")
    require(text, "拖动排序", path.name + " drag-sort documentation")

raw = MODULE_PATH.read_bytes()
if not raw.endswith(b"\n") or raw.endswith(b"\n\n"):
    fail("module EOF must be exactly one LF")

# Model the production slot-preserving algorithm:
# enabled buttons occupy slots 0/2/4; hidden and built-in entries remain in slots 1/3.
raw_model = ["A", "disabled", "B", "settings", "C"]
visible = ["A", "B", "C"]
slots = [0, 2, 4]
moved = visible.pop(0)
visible.insert(2, moved)
for index, slot in enumerate(slots):
    raw_model[slot] = visible[index]
if raw_model != ["B", "disabled", "C", "settings", "A"]:
    fail("slot-preserving reorder model failed")

print("OK main_panel_drag_sort methods=%d save_calls=1 visible_slots=preserved" % len(methods))
