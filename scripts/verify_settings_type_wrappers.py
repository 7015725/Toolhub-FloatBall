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
DEFAULT_REPORT = ROOT / "SETTINGS_TYPE_WRAPPER_ANALYSIS.md"
MODULE_RE = re.compile(r"['\"]([^'\"]+\.js)['\"]")
PROTO_DEF_RE = re.compile(r"(?:FloatBallAppWM\.prototype|proto)\.([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*function\s*\(")


def fail(message):
    print("FAIL:", message)
    raise SystemExit(1)


def read(path):
    if not path.exists():
        fail(str(path.relative_to(ROOT)) + " missing")
    return path.read_text(encoding="utf-8")


def parse_modules(entry_text):
    modules = []
    seen = set()
    for item in MODULE_RE.findall(entry_text):
        name = Path(item).name
        if not re.match(r"^th_\d+_.+\.js$", name):
            continue
        if name not in seen:
            modules.append(name)
            seen.add(name)
    if len(modules) < 20:
        fail("ToolHub module list incomplete")
    return modules


def load_sources(modules):
    return {name: read(CODE_DIR / name) for name in modules}


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


def find_function(text, marker):
    start = text.find(marker)
    if start < 0:
        fail("missing marker: " + marker)
    brace = text.find("{", start)
    if brace < 0:
        fail("missing function brace: " + marker)
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
                state = "line"
                i += 2
                continue
            if ch == "/" and nxt == "*":
                state = "block"
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
        if state == "line":
            if ch in "\r\n":
                state = "code"
            i += 1
            continue
        if state == "block":
            if ch == "*" and nxt == "/":
                state = "code"
                i += 2
            else:
                i += 1
            continue
        if state == "string":
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                state = "code"
            i += 1
    fail("unterminated function: " + marker)


def definition_chain(method, modules, sources):
    pattern = re.compile(r"(?:FloatBallAppWM\.prototype|proto)\.%s\s*=\s*function\s*\(" % re.escape(method))
    return [name for name in modules if pattern.search(mask_comments_and_strings(sources[name]))]


def signal_counts(method, sources):
    call_re = re.compile(r"\b(?:this|self)\.%s\s*\(" % re.escape(method))
    prop_re = re.compile(r"\.%s\b" % re.escape(method))
    dynamic_re = re.compile(r"\[\s*['\"]%s['\"]\s*\]" % re.escape(method))
    calls = {}
    properties = {}
    dynamic = {}
    for name, source in sources.items():
        masked = mask_comments_and_strings(source)
        call_count = len(call_re.findall(masked))
        prop_count = len(prop_re.findall(masked))
        dyn_count = len(dynamic_re.findall(source))
        if call_count:
            calls[name] = call_count
        if prop_count:
            properties[name] = prop_count
        if dyn_count:
            dynamic[name] = dyn_count
    return calls, properties, dynamic


def find_boundary(data, method):
    rows = [row for row in data.get("duplicateDefinitions", []) if row.get("method") == method]
    if len(rows) != 1:
        fail(method + " boundary record count=" + str(len(rows)))
    return rows[0]


def require_all(text, markers, label):
    missing = [item for item in markers if item not in text]
    if missing:
        fail(label + " missing: " + ", ".join(missing))


def collect():
    entry_text = read(ENTRY)
    modules = parse_modules(entry_text)
    sources = load_sources(modules)
    data = json.loads(read(BOUNDARIES))

    required_order = [
        "th_05_persistence.js",
        "th_12_rebuild.js",
        "th_15_extra.js",
        "th_19_position_state.js",
    ]
    indexes = [modules.index(name) for name in required_order]
    if indexes != sorted(indexes):
        fail("settings wrapper module order mismatch")

    for name, source in sources.items():
        if re.search(r"\bnew\s+FloatBallAppWM\s*\(", mask_comments_and_strings(source)):
            fail("module creates FloatBallAppWM instance: " + name)
    instance_signals = len(re.findall(r"\bnew\s+FloatBallAppWM\s*\(", mask_comments_and_strings(entry_text)))
    if instance_signals < 1:
        fail("ToolHub instance creation missing")

    expected_chains = {
        "setPendingValue": ["th_05_persistence.js", "th_12_rebuild.js"],
        "applyImmediateEffectsForKey": ["th_05_persistence.js", "th_12_rebuild.js", "th_15_extra.js"],
    }
    rows = {}
    for method, expected in expected_chains.items():
        actual = definition_chain(method, modules, sources)
        if actual != expected:
            fail(method + " definition chain mismatch: " + " -> ".join(actual))
        record = find_boundary(data, method)
        if record.get("definitions") != expected:
            fail(method + " boundary definitions mismatch")
        if record.get("effectiveOwner") != expected[-1]:
            fail(method + " effective owner mismatch")
        wrappers = record.get("wrappers") or []
        if len(wrappers) != len(expected) - 1:
            fail(method + " wrapper count mismatch")
        calls, properties, dynamic = signal_counts(method, sources)
        if dynamic:
            fail(method + " dynamic reference found")
        rows[method] = {
            "chain": actual,
            "calls": calls,
            "properties": properties,
            "dynamic": dynamic,
            "wrappers": wrappers,
        }

    th05 = sources["th_05_persistence.js"]
    th12 = sources["th_12_rebuild.js"]
    th13 = sources["th_13_panel_ui.js"]
    th15 = sources["th_15_extra.js"]

    pending_base = find_function(th05, "FloatBallAppWM.prototype.setPendingValue = function(k, v)")
    pending_wrapper = find_function(th12, "proto.setPendingValue = function(k, v)")
    apply_base = find_function(th05, "FloatBallAppWM.prototype.applyImmediateEffectsForKey = function(k)")
    apply_middle = find_function(th12, "proto.applyImmediateEffectsForKey = function(k)")
    apply_final = find_function(th15, "proto.applyImmediateEffectsForKey = function(k)")

    require_all(pending_base, [
        "this.state.pendingUserCfg[k] = v",
        "this.state.pendingDirty = true",
        "this.refreshPreview(k)",
    ], "setPendingValue base")
    require_all(pending_wrapper, [
        "oldSetPendingValue.call(this, k",
        "__toolHubNormalizeSettingValue",
        "normalizeEnumValueBySchema",
    ], "setPendingValue wrapper")
    require_all(th12, [
        "function normalizeEnumValueBySchema(key, value)",
        "ConfigValidator.validate = function(key, value)",
        "normalizeEnumValueBySchema(key, value)",
        "proto.__toolHubNormalizeSettingValue = function(k, v)",
    ], "enum normalization")
    require_all(th13, [
        "self.setPendingValue(item.key, String(opt.value))",
        "if (String(opt.value) === curVal)",
    ], "single_choice UI")

    require_all(apply_base, [
        'k === "LOG_ENABLE"',
        'k === "LOG_DEBUG"',
        'k === "LOG_KEEP_DAYS"',
        'k === "EDGE_VISIBLE_RATIO"',
        "this.rebuildBallForNewSize()",
    ], "apply base")
    require_all(apply_middle, [
        "oldApplyImmediateEffectsForKey.call(this, key)",
        "this.isThemeEffectKey",
        "this.isPanelLayoutEffectKey",
        "this.isPointerEffectKey",
        "this.isBallVisualEffectKey",
        "this.refreshPointerAfterSettingsChanged",
        "this.scheduleSettingsEffectRefresh",
        'key === "BALL_IDLE_ALPHA"',
        'key === "EDGE_VISIBLE_RATIO"',
    ], "apply middle wrapper")
    require_all(apply_final, [
        "this.isBallPositionEffectKey",
        "this.scheduleConfiguredBallPositionApply",
        "oldApplyImmediateEffectsForKey.call(this, k)",
    ], "apply final wrapper")

    helper_methods = [
        "isThemeEffectKey",
        "isPanelLayoutEffectKey",
        "isPointerEffectKey",
        "isBallVisualEffectKey",
        "refreshPointerAfterSettingsChanged",
        "refreshVisiblePanelsAfterSettingsChanged",
        "scheduleSettingsEffectRefresh",
    ]
    for method in helper_methods:
        chain = definition_chain(method, modules, sources)
        if chain != ["th_12_rebuild.js"]:
            fail(method + " helper owner mismatch: " + " -> ".join(chain))

    if "new java.lang.Thread" not in th12 or "installSettingsEffectPatch()" not in th12:
        fail("settings patch retry installer missing")

    return {
        "modules": modules,
        "instance_signals": instance_signals,
        "rows": rows,
        "helper_methods": helper_methods,
        "single_choice_stringifies": True,
    }


def fmt_map(data):
    if not data:
        return "无"
    return "、".join("`%s`×%d" % (key, value) for key, value in sorted(data.items()))


def render(info):
    pending = info["rows"]["setPendingValue"]
    apply_row = info["rows"]["applyImmediateEffectsForKey"]
    lines = []
    lines.append("# 设置与类型包装链专项分析")
    lines.append("")
    lines.append("## 结论")
    lines.append("")
    lines.append("- `setPendingValue` 与 `applyImmediateEffectsForKey` 的包装职责均有效，不能直接删除行为。")
    lines.append("- 两条链可以通过“完整逻辑并回 `th_05_persistence.js`”收敛，避免运行时连续覆盖原型方法。")
    lines.append("- `th_12_rebuild.js` 应只保留兼容 Schema/default 与 `ConfigValidator.validate` 枚举类型修正。")
    lines.append("- `th_15_extra.js` 的固定位置即时生效分支可并入 `th_05` 最终设置分派。")
    lines.append("- 全部 `code/*.js` 在模块加载期不创建实例；设置交互发生在 `th_19` 加载完成之后。")
    lines.append("- 静态收敛门槛通过；本阶段不修改运行时代码。")
    lines.append("")
    lines.append("## 定义与加载顺序")
    lines.append("")
    lines.append("```text")
    lines.append("th_05_persistence.js：基础 pending 与即时生效")
    lines.append("  ↓")
    lines.append("th_12_rebuild.js：枚举类型、主题/面板/指针刷新包装")
    lines.append("  ↓")
    lines.append("th_15_extra.js：固定位置设置包装")
    lines.append("  ↓")
    lines.append("th_19_position_state.js：固定位置最终状态机")
    lines.append("  ↓")
    lines.append("FloatBallAppWM 实例创建")
    lines.append("```")
    lines.append("")
    lines.append("- `code/*.js` 中实例创建：`0`。")
    lines.append("- `ToolHub.js` 实例创建信号：`%d`。" % info["instance_signals"])
    lines.append("- `setPendingValue` 定义链：`%s`。" % " → ".join(pending["chain"]))
    lines.append("- `applyImmediateEffectsForKey` 定义链：`%s`。" % " → ".join(apply_row["chain"]))
    lines.append("")
    lines.append("## 当前调用信号")
    lines.append("")
    lines.append("|方法|直接调用|属性读取|动态引用|旧方法捕获|")
    lines.append("|---|---|---|---:|---:|")
    lines.append("|`setPendingValue`|%s|%s|0|%d|" % (
        fmt_map(pending["calls"]), fmt_map(pending["properties"]), len(pending["wrappers"]),
    ))
    lines.append("|`applyImmediateEffectsForKey`|%s|%s|0|%d|" % (
        fmt_map(apply_row["calls"]), fmt_map(apply_row["properties"]), len(apply_row["wrappers"]),
    ))
    lines.append("")
    lines.append("## 必须保持的行为")
    lines.append("")
    lines.append("1. `single_choice` 即使传入字符串，也必须按 Schema 恢复数字、布尔或字符串枚举原始类型。")
    lines.append("2. `ConfigValidator.validate` 保存路径继续执行同一套枚举类型修正。")
    lines.append("3. pending 值写入、dirty 标记、主题重建、悬浮球预览和 previewMode 刷新顺序不变。")
    lines.append("4. 日志开关、日志保留天数和基础悬浮球视觉设置继续即时生效。")
    lines.append("5. `BALL_IDLE_ALPHA` 继续触发悬浮球重建。")
    lines.append("6. 主题和面板设置继续通过单次 posted refresh 刷新可见页面。")
    lines.append("7. 指针设置继续只刷新活动指针窗口，不重建无关面板。")
    lines.append("8. `BALL_POSITION_SIDE` / `BALL_POSITION_PERCENT` 继续调度配置位置恢复，不进入旧吸边路径。")
    lines.append("9. 设置诊断异常不得阻断保存、预览或即时生效。")
    lines.append("")
    lines.append("## 收敛方案")
    lines.append("")
    lines.append("1. 将枚举 normalizer 提升为 `th_05_persistence.js` 的共享函数，基础 `setPendingValue()` 直接调用。")
    lines.append("2. `th_12` 的 `ConfigValidator.validate` 包装复用同一 normalizer，删除 `setPendingValue` 原型包装和安装标记。")
    lines.append("3. 将 7 个设置效果辅助方法迁入 `th_05_persistence.js`。")
    lines.append("4. 将主题、面板、指针、悬浮球视觉和固定位置分派合并为 `th_05` 唯一 `applyImmediateEffectsForKey()`。")
    lines.append("5. 删除 `th_12` 的 settings effect 原型安装器、重试线程和 `th_15` 固定位置包装。")
    lines.append("6. 将两个方法登记为 `th_05_persistence.js` 单一所有者，受保护包装链预计 `13 → 11`。")
    lines.append("7. 更新专项报告、模块边界、manifest 和 RSA 签名，并运行完整 CI。")
    lines.append("")
    lines.append("## 使用方式")
    lines.append("")
    lines.append("```bash")
    lines.append("python3 scripts/verify_settings_type_wrappers.py --write SETTINGS_TYPE_WRAPPER_ANALYSIS.md")
    lines.append("python3 scripts/verify_settings_type_wrappers.py --check SETTINGS_TYPE_WRAPPER_ANALYSIS.md")
    lines.append("```")
    lines.append("")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Verify settings and enum wrapper chains")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--write", nargs="?", const=str(DEFAULT_REPORT))
    group.add_argument("--check", nargs="?", const=str(DEFAULT_REPORT))
    args = parser.parse_args()

    report = render(collect())
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
    print("OK settings_type_wrappers chains=2 mergeable=2")
    return 0


if __name__ == "__main__":
    sys.exit(main())
