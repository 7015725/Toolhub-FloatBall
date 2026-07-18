#!/usr/bin/env python3
"""Apply stage-1 pickword screenshot preview and single-image viewer integration."""
from __future__ import print_function

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def write(rel, text):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s: expected one anchor, found %d" % (label, count))
    return text.replace(old, new, 1)


def replace_regex_once(text, pattern, replacement, label, flags=0):
    out, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit("%s: regex anchor count=%d" % (label, count))
    return out


def find_matching_brace(text, open_index):
    depth = 0
    quote = None
    escape = False
    line_comment = False
    block_comment = False
    i = open_index
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if line_comment:
            if ch == "\n":
                line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                quote = None
            i += 1
            continue
        if ch == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue
        if ch in ("'", '"'):
            quote = ch
            i += 1
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise SystemExit("matching brace not found")


def replace_js_function(text, marker, replacement, label):
    start = text.find(marker)
    if start < 0:
        raise SystemExit("%s: marker missing" % label)
    open_index = text.find("{", start + len(marker) - 1)
    if open_index < 0:
        raise SystemExit("%s: opening brace missing" % label)
    close_index = find_matching_brace(text, open_index)
    end = close_index + 1
    if text[end:end + 1] == ";":
        end += 1
    return text[:start] + replacement + text[end:]


def patch_th18():
    rel = "code/th_18_pointer_ocr.js"
    text = read(rel)
    text = replace_once(text, "// @version 1.1.3", "// @version 1.1.4", "th18 version")
    old = '''      var previewRet = null;
      if (hasText && typeof appObj.publishResultPreview === "function") {
        try {
          previewRet = appObj.publishResultPreview({
            kind: "text",
            source: "pointer_ocr",
            text: normalizedText,
            previewText: normalizedText,
            screenshotPath: obj.screenshotFilePath,
            rect: obj.captureRect,
            primaryAction: "pickword",
            actions: [],
            createdAt: now18()
          });
        } catch(ePreview) {
          previewRet = { ok: false, code: "RESULT_PREVIEW_FAILED", message: String(ePreview) };
        }
      }
'''
    new = '''      var previewRet = null;
      var previewAllowed = hasText || screenshotOk;
      var ocrStatus = hasText ? "success" : (textOk === true ? "empty" : "failed");
      if (previewAllowed && typeof appObj.publishResultPreview === "function") {
        try {
          previewRet = appObj.publishResultPreview({
            kind: hasText ? "text" : "image",
            source: "pointer_ocr",
            text: hasText ? normalizedText : "",
            previewText: hasText ? normalizedText : (ocrStatus === "empty" ? "未识别到文字，点击查看截图" : "识别失败，点击查看截图"),
            screenshotPath: obj.screenshotFilePath,
            screenshotOk: screenshotOk,
            allowEmptyText: !hasText && screenshotOk,
            ocrStatus: ocrStatus,
            ocrError: obj.ocrError,
            rect: obj.captureRect,
            primaryAction: "pickword",
            actions: [],
            createdAt: now18()
          });
        } catch(ePreview) {
          previewRet = { ok: false, code: "RESULT_PREVIEW_FAILED", message: String(ePreview) };
        }
      }
'''
    text = replace_once(text, old, new, "th18 preview block")
    write(rel, text)


def patch_th21():
    rel = "code/th_21_result_preview.js"
    text = read(rel)
    text = replace_once(text, "// @version 1.3.2", "// @version 1.3.3", "th21 version")
    text = replace_once(
        text,
        "    if (!st || !st.payload || !st.payload.text) return false;",
        "    if (!st || !st.payload || (!st.payload.text && !(st.payload.allowEmptyText === true && st.payload.screenshotPath))) return false;",
        "th21 show image-only",
    )
    old = '''    var text = "";
    try { text = String(src.text === null || src.text === undefined ? "" : src.text); } catch (eText) { text = ""; }
    if (!text) return null;
    var st = ensureState21(appObj);
'''
    new = '''    var text = "";
    try { text = String(src.text === null || src.text === undefined ? "" : src.text); } catch (eText) { text = ""; }
    var screenshotPath = "";
    try { screenshotPath = String(src.screenshotPath || "").replace(/^\\s+|\\s+$/g, ""); } catch (ePath) { screenshotPath = ""; }
    var allowEmptyText = src.allowEmptyText === true && screenshotPath.length > 0;
    if (!text && !allowEmptyText) return null;
    var st = ensureState21(appObj);
'''
    text = replace_once(text, old, new, "th21 normalize prelude")
    old_return = '''      text: text,
      previewText: cleanPreviewText21(src.previewText || text),
      screenshotPath: String(src.screenshotPath || ""),
      rect: cloneRect21(src.rect),
      primaryAction: String(src.primaryAction || "pickword"),
      actions: src.actions && src.actions.length !== undefined ? src.actions : [],
      createdAt: Number(src.createdAt || now21())
'''
    new_return = '''      text: text,
      previewText: cleanPreviewText21(src.previewText || text || "点击查看截图"),
      screenshotPath: screenshotPath,
      screenshotOk: src.screenshotOk === true || screenshotPath.length > 0,
      allowEmptyText: allowEmptyText,
      ocrStatus: String(src.ocrStatus || (text ? "success" : "empty")),
      ocrError: String(src.ocrError || ""),
      rect: cloneRect21(src.rect),
      primaryAction: String(src.primaryAction || "pickword"),
      actions: src.actions && src.actions.length !== undefined ? src.actions : [],
      createdAt: Number(src.createdAt || now21())
'''
    text = replace_once(text, old_return, new_return, "th21 normalized fields")
    text = replace_once(
        text,
        '        if (!normalized) return { ok: false, code: "EMPTY_PREVIEW_TEXT", previewId: "" };',
        '        if (!normalized) return { ok: false, code: "EMPTY_PREVIEW_CONTENT", previewId: "" };',
        "th21 error code",
    )
    old_handoff = '''              source: String(payload.source || ""),
              previewId: String(payload.id || ""),
              screenshotPath: String(payload.screenshotPath || ""),
              rect: cloneRect21(payload.rect)
'''
    new_handoff = '''              source: String(payload.source || ""),
              previewId: String(payload.id || ""),
              screenshotPath: String(payload.screenshotPath || ""),
              screenshotOk: payload.screenshotOk === true,
              allowEmptyText: payload.allowEmptyText === true,
              ocrStatus: String(payload.ocrStatus || ""),
              ocrError: String(payload.ocrError || ""),
              createdAt: Number(payload.createdAt || 0),
              rect: cloneRect21(payload.rect)
'''
    text = replace_once(text, old_handoff, new_handoff, "th21 handoff meta")
    write(rel, text)


TH20_HELPERS = r'''

    // =======================【拾字截图预览与原图页面】=======================
    var currentPickwordMeta20 = null;
    var pickwordImageController20 = null;
    var pickwordContentHost20 = null;
    var pickwordImagePage20 = null;
    var pickwordImageWindowSnapshot20 = null;
    var pickwordImageChildSnapshot20 = null;

    function normalizePickwordImageMeta20(meta) {
        if (!meta || typeof meta !== "object") return null;
        var rawPath = "";
        try { rawPath = String(meta.screenshotPath || "").replace(/^\s+|\s+$/g, ""); } catch (ePath) { rawPath = ""; }
        if (!rawPath) return null;
        try {
            var target = new java.io.File(rawPath);
            if (!target.exists() || !target.isFile() || target.length() <= 0) return null;
            var base = String(shortx.getShortXDir() || "").replace(/\/+$/g, "");
            if (!base) return null;
            var root = new java.io.File(base, "ToolHub/screenshots").getCanonicalPath();
            var canonical = target.getCanonicalPath();
            if (canonical.indexOf(root + java.io.File.separator) !== 0) return null;
            return {
                internalPath: String(canonical),
                available: true,
                deleted: false,
                source: String(meta.source || "pointer_ocr"),
                previewId: String(meta.previewId || ""),
                screenshotOk: meta.screenshotOk !== false,
                allowEmptyText: meta.allowEmptyText === true,
                imageOnly: meta.allowEmptyText === true,
                ocrStatus: String(meta.ocrStatus || ""),
                ocrError: String(meta.ocrError || ""),
                createdAt: Number(meta.createdAt || 0),
                rect: meta.rect || null
            };
        } catch (eNormalize) {
            try { safeLog(toolhubAppRef && toolhubAppRef.L, 'w', "pickword image meta rejected: " + String(eNormalize)); } catch (eLog) {}
        }
        return null;
    }

    function releasePickwordImageController20(reason) {
        try {
            if (pickwordImageController20 && typeof pickwordImageController20.release === "function") {
                pickwordImageController20.release(String(reason || "release"));
            }
        } catch (eRelease) {}
        pickwordImageController20 = null;
        pickwordContentHost20 = null;
        pickwordImagePage20 = null;
        pickwordImageWindowSnapshot20 = null;
        pickwordImageChildSnapshot20 = null;
    }

    function restorePickwordResultPage20(reason) {
        try {
            if (!mainLayout || !layoutParams || !windowManager) return false;
            if (pickwordImageChildSnapshot20) {
                for (var i = 0; i < pickwordImageChildSnapshot20.length; i++) {
                    var one = pickwordImageChildSnapshot20[i];
                    try { if (one && one.view) one.view.setVisibility(one.visibility); } catch (eVisibility) {}
                }
            }
            if (pickwordImageWindowSnapshot20) {
                layoutParams.width = pickwordImageWindowSnapshot20.width;
                layoutParams.height = pickwordImageWindowSnapshot20.height;
                layoutParams.x = pickwordImageWindowSnapshot20.x;
                layoutParams.y = pickwordImageWindowSnapshot20.y;
                layoutParams.gravity = pickwordImageWindowSnapshot20.gravity;
                try { windowManager.updateViewLayout(mainLayout, layoutParams); } catch (eUpdate) {}
            }
            if (pickwordImagePage20) pickwordImagePage20.setVisibility(View.GONE);
            if (pickwordImageController20 && typeof pickwordImageController20.back === "function") {
                pickwordImageController20.back(String(reason || "back"));
            }
            pickwordImageWindowSnapshot20 = null;
            pickwordImageChildSnapshot20 = null;
            return true;
        } catch (eRestore) {
            try { safeLog(toolhubAppRef && toolhubAppRef.L, 'w', "pickword image restore fail: " + String(eRestore)); } catch (eLog) {}
        }
        return false;
    }

    function openPickwordImagePage20() {
        try {
            if (!mainLayout || !layoutParams || !windowManager || !pickwordImagePage20) return false;
            if (pickwordImagePage20.getVisibility() === View.VISIBLE) return true;
            pickwordImageWindowSnapshot20 = {
                width: layoutParams.width,
                height: layoutParams.height,
                x: layoutParams.x,
                y: layoutParams.y,
                gravity: layoutParams.gravity
            };
            pickwordImageChildSnapshot20 = [];
            var count = mainLayout.getChildCount();
            for (var i = 0; i < count; i++) {
                var child = mainLayout.getChildAt(i);
                pickwordImageChildSnapshot20.push({ view: child, visibility: child.getVisibility() });
                child.setVisibility(child === pickwordImagePage20 ? View.VISIBLE : View.GONE);
            }
            layoutParams.width = LayoutParams.MATCH_PARENT;
            layoutParams.height = LayoutParams.MATCH_PARENT;
            layoutParams.x = 0;
            layoutParams.y = 0;
            layoutParams.gravity = Gravity.TOP | Gravity.LEFT;
            windowManager.updateViewLayout(mainLayout, layoutParams);
            if (pickwordImageController20 && typeof pickwordImageController20.open === "function") {
                pickwordImageController20.open();
            }
            return true;
        } catch (eOpen) {
            try { safeLog(toolhubAppRef && toolhubAppRef.L, 'e', "pickword image open fail: " + String(eOpen)); } catch (eLog) {}
            restorePickwordResultPage20("open_failed");
        }
        return false;
    }

    function applyPickwordImageOnlyActions20() {
        var meta = currentPickwordMeta20;
        if (!meta || meta.imageOnly !== true) return;
        var controls = [copyActionBtn, translateActionBtn, selectAllActionBtn, clearActionBtn, pinActionBtn,
            copyAllActionBtn, cleanupActionBtn, shareActionBtn];
        for (var i = 0; i < controls.length; i++) {
            try {
                if (controls[i]) {
                    controls[i].setEnabled(false);
                    controls[i].setAlpha(0.38);
                }
            } catch (eControl) {}
        }
    }

    function addPickwordTextArea20(parent, view, originalLp) {
        var meta = currentPickwordMeta20;
        if (!meta || meta.available !== true || !toolhubAppRef ||
            typeof toolhubAppRef.createPickwordImageController !== "function") {
            if (originalLp) parent.addView(view, originalLp); else parent.addView(view);
            return;
        }
        try {
            releasePickwordImageController20("replace");
            pickwordImageController20 = toolhubAppRef.createPickwordImageController({
                context: appContext,
                handler: mainHandler,
                session: meta,
                onOpen: function() { openPickwordImagePage20(); },
                onBack: function() { restorePickwordResultPage20("toolbar_back"); },
                onCloseSession: function() {
                    try { 拾字Floaty.hide(); } catch (eHide) {}
                },
                onError: function(stage, error) {
                    try { safeLog(toolhubAppRef && toolhubAppRef.L, 'w', "pickword image stage=" + String(stage || "") + " err=" + String(error || "")); } catch (eLog) {}
                }
            });
            if (!pickwordImageController20 || pickwordImageController20.hasImage() !== true) {
                releasePickwordImageController20("unavailable");
                if (originalLp) parent.addView(view, originalLp); else parent.addView(view);
                return;
            }

            var dm = appContext.getResources().getDisplayMetrics();
            var widthDp = Number(dm.widthPixels || 0) / Math.max(0.1, Number(dm.density || 1));
            var horizontal = widthDp >= 520;
            var host = new LinearLayout(appContext);
            pickwordContentHost20 = host;
            host.setOrientation(horizontal ? LinearLayout.HORIZONTAL : LinearLayout.VERTICAL);
            host.setGravity(Gravity.CENTER_VERTICAL);

            var textColumn = new LinearLayout(appContext);
            textColumn.setOrientation(LinearLayout.VERTICAL);
            var imageColumn = new LinearLayout(appContext);
            imageColumn.setOrientation(LinearLayout.VERTICAL);
            imageColumn.setGravity(Gravity.CENTER);
            var thumb = pickwordImageController20.createThumbnailView();

            if (horizontal) {
                textColumn.addView(view, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
                imageColumn.addView(thumb, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
                host.addView(textColumn, new LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 7));
                var imageLp = new LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 3);
                imageLp.leftMargin = uiDp(10, 12);
                host.addView(imageColumn, imageLp);
            } else {
                imageColumn.addView(thumb, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, uiDp(132, 156)));
                host.addView(imageColumn, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, uiDp(132, 156)));
                var textLp = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, originalLp && originalLp.height > 0 ? originalLp.height : uiDp(220, 280));
                textLp.topMargin = uiDp(8, 10);
                textColumn.addView(view, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
                host.addView(textColumn, textLp);
            }

            var hostLp = originalLp || new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
            if (!horizontal && hostLp && hostLp.height > 0) {
                hostLp = new LinearLayout.LayoutParams(hostLp.width, hostLp.height + uiDp(140, 164));
            }
            parent.addView(host, hostLp);

            pickwordImagePage20 = pickwordImageController20.createFullView();
            pickwordImagePage20.setVisibility(View.GONE);
            parent.addView(pickwordImagePage20, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 0, 1));
            mainHandler.post(new java.lang.Runnable({ run: function() { applyPickwordImageOnlyActions20(); } }));
        } catch (eBuild) {
            releasePickwordImageController20("build_failed");
            try { if (view.getParent()) ((android.view.ViewGroup)view.getParent()).removeView(view); } catch (eDetach) {}
            if (originalLp) parent.addView(view, originalLp); else parent.addView(view);
            try { safeLog(toolhubAppRef && toolhubAppRef.L, 'e', "pickword image layout fallback: " + String(eBuild)); } catch (eLog) {}
        }
    }
'''


def patch_th20():
    rel = "code/th_20_pickword.js"
    text = read(rel)
    text = replace_once(text, "// @version 1.0.15", "// @version 1.0.16", "th20 version")
    text = replace_once(text, "    var textAreaMinHeight = 0;\n", "    var textAreaMinHeight = 0;\n" + TH20_HELPERS + "\n", "th20 helper insertion")

    text = replace_once(
        text,
        "function startBigBang(text) {",
        "function startBigBang(text, meta) {",
        "th20 startBigBang signature",
    )
    text = replace_once(text, "拾字Floaty.show(loaded);", "拾字Floaty.show(loaded, meta);", "th20 show meta")

    new_show = r'''proto.showPickwordText = function(text, meta) {
                toolhubAppRef = this;
                var raw = normalizePickwordInput20(text);
                var imageMeta = normalizePickwordImageMeta20(meta);
                var imageOnly = !raw && imageMeta && imageMeta.available === true && imageMeta.allowEmptyText === true;
                if (!raw && !imageOnly) return { ok: false, code: "EMPTY_CONTENT", message: "文本和截图均为空" };
                if (!this.state) return { ok: false, code: "APP_STATE_UNAVAILABLE", message: "ToolHub 状态不可用" };
                if (!this.state.pickword) {
                    this.state.pickword = {
                        generation: 0,
                        showing: false,
                        fullText: "",
                        loadedText: "",
                        meta: null,
                        lastResult: null
                    };
                }
                var ps = this.state.pickword;
                ps.generation = Number(ps.generation || 0) + 1;
                ps.fullText = raw;
                var displayText = imageOnly ? "未识别到文字" : raw;
                ps.loadedText = displayText.length > DIY_CONFIG.MAX_CHAR_LIMIT
                    ? truncatePickwordTextAtSafeBoundary20(displayText, DIY_CONFIG.MAX_CHAR_LIMIT, false)
                    : displayText;
                if (imageMeta) imageMeta.imageOnly = imageOnly;
                ps.meta = imageMeta || null;
                var ret = startBigBang(displayText, ps.meta);
                ps.lastResult = ret;
                ps.showing = !!(ret && ret.ok);
                try {
                    safeLog(this.L, ret && ret.ok ? 'i' : 'w',
                        "pickword show ok=" + String(!!(ret && ret.ok)) +
                        " originalLen=" + String(raw.length) +
                        " loadedLen=" + String(ps.loadedText.length) +
                        " image=" + String(!!imageMeta) +
                        " imageOnly=" + String(imageOnly));
                } catch (eLog) {}
                return ret;
            };'''
    text = replace_js_function(text, "proto.showPickwordText = function(text, meta)", new_show, "th20 showPickwordText")

    text = replace_regex_once(
        text,
        r"show:\s*function\s*\(text\)\s*\{",
        "show: function(text, meta) {\n            currentPickwordMeta20 = normalizePickwordImageMeta20(meta);",
        "th20 floaty show signature",
    )
    text = replace_once(
        text,
        "mainLayout.addView(scrollView",
        "addPickwordTextArea20(mainLayout, scrollView",
        "th20 text area host",
    )

    for marker, label in [
        ("function clearMainPickwordViewRefs20() {", "clear refs"),
        ("function removeMainPickwordWindowNow20() {", "remove window"),
    ]:
        text = replace_once(
            text,
            marker,
            marker + "\n        try { releasePickwordImageController20(\"" + label.replace(" ", "_") + "\"); } catch (eImageRelease) {}",
            "th20 " + label,
        )

    text = replace_once(
        text,
        "                refreshPickwordTheme20();\n                try { if (textCanvasControl && textCanvasControl.view) textCanvasControl.view.invalidate(); } catch (eCanvas) {}",
        "                refreshPickwordTheme20();\n                try { if (pickwordImageController20 && pickwordImageController20.refreshLayout) pickwordImageController20.refreshLayout(); } catch (eImageLayout) {}\n                try { if (textCanvasControl && textCanvasControl.view) textCanvasControl.view.invalidate(); } catch (eCanvas) {}",
        "th20 config refresh",
    )
    write(rel, text)


TH22 = r'''// @version 1.0.0
// =======================【拾字截图：单图缩略图与原图查看】=======================
// 仅消费 ToolHub/screenshots 内已落盘图片；不负责截图、保存、分享、删除或历史列表。
(function() {
  function now22() {
    try { return java.lang.System.currentTimeMillis(); } catch (e0) {}
    return (new Date()).getTime();
  }

  function clamp22(value, min, max) {
    var n = Number(value);
    if (isNaN(n)) n = min;
    if (n < min) n = min;
    if (n > max) n = max;
    return n;
  }

  function int22(value, fallback) {
    var n = Number(value);
    if (isNaN(n)) n = Number(fallback || 0);
    if (isNaN(n)) n = 0;
    return Math.round(n);
  }

  function dp22(value) {
    var density = 1;
    try { density = Number(context.getResources().getDisplayMetrics().density || 1); } catch (e0) { density = 1; }
    return Math.max(1, Math.round(Number(value || 0) * density));
  }

  function colorState22(color) {
    try {
      return android.content.res.ColorStateList.valueOf(java.lang.Integer.valueOf(Number(color) | 0));
    } catch (e0) {}
    return null;
  }

  function safeText22(view, color) {
    try {
      if (typeof toolhubSafeSetTextColor === "function") toolhubSafeSetTextColor(view, colorState22(color));
      else view.setTextColor(colorState22(color));
    } catch (e0) {}
  }

  function theme22(appObj) {
    var dark = false;
    try { dark = !!(appObj && appObj.isDarkTheme && appObj.isDarkTheme()); } catch (e0) {}
    var out = {
      bg: dark ? (0xFF111318 | 0) : (0xFFF8FAFC | 0),
      card: dark ? (0xFF1C1F26 | 0) : (0xFFFFFFFF | 0),
      text: dark ? (0xFFF1F5F9 | 0) : (0xFF111827 | 0),
      secondary: dark ? (0xFFCBD5E1 | 0) : (0xFF64748B | 0),
      primary: dark ? (0xFFA8C7FA | 0) : (0xFF005BC0 | 0),
      stroke: dark ? (0x55FFFFFF | 0) : (0x22000000 | 0)
    };
    try {
      if (appObj && appObj.getSettingsColorScheme) {
        var s = appObj.getSettingsColorScheme();
        if (s) {
          out.bg = Number(s.surface) | 0;
          out.card = Number(s.surface2 || s.surface) | 0;
          out.text = Number(s.onSurface) | 0;
          out.secondary = Number(s.onSurface2 || s.onSurface) | 0;
          out.primary = Number(s.primary) | 0;
          out.stroke = Number(s.outlineVariant) | 0;
        }
      }
    } catch (e1) {}
    return out;
  }

  function roundBg22(color, stroke, radius) {
    var gd = new android.graphics.drawable.GradientDrawable();
    try {
      if (typeof toolhubSafeSetColor === "function") toolhubSafeSetColor(gd, colorState22(color));
      else gd.setColor(colorState22(color));
    } catch (e0) {}
    try { gd.setCornerRadius(dp22(radius || 12)); } catch (e1) {}
    try { gd.setStroke(dp22(1), colorState22(stroke)); } catch (e2) {}
    return gd;
  }

  function sampleSize22(width, height, maxEdge) {
    var sample = 1;
    var limit = Math.max(64, Number(maxEdge || 2048));
    while (Math.max(width / sample, height / sample) > limit) sample *= 2;
    return sample;
  }

  function floorPowerTwo22(value) {
    var n = Math.max(1, Math.floor(Number(value || 1)));
    var p = 1;
    while (p * 2 <= n) p *= 2;
    return p;
  }

  function safeRecycle22(bitmap) {
    try {
      if (bitmap && bitmap.recycle && (!bitmap.isRecycled || bitmap.isRecycled() !== true)) bitmap.recycle();
    } catch (e0) {}
  }

  function safeClose22(decoder) {
    try { if (decoder && decoder.recycle) decoder.recycle(); } catch (e0) {}
    try { if (decoder && decoder.close) decoder.close(); } catch (e1) {}
  }

  function fileSizeText22(bytes) {
    var n = Math.max(0, Number(bytes || 0));
    if (n >= 1024 * 1024) return String(Math.round(n / 1024 / 1024 * 10) / 10) + " MB";
    if (n >= 1024) return String(Math.round(n / 1024 * 10) / 10) + " KB";
    return String(Math.round(n)) + " B";
  }

  function install22() {
    try {
      if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return false;
      var proto = FloatBallAppWM.prototype;
      if (proto.__toolHubPickwordImageViewerInstalled === true) return true;

      proto.createPickwordImageController = function(options) {
        var appObj = this;
        var opts = options || {};
        var session = opts.session || {};
        var path = String(session.internalPath || "");
        var file = new java.io.File(path);
        var handler = opts.handler || new android.os.Handler(android.os.Looper.getMainLooper());
        var executor = java.util.concurrent.Executors.newSingleThreadExecutor();
        var colors = theme22(appObj);
        var generation = 1;
        var released = false;
        var boundsReady = false;
        var sourceWidth = 0;
        var sourceHeight = 0;
        var fileSize = 0;
        var baseSample = 1;
        var thumbBitmap = null;
        var baseBitmap = null;
        var regionBitmap = null;
        var regionRect = null;
        var regionSample = 1;
        var regionDecoder = null;
        var regionSerial = 0;
        var regionRunnable = null;
        var thumbnailRoot = null;
        var thumbnailImage = null;
        var thumbnailStatus = null;
        var fullRoot = null;
        var imageCanvas = null;
        var infoView = null;
        var viewW = 0;
        var viewH = 0;
        var scale = 1;
        var minScale = 1;
        var maxScale = 8;
        var tx = 0;
        var ty = 0;
        var lastX = 0;
        var lastY = 0;
        var panning = false;
        var scaling = false;
        var initialized = false;

        function log(level, msg) {
          try { safeLog(appObj.L, level, "pickword image " + String(msg)); } catch (e0) {}
        }

        function error(stage, err) {
          log('w', "stage=" + String(stage || "") + " err=" + String(err || ""));
          try { if (typeof opts.onError === "function") opts.onError(stage, err); } catch (e0) {}
        }

        function post(fn) {
          try {
            return handler.post(new java.lang.Runnable({ run: function() {
              try { fn(); } catch (eRun) { error("ui", eRun); }
            }})) === true;
          } catch (e0) {}
          return false;
        }

        function readBounds() {
          if (boundsReady) return true;
          var o = new android.graphics.BitmapFactory.Options();
          o.inJustDecodeBounds = true;
          android.graphics.BitmapFactory.decodeFile(path, o);
          sourceWidth = Math.max(0, Number(o.outWidth || 0));
          sourceHeight = Math.max(0, Number(o.outHeight || 0));
          try { fileSize = Number(file.length() || 0); } catch (e0) { fileSize = 0; }
          boundsReady = sourceWidth > 0 && sourceHeight > 0;
          return boundsReady;
        }

        function updateInfo() {
          if (!infoView) return;
          var text = sourceWidth > 0 ? (String(sourceWidth) + " × " + String(sourceHeight) + "  ·  " + fileSizeText22(fileSize)) : "图片信息不可用";
          try { infoView.setText(text); } catch (e0) {}
        }

        function fitTransform() {
          if (!baseBitmap || viewW <= 0 || viewH <= 0) return;
          var bw = Math.max(1, Number(baseBitmap.getWidth()));
          var bh = Math.max(1, Number(baseBitmap.getHeight()));
          minScale = Math.min(viewW / bw, viewH / bh);
          if (!(minScale > 0)) minScale = 1;
          maxScale = Math.max(minScale * 8, 8 / Math.max(1, baseSample));
          scale = minScale;
          tx = (viewW - bw * scale) / 2;
          ty = (viewH - bh * scale) / 2;
          initialized = true;
        }

        function clampTranslation() {
          if (!baseBitmap || viewW <= 0 || viewH <= 0) return;
          var dw = baseBitmap.getWidth() * scale;
          var dh = baseBitmap.getHeight() * scale;
          if (dw <= viewW) tx = (viewW - dw) / 2;
          else tx = clamp22(tx, viewW - dw, 0);
          if (dh <= viewH) ty = (viewH - dh) / 2;
          else ty = clamp22(ty, viewH - dh, 0);
        }

        function setScaleAround(next, fx, fy) {
          if (!baseBitmap) return;
          var old = scale;
          next = clamp22(next, minScale, maxScale);
          if (!(old > 0)) old = next;
          var bx = (fx - tx) / old;
          var by = (fy - ty) / old;
          scale = next;
          tx = fx - bx * scale;
          ty = fy - by * scale;
          clampTranslation();
          try { if (imageCanvas) imageCanvas.invalidate(); } catch (e0) {}
          scheduleRegionDecode();
        }

        function visibleSourceRect() {
          if (!baseBitmap || !boundsReady || viewW <= 0 || viewH <= 0 || !(scale > 0)) return null;
          var left = Math.floor(Math.max(0, ((0 - tx) / scale) * baseSample));
          var top = Math.floor(Math.max(0, ((0 - ty) / scale) * baseSample));
          var right = Math.ceil(Math.min(sourceWidth, ((viewW - tx) / scale) * baseSample));
          var bottom = Math.ceil(Math.min(sourceHeight, ((viewH - ty) / scale) * baseSample));
          if (right <= left || bottom <= top) return null;
          var padX = Math.max(8, Math.round((right - left) * 0.08));
          var padY = Math.max(8, Math.round((bottom - top) * 0.08));
          left = Math.max(0, left - padX);
          top = Math.max(0, top - padY);
          right = Math.min(sourceWidth, right + padX);
          bottom = Math.min(sourceHeight, bottom + padY);
          return new android.graphics.Rect(left, top, right, bottom);
        }

        function scheduleRegionDecode() {
          if (!regionDecoder || released || !baseBitmap) return;
          regionSerial++;
          var serial = regionSerial;
          if (regionRunnable) {
            try { handler.removeCallbacks(regionRunnable); } catch (e0) {}
          }
          regionRunnable = new java.lang.Runnable({ run: function() {
            regionRunnable = null;
            if (released || serial !== regionSerial) return;
            var rect = visibleSourceRect();
            if (!rect) return;
            var desired = Math.max(1, floorPowerTwo22(baseSample / Math.max(scale, 0.01)));
            if (desired >= baseSample && scale <= minScale * 1.15) return;
            try {
              executor.execute(new java.lang.Runnable({ run: function() {
                var decoded = null;
                try {
                  var o = new android.graphics.BitmapFactory.Options();
                  o.inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888;
                  o.inSampleSize = desired;
                  decoded = regionDecoder.decodeRegion(rect, o);
                } catch (eDecode) {
                  error("region_decode", eDecode);
                }
                finalApply(decoded, rect, desired, serial);
              }}));
            } catch (eExec) { error("region_schedule", eExec); }
          }});
          try { handler.postDelayed(regionRunnable, 90); } catch (ePost) {}
        }

        function finalApply(decoded, rect, sampleValue, serial) {
          post(function() {
            if (released || serial !== regionSerial) {
              safeRecycle22(decoded);
              return;
            }
            safeRecycle22(regionBitmap);
            regionBitmap = decoded;
            regionRect = rect;
            regionSample = sampleValue;
            try { if (imageCanvas) imageCanvas.invalidate(); } catch (e0) {}
          });
        }

        function decodeThumbnail() {
          var token = generation;
          try {
            executor.execute(new java.lang.Runnable({ run: function() {
              var bitmap = null;
              try {
                if (!readBounds()) throw new Error("图片尺寸读取失败");
                var o = new android.graphics.BitmapFactory.Options();
                o.inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888;
                o.inSampleSize = sampleSize22(sourceWidth, sourceHeight, 512);
                bitmap = android.graphics.BitmapFactory.decodeFile(path, o);
                if (!bitmap) throw new Error("缩略图解码为空");
              } catch (eDecode) {
                error("thumbnail_decode", eDecode);
              }
              post(function() {
                if (released || token !== generation) {
                  safeRecycle22(bitmap);
                  return;
                }
                safeRecycle22(thumbBitmap);
                thumbBitmap = bitmap;
                if (thumbnailImage && bitmap) thumbnailImage.setImageBitmap(bitmap);
                if (thumbnailStatus) thumbnailStatus.setText(bitmap ? "点击查看原图" : "截图不可用");
                updateInfo();
              });
            }}));
          } catch (eExec) { error("thumbnail_schedule", eExec); }
        }

        function decodeFull() {
          if (baseBitmap || released) return;
          var token = generation;
          try {
            executor.execute(new java.lang.Runnable({ run: function() {
              var bitmap = null;
              var decoder = null;
              var sampleValue = 1;
              try {
                if (!readBounds()) throw new Error("图片尺寸读取失败");
                sampleValue = sampleSize22(sourceWidth, sourceHeight, 4096);
                var o = new android.graphics.BitmapFactory.Options();
                o.inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888;
                o.inSampleSize = sampleValue;
                bitmap = android.graphics.BitmapFactory.decodeFile(path, o);
                if (!bitmap) throw new Error("原图解码为空");
                if (sampleValue > 1) {
                  try { decoder = android.graphics.BitmapRegionDecoder.newInstance(path, false); } catch (eRegion) { decoder = null; }
                }
              } catch (eDecode) {
                error("full_decode", eDecode);
              }
              post(function() {
                if (released || token !== generation) {
                  safeRecycle22(bitmap);
                  safeClose22(decoder);
                  return;
                }
                baseBitmap = bitmap;
                baseSample = sampleValue;
                regionDecoder = decoder;
                if (baseBitmap && imageCanvas) {
                  fitTransform();
                  imageCanvas.invalidate();
                  scheduleRegionDecode();
                }
                updateInfo();
              });
            }}));
          } catch (eExec) { error("full_schedule", eExec); }
        }

        var scaleListener = new JavaAdapter(android.view.ScaleGestureDetector.SimpleOnScaleGestureListener, {
          onScaleBegin: function(detector) { scaling = true; return true; },
          onScale: function(detector) {
            try { setScaleAround(scale * Number(detector.getScaleFactor()), detector.getFocusX(), detector.getFocusY()); } catch (e0) {}
            return true;
          },
          onScaleEnd: function(detector) { scaling = false; scheduleRegionDecode(); }
        });
        var scaleDetector = new android.view.ScaleGestureDetector(opts.context || context, scaleListener);

        var gestureListener = new JavaAdapter(android.view.GestureDetector.SimpleOnGestureListener, {
          onDown: function(event) { return true; },
          onDoubleTap: function(event) {
            var target = scale > minScale * 1.4 ? minScale : Math.min(maxScale, minScale * 3);
            setScaleAround(target, event.getX(), event.getY());
            return true;
          }
        });
        var gestureDetector = new android.view.GestureDetector(opts.context || context, gestureListener);

        function createCanvas() {
          var CanvasView = new JavaAdapter(android.view.View, {
            onSizeChanged: function(w, h, oldw, oldh) {
              viewW = Number(w || 0);
              viewH = Number(h || 0);
              if (baseBitmap) {
                if (!initialized) fitTransform();
                else clampTranslation();
                scheduleRegionDecode();
              }
            },
            onDraw: function(canvas) {
              try {
                canvas.drawARGB(255, (colors.bg >>> 16) & 255, (colors.bg >>> 8) & 255, colors.bg & 255);
                var cell = dp22(18);
                var p = new android.graphics.Paint();
                for (var yy = 0; yy < getHeight(); yy += cell) {
                  for (var xx = 0; xx < getWidth(); xx += cell) {
                    var v = (((xx / cell) + (yy / cell)) % 2 === 0) ? 20 : 8;
                    p.setARGB(v, 128, 128, 128);
                    canvas.drawRect(xx, yy, xx + cell, yy + cell, p);
                  }
                }
                if (!baseBitmap) {
                  var t = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
                  t.setARGB(255, (colors.secondary >>> 16) & 255, (colors.secondary >>> 8) & 255, colors.secondary & 255);
                  t.setTextSize(dp22(15));
                  t.setTextAlign(android.graphics.Paint.Align.CENTER);
                  canvas.drawText(new java.lang.String("正在载入截图…"), getWidth() / 2, getHeight() / 2, t);
                  return;
                }
                canvas.save();
                canvas.translate(tx, ty);
                canvas.scale(scale, scale);
                canvas.drawBitmap(baseBitmap, 0, 0, null);
                canvas.restore();
                if (regionBitmap && regionRect) {
                  var left = tx + (Number(regionRect.left) / baseSample) * scale;
                  var top = ty + (Number(regionRect.top) / baseSample) * scale;
                  var right = tx + (Number(regionRect.right) / baseSample) * scale;
                  var bottom = ty + (Number(regionRect.bottom) / baseSample) * scale;
                  var dst = new android.graphics.RectF(left, top, right, bottom);
                  canvas.drawBitmap(regionBitmap, null, dst, null);
                }
              } catch (eDraw) { error("draw", eDraw); }
            },
            onTouchEvent: function(event) {
              try { scaleDetector.onTouchEvent(event); } catch (eScale) {}
              try { gestureDetector.onTouchEvent(event); } catch (eGesture) {}
              var action = event.getActionMasked ? event.getActionMasked() : event.getAction();
              if (action === android.view.MotionEvent.ACTION_DOWN) {
                lastX = event.getX();
                lastY = event.getY();
                panning = true;
                return true;
              }
              if (action === android.view.MotionEvent.ACTION_MOVE && panning && !scaling && event.getPointerCount() === 1) {
                var nx = event.getX();
                var ny = event.getY();
                tx += nx - lastX;
                ty += ny - lastY;
                lastX = nx;
                lastY = ny;
                clampTranslation();
                invalidate();
                scheduleRegionDecode();
                return true;
              }
              if (action === android.view.MotionEvent.ACTION_UP || action === android.view.MotionEvent.ACTION_CANCEL) {
                panning = false;
                scheduleRegionDecode();
                return true;
              }
              return true;
            }
          }, opts.context || context);
          CanvasView.setClickable(true);
          return CanvasView;
        }

        function button(label, callback) {
          var tv = new android.widget.TextView(opts.context || context);
          tv.setText(label);
          safeText22(tv, colors.primary);
          tv.setTextSize(14);
          tv.setGravity(android.view.Gravity.CENTER);
          tv.setPadding(dp22(12), dp22(8), dp22(12), dp22(8));
          tv.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
            try { callback(); } catch (e0) { error("button", e0); }
          }}));
          return tv;
        }

        var controller = {
          hasImage: function() {
            try { return !released && file.exists() && file.isFile() && file.length() > 0; } catch (e0) {}
            return false;
          },
          createThumbnailView: function() {
            if (thumbnailRoot) return thumbnailRoot;
            var root = new android.widget.FrameLayout(opts.context || context);
            thumbnailRoot = root;
            root.setBackground(roundBg22(colors.card, colors.stroke, 14));
            root.setPadding(dp22(6), dp22(6), dp22(6), dp22(6));
            var image = new android.widget.ImageView(opts.context || context);
            thumbnailImage = image;
            image.setScaleType(android.widget.ImageView.ScaleType.CENTER_INSIDE);
            root.addView(image, new android.widget.FrameLayout.LayoutParams(-1, -1));
            var status = new android.widget.TextView(opts.context || context);
            thumbnailStatus = status;
            status.setText("正在读取截图…");
            safeText22(status, colors.secondary);
            status.setTextSize(11);
            status.setGravity(android.view.Gravity.CENTER);
            var statusLp = new android.widget.FrameLayout.LayoutParams(-1, dp22(30), android.view.Gravity.BOTTOM);
            root.addView(status, statusLp);
            root.setClickable(true);
            root.setContentDescription("截图缩略图，点击查看原图");
            root.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
              try { if (typeof opts.onOpen === "function") opts.onOpen(); } catch (e0) { error("open_callback", e0); }
            }}));
            decodeThumbnail();
            return root;
          },
          createFullView: function() {
            if (fullRoot) return fullRoot;
            var root = new android.widget.FrameLayout(opts.context || context);
            fullRoot = root;
            imageCanvas = createCanvas();
            root.addView(imageCanvas, new android.widget.FrameLayout.LayoutParams(-1, -1));

            var top = new android.widget.LinearLayout(opts.context || context);
            top.setOrientation(android.widget.LinearLayout.HORIZONTAL);
            top.setGravity(android.view.Gravity.CENTER_VERTICAL);
            top.setPadding(dp22(6), dp22(4), dp22(6), dp22(4));
            top.setBackground(roundBg22(colors.card, colors.stroke, 0));
            top.addView(button("返回", function() {
              try { if (typeof opts.onBack === "function") opts.onBack(); } catch (e0) { error("back_callback", e0); }
            }), new android.widget.LinearLayout.LayoutParams(dp22(72), dp22(48)));
            var title = new android.widget.TextView(opts.context || context);
            title.setText("截图原图");
            safeText22(title, colors.text);
            title.setTextSize(16);
            title.setGravity(android.view.Gravity.CENTER);
            top.addView(title, new android.widget.LinearLayout.LayoutParams(0, dp22(48), 1));
            top.addView(button("关闭", function() {
              try { if (typeof opts.onCloseSession === "function") opts.onCloseSession(); } catch (e0) { error("close_callback", e0); }
            }), new android.widget.LinearLayout.LayoutParams(dp22(72), dp22(48)));
            root.addView(top, new android.widget.FrameLayout.LayoutParams(-1, dp22(56), android.view.Gravity.TOP));

            infoView = new android.widget.TextView(opts.context || context);
            safeText22(infoView, colors.secondary);
            infoView.setTextSize(11);
            infoView.setGravity(android.view.Gravity.CENTER);
            infoView.setPadding(dp22(8), dp22(4), dp22(8), dp22(4));
            infoView.setBackground(roundBg22(colors.card, colors.stroke, 0));
            infoView.setText("双指缩放 · 单指平移 · 双击放大或复位");
            root.addView(infoView, new android.widget.FrameLayout.LayoutParams(-1, dp22(42), android.view.Gravity.BOTTOM));
            updateInfo();
            return root;
          },
          open: function() {
            if (released) return false;
            decodeFull();
            try { if (fullRoot) fullRoot.setVisibility(android.view.View.VISIBLE); } catch (e0) {}
            return true;
          },
          back: function(reason) {
            try { if (fullRoot) fullRoot.setVisibility(android.view.View.GONE); } catch (e0) {}
            return true;
          },
          refreshLayout: function() {
            colors = theme22(appObj);
            try { if (thumbnailRoot) thumbnailRoot.setBackground(roundBg22(colors.card, colors.stroke, 14)); } catch (e0) {}
            try { if (imageCanvas) imageCanvas.invalidate(); } catch (e1) {}
            return true;
          },
          getImageInfo: function() {
            try { readBounds(); } catch (e0) {}
            return {
              path: path,
              width: sourceWidth,
              height: sourceHeight,
              fileSize: fileSize,
              sampleSize: baseSample,
              createdAt: Number(session.createdAt || 0)
            };
          },
          release: function(reason) {
            if (released) return true;
            released = true;
            generation++;
            regionSerial++;
            try { if (regionRunnable) handler.removeCallbacks(regionRunnable); } catch (e0) {}
            regionRunnable = null;
            try { executor.shutdownNow(); } catch (e1) {}
            try { if (thumbnailImage) thumbnailImage.setImageDrawable(null); } catch (e2) {}
            safeRecycle22(thumbBitmap);
            safeRecycle22(regionBitmap);
            safeRecycle22(baseBitmap);
            safeClose22(regionDecoder);
            thumbBitmap = null;
            regionBitmap = null;
            baseBitmap = null;
            regionDecoder = null;
            thumbnailRoot = null;
            thumbnailImage = null;
            thumbnailStatus = null;
            fullRoot = null;
            imageCanvas = null;
            infoView = null;
            log('i', "released reason=" + String(reason || "") + " path=" + path);
            return true;
          }
        };

        log('i', "controller created path=" + path + " createdAt=" + String(now22()));
        return controller;
      };

      proto.__toolHubPickwordImageViewerInstalled = true;
      return true;
    } catch (eInstall) {
      try { safeLog(null, 'e', "install pickword image viewer fail: " + String(eInstall)); } catch (e0) {}
    }
    return false;
  }

  install22();
})();
'''


def write_th22():
    write("code/th_22_image_viewer.js", TH22)


def patch_entry():
    rel = "ToolHub.js"
    text = read(rel)
    text = replace_regex_once(
        text,
        r"var TOOLHUB_ENTRY_VERSION = \d+;",
        "var TOOLHUB_ENTRY_VERSION = 20260718213000;",
        "entry version",
    )
    old = '"th_20_pickword.js", "th_21_result_preview.js"];'
    new = '"th_20_pickword.js", "th_21_result_preview.js", "th_22_image_viewer.js"];'
    text = replace_once(text, old, new, "entry module list")
    write(rel, text)


def patch_boundaries():
    rel = "MODULE_BOUNDARIES.json"
    data = json.loads(read(rel))
    owners = data.setdefault("directOwners", {})
    owners["createPickwordImageController"] = "th_22_image_viewer.js"
    write(rel, json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def patch_docs():
    for rel in ("STRUCTURE.md", "ARCHITECTURE.md"):
        text = read(rel)
        if "th_22_image_viewer.js" in text:
            continue
        anchor = "th_21_result_preview.js"
        pos = text.find(anchor)
        if pos >= 0:
            line_end = text.find("\n", pos)
            if line_end < 0:
                line_end = len(text)
            line = text[text.rfind("\n", 0, pos) + 1:line_end]
            prefix = re.match(r"^\s*[-*|>]*\s*", line).group(0)
            addition = "\n" + prefix + "th_22_image_viewer.js：拾字截图缩略图、同窗原图查看、缩放平移与大图区域解码。"
            text = text[:line_end] + addition + text[line_end:]
        else:
            text += "\n- th_22_image_viewer.js：拾字截图缩略图、同窗原图查看、缩放平移与大图区域解码。\n"
        write(rel, text)


VERIFY = r'''#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def text(path):
    return (ROOT / path).read_text(encoding="utf-8")

def require(value, message):
    if not value:
        raise SystemExit("FAIL pickword-image-viewer: " + message)

th18 = text("code/th_18_pointer_ocr.js")
th20 = text("code/th_20_pickword.js")
th21 = text("code/th_21_result_preview.js")
th22 = text("code/th_22_image_viewer.js")
entry = text("ToolHub.js")

require('allowEmptyText: !hasText && screenshotOk' in th18, "OCR empty screenshot preview missing")
require('kind: hasText ? "text" : "image"' in th18, "OCR preview kind missing")
require('allowEmptyText: allowEmptyText' in th21, "preview normalized empty-image flag missing")
require('ocrStatus: String(src.ocrStatus' in th21, "preview OCR status missing")
require('allowEmptyText: payload.allowEmptyText === true' in th21, "preview handoff metadata missing")
require('addPickwordTextArea20(mainLayout, scrollView' in th20, "pickword text/image layout host missing")
require('openPickwordImagePage20' in th20 and 'restorePickwordResultPage20' in th20, "same-root image page state missing")
require('startBigBang(displayText, ps.meta)' in th20, "pickword metadata pipeline missing")
require('createPickwordImageController' in th22, "image controller missing")
require('BitmapRegionDecoder' in th22, "large image region decode missing")
require('ScaleGestureDetector' in th22 and 'GestureDetector' in th22, "image gestures missing")
require('th_22_image_viewer.js' in entry, "entry module list missing")
for banned in (r'\blet\b', r'\bconst\b', r'=>', r'`'):
    require(re.search(banned, th22) is None, "ES6 token in th_22: %s" % banned)
print("OK pickword-image-viewer stage1")
'''


def write_verify():
    write("scripts/verify_pickword_image_viewer.py", VERIFY)
    rel = ".github/workflows/verify.yml"
    text = read(rel)
    anchor = "            python3 scripts/verify_result_preview.py\n"
    text = replace_once(text, anchor, anchor + "            python3 scripts/verify_pickword_image_viewer.py\n", "verify workflow")
    write(rel, text)


def write_pending_record():
    data = {
        "schema": 1,
        "id": "feature-pickword-image-viewer-stage1",
        "type": "feature",
        "title": "接入拾字截图缩略图与原图查看",
        "details": [
            "框选 OCR 截图路径完整交接到拾字面板，OCR 空结果或失败时仍可保留并查看截图",
            "拾字文本区与截图缩略图在宽屏按 70/30 并排，窄屏自动切换为上图下文",
            "原图查看复用同一个拾字 WindowManager 根布局，返回后保留文字、选区、翻译和滚动状态",
            "新增单图缩放、平移、双击复位、降采样与 BitmapRegionDecoder 可视区域解码",
            "严格限制只读取 ToolHub/screenshots 内部截图，图片模块不接管截图线程和文件删除"
        ],
        "manifestVersion": 0
    }
    write("updates/records/feature-pickword-image-viewer-stage1.json", json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def main():
    patch_th18()
    patch_th21()
    patch_th20()
    write_th22()
    patch_entry()
    patch_boundaries()
    patch_docs()
    write_verify()
    write_pending_record()
    print("Applied pickword image viewer stage1")


if __name__ == "__main__":
    main()
