#!/usr/bin/env python3
from pathlib import Path


def replace_once(path, old, new):
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            "expected one match in %s, got %d\n--- old ---\n%s"
            % (path, count, old)
        )
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


theme = Path("code/th_04_theme.js")
panel = Path("code/th_13_panel_ui.js")
coloros_verify = Path("scripts/verify_coloros_rhino_color_safety.py")
rhino_verify = Path("scripts/verify_rhino_color_api_safety.py")

replace_once(theme, "// @version 1.0.4", "// @version 1.0.5")

replace_once(
    theme,
    '''function toolhubIsColorStateList(value) {
  return toolhubJavaClassName(value) === "android.content.res.ColorStateList";
}''',
    '''function toolhubIsColorStateList(value) {
  if (!value) return false;
  try {
    var cls = java.lang.Class.forName("android.content.res.ColorStateList");
    if (cls && cls.isInstance(value)) return true;
  } catch (eInstance) {}
  return toolhubJavaClassName(value) === "android.content.res.ColorStateList";
}'''
)

replace_once(
    theme,
    '''function toolhubSafeColorStateList(colorValue) {
  if (toolhubIsColorStateList(colorValue)) return colorValue;
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
}''',
    '''function toolhubSafeColorStateList(colorValue) {
  if (toolhubIsColorStateList(colorValue)) return colorValue;
  var color = toolhubColorInt(colorValue, 0);
  return new android.content.res.ColorStateList(
    toolhubJint2Array([[]]),
    toolhubJintArray([color])
  );
}'''
)

replace_once(
    theme,
    '''function toolhubSafeColorStateListFromStates(stateRows, colorValues) {
  if (toolhubIsColorStateList(stateRows)) return stateRows;
  return new android.content.res.ColorStateList(
    toolhubJint2Array(stateRows || []),
    toolhubJintArray(colorValues || [])
  );
}''',
    '''function toolhubSafeColorStateListFromStates(stateRows, colorValues) {
  if (toolhubIsColorStateList(stateRows)) return stateRows;
  var states = stateRows || [];
  var colors = colorValues || [];
  var safeStates = [];
  var safeColors = [];
  var fallbackColor = colors.length > 0
    ? toolhubColorInt(colors[colors.length - 1], 0)
    : 0;
  var i;

  if (!states.length || states.length !== colors.length) {
    return toolhubSafeColorStateList(fallbackColor);
  }

  for (i = 0; i < states.length; i++) {
    var row = states[i];
    if (row === null || typeof row === "undefined" || typeof row.length === "undefined") {
      return toolhubSafeColorStateList(fallbackColor);
    }
    safeStates.push(row);
    safeColors.push(toolhubColorInt(colors[i], fallbackColor));
  }

  if (Number(safeStates[safeStates.length - 1].length || 0) !== 0) {
    safeStates.push([]);
    safeColors.push(safeColors[safeColors.length - 1]);
  }

  return new android.content.res.ColorStateList(
    toolhubJint2Array(safeStates),
    toolhubJintArray(safeColors)
  );
}'''
)

replace_once(
    theme,
    '''    // 创建按压反馈背景。名称保留兼容，实际使用 StateListDrawable，避免 framework RippleDrawable。
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
    },''',
    '''    // 创建稳定按压状态背景，不进入 framework RippleDrawable 绘制链。
    createPressedStateDrawable: function(normalColor, pressedColor, radiusPx) {
        var sd = new android.graphics.drawable.StateListDrawable();
        var p = this.createRoundDrawable(pressedColor, radiusPx);
        var n = this.createRoundDrawable(normalColor, radiusPx);
        sd.addState(toolhubJintArray([android.R.attr.state_pressed]), p);
        sd.addState(toolhubJintArray([]), n);
        return sd;
    },

    // 创建透明默认态的稳定按压背景。
    createTransparentPressedStateDrawable: function(pressedColor, radiusPx) {
        return this.createPressedStateDrawable(
            android.graphics.Color.TRANSPARENT,
            pressedColor,
            radiusPx
        );
    },

    // 兼容旧调用名称；实际为按压换色反馈，不创建 framework RippleDrawable。
    createRippleDrawable: function(normalColor, pressedColor, radiusPx) {
        return this.createPressedStateDrawable(normalColor, pressedColor, radiusPx);
    },

    // 兼容旧调用名称。
    createTransparentRippleDrawable: function(pressedColor, radiusPx) {
        return this.createTransparentPressedStateDrawable(pressedColor, radiusPx);
    },'''
)

replace_once(panel, "// @version 1.0.7", "// @version 1.0.8")

replace_once(
    panel,
    '''  // 增加点击波纹反馈
  try {
      var outValue = new android.util.TypedValue();
      context.getTheme().resolveAttribute(android.R.attr.selectableItemBackground, outValue, true);
      row.setBackgroundResource(outValue.resourceId);
   } catch(e) { safeLog(null, 'e', "catch " + String(e)); }''',
    '''  // 使用项目内稳定按压状态背景，避免主题资源间接加载 framework RippleDrawable。
  try {
      var rowPressedColor = this.withAlpha(primary, isDark ? 0.16 : 0.10);
      row.setBackground(this.ui.createTransparentPressedStateDrawable(rowPressedColor, this.dp(12)));
  } catch(eRowBg) {
      try {
        row.setBackground(this.ui.createRoundDrawable(android.graphics.Color.TRANSPARENT, this.dp(12)));
      } catch(eRowBgFallback) {}
      safeLog(null, 'e', "setting row press background fail " + String(eRowBg));
  }'''
)

replace_once(
    panel,
    '''    // 透明波纹背景
    btn.setBackground(self.ui.createTransparentRippleDrawable(primary, self.dp(14)));''',
    '''    // 使用低透明度按压色，避免文字与背景同色导致按压期间不可见。
    var actionPressedColor = self.withAlpha(primary, isDark ? 0.18 : 0.10);
    btn.setBackground(self.ui.createTransparentPressedStateDrawable(actionPressedColor, self.dp(14)));'''
)

replace_once(
    coloros_verify,
    '''for token in (
    "new android.graphics.drawable.RippleDrawable",
    "ColorStateList.valueOf(",
    "android.content.res.ColorStateList.valueOf(",
):''',
    '''for token in (
    "new android.graphics.drawable.RippleDrawable",
    "ColorStateList.valueOf(",
    "android.content.res.ColorStateList.valueOf(",
    "android.R.attr.selectableItemBackground",
    "android.R.attr.selectableItemBackgroundBorderless",
):'''
)

replace_once(
    coloros_verify,
    '''if "StateListDrawable" not in THEME or "updateBallContentBackground" not in THEME:
    errors.append("ball background is not protected by StateListDrawable")
if "StateListDrawable" not in MAIN or "createMainPanelRippleBackground" not in MAIN:
    errors.append("main panel card background is not protected by StateListDrawable")''',
    '''if "StateListDrawable" not in THEME or "updateBallContentBackground" not in THEME:
    errors.append("ball background is not protected by StateListDrawable")
for token in ("createPressedStateDrawable", "createTransparentPressedStateDrawable"):
    if token not in THEME:
        errors.append("stable pressed-state helper missing: %s" % token)
if "StateListDrawable" not in MAIN or "createMainPanelRippleBackground" not in MAIN:
    errors.append("main panel card background is not protected by StateListDrawable")'''
)

replace_once(
    coloros_verify,
    '''if module_version(THEME, "th_04_theme.js") < (1, 0, 3):
    errors.append("th_04_theme.js version below ColorOS safety baseline 1.0.4")
if module_version(MAIN, "th_15_main_panel.js") < (1, 5, 6):
    errors.append("th_15_main_panel.js version below ColorOS safety baseline 1.5.7")''',
    '''if module_version(THEME, "th_04_theme.js") < (1, 0, 5):
    errors.append("th_04_theme.js version below ColorOS safety baseline 1.0.5")
if module_version(MAIN, "th_15_main_panel.js") < (1, 5, 7):
    errors.append("th_15_main_panel.js version below ColorOS safety baseline 1.5.7")'''
)

replace_once(
    rhino_verify,
    '''for required in (
    "if (toolhubIsColorStateList(colorValue)) return colorValue;",
    "paintObj.setARGB(",
    "drawableObj.setTintList(toolhubSafeColorStateList(colorValue));",
    "targetObj.setColor(java.lang.Integer.valueOf(",
):''',
    '''for required in (
    "if (toolhubIsColorStateList(colorValue)) return colorValue;",
    "java.lang.Class.forName(\"android.content.res.ColorStateList\")",
    "states.length !== colors.length",
    "paintObj.setARGB(",
    "drawableObj.setTintList(toolhubSafeColorStateList(colorValue));",
    "targetObj.setColor(java.lang.Integer.valueOf(",
):'''
)

print("OK applied ColorOS press feedback safety changes")
