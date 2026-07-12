// @version 1.0.2
// =======================【Content：解析 settings URI】======================
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

// =======================【Content：通用 query】======================
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

// =======================【Content：统一入口】======================
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

/* =======================
   下面开始：WM 动画、面板、触摸、启动、输出
   ======================= */