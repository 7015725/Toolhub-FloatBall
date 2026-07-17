#!/usr/bin/env python3
from pathlib import Path
import json
import re

source_path = Path("code/th_20_pickword.js")
text = source_path.read_text(encoding="utf-8")


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s: expected 1 match, got %d" % (label, count))
    text = text.replace(old, new, 1)


def remove_block(start_marker, end_marker, label):
    global text
    if text.count(start_marker) != 1:
        raise SystemExit("%s start marker count invalid" % label)
    start = text.index(start_marker)
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit("%s end marker missing" % label)
    text = text[:start] + text[end:]


replace_once("// @version 1.0.11", "// @version 1.0.12", "module version")

share_start = text.index("        sharePickwordText: function() {")
share_end = text.index("        doTranslate: function() {", share_start)
share_block = text[share_start:share_end]
old_launch = "                appContext.startActivity(chooser);\n"
if share_block.count(old_launch) != 1:
    raise SystemExit("share launcher call count invalid")
share_block = share_block.replace(
    old_launch,
    old_launch + "                this.hide();\n",
    1,
)
text = text[:share_start] + share_block + text[share_end:]

replace_once("    var seekBar = null;\n    var fontSizeLabel = null;\n", "", "legacy slider state")
replace_once("    var loadedRemoveSpaceBtn = null;\n    var loadedRemoveNewlineBtn = null;\n", "", "hidden cleanup buttons")
replace_once("    var titleBarRefs = { normalMode: null, settingMode: null };\n", "", "legacy title mode refs")
replace_once("            if (fontSizeLabel) safeTextColor(fontSizeLabel, replicaAccent20());\n", "", "legacy label theme")
replace_once(
    "                        if (seekBar) seekBar.setProgress(currentFontSize - MIN_FONT_SIZE);\n"
    "                        if (fontSizeLabel) fontSizeLabel.setText(currentFontSize + \"sp\");\n",
    "",
    "legacy reopen sync",
)
replace_once(
    "            this.updateCleanButtonView(loadedRemoveSpaceBtn, \"loaded\", \"spaces\", \"去空格\", hasLoadedText, false);\n"
    "            this.updateCleanButtonView(loadedRemoveNewlineBtn, \"loaded\", \"newlines\", \"去换行\", hasLoadedText, false);\n",
    "",
    "hidden cleanup state updates",
)
replace_once(
    "                if (titleBarRefs.settingMode) titleBarRefs.settingMode.setVisibility(View.GONE);\n"
    "                if (titleBarRefs.normalMode) titleBarRefs.normalMode.setVisibility(View.VISIBLE);\n\n",
    "",
    "legacy title mode switching",
)
replace_once("            if (fontSizeLabel) fontSizeLabel.setText(size + \"sp\");\n", "", "legacy label update")

remove_block(
    "    function createFontSizeCanvasSlider(owner) {",
    "    function showToast(msg) {",
    "legacy canvas slider",
)
remove_block(
    "        toggleFontSizePanel: function() {",
    "        updateFontSize: function(size, skipAdjust) {",
    "unreachable slider panel toggle",
)
remove_block(
    "        createSettingChipBtn: function(textValue, callback) {",
    "        createFingerPreview: function() {",
    "hidden setting chip factory",
)

setting_start_marker = "            var settingMode = new LinearLayout(appContext);"
setting_end_marker = "            titleBar.addView(normalMode);"
if text.count(setting_start_marker) != 1:
    raise SystemExit("legacy setting mode start count invalid")
setting_start = text.index(setting_start_marker)
setting_end = text.find(setting_end_marker, setting_start)
if setting_end < 0:
    raise SystemExit("legacy setting mode end missing")
text = text[:setting_start] + text[setting_end:]
replace_once(
    "            titleBar.addView(normalMode);\n"
    "            titleBar.addView(settingMode);\n"
    "            titleBarRefs.normalMode = normalMode;\n"
    "            titleBarRefs.settingMode = settingMode;\n",
    "            titleBar.addView(normalMode);\n",
    "legacy title mode attachment",
)

text, reset_count = re.subn(
    r"^[ \t]*titleBarRefs = \{ normalMode: null, settingMode: null \};\n",
    "",
    text,
    flags=re.MULTILINE,
)
if reset_count != 2:
    raise SystemExit("legacy title mode reset count invalid: %d" % reset_count)

for marker in (
    "createFontSizeCanvasSlider",
    "toggleFontSizePanel",
    "createSettingChipBtn",
    "titleBarRefs",
    "settingMode",
    "seekBar",
    "fontSizeLabel",
    "loadedRemoveSpaceBtn",
    "loadedRemoveNewlineBtn",
):
    if marker in text:
        raise SystemExit("legacy marker remains: %s" % marker)

share_delegate = 'shareActionBtn = createReplicaButton20("分享", "share", "inline", function() { self.sharePickwordText(); }, null);'
if share_delegate not in text:
    raise SystemExit("share button delegation changed unexpectedly")
share_start = text.index("        sharePickwordText: function() {")
share_end = text.index("        doTranslate: function() {", share_start)
share_block = text[share_start:share_end]
launch_pos = share_block.find("appContext.startActivity(chooser);")
close_pos = share_block.find("this.hide();")
if launch_pos < 0 or close_pos <= launch_pos:
    raise SystemExit("share panel close ordering invalid")

source_path.write_text(text, encoding="utf-8")

verifier = '''#!/usr/bin/env python3
from pathlib import Path

source = Path("code/th_20_pickword.js").read_text(encoding="utf-8")


def require(condition, message):
    if not condition:
        raise SystemExit(message)


start = source.find("        sharePickwordText: function() {")
end = source.find("        doTranslate: function() {", start)
require(start >= 0 and end > start, "sharePickwordText block missing")
block = source[start:end]
launch = block.find("appContext.startActivity(chooser);")
close = block.find("this.hide();")
require(launch >= 0, "share chooser launch missing")
require(close > launch, "pickword panel must close after chooser launch")
require(
    'shareActionBtn = createReplicaButton20("分享", "share", "inline", function() { self.sharePickwordText(); }, null);' in source,
    "share button must keep delegating to sharePickwordText",
)
require(
    'selectedIndices.length > 0 ? this.getSelectedText() : String(originalFullText || fullText || "")' in block,
    "share selection/full-text fallback changed",
)
require(
    "android.content.Intent.ACTION_SEND" in block and 'sendIntent.setType("text/plain")' in block,
    "original ACTION_SEND behavior changed",
)

for marker in (
    "createFontSizeCanvasSlider",
    "toggleFontSizePanel",
    "createSettingChipBtn",
    "titleBarRefs",
    "settingMode",
    "seekBar",
    "fontSizeLabel",
    "loadedRemoveSpaceBtn",
    "loadedRemoveNewlineBtn",
):
    require(marker not in source, "legacy font-size marker remains: " + marker)

for preset in (
    '{ label: "小", size: 16 }',
    '{ label: "中", size: 20 }',
    '{ label: "大", size: 24 }',
    '{ label: "超大", size: 28 }',
):
    require(preset in source, "font-size dropdown preset missing: " + preset)
require(
    "self.updateFontSize(preset.size, false);" in source and "saveFontSize(preset.size);" in source,
    "font-size dropdown persistence changed",
)

print("pickword share-close and legacy font-size cleanup verified")
'''
Path("scripts/verify_pickword_share_close_cleanup.py").write_text(verifier, encoding="utf-8")

verify_path = Path(".github/workflows/verify.yml")
verify_text = verify_path.read_text(encoding="utf-8")
old_verify = (
    "            python3 scripts/verify_pickword_long_click_api34.py\n"
    "            python3 scripts/verify_entry_lifecycle.py\n"
)
new_verify = (
    "            python3 scripts/verify_pickword_long_click_api34.py\n"
    "            python3 scripts/verify_pickword_share_close_cleanup.py\n"
    "            python3 scripts/verify_entry_lifecycle.py\n"
)
if verify_text.count(old_verify) != 1:
    raise SystemExit("verify workflow insertion point invalid")
verify_path.write_text(verify_text.replace(old_verify, new_verify, 1), encoding="utf-8")

record = {
    "schema": 1,
    "id": "fix-pickword-share-close-cleanup",
    "type": "fix",
    "title": "优化拾字分享关闭并清理旧字号代码",
    "details": [
        "拾字分享按钮继续优先分享当前选区、无选区时分享完整原文，并保留Android ACTION_SEND纯文本选择器",
        "系统分享选择器成功启动后调用拾字现有hide关闭流程，自动关闭拾字面板；分享启动失败时保留面板并提示错误",
        "清理四档字号下拉启用后已不可达的旧Canvas滑杆、隐藏settingMode、字号标签、完成按钮和旧切换方法",
        "清理仅服务于隐藏字号面板的去空格与去换行按钮状态和控件工厂，现有去重换行按钮点击与长按功能保持不变",
        "保留小中大超大四档字号、SharedPreferences持久化、文字选择、复制、翻译、钉屏、放大镜和WindowManager关闭边界",
    ],
    "manifestVersion": 20260717230100,
    "date": "2026-07-17",
    "modules": [
        {
            "name": "th_20_pickword.js",
            "from": "1.0.11",
            "to": "1.0.12",
            "change": "updated",
        }
    ],
    "entry": {
        "changed": False,
        "from": 20260714081104,
        "to": 20260714081104,
    },
}
record_path = Path("updates/records/fix-pickword-share-close-cleanup.json")
if record_path.exists():
    raise SystemExit("update record already exists")
record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
