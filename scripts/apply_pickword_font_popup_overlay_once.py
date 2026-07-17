#!/usr/bin/env python3
# 一次性补丁：将拾字字号菜单从主布局子 View 改为锚定按钮的 PopupWindow 浮层。

from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "code" / "th_20_pickword.js"
RECORD = ROOT / "updates" / "records" / "fix-pickword-font-popup-overlay.json"

text = TARGET.read_text(encoding="utf-8")


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s: expected one match, found %d" % (label, count))
    text = text.replace(old, new, 1)


def sub_once(pattern, replacement, label):
    global text
    text2, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit("%s: expected one regex match, found %d" % (label, count))
    text = text2


replace_once("// @version 1.0.8", "// @version 1.0.9", "module version")

replace_once(
    '''    var fontSizeDropdownView = null;
    var fontSizeDropdownCardView = null;
    var fontSizeOptionViews = [];
''',
    '''    var fontSizeDropdownView = null;
    var fontSizeDropdownCardView = null;
    var fontSizePopupWindow = null;
    var fontSizeOptionViews = [];
''',
    "popup runtime reference",
)

replace_once(
    '''            var fontDropdown = this.createFontSizeDropdown();
            mainLayout.addView(fontDropdown);

''',
    '''            // 字号菜单使用锚定 PopupWindow，不能加入主 LinearLayout 参与窗口测量。

''',
    "remove in-flow dropdown",
)

new_create = '''        createFontSizeDropdown: function() {
            var self = this;
            var card = new LinearLayout(appContext);
            fontSizeDropdownView = card;
            fontSizeDropdownCardView = card;
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(uiDp(4, 5), uiDp(4, 5), uiDp(4, 5), uiDp(4, 5));
            card.setBackground(createStrokeRoundRectDrawable(replicaSoftSurface20(), replicaOutline20(), isTablet ? 15 : 13, 1));
            try { card.setElevation(uiDp(8, 10)); } catch (eElevation) {}

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
                        try {
                            if (fontSizePopupWindow && fontSizePopupWindow.isShowing()) fontSizePopupWindow.dismiss();
                        } catch (eDismissOption) {}
                        showToast("字号已切换为" + preset.label);
                    } }));
                    applyButtonAnimation(option);
                    fontSizeOptionViews.push(option);
                    card.addView(option, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, uiDp(38, 44)));
                })(presets[iPreset]);
            }

            refreshFontSizeDropdown20();
            return card;
        },

'''
sub_once(
    r'''        createFontSizeDropdown: function\(\) \{.*?\n        \},\n\n(?=        toggleFontSizeDropdown: function\(\))''',
    new_create,
    "dropdown content builder",
)

new_toggle = '''        toggleFontSizeDropdown: function() {
            if (!fontSizeSelectorView) return false;
            try {
                if (fontSizePopupWindow && fontSizePopupWindow.isShowing()) {
                    fontSizePopupWindow.dismiss();
                    return false;
                }
                if (titleBarRefs.settingMode) titleBarRefs.settingMode.setVisibility(View.GONE);
                if (titleBarRefs.normalMode) titleBarRefs.normalMode.setVisibility(View.VISIBLE);

                var popupWidth = uiDp(136, 164);
                var content = this.createFontSizeDropdown();
                refreshFontSizeDropdown20();
                var popup = new android.widget.PopupWindow(
                    content,
                    popupWidth,
                    android.view.ViewGroup.LayoutParams.WRAP_CONTENT,
                    true
                );
                popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(Color.TRANSPARENT));
                popup.setOutsideTouchable(true);
                popup.setFocusable(true);
                try { popup.setElevation(uiDp(8, 10)); } catch (ePopupElevation) {}
                try { popup.setClippingEnabled(true); } catch (ePopupClip) {}
                popup.setOnDismissListener(new android.widget.PopupWindow.OnDismissListener({ onDismiss: function() {
                    if (fontSizePopupWindow === popup) fontSizePopupWindow = null;
                    fontSizeDropdownView = null;
                    fontSizeDropdownCardView = null;
                    fontSizeOptionViews = [];
                } }));
                fontSizePopupWindow = popup;

                var anchorWidth = 0;
                try { anchorWidth = fontSizeSelectorView.getWidth(); } catch (eAnchorWidth) { anchorWidth = 0; }
                var xOffset = Math.min(0, anchorWidth - popupWidth);
                popup.showAsDropDown(fontSizeSelectorView, xOffset, uiDp(6, 8));
                return true;
            } catch (eDropdown) {
                try {
                    if (fontSizePopupWindow && fontSizePopupWindow.isShowing()) fontSizePopupWindow.dismiss();
                } catch (eDismissFail) {}
                fontSizePopupWindow = null;
                fontSizeDropdownView = null;
                fontSizeDropdownCardView = null;
                fontSizeOptionViews = [];
                showToast("字号菜单打开失败");
            }
            return false;
        },

'''
sub_once(
    r'''        toggleFontSizeDropdown: function\(\) \{.*?\n        \},\n\n(?=        toggleFontSizePanel: function\(\))''',
    new_toggle,
    "popup toggle",
)

replace_once(
    '''                        拾字Floaty.removeFingerPreview();

                        windowManager.removeView(mainLayout);
''',
    '''                        拾字Floaty.removeFingerPreview();
                        try {
                            if (fontSizePopupWindow && fontSizePopupWindow.isShowing()) fontSizePopupWindow.dismiss();
                        } catch (eFontPopup) {}
                        fontSizePopupWindow = null;

                        windowManager.removeView(mainLayout);
''',
    "hide popup cleanup",
)

replace_once(
    '''                    try { 拾字Floaty.removePinnedTextWindow(); } catch (ePin) {}
                    try {
                        if (windowManager !== null && mainLayout !== null) windowManager.removeView(mainLayout);
''',
    '''                    try { 拾字Floaty.removePinnedTextWindow(); } catch (ePin) {}
                    try {
                        if (fontSizePopupWindow && fontSizePopupWindow.isShowing()) fontSizePopupWindow.dismiss();
                    } catch (eFontPopup) {}
                    fontSizePopupWindow = null;
                    try {
                        if (windowManager !== null && mainLayout !== null) windowManager.removeView(mainLayout);
''',
    "dispose popup cleanup",
)

replace_once(
    '''            proto.onPickwordConfigurationChanged = function() {
                refreshPickwordTheme20();
''',
    '''            proto.onPickwordConfigurationChanged = function() {
                try {
                    if (fontSizePopupWindow && fontSizePopupWindow.isShowing()) fontSizePopupWindow.dismiss();
                } catch (eFontPopup) {}
                fontSizePopupWindow = null;
                refreshPickwordTheme20();
''',
    "configuration popup cleanup",
)

# 所有窗口销毁路径清理新增引用。
text = text.replace(
    '''                    fontSizeDropdownView = null;
                    fontSizeDropdownCardView = null;
                    fontSizeOptionViews = [];
''',
    '''                    fontSizeDropdownView = null;
                    fontSizeDropdownCardView = null;
                    fontSizePopupWindow = null;
                    fontSizeOptionViews = [];
'''
)

checks = {
    "version": "// @version 1.0.9" in text,
    "popup runtime": "var fontSizePopupWindow = null;" in text,
    "popup creation": "new android.widget.PopupWindow(" in text,
    "anchored display": "popup.showAsDropDown(fontSizeSelectorView" in text,
    "not in main layout": "mainLayout.addView(fontDropdown)" not in text,
    "no visibility toggle": "fontSizeDropdownView.setVisibility" not in text,
    "outside dismiss": "popup.setOutsideTouchable(true)" in text,
    "hide cleanup": text.count("fontSizePopupWindow.isShowing()) fontSizePopupWindow.dismiss()") >= 4,
    "old slider remains blocked": "旧滑杆式字号入口暂时屏蔽" in text and "toggleFontSizePanel: function() {\n            // 旧滑杆式字号入口暂时屏蔽" in text,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit("failed patch checks: " + ", ".join(failed))

TARGET.write_text(text, encoding="utf-8")

record = {
    "schema": 1,
    "id": "fix-pickword-font-popup-overlay",
    "type": "fix",
    "title": "修复拾字字号菜单挤压布局",
    "details": [
        "字号下拉菜单改为锚定字号按钮的PopupWindow浮层，展开时不再加入主LinearLayout参与测量",
        "菜单右边缘与字号按钮对齐，保留小16sp、中20sp、大24sp、超大28sp四档选择与当前项标记",
        "点击外部、再次点击字号、选择字号、关闭拾字或配置变化时都会释放菜单浮层",
        "保留原字号持久化、Canvas重排和旧滑杆入口屏蔽状态",
        "不修改正文高度、选字、拖选、滚动、放大镜、翻译、钉屏、指针、OCR与顶部结果预览"
    ]
}
RECORD.parent.mkdir(parents=True, exist_ok=True)
RECORD.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("OK applied pickword font popup overlay fix")
print("pickword_version=1.0.9")
