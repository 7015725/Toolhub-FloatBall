#!/usr/bin/env python3
"""将指针取字剪贴板完成链改为主线程同步写入。"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POINTER = ROOT / "code" / "th_17_pointer.js"
VERIFY = ROOT / "scripts" / "verify_ball_position_state.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s: expected one match, got %d" % (label, count))
    return text.replace(old, new, 1)


def replace_between(text, start, end, replacement, label):
    a = text.find(start)
    b = text.find(end, a + len(start)) if a >= 0 else -1
    if a < 0 or b < 0 or b <= a:
        raise SystemExit(label + ": section markers not found")
    return text[:a] + replacement + text[b:]


def patch_pointer():
    text = POINTER.read_text(encoding="utf-8")
    text = replace_once(text, "// @version 1.1.26", "// @version 1.1.27", "pointer version")

    clipboard_block = r'''FloatBallAppWM.prototype.getPointerClipboardContexts = function() {
  var out = [];
  function add(ctx) {
    if (!ctx) return;
    for (var i = 0; i < out.length; i++) {
      try { if (out[i] === ctx) return; } catch (eSame) {}
    }
    out.push(ctx);
    try {
      if (ctx.getApplicationContext) {
        var appCtx = ctx.getApplicationContext();
        if (appCtx && appCtx !== ctx) add(appCtx);
      }
    } catch (eAppCtx) {}
  }
  try { if (typeof context !== "undefined" && context) add(context); } catch (e0) {}
  try { if (typeof getToolHubAndroidContext === "function") add(getToolHubAndroidContext()); } catch (e1) {}
  try { add(android.app.ActivityThread.currentApplication()); } catch (e2) {}
  try { add(android.app.AppGlobals.getInitialApplication()); } catch (e3) {}
  return out;
};

FloatBallAppWM.prototype.runPointerClipboardOnMain = function(fn, timeoutMs) {
  if (!fn) return { ok: false, value: null, error: "empty clipboard task" };
  try {
    var mainLooper = android.os.Looper.getMainLooper();
    var myLooper = android.os.Looper.myLooper();
    if (mainLooper !== null && myLooper !== null && mainLooper === myLooper) {
      return { ok: true, value: fn(), error: "" };
    }
  } catch (eLooper) {}

  var box = { ok: false, value: null, error: "" };
  var latch = null;
  try {
    latch = new java.util.concurrent.CountDownLatch(1);
    var mainHandler = new android.os.Handler(android.os.Looper.getMainLooper());
    var posted = mainHandler.post(new java.lang.Runnable({ run: function() {
      try {
        box.value = fn();
        box.ok = true;
      } catch (eRun) {
        box.error = String(eRun);
      } finally {
        try { latch.countDown(); } catch (eCount) {}
      }
    }}));
    if (posted !== true && String(posted) !== "true") {
      return { ok: false, value: null, error: "clipboard main-thread post failed" };
    }
    var waitMs = Math.max(200, Number(timeoutMs || 1800));
    var done = latch.await(waitMs, java.util.concurrent.TimeUnit.MILLISECONDS);
    if (!done) return { ok: false, value: null, error: "clipboard main-thread timeout" };
    if (!box.ok) return { ok: false, value: null, error: String(box.error || "clipboard main-thread task failed") };
    return { ok: true, value: box.value, error: "" };
  } catch (eWait) {
    return { ok: false, value: null, error: String(eWait) };
  }
};

FloatBallAppWM.prototype.readPointerClipboardText = function(cm, ctx) {
  if (!cm) return { available: false, value: "", error: "ClipboardManager unavailable" };
  var value = "";
  try {
    var clip = cm.getPrimaryClip();
    if (clip && clip.getItemCount && clip.getItemCount() > 0) {
      var item = clip.getItemAt(0);
      var chars = null;
      try { chars = item.getText(); } catch (eText) { chars = null; }
      if (chars === null || chars === undefined) {
        try { chars = item.coerceToText(ctx); } catch (eCoerce) { chars = null; }
      }
      if (chars !== null && chars !== undefined) value = String(chars);
    }
    return { available: true, value: value, error: "" };
  } catch (eRead) {
    return { available: false, value: "", error: String(eRead) };
  }
};

FloatBallAppWM.prototype.writePointerClipboardMainSync = function(textValue) {
  var text = String(textValue === null || textValue === undefined ? "" : textValue);
  if (!text) return { ok: false, accepted: false, method: "", error: "empty text" };
  var self = this;
  var run = this.runPointerClipboardOnMain(function() {
    var contexts = self.getPointerClipboardContexts();
    var errors = [];
    for (var i = 0; i < contexts.length; i++) {
      var ctx = contexts[i];
      var cm = null;
      var pkg = "";
      try { pkg = String(ctx.getPackageName ? ctx.getPackageName() : ""); } catch (ePkg) { pkg = ""; }
      try { cm = ctx.getSystemService(android.content.Context.CLIPBOARD_SERVICE); }
      catch (eManager) { errors.push("manager[" + pkg + "]=" + String(eManager)); cm = null; }
      if (!cm) continue;

      var method = "setPrimaryClip";
      var accepted = false;
      var writeError = "";
      try {
        var clip = android.content.ClipData.newPlainText("ToolHub指针取字", text);
        cm.setPrimaryClip(clip);
        accepted = true;
      } catch (ePrimary) {
        writeError = String(ePrimary);
        try {
          if (cm.setText) {
            cm.setText(text);
            method = "setText";
            accepted = true;
            writeError = "";
          }
        } catch (eLegacy) {
          writeError = writeError + (writeError ? "; " : "") + String(eLegacy);
        }
      }

      if (accepted) {
        var read = self.readPointerClipboardText(cm, ctx);
        var observed = String(read && read.value || "");
        return {
          ok: true,
          accepted: true,
          method: method,
          contextPackage: pkg,
          readbackAvailable: !!(read && read.available === true),
          readbackMatched: !!(read && read.available === true && observed === text),
          observedLength: observed.length,
          readbackError: String(read && read.error || ""),
          error: ""
        };
      }
      errors.push("write[" + pkg + "]=" + String(writeError || "failed"));
    }
    return {
      ok: false,
      accepted: false,
      method: "",
      contextPackage: "",
      readbackAvailable: false,
      readbackMatched: false,
      observedLength: 0,
      readbackError: "",
      error: errors.length > 0 ? errors.join(" | ") : "no available clipboard context"
    };
  }, 1800);

  if (!run || run.ok !== true) {
    return {
      ok: false,
      accepted: false,
      method: "",
      contextPackage: "",
      readbackAvailable: false,
      readbackMatched: false,
      observedLength: 0,
      readbackError: "",
      error: String(run && run.error || "clipboard main-thread execution failed")
    };
  }
  return run.value || { ok: false, accepted: false, method: "", error: "empty clipboard result" };
};

FloatBallAppWM.prototype.copyPointerTextToClipboard = function(textValue) {
  var result = this.writePointerClipboardMainSync(textValue);
  try {
    var st = this.ensurePointerToolState();
    st.lastClipboardAttempt = result || null;
  } catch (eState) {}
  return !!(result && result.ok === true && result.accepted === true);
};

FloatBallAppWM.prototype.completePointerTextCopy = function(textValue, rect, successCode, extraData) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed) return false;
  var text = String(textValue === null || textValue === undefined ? "" : textValue);
  if (!text || !rect) return false;

  var copyResult = this.writePointerClipboardMainSync(text);
  st.lastClipboardAttempt = copyResult || null;
  var data = {};
  try {
    if (extraData) {
      for (var k in extraData) data[k] = extraData[k];
    }
  } catch (eData) {}
  data.clipboardMethod = String(copyResult && copyResult.method || "");
  data.clipboardContextPackage = String(copyResult && copyResult.contextPackage || "");
  data.clipboardReadbackAvailable = !!(copyResult && copyResult.readbackAvailable === true);
  data.clipboardReadbackMatched = !!(copyResult && copyResult.readbackMatched === true);
  data.clipboardObservedLength = Number(copyResult && copyResult.observedLength || 0);
  data.clipboardReadbackError = String(copyResult && copyResult.readbackError || "");

  if (copyResult && copyResult.ok === true && copyResult.accepted === true) {
    this.setPointerToolResult({
      ok: true,
      type: "text_pick",
      code: String(successCode || "TEXT_PICK_SUCCESS"),
      message: "取字并复制成功",
      value: text,
      clipboard: true,
      clipboardAccepted: true,
      clipboardVerified: copyResult.readbackMatched === true,
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      data: data
    });
    this.toast("已复制: " + text);
    this.closePointerTool("已复制到剪贴板", true);
    return true;
  }

  data.clipboardError = String(copyResult && copyResult.error || "clipboard write failed");
  this.setPointerToolResult({
    ok: false,
    type: "pointer_error",
    code: "CLIPBOARD_WRITE_FAILED",
    message: "已识别文字，但复制到剪贴板失败",
    value: text,
    clipboard: false,
    clipboardAccepted: false,
    clipboardVerified: false,
    rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
    data: data
  });
  this.toast("已识别文字，但复制失败");
  this.closePointerTool("复制到剪贴板失败", true);
  return false;
};

'''
    text = replace_between(
        text,
        "FloatBallAppWM.prototype.getPointerClipboardContexts = function() {",
        "FloatBallAppWM.prototype.ensurePointerToolState = function() {",
        clipboard_block,
        "clipboard block",
    )

    text = text.replace(
        "  st.clipboardCopyToken = Number(st.clipboardCopyToken || 0) + 1;\n  st.clipboardCopyPending = false;\n",
        "",
    )

    fallback_start = "FloatBallAppWM.prototype.finishPointerFallbackText = function() {"
    fallback_end = "FloatBallAppWM.prototype.updatePointerAreaSelection = function(x, y) {"
    fallback = r'''FloatBallAppWM.prototype.finishPointerFallbackText = function() {
  var st = this.ensurePointerToolState();
  if (!st.boundText || !st.boundRect) {
    this.setPointerToolResult({ ok: false, type: "cancel", code: "AREA_TOO_SMALL", message: "框选区域过小", value: "", data: {} });
    this.toast("框选区域过小");
    this.closePointerTool("框选区域过小", true);
    return { ok: false, err: "框选区域过小", code: "AREA_TOO_SMALL" };
  }
  var rect = th17RectObj(st.boundRect);
  var textValue = String(st.boundText || "");
  st.currentText = textValue;
  st.currentRect = rect;
  st.currentKey = String(st.boundKey || "");
  try { this.showPointerAreaFrame(rect, "text_hit"); } catch (eFrame) {}
  var completed = this.completePointerTextCopy(
    textValue,
    rect,
    "TEXT_PICK_FALLBACK_FROM_SMALL_AREA",
    { source: "small_area_fallback", fallback: true }
  );
  return { ok: completed === true, text: textValue, clipboard: completed === true, fallback: true };
};

'''
    text = replace_between(text, fallback_start, fallback_end, fallback, "small-area fallback")

    required = (
        "// @version 1.1.27",
        "runPointerClipboardOnMain",
        "writePointerClipboardMainSync",
        "CountDownLatch",
        "android.os.Looper.getMainLooper()",
        "clipboardAccepted: true",
        "clipboardReadbackMatched",
        "CLIPBOARD_WRITE_FAILED",
        "source: \"small_area_fallback\"",
    )
    for marker in required:
        if marker not in text:
            raise SystemExit("pointer required marker missing: " + marker)
    for forbidden in (
        "copyPointerTextToClipboardVerified",
        "clipboardCopyToken",
        "clipboardCopyPending",
        "copyResult.verified === true",
    ):
        if forbidden in text:
            raise SystemExit("pointer obsolete clipboard marker remains: " + forbidden)

    POINTER.write_text(text, encoding="utf-8")


def patch_verify():
    text = VERIFY.read_text(encoding="utf-8")
    old = '''    for marker in (
        "// @version 1.1.26",
        "copyPointerTextToClipboardVerified",
        "completePointerTextCopy",
        "CLIPBOARD_WRITE_FAILED",
        "clipboardVerified: true",
        "clipboardCopyToken",
        "accessibility_current",
    ):
        if marker not in pointer_core:
            fail("verified clipboard flow missing: " + marker)
'''
    new = '''    for marker in (
        "// @version 1.1.27",
        "runPointerClipboardOnMain",
        "android.os.Looper.getMainLooper()",
        "java.util.concurrent.CountDownLatch",
        "writePointerClipboardMainSync",
        "completePointerTextCopy",
        "clipboardAccepted: true",
        "clipboardReadbackMatched",
        "CLIPBOARD_WRITE_FAILED",
        "accessibility_current",
        "small_area_fallback",
    ):
        if marker not in pointer_core:
            fail("main-thread clipboard flow missing: " + marker)
'''
    text = replace_once(text, old, new, "verify clipboard markers")

    anchor = '''    if "completePointerTextCopy(" not in extract_section:
        fail("extractCurrentPointerText does not use verified clipboard completion")
'''
    addition = anchor + '''    clipboard_section = section(
        pointer_core,
        "FloatBallAppWM.prototype.getPointerClipboardContexts = function",
        "FloatBallAppWM.prototype.ensurePointerToolState = function",
    )
    for forbidden in (
        "copyPointerTextToClipboardVerified",
        "clipboardCopyToken",
        "clipboardCopyPending",
        "copyResult.verified === true",
        "st.handler.post",
        "this.state.h",
    ):
        if forbidden in clipboard_section:
            fail("obsolete/background clipboard flow remains: " + forbidden)
    main_runner = section(
        pointer_core,
        "FloatBallAppWM.prototype.runPointerClipboardOnMain = function",
        "FloatBallAppWM.prototype.readPointerClipboardText = function",
    )
    if "new android.os.Handler(android.os.Looper.getMainLooper())" not in main_runner:
        fail("clipboard task is not explicitly posted to Android main looper")
    writer = section(
        pointer_core,
        "FloatBallAppWM.prototype.writePointerClipboardMainSync = function",
        "FloatBallAppWM.prototype.copyPointerTextToClipboard = function",
    )
    accepted_at = writer.index("cm.setPrimaryClip(clip)")
    return_at = writer.index("accepted: true", accepted_at)
    if return_at <= accepted_at:
        fail("clipboard success is not based on accepted main-thread write")
    complete = section(
        pointer_core,
        "FloatBallAppWM.prototype.completePointerTextCopy = function",
        "FloatBallAppWM.prototype.ensurePointerToolState = function",
    )
    if "copyResult && copyResult.ok === true && copyResult.accepted === true" not in complete:
        fail("text completion still depends on clipboard readback instead of accepted write")
    fallback = section(
        pointer_core,
        "FloatBallAppWM.prototype.finishPointerFallbackText = function",
        "FloatBallAppWM.prototype.updatePointerAreaSelection = function",
    )
    if "completePointerTextCopy(" not in fallback:
        fail("small-area fallback bypasses the unified clipboard completion flow")
'''
    text = replace_once(text, anchor, addition, "verify clipboard behavior")

    old_es5 = '''        if re.search(pattern, ocr, flags=re.MULTILINE):
            fail("Rhino ES5 incompatible syntax in th_18: " + name)
'''
    new_es5 = old_es5 + '''        if re.search(pattern, pointer_core, flags=re.MULTILINE):
            fail("Rhino ES5 incompatible syntax in th_17: " + name)
'''
    text = replace_once(text, old_es5, new_es5, "verify pointer ES5")

    VERIFY.write_text(text, encoding="utf-8")


def main():
    patch_pointer()
    patch_verify()
    print("pointer clipboard main-thread patch applied")


if __name__ == "__main__":
    main()
