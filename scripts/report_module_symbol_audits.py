#!/usr/bin/env python3
"""Generate a combined ownership audit for selected ToolHub runtime modules."""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "ToolHub.js"
CODE_DIR = ROOT / "code"
BOUNDARIES = ROOT / "constraints/MODULE_BOUNDARIES.json"
DEFAULT_REPORT = ROOT / "docs/audits/MODULE_SYMBOL_AUDIT.md"

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
TARGETS = (
    {
        "name": "th_09_animation.js",
        "label": "th_09",
        "title": "动画模块",
        "priority": {
            "onScreenChangedReflow": 0,
            "scheduleScreenReflow": 1,
            "animateBallLayout": 2,
            "snapToEdgeDocked": 3,
        },
        "lifecycle": True,
    },
    {
        "name": "th_15_extra.js",
        "label": "th_15",
        "title": "扩展模块",
        "priority": {"onScreenChangedReflow": 0},
        "lifecycle": False,
    },
)


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
    for target in TARGETS:
        if target["name"] not in modules:
            fail(target["name"] + " not loaded by ToolHub.js")
    return modules


def mask_comments_and_strings(text):
    out = []
    index = 0
    state = "code"
    quote = ""
    escaped = False
    while index < len(text):
        char = text[index]
        next_char = text[index + 1] if index + 1 < len(text) else ""
        if state == "code":
            if char == "/" and next_char == "/":
                out.extend("  ")
                index += 2
                state = "line_comment"
                continue
            if char == "/" and next_char == "*":
                out.extend("  ")
                index += 2
                state = "block_comment"
                continue
            if char in ("'", '"', "`"):
                out.append(" ")
                quote = char
                escaped = False
                state = "string"
                index += 1
                continue
            out.append(char)
            index += 1
            continue
        if state == "line_comment":
            if char in "\r\n":
                out.append(char)
                state = "code"
            else:
                out.append(" ")
            index += 1
            continue
        if state == "block_comment":
            if char == "*" and next_char == "/":
                out.extend("  ")
                index += 2
                state = "code"
            else:
                out.append("\n" if char == "\n" else " ")
                index += 1
            continue
        out.append("\n" if char == "\n" else " ")
        if escaped:
            escaped = False
        elif char == "\\":
            escaped = True
        elif char == quote:
            state = "code"
        index += 1
    return "".join(out)


def load_sources(modules):
    result = {}
    for module in modules:
        raw = read(CODE_DIR / module)
        result[module] = {"raw": raw, "masked": mask_comments_and_strings(raw)}
    return result


def load_boundaries():
    data = json.loads(read(BOUNDARIES))
    duplicate = {}
    for record in data.get("duplicateDefinitions") or []:
        method = str(record.get("method", ""))
        if method in duplicate:
            fail("duplicate boundary records for " + method)
        duplicate[method] = record
    return duplicate


def definition_chain(method, modules, sources):
    pattern = re.compile(
        r"(?:FloatBallAppWM\.prototype|proto)\." + re.escape(method)
        + r"\s*=\s*function\b"
    )
    chain = []
    for module in modules:
        count = len(pattern.findall(sources[module]["masked"]))
        chain.extend([module] * count)
    return chain


def count_signals(method, sources):
    escaped = re.escape(method)
    call_re = re.compile(r"\.\s*" + escaped + r"\s*\(")
    property_re = re.compile(r"\.\s*" + escaped + r"\b")
    bracket_re = re.compile(r"\[\s*(['\"])" + escaped + r"\1\s*\]")
    string_re = re.compile(r"(['\"])" + escaped + r"\1")
    capture_re = re.compile(
        r"\b(?:var\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*)?"
        r"(?:FloatBallAppWM\.prototype|proto)\." + escaped + r"\b"
    )
    definition_re = re.compile(
        r"(?:FloatBallAppWM\.prototype|proto)\." + escaped
        + r"\s*=\s*function\b"
    )
    calls = properties = brackets = strings = captures = 0
    call_files = []
    capture_files = []
    dynamic_files = []
    for module, source in sources.items():
        masked = source["masked"]
        raw = source["raw"]
        module_calls = len(call_re.findall(masked))
        module_properties = len(property_re.findall(masked))
        module_brackets = len(bracket_re.findall(raw))
        module_strings = len(string_re.findall(raw))
        module_captures = len(capture_re.findall(masked))
        calls += module_calls
        properties += module_properties
        brackets += module_brackets
        strings += module_strings
        captures += module_captures
        if module_calls:
            call_files.append(module)
        if module_captures:
            capture_files.append(module)
        if module_brackets or module_strings:
            dynamic_files.append(module)
    definitions = sum(
        len(definition_re.findall(source["masked"])) for source in sources.values()
    )
    return {
        "calls": calls,
        "property_reads": max(0, properties - definitions),
        "dynamic_refs": brackets + strings,
        "captures": captures,
        "call_files": call_files,
        "capture_files": capture_files,
        "dynamic_files": dynamic_files,
    }


def candidate_action(target, method):
    if target["label"] == "th_09":
        if method in ("onScreenChangedReflow", "scheduleScreenReflow"):
            return "审查 DisplayListener、即时调用和延迟 Runnable 的屏幕变化链"
        if method == "animateBallLayout":
            return "审查动画 token、取消、结束回调、动画开关和尺寸变化"
        if method == "snapToEdgeDocked":
            return "审查吸边计时、面板状态、指针开始/结束和动画开关"
        return "排除加载期调用、异步回调和旧函数对象引用"
    if method == "onScreenChangedReflow":
        return "审查屏幕变化、指针活动和重排调用链"
    return "证明加载期与运行期不可达后再处理"


def classify(target, method, chain, record):
    label = target["label"]
    target_name = target["name"]
    if not record:
        return "唯一实现", "保留；由 %s 单独提供" % label
    effective = str(record.get("effectiveOwner", ""))
    record_type = str(record.get("type", ""))
    if effective == target_name:
        if "wrapper" in record_type:
            return "最终包装链", "保留；%s 是最终包装所有者" % label
        return "最终实现", "保留；%s 是最终有效所有者" % label
    if record_type in CANDIDATE_TYPES:
        return "后续覆盖候选", candidate_action(target, method)
    if chain and chain[0] == target_name:
        return "前置基础实现", "保留；后续模块通过包装或扩展依赖该实现"
    return "受控覆盖链", "保留；边界文件登记为有意覆盖或包装"


def collect_rows(target, modules, sources, duplicate):
    target_name = target["name"]
    counter = Counter(DEF_RE.findall(sources[target_name]["masked"]))
    if not counter:
        fail("no prototype methods found in " + target_name)
    rows = []
    unregistered = []
    stale = []
    for method in sorted(counter):
        chain = definition_chain(method, modules, sources)
        record = duplicate.get(method)
        if len(chain) > 1 and not record:
            unregistered.append(method)
        if record:
            expected = list(record.get("definitions") or [])
            if chain != expected:
                fail(
                    "boundary chain mismatch for %s: expected=%r actual=%r"
                    % (method, expected, chain)
                )
            if not chain or str(record.get("effectiveOwner", "")) != chain[-1]:
                fail("effective owner mismatch for " + method)
        category, action = classify(target, method, chain, record)
        rows.append(
            {
                "method": method,
                "local_count": int(counter[method]),
                "chain": chain,
                "effective": chain[-1] if chain else "",
                "boundary_type": str(record.get("type", "")) if record else "",
                "category": category,
                "action": action,
                "signals": count_signals(method, sources),
            }
        )
    for method, record in duplicate.items():
        if target_name in list(record.get("definitions") or []) and method not in counter:
            stale.append(method)
    if unregistered:
        fail("unregistered duplicate definitions in %s: %s" % (
            target["label"], ", ".join(unregistered)
        ))
    if stale:
        fail("stale %s boundary records: %s" % (
            target["label"], ", ".join(sorted(stale))
        ))
    return rows


def format_chain(chain):
    return " → ".join(chain) if chain else "-"


def format_methods(methods):
    if not methods:
        return "无"
    return "、".join("`%s`" % method for method in methods)


def lifecycle_signals(raw):
    return {
        "Runnable": raw.count("java.lang.Runnable"),
        "postDelayed": raw.count("postDelayed("),
        "DisplayListener": raw.count("DisplayManager.DisplayListener"),
        "AnimatorListener": raw.count("Animator.AnimatorListener"),
        "AnimatorUpdateListener": raw.count("AnimatorUpdateListener"),
        "OnTouchListener": raw.count("View.OnTouchListener"),
    }


def render_target(target, modules, rows, raw):
    priority = target.get("priority") or {}
    candidates = [row for row in rows if row["category"] == "后续覆盖候选"]
    candidates.sort(key=lambda row: (priority.get(row["method"], 99), row["method"]))
    protected = [
        row for row in rows
        if row["category"] in ("最终包装链", "前置基础实现", "受控覆盖链")
    ]
    unique = [row for row in rows if row["category"] == "唯一实现"]
    finals = [row for row in rows if row["category"] == "最终实现"]
    duplicate_local = [row for row in rows if row["local_count"] > 1]
    version_match = re.search(r"^//\s*@version\s+([^\s]+)", raw, re.M)
    version = version_match.group(1) if version_match else "unknown"
    label = target["label"]
    target_name = target["name"]

    lines = [
        "## `%s` %s" % (target_name, target["title"]),
        "",
        "### 结论",
        "",
        "- 模块边界、定义链和最终所有者一致，未发现未登记重复定义。",
        "- 当前后续覆盖候选：%s。" % format_methods([row["method"] for row in candidates]),
        "- 唯一实现和受保护覆盖链默认保留，不能仅凭调用次数低删除。",
        "",
        "### 文件概况",
        "",
        "- 版本：`%s`" % version,
        "- 行数：`%d`" % len(raw.splitlines()),
        "- 字节数：`%d`" % len(raw.encode("utf-8")),
        "- ToolHub 加载模块：`%d`" % len(modules),
        "- 原型方法定义：`%d`" % sum(row["local_count"] for row in rows),
        "- 唯一原型方法：`%d`" % len(rows),
        "- 模块内重复定义方法：`%d`" % len(duplicate_local),
        "- 后续覆盖候选：`%d`" % len(candidates),
        "- 受保护覆盖/包装链：`%d`" % len(protected),
        "- 唯一实现：`%d`" % len(unique),
        "",
    ]

    if target.get("lifecycle"):
        signals = lifecycle_signals(raw)
        meanings = {
            "Runnable": "可能持有实例并延迟调用最终原型方法",
            "postDelayed": "需要排除旧回调对象和竞态",
            "DisplayListener": "屏幕旋转和尺寸变化入口",
            "AnimatorListener": "动画结束/取消回调",
            "AnimatorUpdateListener": "逐帧 WindowManager 更新",
            "OnTouchListener": "触摸和吸边状态入口",
        }
        lines.extend(["### 异步与生命周期信号", "", "|信号|数量|风险含义|", "|---|---:|---|"])
        for key in (
            "Runnable", "postDelayed", "DisplayListener", "AnimatorListener",
            "AnimatorUpdateListener", "OnTouchListener",
        ):
            lines.append("|`%s`|%d|%s|" % (key, signals[key], meanings[key]))
        lines.append("")

    lines.extend([
        "### 后续覆盖候选",
        "",
        "|方法|模块内定义数|定义链|最终所有者|类型|直接调用|属性读取|动态引用|旧方法捕获|下一步|",
        "|---|---:|---|---|---|---:|---:|---:|---:|---|",
    ])
    if candidates:
        for row in candidates:
            signal = row["signals"]
            lines.append(
                "|`%s`|%d|`%s`|`%s`|`%s`|%d|%d|%d|%d|%s|"
                % (
                    row["method"], row["local_count"], format_chain(row["chain"]),
                    row["effective"], row["boundary_type"], signal["calls"],
                    signal["property_reads"], signal["dynamic_refs"], signal["captures"],
                    row["action"],
                )
            )
    else:
        lines.append("|—|—|—|—|—|—|—|—|—|当前无候选|")

    lines.extend([
        "",
        "### 受保护覆盖与包装链",
        "",
        "|方法|分类|定义链|最终所有者|边界类型|处理结论|",
        "|---|---|---|---|---|---|",
    ])
    if protected:
        for row in protected:
            lines.append(
                "|`%s`|%s|`%s`|`%s`|`%s`|%s|"
                % (
                    row["method"], row["category"], format_chain(row["chain"]),
                    row["effective"], row["boundary_type"] or "-", row["action"],
                )
            )
    else:
        lines.append("|—|—|—|—|—|无|")

    lines.extend([
        "",
        "### `%s` 最终实现" % label,
        "",
        format_methods([row["method"] for row in finals]),
        "",
        "### `%s` 唯一实现" % label,
        "",
        format_methods([row["method"] for row in unique]),
        "",
        "### 模块内重复定义",
        "",
    ])
    if duplicate_local:
        for row in duplicate_local:
            lines.append(
                "- `%s`：`%d` 处定义，完整链为 `%s`。"
                % (row["method"], row["local_count"], format_chain(row["chain"]))
            )
    else:
        lines.append("无。")
    lines.extend([
        "",
        "### 后续处理门槛",
        "",
        "1. 定位全部定义、调用、属性读取、动态字符串引用和旧方法捕获。",
        "2. 分析模块加载顺序、实例创建时机、回调注册与异步延迟引用。",
        "3. 用专项验证锁定保留行为，并运行模块边界、ES5、JS 语法和相关功能回归。",
        "4. 只删除已证明不可达的旧定义，随后更新边界、报告、manifest 和 RSA 签名。",
        "",
    ])
    return lines


def render_report(modules, analyses, sources):
    lines = [
        "# ToolHub 模块符号与覆盖链审查",
        "",
        "## 审查边界",
        "",
        "- 本报告合并原 `th_09` 与 `th_15` 独立报告，统一复用同一套定义链与引用信号分析。",
        "- 报告只提供静态证据，不自动删除运行时代码。",
        "- 模块边界、异步回调和旧函数对象引用仍是删除前必须保留的验证边界。",
        "",
    ]
    for target, rows in analyses:
        lines.extend(render_target(target, modules, rows, sources[target["name"]]["raw"]))
    lines.extend([
        "## 使用方式",
        "",
        "```bash",
        "python3 scripts/report_module_symbol_audits.py --write MODULE_SYMBOL_AUDIT.md",
        "python3 scripts/report_module_symbol_audits.py --check MODULE_SYMBOL_AUDIT.md",
        "```",
        "",
        "本报告由 `ToolHub.js`、`MODULE_BOUNDARIES.json` 和全部 `code/*.js` 确定性生成。",
        "",
    ])
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Audit selected module prototype ownership")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--write", nargs="?", const=str(DEFAULT_REPORT), metavar="PATH")
    group.add_argument("--check", nargs="?", const=str(DEFAULT_REPORT), metavar="PATH")
    args = parser.parse_args()

    modules = parse_modules()
    sources = load_sources(modules)
    duplicate = load_boundaries()
    analyses = [
        (target, collect_rows(target, modules, sources, duplicate)) for target in TARGETS
    ]
    report = render_report(modules, analyses, sources)
    path = Path(args.write or args.check)
    if not path.is_absolute():
        path = ROOT / path

    if args.write:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(report, encoding="utf-8")
        print("OK wrote " + str(path.relative_to(ROOT)))
        return 0

    if not path.exists():
        fail(str(path.relative_to(ROOT)) + " missing")
    if path.read_text(encoding="utf-8") != report:
        fail(str(path.relative_to(ROOT)) + " is stale; regenerate with --write")
    total_methods = sum(len(rows) for _, rows in analyses)
    total_candidates = sum(
        1 for _, rows in analyses for row in rows if row["category"] == "后续覆盖候选"
    )
    print("OK module_symbol_audit methods=%d candidates=%d" % (
        total_methods, total_candidates
    ))
    return 0


if __name__ == "__main__":
    sys.exit(main())
