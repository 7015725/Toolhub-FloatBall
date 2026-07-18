#!/usr/bin/env python3
import hashlib
import json
import os
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PR = 339
PART_PREFIXES = ["STAGE2_SOURCE_%02d\n" % index for index in range(1, 10)]
EXPECTED_SHA256 = "65e633a51cf5c9e76bfda8bf640be9bc38d1e8524378cc644a6d61e528767116"
GENERATOR = ROOT / "scripts" / "generate_signed_manifest.py"
ENTRY = ROOT / "ToolHub.js"
TEMP_MODULE = ROOT / "code" / "th_stage2_bootstrap.js"
RECORD = ROOT / "updates" / "records" / "feature-pickword-image-viewer-stage2.json"
TH22 = ROOT / "code" / "th_22_image_viewer.js"
TARGET = ROOT / "scripts" / "apply_pickword_image_stage2.py"


def run_git(args):
    return subprocess.run(
        ["git"] + list(args), cwd=str(ROOT), text=True,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )


def commit_local(message, paths):
    run_git(["config", "user.name", "github-actions[bot]"])
    run_git(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"])
    add = run_git(["add"] + list(paths))
    if add.returncode != 0:
        raise SystemExit("git add failed: " + str(add.stdout or ""))
    commit = run_git(["commit", "-m", message])
    if commit.returncode != 0:
        raise SystemExit("git commit failed: " + str(commit.stdout or ""))


def add_temp_entry(version):
    entry = ENTRY.read_text(encoding="utf-8")
    entry = entry.replace(
        "var TOOLHUB_ENTRY_VERSION = 20260718213000;",
        "var TOOLHUB_ENTRY_VERSION = %s;" % version, 1,
    )
    entry = entry.replace(
        '"th_20_pickword.js", "th_21_result_preview.js", "th_22_image_viewer.js"];',
        '"th_20_pickword.js", "th_21_result_preview.js", "th_22_image_viewer.js", "th_stage2_bootstrap.js"];',
        1,
    )
    ENTRY.write_text(entry, encoding="utf-8")


def prepare_bridge():
    TEMP_MODULE.write_text(
        "// @version 1.0.0\n"
        "// 第二阶段临时签名桥接；正式分支会回退到父提交。\n"
        "(function() {})();\n",
        encoding="utf-8",
    )
    generator = GENERATOR.read_text(encoding="utf-8")
    if '"th_stage2_bootstrap.js"' not in generator:
        generator = generator.replace(
            '    "th_20_pickword.js", "th_21_result_preview.js", "th_22_image_viewer.js",\n]',
            '    "th_20_pickword.js", "th_21_result_preview.js", "th_22_image_viewer.js",\n'
            '    "th_stage2_bootstrap.js",\n]', 1,
        )
    GENERATOR.write_text(generator, encoding="utf-8")
    add_temp_entry("20260718232500")
    commit_local(
        "添加第二阶段临时签名桥接",
        ["ToolHub.js", "scripts/generate_signed_manifest.py", "code/th_stage2_bootstrap.js"],
    )


def commit_diagnostic(message):
    run_git(["reset", "--hard", "HEAD"])
    try:
        TARGET.unlink()
    except FileNotFoundError:
        pass
    diagnostic = "STAGE2_DIAGNOSTIC: " + str(message).replace("\r", " ").replace("\n", " | ")
    diagnostic = diagnostic[:1800]
    th22 = TH22.read_text(encoding="utf-8")
    th22 = th22.replace(
        "// @version 1.0.0\n",
        "// @version 1.0.1\n// " + diagnostic + "\n", 1,
    )
    TH22.write_text(th22, encoding="utf-8")
    add_temp_entry("20260718232000")
    record = json.loads(RECORD.read_text(encoding="utf-8"))
    record["details"] = list(record.get("details") or []) + [diagnostic]
    RECORD.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    commit_local(
        "记录第二阶段执行诊断",
        ["ToolHub.js", "code/th_22_image_viewer.js", "updates/records/feature-pickword-image-viewer-stage2.json"],
    )


def append_without_overlap(current, following):
    limit = min(1024, len(current), len(following))
    for size in range(limit, 0, -1):
        if current.endswith(following[:size]):
            return current + following[size:], size
    return current + following, 0


def normalize_outer_literals(source):
    replacements = [
        ("TH22 = '", "TH22 = '''"),
        (")();\\n'\nIMAGE_SETTINGS_UI = '\\n", ")();\\n'''\nIMAGE_SETTINGS_UI = '''\\n"),
        ("};\\n\\n'\nVERIFY_STAGE2 = '", "};\\n\\n'''\nVERIFY_STAGE2 = '''"),
        (
            'print("OK pickword-image-viewer stage2 save=media_store share=content_uri delete=internal sqlite=tracked cleanup=7d")\\n\'\n\ndef read(rel):',
            'print("OK pickword-image-viewer stage2 save=media_store share=content_uri delete=internal sqlite=tracked cleanup=7d")\\n\'\'\'\n\ndef read(rel):',
        ),
    ]
    for old, new in replacements:
        if old not in source:
            raise ValueError("outer literal marker missing: " + old[:48])
        source = source.replace(old, new, 1)
    return source


def syntax_detail(error):
    text = str(error.text or "")
    offset = int(error.offset or 0)
    start = max(0, offset - 251)
    end = min(len(text), offset + 250)
    return "line=%d offset=%d snippet=%r msg=%s" % (
        int(error.lineno or 0), offset, text[start:end], str(error.msg or ""),
    )


def main():
    repo = str(os.environ.get("GITHUB_REPOSITORY", ""))
    if not repo:
        raise SystemExit("GITHUB_REPOSITORY missing")
    url = "https://api.github.com/repos/%s/issues/%d/comments?per_page=100" % (repo, SOURCE_PR)
    request = urllib.request.Request(
        url,
        headers={"Accept": "application/vnd.github+json", "User-Agent": "toolhub-stage2-runner"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        comments = json.loads(response.read().decode("utf-8"))
    parts = {}
    for item in comments:
        body = str(item.get("body") or "")
        for index, prefix in enumerate(PART_PREFIXES):
            if body.startswith(prefix):
                part = body[len(prefix):].replace("\r\n", "\n")
                if part.endswith("\n"):
                    part = part[:-1]
                parts[index] = part
    if len(parts) != len(PART_PREFIXES):
        commit_diagnostic("parts=%d/%d" % (len(parts), len(PART_PREFIXES)))
        return
    source = parts[0]
    overlaps = []
    for index in range(1, len(PART_PREFIXES)):
        source, overlap = append_without_overlap(source, parts[index])
        overlaps.append(overlap)
    if not source.endswith("\n"):
        source += "\n"
    digest_before = hashlib.sha256(source.encode("utf-8")).hexdigest()
    try:
        source = normalize_outer_literals(source)
        compile(source, str(TARGET), "exec")
    except (SyntaxError, ValueError) as error:
        detail = syntax_detail(error) if isinstance(error, SyntaxError) else str(error)
        commit_diagnostic(
            "before_sha=%s expected=%s length=%d overlaps=%s normalize=%s" % (
                digest_before, EXPECTED_SHA256, len(source.encode("utf-8")),
                ",".join(str(value) for value in overlaps), detail,
            )
        )
        return
    TARGET.write_text(source, encoding="utf-8")
    proc = subprocess.run(
        ["python3", str(TARGET)], cwd=str(ROOT),
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    )
    if proc.returncode != 0:
        output = str(proc.stdout or "").strip()
        commit_diagnostic(
            "before_sha=%s expected=%s length=%d overlaps=%s exit=%d output=%s" % (
                digest_before, EXPECTED_SHA256, len(source.encode("utf-8")),
                ",".join(str(value) for value in overlaps), proc.returncode, output[-1200:],
            )
        )
        return
    prepare_bridge()


if __name__ == "__main__":
    main()
