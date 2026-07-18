#!/usr/bin/env python3
import hashlib
import json
import os
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PART_PREFIXES = ["STAGE2_SOURCE_%02d\n" % index for index in range(1, 10)]
SCRIPT_SHA256 = "65e633a51cf5c9e76bfda8bf640be9bc38d1e8524378cc644a6d61e528767116"
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
        raise SystemExit("stage2 git add failed: " + str(add.stdout or ""))
    commit = run_git(["commit", "-m", message])
    if commit.returncode != 0:
        raise SystemExit("stage2 commit failed: " + str(commit.stdout or ""))


def add_temp_entry(entry_version):
    entry = ENTRY.read_text(encoding="utf-8")
    entry = entry.replace(
        "var TOOLHUB_ENTRY_VERSION = 20260718213000;",
        "var TOOLHUB_ENTRY_VERSION = %s;" % entry_version, 1,
    )
    entry = entry.replace(
        '"th_20_pickword.js", "th_21_result_preview.js", "th_22_image_viewer.js"];',
        '"th_20_pickword.js", "th_21_result_preview.js", "th_22_image_viewer.js", "th_stage2_bootstrap.js"];',
        1,
    )
    ENTRY.write_text(entry, encoding="utf-8")


def prepare_signing_bridge():
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
            '    "th_stage2_bootstrap.js",\n]',
            1,
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
    if len(diagnostic) > 1800:
        diagnostic = diagnostic[:1800]
    th22 = TH22.read_text(encoding="utf-8")
    th22 = th22.replace(
        "// @version 1.0.0\n",
        "// @version 1.0.1\n// " + diagnostic + "\n", 1,
    )
    TH22.write_text(th22, encoding="utf-8")
    add_temp_entry("20260718232000")
    record = json.loads(RECORD.read_text(encoding="utf-8"))
    details = [
        str(item) for item in (record.get("details") or [])
        if not str(item).startswith("STAGE2_DIAGNOSTIC:")
    ]
    details.append(diagnostic)
    record["details"] = details
    RECORD.write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
    )
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


def syntax_detail(source, error):
    line_number = int(error.lineno or 0)
    offset = int(error.offset or 0)
    text = str(error.text or "")
    start = max(0, offset - 251)
    end = min(len(text), offset + 250)
    snippet = text[start:end]
    return "line=%d offset=%d snippet=%r msg=%s" % (
        line_number, offset, snippet, str(error.msg or ""),
    )


def main():
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text(encoding="utf-8"))
    number = int((event.get("pull_request") or {}).get("number") or 0)
    repo = str(os.environ.get("GITHUB_REPOSITORY", ""))
    if not number or not repo:
        raise SystemExit("stage2 runner requires a pull_request event")

    url = "https://api.github.com/repos/%s/issues/%d/comments?per_page=100" % (repo, number)
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
        commit_diagnostic("source parts missing %d/%d" % (len(parts), len(PART_PREFIXES)))
        return

    source = parts[0]
    overlaps = []
    for index in range(1, len(PART_PREFIXES)):
        source, overlap = append_without_overlap(source, parts[index])
        overlaps.append(overlap)
    if not source.endswith("\n"):
        source += "\n"

    script = source.encode("utf-8")
    digest = hashlib.sha256(script).hexdigest()
    try:
        compile(source, str(TARGET), "exec")
    except SyntaxError as error:
        commit_diagnostic(
            "digest=%s expected=%s length=%d overlaps=%s syntax=%s" % (
                digest, SCRIPT_SHA256, len(script),
                ",".join(str(item) for item in overlaps),
                syntax_detail(source, error),
            )
        )
        return

    TARGET.write_bytes(script)
    proc = subprocess.run(
        ["python3", str(TARGET)], cwd=str(ROOT),
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    )
    if proc.returncode != 0:
        output = str(proc.stdout or "").strip()
        if len(output) > 1300:
            output = output[-1300:]
        commit_diagnostic(
            "digest=%s expected=%s length=%d overlaps=%s apply_exit=%d output=%s" % (
                digest, SCRIPT_SHA256, len(script),
                ",".join(str(item) for item in overlaps),
                proc.returncode, output,
            )
        )
        return

    prepare_signing_bridge()


if __name__ == "__main__":
    main()
