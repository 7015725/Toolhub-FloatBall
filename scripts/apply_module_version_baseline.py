#!/usr/bin/env python3
"""临时补齐编辑器模块版本并收紧签名脚本版本校验。"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

versions = {
    ROOT / "code" / "th_14_button_icon_editor.js": "1.0.0",
    ROOT / "code" / "th_14_schema_editor.js": "1.0.0",
}

for path, version in versions.items():
    text = path.read_text(encoding="utf-8")
    first_lines = text.splitlines()[:5]
    if not any("@version" in line for line in first_lines):
        text = "// @version %s\n" % version + text
    elif ("@version %s" % version) not in "\n".join(first_lines):
        raise SystemExit("unexpected existing version header: %s" % path)
    path.write_text(text, encoding="utf-8")

signer = ROOT / "scripts" / "generate_signed_manifest.py"
text = signer.read_text(encoding="utf-8")
old = '''        files[name] = {
            "version": read_module_version(path),
            "sha256": sha256_file(path),
            "size": path.stat().st_size,
        }
'''
new = '''        module_version = read_module_version(path)
        if module_version == "0.0.0":
            raise SystemExit(
                "Module version missing, invalid, or reserved as 0.0.0: %s" % path
            )
        files[name] = {
            "version": module_version,
            "sha256": sha256_file(path),
            "size": path.stat().st_size,
        }
'''
if new not in text:
    if old not in text:
        raise SystemExit("missing signing version validation anchor")
    text = text.replace(old, new, 1)
signer.write_text(text, encoding="utf-8")

required = {
    ROOT / "code" / "th_14_button_icon_editor.js": "// @version 1.0.0",
    ROOT / "code" / "th_14_schema_editor.js": "// @version 1.0.0",
}
for path, token in required.items():
    if token not in "\n".join(path.read_text(encoding="utf-8").splitlines()[:5]):
        raise SystemExit("generated module missing version token: %s" % path)

if 'if module_version == "0.0.0":' not in signer.read_text(encoding="utf-8"):
    raise SystemExit("signing guard was not applied")

print("Module version baseline patch applied")
