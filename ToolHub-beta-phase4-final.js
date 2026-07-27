// ToolHub Beta Phase 4 final physical gesture/system-close evidence entry.
// Loads verified Phase 6 baseline, then the verified Phase 4 final probe.
// Rhino ES5 / ShortX.
(function () {
  var ENTRY_VERSION = "0.5.2-phase4-final-entry-r1";
  var SNAPSHOT = "9662311dc7f375bd41e20d8335e2d47c7c86fd81";
  var FILES = [
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/ToolHub-beta-phase6.js",
      sha256: "aed2e7b7e44f11a69ad921f6c6f7e142f27a819f13f56dec911d915322d782f4",
      maxBytes: 65536,
      name: "phase6-entry"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/phase4/gesture_final_probe.js",
      sha256: "aec4d409a08b555fa0f78ab4bd19a91f61533800480a5ac0976bbe7abf3c27b0",
      maxBytes: 65536,
      name: "gesture-final-probe"
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
      conn.setRequestProperty("User-Agent", "ShortX-ToolHub-Beta-Phase4-Final");
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
  var phase6Text = downloadVerified(FILES[0]);
  var baseResult = globalEval(String(phase6Text));
  try { writeLog("ToolHub Beta phase4 final bootstrap reached entry=" + ENTRY_VERSION); } catch (eBaseLog) {}

  var probeText = downloadVerified(FILES[1]);
  try { writeLog("ToolHub Beta phase4 final probe payload verified"); } catch (eProbeLog) {}
  globalEval(String(probeText));

  try {
    if (typeof ToolHubBetaPhase6 === "undefined" ||
        String(ToolHubBetaPhase6.VERSION || "") !== "0.7.6-beta-dex-minimal") {
      throw "ShortXUI Phase6 baseline verification failed";
    }
    if (typeof ToolHubBetaPhase4 === "undefined" ||
        String(ToolHubBetaPhase4.VERSION || "") !== "0.5.0-beta-gesture" ||
        String(ToolHubBetaPhase4.PATCH_VERSION || "") !== "0.5.1-beta-system-close") {
      throw "ShortXUI Phase4 baseline verification failed";
    }
    if (typeof ToolHubBetaPhase4Final === "undefined" ||
        String(ToolHubBetaPhase4Final.VERSION || "") !== "0.5.2-beta-gesture-final") {
      throw "ShortXUI Phase4 final probe install verification failed";
    }
    writeLog(
      "ToolHub Beta phase4 final entry ready version=" + String(ToolHubBetaPhase4Final.VERSION) +
      " phase6=" + String(ToolHubBetaPhase6.VERSION) +
      " snapshot=" + SNAPSHOT +
      " entry=" + ENTRY_VERSION
    );
  } catch (eVerify) {
    throw "ToolHub Beta phase4 final bootstrap failed: " + String(eVerify);
  }
  return baseResult;
}());
