#!/usr/bin/env python3
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE_DIR = ROOT / "code"
BOUNDARIES = ROOT / "MODULE_BOUNDARIES.json"
ENTRY = ROOT / "ToolHub.js"
DEFAULT_REPORT = ROOT / "DEAD_CODE_AUDIT.md"

DEF_RE = re.compile(
    r"(?:FloatBallAppWM\.prototype|proto)\.([A-Za-z_$][A-Za-z0-9_$]*)"
    r"\s*=\s*function\b"
)
MODULE_RE = re.compile(r"['\"]([^'\"]+\.js)['\"]")

CANDIDATE_TYPES = {
    "temporary_override",
    "temporary_override_chain",
    "wrapper_then_override",
}

POSITION_TRANSITION_METHODS = {
    "applyConfiguredBallPosition",
    "cancelConfiguredBallPositionApply",
    "createBallLayoutParams",
    "getConfiguredBallPosition",
    "isBallPositionEffectKey",
    "loadSavedPos",
    "scheduleConfiguredBallPositionApply",
    "snapToEdgeDocked",
}


def fail(message):
    print("FAIL:", message)
    raise SystemExit(1)


def parse_modules():
    text = ENTRY.read_text(encoding="utf-8")
    match = re.search(r"var\s+modules\s*=\s*\[(.*?)\]\s*;", text, re.S)
    if not match:
        fail("ToolHub.js modules list not found")
    modules = MODULE_RE.findall(match.group(1))
    if not modules:
        fail("ToolHub.js modules list is empty")
    return modules


def mask_comments_and_strings(text):
    out = []
    i = 0
    state = "code"
    quote = ""
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
                quote = ch
                out.append(" ")
                i += 1
                state = "string"
                continue
            out.append(ch)
            i += 1
            continue
        if state == "line_comment":
            if ch == "\n":
                out.append("\n")
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
            if ch == "\\":
                out.append(" ")
                if i + 1 < len(text):
                    out.append("\n" if text[i + 1] == "\n" else " ")
                    i += 2
                else:
                    i += 1
                continue
            if ch == quote:
                out.append(" ")
                i += 1
                state = "code"
                continue
            out.append("\n" if ch == "\n" else " ")
            i += 1
    return "".join(out)


def load_sources(modules):
    sources = {}
    for module in modules:
        path = CODE_DIR / module
        if not path.exists():
            fail("module missing: " + module)
        raw = path.read_text(encoding="utf-8")
        sources[module] = {
            "raw": raw,
            "masked": mask_comments_and_strings(raw),
        }
    return sources


def count_definitions(sources):
    result = {}
    for module, source in sources.items():
        counter = Counter(DEF_RE.findall(source["masked"]))
        result[module] = counter
    return result


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

    calls = 0
    property_refs = 0
    bracket_refs = 0
    string_refs = 0
    captures = 0
    files_with_calls = []
    files_with_dynamic = []

    for module, source in sources.items():
        masked = source["masked"]
        raw = source["raw"]
        module_calls = len(call_re.findall(masked))
        module_props = len(prop_re.findall(masked))
        module_brackets = len(bracket_re.findall(raw))
        module_strings = len(string_re.findall(raw))
        module_captures = len(capture_re.findall(masked))
        calls += module_calls
        property_refs += module_props
        bracket_refs += module_brackets
        string_refs += module_strings
        captures += module_captures
        if module_calls:
            files_with_calls.append(module)
        if module_brackets or module_strings:
            files_with_dynamic.append(module)

    definitions = sum(
        len(re.findall(
            r"(?:FloatBallAppWM\.prototype|proto)\." + escaped +
            r"\s*=\s*function\b",
            source["masked"],
        ))
        for source in sources.values()
    )
    property_reads = max(0, property_refs - definitions)
    dynamic_total = bracket_refs + string_refs
    if bracket_refs:
        dynamic_risk = "高"
    elif string_refs:
        dynamic_risk = "中"
    else:
        dynamic_risk = "低"

    return {
        "calls": calls,
        "property_reads": property_reads,
        "bracket_refs": bracket_refs,
        "string_refs": string_refs,
        "dynamic_total": dynamic_total,
        "dynamic_risk": dynamic_risk,
        "captures": captures,
        "call_files": files_with_calls,
        "dynamic_files": files_with_dynamic,
    }


def classify(method, module, record):
    if method == "rebuildBallForNewSize" and module == "th_15_extra.js":
        return (
            "A",
            "优先候选",
            "条件包装依赖前序实现；th_12 已禁止重新定义该方法，当前包装不会安装。",
        )
    if module == "th_15_extra.js" and method in POSITION_TRANSITION_METHODS:
        return (
            "B",
            "位置过渡候选",
            "th_19 在实例创建前无条件覆盖；仍需确认模块加载期没有调用及设备位置基线一致。",
        )
    if method == "armLongPress":
        return (
            "C",
            "暂缓删除",
            "涉及设置入口与长按状态辅助方法；应先单独审查调用方和交互契约。",
        )
    if method == "onScreenChangedReflow":
        return (
            "C",
            "暂缓删除",
            "存在 th_09 基础实现与 th_15 包装链；需先证明屏幕变化监听没有加载期或延迟引用。",
        )
    if module == "th_09_animation.js":
        return (
            "C",
            "设备验证后再定",
            "动画、旋转和吸边基础能力耦合，静态最终覆盖不足以单独证明可删除。",
        )
    return (
        "C",
        "人工审查",
        "仅确认最终所有者，尚未获得足够证据证明旧实现不可达。",
    )


def validate_boundaries(data, modules, definitions):
    order = {name: index for index, name in enumerate(modules)}
    records = data.get("duplicateDefinitions") or []
    for record in records:
        method = str(record.get("method", ""))
        expected = list(record.get("definitions") or [])
        actual = []
        for module in modules:
            count = int(definitions[module].get(method, 0))
            actual.extend([module] * count)
        if actual != expected:
            fail(
                "boundary definition mismatch for %s: expected=%r actual=%r"
                % (method, expected, actual)
            )
        owner = str(record.get("effectiveOwner", ""))
        if owner not in order:
            fail("effective owner not loaded for %s: %s" % (method, owner))
        if expected and order[owner] < max(order[item] for item in expected):
            fail("effective owner is not final for %s" % method)
    return records


def escape_cell(value):
    return str(value).replace("|", r"\|").replace("\n", " ")


def render_report(data, modules, sources, definitions, records):
    order = {name: index for index, name in enumerate(modules)}
    candidates = []
    protected = []

    for record in records:
        method = str(record.get("method", ""))
        kind = str(record.get("type", ""))
        owner = str(record.get("effectiveOwner", ""))
        definitions_list = list(record.get("definitions") or [])
        if kind in CANDIDATE_TYPES:
            counts = Counter(definitions_list)
            for module, occurrence_count in counts.items():
                if module == owner:
                    continue
                priority, recommendation, rationale = classify(method, module, record)
                signals = count_signals(method, sources)
                candidates.append({
                    "priority": priority,
                    "method": method,
                    "module": module,
                    "occurrences": occurrence_count,
                    "owner": owner,
                    "owner_after": order[owner] > order[module],
                    "type": kind,
                    "signals": signals,
                    "recommendation": recommendation,
                    "rationale": rationale,
                })
        else:
            protected.append(record)

    candidates.sort(
        key=lambda item: (
            item["priority"],
            order.get(item["module"], 999),
            item["method"],
        )
    )
    protected.sort(key=lambda item: str(item.get("method", "")))

    unique_methods = {
        method
        for module_defs in definitions.values()
        for method in module_defs
    }
    total_definitions = sum(
        sum(module_defs.values()) for module_defs in definitions.values()
    )

    lines = []
    lines.append("# ToolHub-FloatBall 残余覆盖链与死代码审查")
    lines.append("")
    lines.append("## 审查约束")
    lines.append("")
    lines.append("- 本报告只提供静态证据和清理优先级，不自动删除运行时代码。")
    lines.append("- ‘最终覆盖’不等于‘可安全删除’；仍需排除模块加载期调用、延迟回调、动态属性访问和设备行为差异。")
    lines.append("- 直接调用数量统计的是最终原型方法的调用信号，不能证明调用到旧实现。")
    lines.append("- 有效包装链、OCR 扩展、指针完成链和更新包装默认受保护。")
    lines.append("")
    lines.append("## 扫描摘要")
    lines.append("")
    lines.append("- 加载模块：`%d`" % len(modules))
    lines.append("- 原型方法定义：`%d`" % total_definitions)
    lines.append("- 唯一原型方法：`%d`" % len(unique_methods))
    lines.append("- 已登记重复方法：`%d`" % len(records))
    lines.append("- 最终覆盖型候选节点：`%d`" % len(candidates))
    lines.append("- 受保护覆盖/包装链：`%d`" % len(protected))
    lines.append("- 第一批清理候选：`%d`" % len(data.get("cleanupCandidates") or []))
    lines.append("")
    lines.append("## 候选节点")
    lines.append("")
    lines.append("|级别|方法|旧定义模块|定义次数|最终所有者|直接调用|属性读取|动态引用|旧方法捕获|建议|")
    lines.append("|---|---|---|---:|---|---:|---:|---:|---:|---|")
    for item in candidates:
        s = item["signals"]
        lines.append(
            "|{priority}|`{method}`|`{module}`|{occurrences}|`{owner}`|{calls}|{property_reads}|{dynamic_total}|{captures}|{recommendation}|".format(
                priority=escape_cell(item["priority"]),
                method=escape_cell(item["method"]),
                module=escape_cell(item["module"]),
                occurrences=item["occurrences"],
                owner=escape_cell(item["owner"]),
                calls=s["calls"],
                property_reads=s["property_reads"],
                dynamic_total=s["dynamic_total"],
                captures=s["captures"],
                recommendation=escape_cell(item["recommendation"]),
            )
        )
    lines.append("")
    lines.append("### 判定说明")
    lines.append("")
    for item in candidates:
        s = item["signals"]
        detail = (
            "- **{priority} / `{method}` / `{module}`**：{rationale} "
            "最终所有者 `{owner}` 位于其后；动态引用风险为 **{risk}**。"
        ).format(
            priority=item["priority"],
            method=item["method"],
            module=item["module"],
            rationale=item["rationale"],
            owner=item["owner"],
            risk=s["dynamic_risk"],
        )
        lines.append(detail)
    lines.append("")
    lines.append("## 受保护覆盖与包装链")
    lines.append("")
    lines.append("|方法|类型|最终所有者|原因|")
    lines.append("|---|---|---|---|")
    for record in protected:
        lines.append(
            "|`%s`|`%s`|`%s`|%s|"
            % (
                escape_cell(record.get("method", "")),
                escape_cell(record.get("type", "")),
                escape_cell(record.get("effectiveOwner", "")),
                escape_cell(record.get("reason", "")),
            )
        )
    lines.append("")
    lines.append("## 建议顺序")
    lines.append("")
    lines.append("1. 单独清理 `th_15_extra.js` 中不再可能安装的 `rebuildBallForNewSize` 条件包装器。")
    lines.append("2. 对 `th_15_extra.js` 的固定位置过渡方法做一次模块加载期调用审查和真机位置基线，再按一组清理。")
    lines.append("3. 将 `armLongPress` 与长按辅助状态作为独立交互审查，不与位置方法混删。")
    lines.append("4. 最后处理 `th_09_animation.js` 的旧动画、吸边和屏幕重排实现，必须包含旋转、尺寸变化和动画开关真机测试。")
    lines.append("")
    lines.append("## 使用方式")
    lines.append("")
    lines.append("```bash")
    lines.append("python3 scripts/report_dead_module_symbols.py --write DEAD_CODE_AUDIT.md")
    lines.append("python3 scripts/report_dead_module_symbols.py --check DEAD_CODE_AUDIT.md")
    lines.append("```")
    lines.append("")
    lines.append("报告由 `scripts/report_dead_module_symbols.py` 根据 `ToolHub.js`、`MODULE_BOUNDARIES.json` 和 `code/*.js` 确定性生成。")
    lines.append("")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--write", metavar="PATH")
    group.add_argument("--check", metavar="PATH")
    args = parser.parse_args()

    for path in (CODE_DIR, BOUNDARIES, ENTRY):
        if not path.exists():
            fail(str(path.relative_to(ROOT)) + " missing")

    modules = parse_modules()
    sources = load_sources(modules)
    definitions = count_definitions(sources)
    data = json.loads(BOUNDARIES.read_text(encoding="utf-8"))
    records = validate_boundaries(data, modules, definitions)
    report = render_report(data, modules, sources, definitions, records)

    if args.write:
        target = (ROOT / args.write).resolve()
        target.write_text(report, encoding="utf-8")
        print("OK wrote %s" % target.relative_to(ROOT))
        return

    if args.check:
        target = (ROOT / args.check).resolve()
        if not target.exists():
            fail(str(target.relative_to(ROOT)) + " missing")
        current = target.read_text(encoding="utf-8")
        if current != report:
            fail(
                "%s is stale; run report_dead_module_symbols.py --write %s"
                % (target.relative_to(ROOT), target.relative_to(ROOT))
            )
        print("OK dead_code_audit=%s candidates=%d protected=%d" % (
            target.relative_to(ROOT),
            report.count("\n|A|") + report.count("\n|B|") + report.count("\n|C|"),
            len(records) - sum(
                1 for record in records
                if str(record.get("type", "")) in CANDIDATE_TYPES
            ),
        ))
        return

    sys.stdout.write(report)


if __name__ == "__main__":
    main()
