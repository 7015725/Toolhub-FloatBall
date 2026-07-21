#!/usr/bin/env python3
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, text):
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s replacement count=%d" % (label, count))
    return text.replace(old, new, 1)


def main():
    path = "scripts/verify_pickword_image_viewer.py"
    write(path, read(path).replace("1.3.2", "1.3.3"))

    path = "code/th_22_image_viewer.js"
    text = read(path).replace(
        "只处理 ToolHub/screenshots 内部截图",
        "只处理当前通道 APP_ROOT_DIR/screenshots 内部截图",
    )
    write(path, text)

    path = "code/th_17_pointer.js"
    text = read(path)
    old = '''FloatBallAppWM.prototype.getPointerScreenshotDir = function() {
  var rootText = "";
  try { rootText = String(APP_ROOT_DIR || "").replace(/\\/+$/g, ""); } catch (e0) { rootText = ""; }
  if (!rootText) throw new Error("当前 ToolHub 通道根目录为空");

  var root = new java.io.File(rootText).getCanonicalFile();
  var dir = new java.io.File(root, "screenshots").getCanonicalFile();
  var rootPath = String(root.getCanonicalPath());
  var dirPath = String(dir.getCanonicalPath());
  if (dirPath.indexOf(rootPath + java.io.File.separator) !== 0) throw new Error("截图目录越界");
  if (!dir.exists() && dir.mkdirs() !== true && !dir.exists()) {
    throw new Error("无法创建截图目录：" + String(dir.getAbsolutePath()));
  }
  if (!dir.isDirectory()) throw new Error("截图路径不是目录");
  return dir;
};'''
    new = '''FloatBallAppWM.prototype.getPointerScreenshotDir = function() {
  var rootText = "";
  try { rootText = String(APP_ROOT_DIR || "").replace(/\\/+$/g, ""); } catch (e0) { rootText = ""; }
  if (!rootText) throw new Error("当前 ToolHub 通道根目录为空");

  var root = new java.io.File(rootText);
  var dir = new java.io.File(root, "screenshots");
  if (!dir.exists() && dir.mkdirs() !== true && !dir.exists()) {
    throw new Error("无法创建截图目录：" + String(dir.getAbsolutePath()));
  }
  return dir;
};'''
    write(path, replace_once(text, old, new, "pointer API scope"))

    path = "scripts/verify_pointer_regressions.py"
    text = read(path).replace(
        '        and "getCanonicalFile()" in screenshot_dir\n        and "截图目录越界" in screenshot_dir\n',
        "",
    )
    write(path, text)

    for path in (
        "scripts/verify_pickword_long_click_api34.py",
        "scripts/verify_pickword_emoji_grapheme.py",
        "scripts/verify_pickword_unified_cleanup.py",
        "scripts/verify_pickword_image_meta_handoff.py",
    ):
        write(path, read(path).replace("1.0.19", "1.0.20"))

    subprocess.check_call(["python3", "scripts/generate_api_usage_baseline.py"], cwd=str(ROOT))
    Path(__file__).unlink()
    print("Finalized channel screenshot storage constraints")


if __name__ == "__main__":
    main()
