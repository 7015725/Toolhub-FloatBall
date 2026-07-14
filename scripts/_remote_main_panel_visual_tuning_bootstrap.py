#!/usr/bin/env python3
from pathlib import Path
import importlib.util
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
TEMP_FILES = (
    "scripts/_remote_visual_patch_core.py",
    "scripts/_remote_visual_patch_docs.py",
    "scripts/_remote_main_panel_visual_tuning_bootstrap.py",
)


def fail(message):
    raise SystemExit("REMOTE BOOTSTRAP FAIL: " + message)


def run(args, check=True):
    proc = subprocess.run(
        list(args),
        cwd=str(ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    if proc.stdout:
        print(proc.stdout.rstrip())
    if check and proc.returncode != 0:
        fail("%s exited %d" % (" ".join(args), proc.returncode))
    return proc


def load_module(rel, name):
    path = ROOT / rel
    spec = importlib.util.spec_from_file_location(name, str(path))
    if spec is None or spec.loader is None:
        fail("cannot load " + rel)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


core = load_module("scripts/_remote_visual_patch_core.py", "_remote_visual_core")
docs = load_module("scripts/_remote_visual_patch_docs.py", "_remote_visual_docs")
core.apply()
docs.apply()

run(["python3", "scripts/report_dead_module_symbols.py", "--write", "DEAD_CODE_AUDIT.md"])
run(["python3", "scripts/report_protected_wrapper_chains.py", "--write", "PROTECTED_WRAPPER_AUDIT.md"])
run(["python3", "scripts/report_th15_extra_symbols.py", "--write", "TH15_EXTRA_AUDIT.md"])
run(["python3", "scripts/report_th09_animation_symbols.py", "--write", "TH09_ANIMATION_AUDIT.md"])
run(["python3", "scripts/report_entry_symbols.py", "--write", "ENTRY_SYMBOL_AUDIT.md"])

trigger = ROOT / "scripts" / "verify_changed_module_versions.py"
base_trigger = run(
    ["git", "show", "origin/main:scripts/verify_changed_module_versions.py"]
).stdout
trigger.write_text(base_trigger, encoding="utf-8", newline="\n")

for rel in TEMP_FILES:
    path = ROOT / rel
    if path.exists():
        path.unlink()

checks = (
    ["python3", ".github/scripts/es5_scan.py"],
    ["python3", "scripts/verify_js_syntax.py"],
    ["python3", "scripts/verify_schema_validator.py"],
    ["python3", "scripts/verify_main_panel_runtime_status.py"],
    ["python3", "scripts/verify_main_panel_drag_sort.py"],
    ["python3", "scripts/verify_main_panel_paging.py"],
    ["python3", "scripts/verify_main_panel_adaptive_layout.py"],
    ["python3", "scripts/verify_main_panel_visual_tuning.py"],
    ["python3", "scripts/verify_main_panel_close_lifecycle.py"],
    ["python3", "scripts/verify_button_editor_direct_save.py"],
    ["python3", "scripts/verify_sqlite_storage.py"],
    ["python3", "scripts/verify_module_boundaries.py"],
    ["python3", "scripts/report_dead_module_symbols.py", "--check", "DEAD_CODE_AUDIT.md"],
    ["python3", "scripts/report_protected_wrapper_chains.py", "--check", "PROTECTED_WRAPPER_AUDIT.md"],
    ["python3", "scripts/report_th15_extra_symbols.py", "--check", "TH15_EXTRA_AUDIT.md"],
    ["python3", "scripts/report_th09_animation_symbols.py", "--check", "TH09_ANIMATION_AUDIT.md"],
    ["python3", "scripts/report_entry_symbols.py", "--check", "ENTRY_SYMBOL_AUDIT.md"],
    ["python3", "scripts/verify_documentation_consistency.py"],
)
for command in checks:
    run(command)

run(["git", "diff", "--check"])
run(["git", "add", "-A"])
print("REMOTE BOOTSTRAP OK: final visual-tuning changes staged")
