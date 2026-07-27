// ToolHub Beta phase-4 Gesture + system back test entry.
// Loads verified Phase 3, then the verified isolated Gesture/Back lab.
// Rhino ES5 / ShortX.
(function () {
  var SNAPSHOT = "b3cde8fa7b86a1fc0d382eab073eb9e47381db20";
  var FILES = [
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/ToolHub-beta-phase3.js",
      sha256: "4c850bb287ebc3bbad392936339aecd78e23146ac8615795e20cc0794f9edc6c",
      maxBytes: 65536,
      name: "phase3-entry"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/phase4/gesture_back_lab.js",
      sha256: "c2f04076270577c93f3753864d72747ab0eb955535078b0100f4b80779e3107b",
      maxBytes: 65536,
      name: "gesture-back-lab"
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
      conn.setRequestProperty("User-Agent", "ShortX-ToolHub-Beta-Phase4");
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
  var phase3Text = downloadVerified(FILES[0]);
  var baseResult = globalEval(String(phase3Text));
  var gestureText = downloadVerified(FILES[1]);
  globalEval(String(gestureText));

  try {
    if (typeof ToolHubBetaPhase4 === "undefined" ||
        String(ToolHubBetaPhase4.VERSION || "") !== "0.5.0-beta-gesture") {
      throw "ShortXUI Gesture phase4 install verification failed";
    }
    writeLog("ToolHub Beta phase4 entry ready version=" + String(ToolHubBetaPhase4.VERSION));
  } catch (eVerify) {
    throw "ToolHub Beta phase4 bootstrap failed: " + String(eVerify);
  }
  return baseResult;
}());
