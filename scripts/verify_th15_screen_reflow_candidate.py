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
TH09 = CODE_DIR / "th_09_animation.js"
TH15 = CODE_DIR / "th_15_extra.js"
TH19 = CODE_DIR / "th_19_position_state.js"
DEFAULT_REPORT = ROOT / "TH15_SCREEN_REFLOW_ANALYSIS.md"
METHOD = "onScreenChangedReflow"

MODULE_RE = re.compile(r"['\"]([^'\"]+\.js)['\"]")
DEF_RE = re.compile(
    r"(?:FloatBallAppWM\.prototype|proto)\.onScreenChangedReflow"
    r"\s*=\s*function\b"
)
CALL_RE = re.compile(r"\.\s*onScreenChangedReflow\s*\(")
CAPTURE_RE = re.compile(
    r"\bvar\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*"
    r"(?:FloatBallAppWM\.prototype|proto)\.onScreenChangedReflow\b"
)


def fail(message):
    print("FAIL:", message)
    raise SystemExit(1)


def read(path):
    if not path.exists():
        fail(str(path.relative_to(ROOT)) + " missing")
    return path.read_text(encoding="utf-8")


def parse_modules(entry_text):
    match = re.search(r"var\s+modules\s*=\s*\[(.*?)\]\s*;", entry_text, re.S)
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


def section(text, start_marker, end_marker):
    start = text.find(start_marker)
    if start < 0:
        fail("missing section start: " + start_marker)
    end = text.find(end_marker, start + len(start_marker))
    if end < 0:
        fail("missing section end: " + end_marker)
    return text[start:end]


def validate_entry(entry_text, modules):
    required = ["th_09_animation.js", "th_15_extra.js", "th_19_position_state.js"]
    indexes = [modules.index(name) for name in required]
    if not (indexes[0] < indexes[1] < indexes[2]):
        fail("module order must be th_09 < th_15 < th_19")

    module_list_at = entry_text.index("var modules =")
    load_loop_at = entry_text.index("for (var i = 0; i < modules.length; i++)", module_list_at)
    notify_at = entry_text.index("notifyToolHubModulesLoaded();", load_loop_at)
    cold_new_at = entry_text.index("var app = new FloatBallAppWM(logger);", notify_at)
    if not (module_list_at < load_loop_at < notify_at < cold_new_at):
        fail("cold start constructs app before module load completion")

    restart_at = entry_text.index("function restartToolHubFromSettings()")
    reload_call_at = entry_text.index("reloadLocalToolHubModulesForRestart();", restart_at)
    restart_new_at = entry_text.index("var app = new FloatBallAppWM(logger);", reload_call_at)
    if reload_call_at >= restart_new_at:
        fail("settings restart constructs app before module reload")

    if entry_text.count("new FloatBallAppWM(") != 2:
        fail("unexpected FloatBallAppWM construction site count")

    return {
        "module_indexes": indexes,
        "construction_sites": 2,
    }


def validate_definitions(modules, sources, boundaries):
    chain = []
    for module in modules:
        count = len(DEF_RE.findall(sources[module]["masked"]))
        chain.extend([module] * count)
    expected = ["th_09_animation.js", "th_15_extra.js", "th_19_position_state.js"]
    if chain != expected:
        fail("unexpected onScreenChangedReflow definition chain: %r" % chain)

    records = [
        record for record in boundaries.get("duplicateDefinitions", [])
        if str(record.get("method", "")) == METHOD
    ]
    if len(records) != 1:
        fail("expected one onScreenChangedReflow boundary record")
    record = records[0]
    if list(record.get("definitions") or []) != expected:
        fail("boundary definition chain mismatch")
    if str(record.get("effectiveOwner", "")) != "th_19_position_state.js":
        fail("boundary effective owner mismatch")
    if str(record.get("type", "")) != "wrapper_then_override":
        fail("boundary type mismatch")

    return chain


def validate_th15_wrapper(th15_text):
    block = section(
        th15_text,
        'if (typeof proto.onScreenChangedReflow === "function")',
        "  } catch (eInstall)",
    )
    required = (
        "var oldOnScreenChangedReflow = proto.onScreenChangedReflow;",
        "proto.onScreenChangedReflow = function(reason)",
        "oldOnScreenChangedReflow.call(this, reason)",
        "typeof this.isPointerToolActive === \"function\"",
        "this.applyConfiguredBallPosition(false, \"screen_reflow:\"",
    )
    for marker in required:
        if marker not in block:
            fail("th_15 wrapper marker missing: " + marker)
    if block.count("oldOnScreenChangedReflow.call(this, reason)") != 1:
        fail("th_15 wrapper old method call count mismatch")
    return block


def validate_th19_final(th19_text):
    block = section(
        th19_text,
        "proto.onScreenChangedReflow = function(reason)",
        "proto.scheduleScreenReflow = function(reason)",
    )
    required = (
        "!this.state || this.state.closing || !this.state.addedBall",
        "var next = this.getScreenSizePx();",
        "this.state.screen = { w: newW, h: newH };",
        'this.cancelPointerSemanticUpdate(null, "screen_reflow")',
        'typeof this.onPointerScreenChangedReflow === "function"',
        'this.applyConfiguredBallPosition(false, "screen_reflow:"',
        '"fixed screen reflow reason="',
    )
    for marker in required:
        if marker not in block:
            fail("th_19 final reflow marker missing: " + marker)
    for forbidden in (
        "oldOnScreenChangedReflow",
        "xRatio",
        "yRatio",
        ".savePos(",
    ):
        if forbidden in block:
            fail("th_19 final reflow contains forbidden legacy marker: " + forbidden)
    return block


def collect_calls(modules, sources):
    calls = {}
    captures = {}
    dynamic = {}
    for module in modules:
        masked = sources[module]["masked"]
        raw = sources[module]["raw"]
        call_count = len(CALL_RE.findall(masked))
        capture_names = CAPTURE_RE.findall(masked)
        bracket_count = len(re.findall(r"\[\s*(['\"])onScreenChangedReflow\1\s*\]", raw))
        string_count = len(re.findall(r"(['\"])onScreenChangedReflow\1", raw))
        if call_count:
            calls[module] = call_count
        if capture_names:
            captures[module] = capture_names
        if bracket_count or string_count:
            dynamic[module] = bracket_count + string_count

    if calls != {"th_09_animation.js": 4, "th_19_position_state.js": 3}:
        fail("unexpected direct call locations: %r" % calls)
    if captures != {"th_15_extra.js": ["oldOnScreenChangedReflow"]}:
        fail("unexpected old method captures: %r" % captures)
    if dynamic:
        fail("dynamic onScreenChangedReflow references found: %r" % dynamic)

    return calls, captures


def validate_schedule_chain(modules, sources, boundaries):
    method = "scheduleScreenReflow"
    pattern = re.compile(
        r"(?:FloatBallAppWM\.prototype|proto)\.scheduleScreenReflow"
        r"\s*=\s*function\b"
    )
    chain = []
    for module in modules:
        count = len(pattern.findall(sources[module]["masked"]))
        chain.extend([module] * count)
    expected = ["th_09_animation.js", "th_19_position_state.js"]
    if chain != expected:
        fail("unexpected scheduleScreenReflow chain: %r" % chain)
    records = [
        record for record in boundaries.get("duplicateDefinitions", [])
        if str(record.get("method", "")) == method
    ]
    if len(records) != 1:
        fail("expected one scheduleScreenReflow boundary record")
    if str(records[0].get("effectiveOwner", "")) != "th_19_position_state.js":
        fail("scheduleScreenReflow effective owner mismatch")
    return chain


def render_report(entry_result, calls, captures):
    lines = []
    lines.append("# `th_15` 屏幕重排候选分析")
    lines.append("")
    lines.append("## 结论")
    lines.append("")
    lines.append("- `th_15_extra.js` 的 `onScreenChangedReflow` 包装不会进入任何已创建实例的运行链。")
    lines.append("- `th_19_position_state.js` 在实例创建前直接覆盖该方法，且不捕获或调用 `th_15` 包装。")
    lines.append("- 屏幕变化调用通过 `this.onScreenChangedReflow(...)` 动态分派，运行时最终指向 `th_19`。")
    lines.append("- `th_19` 已完整承担屏幕尺寸稳定性、指针重排、旧语义任务取消和固定位置恢复。")
    lines.append("- 静态删除门槛通过；本报告阶段仍不修改运行时代码。")
    lines.append("")
    lines.append("## 定义链")
    lines.append("")
    lines.append("```text")
    lines.append("th_09_animation.js：旧比例坐标重排")
    lines.append("  ↓ 被 th_15 捕获并包装")
    lines.append("th_15_extra.js：调用旧实现后尝试恢复固定位置")
    lines.append("  ↓ 被 th_19 直接覆盖，不再捕获")
    lines.append("th_19_position_state.js：最终固定位置与指针重排实现")
    lines.append("  ↓")
    lines.append("new FloatBallAppWM(logger)")
    lines.append("```")
    lines.append("")
    lines.append("- 实例创建点：`%d`，均位于完整模块加载之后。" % entry_result["construction_sites"])
    lines.append("- `th_15` 到 `th_19` 之间没有实例创建。")
    lines.append("")
    lines.append("## 调用与捕获")
    lines.append("")
    lines.append("|类型|模块|数量/名称|结论|")
    lines.append("|---|---|---|---|")
    for module in sorted(calls):
        lines.append("|直接调用|`%s`|`%d`|均通过实例属性动态分派|" % (module, calls[module]))
    for module in sorted(captures):
        lines.append("|旧方法捕获|`%s`|`%s`|仅用于构造随后被覆盖的包装|" % (
            module, ", ".join(captures[module])
        ))
    lines.append("|动态字符串/方括号引用|全部模块|`0`|不存在绕过原型覆盖的动态入口|")
    lines.append("")
    lines.append("## 最终实现覆盖范围")
    lines.append("")
    lines.append("`th_19_position_state.js` 当前最终实现同时保证：")
    lines.append("")
    lines.append("- 关闭中或悬浮球未加入时不执行重排；")
    lines.append("- 过滤旋转方向与屏幕宽高暂时不一致的中间状态；")
    lines.append("- 更新统一的 `state.screen`；")
    lines.append("- 取消旧指针语义坐标任务；")
    lines.append("- 调用 `onPointerScreenChangedReflow` 更新指针窗口；")
    lines.append("- 通过 `applyConfiguredBallPosition` 恢复设置中的边缘和高度；")
    lines.append("- 不再使用比例坐标、临时像素位置或 `savePos()`。")
    lines.append("")
    lines.append("## 删除前验证条件")
    lines.append("")
    lines.append("后续处理 PR 必须继续通过：")
    lines.append("")
    lines.append("1. `verify_module_boundaries.py`；")
    lines.append("2. `report_dead_module_symbols.py`；")
    lines.append("3. `report_th15_extra_symbols.py`；")
    lines.append("4. `verify_ball_position_state.py`；")
    lines.append("5. Rhino ES5、JavaScript 语法、manifest 与 RSA 签名校验。")
    lines.append("")
    lines.append("## 使用方式")
    lines.append("")
    lines.append("```bash")
    lines.append("python3 scripts/verify_th15_screen_reflow_candidate.py --write TH15_SCREEN_REFLOW_ANALYSIS.md")
    lines.append("python3 scripts/verify_th15_screen_reflow_candidate.py --check TH15_SCREEN_REFLOW_ANALYSIS.md")
    lines.append("```")
    lines.append("")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--write", metavar="PATH")
    group.add_argument("--check", metavar="PATH")
    args = parser.parse_args()

    entry_text = read(ENTRY)
    modules = parse_modules(entry_text)
    sources = {}
    for module in modules:
        raw = read(CODE_DIR / module)
        sources[module] = {"raw": raw, "masked": mask_comments_and_strings(raw)}
    boundaries = json.loads(read(BOUNDARIES))

    entry_result = validate_entry(entry_text, modules)
    validate_definitions(modules, sources, boundaries)
    validate_th15_wrapper(sources["th_15_extra.js"]["raw"])
    validate_th19_final(sources["th_19_position_state.js"]["raw"])
    calls, captures = collect_calls(modules, sources)
    validate_schedule_chain(modules, sources, boundaries)
    report = render_report(entry_result, calls, captures)

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
        print("OK th15_screen_reflow_candidate unreachable=1 final_owner=th_19 calls=7 dynamic=0")
        return 0

    sys.stdout.write(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
