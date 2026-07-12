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
TH05 = CODE_DIR / "th_05_persistence.js"
TH09 = CODE_DIR / "th_09_animation.js"
TH19 = CODE_DIR / "th_19_position_state.js"
DEFAULT_REPORT = ROOT / "TH09_SNAP_TO_EDGE_DOCKED_ANALYSIS.md"
METHOD = "snapToEdgeDocked"
MODULE_RE = re.compile(r"['\"]([^'\"]+\.js)['\"]")
DEF_RE = re.compile(
    r"(?:FloatBallAppWM\.prototype|proto)\.snapToEdgeDocked\s*=\s*function\b"
)
CALL_RE = re.compile(r"\.\s*snapToEdgeDocked\s*\(")
CAPTURE_RE = re.compile(
    r"=\s*(?:this|self|proto|FloatBallAppWM\.prototype)\.snapToEdgeDocked\b"
)
DYNAMIC_RE = re.compile(r"\[\s*(['\"])snapToEdgeDocked\1\s*\]")


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
        fail("function opening brace missing: " + marker)
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
    fail("function closing brace missing: " + marker)


def collect_sources(modules):
    result = {}
    for name in modules:
        raw = read(CODE_DIR / name)
        result[name] = {"raw": raw, "masked": mask_comments_and_strings(raw)}
    return result


def require_markers(body, markers, label):
    for marker in markers:
        if marker not in body:
            fail(label + " marker missing: " + marker)


def verify():
    entry = read(ENTRY)
    modules = parse_modules(entry)
    if "th_09_animation.js" not in modules or "th_19_position_state.js" not in modules:
        fail("th_09/th_19 missing from ToolHub.js")
    if modules.index("th_09_animation.js") >= modules.index("th_19_position_state.js"):
        fail("th_19 must load after th_09")

    sources = collect_sources(modules)
    definitions = []
    calls = 0
    call_files = []
    captures = []
    dynamic_refs = []
    code_instances = []
    for name in modules:
        raw = sources[name]["raw"]
        masked = sources[name]["masked"]
        count = len(DEF_RE.findall(masked))
        definitions.extend([name] * count)
        call_count = len(CALL_RE.findall(masked))
        calls += call_count
        if call_count:
            call_files.append((name, call_count))
        if CAPTURE_RE.search(masked):
            captures.append(name)
        if DYNAMIC_RE.search(raw):
            dynamic_refs.append(name)
        if re.search(r"\bnew\s+FloatBallAppWM\s*\(", masked):
            code_instances.append(name)

    expected_chain = ["th_09_animation.js", "th_19_position_state.js"]
    if definitions != expected_chain:
        fail("definition chain mismatch: %r" % definitions)
    if calls != 2:
        fail("expected 2 dynamic calls, got %d (%r)" % (calls, call_files))
    if sorted(call_files) != sorted([
        ("th_05_persistence.js", 1),
        ("th_09_animation.js", 1),
    ]):
        fail("unexpected call files: %r" % call_files)
    if captures:
        fail("old method object capture found: %r" % captures)
    if dynamic_refs:
        fail("dynamic property reference found: %r" % dynamic_refs)
    if code_instances:
        fail("FloatBallAppWM instance created inside code modules: %r" % code_instances)
    if not re.search(r"\bnew\s+FloatBallAppWM\s*\(", mask_comments_and_strings(entry)):
        fail("ToolHub.js instance creation signal missing")

    data = json.loads(read(BOUNDARIES))
    records = [r for r in data.get("duplicateDefinitions", []) if r.get("method") == METHOD]
    if len(records) != 1:
        fail("expected one boundary record for snapToEdgeDocked")
    record = records[0]
    if record.get("definitions") != expected_chain:
        fail("boundary definitions mismatch")
    if record.get("effectiveOwner") != "th_19_position_state.js":
        fail("effective owner mismatch")
    if record.get("type") != "temporary_override":
        fail("boundary type mismatch")

    th05 = read(TH05)
    th09 = read(TH09)
    th19 = read(TH19)
    old_body = extract_function(
        th09,
        "FloatBallAppWM.prototype.snapToEdgeDocked = function(withAnim, forceSide)",
    )
    final_body = extract_function(
        th19,
        "proto.snapToEdgeDocked = function(withAnim)",
    )
    apply_body = extract_function(
        th19,
        "proto.applyConfiguredBallPosition = function(withAnim, reason)",
    )
    timer_body = extract_function(
        th09,
        "FloatBallAppWM.prototype.armDockTimer = function()",
    )
    effect_body = extract_function(
        th05,
        "FloatBallAppWM.prototype.applyImmediateEffectsForKey = function(k)",
    )
    touch_body = extract_function(
        th19,
        "proto.setupTouchListener = function()",
    )
    reflow_body = extract_function(
        th19,
        "proto.onScreenChangedReflow = function(reason)",
    )

    require_markers(old_body, [
        'forceSide === "left"',
        'forceSide === "right"',
        "var centerX = this.state.ballLp.x",
        "this.state.dockSide = \"left\"",
        "this.state.dockSide = \"right\"",
        "this.animateBallLayout(",
        "this.savePos(this.state.ballLp.x, this.state.ballLp.y)",
    ], "old implementation")
    if "getConfiguredBallPosition" in old_body:
        fail("old implementation unexpectedly uses configured position")

    require_markers(final_body, [
        'return this.applyConfiguredBallPosition(!!withAnim, "snap")',
    ], "final implementation")
    if "forceSide" in final_body or "savePos(" in final_body:
        fail("final snap implementation must not guess side or persist pixels")

    require_markers(apply_body, [
        "var pos = this.getConfiguredBallPosition();",
        "this.cancelDockTimer();",
        'this.cancelBallLayoutAnimation("apply:"',
        "this.state.docked = true;",
        "this.state.dockSide = pos.side;",
        "this.state.ballLp.height = pos.ballSize;",
        "this.state.ballContent.setX(pos.side === \"left\" ? -pos.hiddenPx : 0)",
        "this.state.ballContent.setAlpha",
        "if (withAnim && this.config.ENABLE_ANIMATIONS)",
        "this.animateBallLayout(pos.dockWindowX, pos.y, pos.visiblePx",
        "this.state.wm.updateViewLayout(this.state.ballRoot, this.state.ballLp);",
    ], "configured position")
    if "savePos(" in apply_body or "forceSide" in apply_body:
        fail("configured position must not persist pixels or accept forced side")

    require_markers(timer_body, [
        "if (this.state.docked) return;",
        "if (self.state.dragging) return;",
        "PANEL_IDLE_CLOSE_AND_DOCK_MS",
        "DOCK_AFTER_IDLE_MS",
        "if (self.config.ENABLE_SNAP_TO_EDGE)",
        "self.snapToEdgeDocked(true);",
    ], "dock timer")
    require_markers(effect_body, [
        'if (k === "EDGE_VISIBLE_RATIO")',
        "this.state.docked = false;",
        "this.snapToEdgeDocked(false);",
    ], "edge visible ratio")
    require_markers(touch_body, [
        'self.applyConfiguredBallPosition(false, "pointer_start")',
        'self.applyConfiguredBallPosition(true, "pointer_end")',
        'self.applyConfiguredBallPosition(true, "gesture_cancel")',
    ], "pointer position restore")
    require_markers(reflow_body, [
        'this.applyConfiguredBallPosition(false, "screen_reflow:"',
    ], "screen reflow restore")

    report = """# `th_09` 吸边候选分析

## 结论

- `th_09_animation.js` 的 `snapToEdgeDocked` 不会进入已创建实例的运行链。
- `th_19_position_state.js` 在实例创建前直接覆盖该方法，没有模块捕获旧函数对象。
- 两个调用入口都通过实例属性动态分派：闲置吸边计时器和 `EDGE_VISIBLE_RATIO` 即时生效。
- `th_09` 旧实现根据当前像素位置猜测左右侧，并在非动画路径保存临时像素坐标，与固定位置配置模型冲突。
- `th_19` 最终实现统一委托 `applyConfiguredBallPosition()`，按配置侧边和百分比恢复位置，并复用受 token 保护的动画。
- 指针开始、指针结束、手势取消和屏幕重排直接调用配置位置恢复，不依赖旧吸边实现。
- 静态删除门槛通过；本阶段不修改运行时代码。

## 定义与加载顺序

```text
th_09_animation.js：旧按当前坐标判断左右侧的通用吸边
  ↓ 被直接覆盖
th_19_position_state.js：固定侧边和百分比位置的最终实现
  ↓
FloatBallAppWM 实例创建
```

- 定义链：`th_09_animation.js → th_19_position_state.js`。
- `code/*.js` 中实例创建：`0`。
- 旧方法对象捕获：`0`。
- 动态字符串/方括号引用：`0`。

## 调用入口

|入口|模块|调用|运行时行为|
|---|---|---|---|
|闲置吸边计时器|`th_09_animation.js`|`self.snapToEdgeDocked(true)`|动态调用 `th_19`，按配置位置动画恢复|
|可见比例即时生效|`th_05_persistence.js`|`this.snapToEdgeDocked(false)`|动态调用 `th_19`，按配置位置立即恢复|

调用方没有传入 `forceSide`，旧实现的强制侧边参数没有外部使用者。

## 指针和屏幕变化链

- 指针启动：`applyConfiguredBallPosition(false, "pointer_start")`。
- 指针结束：`applyConfiguredBallPosition(true, "pointer_end")`。
- 非指针拖动取消：`applyConfiguredBallPosition(true, "gesture_cancel")`。
- 屏幕变化：`applyConfiguredBallPosition(false, "screen_reflow:...")`。

这些关键链路均直接使用最终配置位置状态机，不经过 `th_09.snapToEdgeDocked`。

## 旧实现风险

- 根据悬浮球当前中心点判断左右侧，可能偏离 `BALL_POSITION_SIDE`。
- 使用当前像素 `y`，不能保证恢复 `BALL_POSITION_PERCENT`。
- 非动画路径调用 `savePos()`，与固定位置模式不再持久化像素坐标的规则冲突。
- 自行管理 `docked`、`dockSide`、透明度和宽度，重复固定位置状态机职责。
- 动画开关只由调用参数控制，没有统一结合 `ENABLE_ANIMATIONS`。

## 最终实现保障

- `snapToEdgeDocked()` 只委托 `applyConfiguredBallPosition()`。
- 位置由 `getConfiguredBallPosition()` 根据侧边、百分比和当前屏幕尺寸计算。
- 应用前取消闲置计时器和旧布局动画。
- 动画仅在调用参数和 `ENABLE_ANIMATIONS` 同时允许时启用。
- 非动画路径直接更新同一组 `LayoutParams`，不保存临时像素坐标。
- 指针、旋转和设置变更共享同一个位置恢复入口。

## 处理门槛

后续处理 PR 必须继续通过模块边界、`th_09` 独立审查、位置状态、指针回归、ES5、JavaScript 语法、manifest 和 RSA 签名校验。

## 使用方式

```bash
python3 scripts/verify_th09_snap_to_edge_docked.py --write TH09_SNAP_TO_EDGE_DOCKED_ANALYSIS.md
python3 scripts/verify_th09_snap_to_edge_docked.py --check TH09_SNAP_TO_EDGE_DOCKED_ANALYSIS.md
```
"""
    return report


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--write", metavar="PATH")
    group.add_argument("--check", metavar="PATH")
    args = parser.parse_args()
    report = verify()

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
            fail("%s is stale" % target.relative_to(ROOT))
        print("OK th09_snap_to_edge_docked_analysis=%s" % target.relative_to(ROOT))
        return 0
    sys.stdout.write(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
