// ToolHub Beta Phase 4 final physical evidence entry r4.
// Loads verified r3, then switches predictive evidence to the actual ToolApp root window.
// Rhino ES5 / ShortX.
(function () {
  var ENTRY_VERSION = "0.5.5-phase4-final-entry-r4";
  var SNAPSHOT = "08209e6e3263b6336c066cc152f494baa2f2f6da";
  var FILES = [
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/ToolHub-beta-phase4-final.js",
      sha256: "847fad3aeb5303a3199e560dfac4221b813515a1a003b8ee7122a9aa45c9c113",
      maxBytes: 65536,
      name: "phase4-final-r3"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/phase4/gesture_toolapp_physical_probe.js",
      sha256: "68cd07b24c3aa2488a942790350a9f775284646b5f38c422fa25056b9afe62fc",
      maxBytes: 65536,
      name: "gesture-toolapp-physical"
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
      conn.setRequestProperty("User-Agent", "ShortX-ToolHub-Beta-Phase4-Final-R4");
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
  try { writeLog("ToolHub Beta phase4 final r4 bootstrap reached entry=" + ENTRY_VERSION); } catch (eBaseLog) {}

  var probeText = downloadVerified(FILES[1]);
  try { writeLog("ToolHub Beta phase4 actual ToolApp probe payload verified"); } catch (eProbeLog) {}
  globalEval(String(probeText));

  try {
    if (typeof ToolHubBetaPhase4Final === "undefined" ||
        String(ToolHubBetaPhase4Final.VERSION || "") !== "0.5.2-beta-gesture-final" ||
        String(ToolHubBetaPhase4Final.PHYSICAL_DISPATCH_VERSION || "") !== "0.5.3-beta-gesture-physical-dispatch" ||
        String(ToolHubBetaPhase4Final.ACTIVATION_PATCH_VERSION || "") !== "0.5.4-beta-gesture-final-activation" ||
        String(ToolHubBetaPhase4Final.TOOLAPP_PHYSICAL_VERSION || "") !== "0.5.5-beta-gesture-toolapp-physical" ||
        String(ToolHubBetaPhase4Final.PREDICTIVE_TARGET || "") !== "actual_tool_app_root") {
      throw "ShortXUI Phase4 actual ToolApp probe verification failed";
    }
    writeLog(
      "ToolHub Beta phase4 final r4 entry ready version=" +
      String(ToolHubBetaPhase4Final.TOOLAPP_PHYSICAL_VERSION) +
      " target=" + String(ToolHubBetaPhase4Final.PREDICTIVE_TARGET) +
      " homePolicy=" + String(ToolHubBetaPhase4Final.HOME_REASON_POLICY || "") +
      " entry=" + ENTRY_VERSION
    );
  } catch (eVerify) {
    throw "ToolHub Beta phase4 final r4 bootstrap failed: " + String(eVerify);
  }
  return baseResult;
}());
