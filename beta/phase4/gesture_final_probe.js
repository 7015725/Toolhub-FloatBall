// ToolHub Beta Phase 4 final physical gesture/system-close evidence probe. Rhino ES5.
(function (global) {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
  if (!global.ToolHubBetaPhase4 || String(global.ToolHubBetaPhase4.VERSION || "") !== "0.5.0-beta-gesture") return;
  if (String(global.ToolHubBetaPhase4.PATCH_VERSION || "") !== "0.5.1-beta-system-close") return;

  var proto = FloatBallAppWM.prototype;
  if (proto.__toolHubShortXUiGestureFinalProbeInstalled === true) return;

  var VERSION = "0.5.2-beta-gesture-final";
  var CASE_TIMEOUT_MS = 45000;
  var SYSTEM_CLOSE_TIMEOUT_MS = 10000;
  var POLL_MS = 80;
  var MAX_EVENTS = 96;

  function now() { return Number(java.lang.System.currentTimeMillis()); }

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

  function clonePlain(value) {
    if (value === null || typeof value === "undefined") return null;
    try { return JSON.parse(JSON.stringify(value)); } catch (e0) {}
    try { return String(value); } catch (e1) { return null; }
  }

  function rootDir() {
    var root = "";
    try { if (typeof getToolHubRootDir === "function") root = String(getToolHubRootDir() || ""); } catch (e0) {}
    try { if (!root && typeof APP_ROOT_DIR !== "undefined") root = String(APP_ROOT_DIR || ""); } catch (e1) {}
    return root;
  }

  function reportFile() {
    var root = rootDir();
    return root ? new java.io.File(root + "/diagnostics/shortx-ui/gesture-final.json") : null;
  }

  function latestFile() {
    var root = rootDir();
    return root ? new java.io.File(root + "/diagnostics/shortx-ui/latest.json") : null;
  }

  function readText(file) {
    var reader = null;
    var builder = new java.lang.StringBuilder();
    try {
      if (!file || !file.exists() || !file.isFile()) return "";
      reader = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), "UTF-8"));
      var line;
      while ((line = reader.readLine()) !== null) builder.append(line).append("\n");
      return String(builder.toString());
    } catch (e) {
      return "";
    } finally {
      try { if (reader) reader.close(); } catch (eClose) {}
    }
  }

  function writeJsonAtomic(file, payload) {
    var writer = null;
    var temp = null;
    try {
      if (!file) return false;
      var parent = file.getParentFile();
      if (parent && !parent.exists() && !parent.mkdirs() && !parent.exists()) return false;
      temp = new java.io.File(file.getAbsolutePath() + ".gesture-final.tmp");
      writer = new java.io.OutputStreamWriter(new java.io.FileOutputStream(temp, false), "UTF-8");
      writer.write(JSON.stringify(payload, null, 2) + "\n");
      writer.flush();
      writer.close();
      writer = null;
      if (file.exists() && !file.delete()) throw "replace target failed";
      if (!temp.renameTo(file)) throw "publish target failed";
      return true;
    } catch (e) {
      return false;
    } finally {
      try { if (writer) writer.close(); } catch (e0) {}
      try { if (temp && temp.exists()) temp.delete(); } catch (e1) {}
    }
  }

  function blankReport() {
    return {
      schema: 1,
      version: VERSION,
      createdAt: now(),
      updatedAt: now(),
      ok: false,
      complete: false,
      activeCase: "",
      cases: {
        predictiveCancel: null,
        predictiveInvoke: null,
        recentapps: null,
        homekey: null
      },
      logicStress: null,
      summary: {
        passedCases: 0,
        requiredCases: 4,
        logicStressPassed: false,
        errors: 0
      }
    };
  }

  function loadReport(app) {
    if (!app.state) app.state = {};
    if (app.state.shortXUiGestureFinalReport) return app.state.shortXUiGestureFinalReport;
    var report = null;
    var text = readText(reportFile());
    if (text) {
      try { report = JSON.parse(text); } catch (e0) { report = null; }
    }
    if (!report || Number(report.schema || 0) !== 1) report = blankReport();
    report.version = VERSION;
    if (!report.cases) report.cases = blankReport().cases;
    if (!report.summary) report.summary = blankReport().summary;
    app.state.shortXUiGestureFinalReport = report;
    return report;
  }

  function caseKey(name) {
    var value = String(name || "");
    if (value === "predictive_cancel") return "predictiveCancel";
    if (value === "predictive_invoke") return "predictiveInvoke";
    if (value === "recentapps") return "recentapps";
    if (value === "homekey") return "homekey";
    return "";
  }

  function caseLabel(name) {
    var value = String(name || "");
    if (value === "predictive_cancel") return "预测返回取消";
    if (value === "predictive_invoke") return "预测返回提交";
    if (value === "recentapps") return "最近任务关闭";
    if (value === "homekey") return "Home 关闭";
    return value;
  }

  function instruction(name, ready) {
    var value = String(name || "");
    if (!ready) return "等待回调与系统广播接收器注册完成。";
    if (value === "predictive_cancel") return "从屏幕边缘缓慢侧滑，看到窗口跟随缩放后反向滑回并取消。";
    if (value === "predictive_invoke") return "从屏幕边缘完成一次系统返回手势，窗口应正常关闭。";
    if (value === "recentapps") return "按最近任务键或底部上滑进入最近任务，实验窗口应立即关闭。";
    if (value === "homekey") return "按 Home 或底部上滑回桌面，实验窗口应立即关闭。";
    return "";
  }

  function event(caseResult, type, detail) {
    if (!caseResult) return;
    if (!caseResult.events) caseResult.events = [];
    if (caseResult.events.length >= MAX_EVENTS) return;
    caseResult.events.push({ at: now(), type: String(type || "event"), detail: clonePlain(detail) });
  }

  function dispatcherDisposed(state) {
    if (state === null || typeof state === "undefined") return false;
    if (typeof state === "string") return String(state).toUpperCase().indexOf("DISPOSED") >= 0;
    try {
      if (state.disposed === true) return true;
      if (String(state.state || "").toUpperCase() === "DISPOSED") return true;
      if (String(state.lifecycle || "").toUpperCase() === "DISPOSED") return true;
    } catch (e) {}
    return false;
  }

  function cleanupSnapshot(session) {
    var hostState = "";
    var host = null;
    var dispatcher = null;
    try { if (session && session.host && session.host.getState) hostState = String(session.host.getState() || ""); } catch (e0) {}
    try { if (session && session.host && session.host.snapshot) host = clonePlain(session.host.snapshot()); } catch (e1) {}
    try { if (session && session.dispatcher && session.dispatcher.getState) dispatcher = clonePlain(session.dispatcher.getState()); } catch (e2) {}
    var callbackRegistered = false;
    var receiverRegistered = false;
    try { callbackRegistered = session && session.callbackRegistered === true; } catch (e3) {}
    try { receiverRegistered = session && session.receiverRegistered === true; } catch (e4) {}
    return {
      hostState: hostState,
      host: host,
      dispatcher: dispatcher,
      dispatcherDisposed: dispatcherDisposed(dispatcher),
      callbackRegistered: callbackRegistered,
      receiverRegistered: receiverRegistered,
      clean: hostState === "DISPOSED" && callbackRegistered === false && receiverRegistered === false && dispatcherDisposed(dispatcher)
    };
  }

  function evaluateReport(report) {
    var passed = 0;
    var errors = 0;
    var keys = ["predictiveCancel", "predictiveInvoke", "recentapps", "homekey"];
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

  function publishLatest(report) {
    var file = latestFile();
    if (!file) return false;
    var payload = {};
    var text = readText(file);
    if (text) {
      try { payload = JSON.parse(text); } catch (e0) { payload = {}; }
    }
    if (!payload || typeof payload !== "object") payload = {};
    payload.gestureFinal = clonePlain(report);
    payload.savedAt = now();
    if (report.complete === true) payload.ok = payload.ok !== false && report.ok === true;
    return writeJsonAtomic(file, payload);
  }

  function persist(app) {
    var report = loadReport(app);
    evaluateReport(report);
    var ok = writeJsonAtomic(reportFile(), report);
    publishLatest(report);
    return ok;
  }

  function toast(text) {
    try {
      var handler = new android.os.Handler(android.os.Looper.getMainLooper());
      handler.post(new java.lang.Runnable({
        run: function () {
          try { android.widget.Toast.makeText(context, String(text || ""), android.widget.Toast.LENGTH_LONG).show(); } catch (e0) {}
        }
      }));
    } catch (e1) {}
  }

  function statCopy(session) {
    var stats = {};
    try { stats = clonePlain(session && session.stats ? session.stats : {}) || {}; } catch (e) { stats = {}; }
    return stats;
  }

  function timeoutInText(value) {
    var text = "";
    try { text = JSON.stringify(value || {}); } catch (e0) { text = String(value || ""); }
    return text.indexOf("DETACH_TIMEOUT") >= 0 || text.indexOf('"detachTimedOut":true') >= 0 || text.indexOf('"timedOut":true') >= 0;
  }

  function finishCase(app, active, ok, code, extra) {
    if (!active || active.finished === true) return;
    active.finished = true;
    var report = loadReport(app);
    var key = caseKey(active.name);
    var result = active.result;
    result.ok = ok === true;
    result.status = ok === true ? "passed" : "failed";
    result.code = String(code || (ok ? "PASSED" : "FAILED"));
    result.finishedAt = now();
    result.durationMs = Math.max(0, result.finishedAt - Number(result.startedAt || result.finishedAt));
    result.ready = active.ready === true;
    result.finalStats = statCopy(active.session);
    result.dispatchResult = clonePlain(active.dispatchResult || null);
    result.closeResult = clonePlain(active.closeResult || (app.state ? app.state.shortXUiGestureLastResult : null));
    result.cleanup = cleanupSnapshot(active.session);
    if (extra) result.detail = clonePlain(extra);
    report.cases[key] = result;
    report.activeCase = "";
    app.state.shortXUiGestureFinalActive = null;
    persist(app);
    refresh(app);
    log(app, ok ? "i" : "e", "GESTURE_FINAL_CASE_DONE name=" + active.name + " ok=" + String(ok === true) + " code=" + result.code + " duration=" + String(result.durationMs));
  }

  function sampleEvents(active) {
    if (!active || !active.session) return false;
    var changed = false;
    var stats = statCopy(active.session);
    var previous = active.lastStats || {};
    if (Number(stats.backStarted || 0) > Number(previous.backStarted || 0)) {
      event(active.result, "back_started", { count: Number(stats.backStarted || 0) });
      changed = true;
    }
    if (Number(stats.backProgressed || 0) > Number(previous.backProgressed || 0) && active.progressRecorded !== true) {
      active.progressRecorded = true;
      event(active.result, "back_progress", {
        count: Number(stats.backProgressed || 0),
        maxProgress: Number(stats.maxProgress || 0)
      });
      changed = true;
    }
    if (Number(stats.backCancelled || 0) > Number(previous.backCancelled || 0)) {
      event(active.result, "back_cancelled", { count: Number(stats.backCancelled || 0) });
      changed = true;
    }
    if (Number(stats.backInvoked || 0) > Number(previous.backInvoked || 0)) {
      event(active.result, "back_invoked", { count: Number(stats.backInvoked || 0) });
      changed = true;
    }
    if (Number(stats.recentsDismisses || 0) > Number(previous.recentsDismisses || 0)) {
      event(active.result, "recentapps_received", { count: Number(stats.recentsDismisses || 0) });
      changed = true;
    }
    if (Number(stats.homeDismisses || 0) > Number(previous.homeDismisses || 0)) {
      event(active.result, "home_received", { count: Number(stats.homeDismisses || 0) });
      changed = true;
    }
    var transitions = [];
    try { transitions = active.session.transitions || []; } catch (e0) { transitions = []; }
    while (active.transitionIndex < transitions.length && active.result.events.length < MAX_EVENTS) {
      var transition = transitions[active.transitionIndex];
      event(active.result, "transition", transition);
      active.transitionIndex += 1;
      changed = true;
    }
    active.lastStats = stats;
    active.result.stats = stats;
    active.result.progress = Number(active.session.progress || 0);
    active.result.callbackRegistered = active.session.callbackRegistered === true;
    active.result.receiverRegistered = active.session.receiverRegistered === true;
    return changed;
  }

  function monitorCase(app, active) {
    if (!active || active.finished === true) return;
    if (!app.state || app.state.shortXUiGestureFinalActive !== active) return;
    var currentSession = app.state.shortXUiGestureSession || null;
    var eventsChanged = sampleEvents(active);

    if (!active.ready) {
      var callbackReady = active.session && active.session.callbackRegistered === true;
      var receiverReady = active.session && active.session.receiverRegistered === true;
      if ((active.name === "recentapps" || active.name === "homekey") ? (callbackReady && receiverReady) : callbackReady) {
        active.ready = true;
        active.result.ready = true;
        active.result.status = "ready";
        active.result.instruction = instruction(active.name, true);
        event(active.result, "ready", {
          callbackType: String(active.session.callbackType || ""),
          callbackPriority: Number(active.session.callbackPriority || 0),
          receiverRegistered: receiverReady
        });
        persist(app);
        refresh(app);
        toast(active.result.instruction);
      }
    }

    var stats = statCopy(active.session);
    if (active.name === "predictive_cancel" &&
        Number(stats.backStarted || 0) >= 1 &&
        Number(stats.backProgressed || 0) >= 1 &&
        Number(stats.backCancelled || 0) >= 1) {
      var cancelOk = Number(stats.backInvoked || 0) === 0 && currentSession === active.session &&
        Number(active.session.progress || 0) === 0;
      finishCase(app, active, cancelOk, cancelOk ? "PREDICTIVE_CANCEL_VERIFIED" : "PREDICTIVE_CANCEL_STATE_INVALID", {
        sessionStillOpen: currentSession === active.session,
        progressReset: Number(active.session.progress || 0) === 0
      });
      try { app.closeShortXUiGestureWindow(true, "final_probe_cancel_complete"); } catch (eCloseCancel) {}
      return;
    }

    if (currentSession !== active.session) {
      var closeResult = app.state ? app.state.shortXUiGestureLastResult : null;
      active.closeResult = clonePlain(closeResult);
      var cleanup = cleanupSnapshot(active.session);
      var hasTimeout = timeoutInText(active.dispatchResult) || timeoutInText(closeResult) || timeoutInText(cleanup);
      var statsAfter = statCopy(active.session);
      var closeLatency = active.closeRequestedAt ? Math.max(0, now() - active.closeRequestedAt) : Math.max(0, now() - active.startedAt);
      var ok = false;
      var code = "CLOSED_WITHOUT_EXPECTED_SIGNAL";
      if (active.name === "predictive_invoke") {
        ok = Number(statsAfter.backStarted || 0) >= 1 && Number(statsAfter.backProgressed || 0) >= 1 &&
          Number(statsAfter.backInvoked || 0) >= 1 && cleanup.clean === true && !hasTimeout;
        code = ok ? "PREDICTIVE_INVOKE_VERIFIED" : "PREDICTIVE_INVOKE_CLEANUP_FAILED";
      } else if (active.name === "recentapps") {
        ok = Number(statsAfter.recentsDismisses || 0) >= 1 && active.closeReason === "recentapps" &&
          cleanup.clean === true && !hasTimeout && closeLatency < SYSTEM_CLOSE_TIMEOUT_MS;
        code = ok ? "RECENTS_ASYNC_CLOSE_VERIFIED" : "RECENTS_ASYNC_CLOSE_FAILED";
      } else if (active.name === "homekey") {
        ok = Number(statsAfter.homeDismisses || 0) >= 1 && active.closeReason === "homekey" &&
          cleanup.clean === true && !hasTimeout && closeLatency < SYSTEM_CLOSE_TIMEOUT_MS;
        code = ok ? "HOME_ASYNC_CLOSE_VERIFIED" : "HOME_ASYNC_CLOSE_FAILED";
      }
      finishCase(app, active, ok, code, {
        closeLatencyMs: closeLatency,
        timeoutDetected: hasTimeout,
        cleanup: cleanup
      });
      return;
    }

    if (now() - active.startedAt >= CASE_TIMEOUT_MS) {
      finishCase(app, active, false, "CASE_TIMEOUT", { instruction: active.result.instruction });
      try { app.closeShortXUiGestureWindow(true, "final_probe_timeout"); } catch (eTimeoutClose) {}
      return;
    }

    if (eventsChanged || now() - Number(active.lastPersistAt || 0) >= 1000) {
      active.lastPersistAt = now();
      persist(app);
      refresh(app);
    }
    active.handler.postDelayed(new java.lang.Runnable({
      run: function () { monitorCase(app, active); }
    }), POLL_MS);
  }

  var oldOpen = proto.openShortXUiGestureWindow;
  var oldClose = proto.closeShortXUiGestureWindow;

  proto.closeShortXUiGestureWindow = function (immediate, reason) {
    var active = this.state ? this.state.shortXUiGestureFinalActive : null;
    var closeReason = String(reason || "");
    if (active && active.finished !== true) {
      if (closeReason === "recentapps" || closeReason === "homekey" || closeReason.indexOf("system_back:") === 0) {
        active.closeRequestedAt = now();
        active.closeReason = closeReason === "recentapps" ? "recentapps" : (closeReason === "homekey" ? "homekey" : closeReason);
        event(active.result, "close_requested", { immediate: immediate === true, reason: closeReason });
      }
    }
    var result = oldClose.apply(this, arguments);
    if (active && active.finished !== true &&
        (closeReason === "recentapps" || closeReason === "homekey" || closeReason.indexOf("system_back:") === 0)) {
      active.dispatchResult = clonePlain(result);
      event(active.result, "close_dispatch_result", result);
      persist(this);
      refresh(this);
    }
    return result;
  };

  proto.startShortXUiGestureFinalCase = function (name) {
    if (!this.state) this.state = {};
    var key = caseKey(name);
    if (!key) return { ok: false, code: "CASE_UNKNOWN", name: String(name || "") };
    var existing = this.state.shortXUiGestureFinalActive;
    if (existing && existing.finished !== true) return { ok: false, code: "CASE_ALREADY_RUNNING", name: existing.name };
    try { oldClose.call(this, true, "final_probe_reset"); } catch (e0) {}

    var report = loadReport(this);
    var result = {
      name: String(name),
      label: caseLabel(name),
      ok: false,
      status: "opening",
      code: "OPENING",
      startedAt: now(),
      finishedAt: 0,
      durationMs: 0,
      ready: false,
      instruction: instruction(name, false),
      events: [],
      stats: {},
      closeResult: null,
      cleanup: null
    };
    report.cases[key] = result;
    report.activeCase = String(name);
    persist(this);

    var opened = oldOpen.call(this, 1);
    if (!opened || opened.ok !== true) {
      result.status = "failed";
      result.code = "OPEN_FAILED";
      result.finishedAt = now();
      result.durationMs = Math.max(0, result.finishedAt - result.startedAt);
      result.detail = clonePlain(opened);
      report.activeCase = "";
      persist(this);
      refresh(this);
      return { ok: false, code: "OPEN_FAILED", detail: opened };
    }

    var session = this.state.shortXUiGestureSession;
    var active = {
      name: String(name),
      key: key,
      startedAt: result.startedAt,
      result: result,
      session: session,
      handler: new android.os.Handler(android.os.Looper.getMainLooper()),
      lastStats: {},
      transitionIndex: 0,
      progressRecorded: false,
      ready: false,
      finished: false,
      closeRequestedAt: 0,
      closeReason: "",
      closeResult: null,
      dispatchResult: null,
      lastPersistAt: now()
    };
    this.state.shortXUiGestureFinalActive = active;
    result.status = "waiting_registration";
    event(result, "window_opened", clonePlain(opened));
    persist(this);
    refresh(this);
    toast(result.instruction);
    var self = this;
    active.handler.postDelayed(new java.lang.Runnable({ run: function () { monitorCase(self, active); } }), POLL_MS);
    return { ok: true, code: "CASE_STARTED", name: active.name, instruction: result.instruction };
  };

  proto.runShortXUiGestureFinalLogicStress = function () {
    if (!this.state) this.state = {};
    if (this.state.shortXUiGestureFinalActive) return { ok: false, code: "PHYSICAL_CASE_RUNNING" };
    var report = loadReport(this);
    report.logicStress = {
      ok: false,
      running: true,
      code: "RUNNING",
      startedAt: now(),
      finishedAt: 0,
      durationMs: 0,
      result: null
    };
    persist(this);
    refresh(this);
    var start = this.runShortXUiGestureStress();
    if (!start) {
      report.logicStress.running = false;
      report.logicStress.code = "START_FAILED";
      report.logicStress.finishedAt = now();
      persist(this);
      refresh(this);
      return report.logicStress;
    }
    var self = this;
    var handler = new android.os.Handler(android.os.Looper.getMainLooper());
    function poll() {
      var current = self.state ? self.state.shortXUiGestureStressResult : null;
      if (current && current.running !== true) {
        report.logicStress.running = false;
        report.logicStress.ok = current.ok === true;
        report.logicStress.code = current.ok === true ? "LOGIC_STRESS_VERIFIED" : "LOGIC_STRESS_FAILED";
        report.logicStress.finishedAt = now();
        report.logicStress.durationMs = Math.max(0, report.logicStress.finishedAt - report.logicStress.startedAt);
        report.logicStress.result = clonePlain(current);
        persist(self);
        refresh(self);
        log(self, report.logicStress.ok ? "i" : "e", "GESTURE_FINAL_LOGIC_STRESS ok=" + String(report.logicStress.ok));
        return;
      }
      if (now() - report.logicStress.startedAt > 30000) {
        report.logicStress.running = false;
        report.logicStress.ok = false;
        report.logicStress.code = "LOGIC_STRESS_TIMEOUT";
        report.logicStress.finishedAt = now();
        report.logicStress.durationMs = Math.max(0, report.logicStress.finishedAt - report.logicStress.startedAt);
        report.logicStress.result = clonePlain(current);
        persist(self);
        refresh(self);
        return;
      }
      handler.postDelayed(new java.lang.Runnable({ run: poll }), 150);
    }
    handler.postDelayed(new java.lang.Runnable({ run: poll }), 150);
    return report.logicStress;
  };

  proto.refreshShortXUiGestureFinalProbe = function () {
    var report = loadReport(this);
    persist(this);
    refresh(this);
    return clonePlain(report);
  };

  proto.resetShortXUiGestureFinalProbe = function () {
    if (!this.state) this.state = {};
    var active = this.state.shortXUiGestureFinalActive;
    if (active) active.finished = true;
    this.state.shortXUiGestureFinalActive = null;
    this.state.shortXUiGestureFinalReport = blankReport();
    try { oldClose.call(this, true, "final_probe_reset"); } catch (e0) {}
    persist(this);
    refresh(this);
    return clonePlain(this.state.shortXUiGestureFinalReport);
  };

  function shortStatus(item) {
    if (!item) return "未测试";
    if (item.status === "passed") return "通过";
    if (item.status === "failed") return "失败:" + String(item.code || "");
    return String(item.status || "进行中");
  }

  function format(app) {
    var report = loadReport(app);
    var active = app.state ? app.state.shortXUiGestureFinalActive : null;
    var lines = [];
    lines.push("Phase 4 最终物理补测：" + (report.complete ? (report.ok ? "通过" : "失败") : "未完成"));
    lines.push("版本=" + VERSION + " 通过=" + String(report.summary.passedCases) + "/4 逻辑=" + String(report.summary.logicStressPassed));
    lines.push("预测取消=" + shortStatus(report.cases.predictiveCancel));
    lines.push("预测提交=" + shortStatus(report.cases.predictiveInvoke));
    lines.push("最近任务=" + shortStatus(report.cases.recentapps));
    lines.push("Home=" + shortStatus(report.cases.homekey));
    if (report.logicStress) lines.push("30次逻辑=" + (report.logicStress.running ? "运行中" : (report.logicStress.ok ? "通过" : "失败:" + String(report.logicStress.code || ""))));
    else lines.push("30次逻辑=未测试");
    if (active && active.finished !== true) {
      lines.push("");
      lines.push("当前=" + caseLabel(active.name) + " ready=" + String(active.ready));
      lines.push(String(active.result.instruction || ""));
      var stats = statCopy(active.session);
      lines.push("started=" + String(Number(stats.backStarted || 0)) +
        " progress=" + String(Number(stats.backProgressed || 0)) +
        " cancel=" + String(Number(stats.backCancelled || 0)) +
        " invoke=" + String(Number(stats.backInvoked || 0)));
      lines.push("recents=" + String(Number(stats.recentsDismisses || 0)) +
        " home=" + String(Number(stats.homeDismisses || 0)) +
        " errors=" + String(Number(stats.errors || 0)));
    }
    lines.push("");
    lines.push("报告：diagnostics/shortx-ui/gesture-final.json");
    return lines.join("\n");
  }

  function refresh(app) {
    if (!app || !app.state || !app.state.shortXUiGestureFinalStatusView) return;
    var view = app.state.shortXUiGestureFinalStatusView;
    try {
      new android.os.Handler(android.os.Looper.getMainLooper()).post(new java.lang.Runnable({
        run: function () { try { view.setText(format(app)); } catch (e0) {} }
      }));
    } catch (e1) {}
  }

  var oldBuildLab = proto.buildShortXUiLabPanelView;
  if (typeof oldBuildLab === "function") {
    proto.buildShortXUiLabPanelView = function () {
      var panel = oldBuildLab.call(this);
      var self = this;
      try {
        loadReport(this);
        var scroll = panel.getChildAt(panel.getChildCount() - 1);
        var content = scroll && scroll.getChildCount ? scroll.getChildAt(0) : null;
        if (!content || !content.addView) return panel;
        var m = global.ShortXUI.Metrics.create(context);
        var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
        var primary = T ? T.primary : android.graphics.Color.parseColor("#FF6750A4");
        var onSurface = T ? T.onSurface : android.graphics.Color.WHITE;
        var onSurface2 = T ? T.onSurface2 : android.graphics.Color.LTGRAY;
        var surface = T ? T.surface : android.graphics.Color.parseColor("#FF202124");
        var surface2 = T ? T.surface2 : android.graphics.Color.parseColor("#FF2B2C30");
        var outline = T ? T.outlineVariant : android.graphics.Color.GRAY;

        var box = new android.widget.LinearLayout(context);
        box.setOrientation(android.widget.LinearLayout.VERTICAL);
        box.setPadding(m.dp(12), m.dp(10), m.dp(12), m.dp(12));
        box.setBackground(global.ShortXUI.Shape.strokeRect(surface2, outline, m.dp(1), m.dp(16)));

        var title = new android.widget.TextView(context);
        title.setText("Phase 4 最终物理返回补测");
        title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        global.ShortXUI.Color.applyText(title, onSurface);
        box.addView(title, new android.widget.LinearLayout.LayoutParams(-1, -2));

        var desc = new android.widget.TextView(context);
        desc.setText("分别采集 Android 14 预测返回取消/提交，以及最近任务和 Home 的异步关闭证据。每项单独落盘，可分多次完成。");
        desc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
        desc.setPadding(0, m.dp(3), 0, m.dp(8));
        global.ShortXUI.Color.applyText(desc, onSurface2);
        box.addView(desc, new android.widget.LinearLayout.LayoutParams(-1, -2));

        var status = new android.widget.TextView(context);
        status.setText(format(this));
        status.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 10);
        status.setTypeface(android.graphics.Typeface.MONOSPACE);
        status.setPadding(m.dp(10), m.dp(9), m.dp(10), m.dp(9));
        status.setBackground(global.ShortXUI.Shape.roundRect(surface, m.dp(12)));
        global.ShortXUI.Color.applyText(status, onSurface2);
        box.addView(status, new android.widget.LinearLayout.LayoutParams(-1, -2));
        this.state.shortXUiGestureFinalStatusView = status;

        function addRow(items) {
          var row = new android.widget.LinearLayout(context);
          row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
          var i;
          for (i = 0; i < items.length; i += 1) {
            var button = self.ui.createFlatButton(self, items[i].title, primary, items[i].action);
            var lp = new android.widget.LinearLayout.LayoutParams(0, m.dp(46), 1);
            if (i > 0) lp.leftMargin = m.dp(6);
            row.addView(button, lp);
          }
          var rowLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
          rowLp.topMargin = m.dp(7);
          box.addView(row, rowLp);
        }

        addRow([
          { title: "预测返回取消", action: function () { self.startShortXUiGestureFinalCase("predictive_cancel"); refresh(self); } },
          { title: "预测返回提交", action: function () { self.startShortXUiGestureFinalCase("predictive_invoke"); refresh(self); } }
        ]);
        addRow([
          { title: "最近任务关闭", action: function () { self.startShortXUiGestureFinalCase("recentapps"); refresh(self); } },
          { title: "Home 关闭", action: function () { self.startShortXUiGestureFinalCase("homekey"); refresh(self); } }
        ]);
        addRow([
          { title: "运行 30 次逻辑循环", action: function () { self.runShortXUiGestureFinalLogicStress(); refresh(self); } },
          { title: "刷新报告", action: function () { self.refreshShortXUiGestureFinalProbe(); } }
        ]);
        addRow([
          { title: "重置最终补测", action: function () { self.resetShortXUiGestureFinalProbe(); } }
        ]);

        var lpBox = new android.widget.LinearLayout.LayoutParams(-1, -2);
        lpBox.bottomMargin = m.dp(10);
        content.addView(box, lpBox);
      } catch (error) {
        log(this, "e", "build Phase4 final probe section failed: " + errorText(error));
      }
      return panel;
    };
  }

  var oldGetState = proto.getShortXUiLabState;
  if (typeof oldGetState === "function") {
    proto.getShortXUiLabState = function () {
      var state = oldGetState.call(this) || {};
      state.gestureFinal = clonePlain(loadReport(this));
      return state;
    };
  }

  global.ToolHubBetaPhase4Final = {
    VERSION: VERSION,
    CASE_TIMEOUT_MS: CASE_TIMEOUT_MS,
    SYSTEM_CLOSE_TIMEOUT_MS: SYSTEM_CLOSE_TIMEOUT_MS,
    REPORT_PATH: "diagnostics/shortx-ui/gesture-final.json"
  };
  proto.__toolHubShortXUiGestureFinalProbeInstalled = true;
  try { writeLog("ShortXUI Gesture final probe installed version=" + VERSION); } catch (eLog) {}
}(function () { return this; }()));
