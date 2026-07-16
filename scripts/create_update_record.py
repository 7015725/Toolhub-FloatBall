#!/usr/bin/env python3
"""Create one structured ToolHub update record source file."""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECORDS_DIR = ROOT / "updates" / "records"
ALLOWED_TYPES = ("feature", "fix", "optimize", "security")


def slugify(value):
    text = re.sub(r"[^0-9A-Za-z\u4e00-\u9fff]+", "-", str(value or "").strip())
    text = re.sub(r"-+", "-", text).strip("-")
    return text[:80] or "toolhub-update"


def write_record(record_id, record_type, title, details):
    if record_type not in ALLOWED_TYPES:
        raise SystemExit("invalid update type: %s" % record_type)
    clean_title = str(title or "").strip()
    clean_details = [str(item).strip() for item in details if str(item).strip()]
    if not clean_title:
        raise SystemExit("title is required")
    if not clean_details:
        raise SystemExit("at least one detail is required")
    RECORDS_DIR.mkdir(parents=True, exist_ok=True)
    path = RECORDS_DIR / (slugify(record_id or clean_title) + ".json")
    if path.exists():
        raise SystemExit("record already exists: %s" % path.relative_to(ROOT))
    payload = {
        "schema": 1,
        "id": slugify(record_id or clean_title),
        "type": record_type,
        "title": clean_title,
        "details": clean_details,
        "manifestVersion": 0,
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(path.relative_to(ROOT))
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--id", default="")
    ap.add_argument("--type", choices=ALLOWED_TYPES, default="")
    ap.add_argument("--title", default="")
    ap.add_argument("--detail", action="append", default=[])
    ap.add_argument("--non-interactive", action="store_true")
    args = ap.parse_args()

    record_type = args.type
    title = args.title
    details = list(args.detail)
    if not args.non_interactive:
        if not record_type:
            print("类型: feature=功能, fix=修复, optimize=优化, security=安全")
            record_type = input("更新类型: ").strip()
        if not title:
            title = input("更新标题: ").strip()
        if not details:
            print("逐行输入更新详情，空行结束:")
            while True:
                line = input().strip()
                if not line:
                    break
                details.append(line)
    write_record(args.id, record_type, title, details)


if __name__ == "__main__":
    main()
