// ToolHub - 入口文件 (加载子模块并执行)
// 将本文件放入 ShortX 任务，th_*.js 放入 ShortX 数据根目录/ToolHub/code/ 文件夹

var MODULE_MANIFEST = {
    "th_1_base.js": "1.0.0",
    "th_2_core.js": "1.0.0",
    "th_3_panels.js": "1.0.0",
    "th_4_extra.js": "1.0.0",
    "th_5_entry.js": "1.0.0"
};

var GIT_BASE = "https://git.xin-blog.com/linshenjianlu/ShortX_ToolHub/raw/branch/main/code/";
var __dirChecked = false;

function getLogPath() {
    return shortx.getShortXDir() + "/ToolHub/logs/init.log";
}

function writeLog(msg) {
    try {
        var f = new java.io.File(getLogPath());
        var dir = f.getParentFile();
        if (dir && !dir.exists()) {
            dir.mkdirs();
        }
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
    } catch (e) {
        return false;
    }
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
                var uid = String(parts[0]);
                var gid = String(parts[1]);
                var mode = String(parts[2]);
                return uid === "1000" && gid === "1000" && mode === "700";
            }
        }
    } catch (e) {}
    return false;
}

function setDirPerms(path) {
    runShell(["chmod", "700", path]);
    runShell(["chown", "1000:1000", path]);
}

function downloadFile(urlStr, destFile) {
    var url = new java.net.URL(urlStr);
    var conn = url.openConnection();
    conn.setConnectTimeout(10000);
    conn.setReadTimeout(30000);
    conn.setRequestProperty("User-Agent", "ShortX-ToolHub/1.0");
    var code = conn.getResponseCode();
    if (code !== 200) {
        throw "HTTP " + code;
    }
    var expectedLen = conn.getContentLength();
    var inStream = conn.getInputStream();
    var outStream = new java.io.FileOutputStream(destFile);
    var buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 8192);
    var n;
    var total = 0;
    while ((n = inStream.read(buf)) !== -1) {
        outStream.write(buf, 0, n);
        total += n;
    }
    outStream.close();
    inStream.close();
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

function getFileVersion(filePath) {
    try {
        var f = new java.io.File(filePath);
        if (!f.exists()) return null;
        var r = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(f), "UTF-8"));
        var line = r.readLine();
        r.close();
        if (line) {
            var lineStr = String(line);
            var idx = lineStr.indexOf("@version");
            if (idx >= 0) {
                var rest = lineStr.substring(idx + 8).trim();
                var spaceIdx = rest.indexOf(" ");
                var ver = spaceIdx >= 0 ? rest.substring(0, spaceIdx) : rest;
                return ver;
            }
        }
    } catch (e) {}
    return null;
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

        if (!dir.canWrite()) {
            throw "Dir not writable: " + dir.getAbsolutePath();
        }

        var f = new java.io.File(dir, relPath);
        var expectedVer = MODULE_MANIFEST[relPath];
        var localVer = getFileVersion(f.getAbsolutePath());
        var needsDownload = !f.exists();

        if (!needsDownload && expectedVer && localVer !== null && localVer !== expectedVer) {
            needsDownload = true;
            writeLog("Version mismatch for " + relPath + ": local=" + localVer + ", expected=" + expectedVer);
        }

        if (needsDownload) {
            try {
                var urlStr = GIT_BASE + relPath;
                writeLog("Downloading " + relPath + " from " + urlStr);
                var size = downloadFile(urlStr, f);
                writeLog("Downloaded " + relPath + " (" + size + " bytes)");
            } catch (dlErr) {
                throw "Not found: " + f.getAbsolutePath() + ", download failed: " + dlErr;
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
        while ((line = r.readLine()) != null) {
            sb.append(line).append("\n");
        }
        r.close();
        var geval = eval;
        geval(String(sb.toString()));
    } catch(e) {
        throw "loadScript(" + relPath + ") failed: " + e;
    }
}

var modules = ["th_1_base.js", "th_2_core.js", "th_3_panels.js", "th_4_extra.js", "th_5_entry.js"];
var loadErrors = [];
for (var i = 0; i < modules.length; i++) {
    try {
        loadScript(modules[i]);
    } catch (e) {
        writeLog("Module load failed: " + modules[i] + " -> " + String(e));
        loadErrors.push({ module: modules[i], err: String(e) });
        if (modules[i] === "th_5_entry.js") {
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
    layout: startRet && startRet.layout || null
  };

  if (!out.started) {
    out.err = optStr(startRet && startRet.err);
  }

  return out;
})();

JSON.stringify(__out);
