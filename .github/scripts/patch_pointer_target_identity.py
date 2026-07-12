#!/usr/bin/env python3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TH17 = ROOT / "code" / "th_17_pointer.js"
VERIFY_BALL = ROOT / "scripts" / "verify_ball_position_state.py"
VERIFY_TEXT = ROOT / "scripts" / "verify_pointer_text_release.py"
VERIFY_85 = ROOT / "scripts" / "verify_pointer_issue_85.py"
SELF = ROOT / ".github" / "scripts" / "patch_pointer_target_identity.py"
WORKFLOW = ROOT / ".github" / "workflows" / "patch-pointer-target-identity.yml"


def fail(message):
    raise SystemExit("PATCH FAIL: " + message)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail("%s expected once, found %d" % (label, count))
    return text.replace(old, new, 1)


def replace_regex_once(text, pattern, repl, label):
    new_text, count = re.subn(pattern, repl, text, count=1, flags=re.S)
    if count != 1:
        fail("%s expected one regex match, found %d" % (label, count))
    return new_text


p17 = TH17.read_text(encoding="utf-8")
p17 = replace_once(p17, "// @version 1.1.34", "// @version 1.1.35", "th17 version")

p17 = replace_once(
    p17,
    '''      textStableLastY: -100000,
      textStableSince: 0,
      textHoverBreakSlop: 0,''',
    '''      textStableLastY: -100000,
      textStableSince: 0,
      textStableTargetKey: "",
      textHoverBreakSlop: 0,''',
    "stable target state",
)

p17 = replace_once(
    p17,
    '''  pointerState.textStableLastY = hp ? Number(hp.y) : -100000;
  pointerState.textStableSince = hp ? ts : 0;

  var insideCurrent = false;''',
    '''  pointerState.textStableLastY = hp ? Number(hp.y) : -100000;
  pointerState.textStableSince = hp ? ts : 0;
  pointerState.textStableTargetKey = String(pointerState.currentKey || "");

  var insideCurrent = false;''',
    "stable reset target binding",
)

p17 = replace_once(
    p17,
    '''    if (!inside) {
      this.invalidatePointerTextHoverCredential(st, "leave_text_frame", false);
      st.hoverKey = String(st.currentKey || "");
      st.hoverSince = 0;
      st.hoverX = hp.x;
      st.hoverY = hp.y;
      this.updatePointerVisualHot(false);
      try { this.showPointerAreaFrame(st.currentRect, "text_hover"); } catch (eFrameOut) {}
      return true;
    }''',
    '''    if (!inside) {
      // 离开严格文字边框后，旧目标的稳定时间和可提交凭证同时失效。
      return this.resetPointerTextStableHover(st, ts, hp, "leave_text_frame");
    }''',
    "leave frame resets stable timer",
)

bind_function = r'''FloatBallAppWM.prototype.bindPointerTextHoverCandidate = function(st, key, rect, atTs) {
  var pointerState = st || null;
  if (!pointerState || !key || !rect) return false;

  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  var targetKey = String(key || "");
  var previousHoverKey = String(pointerState.hoverKey || "");
  var stableTargetKey = String(pointerState.textStableTargetKey || "");
  var stableTargetChanged = !!stableTargetKey && stableTargetKey !== targetKey;

  var hp = null;
  try { hp = this.getPointerHotspot(); } catch (eHotspot) { hp = null; }

  // 首次异步命中允许复用命中前的物理稳定时间；已经绑定过目标后，
  // 文本或矩形 key 改变必须从新目标出现时重新计时。
  if (stableTargetChanged) {
    this.resetPointerTextStableHover(pointerState, ts, hp, "target_changed");
  } else if (!stableTargetKey) {
    pointerState.textStableTargetKey = targetKey;
  }

  var credentialTargetChanged =
    pointerState.textHoverReadyKey &&
    String(pointerState.textHoverReadyKey) !== targetKey;
  var credentialRectChanged = false;
  try {
    credentialRectChanged =
      pointerState.textHoverReadyRect &&
      th17RectKey(pointerState.textHoverReadyRect) !== th17RectKey(rect);
  } catch (eRectChanged) { credentialRectChanged = true; }

  if (!stableTargetChanged && (credentialTargetChanged || credentialRectChanged)) {
    this.invalidatePointerTextHoverCredential(pointerState, "candidate_changed", false);
  }

  pointerState.textStableTargetKey = targetKey;
  pointerState.hoverKey = targetKey;
  pointerState.hoverX = hp ? hp.x : 0;
  pointerState.hoverY = hp ? hp.y : 0;

  if (!hp || !this.pointerTextHotspotInsideRect(rect)) {
    pointerState.hoverSince = 0;
    this.updatePointerVisualHot(false);
    return false;
  }

  var stableSince = this.getPointerTextStableSinceForRect(pointerState, rect, ts);
  var currentSince = Number(pointerState.hoverSince || 0);
  if (
    stableTargetChanged ||
    isNaN(currentSince) ||
    currentSince <= 0 ||
    currentSince > ts
  ) {
    pointerState.hoverSince = stableSince > 0 ? stableSince : ts;
  } else if (stableSince > 0 && stableSince < currentSince) {
    // 同一目标的无障碍结果可能晚于真实稳定停留返回，允许回溯物理稳定起点。
    pointerState.hoverSince = stableSince;
  }

  // hoverKey 在临时空扫描后可能被清空；同一稳定目标恢复时不应被当作新目标。
  if (!previousHoverKey && stableTargetKey === targetKey && stableSince > 0) {
    pointerState.hoverSince = stableSince;
  }
  return true;
};

FloatBallAppWM.prototype.grantPointerTextHoverCredential'''

p17 = replace_regex_once(
    p17,
    r'FloatBallAppWM\.prototype\.bindPointerTextHoverCandidate = function\(st, key, rect, atTs\) \{.*?\n\};\n\nFloatBallAppWM\.prototype\.grantPointerTextHoverCredential',
    bind_function,
    "target-aware candidate binding",
)

p17 = replace_once(
    p17,
    '''  st.textStableLastY = -100000;
  st.textStableSince = 0;
  st.textHoverReadyKey = "";''',
    '''  st.textStableLastY = -100000;
  st.textStableSince = 0;
  st.textStableTargetKey = "";
  st.textHoverReadyKey = "";''',
    "reset stable target",
)

p17 = replace_once(
    p17,
    '''    st.textStableLastY = -100000;
    st.textStableSince = 0;

    st.currentText = "";''',
    '''    st.textStableLastY = -100000;
    st.textStableSince = 0;
    st.textStableTargetKey = "";

    st.currentText = "";''',
    "screen reflow stable target reset",
)

TH17.write_text(p17, encoding="utf-8")

ball = VERIFY_BALL.read_text(encoding="utf-8")
ball = replace_once(ball, '        "// @version 1.1.34",', '        "// @version 1.1.35",', "ball verifier th17 version")
VERIFY_BALL.write_text(ball, encoding="utf-8")

verify_text = VERIFY_TEXT.read_text(encoding="utf-8")
verify_text = replace_once(verify_text, '    "// @version 1.1.34",', '    "// @version 1.1.35",', "text verifier th17 version")
verify_text = replace_once(
    verify_text,
    '''if "textHoverReadyRect" not in stable or "leave_text_frame" not in stable:
    fail("text credential does not require staying inside the drawn frame")
''',
    '''if "textHoverReadyRect" not in stable or "leave_text_frame" not in stable:
    fail("text credential does not require staying inside the drawn frame")
if 'resetPointerTextStableHover(st, ts, hp, "leave_text_frame")' not in stable:
    fail("leaving the drawn text frame does not reset the stable timer")

binding = section(
    p17,
    "FloatBallAppWM.prototype.bindPointerTextHoverCandidate = function",
    "FloatBallAppWM.prototype.grantPointerTextHoverCredential = function",
)
for marker in (
    "textStableTargetKey",
    "stableTargetChanged",
    'resetPointerTextStableHover(pointerState, ts, hp, "target_changed")',
):
    if marker not in binding:
        fail("target-level hover identity guard missing: " + marker)
''',
    "text verifier target identity assertions",
)
VERIFY_TEXT.write_text(verify_text, encoding="utf-8")

issue85 = VERIFY_85.read_text(encoding="utf-8")
issue85 = replace_once(
    issue85,
    '''        and "st.textStableSince = 0;" in pointer_reflow
        and "this.resetPointerTextStableHover(" in pointer_reflow
''',
    '''        and "st.textStableSince = 0;" in pointer_reflow
        and 'st.textStableTargetKey = "";' in pointer_reflow
        and "this.resetPointerTextStableHover(" in pointer_reflow
''',
    "issue85 target identity reflow assertion",
)
VERIFY_85.write_text(issue85, encoding="utf-8")

for temp in (SELF, WORKFLOW):
    try:
        temp.unlink()
    except FileNotFoundError:
        pass

print("OK patched target-level stable hover identity")
