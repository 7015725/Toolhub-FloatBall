#!/usr/bin/env python3
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

    if not text.startswith("// @version 1.0.13\n"):
        fail("th_20_pickword.js version must be 1.0.13")

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
