#!/usr/bin/env python3
"""校验指针取字、框选 OCR、剪贴板和历史回归契约。"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POINTER = ROOT / "code" / "th_17_pointer.js"
POINTER_OCR = ROOT / "code" / "th_18_pointer_ocr.js"
POSITION = ROOT / "code" / "th_19_position_state.js"
ANIMATION = ROOT / "code" / "th_09_animation.js"
PANELS = ROOT / "code" / "th_14_panels.js"
ENTRY = ROOT / "ToolHub.js"
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

    def require(self, group, name, condition, detail):
        label = "%s / %s" % (group, name)
        if condition:
            self.passed.append(label)
        else:
            self.failed.append((label, detail))


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
        "shared",
        "manifest",
        proc.returncode == 0,
        "scripts/verify_manifest.py failed:\n" + output,
    )


def verify_issue_85(result, pointer, ocr, position, animation):
    group = "issue-85"

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
        group,
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
        group,
        "W2 triple tap cancellation delegates to core",
        "installFixedEdgePointer18" not in ocr
        and "proto.setupTouchListener = function()" not in ocr
        and "self.onPointerBallTap(rawX, rawY)" in touch_owner,
        "th_19 must own touch handling and delegate active pointer taps to core",
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
        group,
        "W3 area OCR is asynchronous and token timed",
        "new android.os.HandlerThread" in async_ocr
        and "areaOcrTimeoutRunnable" in async_ocr
        and "AREA_OCR_TIMEOUT" in async_ocr
        and (legacy_token_guard or helper_token_guard)
        and "scheduleAreaOcrAsync18(this, st, obj, rect, path, ret)" in finish_wrapper,
        "async HandlerThread, token guard, timeout code, or dispatch is missing",
    )

    apply_ocr_for_preview = section(
        ocr,
        "function applyAreaOcrResult18",
        "function isAreaOcrTokenCurrent18",
    )
    preview_call = apply_ocr_for_preview.find("publishResultPreview")
    seq_guard = apply_ocr_for_preview.find("Number(st.areaOcrSeq || 0) !== Number(token)")
    done_guard = apply_ocr_for_preview.find("Number(st.areaOcrDoneToken || 0) === Number(token)")
    main_preview_guard_count = async_ocr.count(
        "if (!isAreaOcrTokenCurrent18(st, token)) return;"
    )
    result.require(
        group,
        "N1 stale OCR cannot publish preview",
        preview_call >= 0
        and seq_guard >= 0
        and done_guard > seq_guard
        and preview_call > done_guard
        and main_preview_guard_count >= 3
        and "copyPointerAreaTextToClipboard(textValue)" not in async_ocr,
        "preview publication must stay behind token guards and automatic clipboard writes must be absent",
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
        group,
        "N2 cancelled OCR worker is cleaned up",
        "removeCallbacks(timeoutRunnable)" in stop_ocr_worker
        and "removeCallbacksAndMessages(null)" in stop_ocr_worker
        and "quitHandlerThread18(ht)" in stop_ocr_worker
        and 'stopAreaOcrWorker18(this, stCancelOcr, "start_pointer_tool")' in start_pointer_wrapper
        and "clearAreaOcrWorkerRefs18(st, ht, workerH, timeoutRunnable, token)" in async_ocr
        and "finally {" in async_ocr,
        "cancel path must remove callbacks, quit HandlerThread, and clear owned references",
    )

    ocr_rect = section(
        pointer,
        "FloatBallAppWM.prototype.getPointerOcrRectJson = function()",
        "FloatBallAppWM.prototype.resolvePointerExportDir = function()",
    )
    result.require(
        group,
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
        group,
        "W5 final timeout is distinct from empty release",
        "var finalTimeout =" in apply_inspect
        and "st.inspectLastTimedOut === true" in finish_text
        and timeout_code >= 0
        and empty_code > timeout_code,
        "timeout fallback or TEXT_SCAN_TIMEOUT ordering is missing",
    )
    result.require(
        group,
        "N3 stale candidate reuse is final-scan scoped",
        'timeoutReason.indexOf("release_final") === 0' in apply_inspect
        and 'timeoutReason.indexOf("area_small_text_final") === 0' in apply_inspect
        and "finishAfterRelease === true" in apply_inspect
        and "this.pointerRectInside(pack.x, pack.y, st.boundRect) === true" in apply_inspect
        and "candidateFresh" in apply_inspect
        and "finalTimeout &&" in apply_inspect
        and "candidateStillHit &&" in apply_inspect,
        "timeout reuse must be limited to final scans with a fresh candidate under the hotspot",
    )

    screenshot_dir = section(
        pointer,
        "FloatBallAppWM.prototype.getPointerScreenshotDir = function()",
        "FloatBallAppWM.prototype.createPointerScreenshotFile = function()",
    )
    result.require(
        group,
        "N9 screenshot directory is ShortX ToolHub/screenshots",
        "shortx.getShortXDir()" in screenshot_dir
        and '.replace(/\/+$/g, "")' in screenshot_dir
        and 'new java.io.File(base, "ToolHub/screenshots")' in screenshot_dir
        and "dir.mkdirs() !== true" in screenshot_dir
        and "getToolHubAndroidContext" not in screenshot_dir
        and '"/data/screenshots"' not in screenshot_dir,
        "pointer screenshots must use shortx.getShortXDir()/ToolHub/screenshots without app-private fallback",
    )

    save_bitmap = section(
        pointer,
        "FloatBallAppWM.prototype.savePointerBitmapToFile = function(bitmap, file)",
        "FloatBallAppWM.prototype.pointerBitmapFromCaptureBuffer = function(buffer)",
    )
    compress_call = save_bitmap.find("var compressed = bitmap.compress")
    compress_check = save_bitmap.find("if (compressed !== true", compress_call + 1)
    result.require(
        group,
        "W6 bitmap.compress result is checked",
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
        group,
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
        group,
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
        "touch-end capture must return pending while screenshot/save run in a guarded thread",
    )

    apply_ocr = section(
        ocr,
        "function applyAreaOcrResult18",
        "function isAreaOcrTokenCurrent18",
    )
    result.require(
        group,
        "N6 empty OCR result is not success",
        '"AREA_OCR_EMPTY"' in apply_ocr
        and "var hasText = textOk === true && normalizedText.length > 0;" in apply_ocr
        and "obj.ok = hasText;" in apply_ocr
        and "obj.ocrEmpty = textOk === true && !hasText;" in apply_ocr
        and "if (hasText && typeof appObj.publishResultPreview" in apply_ocr
        and "obj.clipboard = false;" in apply_ocr
        and "obj.clipboardOk = false;" in apply_ocr
        and r'.replace(/^\s+|\s+$/g, "");' in async_ocr
        and "var code = !textOk" in async_ocr
        and '"AREA_OCR_EMPTY"' in async_ocr
        and "copyPointerAreaTextToClipboard" not in ocr,
        "empty OCR must use AREA_OCR_EMPTY, skip preview publication, and avoid automatic clipboard writes",
    )

    worker = section(
        pointer,
        "FloatBallAppWM.prototype.runPointerInspectWorker = function(st)",
        "FloatBallAppWM.prototype.preparePointerAccessibilityFinalScan = function(reason)",
    )
    identity_guard = "workerSession !== st.inspectSession || workerH !== st.inspectH || workerHt !== st.inspectHt"
    guarded_reset = "workerSession === st.inspectSession && workerH === st.inspectH && workerHt === st.inspectHt"
    result.require(
        group,
        "W7 inspect worker cleanup is session scoped",
        "finally" in worker
        and worker.count(identity_guard) >= 3
        and guarded_reset in worker,
        "worker finally must validate session, Handler, and HandlerThread identities",
    )

    snapshot_scan = section(
        pointer,
        "FloatBallAppWM.prototype.findPointerTextAtSnapshot = function",
        "FloatBallAppWM.prototype.cancelPointerInspectRetry = function",
    )
    retry_scan = section(
        pointer,
        "FloatBallAppWM.prototype.cancelPointerInspectRetry = function",
        "FloatBallAppWM.prototype.applyPointerInspectResult = function",
    )
    apply_retry = section(
        pointer,
        "FloatBallAppWM.prototype.applyPointerInspectResult = function(pack)",
        "FloatBallAppWM.prototype.runPointerInspectWorker = function(st)",
    )
    schedule_async = section(
        pointer,
        "FloatBallAppWM.prototype.schedulePointerInspectAsync = function",
        "FloatBallAppWM.prototype.updatePointerInspect = function",
    )
    pointer_state = section(
        pointer,
        "FloatBallAppWM.prototype.ensurePointerToolState = function()",
        "FloatBallAppWM.prototype.resetPointerToolState = function",
    )
    active_root_pos = snapshot_scan.find("this.getPointerActiveRoot")
    windows_pos = snapshot_scan.find("a.getWindows")
    result.require(
        group,
        "N7 drag scan prioritizes active application root",
        active_root_pos >= 0
        and windows_pos > active_root_pos
        and "inspectMaxDragMs: 90" in pointer_state
        and "inspectMaxDragNodes: 240" in pointer_state
        and 'reasonText.indexOf("drag_retry") === 0' in snapshot_scan
        and "inspectMaxRetryMs" in snapshot_scan
        and "inspectMaxRetryNodes" in snapshot_scan,
        "drag scans must inspect the active root first and use adaptive drag/retry budgets",
    )
    result.require(
        group,
        "N8 stationary timeout retries preserve valid hover",
        "FloatBallAppWM.prototype.schedulePointerInspectRetry = function(pack)" in retry_scan
        and "pointer stationary inspect retry=" in retry_scan
        and '"drag_retry_" + String(retryNo)' in retry_scan
        and "allowStationary" in schedule_async
        and "allowStationary !== true" in schedule_async
        and "stationaryRetryScheduled = this.schedulePointerInspectRetry(pack) === true" in apply_retry
        and "keepCurrentOnDragTimeout" in apply_retry
        and "stationaryRetryScheduled === true" in apply_retry
        and "this.pointerRectInside(pack.x, pack.y, st.currentRect) === true" in apply_retry
        and "inspectRetryRunnable" in pointer_state,
        "timed-out drag scans must retry at the same hotspot without discarding a still-valid candidate",
    )

    remove_callbacks = section(
        pointer,
        "FloatBallAppWM.prototype.removePointerCallbacks = function(st)",
        "FloatBallAppWM.prototype.closePointerInspectWorker = function(st)",
    )
    result.require(
        group,
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
        group,
        "S1 pointer state reflows with screen",
        all("FloatBallAppWM.prototype." + name in pointer for name in reflow_names)
        and "st.captureRect = this.mapPointerRectForScreenReflow" in pointer_reflow
        and "st.boundRect = this.mapPointerRectForScreenReflow" in pointer_reflow
        and "st.frameLp.width" in pointer_reflow
        and "st.frameLp.height" in pointer_reflow
        and '"screen_reflow:" + String(reason || "")' in pointer_reflow,
        "pointer reflow helpers, mapped state, frame size, or text rescan is missing",
    )
    result.require(
        group,
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
        and "this.resetPointerAreaHold()" in pointer_reflow,
        "text reflow must clear candidates and hover credentials",
    )

    screen_reflow = section(
    position,
    "proto.onScreenChangedReflow = function(reason)",
    "proto.scheduleScreenReflow = function(reason)",
)
    screen_assignment = screen_reflow.find("this.state.screen = { w: newW, h: newH };")
    pointer_hook = screen_reflow.find("this.onPointerScreenChangedReflow(reason, oldW, oldH, newW, newH)")
    result.require(
        group,
        "S1 screen reflow calls pointer hook",
        screen_assignment >= 0 and pointer_hook > screen_assignment,
        "screen reflow must call pointer hook after updating screen size",
    )


def verify_text_release(result, pointer, position, panels, entry):
    group = "text-release"

    for marker in (
        "updatePointerTextStableMotion = function",
        "bindPointerTextHoverCandidate = function",
        "grantPointerTextHoverCredential = function",
        "hasPointerTextHoverCredential = function",
        "textHoverReadyKey",
        "textHoverReadyRect",
        "textHoverReadyAt",
        "lastValidPickReadyAt",
        "var maxAge = 500",
        "TEXT_HOVER_NOT_READY",
        "TEXT_POINTER_OUTSIDE_FRAME",
        "TEXT_PICK_RECENT_CANDIDATE",
        "TEXT_PICK_FINAL_SCAN",
    ):
        result.require(group, "th17 marker " + marker, marker in pointer, "missing marker: " + marker)

    extract = section(
        pointer,
        "FloatBallAppWM.prototype.extractCurrentPointerText = function",
        "FloatBallAppWM.prototype.finishPointerTextPickAfterRelease = function",
    )
    for marker in (
        "pointerTextHotspotInsideRect",
        "hasPointerTextHoverCredential",
        "TEXT_HOVER_NOT_READY",
        "TEXT_POINTER_OUTSIDE_FRAME",
        "completePointerCandidateOnRelease",
    ):
        result.require(group, "extract gate " + marker, marker in extract, "missing extract gate: " + marker)

    completion = section(
        pointer,
        "FloatBallAppWM.prototype.completePointerCandidateOnRelease = function",
        "FloatBallAppWM.prototype.completePointerTextCopy = function",
    )
    result.require(
        group,
        "unified release completion requires hover credential",
        "hasPointerTextHoverCredential" in completion,
        "unified release completion can bypass hover credential",
    )

    stable = section(
        pointer,
        "FloatBallAppWM.prototype.updatePointerTextStableMotion = function",
        "FloatBallAppWM.prototype.bindPointerTextHoverCandidate = function",
    )
    result.require(
        group,
        "text stable hover is independent from OCR hold",
        "areaHoldSince" not in stable and "areaHoldAnchor" not in stable,
        "text stable hover is coupled to OCR hold state",
    )
    result.require(
        group,
        "text credential stays inside drawn frame",
        "textHoverReadyRect" in stable
        and "leave_text_frame" in stable
        and 'resetPointerTextStableHover(st, ts, hp, "leave_text_frame")' in stable,
        "leaving drawn text frame does not reset stable timer",
    )

    binding = section(
        pointer,
        "FloatBallAppWM.prototype.bindPointerTextHoverCandidate = function",
        "FloatBallAppWM.prototype.grantPointerTextHoverCredential = function",
    )
    for marker in (
        "textStableTargetKey",
        "stableTargetChanged",
        'resetPointerTextStableHover(pointerState, ts, hp, "target_changed")',
    ):
        result.require(group, "target identity " + marker, marker in binding, "missing target identity guard: " + marker)

    ready = section(
        pointer,
        "FloatBallAppWM.prototype.isPointerTextHoverReady = function",
        "FloatBallAppWM.prototype.getPointerTextHoverRemainMs = function",
    )
    result.require(
        group,
        "visual ready uses business credential",
        "hasPointerTextHoverCredential" in ready,
        "visual ready is not backed by business credential",
    )
    result.require(
        group,
        "text ready timing is independent from OCR",
        "areaHoldSince" not in ready,
        "text ready state is coupled to OCR timing",
    )

    recent = section(
        pointer,
        "FloatBallAppWM.prototype.getRecentPointerPickForRelease = function",
        "FloatBallAppWM.prototype.restoreRecentPointerPickForRelease = function",
    )
    for marker in ("lastValidPickReadyAt", "lastValidPickHoverSince", "pointerRectInside"):
        result.require(group, "recent candidate " + marker, marker in recent, "missing recent guard: " + marker)
    result.require(
        group,
        "recent candidate uses strict frame hit testing",
        "pointerRectHitScore" not in recent,
        "recent candidate still uses padded hit testing",
    )

    clock = section(position, "function nowPosition()", "function numberOr")
    result.require(
        group,
        "position release state uses wall clock",
        "SystemClock.uptimeMillis" not in clock
        and ("th17Now" in clock or "System.currentTimeMillis" in clock),
        "th19 wall-clock source missing or uptimeMillis remains",
    )

    candidate = section(
        position,
        "proto.pointerCandidateMatchesFinalHotspot = function",
        "proto.cancelPointerSemanticUpdate = function",
    )
    result.require(
        group,
        "final candidate is inside drawn text frame",
        "pointerRectInside" in candidate and "pointerRectHitScore" not in candidate,
        "final candidate is not strictly inside drawn text frame",
    )

    move = section(
        position,
        "proto.movePointerFromRaw = function",
        "proto.setupTouchListener = function",
    )
    result.require(
        group,
        "raw movement updates independent stable hover",
        "updatePointerTextStableMotion(now)" in move,
        "raw pointer movement does not update stable hover",
    )

    finalizer = section(
        position,
        "proto.finishPointerGestureFromRaw = function",
        "proto.movePointerFromRaw = function",
    )
    positions = [
        finalizer.find("cancelPointerSemanticUpdate"),
        finalizer.find("invalidatePointerInspectForRelease"),
        finalizer.find("movePointerFromRaw(rawX, rawY, true, true)"),
        finalizer.find("pointerCandidateMatchesFinalHotspot"),
        finalizer.find("getRecentPointerPickForRelease"),
        finalizer.find('schedulePointerInspectAsync(true, "release_final", true)'),
    ]
    result.require(
        group,
        "safe release ordering",
        not any(pos < 0 for pos in positions) and positions == sorted(positions),
        "unsafe release ordering",
    )
    result.require(
        group,
        "confirmed candidate uses unified credential extraction",
        "extractCurrentPointerText(true, st.releaseTs)" in finalizer,
        "confirmed candidate does not use unified extraction",
    )
    result.require(
        group,
        "recent candidate uses unified release completion",
        "completePointerCandidateOnRelease" in finalizer,
        "recent candidate does not use unified release completion",
    )

    for forbidden in (
        "getRecentReadyPointerPick",
        "restoreRecentReadyPointerPick",
        "syncPointerTextHoverFromStableHold",
        "storeReadyPointerSnapshot",
        "getReadyPointerSnapshotForRelease",
        "finishReadyPointerSnapshot",
        "__toolHubReadyTextSnapshot",
        "TEXT_PICK_READY_SNAPSHOT",
        "ready_visual_snapshot",
    ):
        result.require(
            group,
            "obsolete symbol absent " + forbidden,
            forbidden not in pointer and forbidden not in position,
            "obsolete ready snapshot chain remains: " + forbidden,
        )

    result.require(
        group,
        "settings description matches hover credential",
        "同一文字边框内稳定悬停达到设定时间后，松手才能取字" in panels,
        "pointer setting description does not match behavior",
    )
    result.require(
        group,
        "entry-level runtime pointer patch is absent",
        "指针无障碍取字提交链修复" not in entry
        and "installToolHubPointerAccessibilityTextReleaseFix" not in entry,
        "entry-level runtime pointer patch remains",
    )


def verify_pointer_core(result, pointer, ocr):
    group = "pointer-core"

    for marker in (
        "rememberPointerValidPick",
        "getRecentPointerPickForRelease",
        "restoreRecentPointerPickForRelease",
        "completePointerCandidateOnRelease",
        "completePointerTextResult",
        "completePointerTextCopy",
        "publishResultPreview",
        "data.clipboardAccepted = false",
        "data.previewQueued",
        "accessibility_current",
        "small_area_fallback",
        "areaHoldDelay: 2000",
    ):
        result.require(group, "core marker " + marker, marker in pointer, "missing pointer core marker: " + marker)

    extract = section(
        pointer,
        "FloatBallAppWM.prototype.extractCurrentPointerText = function",
        "FloatBallAppWM.prototype.finishPointerTextPickAfterRelease = function",
    )
    result.require(
        group,
        "extract reports preview instead of clipboard completion",
        "copyPointerTextToClipboard(textValue)" not in extract
        and "preview: previewQueued" in extract
        and "clipboard: false" in extract,
        "extractCurrentPointerText must report preview state and keep clipboard false",
    )
    result.require(
        group,
        "extract restores recent candidate",
        "getRecentPointerPickForRelease" in extract,
        "extractCurrentPointerText does not restore recent candidate",
    )
    result.require(
        group,
        "extract uses unified release completion",
        "completePointerCandidateOnRelease(" in extract,
        "extractCurrentPointerText bypasses unified completion",
    )

    complete = section(
        pointer,
        "FloatBallAppWM.prototype.completePointerTextResult = function",
        "FloatBallAppWM.prototype.ensurePointerToolState = function",
    )
    result.require(
        group,
        "accessibility success publishes preview without automatic copy",
        "ok: true" in complete
        and "publishResultPreview" in complete
        and "clipboard: false" in complete
        and "copyPointerTextToClipboard(text)" not in complete,
        "text success must publish a preview and must not write the clipboard",
    )
    result.require(
        group,
        "legacy completion alias delegates to result completion",
        "FloatBallAppWM.prototype.completePointerTextCopy" in complete
        and "return this.completePointerTextResult" in complete,
        "legacy completion alias must delegate without restoring clipboard behavior",
    )

    recent = section(
        pointer,
        "FloatBallAppWM.prototype.rememberPointerValidPick = function",
        "FloatBallAppWM.prototype.completePointerTextResult = function",
    )
    for marker in (
        "lastValidPickText",
        "lastValidPickRect",
        "lastValidPickSession",
        "pointerRectInside",
    ):
        result.require(group, "recent cache " + marker, marker in recent, "recent cache missing: " + marker)

    fallback = section(
        pointer,
        "FloatBallAppWM.prototype.finishPointerFallbackText = function",
        "FloatBallAppWM.prototype.updatePointerAreaSelection = function",
    )
    result.require(
        group,
        "small-area fallback uses unified result completion",
        "completePointerTextResult(" in fallback
        and "preview: previewQueued" in fallback
        and "clipboard: false" in fallback,
        "small-area fallback must publish the same preview result as normal text pick",
    )

    result.require(
        group,
        "OCR success never writes clipboard automatically",
        "copyPointerAreaTextToClipboard" not in ocr
        and "copyClipboard18" not in ocr
        and "obj.clipboard = false" in ocr
        and "publishResultPreview" in ocr,
        "OCR must publish preview instead of copying automatically",
    )

    for forbidden in (
        "installFixedEdgePointer18",
        "schedulePointerMoveRaw18",
        "fixBallToEdge18",
        "pickBallSide18",
        "启动反馈：子模块加载完成",
    ):
        result.require(
            group,
            "OCR residue absent " + forbidden,
            forbidden not in ocr,
            "th_18 still contains fixed-edge or timing residue: " + forbidden,
        )
    result.require(
        group,
        "th18 performance extension remains",
        "installPointerPerf18(proto);" in ocr,
        "th_18 performance extension missing",
    )
    result.require(
        group,
        "th18 OCR extension remains",
        "pointer area_ocr patch installed" in ocr,
        "th_18 OCR extension missing",
    )


def verify_pointer_draw_visibility(result, pointer):
    group = "pointer-draw"
    state = section(
        pointer,
        "FloatBallAppWM.prototype.ensurePointerToolState = function()",
        "FloatBallAppWM.prototype.resetPointerToolState = function",
    )
    reset = section(
        pointer,
        "FloatBallAppWM.prototype.resetPointerToolState = function",
        "FloatBallAppWM.prototype.setPointerToolResult = function",
    )
    close = section(
        pointer,
        "FloatBallAppWM.prototype.closePointerTool = function",
        "FloatBallAppWM.prototype.pointerPositionFromBall = function",
    )
    canvas = section(
        pointer,
        "FloatBallAppWM.prototype.recordPointerDrawFailure = function",
        "FloatBallAppWM.prototype.createPointerLayoutParams = function",
    )
    show = section(
        pointer,
        "FloatBallAppWM.prototype.showPointerWindow = function",
        "FloatBallAppWM.prototype.getPointerHotspot = function",
    )
    move = section(
        pointer,
        "FloatBallAppWM.prototype.schedulePointerMove = function",
        "FloatBallAppWM.prototype.resetPointerAreaHold = function",
    )
    reflow = section(
        pointer,
        "FloatBallAppWM.prototype.onPointerScreenChangedReflow = function",
        "FloatBallAppWM.prototype.recordPointerDrawFailure = function",
    )

    result.require(
        group,
        "draw failures are observable",
        "pointer draw fail stage=" in canvas
        and "recordPointerDrawFailure(st, stage, drawError)" in canvas
        and "catch (drawError) {}" not in canvas,
        "pointer onDraw must log one scoped failure instead of swallowing it",
    )
    result.require(
        group,
        "fallback pointer survives rich draw failure",
        "drawPointerFallback" in canvas
        and "st.drawFallbackMode = true;" in canvas
        and 'recordPointerDrawFailure(st, "fallback", fallbackError)' in canvas
        and "if (st.drawFallbackMode !== true)" in canvas,
        "rich rendering must fall back to a shadow-free pointer and skip software layer during recovery",
    )
    result.require(
        group,
        "shadow failure does not abort pointer body",
        'recordPointerDrawFailure(st, "shadow", eShadow)' in canvas
        and "st.drawShadowDisabled = true;" in canvas
        and canvas.find('recordPointerDrawFailure(st, "shadow", eShadow)')
        < canvas.find('stage = "accent_fill"'),
        "shadow setup must be isolated before the pointer body is drawn",
    )
    result.require(
        group,
        "first frame has one-shot self heal",
        "schedulePointerDrawHealthCheck" in canvas
        and "rebuildPointerWindowForDraw" in canvas
        and "drawRecoveryTried" in state
        and "drawHealthRunnable" in state
        and "first frame missing, rebuild fallback window" in canvas,
        "pointer state must track first-frame health and rebuild once in fallback mode",
    )
    result.require(
        group,
        "show move and reflow request redraw",
        "requestPointerRedraw(st);" in show
        and "schedulePointerDrawHealthCheck(st, 120);" in show
        and "self.requestPointerRedraw(st);" in move
        and "this.requestPointerRedraw(st);" in reflow,
        "pointer must request a frame after addView, movement, and screen reflow",
    )
    result.require(
        group,
        "detached pointer window is recreated",
        'updateMessage.indexOf("not attached")' in move
        and 'updateMessage.indexOf("Invalid display")' in move
        and 'updateMessage.indexOf("BadTokenException")' in move
        and "self.showPointerWindow(st)" in move,
        "updateViewLayout attachment failures must recreate the pointer window",
    )
    result.require(
        group,
        "draw health callbacks are session scoped",
        "drawHealthToken" in state
        and "removeCallbacks(st.drawHealthRunnable)" in reset
        and "removeCallbacks(st.drawHealthRunnable)" in close,
        "reset and close must cancel stale draw-health callbacks",
    )


def main():
    required = [
        POINTER,
        POINTER_OCR,
        POSITION,
        ANIMATION,
        PANELS,
        ENTRY,
        VERIFY_MANIFEST,
    ]
    missing = [str(path.relative_to(ROOT)) for path in required if not path.exists()]
    if missing:
        print("FAIL missing files: " + ", ".join(missing))
        return 1

    pointer = read_text(POINTER)
    ocr = read_text(POINTER_OCR)
    position = read_text(POSITION)
    animation = read_text(ANIMATION)
    panels = read_text(PANELS)
    entry = read_text(ENTRY)
    result = CheckResult()

    verify_issue_85(result, pointer, ocr, position, animation)
    verify_text_release(result, pointer, position, panels, entry)
    verify_pointer_core(result, pointer, ocr)
    verify_pointer_draw_visibility(result, pointer)
    verify_manifest(result)

    for name in result.passed:
        print("PASS " + name)
    if result.failed:
        for name, detail in result.failed:
            print("FAIL " + name + ": " + detail)
        print("FAIL pointer_regressions passed=%d failed=%d" % (len(result.passed), len(result.failed)))
        return 1

    issue_count = sum(1 for name in result.passed if name.startswith("issue-85 /"))
    release_count = sum(1 for name in result.passed if name.startswith("text-release /"))
    core_count = sum(1 for name in result.passed if name.startswith("pointer-core /"))
    draw_count = sum(1 for name in result.passed if name.startswith("pointer-draw /"))
    print(
        "OK pointer_regressions issue85=%d text_release=%d pointer_core=%d pointer_draw=%d total=%d"
        % (issue_count, release_count, core_count, draw_count, len(result.passed))
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
