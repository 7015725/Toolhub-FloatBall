#!/usr/bin/env python3
"""临时应用 ToolHub 更新器原子替换与资源释放补丁。"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "ToolHub.js"


def replace_once(text: str, old: str, new: str, name: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{name}: expected one match, got {count}")
    return text.replace(old, new, 1)


def main() -> None:
    text = TARGET.read_text(encoding="utf-8")

    text = replace_once(
        text,
        'var MIN_TRUSTED_MANIFEST_VERSION = 20260507152251;\n',
        'var MIN_TRUSTED_MANIFEST_VERSION = 20260507152251;\n'
        'var MAX_UPDATE_TEXT_CHARS = 1024 * 1024;\n'
        'var MAX_MODULE_DOWNLOAD_BYTES = 2 * 1024 * 1024;\n',
        "download limits",
    )

    text = replace_once(
        text,
        '''function buildNoCacheUrl(urlStr) {
    var sep = String(urlStr).indexOf("?") >= 0 ? "&" : "?";
    return String(urlStr) + sep + "_toolhub_ts=" + java.lang.System.currentTimeMillis();
}
''',
        '''function buildNoCacheUrl(urlStr) {
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
''',
        "resource helpers",
    )

    text = replace_once(
        text,
        '''function readTextFile(path) {
    try {
        var f = new java.io.File(path);
        if (!f.exists()) return null;
        var r = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(f), "UTF-8"));
        var sb = new java.lang.StringBuilder();
        var line;
        while ((line = r.readLine()) != null) sb.append(line).append("\\n");
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
''',
        '''function readTextFile(path) {
    var r = null;
    try {
        var f = new java.io.File(path);
        if (!f.exists()) return null;
        r = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(f), "UTF-8"));
        var sb = new java.lang.StringBuilder();
        var line;
        while ((line = r.readLine()) != null) sb.append(line).append("\\n");
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
''',
        "local text streams",
    )

    text = replace_once(
        text,
        '''function sha256File(fileOrPath) {
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
''',
        '''function sha256File(fileOrPath) {
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
''',
        "hash stream",
    )

    text = replace_once(
        text,
        '''function downloadText(urlStr) {
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
    while ((line = r.readLine()) != null) sb.append(line).append("\\n");
    r.close();
    var text = String(sb.toString());
    var prefix = text.length > 200 ? text.substring(0, 200) : text;
    if (prefix.indexOf("<!DOCTYPE") >= 0 || prefix.indexOf("<html") >= 0) throw "Downloaded content is HTML";
    return text;
}
''',
        '''function downloadText(urlStr) {
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
            sb.append(line).append("\\n");
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
''',
        "text download",
    )

    text = replace_once(
        text,
        '''function downloadFile(urlStr, destFile) {
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
''',
        '''function downloadFile(urlStr, destFile) {
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
''',
        "module download",
    )

    text = replace_once(
        text,
        '''function replaceFile(tmpFile, destFile) {
    try {
        if (destFile.exists() && !destFile.delete()) throw "delete old file failed: " + destFile.getAbsolutePath();
        if (!tmpFile.renameTo(destFile)) throw "rename tmp failed: " + tmpFile.getAbsolutePath();
        return true;
    } catch (e) { throw String(e); }
}
''',
        '''function recoverAtomicReplacement(destFile) {
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
''',
        "atomic replacement",
    )

    for fn in (
        "ensurePlainBootModule",
        "ensureBootVerifiedModule",
        "ensurePlainRemoteModule",
        "ensureVerifiedModule",
        "ensureLocalTrustedModule",
    ):
        old = f"function {fn}(relPath, destFile) {{\n"
        new = old + "    recoverAtomicReplacement(destFile);\n"
        text = replace_once(text, old, new, f"{fn} recovery")

    TARGET.write_text(text, encoding="utf-8")
    print("Applied atomic updater patch to ToolHub.js")


if __name__ == "__main__":
    main()
