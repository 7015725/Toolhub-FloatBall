#!/usr/bin/env python3
"""校验取字/OCR 顶部结果预览、复制按钮与拾字模块集成契约。"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "code" / "th_01_base.js"
PANELS = ROOT / "code" / "th_14_panels.js"
ENTRY = ROOT / "code" / "th_16_entry.js"
POINTER = ROOT / "code" / "th_17_pointer.js"
OCR = ROOT / "code" / "th_18_pointer_ocr.js"
PICKWORD = ROOT / "code" / "th_20_pickword.js"
PREVIEW = ROOT / "code" / "th_21_result_preview.js"
LOADER = ROOT / "ToolHub.js"
SIGNER = ROOT / "scripts" / "generate_signed_manifest.py"
BOUNDARIES = ROOT / "MODULE_BOUNDARIES.json"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def require(name: str, condition: bool, detail: str, failures: list[str]) -> None:
    if condition:
        print("PASS " + name)
    else:
        failures.append(name + ": " + detail)


def section(text: str, start: str, end: str) -> str:
    a = text.find(start)
    if a < 0:
        return ""
    b = text.find(end, a + len(start))
    return text[a:] if b < 0 else text[a:b]


def main() -> int:
    required = [BASE, PANELS, ENTRY, POINTER, OCR, PICKWORD, PREVIEW, LOADER, SIGNER, BOUNDARIES]
    missing = [str(p.relative_to(ROOT)) for p in required if not p.exists()]
    if missing:
        print("FAIL missing files: " + ", ".join(missing))
        return 1

    base = read(BASE)
    panels = read(PANELS)
    entry = read(ENTRY)
    pointer = read(POINTER)
    ocr = read(OCR)
    pickword = read(PICKWORD)
    preview = read(PREVIEW)
    loader = read(LOADER)
    signer = read(SIGNER)
    boundaries = read(BOUNDARIES)
    failures: list[str] = []

    require(
        "modules / valid versions",
        re.search(r"^// @version [1-9][0-9]*\.[0-9]+\.[0-9]+", pickword, re.M) is not None
        and re.search(r"^// @version [1-9][0-9]*\.[0-9]+\.[0-9]+", preview, re.M) is not None,
        "new modules need valid @version headers",
        failures,
    )

    order = [loader.find('"th_19_position_state.js"'), loader.find('"th_20_pickword.js"'), loader.find('"th_21_result_preview.js"')]
    require(
        "modules / load order",
        min(order) >= 0 and order == sorted(order),
        "th_20 and th_21 must load after pointer position module",
        failures,
    )
    require(
        "modules / signer list",
        '"th_20_pickword.js"' in signer and '"th_21_result_preview.js"' in signer,
        "signed manifest module list is incomplete",
        failures,
    )

    for method in (
        "showPickwordText",
        "isPickwordShowing",
        "hidePickwordWindow",
        "disposePickwordModule",
        "onPickwordConfigurationChanged",
    ):
        require(
            "pickword / api " + method,
            ("proto.%s = function" % method) in pickword,
            "missing reusable pickword API",
            failures,
        )

    require(
        "pickword / no auto start",
        "startBigBang(inputText)" not in pickword
        and "localVarOf$剪贴板" not in pickword
        and "hasPrimaryClip" not in pickword,
        "module loading must not open pickword or fall back to clipboard input",
        failures,
    )
    require(
        "pickword / no private exit hook",
        "require('events')" not in pickword
        and 'events.on("exit"' not in pickword,
        "ToolHub lifecycle must own cleanup",
        failures,
    )
    keepalive = section(pickword, "ensureKeepAlive: function()", "cancelPinnedTextBatchLoad: function()")
    require(
        "pickword / no independent keepalive loop",
        "postDelayed(keepAliveTimer" not in keepalive,
        "pickword child module must not maintain its own keepalive timer",
        failures,
    )
    main_enter = section(pickword, "function animatePickwordMainEnter(view)", "function applyButtonAnimation(btn)")
    pickword_show = section(pickword, "show: function(text)", "hide: function()")
    require(
        "pickword / opaque main-window entry",
        "view.setAlpha(1)" in main_enter
        and "view.setAlpha(0)" not in main_enter
        and ".alpha(" not in main_enter
        and pickword_show.count("animatePickwordMainEnter(mainLayout)") == 2
        and "animateWindowEnter(mainLayout)" not in pickword_show
        and "animateWindowEnter(pinLayout)" in pickword,
        "main pickword window must enter fully opaque while pin-window animation remains unchanged",
        failures,
    )

    pickword_create_window = section(pickword, "createWindow: function()", "createTitleBar: function()")
    pickword_initial_load = section(pickword, "scheduleInitialTextLoad: function()", "installCanvasScrollRefreshHooks: function()")
    pickword_load_full = section(pickword, "loadFullTextNow: function", "scheduleInitialTextLoad: function()")
    pickword_height = section(pickword, "applyScrollViewHeightNow: function()", "createPreviewBox: function()")
    require(
        "pickword / stable adaptive initial height",
        "new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, uiDp(60, 72))" in pickword_create_window
        and pickword_create_window.find("this.scheduleInitialTextLoad();") >= 0
        and pickword_create_window.find("this.scheduleInitialTextLoad();") < pickword_create_window.find("windowManager.addView(mainLayout, layoutParams)")
        and pickword_show.count("self.scheduleInitialTextLoad();") == 1
        and pickword_show.find("self.scheduleInitialTextLoad();") < pickword_show.find("mainLayout.setVisibility(View.VISIBLE)")
        and "正在加载文本…" not in pickword_initial_load
        and "INITIAL_TEXT_DELAY_MS" not in pickword
        and "this.applyScrollViewHeightNow();" in pickword_initial_load
        and "self.loadFullTextNow(false, true)" in pickword_initial_load
        and "loadFullTextNow: function(showMsg, preserveHeight)" in pickword_load_full
        and "if (preserveHeight !== true) this.adjustScrollViewHeight();" in pickword_load_full
        and "Math.min(contentHeight + uiDp(8, 10), textAreaHeight)" in pickword_height,
        "420dp must remain a maximum height while the first visible frame uses the final adaptive height",
        failures,
    )
    require(
        "pickword / full text metadata retained",
        "ps.fullText = raw" in pickword
        and "ps.loadedText" in pickword
        and "originalLength" in pickword
        and "loadedLength" in pickword,
        "full source text and 8000-character loaded window must be distinguished",
        failures,
    )

    for method in (
        "publishResultPreview",
        "dismissResultPreview",
        "openResultPreviewPrimaryAction",
        "disposeResultPreview",
        "onResultPreviewConfigurationChanged",
    ):
        require(
            "preview / api " + method,
            ("proto.%s = function" % method) in preview,
            "missing result preview API",
            failures,
        )

    require(
        "preview / single instance state",
        "appObj.state.resultPreview" in preview
        and "payload: null" in preview
        and "root: null" in preview
        and "rootRender: null" in preview
        and "added: false" in preview
        and "copyFeedbackRunnable: null" in preview,
        "preview state must be a single instance on app.state and own copy feedback cleanup",
        failures,
    )

    sync_render = section(preview, "function syncRender21(render, st)", "function isCurrentRoot21(st, rootRef, render)")
    create_view = section(preview, "function createView21(appObj, st)", "function createLp21(appObj, st)")
    attach_new_root = section(preview, "function attachNewRoot21(appObj, st)", "function rebuildRoot21(appObj, st, rootRef, render)")
    draw_preview = section(preview, "function drawPreview21(appObj, st, canvas, view, render)", "function cancelDismiss21(st)")
    draw_copy = section(preview, "function drawCopyAction21(appObj, canvas, view, render, colors)", "function drawPreview21(appObj, st, canvas, view, render)")
    copy_action = section(preview, "function performResultPreviewCopy21(appObj, st, rootRef, render)", "function startEnterAnimation21")
    copy_feedback = section(preview, "function scheduleCopyFeedbackReset21(appObj, st, rootRef, render, delayMs)", "function performResultPreviewCopy21")

    require(
        "preview / single render initialization source",
        "syncRender21(render, st);" in create_view
        and create_view.find("syncRender21(render, st);") < create_view.find("new JavaAdapter")
        and "generation: Number(st.generation || 0)" not in create_view
        and "payloadId: String(st.payload" not in create_view
        and "render.forceDarkDisabled = false;" not in sync_render
        and "syncRender21(st.rootRender, st);" not in attach_new_root
        and "st.rootRender.rootToken =" not in attach_new_root
        and "st.rootRender.enterStarted =" not in attach_new_root,
        "new roots must initialize dynamic render state once before view creation and preserve per-view Force Dark status",
        failures,
    )

    state_init = section(preview, "appObj.state.resultPreview = {", "var st = appObj.state.resultPreview;")
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
        and "render.visibleStartedAt" not in preview
        and "lastReason:" not in state_init
        and "st.lastReason" not in preview
        and "render.firstDrawAt" in preview
        and "st.visibleStartedAt" in preview,
        "preview state must retain only values that participate in rendering, timing or stale-callback isolation",
        failures,
    )

    require(
        "preview / canvas-only custom rendering",
        "new JavaAdapter(android.view.View" in create_view
        and "onDraw: function(canvas)" in create_view
        and "canvas.drawRoundRect" in draw_preview
        and "canvas.drawText" in draw_preview
        and "new android.widget.TextView" not in preview
        and "new android.widget.LinearLayout" not in preview
        and "new android.widget.FrameLayout" not in preview,
        "preview must remain Canvas-only without native child widgets",
        failures,
    )
    require(
        "preview / two-line truncation",
        "paint.breakText" in preview
        and "st.line1" in preview
        and "st.line2" in preview
        and 'var ellipsis = "…"' in preview,
        "preview must retain custom two-line truncation",
        failures,
    )
    require(
        "preview / full-screen percentage and system-bar safety",
        "POINTER_RESULT_PREVIEW_POSITION_PERCENT" in base
        and "function screenFrame21(appObj)" in preview
        and "function calculatePreviewTopY21(appObj, st, overrideValue)" in preview
        and "frame.height * percent / 100" in preview
        and "WindowInsets.Type.statusBars()" in preview
        and "WindowInsets.Type.navigationBars()" in preview
        and "WindowInsets.Type.displayCutout()" in preview
        and "getInsetsIgnoringVisibility" in preview
        and 'getIdentifier("status_bar_height"' in preview
        and 'getIdentifier("navigation_bar_height"' in preview
        and "result.bottom <= 0 && result.left <= 0 && result.right <= 0" in preview
        and "previewHeight = int21(st && st.measuredHeight, 0)" in preview,
        "preview position must use complete screen height, prefer the current measured height, then clamp against real top and bottom system insets",
        failures,
    )
    require(
        "preview / opaque semantic background",
        'bg: colorIntToSpec21(scheme.surface' in preview
        and '"#FF1B1B1F"' in preview
        and '"#FFFFFFFF"' in preview
        and '"#F21B1B1F"' not in preview
        and '"#F7FFFFFF"' not in preview,
        "preview background must use ToolHub surface with fully opaque fallbacks",
        failures,
    )
    require(
        "preview / unified ToolHub semantic theme",
        "function isDark21()" not in preview
        and "UI_MODE_NIGHT_MASK" not in preview
        and "function colors21(appObj)" in preview
        and 'typeof appObj.getSettingsColorScheme === "function"' in preview
        and "appObj.getSettingsColorScheme()" in preview
        and "scheme.surface" in preview
        and "scheme.onSurface" in preview
        and "scheme.onSurface2" in preview
        and "scheme.primary" in preview
        and "scheme.success" in preview
        and "scheme.danger" in preview
        and 'themeSource: "getSettingsColorScheme"' in preview
        and '" theme=" + String(render.themeDark === true ? "dark" : "light")' in preview
        and '" themeSource=" + String(render.themeSource || "")' in preview,
        "result preview must use the shared ToolHub semantic color scheme and log the selected source",
        failures,
    )
    require(
        "preview / deterministic Canvas color application",
        "function colorSpec21(a, r, g, b, hex)" in preview
        and "function colorIntToSpec21(value, fallback)" in preview
        and "function packArgb21(color)" in preview
        and "function argbHex21(value)" in preview
        and "paint.setARGB(color.a, color.r, color.g, color.b);" in preview
        and "paint.getColor()" in preview
        and "result preview background color apply fail" in preview
        and "result preview copy icon color apply fail" in preview
        and "bgApplyOk" in preview
        and "copyApplyOk" in preview
        and '" bgExpected="' in preview
        and '" bgActual="' in preview
        and '" copyActual="' in preview
        and '" canvasHardware="' in preview
        and '" forceDarkDisabled="' in preview
        and "PreviewView.setForceDarkAllowed(false);" in preview
        and "android.graphics.PixelFormat.RGBA_8888" in preview
        and "android.graphics.PixelFormat.TRANSLUCENT" not in preview,
        "result preview must use explicit ARGB channels, validate Paint colors, disable Force Dark and use RGBA_8888",
        failures,
    )
    require(
        "preview / paint color avoids ColorLong overload",
        "function setPaintColor21(paint, color)" in preview
        and preview.count("setPaintColor21(") >= 7
        and ".setColor(" not in draw_preview
        and ".setColor(" not in draw_copy,
        "custom drawing must use explicit ARGB channels instead of overloaded Paint.setColor",
        failures,
    )
    require(
        "preview / no software layer",
        "LAYER_TYPE_NONE" in create_view
        and "LAYER_TYPE_SOFTWARE" not in preview,
        "Canvas preview must not allocate a software off-screen layer that can stall the first frame",
        failures,
    )

    require(
        "preview copy / canvas icon and success check",
        "function drawCopyIcon21(canvas, paint, cx, cy, size)" in preview
        and "function drawCheckIcon21(canvas, paint, cx, cy, size)" in preview
        and "canvas.drawRoundRect(rear" in preview
        and "canvas.drawRoundRect(front" in preview
        and "canvas.drawPath(path, paint)" in preview
        and 'feedback === "success"' in draw_copy,
        "copy action must use deterministic Canvas paths instead of Unicode glyphs or native child views",
        failures,
    )
    require(
        "preview copy / full original text only",
        "st.payload.text" in copy_action
        and "copyPointerTextToClipboard(rawText)" in copy_action
        and "payload.previewText" not in copy_action
        and "render.line1" not in copy_action
        and "render.line2" not in copy_action,
        "copy must write the complete payload.text rather than the cleaned or truncated preview",
        failures,
    )
    require(
        "preview copy / empty text hides action",
        "function hasCopyText21(text)" in preview
        and "st.copyVisible = hasCopyText21(st.payload && st.payload.text);" in preview
        and "render.copyVisible = false;" in copy_action
        and 'reason=empty_text' in copy_action,
        "whitespace-only text must not expose an active copy button",
        failures,
    )
    require(
        "preview copy / no cached slot width state",
        "st.copySlotWidth" not in preview
        and "copySlotWidth: 0" not in preview
        and "var copySlot = st.copyVisible ? metrics.slotWidth : 0;" in preview
        and "var finalCopySlot = st.copyVisible ? finalMetrics.slotWidth : 0;" in preview,
        "copy slot width must remain a local layout value instead of persistent preview state",
        failures,
    )
    require(
        "preview copy / minimum touch target",
        "function copyMetrics21(appObj, heightPx)" in preview
        and "Math.max(dp21(appObj, 40)" in preview
        and "function buildCopyHitRect21(appObj, width, height)" in preview
        and "pointInRect21" in create_view,
        "copy icon must retain at least a 40dp hit target and explicit hit testing",
        failures,
    )
    require(
        "preview copy / touch isolation from pickword",
        'st.touchTarget = "copy"' in create_view
        and 'st.touchTarget = "primary"' in create_view
        and 'target === "copy"' in create_view
        and "performResultPreviewCopy21(self, st, this, render)" in create_view
        and "self.openResultPreviewPrimaryAction()" in create_view
        and create_view.find("performResultPreviewCopy21(self, st, this, render)") < create_view.find("self.openResultPreviewPrimaryAction()"),
        "copy taps must be consumed separately and never fall through to the pickword primary action",
        failures,
    )
    require(
        "preview copy / success feedback and timeout reset",
        'render.copyFeedbackKind = copied ? "success" : "failure";' in copy_action
        and "scheduleCopyFeedbackReset21(appObj, st, rootRef, render, 1000);" in copy_action
        and "scheduleDismiss21(appObj, st, rootRef, render);" in copy_action
        and '"result preview copy success"' in copy_action,
        "successful copy must show a temporary check, log the result and restart the preview timeout",
        failures,
    )
    require(
        "preview copy / failure remains visible and logged",
        'new java.lang.String("复制失败")' in draw_copy
        and 'appObj.toast("复制失败")' in copy_action
        and '"result preview copy failed"' in copy_action
        and "scheduleCopyFeedbackReset21(appObj, st, rootRef, render, 1400);" in copy_action
        and 'render.copyFeedbackKind = "";' in copy_feedback,
        "clipboard failure must retain the icon, visibly report 复制失败 and record diagnostics",
        failures,
    )
    require(
        "preview copy / stale callback isolation",
        "copyFeedbackRunnable" in preview
        and "cancelCopyFeedback21(st)" in preview
        and "var token = Number(st.generation || 0);" in copy_feedback
        and "var rootToken = Number(render.rootToken || 0);" in copy_feedback
        and "Number(st.generation || 0) !== token" in copy_feedback
        and "Number(st.rootToken || 0) !== rootToken" in copy_feedback
        and "isCurrentRoot21(st, rootRef, render)" in copy_feedback,
        "late copy feedback callbacks must not mutate a replacement preview root",
        failures,
    )

    show_state = section(preview, "function showState21(appObj, st)", "function normalizePayload21")
    first_draw = section(preview, "function markFirstDraw21(appObj, st, rootRef, render)", "function createView21(appObj, st)")
    schedule_dismiss = section(preview, "function scheduleDismiss21(appObj, st, rootRef, render)", "function scheduleCopyFeedbackReset21")
    watchdog = section(preview, "function scheduleVisibilityFallback21(appObj, st, rootRef, render, attempt)", "function showState21")
    require(
        "preview / timeout begins after first draw",
        "scheduleDismiss21(" not in show_state
        and "scheduleDismiss21(appObj, st, rootRef, render);" in first_draw
        and "if (Number(render.firstDrawAt || 0) <= 0) return false;" in schedule_dismiss
        and '"result preview dismiss scheduled"' in schedule_dismiss,
        "display timeout must start only after a successful Canvas frame",
        failures,
    )
    require(
        "preview / root-token isolation",
        "rootSequence" in preview
        and "rootToken" in preview
        and "rootRender" in preview
        and "function isCurrentRoot21(st, rootRef, render)" in preview
        and "st.root !== rootRef" in preview
        and "st.rootRender !== render" in preview
        and '"result preview stale draw ignored"' in preview,
        "late callbacks from removed roots must not mutate the current preview generation",
        failures,
    )
    require(
        "preview / draw watchdog and single rebuild",
        "forceRootTraversal21" in watchdog
        and "rebuildRoot21" in watchdog
        and "failRender21" in watchdog
        and "st.renderRebuildCount" in watchdog
        and '"result preview draw stalled"' in preview
        and '"result preview root rebuild"' in preview
        and '"result preview render failed"' in preview,
        "a missing first frame must be retried, rebuilt once, then failed without a late flash",
        failures,
    )
    require(
        "preview / fade and scale only motion",
        ".alpha(1)" in preview
        and ".alpha(0)" in preview
        and ".scaleX(0.97).scaleY(0.97)" in preview
        and "translationY(-dp21" not in preview
        and "setTranslationY(0)" in preview
        and ".setDuration(120)" in preview
        and "st.clickLocked" in preview,
        "preview motion must use alpha and scale without vertical translation",
        failures,
    )

    action = section(preview, "proto.openResultPreviewPrimaryAction = function()", "proto.disposeResultPreview = function")
    require(
        "preview / primary handoff removes preview before pickword",
        action.find("removeView21(this, st)") >= 0
        and action.find("this.showPickwordText(payload.text") > action.find("removeView21(this, st)")
        and 'this.dismissResultPreview("primary_action", true)' not in action
        and "this.publishResultPreview(payload)" in action
        and '"result preview primary handoff removed="' in action,
        "preview must be removed synchronously before opening pickword and restored only on failure",
        failures,
    )
    require(
        "preview / click passes full text to pickword",
        "this.showPickwordText(payload.text" in action
        and "payload.previewText" not in action,
        "primary action must pass complete payload.text, not truncated preview text",
        failures,
    )

    complete = section(pointer, "FloatBallAppWM.prototype.completePointerTextResult = function", "FloatBallAppWM.prototype.ensurePointerToolState = function")
    require(
        "pointer / text success publishes preview",
        "publishResultPreview" in complete
        and 'kind: "text"' in complete
        and 'primaryAction: "pickword"' in complete
        and "clipboard: false" in complete
        and "copyPointerTextToClipboard(text)" not in complete,
        "text success must preview without automatic clipboard write",
        failures,
    )
    require(
        "pointer / reusable clipboard helper",
        "FloatBallAppWM.prototype.copyPointerTextToClipboard = function(textValue)" in pointer
        and "cm.setPrimaryClip(clip);" in pointer
        and 'copyPointerTextToClipboard fail:' in pointer,
        "preview copy depends on the existing logged pointer clipboard helper",
        failures,
    )
    fallback = section(pointer, "FloatBallAppWM.prototype.finishPointerFallbackText = function", "FloatBallAppWM.prototype.updatePointerAreaSelection = function")
    require(
        "pointer / small-area fallback publishes preview",
        "completePointerTextResult(" in fallback
        and "clipboard: false" in fallback,
        "small-area fallback must use the same result completion",
        failures,
    )

    apply_ocr = section(ocr, "function applyAreaOcrResult18", "function isAreaOcrTokenCurrent18")
    require(
        "ocr / success publishes preview only with text",
        "if (hasText && typeof appObj.publishResultPreview" in apply_ocr
        and 'source: "pointer_ocr"' in apply_ocr
        and "obj.preview" in apply_ocr
        and "obj.clipboard = false" in apply_ocr,
        "OCR success preview contract is incomplete",
        failures,
    )
    require(
        "ocr / automatic clipboard path removed",
        "copyPointerAreaTextToClipboard" not in ocr
        and "copyClipboard18" not in ocr,
        "OCR still contains automatic clipboard helpers",
        failures,
    )

    require(
        "settings / timeout validator",
        'POINTER_RESULT_PREVIEW_TIMEOUT_SEC: { type: "int", min: 1, max: 10, default: 3 }' in base,
        "timeout validator must remain 1-10 seconds with default 3",
        failures,
    )
    require(
        "settings / timeout schema and block",
        "POINTER_RESULT_PREVIEW_TIMEOUT_SEC: 3" in base
        and 'name: "结果预览停留时间(秒)"' in base
        and 'key: "result_preview"' in panels
        and '"POINTER_RESULT_PREVIEW_TIMEOUT_SEC"' in panels,
        "timeout setting is not fully exposed",
        failures,
    )

    require(
        "lifecycle / close cleanup",
        'closeStep("disposeResultPreview"' in entry
        and 'closeStep("disposePickwordModule"' in entry,
        "ToolHub close must dispose preview and pickword resources",
        failures,
    )
    require(
        "lifecycle / configuration reflow",
        "onResultPreviewConfigurationChanged" in entry
        and "onPickwordConfigurationChanged" in entry,
        "configuration changes must refresh child overlays",
        failures,
    )

    for owner in (
        '"completePointerTextResult": "th_17_pointer.js"',
        '"showPickwordText": "th_20_pickword.js"',
        '"publishResultPreview": "th_21_result_preview.js"',
        '"disposeResultPreview": "th_21_result_preview.js"',
    ):
        require(
            "boundaries / " + owner.split(":", 1)[0].strip('"'),
            owner in boundaries,
            "new prototype owner is not locked",
            failures,
        )

    if failures:
        for item in failures:
            print("FAIL " + item)
        print("FAIL result_preview failed=%d" % len(failures))
        return 1

    print("OK result_preview integration verified")
    return 0


if __name__ == "__main__":
    sys.exit(main())
