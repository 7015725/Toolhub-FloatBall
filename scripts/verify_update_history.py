#!/usr/bin/env python3
"""Verify ToolHub structured update records and generated history."""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECORDS_DIR = ROOT / "updates" / "records"
HISTORY = ROOT / "update_history.json"
ALLOWED_TYPES = {"feature", "fix", "optimize", "security"}
ALLOWED_MODULE_CHANGES = {"added", "updated", "deleted"}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
GENERATED_FIELDS = ("date", "modules", "entry")


def fail(message):
    print("FAIL update-history:", message)
    raise SystemExit(1)


def validate_common(data, path):
    if int(data.get("schema", 0) or 0) != 1:
        fail("schema must be 1: %s" % path)
    if str(data.get("type", "")) not in ALLOWED_TYPES:
        fail("invalid type: %s" % path)
    if not str(data.get("id", "")).strip() or not str(data.get("title", "")).strip():
        fail("id/title missing: %s" % path)
    details = data.get("details") or []
    if not isinstance(details, list) or not [item for item in details if str(item).strip()]:
        fail("details missing: %s" % path)
    try:
        return int(data.get("manifestVersion", 0) or 0)
    except (TypeError, ValueError):
        fail("invalid manifestVersion: %s" % path)


def validate_pending(data, path):
    unexpected = [field for field in GENERATED_FIELDS if field in data]
    if unexpected:
        fail(
            "pending record contains generated fields %s: %s"
            % (", ".join(unexpected), path)
        )


def validate_finalized(data, path):
    if not DATE_RE.match(str(data.get("date", ""))):
        fail("invalid date: %s" % path)

    modules = data.get("modules")
    if not isinstance(modules, list):
        fail("modules must be a list: %s" % path)
    seen_modules = set()
    for index, module in enumerate(modules):
        if not isinstance(module, dict):
            fail("invalid module item %d: %s" % (index, path))
        name = str(module.get("name", "")).strip()
        change = str(module.get("change", "")).strip()
        if not name or name in seen_modules:
            fail("missing or duplicate module name: %s" % path)
        if change not in ALLOWED_MODULE_CHANGES:
            fail("invalid module change for %s: %s" % (name, path))
        if "from" not in module or "to" not in module:
            fail("module version range missing for %s: %s" % (name, path))
        seen_modules.add(name)

    entry = data.get("entry")
    if not isinstance(entry, dict):
        fail("entry metadata missing: %s" % path)
    if entry.get("changed") not in (True, False):
        fail("entry.changed must be boolean: %s" % path)
    for field in ("from", "to"):
        try:
            int(entry.get(field, 0) or 0)
        except (TypeError, ValueError):
            fail("entry.%s must be an integer: %s" % (field, path))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--require-one-pending",
        action="store_true",
        help="validate source records and require exactly one unsigned record",
    )
    args = ap.parse_args()

    if not RECORDS_DIR.exists():
        fail("updates/records missing")

    finalized = []
    pending = []
    ids = set()
    versions = set()
    for path in sorted(RECORDS_DIR.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        rel = path.relative_to(ROOT)
        rid = str(data.get("id", ""))
        if rid in ids:
            fail("duplicate id: %s" % rid)
        ids.add(rid)

        version = validate_common(data, rel)
        if version <= 0:
            validate_pending(data, rel)
            pending.append(dict(data))
            continue

        validate_finalized(data, rel)
        if version in versions:
            fail("duplicate manifestVersion: %s" % version)
        versions.add(version)
        finalized.append(dict(data))

    if args.require_one_pending:
        if len(pending) != 1:
            fail("exactly one pending update record is required, found %d" % len(pending))
        print(
            "OK update-history pending_id=%s finalized_records=%d"
            % (pending[0].get("id"), len(finalized))
        )
        return

    if pending:
        fail("pending record remains: %s" % pending[0].get("id"))
    if not HISTORY.exists():
        fail("update_history.json missing")

    history = json.loads(HISTORY.read_text(encoding="utf-8"))
    if int(history.get("schema", 0) or 0) != 1:
        fail("history schema must be 1")
    generated = history.get("records") or []
    expected = sorted(
        finalized, key=lambda item: int(item["manifestVersion"]), reverse=True
    )
    if generated != expected:
        fail("generated records differ from updates/records")
    if not expected:
        fail("at least one finalized update record is required")
    if int(history.get("historyVersion", 0) or 0) != int(
        expected[0]["manifestVersion"]
    ):
        fail("historyVersion mismatch")
    print(
        "OK update-history records=%d historyVersion=%s"
        % (len(expected), history.get("historyVersion"))
    )


if __name__ == "__main__":
    main()
