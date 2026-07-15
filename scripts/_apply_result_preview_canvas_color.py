from pathlib import Path
import re

PREVIEW = Path("code/th_21_result_preview.js")
VERIFY = Path("scripts/verify_result_preview.py")


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit("missing replacement anchor: " + label)
    if text.count(old) != 1:
        raise SystemExit("replacement anchor is not unique: " + label)
    return text.replace(old, new, 1)


def sub_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit("regex replacement failed: " + label + " count=" + str(count))
    return updated


preview = PREVIEW.read_text(encoding="utf-8")
preview = replace_once(preview, "// @version 1.1.1", "// @version 1.1.2", "module version")

color_block = r'''  function colors21\(appObj\) \{.*?\n  function topInset21\(root\) \{'''
color_replacement = r'''  function colorSpec21(a, r, g, b, hex) {
    return {
      a: int21(a, 0) & 255,
      r: int21(r, 0) & 255,
      g: int21(g, 0) & 255,
      b: int21(b, 0) & 255,
      hex: String(hex || "")
    };
  }

  function colors21(appObj) {
    var dark = false;
    var themeSource = "toolhub_unavailable";
    try {
      if (appObj && typeof appObj.isDarkTheme === "function") {
        dark = appObj.isDarkTheme() === true;
        themeSource = "toolhub";
      }
    } catch (eTheme) {
      dark = false;
      themeSource = "toolhub_error";
    }
    return {
      bg: dark ? colorSpec21(255, 27, 27, 31, "#FF1B1B1F") : colorSpec21(255, 255, 255, 255, "#FFFFFFFF"),
      stroke: dark ? colorSpec21(61, 255, 255, 255, "#3DFFFFFF") : colorSpec21(34, 0, 0, 0, "#22000000"),
      text: dark ? colorSpec21(255, 248, 250, 252, "#FFF8FAFC") : colorSpec21(255, 17, 24, 39, "#FF111827"),
      secondary: dark ? colorSpec21(255, 203, 213, 225, "#FFCBD5E1") : colorSpec21(255, 71, 85, 105, "#FF475569"),
      pressed: dark ? colorSpec21(38, 56, 189, 248, "#2638BDF8") : colorSpec21(26, 14, 165, 233, "#1A0EA5E9"),
      themeDark: dark,
      themeSource: themeSource
    };
  }

  function packArgb21(color) {
    if (!color) return 0;
    return (((Number(color.a || 0) & 255) << 24) |
      ((Number(color.r || 0) & 255) << 16) |
      ((Number(color.g || 0) & 255) << 8) |
      (Number(color.b || 0) & 255)) | 0;
  }

  function argbHex21(value) {
    var n = Number(value);
    if (isNaN(n)) n = 0;
    var hex = (n >>> 0).toString(16).toUpperCase();
    while (hex.length < 8) hex = "0" + hex;
    return "0x" + hex;
  }

  // 明确使用 ARGB 通道，随后读取 Paint 实际颜色校验，避免 Rhino 重载或 OEM 颜色转换静默失效。
  function setPaintColor21(paint, color) {
    var expected = packArgb21(color);
    var result = {
      ok: false,
      expected: expected,
      actual: 0,
      expectedHex: argbHex21(expected),
      actualHex: "",
      error: ""
    };
    if (!paint || !color) {
      result.error = "paint_or_color_missing";
      return result;
    }
    try {
      paint.setARGB(color.a, color.r, color.g, color.b);
    } catch (eArgb) {
      result.error = "setARGB:" + String(eArgb);
      return result;
    }
    try {
      result.actual = Number(paint.getColor()) | 0;
      result.actualHex = argbHex21(result.actual);
      result.ok = (result.actual | 0) === (expected | 0);
      if (!result.ok) result.error = "paint_color_mismatch";
    } catch (eRead) {
      result.error = "getColor:" + String(eRead);
    }
    return result;
  }

  function topInset21(root) {'''
preview = sub_once(preview, color_block, color_replacement, "color helpers")

preview = replace_once(
    preview,
    '''    render.themeDark = false;\n    render.themeSource = "";\n    render.disposed = false;''',
    '''    render.themeDark = false;\n    render.themeSource = "";\n    render.bgApplyOk = false;\n    render.strokeApplyOk = false;\n    render.textApplyOk = false;\n    render.bgExpectedHex = "";\n    render.bgActualHex = "";\n    render.textExpectedHex = "";\n    render.textActualHex = "";\n    render.canvasHardware = false;\n    render.windowFormat = 0;\n    render.forceDarkDisabled = false;\n    render.disposed = false;''',
    "sync render diagnostics",
)

draw_pattern = r'''  function drawPreview21\(appObj, st, canvas, view, render\) \{.*?\n  function cancelDismiss21\(st\) \{'''
draw_replacement = r'''  function drawPreview21(appObj, st, canvas, view, render) {
    var c = colors21(appObj);
    if (render) {
      render.themeDark = c.themeDark === true;
      render.themeSource = String(c.themeSource || "");
      try { render.canvasHardware = canvas && canvas.isHardwareAccelerated ? canvas.isHardwareAccelerated() === true : false; } catch (eHardware) { render.canvasHardware = false; }
      try { render.windowFormat = st && st.lp ? Number(st.lp.format || 0) : 0; } catch (eFormat) { render.windowFormat = 0; }
    }
    var width = view.getWidth();
    var height = view.getHeight();
    if (width <= 0 || height <= 0) return false;

    var bg = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
    var rect = new android.graphics.RectF(dp21(appObj, 1), dp21(appObj, 1), width - dp21(appObj, 1), height - dp21(appObj, 1));
    bg.setStyle(android.graphics.Paint.Style.FILL);
    var bgApply = setPaintColor21(bg, c.bg);
    if (render) {
      render.bgApplyOk = bgApply.ok === true;
      render.bgExpectedHex = String(bgApply.expectedHex || "");
      render.bgActualHex = String(bgApply.actualHex || "");
    }
    if (!bgApply.ok) {
      try { safeLog(appObj.L, 'e', "result preview background color apply fail expected=" + String(bgApply.expectedHex || "") + " actual=" + String(bgApply.actualHex || "") + " err=" + String(bgApply.error || "")); } catch (eBgLog) {}
      return false;
    }
    canvas.drawRoundRect(rect, dp21(appObj, 12), dp21(appObj, 12), bg);

    bg.setStyle(android.graphics.Paint.Style.STROKE);
    bg.setStrokeWidth(dp21(appObj, 1));
    var strokeApply = setPaintColor21(bg, c.stroke);
    if (render) render.strokeApplyOk = strokeApply.ok === true;
    if (!strokeApply.ok) {
      try { safeLog(appObj.L, 'e', "result preview stroke color apply fail expected=" + String(strokeApply.expectedHex || "") + " actual=" + String(strokeApply.actualHex || "") + " err=" + String(strokeApply.error || "")); } catch (eStrokeLog) {}
      return false;
    }
    canvas.drawRoundRect(rect, dp21(appObj, 12), dp21(appObj, 12), bg);

    var textPaint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
    var textApply = setPaintColor21(textPaint, c.text);
    if (render) {
      render.textApplyOk = textApply.ok === true;
      render.textExpectedHex = String(textApply.expectedHex || "");
      render.textActualHex = String(textApply.actualHex || "");
    }
    if (!textApply.ok) {
      try { safeLog(appObj.L, 'e', "result preview text color apply fail expected=" + String(textApply.expectedHex || "") + " actual=" + String(textApply.actualHex || "") + " err=" + String(textApply.error || "")); } catch (eTextLog) {}
      return false;
    }
    textPaint.setTextSize(sp21(14));
    var x = dp21(appObj, 14);
    var line1 = String(render && render.line1 !== undefined ? render.line1 : st.line1 || "");
    var line2 = String(render && render.line2 !== undefined ? render.line2 : st.line2 || "");
    if (line2) {
      canvas.drawText(new java.lang.String(line1), x, dp21(appObj, 25), textPaint);
      var secondaryApply = setPaintColor21(textPaint, c.secondary);
      if (!secondaryApply.ok) {
        if (render) render.textApplyOk = false;
        try { safeLog(appObj.L, 'e', "result preview secondary color apply fail expected=" + String(secondaryApply.expectedHex || "") + " actual=" + String(secondaryApply.actualHex || "") + " err=" + String(secondaryApply.error || "")); } catch (eSecondaryLog) {}
        return false;
      }
      canvas.drawText(new java.lang.String(line2), x, dp21(appObj, 47), textPaint);
    } else {
      canvas.drawText(new java.lang.String(line1), x, dp21(appObj, 30), textPaint);
    }
    return true;
  }

  function cancelDismiss21(st) {'''
preview = sub_once(preview, draw_pattern, draw_replacement, "draw preview")

preview = replace_once(
    preview,
    '''        " theme=" + String(render.themeDark === true ? "dark" : "light") +\n        " themeSource=" + String(render.themeSource || ""));''',
    '''        " theme=" + String(render.themeDark === true ? "dark" : "light") +\n        " themeSource=" + String(render.themeSource || "") +\n        " bgApply=" + String(render.bgApplyOk === true) +\n        " bgExpected=" + String(render.bgExpectedHex || "") +\n        " bgActual=" + String(render.bgActualHex || "") +\n        " strokeApply=" + String(render.strokeApplyOk === true) +\n        " textApply=" + String(render.textApplyOk === true) +\n        " textExpected=" + String(render.textExpectedHex || "") +\n        " textActual=" + String(render.textActualHex || "") +\n        " canvasHardware=" + String(render.canvasHardware === true) +\n        " windowFormat=" + String(render.windowFormat || 0) +\n        " forceDarkDisabled=" + String(render.forceDarkDisabled === true));''',
    "first draw diagnostics",
)

preview = replace_once(
    preview,
    '''      themeDark: false,\n      themeSource: "",\n      disposed: false,''',
    '''      themeDark: false,\n      themeSource: "",\n      bgApplyOk: false,\n      strokeApplyOk: false,\n      textApplyOk: false,\n      bgExpectedHex: "",\n      bgActualHex: "",\n      textExpectedHex: "",\n      textActualHex: "",\n      canvasHardware: false,\n      windowFormat: 0,\n      forceDarkDisabled: false,\n      disposed: false,''',
    "initial render diagnostics",
)

preview = replace_once(
    preview,
    '''    try { PreviewView.setVisibility(android.view.View.VISIBLE); } catch (eVisible) {}\n    // 不创建软件离屏图层；保持 Canvas 全自绘，但让 WindowManager 正常驱动首帧 traversal。\n    try { PreviewView.setLayerType(android.view.View.LAYER_TYPE_NONE, null); } catch (eLayer) {}''',
    '''    try { PreviewView.setVisibility(android.view.View.VISIBLE); } catch (eVisible) {}\n    try { PreviewView.setBackgroundColor(android.graphics.Color.TRANSPARENT); } catch (eBackground) {}\n    try {\n      if (android.os.Build.VERSION.SDK_INT >= 29) {\n        PreviewView.setForceDarkAllowed(false);\n        render.forceDarkDisabled = true;\n      }\n    } catch (eForceDark) { render.forceDarkDisabled = false; }\n    // 不创建软件离屏图层；保持 Canvas 全自绘，但让 WindowManager 正常驱动首帧 traversal。\n    try { PreviewView.setLayerType(android.view.View.LAYER_TYPE_NONE, null); } catch (eLayer) {}''',
    "disable force dark",
)

preview = replace_once(
    preview,
    "      android.graphics.PixelFormat.TRANSLUCENT\n    );",
    "      android.graphics.PixelFormat.RGBA_8888\n    );",
    "deterministic overlay format",
)

PREVIEW.write_text(preview, encoding="utf-8")

verify = VERIFY.read_text(encoding="utf-8")
verify_anchor = '''    require(\n        "preview / paint color avoids ColorLong overload",'''
verify_insert = '''    require(\n        "preview / deterministic Canvas color application",\n        "function colorSpec21(a, r, g, b, hex)" in preview\n        and "function packArgb21(color)" in preview\n        and "function argbHex21(value)" in preview\n        and "paint.setARGB(color.a, color.r, color.g, color.b);" in preview\n        and "paint.getColor()" in preview\n        and "result preview background color apply fail" in preview\n        and "bgApplyOk" in preview\n        and '" bgExpected="' in preview\n        and '" bgActual="' in preview\n        and '" textActual="' in preview\n        and '" canvasHardware="' in preview\n        and '" forceDarkDisabled="' in preview\n        and "PreviewView.setForceDarkAllowed(false);" in preview\n        and "android.graphics.PixelFormat.RGBA_8888" in preview\n        and "android.graphics.PixelFormat.TRANSLUCENT" not in create_lp,\n        "result preview must apply explicit ARGB channels, validate Paint colors, disable Force Dark and use a deterministic RGBA overlay format",\n        failures,\n    )\n'''
if verify_anchor not in verify:
    raise SystemExit("missing verifier insertion anchor")
verify = verify.replace(verify_anchor, verify_insert + verify_anchor, 1)
VERIFY.write_text(verify, encoding="utf-8")

print("patched", PREVIEW, VERIFY)
