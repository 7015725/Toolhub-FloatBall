#!/usr/bin/env python3
"""Temporary repository audit for Markdown/Python classification and similarity."""
import ast
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED_DIRS = {".git", "node_modules", "__pycache__", "ci-python-timing"}


def rel(path):
    return path.relative_to(ROOT).as_posix()


def files_with_suffix(suffix):
    result = []
    for path in ROOT.rglob("*" + suffix):
        if not path.is_file():
            continue
        if any(part in EXCLUDED_DIRS for part in path.parts):
            continue
        result.append(path)
    return sorted(result, key=rel)


def normalized_tokens(text):
    text = re.sub(r"```.*?```", " ", text, flags=re.S)
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"[^A-Za-z0-9_\u4e00-\u9fff]+", " ", text.lower())
    return text.split()


def token_shingles(tokens, width=3):
    if len(tokens) < width:
        return set(tokens)
    return {"\x1f".join(tokens[index:index + width]) for index in range(len(tokens) - width + 1)}


def headings(text):
    return [match.group(2).strip() for match in re.finditer(r"^(#{1,6})\s+(.+?)\s*$", text, re.M)]


def md_category(path):
    name = path.name.upper()
    if name == "README.MD":
        return "入口说明"
    if any(token in name for token in ("ARCHITECTURE", "STRUCTURE", "SQLITE", "STORAGE")):
        return "架构与存储"
    if "AUDIT" in name:
        return "生成审计报告"
    if any(token in name for token in ("CHANGELOG", "UPDATE", "HISTORY", "RELEASE")):
        return "发布与历史"
    if ".GITHUB" in rel(path).upper():
        return "GitHub 维护说明"
    return "专题说明"


def py_category(path):
    stem = path.stem
    if stem.startswith("verify_"):
        if any(token in stem for token in ("manifest", "signature", "update", "version", "release", "changed_module")):
            return "发布安全校验"
        if any(token in stem for token in ("pointer", "pickword", "screenshot", "toolapp", "settings", "sqlite", "rhino", "color", "panel", "gesture", "image")):
            return "功能专项校验"
        return "通用静态校验"
    if stem.startswith("report_") or stem.startswith("audit_"):
        return "报告与资产盘点"
    if stem.startswith("generate_") or stem.startswith("create_") or stem.startswith("build_"):
        return "构建与生成"
    if ".github" in path.parts:
        return "GitHub 工作流辅助"
    return "维护工具"


def workflow_texts():
    texts = {}
    workflow_dir = ROOT / ".github" / "workflows"
    for path in sorted(list(workflow_dir.glob("*.yml")) + list(workflow_dir.glob("*.yaml"))):
        texts[rel(path)] = path.read_text(encoding="utf-8")
    return texts


def references_for(target, all_texts):
    target_rel = rel(target)
    target_name = target.name
    refs = []
    for source, text in all_texts.items():
        if source == target_rel:
            continue
        if target_rel in text or target_name in text:
            refs.append(source)
    return sorted(set(refs))


def python_info(path):
    text = path.read_text(encoding="utf-8")
    functions = []
    imports = []
    parse_error = ""
    try:
        tree = ast.parse(text, filename=rel(path))
        functions = sorted({node.name for node in ast.walk(tree) if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))})
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imports.extend(alias.name for alias in node.names)
            elif isinstance(node, ast.ImportFrom) and node.module:
                imports.append(node.module)
    except SyntaxError as exc:
        parse_error = "%s:%s" % (exc.lineno, exc.msg)
    tokens = normalized_tokens(text)
    return {
        "path": rel(path),
        "category": py_category(path),
        "lines": len(text.splitlines()),
        "functions": functions,
        "imports": sorted(set(imports)),
        "parse_error": parse_error,
        "shingles": token_shingles(tokens),
        "text": text,
    }


def markdown_info(path):
    text = path.read_text(encoding="utf-8")
    tokens = normalized_tokens(text)
    return {
        "path": rel(path),
        "category": md_category(path),
        "lines": len(text.splitlines()),
        "headings": headings(text),
        "shingles": token_shingles(tokens),
        "text": text,
    }


def jaccard(left, right):
    left = set(left)
    right = set(right)
    if not left or not right:
        return 0.0
    return len(left & right) / float(len(left | right))


def similarity_pairs(items, kind):
    pairs = []
    for index, left in enumerate(items):
        for right in items[index + 1:]:
            text_score = jaccard(left["shingles"], right["shingles"])
            structure_score = jaccard(
                left["headings"] if kind == "md" else left["functions"],
                right["headings"] if kind == "md" else right["functions"],
            )
            score = 0.75 * text_score + 0.25 * structure_score
            if score >= 0.12 or text_score >= 0.18 or structure_score >= 0.45:
                pairs.append({
                    "left": left["path"],
                    "right": right["path"],
                    "score": round(score, 4),
                    "text_score": round(text_score, 4),
                    "structure_score": round(structure_score, 4),
                })
    return sorted(pairs, key=lambda item: (-item["score"], item["left"], item["right"]))


def duplicate_functions(py_items):
    owners = defaultdict(list)
    for item in py_items:
        try:
            tree = ast.parse(item["text"], filename=item["path"])
        except SyntaxError:
            continue
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            segment = ast.get_source_segment(item["text"], node) or ""
            normalized = re.sub(r"\s+", " ", segment.strip())
            if len(normalized) >= 80:
                owners[(node.name, normalized)].append(item["path"])
    result = []
    for (name, _), paths in owners.items():
        unique = sorted(set(paths))
        if len(unique) > 1:
            result.append({"function": name, "files": unique})
    return sorted(result, key=lambda item: (item["function"], item["files"]))


def render(report):
    lines = [
        "# Markdown 与 Python 分类合并审计",
        "",
        "## 摘要",
        "",
        "- Markdown 文件：`%d`" % len(report["markdown"]),
        "- Python 文件：`%d`" % len(report["python"]),
        "- Markdown 相似候选：`%d`" % len(report["markdown_pairs"]),
        "- Python 相似候选：`%d`" % len(report["python_pairs"]),
        "- 跨文件完全重复函数：`%d`" % len(report["duplicate_functions"]),
        "",
        "## Markdown 分类",
        "",
        "|文件|类别|行数|主要标题|引用数|",
        "|---|---|---:|---|---:|",
    ]
    for item in report["markdown"]:
        title_text = "；".join(item["headings"][:6]).replace("|", "\\|") or "—"
        lines.append("|`%s`|%s|%d|%s|%d|" % (item["path"], item["category"], item["lines"], title_text, len(item["references"])))
    lines.extend(["", "## Python 分类", "", "|文件|类别|行数|函数数|引用数|", "|---|---|---:|---:|---:|"])
    for item in report["python"]:
        lines.append("|`%s`|%s|%d|%d|%d|" % (item["path"], item["category"], item["lines"], len(item["functions"]), len(item["references"])))
    lines.extend(["", "## Markdown 相似候选", "", "|左文件|右文件|综合相似度|文本|标题结构|", "|---|---|---:|---:|---:|"])
    for pair in report["markdown_pairs"][:50]:
        lines.append("|`%s`|`%s`|%.1f%%|%.1f%%|%.1f%%|" % (pair["left"], pair["right"], pair["score"] * 100, pair["text_score"] * 100, pair["structure_score"] * 100))
    if not report["markdown_pairs"]:
        lines.append("|—|—|—|—|—|")
    lines.extend(["", "## Python 相似候选", "", "|左文件|右文件|综合相似度|文本|函数集合|", "|---|---|---:|---:|---:|"])
    for pair in report["python_pairs"][:80]:
        lines.append("|`%s`|`%s`|%.1f%%|%.1f%%|%.1f%%|" % (pair["left"], pair["right"], pair["score"] * 100, pair["text_score"] * 100, pair["structure_score"] * 100))
    if not report["python_pairs"]:
        lines.append("|—|—|—|—|—|")
    lines.extend(["", "## 跨文件完全重复函数", ""])
    if report["duplicate_functions"]:
        for item in report["duplicate_functions"]:
            lines.append("- `%s`：%s" % (item["function"], "、".join("`%s`" % path for path in item["files"])))
    else:
        lines.append("- 无。")
    lines.extend([
        "",
        "## 合并边界",
        "",
        "1. 生成型 `*_AUDIT.md` 不与手写架构文档直接合并，除非同步调整生成脚本和 CI。",
        "2. 发布、签名、Manifest、回滚相关 Python 校验按独立安全边界保留。",
        "3. 只有内容高度重叠、调用参数兼容、引用可统一迁移的文件才进入删除合并。",
        "4. 本审计只生成证据，不自行删除文件。",
        "",
    ])
    return "\n".join(lines)


def main():
    md_paths = files_with_suffix(".md")
    py_paths = files_with_suffix(".py")
    md_items = [markdown_info(path) for path in md_paths]
    py_items = [python_info(path) for path in py_paths]
    all_texts = {}
    for path in md_paths + py_paths:
        all_texts[rel(path)] = path.read_text(encoding="utf-8")
    all_texts.update(workflow_texts())
    for item, path in zip(md_items, md_paths):
        item["references"] = references_for(path, all_texts)
    for item, path in zip(py_items, py_paths):
        item["references"] = references_for(path, all_texts)
    report = {
        "markdown": [{key: value for key, value in item.items() if key not in ("shingles", "text")} for item in md_items],
        "python": [{key: value for key, value in item.items() if key not in ("shingles", "text")} for item in py_items],
        "markdown_pairs": similarity_pairs(md_items, "md"),
        "python_pairs": similarity_pairs(py_items, "py"),
        "duplicate_functions": duplicate_functions(py_items),
    }
    Path("md-py-organization-audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    Path("md-py-organization-audit.md").write_text(render(report), encoding="utf-8")
    print("OK markdown=%d python=%d md_pairs=%d py_pairs=%d duplicate_functions=%d" % (len(report["markdown"]), len(report["python"]), len(report["markdown_pairs"]), len(report["python_pairs"]), len(report["duplicate_functions"])))


if __name__ == "__main__":
    main()
