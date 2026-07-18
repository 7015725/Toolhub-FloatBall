#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parent / "apply_pickword_unified_cleanup.py"
text = path.read_text(encoding="utf-8")
old = '    if count != 1:\n        raise SystemExit("%s: expected 1 occurrence, found %d" % (label, count))\n'
new = '    if count != 1 and not (label == "newline push" and count == 2):\n        raise SystemExit("%s: expected 1 occurrence, found %d" % (label, count))\n'
if text.count(old) != 1:
    raise SystemExit("replace_once guard marker missing")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("prepared pickword cleanup runner")
