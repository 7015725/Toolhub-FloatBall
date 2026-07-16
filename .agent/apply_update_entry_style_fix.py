#!/usr/bin/env python3
"""Unify the settings home update entry with the shared entry builder."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TH14 = ROOT / "code" / "th_14_panels.js"
VERIFY = ROOT / "scripts" / "verify_update_version_page.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError("%s anchor count=%d" % (label, count))
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label):
    out, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError("%s regex count=%d" % (label, count))
    return out


def patch_th14():
    text = TH14.read_text(encoding="utf-8")
    text = replace_once(text, "// @version 1.1.3", "// @version 1.1.4", "th14 version")
    text = replace_once(
        text,
        'FloatBallAppWM.prototype.createSettingsHomeEntry = function(parent, title, desc, actionText, onClick) {\n  if (String(title || "") === "更新与版本" && this.createToolHubUpdateHomeEntry) return this.createToolHubUpdateHomeEntry(parent, title, this.getToolHubUpdateHomeSummary ? this.getToolHubUpdateHomeSummary() : desc, onClick);\n  var self = this;',
        'FloatBallAppWM.prototype.createSettingsHomeEntry = function(parent, title, desc, actionText, onClick, options) {\n  var entryOptions = options || {};\n  if (String(title || "") === "更新与版本" && entryOptions.normalizedUpdateEntry !== true && this.createToolHubUpdateHomeEntry) return this.createToolHubUpdateHomeEntry(parent, title, this.getToolHubUpdateHomeSummary ? this.getToolHubUpdateHomeSummary() : desc, onClick);\n  var self = this;',
        "shared entry options",
    )
    text = replace_once(
        text,
        '  var badge = new android.widget.TextView(context);\n  badge.setText(this.getSettingsHomeIcon ? this.getSettingsHomeIcon(title) : "✦");\n  toolhubSafeSetTextColor(badge, T.primary);\n  badge.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 18);\n  badge.setGravity(android.view.Gravity.CENTER);\n  badge.setTypeface(null, android.graphics.Typeface.BOLD);\n  badge.setBackground(this.ui.createStrokeDrawable(T.primaryContainer, this.withAlpha(T.primary, isDark ? 0.22 : 0.16), this.dp(1), this.dp(13)));\n  var iconSize = spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(38) : this.dp(40);\n  var badgeLp = new android.widget.LinearLayout.LayoutParams(iconSize, iconSize);\n  badgeLp.setMargins(0, 0, this.dp(10), 0);\n  row.addView(badge, badgeLp);',
        '  var badge = new android.widget.TextView(context);\n  badge.setText(entryOptions.iconText !== undefined && entryOptions.iconText !== null ? String(entryOptions.iconText) : (this.getSettingsHomeIcon ? this.getSettingsHomeIcon(title) : "✦"));\n  toolhubSafeSetTextColor(badge, T.primary);\n  badge.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 18);\n  badge.setGravity(android.view.Gravity.CENTER);\n  badge.setTypeface(null, android.graphics.Typeface.BOLD);\n  badge.setBackground(this.ui.createStrokeDrawable(T.primaryContainer, this.withAlpha(T.primary, isDark ? 0.22 : 0.16), this.dp(1), this.dp(13)));\n  var iconSize = spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(38) : this.dp(40);\n  if (entryOptions.showRedDot === true) {\n    var badgeBox = new android.widget.FrameLayout(context);\n    badgeBox.addView(badge, new android.widget.FrameLayout.LayoutParams(iconSize, iconSize, android.view.Gravity.CENTER));\n    var dot = new android.view.View(context);\n    var danger = T.danger || android.graphics.Color.parseColor("#BA1A1A");\n    dot.setBackground(this.ui.createRoundDrawable(danger, this.dp(5)));\n    var dotLp = new android.widget.FrameLayout.LayoutParams(this.dp(10), this.dp(10), android.view.Gravity.TOP | android.view.Gravity.RIGHT);\n    badgeBox.addView(dot, dotLp);\n    var badgeBoxLp = new android.widget.LinearLayout.LayoutParams(iconSize, iconSize);\n    badgeBoxLp.setMargins(0, 0, this.dp(10), 0);\n    row.addView(badgeBox, badgeBoxLp);\n  } else {\n    var badgeLp = new android.widget.LinearLayout.LayoutParams(iconSize, iconSize);\n    badgeLp.setMargins(0, 0, this.dp(10), 0);\n    row.addView(badge, badgeLp);\n  }',
        "shared entry red dot",
    )
    wrapper = '''FloatBallAppWM.prototype.createToolHubUpdateHomeEntry = function(parent, title, desc, onClick) {
    var summary = this.getToolHubUpdateHomeSummary ? this.getToolHubUpdateHomeSummary() : desc;
    return this.createSettingsHomeEntry(parent, title || "更新与版本", summary, "", onClick, {
      normalizedUpdateEntry: true,
      iconText: "↻",
      showRedDot: this.hasToolHubUpdateAttention ? this.hasToolHubUpdateAttention() : false
    });
  };

  FloatBallAppWM.prototype.buildToolHubUpdateVersionPanelView'''
    text = regex_once(
        text,
        r'FloatBallAppWM\.prototype\.createToolHubUpdateHomeEntry = function\(parent, title, desc, onClick\) \{.*?\n  \};\n\n  FloatBallAppWM\.prototype\.buildToolHubUpdateVersionPanelView',
        wrapper,
        "replace update entry layout with wrapper",
    )
    TH14.write_text(text, encoding="utf-8")


def patch_verify():
    text = VERIFY.read_text(encoding="utf-8")
    text = replace_once(
        text,
        'BOUNDARIES = (ROOT / "MODULE_BOUNDARIES.json").read_text(encoding="utf-8")\n\nchecks = {',
        'BOUNDARIES = (ROOT / "MODULE_BOUNDARIES.json").read_text(encoding="utf-8")\nUPDATE_ENTRY_SECTION = TH14.split("FloatBallAppWM.prototype.createToolHubUpdateHomeEntry", 1)[1].split("FloatBallAppWM.prototype.buildToolHubUpdateVersionPanelView", 1)[0]\n\nchecks = {',
        "verify section extraction",
    )
    text = replace_once(
        text,
        '    "ScrollView 子布局使用 FrameLayout.LayoutParams": "scroll.addView(root, new android.widget.FrameLayout.LayoutParams(-1, -2));" in TH14,\n',
        '    "ScrollView 子布局使用 FrameLayout.LayoutParams": "scroll.addView(root, new android.widget.FrameLayout.LayoutParams(-1, -2));" in TH14,\n    "更新入口复用统一设置项构建器": "normalizedUpdateEntry: true" in UPDATE_ENTRY_SECTION and "return this.createSettingsHomeEntry(parent" in UPDATE_ENTRY_SECTION,\n    "更新入口不再维护独立列表布局": "new android.widget.LinearLayout" not in UPDATE_ENTRY_SECTION and "row.setBackground" not in UPDATE_ENTRY_SECTION,\n    "统一设置项构建器支持红点": "entryOptions.showRedDot === true" in TH14 and "badgeBox.addView(dot, dotLp)" in TH14,\n    "统一设置项保留卡片阴影": "row.setElevation(this.dp(1))" in TH14,\n',
        "style consistency checks",
    )
    VERIFY.write_text(text, encoding="utf-8")


def main():
    patch_th14()
    patch_verify()
    print("Update entry style consistency fix applied.")


if __name__ == "__main__":
    main()
