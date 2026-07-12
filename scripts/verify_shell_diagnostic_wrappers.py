#!/usr/bin/env python3
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "ToolHub.js"
CODE_DIR = ROOT / "code"
BOUNDARIES = ROOT / "MODULE_BOUNDARIES.json"
TH10 = CODE_DIR / "th_10_shell.js"
TH11 = CODE_DIR / "th_11_action.js"
TH16 = CODE_DIR / "th_16_entry.js"
DEFAULT_REPORT = ROOT / "SHELL_DIAGNOSTIC_WRAPPER_ANALYSIS.md"
MODULE_RE = re.compile(r"['\"]([^'\"]+\.js)['\"]")


def fail(message):
    print("FAIL:", message)
    raise SystemExit(1)


def read(path):
    if not path.exists():
        fail(str(path.relative_to(ROOT)) + " missing")
    return path.read_text(encoding="utf-8")


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


def parse_modules(entry):
    match = re.search(r"var\s+modules\s*=\s*\[(.*?)\]\s*;", entry, re.S)
    if not match:
        fail("ToolHub.js modules list not found")
    return MODULE_RE.findall(match.group(1))


def extract_function(text, marker):
    start = text.find(marker)
    if start < 0:
        fail("function marker missing: " + marker)
    brace = text.find("{", start)
    if brace < 0:
        fail("opening brace missing: " + marker)
    masked = mask_comments_and_strings(text)
    depth = 0
    for i in range(brace, len(masked)):
        ch = masked[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start:i + 1]
    fail("closing brace missing: " + marker)


def collect_sources(modules):
    sources = {}
    for name in modules:
        raw = read(CODE_DIR / name)
        sources[name] = {"raw": raw, "masked": mask_comments_and_strings(raw)}
    return sources


def definition_chain(method, modules, sources):
    pattern = re.compile(
        r"(?:FloatBallAppWM\.prototype|proto)\." + re.escape(method) +
        r"\s*=\s*function\b"
    )
    chain = []
    for name in modules:
        chain.extend([name] * len(pattern.findall(sources[name]["masked"])))
    return chain


def count_method_calls(method, sources):
    pattern = re.compile(r"\.\s*" + re.escape(method) + r"\s*\(")
    return {
        name: len(pattern.findall(item["masked"]))
        for name, item in sources.items()
        if pattern.search(item["masked"])
    }


def verify():
    entry = read(ENTRY)
    modules = parse_modules(entry)
    expected_order = ["th_10_shell.js", "th_11_action.js", "th_16_entry.js"]
    for name in expected_order:
        if name not in modules:
            fail(name + " missing from ToolHub.js")
    if not (modules.index(expected_order[0]) < modules.index(expected_order[1]) < modules.index(expected_order[2])):
        fail("shell/action/entry module order mismatch")

    sources = collect_sources(modules)
    code_instances = [
        name for name, item in sources.items()
        if re.search(r"\bnew\s+FloatBallAppWM\s*\(", item["masked"])
    ]
    if code_instances:
        fail("FloatBallAppWM instance created inside code modules: %r" % code_instances)
    entry_instances = len(re.findall(r"\bnew\s+FloatBallAppWM\s*\(", mask_comments_and_strings(entry)))
    if entry_instances < 1:
        fail("ToolHub.js instance creation signal missing")

    expected_chains = {
        "execShellSmart": ["th_10_shell.js", "th_16_entry.js"],
        "execButtonAction": ["th_11_action.js", "th_16_entry.js"],
    }
    for method, expected in expected_chains.items():
        actual = definition_chain(method, modules, sources)
        if actual != expected:
            fail("definition chain mismatch for %s: %r" % (method, actual))

    data = json.loads(read(BOUNDARIES))
    for method, expected in expected_chains.items():
        records = [r for r in data.get("duplicateDefinitions", []) if r.get("method") == method]
        if len(records) != 1:
            fail("expected one boundary record for " + method)
        record = records[0]
        if record.get("definitions") != expected:
            fail(method + " boundary definitions mismatch")
        if record.get("effectiveOwner") != "th_16_entry.js":
            fail(method + " effective owner mismatch")
        if record.get("type") != "wrapper":
            fail(method + " boundary type mismatch")

    th10 = read(TH10)
    th11 = read(TH11)
    th16 = read(TH16)
    shell_base = extract_function(
        th10,
        "FloatBallAppWM.prototype.execShellSmart = function(cmdB64, needRoot)",
    )
    button_base = extract_function(
        th11,
        "FloatBallAppWM.prototype.execButtonAction = function(btn, idx)",
    )
    button_wrapper = extract_function(
        th16,
        "proto.execButtonAction = function(btn, idx)",
    )
    shell_wrapper = extract_function(
        th16,
        "proto.execShellSmart = function(cmdB64, needRoot)",
    )

    for marker in (
        "var oldExecButtonAction = proto.execButtonAction",
        "var oldExecShellSmart = proto.execShellSmart",
        "proto.getShellDiagPreviewText = function(cmdPlain, cmdB64)",
        "proto.logShellButtonDiagnostics = function(btn, idx)",
        "proto.__toolHubShellActionDiagPatchInstalled = true",
    ):
        if marker not in th16:
            fail("diagnostic block marker missing: " + marker)

    button_log = "this.logShellButtonDiagnostics(btn, idx)"
    button_call = "return oldExecButtonAction.call(this, btn, idx)"
    if button_log not in button_wrapper or button_call not in button_wrapper:
        fail("button diagnostic wrapper markers missing")
    if button_wrapper.index(button_log) >= button_wrapper.index(button_call):
        fail("button diagnostic must run before old action")

    shell_call = "var r = oldExecShellSmart.call(this, cmdB64, needRoot)"
    shell_log = '"shell diag result ok="'
    shell_return = "return r"
    for marker in (shell_call, shell_log, shell_return):
        if marker not in shell_wrapper:
            fail("shell result wrapper marker missing: " + marker)
    if not (shell_wrapper.index(shell_call) < shell_wrapper.index(shell_log) < shell_wrapper.index(shell_return)):
        fail("shell result wrapper order mismatch")

    if 'if (!this.guardClick("btn_exec_" + String(idx), 380, null)) return;' not in button_base:
        fail("button guardClick marker missing")
    if 'if (t === "shell")' not in button_base or "this.execShellSmart(cmdB64, needRoot)" not in button_base:
        fail("shell button branch marker missing")
    if "return ret" not in shell_base:
        fail("execShellSmart return marker missing")
    if 'ret.note = "broadcast sent only; receiver execution is not confirmed"' not in shell_base:
        fail("shell bridge result contract missing")

    helper_defs = {
        "getShellDiagPreviewText": definition_chain("getShellDiagPreviewText", modules, sources),
        "logShellButtonDiagnostics": definition_chain("logShellButtonDiagnostics", modules, sources),
    }
    if helper_defs["getShellDiagPreviewText"] != ["th_16_entry.js"]:
        fail("getShellDiagPreviewText owner mismatch")
    if helper_defs["logShellButtonDiagnostics"] != ["th_16_entry.js"]:
        fail("logShellButtonDiagnostics owner mismatch")

    helper_refs = {}
    for method in helper_defs:
        helper_refs[method] = count_method_calls(method, sources)
    if helper_refs["getShellDiagPreviewText"] != {"th_16_entry.js": 1}:
        fail("unexpected getShellDiagPreviewText calls: %r" % helper_refs["getShellDiagPreviewText"])
    if helper_refs["logShellButtonDiagnostics"] != {"th_16_entry.js": 1}:
        fail("unexpected logShellButtonDiagnostics calls: %r" % helper_refs["logShellButtonDiagnostics"])

    calls = {
        "execShellSmart": count_method_calls("execShellSmart", sources),
        "execButtonAction": count_method_calls("execButtonAction", sources),
    }

    report = """# Shell 诊断包装链专项分析

## 结论

- `execShellSmart` 与 `execButtonAction` 的 `th_16_entry.js` 包装只增加诊断，不改变参数、核心执行路径或返回对象。
- 两条包装都可通过“诊断逻辑并回基础实现”收敛，不能直接删除诊断行为。
- `execButtonAction` 的诊断当前发生在 `guardClick()` 之前；并回 `th_11_action.js` 后必须保持相同顺序。
- `execShellSmart` 的结果诊断当前发生在旧实现返回之后、向调用者返回之前；并回 `th_10_shell.js` 后必须保持原样返回 `ret`。
- 两个诊断辅助方法仅由本组包装使用，可迁移到 `th_11_action.js`，无需保留 `th_16` 安装标记。
- 静态收敛门槛通过；本阶段不修改运行时代码。

## 定义与加载顺序

```text
th_10_shell.js：execShellSmart 基础广播桥实现
  ↓
th_11_action.js：execButtonAction 基础按钮分派实现
  ↓
th_16_entry.js：Shell 诊断包装
  ↓
FloatBallAppWM 实例创建
```

- `code/*.js` 中实例创建：`0`。
- `ToolHub.js` 实例创建信号：`%d`。
- `execShellSmart` 定义链：`th_10_shell.js → th_16_entry.js`。
- `execButtonAction` 定义链：`th_11_action.js → th_16_entry.js`。

## 当前调用分布

- `execShellSmart`：`%s`。
- `execButtonAction`：`%s`。
- `getShellDiagPreviewText`：仅 `th_16_entry.js` 调用 1 次。
- `logShellButtonDiagnostics`：仅 `th_16_entry.js` 调用 1 次。

## 必须保持的行为

1. Shell 按钮诊断在点击防抖之前执行。
2. 命令预览继续清理换行、制表符并限制为 220 字符。
3. `SHARED-DA-` 与私有 `DA-` 提示级别保持不变。
4. `execShellSmart` 先完成广播发送，再记录 `ok/via/root/cmd_b64_len/ret`。
5. `BroadcastBridge` 只代表广播已发送的提示保持不变。
6. 诊断异常不得阻断按钮执行或 Shell 返回。
7. `execShellSmart` 返回对象身份和字段不变。

## 收敛方案

1. 将 `getShellDiagPreviewText` 与 `logShellButtonDiagnostics` 移到 `th_11_action.js`。
2. 在 `execButtonAction()` 开头、`guardClick()` 之前调用按钮诊断。
3. 将结果诊断移到 `th_10_shell.js` 的最终 `return ret;` 之前。
4. 删除 `th_16_entry.js` 的 Shell 诊断安装 IIFE 和安装标记。
5. 将 `execButtonAction` / `execShellSmart` 登记为基础模块单一所有者。
6. 更新受保护包装链报告、模块边界、manifest 和 RSA 签名。

## 使用方式

```bash
python3 scripts/verify_shell_diagnostic_wrappers.py --write SHELL_DIAGNOSTIC_WRAPPER_ANALYSIS.md
python3 scripts/verify_shell_diagnostic_wrappers.py --check SHELL_DIAGNOSTIC_WRAPPER_ANALYSIS.md
```
""" % (
        entry_instances,
        json.dumps(calls["execShellSmart"], ensure_ascii=False, sort_keys=True),
        json.dumps(calls["execButtonAction"], ensure_ascii=False, sort_keys=True),
    )
    return report


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--write", metavar="PATH")
    group.add_argument("--check", metavar="PATH")
    args = parser.parse_args()
    report = verify()
    target = ROOT / (args.write or args.check)
    if args.write:
        target.write_text(report, encoding="utf-8")
        print("OK wrote %s" % target.relative_to(ROOT))
        return 0
    if not target.exists():
        fail(str(target.relative_to(ROOT)) + " missing")
    if target.read_text(encoding="utf-8") != report:
        fail(str(target.relative_to(ROOT)) + " is stale")
    print("OK shell_diagnostic_wrapper_analysis=%s" % target.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    sys.exit(main())
