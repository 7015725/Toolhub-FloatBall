// ToolHub Beta phase-5 Canvas + frame lifecycle test entry.
// Loads verified Phase 4, then the verified isolated Canvas frame lab.
// Rhino ES5 / ShortX.
(function () {
  var ENTRY_VERSION = "0.6.0-phase5-entry-r1";
  var SNAPSHOT = "fb2e9efd2de538868bba5d53666985c2933efa8d";
  var FILES = [
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/ToolHub-beta-phase4.js",
      sha256: "9723f376dc2f91c74a1a7e41493f6144ec8d393cb5d208ca616575799472208d",
      maxBytes: 65536,
      name: "phase4-entry"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/phase5/canvas_frame_lab.js",
      sha256: "c9540ba3ff3171405e71b55599dae1cd35f507c445ac0b8c8009788f0f932de9",
      maxBytes: 131072,
      name: "canvas-frame-lab"
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
      conn.setRequestProperty("User-Agent", "ShortX-ToolHub-Beta-Phase5");
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
  var phase4Text = downloadVerified(FILES[0]);
  var baseResult = globalEval(String(phase4Text));
  try { writeLog("ToolHub Beta phase5 bootstrap reached entry=" + ENTRY_VERSION); } catch (ePhase4Log) {}

  var canvasText = downloadVerified(FILES[1]);
  try { writeLog("ToolHub Beta phase5 canvas payload verified"); } catch (eCanvasVerifyLog) {}
  globalEval(String(canvasText));

  try {
    if (typeof ToolHubBetaPhase4 === "undefined" ||
        String(ToolHubBetaPhase4.VERSION || "") !== "0.5.0-beta-gesture" ||
        String(ToolHubBetaPhase4.PATCH_VERSION || "") !== "0.5.1-beta-system-close") {
      throw "ShortXUI Gesture phase4 baseline verification failed";
    }
    if (typeof ToolHubBetaPhase5 === "undefined" ||
        String(ToolHubBetaPhase5.VERSION || "") !== "0.6.0-beta-canvas") {
      throw "ShortXUI Canvas phase5 install verification failed";
    }
    writeLog(
      "ToolHub Beta phase5 entry ready version=" + String(ToolHubBetaPhase5.VERSION) +
      " phase4Patch=" + String(ToolHubBetaPhase4.PATCH_VERSION) +
      " entry=" + ENTRY_VERSION
    );
  } catch (eVerify) {
    throw "ToolHub Beta phase5 bootstrap failed: " + String(eVerify);
  }
  return baseResult;
}());
