#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError('%s anchor count=%d' % (label, count))
    return text.replace(old, new, 1)


def main():
    th14_path = ROOT / 'code' / 'th_14_panels.js'
    th14 = th14_path.read_text(encoding='utf-8')
    th14 = replace_once(th14, '// @version 1.1.2', '// @version 1.1.3', 'th14 version')
    old_hash = '''  function sha256Text(text) {
    var bytes = new java.lang.String(String(text || "")).getBytes("UTF-8");
    var md = java.security.MessageDigest.getInstance("SHA-256");
    md.update(bytes);
    var digest = md.digest();
    var out = "";
    for (var i = 0; i < digest.length; i++) {
      var v = Number(digest[i]);
      if (v < 0) v += 256;
      var h = java.lang.Integer.toHexString(v & 255);
      if (h.length < 2) h = "0" + h;
      out += h;
    }
    return out.toLowerCase();
  }
'''
    new_hash = '''  function sha256Text(text) {
    var bytes = new java.lang.String(String(text || "")).getBytes("UTF-8");
    var byteLength = Number(java.lang.reflect.Array.getLength(bytes));
    var md = java.security.MessageDigest.getInstance("SHA-256");
    md.update(bytes, 0, byteLength);
    var digest = md.digest();
    var digestLength = Number(java.lang.reflect.Array.getLength(digest));
    var out = new java.lang.StringBuilder(digestLength * 2);
    for (var i = 0; i < digestLength; i++) {
      var hex = java.lang.Integer.toHexString(0xFF & digest[i]);
      if (hex.length() === 1) out.append("0");
      out.append(hex);
    }
    return String(out.toString()).toLowerCase();
  }
'''
    th14 = replace_once(th14, old_hash, new_hash, 'th14 sha256Text')
    th14 = replace_once(
        th14,
        '        var actualSize = 0;\n        try {',
        '        var actualSize = 0;\n        var expectedHash = textValue(asset.sha256).toLowerCase();\n        var actualHash = "";\n        try {',
        'history hash variables',
    )
    th14 = replace_once(
        th14,
        '          if (numberValue(asset.size) > 0 && actualSize !== numberValue(asset.size)) throw "history size mismatch";\n          if (sha256Text(text) !== textValue(asset.sha256).toLowerCase()) throw "history sha256 mismatch";',
        '          if (numberValue(asset.size) > 0 && actualSize !== numberValue(asset.size)) throw "history size mismatch";\n          actualHash = sha256Text(text);\n          if (actualHash !== expectedHash) throw "history sha256 mismatch expected=" + expectedHash + " actual=" + actualHash + " expectedLen=" + expectedHash.length + " actualLen=" + actualHash.length;',
        'history hash comparison',
    )
    th14 = replace_once(
        th14,
        '          if (obj) safeLog(self.L, "i", "update history fetch done assetVersion=" + asset.version + " actualSize=" + actualSize + " generation=" + generation + " costMs=" + costMs);\n          else safeLog(self.L, "w", "update history fetch fail assetVersion=" + asset.version + " expectedSize=" + asset.size + " actualSize=" + actualSize + " generation=" + generation + " costMs=" + costMs + " error=" + error);',
        '          if (obj) safeLog(self.L, "i", "update history fetch done assetVersion=" + asset.version + " actualSize=" + actualSize + " actualHash=" + actualHash + " hashLen=" + actualHash.length + " generation=" + generation + " costMs=" + costMs);\n          else safeLog(self.L, "w", "update history fetch fail assetVersion=" + asset.version + " expectedSize=" + asset.size + " actualSize=" + actualSize + " expectedHash=" + expectedHash + " actualHash=" + actualHash + " expectedHashLen=" + expectedHash.length + " actualHashLen=" + actualHash.length + " generation=" + generation + " costMs=" + costMs + " error=" + error);',
        'history hash diagnostics',
    )
    th14 = replace_once(
        th14,
        '              self.state.toolHubUpdateHistoryError = error;\n              self.state.toolHubUpdateHistoryFailedAssetKey = assetKey;',
        '              self.state.toolHubUpdateHistoryError = error.indexOf("sha256 mismatch") >= 0 ? "更新记录校验失败，请重新检查" : error;\n              self.state.toolHubUpdateHistoryFailedAssetKey = assetKey;',
        'history friendly error',
    )
    th14_path.write_text(th14, encoding='utf-8')

    th03_path = ROOT / 'code' / 'th_03_icon.js'
    th03 = th03_path.read_text(encoding='utf-8')
    th03 = replace_once(th03, '// @version 2.0.1', '// @version 2.0.2', 'th03 version')
    old_hex = '''    store.bytesToHex = function(bytes) {
      var out = "";
      var len = this.byteArrayLength(bytes);
      for (var i = 0; i < len; i++) {
        var v = Number(bytes[i]);
        if (v < 0) v += 256;
        var h = java.lang.Integer.toHexString(v & 255);
        if (h.length < 2) h = "0" + h;
        out += String(h);
      }
      return out.toLowerCase();
    };
'''
    new_hex = '''    store.bytesToHex = function(bytes) {
      var len = this.byteArrayLength(bytes);
      var out = new java.lang.StringBuilder(len * 2);
      for (var i = 0; i < len; i++) {
        var hex = java.lang.Integer.toHexString(0xFF & bytes[i]);
        if (hex.length() === 1) out.append("0");
        out.append(hex);
      }
      return String(out.toString()).toLowerCase();
    };
'''
    th03 = replace_once(th03, old_hex, new_hex, 'th03 bytesToHex')
    th03_path.write_text(th03, encoding='utf-8')

    verify_path = ROOT / 'scripts' / 'verify_update_version_page.py'
    verify = verify_path.read_text(encoding='utf-8')
    verify = replace_once(
        verify,
        '    "历史加载诊断日志存在": "update history fetch begin" in TH14 and "update history fetch fail" in TH14 and "update history fetch done" in TH14,\n',
        '    "历史加载诊断日志存在": "update history fetch begin" in TH14 and "update history fetch fail" in TH14 and "update history fetch done" in TH14,\n    "历史 SHA256 固定输出 64 位": "hex.length() === 1" in TH14 and "new java.lang.StringBuilder(digestLength * 2)" in TH14 and "md.update(bytes, 0, byteLength)" in TH14,\n    "图标 SHA256 固定输出 64 位": "hex.length() === 1" in TH03 and "new java.lang.StringBuilder(len * 2)" in TH03,\n    "禁止 Java String length 属性误用": "h.length < 2" not in TH14 and "h.length < 2" not in TH03,\n    "历史哈希失败保留完整诊断": "expectedHashLen=" in TH14 and "actualHashLen=" in TH14,\n',
        'verifier sha checks',
    )
    verify_path.write_text(verify, encoding='utf-8')

    record = ROOT / 'updates' / 'records' / 'fix-sha256-hex-padding.json'
    record.write_text('''{
  "schema": 1,
  "id": "fix-sha256-hex-padding",
  "type": "fix",
  "title": "修复更新记录 SHA256 误判",
  "details": [
    "修复 Rhino 中 Java String 长度访问导致 SHA256 前导零丢失",
    "统一更新历史和图标 BLOB 哈希为固定 64 位十六进制编码",
    "增加历史哈希期望值、实际值和长度诊断日志",
    "更新记录校验失败时页面显示中文提示，完整技术信息保留在日志"
  ],
  "manifestVersion": 0
}
''', encoding='utf-8')

    print('SHA256 hex padding fix applied.')


if __name__ == '__main__':
    main()
