#!/usr/bin/env python3
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parents[2]
ENTRY = ROOT / "ToolHub.js"
ENTRY_SHA = ROOT / "ToolHub.js.sha256"
VERIFY = ROOT / "scripts" / "verify_pointer_text_release.py"
WORKFLOW = ROOT / ".github" / "workflows" / "verify.yml"

MARKER = "__toolHubPointerReleaseFixInstalled"
ANCHOR = "notifyToolHubModulesLoaded();\n"

HOTFIX = r'''

// =======================【指针无障碍取字提交链修复】=======================
// 普通取字：当前候选或近期有效候选命中最终热点时，松手立即提交。
// POINTER_TEXT_HOVER_MS 仅控制绿色“取字就绪”提示，不再阻断文字复制。
(function installPointerAccessibilityTextReleaseFix() {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
  var proto = FloatBallAppWM.prototype;
  if (proto.__toolHubPointerReleaseFixInstalled === true) return;

  function pointerReleaseNow() {
    try { return Number(java.lang.System.currentTimeMillis()); } catch (e0) {}
    return new Date().getTime();
  }

  function normalizePointerReleaseTs(value) {
    var current = pointerReleaseNow();
    var n = Number(value || 0);
    if (isNaN(n) || n <= 0) return current;
    // th_19 旧实现使用 uptimeMillis；遇到开机时间时统一折算到墙上时钟。
    if (n < 1000000000000 && current >= 1000000000000) return current;
    return n;
  }

  function copyPointerReleaseRect(rect) {
    if (!rect) return null;
    return {
      left: Math.round(Number(rect.left || 0)),
      top: Math.round(Number(rect.top || 0)),
      right: Math.round(Number(rect.right || 0)),
      bottom: Math.round(Number(rect.bottom || 0))
    };
  }

  function pointerReleaseLog(appObj, level, message) {
    try { safeLog(appObj && appObj.L, level, message); } catch (e0) {}
  }

  proto.isPointerTextHoverReady = function(atTs) {
    var st = this.ensurePointerToolState();
    if (!st.currentText || !st.currentRect) return false;
    if (st.currentKey && st.hoverKey && String(st.currentKey) !== String(st.hoverKey)) return false;
    var since = Number(st.hoverSince || 0);
    if (isNaN(since) || since <= 0) return false;
    var ts = normalizePointerReleaseTs(atTs);
    if (since > ts) return false;
    return ts - since >= Number(this.getPointerTextHoverLimitMs());
  };

  proto.getPointerTextHoverRemainMs = function(atTs) {
    var st = this.ensurePointerToolState();
    var ts = normalizePointerReleaseTs(atTs);
    var since = Number(st.hoverSince || 0);
    var elapsed = (!isNaN(since) && since > 0 && since <= ts) ? ts - since : 0;
    var remain = Number(this.getPointerTextHoverLimitMs()) - elapsed;
    if (isNaN(remain) || remain < 0) remain = 0;
    return Math.ceil(remain);
  };

  proto.getRecentPointerPickForRelease = function(st, atTs) {
    var pointerState = st || null;
    try {
      if (!pointerState && this.ensurePointerToolState) pointerState = this.ensurePointerToolState();
    } catch (eState) { pointerState = null; }
    if (!pointerState || !pointerState.lastValidPickText || !pointerState.lastValidPickRect) return null;
    if (Number(pointerState.lastValidPickSession || 0) !== Number(pointerState.inspectSession || 0)) return null;

    var now = normalizePointerReleaseTs(atTs);
    var hitAt = Number(pointerState.lastValidPickAt || 0);
    if (isNaN(hitAt) || hitAt <= 0) return null;
    if (hitAt < 1000000000000 && now >= 1000000000000) hitAt = now;
    var age = now - hitAt;
    var graceMs = 500;
    if (age < 0 || age > graceMs) return null;

    var hp = null;
    try { hp = this.getPointerHotspot(); } catch (eHotspot) { hp = null; }
    if (!hp) return null;
    var hit = false;
    try {
      hit = this.pointerRectHitScore ?
        Number(this.pointerRectHitScore(hp.x, hp.y, pointerState.lastValidPickRect)) >= 0 :
        hp.x >= Number(pointerState.lastValidPickRect.left) &&
        hp.x <= Number(pointerState.lastValidPickRect.right) &&
        hp.y >= Number(pointerState.lastValidPickRect.top) &&
        hp.y <= Number(pointerState.lastValidPickRect.bottom);
    } catch (eHit) { hit = false; }
    if (!hit) return null;

    return {
      text: String(pointerState.lastValidPickText),
      rect: copyPointerReleaseRect(pointerState.lastValidPickRect),
      key: String(pointerState.lastValidPickKey || ""),
      hitAt: hitAt,
      ageMs: age,
      session: Number(pointerState.lastValidPickSession || 0)
    };
  };

  proto.restorePointerPickForRelease = function(st, pick) {
    var pointerState = st || null;
    var item = pick || null;
    if (!pointerState || !item || !item.text || !item.rect) return false;
    pointerState.currentText = String(item.text);
    pointerState.currentRect = copyPointerReleaseRect(item.rect);
    pointerState.currentKey = String(item.key || "");
    pointerState.hoverKey = pointerState.currentKey;
    pointerState.hoverSince = Math.max(1, pointerReleaseNow() - Number(this.getPointerTextHoverLimitMs()));
    try { this.showPointerAreaFrame(pointerState.currentRect, "text_hit"); } catch (eFrame) {}
    try { this.updatePointerVisualHot(true); } catch (eHot) {}
    return true;
  };

  proto.completePointerCandidateOnRelease = function(st, successCode, source, extraData) {
    var pointerState = st || null;
    if (!pointerState || !pointerState.currentText || !pointerState.currentRect) return false;
    var data = { source: String(source || "accessibility_release") };
    try {
      if (extraData) {
        for (var k in extraData) data[k] = extraData[k];
      }
    } catch (eData) {}
    pointerReleaseLog(this, "i",
      "pointer text release commit source=" + data.source +
      " textLen=" + String(String(pointerState.currentText).length));
    return this.completePointerTextCopy(
      String(pointerState.currentText),
      copyPointerReleaseRect(pointerState.currentRect),
      String(successCode || "TEXT_PICK_SUCCESS"),
      data
    ) === true;
  };

  // 覆盖核心提取：无障碍已经取得文字即视为取字成功；绿色悬停状态只负责视觉反馈。
  proto.extractCurrentPointerText = function(skipInspect, releaseTs) {
    var st = this.ensurePointerToolState();
    if (!st.active || st.closed) return { ok: false, err: "指针未启动" };
    if (skipInspect !== true) this.updatePointerInspect(true);
    if (!st.currentText || !st.currentRect) {
      var recent = null;
      try { recent = this.getRecentPointerPickForRelease(st, releaseTs); } catch (eRecent) { recent = null; }
      if (recent) this.restorePointerPickForRelease(st, recent);
    }
    if (!st.currentText || !st.currentRect) {
      this.setPointerToolResult({ ok: false, type: "pointer_error", code: "NO_TEXT", message: "未命中文本" });
      this.toast("未命中文本");
      this.closePointerTool("未命中文本", true);
      return { ok: false, err: "未命中文本", code: "NO_TEXT" };
    }
    var textValue = String(st.currentText);
    var completed = this.completePointerCandidateOnRelease(
      st,
      "TEXT_PICK_SUCCESS",
      "accessibility_current",
      { releaseTs: normalizePointerReleaseTs(releaseTs) }
    );
    return { ok: completed === true, pending: false, text: textValue, clipboard: completed === true };
  };

  var oldFinishPointerTextPickAfterReleaseFix = proto.finishPointerTextPickAfterRelease;
  proto.finishPointerTextPickAfterRelease = function() {
    var st = this.ensurePointerToolState();
    if (!st.active || st.closed || st.mode !== "text_pick") return false;
    var releaseTs = normalizePointerReleaseTs(st.releaseTs);
    st.releaseTs = releaseTs;

    var candidateHit = false;
    try { candidateHit = this.pointerCandidateMatchesFinalHotspot(st) === true; } catch (eCandidate) { candidateHit = false; }
    if (candidateHit) {
      return this.completePointerCandidateOnRelease(
        st,
        "TEXT_PICK_FINAL_SCAN",
        "accessibility_final_scan",
        {
          costMs: Number(st.inspectLastCostMs || 0),
          nodes: Number(st.inspectLastNodes || 0),
          windows: Number(st.inspectLastWindows || 0)
        }
      );
    }

    var recent = null;
    try { recent = this.getRecentPointerPickForRelease(st, releaseTs); } catch (eRecent) { recent = null; }
    if (recent && this.restorePointerPickForRelease(st, recent)) {
      return this.completePointerCandidateOnRelease(
        st,
        "TEXT_PICK_RECENT_CANDIDATE",
        "accessibility_recent_candidate",
        { ageMs: Number(recent.ageMs || 0), finalScanFallback: true }
      );
    }

    return oldFinishPointerTextPickAfterReleaseFix.call(this);
  };

  proto.finishPointerGestureFromRaw = function(rawX, rawY, action) {
    var st = null;
    try { st = this.ensurePointerToolState ? this.ensurePointerToolState() : null; } catch (eState) { st = null; }
    if (!st || !st.active || st.closed) return false;

    this.cancelPointerSemanticUpdate(st, "pointer_release");
    this.invalidatePointerInspectForRelease(st);
    st.releaseTs = pointerReleaseNow();

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
        pointerReleaseLog(this, "e", "final area capture fail: " + String(eAreaFinish));
        return false;
      }
      return true;
    }

    if (st.mode === "text_pick") {
      st.dragging = false;

      var candidateHit = false;
      try { candidateHit = this.pointerCandidateMatchesFinalHotspot(st) === true; } catch (eCandidate) { candidateHit = false; }
      if (candidateHit) {
        return this.completePointerCandidateOnRelease(
          st,
          "TEXT_PICK_CONFIRMED_CANDIDATE",
          "accessibility_confirmed_candidate",
          { hoverReady: this.isPointerTextHoverReady(st.releaseTs) === true }
        );
      }

      var recent = null;
      try { recent = this.getRecentPointerPickForRelease(st, st.releaseTs); } catch (eRecent) { recent = null; }
      if (recent && this.restorePointerPickForRelease(st, recent)) {
        return this.completePointerCandidateOnRelease(
          st,
          "TEXT_PICK_RECENT_CANDIDATE",
          "accessibility_recent_candidate",
          { ageMs: Number(recent.ageMs || 0) }
        );
      }

      // 当前候选确实离开最终热点时才补扫，防止一次空扫描推翻已命中的文字。
      try {
        st.inspectMaxFinalMs = Math.max(Number(st.inspectMaxFinalMs || 180), 240);
        st.inspectMaxFinalNodes = Math.max(Number(st.inspectMaxFinalNodes || 720), 1200);
      } catch (eBudget) {
        st.inspectMaxFinalMs = 240;
        st.inspectMaxFinalNodes = 1200;
      }
      var scheduled = false;
      try { scheduled = this.schedulePointerInspectAsync(true, "release_final", true) === true; }
      catch (eFinalScan) { pointerReleaseLog(this, "e", "final pointer scan fail: " + String(eFinalScan)); }
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

  if (typeof proto.getPointerSettingsBlocks === "function") {
    var oldGetPointerSettingsBlocksReleaseFix = proto.getPointerSettingsBlocks;
    proto.getPointerSettingsBlocks = function() {
      var blocks = oldGetPointerSettingsBlocksReleaseFix.call(this);
      try {
        for (var i = 0; i < blocks.length; i++) {
          if (blocks[i] && String(blocks[i].key || "") === "hover") {
            blocks[i].desc = "取字就绪提示时间与框选 OCR 悬停时间；松手取字不受提示时间限制";
          }
        }
      } catch (eBlocks) {}
      return blocks;
    };
  }

  proto.__toolHubPointerReleaseFixInstalled = true;
  pointerReleaseLog(null, "i", "pointer accessibility text release fix installed");
})();
'''

VERIFIER = r'''#!/usr/bin/env python3
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "ToolHub.js"
ENTRY_SHA = ROOT / "ToolHub.js.sha256"


def fail(msg):
    print("FAIL:", msg)
    sys.exit(1)


text = ENTRY.read_text(encoding="utf-8")
start = text.find("// =======================【指针无障碍取字提交链修复】")
end = text.find("proto.__toolHubPointerReleaseFixInstalled = true;", start)
if start < 0 or end < 0:
    fail("pointer release fix block missing")
block = text[start:end]

required = [
    "java.lang.System.currentTimeMillis()",
    "normalizePointerReleaseTs",
    "getRecentPointerPickForRelease",
    "var graceMs = 500",
    "restorePointerPickForRelease",
    "completePointerCandidateOnRelease",
    "TEXT_PICK_CONFIRMED_CANDIDATE",
    "TEXT_PICK_RECENT_CANDIDATE",
    "TEXT_PICK_FINAL_SCAN",
    "accessibility_confirmed_candidate",
    "accessibility_recent_candidate",
    "accessibility_final_scan",
    "movePointerFromRaw(rawX, rawY, true, true)",
    "schedulePointerInspectAsync(true, \"release_final\", true)",
    "松手取字不受提示时间限制",
]
for marker in required:
    if marker not in block:
        fail("missing marker: " + marker)

if "SystemClock.uptimeMillis" in block:
    fail("release fix still uses uptimeMillis")

extract = block[block.find("proto.extractCurrentPointerText = function"):block.find("var oldFinishPointerTextPickAfterReleaseFix")]
if "TEXT_HOVER_NOT_READY" in extract or "悬停时间不足" in extract:
    fail("ordinary text extraction is still hover-gated")
if "completePointerCandidateOnRelease" not in extract:
    fail("ordinary text extraction does not use unified completion")

finalizer = block[block.find("proto.finishPointerGestureFromRaw = function"):block.find("if (typeof proto.getPointerSettingsBlocks")]
order = [
    finalizer.find("cancelPointerSemanticUpdate"),
    finalizer.find("invalidatePointerInspectForRelease"),
    finalizer.find("movePointerFromRaw(rawX, rawY, true, true)"),
    finalizer.find("pointerCandidateMatchesFinalHotspot"),
    finalizer.find("getRecentPointerPickForRelease"),
    finalizer.find("schedulePointerInspectAsync(true, \"release_final\", true)"),
]
if any(pos < 0 for pos in order) or order != sorted(order):
    fail("release finalizer order is unsafe")

if "isPointerTextHoverReady(st.releaseTs) === true" not in finalizer:
    fail("hover readiness is not retained as diagnostic visual state")

expected = hashlib.sha256(ENTRY.read_bytes()).hexdigest()
sha_line = ENTRY_SHA.read_text(encoding="utf-8").strip()
if expected not in sha_line:
    fail("ToolHub.js.sha256 mismatch after pointer fix")

print("OK pointer_text_release_fix sha256=" + expected)
'''


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one occurrence, got {count}")
    return text.replace(old, new, 1)


entry = ENTRY.read_text(encoding="utf-8")
if MARKER not in entry:
    entry = replace_once(entry, ANCHOR, ANCHOR + HOTFIX, "ToolHub insertion anchor")
    ENTRY.write_text(entry, encoding="utf-8")

entry_hash = hashlib.sha256(ENTRY.read_bytes()).hexdigest()
ENTRY_SHA.write_text(f"{entry_hash}  ToolHub.js\n", encoding="utf-8")
VERIFY.write_text(VERIFIER, encoding="utf-8")
VERIFY.chmod(0o755)

workflow = WORKFLOW.read_text(encoding="utf-8")
verify_line = "          python3 scripts/verify_pointer_text_release.py\n"
if verify_line not in workflow:
    workflow = replace_once(
        workflow,
        "          python3 scripts/verify_pointer_issue_85.py\n",
        "          python3 scripts/verify_pointer_issue_85.py\n" + verify_line,
        "verify workflow anchor",
    )
    WORKFLOW.write_text(workflow, encoding="utf-8")

print("pointer text release fix applied")
print("ToolHub.js sha256=" + entry_hash)
