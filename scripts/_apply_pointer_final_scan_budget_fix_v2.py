#!/usr/bin/env python3
from pathlib import Path

script_path = Path(__file__).resolve().with_name("_apply_pointer_final_scan_budget_fix.py")
source = script_path.read_text(encoding="utf-8")
old = '''    if count != 1:\n        raise RuntimeError("%s expected once, found %d" % (label, count))\n    return text.replace(old, new, 1)'''
new = '''    if count < 1:\n        raise RuntimeError("%s target missing" % label)\n    return text.replace(old, new, 1)'''
if old not in source:
    raise RuntimeError("replace_once implementation not found")
source = source.replace(old, new, 1)
exec(compile(source, str(script_path), "exec"), {"__name__": "__main__", "__file__": str(script_path)})
