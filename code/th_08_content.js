// @version 1.0.9
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
    if (n > 80) n = 80;
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
  function majorSeverityOf(item) {
    var event = String(item && item.event || "");
    var phase = String(item && (item.phase || item.lastPhase) || "");
    var status = String(item && item.status || "").toLowerCase();
    if (event === "UNCAUGHT" || event === "RECOVERED_INTERRUPTION" || event === "TEST_INTERRUPTED") return "fatal";
    if (event === "INCIDENT") return "error";
    if (event === "TEST_END" && status && status !== "passed") return "error";
    if (event === "SESSION_END" && status && status !== "clean") return "error";
    if (event === "CHECKPOINT" && (phase.indexOf("_FAIL") >= 0 || phase === "PANEL_BUILD_FAIL")) return "error";
    return "info";
  }
  function majorSeverityLabel(level) {
    if (level === "fatal") return "[严重]";
    if (level === "error") return "[异常]";
    return "[信息]";
  }
  function isMajorAbnormalEvent(item) {
    return majorSeverityOf(item) !== "info";
  }
  function formatSeverityEvent(item) {
    return majorSeverityLabel(majorSeverityOf(item)) + " " + formatEvent(item);
  }
  function majorFaultSessionKey(item) {
    var root = String(item && (item.previousSid || item.sid) || "");
    if (root) return "session:" + root;
    return "fallback:" + [
      String(item && item.classification || ""),
      String(item && item.test || ""),
      String(item && (item.phase || item.lastPhase) || ""),
      String(item && item.target || ""),
      String(item && item.which || "")
    ].join(":");
  }
  function majorFaultDuplicateKey(item) {
    return [
      String(item && item.event || ""),
      String(item && item.type || ""),
      String(item && (item.phase || item.lastPhase) || ""),
      String(item && item.classification || ""),
      String(item && item.test || ""),
      String(item && item.target || ""),
      String(item && item.which || ""),
      String(item && item.status || ""),
      String(item && item.error || "")
    ].join("|");
  }
  function majorFaultPriority(item) {
    var severity = majorSeverityOf(item);
    var base = severity === "fatal" ? 300 : (severity === "error" ? 200 : 100);
    var event = String(item && item.event || "");
    if (event === "UNCAUGHT") return base + 60;
    if (event === "TEST_INTERRUPTED") return base + 50;
    if (event === "RECOVERED_INTERRUPTION") return base + 40;
    if (event === "INCIDENT") return base + 30;
    if (event === "TEST_END") return base + 20;
    if (event === "CHECKPOINT") return base + 10;
    return base;
  }
  function majorFaultEvidenceLabel(item) {
    var label = eventLabel(item && item.event);
    var phase = String(item && (item.phase || item.lastPhase) || "");
    var type = String(item && item.type || "");
    if (item && item.event === "CHECKPOINT" && phase) label += "(" + phase + ")";
    else if (item && item.event === "INCIDENT" && type) label += "(" + type + ")";
    return label;
  }
  function aggregateMajorAbnormalEvents(list, limit) {
    var groups = [], byKey = {};
    var n = Math.floor(Number(limit || 8));
    if (isNaN(n) || n < 1) n = 8;
    if (n > 12) n = 12;
    var i;
    for (i = 0; i < list.length; i++) {
      var item = list[i];
      if (!isMajorAbnormalEvent(item)) continue;
      var key = majorFaultSessionKey(item);
      var group = byKey[key];
      if (!group) {
        group = {
          key: key,
          firstTime: item.time || "",
          lastTime: item.time || "",
          severity: majorSeverityOf(item),
          representative: item,
          priority: majorFaultPriority(item),
          count: 0,
          duplicateCount: 0,
          evidence: [],
          fingerprints: {},
          events: [],
          boot: "",
          oldPid: "",
          newPid: "",
          sameBoot: "",
          classification: ""
        };
        byKey[key] = group;
        groups.push(group);
      }
      group.count++;
      group.lastTime = item.time || group.lastTime;
      var priority = majorFaultPriority(item);
      if (priority > group.priority) {
        group.priority = priority;
        group.severity = majorSeverityOf(item);
        group.representative = item;
      }
      var fingerprint = majorFaultDuplicateKey(item);
      if (group.fingerprints[fingerprint]) {
        group.duplicateCount++;
      } else {
        group.fingerprints[fingerprint] = true;
        if (group.evidence.length < 6) group.evidence.push(majorFaultEvidenceLabel(item));
      }
    }
    for (i = 0; i < list.length; i++) {
      var rawItem = list[i];
      var rawGroup = byKey[majorFaultSessionKey(rawItem)];
      if (!rawGroup) continue;
      rawGroup.events.push(rawItem);
      if (!rawGroup.boot && rawItem.boot) rawGroup.boot = String(rawItem.boot);
      if (rawItem.oldPid !== undefined && rawItem.oldPid !== "") rawGroup.oldPid = rawItem.oldPid;
      if (rawItem.newPid !== undefined && rawItem.newPid !== "") rawGroup.newPid = rawItem.newPid;
      if (rawItem.sameBoot !== undefined && rawItem.sameBoot !== "") rawGroup.sameBoot = rawItem.sameBoot;
      if (!rawGroup.classification && rawItem.classification) rawGroup.classification = String(rawItem.classification);
      if (!rawGroup.firstTime && rawItem.time) rawGroup.firstTime = rawItem.time;
      if (rawItem.time) rawGroup.lastTime = rawItem.time;
    }
    if (groups.length > n) groups = groups.slice(groups.length - n);
    return groups;
  }
  function formatMajorFaultGroup(group) {
    var item = group && group.representative ? group.representative : {};
    var parts = [];
    parts.push(String(group && group.lastTime || item.time || "").substring(5));
    parts.push("故障会话");
    if (item.classification || group.classification) parts.push("分类=" + String(item.classification || group.classification));
    if (item.test) parts.push("测试=" + String(item.test));
    if (item.lastPhase || item.phase) parts.push("最后阶段=" + String(item.lastPhase || item.phase));
    if (item.which) parts.push("面板=" + String(item.which));
    if (item.target) parts.push("目标=" + String(item.target));
    if (group && group.evidence && group.evidence.length) parts.push("证据=" + group.evidence.join(" > "));
    if (group && group.count > 1) parts.push("事件=" + String(group.count));
    if (group && group.duplicateCount > 0) parts.push("重复折叠=" + String(group.duplicateCount));
    return majorSeverityLabel(group && group.severity || majorSeverityOf(item)) + " " + parts.join(" · ");
  }
  function majorFaultBootLabel(value) {
    var s = String(value === undefined || value === null ? "" : value).toLowerCase();
    if (s === "true" || s === "1") return "同一 Boot ID（设备未完整重启）";
    if (s === "false" || s === "0") return "Boot ID 已变化（设备发生重启）";
    return "Boot ID 判断未知";
  }
  function formatMajorFaultEventDetail(item, index) {
    var parts = [];
    parts.push("#" + String(index + 1));
    parts.push(String(item && item.time || ""));
    parts.push(majorSeverityLabel(majorSeverityOf(item)) + " " + eventLabel(item && item.event));
    if (item && item.seq !== undefined && item.seq !== "") parts.push("seq=" + String(item.seq));
    if (item && item.type) parts.push("type=" + String(item.type));
    if (item && item.classification) parts.push("分类=" + String(item.classification));
    if (item && item.status) parts.push("状态=" + String(item.status));
    if (item && item.phase) parts.push("阶段=" + String(item.phase));
    if (item && item.lastPhase) parts.push("最后阶段=" + String(item.lastPhase));
    if (item && item.test) parts.push("测试=" + String(item.test));
    if (item && item.progress !== undefined && item.progress !== "") parts.push("进度=" + String(item.progress) + "%");
    if (item && item.loops !== undefined && item.loops !== "") parts.push("循环=" + String(item.loops));
    if (item && item.target) parts.push("目标=" + String(item.target));
    if (item && item.which) parts.push("面板=" + String(item.which));
    if (item && item.route) parts.push("页面=" + String(item.route));
    if (item && item.oldPid !== undefined && item.oldPid !== "") parts.push("旧PID=" + String(item.oldPid));
    if (item && item.newPid !== undefined && item.newPid !== "") parts.push("新PID=" + String(item.newPid));
    if (item && item.sameBoot !== undefined && item.sameBoot !== "") parts.push("Boot判断=" + majorFaultBootLabel(item.sameBoot));
    if (item && item.boot) parts.push("BootID=" + String(item.boot));
    if (item && item.durationMs !== undefined && item.durationMs !== "") parts.push("耗时=" + String(item.durationMs) + "ms");
    if (item && item.error) parts.push("错误=" + String(item.error));
    if (item && item.message) parts.push("消息=" + String(item.message));
    if (item && item.exception) parts.push("异常=" + String(item.exception));
    if (item && item.thread) parts.push("线程=" + String(item.thread));
    return parts.join(" · ");
  }
  function formatMajorFaultGroupDetail(group) {
    var item = group && group.representative ? group.representative : {};
    var events = group && group.events ? group.events : [];
    var lines = [];
    var sessionKey = String(group && group.key || "");
    if (sessionKey.indexOf("session:") === 0) sessionKey = sessionKey.substring(8);
    var oldPid = group && group.oldPid !== "" ? group.oldPid : item.oldPid;
    var newPid = group && group.newPid !== "" ? group.newPid : item.newPid;
    var sameBoot = group && group.sameBoot !== "" ? group.sameBoot : item.sameBoot;
    lines.push("故障会话详情");
    lines.push("");
    lines.push("等级：" + majorSeverityLabel(group && group.severity || majorSeverityOf(item)));
    lines.push("会话：" + (sessionKey || "未知"));
    lines.push("时间：" + String(group && group.firstTime || "") + " → " + String(group && group.lastTime || ""));
    if (group && group.classification || item.classification) lines.push("分类：" + String(group.classification || item.classification));
    if (item.test) lines.push("测试：" + String(item.test));
    if (item.lastPhase || item.phase) lines.push("最后阶段：" + String(item.lastPhase || item.phase));
    if (oldPid !== undefined && oldPid !== "") lines.push("进程：" + String(oldPid) + " → " + String(newPid === undefined || newPid === "" ? "未知" : newPid));
    lines.push("Boot 判断：" + majorFaultBootLabel(sameBoot));
    if (group && group.boot) lines.push("上次 Boot ID：" + String(group.boot));
    lines.push("异常事件：" + String(group && group.count || 0));
    lines.push("原始事件：" + String(events.length));
    lines.push("重复折叠：" + String(group && group.duplicateCount || 0));
    if (group && group.evidence && group.evidence.length) lines.push("证据链：" + group.evidence.join(" > "));
    lines.push("");
    lines.push("完整事件顺序");
    lines.push("----------------");
    if (!events.length) {
      lines.push("没有可用的原始事件记录");
    } else {
      for (var i = 0; i < events.length; i++) lines.push(formatMajorFaultEventDetail(events[i], i));
    }
    lines.push("");
    lines.push("来源：ToolHub 每日运行日志（只读解析）");
    return lines.join("\n");
  }
  function makeMajorFaultClickableSpan(app, group, color) {
    return new JavaAdapter(android.text.style.ClickableSpan, {
      onClick: function(widget) {
        try { app.showMajorFaultSessionDetail(group); }
        catch (e) { safeLog(app.L, "e", "show major fault detail click fail error=" + String(e)); }
      },
      updateDrawState: function(ds) {
        try {
          toolhubSafeSetPaintColor(ds, color);
          ds.setUnderlineText(false);
        } catch (e) {}
      }
    });
  }
  function buildMajorFaultClickableSummary(app, groups, color) {
    var builder = new android.text.SpannableStringBuilder();
    for (var i = 0; i < groups.length; i++) {
      var start = builder.length();
      builder.append(formatMajorFaultGroup(groups[i]));
      var end = builder.length();
      try {
        builder.setSpan(
          makeMajorFaultClickableSpan(app, groups[i], color),
          start,
          end,
          android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
        );
      } catch (eSpan) {
        safeLog(app.L, "w", "create major fault clickable span fail error=" + String(eSpan));
      }
      if (i + 1 < groups.length) builder.append("\n");
    }
    if (groups.length) builder.append("\n\n点击任一故障会话查看详情");
    return builder;
  }
  function recentSeverityEvents(app, limit, mode) {
    var n = Math.floor(Number(limit || 8));
    if (isNaN(n) || n < 1) n = 8;
    if (n > 80) n = 80;
    var all = [];
    try { all = app.L && app.L.getRecentMajorEvents ? app.L.getRecentMajorEvents(80) : []; } catch (e) { all = []; }
    var out = [];
    for (var i = 0; i < all.length; i++) {
      if (mode === "abnormal" && !isMajorAbnormalEvent(all[i])) continue;
      out.push(all[i]);
    }
    if (mode !== "abnormal" && out.length > n) out = out.slice(out.length - n);
    return out;
  }
  function severitySummary(app, limit, mode) {
    try {
      if (mode === "abnormal") {
        var groups = aggregateMajorAbnormalEvents(recentSeverityEvents(app, 80, "all"), limit);
        if (!groups.length) return "暂无故障会话；正常会话与成功检查点已折叠";
        var faultLines = [];
        for (var gi = 0; gi < groups.length; gi++) faultLines.push(formatMajorFaultGroup(groups[gi]));
        return faultLines.join("\n");
      }
      var list = recentSeverityEvents(app, limit, mode);
      if (!list.length) return "暂无重大事件记录";
      var lines = [];
      for (var i = 0; i < list.length; i++) lines.push(formatSeverityEvent(list[i]));
      return lines.join("\n");
    } catch (e) {
      return "读取重大事件失败：" + String(e);
    }
  }
  function installMajorSeverityRuntimeCard(proto) {
    if (!proto || proto.__toolHubMajorSeverityPatch === true) return;
    proto.getRecentMajorFaultGroups = function(limit) {
      try { return aggregateMajorAbnormalEvents(recentSeverityEvents(this, 80, "all"), limit || 8); }
      catch (e) { safeLog(this.L, "e", "get major fault groups fail error=" + String(e)); }
      return [];
    };
    proto.getMajorFaultSessionDetail = function(group) {
      try { return formatMajorFaultGroupDetail(group); }
      catch (e) { return "读取故障会话详情失败：" + String(e); }
    };
    proto.showMajorFaultSessionDetail = function(group) {
      try {
        if (!group) return false;
        var self = this;
        var detail = this.getMajorFaultSessionDetail(group);
        try { if (this.hideViewerPanel) this.hideViewerPanel(); } catch (eHide) {}
        var panel = this.buildViewerPanelView("故障会话详情", detail);
        var wrapped = null;
        if (this.wrapDraggablePanel) {
          wrapped = this.wrapDraggablePanel(panel, "故障会话详情", function() { self.hideViewerPanel(); });
          if (wrapped && wrapped.view) panel = wrapped.view;
        }
        var sw = Math.max(this.dp(320), Number(this.state && this.state.screen && this.state.screen.w || 0));
        var sh = Math.max(this.dp(480), Number(this.state && this.state.screen && this.state.screen.h || 0));
        var maxW = Math.max(this.dp(300), Math.floor(sw * 0.92));
        var maxH = Math.max(this.dp(320), Math.floor(sh * 0.80));
        panel.measure(
          android.view.View.MeasureSpec.makeMeasureSpec(maxW, android.view.View.MeasureSpec.AT_MOST),
          android.view.View.MeasureSpec.makeMeasureSpec(maxH, android.view.View.MeasureSpec.AT_MOST)
        );
        var pw = Math.max(this.dp(300), Math.min(maxW, Number(panel.getMeasuredWidth() || maxW)));
        var ph = Math.max(this.dp(320), Math.min(maxH, Number(panel.getMeasuredHeight() || maxH)));
        var lp = panel.getLayoutParams();
        if (!lp) lp = new android.view.ViewGroup.LayoutParams(pw, ph);
        else { lp.width = pw; lp.height = ph; }
        panel.setLayoutParams(lp);
        var pos = { x: Math.max(0, Math.floor((sw - pw) / 2)), y: Math.max(0, Math.floor((sh - ph) / 2)) };
        try {
          if (this.state && this.state.ballLp && this.getDockInfo && this.getBestPanelPosition) {
            var dock = this.getDockInfo();
            pos = this.getBestPanelPosition(pw, ph, this.state.ballLp.x, this.state.ballLp.y, dock.ballSize);
          }
        } catch (ePos) {}
        this.addPanel(panel, pos.x, pos.y, "major_fault_detail");
        if (wrapped && this.attachDragResizeListeners) {
          this.attachDragResizeListeners(panel, wrapped.header, wrapped.handles, "major_fault_detail");
        }
        try { this.touchActivity(); } catch (eTouch) {}
        return !!(this.state && this.state.addedViewer && this.state.viewerPanel === panel);
      } catch (e) {
        safeLog(this.L, "e", "show major fault session detail fail error=" + String(e));
        try { this.toast("故障会话详情显示失败"); } catch (eToast) {}
      }
      return false;
    };
    proto.getRecentAbnormalEventSummary = function(limit) {
      return severitySummary(this, limit || 8, "abnormal");
    };
    proto.getRecentMajorEventDetailSummary = function(limit) {
      return severitySummary(this, limit || 16, "all");
    };
    proto.copyCurrentMajorEventSummary = function(mode) {
      try {
        var normalized = String(mode || "abnormal") === "all" ? "all" : "abnormal";
        var text = normalized === "all"
          ? this.getRecentMajorEventDetailSummary(20)
          : this.getRecentAbnormalEventSummary(12);
        if (!text) return false;
        var clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE);
        if (!clipboard) throw "clipboard service unavailable";
        clipboard.setPrimaryClip(android.content.ClipData.newPlainText(
          normalized === "all" ? "ToolHub 全部重大事件" : "ToolHub 故障会话摘要",
          text
        ));
        try { this.toast(normalized === "all" ? "全部重大事件已复制" : "故障会话摘要已复制"); } catch (eToast) {}
        return true;
      } catch (e) {
        safeLog(this.L, "e", "copy severity major events fail error=" + String(e));
        try { this.toast("复制重大事件失败"); } catch (eToast2) {}
      }
      return false;
    };

    var oldCard = proto.createColorSafetyRuntimeDiagnosticCard;
    if (typeof oldCard === "function" && oldCard.__majorSeverityWrapped !== true) {
      var severityCard = function() {
        var card = oldCard.apply(this, arguments);
        try {
          var self = this;
          var title = null, summary = null, copyButton = null;
          var count = card && card.getChildCount ? card.getChildCount() : 0;
          for (var i = 0; i < count; i++) {
            var child = card.getChildAt(i);
            var childText = "";
            try { if (child && child.getText) childText = String(child.getText() || ""); } catch (eText) {}
            if (childText === "最近重大事件") {
              title = child;
              if (i + 1 < count) summary = card.getChildAt(i + 1);
              if (i + 2 < count) copyButton = card.getChildAt(i + 2);
              break;
            }
          }
          if (!title || !summary) return card;

          var showAll = false;
          var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
          var C = this.ui && this.ui.colors ? this.ui.colors : null;
          var bg = T && T.surface2 ? T.surface2 : (T && T.primaryContainer ? T.primaryContainer : android.graphics.Color.LTGRAY);
          var fg = T && T.onSurface ? T.onSurface : (C ? C.textPriLight : android.graphics.Color.DKGRAY);

          function refreshSeverityView() {
            try {
              title.setText(showAll ? "全部重大事件" : "最近故障会话");
              if (showAll) {
                try { summary.setMovementMethod(null); } catch (eMovementAll) {}
                summary.setText(self.getRecentMajorEventDetailSummary(16));
                try { summary.setContentDescription("全部重大事件"); } catch (eDescAll) {}
              } else {
                var groups = self.getRecentMajorFaultGroups ? self.getRecentMajorFaultGroups(8) : [];
                if (groups && groups.length) {
                  summary.setText(buildMajorFaultClickableSummary(self, groups, fg));
                  try { summary.setMovementMethod(android.text.method.LinkMovementMethod.getInstance()); } catch (eMovement) {}
                  try { summary.setLinksClickable(true); } catch (eLinks) {}
                  try { toolhubSafeSetHighlightColor(summary, android.graphics.Color.TRANSPARENT); } catch (eHighlight) {}
                  try { summary.setContentDescription("最近故障会话，点击任一会话查看详情"); } catch (eDesc) {}
                } else {
                  try { summary.setMovementMethod(null); } catch (eMovementEmpty) {}
                  summary.setText("暂无故障会话；正常会话与成功检查点已折叠");
                  try { summary.setContentDescription("暂无故障会话"); } catch (eDescEmpty) {}
                }
              }
              if (toggleButton) toggleButton.setText(showAll ? "只看异常" : "查看全部事件");
            } catch (eRefresh) {
              safeLog(self.L, "w", "refresh major severity view fail error=" + String(eRefresh));
            }
          }

          if (copyButton && copyButton.setText && copyButton.setOnClickListener) {
            copyButton.setText("复制当前摘要");
            copyButton.setOnClickListener(new android.view.View.OnClickListener({
              onClick: function() { self.copyCurrentMajorEventSummary(showAll ? "all" : "abnormal"); }
            }));
          }

          var toggleButton = this.ui.createSolidButton(this, "查看全部事件", bg, fg, function() {
            showAll = !showAll;
            refreshSeverityView();
          });
          var toggleLp = new android.widget.LinearLayout.LayoutParams(-1, this.dp(46));
          toggleLp.setMargins(0, this.dp(8), 0, 0);
          card.addView(toggleButton, toggleLp);
          refreshSeverityView();
        } catch (eCard) {
          safeLog(this.L, "w", "install major severity card fail error=" + String(eCard));
        }
        return card;
      };
      severityCard.__majorSeverityWrapped = true;
      proto.createColorSafetyRuntimeDiagnosticCard = severityCard;
    }
    proto.__toolHubMajorSeverityPatch = true;
  }

  function patchRuntime() {
    if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM.prototype) return;
    var p = FloatBallAppWM.prototype;

    if (typeof p.buildToolHubChannelHealthReport !== "function") {
      p.buildToolHubChannelHealthReport = function() {
        var result = {
          schemaVersion: 1,
          completedAt: Number(java.lang.System.currentTimeMillis()),
          status: "error",
          channel: "stable",
          branch: "",
          rootDir: "",
          databasePath: "",
          trustedVersion: 0,
          installedVersion: 0,
          moduleCount: 0,
          errorCount: 0,
          warningCount: 0,
          checks: [],
          text: ""
        };
        function textValue(value) {
          try { return String(value === undefined || value === null ? "" : value); } catch (e) { return ""; }
        }
        function numberValue(value) {
          var n = Number(value || 0);
          return isNaN(n) ? 0 : n;
        }
        function addCheck(code, title, ok, severity, actual, expected) {
          var item = {
            code: textValue(code),
            title: textValue(title),
            ok: ok === true,
            severity: textValue(severity || "warning"),
            actual: textValue(actual),
            expected: textValue(expected)
          };
          result.checks.push(item);
          if (!item.ok) {
            if (item.severity === "error") result.errorCount++;
            else result.warningCount++;
          }
        }
        try {
          var channel = "stable";
          try { channel = normalizeToolHubUpdateChannel(TOOLHUB_UPDATE_CHANNEL); } catch (eChannel) {}
          var spec = null;
          try { spec = getToolHubChannelSpec(channel); } catch (eSpec) {}
          var expectedBranch = spec ? textValue(spec.branch) : (channel === "beta" ? "beta" : "main");
          var expectedRootName = spec ? textValue(spec.rootName) : (channel === "beta" ? "ToolHub-Beta" : "ToolHub");
          var expectedSuffix = "/" + expectedRootName;
          var branch = "";
          try { branch = textValue(TOOLHUB_UPDATE_BRANCH); } catch (eBranch) {}
          var rootDir = "";
          try { rootDir = textValue(getToolHubRootDir()).replace(/\/+$/g, ""); } catch (eRoot) {}
          var appRoot = "";
          try { appRoot = textValue(APP_ROOT_DIR).replace(/\/+$/g, ""); } catch (eAppRoot) {}
          var channelState = null;
          try { channelState = typeof readToolHubChannelState === "function" ? readToolHubChannelState() : TOOLHUB_CHANNEL_STATE; } catch (eState) { channelState = null; }
          var updateState = null;
          try { updateState = typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE ? TOOLHUB_UPDATE_STATE : null; } catch (eUpdateState) { updateState = null; }
          var trustedVersion = 0;
          try { trustedVersion = typeof getTrustedManifestVersionNumber === "function" ? numberValue(getTrustedManifestVersionNumber()) : numberValue(__trustedManifest && __trustedManifest.version); } catch (eTrusted) {}
          var installedVersion = 0;
          try {
            var installed = typeof readInstalledManifest === "function" ? readInstalledManifest() : null;
            installedVersion = numberValue(installed && installed.version);
          } catch (eInstalled) {}
          var moduleCount = 0;
          try { moduleCount = modules && modules.length !== undefined ? numberValue(modules.length) : 0; } catch (eModules) {}
          var loadErrorCount = 0;
          try { loadErrorCount = loadErrors && loadErrors.length !== undefined ? numberValue(loadErrors.length) : 0; } catch (eLoadErrors) {}
          var storageInfo = null;
          try { storageInfo = ConfigManager && ConfigManager.getStorageInfo ? ConfigManager.getStorageInfo() : null; } catch (eStorage) { storageInfo = null; }
          var dbPath = storageInfo ? textValue(storageInfo.databasePath) : (rootDir ? rootDir + "/toolhub.db" : "");

          result.channel = channel;
          result.branch = branch;
          result.rootDir = rootDir;
          result.databasePath = dbPath;
          result.trustedVersion = trustedVersion;
          result.installedVersion = installedVersion;
          result.moduleCount = moduleCount;

          addCheck("channel", "活动通道有效", channel === "stable" || channel === "beta", "error", channel, "stable 或 beta");
          addCheck("branch", "更新分支匹配通道", branch === expectedBranch, "error", branch, expectedBranch);
          addCheck("root", "运行根目录匹配通道", !!rootDir && rootDir.lastIndexOf(expectedSuffix) === rootDir.length - expectedSuffix.length, "error", rootDir, "*" + expectedSuffix);
          addCheck("app_root", "模块根目录与入口一致", !!appRoot && appRoot === rootDir, "error", appRoot, rootDir);
          addCheck("state_active", "启动状态活动通道一致", !!channelState && textValue(channelState.activeChannel) === channel, "error", channelState ? textValue(channelState.activeChannel) : "", channel);
          addCheck("state_pending", "不存在未完成切换", !channelState || !textValue(channelState.pendingChannel), "error", channelState ? textValue(channelState.pendingChannel) : "", "空");
          addCheck("state_good", "最后正常通道一致", !channelState || textValue(channelState.lastGoodChannel) === channel, "error", channelState ? textValue(channelState.lastGoodChannel) : "", channel);
          addCheck("update_channel", "更新状态通道一致", !updateState || textValue(updateState.channel) === channel, "error", updateState ? textValue(updateState.channel) : "", channel);
          addCheck("update_branch", "更新状态分支一致", !updateState || textValue(updateState.branch) === expectedBranch, "error", updateState ? textValue(updateState.branch) : "", expectedBranch);
          addCheck("update_root", "更新状态根目录一致", !updateState || !textValue(updateState.rootDir) || textValue(updateState.rootDir).replace(/\/+$/g, "") === rootDir, "error", updateState ? textValue(updateState.rootDir) : "", rootDir);
          addCheck("manifest", "可信签名清单已加载", trustedVersion > 0, "warning", trustedVersion, "> 0");
          addCheck("installed", "本地安装清单有效", installedVersion > 0, "warning", installedVersion, "> 0");
          addCheck("modules", "子模块清单非空", moduleCount > 0, "error", moduleCount, "> 0");
          addCheck("load_errors", "子模块无加载错误", loadErrorCount === 0, "error", loadErrorCount, "0");
          addCheck("database_path", "SQLite 路径属于当前通道", !!dbPath && !!rootDir && dbPath.indexOf(rootDir + "/") === 0, "error", dbPath, rootDir + "/toolhub.db");
          addCheck("database_health", "SQLite 当前可用", !storageInfo || storageInfo.databaseHealthy === true, "warning", storageInfo ? textValue(storageInfo.databaseHealthy) : "未知", "true");
          var checkStatus = updateState ? textValue(updateState.channelCheckStatus) : "";
          addCheck("post_switch_check", "最近切换后检查无错误", checkStatus !== "error", "warning", checkStatus || "未执行", "非 error");

          result.status = result.errorCount > 0 ? "error" : (result.warningCount > 0 ? "warning" : "healthy");
          var lines = [];
          lines.push("ToolHub 通道健康报告");
          lines.push("状态：" + (result.status === "healthy" ? "正常" : (result.status === "warning" ? "警告" : "异常")));
          lines.push("时间戳：" + String(result.completedAt));
          lines.push("通道：" + channel + " / " + textValue(spec && spec.label));
          lines.push("分支：" + branch);
          lines.push("根目录：" + rootDir);
          lines.push("数据库：" + dbPath);
          lines.push("可信清单版本：" + String(trustedVersion));
          lines.push("安装清单版本：" + String(installedVersion));
          lines.push("子模块数量：" + String(moduleCount));
          lines.push("异常：" + String(result.errorCount) + "，警告：" + String(result.warningCount));
          lines.push("");
          lines.push("检查项：");
          for (var i = 0; i < result.checks.length; i++) {
            var one = result.checks[i];
            var mark = one.ok ? "PASS" : (one.severity === "error" ? "FAIL" : "WARN");
            var line = "[" + mark + "] " + one.title;
            if (!one.ok) line += "；实际=" + one.actual + "；期望=" + one.expected;
            lines.push(line);
          }
          lines.push("");
          lines.push("说明：报告不包含翻译密钥、按钮内容或其他敏感配置。");
          result.text = lines.join("\n");
        } catch (eReport) {
          result.status = "error";
          result.errorCount++;
          result.text = "ToolHub 通道健康报告\n状态：异常\n错误：" + String(eReport);
        }
        return result;
      };
    }

    if (typeof p.runToolHubChannelHealthCheck !== "function") {
      p.runToolHubChannelHealthCheck = function() {
        var result = this.buildToolHubChannelHealthReport ? this.buildToolHubChannelHealthReport() : null;
        if (!result) return { status: "error", text: "通道健康报告生成失败", errorCount: 1, warningCount: 0 };
        var savePath = "";
        var saved = false;
        try {
          var rootText = String(APP_ROOT_DIR || "").replace(/\/+$/g, "");
          if (rootText) {
            savePath = rootText + "/diagnostics/channel-health-last.txt";
            if (typeof writeTextFile === "function") saved = writeTextFile(savePath, String(result.text || "")) === true;
          }
        } catch (eSave) {
          saved = false;
        }
        result.saved = saved;
        result.savePath = savePath;
        try { if (!this.state) this.state = {}; this.state.toolHubChannelHealthResult = result; } catch (eState) {}
        safeLog(this.L, result.status === "error" ? "e" : (result.status === "warning" ? "w" : "i"), "TH_CHANNEL event=HEALTH_CHECK_DONE status=" + String(result.status) + " channel=" + String(result.channel || "") + " errors=" + String(result.errorCount || 0) + " warnings=" + String(result.warningCount || 0) + " saved=" + String(saved));
        return result;
      };
    }

    if (typeof p.copyToolHubChannelHealthReport !== "function") {
      p.copyToolHubChannelHealthReport = function() {
        try {
          var result = this.state && this.state.toolHubChannelHealthResult ? this.state.toolHubChannelHealthResult : this.runToolHubChannelHealthCheck();
          var text = result && result.text ? String(result.text) : "";
          if (!text) throw "empty channel health report";
          var clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE);
          if (!clipboard) throw "clipboard service unavailable";
          clipboard.setPrimaryClip(android.content.ClipData.newPlainText("ToolHub 通道健康报告", text));
          try { this.toast("通道健康报告已复制"); } catch (eToast) {}
          return true;
        } catch (eCopy) {
          safeLog(this.L, "e", "copy channel health report fail error=" + String(eCopy));
          try { this.toast("复制通道健康报告失败"); } catch (eToast2) {}
        }
        return false;
      };
    }

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


          var healthTitle = new android.widget.TextView(context);
          healthTitle.setText("通道健康自检");
          toolhubSafeSetTextColor(healthTitle, T && T.onSurface ? T.onSurface : (C ? C.textPriLight : android.graphics.Color.DKGRAY));
          healthTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
          healthTitle.setTypeface(null, android.graphics.Typeface.BOLD);
          healthTitle.setPadding(0, this.dp(16), 0, this.dp(4));
          card.addView(healthTitle, new android.widget.LinearLayout.LayoutParams(-1, -2));

          var healthSummary = new android.widget.TextView(context);
          var lastHealth = null;
          try { lastHealth = this.state && this.state.toolHubChannelHealthResult ? this.state.toolHubChannelHealthResult : null; } catch (eLastHealth) {}
          healthSummary.setText(lastHealth ? ("状态：" + String(lastHealth.status || "unknown") + " · 异常 " + String(lastHealth.errorCount || 0) + " · 警告 " + String(lastHealth.warningCount || 0)) : "尚未执行。自检只读取当前运行状态，不联网、不自动修复。");
          toolhubSafeSetTextColor(healthSummary, T && T.onSurface2 ? T.onSurface2 : (C ? C.textSecLight : android.graphics.Color.GRAY));
          healthSummary.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
          try { healthSummary.setLineSpacing(this.dp(2), 1.0); } catch (eHealthSpace) {}
          card.addView(healthSummary, new android.widget.LinearLayout.LayoutParams(-1, -2));

          var healthRunButton = this.ui.createSolidButton(this, "运行通道自检", bg, fg, function() {
            var ret = self.runToolHubChannelHealthCheck ? self.runToolHubChannelHealthCheck() : null;
            if (ret) {
              healthSummary.setText("状态：" + String(ret.status || "unknown") + " · 异常 " + String(ret.errorCount || 0) + " · 警告 " + String(ret.warningCount || 0) + (ret.saved ? "\n已保存：" + String(ret.savePath || "") : "\n报告未保存，可直接复制"));
              try { self.toast(ret.status === "healthy" ? "通道健康自检正常" : (ret.status === "warning" ? "通道健康自检有警告" : "通道健康自检发现异常")); } catch (eHealthToast) {}
            }
          });
          var healthRunLp = new android.widget.LinearLayout.LayoutParams(-1, this.dp(46));
          healthRunLp.setMargins(0, this.dp(8), 0, 0);
          card.addView(healthRunButton, healthRunLp);

          var healthCopyButton = this.ui.createSolidButton(this, "复制通道诊断报告", bg, fg, function() {
            if (self.copyToolHubChannelHealthReport) self.copyToolHubChannelHealthReport();
          });
          var healthCopyLp = new android.widget.LinearLayout.LayoutParams(-1, this.dp(46));
          healthCopyLp.setMargins(0, this.dp(8), 0, 0);
          card.addView(healthCopyButton, healthCopyLp);
        } catch (eCard) {
          safeLog(this.L, "w", "append recent major events card fail error=" + String(eCard));
        }
        return card;
      };
    });
    installMajorSeverityRuntimeCard(p);
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

    var systemServer = false;
    try {
      if (typeof isToolHubSystemServerProcess === "function") {
        systemServer = isToolHubSystemServerProcess(logger) === true;
      } else {
        systemServer = String(logger && logger.proc && logger.proc.processName || "") === "system_server";
      }
    } catch (eProcess) { systemServer = false; }

    if (systemServer) {
      TOOLHUB_CRASH_BRIDGE.original = null;
      TOOLHUB_CRASH_BRIDGE.handler = null;
      TOOLHUB_CRASH_BRIDGE.installed = false;
      TOOLHUB_CRASH_BRIDGE.handling = false;
      try {
        if (typeof logger.i === "function") {
          logger.i("global crash handler skipped in system_server; restart once to clear legacy chain");
        }
      } catch (eSkipLog) {}
      return true;
    }

    if (TOOLHUB_CRASH_BRIDGE.installed && TOOLHUB_CRASH_BRIDGE.handler) return true;
    TOOLHUB_CRASH_BRIDGE.original = java.lang.Thread.getDefaultUncaughtExceptionHandler();
    TOOLHUB_CRASH_BRIDGE.handler = new JavaAdapter(java.lang.Thread.UncaughtExceptionHandler, {
      uncaughtException: function(t, e) {
        if (TOOLHUB_CRASH_BRIDGE.handling) {
          try {
            if (TOOLHUB_CRASH_BRIDGE.original &&
                typeof TOOLHUB_CRASH_BRIDGE.original.uncaughtException === "function") {
              TOOLHUB_CRASH_BRIDGE.original.uncaughtException(t, e);
            }
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
          if (L && typeof L.incident === "function") {
            L.incident("UNCAUGHT", {
              thread: tn,
              exception: cn,
              message: M.clean(msg, 2048),
              phase: L.currentPhase || ""
            });
          }
          if (L && typeof L.fatal === "function" && String(cn).indexOf("OutOfMemoryError") < 0) {
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
          if (TOOLHUB_CRASH_BRIDGE.original &&
              typeof TOOLHUB_CRASH_BRIDGE.original.uncaughtException === "function") {
            TOOLHUB_CRASH_BRIDGE.original.uncaughtException(t, e);
          }
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
