#!/usr/bin/env python3
"""临时应用 Content strict 与读写白名单拆分补丁。"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path, old, new, label):
    text = path.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit("missing patch anchor: %s in %s" % (label, path))
    if text.count(old) != 1:
        raise SystemExit("non-unique patch anchor: %s count=%d" % (label, text.count(old)))
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


content = ROOT / "code" / "th_08_content.js"
rebuild = ROOT / "code" / "th_12_rebuild.js"

replace_once(content, "// @version 1.0.1", "// @version 1.0.2", "content version")

old_security = '''// =======================【Content：安全审计】=======================
// 这段代码的主要内容/用途：为 ContentResolver 访问增加 audit / strict / off 三档安全模式。
// 默认 audit：只记录非 allowlist URI，不阻断旧按钮。
FloatBallAppWM.prototype.getContentSecurityMode = function() {
  var mode = "audit";
  try {
    if (this.config && this.config.CONTENT_SECURITY_MODE !== undefined && this.config.CONTENT_SECURITY_MODE !== null) {
      mode = String(this.config.CONTENT_SECURITY_MODE || "audit");
    }
  } catch (eMode) { mode = "audit"; }
  try { mode = mode.replace(/^\\s+|\\s+$/g, "").toLowerCase(); } catch (eTrim) { mode = "audit"; }
  if (mode !== "audit" && mode !== "strict" && mode !== "off") mode = "audit";
  return mode;
};

FloatBallAppWM.prototype.getContentUriAllowlist = function() {
  var raw = "content://settings/system/|content://settings/secure/|content://settings/global/";
  try {
    if (this.config && this.config.CONTENT_URI_ALLOWLIST !== undefined && this.config.CONTENT_URI_ALLOWLIST !== null) {
      raw = String(this.config.CONTENT_URI_ALLOWLIST || raw);
    }
  } catch (eAllow) {}
  return String(raw || "");
};

FloatBallAppWM.prototype.isContentUriAllowlisted = function(uriStr) {
  try {
    var uri = String(uriStr || "");
    if (!uri) return false;
    var raw = this.getContentUriAllowlist ? this.getContentUriAllowlist() : "";
    var parts = String(raw || "").split("|");
    for (var i = 0; i < parts.length; i++) {
      var p = String(parts[i] || "").replace(/^\\s+|\\s+$/g, "");
      if (!p) continue;
      if (uri.indexOf(p) === 0) return true;
    }
  } catch (e) {}
  return false;
};

FloatBallAppWM.prototype.checkContentUriSecurity = function(uriStr, modeName, btn) {
  var out = { ok: true, mode: "audit", allowed: false, uri: String(uriStr || ""), err: "" };
  try {
    out.mode = this.getContentSecurityMode ? this.getContentSecurityMode() : "audit";
    if (out.mode === "off") return out;

    out.allowed = this.isContentUriAllowlisted ? this.isContentUriAllowlisted(uriStr) : false;
    if (out.allowed) return out;

    var msg = "content uri not in allowlist mode=" + out.mode + " action=" + String(modeName || "") + " uri=" + String(uriStr || "");
    if (out.mode === "strict") {
      out.ok = false;
      out.err = msg;
      safeLog(this.L, 'e', msg);
      return out;
    }

    // audit：只记录，不阻断。
    safeLog(this.L, 'w', msg);
    return out;
  } catch (eSec) {
    out.ok = true;
    out.err = String(eSec);
    try { safeLog(this.L, 'w', "content security check failed compat allow err=" + String(eSec)); } catch(eLog) {}
  }
  return out;
};'''

new_security = '''// =======================【Content：安全策略】=======================
// 默认 strict：读取使用 CONTENT_URI_ALLOWLIST，写入使用独立的 CONTENT_WRITE_URI_ALLOWLIST。
// 写白名单默认留空，因此 put/update 默认拒绝；旧 audit 值按 strict 处理，兼容需显式 compat_audit。
FloatBallAppWM.prototype.getContentSecurityMode = function() {
  var mode = "strict";
  try {
    if (this.config && this.config.CONTENT_SECURITY_MODE !== undefined && this.config.CONTENT_SECURITY_MODE !== null) {
      mode = String(this.config.CONTENT_SECURITY_MODE || "strict");
    }
  } catch (eMode) { mode = "strict"; }
  try { mode = mode.replace(/^\\s+|\\s+$/g, "").toLowerCase(); } catch (eTrim) { mode = "strict"; }
  if (mode !== "compat_audit" && mode !== "off") mode = "strict";
  return mode;
};

FloatBallAppWM.prototype.getContentUriAllowlist = function() {
  var raw = "content://settings/system/|content://settings/secure/|content://settings/global/";
  try {
    if (this.config && this.config.CONTENT_URI_ALLOWLIST !== undefined && this.config.CONTENT_URI_ALLOWLIST !== null) {
      raw = String(this.config.CONTENT_URI_ALLOWLIST || raw);
    }
  } catch (eAllow) {}
  return String(raw || "");
};

FloatBallAppWM.prototype.getContentWriteUriAllowlist = function() {
  var raw = "";
  try {
    if (this.config && this.config.CONTENT_WRITE_URI_ALLOWLIST !== undefined && this.config.CONTENT_WRITE_URI_ALLOWLIST !== null) {
      raw = String(this.config.CONTENT_WRITE_URI_ALLOWLIST || "");
    }
  } catch (eAllow) {}
  return String(raw || "");
};

FloatBallAppWM.prototype.matchesContentUriAllowlist = function(uriStr, rawList) {
  try {
    var uri = String(uriStr || "");
    if (!uri) return false;
    var parts = String(rawList || "").split("|");
    for (var i = 0; i < parts.length; i++) {
      var p = String(parts[i] || "").replace(/^\\s+|\\s+$/g, "");
      if (!p) continue;
      if (uri.indexOf(p) === 0) return true;
    }
  } catch (e) {}
  return false;
};

FloatBallAppWM.prototype.isContentUriAllowlisted = function(uriStr) {
  var raw = this.getContentUriAllowlist ? this.getContentUriAllowlist() : "";
  return this.matchesContentUriAllowlist ? this.matchesContentUriAllowlist(uriStr, raw) : false;
};

FloatBallAppWM.prototype.isContentWriteUriAllowlisted = function(uriStr) {
  var raw = this.getContentWriteUriAllowlist ? this.getContentWriteUriAllowlist() : "";
  return this.matchesContentUriAllowlist ? this.matchesContentUriAllowlist(uriStr, raw) : false;
};

FloatBallAppWM.prototype.checkContentUriSecurity = function(uriStr, modeName, btn) {
  var out = { ok: true, mode: "strict", scope: "read", allowed: false, uri: String(uriStr || ""), err: "" };
  try {
    out.mode = this.getContentSecurityMode ? this.getContentSecurityMode() : "strict";
    if (out.mode === "off") return out;

    var action = "";
    try { action = String(modeName || "").replace(/^\\s+|\\s+$/g, "").toLowerCase(); } catch (eAction) { action = ""; }
    var isWrite = (action === "put" || action === "update" || action === "insert" || action === "delete");
    out.scope = isWrite ? "write" : "read";
    if (isWrite) out.allowed = this.isContentWriteUriAllowlisted ? this.isContentWriteUriAllowlisted(uriStr) : false;
    else out.allowed = this.isContentUriAllowlisted ? this.isContentUriAllowlisted(uriStr) : false;
    if (out.allowed) return out;

    var msg = "content uri not in " + out.scope + " allowlist mode=" + out.mode + " action=" + action + " uri=" + String(uriStr || "");
    if (out.mode === "compat_audit") {
      safeLog(this.L, 'w', msg);
      return out;
    }

    out.ok = false;
    out.err = msg;
    safeLog(this.L, 'e', msg);
    return out;
  } catch (eSec) {
    out.err = "content security check failed: " + String(eSec);
    if (out.mode === "compat_audit" || out.mode === "off") {
      out.ok = true;
      try { safeLog(this.L, 'w', out.err + " compat allow"); } catch(eLogCompat) {}
    } else {
      out.ok = false;
      try { safeLog(this.L, 'e', out.err + " fail closed"); } catch(eLogStrict) {}
    }
  }
  return out;
};'''
replace_once(content, old_security, new_security, "content security block")

replace_once(rebuild, "// @version 1.0.6", "// @version 1.0.7", "rebuild version")
replace_once(rebuild,
'''  putSchema("CONTENT_SECURITY_MODE", { type: "enum", values: ["off", "audit", "strict"], default: "audit" });
  putSchema("CONTENT_URI_ALLOWLIST", { type: "string", default: "content://settings/system/|content://settings/secure/|content://settings/global/" });''',
'''  putSchema("CONTENT_SECURITY_MODE", { type: "enum", values: ["strict", "compat_audit", "off"], default: "strict" });
  putSchema("CONTENT_URI_ALLOWLIST", { type: "string", default: "content://settings/system/|content://settings/secure/|content://settings/global/" });
  putSchema("CONTENT_WRITE_URI_ALLOWLIST", { type: "string", default: "" });''',
"content schema")
replace_once(rebuild,
'''  putDefault("CONTENT_SECURITY_MODE", "audit");
  putDefault("CONTENT_URI_ALLOWLIST", "content://settings/system/|content://settings/secure/|content://settings/global/");''',
'''  putDefault("CONTENT_SECURITY_MODE", "strict");
  putDefault("CONTENT_URI_ALLOWLIST", "content://settings/system/|content://settings/secure/|content://settings/global/");
  putDefault("CONTENT_WRITE_URI_ALLOWLIST", "");''',
"content defaults")

print("Content strict security patch applied")
