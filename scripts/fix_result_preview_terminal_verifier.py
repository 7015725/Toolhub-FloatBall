#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "scripts" / "verify_result_preview.py"
text = PATH.read_text(encoding="utf-8")
old = '''        and "render.drawCount" in preview\n        and "render.firstDrawAt" in preview\n        and "render.visibleStartedAt" not in preview\n        and "lastReason:" not in state_init\n        and "st.lastReason" not in preview\n        and "render.firstDrawAt" in preview\n        and "st.visibleStartedAt" in preview,\n'''
new = '''        and "render.drawCount" in preview\n        and "render.visibleStartedAt" not in preview\n        and "lastReason:" not in state_init\n        and "st.lastReason" not in preview\n        and "render.firstDrawAt" in preview\n        and "st.visibleStartedAt" in preview,\n'''
count = text.count(old)
if count != 1:
    raise SystemExit("terminal verifier cleanup count=%d" % count)
PATH.write_text(text.replace(old, new, 1), encoding="utf-8")
print("Cleaned duplicate terminal verifier assertion")
