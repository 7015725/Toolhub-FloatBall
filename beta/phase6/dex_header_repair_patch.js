// ToolHub Beta Phase 6 DEX header repair + direct buffer patch. Rhino ES5.
(function (global) {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
  if (!global.ShortXUI || global.ShortXUI.__runtimeInstalled !== true) return;
  if (!global.ToolHubBetaPhase6 || typeof global.ToolHubBetaPhase6.createBridge !== "function") return;
  if (typeof global.ToolHubBetaPhase6OriginalDexB64 !== "string" || !global.ToolHubBetaPhase6OriginalDexB64) {
    throw "Phase6 verified DEX payload handoff missing";
  }

  var proto = FloatBallAppWM.prototype;
  if (proto.__toolHubShortXUiDexRepair075Installed === true) return;

  var phase = global.ToolHubBetaPhase6;
  var VERSION = "0.7.5-beta-dex-header-repair";
  var SOURCE_MODULE_SHA256 = "a0156fc34709db77e867306bb47293f757ab6ac31b950810e8384592f184a7e0";
  var SOURCE_DEX_B64 = String(global.ToolHubBetaPhase6OriginalDexB64);
  try { delete global.ToolHubBetaPhase6OriginalDexB64; } catch (eDelete) {
    global.ToolHubBetaPhase6OriginalDexB64 = null;
  }

  function now() { return Number(java.lang.System.currentTimeMillis()); }
  function errorText(error) {
    try { return String(global.ShortXUI.Core.errorText(error)); } catch (e0) {}
    try { return String(error); } catch (e1) { return "unknown"; }
  }
  function log(app, level, message) {
    try { safeLog(app && app.L, level || "i", String(message || "")); } catch (e) {}
  }
  function parentLoader() {
    var loader = null;
    try { loader = context.getClassLoader(); } catch (e0) {}
    try { if (!loader) loader = java.lang.Thread.currentThread().getContextClassLoader(); } catch (e1) {}
    try { if (!loader) loader = java.lang.ClassLoader.getSystemClassLoader(); } catch (e2) {}
    return loader;
  }
  function jClassArray(source) {
    var list = source || [];
    var result = java.lang.reflect.Array.newInstance(java.lang.Class, list.length);
    var i;
    for (i = 0; i < list.length; i += 1) result[i] = list[i];
    return result;
  }
  function jObjectArray(source) {
    var list = source || [];
    var result = java.lang.reflect.Array.newInstance(java.lang.Object, list.length);
    var i;
    for (i = 0; i < list.length; i += 1) result[i] = list[i];
    return result;
  }
  function hexBytes(bytes) {
    var out = "";
    var i;
    var value;
    var part;
    for (i = 0; i < bytes.length; i += 1) {
      value = Number(bytes[i]);
      if (value < 0) value += 256;
      part = value.toString(16);
      if (part.length < 2) part = "0" + part;
      out += part;
    }
    return out;
  }
  function byteValue(value) {
    var number = Number(value) & 255;
    return number > 127 ? number - 256 : number;
  }
  function writeByte(bytes, index, value) {
    bytes[index] = byteValue(value);
  }
  function readU32LE(bytes, offset) {
    var b0 = Number(bytes[offset]); if (b0 < 0) b0 += 256;
    var b1 = Number(bytes[offset + 1]); if (b1 < 0) b1 += 256;
    var b2 = Number(bytes[offset + 2]); if (b2 < 0) b2 += 256;
    var b3 = Number(bytes[offset + 3]); if (b3 < 0) b3 += 256;
    return b0 + b1 * 256 + b2 * 65536 + b3 * 16777216;
  }
  function causeOf(error) {
    var target = null;
    var cause = null;
    try { target = error && error.javaException ? error.javaException : error; } catch (e0) { target = error; }
    try {
      if (target && target instanceof java.lang.reflect.InvocationTargetException) cause = target.getCause();
    } catch (e1) {}
    if (!cause) cause = target;
    var className = "";
    var message = "";
    try { if (cause && cause.getClass) className = String(cause.getClass().getName()); } catch (e2) {}
    try { if (cause && cause.getMessage) message = String(cause.getMessage() || ""); } catch (e3) {}
    return { className: className || "unknown", message: message || errorText(error) };
  }
  function digestRange(algorithm, bytes, offset, length) {
    var digest = java.security.MessageDigest.getInstance(String(algorithm));
    digest.update(bytes, Number(offset), Number(length));
    return digest.digest();
  }
  function repairDex(bytes) {
    var info = {
      ok: false,
      code: "UNREPAIRED",
      bytes: Number(bytes && bytes.length || 0),
      sourceSha256: "",
      repairedSha256: "",
      signature: "",
      checksum: "",
      fileSize: 0,
      headerSize: 0,
      error: ""
    };
    try {
      if (!bytes || bytes.length < 112) {
        info.code = "DEX_TOO_SMALL";
        return info;
      }
      var magic = "";
      var i;
      for (i = 0; i < 8; i += 1) {
        var value = Number(bytes[i]);
        if (value < 0) value += 256;
        magic += String.fromCharCode(value);
      }
      if (magic.indexOf("dex\n") !== 0 || magic.charCodeAt(7) !== 0) {
        info.code = "DEX_MAGIC_INVALID";
        return info;
      }
      info.fileSize = readU32LE(bytes, 32);
      info.headerSize = readU32LE(bytes, 36);
      if (info.fileSize !== bytes.length || info.headerSize !== 112) {
        info.code = "DEX_HEADER_SIZE_INVALID";
        return info;
      }

      info.sourceSha256 = hexBytes(digestRange("SHA-256", bytes, 0, bytes.length));
      var signature = digestRange("SHA-1", bytes, 32, bytes.length - 32);
      for (i = 0; i < signature.length; i += 1) writeByte(bytes, 12 + i, signature[i]);

      var adler = new java.util.zip.Adler32();
      adler.update(bytes, 12, bytes.length - 12);
      var checksum = Number(adler.getValue());
      writeByte(bytes, 8, checksum);
      writeByte(bytes, 9, Math.floor(checksum / 256));
      writeByte(bytes, 10, Math.floor(checksum / 65536));
      writeByte(bytes, 11, Math.floor(checksum / 16777216));

      var verifySignature = digestRange("SHA-1", bytes, 32, bytes.length - 32);
      var headerSignature = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 20);
      for (i = 0; i < 20; i += 1) headerSignature[i] = bytes[12 + i];
      var verifyAdler = new java.util.zip.Adler32();
      verifyAdler.update(bytes, 12, bytes.length - 12);
      var verifyChecksum = Number(verifyAdler.getValue());
      var headerChecksum = readU32LE(bytes, 8);

      info.signature = hexBytes(headerSignature);
      info.checksum = ("00000000" + (headerChecksum >>> 0).toString(16)).slice(-8);
      info.repairedSha256 = hexBytes(digestRange("SHA-256", bytes, 0, bytes.length));
      info.ok = info.signature === hexBytes(verifySignature) &&
        (headerChecksum >>> 0) === (verifyChecksum >>> 0);
      info.code = info.ok ? "DEX_HEADER_REPAIRED" : "DEX_HEADER_VERIFY_FAILED";
    } catch (error) {
      info.code = "DEX_HEADER_REPAIR_FAILED";
      info.error = errorText(error);
    }
    return info;
  }
  function capability() {
    var hasInMemory = false;
    var hasDex = false;
    try { hasInMemory = java.lang.Class.forName("dalvik.system.InMemoryDexClassLoader") !== null; } catch (e0) {}
    try { hasDex = java.lang.Class.forName("dalvik.system.DexClassLoader") !== null; } catch (e1) {}
    return {
      ok: !!(global.ShortXUI && global.ShortXUI.Core && parentLoader()),
      runtimeVersion: String(global.ShortXUI.VERSION || ""),
      hasClassLoader: parentLoader() !== null,
      hasReflection: true,
      hasInMemoryDexClassLoader: hasInMemory,
      hasDexClassLoader: hasDex,
      embeddedTestDexEnabled: true,
      sourceModuleSha256: SOURCE_MODULE_SHA256,
      dexHeaderRepairEnabled: true,
      directByteBuffer: true,
      externalDexPayloadEnabled: false,
      sdk: Number(android.os.Build.VERSION.SDK_INT),
      wrapperVersion: VERSION
    };
  }
  function probe() {
    var result = {
      ok: false,
      code: "UNAVAILABLE",
      loaderClass: "",
      loadedClass: "",
      method: "test",
      result: "",
      parentDelegation: false,
      dexLoaded: false,
      dexBytes: 0,
      sourceDexSha256: "",
      repairedDexSha256: "",
      dexHeaderRepair: null,
      bufferDirect: false,
      bufferPosition: 0,
      bufferLimit: 0,
      bufferCapacity: 0,
      error: ""
    };
    if (Number(android.os.Build.VERSION.SDK_INT) < 26) {
      result.code = "SDK_UNSUPPORTED";
      return result;
    }
    var bytes = null;
    var buffer = null;
    var loader = null;
    var loaded = null;
    var method = null;
    var parentClass = null;
    try {
      bytes = android.util.Base64.decode(SOURCE_DEX_B64, android.util.Base64.NO_WRAP);
      result.dexBytes = Number(bytes.length || 0);
      var repaired = repairDex(bytes);
      result.dexHeaderRepair = repaired;
      result.sourceDexSha256 = String(repaired.sourceSha256 || "");
      result.repairedDexSha256 = String(repaired.repairedSha256 || "");
      if (!repaired.ok) {
        result.code = String(repaired.code || "DEX_HEADER_REPAIR_FAILED");
        result.error = String(repaired.error || "");
        return result;
      }

      buffer = java.nio.ByteBuffer.allocateDirect(bytes.length);
      buffer.put(bytes, 0, bytes.length);
      buffer.flip();
      result.bufferDirect = buffer.isDirect() === true;
      result.bufferPosition = Number(buffer.position());
      result.bufferLimit = Number(buffer.limit());
      result.bufferCapacity = Number(buffer.capacity());
      if (!result.bufferDirect || result.bufferPosition !== 0 || result.bufferLimit !== bytes.length) {
        result.code = "DIRECT_BUFFER_STATE_INVALID";
        return result;
      }

      var loaderClass = java.lang.Class.forName("dalvik.system.InMemoryDexClassLoader");
      var byteBufferClass = java.lang.Class.forName("java.nio.ByteBuffer");
      var classLoaderClass = java.lang.Class.forName("java.lang.ClassLoader");
      var constructor = loaderClass.getConstructor(jClassArray([byteBufferClass, classLoaderClass]));
      loader = constructor.newInstance(jObjectArray([buffer, parentLoader()]));
      loaded = loader.loadClass("test.Test1");
      method = loaded.getMethod("test", jClassArray([]));
      var value = method.invoke(null, jObjectArray([]));
      parentClass = loader.loadClass("java.lang.String");

      result.loaderClass = String(loader.getClass().getName());
      result.loadedClass = String(loaded.getName());
      result.result = String(value);
      result.parentDelegation = String(parentClass.getName()) === "java.lang.String";
      result.dexLoaded = result.loadedClass === "test.Test1" && result.result === "blort";
      result.ok = result.dexLoaded && result.parentDelegation;
      result.code = result.ok ? "EMBEDDED_DEX_OK" : "EMBEDDED_DEX_FAILED";
    } catch (error) {
      var cause = causeOf(error);
      result.code = "IN_MEMORY_DEX_FAILED";
      result.error = cause.className + ": " + cause.message;
    } finally {
      bytes = null;
      buffer = null;
      loader = null;
      loaded = null;
      method = null;
      parentClass = null;
    }
    return result;
  }
  function persist(app) {
    var writer = null;
    var temp = null;
    try {
      if (!app || !app.state) return false;
      var root = "";
      try { if (typeof getToolHubRootDir === "function") root = String(getToolHubRootDir() || ""); } catch (e0) {}
      if (!root && typeof APP_ROOT_DIR !== "undefined") root = String(APP_ROOT_DIR || "");
      if (!root) return false;
      var file = new java.io.File(root + "/diagnostics/shortx-ui/latest.json");
      var parent = file.getParentFile();
      if (parent && !parent.exists() && !parent.mkdirs() && !parent.exists()) return false;
      temp = new java.io.File(file.getAbsolutePath() + ".tmp");
      var state = app.state;
      var cap = capability();
      var output = {
        schema: 7,
        runtimeVersion: cap.runtimeVersion,
        wrapperVersion: VERSION,
        ok: cap.ok &&
          !(state.shortXUiDexLastResult && state.shortXUiDexLastResult.ok === false) &&
          !(state.shortXUiDexStressResult && state.shortXUiDexStressResult.ok === false),
        savedAt: now(),
        capability: cap,
        basic: state.shortXUiLabLastResult || null,
        dispatcher: state.shortXUiLabLastDispatcherResult || null,
        windowHost: state.shortXUiLabLastWindowResult || null,
        windowStress: state.shortXUiLabLastWindowStressResult || null,
        imeFocus: state.shortXUiImeLastResult || null,
        imeStress: state.shortXUiImeStressResult || null,
        gesture: state.shortXUiGestureLastResult || null,
        gestureStress: state.shortXUiGestureStressResult || null,
        canvas: state.shortXUiCanvasLastResult || null,
        canvasStress: state.shortXUiCanvasStressResult || null,
        dexBridge: state.shortXUiDexLastResult || null,
        dexStress: state.shortXUiDexStressResult || null
      };
      writer = new java.io.OutputStreamWriter(new java.io.FileOutputStream(temp, false), "UTF-8");
      writer.write(JSON.stringify(output, null, 2) + "\n");
      writer.flush();
      writer.close();
      writer = null;
      if (file.exists() && !file.delete()) throw "replace failed";
      if (!temp.renameTo(file)) throw "publish failed";
      return true;
    } catch (error) {
      log(app, "w", "ShortXUI DEX repair diagnostics save failed: " + errorText(error));
      return false;
    } finally {
      try { if (writer) writer.close(); } catch (e1) {}
      try { if (temp && temp.exists()) temp.delete(); } catch (e2) {}
    }
  }
  function refresh(app) {
    if (!app || !app.state || !app.state.shortXUiDexStatusView) return;
    var view = app.state.shortXUiDexStatusView;
    var baseline = app.state.shortXUiDexLastResult || null;
    var stress = app.state.shortXUiDexStressResult || null;
    var lines = [];
    lines.push("DEX Bridge + 反射边界：可用");
    lines.push("headerRepair=true directBuffer=true externalDex=false");
    if (baseline) {
      lines.push("基线=" + (baseline.ok ? "通过" : "失败") + " checks=" + baseline.passed + "/" + baseline.total);
      lines.push("dex=" + (baseline.inMemory && baseline.inMemory.dexLoaded === true) +
        " result=" + String(baseline.inMemory && baseline.inMemory.result || "") +
        " parent=" + (baseline.inMemory && baseline.inMemory.parentDelegation === true));
    } else {
      lines.push("基线=尚未运行");
    }
    if (stress) {
      lines.push("");
      lines.push("压力测试=" + (stress.running ? "运行中" : (stress.ok ? "通过" : "失败")));
      lines.push("cycles=" + stress.cyclesCompleted + "/" + stress.cyclesRequested +
        " invoke=" + stress.invocations + " cache=" + stress.cacheHits);
      lines.push("dex=" + stress.embeddedDexPasses + " dispose=" + stress.disposePasses +
        " mapping=" + stress.errorMappingPasses + " errors=" + stress.errors);
    }
    try {
      new android.os.Handler(android.os.Looper.getMainLooper()).post(new java.lang.Runnable({
        run: function () { try { view.setText(lines.join("\n")); } catch (e) {} }
      }));
    } catch (e3) {}
  }
  function replaceEmbeddedResult(result, repaired) {
    if (!result) return result;
    result.wrapperVersion = VERSION;
    result.inMemory = repaired;
    var checks = result.checks || [];
    var i;
    for (i = 0; i < checks.length; i += 1) {
      if (String(checks[i].name || "") === "embedded-in-memory-dex") {
        checks[i].ok = repaired.ok && repaired.dexLoaded === true &&
          repaired.result === "blort" && repaired.parentDelegation === true;
        checks[i].detail = repaired;
      }
    }
    var passed = 0;
    for (i = 0; i < checks.length; i += 1) if (checks[i].ok === true) passed += 1;
    result.passed = passed;
    result.total = checks.length;
    result.ok = passed === checks.length;
    result.finishedAt = now();
    result.durationMs = Math.max(0, result.finishedAt - Number(result.startedAt || result.finishedAt));
    return result;
  }

  var oldBaseline = proto.runShortXUiDexBaseline;
  proto.runShortXUiDexBaseline = function () {
    if (!this.state) this.state = {};
    var result = typeof oldBaseline === "function" ? oldBaseline.call(this) : null;
    var repaired = probe();
    result = replaceEmbeddedResult(result, repaired);
    this.state.shortXUiDexLastResult = result;
    persist(this);
    refresh(this);
    log(this, result && result.ok ? "i" : "e",
      "DEX_BRIDGE_BASELINE_REPAIRED ok=" + String(!!(result && result.ok)) +
      " passed=" + String(result ? result.passed : 0) + "/" + String(result ? result.total : 0) +
      " code=" + repaired.code);
    return result;
  };

  var oldStress = proto.runShortXUiDexStress;
  proto.runShortXUiDexStress = function () {
    if (!this.state) this.state = {};
    var self = this;
    var result = typeof oldStress === "function" ? oldStress.call(this) : null;
    if (!result) return result;
    result.wrapperVersion = VERSION;
    var started = now();
    var handler = new android.os.Handler(android.os.Looper.getMainLooper());
    function finishWhenReady() {
      var current = self.state ? self.state.shortXUiDexStressResult : null;
      if (!current) return;
      if (current.running === true && now() - started < 15000) {
        handler.postDelayed(new java.lang.Runnable({ run: finishWhenReady }), 50);
        return;
      }
      var oldEmbeddedFailed = !(current.embeddedDex && current.embeddedDex.ok === true);
      var repaired = probe();
      current.wrapperVersion = VERSION;
      current.embeddedDex = repaired;
      current.embeddedDexPasses = repaired.ok && repaired.dexLoaded === true &&
        repaired.result === "blort" && repaired.parentDelegation === true ? 1 : 0;
      if (oldEmbeddedFailed && current.embeddedDexPasses === 1 && Number(current.errors || 0) > 0) {
        current.errors = Number(current.errors) - 1;
      }
      current.ok = current.cyclesCompleted === current.cyclesRequested &&
        current.invocations === current.invocationsRequested &&
        current.disposePasses === current.cyclesRequested &&
        current.errorMappingPasses === current.cyclesRequested &&
        current.embeddedDexPasses === 1 &&
        current.cacheHits >= current.cyclesRequested * 49 &&
        Number(current.errors || 0) === 0;
      current.finishedAt = now();
      current.durationMs = Math.max(0, current.finishedAt - Number(current.startedAt || current.finishedAt));
      self.state.shortXUiDexStressResult = current;
      persist(self);
      refresh(self);
      log(self, current.ok ? "i" : "e",
        "DEX_BRIDGE_STRESS_REPAIRED ok=" + current.ok +
        " completed=" + current.cyclesCompleted + "/" + current.cyclesRequested +
        " dex=" + current.embeddedDexPasses +
        " errors=" + current.errors +
        " code=" + repaired.code);
    }
    handler.postDelayed(new java.lang.Runnable({ run: finishWhenReady }), 50);
    return result;
  };

  proto.refreshShortXUiDexState = function () {
    if (!this.state) this.state = {};
    var result = {
      ok: capability().ok,
      code: "REFRESHED",
      capability: capability(),
      baseline: this.state.shortXUiDexLastResult || null,
      stress: this.state.shortXUiDexStressResult || null
    };
    persist(this);
    refresh(this);
    return result;
  };

  phase.VERSION = VERSION;
  phase.REPAIR_VERSION = VERSION;
  phase.capability = capability;
  phase.probeEmbeddedInMemoryDex = probe;
  proto.__toolHubShortXUiDexRepair075Installed = true;
  log(null, "i", "ShortXUI DEX header repair patch installed version=" + VERSION +
    " sourceModuleSha256=" + SOURCE_MODULE_SHA256);
}(this));
