#!/usr/bin/env python3
"""校验 ToolHub 整批模块事务更新源码契约和故障恢复模型。"""

import hashlib
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "ToolHub.js"


def require(name, condition, detail, failures):
    if condition:
        print("PASS:", name)
        return
    failures.append((name, detail))
    print("FAIL:", name)


def section(text, start, end):
    a = text.find(start)
    if a < 0:
        return ""
    b = text.find(end, a + len(start))
    if b < 0:
        return text[a:]
    return text[a:b]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, data):
    path.write_text(data, encoding="utf-8")


def entry(root, name, new_text):
    dest = root / name
    stage = root / f"{name}.txn.tmp"
    backup = root / f"{name}.txn.bak"
    write(stage, new_text)
    return {
        "dest": dest,
        "stage": stage,
        "backup": backup,
        "had_dest": dest.exists(),
        "expected": sha(stage),
    }


def rollback(entries):
    for item in reversed(entries):
        dest, stage, backup = item["dest"], item["stage"], item["backup"]
        if backup.exists():
            if dest.exists():
                dest.unlink()
            backup.rename(dest)
        elif not item["had_dest"] and dest.exists():
            dest.unlink()
        if stage.exists():
            stage.unlink()


def commit_until(entries, fail_index=None):
    for index, item in enumerate(entries):
        if fail_index is not None and index == fail_index:
            raise OSError("injected rename failure")
        dest, stage, backup = item["dest"], item["stage"], item["backup"]
        if item["had_dest"]:
            dest.rename(backup)
        stage.rename(dest)


def matches(entries):
    return all(item["dest"].exists() and sha(item["dest"]) == item["expected"] for item in entries)


def run_model_tests(failures):
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        write(root / "a.js", "old-a")
        write(root / "b.js", "old-b")
        write(root / ".installed_manifest.json", "old-meta")
        entries = [
            entry(root, "a.js", "new-a"),
            entry(root, "b.js", "new-b"),
            entry(root, ".installed_manifest.json", "new-meta"),
        ]
        try:
            commit_until(entries, fail_index=1)
        except OSError:
            rollback(entries)
        require(
            "第二个文件切换失败会整批回滚",
            (root / "a.js").read_text() == "old-a"
            and (root / "b.js").read_text() == "old-b"
            and (root / ".installed_manifest.json").read_text() == "old-meta",
            "任一文件失败后模块和安装清单都必须恢复旧内容",
            failures,
        )

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        write(root / "a.js", "old-a")
        write(root / "b.js", "old-b")
        entries = [entry(root, "a.js", "new-a"), entry(root, "b.js", "new-b")]
        commit_until(entries, fail_index=None)
        require("完整切换后哈希一致", matches(entries), "所有正式文件必须匹配阶段哈希", failures)
        for item in entries:
            if item["backup"].exists():
                item["backup"].unlink()
        require(
            "提交后收尾保留整批新文件",
            (root / "a.js").read_text() == "new-a" and (root / "b.js").read_text() == "new-b",
            "提交标记后的恢复只能完成收尾，不能回退部分文件",
            failures,
        )

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        write(root / "a.js", "old-a")
        write(root / "b.js", "old-b")
        entries = [entry(root, "a.js", "new-a"), entry(root, "b.js", "new-b")]
        first = entries[0]
        first["dest"].rename(first["backup"])
        first["stage"].rename(first["dest"])
        rollback(entries)
        require(
            "无提交标记的中断恢复旧版本",
            (root / "a.js").read_text() == "old-a" and (root / "b.js").read_text() == "old-b",
            "进程在批次中途退出时，下次启动必须整批回滚",
            failures,
        )


def main():
    text = ENTRY.read_text(encoding="utf-8")
    failures = []

    helpers = section(text, "function getTxnStageFile(destFile)", "function installPendingModuleUpdates()")
    install = section(text, "function installPendingModuleUpdates()", "function checkToolHubModuleUpdatesNow()")
    startup = section(text, "var modules = [", "var __manifestCheck")
    execute = section(text, "function executeStagedModuleTransaction", "function installPendingModuleUpdates()")
    finalize = section(text, "function finalizeCommittedModuleTransaction", "function recoverOrphanTransactionFiles")

    require(
        "事务使用持久化清单和提交标记",
        ".module_update_transaction.json" in text
        and ".module_update_transaction.committed" in text,
        "需要区分未提交批次和已经完成切换的批次",
        failures,
    )
    require(
        "模块先下载校验再进入事务",
        "stageVerifiedModuleEntry" in install
        and "appendTransactionMetadataEntries(entries)" in install
        and "executeStagedModuleTransaction(entries, installedManifest)" in install,
        "手动更新不得逐个调用 ensureVerifiedModule 覆盖正式文件",
        failures,
    )
    require(
        "安装元数据纳入同一事务",
        "getInstalledManifestPath()" in helpers
        and "getTrustedShaPath" in helpers
        and "getTrustedVersionPath()" in helpers
        and '"installed_manifest"' in helpers
        and '"trusted_sha"' in helpers
        and '"trusted_version"' in helpers,
        "安装清单、可信 SHA 和防回滚版本必须与模块一起切换",
        failures,
    )
    require(
        "事务清单先于正式文件切换落盘",
        execute.find("writeTextFile(markerFile.getAbsolutePath()") >= 0
        and execute.find("writeTextFile(markerFile.getAbsolutePath()") < execute.find("destFile.renameTo(backupFile)"),
        "中断恢复所需清单必须在第一次 rename 前持久化",
        failures,
    )
    require(
        "提交标记在整批哈希校验后写入",
        execute.find("transactionEntryMatches(entries[vi])") >= 0
        and execute.find("transactionEntryMatches(entries[vi])") < execute.find("writeTextFile(commitFile.getAbsolutePath(), txnId)"),
        "只有所有模块和元数据校验成功后才能标记提交",
        failures,
    )
    require(
        "执行阶段不会误清理刚下载文件",
        "recoverPendingModuleTransaction();" not in execute,
        "阶段文件建立后不得再次执行孤儿清理",
        failures,
    )
    require(
        "未提交事务按逆序回滚",
        "for (var i = entries.length - 1; i >= 0; i--)" in helpers
        and "backupFile.renameTo(destFile)" in helpers,
        "批次失败必须逆序恢复全部备份",
        failures,
    )
    require(
        "提交收尾先删除事务清单",
        finalize.find("getModuleTxnMarkerPath()") >= 0
        and finalize.find("getModuleTxnMarkerPath()") < finalize.find("getModuleTxnCommitPath()"),
        "提交清单删除失败时必须保留提交标记供下次恢复",
        failures,
    )
    require(
        "启动加载模块前恢复事务",
        "recoverPendingModuleTransaction();" in startup
        and startup.find("recoverPendingModuleTransaction();") < startup.find("fetchTrustedManifest();"),
        "任何模块 eval 前必须完成上次事务恢复",
        failures,
    )
    require(
        "更新失败结果明确整批回滚",
        "更新失败，整批已回滚" in install
        and "Transactional module update failed" in install,
        "调用方需要区分普通失败和事务回滚",
        failures,
    )
    require(
        "无模块变化仍推进可信版本",
        "保存可信清单版本失败" in install
        and "writeTextFile(getTrustedVersionPath()" in install,
        "仅发布元数据变化时也必须推进防回滚版本",
        failures,
    )

    run_model_tests(failures)

    if failures:
        print("\nRelease transaction verification failed:")
        for name, detail in failures:
            print(f"- {name}: {detail}")
        return 1
    print("\nRelease transaction verification passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
