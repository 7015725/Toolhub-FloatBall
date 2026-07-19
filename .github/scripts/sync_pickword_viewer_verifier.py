#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[2] / "scripts" / "verify_pickword_image_viewer.py"
text = path.read_text(encoding="utf-8")
old_guard = "require('__toolHubPickwordImageViewerVersion = \"1.2.7\"' in th22 and '=== \"1.2.7\"' in th22, \"image viewer install version guard missing\")"
new_guard = "require('__toolHubPickwordImageViewerVersion = \"1.2.8\"' in th22 and '=== \"1.2.8\"' in th22, \"image viewer install version guard missing\")"
old_version = "require('// @version 1.2.7' in th22, \"image viewer version\")"
new_version = "require('// @version 1.2.8' in th22, \"image viewer version\")"
for old, new, label in ((old_guard, new_guard, "guard"), (old_version, new_version, "version")):
    count = text.count(old)
    if count != 1:
        raise SystemExit("FAIL sync-pickword-viewer-verifier: %s expected once, found %d" % (label, count))
    text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")
print("OK sync-pickword-viewer-verifier 1.2.8")
