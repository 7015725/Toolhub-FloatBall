#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "scripts" / "verify_pointer_issue_85.py"
text = PATH.read_text(encoding="utf-8")

old = '''POINTER = ROOT / "code" / "th_17_pointer.js"
POINTER_OCR = ROOT / "code" / "th_18_pointer_ocr.js"
ANIMATION = ROOT / "code" / "th_09_animation.js"
'''
new = '''POINTER = ROOT / "code" / "th_17_pointer.js"
POINTER_OCR = ROOT / "code" / "th_18_pointer_ocr.js"
POSITION = ROOT / "code" / "th_19_position_state.js"
ANIMATION = ROOT / "code" / "th_09_animation.js"
'''
if text.count(old) != 1:
    raise SystemExit("pointer path block mismatch")
text = text.replace(old, new, 1)

old = '''    required = [POINTER, POINTER_OCR, ANIMATION, VERIFY_MANIFEST]
'''
new = '''    required = [POINTER, POINTER_OCR, POSITION, ANIMATION, VERIFY_MANIFEST]
'''
if text.count(old) != 1:
    raise SystemExit("required block mismatch")
text = text.replace(old, new, 1)

old = '''    pointer = read_text(POINTER)
    ocr = read_text(POINTER_OCR)
    animation = read_text(ANIMATION)
'''
new = '''    pointer = read_text(POINTER)
    ocr = read_text(POINTER_OCR)
    position = read_text(POSITION)
    animation = read_text(ANIMATION)
'''
if text.count(old) != 1:
    raise SystemExit("read block mismatch")
text = text.replace(old, new, 1)

old = '''    tap_wrapper = section(
        ocr,
        "var oldPointerBallTap18 = proto.onPointerBallTap;",
        "proto.setupTouchListener = function()",
    )
    tap_override = tap_wrapper.find("proto.onPointerBallTap = function(rawX, rawY)")
    tap_delegate = tap_wrapper.find("return oldPointerBallTap18.call(this, rawX, rawY)", tap_override + 1)
    result.require(
        "W2 triple tap cancellation delegates to core",
        tap_override >= 0 and tap_delegate > tap_override,
        "fixed-edge tap wrapper must delegate active taps to oldPointerBallTap18",
    )
'''
new = '''    touch_owner = section(
        position,
        "proto.setupTouchListener = function()",
        "proto.onScreenChangedReflow = function",
    )
    result.require(
        "W2 triple tap cancellation delegates to core",
        "installFixedEdgePointer18" not in ocr
        and "proto.setupTouchListener = function()" not in ocr
        and "self.onPointerBallTap(rawX, rawY)" in touch_owner,
        "th_19 must own touch handling and delegate active pointer taps to core onPointerBallTap",
    )
'''
if text.count(old) != 1:
    raise SystemExit("W2 block mismatch")
text = text.replace(old, new, 1)

PATH.write_text(text, encoding="utf-8")
print("pointer issue verifier ownership updated")
