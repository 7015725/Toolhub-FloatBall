#!/usr/bin/env python3
"""一次性合并 ToolHub.js 的目录可写探针实现。"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY_PATH = ROOT / "ToolHub.js"
VERIFY_PATH = ROOT / ".github/workflows/verify.yml"
REGRESSION_PATH = ROOT / "scripts/verify_entry_writable_probe.py"

OLD_BLOCK = '''function canWriteDirPath(path) {
    try {
        if (!path) return false;
        var dir = new java.io.File(String(path));
        if (!dir.exists() && !dir.mkdirs()) return false;
        if (!dir.isDirectory()) return false;
        var probe = new java.io.File(dir, ".write_probe_" + java.lang.System.currentTimeMillis());
        var out = new java.io.FileOutputStream(probe, false);
        out.write(49);
        out.close();
        try { probe.delete(); } catch (eDelProbe) {}
        return true;
    } catch (eProbe) { return false; }
}

function assertWritableDirPath(path, label) {
    try {
        if (!path) throw String(label || "dir") + " path empty";
        var dir = new java.io.File(String(path));
        if (!dir.exists() && !dir.mkdirs()) throw String(label || "dir") + " mkdirs failed: " + path;
        if (!dir.isDirectory()) throw String(label || "dir") + " is not directory: " + path;

        var probe = new java.io.File(dir, ".write_probe_" + java.lang.System.currentTimeMillis());
        var out = new java.io.FileOutputStream(probe, false);
        try {
            out.write(49);
            out.flush();
        } finally {
            try { out.close(); } catch (eCloseProbe) {}
        }
        try { probe.delete(); } catch (eDelProbe) {}

        return true;
    } catch (e) {
        throw String(label || "dir") + " not writable: " + String(path) + " / " + String(e);
    }
}
'''

NEW_BLOCK = '''function canWriteDirPath(path) {
    try {
        assertWritableDirPath(path, "dir");
        return true;
    } catch (eProbe) {
        return false;
    }
}

function assertWritableDirPath(path, label) {
    var probe = null;
    var out = null;
    try {
        if (!path) throw String(label || "dir") + " path empty";
        var dir = new java.io.File(String(path));
        if (!dir.exists() && !dir.mkdirs()) throw String(label || "dir") + " mkdirs failed: " + path;
        if (!dir.isDirectory()) throw String(label || "dir") + " is not directory: " + path;

        var suffix = String(java.lang.System.currentTimeMillis());
        try { suffix += "_" + String(java.lang.Thread.currentThread().getId()); } catch (eThreadId) {}
        probe = new java.io.File(dir, ".write_probe_" + suffix);
        out = new java.io.FileOutputStream(probe, false);
        out.write(49);
        out.flush();
        return true;
    } catch (e) {
        throw String(label || "dir") + " not writable: " + String(path) + " / " + String(e);
    } finally {
        closeQuietly(out);
        try { if (probe && probe.exists()) probe.delete(); } catch (eDelProbe) {}
    }
}
'''

REGRESSION = '''#!/usr/bin/env python3
"""验证 ToolHub.js 目录可写探针保持单一实现和失败清理。"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY = (ROOT / "ToolHub.js").read_text(encoding="utf-8")


def fail(message):
    raise SystemExit("FAIL entry-writable-probe: " + message)


def require(fragment, label):
    if fragment not in ENTRY:
        fail("missing %s: %s" % (label, fragment))


require('assertWritableDirPath(path, "dir");', "boolean wrapper delegation")
require('var probe = null;', "probe handle")
require('var out = null;', "stream handle")
require('java.lang.Thread.currentThread().getId()', "concurrent probe suffix")
require('closeQuietly(out);', "stream cleanup")
require('if (probe && probe.exists()) probe.delete();', "probe cleanup")

if ENTRY.count('new java.io.FileOutputStream(probe, false)') != 1:
    fail("probe FileOutputStream must have exactly one owner")
if ENTRY.count('.write_probe_') != 1:
    fail("probe filename construction must have exactly one owner")

can_start = ENTRY.find('function canWriteDirPath(path)')
assert_start = ENTRY.find('function assertWritableDirPath(path, label)')
if can_start < 0 or assert_start < 0 or can_start >= assert_start:
    fail("writable probe functions missing or reordered")
can_body = ENTRY[can_start:assert_start]
if 'new java.io.File(' in can_body or 'FileOutputStream' in can_body:
    fail("canWriteDirPath must not duplicate probe I/O")

assert_body_end = ENTRY.find('\nfunction getToolHubRootDir()', assert_start)
if assert_body_end < 0:
    fail("assertWritableDirPath boundary missing")
assert_body = ENTRY[assert_start:assert_body_end]
if assert_body.find('finally {') < 0:
    fail("probe cleanup must be in finally")
if assert_body.find('closeQuietly(out);') < assert_body.find('finally {'):
    fail("stream cleanup must execute from finally")

print("Entry writable probe verification passed")
'''

entry = ENTRY_PATH.read_text(encoding="utf-8")
if OLD_BLOCK in entry:
    entry = entry.replace(OLD_BLOCK, NEW_BLOCK, 1)
elif NEW_BLOCK not in entry:
    raise SystemExit("writable probe anchor missing")
ENTRY_PATH.write_text(entry, encoding="utf-8")

REGRESSION_PATH.write_text(REGRESSION, encoding="utf-8")

verify = VERIFY_PATH.read_text(encoding="utf-8")
anchor = "          python3 scripts/verify_entry_redundancy_cleanup.py\n"
line = "          python3 scripts/verify_entry_writable_probe.py\n"
if line not in verify:
    if anchor not in verify:
        raise SystemExit("verify workflow anchor missing")
    verify = verify.replace(anchor, anchor + line, 1)
VERIFY_PATH.write_text(verify, encoding="utf-8")

print("Entry writable probe refactor applied")
