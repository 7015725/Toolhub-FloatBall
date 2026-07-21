#!/usr/bin/env python3
"""Compare Stable/main and Beta/beta repository content.

Commit history is allowed to diverge. Repository content must remain identical except
for explicitly branch-owned release artifacts.
"""

import argparse
import json
import pathlib
import subprocess
import sys


ALLOWED_EXACT = {
    "manifest.json",
    "manifest.sig",
    "update_history.json",
}
ALLOWED_PREFIXES = (
    "updates/records/",
)


def is_allowed_difference(path):
    value = str(path or "").replace("\\", "/")
    if value in ALLOWED_EXACT:
        return True
    for prefix in ALLOWED_PREFIXES:
        if value.startswith(prefix):
            return True
    return False


def run_git(args):
    proc = subprocess.run(
        ["git"] + list(args),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            "git {} failed: {}".format(
                " ".join(args), proc.stderr.decode("utf-8", "replace").strip()
            )
        )
    return proc.stdout


def read_tree(ref_name):
    raw = run_git(["ls-tree", "-r", "-z", str(ref_name)])
    result = {}
    for record in raw.split(b"\0"):
        if not record:
            continue
        meta, path_raw = record.split(b"\t", 1)
        parts = meta.split()
        if len(parts) < 3:
            raise RuntimeError("unexpected git ls-tree record: {!r}".format(record))
        result[path_raw.decode("utf-8", "surrogateescape")] = parts[2].decode("ascii")
    return result


def analyze_maps(base_map, head_map):
    compared = []
    allowed = []
    drift = []
    for path in sorted(set(base_map) | set(head_map)):
        base_sha = base_map.get(path)
        head_sha = head_map.get(path)
        if base_sha == head_sha:
            continue
        item = {
            "path": path,
            "base": base_sha or "",
            "head": head_sha or "",
            "status": (
                "added"
                if base_sha is None
                else ("removed" if head_sha is None else "modified")
            ),
        }
        if is_allowed_difference(path):
            allowed.append(item)
        else:
            drift.append(item)
        compared.append(item)
    return {
        "differenceCount": len(compared),
        "allowedDifferenceCount": len(allowed),
        "driftCount": len(drift),
        "allowedDifferences": allowed,
        "drift": drift,
    }


def short_sha(value):
    return str(value or "-")[:12]


def render_markdown(result):
    lines = [
        "# Stable / Beta 分支内容一致性报告",
        "",
        "- Stable 引用：`{}`".format(result["baseRef"]),
        "- Beta 引用：`{}`".format(result["headRef"]),
        "- 文件总数：{}".format(result["fileCount"]),
        "- 全部内容差异：{}".format(result["differenceCount"]),
        "- 允许的发布差异：{}".format(result["allowedDifferenceCount"]),
        "- 非预期漂移：{}".format(result["driftCount"]),
        "",
    ]
    if result["drift"]:
        lines.extend([
            "## 非预期漂移",
            "",
            "| 状态 | 文件 | Stable | Beta |",
            "|---|---|---|---|",
        ])
        for item in result["drift"]:
            lines.append(
                "| {} | `{}` | `{}` | `{}` |".format(
                    item["status"],
                    item["path"],
                    short_sha(item["base"]),
                    short_sha(item["head"]),
                )
            )
        lines.append("")
    else:
        lines.extend(["## 结论", "", "共享内容一致，无非预期漂移。", ""])

    lines.extend([
        "## 允许差异",
        "",
        "以下内容由各通道独立生成，不要求相同：",
        "",
        "- `manifest.json`",
        "- `manifest.sig`",
        "- `update_history.json`",
        "- `updates/records/**`",
        "",
    ])
    if result["allowedDifferences"]:
        lines.extend([
            "本次检测到的允许差异：",
            "",
            "| 状态 | 文件 |",
            "|---|---|",
        ])
        for item in result["allowedDifferences"]:
            lines.append("| {} | `{}` |".format(item["status"], item["path"]))
        lines.append("")
    return "\n".join(lines)


def write_text(path_value, content):
    if not path_value:
        return
    path = pathlib.Path(path_value)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def run_self_test():
    base = {
        "ToolHub.js": "a",
        "code/th_01_base.js": "b",
        "manifest.json": "stable-manifest",
        "updates/records/stable.json": "stable-record",
    }
    head = {
        "ToolHub.js": "a",
        "code/th_01_base.js": "changed",
        "manifest.json": "beta-manifest",
        "updates/records/beta.json": "beta-record",
    }
    result = analyze_maps(base, head)
    failures = []
    if result["driftCount"] != 1:
        failures.append("expected one shared drift")
    elif result["drift"][0]["path"] != "code/th_01_base.js":
        failures.append("unexpected drift path")
    if result["allowedDifferenceCount"] != 3:
        failures.append("expected three allowed release differences")
    if not is_allowed_difference("updates/records/20260721-beta.json"):
        failures.append("release record prefix not allowed")
    if is_allowed_difference("code/th_14_panels.js"):
        failures.append("runtime module must not be allowed")
    if failures:
        print("Channel branch parity self-test FAILED:")
        for item in failures:
            print(" - " + item)
        return 1
    print("Channel branch parity self-test OK")
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-ref", default="origin/main")
    parser.add_argument("--head-ref", default="origin/beta")
    parser.add_argument("--output", default="")
    parser.add_argument("--json-output", default="")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        return run_self_test()

    try:
        base_map = read_tree(args.base_ref)
        head_map = read_tree(args.head_ref)
        analysis = analyze_maps(base_map, head_map)
        result = dict(analysis)
        result.update(
            {
                "schemaVersion": 1,
                "baseRef": args.base_ref,
                "headRef": args.head_ref,
                "fileCount": len(set(base_map) | set(head_map)),
                "ok": analysis["driftCount"] == 0,
            }
        )
        markdown = render_markdown(result)
        print(markdown)
        write_text(args.output, markdown + "\n")
        if args.json_output:
            write_text(
                args.json_output,
                json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            )
        return 0 if result["ok"] else 1
    except Exception as exc:
        print("Channel branch parity verification FAILED: " + str(exc))
        return 2


if __name__ == "__main__":
    sys.exit(main())
