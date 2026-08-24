// ToolHub Beta ShortXUI Phase 7C: real ToolApp route integration and lifecycle ownership. Rhino ES5.
(function (global) {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
  if (!global.ShortXUI || global.ShortXUI.__runtimeInstalled !== true || !global.ShortXUI.API) return;
  if (!global.ToolHubBetaPhase7B || String(global.ToolHubBetaPhase7B.VERSION || "") !== "0.8.1-beta-components") return;

  var proto = FloatBallAppWM.prototype;
  if (proto.__toolHubShortXUiPhase7CRouteIntegrationInstalled === true) return;

  var VERSION = "0.8.3-beta-route-integration";
  var API_VERSION = "0.3.1-beta";
  var TARGET_ROUTE = "shortx_ui_lab";
  var STRESS_CYCLES = 10;
  var FRAME_WAIT_MS = 2600;
  var WAIT_STEP_MS = 20;

  var SX = global.ShortXUI;
  var Errors = SX.Errors;
  var Lifecycle = SX.Lifecycle;
  var Result = SX.Result;

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

  function persist(app) {
    var root = diagnosticsRoot();
    if (!root) return false;
    var file = new java.io.File(root + "/diagnostics/shortx-ui/latest.json");
    var payload = {};
    var old = readText(file);
    if (old) {
      try { payload = JSON.parse(old); } catch (e0) { payload = {}; }
    }
    if (!payload || typeof payload !== "object") payload = {};
    payload.schema = Math.max(10, Number(payload.schema || 0));
    payload.runtimeVersion = String(SX.VERSION || "");
    payload.apiVersion = String(SX.API.VERSION || SX.API_VERSION || "");
    payload.routeIntegration = copyPlain(app && app.state ? app.state.shortXUiPhase7CResult || null : null);
    payload.routeIntegrationStress = copyPlain(app && app.state ? app.state.shortXUiPhase7CStress || null : null);
    payload.routeIntegrationLifecycle = copyPlain(app && app.state ? app.state.shortXUiPhase7CLifecycle || null : null);
    payload.savedAt = now();
    var baseOk = payload.ok !== false;
    var r = payload.routeIntegration;
    var s = payload.routeIntegrationStress;
    if (r && r.running !== true && r.ok === false) baseOk = false;
    if (s && s.running !== true && s.ok === false) baseOk = false;
    payload.ok = baseOk;
    return writeJsonAtomic(file, payload);
  }

  function sessionSnapshot(session) {
    if (!session) {
      return {
        version: VERSION,
        route: TARGET_ROUTE,
        state: "IDLE",
        attached: false,
        disposed: true,
        frameLoop: null,
        windowHost: null,
        scopeDisposed: true,
        dispatcherDisposed: true,
        stats: null
      };
    }
    var attached = false;
    try { attached = !!(session.panel && session.panel.isAttachedToWindow && session.panel.isAttachedToWindow()); }
    catch (e0) {}
    return {
      version: VERSION,
      id: Number(session.id || 0),
      route: TARGET_ROUTE,
      state: String(session.state || ""),
      attached: attached,
      disposed: session.disposed === true,
      createdAt: Number(session.createdAt || 0),
      attachedAt: Number(session.attachedAt || 0),
      detachedAt: Number(session.detachedAt || 0),
      disposeReason: String(session.disposeReason || ""),
      frameRemaining: Number(session.frameRemaining || 0),
      frameLoop: session.frameLoop && session.frameLoop.snapshot ? session.frameLoop.snapshot() : null,
      windowHost: session.windowHost && session.windowHost.snapshot ? session.windowHost.snapshot() : null,
      scopeDisposed: !!(session.scope && session.scope.isDisposed && session.scope.isDisposed()),
      dispatcher: session.mainDispatcher && session.mainDispatcher.getState ? session.mainDispatcher.getState() : null,
      dispatcherDisposed: !!(session.mainDispatcher && session.mainDispatcher.getState && session.mainDispatcher.getState().disposed),
      wmDispatcher: session.wmDispatcher && session.wmDispatcher.getState ? session.wmDispatcher.getState() : null,
      stats: copyPlain(session.stats)
    };
  }

  function formatSession(app) {
    var session = app && app.state ? app.state.shortXUiPhase7CSession : null;
    var snap = sessionSnapshot(session);
    var result = app && app.state ? app.state.shortXUiPhase7CResult : null;
    var stress = app && app.state ? app.state.shortXUiPhase7CStress : null;
    var lines = [];
    lines.push("Phase 7C 真实页面接入：" + (snap.disposed ? "未激活" : "已激活"));
    lines.push("route=" + TARGET_ROUTE + " state=" + String(snap.state) + " attached=" + String(snap.attached));
    lines.push("API=" + String(SX.API.VERSION || "") + " FrameLoop=" + String(SX.FrameLoop && SX.FrameLoop.VERSION || ""));
    if (snap.frameLoop && snap.frameLoop.stats) {
      lines.push("frame callback=" + String(Number(snap.frameLoop.stats.callbacks || 0)) +
        " invalidate=" + String(Number(snap.frameLoop.stats.invalidates || 0)) +
        " late=" + String(Number(snap.frameLoop.stats.lateCallbacks || 0)));
    }
    lines.push("window=" + String(snap.windowHost && snap.windowHost.state || "CLOSED") +
      " scopeDisposed=" + String(snap.scopeDisposed));
    if (result) {
      lines.push("");
      lines.push("页面基线=" + (result.running ? "运行中" : (result.ok ? "通过" : "失败")) +
        " checks=" + String(Number(result.passed || 0)) + "/" + String(Number(result.total || 0)));
    }
    if (stress) {
      lines.push("10次接入=" + (stress.running ? "运行中" : (stress.ok ? "通过" : "失败")) +
        " cycles=" + String(Number(stress.cyclesCompleted || 0)) + "/" + String(Number(stress.cyclesRequested || 0)) +
        " errors=" + String(Number(stress.errors || 0)));
    }
    return lines.join("\n");
  }

  function refresh(app) {
    if (!app || !app.state) return;
    var view = app.state.shortXUiPhase7CStatusView || null;
    if (!view) return;
    var update = function () {
      try { view.setText(formatSession(app)); } catch (e0) {}
    };
    try {
      var session = app.state.shortXUiPhase7CSession;
      if (session && session.mainDispatcher && session.mainDispatcher.post) {
        session.mainDispatcher.post(update, "phase7c-status");
        return;
      }
    } catch (e1) {}
    try { new android.os.Handler(android.os.Looper.getMainLooper()).post(new java.lang.Runnable({ run: update })); }
    catch (e2) {}
  }

  function createWindowBundle(app, session, label) {
    var metrics = SX.Metrics.create(context);
    var T = app.getSettingsColorScheme ? app.getSettingsColorScheme() : null;
    var primary = T ? T.primary : android.graphics.Color.parseColor("#FF6750A4");
    var onSurface = T ? T.onSurface : android.graphics.Color.WHITE;
    var surface = T ? T.surface : android.graphics.Color.parseColor("#FF202124");
    var outline = T ? T.outlineVariant : android.graphics.Color.GRAY;
    var root = new android.widget.LinearLayout(context);
    root.setOrientation(android.widget.LinearLayout.VERTICAL);
    root.setPadding(metrics.dp(14), metrics.dp(12), metrics.dp(14), metrics.dp(12));
    root.setBackground(SX.Shape.strokeRect(surface, outline, metrics.dp(1), metrics.dp(16)));

    var title = new android.widget.TextView(context);
    title.setText("Phase 7C Route Window");
    title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
    title.setTypeface(null, android.graphics.Typeface.BOLD);
    SX.Color.applyText(title, onSurface);
    root.addView(title, new android.widget.LinearLayout.LayoutParams(-1, -2));

    var detail = new android.widget.TextView(context);
    detail.setText(String(label || "真实页面拥有的 WindowHost") + "\n离开 ShortX UI 实验室时自动释放");
    detail.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
    detail.setPadding(0, metrics.dp(5), 0, metrics.dp(9));
    SX.Color.applyText(detail, onSurface);
    root.addView(detail, new android.widget.LinearLayout.LayoutParams(-1, -2));

    var close = new android.widget.TextView(context);
    close.setText("关闭接入窗口");
    close.setGravity(android.view.Gravity.CENTER);
    close.setPadding(metrics.dp(10), metrics.dp(9), metrics.dp(10), metrics.dp(9));
    close.setBackground(SX.Shape.pressed(SX.Color.withAlpha(primary, 0.20), SX.Color.withAlpha(primary, 0.34), metrics.dp(10)));
    SX.Color.applyText(close, onSurface);
    close.setOnClickListener(new android.view.View.OnClickListener({
      onClick: function () { app.closeShortXUiPhase7CWindow(true, "button"); }
    }));
    root.addView(close, new android.widget.LinearLayout.LayoutParams(-1, -2));

    var lp = new android.view.WindowManager.LayoutParams();
    lp.width = metrics.dp(286);
    lp.height = android.view.WindowManager.LayoutParams.WRAP_CONTENT;
    lp.type = android.os.Build.VERSION.SDK_INT >= 26 ?
      android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY :
      android.view.WindowManager.LayoutParams.TYPE_PHONE;
    lp.flags = android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
      android.view.WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
      android.view.WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN;
    lp.format = android.graphics.PixelFormat.TRANSLUCENT;
    lp.gravity = android.view.Gravity.TOP | android.view.Gravity.LEFT;
    lp.x = metrics.dp(18);
    lp.y = metrics.dp(104);
    try { lp.setTitle("ShortXUI Phase7C Route Window"); } catch (eTitle) {}
    return { view: root, params: lp };
  }

  function closeWindow(app, immediate, reason) {
    var session = app && app.state ? app.state.shortXUiPhase7CSession : null;
    if (!session || !session.windowHost) return Result.ok("ALREADY_CLOSED", false);
    var host = session.windowHost;
    var removed = host.remove(immediate === true, 1800);
    var disposed = removed && removed.ok === true ? host.dispose(1800) : Result.fail("WINDOW_REMOVE_FAILED", "WindowHost remove failed", { removed: removed });
    var ok = !!(removed && removed.ok === true && disposed && disposed.ok === true);
    session.stats.windowCloseCalls += 1;
    if (ok) session.stats.windowClosePasses += 1;
    else session.stats.errors += 1;
    var snapshot = host.snapshot ? host.snapshot() : null;
    if (ok) {
      session.windowHost = null;
      try { if (session.wmDispatcher) session.wmDispatcher.dispose(); } catch (e0) {}
      session.wmDispatcher = null;
    }
    refresh(app);
    return ok ? Result.ok("WINDOW_CLOSED", true, {
      reason: String(reason || ""),
      immediate: immediate === true,
      removed: removed,
      disposed: disposed,
      snapshot: snapshot
    }) : Result.fail("WINDOW_CLOSE_FAILED", "Unable to close route-owned window", {
      reason: String(reason || ""),
      removed: removed,
      disposed: disposed,
      snapshot: snapshot
    });
  }

  function openWindow(app, label) {
    var session = app && app.state ? app.state.shortXUiPhase7CSession : null;
    if (!session || session.disposed === true) return Result.fail("ROUTE_SESSION_UNAVAILABLE", "Phase 7C route session is unavailable");
    if (session.windowHost && session.windowHost.getState && session.windowHost.getState() !== Lifecycle.DISPOSED) {
      return Result.ok("ALREADY_OPEN", session.windowHost, { snapshot: session.windowHost.snapshot() });
    }
    if (!app.state || !app.state.wm || !app.state.h) return Result.fail(Errors.WINDOW_MANAGER_REQUIRED, "ToolHub WindowManager handler is unavailable");
    var dispatcherResult = SX.API.createDispatcher(app.state.h, "phase7c-route-window-" + String(session.id));
    if (!dispatcherResult.ok) return dispatcherResult;
    var hostResult = SX.API.createWindowHost({
      name: "phase7c-route-window-" + String(session.id),
      dispatcher: dispatcherResult.value,
      windowManager: app.state.wm,
      timeoutMs: 1800
    });
    if (!hostResult.ok) {
      try { dispatcherResult.value.dispose(); } catch (e0) {}
      return hostResult;
    }
    var host = hostResult.value;
    var prepared = host.prepare(function () { return createWindowBundle(app, session, label); });
    var attached = prepared.ok ? host.attach(1800) : prepared;
    session.stats.windowOpenCalls += 1;
    if (!attached.ok) {
      session.stats.errors += 1;
      try { host.dispose(1800); } catch (e1) {}
      try { dispatcherResult.value.dispose(); } catch (e2) {}
      return Result.fail("WINDOW_ATTACH_FAILED", "Route-owned WindowHost attach failed", {
        prepared: prepared,
        attached: attached,
        snapshot: host.snapshot()
      });
    }
    session.windowHost = host;
    session.wmDispatcher = dispatcherResult.value;
    session.stats.windowOpenPasses += 1;
    refresh(app);
    return Result.ok("WINDOW_ATTACHED", host, {
      prepared: prepared,
      attached: attached,
      snapshot: host.snapshot()
    });
  }

  function disposeSession(app, session, reason) {
    if (!session || session.disposed === true) return true;
    session.disposeReason = String(reason || "dispose");
    session.detachedAt = now();
    session.state = Lifecycle.CLOSING;
    var errors = [];
    try {
      var windowResult = closeWindow(app, true, session.disposeReason);
      if (windowResult && windowResult.ok === false && String(windowResult.code || "") !== "ALREADY_CLOSED") errors.push(String(windowResult.code || "window"));
    } catch (eWindow) { errors.push("window:" + errorText(eWindow)); }
    try { if (session.frameLoop) session.frameLoop.dispose(); }
    catch (eFrame) { errors.push("frame:" + errorText(eFrame)); }
    try { if (session.scope) session.scope.dispose(); }
    catch (eScope) { errors.push("scope:" + errorText(eScope)); }
    try { if (session.mainDispatcher) session.mainDispatcher.dispose(); }
    catch (eDispatcher) { errors.push("dispatcher:" + errorText(eDispatcher)); }
    session.disposed = true;
    session.state = Lifecycle.DISPOSED;
    session.stats.disposeCalls += 1;
    session.stats.errors += errors.length;
    var lifecycle = {
      schema: 1,
      version: VERSION,
      route: TARGET_ROUTE,
      sessionId: Number(session.id || 0),
      ok: errors.length === 0,
      reason: session.disposeReason,
      disposedAt: now(),
      errors: errors,
      snapshot: sessionSnapshot(session)
    };
    if (app && app.state) {
      app.state.shortXUiPhase7CLifecycle = lifecycle;
      if (app.state.shortXUiPhase7CSession === session) app.state.shortXUiPhase7CSession = null;
      app.state.shortXUiPhase7CStatusView = null;
    }
    persist(app);
    log(app, lifecycle.ok ? "i" : "e", "SHORTXUI_PHASE7C_ROUTE_DISPOSE ok=" + String(lifecycle.ok) +
      " reason=" + String(lifecycle.reason) + " errors=" + String(errors.length));
    return lifecycle.ok;
  }

  function createSession(app, panel, statusView) {
    if (!app.state) app.state = {};
    var previous = app.state.shortXUiPhase7CSession;
    if (previous && previous.disposed !== true) disposeSession(app, previous, "route-rebuild");
    var dispatcherResult = SX.API.createMainDispatcher();
    var scopeResult = SX.API.createScope("shortx-ui-route-" + String(now()));
    if (!dispatcherResult.ok || !scopeResult.ok) {
      return Result.fail("ROUTE_SESSION_CREATE_FAILED", "Unable to create route dispatcher/scope", {
        dispatcher: dispatcherResult,
        scope: scopeResult
      });
    }
    var session = {
      id: Number(app.state.shortXUiPhase7CSessionSeq || 0) + 1,
      state: Lifecycle.NEW,
      createdAt: now(),
      attachedAt: 0,
      detachedAt: 0,
      disposeReason: "",
      disposed: false,
      panel: panel,
      statusView: statusView,
      mainDispatcher: dispatcherResult.value,
      scope: scopeResult.value,
      frameLoop: null,
      frameRemaining: 0,
      frameGeneration: 0,
      windowHost: null,
      wmDispatcher: null,
      listener: null,
      stats: {
        attaches: 0,
        detaches: 0,
        frameRuns: 0,
        windowOpenCalls: 0,
        windowOpenPasses: 0,
        windowCloseCalls: 0,
        windowClosePasses: 0,
        disposeCalls: 0,
        errors: 0
      }
    };
    app.state.shortXUiPhase7CSessionSeq = session.id;
    app.state.shortXUiPhase7CSession = session;
    app.state.shortXUiPhase7CStatusView = statusView;

    var frameResult = SX.API.createFrameLoop({
      name: "phase7c-route-frame-" + String(session.id),
      dispatcher: session.mainDispatcher,
      onFrame: function () {
        if (session.disposed === true) return { changed: false, continueRunning: false };
        var changed = session.frameRemaining > 0;
        if (session.frameRemaining > 0) session.frameRemaining -= 1;
        try {
          if (session.statusView && changed) {
            var alpha = 0.82 + (Number(session.frameRemaining || 0) % 2) * 0.18;
            session.statusView.setAlpha(alpha);
            if (session.frameRemaining <= 0) session.statusView.setAlpha(1);
          }
        } catch (eView) { session.stats.errors += 1; }
        return { changed: changed, continueRunning: session.frameRemaining > 0 };
      },
      invalidate: function () {
        try { if (session.statusView) session.statusView.invalidate(); }
        catch (eInvalidate) { session.stats.errors += 1; }
      }
    });
    if (!frameResult.ok) {
      try { session.scope.dispose(); } catch (e0) {}
      try { session.mainDispatcher.dispose(); } catch (e1) {}
      app.state.shortXUiPhase7CSession = null;
      return frameResult;
    }
    session.frameLoop = frameResult.value;
    try {
      session.scope.defer(function () {
        try { if (session.mainDispatcher) session.mainDispatcher.dispose(); } catch (e0) {}
      });
      session.scope.defer(function () {
        try { if (session.frameLoop) session.frameLoop.dispose(); } catch (e1) {}
      });
      session.scope.defer(function () {
        try { closeWindow(app, true, "scope-dispose"); } catch (e2) {}
      });
    } catch (eDefer) { session.stats.errors += 1; }

    session.listener = new android.view.View.OnAttachStateChangeListener({
      onViewAttachedToWindow: function () {
        if (session.disposed === true) return;
        session.state = Lifecycle.ATTACHED;
        session.attachedAt = now();
        session.stats.attaches += 1;
        refresh(app);
        persist(app);
        log(app, "i", "SHORTXUI_PHASE7C_ROUTE_ATTACHED session=" + String(session.id));
      },
      onViewDetachedFromWindow: function () {
        if (session.disposed === true) return;
        session.stats.detaches += 1;
        disposeSession(app, session, "view-detached");
      }
    });
    try { panel.addOnAttachStateChangeListener(session.listener); }
    catch (eListener) { session.stats.errors += 1; }
    try {
      if (panel.isAttachedToWindow && panel.isAttachedToWindow()) {
        session.state = Lifecycle.ATTACHED;
        session.attachedAt = now();
        session.stats.attaches += 1;
      } else session.state = Lifecycle.READY;
    } catch (eAttached) { session.state = Lifecycle.READY; }
    refresh(app);
    return Result.ok("ROUTE_SESSION_READY", session);
  }

  function requestFrames(app, count, reason) {
    var session = app && app.state ? app.state.shortXUiPhase7CSession : null;
    if (!session || session.disposed === true || !session.frameLoop) return Result.fail("ROUTE_SESSION_UNAVAILABLE", "Route FrameLoop is unavailable");
    var requested = Math.max(1, Math.min(60, Number(count || 1)));
    session.frameRemaining = requested;
    session.frameGeneration += 1;
    session.stats.frameRuns += 1;
    var result = session.frameLoop.request(String(reason || "route-frame"));
    refresh(app);
    return result;
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

  function addCheck(list, name, ok, detail) {
    list.push({ name: String(name), ok: ok === true, detail: copyPlain(detail) });
  }

  proto.openShortXUiPhase7CWindow = function (label) {
    return openWindow(this, label);
  };

  proto.closeShortXUiPhase7CWindow = function (immediate, reason) {
    return closeWindow(this, immediate === true, reason || "manual");
  };

  proto.runShortXUiPhase7CRouteBaseline = function () {
    if (!this.state) this.state = {};
    var previous = this.state.shortXUiPhase7CResult;
    if (previous && previous.running === true) return previous;
    var self = this;
    var result = {
      schema: 1,
      version: VERSION,
      runtimeVersion: String(SX.VERSION || ""),
      apiVersion: String(SX.API.VERSION || ""),
      route: TARGET_ROUTE,
      ok: false,
      running: true,
      startedAt: now(),
      finishedAt: 0,
      durationMs: 0,
      passed: 0,
      total: 0,
      checks: [],
      errors: []
    };
    this.state.shortXUiPhase7CResult = result;
    persist(this);
    refresh(this);

    var thread = new java.lang.Thread(new java.lang.Runnable({ run: function () {
      try {
        var session = self.state ? self.state.shortXUiPhase7CSession : null;
        addCheck(result.checks, "api-version", String(SX.API.VERSION || "") === API_VERSION, { value: SX.API.VERSION });
        addCheck(result.checks, "target-route", String(self.state && self.state.toolAppRoute || "") === TARGET_ROUTE, { route: self.state && self.state.toolAppRoute });
        addCheck(result.checks, "route-session", !!session && session.disposed !== true, sessionSnapshot(session));
        addCheck(result.checks, "route-attached", !!session && sessionSnapshot(session).attached === true, sessionSnapshot(session));
        addCheck(result.checks, "scope-active", !!session && session.scope && session.scope.isDisposed && session.scope.isDisposed() !== true, sessionSnapshot(session));
        addCheck(result.checks, "dispatcher-active", !!session && session.mainDispatcher && session.mainDispatcher.getState && session.mainDispatcher.getState().disposed !== true, sessionSnapshot(session));
        addCheck(result.checks, "frame-loop-exported", !!SX.FrameLoop && typeof SX.API.createFrameLoop === "function", { version: SX.FrameLoop && SX.FrameLoop.VERSION });

        if (session && session.frameLoop) {
          var before = session.frameLoop.snapshot();
          var request = requestFrames(self, 4, "phase7c-baseline");
          addCheck(result.checks, "frame-request", request.ok === true, request);
          var settled = waitUntil(function () {
            var snap = session.frameLoop.snapshot();
            return session.frameRemaining === 0 && snap.running === false && snap.framePosted === false && String(snap.state || "") === Lifecycle.READY;
          }, FRAME_WAIT_MS);
          var after = session.frameLoop.snapshot();
          var callbackDelta = Number(after.stats.callbacks || 0) - Number(before.stats.callbacks || 0);
          var invalidateDelta = Number(after.stats.invalidates || 0) - Number(before.stats.invalidates || 0);
          addCheck(result.checks, "frame-settled", settled && callbackDelta === 4, { before: before, after: after, callbackDelta: callbackDelta });
          addCheck(result.checks, "frame-invalidate", invalidateDelta === 4 && Number(after.stats.lateCallbacks || 0) === 0 && Number(after.stats.errors || 0) === 0, { invalidateDelta: invalidateDelta, after: after });
        } else {
          addCheck(result.checks, "frame-request", false, null);
          addCheck(result.checks, "frame-settled", false, null);
          addCheck(result.checks, "frame-invalidate", false, null);
        }

        var opened = openWindow(self, "页面基线");
        addCheck(result.checks, "window-open", opened.ok === true, opened);
        var hostSnap = sessionSnapshot(session).windowHost;
        addCheck(result.checks, "window-attached", !!hostSnap && String(hostSnap.state || "") === Lifecycle.ATTACHED && hostSnap.attached === true, hostSnap);
        var closed = closeWindow(self, false, "baseline-normal");
        addCheck(result.checks, "window-close", closed.ok === true, closed);
        var closedSnap = closed && closed.snapshot ? closed.snapshot : null;
        addCheck(result.checks, "window-disposed", !!closedSnap && String(closedSnap.state || "") === Lifecycle.DISPOSED && closedSnap.attached === false, closedSnap);
        addCheck(result.checks, "page-still-attached", !!session && session.disposed !== true && sessionSnapshot(session).attached === true, sessionSnapshot(session));
        var dex = SX.API.createDexBridge({});
        addCheck(result.checks, "external-dex-disabled", dex && dex.ok === false && String(dex.code || "") === Errors.EXTERNAL_DEX_DISABLED, dex);
      } catch (error) {
        result.errors.push(errorText(error));
      }
      var i;
      for (i = 0; i < result.checks.length; i += 1) if (result.checks[i].ok) result.passed += 1;
      result.total = result.checks.length;
      result.running = false;
      result.finishedAt = now();
      result.durationMs = Math.max(0, result.finishedAt - result.startedAt);
      result.ok = result.passed === result.total && result.errors.length === 0;
      new android.os.Handler(android.os.Looper.getMainLooper()).post(new java.lang.Runnable({ run: function () {
        self.state.shortXUiPhase7CResult = result;
        persist(self);
        refresh(self);
        log(self, result.ok ? "i" : "e", "SHORTXUI_PHASE7C_BASELINE ok=" + String(result.ok) +
          " passed=" + String(result.passed) + "/" + String(result.total));
      }}));
    }}), "ToolHub-Phase7C-Baseline");
    try { thread.setDaemon(true); } catch (eDaemon) {}
    thread.start();
    return result;
  };

  proto.runShortXUiPhase7CStress = function () {
    if (!this.state) this.state = {};
    var old = this.state.shortXUiPhase7CStress;
    if (old && old.running === true) return old;
    var self = this;
    var stress = {
      schema: 1,
      version: VERSION,
      runtimeVersion: String(SX.VERSION || ""),
      apiVersion: String(SX.API.VERSION || ""),
      route: TARGET_ROUTE,
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
      windowClosePasses: 0,
      normalCloses: 0,
      immediateCloses: 0,
      errors: 0,
      cycles: []
    };
    this.state.shortXUiPhase7CStress = stress;
    persist(this);
    refresh(this);

    var thread = new java.lang.Thread(new java.lang.Runnable({ run: function () {
      var index;
      try {
        for (index = 0; index < STRESS_CYCLES; index += 1) {
          var session = self.state ? self.state.shortXUiPhase7CSession : null;
          var row = { index: index + 1, ok: false };
          if (!session || session.disposed === true || !session.frameLoop || sessionSnapshot(session).attached !== true) {
            row.error = "ROUTE_SESSION_UNAVAILABLE";
            stress.errors += 1;
            stress.cycles.push(row);
            break;
          }
          var before = session.frameLoop.snapshot();
          var requested = requestFrames(self, 3, "phase7c-stress-" + String(index + 1));
          var settled = requested.ok === true && waitUntil(function () {
            var snap = session.frameLoop.snapshot();
            return session.frameRemaining === 0 && snap.running === false && snap.framePosted === false && String(snap.state || "") === Lifecycle.READY;
          }, FRAME_WAIT_MS);
          var after = session.frameLoop.snapshot();
          var callbackDelta = Number(after.stats.callbacks || 0) - Number(before.stats.callbacks || 0);
          var invalidateDelta = Number(after.stats.invalidates || 0) - Number(before.stats.invalidates || 0);
          var opened = openWindow(self, "循环 " + String(index + 1));
          var immediate = index % 2 === 1;
          var closed = opened.ok ? closeWindow(self, immediate, "stress") : Result.fail("SKIPPED", "open failed");
          var hostDisposed = !!(closed && closed.snapshot && String(closed.snapshot.state || "") === Lifecycle.DISPOSED && closed.snapshot.attached === false);
          var frameOk = settled && callbackDelta === 3 && invalidateDelta === 3 && Number(after.stats.lateCallbacks || 0) === 0 && Number(after.stats.errors || 0) === 0;
          var windowOk = opened.ok === true && closed.ok === true && hostDisposed;
          row.ok = frameOk && windowOk;
          row.frame = { ok: frameOk, callbacks: callbackDelta, invalidates: invalidateDelta, after: after };
          row.window = { ok: windowOk, immediate: immediate, opened: opened.code, closed: closed.code, snapshot: closed.snapshot || null };
          stress.frameCallbacks += callbackDelta;
          stress.frameInvalidates += invalidateDelta;
          stress.frameLateCallbacks += Number(after.stats.lateCallbacks || 0) - Number(before.stats.lateCallbacks || 0);
          if (opened.ok) stress.windowOpenPasses += 1;
          if (closed.ok) stress.windowClosePasses += 1;
          if (immediate) stress.immediateCloses += 1;
          else stress.normalCloses += 1;
          if (!row.ok) stress.errors += 1;
          stress.cyclesCompleted += 1;
          stress.cycles.push(row);
          persist(self);
          refresh(self);
          if (!row.ok) break;
          try { java.lang.Thread.sleep(80); } catch (eSleep) {}
        }
      } catch (error) {
        stress.errors += 1;
        stress.cycles.push({ index: Number(index || 0) + 1, ok: false, error: errorText(error) });
      }
      stress.running = false;
      stress.finishedAt = now();
      stress.durationMs = Math.max(0, stress.finishedAt - stress.startedAt);
      stress.ok = stress.cyclesCompleted === STRESS_CYCLES &&
        stress.frameCallbacks === STRESS_CYCLES * 3 &&
        stress.frameInvalidates === STRESS_CYCLES * 3 &&
        stress.frameLateCallbacks === 0 &&
        stress.windowOpenPasses === STRESS_CYCLES &&
        stress.windowClosePasses === STRESS_CYCLES &&
        stress.normalCloses === STRESS_CYCLES / 2 &&
        stress.immediateCloses === STRESS_CYCLES / 2 &&
        stress.errors === 0;
      new android.os.Handler(android.os.Looper.getMainLooper()).post(new java.lang.Runnable({ run: function () {
        self.state.shortXUiPhase7CStress = stress;
        persist(self);
        refresh(self);
        log(self, stress.ok ? "i" : "e", "SHORTXUI_PHASE7C_STRESS ok=" + String(stress.ok) +
          " completed=" + String(stress.cyclesCompleted) + "/" + String(STRESS_CYCLES) +
          " frames=" + String(stress.frameCallbacks) + " windows=" + String(stress.windowClosePasses) +
          " errors=" + String(stress.errors));
      }}));
    }}), "ToolHub-Phase7C-Stress");
    try { thread.setDaemon(true); } catch (eDaemon) {}
    thread.start();
    return stress;
  };

  var oldBuildLab = proto.buildShortXUiLabPanelView;
  if (typeof oldBuildLab === "function") {
    proto.buildShortXUiLabPanelView = function () {
      var panel = oldBuildLab.call(this);
      var self = this;
      try {
        var scroll = panel.getChildAt(panel.getChildCount() - 1);
        var content = scroll && scroll.getChildCount ? scroll.getChildAt(0) : null;
        if (!content || !content.addView) return panel;
        var metrics = SX.Metrics.create(context);
        var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
        var primary = T ? T.primary : android.graphics.Color.parseColor("#FF6750A4");
        var onSurface = T ? T.onSurface : android.graphics.Color.WHITE;
        var onSurface2 = T ? T.onSurface2 : android.graphics.Color.LTGRAY;
        var surface = T ? T.surface : android.graphics.Color.parseColor("#FF202124");
        var surface2 = T ? T.surface2 : android.graphics.Color.parseColor("#FF2B2C30");
        var outline = T ? T.outlineVariant : android.graphics.Color.GRAY;

        var box = new android.widget.LinearLayout(context);
        box.setOrientation(android.widget.LinearLayout.VERTICAL);
        box.setPadding(metrics.dp(12), metrics.dp(10), metrics.dp(12), metrics.dp(12));
        box.setBackground(SX.Shape.strokeRect(surface2, outline, metrics.dp(1), metrics.dp(16)));

        var title = new android.widget.TextView(context);
        title.setText("Phase 7C · 真实页面 API 接入");
        title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        SX.Color.applyText(title, onSurface);
        box.addView(title, new android.widget.LinearLayout.LayoutParams(-1, -2));

        var desc = new android.widget.TextView(context);
        desc.setText("将 Dispatcher / Scope / FrameLoop / WindowHost 接入当前 ShortX UI 实验室真实 ToolApp 页面；离开页面后自动释放全部页面资源。");
        desc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
        desc.setPadding(0, metrics.dp(3), 0, metrics.dp(8));
        SX.Color.applyText(desc, onSurface2);
        box.addView(desc, new android.widget.LinearLayout.LayoutParams(-1, -2));

        var status = new android.widget.TextView(context);
        status.setText("正在建立页面生命周期…");
        status.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
        status.setTypeface(android.graphics.Typeface.MONOSPACE);
        status.setPadding(metrics.dp(10), metrics.dp(9), metrics.dp(10), metrics.dp(9));
        status.setBackground(SX.Shape.roundRect(surface, metrics.dp(12)));
        SX.Color.applyText(status, onSurface2);
        box.addView(status, new android.widget.LinearLayout.LayoutParams(-1, -2));

        function row(items) {
          var line = new android.widget.LinearLayout(context);
          line.setOrientation(android.widget.LinearLayout.HORIZONTAL);
          var i;
          for (i = 0; i < items.length; i += 1) {
            var button = self.ui.createFlatButton(self, items[i].title, primary, items[i].action);
            var lp = new android.widget.LinearLayout.LayoutParams(0, metrics.dp(46), 1);
            if (i > 0) lp.leftMargin = metrics.dp(6);
            line.addView(button, lp);
          }
          var rowLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
          rowLp.topMargin = metrics.dp(7);
          box.addView(line, rowLp);
        }

        row([
          { title: "运行页面基线", action: function () { self.runShortXUiPhase7CRouteBaseline(); refresh(self); } },
          { title: "运行 10 次接入", action: function () { self.runShortXUiPhase7CStress(); refresh(self); } }
        ]);
        row([
          { title: "打开接入窗口", action: function () { self.openShortXUiPhase7CWindow("手动验证"); refresh(self); } },
          { title: "关闭接入窗口", action: function () { self.closeShortXUiPhase7CWindow(true, "button"); refresh(self); } }
        ]);
        row([
          { title: "运行 8 帧", action: function () { requestFrames(self, 8, "button"); refresh(self); } },
          { title: "刷新状态", action: function () { refresh(self); persist(self); } }
        ]);

        var lpBox = new android.widget.LinearLayout.LayoutParams(-1, -2);
        lpBox.setMargins(0, 0, 0, metrics.dp(10));
        content.addView(box, lpBox);
        var created = createSession(this, panel, status);
        if (!created.ok) status.setText("Phase 7C 会话创建失败：" + String(created.code || "") + "\n" + String(created.message || ""));
        else status.setText(formatSession(this));
      } catch (error) {
        log(this, "e", "Phase7C route integration build failed: " + errorText(error));
      }
      return panel;
    };
  }

  var oldCloseToolApp = proto.closeToolApp;
  if (typeof oldCloseToolApp === "function") {
    proto.closeToolApp = function () {
      try {
        var session = this.state ? this.state.shortXUiPhase7CSession : null;
        if (session && session.disposed !== true) disposeSession(this, session, "tool-app-close");
      } catch (eDispose) {}
      return oldCloseToolApp.apply(this, arguments);
    };
  }

  var oldCapability = SX.API.capability;
  SX.API.capability = function () {
    var value = oldCapability ? oldCapability() : {};
    value.routeIntegration = {
      version: VERSION,
      targetRoute: TARGET_ROUTE,
      actualToolAppPage: true,
      automaticDetachDispose: true
    };
    return value;
  };

  var oldVersionInfo = SX.API.versionInfo;
  SX.API.versionInfo = function () {
    var value = oldVersionInfo ? oldVersionInfo() : {};
    value.phase7CVersion = VERSION;
    value.phase7CTargetRoute = TARGET_ROUTE;
    return value;
  };

  global.ToolHubBetaPhase7C = {
    VERSION: VERSION,
    API_VERSION: API_VERSION,
    PHASE: "7C",
    TARGET_ROUTE: TARGET_ROUTE,
    STRESS_CYCLES: STRESS_CYCLES,
    ACTUAL_TOOL_APP_PAGE: true,
    AUTOMATIC_DETACH_DISPOSE: true
  };
  proto.__toolHubShortXUiPhase7CRouteIntegrationInstalled = true;
  try { writeLog("ShortXUI Phase7C route integration installed version=" + VERSION + " route=" + TARGET_ROUTE); }
  catch (eLog) {}
}(function () { return this; }()));
