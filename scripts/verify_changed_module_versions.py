#!/usr/bin/env python3
"""一次性执行指针颜色设置清理，并发布不含临时脚本的正式修复分支。"""

import subprocess
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AGENT_BRANCH = "agent/pointer-color-settings-cleanup-20260716"
CLEAN_BRANCH = "fix/pointer-color-settings-cleanup-20260716"
WORKFLOW_PATH = ".github/workflows/apply-pointer-color-settings-cleanup.yml"


def run(args, check=True, capture=False):
    proc = subprocess.run(
        list(args),
        cwd=str(ROOT),
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )
    if check and proc.returncode != 0:
        detail = ""
        if capture:
            detail = (proc.stderr or proc.stdout or "").strip()
        raise SystemExit("runner command failed: %s %s" % (" ".join(args), detail))
    return proc


run(["git", "fetch", "origin", "main", AGENT_BRANCH])
yaml_text = run(
    ["git", "show", "origin/%s:%s" % (AGENT_BRANCH, WORKFLOW_PATH)],
    capture=True,
).stdout
start_marker = "          python3 - <<'PY'\n"
end_marker = "\n          PY\n"
start = yaml_text.find(start_marker)
if start < 0:
    raise SystemExit("cleanup python block start not found")
start += len(start_marker)
end = yaml_text.find(end_marker, start)
if end < 0:
    raise SystemExit("cleanup python block end not found")
cleanup_code = textwrap.dedent(yaml_text[start:end])
exec(compile(cleanup_code, "pointer-color-settings-cleanup", "exec"), {"__name__": "__main__"})

for command in (
    [sys.executable, "scripts/verify_pointer_regressions.py"],
    [sys.executable, "scripts/verify_schema_validator.py"],
    [sys.executable, "scripts/verify_settings_color_scheme.py"],
    [sys.executable, "scripts/verify_coloros_rhino_color_safety.py"],
    [sys.executable, "scripts/verify_full_rhino_color_safety.py"],
    ["git", "diff", "--check"],
):
    run(command)

patch_path = Path("/tmp/pointer-color-settings-cleanup.patch")
with patch_path.open("w", encoding="utf-8") as handle:
    proc = subprocess.run(
        ["git", "diff", "--binary"],
        cwd=str(ROOT),
        stdout=handle,
        text=True,
    )
if proc.returncode != 0 or patch_path.stat().st_size <= 0:
    raise SystemExit("business patch is empty or failed")

run(["git", "fetch", "origin", "main"])
run(["git", "switch", "-C", CLEAN_BRANCH, "origin/main"])
run(["git", "apply", "--index", str(patch_path)])
run(["git", "config", "user.name", "github-actions[bot]"])
run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"])
run(["git", "commit", "-m", "清理并重组指针颜色设置"])
run(["git", "push", "--force", "origin", "HEAD:%s" % CLEAN_BRANCH])
print("Published clean branch: " + CLEAN_BRANCH)
