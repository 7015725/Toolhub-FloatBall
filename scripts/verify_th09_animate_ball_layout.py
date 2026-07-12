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
TH19 = CODE_DIR / "th_19_position_state.js"
DEFAULT_REPORT = ROOT / "TH09_ANIMATE_BALL_LAYOUT_ANALYSIS.md"
METHOD = "animateBallLayout"
MODULE_RE = re.compile(r"['\"]([^'\"]+\.js)['\"]")
DEF_RE = re.compile(
    r"(?:FloatBallAppWM\.prototype|proto)\.animateBallLayout\s*=\s*function\b"
)
CALL_RE = re.compile(r"\.\s*animateBallLayout\s*\(")
CAPTURE_RE = re.compile(
    r"=\s*(?:this|self|proto|FloatBallAppWM\.prototype)\.animateBallLayout\b"
)
DYNAMIC_RE = re.compile(r"\[\s*(['\"])animateBallLayout\1\s*\]")


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


def verify():
    entry = read(ENTRY)
    modules = parse_modules(entry)
    if "th_09_animation.js" not in modules or "th_19_position_state.js" not in modules:
        fail("th_09/th_19 missing from ToolHub.js")
    if modules.index("th_09_animation.js") >= modules.index("th_19_position_state.js"):
        fail("th_19 must load after th_09")

    sources = collect_sources(modules)
    definitions = []
    call_files = []
    calls = 0
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
    if calls != 5:
        fail("expected 5 dynamic calls, got %d (%r)" % (calls, call_files))
    if sorted(call_files) != sorted([
        ("th_09_animation.js", 4),
        ("th_19_position_state.js", 1),
    ]):
        fail("unexpected call files: %r" % call_files)
    if captures:
        fail("old method object capture found: %r" % captures)
    if dynamic_refs:
        fail("dynamic property reference found: %r" % dynamic_refs)
    if code_instances:
        fail("FloatBallAppWM instance created inside code modules: %r" % code_instances)
    entry_instances = len(re.findall(r"\bnew\s+FloatBallAppWM\s*\(", mask_comments_and_strings(entry)))
    if entry_instances < 1:
        fail("ToolHub.js instance creation signal missing")

    data = json.loads(read(BOUNDARIES))
    records = [r for r in data.get("duplicateDefinitions", []) if r.get("method") == METHOD]
    if len(records) != 1:
        fail("expected one boundary record for animateBallLayout")
    record = records[0]
    if record.get("definitions") != expected_chain:
        fail("boundary definitions mismatch")
    if record.get("effectiveOwner") != "th_19_position_state.js":
        fail("effective owner mismatch")
    if record.get("type") != "temporary_override":
        fail("boundary type mismatch")

    th09 = read(TH09)
    th19 = read(TH19)
    old_body = extract_function(
        th09,
        "FloatBallAppWM.prototype.animateBallLayout = function(toX, toY, toW, durMs, endCb)",
    )
    final_body = extract_function(
        th19,
        "proto.animateBallLayout = function(toX, toY, toW, durMs, endCb)",
    )
    cancel_body = extract_function(
        th19,
        "proto.cancelBallLayoutAnimation = function(reason)",
    )

    old_required = [
        "AnimatorUpdateListener",
        "Animator.AnimatorListener",
        "onAnimationCancel",
        "onAnimationEnd",
        "self.state.ballAnimator = null",
        "self.savePos(self.state.ballLp.x, self.state.ballLp.y)",
    ]
    for marker in old_required:
        if marker not in old_body:
            fail("old implementation marker missing: " + marker)
    for forbidden in (
        "ballAnimationToken",
        "cancelBallLayoutAnimation",
        "self.state.ballAnimator !== va",
        "cancelled",
    ):
        if forbidden in old_body:
            fail("old implementation unexpectedly contains final guard: " + forbidden)

    final_required = [
        'this.cancelBallLayoutAnimation("replace")',
        "st.ballAnimationToken = token",
        "var cancelled = false",
        "if (cancelled || self.state.closing || !self.state.addedBall) return;",
        "if (Number(self.state.ballAnimationToken || 0) !== token) return;",
        "if (self.state.ballAnimator !== va) return;",
        "cancelled = true",
        "if (cancelled) return;",
        "try { if (endCb) endCb(); } catch (eCb) {}",
    ]
    for marker in final_required:
        if marker not in final_body:
            fail("final implementation guard missing: " + marker)
    if "savePos(" in final_body:
        fail("final animation must not persist temporary pixel coordinates")
    if "ballAnimationToken" not in cancel_body or "animator.cancel()" not in cancel_body:
        fail("cancelBallLayoutAnimation must invalidate token and cancel animator")

    report = """# `th_09` 动画布局候选分析

## 结论

- `th_09_animation.js` 的 `animateBallLayout` 不会进入已创建实例的运行链。
- `th_19_position_state.js` 在实例创建前直接覆盖该方法，没有模块捕获旧函数对象。
- 5 次调用全部通过实例属性动态分派，运行时指向 `th_19`。
- `th_09` 旧实现没有动画 token 和 animator 身份保护，取消后仍可能进入结束回调并写回旧坐标，同时保存临时像素位置。
- `th_19` 已完整承担动画替换、取消、token 失效、逐帧身份校验、结束回调保护和失败回退。
- 静态删除门槛通过；本阶段不修改运行时代码。

## 定义与加载顺序

```text
th_09_animation.js：旧 ValueAnimator 实现
  ↓ 被直接覆盖
th_19_position_state.js：固定位置状态机最终动画实现
  ↓
FloatBallAppWM 实例创建
```

- 定义链：`th_09_animation.js → th_19_position_state.js`。
- `code/*.js` 中实例创建：`0`。
- `ToolHub.js` 实例创建信号：`%d`。
- 旧方法对象捕获：`0`。
- 动态字符串/方括号引用：`0`。

## 调用分布

|模块|调用次数|分派方式|
|---|---:|---|
|`th_09_animation.js`|4|`this.animateBallLayout(...)`，用于旧吸边与展开调用点|
|`th_19_position_state.js`|1|`this.animateBallLayout(...)`，用于配置位置动画|

全部调用在实例运行期读取当前原型方法，没有保存旧函数对象。

## 旧实现风险

- `onAnimationCancel()` 只清空 `ballAnimator`，没有标记取消状态。
- `onAnimationEnd()` 不校验 token、animator 身份或取消状态。
- 被替换或取消的动画仍可能写回旧 `toX/toY/toW`。
- 动画结束和异常回退都会调用 `savePos()`，与固定位置模式冲突。
- 没有统一取消上一动画，连续动画可能竞争更新 WindowManager。

## 最终实现保障

- 调用前执行 `cancelBallLayoutAnimation("replace")`。
- 每次动画生成新的 `ballAnimationToken`。
- 更新回调同时校验取消状态、token 和 animator 身份。
- 结束回调在写入最终坐标和调用 `endCb` 前重复校验。
- 取消操作先使 token 失效，再取消旧 animator。
- 不持久化临时像素坐标。
- 创建动画失败时只在当前 token 仍有效时执行同步回退。

## 处理门槛

后续处理 PR 必须继续通过模块边界、`th_09` 独立审查、位置状态、指针回归、ES5、JavaScript 语法、manifest 和 RSA 签名校验。

## 使用方式

```bash
python3 scripts/verify_th09_animate_ball_layout.py --write TH09_ANIMATE_BALL_LAYOUT_ANALYSIS.md
python3 scripts/verify_th09_animate_ball_layout.py --check TH09_ANIMATE_BALL_LAYOUT_ANALYSIS.md
```
""" % entry_instances
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
        print("OK th09_animate_ball_layout_analysis=%s" % target.relative_to(ROOT))
        return 0
    sys.stdout.write(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
