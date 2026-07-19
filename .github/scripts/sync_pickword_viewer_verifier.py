#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[2] / "scripts" / "verify_pickword_image_viewer.py"
lines = path.read_text(encoding="utf-8").splitlines(True)
guard_count = 0
version_count = 0
out = []
for line in lines:
    if "image viewer install version guard missing" in line:
        replaced = line.replace("1.2.7", "1.2.8")
        if replaced != line:
            guard_count += 1
        line = replaced
    if "image viewer version" in line and "// @version 1.2.7" in line:
        replaced = line.replace("// @version 1.2.7", "// @version 1.2.8")
        if replaced != line:
            version_count += 1
        line = replaced
    out.append(line)
if guard_count != 1 or version_count != 1:
    raise SystemExit("FAIL sync-pickword-viewer-verifier guard=%d version=%d" % (guard_count, version_count))
text = "".join(out)
if '__toolHubPickwordImageViewerVersion = "1.2.8"' not in text or '// @version 1.2.8' not in text:
    raise SystemExit("FAIL sync-pickword-viewer-verifier new assertions missing")
path.write_text(text, encoding="utf-8")
print("OK sync-pickword-viewer-verifier 1.2.8")
