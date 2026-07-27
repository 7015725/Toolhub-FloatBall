// ToolHub Beta phase-3 IME + Focus test entry.
// Loads verified Phase 2, then the verified isolated IME/Focus lab.
// Rhino ES5 / ShortX.
(function () {
  var SNAPSHOT = "ca967369e23b4a196f1094b6203a1847b4be4e75";
  var FILES = [
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/ToolHub-beta-phase2.js",
      sha256: "0946409f8c5753327ee12879dc80274c9b00ec64c8fa8d829e6393a2f0a3401d",
      maxBytes: 65536,
      name: "phase2-entry"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/phase3/ime_focus_lab.js",
      sha256: "2d8cc6cf5e6683003b4c2c371019e26eff69748011998d8c0273d8ec42c61bfa",
      maxBytes: 65536,
      name: "ime-focus-lab"
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
      conn.setRequestProperty("User-Agent", "ShortX-ToolHub-Beta-Phase3");
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
  var phase2Text = downloadVerified(FILES[0]);
  var baseResult = globalEval(String(phase2Text));
  var imeText = downloadVerified(FILES[1]);
  globalEval(String(imeText));

  try {
    if (typeof ToolHubBetaPhase3 === "undefined" ||
        String(ToolHubBetaPhase3.VERSION || "") !== "0.4.0-beta-ime") {
      throw "ShortXUI IME phase3 install verification failed";
    }
    writeLog("ToolHub Beta phase3 entry ready version=" + String(ToolHubBetaPhase3.VERSION));
  } catch (eVerify) {
    throw "ToolHub Beta phase3 bootstrap failed: " + String(eVerify);
  }
  return baseResult;
})();
