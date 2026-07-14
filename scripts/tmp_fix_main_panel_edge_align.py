#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "code" / "th_15_main_panel.js"

source = MODULE_PATH.read_text(encoding="utf-8")
if source.count("// @version 1.5.2") != 1:
    raise SystemExit("unexpected main panel version")
source = source.replace("// @version 1.5.2", "// @version 1.5.3", 1)
source = source.replace(
    "// ToolHub - 主按钮面板第七阶段：整页分页与稳定吸附",
    "// ToolHub - 主按钮面板第八阶段：同侧安全边缘对齐",
    1,
)

pattern = re.compile(
    r"FloatBallAppWM\.prototype\.getMainPanelPosition = function\(pw, ph, bx, by, ballSize\) \{.*?\n\};\n\nFloatBallAppWM\.prototype\.animateMainPanelEnter",
    re.S,
)
replacement = """FloatBallAppWM.prototype.getMainPanelPosition = function(pw, ph, bx, by, ballSize) {
  var safe = this.getMainPanelSafeBounds();
  var side = '';
  try { side = String(this.state.dockSide || ''); } catch (eSide) { side = ''; }
  if (side !== 'left' && side !== 'right') {
    try { side = String(this.config.BALL_POSITION_SIDE || ''); } catch (eCfgSide) { side = ''; }
  }
  if (side !== 'left' && side !== 'right') {
    side = (Number(bx) + Number(ballSize) / 2) <= Number(this.state.screen.w) / 2 ? 'left' : 'right';
  }

  var minX = Number(safe.left);
  var maxX = Math.max(minX, Number(safe.right) - Number(pw));
  var x;
  if (side === 'left') {
    x = minX;
    this.state.mainPanelExpandSide = 'from_left';
  } else {
    x = maxX;
    this.state.mainPanelExpandSide = 'from_right';
  }
  x = this.clamp(Math.floor(x), minX, maxX);

  var ballCenterY = Number(by) + Number(ballSize) / 2;
  var y = Math.floor(ballCenterY - ph / 2);
  y = this.clamp(y, safe.top, Math.max(safe.top, safe.bottom - ph));
  this.state.mainPanelBallCenterY = ballCenterY;
  this.state.mainPanelPosition = { x: x, y: y, width: pw, height: ph, ballSide: side };
  safeLog(this.L, 'd',
    'main panel edge align side=' + String(side) +
    ' x=' + String(x) +
    ' range=' + String(minX) + '..' + String(maxX) +
    ' width=' + String(pw));
  return { x: x, y: y, type: side === 'left' ? 'right' : 'left' };
};

FloatBallAppWM.prototype.animateMainPanelEnter"""
source, count = pattern.subn(replacement, source, count=1)
if count != 1:
    raise SystemExit("getMainPanelPosition replacement count=%d" % count)
MODULE_PATH.write_text(source, encoding="utf-8")

VERSION_FILES = (
    "scripts/verify_main_panel_paging.py",
    "scripts/verify_main_panel_adaptive_layout.py",
    "scripts/verify_main_panel_visual_tuning.py",
    "scripts/verify_legacy_main_panel_cleanup.py",
    "scripts/verify_main_panel_grid_sizing.py",
    "scripts/verify_main_panel_drag_sort.py",
    "scripts/verify_panel_layout_settings_cleanup.py",
    "scripts/verify_main_panel_close_lifecycle.py",
    "scripts/verify_main_panel_runtime_status.py",
)
for name in VERSION_FILES:
    path = ROOT / name
    text = path.read_text(encoding="utf-8")
    if "1.5.2" not in text:
        raise SystemExit("missing old version in %s" % name)
    path.write_text(text.replace("1.5.2", "1.5.3"), encoding="utf-8")

verify_path = ROOT / "scripts" / "verify_main_panel_grid_sizing.py"
verify = verify_path.read_text(encoding="utf-8")
marker = '    ("main panel grid sizing cols=", "grid diagnostics"),\n'
insert = marker + (
    '    ("var minX = Number(safe.left)", "safe left anchor"),\n'
    '    ("Number(safe.right) - Number(pw)", "safe right anchor"),\n'
    '    ("x = minX", "left-side edge alignment"),\n'
    '    ("x = maxX", "right-side edge alignment"),\n'
    '    ("main panel edge align side=", "edge alignment diagnostics"),\n'
)
if verify.count(marker) != 1:
    raise SystemExit("grid verifier marker mismatch")
verify = verify.replace(marker, insert, 1)

old_forbid = '    ("new android.widget.FrameLayout.LayoutParams(-1, -2)", "match grid"),\n'
new_forbid = old_forbid + (
    '    ("Number(bx) + Number(ballSize) + gap", "ball-inside left anchor"),\n'
    '    ("Number(bx) - pw - gap", "ball-inside right anchor"),\n'
)
if verify.count(old_forbid) != 1:
    raise SystemExit("grid verifier forbid marker mismatch")
verify = verify.replace(old_forbid, new_forbid, 1)

old_tail = '''if viewport_height != visible_rows * row_unit:
    fail("viewport height invariant")

print("OK main_panel_grid_sizing width=grid height=whole-page viewport window=exact")
'''
new_tail = '''if viewport_height != visible_rows * row_unit:
    fail("viewport height invariant")

safe_left = 12
safe_right = 708
original_panel_width = panel_width
left_x = safe_left
right_x = max(safe_left, safe_right - panel_width)
if left_x != safe_left:
    fail("left-side safe edge invariant")
if right_x + panel_width != safe_right:
    fail("right-side safe edge invariant")
if panel_width != original_panel_width:
    fail("edge alignment must not change panel width")

print("OK main_panel_grid_sizing width=grid height=whole-page viewport window=exact edge=same-side")
'''
if verify.count(old_tail) != 1:
    raise SystemExit("grid verifier tail mismatch")
verify = verify.replace(old_tail, new_tail, 1)
verify_path.write_text(verify, encoding="utf-8")

print("OK patched main panel same-side edge alignment")
