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
