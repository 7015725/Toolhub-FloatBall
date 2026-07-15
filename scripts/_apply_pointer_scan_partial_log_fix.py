from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POINTER = ROOT / "code" / "th_17_pointer.js"
VERIFY = ROOT / "scripts" / "verify_pointer_regressions.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, got {count}")
    return text.replace(old, new, 1)


pointer = POINTER.read_text(encoding="utf-8")
verify = VERIFY.read_text(encoding="utf-8")

pointer = replace_once(pointer, "// @version 1.2.7", "// @version 1.2.8", "module version")

pointer = replace_once(
    pointer,
    '''function th17CleanNodeText(v) {
  if (v === null || v === undefined) return "";
  var s = "";
  try { s = String(v); } catch (e0) { s = ""; }
  s = s.replace(/^\\s+|\\s+$/g, "");
  return s;
}
''',
    '''function th17CleanNodeText(v) {
  if (v === null || v === undefined) return "";
  var s = "";
  try { s = String(v); } catch (e0) { s = ""; }
  s = s.replace(/^\\s+|\\s+$/g, "");
  return s;
}

function th17LogSingleLine(value, maxLen) {
  var s = "";
  try { s = String(value === null || value === undefined ? "" : value); } catch (e0) { s = ""; }
  s = s.replace(/\\r/g, "\\\\r").replace(/\\n/g, "\\\\n").replace(/\\u2028/g, "\\\\u2028").replace(/\\u2029/g, "\\\\u2029");
  var limit = Number(maxLen || 160);
  if (isNaN(limit) || limit < 16) limit = 160;
  if (s.length > limit) s = s.substring(0, limit) + "...";
  return s;
}
''',
    "single-line log helper",
)

pointer = replace_once(
    pointer,
    '      " key=" + key\n',
    '      " key=" + th17LogSingleLine(key, 180)\n',
    "hover credential key log",
)

pointer = replace_once(
    pointer,
    '''  var windowsScanMs = 0;
  var fallbackSkippedDueBudget = false;
''',
    '''  var windowsScanMs = 0;
  var fallbackPartial = false;
  var fallbackSkipReason = "";
''',
    "scan partial state",
)

pointer = replace_once(
    pointer,
    '''    if (remainingBeforeWindows <= minFallbackBudgetMs) {
      fallbackSkippedDueBudget = true;
    } else {
''',
    '''    if (remainingBeforeWindows <= minFallbackBudgetMs) {
      fallbackPartial = true;
      fallbackSkipReason = "low_budget";
    } else {
''',
    "initial fallback budget",
)

pointer = replace_once(
    pointer,
    '''              if (elapsedBeforeWindow >= limitMs || count.n >= maxNodes) {
                fallbackSkippedDueBudget = true;
                break;
              }
              if (windowsScanned >= maxExtraWindows) {
                fallbackSkippedDueBudget = true;
                break;
              }
''',
    '''              if (elapsedBeforeWindow >= limitMs) {
                fallbackPartial = true;
                fallbackSkipReason = "time_budget";
                break;
              }
              if (count.n >= maxNodes) {
                fallbackPartial = true;
                fallbackSkipReason = "node_budget";
                break;
              }
              if (windowsScanned >= maxExtraWindows) {
                fallbackPartial = true;
                fallbackSkipReason = "window_cap";
                break;
              }
''',
    "window loop stop reasons",
)

pointer = replace_once(
    pointer,
    '''                if (remainingForRoot <= 15) {
                  fallbackSkippedDueBudget = true;
                  break;
                }
''',
    '''                if (remainingForRoot <= 15) {
                  fallbackPartial = true;
                  fallbackSkipReason = "low_budget";
                  break;
                }
''',
    "root budget stop reason",
)

pointer = replace_once(
    pointer,
    '''  var cost = th17Now() - start;
  var timedOut = cost >= limitMs || count.n >= maxNodes || fallbackSkippedDueBudget === true;
  return {
''',
    '''  var cost = th17Now() - start;
  var budgetTimedOut =
    cost >= limitMs ||
    count.n >= maxNodes ||
    fallbackSkipReason === "time_budget" ||
    fallbackSkipReason === "node_budget" ||
    fallbackSkipReason === "low_budget";
  // 普通 drag/retry 达到主动窗口上限只表示部分扫描，不属于预算超时。
  // final scan 仍把任何未扫描窗口视为不完整，保留 TEXT_SCAN_TIMEOUT 语义。
  var timedOut = budgetTimedOut || (isFinal && fallbackPartial);
  return {
''',
    "timeout classification",
)

pointer = replace_once(
    pointer,
    '''    windowsScanMs: windowsScanMs,
    timedOut: timedOut
''',
    '''    windowsScanMs: windowsScanMs,
    partialWindows: fallbackPartial,
    skipReason: fallbackSkipReason,
    timedOut: timedOut
''',
    "scan metadata",
)

pointer = replace_once(
    pointer,
    '''  var reasonText = String(pack.reason || "");
  if (reasonText !== "drag" && reasonText.indexOf("drag_retry") !== 0) return false;
''',
    '''  var reasonText = String(pack.reason || "");
  if (reasonText !== "drag" && reasonText.indexOf("drag_retry") !== 0) return false;
  if (
    pack.partialWindows === true &&
    String(pack.skipReason || "") === "window_cap" &&
    pack.timedOut !== true
  ) return false;
''',
    "cap-only retry suppression",
)

pointer = replace_once(
    pointer,
    '''      safeLog(this.L, 'i', "pointer inspect cost=" + String(pack.costMs) + " budget=" + String(pack.budgetMs || 0) + " nodes=" + String(pack.nodes) + " windows=" + String(pack.windows) + " scanned=" + String(pack.windowsScanned || 0) + " automation=" + String(pack.automationMs || 0) + " active=" + String(pack.activeRootMs || 0) + " windowsQuery=" + String(pack.windowsQueryMs || 0) + " windowsScan=" + String(pack.windowsScanMs || 0) + " reason=" + String(pack.reason) + " timeout=" + String(pack.timedOut === true));
''',
    '''      safeLog(this.L, 'i', "pointer inspect cost=" + String(pack.costMs) + " budget=" + String(pack.budgetMs || 0) + " nodes=" + String(pack.nodes) + " windows=" + String(pack.windows) + " scanned=" + String(pack.windowsScanned || 0) + " automation=" + String(pack.automationMs || 0) + " active=" + String(pack.activeRootMs || 0) + " windowsQuery=" + String(pack.windowsQueryMs || 0) + " windowsScan=" + String(pack.windowsScanMs || 0) + " reason=" + th17LogSingleLine(pack.reason, 80) + " partial=" + String(pack.partialWindows === true) + " skipReason=" + th17LogSingleLine(pack.skipReason, 40) + " timeout=" + String(pack.timedOut === true));
''',
    "inspect metrics log",
)

needle = '''    result.require(
        group,
        "N8 stationary timeout retries preserve valid hover",
        "FloatBallAppWM.prototype.schedulePointerInspectRetry = function(pack)" in retry_scan
        and "pointer stationary inspect retry=" in retry_scan
        and '"drag_retry_" + String(retryNo)' in retry_scan
        and "allowStationary" in schedule_async
        and "allowStationary !== true" in schedule_async
        and "stationaryRetryScheduled = this.schedulePointerInspectRetry(pack) === true" in apply_retry
        and "keepCurrentOnDragTimeout" in apply_retry
        and "stationaryRetryScheduled === true" in apply_retry
        and "this.pointerRectInside(pack.x, pack.y, st.currentRect) === true" in apply_retry
        and "inspectRetryRunnable" in pointer_state,
        "timed-out drag scans must retry at the same hotspot without discarding a still-valid candidate",
    )
'''
addition = needle + '''    result.require(
        group,
        "window cap is partial but not drag timeout",
        "var fallbackPartial = false;" in snapshot_scan
        and 'fallbackSkipReason = "window_cap";' in snapshot_scan
        and "var budgetTimedOut =" in snapshot_scan
        and "var timedOut = budgetTimedOut || (isFinal && fallbackPartial);" in snapshot_scan
        and "partialWindows: fallbackPartial" in snapshot_scan
        and "skipReason: fallbackSkipReason" in snapshot_scan
        and "pack.partialWindows === true" in retry_scan
        and 'String(pack.skipReason || "") === "window_cap"' in retry_scan,
        "drag window caps must remain observable without being classified or retried as budget timeouts",
    )
'''
verify = replace_once(verify, needle, addition, "partial scan regression")

needle2 = '''    result.require(
        group,
        "text ready timing is independent from OCR",
        "areaHoldSince" not in ready,
        "text ready state is coupled to OCR timing",
    )
'''
addition2 = needle2 + '''    credential = section(
        pointer,
        "FloatBallAppWM.prototype.grantPointerTextHoverCredential = function",
        "FloatBallAppWM.prototype.hasPointerTextHoverCredential = function",
    )
    result.require(
        group,
        "dynamic credential key log stays on one line",
        "function th17LogSingleLine(value, maxLen)" in pointer
        and "th17LogSingleLine(key, 180)" in credential
        and '" key=" + key' not in credential,
        "hover credential logs must escape line separators instead of emitting raw candidate text",
    )
'''
verify = replace_once(verify, needle2, addition2, "single-line key log regression")

POINTER.write_text(pointer, encoding="utf-8")
VERIFY.write_text(verify, encoding="utf-8")
print("OK pointer partial scan and single-line log fix applied")
