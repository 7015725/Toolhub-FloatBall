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
    } catch (e) {}
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
    } catch (e) {}
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
    } catch (e) {}
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
                writeLog("Downloaded " + relPath + " (" + size + " bytes)");
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

        var r = new java.io.BufferedReader(new java.io.InputStreamReader(
            new java.io.FileInputStream(f), "UTF-8"));
        var sb = new java.lang.StringBuilder();
        var line;
        while ((line = r.readLine()) != null) sb.append(line).append("\n");
        r.close();
        var geval = eval;
        geval(String(sb.toString()));
    } catch(e) {
        throw "loadScript(" + relPath + ") failed: " + e;
    }
}

var modules = ["th_01_base.js", "th_02_core.js", "th_03_icon.js", "th_04_theme.js", "th_05_persistence.js",
               "th_06_icon_parser.js", "th_07_shortcut.js", "th_08_content.js", "th_09_animation.js",
               "th_10_shell.js", "th_11_action.js", "th_12_rebuild.js", "th_13_panel_ui.js",
               "th_14_panels.js", "th_15_extra.js", "th_16_entry.js"];
var __moduleUpdates = [];
var loadErrors = [];
for (var i = 0; i < modules.length; i++) {
    try {
        loadScript(modules[i]);
    } catch (e) {
        writeLog("Module load failed: " + modules[i] + " -> " + String(e));
        loadErrors.push({ module: modules[i], err: String(e) });
        if (modules[i] === "th_16_entry.js") {
            throw "Critical module failed: " + modules[i];
        }
    }
}

var __out = (function() {
  var entryInfo = getProcessInfo("entry");
  var logger = new ToolHubLogger(entryInfo);
  installCrashHandler(logger);
  var app = new FloatBallAppWM(logger);
  var closeRule = String(app.config.ACTION_CLOSE_ALL_RULE || "shortx.wm.floatball.CLOSE");
  var startRet = null;
  try {
    startRet = app.startAsync(entryInfo, closeRule);
  } catch (eTop) {
    try { logger.fatal("TOP startAsync crash err=" + String(eTop)); } catch (eLog) {}
    startRet = { ok: false, err: String(eTop) };
  }
  function optStr(v) {
    return (v === undefined || v === null) ? "" : String(v);
  }
  var out = {
    ok: true,
    started: startRet && startRet.ok,
    msg: optStr(startRet && startRet.msg),
    closeAction: optStr(startRet && startRet.closeAction),
    layout: startRet && startRet.layout || null,
    updates: __moduleUpdates,
    errors: loadErrors
  };
  if (!out.started) out.err = optStr(startRet && startRet.err);
  return out;
})();

JSON.stringify(__out);
