// ToolHubRuntime DEX API caller for separate ShortX tasks. Rhino ES5.
// Set these two values per task.
var TOOLHUB_DEX_COMMAND = (typeof TOOLHUB_DEX_COMMAND !== "undefined") ? TOOLHUB_DEX_COMMAND : "status";
var TOOLHUB_DEX_ARGS = (typeof TOOLHUB_DEX_ARGS !== "undefined") ? TOOLHUB_DEX_ARGS : {};

(function() {
  var VERSION = "0.9.2-beta-dex-call-1";
  var REGISTRY_CLASS = "toolhub.dex.runtime.class.v1";

  function text(value) {
    try { return String(value === null || value === undefined ? "" : value); }
    catch (e) { return ""; }
  }

  function fail(code, message) {
    return JSON.stringify({ ok: false, code: text(code), error: text(message), callerVersion: VERSION });
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

  try {
    var runtimeClass = java.lang.System.getProperties().get(REGISTRY_CLASS);
    if (!runtimeClass) return fail("DEX_NOT_LOADED", "Run ToolHubRuntimeLoader.js first in the same ShortX process");

    var cx = Packages.org.mozilla.javascript.Context.getCurrentContext();
    if (!cx) return fail("RHINO_CONTEXT_MISSING", "No Rhino Context on current thread");

    var parent = cx.getClass().getClassLoader();
    var contextClass = java.lang.Class.forName("org.mozilla.javascript.Context", false, parent);
    var stringClass = java.lang.Class.forName("java.lang.String");
    var method = runtimeClass.getMethod("invoke", classArray([contextClass, stringClass, stringClass]));
    var rawArgs = "{}";
    try {
      rawArgs = typeof TOOLHUB_DEX_ARGS === "string"
        ? String(TOOLHUB_DEX_ARGS)
        : JSON.stringify(TOOLHUB_DEX_ARGS || {});
    } catch (eArgs) { rawArgs = "{}"; }

    var result = method.invoke(
      null,
      objectArray([cx, String(TOOLHUB_DEX_COMMAND || "status"), rawArgs])
    );
    return String(result);
  } catch (e) {
    return fail("DEX_CALL_FAILED", e);
  }
})();
