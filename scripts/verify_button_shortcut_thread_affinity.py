#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "code" / "th_14_button_shortcut.js"


def fail(message: str) -> None:
    print("ERROR:", message)
    raise SystemExit(1)


def require(source: str, needle: str, label: str) -> None:
    if needle not in source:
        fail(f"missing {label}: {needle}")


def main() -> int:
    source = TARGET.read_text(encoding="utf-8")

    require(source, "function __scEnsureLoadedAndRender(force)", "force-aware loader")
    require(source, "__scEnsureLoadedAndRender(true)", "forced refresh call")
    require(source, "__scEnsureLoadedAndRender(false)", "normal expand call")
    require(source, "function __scPostToOwnerView(generation, callback)", "owner-view dispatcher")
    require(source, "scList.post(new java.lang.Runnable", "View.post dispatch")
    require(source, "generation: 0", "generation state")
    require(source, "disposed: false", "disposed state")
    require(source, "reloadPending: false", "pending reload state")
    require(source, "ownerThreadId: __scThreadId()", "owner thread tracking")
    require(source, "shortcut picker render blocked reason=wrong_thread", "render thread guard log")
    require(source, "shortcut picker callback dropped reason=stale_generation", "stale callback log")
    require(source, "shortcut picker callback dropped reason=detached", "detached callback log")
    require(source, "addOnAttachStateChangeListener", "lifecycle listener")
    require(source, "shortcut picker load begin", "load begin log")
    require(source, "shortcut picker scan done", "scan completion log")
    require(source, "shortcut picker apply done", "UI apply log")

    loader_match = re.search(
        r"function __scEnsureLoadedAndRender\(force\)\s*\{(?P<body>.*?)\n\s*\}\n\n\s*scList\.setOnItemClickListener",
        source,
        re.S,
    )
    if not loader_match:
        fail("cannot isolate __scEnsureLoadedAndRender body")
    loader = loader_match.group("body")
    if "runOnUiThreadSafe" in loader:
        fail("shortcut loader must not call global runOnUiThreadSafe")
    if "Looper.getMainLooper" in loader:
        fail("shortcut loader must not target the global main looper")

    render_match = re.search(
        r"function __scRenderListNow\(query\)\s*\{(?P<body>.*?)\n\s*\}\n\n\s*function __scScheduleRender",
        source,
        re.S,
    )
    if not render_match:
        fail("cannot isolate __scRenderListNow body")
    render = render_match.group("body")
    if "ownerThreadId" not in render or "currentThreadId" not in render:
        fail("render function has no owner-thread guard")

    if "forceReload" in source:
        fail("legacy forceReload state must be removed")

    version_match = re.search(r"^// @version\s+([0-9.]+)", source, re.M)
    if not version_match or version_match.group(1) != "1.0.2":
        fail("module version must be 1.0.2")

    print("OK shortcut_picker_thread_affinity owner_view_post=1 generation=1 lifecycle=1 logging=1")
    return 0


if __name__ == "__main__":
    sys.exit(main())
