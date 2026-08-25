#!/usr/bin/env python3
"""Generate one directly runnable ShortX/Rhino ES5 ToolHub Beta JavaScript file.

The output embeds every Beta module as deterministic gzip/base64 data, verifies
its UTF-8 size and SHA-256 on the device, evaluates modules in the exact loader
order, and starts ToolHub without downloading manifest or module files.
"""
from __future__ import annotations

import argparse
import base64
import gzip
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "ToolHub.js"
OUTPUT = ROOT / "ToolHub-Beta-Standalone.js"
BUILD_VERSION = "20260728.1"
BUILD_LABEL = "ToolHub Beta Standalone"

MODULES_PATTERN = re.compile(r"var\s+modules\s*=\s*\[(.*?)\]\s*;", re.S)
MODULE_NAME_PATTERN = re.compile(r'["\'](th_[^"\']+\.js)["\']')
MODULE_VERSION_PATTERNS = (
    re.compile(r"\bMODULE_VERSION\s*=\s*[\"']([^\"']+)[\"']"),
    re.compile(r"\bVERSION\s*=\s*[\"']([^\"']+)[\"']"),
)

BOOT_END_MARKER = "var TOOLHUB_ACTIVE_APP = "
OUT_MARKER = "var __out = (function() {"


def fail(message: str) -> None:
    raise SystemExit("FAIL standalone-generator: " + message)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def module_version(source: str) -> str:
    head = source[:12000]
    for pattern in MODULE_VERSION_PATTERNS:
        match = pattern.search(head)
        if match:
            return match.group(1)
    return "0.0.0"


def parse_modules(entry: str) -> list[str]:
    match = MODULES_PATTERN.search(entry)
    if not match:
        fail("ToolHub.js modules[] not found")
    modules = MODULE_NAME_PATTERN.findall(match.group(1))
    if not modules:
        fail("ToolHub.js modules[] is empty")
    if len(modules) != len(set(modules)):
        fail("ToolHub.js modules[] contains duplicates")
    return modules


def deterministic_gzip(data: bytes) -> bytes:
    return gzip.compress(data, compresslevel=9, mtime=0)


def make_payloads(modules: list[str]) -> tuple[list[dict], dict]:
    payloads: list[dict] = []
    files: dict[str, dict] = {}
    for module in modules:
        path = ROOT / "code" / module
        if not path.is_file():
            fail("missing code/" + module)
        raw = path.read_bytes()
        try:
            source = raw.decode("utf-8")
        except UnicodeDecodeError as exc:
            fail("non UTF-8 module %s: %s" % (module, exc))
        compressed = deterministic_gzip(raw)
        digest = sha256_bytes(raw)
        version = module_version(source)
        payloads.append(
            {
                "name": module,
                "version": version,
                "size": len(raw),
                "sha256": digest,
                "gzipSize": len(compressed),
                "data": base64.b64encode(compressed).decode("ascii"),
            }
        )
        files[module] = {
            "version": version,
            "size": len(raw),
            "sha256": digest,
        }
    return payloads, files


def force_beta_runtime(entry: str) -> str:
    pattern = re.compile(
        r"var\s+TOOLHUB_UPDATE_CHANNEL\s*=\s*normalizeToolHubUpdateChannel\(TOOLHUB_CHANNEL_STATE\.activeChannel\);\s*\n"
        r"var\s+TOOLHUB_CHANNEL_SPEC\s*=\s*getToolHubChannelSpec\(TOOLHUB_UPDATE_CHANNEL\);\s*\n"
        r"var\s+TOOLHUB_UPDATE_BRANCH\s*=\s*String\(TOOLHUB_CHANNEL_SPEC\.branch\);\s*\n"
        r"var\s+TOOLHUB_CHANNEL_LABEL\s*=\s*String\(TOOLHUB_CHANNEL_SPEC\.label\);"
    )
    replacement = (
        'TOOLHUB_CHANNEL_STATE.activeChannel = "beta";\n'
        'TOOLHUB_CHANNEL_STATE.pendingChannel = "";\n'
        'TOOLHUB_CHANNEL_STATE.lastGoodChannel = "beta";\n'
        'var TOOLHUB_UPDATE_CHANNEL = "beta";\n'
        'var TOOLHUB_CHANNEL_SPEC = TOOLHUB_CHANNEL_SPECS.beta;\n'
        'var TOOLHUB_UPDATE_BRANCH = "standalone-beta";\n'
        'var TOOLHUB_CHANNEL_LABEL = "测试版 Beta · 单文件";'
    )
    updated, count = pattern.subn(replacement, entry, count=1)
    if count != 1:
        fail("cannot force Beta runtime variables")
    return updated


def js_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def make_embedded_boot(modules: list[str], payloads: list[dict], files: dict) -> str:
    module_list = js_json(modules)
    payload_json = js_json(payloads)
    manifest = {
        "schema": 5,
        "version": 20260728112735,
        "channel": "beta",
        "branch": "standalone-beta",
        "standalone": True,
        "buildVersion": BUILD_VERSION,
        "entry": {
            "name": OUTPUT.name,
            "version": BUILD_VERSION,
            "manualUpdate": True,
        },
        "files": files,
        "release": {
            "title": "Beta：ShortXUI 最终 R3 离线单文件",
            "date": "2026-07-28",
            "changes": [
                "将当前 Beta 入口与全部子模块封装为一个可直接运行的 Rhino ES5 文件。",
                "运行时逐模块执行 UTF-8 大小和 SHA-256 校验，不下载 manifest 或 code 子模块。",
                "固定使用 ToolHub-Beta 运行目录和数据库，禁用通道切换及模块在线更新。",
            ],
        },
    }
    manifest_json = js_json(manifest)
    critical = {
        "th_01_base.js": True,
        "th_02_core.js": True,
        "th_05_persistence.js": True,
        "th_16_entry.js": True,
        "th_19_position_state.js": True,
        "th_25_shortx_ui_package.js": True,
    }
    critical_json = js_json(critical)

    return f'''var modules = {module_list};
var __moduleUpdates = [];
var __pendingModuleUpdates = [];
var loadErrors = [];
var criticalModules = {critical_json};
var TOOLHUB_STANDALONE_BUILD = {{
    schema: 1,
    version: "{BUILD_VERSION}",
    label: "{BUILD_LABEL}",
    channel: "beta",
    rootName: "ToolHub-Beta",
    moduleCount: modules.length,
    offline: true,
    externalDownloads: false
}};
var __toolHubStandaloneManifest = {manifest_json};
var __toolHubStandalonePayloads = {payload_json};

function __toolHubStandaloneHex(bytes) {{
    var out = "";
    for (var i = 0; i < bytes.length; i++) {{
        var value = Number(bytes[i]);
        if (value < 0) value += 256;
        var hex = value.toString(16);
        if (hex.length < 2) hex = "0" + hex;
        out += hex;
    }}
    return out;
}}

function __toolHubStandaloneSha256(source) {{
    var digest = java.security.MessageDigest.getInstance("SHA-256");
    var bytes = new java.lang.String(String(source)).getBytes("UTF-8");
    digest.update(bytes);
    return __toolHubStandaloneHex(digest.digest());
}}

function __toolHubStandaloneDecode(item) {{
    var input = null;
    var gzipInput = null;
    var output = null;
    try {{
        var compressed = android.util.Base64.decode(String(item.data), android.util.Base64.DEFAULT);
        input = new java.io.ByteArrayInputStream(compressed);
        gzipInput = new java.util.zip.GZIPInputStream(input);
        output = new java.io.ByteArrayOutputStream(Math.max(4096, Number(item.size || 0)));
        var buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 8192);
        var count;
        while ((count = gzipInput.read(buffer)) !== -1) {{
            if (count > 0) output.write(buffer, 0, count);
        }}
        var raw = output.toByteArray();
        if (Number(raw.length) !== Number(item.size)) {{
            throw String(item.name) + " UTF-8 size mismatch: expected=" + String(item.size) + ", actual=" + String(raw.length);
        }}
        var source = String(new java.lang.String(raw, "UTF-8"));
        var actual = __toolHubStandaloneSha256(source);
        if (String(actual).toLowerCase() !== String(item.sha256).toLowerCase()) {{
            throw String(item.name) + " SHA-256 mismatch: expected=" + String(item.sha256) + ", actual=" + String(actual);
        }}
        return source;
    }} finally {{
        try {{ if (output) output.close(); }} catch (eOutput) {{}}
        try {{ if (gzipInput) gzipInput.close(); }} catch (eGzip) {{}}
        try {{ if (input) input.close(); }} catch (eInput) {{}}
    }}
}}

function __toolHubStandaloneLoadEmbeddedModules(reason) {{
    loadErrors = [];
    var globalEval = eval;
    for (var i = 0; i < __toolHubStandalonePayloads.length; i++) {{
        var item = __toolHubStandalonePayloads[i];
        try {{
            var source = __toolHubStandaloneDecode(item);
            globalEval(String(source));
            try {{ writeLog("Standalone module loaded " + String(item.name) + " version=" + String(item.version) + " sha256=" + String(item.sha256)); }} catch (eLogModule) {{}}
        }} catch (error) {{
            var text = String(error);
            loadErrors.push({{ module: String(item.name), err: text }});
            try {{ writeLog("Standalone module load failed " + String(item.name) + ": " + text); }} catch (eLogFail) {{}}
            try {{ android.util.Log.e("ToolHub", "Standalone module load failed " + String(item.name) + ": " + text); }} catch (eAndroidLog) {{}}
            if (criticalModules[String(item.name)] === true) throw "Critical standalone module failed: " + String(item.name) + " (" + text + ")";
        }}
    }}
    if (loadErrors.length > 0) throw "Standalone module loading degraded: " + String(loadErrors.length);
    try {{ writeLog("ToolHub standalone modules ready count=" + String(modules.length) + " build={BUILD_VERSION} reason=" + String(reason || "boot")); }} catch (eReadyLog) {{}}
    return {{ ok: true, count: modules.length, buildVersion: "{BUILD_VERSION}" }};
}}

__trustedManifest = __toolHubStandaloneManifest;
__installedManifest = __toolHubStandaloneManifest;
__securityStatus = {{ ok: true, msg: "离线单文件内嵌模块已通过逐项 SHA-256 校验" }};
TOOLHUB_UPDATE_STATE = {{
    ok: true,
    status: "standalone",
    source: "Standalone/Beta",
    channel: "beta",
    channelLabel: TOOLHUB_CHANNEL_LABEL,
    branch: "standalone-beta",
    rootDir: "",
    channelSwitching: false,
    channelSwitchTarget: "",
    channelSwitchError: "",
    mode: 2,
    modeText: "离线单文件 · 内嵌 SHA-256",
    version: 20260728112735,
    title: __toolHubStandaloneManifest.release.title,
    date: __toolHubStandaloneManifest.release.date,
    changes: __toolHubStandaloneManifest.release.changes,
    updatedCount: 0,
    updatedModules: [],
    availableCount: 0,
    availableModules: [],
    availableDetails: [],
    bootFixedCount: 0,
    bootFixedModules: [],
    needRestart: false,
    lastCheckAt: Number(java.lang.System.currentTimeMillis()),
    securityText: "离线单文件内嵌模块已通过逐项 SHA-256 校验",
    error: "",
    standalone: true
}};

__toolHubStandaloneLoadEmbeddedModules("boot");

function notifyToolHubModulesLoaded() {{
    if (loadErrors && loadErrors.length > 0) return false;
    var moduleCount = modules ? Number(modules.length || 0) : 0;
    var text = "ToolHub 单文件模块加载完成（" + String(moduleCount) + " 个）";
    var task = new java.lang.Runnable({{ run: function() {{
        try {{ android.widget.Toast.makeText(context, text, android.widget.Toast.LENGTH_SHORT).show(); }}
        catch (eToast) {{ try {{ writeLog("Standalone loaded toast failed: " + String(eToast)); }} catch (eLog) {{}} }}
    }}}});
    try {{ new android.os.Handler(android.os.Looper.getMainLooper()).post(task); }}
    catch (ePost) {{ try {{ task.run(); }} catch (eDirect) {{}} }}
    try {{ writeLog("All standalone modules loaded count=" + String(moduleCount)); }} catch (eWrite) {{}}
    return true;
}}
notifyToolHubModulesLoaded();

'''


def make_offline_overrides() -> str:
    return f'''
// Standalone runtime overrides: no network manifest/module path and no channel switch.
fetchTrustedManifest = function() {{
    __trustedManifest = __toolHubStandaloneManifest;
    __securityStatus = {{ ok: true, msg: "离线单文件内嵌模块已通过逐项 SHA-256 校验" }};
    return __trustedManifest;
}};

checkToolHubModuleUpdatesNow = function() {{
    var now = Number(java.lang.System.currentTimeMillis());
    TOOLHUB_UPDATE_STATE.ok = true;
    TOOLHUB_UPDATE_STATE.status = "standalone";
    TOOLHUB_UPDATE_STATE.source = "Standalone/Beta";
    TOOLHUB_UPDATE_STATE.availableCount = 0;
    TOOLHUB_UPDATE_STATE.availableModules = [];
    TOOLHUB_UPDATE_STATE.availableDetails = [];
    TOOLHUB_UPDATE_STATE.needRestart = false;
    TOOLHUB_UPDATE_STATE.lastCheckAt = now;
    TOOLHUB_UPDATE_STATE.error = "";
    return {{ ok: true, standalone: true, count: 0, modules: [], msg: "当前为离线单文件版，不下载子模块；替换完整 JS 文件即可更新。" }};
}};

function __toolHubStandaloneNoOnlineInstall() {{
    return {{ ok: false, standalone: true, count: 0, modules: [], msg: "离线单文件版不安装在线子模块；请替换完整 JS 文件。" }};
}}
if (typeof installToolHubModuleUpdatesNow === "function") installToolHubModuleUpdatesNow = __toolHubStandaloneNoOnlineInstall;
if (typeof installPendingToolHubModuleUpdatesNow === "function") installPendingToolHubModuleUpdatesNow = __toolHubStandaloneNoOnlineInstall;
if (typeof applyToolHubModuleUpdatesNow === "function") applyToolHubModuleUpdatesNow = __toolHubStandaloneNoOnlineInstall;
if (typeof updateToolHubModulesNow === "function") updateToolHubModulesNow = __toolHubStandaloneNoOnlineInstall;

reloadLocalToolHubModulesForRestart = function() {{
    return __toolHubStandaloneLoadEmbeddedModules("restart");
}};
reloadKnownGoodToolHubChannelModules = function() {{
    return __toolHubStandaloneLoadEmbeddedModules("rollback");
}};
loadTargetToolHubChannelModules = function() {{
    return __toolHubStandaloneLoadEmbeddedModules("fixed-beta");
}};

switchToolHubUpdateChannel = function(targetChannel) {{
    var target = normalizeToolHubUpdateChannel(targetChannel);
    if (target === "beta") return {{ ok: true, unchanged: true, standalone: true, target: "beta", msg: "单文件版已固定为测试版 Beta。" }};
    return {{ ok: false, standalone: true, target: target, msg: "离线单文件版固定使用 Beta；Stable 请运行对应的 Stable 单文件。" }};
}};

try {{
    writeLog("ToolHub standalone runtime active build={BUILD_VERSION} modules=" + String(modules.length) + " root=ToolHub-Beta network=false");
}} catch (eStandaloneActive) {{}}

'''


def generate() -> str:
    entry = ENTRY.read_text(encoding="utf-8")
    entry = force_beta_runtime(entry)
    modules = parse_modules(entry)
    payloads, files = make_payloads(modules)

    boot_match = MODULES_PATTERN.search(entry)
    if not boot_match:
        fail("boot modules block missing after channel rewrite")
    boot_start = boot_match.start()
    boot_end = entry.find(BOOT_END_MARKER, boot_match.end())
    if boot_end < 0:
        fail("boot end marker missing")

    prefix = entry[:boot_start]
    suffix = entry[boot_end:]
    out_index = suffix.find(OUT_MARKER)
    if out_index < 0:
        fail("startup output marker missing")
    suffix = suffix[:out_index] + make_offline_overrides() + suffix[out_index:]

    header = (
        "// ToolHub Beta Standalone - ShortX / Rhino ES5\n"
        "// Directly runnable single file; no manifest or code-module downloads.\n"
        "// Build: %s | modules: %d | root: ToolHub-Beta\n\n"
        % (BUILD_VERSION, len(modules))
    )
    output = header + prefix + make_embedded_boot(modules, payloads, files) + suffix
    output = output.replace('source: "GitHub/" + TOOLHUB_UPDATE_BRANCH,', 'source: "Standalone/Beta",')
    output = output.replace('更新通道: TOOLHUB_CHANNEL_LABEL + " / " + TOOLHUB_UPDATE_BRANCH,', '更新通道: TOOLHUB_CHANNEL_LABEL + " / standalone-beta",')
    return output


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    generated = generate()
    if args.check:
        if not OUTPUT.is_file():
            fail("missing " + OUTPUT.name)
        current = OUTPUT.read_text(encoding="utf-8")
        if current != generated:
            fail(OUTPUT.name + " is stale")
        print("OK standalone-current bytes=%d sha256=%s" % (len(generated.encode("utf-8")), sha256_bytes(generated.encode("utf-8"))))
        return 0
    OUTPUT.write_text(generated, encoding="utf-8")
    print("OK standalone-generated bytes=%d sha256=%s" % (len(generated.encode("utf-8")), sha256_bytes(generated.encode("utf-8"))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
