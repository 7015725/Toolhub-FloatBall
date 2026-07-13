#!/usr/bin/env python3
"""验证入口和仓库发布链只保留 GitHub 更新源。"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY = (ROOT / "ToolHub.js").read_text(encoding="utf-8")
README = (ROOT / "README.md").read_text(encoding="utf-8")
ARCH = (ROOT / "ARCHITECTURE.md").read_text(encoding="utf-8")
STRUCTURE = (ROOT / "STRUCTURE.md").read_text(encoding="utf-8")
PUBLISH = (ROOT / ".github/workflows/publish-release.yml").read_text(encoding="utf-8")


def fail(message):
    raise SystemExit("FAIL github-only-source: " + message)


def require(text, fragment, label):
    if fragment not in text:
        fail("missing %s: %s" % (label, fragment))


def forbid(text, fragment, label):
    if fragment in text:
        fail("forbidden %s: %s" % (label, fragment))


require(
    ENTRY,
    'var GIT_ROOT = "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/main/";',
    "fixed GitHub update root",
)

for fragment in (
    "UPDATE_SOURCE",
    "UPDATE_ROOTS",
    "git.xin-blog.com",
    "Gitea",
):
    forbid(ENTRY, fragment, "entry legacy source")

for text, label in (
    (README, "README"),
    (ARCH, "ARCHITECTURE"),
    (STRUCTURE, "STRUCTURE"),
    (PUBLISH, "publish-release"),
):
    forbid(text, "git.xin-blog.com", label + " Gitea URL")
    forbid(text, "Gitea", label + " Gitea reference")

require(README, "更新源固定为 GitHub", "README GitHub-only statement")
require(ARCH, "更新源固定为 GitHub", "architecture GitHub-only statement")
require(STRUCTURE, "更新源固定为 GitHub", "structure GitHub-only statement")

for removed_path in (
    ROOT / ".github/workflows/mirror-gitea.yml",
    ROOT / ".github/workflows/check-update-sources.yml",
    ROOT / "scripts/check_update_source_consistency.py",
    ROOT / "scripts/sync_gitea_main.sh",
):
    if removed_path.exists():
        fail("legacy Gitea file still exists: %s" % removed_path.relative_to(ROOT))

print("GitHub-only update source verification passed")
