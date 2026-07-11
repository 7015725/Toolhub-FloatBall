#!/usr/bin/env python3
"""修复已确认无障碍候选在松手时仍被悬停门槛拦截。"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POSITION = ROOT / "code" / "th_19_position_state.js"
VERIFY = ROOT / "scripts" / "verify_ball_position_state.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s: expected one match, got %d" % (label, count))
    return text.replace(old, new, 1)


def patch_position():
    text = POSITION.read_text(encoding="utf-8")
    text = replace_once(text, "// @version 1.0.5", "// @version 1.0.6", "position version")

    old = '''      if (candidateAtFinalHotspot) {
        try {
          logPosition(this, "i",
            "pointer release use confirmed candidate ready=" +
            String(this.isPointerTextHoverReady ? this.isPointerTextHoverReady(st.releaseTs) === true : false)
          );
        } catch (eCandidateLog) {}
        try { this.extractCurrentPointerText(true, st.releaseTs); }
        catch (eExtract) {
          logPosition(this, "e", "confirmed pointer candidate extract fail: " + String(eExtract));
          return false;
        }
        return true;
      }
'''
    new = '''      if (candidateAtFinalHotspot) {
        var candidateHoverReady = false;
        try {
          candidateHoverReady = this.isPointerTextHoverReady ?
            this.isPointerTextHoverReady(st.releaseTs) === true : false;
        } catch (eCandidateReady) { candidateHoverReady = false; }
        try {
          logPosition(this, "i",
            "pointer release commit confirmed candidate hoverReady=" +
            String(candidateHoverReady) +
            " areaArmed=" + String(st.areaArmReady === true)
          );
        } catch (eCandidateLog) {}
        try {
          return this.completePointerTextCopy(
            String(st.currentText),
            {
              left: Number(st.currentRect.left),
              top: Number(st.currentRect.top),
              right: Number(st.currentRect.right),
              bottom: Number(st.currentRect.bottom)
            },
            "TEXT_PICK_SUCCESS",
            {
              source: "confirmed_final_candidate",
              hoverReady: candidateHoverReady,
              areaArmed: st.areaArmReady === true
            }
          ) === true;
        } catch (eCommitCandidate) {
          logPosition(this, "e", "confirmed pointer candidate commit fail: " + String(eCommitCandidate));
          return false;
        }
      }
'''
    text = replace_once(text, old, new, "confirmed candidate release")

    for marker in (
        "// @version 1.0.6",
        "pointer release commit confirmed candidate hoverReady=",
        'source: "confirmed_final_candidate"',
        '"TEXT_PICK_SUCCESS"',
        "this.completePointerTextCopy(",
    ):
        if marker not in text:
            raise SystemExit("position marker missing: " + marker)
    POSITION.write_text(text, encoding="utf-8")


def patch_verify():
    text = VERIFY.read_text(encoding="utf-8")
    text = replace_once(text, '"// @version 1.0.5",', '"// @version 1.0.6",', "verify version")

    old = '''    candidate_at = finalizer.index("pointerCandidateMatchesFinalHotspot")
    extract_at = finalizer.index("extractCurrentPointerText(true, st.releaseTs)", candidate_at)
    scan_at = finalizer.index('schedulePointerInspectAsync(true, "release_final", true)', extract_at)
    if not (candidate_at < extract_at < scan_at):
        fail("confirmed final candidate must be extracted before fallback final scan")
'''
    new = '''    candidate_at = finalizer.index("pointerCandidateMatchesFinalHotspot")
    candidate_commit_at = finalizer.index('source: "confirmed_final_candidate"', candidate_at)
    candidate_copy_at = finalizer.rfind("completePointerTextCopy(", candidate_at, candidate_commit_at)
    scan_at = finalizer.index('schedulePointerInspectAsync(true, "release_final", true)', candidate_commit_at)
    if not (candidate_at < candidate_copy_at < candidate_commit_at < scan_at):
        fail("confirmed final candidate must be committed directly before fallback final scan")
    candidate_section = finalizer[candidate_at:scan_at]
    if "extractCurrentPointerText(true, st.releaseTs)" in candidate_section:
        fail("confirmed final candidate still passes through hover-gated extraction")
'''
    text = replace_once(text, old, new, "verify confirmed candidate direct commit")

    for marker in (
        '"// @version 1.0.6",',
        'source: "confirmed_final_candidate"',
        "confirmed final candidate still passes through hover-gated extraction",
    ):
        if marker not in text:
            raise SystemExit("verify marker missing: " + marker)
    VERIFY.write_text(text, encoding="utf-8")


def main():
    patch_position()
    patch_verify()
    print("pointer confirmed candidate fix applied")


if __name__ == "__main__":
    main()
