#!/usr/bin/env python3
"""Idempotently document the Beta-only ShortXUI phase-1 modules."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"
ARCH = ROOT / "docs" / "ARCHITECTURE.md"
STRUCTURE = ROOT / "docs" / "STRUCTURE.md"

RUNTIME = "th_24_shortx_ui_runtime.js"
LAB = "th_34_shortx_ui_lab.js"


def insert_after(text, anchor, addition, label):
    if addition.strip() in text:
        return text
    if anchor not in text:
        raise SystemExit("documentation anchor missing for %s: %s" % (label, anchor))
    return text.replace(anchor, anchor + addition, 1)


def write_if_changed(path, text):
    original = path.read_text(encoding="utf-8")
    if original == text:
        return False
    path.write_text(text, encoding="utf-8")
    return True


def patch_readme():
    text = README.read_text(encoding="utf-8")
    text = insert_after(
        text,
        "    │   ├── th_02_core.js\n",
        "    │   ├── th_24_shortx_ui_runtime.js\n",
        "README runtime module",
    )
    text = insert_after(
        text,
        "    │   ├── th_15_extra.js\n",
        "    │   ├── th_34_shortx_ui_lab.js\n",
        "README lab module",
    )
    beta_note = (
        "- Beta 通道内置隔离的 ShortXUI 第一阶段实验：`th_24_shortx_ui_runtime.js` "
        "提供 Core、Dispatcher、Scope、Color、Metrics、Display、Shape 和 Diagnostics；"
        "`th_34_shortx_ui_lab.js` 只增加实验室页面，默认不替换正式 UI。\n"
    )
    text = insert_after(
        text,
        "- ToolApp 设置页支持手机、横屏和平板宽屏布局。\n",
        beta_note,
        "README Beta ShortXUI note",
    )
    return write_if_changed(README, text)


def patch_architecture():
    text = ARCH.read_text(encoding="utf-8")
    text = text.replace("更新时间：2026-07-20", "更新时间：2026-07-27", 1)
    text = text.replace("本文基于当前 `main` 分支整理", "本文基于当前 `beta` 分支整理", 1)
    text = text.replace("29 个子模块", "31 个子模块")
    text = text.replace("当前为 29 个", "当前为 31 个")

    text = insert_after(
        text,
        "  th_02_core.js\n",
        "  th_24_shortx_ui_runtime.js\n",
        "architecture runtime module list",
    )
    text = insert_after(
        text,
        "  th_15_extra.js\n",
        "  th_34_shortx_ui_lab.js\n",
        "architecture lab module list",
    )
    runtime_detail = (
        "\nth_24_shortx_ui_runtime.js\n"
        "  Beta 隔离的 ShortXUI 第一阶段基础运行时，提供 Core、Dispatcher、Scope、Color、Metrics、Display、Shape 和 Diagnostics；颜色操作通过已验证的 ToolHub 安全桥注入，不接管正式 UI。\n"
    )
    text = insert_after(
        text,
        "th_02_core.js\n  完全结构化 SQLite、旧配置迁移、防抖并发写入，以及 FloatBallAppWM 核心状态和基础方法。\n",
        runtime_detail,
        "architecture runtime responsibility",
    )
    lab_detail = (
        "\nth_34_shortx_ui_lab.js\n"
        "  Beta 专用 ShortX UI 实验室 ToolApp 页面，提供基础环境、颜色、Shape 与 Android Main/ToolHub WM Dispatcher 自检；实验异常不替换悬浮球、主面板、WindowManager、IME、Canvas、指针或 OCR 路径。\n"
    )
    text = insert_after(
        text,
        "th_15_extra.js\n  查看器面板、通用面板定位与显示、ToolApp Shell、页面栈、响应式布局、左右滑返回预览。\n",
        lab_detail,
        "architecture lab responsibility",
    )
    return write_if_changed(ARCH, text)


def patch_structure():
    text = STRUCTURE.read_text(encoding="utf-8")
    text = text.replace("更新时间：2026-07-20", "更新时间：2026-07-27", 1)
    text = text.replace("29 个子模块", "31 个子模块")
    text = text.replace("files: 29 个模块", "files: 31 个模块")

    text = insert_after(
        text,
        "│   ├── th_02_core.js\n",
        "│   ├── th_24_shortx_ui_runtime.js\n",
        "structure runtime module tree",
    )
    text = insert_after(
        text,
        "│   ├── th_15_extra.js\n",
        "│   ├── th_34_shortx_ui_lab.js\n",
        "structure lab module tree",
    )
    runtime_row = (
        "| `th_24_shortx_ui_runtime.js` | Beta 隔离的 ShortXUI 第一阶段运行时：Core、Dispatcher、Scope、Color、Metrics、Display、Shape、Diagnostics；颜色写入只通过注入的安全桥 |\n"
    )
    text = insert_after(
        text,
        "| `th_02_core.js` | 完全结构化 SQLite、旧配置迁移、防抖并发写入、核心 state 与基础方法 |\n",
        runtime_row,
        "structure runtime responsibility",
    )
    lab_row = (
        "| `th_34_shortx_ui_lab.js` | Beta 专用 ShortX UI 实验室页面和 ToolHub 适配器；只扩展实验路由，默认不替换正式 UI、WindowManager、IME、Canvas、指针或 OCR |\n"
    )
    text = insert_after(
        text,
        "| `th_15_extra.js` | 查看器面板、通用面板定位与显示、ToolApp Shell、页面栈、响应式布局、左右滑返回预览 |\n",
        lab_row,
        "structure lab responsibility",
    )

    beta_paragraph = (
        "\nBeta 第一阶段额外加载 `th_24_shortx_ui_runtime.js` 与 `th_34_shortx_ui_lab.js`。"
        "两者运行在 `ToolHub-Beta` 隔离根目录，实验诊断写入 `diagnostics/shortx-ui/`；"
        "Stable 和 ClipHub 不读取这些实验状态。\n"
    )
    text = insert_after(
        text,
        "当前实际加载 **31 个子模块**。",
        beta_paragraph,
        "structure beta isolation note",
    )
    return write_if_changed(STRUCTURE, text)


def main():
    changed = {
        "README.md": patch_readme(),
        "docs/ARCHITECTURE.md": patch_architecture(),
        "docs/STRUCTURE.md": patch_structure(),
    }
    print("ShortXUI documentation patch " + " ".join(
        "%s=%s" % (name, value) for name, value in sorted(changed.items())
    ))


if __name__ == "__main__":
    main()
