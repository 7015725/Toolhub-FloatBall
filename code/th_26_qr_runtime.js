// @version 1.0.0
// =======================【拾字截图二维码解析 / ZXing Core】=======================
// Beta only. ZXing DEX/JAR is downloaded on demand to shortx.getShortXDir()/lib.
(function() {
  var QR_ASSET_ID26 = "toolhub-zxing-runtime";
  var QR_RUNTIME_CLASS26 = "toolhub.runtime.qr.ToolHubQrRuntime";
  var QR_MAX_PIXELS26 = 2000000;
  var QR_TIMEOUT_MS26 = 2500;
  var runtime26 = {
    loader: null,
    clazz: null,
    decodeMethod: null,
    versionMethod: null,
    version: "",
    loading: false,
    error: "",
    cache: {},
    installGeneration: 0
  };

  function now26() { return Number(java.lang.System.currentTimeMillis()); }

  function log26(appObj, level, message) {
    try { safeLog(appObj && appObj.L ? appObj.L : null, level, "pickword qr " + String(message || "")); } catch (e0) {}
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
    if (typeof shortx === "undefined" || !shortx || typeof shortx.getShortXDir !== "function") throw new Error("ShortX 根目录不可用");
    var base = new java.io.File(String(shortx.getShortXDir() || "")).getCanonicalFile();
    var lib = new java.io.File(base, "lib").getCanonicalFile();
    var basePath = String(base.getCanonicalPath());
    var libPath = String(lib.getCanonicalPath());
    if (libPath.indexOf(basePath + java.io.File.separator) !== 0) throw new Error("ShortX lib 目录越界");
    if (!lib.exists() && !lib.mkdirs() && !lib.exists()) throw new Error("无法创建 ShortX lib 目录");
    if (!lib.isDirectory()) throw new Error("ShortX lib 路径不是目录");
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
    var meta = runtimeMeta26();
    var lib = getLibDir26();
    var dest = new java.io.File(lib, meta.fileName).getCanonicalFile();
    if (String(dest.getCanonicalPath()).indexOf(String(lib.getCanonicalPath()) + java.io.File.separator) !== 0) throw new Error("二维码运行时目标路径越界");
    if (validRuntimeFile26(dest, meta)) return { file: dest, meta: meta };
    return { file: downloadRuntime26(meta, dest), meta: meta };
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

  function loadRuntime26(appObj) {
    if (runtime26.clazz && runtime26.decodeMethod) return runtime26;
    var installed = ensureRuntimeFile26();
    if (installed.file.canWrite()) throw new Error("二维码运行时文件必须只读");
    var codeCache = new java.io.File(context.getCodeCacheDir(), "toolhub_qr");
    if (!codeCache.exists() && !codeCache.mkdirs() && !codeCache.exists()) throw new Error("二维码运行时优化目录创建失败");
    var loader = new dalvik.system.DexClassLoader(
      installed.file.getAbsolutePath(),
      codeCache.getAbsolutePath(),
      null,
      context.getClassLoader()
    );
    var clazz = loader.loadClass(QR_RUNTIME_CLASS26);
    var decodeMethod = findMethod26(clazz, "decodeFile", 2);
    var versionMethod = findMethod26(clazz, "getVersion", 0);
    if (!decodeMethod || !versionMethod) throw new Error("二维码运行时接口不完整");
    var version = String(invokeStatic26(versionMethod, []) || "");
    if (installed.meta.version && version !== String(installed.meta.version)) throw new Error("二维码运行时版本不匹配");
    runtime26.loader = loader;
    runtime26.clazz = clazz;
    runtime26.decodeMethod = decodeMethod;
    runtime26.versionMethod = versionMethod;
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
        timeoutRunnable: null
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
      try {
        var loaded = loadRuntime26(appObj);
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
        runtime26.error = String(eDecode);
        result = { ok: false, code: "PICKWORD_QR_RUNTIME_UNAVAILABLE", text: "", format: "", error: String(eDecode).substring(0, 180) };
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

  function textButton26(appObj, label, color, onClick) {
    var view = new android.widget.TextView(context);
    view.setText(String(label || ""));
    view.setGravity(android.view.Gravity.CENTER);
    view.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
    view.setPadding(dp26(appObj, 8), dp26(appObj, 5), dp26(appObj, 8), dp26(appObj, 5));
    safeText26(view, color);
    view.setClickable(true);
    view.setBackground(round26(appObj, colors26(appObj).surface2, colors26(appObj).outlineVariant, 10));
    view.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
      try { onClick(); } catch (e0) { log26(appObj, "w", "button failed=" + String(e0)); }
    }}));
    return view;
  }

  function showToast26(text) {
    try { android.widget.Toast.makeText(context, String(text || ""), android.widget.Toast.LENGTH_SHORT).show(); } catch (e0) {}
  }

  function decorateThumbnail26(appObj, controller, opts, root) {
    if (!root || root.__toolHubQrDecorated26 === true) return root;
    var session = opts && opts.session ? opts.session : null;
    var key = imageKey26(session);
    if (!key) return root;
    root.__toolHubQrDecorated26 = true;
    var palette = colors26(appObj);

    var qrButton = textButton26(appObj, "解析二维码", palette.primary, function() {
      if (!imageKey26(session)) {
        qrButton.setVisibility(android.view.View.GONE);
        showToast26("截图已不可用");
        return;
      }
      qrButton.setText("解析中…");
      qrButton.setEnabled(false);
      qrButton.setAlpha(0.55);
      decodeAsync26(appObj, session, function(result) {
        qrButton.setEnabled(true);
        qrButton.setAlpha(1.0);
        if (result && result.ok === true) {
          qrButton.setText("重新解析");
          renderResult(result, true);
        } else {
          var code = String(result && result.code || "");
          qrButton.setText(code === "PICKWORD_QR_NOT_FOUND" ? "重试解析" : "重试解析");
          renderResult(result || { ok: false, code: "PICKWORD_QR_RUNTIME_UNAVAILABLE" }, true);
        }
      });
    });
    var qrLp = new android.widget.FrameLayout.LayoutParams(-2, dp26(appObj, 36), android.view.Gravity.RIGHT | android.view.Gravity.BOTTOM);
    qrLp.setMargins(dp26(appObj, 4), dp26(appObj, 4), dp26(appObj, 6), dp26(appObj, 4));
    root.addView(qrButton, qrLp);

    var card = new android.widget.LinearLayout(context);
    card.setOrientation(android.widget.LinearLayout.VERTICAL);
    card.setPadding(dp26(appObj, 10), dp26(appObj, 7), dp26(appObj, 10), dp26(appObj, 6));
    card.setBackground(round26(appObj, palette.surface, palette.outlineVariant, 12));
    card.setVisibility(android.view.View.GONE);
    var titleRow = new android.widget.LinearLayout(context);
    titleRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    titleRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
    var title = new android.widget.TextView(context);
    title.setText("二维码内容");
    title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
    safeText26(title, palette.onSurface2);
    titleRow.addView(title, new android.widget.LinearLayout.LayoutParams(0, dp26(appObj, 22), 1));
    var back = textButton26(appObj, "查看截图", palette.primary, function() {
      card.setVisibility(android.view.View.GONE);
      qrButton.setVisibility(android.view.View.VISIBLE);
    });
    titleRow.addView(back, new android.widget.LinearLayout.LayoutParams(dp26(appObj, 68), dp26(appObj, 24)));
    card.addView(titleRow, new android.widget.LinearLayout.LayoutParams(-1, dp26(appObj, 24)));
    var body = new android.widget.TextView(context);
    body.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    body.setMaxLines(2);
    try { body.setEllipsize(android.text.TextUtils.TruncateAt.END); } catch (eEllipsize) {}
    safeText26(body, palette.onSurface);
    body.setGravity(android.view.Gravity.CENTER_VERTICAL);
    body.setPadding(0, dp26(appObj, 2), 0, dp26(appObj, 2));
    card.addView(body, new android.widget.LinearLayout.LayoutParams(-1, 0, 1));
    var actions = new android.widget.LinearLayout(context);
    actions.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    actions.setGravity(android.view.Gravity.CENTER_VERTICAL);
    var copyBtn = textButton26(appObj, "复制结果", palette.primary, function() {
      var cached = runtime26.cache[key];
      var text = cached && cached.result ? String(cached.result.text == null ? "" : cached.result.text) : "";
      if (!text) return;
      if (setClipboard26(text)) showToast26("已复制二维码内容");
    });
    var loadBtn = textButton26(appObj, "载入拾字", palette.primary, function() {
      var cached = runtime26.cache[key];
      if (!cached || !cached.result || cached.result.ok !== true) return;
      if (!cached.loaded) {
        var ps = appObj.state && appObj.state.pickword ? appObj.state.pickword : null;
        cached.snapshot = {
          text: ps ? String(ps.fullText == null ? "" : ps.fullText) : "",
          meta: shallowCopy26(session)
        };
        cached.loaded = true;
        cancelQr26(appObj, "load_qr_text");
        try { if (typeof appObj.hidePickwordWindow === "function") appObj.hidePickwordWindow("qr_load"); } catch (eHide) {}
        appObj.showPickwordText(String(cached.result.text == null ? "" : cached.result.text), shallowCopy26(session));
      } else if (cached.snapshot) {
        cached.loaded = false;
        var snapshot = cached.snapshot;
        cancelQr26(appObj, "restore_qr_text");
        try { if (typeof appObj.hidePickwordWindow === "function") appObj.hidePickwordWindow("qr_restore"); } catch (eHide2) {}
        appObj.showPickwordText(String(snapshot.text == null ? "" : snapshot.text), shallowCopy26(snapshot.meta));
      }
    });
    actions.addView(copyBtn, new android.widget.LinearLayout.LayoutParams(0, dp26(appObj, 28), 1));
    actions.addView(loadBtn, new android.widget.LinearLayout.LayoutParams(0, dp26(appObj, 28), 1));
    card.addView(actions, new android.widget.LinearLayout.LayoutParams(-1, dp26(appObj, 30)));
    root.addView(card, new android.widget.FrameLayout.LayoutParams(-1, -1));

    function renderResult(result, showCard) {
      var ok = result && result.ok === true;
      var code = String(result && result.code || "");
      if (ok) {
        title.setText("二维码内容 · " + String(result.format || "QR_CODE"));
        body.setText(String(result.text == null ? "" : result.text));
        safeText26(body, palette.onSurface);
        copyBtn.setVisibility(android.view.View.VISIBLE);
        loadBtn.setVisibility(android.view.View.VISIBLE);
        var cached = runtime26.cache[key];
        loadBtn.setText(cached && cached.loaded ? "恢复原文" : "载入拾字");
      } else {
        title.setText("二维码解析");
        var message = "解析失败";
        if (code === "PICKWORD_QR_NOT_FOUND") message = "未识别到二维码";
        else if (code === "PICKWORD_QR_IMAGE_UNAVAILABLE") message = "截图已不可用";
        else if (code === "PICKWORD_QR_TIMEOUT") message = "解析超时，请重试";
        else if (code === "PICKWORD_QR_IMAGE_DECODE_FAILED") message = "图片解码失败";
        else if (code === "PICKWORD_QR_RUNTIME_UNAVAILABLE") message = "二维码运行时不可用";
        body.setText(message);
        safeText26(body, palette.danger);
        copyBtn.setVisibility(android.view.View.GONE);
        loadBtn.setVisibility(android.view.View.GONE);
      }
      if (showCard) {
        qrButton.setVisibility(android.view.View.GONE);
        card.setVisibility(android.view.View.VISIBLE);
      }
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

    var cached = runtime26.cache[key];
    if (cached && cached.result) renderResult(cached.result, false);
    return root;
  }

  function decorateController26(appObj, controller, opts) {
    if (!controller || controller.__toolHubQrDecorated26 === true) return controller;
    controller.__toolHubQrDecorated26 = true;
    var originalCreate = controller.createThumbnailView;
    if (typeof originalCreate === "function") {
      controller.createThumbnailView = function() {
        var root = originalCreate.call(controller);
        return decorateThumbnail26(appObj, controller, opts || {}, root);
      };
    }
    var originalRelease = controller.release;
    if (typeof originalRelease === "function") {
      controller.release = function(reason) {
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
        var controller = originalControllerFactory.call(appObj, opts);
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
      proto.getPickwordQrRuntimeStatus = function() {
        return {
          loaded: !!runtime26.clazz,
          version: String(runtime26.version || ""),
          error: String(runtime26.error || ""),
          libDir: String(getLibDir26().getAbsolutePath())
        };
      };
      proto.__toolHubQrRuntimeInstalled26 = true;
      runtime26.installGeneration++;
      log26(null, "i", "installed generation=" + String(runtime26.installGeneration));
      return true;
    } catch (eInstall) {
      log26(null, "e", "install failed=" + String(eInstall));
      return false;
    }
  }

  install26();
})();
