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
            if (currentHash && hashesEqual(currentHash, expectedHash)) continue;
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


