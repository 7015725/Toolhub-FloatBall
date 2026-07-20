#!/usr/bin/env python3
import argparse
import hashlib
import json
from pathlib import Path

from report_api_usage import ROOT, baseline_document, scan_repository

DEFAULT_BASELINE = ROOT / "constraints" / "API_USAGE_BASELINE.json"
DEFAULT_LEGACY = ROOT / "constraints" / "API_USAGE_LEGACY.json"


def compact_entries(entries):
    return [
        {
            "key": item["key"],
            "files": list(item["files"]),
        }
        for item in entries
    ]


def compact_baseline(files, entries):
    generated = baseline_document(files, entries)
    compact = compact_entries(entries)
    digest_input = json.dumps(
        compact,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return {
        "schema": 1,
        "policy": "generated_api_usage",
        "scanner": "scripts/report_api_usage.py",
        "coverage": generated["coverage"],
        "filesScanned": files,
        "usageCount": len(compact),
        "entries": compact,
        "usageDigest": "sha256:" + hashlib.sha256(digest_input).hexdigest(),
    }


def legacy_document(baseline):
    return {
        "schema": 1,
        "policy": "initial_usage_only",
        "description": "第二阶段启用时已经存在的高置信度 API 使用。不得把后续新增 API 写入本文件。",
        "sourceUsageDigest": baseline["usageDigest"],
        "entries": baseline["entries"],
    }


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main():
    parser = argparse.ArgumentParser(description="Generate compact API usage baseline files")
    parser.add_argument("--baseline", default=str(DEFAULT_BASELINE))
    parser.add_argument("--legacy", default=str(DEFAULT_LEGACY))
    parser.add_argument("--refresh-legacy", action="store_true")
    args = parser.parse_args()

    baseline_path = Path(args.baseline)
    legacy_path = Path(args.legacy)
    if not baseline_path.is_absolute():
        baseline_path = ROOT / baseline_path
    if not legacy_path.is_absolute():
        legacy_path = ROOT / legacy_path

    files, entries = scan_repository(ROOT)
    baseline = compact_baseline(files, entries)
    write_json(baseline_path, baseline)

    if args.refresh_legacy:
        write_json(legacy_path, legacy_document(baseline))
    elif not legacy_path.exists():
        raise SystemExit(
            "legacy API usage file missing; use --refresh-legacy only for the initial baseline"
        )

    print(
        "OK compact-api-baseline usages=%d files=%d digest=%s legacy_refreshed=%s"
        % (
            baseline["usageCount"],
            len(files),
            baseline["usageDigest"],
            "yes" if args.refresh_legacy else "no",
        )
    )


if __name__ == "__main__":
    main()
