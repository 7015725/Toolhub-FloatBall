#!/usr/bin/env python3
import argparse
import json
import os
import re
import shlex
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

APPLY_RE = re.compile(
    r"apply configured ball position reason=([^\s]*) "
    r"side=(left|right) percent=(-?\d+(?:\.\d+)?) y=(-?\d+)"
)
START_RE = re.compile(
    r"ball x=(-?\d+) y=(-?\d+) sizeDp=(-?\d+(?:\.\d+)?)"
)
FAIL_RE = re.compile(
    r"(apply configured ball position fail|configured position runnable fail|"
    r"ball animation (?:update|end)?\s*fail|start runnable err|addView ball fail)",
    re.IGNORECASE,
)
RELEVANT_MARKERS = (
    "apply configured ball position",
    "configured position",
    "ball x=",
    "start ok",
    "pointer",
    "configuration_changed",
    "screen reflow",
    "ball animation",
    "rebuild",
    "ToolHub 启动",
)

SCENARIOS = [
    {
        "id": "cold_left_22",
        "title": "冷启动：左侧 22%",
        "instruction": (
            "在设置中选择左侧、位置 22%，完全关闭 ToolHub 后重新启动。"
            "确认悬浮球固定在左侧、纵向位置正确且半隐藏宽度正常。"
        ),
        "expected_side": "left",
        "expected_percent": 22,
    },
    {
        "id": "cold_right_22",
        "title": "冷启动：右侧 22%",
        "instruction": (
            "在设置中选择右侧、位置 22%，完全关闭 ToolHub 后重新启动。"
            "确认悬浮球固定在右侧、纵向位置正确且半隐藏宽度正常。"
        ),
        "expected_side": "right",
        "expected_percent": 22,
    },
    {
        "id": "height_right_0",
        "title": "高度：右侧 0%",
        "instruction": "保持右侧，将位置改为 0%。确认悬浮球不越过屏幕顶部且仍可操作。",
        "expected_side": "right",
        "expected_percent": 0,
    },
    {
        "id": "height_right_50",
        "title": "高度：右侧 50%",
        "instruction": "保持右侧，将位置改为 50%。确认悬浮球位于可用纵向范围中点。",
        "expected_side": "right",
        "expected_percent": 50,
    },
    {
        "id": "height_right_100",
        "title": "高度：右侧 100%",
        "instruction": "保持右侧，将位置改为 100%。确认悬浮球不越过屏幕底部且仍可操作。",
        "expected_side": "right",
        "expected_percent": 100,
    },
    {
        "id": "configuration_change",
        "title": "屏幕旋转或配置变化",
        "instruction": (
            "保持当前侧边和高度，触发一次屏幕旋转或系统配置变化，再恢复常用方向。"
            "确认悬浮球回到配置位置且未漂移。"
        ),
    },
    {
        "id": "size_change",
        "title": "修改悬浮球尺寸",
        "instruction": (
            "修改悬浮球尺寸并保存。确认最终位置、可见宽度、半隐藏方向和触摸区域正确。"
        ),
    },
    {
        "id": "animation_on",
        "title": "动画开启",
        "instruction": (
            "开启动画后修改一次侧边或高度。确认动画结束后的位置与配置完全一致。"
        ),
    },
    {
        "id": "animation_off",
        "title": "动画关闭",
        "instruction": (
            "关闭动画后修改一次侧边或高度。确认立即定位结果与动画开启时一致。"
        ),
    },
    {
        "id": "panel_toggle",
        "title": "主面板开关",
        "instruction": "连续打开和关闭主面板，确认悬浮球位置、宽度和半隐藏状态不发生漂移。",
    },
    {
        "id": "pointer_release",
        "title": "指针启动与松手归位",
        "instruction": (
            "从悬浮球向屏幕内拖动启动指针，完成一次取字或取消后松手。"
            "确认悬浮球回到配置侧边和高度。"
        ),
    },
    {
        "id": "settings_restart",
        "title": "设置内重启 ToolHub",
        "instruction": (
            "在设置中执行 ToolHub 重启。确认重启后的侧边、高度、可见宽度与冷启动一致。"
        ),
    },
]

SCENARIO_MAP = {item["id"]: item for item in SCENARIOS}


def run_command(argv, timeout=15):
    try:
        proc = subprocess.run(
            argv,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout,
            check=False,
        )
        return proc.returncode, proc.stdout, proc.stderr
    except (OSError, subprocess.TimeoutExpired) as exc:
        return 127, "", str(exc)


def run_root(command, timeout=20):
    attempts = [
        ["su", "--mount-master", "-c", command],
        ["su", "-c", command],
    ]
    last = (127, "", "su unavailable")
    for argv in attempts:
        code, out, err = run_command(argv, timeout=timeout)
        last = (code, out, err)
        if code == 0:
            return last
    return last


def discover_log_paths():
    paths = []
    env_path = os.environ.get("TOOLHUB_LOG", "").strip()
    if env_path:
        paths.append(env_path)

    command = (
        "find /data/system /data/system_ce /data/user_de /data/user /data/data "
        "-type f -path '*/ToolHub/logs/init.log' 2>/dev/null"
    )
    code, out, _ = run_root(command, timeout=30)
    if code == 0:
        for line in out.splitlines():
            value = line.strip()
            if value:
                paths.append(value)

    unique = []
    seen = set()
    for value in paths:
        if value in seen:
            continue
        seen.add(value)
        unique.append(value)
    return unique


class LogReader:
    def __init__(self, path):
        self.path = str(path)
        self.direct = os.path.isfile(self.path) and os.access(self.path, os.R_OK)

    def read_all(self):
        if self.direct:
            return Path(self.path).read_text(encoding="utf-8", errors="replace")
        command = "cat " + shlex.quote(self.path)
        code, out, err = run_root(command, timeout=20)
        if code != 0:
            raise RuntimeError("无法读取日志：%s" % (err.strip() or self.path))
        return out


def choose_log_path(explicit):
    if explicit:
        return str(explicit)
    paths = discover_log_paths()
    if not paths:
        raise RuntimeError(
            "未找到 ToolHub init.log。请使用 --log 指定路径，"
            "或先确认 Termux 已获得 root 权限。"
        )
    if len(paths) == 1:
        return paths[0]

    print("发现多个 ToolHub 日志：")
    for index, value in enumerate(paths, 1):
        print("  %d. %s" % (index, value))
    while True:
        choice = input("选择日志编号：").strip()
        try:
            index = int(choice)
        except ValueError:
            index = 0
        if 1 <= index <= len(paths):
            return paths[index - 1]
        print("请输入 1-%d。" % len(paths))


def compute_delta(before, after):
    if after.startswith(before):
        return after[len(before):], False
    limit = min(len(before), len(after))
    prefix = 0
    while prefix < limit and before[prefix] == after[prefix]:
        prefix += 1
    if prefix >= 128:
        return after[prefix:], True
    return after, True


def parse_evidence(text):
    applies = []
    starts = []
    failures = []
    relevant = []

    for line in text.splitlines():
        apply_match = APPLY_RE.search(line)
        if apply_match:
            applies.append(
                {
                    "reason": apply_match.group(1),
                    "side": apply_match.group(2),
                    "percent": float(apply_match.group(3)),
                    "y": int(apply_match.group(4)),
                    "line": line,
                }
            )
        start_match = START_RE.search(line)
        if start_match:
            starts.append(
                {
                    "x": int(start_match.group(1)),
                    "y": int(start_match.group(2)),
                    "size_dp": float(start_match.group(3)),
                    "line": line,
                }
            )
        if FAIL_RE.search(line):
            failures.append(line)
        if any(marker in line for marker in RELEVANT_MARKERS):
            relevant.append(line)

    return {
        "applies": applies,
        "starts": starts,
        "failures": failures,
        "relevant_lines": relevant[-80:],
        "latest_apply": applies[-1] if applies else None,
        "latest_start": starts[-1] if starts else None,
    }


def check_expectations(scenario, evidence):
    checks = []
    latest = evidence.get("latest_apply")
    expected_side = scenario.get("expected_side")
    expected_percent = scenario.get("expected_percent")

    if expected_side is not None and latest is not None:
        checks.append(
            {
                "name": "side",
                "expected": expected_side,
                "actual": latest.get("side"),
                "ok": latest.get("side") == expected_side,
            }
        )
    if expected_percent is not None and latest is not None:
        actual = float(latest.get("percent"))
        checks.append(
            {
                "name": "percent",
                "expected": float(expected_percent),
                "actual": actual,
                "ok": abs(actual - float(expected_percent)) < 0.001,
            }
        )
    return checks


def safe_getprop(name):
    code, out, _ = run_command(["getprop", name], timeout=5)
    return out.strip() if code == 0 else ""


def collect_device_info():
    info = {
        "manufacturer": safe_getprop("ro.product.manufacturer"),
        "model": safe_getprop("ro.product.model"),
        "device": safe_getprop("ro.product.device"),
        "android": safe_getprop("ro.build.version.release"),
        "sdk": safe_getprop("ro.build.version.sdk"),
        "build": safe_getprop("ro.build.display.id"),
    }
    for key, command in (
        ("wm_size", "wm size"),
        ("wm_density", "wm density"),
        ("orientation", "dumpsys input | grep -m 1 'SurfaceOrientation'"),
    ):
        code, out, _ = run_root(command, timeout=8)
        info[key] = out.strip() if code == 0 else ""
    return info


def default_output_dir():
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    downloads = Path.home() / "storage" / "downloads"
    base = downloads if downloads.is_dir() else Path.cwd()
    return base / ("toolhub-position-baseline-" + stamp)


def format_number(value):
    if value is None:
        return ""
    number = float(value)
    if number.is_integer():
        return str(int(number))
    return str(number)


def render_markdown(session):
    results = session.get("results", [])
    passed = sum(1 for item in results if item.get("result") == "pass")
    failed = sum(1 for item in results if item.get("result") == "fail")
    skipped = sum(1 for item in results if item.get("result") == "skip")
    pending = len(session.get("selected_scenarios", [])) - len(results)

    lines = [
        "# ToolHub 真机固定位置基线",
        "",
        "## 会话",
        "",
        "- 时间：`%s`" % session.get("created_at", ""),
        "- 日志：`%s`" % session.get("log_path", ""),
        "- 结果：通过 `%d` / 失败 `%d` / 跳过 `%d` / 待执行 `%d`"
        % (passed, failed, skipped, pending),
        "",
        "## 设备",
        "",
    ]

    for key in (
        "manufacturer",
        "model",
        "device",
        "android",
        "sdk",
        "build",
        "wm_size",
        "wm_density",
        "orientation",
    ):
        value = session.get("device", {}).get(key, "")
        lines.append("- %s：`%s`" % (key, value or "未知"))

    lines.extend(
        [
            "",
            "## 场景结果",
            "",
            "|场景|人工结果|reason|side|percent|y|启动 x/y|异常|备注|",
            "|---|---|---|---|---:|---:|---|---:|---|",
        ]
    )

    for item in results:
        evidence = item.get("evidence", {})
        latest_apply = evidence.get("latest_apply") or {}
        latest_start = evidence.get("latest_start") or {}
        start_xy = ""
        if latest_start:
            start_xy = "%s/%s" % (latest_start.get("x"), latest_start.get("y"))
        note = str(item.get("note", "")).replace("|", r"\|").replace("\n", " ")
        lines.append(
            "|%s|%s|%s|%s|%s|%s|%s|%d|%s|"
            % (
                item.get("title", ""),
                item.get("result", ""),
                latest_apply.get("reason", ""),
                latest_apply.get("side", ""),
                format_number(latest_apply.get("percent")),
                latest_apply.get("y", ""),
                start_xy,
                len(evidence.get("failures", [])),
                note,
            )
        )

    lines.extend(["", "## 自动核对", ""])
    any_checks = False
    for item in results:
        checks = item.get("expectation_checks", [])
        if not checks:
            continue
        any_checks = True
        lines.append("- **%s**" % item.get("title", ""))
        for check in checks:
            mark = "通过" if check.get("ok") else "不匹配"
            lines.append(
                "  - `%s`：期望 `%s`，实际 `%s`，%s"
                % (
                    check.get("name"),
                    check.get("expected"),
                    check.get("actual"),
                    mark,
                )
            )
    if not any_checks:
        lines.append("- 本次没有可自动核对的 `apply configured ball position` 记录。")

    lines.extend(
        [
            "",
            "## 判定",
            "",
            "- 本报告中的“人工结果”是最终真机判定。",
            "- 自动核对只检查日志中的 side/percent，不替代可见宽度、越界、漂移和触摸体验检查。",
            "- 任一场景失败或存在位置相关异常日志时，不应删除 `th_15_extra.js` 的 B 级过渡实现。",
            "",
            "原始证据见同目录 `position-baseline-evidence.log`，机器可读数据见 `position-baseline.json`。",
            "",
        ]
    )
    return "\n".join(lines)


def render_raw_evidence(session):
    lines = []
    for index, item in enumerate(session.get("results", []), 1):
        lines.append("=" * 72)
        lines.append("%02d %s [%s]" % (index, item.get("title", ""), item.get("result", "")))
        lines.append("scenario_id=" + item.get("scenario_id", ""))
        lines.append("captured_at=" + item.get("captured_at", ""))
        lines.append("note=" + item.get("note", ""))
        lines.append("-" * 72)
        relevant = item.get("evidence", {}).get("relevant_lines", [])
        if relevant:
            lines.extend(relevant)
        else:
            lines.append("[没有捕获到相关日志]")
        lines.append("")
    return "\n".join(lines)


def write_outputs(session, output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / "position-baseline.json"
    md_path = output_dir / "position-baseline.md"
    evidence_path = output_dir / "position-baseline-evidence.log"

    json_path.write_text(
        json.dumps(session, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    md_path.write_text(render_markdown(session), encoding="utf-8")
    evidence_path.write_text(render_raw_evidence(session), encoding="utf-8")
    return json_path, md_path, evidence_path


def prompt_result():
    while True:
        value = input("结果：[p]通过 [f]失败 [s]跳过：").strip().lower()
        mapping = {
            "p": "pass",
            "pass": "pass",
            "通过": "pass",
            "f": "fail",
            "fail": "fail",
            "失败": "fail",
            "s": "skip",
            "skip": "skip",
            "跳过": "skip",
        }
        if value in mapping:
            return mapping[value]
        print("请输入 p、f 或 s。")


def display_evidence(evidence, checks):
    latest_apply = evidence.get("latest_apply")
    latest_start = evidence.get("latest_start")
    if latest_apply:
        print(
            "最新定位：reason=%s side=%s percent=%s y=%s"
            % (
                latest_apply.get("reason"),
                latest_apply.get("side"),
                format_number(latest_apply.get("percent")),
                latest_apply.get("y"),
            )
        )
    if latest_start:
        print(
            "最新启动：x=%s y=%s sizeDp=%s"
            % (
                latest_start.get("x"),
                latest_start.get("y"),
                format_number(latest_start.get("size_dp")),
            )
        )
    if evidence.get("failures"):
        print("发现 %d 条位置相关异常日志。" % len(evidence["failures"]))
    if not latest_apply and not latest_start:
        print("未捕获到新的定位或启动坐标日志；仍可根据真机表现人工判定。")
    for check in checks:
        if not check.get("ok"):
            print(
                "自动核对不匹配：%s 期望=%s 实际=%s"
                % (check.get("name"), check.get("expected"), check.get("actual"))
            )


def run_collection(args):
    selected_ids = args.scenario or [item["id"] for item in SCENARIOS]
    scenarios = [SCENARIO_MAP[item] for item in selected_ids]
    log_path = choose_log_path(args.log)
    reader = LogReader(log_path)
    reader.read_all()

    output_dir = Path(args.output_dir).expanduser() if args.output_dir else default_output_dir()
    session = {
        "schema": 1,
        "created_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "log_path": log_path,
        "device": collect_device_info(),
        "selected_scenarios": selected_ids,
        "results": [],
    }

    print("日志：" + log_path)
    print("输出：" + str(output_dir))
    print("场景数：%d" % len(scenarios))

    for index, scenario in enumerate(scenarios, 1):
        print("")
        print("=" * 72)
        print("[%d/%d] %s" % (index, len(scenarios), scenario["title"]))
        print(scenario["instruction"])
        input("完成准备后按 Enter 开始本场景记录：")
        before = reader.read_all()
        input("现在执行上述动作；完成并等待悬浮球稳定后按 Enter：")
        time.sleep(0.2)
        after = reader.read_all()
        delta, rotated = compute_delta(before, after)
        evidence = parse_evidence(delta)
        evidence["log_rotated_or_rewritten"] = rotated
        checks = check_expectations(scenario, evidence)
        display_evidence(evidence, checks)
        result = prompt_result()
        note = input("备注（可留空）：").strip()

        session["results"].append(
            {
                "scenario_id": scenario["id"],
                "title": scenario["title"],
                "instruction": scenario["instruction"],
                "captured_at": datetime.now().astimezone().isoformat(timespec="seconds"),
                "result": result,
                "note": note,
                "expectation_checks": checks,
                "evidence": evidence,
            }
        )
        write_outputs(session, output_dir)
        print("已保存。")

    paths = write_outputs(session, output_dir)
    print("")
    print("采集完成：")
    for path in paths:
        print("  " + str(path))
    return 0


def self_test():
    sample = "\n".join(
        [
            "2026-07-12 10:00:00 [I] start ok actionClose=shortx.wm.floatball.CLOSE",
            "2026-07-12 10:00:00 [I] ball x=1010 y=420 sizeDp=48",
            "2026-07-12 10:01:00 [I] apply configured ball position reason=config_update side=right percent=50 y=1080",
            "2026-07-12 10:02:00 [E] apply configured ball position fail: test",
        ]
    )
    evidence = parse_evidence(sample)
    assert evidence["latest_start"]["x"] == 1010
    assert evidence["latest_start"]["y"] == 420
    assert evidence["latest_start"]["size_dp"] == 48.0
    assert evidence["latest_apply"]["reason"] == "config_update"
    assert evidence["latest_apply"]["side"] == "right"
    assert evidence["latest_apply"]["percent"] == 50.0
    assert evidence["latest_apply"]["y"] == 1080
    assert len(evidence["failures"]) == 1

    delta, rotated = compute_delta("abc\n", "abc\ndef\n")
    assert delta == "def\n"
    assert rotated is False
    delta, rotated = compute_delta("old log", "new log")
    assert delta == "new log"
    assert rotated is True

    assert len(SCENARIOS) == 12
    assert len(SCENARIO_MAP) == len(SCENARIOS)
    checks = check_expectations(SCENARIO_MAP["height_right_50"], evidence)
    assert all(item["ok"] for item in checks)

    session = {
        "created_at": "2026-07-12T10:00:00+08:00",
        "log_path": "/tmp/init.log",
        "device": {},
        "selected_scenarios": ["height_right_50"],
        "results": [
            {
                "scenario_id": "height_right_50",
                "title": "高度：右侧 50%",
                "result": "pass",
                "note": "",
                "expectation_checks": checks,
                "evidence": evidence,
            }
        ],
    }
    report = render_markdown(session)
    assert "高度：右侧 50%" in report
    assert "通过 `1`" in report
    assert "config_update" in report
    print("OK position_baseline_collector scenarios=%d" % len(SCENARIOS))
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="在 Termux 中采集 ToolHub 悬浮球固定位置真机基线"
    )
    parser.add_argument("--log", help="ToolHub init.log 路径；未指定时尝试通过 root 自动查找")
    parser.add_argument("--output-dir", help="输出目录；默认写入 Termux 下载目录")
    parser.add_argument(
        "--scenario",
        action="append",
        choices=[item["id"] for item in SCENARIOS],
        help="只执行指定场景，可重复使用",
    )
    parser.add_argument("--list-scenarios", action="store_true", help="列出场景后退出")
    parser.add_argument("--self-test", action="store_true", help="运行无设备依赖的解析器自检")
    args = parser.parse_args()

    if args.list_scenarios:
        for item in SCENARIOS:
            print("%-24s %s" % (item["id"], item["title"]))
        return 0
    if args.self_test:
        return self_test()

    try:
        return run_collection(args)
    except KeyboardInterrupt:
        print("\n已取消。", file=sys.stderr)
        return 130
    except Exception as exc:
        print("ERROR: %s" % exc, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
