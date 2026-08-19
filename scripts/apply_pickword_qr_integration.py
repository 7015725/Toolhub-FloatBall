#!/usr/bin/env python3
"""Idempotently wire the Beta QR module, boundaries and generated docs before signing."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "ToolHub.js"
QR_MODULE = ROOT / "code" / "th_26_qr_runtime.js"
BOUNDARIES = ROOT / "constraints" / "MODULE_BOUNDARIES.json"
README = ROOT / "README.md"
ARCH = ROOT / "docs" / "ARCHITECTURE.md"
STRUCTURE = ROOT / "docs" / "STRUCTURE.md"
PROTECTED_REPORTER = ROOT / "scripts" / "report_protected_wrapper_chains.py"
NEW_ENTRY_VERSION = 20260819231000


def replace_once(text, old, new, label):
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise SystemExit("integration anchor missing: " + label)


def patch_entry():
    text = ENTRY.read_text(encoding="utf-8")
    text = replace_once(
        text,
        "var TOOLHUB_ENTRY_VERSION = 20260810005000;",
        "var TOOLHUB_ENTRY_VERSION = %d;" % NEW_ENTRY_VERSION,
        "ToolHub entry version",
    )
    text = replace_once(
        text,
        '"th_20_pickword.js", "th_21_result_preview.js", "th_22_image_viewer.js", "th_23_screenshot_manager.js", "th_25_shortx_ui_package.js"]',
        '"th_20_pickword.js", "th_21_result_preview.js", "th_22_image_viewer.js", "th_26_qr_runtime.js", "th_23_screenshot_manager.js", "th_25_shortx_ui_package.js"]',
        "Beta module list",
    )
    if text.count('"th_26_qr_runtime.js"') != 1:
        raise SystemExit("th_26_qr_runtime.js must appear exactly once in ToolHub.js")
    stable_start = text.find("var TOOLHUB_STABLE_MODULES")
    stable_end = text.find("var modules =", stable_start)
    if stable_start < 0 or stable_end < 0:
        raise SystemExit("stable module list missing")
    if '"th_26_qr_runtime.js"' in text[stable_start:stable_end]:
        raise SystemExit("QR module must not enter stable module list")
    ENTRY.write_text(text, encoding="utf-8")


def patch_qr_module():
    text = QR_MODULE.read_text(encoding="utf-8")
    text = replace_once(
        text,
        "var controller = originalControllerFactory.call(appObj, opts);",
        "var controller = originalControllerFactory.call(this, opts);",
        "controller wrapper this binding",
    )
    text = replace_once(
        text,
        'else if (String(result.code || "") === "QR_IMAGE_DECODE_FAILED") result.code = "PICKWORD_QR_IMAGE_DECODE_FAILED";',
        'else if (String(result.code || "") === "QR_IMAGE_DECODE_FAILED") result.code = "PICKWORD_QR_IMAGE_DECODE_FAILED";\n            else if (String(result.code || "") === "QR_RUNTIME_ERROR") result.code = "PICKWORD_QR_RUNTIME_UNAVAILABLE";',
        "runtime error mapping",
    )
    QR_MODULE.write_text(text, encoding="utf-8")


def qr_boundary_records():
    return [
        {
            "method": "createPickwordImageController",
            "definitions": ["th_22_image_viewer.js", "th_26_qr_runtime.js"],
            "effectiveOwner": "th_26_qr_runtime.js",
            "type": "wrapper",
            "reason": "Beta 拾字截图控制器叠加显式二维码解析入口与结果卡，不修改截图查看器内部实现",
            "wrappers": [
                {
                    "module": "th_26_qr_runtime.js",
                    "owner": "th_22_image_viewer.js",
                    "oldVariable": "originalControllerFactory",
                }
            ],
        },
        {
            "method": "hidePickwordWindow",
            "definitions": ["th_20_pickword.js", "th_26_qr_runtime.js"],
            "effectiveOwner": "th_26_qr_runtime.js",
            "type": "wrapper",
            "reason": "关闭拾字窗口前取消二维码 worker、timeout 与迟到结果 token",
            "wrappers": [
                {
                    "module": "th_26_qr_runtime.js",
                    "owner": "th_20_pickword.js",
                    "oldVariable": "originalHide",
                }
            ],
        },
        {
            "method": "disposePickwordModule",
            "definitions": ["th_20_pickword.js", "th_26_qr_runtime.js"],
            "effectiveOwner": "th_26_qr_runtime.js",
            "type": "wrapper",
            "reason": "释放拾字模块前取消二维码解析会话，不改变原拾字清理顺序",
            "wrappers": [
                {
                    "module": "th_26_qr_runtime.js",
                    "owner": "th_20_pickword.js",
                    "oldVariable": "originalDispose",
                }
            ],
        },
    ]


def patch_boundaries():
    data = json.loads(BOUNDARIES.read_text(encoding="utf-8"))
    owners = data.get("directOwners") or {}
    for method in ("createPickwordImageController", "hidePickwordWindow", "disposePickwordModule"):
        owners.pop(method, None)
    data["directOwners"] = owners

    records = data.get("duplicateDefinitions") or []
    by_method = {str(item.get("method", "")): item for item in records if isinstance(item, dict)}
    for record in qr_boundary_records():
        method = record["method"]
        if method in by_method:
            if by_method[method] != record:
                raise SystemExit("existing QR boundary record differs: " + method)
        else:
            records.append(record)
    data["duplicateDefinitions"] = records
    BOUNDARIES.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def patch_protected_wrapper_reporter():
    text = PROTECTED_REPORTER.read_text(encoding="utf-8")
    text = replace_once(
        text,
        '    "Beta 实验扩展": 5,\n    "ShortXUI 最终封装": 6,',
        '    "Beta 实验扩展": 5,\n    "拾字二维码扩展": 6,\n    "ShortXUI 最终封装": 7,',
        "protected wrapper category order",
    )
    anchor = '''    "startAsync": (\n        "ShortXUI 最终封装",\n        "继续保留",\n        "原启动成功后再安装已验收 R3 能力；封装失败会关闭实例并返回启动失败。",\n    ),\n}'''
    replacement = '''    "createPickwordImageController": (\n        "拾字二维码扩展",\n        "继续保留",\n        "仅在既有截图控制器外叠加显式解析入口、结果卡和删除取消回调。",\n    ),\n    "hidePickwordWindow": (\n        "拾字二维码扩展",\n        "继续保留",\n        "关闭拾字窗口前只取消 QR worker、timeout 和迟到结果 token，再委托原关闭实现。",\n    ),\n    "disposePickwordModule": (\n        "拾字二维码扩展",\n        "继续保留",\n        "模块释放前只取消 QR 会话，再委托原拾字清理实现。",\n    ),\n    "startAsync": (\n        "ShortXUI 最终封装",\n        "继续保留",\n        "原启动成功后再安装已验收 R3 能力；封装失败会关闭实例并返回启动失败。",\n    ),\n}'''
    text = replace_once(text, anchor, replacement, "protected wrapper classifications")
    text = replace_once(
        text,
        '        "Beta 实验扩展": "继续保留，仅在 Beta 实验室路由生效",\n        "ShortXUI 最终封装": "继续保留，属于验收封装与失败回滚边界",',
        '        "Beta 实验扩展": "继续保留，仅在 Beta 实验室路由生效",\n        "拾字二维码扩展": "继续保留，仅扩展拾字截图显式 QR 解析与取消边界",\n        "ShortXUI 最终封装": "继续保留，属于验收封装与失败回滚边界",',
        "protected wrapper category decision",
    )
    PROTECTED_REPORTER.write_text(text, encoding="utf-8")


def patch_readme():
    text = README.read_text(encoding="utf-8")
    text = replace_once(
        text,
        "- Beta 通道加载 `th_24_shortx_ui_runtime.js`、`th_34_shortx_ui_lab.js` 与最终封装模块 `th_25_shortx_ui_package.js`；最终模块仅在启动成功后安装已验收的 Phase 2 至 Final R3 能力，并逐项校验内置源码 SHA-256。",
        "- Beta 通道加载 `th_24_shortx_ui_runtime.js`、`th_34_shortx_ui_lab.js`、`th_26_qr_runtime.js` 与最终封装模块 `th_25_shortx_ui_package.js`；二维码模块仅在有效拾字截图上按用户点击触发，并按需从签名清单下载 ZXing DEX/JAR 到 `shortx.getShortXDir()/lib`。",
        "README Beta module summary",
    )
    text = replace_once(
        text,
        "- 支持拾字截图查看、保存、分享、删除、自动清理和截图管理。",
        "- 支持拾字截图查看、保存、分享、删除、自动清理和截图管理；Beta 有有效框选截图时可显式解析二维码，结果不会自动复制或打开外部链接。",
        "README QR capability",
    )
    text = replace_once(
        text,
        "shortx.getShortXDir()/\n└── ToolHub/",
        "shortx.getShortXDir()/\n├── lib/\n│   └── toolhub-zxing-runtime-3.5.4-r1.jar   # Beta 首次解析二维码时按需下载、验签清单哈希并只读加载\n└── ToolHub/",
        "README shared lib tree",
    )
    text = replace_once(
        text,
        "    │   ├── th_22_image_viewer.js\n    │   ├── th_23_screenshot_manager.js",
        "    │   ├── th_22_image_viewer.js\n    │   ├── th_26_qr_runtime.js\n    │   ├── th_23_screenshot_manager.js",
        "README module tree",
    )
    README.write_text(text, encoding="utf-8")


def patch_architecture():
    text = ARCH.read_text(encoding="utf-8")
    text = text.replace("更新时间：2026-07-28", "更新时间：2026-08-19", 1)
    text = text.replace("32 个子模块", "33 个子模块")
    text = text.replace("当前为 31 个", "当前为 33 个")
    text = replace_once(
        text,
        "  th_22_image_viewer.js\n  th_23_screenshot_manager.js",
        "  th_22_image_viewer.js\n  th_26_qr_runtime.js\n  th_23_screenshot_manager.js",
        "ARCH module list",
    )
    text = replace_once(
        text,
        "th_22_image_viewer.js\n  拾字截图缩略图、同窗原图查看、缩放平移、大图区域解码、保存、分享、删除和自动清理。\n\nth_23_screenshot_manager.js",
        "th_22_image_viewer.js\n  拾字截图缩略图、同窗原图查看、缩放平移、大图区域解码、保存、分享、删除和自动清理。\n\nth_26_qr_runtime.js\n  Beta 拾字截图二维码解析适配层；只在用户点击“解析二维码”后启动后台解码，按签名清单从 GitHub 下载 D8 运行时到 shortx.getShortXDir()/lib，校验 size/SHA-256、只读属性并通过 DexClassLoader 调用 ZXing Core。\n\nth_23_screenshot_manager.js",
        "ARCH module responsibility",
    )
    ARCH.write_text(text, encoding="utf-8")


def patch_structure():
    text = STRUCTURE.read_text(encoding="utf-8")
    text = text.replace("更新时间：2026-07-28", "更新时间：2026-08-19", 1)
    text = text.replace("32 个子模块", "33 个子模块")
    text = text.replace("files: 32 个模块", "files: 33 个模块")
    text = replace_once(
        text,
        "│   ├── th_22_image_viewer.js\n│   ├── th_23_screenshot_manager.js",
        "│   ├── th_22_image_viewer.js\n│   ├── th_26_qr_runtime.js\n│   ├── th_23_screenshot_manager.js",
        "STRUCTURE repo module tree",
    )
    text = replace_once(
        text,
        "Beta 通道额外加载 `th_24_shortx_ui_runtime.js`、`th_34_shortx_ui_lab.js` 与 `th_25_shortx_ui_package.js`。",
        "Beta 通道额外加载 `th_24_shortx_ui_runtime.js`、`th_34_shortx_ui_lab.js`、`th_26_qr_runtime.js` 与 `th_25_shortx_ui_package.js`。",
        "STRUCTURE beta summary",
    )
    text = replace_once(
        text,
        "│   ├── th_22_image_viewer.js\n│   ├── th_23_screenshot_manager.js\n│   ├── th_25_shortx_ui_package.js",
        "│   ├── th_22_image_viewer.js\n│   ├── th_26_qr_runtime.js\n│   ├── th_23_screenshot_manager.js\n│   ├── th_25_shortx_ui_package.js",
        "STRUCTURE device module tree",
    )
    text = replace_once(
        text,
        "shortx.getShortXDir()/ToolHub/\n├── code/",
        "shortx.getShortXDir()/\n├── lib/\n│   └── toolhub-zxing-runtime-3.5.4-r1.jar   # Beta QR 按需下载；清单哈希通过后只读加载\n└── ToolHub/\n├── code/",
        "STRUCTURE shared lib tree",
    )
    text = replace_once(
        text,
        "| `th_22_image_viewer.js` | 拾字截图查看、缩放平移、保存分享删除、图片记录和自动清理 |\n| `th_23_screenshot_manager.js` |",
        "| `th_22_image_viewer.js` | 拾字截图查看、缩放平移、保存分享删除、图片记录和自动清理 |\n| `th_26_qr_runtime.js` | Beta 拾字截图二维码解析适配层：显式按钮触发、后台解码、会话 token 保护，并从签名清单按需安装 ZXing DEX/JAR 到 `shortx.getShortXDir()/lib` |\n| `th_23_screenshot_manager.js` |",
        "STRUCTURE module responsibility",
    )
    STRUCTURE.write_text(text, encoding="utf-8")


def main():
    patch_entry()
    patch_qr_module()
    patch_boundaries()
    patch_protected_wrapper_reporter()
    patch_readme()
    patch_architecture()
    patch_structure()
    print("OK QR wiring entry_version=%d boundaries=3 docs=3" % NEW_ENTRY_VERSION)


if __name__ == "__main__":
    main()
