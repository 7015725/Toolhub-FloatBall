#!/usr/bin/env python3
"""Make the historical ShortXUI finalizer preserve later Beta QR integration state.

The ShortXUI finalizer predates th_26. It remains authoritative for the generated
th_25 package, but must not roll back or rewrite later feature-owned entry,
manifest, API-policy, boundary, wrapper-report, or documentation state.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "scripts" / "finalize_shortx_ui_runtime.py"


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit("ShortXUI QR compat anchor missing: " + label)
    return text.replace(old, new, 1)


def main():
    text = TARGET.read_text(encoding="utf-8")

    text = replace_once(
        text,
        "ENTRY_VERSION = 20260810005000",
        "ENTRY_VERSION = 20260819231000",
        "entry version",
    )

    text = replace_once(
        text,
        "def patch_manifest_generator(text: str) -> str:\n    source = '    \"th_23_screenshot_manager.js\",\\n]'",
        "def patch_manifest_generator(text: str) -> str:\n    if '\"th_26_qr_runtime.js\"' in text and '\"th_25_shortx_ui_package.js\"' in text:\n        return text\n    source = '    \"th_23_screenshot_manager.js\",\\n]'",
        "manifest generator preservation",
    )

    text = replace_once(
        text,
        "def patch_api_rules(text: str) -> str:\n    from report_api_usage import scan_repository",
        "def patch_api_rules(text: str) -> str:\n    if '\"api-pickword-qr-runtime\"' in text:\n        return text\n    from report_api_usage import scan_repository",
        "API policy preservation",
    )

    text = replace_once(
        text,
        "def patch_boundaries(text: str) -> str:\n    data = json.loads(text)",
        "def patch_boundaries(text: str) -> str:\n    if '\"th_26_qr_runtime.js\"' in text:\n        return text\n    data = json.loads(text)",
        "module boundary preservation",
    )

    text = replace_once(
        text,
        "def patch_protected_reporter(text: str) -> str:\n    if '    \"ShortXUI 最终封装\": 6,' not in text:",
        "def patch_protected_reporter(text: str) -> str:\n    if '\"拾字二维码扩展\"' in text:\n        return text\n    if '    \"ShortXUI 最终封装\": 6,' not in text:",
        "protected wrapper preservation",
    )

    text = replace_once(
        text,
        "def patch_architecture(text: str) -> str:\n    text = text.replace(\"更新时间：2026-07-27\", \"更新时间：2026-07-28\", 1)",
        "def patch_architecture(text: str) -> str:\n    if \"th_26_qr_runtime.js\" in text:\n        return text\n    text = text.replace(\"更新时间：2026-07-27\", \"更新时间：2026-07-28\", 1)",
        "architecture preservation",
    )

    text = replace_once(
        text,
        "def patch_structure(text: str) -> str:\n    text = text.replace(\"更新时间：2026-07-27\", \"更新时间：2026-07-28\", 1)",
        "def patch_structure(text: str) -> str:\n    if \"th_26_qr_runtime.js\" in text:\n        return text\n    text = text.replace(\"更新时间：2026-07-27\", \"更新时间：2026-07-28\", 1)",
        "structure preservation",
    )

    TARGET.write_text(text, encoding="utf-8")
    print("OK ShortXUI finalizer preserves later Beta QR-owned state")


if __name__ == "__main__":
    main()
