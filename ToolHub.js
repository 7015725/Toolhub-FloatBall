// ToolHub - 入口文件 (加载子模块并执行)
// 将本文件粘贴到 ShortX 任务，子模块会自动从 git 下载到 ToolHub/code/
// 更新机制：HEAD 请求对比 Last-Modified，入口文件无需更新版本号

var GIT_BASE = "https://git.xin-blog.com/linshenjianlu/ShortX_ToolHub/raw/branch/main/code/";
var __dirChecked = false;

function getLogPath() {
    return shortx.getShortXDir() + "/ToolHub/logs/init.log";
}

function getLmPath(relPath) {
    return shortx.getShortXDir() + "/ToolHub/code/.lm_" + relPath;
}

function getShaPath(relPath) {
    return shortx.getShortXDir() + "/ToolHub/code/.sha_" + relPath;
}

function sha256File(path) {
    try {
        var md = java.security.MessageDigest.getInstance("SHA-256");
        var fis = new java.io.FileInputStream(path);
        var buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 8192);
        var n;
        while ((n = fis.read(buf)) !== -1) {
            md.update(buf, 0, n);
        }
        fis.close();
        var digest = md.digest();
        var sb = new java.lang.StringBuilder();
        for (var i = 0; i < digest.length; i++) {
            var hex = java.lang.Integer.toHexString(0xFF & digest[i]);
            if (hex.length() === 1) sb.append("0");
            sb.append(hex);
        }
        return sb.toString();
    } catch (e) {
        return null;
    }
}

function saveSha256(relPath, hash) {
    try {
        var f = new java.io.File(getShaPath(relPath));
        var w = new java.io.FileWriter(f, false);
        w.write(String(hash || ""));
        w.close();
    } catch (e) { safeLog(null, 'e', "catch " + String(e)); }
}

function getLocalSha256(relPath) {
    try {
        var f = new java.io.File(getShaPath(relPath));
        if (!f.exists()) return null;
        var r = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(f), "UTF-8"));
        var hash = r.readLine();
        r.close();
        return hash ? String(hash).trim() : null;
    } catch (e) { return null; }
}

function writeLog(msg) {
    try {
        var f = new java.io.File(getLogPath());
        var dir = f.getParentFile();
        if (dir && !dir.exists()) dir.mkdirs();
        var sdf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        var ts = sdf.format(new java.util.Date());
        var writer = new java.io.FileWriter(f, true);
        writer.write("[" + ts + "] " + String(msg) + "\n");
        writer.close();
     } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
}

function runShell(cmdArr) {
    try {
        var proc = java.lang.Runtime.getRuntime().exec(cmdArr);
        proc.waitFor();
        return proc.exitValue() === 0;
    } catch (e) { return false; }
}

function checkDirPerms(path) {
    try {
        var proc = java.lang.Runtime.getRuntime().exec(["stat", "-c", "%u %g %a", path]);
        proc.waitFor();
        var reader = new java.io.BufferedReader(new java.io.InputStreamReader(proc.getInputStream()));
        var line = reader.readLine();
        reader.close();
        if (line) {
            var parts = String(line).trim().split(/\s+/);
            if (parts.length >= 3) {
                return String(parts[0]) === "1000" && String(parts[1]) === "1000" && String(parts[2]) === "700";
            }
        }
     } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    return false;
}

function setDirPerms(path) {
    runShell(["chmod", "700", path]);
    runShell(["chown", "1000:1000", path]);
}

function getRemoteLastModified(urlStr) {
    try {
        var url = new java.net.URL(urlStr);
        var conn = url.openConnection();
        conn.setRequestMethod("HEAD");
        conn.setConnectTimeout(5000);
        conn.setReadTimeout(10000);
        conn.setRequestProperty("User-Agent", "ShortX-ToolHub/1.0");
        var code = conn.getResponseCode();
        if (code !== 200) return null;
        var lm = conn.getHeaderField("Last-Modified");
        return lm ? String(lm) : null;
    } catch (e) {
        return null;
    }
}

function getLocalLastModified(relPath) {
    try {
        var f = new java.io.File(getLmPath(relPath));
        if (!f.exists()) return null;
        var r = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(f), "UTF-8"));
        var lm = r.readLine();
        r.close();
        return lm ? String(lm).trim() : null;
    } catch (e) { return null; }
}

function saveLocalLastModified(relPath, lm) {
    try {
        var f = new java.io.File(getLmPath(relPath));
        var w = new java.io.FileWriter(f, false);
        w.write(String(lm || ""));
        w.close();
     } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
}

function downloadFile(urlStr, destFile) {
    var url = new java.net.URL(urlStr);
    var conn = url.openConnection();
    conn.setConnectTimeout(10000);
    conn.setReadTimeout(30000);
    conn.setRequestProperty("User-Agent", "ShortX-ToolHub/1.0");
    var code = conn.getResponseCode();
    if (code !== 200) throw "HTTP " + code;
    var expectedLen = conn.getContentLength();
    var inStream = conn.getInputStream();
    var outStream = new java.io.FileOutputStream(destFile);
    var buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 8192);
    var n, total = 0;
    while ((n = inStream.read(buf)) !== -1) {
        outStream.write(buf, 0, n); total += n;
    }
    outStream.close(); inStream.close();
    if (expectedLen > 0 && total !== expectedLen) {
        throw "Size mismatch: expected=" + expectedLen + ", got=" + total;
    }
    var checkStream = new java.io.FileInputStream(destFile);
    var checkBuf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 200);
    var checkRead = checkStream.read(checkBuf);
    checkStream.close();
    if (checkRead > 0) {
        var prefix = new java.lang.String(checkBuf, 0, checkRead, "UTF-8");
        if (prefix.indexOf("<!DOCTYPE") >= 0 || prefix.indexOf("<html") >= 0) {
            throw "Downloaded content is HTML, not JS";
        }
    }
    return total;
}

function loadScript(relPath) {
    try {
        var base = shortx.getShortXDir();
        var dir = new java.io.File(base + "/ToolHub/code/");

        if (!__dirChecked) {
            if (!dir.exists()) {
                dir.mkdirs();
                setDirPerms(dir.getAbsolutePath());
                writeLog("Created dir: " + dir.getAbsolutePath());
            } else if (!checkDirPerms(dir.getAbsolutePath())) {
                setDirPerms(dir.getAbsolutePath());
                writeLog("Fixed dir perms: " + dir.getAbsolutePath());
            }
            __dirChecked = true;
        }

        if (!dir.canWrite()) throw "Dir not writable: " + dir.getAbsolutePath();

        var f = new java.io.File(dir, relPath);
        var needsDownload = !f.exists();
        var isNew = !f.exists();

        // 本地文件存在时，HEAD 检查远程是否有更新
        if (!needsDownload) {
            try {
                var urlStr = GIT_BASE + relPath;
                var remoteLm = getRemoteLastModified(urlStr);
                var localLm = getLocalLastModified(relPath);
                if (remoteLm && remoteLm !== localLm) {
                    needsDownload = true;
                    writeLog("Update detected for " + relPath + ": remote=" + remoteLm + ", local=" + localLm);
                }
            } catch (netErr) {
                writeLog("Network check skipped for " + relPath + ": " + String(netErr));
            }
        }

        if (needsDownload) {
            try {
                var urlStr = GIT_BASE + relPath;
                writeLog("Downloading " + relPath + " from " + urlStr);
                var size = downloadFile(urlStr, f);
                var remoteLm = getRemoteLastModified(urlStr);
                if (remoteLm) saveLocalLastModified(relPath, remoteLm);
                var hash = sha256File(f.getAbsolutePath());
                if (hash) saveSha256(relPath, hash);
                writeLog("Downloaded " + relPath + " (" + size + " bytes, sha256=" + (hash || "null") + ")");
                // 记录更新信息
                __moduleUpdates.push({ module: relPath, isNew: isNew, size: size });
            } catch (dlErr) {
                if (!f.exists()) {
                    throw "Not found: " + f.getAbsolutePath() + ", download failed: " + dlErr;
                }
                writeLog("Download failed for " + relPath + ", using existing local file: " + String(dlErr));
            }
        }

        var fileSize = f.length();
        if (fileSize > 200 * 1024) {
            writeLog("WARN: " + relPath + " is " + (fileSize / 1024) + "KB, consider splitting");
        }

        var actualHash = sha256File(f.getAbsolutePath());
        var cachedHash = getLocalSha256(relPath);
        if (cachedHash && actualHash && actualHash !== cachedHash) {
            throw "SHA256 mismatch for " + relPath + ": expected=" + cachedHash + ", actual=" + actualHash;
        }
        if (actualHash && !cachedHash) {
            saveSha256(relPath, actualHash);
        }

        var r = new java.io.BufferedReader(new java.io.InputStreamReader(
            new java.io.FileInputStream(f), "UTF-8"));
        var sb = new java.lang.StringBuilder();
        var line;
        while ((line = r.readLine()) != null) sb.append(line).append("\n");
        r.close();
        var geval = eval;
        geval(String(sb.toString()));
    } catch(e) {
        var errMsg = "loadScript(" + relPath + ") failed: " + e;
        try { android.util.Log.e("ToolHub", errMsg); } catch(eLog) {}
        throw errMsg;
    }
}

var modules = ["th_01_base.js", "th_02_core.js", "th_03_icon.js", "th_04_theme.js", "th_05_persistence.js",
               "th_06_icon_parser.js", "th_07_shortcut.js", "th_08_content.js", "th_09_animation.js",
               "th_10_shell.js", "th_11_action.js", "th_12_rebuild.js", "th_13_panel_ui.js",
               "th_14_panels.js", "th_15_extra.js", "th_16_entry.js"];
var __moduleUpdates = [];
var loadErrors = [];
var criticalModules = { "th_01_base.js": true, "th_16_entry.js": true };
for (var i = 0; i < modules.length; i++) {
    try {
        loadScript(modules[i]);
    } catch (e) {
        var modErr = "Module load failed: " + modules[i] + " -> " + String(e);
        writeLog(modErr);
        try { android.util.Log.e("ToolHub", modErr); } catch(eLog) {}
        loadErrors.push({ module: modules[i], err: String(e) });
        if (criticalModules[modules[i]]) {
            throw "Critical module failed: " + modules[i] + " (" + String(e) + ")";
        }
    }
}

var __out = (function() {
  // 关键函数未加载成功时提前返回友好错误，避免 ReferenceError
  if (typeof getProcessInfo !== "function") {
    return {
      ok: false,
      started: false,
      msg: "ToolHub 启动失败",
      err: "核心函数 getProcessInfo 未定义，请检查 th_01_base.js 是否加载成功（网络下载失败或文件缺失）"
    };
  }
  if (typeof ToolHubLogger !== "function") {
    return {
      ok: false,
      started: false,
      msg: "ToolHub 启动失败",
      err: "核心类 ToolHubLogger 未定义，请检查 th_01_base.js 是否加载成功"
    };
  }
  if (typeof FloatBallAppWM !== "function") {
    return {
      ok: false,
      started: false,
      msg: "ToolHub 启动失败",
      err: "核心类 FloatBallAppWM 未定义，请检查 th_02_core.js / th_16_entry.js 是否加载成功"
    };
  }
  function optStr(v) {
    return (v === undefined || v === null) ? "" : String(v);
  }
  function summarizeModuleUpdates(list) {
    var names = [];
    var created = 0;
    var overwritten = 0;
    var i;
    for (i = 0; i < list.length; i++) {
      var item = list[i] || {};
      var name = optStr(item.module);
      if (name) names.push(name);
      if (item.isNew) created++; else overwritten++;
    }
    if (names.length === 0) {
      return {
        count: 0,
        modules: [],
        msg: "子模块已是最新，本次未覆盖更新。"
      };
    }
    return {
      count: names.length,
      modules: names,
      msg: "本次已覆盖更新 " + names.length + " 个子模块（新增 " + created + " / 覆盖 " + overwritten + "）：" + names.join("、")
    };
  }
  function summarizeLoadErrors(list) {
    var names = [];
    var i;
    for (i = 0; i < list.length; i++) {
      var item = list[i] || {};
      var name = optStr(item.module);
      if (name) names.push(name);
    }
    return {
      count: names.length,
      modules: names,
      msg: names.length ? ("有 " + names.length + " 个子模块加载失败：" + names.join("、")) : "所有子模块加载正常。"
    };
  }

  var entryInfo = getProcessInfo("entry");
  var logger = new ToolHubLogger(entryInfo);
  installCrashHandler(logger);
  var app = new FloatBallAppWM(logger);
  var closeRule = String(app.config.ACTION_CLOSE_ALL_RULE || "shortx.wm.floatball.CLOSE");
  var startRet = null;
  try {
    startRet = app.startAsync(entryInfo, closeRule);
  } catch (eTop) {
    try { logger.fatal("TOP startAsync crash err=" + String(eTop));  } catch(eLog) { safeLog(null, 'e', "catch " + String(eLog)); }
    startRet = { ok: false, err: String(eTop) };
  }
  var syncInfo = summarizeModuleUpdates(__moduleUpdates);
  var loadInfo = summarizeLoadErrors(loadErrors);
  var started = !!(startRet && startRet.ok);
  var rawMsg = optStr(startRet && startRet.msg);
  var out = {
    ok: started,
    started: started,
    msg: started ? (rawMsg ? ("ToolHub 启动成功：" + rawMsg) : "ToolHub 启动成功") : "ToolHub 启动失败",
    syncMsg: syncInfo.msg,
    updatedCount: syncInfo.count,
    updatedModules: syncInfo.modules,
    closeAction: optStr(startRet && startRet.closeAction),
    layout: startRet && startRet.layout || null
  };
  if (loadInfo.count > 0) {
    out.loadMsg = loadInfo.msg;
    out.loadErrors = loadInfo.modules;
    if (!started) {
      out.err = loadInfo.modules.join(", ");
    }
  }
  if (!started && !out.err) out.err = optStr(startRet && startRet.err) || "未知错误";
  return out;
})();

JSON.stringify(__out);
