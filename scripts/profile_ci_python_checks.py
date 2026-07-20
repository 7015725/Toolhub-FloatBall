#!/usr/bin/env python3
"""Measure overlapping non-security Python checks used by verify and sign-toolhub."""
import argparse
import json
import os
import statistics
import subprocess
import sys
import time
from pathlib import Path

import report_ci_python_execution as execution_inventory


ROOT = Path(__file__).resolve().parents[1]
TARGET_WORKFLOWS = ("verify", "sign-toolhub")
NON_CHECK_SCRIPTS = {
    "scripts/report_ci_python_execution.py",
    "scripts/report_python_script_inventory.py",
    "scripts/verify_workflow_script_references.py",
}


def relative(path):
    return path.relative_to(ROOT).as_posix()


def discover_candidates():
    by_workflow = {}
    for workflow_path in execution_inventory.workflow_files():
        for call in execution_inventory.scan_workflow(workflow_path):
            by_workflow.setdefault(call["workflow"], set()).add(call["script"])

    missing_workflows = [
        workflow for workflow in TARGET_WORKFLOWS if workflow not in by_workflow
    ]
    if missing_workflows:
        raise SystemExit(
            "Missing target workflows in execution inventory: %s"
            % ", ".join(missing_workflows)
        )

    candidates = set(by_workflow[TARGET_WORKFLOWS[0]])
    for workflow in TARGET_WORKFLOWS[1:]:
        candidates &= by_workflow[workflow]

    candidates -= set(execution_inventory.SECURITY_BOUNDARY)
    candidates -= NON_CHECK_SCRIPTS

    missing_files = [item for item in sorted(candidates) if not (ROOT / item).is_file()]
    if missing_files:
        raise SystemExit(
            "Timing candidate files are missing: %s" % ", ".join(missing_files)
        )
    if not candidates:
        raise SystemExit("No overlapping non-security checks were discovered")
    return sorted(candidates)


def safe_log_name(script):
    return script.replace("/", "__").replace(".py", "") + ".log"


def count_lines(text):
    if not text:
        return 0
    return len(text.splitlines())


def run_once(script, timeout_seconds, run_number, log_dir):
    command = [sys.executable, script]
    started = time.perf_counter()
    timed_out = False
    stdout = ""
    stderr = ""
    return_code = None

    env = dict(os.environ)
    env.setdefault("PYTHONHASHSEED", "0")

    try:
        completed = subprocess.run(
            command,
            cwd=str(ROOT),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout_seconds,
            check=False,
        )
        return_code = completed.returncode
        stdout = completed.stdout or ""
        stderr = completed.stderr or ""
    except subprocess.TimeoutExpired as exc:
        timed_out = True
        return_code = 124
        stdout = exc.stdout or ""
        stderr = exc.stderr or ""
        if isinstance(stdout, bytes):
            stdout = stdout.decode("utf-8", errors="replace")
        if isinstance(stderr, bytes):
            stderr = stderr.decode("utf-8", errors="replace")

    elapsed_ms = (time.perf_counter() - started) * 1000.0
    status = "timeout" if timed_out else ("passed" if return_code == 0 else "failed")

    log_path = log_dir / (safe_log_name(script).replace(".log", "-run%d.log" % run_number))
    log_path.write_text(
        "\n".join([
            "script=%s" % script,
            "run=%d" % run_number,
            "command=%s" % " ".join(command),
            "status=%s" % status,
            "return_code=%s" % return_code,
            "elapsed_ms=%.3f" % elapsed_ms,
            "",
            "===== stdout =====",
            stdout,
            "===== stderr =====",
            stderr,
        ]),
        encoding="utf-8",
    )

    return {
        "run": run_number,
        "status": status,
        "return_code": return_code,
        "elapsed_ms": elapsed_ms,
        "stdout_lines": count_lines(stdout),
        "stderr_lines": count_lines(stderr),
        "log": relative(log_path),
    }


def classify_duration(median_ms):
    if median_ms >= 1000.0:
        return "优先采样/优化"
    if median_ms >= 250.0:
        return "继续观察"
    return "合并收益较低"


def summarize(script, runs):
    durations = [item["elapsed_ms"] for item in runs]
    statuses = [item["status"] for item in runs]
    if "timeout" in statuses:
        status = "timeout"
    elif "failed" in statuses:
        status = "failed"
    else:
        status = "passed"
    median_ms = statistics.median(durations)
    return {
        "script": script,
        "runs": len(runs),
        "status": status,
        "median_ms": median_ms,
        "min_ms": min(durations),
        "max_ms": max(durations),
        "total_ms": sum(durations),
        "stdout_lines": sum(item["stdout_lines"] for item in runs),
        "stderr_lines": sum(item["stderr_lines"] for item in runs),
        "classification": classify_duration(median_ms),
        "samples": runs,
    }


def render_markdown(results, runs_per_script, timeout_seconds):
    ordered = sorted(results, key=lambda item: (-item["median_ms"], item["script"]))
    passed = sum(1 for item in results if item["status"] == "passed")
    failed = sum(1 for item in results if item["status"] == "failed")
    timed_out = sum(1 for item in results if item["status"] == "timeout")
    total_ms = sum(item["total_ms"] for item in results)

    lines = [
        "# ToolHub CI Python 重叠校验耗时采样",
        "",
        "## 边界",
        "",
        "- 只运行 `verify` 与 `sign-toolhub` 同时调用的非签名安全边界脚本。",
        "- 本报告不修改、不跳过、不合并现有校验；失败仅记录，默认不阻断采样工作流。",
        "- 单次 GitHub Runner 数据会受调度与文件缓存影响，至少积累多次 Artifact 后再决定删减。",
        "",
        "## 摘要",
        "",
        "- 候选脚本：`%d`" % len(results),
        "- 每个脚本采样次数：`%d`" % runs_per_script,
        "- 单次超时：`%d` 秒" % timeout_seconds,
        "- 通过：`%d`" % passed,
        "- 失败：`%d`" % failed,
        "- 超时：`%d`" % timed_out,
        "- 串行累计耗时：`%.3f` 秒" % (total_ms / 1000.0),
        "",
        "## 慢项排名",
        "",
        "|排名|脚本|状态|中位数 ms|最小 ms|最大 ms|采样数|初步边界|",
        "|---:|---|---|---:|---:|---:|---:|---|",
    ]
    for index, item in enumerate(ordered, 1):
        lines.append(
            "|%d|`%s`|%s|%.3f|%.3f|%.3f|%d|%s|"
            % (
                index,
                item["script"],
                item["status"],
                item["median_ms"],
                item["min_ms"],
                item["max_ms"],
                item["runs"],
                item["classification"],
            )
        )

    lines.extend([
        "",
        "## 输出规模",
        "",
        "|脚本|stdout 行数|stderr 行数|",
        "|---|---:|---:|",
    ])
    for item in sorted(results, key=lambda row: row["script"]):
        lines.append(
            "|`%s`|%d|%d|"
            % (item["script"], item["stdout_lines"], item["stderr_lines"])
        )

    lines.extend([
        "",
        "## 判定规则",
        "",
        "- 中位数不少于 1000 ms：优先继续采样，并检查能否减少签名阶段的非安全重复。",
        "- 中位数 250–999 ms：继续观察，至少比较多次 Runner 数据。",
        "- 中位数低于 250 ms：即使职责重叠，合并收益通常低于维护和失败定位成本。",
        "- `verify_manifest.py`、Manifest 签名、更新历史和版本号检查不进入本采样器，继续作为独立安全边界保留。",
        "",
        "## 使用方式",
        "",
        "```bash",
        "python3 scripts/profile_ci_python_checks.py --output-dir ci-python-timing",
        "python3 scripts/profile_ci_python_checks.py --runs 3 --timeout-seconds 120 --output-dir ci-python-timing",
        "```",
        "",
    ])
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", default="ci-python-timing")
    parser.add_argument("--runs", type=int, default=1)
    parser.add_argument("--timeout-seconds", type=int, default=120)
    parser.add_argument("--fail-on-check-error", action="store_true")
    args = parser.parse_args()

    if args.runs < 1:
        raise SystemExit("--runs must be at least 1")
    if args.timeout_seconds < 1:
        raise SystemExit("--timeout-seconds must be at least 1")

    output_dir = ROOT / args.output_dir
    log_dir = output_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    candidates = discover_candidates()
    results = []
    for script in candidates:
        samples = []
        for run_number in range(1, args.runs + 1):
            sample = run_once(
                script,
                args.timeout_seconds,
                run_number,
                log_dir,
            )
            samples.append(sample)
            print(
                "TIMING script=%s run=%d status=%s elapsed_ms=%.3f"
                % (
                    script,
                    run_number,
                    sample["status"],
                    sample["elapsed_ms"],
                )
            )
        results.append(summarize(script, samples))

    report = {
        "target_workflows": list(TARGET_WORKFLOWS),
        "runs_per_script": args.runs,
        "timeout_seconds": args.timeout_seconds,
        "candidate_count": len(results),
        "results": sorted(results, key=lambda item: item["script"]),
    }
    (output_dir / "results.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (output_dir / "summary.md").write_text(
        render_markdown(results, args.runs, args.timeout_seconds),
        encoding="utf-8",
    )

    problem_results = [item for item in results if item["status"] != "passed"]
    for item in problem_results:
        print(
            "::warning file=%s::timing sample status=%s median_ms=%.3f"
            % (item["script"], item["status"], item["median_ms"])
        )

    print(
        "OK timing_candidates=%d failures=%d output=%s"
        % (len(results), len(problem_results), relative(output_dir))
    )
    if args.fail_on_check_error and problem_results:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
