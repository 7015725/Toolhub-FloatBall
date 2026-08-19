#!/usr/bin/env python3
import argparse
import ast
import hashlib
import json
import os
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE_DIR = ROOT / "code"
RUNTIME_DIR = ROOT / "runtime"
MANIFEST = ROOT / "manifest.json"
ENTRY = ROOT / "ToolHub.js"
ENTRY_SHA = ROOT / "ToolHub.js.sha256"
HISTORY = ROOT / "update_history.json"
SIGN_SCRIPT = ROOT / "scripts" / "generate_signed_manifest.py"
CHANNEL_BRANCHES = {"stable": "main", "beta": "beta"}


def fail(message):
    print("FAIL:", message)
    raise SystemExit(1)


def sha256_file(path):
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_assignment(name):
    tree = ast.parse(SIGN_SCRIPT.read_text(encoding="utf-8"), filename=str(SIGN_SCRIPT))
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == name:
                    return ast.literal_eval(node.value)
    fail("%s not found in generate_signed_manifest.py" % name)


def parse_python_modules():
    return [str(item) for item in parse_assignment("MODULES")]


def parse_python_runtime_files():
    raw = parse_assignment("RUNTIME_FILES")
    if not isinstance(raw, dict):
        fail("RUNTIME_FILES must be a dict")
    return raw


def parse_entry_modules():
    text = ENTRY.read_text(encoding="utf-8")
    match = re.search(r"var\s+modules\s*=\s*\[(.*?)\]\s*;", text, re.S)
    if not match:
        fail("var modules not found in ToolHub.js")
    pairs = re.findall(r'"([^\"]+\.js)"|\'([^\']+\.js)\'', match.group(1))
    return [a or b for a, b in pairs]


def parse_entry_version():
    text = ENTRY.read_text(encoding="utf-8", errors="replace")
    for symbol in ("TOOLHUB_ENTRY_VERSION", "MIN_TRUSTED_MANIFEST_VERSION"):
        match = re.search(r"\bvar\s+%s\s*=\s*(\d+)\s*;" % re.escape(symbol), text)
        if match:
            value = int(match.group(1))
            if value <= 0:
                fail("invalid %s: %s" % (symbol, value))
            return value, symbol
    fail("ToolHub.js entry version marker missing")


def collect_python_files():
    roots = [ROOT / "scripts", ROOT / ".github" / "scripts"]
    return sorted(
        str(path)
        for scan_root in roots
        if scan_root.exists()
        for path in scan_root.rglob("*.py")
    )


def verify_runtime_files(manifest, py_runtime_files, py_modules):
    runtime_files = manifest.get("runtimeFiles") or {}
    if set(runtime_files) != set(py_runtime_files):
        fail("manifest runtimeFiles differs from generate_signed_manifest.py RUNTIME_FILES")
    for runtime_id, template in py_runtime_files.items():
        meta = runtime_files.get(runtime_id) or {}
        rel = str(template.get("path", ""))
        if str(meta.get("path", "")) != rel:
            fail("runtime path mismatch: " + runtime_id)
        if not rel.startswith("runtime/") or ".." in rel or not rel.endswith(".jar"):
            fail("runtime path invalid: " + rel)
        path = ROOT / rel
        if not path.exists() or not path.is_file():
            fail("runtime file missing: " + rel)
        if str(meta.get("version", "")) != str(template.get("version", "")):
            fail("runtime version mismatch: " + runtime_id)
        if str(meta.get("kind", "")) != "dex-jar":
            fail("runtime kind must be dex-jar: " + runtime_id)
        if int(meta.get("minApi", 0) or 0) != int(template.get("minApi", 0) or 0):
            fail("runtime minApi mismatch: " + runtime_id)
        required_by = [str(x) for x in (meta.get("requiredBy") or [])]
        if required_by != [str(x) for x in (template.get("requiredBy") or [])]:
            fail("runtime requiredBy mismatch: " + runtime_id)
        for module in required_by:
            if module not in py_modules:
                fail("runtime requiredBy module missing: %s -> %s" % (runtime_id, module))
        if str(meta.get("sha256", "")).lower() != sha256_file(path):
            fail("runtime sha256 mismatch: " + runtime_id)
        if int(meta.get("size", -1)) != path.stat().st_size:
            fail("runtime size mismatch: " + runtime_id)
        with zipfile.ZipFile(path) as archive:
            names = set(archive.namelist())
            for required in (
                "classes.dex",
                "META-INF/toolhub-runtime.properties",
                "META-INF/LICENSE-zxing.txt",
                "META-INF/NOTICE-zxing.txt",
            ):
                if required not in names:
                    fail("runtime jar missing %s: %s" % (required, runtime_id))
            props = archive.read("META-INF/toolhub-runtime.properties").decode("utf-8", "replace")
            if "local.install.dir=getToolHubRootDir()/lib" not in props:
                fail("runtime channel lib install contract missing: " + runtime_id)
            if "bridge.class=toolhub.runtime.qr.ToolHubQrRuntime" not in props:
                fail("runtime bridge contract missing: " + runtime_id)


def verify_beta_qr_thumbnail_fail_open(channel):
    if channel != "beta":
        return
    path = CODE_DIR / "th_26_qr_runtime.js"
    if not path.exists():
        fail("Beta QR module missing")
    text = path.read_text(encoding="utf-8")
    version = text.splitlines()[0] if text.splitlines() else ""
    supported = ("// @version 1.0.1", "// @version 1.0.2", "// @version 1.0.3", "// @version 1.0.4")
    if version not in supported:
        fail("Beta QR fail-open fix requires th_26_qr_runtime.js version 1.0.1/1.0.2/1.0.3/1.0.4")
    if "root.__toolHubQrDecorated26" in text:
        fail("QR module must not attach dynamic state to Android thumbnail View")
    if 'log26(appObj, "w", "thumbnail decorate fail-open=" + String(eDecorate))' not in text:
        fail("QR thumbnail decorator must fail open to the original screenshot View")
    if "controller.__toolHubQrThumbnailDecorated26 = true" not in text:
        fail("QR thumbnail decoration marker must live on the JS controller")
    if version in ("// @version 1.0.2", "// @version 1.0.3", "// @version 1.0.4"):
        for marker in (
            "installLock: new java.util.concurrent.locks.ReentrantLock()",
            "function preflightRuntime26(appObj, reason)",
            'preflightRuntime26(null, "module_startup_or_update")',
            "return { file: dest, meta: meta, downloaded: false }",
            "return { file: downloadRuntime26(meta, dest), meta: meta, downloaded: true }",
            '"runtime preflight " + (installed.downloaded === true ? "downloaded" : "skip_existing")',
        ):
            if marker not in text:
                fail("Beta QR startup preflight marker missing: " + marker)
    if version in ("// @version 1.0.3", "// @version 1.0.4"):
        for marker in (
            'typeof getToolHubRootDir !== "function"',
            'new java.io.File(root, "lib")',
            'assertWritableDirPath(libPath, "ToolHub QR lib")',
        ):
            if marker not in text:
                fail("Beta QR channel-lib marker missing: " + marker)
        if "shortx.getShortXDir" in text:
            fail("Beta QR must not bypass ToolHub channel root")
    if version == "// @version 1.0.4":
        for marker in (
            'function sanitizeError26(error)',
            'typeof writeLog === "function"',
            'var decodeStage = "load_runtime"',
            'decodeStage = "invoke_decode"',
            'runtime failure stage=',
            'message += "\\n" + runtimeDetail.substring(0, 140)',
        ):
            if marker not in text:
                fail("Beta QR runtime diagnostics marker missing: " + marker)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--allow-pending", action="store_true")
    args = ap.parse_args()

    for path in (CODE_DIR, MANIFEST, ENTRY, ENTRY_SHA, HISTORY, SIGN_SCRIPT):
        if not path.exists():
            fail(str(path.relative_to(ROOT)) + " missing")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if int(manifest.get("schema", 0) or 0) < 6:
        fail("manifest schema must be at least 6")
    channel = str(manifest.get("channel", "")).strip().lower()
    branch = str(manifest.get("branch", "")).strip()
    if channel not in CHANNEL_BRANCHES:
        fail("manifest channel must be stable or beta")
    if branch != CHANNEL_BRANCHES[channel]:
        fail("manifest branch does not match channel")
    expected_channel = str(os.environ.get("TOOLHUB_UPDATE_CHANNEL", "")).strip().lower()
    if expected_channel and channel != expected_channel:
        fail("manifest channel %s does not match expected %s" % (channel, expected_channel))
    files = manifest.get("files") or {}
    py_modules = parse_python_modules()
    entry_modules = parse_entry_modules()
    code_names = sorted(path.name for path in CODE_DIR.glob("*.js"))
    if entry_modules != py_modules:
        fail("ToolHub.js modules order differs from generate_signed_manifest.py MODULES")
    if sorted(files.keys()) != code_names or sorted(files.keys()) != sorted(py_modules):
        fail("manifest files differ from code/*.js or MODULES")
    for name in py_modules:
        path = CODE_DIR / name
        meta = files.get(name) or {}
        if sha256_file(path) != str(meta.get("sha256", "")).lower():
            fail("sha256 mismatch: " + name)
        if path.stat().st_size != int(meta.get("size", -1)):
            fail("size mismatch: " + name)

    verify_runtime_files(manifest, parse_python_runtime_files(), py_modules)
    verify_beta_qr_thumbnail_fail_open(channel)

    entry_hash = sha256_file(ENTRY)
    entry_version, entry_source = parse_entry_version()
    entry_meta = manifest.get("entry") or {}
    if str(entry_meta.get("name", "")) != "ToolHub.js":
        fail("manifest entry.name must be ToolHub.js")
    if int(entry_meta.get("version", 0) or 0) != entry_version or str(
        entry_meta.get("versionSource", "")
    ) != entry_source:
        fail("manifest entry version mismatch")
    if str(entry_meta.get("sha256", "")).lower() != entry_hash or int(
        entry_meta.get("size", -1)
    ) != ENTRY.stat().st_size:
        fail("manifest entry hash/size mismatch")
    if entry_meta.get("manualUpdate") is not True:
        fail("manifest entry.manualUpdate must be true")
    if entry_hash not in ENTRY_SHA.read_text(encoding="utf-8").strip():
        fail("ToolHub.js.sha256 mismatch")

    history = json.loads(HISTORY.read_text(encoding="utf-8"))
    asset = ((manifest.get("assets") or {}).get("updateHistory") or {})
    if str(asset.get("name", "")) != "update_history.json" or int(
        asset.get("schema", 0) or 0
    ) != 1:
        fail("manifest updateHistory asset missing or invalid")
    if str(asset.get("sha256", "")).lower() != sha256_file(HISTORY):
        fail("update_history sha256 mismatch")
    if int(asset.get("size", -1)) != HISTORY.stat().st_size:
        fail("update_history size mismatch")
    if int(asset.get("version", 0) or 0) != int(
        history.get("historyVersion", 0) or 0
    ):
        fail("update_history version mismatch")

    records = history.get("records") or []
    if not records:
        fail("update history records missing")
    if int(records[0].get("manifestVersion", 0) or 0) != int(
        manifest.get("version", 0) or 0
    ):
        fail("latest update history record must match manifest version")
    current = records[0]
    release = manifest.get("release") or {}
    if str(release.get("title", "")) != str(current.get("title", "")):
        fail("manifest release title differs from current history record")
    if str(release.get("date", "")) != str(current.get("date", "")):
        fail("manifest release date differs from current history record")
    if [str(x) for x in (release.get("changes") or [])] != [
        str(x) for x in (current.get("details") or [])
    ]:
        fail("manifest release changes differ from current history record")

    history_args = [sys.executable, "scripts/verify_update_history.py"]
    if args.allow_pending:
        history_args.append("--require-one-pending")
    subprocess.check_call(history_args, cwd=str(ROOT))
    subprocess.check_call(
        [sys.executable, "scripts/verify_release_record_flow.py"], cwd=str(ROOT)
    )
    py_files = collect_python_files()
    if py_files:
        subprocess.check_call(
            [sys.executable, "-W", "error::SyntaxWarning", "-m", "py_compile"] + py_files, cwd=str(ROOT)
        )
    print(
        "OK manifest_version=%s channel=%s branch=%s files=%s runtime=%s history=%s entry_version=%s qr_thumbnail_fail_open=%s"
        % (
            manifest.get("version"), channel, branch, len(py_modules),
            len(manifest.get("runtimeFiles") or {}), len(records), entry_version,
            1 if channel == "beta" else 0,
        )
    )


if __name__ == "__main__":
    main()
