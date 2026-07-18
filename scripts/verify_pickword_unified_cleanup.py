#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / "code" / "th_20_pickword.js").read_text(encoding="utf-8")


def require(condition, message):
    if not condition:
        raise SystemExit(message)


require(source.startswith("// @version 1.0.17\n"), "pickword module version must be 1.0.17")
require("CANVAS_DRAG_VISIBLE_LINE_BUFFER: 8" in source, "drag visible-line buffer config missing")
require("CANVAS_DRAG_HIGHLIGHT_INTERVAL_MS: 40" in source, "drag highlight interval config missing")
require("parseInt(String(DIY_CONFIG.CANVAS_DRAG_VISIBLE_LINE_BUFFER), 10)" in source, "drag buffer is not consumed")
require("parseInt(String(DIY_CONFIG.CANVAS_DRAG_HIGHLIGHT_INTERVAL_MS), 10)" in source, "drag interval is not consumed")
require("var dragUpdateScheduled = false;" in source, "drag update boolean state missing")
require("mainHandler.removeCallbacks(dragUpdateProcessor)" in source, "drag runnable cancellation missing")
require("mainHandler.removeCallbacks(dragUpdateScheduled)" not in source, "boolean passed to removeCallbacks")

main_start = source.find("    function cancelMainPickwordCallbacks20() {")
main_end = source.find("    function cancelPinPickwordCallbacks20() {", main_start)
require(main_start >= 0 and main_end > main_start, "main callback cleanup helper missing")
main_block = source[main_start:main_end]
require("pinBatchLoadRunnable" not in main_block and "pinLoadToken" not in main_block, "main hide must not cancel pin loading")
require("dragUpdateProcessor" in main_block, "main cleanup must cancel drag processor")
require("isAutoScrolling = false;" in main_block, "main cleanup must stop auto-scroll state")

pin_start = main_end
pin_end = source.find("    function clearMainPickwordViewRefs20() {", pin_start)
require(pin_end > pin_start, "pin callback cleanup helper missing")
pin_block = source[pin_start:pin_end]
require("pinBatchLoadRunnable" in pin_block and "pinLoadToken++" in pin_block, "pin batch cancellation boundary changed")

hide_start = source.find("        hide: function() {")
hide_end = source.find("        resetTextLoadState: function", hide_start)
require(hide_start >= 0 and hide_end > hide_start, "hide block missing")
hide_block = source[hide_start:hide_end]
require("if (mainLayout !== targetLayout) return;" in hide_block, "stale hide guard missing")
require("removeMainPickwordWindowNow20();" in hide_block, "hide does not use unified main cleanup")

reset_start = source.find("        resetSessionState: function(text) {")
reset_end = source.find("        show: function(text, meta) {", reset_start)
require(reset_start >= 0 and reset_end > reset_start, "resetSessionState block missing")
reset_block = source[reset_start:reset_end]
require("cancelMainPickwordCallbacks20();" in reset_block, "new session must cancel previous main callbacks")
require(reset_block.find("cancelMainPickwordCallbacks20();") < reset_block.find("this.resetTextLoadState"), "callback cancellation must precede text reset")

dispose_start = source.find("            proto.disposePickwordModule = function(reason) {")
dispose_end = source.find("            proto.testPickwordTranslateConfiguration", dispose_start)
require(dispose_start >= 0 and dispose_end > dispose_start, "dispose block missing")
dispose_block = source[dispose_start:dispose_end]
require("removeMainPickwordWindowNow20();" in dispose_block, "dispose does not synchronously remove main window")
require("拾字Floaty.hide();" not in dispose_block, "dispose must not enqueue async hide")
require("拾字Floaty.removePinnedTextWindow();" in dispose_block, "dispose must remove pin window")

for marker in (
    "previewRemoveSpaceBtn", "previewRemoveNewlineBtn", "previewEditBtn",
    "updateCleanButtons", "updateCleanButtonView", "createMiniHeaderBtn",
    "replaceSelectedText", "getTransformLabel", "keepAliveTimer",
    "fontSizeDropdownView", "applyButtonAnimation", "animateWindowEnter",
    "animatePickwordMainEnter", "maxWindowHeight", "TEXT_AREA_HEIGHT_DP",
    "touchDownRawX", "touchDownRawY", "lastTouchRawX", "lastTouchRawY",
    "useCachedLayout", "FINGER_PREVIEW_CONTENT_INTERVAL",
    "fingerPreviewLastContentUpdateTime", "pendingDragUpdate",
):
    require(marker not in source, "legacy marker remains: " + marker)

require(source.count("new View.OnLongClickListener({") == 2, "API 34 long-click listener count changed")
require(source.count("onLongClickUseDefaultHapticFeedback: function(v)") == 2, "API 34 callback missing")
require("appContext.startActivity(chooser);\n                this.hide();" in source, "share-close ordering changed")
require("stabilizePickwordOverlayView20(mainLayout);" in source, "main overlay stabilization missing")
require("stabilizePickwordOverlayView20(pinLayout);" in source, "pin overlay stabilization missing")
require("var MIN_FONT_SIZE = 12;" in source and "var MAX_FONT_SIZE = 32;" in source, "legacy font value compatibility removed")

print("OK pickword unified cleanup boundaries verified")
