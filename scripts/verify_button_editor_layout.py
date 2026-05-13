#!/usr/bin/env python3
import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parents[1]
text = (root / "code" / "th_14_panels.js").read_text(encoding="utf-8")
checks = [
    ("manager has action chip helper for search", "createButtonManagerActionChip" in text),
    ("manager has text action helper for card actions", "createButtonManagerTextAction" in text),
    ("manager card has two-row layout marker", "按钮管理列表卡片：上信息、下操作" in text),
    ("manager has search surface marker", "按钮管理搜索卡片" in text),
    ("manager no false long-press sort text", "长按卡片排序" not in text),
    ("manager no homepage block text", "按钮管理首页" not in text),
    ("manager header count only", "共 \" + buttons.length + \" 个按钮" in text),
    ("manager card actions are text actions", "createButtonManagerTextAction(\"上移\"" in text and "createButtonManagerTextAction(\"下移\"" in text and "createButtonManagerTextAction(\"删除\"" in text),
    ("editor no useless workbench", "按钮编辑工作台" not in text and "createButtonEditorHeroCard" not in text),
    ("editor has field spacing helper", "addButtonEditorField" in text),
    ("editor fixed footer has equal buttons", "btnCancelLp.weight = 1" in text and "btnSaveLp.weight = 1" in text and "self.dp(44)" in text),
]
failed = [name for name, ok in checks if not ok]
if failed:
    print("Button manager/editor layout verification FAILED:")
    for name in failed:
        print(" - " + name)
    sys.exit(1)
print("Button manager/editor layout verification OK")
