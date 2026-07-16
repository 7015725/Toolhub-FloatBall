#!/usr/bin/env python3
"""一次性执行指针颜色设置清理，并把业务改动交给签名工作流提交。"""

import subprocess
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AGENT_BRANCH = "agent/pointer-color-settings-cleanup-20260716"
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


run(["git", "fetch", "origin", AGENT_BRANCH])
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

business_paths = [
    "code/th_01_base.js",
    "code/th_13_panel_ui.js",
    "code/th_14_panels.js",
    "code/th_17_pointer.js",
    "code/th_18_pointer_ocr.js",
    "scripts/verify_legacy_main_panel_cleanup.py",
    "scripts/verify_main_panel_visual_tuning.py",
    "scripts/verify_main_panel_adaptive_layout.py",
    "scripts/verify_panel_layout_settings_cleanup.py",
    "scripts/verify_coloros_rhino_color_safety.py",
    "manifest.json",
]
run(["git", "add"] + business_paths)
print("Pointer color settings cleanup applied and staged for signing workflow commit")
