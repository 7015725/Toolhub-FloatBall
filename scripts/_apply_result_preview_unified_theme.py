#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PREVIEW = ROOT / "code" / "th_21_result_preview.js"
VERIFY = ROOT / "scripts" / "verify_result_preview.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s replacement count=%d" % (label, count))
    return text.replace(old, new, 1)


preview = PREVIEW.read_text(encoding="utf-8")
preview = replace_once(preview, "// @version 1.1.0", "// @version 1.1.1", "version")

old_theme = '''  function isDark21() {
    try {
      var cfg = context.getResources().getConfiguration();
      var mode = cfg.uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK;
      return mode === android.content.res.Configuration.UI_MODE_NIGHT_YES;
    } catch (e0) {}
    return false;
  }

  function colors21() {
    var dark = isDark21();
    return {
      bg: android.graphics.Color.parseColor(dark ? "#FF1B1B1F" : "#FFFFFFFF"),
      stroke: android.graphics.Color.parseColor(dark ? "#3DFFFFFF" : "#22000000"),
      text: android.graphics.Color.parseColor(dark ? "#FFF8FAFC" : "#FF111827"),
      secondary: android.graphics.Color.parseColor(dark ? "#FFCBD5E1" : "#FF475569"),
      pressed: android.graphics.Color.parseColor(dark ? "#2638BDF8" : "#1A0EA5E9")
    };
  }
'''
new_theme = '''  function colors21(appObj) {
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
      bg: android.graphics.Color.parseColor(dark ? "#FF1B1B1F" : "#FFFFFFFF"),
      stroke: android.graphics.Color.parseColor(dark ? "#3DFFFFFF" : "#22000000"),
      text: android.graphics.Color.parseColor(dark ? "#FFF8FAFC" : "#FF111827"),
      secondary: android.graphics.Color.parseColor(dark ? "#FFCBD5E1" : "#FF475569"),
      pressed: android.graphics.Color.parseColor(dark ? "#2638BDF8" : "#1A0EA5E9"),
      themeDark: dark,
      themeSource: themeSource
    };
  }
'''
preview = replace_once(preview, old_theme, new_theme, "theme block")
preview = replace_once(preview, "    var c = colors21();", '''    var c = colors21(appObj);
    if (render) {
      render.themeDark = c.themeDark === true;
      render.themeSource = String(c.themeSource || "");
    }''', "draw theme source")
preview = replace_once(preview, '''    render.pressed = false;
    render.disposed = false;''', '''    render.pressed = false;
    render.themeDark = false;
    render.themeSource = "";
    render.disposed = false;''', "sync render theme")
preview = replace_once(preview, '''      pressed: false,
      disposed: false,''', '''      pressed: false,
      themeDark: false,
      themeSource: "",
      disposed: false,''', "new render theme")
preview = replace_once(preview, '''        " lpY=" + String(st.lp ? st.lp.y : -1) +
        " drawCount=" + String(render.drawCount));''', '''        " lpY=" + String(st.lp ? st.lp.y : -1) +
        " drawCount=" + String(render.drawCount) +
        " theme=" + String(render.themeDark === true ? "dark" : "light") +
        " themeSource=" + String(render.themeSource || ""));''', "first draw theme log")
PREVIEW.write_text(preview, encoding="utf-8")

verify = VERIFY.read_text(encoding="utf-8")
anchor = '''    require(
        "preview / opaque background",
        '"#FF1B1B1F"' in preview
        and '"#FFFFFFFF"' in preview
        and '"#F21B1B1F"' not in preview
        and '"#F7FFFFFF"' not in preview,
        "preview card background must remain fully opaque in light and dark mode",
        failures,
    )
'''
addition = anchor + '''    require(
        "preview / unified ToolHub theme source",
        "function isDark21()" not in preview
        and "UI_MODE_NIGHT_MASK" not in preview
        and "function colors21(appObj)" in preview
        and 'typeof appObj.isDarkTheme === "function"' in preview
        and "appObj.isDarkTheme() === true" in preview
        and "var c = colors21(appObj);" in draw_preview
        and "themeDark: dark" in preview
        and "themeSource: themeSource" in preview
        and '" theme=" + String(render.themeDark === true ? "dark" : "light")' in preview
        and '" themeSource=" + String(render.themeSource || "")' in preview,
        "result preview must use the shared ToolHub theme decision and expose the chosen source in first-draw diagnostics",
        failures,
    )
'''
verify = replace_once(verify, anchor, addition, "theme regression")
VERIFY.write_text(verify, encoding="utf-8")

print("updated", PREVIEW.relative_to(ROOT))
print("updated", VERIFY.relative_to(ROOT))
