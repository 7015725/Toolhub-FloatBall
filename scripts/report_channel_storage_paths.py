#!/usr/bin/env python3
"""Report runtime storage paths that may bypass the active APP_ROOT_DIR."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = [ROOT / "ToolHub.js"] + sorted((ROOT / "code").glob("*.js"))
PATTERNS = [
    ("shortx_root", re.compile(r"shortx\s*\.\s*getShortXDir\s*\(")),
    ("stable_literal", re.compile(r"ToolHub/(?!Beta/)", re.I)),
    ("stable_absolute", re.compile(r"/ToolHub(?:/|$)", re.I)),
]


def main():
    findings = []
    for path in SOURCES:
        text = path.read_text(encoding="utf-8")
        rel = str(path.relative_to(ROOT))
        for line_no, line in enumerate(text.splitlines(), 1):
            for kind, pattern in PATTERNS:
                if pattern.search(line):
                    findings.append(
                        {
                            "file": rel,
                            "line": line_no,
                            "kind": kind,
                            "text": line.strip()[:500],
                        }
                    )
    print("CHANNEL_STORAGE_PATH_AUDIT_BEGIN")
    print(json.dumps(findings, ensure_ascii=False, indent=2))
    print("CHANNEL_STORAGE_PATH_AUDIT_END count=%d" % len(findings))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
