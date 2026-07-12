#!/usr/bin/env python3
"""Verify the pointer fixes tracked by GitHub issue #85."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POINTER = ROOT / "code" / "th_17_pointer.js"
POINTER_OCR = ROOT / "code" / "th_18_pointer_ocr.js"
POSITION = ROOT / "code" / "th_19_position_state.js"
ANIMATION = ROOT / "code" / "th_09_animation.js"
VERIFY_MANIFEST = ROOT / "scripts" / "verify_manifest.py"


def read_text(path):
    return path.read_text(encoding="utf-8")


def section(text, start_marker, end_marker):
    start = text.find(start_marker)
    if start < 0:
        return ""
    end = text.find(end_marker, start + len(start_marker))
    if end < 0:
        return text[start:]
    return text[start:end]


class CheckResult:
    def __init__(self):
        self.passed = []
        self.failed = []

    def require(self, name, condition, detail):
        if condition:
            self.passed.append(name)
        else:
            self.failed.append((name, detail))


def verify_manifest(result):
    proc = subprocess.run(
        [sys.executable, str(VERIFY_MANIFEST)],
        cwd=str(ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    output = proc.stdout.strip()
    if len(output) > 2000:
        output = output[-2000:]
    result.require(
        "manifest",
        proc.returncode == 0,
        "scripts/verify_manifest.py failed:\n" + output,
    )


def main():
    required = [POINTER, POINTER_OCR, POSITION, ANIMATION, VERIFY_MANIFEST]
    missing = [str(path.relative_to(ROOT)) for path in required if not path.exists()]
    if missing:
        print("FAIL missing files: " + ", ".join(missing))
        return 1

    pointer = read_text(POINTER)
    ocr = read_text(POINTER_OCR)
    position = read_text(POSITION)
    animation = read_text(ANIMATION)
    result = CheckResult()

    finish_wrapper = section(
        ocr,
        "var oldFinishPointerAreaCapture = proto.finishPointerAreaCapture;",
        "proto.__toolHubPointerTextPatchInstalled = true;",
    )
    old_finish = finish_wrapper.find("var ret = oldFinishPointerAreaCapture.call(this);")
    pending_guard = finish_wrapper.find("ret.pending === true", old_finish + 1)
    pending_return = finish_wrapper.find("return ret;", pending_guard + 1)
    ocr_dispatch = finish_wrapper.find("scheduleAreaOcrAsync18", pending_return + 1)
    result.require(
        "W1 pending fallback stops OCR override",
        min(old_finish, pending_guard, pending_return, ocr_dispatch) >= 0
        and old_finish < pending_guard < pending_return < ocr_dispatch,
        "pending fallback must return before scheduleAreaOcrAsync18",
    )

    touch_owner = section(
        position,
        "proto.setupTouchListener = function()",
        "proto.onScreenChangedReflow = function",
    )
    result.require(
        "W2 triple tap cancellation delegates to core",
        "installFixedEdgePointer18" not in ocr
        and "proto.setupTouchListener = function()" not in ocr
        and "self.onPointerBallTap(rawX, rawY)" in touch_owner,
        "th_19 must own touch handling and delegate active pointer taps to core onPointerBallTap",
    )

    async_ocr = section(ocr, "function scheduleAreaOcrAsync18", "function install18()")
    token_helper = section(
        ocr,
        "function isAreaOcrTokenCurrent18(st, token)",
        "function clearAreaOcrWorkerRefs18",
    )
    legacy_token_guard = "Number(st.areaOcrSeq || 0) !== Number(token)" in async_ocr
    helper_token_guard = (
        "Number(st.areaOcrSeq || 0) !== Number(token)" in token_helper
        and "Number(st.areaOcrDoneToken || 0) === Number(token)" in token_helper
        and "isAreaOcrTokenCurrent18(st, token)" in async_ocr
    )
    result.require(
        "W3 area OCR is asynchronous and token timed",
        "new android.os.HandlerThread" in async_ocr
        and "areaOcrTimeoutRunnable" in async_ocr
        and "AREA_OCR_TIMEOUT" in async_ocr
        and (legacy_token_guard or helper_token_guard)
        and "scheduleAreaOcrAsync18(this, st, obj, rect, path, ret)" in finish_wrapper,
        "async HandlerThread, token guard, timeout code, or dispatch is missing",
    )

    clipboard_call = async_ocr.find("copyPointerAreaTextToClipboard(textValue)")
    guard_before_clipboard = async_ocr.rfind(
        "if (!isAreaOcrTokenCurrent18(st, token)) return;",
        0,
        clipboard_call,
    )
    guard_after_clipboard = async_ocr.find(
        "if (!isAreaOcrTokenCurrent18(st, token)) return;",
        clipboard_call + 1,
    )
    result.require(
        "N1 stale OCR cannot overwrite clipboard",
        clipboard_call >= 0
        and guard_before_clipboard >= 0
        and guard_before_clipboard < clipboard_call
        and guard_after_clipboard > clipboard_call,
        "clipboard write must be guarded by current-token checks before and after copying",
    )

    stop_ocr_worker = section(
        ocr,
        "function stopAreaOcrWorker18(appObj, st, reason)",
        "function scheduleAreaOcrAsync18",
    )
    start_pointer_wrapper = section(
        ocr,
        "var oldStartPointerTool = proto.startPointerTool;",
        "var oldExecPointerAction = proto.execPointerAction;",
    )
    result.require(
        "N2 cancelled OCR worker is cleaned up",
        "removeCallbacks(timeoutRunnable)" in stop_ocr_worker
        and "removeCallbacksAndMessages(null)" in stop_ocr_worker
        and "quitHandlerThread18(ht)" in stop_ocr_worker
        and 'stopAreaOcrWorker18(this, stCancelOcr, "start_pointer_tool")' in start_pointer_wrapper
        and "clearAreaOcrWorkerRefs18(st, ht, workerH, timeoutRunnable, token)" in async_ocr
        and "finally {" in async_ocr,
        "cancel path must remove timeout/worker callbacks, quit the HandlerThread, and clear owned references",
    )

    ocr_rect = section(
        pointer,
        "FloatBallAppWM.prototype.getPointerOcrRectJson = function()",
        "FloatBallAppWM.prototype.resolvePointerExportDir = function()",
    )
    result.require(
        "W4 OCR rect supports area_ocr",
        'obj.type !== "area_capture" && obj.type !== "area_ocr"' in ocr_rect,
        "getPointerOcrRectJson must accept area_capture and area_ocr",
    )

    apply_inspect = section(
        pointer,
        "FloatBallAppWM.prototype.applyPointerInspectResult = function(pack)",
        "FloatBallAppWM.prototype.runPointerInspectWorker = function(st)",
    )
    finish_text = section(
        pointer,
        "FloatBallAppWM.prototype.finishPointerTextPickAfterRelease = function()",
        "FloatBallAppWM.prototype.finishPointerTextPickOnRelease = function()",
    )
    timeout_code = finish_text.find('code: "TEXT_SCAN_TIMEOUT"')
    empty_code = finish_text.find('code: "POINTER_RELEASE_EMPTY"')
    result.require(
        "W5 final timeout is distinct from an empty release",
        "var finalTimeout =" in apply_inspect
        and "st.inspectLastTimedOut === true" in finish_text
        and timeout_code >= 0
        and empty_code > timeout_code,
        "timeout fallback or TEXT_SCAN_TIMEOUT ordering is missing",
    )

    result.require(
        "N3 stale candidate reuse is final-scan scoped",
        'timeoutReason.indexOf("release_final") === 0' in apply_inspect
        and 'timeoutReason.indexOf("area_small_text_final") === 0' in apply_inspect
        and "finishAfterRelease === true" in apply_inspect
        and "this.pointerRectInside(pack.x, pack.y, st.boundRect) === true" in apply_inspect
        and "candidateFresh" in apply_inspect
        and "finalTimeout &&" in apply_inspect
        and "candidateStillHit &&" in apply_inspect,
        "timeout reuse must be limited to final scans with a fresh candidate still under the hotspot",
    )

    save_bitmap = section(
        pointer,
        "FloatBallAppWM.prototype.savePointerBitmapToFile = function(bitmap, file)",
        "FloatBallAppWM.prototype.pointerBitmapFromCaptureBuffer = function(buffer)",
    )
    compress_call = save_bitmap.find("var compressed = bitmap.compress")
    compress_check = save_bitmap.find("if (compressed !== true", compress_call + 1)
    result.require(
        "W6 bitmap.compress return value is checked",
        compress_call >= 0 and compress_check > compress_call,
        "bitmap.compress result must be validated before flush",
    )

    capture = section(
        pointer,
        "FloatBallAppWM.prototype.capturePointerRectToPng = function(rect)",
        "FloatBallAppWM.prototype.isPointerToolActive = function()",
    )
    cleanup_finally = capture.rfind("finally")
    release_buffer = capture.rfind("this.releasePointerCaptureBuffer(captureBuffer)")
    recycle_bitmap = capture.rfind("this.recyclePointerBitmap(bitmap)")
    result.require(
        "W6 screenshot resources are released",
        cleanup_finally >= 0
        and cleanup_finally < release_buffer < recycle_bitmap
        and "FloatBallAppWM.prototype.releasePointerCaptureBuffer" in pointer
        and "FloatBallAppWM.prototype.recyclePointerBitmap" in pointer,
        "capture finally must release buffer and recycle bitmap",
    )

    area_finish = section(
        pointer,
        "FloatBallAppWM.prototype.finishPointerAreaCapture = function()",
        "FloatBallAppWM.prototype.flushPointerPositionFromBall = function()",
    )
    area_async = section(
        pointer,
        "FloatBallAppWM.prototype.schedulePointerAreaCaptureAsync = function(",
        "FloatBallAppWM.prototype.finishPointerAreaCapture = function()",
    )
    area_complete_hook = section(
        ocr,
        "proto.onPointerAreaCaptureCompleted = function(st, token, obj, ret)",
        "proto.finishPointerAreaCapture = function()",
    )
    result.require(
        "N4 area screenshot and PNG save are asynchronous",
        "java.lang.Thread.sleep" not in area_finish
        and "capturePointerRectToPng" not in area_finish
        and "schedulePointerAreaCaptureAsync" in area_finish
        and "new java.lang.Thread" in area_async
        and "java.lang.Thread.sleep(100)" in area_async
        and "capturePointerRectToPng(captureRect)" in area_async
        and '"AREA_CAPTURE_PENDING"' in area_async
        and '"AREA_CAPTURE_TIMEOUT"' in area_async
        and "isPointerAreaCaptureTokenCurrent" in area_async
        and "mainH.post" in area_async
        and "scheduleAreaOcrAsync18(" in area_complete_hook,
        "touch-end capture must return pending while screenshot/save run in a guarded background thread",
    )

    apply_ocr = section(
        ocr,
        "function applyAreaOcrResult18",
        "function isAreaOcrTokenCurrent18",
    )
    result.require(
        "N6 empty OCR result is not reported as success",
        '"AREA_OCR_EMPTY"' in apply_ocr
        and "var hasText = textOk === true && normalizedText.length > 0;" in apply_ocr
        and "obj.ok = hasText;" in apply_ocr
        and "obj.ocrEmpty = textOk === true && !hasText;" in apply_ocr
        and "obj.clipboardOk = hasText && clipboardOk === true;" in apply_ocr
        and '.replace(/^\\s+|\\s+$/g, "");' in async_ocr
        and 'var code = !textOk' in async_ocr
        and '"AREA_OCR_EMPTY"' in async_ocr
        and "if (textOk && textValue)" in async_ocr,
        "empty or whitespace-only OCR must use AREA_OCR_EMPTY and skip clipboard success",
    )

    worker = section(
        pointer,
        "FloatBallAppWM.prototype.runPointerInspectWorker = function(st)",
        "FloatBallAppWM.prototype.preparePointerAccessibilityFinalScan = function(reason)",
    )
    identity_guard = "workerSession !== st.inspectSession || workerH !== st.inspectH || workerHt !== st.inspectHt"
    guarded_reset = "workerSession === st.inspectSession && workerH === st.inspectH && workerHt === st.inspectHt"
    result.require(
        "W7 inspect worker cleanup is session scoped",
        "finally" in worker
        and worker.count(identity_guard) >= 3
        and guarded_reset in worker,
        "worker finally must validate session, Handler, and HandlerThread identities",
    )

    remove_callbacks = section(
        pointer,
        "FloatBallAppWM.prototype.removePointerCallbacks = function(st)",
        "FloatBallAppWM.prototype.closePointerInspectWorker = function(st)",
    )
    result.require(
        "S3 hover-area runnable is removable",
        "removeCallbacks(st.areaHoldRunnable)" in remove_callbacks
        and "st.areaHoldRunnable = null" in remove_callbacks,
        "areaHoldRunnable must be stored, removed, and cleared",
    )

    reflow_names = [
        "mapPointerScreenCoord",
        "mapPointerScreenPointForReflow",
        "mapPointerWindowPointForReflow",
        "mapPointerRectForScreenReflow",
        "mapPointerMaybeCoordForReflow",
        "onPointerScreenChangedReflow",
    ]
    pointer_reflow = section(
        pointer,
        "FloatBallAppWM.prototype.onPointerScreenChangedReflow = function(reason, oldW, oldH, newW, newH)",
        "FloatBallAppWM.prototype.createPointerCanvasView = function(st)",
    )
    result.require(
        "S1 pointer state reflows with the screen",
        all("FloatBallAppWM.prototype." + name in pointer for name in reflow_names)
        and "st.captureRect = this.mapPointerRectForScreenReflow" in pointer_reflow
        and "st.boundRect = this.mapPointerRectForScreenReflow" in pointer_reflow
        and "st.frameLp.width" in pointer_reflow
        and "st.frameLp.height" in pointer_reflow
        and '"screen_reflow:" + String(reason || "")' in pointer_reflow,
        "pointer reflow helpers, mapped state, frame size, or text rescan is missing",
    )

    result.require(
        "N5 screen reflow invalidates stale text candidates",
        'if (st.mode === "text_pick")' in pointer_reflow
        and 'st.currentText = "";' in pointer_reflow
        and "st.currentRect = null;" in pointer_reflow
        and 'st.boundText = "";' in pointer_reflow
        and "st.boundRect = null;" in pointer_reflow
        and "st.boundAt = 0;" in pointer_reflow
        and "st.hoverSince = 0;" in pointer_reflow
        and 'this.invalidatePointerTextHoverCredential(st, "screen_reflow", false)' in pointer_reflow
        and "st.textStableSince = 0;" in pointer_reflow
        and 'st.textStableTargetKey = "";' in pointer_reflow
        and "this.resetPointerTextStableHover(" in pointer_reflow
        and "this.resetPointerAreaHold()" in pointer_reflow
        and '"screen_reflow:" + String(reason || "")' in pointer_reflow,
        "text_pick reflow must clear candidates and hover credentials, then restart stable timing",
    )

    screen_reflow = section(
        animation,
        "FloatBallAppWM.prototype.onScreenChangedReflow = function(reason)",
        "FloatBallAppWM.prototype.scheduleScreenReflow = function(reason)",
    )
    screen_assignment = screen_reflow.find("this.state.screen = { w: newW, h: newH };")
    pointer_hook = screen_reflow.find("this.onPointerScreenChangedReflow(reason, oldW, oldH, newW, newH)")
    result.require(
        "S1 screen reflow calls the pointer hook",
        screen_assignment >= 0 and pointer_hook > screen_assignment,
        "onScreenChangedReflow must call the pointer hook after updating screen size",
    )

    verify_manifest(result)

    for name in result.passed:
        print("PASS " + name)
    if result.failed:
        for name, detail in result.failed:
            print("FAIL " + name + ": " + detail)
        print("FAIL pointer_issue_85 passed=%d failed=%d" % (len(result.passed), len(result.failed)))
        return 1

    print("OK pointer_issue_85 checks=%d" % len(result.passed))
    return 0


if __name__ == "__main__":
    sys.exit(main())
