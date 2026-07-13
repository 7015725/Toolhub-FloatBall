#!/usr/bin/env python3
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

assert_body_end = ENTRY.find('
function getToolHubRootDir()', assert_start)
if assert_body_end < 0:
    fail("assertWritableDirPath boundary missing")
assert_body = ENTRY[assert_start:assert_body_end]
if assert_body.find('finally {') < 0:
    fail("probe cleanup must be in finally")
if assert_body.find('closeQuietly(out);') < assert_body.find('finally {'):
    fail("stream cleanup must execute from finally")

print("Entry writable probe verification passed")
