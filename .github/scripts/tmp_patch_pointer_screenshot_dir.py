#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
POINTER = ROOT / "code" / "th_17_pointer.js"
VERIFY = ROOT / "scripts" / "verify_pointer_regressions.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("FAIL %s: expected 1 anchor, found %d" % (label, count))
    return text.replace(old, new, 1)


pointer = POINTER.read_text(encoding="utf-8")
pointer = replace_once(
    pointer,
    "// @version 1.2.1",
    "// @version 1.2.2",
    "pointer module version",
)

old_dir = '''FloatBallAppWM.prototype.getPointerScreenshotDir = function() {
  var base = "";
  try {
    if (typeof shortx !== "undefined" && shortx && shortx.getShortXDir) {
      base = String(shortx.getShortXDir() || "");
    }
  } catch (e0) {}
  if (!base) {
    try {
      var ctx = getToolHubAndroidContext ? getToolHubAndroidContext() : null;
      if (ctx && ctx.getFilesDir) base = String(ctx.getFilesDir().getAbsolutePath());
    } catch (e1) {}
  }
  if (!base) throw new Error("无法获取 ShortX 私有目录");
  var dir = new java.io.File(base + "/data/screenshots");
  if (!dir.exists()) dir.mkdirs();
  return dir;
};'''

new_dir = '''FloatBallAppWM.prototype.getPointerScreenshotDir = function() {
  var base = "";
  try {
    if (typeof shortx !== "undefined" && shortx && shortx.getShortXDir) {
      base = String(shortx.getShortXDir() || "").replace(/\\/+$/g, "");
    }
  } catch (e0) {
    base = "";
  }
  if (!base) throw new Error("无法获取 ShortX 根目录");

  var dir = new java.io.File(base, "ToolHub/screenshots");
  if (!dir.exists() && dir.mkdirs() !== true && !dir.exists()) {
    throw new Error("无法创建截图目录：" + String(dir.getAbsolutePath()));
  }
  return dir;
};'''

pointer = replace_once(pointer, old_dir, new_dir, "pointer screenshot directory")
POINTER.write_text(pointer.rstrip() + "\n", encoding="utf-8", newline="\n")

verify = VERIFY.read_text(encoding="utf-8")
anchor = '''    save_bitmap = section(
        pointer,
        "FloatBallAppWM.prototype.savePointerBitmapToFile = function(bitmap, file)",
        "FloatBallAppWM.prototype.pointerBitmapFromCaptureBuffer = function(buffer)",
    )'''

insert = '''    screenshot_dir = section(
        pointer,
        "FloatBallAppWM.prototype.getPointerScreenshotDir = function()",
        "FloatBallAppWM.prototype.createPointerScreenshotFile = function()",
    )
    result.require(
        group,
        "N9 screenshot directory is ShortX ToolHub/screenshots",
        "shortx.getShortXDir()" in screenshot_dir
        and '.replace(/\\/+$/g, "")' in screenshot_dir
        and 'new java.io.File(base, "ToolHub/screenshots")' in screenshot_dir
        and "dir.mkdirs() !== true" in screenshot_dir
        and "getToolHubAndroidContext" not in screenshot_dir
        and '"/data/screenshots"' not in screenshot_dir,
        "pointer screenshots must use shortx.getShortXDir()/ToolHub/screenshots without app-private fallback",
    )

''' + anchor

verify = replace_once(verify, anchor, insert, "pointer screenshot regression check")
VERIFY.write_text(verify.rstrip() + "\n", encoding="utf-8", newline="\n")

updated_pointer = POINTER.read_text(encoding="utf-8")
updated_verify = VERIFY.read_text(encoding="utf-8")
for fragment in (
    "// @version 1.2.2",
    'new java.io.File(base, "ToolHub/screenshots")',
    "dir.mkdirs() !== true",
):
    if fragment not in updated_pointer:
        raise SystemExit("FAIL patched pointer missing: " + fragment)
for forbidden in (
    'base + "/data/screenshots"',
    "getToolHubAndroidContext ? getToolHubAndroidContext() : null",
):
    if forbidden in updated_pointer:
        raise SystemExit("FAIL stale screenshot path remains: " + forbidden)
if "N9 screenshot directory is ShortX ToolHub/screenshots" not in updated_verify:
    raise SystemExit("FAIL screenshot directory regression check missing")

print("OK pointer screenshot directory=shortx.getShortXDir()/ToolHub/screenshots")
