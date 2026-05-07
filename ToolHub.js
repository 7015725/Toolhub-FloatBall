// ToolHub - 入口文件 (加载子模块并执行)
// 安全更新机制：入口内置 RSA 公钥，先验证 manifest.json/manifest.sig，再按 SHA256 下载子模块。
// Gitea 只负责分发；未通过签名/哈希/防回滚校验时，不覆盖本地模块。

var GIT_ROOT = "https://git.xin-blog.com/linshenjianlu/ShortX_ToolHub/raw/branch/main/";
var GIT_BASE = GIT_ROOT + "code/";
var TRUSTED_PUBLIC_KEY_B64 = "MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEApiyhtMDJce7dVCxH1/oDu8kbiECYoT5XXmXvR/XNYuJ/5FuL83SbpCQ3QmUnqkbfNyOFqnxac/qlbXJtx6eeSotLP1HmrKI0LGymgxG6b1FfGHBfIKNZfBLIvzVDQob+HJfshlsS1JRlW5Jhm25TMh8dJCQQQZWW/ZItbtOvPYbLwG8cnqEdX8gqyB304+r2l35GPTfxZIGEK/9PcE3AMuqwTolMJsBHtG61hmMdz3dzTTEZQoOcciGWuwr2ZW8XkF6f5SgWkC29ZxZqAxceK4FJ8BsYirpFQxVKyZ6eiYlpNiYz+pHLP2U7JTO6ImmT1rlYSS6xw2tlWf0xq72nuOPC+VzEivuEhnC4y9WBSvauRa/ViIDgQ3yXl2MajuAvGSVWRfZ5Gz5Up8PQD7vxmHT2r0fA4xq4GIvUvGCqOG/d1FRrlVyEuNhCZ7KgpEKPno7fLnC6/ftnYcN5ZNOSWwjWH/e4fBxM5s6RRIYzIY2N0f/fqsRH42lWAhX5stujAgMBAAE=";
var __dirChecked = false;
var __trustedManifest = null;
var __securityStatus = { ok: false, msg: "安全清单尚未校验" };

function buildNoCacheUrl(urlStr) {
    var sep = String(urlStr).indexOf("?") >= 0 ? "&" : "?";
    return String(urlStr) + sep + "_toolhub_ts=" + java.lang.System.currentTimeMillis();
}

function getLogPath() { return shortx.getShortXDir() + "/ToolHub/logs/init.log"; }
function getCodeDirPath() { return shortx.getShortXDir() + "/ToolHub/code/"; }
function getTrustedShaPath(relPath) { return getCodeDirPath() + ".trusted_sha_" + relPath; }
function getTrustedVersionPath() { return getCodeDirPath() + ".trusted_manifest_version"; }

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
            if (parts.length >= 3) return String(parts[0]) === "1000" && String(parts[1]) === "1000" && String(parts[2]) === "700";
        }
    } catch (e) {}
    return false;
}

function setDirPerms(path) {
    runShell(["chmod", "700", path]);
    runShell(["chown", "1000:1000", path]);
}

function ensureCodeDir() {
    var dir = new java.io.File(getCodeDirPath());
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
    return dir;
}

function readTextFile(path) {
    try {
        var f = new java.io.File(path);
        if (!f.exists()) return null;
        var r = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(f), "UTF-8"));
        var sb = new java.lang.StringBuilder();
        var line;
        while ((line = r.readLine()) != null) sb.append(line).append("\n");
        r.close();
        return String(sb.toString());
    } catch (e) { return null; }
}

function writeTextFile(path, text) {
    try {
        var f = new java.io.File(path);
        var parent = f.getParentFile();
        if (parent && !parent.exists()) parent.mkdirs();
        var w = new java.io.OutputStreamWriter(new java.io.FileOutputStream(f, false), "UTF-8");
        w.write(String(text));
        w.close();
        return true;
    } catch (e) { return false; }
}

function readFirstLine(path) {
    var txt = readTextFile(path);
    if (!txt) return null;
    var parts = String(txt).split(/\r?\n/);
    return parts.length > 0 ? String(parts[0]).trim() : null;
}

function sha256File(fileOrPath) {
    try {
        var path = String(fileOrPath);
        var md = java.security.MessageDigest.getInstance("SHA-256");
        var fis = new java.io.FileInputStream(path);
        var buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 8192);
        var n;
        while ((n = fis.read(buf)) !== -1) md.update(buf, 0, n);
        fis.close();
        var digest = md.digest();
        var sb = new java.lang.StringBuilder();
        for (var i = 0; i < digest.length; i++) {
            var hex = java.lang.Integer.toHexString(0xFF & digest[i]);
            if (hex.length() === 1) sb.append("0");
            sb.append(hex);
        }
        return String(sb.toString());
    } catch (e) { return null; }
}

function saveTrustedSha(relPath, hash) { writeTextFile(getTrustedShaPath(relPath), String(hash || "")); }
function getTrustedSha(relPath) { return readFirstLine(getTrustedShaPath(relPath)); }
function getTrustedVersion() {
    var line = readFirstLine(getTrustedVersionPath());
    var v = line ? parseInt(String(line), 10) : 0;
    return isNaN(v) ? 0 : v;
}
function saveTrustedVersion(v) { writeTextFile(getTrustedVersionPath(), String(v || 0)); }

function downloadText(urlStr) {
    var url = new java.net.URL(buildNoCacheUrl(urlStr));
    var conn = url.openConnection();
    conn.setUseCaches(false);
    conn.setConnectTimeout(10000);
    conn.setReadTimeout(30000);
    conn.setRequestProperty("User-Agent", "ShortX-ToolHub/secure-updater");
    conn.setRequestProperty("Cache-Control", "no-cache, no-store, must-revalidate");
    conn.setRequestProperty("Pragma", "no-cache");
    var code = conn.getResponseCode();
    if (code !== 200) throw "HTTP " + code;
    var r = new java.io.BufferedReader(new java.io.InputStreamReader(conn.getInputStream(), "UTF-8"));
    var sb = new java.lang.StringBuilder();
    var line;
    while ((line = r.readLine()) != null) sb.append(line).append("\n");
    r.close();
    var text = String(sb.toString());
    var prefix = text.length > 200 ? text.substring(0, 200) : text;
    if (prefix.indexOf("<!DOCTYPE") >= 0 || prefix.indexOf("<html") >= 0) throw "Downloaded content is HTML";
    return text;
}

function downloadFile(urlStr, destFile) {
    var url = new java.net.URL(buildNoCacheUrl(urlStr));
    var conn = url.openConnection();
    conn.setUseCaches(false);
    conn.setConnectTimeout(10000);
    conn.setReadTimeout(30000);
    conn.setRequestProperty("User-Agent", "ShortX-ToolHub/secure-updater");
    conn.setRequestProperty("Cache-Control", "no-cache, no-store, must-revalidate");
    conn.setRequestProperty("Pragma", "no-cache");
    var code = conn.getResponseCode();
    if (code !== 200) throw "HTTP " + code;
    var expectedLen = conn.getContentLength();
    var inStream = conn.getInputStream();
    var outStream = new java.io.FileOutputStream(destFile);
    var buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 8192);
    var n, total = 0;
    while ((n = inStream.read(buf)) !== -1) { outStream.write(buf, 0, n); total += n; }
    outStream.close(); inStream.close();
    if (expectedLen > 0 && total !== expectedLen) throw "Size mismatch: expected=" + expectedLen + ", got=" + total;
    var checkStream = new java.io.FileInputStream(destFile);
    var checkBuf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 200);
    var checkRead = checkStream.read(checkBuf);
    checkStream.close();
    if (checkRead > 0) {
        var prefix = new java.lang.String(checkBuf, 0, checkRead, "UTF-8");
        if (prefix.indexOf("<!DOCTYPE") >= 0 || prefix.indexOf("<html") >= 0) throw "Downloaded content is HTML, not JS";
    }
    return total;
}

function base64Decode(s) {
    return android.util.Base64.decode(String(s).replace(/\s+/g, ""), android.util.Base64.DEFAULT);
}

function verifyManifestSignature(manifestText, sigText) {
    try {
        var pubBytes = base64Decode(TRUSTED_PUBLIC_KEY_B64);
        var sigBytes = base64Decode(sigText);
        var spec = new java.security.spec.X509EncodedKeySpec(pubBytes);
        var pubKey = java.security.KeyFactory.getInstance("RSA").generatePublic(spec);
        var verifier = java.security.Signature.getInstance("SHA256withRSA");
        verifier.initVerify(pubKey);
        verifier.update(new java.lang.String(String(manifestText)).getBytes("UTF-8"));
        return verifier.verify(sigBytes);
    } catch (e) {
        writeLog("Manifest signature verify exception: " + String(e));
        return false;
    }
}

function fetchTrustedManifest() {
    try {
        ensureCodeDir();
        var manifestText = downloadText(GIT_ROOT + "manifest.json");
        var sigText = downloadText(GIT_ROOT + "manifest.sig");
        if (!verifyManifestSignature(manifestText, sigText)) throw "manifest signature invalid";
        var manifest = JSON.parse(String(manifestText));
        if (!manifest || !manifest.files) throw "manifest files missing";
        if (String(manifest.alg || "") !== "SHA256withRSA") throw "unsupported manifest alg: " + String(manifest.alg);
        var version = parseInt(String(manifest.version || "0"), 10);
        if (isNaN(version) || version <= 0) throw "invalid manifest version";
        var localVersion = getTrustedVersion();
        if (localVersion > 0 && version < localVersion) throw "manifest rollback: remote=" + version + ", local=" + localVersion;
        __trustedManifest = manifest;
        __securityStatus = { ok: true, msg: "安全清单验签通过，version=" + version, version: version };
        writeLog(__securityStatus.msg);
        return manifest;
    } catch (e) {
        __trustedManifest = null;
        __securityStatus = { ok: false, msg: "安全清单校验失败，已停止远程拉取：" + String(e) };
        writeLog(__securityStatus.msg);
        return null;
    }
}

function replaceFile(tmpFile, destFile) {
    try {
        if (destFile.exists() && !destFile.delete()) throw "delete old file failed: " + destFile.getAbsolutePath();
        if (!tmpFile.renameTo(destFile)) throw "rename tmp failed: " + tmpFile.getAbsolutePath();
        return true;
    } catch (e) { throw String(e); }
}

function getManifestInfo(relPath) {
    if (!__trustedManifest || !__trustedManifest.files) return null;
    return __trustedManifest.files[relPath] || null;
}

function ensureVerifiedModule(relPath, destFile) {
    var info = getManifestInfo(relPath);
    if (!info || !info.sha256) throw "module not in trusted manifest: " + relPath;
    var expectedHash = String(info.sha256).toLowerCase();
    var expectedSize = Number(info.size || 0);
    var actualHash = destFile.exists() ? sha256File(destFile.getAbsolutePath()) : null;
    if (destFile.exists() && actualHash && String(actualHash).toLowerCase() === expectedHash) {
        saveTrustedSha(relPath, expectedHash);
        return { updated: false, size: destFile.length(), hash: actualHash };
    }

    var tmpFile = new java.io.File(destFile.getAbsolutePath() + ".tmp");
    try { if (tmpFile.exists()) tmpFile.delete(); } catch (eDelTmp0) {}
    var size = downloadFile(GIT_BASE + relPath, tmpFile);
    if (expectedSize > 0 && size !== expectedSize) {
        try { tmpFile.delete(); } catch (eDelSize) {}
        throw "manifest size mismatch for " + relPath + ": expected=" + expectedSize + ", got=" + size;
    }
    var tmpHash = sha256File(tmpFile.getAbsolutePath());
    if (!tmpHash || String(tmpHash).toLowerCase() !== expectedHash) {
        try { tmpFile.delete(); } catch (eDelHash) {}
        throw "manifest SHA256 mismatch for " + relPath + ": expected=" + expectedHash + ", actual=" + tmpHash;
    }
    var wasNew = !destFile.exists();
    replaceFile(tmpFile, destFile);
    saveTrustedSha(relPath, expectedHash);
    return { updated: true, isNew: wasNew, size: size, hash: tmpHash };
}

function ensureLocalTrustedModule(relPath, destFile) {
    if (!destFile.exists()) throw "安全清单不可用且本地模块不存在: " + relPath;
    var trustedHash = getTrustedSha(relPath);
    var actualHash = sha256File(destFile.getAbsolutePath());
    if (!trustedHash || !actualHash || String(trustedHash).toLowerCase() !== String(actualHash).toLowerCase()) {
        throw "安全清单不可用，本地模块也无可信 SHA256: " + relPath;
    }
    return { updated: false, size: destFile.length(), hash: actualHash };
}

function loadScript(relPath) {
    try {
        var dir = ensureCodeDir();
        var f = new java.io.File(dir, relPath);
        var result;
        if (__trustedManifest) result = ensureVerifiedModule(relPath, f);
        else result = ensureLocalTrustedModule(relPath, f);

        if (result.updated) {
            __moduleUpdates.push({ module: relPath, isNew: !!result.isNew, size: result.size });
            writeLog("Verified update " + relPath + " (" + result.size + " bytes, sha256=" + result.hash + ")");
        }

        var fileSize = f.length();
        if (fileSize > 200 * 1024) writeLog("WARN: " + relPath + " is " + (fileSize / 1024) + "KB, consider splitting");

        var code = readTextFile(f.getAbsolutePath());
        if (code === null) throw "read failed: " + f.getAbsolutePath();
        var geval = eval;
        geval(String(code));
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
fetchTrustedManifest();

for (var i = 0; i < modules.length; i++) {
    try {
        loadScript(modules[i]);
    } catch (e) {
        var modErr = "Module load failed: " + modules[i] + " -> " + String(e);
        writeLog(modErr);
        try { android.util.Log.e("ToolHub", modErr); } catch(eLog) {}
        loadErrors.push({ module: modules[i], err: String(e) });
        if (criticalModules[modules[i]]) throw "Critical module failed: " + modules[i] + " (" + String(e) + ")";
    }
}
if (__trustedManifest && loadErrors.length === 0) saveTrustedVersion(__trustedManifest.version);

var __out = (function() {
  if (typeof getProcessInfo !== "function") {
    return { ok: false, started: false, msg: "ToolHub 启动失败", securityMsg: __securityStatus.msg, err: "核心函数 getProcessInfo 未定义，请检查 th_01_base.js 是否加载成功" };
  }
  if (typeof ToolHubLogger !== "function") {
    return { ok: false, started: false, msg: "ToolHub 启动失败", securityMsg: __securityStatus.msg, err: "核心类 ToolHubLogger 未定义，请检查 th_01_base.js 是否加载成功" };
  }
  if (typeof FloatBallAppWM !== "function") {
    return { ok: false, started: false, msg: "ToolHub 启动失败", securityMsg: __securityStatus.msg, err: "核心类 FloatBallAppWM 未定义，请检查 th_02_core.js / th_16_entry.js 是否加载成功" };
  }
  function optStr(v) { return (v === undefined || v === null) ? "" : String(v); }
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
    if (names.length === 0) return { count: 0, modules: [], msg: "子模块已是最新，本次未覆盖更新。" };
    return { count: names.length, modules: names, msg: "本次已通过签名校验并覆盖更新 " + names.length + " 个子模块（新增 " + created + " / 覆盖 " + overwritten + "）：" + names.join("、") };
  }
  function summarizeLoadErrors(list) {
    var names = [];
    var i;
    for (i = 0; i < list.length; i++) {
      var item = list[i] || {};
      var name = optStr(item.module);
      if (name) names.push(name);
    }
    return { count: names.length, modules: names, msg: names.length ? ("有 " + names.length + " 个子模块加载失败：" + names.join("、")) : "所有子模块加载正常。" };
  }

  var entryInfo = getProcessInfo("entry");
  var logger = new ToolHubLogger(entryInfo);
  installCrashHandler(logger);
  var app = new FloatBallAppWM(logger);
  var closeRule = String(app.config.ACTION_CLOSE_ALL_RULE || "shortx.wm.floatball.CLOSE");
  var startRet = null;
  try { startRet = app.startAsync(entryInfo, closeRule); }
  catch (eTop) {
    try { logger.fatal("TOP startAsync crash err=" + String(eTop)); } catch(eLog) {}
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
    securityMsg: __securityStatus.msg,
    manifestVersion: __securityStatus.version || 0,
    syncMsg: syncInfo.msg,
    updatedCount: syncInfo.count,
    updatedModules: syncInfo.modules,
    closeAction: optStr(startRet && startRet.closeAction),
    layout: startRet && startRet.layout || null
  };
  if (loadInfo.count > 0) {
    out.loadMsg = loadInfo.msg;
    out.loadErrors = loadInfo.modules;
    if (!started) out.err = loadInfo.modules.join(", ");
  }
  if (!started && !out.err) out.err = optStr(startRet && startRet.err) || "未知错误";
  return out;
})();

JSON.stringify(__out);
