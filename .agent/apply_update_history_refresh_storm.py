#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TH14_PATH = ROOT / "code" / "th_14_panels.js"
VERIFY_PATH = ROOT / "scripts" / "verify_update_version_page.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError("%s anchor count=%d" % (label, count))
    return text.replace(old, new, 1)


def main():
    text = TH14_PATH.read_text(encoding="utf-8")
    text = replace_once(text, "// @version 1.1.1", "// @version 1.1.2", "module version")
    text = replace_once(
        text,
        '  var HISTORY_META_NAME = "update_history.meta.json";\n',
        '  var HISTORY_META_NAME = "update_history.meta.json";\n  var HISTORY_RETRY_COOLDOWN_MS = 30000;\n  var UPDATE_SURFACE_REFRESH_DELAY_MS = 48;\n',
        "update constants",
    )
    text = replace_once(
        text,
        '    this.state.toolHubUpdateHistoryRequestKey = "";\n    this.state.toolHubUpdateHistoryGeneration = 0;\n',
        '    this.state.toolHubUpdateHistoryRequestKey = "";\n    this.state.toolHubUpdateHistoryGeneration = 0;\n    this.state.toolHubUpdateHistoryFailedAssetKey = "";\n    this.state.toolHubUpdateHistoryLastFailureAt = 0;\n    this.state.toolHubUpdateHistoryLastFailureError = "";\n    this.state.toolHubUpdateRefreshPending = false;\n',
        "update ui state",
    )
    old_refresh = '''  FloatBallAppWM.prototype.refreshToolHubUpdateSurface = function() {
    try {
      if (!this.state || !this.state.toolAppActive || !this.replaceToolAppPage) return;
      var route = textValue(this.state.toolAppRoute);
      if (route === UPDATE_ROUTE) this.replaceToolAppPage(UPDATE_ROUTE);
      else if (route === "settings") this.replaceToolAppPage("settings");
    } catch (e) { try { safeLog(this.L, "w", "refresh update surface fail: " + String(e)); } catch (eLog) {} }
  };
'''
    new_refresh = '''  FloatBallAppWM.prototype.refreshToolHubUpdateSurface = function(reason) {
    this.ensureToolHubUpdateUiState();
    try {
      if (!this.state || !this.state.toolAppActive || !this.replaceToolAppPage) return false;
      if (this.state.toolHubUpdateRefreshPending === true) return false;
      this.state.toolHubUpdateRefreshPending = true;
      var self = this;
      var task = new java.lang.Runnable({ run: function() {
        try {
          self.state.toolHubUpdateRefreshPending = false;
          if (!self.state.toolAppActive || !self.replaceToolAppPage) return;
          var route = textValue(self.state.toolAppRoute);
          if (route === UPDATE_ROUTE) self.replaceToolAppPage(UPDATE_ROUTE);
          else if (route === "settings") self.replaceToolAppPage("settings");
        } catch (eRun) {
          try { self.state.toolHubUpdateRefreshPending = false; } catch (eFlag) {}
          try { safeLog(self.L, "w", "refresh update surface fail reason=" + textValue(reason) + " error=" + String(eRun)); } catch (eLog) {}
        }
      }});
      var handler = new android.os.Handler(android.os.Looper.getMainLooper());
      handler.postDelayed(task, UPDATE_SURFACE_REFRESH_DELAY_MS);
      return true;
    } catch (e) {
      try { this.state.toolHubUpdateRefreshPending = false; } catch (eFlag2) {}
      try { safeLog(this.L, "w", "schedule update surface refresh fail reason=" + textValue(reason) + " error=" + String(e)); } catch (eLog2) {}
      return false;
    }
  };
'''
    text = replace_once(text, old_refresh, new_refresh, "coalesced update surface refresh")
    text = replace_once(
        text,
        '              if (textValue(self.state.toolAppRoute) === UPDATE_ROUTE) self.ensureToolHubUpdateHistoryLoaded(true);',
        '              if (textValue(self.state.toolAppRoute) === UPDATE_ROUTE) self.ensureToolHubUpdateHistoryLoaded(showToast === true);',
        "manual history force refresh only",
    )
    old_history = '''  FloatBallAppWM.prototype.ensureToolHubUpdateHistoryLoaded = function(forceRefresh) {
    this.ensureToolHubUpdateUiState();
    var self = this;
    if (!this.state.toolHubUpdateHistoryData) this.readToolHubUpdateHistoryCache();
    var asset = this.getToolHubUpdateHistoryAsset();
    if (!asset) return false;
    var assetKey = textValue(asset.sha256) + "@" + String(asset.version);
    if (!forceRefresh && this.state.toolHubUpdateHistoryAssetKey === asset.sha256 && this.state.toolHubUpdateHistoryData) return true;
    if (this.state.toolHubUpdateHistoryRequestKey === assetKey) return true;
    this.state.toolHubUpdateHistoryRequestKey = assetKey;
    this.state.toolHubUpdateHistoryGeneration = numberValue(this.state.toolHubUpdateHistoryGeneration) + 1;
    var generation = this.state.toolHubUpdateHistoryGeneration;
    if (!this.state.toolHubUpdateHistoryData) this.state.toolHubUpdateHistoryState = "loading";
    try {
      new java.lang.Thread(new java.lang.Runnable({ run: function() {
        var text = "";
        var error = "";
        var obj = null;
        try {
          if (typeof downloadText !== "function") throw "downloadText unavailable";
          text = downloadText(String(GIT_ROOT) + textValue(asset.name));
          if (numberValue(asset.size) > 0 && utf8Size(text) !== numberValue(asset.size)) throw "history size mismatch";
          if (sha256Text(text) !== textValue(asset.sha256).toLowerCase()) throw "history sha256 mismatch";
          obj = JSON.parse(String(text));
          if (!self.validateToolHubUpdateHistory(obj)) throw "history schema invalid";
          if (!self.writeToolHubUpdateHistoryCache(text, asset)) throw "history cache write failed";
        } catch (eLoad) { error = String(eLoad); obj = null; }
        try {
          self.runOnUiThreadSafe(function() {
            if (numberValue(self.state.toolHubUpdateHistoryGeneration) !== generation) return;
            self.state.toolHubUpdateHistoryRequestKey = "";
            if (obj) {
              self.state.toolHubUpdateHistoryData = obj;
              self.state.toolHubUpdateHistoryState = "ready";
              self.state.toolHubUpdateHistoryError = "";
              self.state.toolHubUpdateHistorySource = "remote";
              self.state.toolHubUpdateHistoryAssetKey = textValue(asset.sha256).toLowerCase();
            } else {
              self.state.toolHubUpdateHistoryState = self.state.toolHubUpdateHistoryData ? "ready" : "error";
              self.state.toolHubUpdateHistoryError = error;
              if (self.state.toolHubUpdateHistoryData) self.state.toolHubUpdateHistorySource = "cache";
            }
            self.refreshToolHubUpdateSurface();
          });
        } catch (eUi) {}
      }})).start();
      return true;
    } catch (eThread) {
      this.state.toolHubUpdateHistoryRequestKey = "";
      return false;
    }
  };
'''
    new_history = '''  FloatBallAppWM.prototype.ensureToolHubUpdateHistoryLoaded = function(forceRefresh) {
    this.ensureToolHubUpdateUiState();
    var self = this;
    if (!this.state.toolHubUpdateHistoryData) this.readToolHubUpdateHistoryCache();
    var asset = this.getToolHubUpdateHistoryAsset();
    if (!asset) return false;
    var assetKey = textValue(asset.sha256) + "@" + String(asset.version);
    var now = Number(java.lang.System.currentTimeMillis());
    if (this.state.toolHubUpdateHistoryFailedAssetKey && this.state.toolHubUpdateHistoryFailedAssetKey !== assetKey) {
      this.state.toolHubUpdateHistoryFailedAssetKey = "";
      this.state.toolHubUpdateHistoryLastFailureAt = 0;
      this.state.toolHubUpdateHistoryLastFailureError = "";
    }
    if (!forceRefresh && this.state.toolHubUpdateHistoryAssetKey === asset.sha256 && this.state.toolHubUpdateHistoryData) return true;
    if (!forceRefresh && this.state.toolHubUpdateHistoryFailedAssetKey === assetKey && now - numberValue(this.state.toolHubUpdateHistoryLastFailureAt) < HISTORY_RETRY_COOLDOWN_MS) {
      return false;
    }
    if (this.state.toolHubUpdateHistoryRequestKey === assetKey) return true;
    this.state.toolHubUpdateHistoryRequestKey = assetKey;
    this.state.toolHubUpdateHistoryGeneration = numberValue(this.state.toolHubUpdateHistoryGeneration) + 1;
    var generation = this.state.toolHubUpdateHistoryGeneration;
    if (!this.state.toolHubUpdateHistoryData) this.state.toolHubUpdateHistoryState = "loading";
    try { safeLog(this.L, "i", "update history fetch begin assetVersion=" + asset.version + " expectedSize=" + asset.size + " generation=" + generation + " force=" + String(forceRefresh === true)); } catch (eLogBegin) {}
    try {
      new java.lang.Thread(new java.lang.Runnable({ run: function() {
        var startedAt = Number(java.lang.System.currentTimeMillis());
        var text = "";
        var error = "";
        var obj = null;
        var actualSize = 0;
        try {
          if (typeof downloadText !== "function") throw "downloadText unavailable";
          text = downloadText(String(GIT_ROOT) + textValue(asset.name));
          actualSize = utf8Size(text);
          if (numberValue(asset.size) > 0 && actualSize !== numberValue(asset.size)) throw "history size mismatch";
          if (sha256Text(text) !== textValue(asset.sha256).toLowerCase()) throw "history sha256 mismatch";
          obj = JSON.parse(String(text));
          if (!self.validateToolHubUpdateHistory(obj)) throw "history schema invalid";
          if (!self.writeToolHubUpdateHistoryCache(text, asset)) throw "history cache write failed";
        } catch (eLoad) { error = String(eLoad); obj = null; }
        var costMs = Number(java.lang.System.currentTimeMillis()) - startedAt;
        try {
          if (obj) safeLog(self.L, "i", "update history fetch done assetVersion=" + asset.version + " actualSize=" + actualSize + " generation=" + generation + " costMs=" + costMs);
          else safeLog(self.L, "w", "update history fetch fail assetVersion=" + asset.version + " expectedSize=" + asset.size + " actualSize=" + actualSize + " generation=" + generation + " costMs=" + costMs + " error=" + error);
        } catch (eLogResult) {}
        try {
          self.runOnUiThreadSafe(function() {
            if (numberValue(self.state.toolHubUpdateHistoryGeneration) !== generation) return;
            self.state.toolHubUpdateHistoryRequestKey = "";
            if (obj) {
              self.state.toolHubUpdateHistoryData = obj;
              self.state.toolHubUpdateHistoryState = "ready";
              self.state.toolHubUpdateHistoryError = "";
              self.state.toolHubUpdateHistorySource = "remote";
              self.state.toolHubUpdateHistoryAssetKey = textValue(asset.sha256).toLowerCase();
              self.state.toolHubUpdateHistoryFailedAssetKey = "";
              self.state.toolHubUpdateHistoryLastFailureAt = 0;
              self.state.toolHubUpdateHistoryLastFailureError = "";
            } else {
              self.state.toolHubUpdateHistoryState = self.state.toolHubUpdateHistoryData ? "ready" : "error";
              self.state.toolHubUpdateHistoryError = error;
              self.state.toolHubUpdateHistoryFailedAssetKey = assetKey;
              self.state.toolHubUpdateHistoryLastFailureAt = Number(java.lang.System.currentTimeMillis());
              self.state.toolHubUpdateHistoryLastFailureError = error;
              if (self.state.toolHubUpdateHistoryData) self.state.toolHubUpdateHistorySource = "cache";
            }
            self.refreshToolHubUpdateSurface(obj ? "history_loaded" : "history_failed");
          });
        } catch (eUi) {}
      }})).start();
      return true;
    } catch (eThread) {
      this.state.toolHubUpdateHistoryRequestKey = "";
      this.state.toolHubUpdateHistoryState = this.state.toolHubUpdateHistoryData ? "ready" : "error";
      this.state.toolHubUpdateHistoryError = String(eThread);
      this.state.toolHubUpdateHistoryFailedAssetKey = assetKey;
      this.state.toolHubUpdateHistoryLastFailureAt = Number(java.lang.System.currentTimeMillis());
      this.state.toolHubUpdateHistoryLastFailureError = String(eThread);
      try { safeLog(this.L, "w", "update history thread start fail assetVersion=" + asset.version + " generation=" + generation + " error=" + String(eThread)); } catch (eLogThread) {}
      this.refreshToolHubUpdateSurface("history_thread_fail");
      return false;
    }
  };
'''
    text = replace_once(text, old_history, new_history, "history retry circuit breaker")
    TH14_PATH.write_text(text, encoding="utf-8")

    verify = VERIFY_PATH.read_text(encoding="utf-8")
    verify = replace_once(
        verify,
        '    "分页固定十条": "var HISTORY_PAGE_SIZE = 10" in TH14,\n',
        '    "分页固定十条": "var HISTORY_PAGE_SIZE = 10" in TH14,\n    "历史失败熔断存在": "var HISTORY_RETRY_COOLDOWN_MS = 30000" in TH14 and "toolHubUpdateHistoryFailedAssetKey" in TH14,\n    "自动检查不强制重复下载历史": "ensureToolHubUpdateHistoryLoaded(showToast === true)" in TH14,\n    "更新页面刷新合并存在": "toolHubUpdateRefreshPending" in TH14 and "UPDATE_SURFACE_REFRESH_DELAY_MS = 48" in TH14,\n    "历史加载诊断日志存在": "update history fetch begin" in TH14 and "update history fetch fail" in TH14 and "update history fetch done" in TH14,\n',
        "verification markers",
    )
    VERIFY_PATH.write_text(verify, encoding="utf-8")

    workflow = ROOT / ".github" / "workflows" / "agent-apply-update-history-refresh-storm.yml"
    if workflow.exists():
        workflow.unlink()
    agent = ROOT / ".agent"
    script = agent / "apply_update_history_refresh_storm.py"
    if script.exists():
        script.unlink()
    if agent.exists() and not any(agent.iterdir()):
        agent.rmdir()


if __name__ == "__main__":
    main()
