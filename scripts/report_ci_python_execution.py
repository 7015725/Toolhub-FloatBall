#!/usr/bin/env python3
"""Build a deterministic inventory of Python executions in GitHub Actions."""
import argparse
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW_DIR = ROOT / ".github" / "workflows"

PYTHON_CALL = re.compile(
    r"(?:^|[\s;&|({])python(?:3(?:\.\d+)?)?\s+"
    r"(?!-)(?:['\"])?((?:scripts|\.github/scripts)/[A-Za-z0-9_./-]+\.py)"
    r"(?:['\"])?"
)
WORKFLOW_NAME = re.compile(r"^name:\s*(.+?)\s*$")
JOB_KEY = re.compile(r"^  ([A-Za-z0-9_-]+):\s*$")
STEP_NAME = re.compile(r"^\s*-\s+name:\s*(.+?)\s*$")

SECURITY_BOUNDARY = {
    "scripts/create_update_record.py",
    "scripts/generate_signed_manifest.py",
    "scripts/verify_changed_module_versions.py",
    "scripts/verify_manifest.py",
    "scripts/verify_update_history.py",
    "scripts/verify_update_version_page.py",
    ".github/scripts/verify_manifest_signature.py",
}
RELEASE_BOUNDARY_WORKFLOWS = {
    "sign-toolhub",
    "rollback-toolhub",
    "publish-release",
}
CONDITIONAL_ALTERNATIVES = {
    ("sign-toolhub", "scripts/verify_changed_module_versions.py"),
}


def rel(path):
    return path.relative_to(ROOT).as_posix()


def clean_yaml_scalar(value):
    value = str(value).strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        return value[1:-1]
    return value


def workflow_files():
    result = list(WORKFLOW_DIR.glob("*.yml"))
    result.extend(WORKFLOW_DIR.glob("*.yaml"))
    return sorted(result, key=rel)


def scan_workflow(path):
    text = path.read_text(encoding="utf-8")
    workflow = path.stem
    job = ""
    step = ""
    calls = []

    for line_number, line in enumerate(text.splitlines(), 1):
        name_match = WORKFLOW_NAME.match(line)
        if name_match:
            workflow = clean_yaml_scalar(name_match.group(1))
            continue

        job_match = JOB_KEY.match(line)
        if job_match and job_match.group(1) not in {
            "on", "permissions", "concurrency", "env", "jobs", "defaults",
        }:
            job = job_match.group(1)
            step = ""
            continue

        step_match = STEP_NAME.match(line)
        if step_match:
            step = clean_yaml_scalar(step_match.group(1))
            continue

        if line.lstrip().startswith("#"):
            continue

        for match in PYTHON_CALL.finditer(line):
            script = match.group(1)
            calls.append({
                "workflow": workflow,
                "workflow_file": rel(path),
                "job": job or "—",
                "step": step or "—",
                "line": line_number,
                "script": script,
                "security_boundary": script in SECURITY_BOUNDARY,
            })
    return calls


def classify_cross_workflow(script, workflows):
    names = set(workflows)
    if script in SECURITY_BOUNDARY and names & RELEASE_BOUNDARY_WORKFLOWS:
        return "保留边界校验"
    if "verify" in names and names & {"sign-toolhub", "rollback-toolhub"}:
        return "候选：职责可能重叠"
    if len(names) > 1:
        return "人工审查"
    return "单工作流"


def render(calls):
    by_script = defaultdict(list)
    by_workflow = defaultdict(list)
    for call in calls:
        by_script[call["script"]].append(call)
        by_workflow[call["workflow"]].append(call)

    cross = []
    repeated = []
    alternatives = []
    for script, items in sorted(by_script.items()):
        workflows = sorted({item["workflow"] for item in items})
        counts = Counter(item["workflow"] for item in items)
        if len(workflows) > 1:
            cross.append({
                "script": script,
                "workflows": workflows,
                "calls": len(items),
                "classification": classify_cross_workflow(script, workflows),
            })
        for workflow, count in sorted(counts.items()):
            if count <= 1:
                continue
            item = {
                "script": script,
                "workflow": workflow,
                "calls": count,
            }
            if (workflow, script) in CONDITIONAL_ALTERNATIVES:
                item["classification"] = "条件分支替代；单次运行只执行一条"
                alternatives.append(item)
            else:
                item["classification"] = (
                    "保留边界校验"
                    if script in SECURITY_BOUNDARY
                    else "候选：同工作流重复"
                )
                repeated.append(item)

    unique_scripts = len(by_script)
    total_calls = len(calls)
    cross_scripts = len(cross)
    repeated_pairs = len(repeated)
    alternative_pairs = len(alternatives)
    security_calls = sum(1 for call in calls if call["security_boundary"])

    lines = [
        "# ToolHub CI Python 执行清单",
        "",
        "## 边界",
        "",
        "- 本报告只统计 GitHub Actions 中显式的 Python 文件调用，不自动删除或合并校验。",
        "- 同一脚本跨工作流执行不等于冗余；签名、回滚、发布属于独立安全边界。",
        "- 当前报告不提供单脚本真实耗时；耗时需要在后续阶段由统一计时运行器采集。",
        "",
        "## 摘要",
        "",
        "- 工作流文件：`%d`" % len(workflow_files()),
        "- Python 调用：`%d`" % total_calls,
        "- 唯一 Python 脚本：`%d`" % unique_scripts,
        "- 跨工作流重复脚本：`%d`" % cross_scripts,
        "- 单工作流内重复组合：`%d`" % repeated_pairs,
        "- 条件分支替代组合：`%d`" % alternative_pairs,
        "- 安全边界调用：`%d`" % security_calls,
        "",
        "## 跨工作流重复",
        "",
        "|脚本|工作流数|调用次数|工作流|初步结论|",
        "|---|---:|---:|---|---|",
    ]
    if cross:
        for item in cross:
            lines.append("|`%s`|%d|%d|%s|%s|" % (
                item["script"],
                len(item["workflows"]),
                item["calls"],
                "、".join("`%s`" % name for name in item["workflows"]),
                item["classification"],
            ))
    else:
        lines.append("|—|—|—|—|当前无跨工作流重复|")

    lines.extend([
        "",
        "## 单工作流内重复",
        "",
        "|脚本|工作流|调用次数|初步结论|",
        "|---|---|---:|---|",
    ])
    if repeated:
        for item in repeated:
            lines.append("|`%s`|`%s`|%d|%s|" % (
                item["script"],
                item["workflow"],
                item["calls"],
                item["classification"],
            ))
    else:
        lines.append("|—|—|—|当前无重复|")

    lines.extend([
        "",
        "## 条件分支替代",
        "",
        "|脚本|工作流|静态调用位置|结论|",
        "|---|---|---:|---|",
    ])
    if alternatives:
        for item in alternatives:
            lines.append("|`%s`|`%s`|%d|%s|" % (
                item["script"],
                item["workflow"],
                item["calls"],
                item["classification"],
            ))
    else:
        lines.append("|—|—|—|当前无条件替代|")

    lines.extend([
        "",
        "## 各工作流调用量",
        "",
        "|工作流|Python 调用|唯一脚本|安全边界调用|",
        "|---|---:|---:|---:|",
    ])
    for workflow, items in sorted(by_workflow.items()):
        lines.append("|`%s`|%d|%d|%d|" % (
            workflow,
            len(items),
            len({item["script"] for item in items}),
            sum(1 for item in items if item["security_boundary"]),
        ))

    lines.extend([
        "",
        "## 完整调用明细",
        "",
        "|工作流|任务|步骤|脚本|行号|安全边界|",
        "|---|---|---|---|---:|---|",
    ])
    for call in sorted(
        calls,
        key=lambda item: (
            item["workflow"],
            item["workflow_file"],
            item["line"],
            item["script"],
        ),
    ):
        lines.append("|`%s`|`%s`|%s|`%s`|%d|%s|" % (
            call["workflow"],
            call["job"],
            call["step"].replace("|", r"\|"),
            call["script"],
            call["line"],
            "是" if call["security_boundary"] else "否",
        ))

    lines.extend([
        "",
        "## 后续处理边界",
        "",
        "1. `verify_manifest.py` 与签名验证在签名、回滚和发布工作流中的重复默认保留。",
        "2. `sign-toolhub` 中与 `verify` 完全重叠的 UI、主题、指针和存储检查进入耗时采样候选。",
        "3. 未取得真实耗时和失败定位收益前，不合并工作流、不删除校验。",
        "",
        "## 使用方式",
        "",
        "```bash",
        "python3 scripts/report_ci_python_execution.py --output ci-python-execution-inventory.md",
        "```",
        "",
        "该报告由 `.github/workflows/*.yml` 中的显式 Python 调用确定性生成。",
        "",
    ])
    return "\n".join(lines), {
        "workflow_files": len(workflow_files()),
        "calls": total_calls,
        "scripts": unique_scripts,
        "cross": cross_scripts,
        "repeated": repeated_pairs,
        "alternatives": alternative_pairs,
        "security_calls": security_calls,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="ci-python-execution-inventory.md")
    args = parser.parse_args()

    calls = []
    for workflow in workflow_files():
        calls.extend(scan_workflow(workflow))

    report, summary = render(calls)
    output = ROOT / args.output
    output.write_text(report, encoding="utf-8")
    print(
        "OK workflows=%d python_calls=%d unique_scripts=%d "
        "cross_workflow=%d repeated_within_workflow=%d conditional_alternatives=%d "
        "security_calls=%d output=%s"
        % (
            summary["workflow_files"],
            summary["calls"],
            summary["scripts"],
            summary["cross"],
            summary["repeated"],
            summary["alternatives"],
            summary["security_calls"],
            rel(output),
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
