#!/usr/bin/env python3
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "code" / "th_20_pickword.js"
LONG_CLICK_VERIFY = ROOT / "scripts" / "verify_pickword_long_click_api34.py"
VERIFY_WORKFLOW = ROOT / ".github" / "workflows" / "verify.yml"
NEW_VERIFY = ROOT / "scripts" / "verify_pickword_unified_cleanup.py"
RECORD = ROOT / "updates" / "records" / "optimize-pickword-unified-cleanup.json"

text = SOURCE.read_text(encoding="utf-8")


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s: expected 1 occurrence, found %d" % (label, count))
    text = text.replace(old, new, 1)


def sub_once(pattern, repl, label, flags=re.S):
    global text
    text, count = re.subn(pattern, repl, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit("%s: expected 1 regex match, found %d" % (label, count))


replace_once("// @version 1.0.12\n", "// @version 1.0.13\n", "module version")

replace_once(
    """        // 长按拖选 + 放大镜期间的可见行缓冲。数值越小越流畅，太小可能边缘高亮不够及时。\n        // 建议 4~12；当前 8 是流畅性和显示稳定性的折中值。\n        CANVAS_DRAG_HIGHLIGHT_INTERVAL_MS: 40,\n""",
    """        // 长按拖选 + 放大镜期间，只绘制可见区域上下各 N 行。\n        // 建议 4~12；当前 8 是流畅性和显示稳定性的折中值。\n        CANVAS_DRAG_VISIBLE_LINE_BUFFER: 8,\n\n        // 长按拖选期间选区高亮刷新节流(ms)。数值越小反馈越及时，CPU 与重绘压力也越高。\n        // 建议 24~48；当前 40ms 优先保证 system_server 稳定。\n        CANVAS_DRAG_HIGHLIGHT_INTERVAL_MS: 40,\n""",
    "split drag buffer and interval config",
)

sub_once(
    r"\n        // 主文本区最大高度\(dp\)。.*?\n        TEXT_AREA_HEIGHT_DP: 320,\n",
    "\n",
    "remove overridden text area config",
)

for old, label in (
    ("    var Button = android.widget.Button;\n", "unused Button alias"),
    ("    var ColorStateList = android.content.res.ColorStateList;\n", "unused ColorStateList alias"),
    ("    var keepAliveTimer = null;\n", "obsolete keepalive state"),
    ("    var previewRemoveSpaceBtn = null;\n", "legacy preview space button"),
    ("    var previewRemoveNewlineBtn = null;\n", "legacy preview newline button"),
    ("    var previewEditBtn = null;\n", "legacy preview edit button"),
    ("    var fontSizeDropdownView = null;\n", "duplicate dropdown reference"),
    ("    var touchDownRawX = 0;\n", "unused touchDownRawX"),
    ("    var touchDownRawY = 0;\n", "unused touchDownRawY"),
    ("    var lastTouchRawX = 0;\n", "unused lastTouchRawX"),
    ("    var lastTouchRawY = 0;\n", "unused lastTouchRawY"),
    ("    var fingerPreviewLastContentUpdateTime = 0;\n", "unused magnifier content timestamp"),
    ("    var maxWindowHeight = 0;\n", "unused maxWindowHeight"),
    ("    var screenCategory = \"phone\";\n", "unused screenCategory"),
):
    replace_once(old, "", label)

sub_once(
    r"\n    // 放大镜内容/选中态刷新间隔\(ms\).*?\n    var FINGER_PREVIEW_CONTENT_INTERVAL = 24;\n",
    "\n",
    "remove ineffective magnifier content interval",
)

replace_once("    var pendingDragUpdate = null;\n", "    var dragUpdateScheduled = false;\n", "drag update flag declaration")
text = text.replace("pendingDragUpdate", "dragUpdateScheduled")
text = text.replace("dragUpdateScheduled = null;", "dragUpdateScheduled = false;")

sub_once(
    r"    function detectScreenSize\(\) \{.*?\n    \}\n\n    function createRoundRectDrawable",
    """    function detectScreenSize() {\n        try {\n            var wm = appContext.getSystemService(appContext.WINDOW_SERVICE);\n            var display = wm.getDefaultDisplay();\n            var metrics = new android.util.DisplayMetrics();\n            display.getMetrics(metrics);\n\n            screenWidth = metrics.widthPixels;\n            screenHeight = metrics.heightPixels;\n            var widthDp = screenWidth / metrics.density;\n            var heightDp = screenHeight / metrics.density;\n            var smallestWidth = Math.min(widthDp, heightDp);\n            var shortestPx = Math.min(screenWidth, screenHeight);\n            isTablet = smallestWidth >= 600;\n\n            if (isTablet) uiScale = smallestWidth >= 900 ? 1.28 : 1.16;\n            else if (smallestWidth <= 360 || shortestPx <= 720) uiScale = 0.92;\n            else if (smallestWidth >= 480) uiScale = 1.08;\n            else uiScale = 1.0;\n        } catch (e) {\n            screenWidth = Math.round(dp(360));\n            screenHeight = Math.round(dp(720));\n            isTablet = false;\n            uiScale = 1.0;\n        }\n    }\n\n    function createRoundRectDrawable""",
    "simplify display profile detection",
)

replace_once(
    "    // 字号范围：设置面板里的滑块上下限。调太小不易点选，调太大容易增加排版高度。\n",
    "    // 字号兼容范围：继续接受旧版本已保存的 12~32sp 数值；当前 UI 使用四档字号菜单。\n",
    "font size compatibility comment",
)
replace_once(
    "    var DEFAULT_FONT_SIZE = 20;      // 默认字号；首次使用或读取失败时采用此值，后续会记住用户滑块选择。\n",
    "    var DEFAULT_FONT_SIZE = 20;      // 默认字号；首次使用或读取失败时采用此值，后续会记住用户选择。\n",
    "default font comment",
)
replace_once(
    "            // 原字号滑杆按钮入口暂时屏蔽；当前入口只打开四档字号下拉菜单。\n",
    "            // 点击打开小、中、大、超大四档字号菜单。\n",
    "font dropdown comment",
)

replace_once(
    "        function pushLine(start, end, xs, widthValue, topValue) {\n",
    "        function pushLine(start, end, xs, topValue) {\n",
    "remove line width parameter",
)
replace_once("                width: widthValue,\n", "", "remove unused line width field")
for old, new, label in (
    ("                pushLine(0, 0, [0], 0, y);", "                pushLine(0, 0, [0], y);", "empty line push"),
    ("                    pushLine(lineStart, i, xs, lineX, y);", "                    pushLine(lineStart, i, xs, y);", "newline push"),
    ("                    pushLine(lineStart, i, xs, lineX, y);", "                    pushLine(lineStart, i, xs, y);", "wrap push"),
    ("            pushLine(lineStart, len, xs, lineX, y);", "            pushLine(lineStart, len, xs, y);", "final line push"),
):
    replace_once(old, new, label)

sub_once(
    r"\n            getLineCount: function\(\) \{.*?\n            \},",
    "",
    "remove unused getLineCount API",
)
sub_once(
    r"\n            invalidate: function\(\) \{.*?\n            \},\n            requestLayout: function\(\) \{.*?\n            \}\n",
    "\n",
    "remove unused invalidate and requestLayout APIs",
)

sub_once(
    r"    // 钉屏与拾字根窗口均静态显示，避免透明 Overlay 属性动画。.*?\n    function hapticFeedback\(view\) \{",
    """    // 拾字主窗口与钉屏窗口均静态显示，避免透明 Overlay 属性动画和 Surface 闪烁。\n    function stabilizePickwordOverlayView20(view) {\n        if (!view) return;\n        try { view.animate().cancel(); } catch (eCancel) {}\n        try { view.clearAnimation(); } catch (eClear) {}\n        try {\n            view.setVisibility(View.VISIBLE);\n            view.setAlpha(1);\n            view.setScaleX(1);\n            view.setScaleY(1);\n            view.setTranslationY(0);\n        } catch (eStable) {}\n    }\n\n    function hapticFeedback(view) {""",
    "merge overlay stabilization functions",
)
text = text.replace("animateWindowEnter(", "stabilizePickwordOverlayView20(")
text = text.replace("animatePickwordMainEnter(", "stabilizePickwordOverlayView20(")
text = re.sub(r"^\s*applyButtonAnimation\([^\n]+\);\n", "", text, flags=re.M)

sub_once(
    r"\n        createMiniHeaderBtn: function\(textValue, callback\) \{.*?\n        \},",
    "",
    "remove unused createMiniHeaderBtn",
)
sub_once(
    r"\n        replaceSelectedText: function\(newText\) \{.*?\n        \},",
    "",
    "remove unused replaceSelectedText",
)
sub_once(
    r"\n        getTransformLabel: function\(mode\) \{.*?\n        \},",
    "",
    "remove unused transform label helper",
)
text = re.sub(r"^\s*var label = this\.getTransformLabel\(mode\);\n", "", text, flags=re.M)

text = re.sub(r"^\s*fontSizeDropdownView = card;\n", "", text, flags=re.M)
text = re.sub(r"^\s*fontSizeDropdownView = null;\n", "", text, flags=re.M)
replace_once(
    "                var content = this.createFontSizeDropdown();\n                refreshFontSizeDropdown20();\n",
    "                var content = this.createFontSizeDropdown();\n",
    "remove duplicate dropdown refresh",
)
replace_once(
    "                    if (fontSizePopupWindow === popup) fontSizePopupWindow = null;\n",
    "",
    "remove duplicate popup null assignment",
)

sub_once(
    r"\n        updateCleanButtons: function\(\) \{.*?\n        isCleanUndoTarget: function",
    "\n        isCleanUndoTarget: function",
    "remove legacy clean button update chain",
)
text = re.sub(r"^\s*(?:this|self)\.updateCleanButtons\(\);\n", "", text, flags=re.M)

sub_once(
    r"\n        ensureKeepAlive: function\(\) \{.*?\n        cancelPinnedTextBatchLoad: function\(\) \{",
    "\n        cancelPinnedTextBatchLoad: function() {",
    "remove obsolete keepalive methods",
)
text = re.sub(r"^\s*self\.ensureKeepAlive\(\);\n", "", text, flags=re.M)
text = re.sub(r"^\s*this\.releaseKeepAliveIfIdle\(\);\n", "", text, flags=re.M)

# Raw screen coordinates are no longer consumed by Magnifier; use Canvas-local coordinates only.
replace_once(
    "                    var action = event.getAction(); var x = event.getX(); var y = event.getY();\n                    var rawX = event.getRawX(); var rawY = event.getRawY();\n",
    "                    var action = event.getAction(); var x = event.getX(); var y = event.getY();\n",
    "remove unused raw event coordinates",
)
replace_once(
    "                            touchDownTime = Date.now(); touchDownX = x; touchDownY = y; touchDownRawX = rawX; touchDownRawY = rawY;\n                            lastTouchX = x; lastTouchY = y; lastTouchRawX = rawX; lastTouchRawY = rawY;\n",
    "                            touchDownTime = Date.now(); touchDownX = x; touchDownY = y;\n                            lastTouchX = x; lastTouchY = y;\n",
    "simplify touch down state",
)
replace_once(
    "                                        self.showFingerPreview(touchDownRawX, touchDownRawY, dragStartIndex);\n",
    "                                        self.showFingerPreview(dragStartIndex);\n",
    "simplify initial magnifier call",
)
replace_once(
    "                            lastTouchX = x; lastTouchY = y; lastTouchRawX = rawX; lastTouchRawY = rawY;\n",
    "                            lastTouchX = x; lastTouchY = y;\n",
    "simplify move state",
)
replace_once(
    "                                self.updateFingerPreview(rawX, rawY, moveIndex, false);\n",
    "                                self.updateFingerPreview(moveIndex, false);\n",
    "simplify move magnifier call",
)
replace_once(
    "                            lastTouchX = 0; lastTouchY = 0; lastTouchRawX = 0; lastTouchRawY = 0;\n",
    "                            lastTouchX = 0; lastTouchY = 0;\n",
    "simplify touch end state",
)
replace_once(
    "                            self.updateFingerPreview(lastTouchRawX, lastTouchRawY, moveIndex, false);\n",
    "                            self.updateFingerPreview(moveIndex, false);\n",
    "simplify auto-scroll magnifier call",
)
replace_once(
    "        getCharIndexAtPosition: function(x, y, useCachedLayout) {\n",
    "        getCharIndexAtPosition: function(x, y) {\n",
    "remove unused cached-layout parameter",
)

replace_once(
    "        showFingerPreview: function(rawX, rawY, index) {\n            // 兼容旧调用签名：rawX/rawY/index 目前不直接使用，统一以 lastTouchX/lastTouchY 为准。\n",
    "        showFingerPreview: function(index) {\n",
    "simplify showFingerPreview signature",
)
replace_once(
    "                fingerPreviewLastShownX = sx;\n                fingerPreviewLastShownY = sy;\n",
    "                fingerPreviewLastShownX = sx;\n                fingerPreviewLastShownY = sy;\n                fingerPreviewLastIndex = index;\n",
    "record initial magnifier index",
)
replace_once(
    "        updateFingerPreview: function(rawX, rawY, index, force) {\n            // 兼容旧调用签名：rawX/rawY 目前不直接使用，坐标统一取 lastTouchX/lastTouchY。\n",
    "        updateFingerPreview: function(index, force) {\n",
    "simplify updateFingerPreview signature",
)
sub_once(
    r"\n                if \(force \|\| index !== fingerPreviewLastIndex \|\| now - fingerPreviewLastContentUpdateTime >= FINGER_PREVIEW_CONTENT_INTERVAL\) \{\n                    fingerPreviewLastIndex = index;\n                    fingerPreviewLastContentUpdateTime = now;\n                \}",
    "\n                fingerPreviewLastIndex = index;",
    "remove ineffective magnifier content interval state",
)
text = re.sub(r"^\s*fingerPreviewLastContentUpdateTime = 0;\n", "", text, flags=re.M)

# Fix drag update cancellation: the state is boolean, the callback is dragUpdateProcessor.
replace_once(
    "        run: function() {\n            dragUpdateScheduled = false;\n",
    "        run: function() {\n            dragUpdateScheduled = false;\n",
    "confirm drag processor flag reset",
)
text = text.replace("mainHandler.removeCallbacks(dragUpdateScheduled)", "mainHandler.removeCallbacks(dragUpdateProcessor)")

# Consolidate per-session reset while preserving current UI behavior.
insert_marker = "        exactScrollY: 0,\n\n        show: function(text) {"
reset_method = """        exactScrollY: 0,\n\n        resetSessionState: function(text) {\n            this.resetTextLoadState((typeof text === 'string') ? text : String(text || \"\"));\n            if (dragUpdateScheduled) {\n                try { mainHandler.removeCallbacks(dragUpdateProcessor); } catch (eDragCancel) {}\n            }\n            dragUpdateScheduled = false;\n            selectedIndices = [];\n            selectedSet = {};\n            previewTextOverride = null;\n            previewSelectionSignature = \"\";\n            cleanUndoStack = [];\n            isDragging = false;\n            dragStartIndex = -1;\n            dragSnapshot = [];\n            dragSnapshotSet = null;\n            dragSnapshotCount = 0;\n            dragStartWasSelected = false;\n            dragPendingDirtyMin = -1;\n            dragPendingDirtyMax = -1;\n            dragSelectionCount = 0;\n            lastDragEnd = -1;\n            lastDragUpdateTime = 0;\n            lastDragVisualMin = -1;\n            lastDragVisualMax = -1;\n            isAutoScrolling = false;\n            lastTouchX = 0;\n            lastTouchY = 0;\n            fingerPreviewLastIndex = -1;\n            fingerPreviewLastUpdateTime = 0;\n            fingerPreviewLastShownX = -99999;\n            fingerPreviewLastShownY = -99999;\n            lastTranslationState = null;\n            this.currentScrollDirection = 0;\n            this.currentScrollSpeed = 0;\n            this.exactScrollY = 0;\n        },\n\n        show: function(text) {"""
replace_once(insert_marker, reset_method, "insert session reset method")

sub_once(
    r"                isShowing = true;\n                this\.resetTextLoadState\(\(typeof text === 'string'\) \? text : String\(text \|\| \"\"\)\);.*?\n\n                loadFontSize\(\);",
    "                isShowing = true;\n                this.resetSessionState(text);\n\n                loadFontSize();",
    "reuse reset state for existing window",
)
sub_once(
    r"            isShowing = true;\n            this\.resetTextLoadState\(\(typeof text === 'string'\) \? text : String\(text \|\| \"\"\)\);.*?\n            this\.currentScrollSpeed = 0;",
    "            isShowing = true;\n            this.resetSessionState(text);",
    "reuse reset state for new window",
)

# Insert lifecycle helpers after the drag update processor.
processor_marker = """    var dragUpdateProcessor = new java.lang.Runnable({\n        run: function() {\n            dragUpdateScheduled = false;\n            var dmin = dragPendingDirtyMin;\n            var dmax = dragPendingDirtyMax;\n            dragPendingDirtyMin = -1;\n            dragPendingDirtyMax = -1;\n            if (dmin < 0 || dmax < 0) {\n                dmin = lastDragVisualMin;\n                dmax = lastDragVisualMax;\n            }\n            lastDragUpdateTime = Date.now();\n            拾字Floaty.updateSelectionSpans(dmin, dmax);\n            拾字Floaty.updatePreviewDuringDrag();\n        }\n    });\n\n"""
helpers = processor_marker + """    function cancelMainPickwordCallbacks20() {\n        try { if (longPressHandler) mainHandler.removeCallbacks(longPressHandler); } catch (e0) {}\n        try { if (autoScrollRunnable) mainHandler.removeCallbacks(autoScrollRunnable); } catch (e1) {}\n        try { if (pendingFullTextRunnable) mainHandler.removeCallbacks(pendingFullTextRunnable); } catch (e2) {}\n        try { if (pendingFingerPreviewWarmupRunnable) mainHandler.removeCallbacks(pendingFingerPreviewWarmupRunnable); } catch (e3) {}\n        try { if (pendingAdjustRunnable) mainHandler.removeCallbacks(pendingAdjustRunnable); } catch (e4) {}\n        try { if (dragUpdateScheduled) mainHandler.removeCallbacks(dragUpdateProcessor); } catch (e5) {}\n        try { 拾字Floaty.stopCanvasScrollRefresh(); } catch (e6) {}\n        longPressHandler = null;\n        autoScrollRunnable = null;\n        pendingFullTextRunnable = null;\n        pendingFingerPreviewWarmupRunnable = null;\n        pendingAdjustRunnable = null;\n        dragUpdateScheduled = false;\n    }\n\n    function cancelPinPickwordCallbacks20() {\n        pinLoadToken++;\n        try { if (pinBatchLoadRunnable) mainHandler.removeCallbacks(pinBatchLoadRunnable); } catch (e0) {}\n        pinBatchLoadRunnable = null;\n    }\n\n    function clearMainPickwordViewRefs20() {\n        mainLayout = null;\n        layoutParams = null;\n        previewBoxView = null;\n        countLabelView = null;\n        copyAllActionBtn = null;\n        cleanupActionBtn = null;\n        shareActionBtn = null;\n        copyActionBtn = null;\n        translateActionBtn = null;\n        selectAllActionBtn = null;\n        clearActionBtn = null;\n        pinActionBtn = null;\n        fontSizeSelectorView = null;\n        fontSizeDropdownCardView = null;\n        fontSizePopupWindow = null;\n        fontSizeOptionViews = [];\n        titleAccentView = null;\n        resultDividerView = null;\n        closeActionView = null;\n        textView = null;\n        textCanvasControl = null;\n        scrollView = null;\n        previewTextView = null;\n    }\n\n    function removeMainPickwordWindowNow20() {\n        cancelMainPickwordCallbacks20();\n        try { 拾字Floaty.removeFingerPreview(); } catch (ePreview) {}\n        try {\n            if (fontSizePopupWindow && fontSizePopupWindow.isShowing()) fontSizePopupWindow.dismiss();\n        } catch (eFontPopup) {}\n        var targetLayout = mainLayout;\n        try {\n            if (windowManager !== null && targetLayout !== null) windowManager.removeView(targetLayout);\n        } catch (eRemove) {\n        } finally {\n            clearMainPickwordViewRefs20();\n            isShowing = false;\n            isDragging = false;\n        }\n        return true;\n    }\n\n"""
replace_once(processor_marker, helpers, "insert lifecycle helpers")

sub_once(
    r"        hide: function\(\) \{.*?\n        resetTextLoadState: function\(text\) \{",
    """        hide: function() {\n            var targetLayout = mainLayout;\n            if (targetLayout === null) {\n                cancelMainPickwordCallbacks20();\n                isShowing = false;\n                return;\n            }\n            runUi(function() {\n                // 防止旧 hide Runnable 误删随后创建的新窗口。\n                if (mainLayout !== targetLayout) return;\n                removeMainPickwordWindowNow20();\n            });\n        },\n\n        resetTextLoadState: function(text) {""",
    "replace main window hide lifecycle",
)

sub_once(
    r"        cancelPinnedTextBatchLoad: function\(\) \{.*?\n        \},",
    """        cancelPinnedTextBatchLoad: function() {\n            cancelPinPickwordCallbacks20();\n        },""",
    "centralize pin callback cancellation",
)

# Remove obsolete global callback cleaner; main and pin cleanup are now separated.
sub_once(
    r"\n    function cancelPickwordCallbacks20\(\) \{.*?\n    \}\n\n    function installPickword20",
    "\n    function installPickword20",
    "remove mixed callback cleanup",
)

sub_once(
    r"                var cleanup = function\(\) \{.*?\n                    return true;\n                \};",
    """                var cleanup = function() {\n                    removeMainPickwordWindowNow20();\n                    try { 拾字Floaty.removePinnedTextWindow(); } catch (ePin) { cancelPinPickwordCallbacks20(); }\n                    isTranslating = false;\n                    return true;\n                };""",
    "replace dispose cleanup",
)

# Remove duplicate main-view cleanup left in dispose if an older formatting variant survived.
for marker in ("cancelPickwordCallbacks20", "拾字Floaty.hide();"):
    if marker in text:
        raise SystemExit("obsolete lifecycle marker remains: " + marker)

# Remove duplicate updates already performed by updateTextView/updatePreview.
text = text.replace(
    "                            self.updateTextView();\n                            self.updateSelectionSpans();\n                            self.adjustScrollViewHeight();\n",
    "                            self.updateTextView();\n                            self.updateSelectionSpans();\n",
)
text = text.replace(
    "                    self.updateTextView();\n                    self.updateSelectionSpans();\n                    self.adjustScrollViewHeight();\n",
    "                    self.updateTextView();\n                    self.updateSelectionSpans();\n",
)
text = text.replace(
    "                        self.updateTextView();\n                        self.updateActionButtons();\n                        self.adjustScrollViewHeight();\n",
    "                        self.updateTextView();\n",
)

# Final source invariants.
for forbidden in (
    "previewRemoveSpaceBtn", "previewRemoveNewlineBtn", "previewEditBtn",
    "updateCleanButtons", "updateCleanButtonView", "createMiniHeaderBtn",
    "replaceSelectedText", "getTransformLabel", "keepAliveTimer",
    "fontSizeDropdownView", "applyButtonAnimation", "animateWindowEnter",
    "animatePickwordMainEnter", "maxWindowHeight", "TEXT_AREA_HEIGHT_DP",
    "touchDownRawX", "touchDownRawY", "lastTouchRawX", "lastTouchRawY",
    "useCachedLayout", "FINGER_PREVIEW_CONTENT_INTERVAL",
    "fingerPreviewLastContentUpdateTime", "pendingDragUpdate",
):
    if forbidden in text:
        raise SystemExit("forbidden legacy marker remains: " + forbidden)

required = (
    "CANVAS_DRAG_VISIBLE_LINE_BUFFER: 8",
    "CANVAS_DRAG_HIGHLIGHT_INTERVAL_MS: 40",
    "mainHandler.removeCallbacks(dragUpdateProcessor)",
    "function cancelMainPickwordCallbacks20()",
    "function cancelPinPickwordCallbacks20()",
    "function removeMainPickwordWindowNow20()",
    "if (mainLayout !== targetLayout) return;",
    "stabilizePickwordOverlayView20(mainLayout);",
    "stabilizePickwordOverlayView20(pinLayout);",
    "appContext.startActivity(chooser);\n                this.hide();",
)
for marker in required:
    if marker not in text:
        raise SystemExit("required boundary marker missing: " + marker)

SOURCE.write_text(text, encoding="utf-8")

long_click = LONG_CLICK_VERIFY.read_text(encoding="utf-8")
if "1.0.12" not in long_click:
    raise SystemExit("long-click verifier version marker missing")
long_click = long_click.replace("1.0.12", "1.0.13")
LONG_CLICK_VERIFY.write_text(long_click, encoding="utf-8")

verify_text = r'''#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / "code" / "th_20_pickword.js").read_text(encoding="utf-8")


def require(condition, message):
    if not condition:
        raise SystemExit(message)


require(source.startswith("// @version 1.0.13\n"), "pickword module version must be 1.0.13")
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
'''
NEW_VERIFY.write_text(verify_text, encoding="utf-8")

workflow = VERIFY_WORKFLOW.read_text(encoding="utf-8")
needle = "            python3 scripts/verify_pickword_share_close_cleanup.py\n"
addition = needle + "            python3 scripts/verify_pickword_unified_cleanup.py\n"
if addition not in workflow:
    if workflow.count(needle) != 1:
        raise SystemExit("verify workflow insertion marker missing")
    workflow = workflow.replace(needle, addition, 1)
VERIFY_WORKFLOW.write_text(workflow, encoding="utf-8")

record = {
    "schema": 1,
    "id": "optimize-pickword-unified-cleanup",
    "type": "optimize",
    "title": "统一清理拾字冗余状态与窗口生命周期",
    "details": [
        "拆分拖选可见行缓冲与高亮刷新间隔配置，修复未定义配置导致拖选缓冲始终走硬编码兜底的问题",
        "修复拖选延迟刷新状态被当作Runnable取消的问题，关闭或销毁拾字时明确移除dragUpdateProcessor",
        "区分主拾字窗口回调与钉屏批量加载回调，主面板关闭不再中断钉屏长文本加载",
        "统一主窗口同步清理、引用释放和过期hide防护，模块销毁不再重复投递异步关闭任务",
        "清理旧预览按钮、空保活、无调用包装、重复字号引用、无效放大镜参数和被覆盖的尺寸配置",
        "保留Android 14长按兼容、ColorOS颜色安全、四档字号与旧值读取、分享关闭、翻译、钉屏和Canvas拖选边界"
    ],
    "manifestVersion": 0
}
RECORD.parent.mkdir(parents=True, exist_ok=True)
RECORD.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("pickword unified cleanup patch applied")
