// ToolHub Beta phase-6 DEX Bridge + reflection boundary test entry.
// Loads verified Phase 5, then the verified guarded DEX/reflection bridge lab.
// Rhino ES5 / ShortX.
(function () {
  var ENTRY_VERSION = "0.7.1-phase6-entry-r2";
  var SNAPSHOT = "3bc92a4254f34a559246a7fed08713bf9e5c81b1";
  var FILES = [
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/ToolHub-beta-phase5.js",
      sha256: "1ba7c2b4b53e29704e4041c25d6bc18b427ef0f47ebbcb2a61a5921d1b7b9809",
      maxBytes: 65536,
      name: "phase5-entry"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/phase6/dex_bridge_lab.js",
      sha256: "f6adef80702896820ccffb7f6b8cc2e847bfa08f97eacd4ece790027f721382a",
      maxBytes: 131072,
      name: "dex-bridge-lab"
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
      conn.setReadTimeout(25000);
      conn.setUseCaches(false);
      conn.setRequestProperty("Accept", "text/plain");
      conn.setRequestProperty("User-Agent", "ShortX-ToolHub-Beta-Phase6");
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
      if (actual !== String(spec.sha256)) {
        throw String(spec.name) + " SHA-256 mismatch: " + actual;
      }
      return String(new java.lang.String(output.toByteArray(), "UTF-8"));
    } finally {
      closeQuietly(input);
      closeQuietly(output);
      try { if (conn && conn.disconnect) conn.disconnect(); } catch (eDisconnect) {}
    }
  }

  var globalEval = eval;
  var phase5Text = downloadVerified(FILES[0]);
  var baseResult = globalEval(String(phase5Text));
  try { writeLog("ToolHub Beta phase6 bootstrap reached entry=" + ENTRY_VERSION); } catch (ePhase5Log) {}

  var dexText = downloadVerified(FILES[1]);
  try { writeLog("ToolHub Beta phase6 DEX bridge payload verified"); } catch (eDexVerifyLog) {}
  globalEval(String(dexText));

  try {
    if (typeof ToolHubBetaPhase5 === "undefined" ||
        String(ToolHubBetaPhase5.VERSION || "") !== "0.6.0-beta-canvas") {
      throw "ShortXUI Canvas phase5 baseline verification failed";
    }
    if (typeof ToolHubBetaPhase6 === "undefined" ||
        String(ToolHubBetaPhase6.VERSION || "") !== "0.7.1-beta-dex-payload") {
      throw "ShortXUI DEX bridge phase6 install verification failed";
    }
    writeLog(
      "ToolHub Beta phase6 entry ready version=" + String(ToolHubBetaPhase6.VERSION) +
      " phase5=" + String(ToolHubBetaPhase5.VERSION) +
      " entry=" + ENTRY_VERSION
    );
  } catch (eVerify) {
    throw "ToolHub Beta phase6 bootstrap failed: " + String(eVerify);
  }
  return baseResult;
}());
