#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "code"
QR = (CODE / "th_26_qr_runtime.js").read_text(encoding="utf-8")
POINTER = (CODE / "th_17_pointer.js").read_text(encoding="utf-8")
OCR = (CODE / "th_18_pointer_ocr.js").read_text(encoding="utf-8")
ENTRY = (ROOT / "ToolHub.js").read_text(encoding="utf-8")
GEN = (ROOT / "scripts" / "generate_signed_manifest.py").read_text(encoding="utf-8")
BUILD = (ROOT / "runtime-src" / "zxing" / "build_runtime.sh").read_text(encoding="utf-8")
JAVA = (ROOT / "runtime-src" / "zxing" / "src" / "main" / "java" / "toolhub" / "runtime" / "qr" / "ToolHubQrRuntime.java").read_text(encoding="utf-8")
errors = []


def require(text, token, label):
    if token not in text:
        errors.append("missing %s: %s" % (label, token))


def forbid(text, token, label):
    if token in text:
        errors.append("forbidden %s: %s" % (label, token))


qr_version = QR.splitlines()[0] if QR.splitlines() else ""
SUPPORTED_QR_VERSIONS = (
    "// @version 1.0.1",
    "// @version 1.0.2",
    "// @version 1.0.3",
    "// @version 1.0.4",
    "// @version 1.0.5",
    "// @version 1.0.6",
    "// @version 1.0.7",
    "// @version 1.0.8",
    "// @version 1.0.9",
    "// @version 1.0.10",
    "// @version 1.0.11",
    "// @version 1.0.12",
    "// @version 1.0.13",
    "// @version 1.0.14",
    "// @version 1.0.15",
    "// @version 1.0.16",
    "// @version 1.0.17",
)
if qr_version not in SUPPORTED_QR_VERSIONS:
    errors.append("unexpected QR module version: %s" % qr_version)

for token in ("ZXing", "zxing", "area_qr", "PICKWORD_QR_", "decodeFile("):
    forbid(POINTER, token, "pointer QR coupling")
    forbid(OCR, token, "OCR QR coupling")
require(QR, "decodeAsync26(appObj, session", "QR decode dispatch")
require(QR, "createThumbnailView = function", "thumbnail-only UI integration")
require(QR, "controller.getPickwordQrActionState = function()", "QR action state bridge")
require(QR, "controller.performPickwordQrAction = function(action)", "QR action dispatch bridge")
require(QR, "controller.setPickwordQrActionStateListener = function(listener)", "QR action state listener")

for token in (
    "Number(ps.generation || 0) !== Number(generation)",
    "String(imageKey26(ps.meta)) !== String(key)",
    "Number(qr.runningToken || 0) !== Number(token)",
    "Number(qr.doneToken || 0) === token",
    "cancelQr26(appObj, \"image_deleted\")",
    "cancelQr26(appObj, \"session_close\")",
    "cancelQr26(this, \"pickword_dispose_",
):
    require(QR, token, "stale-result/cancel guard")

require(QR, 'name === "copy"', "manual copy bridge action")
require(QR, 'name === "toggle_load"', "manual load/restore bridge action")
require(QR, 'name === "generate"', "QR generate bridge action")
require(QR, "function copyQrResult26(appObj, session)", "manual copy owner")
require(QR, "function toggleQrLoad26(appObj, session)", "manual load/restore owner")
require(QR, "setClipboard26(text)", "manual clipboard implementation")
forbid(QR, "textButton26(", "legacy QR text-button UI")
for token in ("startActivity(", "ACTION_VIEW", "Intent.parseUri", "WifiNetworkSuggestion"):
    forbid(QR, token, "automatic external execution")

for token in (
    'typeof getToolHubRootDir !== "function"',
    'new java.io.File(root, "lib")',
    'assertWritableDirPath(libPath, "ToolHub QR lib")',
    "manifest.runtimeFiles",
    "fileSha25626(tmp)",
    "tmp.setReadOnly()",
    "destFile.setReadOnly()",
    "installed.file.canWrite()",
    'QR_RUNTIME_CLASS26 = "toolhub.runtime.qr.ToolHubQrRuntime"',
):
    require(QR, token, "runtime trust/loading contract")
if qr_version in ("// @version 1.0.6", "// @version 1.0.7", "// @version 1.0.8", "// @version 1.0.9", "// @version 1.0.10", "// @version 1.0.11", "// @version 1.0.12", "// @version 1.0.13", "// @version 1.0.14", "// @version 1.0.15", "// @version 1.0.16", "// @version 1.0.17"):
    require(QR, "new Packages.dalvik.system.DexClassLoader", "Rhino Packages DexClassLoader")
else:
    require(QR, "new dalvik.system.DexClassLoader", "legacy DexClassLoader")
for token in ("shortx.getShortXDir", "eval(", "geval("):
    forbid(QR, token, "runtime storage/eval bypass")

if qr_version in (
    "// @version 1.0.2",
    "// @version 1.0.3",
    "// @version 1.0.4",
    "// @version 1.0.5",
    "// @version 1.0.6",
    "// @version 1.0.7",
    "// @version 1.0.8",
    "// @version 1.0.9",
    "// @version 1.0.10",
    "// @version 1.0.11",
    "// @version 1.0.12",
    "// @version 1.0.13",
    "// @version 1.0.14",
    "// @version 1.0.15",
    "// @version 1.0.16",
    "// @version 1.0.17",
):
    for token in (
        "installLock: new java.util.concurrent.locks.ReentrantLock()",
        "function preflightRuntime26(appObj, reason)",
        'preflightRuntime26(null, "module_startup_or_update")',
        "return { file: dest, meta: meta, downloaded: false }",
        "return { file: downloadRuntime26(meta, dest), meta: meta, downloaded: true }",
        '"runtime preflight " + (installed.downloaded === true ? "downloaded" : "skip_existing")',
        "proto.ensurePickwordQrRuntimeReady = function(reason)",
        "preflightThread",
        "qr.thread",
    ):
        require(QR, token, "startup runtime preflight")

if qr_version in (
    "// @version 1.0.4",
    "// @version 1.0.5",
    "// @version 1.0.6",
    "// @version 1.0.7",
    "// @version 1.0.8",
    "// @version 1.0.9",
    "// @version 1.0.10",
    "// @version 1.0.11",
    "// @version 1.0.12",
    "// @version 1.0.13",
    "// @version 1.0.14",
    "// @version 1.0.15",
    "// @version 1.0.16",
    "// @version 1.0.17",
):
    for token in (
        "function sanitizeError26(error)",
        'typeof writeLog === "function"',
        'var decodeStage = "load_runtime"',
        'decodeStage = "invoke_decode"',
        'log26(appObj, "e", "runtime failure stage=" + decodeStage',
        'preflight=" + String(runtime26.preflightStatus || "idle")',
        'message += "\\n" + runtimeDetail.substring(0, 140)',
    ):
        require(QR, token, "runtime diagnostics")

if qr_version in ("// @version 1.0.5", "// @version 1.0.6", "// @version 1.0.7", "// @version 1.0.8", "// @version 1.0.9", "// @version 1.0.10", "// @version 1.0.11", "// @version 1.0.12", "// @version 1.0.13", "// @version 1.0.14", "// @version 1.0.15", "// @version 1.0.16", "// @version 1.0.17"):
    forbid(QR, "context.getCodeCacheDir()", "system_server has no app code-cache directory")
    for token in (
        "function getDexOptimizedDirectory26()",
        "var sdk = Number(android.os.Build.VERSION.SDK_INT || 0)",
        "if (sdk >= 26) return null;",
        'new java.io.File(lib, ".dexopt")',
        'assertWritableDirPath(dexoptPath, "ToolHub QR dexopt")',
        "var optimizedDirectory = getDexOptimizedDirectory26();",
    ):
        require(QR, token, "system_server DexClassLoader compatibility")

if qr_version in ("// @version 1.0.6", "// @version 1.0.7", "// @version 1.0.8", "// @version 1.0.9", "// @version 1.0.10", "// @version 1.0.11", "// @version 1.0.12", "// @version 1.0.13", "// @version 1.0.14", "// @version 1.0.15", "// @version 1.0.16", "// @version 1.0.17"):
    forbid(QR, "new dalvik.system.DexClassLoader(", "bare dalvik package is undefined in ShortX Rhino")
    require(QR, "new Packages.dalvik.system.DexClassLoader(", "Rhino Packages DexClassLoader")

if qr_version in ("// @version 1.0.7", "// @version 1.0.8", "// @version 1.0.9", "// @version 1.0.10", "// @version 1.0.11", "// @version 1.0.12", "// @version 1.0.13", "// @version 1.0.14", "// @version 1.0.15", "// @version 1.0.16", "// @version 1.0.17"):
    forbid(QR, 'hidePickwordWindow("qr_load")', "QR load-to-pickword hide/show race")
    require(QR, 'var qrTextToLoad26 = String(cached.result.text == null ? "" : cached.result.text);', "QR load text local value")
    require(QR, 'log26(appObj, "i", "load text reuse_window textLen=" + String(qrTextToLoad26.length));', "QR load reuse-window log")
    require(QR, 'appObj.showPickwordText(qrTextToLoad26, shallowCopy26(session));', "QR direct load to existing pickword window")

if qr_version in ("// @version 1.0.9", "// @version 1.0.10", "// @version 1.0.11", "// @version 1.0.12", "// @version 1.0.13", "// @version 1.0.14", "// @version 1.0.15", "// @version 1.0.16", "// @version 1.0.17"):
    for token in (
        'QR_WRITER_CLASS26 = "toolhub.runtime.shaded.zxing.qrcode.QRCodeWriter"',
        'QR_FORMAT_CLASS26 = "toolhub.runtime.shaded.zxing.BarcodeFormat"',
        'QR_HINTS_CLASS26 = "toolhub.runtime.shaded.zxing.EncodeHintType"',
        "function generateQrBitmap26(text, size)",
        "function saveGeneratedQrPng26(bitmap)",
        "function generateAsync26(appObj, session, text, callback)",
        "genSessionMatches26(appObj, generation, token)",
        "proto.generateTextQRCode = function(text, size)",
    ):
        require(QR, token, "QR generate contract")
    forbid(QR, "startActivity(", "generate path must reuse image viewer service")
    forbid(QR, "ACTION_VIEW", "generate path must reuse image viewer service")

require(GEN, '"th_26_qr_runtime.js"', "signed QR module")
require(GEN, '"toolhub-zxing-runtime"', "signed runtime asset")
require(GEN, '"schema": 6', "manifest schema 6")
require(BUILD, 'FINAL="$OUT_DIR/toolhub-zxing-runtime-${VERSION}.jar"', "runtime artifact")
require(BUILD, '"$D8" --min-api 24', "D8 compilation")
require(BUILD, 'local.install.dir=getToolHubRootDir()/lib', "runtime metadata channel lib path")
require(JAVA, "POSSIBLE_FORMATS", "QR-only decode hint")
require(JAVA, "BarcodeFormat.QR_CODE", "QR-only format")
require(JAVA, "DecodeHintType.TRY_HARDER", "try-harder fallback")
require(JAVA, "DecodeHintType.ALSO_INVERTED", "inverted fallback")
require(JAVA, "DEFAULT_MAX_PIXELS = 2_000_000", "2MP default cap")

beta_match = re.search(r"var\s+modules\s*=\s*\[(.*?)\]\s*;", ENTRY, re.S)
if not beta_match:
    errors.append("Beta modules list missing")
else:
    body = beta_match.group(1)
    if '"th_26_qr_runtime.js"' not in body:
        errors.append("Beta modules list does not contain th_26_qr_runtime.js")
    elif body.index('"th_26_qr_runtime.js"') < body.index('"th_22_image_viewer.js"'):
        errors.append("QR module must load after image viewer")
stable_match = re.search(r"var\s+TOOLHUB_STABLE_MODULES\s*=\s*\[(.*?)\]\s*;", ENTRY, re.S)
if stable_match and '"th_26_qr_runtime.js"' in stable_match.group(1):
    errors.append("QR module must remain Beta-only in stable module set")

if errors:
    for item in errors:
        print("FAIL", item)
    raise SystemExit(1)

print("OK pickword_qr beta_only=1 system_server_dexloader=%d rhino_packages=%d diagnostics=%d load_text_reuse_window=%d" % (
    1 if qr_version in ("// @version 1.0.5", "// @version 1.0.6", "// @version 1.0.7", "// @version 1.0.8", "// @version 1.0.9", "// @version 1.0.10", "// @version 1.0.11", "// @version 1.0.12", "// @version 1.0.13", "// @version 1.0.14", "// @version 1.0.15", "// @version 1.0.16", "// @version 1.0.17") else 0,
    1 if qr_version in ("// @version 1.0.6", "// @version 1.0.7", "// @version 1.0.8", "// @version 1.0.9", "// @version 1.0.10", "// @version 1.0.11", "// @version 1.0.12", "// @version 1.0.13", "// @version 1.0.14", "// @version 1.0.15", "// @version 1.0.16", "// @version 1.0.17") else 0,
    1 if qr_version in ("// @version 1.0.4", "// @version 1.0.5", "// @version 1.0.6", "// @version 1.0.7") else 0,
    1 if qr_version == "// @version 1.0.7" else 0,
))
