#!/usr/bin/env python3
"""临时修正最终复审中发现的剩余 STRUCTURE 文档漂移。"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "STRUCTURE.md"
text = PATH.read_text(encoding="utf-8")


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit("followup anchor %s count=%d" % (label, count))
    text = text.replace(old, new, 1)


replace_once(
    '''关键模块：

```text
th_01_base.js
th_16_entry.js
```

这两个模块失败会导致入口中断。其他模块失败会进入 `loadErrors`，但不一定立刻中断，可能在运行期暴露功能缺失。''',
    '''关键模块：

```text
th_01_base.js
th_02_core.js
th_05_persistence.js
th_16_entry.js
th_19_position_state.js
```

任一加载失败都会中断启动。其他模块失败会进入 `loadErrors`；悬浮球仍能启动时返回 `degraded`。入口结果统一使用 `healthy / degraded / failed` 三态。''',
    "critical modules",
)
replace_once(
    '''│   ├── dragging
│   ├── docked
│   └── dockSide''',
    '''│   ├── dragging
│   ├── docked
│   ├── dockSide
│   └── ballRebuildActive''',
    "ball rebuild state",
)
replace_once(
    '''→ color_picker / icon_picker / schema_editor → extra → entry → pointer''',
    '''→ color_picker / icon_picker / schema_editor → extra → entry → pointer → pointer_ocr → position_state''',
    "load order tail",
)
replace_once(
    '''- `th_17_pointer.js` 位于入口生命周期之后，接入按钮动作分发和悬浮球拖动路径。''',
    '''- `th_17_pointer.js` 位于入口生命周期之后，接入按钮动作分发和悬浮球拖动路径。
- `th_18_pointer_ocr.js` 扩展框选 OCR，`th_19_position_state.js` 最后安装位置、布局和重建回滚包装。''',
    "load order notes",
)
replace_once(
    '''- 非关键模块加载失败后可能继续启动，运行期才暴露缺失方法。''',
    '''- 非关键模块加载失败后可能降级启动；入口会明确返回 `degraded` 并列出加载异常。''',
    "degraded risk wording",
)

PATH.write_text(text, encoding="utf-8")
print("Final audit documentation follow-up applied")
