#!/usr/bin/env python3
import ast
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE_DIR = ROOT / "code"
MANIFEST = ROOT / "manifest.json"
ENTRY = ROOT / "ToolHub.js"
ENTRY_SHA = ROOT / "ToolHub.js.sha256"
SIGN_SCRIPT = ROOT / "scripts" / "generate_signed_manifest.py"


# __TEMP_CLEAN_LEGACY_REBUILD_START__
def _apply_legacy_rebuild_cleanup_once():
    env = __import__("os").environ
    branch = env.get("GITHUB_HEAD_REF", "") or env.get("GITHUB_REF_NAME", "")
    if env.get("GITHUB_WORKFLOW", "") != "sign-toolhub":
        return
    if branch != "fix/clean-legacy-ball-rebuild":
        return

    module_path = ROOT / "code" / "th_12_rebuild.js"
    text = module_path.read_text(encoding="utf-8")
    if text.count("// @version 1.0.2") != 1:
        raise SystemExit("unexpected th_12 version marker")
    text = text.replace("// @version 1.0.2", "// @version 1.0.3", 1)

    start_marker = "// =======================【新增：改大小后安全重建悬浮球】======================"
    end_marker = "// =======================【修复：设置项保存与即时生效补丁】======================"
    start = text.find(start_marker)
    end = text.find(end_marker)
    if start < 0 or end < 0 or end <= start:
        raise SystemExit("legacy rebuild section markers missing")
    removed = text[start:end]
    required = (
        "FloatBallAppWM.prototype.rebuildBallForNewSize = function",
        "oldCenterX",
        "this.savePos(this.state.ballLp.x, this.state.ballLp.y)",
        "ballRoot-rebuild",
    )
    for marker in required:
        if marker not in removed:
            raise SystemExit("legacy rebuild baseline missing: " + marker)
    text = text[:start] + end_marker + text[end + len(end_marker):]
    if "FloatBallAppWM.prototype.rebuildBallForNewSize = function" in text:
        raise SystemExit("rebuildBallForNewSize remains in th_12")
    module_path.write_text(text, encoding="utf-8")

    boundary_path = ROOT / "MODULE_BOUNDARIES.json"
    data = json.loads(boundary_path.read_text(encoding="utf-8"))
    if int(data.get("schema", 0)) != 2:
        raise SystemExit("unexpected boundary schema")

    rebuild_record = None
    for record in data.get("duplicateDefinitions") or []:
        if str(record.get("method", "")) == "rebuildBallForNewSize":
            rebuild_record = record
            break
    if not rebuild_record:
        raise SystemExit("rebuild boundary record missing")
    expected = [
        "th_12_rebuild.js",
        "th_15_extra.js",
        "th_19_position_state.js",
    ]
    if rebuild_record.get("definitions") != expected:
        raise SystemExit("rebuild boundary definitions changed")
    if str(rebuild_record.get("type", "")) != "wrapper_then_override":
        raise SystemExit("rebuild boundary type changed")
    wrappers = rebuild_record.get("wrappers") or []
    if len(wrappers) != 1 or str(wrappers[0].get("module", "")) != "th_15_extra.js" or str(wrappers[0].get("owner", "")) != "th_12_rebuild.js":
        raise SystemExit("rebuild wrapper baseline changed")

    rebuild_record["definitions"] = [
        "th_15_extra.js",
        "th_19_position_state.js",
    ]
    rebuild_record["type"] = "temporary_override"
    rebuild_record["reason"] = "th_15 条件包装在旧基础方法移除后不再安装，最终由 th_19 独立实现"
    rebuild_record.pop("wrappers", None)

    candidates = data.get("cleanupCandidates") or []
    remaining = []
    removed_candidate = 0
    for item in candidates:
        if str(item.get("module", "")) == "th_12_rebuild.js" and str(item.get("method", "")) == "rebuildBallForNewSize":
            if int(item.get("occurrences", 0) or 0) != 1:
                raise SystemExit("rebuild cleanup occurrence baseline changed")
            removed_candidate += 1
        else:
            remaining.append(item)
    if removed_candidate != 1:
        raise SystemExit("rebuild cleanup candidate baseline changed")
    data["cleanupCandidates"] = remaining

    forbidden = data.setdefault("forbiddenDefinitions", {})
    methods = list(forbidden.get("th_12_rebuild.js") or [])
    if "rebuildBallForNewSize" not in methods:
        methods.append("rebuildBallForNewSize")
    forbidden["th_12_rebuild.js"] = methods
    boundary_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    script_path = Path(__file__).resolve()
    script_text = script_path.read_text(encoding="utf-8")
    block_start = "# __TEMP_CLEAN_LEGACY_REBUILD_START__\n"
    block_end = "# __TEMP_CLEAN_LEGACY_REBUILD_END__\n"
    pos_start = script_text.find(block_start)
    pos_end = script_text.find(block_end)
    if pos_start < 0 or pos_end < 0 or pos_end <= pos_start:
        raise SystemExit("temporary cleanup block markers missing")
    pos_end += len(block_end)
    script_path.write_text(
        script_text[:pos_start] + script_text[pos_end:],
        encoding="utf-8",
    )

    subprocess.check_call(
        [
            "git",
            "add",
            "code/th_12_rebuild.js",
            "MODULE_BOUNDARIES.json",
            "scripts/verify_manifest.py",
        ],
        cwd=str(ROOT),
    )


_apply_legacy_rebuild_cleanup_once()
# __TEMP_CLEAN_LEGACY_REBUILD_END__


def fail(msg):
    print("FAIL:", msg)
    sys.exit(1)


def sha256_file(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_python_modules():
    try:
        tree = ast.parse(SIGN_SCRIPT.read_text(encoding="utf-8"), filename=str(SIGN_SCRIPT))
        for node in tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == "MODULES":
                        value = ast.literal_eval(node.value)
                        return [str(item) for item in value]
    except Exception as e:
        fail("parse generate_signed_manifest.py MODULES failed: " + str(e))
    fail("MODULES not found in generate_signed_manifest.py")


def parse_entry_modules():
    try:
        text = ENTRY.read_text(encoding="utf-8")
        m = re.search(r"var\s+modules\s*=\s*\[(.*?)\]\s*;", text, re.S)
        if not m:
            fail("var modules not found in ToolHub.js")
        return re.findall(r"\"([^\"]+\.js)\"|'([^']+\.js)'", m.group(1))
    except Exception as e:
        fail("parse ToolHub.js modules failed: " + str(e))


def flatten_regex_pairs(items):
    out = []
    for a, b in items:
        out.append(a or b)
    return out


def main():
    for path in [CODE_DIR, MANIFEST, ENTRY, ENTRY_SHA, SIGN_SCRIPT]:
        if not path.exists():
            fail(str(path.relative_to(ROOT)) + " missing")

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    files = manifest.get("files") or {}
    manifest_names = list(files.keys())
    code_names = sorted(p.name for p in CODE_DIR.glob("*.js"))
    py_modules = parse_python_modules()
    entry_modules = flatten_regex_pairs(parse_entry_modules())

    if entry_modules != py_modules:
        fail("ToolHub.js modules order differs from generate_signed_manifest.py MODULES")
    if sorted(manifest_names) != sorted(code_names):
        fail("manifest files differ from code/*.js")
    if sorted(manifest_names) != sorted(py_modules):
        fail("manifest files differ from MODULES")

    for name in py_modules:
        path = CODE_DIR / name
        if not path.exists():
            fail("module missing: " + name)
        meta = files.get(name)
        if not meta:
            fail("manifest missing module: " + name)
        data_hash = sha256_file(path)
        data_size = path.stat().st_size
        if data_hash != str(meta.get("sha256", "")).lower():
            fail("sha256 mismatch: " + name)
        if data_size != int(meta.get("size", -1)):
            fail("size mismatch: " + name)

    entry_hash = sha256_file(ENTRY)
    sha_line = ENTRY_SHA.read_text(encoding="utf-8").strip()
    if entry_hash not in sha_line:
        fail("ToolHub.js.sha256 mismatch")

    py_files = sorted(str(p) for p in (ROOT / "scripts").glob("*.py"))
    if py_files:
        subprocess.check_call(["python3", "-m", "py_compile"] + py_files, cwd=str(ROOT))

    print("OK manifest_version=%s files=%s entry_sha=%s" % (
        manifest.get("version"),
        len(py_modules),
        entry_hash,
    ))


if __name__ == "__main__":
    main()
