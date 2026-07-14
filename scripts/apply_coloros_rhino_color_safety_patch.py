#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, text):
    (ROOT / path).write_text(text.rstrip() + "\n", encoding="utf-8", newline="\n")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("FAIL %s: expected 1 anchor, found %d" % (label, count))
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit("FAIL %s: expected 1 match, found %d" % (label, count))
    return updated


# ---------------------------------------------------------------------------
# th_04_theme.js：建立 Rhino -> Android 安全颜色桥，并移除悬浮球 framework ripple。
# ---------------------------------------------------------------------------
theme_path = "code/th_04_theme.js"
theme = read(theme_path)
theme = replace_once(theme, "// @version 1.0.2", "// @version 1.0.3", "theme version")

safe_helpers = r'''// =======================【Rhino / ColorOS 安全颜色桥】=======================
// Rhino 数字可能在带 int/long/ColorStateList 重载的 Android API 上发生误分派。
// 所有进入高风险颜色接口的值先规范为 32 位 int，或显式封装为 Java ColorStateList。
function toolhubColorInt(value, fallback) {
  var n = Number(value);
  if (isNaN(n)) n = Number(fallback || 0);
  if (isNaN(n)) n = 0;
  return n | 0;
}

function toolhubJintArray(values) {
  var src = values || [];
  var arr = java.lang.reflect.Array.newInstance(java.lang.Integer.TYPE, src.length);
  for (var i = 0; i < src.length; i++) arr[i] = toolhubColorInt(src[i], 0);
  return arr;
}

function toolhubJint2Array(rows) {
  var src = rows || [];
  var outer = java.lang.reflect.Array.newInstance(java.lang.Class.forName("[I"), src.length);
  for (var i = 0; i < src.length; i++) outer[i] = toolhubJintArray(src[i]);
  return outer;
}

function toolhubSafeColorStateList(colorValue) {
  var color = toolhubColorInt(colorValue, 0);
  return new android.content.res.ColorStateList(
    toolhubJint2Array([
      [android.R.attr.state_pressed],
      [android.R.attr.state_focused],
      [android.R.attr.state_selected],
      []
    ]),
    toolhubJintArray([color, color, color, color])
  );
}

function toolhubSafeSetTextColor(viewObj, colorValue) {
  if (!viewObj) return false;
  viewObj.setTextColor(toolhubSafeColorStateList(colorValue));
  return true;
}

function toolhubSafeSetGradientColor(drawableObj, colorValue) {
  if (!drawableObj) return false;
  drawableObj.setColor(toolhubSafeColorStateList(colorValue));
  return true;
}

function toolhubSafeSetGradientStroke(drawableObj, widthPx, colorValue) {
  if (!drawableObj) return false;
  var width = Math.max(0, Math.round(Number(widthPx) || 0));
  drawableObj.setStroke(width, toolhubSafeColorStateList(colorValue));
  return true;
}

function toolhubSafeSetTintColor(drawableObj, colorValue) {
  if (!drawableObj) return false;
  drawableObj.setTintList(toolhubSafeColorStateList(colorValue));
  return true;
}

function toolhubSafeSetPaintColor(paintObj, colorValue) {
  if (!paintObj) return false;
  var color = toolhubColorInt(colorValue, 0);
  paintObj.setARGB(
    (color >>> 24) & 255,
    (color >>> 16) & 255,
    (color >>> 8) & 255,
    color & 255
  );
  return true;
}

function toolhubColorLuminance(colorValue) {
  var color = toolhubColorInt(colorValue, 0);
  var r = (color >>> 16) & 255;
  var g = (color >>> 8) & 255;
  var b = color & 255;
  return (r * 0.299 + g * 0.587 + b * 0.114) / 255.0;
}

function toolhubCompositeColor(overlayValue, baseValue) {
  var overlay = toolhubColorInt(overlayValue, 0);
  var base = toolhubColorInt(baseValue, 0);
  var sa = (overlay >>> 24) & 255;
  var sr = (overlay >>> 16) & 255;
  var sg = (overlay >>> 8) & 255;
  var sb = overlay & 255;
  var ba = (base >>> 24) & 255;
  var br = (base >>> 16) & 255;
  var bg = (base >>> 8) & 255;
  var bb = base & 255;
  var inv = 255 - sa;
  var outA = sa + Math.round(ba * inv / 255);
  if (outA <= 0) return 0;
  var outR = Math.round((sr * sa + br * ba * inv / 255) / outA);
  var outG = Math.round((sg * sa + bg * ba * inv / 255) / outA);
  var outB = Math.round((sb * sa + bb * ba * inv / 255) / outA);
  return ((outA << 24) | (outR << 16) | (outG << 8) | outB) | 0;
}

'''

theme = replace_once(
    theme,
    "// =======================【工具：UI样式辅助】======================",
    safe_helpers + "// =======================【工具：UI样式辅助】======================",
    "safe color helpers",
)

ui_helpers = r'''    // 创建圆角背景 (Solid)
    createRoundDrawable: function(color, radiusPx) {
        var d = new android.graphics.drawable.GradientDrawable();
        d.setShape(android.graphics.drawable.GradientDrawable.RECTANGLE);
        toolhubSafeSetGradientColor(d, color);
        d.setCornerRadius(radiusPx);
        return d;
    },

    // 创建圆角描边背景 (Stroke)
    createStrokeDrawable: function(fillColor, strokeColor, strokeWidthPx, radiusPx) {
        var d = new android.graphics.drawable.GradientDrawable();
        d.setShape(android.graphics.drawable.GradientDrawable.RECTANGLE);
        if (fillColor !== null && fillColor !== undefined) toolhubSafeSetGradientColor(d, fillColor);
        d.setCornerRadius(radiusPx);
        toolhubSafeSetGradientStroke(d, strokeWidthPx, strokeColor);
        return d;
    },

    // 创建按压反馈背景。名称保留兼容，实际使用 StateListDrawable，避免 framework RippleDrawable。
    createRippleDrawable: function(normalColor, pressedColor, radiusPx) {
        var sd = new android.graphics.drawable.StateListDrawable();
        var p = this.createRoundDrawable(pressedColor, radiusPx);
        var n = this.createRoundDrawable(normalColor, radiusPx);
        sd.addState(toolhubJintArray([android.R.attr.state_pressed]), p);
        sd.addState(toolhubJintArray([]), n);
        return sd;
    },

    // 创建透明背景按压反馈。默认态也使用安全 GradientDrawable。
    createTransparentRippleDrawable: function(pressedColor, radiusPx) {
        var sd = new android.graphics.drawable.StateListDrawable();
        var p = this.createRoundDrawable(pressedColor, radiusPx);
        var n = this.createRoundDrawable(android.graphics.Color.TRANSPARENT, radiusPx);
        sd.addState(toolhubJintArray([android.R.attr.state_pressed]), p);
        sd.addState(toolhubJintArray([]), n);
        return sd;
    },

'''

theme = regex_once(
    theme,
    r"    // 创建圆角背景 \(Solid\).*?    // 辅助：把符号按钮转换成可读语义，供 TalkBack 和自动化识别。",
    ui_helpers + "    // 辅助：把符号按钮转换成可读语义，供 TalkBack 和自动化识别。",
    "safe ui drawable helpers",
)

safe_argb = r'''function _th_argb(c) {
  try {
    var ci = toolhubColorInt(c, 0);
    return "a=" + ((ci >>> 24) & 255) +
      " r=" + ((ci >>> 16) & 255) +
      " g=" + ((ci >>> 8) & 255) +
      " b=" + (ci & 255);
  } catch (e) {
    return "argb_err";
  }
}'''

theme = regex_once(
    theme,
    r"function _th_argb\(c\) \{.*?\n\}",
    safe_argb,
    "safe argb logger",
)

safe_ball_background = r'''FloatBallAppWM.prototype.updateBallContentBackground = function(contentView, usedIconKind) {
  try {
    var ballColor = this.getMonetAccentForBall();
    try {
      var bgHex = String(this.config.BALL_BG_COLOR_HEX || "").trim();
      if (bgHex.length > 0) ballColor = android.graphics.Color.parseColor(bgHex);
    } catch(eCustomBg) {
      safeLog(this.L, 'e', "BALL_BG_COLOR_HEX parse failed, fallback Monet accent: " + String(eCustomBg));
    }

    var dark = this.isDarkTheme();
    var alpha01 = dark ? this.config.BALL_RIPPLE_ALPHA_DARK : this.config.BALL_RIPPLE_ALPHA_LIGHT;
    var rippleColor = this.withAlpha(ballColor, alpha01);
    var fillColor = ballColor;
    var usedKind = "none";
    try { usedKind = usedIconKind || this.state.usedIconKind || "none"; } catch(eKind) {}

    try {
      var pngMode = Number(this.config.BALL_PNG_MODE || 0);
      if ((pngMode === 1 && usedKind === "file") || usedKind === "app") {
        fillColor = android.graphics.Color.TRANSPARENT;
      }
    } catch(eBg) {}

    var strokeColor = null;
    if (usedKind !== "file" && usedKind !== "app") {
      strokeColor = toolhubColorLuminance(fillColor) > 0.55
        ? android.graphics.Color.parseColor("#33000000")
        : android.graphics.Color.parseColor("#55FFFFFF");
    }

    var self = this;
    function makeBallLayer(colorValue) {
      var layer = new android.graphics.drawable.GradientDrawable();
      layer.setShape(android.graphics.drawable.GradientDrawable.OVAL);
      toolhubSafeSetGradientColor(layer, colorValue);
      if (strokeColor !== null) toolhubSafeSetGradientStroke(layer, self.dp(1), strokeColor);
      return layer;
    }

    var normal = makeBallLayer(fillColor);
    var pressed = makeBallLayer(toolhubCompositeColor(rippleColor, fillColor));
    var states = new android.graphics.drawable.StateListDrawable();
    states.addState(toolhubJintArray([android.R.attr.state_pressed]), pressed);
    states.addState(toolhubJintArray([]), normal);
    contentView.setBackground(states);
  } catch(e) {
    safeLog(this.L, 'e', "update ball background fail: " + String(e));
  }
};
FloatBallAppWM.prototype.getPanelTextColorInt'''

theme = regex_once(
    theme,
    r"FloatBallAppWM\.prototype\.updateBallContentBackground = function\(contentView, usedIconKind\) \{.*?\n\};\nFloatBallAppWM\.prototype\.getPanelTextColorInt",
    safe_ball_background,
    "stable ball background",
)

write(theme_path, theme)


# ---------------------------------------------------------------------------
# th_15_main_panel.js：功能卡片改用 StateListDrawable，避免 patterned ripple 绘制崩溃。
# ---------------------------------------------------------------------------
main_path = "code/th_15_main_panel.js"
main = read(main_path)
main = replace_once(main, "// @version 1.5.5", "// @version 1.5.6", "main panel version")

safe_main_ripple = r'''FloatBallAppWM.prototype.createMainPanelRippleBackground = function(fillColor, strokeColor, rippleColor, radiusPx) {
  try {
    var normal = this.ui.createStrokeDrawable(fillColor, strokeColor, this.dp(1), radiusPx);
    var pressedFill = toolhubCompositeColor(rippleColor, fillColor);
    var pressed = this.ui.createStrokeDrawable(pressedFill, strokeColor, this.dp(1), radiusPx);
    var states = new android.graphics.drawable.StateListDrawable();
    states.addState(toolhubJintArray([android.R.attr.state_pressed]), pressed);
    states.addState(toolhubJintArray([]), normal);
    return states;
  } catch (e) {
    safeLog(this.L, 'w', 'main panel stable press background fallback: ' + String(e));
    return this.ui.createRoundDrawable(fillColor, radiusPx);
  }
};

FloatBallAppWM.prototype.createMainPanelToolbarButton'''

main = regex_once(
    main,
    r"FloatBallAppWM\.prototype\.createMainPanelRippleBackground = function\(fillColor, strokeColor, rippleColor, radiusPx\) \{.*?\n\};\n\nFloatBallAppWM\.prototype\.createMainPanelToolbarButton",
    safe_main_ripple,
    "stable main panel card background",
)
write(main_path, main)


# ---------------------------------------------------------------------------
# 永久专项验证：禁止热点重新引入 framework ripple / ColorStateList.valueOf。
# ---------------------------------------------------------------------------
verify_path = ROOT / "scripts/verify_coloros_rhino_color_safety.py"
verify_text = r'''#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "code"
THEME = (CODE / "th_04_theme.js").read_text(encoding="utf-8")
MAIN = (CODE / "th_15_main_panel.js").read_text(encoding="utf-8")
ALL_JS = "\n".join(p.read_text(encoding="utf-8") for p in sorted(CODE.glob("*.js")))

errors = []

for token in (
    "new android.graphics.drawable.RippleDrawable",
    "ColorStateList.valueOf(",
    "android.content.res.ColorStateList.valueOf(",
):
    if token in ALL_JS:
        errors.append("forbidden framework ripple token remains: %s" % token)

for token in (
    "function toolhubColorInt(",
    "function toolhubJintArray(",
    "function toolhubJint2Array(",
    "function toolhubSafeColorStateList(",
    "function toolhubSafeSetGradientColor(",
    "function toolhubSafeSetGradientStroke(",
    "function toolhubSafeSetPaintColor(",
    "function toolhubCompositeColor(",
):
    if token not in THEME:
        errors.append("missing safe color helper: %s" % token)

if "StateListDrawable" not in THEME or "updateBallContentBackground" not in THEME:
    errors.append("ball background is not protected by StateListDrawable")
if "StateListDrawable" not in MAIN or "createMainPanelRippleBackground" not in MAIN:
    errors.append("main panel card background is not protected by StateListDrawable")

argb = re.search(r"function _th_argb\(c\) \{.*?\n\}", THEME, re.S)
if not argb:
    errors.append("_th_argb missing")
else:
    block = argb.group(0)
    for token in ("Color.alpha", "Color.red", "Color.green", "Color.blue"):
        if token in block:
            errors.append("unsafe overloaded color channel call remains in _th_argb: %s" % token)

if not THEME.startswith("// @version 1.0.3"):
    errors.append("th_04_theme.js version not bumped to 1.0.3")
if not MAIN.startswith("// @version 1.5.6"):
    errors.append("th_15_main_panel.js version not bumped to 1.5.6")

if errors:
    for item in errors:
        print("FAIL", item)
    raise SystemExit(1)

print("OK coloros_rhino_color_safety framework_ripple=0 safe_helpers=8")
'''
verify_path.write_text(verify_text.rstrip() + "\n", encoding="utf-8", newline="\n")


# ---------------------------------------------------------------------------
# 接入普通 CI 与签名 CI。
# ---------------------------------------------------------------------------
workflow_path = ".github/workflows/verify.yml"
workflow = read(workflow_path)
workflow = replace_once(
    workflow,
    "          python3 scripts/verify_settings_color_roles.py\n          python3 scripts/verify_button_editor_layout.py",
    "          python3 scripts/verify_settings_color_roles.py\n          python3 scripts/verify_coloros_rhino_color_safety.py\n          python3 scripts/verify_button_editor_layout.py",
    "verify workflow color safety",
)
write(workflow_path, workflow)

sign_path = ".github/workflows/sign-toolhub.yml"
sign = read(sign_path)
sign = replace_once(
    sign,
    "          python3 scripts/verify_settings_color_roles.py\n          python3 scripts/verify_button_editor_layout.py",
    "          python3 scripts/verify_settings_color_roles.py\n          python3 scripts/verify_coloros_rhino_color_safety.py\n          python3 scripts/verify_button_editor_layout.py",
    "sign workflow color safety",
)
write(sign_path, sign)

print("OK applied ColorOS Rhino color safety patch")
