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
DEFAULT_REPORT = ROOT / "POSITION_TRANSITION_AUDIT.md"

OWNER = "th_19_position_state.js"
TRANSITION_MODULE = "th_15_extra.js"
BETWEEN_MODULES = [
    "th_15_extra.js",
    "th_16_entry.js",
    "th_17_pointer.js",
    "th_18_pointer_ocr.js",
    "th_19_position_state.js",
]
EXPECTED_DEFINITIONS = {
    "applyConfiguredBallPosition": [TRANSITION_MODULE, OWNER],
    "cancelConfiguredBallPositionApply": [TRANSITION_MODULE, OWNER],
    "createBallLayoutParams": [TRANSITION_MODULE, TRANSITION_MODULE, OWNER],
    "getConfiguredBallPosition": [TRANSITION_MODULE, OWNER],
    "isBallPositionEffectKey": [TRANSITION_MODULE, OWNER],
    "loadSavedPos": [TRANSITION_MODULE, OWNER],
    "scheduleConfiguredBallPositionApply": [TRANSITION_MODULE, OWNER],
    "snapToEdgeDocked": ["th_09_animation.js", TRANSITION_MODULE, OWNER],
}

MODULE_RE = re.compile(r"var\s+modules\s*=\s*\[(.*?)\]\s*;", re.S)
MODULE_ITEM_RE = re.compile(r'"([^\"]+\.js)"|\'([^\']+\.js)\'')
DEF_RE_TEMPLATE = r"(?:FloatBallAppWM\.prototype|proto)\.%s\s*=\s*function\b"


def fail(message):
    print("FAIL:", message)
    sys.exit(1)


def require(condition, message):
    if not condition:
        fail(message)


def read(path):
    if not path.exists():
        fail(str(path.relative_to(ROOT)) + " missing")
    return path.read_text(encoding="utf-8")


def parse_modules(entry_text):
    match = MODULE_RE.search(entry_text)
    if not match:
        fail("ToolHub.js modules array missing")
    modules = []
    for left, right in MODULE_ITEM_RE.findall(match.group(1)):
        modules.append(left or right)
    return modules


def definition_count(source, method):
    return len(re.findall(DEF_RE_TEMPLATE % re.escape(method), source))


def find_record(boundaries, method):
    matches = [
        record for record in boundaries.get("duplicateDefinitions", [])
        if str(record.get("method", "")) == method
    ]
    require(len(matches) == 1, "boundary record count for %s is %d" % (method, len(matches)))
    return matches[0]


def validate_entry(entry_text, modules):
    indexes = [modules.index(name) for name in BETWEEN_MODULES]
    require(indexes == list(range(indexes[0], indexes[0] + len(BETWEEN_MODULES))),
            "th_15..th_19 modules are not adjacent and ordered")

    modules_pos = entry_text.index("var modules =")
    load_loop_pos = entry_text.index("for (var i = 0; i < modules.length; i++)", modules_pos)
    load_call_pos = entry_text.index("loadScript(modules[i]);", load_loop_pos)
    notify_pos = entry_text.index("notifyToolHubModulesLoaded();", load_call_pos)
    out_pos = entry_text.index("var __out = (function()", notify_pos)
    entry_new_pos = entry_text.index("var app = new FloatBallAppWM(logger);", out_pos)
    require(load_loop_pos < load_call_pos < notify_pos < out_pos < entry_new_pos,
            "cold-start module load must complete before app construction")

    reload_start = entry_text.index("function reloadLocalToolHubModulesForRestart()")
    restart_start = entry_text.index("function restartToolHubFromSettings()", reload_start)
    reload_body = entry_text[reload_start:restart_start]
    require("for (var i = 0; i < modules.length; i++)" in reload_body,
            "restart reload loop missing")
    require("geval(String(code));" in reload_body,
            "restart module eval missing")

    out_start = entry_text.index("var __out = (function()", restart_start)
    restart_body = entry_text[restart_start:out_start]
    reload_call = restart_body.index("reloadLocalToolHubModulesForRestart();")
    restart_new = restart_body.index("var app = new FloatBallAppWM(logger);")
    require(reload_call < restart_new,
            "restart must reload all modules before app construction")

    require(entry_text.count("new FloatBallAppWM(") == 2,
            "unexpected FloatBallAppWM construction site count")

    return {
        "cold_load_loop": True,
        "restart_reload_loop": True,
        "construction_sites": 2,
    }


def validate_sources(modules, boundaries):
    sources = {name: read(CODE_DIR / name) for name in modules}

    constructors = []
    for name, source in sources.items():
        if "new FloatBallAppWM(" in source:
            constructors.append(name)
    require(not constructors,
            "module files must not construct FloatBallAppWM: %s" % ",".join(constructors))

    rows = []
    for method, expected in EXPECTED_DEFINITIONS.items():
        record = find_record(boundaries, method)
        actual_boundary = list(record.get("definitions") or [])
        require(actual_boundary == expected,
                "boundary definitions mismatch for %s: %r" % (method, actual_boundary))
        require(str(record.get("effectiveOwner", "")) == OWNER,
                "effective owner mismatch for %s" % method)

        count_15 = definition_count(sources[TRANSITION_MODULE], method)
        count_19 = definition_count(sources[OWNER], method)
        expected_15 = expected.count(TRANSITION_MODULE)
        expected_19 = expected.count(OWNER)
        require(count_15 == expected_15,
                "%s th_15 definition count=%d expected=%d" % (method, count_15, expected_15))
        require(count_19 == expected_19,
                "%s th_19 definition count=%d expected=%d" % (method, count_19, expected_19))

        direct_assignment = "proto.%s = function" % method
        require(direct_assignment in sources[OWNER],
                "%s is not a direct th_19 prototype assignment" % method)

        rows.append({
            "method": method,
            "th15": count_15,
            "th19": count_19,
            "boundary": " → ".join(expected),
        })

    middle_sources = {
        name: sources[name]
        for name in ("th_16_entry.js", "th_17_pointer.js", "th_18_pointer_ocr.js")
    }
    for method in EXPECTED_DEFINITIONS:
        proto_call = re.compile(
            r"(?:FloatBallAppWM\.prototype|proto)\.%s\s*\(" % re.escape(method)
        )
        offenders = [name for name, source in middle_sources.items() if proto_call.search(source)]
        require(not offenders,
                "load-time prototype invocation risk for %s in %s" % (method, ",".join(offenders)))

    return rows


def render_report(modules, entry_result, rows):
    lines = []
    lines.append("# ToolHub-FloatBall 固定位置过渡实现加载期审查")
    lines.append("")
    lines.append("## 结论")
    lines.append("")
    lines.append("- **静态加载期证明：通过。** `th_15_extra.js` 的 B 级固定位置过渡实现会在 `th_19_position_state.js` 加载前短暂存在，但该窗口内不会创建 `FloatBallAppWM` 实例。")
    lines.append("- **首次启动：通过。** 24 个模块同步加载完成后，入口才创建实例并调用 `startAsync()`。")
    lines.append("- **设置重启：通过。** 重启流程先重新执行全部模块，再创建新实例。")
    lines.append("- **真机位置基线：待完成。** 在真机基线完成前，不删除 B 级过渡实现。")
    lines.append("")
    lines.append("## 加载顺序证据")
    lines.append("")
    lines.append("```text")
    lines.append("th_15_extra.js")
    lines.append("  ↓")
    lines.append("th_16_entry.js")
    lines.append("  ↓")
    lines.append("th_17_pointer.js")
    lines.append("  ↓")
    lines.append("th_18_pointer_ocr.js")
    lines.append("  ↓")
    lines.append("th_19_position_state.js")
    lines.append("  ↓")
    lines.append("new FloatBallAppWM(logger)")
    lines.append("  ↓")
    lines.append("app.startAsync(...)")
    lines.append("```")
    lines.append("")
    lines.append("- 模块总数：`%d`" % len(modules))
    lines.append("- 已验证实例创建点：`%d`（首次启动、设置重启）" % entry_result["construction_sites"])
    lines.append("- `code/*.js` 内实例创建点：`0`")
    lines.append("- `th_16`、`th_17`、`th_18` 对候选原型的加载期直接调用：`0`")
    lines.append("")
    lines.append("## B 级候选基线")
    lines.append("")
    lines.append("|方法|th_15 定义数|th_19 定义数|当前定义链|加载期结论|")
    lines.append("|---|---:|---:|---|---|")
    for row in rows:
        lines.append("|`%s`|%d|%d|`%s`|实例创建前由 th_19 覆盖|" % (
            row["method"], row["th15"], row["th19"], row["boundary"]
        ))
    lines.append("")
    lines.append("`snapToEdgeDocked` 还包含 `th_09_animation.js` 基础实现；本轮只证明 `th_15` 过渡定义在实例创建前被覆盖，不处理 `th_09`。")
    lines.append("")
    lines.append("## 真机位置基线清单")
    lines.append("")
    lines.append("整组删除 B 级实现前，需在当前 `main` 记录以下结果：")
    lines.append("")
    lines.append("- [ ] 冷启动：左侧 / 右侧固定位置均正确。")
    lines.append("- [ ] 高度：`0%`、`22%`、`50%`、`100%` 均正确且不越界。")
    lines.append("- [ ] 屏幕旋转或配置变化后，悬浮球回到配置位置。")
    lines.append("- [ ] 修改悬浮球尺寸后，位置、可见宽度和半隐藏状态正确。")
    lines.append("- [ ] 动画开启和关闭时，位置结果一致。")
    lines.append("- [ ] 单击打开/关闭主面板后，悬浮球位置不漂移。")
    lines.append("- [ ] 向内拖动启动指针，松手后回到配置位置。")
    lines.append("- [ ] 设置内重启 ToolHub 后，位置与冷启动一致。")
    lines.append("")
    lines.append("建议保存每项的 `apply configured ball position` 日志以及最终 `ball x/y` 日志，作为删除前后对照。")
    lines.append("")
    lines.append("## CI 约束")
    lines.append("")
    lines.append("以下变化会使验证失败：")
    lines.append("")
    lines.append("- `th_15` 到 `th_19` 的模块顺序改变。")
    lines.append("- 模块加载完成前新增实例创建。")
    lines.append("- 设置重启在模块重载前创建实例。")
    lines.append("- `code/*.js` 新增 `FloatBallAppWM` 实例创建。")
    lines.append("- B 级候选的定义数量、定义链或最终所有者改变。")
    lines.append("- `th_16`、`th_17`、`th_18` 新增加载期原型直接调用风险。")
    lines.append("")
    lines.append("## 使用方式")
    lines.append("")
    lines.append("```bash")
    lines.append("python3 scripts/verify_position_transition_load_order.py --write POSITION_TRANSITION_AUDIT.md")
    lines.append("python3 scripts/verify_position_transition_load_order.py --check POSITION_TRANSITION_AUDIT.md")
    lines.append("```")
    lines.append("")
    lines.append("本报告由脚本根据 `ToolHub.js`、`MODULE_BOUNDARIES.json` 和 `code/*.js` 确定性生成。")
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
    boundaries = json.loads(read(BOUNDARIES))
    entry_result = validate_entry(entry_text, modules)
    rows = validate_sources(modules, boundaries)
    report = render_report(modules, entry_result, rows)

    if args.write:
        target = (ROOT / args.write).resolve()
        target.write_text(report, encoding="utf-8")
        print("OK wrote %s" % target.relative_to(ROOT))
        return

    if args.check:
        target = (ROOT / args.check).resolve()
        if not target.exists():
            fail(str(target.relative_to(ROOT)) + " missing")
        if target.read_text(encoding="utf-8") != report:
            fail("%s is stale; regenerate it" % target.relative_to(ROOT))
        print("OK position_transition_load_order methods=%d modules=%d" % (
            len(rows), len(modules)
        ))
        return

    sys.stdout.write(report)


if __name__ == "__main__":
    main()
