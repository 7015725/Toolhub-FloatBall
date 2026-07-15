from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, text):
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s expected once, found %d" % (label, count))
    return text.replace(old, new, 1)


def replace_count(text, old, new, expected, label):
    count = text.count(old)
    if count != expected:
        raise SystemExit("%s expected %d, found %d" % (label, expected, count))
    return text.replace(old, new)


pointer_path = "code/th_17_pointer.js"
pointer = read(pointer_path)
pointer = replace_once(pointer, "// @version 1.2.4", "// @version 1.2.5", "th17 version")
pointer = replace_once(
    pointer,
    "      drawHealthRunnable: null,\n      drawHealthToken: 0\n",
    "      drawHealthRunnable: null,\n      drawHealthToken: 0,\n      pointerRootToken: 0\n",
    "pointer root token state",
)
pointer = replace_count(
    pointer,
    "  st.drawHealthToken = Number(st.drawHealthToken || 0) + 1;\n",
    "  st.drawHealthToken = Number(st.drawHealthToken || 0) + 1;\n"
    "  st.pointerRootToken = Number(st.pointerRootToken || 0) + 1;\n",
    2,
    "reset and close root invalidation",
)
pointer = replace_once(
    pointer,
    "  var oldRoot = pointerState.root;\n  var removed = !pointerState.added || !oldRoot;\n",
    "  var oldRoot = pointerState.root;\n"
    "  pointerState.pointerRootToken = Number(pointerState.pointerRootToken || 0) + 1;\n"
    "  var removed = !pointerState.added || !oldRoot;\n",
    "rebuild root invalidation",
)
pointer = replace_once(
    pointer,
    "FloatBallAppWM.prototype.createPointerCanvasView = function(st) {\n"
    "  var self = this;\n"
    "  st.paint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);\n"
    "  var PointerView = new JavaAdapter(android.view.View, {\n",
    "FloatBallAppWM.prototype.createPointerCanvasView = function(st) {\n"
    "  var self = this;\n"
    "  st.pointerRootToken = Number(st.pointerRootToken || 0) + 1;\n"
    "  var rootToken = Number(st.pointerRootToken || 0);\n"
    "  var pointerPaint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);\n"
    "  st.paint = pointerPaint;\n"
    "  var PointerView = new JavaAdapter(android.view.View, {\n",
    "pointer canvas private paint",
)
pointer = replace_once(
    pointer,
    "    onDraw: function(canvas) {\n"
    "      var stage = \"prepare\";\n"
    "      var drawn = false;\n"
    "      st.drawCount = Number(st.drawCount || 0) + 1;\n"
    "      try {\n"
    "        var p = st.paint;\n",
    "    onDraw: function(canvas) {\n"
    "      if (!st.active || st.closed || st.root !== this ||\n"
    "          Number(st.pointerRootToken || 0) !== rootToken) return;\n"
    "      var stage = \"prepare\";\n"
    "      var drawn = false;\n"
    "      st.drawCount = Number(st.drawCount || 0) + 1;\n"
    "      try {\n"
    "        var p = pointerPaint;\n",
    "pointer stale draw guard",
)
write(pointer_path, pointer)

ocr_path = "code/th_18_pointer_ocr.js"
ocr = read(ocr_path)
ocr = replace_once(ocr, "// @version 1.1.0", "// @version 1.1.1", "th18 version")
marker = """  function pickOcrRect18(obj, ret) {
    var rect = null;
    try { if (obj && obj.data && obj.data.captureRect) rect = normalizeRect18(obj.data.captureRect); } catch(e0) {}
    try { if (!rect && obj && obj.captureRect) rect = normalizeRect18(obj.captureRect); } catch(e1) {}
    try { if (!rect && obj && obj.data && obj.data.visualRect) rect = normalizeRect18(obj.data.visualRect); } catch(e2) {}
    try { if (!rect && obj && obj.visualRect) rect = normalizeRect18(obj.visualRect); } catch(e3) {}
    try { if (!rect && ret && ret.captureRect) rect = normalizeRect18(ret.captureRect); } catch(e4) {}
    try { if (!rect && ret && ret.visualRect) rect = normalizeRect18(ret.visualRect); } catch(e5) {}
    return rect;
  }
"""
helpers = marker + """
  function isUsableScreenshotPath18(path) {
    var value = "";
    try { value = String(path || "").replace(/^\\s+|\\s+$/g, ""); } catch(e0) { value = ""; }
    if (!value || value.charAt(0) !== "/") return false;
    try {
      var file = new java.io.File(value);
      return file.isFile() === true;
    } catch(e1) {}
    return false;
  }

  function pickScreenshotPath18(obj, ret) {
    var path = "";
    try {
      path = String(
        (obj && obj.screenshotFilePath) ||
        (obj && obj.data && obj.data.path) ||
        (ret && ret.screenshotFilePath) ||
        ""
      );
    } catch(e0) { path = ""; }
    path = path.replace(/^\\s+|\\s+$/g, "");
    return isUsableScreenshotPath18(path) ? path : "";
  }

  function canDispatchAreaOcr18(st, obj, ret) {
    if (!st || !obj) return false;
    if (ret && ret.fallback === true) return false;
    if (String(obj.type || "") !== "area_capture") return false;
    if (String(obj.code || "") !== "AREA_CAPTURE_SUCCESS") return false;
    return true;
  }
"""
ocr = replace_once(ocr, marker, helpers, "OCR dispatch helpers")
ocr = replace_once(
    ocr,
    "      var rr = cloneRect18(rect);\n"
    "      var screenshotPath = String(path || \"\");\n\n"
    "      // 新 token 先使旧任务失效，再清理旧 worker 和 timeout。\n",
    "      var rr = cloneRect18(rect);\n"
    "      var screenshotPath = String(path || \"\").replace(/^\\s+|\\s+$/g, \"\");\n"
    "      if (!rr || !isUsableScreenshotPath18(screenshotPath)) {\n"
    "        try {\n"
    "          safeLog(appObj.L, 'w',\n"
    "            \"pointer area_ocr dispatch skipped reason=\" +\n"
    "            (!rr ? \"invalid_rect\" : \"invalid_path\") +\n"
    "            \" rect=\" + rectKey18(rr) +\n"
    "            \" path=\" + screenshotPath);\n"
    "        } catch(eSkipLog) {}\n"
    "        return false;\n"
    "      }\n\n"
    "      // 新 token 先使旧任务失效，再清理旧 worker 和 timeout。\n",
    "OCR preflight validation",
)
ocr = replace_once(
    ocr,
    """        var normalRet = oldStartPointerTool.call(this, options);
        try { applyPerfDefaults18(this); } catch(ePerfStart) {}
        return normalRet;
""",
    """        var normalRet = oldStartPointerTool.call(this, options);
        try {
          var normalSt = this.ensurePointerToolState ? this.ensurePointerToolState() : null;
          if (normalSt) {
            normalSt.areaOcrRequested = false;
            normalSt.areaOcrSource = "";
          }
          applyPerfDefaults18(this);
        } catch(ePerfStart) {}
        return normalRet;
""",
    "clear stale OCR request on normal start",
)
old_completed = """          var code = String(obj.code || "");
          if (
            code === "AREA_CAPTURE_TIMEOUT" ||
            code === "AREA_CAPTURE_WORKER_FAILED"
          ) {
            return oldRet;
          }

          var wantText = !!(
            st.areaOcrRequested === true ||
            String(obj.type || "") === "area_capture"
          );
          if (!wantText) return oldRet;

          var path = "";
          try {
            path = String(
              obj.screenshotFilePath ||
              obj.value ||
              (obj.data && obj.data.path) ||
              ""
            );
          } catch (ePathCompleted) {
            path = "";
          }

          var rect = pickOcrRect18(obj, ret);
"""
new_completed = """          var wantText = !!(
            st.areaOcrRequested === true ||
            String(obj.type || "") === "area_capture"
          );
          if (!wantText) return oldRet;
          if (!canDispatchAreaOcr18(st, obj, ret)) return oldRet;

          var path = pickScreenshotPath18(obj, ret);
          var rect = pickOcrRect18(obj, ret);
          if (!path || !rect) {
            try {
              safeLog(this.L, 'w',
                "pointer area_ocr completion skipped reason=" +
                (!rect ? "invalid_rect" : "invalid_path") +
                " token=" + String(token) +
                " rect=" + rectKey18(rect) +
                " path=" + path);
            } catch(eSkipCompletedLog) {}
            return oldRet;
          }
"""
ocr = replace_once(ocr, old_completed, new_completed, "async capture OCR whitelist")
ocr = replace_once(
    ocr,
    """        if (!wantText) return ret;
        try {
""",
    """        if (!wantText) return ret;
        if (ret && ret.fallback === true) return ret;
        try {
""",
    "fallback OCR short circuit",
)
ocr = replace_once(
    ocr,
    """          var obj = st && st.lastResult ? st.lastResult : null;
          if (!obj) obj = {};
          var path = "";
          try { path = String(obj.screenshotFilePath || obj.value || (obj.data && obj.data.path) || ""); } catch(ePath) { path = ""; }
          var rect = pickOcrRect18(obj, ret);

          // W3：截图完成后立即返回触摸结束链路，OCR 放入独立 HandlerThread。
""",
    """          var obj = st && st.lastResult ? st.lastResult : null;
          if (!obj) obj = {};
          if (!canDispatchAreaOcr18(st, obj, ret)) return ret;
          var path = pickScreenshotPath18(obj, ret);
          var rect = pickOcrRect18(obj, ret);
          if (!path || !rect) {
            try {
              safeLog(this.L, 'w',
                "pointer area_ocr sync dispatch skipped reason=" +
                (!rect ? "invalid_rect" : "invalid_path") +
                " rect=" + rectKey18(rect) +
                " path=" + path);
            } catch(eSkipSyncLog) {}
            return ret;
          }

          // W3：截图完成后立即返回触摸结束链路，OCR 放入独立 HandlerThread。
""",
    "sync OCR whitelist",
)
write(ocr_path, ocr)

verify_path = "scripts/verify_pointer_regressions.py"
verify = read(verify_path)
ocr_check_anchor = """    result.require(
        group,
        "OCR success never writes clipboard automatically",
        "copyPointerAreaTextToClipboard" not in ocr
        and "copyClipboard18" not in ocr
        and "obj.clipboard = false" in ocr
        and "publishResultPreview" in ocr,
        "OCR must publish preview instead of copying automatically",
    )
"""
ocr_check = ocr_check_anchor + """    result.require(
        group,
        "OCR dispatch requires successful screenshot artifacts",
        "canDispatchAreaOcr18" in ocr
        and 'String(obj.type || "") !== "area_capture"' in ocr
        and 'String(obj.code || "") !== "AREA_CAPTURE_SUCCESS"' in ocr
        and "pickScreenshotPath18" in ocr
        and "obj.value ||" not in ocr
        and "ret.fallback === true" in ocr
        and "pointer area_ocr dispatch skipped reason=" in ocr,
        "OCR must reject fallback text and invalid screenshot parameters before mutating result state",
    )
"""
verify = replace_once(verify, ocr_check_anchor, ocr_check, "OCR regression contract")
draw_anchor = """    result.require(
        group,
        "draw failures are observable",
        "pointer draw fail stage=" in canvas
        and "recordPointerDrawFailure(st, stage, drawError)" in canvas
        and "catch (drawError) {}" not in canvas,
        "pointer onDraw must log one scoped failure instead of swallowing it",
    )
"""
draw_check = draw_anchor + """    result.require(
        group,
        "stale pointer roots cannot draw with cleared shared paint",
        "pointerRootToken" in state
        and "st.root !== this" in canvas
        and "Number(st.pointerRootToken || 0) !== rootToken" in canvas
        and "var p = pointerPaint;" in canvas
        and "var p = st.paint;" not in canvas
        and "st.pointerRootToken = Number(st.pointerRootToken || 0) + 1;" in close,
        "pointer Canvas roots must use a private Paint and reject late onDraw callbacks",
    )
"""
verify = replace_once(verify, draw_anchor, draw_check, "pointer lifecycle regression contract")
write(verify_path, verify)
