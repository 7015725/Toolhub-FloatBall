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
    deleteFileStrict(new java.io.File(getModuleTxnCommitPath()), "delete transaction commit marker");
    deleteFileStrict(new java.io.File(getModuleTxnMarkerPath()), "delete transaction marker");
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
    recoverPendingModuleTransaction();
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
