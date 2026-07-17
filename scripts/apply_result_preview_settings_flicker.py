#!/usr/bin/env python3
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def write(rel, text):
    (ROOT / rel).write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("patch mismatch %s count=%d" % (label, count))
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label):
    out, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit("regex patch mismatch %s count=%d" % (label, count))
    return out


# 1. Result preview: keep the overlay fully opaque and stable; clear every Canvas frame.
path = "code/th_21_result_preview.js"
text = read(path)
text = replace_once(text, "// @version 1.3.0", "// @version 1.3.1", "preview version")
text = replace_once(
    text,
    "  function drawPreview21(appObj, st, canvas, view, render) {\n    var c = colors21(appObj);",
    "  function drawPreview21(appObj, st, canvas, view, render) {\n"
    "    try {\n"
    "      canvas.drawColor(android.graphics.Color.TRANSPARENT, android.graphics.PorterDuff.Mode.CLEAR);\n"
    "    } catch (eClearFrame) {}\n"
    "    var c = colors21(appObj);",
    "preview clear frame",
)
text = regex_once(
    text,
    r"\n  function startEnterAnimation21\(appObj, st, rootRef, render\) \{.*?\n  \}\n(?=\n  function markFirstDraw21)",
    "\n",
    "remove preview enter animation",
)
text = replace_once(
    text,
    "    scheduleDismiss21(appObj, st, rootRef, render);\n"
    "    try {\n"
    "      st.handler.post(new java.lang.Runnable({ run: function() {\n"
    "        try { startEnterAnimation21(appObj, st, rootRef, render); } catch (eEnter) {}\n"
    "      }}));\n"
    "    } catch (ePostEnter) {\n"
    "      startEnterAnimation21(appObj, st, rootRef, render);\n"
    "    }\n"
    "    return true;",
    "    scheduleDismiss21(appObj, st, rootRef, render);\n"
    "    try {\n"
    "      rootRef.setVisibility(android.view.View.VISIBLE);\n"
    "      rootRef.setAlpha(1);\n"
    "      rootRef.setScaleX(1);\n"
    "      rootRef.setScaleY(1);\n"
    "      rootRef.setTranslationY(0);\n"
    "    } catch (eStableFrame) {}\n"
    "    return true;",
    "first draw stable frame",
)
text = replace_once(text, "      enterStarted: false,\n", "", "remove render enter state")
text = replace_once(
    text,
    "            try { this.animate().cancel(); } catch (eCancel) {}\n"
    "            try { this.animate().scaleX(0.97).scaleY(0.97).setDuration(70).start(); } catch (eScale) {}\n",
    "",
    "remove primary press transform",
)
text = replace_once(
    text,
    "            try { this.animate().scaleX(1).scaleY(1).setDuration(80).start(); } catch (eUpScale) {}\n",
    "",
    "remove primary release transform",
)
text = replace_once(
    text,
    "            try { this.animate().scaleX(1).scaleY(1).setDuration(80).start(); } catch (eCancelScale) {}\n",
    "",
    "remove primary cancel transform",
)
text = replace_once(text, "    try { rootRef.setScaleX(0.985); } catch (eScaleX) {}", "    try { rootRef.setScaleX(1); } catch (eScaleX) {}", "watchdog stable scale x")
text = replace_once(text, "    try { rootRef.setScaleY(0.985); } catch (eScaleY) {}", "    try { rootRef.setScaleY(1); } catch (eScaleY) {}", "watchdog stable scale y")
text = replace_once(
    text,
    "    st.root.setVisibility(android.view.View.VISIBLE);\n"
    "    st.root.setAlpha(0.76);\n"
    "    st.root.setScaleX(0.985);\n"
    "    st.root.setScaleY(0.985);\n"
    "    st.root.setTranslationY(0);",
    "    st.root.setVisibility(android.view.View.VISIBLE);\n"
    "    st.root.setAlpha(1);\n"
    "    st.root.setScaleX(1);\n"
    "    st.root.setScaleY(1);\n"
    "    st.root.setTranslationY(0);",
    "attach stable state",
)
text = replace_once(text, "    render.enterStarted = true;\n", "", "remove content enter state")
text = replace_once(
    text,
    "      rootRef.requestLayout();\n"
    "      rootRef.invalidate();\n"
    "      if (rootRef.postInvalidateOnAnimation) rootRef.postInvalidateOnAnimation();\n"
    "      rootRef.setAlpha(0.82);\n"
    "      rootRef.setScaleX(0.985);\n"
    "      rootRef.setScaleY(0.985);\n"
    "      rootRef.animate()\n"
    "        .alpha(1)\n"
    "        .scaleX(1)\n"
    "        .scaleY(1)\n"
    "        .setDuration(120)\n"
    "        .setInterpolator(new android.view.animation.DecelerateInterpolator())\n"
    "        .start();",
    "      rootRef.requestLayout();\n"
    "      rootRef.invalidate();\n"
    "      if (rootRef.postInvalidateOnAnimation) rootRef.postInvalidateOnAnimation();",
    "remove content refresh transform",
)
text = regex_once(
    text,
    r"          var rootRef = current\.root;\n"
    r"          var render = current\.rootRender;\n"
    r"          var generation = Number\(current\.generation \|\| 0\);\n"
    r"          var rootToken = Number\(current\.rootToken \|\| 0\);\n"
    r"          if \(render\) render\.disposed = true;\n"
    r"          if \(animate !== false\) \{.*?\n"
    r"          \}\n"
    r"          if \(current\.root === rootRef && Number\(current\.rootToken \|\| 0\) === rootToken\) removeView21\(self, current\);",
    "          var rootRef = current.root;\n"
    "          var rootToken = Number(current.rootToken || 0);\n"
    "          try { rootRef.animate().cancel(); } catch (eCancelStable) {}\n"
    "          try { rootRef.clearAnimation(); } catch (eClearStable) {}\n"
    "          if (current.root === rootRef && Number(current.rootToken || 0) === rootToken) removeView21(self, current);",
    "remove preview dismiss transform",
)
if "startEnterAnimation21" in text or ".alpha(" in text or ".scaleX(" in text or ".scaleY(" in text:
    raise SystemExit("preview still contains overlay property animation")
write(path, text)


# 2. Settings update entry: update summary/red-dot in place; never rebuild settings home for background checks.
path = "code/th_14_panels.js"
text = read(path)
text = replace_once(text, "// @version 1.1.7", "// @version 1.1.8", "panels version")
text = replace_once(
    text,
    "    if (this.state.toolHubUpdateUiReady === true) return;",
    "    if (this.state.toolHubUpdateUiReady === true) {\n"
    "      if (this.state.toolHubUpdateHomeSummaryView === undefined) this.state.toolHubUpdateHomeSummaryView = null;\n"
    "      if (this.state.toolHubUpdateHomeRedDotView === undefined) this.state.toolHubUpdateHomeRedDotView = null;\n"
    "      return;\n"
    "    }",
    "update state backward compatibility",
)
text = replace_once(
    text,
    "    this.state.toolHubUpdateRefreshPending = false;",
    "    this.state.toolHubUpdateRefreshPending = false;\n"
    "    this.state.toolHubUpdateHomeSummaryView = null;\n"
    "    this.state.toolHubUpdateHomeRedDotView = null;",
    "update entry refs init",
)
text = regex_once(
    text,
    r"  if \(entryOptions\.showRedDot === true\) \{.*?\n  \} else \{\n"
    r"    var badgeLp = new android\.widget\.LinearLayout\.LayoutParams\(iconSize, iconSize\);\n"
    r"    badgeLp\.setMargins\(0, 0, this\.dp\(10\), 0\);\n"
    r"    row\.addView\(badge, badgeLp\);\n"
    r"  \}",
    "  var useRedDotSlot = entryOptions.showRedDot === true || entryOptions.normalizedUpdateEntry === true;\n"
    "  if (useRedDotSlot) {\n"
    "    var badgeBox = new android.widget.FrameLayout(context);\n"
    "    badgeBox.addView(badge, new android.widget.FrameLayout.LayoutParams(iconSize, iconSize, android.view.Gravity.CENTER));\n"
    "    var dot = new android.view.View(context);\n"
    "    var danger = T.danger || android.graphics.Color.parseColor(\"#BA1A1A\");\n"
    "    dot.setBackground(this.ui.createRoundDrawable(danger, this.dp(5)));\n"
    "    dot.setVisibility(entryOptions.showRedDot === true ? android.view.View.VISIBLE : android.view.View.GONE);\n"
    "    var dotLp = new android.widget.FrameLayout.LayoutParams(this.dp(10), this.dp(10), android.view.Gravity.TOP | android.view.Gravity.RIGHT);\n"
    "    badgeBox.addView(dot, dotLp);\n"
    "    var badgeBoxLp = new android.widget.LinearLayout.LayoutParams(iconSize, iconSize);\n"
    "    badgeBoxLp.setMargins(0, 0, this.dp(10), 0);\n"
    "    row.addView(badgeBox, badgeBoxLp);\n"
    "    if (entryOptions.normalizedUpdateEntry === true) {\n"
    "      try { this.state.toolHubUpdateHomeRedDotView = dot; } catch (eDotRef) {}\n"
    "    }\n"
    "  } else {\n"
    "    var badgeLp = new android.widget.LinearLayout.LayoutParams(iconSize, iconSize);\n"
    "    badgeLp.setMargins(0, 0, this.dp(10), 0);\n"
    "    row.addView(badge, badgeLp);\n"
    "  }",
    "persistent update red-dot slot",
)
text = replace_once(
    text,
    "  texts.addView(tvDesc);\n  row.addView(texts, new android.widget.LinearLayout.LayoutParams(0, -2, 1));",
    "  texts.addView(tvDesc);\n"
    "  if (entryOptions.normalizedUpdateEntry === true) {\n"
    "    try { this.state.toolHubUpdateHomeSummaryView = tvDesc; } catch (eSummaryRef) {}\n"
    "  }\n"
    "  row.addView(texts, new android.widget.LinearLayout.LayoutParams(0, -2, 1));",
    "update summary ref",
)
insert_marker = "\n  FloatBallAppWM.prototype.refreshToolHubUpdateSurface = function(reason) {"
if text.count(insert_marker) != 1:
    raise SystemExit("refresh surface marker mismatch")
local_refresh = "\n  FloatBallAppWM.prototype.refreshToolHubUpdateHomeEntry = function(reason) {\n" \
    "    this.ensureToolHubUpdateUiState();\n" \
    "    if (!this.state || !this.state.toolAppActive || String(this.state.toolAppRoute || \"\") !== \"settings\") return false;\n" \
    "    var summary = this.state.toolHubUpdateHomeSummaryView;\n" \
    "    var dot = this.state.toolHubUpdateHomeRedDotView;\n" \
    "    var updated = false;\n" \
    "    try {\n" \
    "      if (summary) {\n" \
    "        summary.setText(String(this.getToolHubUpdateHomeSummary ? this.getToolHubUpdateHomeSummary() : \"查看版本、更新状态与历史记录\"));\n" \
    "        updated = true;\n" \
    "      }\n" \
    "      if (dot) {\n" \
    "        dot.setVisibility(this.hasToolHubUpdateAttention && this.hasToolHubUpdateAttention() ? android.view.View.VISIBLE : android.view.View.GONE);\n" \
    "        updated = true;\n" \
    "      }\n" \
    "      if (updated) {\n" \
    "        try { safeLog(this.L, \"d\", \"update home entry refreshed reason=\" + String(reason || \"\")); } catch (eLog) {}\n" \
    "      }\n" \
    "    } catch (eRefreshEntry) {\n" \
    "      try { safeLog(this.L, \"w\", \"update home entry refresh fail reason=\" + String(reason || \"\") + \" error=\" + String(eRefreshEntry)); } catch (eLogFail) {}\n" \
    "      return false;\n" \
    "    }\n" \
    "    return updated;\n" \
    "  };\n"
text = text.replace(insert_marker, local_refresh + insert_marker, 1)
text = replace_once(
    text,
    "          if (route === UPDATE_ROUTE) self.replaceToolAppPage(UPDATE_ROUTE);\n"
    "          else if (route === \"settings\") self.replaceToolAppPage(\"settings\");",
    "          if (route === UPDATE_ROUTE) self.replaceToolAppPage(UPDATE_ROUTE);\n"
    "          else if (route === \"settings\") {\n"
    "            if (!self.refreshToolHubUpdateHomeEntry || !self.refreshToolHubUpdateHomeEntry(reason)) {\n"
    "              try { safeLog(self.L, \"d\", \"update home entry refresh deferred reason=\" + textValue(reason)); } catch (eDeferredLog) {}\n"
    "            }\n"
    "          }",
    "settings local update refresh",
)
if 'else if (route === "settings") self.replaceToolAppPage("settings");' in text:
    raise SystemExit("settings route still rebuilds whole page")
write(path, text)


# 3. ToolApp: do not animate the entire overlay window during first display.
path = "code/th_15_extra.js"
text = read(path)
text = replace_once(text, "// @version 1.1.19", "// @version 1.1.20", "extra version")
text = regex_once(
    text,
    r"  try \{\n"
    r"    if \(this\.config\.ENABLE_ANIMATIONS\) \{\n"
    r"        var handledMainEnter = false;.*?\n"
    r"   \} catch\(eA\) \{ safeLog\(null, 'e', \"catch \" \+ String\(eA\)\); \}",
    "  try {\n"
    "    if (__toolAppPanel) {\n"
    "      try { panel.animate().cancel(); } catch (eToolAppCancel) {}\n"
    "      try { panel.clearAnimation(); } catch (eToolAppClear) {}\n"
    "      panel.setTranslationX(0);\n"
    "      panel.setTranslationY(0);\n"
    "      panel.setScaleX(1);\n"
    "      panel.setScaleY(1);\n"
    "      panel.setAlpha(1);\n"
    "    } else if (this.config.ENABLE_ANIMATIONS) {\n"
    "      var handledMainEnter = false;\n"
    "      if (which === \"main\" && this.animateMainPanelEnter) {\n"
    "        handledMainEnter = this.animateMainPanelEnter(panel, x, y) === true;\n"
    "      }\n"
    "      if (!handledMainEnter) {\n"
    "        panel.setScaleX(0.96);\n"
    "        panel.setScaleY(0.96);\n"
    "        panel.setAlpha(0);\n"
    "        panel.animate()\n"
    "          .scaleX(1)\n"
    "          .scaleY(1)\n"
    "          .alpha(1)\n"
    "          .setDuration(180)\n"
    "          .setInterpolator(new android.view.animation.AccelerateDecelerateInterpolator())\n"
    "          .start();\n"
    "      }\n"
    "    } else {\n"
    "      panel.setTranslationX(0);\n"
    "      panel.setTranslationY(0);\n"
    "      panel.setScaleX(1);\n"
    "      panel.setScaleY(1);\n"
    "      panel.setAlpha(1);\n"
    "    }\n"
    "  } catch(eA) { safeLog(null, 'e', \"catch \" + String(eA)); }",
    "toolapp stable entry",
)
write(path, text)


# 4. Verification contracts.
path = "scripts/verify_result_preview.py"
text = read(path)
text = replace_once(
    text,
    'copy_action = section(preview, "function performResultPreviewCopy21(appObj, st, rootRef, render)", "function startEnterAnimation21")',
    'copy_action = section(preview, "function performResultPreviewCopy21(appObj, st, rootRef, render)", "function markFirstDraw21")',
    "preview copy section marker",
)
text = regex_once(
    text,
    r"    require\(\n        \"preview / fade and scale only motion\",.*?\n        failures,\n    \)",
    "    require(\n"
    "        \"preview / stable opaque overlay without property animation\",\n"
    "        \"canvas.drawColor(android.graphics.Color.TRANSPARENT, android.graphics.PorterDuff.Mode.CLEAR);\" in draw_preview\n"
    "        and \"function startEnterAnimation21\" not in preview\n"
    "        and \".alpha(\" not in preview\n"
    "        and \".scaleX(\" not in preview\n"
    "        and \".scaleY(\" not in preview\n"
    "        and \"setAlpha(0.76)\" not in preview\n"
    "        and \"setAlpha(0.82)\" not in preview\n"
    "        and \"rootRef.setAlpha(1)\" in preview\n"
    "        and \"st.root.setAlpha(1)\" in preview\n"
    "        and \"setTranslationY(0)\" in preview\n"
    "        and \"st.clickLocked\" in preview,\n"
    "        \"transparent WindowManager overlays must stay at alpha/scale 1 and clear each Canvas frame to avoid ColorOS ghosting\",\n"
    "        failures,\n"
    "    )",
    "preview stable motion verification",
)
write(path, text)

path = "scripts/verify_update_version_page.py"
text = read(path)
text = replace_once(
    text,
    '    "更新页面刷新合并存在": "toolHubUpdateRefreshPending" in TH14 and "UPDATE_SURFACE_REFRESH_DELAY_MS = 48" in TH14,',
    '    "更新页面刷新合并存在": "toolHubUpdateRefreshPending" in TH14 and "UPDATE_SURFACE_REFRESH_DELAY_MS = 48" in TH14,\n'
    '    "设置首页更新状态局部刷新": "refreshToolHubUpdateHomeEntry" in TH14 and "toolHubUpdateHomeSummaryView" in TH14 and "toolHubUpdateHomeRedDotView" in TH14,\n'
    '    "后台检查不重建设置首页": \'else if (route === "settings") self.replaceToolAppPage("settings");\' not in TH14 and "update home entry refresh deferred" in TH14,',
    "update local refresh verification",
)
write(path, text)

path = "scripts/verify_toolapp_layout.py"
text = read(path)
text = replace_once(
    text,
    '    dispatch_match, dispatch_body = method_body(extra, "showToolApp")\n    build_match, build_body = method_body(entry, "showToolAppOnMain")',
    '    dispatch_match, dispatch_body = method_body(extra, "showToolApp")\n'
    '    add_match, add_body = method_body(extra, "addPanel")\n'
    '    build_match, build_body = method_body(entry, "showToolAppOnMain")',
    "toolapp addPanel isolation",
)
text = replace_once(
    text,
    '    check("single-root", "has setToolAppContent", "FloatBallAppWM.prototype.setToolAppContent" in extra)\n',
    '    check("single-root", "has setToolAppContent", "FloatBallAppWM.prototype.setToolAppContent" in extra)\n'
    '    check("visual-stability", "addPanel exists", bool(add_match))\n'
    '    check(\n'
    '        "visual-stability",\n'
    '        "ToolApp overlay enters fully opaque without scale animation",\n'
    '        "if (__toolAppPanel)" in add_body and\n'
    '        "panel.setAlpha(1);" in add_body and\n'
    '        "panel.setScaleX(1);" in add_body and\n'
    '        "panel.setScaleY(1);" in add_body and\n'
    '        add_body.find("if (__toolAppPanel)") < add_body.find("else if (this.config.ENABLE_ANIMATIONS)"),\n'
    '    )\n',
    "toolapp stable overlay verification",
)
write(path, text)


# 5. One pending release record for the official signing pipeline.
record = {
    "schema": 1,
    "id": "fix-result-preview-settings-flicker",
    "type": "fix",
    "title": "修复结果预览与设置页闪烁",
    "details": [
        "结果预览窗口取消整窗透明度和缩放动画，每次 Canvas 绘制前清空透明缓冲区",
        "新结果替换、超时关闭和点击反馈不再对透明 Overlay Surface 执行属性变换",
        "设置首页后台更新检查仅局部刷新更新摘要与红点，不再重复重建设置内容树",
        "ToolApp 首次显示保持完全不透明和原始尺寸，避免进入动画与内容刷新发生竞争",
        "补充结果预览、更新入口和 ToolApp 视觉稳定性专项校验"
    ],
    "manifestVersion": 0
}
record_path = ROOT / "updates" / "records" / "fix-result-preview-settings-flicker.json"
if record_path.exists():
    raise SystemExit("pending record already exists")
record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("OK applied result preview and settings flicker fix")
