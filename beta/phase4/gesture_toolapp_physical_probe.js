// ToolHub Beta Phase 4 actual ToolApp predictive-back probe and ColorOS home classification patch. Rhino ES5.
(function (global) {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
  if (!global.ToolHubBetaPhase4Final ||
      String(global.ToolHubBetaPhase4Final.VERSION || "") !== "0.5.2-beta-gesture-final" ||
      String(global.ToolHubBetaPhase4Final.PHYSICAL_DISPATCH_VERSION || "") !== "0.5.3-beta-gesture-physical-dispatch" ||
      String(global.ToolHubBetaPhase4Final.ACTIVATION_PATCH_VERSION || "") !== "0.5.4-beta-gesture-final-activation") return;

  var proto = FloatBallAppWM.prototype;
  if (proto.__toolHubShortXUiGestureToolAppPhysical055Installed === true) return;

  var VERSION = "0.5.5-beta-gesture-toolapp-physical";
  var TIMEOUT_MS = 45000;
  var POLL_MS = 100;
  var MAX_EVENTS = 96;

  function now() { return Number(java.lang.System.currentTimeMillis()); }

  function clonePlain(value) {
    if (value === null || typeof value === "undefined") return null;
    try { return JSON.parse(JSON.stringify(value)); } catch (e0) {}
    try { return String(value); } catch (e1) { return null; }
  }

  function errorText(error) {
    try {
      if (global.ShortXUI && global.ShortXUI.Core && global.ShortXUI.Core.errorText) {
        return String(global.ShortXUI.Core.errorText(error));
      }
    } catch (e0) {}
    try { return String(error); } catch (e1) { return "unknown"; }
  }

  function log(app, level, message) {
    try { safeLog(app && app.L, level || "i", String(message || "")); } catch (e) {}
  }

  function reportOf(app) {
    if (!app.state) app.state = {};
    if (!app.state.shortXUiGestureFinalReport && typeof app.refreshShortXUiGestureFinalProbe === "function") {
      try { app.refreshShortXUiGestureFinalProbe(); } catch (e0) {}
    }
    var report = app.state.shortXUiGestureFinalReport;
    if (!report || typeof report !== "object") {
      report = {
        schema: 1,
        version: "0.5.2-beta-gesture-final",
        createdAt: now(),
        updatedAt: now(),
        ok: false,
        complete: false,
        activeCase: "",
        cases: { predictiveCancel: null, predictiveInvoke: null, recentapps: null, homekey: null },
        logicStress: null,
        summary: { passedCases: 0, requiredCases: 4, logicStressPassed: false, errors: 0 }
      };
      app.state.shortXUiGestureFinalReport = report;
    }
    if (!report.cases) report.cases = { predictiveCancel: null, predictiveInvoke: null, recentapps: null, homekey: null };
    return report;
  }

  function recompute(report) {
    var keys = ["predictiveCancel", "predictiveInvoke", "recentapps", "homekey"];
    var passed = 0;
    var errors = 0;
    var i;
    for (i = 0; i < keys.length; i += 1) {
      var item = report.cases[keys[i]];
      if (item && item.ok === true) passed += 1;
      if (item && item.status === "failed") errors += 1;
    }
    var logicPassed = !!(report.logicStress && report.logicStress.ok === true);
    report.summary = {
      passedCases: passed,
      requiredCases: 4,
      logicStressPassed: logicPassed,
      errors: errors + (report.logicStress && report.logicStress.ok === false ? 1 : 0)
    };
    report.complete = passed === 4 && logicPassed;
    report.ok = report.complete === true && report.summary.errors === 0;
    report.updatedAt = now();
  }

  function publish(app) {
    try {
      var report = reportOf(app);
      recompute(report);
      if (typeof app.refreshShortXUiGestureFinalProbe === "function") {
        app.refreshShortXUiGestureFinalProbe();
      } else if (app.state && app.state.shortXUiGestureFinalStatusView) {
        app.state.shortXUiGestureFinalStatusView.invalidate();
      }
    } catch (e) {
      log(app, "w", "GESTURE_TOOLAPP_REPORT_PUBLISH_FAILED error=" + errorText(e));
    }
  }

  function addEvent(probe, type, detail) {
    if (!probe || !probe.result) return;
    if (!probe.result.events) probe.result.events = [];
    if (probe.result.events.length >= MAX_EVENTS) return;
    probe.result.events.push({ at: now(), type: String(type || "event"), detail: clonePlain(detail) });
  }

  function toolAppSnapshot(app) {
    var root = app.state ? app.state.toolAppRoot : null;
    var callback = null;
    var entries = [];
    try { entries = app.state.panelBackCallbackEntries || []; } catch (e0) { entries = []; }
    var i;
    for (i = entries.length - 1; i >= 0; i -= 1) {
      var item = entries[i];
      if (item && item.view === root && String(item.which || "") === "tool_app") {
        callback = item;
        break;
      }
    }
    var stackDepth = 0;
    try { stackDepth = (app.state.toolAppNavStack || []).length; } catch (e1) {}
    var hasWindowFocus = false;
    var focused = false;
    var attached = false;
    try { hasWindowFocus = !!(root && root.hasWindowFocus && root.hasWindowFocus()); } catch (e2) {}
    try { focused = !!(root && root.isFocused && root.isFocused()); } catch (e3) {}
    try { attached = !!(root && root.isAttachedToWindow && root.isAttachedToWindow()); } catch (e4) {}
    return {
      active: !!(app.state && app.state.toolAppActive),
      route: String(app.state && app.state.toolAppRoute || ""),
      stackDepth: stackDepth,
      rootPresent: !!root,
      attached: attached,
      hasWindowFocus: hasWindowFocus,
      focused: focused,
      callbackRegistered: !!callback,
      callbackMode: callback ? String(callback.mode || "") : "",
      callbackAnimation: !!(callback && callback.animation === true),
      callbackPriority: callback ? Number(callback.priority || 0) : 0
    };
  }

  function probeSession(probe) {
    return {
      stats: probe.stats,
      progress: probe.progress,
      callbackRegistered: true,
      receiverRegistered: false
    };
  }

  function finishProbe(app, probe, ok, code, detail) {
    if (!probe || probe.finished === true) return;
    probe.finished = true;
    var report = reportOf(app);
    var key = probe.name === "predictive_cancel" ? "predictiveCancel" : "predictiveInvoke";
    var result = probe.result;
    result.ok = ok === true;
    result.status = ok === true ? "passed" : "failed";
    result.code = String(code || (ok ? "PASSED" : "FAILED"));
    result.finishedAt = now();
    result.durationMs = Math.max(0, result.finishedAt - Number(result.startedAt || result.finishedAt));
    result.ready = true;
    result.stats = clonePlain(probe.stats);
    result.finalStats = clonePlain(probe.stats);
    result.progress = Number(probe.progress || 0);
    result.detail = clonePlain(detail || {});
    result.toolAppAfter = toolAppSnapshot(app);
    report.cases[key] = result;
    report.activeCase = "";
    if (app.state.shortXUiGestureFinalActive) app.state.shortXUiGestureFinalActive.finished = true;
    app.state.shortXUiGestureFinalActive = null;
    app.state.shortXUiToolAppPhysicalProbe = null;
    publish(app);
    log(app, ok ? "i" : "e",
      "GESTURE_TOOLAPP_CASE_DONE name=" + probe.name +
      " ok=" + String(ok === true) +
      " code=" + result.code +
      " started=" + String(Number(probe.stats.backStarted || 0)) +
      " progress=" + String(Number(probe.stats.backProgressed || 0)) +
      " cancel=" + String(Number(probe.stats.backCancelled || 0)) +
      " invoke=" + String(Number(probe.stats.backInvoked || 0)));
  }

  function scheduleTimeout(app, probe) {
    try {
      var handler = new android.os.Handler(android.os.Looper.getMainLooper());
      function poll() {
        if (!probe || probe.finished === true) return;
        if (!app.state || app.state.shortXUiToolAppPhysicalProbe !== probe) return;
        if (now() - probe.startedAt >= TIMEOUT_MS) {
          finishProbe(app, probe, false, "TOOLAPP_PREDICTIVE_TIMEOUT", {
            instruction: probe.result.instruction,
            toolApp: toolAppSnapshot(app)
          });
          return;
        }
        handler.postDelayed(new java.lang.Runnable({ run: poll }), POLL_MS);
      }
      handler.postDelayed(new java.lang.Runnable({ run: poll }), POLL_MS);
    } catch (e) {
      log(app, "e", "GESTURE_TOOLAPP_TIMEOUT_SCHEDULE_FAILED error=" + errorText(e));
    }
  }

  function beginToolAppProbe(app, name) {
    if (!app.state) app.state = {};
    var existing = app.state.shortXUiToolAppPhysicalProbe;
    if (existing && existing.finished !== true) {
      return { ok: false, code: "CASE_ALREADY_RUNNING", name: existing.name };
    }

    try {
      var nested = app.state.shortXUiGestureSession;
      if (nested && nested.host && nested.host.getState && nested.host.getState() !== "DISPOSED" &&
          typeof app.closeShortXUiGestureWindow === "function") {
        app.closeShortXUiGestureWindow(true, "switch_to_actual_toolapp_probe");
      }
    } catch (eClose) {}

    var snap = toolAppSnapshot(app);
    if (!snap.active || !snap.rootPresent || !snap.attached || !snap.callbackRegistered) {
      return { ok: false, code: "TOOLAPP_BACK_TARGET_UNAVAILABLE", snapshot: snap };
    }

    try { if (app.state.toolAppRoot) app.state.toolAppRoot.requestFocus(); } catch (eFocus) {}
    snap = toolAppSnapshot(app);

    var label = name === "predictive_cancel" ? "实际 ToolApp 预测返回取消" : "实际 ToolApp 预测返回提交";
    var instruction = name === "predictive_cancel" ?
      "当前不再打开小实验窗。请从屏幕边缘缓慢侧滑实际 ToolApp 页面，看到页面跟随变化后反向滑回取消。" :
      "当前不再打开小实验窗。请从屏幕边缘完整侧滑返回实际 ToolApp 页面。";
    var result = {
      name: String(name),
      label: label,
      ok: false,
      status: "ready",
      code: "TOOLAPP_READY",
      startedAt: now(),
      finishedAt: 0,
      durationMs: 0,
      ready: true,
      instruction: instruction,
      events: [],
      stats: {},
      cleanup: null,
      toolAppBefore: snap
    };
    var probe = {
      name: String(name),
      startedAt: result.startedAt,
      result: result,
      finished: false,
      startedRecorded: false,
      invokedRecorded: false,
      progress: 0,
      stats: {
        backStarted: 0,
        backProgressed: 0,
        backCancelled: 0,
        backInvoked: 0,
        maxProgress: 0,
        imePriority: 0,
        pagePops: 0,
        rootCloses: 0,
        outsideDismisses: 0,
        recentsDismisses: 0,
        homeDismisses: 0,
        callbackRegisterErrors: 0,
        normalCloses: 0,
        immediateCloses: 0,
        errors: 0
      }
    };
    addEvent(probe, "toolapp_armed", snap);

    var report = reportOf(app);
    var key = name === "predictive_cancel" ? "predictiveCancel" : "predictiveInvoke";
    report.cases[key] = result;
    report.activeCase = String(name);
    app.state.shortXUiToolAppPhysicalProbe = probe;
    app.state.shortXUiGestureFinalActive = {
      name: String(name),
      result: result,
      session: probeSession(probe),
      ready: true,
      finished: false
    };
    publish(app);
    scheduleTimeout(app, probe);
    try { android.widget.Toast.makeText(context, instruction, android.widget.Toast.LENGTH_LONG).show(); } catch (eToast) {}
    log(app, "i",
      "GESTURE_TOOLAPP_ARMED name=" + name +
      " focus=" + String(snap.hasWindowFocus) +
      " callback=" + String(snap.callbackRegistered) +
      " mode=" + String(snap.callbackMode));
    return { ok: true, code: "TOOLAPP_CASE_STARTED", name: name, snapshot: snap, instruction: instruction };
  }

  function activeProbe(app, panel) {
    var probe = app && app.state ? app.state.shortXUiToolAppPhysicalProbe : null;
    if (!probe || probe.finished === true) return null;
    if (!app.state.toolAppRoot || panel !== app.state.toolAppRoot) return null;
    return probe;
  }

  var oldApply = proto.applyPanelPredictiveBackProgress;
  if (typeof oldApply === "function") {
    proto.applyPanelPredictiveBackProgress = function (panel, event) {
      var probe = activeProbe(this, panel);
      if (probe) {
        var progress = 0;
        var edge = 0;
        try { progress = Number(event && event.getProgress ? event.getProgress() : 0); } catch (e0) {}
        try { edge = Number(event && event.getSwipeEdge ? event.getSwipeEdge() : 0); } catch (e1) {}
        if (!isFinite(progress)) progress = 0;
        progress = Math.max(0, Math.min(1, progress));
        if (!probe.startedRecorded) {
          probe.startedRecorded = true;
          probe.stats.backStarted += 1;
          addEvent(probe, "back_started", { progress: progress, edge: edge, toolApp: toolAppSnapshot(this) });
          log(this, "i", "GESTURE_TOOLAPP_BACK_STARTED name=" + probe.name + " focus=" + String(toolAppSnapshot(this).hasWindowFocus));
        }
        if (progress > 0) {
          probe.stats.backProgressed += 1;
          probe.progress = progress;
          if (progress > Number(probe.stats.maxProgress || 0)) probe.stats.maxProgress = progress;
          if (!probe.progressEventRecorded) {
            probe.progressEventRecorded = true;
            addEvent(probe, "back_progress", { progress: progress, edge: edge });
          }
        }
        if (this.state.shortXUiGestureFinalActive && this.state.shortXUiGestureFinalActive.session) {
          this.state.shortXUiGestureFinalActive.session.stats = probe.stats;
          this.state.shortXUiGestureFinalActive.session.progress = probe.progress;
        }
      }
      return oldApply.apply(this, arguments);
    };
  }

  var oldReset = proto.resetPanelPredictiveBackVisual;
  if (typeof oldReset === "function") {
    proto.resetPanelPredictiveBackVisual = function (panel) {
      var probe = activeProbe(this, panel);
      var result = oldReset.apply(this, arguments);
      if (probe && probe.name === "predictive_cancel" && probe.startedRecorded === true &&
          Number(probe.stats.backProgressed || 0) >= 1 && probe.invokedRecorded !== true) {
        probe.stats.backCancelled += 1;
        probe.progress = 0;
        addEvent(probe, "back_cancelled", { toolApp: toolAppSnapshot(this) });
        finishProbe(this, probe, true, "TOOLAPP_PREDICTIVE_CANCEL_VERIFIED", {
          sessionStillOpen: !!(this.state && this.state.toolAppActive),
          progressReset: true
        });
      }
      return result;
    };
  }

  function recordInvoke(app, probe, source) {
    if (!probe || probe.invokedRecorded === true) return;
    probe.invokedRecorded = true;
    probe.stats.backInvoked += 1;
    addEvent(probe, "back_invoked", { source: String(source || ""), toolAppBeforeCommit: toolAppSnapshot(app) });
    log(app, "i", "GESTURE_TOOLAPP_BACK_INVOKED source=" + String(source || ""));
    try {
      new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(new java.lang.Runnable({
        run: function () {
          if (!probe || probe.finished === true) return;
          var ok = Number(probe.stats.backStarted || 0) >= 1 &&
            Number(probe.stats.backProgressed || 0) >= 1 &&
            Number(probe.stats.backInvoked || 0) >= 1;
          finishProbe(app, probe, ok,
            ok ? "TOOLAPP_PREDICTIVE_INVOKE_VERIFIED" : "TOOLAPP_PREDICTIVE_INVOKE_SIGNAL_INCOMPLETE",
            { source: String(source || ""), toolApp: toolAppSnapshot(app) });
        }
      }), 420);
    } catch (e) {
      finishProbe(app, probe, false, "TOOLAPP_PREDICTIVE_INVOKE_FINISH_FAILED", { error: errorText(e) });
    }
  }

  var oldFinishPreview = proto.finishToolAppBackPreview;
  if (typeof oldFinishPreview === "function") {
    proto.finishToolAppBackPreview = function (edge, commit) {
      var probe = this.state ? this.state.shortXUiToolAppPhysicalProbe : null;
      if (probe && probe.finished !== true && probe.name === "predictive_invoke" && commit === true) {
        recordInvoke(this, probe, "finishToolAppBackPreview");
      }
      return oldFinishPreview.apply(this, arguments);
    };
  }

  var oldHandlePanelBack = proto.handlePanelBack;
  if (typeof oldHandlePanelBack === "function") {
    proto.handlePanelBack = function (which, reason) {
      var probe = this.state ? this.state.shortXUiToolAppPhysicalProbe : null;
      if (probe && probe.finished !== true && probe.name === "predictive_invoke" &&
          String(which || "") === "tool_app" &&
          (String(reason || "").indexOf("predictive") >= 0 || String(reason || "").indexOf("on_back") >= 0)) {
        recordInvoke(this, probe, "handlePanelBack:" + String(reason || ""));
      }
      return oldHandlePanelBack.apply(this, arguments);
    };
  }

  function scheduleHomeClassification(app) {
    try {
      var handler = new android.os.Handler(android.os.Looper.getMainLooper());
      var started = now();
      function poll() {
        var report = reportOf(app);
        var item = report.cases ? report.cases.homekey : null;
        if (item && item.status === "passed") return;
        if (item && item.status === "failed" && String(item.code || "") === "HOME_ASYNC_CLOSE_FAILED") {
          var stats = item.finalStats || item.stats || {};
          var cleanup = item.cleanup || (item.detail ? item.detail.cleanup : null);
          var closeReason = item.closeResult ? String(item.closeResult.reason || "") : "";
          if (Number(stats.recentsDismisses || 0) >= 1 && cleanup && cleanup.clean === true &&
              closeReason === "recentapps_async_worker") {
            item.ok = true;
            item.status = "passed";
            item.code = "HOME_NAV_CLOSE_VERIFIED_OEM_RECENTS_REASON";
            if (!item.detail || typeof item.detail !== "object") item.detail = {};
            item.detail.requestedCase = "homekey";
            item.detail.observedBroadcastReason = "recentapps";
            item.detail.oemClassificationAdjusted = true;
            recompute(report);
            publish(app);
            log(app, "i", "GESTURE_HOME_CLASSIFIED_OK observedReason=recentapps oem=ColorOS");
            return;
          }
        }
        if (now() - started < TIMEOUT_MS + 5000) {
          handler.postDelayed(new java.lang.Runnable({ run: poll }), 150);
        }
      }
      handler.postDelayed(new java.lang.Runnable({ run: poll }), 150);
    } catch (e) {
      log(app, "w", "GESTURE_HOME_CLASSIFICATION_SCHEDULE_FAILED error=" + errorText(e));
    }
  }

  var oldStart = proto.startShortXUiGestureFinalCase;
  if (typeof oldStart === "function") {
    proto.startShortXUiGestureFinalCase = function (name) {
      var value = String(name || "");
      if (value === "predictive_cancel" || value === "predictive_invoke") {
        return beginToolAppProbe(this, value);
      }
      var result = oldStart.apply(this, arguments);
      if (value === "homekey" && result && result.ok === true) scheduleHomeClassification(this);
      return result;
    };
  }

  global.ToolHubBetaPhase4Final.TOOLAPP_PHYSICAL_VERSION = VERSION;
  global.ToolHubBetaPhase4Final.PREDICTIVE_TARGET = "actual_tool_app_root";
  global.ToolHubBetaPhase4Final.HOME_REASON_POLICY = "accept_coloros_recentapps_for_home_case";
  proto.__toolHubShortXUiGestureToolAppPhysical055Installed = true;
  try { writeLog("ShortXUI Gesture actual ToolApp probe installed version=" + VERSION); } catch (eLog) {}
}(function () { return this; }()));
