#!/usr/bin/env python3
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
