#!/usr/bin/env python3
"""验证 ToolHub.js 第一批入口冗余不会回归。"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY = (ROOT / "ToolHub.js").read_text(encoding="utf-8")


def fail(message):
    raise SystemExit("FAIL entry-redundancy-cleanup: " + message)


def require(fragment, label):
    if fragment not in ENTRY:
        fail("missing %s: %s" % (label, fragment))


def forbid(fragment, label):
    if fragment in ENTRY:
        fail("forbidden %s: %s" % (label, fragment))


forbid("function getAndroidContext()", "unused context resolver")
forbid("function getUpdateSourceText()", "constant source wrapper")
forbid("getUpdateSourceText()", "source wrapper call")
forbid('TOOLHUB_UPDATE_STATE.source = "GitHub";', "constant runtime source")
forbid('source: "GitHub",', "constant startup source")
require(
    'TOOLHUB_UPDATE_STATE.source = "GitHub/" + TOOLHUB_UPDATE_BRANCH;',
    "runtime channel-aware GitHub source",
)
require(
    'source: "GitHub/" + TOOLHUB_UPDATE_BRANCH,',
    "startup channel-aware GitHub source",
)
require("var versionNum = getTrustedManifestVersionNumber();", "shared trusted manifest version parser")

# 入口中版本解析只能保留在 getTrustedManifestVersionNumber() 内，避免状态构建重复实现。
needle = "if (__securityStatus && __securityStatus.version !== undefined && __securityStatus.version !== null) versionNum = Number(__securityStatus.version || 0);"
if ENTRY.count(needle) != 1:
    fail("trusted manifest version parsing should have exactly one owner, found %d" % ENTRY.count(needle))

print("Entry redundancy cleanup verification passed")
