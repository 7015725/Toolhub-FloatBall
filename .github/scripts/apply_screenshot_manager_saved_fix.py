#!/usr/bin/env python3
from pathlib import Path
import runpy
import subprocess
import traceback

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
CORE = HERE / "apply_screenshot_manager_saved_fix_core.py"
SYNC = HERE / "sync_pickword_viewer_verifier.py"
DIAG = ROOT / ".github" / "screenshot_manager_fix_error.txt"


def command(args):
    return subprocess.run(args, cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)


ok = False
try:
    runpy.run_path(str(CORE), run_name="__main__")
    runpy.run_path(str(SYNC), run_name="__main__")
    ok = True
except BaseException as exc:
    detail = "type=%s\nerror=%s\n\n%s" % (type(exc).__name__, str(exc), traceback.format_exc())
    DIAG.write_text(detail, encoding="utf-8")
    command(["git", "config", "user.name", "github-actions[bot]"])
    command(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"])
    command(["git", "add", str(DIAG.relative_to(ROOT))])
    committed = command(["git", "commit", "-m", "记录截图管理修复执行异常"])
    if committed.returncode == 0:
        command(["git", "push", "origin", "HEAD:fix/screenshot-manager-saved-records"])
    raise
finally:
    if ok:
        for path in (CORE, SYNC):
            try:
                path.unlink()
            except FileNotFoundError:
                pass

print("OK screenshot-manager-saved-fix wrapper completed")
