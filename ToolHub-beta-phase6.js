// ToolHub Beta phase-6 clean minimal DEX test entry r7.
// Loads verified Phase 5, verified reflection bridge UI, then verified fresh minimal DEX replacement.
// Rhino ES5 / ShortX.
(function () {
  var ENTRY_VERSION = "0.7.6-phase6-entry-r7";
  var SNAPSHOT = "dd75f1ca9dd7f53c8da95a41927f718dc5d4b9a4";
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
      name: "reflection-bridge-ui"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/phase6/dex_minimal_replacement.js",
      sha256: "420e79755b3af36ea9b310bdb8d05fdc48eb6d7fd17d9f8dcf81f4d85cf8550c",
      maxBytes: 65536,
      name: "minimal-dex-replacement"
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
      conn.setRequestProperty("User-Agent", "ShortX-ToolHub-Beta-Phase6-R7");
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

  var bridgeText = downloadVerified(FILES[1]);
  try { writeLog("ToolHub Beta phase6 reflection bridge UI verified"); } catch (eBridgeLog) {}
  globalEval(String(bridgeText));

  var minimalText = downloadVerified(FILES[2]);
  try { writeLog("ToolHub Beta phase6 fresh minimal DEX payload verified"); } catch (eMinimalLog) {}
  globalEval(String(minimalText));

  try {
    if (typeof ToolHubBetaPhase5 === "undefined" ||
        String(ToolHubBetaPhase5.VERSION || "") !== "0.6.0-beta-canvas") {
      throw "ShortXUI Canvas phase5 baseline verification failed";
    }
    if (typeof ToolHubBetaPhase6 === "undefined" ||
        String(ToolHubBetaPhase6.VERSION || "") !== "0.7.6-beta-dex-minimal" ||
        String(ToolHubBetaPhase6.MINIMAL_VERSION || "") !== "0.7.6-beta-dex-minimal" ||
        Number(ToolHubBetaPhase6.MINIMAL_DEX_BYTES || 0) !== 428 ||
        String(ToolHubBetaPhase6.MINIMAL_DEX_SHA256 || "") !== "bb69a0f675d7577f7f4a7f8d2162adfc22226f2c2889be740d166e6a645fb110") {
      throw "ShortXUI fresh minimal DEX install verification failed";
    }
    writeLog(
      "ToolHub Beta phase6 entry ready version=" + String(ToolHubBetaPhase6.VERSION) +
      " dexBytes=" + String(ToolHubBetaPhase6.MINIMAL_DEX_BYTES) +
      " phase5=" + String(ToolHubBetaPhase5.VERSION) +
      " snapshot=" + SNAPSHOT +
      " entry=" + ENTRY_VERSION
    );
  } catch (eVerify) {
    throw "ToolHub Beta phase6 bootstrap failed: " + String(eVerify);
  }
  return baseResult;
}());
