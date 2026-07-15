#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "code" / "th_08_content.js"
text = path.read_text(encoding="utf-8")
replacements = (
    ("          ds.setColor(color);", "          toolhubSafeSetPaintColor(ds, color);"),
    ("                  try { summary.setHighlightColor(android.graphics.Color.TRANSPARENT); } catch (eHighlight) {}", "                  try { toolhubSafeSetHighlightColor(summary, android.graphics.Color.TRANSPARENT); } catch (eHighlight) {}"),
)
for old, new in replacements:
    if text.count(old) != 1:
        raise SystemExit("color bridge replacement anchor missing or duplicated: " + old)
    text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")
