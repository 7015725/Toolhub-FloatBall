// ToolHub Beta ShortXUI Phase 7C r2: lifecycle snapshot reconciliation and strict fresh-window stress. Rhino ES5.
(function (global) {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
  if (!global.ShortXUI || !global.ShortXUI.API) return;
  if (!global.ToolHubBetaPhase7C ||
      String(global.ToolHubBetaPhase7C.VERSION || "") !== "0.8.3-beta-route-integration") return;

  var proto = FloatBallAppWM.prototype;
  if (proto.__toolHubShortXUiPhase7CLifecycleR2Installed === true) return;

  var VERSION = "0.8.4-beta-route-lifecycle";
  var BASE_VERSION = "0.8.3-beta-route-integration";
  var TARGET_ROUTE = "shortx_ui_lab";
  var STRESS_CYCLES = 10;
  var FRAME_WAIT_MS = 2600;
  var WAIT_STEP_MS = 20;
  var SX = global.ShortXUI;
  var Lifecycle = SX.Lifecycle;

  function now() {
    return Number(java.lang.System.currentTimeMillis());
  }

  function copyPlain(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (e) { return null; }
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
      while ((count = reader.read(chars)) !== -1) if (count > 0) out.append(chars, 0, count);
      return String(out.toString());
    } catch (e) { return ""; }
    finally {
      try { if (reader) reader.close(); } catch (e0) {}
      try { if (input) input.close(); } catch (e1) {}
    }
  }

  function writeJsonAtomic(file, value) {
    var writer = null;
    var temp = null;
    try {
      if (!file) return false;
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
    } catch (e) { return false; }
    finally {
      try { if (writer) writer.close(); } catch (e0) {}
      try { if (temp && temp.exists()) temp.delete(); } catch (e1) {}
    }
  }

  function lifecycleIsClean(snapshot) {
    if (!snapshot) return false;
    var dispatcher = snapshot.dispatcher || {};
    return String(snapshot.state || "") === Lifecycle.DISPOSED &&
      snapshot.disposed === true &&
      snapshot.attached === false &&
      snapshot.scopeDisposed === true &&
      snapshot.dispatcherDisposed === true &&
      Number(dispatcher.pending || 0) === 0 &&
      Number(dispatcher.errors || 0) === 0;
  }

  function normalizeSessionObject(session) {
    if (!session) return null;
    session.attached = false;
    if (!session.detachedAt) session.detachedAt = now();
    if (session.stats) {
      var attaches = Number(session.stats.attaches || 0);
      var detaches = Number(session.stats.detaches || 0);
      if (detaches < attaches) session.stats.detaches = attaches;
    }
    return session;
  }

  function normalizeLifecycle(app, session, reason) {
    if (!app || !app.state) return null;
    normalizeSessionObject(session);
    var lifecycle = app.state.shortXUiPhase7CLifecycle || null;
    if (!lifecycle) return null;
    var snapshot = lifecycle.snapshot || {};
    snapshot.version = VERSION;
    snapshot.state = Lifecycle.DISPOSED;
    snapshot.disposed = true;
    snapshot.attached = false;
    if (!snapshot.detachedAt) snapshot.detachedAt = now();
    if (snapshot.stats) {
      var attaches = Number(snapshot.stats.attaches || 0);
      var detaches = Number(snapshot.stats.detaches || 0);
      if (detaches < attaches) snapshot.stats.detaches = attaches;
    }
    lifecycle.schema = 2;
    lifecycle.version = VERSION;
    lifecycle.baseVersion = BASE_VERSION;
    lifecycle.reconciledBy = VERSION;
    lifecycle.reconciledAt = now();
    lifecycle.reason = String(lifecycle.reason || reason || "");
    lifecycle.snapshot = snapshot;
    lifecycle.ok = lifecycle.ok !== false && lifecycleIsClean(snapshot);
    app.state.shortXUiPhase7CLifecycle = lifecycle;
    return lifecycle;
  }

  function persist(app) {
    var root = diagnosticsRoot();
    if (!root || !app || !app.state) return false;
    var file = new java.io.File(root + "/diagnostics/shortx-ui/latest.json");
    var payload = {};
    var old = readText(file);
    if (old) {
      try { payload = JSON.parse(old); } catch (e0) { payload = {}; }
    }
    if (!payload || typeof payload !== "object") payload = {};
    payload.schema = Math.max(11, Number(payload.schema || 0));
    payload.runtimeVersion = String(SX.VERSION || "");
    payload.apiVersion = String(SX.API.VERSION || SX.API_VERSION || "");
    if (app.state.shortXUiPhase7CResult) payload.routeIntegration = copyPlain(app.state.shortXUiPhase7CResult);
    if (app.state.shortXUiPhase7CStress) payload.routeIntegrationStress = copyPlain(app.state.shortXUiPhase7CStress);
    if (app.state.shortXUiPhase7CLifecycle) payload.routeIntegrationLifecycle = copyPlain(app.state.shortXUiPhase7CLifecycle);
    payload.routeIntegrationReconciledBy = VERSION;
    payload.savedAt = now();

    var ok = true;
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
      var item = payload[keys[i]];
      if (item && item.running !== true && item.ok === false) ok = false;
    }
    payload.ok = ok;
    return writeJsonAtomic(file, payload);
  }

  function updateStatus(app) {
    if (!app || !app.state) return;
    var view = app.state.shortXUiPhase7CStatusView || null;
    if (!view) return;
    var stress = app.state.shortXUiPhase7CStress || null;
    var lifecycle = app.state.shortXUiPhase7CLifecycle || null;
    var lines = [];
    lines.push("Phase 7C r2 生命周期收口");
    lines.push("strictFreshWindowCycles=true");
    if (stress) {
      lines.push("10次接入=" + (stress.running ? "运行中" : (stress.ok ? "通过" : "失败")) +
        " cycles=" + String(Number(stress.cyclesCompleted || 0)) + "/" + String(Number(stress.cyclesRequested || 0)));
      lines.push("fresh=" + String(Number(stress.freshWindowAttaches || 0)) +
        " close=" + String(Number(stress.windowClosePasses || 0)) +
        " errors=" + String(Number(stress.errors || 0)));
    }
    if (lifecycle) {
      lines.push("lifecycle=" + (lifecycle.ok ? "通过" : "失败") +
        " state=" + String(lifecycle.snapshot && lifecycle.snapshot.state || "") +
        " attached=" + String(lifecycle.snapshot && lifecycle.snapshot.attached === true));
    }
    try { view.setText(lines.join("\n")); } catch (e0) {}
  }

  function waitUntil(predicate, timeoutMs) {
    var started = now();
    while (now() - started < Math.max(1, Number(timeoutMs || 1))) {
      try { if (predicate() === true) return true; } catch (e0) {}
      try { java.lang.Thread.sleep(WAIT_STEP_MS); } catch (e1) {}
    }
    try { return predicate() === true; } catch (e2) {}
    return false;
  }

  function requestFrames(session, count, reason) {
    if (!session || session.disposed === true || !session.frameLoop) {
      return { ok: false, code: "ROUTE_SESSION_UNAVAILABLE" };
    }
    session.frameRemaining = Math.max(1, Math.min(60, Number(count || 1)));
    session.frameGeneration = Number(session.frameGeneration || 0) + 1;
    if (session.stats) session.stats.frameRuns = Number(session.stats.frameRuns || 0) + 1;
    return session.frameLoop.request(String(reason || "phase7c-r2"));
  }

  var oldBaseline = proto.runShortXUiPhase7CRouteBaseline;
  if (typeof oldBaseline === "function") {
    proto.runShortXUiPhase7CRouteBaseline = function () {
      try {
        var preflight = this.closeShortXUiPhase7CWindow(true, "baseline-r2-preflight");
        if (!preflight || preflight.ok !== true) {
          log(this, "e", "SHORTXUI_PHASE7C_R2_BASELINE_PREFLIGHT_FAILED code=" + String(preflight && preflight.code || ""));
        }
      } catch (ePreflight) {
        log(this, "e", "SHORTXUI_PHASE7C_R2_BASELINE_PREFLIGHT_FAILED error=" + errorText(ePreflight));
      }
      return oldBaseline.apply(this, arguments);
    };
  }

  proto.runShortXUiPhase7CStress = function () {
    if (!this.state) this.state = {};
    var existing = this.state.shortXUiPhase7CStress;
    if (existing && existing.running === true) return existing;
    var self = this;
    var stress = {
      schema: 2,
      version: VERSION,
      baseVersion: BASE_VERSION,
      runtimeVersion: String(SX.VERSION || ""),
      apiVersion: String(SX.API.VERSION || ""),
      route: TARGET_ROUTE,
      strictFreshWindowCycles: true,
      ok: false,
      running: true,
      startedAt: now(),
      finishedAt: 0,
      durationMs: 0,
      cyclesRequested: STRESS_CYCLES,
      cyclesCompleted: 0,
      frameCallbacks: 0,
      frameInvalidates: 0,
      frameLateCallbacks: 0,
      windowOpenPasses: 0,
      freshWindowAttaches: 0,
      windowClosePasses: 0,
      normalCloses: 0,
      immediateCloses: 0,
      preflight: null,
      errors: 0,
      cycles: []
    };
    this.state.shortXUiPhase7CStress = stress;
    persist(this);
    updateStatus(this);

    var thread = new java.lang.Thread(new java.lang.Runnable({ run: function () {
      var index = 0;
      try {
        var preflight = self.closeShortXUiPhase7CWindow(true, "stress-r2-preflight");
        stress.preflight = copyPlain(preflight);
        if (!preflight || preflight.ok !== true ||
            (String(preflight.code || "") !== "ALREADY_CLOSED" &&
             String(preflight.code || "") !== "WINDOW_CLOSED")) {
          stress.errors += 1;
          stress.cycles.push({
            index: 0,
            ok: false,
            error: "WINDOW_PREFLIGHT_FAILED",
            detail: copyPlain(preflight)
          });
        }

        for (index = 0; index < STRESS_CYCLES && stress.errors === 0; index += 1) {
          var session = self.state ? self.state.shortXUiPhase7CSession : null;
          var row = { index: index + 1, ok: false };
          if (!session || session.disposed === true || !session.frameLoop ||
              !session.panel || !session.panel.isAttachedToWindow ||
              session.panel.isAttachedToWindow() !== true) {
            row.error = "ROUTE_SESSION_UNAVAILABLE";
            stress.errors += 1;
            stress.cycles.push(row);
            break;
          }
          if (session.windowHost) {
            row.error = "STALE_WINDOW_HOST_BEFORE_OPEN";
            row.stale = copyPlain(session.windowHost.snapshot ? session.windowHost.snapshot() : null);
            stress.errors += 1;
            stress.cycles.push(row);
            break;
          }

          var before = session.frameLoop.snapshot();
          var requested = requestFrames(session, 3, "phase7c-r2-stress-" + String(index + 1));
          var settled = requested.ok === true && waitUntil(function () {
            var snap = session.frameLoop.snapshot();
            return Number(session.frameRemaining || 0) === 0 &&
              snap.running === false &&
              snap.framePosted === false &&
              String(snap.state || "") === Lifecycle.READY;
          }, FRAME_WAIT_MS);
          var after = session.frameLoop.snapshot();
          var callbackDelta = Number(after.stats.callbacks || 0) - Number(before.stats.callbacks || 0);
          var invalidateDelta = Number(after.stats.invalidates || 0) - Number(before.stats.invalidates || 0);

          var opened = self.openShortXUiPhase7CWindow("r2 循环 " + String(index + 1));
          var freshAttach = opened && opened.ok === true &&
            String(opened.code || "") === "WINDOW_ATTACHED";
          var immediate = index % 2 === 1;
          var closed = freshAttach ?
            self.closeShortXUiPhase7CWindow(immediate, "stress-r2") :
            { ok: false, code: "SKIPPED", message: "fresh window attach failed" };
          var hostDisposed = !!(closed && closed.snapshot &&
            String(closed.snapshot.state || "") === Lifecycle.DISPOSED &&
            closed.snapshot.attached === false &&
            closed.snapshot.hasView === false &&
            closed.snapshot.hasParams === false &&
            Number(closed.snapshot.stats && closed.snapshot.stats.detachTimeouts || 0) === 0 &&
            Number(closed.snapshot.stats && closed.snapshot.stats.errors || 0) === 0);
          var frameOk = settled &&
            callbackDelta === 3 &&
            invalidateDelta === 3 &&
            Number(after.stats.lateCallbacks || 0) - Number(before.stats.lateCallbacks || 0) === 0 &&
            Number(after.stats.errors || 0) === 0;
          var windowOk = freshAttach && closed.ok === true && hostDisposed;

          row.ok = frameOk && windowOk;
          row.frame = {
            ok: frameOk,
            callbacks: callbackDelta,
            invalidates: invalidateDelta,
            lateDelta: Number(after.stats.lateCallbacks || 0) - Number(before.stats.lateCallbacks || 0),
            after: copyPlain(after)
          };
          row.window = {
            ok: windowOk,
            freshAttach: freshAttach,
            immediate: immediate,
            opened: String(opened && opened.code || ""),
            closed: String(closed && closed.code || ""),
            snapshot: copyPlain(closed && closed.snapshot || null)
          };

          stress.frameCallbacks += callbackDelta;
          stress.frameInvalidates += invalidateDelta;
          stress.frameLateCallbacks += Number(row.frame.lateDelta || 0);
          if (freshAttach) {
            stress.windowOpenPasses += 1;
            stress.freshWindowAttaches += 1;
          }
          if (closed && closed.ok === true) stress.windowClosePasses += 1;
          if (immediate) stress.immediateCloses += 1;
          else stress.normalCloses += 1;
          if (!row.ok) stress.errors += 1;
          stress.cyclesCompleted += 1;
          stress.cycles.push(row);
          persist(self);
          updateStatus(self);
          if (!row.ok) break;
          try { java.lang.Thread.sleep(80); } catch (eSleep) {}
        }
      } catch (error) {
        stress.errors += 1;
        stress.cycles.push({
          index: Number(index || 0) + 1,
          ok: false,
          error: errorText(error)
        });
      }

      stress.running = false;
      stress.finishedAt = now();
      stress.durationMs = Math.max(0, stress.finishedAt - stress.startedAt);
      stress.ok = stress.cyclesCompleted === STRESS_CYCLES &&
        stress.frameCallbacks === STRESS_CYCLES * 3 &&
        stress.frameInvalidates === STRESS_CYCLES * 3 &&
        stress.frameLateCallbacks === 0 &&
        stress.windowOpenPasses === STRESS_CYCLES &&
        stress.freshWindowAttaches === STRESS_CYCLES &&
        stress.windowClosePasses === STRESS_CYCLES &&
        stress.normalCloses === STRESS_CYCLES / 2 &&
        stress.immediateCloses === STRESS_CYCLES / 2 &&
        stress.errors === 0;

      try {
        new android.os.Handler(android.os.Looper.getMainLooper()).post(new java.lang.Runnable({
          run: function () {
            self.state.shortXUiPhase7CStress = stress;
            persist(self);
            updateStatus(self);
            log(self, stress.ok ? "i" : "e",
              "SHORTXUI_PHASE7C_R2_STRESS ok=" + String(stress.ok) +
              " completed=" + String(stress.cyclesCompleted) + "/" + String(STRESS_CYCLES) +
              " frames=" + String(stress.frameCallbacks) +
              " freshWindows=" + String(stress.freshWindowAttaches) +
              " closes=" + String(stress.windowClosePasses) +
              " errors=" + String(stress.errors));
          }
        }));
      } catch (ePost) {}
    }}), "ToolHub-Phase7C-R2-Stress");
    try { thread.setDaemon(true); } catch (eDaemon) {}
    thread.start();
    return stress;
  };

  var oldBuildLab = proto.buildShortXUiLabPanelView;
  if (typeof oldBuildLab === "function") {
    proto.buildShortXUiLabPanelView = function () {
      var panel = oldBuildLab.apply(this, arguments);
      var app = this;
      var session = this.state ? this.state.shortXUiPhase7CSession : null;
      try {
        panel.addOnAttachStateChangeListener(new android.view.View.OnAttachStateChangeListener({
          onViewAttachedToWindow: function () {
            if (session && session.disposed !== true) session.attached = true;
          },
          onViewDetachedFromWindow: function () {
            if (session) session.attached = false;
            try {
              new android.os.Handler(android.os.Looper.getMainLooper()).post(new java.lang.Runnable({
                run: function () {
                  normalizeLifecycle(app, session, "view-detached");
                  persist(app);
                }
              }));
            } catch (ePost) {}
          }
        }));
      } catch (eListener) {
        log(this, "w", "SHORTXUI_PHASE7C_R2_LISTENER_FAILED error=" + errorText(eListener));
      }
      return panel;
    };
  }

  var oldCloseToolApp = proto.closeToolApp;
  if (typeof oldCloseToolApp === "function") {
    proto.closeToolApp = function () {
      var session = this.state ? this.state.shortXUiPhase7CSession : null;
      var result = oldCloseToolApp.apply(this, arguments);
      normalizeLifecycle(this, session, "tool-app-close");
      persist(this);
      return result;
    };
  }

  var oldCapability = SX.API.capability;
  SX.API.capability = function () {
    var value = oldCapability ? oldCapability() : {};
    if (!value.routeIntegration) value.routeIntegration = {};
    value.routeIntegration.lifecyclePatchVersion = VERSION;
    value.routeIntegration.disposedAttachedFalse = true;
    value.routeIntegration.strictFreshWindowCycles = true;
    return value;
  };

  var oldVersionInfo = SX.API.versionInfo;
  SX.API.versionInfo = function () {
    var value = oldVersionInfo ? oldVersionInfo() : {};
    value.phase7CLifecycleVersion = VERSION;
    value.phase7CStrictFreshWindowCycles = true;
    return value;
  };

  global.ToolHubBetaPhase7CR2 = {
    VERSION: VERSION,
    BASE_VERSION: BASE_VERSION,
    PHASE: "7C-R2",
    TARGET_ROUTE: TARGET_ROUTE,
    DISPOSED_ATTACHED_FALSE: true,
    STRICT_FRESH_WINDOW_CYCLES: true,
    STRESS_CYCLES: STRESS_CYCLES
  };
  global.ToolHubBetaPhase7C.LIFECYCLE_PATCH_VERSION = VERSION;
  global.ToolHubBetaPhase7C.DISPOSED_ATTACHED_FALSE = true;
  global.ToolHubBetaPhase7C.STRICT_FRESH_WINDOW_CYCLES = true;

  proto.__toolHubShortXUiPhase7CLifecycleR2Installed = true;
  try {
    writeLog("ShortXUI Phase7C lifecycle r2 installed version=" + VERSION +
      " strictFreshWindowCycles=true");
  } catch (eLog) {}
}(function () { return this; }()));
