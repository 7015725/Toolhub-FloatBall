#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TARGET = ROOT / "scripts" / "verify_ball_position_state.py"

text = TARGET.read_text(encoding="utf-8")

replacements = [
    ('"// @version 1.0.9",', '"// @version 1.0.10",'),
    ('        "pointerRectHitScore(hp.x, hp.y, pointerState.currentRect)",',
     '        "pointerRectInside(hp.x, hp.y, pointerState.currentRect)",'),
    ('        "// @version 1.1.33",', '        "// @version 1.1.34",'),
    ('        "lastValidPickReadyAt",\n', ''),
    ('        "pointerRectHitScore",\n', '        "pointerRectInside",\n'),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit("adjust verifier expected once: %r found %d" % (old, count))
    text = text.replace(old, new, 1)

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
if text.count(anchor) != 1:
    raise SystemExit("adjust verifier anchor missing")
text = text.replace(anchor, addition, 1)

TARGET.write_text(text, encoding="utf-8")
print("OK adjusted ball-position verification for independent hover credential")
