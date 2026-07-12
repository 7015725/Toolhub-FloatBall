#!/usr/bin/env python3
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "ToolHub.js"
CODE_DIR = ROOT / "code"
BOUNDARIES = ROOT / "MODULE_BOUNDARIES.json"
TH15_NAME = "th_15_extra.js"
TH15 = CODE_DIR / TH15_NAME
DEFAULT_REPORT = ROOT / "TH15_EXTRA_AUDIT.md"

MODULE_RE = re.compile(r"['\"]([^'\"]+\.js)['\"]")
DEF_RE = re.compile(
    r"(?:FloatBallAppWM\.prototype|proto)\.([A-Za-z_$][A-Za-z0-9_$]*)"
    r"\s*=\s*function\b"
)
CANDIDATE_TYPES = {
    "temporary_override",
    "temporary_override_chain",
    "wrapper_then_override",
}


def fail(message):
    print("FAIL:", message)
    raise SystemExit(1)


def read(path):
    if not path.exists():
        fail(str(path.relative_to(ROOT)) + " missing")
    return path.read_text(encoding="utf-8")


def parse_modules():
    text = read(ENTRY)
    match = re.search(r"var\s+modules\s*=\s*\[(.*?)\]\s*;", text, re.S)
    if not match:
        fail("ToolHub.js modules list not found")
    modules = MODULE_RE.findall(match.group(1))
    if TH15_NAME not in modules:
        fail(TH15_NAME + " not loaded by ToolHub.js")
    return modules


def mask_comments_and_strings(text):
    out = []
    i = 0
    state = "code"
    quote = ""
    escaped = False
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if state == "code":
            if ch == "/" and nxt == "/":
                out.extend("  ")
                i += 2
                state = "line_comment"
                continue
            if ch == "/" and nxt == "*":
                out.extend("  ")
                i += 2
                state = "block_comment"
                continue
            if ch in ("'", '"', "`"):
                out.append(" ")
                quote = ch
                escaped = False
                state = "string"
                i += 1
                continue
            out.append(ch)
            i += 1
            continue
        if state == "line_comment":
            if ch in "\r\n":
                out.append(ch)
                state = "code"
            else:
                out.append(" ")
            i += 1
            continue
        if state == "block_comment":
            if ch == "*" and nxt == "/":
                out.extend("  ")
                i += 2
                state = "code"
            else:
                out.append("\n" if ch == "\n" else " ")
                i += 1
            continue
        if state == "string":
            out.append("\n" if ch == "\n" else " ")
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                state = "code"
            i += 1
    return "".join(out)


def load_sources(modules):
    sources = {}
    for module in modules:
        path = CODE_DIR / module
        raw = read(path)
        sources[module] = {
            "raw": raw,
            "masked": mask_comments_and_strings(raw),
        }
    return sources


def definition_chain(method, modules, sources):
    pattern = re.compile(
        r"(?:FloatBallAppWM\.prototype|proto)\." + re.escape(method) +
        r"\s*=\s*function\b"
    )
    chain = []
    for module in modules:
        count = len(pattern.findall(sources[module]["masked"]))
        chain.extend([module] * count)
    return chain


def count_signals(method, sources):
    escaped = re.escape(method)
    call_re = re.compile(r"\.\s*" + escaped + r"\s*\(")
    prop_re = re.compile(r"\.\s*" + escaped + r"\b")
    bracket_re = re.compile(r"\[\s*(['\"])" + escaped + r"\1\s*\]")
    string_re = re.compile(r"(['\"])" + escaped + r"\1")
    capture_re = re.compile(
        r"\b(?:var\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*)?"
        r"(?:FloatBallAppWM\.prototype|proto)\." + escaped + r"\b"
    )
    def_re = re.compile(
        r"(?:FloatBallAppWM\.prototype|proto)\." + escaped +
        r"\s*=\s*function\b"
    )

    calls = 0
    props = 0
    brackets = 0
    strings = 0
    captures = 0
    call_files = []
    dynamic_files = []
    for module, source in sources.items():
        masked = source["masked"]
        raw = source["raw"]
        module_calls = len(call_re.findall(masked))
        module_props = len(prop_re.findall(masked))
        module_brackets = len(bracket_re.findall(raw))
        module_strings = len(string_re.findall(raw))
        module_captures = len(capture_re.findall(masked))
        calls += module_calls
        props += module_props
        brackets += module_brackets
        strings += module_strings
        captures += module_captures
        if module_calls:
            call_files.append(module)
        if module_brackets or module_strings:
            dynamic_files.append(module)

    definitions = sum(len(def_re.findall(source["masked"])) for source in sources.values())
    return {
        "calls": calls,
        "property_reads": max(0, props - definitions),
        "dynamic_refs": brackets + strings,
        "captures": captures,
        "call_files": call_files,
        "dynamic_files": dynamic_files,
    }


def load_boundaries():
    data = json.loads(read(BOUNDARIES))
    duplicate = {}
    for record in data.get("duplicateDefinitions") or []:
        method = str(record.get("method", ""))
        if method in duplicate:
            fail("duplicate boundary records for " + method)
        duplicate[method] = record
    return data, duplicate


def classify(method, chain, record):
    if not record:
        return "唯一实现", "保留；由 th_15 单独提供"

    effective = str(record.get("effectiveOwner", ""))
    record_type = str(record.get("type", ""))
    if effective == TH15_NAME:
        if "wrapper" in record_type:
            return "最终包装链", "保留；th_15 是最终包装所有者"
        return "最终实现", "保留；th_15 是最终有效所有者"

    if record_type in CANDIDATE_TYPES:
        if method == "onScreenChangedReflow":
            return (
                "后续覆盖候选",
                "优先单独审查屏幕变化、指针活动和重排调用链后再处理",
            )
        return "后续覆盖候选", "需单独证明加载期与运行期不可达后再处理"

    if chain and chain[0] == TH15_NAME:
        return "前置基础实现", "保留；后续模块通过包装或扩展依赖该实现"
    return "受控覆盖链", "保留；边界文件登记为有意覆盖或包装"


def validate_and_collect(modules, sources, boundaries, duplicate):
    th15_masked = sources[TH15_NAME]["masked"]
    th15_counter = Counter(DEF_RE.findall(th15_masked))
    if not th15_counter:
        fail("no prototype methods found in " + TH15_NAME)

    rows = []
    unregistered = []
    stale_records = []
    for method in sorted(th15_counter):
        chain = definition_chain(method, modules, sources)
        record = duplicate.get(method)
        if len(chain) > 1 and not record:
            unregistered.append(method)
        if record:
            expected = list(record.get("definitions") or [])
            if chain != expected:
                fail("boundary chain mismatch for %s: expected=%r actual=%r" % (
                    method, expected, chain
                ))
            effective = str(record.get("effectiveOwner", ""))
            if not chain or effective != chain[-1]:
                fail("effective owner mismatch for " + method)
        signals = count_signals(method, sources)
        category, action = classify(method, chain, record)
        rows.append({
            "method": method,
            "th15_count": int(th15_counter[method]),
            "chain": chain,
            "effective": chain[-1] if chain else "",
            "boundary_type": str(record.get("type", "")) if record else "",
            "category": category,
            "action": action,
            "signals": signals,
        })

    for method, record in duplicate.items():
        definitions = list(record.get("definitions") or [])
        if TH15_NAME in definitions and method not in th15_counter:
            stale_records.append(method)

    if unregistered:
        fail("unregistered duplicate definitions in th_15: " + ", ".join(unregistered))
    if stale_records:
        fail("stale th_15 boundary records: " + ", ".join(sorted(stale_records)))

    return rows


def format_chain(chain):
    return " → ".join(chain) if chain else "-"


def format_methods(methods):
    if not methods:
        return "无"
    return "、".join("`%s`" % method for method in methods)


def render_report(modules, rows, th15_raw):
    candidates = [row for row in rows if row["category"] == "后续覆盖候选"]
    wrappers = [row for row in rows if row["category"] in ("最终包装链", "前置基础实现", "受控覆盖链")]
    unique = [row for row in rows if row["category"] == "唯一实现"]
    finals = [row for row in rows if row["category"] == "最终实现"]
    duplicate_local = [row for row in rows if row["th15_count"] > 1]

    version_match = re.search(r"^//\s*@version\s+([^\s]+)", th15_raw, re.M)
    version = version_match.group(1) if version_match else "unknown"
    line_count = len(th15_raw.splitlines())
    byte_count = len(th15_raw.encode("utf-8"))

    lines = []
    lines.append("# `th_15_extra.js` 独立审查报告")
    lines.append("")
    lines.append("## 结论")
    lines.append("")
    lines.append("- 本报告仅审查 `th_15_extra.js`，不据此自动删除运行时代码。")
    lines.append("- 模块边界登记、定义链和最终所有者均一致，未发现未登记重复定义。")
    if candidates:
        lines.append("- 当前优先定位候选：%s。必须完成单独调用链分析和行为验证后才能处理。" % format_methods([row["method"] for row in candidates]))
    else:
        lines.append("- 当前没有可直接进入后续处理的覆盖候选。")
    lines.append("- 唯一实现和受保护包装链默认保留，不以调用次数低作为删除依据。")
    lines.append("")
    lines.append("## 文件概况")
    lines.append("")
    lines.append("- 版本：`%s`" % version)
    lines.append("- 行数：`%d`" % line_count)
    lines.append("- 字节数：`%d`" % byte_count)
    lines.append("- ToolHub 加载模块：`%d`" % len(modules))
    lines.append("- `th_15` 原型方法定义：`%d`" % sum(row["th15_count"] for row in rows))
    lines.append("- `th_15` 唯一原型方法：`%d`" % len(rows))
    lines.append("- 模块内重复定义方法：`%d`" % len(duplicate_local))
    lines.append("- 后续覆盖候选：`%d`" % len(candidates))
    lines.append("- 受保护覆盖/包装链：`%d`" % len(wrappers))
    lines.append("- 唯一实现：`%d`" % len(unique))
    lines.append("")

    lines.append("## 优先定位候选")
    lines.append("")
    if candidates:
        lines.append("|方法|th_15 定义数|定义链|最终所有者|类型|直接调用|属性读取|动态引用|旧方法捕获|下一步|")
        lines.append("|---|---:|---|---|---|---:|---:|---:|---:|---|")
        for row in candidates:
            sig = row["signals"]
            lines.append("|`%s`|%d|`%s`|`%s`|`%s`|%d|%d|%d|%d|%s|" % (
                row["method"],
                row["th15_count"],
                format_chain(row["chain"]),
                row["effective"],
                row["boundary_type"],
                sig["calls"],
                sig["property_reads"],
                sig["dynamic_refs"],
                sig["captures"],
                row["action"],
            ))
    else:
        lines.append("无。")
    lines.append("")

    lines.append("## 受保护覆盖与包装链")
    lines.append("")
    if wrappers:
        lines.append("|方法|分类|定义链|最终所有者|边界类型|处理结论|")
        lines.append("|---|---|---|---|---|---|")
        for row in wrappers:
            lines.append("|`%s`|%s|`%s`|`%s`|`%s`|%s|" % (
                row["method"],
                row["category"],
                format_chain(row["chain"]),
                row["effective"],
                row["boundary_type"] or "-",
                row["action"],
            ))
    else:
        lines.append("无。")
    lines.append("")

    lines.append("## `th_15` 最终实现")
    lines.append("")
    lines.append(format_methods([row["method"] for row in finals]))
    lines.append("")
    lines.append("这些方法在重复定义链中由 `th_15_extra.js` 提供最终有效实现。")
    lines.append("")

    lines.append("## `th_15` 唯一实现")
    lines.append("")
    lines.append(format_methods([row["method"] for row in unique]))
    lines.append("")
    lines.append("唯一实现不能仅凭全仓库直接调用次数较低删除；WindowManager 回调、反射式入口和界面生命周期仍需逐项审查。")
    lines.append("")

    lines.append("## 模块内重复定义")
    lines.append("")
    if duplicate_local:
        for row in duplicate_local:
            lines.append("- `%s`：`%d` 处定义，完整链为 `%s`。" % (
                row["method"], row["th15_count"], format_chain(row["chain"])
            ))
    else:
        lines.append("无。")
    lines.append("")

    lines.append("## 后续处理门槛")
    lines.append("")
    lines.append("对任何候选执行删除前，必须按以下顺序完成：")
    lines.append("")
    lines.append("1. 定位全部定义、调用、属性读取、动态字符串引用和旧方法捕获。")
    lines.append("2. 分析模块加载顺序、实例创建时机、回调注册与异步延迟引用。")
    lines.append("3. 用专项验证锁定保留行为，并运行模块边界、ES5、JS 语法和相关功能回归。")
    lines.append("4. 只删除已证明不可达的旧定义，更新边界、报告、manifest 和 RSA 签名。")
    lines.append("")
    lines.append("## 使用方式")
    lines.append("")
    lines.append("```bash")
    lines.append("python3 scripts/report_th15_extra_symbols.py --write TH15_EXTRA_AUDIT.md")
    lines.append("python3 scripts/report_th15_extra_symbols.py --check TH15_EXTRA_AUDIT.md")
    lines.append("```")
    lines.append("")
    lines.append("本报告由 `ToolHub.js`、`MODULE_BOUNDARIES.json` 和全部 `code/*.js` 确定性生成。")
    lines.append("")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--write", metavar="PATH")
    group.add_argument("--check", metavar="PATH")
    args = parser.parse_args()

    modules = parse_modules()
    sources = load_sources(modules)
    boundaries, duplicate = load_boundaries()
    rows = validate_and_collect(modules, sources, boundaries, duplicate)
    report = render_report(modules, rows, sources[TH15_NAME]["raw"])

    if args.write:
        target = (ROOT / args.write).resolve()
        target.write_text(report, encoding="utf-8")
        print("OK wrote %s" % target.relative_to(ROOT))
        return 0

    if args.check:
        target = (ROOT / args.check).resolve()
        if not target.exists():
            fail(str(target.relative_to(ROOT)) + " missing")
        if target.read_text(encoding="utf-8") != report:
            fail("%s is stale; regenerate it" % target.relative_to(ROOT))
        candidate_count = sum(1 for row in rows if row["category"] == "后续覆盖候选")
        print("OK th15_extra_audit methods=%d candidates=%d" % (len(rows), candidate_count))
        return 0

    sys.stdout.write(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
