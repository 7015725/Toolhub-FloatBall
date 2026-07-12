#!/usr/bin/env python3
"""临时应用 Shell 命令诊断日志脱敏补丁。"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ACTION = ROOT / "code" / "th_11_action.js"
SHELL = ROOT / "code" / "th_10_shell.js"

action = ACTION.read_text(encoding="utf-8")
shell = SHELL.read_text(encoding="utf-8")

if "// @version 1.0.9" not in action:
    action = action.replace("// @version 1.0.8", "// @version 1.0.9", 1)
if "// @version 1.0.6" not in shell:
    shell = shell.replace("// @version 1.0.5", "// @version 1.0.6", 1)

start = action.find("FloatBallAppWM.prototype.getShellDiagPreviewText = function")
end = action.find("// =======================【WM 线程：按钮动作执行】", start)
if start < 0 or end < 0:
    raise SystemExit("cannot locate shell diagnostic section")

new_diag = r'''FloatBallAppWM.prototype.getShellDiagCommandMeta = function(cmdPlain, cmdB64) {
  var plain = "";
  var encoded = "";
  var source = "none";
  try { plain = cmdPlain ? String(cmdPlain) : ""; } catch(ePlain) { plain = ""; }
  try { encoded = cmdB64 ? String(cmdB64) : ""; } catch(eEncoded) { encoded = ""; }

  if (plain && plain.length > 0) {
    source = "cmd";
  } else if (encoded && encoded.length > 0) {
    source = "cmd_b64";
    if (typeof decodeBase64Utf8 === "function") {
      try { plain = String(decodeBase64Utf8(encoded) || ""); } catch(eDecode) { plain = ""; }
    }
  }

  var normalized = "";
  try { normalized = String(plain || "").replace(/[\r\n\t]+/g, " ").replace(/^\s+|\s+$/g, "").replace(/\s+/g, " "); } catch(eNormalize) { normalized = ""; }
  var lower = normalized.toLowerCase();
  var kind = "unknown";
  if (normalized.indexOf("am shortx run SHARED-DA-") >= 0) kind = "shortx_shared_da";
  else if (normalized.indexOf("am shortx run DA-") >= 0) kind = "shortx_private_da";
  else if (lower.indexOf("am shortx run ") === 0) kind = "shortx_action";
  else if (lower.indexOf("am broadcast ") === 0) kind = "android_broadcast";
  else if (lower.indexOf("am start ") === 0 || lower.indexOf("am startservice ") === 0) kind = "android_activity";
  else if (lower.indexOf("settings ") === 0 || lower.indexOf("cmd ") === 0 || lower.indexOf("pm ") === 0) kind = "android_cli";
  else if (lower.indexOf("sh ") === 0 || lower.indexOf("bash ") === 0 || lower.indexOf("su ") === 0) kind = "shell_script";
  else if (normalized.length > 0) kind = "shell_command";
  else if (encoded.length > 0) kind = "encoded_unknown";

  var fingerprint = "";
  try {
    var digestInput = plain && plain.length > 0 ? plain : encoded;
    if (digestInput && digestInput.length > 0) {
      var md = java.security.MessageDigest.getInstance("SHA-256");
      var bytes = md.digest(new java.lang.String(String(digestInput)).getBytes("UTF-8"));
      var hex = "";
      for (var i = 0; i < bytes.length; i++) {
        var n = Number(bytes[i]);
        if (n < 0) n += 256;
        var h = n.toString(16);
        if (h.length < 2) h = "0" + h;
        hex += h;
      }
      fingerprint = hex.substring(0, 12);
    }
  } catch(eDigest) { fingerprint = ""; }

  return {
    kind: kind,
    source: source,
    cmdLen: plain ? plain.length : 0,
    cmdB64Len: encoded ? encoded.length : 0,
    fingerprint: fingerprint
  };
};

// 兼容旧调用名，但只返回脱敏摘要，绝不返回命令正文。
FloatBallAppWM.prototype.getShellDiagPreviewText = function(cmdPlain, cmdB64) {
  var meta = this.getShellDiagCommandMeta(cmdPlain, cmdB64);
  return "[redacted kind=" + String(meta.kind || "unknown") +
    " source=" + String(meta.source || "none") +
    " len=" + String(meta.cmdLen || 0) +
    " sha256=" + String(meta.fingerprint || "") + "]";
};

FloatBallAppWM.prototype.logShellButtonDiagnostics = function(btn, idx) {
  try {
    var title = "";
    try { title = String(btn && btn.title ? btn.title : ""); } catch(eTitle) { title = ""; }
    var cmdB64 = "";
    var cmdPlain = "";
    try { cmdB64 = (btn && btn.cmd_b64 !== undefined && btn.cmd_b64 !== null) ? String(btn.cmd_b64) : ""; } catch(eB64) { cmdB64 = ""; }
    try { cmdPlain = (btn && btn.cmd !== undefined && btn.cmd !== null) ? String(btn.cmd) : ""; } catch(eCmd) { cmdPlain = ""; }

    var root = false;
    try {
      if (btn && btn.root !== undefined && btn.root !== null) {
        var rs = String(btn.root).replace(/^\s+|\s+$/g, "").toLowerCase();
        root = (rs === "true" || rs === "1" || rs === "yes" || rs === "on");
      }
    } catch(eRoot) { root = false; }

    var meta = this.getShellDiagCommandMeta ? this.getShellDiagCommandMeta(cmdPlain, cmdB64) : {
      kind: "unknown", source: "none", cmdLen: cmdPlain ? cmdPlain.length : 0,
      cmdB64Len: cmdB64 ? cmdB64.length : 0, fingerprint: ""
    };
    safeLog(this.L, 'i', "shell diag idx=" + String(idx) + " title=" + title + " root=" + String(root) +
      " kind=" + String(meta.kind || "unknown") + " source=" + String(meta.source || "none") +
      " cmd_len=" + String(meta.cmdLen || 0) + " cmd_b64_len=" + String(meta.cmdB64Len || 0) +
      " fingerprint=" + String(meta.fingerprint || ""));

    if (meta.kind === "shortx_shared_da") {
      safeLog(this.L, 'i', "shell diag shared-da idx=" + String(idx) + " title=" + title + " note=SHARED-DA is suitable for ToolHub invocation");
    } else if (meta.kind === "shortx_private_da") {
      safeLog(this.L, 'w', "shell diag private-da idx=" + String(idx) + " title=" + title + " note=private DA may not exist or may fail outside original ShortX rule");
    }
  } catch(eDiag) {
    try { safeLog(this.L, 'w', "shell diag fail idx=" + String(idx) + " err_type=diagnostic_exception"); } catch(eLog) {}
  }
};

'''
action = action[:start] + new_diag + action[end:]

old_fail = 'safeLog(this.L, \'e\',  "shell all failed cmd_b64_len=" + String(cmdB64 ? cmdB64.length : 0) + " ret=" + JSON.stringify(r || {}));'
new_fail = 'safeLog(this.L, \'e\', "shell all failed cmd_b64_len=" + String(cmdB64 ? cmdB64.length : 0) + " via=" + String(r && r.via ? r.via : "") + " action=" + String(r && r.action ? r.action : "") + " target=" + String(r && r.targetMode ? r.targetMode : "") + " mode=" + String(r && r.bridgeMode ? r.bridgeMode : "") + " err_type=" + String(r && r.err ? "broadcast_error" : "unknown"));'
if old_fail not in action:
    raise SystemExit("cannot locate shell all failed JSON log")
action = action.replace(old_fail, new_fail, 1)

old_result = 'safeLog(this.L, (ret && ret.ok) ? \'i\' : \'w\', "shell diag result ok=" + String(!!(ret && ret.ok)) + " via=" + via + " root=" + String(requestedRoot) + " cmd_b64_len=" + String(cmdB64 ? String(cmdB64).length : 0) + " ret=" + JSON.stringify(ret || {}));'
new_result = 'safeLog(this.L, (ret && ret.ok) ? \'i\' : \'w\', "shell diag result ok=" + String(!!(ret && ret.ok)) + " via=" + via + " root=" + String(requestedRoot) + " cmd_b64_len=" + String(cmdB64 ? String(cmdB64).length : 0) + " action=" + String(ret && ret.action ? ret.action : "") + " target=" + String(ret && ret.targetMode ? ret.targetMode : "") + " mode=" + String(ret && ret.bridgeMode ? ret.bridgeMode : "") + " token=" + String(!!(ret && ret.hasToken)) + " err_type=" + String(ret && ret.err ? "broadcast_error" : ""));'
if old_result not in shell:
    raise SystemExit("cannot locate shell result JSON log")
shell = shell.replace(old_result, new_result, 1)

for forbidden in (
    'preview=" + preview',
    '" ret=" + JSON.stringify(ret || {})',
    '" ret=" + JSON.stringify(r || {})',
):
    if forbidden in action or forbidden in shell:
        raise SystemExit("forbidden logging fragment remains: %s" % forbidden)

for required in (
    "getShellDiagCommandMeta",
    "[redacted kind=",
    "fingerprint=",
    'meta.kind === "shortx_shared_da"',
    'meta.kind === "shortx_private_da"',
):
    if required not in action:
        raise SystemExit("missing generated action marker: %s" % required)

ACTION.write_text(action, encoding="utf-8")
SHELL.write_text(shell, encoding="utf-8")
print("Shell command log redaction patch applied")
