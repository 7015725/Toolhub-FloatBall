#!/usr/bin/env python3
"""Apply the channel-switch update discovery fix once, then remove temporary hooks."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path, old, new, label):
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s replacement count=%d" % (label, count))
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


th14 = ROOT / "code/th_14_panels.js"
replace_once(th14, "// @version 1.1.13\n", "// @version 1.1.14\n", "th14 version")

old_extended = '''        base.entryManualUpdate = raw.entryManualUpdate !== false;
        base.entryMessage = textValue(raw.entryMessage);
      }
    } catch (eRaw) {}
    return base;
  };

  FloatBallAppWM.prototype.hasToolHubUpdateAttention = function() {'''
new_extended = '''        base.entryManualUpdate = raw.entryManualUpdate !== false;
        base.entryMessage = textValue(raw.entryMessage);
        base.channelCheckStatus = textValue(raw.channelCheckStatus);
        base.channelCheckMessage = textValue(raw.channelCheckMessage);
        base.channelCheckChannel = textValue(raw.channelCheckChannel);
        base.channelCheckOrigin = textValue(raw.channelCheckOrigin);
        base.channelCheckAvailableCount = numberValue(raw.channelCheckAvailableCount);
        base.channelCheckAt = numberValue(raw.channelCheckAt);
      }
    } catch (eRaw) {}
    return base;
  };

  FloatBallAppWM.prototype.recordToolHubChannelCheckResult = function(ret, origin, channel) {
    var snapshot = { status: "error", count: 0, message: "", channel: "stable", at: 0 };
    try {
      var raw = (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) ? TOOLHUB_UPDATE_STATE : null;
      var count = numberValue(ret && ret.count);
      var running = !!(ret && ret.running === true);
      var ok = !!ret && ret.ok !== false && !running;
      var entryAvailable = !!(raw && raw.entryUpdateAvailable === true);
      var status = running ? "checking" : (!ok ? "error" : ((count > 0 || entryAvailable) ? "available" : "latest"));
      var activeChannel = "stable";
      try { activeChannel = normalizeToolHubUpdateChannel(channel || TOOLHUB_UPDATE_CHANNEL); } catch (eChannel) {}
      var message = textValue(ret && (ret.msg || ret.error));
      if (!message) {
        if (status === "checking") message = "更新检查正在进行";
        else if (status === "available") message = count > 0 ? ("发现 " + count + " 个可更新子模块") : "入口文件需要更新";
        else if (status === "latest") message = "当前通道已是最新";
        else message = "自动检查失败";
      }
      var checkedAt = numberValue(java.lang.System.currentTimeMillis());
      if (raw) {
        raw.channelCheckStatus = status;
        raw.channelCheckMessage = message;
        raw.channelCheckChannel = activeChannel;
        raw.channelCheckOrigin = textValue(origin || "manual") || "manual";
        raw.channelCheckAvailableCount = count;
        raw.channelCheckAt = checkedAt;
      }
      snapshot.status = status;
      snapshot.count = count;
      snapshot.message = message;
      snapshot.channel = activeChannel;
      snapshot.at = checkedAt;
    } catch (eRecord) {
      snapshot.message = String(eRecord);
    }
    return snapshot;
  };

  FloatBallAppWM.prototype.hasToolHubUpdateAttention = function() {'''
replace_once(th14, old_extended, new_extended, "extended update state")

replace_once(
    th14,
    '    var live = numberValue(st.availableCount) > 0 || st.entryUpdateAvailable === true || st.needRestart === true;\n',
    '    var channelCheckStatus = textValue(st.channelCheckStatus);\n    var live = numberValue(st.availableCount) > 0 || st.entryUpdateAvailable === true || st.needRestart === true || channelCheckStatus === "available" || channelCheckStatus === "error";\n',
    "update attention",
)

old_summary = '''    var status = textValue(st.status);
    var count = numberValue(st.availableCount);
    if (status === "checking") return "正在检查最新版本";'''
new_summary = '''    var status = textValue(st.status);
    var count = numberValue(st.availableCount);
    var channelCheckStatus = textValue(st.channelCheckStatus);
    if (channelCheckStatus === "waiting" || channelCheckStatus === "checking") return "已切换通道，正在自动检查更新";
    if (channelCheckStatus === "available" && numberValue(st.channelCheckAvailableCount) > 0) return "切换后发现 " + numberValue(st.channelCheckAvailableCount) + " 个模块可更新";
    if (channelCheckStatus === "available" && st.entryUpdateAvailable === true) return "切换后发现入口文件更新";
    if (channelCheckStatus === "error") return "已切换通道，自动检查失败";
    if (status === "checking") return "正在检查最新版本";'''
replace_once(th14, old_summary, new_summary, "home summary")

old_run_check = '''        try { ret = checkToolHubModuleUpdatesNow(); }
        catch (eRun) { ret = { ok: false, error: String(eRun), msg: "检查失败：" + String(eRun) }; }
        try { self.state.toolHubSettingsCheckRunning = false; } catch (eFlag) {}'''
new_run_check = '''        try { ret = checkToolHubModuleUpdatesNow(); }
        catch (eRun) { ret = { ok: false, error: String(eRun), msg: "检查失败：" + String(eRun) }; }
        try {
          var checkOrigin = "manual";
          var checkChannel = "stable";
          try { checkChannel = normalizeToolHubUpdateChannel(TOOLHUB_UPDATE_CHANNEL); } catch (eChannel) {}
          try {
            if (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE &&
                textValue(TOOLHUB_UPDATE_STATE.channelCheckOrigin) === "switch" &&
                textValue(TOOLHUB_UPDATE_STATE.channelCheckChannel) === checkChannel) checkOrigin = "switch";
          } catch (eOrigin) {}
          if (self.recordToolHubChannelCheckResult) self.recordToolHubChannelCheckResult(ret, checkOrigin, checkChannel);
        } catch (eRecord) {}
        try { self.state.toolHubSettingsCheckRunning = false; } catch (eFlag) {}'''
replace_once(th14, old_run_check, new_run_check, "manual check record")

old_channel_text = '''  function channelText(value) {
    try { return String(value === undefined || value === null ? "" : value); } catch (e) { return ""; }
  }

  FloatBallAppWM.prototype.getToolHubUpdateChannelUiState = function() {'''
new_channel_text = '''  function channelText(value) {
    try { return String(value === undefined || value === null ? "" : value); } catch (e) { return ""; }
  }

  function channelNumber(value) {
    var n = Number(value || 0);
    return isNaN(n) ? 0 : n;
  }

  function setToolHubChannelCheckPending14(target, status, message) {
    try {
      if (typeof TOOLHUB_UPDATE_STATE !== "object" || !TOOLHUB_UPDATE_STATE) return;
      TOOLHUB_UPDATE_STATE.channelCheckStatus = channelText(status || "waiting");
      TOOLHUB_UPDATE_STATE.channelCheckMessage = channelText(message || "");
      TOOLHUB_UPDATE_STATE.channelCheckChannel = normalizeToolHubUpdateChannel(target);
      TOOLHUB_UPDATE_STATE.channelCheckOrigin = "switch";
      TOOLHUB_UPDATE_STATE.channelCheckAvailableCount = 0;
      TOOLHUB_UPDATE_STATE.channelCheckAt = channelNumber(java.lang.System.currentTimeMillis());
    } catch (eState) {}
  }

  function scheduleToolHubPostChannelSwitchCheck14(owner, target) {
    var normalized = "stable";
    try { normalized = normalizeToolHubUpdateChannel(target); } catch (eTarget) {}
    setToolHubChannelCheckPending14(normalized, "waiting", "等待目标通道完成启动");
    try {
      new java.lang.Thread(new java.lang.Runnable({ run: function() {
        var deadline = channelNumber(java.lang.System.currentTimeMillis()) + 20000;
        try {
          while (channelNumber(java.lang.System.currentTimeMillis()) < deadline) {
            var switching = false;
            try { switching = (__toolHubChannelSwitchRunning === true || __toolHubRestartRunning === true); } catch (eSwitching) { switching = false; }
            if (!switching) break;
            java.lang.Thread.sleep(250);
          }
          var active = "stable";
          try { active = normalizeToolHubUpdateChannel(TOOLHUB_UPDATE_CHANNEL); } catch (eActive) {}
          if (active !== normalized) {
            setToolHubChannelCheckPending14(normalized, "error", "目标通道未保持活动，可能已自动回退");
            return;
          }
          while (channelNumber(java.lang.System.currentTimeMillis()) < deadline) {
            var checking = false;
            try { checking = __runtimeUpdateCheckRunning === true; } catch (eChecking) { checking = false; }
            if (!checking) break;
            java.lang.Thread.sleep(250);
          }
          java.lang.Thread.sleep(600);
          var activeApp = null;
          try { activeApp = TOOLHUB_ACTIVE_APP; } catch (eApp) { activeApp = null; }
          if (!activeApp) activeApp = owner;
          setToolHubChannelCheckPending14(normalized, "checking", "正在检查目标通道更新");
          try {
            if (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) {
              TOOLHUB_UPDATE_STATE.status = "checking";
              TOOLHUB_UPDATE_STATE.error = "";
            }
          } catch (eRaw) {}
          var ret = null;
          try {
            if (typeof checkToolHubModuleUpdatesNow !== "function") throw "检查模块未加载";
            ret = checkToolHubModuleUpdatesNow();
            if (ret && ret.running === true) {
              java.lang.Thread.sleep(500);
              ret = checkToolHubModuleUpdatesNow();
            }
          } catch (eCheck) {
            ret = { ok: false, error: String(eCheck), msg: "检查失败：" + String(eCheck) };
          }
          var snapshot = activeApp && activeApp.recordToolHubChannelCheckResult
            ? activeApp.recordToolHubChannelCheckResult(ret, "switch", normalized)
            : { status: (ret && ret.ok !== false) ? (channelNumber(ret.count) > 0 ? "available" : "latest") : "error", count: channelNumber(ret && ret.count) };
          var spec = null;
          try { spec = getToolHubChannelSpec(normalized); } catch (eSpec) {}
          var label = spec ? channelText(spec.label) : normalized;
          var toastText = "";
          if (snapshot.status === "available") toastText = snapshot.count > 0 ? ("已切换到" + label + "，发现 " + snapshot.count + " 个更新") : ("已切换到" + label + "，入口文件需要更新");
          else if (snapshot.status === "latest") toastText = "已切换到" + label + "，当前已是最新";
          else toastText = "已切换到" + label + "，但自动检查失败";
          try { showToolHubChannelSwitchToast(toastText); } catch (eToast) {}
          try {
            if (activeApp && activeApp.runOnUiThreadSafe) activeApp.runOnUiThreadSafe(function() {
              try { if (activeApp.refreshToolHubUpdateSurface) activeApp.refreshToolHubUpdateSurface("channel_post_check"); } catch (eRefresh) {}
            });
          } catch (eUi) {}
        } catch (eMonitor) {
          setToolHubChannelCheckPending14(normalized, "error", "切换后自动检查异常：" + String(eMonitor));
          try { showToolHubChannelSwitchToast("通道已切换，但自动检查异常"); } catch (eToastFail) {}
        }
      }})).start();
      return true;
    } catch (eThread) {
      setToolHubChannelCheckPending14(normalized, "error", "无法启动切换后检查线程");
      return false;
    }
  }

  FloatBallAppWM.prototype.getToolHubUpdateChannelUiState = function() {'''
replace_once(th14, old_channel_text, new_channel_text, "channel monitor helper")

old_current_line = '    addText(channelCardRoot, "当前运行：" + current.label + "  ·  GitHub/" + current.branch, 11, T.onSurface2, false).setPadding(0, this.dp(8), 0, 0);\n\n    if (current.switching) {'
new_current_line = '''    addText(channelCardRoot, "当前运行：" + current.label + "  ·  GitHub/" + current.branch, 11, T.onSurface2, false).setPadding(0, this.dp(8), 0, 0);
    try {
      var rawCheck = (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) ? TOOLHUB_UPDATE_STATE : null;
      var checkStatus = rawCheck ? channelText(rawCheck.channelCheckStatus) : "";
      var checkChannel = rawCheck ? channelText(rawCheck.channelCheckChannel) : "";
      var checkOrigin = rawCheck ? channelText(rawCheck.channelCheckOrigin) : "";
      if (checkOrigin === "switch" && checkChannel === current.channel && checkStatus) {
        var checkLine = "";
        var checkColor = T.onSurface2;
        if (checkStatus === "waiting" || checkStatus === "checking") { checkLine = "切换后自动检查：正在获取当前通道更新"; checkColor = T.primary; }
        else if (checkStatus === "available") { checkLine = "切换后自动检查：发现 " + channelNumber(rawCheck.channelCheckAvailableCount) + " 个更新，请在下方安装"; checkColor = T.primary; }
        else if (checkStatus === "latest") checkLine = "切换后自动检查：当前通道已是最新";
        else if (checkStatus === "error") { checkLine = "切换后自动检查失败，请点击下方“重新检查”"; checkColor = T.danger || T.primary; }
        if (checkLine) addText(channelCardRoot, checkLine, 11, checkColor, checkStatus === "available" || checkStatus === "error").setPadding(0, this.dp(5), 0, 0);
      }
    } catch (eCheckLine) {}

    if (current.switching) {'''
replace_once(th14, old_current_line, new_current_line, "channel card check status")

old_confirm = '''        try { ret = switchToolHubUpdateChannel(confirmTarget); }
        catch (eSwitch) { ret = { ok: false, msg: "切换失败：" + String(eSwitch) }; }
        try { self.toast(ret && ret.msg ? ret.msg : "正在切换更新通道"); } catch (eToast2) {}
        self.refreshToolHubUpdateSurface("channel_switch_start");'''
new_confirm = '''        try { ret = switchToolHubUpdateChannel(confirmTarget); }
        catch (eSwitch) { ret = { ok: false, msg: "切换失败：" + String(eSwitch) }; }
        if (ret && ret.ok === true && ret.unchanged !== true) scheduleToolHubPostChannelSwitchCheck14(self, confirmTarget);
        try { self.toast(ret && ret.msg ? ret.msg : "正在切换更新通道"); } catch (eToast2) {}
        self.refreshToolHubUpdateSurface("channel_switch_start");'''
replace_once(th14, old_confirm, new_confirm, "channel confirmation monitor")

verifier = ROOT / "scripts/verify_update_version_page.py"
old_checks = '''    "自动检查不强制重复下载历史": "ensureToolHubUpdateHistoryLoaded(showToast === true)" in TH14,
    "更新页面刷新合并存在": "toolHubUpdateRefreshPending" in TH14 and "UPDATE_SURFACE_REFRESH_DELAY_MS = 48" in TH14,'''
new_checks = '''    "自动检查不强制重复下载历史": "ensureToolHubUpdateHistoryLoaded(showToast === true)" in TH14,
    "通道切换后自动检查": "scheduleToolHubPostChannelSwitchCheck14" in TH14 and "checkToolHubModuleUpdatesNow()" in TH14 and "__toolHubChannelSwitchRunning === true" in TH14,
    "通道检查状态进入更新模型": all(marker in TH14 for marker in ["channelCheckStatus", "channelCheckMessage", "channelCheckAvailableCount", "recordToolHubChannelCheckResult"]),
    "通道检查结果展示与提醒": "切换后自动检查：正在获取当前通道更新" in TH14 and "切换后发现 " in TH14 and "自动检查失败" in TH14,
    "确认切换启动检查监视": "scheduleToolHubPostChannelSwitchCheck14(self, confirmTarget)" in TH14,
    "更新页面刷新合并存在": "toolHubUpdateRefreshPending" in TH14 and "UPDATE_SURFACE_REFRESH_DELAY_MS = 48" in TH14,'''
replace_once(verifier, old_checks, new_checks, "update page verifier")

verify_yml = ROOT / ".github/workflows/verify.yml"
replace_once(
    verify_yml,
    "            python3 scripts/verify_module_versions.py\n            python3 scripts/verify_changed_module_versions.py\n",
    "            python3 scripts/verify_module_versions.py\n            python3 scripts/verify_update_version_page.py\n            python3 scripts/verify_changed_module_versions.py\n",
    "verify workflow update page",
)

record_path = ROOT / "updates/records/20260721-channel-switch-update-discovery.json"
record = {
    "schema": 1,
    "id": "20260721-channel-switch-update-discovery",
    "type": "fix",
    "title": "增强通道切换后的更新发现提示",
    "details": [
        "切换 Stable/Beta 完成后自动等待新通道启动并执行无缓存更新检查",
        "自动检查结果同步到更新页、设置首页摘要和红点，避免切换后误显示为最新",
        "检查失败或发现更新时给出明确提示，手动重新检查可刷新同一状态"
    ],
    "manifestVersion": 0
}
record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

for rel in (
    "scripts/apply_channel_switch_update_discovery_once.py",
    ".github/workflows/apply-channel-switch-update-discovery.yml",
):
    path = ROOT / rel
    if path.exists():
        path.unlink()

print("Applied channel switch update discovery fix")
