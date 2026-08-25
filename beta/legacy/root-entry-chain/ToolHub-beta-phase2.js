// ToolHub Beta phase-2 test entry.
// Loads the verified mask hotfix entry, then verified WindowHost hardening parts.
// Rhino ES5 / ShortX.
(function () {
  var SNAPSHOT = "fc1d34bb1d4b5ae5004d2a51d7772bcd161b1070";
  var FILES = [
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/ToolHub-beta-hotfix.js",
      sha256: "ca9b12e221759183410b706c526de88f9442144d0988c67361c9d4f6b25d4f4a",
      maxBytes: 65536,
      name: "mask-hotfix-entry"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/phase2/shortxui_guard.js",
      sha256: "4d326726c37ac5d3b090867555bff2d0555ade985bff6d0bcbce9cd72a5cae0e",
      maxBytes: 32768,
      name: "shortxui-guard"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/phase2/windowhost_hardening.js",
      sha256: "14123bd32f721112677e2864c1f7d43eaadbce69c01577a6db70e8aced87e223",
      maxBytes: 32768,
      name: "windowhost-hardening"
    }
  ];

  function closeQuietly(resource) {
    try { if (resource) resource.close(); } catch (e) {}
  }

  function toHex(bytes) {
    var out = "";
    for (var i = 0; i < bytes.length; i++) {
      var value = Number(bytes[i]);
      if (value < 0) value += 256;
      var part = value.toString(16);
      if (part.length < 2) part = "0" + part;
      out += part;
    }
    return out;
  }

  function downloadVerified(spec) {
    var conn = null;
    var input = null;
    var output = null;
    try {
      conn = new java.net.URL(String(spec.url)).openConnection();
      conn.setConnectTimeout(12000);
      conn.setReadTimeout(20000);
      conn.setUseCaches(false);
      conn.setRequestProperty("Accept", "text/plain");
      conn.setRequestProperty("User-Agent", "ShortX-ToolHub-Beta-Phase2");
      input = conn.getInputStream();
      output = new java.io.ByteArrayOutputStream();
      var digest = java.security.MessageDigest.getInstance("SHA-256");
      var buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 8192);
      var total = 0;
      var count;
      while ((count = input.read(buffer)) !== -1) {
        if (count <= 0) continue;
        total += count;
        if (total > Number(spec.maxBytes || 65536)) throw String(spec.name) + " exceeds size limit";
        output.write(buffer, 0, count);
        digest.update(buffer, 0, count);
      }
      var actual = toHex(digest.digest());
      if (actual !== String(spec.sha256)) throw String(spec.name) + " SHA-256 mismatch: " + actual;
      return String(new java.lang.String(output.toByteArray(), "UTF-8"));
    } finally {
      closeQuietly(input);
      closeQuietly(output);
      try { if (conn && conn.disconnect) conn.disconnect(); } catch (eDisconnect) {}
    }
  }

  var scripts = [];
  for (var i = 0; i < FILES.length; i++) scripts.push(downloadVerified(FILES[i]));
  var globalEval = eval;
  var result = globalEval(String(scripts[0]));
  globalEval(String(scripts[1]));
  globalEval(String(scripts[2]));
  try { writeLog("ToolHub Beta phase2 entry ready snapshot=" + SNAPSHOT); } catch (eLog) {}
  return result;
}());
