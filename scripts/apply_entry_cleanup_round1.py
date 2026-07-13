#!/usr/bin/env python3
"""一次性清理 ToolHub.js 第一批高置信度入口冗余。"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY_PATH = ROOT / "ToolHub.js"

text = ENTRY_PATH.read_text(encoding="utf-8")
original = text

android_context = '''function getAndroidContext() {
    try {
        var app = Packages.android.app.ActivityThread.currentApplication();
        if (app) return app.getApplicationContext ? app.getApplicationContext() : app;
    } catch (eApp) {}
    try {
        var ctx = Packages.tornaco.apps.shortx.core.OooO0O0.OooO00o();
        if (ctx && ctx.getApplicationContext) return ctx.getApplicationContext();
        return ctx;
    } catch (eCtx) {}
    return null;
}

'''
if android_context not in text:
    raise SystemExit("getAndroidContext block missing")
text = text.replace(android_context, "", 1)

source_wrapper = '''function getUpdateSourceText() {
    return "GitHub";
}

'''
if source_wrapper not in text:
    raise SystemExit("getUpdateSourceText block missing")
text = text.replace(source_wrapper, "", 1)

old_apply_source = '        TOOLHUB_UPDATE_STATE.source = getUpdateSourceText();\n'
new_apply_source = '        TOOLHUB_UPDATE_STATE.source = "GitHub";\n'
if old_apply_source not in text:
    raise SystemExit("runtime update source assignment missing")
text = text.replace(old_apply_source, new_apply_source, 1)

old_build_header = '''    var rel = getManifestRelease();
    var sourceText = getUpdateSourceText();
    var modeText = getUpdateModeText();
    var statusName = "latest";
    var errText = "";
    var versionNum = 0;
    if (__securityStatus && __securityStatus.version !== undefined && __securityStatus.version !== null) versionNum = Number(__securityStatus.version || 0);
    if ((!versionNum || isNaN(versionNum)) && __trustedManifest && __trustedManifest.version !== undefined) versionNum = Number(__trustedManifest.version || 0);
    if (isNaN(versionNum)) versionNum = 0;
'''
new_build_header = '''    var rel = getManifestRelease();
    var modeText = getUpdateModeText();
    var statusName = "latest";
    var errText = "";
    var versionNum = getTrustedManifestVersionNumber();
'''
if old_build_header not in text:
    raise SystemExit("buildToolHubUpdateState header missing")
text = text.replace(old_build_header, new_build_header, 1)

old_return_source = '      source: sourceText,\n'
new_return_source = '      source: "GitHub",\n'
if old_return_source not in text:
    raise SystemExit("build update source field missing")
text = text.replace(old_return_source, new_return_source, 1)

if text == original:
    raise SystemExit("no changes applied")
ENTRY_PATH.write_text(text, encoding="utf-8")
print("ToolHub entry cleanup round 1 applied")
