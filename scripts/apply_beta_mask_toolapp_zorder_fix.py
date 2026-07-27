#!/usr/bin/env python3
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def git_show(ref, path):
    return subprocess.check_output(
        ["git", "show", "%s:%s" % (ref, path)],
        cwd=str(ROOT),
        text=True,
        encoding="utf-8",
    )


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s replacement count=%d" % (label, count))
    return text.replace(old, new, 1)


def main():
    animation = git_show("origin/main", "code/th_09_animation.js")
    animation = replace_once(
        animation,
        "// @version 1.0.13",
        "// @version 1.0.14",
        "animation version",
    )
    animation = replace_once(
        animation,
        "  var toolAppGenerationAtHide = Number(this.state.toolAppUiGeneration || 0);\n",
        "  var toolAppGenerationAtHide = Number(this.state.toolAppUiGeneration || 0);\n"
        "  var maskAtHide = this.state.mask || null;\n"
        "  var maskGenerationAtHide = Number(this.state.maskGeneration || 0);\n",
        "mask identity capture",
    )
    animation = replace_once(
        animation,
        """          if (Number(self.state.toolAppUiGeneration || 0) !== toolAppGenerationAtHide) {
            safeLog(self.L, 'd', "main panel mask cleanup skipped for toolapp transition");
            return;
          }
""",
        """          if (Number(self.state.toolAppUiGeneration || 0) !== toolAppGenerationAtHide) {
            var transitionMaskRemoved = false;
            try {
              transitionMaskRemoved = self.hideMask(
                "main_to_toolapp_transition",
                maskAtHide,
                maskGenerationAtHide
              ) === true;
            } catch (eTransitionMask) {
              safeLog(self.L, 'w', "main to ToolApp mask cleanup fail: " + String(eTransitionMask));
            }
            safeLog(self.L, 'd',
              "main panel mask cleanup for toolapp transition removed=" +
              String(transitionMaskRemoved));
            return;
          }
""",
        "toolapp mask cleanup",
    )
    if "main panel mask cleanup skipped for toolapp transition" in animation:
        raise SystemExit("old mask skip path remains")
    (ROOT / "code/th_09_animation.js").write_text(animation, encoding="utf-8")

    entry_module = git_show("origin/main", "code/th_16_entry.js")
    entry_module = replace_once(
        entry_module,
        "// @version 1.0.18",
        "// @version 1.0.19",
        "entry module version",
    )
    (ROOT / "code/th_16_entry.js").write_text(entry_module, encoding="utf-8")

    entry_path = ROOT / "ToolHub.js"
    entry = entry_path.read_text(encoding="utf-8")
    entry = replace_once(
        entry,
        "var TOOLHUB_ENTRY_VERSION = 20260728000100;",
        "var TOOLHUB_ENTRY_VERSION = 20260728002000;",
        "entry version",
    )

    version_block = """function getManifestModuleVersion(info) {
    try {
        if (info && info.version !== undefined && info.version !== null) return String(info.version);
    } catch (eManifestVersion) {}
    return "";
}
"""
    strict_block = version_block + """
// Window lifecycle modules must match the currently verified channel Manifest before eval.
// This prevents a newer module left by another channel/release from bypassing the signed target.
var TOOLHUB_STRICT_BOOT_MANIFEST_MODULES = {
    "th_09_animation.js": true,
    "th_16_entry.js": true
};

function isToolHubStrictBootManifestModule(relPath) {
    try {
        return TOOLHUB_STRICT_BOOT_MANIFEST_MODULES[String(relPath || "")] === true;
    } catch (eStrictBootModule) {}
    return false;
}
"""
    entry = replace_once(entry, version_block, strict_block, "strict boot registry")

    exact_hash = """    if (destFile.exists() && hashesEqual(actualHash, expectedHash)) {
        saveTrustedSha(relPath, expectedHash);
        return { updated: false, latest: true, size: destFile.length(), hash: actualHash };
    }
"""
    strict_repair = exact_hash + """    if (destFile.exists() && actualHash && isToolHubStrictBootManifestModule(relPath)) {
        var strictFixed = ensureVerifiedModule(relPath, destFile);
        strictFixed.bootFixed = true;
        strictFixed.strictTarget = true;
        writeLog("Strict boot manifest repair " + relPath +
            " (local=" + String(actualHash) + ", remote=" + String(expectedHash) + ")");
        return strictFixed;
    }
"""
    entry = replace_once(entry, exact_hash, strict_repair, "strict boot repair")

    newer = """                writeLog("Local module version is newer, skip update " + relPath + " local=" + localVersion + " remote=" + remoteVersion);
                continue;
"""
    newer_replacement = """                addPendingModuleUpdate(relPath, actualHash, expectedHash, expectedSize, localVersion, remoteVersion, "signed_target");
                names.push(relPath);
                writeLog("Local module version is newer than signed target, schedule replacement " +
                    relPath + " local=" + localVersion + " remote=" + remoteVersion);
                continue;
"""
    entry = replace_once(entry, newer, newer_replacement, "newer local policy")
    entry_path.write_text(entry, encoding="utf-8")

    beta_verifier = '''#!/usr/bin/env python3
from pathlib import Path
import json
import re
ROOT = Path(__file__).resolve().parents[1]
MANIFEST = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
if str(MANIFEST.get("channel", "")) != "beta":
    print("SKIP beta_channel_manifest_sync channel=%s" % MANIFEST.get("channel"))
    raise SystemExit(0)
ENTRY = (ROOT / "ToolHub.js").read_text(encoding="utf-8")
ANIMATION = (ROOT / "code/th_09_animation.js").read_text(encoding="utf-8")
TOOLAPP = (ROOT / "code/th_15_extra.js").read_text(encoding="utf-8")
ENTRY_MODULE = (ROOT / "code/th_16_entry.js").read_text(encoding="utf-8")
def fail(message):
    raise SystemExit("FAIL beta-channel-manifest-sync: " + message)
def require(text, fragment, label):
    if fragment not in text:
        fail("missing %s: %s" % (label, fragment))
def forbid(text, fragment, label):
    if fragment in text:
        fail("forbidden %s: %s" % (label, fragment))
require(ANIMATION, "// @version 1.0.14", "animation version")
require(ENTRY_MODULE, "// @version 1.0.19", "entry module version")
for fragment, label in (
    ("var maskAtHide = this.state.mask || null", "captured mask identity"),
    ("var maskGenerationAtHide = Number(this.state.maskGeneration || 0)", "captured mask generation"),
    ("main_to_toolapp_transition", "transition cleanup reason"),
    ("self.hideMask(", "transition mask removal"),
    ("main panel mask cleanup for toolapp transition removed=", "transition cleanup log"),
):
    require(ANIMATION, fragment, label)
forbid(ANIMATION, "main panel mask cleanup skipped for toolapp transition", "old transition skip")
require(TOOLAPP, "FLAG_DIM_BEHIND", "ToolApp native dim")
require(TOOLAPP, "lp.dimAmount = 0.5", "ToolApp native dim amount")
for fragment, label in (
    ("TOOLHUB_STRICT_BOOT_MANIFEST_MODULES", "strict boot registry"),
    ('"th_09_animation.js": true', "strict animation target"),
    ('"th_16_entry.js": true', "strict entry target"),
    ("isToolHubStrictBootManifestModule(relPath)", "strict target check"),
    ("Strict boot manifest repair", "strict repair log"),
    ('"signed_target"', "newer local replacement reason"),
    ("Local module version is newer than signed target, schedule replacement", "newer local replacement log"),
):
    require(ENTRY, fragment, label)
forbid(ENTRY, "Local module version is newer, skip update", "newer local skip")
match = re.search(r"var TOOLHUB_ENTRY_VERSION = ([0-9]+);", ENTRY)
if not match or int(match.group(1)) < 20260728002000:
    fail("entry version not bumped")
print("OK beta_channel_manifest_sync strict_boot=animation,entry mask=removed_before_toolapp")
'''
    (ROOT / "scripts/verify_beta_channel_manifest_sync.py").write_text(beta_verifier, encoding="utf-8")

    main_verify = '''#!/usr/bin/env python3
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[1]
ANIMATION_PATH = ROOT / "code/th_09_animation.js"
ENTRY_PATH = ROOT / "code/th_16_entry.js"
MAIN_PANEL_PATH = ROOT / "code/th_15_main_panel.js"
WORKFLOW_PATH = ROOT / ".github/workflows/verify.yml"
ANIMATION = ANIMATION_PATH.read_text(encoding="utf-8")
ENTRY = ENTRY_PATH.read_text(encoding="utf-8")
MAIN_PANEL = MAIN_PANEL_PATH.read_text(encoding="utf-8")
WORKFLOW = WORKFLOW_PATH.read_text(encoding="utf-8")
def fail(message):
    raise SystemExit("FAIL main-panel-close-lifecycle: " + message)
def version_at_least(text, expected):
    match = re.search(r"(?m)^// @version ([0-9]+)\\.([0-9]+)\\.([0-9]+)$", text)
    return bool(match) and tuple(map(int, match.groups())) >= expected
def isolate(text, start_marker, end_marker):
    start = text.find(start_marker)
    end = text.find(end_marker, start + 1)
    if start < 0 or end <= start:
        fail("cannot isolate %s" % start_marker)
    return text[start:end]
if not version_at_least(ANIMATION, (1, 0, 14)):
    fail("expected th_09_animation.js >= 1.0.14")
if not version_at_least(ENTRY, (1, 0, 19)):
    fail("expected th_16_entry.js >= 1.0.19")
if "// @version 1.5.8" not in MAIN_PANEL:
    fail("main panel UI module must remain unchanged")
safe = isolate(ANIMATION, "FloatBallAppWM.prototype.safeRemoveView = function", "FloatBallAppWM.prototype.hideMask = function")
if "removeViewImmediate" in safe:
    fail("safeRemoveView must not synchronously destroy ViewRoot")
for marker in (
    "var requestedImmediate = opts.immediate === true", "var immediate = false",
    "v.setVisibility(android.view.View.INVISIBLE)", "v.setAlpha(0)",
    "this.unregisterPanelPredictiveBack(v, resetVisual)", "this.state.wm.removeView(v)",
    "requestedImmediate: requestedImmediate",
):
    if marker not in safe:
        fail("safeRemoveView missing: %s" % marker)
hide_main = isolate(ANIMATION, "FloatBallAppWM.prototype.hideMainPanel = function", "FloatBallAppWM.prototype.hideSettingsPanel = function")
for marker in (
    "mainPanelExitGeneration", "var finished = false", "isCurrent = self.state.panel === panel",
    "immediate: false", "resetVisual: false", "keepInvisible: true", "toolAppGenerationAtHide",
    "maskAtHide", "maskGenerationAtHide", "main_to_toolapp_transition",
    "main panel mask cleanup for toolapp transition removed=", "self.state.h.post(maskCleanup)",
):
    if marker not in hide_main:
        fail("hideMainPanel missing: %s" % marker)
if "main panel mask cleanup skipped for toolapp transition" in hide_main:
    fail("ToolApp transition must not retain the WM-thread mask")
hide_mask = isolate(ANIMATION, "FloatBallAppWM.prototype.hideMask = function", "FloatBallAppWM.prototype.hideMaskIfNoPanelVisible = function")
if "immediate: false" not in hide_mask:
    fail("mask must use deferred removal")
tool_remove = ENTRY[ENTRY.find("FloatBallAppWM.prototype.removeToolAppOnMain = function"):]
if "removeViewImmediate" in tool_remove:
    fail("ToolApp removal must not call removeViewImmediate")
for marker in (
    "root.setVisibility(android.view.View.INVISIBLE)", "root.setAlpha(0)",
    "s.wm.removeView(root)", "toolapp deferred remove fail",
    'hideMaskIfNoPanelVisible("toolapp_build_fail")',
):
    if marker not in ENTRY:
        fail("ToolApp lifecycle missing: %s" % marker)
if "python3 scripts/verify_main_panel_close_lifecycle.py" not in WORKFLOW:
    fail("workflow verification missing")
entry_source = (ROOT / "ToolHub.js").read_text(encoding="utf-8")
entry_version = re.search(r"var TOOLHUB_ENTRY_VERSION = ([0-9]+);", entry_source)
if not entry_version or int(entry_version.group(1)) < 20260728002000:
    fail("entry version below mask transition baseline")
for path in (ANIMATION_PATH, ENTRY_PATH):
    raw = path.read_bytes()
    if not raw.endswith(b"\\n") or raw.endswith(b"\\n\\n"):
        fail("invalid EOF: %s" % path.relative_to(ROOT))
print("OK main_panel_close_lifecycle deferred_remove=1 main_mask=removed_for_toolapp toolapp_failure=mask_rollback")
'''
    (ROOT / "scripts/verify_main_panel_close_lifecycle.py").write_text(main_verify, encoding="utf-8")

    windowhost_path = ROOT / "scripts/verify_shortx_ui_windowhost.py"
    windowhost = windowhost_path.read_text(encoding="utf-8")
    windowhost = replace_once(
        windowhost,
        'require(ANIMATION, "// @version 1.0.12", "unchanged animation module version")',
        'require(ANIMATION, "// @version 1.0.14", "mask-safe animation module version")',
        "WindowHost animation version",
    )
    windowhost_path.write_text(windowhost, encoding="utf-8")

    for workflow_path in (
        ROOT / ".github/workflows/verify.yml",
        ROOT / ".github/workflows/sign-toolhub.yml",
    ):
        workflow = workflow_path.read_text(encoding="utf-8")
        marker = "      - name: Verify ShortXUI WindowHost\n        run: python3 scripts/verify_shortx_ui_windowhost.py\n"
        addition = marker + "\n      - name: Verify Beta channel manifest sync\n        run: python3 scripts/verify_beta_channel_manifest_sync.py\n"
        workflow = replace_once(workflow, marker, addition, str(workflow_path))
        workflow_path.write_text(workflow, encoding="utf-8")

    record_path = ROOT / "updates/records/20260727-beta-toolapp-mask-zorder.json"
    if record_path.exists():
        raise SystemExit("release record already exists")
    record = {
        "schema": 1,
        "id": "20260727-beta-toolapp-mask-zorder",
        "manifestVersion": 0,
        "type": "fix",
        "title": "修复 Beta ToolApp 全屏遮罩阻塞",
        "details": [
            "主面板进入设置类 ToolApp 时，按旧遮罩 View 身份和 generation 精确移除 WM 线程遮罩，避免其压在 Android 主线程 ToolApp 之上并吞掉触摸。",
            "Beta 同步 Stable 已验证的普通 removeView 生命周期实现，th_09_animation 提升到 1.0.14，th_16_entry 提升到 1.0.19。",
            "入口对窗口生命周期模块启用签名 Manifest 严格启动同步，跨版本遗留模块不会再绕过当前 Beta 签名目标。",
        ],
    }
    record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
