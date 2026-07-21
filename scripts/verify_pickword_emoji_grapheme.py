#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "code" / "th_20_pickword.js"
text = SOURCE.read_text(encoding="utf-8")


def require(condition, message):
    if not condition:
        raise SystemExit(message)


require(text.startswith("// @version 1.0.20\n"), "pickword version must be 1.0.20")
for marker in (
    "segmentPickwordGraphemes20",
    "segmentPickwordGraphemesFallback20",
    "android.icu.text.BreakIterator.getCharacterInstance",
    "getCodePointInfo20",
    "findPickwordSafeBoundary20",
    "truncatePickwordTextAtSafeBoundary20",
    "getTextUnitAdvance20",
    "unitStart:",
    "unitEnd:",
    "canvas.drawText(new java.lang.String(unit.text)",
    "getUnitRangeAt: function(indexValue)",
    "normalizeRange: function(startIndex, endIndex)",
    "countSelectedUnits: function(setObj)",
    "countDragSelectionUnits: function(snapshotSet, minIndex, maxIndex, removeRange)",
    "getTextUnitRangeAt20: function(index)",
    "normalizeTextUnitRange20: function(startIndex, endIndex)",
    "setTextUnitSelection20: function(unitRange, selected)",
    "countSelectedGraphemes20(selectedSet)",
    "truncatePickwordTextAtSafeBoundary20(source, INITIAL_TEXT_FAST_LIMIT, true)",
    "truncatePickwordTextAtSafeBoundary20(loaded, DIY_CONFIG.MAX_CHAR_LIMIT, false)",
    "findPickwordSafeBoundary20(pinUnits, desiredEnd, true)",
):
    require(marker in text, "missing emoji/grapheme marker: " + marker)

require("var ch = source.charAt(idx);" not in text, "canvas still draws UTF-16 code units")
require("getCharAdvance(ch)" not in text, "legacy UTF-16 advance path remains")
require("unitStarts" not in text, "unused grapheme-start cache remains")
require("isUnitSelectedInSet20" in text, "direct grapheme selection helper missing")
require("var startUnitIndex = findPickwordUnitIndex20(state.units, minIndex);" in text, "drag count does not use range lookup")
require("dragSnapshotCount + rangeUnitCount - selectedInRange" in text, "drag add-count formula missing")
require("dragSnapshotCount - selectedInRange" in text, "drag remove-count formula missing")
require("function(indexValue) { return setObj[indexValue] === true; }" not in text, "selection count allocates per-unit closures")
require("function(indexValue) { return snapshotSet && snapshotSet[indexValue] === true; }" not in text, "drag count allocates per-unit closures")
require("source.substring(0, INITIAL_TEXT_FAST_LIMIT)" not in text, "unsafe initial truncation remains")
require("loaded.substring(0, DIY_CONFIG.MAX_CHAR_LIMIT)" not in text, "unsafe maximum truncation remains")
require("raw.substring(0, DIY_CONFIG.MAX_CHAR_LIMIT)" not in text, "unsafe state truncation remains")
require("source.substring(0, offset)" in text, "pin first batch content path changed unexpectedly")
require("source.substring(offset, end)" in text, "pin append path changed unexpectedly")
require("selectedIndices = setToArray(selectedSet);" in text, "UTF-16 selection storage removed")
require("fullText.substring(start, end)" in text, "UTF-16 range extraction removed")
require(text.count("new View.OnLongClickListener({") == 2, "API 34 long-click listener count changed")
require(text.count("onLongClickUseDefaultHapticFeedback: function(v)") == 2, "API 34 long-click callback changed")
require("appContext.startActivity(chooser);\n                this.hide();" in text, "share-close order changed")
require("cancelMainPickwordCallbacks20" in text and "cancelPinPickwordCallbacks20" in text, "lifecycle cleanup boundary changed")
print("OK pickword emoji grapheme boundaries verified")
