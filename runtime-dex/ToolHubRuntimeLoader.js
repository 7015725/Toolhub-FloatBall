// ToolHubRuntime DEX loader for ShortX / Rhino ES5.
// Main runtime file: ToolHubRuntime-0.9.2-beta-dex-1.jar
(function(global) {
  var VERSION = "0.9.2-beta-dex-loader-1";
  var CLASS_NAME = "com.xin.toolhub.runtime.ToolHubRuntime";
  var JAR_NAME = "ToolHubRuntime-0.9.2-beta-dex-1.jar";

  function text(value) {
    try { return String(value === null || value === undefined ? "" : value); }
    catch (e) { return ""; }
  }

  function error(code, message) {
    return JSON.stringify({ ok: false, code: text(code), error: text(message), loaderVersion: VERSION });
  }

  function ensureDir(path) {
    var dir = new java.io.File(String(path));
    if (!dir.exists() && !dir.mkdirs() && !dir.exists()) throw "mkdirs failed: " + path;
    if (!dir.isDirectory()) throw "not a directory: " + path;
    return dir;
  }

  function classArray(items) {
    var values = items || [];
    var out = java.lang.reflect.Array.newInstance(java.lang.Class, values.length);
    for (var i = 0; i < values.length; i++) out[i] = values[i];
    return out;
  }

  function objectArray(items) {
    var values = items || [];
    var objectClass = java.lang.Class.forName("java.lang.Object");
    var out = java.lang.reflect.Array.newInstance(objectClass, values.length);
    for (var i = 0; i < values.length; i++) out[i] = values[i];
    return out;
  }

  function currentRhinoContext() {
    var cx = Packages.org.mozilla.javascript.Context.getCurrentContext();
    if (!cx) throw "No Rhino Context on current thread";
    return cx;
  }

  function buildRuntime() {
    var base = text(shortx.getShortXDir());
    if (!base) throw "shortx.getShortXDir() returned empty";
    var runtimeDir = ensureDir(base + "/ToolHub-Beta/runtime");
    var odexDir = ensureDir(runtimeDir.getAbsolutePath() + "/odex");
    var jar = new java.io.File(runtimeDir, JAR_NAME);
    if (!jar.exists() || !jar.isFile() || Number(jar.length()) <= 0) {
      throw "DEX JAR missing: " + jar.getAbsolutePath();
    }

    var cx = currentRhinoContext();
    var parent = null;
    try { parent = cx.getClass().getClassLoader(); } catch (eParent0) {}
    try { if (!parent) parent = java.lang.Thread.currentThread().getContextClassLoader(); } catch (eParent1) {}
    try { if (!parent) parent = context.getClassLoader(); } catch (eParent2) {}
    if (!parent) throw "Rhino parent ClassLoader unavailable";

    var loader = new Packages.dalvik.system.DexClassLoader(
      jar.getAbsolutePath(),
      odexDir.getAbsolutePath(),
      null,
      parent
    );
    var runtimeClass = loader.loadClass(CLASS_NAME);
    var objectClass = java.lang.Class.forName("java.lang.Object");
    var contextClass = cx.getClass();
    var scriptableClass = java.lang.Class.forName("org.mozilla.javascript.Scriptable", false, parent);
    var stringClass = java.lang.Class.forName("java.lang.String");

    function call(name, parameterTypes, values) {
      var method = runtimeClass.getMethod(String(name), classArray(parameterTypes));
      var result = method.invoke(null, objectArray(values));
      return text(result);
    }

    var api = {
      VERSION: VERSION,
      JAR_NAME: JAR_NAME,
      jarPath: jar.getAbsolutePath(),
      loader: loader,
      runtimeClass: runtimeClass,
      start: function() {
        return call("start", [objectClass, objectClass, contextClass, scriptableClass], [context, shortx, currentRhinoContext(), global]);
      },
      invoke: function(command, args) {
        var raw = "{}";
        try {
          if (args !== undefined && args !== null) raw = typeof args === "string" ? String(args) : JSON.stringify(args);
        } catch (eArgs) { raw = "{}"; }
        return call("invoke", [contextClass, stringClass, stringClass], [currentRhinoContext(), String(command || ""), raw]);
      },
      status: function() {
        return call("status", [contextClass], [currentRhinoContext()]);
      },
      show: function() {
        return call("show", [contextClass], [currentRhinoContext()]);
      },
      hide: function() {
        return call("hide", [contextClass], [currentRhinoContext()]);
      },
      toggle: function() {
        return call("toggle", [contextClass], [currentRhinoContext()]);
      },
      stop: function() {
        return call("stop", [contextClass], [currentRhinoContext()]);
      }
    };
    return api;
  }

  try {
    if (!global.ToolHubDex || global.ToolHubDex.JAR_NAME !== JAR_NAME) {
      global.ToolHubDex = buildRuntime();
    }
    global.__toolHubDexLoader = global.ToolHubDex.loader;
    global.__toolHubDexRuntimeClass = global.ToolHubDex.runtimeClass;
    return global.ToolHubDex.start();
  } catch (e) {
    return error("DEX_LOADER_FAILED", e);
  }
})(this);
