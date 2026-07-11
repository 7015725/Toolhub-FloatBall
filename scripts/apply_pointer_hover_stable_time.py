#!/usr/bin/env python3
"""Count verified stable pointer hold time toward text hover readiness."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POINTER = ROOT / "code" / "th_17_pointer.js"
VERIFY = ROOT / "scripts" / "verify_ball_position_state.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s: expected one match, got %d" % (label, count))
    return text.replace(old, new, 1)


def patch_pointer():
    text = POINTER.read_text(encoding="utf-8")
    text = replace_once(text, "// @version 1.1.29", "// @version 1.1.30", "pointer version")
    text = replace_once(text, "      areaHoldDelay: 1000,", "      areaHoldDelay: 2000,", "state area hover default")

    marker = '''FloatBallAppWM.prototype.isPointerTextHoverReady = function(atTs) {\n'''
    helper = '''FloatBallAppWM.prototype.syncPointerTextHoverFromStableHold = function(atTs) {
  var st = this.ensurePointerToolState();
  if (!st.currentText || !st.currentRect) return false;
  if (st.currentKey && st.hoverKey && String(st.currentKey) !== String(st.hoverKey)) return false;

  var stableSince = 0;
  var ts = Number(atTs || th17Now());
  try { stableSince = Number(st.areaHoldSince || 0); } catch (eStableSince) { stableSince = 0; }
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  if (isNaN(stableSince) || stableSince <= 0 || stableSince > ts) return false;

  var anchorX = Number(st.areaHoldAnchorX || -100000);
  var anchorY = Number(st.areaHoldAnchorY || -100000);
  if (isNaN(anchorX) || isNaN(anchorY) || anchorX < -90000 || anchorY < -90000) return false;

  var hp = null;
  try { hp = this.getPointerHotspot(); } catch (eHotspot) { hp = null; }
  if (!hp) return false;

  var anchorHit = false;
  var hotspotHit = false;
  try { anchorHit = this.pointerRectHitScore(anchorX, anchorY, st.currentRect) >= 0; } catch (eAnchorHit) { anchorHit = false; }
  try { hotspotHit = this.pointerRectHitScore(hp.x, hp.y, st.currentRect) >= 0; } catch (eHotspotHit) { hotspotHit = false; }
  if (!anchorHit || !hotspotHit) return false;

  var currentSince = Number(st.hoverSince || 0);
  if (!isNaN(currentSince) && currentSince > 0 && currentSince <= stableSince) return false;

  st.hoverSince = stableSince;
  st.hoverX = anchorX;
  st.hoverY = anchorY;
  try {
    safeLog(this.L, 'i',
      "pointer text hover reuse stable hold elapsed=" + String(Math.max(0, ts - stableSince)) +
      " hoverMinMs=" + String(this.getPointerTextHoverLimitMs())
    );
  } catch (eLogStableHover) {}
  return true;
};

'''
    text = replace_once(text, marker, helper + marker, "stable hover helper insertion")

    ready_old = '''  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  return ts - Number(st.hoverSince || 0) >= this.getPointerTextHoverLimitMs();
'''
    ready_new = '''  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  try { this.syncPointerTextHoverFromStableHold(ts); } catch (eStableHover) {}
  return ts - Number(st.hoverSince || 0) >= this.getPointerTextHoverLimitMs();
'''
    text = replace_once(text, ready_old, ready_new, "hover readiness stable-time sync")

    POINTER.write_text(text, encoding="utf-8")


def patch_verify():
    text = VERIFY.read_text(encoding="utf-8")
    text = replace_once(text, '"// @version 1.1.29",', '"// @version 1.1.30",', "verify pointer version")
    marker = '''        "small_area_fallback",
'''
    replacement = '''        "small_area_fallback",
        "syncPointerTextHoverFromStableHold",
        "pointer text hover reuse stable hold",
'''
    text = replace_once(text, marker, replacement, "verify stable hover markers")

    insert_before = '''    extract_section = section(
'''
    checks = '''    stable_hover = section(
        pointer_core,
        "FloatBallAppWM.prototype.syncPointerTextHoverFromStableHold = function",
        "FloatBallAppWM.prototype.isPointerTextHoverReady = function",
    )
    for marker in (
        "areaHoldSince",
        "areaHoldAnchorX",
        "areaHoldAnchorY",
        "pointerRectHitScore(anchorX, anchorY, st.currentRect)",
        "pointerRectHitScore(hp.x, hp.y, st.currentRect)",
        "st.hoverSince = stableSince",
    ):
        if marker not in stable_hover:
            fail("stable text-hover reconciliation is incomplete: " + marker)
    ready_section = section(
        pointer_core,
        "FloatBallAppWM.prototype.isPointerTextHoverReady = function",
        "FloatBallAppWM.prototype.getPointerTextHoverRemainMs = function",
    )
    if "syncPointerTextHoverFromStableHold(ts)" not in ready_section:
        fail("text hover readiness does not count verified stable hold time")
    if "areaHoldDelay: 2000" not in pointer_core:
        fail("pointer state area hover default is not 2000ms")

'''
    text = replace_once(text, insert_before, checks + insert_before, "verify stable hover checks")
    VERIFY.write_text(text, encoding="utf-8")


def validate_source():
    pointer = POINTER.read_text(encoding="utf-8")
    required = [
        "// @version 1.1.30",
        "areaHoldDelay: 2000",
        "syncPointerTextHoverFromStableHold",
        "pointerRectHitScore(anchorX, anchorY, st.currentRect)",
        "pointerRectHitScore(hp.x, hp.y, st.currentRect)",
        "syncPointerTextHoverFromStableHold(ts)",
    ]
    for marker in required:
        if marker not in pointer:
            raise SystemExit("missing source marker: " + marker)
    forbidden = ["let ", "const ", "=>", "?.", "??", "`"]
    for token in forbidden:
        if token in pointer:
            raise SystemExit("Rhino ES5 incompatible token found: " + token)


def main():
    patch_pointer()
    patch_verify()
    validate_source()
    print("stable pointer hover time patch applied")


if __name__ == "__main__":
    main()
