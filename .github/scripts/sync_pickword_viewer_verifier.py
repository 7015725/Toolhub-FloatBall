#!/usr/bin/env python3
from pathlib import Path
import re

path = Path(__file__).resolve().parents[2] / "scripts" / "verify_pickword_image_viewer.py"
text = path.read_text(encoding="utf-8")
text, guard_count = re.subn(
    r"require\('__toolHubPickwordImageViewerVersion = \"1\.2\.7\"' in th22 and '=== \"1\.2\.7\"' in th22, \"image viewer install version guard missing\"\)",
    "require('__toolHubPickwordImageViewerVersion = \\\"1.2.8\\\"' in th22 and '=== \\\"1.2.8\\\"' in th22, \\\"image viewer install version guard missing\\\")",
    text,
    count=1,
)
text, version_count = re.subn(
    r"require\('// @version 1\.2\.7' in th22, \"image viewer version\"\)",
    "require('// @version 1.2.8' in th22, \\\"image viewer version\\\")",
    text,
    count=1,
)
if guard_count != 1 or version_count != 1:
    raise SystemExit("FAIL sync-pickword-viewer-verifier guard=%d version=%d" % (guard_count, version_count))
if '1.2.7' in "\n".join(line for line in text.splitlines() if "image viewer" in line or "PickwordImageViewerVersion" in line):
    raise SystemExit("FAIL sync-pickword-viewer-verifier stale version remains")
path.write_text(text, encoding="utf-8")
print("OK sync-pickword-viewer-verifier 1.2.8")
