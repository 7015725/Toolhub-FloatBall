#!/usr/bin/env python3
import hashlib
import json
import os
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PR = 339
PREFIXES = ["STAGE2_SOURCE_%02d\n" % index for index in range(1, 10)]
GENERATOR = ROOT / "scripts" / "generate_signed_manifest.py"
ENTRY = ROOT / "ToolHub.js"
TEMP_MODULE = ROOT / "code" / "th_stage2_bootstrap.js"
TARGET = ROOT / "scripts" / "apply_pickword_image_stage2.py"


def git_run(args):
    return subprocess.run(
        ["git"] + list(args), cwd=str(ROOT), text=True,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )


def commit_local(message, paths):
    git_run(["config", "user.name", "github-actions[bot]"])
    git_run(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"])
    add = git_run(["add"] + list(paths))
    if add.returncode != 0:
        raise SystemExit("git add failed: " + str(add.stdout or ""))
    commit = git_run(["commit", "-m", message])
    if commit.returncode != 0:
        raise SystemExit("git commit failed: " + str(commit.stdout or ""))


def append_without_overlap(current, following):
    limit = min(2048, len(current), len(following))
    for size in range(limit, 0, -1):
        if current.endswith(following[:size]):
            return current + following[size:], size
    return current + following, 0


def convert_assignment(source, name, next_marker):
    marker = name + " = '"
    start = source.find(marker)
    if start < 0:
        raise ValueError("assignment missing: " + name)
    value_start = start + len(marker)
    next_pos = source.find(next_marker, value_start)
    if next_pos < 0:
        raise ValueError("assignment end missing: " + name)
    encoded_value = source[value_start:next_pos]
    if not encoded_value.endswith("'"):
        raise ValueError("assignment quote missing: " + name)
    encoded_value = encoded_value[:-1]
    if "'''" in encoded_value:
        raise ValueError("triple quote collision: " + name)
    replacement = name + " = '''" + encoded_value + "'''"
    return source[:start] + replacement + source[next_pos:]


def rebuild_source(parts):
    source = parts[0]
    overlaps = []
    for index in range(1, len(parts)):
        source, overlap = append_without_overlap(source, parts[index])
        overlaps.append(overlap)
    if not source.endswith("\n"):
        source += "\n"
    source = convert_assignment(source, "TH22", "\nIMAGE_SETTINGS_UI = '")
    source = convert_assignment(source, "IMAGE_SETTINGS_UI", "\nVERIFY_STAGE2 = '")
    source = convert_assignment(source, "VERIFY_STAGE2", "\n\ndef read(rel):")
    return source, overlaps


def restore_trigger_files():
    for rel in ("manifest.sig", "ToolHub.js.sha256"):
        proc = subprocess.run(
            ["git", "show", "origin/main:" + rel], cwd=str(ROOT),
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
        if proc.returncode == 0:
            (ROOT / rel).write_bytes(proc.stdout)


def add_temp_entry(version):
    entry = ENTRY.read_text(encoding="utf-8")
    old_version = "var TOOLHUB_ENTRY_VERSION = 20260718213000;"
    if old_version not in entry:
        raise SystemExit("entry version anchor missing")
    entry = entry.replace(
        old_version,
        "var TOOLHUB_ENTRY_VERSION = %s;" % version,
        1,
    )
    old_modules = '"th_20_pickword.js", "th_21_result_preview.js", "th_22_image_viewer.js"];'
    if old_modules not in entry:
        raise SystemExit("entry module anchor missing")
    entry = entry.replace(
        old_modules,
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
    module_anchor = (
        '    "th_20_pickword.js", "th_21_result_preview.js", '
        '"th_22_image_viewer.js",\n]'
    )
    if module_anchor not in generator:
        raise SystemExit("generator module anchor missing after apply")
    generator = generator.replace(
        module_anchor,
        '    "th_20_pickword.js", "th_21_result_preview.js", '
        '"th_22_image_viewer.js",\n'
        '    "th_stage2_bootstrap.js",\n]',
        1,
    )
    GENERATOR.write_text(generator, encoding="utf-8")
    add_temp_entry("20260718234500")
    commit_local(
        "添加第二阶段临时签名桥接",
        ["ToolHub.js", "scripts/generate_signed_manifest.py", "code/th_stage2_bootstrap.js"],
    )


def main():
    repo = str(os.environ.get("GITHUB_REPOSITORY", ""))
    if not repo:
        raise SystemExit("GITHUB_REPOSITORY missing")
    url = "https://api.github.com/repos/%s/issues/%d/comments?per_page=100" % (
        repo, SOURCE_PR,
    )
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "toolhub-stage2-final",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        comments = json.loads(response.read().decode("utf-8"))
    found = {}
    for item in comments:
        body = str(item.get("body") or "")
        for index, prefix in enumerate(PREFIXES):
            if body.startswith(prefix):
                part = body[len(prefix):].replace("\r\n", "\n")
                if part.endswith("\n"):
                    part = part[:-1]
                found[index] = part
    if len(found) != len(PREFIXES):
        raise SystemExit("source parts missing: %d/%d" % (len(found), len(PREFIXES)))
    source, overlaps = rebuild_source([found[index] for index in range(len(PREFIXES))])
    digest = hashlib.sha256(source.encode("utf-8")).hexdigest()
    try:
        compile(source, str(TARGET), "exec")
    except SyntaxError as error:
        raise SystemExit(
            "rebuilt source syntax error line=%s offset=%s msg=%s sha=%s overlaps=%s text=%r"
            % (
                error.lineno, error.offset, error.msg, digest,
                ",".join(str(value) for value in overlaps), error.text,
            )
        )
    restore_trigger_files()
    TARGET.write_text(source, encoding="utf-8")
    proc = subprocess.run(
        ["python3", str(TARGET)], cwd=str(ROOT),
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    )
    if proc.returncode != 0:
        output = str(proc.stdout or "").strip()
        raise SystemExit("stage2 apply failed: " + output[-2400:])
    prepare_bridge()


if __name__ == "__main__":
    main()
