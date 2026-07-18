// @version 1.1.0
// =======================【拾字截图：查看、保存、分享、删除与自动清理】=======================
// 只处理 ToolHub/screenshots 内部截图；公共保存副本不会被自动清理。
(function() {
  function now22() {
    try { return java.lang.System.currentTimeMillis(); } catch (e0) {}
    return (new Date()).getTime();
  }

  function clamp22(value, min, max) {
    var n = Number(value);
    if (isNaN(n)) n = min;
    if (n < min) n = min;
    if (n > max) n = max;
    return n;
  }

  function int22(value, fallback) {
    var n = Number(value);
    if (isNaN(n)) n = Number(fallback || 0);
    if (isNaN(n)) n = 0;
    return Math.round(n);
  }

  function dp22(value) {
    var density = 1;
    try { density = Number(context.getResources().getDisplayMetrics().density || 1); } catch (e0) { density = 1; }
    return Math.max(1, Math.round(Number(value || 0) * density));
  }

  function safeText22(view, color) {
    try { toolhubSafeSetTextColor(view, Number(color) | 0); } catch (e0) {}
  }

  function safeBg22(view, color) {
    try { toolhubSafeSetBackgroundColor(view, Number(color) | 0); } catch (e0) {}
  }

  function theme22(appObj) {
    var dark = false;
    try { dark = !!(appObj && appObj.isDarkTheme && appObj.isDarkTheme()); } catch (e0) {}
    var out = {
      bg: dark ? (0xFF111318 | 0) : (0xFFF8FAFC | 0),
      card: dark ? (0xFF1C1F26 | 0) : (0xFFFFFFFF | 0),
      text: dark ? (0xFFF1F5F9 | 0) : (0xFF111827 | 0),
      secondary: dark ? (0xFFCBD5E1 | 0) : (0xFF64748B | 0),
      primary: dark ? (0xFFA8C7FA | 0) : (0xFF005BC0 | 0),
      danger: dark ? (0xFFFFB4AB | 0) : (0xFFBA1A1A | 0),
      stroke: dark ? (0x55FFFFFF | 0) : (0x22000000 | 0),
      scrim: (0x99000000 | 0)
    };
    try {
      if (appObj && appObj.getSettingsColorScheme) {
        var s = appObj.getSettingsColorScheme();
        if (s) {
          out.bg = Number(s.surface) | 0;
          out.card = Number(s.surface2 || s.surface) | 0;
          out.text = Number(s.onSurface) | 0;
          out.secondary = Number(s.onSurface2 || s.onSurface) | 0;
          out.primary = Number(s.primary) | 0;
          out.danger = Number(s.danger || out.danger) | 0;
          out.stroke = Number(s.outlineVariant) | 0;
        }
      }
    } catch (e1) {}
    return out;
  }

  function roundBg22(color, stroke, radius) {
    var gd = new android.graphics.drawable.GradientDrawable();
    try { toolhubSafeSetGradientColor(gd, Number(color) | 0); } catch (e0) {}
    try { gd.setCornerRadius(dp22(radius || 12)); } catch (e1) {}
    try { toolhubSafeSetGradientStroke(gd, dp22(1), Number(stroke) | 0); } catch (e2) {}
    return gd;
  }

  function sampleSize22(width, height, maxEdge) {
    var sample = 1;
    var limit = Math.max(64, Number(maxEdge || 2048));
    while (Math.max(width / sample, height / sample) > limit) sample *= 2;
    return sample;
  }

  function floorPowerTwo22(value) {
    var n = Math.max(1, Math.floor(Number(value || 1)));
    var p = 1;
    while (p * 2 <= n) p *= 2;
    return p;
  }

  function safeRecycle22(bitmap) {
    try {
      if (bitmap && bitmap.recycle && (!bitmap.isRecycled || bitmap.isRecycled() !== true)) bitmap.recycle();
    } catch (e0) {}
  }

  function safeClose22(value) {
    try { if (value && value.recycle) value.recycle(); } catch (e0) {}
    try { if (value && value.close) value.close(); } catch (e1) {}
  }

  function fileSizeText22(bytes) {
    var n = Math.max(0, Number(bytes || 0));
    if (n >= 1024 * 1024) return String(Math.round(n / 1024 / 1024 * 10) / 10) + " MB";
    if (n >= 1024) return String(Math.round(n / 1024 * 10) / 10) + " KB";
    return String(Math.round(n)) + " B";
  }

  function closeStream22(value) {
    try { if (value) value.close(); } catch (e0) {}
  }

  function stringArgs22(values) {
    try {
      if (typeof ConfigManager !== "undefined" && ConfigManager.__toolHubSqliteStore &&
          ConfigManager.__toolHubSqliteStore.stringArgs) {
        return ConfigManager.__toolHubSqliteStore.stringArgs(values);
      }
    } catch (e0) {}
    var arr = java.lang.reflect.Array.newInstance(java.lang.String, values.length);
    for (var i = 0; i < values.length; i++) arr[i] = String(values[i]);
    return arr;
  }

  function store22() {
    try {
      if (typeof ConfigManager !== "undefined" && ConfigManager &&
          ConfigManager.__toolHubSqliteStore) return ConfigManager.__toolHubSqliteStore;
    } catch (e0) {}
    return null;
  }

  function ensureImageTables22(db) {
    db.execSQL("CREATE TABLE IF NOT EXISTS toolhub_pickword_images (internal_path TEXT PRIMARY KEY NOT NULL, created_at INTEGER NOT NULL, source_type TEXT NOT NULL, width INTEGER NOT NULL DEFAULT 0, height INTEGER NOT NULL DEFAULT 0, file_size INTEGER NOT NULL DEFAULT 0, saved_public_path TEXT NOT NULL DEFAULT '', saved_content_uri TEXT NOT NULL DEFAULT '', saved_at INTEGER NOT NULL DEFAULT 0, deleted_at INTEGER NOT NULL DEFAULT 0, last_access_at INTEGER NOT NULL DEFAULT 0)");
    db.execSQL("CREATE INDEX IF NOT EXISTS idx_toolhub_pickword_images_created ON toolhub_pickword_images(created_at, deleted_at)");
    db.execSQL("CREATE TABLE IF NOT EXISTS toolhub_pickword_image_exports (export_id INTEGER PRIMARY KEY AUTOINCREMENT, internal_path TEXT NOT NULL, export_kind TEXT NOT NULL, public_path TEXT NOT NULL DEFAULT '', content_uri TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL DEFAULT 0, deleted_at INTEGER NOT NULL DEFAULT 0)");
    db.execSQL("CREATE INDEX IF NOT EXISTS idx_toolhub_pickword_exports_expiry ON toolhub_pickword_image_exports(export_kind, expires_at, deleted_at)");
  }

  function withDb22(callback, fallback) {
    var store = store22();
    if (!store || !store.openDb) return fallback;
    var db = null;
    var locked = false;
    try {
      if (store._writeLock) {
        store._writeLock.lock();
        locked = true;
      }
      db = store.openDb();
      if (!db) return fallback;
      ensureImageTables22(db);
      return callback(db, store);
    } catch (e0) {
      try { if (typeof safeLog === "function") safeLog(null, "w", "pickword image db fail " + String(e0)); } catch (eLog) {}
      return fallback;
    } finally {
      try { if (store.closeDb) store.closeDb(db); else if (db) db.close(); } catch (eClose) {}
      try { if (locked && store._writeLock) store._writeLock.unlock(); } catch (eUnlock) {}
    }
  }

  function bindText22(stmt, index, value) {
    stmt.bindString(index, String(value === undefined || value === null ? "" : value));
  }

  function upsertImage22(info) {
    return withDb22(function(db) {
      var stmt = null;
      try {
        stmt = db.compileStatement("INSERT OR REPLACE INTO toolhub_pickword_images(internal_path,created_at,source_type,width,height,file_size,saved_public_path,saved_content_uri,saved_at,deleted_at,last_access_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)");
        bindText22(stmt, 1, info.internalPath);
        stmt.bindLong(2, Number(info.createdAt || now22()));
        bindText22(stmt, 3, info.source || "pointer_ocr");
        stmt.bindLong(4, Number(info.width || 0));
        stmt.bindLong(5, Number(info.height || 0));
        stmt.bindLong(6, Number(info.fileSize || 0));
        bindText22(stmt, 7, info.savedPublicPath || "");
        bindText22(stmt, 8, info.savedContentUri || "");
        stmt.bindLong(9, Number(info.savedAt || 0));
        stmt.bindLong(10, Number(info.deletedAt || 0));
        stmt.bindLong(11, Number(now22()));
        stmt.executeInsert();
        return true;
      } finally {
        try { if (stmt) stmt.close(); } catch (eClose) {}
      }
    }, false);
  }

  function updateImageSaved22(internalPath, publicPath, contentUri, savedAt) {
    return withDb22(function(db) {
      var stmt = null;
      try {
        stmt = db.compileStatement("UPDATE toolhub_pickword_images SET saved_public_path=?, saved_content_uri=?, saved_at=?, last_access_at=? WHERE internal_path=?");
        bindText22(stmt, 1, publicPath);
        bindText22(stmt, 2, contentUri);
        stmt.bindLong(3, Number(savedAt || now22()));
        stmt.bindLong(4, Number(now22()));
        bindText22(stmt, 5, internalPath);
        return Number(stmt.executeUpdateDelete()) > 0;
      } finally {
        try { if (stmt) stmt.close(); } catch (eClose) {}
      }
    }, false);
  }

  function markImageDeleted22(internalPath, deletedAt) {
    return withDb22(function(db) {
      var stmt = null;
      try {
        stmt = db.compileStatement("UPDATE toolhub_pickword_images SET deleted_at=?, last_access_at=? WHERE internal_path=?");
        stmt.bindLong(1, Number(deletedAt || now22()));
        stmt.bindLong(2, Number(now22()));
        bindText22(stmt, 3, internalPath);
        return Number(stmt.executeUpdateDelete()) > 0;
      } finally {
        try { if (stmt) stmt.close(); } catch (eClose) {}
      }
    }, false);
  }

  function loadSaved22(internalPath) {
    return withDb22(function(db) {
      var cursor = null;
      try {
        cursor = db.rawQuery("SELECT saved_public_path,saved_content_uri,saved_at FROM toolhub_pickword_images WHERE internal_path=? AND deleted_at=0", stringArgs22([internalPath]));
        if (!cursor.moveToFirst()) return null;
        return {
          publicPath: String(cursor.getString(0) || ""),
          contentUri: String(cursor.getString(1) || ""),
          savedAt: Number(cursor.getLong(2) || 0)
        };
      } finally {
        try { if (cursor) cursor.close(); } catch (eClose) {}
      }
    }, null);
  }

  function addExport22(internalPath, kind, publicPath, contentUri, createdAt, expiresAt) {
    return withDb22(function(db) {
      var stmt = null;
      try {
        stmt = db.compileStatement("INSERT INTO toolhub_pickword_image_exports(internal_path,export_kind,public_path,content_uri,created_at,expires_at,deleted_at) VALUES(?,?,?,?,?,?,0)");
        bindText22(stmt, 1, internalPath);
        bindText22(stmt, 2, kind);
        bindText22(stmt, 3, publicPath || "");
        bindText22(stmt, 4, contentUri || "");
        stmt.bindLong(5, Number(createdAt || now22()));
        stmt.bindLong(6, Number(expiresAt || 0));
        stmt.executeInsert();
        return true;
      } finally {
        try { if (stmt) stmt.close(); } catch (eClose) {}
      }
    }, false);
  }

  function getMeta22(key) {
    return withDb22(function(db, store) {
      if (store.getMeta) return store.getMeta(db, key);
      return null;
    }, null);
  }

  function putMeta22(key, value) {
    return withDb22(function(db, store) {
      if (store.putMeta) return store.putMeta(db, key, value);
      return false;
    }, false);
  }

  function internalRoot22() {
    var base = String(shortx.getShortXDir() || "").replace(/\/+$/g, "");
    if (!base) throw new Error("ShortX 目录为空");
    return new java.io.File(base, "ToolHub/screenshots").getCanonicalFile();
  }

  function normalizeInternalFile22(rawPath) {
    var root = internalRoot22();
    var target = new java.io.File(String(rawPath || "")).getCanonicalFile();
    var rootPath = String(root.getCanonicalPath());
    var targetPath = String(target.getCanonicalPath());
    if (targetPath.indexOf(rootPath + java.io.File.separator) !== 0) throw new Error("截图路径越界");
    return target;
  }

  function defaultPublicDir22() {
    return "/storage/emulated/0/Pictures/ToolHub";
  }

  function configuredPublicDir22(appObj) {
    var value = "";
    try {
      if (appObj && appObj.config) value = String(appObj.config.PICKWORD_IMAGE_PUBLIC_DIR || "");
    } catch (e0) {}
    if (!value) {
      try {
        var cfg = ConfigManager.loadSettings();
        value = String(cfg.PICKWORD_IMAGE_PUBLIC_DIR || "");
      } catch (e1) {}
    }
    return value || defaultPublicDir22();
  }

  function configuredRetention22(appObj, overrideValue) {
    var value = overrideValue;
    if (value === undefined || value === null || String(value) === "") {
      try { value = appObj && appObj.config ? appObj.config.PICKWORD_IMAGE_RETENTION_DAYS : null; } catch (e0) {}
    }
    if (value === undefined || value === null || String(value) === "") {
      try { value = ConfigManager.loadSettings().PICKWORD_IMAGE_RETENTION_DAYS; } catch (e1) {}
    }
    value = int22(value, 7);
    if (value < 0) value = 0;
    if (value > 365) value = 365;
    return value;
  }

  function normalizePublicDir22(rawPath, createDir) {
    var value = String(rawPath || "").replace(/^\s+|\s+$/g, "");
    if (!value) value = defaultPublicDir22();
    var storage = android.os.Environment.getExternalStorageDirectory().getCanonicalFile();
    var target = new java.io.File(value).getCanonicalFile();
    var rootPath = String(storage.getCanonicalPath());
    var targetPath = String(target.getCanonicalPath());
    if (targetPath !== rootPath && targetPath.indexOf(rootPath + java.io.File.separator) !== 0) {
      throw new Error("保存目录必须位于主存储");
    }
    if (createDir === true && !target.exists() && !target.mkdirs() && !target.exists()) {
      throw new Error("无法创建保存目录");
    }
    if (target.exists() && !target.isDirectory()) throw new Error("保存路径不是目录");
    return target;
  }

  function probeWritable22(dir) {
    var probe = null;
    var stream = null;
    try {
      if (!dir.exists() && !dir.mkdirs() && !dir.exists()) throw new Error("目录创建失败");
      probe = new java.io.File(dir, ".toolhub_write_probe_" + String(now22()));
      stream = new java.io.FileOutputStream(probe, false);
      stream.write(49);
      stream.flush();
      return true;
    } finally {
      closeStream22(stream);
      try { if (probe && probe.exists()) probe.delete(); } catch (e0) {}
    }
  }

  function relativePath22(dir) {
    var storage = android.os.Environment.getExternalStorageDirectory().getCanonicalFile();
    var rootPath = String(storage.getCanonicalPath());
    var targetPath = String(dir.getCanonicalPath());
    var relative = targetPath.substring(rootPath.length).replace(/^\/+/, "").replace(/\\/g, "/");
    if (relative && relative.charAt(relative.length - 1) !== "/") relative += "/";
    return relative;
  }

  function extension22(file) {
    var name = String(file.getName() || "");
    var dot = name.lastIndexOf(".");
    var ext = dot >= 0 ? name.substring(dot + 1).toLowerCase() : "png";
    if (!/^(png|jpe?g|webp)$/.test(ext)) ext = "png";
    if (ext === "jpeg") ext = "jpg";
    return ext;
  }

  function mime22(ext) {
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    if (ext === "webp") return "image/webp";
    return "image/png";
  }

  function displayName22(file, createdAt, prefix) {
    var fmt = new java.text.SimpleDateFormat("yyyyMMdd_HHmmss", java.util.Locale.getDefault());
    var stamp = String(fmt.format(new java.util.Date(Number(createdAt || now22()))));
    return String(prefix || "ToolHub_") + stamp + "_" + String(now22() % 1000) + "." + extension22(file);
  }

  function copyStream22(input, output) {
    var buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 64 * 1024);
    var total = 0;
    var count = 0;
    while ((count = input.read(buffer)) > 0) {
      output.write(buffer, 0, count);
      total += count;
    }
    output.flush();
    return total;
  }

  function insertMediaStore22(sourceFile, publicDir, displayName, kind, expiresAt) {
    var resolver = context.getContentResolver();
    var uri = null;
    var input = null;
    var output = null;
    var values = new android.content.ContentValues();
    var ext = extension22(sourceFile);
    var relative = relativePath22(publicDir);
    try {
      values.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, String(displayName));
      values.put(android.provider.MediaStore.MediaColumns.MIME_TYPE, String(mime22(ext)));
      if (android.os.Build.VERSION.SDK_INT >= 29) {
        values.put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, String(relative));
        values.put(android.provider.MediaStore.MediaColumns.IS_PENDING, new java.lang.Integer(1));
      }
      uri = resolver.insert(android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
      if (!uri) throw new Error("MediaStore 创建失败");
      input = new java.io.FileInputStream(sourceFile);
      output = resolver.openOutputStream(uri, "w");
      if (!output) throw new Error("MediaStore 输出流为空");
      var bytes = copyStream22(input, output);
      closeStream22(output);
      output = null;
      closeStream22(input);
      input = null;
      if (android.os.Build.VERSION.SDK_INT >= 29) {
        var ready = new android.content.ContentValues();
        ready.put(android.provider.MediaStore.MediaColumns.IS_PENDING, new java.lang.Integer(0));
        resolver.update(uri, ready, null, null);
      }
      var publicPath = new java.io.File(publicDir, displayName).getAbsolutePath();
      return {
        ok: true,
        kind: kind,
        publicPath: String(publicPath),
        contentUri: String(uri.toString()),
        bytes: Number(bytes || 0),
        createdAt: now22(),
        expiresAt: Number(expiresAt || 0)
      };
    } catch (e0) {
      try { if (uri) resolver.delete(uri, null, null); } catch (eDelete) {}
      throw e0;
    } finally {
      closeStream22(output);
      closeStream22(input);
    }
  }

  function copyFileFallback22(sourceFile, publicDir, displayName) {
    var input = null;
    var output = null;
    var target = new java.io.File(publicDir, displayName);
    try {
      input = new java.io.FileInputStream(sourceFile);
      output = new java.io.FileOutputStream(target, false);
      var bytes = copyStream22(input, output);
      try {
        android.media.MediaScannerConnection.scanFile(context, [String(target.getAbsolutePath())], [mime22(extension22(target))], null);
      } catch (eScan) {}
      return {
        ok: true,
        publicPath: String(target.getAbsolutePath()),
        contentUri: "",
        bytes: Number(bytes || 0),
        createdAt: now22(),
        expiresAt: 0,
        fallback: true
      };
    } catch (e0) {
      try { if (target.exists()) target.delete(); } catch (eDelete) {}
      throw e0;
    } finally {
      closeStream22(output);
      closeStream22(input);
    }
  }

  function uriReadable22(rawUri) {
    if (!rawUri) return false;
    var input = null;
    try {
      input = context.getContentResolver().openInputStream(android.net.Uri.parse(String(rawUri)));
      return !!input;
    } catch (e0) {
      return false;
    } finally {
      closeStream22(input);
    }
  }

  function existingSave22(internalPath) {
    var row = loadSaved22(internalPath);
    if (!row) return null;
    if (row.contentUri && uriReadable22(row.contentUri)) return row;
    if (row.publicPath) {
      try {
        var file = new java.io.File(row.publicPath);
        if (file.exists() && file.isFile() && file.length() > 0) return row;
      } catch (e0) {}
    }
    return null;
  }

  function savePermanent22(appObj, sourceFile, session) {
    var existing = existingSave22(String(sourceFile.getCanonicalPath()));
    if (existing) {
      existing.ok = true;
      existing.reused = true;
      return existing;
    }
    var dir = normalizePublicDir22(configuredPublicDir22(appObj), true);
    probeWritable22(dir);
    var name = displayName22(sourceFile, Number(session.createdAt || now22()), "ToolHub_");
    var result = null;
    try {
      result = insertMediaStore22(sourceFile, dir, name, "saved", 0);
    } catch (eMedia) {
      result = copyFileFallback22(sourceFile, dir, name);
      result.mediaStoreError = String(eMedia);
    }
    updateImageSaved22(String(sourceFile.getCanonicalPath()), result.publicPath, result.contentUri, result.createdAt);
    return result;
  }

  function createShareCopy22(appObj, sourceFile, session) {
    var base = normalizePublicDir22(configuredPublicDir22(appObj), true);
    var dir = new java.io.File(base, "ShareTemp");
    if (!dir.exists() && !dir.mkdirs() && !dir.exists()) throw new Error("临时分享目录创建失败");
    var expiresAt = now22() + 24 * 60 * 60 * 1000;
    var name = displayName22(sourceFile, Number(session.createdAt || now22()), "ToolHub_Share_");
    var result = insertMediaStore22(sourceFile, dir, name, "share_temp", expiresAt);
    addExport22(String(sourceFile.getCanonicalPath()), "share_temp", result.publicPath, result.contentUri, result.createdAt, expiresAt);
    return result;
  }

  function launchShare22(result) {
    if (!result || !result.contentUri) throw new Error("分享 URI 不可用");
    var uri = android.net.Uri.parse(String(result.contentUri));
    var sendIntent = new android.content.Intent(android.content.Intent.ACTION_SEND);
    sendIntent.setType("image/*");
    sendIntent.putExtra(android.content.Intent.EXTRA_STREAM, uri);
    sendIntent.setClipData(android.content.ClipData.newRawUri("ToolHub screenshot", uri));
    sendIntent.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
    sendIntent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
    var chooser = android.content.Intent.createChooser(sendIntent, "分享截图");
    chooser.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
    chooser.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
    context.startActivity(chooser);
    return true;
  }

  function deleteContent22(contentUri, publicPath) {
    var deleted = false;
    if (contentUri) {
      try {
        deleted = context.getContentResolver().delete(android.net.Uri.parse(String(contentUri)), null, null) > 0;
      } catch (e0) {}
    }
    if (!deleted && publicPath) {
      try {
        var file = new java.io.File(String(publicPath));
        deleted = !file.exists() || file.delete();
      } catch (e1) {}
    }
    return deleted;
  }

  function scanInternalCleanup22(retentionDays, activePath) {
    var result = { scanned: 0, deleted: 0, skippedActive: 0, failed: 0 };
    if (retentionDays <= 0) return result;
    var root = internalRoot22();
    if (!root.exists() || !root.isDirectory()) return result;
    var files = root.listFiles();
    if (!files) return result;
    var cutoff = now22() - retentionDays * 24 * 60 * 60 * 1000;
    var active = "";
    try { active = activePath ? String(normalizeInternalFile22(activePath).getCanonicalPath()) : ""; } catch (eActive) { active = ""; }
    for (var i = 0; i < files.length; i++) {
      var one = files[i];
      try {
        if (!one || !one.isFile()) continue;
        var name = String(one.getName() || "").toLowerCase();
        if (!/\.(png|jpe?g|webp)$/.test(name)) continue;
        result.scanned++;
        var canonical = String(one.getCanonicalPath());
        if (active && canonical === active) {
          result.skippedActive++;
          continue;
        }
        var modified = Number(one.lastModified() || 0);
        if (!(modified > 0) || modified >= cutoff) continue;
        if (one.delete()) {
          result.deleted++;
          markImageDeleted22(canonical, now22());
        } else {
          result.failed++;
        }
      } catch (eOne) {
        result.failed++;
      }
    }
    return result;
  }

  function cleanupExports22() {
    return withDb22(function(db) {
      var cursor = null;
      var rows = [];
      var result = { scanned: 0, deleted: 0, failed: 0 };
      try {
        cursor = db.rawQuery("SELECT export_id,public_path,content_uri FROM toolhub_pickword_image_exports WHERE export_kind='share_temp' AND deleted_at=0 AND expires_at>0 AND expires_at<?", stringArgs22([String(now22())]));
        while (cursor.moveToNext()) {
          rows.push({
            id: Number(cursor.getLong(0)),
            publicPath: String(cursor.getString(1) || ""),
            contentUri: String(cursor.getString(2) || "")
          });
        }
      } finally {
        try { if (cursor) cursor.close(); } catch (eClose) {}
      }
      for (var i = 0; i < rows.length; i++) {
        result.scanned++;
        var one = rows[i];
        var ok = deleteContent22(one.contentUri, one.publicPath);
        if (ok) result.deleted++; else result.failed++;
        var stmt = null;
        try {
          stmt = db.compileStatement("UPDATE toolhub_pickword_image_exports SET deleted_at=? WHERE export_id=?");
          stmt.bindLong(1, Number(now22()));
          stmt.bindLong(2, Number(one.id));
          stmt.executeUpdateDelete();
        } finally {
          try { if (stmt) stmt.close(); } catch (eStmt) {}
        }
      }
      return result;
    }, { scanned: 0, deleted: 0, failed: 0 });
  }

  function stats22(appObj) {
    var dbStats = withDb22(function(db) {
      var cursor = null;
      try {
        cursor = db.rawQuery("SELECT COUNT(*), SUM(CASE WHEN saved_at>0 THEN 1 ELSE 0 END), SUM(CASE WHEN deleted_at>0 THEN 1 ELSE 0 END) FROM toolhub_pickword_images", null);
        if (!cursor.moveToFirst()) return { tracked: 0, saved: 0, deleted: 0 };
        return {
          tracked: Number(cursor.getLong(0) || 0),
          saved: Number(cursor.getLong(1) || 0),
          deleted: Number(cursor.getLong(2) || 0)
        };
      } finally {
        try { if (cursor) cursor.close(); } catch (eClose) {}
      }
    }, { tracked: 0, saved: 0, deleted: 0 });
    dbStats.publicDir = configuredPublicDir22(appObj);
    dbStats.retentionDays = configuredRetention22(appObj, null);
    dbStats.lastCleanupAt = Number(getMeta22("pickword_image_cleanup_last_at") || 0);
    return dbStats;
  }

  function install22() {
    try {
      if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return false;
      var proto = FloatBallAppWM.prototype;
      if (proto.__toolHubPickwordImageViewerInstalled === true) return true;

      proto.validatePickwordImagePublicDir = function(pathValue) {
        var result = { ok: false, path: "", error: "" };
        try {
          var dir = normalizePublicDir22(pathValue, true);
          probeWritable22(dir);
          result.ok = true;
          result.path = String(dir.getCanonicalPath());
        } catch (e0) {
          result.error = String(e0);
        }
        return result;
      };

      proto.getPickwordImageStorageStats = function() {
        return stats22(this);
      };

      proto.runPickwordImageCleanupNow = function(options, callback) {
        var appObj = this;
        var opts = options || {};
        if (proto.__pickwordImageCleanupRunning22 === true) {
          try { if (callback) callback({ ok: false, busy: true, error: "清理正在进行" }); } catch (eBusy) {}
          return false;
        }
        var force = opts.force === true;
        var lastAt = Number(getMeta22("pickword_image_cleanup_last_at") || 0);
        if (!force && lastAt > 0 && now22() - lastAt < 24 * 60 * 60 * 1000) {
          try {
            if (callback) callback({ ok: true, skipped: true, reason: "once_per_day", lastCleanupAt: lastAt });
          } catch (eSkip) {}
          return true;
        }
        proto.__pickwordImageCleanupRunning22 = true;
        var handler = new android.os.Handler(android.os.Looper.getMainLooper());
        var thread = new java.lang.Thread(new java.lang.Runnable({ run: function() {
          var result = { ok: false, internal: null, exports: null, retentionDays: 0, completedAt: 0, error: "" };
          try {
            result.retentionDays = configuredRetention22(appObj, opts.retentionDays);
            result.internal = scanInternalCleanup22(result.retentionDays, String(opts.activePath || ""));
            result.exports = cleanupExports22();
            result.completedAt = now22();
            putMeta22("pickword_image_cleanup_last_at", String(result.completedAt));
            result.ok = true;
          } catch (eRun) {
            result.error = String(eRun);
          }
          handler.post(new java.lang.Runnable({ run: function() {
            proto.__pickwordImageCleanupRunning22 = false;
            try {
              safeLog(appObj.L, result.ok ? "i" : "w",
                "pickword image cleanup ok=" + String(result.ok) +
                " retentionDays=" + String(result.retentionDays) +
                " internalDeleted=" + String(result.internal ? result.internal.deleted : 0) +
                " tempDeleted=" + String(result.exports ? result.exports.deleted : 0) +
                " error=" + String(result.error || ""));
            } catch (eLog) {}
            try { if (callback) callback(result); } catch (eCallback) {}
          }}));
        }}), "TH-Pickword-Image-Cleanup");
        thread.start();
        return true;
      };

      proto.createPickwordImageController = function(options) {
        var appObj = this;
        var opts = options || {};
        var session = opts.session || {};
        var file = normalizeInternalFile22(String(session.internalPath || ""));
        var path = String(file.getCanonicalPath());
        var handler = opts.handler || new android.os.Handler(android.os.Looper.getMainLooper());
        var executor = java.util.concurrent.Executors.newSingleThreadExecutor();
        var colors = theme22(appObj);
        var generation = 1;
        var released = false;
        var deleted = false;
        var actionBusy = false;
        var boundsReady = false;
        var sourceWidth = 0;
        var sourceHeight = 0;
        var fileSize = 0;
        var baseSample = 1;
        var thumbBitmap = null;
        var baseBitmap = null;
        var regionBitmap = null;
        var regionRect = null;
        var regionSample = 1;
        var regionDecoder = null;
        var regionSerial = 0;
        var regionRunnable = null;
        var thumbnailRoot = null;
        var thumbnailImage = null;
        var thumbnailStatus = null;
        var fullRoot = null;
        var imageCanvas = null;
        var infoView = null;
        var actionStatusView = null;
        var saveButton = null;
        var shareButton = null;
        var deleteButton = null;
        var confirmOverlay = null;
        var viewW = 0;
        var viewH = 0;
        var scale = 1;
        var minScale = 1;
        var maxScale = 8;
        var tx = 0;
        var ty = 0;
        var lastX = 0;
        var lastY = 0;
        var panning = false;
        var scaling = false;
        var initialized = false;
        var savedInfo = existingSave22(path);

        function log(level, msg) {
          try { safeLog(appObj.L, level, "pickword image " + String(msg)); } catch (e0) {}
        }

        function error(stage, err) {
          log("w", "stage=" + String(stage || "") + " err=" + String(err || ""));
          try { if (typeof opts.onError === "function") opts.onError(stage, err); } catch (e0) {}
        }

        function post(fn) {
          try {
            return handler.post(new java.lang.Runnable({ run: function() {
              try { fn(); } catch (eRun) { error("ui", eRun); }
            }})) === true;
          } catch (e0) {}
          return false;
        }

        function setStatus(text, isError) {
          try {
            if (actionStatusView) {
              actionStatusView.setText(String(text || ""));
              safeText22(actionStatusView, isError ? colors.danger : colors.secondary);
            }
          } catch (e0) {}
          try {
            if (thumbnailStatus) thumbnailStatus.setText(String(text || (savedInfo ? "已保存 · 点击查看原图" : "点击查看原图")));
          } catch (e1) {}
        }

        function setBusy(busy, text) {
          actionBusy = busy === true;
          var controls = [saveButton, shareButton, deleteButton];
          for (var i = 0; i < controls.length; i++) {
            try {
              if (controls[i]) {
                controls[i].setEnabled(!actionBusy);
                controls[i].setAlpha(actionBusy ? 0.45 : 1.0);
              }
            } catch (e0) {}
          }
          if (text) setStatus(text, false);
        }

        function readBounds() {
          if (boundsReady) return true;
          var o = new android.graphics.BitmapFactory.Options();
          o.inJustDecodeBounds = true;
          android.graphics.BitmapFactory.decodeFile(path, o);
          sourceWidth = Math.max(0, Number(o.outWidth || 0));
          sourceHeight = Math.max(0, Number(o.outHeight || 0));
          try { fileSize = Number(file.length() || 0); } catch (e0) { fileSize = 0; }
          boundsReady = sourceWidth > 0 && sourceHeight > 0;
          if (boundsReady) {
            upsertImage22({
              internalPath: path,
              createdAt: Number(session.createdAt || file.lastModified() || now22()),
              source: String(session.source || "pointer_ocr"),
              width: sourceWidth,
              height: sourceHeight,
              fileSize: fileSize,
              savedPublicPath: savedInfo ? savedInfo.publicPath : "",
              savedContentUri: savedInfo ? savedInfo.contentUri : "",
              savedAt: savedInfo ? savedInfo.savedAt : 0,
              deletedAt: 0
            });
          }
          return boundsReady;
        }

        function updateInfo() {
          if (!infoView) return;
          var text = sourceWidth > 0 ? (String(sourceWidth) + " × " + String(sourceHeight) + "  ·  " + fileSizeText22(fileSize)) : "图片信息不可用";
          try { infoView.setText(text); } catch (e0) {}
        }

        function fitTransform() {
          if (!baseBitmap || viewW <= 0 || viewH <= 0) return;
          var bw = Math.max(1, Number(baseBitmap.getWidth()));
          var bh = Math.max(1, Number(baseBitmap.getHeight()));
          minScale = Math.min(viewW / bw, viewH / bh);
          if (!(minScale > 0)) minScale = 1;
          maxScale = Math.max(minScale * 8, 8 / Math.max(1, baseSample));
          scale = minScale;
          tx = (viewW - bw * scale) / 2;
          ty = (viewH - bh * scale) / 2;
          initialized = true;
        }

        function clampTranslation() {
          if (!baseBitmap || viewW <= 0 || viewH <= 0) return;
          var dw = baseBitmap.getWidth() * scale;
          var dh = baseBitmap.getHeight() * scale;
          if (dw <= viewW) tx = (viewW - dw) / 2;
          else tx = clamp22(tx, viewW - dw, 0);
          if (dh <= viewH) ty = (viewH - dh) / 2;
          else ty = clamp22(ty, viewH - dh, 0);
        }

        function setScaleAround(next, fx, fy) {
          if (!baseBitmap) return;
          var old = scale;
          next = clamp22(next, minScale, maxScale);
          if (!(old > 0)) old = next;
          var bx = (fx - tx) / old;
          var by = (fy - ty) / old;
          scale = next;
          tx = fx - bx * scale;
          ty = fy - by * scale;
          clampTranslation();
          try { if (imageCanvas) imageCanvas.invalidate(); } catch (e0) {}
          scheduleRegionDecode();
        }

        function visibleSourceRect() {
          if (!baseBitmap || !boundsReady || viewW <= 0 || viewH <= 0 || !(scale > 0)) return null;
          var left = Math.floor(Math.max(0, ((0 - tx) / scale) * baseSample));
          var top = Math.floor(Math.max(0, ((0 - ty) / scale) * baseSample));
          var right = Math.ceil(Math.min(sourceWidth, ((viewW - tx) / scale) * baseSample));
          var bottom = Math.ceil(Math.min(sourceHeight, ((viewH - ty) / scale) * baseSample));
          if (right <= left || bottom <= top) return null;
          var padX = Math.max(8, Math.round((right - left) * 0.08));
          var padY = Math.max(8, Math.round((bottom - top) * 0.08));
          left = Math.max(0, left - padX);
          top = Math.max(0, top - padY);
          right = Math.min(sourceWidth, right + padX);
          bottom = Math.min(sourceHeight, bottom + padY);
          return new android.graphics.Rect(left, top, right, bottom);
        }

        function scheduleRegionDecode() {
          if (!regionDecoder || released || deleted || !baseBitmap) return;
          regionSerial++;
          var serial = regionSerial;
          if (regionRunnable) {
            try { handler.removeCallbacks(regionRunnable); } catch (e0) {}
          }
          regionRunnable = new java.lang.Runnable({ run: function() {
            regionRunnable = null;
            if (released || deleted || serial !== regionSerial) return;
            var rect = visibleSourceRect();
            if (!rect) return;
            var desired = Math.max(1, floorPowerTwo22(baseSample / Math.max(scale, 0.01)));
            if (desired >= baseSample && scale <= minScale * 1.15) return;
            try {
              executor.execute(new java.lang.Runnable({ run: function() {
                var decoded = null;
                try {
                  var o = new android.graphics.BitmapFactory.Options();
                  o.inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888;
                  o.inSampleSize = desired;
                  decoded = regionDecoder.decodeRegion(rect, o);
                } catch (eDecode) {
                  error("region_decode", eDecode);
                }
                finalApply(decoded, rect, desired, serial);
              }}));
            } catch (eExec) { error("region_schedule", eExec); }
          }});
          try { handler.postDelayed(regionRunnable, 90); } catch (ePost) {}
        }

        function finalApply(decoded, rect, sampleValue, serial) {
          post(function() {
            if (released || deleted || serial !== regionSerial) {
              safeRecycle22(decoded);
              return;
            }
            safeRecycle22(regionBitmap);
            regionBitmap = decoded;
            regionRect = rect;
            regionSample = sampleValue;
            try { if (imageCanvas) imageCanvas.invalidate(); } catch (e0) {}
          });
        }

        function decodeThumbnail() {
          var token = generation;
          try {
            executor.execute(new java.lang.Runnable({ run: function() {
              var bitmap = null;
              try {
                if (!readBounds()) throw new Error("图片尺寸读取失败");
                var o = new android.graphics.BitmapFactory.Options();
                o.inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888;
                o.inSampleSize = sampleSize22(sourceWidth, sourceHeight, 512);
                bitmap = android.graphics.BitmapFactory.decodeFile(path, o);
                if (!bitmap) throw new Error("缩略图解码为空");
              } catch (eDecode) {
                error("thumbnail_decode", eDecode);
              }
              post(function() {
                if (released || deleted || token !== generation) {
                  safeRecycle22(bitmap);
                  return;
                }
                safeRecycle22(thumbBitmap);
                thumbBitmap = bitmap;
                if (thumbnailImage && bitmap) thumbnailImage.setImageBitmap(bitmap);
                if (thumbnailStatus) thumbnailStatus.setText(bitmap ? (savedInfo ? "已保存 · 点击查看原图" : "点击查看原图") : "截图不可用");
                updateInfo();
              });
            }}));
          } catch (eExec) { error("thumbnail_schedule", eExec); }
        }

        function decodeFull() {
          if (baseBitmap || released || deleted) return;
          var token = generation;
          try {
            executor.execute(new java.lang.Runnable({ run: function() {
              var bitmap = null;
              var decoder = null;
              var sampleValue = 1;
              try {
                if (!readBounds()) throw new Error("图片尺寸读取失败");
                sampleValue = sampleSize22(sourceWidth, sourceHeight, 4096);
                var o = new android.graphics.BitmapFactory.Options();
                o.inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888;
                o.inSampleSize = sampleValue;
                bitmap = android.graphics.BitmapFactory.decodeFile(path, o);
                if (!bitmap) throw new Error("原图解码为空");
                if (sampleValue > 1) {
                  try { decoder = android.graphics.BitmapRegionDecoder.newInstance(path, false); } catch (eRegion) { decoder = null; }
                }
              } catch (eDecode) {
                error("full_decode", eDecode);
              }
              post(function() {
                if (released || deleted || token !== generation) {
                  safeRecycle22(bitmap);
                  safeClose22(decoder);
                  return;
                }
                baseBitmap = bitmap;
                baseSample = sampleValue;
                regionDecoder = decoder;
                if (baseBitmap && imageCanvas) {
                  fitTransform();
                  imageCanvas.invalidate();
                  scheduleRegionDecode();
                }
                updateInfo();
              });
            }}));
          } catch (eExec) { error("full_schedule", eExec); }
        }

        function runAction(stage, busyText, worker, done) {
          if (released || deleted || actionBusy) return false;
          setBusy(true, busyText);
          try {
            executor.execute(new java.lang.Runnable({ run: function() {
              var result = null;
              var err = null;
              try { result = worker(); } catch (eRun) { err = eRun; }
              post(function() {
                setBusy(false, "");
                if (released) return;
                if (err) {
                  setStatus(String(err), true);
                  error(stage, err);
                  return;
                }
                try { done(result); } catch (eDone) { error(stage + "_done", eDone); }
              });
            }}));
            return true;
          } catch (eExec) {
            setBusy(false, "");
            error(stage + "_schedule", eExec);
            return false;
          }
        }

        function performSave() {
          runAction("save", "正在保存…", function() {
            return savePermanent22(appObj, file, session);
          }, function(result) {
            savedInfo = {
              publicPath: String(result.publicPath || ""),
              contentUri: String(result.contentUri || ""),
              savedAt: Number(result.createdAt || now22())
            };
            setStatus(result.reused ? "已保存" : "保存成功", false);
            try { if (typeof opts.onSaved === "function") opts.onSaved(savedInfo); } catch (eCallback) {}
          });
        }

        function performShare() {
          runAction("share", "正在准备分享…", function() {
            return createShareCopy22(appObj, file, session);
          }, function(result) {
            launchShare22(result);
            setStatus("已打开分享面板", false);
            try { if (typeof opts.onShared === "function") opts.onShared(result); } catch (eCallback) {}
          });
        }

        function dismissConfirm() {
          try {
            if (confirmOverlay && confirmOverlay.getParent()) confirmOverlay.getParent().removeView(confirmOverlay);
          } catch (e0) {}
          confirmOverlay = null;
        }

        function performDelete() {
          dismissConfirm();
          runAction("delete", "正在删除截图…", function() {
            var target = normalizeInternalFile22(path);
            if (!target.exists()) return { ok: true, alreadyMissing: true, internalPath: path };
            if (!target.isFile()) throw new Error("截图不是文件");
            if (!target.delete()) throw new Error("截图删除失败");
            markImageDeleted22(path, now22());
            return { ok: true, internalPath: path, deletedAt: now22() };
          }, function(result) {
            deleted = true;
            generation++;
            regionSerial++;
            setStatus("截图已删除", false);
            try { if (typeof opts.onDeleted === "function") opts.onDeleted(result); } catch (eCallback) {}
          });
        }

        function showDeleteConfirm() {
          if (!fullRoot || confirmOverlay || actionBusy) return;
          var overlay = new android.widget.FrameLayout(opts.context || context);
          confirmOverlay = overlay;
          safeBg22(overlay, colors.scrim);
          var card = new android.widget.LinearLayout(opts.context || context);
          card.setOrientation(android.widget.LinearLayout.VERTICAL);
          card.setPadding(dp22(18), dp22(16), dp22(18), dp22(14));
          card.setBackground(roundBg22(colors.card, colors.stroke, 18));
          var title = new android.widget.TextView(opts.context || context);
          title.setText("永久删除这张截图？");
          safeText22(title, colors.text);
          title.setTextSize(17);
          title.setTypeface(null, android.graphics.Typeface.BOLD);
          card.addView(title, new android.widget.LinearLayout.LayoutParams(-1, -2));
          var desc = new android.widget.TextView(opts.context || context);
          desc.setText("只删除 ToolHub 内部截图。已保存到公共目录的副本不会删除，拾字文字会保留。");
          safeText22(desc, colors.secondary);
          desc.setTextSize(13);
          desc.setPadding(0, dp22(6), 0, dp22(12));
          card.addView(desc, new android.widget.LinearLayout.LayoutParams(-1, -2));
          var row = new android.widget.LinearLayout(opts.context || context);
          row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
          row.addView(button("取消", function() { dismissConfirm(); }, colors.primary), new android.widget.LinearLayout.LayoutParams(0, dp22(48), 1));
          row.addView(button("删除", function() { performDelete(); }, colors.danger), new android.widget.LinearLayout.LayoutParams(0, dp22(48), 1));
          card.addView(row, new android.widget.LinearLayout.LayoutParams(-1, dp22(48)));
          var cardLp = new android.widget.FrameLayout.LayoutParams(Math.min(dp22(360), Math.max(dp22(260), int22(viewW * 0.82, dp22(320)))), -2, android.view.Gravity.CENTER);
          overlay.addView(card, cardLp);
          overlay.setClickable(true);
          fullRoot.addView(overlay, new android.widget.FrameLayout.LayoutParams(-1, -1));
        }

        var scaleListener = new JavaAdapter(android.view.ScaleGestureDetector.SimpleOnScaleGestureListener, {
          onScaleBegin: function(detector) { scaling = true; return true; },
          onScale: function(detector) {
            try { setScaleAround(scale * Number(detector.getScaleFactor()), detector.getFocusX(), detector.getFocusY()); } catch (e0) {}
            return true;
          },
          onScaleEnd: function(detector) { scaling = false; scheduleRegionDecode(); }
        });
        var scaleDetector = new android.view.ScaleGestureDetector(opts.context || context, scaleListener);

        var gestureListener = new JavaAdapter(android.view.GestureDetector.SimpleOnGestureListener, {
          onDown: function(event) { return true; },
          onDoubleTap: function(event) {
            var target = scale > minScale * 1.4 ? minScale : Math.min(maxScale, minScale * 3);
            setScaleAround(target, event.getX(), event.getY());
            return true;
          }
        });
        var gestureDetector = new android.view.GestureDetector(opts.context || context, gestureListener);

        function createCanvas() {
          var CanvasView = new JavaAdapter(android.view.View, {
            onSizeChanged: function(w, h, oldw, oldh) {
              viewW = Number(w || 0);
              viewH = Number(h || 0);
              if (baseBitmap) {
                if (!initialized) fitTransform();
                else clampTranslation();
                scheduleRegionDecode();
              }
            },
            onDraw: function(canvas) {
              try {
                canvas.drawARGB(255, (colors.bg >>> 16) & 255, (colors.bg >>> 8) & 255, colors.bg & 255);
                var cell = dp22(18);
                var p = new android.graphics.Paint();
                for (var yy = 0; yy < getHeight(); yy += cell) {
                  for (var xx = 0; xx < getWidth(); xx += cell) {
                    var v = (((xx / cell) + (yy / cell)) % 2 === 0) ? 20 : 8;
                    p.setARGB(v, 128, 128, 128);
                    canvas.drawRect(xx, yy, xx + cell, yy + cell, p);
                  }
                }
                if (!baseBitmap) {
                  var t = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
                  t.setARGB(255, (colors.secondary >>> 16) & 255, (colors.secondary >>> 8) & 255, colors.secondary & 255);
                  t.setTextSize(dp22(15));
                  t.setTextAlign(android.graphics.Paint.Align.CENTER);
                  canvas.drawText(new java.lang.String(deleted ? "截图已删除" : "正在载入截图…"), getWidth() / 2, getHeight() / 2, t);
                  return;
                }
                canvas.save();
                canvas.translate(tx, ty);
                canvas.scale(scale, scale);
                canvas.drawBitmap(baseBitmap, 0, 0, null);
                canvas.restore();
                if (regionBitmap && regionRect) {
                  var left = tx + (Number(regionRect.left) / baseSample) * scale;
                  var top = ty + (Number(regionRect.top) / baseSample) * scale;
                  var right = tx + (Number(regionRect.right) / baseSample) * scale;
                  var bottom = ty + (Number(regionRect.bottom) / baseSample) * scale;
                  var dst = new android.graphics.RectF(left, top, right, bottom);
                  canvas.drawBitmap(regionBitmap, null, dst, null);
                }
              } catch (eDraw) { error("draw", eDraw); }
            },
            onTouchEvent: function(event) {
              try { scaleDetector.onTouchEvent(event); } catch (eScale) {}
              try { gestureDetector.onTouchEvent(event); } catch (eGesture) {}
              var action = event.getActionMasked ? event.getActionMasked() : event.getAction();
              if (action === android.view.MotionEvent.ACTION_DOWN) {
                lastX = event.getX();
                lastY = event.getY();
                panning = true;
                return true;
              }
              if (action === android.view.MotionEvent.ACTION_MOVE && panning && !scaling && event.getPointerCount() === 1) {
                var nx = event.getX();
                var ny = event.getY();
                tx += nx - lastX;
                ty += ny - lastY;
                lastX = nx;
                lastY = ny;
                clampTranslation();
                invalidate();
                scheduleRegionDecode();
                return true;
              }
              if (action === android.view.MotionEvent.ACTION_UP || action === android.view.MotionEvent.ACTION_CANCEL) {
                panning = false;
                scheduleRegionDecode();
                return true;
              }
              return true;
            }
          }, opts.context || context);
          CanvasView.setClickable(true);
          return CanvasView;
        }

        function button(label, callback, colorValue) {
          var tv = new android.widget.TextView(opts.context || context);
          tv.setText(label);
          safeText22(tv, colorValue === undefined ? colors.primary : colorValue);
          tv.setTextSize(14);
          tv.setGravity(android.view.Gravity.CENTER);
          tv.setPadding(dp22(10), dp22(8), dp22(10), dp22(8));
          tv.setClickable(true);
          tv.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
            try { callback(); } catch (e0) { error("button", e0); }
          }}));
          return tv;
        }

        var controller = {
          hasImage: function() {
            try { return !released && !deleted && file.exists() && file.isFile() && file.length() > 0; } catch (e0) {}
            return false;
          },
          createThumbnailView: function() {
            if (thumbnailRoot) return thumbnailRoot;
            var root = new android.widget.FrameLayout(opts.context || context);
            thumbnailRoot = root;
            root.setBackground(roundBg22(colors.card, colors.stroke, 14));
            root.setPadding(dp22(6), dp22(6), dp22(6), dp22(6));
            var image = new android.widget.ImageView(opts.context || context);
            thumbnailImage = image;
            image.setScaleType(android.widget.ImageView.ScaleType.CENTER_INSIDE);
            root.addView(image, new android.widget.FrameLayout.LayoutParams(-1, -1));
            var status = new android.widget.TextView(opts.context || context);
            thumbnailStatus = status;
            status.setText(savedInfo ? "已保存 · 点击查看原图" : "正在读取截图…");
            safeText22(status, colors.secondary);
            status.setTextSize(11);
            status.setGravity(android.view.Gravity.CENTER);
            var statusLp = new android.widget.FrameLayout.LayoutParams(-1, dp22(30), android.view.Gravity.BOTTOM);
            root.addView(status, statusLp);
            root.setClickable(true);
            root.setContentDescription("截图缩略图，点击查看原图");
            root.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
              try { if (typeof opts.onOpen === "function") opts.onOpen(); } catch (e0) { error("open_callback", e0); }
            }}));
            decodeThumbnail();
            return root;
          },
          createFullView: function() {
            if (fullRoot) return fullRoot;
            var root = new android.widget.FrameLayout(opts.context || context);
            fullRoot = root;
            imageCanvas = createCanvas();
            var imageLp = new android.widget.FrameLayout.LayoutParams(-1, -1);
            imageLp.setMargins(0, dp22(56), 0, dp22(104));
            root.addView(imageCanvas, imageLp);

            var top = new android.widget.LinearLayout(opts.context || context);
            top.setOrientation(android.widget.LinearLayout.HORIZONTAL);
            top.setGravity(android.view.Gravity.CENTER_VERTICAL);
            top.setPadding(dp22(6), dp22(4), dp22(6), dp22(4));
            top.setBackground(roundBg22(colors.card, colors.stroke, 0));
            top.addView(button("返回", function() {
              try { if (typeof opts.onBack === "function") opts.onBack(); } catch (e0) { error("back_callback", e0); }
            }), new android.widget.LinearLayout.LayoutParams(dp22(72), dp22(48)));
            var title = new android.widget.TextView(opts.context || context);
            title.setText("截图原图");
            safeText22(title, colors.text);
            title.setTextSize(16);
            title.setGravity(android.view.Gravity.CENTER);
            top.addView(title, new android.widget.LinearLayout.LayoutParams(0, dp22(48), 1));
            top.addView(button("关闭", function() {
              try { if (typeof opts.onCloseSession === "function") opts.onCloseSession(); } catch (e0) { error("close_callback", e0); }
            }), new android.widget.LinearLayout.LayoutParams(dp22(72), dp22(48)));
            root.addView(top, new android.widget.FrameLayout.LayoutParams(-1, dp22(56), android.view.Gravity.TOP));

            var bottom = new android.widget.LinearLayout(opts.context || context);
            bottom.setOrientation(android.widget.LinearLayout.VERTICAL);
            bottom.setPadding(dp22(6), dp22(3), dp22(6), dp22(4));
            bottom.setBackground(roundBg22(colors.card, colors.stroke, 0));

            var actions = new android.widget.LinearLayout(opts.context || context);
            actions.setOrientation(android.widget.LinearLayout.HORIZONTAL);
            shareButton = button("分享", function() { performShare(); }, colors.primary);
            saveButton = button(savedInfo ? "已保存" : "保存", function() { performSave(); }, colors.primary);
            deleteButton = button("删除", function() { showDeleteConfirm(); }, colors.danger);
            actions.addView(shareButton, new android.widget.LinearLayout.LayoutParams(0, dp22(44), 1));
            actions.addView(saveButton, new android.widget.LinearLayout.LayoutParams(0, dp22(44), 1));
            actions.addView(deleteButton, new android.widget.LinearLayout.LayoutParams(0, dp22(44), 1));
            bottom.addView(actions, new android.widget.LinearLayout.LayoutParams(-1, dp22(44)));

            actionStatusView = new android.widget.TextView(opts.context || context);
            safeText22(actionStatusView, colors.secondary);
            actionStatusView.setTextSize(11);
            actionStatusView.setGravity(android.view.Gravity.CENTER);
            actionStatusView.setSingleLine(true);
            actionStatusView.setText(savedInfo ? "已保存到公共目录" : "保存副本不会被自动清理");
            bottom.addView(actionStatusView, new android.widget.LinearLayout.LayoutParams(-1, dp22(24)));

            infoView = new android.widget.TextView(opts.context || context);
            safeText22(infoView, colors.secondary);
            infoView.setTextSize(11);
            infoView.setGravity(android.view.Gravity.CENTER);
            infoView.setSingleLine(true);
            infoView.setText("双指缩放 · 单指平移 · 双击放大或复位");
            bottom.addView(infoView, new android.widget.LinearLayout.LayoutParams(-1, dp22(28)));
            root.addView(bottom, new android.widget.FrameLayout.LayoutParams(-1, dp22(104), android.view.Gravity.BOTTOM));
            updateInfo();
            return root;
          },
          open: function() {
            if (released || deleted) return false;
            decodeFull();
            try { if (fullRoot) fullRoot.setVisibility(android.view.View.VISIBLE); } catch (e0) {}
            return true;
          },
          back: function(reason) {
            dismissConfirm();
            try { if (fullRoot) fullRoot.setVisibility(android.view.View.GONE); } catch (e0) {}
            return true;
          },
          refreshLayout: function() {
            colors = theme22(appObj);
            try { if (thumbnailRoot) thumbnailRoot.setBackground(roundBg22(colors.card, colors.stroke, 14)); } catch (e0) {}
            try { if (imageCanvas) imageCanvas.invalidate(); } catch (e1) {}
            return true;
          },
          getImageInfo: function() {
            try { readBounds(); } catch (e0) {}
            return {
              path: path,
              width: sourceWidth,
              height: sourceHeight,
              fileSize: fileSize,
              sampleSize: baseSample,
              createdAt: Number(session.createdAt || 0),
              savedPublicPath: savedInfo ? savedInfo.publicPath : "",
              savedContentUri: savedInfo ? savedInfo.contentUri : "",
              deleted: deleted
            };
          },
          release: function(reason) {
            if (released) return true;
            released = true;
            generation++;
            regionSerial++;
            dismissConfirm();
            try { if (regionRunnable) handler.removeCallbacks(regionRunnable); } catch (e0) {}
            regionRunnable = null;
            try { executor.shutdownNow(); } catch (e1) {}
            try { if (thumbnailImage) thumbnailImage.setImageDrawable(null); } catch (e2) {}
            safeRecycle22(thumbBitmap);
            safeRecycle22(regionBitmap);
            safeRecycle22(baseBitmap);
            safeClose22(regionDecoder);
            thumbBitmap = null;
            regionBitmap = null;
            baseBitmap = null;
            regionDecoder = null;
            thumbnailRoot = null;
            thumbnailImage = null;
            thumbnailStatus = null;
            fullRoot = null;
            imageCanvas = null;
            infoView = null;
            actionStatusView = null;
            saveButton = null;
            shareButton = null;
            deleteButton = null;
            log("i", "released reason=" + String(reason || "") + " path=" + path);
            return true;
          }
        };

        try { readBounds(); } catch (eBounds) { error("register", eBounds); }
        try {
          appObj.runPickwordImageCleanupNow({ force: false, activePath: path }, null);
        } catch (eCleanup) {}
        log("i", "controller created path=" + path + " createdAt=" + String(now22()));
        return controller;
      };

      proto.__toolHubPickwordImageViewerInstalled = true;
      return true;
    } catch (eInstall) {
      try { if (typeof safeLog === "function") safeLog(null, "e", "install pickword image viewer fail " + String(eInstall)); } catch (eLog) {}
      return false;
    }
  }

  install22();
})();
