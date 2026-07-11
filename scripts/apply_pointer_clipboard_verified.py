#!/usr/bin/env python3
"""修复指针取字将剪贴板失败误报为成功的问题。"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POINTER = ROOT / "code" / "th_17_pointer.js"
POSITION = ROOT / "code" / "th_19_position_state.js"
VERIFY = ROOT / "scripts" / "verify_ball_position_state.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s: expected one match, got %d" % (label, count))
    return text.replace(old, new, 1)


def patch_pointer():
    text = POINTER.read_text(encoding="utf-8")
    text = replace_once(text, "// @version 1.1.25", "// @version 1.1.26", "pointer version")

    old_copy = r'''FloatBallAppWM.prototype.copyPointerTextToClipboard = function(textValue) {
  var text = String(textValue || "");
  if (!text) return false;
  try {
    var appCtx = null;
    try {
      if (typeof context !== "undefined" && context) appCtx = context;
    } catch (eCtx0) {}
    if (!appCtx) {
      try { appCtx = android.app.ActivityThread.currentApplication(); } catch (eCtx1) { appCtx = null; }
    }
    if (!appCtx) return false;
    var cm = appCtx.getSystemService(android.content.Context.CLIPBOARD_SERVICE);
    if (!cm) return false;
    var clip = android.content.ClipData.newPlainText("ToolHub指针取字", text);
    cm.setPrimaryClip(clip);
    return true;
  } catch (e0) {
    safeLog(this.L, 'e', "copyPointerTextToClipboard fail: " + String(e0));
  }
  return false;
};
'''
    new_copy = r'''FloatBallAppWM.prototype.getPointerClipboardContexts = function() {
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
        if (appCtx && appCtx !== ctx) out.push(appCtx);
      }
    } catch (eAppCtx) {}
  }
  try { if (typeof context !== "undefined" && context) add(context); } catch (e0) {}
  try { if (typeof getToolHubAndroidContext === "function") add(getToolHubAndroidContext()); } catch (e1) {}
  try { add(android.app.ActivityThread.currentApplication()); } catch (e2) {}
  try { add(android.app.AppGlobals.getInitialApplication()); } catch (e3) {}
  return out;
};

FloatBallAppWM.prototype.readPointerClipboardText = function(cm, ctx) {
  if (!cm) return { ok: false, value: "", error: "ClipboardManager 不可用" };
  var value = "";
  var errors = [];
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
  } catch (ePrimary) {
    errors.push("getPrimaryClip=" + String(ePrimary));
  }
  if (!value) {
    try {
      if (cm.getText) {
        var legacy = cm.getText();
        if (legacy !== null && legacy !== undefined) value = String(legacy);
      }
    } catch (eLegacy) {
      errors.push("getText=" + String(eLegacy));
    }
  }
  return { ok: true, value: value, error: errors.join("; ") };
};

FloatBallAppWM.prototype.writePointerClipboardOnce = function(textValue, preferLegacy) {
  var text = String(textValue === null || textValue === undefined ? "" : textValue);
  var contexts = this.getPointerClipboardContexts();
  var lastError = "";
  for (var i = 0; i < contexts.length; i++) {
    var ctx = contexts[i];
    try {
      var cm = ctx.getSystemService(android.content.Context.CLIPBOARD_SERVICE);
      if (!cm) continue;
      var method = "setPrimaryClip";
      if (preferLegacy === true && cm.setText) {
        cm.setText(text);
        method = "setText";
      } else {
        var clip = android.content.ClipData.newPlainText("ToolHub指针取字", text);
        cm.setPrimaryClip(clip);
      }
      return { ok: true, wrote: true, manager: cm, context: ctx, method: method, error: "" };
    } catch (eWrite) {
      lastError = String(eWrite);
    }
  }
  return { ok: false, wrote: false, manager: null, context: null, method: "", error: lastError || "没有可用剪贴板上下文" };
};

FloatBallAppWM.prototype.copyPointerTextToClipboard = function(textValue) {
  var text = String(textValue === null || textValue === undefined ? "" : textValue);
  if (!text) return false;
  var write = this.writePointerClipboardOnce(text, false);
  if (!write || write.wrote !== true) {
    try { safeLog(this.L, 'e', "copyPointerTextToClipboard write fail: " + String(write && write.error || "unknown")); } catch (eLogWrite) {}
    return false;
  }
  var read = this.readPointerClipboardText(write.manager, write.context);
  var verified = !!(read && String(read.value || "") === text);
  try {
    var st = this.ensurePointerToolState();
    st.lastClipboardAttempt = {
      ok: verified,
      wrote: true,
      verified: verified,
      method: String(write.method || ""),
      observed: String(read && read.value || ""),
      error: String(read && read.error || ""),
      at: th17Now()
    };
  } catch (eState) {}
  return verified;
};

FloatBallAppWM.prototype.copyPointerTextToClipboardVerified = function(textValue, callback) {
  var text = String(textValue === null || textValue === undefined ? "" : textValue);
  var st = this.ensurePointerToolState();
  if (!text || !st.active || st.closed) return false;
  if (!st.handler) st.handler = this.state.h || new android.os.Handler(android.os.Looper.getMainLooper());

  st.clipboardCopyToken = Number(st.clipboardCopyToken || 0) + 1;
  var token = st.clipboardCopyToken;
  var session = Number(st.inspectSession || 0);
  st.clipboardCopyPending = true;
  var self = this;
  var attemptNo = 0;
  var last = { ok: false, wrote: false, verified: false, method: "", observed: "", error: "" };

  function finish(result) {
    if (token !== Number(st.clipboardCopyToken || 0)) return;
    if (session !== Number(st.inspectSession || 0)) return;
    if (!st.active || st.closed) return;
    st.clipboardCopyPending = false;
    st.lastClipboardAttempt = result;
    try { if (callback) callback(result); } catch (eCallback) { safeLog(self.L, 'e', "clipboard callback fail: " + String(eCallback)); }
  }

  function verify(write) {
    if (token !== Number(st.clipboardCopyToken || 0) || session !== Number(st.inspectSession || 0)) return;
    var read = self.readPointerClipboardText(write.manager, write.context);
    var observed = String(read && read.value || "");
    var verified = observed === text;
    last = {
      ok: verified,
      wrote: write && write.wrote === true,
      verified: verified,
      method: String(write && write.method || ""),
      observed: observed,
      error: String((write && write.error) || (read && read.error) || ""),
      attempt: attemptNo,
      at: th17Now()
    };
    if (verified) {
      finish(last);
      return;
    }
    if (attemptNo >= 3) {
      if (!last.error) last.error = "剪贴板写入后回读不一致";
      finish(last);
      return;
    }
    try { st.handler.postDelayed(new java.lang.Runnable({ run: attempt }), 80 + attemptNo * 60); }
    catch (eRetryPost) { last.error = String(eRetryPost); finish(last); }
  }

  function attempt() {
    if (token !== Number(st.clipboardCopyToken || 0) || session !== Number(st.inspectSession || 0)) return;
    if (!st.active || st.closed) return;
    attemptNo++;
    var write = self.writePointerClipboardOnce(text, attemptNo > 1);
    if (!write || write.wrote !== true) {
      last = {
        ok: false,
        wrote: false,
        verified: false,
        method: String(write && write.method || ""),
        observed: "",
        error: String(write && write.error || "剪贴板写入失败"),
        attempt: attemptNo,
        at: th17Now()
      };
      if (attemptNo >= 3) { finish(last); return; }
      try { st.handler.postDelayed(new java.lang.Runnable({ run: attempt }), 80 + attemptNo * 60); }
      catch (eRetry) { last.error = String(eRetry); finish(last); }
      return;
    }
    try { st.handler.postDelayed(new java.lang.Runnable({ run: function() { verify(write); } }), attemptNo === 1 ? 60 : 100); }
    catch (eVerifyPost) { last.error = String(eVerifyPost); finish(last); }
  }

  try { st.handler.post(new java.lang.Runnable({ run: attempt })); }
  catch (ePost) {
    st.clipboardCopyPending = false;
    return false;
  }
  return true;
};

FloatBallAppWM.prototype.completePointerTextCopy = function(textValue, rect, successCode, extraData) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed) return false;
  var text = String(textValue === null || textValue === undefined ? "" : textValue);
  if (!text || !rect) return false;
  var session = Number(st.inspectSession || 0);
  var self = this;
  var started = this.copyPointerTextToClipboardVerified(text, function(copyResult) {
    if (!st.active || st.closed || Number(st.inspectSession || 0) !== session) return;
    var data = {};
    try {
      if (extraData) {
        for (var k in extraData) data[k] = extraData[k];
      }
    } catch (eData) {}
    data.clipboardMethod = String(copyResult && copyResult.method || "");
    data.clipboardAttempts = Number(copyResult && copyResult.attempt || 0);
    data.clipboardObservedLength = String(copyResult && copyResult.observed || "").length;

    if (copyResult && copyResult.ok === true && copyResult.verified === true) {
      self.setPointerToolResult({
        ok: true,
        type: "text_pick",
        code: String(successCode || "TEXT_PICK_SUCCESS"),
        message: "取字并复制成功",
        value: text,
        clipboard: true,
        clipboardVerified: true,
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
        data: data
      });
      self.toast("已复制: " + text);
      self.closePointerTool("已复制到剪贴板", true);
      return;
    }

    data.clipboardWrote = copyResult && copyResult.wrote === true;
    data.clipboardError = String(copyResult && copyResult.error || "剪贴板写入后未能确认内容");
    self.setPointerToolResult({
      ok: false,
      type: "pointer_error",
      code: "CLIPBOARD_WRITE_FAILED",
      message: "已识别文字，但复制到剪贴板失败",
      value: text,
      clipboard: false,
      clipboardVerified: false,
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      data: data
    });
    self.toast("已识别文字，但复制失败");
    self.closePointerTool("复制到剪贴板失败", true);
  });

  if (!started) {
    this.setPointerToolResult({
      ok: false,
      type: "pointer_error",
      code: "CLIPBOARD_WRITE_FAILED",
      message: "已识别文字，但无法启动剪贴板写入",
      value: text,
      clipboard: false,
      clipboardVerified: false
    });
    this.toast("无法启动剪贴板写入");
    this.closePointerTool("复制到剪贴板失败", true);
    return false;
  }
  return true;
};
'''
    text = replace_once(text, old_copy, new_copy, "replace clipboard implementation")

    old_cleanup = '''  st.inspectSeq++;
};

FloatBallAppWM.prototype.closePointerInspectWorker = function(st) {'''
    new_cleanup = '''  st.inspectSeq++;
  st.clipboardCopyToken = Number(st.clipboardCopyToken || 0) + 1;
  st.clipboardCopyPending = false;
};

FloatBallAppWM.prototype.closePointerInspectWorker = function(st) {'''
    text = replace_once(text, old_cleanup, new_cleanup, "invalidate clipboard callback on close")

    old_extract = '''  var rect = st.currentRect;
  var textValue = String(st.currentText);
  var copied = this.copyPointerTextToClipboard(textValue);
  this.setPointerToolResult({
    ok: true,
    type: "text_pick",
    value: textValue,
    clipboard: copied === true,
    rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
  });
  this.toast(copied ? "已复制: " + textValue : textValue);
  this.closePointerTool(copied ? "已复制到剪贴板" : "取字完成", true);
  return { ok: true, text: textValue, clipboard: copied === true };
'''
    new_extract = '''  var rect = st.currentRect;
  var textValue = String(st.currentText);
  var started = this.completePointerTextCopy(
    textValue,
    { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
    "TEXT_PICK_SUCCESS",
    { source: "accessibility_current" }
  );
  return { ok: started === true, pending: started === true, text: textValue, clipboard: false };
'''
    text = replace_once(text, old_extract, new_extract, "use verified clipboard completion")

    for marker in (
        "// @version 1.1.26",
        "copyPointerTextToClipboardVerified",
        "completePointerTextCopy",
        "CLIPBOARD_WRITE_FAILED",
        "clipboardVerified: true",
        "clipboardCopyToken",
        "accessibility_current",
    ):
        if marker not in text:
            raise SystemExit("pointer marker missing: " + marker)

    POINTER.write_text(text, encoding="utf-8")


def patch_position():
    text = POSITION.read_text(encoding="utf-8")
    text = replace_once(text, "// @version 1.0.3", "// @version 1.0.4", "position version")

    old_finish = r'''  proto.finishReadyPointerSnapshot = function(st, snapshot) {
    var pointerState = st || null;
    var snap = snapshot || null;
    if (!pointerState || !snap || !snap.text || !snap.rect) return false;

    var textValue = String(snap.text);
    var rect = {
      left: Number(snap.rect.left),
      top: Number(snap.rect.top),
      right: Number(snap.rect.right),
      bottom: Number(snap.rect.bottom)
    };
    var copied = false;
    try { copied = this.copyPointerTextToClipboard(textValue) === true; } catch (eCopy) { copied = false; }

    pointerState.currentText = textValue;
    pointerState.currentRect = rect;
    pointerState.currentKey = String(snap.key || "");
    pointerState.hoverKey = pointerState.currentKey;
    pointerState.hoverSince = Number(snap.hoverSince || snap.readyAt || nowPosition());
    pointerState.releaseTs = nowPosition();

    this.setPointerToolResult({
      ok: true,
      type: "text_pick",
      code: "TEXT_PICK_READY_SNAPSHOT",
      message: "取字成功",
      value: textValue,
      clipboard: copied === true,
      rect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom
      },
      data: {
        source: "ready_visual_snapshot",
        readyAt: Number(snap.readyAt || 0),
        session: Number(snap.session || 0)
      }
    });
    try { this.toast(copied ? "已复制: " + textValue : textValue); } catch (eToast) {}
    try { this.closePointerTool(copied ? "已复制到剪贴板" : "取字完成", true); } catch (eClose) {}
    return true;
  };
'''
    new_finish = r'''  proto.finishReadyPointerSnapshot = function(st, snapshot) {
    var pointerState = st || null;
    var snap = snapshot || null;
    if (!pointerState || !snap || !snap.text || !snap.rect) return false;

    var textValue = String(snap.text);
    var rect = {
      left: Number(snap.rect.left),
      top: Number(snap.rect.top),
      right: Number(snap.rect.right),
      bottom: Number(snap.rect.bottom)
    };

    pointerState.currentText = textValue;
    pointerState.currentRect = rect;
    pointerState.currentKey = String(snap.key || "");
    pointerState.hoverKey = pointerState.currentKey;
    pointerState.hoverSince = Number(snap.hoverSince || snap.readyAt || nowPosition());
    pointerState.releaseTs = nowPosition();

    return this.completePointerTextCopy(
      textValue,
      rect,
      "TEXT_PICK_READY_SNAPSHOT",
      {
        source: "ready_visual_snapshot",
        readyAt: Number(snap.readyAt || 0),
        session: Number(snap.session || 0)
      }
    );
  };
'''
    text = replace_once(text, old_finish, new_finish, "ready snapshot verified copy")

    for marker in (
        "// @version 1.0.4",
        "return this.completePointerTextCopy(",
        "TEXT_PICK_READY_SNAPSHOT",
        "ready_visual_snapshot",
    ):
        if marker not in text:
            raise SystemExit("position marker missing: " + marker)

    POSITION.write_text(text, encoding="utf-8")


def patch_verify():
    text = VERIFY.read_text(encoding="utf-8")
    text = replace_once(text, '"// @version 1.0.3",', '"// @version 1.0.4",', "verify position version")

    old_required = '''    "proto.finishReadyPointerSnapshot = function",
    "TEXT_PICK_READY_SNAPSHOT",
    "ready_visual_snapshot",
'''
    new_required = '''    "proto.finishReadyPointerSnapshot = function",
    "TEXT_PICK_READY_SNAPSHOT",
    "ready_visual_snapshot",
    "return this.completePointerTextCopy(",
'''
    text = replace_once(text, old_required, new_required, "verify ready clipboard delegation")

    old_files = '''POINTER_OCR = ROOT / "code" / "th_18_pointer_ocr.js"
MANIFEST = ROOT / "manifest.json"
'''
    new_files = '''POINTER_OCR = ROOT / "code" / "th_18_pointer_ocr.js"
POINTER_CORE = ROOT / "code" / "th_17_pointer.js"
MANIFEST = ROOT / "manifest.json"
'''
    text = replace_once(text, old_files, new_files, "verify pointer core path")

    old_exists = '''    if not OCR_MODULE.exists():
        fail("missing code/th_18_pointer_ocr.js")
    if not TOOLHUB.exists():
'''
    new_exists = '''    if not OCR_MODULE.exists():
        fail("missing code/th_18_pointer_ocr.js")
    if not POINTER_CORE.exists():
        fail("missing code/th_17_pointer.js")
    if not TOOLHUB.exists():
'''
    text = replace_once(text, old_exists, new_exists, "verify pointer core exists")

    old_read = '''    text = TARGET.read_text(encoding="utf-8")
    ocr = OCR_MODULE.read_text(encoding="utf-8")
    loader = TOOLHUB.read_text(encoding="utf-8")
'''
    new_read = '''    text = TARGET.read_text(encoding="utf-8")
    ocr = OCR_MODULE.read_text(encoding="utf-8")
    pointer_core = POINTER_CORE.read_text(encoding="utf-8")
    loader = TOOLHUB.read_text(encoding="utf-8")
'''
    text = replace_once(text, old_read, new_read, "verify read pointer core")

    insert_before = '''    if "// @version 1.0.20" not in ocr:
        fail("th_18 version was not bumped")
'''
    checks = '''    for marker in (
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
    extract_section = section(
        pointer_core,
        "FloatBallAppWM.prototype.extractCurrentPointerText = function",
        "FloatBallAppWM.prototype.finishPointerTextPickAfterRelease = function",
    )
    if "copyPointerTextToClipboard(textValue)" in extract_section:
        fail("extractCurrentPointerText still treats synchronous clipboard write as success")
    if "completePointerTextCopy(" not in extract_section:
        fail("extractCurrentPointerText does not use verified clipboard completion")

''' + insert_before
    text = replace_once(text, insert_before, checks, "verify clipboard flow")

    VERIFY.write_text(text, encoding="utf-8")


def main():
    patch_pointer()
    patch_position()
    patch_verify()
    print("verified pointer clipboard patch applied")


if __name__ == "__main__":
    main()
