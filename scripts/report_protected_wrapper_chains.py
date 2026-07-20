#!/usr/bin/env python3
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "ToolHub.js"
CODE_DIR = ROOT / "code"
BOUNDARIES = ROOT / "constraints/MODULE_BOUNDARIES.json"
DEFAULT_REPORT = ROOT / "docs/audits/PROTECTED_WRAPPER_AUDIT.md"
MODULE_RE = re.compile(r"['\"]([^'\"]+\.js)['\"]")

CATEGORY_ORDER = {
    "诊断增强": 0,
    "设置与类型链": 1,
    "指针与 OCR 扩展": 2,
    "指针布局与生命周期": 3,
    "ToolApp 状态保持": 4,
}

CLASSIFICATIONS = {
    "createPointerFrameView": (
        "指针与 OCR 扩展",
        "继续保留",
        "OCR 模块提供完整边框视图覆盖，不是无行为的转发包装。",
    ),
    "execPointerAction": (
        "指针与 OCR 扩展",
        "继续保留",
        "增加 area_ocr 动作模式并保留基础指针动作。",
    ),
    "finishPointerAreaCapture": (
        "指针与 OCR 扩展",
        "继续保留",
        "框选完成后异步衔接 OCR，属于功能完成链。",
    ),
    "scheduleDraggingInspect": (
        "指针与 OCR 扩展",
        "继续保留",
        "限制拖动扫描频率，属于性能和竞态保护。",
    ),
    "showPointerAreaFrame": (
        "指针与 OCR 扩展",
        "继续保留",
        "增加边框刷新节流和状态颜色。",
    ),
    "startPointerTool": (
        "指针与 OCR 扩展",
        "继续保留",
        "启动前取消旧 OCR 并扩展 area_ocr 模式。",
    ),
    "createPointerLayoutParams": (
        "指针布局与生命周期",
        "继续保留",
        "补充屏幕边缘和刘海布局参数。",
    ),
    "removePointerCallbacks": (
        "指针布局与生命周期",
        "继续保留",
        "关闭指针时取消语义调度，防止旧 Runnable 回写。",
    ),
    "resetPointerToolState": (
        "指针布局与生命周期",
        "继续保留",
        "重置时重建语义会话和 token。",
    ),
    "popToolAppPage": (
        "ToolApp 状态保持",
        "继续保留",
        "保存按钮后保留临时编辑状态，属于页面栈状态契约。",
    ),
}


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


def load_sources(modules):
    sources = {}
    for name in modules:
        raw = read(CODE_DIR / name)
        sources[name] = {"raw": raw, "masked": mask_comments_and_strings(raw)}
    return sources


def method_definition_count(masked, method):
    pattern = re.compile(
        r"(?:FloatBallAppWM\.prototype|proto)\." + re.escape(method) +
        r"\s*=\s*function\b"
    )
    return len(pattern.findall(masked))


def count_signals(method, sources):
    call_re = re.compile(r"\.\s*" + re.escape(method) + r"\s*\(")
    prop_re = re.compile(r"\.\s*" + re.escape(method) + r"\b")
    capture_re = re.compile(
        r"=\s*(?:this|self|proto|FloatBallAppWM\.prototype)\." +
        re.escape(method) + r"\b"
    )
    dynamic_re = re.compile(r"\[\s*(['\"])" + re.escape(method) + r"\1\s*\]")
    return {
        "calls": sum(len(call_re.findall(item["masked"])) for item in sources.values()),
        "properties": sum(len(prop_re.findall(item["masked"])) for item in sources.values()),
        "captures": sum(len(capture_re.findall(item["masked"])) for item in sources.values()),
        "dynamic": sum(len(dynamic_re.findall(item["raw"])) for item in sources.values()),
    }


def validate_wrapper(record, sources):
    method = str(record.get("method") or "")
    wrappers = list(record.get("wrappers") or [])
    record_type = str(record.get("type") or "")
    if record_type == "intentional_override":
        if wrappers:
            fail(method + " intentional_override must not declare wrappers")
        return
    if not wrappers:
        fail(method + " wrapper metadata missing")
    for wrapper in wrappers:
        module = str(wrapper.get("module") or "")
        owner = str(wrapper.get("owner") or "")
        old_var = str(wrapper.get("oldVariable") or "")
        if module not in sources or owner not in sources:
            fail(method + " wrapper module/owner missing")
        if not old_var:
            fail(method + " oldVariable missing")
        masked = sources[module]["masked"]
        if not re.search(r"\b" + re.escape(old_var) + r"\b", masked):
            fail(method + " oldVariable not found in " + module)
        if not re.search(r"\b" + re.escape(old_var) + r"\s*(?:\.call\s*)?\(", masked):
            fail(method + " oldVariable invocation missing in " + module)


def collect_rows(modules, sources, data):
    records = list(data.get("duplicateDefinitions") or [])
    methods = {str(record.get("method") or "") for record in records}
    unknown = sorted(methods - set(CLASSIFICATIONS))
    stale = sorted(set(CLASSIFICATIONS) - methods)
    if unknown:
        fail("unclassified protected chains: " + ", ".join(unknown))
    if stale:
        fail("stale classifications: " + ", ".join(stale))

    rows = []
    for record in records:
        method = str(record.get("method") or "")
        definitions = list(record.get("definitions") or [])
        actual = []
        for module in modules:
            count = method_definition_count(sources[module]["masked"], method)
            actual.extend([module] * count)
        if actual != definitions:
            fail("definition chain mismatch for %s: expected=%r actual=%r" % (method, definitions, actual))
        effective = str(record.get("effectiveOwner") or "")
        if effective not in definitions:
            fail(method + " effective owner is not in definition chain")
        if str(record.get("type") or "") != "deferred_wrapper" and effective != definitions[-1]:
            fail(method + " effective owner must be final definition")
        if str(record.get("type") or "") == "deferred_wrapper":
            if str(record.get("runtimeMode") or "") != "deferred_retry":
                fail(method + " deferred wrapper runtimeMode mismatch")
        validate_wrapper(record, sources)
        category, decision, detail = CLASSIFICATIONS[method]
        rows.append({
            "method": method,
            "category": category,
            "decision": decision,
            "detail": detail,
            "definitions": definitions,
            "effective": effective,
            "type": str(record.get("type") or ""),
            "reason": str(record.get("reason") or ""),
            "signals": count_signals(method, sources),
        })
    rows.sort(key=lambda row: (CATEGORY_ORDER[row["category"]], row["method"]))
    return rows


def chain_text(definitions):
    return " → ".join(definitions)


def render_report(rows):
    review = [row for row in rows if row["decision"] == "下一轮专项审查"]
    retained = [row for row in rows if row["decision"] == "继续保留"]
    category_counts = {}
    for row in rows:
        category_counts[row["category"]] = category_counts.get(row["category"], 0) + 1

    lines = []
    lines.append("# ToolHub-FloatBall 受保护包装链独立审查")
    lines.append("")
    lines.append("## 结论")
    lines.append("")
    lines.append("- 已登记受保护覆盖/包装链：`%d`。" % len(rows))
    lines.append("- 定义链、有效所有者、旧方法捕获变量和调用关系均与 `MODULE_BOUNDARIES.json` 一致。")
    review_text = "、".join("`%s`" % row["method"] for row in review) if review else "无"
    lines.append("- 下一轮专项审查：%s。" % review_text)
    lines.append("- 继续保留：`%d` 条；这些链承担指针/OCR、生命周期或页面状态职责。" % len(retained))
    lines.append("- 本报告不自动修改运行时代码；剩余包装均承担明确功能或生命周期职责。")
    lines.append("")
    lines.append("## 分类摘要")
    lines.append("")
    lines.append("|类别|数量|结论|")
    lines.append("|---|---:|---|")
    category_decisions = {
        "诊断增强": "优先专项审查，可评估并回基础实现",
        "设置与类型链": "继续保留，后续只能联审",
        "指针与 OCR 扩展": "继续保留，属于功能完成链",
        "指针布局与生命周期": "继续保留，属于资源和竞态保护",
        "ToolApp 状态保持": "继续保留，属于页面状态契约",
    }
    for category in sorted(category_counts, key=lambda item: CATEGORY_ORDER[item]):
        lines.append("|%s|%d|%s|" % (category, category_counts[category], category_decisions[category]))
    lines.append("")
    lines.append("## 包装链明细")
    lines.append("")
    lines.append("|类别|方法|定义链|最终所有者|类型|调用|属性读取|动态引用|旧方法捕获|结论|")
    lines.append("|---|---|---|---|---|---:|---:|---:|---:|---|")
    for row in rows:
        sig = row["signals"]
        lines.append(
            "|%s|`%s`|`%s`|`%s`|`%s`|%d|%d|%d|%d|%s|" % (
                row["category"], row["method"], chain_text(row["definitions"]),
                row["effective"], row["type"], sig["calls"], sig["properties"],
                sig["dynamic"], sig["captures"], row["decision"],
            )
        )
    lines.append("")
    lines.append("## 判定说明")
    lines.append("")
    for row in rows:
        lines.append("- **`%s` / %s**：%s 原登记原因：%s" % (
            row["method"], row["category"], row["detail"], row["reason"],
        ))
    lines.append("")
    lines.append("## 下一轮顺序")
    lines.append("")
    lines.append("1. 设置与类型包装已并回 `th_05_persistence.js`。")
    lines.append("2. 当前剩余 %d 条包装链全部继续保留，不进入批量收敛流程。" % len(rows))
    lines.append("3. 指针/OCR 与 ToolApp 包装仅在明确回归证据下重新审查。")
    lines.append("")
    lines.append("## 使用方式")
    lines.append("")
    lines.append("```bash")
    lines.append("python3 scripts/report_protected_wrapper_chains.py --write PROTECTED_WRAPPER_AUDIT.md")
    lines.append("python3 scripts/report_protected_wrapper_chains.py --check PROTECTED_WRAPPER_AUDIT.md")
    lines.append("```")
    lines.append("")
    lines.append("报告由 `ToolHub.js`、`MODULE_BOUNDARIES.json` 和全部 `code/*.js` 确定性生成。")
    lines.append("")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Audit protected prototype wrapper chains")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--write", nargs="?", const=str(DEFAULT_REPORT))
    group.add_argument("--check", nargs="?", const=str(DEFAULT_REPORT))
    args = parser.parse_args()

    modules = parse_modules(read(ENTRY))
    sources = load_sources(modules)
    data = json.loads(read(BOUNDARIES))
    rows = collect_rows(modules, sources, data)
    report = render_report(rows)
    target = Path(args.write or args.check)
    if not target.is_absolute():
        target = ROOT / target

    if args.write:
        target.write_text(report, encoding="utf-8")
        print("OK wrote %s" % target.relative_to(ROOT))
        return 0
    if not target.exists():
        fail(str(target.relative_to(ROOT)) + " missing")
    if target.read_text(encoding="utf-8") != report:
        fail(str(target.relative_to(ROOT)) + " is stale; regenerate with --write")
    review_count = len([row for row in rows if row["decision"] == "下一轮专项审查"])
    print("OK protected_wrapper_audit chains=%d review=%d" % (len(rows), review_count))
    return 0


if __name__ == "__main__":
    sys.exit(main())
