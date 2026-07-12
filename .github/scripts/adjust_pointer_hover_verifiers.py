#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BALL = ROOT / "scripts" / "verify_ball_position_state.py"
ISSUE85 = ROOT / "scripts" / "verify_pointer_issue_85.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("adjust verifier expected once for %s: %r found %d" % (label, old, count))
    return text.replace(old, new, 1)


text = BALL.read_text(encoding="utf-8")
replacements = [
    ('"// @version 1.0.9",', '"// @version 1.0.10",', "th19 version"),
    (
        '        "pointerRectHitScore(hp.x, hp.y, pointerState.currentRect)",',
        '        "pointerRectInside(hp.x, hp.y, pointerState.currentRect)",',
        "strict final candidate",
    ),
    ('        "// @version 1.1.33",', '        "// @version 1.1.34",', "th17 version"),
    ('        "lastValidPickReadyAt",\n', '', "ready proof is no longer obsolete"),
    ('        "pointerRectHitScore",\n', '        "pointerRectInside",\n', "strict recent hit"),
]
for old, new, label in replacements:
    text = replace_once(text, old, new, label)

anchor = '''    if "areaHoldDelay: 2000" not in pointer_core:
        fail("pointer state area hover default is not 2000ms")
'''
addition = '''    if "areaHoldDelay: 2000" not in pointer_core:
        fail("pointer state area hover default is not 2000ms")
    for marker in (
        "updatePointerTextStableMotion = function",
        "grantPointerTextHoverCredential = function",
        "hasPointerTextHoverCredential = function",
        "TEXT_HOVER_NOT_READY",
        "TEXT_POINTER_OUTSIDE_FRAME",
    ):
        if marker not in pointer_core:
            fail("independent pointer text hover credential missing: " + marker)
'''
text = replace_once(text, anchor, addition, "independent hover markers")
BALL.write_text(text, encoding="utf-8")

issue = ISSUE85.read_text(encoding="utf-8")
issue = replace_once(
    issue,
    '        and "this.pointerRectHitScore(pack.x, pack.y, st.boundRect) >= 0" in apply_inspect\n',
    '        and "this.pointerRectInside(pack.x, pack.y, st.boundRect) === true" in apply_inspect\n',
    "issue85 strict timeout reuse hit",
)

n5_old = '''        and "st.hoverSince = 0;" in pointer_reflow
        and "this.resetPointerAreaHold()" in pointer_reflow
        and '"screen_reflow:" + String(reason || "")' in pointer_reflow,
        "text_pick reflow must clear pre-rotation candidates and restart inspection",
'''
n5_new = '''        and "st.hoverSince = 0;" in pointer_reflow
        and 'this.invalidatePointerTextHoverCredential(st, "screen_reflow", false)' in pointer_reflow
        and "st.textStableSince = 0;" in pointer_reflow
        and "this.resetPointerTextStableHover(" in pointer_reflow
        and "this.resetPointerAreaHold()" in pointer_reflow
        and '"screen_reflow:" + String(reason || "")' in pointer_reflow,
        "text_pick reflow must clear candidates and hover credentials, then restart stable timing",
'''
issue = replace_once(issue, n5_old, n5_new, "issue85 screen reflow credential reset")
ISSUE85.write_text(issue, encoding="utf-8")

print("OK adjusted pointer hover credential verifiers")
