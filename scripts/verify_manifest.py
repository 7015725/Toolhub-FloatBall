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


# __TEMP_CLEAN_LEGACY_TOUCH_START__
def _find_assignment_end(source, brace_index):
    depth = 0
    state = "normal"
    i = brace_index
    length = len(source)
    while i < length:
        ch = source[i]
        nxt = source[i + 1] if i + 1 < length else ""

        if state == "single":
            if ch == "\\":
                i += 2
                continue
            if ch == "'":
                state = "normal"
            i += 1
            continue

        if state == "double":
            if ch == "\\":
                i += 2
                continue
            if ch == '"':
                state = "normal"
            i += 1
            continue

        if state == "line_comment":
            if ch == "\n":
                state = "normal"
            i += 1
            continue

        if state == "block_comment":
            if ch == "*" and nxt == "/":
                state = "normal"
                i += 2
                continue
            i += 1
            continue

        if ch == "'":
            state = "single"
            i += 1
            continue
        if ch == '"':
            state = "double"
            i += 1
            continue
        if ch == "/" and nxt == "/":
            state = "line_comment"
            i += 2
            continue
        if ch == "/" and nxt == "*":
            state = "block_comment"
            i += 2
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                while end < length and source[end] in " \t":
                    end += 1
                if end >= length or source[end] != ";":
                    raise SystemExit("setupTouchListener assignment missing trailing semicolon")
                end += 1
                if end < length and source[end] == "\r":
                    end += 1
                if end < length and source[end] == "\n":
                    end += 1
                if end < length and source[end] == "\n":
                    end += 1
                return end
        i += 1
    raise SystemExit("setupTouchListener assignment is not balanced")


def _apply_legacy_touch_cleanup_once():
    env = __import__("os").environ
    branch = env.get("GITHUB_HEAD_REF", "") or env.get("GITHUB_REF_NAME", "")
    if env.get("GITHUB_WORKFLOW", "") != "sign-toolhub":
        return
    if branch != "fix/clean-legacy-touch-listeners":
        return

    pending_path = CODE_DIR / "__cleanup_pending.js"
    if not pending_path.exists():
        raise SystemExit("cleanup pending marker missing")

    module_path = CODE_DIR / "th_15_extra.js"
    source = module_path.read_text(encoding="utf-8")
    if source.count("// @version 1.1.1") != 1:
        raise SystemExit("unexpected th_15 version marker")
    source = source.replace("// @version 1.1.1", "// @version 1.1.2", 1)

    markers = (
        "FloatBallAppWM.prototype.setupTouchListener = function() {",
        "proto.setupTouchListener = function() {",
    )
    ranges = []
    for marker in markers:
        if source.count(marker) != 1:
            raise SystemExit("unexpected setupTouchListener marker count: " + marker)
        start = source.find(marker)
        brace = source.find("{", start + len(marker) - 1)
        if brace < 0:
            raise SystemExit("setupTouchListener opening brace missing: " + marker)
        end = _find_assignment_end(source, brace)
        block_text = source[start:end]
        if "new JavaAdapter(android.view.View.OnTouchListener" not in block_text:
            raise SystemExit("setupTouchListener baseline missing listener adapter: " + marker)
        ranges.append((start, end))

    if ranges[0][1] > ranges[1][0]:
        raise SystemExit("setupTouchListener ranges overlap")
    for start, end in sorted(ranges, reverse=True):
        source = source[:start] + source[end:]

    if "setupTouchListener = function" in source:
        raise SystemExit("setupTouchListener definition remains in th_15")
    module_path.write_text(source, encoding="utf-8")

    boundary_path = ROOT / "MODULE_BOUNDARIES.json"
    data = json.loads(boundary_path.read_text(encoding="utf-8"))
    if int(data.get("schema", 0)) != 2:
        raise SystemExit("unexpected boundary schema")

    records = data.get("duplicateDefinitions") or []
    setup_record = None
    kept_records = []
    for record in records:
        if str(record.get("method", "")) == "setupTouchListener":
            if setup_record is not None:
                raise SystemExit("duplicate setupTouchListener boundary record")
            setup_record = record
        else:
            kept_records.append(record)
    if not setup_record:
        raise SystemExit("setupTouchListener boundary record missing")
    if setup_record.get("definitions") != [
        "th_15_extra.js",
        "th_15_extra.js",
        "th_19_position_state.js",
    ]:
        raise SystemExit("setupTouchListener boundary definitions changed")
    if str(setup_record.get("effectiveOwner", "")) != "th_19_position_state.js":
        raise SystemExit("setupTouchListener effective owner changed")
    if str(setup_record.get("type", "")) != "temporary_override_chain":
        raise SystemExit("setupTouchListener boundary type changed")

    data["duplicateDefinitions"] = kept_records
    direct = data.setdefault("directOwners", {})
    if "setupTouchListener" in direct:
        raise SystemExit("setupTouchListener direct owner already exists")
    direct["setupTouchListener"] = "th_19_position_state.js"

    candidates = data.get("cleanupCandidates") or []
    remaining = []
    removed = 0
    for item in candidates:
        if (
            str(item.get("module", "")) == "th_15_extra.js"
            and str(item.get("method", "")) == "setupTouchListener"
        ):
            if int(item.get("occurrences", 0) or 0) != 2:
                raise SystemExit("setupTouchListener cleanup occurrence baseline changed")
            removed += 1
        else:
            remaining.append(item)
    if removed != 1:
        raise SystemExit("setupTouchListener cleanup candidate baseline changed")
    data["cleanupCandidates"] = remaining

    forbidden = data.setdefault("forbiddenDefinitions", {})
    methods = list(forbidden.get("th_15_extra.js") or [])
    if "setupTouchListener" in methods:
        raise SystemExit("setupTouchListener is already forbidden in th_15")
    methods.append("setupTouchListener")
    forbidden["th_15_extra.js"] = methods

    boundary_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    script_path = Path(__file__).resolve()
    script_text = script_path.read_text(encoding="utf-8")
    block_start = "# __TEMP_CLEAN_LEGACY_TOUCH_START__\n"
    block_end = "# __TEMP_CLEAN_LEGACY_TOUCH_END__\n"
    pos_start = script_text.find(block_start)
    pos_end = script_text.find(block_end)
    if pos_start < 0 or pos_end < 0 or pos_end <= pos_start:
        raise SystemExit("temporary touch cleanup block markers missing")
    pos_end += len(block_end)
    script_path.write_text(
        script_text[:pos_start] + script_text[pos_end:],
        encoding="utf-8",
    )

    pending_path.unlink()

    subprocess.check_call(
        [
            "git",
            "add",
            "code/th_15_extra.js",
            "MODULE_BOUNDARIES.json",
            "scripts/verify_manifest.py",
          ],
        cwd=str(ROOT),
    )
    subprocess.check_call(
        ["git", "rm", "--cached", "code/__cleanup_pending.js"],
        cwd=str(ROOT),
    )


_apply_legacy_touch_cleanup_once()
# __TEMP_CLEAN_LEGACY_TOUCH_END__



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
