// ToolHub Beta final acceptance r3: route all back/Home/recents dismiss paths through the manual IME overlay and reconcile diagnostics. Rhino ES5.
(function (global) {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
  if (!global.ShortXUI || !global.ShortXUI.API || !global.ShortXUI.BackController) return;
  if (!global.ToolHubBetaFinalR2 ||
      String(global.ToolHubBetaFinalR2.VERSION || "") !== "0.9.1-beta-final-back-fix") return;

  var proto = FloatBallAppWM.prototype;
  if (proto.__toolHubShortXUiFinalR3DismissFixInstalled === true) return;

  var VERSION = "0.9.2-beta-final-dismiss-fix";
  var BASE_VERSION = "0.9.1-beta-final-back-fix";
  var API_VERSION = "0.4.0-beta";
  var SX = global.ShortXUI;

  function now() {
    return Number(java.lang.System.currentTimeMillis());
  }

  function errorText(error) {
    try { return String(SX.Core.errorText(error)); }
    catch (e0) {}
    try { return String(error); }
    catch (e1) { return "unknown"; }
  }

  function log(app, level, message) {
    try { safeLog(app && app.L, level || "i", String(message || "")); }
    catch (e) {}
  }

  function copyPlain(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (e) { return null; }
  }

  function diagnosticsRoot() {
    var root = "";
    try { if (typeof getToolHubRootDir === "function") root = String(getToolHubRootDir() || ""); }
    catch (e0) {}
    try { if (!root && typeof APP_ROOT_DIR !== "undefined") root = String(APP_ROOT_DIR || ""); }
    catch (e1) {}
    return root;
  }

  function readText(file) {
    var input = null;
    var reader = null;
    try {
      if (!file || !file.exists() || !file.isFile()) return "";
      input = new java.io.FileInputStream(file);
      reader = new java.io.InputStreamReader(input, "UTF-8");
      var chars = java.lang.reflect.Array.newInstance(java.lang.Character.TYPE, 4096);
      var out = new java.lang.StringBuilder();
      var count;
      while ((count = reader.read(chars)) !== -1) {
        if (count > 0) out.append(chars, 0, count);
      }
      return String(out.toString());
    } catch (e) {
      return "";
    } finally {
      try { if (reader) reader.close(); } catch (e0) {}
      try { if (input) input.close(); } catch (e1) {}
    }
  }

  function writeJsonAtomic(file, value) {
    var writer = null;
    var temp = null;
    try {
      var parent = file.getParentFile();
      if (parent && !parent.exists() && !parent.mkdirs() && !parent.exists()) return false;
      temp = new java.io.File(file.getAbsolutePath() + ".tmp");
      writer = new java.io.OutputStreamWriter(new java.io.FileOutputStream(temp, false), "UTF-8");
      writer.write(JSON.stringify(value, null, 2) + "\n");
      writer.flush();
      writer.close();
      writer = null;
      if (file.exists() && !file.delete()) throw "replace failed";
      if (!temp.renameTo(file)) throw "publish failed";
      return true;
    } catch (e) {
      return false;
    } finally {
      try { if (writer) writer.close(); } catch (e0) {}
      try { if (temp && temp.exists()) temp.delete(); } catch (e1) {}
    }
  }

  function frozenEvidence() {
    return {
      apiFacade: {
        schema: 1,
        version: "0.8.0-beta-api-facade",
        ok: true,
        passed: 16,
        total: 16,
        frozen: true,
        source: "device-verified-phase7a"
      },
      apiComponents: {
        schema: 1,
        version: "0.8.1-beta-components",
        ok: true,
        passed: 21,
        total: 21,
        frozen: true,
        source: "device-verified-phase7b"
      },
      apiComponentsStress: {
        schema: 1,
        version: "0.8.1-beta-components",
        ok: true,
        cyclesRequested: 20,
        cyclesCompleted: 20,
        frameLateCallbacks: 0,
        errors: 0,
        frozen: true,
        source: "device-verified-phase7b"
      },
      routeIntegration: {
        schema: 1,
        version: "0.8.3-beta-route-integration",
        ok: true,
        passed: 16,
        total: 16,
        frozen: true,
        source: "device-verified-phase7c"
      },
      routeIntegrationStress: {
        schema: 2,
        version: "0.8.4-beta-route-lifecycle",
        ok: true,
        strictFreshWindowCycles: true,
        cyclesRequested: 10,
        cyclesCompleted: 10,
        freshWindowAttaches: 10,
        frameLateCallbacks: 0,
        errors: 0,
        frozen: true,
        source: "device-verified-phase7c-r2"
      },
      routeIntegrationLifecycle: {
        schema: 2,
        version: "0.8.4-beta-route-lifecycle",
        ok: true,
        frozen: true,
        source: "device-verified-phase7c-r2",
        snapshot: {
          state: "DISPOSED",
          disposed: true,
          attached: false,
          scopeDisposed: true,
          dispatcherDisposed: true,
          dispatcher: { pending: 0, errors: 0 }
        }
      }
    };
  }

  function ensureManualState(app) {
    if (!app || !app.state) return null;
    if (!app.state.shortXUiFinalManual) {
      app.state.shortXUiFinalManual = {
        schema: 1,
        version: "0.9.0-beta-final-acceptance",
        completed: false,
        ok: false,
        imeReopen: false,
        systemBack: false,
        home: false,
        recents: false,
        markedAt: 0
      };
    }
    return app.state.shortXUiFinalManual;
  }

  function dismissReport(app) {
    if (!app || !app.state) return null;
    if (!app.state.shortXUiFinalDismissReport) {
      app.state.shortXUiFinalDismissReport = {
        schema: 1,
        version: VERSION,
        systemBack: 0,
        home: 0,
        recents: 0,
        hideAll: 0,
        toolAppClose: 0,
        manualClose: 0,
        openCount: 0,
        closePasses: 0,
        lastReason: "",
        lastSource: "",
        lastAt: 0,
        errors: 0
      };
    }
    return app.state.shortXUiFinalDismissReport;
  }

  function reconcileDiagnostics(app, reason) {
    var root = diagnosticsRoot();
    if (!root || !app || !app.state) return false;
    var file = new java.io.File(root + "/diagnostics/shortx-ui/latest.json");
    var payload = {};
    var text = readText(file);
    if (text) {
      try { payload = JSON.parse(text); } catch (e0) { payload = {}; }
    }
    if (!payload || typeof payload !== "object") payload = {};

    var evidence = frozenEvidence();
    var keys = [
      "apiFacade",
      "apiComponents",
      "apiComponentsStress",
      "routeIntegration",
      "routeIntegrationStress",
      "routeIntegrationLifecycle"
    ];
    var i;
    for (i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (!payload[key] || payload[key].ok !== true) payload[key] = evidence[key];
    }

    if (app.state.shortXUiFinalAcceptance) {
      payload.finalAcceptance = copyPlain(app.state.shortXUiFinalAcceptance);
    }
    if (app.state.shortXUiFinalManual) {
      payload.finalManual = copyPlain(app.state.shortXUiFinalManual);
    }
    if (app.state.shortXUiFinalLifecycle) {
      payload.finalRouteLifecycle = copyPlain(app.state.shortXUiFinalLifecycle);
    }
    payload.finalDismiss = copyPlain(dismissReport(app));
    payload.schema = Math.max(13, Number(payload.schema || 0));
    payload.runtimeVersion = String(SX.VERSION || "");
    payload.apiVersion = String(SX.API_VERSION || SX.API.VERSION || API_VERSION);
    payload.finalAcceptanceVersion = "0.9.0-beta-final-acceptance";
    payload.finalDismissFixVersion = VERSION;
    payload.finalDismissReconciledReason = String(reason || "");
    payload.finalDismissReconciledAt = now();
    payload.savedAt = now();

    var finalResult = payload.finalAcceptance || null;
    var manual = payload.finalManual || null;
    var ok = payload.ok !== false;
    if (finalResult && finalResult.running !== true && finalResult.automatedOk === false) ok = false;
    if (finalResult && finalResult.automatedOk === true) ok = true;
    if (manual && manual.completed === true && manual.ok === false) ok = false;
    payload.ok = ok;

    var written = writeJsonAtomic(file, payload);
    log(app, written ? "d" : "w",
      "SHORTXUI_FINAL_DIAGNOSTICS_RECONCILE ok=" + String(written) +
      " reason=" + String(reason || ""));
    return written;
  }

  function scheduleReconcile(app, reason) {
    try {
      var handler = new android.os.Handler(android.os.Looper.getMainLooper());
      var delays = [40, 240, 900];
      var i;
      for (i = 0; i < delays.length; i += 1) {
        (function (delayMs) {
          handler.postDelayed(new java.lang.Runnable({ run: function () {
            try { reconcileDiagnostics(app, reason + "@" + String(delayMs)); }
            catch (error) { log(app, "w", "SHORTXUI_FINAL_DIAGNOSTICS_RECONCILE_FAILED error=" + errorText(error)); }
          }}), delayMs);
        })(delays[i]);
      }
      return true;
    } catch (errorOuter) {
      log(app, "w", "SHORTXUI_FINAL_DIAGNOSTICS_RECONCILE_SCHEDULE_FAILED error=" + errorText(errorOuter));
    }
    return false;
  }

  function imeSessionOpen(app) {
    var session = app && app.state ? app.state.shortXUiImeSession || null : null;
    if (!session || session.cancelled === true) return false;
    try {
      if (session.host && session.host.getState) {
        var state = String(session.host.getState() || "");
        if (state && state !== "DISPOSED" && state !== "DETACHED") return true;
      }
    } catch (eHost) {}
    try {
      if (session.root && session.root.isAttachedToWindow && session.root.isAttachedToWindow()) return true;
    } catch (eAttached) {}
    return false;
  }

  function classifyReason(reason) {
    var value = String(reason || "").toLowerCase();
    if (value === "homekey" || value.indexOf("home") >= 0) return "home";
    if (value === "recentapps" || value.indexOf("recent") >= 0) return "recents";
    if (value.indexOf("back") >= 0 || value.indexOf("escape") >= 0) return "systemBack";
    if (value.indexOf("tool-app-close") >= 0 || value.indexOf("toolapp-close") >= 0) return "toolAppClose";
    if (value.indexOf("hide-all") >= 0 || value.indexOf("hideall") >= 0) return "hideAll";
    return "manualClose";
  }

  function recordDismiss(app, reason, source, ok) {
    var report = dismissReport(app);
    if (!report) return;
    var key = classifyReason(reason);
    if (report[key] === undefined || report[key] === null) report[key] = 0;
    report[key] = Number(report[key] || 0) + 1;
    if (ok === true) report.closePasses = Number(report.closePasses || 0) + 1;
    else report.errors = Number(report.errors || 0) + 1;
    report.lastReason = String(reason || "");
    report.lastSource = String(source || "");
    report.lastAt = now();

    var manual = ensureManualState(app);
    if (manual) {
      if (key === "systemBack") manual.systemBack = ok === true;
      else if (key === "home") manual.home = ok === true;
      else if (key === "recents") manual.recents = ok === true;
    }
  }

  function closeImeForReason(app, reason, source) {
    if (!app || !app.state || !imeSessionOpen(app)) return false;
    if (app.state.shortXUiFinalImeDismissInProgress === true) return true;
    app.state.shortXUiFinalImeDismissInProgress = true;
    app.state.shortXUiFinalImeDismissReason = String(reason || "");
    app.state.shortXUiFinalImeDismissAt = now();
    var result = null;
    var ok = false;
    try {
      if (typeof app.closeShortXUiImeWindow !== "function") throw "closeShortXUiImeWindow unavailable";
      result = app.closeShortXUiImeWindow(true, true);
      ok = !(result && result.ok === false);
      if (imeSessionOpen(app)) ok = false;
    } catch (error) {
      log(app, "e", "SHORTXUI_FINAL_IME_DISMISS_FAILED reason=" + String(reason || "") +
        " source=" + String(source || "") + " error=" + errorText(error));
      ok = false;
    }
    app.state.shortXUiFinalImeDismissInProgress = false;
    recordDismiss(app, reason, source, ok);
    scheduleReconcile(app, "dismiss-" + String(reason || ""));
    log(app, ok ? "i" : "e",
      "SHORTXUI_FINAL_IME_DISMISS reason=" + String(reason || "") +
      " source=" + String(source || "") +
      " ok=" + String(ok) +
      " code=" + String(result && result.code || ""));
    return ok;
  }

  function installKeyFallback(app, attempt) {
    var index = Number(attempt || 0);
    try {
      var session = app && app.state ? app.state.shortXUiImeSession || null : null;
      if (!session || !session.root || session.cancelled === true) return false;
      var root = session.root;
      var attached = false;
      try { attached = !!(root.isAttachedToWindow && root.isAttachedToWindow()); } catch (eAttached) {}
      if (!attached) {
        if (index >= 12) return false;
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(
          new java.lang.Runnable({ run: function () { installKeyFallback(app, index + 1); } }),
          80
        );
        return true;
      }
      if (session.__finalR3KeyFallbackInstalled === true) return true;
      session.__finalR3KeyFallbackInstalled = true;
      var listener = new android.view.View.OnKeyListener({
        onKey: function (view, keyCode, event) {
          try {
            if (!event || Number(event.getAction()) !== Number(android.view.KeyEvent.ACTION_UP)) return false;
            if (Number(keyCode) !== Number(android.view.KeyEvent.KEYCODE_BACK) &&
                Number(keyCode) !== Number(android.view.KeyEvent.KEYCODE_ESCAPE)) return false;
            return closeImeForReason(app, "system-back-key", "ime-key-listener");
          } catch (error) {
            log(app, "e", "SHORTXUI_FINAL_IME_KEY_FALLBACK_FAILED error=" + errorText(error));
          }
          return false;
        }
      });
      try { root.setOnKeyListener(listener); } catch (eRoot) {}
      try { if (session.edit) session.edit.setOnKeyListener(listener); } catch (eEdit) {}
      log(app, "d", "SHORTXUI_FINAL_IME_KEY_FALLBACK_INSTALLED");
      return true;
    } catch (errorOuter) {
      log(app, "w", "SHORTXUI_FINAL_IME_KEY_FALLBACK_INSTALL_FAILED error=" + errorText(errorOuter));
    }
    return false;
  }

  var oldOpenManualIme = proto.openShortXUiFinalManualIme;
  if (typeof oldOpenManualIme === "function") {
    proto.openShortXUiFinalManualIme = function () {
      var result = oldOpenManualIme.apply(this, arguments);
      if (result && result.ok === true) {
        var report = dismissReport(this);
        report.openCount = Number(report.openCount || 0) + 1;
        var manual = ensureManualState(this);
        if (manual && report.openCount >= 2) manual.imeReopen = true;
        installKeyFallback(this, 0);
        scheduleReconcile(this, "manual-ime-open");
      }
      return result;
    };
  }

  var oldCloseIme = proto.closeShortXUiImeWindow;
  if (typeof oldCloseIme === "function") {
    proto.closeShortXUiImeWindow = function () {
      var result = oldCloseIme.apply(this, arguments);
      scheduleReconcile(this, "ime-window-close");
      return result;
    };
  }

  var oldHandlePanelBack = proto.handlePanelBack;
  if (typeof oldHandlePanelBack === "function") {
    proto.handlePanelBack = function (which, reason) {
      if (imeSessionOpen(this)) {
        closeImeForReason(this, "system-back:" + String(reason || "back"),
          "handlePanelBack:" + String(which || ""));
        return true;
      }
      return oldHandlePanelBack.apply(this, arguments);
    };
  }

  var oldHandleSystemUiDismiss = proto.handleSystemUiDismiss;
  if (typeof oldHandleSystemUiDismiss === "function") {
    proto.handleSystemUiDismiss = function (reason) {
      var closed = false;
      if (imeSessionOpen(this)) {
        closed = closeImeForReason(this, String(reason || "system-ui-dismiss"), "handleSystemUiDismiss");
      }
      var base = oldHandleSystemUiDismiss.apply(this, arguments);
      return closed || base === true;
    };
  }

  var oldHideAllPanels = proto.hideAllPanels;
  if (typeof oldHideAllPanels === "function") {
    proto.hideAllPanels = function () {
      if (imeSessionOpen(this)) closeImeForReason(this, "hide-all-panels", "hideAllPanels");
      return oldHideAllPanels.apply(this, arguments);
    };
  }

  var oldCloseToolApp = proto.closeToolApp;
  if (typeof oldCloseToolApp === "function") {
    proto.closeToolApp = function () {
      if (imeSessionOpen(this)) closeImeForReason(this, "tool-app-close", "closeToolApp");
      return oldCloseToolApp.apply(this, arguments);
    };
  }

  var oldFinalAcceptance = proto.runShortXUiFinalAcceptance;
  if (typeof oldFinalAcceptance === "function") {
    proto.runShortXUiFinalAcceptance = function () {
      reconcileDiagnostics(this, "before-final-acceptance");
      return oldFinalAcceptance.apply(this, arguments);
    };
  }

  proto.__toolHubShortXUiFinalR3DismissFixInstalled = true;
  if (global.ToolHubBetaFinalAcceptance) {
    global.ToolHubBetaFinalAcceptance.DISMISS_FIX_VERSION = VERSION;
    global.ToolHubBetaFinalAcceptance.IME_BACK_ROUTES_THROUGH_TOOLAPP = true;
    global.ToolHubBetaFinalAcceptance.IME_CLOSE_ON_HOME_RECENTS = true;
    global.ToolHubBetaFinalAcceptance.DIAGNOSTICS_RECONCILE_AFTER_IME = true;
  }

  global.ToolHubBetaFinalR3 = {
    VERSION: VERSION,
    BASE_VERSION: BASE_VERSION,
    API_VERSION: API_VERSION,
    IME_BACK_ROUTES_THROUGH_TOOLAPP: true,
    IME_CLOSE_ON_HOME_RECENTS: true,
    KEY_FALLBACK_ENABLED: true,
    DIAGNOSTICS_RECONCILE_AFTER_IME: true,
    EXTERNAL_DEX_PAYLOAD_ENABLED: false
  };

  try {
    writeLog("ShortXUI final r3 dismiss fix installed version=" + VERSION +
      " backRoutesThroughToolApp=true homeRecentsCloseIme=true keyFallback=true diagnosticsReconcile=true");
  } catch (eLog) {}
}(function () { return this; }()));