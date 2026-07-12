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
TARGET_NAME = "th_09_animation.js"
TARGET = CODE_DIR / TARGET_NAME
DEFAULT_REPORT = ROOT / "TH09_ANIMATION_AUDIT.md"

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
PRIORITY_ORDER = {
    "onScreenChangedReflow": 0,
    "scheduleScreenReflow": 1,
    "animateBallLayout": 2,
    "snapToEdgeDocked": 3,
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
    if TARGET_NAME not in modules:
        fail(TARGET_NAME + " not loaded by ToolHub.js")
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
    result = {}
    for module in modules:
        raw = read(CODE_DIR / module)
        result[module] = {
            "raw": raw,
            "masked": mask_comments_and_strings(raw),
        }
    return result


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

    totals = {
        "calls": 0,
        "properties": 0,
        "brackets": 0,
        "strings": 0,
        "captures": 0,
        "call_files": [],
        "capture_files": [],
        "dynamic_files": [],
    }
    for module, source in sources.items():
        masked = source["masked"]
        raw = source["raw"]
        calls = len(call_re.findall(masked))
        props = len(prop_re.findall(masked))
        brackets = len(bracket_re.findall(raw))
        strings = len(string_re.findall(raw))
        captures = len(capture_re.findall(masked))
        totals["calls"] += calls
        totals["properties"] += props
        totals["brackets"] += brackets
        totals["strings"] += strings
        totals["captures"] += captures
        if calls:
            totals["call_files"].append(module)
        if captures:
            totals["capture_files"].append(module)
        if brackets or strings:
            totals["dynamic_files"].append(module)

    definitions = sum(
        len(def_re.findall(source["masked"])) for source in sources.values()
    )
    return {
        "calls": totals["calls"],
        "property_reads": max(0, totals["properties"] - definitions),
        "dynamic_refs": totals["brackets"] + totals["strings"],
        "captures": totals["captures"],
        "call_files": totals["call_files"],
        "capture_files": totals["capture_files"],
        "dynamic_files": totals["dynamic_files"],
    }


def load_boundaries():
    data = json.loads(read(BOUNDARIES))
    duplicate = {}
    for record in data.get("duplicateDefinitions") or []:
        method = str(record.get("method", ""))
        if method in duplicate:
            fail("duplicate boundary records for " + method)
        duplicate[method] = record
    return duplicate


def candidate_action(method):
    if method in ("onScreenChangedReflow", "scheduleScreenReflow"):
        return "先作为同一屏幕变化链审查；验证 DisplayListener、即时调用和延迟 Runnable"
    if method == "animateBallLayout":
        return "单独审查动画 token、取消、结束回调、动画开关和尺寸变化"
    if method == "snapToEdgeDocked":
        return "最后审查吸边计时、面板状态、指针开始/结束和动画开关"
    return "需单独排除加载期调用、异步回调和旧函数对象引用"


def classify(method, chain, record):
    if not record:
        return "唯一实现", "保留；由 th_09 单独提供"
    owner = str(record.get("effectiveOwner", ""))
    kind = str(record.get("type", ""))
    if owner == TARGET_NAME:
        if "wrapper" in kind:
            return "最终包装链", "保留；th_09 是最终包装所有者"
        return "最终实现", "保留；th_09 是最终有效所有者"
    if kind in CANDIDATE_TYPES:
        return "后续覆盖候选", candidate_action(method)
    if chain and chain[0] == TARGET_NAME:
        return "前置基础实现", "保留；后续模块通过包装或扩展依赖该实现"
    return "受控覆盖链", "保留；边界文件登记为有意覆盖或包装"


def collect_rows(modules, sources, duplicate):
    counter = Counter(DEF_RE.findall(sources[TARGET_NAME]["masked"]))
    if not counter:
        fail("no prototype methods found in " + TARGET_NAME)

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
                fail("boundary chain mismatch for %s: expected=%r actual=%r" % (
                    method, expected, chain
                ))
            if not chain or str(record.get("effectiveOwner", "")) != chain[-1]:
                fail("effective owner mismatch for " + method)
        category, action = classify(method, chain, record)
        rows.append({
            "method": method,
            "th09_count": int(counter[method]),
            "chain": chain,
            "effective": chain[-1] if chain else "",
            "boundary_type": str(record.get("type", "")) if record else "",
            "category": category,
            "action": action,
            "signals": count_signals(method, sources),
        })

    for method, record in duplicate.items():
        if TARGET_NAME in list(record.get("definitions") or []) and method not in counter:
            stale.append(method)
    if unregistered:
        fail("unregistered duplicate definitions in th_09: " + ", ".join(unregistered))
    if stale:
        fail("stale th_09 boundary records: " + ", ".join(sorted(stale)))
    return rows


def format_chain(chain):
    return " → ".join(chain) if chain else "-"


def format_methods(methods):
    if not methods:
        return "无"
    return "、".join("`%s`" % item for item in methods)


def render_report(modules, rows, raw):
    candidates = [row for row in rows if row["category"] == "后续覆盖候选"]
    candidates.sort(key=lambda row: (PRIORITY_ORDER.get(row["method"], 99), row["method"]))
    protected = [row for row in rows if row["category"] in (
        "最终包装链", "前置基础实现", "受控覆盖链"
    )]
    unique = [row for row in rows if row["category"] == "唯一实现"]
    finals = [row for row in rows if row["category"] == "最终实现"]
    duplicate_local = [row for row in rows if row["th09_count"] > 1]

    version_match = re.search(r"^//\s*@version\s+([^\s]+)", raw, re.M)
    version = version_match.group(1) if version_match else "unknown"
    lifecycle = {
        "Runnable": raw.count("java.lang.Runnable"),
        "postDelayed": raw.count("postDelayed("),
        "DisplayListener": raw.count("DisplayManager.DisplayListener"),
        "AnimatorListener": raw.count("Animator.AnimatorListener"),
        "AnimatorUpdateListener": raw.count("AnimatorUpdateListener"),
        "OnTouchListener": raw.count("View.OnTouchListener"),
    }

    lines = []
    lines.append("# `th_09_animation.js` 独立审查报告")
    lines.append("")
    lines.append("## 结论")
    lines.append("")
    lines.append("- 本报告只审查 `th_09_animation.js`，不自动删除运行时代码。")
    lines.append("- 模块边界、定义链和最终所有者一致，未发现未登记重复定义。")
    lines.append("- 当前后续覆盖候选：%s。" % format_methods([row["method"] for row in candidates]))
    lines.append("- `th_09` 含动画监听、显示监听、延迟 Runnable 和触摸回调；候选必须逐组完成调用链与真机验证。")
    lines.append("- 唯一实现和受保护覆盖链默认保留，不能仅凭调用次数低删除。")
    lines.append("")
    lines.append("## 文件概况")
    lines.append("")
    lines.append("- 版本：`%s`" % version)
    lines.append("- 行数：`%d`" % len(raw.splitlines()))
    lines.append("- 字节数：`%d`" % len(raw.encode("utf-8")))
    lines.append("- ToolHub 加载模块：`%d`" % len(modules))
    lines.append("- `th_09` 原型方法定义：`%d`" % sum(row["th09_count"] for row in rows))
    lines.append("- `th_09` 唯一原型方法：`%d`" % len(rows))
    lines.append("- 模块内重复定义方法：`%d`" % len(duplicate_local))
    lines.append("- 后续覆盖候选：`%d`" % len(candidates))
    lines.append("- 受保护覆盖/包装链：`%d`" % len(protected))
    lines.append("- 唯一实现：`%d`" % len(unique))
    lines.append("")
    lines.append("## 异步与生命周期信号")
    lines.append("")
    lines.append("|信号|数量|风险含义|")
    lines.append("|---|---:|---|")
    meanings = {
        "Runnable": "可能持有实例并延迟调用最终原型方法",
        "postDelayed": "需要排除旧回调对象和竞态",
        "DisplayListener": "屏幕旋转和尺寸变化入口",
        "AnimatorListener": "动画结束/取消回调",
        "AnimatorUpdateListener": "逐帧 WindowManager 更新",
        "OnTouchListener": "触摸和吸边状态入口",
    }
    for key in ("Runnable", "postDelayed", "DisplayListener", "AnimatorListener", "AnimatorUpdateListener", "OnTouchListener"):
        lines.append("|`%s`|%d|%s|" % (key, lifecycle[key], meanings[key]))
    lines.append("")
    lines.append("## 后续覆盖候选")
    lines.append("")
    if candidates:
        lines.append("|方法|定义链|最终所有者|类型|直接调用|属性读取|动态引用|旧方法捕获|下一步|")
        lines.append("|---|---|---|---|---:|---:|---:|---:|---|")
        for row in candidates:
            sig = row["signals"]
            lines.append("|`%s`|`%s`|`%s`|`%s`|%d|%d|%d|%d|%s|" % (
                row["method"],
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
    if protected:
        lines.append("|方法|分类|定义链|最终所有者|边界类型|处理结论|")
        lines.append("|---|---|---|---|---|---|")
        for row in protected:
            lines.append("|`%s`|%s|`%s`|`%s`|`%s`|%s|" % (
                row["method"], row["category"], format_chain(row["chain"]),
                row["effective"], row["boundary_type"], row["action"]
            ))
    else:
        lines.append("无。")
    lines.append("")
    lines.append("## `th_09` 最终实现")
    lines.append("")
    lines.append(format_methods([row["method"] for row in finals]))
    lines.append("")
    lines.append("## `th_09` 唯一实现")
    lines.append("")
    lines.append(format_methods([row["method"] for row in unique]))
    lines.append("")
    lines.append("唯一实现可能由 Android 回调、WindowManager 生命周期或内部状态机间接触发，默认保留。")
    lines.append("")
    lines.append("## 推荐处理顺序")
    lines.append("")
    lines.append("1. `onScreenChangedReflow` 与 `scheduleScreenReflow`：作为同一屏幕变化链完成静态分析与旋转/尺寸变化真机验证。")
    lines.append("2. `animateBallLayout`：单独验证动画开启、关闭、取消、结束回调、尺寸变化和 token 失效。")
    lines.append("3. `snapToEdgeDocked`：最后验证闲置吸边、面板状态、指针开始/结束、左右侧和动画开关。")
    lines.append("")
    lines.append("## 后续处理门槛")
    lines.append("")
    lines.append("1. 定位全部定义、调用、旧方法捕获、动态引用和回调注册。")
    lines.append("2. 证明模块加载完成前后不存在调用旧函数对象的运行窗口。")
    lines.append("3. 建立专项静态验证，并完成相应真机旋转、尺寸变化、动画和吸边测试。")
    lines.append("4. 只删除已证明不可达的旧定义，随后更新边界、报告、manifest 和 RSA 签名。")
    lines.append("")
    lines.append("## 使用方式")
    lines.append("")
    lines.append("```bash")
    lines.append("python3 scripts/report_th09_animation_symbols.py --write TH09_ANIMATION_AUDIT.md")
    lines.append("python3 scripts/report_th09_animation_symbols.py --check TH09_ANIMATION_AUDIT.md")
    lines.append("```")
    lines.append("")
    lines.append("本报告由 `ToolHub.js`、`MODULE_BOUNDARIES.json` 和全部 `code/*.js` 确定性生成。")
    lines.append("")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Audit th_09_animation.js prototype ownership")
    parser.add_argument("--write", nargs="?", const=str(DEFAULT_REPORT), help="write report")
    parser.add_argument("--check", nargs="?", const=str(DEFAULT_REPORT), help="check report")
    args = parser.parse_args()
    if bool(args.write) == bool(args.check):
        fail("choose exactly one of --write or --check")

    modules = parse_modules()
    sources = load_sources(modules)
    rows = collect_rows(modules, sources, load_boundaries())
    report = render_report(modules, rows, sources[TARGET_NAME]["raw"])
    path = Path(args.write or args.check)
    if not path.is_absolute():
        path = ROOT / path

    if args.write:
        path.write_text(report, encoding="utf-8")
        print("OK wrote " + str(path.relative_to(ROOT)))
        return 0

    if not path.exists():
        fail(str(path.relative_to(ROOT)) + " missing")
    current = path.read_text(encoding="utf-8")
    if current != report:
        fail(str(path.relative_to(ROOT)) + " is stale; regenerate with --write")
    print("OK th09_animation_audit methods=%d candidates=%d" % (
        len(rows), len([row for row in rows if row["category"] == "后续覆盖候选"])
    ))
    return 0


if __name__ == "__main__":
    sys.exit(main())
