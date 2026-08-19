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
if qr_version not in ("// @version 1.0.1", "// @version 1.0.2"):
    errors.append("unexpected QR module version: %s" % qr_version)

# W8/W9: pointer and OCR remain QR-agnostic; decode is user-triggered in pickword image UI only.
for token in ("ZXing", "zxing", "area_qr", "PICKWORD_QR_", "decodeFile("):
    forbid(POINTER, token, "pointer QR coupling")
    forbid(OCR, token, "OCR QR coupling")
require(QR, '"解析二维码"', "explicit QR button")
require(QR, "decodeAsync26(appObj, session", "button decode dispatch")
require(QR, "createThumbnailView = function", "thumbnail-only UI integration")

# N12/N18: generation + image key + token + done-token stale-result protection and cancellation.
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

# N13/N21: clipboard and text replacement only exist behind explicit card buttons.
require(QR, 'textButton26(appObj, "复制结果"', "manual copy action")
require(QR, 'textButton26(appObj, "载入拾字"', "manual load action")
require(QR, "setClipboard26(text)", "manual clipboard implementation")
for token in ("startActivity(", "ACTION_VIEW", "Intent.parseUri", "WifiNetworkSuggestion"):
    forbid(QR, token, "automatic external execution")

# Shared ShortX lib contract, manifest trust, read-only DCL and no eval of the runtime JAR.
for token in (
    'new java.io.File(base, "lib")',
    "shortx.getShortXDir",
    "manifest.runtimeFiles",
    "fileSha25626(tmp)",
    "tmp.setReadOnly()",
    "destFile.setReadOnly()",
    "installed.file.canWrite()",
    "new dalvik.system.DexClassLoader",
    'QR_RUNTIME_CLASS26 = "toolhub.runtime.qr.ToolHubQrRuntime"',
):
    require(QR, token, "runtime trust/loading contract")
for token in ("eval(", "geval("):
    forbid(QR, token, "runtime eval")

# v1.0.2+: runtime is prepared asynchronously at Beta module startup/update.
# A valid signed local JAR is reused; only missing/invalid files are downloaded.
if qr_version == "// @version 1.0.2":
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

require(GEN, '"th_26_qr_runtime.js"', "signed QR module")
require(GEN, '"toolhub-zxing-runtime"', "signed runtime asset")
require(GEN, '"schema": 6', "manifest schema 6")
require(BUILD, 'FINAL="$OUT_DIR/toolhub-zxing-runtime-${VERSION}.jar"', "runtime artifact")
require(BUILD, '"$D8" --min-api 24', "D8 compilation")
require(BUILD, 'local.install.dir=shortx.getShortXDir()/lib', "runtime metadata lib path")
require(JAVA, "POSSIBLE_FORMATS", "QR-only decode hint")
require(JAVA, "BarcodeFormat.QR_CODE", "QR-only format")
require(JAVA, "DecodeHintType.TRY_HARDER", "try-harder fallback")
require(JAVA, "DecodeHintType.ALSO_INVERTED", "inverted fallback")
require(JAVA, "DEFAULT_MAX_PIXELS = 2_000_000", "2MP default cap")

# Beta module set must load QR after the image viewer; stable list remains separate.
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

print("OK pickword_qr beta_only=1 pointer_intrusion=0 ocr_intrusion=0 shared_lib=1 signed_runtime=1 stale_guard=1 startup_preflight=%d" % (1 if qr_version == "// @version 1.0.2" else 0))
