#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TH17 = ROOT / "code" / "th_17_pointer.js"
TH19 = ROOT / "code" / "th_19_position_state.js"
TH14 = ROOT / "code" / "th_14_panels.js"
ENTRY = ROOT / "ToolHub.js"
VERIFY_RELEASE = ROOT / "scripts" / "verify_pointer_text_release.py"
VERIFY_POSITION = ROOT / "scripts" / "verify_ball_position_state.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s: expected one occurrence, got %s" % (label, count))
    return text.replace(old, new, 1)


def replace_section(text, start_marker, end_marker, replacement, label):
    start = text.find(start_marker)
    end = text.find(end_marker, start + len(start_marker))
    if start < 0 or end < 0 or end <= start:
        raise SystemExit("%s: section not found" % label)
    return text[:start] + replacement + text[end:]


# 入口文件恢复为纯模块加载，不再保留运行时覆盖补丁。
entry = ENTRY.read_text(encoding="utf-8")
hotfix_marker = "// =======================【指针无障碍取字提交链修复】======================="
if hotfix_marker in entry:
    start = entry.find("\n\n" + hotfix_marker)
    if start < 0:
        start = entry.find(hotfix_marker)
    end = entry.find("if (__trustedManifest", start)
    if start < 0 or end < 0:
        raise SystemExit("ToolHub pointer hotfix block boundaries missing")
    entry = entry[:start] + "\n" + entry[end:]
ENTRY.write_text(entry, encoding="utf-8")

# 指针核心：普通取字按有效候选提交，悬停时间只保留视觉提示用途。
th17 = TH17.read_text(encoding="utf-8")
th17 = replace_once(th17, "// @version 1.1.30", "// @version 1.1.31", "th17 version")

release_helpers = r'''FloatBallAppWM.prototype.getRecentPointerPickForRelease = function(st, atTs) {
  var pointerState = st || null;
  try {
    if (!pointerState) pointerState = this.ensurePointerToolState();
  } catch (eState) { pointerState = null; }
  if (!pointerState || !pointerState.lastValidPickText || !pointerState.lastValidPickRect) return null;
  if (Number(pointerState.lastValidPickSession || 0) !== Number(pointerState.inspectSession || 0)) return null;

  var now = Number(atTs || th17Now());
  if (isNaN(now) || now <= 0) now = th17Now();
  var hitAt = Number(pointerState.lastValidPickAt || 0);
  if (isNaN(hitAt) || hitAt <= 0) return null;
  var age = now - hitAt;
  var maxAge = 500;
  if (age < 0 || age > maxAge) return null;

  var hp = null;
  try { hp = this.getPointerHotspot(); } catch (eHotspot) { hp = null; }
  if (!hp) return null;
  var hit = false;
  try { hit = this.pointerRectHitScore(hp.x, hp.y, pointerState.lastValidPickRect) >= 0; }
  catch (eHit) { hit = false; }
  if (!hit) return null;

  return {
    text: String(pointerState.lastValidPickText),
    rect: th17RectObj(pointerState.lastValidPickRect),
    key: String(pointerState.lastValidPickKey || ""),
    hitAt: hitAt,
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
  pointerState.hoverSince = Number(item.hitAt || th17Now());
  try { this.showPointerAreaFrame(pointerState.currentRect, "text_hit"); } catch (eFrame) {}
  try { this.updatePointerVisualHot(true); } catch (eHot) {}
  return true;
};

FloatBallAppWM.prototype.completePointerCandidateOnRelease = function(st, successCode, source, extraData) {
  var pointerState = st || null;
  if (!pointerState || !pointerState.currentText || !pointerState.currentRect) return false;
  var data = { source: String(source || "accessibility_release") };
  try {
    if (extraData) {
      for (var k in extraData) data[k] = extraData[k];
    }
  } catch (eData) {}
  try {
    safeLog(this.L, 'i',
      "pointer text release commit source=" + data.source +
      " textLen=" + String(String(pointerState.currentText).length));
  } catch (eLog) {}
  return this.completePointerTextCopy(
    String(pointerState.currentText),
    th17RectObj(pointerState.currentRect),
    String(successCode || "TEXT_PICK_SUCCESS"),
    data
  ) === true;
};

'''
if "getRecentPointerPickForRelease = function" not in th17:
    anchor = "FloatBallAppWM.prototype.completePointerTextCopy = function"
    if th17.count(anchor) != 1:
        raise SystemExit("th17 release helper anchor missing")
    th17 = th17.replace(anchor, release_helpers + anchor, 1)

old_ready = r'''FloatBallAppWM.prototype.isPointerTextHoverReady = function(atTs) {
  var st = this.ensurePointerToolState();
  if (!st.currentText || !st.currentRect) return false;
  if (!st.hoverSince || Number(st.hoverSince || 0) <= 0) return false;
  if (st.currentKey && st.hoverKey && String(st.currentKey) !== String(st.hoverKey)) return false;
  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  try { this.syncPointerTextHoverFromStableHold(ts); } catch (eStableHover) {}
  return ts - Number(st.hoverSince || 0) >= this.getPointerTextHoverLimitMs();
};
'''
new_ready = r'''FloatBallAppWM.prototype.isPointerTextHoverReady = function(atTs) {
  var st = this.ensurePointerToolState();
  if (!st.currentText || !st.currentRect) return false;
  if (!st.hoverSince || Number(st.hoverSince || 0) <= 0) return false;
  if (st.currentKey && st.hoverKey && String(st.currentKey) !== String(st.hoverKey)) return false;
  var ts = Number(atTs || th17Now());
  if (isNaN(ts) || ts <= 0) ts = th17Now();
  var since = Number(st.hoverSince || 0);
  if (isNaN(since) || since <= 0 || since > ts) return false;
  return ts - since >= this.getPointerTextHoverLimitMs();
};
'''
th17 = replace_once(th17, old_ready, new_ready, "th17 visual hover readiness")

new_extract = r'''FloatBallAppWM.prototype.extractCurrentPointerText = function(skipInspect, releaseAtTs) {
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

  var reason = String(st.inspectLastReason || st.inspectLatestReason || "");
  var successCode = "TEXT_PICK_SUCCESS";
  var source = "accessibility_current";
  var extra = { releaseTs: releaseTs };
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
};

'''
th17 = replace_section(
    th17,
    "FloatBallAppWM.prototype.extractCurrentPointerText = function",
    "FloatBallAppWM.prototype.finishPointerTextPickAfterRelease = function",
    new_extract,
    "th17 extractCurrentPointerText",
)
th17 = replace_once(
    th17,
    "    try { this.restoreRecentReadyPointerPick(st, releaseTs); } catch (eRestoreRelease) {}",
    "    try {\n      var recentRelease = this.getRecentPointerPickForRelease(st, releaseTs);\n      if (recentRelease) this.restoreRecentPointerPickForRelease(st, recentRelease);\n    } catch (eRestoreRelease) {}",
    "th17 final release recent candidate",
)
th17 = th17.replace(
    "// 有明确文字候选：立即判断悬停时间并取字 / 取消。",
    "// 有明确文字候选：普通取字松手立即提交；悬停时间只控制就绪颜色。",
    1,
)
TH17.write_text(th17, encoding="utf-8")

# 固定位置状态机：统一墙上时钟，并按最终热点提交当前/近期候选。
th19 = TH19.read_text(encoding="utf-8")
th19 = replace_once(th19, "// @version 1.0.7", "// @version 1.0.8", "th19 version")
th19 = replace_once(
    th19,
    "  function nowPosition() {\n"
    "    try { return Number(android.os.SystemClock.uptimeMillis()); } catch (e0) {}\n"
    "    try { return Number(java.lang.System.currentTimeMillis()); } catch (e1) {}\n"
    "    return new Date().getTime();\n"
    "  }",
    "  function nowPosition() {\n"
    "    try { if (typeof th17Now === \"function\") return Number(th17Now()); } catch (e0) {}\n"
    "    try { return Number(java.lang.System.currentTimeMillis()); } catch (e1) {}\n"
    "    return new Date().getTime();\n"
    "  }",
    "th19 time source",
)

new_finalizer = r'''  proto.finishPointerGestureFromRaw = function(rawX, rawY, action) {
    var st = null;
    try { st = this.ensurePointerToolState ? this.ensurePointerToolState() : null; } catch (eState) { st = null; }
    if (!st || !st.active || st.closed) return false;

    this.cancelPointerSemanticUpdate(st, "pointer_release");
    this.invalidatePointerInspectForRelease(st);
    st.releaseTs = nowPosition();

    if (action === android.view.MotionEvent.ACTION_CANCEL) {
      st.dragging = false;
      try { this.setPointerToolResult({ ok: false, type: "cancel", code: "ACTION_CANCEL", message: "指针取消" }); } catch (eResult) {}
      try { this.toast("指针已取消"); } catch (eToast) {}
      try { this.closePointerTool("ACTION_CANCEL", true); } catch (eClose) {}
      return true;
    }

    // 先落到 ACTION_UP 的最终原始坐标，再验证候选，避免提交上一帧位置的文字。
    if (!this.movePointerFromRaw(rawX, rawY, true, true)) return false;

    if (st.mode === "area_capture") {
      try { this.updatePointerAreaSelection(); } catch (eAreaUpdate) {}
      st.dragging = false;
      try { this.finishPointerAreaCapture(); } catch (eAreaFinish) {
        logPosition(this, "e", "final area capture fail: " + String(eAreaFinish));
        return false;
      }
      return true;
    }

    if (st.mode === "text_pick") {
      st.dragging = false;

      var candidateAtFinalHotspot = false;
      try { candidateAtFinalHotspot = this.pointerCandidateMatchesFinalHotspot(st) === true; }
      catch (eCandidate) { candidateAtFinalHotspot = false; }
      if (candidateAtFinalHotspot) {
        var candidateHoverReady = false;
        try {
          candidateHoverReady = this.isPointerTextHoverReady ?
            this.isPointerTextHoverReady(st.releaseTs) === true : false;
        } catch (eCandidateReady) { candidateHoverReady = false; }
        try {
          logPosition(this, "i",
            "pointer release commit confirmed candidate hoverReady=" +
            String(candidateHoverReady) +
            " areaArmed=" + String(st.areaArmReady === true)
          );
        } catch (eCandidateLog) {}
        try {
          return this.extractCurrentPointerText(true, st.releaseTs).ok === true;
        } catch (eExtractCandidate) {
          logPosition(this, "e", "confirmed pointer candidate extract fail: " + String(eExtractCandidate));
          return false;
        }
      }

      var recent = null;
      try {
        if (this.getRecentPointerPickForRelease) recent = this.getRecentPointerPickForRelease(st, st.releaseTs);
      } catch (eRecent) { recent = null; }
      if (recent) {
        try {
          if (this.restoreRecentPointerPickForRelease(st, recent)) {
            logPosition(this, "i", "pointer release commit recent candidate age=" + String(recent.ageMs || 0));
            return this.completePointerCandidateOnRelease(
              st,
              "TEXT_PICK_RECENT_CANDIDATE",
              "accessibility_recent_candidate",
              { ageMs: Number(recent.ageMs || 0) }
            ) === true;
          }
        } catch (eRecentCommit) {
          logPosition(this, "e", "recent pointer candidate commit fail: " + String(eRecentCommit));
        }
      }

      // 最终热点确实没有可复用候选时才补扫，防止一次空扫描推翻已命中的文字。
      try {
        st.inspectMaxFinalMs = Math.max(Number(st.inspectMaxFinalMs || 180), 240);
        st.inspectMaxFinalNodes = Math.max(Number(st.inspectMaxFinalNodes || 720), 1200);
      } catch (eBudget) {
        st.inspectMaxFinalMs = 240;
        st.inspectMaxFinalNodes = 1200;
      }
      var scheduled = false;
      try { scheduled = this.schedulePointerInspectAsync(true, "release_final", true) === true; }
      catch (eFinalScan) { logPosition(this, "e", "final pointer scan fail: " + String(eFinalScan)); }
      if (!scheduled && st.active && !st.closed) {
        try {
          this.setPointerToolResult({
            ok: false,
            type: "pointer_error",
            code: "TEXT_FINAL_SCAN_FAILED",
            message: "最终取字扫描失败",
            value: ""
          });
          this.toast("最终取字扫描失败");
          this.closePointerTool("最终取字扫描失败", true);
        } catch (eFallback) {}
      }
      return scheduled;
    }

    st.dragging = false;
    return false;
  };

'''
th19 = replace_section(
    th19,
    "  proto.finishPointerGestureFromRaw = function",
    "  proto.movePointerFromRaw = function",
    new_finalizer,
    "th19 finalizer",
)
TH19.write_text(th19, encoding="utf-8")

# 设置说明同步真实语义。
th14 = TH14.read_text(encoding="utf-8")
th14 = replace_once(th14, "// @version 1.0.11", "// @version 1.0.12", "th14 version")
th14 = replace_once(
    th14,
    '      desc: "取字和框选的悬停触发时间",',
    '      desc: "取字就绪提示与框选 OCR 悬停时间；松手取字不受提示时间限制",',
    "pointer settings description",
)
TH14.write_text(th14, encoding="utf-8")

# 更新既有结构验证，改为最终坐标优先和普通候选直接提交语义。
vp = VERIFY_POSITION.read_text(encoding="utf-8")
old_order = '''    snapshot_at = finalizer.index("getReadyPointerSnapshotForRelease")
    recent_at = finalizer.index("getRecentReadyPointerPick")
    invalidate_at = finalizer.index("invalidatePointerInspectForRelease")
    snapshot_finish_at = finalizer.index("finishReadyPointerSnapshot")
    recent_finish_at = finalizer.index("restoreRecentReadyPointerPick")
    final_move_at = finalizer.index("movePointerFromRaw(rawX, rawY, true, true)")
    if not (snapshot_at < recent_at < invalidate_at < snapshot_finish_at < recent_finish_at < final_move_at):
        fail("ready snapshot and recent valid pick must be committed before final raw move")
'''
new_order = '''    cancel_at = finalizer.index("cancelPointerSemanticUpdate")
    invalidate_at = finalizer.index("invalidatePointerInspectForRelease")
    final_move_at = finalizer.index("movePointerFromRaw(rawX, rawY, true, true)")
    candidate_at = finalizer.index("pointerCandidateMatchesFinalHotspot")
    recent_at = finalizer.index("getRecentPointerPickForRelease")
    scan_at = finalizer.index('schedulePointerInspectAsync(true, "release_final", true)')
    if not (cancel_at < invalidate_at < final_move_at < candidate_at < recent_at < scan_at):
        fail("release order must be cancel -> invalidate -> final raw -> candidate -> recent -> final scan")
'''
vp = replace_once(vp, old_order, new_order, "position verifier release order")
vp = replace_once(
    vp,
    '    candidate_at = finalizer.index("pointerCandidateMatchesFinalHotspot")\n'
    '    candidate_extract_at = finalizer.index("extractCurrentPointerText(true, st.releaseTs)", candidate_at)\n'
    '    scan_at = finalizer.index(\'schedulePointerInspectAsync(true, "release_final", true)\', candidate_extract_at)\n'
    '    if not (candidate_at < candidate_extract_at < scan_at):\n'
    '        fail("confirmed final candidate must pass the hover-gated extraction before fallback final scan")\n',
    '    candidate_extract_at = finalizer.index("extractCurrentPointerText(true, st.releaseTs)", candidate_at)\n'
    '    if not (candidate_at < candidate_extract_at < recent_at < scan_at):\n'
    '        fail("confirmed candidate and recent candidate must be tried before final scan")\n',
    "position verifier candidate order",
)
vp = replace_once(
    vp,
    '        fail("confirmed final candidate bypasses the hover-gated extraction")',
    '        fail("confirmed final candidate bypasses unified extraction")',
    "position verifier message",
)
vp = replace_once(vp, '        "// @version 1.1.30",', '        "// @version 1.1.31",', "position verifier version")
vp = replace_once(
    vp,
    '        "getRecentReadyPointerPick",\n        "restoreRecentReadyPointerPick",',
    '        "getRecentReadyPointerPick",\n        "restoreRecentReadyPointerPick",\n'
    '        "getRecentPointerPickForRelease",\n        "restoreRecentPointerPickForRelease",\n'
    '        "completePointerCandidateOnRelease",',
    "position verifier release helpers",
)
vp = replace_once(
    vp,
    '    if "syncPointerTextHoverFromStableHold(ts)" not in ready_section:\n'
    '        fail("text hover readiness does not count verified stable hold time")',
    '    if "syncPointerTextHoverFromStableHold(ts)" in ready_section:\n'
    '        fail("text hover readiness must not reuse OCR area hold timing")',
    "position verifier hover separation",
)
vp = replace_once(
    vp,
    '    if "restoreRecentReadyPointerPick" not in extract_section:\n'
    '        fail("extractCurrentPointerText does not restore the recent ready candidate")',
    '    if "getRecentPointerPickForRelease" not in extract_section:\n'
    '        fail("extractCurrentPointerText does not restore a recent valid release candidate")',
    "position verifier extraction cache",
)
vp = replace_once(
    vp,
    '    if "completePointerTextCopy(" not in extract_section:\n'
    '        fail("extractCurrentPointerText does not use the unified text completion path")',
    '    if "completePointerCandidateOnRelease(" not in extract_section:\n'
    '        fail("extractCurrentPointerText does not use the unified release completion path")',
    "position verifier completion helper",
)
VERIFY_POSITION.write_text(vp, encoding="utf-8")

# 源模块级回归验证。
VERIFY_RELEASE.write_text(r'''#!/usr/bin/env python3
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
    "// @version 1.1.31",
    "getRecentPointerPickForRelease = function",
    "var maxAge = 500",
    "restoreRecentPointerPickForRelease = function",
    "completePointerCandidateOnRelease = function",
    "TEXT_PICK_RECENT_CANDIDATE",
    "TEXT_PICK_FINAL_SCAN",
    "accessibility_recent_candidate",
    "accessibility_final_scan",
):
    if marker not in p17:
        fail("th17 marker missing: " + marker)

extract = section(p17, "FloatBallAppWM.prototype.extractCurrentPointerText = function", "FloatBallAppWM.prototype.finishPointerTextPickAfterRelease = function")
if "TEXT_HOVER_NOT_READY" in extract or "悬停时间不足" in extract:
    fail("ordinary accessibility extraction is still hover-gated")
if "completePointerCandidateOnRelease" not in extract:
    fail("ordinary extraction bypasses unified release completion")

ready = section(p17, "FloatBallAppWM.prototype.isPointerTextHoverReady = function", "FloatBallAppWM.prototype.getPointerTextHoverRemainMs = function")
if "syncPointerTextHoverFromStableHold" in ready or "areaHoldSince" in ready:
    fail("text ready visual state is still coupled to OCR hold timing")

clock = section(p19, "function nowPosition()", "function numberOr")
if "SystemClock.uptimeMillis" in clock:
    fail("th19 still uses uptimeMillis for pointer release state")
if "th17Now" not in clock and "System.currentTimeMillis" not in clock:
    fail("th19 wall-clock source missing")

finalizer = section(p19, "proto.finishPointerGestureFromRaw = function", "proto.movePointerFromRaw = function")
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
if "getRecentReadyPointerPick" in finalizer or "finishReadyPointerSnapshot" in finalizer:
    fail("release finalizer still requires a ready-only candidate")
if "extractCurrentPointerText(true, st.releaseTs)" not in finalizer:
    fail("confirmed candidate does not use unified extraction")
if "TEXT_PICK_RECENT_CANDIDATE" not in finalizer:
    fail("recent valid candidate commit missing")

if "松手取字不受提示时间限制" not in p14:
    fail("pointer setting description does not match release behavior")
if "指针无障碍取字提交链修复" in entry or "installToolHubPointerAccessibilityTextReleaseFix" in entry:
    fail("entry-level runtime pointer patch still remains")

expected = hashlib.sha256(ENTRY.read_bytes()).hexdigest()
sha_line = ENTRY_SHA.read_text(encoding="utf-8").strip()
if expected not in sha_line:
    fail("ToolHub.js.sha256 mismatch")

print("OK pointer_source_text_release sha256=" + expected)
''', encoding="utf-8")

print("pointer source fix applied")
