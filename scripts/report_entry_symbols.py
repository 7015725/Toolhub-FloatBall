#!/usr/bin/env python3
"""审计 ToolHub.js 普通函数与顶层变量的静态引用。

该脚本只生成证据，不自动删除代码。它同时扫描 ToolHub.js 与 code/*.js，
并把跨模块引用、动态属性引用、常量包装和零引用候选写入稳定 Markdown 报告。
"""

from __future__ import print_function

import argparse
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY_PATH = ROOT / "ToolHub.js"
CODE_DIR = ROOT / "code"
DEFAULT_REPORT = ROOT / "ENTRY_SYMBOL_AUDIT.md"

IDENT = r"[A-Za-z_$][A-Za-z0-9_$]*"
FUNC_RE = re.compile(r"(?m)^[ \t]*function[ \t]+(" + IDENT + r")[ \t]*\(")
TOP_VAR_RE = re.compile(r"(?m)^var[ \t]+(" + IDENT + r")\b")

# 这些名字是 ShortX 最终表达式、模块公开入口或显式生命周期接口。
# 即使静态引用较少，也必须先人工确认后才能调整。
PROTECTED_NAMES = {
    "installPendingModuleUpdates",
    "checkToolHubModuleUpdatesNow",
    "restartToolHubFromSettings",
    "registerToolHubAppInstance",
    "unregisterToolHubAppInstance",
    "writeLog",
    "getToolHubRootDir",
}


def fail(message):
    raise SystemExit("FAIL entry-symbol-audit: " + message)


def read_text(path):
    return path.read_text(encoding="utf-8")


def line_number(text, offset):
    return text.count("\n", 0, offset) + 1


def find_matching_brace(text, open_pos):
    depth = 0
    i = open_pos
    quote = None
    escaped = False
    line_comment = False
    block_comment = False
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if line_comment:
            if ch == "\n":
                line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = None
            i += 1
            continue
        if ch == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue
        if ch in ("'", '"'):
            quote = ch
            i += 1
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def extract_functions(entry):
    out = []
    for match in FUNC_RE.finditer(entry):
        name = match.group(1)
        open_pos = entry.find("{", match.end())
        if open_pos < 0:
            continue
        close_pos = find_matching_brace(entry, open_pos)
        if close_pos < 0:
            continue
        body = entry[open_pos + 1:close_pos]
        out.append({
            "name": name,
            "decl_start": match.start(1),
            "decl_end": match.end(1),
            "start": match.start(),
            "end": close_pos + 1,
            "line": line_number(entry, match.start()),
            "end_line": line_number(entry, close_pos),
            "body": body,
        })
    return out


def blank_definition_name(text, item):
    return text[:item["decl_start"]] + (" " * (item["decl_end"] - item["decl_start"])) + text[item["decl_end"]:]


def count_identifier(text, name):
    return len(re.findall(r"(?<![A-Za-z0-9_$])" + re.escape(name) + r"(?![A-Za-z0-9_$])", text))


def count_calls(text, name):
    return len(re.findall(r"(?<![A-Za-z0-9_$])" + re.escape(name) + r"[ \t\r\n]*\(", text))


def count_dynamic_refs(text, name):
    patterns = [
        r"\.[ \t]*" + re.escape(name) + r"\b",
        r"\[[ \t]*['\"]" + re.escape(name) + r"['\"][ \t]*\]",
        r"['\"]" + re.escape(name) + r"['\"]",
    ]
    return sum(len(re.findall(pattern, text)) for pattern in patterns)


def normalize_body(body):
    body = re.sub(r"/\*.*?\*/", "", body, flags=re.S)
    body = re.sub(r"//[^\n]*", "", body)
    body = re.sub(r"\s+", " ", body).strip()
    return body


def constant_return(body):
    normalized = normalize_body(body)
    match = re.fullmatch(r"return (true|false|null|undefined|-?[0-9]+(?:\.[0-9]+)?|['\"][^'\"]*['\"]);?", normalized)
    return match.group(1) if match else ""


def source_files():
    files = [ENTRY_PATH]
    if CODE_DIR.exists():
        files.extend(sorted(CODE_DIR.glob("*.js")))
    return files


def classify_function(item, entry, module_text):
    name = item["name"]
    entry_without_decl = blank_definition_name(entry, item)
    entry_tokens = count_identifier(entry_without_decl, name)
    module_tokens = count_identifier(module_text, name)
    entry_calls = count_calls(entry_without_decl, name)
    module_calls = count_calls(module_text, name)
    dynamic = count_dynamic_refs(entry_without_decl + "\n" + module_text, name)
    protected = name in PROTECTED_NAMES
    if module_tokens > 0:
        status = "跨模块引用"
    elif entry_tokens > 0:
        status = "入口内使用"
    elif dynamic > 0:
        status = "动态引用待确认"
    elif protected:
        status = "受保护接口"
    else:
        status = "高置信度零引用候选"
    return {
        "name": name,
        "line": item["line"],
        "lines": item["end_line"] - item["line"] + 1,
        "entry_tokens": entry_tokens,
        "module_tokens": module_tokens,
        "entry_calls": entry_calls,
        "module_calls": module_calls,
        "dynamic": dynamic,
        "status": status,
        "constant": constant_return(item["body"]),
        "body_hash": hashlib.sha256(normalize_body(item["body"]).encode("utf-8")).hexdigest()[:12],
    }


def classify_variable(name, entry, module_text):
    matches = list(re.finditer(r"(?m)^var[ \t]+" + re.escape(name) + r"\b", entry))
    if not matches:
        return None
    first = matches[0]
    masked = entry[:first.start()] + entry[first.start():first.end()].replace(name, " " * len(name), 1) + entry[first.end():]
    entry_tokens = count_identifier(masked, name)
    module_tokens = count_identifier(module_text, name)
    dynamic = count_dynamic_refs(masked + "\n" + module_text, name)
    if module_tokens > 0:
        status = "跨模块引用"
    elif entry_tokens > 0:
        status = "入口内使用"
    elif dynamic > 0:
        status = "动态引用待确认"
    elif name in PROTECTED_NAMES:
        status = "受保护接口"
    else:
        status = "高置信度零引用候选"
    return {
        "name": name,
        "line": line_number(entry, first.start()),
        "entry_tokens": entry_tokens,
        "module_tokens": module_tokens,
        "dynamic": dynamic,
        "status": status,
    }


def build_report():
    if not ENTRY_PATH.exists():
        fail("ToolHub.js missing")
    entry = read_text(ENTRY_PATH)
    module_paths = sorted(CODE_DIR.glob("*.js"))
    module_text = "\n".join(read_text(path) for path in module_paths)
    functions = extract_functions(entry)
    function_rows = [classify_function(item, entry, module_text) for item in functions]

    var_names = []
    seen = set()
    for match in TOP_VAR_RE.finditer(entry):
        name = match.group(1)
        if name not in seen:
            seen.add(name)
            var_names.append(name)
    variable_rows = [classify_variable(name, entry, module_text) for name in var_names]
    variable_rows = [row for row in variable_rows if row]

    zero_functions = [row for row in function_rows if row["status"] == "高置信度零引用候选"]
    zero_vars = [row for row in variable_rows if row["status"] == "高置信度零引用候选"]
    cross_functions = [row for row in function_rows if row["status"] == "跨模块引用"]
    dynamic_functions = [row for row in function_rows if row["status"] == "动态引用待确认"]
    constants = [row for row in function_rows if row["constant"]]

    by_hash = {}
    for row in function_rows:
        by_hash.setdefault(row["body_hash"], []).append(row)
    duplicate_groups = [rows for rows in by_hash.values() if len(rows) > 1]

    lines = []
    lines.append("# ToolHub.js 入口符号与冗余审计")
    lines.append("")
    lines.append("## 审查约束")
    lines.append("")
    lines.append("- 本报告只提供静态证据，不自动删除入口代码。")
    lines.append("- 零静态引用仍需排除 Rhino 全局查找、字符串动态调用、ShortX 表达式和设备差异。")
    lines.append("- 跨模块引用扫描范围为 `ToolHub.js` 与 `code/*.js`，不把测试脚本计入运行时引用。")
    lines.append("- 安全验签、事务恢复和启动回退代码即使低频命中，也不能仅按调用次数删除。")
    lines.append("")
    lines.append("## 扫描摘要")
    lines.append("")
    lines.append("- 入口行数：`%d`" % len(entry.splitlines()))
    lines.append("- 子模块文件：`%d`" % len(module_paths))
    lines.append("- 普通函数定义：`%d`" % len(function_rows))
    lines.append("- 顶层变量：`%d`" % len(variable_rows))
    lines.append("- 跨模块引用函数：`%d`" % len(cross_functions))
    lines.append("- 动态引用待确认函数：`%d`" % len(dynamic_functions))
    lines.append("- 高置信度零引用函数候选：`%d`" % len(zero_functions))
    lines.append("- 高置信度零引用变量候选：`%d`" % len(zero_vars))
    lines.append("- 常量返回包装函数：`%d`" % len(constants))
    lines.append("- 完全相同函数体组：`%d`" % len(duplicate_groups))
    lines.append("")

    lines.append("## 高置信度零引用函数候选")
    lines.append("")
    lines.append("|函数|定义行|函数行数|入口标识符引用|子模块引用|动态引用|建议|")
    lines.append("|---|---:|---:|---:|---:|---:|---|")
    for row in zero_functions:
        lines.append("|`%s`|%d|%d|%d|%d|%d|删除前增加定向回归并检查 ShortX 动态调用|" % (
            row["name"], row["line"], row["lines"], row["entry_tokens"], row["module_tokens"], row["dynamic"]))
    if not zero_functions:
        lines.append("|—|—|—|—|—|—|当前无候选|")
    lines.append("")

    lines.append("## 高置信度零引用顶层变量候选")
    lines.append("")
    lines.append("|变量|定义行|入口标识符引用|子模块引用|动态引用|建议|")
    lines.append("|---|---:|---:|---:|---:|---|")
    for row in zero_vars:
        lines.append("|`%s`|%d|%d|%d|%d|确认无 ShortX 外部读取后删除|" % (
            row["name"], row["line"], row["entry_tokens"], row["module_tokens"], row["dynamic"]))
    if not zero_vars:
        lines.append("|—|—|—|—|—|当前无候选|")
    lines.append("")

    lines.append("## 常量返回包装函数")
    lines.append("")
    lines.append("|函数|定义行|返回值|状态|入口引用|子模块引用|")
    lines.append("|---|---:|---|---|---:|---:|")
    for row in constants:
        lines.append("|`%s`|%d|`%s`|%s|%d|%d|" % (
            row["name"], row["line"], row["constant"].replace("|", "\\|"), row["status"], row["entry_tokens"], row["module_tokens"]))
    if not constants:
        lines.append("|—|—|—|—|—|—|")
    lines.append("")

    lines.append("## 完全相同函数体")
    lines.append("")
    lines.append("|函数体摘要|函数|说明|")
    lines.append("|---|---|---|")
    for rows in duplicate_groups:
        lines.append("|`%s`|%s|仅表示归一化函数体完全一致，仍需核对语义和作用域|" % (
            rows[0]["body_hash"], "、".join("`%s`" % row["name"] for row in rows)))
    if not duplicate_groups:
        lines.append("|—|—|没有完全相同函数体|")
    lines.append("")

    lines.append("## 全部入口函数引用矩阵")
    lines.append("")
    lines.append("|函数|定义行|行数|状态|入口调用|入口标识符|子模块调用|子模块标识符|动态引用|")
    lines.append("|---|---:|---:|---|---:|---:|---:|---:|---:|")
    for row in sorted(function_rows, key=lambda item: item["line"]):
        lines.append("|`%s`|%d|%d|%s|%d|%d|%d|%d|%d|" % (
            row["name"], row["line"], row["lines"], row["status"], row["entry_calls"], row["entry_tokens"], row["module_calls"], row["module_tokens"], row["dynamic"]))
    lines.append("")

    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", nargs="?", const=str(DEFAULT_REPORT), help="写入报告")
    parser.add_argument("--check", nargs="?", const=str(DEFAULT_REPORT), help="校验报告未漂移")
    args = parser.parse_args()
    report = build_report()
    if args.write:
        path = Path(args.write)
        if not path.is_absolute():
            path = ROOT / path
        path.write_text(report, encoding="utf-8")
        print("Entry symbol audit written: %s" % path)
        return 0
    if args.check:
        path = Path(args.check)
        if not path.is_absolute():
            path = ROOT / path
        if not path.exists():
            fail("report missing: %s" % path)
        current = path.read_text(encoding="utf-8")
        if current != report:
            fail("report drift: run python3 scripts/report_entry_symbols.py --write ENTRY_SYMBOL_AUDIT.md")
        print("Entry symbol audit verification passed")
        return 0
    sys.stdout.write(report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
