#!/usr/bin/env python3
"""Build a deterministic inventory of repository Python maintenance scripts."""
import argparse
import ast
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PYTHON_DIRS = (ROOT / "scripts", ROOT / ".github" / "scripts")
WORKFLOW_DIR = ROOT / ".github" / "workflows"
TEXT_SUFFIXES = {".md", ".yml", ".yaml", ".json", ".sh", ".txt"}
PYTHON_CALL = re.compile(
    r"(?:^|[\s;&|({])python(?:3(?:\.\d+)?)?\s+"
    r"(?!-)(?:['\"])?((?:scripts|\.github/scripts)/[A-Za-z0-9_./-]+\.py)"
    r"(?:['\"])?"
)
SCRIPT_PATH = re.compile(
    r"(?<![A-Za-z0-9_.-])((?:scripts|\.github/scripts)/[A-Za-z0-9_./-]+\.py)"
)
BARE_SCRIPT = re.compile(r"(?<![A-Za-z0-9_.-])([A-Za-z0-9_-]+\.py)(?![A-Za-z0-9_.-])")


def relative(path):
    return path.relative_to(ROOT).as_posix()


def python_files():
    result = []
    for directory in PYTHON_DIRS:
        if directory.is_dir():
            result.extend(path for path in directory.glob("*.py") if path.is_file())
    return sorted(result, key=relative)


def text_files():
    result = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        rel = relative(path)
        if rel.startswith(".git/") or "__pycache__" in path.parts:
            continue
        if path.suffix.lower() in TEXT_SUFFIXES:
            result.append(path)
    return sorted(result, key=relative)


def local_module_map(paths):
    result = {}
    for path in paths:
        rel = relative(path)
        result[rel[:-3].replace("/", ".")] = rel
        result[path.stem] = rel
    return result


def add_reference(references, target, kind, source):
    references[target][kind].add(source)


def resolve_literal(raw, source, known):
    value = str(raw).replace("\\", "/")
    if value in known:
        return value
    candidate = (source.parent / value).resolve()
    try:
        rel = candidate.relative_to(ROOT).as_posix()
    except ValueError:
        rel = ""
    if rel in known:
        return rel
    if "/" not in value and value.endswith(".py"):
        matches = [item for item in known if Path(item).name == value]
        if len(matches) == 1:
            return matches[0]
    return None


def scan_workflows(known, references):
    count = 0
    workflows = sorted(WORKFLOW_DIR.glob("*.yml"))
    workflows += sorted(WORKFLOW_DIR.glob("*.yaml"))
    for workflow in workflows:
        source = relative(workflow)
        text = workflow.read_text(encoding="utf-8")
        for line_number, line in enumerate(text.splitlines(), 1):
            if line.lstrip().startswith("#"):
                continue
            for match in PYTHON_CALL.finditer(line):
                target = match.group(1)
                if target in known:
                    add_reference(references, target, "workflow", "%s:%d" % (
                        source, line_number
                    ))
                    count += 1
    return len(workflows), count


def scan_python(paths, known, references):
    module_map = local_module_map(paths)
    for source_path in paths:
        source = relative(source_path)
        text = source_path.read_text(encoding="utf-8")
        try:
            tree = ast.parse(text, filename=source)
        except SyntaxError as exc:
            raise SystemExit("Python syntax error in %s: %s" % (source, exc))

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                names = [item.name for item in node.names]
            elif isinstance(node, ast.ImportFrom):
                names = [node.module] if node.module else []
            else:
                names = []
            for name in names:
                if not name:
                    continue
                target = module_map.get(name)
                if target and target != source:
                    add_reference(references, target, "python", source)

            if isinstance(node, ast.Constant) and isinstance(node.value, str):
                target = resolve_literal(node.value, source_path, known)
                if target and target != source:
                    add_reference(references, target, "python", source)

        for match in SCRIPT_PATH.finditer(text):
            target = match.group(1)
            if target in known and target != source:
                add_reference(references, target, "python", source)


def scan_documents(paths, known, references):
    basenames = defaultdict(list)
    for target in known:
        basenames[Path(target).name].append(target)

    for path in paths:
        source = relative(path)
        if source in known or source.startswith(".github/workflows/"):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for match in SCRIPT_PATH.finditer(text):
            target = match.group(1)
            if target in known:
                add_reference(references, target, "document", source)
        for match in BARE_SCRIPT.finditer(text):
            matches = basenames.get(match.group(1), [])
            if len(matches) == 1:
                add_reference(references, matches[0], "document", source)


def has_main_guard(path):
    text = path.read_text(encoding="utf-8")
    return bool(re.search(
        r"if\s+__name__\s*==\s*['\"]__main__['\"]\s*:",
        text,
    ))


def role_for(kinds):
    if "workflow" in kinds:
        return "CI 入口"
    if "python" in kinds:
        return "脚本依赖"
    if "document" in kinds:
        return "文档/人工入口"
    return "孤立候选"


def render(paths, references, workflow_count, workflow_ref_count):
    rows = []
    counts = defaultdict(int)
    for path in paths:
        rel = relative(path)
        kinds = set(references[rel])
        role = role_for(kinds)
        counts[role] += 1
        rows.append({
            "path": rel,
            "role": role,
            "lines": len(path.read_text(encoding="utf-8").splitlines()),
            "main": has_main_guard(path),
            "workflow": sorted(references[rel].get("workflow", set())),
            "python": sorted(references[rel].get("python", set())),
            "document": sorted(references[rel].get("document", set())),
        })

    candidates = [row for row in rows if row["role"] == "孤立候选"]
    lines = [
        "# ToolHub Python 维护脚本资产清单",
        "",
        "## 边界",
        "",
        "- 本报告只识别显式引用关系，不自动删除脚本。",
        "- ‘孤立候选’表示未被工作流、其他 Python 文件或文档显式引用，不等于可以安全删除。",
        "- 动态拼接路径、外部人工调用和 GitHub API 调用可能不产生静态引用，需要二次审查。",
        "",
        "## 摘要",
        "",
        "- Python 文件：`%d`" % len(rows),
        "- GitHub Actions 工作流：`%d`" % workflow_count,
        "- 工作流 Python 调用：`%d`" % workflow_ref_count,
        "- CI 入口：`%d`" % counts["CI 入口"],
        "- 脚本依赖：`%d`" % counts["脚本依赖"],
        "- 文档/人工入口：`%d`" % counts["文档/人工入口"],
        "- 孤立候选：`%d`" % counts["孤立候选"],
        "",
        "## 孤立候选",
        "",
        "|脚本|行数|可直接执行|处理边界|",
        "|---|---:|---|---|",
    ]
    if candidates:
        for row in candidates:
            lines.append("|`%s`|%d|%s|仅进入人工审查，不自动删除|" % (
                row["path"], row["lines"], "是" if row["main"] else "否"
            ))
    else:
        lines.append("|—|—|—|当前无候选|")

    lines.extend([
        "",
        "## 完整分类",
        "",
        "|脚本|分类|行数|工作流引用|Python 引用|文档引用|",
        "|---|---|---:|---:|---:|---:|",
    ])
    for row in rows:
        lines.append("|`%s`|%s|%d|%d|%d|%d|" % (
            row["path"],
            row["role"],
            row["lines"],
            len(row["workflow"]),
            len(row["python"]),
            len(row["document"]),
        ))

    lines.extend([
        "",
        "## 使用方式",
        "",
        "```bash",
        "python3 scripts/report_python_script_inventory.py --output python-script-inventory.md",
        "```",
        "",
        "该报告由当前仓库的 `.github/workflows/`、`scripts/`、`.github/scripts/` 和文档引用确定性生成。",
        "",
    ])
    return "\n".join(lines), len(candidates)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="python-script-inventory.md")
    parser.add_argument("--fail-on-candidates", action="store_true")
    args = parser.parse_args()

    paths = python_files()
    known = {relative(path) for path in paths}
    references = defaultdict(lambda: defaultdict(set))
    workflow_count, workflow_ref_count = scan_workflows(known, references)
    scan_python(paths, known, references)
    scan_documents(text_files(), known, references)
    report, candidate_count = render(
        paths, references, workflow_count, workflow_ref_count
    )
    output = ROOT / args.output
    output.write_text(report, encoding="utf-8")
    print("OK python_scripts=%d isolated_candidates=%d output=%s" % (
        len(paths), candidate_count, relative(output)
    ))
    if args.fail_on_candidates and candidate_count:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
