#!/usr/bin/env python3
"""Apply channel-switch observability changes once, then remove the temporary hook."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TH14 = ROOT / "code" / "th_14_panels.js"
VERIFY = ROOT / "scripts" / "verify_update_version_page.py"
WORKFLOW = ROOT / ".github" / "workflows" / "sign-toolhub.yml"
SELF = Path(__file__).resolve()

HOOK_BEGIN = "      # CHANNEL_SWITCH_OBSERVABILITY_HOOK_BEGIN\n"
HOOK_END = "      # CHANNEL_SWITCH_OBSERVABILITY_HOOK_END\n"


def replace_once(path, old, new, label):
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s replacement count=%d" % (label, count))
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(TH14, "// @version 1.1.14\n", "// @version 1.1.15\n", "th14 version")

replace_once(
    TH14,
    '''        base.channelCheckAvailableCount = numberValue(raw.channelCheckAvailableCount);
        base.channelCheckAt = numberValue(raw.channelCheckAt);''',
    '''        base.channelCheckAvailableCount = numberValue(raw.channelCheckAvailableCount);
        base.channelCheckStartedAt = numberValue(raw.channelCheckStartedAt);
        base.channelCheckDurationMs = numberValue(raw.channelCheckDurationMs);
        base.channelCheckAt = numberValue(raw.channelCheckAt);''',
    "extended channel timing state",
)

replace_once(
    TH14,
    '    var snapshot = { status: "error", count: 0, message: "", channel: "stable", at: 0 };\n',
    '    var snapshot = { status: "error", count: 0, message: "", channel: "stable", at: 0, durationMs: 0 };\n',
    "channel snapshot timing",
)

replace_once(
    TH14,
    '''      var checkedAt = numberValue(java.lang.System.currentTimeMillis());
      if (raw) {''',
    '''      var checkedAt = numberValue(java.lang.System.currentTimeMillis());
      var startedAt = raw ? numberValue(raw.channelCheckStartedAt) : 0;
      var durationMs = startedAt > 0 ? Math.max(0, checkedAt - startedAt) : 0;
      if (raw) {''',
    "channel result duration",
)

replace_once(
    TH14,
    '''        raw.channelCheckAvailableCount = count;
        raw.channelCheckAt = checkedAt;''',
    '''        raw.channelCheckAvailableCount = count;
        raw.channelCheckDurationMs = durationMs;
        raw.channelCheckAt = checkedAt;''',
    "persist channel duration",
)

replace_once(
    TH14,
    '''      snapshot.channel = activeChannel;
      snapshot.at = checkedAt;''',
    '''      snapshot.channel = activeChannel;
      snapshot.at = checkedAt;
      snapshot.durationMs = durationMs;''',
    "snapshot duration",
)

old_channel_number = '''  function channelNumber(value) {
    var n = Number(value || 0);
    return isNaN(n) ? 0 : n;
  }

  function setToolHubChannelCheckPending14(target, status, message) {'''
new_channel_number = '''  function channelNumber(value) {
    var n = Number(value || 0);
    return isNaN(n) ? 0 : n;
  }

  function channelLogValue14(value) {
    var text = channelText(value).replace(/[\\r\\n\\t]+/g, " ").replace(/\\s+/g, " ");
    return text.length > 240 ? text.substring(0, 240) : text;
  }

  function logToolHubChannelEvent14(owner, eventName, fields) {
    try {
      var line = "TH_CHANNEL event=" + channelLogValue14(eventName || "UNKNOWN");
      var keys = ["origin", "target", "active", "status", "count", "durationMs", "message", "error"];
      var data = fields || {};
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (data[key] === undefined || data[key] === null || channelText(data[key]) === "") continue;
        line += " " + key + "=" + channelLogValue14(data[key]);
      }
      safeLog(owner && owner.L, "i", line);
    } catch (eLog) {}
  }

  function setToolHubChannelCheckPending14(target, status, message) {'''
replace_once(TH14, old_channel_number, new_channel_number, "channel structured log helper")

replace_once(
    TH14,
    '''      TOOLHUB_UPDATE_STATE.channelCheckAvailableCount = 0;
      TOOLHUB_UPDATE_STATE.channelCheckAt = channelNumber(java.lang.System.currentTimeMillis());''',
    '''      var now = channelNumber(java.lang.System.currentTimeMillis());
      TOOLHUB_UPDATE_STATE.channelCheckAvailableCount = 0;
      if (channelText(status) === "waiting" || channelNumber(TOOLHUB_UPDATE_STATE.channelCheckStartedAt) <= 0) {
        TOOLHUB_UPDATE_STATE.channelCheckStartedAt = now;
      }
      TOOLHUB_UPDATE_STATE.channelCheckDurationMs = 0;
      TOOLHUB_UPDATE_STATE.channelCheckAt = now;''',
    "pending timing state",
)

replace_once(
    TH14,
    '''    var normalized = "stable";
    try { normalized = normalizeToolHubUpdateChannel(target); } catch (eTarget) {}
    setToolHubChannelCheckPending14(normalized, "waiting", "等待目标通道完成启动");''',
    '''    var normalized = "stable";
    try { normalized = normalizeToolHubUpdateChannel(target); } catch (eTarget) {}
    var scheduledAt = channelNumber(java.lang.System.currentTimeMillis());
    setToolHubChannelCheckPending14(normalized, "waiting", "等待目标通道完成启动");
    logToolHubChannelEvent14(owner, "POST_SWITCH_CHECK_SCHEDULED", { origin: "switch", target: normalized, active: TOOLHUB_UPDATE_CHANNEL, status: "waiting" });''',
    "scheduled log",
)

replace_once(
    TH14,
    '        var deadline = channelNumber(java.lang.System.currentTimeMillis()) + 20000;\n',
    '        var deadline = scheduledAt + 20000;\n',
    "shared schedule deadline",
)

replace_once(
    TH14,
    '''          if (active !== normalized) {
            setToolHubChannelCheckPending14(normalized, "error", "目标通道未保持活动，可能已自动回退");
            return;
          }''',
    '''          if (active !== normalized) {
            setToolHubChannelCheckPending14(normalized, "error", "目标通道未保持活动，可能已自动回退");
            logToolHubChannelEvent14(owner, "POST_SWITCH_CHECK_ABORTED", { origin: "switch", target: normalized, active: active, status: "rollback_detected", durationMs: channelNumber(java.lang.System.currentTimeMillis()) - scheduledAt });
            return;
          }''',
    "rollback detection log",
)

replace_once(
    TH14,
    '''          setToolHubChannelCheckPending14(normalized, "checking", "正在检查目标通道更新");
          try {''',
    '''          setToolHubChannelCheckPending14(normalized, "checking", "正在检查目标通道更新");
          logToolHubChannelEvent14(activeApp, "POST_SWITCH_CHECK_BEGIN", { origin: "switch", target: normalized, active: active, status: "checking" });
          try {''',
    "post switch check begin log",
)

replace_once(
    TH14,
    '''          var spec = null;
          try { spec = getToolHubChannelSpec(normalized); } catch (eSpec) {}''',
    '''          logToolHubChannelEvent14(activeApp, "POST_SWITCH_CHECK_DONE", { origin: "switch", target: normalized, active: active, status: snapshot.status, count: snapshot.count, durationMs: snapshot.durationMs, message: snapshot.message });
          var spec = null;
          try { spec = getToolHubChannelSpec(normalized); } catch (eSpec) {}''',
    "post switch check done log",
)

replace_once(
    TH14,
    '''        } catch (eMonitor) {
          setToolHubChannelCheckPending14(normalized, "error", "切换后自动检查异常：" + String(eMonitor));
          try { showToolHubChannelSwitchToast("通道已切换，但自动检查异常"); } catch (eToastFail) {}''',
    '''        } catch (eMonitor) {
          setToolHubChannelCheckPending14(normalized, "error", "切换后自动检查异常：" + String(eMonitor));
          logToolHubChannelEvent14(owner, "POST_SWITCH_CHECK_FAILED", { origin: "switch", target: normalized, active: TOOLHUB_UPDATE_CHANNEL, status: "error", durationMs: channelNumber(java.lang.System.currentTimeMillis()) - scheduledAt, error: String(eMonitor) });
          try { showToolHubChannelSwitchToast("通道已切换，但自动检查异常"); } catch (eToastFail) {}''',
    "monitor failure log",
)

replace_once(
    TH14,
    '''    } catch (eThread) {
      setToolHubChannelCheckPending14(normalized, "error", "无法启动切换后检查线程");
      return false;''',
    '''    } catch (eThread) {
      setToolHubChannelCheckPending14(normalized, "error", "无法启动切换后检查线程");
      logToolHubChannelEvent14(owner, "POST_SWITCH_CHECK_THREAD_FAILED", { origin: "switch", target: normalized, active: TOOLHUB_UPDATE_CHANNEL, status: "error", error: String(eThread) });
      return false;''',
    "thread failure log",
)

replace_once(
    TH14,
    '''          if (self.recordToolHubChannelCheckResult) self.recordToolHubChannelCheckResult(ret, checkOrigin, checkChannel);
        } catch (eRecord) {}''',
    '''          var recorded = self.recordToolHubChannelCheckResult ? self.recordToolHubChannelCheckResult(ret, checkOrigin, checkChannel) : null;
          if (checkOrigin === "manual" && recorded) logToolHubChannelEvent14(self, "MANUAL_CHECK_DONE", { origin: "manual", target: checkChannel, active: checkChannel, status: recorded.status, count: recorded.count, durationMs: recorded.durationMs, message: recorded.message });
        } catch (eRecord) {}''',
    "manual check log",
)

replace_once(
    TH14,
    '''        else if (checkStatus === "error") { checkLine = "切换后自动检查失败，请点击下方“重新检查”"; checkColor = T.danger || T.primary; }
        if (checkLine) addText(channelCardRoot, checkLine, 11, checkColor, checkStatus === "available" || checkStatus === "error").setPadding(0, this.dp(5), 0, 0);''',
    '''        else if (checkStatus === "error") { checkLine = "切换后自动检查失败，请点击下方“重新检查”"; checkColor = T.danger || T.primary; }
        var checkDuration = rawCheck ? channelNumber(rawCheck.channelCheckDurationMs) : 0;
        if (checkLine && checkDuration > 0 && checkStatus !== "waiting" && checkStatus !== "checking") checkLine += " · " + checkDuration + "ms";
        if (checkLine) addText(channelCardRoot, checkLine, 11, checkColor, checkStatus === "available" || checkStatus === "error").setPadding(0, this.dp(5), 0, 0);''',
    "duration display",
)

replace_once(
    TH14,
    '''        try { ret = switchToolHubUpdateChannel(confirmTarget); }
        catch (eSwitch) { ret = { ok: false, msg: "切换失败：" + String(eSwitch) }; }
        if (ret && ret.ok === true && ret.unchanged !== true) scheduleToolHubPostChannelSwitchCheck14(self, confirmTarget);''',
    '''        try { ret = switchToolHubUpdateChannel(confirmTarget); }
        catch (eSwitch) { ret = { ok: false, msg: "切换失败：" + String(eSwitch) }; }
        logToolHubChannelEvent14(self, ret && ret.ok === true ? "SWITCH_UI_ACCEPTED" : "SWITCH_UI_REJECTED", { origin: "settings", target: confirmTarget, active: TOOLHUB_UPDATE_CHANNEL, status: ret && ret.ok === true ? "accepted" : "rejected", message: ret && ret.msg ? ret.msg : "" });
        if (ret && ret.ok === true && ret.unchanged !== true) scheduleToolHubPostChannelSwitchCheck14(self, confirmTarget);''',
    "switch UI result log",
)

verify_text = VERIFY.read_text(encoding="utf-8")
marker = '    "通道检查结果展示与提醒": "切换后自动检查：正在获取当前通道更新" in TH14 and "切换后发现 " in TH14 and "自动检查失败" in TH14,\n'
addition = marker + '''    "通道切换结构化日志存在": all(marker in TH14 for marker in ["TH_CHANNEL event=", "POST_SWITCH_CHECK_SCHEDULED", "POST_SWITCH_CHECK_BEGIN", "POST_SWITCH_CHECK_DONE", "POST_SWITCH_CHECK_ABORTED", "POST_SWITCH_CHECK_FAILED", "POST_SWITCH_CHECK_THREAD_FAILED", "SWITCH_UI_ACCEPTED", "SWITCH_UI_REJECTED"]),
    "通道检查记录耗时": all(marker in TH14 for marker in ["channelCheckStartedAt", "channelCheckDurationMs", "durationMs: snapshot.durationMs", "checkDuration + \\\"ms\\\""]),
'''
if verify_text.count(marker) != 1:
    raise SystemExit("verify marker replacement count=%d" % verify_text.count(marker))
VERIFY.write_text(verify_text.replace(marker, addition, 1), encoding="utf-8")

workflow_text = WORKFLOW.read_text(encoding="utf-8")
start = workflow_text.find(HOOK_BEGIN)
end = workflow_text.find(HOOK_END)
if start < 0 or end < 0 or end < start:
    raise SystemExit("temporary workflow hook markers missing")
end += len(HOOK_END)
WORKFLOW.write_text(workflow_text[:start] + workflow_text[end:], encoding="utf-8")
SELF.unlink()

print("OK channel switch observability patch applied")
