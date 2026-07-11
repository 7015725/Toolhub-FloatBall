// ToolHub - 入口文件 (加载子模块并执行)
// Entry sync marker: 2026-07-03 06:42:55 +0800
// 安全更新机制：入口内置 RSA 公钥，先验证 manifest.json/manifest.sig，再按 SHA256 下载子模块。
// Gitea 只负责分发；未通过签名/哈希/防回滚校验时，不覆盖本地模块。

var UPDATE_SOURCE = 1; // 0: Gitea, 1: GitHub
var UPDATE_SECURITY_MODE = 2; // 0: 普通更新, 1: manifest哈希校验, 2: 完整验签安全更新

var UPDATE_ROOTS = [
    "https://git.xin-blog.com/linshenjianlu/ShortX_ToolHub/raw/branch/main/",
    "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/main/"
];

if (UPDATE_SOURCE !== 1) UPDATE_SOURCE = 0;
UPDATE_SECURITY_MODE = parseInt(String(UPDATE_SECURITY_MODE || 0), 10);
if (isNaN(UPDATE_SECURITY_MODE) || UPDATE_SECURITY_MODE < 0 || UPDATE_SECURITY_MODE > 2) UPDATE_SECURITY_MODE = 0;

var GIT_ROOT = UPDATE_ROOTS[UPDATE_SOURCE];
var GIT_BASE = GIT_ROOT + "code/";
var TRUSTED_PUBLIC_KEYS = {
    "toolhub-targets-20260703-rsa3072": "MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAxcjp3aJFSfhqiOzs1klu+LIyTcIA/SzgCmMUjJgy8x5paDl9YO7F1r0XVHNzH1TZrkIzzck+w3geEtcRRjQqDOb6aUynvbCuMaDm8RlhGZnXHUE6/7uvbG3t5wwv7nML+L+MnBU9OysJcwAB+MgSWJUAr/A4oWB3IXpBwJWGft1iDmt7jWbajaDMiyEpDdVVJabsQsZlEfy4r9PhsXCu/cWYuuOPQq+MM8nA1U7QpJuXh55epx1uCoP+DIroFwdFIjUB5b+woWuMk9KtR6FOmoVzFiflD5tJfkqS0mHlmilINhsLpecDAFDwE/YP2Nzy/+X+jO8AEFJBqmWs80w/bHSz6lKxXG8AuAIcf+AuB1XMyPkST7BvZeQ8mF239Gq4y9oOLqKjISqagrRUqGM99nl7CSNsBqPGBN9guxnnR2lkWZD+0ij++mzKsfIC9N0JQaB0/f2eaXUfB/qrxsh600ZlpEJEPn1O3BL9TKOWqd9BO/XS6jhUPAXiG6LQxKf5AgMBAAE="
};
var DEFAULT_TRUSTED_KEY_ID = "toolhub-targets-20260703-rsa3072";
var MIN_TRUSTED_MANIFEST_VERSION = 20260507152251;
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

var __toolHubRootDir = null;

function getAndroidContext() {
    try {
        var app = Packages.android.app.ActivityThread.currentApplication();
        if (app) return app.getApplicationContext ? app.getApplicationContext() : app;
    } catch (eApp) {}
    try {
        var ctx = Packages.tornaco.apps.shortx.core.OooO0O0.OooO00o();
        if (ctx && ctx.getApplicationContext) return ctx.getApplicationContext();
        return ctx;
    } catch (eCtx) {}
    return null;
}

function canWriteDirPath(path) {
    try {
        if (!path) return false;
        var dir = new java.io.File(String(path));
        if (!dir.exists() && !dir.mkdirs()) return false;
        if (!dir.isDirectory()) return false;
        var probe = new java.io.File(dir, ".write_probe_" + java.lang.System.currentTimeMillis());
        var out = new java.io.FileOutputStream(probe, false);
        out.write(49);
        out.close();
        try { probe.delete(); } catch (eDelProbe) {}
        return true;
    } catch (eProbe) { return false; }
}

function assertWritableDirPath(path, label) {
    try {
        if (!path) throw String(label || "dir") + " path empty";
        var dir = new java.io.File(String(path));
        if (!dir.exists() && !dir.mkdirs()) throw String(label || "dir") + " mkdirs failed: " + path;
        if (!dir.isDirectory()) throw String(label || "dir") + " is not directory: " + path;

        var probe = new java.io.File(dir, ".write_probe_" + java.lang.System.currentTimeMillis());
        var out = new java.io.FileOutputStream(probe, false);
        try {
            out.write(49);
            out.flush();
        } finally {
            try { out.close(); } catch (eCloseProbe) {}
        }
        try { probe.delete(); } catch (eDelProbe) {}

        return true;
    } catch (e) {
        throw String(label || "dir") + " not writable: " + String(path) + " / " + String(e);
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

function getLogPath() { return getToolHubRootDir() + "/logs/init.log"; }
function getCodeDirPath() { return getToolHubRootDir() + "/code/"; }
function getTrustedShaPath(relPath) { return getCodeDirPath() + ".trusted_sha_" + relPath; }
function getTrustedVersionPath() { return getCodeDirPath() + ".trusted_manifest_version"; }
function getInstalledManifestPath() { return getCodeDirPath() + ".installed_manifest.json"; }

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

function getUpdateSourceText() {
    return UPDATE_SOURCE === 1 ? "GitHub" : "Gitea";
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
        TOOLHUB_UPDATE_STATE.source = getUpdateSourceText();
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
    if (destFile.exists()) {
        return { updated: false, localFallback: true, size: destFile.length(), hash: sha256File(destFile.getAbsolutePath()) };
    }
    var ret = ensurePlainRemoteModule(relPath, destFile);
    ret.isNew = true;
    ret.bootFixed = true;
    return ret;
}

function ensureBootVerifiedModule(relPath, destFile) {
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

function installPendingModuleUpdates() {
    if (__manualUpdateRunning) return { ok: false, running: true, msg: "更新正在进行" };
    __manualUpdateRunning = true;
    var names = [];
    try {
        var dir = ensureCodeDir();
        if (UPDATE_SECURITY_MODE !== 0 && !__trustedManifest) fetchTrustedManifest();
        if (UPDATE_SECURITY_MODE !== 0 && !__trustedManifest) throw (__securityStatus && __securityStatus.msg ? __securityStatus.msg : "更新清单不可用");
        for (var i = 0; i < modules.length; i++) {
            var relPath = String(modules[i]);
            var f = new java.io.File(dir, relPath);
            var result = null;
            if (UPDATE_SECURITY_MODE === 0) {
                result = ensurePlainRemoteModule(relPath, f);
            } else {
                var info = getManifestInfo(relPath);
                if (!info || !info.sha256) throw "module not in trusted manifest: " + relPath;
                var expectedHash = String(info.sha256).toLowerCase();
                var actualHash = f.exists() ? sha256File(f.getAbsolutePath()) : null;
                if (actualHash && hashesEqual(actualHash, expectedHash)) {
                    saveTrustedSha(relPath, expectedHash);
                    continue;
                }
                result = ensureVerifiedModule(relPath, f);
            }
            if (result && result.updated) names.push(relPath);
        }
        __pendingModuleUpdates = [];
        saveInstalledManifestFromLocal();
        if (UPDATE_SECURITY_MODE === 2 && __trustedManifest) saveTrustedVersion(__trustedManifest.version);
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
        writeLog("Manual module update finished, count=" + names.length + ", modules=" + names.join(","));
        return {
            ok: true,
            count: names.length,
            modules: names,
            needRestart: names.length > 0,
            msg: names.length > 0 ? ("已更新 " + names.length + " 个子模块，重启 ToolHub 后生效。") : "子模块已是最新。"
        };
    } catch (eInstall) {
        var errText = String(eInstall);
        TOOLHUB_UPDATE_STATE.ok = false;
        TOOLHUB_UPDATE_STATE.status = "error";
        TOOLHUB_UPDATE_STATE.error = errText;
        TOOLHUB_UPDATE_STATE.lastCheckAt = Number(java.lang.System.currentTimeMillis());
        writeLog("Manual module update failed: " + errText);
        return { ok: false, error: errText, msg: "更新失败：" + errText };
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
               "th_14_color_picker.js", "th_14_icon_picker.js", "th_14_schema_editor.js", "th_15_extra.js", "th_16_entry.js", "th_17_pointer.js", "th_18_pointer_ocr.js", "th_19_position_state.js"];
var __moduleUpdates = [];
var __pendingModuleUpdates = [];
var loadErrors = [];
var criticalModules = { "th_01_base.js": true, "th_02_core.js": true, "th_05_persistence.js": true, "th_16_entry.js": true, "th_19_position_state.js": true };
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


// =======================【指针无障碍取字提交链修复】=======================
// 普通取字：当前候选或近期有效候选命中最终热点时，松手立即提交。
// POINTER_TEXT_HOVER_MS 仅控制绿色“取字就绪”提示，不再阻断文字复制。
function installToolHubPointerAccessibilityTextReleaseFix(force) {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return false;
  var proto = FloatBallAppWM.prototype;
  if (proto.__toolHubPointerReleaseFixInstalled === true && force !== true) return true;

  function pointerReleaseNow() {
    try { return Number(java.lang.System.currentTimeMillis()); } catch (e0) {}
    return new Date().getTime();
  }

  function normalizePointerReleaseTs(value) {
    var current = pointerReleaseNow();
    var n = Number(value || 0);
    if (isNaN(n) || n <= 0) return current;
    // th_19 旧实现使用 uptimeMillis；遇到开机时间时统一折算到墙上时钟。
    if (n < 1000000000000 && current >= 1000000000000) return current;
    return n;
  }

  function copyPointerReleaseRect(rect) {
    if (!rect) return null;
    return {
      left: Math.round(Number(rect.left || 0)),
      top: Math.round(Number(rect.top || 0)),
      right: Math.round(Number(rect.right || 0)),
      bottom: Math.round(Number(rect.bottom || 0))
    };
  }

  function pointerReleaseLog(appObj, level, message) {
    try { safeLog(appObj && appObj.L, level, message); } catch (e0) {}
  }

  proto.isPointerTextHoverReady = function(atTs) {
    var st = this.ensurePointerToolState();
    if (!st.currentText || !st.currentRect) return false;
    if (st.currentKey && st.hoverKey && String(st.currentKey) !== String(st.hoverKey)) return false;
    var since = Number(st.hoverSince || 0);
    if (isNaN(since) || since <= 0) return false;
    var ts = normalizePointerReleaseTs(atTs);
    if (since > ts) return false;
    return ts - since >= Number(this.getPointerTextHoverLimitMs());
  };

  proto.getPointerTextHoverRemainMs = function(atTs) {
    var st = this.ensurePointerToolState();
    var ts = normalizePointerReleaseTs(atTs);
    var since = Number(st.hoverSince || 0);
    var elapsed = (!isNaN(since) && since > 0 && since <= ts) ? ts - since : 0;
    var remain = Number(this.getPointerTextHoverLimitMs()) - elapsed;
    if (isNaN(remain) || remain < 0) remain = 0;
    return Math.ceil(remain);
  };

  proto.getRecentPointerPickForRelease = function(st, atTs) {
    var pointerState = st || null;
    try {
      if (!pointerState && this.ensurePointerToolState) pointerState = this.ensurePointerToolState();
    } catch (eState) { pointerState = null; }
    if (!pointerState || !pointerState.lastValidPickText || !pointerState.lastValidPickRect) return null;
    if (Number(pointerState.lastValidPickSession || 0) !== Number(pointerState.inspectSession || 0)) return null;

    var now = normalizePointerReleaseTs(atTs);
    var hitAt = Number(pointerState.lastValidPickAt || 0);
    if (isNaN(hitAt) || hitAt <= 0) return null;
    if (hitAt < 1000000000000 && now >= 1000000000000) hitAt = now;
    var age = now - hitAt;
    var graceMs = 500;
    if (age < 0 || age > graceMs) return null;

    var hp = null;
    try { hp = this.getPointerHotspot(); } catch (eHotspot) { hp = null; }
    if (!hp) return null;
    var hit = false;
    try {
      hit = this.pointerRectHitScore ?
        Number(this.pointerRectHitScore(hp.x, hp.y, pointerState.lastValidPickRect)) >= 0 :
        hp.x >= Number(pointerState.lastValidPickRect.left) &&
        hp.x <= Number(pointerState.lastValidPickRect.right) &&
        hp.y >= Number(pointerState.lastValidPickRect.top) &&
        hp.y <= Number(pointerState.lastValidPickRect.bottom);
    } catch (eHit) { hit = false; }
    if (!hit) return null;

    return {
      text: String(pointerState.lastValidPickText),
      rect: copyPointerReleaseRect(pointerState.lastValidPickRect),
      key: String(pointerState.lastValidPickKey || ""),
      hitAt: hitAt,
      ageMs: age,
      session: Number(pointerState.lastValidPickSession || 0)
    };
  };

  proto.restorePointerPickForRelease = function(st, pick) {
    var pointerState = st || null;
    var item = pick || null;
    if (!pointerState || !item || !item.text || !item.rect) return false;
    pointerState.currentText = String(item.text);
    pointerState.currentRect = copyPointerReleaseRect(item.rect);
    pointerState.currentKey = String(item.key || "");
    pointerState.hoverKey = pointerState.currentKey;
    pointerState.hoverSince = Math.max(1, pointerReleaseNow() - Number(this.getPointerTextHoverLimitMs()));
    try { this.showPointerAreaFrame(pointerState.currentRect, "text_hit"); } catch (eFrame) {}
    try { this.updatePointerVisualHot(true); } catch (eHot) {}
    return true;
  };

  proto.completePointerCandidateOnRelease = function(st, successCode, source, extraData) {
    var pointerState = st || null;
    if (!pointerState || !pointerState.currentText || !pointerState.currentRect) return false;
    var data = { source: String(source || "accessibility_release") };
    try {
      if (extraData) {
        for (var k in extraData) data[k] = extraData[k];
      }
    } catch (eData) {}
    pointerReleaseLog(this, "i",
      "pointer text release commit source=" + data.source +
      " textLen=" + String(String(pointerState.currentText).length));
    return this.completePointerTextCopy(
      String(pointerState.currentText),
      copyPointerReleaseRect(pointerState.currentRect),
      String(successCode || "TEXT_PICK_SUCCESS"),
      data
    ) === true;
  };

  // 覆盖核心提取：无障碍已经取得文字即视为取字成功；绿色悬停状态只负责视觉反馈。
  proto.extractCurrentPointerText = function(skipInspect, releaseTs) {
    var st = this.ensurePointerToolState();
    if (!st.active || st.closed) return { ok: false, err: "指针未启动" };
    if (skipInspect !== true) this.updatePointerInspect(true);
    if (!st.currentText || !st.currentRect) {
      var recent = null;
      try { recent = this.getRecentPointerPickForRelease(st, releaseTs); } catch (eRecent) { recent = null; }
      if (recent) this.restorePointerPickForRelease(st, recent);
    }
    if (!st.currentText || !st.currentRect) {
      this.setPointerToolResult({ ok: false, type: "pointer_error", code: "NO_TEXT", message: "未命中文本" });
      this.toast("未命中文本");
      this.closePointerTool("未命中文本", true);
      return { ok: false, err: "未命中文本", code: "NO_TEXT" };
    }
    var textValue = String(st.currentText);
    var completed = this.completePointerCandidateOnRelease(
      st,
      "TEXT_PICK_SUCCESS",
      "accessibility_current",
      { releaseTs: normalizePointerReleaseTs(releaseTs) }
    );
    return { ok: completed === true, pending: false, text: textValue, clipboard: completed === true };
  };

  var oldFinishPointerTextPickAfterReleaseFix = proto.finishPointerTextPickAfterRelease;
  proto.finishPointerTextPickAfterRelease = function() {
    var st = this.ensurePointerToolState();
    if (!st.active || st.closed || st.mode !== "text_pick") return false;
    var releaseTs = normalizePointerReleaseTs(st.releaseTs);
    st.releaseTs = releaseTs;

    var candidateHit = false;
    try { candidateHit = this.pointerCandidateMatchesFinalHotspot(st) === true; } catch (eCandidate) { candidateHit = false; }
    if (candidateHit) {
      return this.completePointerCandidateOnRelease(
        st,
        "TEXT_PICK_FINAL_SCAN",
        "accessibility_final_scan",
        {
          costMs: Number(st.inspectLastCostMs || 0),
          nodes: Number(st.inspectLastNodes || 0),
          windows: Number(st.inspectLastWindows || 0)
        }
      );
    }

    var recent = null;
    try { recent = this.getRecentPointerPickForRelease(st, releaseTs); } catch (eRecent) { recent = null; }
    if (recent && this.restorePointerPickForRelease(st, recent)) {
      return this.completePointerCandidateOnRelease(
        st,
        "TEXT_PICK_RECENT_CANDIDATE",
        "accessibility_recent_candidate",
        { ageMs: Number(recent.ageMs || 0), finalScanFallback: true }
      );
    }

    return oldFinishPointerTextPickAfterReleaseFix.call(this);
  };

  proto.finishPointerGestureFromRaw = function(rawX, rawY, action) {
    var st = null;
    try { st = this.ensurePointerToolState ? this.ensurePointerToolState() : null; } catch (eState) { st = null; }
    if (!st || !st.active || st.closed) return false;

    this.cancelPointerSemanticUpdate(st, "pointer_release");
    this.invalidatePointerInspectForRelease(st);
    st.releaseTs = pointerReleaseNow();

    if (action === android.view.MotionEvent.ACTION_CANCEL) {
      st.dragging = false;
      try { this.setPointerToolResult({ ok: false, type: "cancel", code: "ACTION_CANCEL", message: "指针取消" }); } catch (eResult) {}
      try { this.toast("指针已取消"); } catch (eToast) {}
      try { this.closePointerTool("ACTION_CANCEL", true); } catch (eClose) {}
      return true;
    }

    // 先落到 ACTION_UP 的最终原始坐标，再验证候选，避免提交上一帧位置的文字。
    if (!this.movePointerFromRaw(rawX, rawY, true, true)) return false;

    if (st.mode === "area_capture") {
      try { this.updatePointerAreaSelection(); } catch (eAreaUpdate) {}
      st.dragging = false;
      try { this.finishPointerAreaCapture(); } catch (eAreaFinish) {
        pointerReleaseLog(this, "e", "final area capture fail: " + String(eAreaFinish));
        return false;
      }
      return true;
    }

    if (st.mode === "text_pick") {
      st.dragging = false;

      var candidateHit = false;
      try { candidateHit = this.pointerCandidateMatchesFinalHotspot(st) === true; } catch (eCandidate) { candidateHit = false; }
      if (candidateHit) {
        return this.completePointerCandidateOnRelease(
          st,
          "TEXT_PICK_CONFIRMED_CANDIDATE",
          "accessibility_confirmed_candidate",
          { hoverReady: this.isPointerTextHoverReady(st.releaseTs) === true }
        );
      }

      var recent = null;
      try { recent = this.getRecentPointerPickForRelease(st, st.releaseTs); } catch (eRecent) { recent = null; }
      if (recent && this.restorePointerPickForRelease(st, recent)) {
        return this.completePointerCandidateOnRelease(
          st,
          "TEXT_PICK_RECENT_CANDIDATE",
          "accessibility_recent_candidate",
          { ageMs: Number(recent.ageMs || 0) }
        );
      }

      // 当前候选确实离开最终热点时才补扫，防止一次空扫描推翻已命中的文字。
      try {
        st.inspectMaxFinalMs = Math.max(Number(st.inspectMaxFinalMs || 180), 240);
        st.inspectMaxFinalNodes = Math.max(Number(st.inspectMaxFinalNodes || 720), 1200);
      } catch (eBudget) {
        st.inspectMaxFinalMs = 240;
        st.inspectMaxFinalNodes = 1200;
      }
      var scheduled = false;
      try { scheduled = this.schedulePointerInspectAsync(true, "release_final", true) === true; }
      catch (eFinalScan) { pointerReleaseLog(this, "e", "final pointer scan fail: " + String(eFinalScan)); }
      if (!scheduled && st.active && !st.closed) {
        try {
          this.setPointerToolResult({
            ok: false,
            type: "pointer_error",
            code: "TEXT_FINAL_SCAN_FAILED",
            message: "最终取字扫描失败",
            value: ""
          });
          this.toast("最终取字扫描失败");
          this.closePointerTool("最终取字扫描失败", true);
        } catch (eFallback) {}
      }
      return scheduled;
    }

    st.dragging = false;
    return false;
  };

  if (typeof proto.getPointerSettingsBlocks === "function") {
    var oldGetPointerSettingsBlocksReleaseFix = proto.getPointerSettingsBlocks;
    proto.getPointerSettingsBlocks = function() {
      var blocks = oldGetPointerSettingsBlocksReleaseFix.call(this);
      try {
        for (var i = 0; i < blocks.length; i++) {
          if (blocks[i] && String(blocks[i].key || "") === "hover") {
            blocks[i].desc = "取字就绪提示时间与框选 OCR 悬停时间；松手取字不受提示时间限制";
          }
        }
      } catch (eBlocks) {}
      return blocks;
    };
  }

  proto.__toolHubPointerReleaseFixInstalled = true;
  pointerReleaseLog(null, "i", "pointer accessibility text release fix installed force=" + String(force === true));
  return true;
}
installToolHubPointerAccessibilityTextReleaseFix(false);
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

  // 模块热重载会重新定义指针原型，必须重新安装取字提交修复。
  if (typeof installToolHubPointerAccessibilityTextReleaseFix === "function") {
    installToolHubPointerAccessibilityTextReleaseFix(true);
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
    var sourceText = getUpdateSourceText();
    var modeText = getUpdateModeText();
    var statusName = "latest";
    var errText = "";
    var versionNum = 0;
    if (__securityStatus && __securityStatus.version !== undefined && __securityStatus.version !== null) versionNum = Number(__securityStatus.version || 0);
    if ((!versionNum || isNaN(versionNum)) && __trustedManifest && __trustedManifest.version !== undefined) versionNum = Number(__trustedManifest.version || 0);
    if (isNaN(versionNum)) versionNum = 0;
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
      source: sourceText,
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
  if (!started) unregisterToolHubAppInstance(app);
  var layoutObj = startRet && startRet.layout || null;
  var layoutText = layoutObj ? (String(layoutObj.cols || "?") + "×" + String(layoutObj.rows || "?")) : "未知";
  var syncText = syncInfo.count > 0
    ? ("✓ 启动已补全/修复 " + syncInfo.count + " 个模块：" + syncInfo.modules.join("、"))
    : (pendingInfo.count > 0 ? ("↻ 有 " + pendingInfo.count + " 个子模块可更新") : "✓ 子模块已是最新");

  var out = {
    ok: started,
    状态: started ? "ToolHub 启动成功" : "ToolHub 启动失败",
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
  if (!started) out.错误 = runtimeOptString(startRet && startRet.err) || (loadInfo.modules && loadInfo.modules.join(", ")) || "未知错误";
  return out;
})();
JSON.stringify(__out, null, 2);
