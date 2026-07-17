#!/usr/bin/env python3
# 一次性补丁：拾字字号改为四档下拉菜单，并收缩短文本下方留白。

from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "code" / "th_20_pickword.js"
RECORD = ROOT / "updates" / "records" / "fix-pickword-font-dropdown-height.json"

text = TARGET.read_text(encoding="utf-8")


def replace_once(old, new, name):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit("expected one %s block, found %d" % (name, count))
    text = text.replace(old, new, 1)


replace_once("// @version 1.0.6", "// @version 1.0.7", "module version")

replace_once(
'''    var fontSizeSelectorView = null;
    var titleAccentView = null;
    var resultDividerView = null;
    var closeActionView = null;
    var textAreaMinHeight = 0;
''',
'''    var fontSizeSelectorView = null;
    var fontSizeDropdownView = null;
    var fontSizeDropdownCardView = null;
    var fontSizeOptionViews = [];
    var titleAccentView = null;
    var resultDividerView = null;
    var closeActionView = null;
    var textAreaMinHeight = 0;
''',
"dropdown refs",
)

replace_once(
'''    function getFontSizeLevel20() {
        if (currentFontSize <= 16) return "小";
        if (currentFontSize >= 26) return "大";
        return "中";
    }

    function updateFontSizeSelector20() {
        if (!fontSizeSelectorView) return;
        try { fontSizeSelectorView.setText("字号    " + getFontSizeLevel20() + " ⌄"); } catch (eSizeLabel) {}
    }
''',
'''    function getFontSizeLevel20() {
        if (currentFontSize <= 18) return "小";
        if (currentFontSize <= 22) return "中";
        if (currentFontSize <= 26) return "大";
        return "超大";
    }

    function updateFontSizeSelector20() {
        if (!fontSizeSelectorView) return;
        try {
            var level = getFontSizeLevel20();
            fontSizeSelectorView.setText("字号   " + level + "  ▾");
            fontSizeSelectorView.setContentDescription("字号下拉菜单，当前" + level);
        } catch (eSizeLabel) {}
    }

    function refreshFontSizeDropdown20() {
        try {
            if (fontSizeDropdownCardView) {
                fontSizeDropdownCardView.setBackground(createStrokeRoundRectDrawable(
                    replicaSoftSurface20(), replicaOutline20(), isTablet ? 15 : 13, 1));
            }
            for (var iPreset = 0; iPreset < fontSizeOptionViews.length; iPreset++) {
                var option = fontSizeOptionViews[iPreset];
                if (!option) continue;
                var meta = String(option.getTag() || "").split("|");
                var label = meta.length > 0 ? meta[0] : "";
                var size = meta.length > 1 ? parseInt(meta[1], 10) : 0;
                var selected = size === currentFontSize;
                option.setText((selected ? "✓  " : "    ") + label + "   " + size + "sp");
                safeTextColor(option, selected ? replicaAccent20() : Colors.text);
                option.setTypeface(null, selected ? android.graphics.Typeface.BOLD : android.graphics.Typeface.NORMAL);
                option.setBackground(createPressableDrawable(
                    selected ? alphaColor20(replicaAccent20(), isDark ? 38 : 22) : Color.TRANSPARENT,
                    alphaColor20(replicaAccent20(), isDark ? 58 : 34),
                    isTablet ? 11 : 9));
            }
        } catch (eDropdownTheme) {}
    }
''',
"font selector helpers",
)

replace_once(
'''            if (fontSizeSelectorView) fontSizeSelectorView.setBackground(createStrokeRoundRectDrawable(replicaSoftSurface20(), replicaOutline20(), isTablet ? 15 : 13, 1));
            if (closeActionView) safeTextColor(closeActionView, Colors.text);
''',
'''            if (fontSizeSelectorView) fontSizeSelectorView.setBackground(createStrokeRoundRectDrawable(replicaSoftSurface20(), replicaOutline20(), isTablet ? 15 : 13, 1));
            refreshFontSizeDropdown20();
            if (closeActionView) safeTextColor(closeActionView, Colors.text);
''',
"theme dropdown refresh",
)

replace_once(
'''            textAreaMinHeight = Math.min(textAreaHeight, Math.max(Math.round(uiDp(170, 230)), Math.round(screenHeight * 0.22)));
''',
'''            // 短文本按内容收缩，只保留点击、长按与拖选所需的基础高度，避免单行文字下方出现大块留白。
            textAreaMinHeight = Math.min(textAreaHeight, Math.max(Math.round(uiDp(92, 118)), Math.round(screenHeight * 0.105)));
''',
"text minimum height",
)

replace_once(
'''            var titleBar = this.createTitleBar();
            mainLayout.addView(titleBar);

            scrollView = new ScrollView(appContext);
''',
'''            var titleBar = this.createTitleBar();
            mainLayout.addView(titleBar);

            var fontDropdown = this.createFontSizeDropdown();
            mainLayout.addView(fontDropdown);

            scrollView = new ScrollView(appContext);
''',
"dropdown host insertion",
)

replace_once(
'''            fontSizeSelectorView.setOnClickListener(new View.OnClickListener({ onClick: function(v) { hapticFeedback(v); self.toggleFontSizePanel(); } }));
''',
'''            // 原字号滑杆按钮入口暂时屏蔽；当前入口只打开四档字号下拉菜单。
            fontSizeSelectorView.setOnClickListener(new View.OnClickListener({ onClick: function(v) { hapticFeedback(v); self.toggleFontSizeDropdown(); } }));
''',
"selector click",
)

replace_once(
'''        toggleFontSizePanel: function() {
''',
'''        createFontSizeDropdown: function() {
            var self = this;
            var host = new LinearLayout(appContext);
            fontSizeDropdownView = host;
            host.setOrientation(LinearLayout.HORIZONTAL);
            host.setGravity(Gravity.RIGHT | Gravity.TOP);
            host.setVisibility(View.GONE);
            host.setPadding(0, uiDp(5, 7), 0, uiDp(2, 3));
            host.setLayoutParams(new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

            var spacer = new View(appContext);
            host.addView(spacer, new LinearLayout.LayoutParams(0, 1, 1));

            var card = new LinearLayout(appContext);
            fontSizeDropdownCardView = card;
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(uiDp(4, 5), uiDp(4, 5), uiDp(4, 5), uiDp(4, 5));
            card.setBackground(createStrokeRoundRectDrawable(replicaSoftSurface20(), replicaOutline20(), isTablet ? 15 : 13, 1));
            try { card.setElevation(uiDp(5, 7)); } catch (eElevation) {}

            fontSizeOptionViews = [];
            var presets = [
                { label: "小", size: 16 },
                { label: "中", size: 20 },
                { label: "大", size: 24 },
                { label: "超大", size: 28 }
            ];
            for (var iPreset = 0; iPreset < presets.length; iPreset++) {
                (function(preset) {
                    var option = new TextView(appContext);
                    option.setTag(preset.label + "|" + preset.size);
                    option.setTextSize(uiTextSize(12, 14));
                    option.setGravity(Gravity.LEFT | Gravity.CENTER_VERTICAL);
                    option.setSingleLine(true);
                    option.setPadding(uiDp(12, 16), 0, uiDp(12, 16), 0);
                    option.setContentDescription("字号" + preset.label + "，" + preset.size + "sp");
                    option.setOnClickListener(new View.OnClickListener({ onClick: function(v) {
                        hapticFeedback(v);
                        self.updateFontSize(preset.size, false);
                        saveFontSize(preset.size);
                        updateFontSizeSelector20();
                        refreshFontSizeDropdown20();
                        if (fontSizeDropdownView) fontSizeDropdownView.setVisibility(View.GONE);
                        showToast("字号已切换为" + preset.label);
                    } }));
                    applyButtonAnimation(option);
                    fontSizeOptionViews.push(option);
                    card.addView(option, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, uiDp(38, 44)));
                })(presets[iPreset]);
            }

            var cardLp = new LinearLayout.LayoutParams(uiDp(136, 164), LayoutParams.WRAP_CONTENT);
            cardLp.setMargins(0, 0, uiDp(42, 52), 0);
            host.addView(card, cardLp);
            refreshFontSizeDropdown20();
            return host;
        },

        toggleFontSizeDropdown: function() {
            if (!fontSizeDropdownView) return false;
            try {
                if (titleBarRefs.settingMode) titleBarRefs.settingMode.setVisibility(View.GONE);
                if (titleBarRefs.normalMode) titleBarRefs.normalMode.setVisibility(View.VISIBLE);
                var opening = fontSizeDropdownView.getVisibility() !== View.VISIBLE;
                refreshFontSizeDropdown20();
                fontSizeDropdownView.setVisibility(opening ? View.VISIBLE : View.GONE);
                return opening;
            } catch (eDropdown) {}
            return false;
        },

        toggleFontSizePanel: function() {
            // 旧滑杆式字号入口暂时屏蔽，代码保留供后续独立清理。
            return false;
''',
"dropdown methods",
)

reset_old = '''                    titleBarRefs = { normalMode: null, settingMode: null };
'''
reset_new = '''                    titleBarRefs = { normalMode: null, settingMode: null };
                    fontSizeDropdownView = null;
                    fontSizeDropdownCardView = null;
                    fontSizeOptionViews = [];
'''
reset_count = text.count(reset_old)
if reset_count < 2:
    raise SystemExit("expected at least two cleanup reset blocks, found %d" % reset_count)
text = text.replace(reset_old, reset_new)

TARGET.write_text(text, encoding="utf-8")

record = {
    "schema": 1,
    "id": "fix-pickword-font-dropdown-height",
    "type": "fix",
    "title": "优化拾字字号菜单与短文本高度",
    "details": [
        "右上角字号入口改为小、中、大、超大四档下拉菜单，分别对应16sp、20sp、24sp、28sp",
        "旧滑杆式字号入口暂时屏蔽但保留实现，后续可单独清理无效控件与方法",
        "降低主文字区最小高度，短文本按实际内容收缩，减少文字下方大块留白",
        "保留字号持久化、Canvas选字、长按拖选、放大镜、滚动和长文本最大高度限制",
        "不修改指针、框选OCR、截图、顶部结果预览和公共主题"
    ],
    "date": "2026-07-17",
    "modules": [
        {"name": "th_20_pickword.js", "from": "1.0.6", "to": "1.0.7", "change": "updated"}
    ],
    "entry": {"changed": False, "from": 20260714081104, "to": 20260714081104}
}
RECORD.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
