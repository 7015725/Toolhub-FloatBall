#!/usr/bin/env python3
"""Apply the Stable/Beta private storage isolation fix once, then remove itself."""

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path, old, new, label):
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s replacement count=%d" % (label, count))
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def replace_all(path, old, new, label):
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count <= 0:
        raise SystemExit("%s replacement count=%d" % (label, count))
    path.write_text(text.replace(old, new), encoding="utf-8")


def patch_theme():
    path = ROOT / "code/th_04_theme.js"
    replace_once(path, "// @version 1.0.11\n", "// @version 1.0.12\n", "theme version")
    old = '''FloatBallAppWM.prototype.getColorSafetyRuntimeResultFile = function() {
  try {
    var baseDir = String(shortx.getShortXDir());
    if (!baseDir) return null;
    return new java.io.File(baseDir + "/ToolHub/diagnostics/color-safety-last.json");
  } catch(ePath) {
    safeLog(this.L, "w", "resolve color safety result path fail error=" + String(ePath));
  }
  return null;
};'''
    new = '''FloatBallAppWM.prototype.getColorSafetyRuntimeResultFile = function() {
  try {
    var rootText = "";
    try { rootText = String(APP_ROOT_DIR || "").replace(/\\/+$/g, ""); } catch(eRoot) { rootText = ""; }
    if (!rootText) return null;
    var root = new java.io.File(rootText).getCanonicalFile();
    var target = new java.io.File(root, "diagnostics/color-safety-last.json").getCanonicalFile();
    var rootPath = String(root.getCanonicalPath());
    var targetPath = String(target.getCanonicalPath());
    if (targetPath.indexOf(rootPath + java.io.File.separator) !== 0) throw "color safety result path escapes APP_ROOT_DIR";
    return target;
  } catch(ePath) {
    safeLog(this.L, "w", "resolve color safety result path fail error=" + String(ePath));
  }
  return null;
};'''
    replace_once(path, old, new, "theme diagnostic path")


def patch_panel_ui():
    path = ROOT / "code/th_13_panel_ui.js"
    replace_once(path, "// @version 1.0.15\n", "// @version 1.0.16\n", "panel ui version")
    old = '''FloatBallAppWM.prototype.getSettingsInteractionStressResultFile = function() {
  try {
    var baseDir = String(shortx.getShortXDir());
    if (!baseDir) return null;
    return new java.io.File(baseDir + "/ToolHub/diagnostics/settings-interaction-last.json");
  } catch(ePath) {
    safeLog(this.L, "w", "resolve settings interaction result path fail error=" + String(ePath));
  }
  return null;
};'''
    new = '''FloatBallAppWM.prototype.getSettingsInteractionStressResultFile = function() {
  try {
    var rootText = "";
    try { rootText = String(APP_ROOT_DIR || "").replace(/\\/+$/g, ""); } catch(eRoot) { rootText = ""; }
    if (!rootText) return null;
    var root = new java.io.File(rootText).getCanonicalFile();
    var target = new java.io.File(root, "diagnostics/settings-interaction-last.json").getCanonicalFile();
    var rootPath = String(root.getCanonicalPath());
    var targetPath = String(target.getCanonicalPath());
    if (targetPath.indexOf(rootPath + java.io.File.separator) !== 0) throw "settings interaction result path escapes APP_ROOT_DIR";
    return target;
  } catch(ePath) {
    safeLog(this.L, "w", "resolve settings interaction result path fail error=" + String(ePath));
  }
  return null;
};'''
    replace_once(path, old, new, "panel diagnostic path")


def patch_pickword():
    path = ROOT / "code/th_20_pickword.js"
    replace_once(path, "// @version 1.0.20\n", "// @version 1.0.21\n", "pickword version")
    old = '''    function getSharedPrefs() {
        return appContext.getSharedPreferences(PREFS_NAME, appContext.MODE_PRIVATE);
    }

    function getFontSizeStoreFile() {
        try {
            if (typeof shortx !== 'undefined' && shortx && shortx.getShortXDir) {
                return new java.io.File(shortx.getShortXDir() + "/data/pickword_font_size.txt");
            }
        } catch (e) {}
        return null;
    }

    function readFontSizeFromFile() {
        var file = getFontSizeStoreFile();
        if (!file || !file.exists()) return -1;
        try {
            var reader = new java.io.BufferedReader(new java.io.FileReader(file));
            var line = reader.readLine();
            reader.close();
            if (!line) return -1;
            var size = parseInt(String(line).replace(/\\s+/g, ""), 10);
            return isNaN(size) ? -1 : size;
        } catch (e) {
            return -1;
        }
    }

    function writeFontSizeToFile(size) {
        var file = getFontSizeStoreFile();
        if (!file) return false;
        try {
            var parent = file.getParentFile();
            if (parent && !parent.exists()) { parent.mkdirs(); }
            var writer = new java.io.FileWriter(file, false);
            writer.write(String(size));
            writer.flush();
            writer.close();
            return true;
        } catch (e) {
            return false;
        }
    }'''
    new = '''    function getStorageChannel20() {
        var channel = "";
        try { channel = String(TOOLHUB_UPDATE_CHANNEL || "").toLowerCase(); } catch (e0) { channel = ""; }
        if (channel !== "beta") channel = "stable";
        return channel;
    }

    function getSharedPrefs() {
        return appContext.getSharedPreferences(PREFS_NAME + "_" + getStorageChannel20(), appContext.MODE_PRIVATE);
    }

    function getLegacySharedPrefs20() {
        if (getStorageChannel20() !== "stable") return null;
        try { return appContext.getSharedPreferences(PREFS_NAME, appContext.MODE_PRIVATE); } catch (e0) {}
        return null;
    }

    function getToolHubRoot20() {
        var rootText = "";
        try { rootText = String(APP_ROOT_DIR || "").replace(/\\/+$/g, ""); } catch (e0) { rootText = ""; }
        if (!rootText) return null;
        try { return new java.io.File(rootText).getCanonicalFile(); } catch (e1) {}
        return null;
    }

    function getFontSizeStoreFile() {
        try {
            var root = getToolHubRoot20();
            if (!root) return null;
            var target = new java.io.File(root, "data/pickword_font_size.txt").getCanonicalFile();
            var rootPath = String(root.getCanonicalPath());
            var targetPath = String(target.getCanonicalPath());
            if (targetPath.indexOf(rootPath + java.io.File.separator) !== 0) return null;
            return target;
        } catch (e) {}
        return null;
    }

    function getLegacyFontSizeStoreFile20() {
        if (getStorageChannel20() !== "stable") return null;
        try {
            var root = getToolHubRoot20();
            if (!root) return null;
            var base = root.getParentFile();
            if (!base) return null;
            var dataDir = new java.io.File(base, "data").getCanonicalFile();
            var target = new java.io.File(dataDir, "pickword_font_size.txt").getCanonicalFile();
            var dataPath = String(dataDir.getCanonicalPath());
            var targetPath = String(target.getCanonicalPath());
            if (targetPath.indexOf(dataPath + java.io.File.separator) !== 0) return null;
            return target;
        } catch (e) {}
        return null;
    }

    function readFontSizeFile20(file) {
        if (!file || !file.exists() || !file.isFile()) return -1;
        var reader = null;
        try {
            reader = new java.io.BufferedReader(new java.io.FileReader(file));
            var line = reader.readLine();
            reader.close();
            reader = null;
            if (!line) return -1;
            var size = parseInt(String(line).replace(/\\s+/g, ""), 10);
            return isNaN(size) ? -1 : size;
        } catch (e) {
            return -1;
        } finally {
            try { if (reader) reader.close(); } catch (eClose) {}
        }
    }

    function readFontSizeFromFile() {
        return readFontSizeFile20(getFontSizeStoreFile());
    }

    function writeFontSizeToFile(size) {
        var file = getFontSizeStoreFile();
        if (!file) return false;
        var writer = null;
        try {
            var parent = file.getParentFile();
            if (parent && !parent.exists() && !parent.mkdirs() && !parent.exists()) return false;
            writer = new java.io.FileWriter(file, false);
            writer.write(String(size));
            writer.flush();
            writer.close();
            writer = null;
            return true;
        } catch (e) {
            return false;
        } finally {
            try { if (writer) writer.close(); } catch (eClose) {}
        }
    }

    function migrateLegacyFontSize20() {
        if (getStorageChannel20() !== "stable") return -1;
        var current = getFontSizeStoreFile();
        if (current && current.exists()) return readFontSizeFile20(current);
        var size = readFontSizeFile20(getLegacyFontSizeStoreFile20());
        if (size < MIN_FONT_SIZE || size > MAX_FONT_SIZE) {
            try {
                var legacyPrefs = getLegacySharedPrefs20();
                if (legacyPrefs) size = legacyPrefs.getInt(KEY_FONT_SIZE, -1);
            } catch (ePrefs) { size = -1; }
        }
        if (size < MIN_FONT_SIZE || size > MAX_FONT_SIZE) return -1;
        writeFontSizeToFile(size);
        try {
            var prefs = getSharedPrefs();
            var editor = prefs.edit();
            editor.putInt(KEY_FONT_SIZE, size);
            editor.apply();
        } catch (eWritePrefs) {}
        return size;
    }'''
    replace_once(path, old, new, "pickword font storage")
    old_load = '''            var savedSize = readFontSizeFromFile();
            if (savedSize < 0) {
                try {
                    var prefs = getSharedPrefs();
                    savedSize = prefs.getInt(KEY_FONT_SIZE, -1);
                } catch (e1) { savedSize = -1; }
            }'''
    new_load = '''            var savedSize = readFontSizeFromFile();
            if (savedSize < 0) savedSize = migrateLegacyFontSize20();
            if (savedSize < 0) {
                try {
                    var prefs = getSharedPrefs();
                    savedSize = prefs.getInt(KEY_FONT_SIZE, -1);
                } catch (e1) { savedSize = -1; }
            }'''
    replace_once(path, old_load, new_load, "pickword font load")


def add_validator():
    path = ROOT / "scripts/verify_channel_private_storage_isolation.py"
    content = '''#!/usr/bin/env python3
"""Verify Stable/Beta private diagnostics and pickword state isolation."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "code"
THEME = (CODE / "th_04_theme.js").read_text(encoding="utf-8")
PANEL = (CODE / "th_13_panel_ui.js").read_text(encoding="utf-8")
PICKWORD = (CODE / "th_20_pickword.js").read_text(encoding="utf-8")
errors = []


def require(condition, message):
    if not condition:
        errors.append(message)


require(THEME.startswith("// @version 1.0.12\\n"), "th_04_theme.js version must be 1.0.12")
require(PANEL.startswith("// @version 1.0.16\\n"), "th_13_panel_ui.js version must be 1.0.16")
require(PICKWORD.startswith("// @version 1.0.21\\n"), "th_20_pickword.js version must be 1.0.21")

for name, text in (("theme", THEME), ("panel_ui", PANEL), ("pickword", PICKWORD)):
    require("shortx.getShortXDir" not in text, name + " must not bypass APP_ROOT_DIR")

for marker in (
    'new java.io.File(root, "diagnostics/color-safety-last.json")',
    'targetPath.indexOf(rootPath + java.io.File.separator) !== 0',
):
    require(marker in THEME, "theme diagnostic isolation marker missing: " + marker)

for marker in (
    'new java.io.File(root, "diagnostics/settings-interaction-last.json")',
    'targetPath.indexOf(rootPath + java.io.File.separator) !== 0',
):
    require(marker in PANEL, "panel diagnostic isolation marker missing: " + marker)

for marker in (
    'function getStorageChannel20()',
    'PREFS_NAME + "_" + getStorageChannel20()',
    'new java.io.File(root, "data/pickword_font_size.txt")',
    'if (getStorageChannel20() !== "stable") return null;',
    'function migrateLegacyFontSize20()',
    'if (savedSize < 0) savedSize = migrateLegacyFontSize20();',
):
    require(marker in PICKWORD, "pickword channel state marker missing: " + marker)

require('new java.io.File(shortx.getShortXDir() + "/data/pickword_font_size.txt")' not in PICKWORD,
        "legacy public font file must not be the active store")
require("legacyPrefs.getInt(KEY_FONT_SIZE, -1)" in PICKWORD,
        "Stable legacy preference migration missing")
require("getLegacyFontSizeStoreFile20" in PICKWORD and ".delete()" not in re.search(
    r"function getLegacyFontSizeStoreFile20\(\).*?function readFontSizeFile20", PICKWORD, re.S
).group(0), "legacy font migration must not delete old data")

allowed_shortx_files = {"th_01_base.js"}
for source in sorted(CODE.glob("*.js")):
    text = source.read_text(encoding="utf-8")
    if "shortx.getShortXDir" in text and source.name not in allowed_shortx_files:
        errors.append("unexpected shortx.getShortXDir bypass: code/" + source.name)
    for line_no, line in enumerate(text.splitlines(), 1):
        if re.search(r"ToolHub/(diagnostics|cache|screenshots|data|logs|tmp|temp)/", line):
            errors.append("fixed Stable private path: code/%s:%d" % (source.name, line_no))

if errors:
    for item in errors:
        print("FAIL channel-private-storage:", item)
    raise SystemExit(1)

print("OK channel-private-storage diagnostics=APP_ROOT_DIR pickword=file+prefs-per-channel stable_legacy_import=copy-only")
'''
    path.write_text(content, encoding="utf-8")


def patch_validators():
    color = ROOT / "scripts/verify_coloros_rhino_color_safety.py"
    replace_once(color, '"ToolHub/diagnostics/color-safety-last.json",', '"diagnostics/color-safety-last.json",', "color validator path")
    replace_once(color, '"ToolHub/diagnostics/settings-interaction-last.json",', '"diagnostics/settings-interaction-last.json",', "panel validator path")
    for name in (
        "verify_pickword_emoji_grapheme.py",
        "verify_pickword_long_click_api34.py",
        "verify_pickword_image_meta_handoff.py",
        "verify_pickword_unified_cleanup.py",
    ):
        replace_all(ROOT / "scripts" / name, "1.0.20", "1.0.21", name + " version")


def patch_workflows():
    sign_path = ROOT / ".github/workflows/sign-toolhub.yml"
    sign = sign_path.read_text(encoding="utf-8")
    marker = "          python3 scripts/verify_channel_screenshot_storage_isolation.py\n"
    if "verify_channel_private_storage_isolation.py" not in sign:
        if sign.count(marker) != 1:
            raise SystemExit("sign storage marker count=%d" % sign.count(marker))
        sign = sign.replace(marker, marker + "          python3 scripts/verify_channel_private_storage_isolation.py\n", 1)
    hook = re.compile(
        r"\n      - name: Apply channel private storage isolation fix\n.*?(?=\n      - name: Verify changed module versions\n)",
        re.S,
    )
    sign, count = hook.subn("", sign)
    if count != 1:
        raise SystemExit("temporary sign hook count=%d" % count)
    sign_path.write_text(sign, encoding="utf-8")

    verify_path = ROOT / ".github/workflows/verify.yml"
    verify = verify_path.read_text(encoding="utf-8")
    if "verify_channel_private_storage_isolation.py" not in verify:
        lines = verify.splitlines(True)
        inserted = False
        out = []
        for line in lines:
            out.append(line)
            if "python3 scripts/verify_channel_screenshot_storage_isolation.py" in line:
                indent = line[: len(line) - len(line.lstrip())]
                out.append(indent + "python3 scripts/verify_channel_private_storage_isolation.py\n")
                inserted = True
        if not inserted:
            raise SystemExit("verify storage marker missing")
        verify = "".join(out)
    verify_path.write_text(verify, encoding="utf-8")


def patch_docs_and_record():
    docs = ROOT / "docs/ARCHITECTURE.md"
    text = docs.read_text(encoding="utf-8")
    heading = "## Stable / Beta 私有诊断与拾字状态隔离"
    if heading not in text:
        text += '''

## Stable / Beta 私有诊断与拾字状态隔离

- ColorOS 颜色安全结果和设置交互压力测试结果写入当前通道 `APP_ROOT_DIR/diagnostics/`。
- 拾字号文件写入当前通道 `APP_ROOT_DIR/data/pickword_font_size.txt`，Android SharedPreferences 名称也附加 `stable` 或 `beta` 后缀。
- Stable 在新路径缺失时可以只读旧公共字号文件和旧 SharedPreferences，并复制到 Stable 私有路径；Beta 不读取旧公共状态。
- 旧公共字号文件不会被删除，避免升级失败或回滚时丢失用户数据。
'''
        docs.write_text(text, encoding="utf-8")

    record_path = ROOT / "updates/records/20260721-fix-channel-private-storage-isolation.json"
    if record_path.exists():
        raise SystemExit("release record already exists")
    record = {
        "schema": 1,
        "id": "20260721-fix-channel-private-storage-isolation",
        "type": "fix",
        "title": "隔离 Stable/Beta 私有诊断与拾字状态",
        "details": [
            "颜色安全与设置交互诊断结果改为写入当前通道 APP_ROOT_DIR",
            "拾字号文件和 SharedPreferences 按 Stable/Beta 分区，避免首次启动继承另一通道状态",
            "Stable 仅首次复制旧公共字号数据且不删除旧文件，Beta 不读取旧公共状态",
        ],
        "manifestVersion": 0,
    }
    record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def cleanup_temporary_files():
    for rel in (
        ".github/workflows/channel-storage-audit.yml",
        "scripts/report_channel_storage_paths.py",
    ):
        path = ROOT / rel
        if path.exists():
            path.unlink()
    Path(__file__).unlink()


def main():
    patch_theme()
    patch_panel_ui()
    patch_pickword()
    add_validator()
    patch_validators()
    patch_workflows()
    patch_docs_and_record()
    subprocess.check_call(["python3", "scripts/generate_api_usage_baseline.py"], cwd=str(ROOT))
    cleanup_temporary_files()
    print("Applied Stable/Beta private storage isolation fix")


if __name__ == "__main__":
    main()
