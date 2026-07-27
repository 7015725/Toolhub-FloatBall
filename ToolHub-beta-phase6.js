// ToolHub Beta phase-6 DEX Bridge test entry r6.
// Loads verified Phase 5, the verified original Phase 6 bridge, then the verified DEX header repair patch.
// Rhino ES5 / ShortX.
(function () {
  var ENTRY_VERSION = "0.7.5-phase6-entry-r6";
  var SNAPSHOT = "36adfdaf4580432bc31cd105fa5b2c60838c3d87";
  var FILES = [
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/ToolHub-beta-phase5.js",
      sha256: "1ba7c2b4b53e29704e4041c25d6bc18b427ef0f47ebbcb2a61a5921d1b7b9809",
      maxBytes: 65536,
      name: "phase5-entry"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/phase6/dex_bridge_lab.js",
      sha256: "a0156fc34709db77e867306bb47293f757ab6ac31b950810e8384592f184a7e0",
      maxBytes: 131072,
      name: "dex-bridge-lab"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/phase6/dex_header_repair_patch.js",
      sha256: "3e2e2b8870de973b681ded0de6015157d983f85131adeadb50490eebb05d5d33",
      maxBytes: 65536,
      name: "dex-header-repair"
    }
  ];

  function closeQuietly(resource) {
    try { if (resource) resource.close(); } catch (e) {}
  }

  function toHex(bytes) {
    var out = "";
    var i;
    for (i = 0; i < bytes.length; i += 1) {
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
      conn.setRequestProperty("User-Agent", "ShortX-ToolHub-Beta-Phase6-R6");
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
  var root = this;
  var phase5Text = downloadVerified(FILES[0]);
  var baseResult = globalEval(String(phase5Text));
  try { writeLog("ToolHub Beta phase6 bootstrap reached entry=" + ENTRY_VERSION); } catch (ePhase5Log) {}

  var dexText = downloadVerified(FILES[1]);
  try { writeLog("ToolHub Beta phase6 original bridge payload verified"); } catch (eDexVerifyLog) {}
  var match = /var TEST_DEX_B64="([A-Za-z0-9+\/=]+)";/.exec(String(dexText));
  if (!match || !match[1] || match[1].length < 1000) {
    throw "ToolHub Beta phase6 verified DEX payload extraction failed";
  }
  root.ToolHubBetaPhase6OriginalDexB64 = String(match[1]);
  globalEval(String(dexText));

  var repairText = downloadVerified(FILES[2]);
  try { writeLog("ToolHub Beta phase6 DEX header repair payload verified"); } catch (eRepairVerifyLog) {}
  globalEval(String(repairText));

  try {
    if (typeof ToolHubBetaPhase5 === "undefined" ||
        String(ToolHubBetaPhase5.VERSION || "") !== "0.6.0-beta-canvas") {
      throw "ShortXUI Canvas phase5 baseline verification failed";
    }
    if (typeof ToolHubBetaPhase6 === "undefined" ||
        String(ToolHubBetaPhase6.VERSION || "") !== "0.7.5-beta-dex-header-repair" ||
        String(ToolHubBetaPhase6.REPAIR_VERSION || "") !== "0.7.5-beta-dex-header-repair") {
      throw "ShortXUI DEX header repair install verification failed";
    }
    writeLog(
      "ToolHub Beta phase6 entry ready version=" + String(ToolHubBetaPhase6.VERSION) +
      " phase5=" + String(ToolHubBetaPhase5.VERSION) +
      " snapshot=" + SNAPSHOT +
      " entry=" + ENTRY_VERSION
    );
  } catch (eVerify) {
    throw "ToolHub Beta phase6 bootstrap failed: " + String(eVerify);
  }
  return baseResult;
}());
