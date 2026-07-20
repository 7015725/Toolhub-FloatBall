#!/usr/bin/env python3
"""Verify that Python files referenced by GitHub Actions workflows exist."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
PYTHON_CALL = re.compile(
    r"(?:^|[\s;&|({])python(?:3(?:\.\d+)?)?\s+"
    r"(?!-)(?:['\"])?([A-Za-z0-9_./-]+\.py)(?:['\"])?"
)


def main():
    missing = []
    references = []
    workflows = sorted(WORKFLOWS.glob("*.yml"))
    for workflow in workflows:
        text = workflow.read_text(encoding="utf-8")
        for line_number, line in enumerate(text.splitlines(), 1):
            if line.lstrip().startswith("#"):
                continue
            for match in PYTHON_CALL.finditer(line):
                relative = match.group(1)
                references.append((workflow, line_number, relative))
                if not (ROOT / relative).is_file():
                    missing.append((workflow, line_number, relative))

    if missing:
        print("Workflow Python reference verification FAILED:")
        for workflow, line_number, relative in missing:
            print(" - %s:%d -> %s" % (
                workflow.relative_to(ROOT), line_number, relative
            ))
        return 1

    print("OK workflow_python_references=%d workflows=%d" % (
        len(references), len(workflows)
    ))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
