#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parent / "apply_result_preview_settings_flicker.py"
text = path.read_text(encoding="utf-8")
marker = 'path = "scripts/verify_toolapp_layout.py"\ntext = read(path)\n'
insertion = '''path = "scripts/verify_toolapp_layout.py"
text = read(path)
text = replace_once(
    text,
    '    checks = []\\n\\n    def check(group, name, ok):',
    '    checks = []\\n'
    '    add_match, add_body = method_body(extra, "addPanel")\\n\\n'
    '    def check(group, name, ok):',
    "toolapp addPanel early isolation",
)
'''
if text.count(marker) != 1:
    raise SystemExit("prepare marker mismatch count=%d" % text.count(marker))
path.write_text(text.replace(marker, insertion, 1), encoding="utf-8")
print("OK prepared ToolApp verification assignment order")
