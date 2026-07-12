#!/usr/bin/env python3
import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "code"
ENTRY = ROOT / "ToolHub.js"
TH09 = CODE / "th_09_animation.js"
TH16 = CODE / "th_16_entry.js"
TH19 = CODE / "th_19_position_state.js"
DEFAULT_REPORT = ROOT / "TH09_SCREEN_REFLOW_ANALYSIS.md"
METHODS = ("onScreenChangedReflow", "scheduleScreenReflow")


def fail(message):
    print("FAIL:", message)
    raise SystemExit(1)


def read(path):
    if not path.exists():
        fail(str(path.relative_to(ROOT)) + " missing")
    return path.read_text(encoding="utf-8")


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
        out.append("\n" if ch == "\n" else " ")
        if escaped:
            escaped = False
        elif ch == "\\":
            escaped = True
        elif ch == quote:
            state = "code"
        i += 1
    return "".join(out)


def extract_function(text, marker):
    start = text.find(marker)
    if start < 0:
        fail("function marker missing: " + marker)
    brace = text.find("{", start)
    if brace < 0:
        fail("function body missing: " + marker)
    depth = 0
    state = "code"
    quote = ""
    escaped = False
    i = brace
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if state == "code":
            if ch == "/" and nxt == "/":
                state = "line_comment"
                i += 2
                continue
            if ch == "/" and nxt == "*":
                state = "block_comment"
                i += 2
                continue
            if ch in ("'", '"', "`"):
                state = "string"
                quote = ch
                escaped = False
                i += 1
                continue
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    return text[start:i + 1]
            i += 1
            continue
        if state == "line_comment":
            if ch in "\r\n":
                state = "code"
            i += 1
            continue
        if state == "block_comment":
            if ch == "*" and nxt == "/":
                state = "code"
                i += 2
            else:
                i += 1
            continue
        if escaped:
            escaped = False
        elif ch == "\\":
            escaped = True
        elif ch == quote:
            state = "code"
        i += 1
    fail("unterminated function: " + marker)


def parse_modules(loader):
    match = re.search(r"var\s+modules\s*=\s*\[(.*?)\]\s*;", loader, re.S)
    if not match:
        fail("ToolHub.js modules list not found")
    return re.findall(r"['\"]([^'\"]+\.js)['\"]", match.group(1))


def scan_sources():
    result = {}
    for path in sorted(CODE.glob("*.js")):
        raw = read(path)
        result[path.name] = {"raw": raw, "masked": mask_comments_and_strings(raw)}
    return result


def definition_modules(method, sources, modules):
    pattern = re.compile(
        r"(?:FloatBallAppWM\.prototype|proto)\." + re.escape(method) +
        r"\s*=\s*function\b"
    )
    found = []
    for module in modules:
        count = len(pattern.findall(sources[module]["masked"]))
        found.extend([module] * count)
    return found


def call_files(method, sources):
    pattern = re.compile(r"\.\s*" + re.escape(method) + r"\s*\(")
    return [name for name, src in sources.items() if pattern.search(src["masked"])]


def capture_files(method, sources):
    escaped = re.escape(method)
    pattern = re.compile(
        r"\bvar\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*"
        r"(?:FloatBallAppWM\.prototype|proto)\." + escaped + r"\s*;"
    )
    return [name for name, src in sources.items() if pattern.search(src["masked"])]


def dynamic_files(method, sources):
    escaped = re.escape(method)
    bracket = re.compile(r"\[\s*(['\"])" + escaped + r"\1\s*\]")
    string = re.compile(r"(['\"])" + escaped + r"\1")
    return [
        name for name, src in sources.items()
        if bracket.search(src["raw"]) or string.search(src["raw"])
    ]


def verify():
    loader = read(ENTRY)
    th09 = read(TH09)
    th16 = read(TH16)
    th19 = read(TH19)
    modules = parse_modules(loader)
    sources = scan_sources()

    if modules.index("th_09_animation.js") >= modules.index("th_19_position_state.js"):
        fail("th_19 must load after th_09")
    if '"th_19_position_state.js": true' not in loader:
        fail("th_19 is not a critical module")

    expected_chains = {
        "onScreenChangedReflow": ["th_09_animation.js", "th_19_position_state.js"],
        "scheduleScreenReflow": ["th_09_animation.js", "th_19_position_state.js"],
    }
    for method in METHODS:
        actual = definition_modules(method, sources, modules)
        if actual != expected_chains[method]:
            fail("definition chain mismatch for %s: %r" % (method, actual))
        captures = capture_files(method, sources)
        if captures:
            fail("old function object captured for %s: %r" % (method, captures))
        dynamic = dynamic_files(method, sources)
        if dynamic:
            fail("dynamic method reference for %s: %r" % (method, dynamic))

    schedule_calls = sorted(call_files("scheduleScreenReflow", sources))
    if schedule_calls != ["th_09_animation.js", "th_16_entry.js"]:
        fail("unexpected scheduleScreenReflow call files: %r" % schedule_calls)
    reflow_calls = sorted(call_files("onScreenChangedReflow", sources))
    if reflow_calls != ["th_09_animation.js", "th_19_position_state.js"]:
        fail("unexpected onScreenChangedReflow call files: %r" % reflow_calls)

    setup = extract_function(th09, "FloatBallAppWM.prototype.setupDisplayMonitor = function")
    for marker in (
        "DisplayManager.DisplayListener",
        'self.scheduleScreenReflow("display_changed")',
        "dm.registerDisplayListener(listener, this.state.h)",
    ):
        if marker not in setup:
            fail("display monitor dynamic dispatch missing: " + marker)

    start = extract_function(th16, "FloatBallAppWM.prototype.startAsync = function")
    if start.index("self.setupDisplayMonitor();") <= start.index("self.state.addedBall = true;"):
        fail("display monitor is not registered after ball addView")
    if 'self.scheduleScreenReflow("configuration_changed")' not in start:
        fail("configuration receiver does not use dynamic schedule dispatch")

    old_schedule = extract_function(th09, "FloatBallAppWM.prototype.scheduleScreenReflow = function")
    for marker in (
        "this.onScreenChangedReflow(reason)",
        'self.onScreenChangedReflow(String(reason || "") + ":delayed")',
        "try { this.onScreenChangedReflow(reason); }",
    ):
        if marker not in old_schedule:
            fail("th_09 schedule dynamic dispatch missing: " + marker)

    final_schedule = extract_function(th19, "proto.scheduleScreenReflow = function")
    for marker in (
        "screenReflowToken",
        "removeCallbacks(this.state.screenReflowRunnable)",
        "this.onScreenChangedReflow(reason)",
        'self.onScreenChangedReflow(String(reason || "") + ":stable")',
    ):
        if marker not in final_schedule:
            fail("th_19 schedule guard missing: " + marker)

    final_reflow = extract_function(th19, "proto.onScreenChangedReflow = function")
    for marker in (
        "ROTATION_90",
        "ROTATION_270",
        'cancelPointerSemanticUpdate(null, "screen_reflow")',
        "onPointerScreenChangedReflow(reason, oldW, oldH, newW, newH)",
        'applyConfiguredBallPosition(false, "screen_reflow:',
    ):
        if marker not in final_reflow:
            fail("th_19 final reflow behavior missing: " + marker)
    for forbidden in ("xRatio", "yRatio", ".savePos("):
        if forbidden in final_reflow:
            fail("th_19 final reflow still uses legacy mapping: " + forbidden)

    code_instances = []
    instance_re = re.compile(r"\bnew\s+FloatBallAppWM\s*\(")
    for name, src in sources.items():
        if instance_re.search(src["masked"]):
            code_instances.append(name)
    if code_instances:
        fail("code modules create FloatBallAppWM instances: %r" % code_instances)
    loader_instances = len(instance_re.findall(mask_comments_and_strings(loader)))
    if loader_instances < 1:
        fail("ToolHub.js instance creation not found")
    if "notifyToolHubModulesLoaded();" not in loader:
        fail("module completion notifier call missing")

    return {
        "modules": modules,
        "schedule_calls": schedule_calls,
        "reflow_calls": reflow_calls,
        "loader_instances": loader_instances,
    }


def render(result):
    lines = []
    lines.append("# `th_09` 屏幕重排链分析")
    lines.append("")
    lines.append("## 结论")
    lines.append("")
    lines.append("- `th_09_animation.js` 的 `onScreenChangedReflow` 与 `scheduleScreenReflow` 不会进入已创建实例的运行链。")
    lines.append("- `th_19_position_state.js` 在实例创建前直接覆盖两者，且没有模块捕获旧函数对象。")
    lines.append("- DisplayListener、配置变化广播、即时重排和延迟重排均通过实例属性动态分派，运行时指向 `th_19`。")
    lines.append("- `th_19` 已完整承担稳定尺寸判断、延迟任务去重、指针重排、语义任务取消和固定位置恢复。")
    lines.append("- 静态删除门槛通过；本阶段仍不修改运行时代码。")
    lines.append("")
    lines.append("## 定义链")
    lines.append("")
    lines.append("```text")
    lines.append("th_09_animation.js：旧比例坐标和简单延迟重排")
    lines.append("  ↓ 被直接覆盖")
    lines.append("th_19_position_state.js：最终固定位置、指针重排和 token 调度")
    lines.append("  ↓")
    lines.append("FloatBallAppWM 实例创建并注册 DisplayListener")
    lines.append("```")
    lines.append("")
    lines.append("- `code/*.js` 中实例创建：`0`。")
    lines.append("- `ToolHub.js` 中实例创建信号：`%d`。" % result["loader_instances"])
    lines.append("- 模块顺序：`th_09` 位于 `th_19` 之前，`th_19` 是关键模块。")
    lines.append("")
    lines.append("## 调用与回调")
    lines.append("")
    lines.append("|入口|所在模块|分派方式|结论|")
    lines.append("|---|---|---|---|")
    lines.append("|DisplayListener|`th_09_animation.js`|`self.scheduleScreenReflow(...)`|动态调用最终原型|")
    lines.append("|配置变化广播|`th_16_entry.js`|`self.scheduleScreenReflow(...)`|动态调用最终原型|")
    lines.append("|即时重排|`th_09` / `th_19` 调度器|`this.onScreenChangedReflow(...)`|动态调用最终原型|")
    lines.append("|延迟重排|Runnable|`self.onScreenChangedReflow(...)`|不捕获旧方法对象|")
    lines.append("|旧方法变量捕获|全部模块|`0`|不存在绕过覆盖的旧函数对象|")
    lines.append("|动态字符串/方括号引用|全部模块|`0`|不存在动态旁路入口|")
    lines.append("")
    lines.append("## 最终实现覆盖范围")
    lines.append("")
    lines.append("`th_19_position_state.js` 当前保证：")
    lines.append("")
    lines.append("- 过滤旋转方向与宽高暂时不一致的中间状态；")
    lines.append("- 使用 `screenReflowToken` 和可移除 Runnable 去重延迟任务；")
    lines.append("- 更新统一的 `state.screen`；")
    lines.append("- 取消旧指针语义坐标任务；")
    lines.append("- 调用 `onPointerScreenChangedReflow` 更新指针窗口；")
    lines.append("- 按设置恢复悬浮球边缘和高度；")
    lines.append("- 不再使用比例坐标、临时像素位置或 `savePos()`。")
    lines.append("")
    lines.append("## 处理门槛")
    lines.append("")
    lines.append("后续处理 PR 必须继续通过模块边界、`th_09` 独立审查、位置状态、指针回归、ES5、JS 语法、manifest 与 RSA 签名校验。")
    lines.append("")
    lines.append("## 使用方式")
    lines.append("")
    lines.append("```bash")
    lines.append("python3 scripts/verify_th09_screen_reflow_pair.py --write TH09_SCREEN_REFLOW_ANALYSIS.md")
    lines.append("python3 scripts/verify_th09_screen_reflow_pair.py --check TH09_SCREEN_REFLOW_ANALYSIS.md")
    lines.append("```")
    lines.append("")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--write", nargs="?", const=str(DEFAULT_REPORT))
    group.add_argument("--check", nargs="?", const=str(DEFAULT_REPORT))
    args = parser.parse_args()
    report = render(verify())
    target = Path(args.write or args.check)
    if not target.is_absolute():
        target = ROOT / target
    if args.write:
        target.write_text(report, encoding="utf-8")
        print("OK wrote " + str(target.relative_to(ROOT)))
        return 0
    if not target.exists():
        fail(str(target.relative_to(ROOT)) + " missing")
    if target.read_text(encoding="utf-8") != report:
        fail(str(target.relative_to(ROOT)) + " is stale")
    print("OK th09_screen_reflow_pair static_delete_gate=1")
    return 0


if __name__ == "__main__":
    sys.exit(main())
