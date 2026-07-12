#!/usr/bin/env python3
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TH10 = ROOT / "code" / "th_10_shell.js"
TH11 = ROOT / "code" / "th_11_action.js"
TH16 = ROOT / "code" / "th_16_entry.js"
BOUNDARIES = ROOT / "MODULE_BOUNDARIES.json"
PROTECTED_REPORTER = ROOT / "scripts" / "report_protected_wrapper_chains.py"
DEAD_REPORTER = ROOT / "scripts" / "report_dead_module_symbols.py"
VERIFY_WORKFLOW = ROOT / ".github" / "workflows" / "verify.yml"
ANALYSIS = ROOT / "SHELL_DIAGNOSTIC_WRAPPER_ANALYSIS.md"
VERIFIER = ROOT / "scripts" / "verify_shell_diagnostic_wrappers.py"
SELF = ROOT / "scripts" / "cleanup_shell_diagnostic_wrappers.py"
TEMP_WORKFLOW = ROOT / ".github" / "workflows" / "apply-shell-diagnostic-wrapper-cleanup.yml"


def fail(message):
    raise SystemExit("FAIL: " + message)


def replace_once(text, old, new, label):
    if text.count(old) != 1:
        fail("expected one %s block, got %d" % (label, text.count(old)))
    return text.replace(old, new, 1)


def run(*args):
    print("+", " ".join(args))
    subprocess.run(args, cwd=str(ROOT), check=True)


def update_th10():
    text = TH10.read_text(encoding="utf-8")
    text = replace_once(text, "// @version 1.0.3", "// @version 1.0.4", "th10 version")
    old = "  return ret;\n};"
    new = '''  try {
    var via = ret && ret.via ? String(ret.via) : "";
    safeLog(this.L, (ret && ret.ok) ? 'i' : 'w', "shell diag result ok=" + String(!!(ret && ret.ok)) + " via=" + via + " root=" + String(!!needRoot) + " cmd_b64_len=" + String(cmdB64 ? String(cmdB64).length : 0) + " ret=" + JSON.stringify(ret || {}));
    if (via.indexOf("BroadcastBridge") >= 0) {
      safeLog(this.L, 'i', "shell diag bridge sent note=BroadcastBridge sent only means broadcast was sent; it does not prove ShortX task executed successfully");
    }
  } catch(eAfter) {
    try { safeLog(this.L, 'w', "shell diag after exec fail err=" + String(eAfter)); } catch(eLog1) {}
  }

  return ret;
};'''
    text = replace_once(text, old, new, "th10 final return")
    if text.index('"shell diag result ok="') >= text.index("return ret;"):
        fail("th10 diagnostic must precede return ret")
    TH10.write_text(text, encoding="utf-8")


def update_th11():
    text = TH11.read_text(encoding="utf-8")
    header = "// @version 1.0.5\n// =======================【WM 线程：按钮动作执行】======================\n"
    helpers = '''// @version 1.0.6
// =======================【Shell 按钮诊断】=======================
FloatBallAppWM.prototype.getShellDiagPreviewText = function(cmdPlain, cmdB64) {
  var p = "";
  try { p = cmdPlain ? String(cmdPlain) : ""; } catch(eP0) { p = ""; }
  if ((!p || p.length <= 0) && cmdB64 && typeof decodeBase64Utf8 === "function") {
    try { p = String(decodeBase64Utf8(String(cmdB64)) || ""); } catch(eP1) { p = ""; }
  }
  if (!p || p.length <= 0) p = "[cmd_b64 only]";
  try { p = p.replace(/[\\r\\n\\t]+/g, " ").replace(/^\\s+|\\s+$/g, ""); } catch(eP2) {}
  if (p.length > 220) p = p.substring(0, 220) + "...";
  return p;
};

FloatBallAppWM.prototype.logShellButtonDiagnostics = function(btn, idx) {
  try {
    var title = "";
    try { title = String(btn && btn.title ? btn.title : ""); } catch(eTitle) { title = ""; }
    var cmdB64 = "";
    var cmdPlain = "";
    try { cmdB64 = (btn && btn.cmd_b64 !== undefined && btn.cmd_b64 !== null) ? String(btn.cmd_b64) : ""; } catch(eB64) { cmdB64 = ""; }
    try { cmdPlain = (btn && btn.cmd !== undefined && btn.cmd !== null) ? String(btn.cmd) : ""; } catch(eCmd) { cmdPlain = ""; }

    var root = true;
    try {
      if (btn && btn.root !== undefined && btn.root !== null) {
        var rs = String(btn.root).replace(/^\\s+|\\s+$/g, "").toLowerCase();
        root = !(rs === "false" || rs === "0" || rs === "no" || rs === "off");
      }
    } catch(eRoot) { root = true; }

    var preview = this.getShellDiagPreviewText ? this.getShellDiagPreviewText(cmdPlain, cmdB64) : String(cmdPlain || "");
    safeLog(this.L, 'i', "shell diag idx=" + String(idx) + " title=" + title + " root=" + String(root) + " cmd_len=" + String(cmdPlain ? cmdPlain.length : 0) + " cmd_b64_len=" + String(cmdB64 ? cmdB64.length : 0) + " preview=" + preview);

    var normalized = preview.replace(/\\s+/g, " ");
    if (normalized.indexOf("am shortx run SHARED-DA-") >= 0) {
      safeLog(this.L, 'i', "shell diag shared-da idx=" + String(idx) + " title=" + title + " note=SHARED-DA is suitable for ToolHub invocation");
    } else if (normalized.indexOf("am shortx run DA-") >= 0) {
      safeLog(this.L, 'w', "shell diag private-da idx=" + String(idx) + " title=" + title + " note=private DA may not exist or may fail outside original ShortX rule");
    }
  } catch(eDiag) {
    try { safeLog(this.L, 'w', "shell diag fail idx=" + String(idx) + " err=" + String(eDiag)); } catch(eLog) {}
  }
};

// =======================【WM 线程：按钮动作执行】======================
'''
    text = replace_once(text, header, helpers, "th11 header")
    marker = "FloatBallAppWM.prototype.execButtonAction = function(btn, idx) {\n"
    pre_diag = '''FloatBallAppWM.prototype.execButtonAction = function(btn, idx) {
  try {
    if (btn && String(btn.type || "") === "shell" && this.logShellButtonDiagnostics) this.logShellButtonDiagnostics(btn, idx);
  } catch(eBefore) {
    try { safeLog(this.L, 'w', "shell diag before exec fail idx=" + String(idx) + " err=" + String(eBefore)); } catch(eLog0) {}
  }

'''
    text = replace_once(text, marker, pre_diag, "th11 execButtonAction start")
    if text.index("this.logShellButtonDiagnostics(btn, idx)") >= text.index('this.guardClick("btn_exec_"'):
        fail("th11 diagnostic must precede guardClick")
    TH11.write_text(text, encoding="utf-8")


def update_th16():
    text = TH16.read_text(encoding="utf-8")
    text = replace_once(text, "// @version 1.0.8", "// @version 1.0.9", "th16 version")
    start_marker = "// =======================【诊断补丁：Shell 按钮执行日志增强】======================="
    end_marker = "// =======================【热修：按钮编辑保存返回保留临时按钮】======================="
    if text.count(start_marker) != 1 or text.count(end_marker) != 1:
        fail("th16 diagnostic block markers mismatch")
    start = text.index(start_marker)
    end = text.index(end_marker)
    if start >= end:
        fail("th16 diagnostic block order mismatch")
    text = text[:start] + text[end:]
    for forbidden in (
        "oldExecButtonAction",
        "oldExecShellSmart",
        "__toolHubShellActionDiagPatchInstalled",
        "proto.getShellDiagPreviewText",
        "proto.logShellButtonDiagnostics",
    ):
        if forbidden in text:
            fail("th16 diagnostic marker remains: " + forbidden)
    TH16.write_text(text, encoding="utf-8")


def update_boundaries():
    data = json.loads(BOUNDARIES.read_text(encoding="utf-8"))
    records = list(data.get("duplicateDefinitions") or [])
    target = {"execButtonAction", "execShellSmart"}
    found = {str(record.get("method") or "") for record in records if record.get("method") in target}
    if found != target:
        fail("diagnostic boundary records mismatch: %r" % sorted(found))
    data["duplicateDefinitions"] = [
        record for record in records if str(record.get("method") or "") not in target
    ]
    direct = data.setdefault("directOwners", {})
    direct["execButtonAction"] = "th_11_action.js"
    direct["execShellSmart"] = "th_10_shell.js"
    BOUNDARIES.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def update_protected_reporter():
    text = PROTECTED_REPORTER.read_text(encoding="utf-8")
    for method in ("execButtonAction", "execShellSmart"):
        pattern = re.compile(
            r'    "' + re.escape(method) + r'": \(\n.*?\n    \),\n',
            re.S,
        )
        text, count = pattern.subn("", text, count=1)
        if count != 1:
            fail("classification block missing: " + method)
    old_review = '    lines.append("- 下一轮专项审查：%s。" % "、".join("`%s`" % row["method"] for row in review))'
    new_review = '''    review_text = "、".join("`%s`" % row["method"] for row in review) if review else "无"
    lines.append("- 下一轮专项审查：%s。" % review_text)'''
    text = replace_once(text, old_review, new_review, "protected review summary")
    old_note = '    lines.append("- 本报告不自动修改运行时代码；诊断包装也只能通过“并回基础实现”收敛，不能直接删除行为。")'
    new_note = '    lines.append("- 本报告不自动修改运行时代码；剩余包装均承担明确功能或生命周期职责。")'
    text = replace_once(text, old_note, new_note, "protected report note")
    old_order = '''    lines.append("1. 联合审查 `execButtonAction` 与 `execShellSmart` 的诊断逻辑、调用范围和返回值透传。")
    lines.append("2. 只有在诊断代码可以原样并回 `th_11_action.js` / `th_10_shell.js` 时，才删除 `th_16_entry.js` 包装。")
    lines.append("3. 设置、指针/OCR、ToolApp 和 deferred wrapper 暂不进入删除流程。")'''
    new_order = '''    lines.append("1. `execButtonAction` 与 `execShellSmart` 诊断逻辑已并回基础实现。")
    lines.append("2. 当前剩余 13 条包装链全部继续保留，不进入批量收敛流程。")
    lines.append("3. 仅在出现明确重复、失效包装或回归证据时重新开启专项审查。")'''
    text = replace_once(text, old_order, new_order, "protected next order")
    PROTECTED_REPORTER.write_text(text, encoding="utf-8")


def update_dead_reporter():
    text = DEAD_REPORTER.read_text(encoding="utf-8")
    old = '''    lines.append("1. 后续覆盖候选清理已完成，当前转入受保护包装链独立审查。")
    lines.append("2. 下一组联合审查 `execButtonAction` 与 `execShellSmart`，仅评估将诊断逻辑并回基础实现。")
    lines.append("3. 其余设置、指针/OCR、ToolApp 和延迟加载包装继续保留。")'''
    new = '''    lines.append("1. 后续覆盖候选与 Shell 诊断包装收敛已完成。")
    lines.append("2. 当前剩余 13 条受保护包装链均承担明确功能或生命周期职责。")
    lines.append("3. 后续只在新增重复定义、失效包装或明确回归证据时重新开启专项审查。")'''
    text = replace_once(text, old, new, "dead report recommendations")
    DEAD_REPORTER.write_text(text, encoding="utf-8")


def update_verify_workflow():
    text = VERIFY_WORKFLOW.read_text(encoding="utf-8")
    block = '''      - name: Verify shell diagnostic wrapper analysis
        shell: bash
        run: |
          set -o pipefail
          python3 scripts/verify_shell_diagnostic_wrappers.py --check SHELL_DIAGNOSTIC_WRAPPER_ANALYSIS.md 2>&1 | tee shell-diagnostic-wrapper-analysis-log.txt

      - name: Upload shell diagnostic wrapper analysis
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: shell-diagnostic-wrapper-analysis
          path: |
            SHELL_DIAGNOSTIC_WRAPPER_ANALYSIS.md
            shell-diagnostic-wrapper-analysis-log.txt
          if-no-files-found: error
          retention-days: 7

'''
    text = replace_once(text, block, "", "verify analysis block")
    VERIFY_WORKFLOW.write_text(text, encoding="utf-8")


def verify_consolidated_source():
    th10 = TH10.read_text(encoding="utf-8")
    th11 = TH11.read_text(encoding="utf-8")
    th16 = TH16.read_text(encoding="utf-8")
    if th10.count("FloatBallAppWM.prototype.execShellSmart = function") != 1:
        fail("execShellSmart single definition missing")
    if th11.count("FloatBallAppWM.prototype.execButtonAction = function") != 1:
        fail("execButtonAction single definition missing")
    if th11.count("FloatBallAppWM.prototype.getShellDiagPreviewText = function") != 1:
        fail("getShellDiagPreviewText single definition missing")
    if th11.count("FloatBallAppWM.prototype.logShellButtonDiagnostics = function") != 1:
        fail("logShellButtonDiagnostics single definition missing")
    if "proto.execShellSmart = function" in th16 or "proto.execButtonAction = function" in th16:
        fail("th16 diagnostic wrapper remains")
    if th11.index("this.logShellButtonDiagnostics(btn, idx)") >= th11.index('this.guardClick("btn_exec_"'):
        fail("button diagnostic order changed")
    if th10.index('"shell diag result ok="') >= th10.index("return ret;"):
        fail("shell result diagnostic order changed")


def main():
    update_th10()
    update_th11()
    update_th16()
    update_boundaries()
    update_protected_reporter()
    update_dead_reporter()
    update_verify_workflow()

    for path in (ANALYSIS, VERIFIER):
        if not path.exists():
            fail(str(path.relative_to(ROOT)) + " missing")
        path.unlink()

    verify_consolidated_source()
    run("python3", "scripts/report_protected_wrapper_chains.py", "--write", "PROTECTED_WRAPPER_AUDIT.md")
    run("python3", "scripts/report_dead_module_symbols.py", "--write", "DEAD_CODE_AUDIT.md")
    run("python3", "scripts/verify_module_boundaries.py")
    run("python3", "scripts/report_protected_wrapper_chains.py", "--check", "PROTECTED_WRAPPER_AUDIT.md")
    run("python3", "scripts/report_dead_module_symbols.py", "--check", "DEAD_CODE_AUDIT.md")
    run("python3", "scripts/report_th15_extra_symbols.py", "--check", "TH15_EXTRA_AUDIT.md")
    run("python3", "scripts/report_th09_animation_symbols.py", "--check", "TH09_ANIMATION_AUDIT.md")
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
