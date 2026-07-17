#!/usr/bin/env python3
# 一次性补丁：统一拾字 CanvasView 与 ScrollView 高度，消除短文本下方白色空条。

from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "code" / "th_20_pickword.js"
VERIFY = ROOT / "scripts" / "verify_result_preview.py"
RECORD = ROOT / "updates" / "records" / "fix-pickword-text-area-height-sync.json"

text = TARGET.read_text(encoding="utf-8")
verify_text = VERIFY.read_text(encoding="utf-8")


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s: expected one match, found %d" % (label, count))
    text = text.replace(old, new, 1)


def replace_verify_once(old, new, label):
    global verify_text
    count = verify_text.count(old)
    if count != 1:
        raise SystemExit("%s: expected one verifier match, found %d" % (label, count))
    verify_text = verify_text.replace(old, new, 1)


replace_once("// @version 1.0.7", "// @version 1.0.8", "module version")

replace_once(
    '''            // 短文本按内容收缩，只保留点击、长按与拖选所需的基础高度，避免单行文字下方出现大块留白。
            textAreaMinHeight = Math.min(textAreaHeight, Math.max(Math.round(uiDp(92, 118)), Math.round(screenHeight * 0.105)));
''',
    '''            // 与 CanvasView.onMeasure() 使用同一最小高度，避免 ScrollView 高于子 View 后露出底部背景空条。
            textAreaMinHeight = Math.min(textAreaHeight, Math.round(uiDp(80, 96)));
''',
    "shared text area minimum",
)

replace_once(
    '''                var contentHeight = textCanvasControl.getContentHeight();
                var adaptiveHeight = Math.min(contentHeight + uiDp(8, 10), textAreaHeight);
                var newHeight = Math.max(textAreaMinHeight, adaptiveHeight);
''',
    '''                var contentHeight = textCanvasControl.getContentHeight();
                // contentHeight 已包含 Canvas 上下内边距，不再额外补高，确保父子高度一致。
                var adaptiveHeight = Math.min(contentHeight, textAreaHeight);
                var newHeight = Math.min(Math.max(adaptiveHeight, textAreaMinHeight), textAreaHeight);
''',
    "adaptive scroll height",
)

replace_verify_once(
    '''        and "if (preserveHeight !== true) this.adjustScrollViewHeight();" in pickword_load_full
        and "Math.min(contentHeight + uiDp(8, 10), textAreaHeight)" in pickword_height,
        "420dp must remain a maximum height while the first visible frame uses the final adaptive height",
''',
    '''        and "if (preserveHeight !== true) this.adjustScrollViewHeight();" in pickword_load_full
        and "textAreaMinHeight = Math.min(textAreaHeight, Math.round(uiDp(80, 96)))" in pickword_create_window
        and "Math.min(contentHeight, textAreaHeight)" in pickword_height
        and "Math.min(Math.max(adaptiveHeight, textAreaMinHeight), textAreaHeight)" in pickword_height
        and "contentHeight + uiDp(8, 10)" not in pickword_height,
        "maximum height and first-frame adaptive sizing must remain while ScrollView and CanvasView share one minimum-height contract",
''',
    "result preview adaptive-height contract",
)

checks = {
    "version": "// @version 1.0.8" in text,
    "canvas minimum retained": "Math.max(Math.round(state.contentHeight), Math.round(uiDp(80, 96)))" in text,
    "parent minimum synchronized": "textAreaMinHeight = Math.min(textAreaHeight, Math.round(uiDp(80, 96)));" in text,
    "screen percentage removed": "screenHeight * 0.105" not in text,
    "extra height removed": "contentHeight + uiDp(8, 10)" not in text,
    "bounded adaptive height": "Math.min(Math.max(adaptiveHeight, textAreaMinHeight), textAreaHeight)" in text,
    "verifier updated": "ScrollView and CanvasView share one minimum-height contract" in verify_text,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit("failed patch checks: " + ", ".join(failed))

TARGET.write_text(text, encoding="utf-8")
VERIFY.write_text(verify_text, encoding="utf-8")

record = {
    "schema": 1,
    "id": "fix-pickword-text-area-height-sync",
    "type": "fix",
    "title": "修复拾字短文本区域底部空条",
    "details": [
        "统一拾字主文字区 ScrollView 与 CanvasView 的最小高度，消除短文本下方露出的白色背景空条",
        "移除 contentHeight 之外重复增加的8至10dp高度补偿，内容高度直接包含原有上下内边距",
        "取消按屏幕高度百分比放大短文本最小高度，手机和平板分别沿用80dp与96dp触控空间",
        "同步更新结果预览集成校验，使其验证父子同高和长文本最大高度契约",
        "不修改选字索引、点击长按拖选、放大镜、字号下拉、指针、OCR与顶部结果预览"
    ]
}
RECORD.parent.mkdir(parents=True, exist_ok=True)
RECORD.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("OK applied pickword text-area height synchronization")
print("pickword_version=1.0.8")
