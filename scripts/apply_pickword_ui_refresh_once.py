#!/usr/bin/env python3
# 一次性补丁：统一拾字主窗口与顶部结果预览的 ToolHub 视觉语义。

from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
PICKWORD = ROOT / "code" / "th_20_pickword.js"
PREVIEW = ROOT / "code" / "th_21_result_preview.js"
RECORD = ROOT / "updates" / "records" / "optimize-pickword-ui-refresh.json"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s: expected one match, found %d" % (label, count))
    return text.replace(old, new, 1)


def replace_all_required(text, old, new, minimum, label):
    count = text.count(old)
    if count < minimum:
        raise SystemExit("%s: expected at least %d matches, found %d" % (label, minimum, count))
    return text.replace(old, new)


def sub_once(text, pattern, replacement, label, flags=0):
    out, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit("%s: expected one regex match, found %d" % (label, count))
    return out


pickword = PICKWORD.read_text(encoding="utf-8")
preview = PREVIEW.read_text(encoding="utf-8")

pickword = replace_once(pickword, "// @version 1.0.3", "// @version 1.0.4", "pickword version")
pickword = replace_once(
    pickword,
    "    var titleBarRefs = { normalMode: null, settingMode: null };",
    "    var titleBarRefs = { normalMode: null, settingMode: null };\n"
    "    var toolhubAppRef = null;\n"
    "    var previewBoxView = null;",
    "pickword runtime refs",
)

colors_block = r'''    var Colors = \{\n.*?\n    \};\n\n    function dp\(value\) \{'''
colors_replacement = '''    var Colors = {
        bg: isDark ? Color.parseColor("#131314") : Color.parseColor("#f8f9fa"),
        surface: isDark ? Color.parseColor("#1b1b1f") : Color.parseColor("#f1f3f4"),
        surfaceVariant: isDark ? Color.parseColor("#2b2c30") : Color.parseColor("#e6e8ea"),
        text: isDark ? Color.parseColor("#e7e9ec") : Color.parseColor("#25272a"),
        textSecondary: isDark ? Color.parseColor("#adb3ba") : Color.parseColor("#666b70"),
        textTertiary: isDark ? Color.parseColor("#8e949b") : Color.parseColor("#7b8086"),
        primary: isDark ? Color.parseColor("#a8c7fa") : Color.parseColor("#005bc0"),
        primaryLight: isDark ? Color.parseColor("#26354d") : Color.parseColor("#dce8f8"),
        onPrimary: isDark ? Color.parseColor("#062e6f") : Color.WHITE,
        selectionBg: isDark ? Color.parseColor("#a8c7fa") : Color.parseColor("#005bc0"),
        selectionText: isDark ? Color.parseColor("#062e6f") : Color.WHITE,
        success: isDark ? Color.parseColor("#4ade80") : Color.parseColor("#15803d"),
        warning: isDark ? Color.parseColor("#fbbf24") : Color.parseColor("#b45309"),
        outline: isDark ? Color.parseColor("#49454f") : Color.parseColor("#c4c7c5"),
        btnPrimaryBg: isDark ? Color.parseColor("#a8c7fa") : Color.parseColor("#005bc0"),
        btnPrimaryPressed: isDark ? Color.parseColor("#7fcfff") : Color.parseColor("#00639b"),
        btnSecondaryBg: isDark ? Color.parseColor("#2b2c30") : Color.parseColor("#e6e8ea"),
        btnSecondaryPressed: isDark ? Color.parseColor("#26354d") : Color.parseColor("#dce8f8")
    };

    function applyPickwordColorScheme20(appObj) {
        var scheme = null;
        try {
            if (appObj && typeof appObj.getSettingsColorScheme === "function") {
                scheme = appObj.getSettingsColorScheme();
            }
        } catch (eScheme) {
            scheme = null;
        }

        if (scheme) {
            isDark = scheme.dark === true;
            Colors.bg = scheme.background || scheme.surface;
            Colors.surface = scheme.surface || scheme.background;
            Colors.surfaceVariant = scheme.surface2 || scheme.primaryContainer || Colors.surface;
            Colors.text = scheme.onSurface;
            Colors.textSecondary = scheme.onSurface2 || scheme.onSurface;
            Colors.textTertiary = scheme.onSurface2 || scheme.onSurface;
            Colors.primary = scheme.primary;
            Colors.primaryLight = scheme.primaryContainer || scheme.surface2 || Colors.surface;
            Colors.onPrimary = scheme.onPrimary;
            Colors.selectionBg = scheme.primary;
            Colors.selectionText = scheme.onPrimary;
            Colors.success = scheme.success;
            Colors.warning = scheme.warning;
            Colors.outline = scheme.outlineVariant || scheme.outline;
            Colors.btnPrimaryBg = scheme.primary;
            Colors.btnPrimaryPressed = scheme.secondary || scheme.primary;
            Colors.btnSecondaryBg = scheme.surface2 || scheme.surface;
            Colors.btnSecondaryPressed = scheme.primaryContainer || scheme.surface2 || scheme.surface;
            return true;
        }

        try {
            var uiMode = appContext.getResources().getConfiguration().uiMode;
            isDark = (uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK) === android.content.res.Configuration.UI_MODE_NIGHT_YES;
        } catch (eMode) {
            isDark = false;
        }
        Colors.bg = isDark ? Color.parseColor("#131314") : Color.parseColor("#f8f9fa");
        Colors.surface = isDark ? Color.parseColor("#1b1b1f") : Color.parseColor("#f1f3f4");
        Colors.surfaceVariant = isDark ? Color.parseColor("#2b2c30") : Color.parseColor("#e6e8ea");
        Colors.text = isDark ? Color.parseColor("#e7e9ec") : Color.parseColor("#25272a");
        Colors.textSecondary = isDark ? Color.parseColor("#adb3ba") : Color.parseColor("#666b70");
        Colors.textTertiary = isDark ? Color.parseColor("#8e949b") : Color.parseColor("#7b8086");
        Colors.primary = isDark ? Color.parseColor("#a8c7fa") : Color.parseColor("#005bc0");
        Colors.primaryLight = isDark ? Color.parseColor("#26354d") : Color.parseColor("#dce8f8");
        Colors.onPrimary = isDark ? Color.parseColor("#062e6f") : Color.WHITE;
        Colors.selectionBg = Colors.primary;
        Colors.selectionText = Colors.onPrimary;
        Colors.success = isDark ? Color.parseColor("#4ade80") : Color.parseColor("#15803d");
        Colors.warning = isDark ? Color.parseColor("#fbbf24") : Color.parseColor("#b45309");
        Colors.outline = isDark ? Color.parseColor("#49454f") : Color.parseColor("#c4c7c5");
        Colors.btnPrimaryBg = Colors.primary;
        Colors.btnPrimaryPressed = isDark ? Color.parseColor("#7fcfff") : Color.parseColor("#00639b");
        Colors.btnSecondaryBg = Colors.surfaceVariant;
        Colors.btnSecondaryPressed = Colors.primaryLight;
        return false;
    }

    function dp(value) {'''
pickword = sub_once(pickword, colors_block, colors_replacement, "pickword semantic colors", re.S)

helper_marker = "    function animateWindowEnter(view) {"
helper_code = '''    function applyVisiblePickwordTheme20() {
        try {
            if (mainLayout) mainLayout.setBackground(createStrokeRoundRectDrawable(Colors.surface, Colors.outline, isTablet ? 20 : 16, 1));
            if (previewBoxView) previewBoxView.setBackground(createStrokeRoundRectDrawable(Colors.surfaceVariant, Colors.outline, isTablet ? 16 : 12, 1));
            if (countLabelView) safeTextColor(countLabelView, Colors.primary);
            if (previewTextView) safeTextColor(previewTextView, selectedIndices.length > 0 ? Colors.text : Colors.textSecondary);
            if (fontSizeLabel) {
                safeTextColor(fontSizeLabel, Colors.primary);
                fontSizeLabel.setBackground(createRoundRectDrawable(Colors.primaryLight, isTablet ? 16 : 14));
            }

            if (copyActionBtn) {
                safeTextColor(copyActionBtn, Colors.onPrimary);
                copyActionBtn.setBackground(createPressableDrawable(Colors.btnPrimaryBg, Colors.btnPrimaryPressed, isTablet ? 14 : 12));
            }
            var secondaryButtons = [translateActionBtn, selectAllActionBtn, clearActionBtn];
            var i;
            for (i = 0; i < secondaryButtons.length; i++) {
                if (!secondaryButtons[i]) continue;
                safeTextColor(secondaryButtons[i], Colors.textSecondary);
                secondaryButtons[i].setBackground(createPressableDrawable(Colors.btnSecondaryBg, Colors.btnSecondaryPressed, isTablet ? 14 : 12));
            }
            var compactButtons = [previewRemoveSpaceBtn, previewRemoveNewlineBtn, previewEditBtn, pinActionBtn];
            for (i = 0; i < compactButtons.length; i++) {
                if (!compactButtons[i]) continue;
                safeTextColor(compactButtons[i], Colors.primary);
                compactButtons[i].setBackground(createPressableDrawable(Colors.primaryLight, Colors.btnSecondaryPressed, isTablet ? 12 : 10));
            }
            var settingButtons = [loadedRemoveSpaceBtn, loadedRemoveNewlineBtn];
            for (i = 0; i < settingButtons.length; i++) {
                if (!settingButtons[i]) continue;
                safeTextColor(settingButtons[i], Colors.textSecondary);
                settingButtons[i].setBackground(createPressableDrawable(Colors.btnSecondaryBg, Colors.btnSecondaryPressed, isTablet ? 12 : 10));
            }
            if (pinLayout) pinLayout.setBackground(createStrokeRoundRectDrawable(Colors.surface, Colors.outline, isTablet ? 18 : 16, 1));
            if (pinTextView) safeTextColor(pinTextView, Colors.text);
            if (pinProgressView) safeTextColor(pinProgressView, Colors.textTertiary);
            if (textCanvasControl && textCanvasControl.view) textCanvasControl.view.invalidate();
        } catch (eThemeApply) {}
    }

'''
pickword = replace_once(pickword, helper_marker, helper_code + helper_marker, "visible theme helper")

animation_pattern = r'''    // 主拾字窗口保持全不透明，只做轻微缩放和位移，避免 DIM 遮罩与淡入叠加闪烁。\n    function animatePickwordMainEnter\(view\) \{.*?\n    \}\n\n    function applyButtonAnimation\(btn\) \{.*?\n    \}\n'''
animation_replacement = '''    // 主拾字窗口保持静态、完全不透明，避免 WindowManager 根 Surface 属性动画闪烁。
    function animatePickwordMainEnter(view) {
        if (!view) return;
        try { view.animate().cancel(); } catch (eCancel) {}
        try { view.clearAnimation(); } catch (eClear) {}
        try {
            view.setVisibility(View.VISIBLE);
            view.setAlpha(1);
            view.setScaleX(1);
            view.setScaleY(1);
            view.setTranslationY(0);
        } catch (eStable) {}
    }

    // 按压反馈交给 StateListDrawable；不再缩放子 View，避免浮窗合成抖动。
    function applyButtonAnimation(btn) {
        if (!btn) return;
        try { btn.setClickable(true); } catch (eClickable) {}
    }
'''
pickword = sub_once(pickword, animation_pattern, animation_replacement, "stable pickword animations", re.S)

pickword = replace_once(
    pickword,
    "        createWindow: function() {\n            detectScreenSize();",
    "        createWindow: function() {\n            detectScreenSize();\n            applyPickwordColorScheme20(toolhubAppRef);",
    "createWindow theme initialization",
)
pickword = replace_once(pickword, "            layoutParams.dimAmount = 0.4;", "            layoutParams.dimAmount = 0.32;", "pickword dim amount")
pickword = replace_once(
    pickword,
    "            mainLayout.setBackground(createRoundRectDrawable(Colors.bg, isTablet ? 20 : 16));\n"
    "            mainLayout.setElevation(uiDp(6, 7));\n"
    "            mainLayout.setPadding(uiDp(16, 24), uiDp(16, 20), uiDp(16, 24), uiDp(16, 20));",
    "            mainLayout.setBackground(createStrokeRoundRectDrawable(Colors.surface, Colors.outline, isTablet ? 20 : 16, 1));\n"
    "            mainLayout.setElevation(uiDp(5, 6));\n"
    "            mainLayout.setPadding(uiDp(14, 20), uiDp(14, 18), uiDp(14, 20), uiDp(14, 18));",
    "pickword root visual",
)

pickword = replace_once(pickword, '            copyActionBtn = this.createPrimaryBtn("📋 复制", function() { self.doCopy(); });', '            copyActionBtn = this.createPrimaryBtn("复制", function() { self.doCopy(); });', "copy button label")
pickword = replace_once(pickword, '            translateActionBtn = this.createIconBtn("🌐 翻译", function() {', '            translateActionBtn = this.createIconBtn("翻译", function() {', "translate button label")
pickword = replace_once(pickword, '            iconText.setText("✦"); safeTextColor(iconText, Colors.primary); iconText.setTextSize(uiTextSize(18, 20));', '            iconText.setText(""); iconText.setVisibility(View.GONE); safeTextColor(iconText, Colors.primary); iconText.setTextSize(uiTextSize(18, 20));', "title ornament removal")
pickword = replace_once(pickword, '            blogText.setText("阿然博客 xin-blog.com");', '            blogText.setText("xin-blog.com");', "title subtitle")
pickword = replace_once(
    pickword,
    '            settingsBtn.setText("⚙"); safeTextColor(settingsBtn, Colors.textSecondary); settingsBtn.setTextSize(uiTextSize(18, 20)); settingsBtn.setPadding(uiDp(12, 14), uiDp(8, 10), uiDp(12, 14), uiDp(8, 10));\n'
    '            settingsBtn.setBackground(createPressableDrawable(Color.TRANSPARENT, isDark ? Color.parseColor("#334155") : Color.parseColor("#e2e8f0"), isTablet ? 16 : 12));',
    '            settingsBtn.setText("字号"); safeTextColor(settingsBtn, Colors.textSecondary); settingsBtn.setTextSize(uiTextSize(12, 13)); settingsBtn.setPadding(uiDp(12, 14), uiDp(7, 9), uiDp(12, 14), uiDp(7, 9));\n'
    '            settingsBtn.setBackground(createPressableDrawable(Colors.btnSecondaryBg, Colors.btnSecondaryPressed, isTablet ? 16 : 12));',
    "settings button visual",
)
pickword = replace_once(
    pickword,
    '            closeBtn.setText("✕"); safeTextColor(closeBtn, Colors.textSecondary); closeBtn.setTextSize(uiTextSize(16, 18));\n'
    '            closeBtn.setPadding(uiDp(12, 14), uiDp(8, 10), uiDp(4, 8), uiDp(8, 10));\n'
    '            closeBtn.setBackground(createPressableDrawable(Color.TRANSPARENT, isDark ? Color.parseColor("#334155") : Color.parseColor("#e2e8f0"), isTablet ? 16 : 12));',
    '            closeBtn.setText("关闭"); safeTextColor(closeBtn, Colors.textSecondary); closeBtn.setTextSize(uiTextSize(12, 13));\n'
    '            closeBtn.setPadding(uiDp(12, 14), uiDp(7, 9), uiDp(8, 10), uiDp(7, 9));\n'
    '            closeBtn.setBackground(createPressableDrawable(Colors.btnSecondaryBg, Colors.btnSecondaryPressed, isTablet ? 16 : 12));',
    "close button visual",
)

pickword = replace_once(
    pickword,
    "            var previewBox = new LinearLayout(appContext);\n"
    "            previewBox.setOrientation(LinearLayout.VERTICAL); previewBox.setBackground(createRoundRectDrawable(Colors.primaryLight, isTablet ? 16 : 12));",
    "            var previewBox = new LinearLayout(appContext);\n"
    "            previewBoxView = previewBox;\n"
    "            previewBox.setOrientation(LinearLayout.VERTICAL); previewBox.setBackground(createStrokeRoundRectDrawable(Colors.surfaceVariant, Colors.outline, isTablet ? 16 : 12, 1));",
    "preview box visual",
)
pickword = replace_once(pickword, '            pinActionBtn = this.createMiniHeaderBtn("📌 钉屏", function() { self.pinSelectedText(); });', '            pinActionBtn = this.createMiniHeaderBtn("钉屏", function() { self.pinSelectedText(); });', "pin label")

pickword = replace_once(pickword, "            btn.setText(text); safeTextColor(btn, Colors.onPrimary); btn.setTextSize(uiTextSize(14, 16)); btn.setBackground(createPressableDrawable(Colors.btnPrimaryBg, Colors.btnPrimaryPressed, isTablet ? 12 : 8)); btn.setAllCaps(false);", "            btn.setText(text); safeTextColor(btn, Colors.onPrimary); btn.setTextSize(uiTextSize(14, 16)); btn.setBackground(createPressableDrawable(Colors.btnPrimaryBg, Colors.btnPrimaryPressed, isTablet ? 14 : 12)); btn.setAllCaps(false);", "primary button radius")
pickword = replace_once(pickword, "            var params = new LinearLayout.LayoutParams(0, uiDp(40, 48), 2);", "            var params = new LinearLayout.LayoutParams(0, uiDp(42, 48), 2);", "primary button height")
pickword = replace_once(pickword, "            btn.setText(text); safeTextColor(btn, Colors.textSecondary); btn.setTextSize(uiTextSize(12, 14)); btn.setBackground(createPressableDrawable(Colors.btnSecondaryBg, Colors.btnSecondaryPressed, isTablet ? 12 : 8)); btn.setAllCaps(false);", "            btn.setText(text); safeTextColor(btn, Colors.textSecondary); btn.setTextSize(uiTextSize(12, 14)); btn.setBackground(createPressableDrawable(Colors.btnSecondaryBg, Colors.btnSecondaryPressed, isTablet ? 14 : 12)); btn.setAllCaps(false);", "secondary button radius")
pickword = replace_once(pickword, "            var params = new LinearLayout.LayoutParams(0, uiDp(40, 48), 1);", "            var params = new LinearLayout.LayoutParams(0, uiDp(42, 48), 1);", "secondary button height")
pickword = replace_once(pickword, "            safeTextColor(btn, Colors.onPrimary);\n            btn.setTextSize(uiTextSize(10, 11));", "            safeTextColor(btn, Colors.primary);\n            btn.setTextSize(uiTextSize(10, 11));", "mini button text")
pickword = replace_once(pickword, "            btn.setBackground(createPressableDrawable(Colors.btnPrimaryBg, Colors.btnPrimaryPressed, isTablet ? 12 : 10));", "            btn.setBackground(createPressableDrawable(Colors.primaryLight, Colors.btnSecondaryPressed, isTablet ? 12 : 10));", "mini button background")

pickword = replace_once(pickword, "                        root.setBackground(createStrokeRoundRectDrawable(Colors.surface, Colors.primaryLight, isTablet ? 20 : 16, 1));", "                        root.setBackground(createStrokeRoundRectDrawable(Colors.surface, Colors.outline, isTablet ? 20 : 16, 1));", "edit dialog root")
pickword = replace_once(pickword, "                        header.addView(icon, iconLp);", "                        icon.setVisibility(View.GONE);", "edit dialog ornament removal")
pickword = replace_once(pickword, "                        inputCard.setBackground(createStrokeRoundRectDrawable(Colors.bg, Colors.btnSecondaryPressed, isTablet ? 14 : 12, 1));", "                        inputCard.setBackground(createStrokeRoundRectDrawable(Colors.surfaceVariant, Colors.outline, isTablet ? 14 : 12, 1));", "edit input card")
pickword = replace_once(pickword, "                    pinLayout.setBackground(createRoundRectDrawable(isDark ? Color.parseColor(\"#1e293b\") : Color.parseColor(\"#ffffff\"), isTablet ? 18 : 16));", "                    pinLayout.setBackground(createStrokeRoundRectDrawable(Colors.surface, Colors.outline, isTablet ? 18 : 16, 1));", "pin surface")
pickword = replace_once(pickword, '            if (translateActionBtn) translateActionBtn.setText(hasUndo ? "↶ 撤销" : "🌐 翻译");', '            if (translateActionBtn) translateActionBtn.setText(hasUndo ? "撤销翻译" : "翻译");', "dynamic translate label")

refresh_pattern = r'''    function refreshPickwordTheme20\(\) \{.*?\n    \}\n\n    function normalizePickwordInput20'''
refresh_replacement = '''    function refreshPickwordTheme20() {
        applyPickwordColorScheme20(toolhubAppRef);
        applyVisiblePickwordTheme20();
    }

    function normalizePickwordInput20'''
pickword = sub_once(pickword, refresh_pattern, refresh_replacement, "pickword theme refresh", re.S)
pickword = replace_once(
    pickword,
    "            proto.showPickwordText = function(text, meta) {\n                var raw = normalizePickwordInput20(text);",
    "            proto.showPickwordText = function(text, meta) {\n                toolhubAppRef = this;\n                var raw = normalizePickwordInput20(text);",
    "bind ToolHub app instance",
)
pickword = replace_all_required(
    pickword,
    "                        mainLayout = null;\n                        textView = null;",
    "                        mainLayout = null;\n                        previewBoxView = null;\n                        titleBarRefs = { normalMode: null, settingMode: null };\n                        textView = null;",
    1,
    "pickword hide refs",
)
pickword = replace_once(
    pickword,
    "                    mainLayout = null;\n                    textView = null;",
    "                    mainLayout = null;\n                    previewBoxView = null;\n                    titleBarRefs = { normalMode: null, settingMode: null };\n                    textView = null;",
    "pickword dispose refs",
)

preview = replace_once(preview, "// @version 1.3.1", "// @version 1.3.2", "preview version")
preview = replace_once(
    preview,
    '      bg: darkFallback ? colorSpec21(255, 27, 27, 31, "#FF1B1B1F") : colorSpec21(255, 255, 255, 255, "#FFFFFFFF"),\n'
    '      stroke: darkFallback ? colorSpec21(88, 255, 255, 255, "#58FFFFFF") : colorSpec21(54, 0, 0, 0, "#36000000"),',
    '      bg: darkFallback ? colorSpec21(255, 27, 27, 31, "#FF1B1B1F") : colorSpec21(255, 255, 255, 255, "#FFFFFFFF"),\n'
    '      pressedBg: darkFallback ? colorSpec21(255, 38, 53, 77, "#FF26354D") : colorSpec21(255, 220, 232, 248, "#FFDCE8F8"),\n'
    '      stroke: darkFallback ? colorSpec21(88, 255, 255, 255, "#58FFFFFF") : colorSpec21(54, 0, 0, 0, "#36000000"),',
    "preview fallback pressed surface",
)
preview = replace_once(
    preview,
    "            bg: colorIntToSpec21(scheme.surface, surfaceFallback),\n            stroke: withAlphaColor21(scheme.outlineVariant, dark ? 112 : 76, outlineFallback),",
    "            bg: colorIntToSpec21(scheme.surface, surfaceFallback),\n            pressedBg: colorIntToSpec21(scheme.primaryContainer, fallback.pressedBg),\n            stroke: withAlphaColor21(scheme.outlineVariant, dark ? 112 : 76, outlineFallback),",
    "preview scheme pressed surface",
)
preview = replace_once(preview, "    var touchSize = Math.max(dp21(appObj, 40), Math.min(dp21(appObj, 44), height - dp21(appObj, 4)));", "    var touchSize = Math.max(dp21(appObj, 40), Math.min(dp21(appObj, 42), height - dp21(appObj, 4)));", "copy touch size")
preview = replace_once(preview, "    var iconSize = Math.round(clamp21(height * 0.34, dp21(appObj, 18), dp21(appObj, 22)));", "    var iconSize = Math.round(clamp21(height * 0.32, dp21(appObj, 17), dp21(appObj, 20)));", "copy icon size")
preview = replace_once(preview, "      slotWidth: touchSize + dp21(appObj, 9)", "      slotWidth: touchSize + dp21(appObj, 7)", "copy slot width")
preview = replace_once(preview, "    var maxViewWidth = Math.round(sw * 0.88);", "    var maxViewWidth = Math.round(sw * 0.86);", "preview max width")
preview = replace_once(preview, "    var minViewWidth = dp21(appObj, 160);", "    var minViewWidth = dp21(appObj, 156);", "preview min width")
preview = replace_once(preview, "    var provisionalHeight = text.length > 18 ? dp21(appObj, 62) : dp21(appObj, 48);", "    var provisionalHeight = text.length > 18 ? dp21(appObj, 60) : dp21(appObj, 46);", "preview provisional height")
preview = replace_once(preview, "    var leftPadding = dp21(appObj, 14);\n    var rightPadding = dp21(appObj, 14);", "    var leftPadding = dp21(appObj, 16);\n    var rightPadding = dp21(appObj, 16);", "preview horizontal padding")
preview = replace_once(preview, "      st.measuredHeight = st.line2 ? dp21(appObj, 62) : dp21(appObj, 48);", "      st.measuredHeight = st.line2 ? dp21(appObj, 60) : dp21(appObj, 46);", "preview measured height")
preview = replace_once(preview, "    var bgApply = setPaintColor21(bg, c.bg);", "    var backgroundColor = render && render.pressed === true ? c.pressedBg : c.bg;\n    var bgApply = setPaintColor21(bg, backgroundColor);", "preview pressed background")
preview = replace_all_required(preview, "canvas.drawRoundRect(rect, dp21(appObj, 12), dp21(appObj, 12), bg);", "canvas.drawRoundRect(rect, dp21(appObj, 14), dp21(appObj, 14), bg);", 2, "preview card radius")
preview = replace_once(preview, "    var x = dp21(appObj, 14);", "    var x = dp21(appObj, 16);", "preview text x")
preview = replace_once(preview, "      canvas.drawText(new java.lang.String(line1), x, dp21(appObj, 25), textPaint);", "      canvas.drawText(new java.lang.String(line1), x, dp21(appObj, 24), textPaint);", "preview first baseline")
preview = replace_once(preview, "      canvas.drawText(new java.lang.String(line2), x, dp21(appObj, 47), textPaint);", "      canvas.drawText(new java.lang.String(line2), x, dp21(appObj, 45), textPaint);", "preview second baseline")
preview = replace_once(preview, "      canvas.drawText(new java.lang.String(line1), x, dp21(appObj, 30), textPaint);", "      canvas.drawText(new java.lang.String(line1), x, dp21(appObj, 28), textPaint);", "preview single baseline")

if "function applyPickwordColorScheme20(appObj)" not in pickword:
    raise SystemExit("semantic scheme helper missing after patch")
if "function startEnterAnimation21" in preview:
    raise SystemExit("preview property animation unexpectedly restored")
if "toolhubAppRef = this;" not in pickword:
    raise SystemExit("ToolHub instance binding missing")
if "pressedBg" not in preview:
    raise SystemExit("preview pressed semantic color missing")

PICKWORD.write_text(pickword, encoding="utf-8")
PREVIEW.write_text(preview, encoding="utf-8")

record = {
    "schema": 1,
    "id": "optimize-pickword-ui-refresh",
    "type": "optimize",
    "title": "统一拾字与结果预览视觉",
    "details": [
        "拾字窗口改为读取 ToolHub 统一语义配色，亮色、暗色与系统动态配色保持一致",
        "精简标题栏、文本预览区和操作按钮，移除装饰性 Emoji 与按钮缩放动画",
        "编辑弹窗和钉屏卡片统一使用 surface、outline 与状态色角色，不改动选择、翻译和钉屏行为",
        "顶部结果预览保持 Canvas 单实例与无整窗属性动画，优化间距、圆角和按压背景反馈",
        "保留指针、框选 OCR、预览位置、停留时间、两行截断和完整原文复制链路"
    ],
    "manifestVersion": 0
}
RECORD.parent.mkdir(parents=True, exist_ok=True)
RECORD.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("OK applied pickword UI refresh")
print("pickword_version=1.0.4 preview_version=1.3.2")
