// @version 1.0.14
// =======================【拾字截图二维码解析/生成 / ZXing Core】=======================
// Beta only. ZXing DEX/JAR is preflighted asynchronously under the active ToolHub channel root: getToolHubRootDir()/lib.
(function() {
  var QR_ASSET_ID26 = "toolhub-zxing-runtime";
  var QR_RUNTIME_CLASS26 = "toolhub.runtime.qr.ToolHubQrRuntime";
  var QR_MAX_PIXELS26 = 2000000;
  var QR_TIMEOUT_MS26 = 2500;
  var QR_GEN_TEXT_MAX26 = 1000;
  var QR_GEN_SIZE_MIN26 = 128;
  var QR_GEN_SIZE_DEFAULT26 = 512;
  var QR_GEN_SIZE_MAX26 = 1024;
  var QR_WRITER_CLASS26 = "toolhub.runtime.shaded.zxing.qrcode.QRCodeWriter";
  var QR_FORMAT_CLASS26 = "toolhub.runtime.shaded.zxing.BarcodeFormat";
  var QR_HINTS_CLASS26 = "toolhub.runtime.shaded.zxing.EncodeHintType";
  var runtime26 = {
    loader: null,
    clazz: null,
    decodeMethod: null,
    versionMethod: null,
    writerClass: null,
    formatClass: null,
    hintsClass: null,
    version: "",
    loading: false,
    error: "",
    cache: {},
    installGeneration: 0,
    installLock: new java.util.concurrent.locks.ReentrantLock(),
    preflightThread: null,
    preflightStatus: "idle",
    preflightError: "",
    preflightReason: "",
    preflightCheckedAt: 0,
    preflightDownloaded: false
  };

  function now26() { return Number(java.lang.System.currentTimeMillis()); }

  function sanitizeError26(error) {
    var text = "";
    try { text = String(error == null ? "" : error); } catch (e0) { text = "runtime error"; }
    text = text.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
    if (text.length > 220) text = text.substring(0, 220);
    return text;
  }

  function log26(appObj, level, message) {
    var text = "pickword qr " + String(message || "");
    var appLogged = false;
    try {
      if (appObj && appObj.L) {
        safeLog(appObj.L, level, text);
        appLogged = true;
      }
    } catch (e0) { appLogged = false; }
    if (!appLogged) {
      try { if (typeof writeLog === "function") writeLog("[" + String(level || "i").toUpperCase() + "] " + text); } catch (e1) {}
    }
  }

  function dp26(appObj, value) {
    try { if (appObj && appObj.dp) return appObj.dp(value); } catch (e0) {}
    var density = 1;
    try { density = Number(context.getResources().getDisplayMetrics().density || 1); } catch (e1) {}
    return Math.max(1, Math.round(Number(value || 0) * density));
  }

  function colors26(appObj) {
    try {
      var scheme = appObj && appObj.getSettingsColorScheme ? appObj.getSettingsColorScheme() : null;
      if (scheme) return scheme;
    } catch (e0) {}
    return {
      surface: (0xFFFFFFFF | 0), surface2: (0xFFF1F5F9 | 0), onSurface: (0xFF111827 | 0),
      onSurface2: (0xFF64748B | 0), primary: (0xFF005BC0 | 0), onPrimary: (0xFFFFFFFF | 0),
      danger: (0xFFBA1A1A | 0), outlineVariant: (0x22000000 | 0)
    };
  }

  function safeText26(view, color) {
    try { toolhubSafeSetTextColor(view, Number(color) | 0); } catch (e0) {}
  }

  function round26(appObj, fill, stroke, radius) {
    var gd = new android.graphics.drawable.GradientDrawable();
    try { toolhubSafeSetGradientColor(gd, Number(fill) | 0); } catch (e0) {}
    try { gd.setCornerRadius(dp26(appObj, radius || 12)); } catch (e1) {}
    try { toolhubSafeSetGradientStroke(gd, dp26(appObj, 1), Number(stroke) | 0); } catch (e2) {}
    return gd;
  }

  function shallowCopy26(source) {
    var out = {};
    if (!source || typeof source !== "object") return out;
    for (var key in source) {
      if (source.hasOwnProperty && !source.hasOwnProperty(key)) continue;
      out[key] = source[key];
    }
    return out;
  }

  function fileSha25626(file) {
    try {
      if (typeof sha256File === "function") return String(sha256File(file.getAbsolutePath()) || "").toLowerCase();
    } catch (e0) {}
    var input = null;
    try {
      var md = java.security.MessageDigest.getInstance("SHA-256");
      input = new java.io.FileInputStream(file);
      var buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 8192);
      var n;
      while ((n = input.read(buffer)) !== -1) md.update(buffer, 0, n);
      var bytes = md.digest();
      var text = "";
      for (var i = 0; i < bytes.length; i++) {
        var one = Number(bytes[i]) & 255;
        var hex = one.toString(16);
        if (hex.length < 2) hex = "0" + hex;
        text += hex;
      }
      return text.toLowerCase();
    } catch (e1) {
      return "";
    } finally {
      try { if (input) input.close(); } catch (e2) {}
    }
  }

  function basename26(path) {
    try { return String(new java.io.File(String(path || "")).getName() || ""); } catch (e0) {}
    return "";
  }

  function getLibDir26() {
    if (typeof getToolHubRootDir !== "function") throw new Error("ToolHub 通道根目录不可用");
    var root = new java.io.File(String(getToolHubRootDir() || "")).getCanonicalFile();
    var lib = new java.io.File(root, "lib").getCanonicalFile();
    var rootPath = String(root.getCanonicalPath());
    var libPath = String(lib.getCanonicalPath());
    if (libPath.indexOf(rootPath + java.io.File.separator) !== 0) throw new Error("ToolHub lib 目录越界");
    if (!lib.exists() && !lib.mkdirs() && !lib.exists()) throw new Error("无法创建 ToolHub lib 目录");
    if (!lib.isDirectory()) throw new Error("ToolHub lib 路径不是目录");
    if (typeof assertWritableDirPath === "function") assertWritableDirPath(libPath, "ToolHub QR lib");
    return lib;
  }

  function runtimeMeta26() {
    var manifest = null;
    try { manifest = __trustedManifest; } catch (e0) { manifest = null; }
    if (!manifest && typeof fetchTrustedManifest === "function") {
      try { manifest = fetchTrustedManifest(); } catch (e1) { manifest = null; }
    }
    var all = manifest && manifest.runtimeFiles ? manifest.runtimeFiles : null;
    var meta = all ? all[QR_ASSET_ID26] : null;
    if (!meta) throw new Error("二维码运行时未进入可信清单");
    var rel = String(meta.path || "");
    if (!/^runtime\/[A-Za-z0-9._\/-]+\.jar$/.test(rel) || rel.indexOf("..") >= 0) throw new Error("二维码运行时路径非法");
    var expectedSize = Number(meta.size || 0);
    var expectedHash = String(meta.sha256 || "").toLowerCase();
    if (!(expectedSize > 0) || expectedSize > 4 * 1024 * 1024) throw new Error("二维码运行时大小非法");
    if (!/^[0-9a-f]{64}$/.test(expectedHash)) throw new Error("二维码运行时 SHA-256 非法");
    if (Number(meta.minApi || 24) > Number(android.os.Build.VERSION.SDK_INT || 0)) throw new Error("当前 Android 版本不支持二维码运行时");
    return {
      path: rel,
      version: String(meta.version || ""),
      sha256: expectedHash,
      size: expectedSize,
      minApi: Number(meta.minApi || 24),
      fileName: basename26(rel)
    };
  }

  function validRuntimeFile26(file, meta) {
    try {
      if (!file || !file.exists() || !file.isFile()) return false;
      if (Number(file.length()) !== Number(meta.size)) return false;
      if (fileSha25626(file) !== String(meta.sha256)) return false;
      if (file.canWrite()) {
        try { file.setWritable(false, false); } catch (e0) {}
        try { file.setReadOnly(); } catch (e1) {}
      }
      return file.canWrite() !== true;
    } catch (e2) {}
    return false;
  }

  function syncOutput26(output) {
    output.flush();
    try { output.getFD().sync(); } catch (e0) { throw new Error("二维码运行时 fsync 失败: " + String(e0)); }
  }

  function downloadRuntime26(meta, destFile) {
    var lib = destFile.getParentFile();
    var tmp = new java.io.File(lib, "." + String(destFile.getName()) + ".tmp." + String(java.lang.System.nanoTime()));
    var backup = new java.io.File(lib, "." + String(destFile.getName()) + ".bak");
    var conn = null;
    var input = null;
    var output = null;
    var installed = false;
    var hadDest = false;
    try {
      if (tmp.exists()) tmp.delete();
      output = new java.io.FileOutputStream(tmp, false);
      try { tmp.setWritable(false, false); } catch (eReadonly0) {}
      try { tmp.setReadOnly(); } catch (eReadonly1) {}
      var root = String(GIT_ROOT || "");
      if (!root) throw new Error("更新源不可用");
      conn = new java.net.URL(String(root + meta.path) + "?_toolhub_qr=" + String(now26())).openConnection();
      conn.setUseCaches(false);
      conn.setConnectTimeout(10000);
      conn.setReadTimeout(30000);
      conn.setRequestProperty("User-Agent", "ShortX-ToolHub/qr-runtime");
      conn.setRequestProperty("Cache-Control", "no-cache, no-store, must-revalidate");
      var http = Number(conn.getResponseCode());
      if (http !== 200) throw new Error("二维码运行时下载 HTTP " + http);
      var contentLength = Number(conn.getContentLength());
      if (contentLength > 0 && contentLength !== Number(meta.size)) throw new Error("二维码运行时远端大小不匹配");
      input = conn.getInputStream();
      var buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 32768);
      var total = 0;
      var n;
      while ((n = input.read(buffer)) !== -1) {
        total += n;
        if (total > Number(meta.size)) throw new Error("二维码运行时下载超出可信大小");
        output.write(buffer, 0, n);
      }
      syncOutput26(output);
      try { output.close(); } catch (eClose0) {}
      output = null;
      try { input.close(); } catch (eClose1) {}
      input = null;
      if (total !== Number(meta.size)) throw new Error("二维码运行时下载大小不完整");
      if (fileSha25626(tmp) !== String(meta.sha256)) throw new Error("二维码运行时 SHA-256 校验失败");
      if (tmp.canWrite()) throw new Error("二维码运行时临时文件未只读");
      if (backup.exists() && !backup.delete()) throw new Error("无法清理二维码运行时备份");
      hadDest = destFile.exists();
      if (hadDest && !destFile.renameTo(backup)) throw new Error("无法备份旧二维码运行时");
      if (!tmp.renameTo(destFile)) throw new Error("无法安装二维码运行时");
      installed = true;
      try { destFile.setWritable(false, false); } catch (eReadonly2) {}
      try { destFile.setReadOnly(); } catch (eReadonly3) {}
      if (!validRuntimeFile26(destFile, meta)) throw new Error("二维码运行时安装后校验失败");
      try { if (backup.exists()) backup.delete(); } catch (eBackupDelete) {}
      return destFile;
    } catch (e0) {
      if (installed) {
        try { if (destFile.exists()) destFile.delete(); } catch (eDeleteNew) {}
      }
      if (hadDest && backup.exists()) {
        try { backup.renameTo(destFile); } catch (eRestore) {}
      }
      throw e0;
    } finally {
      try { if (output) output.close(); } catch (e1) {}
      try { if (input) input.close(); } catch (e2) {}
      try { if (conn && conn.disconnect) conn.disconnect(); } catch (e3) {}
      try { if (tmp.exists()) tmp.delete(); } catch (e4) {}
      try { if (backup.exists() && destFile.exists()) backup.delete(); } catch (e5) {}
    }
  }

  function ensureRuntimeFile26() {
    runtime26.installLock.lock();
    try {
      var meta = runtimeMeta26();
      var lib = getLibDir26();
      var dest = new java.io.File(lib, meta.fileName).getCanonicalFile();
      if (String(dest.getCanonicalPath()).indexOf(String(lib.getCanonicalPath()) + java.io.File.separator) !== 0) throw new Error("二维码运行时目标路径越界");
      if (validRuntimeFile26(dest, meta)) return { file: dest, meta: meta, downloaded: false };
      return { file: downloadRuntime26(meta, dest), meta: meta, downloaded: true };
    } finally {
      runtime26.installLock.unlock();
    }
  }

  function preflightRuntime26(appObj, reason) {
    var why = String(reason || "startup");
    try {
      if (runtime26.preflightThread && runtime26.preflightThread.isAlive()) {
        log26(appObj, "d", "runtime preflight skip reason=busy requested=" + why);
        return true;
      }
    } catch (eBusy) {}
    runtime26.preflightStatus = "checking";
    runtime26.preflightError = "";
    runtime26.preflightReason = why;
    runtime26.preflightDownloaded = false;
    var worker = new java.lang.Thread(new java.lang.Runnable({ run: function() {
      try {
        var installed = ensureRuntimeFile26();
        runtime26.preflightStatus = "ready";
        runtime26.preflightError = "";
        runtime26.preflightCheckedAt = now26();
        runtime26.preflightDownloaded = installed.downloaded === true;
        log26(appObj, "i",
          "runtime preflight " + (installed.downloaded === true ? "downloaded" : "skip_existing") +
          " reason=" + why +
          " version=" + String(installed.meta.version || "") +
          " path=" + String(installed.file.getAbsolutePath()));
      } catch (ePreflight) {
        runtime26.preflightStatus = "failed";
        runtime26.preflightError = String(ePreflight);
        runtime26.preflightCheckedAt = now26();
        runtime26.preflightDownloaded = false;
        log26(appObj, "w", "runtime preflight failed reason=" + why + " error=" + String(ePreflight));
      } finally {
        runtime26.preflightThread = null;
      }
    }}), "ToolHub-ZXing-Preflight");
    runtime26.preflightThread = worker;
    worker.start();
    return true;
  }

  function findMethod26(clazz, name, parameterCount) {
    var methods = clazz.getMethods();
    for (var i = 0; i < methods.length; i++) {
      var method = methods[i];
      try {
        if (String(method.getName()) === String(name) && Number(method.getParameterTypes().length) === Number(parameterCount)) return method;
      } catch (e0) {}
    }
    return null;
  }

  function invokeStatic26(method, values) {
    var count = values ? values.length : 0;
    var args = java.lang.reflect.Array.newInstance(java.lang.Object, count);
    for (var i = 0; i < count; i++) args[i] = values[i];
    return method.invoke(null, args);
  }

  function getDexOptimizedDirectory26() {
    var sdk = Number(android.os.Build.VERSION.SDK_INT || 0);
    if (sdk >= 26) return null;
    var lib = getLibDir26();
    var dexopt = new java.io.File(lib, ".dexopt").getCanonicalFile();
    var libPath = String(lib.getCanonicalPath());
    var dexoptPath = String(dexopt.getCanonicalPath());
    if (dexoptPath.indexOf(libPath + java.io.File.separator) !== 0) throw new Error("二维码运行时优化目录越界");
    if (!dexopt.exists() && !dexopt.mkdirs() && !dexopt.exists()) throw new Error("二维码运行时优化目录创建失败");
    if (!dexopt.isDirectory()) throw new Error("二维码运行时优化路径不是目录");
    if (typeof assertWritableDirPath === "function") assertWritableDirPath(dexoptPath, "ToolHub QR dexopt");
    return dexoptPath;
  }

  function loadRuntime26(appObj) {
    if (runtime26.clazz && runtime26.decodeMethod) return runtime26;
    var installed = ensureRuntimeFile26();
    if (installed.file.canWrite()) throw new Error("二维码运行时文件必须只读");
    var optimizedDirectory = getDexOptimizedDirectory26();
    var loader = new Packages.dalvik.system.DexClassLoader(
      installed.file.getAbsolutePath(),
      optimizedDirectory,
      null,
      context.getClassLoader()
    );
    var clazz = loader.loadClass(QR_RUNTIME_CLASS26);
    var decodeMethod = findMethod26(clazz, "decodeFile", 2);
    var versionMethod = findMethod26(clazz, "getVersion", 0);
    if (!decodeMethod || !versionMethod) throw new Error("二维码运行时接口不完整");
    var version = String(invokeStatic26(versionMethod, []) || "");
    if (installed.meta.version && version !== String(installed.meta.version)) throw new Error("二维码运行时版本不匹配");
    var writerClass = null;
    var formatClass = null;
    var hintsClass = null;
    try {
      writerClass = loader.loadClass(QR_WRITER_CLASS26);
      formatClass = loader.loadClass(QR_FORMAT_CLASS26);
      hintsClass = loader.loadClass(QR_HINTS_CLASS26);
    } catch (eGen) {
      writerClass = null;
      formatClass = null;
      hintsClass = null;
      log26(appObj, "w", "runtime generate classes unavailable error=" + sanitizeError26(eGen));
    }
    runtime26.loader = loader;
    runtime26.clazz = clazz;
    runtime26.decodeMethod = decodeMethod;
    runtime26.versionMethod = versionMethod;
    runtime26.writerClass = writerClass;
    runtime26.formatClass = formatClass;
    runtime26.hintsClass = hintsClass;
    runtime26.version = version;
    runtime26.error = "";
    log26(appObj, "i", "runtime loaded version=" + version + " path=" + String(installed.file.getAbsolutePath()));
    return runtime26;
  }

  function imageKey26(session) {
    try {
      var raw = String(session && session.internalPath || "");
      if (!raw) return "";
      var file = new java.io.File(raw).getCanonicalFile();
      if (!file.exists() || !file.isFile() || file.length() <= 0) return "";
      var base = new java.io.File(String(APP_ROOT_DIR || ""), "screenshots").getCanonicalFile();
      var filePath = String(file.getCanonicalPath());
      if (filePath.indexOf(String(base.getCanonicalPath()) + java.io.File.separator) !== 0) return "";
      return filePath + "#" + String(file.lastModified()) + "#" + String(file.length());
    } catch (e0) {}
    return "";
  }

  function ensureQrState26(appObj, session) {
    if (!appObj.state) appObj.state = {};
    if (!appObj.state.pickword) appObj.state.pickword = { generation: 0, showing: false, fullText: "", meta: null };
    var ps = appObj.state.pickword;
    if (!ps.qr) {
      ps.qr = {
        seq: 0,
        runningToken: 0,
        doneToken: 0,
        imageKey: "",
        status: "idle",
        result: null,
        thread: null,
        timeoutRunnable: null,
        genSeq: 0,
        genRunningToken: 0,
        genDoneToken: 0,
        genStatus: "idle",
        genPath: "",
        genThread: null,
        genSnapshot: null
      };
    }
    ps.qr.imageKey = imageKey26(session || ps.meta);
    return ps.qr;
  }

  function cancelQr26(appObj, reason) {
    try {
      var qr = ensureQrState26(appObj, null);
      qr.seq = Number(qr.seq || 0) + 1;
      qr.runningToken = 0;
      qr.status = "cancelled";
      if (qr.timeoutRunnable) {
        try { new android.os.Handler(android.os.Looper.getMainLooper()).removeCallbacks(qr.timeoutRunnable); } catch (e0) {}
      }
      qr.timeoutRunnable = null;
      if (qr.thread) {
        try { qr.thread.interrupt(); } catch (e1) {}
      }
      qr.thread = null;
      if (qr.genStatus === "running") qr.genStatus = "cancelled";
      qr.genRunningToken = 0;
      if (qr.genThread) {
        try { qr.genThread.interrupt(); } catch (eGenThread) {}
      }
      qr.genThread = null;
      log26(appObj, "d", "cancel reason=" + String(reason || ""));
    } catch (e2) {}
  }

  function currentSessionMatches26(appObj, generation, key, token) {
    try {
      var ps = appObj.state && appObj.state.pickword;
      if (!ps || Number(ps.generation || 0) !== Number(generation)) return false;
      var qr = ps.qr;
      if (!qr || Number(qr.runningToken || 0) !== Number(token)) return false;
      if (String(imageKey26(ps.meta)) !== String(key)) return false;
      return true;
    } catch (e0) {}
    return false;
  }

  function decodeAsync26(appObj, session, callback) {
    var key = imageKey26(session);
    if (!key) {
      callback({ ok: false, code: "PICKWORD_QR_IMAGE_UNAVAILABLE", text: "", format: "" });
      return false;
    }
    var qr = ensureQrState26(appObj, session);
    cancelQr26(appObj, "replace");
    qr = ensureQrState26(appObj, session);
    var token = Number(qr.seq || 0) + 1;
    qr.seq = token;
    qr.runningToken = token;
    qr.doneToken = 0;
    qr.status = "running";
    var generation = Number(appObj.state.pickword.generation || 0);
    var mainHandler = new android.os.Handler(android.os.Looper.getMainLooper());
    var timeoutRunnable = new java.lang.Runnable({ run: function() {
      try {
        if (!currentSessionMatches26(appObj, generation, key, token)) return;
        qr.doneToken = token;
        qr.runningToken = 0;
        qr.status = "timeout";
        if (qr.thread) {
          try { qr.thread.interrupt(); } catch (eInterrupt) {}
        }
        qr.thread = null;
        qr.timeoutRunnable = null;
        callback({ ok: false, code: "PICKWORD_QR_TIMEOUT", text: "", format: "" });
      } catch (e0) {}
    }});
    qr.timeoutRunnable = timeoutRunnable;
    mainHandler.postDelayed(timeoutRunnable, QR_TIMEOUT_MS26);

    var worker = new java.lang.Thread(new java.lang.Runnable({ run: function() {
      var result = null;
      var decodeStage = "load_runtime";
      try {
        var loaded = loadRuntime26(appObj);
        decodeStage = "invoke_decode";
        var path = String(session.internalPath || "");
        var options = JSON.stringify({
          formats: ["QR_CODE"],
          maxPixels: QR_MAX_PIXELS26,
          tryHarderFallback: true,
          alsoInvertedFallback: true,
          returnRawBytesBase64: false
        });
        var raw = String(invokeStatic26(loaded.decodeMethod, [new java.lang.String(path), new java.lang.String(options)]) || "");
        result = JSON.parse(raw);
        if (!result || typeof result !== "object") throw new Error("二维码运行时返回值非法");
      } catch (eDecode) {
        var detail = sanitizeError26(eDecode);
        runtime26.error = detail;
        var libPath = "";
        try { libPath = String(getLibDir26().getAbsolutePath()); } catch (eLibPath) { libPath = "unavailable:" + sanitizeError26(eLibPath); }
        log26(appObj, "e", "runtime failure stage=" + decodeStage + " preflight=" + String(runtime26.preflightStatus || "idle") + " lib=" + libPath + " error=" + detail);
        result = { ok: false, code: "PICKWORD_QR_RUNTIME_UNAVAILABLE", text: "", format: "", error: "stage=" + decodeStage + " " + detail };
      }
      mainHandler.post(new java.lang.Runnable({ run: function() {
        try {
          if (!currentSessionMatches26(appObj, generation, key, token)) return;
          if (Number(qr.doneToken || 0) === token) return;
          qr.doneToken = token;
          qr.runningToken = 0;
          qr.thread = null;
          if (qr.timeoutRunnable) {
            try { mainHandler.removeCallbacks(qr.timeoutRunnable); } catch (eRemove) {}
          }
          qr.timeoutRunnable = null;
          if (result.ok === true) {
            result.code = "PICKWORD_QR_SUCCESS";
            result.imageKey = key;
            result.runtimeVersion = String(result.runtimeVersion || runtime26.version || "");
            runtime26.cache[key] = { result: result, loaded: false, snapshot: null, updatedAt: now26() };
            qr.status = "success";
            qr.result = result;
          } else {
            if (String(result.code || "") === "QR_NOT_FOUND") result.code = "PICKWORD_QR_NOT_FOUND";
            else if (String(result.code || "") === "QR_IMAGE_DECODE_FAILED") result.code = "PICKWORD_QR_IMAGE_DECODE_FAILED";
            else if (String(result.code || "") === "QR_RUNTIME_ERROR") result.code = "PICKWORD_QR_RUNTIME_UNAVAILABLE";
            qr.status = "failed";
            qr.result = result;
          }
          callback(result);
        } catch (eApply) {
          log26(appObj, "w", "apply result failed=" + String(eApply));
        }
      }}));
    }}), "ToolHub-Pickword-QR");
    qr.thread = worker;
    worker.start();
    return true;
  }

  function setClipboard26(text) {
    try {
      var cm = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE);
      cm.setPrimaryClip(android.content.ClipData.newPlainText("二维码内容", String(text == null ? "" : text)));
      return true;
    } catch (e0) {}
    return false;
  }

  function showToast26(text) {
    try { android.widget.Toast.makeText(context, String(text || ""), android.widget.Toast.LENGTH_SHORT).show(); } catch (e0) {}
  }

  function qrActionState26(appObj, session) {
    var key = imageKey26(session);
    var qr = ensureQrState26(appObj, session);
    var cached = key ? runtime26.cache[key] : null;
    var hasResult = !!(cached && cached.result && cached.result.ok === true && String(cached.result.text == null ? "" : cached.result.text));
    var status = qr ? String(qr.status || "idle") : "idle";
    if (status !== "running" && hasResult) status = "success";
    return {
      available: !!key,
      status: status,
      hasResult: hasResult,
      loaded: !!(cached && cached.loaded === true),
      hasText: !!pickwordFullText26(appObj),
      generating: !!qr && String(qr.genStatus || "idle") === "running",
      generateCanRestore: !!(qr && qr.genSnapshot && appObj.state && appObj.state.pickword && appObj.state.pickword.meta && String(appObj.state.pickword.meta.source || "") === "qr_generate"),
      generateSupported: !!(runtime26.writerClass && runtime26.formatClass && runtime26.hintsClass)
    };
  }

  function copyQrResult26(appObj, session) {
    var key = imageKey26(session);
    var cached = key ? runtime26.cache[key] : null;
    var text = cached && cached.result ? String(cached.result.text == null ? "" : cached.result.text) : "";
    if (!text) return false;
    if (setClipboard26(text)) {
      showToast26("已复制二维码内容");
      return true;
    }
    return false;
  }

  function toggleQrLoad26(appObj, session) {
    var key = imageKey26(session);
    var cached = key ? runtime26.cache[key] : null;
    if (!cached || !cached.result || cached.result.ok !== true) return false;
    if (!cached.loaded) {
      var ps = appObj.state && appObj.state.pickword ? appObj.state.pickword : null;
      cached.snapshot = {
        text: ps ? String(ps.fullText == null ? "" : ps.fullText) : "",
        meta: shallowCopy26(session)
      };
      cached.loaded = true;
      cancelQr26(appObj, "load_qr_text");
      var qrTextToLoad26 = String(cached.result.text == null ? "" : cached.result.text);
      log26(appObj, "i", "load text reuse_window textLen=" + String(qrTextToLoad26.length));
      appObj.showPickwordText(qrTextToLoad26, shallowCopy26(session));
      return true;
    }
    if (cached.snapshot) {
      cached.loaded = false;
      var snapshot = cached.snapshot;
      cancelQr26(appObj, "restore_qr_text");
      appObj.showPickwordText(String(snapshot.text == null ? "" : snapshot.text), shallowCopy26(snapshot.meta));
      return true;
    }
    return false;
  }

  function pickwordFullText26(appObj) {
    var ps = appObj && appObj.state && appObj.state.pickword ? appObj.state.pickword : null;
    return ps ? String(ps.fullText == null ? "" : ps.fullText) : "";
  }

  function clampGenerateSize26(size) {
    var value = Math.round(Number(size || 0));
    if (!(value > 0)) return QR_GEN_SIZE_DEFAULT26;
    if (value < QR_GEN_SIZE_MIN26) return QR_GEN_SIZE_MIN26;
    if (value > QR_GEN_SIZE_MAX26) return QR_GEN_SIZE_MAX26;
    return value;
  }

  function encodeQrMatrix26(text, size) {
    if (!runtime26.writerClass || !runtime26.formatClass || !runtime26.hintsClass) {
      throw new Error("二维码运行时缺少生成能力");
    }
    var writer = runtime26.writerClass.getDeclaredConstructor().newInstance();
    var format = runtime26.formatClass.getField("QR_CODE").get(null);
    var hints = new java.util.EnumMap(runtime26.hintsClass);
    hints.put(runtime26.hintsClass.getField("CHARACTER_SET").get(null), new java.lang.String("UTF-8"));
    var matrix = writer.encode(new java.lang.String(String(text == null ? "" : text)), format, size, size, hints);
    if (!matrix) throw new Error("二维码矩阵生成失败");
    return matrix;
  }

  function renderQrBitmap26(matrix, size) {
    var matrixWidth = Number(matrix.getWidth());
    var matrixHeight = Number(matrix.getHeight());
    if (!(matrixWidth > 0) || !(matrixHeight > 0)) throw new Error("二维码矩阵尺寸非法");
    var bitmap = android.graphics.Bitmap.createBitmap(size, size, android.graphics.Bitmap.Config.ARGB_8888);
    var canvas = new android.graphics.Canvas(bitmap);
    var paintBg = new android.graphics.Paint();
    paintBg.setAntiAlias(false);
    paintBg.setStyle(android.graphics.Paint.Style.FILL);
    toolhubSafeSetPaintColor(paintBg, 0xFFFFFFFF | 0);
    canvas.drawRect(0, 0, Number(size), Number(size), paintBg);
    var paint = new android.graphics.Paint();
    paint.setAntiAlias(false);
    paint.setStyle(android.graphics.Paint.Style.FILL);
    toolhubSafeSetPaintColor(paint, 0xFF000000 | 0);
    var scale = Number(size) / matrixWidth;
    for (var y = 0; y < matrixHeight; y++) {
      for (var x = 0; x < matrixWidth; x++) {
        if (matrix.get(x, y) === true) {
          canvas.drawRect(x * scale, y * scale, (x + 1) * scale + 0.5, (y + 1) * scale + 0.5, paint);
        }
      }
    }
    return bitmap;
  }

  function generateQrBitmap26(text, size) {
    var content = String(text == null ? "" : text).replace(/^[\r\n]+|[\r\n]+$/g, "");
    if (!content) return { ok: false, code: "PICKWORD_QR_TEXT_EMPTY", error: "文本内容为空" };
    if (content.length > QR_GEN_TEXT_MAX26) {
      return { ok: false, code: "PICKWORD_QR_TEXT_TOO_LONG", error: "文本超出二维码容量限制" };
    }
    var resolvedSize = clampGenerateSize26(size);
    var bitmap = renderQrBitmap26(encodeQrMatrix26(content, resolvedSize), resolvedSize);
    return { ok: true, code: "PICKWORD_QR_GENERATE_SUCCESS", bitmap: bitmap, width: resolvedSize, height: resolvedSize };
  }

  function saveGeneratedQrPng26(bitmap) {
    var base = new java.io.File(String(APP_ROOT_DIR || ""), "screenshots").getCanonicalFile();
    var basePath = String(base.getCanonicalPath());
    if (!base.exists() && !base.mkdirs() && !base.exists()) throw new Error("无法创建截图目录");
    var target = new java.io.File(base, "toolhub_qr_gen_" + String(now26()) + ".png").getCanonicalFile();
    if (String(target.getCanonicalPath()).indexOf(basePath + java.io.File.separator) !== 0) throw new Error("生成图片路径越界");
    var output = null;
    try {
      output = new java.io.FileOutputStream(target, false);
      if (!bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, output)) throw new Error("PNG 编码失败");
      output.flush();
      try { output.getFD().sync(); } catch (eSync) {}
    } finally {
      try { if (output) output.close(); } catch (eClose) {}
    }
    if (!target.isFile() || target.length() <= 0) throw new Error("生成图片写入失败");
    return target;
  }

  function genSessionMatches26(appObj, generation, token) {
    try {
      var ps = appObj.state && appObj.state.pickword;
      if (!ps || Number(ps.generation || 0) !== Number(generation)) return false;
      var qr = ps.qr;
      if (!qr || Number(qr.genRunningToken || 0) !== Number(token)) return false;
      return true;
    } catch (e0) {}
    return false;
  }

  function generateAsync26(appObj, session, text, callback) {
    var qr = ensureQrState26(appObj, session);
    var generation = Number(appObj.state.pickword.generation || 0);
    try { if (qr.genThread) qr.genThread.interrupt(); } catch (ePrev) {}
    var token = Number(qr.genSeq || 0) + 1;
    qr.genSeq = token;
    qr.genRunningToken = token;
    qr.genDoneToken = 0;
    qr.genStatus = "running";
    var mainHandler = new android.os.Handler(android.os.Looper.getMainLooper());
    var worker = new java.lang.Thread(new java.lang.Runnable({ run: function() {
      var result = null;
      try {
        loadRuntime26(appObj);
        var generated = generateQrBitmap26(text, QR_GEN_SIZE_DEFAULT26);
        if (generated.ok !== true) throw new Error(String(generated.error || "二维码生成失败"));
        var file = saveGeneratedQrPng26(generated.bitmap);
        try { generated.bitmap.recycle(); } catch (eRecycle) {}
        result = { ok: true, code: "PICKWORD_QR_GENERATE_SUCCESS", path: String(file.getAbsolutePath()), width: Number(generated.width), height: Number(generated.height) };
      } catch (eGen) {
        result = { ok: false, code: "PICKWORD_QR_GENERATE_FAILED", path: "", error: sanitizeError26(eGen) };
        log26(appObj, "e", "generate failure error=" + sanitizeError26(eGen));
      }
      mainHandler.post(new java.lang.Runnable({ run: function() {
        try {
          if (!genSessionMatches26(appObj, generation, token)) return;
          if (Number(qr.genDoneToken || 0) === token) return;
          qr.genDoneToken = token;
          qr.genRunningToken = 0;
          qr.genThread = null;
          qr.genStatus = result.ok === true ? "success" : "failed";
          qr.genPath = result.ok === true ? String(result.path || "") : "";
          callback(result);
        } catch (eApply) {
          log26(appObj, "w", "generate apply failed=" + String(eApply));
        }
      }}));
    }}), "ToolHub-Pickword-QR-Generate");
    qr.genThread = worker;
    worker.start();
    return true;
  }

  function decorateThumbnail26(appObj, controller, opts, root) {
    if (!root || (controller && controller.__toolHubQrThumbnailDecorated26 === true)) return root;
    var session = opts && opts.session ? opts.session : null;
    var key = imageKey26(session);
    if (!key) return root;
    var palette = colors26(appObj);

    var card = new android.widget.LinearLayout(context);
    card.setOrientation(android.widget.LinearLayout.VERTICAL);
    card.setPadding(dp26(appObj, 10), dp26(appObj, 8), dp26(appObj, 10), dp26(appObj, 8));
    card.setBackground(round26(appObj, palette.surface, palette.outlineVariant, 12));
    card.setVisibility(android.view.View.GONE);

    var title = new android.widget.TextView(context);
    title.setText("二维码内容");
    title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
    safeText26(title, palette.onSurface2);
    card.addView(title, new android.widget.LinearLayout.LayoutParams(-1, dp26(appObj, 24)));

    var body = new android.widget.TextView(context);
    body.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    body.setMaxLines(2);
    try { body.setEllipsize(android.text.TextUtils.TruncateAt.END); } catch (eEllipsize) {}
    safeText26(body, palette.onSurface);
    body.setGravity(android.view.Gravity.CENTER_VERTICAL);
    body.setPadding(0, dp26(appObj, 2), 0, dp26(appObj, 2));
    card.addView(body, new android.widget.LinearLayout.LayoutParams(-1, 0, 1));
    root.addView(card, new android.widget.FrameLayout.LayoutParams(-1, -1));

    function renderResult(result, showCard) {
      var ok = result && result.ok === true;
      var code = String(result && result.code || "");
      if (ok) {
        title.setText("二维码内容 · " + String(result.format || "QR_CODE"));
        body.setText(String(result.text == null ? "" : result.text));
        safeText26(body, palette.onSurface);
      } else if (result) {
        title.setText("二维码解析");
        var message = "解析失败";
        if (code === "PICKWORD_QR_NOT_FOUND") message = "未识别到二维码";
        else if (code === "PICKWORD_QR_IMAGE_UNAVAILABLE") message = "截图已不可用";
        else if (code === "PICKWORD_QR_TIMEOUT") message = "解析超时，请重试";
        else if (code === "PICKWORD_QR_IMAGE_DECODE_FAILED") message = "图片解码失败";
        else if (code === "PICKWORD_QR_RUNTIME_UNAVAILABLE") {
          message = "二维码运行时不可用";
          var runtimeDetail = sanitizeError26(result && result.error);
          if (runtimeDetail) message += "\n" + runtimeDetail.substring(0, 140);
        }
        body.setText(message);
        safeText26(body, palette.danger);
      }
      try { card.setVisibility(showCard === true ? android.view.View.VISIBLE : android.view.View.GONE); } catch (eCard) {}
    }

    body.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
      try {
        if (body.getMaxLines() <= 2) {
          body.setMaxLines(6);
          body.setEllipsize(null);
        } else {
          body.setMaxLines(2);
          body.setEllipsize(android.text.TextUtils.TruncateAt.END);
        }
      } catch (e0) {}
    }}));

    if (controller) {
      controller.__toolHubQrRender26 = function(result, showCard) {
        renderResult(result, showCard === true);
      };
      controller.__toolHubQrThumbnailDecorated26 = true;
    }
    var cached = runtime26.cache[key];
    if (cached && cached.result) renderResult(cached.result, false);
    return root;
  }

  function decorateController26(appObj, controller, opts) {
    if (!controller || controller.__toolHubQrDecorated26 === true) return controller;
    controller.__toolHubQrDecorated26 = true;
    var session = opts && opts.session ? opts.session : null;
    var actionStateListener = null;

    function notifyActionState26() {
      if (typeof actionStateListener !== "function") return;
      try { actionStateListener(qrActionState26(appObj, session)); } catch (eNotify) {}
    }

    controller.getPickwordQrActionState = function() {
      return qrActionState26(appObj, session);
    };
    controller.setPickwordQrActionStateListener = function(listener) {
      actionStateListener = typeof listener === "function" ? listener : null;
      notifyActionState26();
      return true;
    };
    controller.performPickwordQrAction = function(action) {
      var name = String(action || "");
      if (name === "decode") {
        if (!imageKey26(session)) {
          showToast26("截图已不可用");
          notifyActionState26();
          return false;
        }
        try { if (controller.__toolHubQrRender26) controller.__toolHubQrRender26(null, false); } catch (eHideCard) {}
        var started = decodeAsync26(appObj, session, function(result) {
          try { if (controller.__toolHubQrRender26) controller.__toolHubQrRender26(result || { ok: false, code: "PICKWORD_QR_RUNTIME_UNAVAILABLE" }, true); } catch (eRender) {}
          notifyActionState26();
        });
        notifyActionState26();
        return started === true;
      }
      if (name === "copy") {
        var copied = copyQrResult26(appObj, session);
        notifyActionState26();
        return copied;
      }
      if (name === "toggle_load") {
        return toggleQrLoad26(appObj, session);
      }
      if (name === "generate") {
        var qrGenState = ensureQrState26(appObj, session);
        if (qrActionState26(appObj, session).generating) {
          showToast26("正在生成二维码");
          return false;
        }
        var psCur = appObj.state && appObj.state.pickword ? appObj.state.pickword : null;
        var curSource = psCur && psCur.meta ? String(psCur.meta.source || "") : "";
        if (curSource === "qr_generate" && qrGenState.genSnapshot) {
          var genSnapshot = qrGenState.genSnapshot;
          qrGenState.genSnapshot = null;
          cancelQr26(appObj, "restore_qr_generate");
          appObj.showPickwordText(String(genSnapshot.text == null ? "" : genSnapshot.text), shallowCopy26(genSnapshot.meta));
          showToast26("已返回拾字内容");
          notifyActionState26();
          return true;
        }
        var genText = pickwordFullText26(appObj);
        if (!genText) {
          showToast26("拾字内容为空");
          notifyActionState26();
          return false;
        }
        var genStarted = generateAsync26(appObj, session, genText, function(genResult) {
          try {
            if (!genResult || genResult.ok !== true) {
              showToast26("二维码生成失败");
              notifyActionState26();
              return;
            }
            try {
              qrGenState.genSnapshot = { text: genText, meta: shallowCopy26(session) };
              var genMeta = {
                internalPath: String(genResult.path),
                source: "qr_generate",
                createdAt: Number(now26()),
                screenshotOk: true,
                allowEmptyText: true,
                imageOnly: true
              };
              appObj.showPickwordText("", genMeta);
              showToast26("已生成二维码，点生成按钮可返回");
            } catch (eView) {
              log26(appObj, "w", "generate view failed=" + sanitizeError26(eView));
              showToast26("二维码已生成，打开查看失败");
            }
            notifyActionState26();
          } catch (eGenApply) {
            log26(appObj, "w", "generate callback failed=" + sanitizeError26(eGenApply));
          }
        });
        notifyActionState26();
        return genStarted === true;
      }
      return false;
    };

    var originalCreate = controller.createThumbnailView;
    if (typeof originalCreate === "function") {
      controller.createThumbnailView = function() {
        var root = originalCreate.call(controller);
        try {
          return decorateThumbnail26(appObj, controller, opts || {}, root);
        } catch (eDecorate) {
          log26(appObj, "w", "thumbnail decorate fail-open=" + String(eDecorate));
          return root;
        }
      };
    }
    var originalRelease = controller.release;
    if (typeof originalRelease === "function") {
      controller.release = function(reason) {
        actionStateListener = null;
        try { controller.__toolHubQrRender26 = null; } catch (eRenderClear) {}
        cancelQr26(appObj, "image_release_" + String(reason || ""));
        return originalRelease.call(controller, reason);
      };
    }
    return controller;
  }

  function install26() {
    try {
      if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return false;
      var proto = FloatBallAppWM.prototype;
      if (proto.__toolHubQrRuntimeInstalled26 === true) return true;
      if (typeof proto.createPickwordImageController !== "function") {
        log26(null, "w", "image controller unavailable; qr module not installed");
        return false;
      }
      var originalControllerFactory = proto.createPickwordImageController;
      proto.createPickwordImageController = function(opts) {
        var appObj = this;
        var originalDeleted = opts && opts.onDeleted;
        var originalClose = opts && opts.onCloseSession;
        if (opts) {
          opts.onDeleted = function(info) {
            try {
              var key = imageKey26(opts.session);
              if (key && runtime26.cache[key]) delete runtime26.cache[key];
              cancelQr26(appObj, "image_deleted");
            } catch (e0) {}
            try { if (typeof originalDeleted === "function") originalDeleted(info); } catch (e1) {}
          };
          opts.onCloseSession = function() {
            cancelQr26(appObj, "session_close");
            try { if (typeof originalClose === "function") originalClose(); } catch (e0) {}
          };
        }
        var controller = originalControllerFactory.call(this, opts);
        return decorateController26(appObj, controller, opts || {});
      };

      var originalHide = proto.hidePickwordWindow;
      if (typeof originalHide === "function") {
        proto.hidePickwordWindow = function(reason) {
          cancelQr26(this, "pickword_hide_" + String(reason || ""));
          return originalHide.call(this, reason);
        };
      }
      var originalDispose = proto.disposePickwordModule;
      if (typeof originalDispose === "function") {
        proto.disposePickwordModule = function(reason) {
          cancelQr26(this, "pickword_dispose_" + String(reason || ""));
          return originalDispose.call(this, reason);
        };
      }
      proto.ensurePickwordQrRuntimeReady = function(reason) {
        return preflightRuntime26(this, String(reason || "manual"));
      };
      proto.generateTextQRCode = function(text, size) {
        return generateQrBitmap26(String(text == null ? "" : text), clampGenerateSize26(size));
      };
      proto.getPickwordQrRuntimeStatus = function() {
        return {
          loaded: !!runtime26.clazz,
          version: String(runtime26.version || ""),
          error: String(runtime26.error || ""),
          libDir: String(getLibDir26().getAbsolutePath()),
          preflightStatus: String(runtime26.preflightStatus || "idle"),
          preflightError: String(runtime26.preflightError || ""),
          preflightReason: String(runtime26.preflightReason || ""),
          preflightCheckedAt: Number(runtime26.preflightCheckedAt || 0),
          preflightDownloaded: runtime26.preflightDownloaded === true
        };
      };
      proto.__toolHubQrRuntimeInstalled26 = true;
      runtime26.installGeneration++;
      log26(null, "i", "installed generation=" + String(runtime26.installGeneration));
      preflightRuntime26(null, "module_startup_or_update");
      return true;
    } catch (eInstall) {
      log26(null, "e", "install failed=" + String(eInstall));
      return false;
    }
  }

  install26();
})();