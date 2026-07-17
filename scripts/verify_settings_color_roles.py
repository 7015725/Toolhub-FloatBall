#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
SCHEME = (ROOT / "code/th_12_rebuild.js").read_text(encoding="utf-8")
PANEL_UI = (ROOT / "code/th_13_panel_ui.js").read_text(encoding="utf-8")
PANELS = (ROOT / "code/th_14_panels.js").read_text(encoding="utf-8")
EXTRA = (ROOT / "code/th_15_extra.js").read_text(encoding="utf-8")

errors = []

def section(text, start_marker, end_marker=None):
    start = text.find(start_marker)
    if start < 0:
        errors.append("缺少区段：" + start_marker)
        return ""
    if end_marker:
        end = text.find(end_marker, start + len(start_marker))
    else:
        end = text.find("\nFloatBallAppWM.prototype.", start + len(start_marker))
    if end < 0:
        end = len(text)
    return text[start:end]

required_scheme = [
    "function mixColor(baseColor, overlayColor, ratio)",
    'var preferredPrimaryText = parseColor(isDark ? "#E7E9EC" : "#25272A"',
    'var preferredSecondaryText = parseColor(isDark ? "#ADB3BA" : "#666B70"',
    "var primaryContainer = mixColor(surface, primary, isDark ? 0.24 : 0.13);",
    "var successContainer = mixColor(surface, success, isDark ? 0.20 : 0.12);",
    "var warningContainer = mixColor(surface, warning, isDark ? 0.20 : 0.12);",
    "function toOpaqueColor(value, fallbackInt)",
    "return (n & 0x00FFFFFF) | 0xFF000000;",
    "return (0xFF000000 | (r << 16) | (g << 8) | b);",
    'var settingsColorSchemeVersion = "1.2.4";',
    "proto.__toolHubSettingsColorSchemeVersion = settingsColorSchemeVersion;",
    "function clampColorByte(value)",
    "function colorRed(colorInt)",
    "function colorGreen(colorInt)",
    "function colorBlue(colorInt)",
    "function packOpaqueColor(redValue, greenValue, blueValue)",
    "function ensureWeakContainer(app, containerColor, surfaceColor, isDark, roleName)",
    'primaryContainer = ensureWeakContainer(this, primaryContainer, surface, isDark, "primary");',
    'successContainer = ensureWeakContainer(this, successContainer, surface, isDark, "success");',
    'warningContainer = ensureWeakContainer(this, warningContainer, surface, isDark, "warning");',
]
for marker in required_scheme:
    if marker not in SCHEME:
        errors.append("Scheme 颜色角色缺失：" + marker)

mix_section = section(
    SCHEME,
    "function mixColor(baseColor, overlayColor, ratio)",
    "function linearChannel(value)",
)
for forbidden in ("Color.argb(", "Color.red(", "Color.green(", "Color.blue("):
    if forbidden in mix_section:
        errors.append("mixColor 仍依赖 Java 颜色通道：" + forbidden)

luminance_section = section(
    SCHEME,
    "proto.getSettingsColorLuminance = function",
    "proto.getSettingsColorContrastRatio = function",
)
for forbidden in ("Color.red(", "Color.green(", "Color.blue("):
    if forbidden in luminance_section:
        errors.append("亮度计算仍依赖 Java 颜色通道：" + forbidden)

if "if (proto.__toolHubSettingsColorSchemeInstalled === true) return;" in SCHEME:
    errors.append("Scheme 仍使用不可热更新的布尔安装守卫")

repair = section(
    SCHEME,
    "proto.repairSettingsPrimaryColor = function",
    "proto.getSettingsColorScheme = function",
)
for stale in ('name: "secondary"', 'name: "tertiary"', 'name: "primaryContainer"'):
    if stale in repair:
        errors.append("主强调色仍可能跨色相替换：" + stale)

header = section(PANEL_UI, "FloatBallAppWM.prototype.createSectionHeader = function")
if "T ? T.onSurface" not in header:
    errors.append("设置章节标题未使用常规文字色")
if "T ? T.primary" in header:
    errors.append("设置章节标题仍直接使用强强调色")

home_header = section(PANELS, "FloatBallAppWM.prototype.createSettingsHomeSectionHeader = function")
if "toolhubSafeSetTextColor(tv, T.onSurface);" not in home_header:
    errors.append("设置首页分区标题未通过安全桥使用常规文字色")

master = section(PANELS, "FloatBallAppWM.prototype.createSettingsMasterMenuItem = function")
if "toolhubSafeSetTextColor(title, T.onSurface);" not in master:
    errors.append("双栏分类标题未通过安全桥使用常规文字色")

update_page = section(PANELS, "FloatBallAppWM.prototype.buildToolHubUpdateVersionPanelView = function")
for marker, label in (
    ("toolhubSafeSetTextColor(tv, color || T.onSurface);", "正文使用常规文字色"),
    ("T.onSurface2", "说明文字使用次级文字色"),
    ("T.outlineVariant", "卡片使用弱边框角色"),
    ("T.primary", "操作按钮保留交互强调色"),
    ("T.surface", "卡片使用表面色"),
):
    if marker not in update_page:
        errors.append("更新与版本页面颜色角色缺失：" + label)
if "visual.iconColor" in PANELS or "visual.labelColor" in PANELS or "visual.detailColor" in PANELS:
    errors.append("已删除的更新胶囊拆分颜色引用仍有残留")

if 'createFlatButton(this, "×", T.onSurface2' not in EXTRA:
    errors.append("顶部关闭按钮未使用中性文字色")
if "createStrokeDrawable(T.surface2, this.withAlpha(T.outlineVariant" not in EXTRA:
    errors.append("顶部关闭按钮未使用中性弱背景")
if 'createFlatButton(this, "?", T.primary' not in EXTRA:
    errors.append("帮助按钮未保留交互强调色")
if "btnHelp.setBackground(this.ui.createStrokeDrawable(T.primaryContainer" not in EXTRA:
    errors.append("帮助按钮未使用弱强调背景")

if errors:
    for item in errors:
        print("FAIL:", item)
    sys.exit(1)

print(
    "OK settings_color_roles text=neutral accent=interactive "
    "container=derived update_page=balanced topbar=balanced"
)
