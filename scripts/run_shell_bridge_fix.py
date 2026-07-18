#!/usr/bin/env python3
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = [ROOT / "scripts" / ("apply_shell_bridge_%02d.part" % i) for i in range(1, 4)]
APPLY = ROOT / "scripts" / "apply_th22_shell_bridge_fix.py"
VERIFIER = ROOT / "scripts" / "verify_changed_module_versions.py"
EXPORT_WORKFLOW = ROOT / ".github" / "workflows" / "export-main-shell-bridge.yml"


def run(args):
    proc = subprocess.run(args, cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if proc.returncode != 0:
        raise SystemExit("command failed: %s\n%s" % (" ".join(args), str(proc.stdout or "")))
    return proc


def main():
    chunks = []
    for part in PARTS:
        if not part.exists():
            raise SystemExit("missing Shell bridge apply part: " + part.name)
        chunks.append(part.read_text(encoding="utf-8"))
    source = "".join(chunks)
    if "def update_th22():" not in source or "update_tests()" not in source:
        raise SystemExit("invalid Shell bridge apply source")
    APPLY.write_text(source, encoding="utf-8")
    run([sys.executable, "-m", "py_compile", str(APPLY)])
    run([sys.executable, str(APPLY)])
    run(["git", "checkout", "origin/main", "--", str(VERIFIER.relative_to(ROOT))])

    for path in PARTS + [APPLY, Path(__file__), EXPORT_WORKFLOW]:
        try:
            if path.exists():
                path.unlink()
        except OSError as exc:
            raise SystemExit("temporary file cleanup failed: %s: %s" % (path, exc))

    run(["git", "config", "user.name", "github-actions[bot]"])
    run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"])
    run(["git", "add", "-A"])
    run(["git", "commit", "-m", "修复 system_server 公共截图改用 ShortX Shell 桥执行"])
    print("formal ShortX Shell bridge fix committed")


if __name__ == "__main__":
    main()
