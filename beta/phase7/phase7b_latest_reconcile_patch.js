// ToolHub Beta Phase 7B latest.json result reconciliation patch. Rhino ES5.
(function (global) {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
  if (!global.ToolHubBetaPhase7B || String(global.ToolHubBetaPhase7B.VERSION || "") !== "0.8.1-beta-components") return;
  var proto = FloatBallAppWM.prototype;
  if (proto.__toolHubShortXUiPhase7BLatestReconcileInstalled === true) return;

  var VERSION = "0.8.2-beta-latest-reconcile";
  var POLL_MS = 120;
  var POLL_LIMIT = 200;

  function rootDir() {
    var root = "";
    try { if (typeof getToolHubRootDir === "function") root = String(getToolHubRootDir() || ""); } catch (e0) {}
    try { if (!root && typeof APP_ROOT_DIR !== "undefined") root = String(APP_ROOT_DIR || ""); } catch (e1) {}
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
      temp = new java.io.File(file.getAbsolutePath() + ".tmp");
      writer = new java.io.OutputStreamWriter(new java.io.FileOutputStream(temp, false), "UTF-8");
      writer.write(JSON.stringify(value, null, 2) + "\n");
      writer.flush();
      writer.close();
      writer = null;
      if (file.exists() && !file.delete()) return false;
      if (!temp.renameTo(file)) return false;
      return true;
    } catch (e) { return false; }
    finally {
      try { if (writer) writer.close(); } catch (e0) {}
      try { if (temp && temp.exists()) temp.delete(); } catch (e1) {}
    }
  }

  function failed(item) {
    return !!(item && item.ok === false && item.running !== true);
  }

  function reconcile() {
    var root = rootDir();
    if (!root) return false;
    var file = new java.io.File(root + "/diagnostics/shortx-ui/latest.json");
    var text = readText(file);
    if (!text) return false;
    var payload;
    try { payload = JSON.parse(text); } catch (e0) { return false; }
    if (!payload || typeof payload !== "object") return false;
    var keys = [
      "basic", "dispatcher", "windowHost", "windowStress",
      "imeFocus", "imeStress", "gesture", "gestureStress",
      "canvas", "canvasStress", "dexBridge", "dexStress",
      "apiFacade", "apiComponents", "apiComponentsStress"
    ];
    var anyFailed = false;
    var i;
    for (i = 0; i < keys.length; i += 1) {
      if (failed(payload[keys[i]])) { anyFailed = true; break; }
    }
    payload.ok = !anyFailed;
    payload.savedAt = Number(java.lang.System.currentTimeMillis());
    payload.apiComponentsReconciledBy = VERSION;
    return writeJsonAtomic(file, payload);
  }

  function poll(app, field, attempt) {
    var value = app && app.state ? app.state[field] : null;
    if (value && value.running !== true) {
      reconcile();
      return;
    }
    if (Number(attempt || 0) >= POLL_LIMIT) return;
    try {
      new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(new java.lang.Runnable({
        run: function () { poll(app, field, Number(attempt || 0) + 1); }
      }), POLL_MS);
    } catch (e) {}
  }

  var oldBaseline = proto.runShortXUiPhase7BApiBaseline;
  if (typeof oldBaseline === "function") {
    proto.runShortXUiPhase7BApiBaseline = function () {
      var result = oldBaseline.apply(this, arguments);
      poll(this, "shortXUiPhase7BResult", 0);
      return result;
    };
  }

  var oldStress = proto.runShortXUiPhase7BStress;
  if (typeof oldStress === "function") {
    proto.runShortXUiPhase7BStress = function () {
      var result = oldStress.apply(this, arguments);
      poll(this, "shortXUiPhase7BStress", 0);
      return result;
    };
  }

  global.ToolHubBetaPhase7B.LATEST_RECONCILE_VERSION = VERSION;
  proto.__toolHubShortXUiPhase7BLatestReconcileInstalled = true;
  try { writeLog("ShortXUI Phase7B latest reconcile installed version=" + VERSION); } catch (eLog) {}
}(function () { return this; }()));
