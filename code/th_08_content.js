// @version 1.0.4
// =======================【Content：解析 settings URI】=======================
// 这段代码的主要内容/用途：识别 content://settings/(system|secure|global)/KEY 并用 Settings.* get/put 更稳
FloatBallAppWM.prototype.parseSettingsUri = function(uriStr) {
  try {
    var s = String(uriStr || "");
    if (s.indexOf("content://settings/") !== 0) return null;

    // content://settings/system/accelerometer_rotation
    var rest = s.substring("content://settings/".length);
    var parts = rest.split("/");
    if (!parts || parts.length < 1) return null;

    var table = String(parts[0] || "");
    var key = "";
    if (parts.length >= 2) key = String(parts[1] || "");

    if (table !== "system" && table !== "secure" && table !== "global") return null;
    return { table: table, key: key };
  } catch (e) { return null; }
};

FloatBallAppWM.prototype.settingsGetStringByTable = function(table, key) {
  try {
    var cr = context.getContentResolver();
    if (table === "system") return android.provider.Settings.System.getString(cr, String(key));
    if (table === "secure") return android.provider.Settings.Secure.getString(cr, String(key));
    if (table === "global") return android.provider.Settings.Global.getString(cr, String(key));
    return null;
  } catch (e) { return null; }
};

FloatBallAppWM.prototype.settingsPutStringByTable = function(table, key, value) {
  try {
    var cr = context.getContentResolver();
    if (table === "system") return android.provider.Settings.System.putString(cr, String(key), String(value));
    if (table === "secure") return android.provider.Settings.Secure.putString(cr, String(key), String(value));
    if (table === "global") return android.provider.Settings.Global.putString(cr, String(key), String(value));
    return false;
  } catch (e) { return false; }
};

// =======================【Content：安全策略】=======================
// 默认 strict：读取使用 CONTENT_URI_ALLOWLIST，写入使用独立的 CONTENT_WRITE_URI_ALLOWLIST。
// 写白名单默认留空，因此 put/update 默认拒绝；旧 audit 值按 strict 处理，兼容需显式 compat_audit。
FloatBallAppWM.prototype.getContentSecurityMode = function() {
  var mode = "strict";
  try {
    if (this.config && this.config.CONTENT_SECURITY_MODE !== undefined && this.config.CONTENT_SECURITY_MODE !== null) {
      mode = String(this.config.CONTENT_SECURITY_MODE || "strict");
    }
  } catch (eMode) { mode = "strict"; }
  try { mode = mode.replace(/^\s+|\s+$/g, "").toLowerCase(); } catch (eTrim) { mode = "strict"; }
  if (mode !== "compat_audit" && mode !== "off") mode = "strict";
  return mode;
};

FloatBallAppWM.prototype.getContentUriAllowlist = function() {
  var raw = "content://settings/system/|content://settings/secure/|content://settings/global/";
  try {
    if (this.config && this.config.CONTENT_URI_ALLOWLIST !== undefined && this.config.CONTENT_URI_ALLOWLIST !== null) {
      raw = String(this.config.CONTENT_URI_ALLOWLIST || raw);
    }
  } catch (eAllow) {}
  return String(raw || "");
};

FloatBallAppWM.prototype.getContentWriteUriAllowlist = function() {
  var raw = "";
  try {
    if (this.config && this.config.CONTENT_WRITE_URI_ALLOWLIST !== undefined && this.config.CONTENT_WRITE_URI_ALLOWLIST !== null) {
      raw = String(this.config.CONTENT_WRITE_URI_ALLOWLIST || "");
    }
  } catch (eAllow) {}
  return String(raw || "");
};

FloatBallAppWM.prototype.matchesContentUriAllowlist = function(uriStr, rawList) {
  try {
    var uri = String(uriStr || "");
    if (!uri) return false;
    var parts = String(rawList || "").split("|");
    for (var i = 0; i < parts.length; i++) {
      var p = String(parts[i] || "").replace(/^\s+|\s+$/g, "");
      if (!p) continue;
      if (uri.indexOf(p) === 0) return true;
    }
  } catch (e) {}
  return false;
};

FloatBallAppWM.prototype.isContentUriAllowlisted = function(uriStr) {
  var raw = this.getContentUriAllowlist ? this.getContentUriAllowlist() : "";
  return this.matchesContentUriAllowlist ? this.matchesContentUriAllowlist(uriStr, raw) : false;
};

FloatBallAppWM.prototype.isContentWriteUriAllowlisted = function(uriStr) {
  var raw = this.getContentWriteUriAllowlist ? this.getContentWriteUriAllowlist() : "";
  return this.matchesContentUriAllowlist ? this.matchesContentUriAllowlist(uriStr, raw) : false;
};

FloatBallAppWM.prototype.checkContentUriSecurity = function(uriStr, modeName, btn) {
  var out = { ok: true, mode: "strict", scope: "read", allowed: false, uri: String(uriStr || ""), err: "" };
  try {
    out.mode = this.getContentSecurityMode ? this.getContentSecurityMode() : "strict";
    if (out.mode === "off") return out;

    var action = "";
    try { action = String(modeName || "").replace(/^\s+|\s+$/g, "").toLowerCase(); } catch (eAction) { action = ""; }
    var isWrite = (action === "put" || action === "update" || action === "insert" || action === "delete");
    out.scope = isWrite ? "write" : "read";
    if (isWrite) out.allowed = this.isContentWriteUriAllowlisted ? this.isContentWriteUriAllowlisted(uriStr) : false;
    else out.allowed = this.isContentUriAllowlisted ? this.isContentUriAllowlisted(uriStr) : false;
    if (out.allowed) return out;

    var msg = "content uri not in " + out.scope + " allowlist mode=" + out.mode + " action=" + action + " uri=" + String(uriStr || "");
    if (out.mode === "compat_audit") {
      safeLog(this.L, 'w', msg);
      return out;
    }

    out.ok = false;
    out.err = msg;
    safeLog(this.L, 'e', msg);
    return out;
  } catch (eSec) {
    out.err = "content security check failed: " + String(eSec);
    if (out.mode === "compat_audit" || out.mode === "off") {
      out.ok = true;
      try { safeLog(this.L, 'w', out.err + " compat allow"); } catch(eLogCompat) {}
    } else {
      out.ok = false;
      try { safeLog(this.L, 'e', out.err + " fail closed"); } catch(eLogStrict) {}
    }
  }
  return out;
};

// =======================【Content：通用 query】=======================
// 这段代码的主要内容/用途：ContentResolver.query 并把 Cursor 转成文本（用于查看器面板）
FloatBallAppWM.prototype.contentQueryToText = function(uriStr, projection, selection, selectionArgs, sortOrder, maxRows) {
  var out = { ok: false, uri: String(uriStr || ""), rows: 0, text: "", err: "" };
  var cr = null;
  var cur = null;

  try {
    cr = context.getContentResolver();
    var uri = android.net.Uri.parse(String(uriStr));

    var projArr = null;
    if (projection && projection.length) {
      projArr = java.lang.reflect.Array.newInstance(java.lang.String, projection.length);
      var i0;
      for (i0 = 0; i0 < projection.length; i0++) projArr[i0] = String(projection[i0]);
    }

    var sel = (selection === undefined || selection === null) ? null : String(selection);

    var selArgsArr = null;
    if (selectionArgs && selectionArgs.length) {
      selArgsArr = java.lang.reflect.Array.newInstance(java.lang.String, selectionArgs.length);
      var i1;
      for (i1 = 0; i1 < selectionArgs.length; i1++) selArgsArr[i1] = String(selectionArgs[i1]);
    }

    var so = (sortOrder === undefined || sortOrder === null) ? null : String(sortOrder);

    cur = cr.query(uri, projArr, sel, selArgsArr, so);
    if (!cur) {
      out.err = "query return null cursor";
      return out;
    }

    var colCount = cur.getColumnCount();
    var cols = [];
    var ci;
    for (ci = 0; ci < colCount; ci++) cols.push(String(cur.getColumnName(ci)));

    var sb = [];
    sb.push("URI: " + String(uriStr));
    sb.push("Columns(" + String(colCount) + "): " + cols.join(", "));
    sb.push("");

    var limit = Math.max(1, Math.floor(Number(maxRows || this.config.CONTENT_MAX_ROWS || 20)));
    var row = 0;

    while (cur.moveToNext()) {
      row++;
      sb.push("#" + String(row));
      var cj;
      for (cj = 0; cj < colCount; cj++) {
        var v = "";
        try {
          if (cur.isNull(cj)) v = "null";
          else v = String(cur.getString(cj));
        } catch (eV) {
          try { v = String(cur.getLong(cj)); } catch (eV2) { v = "<??>"; }
        }
        sb.push("  " + cols[cj] + " = " + v);
      }
      sb.push("");
      if (row >= limit) break;
    }

    out.ok = true;
    out.rows = row;
    out.text = sb.join("\n");
    return out;
  } catch (e) {
    out.err = String(e);
    return out;
  } finally {
    try { if (cur) cur.close();  } catch(eC) { safeLog(null, 'e', "catch " + String(eC)); }
  }
};

// =======================【Content：统一入口】=======================
// 这段代码的主要内容/用途：处理按钮里的 type:"content"
FloatBallAppWM.prototype.execContentAction = function(btn) {
  var mode = btn.mode ? String(btn.mode) : ((btn.value !== undefined && btn.value !== null) ? "put" : "get");
  var uri = btn.uri ? String(btn.uri) : "";
  if (!uri) return { ok: false, err: "missing uri" };

  var sec = this.checkContentUriSecurity ? this.checkContentUriSecurity(uri, mode, btn) : { ok: true };
  if (sec && !sec.ok) return { ok: false, mode: mode, kind: "security", err: sec.err || "content uri blocked" };

  // settings uri 优先走 Settings API
  var su = this.parseSettingsUri(uri);

  if (mode === "get") {
    if (su && su.key) {
      var v = this.settingsGetStringByTable(su.table, su.key);
      return { ok: true, mode: "get", kind: "settings", table: su.table, key: su.key, value: (v === null ? "null" : String(v)) };
    }

    // 非 settings：尝试 query 一行
    var q1 = this.contentQueryToText(uri, btn.projection, btn.selection, btn.selectionArgs, btn.sortOrder, 1);
    if (!q1.ok) return { ok: false, mode: "get", kind: "query", err: q1.err };
    return { ok: true, mode: "get", kind: "query", text: q1.text, rows: q1.rows };
  }

  if (mode === "put") {
    var val = (btn.value === undefined || btn.value === null) ? "" : String(btn.value);

    if (su && su.key) {
      var ok = this.settingsPutStringByTable(su.table, su.key, val);
      return { ok: !!ok, mode: "put", kind: "settings", table: su.table, key: su.key, value: val };
    }

    // 非 settings：尽力走 update(ContentValues)
    try {
      var cr = context.getContentResolver();
      var u = android.net.Uri.parse(uri);
      var cv = new android.content.ContentValues();

      // 支持 btn.values = {col1: "...", col2: "..."}；否则写 value 列
      if (btn.values) {
        var k;
        for (k in btn.values) {
          if (!btn.values.hasOwnProperty(k)) continue;
          cv.put(String(k), String(btn.values[k]));
        }
      } else {
        cv.put("value", val);
      }

      var where = (btn.selection === undefined || btn.selection === null) ? null : String(btn.selection);

      var whereArgs = null;
      if (btn.selectionArgs && btn.selectionArgs.length) {
        whereArgs = java.lang.reflect.Array.newInstance(java.lang.String, btn.selectionArgs.length);
        var i2;
        for (i2 = 0; i2 < btn.selectionArgs.length; i2++) whereArgs[i2] = String(btn.selectionArgs[i2]);
      }

      var n = cr.update(u, cv, where, whereArgs);
      return { ok: true, mode: "put", kind: "update", updated: Number(n) };
    } catch (eU) {
      return { ok: false, mode: "put", kind: "update", err: String(eU) };
    }
  }

  if (mode === "query") {
    var maxRows = (btn.maxRows === undefined || btn.maxRows === null) ? this.config.CONTENT_MAX_ROWS : Number(btn.maxRows);
    var q = this.contentQueryToText(uri, btn.projection, btn.selection, btn.selectionArgs, btn.sortOrder, maxRows);
    if (!q.ok) return { ok: false, mode: "query", err: q.err };
    return { ok: true, mode: "query", rows: q.rows, text: q.text };
  }

  if (mode === "view") {
    try {
      var it = new android.content.Intent(android.content.Intent.ACTION_VIEW);
      it.setData(android.net.Uri.parse(uri));
      it.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
      context.startActivity(it);
      return { ok: true, mode: "view" };
    } catch (eV) {
      return { ok: false, mode: "view", err: String(eV) };
    }
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
    for (var i = 0; i < keys.length; i++) {
      if (obj[keys[i]] !== "" && obj[keys[i]] != null) {
        out.push(M.clean(keys[i], 48) + "=" + M.clean(obj[keys[i]], 1024));
      }
    }
    return out.join(" ");
  };
  M.parse = function(line) {
    var out = {}, p = String(line || ""), at = p.indexOf("TH_MAJOR ");
    if (at < 0) return out;
    try { out.time = p.length >= 19 ? p.substring(0, 19) : ""; } catch (eTime) { out.time = ""; }
    var a = p.substring(at + 9).split(/\s+/);
    for (var i = 0; i < a.length; i++) {
      var x = a[i].indexOf("=");
      if (x > 0) out[a[i].substring(0, x)] = a[i].substring(x + 1);
    }
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
      if (start > 0) {
        var nl = s.indexOf("\n");
        if (nl >= 0) s = s.substring(nl + 1);
      }
      return s;
    } catch (e) { return ""; }
    finally { try { if (raf) raf.close(); } catch (eC) {} }
  };
  M.logs = function(L) {
    try {
      var files = new java.io.File(L.dir).listFiles(), a = [], i;
      if (!files) return "";
      for (i = 0; i < files.length; i++) {
        if (files[i].isFile() && /^ShortX_ToolHub_\d{8}\.log$/.test(String(files[i].getName()))) a.push(files[i]);
      }
      a.sort(function(x, y) { return String(x.getName()).localeCompare(String(y.getName())); });
      var s = "";
      for (i = Math.max(0, a.length - 3); i < a.length; i++) s += "\n" + M.tail(a[i], 196608);
      return s;
    } catch (e) { return ""; }
  };
  M.recentEvents = function(L, limit) {
    var out = [];
    try {
      var lines = M.logs(L).split(/\r?\n/);
      for (var i = lines.length - 1; i >= 0 && out.length < limit; i--) {
        var item = M.parse(lines[i]);
        if (item && item.event) out.push(item);
      }
      out.reverse();
    } catch (e) {}
    return out;
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
    finally {
      try { if (w) w.close(); } catch (e1) {}
      try { if (fos) fos.close(); } catch (e2) {}
    }
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
  ToolHubLogger.prototype._writeRaw = function(level, msg, sync) {
    return this.initOk ? FileIO.appendText(this._filePathForToday(), this._line(level, msg), sync === true) : false;
  };
  ToolHubLogger.prototype._write = function(level, msg, sync) {
    return this.enable ? this._writeRaw(level, msg, sync) : false;
  };
  ToolHubLogger.prototype.fatal = function(msg) {
    return this._writeRaw("F", msg, true);
  };
  ToolHubLogger.prototype.major = function(event, fields, sync) {
    var data = { v: 1, event: String(event), sid: String(this.sessionId || ""), seq: Number(this.sessionSeq || 0) + 1 }, k;
    this.sessionSeq = data.seq;
    for (k in (fields || {})) {
      try { if (!fields.hasOwnProperty || fields.hasOwnProperty(k)) data[k] = fields[k]; } catch (e) {}
    }
    return this._writeRaw(
      event === "UNCAUGHT" || event === "RECOVERED_INTERRUPTION" || event === "TEST_INTERRUPTED" ? "F" : "I",
      "TH_MAJOR " + M.kv(data),
      sync === true || event === "UNCAUGHT" || event === "RECOVERED_INTERRUPTION" || event === "TEST_INTERRUPTED"
    );
  };
  ToolHubLogger.prototype.checkpoint = function(phase, fields, sync) {
    this.currentPhase = String(phase || "");
    var d = fields || {};
    d.phase = this.currentPhase;
    return this.major("CHECKPOINT", d, sync);
  };
  ToolHubLogger.prototype.incident = function(type, fields) {
    var d = fields || {};
    d.type = String(type || "unknown");
    if (!d.phase) d.phase = this.currentPhase || "";
    return this.major(type === "UNCAUGHT" ? "UNCAUGHT" : "INCIDENT", d, true);
  };
  ToolHubLogger.prototype.getRecentMajorEvents = function(limit) {
    var n = Math.floor(Number(limit || 10));
    if (isNaN(n) || n < 1) n = 10;
    if (n > 30) n = 30;
    return M.recentEvents(this, n);
  };
  ToolHubLogger.prototype.beginSession = function(source) {
    if (this.sessionOpen) return false;
    this.sessionOpen = true;
    this.sessionEnded = false;
    this.sessionStartedAt = M.now();
    return this.major("SESSION_BEGIN", {
      source: source || "entry",
      boot: M.boot(),
      pid: android.os.Process.myPid(),
      proc: this.proc.processName || ""
    }, true);
  };
  ToolHubLogger.prototype.endSession = function(reason, status) {
    if (this.sessionEnded) return false;
    this.sessionEnded = true;
    this.sessionOpen = false;
    return this.major("SESSION_END", {
      reason: reason || "normal_close",
      status: status || "clean",
      clean: true,
      durationMs: Math.max(0, M.now() - this.sessionStartedAt)
    }, true);
  };
  ToolHubLogger.prototype.recoverPreviousSession = function() {
    try {
      var lines = M.logs(this).split(/\r?\n/), i, start = -1, b = null;
      for (i = lines.length - 1; i >= 0; i--) {
        var f = M.parse(lines[i]);
        if (f.event === "SESSION_BEGIN" && f.sid) {
          start = i;
          b = f;
          break;
        }
      }
      if (start < 0) return null;

      var ended = false, last = b, phase = "SESSION_BEGIN", testState = null;
      for (i = start + 1; i < lines.length; i++) {
        var x = M.parse(lines[i]);
        if (x.sid !== b.sid) continue;
        if (x.event === "SESSION_END") ended = true;
        if (x.event === "CHECKPOINT") {
          last = x;
          phase = x.phase || phase;
        }
        if (x.event === "TEST_BEGIN") {
          testState = {
            test: x.test || "",
            loops: x.loops || "",
            progress: "0",
            lastEvent: "TEST_BEGIN"
          };
          phase = "TEST_BEGIN";
        } else if (x.event === "TEST_PROGRESS" && testState && (!x.test || x.test === testState.test)) {
          testState.progress = x.progress || testState.progress;
          testState.lastEvent = "TEST_PROGRESS";
          phase = "TEST_PROGRESS";
        } else if (x.event === "TEST_END" && testState && (!x.test || x.test === testState.test)) {
          testState = null;
          phase = "TEST_END";
        }
      }
      if (ended) return null;

      var oldPid = Number(b.pid || -1);
      var newPid = Number(android.os.Process.myPid());
      var oldBoot = String(b.boot || "");
      var newBoot = M.boot();
      var same = !!oldBoot && oldBoot === newBoot;
      var kind = oldBoot && newBoot && oldBoot !== newBoot
        ? "device_reboot"
        : (same && String(b.proc || "").indexOf("system_server") >= 0 && oldPid !== newPid
          ? "suspected_system_server_restart"
          : (same && oldPid === newPid
            ? "script_session_interrupted"
            : (same ? "process_restart" : "unknown_interruption")));

      if (testState) {
        this.major("TEST_INTERRUPTED", {
          previousSid: b.sid,
          classification: kind,
          test: testState.test,
          loops: testState.loops,
          progress: testState.progress,
          lastEvent: testState.lastEvent,
          oldPid: oldPid,
          newPid: newPid,
          sameBoot: same
        }, true);
      }

      this.major("RECOVERED_INTERRUPTION", {
        previousSid: b.sid,
        classification: kind,
        lastPhase: phase,
        target: last.target || "",
        which: last.which || "",
        route: last.route || "",
        test: testState ? testState.test : "",
        progress: testState ? testState.progress : "",
        oldPid: oldPid,
        newPid: newPid,
        sameBoot: same
      }, true);
      return { classification: kind, lastPhase: phase, test: testState ? testState.test : "" };
    } catch (e) {
      this._writeRaw("W", "major recovery fail err=" + String(e), false);
    }
    return null;
  };

  function fields(app, more) {
    var d = {}, k;
    try {
      d.route = app.state.toolAppRoute || "";
      d.group = app.state.settingsGroupKey || "";
    } catch (e) {}
    for (k in (more || {})) {
      try { if (!more.hasOwnProperty || more.hasOwnProperty(k)) d[k] = more[k]; } catch (e2) {}
    }
    return d;
  }
  function wrap(proto, name, maker) {
    try {
      var old = proto[name];
      if (typeof old !== "function" || old.__majorWrapped) return;
      var n = maker(old);
      n.__majorWrapped = true;
      proto[name] = n;
    } catch (e) {}
  }
  function testFields(app, testName, loops, progress, extra) {
    var d = fields(app, {
      test: testName,
      loops: loops,
      progress: progress
    });
    var k;
    for (k in (extra || {})) {
      try { if (!extra.hasOwnProperty || extra.hasOwnProperty(k)) d[k] = extra[k]; } catch (e) {}
    }
    return d;
  }
  function wrapTest(proto, methodName, testName, defaultLoops) {
    wrap(proto, methodName, function(old) {
      return function(iterations) {
        var loops = parseInt(String(iterations), 10);
        if (isNaN(loops) || loops <= 0) loops = defaultLoops;
        var startedAt = M.now();
        var previousPhase = this.L ? String(this.L.currentPhase || "") : "";
        if (this.L) {
          this.L.currentPhase = "TEST_BEGIN";
          this.L.major("TEST_BEGIN", testFields(this, testName, loops, 0), true);
          this.L.currentPhase = "TEST_PROGRESS";
          this.L.major("TEST_PROGRESS", testFields(this, testName, loops, 0, { stage: "running" }), false);
        }
        try {
          var result = old.apply(this, arguments);
          var ok = !!(result && result.ok);
          var durationMs = result && result.durationMs !== undefined
            ? Number(result.durationMs || 0)
            : Math.max(0, M.now() - startedAt);
          if (this.L) {
            this.L.currentPhase = "TEST_PROGRESS";
            this.L.major("TEST_PROGRESS", testFields(this, testName, loops, 100, {
              stage: "completed",
              durationMs: durationMs
            }), false);
            this.L.currentPhase = "TEST_END";
            this.L.major("TEST_END", testFields(this, testName, loops, 100, {
              status: ok ? "passed" : "failed",
              durationMs: durationMs,
              error: result && result.error ? String(result.error) : ""
            }), true);
            if (!ok) {
              this.L.incident("TEST_FAILED", testFields(this, testName, loops, 100, {
                durationMs: durationMs,
                error: result && result.error ? String(result.error) : "unknown"
              }));
            }
            this.L.currentPhase = previousPhase;
          }
          return result;
        } catch (e) {
          if (this.L) {
            this.L.currentPhase = "TEST_END";
            this.L.major("TEST_END", testFields(this, testName, loops, 0, {
              status: "exception",
              durationMs: Math.max(0, M.now() - startedAt),
              error: String(e)
            }), true);
            this.L.incident("TEST_FAILED", testFields(this, testName, loops, 0, {
              error: String(e)
            }));
            this.L.currentPhase = previousPhase;
          }
          throw e;
        }
      };
    });
  }
  function eventLabel(event) {
    var e = String(event || "");
    if (e === "RECOVERED_INTERRUPTION") return "恢复异常中断";
    if (e === "TEST_INTERRUPTED") return "测试异常中断";
    if (e === "TEST_BEGIN") return "测试开始";
    if (e === "TEST_PROGRESS") return "测试进度";
    if (e === "TEST_END") return "测试结束";
    if (e === "INCIDENT") return "异常事件";
    if (e === "UNCAUGHT") return "未捕获异常";
    if (e === "SESSION_BEGIN") return "会话开始";
    if (e === "SESSION_END") return "会话结束";
    if (e === "CHECKPOINT") return "检查点";
    return e || "事件";
  }
  function formatEvent(item) {
    var parts = [];
    parts.push(String(item.time || "").substring(5));
    parts.push(eventLabel(item.event));
    if (item.test) parts.push("测试=" + String(item.test));
    if (item.progress !== undefined && item.progress !== "") parts.push("进度=" + String(item.progress) + "%");
    if (item.status) parts.push("状态=" + String(item.status));
    if (item.classification) parts.push("分类=" + String(item.classification));
    if (item.phase) parts.push("阶段=" + String(item.phase));
    if (item.lastPhase) parts.push("最后阶段=" + String(item.lastPhase));
    if (item.which) parts.push("面板=" + String(item.which));
    if (item.target) parts.push("目标=" + String(item.target));
    if (item.error) parts.push("错误=" + String(item.error));
    return parts.join(" · ");
  }
  function patchRuntime() {
    if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM.prototype) return;
    var p = FloatBallAppWM.prototype;

    if (typeof p.getRecentMajorEventSummary !== "function") {
      p.getRecentMajorEventSummary = function(limit) {
        try {
          var list = this.L && this.L.getRecentMajorEvents ? this.L.getRecentMajorEvents(limit || 8) : [];
          if (!list || !list.length) return "暂无重大事件记录";
          var lines = [];
          for (var i = 0; i < list.length; i++) lines.push(formatEvent(list[i]));
          return lines.join("\n");
        } catch (e) {
          return "读取重大事件失败：" + String(e);
        }
      };
    }
    if (typeof p.copyRecentMajorEventSummary !== "function") {
      p.copyRecentMajorEventSummary = function() {
        try {
          var text = this.getRecentMajorEventSummary ? this.getRecentMajorEventSummary(12) : "";
          if (!text) return false;
          var clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE);
          if (!clipboard) throw "clipboard service unavailable";
          clipboard.setPrimaryClip(android.content.ClipData.newPlainText("ToolHub 最近重大事件", text));
          try { this.toast("最近重大事件已复制"); } catch (eToast) {}
          return true;
        } catch (e) {
          safeLog(this.L, "e", "copy recent major events fail error=" + String(e));
          try { this.toast("复制最近重大事件失败"); } catch (eToast2) {}
        }
        return false;
      };
    }

    wrap(p, "createBallViews", function(old) {
      return function() {
        if (this.L) this.L.checkpoint("BALL_VIEW_BUILD_BEGIN", fields(this), false);
        var r = old.apply(this, arguments);
        if (this.L) this.L.checkpoint("BALL_VIEW_BUILD_DONE", fields(this), false);
        return r;
      };
    });
    wrap(p, "createBallLayoutParams", function(old) {
      return function() {
        if (this.L) this.L.checkpoint("BALL_LP_BUILD_BEGIN", fields(this), false);
        var r = old.apply(this, arguments);
        if (this.L) this.L.checkpoint("WM_ADD_BEGIN", fields(this, { target: "ball" }), true);
        return r;
      };
    });
    wrap(p, "setupDisplayMonitor", function(old) {
      return function() {
        if (this.L) this.L.checkpoint("WM_ADD_DONE", fields(this, { target: "ball" }), false);
        return old.apply(this, arguments);
      };
    });
    wrap(p, "startAsync", function(old) {
      return function() {
        if (this.L) this.L.checkpoint("START_ASYNC_BEGIN", fields(this), true);
        var r = old.apply(this, arguments);
        if (this.L) {
          if (r && r.ok) {
            this.L.checkpoint("SESSION_READY", fields(this), true);
          } else {
            this.L.checkpoint("WM_ADD_FAIL", fields(this, {
              target: "ball",
              error: r && r.err || "unknown"
            }), true);
            this.L.incident("START_FAILED", fields(this, {
              error: r && r.err || "unknown"
            }));
            this.L.endSession("start_failed", "failed");
          }
        }
        return r;
      };
    });
    wrap(p, "buildPanelView", function(old) {
      return function(type) {
        if (this.L) this.L.checkpoint("PANEL_BUILD_BEGIN", fields(this, { which: type }), false);
        try {
          var r = old.apply(this, arguments);
          if (this.L) this.L.checkpoint("PANEL_BUILD_DONE", fields(this, { which: type }), false);
          return r;
        } catch (e) {
          if (this.L) this.L.incident("PANEL_BUILD_FAIL", fields(this, {
            which: type,
            error: String(e)
          }));
          throw e;
        }
      };
    });
    wrap(p, "addPanel", function(old) {
      return function(view, x, y, which) {
        if (this.L) this.L.checkpoint("WM_ADD_BEGIN", fields(this, {
          target: "panel",
          which: which,
          x: x,
          y: y
        }), true);
        var r = old.apply(this, arguments), ok = false;
        try {
          ok = which === "main"
            ? this.state.panel === view && this.state.addedPanel
            : (which === "settings"
              ? this.state.settingsPanel === view && this.state.addedSettings
              : this.state.viewerPanel === view && this.state.addedViewer);
        } catch (e) {}
        if (this.L) {
          this.L.checkpoint(ok ? "WM_ADD_DONE" : "WM_ADD_FAIL", fields(this, {
            target: "panel",
            which: which
          }), !ok);
        }
        return r;
      };
    });
    wrap(p, "safeRemoveView", function(old) {
      return function(view, name, opts) {
        var target = String(name || "view");
        var sync = target === "ballRoot" ||
          target === "panel" ||
          target.indexOf("settings") >= 0 ||
          target.indexOf("pointer") >= 0 ||
          target.indexOf("capture") >= 0;
        if (this.L) this.L.checkpoint("WM_REMOVE_BEGIN", fields(this, {
          target: target,
          immediate: !!(opts && opts.immediate)
        }), sync);
        var r = old.apply(this, arguments);
        var phase = r && r.ok === false
          ? "WM_REMOVE_FAIL"
          : (r && r.fallbackRemove ? "WM_REMOVE_FALLBACK" : "WM_REMOVE_DONE");
        if (this.L) {
          this.L.checkpoint(phase, fields(this, {
            target: target,
            error: r && (r.err || r.firstErr) || ""
          }), phase === "WM_REMOVE_FAIL");
        }
        return r;
      };
    });
    wrap(p, "close", function(old) {
      return function(reason) {
        if ((this.state && this.state.closed === true) || (this.L && this.L.sessionEnded === true)) {
          return old.apply(this, arguments);
        }
        var why = String(reason || "");
        if (!why) {
          try {
            why = typeof __toolHubRestartRunning !== "undefined" && __toolHubRestartRunning
              ? "planned_reload"
              : "normal_close";
          } catch (e) {
            why = "normal_close";
          }
        }
        if (this.L) this.L.checkpoint("SESSION_CLOSE_BEGIN", fields(this, { reason: why }), true);
        try {
          var r = old.apply(this, arguments);
          if (this.L && this.state && this.state.closed) this.L.endSession(why, "clean");
          return r;
        } catch (e2) {
          if (this.L) this.L.incident("CLOSE_FAILED", fields(this, {
            reason: why,
            error: String(e2)
          }));
          throw e2;
        }
      };
    });

    wrapTest(p, "runColorSafetyRuntimeSelfTest", "color_safety", 160);
    wrapTest(p, "runSettingsInteractionStressTest", "settings_interaction", 120);

    wrap(p, "createColorSafetyRuntimeDiagnosticCard", function(old) {
      return function() {
        var card = old.apply(this, arguments);
        try {
          var self = this;
          var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
          var C = this.ui && this.ui.colors ? this.ui.colors : null;
          var title = new android.widget.TextView(context);
          title.setText("最近重大事件");
          toolhubSafeSetTextColor(title, T && T.onSurface ? T.onSurface : (C ? C.textPriLight : android.graphics.Color.DKGRAY));
          title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
          title.setTypeface(null, android.graphics.Typeface.BOLD);
          title.setPadding(0, this.dp(14), 0, this.dp(4));
          card.addView(title, new android.widget.LinearLayout.LayoutParams(-1, -2));

          var summary = new android.widget.TextView(context);
          summary.setText(this.getRecentMajorEventSummary ? this.getRecentMajorEventSummary(8) : "暂无重大事件记录");
          toolhubSafeSetTextColor(summary, T && T.onSurface2 ? T.onSurface2 : (C ? C.textSecLight : android.graphics.Color.GRAY));
          summary.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
          try { summary.setLineSpacing(this.dp(2), 1.0); } catch (eSpace) {}
          try { summary.setTextIsSelectable(false); } catch (eSelect) {}
          card.addView(summary, new android.widget.LinearLayout.LayoutParams(-1, -2));

          var bg = T && T.primaryContainer ? T.primaryContainer : (T && T.surface2 ? T.surface2 : android.graphics.Color.LTGRAY);
          var fg = T && T.primary ? T.primary : android.graphics.Color.DKGRAY;
          var copyButton = this.ui.createSolidButton(this, "复制最近重大事件", bg, fg, function() {
            self.copyRecentMajorEventSummary();
          });
          var copyLp = new android.widget.LinearLayout.LayoutParams(-1, this.dp(46));
          copyLp.setMargins(0, this.dp(8), 0, 0);
          card.addView(copyButton, copyLp);
        } catch (eCard) {
          safeLog(this.L, "w", "append recent major events card fail error=" + String(eCard));
        }
        return card;
      };
    });
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
    this.sessionSeq = 0;
    this.currentPhase = "";
    this.sessionOpen = false;
    this.sessionEnded = false;
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
      TOOLHUB_ACTIVE_LOGGER = logger;
      TOOLHUB_CRASH_BRIDGE.logger = logger;
      if (TOOLHUB_CRASH_BRIDGE.installed && TOOLHUB_CRASH_BRIDGE.handler) return true;
      TOOLHUB_CRASH_BRIDGE.original = java.lang.Thread.getDefaultUncaughtExceptionHandler();
      TOOLHUB_CRASH_BRIDGE.handler = new JavaAdapter(java.lang.Thread.UncaughtExceptionHandler, {
        uncaughtException: function(t, e) {
          if (TOOLHUB_CRASH_BRIDGE.handling) {
            try {
              if (TOOLHUB_CRASH_BRIDGE.original) TOOLHUB_CRASH_BRIDGE.original.uncaughtException(t, e);
            } catch (e0) {}
            return;
          }
          TOOLHUB_CRASH_BRIDGE.handling = true;
          try {
            var L = TOOLHUB_CRASH_BRIDGE.logger || TOOLHUB_ACTIVE_LOGGER;
            var tn = "", cn = "", msg = "";
            try { tn = t ? t.getName() : ""; } catch (e1) {}
            try { cn = e && e.getClass ? e.getClass().getName() : ""; } catch (e2) {}
            try { msg = String(e || ""); } catch (e3) {}
            if (L) {
              L.incident("UNCAUGHT", {
                thread: tn,
                exception: cn,
                message: M.clean(msg, 2048),
                phase: L.currentPhase || ""
              });
            }
            if (L && String(cn).indexOf("OutOfMemoryError") < 0) {
              try {
                var sw = new java.io.StringWriter();
                var pw = new java.io.PrintWriter(sw);
                e.printStackTrace(pw);
                pw.flush();
                L.fatal("STACKTRACE " + M.clean(sw.toString(), 8192));
              } catch (e4) {}
            }
          } catch (e5) {}
          try {
            if (TOOLHUB_CRASH_BRIDGE.original) TOOLHUB_CRASH_BRIDGE.original.uncaughtException(t, e);
          } catch (e6) {}
          TOOLHUB_CRASH_BRIDGE.handling = false;
        }
      });
      java.lang.Thread.setDefaultUncaughtExceptionHandler(TOOLHUB_CRASH_BRIDGE.handler);
      TOOLHUB_CRASH_BRIDGE.installed = true;
      return true;
    } catch (e) {
      return false;
    }
  };
})();

/* =======================
   下面开始：WM 动画、面板、触摸、启动、输出
   ======================= */
