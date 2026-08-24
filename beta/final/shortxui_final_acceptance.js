// ToolHub Beta ShortXUI final acceptance: public IME/Back controllers, real-route integration, and one-pass acceptance. Rhino ES5.
(function (global) {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
  if (!global.ShortXUI || !global.ShortXUI.API || !global.ShortXUI.Result) return;
  if (!global.ToolHubBetaPhase7CR2 || String(global.ToolHubBetaPhase7CR2.VERSION || "") !== "0.8.4-beta-route-lifecycle") return;

  var proto = FloatBallAppWM.prototype;
  if (proto.__toolHubShortXUiFinalAcceptanceInstalled === true) return;

  var VERSION = "0.9.0-beta-final-acceptance";
  var API_VERSION = "0.4.0-beta";
  var IME_VERSION = "1.0.0-beta";
  var BACK_VERSION = "1.0.0-beta";
  var TARGET_ROUTE = "shortx_ui_lab";
  var IME_WAIT_MS = 150000;
  var POLL_MS = 250;
  var BACK_LOGIC_CYCLES = 50;
  var SX = global.ShortXUI;
  var Result = SX.Result;
  var Errors = SX.Errors;
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

  function addErrorCodes() {
    if (!Errors) return;
    if (!Errors.IME_CONTROLLER_DISPOSED) Errors.IME_CONTROLLER_DISPOSED = "IME_CONTROLLER_DISPOSED";
    if (!Errors.IME_TARGET_REQUIRED) Errors.IME_TARGET_REQUIRED = "IME_TARGET_REQUIRED";
    if (!Errors.BACK_CONTROLLER_DISPOSED) Errors.BACK_CONTROLLER_DISPOSED = "BACK_CONTROLLER_DISPOSED";
    if (!Errors.BACK_CALLBACK_UNAVAILABLE) Errors.BACK_CALLBACK_UNAVAILABLE = "BACK_CALLBACK_UNAVAILABLE";
    if (!Errors.MANUAL_ACCEPTANCE_PENDING) Errors.MANUAL_ACCEPTANCE_PENDING = "MANUAL_ACCEPTANCE_PENDING";
  }

  function runOnDispatcher(dispatcher, callback, timeoutMs) {
    try {
      if (dispatcher && typeof dispatcher.runSync === "function") {
        return dispatcher.runSync(callback, Math.max(1, Number(timeoutMs || 1800)));
      }
      return Result.ok(Errors.OK, callback());
    } catch (error) {
      return Result.fromException ? Result.fromException("DISPATCH_FAILED", error) : Result.fail("DISPATCH_FAILED", errorText(error));
    }
  }

  function hostGeometry(host) {
    if (!host || typeof host.getParams !== "function") return null;
    try {
      var lp = host.getParams();
      if (!lp) return null;
      return {
        x: Number(lp.x || 0),
        y: Number(lp.y || 0),
        width: Number(lp.width || 0),
        height: Number(lp.height || 0),
        flags: Number(lp.flags || 0),
        softInputMode: Number(lp.softInputMode || 0)
      };
    } catch (e) {}
    return null;
  }

  function createImeController(options) {
    var opts = options || {};
    var root = opts.rootView || null;
    var target = opts.targetView || null;
    var host = opts.host || null;
    var dispatcher = opts.dispatcher || null;
    var imm = opts.inputMethodManager || null;
    var disposed = false;
    var state = Lifecycle.READY;
    var originalGeometry = opts.originalGeometry || hostGeometry(host);
    var geometryRestored = true;
    var adjusted = false;
    var lastVisible = false;
    var lastHeight = 0;
    var lastSource = "none";
    var stats = {
      focusRequests: 0,
      showRequests: 0,
      hideRequests: 0,
      restoreCalls: 0,
      readCalls: 0,
      disposals: 0,
      errors: 0
    };

    try { if (!imm) imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE); }
    catch (eImm) { imm = null; }

    function failDisposed() {
      return Result.fail(Errors.IME_CONTROLLER_DISPOSED, "ImeController is disposed");
    }

    function read() {
      if (disposed) return failDisposed();
      stats.readCalls += 1;
      var value = { visible: false, height: 0, source: "none" };
      try {
        if (root && android.os.Build.VERSION.SDK_INT >= 30) {
          var insets = root.getRootWindowInsets();
          if (insets) {
            var type = android.view.WindowInsets.Type.ime();
            value.visible = insets.isVisible(type) === true;
            value.height = Number(insets.getInsets(type).bottom || 0);
            value.source = "window_insets";
          }
        }
      } catch (eInsets) {}
      if (value.source === "none") {
        try {
          if (root) {
            var rect = new android.graphics.Rect();
            root.getWindowVisibleDisplayFrame(rect);
            var height = Number(root.getRootView().getHeight() || 0);
            var diff = Math.max(0, height - Number(rect.bottom || 0));
            var threshold = SX.Metrics.create(context).dp(100);
            value.visible = diff > threshold;
            value.height = diff;
            value.source = "visible_frame";
          }
        } catch (eFrame) {}
      }
      lastVisible = value.visible === true;
      lastHeight = Number(value.height || 0);
      lastSource = String(value.source || "none");
      return Result.ok("IME_STATE", value);
    }

    function requestFocus() {
      if (disposed) return failDisposed();
      if (!target) return Result.fail(Errors.IME_TARGET_REQUIRED, "IME target view is required");
      stats.focusRequests += 1;
      var value = runOnDispatcher(dispatcher, function () {
        try { if (root) { root.setFocusable(true); root.setFocusableInTouchMode(true); } } catch (eRoot) {}
        target.setFocusable(true);
        target.setFocusableInTouchMode(true);
        var focused = target.requestFocus();
        try { if (target.getText && target.setSelection) target.setSelection(target.getText().length()); } catch (eSelection) {}
        return focused !== false;
      }, 1800);
      if (!value.ok) stats.errors += 1;
      return value.ok ? Result.ok("FOCUS_REQUESTED", value.value) : value;
    }

    function makeFocusableForIme() {
      if (!host || typeof host.update !== "function") return Result.ok("HOST_NOT_REQUIRED", false);
      try {
        return host.update(function (lp) {
          lp.flags = Number(lp.flags || 0) & ~android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
          lp.flags = Number(lp.flags || 0) & ~android.view.WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM;
          lp.softInputMode = android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE |
            android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE;
        }, 1800);
      } catch (error) {
        stats.errors += 1;
        return Result.fail("HOST_UPDATE_FAILED", errorText(error));
      }
    }

    function show() {
      if (disposed) return failDisposed();
      if (!target || !imm) return Result.fail(Errors.IME_TARGET_REQUIRED, "IME target/InputMethodManager is unavailable");
      state = Lifecycle.RUNNING;
      var hostResult = makeFocusableForIme();
      if (hostResult && hostResult.ok === false) return hostResult;
      var focusResult = requestFocus();
      if (!focusResult.ok) return focusResult;
      var shown = runOnDispatcher(dispatcher, function () {
        return imm.showSoftInput(target, android.view.inputmethod.InputMethodManager.SHOW_IMPLICIT);
      }, 1800);
      stats.showRequests += 1;
      if (!shown.ok) stats.errors += 1;
      state = Lifecycle.READY;
      return shown.ok ? Result.ok("IME_SHOW_REQUESTED", shown.value) : shown;
    }

    function restoreGeometry() {
      if (disposed) return failDisposed();
      stats.restoreCalls += 1;
      if (!host || !originalGeometry || typeof host.update !== "function") {
        geometryRestored = true;
        adjusted = false;
        return Result.ok("GEOMETRY_NOT_REQUIRED", true);
      }
      try {
        var updated = host.update(function (lp) {
          lp.x = Number(originalGeometry.x || 0);
          lp.y = Number(originalGeometry.y || 0);
          lp.width = Number(originalGeometry.width || 0);
          lp.height = Number(originalGeometry.height || 0);
          lp.flags = Number(originalGeometry.flags || lp.flags || 0);
          lp.softInputMode = Number(originalGeometry.softInputMode || lp.softInputMode || 0);
        }, 1800);
        var current = hostGeometry(host);
        geometryRestored = !!(updated && updated.ok && current &&
          current.x === Number(originalGeometry.x || 0) &&
          current.y === Number(originalGeometry.y || 0) &&
          current.width === Number(originalGeometry.width || 0) &&
          current.height === Number(originalGeometry.height || 0));
        adjusted = false;
        if (!geometryRestored) stats.errors += 1;
        return geometryRestored ? Result.ok("GEOMETRY_RESTORED", true) : Result.fail("GEOMETRY_RESTORE_FAILED", "Host geometry did not return to its original values");
      } catch (error) {
        geometryRestored = false;
        stats.errors += 1;
        return Result.fail("GEOMETRY_RESTORE_FAILED", errorText(error));
      }
    }

    function hide() {
      if (disposed) return failDisposed();
      var hidden = runOnDispatcher(dispatcher, function () {
        var token = null;
        try { if (target) token = target.getWindowToken(); } catch (eToken) { token = null; }
        var value = false;
        if (imm && token) value = imm.hideSoftInputFromWindow(token, 0);
        try { if (target) target.clearFocus(); } catch (eClear) {}
        try { if (root) root.requestFocus(); } catch (eRootFocus) {}
        return value;
      }, 1800);
      stats.hideRequests += 1;
      var restored = restoreGeometry();
      state = Lifecycle.READY;
      if (!hidden.ok || !restored.ok) stats.errors += 1;
      return hidden.ok && restored.ok ? Result.ok("IME_HIDE_REQUESTED", hidden.value, { restored: restored }) :
        Result.fail("IME_HIDE_FAILED", "IME hide or geometry restore failed", { hidden: hidden, restored: restored });
    }

    function dispose() {
      if (disposed) return Result.ok(Errors.ALREADY_DISPOSED, false);
      try { hide(); } catch (eHide) { stats.errors += 1; }
      disposed = true;
      state = Lifecycle.DISPOSED;
      stats.disposals += 1;
      root = null;
      target = null;
      host = null;
      dispatcher = null;
      imm = null;
      return Result.ok("DISPOSED", true);
    }

    function snapshot() {
      return {
        version: IME_VERSION,
        state: state,
        disposed: disposed,
        hasRoot: !!root,
        hasTarget: !!target,
        hasHost: !!host,
        visible: lastVisible,
        height: lastHeight,
        source: lastSource,
        adjusted: adjusted,
        geometryRestored: geometryRestored,
        originalGeometry: copyPlain(originalGeometry),
        stats: copyPlain(stats)
      };
    }

    if (!target) return Result.fail(Errors.IME_TARGET_REQUIRED, "IME target view is required");
    return Result.ok(Errors.OK, {
      requestFocus: requestFocus,
      show: show,
      hide: hide,
      read: read,
      restoreGeometry: restoreGeometry,
      dispose: dispose,
      getState: function () { return state; },
      snapshot: snapshot
    });
  }

  function createBackController(options) {
    var opts = options || {};
    var view = opts.view || null;
    var disposed = false;
    var registered = false;
    var dispatcher = null;
    var callback = null;
    var mode = String(opts.mode || "delegate");
    var state = Lifecycle.READY;
    var priority = Number(opts.priority || 0);
    var stats = {
      starts: 0,
      progresses: 0,
      cancels: 0,
      invokes: 0,
      blocked: 0,
      registrations: 0,
      unregistrations: 0,
      disposals: 0,
      errors: 0
    };

    function failDisposed() {
      return Result.fail(Errors.BACK_CONTROLLER_DISPOSED, "BackController is disposed");
    }

    function canInvoke() {
      try { return typeof opts.canInvoke === "function" ? opts.canInvoke() !== false : true; }
      catch (error) { stats.errors += 1; return false; }
    }

    function start(event) {
      if (disposed) return failDisposed();
      stats.starts += 1;
      state = Lifecycle.RUNNING;
      try { if (typeof opts.onStart === "function") opts.onStart(event || null); }
      catch (error) { stats.errors += 1; return Result.fail("BACK_START_FAILED", errorText(error)); }
      return Result.ok("BACK_STARTED", true);
    }

    function progress(value, event) {
      if (disposed) return failDisposed();
      var p = Number(value || 0);
      if (isNaN(p)) p = 0;
      if (p < 0) p = 0;
      if (p > 1) p = 1;
      stats.progresses += 1;
      try { if (typeof opts.onProgress === "function") opts.onProgress(p, event || null); }
      catch (error) { stats.errors += 1; return Result.fail("BACK_PROGRESS_FAILED", errorText(error)); }
      return Result.ok("BACK_PROGRESS", p);
    }

    function cancel(reason) {
      if (disposed) return failDisposed();
      stats.cancels += 1;
      state = Lifecycle.READY;
      try { if (typeof opts.onCancel === "function") opts.onCancel(String(reason || "cancel")); }
      catch (error) { stats.errors += 1; return Result.fail("BACK_CANCEL_FAILED", errorText(error)); }
      return Result.ok("BACK_CANCELLED", true);
    }

    function invoke(reason) {
      if (disposed) return failDisposed();
      if (!canInvoke()) {
        stats.blocked += 1;
        state = Lifecycle.READY;
        return Result.ok("BACK_BLOCKED", false);
      }
      stats.invokes += 1;
      state = Lifecycle.READY;
      try {
        var value = typeof opts.onInvoke === "function" ? opts.onInvoke(String(reason || "back")) : true;
        return Result.ok("BACK_INVOKED", value !== false);
      } catch (error) {
        stats.errors += 1;
        return Result.fail("BACK_INVOKE_FAILED", errorText(error));
      }
    }

    function unregister() {
      if (disposed) return failDisposed();
      if (!registered) return Result.ok("ALREADY_UNREGISTERED", false);
      try {
        if (dispatcher && callback) dispatcher.unregisterOnBackInvokedCallback(callback);
        registered = false;
        dispatcher = null;
        callback = null;
        stats.unregistrations += 1;
        return Result.ok("BACK_UNREGISTERED", true);
      } catch (error) {
        stats.errors += 1;
        return Result.fail("BACK_UNREGISTER_FAILED", errorText(error));
      }
    }

    function register() {
      if (disposed) return failDisposed();
      if (registered) return Result.ok("ALREADY_REGISTERED", false);
      if (!view || android.os.Build.VERSION.SDK_INT < 33) {
        return Result.fail(Errors.BACK_CALLBACK_UNAVAILABLE, "A view attached to an Android 13+ window is required");
      }
      try { dispatcher = view.findOnBackInvokedDispatcher(); }
      catch (eFind) { dispatcher = null; }
      if (!dispatcher) return Result.fail(Errors.BACK_CALLBACK_UNAVAILABLE, "OnBackInvokedDispatcher is unavailable");

      try {
        if (android.os.Build.VERSION.SDK_INT >= 34) {
          var animCls = java.lang.Class.forName("android.window.OnBackAnimationCallback");
          callback = new JavaAdapter(Packages.android.window.OnBackAnimationCallback, {
            onBackStarted: function (event) { start(event); },
            onBackProgressed: function (event) {
              var p = 0;
              try { p = Number(event.getProgress()); } catch (eP) { p = 0; }
              progress(p, event);
            },
            onBackCancelled: function () { cancel("physical-cancel"); },
            onBackInvoked: function () { invoke("physical-invoke"); }
          });
          if (animCls.isInstance(callback)) mode = "OnBackAnimationCallback";
          else callback = null;
        }
      } catch (eAnim) { callback = null; }

      if (!callback) {
        try {
          var cbCls = java.lang.Class.forName("android.window.OnBackInvokedCallback");
          callback = new JavaAdapter(cbCls, {
            onBackInvoked: function () { invoke("physical-invoke"); }
          });
          mode = "OnBackInvokedCallback";
        } catch (eCb) { callback = null; }
      }
      if (!callback) return Result.fail(Errors.BACK_CALLBACK_UNAVAILABLE, "Unable to create a back callback");
      try {
        var p = priority;
        try { if (!p) p = android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT; } catch (ePriority) { p = 0; }
        dispatcher.registerOnBackInvokedCallback(p, callback);
        priority = p;
        registered = true;
        stats.registrations += 1;
        return Result.ok("BACK_REGISTERED", true, { mode: mode, priority: priority });
      } catch (error) {
        callback = null;
        dispatcher = null;
        stats.errors += 1;
        return Result.fail("BACK_REGISTER_FAILED", errorText(error));
      }
    }

    function dispose() {
      if (disposed) return Result.ok(Errors.ALREADY_DISPOSED, false);
      if (registered) {
        try { unregister(); } catch (eUnregister) { stats.errors += 1; }
      }
      disposed = true;
      state = Lifecycle.DISPOSED;
      stats.disposals += 1;
      view = null;
      dispatcher = null;
      callback = null;
      return Result.ok("DISPOSED", true);
    }

    function snapshot() {
      return {
        version: BACK_VERSION,
        state: state,
        disposed: disposed,
        registered: registered,
        mode: mode,
        priority: priority,
        hasView: !!view,
        stats: copyPlain(stats)
      };
    }

    var controller = {
      start: start,
      progress: progress,
      cancel: cancel,
      invoke: invoke,
      register: register,
      unregister: unregister,
      dispose: dispose,
      getState: function () { return state; },
      snapshot: snapshot
    };
    if (opts.autoRegister === true) {
      var registeredResult = register();
      if (!registeredResult.ok && opts.requireRegistration === true) return registeredResult;
    }
    return Result.ok(Errors.OK, controller);
  }

  addErrorCodes();
  SX.ImeController = { VERSION: IME_VERSION, create: createImeController };
  SX.BackController = { VERSION: BACK_VERSION, create: createBackController };
  SX.Components.ImeController = SX.ImeController;
  SX.Components.BackController = SX.BackController;
  SX.API_VERSION = API_VERSION;
  SX.API.VERSION = API_VERSION;
  SX.API.createImeController = createImeController;
  SX.API.createBackController = createBackController;

  var oldCapability = SX.API.capability;
  SX.API.capability = function () {
    var value = oldCapability ? oldCapability() : {};
    value.apiVersion = API_VERSION;
    if (!value.stable) value.stable = {};
    value.stable.imeController = true;
    value.stable.backController = true;
    if (!value.verifiedNotExported) value.verifiedNotExported = {};
    value.verifiedNotExported.imeController = false;
    value.verifiedNotExported.backController = false;
    value.verifiedNotExported.dexBridge = true;
    value.externalDexPayloadEnabled = false;
    return value;
  };

  var oldVersionInfo = SX.API.versionInfo;
  SX.API.versionInfo = function () {
    var value = oldVersionInfo ? oldVersionInfo() : {};
    value.apiVersion = API_VERSION;
    value.finalAcceptanceVersion = VERSION;
    value.imeControllerVersion = IME_VERSION;
    value.backControllerVersion = BACK_VERSION;
    return value;
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

  function readLatest() {
    var root = diagnosticsRoot();
    if (!root) return {};
    var text = readText(new java.io.File(root + "/diagnostics/shortx-ui/latest.json"));
    if (!text) return {};
    try { return JSON.parse(text); } catch (e) {}
    return {};
  }

  function persistFinal(app) {
    var root = diagnosticsRoot();
    if (!root || !app || !app.state) return false;
    var file = new java.io.File(root + "/diagnostics/shortx-ui/latest.json");
    var payload = readLatest();
    if (!payload || typeof payload !== "object") payload = {};
    payload.schema = Math.max(12, Number(payload.schema || 0));
    payload.runtimeVersion = String(SX.VERSION || "");
    payload.apiVersion = API_VERSION;
    var frozen = app.state.shortXUiFinalFrozenSnapshot || null;
    if (frozen && typeof frozen === "object") {
      var preserveKeys = [
        "apiFacade", "apiComponents", "apiComponentsStress",
        "routeIntegration", "routeIntegrationStress", "routeIntegrationLifecycle",
        "apiComponentsReconciledBy", "routeIntegrationReconciledBy"
      ];
      var preserveIndex;
      for (preserveIndex = 0; preserveIndex < preserveKeys.length; preserveIndex += 1) {
        var preserveKey = preserveKeys[preserveIndex];
        if ((payload[preserveKey] === null || payload[preserveKey] === undefined) &&
            frozen[preserveKey] !== null && frozen[preserveKey] !== undefined) {
          payload[preserveKey] = copyPlain(frozen[preserveKey]);
        }
      }
    }
    payload.finalAcceptance = copyPlain(app.state.shortXUiFinalAcceptance || null);
    payload.finalManual = copyPlain(app.state.shortXUiFinalManual || null);
    payload.finalRouteLifecycle = copyPlain(app.state.shortXUiFinalLifecycle || null);
    payload.finalAcceptanceVersion = VERSION;
    payload.savedAt = now();
    var finalResult = payload.finalAcceptance;
    var manual = payload.finalManual;
    var priorOk = payload.ok !== false;
    if (finalResult && finalResult.running !== true && finalResult.automatedOk === false) priorOk = false;
    if (manual && manual.completed === true && manual.ok === false) priorOk = false;
    payload.ok = priorOk;
    return writeJsonAtomic(file, payload);
  }

  function finalSessionSnapshot(session) {
    if (!session) return { state: "IDLE", disposed: true, ime: null, back: null };
    return {
      version: VERSION,
      state: String(session.state || ""),
      disposed: session.disposed === true,
      attached: session.attached === true,
      createdAt: Number(session.createdAt || 0),
      disposedAt: Number(session.disposedAt || 0),
      disposeReason: String(session.disposeReason || ""),
      ime: session.ime && session.ime.snapshot ? session.ime.snapshot() : null,
      back: session.back && session.back.snapshot ? session.back.snapshot() : null,
      scopeDisposed: !!(session.scope && session.scope.isDisposed && session.scope.isDisposed()),
      dispatcher: session.dispatcher && session.dispatcher.getState ? session.dispatcher.getState() : null,
      errors: Number(session.errors || 0)
    };
  }

  function disposeFinalSession(app, reason) {
    var session = app && app.state ? app.state.shortXUiFinalSession : null;
    if (!session || session.disposed === true) return true;
    session.disposeReason = String(reason || "dispose");
    session.attached = false;
    session.state = Lifecycle.CLOSING;
    var errors = [];
    try { if (session.ime) session.ime.dispose(); } catch (eIme) { errors.push("ime:" + errorText(eIme)); }
    try { if (session.back) session.back.dispose(); } catch (eBack) { errors.push("back:" + errorText(eBack)); }
    try { if (session.scope) session.scope.dispose(); } catch (eScope) { errors.push("scope:" + errorText(eScope)); }
    try { if (session.dispatcher) session.dispatcher.dispose(); } catch (eDispatcher) { errors.push("dispatcher:" + errorText(eDispatcher)); }
    session.disposed = true;
    session.disposedAt = now();
    session.state = Lifecycle.DISPOSED;
    session.errors += errors.length;
    var lifecycle = {
      schema: 1,
      version: VERSION,
      ok: errors.length === 0,
      reason: session.disposeReason,
      errors: errors,
      snapshot: finalSessionSnapshot(session)
    };
    if (app && app.state) {
      app.state.shortXUiFinalLifecycle = lifecycle;
      if (app.state.shortXUiFinalSession === session) app.state.shortXUiFinalSession = null;
      app.state.shortXUiFinalStatusView = null;
    }
    persistFinal(app);
    log(app, lifecycle.ok ? "i" : "e", "SHORTXUI_FINAL_ROUTE_DISPOSE ok=" + String(lifecycle.ok) +
      " reason=" + lifecycle.reason + " errors=" + String(errors.length));
    return lifecycle.ok;
  }

  function ensureManualState(app) {
    if (!app.state.shortXUiFinalManual) {
      app.state.shortXUiFinalManual = {
        schema: 1,
        version: VERSION,
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

  function formatFinal(app) {
    var result = app && app.state ? app.state.shortXUiFinalAcceptance || null : null;
    var manual = app && app.state ? ensureManualState(app) : null;
    var lines = [];
    lines.push("最终验收 · API=" + API_VERSION);
    lines.push("ImeController=" + IME_VERSION + " BackController=" + BACK_VERSION);
    if (!result) {
      lines.push("自动验收：尚未运行");
    } else {
      lines.push("自动验收：" + (result.running ? "运行中" : (result.automatedOk ? "通过" : "失败")));
      lines.push("checks=" + String(Number(result.passed || 0)) + "/" + String(Number(result.total || 0)) +
        " errors=" + String(Number(result.errors && result.errors.length || 0)));
      if (result.imeStress) {
        lines.push("IME=" + String(result.imeStress.cyclesCompleted || 0) + "/" + String(result.imeStress.cyclesRequested || 0) +
          " visible=" + String(result.imeStress.visiblePasses || 0) +
          " restore=" + String(result.imeStress.hideRestorePasses || 0));
      }
      if (result.backLogic) {
        lines.push("Back logic=" + String(result.backLogic.cyclesCompleted || 0) + "/" + String(result.backLogic.cyclesRequested || 0));
      }
    }
    lines.push("手动交互：" + (manual && manual.completed ? (manual.ok ? "通过" : "失败") : "待执行"));
    lines.push("测试一次：IME重开 → 系统返回 → Home → 最近任务");
    return lines.join("\n");
  }

  function refreshFinal(app) {
    if (!app || !app.state) return;
    var view = app.state.shortXUiFinalStatusView || null;
    if (!view) return;
    var update = function () { try { view.setText(formatFinal(app)); } catch (e) {} };
    try {
      var session = app.state.shortXUiFinalSession;
      if (session && session.dispatcher && session.dispatcher.post) {
        session.dispatcher.post(update, "final-status");
        return;
      }
    } catch (ePost) {}
    try { new android.os.Handler(android.os.Looper.getMainLooper()).post(new java.lang.Runnable({ run: update })); }
    catch (eHandler) {}
  }

  function createFinalSession(app, panel, statusView, edit) {
    if (!app.state) app.state = {};
    var old = app.state.shortXUiFinalSession;
    if (old && old.disposed !== true) disposeFinalSession(app, "route-rebuild");
    var dispatcherResult = SX.API.createMainDispatcher();
    var scopeResult = SX.API.createScope("shortx-ui-final-" + String(now()));
    if (!dispatcherResult.ok || !scopeResult.ok) return Result.fail("FINAL_SESSION_CREATE_FAILED", "Unable to create final route scope/dispatcher");
    var session = {
      state: Lifecycle.READY,
      disposed: false,
      attached: false,
      createdAt: now(),
      disposedAt: 0,
      disposeReason: "",
      panel: panel,
      edit: edit,
      statusView: statusView,
      dispatcher: dispatcherResult.value,
      scope: scopeResult.value,
      ime: null,
      back: null,
      listener: null,
      errors: 0
    };
    var imeResult = SX.API.createImeController({
      rootView: app.state.toolAppRoot || panel,
      targetView: edit,
      dispatcher: session.dispatcher
    });
    if (!imeResult.ok) {
      try { session.scope.dispose(); } catch (eScope) {}
      try { session.dispatcher.dispose(); } catch (eDispatcher) {}
      return imeResult;
    }
    session.ime = imeResult.value;
    var backResult = SX.API.createBackController({
      mode: "delegate_existing_toolapp_pipeline",
      autoRegister: false,
      canInvoke: function () { return !!(app.state && app.state.toolAppActive); },
      onInvoke: function (reason) {
        if (typeof app.handlePanelBack === "function") return app.handlePanelBack("tool_app", reason || "shortxui-final-back");
        return false;
      },
      onCancel: function () {
        try { if (app.resetPanelPredictiveBackVisual && app.state.toolAppRoot) app.resetPanelPredictiveBackVisual(app.state.toolAppRoot); }
        catch (eCancel) {}
      }
    });
    if (!backResult.ok) {
      try { session.ime.dispose(); } catch (eIme) {}
      try { session.scope.dispose(); } catch (eScope2) {}
      try { session.dispatcher.dispose(); } catch (eDispatcher2) {}
      return backResult;
    }
    session.back = backResult.value;
    try {
      session.scope.defer(function () { try { if (session.back) session.back.dispose(); } catch (e0) {} });
      session.scope.defer(function () { try { if (session.ime) session.ime.dispose(); } catch (e1) {} });
      session.scope.defer(function () { try { if (session.dispatcher) session.dispatcher.dispose(); } catch (e2) {} });
    } catch (eDefer) { session.errors += 1; }
    session.listener = new android.view.View.OnAttachStateChangeListener({
      onViewAttachedToWindow: function () {
        if (session.disposed) return;
        session.attached = true;
        session.state = Lifecycle.ATTACHED;
        refreshFinal(app);
      },
      onViewDetachedFromWindow: function () {
        if (session.disposed) return;
        disposeFinalSession(app, "view-detached");
      }
    });
    try { panel.addOnAttachStateChangeListener(session.listener); } catch (eListener) { session.errors += 1; }
    try {
      if (panel.isAttachedToWindow && panel.isAttachedToWindow()) {
        session.attached = true;
        session.state = Lifecycle.ATTACHED;
      }
    } catch (eAttached) {}
    app.state.shortXUiFinalSession = session;
    app.state.shortXUiFinalStatusView = statusView;
    ensureManualState(app);
    return Result.ok("FINAL_SESSION_READY", session);
  }

  function addCheck(result, name, ok, detail) {
    result.checks.push({ name: String(name), ok: ok === true, detail: copyPlain(detail) });
  }

  function frozenDiagnosticsChecks(result, latest) {
    var apiFacade = latest.apiFacade || null;
    var components = latest.apiComponents || null;
    var componentStress = latest.apiComponentsStress || null;
    var route = latest.routeIntegration || null;
    var routeStress = latest.routeIntegrationStress || null;
    var routeLifecycle = latest.routeIntegrationLifecycle || null;
    addCheck(result, "frozen-api-facade", !!apiFacade && apiFacade.ok === true, apiFacade);
    addCheck(result, "frozen-components", !!components && components.ok === true, components);
    addCheck(result, "frozen-component-stress", !!componentStress && componentStress.ok === true && Number(componentStress.errors || 0) === 0, componentStress);
    addCheck(result, "frozen-route-baseline", !!route && route.ok === true && Number(route.passed || 0) === Number(route.total || 0), route);
    addCheck(result, "frozen-route-stress", !!routeStress && routeStress.ok === true && Number(routeStress.freshWindowAttaches || 0) === 10 && Number(routeStress.errors || 0) === 0, routeStress);
    addCheck(result, "frozen-route-lifecycle", !!routeLifecycle && routeLifecycle.ok === true && routeLifecycle.snapshot && routeLifecycle.snapshot.attached === false && routeLifecycle.snapshot.dispatcherDisposed === true, routeLifecycle);
  }

  function runBackLogic() {
    var invoked = 0;
    var cancelled = 0;
    var created = SX.API.createBackController({
      autoRegister: false,
      onInvoke: function () { invoked += 1; return true; },
      onCancel: function () { cancelled += 1; }
    });
    var output = {
      ok: false,
      cyclesRequested: BACK_LOGIC_CYCLES,
      cyclesCompleted: 0,
      invoked: 0,
      cancelled: 0,
      rejectedAfterDispose: false,
      snapshot: null,
      error: ""
    };
    if (!created.ok) {
      output.error = String(created.code || "CREATE_FAILED");
      return output;
    }
    var controller = created.value;
    var i;
    try {
      for (i = 0; i < BACK_LOGIC_CYCLES; i += 1) {
        var started = controller.start({ index: i + 1 });
        var progressed = controller.progress((i + 1) / BACK_LOGIC_CYCLES, null);
        var ended = i % 2 === 0 ? controller.cancel("logic") : controller.invoke("logic");
        if (!started.ok || !progressed.ok || !ended.ok) throw "cycle failed at " + String(i + 1);
        output.cyclesCompleted += 1;
      }
      var before = controller.snapshot();
      var disposed = controller.dispose();
      var rejected = controller.invoke("after-dispose");
      output.invoked = invoked;
      output.cancelled = cancelled;
      output.rejectedAfterDispose = disposed.ok === true && rejected.ok === false && String(rejected.code || "") === Errors.BACK_CONTROLLER_DISPOSED;
      output.snapshot = before;
      output.ok = output.cyclesCompleted === BACK_LOGIC_CYCLES &&
        invoked === BACK_LOGIC_CYCLES / 2 && cancelled === BACK_LOGIC_CYCLES / 2 &&
        output.rejectedAfterDispose && Number(before.stats.errors || 0) === 0;
    } catch (error) {
      output.error = errorText(error);
      try { controller.dispose(); } catch (eDispose) {}
    }
    return output;
  }

  function waitImeStress(app) {
    var started = now();
    while (now() - started < IME_WAIT_MS) {
      var stress = app && app.state ? app.state.shortXUiImeStressResult || null : null;
      if (stress && stress.running !== true) return copyPlain(stress);
      try { java.lang.Thread.sleep(POLL_MS); } catch (eSleep) {}
    }
    return { ok: false, running: false, code: "IME_FINAL_TIMEOUT", cyclesRequested: 20, cyclesCompleted: 0, errors: 1 };
  }

  proto.runShortXUiFinalAcceptance = function () {
    if (!this.state) this.state = {};
    var existing = this.state.shortXUiFinalAcceptance;
    if (existing && existing.running === true) return existing;
    var self = this;
    var result = {
      schema: 1,
      version: VERSION,
      runtimeVersion: String(SX.VERSION || ""),
      apiVersion: API_VERSION,
      automatedOk: false,
      ok: false,
      running: true,
      readyForManual: false,
      startedAt: now(),
      finishedAt: 0,
      durationMs: 0,
      passed: 0,
      total: 0,
      checks: [],
      backLogic: null,
      imeStress: null,
      errors: []
    };
    this.state.shortXUiFinalFrozenSnapshot = readLatest();
    this.state.shortXUiFinalAcceptance = result;
    persistFinal(this);
    refreshFinal(this);

    var mainHandler = new android.os.Handler(android.os.Looper.getMainLooper());
    var thread = new java.lang.Thread(new java.lang.Runnable({ run: function () {
      try {
        var latest = self.state && self.state.shortXUiFinalFrozenSnapshot ?
          self.state.shortXUiFinalFrozenSnapshot : readLatest();
        addCheck(result, "runtime-version", String(SX.VERSION || "") === "0.2.0", { value: SX.VERSION });
        addCheck(result, "api-version", String(SX.API.VERSION || "") === API_VERSION, { value: SX.API.VERSION });
        addCheck(result, "ime-exported", !!SX.ImeController && typeof SX.API.createImeController === "function", { version: SX.ImeController && SX.ImeController.VERSION });
        addCheck(result, "back-exported", !!SX.BackController && typeof SX.API.createBackController === "function", { version: SX.BackController && SX.BackController.VERSION });
        var cap = SX.API.capability();
        addCheck(result, "capability", cap.stable && cap.stable.imeController === true && cap.stable.backController === true && cap.externalDexPayloadEnabled === false, cap);
        var dex = SX.API.createDexBridge({});
        addCheck(result, "external-dex-disabled", dex && dex.ok === false && String(dex.code || "") === Errors.EXTERNAL_DEX_DISABLED, dex);
        addCheck(result, "toolapp-back-pipeline", typeof self.handlePanelBack === "function" && typeof self.handleSystemUiDismiss === "function" && typeof self.registerPanelPredictiveBack === "function", null);
        frozenDiagnosticsChecks(result, latest);

        var finalSession = self.state ? self.state.shortXUiFinalSession || null : null;
        addCheck(result, "real-route-session", !!finalSession && finalSession.disposed !== true && finalSession.attached === true, finalSessionSnapshot(finalSession));
        addCheck(result, "real-route-ime-controller", !!finalSession && !!finalSession.ime && finalSession.ime.snapshot().disposed !== true, finalSession && finalSession.ime ? finalSession.ime.snapshot() : null);
        addCheck(result, "real-route-back-controller", !!finalSession && !!finalSession.back && finalSession.back.snapshot().disposed !== true, finalSession && finalSession.back ? finalSession.back.snapshot() : null);

        result.backLogic = runBackLogic();
        addCheck(result, "back-logic-50", result.backLogic.ok === true, result.backLogic);

        var startLatch = new java.util.concurrent.CountDownLatch(1);
        mainHandler.post(new java.lang.Runnable({ run: function () {
          try {
            if (typeof self.closeShortXUiImeWindow === "function") self.closeShortXUiImeWindow(true, true);
            if (typeof self.runShortXUiImeStress !== "function") throw "IME stress method unavailable";
            self.state.shortXUiImeStressResult = null;
            self.runShortXUiImeStress();
          } catch (error) {
            self.state.shortXUiImeStressResult = { ok: false, running: false, code: "IME_STRESS_START_FAILED", error: errorText(error), errors: 1 };
          }
          startLatch.countDown();
        }}));
        try { startLatch.await(5000, java.util.concurrent.TimeUnit.MILLISECONDS); } catch (eLatch) {}
        result.imeStress = waitImeStress(self);
        var imeOk = !!result.imeStress && result.imeStress.ok === true &&
          Number(result.imeStress.cyclesCompleted || 0) === Number(result.imeStress.cyclesRequested || 20) &&
          Number(result.imeStress.visiblePasses || 0) === Number(result.imeStress.cyclesRequested || 20) &&
          Number(result.imeStress.timeouts || 0) === 0 && Number(result.imeStress.errors || 0) === 0;
        addCheck(result, "ime-stress", imeOk, result.imeStress);
      } catch (error) {
        result.errors.push(errorText(error));
      }

      var i;
      for (i = 0; i < result.checks.length; i += 1) if (result.checks[i].ok) result.passed += 1;
      result.total = result.checks.length;
      result.running = false;
      result.finishedAt = now();
      result.durationMs = Math.max(0, result.finishedAt - result.startedAt);
      result.automatedOk = result.passed === result.total && result.errors.length === 0;
      result.readyForManual = result.automatedOk;
      var manual = ensureManualState(self);
      result.ok = result.automatedOk && manual.completed === true && manual.ok === true;
      result.status = result.ok ? "FINAL_PASS" : (result.automatedOk ? "AUTOMATED_PASS_MANUAL_PENDING" : "AUTOMATED_FAILED");

      mainHandler.post(new java.lang.Runnable({ run: function () {
        self.state.shortXUiFinalAcceptance = result;
        persistFinal(self);
        refreshFinal(self);
        log(self, result.automatedOk ? "i" : "e", "SHORTXUI_FINAL_AUTOMATED ok=" + String(result.automatedOk) +
          " passed=" + String(result.passed) + "/" + String(result.total) +
          " ime=" + String(result.imeStress && result.imeStress.cyclesCompleted || 0) +
          " back=" + String(result.backLogic && result.backLogic.cyclesCompleted || 0) +
          " errors=" + String(result.errors.length));
      }}));
    }}), "ToolHub-Final-Acceptance");
    try { thread.setDaemon(true); } catch (eDaemon) {}
    thread.start();
    return result;
  };

  proto.openShortXUiFinalManualIme = function () {
    try {
      if (typeof this.openShortXUiImeWindow === "function") return this.openShortXUiImeWindow(true);
    } catch (error) { return { ok: false, code: "IME_OPEN_FAILED", error: errorText(error) }; }
    return { ok: false, code: "IME_METHOD_UNAVAILABLE" };
  };

  proto.markShortXUiFinalManualPass = function () {
    if (!this.state) this.state = {};
    var manual = ensureManualState(this);
    manual.completed = true;
    manual.ok = true;
    manual.imeReopen = true;
    manual.systemBack = true;
    manual.home = true;
    manual.recents = true;
    manual.markedAt = now();
    var result = this.state.shortXUiFinalAcceptance || null;
    if (result) {
      result.ok = result.automatedOk === true;
      result.status = result.ok ? "FINAL_PASS" : "AUTOMATED_FAILED";
    }
    persistFinal(this);
    refreshFinal(this);
    log(this, "i", "SHORTXUI_FINAL_MANUAL ok=true ime=true back=true home=true recents=true");
    return { ok: true, code: "MANUAL_ACCEPTANCE_MARKED", manual: copyPlain(manual), final: copyPlain(result) };
  };

  proto.resetShortXUiFinalManual = function () {
    if (!this.state) this.state = {};
    this.state.shortXUiFinalManual = null;
    var manual = ensureManualState(this);
    var result = this.state.shortXUiFinalAcceptance || null;
    if (result) {
      result.ok = false;
      result.status = result.automatedOk ? "AUTOMATED_PASS_MANUAL_PENDING" : "AUTOMATED_FAILED";
    }
    persistFinal(this);
    refreshFinal(this);
    return { ok: true, code: "MANUAL_ACCEPTANCE_RESET", manual: copyPlain(manual) };
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
        title.setText("最终全量验收");
        title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        SX.Color.applyText(title, onSurface);
        box.addView(title, new android.widget.LinearLayout.LayoutParams(-1, -2));

        var desc = new android.widget.TextView(context);
        desc.setText("一次运行剩余自动测试；之后只做一轮 IME 重开、系统返回、Home、最近任务，并点击一次确认。");
        desc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
        desc.setPadding(0, metrics.dp(3), 0, metrics.dp(8));
        SX.Color.applyText(desc, onSurface2);
        box.addView(desc, new android.widget.LinearLayout.LayoutParams(-1, -2));

        var status = new android.widget.TextView(context);
        status.setText(formatFinal(this));
        status.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
        status.setTypeface(android.graphics.Typeface.MONOSPACE);
        status.setTextIsSelectable(false);
        status.setPadding(metrics.dp(10), metrics.dp(9), metrics.dp(10), metrics.dp(9));
        status.setBackground(SX.Shape.roundRect(surface, metrics.dp(12)));
        SX.Color.applyText(status, onSurface2);
        box.addView(status, new android.widget.LinearLayout.LayoutParams(-1, -2));

        var edit = new android.widget.EditText(context);
        edit.setHint("最终 IME 手动测试输入框");
        edit.setText("ShortXUI final IME");
        edit.setSingleLine(true);
        edit.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
        edit.setPadding(metrics.dp(10), metrics.dp(8), metrics.dp(10), metrics.dp(8));
        edit.setBackground(SX.Shape.strokeRect(surface, primary, metrics.dp(1), metrics.dp(10)));
        SX.Color.applyText(edit, onSurface);
        SX.Color.applyHint(edit, SX.Color.withAlpha(onSurface2, 0.70));
        var editLp = new android.widget.LinearLayout.LayoutParams(-1, metrics.dp(46));
        editLp.topMargin = metrics.dp(8);
        box.addView(edit, editLp);

        function button(label, action, solid) {
          var view = new android.widget.TextView(context);
          view.setText(label);
          view.setGravity(android.view.Gravity.CENTER);
          view.setPadding(metrics.dp(8), metrics.dp(9), metrics.dp(8), metrics.dp(9));
          view.setBackground(SX.Shape.pressed(
            solid ? primary : SX.Color.withAlpha(primary, 0.16),
            solid ? SX.Color.withAlpha(primary, 0.82) : SX.Color.withAlpha(primary, 0.30),
            metrics.dp(10)
          ));
          SX.Color.applyText(view, solid && T && T.onPrimary ? T.onPrimary : onSurface);
          view.setOnClickListener(new android.view.View.OnClickListener({ onClick: action }));
          return view;
        }

        var run = button("运行最终自动验收", function () {
          self.runShortXUiFinalAcceptance();
          refreshFinal(self);
        }, true);
        var runLp = new android.widget.LinearLayout.LayoutParams(-1, metrics.dp(46));
        runLp.topMargin = metrics.dp(8);
        box.addView(run, runLp);

        var row = new android.widget.LinearLayout(context);
        row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        row.setPadding(0, metrics.dp(7), 0, 0);
        var ime = button("打开 IME 手动窗口", function () { self.openShortXUiFinalManualIme(); }, false);
        var mark = button("手动交互全部通过", function () { self.markShortXUiFinalManualPass(); }, false);
        var imeLp = new android.widget.LinearLayout.LayoutParams(0, metrics.dp(46), 1);
        imeLp.rightMargin = metrics.dp(6);
        row.addView(ime, imeLp);
        row.addView(mark, new android.widget.LinearLayout.LayoutParams(0, metrics.dp(46), 1));
        box.addView(row, new android.widget.LinearLayout.LayoutParams(-1, -2));

        var reset = button("重置手动确认", function () { self.resetShortXUiFinalManual(); }, false);
        var resetLp = new android.widget.LinearLayout.LayoutParams(-1, metrics.dp(42));
        resetLp.topMargin = metrics.dp(6);
        box.addView(reset, resetLp);

        var boxLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
        boxLp.bottomMargin = metrics.dp(10);
        content.addView(box, boxLp);
        createFinalSession(this, panel, status, edit);
      } catch (error) {
        log(this, "e", "Build final acceptance card failed: " + errorText(error));
      }
      return panel;
    };
  }

  var oldCloseToolApp = proto.closeToolApp;
  if (typeof oldCloseToolApp === "function") {
    proto.closeToolApp = function () {
      try { disposeFinalSession(this, "tool-app-close"); } catch (eDispose) {}
      return oldCloseToolApp.apply(this, arguments);
    };
  }

  proto.__toolHubShortXUiFinalAcceptanceInstalled = true;
  global.ToolHubBetaFinalAcceptance = {
    VERSION: VERSION,
    API_VERSION: API_VERSION,
    IME_CONTROLLER_VERSION: IME_VERSION,
    BACK_CONTROLLER_VERSION: BACK_VERSION,
    TARGET_ROUTE: TARGET_ROUTE,
    SINGLE_AUTOMATED_RUN: true,
    SINGLE_MANUAL_ROUND: true,
    EXTERNAL_DEX_PAYLOAD_ENABLED: false
  };
  try { writeLog("ShortXUI final acceptance installed version=" + VERSION + " api=" + API_VERSION +
    " ime=" + IME_VERSION + " back=" + BACK_VERSION); } catch (eLog) {}
}(function () { return this; }()));
