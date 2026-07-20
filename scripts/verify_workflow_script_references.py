#!/usr/bin/env python3
"""Verify real Python command references in GitHub Actions workflows."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
PYTHON_COMMAND_RE = re.compile(
    r"^\s*(?:\{\s*)?python(?:3(?:\.\d+)?)?\s+"
    r"(?P<path>(?:\./)?[A-Za-z0-9_.\/-]+\.py)\b"
)
TEMPORARY_WORKFLOW = ".github/workflows/oneshot-trigger-organize-docs.yml"
TEMPORARY_SCRIPT_RE = re.compile(
    r"^scripts/oneshot_organize_docs_python(?:_[A-Za-z0-9_]+)?\.py$"
)


def fail(message):
    raise SystemExit("FAIL workflow-script-references: " + message)


def normalize_reference(path_text):
    value = str(path_text)
    if value.startswith("./"):
        value = value[2:]
    return value


def is_temporary_cross_branch_reference(workflow_name, relative_path):
    return (
        workflow_name == TEMPORARY_WORKFLOW
        and TEMPORARY_SCRIPT_RE.match(relative_path) is not None
    )


def main():
    missing = []
    references = []
    temporary = []
    workflow_files = sorted(WORKFLOWS.glob("*.yml")) + sorted(
        WORKFLOWS.glob("*.yaml")
    )
    for workflow in workflow_files:
        workflow_name = str(workflow.relative_to(ROOT))
        text = workflow.read_text(encoding="utf-8")
        for line_number, line in enumerate(text.splitlines(), 1):
            match = PYTHON_COMMAND_RE.match(line)
            if not match:
                continue
            rel = normalize_reference(match.group("path"))
            candidate = Path(rel)
            if candidate.is_absolute() or ".." in candidate.parts:
                missing.append((workflow_name, line_number, rel, "unsafe path"))
                continue
            references.append((workflow_name, line_number, rel))
            if is_temporary_cross_branch_reference(workflow_name, rel):
                temporary.append((workflow_name, line_number, rel))
                continue
            if not (ROOT / candidate).is_file():
                missing.append((workflow_name, line_number, rel, "missing"))
    if missing:
        detail = "; ".join("%s:%d -> %s (%s)" % item for item in missing)
        fail(detail)
    print(
        "Workflow script reference verification passed workflows=%d references=%d temporary=%d"
        % (len(workflow_files), len(references), len(temporary))
    )


if __name__ == "__main__":
    main()
