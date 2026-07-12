#!/usr/bin/env python3
"""校验 Shell 诊断日志不输出明文命令或完整结果对象。"""
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parents[1]
ACTION = (ROOT / "code" / "th_11_action.js").read_text(encoding="utf-8")
SHELL = (ROOT / "code" / "th_10_shell.js").read_text(encoding="utf-8")


def require(text, fragment, label):
    if fragment not in text:
        raise AssertionError("missing %s: %s" % (label, fragment))


def forbid(text, fragment, label):
    if fragment in text:
        raise AssertionError("forbidden %s: %s" % (label, fragment))


require(ACTION, "getShellDiagCommandMeta", "command metadata helper")
require(ACTION, 'MessageDigest.getInstance("SHA-256")', "fingerprint digest")
require(ACTION, 'fingerprint = hex.substring(0, 12)', "bounded fingerprint")
require(ACTION, 'return "[redacted kind="', "redacted compatibility preview")
require(ACTION, 'kind=" + String(meta.kind', "kind-only diagnostic")
require(ACTION, 'fingerprint=" + String(meta.fingerprint', "fingerprint-only diagnostic")
require(ACTION, 'meta.kind === "shortx_shared_da"', "shared DA classification")
require(ACTION, 'meta.kind === "shortx_private_da"', "private DA classification")
require(ACTION, 'err_type=diagnostic_exception', "sanitized diagnostic error")
require(SHELL, 'err_type=" + String(ret && ret.err ? "broadcast_error" : "")', "sanitized bridge result")
require(ACTION, 'err_type=" + String(r && r.err ? "broadcast_error" : "unknown")', "sanitized action failure")

for text, label in ((ACTION, "action"), (SHELL, "shell")):
    forbid(text, 'preview=" + preview', label + " plaintext preview")
    forbid(text, '" ret=" + JSON.stringify(', label + " complete result serialization")

forbid(ACTION, "if (p.length > 220) p = p.substring(0, 220)", "legacy command truncation")
forbid(ACTION, '" preview="', "preview log field")


def classify(command):
    normalized = " ".join((command or "").replace("\r", " ").replace("\n", " ").replace("\t", " ").split())
    lower = normalized.lower()
    if "am shortx run SHARED-DA-" in normalized:
        return "shortx_shared_da"
    if "am shortx run DA-" in normalized:
        return "shortx_private_da"
    if lower.startswith("am shortx run "):
        return "shortx_action"
    if lower.startswith("am broadcast "):
        return "android_broadcast"
    if lower.startswith("am start ") or lower.startswith("am startservice "):
        return "android_activity"
    if lower.startswith("settings ") or lower.startswith("cmd ") or lower.startswith("pm "):
        return "android_cli"
    if lower.startswith("sh ") or lower.startswith("bash ") or lower.startswith("su "):
        return "shell_script"
    return "shell_command" if normalized else "unknown"


secret = "token=TOP_SECRET_123 password=hunter2"
command = "am broadcast -a example.ACTION --es payload '%s'" % secret
kind = classify(command)
fingerprint = hashlib.sha256(command.encode("utf-8")).hexdigest()[:12]
log_line = "shell diag kind=%s cmd_len=%d fingerprint=%s" % (kind, len(command), fingerprint)
if secret in log_line or command in log_line:
    raise AssertionError("model log leaked command content")
if kind != "android_broadcast" or len(fingerprint) != 12:
    raise AssertionError("metadata model mismatch")

print("Shell log redaction verification passed")
