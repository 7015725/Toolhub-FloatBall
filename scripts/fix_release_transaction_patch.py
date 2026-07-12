#!/usr/bin/env python3
"""修正整批事务更新生成代码中的边界问题。"""

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
        'function executeStagedModuleTransaction(entries, installedManifest) {\n'
        '    if (!entries || entries.length <= 0) return { ok: true, count: 0, id: "" };\n'
        '    recoverPendingModuleTransaction();\n'
        '    var txnId = ',
        'function executeStagedModuleTransaction(entries, installedManifest) {\n'
        '    if (!entries || entries.length <= 0) return { ok: true, count: 0, id: "" };\n'
        '    var txnId = ',
        "remove duplicate recovery",
    )

    text = replace_once(
        text,
        '    deleteFileStrict(new java.io.File(getModuleTxnCommitPath()), "delete transaction commit marker");\n'
        '    deleteFileStrict(new java.io.File(getModuleTxnMarkerPath()), "delete transaction marker");\n'
        '    __installedManifest = null;\n'
        '    writeLog("Committed module transaction finalized id=" + String(txn && txn.id || ""));',
        '    try {\n'
        '        deleteFileStrict(new java.io.File(getModuleTxnMarkerPath()), "delete transaction marker");\n'
        '    } catch (eDeleteMarker) {\n'
        '        writeLog("Committed module transaction marker cleanup pending id=" + String(txn && txn.id || "") + " err=" + String(eDeleteMarker));\n'
        '        return false;\n'
        '    }\n'
        '    try {\n'
        '        deleteFileStrict(new java.io.File(getModuleTxnCommitPath()), "delete transaction commit marker");\n'
        '    } catch (eDeleteCommit) {\n'
        '        writeLog("Committed module transaction commit marker cleanup pending id=" + String(txn && txn.id || "") + " err=" + String(eDeleteCommit));\n'
        '        return false;\n'
        '    }\n'
        '    __installedManifest = null;\n'
        '    writeLog("Committed module transaction finalized id=" + String(txn && txn.id || ""));',
        "safe finalize order",
    )

    text = replace_once(
        text,
        '            var expectedHash = String(info.sha256).toLowerCase();\n'
        '            if (currentHash && hashesEqual(currentHash, expectedHash)) continue;\n'
        '            entries.push(stageVerifiedModuleEntry(relPath, destFile));',
        '            var expectedHash = String(info.sha256).toLowerCase();\n'
        '            if (currentHash && hashesEqual(currentHash, expectedHash)) {\n'
        '                saveTrustedSha(relPath, expectedHash);\n'
        '                continue;\n'
        '            }\n'
        '            entries.push(stageVerifiedModuleEntry(relPath, destFile));',
        "preserve trusted sha",
    )

    text = replace_once(
        text,
        '        } else {\n'
        '            if (!saveInstalledManifestFromLocal()) throw "保存本地安装清单失败";\n'
        '        }\n\n'
        '        __pendingModuleUpdates = [];',
        '        } else {\n'
        '            if (!saveInstalledManifestFromLocal()) throw "保存本地安装清单失败";\n'
        '            if (UPDATE_SECURITY_MODE === 2 && __trustedManifest) {\n'
        '                if (!writeTextFile(getTrustedVersionPath(), String(__trustedManifest.version || 0))) {\n'
        '                    throw "保存可信清单版本失败";\n'
        '                }\n'
        '            }\n'
        '        }\n\n'
        '        __pendingModuleUpdates = [];',
        "advance trusted version",
    )

    TARGET.write_text(text, encoding="utf-8")
    print("release transaction boundary fixes applied")


if __name__ == "__main__":
    main()
