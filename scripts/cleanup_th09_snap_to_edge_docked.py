#!/usr/bin/env python3
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TH09 = ROOT / "code" / "th_09_animation.js"
TH19 = ROOT / "code" / "th_19_position_state.js"
TH05 = ROOT / "code" / "th_05_persistence.js"
BOUNDARIES = ROOT / "MODULE_BOUNDARIES.json"
DEAD_REPORTER = ROOT / "scripts" / "report_dead_module_symbols.py"
TH09_REPORTER = ROOT / "scripts" / "report_th09_animation_symbols.py"
VERIFY_WORKFLOW = ROOT / ".github" / "workflows" / "verify.yml"
ANALYSIS = ROOT / "TH09_SNAP_TO_EDGE_DOCKED_ANALYSIS.md"
VERIFIER = ROOT / "scripts" / "verify_th09_snap_to_edge_docked.py"
SELF = ROOT / "scripts" / "cleanup_th09_snap_to_edge_docked.py"
TEMP_WORKFLOW = ROOT / ".github" / "workflows" / "apply-th09-snap-to-edge-docked-cleanup.yml"


def fail(message):
    raise SystemExit("FAIL: " + message)


def mask_comments_and_strings(text):
    out = list(text)
    i = 0
    state = "code"
    quote = ""
    escaped = False
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if state == "code":
            if ch == "/" and nxt == "/":
                out[i] = out[i + 1] = " "
                i += 2
                state = "line"
                continue
            if ch == "/" and nxt == "*":
                out[i] = out[i + 1] = " "
                i += 2
                state = "block"
                continue
            if ch in ("'", '"', "`"):
                out[i] = " "
                quote = ch
                escaped = False
                state = "string"
                i += 1
                continue
            i += 1
            continue
        if state == "line":
            if ch in "\r\n":
                state = "code"
            else:
                out[i] = " "
            i += 1
            continue
        if state == "block":
            if ch == "*" and nxt == "/":
                out[i] = out[i + 1] = " "
                i += 2
                state = "code"
                continue
            if ch not in "\r\n":
                out[i] = " "
            i += 1
            continue
        if state == "string":
            if ch not in "\r\n":
                out[i] = " "
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                state = "code"
            i += 1
    return "".join(out)


def remove_function(text, marker):
    if text.count(marker) != 1:
        fail("expected one function marker: " + marker)
    start = text.index(marker)
    brace = text.find("{", start)
    if brace < 0:
        fail("opening brace missing")
    masked = mask_comments_and_strings(text)
    depth = 0
    end = -1
    for i in range(brace, len(masked)):
        ch = masked[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    if end < 0:
        fail("closing brace missing")
    if text[end:end + 1] == ";":
        end += 1
    while end < len(text) and text[end] in " \t":
        end += 1
    if text[end:end + 2] == "\r\n":
        end += 2
    elif text[end:end + 1] == "\n":
        end += 1
    if text[end:end + 2] == "\r\n":
        end += 2
    elif text[end:end + 1] == "\n":
        end += 1
    return text[:start] + text[end:]


def replace_once(path, old, new):
    text = path.read_text(encoding="utf-8")
    if text.count(old) != 1:
        fail("expected one text block in %s" % path.relative_to(ROOT))
    path.write_text(text.replace(old, new), encoding="utf-8")


def run(*args):
    print("+", " ".join(args))
    subprocess.run(args, cwd=str(ROOT), check=True)


def main():
    text = TH09.read_text(encoding="utf-8")
    if not text.startswith("// @version 1.0.4\n"):
        fail("unexpected th_09 version")
    marker = "FloatBallAppWM.prototype.snapToEdgeDocked = function(withAnim, forceSide)"
    text = remove_function(text, marker)
    text = text.replace("// @version 1.0.4", "// @version 1.0.5", 1)
    if marker in text:
        fail("snapToEdgeDocked old definition remains")
    if "self.snapToEdgeDocked(true);" not in text:
        fail("idle dock dynamic call missing")
    TH09.write_text(text, encoding="utf-8")

    th05 = TH05.read_text(encoding="utf-8")
    if "this.snapToEdgeDocked(false);" not in th05:
        fail("EDGE_VISIBLE_RATIO dynamic call missing")
    th19 = TH19.read_text(encoding="utf-8")
    for required in (
        "proto.snapToEdgeDocked = function(withAnim)",
        'return this.applyConfiguredBallPosition(!!withAnim, "snap")',
        'self.applyConfiguredBallPosition(false, "pointer_start")',
        'self.applyConfiguredBallPosition(true, "pointer_end")',
        'self.applyConfiguredBallPosition(true, "gesture_cancel")',
        'this.applyConfiguredBallPosition(false, "screen_reflow:"',
    ):
        if required not in th19:
            fail("final position marker missing: " + required)

    data = json.loads(BOUNDARIES.read_text(encoding="utf-8"))
    records = data.get("duplicateDefinitions") or []
    matched = [r for r in records if r.get("method") == "snapToEdgeDocked"]
    if len(matched) != 1:
        fail("expected one snapToEdgeDocked boundary record")
    data["duplicateDefinitions"] = [r for r in records if r.get("method") != "snapToEdgeDocked"]
    direct = data.setdefault("directOwners", {})
    direct["snapToEdgeDocked"] = "th_19_position_state.js"
    BOUNDARIES.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    replace_once(
        DEAD_REPORTER,
        '''    lines.append("1. `th_09_animation.js` 独立审查与动画布局旧实现清理已完成。")
    lines.append("2. 当前只剩 `snapToEdgeDocked` 覆盖候选，需单独验证闲置吸边、面板、指针和左右侧。")
    lines.append("3. 完成吸边专项验证前，不继续删除 `th_09` 的唯一实现或 Android 生命周期入口。")''',
        '''    lines.append("1. `th_09_animation.js` 的全部后续覆盖候选已完成独立审查与清理。")
    lines.append("2. 当前静态覆盖候选为 0；停止按‘后续覆盖’继续删除运行时实现。")
    lines.append("3. 后续只在新增重复定义或明确回归证据时重新开启专项审查。")''',
    )
    replace_once(
        TH09_REPORTER,
        '''    lines.append("1. 屏幕重排链与 `animateBallLayout` 旧实现清理已完成。")
    lines.append("2. 当前只剩 `snapToEdgeDocked`，需验证闲置吸边、面板状态、指针开始/结束、左右侧和动画开关。")
    lines.append("3. 吸边处理完成前，其余唯一实现和 Android 生命周期入口继续保留。")''',
        '''    lines.append("1. 屏幕重排、动画布局和吸边旧实现清理已全部完成。")
    lines.append("2. 当前后续覆盖候选为 0；不再继续删除 `th_09` 的运行时方法。")
    lines.append("3. 其余唯一实现和 Android 生命周期入口继续保留并由长期 CI 审查。")''',
    )

    workflow = VERIFY_WORKFLOW.read_text(encoding="utf-8")
    block = '''      - name: Verify th_09 snapToEdgeDocked analysis
        shell: bash
        run: |
          set -o pipefail
          python3 scripts/verify_th09_snap_to_edge_docked.py --check TH09_SNAP_TO_EDGE_DOCKED_ANALYSIS.md 2>&1 | tee th09-snap-analysis-log.txt

      - name: Upload th_09 snapToEdgeDocked analysis
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: th09-snap-analysis-report
          path: |
            TH09_SNAP_TO_EDGE_DOCKED_ANALYSIS.md
            th09-snap-analysis-log.txt
          if-no-files-found: error
          retention-days: 7

'''
    if workflow.count(block) != 1:
        fail("verify workflow analysis block missing")
    VERIFY_WORKFLOW.write_text(workflow.replace(block, ""), encoding="utf-8")

    for path in (ANALYSIS, VERIFIER):
        if not path.exists():
            fail(str(path.relative_to(ROOT)) + " missing")
        path.unlink()

    run("python3", "scripts/report_th09_animation_symbols.py", "--write", "TH09_ANIMATION_AUDIT.md")
    run("python3", "scripts/report_dead_module_symbols.py", "--write", "DEAD_CODE_AUDIT.md")
    run("python3", "scripts/verify_module_boundaries.py")
    run("python3", "scripts/report_th09_animation_symbols.py", "--check", "TH09_ANIMATION_AUDIT.md")
    run("python3", "scripts/report_dead_module_symbols.py", "--check", "DEAD_CODE_AUDIT.md")
    run("python3", ".github/scripts/es5_scan.py")
    run("python3", "scripts/verify_js_syntax.py")
    run("python3", "scripts/verify_sqlite_storage.py")
    run("python3", "scripts/verify_ball_position_state.py")
    run("python3", "scripts/verify_toolapp_layout.py")
    run("python3", "scripts/verify_button_editor_layout.py")
    run("python3", "scripts/verify_schema_validator.py")
    run("python3", "-c", "import scripts.verify_pointer_regressions as v; r=v.CheckResult(); p=v.read_text(v.POINTER); o=v.read_text(v.POINTER_OCR); s=v.read_text(v.POSITION); a=v.read_text(v.ANIMATION); n=v.read_text(v.PANELS); e=v.read_text(v.ENTRY); v.verify_issue_85(r,p,o,s,a); v.verify_text_release(r,p,s,n,e); v.verify_pointer_core(r,p,o); print('OK pointer contracts', len(r.passed)) if not r.failed else (_ for _ in ()).throw(SystemExit(str(r.failed)))")
    run("python3", "-m", "compileall", "-q", "scripts", ".github/scripts")
    run("git", "diff", "--check")

    for path in (SELF, TEMP_WORKFLOW):
        if path.exists():
            path.unlink()


if __name__ == "__main__":
    main()
