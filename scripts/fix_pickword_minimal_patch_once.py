#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parent / "apply_pickword_minimal_ui_once.py"
text = path.read_text(encoding="utf-8")
old = '''source = replace_once(source, 'previewTextView.setText("点击选择文字...");', 'previewTextView.setText("点击文字选择");', "empty preview text")'''
new = '''source = replace_all(source, 'previewTextView.setText("点击选择文字...");', 'previewTextView.setText("点击文字选择");', 2, "empty preview text")'''
if text.count(old) != 1:
    raise SystemExit("patch fixer expected one target, found %d" % text.count(old))
path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("OK fixed empty preview replacement count")
