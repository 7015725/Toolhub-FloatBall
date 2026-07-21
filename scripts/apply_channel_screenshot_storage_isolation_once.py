#!/usr/bin/env python3
import json
import re
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


def patch_pointer():
    path = "code/th_17_pointer.js"
    text = read(path)
    text = replace_once(text, "// @version 1.2.13", "// @version 1.2.14", "th17 version")
    old = '''FloatBallAppWM.prototype.getPointerScreenshotDir = function() {
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
    new = '''FloatBallAppWM.prototype.getPointerScreenshotDir = function() {
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
    text = replace_once(text, old, new, "th17 screenshot root")
    write(path, text)


def patch_pickword():
    path = "code/th_20_pickword.js"
    text = read(path)
    text = replace_once(text, "// @version 1.0.19", "// @version 1.0.20", "th20 version")
    old = '''            var base = String(shortx.getShortXDir() || "").replace(/\\/+$/g, "");
            if (!base) return null;
            var root = new java.io.File(base, "ToolHub/screenshots").getCanonicalPath();'''
    new = '''            var rootText = String(APP_ROOT_DIR || "").replace(/\\/+$/g, "");
            if (!rootText) return null;
            var root = new java.io.File(new java.io.File(rootText).getCanonicalFile(), "screenshots").getCanonicalPath();'''
    text = replace_once(text, old, new, "th20 screenshot boundary")
    write(path, text)


def patch_image_viewer():
    path = "code/th_22_image_viewer.js"
    text = read(path)
    if text.count("1.3.2") < 2:
        raise SystemExit("th22 version markers missing")
    text = text.replace("1.3.2", "1.3.3")
    old = '''  function internalRoot22() {
    var base = String(shortx.getShortXDir() || "").replace(/\\/+$/g, "");
    if (!base) throw new Error("ShortX 目录为空");
    return new java.io.File(base, "ToolHub/screenshots").getCanonicalFile();
  }'''
    new = '''  function appRoot22() {
    var value = "";
    try { value = String(APP_ROOT_DIR || "").replace(/\\/+$/g, ""); } catch (e0) { value = ""; }
    if (!value) throw new Error("当前 ToolHub 通道根目录为空");
    return new java.io.File(value).getCanonicalFile();
  }

  function internalRoot22() {
    var base = appRoot22();
    var root = new java.io.File(base, "screenshots").getCanonicalFile();
    var basePath = String(base.getCanonicalPath());
    var rootPath = String(root.getCanonicalPath());
    if (rootPath.indexOf(basePath + java.io.File.separator) !== 0) throw new Error("截图目录越界");
    return root;
  }'''
    text = replace_once(text, old, new, "th22 internal root")
    old = '''  function shellBridgeMarkerDir22() {
    var base = String(shortx.getShortXDir() || "").replace(/\\/+$/g, "");
    if (!base) throw new Error("ShortX 目录为空");
    var dir = new java.io.File(base, "ToolHub/cache/shell_bridge").getCanonicalFile();
    if (!dir.exists() && !dir.mkdirs() && !dir.exists()) throw new Error("无法创建 Shell 桥结果目录");
    if (!dir.isDirectory()) throw new Error("Shell 桥结果路径不是目录");
    return dir;
  }'''
    new = '''  function shellBridgeMarkerDir22() {
    var base = appRoot22();
    var dir = new java.io.File(base, "cache/shell_bridge").getCanonicalFile();
    var basePath = String(base.getCanonicalPath());
    var dirPath = String(dir.getCanonicalPath());
    if (dirPath.indexOf(basePath + java.io.File.separator) !== 0) throw new Error("Shell 桥结果目录越界");
    if (!dir.exists() && !dir.mkdirs() && !dir.exists()) throw new Error("无法创建 Shell 桥结果目录");
    if (!dir.isDirectory()) throw new Error("Shell 桥结果路径不是目录");
    return dir;
  }'''
    text = replace_once(text, old, new, "th22 shell marker root")
    old = '''  function thumbnailCacheRoot22() {
    var basePath = String(shortx.getShortXDir() || "").replace(/\\/+$/g, "");
    if (!basePath) throw new Error("ShortX 目录为空");
    var base = new java.io.File(basePath).getCanonicalFile();
    var root = new java.io.File(base, "ToolHub/cache/screenshot_thumbnails").getCanonicalFile();
    var baseCanonical = String(base.getCanonicalPath());
    var rootCanonical = String(root.getCanonicalPath());
    if (rootCanonical.indexOf(baseCanonical + java.io.File.separator) !== 0) throw new Error("缩略图缓存目录越界");
    if (!root.exists() && !root.mkdirs() && !root.exists()) throw new Error("无法创建缩略图缓存目录");
    if (!root.isDirectory()) throw new Error("缩略图缓存路径不是目录");
    return root;
  }'''
    new = '''  function thumbnailCacheRoot22() {
    var base = appRoot22();
    var root = new java.io.File(base, "cache/screenshot_thumbnails").getCanonicalFile();
    var baseCanonical = String(base.getCanonicalPath());
    var rootCanonical = String(root.getCanonicalPath());
    if (rootCanonical.indexOf(baseCanonical + java.io.File.separator) !== 0) throw new Error("缩略图缓存目录越界");
    if (!root.exists() && !root.mkdirs() && !root.exists()) throw new Error("无法创建缩略图缓存目录");
    if (!root.isDirectory()) throw new Error("缩略图缓存路径不是目录");
    return root;
  }'''
    text = replace_once(text, old, new, "th22 thumbnail root")
    write(path, text)


def patch_verifiers():
    path = "scripts/verify_pointer_regressions.py"
    text = read(path)
    old = '''        "N9 screenshot directory is ShortX ToolHub/screenshots",
        "shortx.getShortXDir()" in screenshot_dir
        and r'.replace(/\\/+$/g, "")' in screenshot_dir
        and 'new java.io.File(base, "ToolHub/screenshots")' in screenshot_dir
        and "dir.mkdirs() !== true" in screenshot_dir
        and "getToolHubAndroidContext" not in screenshot_dir
        and '"/data/screenshots"' not in screenshot_dir,
        "pointer screenshots must use shortx.getShortXDir()/ToolHub/screenshots without app-private fallback",'''
    new = '''        "N9 screenshot directory follows active channel root",
        "APP_ROOT_DIR" in screenshot_dir
        and 'new java.io.File(root, "screenshots")' in screenshot_dir
        and "getCanonicalFile()" in screenshot_dir
        and "截图目录越界" in screenshot_dir
        and "dir.mkdirs() !== true" in screenshot_dir
        and '"ToolHub/screenshots"' not in screenshot_dir
        and "shortx.getShortXDir()" not in screenshot_dir,
        "pointer screenshots must use APP_ROOT_DIR/screenshots for the active Stable/Beta channel",'''
    text = replace_once(text, old, new, "pointer verifier")
    write(path, text)

    path = "scripts/verify_pickword_image_viewer.py"
    text = read(path)
    text = text.replace('__toolHubPickwordImageViewerVersion = "1.3.2"', '__toolHubPickwordImageViewerVersion = "1.3.3"')
    text = text.replace('=== "1.3.2"', '=== "1.3.3"')
    text = text.replace('// @version 1.3.2', '// @version 1.3.3')
    text = replace_once(text, "require('ToolHub/cache/shell_bridge' in th22 and 'pending:' in th22 and 'done:' in th22, \"ShortX shell bridge completion marker missing\")", "require('function appRoot22()' in th22 and 'new java.io.File(base, \"cache/shell_bridge\")' in th22 and 'pending:' in th22 and 'done:' in th22, \"channel-scoped shell bridge completion marker missing\")", "viewer shell verifier")
    text = replace_once(text, "require('function thumbnailCacheRoot22()' in th22 and 'ToolHub/cache/screenshot_thumbnails' in th22, \"private saved thumbnail cache missing\")", "require('function thumbnailCacheRoot22()' in th22 and 'new java.io.File(base, \"cache/screenshot_thumbnails\")' in th22, \"channel-scoped saved thumbnail cache missing\")", "viewer thumbnail verifier")
    marker = "require('normalizeInternalFile22(rawPath)' in th22 and '截图路径越界' in th22, \"internal delete boundary missing\")\n"
    extra = marker + "require('new java.io.File(base, \"screenshots\")' in th22 and '截图目录越界' in th22, \"active-channel screenshot root missing\")\nrequire('ToolHub/screenshots' not in th22 and 'ToolHub/cache/shell_bridge' not in th22 and 'ToolHub/cache/screenshot_thumbnails' not in th22, \"stable hardcoded screenshot paths must stay removed\")\n"
    text = replace_once(text, marker, extra, "viewer channel root assertions")
    write(path, text)

    path = "scripts/verify_pickword_image_meta_handoff.py"
    text = read(path)
    text = replace_once(text, 'SOURCE.startswith("// @version 1.0.19\\n")', 'SOURCE.startswith("// @version 1.0.20\\n")', "meta version expression")
    text = text.replace("th_20 version must be 1.0.19", "th_20 version must be 1.0.20")
    marker = "require('internalPath: String(canonical)' in body, \"canonical internalPath output missing\")\n"
    extra = marker + "require('APP_ROOT_DIR' in body and 'new java.io.File(rootText).getCanonicalFile(), \"screenshots\"' in body, \"active-channel screenshot boundary missing\")\nrequire('ToolHub/screenshots' not in body and 'shortx.getShortXDir()' not in body, \"stable screenshot root must not be accepted\")\n"
    text = replace_once(text, marker, extra, "meta root assertions")
    write(path, text)


def create_channel_verifier():
    path = ROOT / "scripts/verify_channel_screenshot_storage_isolation.py"
    content = '''#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY = (ROOT / "ToolHub.js").read_text(encoding="utf-8")
POINTER = (ROOT / "code/th_17_pointer.js").read_text(encoding="utf-8")
PICKWORD = (ROOT / "code/th_20_pickword.js").read_text(encoding="utf-8")
VIEWER = (ROOT / "code/th_22_image_viewer.js").read_text(encoding="utf-8")


def require(value, message):
    if not value:
        raise SystemExit("FAIL channel-screenshot-storage-isolation: " + message)


require('stable: { id: "stable", label: "正式版 Stable", branch: "main", rootName: "ToolHub" }' in ENTRY, "Stable root specification missing")
require('beta: { id: "beta", label: "测试版 Beta", branch: "beta", rootName: "ToolHub-Beta" }' in ENTRY, "Beta root specification missing")
require('APP_ROOT_DIR' in POINTER and 'new java.io.File(root, "screenshots")' in POINTER, "pointer screenshot output is not channel scoped")
require('APP_ROOT_DIR' in PICKWORD and '"screenshots"' in PICKWORD, "pickword metadata boundary is not channel scoped")
require('function appRoot22()' in VIEWER, "image service channel root helper missing")
for marker in ('new java.io.File(base, "screenshots")', 'new java.io.File(base, "cache/shell_bridge")', 'new java.io.File(base, "cache/screenshot_thumbnails")'):
    require(marker in VIEWER, "missing channel path: " + marker)
for text, label in ((POINTER, "pointer"), (PICKWORD, "pickword"), (VIEWER, "viewer")):
    for forbidden in ("ToolHub/screenshots", "ToolHub/cache/shell_bridge", "ToolHub/cache/screenshot_thumbnails"):
        require(forbidden not in text, "%s retains Stable hardcoded path %s" % (label, forbidden))
require('/storage/emulated/0/Pictures/ToolHub' in VIEWER or '/storage/emulated/0/Pictures/ToolHub' in (ROOT / "code/th_01_base.js").read_text(encoding="utf-8"), "public export directory contract changed unexpectedly")
print("OK channel_screenshot_storage_isolation stable=ToolHub beta=ToolHub-Beta internal=isolated public=shared")
'''
    path.write_text(content, encoding="utf-8")


def patch_workflows():
    for workflow in (".github/workflows/verify.yml", ".github/workflows/sign-toolhub.yml"):
        text = read(workflow)
        old = "          python3 scripts/verify_sqlite_storage.py\n"
        new = old + "          python3 scripts/verify_channel_screenshot_storage_isolation.py\n"
        if new not in text:
            text = replace_once(text, old, new, workflow + " verifier")
        write(workflow, text)


def patch_docs():
    additions = {
        "docs/ARCHITECTURE.md": '''\n\n## Stable / Beta 截图与缓存隔离\n\n- 内部截图、截图管理器扫描目录、Shell 桥结果和截图缩略图缓存全部基于当前 `APP_ROOT_DIR`。\n- Stable 使用 `ToolHub/screenshots` 与 `ToolHub/cache/...`；Beta 使用 `ToolHub-Beta/screenshots` 与 `ToolHub-Beta/cache/...`。\n- 公共保存目录仍由 `PICKWORD_IMAGE_PUBLIC_DIR` 控制，默认 `/storage/emulated/0/Pictures/ToolHub`；公共文件可以共用系统相册位置，但保存记录由各通道独立 SQLite 管理。\n- 通道切换不迁移、删除或自动认领另一通道已有的内部截图。\n''',
        "docs/SQLITE_STORAGE.md": '''\n\n## 更新通道数据边界\n\nStable 与 Beta 的 `APP_ROOT_DIR` 不同，因此 `toolhub.db`、内部截图和私有缓存均物理隔离。截图管理器只扫描当前通道的 `APP_ROOT_DIR/screenshots`。公共相册文件不按通道拆分目录，但其 `internal_path`、`saved_public_path` 与 `content_uri` 关系记录保存在当前通道数据库中。\n'''
    }
    for path, addition in additions.items():
        text = read(path)
        heading = addition.strip().splitlines()[0]
        if heading not in text:
            text = text.rstrip() + addition
            if not text.endswith("\n"):
                text += "\n"
            write(path, text)


def create_record():
    path = ROOT / "updates/records/20260721-fix-channel-screenshot-storage-isolation.json"
    if path.exists():
        return
    record = {
        "schema": 1,
        "id": "20260721-fix-channel-screenshot-storage-isolation",
        "type": "fix",
        "title": "修复 Stable/Beta 截图数据隔离",
        "details": [
            "内部截图创建、扫描和拾字路径校验统一使用当前通道 APP_ROOT_DIR",
            "Shell 桥结果与截图缩略图缓存分别写入 Stable 或 Beta 私有缓存目录",
            "公共相册目录保持不变，但截图管理记录继续由各通道独立 SQLite 保存"
        ],
        "manifestVersion": 0
    }
    path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def remove_temporary_hook():
    workflow = ".github/workflows/sign-toolhub.yml"
    text = read(workflow)
    pattern = re.compile(r'\n      - name: Apply channel screenshot storage isolation fix\n.*?(?=\n      - name: Verify changed module versions\n)', re.S)
    text, count = pattern.subn("", text)
    if count != 1:
        raise SystemExit("temporary sign workflow hook count=%d" % count)
    write(workflow, text)


def main():
    patch_pointer()
    patch_pickword()
    patch_image_viewer()
    patch_verifiers()
    create_channel_verifier()
    patch_workflows()
    patch_docs()
    create_record()
    remove_temporary_hook()
    Path(__file__).unlink()
    print("Applied channel screenshot storage isolation fix")


if __name__ == "__main__":
    main()
