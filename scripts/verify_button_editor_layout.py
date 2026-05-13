#!/usr/bin/env python3
import pathlib
import sys

root = pathlib.Path(__file__).resolve().parents[1]
text = (root / "code" / "th_14_panels.js").read_text(encoding="utf-8")
checks = [
    ("manager has action chip helper", "createButtonManagerActionChip" in text),
    ("manager card has two-row layout marker", "按钮管理列表卡片：上信息、下操作" in text),
    ("manager has search surface marker", "按钮管理搜索卡片" in text),
    ("manager no false long-press sort text", "长按卡片排序" not in text),
    ("manager no homepage title block", "按钮管理首页" not in text),
    ("manager uses textual sort chips", "上移" in text and "下移" in text and "孤立箭头" in text),
    ("manager uses delete chip", "createButtonManagerActionChip(\"删除\"" in text),
    ("editor has hero helper", "createButtonEditorHeroCard" in text),
    ("editor has field spacing helper", "addButtonEditorField" in text),
    ("editor hero visible text", "按钮编辑工作台" in text),
    ("editor sections improved", "常用内容默认展开，低频配置可折叠" in text),
]
failed = [name for name, ok in checks if not ok]
if failed:
    print("Button manager/editor layout verification FAILED:")
    for name in failed:
        print(" - " + name)
    sys.exit(1)
print("Button manager/editor layout verification OK")
