// ToolHub Beta Phase 4 final physical gesture/system-close evidence entry r3.
// Loads verified r2 physical dispatch correction, then fixes final-case activation timing.
// Rhino ES5 / ShortX.
(function () {
  var ENTRY_VERSION = "0.5.4-phase4-final-entry-r3";
  var SNAPSHOT = "cb7a28b9c69c43940525f3b4fca580d55a6d8f59";
  var FILES = [
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/ToolHub-beta-phase4-final.js",
      sha256: "953b5aa212846f2c2a6b60f74c38616dcdbe8462e65ab7acc57ed94cafc07159",
      maxBytes: 65536,
      name: "phase4-final-r2"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/phase4/gesture_final_activation_patch.js",
      sha256: "6e2d2314afbacafdfebc952834d35de96ecca9ff4811c25769138c71fc0d1150",
      maxBytes: 65536,
      name: "gesture-final-activation"
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
      conn.setRequestProperty("User-Agent", "ShortX-ToolHub-Beta-Phase4-Final-R3");
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
  try { writeLog("ToolHub Beta phase4 final r3 bootstrap reached entry=" + ENTRY_VERSION); } catch (eBaseLog) {}

  var activationText = downloadVerified(FILES[1]);
  try { writeLog("ToolHub Beta phase4 final activation payload verified"); } catch (eActivationLog) {}
  globalEval(String(activationText));

  try {
    if (typeof ToolHubBetaPhase4Final === "undefined" ||
        String(ToolHubBetaPhase4Final.VERSION || "") !== "0.5.2-beta-gesture-final" ||
        String(ToolHubBetaPhase4Final.PHYSICAL_DISPATCH_VERSION || "") !== "0.5.3-beta-gesture-physical-dispatch" ||
        String(ToolHubBetaPhase4Final.ACTIVATION_PATCH_VERSION || "") !== "0.5.4-beta-gesture-final-activation" ||
        Number(ToolHubBetaPhase4Final.PHYSICAL_BACK_PRIORITY) !== 0) {
      throw "ShortXUI Phase4 final activation verification failed";
    }
    writeLog(
      "ToolHub Beta phase4 final r3 entry ready dispatch=" +
      String(ToolHubBetaPhase4Final.PHYSICAL_DISPATCH_VERSION) +
      " activation=" + String(ToolHubBetaPhase4Final.ACTIVATION_PATCH_VERSION) +
      " priority=" + String(ToolHubBetaPhase4Final.PHYSICAL_BACK_PRIORITY) +
      " entry=" + ENTRY_VERSION
    );
  } catch (eVerify) {
    throw "ToolHub Beta phase4 final r3 bootstrap failed: " + String(eVerify);
  }
  return baseResult;
}());
