#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parent / "apply_result_preview_settings_flicker.py"
text = path.read_text(encoding="utf-8")

old = '''text = replace_once(
    text,
    '    dispatch_match, dispatch_body = method_body(extra, "showToolApp")\n    build_match, build_body = method_body(entry, "showToolAppOnMain")',
    '    dispatch_match, dispatch_body = method_body(extra, "showToolApp")\n'
    '    add_match, add_body = method_body(extra, "addPanel")\n'
    '    build_match, build_body = method_body(entry, "showToolAppOnMain")',
    "toolapp addPanel isolation",
)
'''
new = '''text = replace_once(
    text,
    '    checks = []\n\n    def check(group, name, ok):',
    '    checks = []\n'
    '    add_match, add_body = method_body(extra, "addPanel")\n\n'
    '    def check(group, name, ok):',
    "toolapp addPanel isolation",
)
'''
if text.count(old) != 1:
    raise SystemExit("prepare patch mismatch count=%d" % text.count(old))
path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("OK prepared ToolApp verification assignment order")
