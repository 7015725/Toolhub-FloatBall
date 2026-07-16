#!/usr/bin/env python3
"""一次性应用指针颜色设置清理，并把业务改动交给签名工作流提交。"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AGENT_BRANCH = "agent/pointer-color-settings-cleanup-20260716"
WORKFLOW_PATH = ".github/workflows/apply-pointer-color-settings-cleanup.yml"


def run(args, capture=False):
    proc = subprocess.run(
        list(args),
        cwd=str(ROOT),
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )
    if proc.returncode != 0:
        detail = ""
        if capture:
            detail = (proc.stderr or proc.stdout or "").strip()
        raise SystemExit("FAIL cleanup-runner: %s %s" % (" ".join(args), detail))
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
    raise SystemExit("FAIL cleanup-runner: python block start not found")
start += len(start_marker)
end = yaml_text.find(end_marker, start)
if end < 0:
    raise SystemExit("FAIL cleanup-runner: python block end not found")
raw_block = yaml_text[start:end]
cleanup_code = "\n".join(
    line[10:] if line.startswith("          ") else line
    for line in raw_block.splitlines()
) + "\n"

# 原补丁中的旧键引用检查执行得过早；改由本脚本在旧 Schema 残留清理后统一验证。
check_start = cleanup_code.find("# 静态约束：三个旧设置键只允许存在于旧配置清理表。")
check_end = cleanup_code.find("# 更新模块清单；正式 fix PR", check_start)
if check_start >= 0 and check_end > check_start:
    cleanup_code = cleanup_code[:check_start] + cleanup_code[check_end:]

exec(compile(cleanup_code, "pointer-color-settings-cleanup", "exec"), {"__name__": "__main__"})

# 删除旧 Schema 完整性检查中的三个无效键，只在迁移清理表中保留识别项。
base_path = ROOT / "code" / "th_01_base.js"
removed_keys = (
    "POINTER_COLOR_HOVER_HEX",
    "POINTER_COLOR_HIT_HEX",
    "POINTER_COLOR_CAPTURE_HEX",
)
clean_lines = []
for line in base_path.read_text(encoding="utf-8").splitlines(True):
    drop = False
    for key in removed_keys:
        if key not in line:
            continue
        stripped = line.strip()
        if stripped == key + ": true," or stripped == key + ": true":
            break
        drop = True
        break
    if not drop:
        clean_lines.append(line)
base_path.write_text("".join(clean_lines), encoding="utf-8")

for key in removed_keys:
    hits = []
    for file in (ROOT / "code").glob("*.js"):
        for no, line in enumerate(file.read_text(encoding="utf-8").splitlines(), 1):
            if key in line:
                hits.append("%s:%d" % (file.as_posix(), no))
    if len(hits) != 1 or not hits[0].startswith("code/th_01_base.js:"):
        raise SystemExit("FAIL cleanup-runner: %s references=%s" % (key, ",".join(hits)))

for key in ("POINTER_FRAME_TEXT_HOVER_HEX", "POINTER_FRAME_AREA_HEX"):
    for file in (
        "code/th_01_base.js",
        "code/th_14_panels.js",
        "code/th_17_pointer.js",
        "code/th_18_pointer_ocr.js",
    ):
        if key not in (ROOT / file).read_text(encoding="utf-8"):
            raise SystemExit("FAIL cleanup-runner: missing %s in %s" % (key, file))

for command in (
    [sys.executable, "scripts/verify_pointer_regressions.py"],
    [sys.executable, "scripts/verify_schema_validator.py"],
    [sys.executable, "scripts/verify_settings_color_scheme.py"],
    [sys.executable, "scripts/verify_coloros_rhino_color_safety.py"],
    [sys.executable, "scripts/verify_rhino_color_api_safety.py"],
    [sys.executable, "scripts/verify_js_syntax.py"],
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
print("Pointer color settings cleanup applied and staged")
