#!/usr/bin/env python3
"""Temporary compatibility check for the legacy hover-gate workflow."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
base = (ROOT / "code" / "th_01_base.js").read_text(encoding="utf-8")
pointer = (ROOT / "code" / "th_17_pointer.js").read_text(encoding="utf-8")
position = (ROOT / "code" / "th_19_position_state.js").read_text(encoding="utf-8")
verify = (ROOT / "scripts" / "verify_ball_position_state.py").read_text(encoding="utf-8")

required = [
    (base, "POINTER_TEXT_HOVER_MS: 800"),
    (base, "POINTER_AREA_HOVER_MS: 2000"),
    (pointer, '"POINTER_TEXT_HOVER_MS", 800, 300, 10000'),
    (pointer, '"POINTER_AREA_HOVER_MS", 2000, 500, 10000'),
    (position, "extractCurrentPointerText(true, st.releaseTs)"),
    (verify, "confirmed final candidate bypasses the hover-gated extraction"),
]
for text, marker in required:
    if marker not in text:
        raise SystemExit("missing hover-gate marker: " + marker)

candidate_start = position.index("pointerCandidateMatchesFinalHotspot")
candidate_end = position.index('schedulePointerInspectAsync(true, "release_final", true)', candidate_start)
candidate = position[candidate_start:candidate_end]
if "completePointerTextCopy(" in candidate:
    raise SystemExit("confirmed candidate still bypasses hover gate")

print("pointer hover gate already applied")
