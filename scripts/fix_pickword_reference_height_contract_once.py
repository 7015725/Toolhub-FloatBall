#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "code" / "th_20_pickword.js"
text = path.read_text(encoding="utf-8")

old_scroll = "            var scrollParams = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, textAreaMinHeight);\n            scrollParams.setMargins(0, uiDp(18, 22), 0, uiDp(12, 16));"
new_scroll = "            var scrollParams = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, uiDp(60, 72));\n            scrollParams.height = textAreaMinHeight;\n            scrollParams.setMargins(0, uiDp(18, 22), 0, uiDp(12, 16));"
if text.count(old_scroll) != 1:
    raise SystemExit("height contract scroll marker mismatch")
text = text.replace(old_scroll, new_scroll, 1)

old_height = "                var desired = contentHeight + uiDp(10, 12);\n                var newHeight = Math.max(textAreaMinHeight, Math.min(desired, textAreaHeight));"
new_height = "                var adaptiveHeight = Math.min(contentHeight + uiDp(8, 10), textAreaHeight);\n                var newHeight = Math.max(textAreaMinHeight, adaptiveHeight);"
if text.count(old_height) != 1:
    raise SystemExit("height contract adaptive marker mismatch")
text = text.replace(old_height, new_height, 1)

path.write_text(text, encoding="utf-8")
print("OK preserved pickword stable adaptive height contract")
