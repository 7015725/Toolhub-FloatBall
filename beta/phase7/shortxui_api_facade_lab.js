// ToolHub Beta ShortXUI Phase 7A: public API facade and module-boundary baseline. Rhino ES5.
(function (global) {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
  if (!global.ShortXUI || global.ShortXUI.__runtimeInstalled !== true) return;

  var proto = FloatBallAppWM.prototype;
  if (proto.__toolHubShortXUiPhase7ApiFacadeInstalled === true) return;

  var VERSION = "0.8.0-beta-api-facade";
  var API_VERSION = "0.3.0-beta";
  var PHASE4_STATUS = {
    functionality: "manual_pass",
    telemetry: "not_captured",
    code: "FUNCTIONAL_MANUAL_PASS_TELEMETRY_NOT_CAPTURED",
    note: "System back, Home and recent-apps behavior were confirmed functional on device; predictive callback telemetry was not captured in the overlay probe."
  };

  function now() {
    return Number(java.lang.System.currentTimeMillis());
  }

  function copyPlain(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (e) { return null; }
  }

  function errorText(error) {
    try { return String(global.ShortXUI.Core.errorText(error)); }
    catch (e0) {}
    try { return String(error); }
    catch (e1) { return "unknown"; }
  }

  function log(app, level, message) {
    try { safeLog(app && app.L, level || "i", String(message || "")); }
    catch (e) {}
  }

  var Errors = {
    OK: "OK",
    INVALID_ARGUMENT: "INVALID_ARGUMENT",
    RUNTIME_UNAVAILABLE: "RUNTIME_UNAVAILABLE",
    DISPATCHER_UNAVAILABLE: "DISPATCHER_UNAVAILABLE",
    WINDOW_MANAGER_REQUIRED: "WINDOW_MANAGER_REQUIRED",
    ALREADY_DISPOSED: "ALREADY_DISPOSED",
    WRONG_THREAD: "WRONG_THREAD",
    ATTACH_FAILED: "ATTACH_FAILED",
    DETACH_TIMEOUT: "DETACH_TIMEOUT",
    CALLBACK_CANCELLED: "CALLBACK_CANCELLED",
    CLASS_NOT_ALLOWED: "CLASS_NOT_ALLOWED",
    METHOD_NOT_FOUND: "METHOD_NOT_FOUND",
    INVOCATION_FAILED: "INVOCATION_FAILED",
    DEX_HASH_MISMATCH: "DEX_HASH_MISMATCH",
    DEX_LOAD_FAILED: "DEX_LOAD_FAILED",
    NOT_EXPORTED: "NOT_EXPORTED",
    EXTERNAL_DEX_DISABLED: "EXTERNAL_DEX_DISABLED"
  };

  var Lifecycle = {
    NEW: "NEW",
    READY: "READY",
    PREPARED: "PREPARED",
    ATTACHING: "ATTACHING",
    ATTACHED: "ATTACHED",
    RUNNING: "RUNNING",
    CLOSING: "CLOSING",
    DETACHED: "DETACHED",
    DISPOSED: "DISPOSED",
    ERROR: "ERROR"
  };

  var Result = {
    ok: function (code, value, extra) {
      var out = { ok: true, code: String(code || Errors.OK) };
      var key;
      if (value !== undefined) out.value = value;
      if (extra) for (key in extra) if (extra.hasOwnProperty(key)) out[key] = extra[key];
      return out;
    },
    fail: function (code, message, extra) {
      var out = {
        ok: false,
        code: String(code || Errors.INVALID_ARGUMENT),
        message: String(message || "")
      };
      var key;
      if (extra) for (key in extra) if (extra.hasOwnProperty(key)) out[key] = extra[key];
      return out;
    },
    fromException: function (code, error, extra) {
      var causeClass = "";
      try {
        var target = error && error.javaException ? error.javaException : error;
        if (target && target.getClass) causeClass = String(target.getClass().getName());
      } catch (e0) {}
      var payload = extra || {};
      payload.causeClass = causeClass;
      return Result.fail(code || Errors.INVOCATION_FAILED, errorText(error), payload);
    }
  };

  function unavailable(component, code, reason) {
    return Result.fail(code || Errors.NOT_EXPORTED, reason || (String(component) + " is not exported in Phase 7A"), {
      component: String(component || ""),
      apiVersion: API_VERSION
    });
  }

  function capability() {
    var sx = global.ShortXUI;
    var phase5 = global.ToolHubBetaPhase5 || null;
    var phase6 = global.ToolHubBetaPhase6 || null;
    return {
      ok: !!(sx && sx.Core && sx.Dispatcher && sx.Scope && sx.WindowHost && sx.Metrics && sx.Display && sx.Shape),
      runtimeVersion: sx ? String(sx.VERSION || "") : "",
      apiVersion: API_VERSION,
      facadeVersion: VERSION,
      stable: {
        core: !!(sx && sx.Core),
        dispatcher: !!(sx && sx.Dispatcher),
        scope: !!(sx && sx.Scope),
        color: !!(sx && sx.Color),
        metrics: !!(sx && sx.Metrics),
        display: !!(sx && sx.Display),
        shape: !!(sx && sx.Shape),
        windowHost: !!(sx && sx.WindowHost)
      },
      verifiedNotExported: {
        imeController: true,
        backController: true,
        frameLoop: !!phase5,
        reflectionBridge: !!phase6,
        dexBridge: !!phase6
      },
      phase5Version: phase5 ? String(phase5.VERSION || "") : "",
      phase6Version: phase6 ? String(phase6.VERSION || "") : "",
      externalDexPayloadEnabled: false,
      phase4: copyPlain(PHASE4_STATUS)
    };
  }

  var API = {
    VERSION: API_VERSION,
    Errors: Errors,
    Lifecycle: Lifecycle,
    Result: Result,
    capability: capability,
    versionInfo: function () {
      return {
        runtimeVersion: String(global.ShortXUI.VERSION || ""),
        apiVersion: API_VERSION,
        facadeVersion: VERSION,
        phase5Version: global.ToolHubBetaPhase5 ? String(global.ToolHubBetaPhase5.VERSION || "") : "",
        phase6Version: global.ToolHubBetaPhase6 ? String(global.ToolHubBetaPhase6.VERSION || "") : ""
      };
    },
    createDispatcher: function (handler, name) {
      if (!handler) return Result.fail(Errors.DISPATCHER_UNAVAILABLE, "Handler is required");
      try { return Result.ok(Errors.OK, global.ShortXUI.Dispatcher.fromHandler(handler, name)); }
      catch (error) { return Result.fromException(Errors.DISPATCHER_UNAVAILABLE, error); }
    },
    createMainDispatcher: function () {
      try { return Result.ok(Errors.OK, global.ShortXUI.Dispatcher.main()); }
      catch (error) { return Result.fromException(Errors.DISPATCHER_UNAVAILABLE, error); }
    },
    createScope: function (name) {
      try { return Result.ok(Errors.OK, global.ShortXUI.Scope.create(name)); }
      catch (error) { return Result.fromException(Errors.RUNTIME_UNAVAILABLE, error); }
    },
    createWindowHost: function (options) {
      var opts = options || {};
      if (!opts.windowManager) return Result.fail(Errors.WINDOW_MANAGER_REQUIRED, "windowManager is required");
      if (!opts.dispatcher) return Result.fail(Errors.DISPATCHER_UNAVAILABLE, "dispatcher is required");
      try { return Result.ok(Errors.OK, global.ShortXUI.WindowHost.create(opts)); }
      catch (error) { return Result.fromException(Errors.ATTACH_FAILED, error); }
    },
    createMetrics: function (ctx) {
      if (!ctx) return Result.fail(Errors.INVALID_ARGUMENT, "context is required");
      try { return Result.ok(Errors.OK, global.ShortXUI.Metrics.create(ctx)); }
      catch (error) { return Result.fromException(Errors.RUNTIME_UNAVAILABLE, error); }
    },
    snapshotDisplay: function (ctx, wm) {
      if (!ctx) return Result.fail(Errors.INVALID_ARGUMENT, "context is required");
      try { return Result.ok(Errors.OK, global.ShortXUI.Display.snapshot(ctx, wm)); }
      catch (error) { return Result.fromException(Errors.RUNTIME_UNAVAILABLE, error); }
    },
    createImeController: function () {
      return unavailable("ImeController", Errors.NOT_EXPORTED, "IME lifecycle is verified but remains behind the Phase 3 adapter until Phase 7B");
    },
    createBackController: function () {
      return unavailable("BackController", Errors.NOT_EXPORTED, "Back behavior is functional; a standalone controller is deferred because predictive telemetry is not captured in this overlay environment");
    },
    createFrameLoop: function () {
      return unavailable("FrameLoop", Errors.NOT_EXPORTED, "Canvas/frame lifecycle is verified but remains behind the Phase 5 adapter until Phase 7B");
    },
    createReflectionBridge: function () {
      return unavailable("ReflectionBridge", Errors.NOT_EXPORTED, "Reflection boundary is verified but the private Phase 6 bridge is not promoted in Phase 7A");
    },
    createDexBridge: function () {
      return unavailable("DexBridge", Errors.EXTERNAL_DEX_DISABLED, "External DEX payloads remain disabled; only the fixed diagnostic DEX was verified");
    }
  };

  global.ShortXUI.API_VERSION = API_VERSION;
  global.ShortXUI.Errors = Errors;
  global.ShortXUI.Lifecycle = Lifecycle;
  global.ShortXUI.Result = Result;
  global.ShortXUI.API = API;
  global.ShortXUI.Components = {
    Core: global.ShortXUI.Core,
    Dispatcher: global.ShortXUI.Dispatcher,
    Scope: global.ShortXUI.Scope,
    Color: global.ShortXUI.Color,
    Metrics: global.ShortXUI.Metrics,
    Display: global.ShortXUI.Display,
    Shape: global.ShortXUI.Shape,
    WindowHost: global.ShortXUI.WindowHost
  };

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

  function persist(app, result) {
    var root = diagnosticsRoot();
    if (!root) return false;
    var file = new java.io.File(root + "/diagnostics/shortx-ui/latest.json");
    var payload = {};
    var oldText = readText(file);
    if (oldText) {
      try { payload = JSON.parse(oldText); } catch (e0) { payload = {}; }
    }
    if (!payload || typeof payload !== "object") payload = {};
    payload.schema = Math.max(8, Number(payload.schema || 0));
    payload.runtimeVersion = String(global.ShortXUI.VERSION || "");
    payload.apiVersion = API_VERSION;
    payload.apiFacade = copyPlain(result);
    payload.savedAt = now();
    if (result && result.ok === false) payload.ok = false;
    return writeJsonAtomic(file, payload);
  }

  function check(list, name, callback) {
    try {
      var detail = callback();
      list.push({ name: String(name), ok: true, detail: detail === undefined ? null : copyPlain(detail) });
    } catch (error) {
      list.push({ name: String(name), ok: false, error: errorText(error) });
    }
  }

  function format(value) {
    if (!value) return "Phase 7A API 收口：尚未运行";
    var lines = [];
    lines.push("Phase 7A API 收口：" + (value.ok ? "通过" : "失败"));
    lines.push("Runtime=" + String(value.runtimeVersion || "") + " API=" + String(value.apiVersion || ""));
    lines.push("checks=" + String(value.passed || 0) + "/" + String(value.total || 0) + " duration=" + String(value.durationMs || 0) + "ms");
    lines.push("公开稳定：Core / Dispatcher / Scope / Color / Metrics / Display / Shape / WindowHost");
    lines.push("暂不导出：IME / Back / FrameLoop / ReflectionBridge / DexBridge");
    lines.push("Phase4=功能通过，预测返回遥测未采集");
    return lines.join("\n");
  }

  function refresh(app) {
    if (!app || !app.state || !app.state.shortXUiPhase7StatusView) return;
    var view = app.state.shortXUiPhase7StatusView;
    var value = app.state.shortXUiPhase7ApiResult || null;
    try {
      new android.os.Handler(android.os.Looper.getMainLooper()).post(new java.lang.Runnable({
        run: function () { try { view.setText(format(value)); } catch (e0) {} }
      }));
    } catch (e1) {}
  }

  proto.runShortXUiPhase7ApiBaseline = function () {
    if (!this.state) this.state = {};
    var startedAt = now();
    var checks = [];
    var self = this;

    check(checks, "runtime-version-preserved", function () {
      if (String(global.ShortXUI.VERSION || "") !== "0.2.0") throw "runtime version changed";
      return global.ShortXUI.VERSION;
    });
    check(checks, "api-version", function () {
      if (String(global.ShortXUI.API_VERSION || "") !== API_VERSION) throw "API version mismatch";
      return global.ShortXUI.API_VERSION;
    });
    check(checks, "component-aliases", function () {
      if (global.ShortXUI.Components.WindowHost !== global.ShortXUI.WindowHost) throw "WindowHost alias mismatch";
      if (global.ShortXUI.Components.Dispatcher !== global.ShortXUI.Dispatcher) throw "Dispatcher alias mismatch";
      return Object.keys(global.ShortXUI.Components).length;
    });
    check(checks, "result-ok", function () {
      var out = Result.ok("READY", 7, { state: Lifecycle.READY });
      if (!out.ok || out.code !== "READY" || out.value !== 7 || out.state !== "READY") throw "result ok mismatch";
      return out;
    });
    check(checks, "result-fail", function () {
      var out = Result.fail(Errors.INVALID_ARGUMENT, "bad");
      if (out.ok || out.code !== Errors.INVALID_ARGUMENT) throw "result fail mismatch";
      return out;
    });
    check(checks, "dispatcher-lifecycle", function () {
      var created = API.createDispatcher(self.state.h, "phase7-api-test");
      if (!created.ok || !created.value) throw created.message || "dispatcher create failed";
      var dispatcher = created.value;
      var before = dispatcher.getState();
      dispatcher.dispose();
      var after = dispatcher.getState();
      if (before.disposed || after.disposed !== true || Number(after.pending || 0) !== 0) throw "dispatcher dispose mismatch";
      return { before: before, after: after };
    });
    check(checks, "scope-generation", function () {
      var created = API.createScope("phase7-api-test");
      if (!created.ok) throw created.message;
      var scope = created.value;
      var count = 0;
      var guarded = scope.guard(function () { count += 1; });
      guarded();
      scope.dispose();
      guarded();
      if (count !== 1 || scope.isDisposed() !== true) throw "scope guard mismatch";
      return { count: count, disposed: scope.isDisposed(), generation: scope.generation() };
    });
    check(checks, "metrics", function () {
      var created = API.createMetrics(context);
      if (!created.ok || created.value.dp(10) <= 0) throw created.message || "metrics invalid";
      return created.value.snapshot();
    });
    check(checks, "display", function () {
      var snap = API.snapshotDisplay(context, self.state.wm);
      if (!snap.ok || Number(snap.value.width || 0) <= 0 || Number(snap.value.height || 0) <= 0) throw snap.message || "display invalid";
      return snap.value;
    });
    check(checks, "windowhost-dispose-before-attach", function () {
      var dispatcherResult = API.createDispatcher(self.state.h, "phase7-windowhost-test");
      if (!dispatcherResult.ok) throw dispatcherResult.message;
      var hostResult = API.createWindowHost({
        name: "phase7-api-windowhost",
        dispatcher: dispatcherResult.value,
        windowManager: self.state.wm,
        timeoutMs: 1000
      });
      if (!hostResult.ok) throw hostResult.message;
      var host = hostResult.value;
      if (host.getState() !== "NEW") throw "initial state mismatch";
      var disposed = host.dispose(1000);
      dispatcherResult.value.dispose();
      if (!disposed.ok || host.getState() !== "DISPOSED") throw "dispose-before-attach mismatch";
      return host.snapshot();
    });
    check(checks, "ime-not-exported", function () {
      var out = API.createImeController();
      if (out.ok || out.code !== Errors.NOT_EXPORTED) throw "IME export boundary mismatch";
      return out;
    });
    check(checks, "back-not-exported", function () {
      var out = API.createBackController();
      if (out.ok || out.code !== Errors.NOT_EXPORTED) throw "Back export boundary mismatch";
      return out;
    });
    check(checks, "frame-not-exported", function () {
      var out = API.createFrameLoop();
      if (out.ok || out.code !== Errors.NOT_EXPORTED) throw "FrameLoop export boundary mismatch";
      return out;
    });
    check(checks, "reflection-not-exported", function () {
      var out = API.createReflectionBridge();
      if (out.ok || out.code !== Errors.NOT_EXPORTED) throw "Reflection export boundary mismatch";
      return out;
    });
    check(checks, "external-dex-disabled", function () {
      var out = API.createDexBridge();
      if (out.ok || out.code !== Errors.EXTERNAL_DEX_DISABLED) throw "DEX boundary mismatch";
      return out;
    });
    check(checks, "phase4-classification", function () {
      var cap = API.capability();
      if (!cap.phase4 || cap.phase4.functionality !== "manual_pass" || cap.phase4.telemetry !== "not_captured") throw "Phase4 classification mismatch";
      return cap.phase4;
    });

    var passed = 0;
    var i;
    for (i = 0; i < checks.length; i += 1) if (checks[i].ok) passed += 1;
    var result = {
      schema: 8,
      runtimeVersion: String(global.ShortXUI.VERSION || ""),
      apiVersion: API_VERSION,
      facadeVersion: VERSION,
      ok: passed === checks.length,
      startedAt: startedAt,
      finishedAt: now(),
      durationMs: Math.max(0, now() - startedAt),
      passed: passed,
      total: checks.length,
      checks: checks,
      capability: API.capability(),
      phase4: copyPlain(PHASE4_STATUS)
    };
    this.state.shortXUiPhase7ApiResult = result;
    persist(this, result);
    refresh(this);
    log(this, result.ok ? "i" : "e", "SHORTXUI_PHASE7_API_BASELINE ok=" + String(result.ok) + " passed=" + String(passed) + "/" + String(checks.length));
    return result;
  };

  proto.refreshShortXUiPhase7ApiState = function () {
    if (!this.state) this.state = {};
    var result = this.state.shortXUiPhase7ApiResult || {
      schema: 8,
      runtimeVersion: String(global.ShortXUI.VERSION || ""),
      apiVersion: API_VERSION,
      facadeVersion: VERSION,
      ok: null,
      capability: API.capability(),
      phase4: copyPlain(PHASE4_STATUS)
    };
    persist(this, result);
    refresh(this);
    return copyPlain(result);
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
        title.setText("Phase 7A · 正式 API 收口");
        title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        global.ShortXUI.Color.applyText(title, onSurface);
        box.addView(title, new android.widget.LinearLayout.LayoutParams(-1, -2));

        var desc = new android.widget.TextView(context);
        desc.setText("建立 ShortXUI.API 0.3.0-beta、统一错误码/生命周期/Result，并明确稳定公开与暂不导出边界。Phase 4 按实际功能通过、遥测未采集归档。");
        desc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
        desc.setPadding(0, m.dp(3), 0, m.dp(8));
        global.ShortXUI.Color.applyText(desc, onSurface2);
        box.addView(desc, new android.widget.LinearLayout.LayoutParams(-1, -2));

        var status = new android.widget.TextView(context);
        status.setText(format(this.state.shortXUiPhase7ApiResult || null));
        status.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 10);
        status.setTypeface(android.graphics.Typeface.MONOSPACE);
        status.setPadding(m.dp(10), m.dp(9), m.dp(10), m.dp(9));
        status.setBackground(global.ShortXUI.Shape.roundRect(surface, m.dp(12)));
        global.ShortXUI.Color.applyText(status, onSurface2);
        box.addView(status, new android.widget.LinearLayout.LayoutParams(-1, -2));
        this.state.shortXUiPhase7StatusView = status;

        var row = new android.widget.LinearLayout(context);
        row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        var run = self.ui.createFlatButton(self, "运行 API 基线", primary, function () { self.runShortXUiPhase7ApiBaseline(); });
        var refreshButton = self.ui.createFlatButton(self, "刷新状态", primary, function () { self.refreshShortXUiPhase7ApiState(); });
        var lpRun = new android.widget.LinearLayout.LayoutParams(0, m.dp(46), 1);
        lpRun.rightMargin = m.dp(6);
        row.addView(run, lpRun);
        row.addView(refreshButton, new android.widget.LinearLayout.LayoutParams(0, m.dp(46), 1));
        var rowLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
        rowLp.topMargin = m.dp(7);
        box.addView(row, rowLp);

        var lpBox = new android.widget.LinearLayout.LayoutParams(-1, -2);
        lpBox.bottomMargin = m.dp(10);
        content.addView(box, lpBox);
      } catch (error) {
        log(this, "e", "build Phase7 API facade section failed: " + errorText(error));
      }
      return panel;
    };
  }

  var oldGetState = proto.getShortXUiLabState;
  if (typeof oldGetState === "function") {
    proto.getShortXUiLabState = function () {
      var state = oldGetState.call(this) || {};
      state.apiVersion = API_VERSION;
      state.apiFacade = copyPlain(this.state ? this.state.shortXUiPhase7ApiResult || null : null);
      state.phase4 = copyPlain(PHASE4_STATUS);
      return state;
    };
  }

  global.ToolHubBetaPhase7 = {
    VERSION: VERSION,
    API_VERSION: API_VERSION,
    PHASE: "7A",
    PHASE4_STATUS: copyPlain(PHASE4_STATUS),
    STABLE_EXPORTS: ["Core", "Dispatcher", "Scope", "Color", "Metrics", "Display", "Shape", "WindowHost"],
    DEFERRED_EXPORTS: ["ImeController", "BackController", "FrameLoop", "ReflectionBridge", "DexBridge"]
  };
  proto.__toolHubShortXUiPhase7ApiFacadeInstalled = true;
  try { writeLog("ShortXUI Phase7 API facade installed version=" + VERSION + " api=" + API_VERSION); }
  catch (eLog) {}
}(function () { return this; }()));
