// ToolHub Beta ShortXUI phase-2 guard helpers. Rhino ES5.
(function (global) {
  var phase = global.ToolHubBetaPhase2 || {};
  phase.VERSION = "0.3.0-beta-wrapper";
  phase.STRESS_CYCLES = 100;

  phase.capability = function () {
    var sx = null;
    try { if (typeof ShortXUI !== "undefined") sx = ShortXUI; } catch (e) { sx = null; }
    return {
      ok: !!(sx && sx.WindowHost && typeof sx.WindowHost.create === "function" && sx.Dispatcher && typeof sx.Dispatcher.fromHandler === "function"),
      runtimeInstalled: !!sx,
      runtimeVersion: sx ? String(sx.VERSION || "") : "",
      hasDispatcher: !!(sx && sx.Dispatcher && typeof sx.Dispatcher.fromHandler === "function"),
      hasWindowHost: !!(sx && sx.WindowHost && typeof sx.WindowHost.create === "function"),
      wrapperVersion: phase.VERSION
    };
  };

  phase.persist = function (app) {
    var out = null;
    var temp = null;
    try {
      var root = "";
      try { if (typeof getToolHubRootDir === "function") root = String(getToolHubRootDir() || ""); } catch (e0) {}
      try { if (!root && typeof APP_ROOT_DIR !== "undefined") root = String(APP_ROOT_DIR || ""); } catch (e1) {}
      if (!root) return false;
      var target = new java.io.File(root + "/diagnostics/shortx-ui/latest.json");
      var parent = target.getParentFile();
      if (parent && !parent.exists() && !parent.mkdirs() && !parent.exists()) throw "mkdirs failed";
      temp = new java.io.File(target.getAbsolutePath() + ".tmp");
      var state = app && app.state ? app.state : {};
      var value = {
        schema: 3,
        runtimeVersion: phase.capability().runtimeVersion,
        wrapperVersion: phase.VERSION,
        ok: !(state.shortXUiLabLastResult && state.shortXUiLabLastResult.ok === false) &&
          !(state.shortXUiLabLastDispatcherResult && state.shortXUiLabLastDispatcherResult.ok === false) &&
          !(state.shortXUiLabLastWindowResult && state.shortXUiLabLastWindowResult.ok === false) &&
          !(state.shortXUiLabLastWindowStressResult && state.shortXUiLabLastWindowStressResult.ok === false),
        savedAt: Number(java.lang.System.currentTimeMillis()),
        capability: phase.capability(),
        basic: state.shortXUiLabLastResult || null,
        dispatcher: state.shortXUiLabLastDispatcherResult || null,
        windowHost: state.shortXUiLabLastWindowResult || null,
        windowStress: state.shortXUiLabLastWindowStressResult || null
      };
      out = new java.io.OutputStreamWriter(new java.io.FileOutputStream(temp, false), "UTF-8");
      out.write(JSON.stringify(value, null, 2) + "\n");
      out.flush();
      out.close();
      out = null;
      if (target.exists() && !target.delete()) throw "replace old result failed";
      if (!temp.renameTo(target)) throw "publish result failed";
      return true;
    } catch (e2) {
      try { safeLog(app && app.L, "w", "ShortXUI phase2 diagnostics save failed: " + String(e2)); } catch (e3) {}
      return false;
    } finally {
      try { if (out) out.close(); } catch (e4) {}
      try { if (temp && temp.exists()) temp.delete(); } catch (e5) {}
    }
  };

  phase.mismatch = function (app, target) {
    var cap = phase.capability();
    var result = {
      ok: false,
      code: "RUNTIME_MISMATCH",
      state: "UNAVAILABLE",
      target: String(target || "windowhost"),
      capability: cap,
      message: "ShortXUI Runtime/Lab 版本不一致，请完整停止并重新运行 ToolHub Beta"
    };
    try {
      if (!app.state) app.state = {};
      if (String(target || "") === "stress") app.state.shortXUiLabLastWindowStressResult = result;
      else app.state.shortXUiLabLastWindowResult = result;
      phase.persist(app);
      safeLog(app.L, "e", "ShortXUI runtime mismatch " + JSON.stringify(cap));
    } catch (e) {}
    return result;
  };

  phase.patchTextTree = function (view, capability) {
    if (!view) return;
    try {
      if (view instanceof android.widget.TextView) {
        var text = String(view.getText ? view.getText() : "");
        if (text === "运行 10 次循环") view.setText("运行 100 次循环");
        if (text.indexOf("未启用：WindowHost / IME / Gesture / Canvas / DEX Bridge") >= 0) {
          view.setText(text.replace(
            "已启用：Core / Dispatcher / Scope / Color / Metrics / Display / Shape / Diagnostics\n未启用：WindowHost / IME / Gesture / Canvas / DEX Bridge",
            "已启用：Core / Dispatcher / Scope / Color / Metrics / Display / Shape / Diagnostics / WindowHost\n未启用：IME / Gesture / Canvas / DEX Bridge"
          ));
        }
        if (!capability.ok && (text === "打开实验窗口" || text === "运行 10 次循环" || text === "运行 100 次循环")) {
          try { view.setEnabled(false); } catch (e0) {}
          try { view.setAlpha(0.45); } catch (e1) {}
        }
      }
    } catch (e2) {}
    try {
      if (view.getChildCount) {
        var count = Number(view.getChildCount());
        for (var i = 0; i < count; i++) phase.patchTextTree(view.getChildAt(i), capability);
      }
    } catch (e3) {}
  };

  global.ToolHubBetaPhase2 = phase;
}(function () { return this; }()));
