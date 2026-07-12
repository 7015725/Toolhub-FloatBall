#!/usr/bin/env python3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TH17 = ROOT / "code" / "th_17_pointer.js"
TH19 = ROOT / "code" / "th_19_position_state.js"
TH14 = ROOT / "code" / "th_14_panels.js"
VERIFY = ROOT / "scripts" / "verify_pointer_text_release.py"
SELF = ROOT / ".github" / "scripts" / "apply_pointer_text_hover_credential.py"
WORKFLOW = ROOT / ".github" / "workflows" / "apply-pointer-text-hover-credential.yml"


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
p19 = TH19.read_text(encoding="utf-8")
p14 = TH14.read_text(encoding="utf-8")

p17 = replace_once(p17, "// @version 1.1.33", "// @version 1.1.34", "th17 version")
p19 = replace_once(p19, "// @version 1.0.9", "// @version 1.0.10", "th19 version")
p14 = replace_once(p14, "// @version 1.0.12", "// @version 1.0.13", "th14 version")

credential_block = r'''FloatBallAppWM.prototype.invalidatePointerTextHoverCredential = function(st, reason, keepRecentReady) {
  var pointerState = st || null;
  try {
    if (!pointerState) pointerState = this.ensurePointerToolState();
  } catch (eState) { pointerState = null; }
  if (!pointerState) return false;

  var hadCredential = !!(
    pointerState.textHoverReadyKey ||
    pointerState.textHoverReadyRect ||
    Number(pointerState.textHoverReadyAt || 0) > 0
  );

  pointerState.textHoverReadyKey = "";
  pointerState.textHoverReadyRect = null;
  pointerState.textHoverReadyAt = 0;
  pointerState.textHoverReadySince = 0;
  pointerState.textHoverReadySession = 0;
  pointerState.textHoverReadyToken = Number(pointerState.textHoverReadyToken || 0) + 1;

  try {
    if (pointerState.handler && pointerState.textReadyRunnable) {
      pointerState.handler.removeCallbacks(pointerState.textReadyRunnable);
    }
  } catch (eRemoveReady) {}
  pointerState.textReadyRunnable = null;
  pointerState.textReadyToken = Number(pointerState.textReadyToken || 0) + 1;

  if (keepRecentReady !== true) {
    pointerState.lastValidPickReadyAt = 0;
    pointerState.lastValidPickHoverSince = 0;
    pointerState.lastValidPickReadySession = 0;
  }

  if (hadCredential && reason) {
    try { safeLog(this.L, 'd', "invalidate pointer text hover credential reason=" + String(reason)); } catch (eLog) {}
  }
  return hadCredential;
};

FloatBallAppWM.prototype.pointerTextHotspotInsideRect = function(rect) {
  if (!rect) return false;
  var hp = null;
  try { hp = this.getPointerHotspot(); } catch (eHotspot) { hp = null; }
  if (!hp) return false;
  try {
    if (this.pointerRectInside) return this.pointerRectInside(hp.x, hp.y, rect) === true;
  } catch (eInside) {}
  return hp.x >= Number(rect.left) && hp.x <= Number(rect.right) &&
    hp.y >= Number(rect.top) && hp.y <= Number(rect.bottom);
};

FloatBallAppWM.prototype.getPointerTextStableSinceForRect = function(st, rect, atTs) {
  var pointerState = st || null;
  if (!pointerState || !rect) return 0;

  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();

  var since = Number(pointerState.textStableSince || 0);
  var anchorX = Number(pointerState.textStableAnchorX || -100000);
  var anchorY = Number(pointerState.textStableAnchorY || -100000);
  if (isNaN(since) || since <= 0 || since > ts) return 0;
  if (isNaN(anchorX) || isNaN(anchorY) || anchorX < -90000 || anchorY < -90000) return 0;

  var anchorInside = false;
  try {
    if (this.pointerRectInside) anchorInside = this.pointerRectInside(anchorX, anchorY, rect) === true;
    else {
      anchorInside = anchorX >= Number(rect.left) && anchorX <= Number(rect.right) &&
        anchorY >= Number(rect.top) && anchorY <= Number(rect.bottom);
    }
  } catch (eAnchor) { anchorInside = false; }
  if (!anchorInside || !this.pointerTextHotspotInsideRect(rect)) return 0;
  return since;
};

FloatBallAppWM.prototype.resetPointerTextStableHover = function(st, atTs, hotspot, reason) {
  var pointerState = st || null;
  try {
    if (!pointerState) pointerState = this.ensurePointerToolState();
  } catch (eState) { pointerState = null; }
  if (!pointerState) return false;

  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  var hp = hotspot || null;
  try { if (!hp) hp = this.getPointerHotspot(); } catch (eHotspot) { hp = null; }

  this.invalidatePointerTextHoverCredential(pointerState, reason || "stable_reset", false);

  pointerState.textStableAnchorX = hp ? Number(hp.x) : -100000;
  pointerState.textStableAnchorY = hp ? Number(hp.y) : -100000;
  pointerState.textStableLastX = hp ? Number(hp.x) : -100000;
  pointerState.textStableLastY = hp ? Number(hp.y) : -100000;
  pointerState.textStableSince = hp ? ts : 0;

  var insideCurrent = false;
  if (hp && pointerState.currentRect) {
    try {
      if (this.pointerRectInside) insideCurrent = this.pointerRectInside(hp.x, hp.y, pointerState.currentRect) === true;
    } catch (eInside) { insideCurrent = false; }
  }

  pointerState.hoverKey = String(pointerState.currentKey || "");
  pointerState.hoverSince = insideCurrent ? ts : 0;
  pointerState.hoverX = hp ? Number(hp.x) : 0;
  pointerState.hoverY = hp ? Number(hp.y) : 0;
  this.updatePointerVisualHot(false);
  try {
    if (pointerState.currentRect) this.showPointerAreaFrame(pointerState.currentRect, "text_hover");
  } catch (eFrame) {}
  return true;
};

FloatBallAppWM.prototype.updatePointerTextStableMotion = function(atTs) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick" || !st.dragging) return false;

  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  var hp = null;
  try { hp = this.getPointerHotspot(); } catch (eHotspot) { hp = null; }
  if (!hp) return false;

  var currentCredentialStillInside = false;
  if (
    st.textHoverReadyKey &&
    st.textHoverReadyRect &&
    String(st.textHoverReadyKey) === String(st.currentKey || "") &&
    Number(st.textHoverReadySession || 0) === Number(st.inspectSession || 0)
  ) {
    try {
      currentCredentialStillInside =
        this.pointerTextHotspotInsideRect(st.currentRect) &&
        this.pointerTextHotspotInsideRect(st.textHoverReadyRect);
    } catch (eReadyInside) { currentCredentialStillInside = false; }
  }

  if (currentCredentialStillInside) {
    st.textStableLastX = hp.x;
    st.textStableLastY = hp.y;
    return true;
  }

  var anchorX = Number(st.textStableAnchorX || -100000);
  var anchorY = Number(st.textStableAnchorY || -100000);
  if (anchorX < -90000 || anchorY < -90000 || Number(st.textStableSince || 0) <= 0) {
    return this.resetPointerTextStableHover(st, ts, hp, "stable_start");
  }

  var dx = hp.x - anchorX;
  var dy = hp.y - anchorY;
  var dist = Math.sqrt(dx * dx + dy * dy);
  var breakSlop = Math.max(1, Number(st.textHoverBreakSlop || this.dp(14)));

  if (dist > breakSlop) {
    return this.resetPointerTextStableHover(st, ts, hp, "stable_move");
  }

  st.textStableLastX = hp.x;
  st.textStableLastY = hp.y;

  if (st.currentText && st.currentRect) {
    var inside = this.pointerTextHotspotInsideRect(st.currentRect);
    if (!inside) {
      this.invalidatePointerTextHoverCredential(st, "leave_text_frame", false);
      st.hoverKey = String(st.currentKey || "");
      st.hoverSince = 0;
      st.hoverX = hp.x;
      st.hoverY = hp.y;
      this.updatePointerVisualHot(false);
      try { this.showPointerAreaFrame(st.currentRect, "text_hover"); } catch (eFrameOut) {}
      return true;
    }

    if (String(st.hoverKey || "") !== String(st.currentKey || "")) {
      this.invalidatePointerTextHoverCredential(st, "candidate_key_changed", false);
      st.hoverKey = String(st.currentKey || "");
      st.hoverSince = 0;
    }

    if (!st.hoverSince || Number(st.hoverSince || 0) <= 0) {
      var stableSince = this.getPointerTextStableSinceForRect(st, st.currentRect, ts);
      st.hoverSince = stableSince > 0 ? stableSince : ts;
      st.hoverX = hp.x;
      st.hoverY = hp.y;
      try { this.schedulePointerTextReadyVisualRefresh(); } catch (eSchedule) {}
    }
  }

  return true;
};

FloatBallAppWM.prototype.bindPointerTextHoverCandidate = function(st, key, rect, atTs) {
  var pointerState = st || null;
  if (!pointerState || !key || !rect) return false;

  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  var targetKey = String(key || "");
  var targetChanged = String(pointerState.hoverKey || "") !== targetKey;
  var rectChanged = false;

  try {
    rectChanged =
      pointerState.textHoverReadyRect &&
      th17RectKey(pointerState.textHoverReadyRect) !== th17RectKey(rect);
  } catch (eRectChanged) { rectChanged = true; }

  if (
    targetChanged ||
    rectChanged ||
    (pointerState.textHoverReadyKey && String(pointerState.textHoverReadyKey) !== targetKey)
  ) {
    this.invalidatePointerTextHoverCredential(pointerState, "candidate_changed", false);
  }

  pointerState.hoverKey = targetKey;
  var hp = null;
  try { hp = this.getPointerHotspot(); } catch (eHotspot) { hp = null; }
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
    targetChanged ||
    isNaN(currentSince) ||
    currentSince <= 0 ||
    currentSince > ts
  ) {
    pointerState.hoverSince = stableSince > 0 ? stableSince : ts;
  } else if (stableSince > 0 && stableSince < currentSince) {
    // 无障碍结果可能晚于真实稳定停留返回，允许在同一边框内回溯物理稳定起点。
    pointerState.hoverSince = stableSince;
  }
  return true;
};

FloatBallAppWM.prototype.grantPointerTextHoverCredential = function(st, atTs) {
  var pointerState = st || null;
  try {
    if (!pointerState) pointerState = this.ensurePointerToolState();
  } catch (eState) { pointerState = null; }
  if (!pointerState || !pointerState.currentText || !pointerState.currentRect) return false;

  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  var key = String(pointerState.currentKey || this.pointerTextKeyOf({
    text: pointerState.currentText,
    rect: pointerState.currentRect
  }));
  if (!key || String(pointerState.hoverKey || "") !== key) return false;
  if (!this.pointerTextHotspotInsideRect(pointerState.currentRect)) return false;

  var since = Number(pointerState.hoverSince || 0);
  if (isNaN(since) || since <= 0 || since > ts) return false;
  if (ts - since < this.getPointerTextHoverLimitMs()) return false;

  var session = Number(pointerState.inspectSession || 0);
  if (
    String(pointerState.textHoverReadyKey || "") === key &&
    pointerState.textHoverReadyRect &&
    th17RectKey(pointerState.textHoverReadyRect) === th17RectKey(pointerState.currentRect) &&
    Number(pointerState.textHoverReadySession || 0) === session &&
    Number(pointerState.textHoverReadyAt || 0) > 0 &&
    this.pointerTextHotspotInsideRect(pointerState.textHoverReadyRect)
  ) {
    return true;
  }

  pointerState.textHoverReadyKey = key;
  pointerState.textHoverReadyRect = th17RectObj(pointerState.currentRect);
  pointerState.textHoverReadyAt = ts;
  pointerState.textHoverReadySince = since;
  pointerState.textHoverReadySession = session;
  pointerState.textHoverReadyToken = Number(pointerState.textHoverReadyToken || 0) + 1;

  try { this.rememberPointerValidPick(pointerState); } catch (eRemember) {}
  pointerState.lastValidPickReadyAt = ts;
  pointerState.lastValidPickHoverSince = since;
  pointerState.lastValidPickReadySession = session;

  try {
    safeLog(this.L, 'i',
      "pointer text hover credential granted elapsed=" + String(Math.max(0, ts - since)) +
      " key=" + key
    );
  } catch (eLog) {}
  return true;
};

FloatBallAppWM.prototype.hasPointerTextHoverCredential = function(st, atTs, allowGrant) {
  var pointerState = st || null;
  try {
    if (!pointerState) pointerState = this.ensurePointerToolState();
  } catch (eState) { pointerState = null; }
  if (!pointerState || !pointerState.currentText || !pointerState.currentRect) return false;

  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  if (allowGrant === true) {
    try { this.grantPointerTextHoverCredential(pointerState, ts); } catch (eGrant) {}
  }

  var key = String(pointerState.currentKey || "");
  if (!key || String(pointerState.textHoverReadyKey || "") !== key) return false;
  if (!pointerState.textHoverReadyRect) return false;
  if (th17RectKey(pointerState.textHoverReadyRect) !== th17RectKey(pointerState.currentRect)) return false;
  if (Number(pointerState.textHoverReadySession || 0) !== Number(pointerState.inspectSession || 0)) return false;

  var readyAt = Number(pointerState.textHoverReadyAt || 0);
  var readySince = Number(pointerState.textHoverReadySince || 0);
  if (isNaN(readyAt) || readyAt <= 0 || readyAt > ts) return false;
  if (isNaN(readySince) || readySince <= 0 || readySince > ts) return false;
  if (ts - readySince < this.getPointerTextHoverLimitMs()) return false;

  // 业务门槛使用严格边框命中，不使用带 padding 的无障碍候选命中范围。
  if (!this.pointerTextHotspotInsideRect(pointerState.currentRect)) return false;
  if (!this.pointerTextHotspotInsideRect(pointerState.textHoverReadyRect)) return false;
  return true;
};

FloatBallAppWM.prototype.rememberPointerValidPick = function(st) {
  var pointerState = st || null;
  try {
    if (!pointerState) pointerState = this.ensurePointerToolState();
  } catch (eState) { pointerState = null; }
  if (!pointerState || !pointerState.currentText || !pointerState.currentRect) return false;

  var key = String(pointerState.currentKey || this.pointerTextKeyOf({
    text: pointerState.currentText,
    rect: pointerState.currentRect
  }));
  if (!key) return false;

  if (String(pointerState.lastValidPickKey || "") !== key) {
    pointerState.lastValidPickReadyAt = 0;
    pointerState.lastValidPickHoverSince = 0;
    pointerState.lastValidPickReadySession = 0;
  }

  var now = th17Now();
  pointerState.lastValidPickText = String(pointerState.currentText);
  pointerState.lastValidPickRect = th17RectObj(pointerState.currentRect);
  pointerState.lastValidPickKey = key;
  pointerState.lastValidPickAt = now;
  pointerState.lastValidPickSession = Number(pointerState.inspectSession || 0);

  if (
    String(pointerState.textHoverReadyKey || "") === key &&
    pointerState.textHoverReadyRect &&
    th17RectKey(pointerState.textHoverReadyRect) === th17RectKey(pointerState.currentRect) &&
    Number(pointerState.textHoverReadySession || 0) === Number(pointerState.inspectSession || 0) &&
    Number(pointerState.textHoverReadyAt || 0) > 0
  ) {
    pointerState.lastValidPickReadyAt = Number(pointerState.textHoverReadyAt || 0);
    pointerState.lastValidPickHoverSince = Number(pointerState.textHoverReadySince || 0);
    pointerState.lastValidPickReadySession = Number(pointerState.textHoverReadySession || 0);
  }
  return true;
};

FloatBallAppWM.prototype.getRecentPointerPickForRelease = function(st, atTs) {
  var pointerState = st || null;
  try {
    if (!pointerState) pointerState = this.ensurePointerToolState();
  } catch (eState) { pointerState = null; }
  if (!pointerState || !pointerState.lastValidPickText || !pointerState.lastValidPickRect) return null;
  if (Number(pointerState.lastValidPickSession || 0) !== Number(pointerState.inspectSession || 0)) return null;
  if (Number(pointerState.lastValidPickReadySession || 0) !== Number(pointerState.inspectSession || 0)) return null;

  var now = Number(atTs || th17Now());
  if (isNaN(now) || now <= 0) now = th17Now();
  var hitAt = Number(pointerState.lastValidPickAt || 0);
  var readyAt = Number(pointerState.lastValidPickReadyAt || 0);
  var hoverSince = Number(pointerState.lastValidPickHoverSince || 0);
  if (isNaN(hitAt) || hitAt <= 0) return null;
  if (isNaN(readyAt) || readyAt <= 0 || readyAt > now) return null;
  if (isNaN(hoverSince) || hoverSince <= 0 || hoverSince > now) return null;
  if (now - hoverSince < this.getPointerTextHoverLimitMs()) return null;

  var age = now - hitAt;
  var maxAge = 500;
  if (age < 0 || age > maxAge) return null;

  var hp = null;
  try { hp = this.getPointerHotspot(); } catch (eHotspot) { hp = null; }
  if (!hp) return null;
  var hit = false;
  try {
    if (this.pointerRectInside) {
      hit = this.pointerRectInside(hp.x, hp.y, pointerState.lastValidPickRect) === true;
    } else {
      hit = hp.x >= Number(pointerState.lastValidPickRect.left) &&
        hp.x <= Number(pointerState.lastValidPickRect.right) &&
        hp.y >= Number(pointerState.lastValidPickRect.top) &&
        hp.y <= Number(pointerState.lastValidPickRect.bottom);
    }
  } catch (eHit) { hit = false; }
  if (!hit) return null;

  return {
    text: String(pointerState.lastValidPickText),
    rect: th17RectObj(pointerState.lastValidPickRect),
    key: String(pointerState.lastValidPickKey || ""),
    hitAt: hitAt,
    readyAt: readyAt,
    hoverSince: hoverSince,
    ageMs: age,
    session: Number(pointerState.lastValidPickSession || 0)
  };
};

FloatBallAppWM.prototype.restoreRecentPointerPickForRelease = function(st, recent) {
  var pointerState = st || null;
  var item = recent || null;
  if (!pointerState || !item || !item.text || !item.rect) return false;

  pointerState.currentText = String(item.text);
  pointerState.currentRect = th17RectObj(item.rect);
  pointerState.currentKey = String(item.key || "");
  pointerState.hoverKey = pointerState.currentKey;
  pointerState.hoverSince = Number(item.hoverSince || 0);
  pointerState.textHoverReadyKey = pointerState.currentKey;
  pointerState.textHoverReadyRect = th17RectObj(item.rect);
  pointerState.textHoverReadyAt = Number(item.readyAt || 0);
  pointerState.textHoverReadySince = Number(item.hoverSince || 0);
  pointerState.textHoverReadySession = Number(item.session || pointerState.inspectSession || 0);
  pointerState.textHoverReadyToken = Number(pointerState.textHoverReadyToken || 0) + 1;

  if (!this.hasPointerTextHoverCredential(pointerState, Number(pointerState.releaseTs || th17Now()), false)) {
    this.invalidatePointerTextHoverCredential(pointerState, "recent_candidate_invalid", false);
    return false;
  }

  try { this.showPointerAreaFrame(pointerState.currentRect, "text_hit"); } catch (eFrame) {}
  try { this.updatePointerVisualHot(true); } catch (eHot) {}
  return true;
};

FloatBallAppWM.prototype.completePointerCandidateOnRelease'''

p17 = replace_regex_once(
    p17,
    r'FloatBallAppWM\.prototype\.rememberPointerValidPick = function\(st\) \{.*?\n\};\n\nFloatBallAppWM\.prototype\.completePointerCandidateOnRelease',
    credential_block,
    "credential helper block"
)

p17 = replace_once(
    p17,
    '  if (!pointerState || !pointerState.currentText || !pointerState.currentRect) return false;\n  var data = { source: String(source || "accessibility_release") };',
    '''  if (!pointerState || !pointerState.currentText || !pointerState.currentRect) return false;
  var commitTs = Number(pointerState.releaseTs || th17Now());
  if (isNaN(commitTs) || commitTs <= 0) commitTs = th17Now();
  if (!this.hasPointerTextHoverCredential(pointerState, commitTs, false)) {
    try { safeLog(this.L, 'w', "blocked pointer text release without valid hover credential"); } catch (eCredentialLog) {}
    return false;
  }
  var data = { source: String(source || "accessibility_release") };''',
    "release completion credential gate"
)

p17 = replace_once(
    p17,
    '''      lastValidPickAt: 0,
      lastValidPickSession: 0,
      boundText: "",''',
    '''      lastValidPickAt: 0,
      lastValidPickReadyAt: 0,
      lastValidPickHoverSince: 0,
      lastValidPickReadySession: 0,
      lastValidPickSession: 0,
      boundText: "",''',
    "state recent ready fields"
)

p17 = replace_once(
    p17,
    '''      hoverX: 0,
      hoverY: 0,
      hoverMinMs: 800,
      releaseTs: 0,''',
    '''      hoverX: 0,
      hoverY: 0,
      hoverMinMs: 800,
      textStableAnchorX: -100000,
      textStableAnchorY: -100000,
      textStableLastX: -100000,
      textStableLastY: -100000,
      textStableSince: 0,
      textHoverBreakSlop: 0,
      textHoverReadyKey: "",
      textHoverReadyRect: null,
      textHoverReadyAt: 0,
      textHoverReadySince: 0,
      textHoverReadySession: 0,
      textHoverReadyToken: 0,
      textReadyToken: 0,
      textReadyRunnable: null,
      releaseTs: 0,''',
    "state target hover fields"
)

p17 = replace_once(
    p17,
    '''  st.areaHoldStableSlop = dp.call(this, 5);
  st.areaHoldBreakSlop = dp.call(this, 14);
  st.areaCaptureInset = dp.call(this, 3);''',
    '''  st.areaHoldStableSlop = dp.call(this, 5);
  st.areaHoldBreakSlop = dp.call(this, 14);
  st.textHoverBreakSlop = dp.call(this, 14);
  st.areaCaptureInset = dp.call(this, 3);''',
    "text hover slop"
)

p17 = replace_once(
    p17,
    '''  st.lastValidPickKey = "";
  st.lastValidPickAt = 0;
  st.lastValidPickSession = Number(st.inspectSession || 0);''',
    '''  st.lastValidPickKey = "";
  st.lastValidPickAt = 0;
  st.lastValidPickReadyAt = 0;
  st.lastValidPickHoverSince = 0;
  st.lastValidPickReadySession = 0;
  st.lastValidPickSession = Number(st.inspectSession || 0);''',
    "reset recent ready fields"
)

p17 = replace_once(
    p17,
    '''  st.hoverX = 0;
  st.hoverY = 0;
  st.releaseTs = 0;''',
    '''  st.hoverX = 0;
  st.hoverY = 0;
  try { if (st.handler && st.textReadyRunnable) st.handler.removeCallbacks(st.textReadyRunnable); } catch (eRemoveTextReadyReset) {}
  st.textReadyRunnable = null;
  st.textReadyToken = Number(st.textReadyToken || 0) + 1;
  st.textStableAnchorX = -100000;
  st.textStableAnchorY = -100000;
  st.textStableLastX = -100000;
  st.textStableLastY = -100000;
  st.textStableSince = 0;
  st.textHoverReadyKey = "";
  st.textHoverReadyRect = null;
  st.textHoverReadyAt = 0;
  st.textHoverReadySince = 0;
  st.textHoverReadySession = 0;
  st.textHoverReadyToken = Number(st.textHoverReadyToken || 0) + 1;
  st.releaseTs = 0;''',
    "reset target hover fields"
)

p17 = replace_once(
    p17,
    '''  st.areaHoldToken++;
  try { if (st.handler && st.areaHoldRunnable) st.handler.removeCallbacks(st.areaHoldRunnable); } catch (eRemoveAreaHoldEnter) {}''',
    '''  st.areaHoldToken++;
  st.textReadyToken = Number(st.textReadyToken || 0) + 1;
  st.textHoverReadyToken = Number(st.textHoverReadyToken || 0) + 1;
  try { if (st.handler && st.areaHoldRunnable) st.handler.removeCallbacks(st.areaHoldRunnable); } catch (eRemoveAreaHoldEnter) {}''',
    "callback token invalidation"
)

p17 = replace_once(
    p17,
    '''      if (st.mode === "area_capture") self.updatePointerAreaSelection();
      else {
        self.updatePointerAreaHoldCandidate();
        self.scheduleDraggingInspect();
      }''',
    '''      if (st.mode === "area_capture") self.updatePointerAreaSelection();
      else {
        try { self.updatePointerTextStableMotion(th17Now()); } catch (eTextStable) {}
        self.updatePointerAreaHoldCandidate();
        self.scheduleDraggingInspect();
      }''',
    "scheduled pointer movement tracking"
)

success_branch = r'''  if (result && result.text && result.rect) {
    var key = this.pointerTextKeyOf(result);
    st.currentText = String(result.text);
    st.currentRect = th17RectObj(result.rect);
    st.currentKey = key;
    st.boundText = st.currentText;
    st.boundRect = th17RectObj(result.rect);
    st.boundKey = key;
    st.boundAt = now;

    var hoverAt = now;
    if (finishAfterRelease && Number(st.releaseTs || 0) > 0) hoverAt = Number(st.releaseTs);
    try { this.bindPointerTextHoverCandidate(st, key, st.currentRect, hoverAt); } catch (eBindHover) {}
    try { this.rememberPointerValidPick(st); } catch (eRemember) {}
    this.refreshPointerTextReadyVisualState(hoverAt);
    this.schedulePointerTextReadyVisualRefresh();
  } else {'''

p17 = replace_regex_once(
    p17,
    r'  if \(result && result\.text && result\.rect\) \{.*?\n  \} else \{',
    success_branch,
    "inspect success branch"
)

p17 = replace_once(
    p17,
    '''        st.currentText = String(st.boundText);
        st.currentRect = th17RectObj(st.boundRect);
        st.currentKey = st.boundKey || this.pointerTextKeyOf({ text: st.currentText, rect: st.currentRect });
        st.hoverKey = st.currentKey;
        if (!st.hoverSince || Number(st.hoverSince || 0) <= 0) st.hoverSince = Number(st.boundAt || now);
        st.hoverX = pack.x;
        st.hoverY = pack.y;
        recoveredByLastCandidate = true;
        this.refreshPointerTextReadyVisualState();
        this.schedulePointerTextReadyVisualRefresh();''',
    '''        st.currentText = String(st.boundText);
        st.currentRect = th17RectObj(st.boundRect);
        st.currentKey = st.boundKey || this.pointerTextKeyOf({ text: st.currentText, rect: st.currentRect });
        var recoveredHoverAt = finishAfterRelease && Number(st.releaseTs || 0) > 0 ?
          Number(st.releaseTs) : now;
        try {
          this.bindPointerTextHoverCandidate(
            st,
            st.currentKey,
            st.currentRect,
            recoveredHoverAt
          );
        } catch (eBindRecovered) {}
        recoveredByLastCandidate = true;
        this.refreshPointerTextReadyVisualState(recoveredHoverAt);
        this.schedulePointerTextReadyVisualRefresh();''',
    "timeout candidate recovery hover binding"
)

p17 = replace_once(
    p17,
    '''      try {
        st.textReadyToken = Number(st.textReadyToken || 0) + 1;
        if (st.handler && st.textReadyRunnable) st.handler.removeCallbacks(st.textReadyRunnable);
      } catch(eClearReadyTimer) {}
      st.currentText = "";
      st.currentRect = null;
      st.currentKey = "";
      st.hoverKey = "";
      st.hoverSince = 0;''',
    '''      try { this.invalidatePointerTextHoverCredential(st, "inspect_empty", true); } catch (eClearReadyTimer) {}
      st.currentText = "";
      st.currentRect = null;
      st.currentKey = "";
      st.hoverKey = "";
      st.hoverSince = 0;''',
    "inspect empty credential handling"
)

hover_section = r'''FloatBallAppWM.prototype.getPointerTextHoverLimitMs = function() {
  var st = this.ensurePointerToolState();
  var limit = 800;
  try { limit = Number(st.hoverMinMs || 800); } catch (e0) { limit = 800; }
  if (isNaN(limit) || limit < 0) limit = 800;
  return limit;
};

FloatBallAppWM.prototype.isPointerTextHoverReady = function(atTs) {
  var st = this.ensurePointerToolState();
  return this.hasPointerTextHoverCredential(st, atTs, true) === true;
};

FloatBallAppWM.prototype.getPointerTextHoverRemainMs = function(atTs) {
  var st = this.ensurePointerToolState();
  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  var elapsed = st.hoverSince ? (ts - Number(st.hoverSince || 0)) : 0;
  if (isNaN(elapsed) || elapsed < 0) elapsed = 0;
  var remain = this.getPointerTextHoverLimitMs() - elapsed;
  if (isNaN(remain) || remain < 0) remain = 0;
  return Math.ceil(remain);
};

FloatBallAppWM.prototype.refreshPointerTextReadyVisualState = function(atTs) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick") return false;
  if (!st.currentText || !st.currentRect) {
    this.updatePointerVisualHot(false);
    return false;
  }

  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  var ready = this.hasPointerTextHoverCredential(st, ts, true) === true;
  try { this.showPointerAreaFrame(st.currentRect, ready ? "text_hit" : "text_hover"); } catch(eFrameReady) {}
  this.updatePointerVisualHot(ready);
  try { if (st.root) st.root.invalidate(); } catch(eInvReady) {}
  return ready;
};

FloatBallAppWM.prototype.schedulePointerTextReadyVisualRefresh = function() {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed || st.mode !== "text_pick") return false;
  if (!st.currentText || !st.currentRect || !st.hoverSince) return false;
  if (!this.pointerTextHotspotInsideRect(st.currentRect)) return false;
  if (!st.handler) st.handler = this.state.h || new android.os.Handler(android.os.Looper.getMainLooper());

  try {
    if (st.textReadyRunnable) st.handler.removeCallbacks(st.textReadyRunnable);
  } catch(eRemoveReady) {}

  st.textReadyToken = Number(st.textReadyToken || 0) + 1;
  var token = st.textReadyToken;
  var session = Number(st.inspectSession || 0);
  var key = String(st.currentKey || "");
  var rectKey = th17RectKey(st.currentRect);
  var delay = this.getPointerTextHoverRemainMs(th17Now());
  if (delay <= 0) {
    this.refreshPointerTextReadyVisualState();
    return true;
  }

  var self = this;
  st.textReadyRunnable = new java.lang.Runnable({ run: function() {
    try {
      if (!st.active || st.closed || st.mode !== "text_pick") return;
      if (Number(st.textReadyToken || 0) !== token) return;
      if (Number(st.inspectSession || 0) !== session) return;
      if (String(st.currentKey || "") !== key) return;
      if (!st.currentRect || th17RectKey(st.currentRect) !== rectKey) return;
      self.refreshPointerTextReadyVisualState();
    } catch(eRunReady) {
      safeLog(self.L, 'e', "pointer text ready visual refresh fail: " + String(eRunReady));
    }
  }});

  try {
    st.handler.postDelayed(st.textReadyRunnable, Math.max(20, Number(delay || 0) + 10));
    return true;
  } catch(ePostReady) {
    return false;
  }
};

FloatBallAppWM.prototype.extractCurrentPointerText'''

p17 = replace_regex_once(
    p17,
    r'FloatBallAppWM\.prototype\.getPointerTextHoverLimitMs = function\(\) \{.*?\n\};\n\nFloatBallAppWM\.prototype\.extractCurrentPointerText',
    hover_section,
    "hover readiness section"
)

extract_function = r'''FloatBallAppWM.prototype.extractCurrentPointerText = function(skipInspect, releaseAtTs) {
  var st = this.ensurePointerToolState();
  if (!st.active || st.closed) return { ok: false, err: "指针未启动" };
  if (skipInspect !== true) this.updatePointerInspect(true);

  var releaseTs = Number(releaseAtTs || th17Now());
  if (isNaN(releaseTs) || releaseTs <= 0) releaseTs = th17Now();
  var recent = null;
  if (!st.currentText || !st.currentRect) {
    try { recent = this.getRecentPointerPickForRelease(st, releaseTs); } catch (eRecent) { recent = null; }
    if (recent) {
      try { this.restoreRecentPointerPickForRelease(st, recent); } catch (eRestoreRecent) {}
    }
  }
  if (!st.currentText || !st.currentRect) {
    this.setPointerToolResult({ ok: false, type: "pointer_error", code: "NO_TEXT", message: "未命中文本" });
    this.toast("未命中文本");
    this.closePointerTool("未命中文本", true);
    return { ok: false, err: "未命中文本", code: "NO_TEXT" };
  }

  var insideFrame = false;
  try { insideFrame = this.pointerTextHotspotInsideRect(st.currentRect) === true; } catch (eInside) { insideFrame = false; }
  var credentialReady = false;
  try { credentialReady = this.hasPointerTextHoverCredential(st, releaseTs, true) === true; }
  catch (eCredential) { credentialReady = false; }

  if (!insideFrame || !credentialReady) {
    var hoverSince = Number(st.hoverSince || 0);
    var elapsedMs = hoverSince > 0 ? Math.max(0, releaseTs - hoverSince) : 0;
    var remainMs = Math.max(0, this.getPointerTextHoverLimitMs() - elapsedMs);
    var code = insideFrame ? "TEXT_HOVER_NOT_READY" : "TEXT_POINTER_OUTSIDE_FRAME";
    var message = insideFrame ? "悬停时间不足" : "指针不在文字边框内";
    this.setPointerToolResult({
      ok: false,
      type: "cancel",
      code: code,
      message: message,
      value: "",
      data: {
        elapsedMs: elapsedMs,
        remainMs: remainMs,
        hoverMinMs: this.getPointerTextHoverLimitMs(),
        insideFrame: insideFrame,
        currentKey: String(st.currentKey || "")
      }
    });
    this.toast(message);
    this.closePointerTool(message, true);
    return { ok: false, err: message, code: code };
  }

  var reason = String(st.inspectLastReason || st.inspectLatestReason || "");
  var successCode = "TEXT_PICK_SUCCESS";
  var source = "accessibility_current";
  var extra = {
    releaseTs: releaseTs,
    hoverSince: Number(st.textHoverReadySince || st.hoverSince || 0),
    readyAt: Number(st.textHoverReadyAt || 0),
    insideFrame: true
  };
  if (recent) {
    successCode = "TEXT_PICK_RECENT_CANDIDATE";
    source = "accessibility_recent_candidate";
    extra.ageMs = Number(recent.ageMs || 0);
  } else if (reason.indexOf("release_final") === 0 || reason.indexOf("area_small_text_final") === 0) {
    successCode = "TEXT_PICK_FINAL_SCAN";
    source = "accessibility_final_scan";
    extra.costMs = Number(st.inspectLastCostMs || 0);
    extra.nodes = Number(st.inspectLastNodes || 0);
    extra.windows = Number(st.inspectLastWindows || 0);
  }

  var textValue = String(st.currentText);
  var completed = this.completePointerCandidateOnRelease(st, successCode, source, extra);
  var copied = false;
  try { copied = !!(st.lastResult && st.lastResult.clipboard === true); } catch (eCopied) { copied = false; }
  return { ok: completed === true, pending: false, text: textValue, clipboard: copied };
};'''

p17 = replace_regex_once(
    p17,
    r'FloatBallAppWM\.prototype\.extractCurrentPointerText = function\(skipInspect, releaseAtTs\) \{.*?\n\};\n\nFloatBallAppWM\.prototype\.finishPointerTextPickAfterRelease',
    extract_function + "\n\nFloatBallAppWM.prototype.finishPointerTextPickAfterRelease",
    "extract current text gate"
)

p17 = replace_once(
    p17,
    '// 有明确文字候选：普通取字松手立即提交；悬停时间只控制就绪颜色。',
    '// 有明确文字候选：在最终热点上统一校验 800ms 可提交凭证和严格边框命中。',
    "release comment"
)

p17 = replace_once(
    p17,
    '''  st.hot = false;
  this.resetPointerAreaHold();''',
    '''  st.hot = false;
  this.resetPointerAreaHold();
  try { this.resetPointerTextStableHover(st, th17Now(), this.getPointerHotspot(), "drag_start"); } catch (eTextStableStart) {}''',
    "drag start stable tracking"
)

p19 = replace_once(
    p19,
    '''      if (typeof this.pointerRectHitScore === "function") {
        return Number(this.pointerRectHitScore(hp.x, hp.y, pointerState.currentRect)) >= 0;
      }
      var rect = pointerState.currentRect;''',
    '''      if (typeof this.pointerRectInside === "function") {
        return this.pointerRectInside(hp.x, hp.y, pointerState.currentRect) === true;
      }
      var rect = pointerState.currentRect;''',
    "strict final hotspot"
)

p19 = replace_once(
    p19,
    '''      st.pointerX = st.pendingPointerX;
      st.pointerY = st.pendingPointerY;

      var now = nowPosition();''',
    '''      st.pointerX = st.pendingPointerX;
      st.pointerY = st.pendingPointerY;

      var now = nowPosition();
      if (st.mode === "text_pick" && typeof this.updatePointerTextStableMotion === "function") {
        try { this.updatePointerTextStableMotion(now); } catch (eTextStable) {
          logPosition(this, "w", "pointer text stable motion fail: " + String(eTextStable));
        }
      }''',
    "raw movement stable tracking"
)

p19 = replace_once(
    p19,
    '''              "accessibility_recent_candidate",
              { ageMs: Number(recent.ageMs || 0) }''',
    '''              "accessibility_recent_candidate",
              {
                ageMs: Number(recent.ageMs || 0),
                releaseTs: Number(st.releaseTs || 0),
                hoverSince: Number(recent.hoverSince || 0),
                readyAt: Number(recent.readyAt || 0),
                insideFrame: true
              }''',
    "recent candidate release metadata"
)

p14 = replace_once(
    p14,
    'desc: "取字就绪提示与框选 OCR 悬停时间；松手取字不受提示时间限制",',
    'desc: "同一文字边框内稳定悬停达到设定时间后，松手才能取字；框选 OCR 使用独立时间",',
    "settings hover description"
)

verify_content = r'''#!/usr/bin/env python3
import hashlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TH17 = ROOT / "code" / "th_17_pointer.js"
TH19 = ROOT / "code" / "th_19_position_state.js"
TH14 = ROOT / "code" / "th_14_panels.js"
ENTRY = ROOT / "ToolHub.js"
ENTRY_SHA = ROOT / "ToolHub.js.sha256"


def fail(msg):
    print("FAIL:", msg)
    sys.exit(1)


def section(text, start, end):
    a = text.find(start)
    b = text.find(end, a + len(start))
    if a < 0 or b < 0:
        fail("section missing: " + start)
    return text[a:b]


p17 = TH17.read_text(encoding="utf-8")
p19 = TH19.read_text(encoding="utf-8")
p14 = TH14.read_text(encoding="utf-8")
entry = ENTRY.read_text(encoding="utf-8")

for marker in (
    "// @version 1.1.34",
    "updatePointerTextStableMotion = function",
    "bindPointerTextHoverCandidate = function",
    "grantPointerTextHoverCredential = function",
    "hasPointerTextHoverCredential = function",
    "textHoverReadyKey",
    "textHoverReadyRect",
    "textHoverReadyAt",
    "lastValidPickReadyAt",
    "var maxAge = 500",
    "TEXT_HOVER_NOT_READY",
    "TEXT_POINTER_OUTSIDE_FRAME",
    "TEXT_PICK_RECENT_CANDIDATE",
    "TEXT_PICK_FINAL_SCAN",
):
    if marker not in p17:
        fail("th17 marker missing: " + marker)

extract = section(
    p17,
    "FloatBallAppWM.prototype.extractCurrentPointerText = function",
    "FloatBallAppWM.prototype.finishPointerTextPickAfterRelease = function",
)
for marker in (
    "pointerTextHotspotInsideRect",
    "hasPointerTextHoverCredential",
    "TEXT_HOVER_NOT_READY",
    "TEXT_POINTER_OUTSIDE_FRAME",
    "completePointerCandidateOnRelease",
):
    if marker not in extract:
        fail("extract gate missing: " + marker)

completion = section(
    p17,
    "FloatBallAppWM.prototype.completePointerCandidateOnRelease = function",
    "FloatBallAppWM.prototype.completePointerTextCopy = function",
)
if "hasPointerTextHoverCredential" not in completion:
    fail("unified release completion can bypass hover credential")

stable = section(
    p17,
    "FloatBallAppWM.prototype.updatePointerTextStableMotion = function",
    "FloatBallAppWM.prototype.bindPointerTextHoverCandidate = function",
)
if "areaHoldSince" in stable or "areaHoldAnchor" in stable:
    fail("text stable hover is coupled to OCR hold state")
if "textHoverReadyRect" not in stable or "leave_text_frame" not in stable:
    fail("text credential does not require staying inside the drawn frame")

ready = section(
    p17,
    "FloatBallAppWM.prototype.isPointerTextHoverReady = function",
    "FloatBallAppWM.prototype.getPointerTextHoverRemainMs = function",
)
if "hasPointerTextHoverCredential" not in ready:
    fail("visual ready state is not backed by the business credential")
if "areaHoldSince" in ready:
    fail("text ready state is coupled to OCR timing")

recent = section(
    p17,
    "FloatBallAppWM.prototype.getRecentPointerPickForRelease = function",
    "FloatBallAppWM.prototype.restoreRecentPointerPickForRelease = function",
)
for marker in ("lastValidPickReadyAt", "lastValidPickHoverSince", "pointerRectInside"):
    if marker not in recent:
        fail("recent candidate readiness guard missing: " + marker)
if "pointerRectHitScore" in recent:
    fail("recent candidate still uses padded hit testing")

clock = section(p19, "function nowPosition()", "function numberOr")
if "SystemClock.uptimeMillis" in clock:
    fail("th19 still uses uptimeMillis for pointer release state")
if "th17Now" not in clock and "System.currentTimeMillis" not in clock:
    fail("th19 wall-clock source missing")

candidate = section(
    p19,
    "proto.pointerCandidateMatchesFinalHotspot = function",
    "proto.cancelPointerSemanticUpdate = function",
)
if "pointerRectInside" not in candidate or "pointerRectHitScore" in candidate:
    fail("final candidate is not strictly inside the drawn text frame")

move = section(
    p19,
    "proto.movePointerFromRaw = function",
    "proto.setupTouchListener = function",
)
if "updatePointerTextStableMotion(now)" not in move:
    fail("raw pointer movement does not update independent stable hover")

finalizer = section(
    p19,
    "proto.finishPointerGestureFromRaw = function",
    "proto.movePointerFromRaw = function",
)
positions = [
    finalizer.find("cancelPointerSemanticUpdate"),
    finalizer.find("invalidatePointerInspectForRelease"),
    finalizer.find("movePointerFromRaw(rawX, rawY, true, true)"),
    finalizer.find("pointerCandidateMatchesFinalHotspot"),
    finalizer.find("getRecentPointerPickForRelease"),
    finalizer.find('schedulePointerInspectAsync(true, "release_final", true)'),
]
if any(pos < 0 for pos in positions) or positions != sorted(positions):
    fail("unsafe release ordering")
if "extractCurrentPointerText(true, st.releaseTs)" not in finalizer:
    fail("confirmed candidate does not use unified credential extraction")
if "completePointerCandidateOnRelease" not in finalizer:
    fail("recent candidate does not use unified release completion")

for forbidden in (
    "getRecentReadyPointerPick",
    "restoreRecentReadyPointerPick",
    "syncPointerTextHoverFromStableHold",
    "storeReadyPointerSnapshot",
    "getReadyPointerSnapshotForRelease",
    "finishReadyPointerSnapshot",
    "__toolHubReadyTextSnapshot",
    "TEXT_PICK_READY_SNAPSHOT",
    "ready_visual_snapshot",
):
    if forbidden in p17 or forbidden in p19:
        fail("obsolete ready snapshot chain remains: " + forbidden)

if "同一文字边框内稳定悬停达到设定时间后，松手才能取字" not in p14:
    fail("pointer setting description does not match hover credential behavior")
if "指针无障碍取字提交链修复" in entry or "installToolHubPointerAccessibilityTextReleaseFix" in entry:
    fail("entry-level runtime pointer patch still remains")

expected = hashlib.sha256(ENTRY.read_bytes()).hexdigest()
sha_line = ENTRY_SHA.read_text(encoding="utf-8").strip()
if expected not in sha_line:
    fail("ToolHub.js.sha256 mismatch")

print("OK pointer_text_hover_credential sha256=" + expected)
'''

VERIFY.write_text(verify_content, encoding="utf-8")
TH17.write_text(p17, encoding="utf-8")
TH19.write_text(p19, encoding="utf-8")
TH14.write_text(p14, encoding="utf-8")

for temp in (SELF, WORKFLOW):
    try:
        temp.unlink()
    except FileNotFoundError:
        pass

print("OK applied independent pointer text hover credential")
