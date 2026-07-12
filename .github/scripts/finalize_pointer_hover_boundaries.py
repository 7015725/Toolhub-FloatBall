#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TARGET = ROOT / "code" / "th_17_pointer.js"

text = TARGET.read_text(encoding="utf-8")


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit("boundary patch expected once for %s, found %d" % (label, count))
    text = text.replace(old, new, 1)


replace_once(
    '''      candidateStillHit =
        !!st.boundRect &&
        this.pointerRectHitScore(pack.x, pack.y, st.boundRect) >= 0;''',
    '''      candidateStillHit =
        !!st.boundRect &&
        this.pointerRectInside(pack.x, pack.y, st.boundRect) === true;''',
    "strict final-timeout candidate hit",
)

replace_once(
    '''    st.textReadyRunnable = null;

    st.currentText = "";''',
    '''    st.textReadyRunnable = null;
    try {
      this.invalidatePointerTextHoverCredential(st, "screen_reflow", false);
    } catch(eCredentialReflow) {}
    st.textStableAnchorX = -100000;
    st.textStableAnchorY = -100000;
    st.textStableLastX = -100000;
    st.textStableLastY = -100000;
    st.textStableSince = 0;

    st.currentText = "";''',
    "screen reflow credential invalidation",
)

replace_once(
    '''    // 仍处于拖动状态时，以旋转后的热点重新开始悬停计时。
    try {
      if (st.dragging) this.updatePointerAreaHoldCandidate();
    } catch(eRestartHoldReflow) {}''',
    '''    // 仍处于拖动状态时，以旋转后的热点重新开始独立取字悬停和框选计时。
    try {
      if (st.dragging) {
        this.resetPointerTextStableHover(
          st,
          th17Now(),
          this.getPointerHotspot(),
          "screen_reflow"
        );
        this.updatePointerAreaHoldCandidate();
      }
    } catch(eRestartHoldReflow) {}''',
    "screen reflow stable hover restart",
)

TARGET.write_text(text, encoding="utf-8")
print("OK finalized pointer hover boundary handling")
