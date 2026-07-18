// ToolHub - 入口文件 (加载子模块并执行)
// Entry sync marker: 2026-07-03 06:42:55 +0800
// 安全更新机制：入口内置 RSA 公钥，先验证 manifest.json/manifest.sig，再按 SHA256 下载子模块。
// 更新源固定为 GitHub；未通过签名/哈希/防回滚校验时，不覆盖本地模块。

var UPDATE_SECURITY_MODE = 2; // 0: 普通更新, 1: manifest哈希校验, 2: 完整验签安全更新
var TOOLHUB_ENTRY_VERSION = 20260719024500; // 入口文件版本，仅在 ToolHub.js 变化时提升
var GIT_ROOT = "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/main/";
var __updateSecurityModeText = "";
var __updateSecurityModeFallback = false;
try { __updateSecurityModeText = String(UPDATE_SECURITY_MODE).replace(/^\s+|\s+$/g, ""); } catch (eUpdateSecurityModeText) { __updateSecurityModeText = ""; }
if (/^[012]$/.test(__updateSecurityModeText)) {
    UPDATE_SECURITY_MODE = parseInt(__updateSecurityModeText, 10);
} else {
    UPDATE_SECURITY_MODE = 2;
    __updateSecurityModeFallback = true;
}

var GIT_BASE = GIT_ROOT + "code/";
var TRUSTED_PUBLIC_KEYS = {
    "toolhub-targets-20260703-rsa3072": "MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAxcjp3aJFSfhqiOzs1klu+LIyTcIA/SzgCmMUjJgy8x5paDl9YO7F1r0XVHNzH1TZrkIzzck+w3geEtcRRjQqDOb6aUynvbCuMaDm8RlhGZnXHUE6/7uvbG3t5wwv7nML+L+MnBU9OysJcwAB+MgSWJUAr/A4oWB3IXpBwJWGft1iDmt7jWbajaDMiyEpDdVVJabsQsZlEfy4r9PhsXCu/cWYuuOPQq+MM8nA1U7QpJuXh55epx1uCoP+DIroFwdFIjUB5b+woWuMk9KtR6FOmoVzFiflD5tJfkqS0mHlmilINhsLpecDAFDwE/YP2Nzy/+X+jO8AEFJBqmWs80w/bHSz6lKxXG8AuAIcf+AuB1XMyPkST7BvZeQ8mF239Gq4y9oOLqKjISqagrRUqGM99nl7CSNsBqPGBN9guxnnR2lkWZD+0ij++mzKsfIC9N0JQaB0/f2eaXUfB/qrxsh600ZlpEJEPn1O3BL9TKOWqd9BO/XS6jhUPAXiG6LQxKf5AgMBAAE="
};
var DEFAULT_TRUSTED_KEY_ID = "toolhub-targets-20260703-rsa3072";
var MIN_TRUSTED_MANIFEST_VERSION = 20260507152251;
var MAX_UPDATE_TEXT_CHARS = 1024 * 1024;
var MAX_MODULE_DOWNLOAD_BYTES = 2 * 1024 * 1024;
var __dirChecked = false;
var __trustedManifest = null;
var __installedManifest = null;
var __manualUpdateRunning = false;
var __runtimeUpdateCheckRunning = false;
var __securityStatus = { ok: false, msg: "安全清单尚未校验" };
var TOOLHUB_UPDATE_STATE = {
    ok: true,
    status: "unknown",
    source: "",
    mode: 0,
    modeText: "",
    version: 0,
    title: "",
    date: "",
    changes: [],
    updatedCount: 0,
    updatedModules: [],
    availableCount: 0,
    availableModules: [],
    availableDetails: [],
    bootFixedCount: 0,
    bootFixedModules: [],
    needRestart: false,
    lastCheckAt: 0,
    securityText: "",
    error: ""
};

function buildNoCacheUrl(urlStr) {
    var sep = String(urlStr).indexOf("?") >= 0 ? "&" : "?";
    return String(urlStr) + sep + "_toolhub_ts=" + java.lang.System.currentTimeMillis();
}

function closeQuietly(resource) {
    try { if (resource) resource.close(); } catch (eClose) {}
}

function disconnectQuietly(conn) {
    try { if (conn && conn.disconnect) conn.disconnect(); } catch (eDisconnect) {}
}

function syncFileOutput(stream) {
    if (!stream) return;
    stream.flush();
    try { stream.getFD().sync(); } catch (eSync) {
        throw "file sync failed: " + String(eSync);
    }
}

var __toolHubRootDir = null;

function canWriteDirPath(path) {
    try {
        assertWritableDirPath(path, "dir");
        return true;
    } catch (eProbe) {
        return false;
    }
}

function assertWritableDirPath(path, label) {
    var probe = null;
    var out = null;
    try {
        if (!path) throw String(label || "dir") + " path empty";
        var dir = new java.io.File(String(path));
        if (!dir.exists() && !dir.mkdirs()) throw String(label || "dir") + " mkdirs failed: " + path;
        if (!dir.isDirectory()) throw String(label || "dir") + " is not directory: " + path;

        var suffix = String(java.lang.System.currentTimeMillis());
        try { suffix += "_" + String(java.lang.Thread.currentThread().getId()); } catch (eThreadId) {}
        probe = new java.io.File(dir, ".write_probe_" + suffix);
        out = new java.io.FileOutputStream(probe, false);
        out.write(49);
        out.flush();
        return true;
    } catch (e) {
        throw String(label || "dir") + " not writable: " + String(path) + " / " + String(e);
    } finally {
        closeQuietly(out);
        try { if (probe && probe.exists()) probe.delete(); } catch (eDelProbe) {}
    }
}

function getToolHubRootDir() {
    if (__toolHubRootDir) return __toolHubRootDir;

    var base = "";
    try {
        if (typeof shortx === "undefined" || !shortx) throw "shortx is undefined";
        if (typeof shortx.getShortXDir !== "function") throw "shortx.getShortXDir is not function";
        base = String(shortx.getShortXDir() || "");
    } catch (eShortXDir) {
        throw "无法获取 ShortX 根目录: " + String(eShortXDir);
    }

    if (!base || base.length <= 0) throw "shortx.getShortXDir() 返回空";

    __toolHubRootDir = base + "/ToolHub";
    assertWritableDirPath(__toolHubRootDir, "ToolHub root");
    return __toolHubRootDir;
}

var TOOLHUB_BOOT_ROOT_DIR = getToolHubRootDir();
if (__updateSecurityModeFallback) {
    writeLog("WARN invalid UPDATE_SECURITY_MODE, forced to secure mode 2");
}

function getLogPath() { return getToolHubRootDir() + "/logs/init.log"; }
function getCodeDirPath() { return getToolHubRootDir() + "/code/"; }
function getTrustedShaPath(relPath) { return getCodeDirPath() + ".trusted_sha_" + relPath; }
function getTrustedVersionPath() { return getCodeDirPath() + ".trusted_manifest_version"; }
function getInstalledManifestPath() { return getCodeDirPath() + ".installed_manifest.json"; }
function getModuleTxnMarkerPath() { return getCodeDirPath() + ".module_update_transaction.json"; }
function getModuleTxnCommitPath() { return getCodeDirPath() + ".module_update_transaction.committed"; }

function writeLog(msg) {
    var writer = null;
    try {
        var f = new java.io.File(getLogPath());
        var dir = f.getParentFile();
        if (dir && !dir.exists()) dir.mkdirs();
        try {
            var maxBytes = 512 * 1024;
            if (f.exists() && f.length() > maxBytes) {
                var bak = new java.io.File(String(f.getAbsolutePath()) + ".bak");
                try { if (bak.exists()) bak.delete(); } catch (eBak0) {}
                var moved = false;
                try { moved = f.renameTo(bak); } catch (eMv) { moved = false; }
                if (!moved) {
                    try { f.delete(); } catch (eDel) {}
                }
            }
        } catch (eTrim) {}
        var sdf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        var ts = sdf.format(new java.util.Date());
        writer = new java.io.FileWriter(f, true);
        writer.write("[" + ts + "] " + String(msg) + "\n");
    } catch (e) {
    } finally {
        try { if (writer) writer.close(); } catch (eClose) {}
    }
}

function runShell(cmdArr) {
    try {
        var proc = java.lang.Runtime.getRuntime().exec(cmdArr);
        proc.waitFor();
        return proc.exitValue() === 0;
    } catch (e) { return false; }
}

function setDirPerms(path) {
    // 只尝试 chmod，不再强制 chown 1000:1000。
    // 在部分 ColorOS/ShortX 环境中，shortx.getShortXDir() 位于 /data/system/shortx_*，
    // 强制改 owner 反而会让当前 JS 进程失去写权限，导致 Dir not writable。
    runShell(["chmod", "700", path]);
}

function ensureCodeDir() {
    var dir = new java.io.File(getCodeDirPath());
    if (!__dirChecked) {
        if (!dir.exists()) {
            dir.mkdirs();
            setDirPerms(dir.getAbsolutePath());
            writeLog("Created dir: " + dir.getAbsolutePath());
        } else if (!canWriteDirPath(dir.getAbsolutePath())) {
            setDirPerms(dir.getAbsolutePath());
            writeLog("Fixed dir perms: " + dir.getAbsolutePath());
        }
        __dirChecked = true;
    }
    if (!dir.canWrite()) throw "Dir not writable: " + dir.getAbsolutePath();
    return dir;
}

function readTextFile(path) {
    var r = null;
    try {
        var f = new java.io.File(path);
        if (!f.exists()) return null;
        r = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(f), "UTF-8"));
        var sb = new java.lang.StringBuilder();
        var line;
        while ((line = r.readLine()) != null) sb.append(line).append("\n");
        return String(sb.toString());
    } catch (e) {
        return null;
    } finally {
        closeQuietly(r);
    }
}

function writeTextFile(path, text) {
    var out = null;
    var w = null;
    try {
        var f = new java.io.File(path);
        var parent = f.getParentFile();
        if (parent && !parent.exists() && !parent.mkdirs()) return false;
        out = new java.io.FileOutputStream(f, false);
        w = new java.io.OutputStreamWriter(out, "UTF-8");
        w.write(String(text));
        w.flush();
        syncFileOutput(out);
        return true;
    } catch (e) {
        return false;
    } finally {
        closeQuietly(w);
        closeQuietly(out);
    }
}

function readFirstLine(path) {
    var txt = readTextFile(path);
    if (!txt) return null;
    var parts = String(txt).split(/\r?\n/);
    return parts.length > 0 ? String(parts[0]).trim() : null;
}

function sha256File(fileOrPath) {
    var fis = null;
    try {
        var path = String(fileOrPath);
        var md = java.security.MessageDigest.getInstance("SHA-256");
        fis = new java.io.FileInputStream(path);
        var buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 8192);
        var n;
        while ((n = fis.read(buf)) !== -1) md.update(buf, 0, n);
        var digest = md.digest();
        var sb = new java.lang.StringBuilder();
        for (var i = 0; i < digest.length; i++) {
            var hex = java.lang.Integer.toHexString(0xFF & digest[i]);
            if (hex.length() === 1) sb.append("0");
            sb.append(hex);
        }
        return String(sb.toString());
    } catch (e) {
        return null;
    } finally {
        closeQuietly(fis);
    }
}

function saveTrustedSha(relPath, hash) { writeTextFile(getTrustedShaPath(relPath), String(hash || "")); }
function getTrustedSha(relPath) { return readFirstLine(getTrustedShaPath(relPath)); }
function getTrustedVersion() {
    var line = readFirstLine(getTrustedVersionPath());
    var v = line ? parseInt(String(line), 10) : 0;
    return isNaN(v) ? 0 : v;
}
function saveTrustedVersion(v) { writeTextFile(getTrustedVersionPath(), String(v || 0)); }

function getEmptyInstalledManifest() {
    return { schema: 1, version: 0, files: {}, updatedAt: 0 };
}

function readInstalledManifest() {
    if (__installedManifest) return __installedManifest;
    try {
        var txt = readTextFile(getInstalledManifestPath());
        if (!txt) {
            __installedManifest = getEmptyInstalledManifest();
            return __installedManifest;
        }
        var parsed = JSON.parse(String(txt));
        if (!parsed || !parsed.files) {
            __installedManifest = getEmptyInstalledManifest();
            return __installedManifest;
        }
        __installedManifest = parsed;
        return __installedManifest;
    } catch (e) {
        writeLog("Installed manifest read failed: " + String(e));
        __installedManifest = getEmptyInstalledManifest();
        return __installedManifest;
    }
}

function getInstalledFileInfo(relPath) {
    try {
        var man = readInstalledManifest();
        if (!man || !man.files) return null;
        return man.files[relPath] || null;
    } catch (e) { return null; }
}

function getInstalledSha(relPath) {
    var info = getInstalledFileInfo(relPath);
    if (!info || !info.sha256) return null;
    return String(info.sha256).toLowerCase();
}

function saveInstalledManifestFromLocal() {
    try {
        ensureCodeDir();
        var now = java.lang.System.currentTimeMillis();
        var man = { schema: 1, version: 0, files: {}, updatedAt: Number(now) };
        var versionNum = 0;
        if (__trustedManifest && __trustedManifest.version !== undefined && __trustedManifest.version !== null) versionNum = Number(__trustedManifest.version || 0);
        if (!versionNum || isNaN(versionNum)) versionNum = getTrustedVersion();
        man.version = isNaN(versionNum) ? 0 : Number(versionNum);
        for (var i = 0; i < modules.length; i++) {
            var relPath = String(modules[i]);
            var f = new java.io.File(getCodeDirPath(), relPath);
            if (!f.exists()) continue;
            var hash = sha256File(f.getAbsolutePath());
            if (!hash) continue;
            man.files[relPath] = {
                sha256: String(hash).toLowerCase(),
                size: Number(f.length()),
                mtime: Number(f.lastModified())
            };
        }
        var ok = writeTextFile(getInstalledManifestPath(), JSON.stringify(man, null, 2));
        if (ok) __installedManifest = man;
        return ok;
    } catch (eSaveInstalled) {
        writeLog("Installed manifest save failed: " + String(eSaveInstalled));
        return false;
    }
}

function downloadText(urlStr) {
    var conn = null;
    var r = null;
    try {
        var url = new java.net.URL(buildNoCacheUrl(urlStr));
        conn = url.openConnection();
        conn.setUseCaches(false);
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(30000);
        conn.setRequestProperty("User-Agent", "ShortX-ToolHub/secure-updater");
        conn.setRequestProperty("Cache-Control", "no-cache, no-store, must-revalidate");
        conn.setRequestProperty("Pragma", "no-cache");
        var code = conn.getResponseCode();
        if (code !== 200) throw "HTTP " + code;
        var expectedLen = Number(conn.getContentLength());
        if (expectedLen > MAX_UPDATE_TEXT_CHARS) throw "Text response too large: " + expectedLen;
        r = new java.io.BufferedReader(new java.io.InputStreamReader(conn.getInputStream(), "UTF-8"));
        var sb = new java.lang.StringBuilder();
        var line;
        while ((line = r.readLine()) != null) {
            sb.append(line).append("\n");
            if (sb.length() > MAX_UPDATE_TEXT_CHARS) throw "Text response exceeds limit";
        }
        var text = String(sb.toString());
        var prefix = text.length > 200 ? text.substring(0, 200) : text;
        if (prefix.indexOf("<!DOCTYPE") >= 0 || prefix.indexOf("<html") >= 0) throw "Downloaded content is HTML";
        return text;
    } finally {
        closeQuietly(r);
        disconnectQuietly(conn);
    }
}

function downloadFile(urlStr, destFile) {
    var conn = null;
    var inStream = null;
    var outStream = null;
    var checkStream = null;
    var complete = false;
    try {
        var url = new java.net.URL(buildNoCacheUrl(urlStr));
        conn = url.openConnection();
        conn.setUseCaches(false);
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(30000);
        conn.setRequestProperty("User-Agent", "ShortX-ToolHub/secure-updater");
        conn.setRequestProperty("Cache-Control", "no-cache, no-store, must-revalidate");
        conn.setRequestProperty("Pragma", "no-cache");
        var code = conn.getResponseCode();
        if (code !== 200) throw "HTTP " + code;
        var expectedLen = Number(conn.getContentLength());
        if (expectedLen > MAX_MODULE_DOWNLOAD_BYTES) throw "Module response too large: " + expectedLen;
        inStream = conn.getInputStream();
        outStream = new java.io.FileOutputStream(destFile, false);
        var buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 8192);
        var n, total = 0;
        while ((n = inStream.read(buf)) !== -1) {
            total += n;
            if (total > MAX_MODULE_DOWNLOAD_BYTES) throw "Module response exceeds limit";
            outStream.write(buf, 0, n);
        }
        syncFileOutput(outStream);
        closeQuietly(outStream);
        outStream = null;
        closeQuietly(inStream);
        inStream = null;
        if (expectedLen > 0 && total !== expectedLen) throw "Size mismatch: expected=" + expectedLen + ", got=" + total;
        checkStream = new java.io.FileInputStream(destFile);
        var checkBuf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 200);
        var checkRead = checkStream.read(checkBuf);
        if (checkRead > 0) {
            var prefix = new java.lang.String(checkBuf, 0, checkRead, "UTF-8");
            if (prefix.indexOf("<!DOCTYPE") >= 0 || prefix.indexOf("<html") >= 0) throw "Downloaded content is HTML, not JS";
        }
        complete = true;
        return total;
    } finally {
        closeQuietly(checkStream);
        closeQuietly(outStream);
        closeQuietly(inStream);
        disconnectQuietly(conn);
        if (!complete) {
            try { if (destFile && destFile.exists()) destFile.delete(); } catch (eDeletePartial) {}
        }
    }
}

function base64Decode(s) {
    return android.util.Base64.decode(String(s).replace(/\s+/g, ""), android.util.Base64.DEFAULT);
}

function getTrustedPublicKeyB64(keyId) {
    var kid = keyId ? String(keyId) : DEFAULT_TRUSTED_KEY_ID;
    if (TRUSTED_PUBLIC_KEYS.hasOwnProperty(kid)) return TRUSTED_PUBLIC_KEYS[kid];
    return null;
}

function verifyManifestSignature(manifestText, sigText, keyId) {
    try {
        var pubB64 = getTrustedPublicKeyB64(keyId);
        if (!pubB64) throw "unknown manifest keyId: " + String(keyId);
        var pubBytes = base64Decode(pubB64);
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
        if (UPDATE_SECURITY_MODE === 0) {
            __trustedManifest = null;
            __securityStatus = { ok: true, plain: true, msg: "普通更新模式：未启用签名/manifest校验" };
            writeLog(__securityStatus.msg);
            return null;
        }

        var manifestText = downloadText(GIT_ROOT + "manifest.json");
        var manifest = JSON.parse(String(manifestText));
        if (!manifest || !manifest.files) throw "manifest files missing";

        var version = parseInt(String(manifest.version || "0"), 10);
        if (isNaN(version) || version <= 0) throw "invalid manifest version";

        if (UPDATE_SECURITY_MODE === 2) {
            var sigText = downloadText(GIT_ROOT + "manifest.sig");
            if (String(manifest.alg || "") !== "SHA256withRSA") throw "unsupported manifest alg: " + String(manifest.alg);
            var keyId = String(manifest.keyId || DEFAULT_TRUSTED_KEY_ID);
            if (!getTrustedPublicKeyB64(keyId)) throw "untrusted manifest keyId: " + keyId;
            if (!verifyManifestSignature(manifestText, sigText, keyId)) throw "manifest signature invalid";
            if (version < MIN_TRUSTED_MANIFEST_VERSION) throw "manifest below minimum trusted version: remote=" + version + ", min=" + MIN_TRUSTED_MANIFEST_VERSION;
            var localVersion = getTrustedVersion();
            if (localVersion > 0 && version < localVersion) throw "manifest rollback: remote=" + version + ", local=" + localVersion;
            __trustedManifest = manifest;
            __securityStatus = { ok: true, mode: 2, msg: "安全清单验签通过，version=" + version + ", keyId=" + keyId, version: version, keyId: keyId };
        } else {
            __trustedManifest = manifest;
            __securityStatus = { ok: true, mode: 1, msg: "manifest哈希校验模式：version=" + version, version: version, keyId: String(manifest.keyId || "") };
        }
        writeLog(__securityStatus.msg);
        return manifest;
    } catch (e) {
        __trustedManifest = null;
        __securityStatus = { ok: false, msg: "更新清单不可用：" + String(e) };
        writeLog(__securityStatus.msg);
        return null;
    }
}

function recoverAtomicReplacement(destFile) {
    var backupFile = new java.io.File(destFile.getAbsolutePath() + ".bak");
    if (destFile.exists()) {
        if (backupFile.exists() && !backupFile.delete()) {
            writeLog("WARN stale module backup could not be deleted: " + backupFile.getAbsolutePath());
        }
        return false;
    }
    if (!backupFile.exists()) return false;
    if (!backupFile.renameTo(destFile)) throw "restore module backup failed: " + backupFile.getAbsolutePath();
    writeLog("Recovered interrupted module replacement: " + destFile.getName());
    return true;
}

function replaceFile(tmpFile, destFile) {
    var backupFile = new java.io.File(destFile.getAbsolutePath() + ".bak");
    var hadDest = false;
    var installed = false;
    recoverAtomicReplacement(destFile);
    if (!tmpFile || !tmpFile.exists()) throw "temporary file missing: " + String(tmpFile);
    try {
        if (backupFile.exists() && !backupFile.delete()) throw "delete stale backup failed: " + backupFile.getAbsolutePath();
        hadDest = destFile.exists();
        if (hadDest && !destFile.renameTo(backupFile)) throw "backup old file failed: " + destFile.getAbsolutePath();
        if (!tmpFile.renameTo(destFile)) throw "rename tmp failed: " + tmpFile.getAbsolutePath();
        installed = true;
        if (!destFile.exists()) throw "replacement destination missing: " + destFile.getAbsolutePath();
        if (backupFile.exists() && !backupFile.delete()) {
            writeLog("WARN module backup retained after update: " + backupFile.getAbsolutePath());
        }
        return true;
    } catch (eReplace) {
        var restoreError = "";
        try {
            if (installed && destFile.exists() && !destFile.delete()) restoreError = "delete failed replacement";
            if (hadDest && backupFile.exists() && !backupFile.renameTo(destFile)) {
                restoreError = (restoreError ? restoreError + "; " : "") + "restore backup failed";
            }
        } catch (eRestore) {
            restoreError = (restoreError ? restoreError + "; " : "") + String(eRestore);
        }
        throw "atomic replace failed: " + String(eReplace) + (restoreError ? "; " + restoreError : "");
    } finally {
        try { if (tmpFile.exists()) tmpFile.delete(); } catch (eDeleteTmp) {}
    }
}

function getManifestInfo(relPath) {
    if (!__trustedManifest || !__trustedManifest.files) return null;
    return __trustedManifest.files[relPath] || null;
}

function getManifestRelease() {
    var out = { title: "", date: "", changes: [] };
    try {
        var rel = (__trustedManifest && __trustedManifest.release) ? __trustedManifest.release : null;
        if (!rel) return out;
        out.title = (rel.title === undefined || rel.title === null) ? "" : String(rel.title);
        out.date = (rel.date === undefined || rel.date === null) ? "" : String(rel.date);
        var rawChanges = rel.changes;
        if (rawChanges && rawChanges.length !== undefined) {
            for (var ri = 0; ri < rawChanges.length; ri++) {
                var oneChange = rawChanges[ri];
                if (oneChange !== undefined && oneChange !== null && String(oneChange).length > 0) out.changes.push(String(oneChange));
            }
        }
    } catch (eRel) {}
    return out;
}


function runtimeOptString(v) {
    return (v === undefined || v === null) ? "" : String(v);
}

function copyRuntimeStringList(list) {
    var out = [];
    if (!list || list.length === undefined) return out;
    for (var i = 0; i < list.length; i++) {
        if (list[i] !== undefined && list[i] !== null && String(list[i]).length > 0) out.push(String(list[i]));
    }
    return out;
}

function getUpdateModeText() {
    if (UPDATE_SECURITY_MODE === 1) return "manifest哈希校验";
    if (UPDATE_SECURITY_MODE === 2) return "完整验签安全更新";
    return "普通更新模式";
}

function getTrustedManifestVersionNumber() {
    var versionNum = 0;
    if (__securityStatus && __securityStatus.version !== undefined && __securityStatus.version !== null) versionNum = Number(__securityStatus.version || 0);
    if ((!versionNum || isNaN(versionNum)) && __trustedManifest && __trustedManifest.version !== undefined) versionNum = Number(__trustedManifest.version || 0);
    if (isNaN(versionNum)) versionNum = 0;
    return versionNum;
}

function buildToolHubSecurityText() {
    if (UPDATE_SECURITY_MODE === 0) return "⚠ 普通更新模式：未启用签名校验";
    if (UPDATE_SECURITY_MODE === 1 && __securityStatus.ok) return "⚠ manifest哈希校验模式 v" + String(__securityStatus.version || 0);
    if (__securityStatus.ok) return "✓ 已验签 v" + String(__securityStatus.version || 0) + " / " + runtimeOptString(__securityStatus.keyId);
    return "✗ " + runtimeOptString(__securityStatus.msg);
}

function applyRuntimeUpdateState(availableNames, errText) {
    try {
        var names = copyRuntimeStringList(availableNames || []);
        var err = errText ? String(errText) : "";
        var rel = getManifestRelease();
        var versionNum = getTrustedManifestVersionNumber();
        var oldNeedRestart = TOOLHUB_UPDATE_STATE && TOOLHUB_UPDATE_STATE.needRestart === true;
        TOOLHUB_UPDATE_STATE.ok = err.length === 0;
        if (err.length > 0) TOOLHUB_UPDATE_STATE.status = "error";
        else if (oldNeedRestart) TOOLHUB_UPDATE_STATE.status = "updated";
        else if (UPDATE_SECURITY_MODE === 0) TOOLHUB_UPDATE_STATE.status = "plain";
        else TOOLHUB_UPDATE_STATE.status = names.length > 0 ? "available" : "latest";
        TOOLHUB_UPDATE_STATE.source = "GitHub";
        TOOLHUB_UPDATE_STATE.mode = UPDATE_SECURITY_MODE;
        TOOLHUB_UPDATE_STATE.modeText = getUpdateModeText();
        TOOLHUB_UPDATE_STATE.version = versionNum;
        if (err.length === 0 || rel.title) TOOLHUB_UPDATE_STATE.title = runtimeOptString(rel.title);
        if (err.length === 0 || rel.date) TOOLHUB_UPDATE_STATE.date = runtimeOptString(rel.date);
        if (err.length === 0 || (rel.changes && rel.changes.length > 0)) TOOLHUB_UPDATE_STATE.changes = copyRuntimeStringList(rel.changes);
        if (!oldNeedRestart) {
            TOOLHUB_UPDATE_STATE.updatedCount = 0;
            TOOLHUB_UPDATE_STATE.updatedModules = [];
        }
        TOOLHUB_UPDATE_STATE.availableCount = err.length > 0 ? 0 : names.length;
        TOOLHUB_UPDATE_STATE.availableModules = err.length > 0 ? [] : names;
        TOOLHUB_UPDATE_STATE.availableDetails = err.length > 0 ? [] : copyRuntimeDetailList(__pendingModuleUpdates);
        TOOLHUB_UPDATE_STATE.needRestart = oldNeedRestart;
        TOOLHUB_UPDATE_STATE.lastCheckAt = Number(java.lang.System.currentTimeMillis());
        TOOLHUB_UPDATE_STATE.securityText = buildToolHubSecurityText();
        TOOLHUB_UPDATE_STATE.error = err;
    } catch (eApply) {
        writeLog("Runtime update state apply failed: " + String(eApply));
    }
}

function hashesEqual(a, b) {
    if (!a || !b) return false;
    return String(a).toLowerCase() === String(b).toLowerCase();
}

function parseModuleVersionText(v) {
    var s = String(v || "0.0.0");
    var arr = s.split(".");
    var out = [0, 0, 0];
    for (var i = 0; i < 3; i++) {
        var n = parseInt(String(arr[i] || "0"), 10);
        out[i] = isNaN(n) ? 0 : n;
    }
    return out;
}

function compareModuleVersion(a, b) {
    var aa = parseModuleVersionText(a);
    var bb = parseModuleVersionText(b);
    for (var i = 0; i < 3; i++) {
        if (aa[i] > bb[i]) return 1;
        if (aa[i] < bb[i]) return -1;
    }
    return 0;
}

function readModuleVersionFromText(text) {
    try {
        var lines = String(text || "").split("\n");
        var max = lines.length < 5 ? lines.length : 5;
        for (var i = 0; i < max; i++) {
            var line = String(lines[i] || "");
            var m = line.match(/@version\s+([0-9]+\.[0-9]+\.[0-9]+)/);
            if (m && m[1]) return String(m[1]);
        }
    } catch (eReadVersionText) {}
    return "0.0.0";
}

function readModuleVersionFromFile(fileObj) {
    try {
        if (!fileObj || !fileObj.exists()) return "0.0.0";
        var text = readTextFile(fileObj.getAbsolutePath());
        if (text === null) return "0.0.0";
        return readModuleVersionFromText(text);
    } catch (eReadVersionFile) {}
    return "0.0.0";
}

function getManifestModuleVersion(info) {
    try {
        if (info && info.version !== undefined && info.version !== null) return String(info.version);
    } catch (eManifestVersion) {}
    return "";
}

function copyRuntimeDetailList(list) {
    var out = [];
    if (!list || list.length === undefined) return out;
    for (var i = 0; i < list.length; i++) {
        var item = list[i] || {};
        var name = runtimeOptString(item.module);
        if (!name) continue;
        out.push({
            module: name,
            localVersion: runtimeOptString(item.localVersion),
            remoteVersion: runtimeOptString(item.remoteVersion),
            reason: runtimeOptString(item.reason)
        });
    }
    return out;
}

function addPendingModuleUpdate(relPath, currentHash, expectedHash, expectedSize, localVersion, remoteVersion, reason) {
    try {
        for (var i = 0; i < __pendingModuleUpdates.length; i++) {
            if (String(__pendingModuleUpdates[i].module || "") === String(relPath)) return;
        }
        __pendingModuleUpdates.push({
            module: String(relPath),
            currentHash: currentHash ? String(currentHash).toLowerCase() : "",
            expectedHash: expectedHash ? String(expectedHash).toLowerCase() : "",
            size: Number(expectedSize || 0),
            localVersion: localVersion ? String(localVersion) : "",
            remoteVersion: remoteVersion ? String(remoteVersion) : "",
            reason: reason ? String(reason) : ""
        });
    } catch (ePending) {}
}

function ensurePlainBootModule(relPath, destFile) {
    recoverAtomicReplacement(destFile);
    if (destFile.exists()) {
        return { updated: false, localFallback: true, size: destFile.length(), hash: sha256File(destFile.getAbsolutePath()) };
    }
    var ret = ensurePlainRemoteModule(relPath, destFile);
    ret.isNew = true;
    ret.bootFixed = true;
    return ret;
}

function ensureBootVerifiedModule(relPath, destFile) {
    recoverAtomicReplacement(destFile);
    var info = getManifestInfo(relPath);
    if (!info || !info.sha256) throw "module not in trusted manifest: " + relPath;
    var expectedHash = String(info.sha256).toLowerCase();
    var expectedSize = Number(info.size || 0);
    var actualHash = destFile.exists() ? sha256File(destFile.getAbsolutePath()) : null;
    if (destFile.exists() && hashesEqual(actualHash, expectedHash)) {
        saveTrustedSha(relPath, expectedHash);
        return { updated: false, latest: true, size: destFile.length(), hash: actualHash };
    }
    if (destFile.exists() && actualHash) {
        var installedHash = getInstalledSha(relPath);
        if (hashesEqual(actualHash, installedHash)) {
            saveTrustedSha(relPath, actualHash);
            addPendingModuleUpdate(relPath, actualHash, expectedHash, expectedSize);
            writeLog("Module update available, keep installed copy " + relPath + " (local=" + actualHash + ", remote=" + expectedHash + ")");
            return { updated: false, available: true, source: "installed_manifest", size: destFile.length(), hash: actualHash, expectedHash: expectedHash };
        }
        var trustedHash = getTrustedSha(relPath);
        if (hashesEqual(actualHash, trustedHash)) {
            addPendingModuleUpdate(relPath, actualHash, expectedHash, expectedSize);
            writeLog("Module update available, keep trusted local copy " + relPath + " (local=" + actualHash + ", remote=" + expectedHash + ")");
            return { updated: false, available: true, source: "trusted_sha", size: destFile.length(), hash: actualHash, expectedHash: expectedHash };
        }
    }
    var fixed = ensureVerifiedModule(relPath, destFile);
    fixed.bootFixed = true;
    return fixed;
}

function ensurePlainRemoteModule(relPath, destFile) {
    recoverAtomicReplacement(destFile);
    var tmpFile = new java.io.File(destFile.getAbsolutePath() + ".tmp");
    try { if (tmpFile.exists()) tmpFile.delete(); } catch (eDelTmp0) {}
    try {
        var size = downloadFile(GIT_BASE + relPath, tmpFile);
        if (size <= 0) throw "empty download: " + relPath;
        replaceFile(tmpFile, destFile);
        var hash = sha256File(destFile.getAbsolutePath());
        return { updated: true, size: size, hash: hash };
    } catch (e) {
        try { if (tmpFile.exists()) tmpFile.delete(); } catch (eDelTmp) {}
        if (destFile.exists()) {
            var localHash = sha256File(destFile.getAbsolutePath());
            writeLog("Plain update failed, use local module " + relPath + ": " + String(e));
            return { updated: false, localFallback: true, size: destFile.length(), hash: localHash };
        }
        throw String(e);
    }
}

function ensureVerifiedModule(relPath, destFile) {
    recoverAtomicReplacement(destFile);
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
    recoverAtomicReplacement(destFile);
    if (!destFile.exists()) throw "安全清单不可用且本地模块不存在: " + relPath;
    var trustedHash = getTrustedSha(relPath);
    var actualHash = sha256File(destFile.getAbsolutePath());
    if (!trustedHash || !actualHash || String(trustedHash).toLowerCase() !== String(actualHash).toLowerCase()) {
        throw "安全清单不可用，本地模块也无可信 SHA256: " + relPath;
    }
    return { updated: false, size: destFile.length(), hash: actualHash };
}

function getTxnStageFile(destFile) {
    return new java.io.File(destFile.getAbsolutePath() + ".txn.tmp");
}

function getTxnBackupFile(destFile) {
    return new java.io.File(destFile.getAbsolutePath() + ".txn.bak");
}

function deleteFileStrict(fileObj, label) {
    if (!fileObj || !fileObj.exists()) return true;
    if (!fileObj.delete()) throw String(label || "delete file") + " failed: " + fileObj.getAbsolutePath();
    return true;
}

function makeTransactionEntry(destFile, expectedHash, size, kind, moduleName) {
    var stageFile = getTxnStageFile(destFile);
    var backupFile = getTxnBackupFile(destFile);
    return {
        destPath: String(destFile.getAbsolutePath()),
        stagePath: String(stageFile.getAbsolutePath()),
        backupPath: String(backupFile.getAbsolutePath()),
        expectedHash: String(expectedHash || "").toLowerCase(),
        size: Number(size || 0),
        hadDest: destFile.exists(),
        kind: String(kind || "file"),
        module: moduleName ? String(moduleName) : ""
    };
}

function stageVerifiedModuleEntry(relPath, destFile) {
    var info = getManifestInfo(relPath);
    if (!info || !info.sha256) throw "module not in trusted manifest: " + relPath;
    var expectedHash = String(info.sha256).toLowerCase();
    var expectedSize = Number(info.size || 0);
    var stageFile = getTxnStageFile(destFile);
    deleteFileStrict(stageFile, "delete old transaction stage");
    var size = downloadFile(GIT_BASE + relPath, stageFile);
    if (expectedSize > 0 && size !== expectedSize) {
        deleteFileStrict(stageFile, "delete invalid transaction stage");
        throw "manifest size mismatch for " + relPath + ": expected=" + expectedSize + ", got=" + size;
    }
    var stageHash = sha256File(stageFile.getAbsolutePath());
    if (!stageHash || !hashesEqual(stageHash, expectedHash)) {
        deleteFileStrict(stageFile, "delete invalid transaction stage");
        throw "manifest SHA256 mismatch for " + relPath + ": expected=" + expectedHash + ", actual=" + stageHash;
    }
    return makeTransactionEntry(destFile, expectedHash, size, "module", relPath);
}

function stagePlainModuleEntry(relPath, destFile) {
    var stageFile = getTxnStageFile(destFile);
    deleteFileStrict(stageFile, "delete old transaction stage");
    var size = downloadFile(GIT_BASE + relPath, stageFile);
    if (size <= 0) {
        deleteFileStrict(stageFile, "delete empty transaction stage");
        throw "empty download: " + relPath;
    }
    var stageHash = sha256File(stageFile.getAbsolutePath());
    if (!stageHash) {
        deleteFileStrict(stageFile, "delete unhashed transaction stage");
        throw "cannot hash staged module: " + relPath;
    }
    return makeTransactionEntry(destFile, stageHash, size, "module", relPath);
}

function stageTextTransactionEntry(destPath, text, kind) {
    var destFile = new java.io.File(String(destPath));
    var stageFile = getTxnStageFile(destFile);
    deleteFileStrict(stageFile, "delete old metadata stage");
    if (!writeTextFile(stageFile.getAbsolutePath(), String(text))) {
        try { if (stageFile.exists()) stageFile.delete(); } catch (eDeleteStage) {}
        throw "write transaction metadata stage failed: " + destFile.getName();
    }
    var hash = sha256File(stageFile.getAbsolutePath());
    if (!hash) {
        deleteFileStrict(stageFile, "delete unhashed metadata stage");
        throw "cannot hash transaction metadata stage: " + destFile.getName();
    }
    return makeTransactionEntry(destFile, hash, stageFile.length(), kind || "metadata", "");
}

function buildInstalledManifestForTransaction(moduleEntries) {
    var byModule = {};
    for (var ei = 0; ei < moduleEntries.length; ei++) {
        var entry = moduleEntries[ei];
        if (entry && entry.module) byModule[String(entry.module)] = entry;
    }
    var now = Number(java.lang.System.currentTimeMillis());
    var versionNum = 0;
    if (__trustedManifest && __trustedManifest.version !== undefined && __trustedManifest.version !== null) {
        versionNum = Number(__trustedManifest.version || 0);
    }
    if (!versionNum || isNaN(versionNum)) versionNum = getTrustedVersion();
    if (isNaN(versionNum)) versionNum = 0;
    var man = { schema: 1, version: Number(versionNum), files: {}, updatedAt: now };
    for (var i = 0; i < modules.length; i++) {
        var relPath = String(modules[i]);
        var staged = byModule[relPath];
        if (staged) {
            var stagedFile = new java.io.File(String(staged.stagePath));
            if (!stagedFile.exists()) throw "staged module missing while building installed manifest: " + relPath;
            man.files[relPath] = {
                sha256: String(staged.expectedHash).toLowerCase(),
                size: Number(staged.size || stagedFile.length()),
                mtime: Number(stagedFile.lastModified())
            };
            continue;
        }
        var localFile = new java.io.File(getCodeDirPath(), relPath);
        if (!localFile.exists()) throw "local module missing while building installed manifest: " + relPath;
        var localHash = sha256File(localFile.getAbsolutePath());
        if (!localHash) throw "cannot hash local module while building installed manifest: " + relPath;
        man.files[relPath] = {
            sha256: String(localHash).toLowerCase(),
            size: Number(localFile.length()),
            mtime: Number(localFile.lastModified())
        };
    }
    return man;
}

function appendTransactionMetadataEntries(entries) {
    var installed = buildInstalledManifestForTransaction(entries);
    entries.push(stageTextTransactionEntry(getInstalledManifestPath(), JSON.stringify(installed, null, 2), "installed_manifest"));
    if (UPDATE_SECURITY_MODE !== 0) {
        var moduleEntries = entries.slice ? entries.slice(0) : entries;
        for (var i = 0; i < moduleEntries.length; i++) {
            var item = moduleEntries[i];
            if (!item || item.kind !== "module" || !item.module) continue;
            entries.push(stageTextTransactionEntry(getTrustedShaPath(String(item.module)), String(item.expectedHash || ""), "trusted_sha"));
        }
    }
    if (UPDATE_SECURITY_MODE === 2 && __trustedManifest) {
        entries.push(stageTextTransactionEntry(getTrustedVersionPath(), String(__trustedManifest.version || 0), "trusted_version"));
    }
    return installed;
}

function cleanupStagedTransactionEntries(entries) {
    if (!entries) return;
    for (var i = 0; i < entries.length; i++) {
        try {
            var stageFile = new java.io.File(String(entries[i].stagePath || ""));
            if (stageFile.exists()) stageFile.delete();
        } catch (eStageCleanup) {}
    }
}

function transactionEntryMatches(entry) {
    try {
        var destFile = new java.io.File(String(entry.destPath || ""));
        if (!destFile.exists()) return false;
        if (Number(entry.size || 0) > 0 && Number(destFile.length()) !== Number(entry.size)) return false;
        var hash = sha256File(destFile.getAbsolutePath());
        return !!hash && hashesEqual(hash, entry.expectedHash);
    } catch (eMatch) {
        return false;
    }
}

function rollbackModuleTransaction(txn, reason) {
    var errors = [];
    var entries = txn && txn.entries ? txn.entries : [];
    for (var i = entries.length - 1; i >= 0; i--) {
        var entry = entries[i] || {};
        try {
            var destFile = new java.io.File(String(entry.destPath || ""));
            var stageFile = new java.io.File(String(entry.stagePath || ""));
            var backupFile = new java.io.File(String(entry.backupPath || ""));
            if (backupFile.exists()) {
                if (destFile.exists() && !destFile.delete()) throw "delete replacement failed: " + destFile.getAbsolutePath();
                if (!backupFile.renameTo(destFile)) throw "restore transaction backup failed: " + backupFile.getAbsolutePath();
            } else if (entry.hadDest !== true && destFile.exists()) {
                if (!destFile.delete()) throw "delete new transaction file failed: " + destFile.getAbsolutePath();
            }
            try { if (stageFile.exists()) stageFile.delete(); } catch (eDeleteStage) {}
        } catch (eRollbackOne) {
            errors.push(String(entry.destPath || "") + " -> " + String(eRollbackOne));
        }
    }
    if (errors.length > 0) {
        writeLog("Module transaction rollback incomplete reason=" + String(reason || "") + " errors=" + errors.join(" | "));
        throw "module transaction rollback incomplete: " + errors.join(" | ");
    }
    try { deleteFileStrict(new java.io.File(getModuleTxnCommitPath()), "delete transaction commit marker"); } catch (eCommitDelete) {}
    deleteFileStrict(new java.io.File(getModuleTxnMarkerPath()), "delete transaction marker");
    __installedManifest = null;
    writeLog("Module transaction rolled back id=" + String(txn && txn.id || "") + " reason=" + String(reason || ""));
    return true;
}

function finalizeCommittedModuleTransaction(txn) {
    var entries = txn && txn.entries ? txn.entries : [];
    var pending = [];
    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i] || {};
        try {
            var stageFile = new java.io.File(String(entry.stagePath || ""));
            var backupFile = new java.io.File(String(entry.backupPath || ""));
            if (stageFile.exists() && !stageFile.delete()) pending.push(stageFile.getAbsolutePath());
            if (backupFile.exists() && !backupFile.delete()) pending.push(backupFile.getAbsolutePath());
        } catch (eCleanupOne) {
            pending.push(String(entry.destPath || "") + ":" + String(eCleanupOne));
        }
    }
    if (pending.length > 0) {
        writeLog("Committed module transaction cleanup pending id=" + String(txn && txn.id || "") + " files=" + pending.join(","));
        return false;
    }
    try {
        deleteFileStrict(new java.io.File(getModuleTxnMarkerPath()), "delete transaction marker");
    } catch (eDeleteMarker) {
        writeLog("Committed module transaction marker cleanup pending id=" + String(txn && txn.id || "") + " err=" + String(eDeleteMarker));
        return false;
    }
    try {
        deleteFileStrict(new java.io.File(getModuleTxnCommitPath()), "delete transaction commit marker");
    } catch (eDeleteCommit) {
        writeLog("Committed module transaction commit marker cleanup pending id=" + String(txn && txn.id || "") + " err=" + String(eDeleteCommit));
        return false;
    }
    __installedManifest = null;
    writeLog("Committed module transaction finalized id=" + String(txn && txn.id || ""));
    return true;
}

function recoverOrphanTransactionFiles() {
    var dir = ensureCodeDir();
    var files = dir.listFiles();
    if (!files) return;
    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        var name = String(f.getName());
        try {
            if (name.lastIndexOf(".txn.tmp") === name.length - 8) {
                if (f.exists()) f.delete();
            } else if (name.lastIndexOf(".txn.bak") === name.length - 8) {
                var destName = name.substring(0, name.length - 8);
                var dest = new java.io.File(dir, destName);
                if (dest.exists() && !dest.delete()) throw "delete orphan replacement failed: " + dest.getAbsolutePath();
                if (!f.renameTo(dest)) throw "restore orphan backup failed: " + f.getAbsolutePath();
                writeLog("Recovered orphan transaction backup: " + destName);
            }
        } catch (eOrphan) {
            throw "orphan transaction recovery failed: " + String(eOrphan);
        }
    }
}

function recoverPendingModuleTransaction() {
    var markerFile = new java.io.File(getModuleTxnMarkerPath());
    var commitFile = new java.io.File(getModuleTxnCommitPath());
    if (!markerFile.exists()) {
        recoverOrphanTransactionFiles();
        try { if (commitFile.exists()) commitFile.delete(); } catch (eDeleteOrphanCommit) {}
        return { recovered: false };
    }
    var markerText = readTextFile(markerFile.getAbsolutePath());
    var txn = null;
    try { txn = markerText ? JSON.parse(String(markerText)) : null; } catch (eParseTxn) { txn = null; }
    if (!txn || !txn.id || !txn.entries) {
        writeLog("Invalid module transaction marker; restoring orphan backups");
        recoverOrphanTransactionFiles();
        try { if (commitFile.exists()) commitFile.delete(); } catch (eDeleteBadCommit) {}
        deleteFileStrict(markerFile, "delete invalid transaction marker");
        __installedManifest = null;
        return { recovered: true, invalid: true };
    }
    var commitId = readFirstLine(commitFile.getAbsolutePath());
    if (commitId && String(commitId) === String(txn.id)) {
        var complete = true;
        for (var i = 0; i < txn.entries.length; i++) {
            if (!transactionEntryMatches(txn.entries[i])) { complete = false; break; }
        }
        if (complete) {
            finalizeCommittedModuleTransaction(txn);
            return { recovered: true, committed: true, id: String(txn.id) };
        }
    }
    rollbackModuleTransaction(txn, "startup_recovery");
    return { recovered: true, rolledBack: true, id: String(txn.id) };
}

function executeStagedModuleTransaction(entries, installedManifest) {
    if (!entries || entries.length <= 0) return { ok: true, count: 0, id: "" };
    var txnId = String((__trustedManifest && __trustedManifest.version) || java.lang.System.currentTimeMillis()) + "-" + String(java.lang.System.nanoTime());
    var txn = {
        schema: 1,
        id: txnId,
        manifestVersion: Number((__trustedManifest && __trustedManifest.version) || 0),
        createdAt: Number(java.lang.System.currentTimeMillis()),
        entries: entries
    };
    var markerFile = new java.io.File(getModuleTxnMarkerPath());
    var commitFile = new java.io.File(getModuleTxnCommitPath());
    if (!writeTextFile(markerFile.getAbsolutePath(), JSON.stringify(txn, null, 2))) {
        cleanupStagedTransactionEntries(entries);
        throw "write module transaction marker failed";
    }
    var commitWritten = false;
    try {
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            var destFile = new java.io.File(String(entry.destPath));
            var stageFile = new java.io.File(String(entry.stagePath));
            var backupFile = new java.io.File(String(entry.backupPath));
            if (!stageFile.exists()) throw "transaction stage missing: " + stageFile.getAbsolutePath();
            if (backupFile.exists() && !backupFile.delete()) throw "delete stale transaction backup failed: " + backupFile.getAbsolutePath();
            if (entry.hadDest === true) {
                if (!destFile.exists()) throw "transaction destination disappeared: " + destFile.getAbsolutePath();
                if (!destFile.renameTo(backupFile)) throw "backup transaction destination failed: " + destFile.getAbsolutePath();
            } else if (destFile.exists()) {
                throw "unexpected transaction destination exists: " + destFile.getAbsolutePath();
            }
            if (!stageFile.renameTo(destFile)) throw "install transaction stage failed: " + stageFile.getAbsolutePath();
        }
        for (var vi = 0; vi < entries.length; vi++) {
            if (!transactionEntryMatches(entries[vi])) throw "transaction verification failed: " + String(entries[vi].destPath || "");
        }
        if (!writeTextFile(commitFile.getAbsolutePath(), txnId)) throw "write module transaction commit marker failed";
        commitWritten = true;
        __installedManifest = installedManifest || null;
        var finalized = finalizeCommittedModuleTransaction(txn);
        return { ok: true, count: entries.length, id: txnId, cleanupPending: !finalized };
    } catch (eTxn) {
        if (!commitWritten) {
            try { rollbackModuleTransaction(txn, String(eTxn)); } catch (eRollback) {
                throw String(eTxn) + "; " + String(eRollback);
            }
        }
        throw String(eTxn);
    }
}


function installPendingModuleUpdates() {
    if (__manualUpdateRunning) return { ok: false, running: true, msg: "更新正在进行" };
    __manualUpdateRunning = true;
    var names = [];
    var entries = [];
    try {
        recoverPendingModuleTransaction();
        var dir = ensureCodeDir();
        if (UPDATE_SECURITY_MODE !== 0 && !__trustedManifest) fetchTrustedManifest();
        if (UPDATE_SECURITY_MODE !== 0 && !__trustedManifest) throw (__securityStatus && __securityStatus.msg ? __securityStatus.msg : "更新清单不可用");

        for (var i = 0; i < modules.length; i++) {
            var relPath = String(modules[i]);
            var destFile = new java.io.File(dir, relPath);
            var currentHash = destFile.exists() ? sha256File(destFile.getAbsolutePath()) : null;
            if (UPDATE_SECURITY_MODE === 0) {
                var plainEntry = stagePlainModuleEntry(relPath, destFile);
                if (currentHash && hashesEqual(currentHash, plainEntry.expectedHash)) {
                    cleanupStagedTransactionEntries([plainEntry]);
                    continue;
                }
                entries.push(plainEntry);
                names.push(relPath);
                continue;
            }
            var info = getManifestInfo(relPath);
            if (!info || !info.sha256) throw "module not in trusted manifest: " + relPath;
            var expectedHash = String(info.sha256).toLowerCase();
            if (currentHash && hashesEqual(currentHash, expectedHash)) {
                saveTrustedSha(relPath, expectedHash);
                continue;
            }
            entries.push(stageVerifiedModuleEntry(relPath, destFile));
            names.push(relPath);
        }

        var installedManifest = null;
        var txnResult = { ok: true, count: 0, id: "", cleanupPending: false };
        if (entries.length > 0) {
            installedManifest = appendTransactionMetadataEntries(entries);
            txnResult = executeStagedModuleTransaction(entries, installedManifest);
        } else {
            if (!saveInstalledManifestFromLocal()) throw "保存本地安装清单失败";
            if (UPDATE_SECURITY_MODE === 2 && __trustedManifest) {
                if (!writeTextFile(getTrustedVersionPath(), String(__trustedManifest.version || 0))) {
                    throw "保存可信清单版本失败";
                }
            }
        }

        __pendingModuleUpdates = [];
        var rel = getManifestRelease();
        var now = java.lang.System.currentTimeMillis();
        TOOLHUB_UPDATE_STATE.ok = true;
        TOOLHUB_UPDATE_STATE.status = names.length > 0 ? "updated" : "latest";
        TOOLHUB_UPDATE_STATE.version = (__trustedManifest && __trustedManifest.version !== undefined) ? Number(__trustedManifest.version || 0) : Number(TOOLHUB_UPDATE_STATE.version || 0);
        TOOLHUB_UPDATE_STATE.title = rel.title || TOOLHUB_UPDATE_STATE.title || "";
        TOOLHUB_UPDATE_STATE.date = rel.date || TOOLHUB_UPDATE_STATE.date || "";
        TOOLHUB_UPDATE_STATE.changes = rel.changes || TOOLHUB_UPDATE_STATE.changes || [];
        TOOLHUB_UPDATE_STATE.updatedCount = names.length;
        TOOLHUB_UPDATE_STATE.updatedModules = names;
        TOOLHUB_UPDATE_STATE.availableCount = 0;
        TOOLHUB_UPDATE_STATE.availableModules = [];
        TOOLHUB_UPDATE_STATE.availableDetails = [];
        TOOLHUB_UPDATE_STATE.needRestart = names.length > 0;
        TOOLHUB_UPDATE_STATE.lastCheckAt = Number(now);
        TOOLHUB_UPDATE_STATE.error = "";
        writeLog("Transactional module update finished, count=" + names.length + ", modules=" + names.join(",") + ", txn=" + String(txnResult.id || "") + ", cleanupPending=" + String(txnResult.cleanupPending === true));
        return {
            ok: true,
            count: names.length,
            modules: names,
            needRestart: names.length > 0,
            transactionId: String(txnResult.id || ""),
            cleanupPending: txnResult.cleanupPending === true,
            msg: names.length > 0 ? ("已事务更新 " + names.length + " 个子模块，重启 ToolHub 后生效。") : "子模块已是最新。"
        };
    } catch (eInstall) {
        cleanupStagedTransactionEntries(entries);
        var errText = String(eInstall);
        TOOLHUB_UPDATE_STATE.ok = false;
        TOOLHUB_UPDATE_STATE.status = "error";
        TOOLHUB_UPDATE_STATE.error = errText;
        TOOLHUB_UPDATE_STATE.lastCheckAt = Number(java.lang.System.currentTimeMillis());
        writeLog("Transactional module update failed: " + errText);
        return { ok: false, error: errText, msg: "更新失败，整批已回滚：" + errText };
    } finally {
        __manualUpdateRunning = false;
    }
}


function checkToolHubModuleUpdatesNow() {
    if (__runtimeUpdateCheckRunning) return { ok: false, running: true, msg: "检查正在进行" };
    __runtimeUpdateCheckRunning = true;
    var names = [];
    try {
        ensureCodeDir();
        if (UPDATE_SECURITY_MODE === 0) {
            applyRuntimeUpdateState([], "");
            writeLog("Runtime module update check skipped in plain mode");
            return { ok: true, count: 0, modules: [], msg: "普通更新模式已跳过清单检查" };
        }
        fetchTrustedManifest();
        if (!__trustedManifest) throw (__securityStatus && __securityStatus.msg ? __securityStatus.msg : "更新清单不可用");
        __pendingModuleUpdates = [];
        var dir = ensureCodeDir();
        for (var i = 0; i < modules.length; i++) {
            var relPath = String(modules[i]);
            var f = new java.io.File(dir, relPath);
            var info = getManifestInfo(relPath);
            if (!info || !info.sha256) throw "module not in trusted manifest: " + relPath;
            var expectedHash = String(info.sha256).toLowerCase();
            var expectedSize = Number(info.size || 0);
            var remoteVersion = getManifestModuleVersion(info);
            var localVersion = f.exists() ? readModuleVersionFromFile(f) : "0.0.0";
            var actualHash = f.exists() ? sha256File(f.getAbsolutePath()) : "";
            if (!f.exists()) {
                addPendingModuleUpdate(relPath, "", expectedHash, expectedSize, localVersion, remoteVersion, "missing");
                names.push(relPath);
                continue;
            }
            if (remoteVersion) {
                var versionCmp = compareModuleVersion(remoteVersion, localVersion);
                if (versionCmp > 0) {
                    addPendingModuleUpdate(relPath, actualHash, expectedHash, expectedSize, localVersion, remoteVersion, "version");
                    names.push(relPath);
                    continue;
                }
                if (versionCmp === 0) {
                    if (actualHash && hashesEqual(actualHash, expectedHash)) {
                        saveTrustedSha(relPath, expectedHash);
                        continue;
                    }
                    throw "本地子模块同版本内容异常：" + relPath;
                }
                writeLog("Local module version is newer, skip update " + relPath + " local=" + localVersion + " remote=" + remoteVersion);
                continue;
            }
            if (actualHash && hashesEqual(actualHash, expectedHash)) {
                saveTrustedSha(relPath, expectedHash);
                continue;
            }
            var installedHash = getInstalledSha(relPath);
            var trustedHash = getTrustedSha(relPath);
            if (actualHash && (hashesEqual(actualHash, installedHash) || hashesEqual(actualHash, trustedHash))) {
                addPendingModuleUpdate(relPath, actualHash, expectedHash, expectedSize, localVersion, remoteVersion, "hash");
                names.push(relPath);
                continue;
            }
            throw "本地子模块状态异常：" + relPath;
        }
        applyRuntimeUpdateState(names, "");
        writeLog("Runtime module update check finished, count=" + names.length + ", modules=" + names.join(","));
        return {
            ok: true,
            count: names.length,
            modules: names,
            msg: names.length > 0 ? ("发现 " + names.length + " 个可更新子模块。") : "已是最新。"
        };
    } catch (eCheck) {
        var errText = String(eCheck);
        __pendingModuleUpdates = [];
        applyRuntimeUpdateState([], errText);
        writeLog("Runtime module update check failed: " + errText);
        return { ok: false, error: errText, msg: "检查失败：" + errText };
    } finally {
        __runtimeUpdateCheckRunning = false;
    }
}


function checkModuleManifestConsistency() {
    var ret = {
        ok: true,
        missingInManifest: [],
        unusedInManifest: [],
        error: ""
    };

    try {
        if (UPDATE_SECURITY_MODE === 0) return ret;
        if (!__trustedManifest || !__trustedManifest.files) {
            ret.ok = false;
            ret.error = "trusted manifest missing";
            return ret;
        }

        var moduleMap = {};
        var i;
        for (i = 0; i < modules.length; i++) {
            moduleMap[String(modules[i])] = true;
        }

        for (i = 0; i < modules.length; i++) {
            var rel = String(modules[i]);
            if (!__trustedManifest.files[rel]) ret.missingInManifest.push(rel);
        }

        for (var k in __trustedManifest.files) {
            if (!__trustedManifest.files.hasOwnProperty(k)) continue;
            var ks = String(k);
            if (ks.indexOf("th_") === 0 && ks.lastIndexOf(".js") === ks.length - 3) {
                if (!moduleMap[ks]) ret.unusedInManifest.push(ks);
            }
        }

        if (ret.missingInManifest.length > 0) {
            ret.ok = false;
            ret.error = "modules not in manifest: " + ret.missingInManifest.join(",");
        }

        if (ret.unusedInManifest.length > 0) {
            writeLog("WARN manifest has unused modules: " + ret.unusedInManifest.join(","));
        }

        return ret;
    } catch (e) {
        ret.ok = false;
        ret.error = String(e);
        return ret;
    }
}

function verifyLocalModuleBeforeEval(relPath, fileObj) {
    if (!fileObj || !fileObj.exists()) throw "本地模块不存在: " + relPath;
    if (UPDATE_SECURITY_MODE === 0) return true;

    var actualHash = sha256File(fileObj.getAbsolutePath());
    if (!actualHash) throw "无法计算模块 SHA256: " + relPath;

    var info = getManifestInfo(relPath);
    if (info && info.sha256) {
        var expectedHash = String(info.sha256).toLowerCase();
        if (hashesEqual(actualHash, expectedHash)) return true;
    }

    var trustedHash = getTrustedSha(relPath);
    if (trustedHash && hashesEqual(actualHash, trustedHash)) return true;

    var installedHash = getInstalledSha(relPath);
    if (installedHash && hashesEqual(actualHash, installedHash)) return true;

    throw "本地模块未通过安全校验: " + relPath;
}

function loadScript(relPath) {
    try {
        var dir = ensureCodeDir();
        var f = new java.io.File(dir, relPath);
        var result;
        if (UPDATE_SECURITY_MODE === 0) result = ensurePlainBootModule(relPath, f);
        else if (__trustedManifest) result = ensureBootVerifiedModule(relPath, f);
        else if (UPDATE_SECURITY_MODE === 2) result = ensureLocalTrustedModule(relPath, f);
        else if (f.exists()) result = { updated: false, localFallback: true, size: f.length(), hash: sha256File(f.getAbsolutePath()) };
        else throw "manifest不可用且本地模块不存在: " + relPath;

        if (result.updated) {
            __moduleUpdates.push({ module: relPath, isNew: !!result.isNew, size: result.size, bootFixed: !!result.bootFixed });
            writeLog((UPDATE_SECURITY_MODE === 0 ? "Plain boot repair " : "Verified boot repair ") + relPath + " (" + result.size + " bytes, sha256=" + result.hash + ")");
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
               "th_06_icon_parser.js", "th_08_content.js", "th_09_animation.js",
               "th_10_shell.js", "th_11_action.js", "th_12_rebuild.js", "th_13_panel_ui.js",
               "th_14_panels.js", "th_14_button_shortcut.js", "th_14_button_icon_editor.js", "th_14_button_editor.js",
               "th_14_color_picker.js", "th_14_icon_picker.js", "th_14_schema_editor.js", "th_15_extra.js", "th_15_main_panel.js", "th_16_entry.js", "th_17_pointer.js", "th_18_pointer_ocr.js", "th_19_position_state.js", "th_20_pickword.js", "th_21_result_preview.js", "th_22_image_viewer.js", "th_23_screenshot_manager.js"];
var __moduleUpdates = [];
var __pendingModuleUpdates = [];
var loadErrors = [];
var criticalModules = { "th_01_base.js": true, "th_02_core.js": true, "th_05_persistence.js": true, "th_16_entry.js": true, "th_19_position_state.js": true };
recoverPendingModuleTransaction();
fetchTrustedManifest();

var __manifestCheck = checkModuleManifestConsistency();
if (!__manifestCheck.ok) {
    throw "模块清单自检失败: " + String(__manifestCheck.error || "");
}

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

function notifyToolHubModulesLoaded() {
    if (loadErrors && loadErrors.length > 0) return false;
    var moduleCount = modules ? Number(modules.length || 0) : 0;
    var text = moduleCount > 0
        ? "ToolHub 子模块加载完成（" + String(moduleCount) + " 个）"
        : "ToolHub 子模块加载完成";
    var task = new java.lang.Runnable({ run: function() {
        try { android.widget.Toast.makeText(context, text, android.widget.Toast.LENGTH_SHORT).show(); }
        catch (eToast) { try { writeLog("Submodules loaded toast failed: " + String(eToast)); } catch (eLog) {} }
    }});
    try { new android.os.Handler(android.os.Looper.getMainLooper()).post(task); }
    catch (ePost) { try { task.run(); } catch (eDirect) {} }
    try { writeLog("All submodules loaded count=" + String(moduleCount)); } catch (eWrite) {}
    return true;
}
notifyToolHubModulesLoaded();

if (__trustedManifest && loadErrors.length === 0 && __pendingModuleUpdates.length === 0) saveInstalledManifestFromLocal();
if (UPDATE_SECURITY_MODE === 2 && __trustedManifest && loadErrors.length === 0 && __pendingModuleUpdates.length === 0) saveTrustedVersion(__trustedManifest.version);

var TOOLHUB_ACTIVE_APP = (typeof TOOLHUB_ACTIVE_APP !== "undefined") ? TOOLHUB_ACTIVE_APP : null;
var __toolHubRestartRunning = (typeof __toolHubRestartRunning !== "undefined") ? __toolHubRestartRunning : false;
var TOOLHUB_APP_REGISTRY = (typeof TOOLHUB_APP_REGISTRY !== "undefined" && TOOLHUB_APP_REGISTRY) ? TOOLHUB_APP_REGISTRY : [];

function registerToolHubAppInstance(appObj) {
  try {
    if (!appObj) return;
    if (!TOOLHUB_APP_REGISTRY) TOOLHUB_APP_REGISTRY = [];
    for (var i = 0; i < TOOLHUB_APP_REGISTRY.length; i++) {
      if (TOOLHUB_APP_REGISTRY[i] === appObj) {
        TOOLHUB_ACTIVE_APP = appObj;
        return;
      }
    }
    TOOLHUB_APP_REGISTRY.push(appObj);
    TOOLHUB_ACTIVE_APP = appObj;
  } catch(eRegApp) {
    try { writeLog("Register app instance failed: " + String(eRegApp)); } catch(eLogRegApp) {}
  }
}

function unregisterToolHubAppInstance(appObj) {
  try {
    if (!appObj) return;
    var next = [];
    if (TOOLHUB_APP_REGISTRY) {
      for (var i = 0; i < TOOLHUB_APP_REGISTRY.length; i++) {
        if (TOOLHUB_APP_REGISTRY[i] && TOOLHUB_APP_REGISTRY[i] !== appObj) next.push(TOOLHUB_APP_REGISTRY[i]);
      }
    }
    TOOLHUB_APP_REGISTRY = next;
    if (TOOLHUB_ACTIVE_APP === appObj) TOOLHUB_ACTIVE_APP = next.length > 0 ? next[next.length - 1] : null;
  } catch(eUnregApp) {
    try { writeLog("Unregister app instance failed: " + String(eUnregApp)); } catch(eLogUnregApp) {}
  }
}

function getToolHubCloseActionForRestart(appObj) {
  try {
    if (appObj && appObj.config && appObj.config.ACTION_CLOSE_ALL) return String(appObj.config.ACTION_CLOSE_ALL);
  } catch(eAction0) {}
  try {
    if (typeof CONST_ACTION_CLOSE_ALL_RULE !== "undefined" && CONST_ACTION_CLOSE_ALL_RULE) return String(CONST_ACTION_CLOSE_ALL_RULE);
  } catch(eAction1) {}
  return "shortx.wm.floatball.CLOSE";
}

function sendToolHubCloseBroadcastForRestart(appObj) {
  var action = getToolHubCloseActionForRestart(appObj);
  var ret = { ok: false, action: action, via: "" };
  try {
    context.sendBroadcast(new android.content.Intent(String(action)));
    ret.ok = true;
    ret.via = "context";
    return ret;
  } catch(eCtx) {
    ret.error = String(eCtx);
  }
  try {
    if (typeof shell === "function") {
      shell("am broadcast -a " + String(action));
      ret.ok = true;
      ret.via = "shell";
      return ret;
    }
  } catch(eShell) {
    ret.error = String(ret.error || "") + "; shell=" + String(eShell);
  }
  try { writeLog("Restart close broadcast failed action=" + String(action) + " err=" + String(ret.error || "")); } catch(eLogBroadcast) {}
  return ret;
}

function closeToolHubAppForRestart(appObj) {
  var ret = { ok: false, skipped: false, timedOut: false, err: "" };
  try {
    if (!appObj) {
      ret.ok = true;
      ret.skipped = true;
      return ret;
    }
    if (appObj.state && appObj.state.closed) {
      unregisterToolHubAppInstance(appObj);
      ret.ok = true;
      ret.skipped = true;
      return ret;
    }
    if (appObj.state && appObj.state.h) {
      var latch = new java.util.concurrent.CountDownLatch(1);
      var posted = false;
      try {
        posted = appObj.state.h.post(new JavaAdapter(java.lang.Runnable, {
          run: function() {
            try {
              if (typeof appObj.close === "function") appObj.close();
              ret.ok = true;
            } catch(eClosePost) {
              ret.err = String(eClosePost);
              try { writeLog("Restart close post failed: " + String(eClosePost)); } catch(eLogClosePost) {}
            } finally {
              try { latch.countDown(); } catch(eLatchDown) {}
            }
          }
        }));
      } catch(ePostClose) {
        ret.err = String(ePostClose);
        posted = false;
      }
      if (posted) {
        var done = false;
        try { done = latch["await"](2800, java.util.concurrent.TimeUnit.MILLISECONDS); } catch(eAwaitClose) { ret.err = String(eAwaitClose); }
        if (!done) {
          ret.timedOut = true;
          if (!ret.err) ret.err = "close wait timeout";
        }
        return ret;
      }
    }
    if (typeof appObj.close === "function") {
      appObj.close();
      ret.ok = true;
      return ret;
    }
    ret.ok = true;
    ret.skipped = true;
  } catch(eClose) {
    ret.err = String(eClose);
    try { writeLog("Restart close failed: " + String(eClose)); } catch(eLogClose) {}
  }
  return ret;
}

function closeToolHubAppsForRestart(primaryApp) {
  var broadcastRet = sendToolHubCloseBroadcastForRestart(primaryApp);
  try { java.lang.Thread.sleep(broadcastRet.ok ? 250 : 80); } catch(eSleepCloseBroadcast) {}
  var list = [];
  var i;
  try {
    if (TOOLHUB_APP_REGISTRY) {
      for (i = 0; i < TOOLHUB_APP_REGISTRY.length; i++) {
        if (TOOLHUB_APP_REGISTRY[i]) list.push(TOOLHUB_APP_REGISTRY[i]);
      }
    }
  } catch(eListRegistry) {}
  if (primaryApp) {
    var exists = false;
    for (i = 0; i < list.length; i++) {
      if (list[i] === primaryApp) exists = true;
    }
    if (!exists) list.push(primaryApp);
  }
  var closed = 0;
  var timedOut = 0;
  for (i = 0; i < list.length; i++) {
    var one = closeToolHubAppForRestart(list[i]);
    if (one && one.ok) closed++;
    if (one && one.timedOut) timedOut++;
  }
  try { writeLog("Restart close sweep action=" + String(broadcastRet.action || "") + " broadcast=" + String(broadcastRet.ok) + " apps=" + String(list.length) + " closed=" + String(closed) + " timeout=" + String(timedOut)); } catch(eLogSweep) {}
  return { broadcast: broadcastRet, count: list.length, closed: closed, timedOut: timedOut };
}

function reloadLocalToolHubModulesForRestart() {
  var dir = ensureCodeDir();

  if (UPDATE_SECURITY_MODE !== 0 && !__trustedManifest) {
    fetchTrustedManifest();
  }

  if (UPDATE_SECURITY_MODE !== 0 && !__trustedManifest) {
    throw (__securityStatus && __securityStatus.msg ? __securityStatus.msg : "更新清单不可用");
  }

  var checkRet = checkModuleManifestConsistency();
  if (!checkRet.ok) {
    throw "模块清单自检失败: " + String(checkRet.error || "");
  }

  for (var i = 0; i < modules.length; i++) {
    var relPath = String(modules[i]);
    var f = new java.io.File(dir, relPath);
    if (!f.exists()) throw "本地模块不存在: " + relPath;

    verifyLocalModuleBeforeEval(relPath, f);

    var code = readTextFile(f.getAbsolutePath());
    if (code === null) throw "读取模块失败: " + relPath;
    var geval = eval;
    geval(String(code));
  }
}

function restartToolHubFromSettings() {
  if (__toolHubRestartRunning) return { ok: false, running: true, msg: "ToolHub 正在重启" };
  __toolHubRestartRunning = true;
  try { writeLog("Restart requested from settings"); } catch(eLog0) {}
  new java.lang.Thread(new java.lang.Runnable({
    run: function() {
      try {
        var oldApp = null;
        try { oldApp = TOOLHUB_ACTIVE_APP; } catch(eOld) { oldApp = null; }
        closeToolHubAppsForRestart(oldApp);
        try { java.lang.Thread.sleep(200); } catch(eSleep) {}
        reloadLocalToolHubModulesForRestart();
        var entryInfo = getProcessInfo("restart");
        var logger = new ToolHubLogger(entryInfo);
        installCrashHandler(logger);
        var app = new FloatBallAppWM(logger);
        registerToolHubAppInstance(app);
        var closeRule = String(app.config.ACTION_CLOSE_ALL_RULE || "shortx.wm.floatball.CLOSE");
        var startRet = app.startAsync(entryInfo, closeRule);
        if (startRet && startRet.ok) {
          try {
            if (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) {
              TOOLHUB_UPDATE_STATE.needRestart = false;
              TOOLHUB_UPDATE_STATE.status = "latest";
              TOOLHUB_UPDATE_STATE.availableCount = 0;
              TOOLHUB_UPDATE_STATE.availableModules = [];
              TOOLHUB_UPDATE_STATE.availableDetails = [];
              TOOLHUB_UPDATE_STATE.error = "";
            }
          } catch(eState) {}
          try { writeLog("Restart finished, closeAction=" + String(startRet.closeAction || "")); } catch(eLog1) {}
        } else {
          unregisterToolHubAppInstance(app);
          try { writeLog("Restart start failed: " + String(startRet && startRet.err ? startRet.err : "unknown")); } catch(eLog2) {}
        }
      } catch(eRestart) {
        try { writeLog("Restart failed: " + String(eRestart)); } catch(eLog3) {}
      } finally {
        __toolHubRestartRunning = false;
      }
    }
  })).start();
  return { ok: true, msg: "正在重启 ToolHub" };
}

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
  function summarizeModuleUpdates(list) {
    var names = [];
    var created = 0;
    var overwritten = 0;
    var i;
    for (i = 0; i < list.length; i++) {
      var item = list[i] || {};
      var name = runtimeOptString(item.module);
      if (name) names.push(name);
      if (item.isNew) created++; else overwritten++;
    }
    if (names.length === 0) return { count: 0, modules: [], msg: "启动阶段未补全或修复子模块。" };
    return { count: names.length, modules: names, msg: "启动阶段补全/修复 " + names.length + " 个子模块（新增 " + created + " / 修复 " + overwritten + "）：" + names.join("、") };
  }
  function summarizePendingModuleUpdates(list) {
    var names = [];
    var i;
    for (i = 0; i < list.length; i++) {
      var item = list[i] || {};
      var name = runtimeOptString(item.module);
      if (name) names.push(name);
    }
    return { count: names.length, modules: names, details: copyRuntimeDetailList(list), msg: names.length ? ("发现 " + names.length + " 个可更新子模块：" + names.join("、")) : "所有子模块已是最新。" };
  }
  function summarizeLoadErrors(list) {
    var names = [];
    var i;
    for (i = 0; i < list.length; i++) {
      var item = list[i] || {};
      var name = runtimeOptString(item.module);
      if (name) names.push(name);
    }
    return { count: names.length, modules: names, msg: names.length ? ("有 " + names.length + " 个子模块加载失败：" + names.join("、")) : "所有子模块加载正常。" };
  }
  function buildToolHubUpdateState(syncInfo, pendingInfo, loadInfo, securityText) {
    var rel = getManifestRelease();
    var modeText = getUpdateModeText();
    var statusName = "latest";
    var errText = "";
    var versionNum = getTrustedManifestVersionNumber();
    if (UPDATE_SECURITY_MODE === 0) statusName = "plain";
    if (syncInfo && syncInfo.count > 0) statusName = "updated";
    if (pendingInfo && pendingInfo.count > 0) statusName = "available";
    if (!__securityStatus || !__securityStatus.ok) {
      statusName = "error";
      errText = runtimeOptString(__securityStatus && __securityStatus.msg);
    }
    if (loadInfo && loadInfo.count > 0) {
      statusName = "error";
      errText = errText ? (errText + "；" + loadInfo.msg) : loadInfo.msg;
    }
    return {
      ok: statusName !== "error",
      status: statusName,
      source: "GitHub",
      mode: UPDATE_SECURITY_MODE,
      modeText: modeText,
      version: versionNum,
      title: runtimeOptString(rel.title),
      date: runtimeOptString(rel.date),
      changes: copyRuntimeStringList(rel.changes),
      updatedCount: syncInfo ? Number(syncInfo.count || 0) : 0,
      updatedModules: syncInfo ? copyRuntimeStringList(syncInfo.modules) : [],
      availableCount: pendingInfo ? Number(pendingInfo.count || 0) : 0,
      availableModules: pendingInfo ? copyRuntimeStringList(pendingInfo.modules) : [],
      availableDetails: pendingInfo ? copyRuntimeDetailList(pendingInfo.details) : [],
      bootFixedCount: syncInfo ? Number(syncInfo.count || 0) : 0,
      bootFixedModules: syncInfo ? copyRuntimeStringList(syncInfo.modules) : [],
      needRestart: false,
      lastCheckAt: Number(java.lang.System.currentTimeMillis()),
      securityText: runtimeOptString(securityText),
      error: errText
    };
  }

  var syncInfo = summarizeModuleUpdates(__moduleUpdates);
  var pendingInfo = summarizePendingModuleUpdates(__pendingModuleUpdates);
  var loadInfo = summarizeLoadErrors(loadErrors);
  var securityText = buildToolHubSecurityText();
  TOOLHUB_UPDATE_STATE = buildToolHubUpdateState(syncInfo, pendingInfo, loadInfo, securityText);

  var existingApp = null;
  try { existingApp = TOOLHUB_ACTIVE_APP; } catch(eExistingApp) { existingApp = null; }
  if (existingApp) {
    try { writeLog("Entry found existing ToolHub app, closing before start"); } catch(eLogExisting) {}
    closeToolHubAppsForRestart(existingApp);
  }

  var entryInfo = getProcessInfo("entry");
  var logger = new ToolHubLogger(entryInfo);
  installCrashHandler(logger);
  var app = new FloatBallAppWM(logger);
  registerToolHubAppInstance(app);
  var closeRule = String(app.config.ACTION_CLOSE_ALL_RULE || "shortx.wm.floatball.CLOSE");
  var startRet = null;
  try { startRet = app.startAsync(entryInfo, closeRule); }
  catch (eTop) {
    try { logger.fatal("TOP startAsync crash err=" + String(eTop)); } catch(eLog) {}
    startRet = { ok: false, err: String(eTop) };
  }
  var started = !!(startRet && startRet.ok);
  var degraded = started && loadInfo.count > 0;
  var healthy = started && !degraded;
  if (!started) unregisterToolHubAppInstance(app);
  var layoutObj = startRet && startRet.layout || null;
  var layoutText = layoutObj ? (String(layoutObj.cols || "?") + "×" + String(layoutObj.rows || "?")) : "未知";
  var syncText = syncInfo.count > 0
    ? ("✓ 启动已补全/修复 " + syncInfo.count + " 个模块：" + syncInfo.modules.join("、"))
    : (pendingInfo.count > 0 ? ("↻ 有 " + pendingInfo.count + " 个子模块可更新") : "✓ 子模块已是最新");
  var startupStatus = !started ? "failed" : (degraded ? "degraded" : "healthy");
  var startupText = !started ? "ToolHub 启动失败" : (degraded ? "ToolHub 降级启动" : "ToolHub 启动成功");

  var out = {
    ok: healthy,
    started: started,
    degraded: degraded,
    启动状态: startupStatus,
    状态: startupText,
    安全: securityText,
    同步: syncText,
    更新状态: TOOLHUB_UPDATE_STATE.status,
    布局: layoutText,
    关闭广播: runtimeOptString(startRet && startRet.closeAction)
  };
  if (TOOLHUB_UPDATE_STATE.title) out.更新标题 = TOOLHUB_UPDATE_STATE.title;
  if (TOOLHUB_UPDATE_STATE.changes && TOOLHUB_UPDATE_STATE.changes.length > 0) out.更新内容 = TOOLHUB_UPDATE_STATE.changes;
  if (syncInfo.count > 0) out.启动修复模块 = syncInfo.modules;
  if (pendingInfo.count > 0) out.可更新模块 = pendingInfo.modules;
  if (loadInfo.count > 0) out.加载异常 = loadInfo.modules;
  if (!started) {
    out.错误 = runtimeOptString(startRet && startRet.err) || (loadInfo.count > 0 ? loadInfo.msg : "未知错误");
  } else if (degraded) {
    out.降级原因 = loadInfo.msg;
    out.错误 = loadInfo.msg;
  }
  try {
    writeLog("Startup result status=" + startupStatus + " started=" + String(started) + " degraded=" + String(degraded) + " loadErrors=" + String(loadInfo.count || 0));
  } catch (eStartupStatusLog) {}
  return out;
})();
JSON.stringify(__out, null, 2);
