#!/usr/bin/env python3
"""Finalize one pending ToolHub update record and build update_history.json."""
import argparse
import json
import re
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "code"
ENTRY = ROOT / "ToolHub.js"
RECORDS_DIR = ROOT / "updates" / "records"
HISTORY = ROOT / "update_history.json"
ALLOWED_TYPES = {"feature", "fix", "optimize", "security"}
TZ = timezone(timedelta(hours=8))


def run_git(args, check=True):
    proc = subprocess.run(["git"] + list(args), cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if check and proc.returncode != 0:
        raise RuntimeError("git %s failed: %s" % (" ".join(args), (proc.stderr or proc.stdout).strip()))
    return proc


def resolve_base(base_ref):
    candidates = [base_ref, "origin/main", "HEAD^"]
    for candidate in candidates:
        if not candidate:
            continue
        proc = run_git(["rev-parse", "--verify", candidate], check=False)
        if proc.returncode == 0:
            return candidate
    raise RuntimeError("cannot resolve history comparison base")


def module_version(text):
    first = "\n".join(str(text).splitlines()[:5])
    found = re.search(r"@version\s+(\d+\.\d+\.\d+)(?:\s|$)", first)
    return found.group(1) if found else ""


def entry_version(text):
    for symbol in ("TOOLHUB_ENTRY_VERSION", "MIN_TRUSTED_MANIFEST_VERSION"):
        found = re.search(r"\bvar\s+%s\s*=\s*(\d+)\s*;" % re.escape(symbol), str(text))
        if found:
            return int(found.group(1))
    return 0


def git_show(ref, rel):
    proc = run_git(["show", "%s:%s" % (ref, rel)], check=False)
    return proc.stdout if proc.returncode == 0 else ""


def changed_modules(merge_base):
    proc = run_git(["diff", "--name-status", merge_base, "HEAD", "--", "code"])
    out = []
    for raw in proc.stdout.splitlines():
        parts = raw.split("\t")
        if len(parts) < 2:
            continue
        status = parts[0]
        rel = parts[-1].strip()
        if not rel.startswith("code/") or not rel.endswith(".js"):
            continue
        current_path = ROOT / rel
        before = module_version(git_show(merge_base, rel))
        after = module_version(current_path.read_text(encoding="utf-8", errors="replace")) if current_path.exists() else ""
        out.append({
            "name": rel[len("code/"):],
            "from": before,
            "to": after,
            "change": "added" if status.startswith("A") else ("deleted" if status.startswith("D") else "updated"),
        })
    return out


def entry_change(merge_base):
    before_text = git_show(merge_base, "ToolHub.js")
    after_text = ENTRY.read_text(encoding="utf-8", errors="replace")
    before = entry_version(before_text)
    after = entry_version(after_text)
    return {"changed": before_text != after_text, "from": before, "to": after}


def load_records():
    RECORDS_DIR.mkdir(parents=True, exist_ok=True)
    items = []
    for path in sorted(RECORDS_DIR.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        data["__path"] = path
        items.append(data)
    return items


def validate_source(record):
    if int(record.get("schema", 0) or 0) != 1:
        raise RuntimeError("record schema must be 1: %s" % record.get("__path"))
    if str(record.get("type", "")) not in ALLOWED_TYPES:
        raise RuntimeError("invalid record type: %s" % record.get("__path"))
    if not str(record.get("id", "")).strip() or not str(record.get("title", "")).strip():
        raise RuntimeError("record id/title missing: %s" % record.get("__path"))
    details = record.get("details") or []
    if not isinstance(details, list) or not [x for x in details if str(x).strip()]:
        raise RuntimeError("record details missing: %s" % record.get("__path"))


def create_auto_record(record_id, title, details):
    from create_update_record import write_record
    return write_record(record_id, "optimize", title, details)


def finalize_history(manifest_version, base_ref="", date_override="", fallback_title="", fallback_details=None):
    records = load_records()
    for record in records:
        validate_source(record)
    pending = [item for item in records if int(item.get("manifestVersion", 0) or 0) <= 0]
    if len(pending) == 0:
        title = str(fallback_title or "ToolHub 自动签名更新").strip()
        details = [str(x).strip() for x in (fallback_details or [title]) if str(x).strip()]
        create_auto_record("auto-%s" % manifest_version, title, details)
        records = load_records()
        pending = [item for item in records if int(item.get("manifestVersion", 0) or 0) <= 0]
    if len(pending) != 1:
        raise RuntimeError("exactly one pending update record is required, found %d" % len(pending))

    base = resolve_base(base_ref)
    merge_base = run_git(["merge-base", base, "HEAD"]).stdout.strip()
    if not merge_base:
        raise RuntimeError("empty merge base")
    current = pending[0]
    current["manifestVersion"] = int(manifest_version)
    current["date"] = str(date_override or datetime.now(TZ).strftime("%Y-%m-%d"))
    current["modules"] = changed_modules(merge_base)
    current["entry"] = entry_change(merge_base)
    path = current.pop("__path")
    path.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    finalized = []
    seen_ids = set()
    seen_versions = set()
    for item in load_records():
        validate_source(item)
        item.pop("__path", None)
        version = int(item.get("manifestVersion", 0) or 0)
        if version <= 0:
            continue
        rid = str(item.get("id", ""))
        if rid in seen_ids:
            raise RuntimeError("duplicate record id: %s" % rid)
        if version in seen_versions:
            raise RuntimeError("duplicate manifestVersion: %s" % version)
        seen_ids.add(rid)
        seen_versions.add(version)
        finalized.append(item)
    finalized.sort(key=lambda item: int(item.get("manifestVersion", 0) or 0), reverse=True)
    history = {
        "schema": 1,
        "historyVersion": int(finalized[0]["manifestVersion"]) if finalized else int(manifest_version),
        "generatedAt": datetime.now(TZ).isoformat(timespec="seconds"),
        "records": finalized,
    }
    HISTORY.write_text(json.dumps(history, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return current, history


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest-version", type=int, required=True)
    ap.add_argument("--base-ref", default="")
    ap.add_argument("--date", default="")
    ap.add_argument("--title", default="")
    ap.add_argument("--detail", action="append", default=[])
    args = ap.parse_args()
    record, history = finalize_history(args.manifest_version, args.base_ref, args.date, args.title, args.detail)
    print("record_id=%s" % record.get("id"))
    print("history_records=%d" % len(history.get("records") or []))


if __name__ == "__main__":
    main()
