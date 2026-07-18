#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parent / "apply_pickword_unified_cleanup.py"
text = path.read_text(encoding="utf-8")

old_guard = '    if count != 1:\n        raise SystemExit("%s: expected 1 occurrence, found %d" % (label, count))\n'
new_guard = '    if count != 1 and not (label in ("newline push", "record initial magnifier index") and count == 2):\n        raise SystemExit("%s: expected 1 occurrence, found %d" % (label, count))\n'
if text.count(old_guard) != 1:
    raise SystemExit("replace_once guard marker missing")
text = text.replace(old_guard, new_guard, 1)

old_lifecycle_check = '''# Remove duplicate main-view cleanup left in dispose if an older formatting variant survived.
for marker in ("cancelPickwordCallbacks20", "拾字Floaty.hide();"):
    if marker in text:
        raise SystemExit("obsolete lifecycle marker remains: " + marker)
'''
new_lifecycle_check = '''# The old mixed callback cleaner must be gone. A normal public hidePickwordWindow() call remains valid;
# dispose-specific async-hide absence is checked by verify_pickword_unified_cleanup.py.
if "cancelPickwordCallbacks20" in text:
    raise SystemExit("obsolete lifecycle marker remains: cancelPickwordCallbacks20")
'''
if text.count(old_lifecycle_check) != 1:
    raise SystemExit("lifecycle guard marker missing")
text = text.replace(old_lifecycle_check, new_lifecycle_check, 1)

path.write_text(text, encoding="utf-8")
print("prepared pickword cleanup runner")
