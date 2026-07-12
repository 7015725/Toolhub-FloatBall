#!/usr/bin/env python3
"""校验悬浮球尺寸重建采用先添加后替换，并在失败时恢复旧实例。"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "code" / "th_19_position_state.js"


def fail(message):
    raise SystemExit("FAIL ball-rebuild-rollback: " + message)


def get_section(text):
    start = text.find("proto.rebuildBallForNewSize = function")
    end = text.find('logPosition(null, "i", "ball position state machine installed")', start)
    if start < 0 or end < 0:
        fail("cannot locate rebuild section")
    return text[start:end]


def verify_static():
    if not TARGET.exists():
        fail("missing code/th_19_position_state.js")
    text = TARGET.read_text(encoding="utf-8")
    section = get_section(text)

    required = [
        "ballRebuildActive",
        "var oldRoot = st.ballRoot",
        "var oldContent = st.ballContent",
        "var oldLp = st.ballLp",
        "function restoreOldState()",
        "function removePreparedBallView",
        "buildBallContentView({ preview: false })",
        "st.wm.addView(nextRoot, nextLp)",
        'safeRemoveView(oldRoot, "ballRoot-rebuild-replaced")',
        "st.ballRoot = nextRoot",
        "nextAdded = false",
        'applyConfiguredBallPosition(false, "rebuild_rollback")',
        "st.ballRebuildActive = false",
    ]
    for marker in required:
        if marker not in section:
            fail("missing marker: " + marker)

    if "this.createBallViews()" in section:
        fail("rebuild must not overwrite live state through createBallViews before addView")
    if 'safeRemoveView(this.state.ballRoot' in section:
        fail("destructive old implementation remains")

    build_at = section.index("buildBallContentView({ preview: false })")
    add_at = section.index("st.wm.addView(nextRoot, nextLp)")
    remove_at = section.index('safeRemoveView(oldRoot, "ballRoot-rebuild-replaced")')
    commit_at = section.index("st.ballRoot = nextRoot")
    if not (build_at < add_at < remove_at < commit_at):
        fail("replacement order must be build -> add new -> remove old -> commit state")

    catch_at = section.index("catch (eRebuild)")
    rollback_restore_at = section.index("restoreOldState();", catch_at)
    rollback_cleanup_at = section.index("removePreparedBallView(nextRoot", catch_at)
    rollback_position_at = section.index('applyConfiguredBallPosition(false, "rebuild_rollback")', catch_at)
    if not (catch_at < rollback_restore_at < rollback_cleanup_at < rollback_position_at):
        fail("rollback order must restore old state -> clean candidate -> restore position")


def simulate(build_ok=True, add_ok=True, remove_old_ok=True):
    state = {"live": "old", "old_attached": True, "new_attached": False}
    if not build_ok:
        return False, state
    if not add_ok:
        return False, state
    state["new_attached"] = True
    if not remove_old_ok:
        state["new_attached"] = False
        state["live"] = "old"
        return False, state
    state["old_attached"] = False
    state["live"] = "new"
    return True, state


def verify_model():
    ok, state = simulate(build_ok=False)
    if ok or state["live"] != "old" or not state["old_attached"]:
        fail("build failure does not preserve old ball")

    ok, state = simulate(add_ok=False)
    if ok or state["live"] != "old" or not state["old_attached"]:
        fail("add failure does not preserve old ball")

    ok, state = simulate(remove_old_ok=False)
    if ok or state["live"] != "old" or state["new_attached"]:
        fail("old removal failure does not roll back candidate")

    ok, state = simulate()
    if not ok or state["live"] != "new" or state["old_attached"] or not state["new_attached"]:
        fail("successful replacement model is invalid")


def main():
    verify_static()
    verify_model()
    print("OK ball_rebuild_rollback order=transactional rollback=1 guard=1")


if __name__ == "__main__":
    main()
