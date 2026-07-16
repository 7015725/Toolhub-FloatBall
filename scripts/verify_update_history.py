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
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def fail(message):
    print("FAIL update-history:", message)
    raise SystemExit(1)


def clean_record(data, path, allow_pending):
    if int(data.get("schema", 0) or 0) != 1:
        fail("schema must be 1: %s" % path)
    if str(data.get("type", "")) not in ALLOWED_TYPES:
        fail("invalid type: %s" % path)
    if not str(data.get("id", "")).strip() or not str(data.get("title", "")).strip():
        fail("id/title missing: %s" % path)
    details = data.get("details") or []
    if not isinstance(details, list) or not [x for x in details if str(x).strip()]:
        fail("details missing: %s" % path)
    version = int(data.get("manifestVersion", 0) or 0)
    if version <= 0:
        if allow_pending:
            return None
        fail("pending record remains: %s" % path)
    if not DATE_RE.match(str(data.get("date", ""))):
        fail("invalid date: %s" % path)
    return dict(data)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--allow-pending", action="store_true")
    args = ap.parse_args()
    if not RECORDS_DIR.exists():
        fail("updates/records missing")
    records = []
    ids = set()
    versions = set()
    for path in sorted(RECORDS_DIR.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        rid = str(data.get("id", ""))
        if rid in ids:
            fail("duplicate id: %s" % rid)
        ids.add(rid)
        clean = clean_record(data, path.relative_to(ROOT), args.allow_pending)
        if clean is None:
            continue
        version = int(clean["manifestVersion"])
        if version in versions:
            fail("duplicate manifestVersion: %s" % version)
        versions.add(version)
        records.append(clean)
    if args.allow_pending and not HISTORY.exists():
        print("OK update-history source_records=%d pending_allowed=true" % len(ids))
        return
    if not HISTORY.exists():
        fail("update_history.json missing")
    history = json.loads(HISTORY.read_text(encoding="utf-8"))
    if int(history.get("schema", 0) or 0) != 1:
        fail("history schema must be 1")
    generated = history.get("records") or []
    expected = sorted(records, key=lambda item: int(item["manifestVersion"]), reverse=True)
    if generated != expected:
        fail("generated records differ from updates/records")
    if expected and int(history.get("historyVersion", 0) or 0) != int(expected[0]["manifestVersion"]):
        fail("historyVersion mismatch")
    print("OK update-history records=%d historyVersion=%s" % (len(expected), history.get("historyVersion")))


if __name__ == "__main__":
    main()
