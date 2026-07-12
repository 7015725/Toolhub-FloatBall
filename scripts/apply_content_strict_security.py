#!/usr/bin/env python3
"""临时应用 Content strict 与读写白名单拆分补丁。"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
content_path = ROOT / "code" / "th_08_content.js"
rebuild_path = ROOT / "code" / "th_12_rebuild.js"
content = content_path.read_text(encoding="utf-8")
rebuild = rebuild_path.read_text(encoding="utf-8")

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
};

'''

if "// @version 1.0.2" not in content:
    content = content.replace("// @version 1.0.1", "// @version 1.0.2", 1)
start_candidates = [
    "// =======================【Content：安全审计】=======================",
    "// =======================【Content：安全策略】=======================",
]
start = -1
for marker in start_candidates:
    pos = content.find(marker)
    if pos >= 0:
        start = pos
        break
end_marker = "// =======================【Content：通用 query】======================="
end = content.find(end_marker)
if start < 0 or end < 0 or end <= start:
    raise SystemExit("missing content security section markers")
content = content[:start] + new_security + content[end:]
content_path.write_text(content, encoding="utf-8")

if "// @version 1.0.7" not in rebuild:
    rebuild = rebuild.replace("// @version 1.0.6", "// @version 1.0.7", 1)
rebuild = re.sub(
    r'^  putSchema\("CONTENT_SECURITY_MODE".*\r?$',
    '  putSchema("CONTENT_SECURITY_MODE", { type: "enum", values: ["strict", "compat_audit", "off"], default: "strict" });',
    rebuild,
    count=1,
    flags=re.M,
)
if 'putSchema("CONTENT_WRITE_URI_ALLOWLIST"' not in rebuild:
    rebuild = re.sub(
        r'(^  putSchema\("CONTENT_URI_ALLOWLIST".*\r?$)',
        r'\1\n  putSchema("CONTENT_WRITE_URI_ALLOWLIST", { type: "string", default: "" });',
        rebuild,
        count=1,
        flags=re.M,
    )
rebuild = re.sub(
    r'^  putDefault\("CONTENT_SECURITY_MODE".*\r?$',
    '  putDefault("CONTENT_SECURITY_MODE", "strict");',
    rebuild,
    count=1,
    flags=re.M,
)
if 'putDefault("CONTENT_WRITE_URI_ALLOWLIST"' not in rebuild:
    rebuild = re.sub(
        r'(^  putDefault\("CONTENT_URI_ALLOWLIST".*\r?$)',
        r'\1\n  putDefault("CONTENT_WRITE_URI_ALLOWLIST", "");',
        rebuild,
        count=1,
        flags=re.M,
    )

required_content = [
    '// @version 1.0.2',
    'var mode = "strict"',
    'CONTENT_WRITE_URI_ALLOWLIST',
    'compat_audit',
    'fail closed',
]
for token in required_content:
    if token not in content:
        raise SystemExit("generated content missing token: %s" % token)
required_rebuild = [
    '// @version 1.0.7',
    'values: ["strict", "compat_audit", "off"], default: "strict"',
    'putDefault("CONTENT_SECURITY_MODE", "strict")',
    'putSchema("CONTENT_WRITE_URI_ALLOWLIST"',
    'putDefault("CONTENT_WRITE_URI_ALLOWLIST", "")',
]
for token in required_rebuild:
    if token not in rebuild:
        raise SystemExit("generated rebuild missing token: %s" % token)

rebuild_path.write_text(rebuild, encoding="utf-8")
print("Content strict security patch applied")
