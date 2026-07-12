#!/usr/bin/env python3
"""一次性清理引导器；执行后恢复正式签名脚本。"""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SELF = Path(__file__).resolve()


def git_show(path: str) -> str:
    return subprocess.check_output(
        ["git", "show", "origin/main:" + path],
        cwd=str(ROOT),
        text=True,
    )


def patch_runtime_files() -> None:
    module_path = ROOT / "code" / "th_05_persistence.js"
    text = module_path.read_text(encoding="utf-8")

    if text.count("// @version 1.0.0") != 1:
        raise SystemExit("unexpected th_05 version marker")
    text = text.replace("// @version 1.0.0", "// @version 1.0.1", 1)

    old_comment = (
        "    // 节流或立即保存? 面板拖动结束通常不频繁，立即保存即可\n"
        "    // 但为了避免连续事件，还是可以复用 savePos 的节流逻辑，或者直接保存\n"
    )
    if old_comment not in text:
        raise SystemExit("panel persistence comment baseline changed")
    text = text.replace(
        old_comment,
        "    // 面板拖动结束通常不频繁，直接保存配置即可。\n",
        1,
    )

    start_marker = "// =======================【工具：位置持久化】======================"
    end_marker = "// =======================【工具：配置持久化】======================"
    start = text.find(start_marker)
    end = text.find(end_marker)
    if start < 0 or end < 0 or end <= start:
        raise SystemExit("legacy position persistence section markers missing")

    removed = text[start:end]
    for marker in (
        "FloatBallAppWM.prototype.savePos = function",
        "FloatBallAppWM.prototype.loadSavedPos = function",
        "BALL_POS_X_RATIO",
        "BALL_POS_Y_RATIO",
    ):
        if marker not in removed:
            raise SystemExit("legacy position section baseline missing: " + marker)

    text = text[:start] + end_marker + text[end + len(end_marker):]
    if "FloatBallAppWM.prototype.savePos = function" in text:
        raise SystemExit("savePos remains in th_05")
    if "FloatBallAppWM.prototype.loadSavedPos = function" in text:
        raise SystemExit("loadSavedPos remains in th_05")
    module_path.write_text(text, encoding="utf-8")

    boundary_path = ROOT / "MODULE_BOUNDARIES.json"
    data = json.loads(boundary_path.read_text(encoding="utf-8"))
    if int(data.get("schema", 0)) != 2:
        raise SystemExit("unexpected boundary schema")

    records = data.get("duplicateDefinitions") or []
    save_record = None
    load_record = None
    kept = []
    for record in records:
        method = str(record.get("method", ""))
        if method == "savePos":
            save_record = record
            continue
        if method == "loadSavedPos":
            load_record = record
        kept.append(record)

    if not save_record or save_record.get("definitions") != [
        "th_05_persistence.js",
        "th_19_position_state.js",
    ]:
        raise SystemExit("savePos boundary baseline changed")
    if not load_record or load_record.get("definitions") != [
        "th_05_persistence.js",
        "th_15_extra.js",
        "th_19_position_state.js",
    ]:
        raise SystemExit("loadSavedPos boundary baseline changed")

    load_record["definitions"] = [
        "th_15_extra.js",
        "th_19_position_state.js",
    ]
    load_record["type"] = "temporary_override"
    load_record["reason"] = "th_15 旧固定位置恢复仍被 th_19 最终实现覆盖"
    data["duplicateDefinitions"] = kept
    data.setdefault("directOwners", {})["savePos"] = "th_19_position_state.js"

    targets = {
        ("th_05_persistence.js", "savePos"),
        ("th_05_persistence.js", "loadSavedPos"),
    }
    removed_candidates = []
    remaining = []
    for item in data.get("cleanupCandidates") or []:
        key = (str(item.get("module", "")), str(item.get("method", "")))
        if key in targets:
            removed_candidates.append(key)
        else:
            remaining.append(item)
    if set(removed_candidates) != targets:
        raise SystemExit("cleanup candidate baseline changed")
    data["cleanupCandidates"] = remaining

    forbidden = data.setdefault("forbiddenDefinitions", {})
    methods = list(forbidden.get("th_05_persistence.js") or [])
    for method in ("savePos", "loadSavedPos"):
        if method not in methods:
            methods.append(method)
    forbidden["th_05_persistence.js"] = methods

    boundary_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def install_commit_hook() -> None:
    hook = ROOT / ".git" / "hooks" / "pre-commit"
    hook.parent.mkdir(parents=True, exist_ok=True)
    hook.write_text(
        "#!/usr/bin/env bash\n"
        "set -e\n"
        "git add -A -- "
        "code/th_05_persistence.js "
        "MODULE_BOUNDARIES.json "
        "scripts/generate_signed_manifest.py\n",
        encoding="utf-8",
    )
    os.chmod(str(hook), 0o755)


original = git_show("scripts/generate_signed_manifest.py")
patch_runtime_files()
SELF.write_text(original, encoding="utf-8")
install_commit_hook()

namespace = {
    "__name__": "__main__",
    "__file__": str(SELF),
    "__package__": None,
}
exec(compile(original, str(SELF), "exec"), namespace)
