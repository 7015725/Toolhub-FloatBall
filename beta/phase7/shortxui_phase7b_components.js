// ToolHub Beta ShortXUI Phase 7B: public FrameLoop and ReflectionBridge components. Rhino ES5.
(function (global) {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
  if (!global.ShortXUI || global.ShortXUI.__runtimeInstalled !== true || !global.ShortXUI.API) return;

  var proto = FloatBallAppWM.prototype;
  if (proto.__toolHubShortXUiPhase7BComponentsInstalled === true) return;

  var VERSION = "0.8.1-beta-components";
  var API_VERSION = "0.3.1-beta";
  var BASE_API_VERSION = "0.3.0-beta";
  var STRESS_CYCLES = 20;
  var REFLECTION_CALLS_PER_CYCLE = 50;
  var FRAME_TIMEOUT_MS = 4000;

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

  function causeInfo(error) {
    var target = null;
    var cause = null;
    try { target = error && error.javaException ? error.javaException : error; }
    catch (e0) { target = error; }
    try {
      if (target && target instanceof java.lang.reflect.InvocationTargetException) {
        cause = target.getCause();
      }
    } catch (e1) {}
    if (!cause) {
      try { if (target && target.getCause) cause = target.getCause(); }
      catch (e2) {}
    }
    if (!cause) cause = target;
    var className = "";
    var message = "";
    try { if (cause && cause.getClass) className = String(cause.getClass().getName()); }
    catch (e3) {}
    try { message = String(cause && cause.getMessage ? cause.getMessage() : cause); }
    catch (e4) { message = errorText(error); }
    return { target: cause, className: className, message: message };
  }

  function log(app, level, message) {
    try { safeLog(app && app.L, level || "i", String(message || "")); }
    catch (e) {}
  }

  function addErrorCodes() {
    Errors.FRAME_LOOP_UNAVAILABLE = "FRAME_LOOP_UNAVAILABLE";
    Errors.FRAME_CALLBACK_FAILED = "FRAME_CALLBACK_FAILED";
    Errors.FRAME_LOOP_DISPOSED = "FRAME_LOOP_DISPOSED";
    Errors.CLASS_NOT_FOUND = "CLASS_NOT_FOUND";
    Errors.CONSTRUCTOR_NOT_FOUND = "CONSTRUCTOR_NOT_FOUND";
    Errors.METHOD_KIND_MISMATCH = "METHOD_KIND_MISMATCH";
    Errors.BRIDGE_DISPOSED = "BRIDGE_DISPOSED";
  }

  function frameLoopCreate(options) {
    var opts = options || {};
    var dispatcher = opts.dispatcher || null;
    var onFrame = opts.onFrame;
    var invalidate = opts.invalidate;
    var name = String(opts.name || "frame-loop");
    if (!dispatcher || typeof dispatcher.runSync !== "function") {
      return Result.fail(Errors.DISPATCHER_UNAVAILABLE, "dispatcher is required", { component: "FrameLoop" });
    }
    if (typeof onFrame !== "function") {
      return Result.fail(Errors.INVALID_ARGUMENT, "onFrame is required", { component: "FrameLoop" });
    }

    var state = Lifecycle.NEW;
    var disposed = false;
    var running = false;
    var framePosted = false;
    var choreographer = null;
    var callback = null;
    var generation = 1;
    var lastReason = "";
    var stats = {
      requests: 0,
      posts: 0,
      callbacks: 0,
      coalesced: 0,
      changed: 0,
      unchanged: 0,
      invalidates: 0,
      idleStops: 0,
      manualStops: 0,
      cancelledCallbacks: 0,
      lateCallbacks: 0,
      errors: 0
    };
    var transitions = [];

    function transition(next, reason) {
      var target = String(next || state);
      if (target === state) return;
      transitions.push({ from: state, to: target, reason: String(reason || ""), at: now() });
      state = target;
    }

    function normalizeFrameResult(value) {
      if (value && typeof value === "object") {
        return {
          changed: value.changed === true,
          continueRunning: value.continueRunning === true || value.continue === true
        };
      }
      if (value === true) return { changed: true, continueRunning: true };
      return { changed: false, continueRunning: false };
    }

    function onDoFrame(frameTimeNanos) {
      framePosted = false;
      stats.callbacks += 1;
      var callbackGeneration = generation;
      if (disposed) {
        stats.lateCallbacks += 1;
        return;
      }
      var outcome;
      try {
        outcome = normalizeFrameResult(onFrame(Number(frameTimeNanos || 0), {
          generation: callbackGeneration,
          reason: lastReason,
          request: request,
          stop: stop,
          snapshot: snapshot
        }));
      } catch (error) {
        stats.errors += 1;
        running = false;
        transition(Lifecycle.ERROR, "frame-callback-error");
        return;
      }
      if (disposed || callbackGeneration !== generation) {
        stats.lateCallbacks += 1;
        return;
      }
      if (outcome.changed) {
        stats.changed += 1;
        if (typeof invalidate === "function") {
          try { invalidate(); stats.invalidates += 1; }
          catch (errorInvalidate) { stats.errors += 1; }
        }
      } else stats.unchanged += 1;

      if (outcome.continueRunning === true && running === true) {
        postInternal("continue");
      } else {
        running = false;
        stats.idleStops += 1;
        transition(Lifecycle.READY, "idle-stop");
      }
    }

    function ensure() {
      if (disposed) return Result.fail(Errors.FRAME_LOOP_DISPOSED, "FrameLoop is disposed");
      if (choreographer && callback) return Result.ok(Errors.OK, true);
      var ensured = dispatcher.runSync(function () {
        if (!choreographer) choreographer = android.view.Choreographer.getInstance();
        if (!callback) {
          callback = new android.view.Choreographer.FrameCallback({
            doFrame: function (frameTimeNanos) { onDoFrame(frameTimeNanos); }
          });
        }
        return !!choreographer && !!callback;
      }, Number(opts.timeoutMs || 1800));
      if (!ensured || ensured.ok !== true || ensured.value !== true) {
        stats.errors += 1;
        transition(Lifecycle.ERROR, "ensure-failed");
        return Result.fail(Errors.FRAME_LOOP_UNAVAILABLE, "Choreographer is unavailable", {
          detail: ensured || null
        });
      }
      if (state === Lifecycle.NEW) transition(Lifecycle.READY, "initialized");
      return Result.ok(Errors.OK, true);
    }

    function postInternal(reason) {
      if (disposed) return Result.fail(Errors.FRAME_LOOP_DISPOSED, "FrameLoop is disposed");
      stats.requests += 1;
      if (framePosted) {
        stats.coalesced += 1;
        return Result.ok("COALESCED", true);
      }
      var ready = ensure();
      if (!ready.ok) return ready;
      var posted = dispatcher.runSync(function () {
        if (disposed || framePosted) return false;
        choreographer.postFrameCallback(callback);
        framePosted = true;
        lastReason = String(reason || "request");
        return true;
      }, Number(opts.timeoutMs || 1800));
      if (!posted || posted.ok !== true || posted.value !== true) {
        stats.errors += 1;
        return Result.fail(Errors.FRAME_LOOP_UNAVAILABLE, "Unable to post frame callback", {
          detail: posted || null
        });
      }
      stats.posts += 1;
      return Result.ok("POSTED", true);
    }

    function request(reason) {
      if (disposed) return Result.fail(Errors.FRAME_LOOP_DISPOSED, "FrameLoop is disposed");
      running = true;
      transition(Lifecycle.RUNNING, String(reason || "request"));
      return postInternal(reason);
    }

    function stop(reason) {
      if (disposed) return Result.ok(Errors.ALREADY_DISPOSED, false);
      generation += 1;
      running = false;
      var removed = true;
      if (framePosted && choreographer && callback) {
        var result = dispatcher.runSync(function () {
          try { choreographer.removeFrameCallback(callback); }
          catch (e0) { return false; }
          return true;
        }, Number(opts.timeoutMs || 1800));
        removed = !!(result && result.ok === true && result.value === true);
        if (removed) stats.cancelledCallbacks += 1;
        else stats.errors += 1;
      }
      framePosted = false;
      stats.manualStops += 1;
      transition(Lifecycle.READY, String(reason || "manual-stop"));
      return removed ? Result.ok("STOPPED", true) : Result.fail(Errors.FRAME_LOOP_UNAVAILABLE, "Unable to remove frame callback");
    }

    function dispose() {
      if (disposed) return Result.ok(Errors.ALREADY_DISPOSED, false);
      stop("dispose");
      disposed = true;
      generation += 1;
      running = false;
      framePosted = false;
      choreographer = null;
      callback = null;
      onFrame = null;
      invalidate = null;
      transition(Lifecycle.DISPOSED, "dispose");
      return Result.ok("DISPOSED", true);
    }

    function snapshot() {
      return {
        name: name,
        state: state,
        disposed: disposed,
        running: running,
        framePosted: framePosted,
        generation: generation,
        lastReason: lastReason,
        stats: copyPlain(stats),
        transitions: copyPlain(transitions)
      };
    }

    var initialized = ensure();
    if (!initialized.ok) return initialized;
    return Result.ok(Errors.OK, {
      request: request,
      stop: stop,
      dispose: dispose,
      getState: function () { return state; },
      snapshot: snapshot
    });
  }

  function classArray(values) {
    var source = values || [];
    var output = java.lang.reflect.Array.newInstance(java.lang.Class, source.length);
    var i;
    for (i = 0; i < source.length; i += 1) output[i] = source[i];
    return output;
  }

  function objectArray(values) {
    var source = values || [];
    var output = java.lang.reflect.Array.newInstance(java.lang.Object, source.length);
    var i;
    for (i = 0; i < source.length; i += 1) output[i] = source[i];
    return output;
  }

  function primitiveClass(name) {
    var value = String(name || "");
    if (value === "boolean") return java.lang.Boolean.TYPE;
    if (value === "byte") return java.lang.Byte.TYPE;
    if (value === "short") return java.lang.Short.TYPE;
    if (value === "int") return java.lang.Integer.TYPE;
    if (value === "long") return java.lang.Long.TYPE;
    if (value === "float") return java.lang.Float.TYPE;
    if (value === "double") return java.lang.Double.TYPE;
    if (value === "char") return java.lang.Character.TYPE;
    if (value === "void") return java.lang.Void.TYPE;
    return null;
  }

  function normalizeAllowlist(value) {
    var output = {};
    var i;
    if (value && typeof value.length === "number" && typeof value !== "string") {
      for (i = 0; i < value.length; i += 1) output[String(value[i])] = true;
      return output;
    }
    if (value && typeof value === "object") {
      for (i in value) if (value.hasOwnProperty(i) && value[i] === true) output[String(i)] = true;
    }
    return output;
  }

  function reflectionBridgeCreate(options) {
    var opts = options || {};
    var allow = normalizeAllowlist(opts.allowClasses || {});
    var classLoader = opts.classLoader || null;
    var disposed = false;
    var state = Lifecycle.READY;
    var classCache = {};
    var constructorCache = {};
    var methodCache = {};
    var stats = {
      classResolves: 0,
      classCacheHits: 0,
      constructorResolves: 0,
      constructorCacheHits: 0,
      methodResolves: 0,
      methodCacheHits: 0,
      invocations: 0,
      failures: 0,
      disposals: 0
    };

    function failDisposed() {
      return Result.fail(Errors.BRIDGE_DISPOSED, "ReflectionBridge is disposed");
    }

    function allowed(name) {
      return allow[String(name || "")] === true;
    }

    function resolveClass(name) {
      var className = String(name || "");
      if (disposed) return failDisposed();
      if (!className) return Result.fail(Errors.INVALID_ARGUMENT, "class name is required");
      var primitive = primitiveClass(className);
      if (primitive) return Result.ok(Errors.OK, primitive, { primitive: true });
      if (!allowed(className)) {
        stats.failures += 1;
        return Result.fail(Errors.CLASS_NOT_ALLOWED, "Class is not allowlisted", { className: className });
      }
      if (classCache[className]) {
        stats.classCacheHits += 1;
        return Result.ok("CACHE_HIT", classCache[className]);
      }
      try {
        var cls = classLoader ? java.lang.Class.forName(className, true, classLoader) : java.lang.Class.forName(className);
        classCache[className] = cls;
        stats.classResolves += 1;
        return Result.ok(Errors.OK, cls);
      } catch (error) {
        stats.failures += 1;
        return Result.fromException(Errors.CLASS_NOT_FOUND, error, { className: className });
      }
    }

    function resolveParamTypes(names) {
      var source = names || [];
      var output = [];
      var i;
      for (i = 0; i < source.length; i += 1) {
        var item = resolveClass(String(source[i]));
        if (!item.ok) return item;
        output.push(item.value);
      }
      return Result.ok(Errors.OK, output);
    }

    function resolveConstructor(className, paramTypes) {
      if (disposed) return failDisposed();
      var key = String(className || "") + "(" + String((paramTypes || []).join(",")) + ")";
      if (constructorCache[key]) {
        stats.constructorCacheHits += 1;
        return Result.ok("CACHE_HIT", constructorCache[key]);
      }
      var cls = resolveClass(className);
      if (!cls.ok) return cls;
      var params = resolveParamTypes(paramTypes || []);
      if (!params.ok) return params;
      try {
        var ctor = cls.value.getConstructor(classArray(params.value));
        constructorCache[key] = ctor;
        stats.constructorResolves += 1;
        return Result.ok(Errors.OK, ctor);
      } catch (error) {
        stats.failures += 1;
        return Result.fromException(Errors.CONSTRUCTOR_NOT_FOUND, error, { className: String(className || ""), signature: key });
      }
    }

    function resolveMethod(className, methodName, paramTypes, expectStatic) {
      if (disposed) return failDisposed();
      var key = String(className || "") + "#" + String(methodName || "") + "(" + String((paramTypes || []).join(",")) + ")@" + String(expectStatic === true);
      if (methodCache[key]) {
        stats.methodCacheHits += 1;
        return Result.ok("CACHE_HIT", methodCache[key]);
      }
      var cls = resolveClass(className);
      if (!cls.ok) return cls;
      var params = resolveParamTypes(paramTypes || []);
      if (!params.ok) return params;
      try {
        var method = cls.value.getMethod(String(methodName || ""), classArray(params.value));
        var isStatic = java.lang.reflect.Modifier.isStatic(method.getModifiers()) === true;
        if (isStatic !== (expectStatic === true)) {
          stats.failures += 1;
          return Result.fail(Errors.METHOD_KIND_MISMATCH, "Static/instance method kind mismatch", {
            className: String(className || ""),
            methodName: String(methodName || ""),
            expectedStatic: expectStatic === true,
            actualStatic: isStatic
          });
        }
        methodCache[key] = method;
        stats.methodResolves += 1;
        return Result.ok(Errors.OK, method);
      } catch (error) {
        stats.failures += 1;
        return Result.fromException(Errors.METHOD_NOT_FOUND, error, {
          className: String(className || ""),
          methodName: String(methodName || ""),
          signature: key
        });
      }
    }

    function newInstance(className, paramTypes, args) {
      if (disposed) return failDisposed();
      var ctor = resolveConstructor(className, paramTypes || []);
      if (!ctor.ok) return ctor;
      try {
        var value = ctor.value.newInstance(objectArray(args || []));
        stats.invocations += 1;
        return Result.ok(Errors.OK, value);
      } catch (error) {
        stats.failures += 1;
        var info = causeInfo(error);
        return Result.fail(Errors.INVOCATION_FAILED, info.message, {
          causeClass: info.className,
          className: String(className || ""),
          operation: "constructor"
        });
      }
    }

    function invoke(target, className, methodName, paramTypes, args, expectStatic) {
      if (disposed) return failDisposed();
      if (expectStatic !== true && !target) return Result.fail(Errors.INVALID_ARGUMENT, "target is required");
      var method = resolveMethod(className, methodName, paramTypes || [], expectStatic === true);
      if (!method.ok) return method;
      try {
        var value = method.value.invoke(expectStatic === true ? null : target, objectArray(args || []));
        stats.invocations += 1;
        return Result.ok(Errors.OK, value);
      } catch (error) {
        stats.failures += 1;
        var info = causeInfo(error);
        return Result.fail(Errors.INVOCATION_FAILED, info.message, {
          causeClass: info.className,
          className: String(className || ""),
          methodName: String(methodName || "")
        });
      }
    }

    function dispose() {
      if (disposed) return Result.ok(Errors.ALREADY_DISPOSED, false);
      disposed = true;
      state = Lifecycle.DISPOSED;
      classCache = {};
      constructorCache = {};
      methodCache = {};
      classLoader = null;
      stats.disposals += 1;
      return Result.ok("DISPOSED", true);
    }

    function snapshot() {
      var classCount = 0;
      var constructorCount = 0;
      var methodCount = 0;
      var key;
      for (key in classCache) if (classCache.hasOwnProperty(key)) classCount += 1;
      for (key in constructorCache) if (constructorCache.hasOwnProperty(key)) constructorCount += 1;
      for (key in methodCache) if (methodCache.hasOwnProperty(key)) methodCount += 1;
      return {
        state: state,
        disposed: disposed,
        allowClasses: copyPlain(allow),
        cache: { classes: classCount, constructors: constructorCount, methods: methodCount },
        stats: copyPlain(stats)
      };
    }

    return Result.ok(Errors.OK, {
      resolveClass: resolveClass,
      resolveConstructor: resolveConstructor,
      resolveMethod: resolveMethod,
      newInstance: newInstance,
      invokeInstance: function (target, className, methodName, paramTypes, args) {
        return invoke(target, className, methodName, paramTypes, args, false);
      },
      invokeStatic: function (className, methodName, paramTypes, args) {
        return invoke(null, className, methodName, paramTypes, args, true);
      },
      dispose: dispose,
      getState: function () { return state; },
      snapshot: snapshot
    });
  }

  addErrorCodes();
  SX.FrameLoop = { VERSION: "1.0.0-beta", create: frameLoopCreate };
  SX.ReflectionBridge = { VERSION: "1.0.0-beta", create: reflectionBridgeCreate };
  SX.API_VERSION = API_VERSION;
  SX.API.VERSION = API_VERSION;
  SX.API.createFrameLoop = frameLoopCreate;
  SX.API.createReflectionBridge = reflectionBridgeCreate;
  SX.API.createDexBridge = function () {
    return Result.fail(Errors.EXTERNAL_DEX_DISABLED,
      "External DEX payloads remain disabled; the verified fixed diagnostic DEX is not part of the public API", {
        component: "DexBridge",
        apiVersion: API_VERSION,
        externalDexPayloadEnabled: false
      });
  };
  SX.Components.FrameLoop = SX.FrameLoop;
  SX.Components.ReflectionBridge = SX.ReflectionBridge;

  var oldCapability = SX.API.capability;
  SX.API.capability = function () {
    var value = oldCapability ? oldCapability() : {};
    value.apiVersion = API_VERSION;
    if (!value.stable) value.stable = {};
    value.stable.frameLoop = true;
    value.stable.reflectionBridge = true;
    if (!value.verifiedNotExported) value.verifiedNotExported = {};
    value.verifiedNotExported.frameLoop = false;
    value.verifiedNotExported.reflectionBridge = false;
    value.verifiedNotExported.dexBridge = true;
    value.externalDexPayloadEnabled = false;
    return value;
  };

  var oldVersionInfo = SX.API.versionInfo;
  SX.API.versionInfo = function () {
    var value = oldVersionInfo ? oldVersionInfo() : {};
    value.apiVersion = API_VERSION;
    value.phase7BVersion = VERSION;
    value.frameLoopVersion = SX.FrameLoop.VERSION;
    value.reflectionBridgeVersion = SX.ReflectionBridge.VERSION;
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

  function persist(app, result, stress) {
    var root = diagnosticsRoot();
    if (!root) return false;
    var file = new java.io.File(root + "/diagnostics/shortx-ui/latest.json");
    var payload = {};
    var old = readText(file);
    if (old) {
      try { payload = JSON.parse(old); } catch (e0) { payload = {}; }
    }
    if (!payload || typeof payload !== "object") payload = {};
    payload.schema = Math.max(9, Number(payload.schema || 0));
    payload.runtimeVersion = String(SX.VERSION || "");
    payload.apiVersion = API_VERSION;
    payload.apiComponents = copyPlain(result || (app && app.state ? app.state.shortXUiPhase7BResult : null));
    payload.apiComponentsStress = copyPlain(stress || (app && app.state ? app.state.shortXUiPhase7BStress : null));
    payload.savedAt = now();
    if ((result && result.ok === false) || (stress && stress.ok === false && stress.running !== true)) payload.ok = false;
    return writeJsonAtomic(file, payload);
  }

  function addCheck(list, name, ok, detail) {
    list.push({ name: String(name), ok: ok === true, detail: copyPlain(detail) });
  }

  function createDefaultBridge() {
    return SX.API.createReflectionBridge({
      allowClasses: {
        "java.lang.String": true,
        "java.lang.StringBuilder": true,
        "java.lang.Integer": true,
        "java.lang.Math": true
      }
    });
  }

  function runReflectionChecks(checks) {
    var created = createDefaultBridge();
    addCheck(checks, "reflection-create", created.ok, created);
    if (!created.ok) return null;
    var bridge = created.value;
    var c1 = bridge.resolveClass("java.lang.StringBuilder");
    var c2 = bridge.resolveClass("java.lang.StringBuilder");
    addCheck(checks, "reflection-class-cache", c1.ok && c2.ok && c2.code === "CACHE_HIT", bridge.snapshot());
    var instance = bridge.newInstance("java.lang.StringBuilder", [], []);
    addCheck(checks, "reflection-constructor", instance.ok, instance);
    var a = instance.ok ? bridge.invokeInstance(instance.value, "java.lang.StringBuilder", "append", ["java.lang.String"], [new java.lang.String("api-")]) : instance;
    var b = instance.ok ? bridge.invokeInstance(instance.value, "java.lang.StringBuilder", "append", ["int"], [java.lang.Integer.valueOf(31)]) : instance;
    var text = instance.ok ? bridge.invokeInstance(instance.value, "java.lang.StringBuilder", "toString", [], []) : instance;
    addCheck(checks, "reflection-instance-overload", a.ok && b.ok && text.ok && String(text.value) === "api-31", { value: text.ok ? String(text.value) : "" });
    var max = bridge.invokeStatic("java.lang.Math", "max", ["int", "int"], [java.lang.Integer.valueOf(7), java.lang.Integer.valueOf(12)]);
    addCheck(checks, "reflection-static", max.ok && Number(max.value) === 12, max);
    var bad = bridge.invokeStatic("java.lang.Integer", "parseInt", ["java.lang.String"], [new java.lang.String("bad")]);
    addCheck(checks, "reflection-exception-map", !bad.ok && bad.code === Errors.INVOCATION_FAILED && String(bad.causeClass || "").indexOf("NumberFormatException") >= 0, bad);
    var missing = bridge.resolveMethod("java.lang.Math", "missingMethod", [], true);
    addCheck(checks, "reflection-missing-method", !missing.ok && missing.code === Errors.METHOD_NOT_FOUND, missing);
    var denied = bridge.resolveClass("java.io.File");
    addCheck(checks, "reflection-allowlist", !denied.ok && denied.code === Errors.CLASS_NOT_ALLOWED, denied);
    var before = bridge.snapshot();
    var disposed = bridge.dispose();
    var rejected = bridge.resolveClass("java.lang.String");
    addCheck(checks, "reflection-dispose", disposed.ok && !rejected.ok && rejected.code === Errors.BRIDGE_DISPOSED, { before: before, disposed: disposed, rejected: rejected });
    return bridge;
  }

  proto.runShortXUiPhase7BApiBaseline = function () {
    if (!this.state) this.state = {};
    var existing = this.state.shortXUiPhase7BResult;
    if (existing && existing.running === true) return existing;
    var self = this;
    var result = {
      schema: 1,
      version: VERSION,
      runtimeVersion: String(SX.VERSION || ""),
      apiVersion: API_VERSION,
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
    this.state.shortXUiPhase7BResult = result;
    persist(this, result, null);
    refresh(this);

    var thread = new java.lang.Thread(new java.lang.Runnable({ run: function () {
      try {
        addCheck(result.checks, "api-version-base", BASE_API_VERSION === "0.3.0-beta", { base: BASE_API_VERSION });
        addCheck(result.checks, "api-version-promoted", String(SX.API.VERSION || "") === API_VERSION, { value: SX.API.VERSION });
        addCheck(result.checks, "frame-loop-exported", !!SX.FrameLoop && typeof SX.API.createFrameLoop === "function", null);
        addCheck(result.checks, "reflection-exported", !!SX.ReflectionBridge && typeof SX.API.createReflectionBridge === "function", null);
        var cap = SX.API.capability();
        addCheck(result.checks, "capability-stable", cap.stable && cap.stable.frameLoop === true && cap.stable.reflectionBridge === true, cap);
        var dex = SX.API.createDexBridge({});
        addCheck(result.checks, "dex-still-disabled", !dex.ok && dex.code === Errors.EXTERNAL_DEX_DISABLED, dex);
        runReflectionChecks(result.checks);

        var dispatcherResult = SX.API.createMainDispatcher();
        addCheck(result.checks, "frame-dispatcher", dispatcherResult.ok, dispatcherResult);
        if (dispatcherResult.ok) {
          var dispatcher = dispatcherResult.value;
          var latch = new java.util.concurrent.CountDownLatch(1);
          var frames = 0;
          var invalidates = 0;
          var frameResult = SX.API.createFrameLoop({
            name: "phase7b-baseline",
            dispatcher: dispatcher,
            onFrame: function () {
              frames += 1;
              if (frames >= 3) latch.countDown();
              return { changed: frames !== 2, continueRunning: frames < 3 };
            },
            invalidate: function () { invalidates += 1; }
          });
          addCheck(result.checks, "frame-create", frameResult.ok, frameResult);
          if (frameResult.ok) {
            var loop = frameResult.value;
            var request = loop.request("baseline");
            var done = false;
            try { done = latch.await(FRAME_TIMEOUT_MS, java.util.concurrent.TimeUnit.MILLISECONDS); }
            catch (eWait) {}
            var snapshot = loop.snapshot();
            addCheck(result.checks, "frame-complete", request.ok && done && frames === 3, { request: request, frames: frames, snapshot: snapshot });
            addCheck(result.checks, "frame-change-invalidate", invalidates === 2 && Number(snapshot.stats.changed || 0) === 2 && Number(snapshot.stats.unchanged || 0) === 1, { invalidates: invalidates, snapshot: snapshot });
            addCheck(result.checks, "frame-idle-stop", snapshot.running === false && snapshot.framePosted === false && Number(snapshot.stats.idleStops || 0) === 1, snapshot);
            var disposedLoop = loop.dispose();
            var disposedAgain = loop.dispose();
            var after = loop.request("after-dispose");
            addCheck(result.checks, "frame-dispose", disposedLoop.ok && disposedAgain.ok && !after.ok && after.code === Errors.FRAME_LOOP_DISPOSED, { first: disposedLoop, second: disposedAgain, after: after, snapshot: loop.snapshot() });
          }
          try { dispatcher.dispose(); } catch (eDispatcher) {}
        }
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
        self.state.shortXUiPhase7BResult = result;
        persist(self, result, null);
        refresh(self);
        log(self, result.ok ? "i" : "e", "SHORTXUI_PHASE7B_BASELINE ok=" + String(result.ok) + " passed=" + String(result.passed) + "/" + String(result.total));
      }}));
    }}), "ToolHub-Phase7B-Baseline");
    try { thread.setDaemon(true); } catch (eDaemon) {}
    thread.start();
    return result;
  };

  proto.runShortXUiPhase7BStress = function () {
    if (!this.state) this.state = {};
    var old = this.state.shortXUiPhase7BStress;
    if (old && old.running === true) return old;
    var self = this;
    var stress = {
      schema: 1,
      version: VERSION,
      runtimeVersion: String(SX.VERSION || ""),
      apiVersion: API_VERSION,
      ok: false,
      running: true,
      startedAt: now(),
      finishedAt: 0,
      durationMs: 0,
      cyclesRequested: STRESS_CYCLES,
      cyclesCompleted: 0,
      frameCallbacks: 0,
      frameInvalidates: 0,
      frameDisposals: 0,
      frameLateCallbacks: 0,
      reflectionInvocations: 0,
      reflectionCacheHits: 0,
      reflectionDisposals: 0,
      reflectionMappingPasses: 0,
      errors: 0,
      cycles: []
    };
    this.state.shortXUiPhase7BStress = stress;
    persist(this, null, stress);
    refresh(this);

    var thread = new java.lang.Thread(new java.lang.Runnable({ run: function () {
      var i;
      for (i = 0; i < STRESS_CYCLES; i += 1) {
        var row = { index: i + 1, ok: true, frame: null, reflection: null };
        try {
          var dispatcherResult = SX.API.createMainDispatcher();
          if (!dispatcherResult.ok) throw "dispatcher unavailable";
          var dispatcher = dispatcherResult.value;
          var latch = new java.util.concurrent.CountDownLatch(1);
          var frames = 0;
          var invalidates = 0;
          var frameResult = SX.API.createFrameLoop({
            name: "phase7b-stress-" + String(i + 1),
            dispatcher: dispatcher,
            onFrame: function () {
              frames += 1;
              if (frames >= 4) latch.countDown();
              return { changed: frames !== 3, continueRunning: frames < 4 };
            },
            invalidate: function () { invalidates += 1; }
          });
          if (!frameResult.ok) throw "frame create failed";
          var loop = frameResult.value;
          loop.request("stress");
          loop.request("stress-coalesce-1");
          loop.request("stress-coalesce-2");
          var frameDone = false;
          try { frameDone = latch.await(FRAME_TIMEOUT_MS, java.util.concurrent.TimeUnit.MILLISECONDS); }
          catch (eFrameWait) {}
          var frameSnapshot = loop.snapshot();
          var frameDisposed = loop.dispose();
          try { java.lang.Thread.sleep(30); } catch (eSleep) {}
          var frameAfter = loop.snapshot();
          try { dispatcher.dispose(); } catch (eDispatcher) {}
          var frameOk = frameDone && frames === 4 && invalidates === 3 && frameDisposed.ok && frameAfter.state === Lifecycle.DISPOSED && frameAfter.framePosted === false && Number(frameAfter.stats.lateCallbacks || 0) === 0;
          if (!frameOk) row.ok = false;
          stress.frameCallbacks += Number(frameSnapshot.stats.callbacks || 0);
          stress.frameInvalidates += invalidates;
          if (frameDisposed.ok) stress.frameDisposals += 1;
          stress.frameLateCallbacks += Number(frameAfter.stats.lateCallbacks || 0);
          row.frame = { ok: frameOk, frames: frames, invalidates: invalidates, snapshot: frameAfter };

          var bridgeResult = createDefaultBridge();
          if (!bridgeResult.ok) throw "reflection create failed";
          var bridge = bridgeResult.value;
          var j;
          var reflectionOk = true;
          for (j = 0; j < REFLECTION_CALLS_PER_CYCLE; j += 1) {
            var max = bridge.invokeStatic("java.lang.Math", "max", ["int", "int"], [java.lang.Integer.valueOf(j), java.lang.Integer.valueOf(j + 1)]);
            if (!max.ok || Number(max.value) !== j + 1) { reflectionOk = false; break; }
            stress.reflectionInvocations += 1;
          }
          var bad = bridge.invokeStatic("java.lang.Integer", "parseInt", ["java.lang.String"], [new java.lang.String("bad-" + String(i))]);
          var mapped = !bad.ok && bad.code === Errors.INVOCATION_FAILED && String(bad.causeClass || "").indexOf("NumberFormatException") >= 0;
          if (mapped) stress.reflectionMappingPasses += 1;
          else reflectionOk = false;
          var bridgeSnapshot = bridge.snapshot();
          stress.reflectionCacheHits += Number(bridgeSnapshot.stats.classCacheHits || 0) + Number(bridgeSnapshot.stats.methodCacheHits || 0) + Number(bridgeSnapshot.stats.constructorCacheHits || 0);
          var bridgeDisposed = bridge.dispose();
          var reject = bridge.invokeStatic("java.lang.Math", "max", ["int", "int"], [java.lang.Integer.valueOf(1), java.lang.Integer.valueOf(2)]);
          var disposalOk = bridgeDisposed.ok && !reject.ok && reject.code === Errors.BRIDGE_DISPOSED;
          if (disposalOk) stress.reflectionDisposals += 1;
          else reflectionOk = false;
          if (!reflectionOk) row.ok = false;
          row.reflection = { ok: reflectionOk, mapped: mapped, disposed: disposalOk, snapshot: bridgeSnapshot };
        } catch (error) {
          row.ok = false;
          row.error = errorText(error);
        }
        if (!row.ok) stress.errors += 1;
        stress.cyclesCompleted += 1;
        stress.cycles.push(row);
      }
      stress.running = false;
      stress.finishedAt = now();
      stress.durationMs = Math.max(0, stress.finishedAt - stress.startedAt);
      stress.ok = stress.cyclesCompleted === STRESS_CYCLES &&
        stress.frameDisposals === STRESS_CYCLES &&
        stress.frameLateCallbacks === 0 &&
        stress.reflectionInvocations === STRESS_CYCLES * REFLECTION_CALLS_PER_CYCLE &&
        stress.reflectionDisposals === STRESS_CYCLES &&
        stress.reflectionMappingPasses === STRESS_CYCLES &&
        stress.reflectionCacheHits >= STRESS_CYCLES * (REFLECTION_CALLS_PER_CYCLE - 1) &&
        stress.errors === 0;
      new android.os.Handler(android.os.Looper.getMainLooper()).post(new java.lang.Runnable({ run: function () {
        self.state.shortXUiPhase7BStress = stress;
        persist(self, null, stress);
        refresh(self);
        log(self, stress.ok ? "i" : "e", "SHORTXUI_PHASE7B_STRESS ok=" + String(stress.ok) + " cycles=" + String(stress.cyclesCompleted) + "/" + String(stress.cyclesRequested) + " frame=" + String(stress.frameCallbacks) + " invoke=" + String(stress.reflectionInvocations) + " errors=" + String(stress.errors));
      }}));
    }}), "ToolHub-Phase7B-Stress");
    try { thread.setDaemon(true); } catch (eDaemon) {}
    thread.start();
    return stress;
  };

  proto.refreshShortXUiPhase7BState = function () {
    if (!this.state) this.state = {};
    var value = {
      ok: true,
      code: "REFRESHED",
      version: VERSION,
      runtimeVersion: String(SX.VERSION || ""),
      apiVersion: API_VERSION,
      capability: SX.API.capability(),
      baseline: this.state.shortXUiPhase7BResult || null,
      stress: this.state.shortXUiPhase7BStress || null
    };
    persist(this, value.baseline, value.stress);
    refresh(this);
    return value;
  };

  function format(app) {
    var result = app && app.state ? app.state.shortXUiPhase7BResult : null;
    var stress = app && app.state ? app.state.shortXUiPhase7BStress : null;
    var lines = [];
    lines.push("Phase 7B 组件导出：" + (result ? (result.running ? "运行中" : (result.ok ? "通过" : "失败")) : "尚未运行"));
    lines.push("Runtime=" + String(SX.VERSION || "") + " API=" + API_VERSION);
    lines.push("公开：FrameLoop=" + String(!!SX.FrameLoop) + " ReflectionBridge=" + String(!!SX.ReflectionBridge));
    lines.push("外部 DEX=false");
    if (result) lines.push("baseline=" + String(result.passed || 0) + "/" + String(result.total || 0) + " errors=" + String((result.errors || []).length));
    if (stress) {
      lines.push("");
      lines.push("20 次组件压力：" + (stress.running ? "运行中" : (stress.ok ? "通过" : "失败")));
      lines.push("cycles=" + String(stress.cyclesCompleted || 0) + "/" + String(stress.cyclesRequested || 0) +
        " frame=" + String(stress.frameCallbacks || 0) + " late=" + String(stress.frameLateCallbacks || 0));
      lines.push("reflection=" + String(stress.reflectionInvocations || 0) +
        " cache=" + String(stress.reflectionCacheHits || 0) + " errors=" + String(stress.errors || 0));
    }
    return lines.join("\n");
  }

  function refresh(app) {
    if (!app || !app.state || !app.state.shortXUiPhase7BStatusView) return;
    var view = app.state.shortXUiPhase7BStatusView;
    try {
      new android.os.Handler(android.os.Looper.getMainLooper()).post(new java.lang.Runnable({ run: function () {
        try { view.setText(format(app)); } catch (e0) {}
      }}));
    } catch (e1) {}
  }

  var oldBuild = proto.buildShortXUiLabPanelView;
  if (typeof oldBuild === "function") {
    proto.buildShortXUiLabPanelView = function () {
      var panel = oldBuild.call(this);
      var self = this;
      try {
        var scroll = panel.getChildAt(panel.getChildCount() - 1);
        var content = scroll && scroll.getChildCount ? scroll.getChildAt(0) : null;
        if (!content || !content.addView) return panel;
        var m = SX.Metrics.create(context);
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
        box.setBackground(SX.Shape.strokeRect(surface2, outline, m.dp(1), m.dp(16)));

        var title = new android.widget.TextView(context);
        title.setText("Phase 7B · FrameLoop / ReflectionBridge");
        title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        SX.Color.applyText(title, onSurface);
        box.addView(title, new android.widget.LinearLayout.LayoutParams(-1, -2));

        var desc = new android.widget.TextView(context);
        desc.setText("将 Phase 5 帧生命周期和 Phase 6 受限反射桥提取为正式公开 API；保持精确白名单、无变化停帧、幂等释放，外部 DEX 继续禁用。");
        desc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
        desc.setPadding(0, m.dp(3), 0, m.dp(8));
        SX.Color.applyText(desc, onSurface2);
        box.addView(desc, new android.widget.LinearLayout.LayoutParams(-1, -2));

        var status = new android.widget.TextView(context);
        status.setText(format(this));
        status.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 10);
        status.setTypeface(android.graphics.Typeface.MONOSPACE);
        status.setPadding(m.dp(10), m.dp(9), m.dp(10), m.dp(9));
        status.setBackground(SX.Shape.roundRect(surface, m.dp(12)));
        SX.Color.applyText(status, onSurface2);
        box.addView(status, new android.widget.LinearLayout.LayoutParams(-1, -2));
        this.state.shortXUiPhase7BStatusView = status;

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
          { title: "运行组件基线", action: function () { self.runShortXUiPhase7BApiBaseline(); refresh(self); } },
          { title: "刷新状态", action: function () { self.refreshShortXUiPhase7BState(); } }
        ]);
        addRow([
          { title: "运行 20 次压力", action: function () { self.runShortXUiPhase7BStress(); refresh(self); } }
        ]);

        var lpBox = new android.widget.LinearLayout.LayoutParams(-1, -2);
        lpBox.bottomMargin = m.dp(10);
        content.addView(box, lpBox);
      } catch (error) {
        log(this, "e", "build Phase7B section failed: " + errorText(error));
      }
      return panel;
    };
  }

  global.ToolHubBetaPhase7B = {
    VERSION: VERSION,
    API_VERSION: API_VERSION,
    FRAME_LOOP_VERSION: SX.FrameLoop.VERSION,
    REFLECTION_BRIDGE_VERSION: SX.ReflectionBridge.VERSION,
    EXTERNAL_DEX_PAYLOAD_ENABLED: false
  };
  proto.__toolHubShortXUiPhase7BComponentsInstalled = true;
  try { writeLog("ShortXUI Phase7B components installed version=" + VERSION + " api=" + API_VERSION); } catch (eLog) {}
}(function () { return this; }()));
