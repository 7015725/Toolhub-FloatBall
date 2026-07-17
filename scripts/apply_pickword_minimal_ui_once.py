#!/usr/bin/env python3
# 一次性补丁：将拾字主窗口收敛为极简视觉，不改变业务和窗口生命周期。

from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "code" / "th_20_pickword.js"
RECORD = ROOT / "updates" / "records" / "optimize-pickword-minimal-ui.json"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s: expected one match, found %d" % (label, count))
    return text.replace(old, new, 1)


def replace_all(text, old, new, expected, label):
    count = text.count(old)
    if count != expected:
        raise SystemExit("%s: expected %d matches, found %d" % (label, expected, count))
    return text.replace(old, new)


def sub_once(text, pattern, replacement, label):
    out, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit("%s: expected one regex match, found %d" % (label, count))
    return out


source = TARGET.read_text(encoding="utf-8")
source = replace_once(source, "// @version 1.0.4", "// @version 1.0.5", "module version")
source = replace_once(source, "        TEXT_AREA_HEIGHT_DP: 420,", "        TEXT_AREA_HEIGHT_DP: 320,", "text area max height")

source = sub_once(
    source,
    r'''    function applyVisiblePickwordTheme20\(\) \{.*?\n    \}\n\n    function animateWindowEnter\(view\) \{.*?\n    \}\n''',
    '''    function applyVisiblePickwordTheme20() {
        try {
            if (mainLayout) mainLayout.setBackground(createRoundRectDrawable(Colors.surface, isTablet ? 18 : 14));
            if (previewBoxView) previewBoxView.setBackground(createRoundRectDrawable(Color.TRANSPARENT, 0));
            if (countLabelView) safeTextColor(countLabelView, Colors.textSecondary);
            if (previewTextView) safeTextColor(previewTextView, selectedIndices.length > 0 ? Colors.text : Colors.textSecondary);
            if (fontSizeLabel) {
                safeTextColor(fontSizeLabel, Colors.textSecondary);
                fontSizeLabel.setBackground(createRoundRectDrawable(Color.TRANSPARENT, 0));
            }

            if (copyActionBtn) {
                safeTextColor(copyActionBtn, Colors.onPrimary);
                copyActionBtn.setBackground(createPressableDrawable(Colors.btnPrimaryBg, Colors.btnPrimaryPressed, isTablet ? 12 : 10));
            }
            var secondaryButtons = [translateActionBtn, selectAllActionBtn, clearActionBtn];
            var i;
            for (i = 0; i < secondaryButtons.length; i++) {
                if (!secondaryButtons[i]) continue;
                safeTextColor(secondaryButtons[i], Colors.textSecondary);
                secondaryButtons[i].setBackground(createPressableDrawable(Color.TRANSPARENT, Colors.btnSecondaryPressed, isTablet ? 10 : 8));
            }
            var compactButtons = [previewRemoveSpaceBtn, previewRemoveNewlineBtn, previewEditBtn, pinActionBtn];
            for (i = 0; i < compactButtons.length; i++) {
                if (!compactButtons[i]) continue;
                safeTextColor(compactButtons[i], Colors.textSecondary);
                compactButtons[i].setBackground(createPressableDrawable(Color.TRANSPARENT, Colors.primaryLight, isTablet ? 9 : 7));
            }
            var settingButtons = [loadedRemoveSpaceBtn, loadedRemoveNewlineBtn];
            for (i = 0; i < settingButtons.length; i++) {
                if (!settingButtons[i]) continue;
                safeTextColor(settingButtons[i], Colors.textSecondary);
                settingButtons[i].setBackground(createPressableDrawable(Color.TRANSPARENT, Colors.btnSecondaryPressed, isTablet ? 9 : 7));
            }
            if (pinLayout) pinLayout.setBackground(createRoundRectDrawable(Colors.surface, isTablet ? 16 : 14));
            if (pinTextView) safeTextColor(pinTextView, Colors.text);
            if (pinProgressView) safeTextColor(pinProgressView, Colors.textTertiary);
            if (textCanvasControl && textCanvasControl.view) textCanvasControl.view.invalidate();
        } catch (eThemeApply) {}
    }

    // 钉屏与拾字根窗口均静态显示，避免透明 Overlay 属性动画。
    function animateWindowEnter(view) {
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
''',
    "minimal theme and static window",
)

source = replace_once(source, "            layoutParams.dimAmount = 0.32;", "            layoutParams.dimAmount = 0.24;", "dim amount")
source = replace_once(
    source,
    "            mainLayout.setBackground(createStrokeRoundRectDrawable(Colors.surface, Colors.outline, isTablet ? 20 : 16, 1));\n"
    "            mainLayout.setElevation(uiDp(5, 6));\n"
    "            mainLayout.setPadding(uiDp(14, 20), uiDp(14, 18), uiDp(14, 20), uiDp(14, 18));",
    "            mainLayout.setBackground(createRoundRectDrawable(Colors.surface, isTablet ? 18 : 14));\n"
    "            mainLayout.setElevation(uiDp(3, 4));\n"
    "            mainLayout.setPadding(uiDp(12, 16), uiDp(10, 14), uiDp(12, 16), uiDp(10, 14));",
    "root surface",
)
source = replace_once(
    source,
    "            scrollParams.setMargins(0, uiDp(12, 14), 0, uiDp(8, 10));",
    "            scrollParams.setMargins(0, uiDp(8, 10), 0, uiDp(4, 6));",
    "text area margins",
)
source = replace_once(
    source,
    "            actionBar.setOrientation(LinearLayout.HORIZONTAL);\n            actionBar.setPadding(0, uiDp(16, 20), 0, 0);",
    "            actionBar.setOrientation(LinearLayout.HORIZONTAL);\n            actionBar.setGravity(Gravity.CENTER_VERTICAL);\n            actionBar.setPadding(0, uiDp(8, 10), 0, 0);",
    "action bar spacing",
)

source = replace_once(
    source,
    '            titleText.setText("拾字"); safeTextColor(titleText, Colors.text); titleText.setTextSize(uiTextSize(18, 20)); titleText.setTypeface(null, android.graphics.Typeface.BOLD);',
    '            titleText.setText("拾字"); safeTextColor(titleText, Colors.text); titleText.setTextSize(uiTextSize(17, 18)); titleText.setTypeface(null, android.graphics.Typeface.BOLD);',
    "title size",
)
source = replace_once(
    source,
    '            blogText.setText("xin-blog.com"); safeTextColor(blogText, Colors.textTertiary); blogText.setTextSize(uiTextSize(9, 10));',
    '            blogText.setText(""); blogText.setVisibility(View.GONE); safeTextColor(blogText, Colors.textTertiary); blogText.setTextSize(uiTextSize(9, 10));',
    "hide subtitle",
)
source = replace_once(
    source,
    '''            blogText.setOnClickListener(new View.OnClickListener({
                onClick: function(v) {
                    try { setClipboard("https://xin-blog.com"); showToast("链接已复制"); } catch (e) {}
                }
            }));''',
    '''            blogText.setOnClickListener(new View.OnClickListener({
                onClick: function(v) {
                    try { setClipboard("https://xin-blog.com"); showToast("链接已复制"); } catch (e) {}
                }
            }));
            titleContainer.setContentDescription("拾字；点击复制博客链接");
            titleContainer.setOnClickListener(new View.OnClickListener({
                onClick: function(v) {
                    try { setClipboard("https://xin-blog.com"); showToast("链接已复制"); } catch (e) {}
                }
            }));''',
    "preserve blog action",
)
source = replace_once(
    source,
    '''            settingsBtn.setText("字号"); safeTextColor(settingsBtn, Colors.textSecondary); settingsBtn.setTextSize(uiTextSize(12, 13)); settingsBtn.setPadding(uiDp(12, 14), uiDp(7, 9), uiDp(12, 14), uiDp(7, 9));
            settingsBtn.setBackground(createPressableDrawable(Colors.btnSecondaryBg, Colors.btnSecondaryPressed, isTablet ? 16 : 12));
            var closeBtn = new TextView(appContext);
            closeBtn.setText("关闭"); safeTextColor(closeBtn, Colors.textSecondary); closeBtn.setTextSize(uiTextSize(12, 13));
            closeBtn.setPadding(uiDp(12, 14), uiDp(7, 9), uiDp(8, 10), uiDp(7, 9));
            closeBtn.setBackground(createPressableDrawable(Colors.btnSecondaryBg, Colors.btnSecondaryPressed, isTablet ? 16 : 12));''',
    '''            settingsBtn.setText("字号"); safeTextColor(settingsBtn, Colors.textSecondary); settingsBtn.setTextSize(uiTextSize(11, 12)); settingsBtn.setGravity(Gravity.CENTER);
            settingsBtn.setPadding(uiDp(10, 12), uiDp(5, 6), uiDp(10, 12), uiDp(5, 6));
            settingsBtn.setContentDescription("调整字号");
            settingsBtn.setBackground(createPressableDrawable(Color.TRANSPARENT, Colors.btnSecondaryPressed, isTablet ? 10 : 8));
            var closeBtn = new TextView(appContext);
            closeBtn.setText("×"); safeTextColor(closeBtn, Colors.textSecondary); closeBtn.setTextSize(uiTextSize(19, 20)); closeBtn.setGravity(Gravity.CENTER);
            closeBtn.setPadding(uiDp(10, 12), uiDp(3, 4), uiDp(8, 10), uiDp(3, 4));
            closeBtn.setContentDescription("关闭拾字");
            closeBtn.setBackground(createPressableDrawable(Color.TRANSPARENT, Colors.btnSecondaryPressed, isTablet ? 10 : 8));''',
    "minimal title actions",
)
source = replace_once(
    source,
    "            fontSizeLabel.setBackground(createRoundRectDrawable(Colors.primaryLight, isTablet ? 16 : 14));",
    "            fontSizeLabel.setBackground(createRoundRectDrawable(Color.TRANSPARENT, 0));",
    "font label background",
)
source = replace_once(
    source,
    '''            var confirmBtn = new TextView(appContext); confirmBtn.setText("✓"); safeTextColor(confirmBtn, Colors.success); confirmBtn.setTextSize(uiTextSize(16, 18)); confirmBtn.setPadding(uiDp(8, 10), uiDp(4, 6), uiDp(4, 6), uiDp(4, 6));
            confirmBtn.setBackground(createPressableDrawable(Color.TRANSPARENT, isDark ? Color.parseColor("#334155") : Color.parseColor("#e2e8f0"), isTablet ? 16 : 12));''',
    '''            var confirmBtn = new TextView(appContext); confirmBtn.setText("完成"); safeTextColor(confirmBtn, Colors.primary); confirmBtn.setTextSize(uiTextSize(11, 12)); confirmBtn.setGravity(Gravity.CENTER);
            confirmBtn.setPadding(uiDp(8, 10), uiDp(4, 5), uiDp(4, 6), uiDp(4, 5));
            confirmBtn.setBackground(createPressableDrawable(Color.TRANSPARENT, Colors.primaryLight, isTablet ? 10 : 8));''',
    "font panel confirm",
)

source = sub_once(
    source,
    r'''        createPreviewBox: function\(\) \{.*?\n        \},\n\n        createPrimaryBtn: function''',
    '''        createPreviewBox: function() {
            var self = this;
            var previewBox = new LinearLayout(appContext);
            previewBoxView = previewBox;
            previewBox.setOrientation(LinearLayout.VERTICAL);
            previewBox.setBackground(createRoundRectDrawable(Color.TRANSPARENT, 0));
            previewBox.setPadding(0, uiDp(6, 8), 0, 0);
            var params = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
            params.setMargins(0, uiDp(4, 6), 0, 0);
            previewBox.setLayoutParams(params);

            var header = new LinearLayout(appContext);
            header.setOrientation(LinearLayout.HORIZONTAL);
            header.setGravity(Gravity.CENTER_VERTICAL);
            countLabelView = new TextView(appContext);
            countLabelView.setText("0 字");
            safeTextColor(countLabelView, Colors.textSecondary);
            countLabelView.setTextSize(uiTextSize(11, 12));
            countLabelView.setLayoutParams(new LinearLayout.LayoutParams(0, LayoutParams.WRAP_CONTENT, 1));
            previewRemoveSpaceBtn = this.createMiniHeaderBtn("去空格", function() { self.removeSelectedSpaces(); });
            previewRemoveNewlineBtn = this.createMiniHeaderBtn("去换行", function() { self.removeSelectedNewlines(); });
            previewEditBtn = this.createMiniHeaderBtn("编辑", function() { self.editPreviewText(); });
            pinActionBtn = this.createMiniHeaderBtn("钉屏", function() { self.pinSelectedText(); });
            header.addView(countLabelView);
            header.addView(previewRemoveSpaceBtn);
            header.addView(previewRemoveNewlineBtn);
            header.addView(previewEditBtn);
            header.addView(pinActionBtn);
            previewBox.addView(header);

            var previewScroll = new ScrollView(appContext);
            var previewScrollLp = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, uiDp(48, 56));
            previewScrollLp.setMargins(0, uiDp(4, 5), 0, 0);
            previewScroll.setLayoutParams(previewScrollLp);
            previewTextView = new TextView(appContext);
            previewTextView.setText("点击文字选择");
            safeTextColor(previewTextView, Colors.textSecondary);
            previewTextView.setTextSize(uiTextSize(13, 14));
            previewTextView.setLineSpacing(uiDp(1, 2), 1);
            previewTextView.setPadding(0, uiDp(2, 3), 0, 0);
            previewScroll.addView(previewTextView);
            previewBox.addView(previewScroll);
            return previewBox;
        },

        createPrimaryBtn: function''',
    "flat preview section",
)

source = sub_once(
    source,
    r'''        createPrimaryBtn: function\(text, callback\) \{.*?\n        \},\n\n        createIconBtn: function\(text, callback\) \{.*?\n        \},\n\n        createMiniHeaderBtn: function\(text, callback\) \{.*?\n        \},\n\n        createSettingChipBtn: function\(text, callback\) \{.*?\n        \},''',
    '''        createPrimaryBtn: function(text, callback) {
            var btn = new TextView(appContext);
            btn.setText(text);
            safeTextColor(btn, Colors.onPrimary);
            btn.setTextSize(uiTextSize(13, 14));
            btn.setGravity(Gravity.CENTER);
            btn.setSingleLine(true);
            btn.setPadding(uiDp(10, 12), 0, uiDp(10, 12), 0);
            btn.setBackground(createPressableDrawable(Colors.btnPrimaryBg, Colors.btnPrimaryPressed, isTablet ? 12 : 10));
            try { btn.setMinHeight(0); btn.setMinimumHeight(0); btn.setMinWidth(0); btn.setMinimumWidth(0); } catch (eMin) {}
            var params = new LinearLayout.LayoutParams(0, uiDp(38, 42), 2);
            params.setMargins(uiDp(2, 3), 0, uiDp(2, 3), 0);
            btn.setLayoutParams(params);
            btn.setOnClickListener(new View.OnClickListener({ onClick: function(v) { hapticFeedback(v); try { callback(); } catch (e) { showToast("操作失败"); } } }));
            applyButtonAnimation(btn);
            return btn;
        },

        createIconBtn: function(text, callback) {
            var btn = new TextView(appContext);
            btn.setText(text);
            safeTextColor(btn, Colors.textSecondary);
            btn.setTextSize(uiTextSize(12, 13));
            btn.setGravity(Gravity.CENTER);
            btn.setSingleLine(true);
            btn.setPadding(uiDp(8, 10), 0, uiDp(8, 10), 0);
            btn.setBackground(createPressableDrawable(Color.TRANSPARENT, Colors.btnSecondaryPressed, isTablet ? 10 : 8));
            try { btn.setMinHeight(0); btn.setMinimumHeight(0); btn.setMinWidth(0); btn.setMinimumWidth(0); } catch (eMin) {}
            var params = new LinearLayout.LayoutParams(0, uiDp(38, 42), 1);
            params.setMargins(uiDp(2, 3), 0, uiDp(2, 3), 0);
            btn.setLayoutParams(params);
            btn.setOnClickListener(new View.OnClickListener({ onClick: function(v) { hapticFeedback(v); try { callback(); } catch (e) { showToast("操作失败"); } } }));
            applyButtonAnimation(btn);
            return btn;
        },

        createMiniHeaderBtn: function(text, callback) {
            var btn = new TextView(appContext);
            btn.setText(text);
            safeTextColor(btn, Colors.textSecondary);
            btn.setTextSize(uiTextSize(10, 11));
            btn.setGravity(Gravity.CENTER);
            btn.setSingleLine(true);
            btn.setPadding(uiDp(6, 8), uiDp(2, 3), uiDp(6, 8), uiDp(2, 3));
            btn.setBackground(createPressableDrawable(Color.TRANSPARENT, Colors.primaryLight, isTablet ? 9 : 7));
            var params = new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
            params.setMargins(uiDp(4, 6), 0, 0, 0);
            btn.setLayoutParams(params);
            btn.setOnClickListener(new View.OnClickListener({ onClick: function(v) { hapticFeedback(v); try { callback(); } catch (e) { showToast("操作失败"); } } }));
            applyButtonAnimation(btn);
            return btn;
        },

        createSettingChipBtn: function(text, callback) {
            var btn = new TextView(appContext);
            btn.setText(text);
            safeTextColor(btn, Colors.textSecondary);
            btn.setTextSize(uiTextSize(10, 11));
            btn.setGravity(Gravity.CENTER);
            btn.setSingleLine(true);
            btn.setPadding(uiDp(6, 8), uiDp(2, 3), uiDp(6, 8), uiDp(2, 3));
            btn.setBackground(createPressableDrawable(Color.TRANSPARENT, Colors.btnSecondaryPressed, isTablet ? 9 : 7));
            var params = new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
            params.setMargins(uiDp(3, 4), 0, 0, 0);
            btn.setLayoutParams(params);
            btn.setOnClickListener(new View.OnClickListener({ onClick: function(v) { hapticFeedback(v); try { callback(); } catch (e) { showToast("操作失败"); } } }));
            applyButtonAnimation(btn);
            return btn;
        },''',
    "minimal action controls",
)

source = replace_all(
    source,
    'countLabelView.setText("已选 " + count + " 字");',
    'countLabelView.setText(count + " 字");',
    2,
    "compact selected count",
)
source = replace_once(source, 'previewTextView.setText("点击选择文字...");', 'previewTextView.setText("点击文字选择");', "empty preview text")

source = replace_once(
    source,
    "                        root.setBackground(createStrokeRoundRectDrawable(Colors.surface, Colors.outline, isTablet ? 20 : 16, 1));\n                        try { root.setElevation(uiDp(6, 8)); } catch (eElev) {}",
    "                        root.setBackground(createRoundRectDrawable(Colors.surface, isTablet ? 18 : 14));\n                        try { root.setElevation(uiDp(3, 4)); } catch (eElev) {}",
    "edit dialog root",
)
source = replace_once(
    source,
    "                        inputCard.setBackground(createStrokeRoundRectDrawable(Colors.surfaceVariant, Colors.outline, isTablet ? 14 : 12, 1));",
    "                        inputCard.setBackground(createRoundRectDrawable(Colors.surfaceVariant, isTablet ? 12 : 10));",
    "edit input surface",
)
source = replace_once(
    source,
    "                    pinLayout.setBackground(createStrokeRoundRectDrawable(Colors.surface, Colors.outline, isTablet ? 18 : 16, 1));\n                    pinLayout.setElevation(uiDp(6, 7));",
    "                    pinLayout.setBackground(createRoundRectDrawable(Colors.surface, isTablet ? 16 : 14));\n                    pinLayout.setElevation(uiDp(3, 4));",
    "pin minimal surface",
)

required = [
    "// @version 1.0.5",
    "TEXT_AREA_HEIGHT_DP: 320",
    "titleContainer.setContentDescription(\"拾字；点击复制博客链接\")",
    "previewTextView.setText(\"点击文字选择\")",
    "new LinearLayout.LayoutParams(0, uiDp(38, 42), 2)",
    "function animateWindowEnter(view)",
]
for marker in required:
    if marker not in source:
        raise SystemExit("missing marker after patch: " + marker)
if "new Button(appContext)" in source[source.find("createPrimaryBtn: function"):source.find("createFingerPreview: function")]:
    raise SystemExit("legacy native Button remains in minimal action control section")

TARGET.write_text(source, encoding="utf-8")

record = {
    "schema": 1,
    "id": "optimize-pickword-minimal-ui",
    "type": "optimize",
    "title": "拾字窗口改为极简布局",
    "details": [
        "拾字窗口收敛为单一 surface，移除预览区卡片描边和低频操作胶囊背景",
        "隐藏标题下方站点副标题，点击标题仍可复制原有博客链接，所有功能入口保持不变",
        "压缩窗口内边距、文本区高度上限、预览高度和底部按钮高度，短文本按内容自适应",
        "复制保留主要操作层级，翻译、全选、清空及文本处理改为轻量文字按钮",
        "编辑弹窗和钉屏窗口同步降低圆角、阴影与边框层级，不修改选择、翻译、滚动和拖动行为"
    ],
    "manifestVersion": 0
}
RECORD.parent.mkdir(parents=True, exist_ok=True)
RECORD.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("OK applied pickword minimal UI")
print("module=th_20_pickword.js version=1.0.5")
