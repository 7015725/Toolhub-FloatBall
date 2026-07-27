// ToolHub Beta Phase 4 final physical gesture/system-close evidence entry r2.
// Loads verified Phase 4 final r1, then the ColorOS physical back dispatch correction.
// Rhino ES5 / ShortX.
(function () {
  var ENTRY_VERSION = "0.5.3-phase4-final-entry-r2";
  var SNAPSHOT = "c73f6ffc16c2ea0cd73e38f05c21be00b0507cde";
  var FILES = [
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/ToolHub-beta-phase4-final.js",
      sha256: "2d43823d91f3ebee78fa0ef362b102bcdaadf0cbe008dbafced79c3339c99aea",
      maxBytes: 65536,
      name: "phase4-final-r1"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/phase4/gesture_physical_dispatch_patch.js",
      sha256: "ad65f9a21eeb8a56ec6545f23c7e1c4be7dc47d517acbea1a790ef70c9e21112",
      maxBytes: 65536,
      name: "gesture-physical-dispatch"
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
      conn.setRequestProperty("User-Agent", "ShortX-ToolHub-Beta-Phase4-Final-R2");
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
  var baseText = downloadVerified(FILES[0]);
  var baseResult = globalEval(String(baseText));
  try { writeLog("ToolHub Beta phase4 final r2 bootstrap reached entry=" + ENTRY_VERSION); } catch (eBaseLog) {}

  var patchText = downloadVerified(FILES[1]);
  try { writeLog("ToolHub Beta phase4 physical dispatch payload verified"); } catch (ePatchLog) {}
  globalEval(String(patchText));

  try {
    if (typeof ToolHubBetaPhase4Final === "undefined" ||
        String(ToolHubBetaPhase4Final.VERSION || "") !== "0.5.2-beta-gesture-final" ||
        String(ToolHubBetaPhase4Final.PHYSICAL_DISPATCH_VERSION || "") !== "0.5.3-beta-gesture-physical-dispatch" ||
        Number(ToolHubBetaPhase4Final.PHYSICAL_BACK_PRIORITY) !== 0) {
      throw "ShortXUI Phase4 physical dispatch correction verification failed";
    }
    writeLog(
      "ToolHub Beta phase4 final r2 entry ready version=" +
      String(ToolHubBetaPhase4Final.PHYSICAL_DISPATCH_VERSION) +
      " priority=" + String(ToolHubBetaPhase4Final.PHYSICAL_BACK_PRIORITY) +
      " entry=" + ENTRY_VERSION
    );
  } catch (eVerify) {
    throw "ToolHub Beta phase4 final r2 bootstrap failed: " + String(eVerify);
  }
  return baseResult;
}());
