#!/usr/bin/env python3
"""Enforce the pointer text hover gate and align hover defaults."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "code" / "th_01_base.js"
PANELS = ROOT / "code" / "th_14_panels.js"
POINTER = ROOT / "code" / "th_17_pointer.js"
POSITION = ROOT / "code" / "th_19_position_state.js"
VERIFY = ROOT / "scripts" / "verify_ball_position_state.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s: expected one match, got %d" % (label, count))
    return text.replace(old, new, 1)


def bump_version(text, old, new, label):
    return replace_once(text, "// @version " + old, "// @version " + new, label)


def patch_default_line(text, key, old_default, new_default):
    original = text
    patterns = [
        (
            r'("' + re.escape(key) + r'"\s*,\s*)' + str(old_default) + r'(\s*,\s*500\s*,\s*10000\s*\))',
            r'\g<1>' + str(new_default) + r'\g<2>'
        ),
        (
            r'(' + re.escape(key) + r'\s*:\s*\{[^}\n]*?default\s*:\s*)' + str(old_default) + r'([^}\n]*\})',
            r'\g<1>' + str(new_default) + r'\g<2>'
        ),
        (
            r'(' + re.escape(key) + r'[^\n]*?defaultValue\s*:\s*)' + str(old_default) + r'([^\n]*)',
            r'\g<1>' + str(new_default) + r'\g<2>'
        ),
        (
            r'(' + re.escape(key) + r'[^\n]*?default\s*:\s*)' + str(old_default) + r'([^\n]*)',
            r'\g<1>' + str(new_default) + r'\g<2>'
        ),
    ]
    for pattern, replacement in patterns:
        text = re.sub(pattern, replacement, text)
    return text, text != original


def assert_default(text, key, expected, label):
    bad = []
    for line in text.splitlines():
        if key in line and ("default" in line or "th17ConfigNumber" in line):
            nums = [int(x) for x in re.findall(r'\b\d+\b', line)]
            if expected not in nums:
                bad.append(line.strip())
    if bad:
        raise SystemExit(label + " unexpected default lines: " + " | ".join(bad))


def patch_base():
    text = BASE.read_text(encoding="utf-8")
    text = bump_version(text, "1.1.1", "1.1.2", "base version")
    text, changed = patch_default_line(text, "POINTER_AREA_HOVER_MS", 1000, 2000)
    if not changed:
        raise SystemExit("base area hover default was not changed")
    assert_default(text, "POINTER_TEXT_HOVER_MS", 800, "base text hover")
    assert_default(text, "POINTER_AREA_HOVER_MS", 2000, "base area hover")
    BASE.write_text(text, encoding="utf-8")


def patch_panels():
    text = PANELS.read_text(encoding="utf-8")
    patched, changed = patch_default_line(text, "POINTER_AREA_HOVER_MS", 1000, 2000)
    if changed:
        patched = bump_version(patched, "1.0.11", "1.0.12", "panels version")
    assert_default(patched, "POINTER_TEXT_HOVER_MS", 800, "panels text hover")
    assert_default(patched, "POINTER_AREA_HOVER_MS", 2000, "panels area hover")
    PANELS.write_text(patched, encoding="utf-8")


def patch_pointer():
    text = POINTER.read_text(encoding="utf-8")
    text = bump_version(text, "1.1.28", "1.1.29", "pointer version")
    text, changed = patch_default_line(text, "POINTER_AREA_HOVER_MS", 1000, 2000)
    if not changed:
        raise SystemExit("pointer runtime area hover default was not changed")
    assert_default(text, "POINTER_TEXT_HOVER_MS", 800, "pointer text hover")
    assert_default(text, "POINTER_AREA_HOVER_MS", 2000, "pointer area hover")
    POINTER.write_text(text, encoding="utf-8")


def patch_position():
    text = POSITION.read_text(encoding="utf-8")
    text = bump_version(text, "1.0.6", "1.0.7", "position version")
    start_marker = "      if (candidateAtFinalHotspot) {\n"
    end_marker = "      // 最终热点已经离开旧候选时才执行补扫，避免复制上一个位置的文字。\n"
    start = text.index(start_marker)
    end = text.index(end_marker, start)
    new_block = '''      if (candidateAtFinalHotspot) {
        var candidateHoverReady = false;
        try {
          candidateHoverReady = this.isPointerTextHoverReady ?
            this.isPointerTextHoverReady(st.releaseTs) === true : false;
        } catch (eCandidateReady) { candidateHoverReady = false; }
        try {
          logPosition(this, "i",
            "pointer release validate confirmed candidate hoverReady=" +
            String(candidateHoverReady) +
            " areaArmed=" + String(st.areaArmReady === true)
          );
        } catch (eCandidateLog) {}
        try {
          // 统一进入核心提取函数，由 POINTER_TEXT_HOVER_MS 决定是否允许取字。
          return this.extractCurrentPointerText(true, st.releaseTs).ok === true;
        } catch (eExtractCandidate) {
          logPosition(this, "e", "confirmed pointer candidate extract fail: " + String(eExtractCandidate));
          return false;
        }
      }

'''
    old_block = text[start:end]
    if 'source: "confirmed_final_candidate"' not in old_block:
        raise SystemExit("confirmed candidate direct-copy block not found")
    text = text[:start] + new_block + text[end:]
    POSITION.write_text(text, encoding="utf-8")


def patch_verify():
    text = VERIFY.read_text(encoding="utf-8")
    text = text.replace('"// @version 1.0.6"', '"// @version 1.0.7"')
    text = text.replace('"// @version 1.1.28"', '"// @version 1.1.29"')
    start_marker = '    candidate_at = finalizer.index("pointerCandidateMatchesFinalHotspot")\n'
    end_marker = '    if "TEXT_FINAL_SCAN_FAILED" not in finalizer:\n'
    start = text.index(start_marker)
    end = text.index(end_marker, start)
    new_checks = '''    candidate_at = finalizer.index("pointerCandidateMatchesFinalHotspot")
    candidate_extract_at = finalizer.index("extractCurrentPointerText(true, st.releaseTs)", candidate_at)
    scan_at = finalizer.index('schedulePointerInspectAsync(true, "release_final", true)', candidate_extract_at)
    if not (candidate_at < candidate_extract_at < scan_at):
        fail("confirmed final candidate must pass the hover-gated extraction before fallback final scan")
    candidate_section = finalizer[candidate_at:scan_at]
    if "completePointerTextCopy(" in candidate_section:
        fail("confirmed final candidate bypasses the hover-gated extraction")
    if "isPointerTextHoverReady" not in candidate_section:
        fail("confirmed final candidate does not record hover readiness")
'''
    text = text[:start] + new_checks + text[end:]
    VERIFY.write_text(text, encoding="utf-8")


def final_scan():
    files = [BASE, PANELS, POINTER]
    leftovers = []
    for path in files:
        for no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if "POINTER_AREA_HOVER_MS" in line and "1000" in line:
                leftovers.append("%s:%d:%s" % (path.relative_to(ROOT), no, line.strip()))
    if leftovers:
        raise SystemExit("old 1000ms area-hover defaults remain: " + " | ".join(leftovers))

    position = POSITION.read_text(encoding="utf-8")
    candidate = position[position.index("pointerCandidateMatchesFinalHotspot"):position.index("schedulePointerInspectAsync(true, \"release_final\", true)")]
    if "completePointerTextCopy(" in candidate:
        raise SystemExit("confirmed candidate still bypasses hover gate")
    if "extractCurrentPointerText(true, st.releaseTs)" not in candidate:
        raise SystemExit("confirmed candidate hover-gated extraction missing")


def main():
    patch_base()
    patch_panels()
    patch_pointer()
    patch_position()
    patch_verify()
    final_scan()
    print("pointer hover gate patch applied")


if __name__ == "__main__":
    main()
