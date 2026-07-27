#!/usr/bin/env python3
"""Idempotently prepare the beta-only ShortXUI runtime release."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "ToolHub.js"
GENERATOR = ROOT / "scripts" / "generate_signed_manifest.py"
RUNTIME_FILE = ROOT / "code" / "th_24_shortx_ui_runtime.js"
LAB_FILE = ROOT / "code" / "th_34_shortx_ui_lab.js"
TARGET_ENTRY_VERSION = 20260727234500
RUNTIME = '"th_24_shortx_ui_runtime.js"'
LAB = '"th_34_shortx_ui_lab.js"'


def insert_after(text, anchor, item):
    if item in text:
        return text
    if anchor not in text:
        raise SystemExit("module anchor missing: %s" % anchor)
    return text.replace(anchor, anchor + ", " + item, 1)


def replace_function(text, name, next_name, replacement):
    pattern = re.compile(
        r"  function %s\(.*?\n  \}\n\n(?=  function %s\()"
        % (re.escape(name), re.escape(next_name)),
        re.S,
    )
    updated, count = pattern.subn(replacement.rstrip() + "\n\n", text, count=1)
    if count != 1:
        raise SystemExit("ShortXUI function patch failed: %s" % name)
    return updated


def patch_entry():
    text = ENTRY.read_text(encoding="utf-8")
    original = text
    text = insert_after(text, '"th_02_core.js"', RUNTIME)
    text = insert_after(text, '"th_15_extra.js"', LAB)

    pattern = re.compile(r"var TOOLHUB_ENTRY_VERSION = (\d+);")
    match = pattern.search(text)
    if not match:
        raise SystemExit("TOOLHUB_ENTRY_VERSION missing")
    current = int(match.group(1))
    if current < TARGET_ENTRY_VERSION:
        text = pattern.sub(
            "var TOOLHUB_ENTRY_VERSION = %d;" % TARGET_ENTRY_VERSION,
            text,
            count=1,
        )

    if text != original:
        ENTRY.write_text(text, encoding="utf-8")
        return True
    return False


def patch_generator():
    text = GENERATOR.read_text(encoding="utf-8")
    original = text
    text = insert_after(text, '"th_02_core.js"', RUNTIME)
    text = insert_after(text, '"th_15_extra.js"', LAB)
    if text != original:
        GENERATOR.write_text(text, encoding="utf-8")
        return True
    return False


def patch_runtime():
    text = RUNTIME_FILE.read_text(encoding="utf-8")
    original = text
    text = re.sub(r"(?m)^// @version 0\.1\.[012]$", "// @version 0.1.3", text, count=1)
    text = re.sub(r'VERSION: "0\.1\.[012]"', 'VERSION: "0.1.3"', text, count=1)
    text = text.replace(
        "  var ColorStateList = Packages.android.content.res.ColorStateList;\n",
        "",
        1,
    )
    if "  var sxuiColorBridge = null;\n" not in text:
        anchor = "  var WindowInsets = Packages.android.view.WindowInsets;\n"
        if anchor not in text:
            raise SystemExit("ShortXUI WindowInsets anchor missing")
        text = text.replace(anchor, anchor + "  var sxuiColorBridge = null;\n", 1)

    text = replace_function(
        text,
        "sxuiColorStateList",
        "sxuiStateList",
        '''  function sxuiColorStateList(value) {
    if (!sxuiColorBridge || typeof sxuiColorBridge.colorStateList !== "function") {
      throw new Error("ShortXUI color bridge is not installed");
    }
    return sxuiColorBridge.colorStateList(value);
  }''',
    )
    text = replace_function(
        text,
        "sxuiStateList",
        "sxuiSafeSetTextColor",
        '''  function sxuiStateList(states, colors) {
    if (!sxuiColorBridge || typeof sxuiColorBridge.stateList !== "function") {
      throw new Error("ShortXUI color bridge is not installed");
    }
    return sxuiColorBridge.stateList(states || [], colors || []);
  }''',
    )
    text = replace_function(
        text,
        "sxuiSafeSetTextColor",
        "sxuiSafeSetHintColor",
        '''  function sxuiSafeSetTextColor(view, value) {
    if (!sxuiColorBridge || typeof sxuiColorBridge.applyText !== "function") return false;
    return sxuiColorBridge.applyText(view, value) === true;
  }''',
    )
    text = replace_function(
        text,
        "sxuiSafeSetHintColor",
        "sxuiSafeSetGradientColor",
        '''  function sxuiSafeSetHintColor(view, value) {
    if (!sxuiColorBridge || typeof sxuiColorBridge.applyHint !== "function") return false;
    return sxuiColorBridge.applyHint(view, value) === true;
  }''',
    )
    text = replace_function(
        text,
        "sxuiSafeSetGradientColor",
        "sxuiSafeSetGradientStroke",
        '''  function sxuiSafeSetGradientColor(drawable, value) {
    if (!sxuiColorBridge || typeof sxuiColorBridge.applyGradient !== "function") return false;
    return sxuiColorBridge.applyGradient(drawable, value) === true;
  }''',
    )
    text = replace_function(
        text,
        "sxuiSafeSetGradientStroke",
        "sxuiMakeRunnable",
        '''  function sxuiSafeSetGradientStroke(drawable, widthPx, value) {
    if (!sxuiColorBridge || typeof sxuiColorBridge.applyStroke !== "function") return false;
    return sxuiColorBridge.applyStroke(drawable, widthPx, value) === true;
  }''',
    )

    color_block = re.compile(
        r"  SXUI\.Color = \{.*?\n  \};\n\n(?=  SXUI\.Metrics = \{)",
        re.S,
    )
    replacement = '''  SXUI.Color = {
    installBridge: function (bridge) {
      var required = ["colorStateList", "stateList", "applyText", "applyHint",
        "applyPaint", "applyBackground", "applyGradient", "applyStroke"];
      var index;
      if (!bridge) throw new Error("ShortXUI color bridge is required");
      for (index = 0; index < required.length; index += 1) {
        if (typeof bridge[required[index]] !== "function") {
          throw new Error("ShortXUI color bridge method missing: " + required[index]);
        }
      }
      sxuiColorBridge = bridge;
      return true;
    },
    hasBridge: function () { return sxuiColorBridge !== null; },
    int: sxuiColorInt,
    jintArray: sxuiJintArray,
    jint2Array: sxuiJint2Array,
    stateList: sxuiStateList,
    colorStateList: sxuiColorStateList,
    alpha: function (value) { return (sxuiColorInt(value, 0) >>> 24) & 255; },
    red: function (value) { return (sxuiColorInt(value, 0) >>> 16) & 255; },
    green: function (value) { return (sxuiColorInt(value, 0) >>> 8) & 255; },
    blue: function (value) { return sxuiColorInt(value, 0) & 255; },
    withAlpha: function (value, alpha) {
      var color = sxuiColorInt(value, 0);
      var a = Math.round(sxuiClamp(alpha, 0, 1) * 255);
      return ((a << 24) | (color & 0x00FFFFFF)) | 0;
    },
    luminance: function (value) {
      var color = sxuiColorInt(value, 0);
      return ((((color >>> 16) & 255) * 0.299) +
        (((color >>> 8) & 255) * 0.587) + ((color & 255) * 0.114)) / 255;
    },
    applyText: sxuiSafeSetTextColor,
    applyHint: sxuiSafeSetHintColor,
    applyPaint: function (paint, value) {
      if (!sxuiColorBridge || typeof sxuiColorBridge.applyPaint !== "function") return false;
      return sxuiColorBridge.applyPaint(paint, value) === true;
    },
    applyBackground: function (view, value) {
      if (!sxuiColorBridge || typeof sxuiColorBridge.applyBackground !== "function") return false;
      return sxuiColorBridge.applyBackground(view, value) === true;
    },
    applyGradient: sxuiSafeSetGradientColor,
    applyStroke: sxuiSafeSetGradientStroke
  };

'''
    text, count = color_block.subn(replacement, text, count=1)
    if count != 1:
        raise SystemExit("ShortXUI Color facade patch failed")

    forbidden = (
        "ColorStateList.valueOf(",
        "new ColorStateList(",
        ".setTextColor(",
        ".setHintTextColor(",
        ".setBackgroundColor(",
        ".setColor(",
        ".setStroke(",
        ".setARGB(",
    )
    for token in forbidden:
        if token in text:
            raise SystemExit("forbidden direct color token remains: %s" % token)
    if "// @version 0.1.3" not in text or 'VERSION: "0.1.3"' not in text:
        raise SystemExit("ShortXUI runtime version patch incomplete")
    if text != original:
        RUNTIME_FILE.write_text(text, encoding="utf-8")
        return True
    return False


def patch_lab():
    text = LAB_FILE.read_text(encoding="utf-8")
    original = text
    text = re.sub(r"(?m)^// @version 0\.1\.0$", "// @version 0.1.1", text, count=1)
    marker = '''  var proto = FloatBallAppWM.prototype;
  if (proto.__shortXUiLabInstalled === true) return;
'''
    bridge = '''  var proto = FloatBallAppWM.prototype;
  if (proto.__shortXUiLabInstalled === true) return;

  global.ShortXUI.Color.installBridge({
    colorStateList: function (value) {
      return toolhubSafeColorStateList(value);
    },
    stateList: function (states, colors) {
      return toolhubSafeColorStateListFromStates(states, colors);
    },
    applyText: function (view, value) {
      return toolhubSafeSetTextColor(view, value);
    },
    applyHint: function (view, value) {
      return toolhubSafeSetHintTextColor(view, value);
    },
    applyPaint: function (paint, value) {
      return toolhubSafeSetPaintColor(paint, value);
    },
    applyBackground: function (view, value) {
      return toolhubSafeSetBackgroundColor(view, value);
    },
    applyGradient: function (drawable, value) {
      return toolhubSafeSetGradientColor(drawable, value);
    },
    applyStroke: function (drawable, widthPx, value) {
      return toolhubSafeSetGradientStroke(drawable, widthPx, value);
    }
  });
'''
    if "global.ShortXUI.Color.installBridge({" not in text:
        if marker not in text:
            raise SystemExit("ShortXUI lab bridge anchor missing")
        text = text.replace(marker, bridge, 1)
    if "// @version 0.1.1" not in text:
        raise SystemExit("ShortXUI lab version patch incomplete")
    if text != original:
        LAB_FILE.write_text(text, encoding="utf-8")
        return True
    return False


def main():
    entry_changed = patch_entry()
    generator_changed = patch_generator()
    runtime_changed = patch_runtime()
    lab_changed = patch_lab()
    if entry_changed or generator_changed or runtime_changed or lab_changed:
        print(
            "updated beta ShortXUI release entry=%s generator=%s runtime=%s lab=%s"
            % (entry_changed, generator_changed, runtime_changed, lab_changed)
        )
    else:
        print("beta ShortXUI release already current")


if __name__ == "__main__":
    main()
