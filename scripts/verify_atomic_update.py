#!/usr/bin/env python3
"""校验 ToolHub 模块更新的原子替换、故障恢复和资源释放契约。"""

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


def section(text, start_marker, end_marker):
    start = text.find(start_marker)
    if start < 0:
        return ""
    end = text.find(end_marker, start + len(start_marker))
    if end < 0:
        return text[start:]
    return text[start:end]


def recover_model(dest: Path):
    backup = Path(str(dest) + ".bak")
    if dest.exists():
        if backup.exists():
            backup.unlink()
        return False
    if not backup.exists():
        return False
    backup.rename(dest)
    return True


def replace_model(tmp: Path, dest: Path, fail_install=False):
    backup = Path(str(dest) + ".bak")
    recover_model(dest)
    if not tmp.exists():
        raise RuntimeError("temporary file missing")
    if backup.exists():
        backup.unlink()
    had_dest = dest.exists()
    installed = False
    try:
        if had_dest:
            dest.rename(backup)
        if fail_install:
            raise RuntimeError("injected rename failure")
        tmp.rename(dest)
        installed = True
        if not dest.exists():
            raise RuntimeError("destination missing")
        if backup.exists():
            backup.unlink()
    except Exception:
        if installed and dest.exists():
            dest.unlink()
        if had_dest and backup.exists():
            backup.rename(dest)
        raise
    finally:
        if tmp.exists():
            tmp.unlink()


def run_fault_model(failures):
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)

        dest = root / "module.js"
        tmp = root / "module.js.tmp"
        dest.write_text("old", encoding="utf-8")
        tmp.write_text("new", encoding="utf-8")
        replace_model(tmp, dest)
        require(
            "成功替换后仅保留新模块",
            dest.read_text(encoding="utf-8") == "new"
            and not Path(str(dest) + ".bak").exists()
            and not tmp.exists(),
            "成功路径应安装新文件并删除备份和临时文件",
            failures,
        )

        dest.write_text("old-rollback", encoding="utf-8")
        tmp.write_text("new-fail", encoding="utf-8")
        failed = False
        try:
            replace_model(tmp, dest, fail_install=True)
        except RuntimeError:
            failed = True
        require(
            "安装失败恢复旧模块",
            failed
            and dest.read_text(encoding="utf-8") == "old-rollback"
            and not Path(str(dest) + ".bak").exists()
            and not tmp.exists(),
            "重命名失败时必须恢复旧文件，不能留下空缺",
            failures,
        )

        dest.unlink()
        backup = Path(str(dest) + ".bak")
        backup.write_text("interrupted-old", encoding="utf-8")
        recovered = recover_model(dest)
        require(
            "启动时恢复中断替换",
            recovered
            and dest.read_text(encoding="utf-8") == "interrupted-old"
            and not backup.exists(),
            "目标文件缺失但备份存在时必须恢复备份",
            failures,
        )

        backup.write_text("stale-old", encoding="utf-8")
        recovered = recover_model(dest)
        require(
            "目标存在时清理陈旧备份",
            not recovered and dest.exists() and not backup.exists(),
            "新模块已存在时应删除上次中断留下的备份",
            failures,
        )


def main():
    text = ENTRY.read_text(encoding="utf-8")
    failures = []

    download_text = section(text, "function downloadText(urlStr)", "function downloadFile(urlStr, destFile)")
    download_file = section(text, "function downloadFile(urlStr, destFile)", "function base64Decode(s)")
    replace_file = section(text, "function recoverAtomicReplacement(destFile)", "function getManifestInfo(relPath)")
    sha_file = section(text, "function sha256File(fileOrPath)", "function saveTrustedSha(relPath, hash)")
    read_write = section(text, "function readTextFile(path)", "function readFirstLine(path)")

    require(
        "更新响应设置硬上限",
        "MAX_UPDATE_TEXT_CHARS = 1024 * 1024" in text
        and "MAX_MODULE_DOWNLOAD_BYTES = 2 * 1024 * 1024" in text
        and "Text response exceeds limit" in download_text
        and "Module response exceeds limit" in download_file,
        "清单、签名和模块下载必须有大小上限",
        failures,
    )
    require(
        "网络连接和输入流必达释放",
        "finally" in download_text
        and "closeQuietly(r)" in download_text
        and "disconnectQuietly(conn)" in download_text
        and "finally" in download_file
        and "closeQuietly(inStream)" in download_file
        and "disconnectQuietly(conn)" in download_file,
        "网络读取异常时仍需关闭流并断开连接",
        failures,
    )
    require(
        "失败下载删除不完整临时文件",
        "var complete = false" in download_file
        and "if (!complete)" in download_file
        and "destFile.delete()" in download_file,
        "下载、长度检查或内容检查失败时不能保留半文件",
        failures,
    )
    require(
        "文件落盘执行 flush 和 sync",
        "syncFileOutput(outStream)" in download_file
        and "syncFileOutput(out)" in read_write
        and "stream.getFD().sync()" in text,
        "更新文件和信任状态写入必须在关闭前同步到存储",
        failures,
    )
    require(
        "本地读取和哈希流使用 finally",
        "finally" in read_write
        and "closeQuietly(r)" in read_write
        and "finally" in sha_file
        and "closeQuietly(fis)" in sha_file,
        "本地读取或哈希异常时不能泄漏文件描述符",
        failures,
    )
    require(
        "替换前先备份旧模块",
        'destFile.renameTo(backupFile)' in replace_file
        and 'tmpFile.renameTo(destFile)' in replace_file
        and replace_file.find('destFile.renameTo(backupFile)') < replace_file.find('tmpFile.renameTo(destFile)'),
        "不得先删除旧模块，必须先移动到同目录备份",
        failures,
    )
    require(
        "替换失败恢复备份",
        "hadDest && backupFile.exists()" in replace_file
        and "backupFile.renameTo(destFile)" in replace_file
        and "atomic replace failed" in replace_file,
        "临时文件安装失败时必须恢复旧模块",
        failures,
    )
    require(
        "启动入口恢复中断替换",
        "function recoverAtomicReplacement(destFile)" in replace_file
        and "Recovered interrupted module replacement" in replace_file
        and text.count("recoverAtomicReplacement(destFile);") >= 6,
        "启动、普通更新、验签更新和本地信任路径都必须先处理残留备份",
        failures,
    )
    require(
        "旧的先删后换路径已移除",
        "delete old file failed" not in text,
        "不得恢复为先删除目标文件再重命名临时文件的实现",
        failures,
    )

    run_fault_model(failures)

    if failures:
        print("\nAtomic update verification failed:")
        for name, detail in failures:
            print("- %s: %s" % (name, detail))
        return 1

    print("\nAtomic update verification passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
