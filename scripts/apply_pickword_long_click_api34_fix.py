#!/usr/bin/env python3
"""Apply the one-time Android 14 long-click listener compatibility fix."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PICKWORD = ROOT / "code" / "th_20_pickword.js"
VERIFY_WORKFLOW = ROOT / ".github" / "workflows" / "verify.yml"
VERIFY_SCRIPT = ROOT / "scripts" / "verify_pickword_long_click_api34.py"
RECORD = ROOT / "updates" / "records" / "fix-pickword-long-click-api34.json"
BOOTSTRAP_BEGIN = "      # BEGIN ONE-TIME PICKWORD LONG-CLICK API34 PATCH\n"
BOOTSTRAP_END = "      # END ONE-TIME PICKWORD LONG-CLICK API34 PATCH\n"
BOOTSTRAP_REF = "          ref: fix/pickword-long-click-api34-20260717\n"


def fail(message):
    raise SystemExit("FAIL pickword-long-click-api34-patch: " + message)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count == 1:
        return text.replace(old, new, 1)
    if count == 0 and new in text:
        return text
    fail("%s expected once, found %d" % (label, count))


def main():
    source = PICKWORD.read_text(encoding="utf-8")

    source = replace_once(
        source,
        "// @version 1.0.10",
        "// @version 1.0.11",
        "module version",
    )

    old_button_listener = '''        if (longCallback) {
            row.setOnLongClickListener(new View.OnLongClickListener({ onLongClick: function(v) {
                hapticFeedback(v);
                try { longCallback(); } catch (eLong) { showToast("操作失败"); }
                return true;
            } }));
        }
'''
    new_button_listener = '''        if (longCallback) {
            row.setOnLongClickListener(new View.OnLongClickListener({
                onLongClick: function(v) {
                    hapticFeedback(v);
                    try { longCallback(); } catch (eLong) { showToast("操作失败"); }
                    return true;
                },
                // Android 14 / API 34 新增的 boolean 回调。Rhino 动态代理必须显式返回，
                // 否则缺失方法会产生 null，并在 system_server 主线程转换 boolean 时崩溃。
                // 当前监听器已主动执行 VIRTUAL_KEY 震动，因此禁止系统再追加默认长按震动。
                onLongClickUseDefaultHapticFeedback: function(v) {
                    return false;
                }
            }));
        }
'''
    source = replace_once(
        source,
        old_button_listener,
        new_button_listener,
        "replica button long-click listener",
    )

    old_preview_listener = '''            previewTextView.setOnLongClickListener(new View.OnLongClickListener({ onLongClick: function(v) {
                if (selectedIndices.length > 0) { hapticFeedback(v); self.removeSelectedSpaces(); return true; }
                return false;
            } }));
'''
    new_preview_listener = '''            previewTextView.setOnLongClickListener(new View.OnLongClickListener({
                onLongClick: function(v) {
                    if (selectedIndices.length > 0) { hapticFeedback(v); self.removeSelectedSpaces(); return true; }
                    return false;
                },
                // 与按钮长按保持同一 API 34 兼容策略；业务已自行提供触觉反馈。
                onLongClickUseDefaultHapticFeedback: function(v) {
                    return false;
                }
            }));
'''
    source = replace_once(
        source,
        old_preview_listener,
        new_preview_listener,
        "preview text long-click listener",
    )

    if source.count("new View.OnLongClickListener") != 2:
        fail("unexpected OnLongClickListener count")
    if source.count("onLongClickUseDefaultHapticFeedback: function(v)") != 2:
        fail("API 34 callback count must be 2")

    PICKWORD.write_text(source, encoding="utf-8")

    verify_source = r'''#!/usr/bin/env python3
"""Verify Android 14 long-click listener compatibility in the pickword module."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "code" / "th_20_pickword.js"


def fail(message):
    print("FAIL pickword-long-click-api34:", message)
    raise SystemExit(1)


def main():
    text = SOURCE.read_text(encoding="utf-8")

    if not text.startswith("// @version 1.0.11\n"):
        fail("th_20_pickword.js version must be 1.0.11")

    listeners = list(re.finditer(r"new\s+View\.OnLongClickListener\s*\(\s*\{", text))
    if len(listeners) != 2:
        fail("expected exactly 2 View.OnLongClickListener instances, found %d" % len(listeners))

    callbacks = re.findall(
        r"onLongClickUseDefaultHapticFeedback\s*:\s*function\s*\(v\)\s*\{\s*return\s+false\s*;\s*\}",
        text,
        re.S,
    )
    if len(callbacks) != 2:
        fail("both long-click listeners must explicitly return false from API 34 callback")

    required = [
        'try { longCallback(); } catch (eLong) { showToast("操作失败"); }',
        'if (selectedIndices.length > 0) { hapticFeedback(v); self.removeSelectedSpaces(); return true; }',
        'cleanupActionBtn = createReplicaButton20("去重换行", "cleanup", "inline", function() { self.cleanReplicaNewlines(); }, function() { self.cleanReplicaSpaces(); });',
        'previewTextView.setContentDescription("选中文字预览；点击编辑，长按去空格");',
    ]
    for marker in required:
        if marker not in text:
            fail("business boundary marker missing: %s" % marker)

    if text.count("hapticFeedback(v);") < 2:
        fail("manual haptic feedback was unexpectedly removed")

    print("OK pickword_long_click_api34 listeners=2 callback=false manual_haptic=preserved")


if __name__ == "__main__":
    main()
'''
    VERIFY_SCRIPT.write_text(verify_source, encoding="utf-8")

    workflow = VERIFY_WORKFLOW.read_text(encoding="utf-8")
    begin_count = workflow.count(BOOTSTRAP_BEGIN)
    end_count = workflow.count(BOOTSTRAP_END)
    if begin_count == 1 and end_count == 1:
        begin_at = workflow.index(BOOTSTRAP_BEGIN)
        end_at = workflow.index(BOOTSTRAP_END, begin_at) + len(BOOTSTRAP_END)
        workflow = workflow[:begin_at] + workflow[end_at:]
    elif begin_count != 0 or end_count != 0:
        fail("verify.yml bootstrap markers are unbalanced")

    if BOOTSTRAP_REF in workflow:
        workflow = workflow.replace(BOOTSTRAP_REF, "", 1)

    workflow = replace_once(
        workflow,
        "permissions:\n  contents: write\n",
        "permissions:\n  contents: read\n",
        "verify workflow permission cleanup",
    )

    anchor = "            python3 scripts/verify_pickword_translate_settings.py\n"
    inserted = anchor + "            python3 scripts/verify_pickword_long_click_api34.py\n"
    if "python3 scripts/verify_pickword_long_click_api34.py" not in workflow:
        if workflow.count(anchor) != 1:
            fail("verify.yml insertion anchor mismatch")
        workflow = workflow.replace(anchor, inserted, 1)
    VERIFY_WORKFLOW.write_text(workflow, encoding="utf-8")

    record = {
        "schema": 1,
        "id": "fix-pickword-long-click-api34",
        "type": "fix",
        "title": "修复拾字长按导致系统重启",
        "details": [
            "为拾字预览文字和去重换行按钮的Rhino长按代理补齐Android 14新增的onLongClickUseDefaultHapticFeedback布尔回调",
            "兼容回调固定返回false，保留现有VIRTUAL_KEY触觉反馈并避免系统追加默认LONG_PRESS造成双重震动",
            "修复缺失接口方法返回null后无法转换为Java boolean、异常逃逸至system_server主线程并触发软重启的问题",
            "保留预览文字点击编辑、长按去空格以及去重换行按钮点击清理换行、长按清理空格的原有行为",
            "不修改翻译请求、翻译替换、选区状态、Canvas拖选、放大镜、WindowManager和设置页逻辑"
        ],
        "manifestVersion": 0
    }
    RECORD.parent.mkdir(parents=True, exist_ok=True)
    if RECORD.exists():
        existing = json.loads(RECORD.read_text(encoding="utf-8"))
        if existing != record:
            fail("pending update record exists with different content")
    else:
        RECORD.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("OK applied pickword long-click API 34 compatibility fix")


if __name__ == "__main__":
    main()
