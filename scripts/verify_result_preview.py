#!/usr/bin/env python3
"""校验取字/OCR 顶部结果预览与拾字模块集成契约。"""

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
        'require(\'events\')' not in pickword
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
        and "added: false" in preview,
        "preview state must be a single instance on app.state",
        failures,
    )
    require(
        "preview / generation guarded timeout",
        "st.generation = Number(st.generation || 0) + 1" in preview
        and "if (Number(st.generation || 0) !== token) return;" in preview
        and "dismissRunnable" in preview,
        "old timeout callbacks must not dismiss newer results",
        failures,
    )
    require(
        "preview / custom draw and two-line truncation",
        "new JavaAdapter(android.view.View" in preview
        and "onDraw: function(canvas)" in preview
        and "paint.breakText" in preview
        and "st.line1" in preview
        and "st.line2" in preview
        and 'var ellipsis = "…"' in preview,
        "preview must be a fully custom drawn two-line card",
        failures,
    )
    require(
        "preview / status bar and cutout inset",
        "WindowInsets.Type.statusBars()" in preview
        and "WindowInsets.Type.displayCutout()" in preview
        and 'getIdentifier("status_bar_height"' in preview,
        "top position must respect status bar and cutout safe insets",
        failures,
    )
    require(
        "preview / animation and touch feedback",
        "st.root.setTranslationY(-dp21(appObj, 8))" in preview
        and ".translationY(-dp21(self, 8))" in preview
        and ".setDuration(180)" in preview
        and ".scaleX(0.97).scaleY(0.97)" in preview
        and "st.clickLocked" in preview,
        "enter/exit and click feedback contracts are incomplete",
        failures,
    )
    require(
        "preview / visible fallback and draw diagnostics",
        "PreviewView.setWillNotDraw(false)" in preview
        and "st.root.setAlpha(0.78)" in preview
        and "scheduleVisibilityFallback21(appObj, st, st.root)" in preview
        and "rootRef.setVisibility(android.view.View.VISIBLE)" in preview
        and '"result preview first draw"' in preview
        and '"result preview visual check"' in preview,
        "preview must remain visible when the entry animation does not advance",
        failures,
    )
    draw_preview = section(preview, "function drawPreview21(appObj, st, canvas, view)", "function createView21(appObj, st)")
    require(
        "preview / paint color avoids ColorLong overload",
        "function setPaintColor21(paint, color)" in preview
        and "paint.setARGB(" in preview
        and draw_preview.count("setPaintColor21(") == 4
        and ".setColor(" not in draw_preview,
        "custom drawing must use explicit ARGB channels instead of overloaded Paint.setColor",
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
        'POINTER_RESULT_PREVIEW_TIMEOUT_SEC: 3' in base
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
