#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POINTER = ROOT / "code" / "th_17_pointer.js"
VERIFY = ROOT / "scripts" / "verify_pointer_regressions.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError("%s expected once, found %d" % (label, count))
    return text.replace(old, new, 1)


def replace_between(text, start_marker, end_marker, replacement, label):
    start = text.find(start_marker)
    if start < 0:
        raise RuntimeError("%s start marker missing" % label)
    end = text.find(end_marker, start)
    if end < 0:
        raise RuntimeError("%s end marker missing" % label)
    return text[:start] + replacement.rstrip() + "\n\n" + text[end:]


pointer = POINTER.read_text(encoding="utf-8")
verify = VERIFY.read_text(encoding="utf-8")

pointer = replace_once(pointer, "// @version 1.2.5", "// @version 1.2.6", "pointer version")

pointer = replace_once(
    pointer,
    """      inspectLastCostMs: 0,\n      inspectLastNodes: 0,\n      inspectMaxDragMs: 90,""",
    """      inspectLastCostMs: 0,\n      inspectLastNodes: 0,\n      inspectLastPrepareMs: 0,\n      inspectLastAutomationMs: 0,\n      inspectLastActiveRootMs: 0,\n      inspectLastWindowsQueryMs: 0,\n      inspectLastWindowsScanMs: 0,\n      inspectLastWindowsScanned: 0,\n      inspectMaxDragMs: 90,""",
    "inspect timing state",
)

ensure_ui = r'''FloatBallAppWM.prototype.ensurePointerUiAutomationReady = function(a, reason) {
  if (!a) return null;

  try {
    if (a.isConnected && !a.isConnected()) a.connect();
  } catch (eConn0) {
    try { if (a.connect) a.connect(); } catch (eConn1) {}
  }

  try {
    if (a.getServiceInfo && a.setServiceInfo) {
      var info = a.getServiceInfo();
      if (info) {
        var flags = 0;
        try { flags = Number(info.flags || 0); } catch (eFlags0) { flags = 0; }
        try { flags = flags | android.accessibilityservice.AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS; } catch (eF1) {}
        try { flags = flags | android.accessibilityservice.AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS; } catch (eF2) {}
        try { flags = flags | android.accessibilityservice.AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS; } catch (eF3) {}
        try { info.flags = flags; } catch (eSetFlags) {}
        try { a.setServiceInfo(info); } catch (eSetInfo) {}
      }
    }
  } catch (eInfo) {}

  // final scan 的缓存清理只允许在 overlay 隐藏后的 prepare 阶段执行一次。
  // 扫描阶段复用同一个 UiAutomation，避免重复 clearCache/getServiceInfo Binder 调用。
  if (String(reason || "") === "final_prepare") {
    try { if (a.clearCache) a.clearCache(); } catch (eClear) {}
  }

  return a;
};'''
pointer = replace_between(
    pointer,
    "FloatBallAppWM.prototype.ensurePointerUiAutomationReady = function(a, reason) {",
    "FloatBallAppWM.prototype.getPointerUiAutomation = function(reason) {",
    ensure_ui,
    "ensurePointerUiAutomationReady",
)

active_root = r'''FloatBallAppWM.prototype.getPointerActiveRoot = function(reason, automation) {
  var a = automation || this.getPointerUiAutomation(reason);
  if (!a) return null;
  var root = null;
  var flags = this.getPointerPrefetchFlags();
  try {
    if (this.getPointerSdkInt() >= 33 && flags !== 0 && a.getRootInActiveWindow) root = a.getRootInActiveWindow(flags);
  } catch (e0) { root = null; }
  if (!root) {
    try { root = a.getRootInActiveWindow(); } catch (e1) { root = null; }
  }
  return root;
};'''
pointer = replace_between(
    pointer,
    "FloatBallAppWM.prototype.getPointerActiveRoot = function(reason) {",
    "FloatBallAppWM.prototype.findPointerTextNodeAt = function(root, x, y) {",
    active_root,
    "getPointerActiveRoot",
)

snapshot = r'''FloatBallAppWM.prototype.findPointerTextAtSnapshot = function(x, y, force, reason, seq, session, preparedAutomation) {
  var start = th17Now();
  var reasonText = String(reason || "");
  var isFinal = force === true;
  var isRetry = !isFinal && reasonText.indexOf("drag_retry") === 0;
  var limitMs = isFinal ? 180 : (isRetry ? 160 : 90);
  var maxNodes = isFinal ? 420 : (isRetry ? 600 : 240);
  var st = this.ensurePointerToolState();
  try {
    if (isFinal) limitMs = Number(st.inspectMaxFinalMs || 180);
    else if (isRetry) limitMs = Number(st.inspectMaxRetryMs || 160);
    else limitMs = Number(st.inspectMaxDragMs || 90);
  } catch (eLimit) {}
  try {
    if (isFinal) maxNodes = Number(st.inspectMaxFinalNodes || 420);
    else if (isRetry) maxNodes = Number(st.inspectMaxRetryNodes || 600);
    else maxNodes = Number(st.inspectMaxDragNodes || 240);
  } catch (eNodes) {}
  if (isNaN(limitMs) || limitMs < 20) limitMs = isFinal ? 180 : (isRetry ? 160 : 90);
  if (isNaN(maxNodes) || maxNodes < 40) maxNodes = isFinal ? 420 : (isRetry ? 600 : 240);

  var count = { n: 0 };
  var result = null;
  var windowsCount = 0;
  var windowsScanned = 0;
  var activeWindowId = -1;
  var automationMs = 0;
  var activeRootMs = 0;
  var windowsQueryMs = 0;
  var windowsScanMs = 0;
  var fallbackSkippedDueBudget = false;

  var automationStart = th17Now();
  var a = preparedAutomation || this.getPointerUiAutomation(isFinal ? "final_scan" : "scan");
  automationMs = th17Now() - automationStart;

  // 优先扫描活动应用根节点，并复用同一个 UiAutomation。
  // final scan 已在 prepare 阶段完成 clearCache，不再重复获取和清理。
  var activeRoot = null;
  var activeRootStart = th17Now();
  try {
    activeRoot = this.getPointerActiveRoot(isFinal ? "final_scan" : "scan", a);
    if (activeRoot) {
      try { if (activeRoot.getWindowId) activeWindowId = Number(activeRoot.getWindowId()); } catch (eWindowId) { activeWindowId = -1; }
      result = this.findPointerTextNodeAtBudget(
        activeRoot,
        x,
        y,
        start,
        limitMs,
        maxNodes,
        count
      );
    }
  } catch (eActive) {
    result = null;
  } finally {
    activeRootMs = th17Now() - activeRootStart;
    try { if (activeRoot) activeRoot.recycle(); } catch (eRecycleActive) {}
  }

  // 活动根节点未命中时，只在仍有可用时间时补扫其他窗口。
  // final scan 最多补扫两个非活动窗口，避免 getRoot() Binder 调用把 220ms 预算拖穿。
  if (!result || !result.text || !result.rect) {
    var minFallbackBudgetMs = isFinal ? 35 : 20;
    var maxExtraWindows = isFinal ? 2 : 1;
    var remainingBeforeWindows = limitMs - (th17Now() - start);
    if (remainingBeforeWindows <= minFallbackBudgetMs) {
      fallbackSkippedDueBudget = true;
    } else {
      try {
        if (a && a.getWindows) {
          var windowsQueryStart = th17Now();
          var wins = a.getWindows();
          windowsQueryMs = th17Now() - windowsQueryStart;
          if (wins) {
            try { windowsCount = wins.size(); } catch (eSize) { windowsCount = 0; }
            var windowsScanStart = th17Now();
            for (var wi = 0; wi < windowsCount; wi++) {
              var elapsedBeforeWindow = th17Now() - start;
              if (elapsedBeforeWindow >= limitMs || count.n >= maxNodes) {
                fallbackSkippedDueBudget = true;
                break;
              }
              if (windowsScanned >= maxExtraWindows) break;

              var win = null;
              var rootFromWin = null;
              try {
                win = wins.get(wi);
                var winId = -1;
                try { if (win && win.getId) winId = Number(win.getId()); } catch (eWinId) { winId = -1; }
                if (activeWindowId >= 0 && winId === activeWindowId) continue;

                var remainingForRoot = limitMs - (th17Now() - start);
                if (remainingForRoot <= 15) {
                  fallbackSkippedDueBudget = true;
                  break;
                }

                windowsScanned++;
                if (win) rootFromWin = this.getPointerWindowRoot(win);
                if (rootFromWin) {
                  result = this.findPointerTextNodeAtBudget(
                    rootFromWin,
                    x,
                    y,
                    start,
                    limitMs,
                    maxNodes,
                    count
                  );
                }
              } catch (eWin) {
                result = null;
              } finally {
                try { if (rootFromWin) rootFromWin.recycle(); } catch (eRootRecycle) {}
              }
              if (result && result.text && result.rect) break;
            }
            windowsScanMs = th17Now() - windowsScanStart;
          }
        }
      } catch (eWindows) {}
    }
  }

  var cost = th17Now() - start;
  var timedOut = cost >= limitMs || count.n >= maxNodes || fallbackSkippedDueBudget === true;
  return {
    seq: seq,
    session: session,
    x: x,
    y: y,
    force: isFinal,
    reason: reasonText,
    result: result,
    costMs: cost,
    budgetMs: limitMs,
    nodes: count.n,
    windows: windowsCount,
    windowsScanned: windowsScanned,
    automationMs: automationMs,
    activeRootMs: activeRootMs,
    windowsQueryMs: windowsQueryMs,
    windowsScanMs: windowsScanMs,
    timedOut: timedOut
  };
};'''
pointer = replace_between(
    pointer,
    "FloatBallAppWM.prototype.findPointerTextAtSnapshot = function(x, y, force, reason, seq, session) {",
    "FloatBallAppWM.prototype.cancelPointerInspectRetry = function(st, reason) {",
    snapshot,
    "findPointerTextAtSnapshot",
)

pointer = replace_once(
    pointer,
    """  st.inspectLastCostMs = Number(pack.costMs || 0);\n  st.inspectLastNodes = Number(pack.nodes || 0);\n  st.inspectLastWindows = Number(pack.windows || 0);\n  st.inspectLastTimedOut = pack.timedOut === true;""",
    """  st.inspectLastCostMs = Number(pack.costMs || 0);\n  st.inspectLastNodes = Number(pack.nodes || 0);\n  st.inspectLastWindows = Number(pack.windows || 0);\n  st.inspectLastPrepareMs = Number(pack.prepareMs || 0);\n  st.inspectLastAutomationMs = Number(pack.automationMs || 0);\n  st.inspectLastActiveRootMs = Number(pack.activeRootMs || 0);\n  st.inspectLastWindowsQueryMs = Number(pack.windowsQueryMs || 0);\n  st.inspectLastWindowsScanMs = Number(pack.windowsScanMs || 0);\n  st.inspectLastWindowsScanned = Number(pack.windowsScanned || 0);\n  st.inspectLastTimedOut = pack.timedOut === true;""",
    "apply inspect timing state",
)

pointer = replace_once(
    pointer,
    'safeLog(this.L, \'i\', "pointer inspect cost=" + String(pack.costMs) + " nodes=" + String(pack.nodes) + " windows=" + String(pack.windows) + " reason=" + String(pack.reason) + " timeout=" + String(pack.timedOut === true));',
    'safeLog(this.L, \'i\', "pointer inspect cost=" + String(pack.costMs) + " budget=" + String(pack.budgetMs || 0) + " nodes=" + String(pack.nodes) + " windows=" + String(pack.windows) + " scanned=" + String(pack.windowsScanned || 0) + " automation=" + String(pack.automationMs || 0) + " active=" + String(pack.activeRootMs || 0) + " windowsQuery=" + String(pack.windowsQueryMs || 0) + " windowsScan=" + String(pack.windowsScanMs || 0) + " reason=" + String(pack.reason) + " timeout=" + String(pack.timedOut === true));',
    "inspect timing log",
)

prepare = r'''FloatBallAppWM.prototype.preparePointerAccessibilityFinalScan = function(reason) {
  var st = this.ensurePointerToolState();
  var automation = null;

  // 无障碍 final scan 前隐藏自身 overlay。
  // 否则部分 ROM / ShortX UiAutomation 在 overlay 可见时会返回 windows=0 / nodes=0。
  try { this.hidePointerAreaFrame(); } catch (eFrame) {}

  try {
    if (st.root) {
      st.root.setVisibility(android.view.View.GONE);
      safeLog(this.L, 'i', "pointer accessibility final scan hide overlay reason=" + String(reason || ""));
    }
  } catch (eHide) {
    try { safeLog(this.L, 'w', "pointer accessibility final scan hide overlay fail: " + String(eHide)); } catch (eLogHide) {}
  }

  try { java.lang.Thread.sleep(90); } catch (eSleep) {}

  try {
    // final_prepare 只清理一次缓存，随后把同一 automation 直接交给扫描阶段复用。
    automation = this.getPointerUiAutomation("final_prepare");
    if (automation) {
      try { if (automation.waitForIdle) automation.waitForIdle(50, 350); } catch (eIdle) {}
    }
  } catch (eUi) {
    automation = null;
    try { safeLog(this.L, 'w', "pointer accessibility final scan ui prepare fail: " + String(eUi)); } catch (eLogUi) {}
  }

  return automation;
};'''
pointer = replace_between(
    pointer,
    "FloatBallAppWM.prototype.preparePointerAccessibilityFinalScan = function(reason) {",
    "FloatBallAppWM.prototype.schedulePointerInspectAsync = function(force, reason, finishAfterResult, allowStationary) {",
    prepare,
    "preparePointerAccessibilityFinalScan",
)

pointer = replace_once(
    pointer,
    """  if (force === true && finishAfterResult === true) {\n    this.preparePointerAccessibilityFinalScan(reasonText);\n    st.inspectLatestX = hp.x;""",
    """  if (force === true && finishAfterResult === true) {\n    var prepareStartedAt = th17Now();\n    var finalAutomation = this.preparePointerAccessibilityFinalScan(reasonText);\n    var finalPrepareMs = th17Now() - prepareStartedAt;\n    st.inspectLatestX = hp.x;""",
    "final prepare capture",
)

pointer = replace_once(
    pointer,
    """      pack = this.findPointerTextAtSnapshot(hp.x, hp.y, true, reasonText + "_sync", st.inspectLatestSeq, st.inspectSession);\n      pack.finishAfterResult = true;""",
    """      pack = this.findPointerTextAtSnapshot(hp.x, hp.y, true, reasonText + "_sync", st.inspectLatestSeq, st.inspectSession, finalAutomation);\n      pack.prepareMs = finalPrepareMs;\n      pack.finishAfterResult = true;""",
    "final scan automation reuse",
)

pointer = replace_once(
    pointer,
    'safeLog(this.L, \'i\', "pointer release sync inspect cost=" + String(pack.costMs) + " nodes=" + String(pack.nodes) + " windows=" + String(pack.windows) + " reason=" + String(pack.reason) + " timeout=" + String(pack.timedOut === true));',
    'safeLog(this.L, \'i\', "pointer release sync inspect prepare=" + String(pack.prepareMs || 0) + " cost=" + String(pack.costMs) + " budget=" + String(pack.budgetMs || 0) + " nodes=" + String(pack.nodes) + " windows=" + String(pack.windows) + " scanned=" + String(pack.windowsScanned || 0) + " automation=" + String(pack.automationMs || 0) + " active=" + String(pack.activeRootMs || 0) + " windowsQuery=" + String(pack.windowsQueryMs || 0) + " windowsScan=" + String(pack.windowsScanMs || 0) + " reason=" + String(pack.reason) + " timeout=" + String(pack.timedOut === true));',
    "final sync timing log",
)

pointer = replace_once(
    pointer,
    """    extra.costMs = Number(st.inspectLastCostMs || 0);\n    extra.nodes = Number(st.inspectLastNodes || 0);\n    extra.windows = Number(st.inspectLastWindows || 0);""",
    """    extra.costMs = Number(st.inspectLastCostMs || 0);\n    extra.prepareMs = Number(st.inspectLastPrepareMs || 0);\n    extra.nodes = Number(st.inspectLastNodes || 0);\n    extra.windows = Number(st.inspectLastWindows || 0);\n    extra.windowsScanned = Number(st.inspectLastWindowsScanned || 0);\n    extra.automationMs = Number(st.inspectLastAutomationMs || 0);\n    extra.activeRootMs = Number(st.inspectLastActiveRootMs || 0);\n    extra.windowsQueryMs = Number(st.inspectLastWindowsQueryMs || 0);\n    extra.windowsScanMs = Number(st.inspectLastWindowsScanMs || 0);""",
    "final success timing data",
)

pointer = replace_once(
    pointer,
    """        "pointer release final scan timeout cost=" + String(st.inspectLastCostMs || 0) +\n        " nodes=" + String(st.inspectLastNodes || 0) +\n        " windows=" + String(st.inspectLastWindows || 0) +\n        " reason=" + String(st.inspectLastReason || st.inspectLatestReason || "")""",
    """        "pointer release final scan timeout prepare=" + String(st.inspectLastPrepareMs || 0) +\n        " cost=" + String(st.inspectLastCostMs || 0) +\n        " nodes=" + String(st.inspectLastNodes || 0) +\n        " windows=" + String(st.inspectLastWindows || 0) +\n        " scanned=" + String(st.inspectLastWindowsScanned || 0) +\n        " automation=" + String(st.inspectLastAutomationMs || 0) +\n        " active=" + String(st.inspectLastActiveRootMs || 0) +\n        " windowsQuery=" + String(st.inspectLastWindowsQueryMs || 0) +\n        " windowsScan=" + String(st.inspectLastWindowsScanMs || 0) +\n        " reason=" + String(st.inspectLastReason || st.inspectLatestReason || "")""",
    "final timeout timing log",
)

pointer = replace_once(
    pointer,
    """        costMs: Number(st.inspectLastCostMs || 0),\n        nodes: Number(st.inspectLastNodes || 0),\n        windows: Number(st.inspectLastWindows || 0),\n        reason: String(st.inspectLastReason || st.inspectLatestReason || ""),""",
    """        prepareMs: Number(st.inspectLastPrepareMs || 0),\n        costMs: Number(st.inspectLastCostMs || 0),\n        nodes: Number(st.inspectLastNodes || 0),\n        windows: Number(st.inspectLastWindows || 0),\n        windowsScanned: Number(st.inspectLastWindowsScanned || 0),\n        automationMs: Number(st.inspectLastAutomationMs || 0),\n        activeRootMs: Number(st.inspectLastActiveRootMs || 0),\n        windowsQueryMs: Number(st.inspectLastWindowsQueryMs || 0),\n        windowsScanMs: Number(st.inspectLastWindowsScanMs || 0),\n        reason: String(st.inspectLastReason || st.inspectLatestReason || ""),""",
    "final timeout timing data",
)

contract = r'''    result.require(
        group,
        "final scan reuses prepared automation and caps fallback windows",
        "preparedAutomation" in pointer
        and 'this.getPointerUiAutomation("final_prepare")' in pointer
        and 'this.getPointerActiveRoot(isFinal ? "final_scan" : "scan", a)' in pointer
        and "activeWindowId" in pointer
        and "maxExtraWindows = isFinal ? 2 : 1" in pointer
        and "windowsScanned" in pointer
        and "windowsQueryMs" in pointer
        and "windowsScanMs" in pointer
        and "fallbackSkippedDueBudget" in pointer,
        "final accessibility scan must reuse one UiAutomation and bound extra-window Binder work",
    )

'''
verify = replace_once(
    verify,
    "    for forbidden in (\n",
    contract + "    for forbidden in (\n",
    "final scan regression contract",
)

POINTER.write_text(pointer, encoding="utf-8")
VERIFY.write_text(verify, encoding="utf-8")
print("OK applied pointer final scan budget fix")
