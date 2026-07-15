// @version 1.0.3
// ToolHub - Content 动作与重大事件日志扩展（ShortX / Rhino ES5）

// =======================【Content：settings URI】=======================
FloatBallAppWM.prototype.parseSettingsUri = function(uriStr) {
  try {
    var s = String(uriStr || "");
    if (s.indexOf("content://settings/") !== 0) return null;
    var p = s.substring(19).split("/");
    var table = String(p[0] || "");
    if (table !== "system" && table !== "secure" && table !== "global") return null;
    return { table: table, key: p.length > 1 ? String(p[1] || "") : "" };
  } catch (e) { return null; }
};
FloatBallAppWM.prototype.settingsGetStringByTable = function(table, key) {
  try {
    var cr = context.getContentResolver();
    if (table === "system") return android.provider.Settings.System.getString(cr, String(key));
    if (table === "secure") return android.provider.Settings.Secure.getString(cr, String(key));
    if (table === "global") return android.provider.Settings.Global.getString(cr, String(key));
  } catch (e) {}
  return null;
};
FloatBallAppWM.prototype.settingsPutStringByTable = function(table, key, value) {
  try {
    var cr = context.getContentResolver();
    if (table === "system") return android.provider.Settings.System.putString(cr, String(key), String(value));
    if (table === "secure") return android.provider.Settings.Secure.putString(cr, String(key), String(value));
    if (table === "global") return android.provider.Settings.Global.putString(cr, String(key), String(value));
  } catch (e) {}
  return false;
};

// =======================【Content：安全策略】=======================
FloatBallAppWM.prototype.getContentSecurityMode = function() {
  var m = "strict";
  try { m = String(this.config.CONTENT_SECURITY_MODE || "strict").replace(/^\s+|\s+$/g, "").toLowerCase(); } catch (e) {}
  return (m === "compat_audit" || m === "off") ? m : "strict";
};
FloatBallAppWM.prototype.getContentUriAllowlist = function() {
  try { return String(this.config.CONTENT_URI_ALLOWLIST || "content://settings/system/|content://settings/secure/|content://settings/global/"); }
  catch (e) { return "content://settings/system/|content://settings/secure/|content://settings/global/"; }
};
FloatBallAppWM.prototype.getContentWriteUriAllowlist = function() {
  try { return String(this.config.CONTENT_WRITE_URI_ALLOWLIST || ""); } catch (e) { return ""; }
};
FloatBallAppWM.prototype.matchesContentUriAllowlist = function(uriStr, rawList) {
  try {
    var uri = String(uriStr || "");
    var a = String(rawList || "").split("|");
    for (var i = 0; i < a.length; i++) {
      var p = String(a[i] || "").replace(/^\s+|\s+$/g, "");
      if (p && uri.indexOf(p) === 0) return true;
    }
  } catch (e) {}
  return false;
};
FloatBallAppWM.prototype.isContentUriAllowlisted = function(uriStr) {
  return this.matchesContentUriAllowlist(uriStr, this.getContentUriAllowlist());
};
FloatBallAppWM.prototype.isContentWriteUriAllowlisted = function(uriStr) {
  return this.matchesContentUriAllowlist(uriStr, this.getContentWriteUriAllowlist());
};
FloatBallAppWM.prototype.checkContentUriSecurity = function(uriStr, modeName) {
  var out = { ok: true, mode: this.getContentSecurityMode(), scope: "read", allowed: false, uri: String(uriStr || ""), err: "" };
  try {
    if (out.mode === "off") return out;
    var action = String(modeName || "").replace(/^\s+|\s+$/g, "").toLowerCase();
    var write = action === "put" || action === "update" || action === "insert" || action === "delete";
    out.scope = write ? "write" : "read";
    out.allowed = write ? this.isContentWriteUriAllowlisted(uriStr) : this.isContentUriAllowlisted(uriStr);
    if (out.allowed) return out;
    out.err = "content uri not in " + out.scope + " allowlist mode=" + out.mode + " action=" + action + " uri=" + String(uriStr || "");
    if (out.mode === "compat_audit") safeLog(this.L, "w", out.err);
    else { out.ok = false; safeLog(this.L, "e", out.err); }
  } catch (e) {
    out.err = "content security check failed: " + String(e);
    out.ok = out.mode === "compat_audit" || out.mode === "off";
    safeLog(this.L, out.ok ? "w" : "e", out.err);
  }
  return out;
};

// =======================【Content：query / 执行】=======================
FloatBallAppWM.prototype.contentQueryToText = function(uriStr, projection, selection, selectionArgs, sortOrder, maxRows) {
  var out = { ok: false, uri: String(uriStr || ""), rows: 0, text: "", err: "" };
  var cur = null;
  try {
    var cr = context.getContentResolver();
    var uri = android.net.Uri.parse(String(uriStr));
    function strArray(src) {
      if (!src || !src.length) return null;
      var arr = java.lang.reflect.Array.newInstance(java.lang.String, src.length);
      for (var i = 0; i < src.length; i++) arr[i] = String(src[i]);
      return arr;
    }
    cur = cr.query(uri, strArray(projection), selection == null ? null : String(selection), strArray(selectionArgs), sortOrder == null ? null : String(sortOrder));
    if (!cur) { out.err = "query return null cursor"; return out; }
    var cols = [], cc = cur.getColumnCount(), i;
    for (i = 0; i < cc; i++) cols.push(String(cur.getColumnName(i)));
    var lines = ["URI: " + String(uriStr), "Columns(" + cc + "): " + cols.join(", "), ""];
    var limit = Math.max(1, Math.floor(Number(maxRows || this.config.CONTENT_MAX_ROWS || 20)));
    while (cur.moveToNext() && out.rows < limit) {
      out.rows++;
      lines.push("#" + out.rows);
      for (i = 0; i < cc; i++) {
        var v = "";
        try { v = cur.isNull(i) ? "null" : String(cur.getString(i)); }
        catch (eV) { try { v = String(cur.getLong(i)); } catch (eV2) { v = "<??>"; } }
        lines.push("  " + cols[i] + " = " + v);
      }
      lines.push("");
    }
    out.ok = true;
    out.text = lines.join("\n");
  } catch (e) { out.err = String(e); }
  finally { try { if (cur) cur.close(); } catch (eC) { safeLog(null, "e", "cursor close fail " + String(eC)); } }
  return out;
};
FloatBallAppWM.prototype.execContentAction = function(btn) {
  var mode = btn.mode ? String(btn.mode) : (btn.value == null ? "get" : "put");
  var uri = btn.uri ? String(btn.uri) : "";
  if (!uri) return { ok: false, err: "missing uri" };
  var sec = this.checkContentUriSecurity(uri, mode, btn);
  if (!sec.ok) return { ok: false, mode: mode, kind: "security", err: sec.err };
  var su = this.parseSettingsUri(uri);
  if (mode === "get") {
    if (su && su.key) {
      var value = this.settingsGetStringByTable(su.table, su.key);
      return { ok: true, mode: mode, kind: "settings", table: su.table, key: su.key, value: value === null ? "null" : String(value) };
    }
    var one = this.contentQueryToText(uri, btn.projection, btn.selection, btn.selectionArgs, btn.sortOrder, 1);
    return one.ok ? { ok: true, mode: mode, kind: "query", text: one.text, rows: one.rows } : { ok: false, mode: mode, kind: "query", err: one.err };
  }
  if (mode === "put") {
    var val = btn.value == null ? "" : String(btn.value);
    if (su && su.key) return { ok: !!this.settingsPutStringByTable(su.table, su.key, val), mode: mode, kind: "settings", table: su.table, key: su.key, value: val };
    try {
      var cr = context.getContentResolver(), cv = new android.content.ContentValues(), k;
      if (btn.values) {
        for (k in btn.values) {
          if (!btn.values.hasOwnProperty || btn.values.hasOwnProperty(k)) cv.put(String(k), String(btn.values[k]));
        }
      } else {
        cv.put("value", val);
      }
      var args = null;
      if (btn.selectionArgs && btn.selectionArgs.length) {
        args = java.lang.reflect.Array.newInstance(java.lang.String, btn.selectionArgs.length);
        for (var i = 0; i < btn.selectionArgs.length; i++) args[i] = String(btn.selectionArgs[i]);
      }
      var n = cr.update(android.net.Uri.parse(uri), cv, btn.selection == null ? null : String(btn.selection), args);
      return { ok: true, mode: mode, kind: "update", updated: Number(n) };
    } catch (eU) { return { ok: false, mode: mode, kind: "update", err: String(eU) }; }
  }
  if (mode === "query") {
    var q = this.contentQueryToText(uri, btn.projection, btn.selection, btn.selectionArgs, btn.sortOrder, btn.maxRows == null ? this.config.CONTENT_MAX_ROWS : Number(btn.maxRows));
    return q.ok ? { ok: true, mode: mode, rows: q.rows, text: q.text } : { ok: false, mode: mode, err: q.err };
  }
  if (mode === "view") {
    try {
      var it = new android.content.Intent(android.content.Intent.ACTION_VIEW);
      it.setData(android.net.Uri.parse(uri));
      it.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
      context.startActivity(it);
      return { ok: true, mode: mode };
    } catch (eV) { return { ok: false, mode: mode, err: String(eV) }; }
  }
  return { ok: false, err: "unknown mode=" + mode };
};

// =======================【重大事件：仅写现有每日日志】=======================
(function() {
  var M = {};
  M.now = function() { try { return Number(java.lang.System.currentTimeMillis()); } catch (e) { return new Date().getTime(); } };
  M.clean = function(v, n) {
    var s = "";
    try { s = String(v == null ? "" : v); } catch (e) {}
    s = s.replace(/[\r\n\t ]+/g, "_").replace(/[|=]/g, "-");
    return s.length > n ? s.substring(0, n) : s;
  };
  M.first = function(path) {
    var r = null;
    try {
      var f = new java.io.File(path);
      if (!f.exists()) return "";
      r = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(f), "UTF-8"));
      var line = r.readLine();
      return line == null ? "" : String(line).replace(/^\s+|\s+$/g, "");
    } catch (e) { return ""; }
    finally { try { if (r) r.close(); } catch (eC) {} }
  };
  M.boot = function() { return M.first("/proc/sys/kernel/random/boot_id"); };
  M.kv = function(obj) {
    var keys = [], out = [], k;
    for (k in obj) try { if (!obj.hasOwnProperty || obj.hasOwnProperty(k)) keys.push(k); } catch (e) {}
    keys.sort();
    for (var i = 0; i < keys.length; i++) if (obj[keys[i]] !== "" && obj[keys[i]] != null) out.push(M.clean(keys[i], 48) + "=" + M.clean(obj[keys[i]], 1024));
    return out.join(" ");
  };
  M.parse = function(line) {
    var out = {}, p = String(line || ""), at = p.indexOf("TH_MAJOR ");
    if (at < 0) return out;
    var a = p.substring(at + 9).split(/\s+/);
    for (var i = 0; i < a.length; i++) { var x = a[i].indexOf("="); if (x > 0) out[a[i].substring(0, x)] = a[i].substring(x + 1); }
    return out;
  };
  M.tail = function(file, max) {
    var raf = null;
    try {
      raf = new java.io.RandomAccessFile(file, "r");
      var len = Number(raf.length()), start = Math.max(0, len - max), size = Math.floor(len - start);
      raf.seek(start);
      var b = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, size);
      if (size > 0) raf.readFully(b);
      var s = String(new java.lang.String(b, "UTF-8"));
      if (start > 0) { var nl = s.indexOf("\n"); if (nl >= 0) s = s.substring(nl + 1); }
      return s;
    } catch (e) { return ""; }
    finally { try { if (raf) raf.close(); } catch (eC) {} }
  };
  M.logs = function(L) {
    try {
      var files = new java.io.File(L.dir).listFiles(), a = [], i;
      if (!files) return "";
      for (i = 0; i < files.length; i++) if (files[i].isFile() && /^ShortX_ToolHub_\d{8}\.log$/.test(String(files[i].getName()))) a.push(files[i]);
      a.sort(function(x, y) { return String(x.getName()).localeCompare(String(y.getName())); });
      var s = "";
      for (i = Math.max(0, a.length - 3); i < a.length; i++) s += "\n" + M.tail(a[i], 196608);
      return s;
    } catch (e) { return ""; }
  };

  var oldActive = null, oldBridge = null;
  try { if (typeof TOOLHUB_ACTIVE_LOGGER !== "undefined") oldActive = TOOLHUB_ACTIVE_LOGGER; } catch (eA) {}
  try { if (typeof TOOLHUB_CRASH_BRIDGE !== "undefined") oldBridge = TOOLHUB_CRASH_BRIDGE; } catch (eB) {}
  TOOLHUB_ACTIVE_LOGGER = oldActive;
  TOOLHUB_CRASH_BRIDGE = oldBridge || { installed: false, handling: false, logger: null, original: null, handler: null };

  FileIO.appendText = function(path, content, forceSync) {
    var fos = null, w = null;
    try {
      var f = new java.io.File(String(path)), p = f.getParentFile();
      if (p && !p.exists()) p.mkdirs();
      fos = new java.io.FileOutputStream(f, true);
      w = new java.io.OutputStreamWriter(fos, "UTF-8");
      w.write(String(content));
      w.flush();
      if (forceSync === true) fos.getFD().sync();
      return true;
    } catch (e) { return false; }
    finally { try { if (w) w.close(); } catch (e1) {} try { if (fos) fos.close(); } catch (e2) {} }
  };
  safeLog = function(logger, level, msg) {
    var L = logger || TOOLHUB_ACTIVE_LOGGER;
    try { if (L && L[level]) { L[level](msg); return true; } } catch (e) {}
    return false;
  };
  ToolHubLogger.prototype._line = function(level, msg) {
    var d = new Date(this._now());
    function z(n) { return (n < 10 ? "0" : "") + n; }
    var t = d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + " " + z(d.getHours()) + ":" + z(d.getMinutes()) + ":" + z(d.getSeconds());
    var uid = -1, pid = -1, tid = -1, th = "", proc = "";
    try { uid = this.proc.uid; } catch (e0) {}
    try { pid = android.os.Process.myPid(); } catch (e1) {}
    try { tid = android.os.Process.myTid(); } catch (e2) {}
    try { th = java.lang.Thread.currentThread().getName(); } catch (e3) {}
    try { proc = this.proc.processName || ""; } catch (e4) {}
    return t + " [" + level + "] " + sanitizeLogMessage(msg) + " uid=" + uid + " pid=" + pid + " tid=" + tid + " th=" + M.clean(th, 120) + " proc=" + M.clean(proc, 240) + "\n";
  };
  ToolHubLogger.prototype._writeRaw = function(level, msg, sync) { return this.initOk ? FileIO.appendText(this._filePathForToday(), this._line(level, msg), sync === true) : false; };
  ToolHubLogger.prototype._write = function(level, msg, sync) { return this.enable ? this._writeRaw(level, msg, sync) : false; };
  ToolHubLogger.prototype.fatal = function(msg) { return this._writeRaw("F", msg, true); };
  ToolHubLogger.prototype.major = function(event, fields, sync) {
    var data = { v: 1, event: String(event), sid: String(this.sessionId || ""), seq: Number(this.sessionSeq || 0) + 1 }, k;
    this.sessionSeq = data.seq;
    for (k in (fields || {})) try { if (!fields.hasOwnProperty || fields.hasOwnProperty(k)) data[k] = fields[k]; } catch (e) {}
    return this._writeRaw(event === "UNCAUGHT" || event === "RECOVERED_INTERRUPTION" ? "F" : "I", "TH_MAJOR " + M.kv(data), sync === true || event === "UNCAUGHT" || event === "RECOVERED_INTERRUPTION");
  };
  ToolHubLogger.prototype.checkpoint = function(phase, fields, sync) { this.currentPhase = String(phase || ""); var d = fields || {}; d.phase = this.currentPhase; return this.major("CHECKPOINT", d, sync); };
  ToolHubLogger.prototype.incident = function(type, fields) { var d = fields || {}; d.type = String(type || "unknown"); if (!d.phase) d.phase = this.currentPhase || ""; return this.major(type === "UNCAUGHT" ? "UNCAUGHT" : "INCIDENT", d, true); };
  ToolHubLogger.prototype.beginSession = function(source) {
    if (this.sessionOpen) return false;
    this.sessionOpen = true; this.sessionEnded = false; this.sessionStartedAt = M.now();
    return this.major("SESSION_BEGIN", { source: source || "entry", boot: M.boot(), pid: android.os.Process.myPid(), proc: this.proc.processName || "" }, true);
  };
  ToolHubLogger.prototype.endSession = function(reason, status) {
    if (this.sessionEnded) return false;
    this.sessionEnded = true; this.sessionOpen = false;
    return this.major("SESSION_END", { reason: reason || "normal_close", status: status || "clean", clean: true, durationMs: Math.max(0, M.now() - this.sessionStartedAt) }, true);
  };
  ToolHubLogger.prototype.recoverPreviousSession = function() {
    try {
      var lines = M.logs(this).split(/\r?\n/), i, start = -1, b = null;
      for (i = lines.length - 1; i >= 0; i--) { var f = M.parse(lines[i]); if (f.event === "SESSION_BEGIN" && f.sid) { start = i; b = f; break; } }
      if (start < 0) return null;
      var ended = false, last = b, phase = "SESSION_BEGIN";
      for (i = start + 1; i < lines.length; i++) { var x = M.parse(lines[i]); if (x.sid !== b.sid) continue; if (x.event === "SESSION_END") ended = true; if (x.event === "CHECKPOINT") { last = x; phase = x.phase || phase; } }
      if (ended) return null;
      var oldPid = Number(b.pid || -1), newPid = Number(android.os.Process.myPid()), oldBoot = String(b.boot || ""), newBoot = M.boot(), same = !!oldBoot && oldBoot === newBoot;
      var kind = oldBoot && newBoot && oldBoot !== newBoot ? "device_reboot" : (same && String(b.proc || "").indexOf("system_server") >= 0 && oldPid !== newPid ? "suspected_system_server_restart" : (same && oldPid === newPid ? "script_session_interrupted" : (same ? "process_restart" : "unknown_interruption")));
      this.major("RECOVERED_INTERRUPTION", { previousSid: b.sid, classification: kind, lastPhase: phase, target: last.target || "", which: last.which || "", route: last.route || "", oldPid: oldPid, newPid: newPid, sameBoot: same }, true);
      return { classification: kind, lastPhase: phase };
    } catch (e) { this._writeRaw("W", "major recovery fail err=" + String(e), false); }
    return null;
  };

  function fields(app, more) {
    var d = {}, k;
    try { d.route = app.state.toolAppRoute || ""; d.group = app.state.settingsGroupKey || ""; } catch (e) {}
    for (k in (more || {})) try { if (!more.hasOwnProperty || more.hasOwnProperty(k)) d[k] = more[k]; } catch (e2) {}
    return d;
  }
  function wrap(proto, name, maker) {
    try { var old = proto[name]; if (typeof old !== "function" || old.__majorWrapped) return; var n = maker(old); n.__majorWrapped = true; proto[name] = n; } catch (e) {}
  }
  function patchRuntime() {
    if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM.prototype) return;
    var p = FloatBallAppWM.prototype;
    wrap(p, "createBallViews", function(old) { return function() { if (this.L) this.L.checkpoint("BALL_VIEW_BUILD_BEGIN", fields(this), false); var r = old.apply(this, arguments); if (this.L) this.L.checkpoint("BALL_VIEW_BUILD_DONE", fields(this), false); return r; }; });
    wrap(p, "createBallLayoutParams", function(old) { return function() { if (this.L) this.L.checkpoint("BALL_LP_BUILD_BEGIN", fields(this), false); var r = old.apply(this, arguments); if (this.L) this.L.checkpoint("WM_ADD_BEGIN", fields(this, { target: "ball" }), true); return r; }; });
    wrap(p, "setupDisplayMonitor", function(old) { return function() { if (this.L) this.L.checkpoint("WM_ADD_DONE", fields(this, { target: "ball" }), false); return old.apply(this, arguments); }; });
    wrap(p, "startAsync", function(old) { return function() { if (this.L) this.L.checkpoint("START_ASYNC_BEGIN", fields(this), true); var r = old.apply(this, arguments); if (this.L) { if (r && r.ok) this.L.checkpoint("SESSION_READY", fields(this), true); else { this.L.checkpoint("WM_ADD_FAIL", fields(this, { target: "ball", error: r && r.err || "unknown" }), true); this.L.incident("START_FAILED", fields(this, { error: r && r.err || "unknown" })); this.L.endSession("start_failed", "failed"); } } return r; }; });
    wrap(p, "buildPanelView", function(old) { return function(type) { if (this.L) this.L.checkpoint("PANEL_BUILD_BEGIN", fields(this, { which: type }), false); try { var r = old.apply(this, arguments); if (this.L) this.L.checkpoint("PANEL_BUILD_DONE", fields(this, { which: type }), false); return r; } catch (e) { if (this.L) this.L.incident("PANEL_BUILD_FAIL", fields(this, { which: type, error: String(e) })); throw e; } }; });
    wrap(p, "addPanel", function(old) { return function(view, x, y, which) { if (this.L) this.L.checkpoint("WM_ADD_BEGIN", fields(this, { target: "panel", which: which, x: x, y: y }), true); var r = old.apply(this, arguments), ok = false; try { ok = which === "main" ? this.state.panel === view && this.state.addedPanel : (which === "settings" ? this.state.settingsPanel === view && this.state.addedSettings : this.state.viewerPanel === view && this.state.addedViewer); } catch (e) {} if (this.L) this.L.checkpoint(ok ? "WM_ADD_DONE" : "WM_ADD_FAIL", fields(this, { target: "panel", which: which }), !ok); return r; }; });
    wrap(p, "safeRemoveView", function(old) { return function(view, name, opts) { var target = String(name || "view"), sync = target === "ballRoot" || target === "panel" || target.indexOf("settings") >= 0 || target.indexOf("pointer") >= 0 || target.indexOf("capture") >= 0; if (this.L) this.L.checkpoint("WM_REMOVE_BEGIN", fields(this, { target: target, immediate: !!(opts && opts.immediate) }), sync); var r = old.apply(this, arguments), phase = r && r.ok === false ? "WM_REMOVE_FAIL" : (r && r.fallbackRemove ? "WM_REMOVE_FALLBACK" : "WM_REMOVE_DONE"); if (this.L) this.L.checkpoint(phase, fields(this, { target: target, error: r && (r.err || r.firstErr) || "" }), phase === "WM_REMOVE_FAIL"); return r; }; });
    wrap(p, "close", function(old) { return function(reason) { if ((this.state && this.state.closed === true) || (this.L && this.L.sessionEnded === true)) return old.apply(this, arguments); var why = String(reason || ""); if (!why) try { why = typeof __toolHubRestartRunning !== "undefined" && __toolHubRestartRunning ? "planned_reload" : "normal_close"; } catch (e) { why = "normal_close"; } if (this.L) this.L.checkpoint("SESSION_CLOSE_BEGIN", fields(this, { reason: why }), true); try { var r = old.apply(this, arguments); if (this.L && this.state && this.state.closed) this.L.endSession(why, "clean"); return r; } catch (e2) { if (this.L) this.L.incident("CLOSE_FAILED", fields(this, { reason: why, error: String(e2) })); throw e2; } }; });
  }

  var BaseLogger = ToolHubLogger;
  try {
    if (ToolHubLogger && ToolHubLogger.__toolHubMajorLoggerWrapper === true &&
        typeof TOOLHUB_BASE_LOGGER_CONSTRUCTOR !== "undefined" && TOOLHUB_BASE_LOGGER_CONSTRUCTOR) {
      BaseLogger = TOOLHUB_BASE_LOGGER_CONSTRUCTOR;
    } else {
      TOOLHUB_BASE_LOGGER_CONSTRUCTOR = ToolHubLogger;
    }
  } catch (eBase) {}
  ToolHubLogger = function(procInfo) {
    BaseLogger.call(this, procInfo);
    this.sessionId = String(M.now()) + "-" + String(android.os.Process.myPid()) + "-" + String(java.lang.System.nanoTime());
    this.sessionSeq = 0; this.currentPhase = ""; this.sessionOpen = false; this.sessionEnded = false;
    TOOLHUB_ACTIVE_LOGGER = this;
    patchRuntime();
    this.recoverPreviousSession();
    this.beginSession(procInfo && procInfo.tag || "entry");
  };
  ToolHubLogger.prototype = BaseLogger.prototype;
  ToolHubLogger.prototype.constructor = ToolHubLogger;
  ToolHubLogger.__toolHubMajorLoggerWrapper = true;

  installCrashHandler = function(logger) {
    try {
      if (!logger) return false;
      TOOLHUB_ACTIVE_LOGGER = logger; TOOLHUB_CRASH_BRIDGE.logger = logger;
      if (TOOLHUB_CRASH_BRIDGE.installed && TOOLHUB_CRASH_BRIDGE.handler) return true;
      TOOLHUB_CRASH_BRIDGE.original = java.lang.Thread.getDefaultUncaughtExceptionHandler();
      TOOLHUB_CRASH_BRIDGE.handler = new JavaAdapter(java.lang.Thread.UncaughtExceptionHandler, { uncaughtException: function(t, e) {
        if (TOOLHUB_CRASH_BRIDGE.handling) { try { if (TOOLHUB_CRASH_BRIDGE.original) TOOLHUB_CRASH_BRIDGE.original.uncaughtException(t, e); } catch (e0) {} return; }
        TOOLHUB_CRASH_BRIDGE.handling = true;
        try {
          var L = TOOLHUB_CRASH_BRIDGE.logger || TOOLHUB_ACTIVE_LOGGER, tn = "", cn = "", msg = "";
          try { tn = t ? t.getName() : ""; } catch (e1) {} try { cn = e && e.getClass ? e.getClass().getName() : ""; } catch (e2) {} try { msg = String(e || ""); } catch (e3) {}
          if (L) L.incident("UNCAUGHT", { thread: tn, exception: cn, message: M.clean(msg, 2048), phase: L.currentPhase || "" });
          if (L && String(cn).indexOf("OutOfMemoryError") < 0) try { var sw = new java.io.StringWriter(), pw = new java.io.PrintWriter(sw); e.printStackTrace(pw); pw.flush(); L.fatal("STACKTRACE " + M.clean(sw.toString(), 8192)); } catch (e4) {}
        } catch (e5) {}
        try { if (TOOLHUB_CRASH_BRIDGE.original) TOOLHUB_CRASH_BRIDGE.original.uncaughtException(t, e); } catch (e6) {}
        TOOLHUB_CRASH_BRIDGE.handling = false;
      }});
      java.lang.Thread.setDefaultUncaughtExceptionHandler(TOOLHUB_CRASH_BRIDGE.handler);
      TOOLHUB_CRASH_BRIDGE.installed = true;
      return true;
    } catch (e) { return false; }
  };
})();

/* 下面开始：WM 动画、面板、触摸、启动、输出 */
