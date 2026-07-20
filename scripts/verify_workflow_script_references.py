#!/usr/bin/env python3
"""Verify that Python file references in GitHub Actions workflows exist."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
PYTHON_FILE_RE = re.compile(
    r"(?:^|[\s;&|({])python(?:3(?:\.\d+)?)?\s+"
    r"(?P<path>(?:\./)?[A-Za-z0-9_.\/-]+\.py)\b"
)


def fail(message):
    raise SystemExit("FAIL workflow-script-references: " + message)


def main():
    missing = []
    references = []
    workflow_files = sorted(WORKFLOWS.glob("*.yml")) + sorted(
        WORKFLOWS.glob("*.yaml")
    )
    for workflow in workflow_files:
        text = workflow.read_text(encoding="utf-8")
        for match in PYTHON_FILE_RE.finditer(text):
            rel = match.group("path").lstrip("./")
            candidate = Path(rel)
            if candidate.is_absolute() or ".." in candidate.parts:
                missing.append((workflow.relative_to(ROOT), rel, "unsafe path"))
                continue
            references.append((workflow.relative_to(ROOT), rel))
            if not (ROOT / candidate).is_file():
                missing.append((workflow.relative_to(ROOT), rel, "missing"))
    if missing:
        detail = "; ".join("%s -> %s (%s)" % item for item in missing)
        fail(detail)
    print(
        "Workflow script reference verification passed workflows=%d references=%d"
        % (len(workflow_files), len(references))
    )


if __name__ == "__main__":
    main()
