// ToolHub Beta Phase 7C real ToolApp route integration entry r1.
// Loads verified Phase 7B, then the verified route-owned lifecycle integration.
// Rhino ES5 / ShortX.
(function () {
  var ENTRY_VERSION = "0.8.3-phase7c-entry-r1";
  var SNAPSHOT = "69b93d1a9430f58c4bde53317d1c9465dc646ee7";
  var FILES = [
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/ToolHub-beta-phase7b.js",
      sha256: "68a9d58668a27ef628854c7f048a5ff42500e6342b73b9f9cfeb0d27a9747e9e",
      maxBytes: 65536,
      name: "phase7b-entry"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/phase7/shortxui_phase7c_route_integration.js",
      sha256: "90a68d1ead20fe08cd32414f125409b9ad7c193b750ea53ddead866da8557a42",
      maxBytes: 65536,
      name: "phase7c-route-integration"
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
      conn.setRequestProperty("User-Agent", "ShortX-ToolHub-Beta-Phase7C-R1");
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
      if (actual !== String(spec.sha256)) throw String(spec.name) + " SHA-256 mismatch: " + actual;
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
  try { writeLog("ToolHub Beta phase7C bootstrap reached entry=" + ENTRY_VERSION); } catch (eBaseLog) {}

  var integrationText = downloadVerified(FILES[1]);
  try { writeLog("ToolHub Beta phase7C route integration payload verified"); } catch (eIntegrationLog) {}
  globalEval(String(integrationText));

  try {
    if (typeof ToolHubBetaPhase7B === "undefined" ||
        String(ToolHubBetaPhase7B.VERSION || "") !== "0.8.1-beta-components" ||
        String(ToolHubBetaPhase7B.API_VERSION || "") !== "0.3.1-beta" ||
        String(ToolHubBetaPhase7B.FRAME_LOOP_VERSION || "") !== "1.0.0-beta") {
      throw "ShortXUI Phase7B verification failed";
    }
    if (typeof ToolHubBetaPhase7C === "undefined" ||
        String(ToolHubBetaPhase7C.VERSION || "") !== "0.8.3-beta-route-integration" ||
        String(ToolHubBetaPhase7C.API_VERSION || "") !== "0.3.1-beta" ||
        String(ToolHubBetaPhase7C.PHASE || "") !== "7C" ||
        String(ToolHubBetaPhase7C.TARGET_ROUTE || "") !== "shortx_ui_lab" ||
        ToolHubBetaPhase7C.ACTUAL_TOOL_APP_PAGE !== true ||
        ToolHubBetaPhase7C.AUTOMATIC_DETACH_DISPOSE !== true) {
      throw "ShortXUI Phase7C route integration verification failed";
    }
    if (typeof ShortXUI === "undefined" ||
        String(ShortXUI.VERSION || "") !== "0.2.0" ||
        String(ShortXUI.API_VERSION || "") !== "0.3.1-beta" ||
        !ShortXUI.API || !ShortXUI.FrameLoop || !ShortXUI.WindowHost || !ShortXUI.Scope) {
      throw "ShortXUI Phase7C public API verification failed";
    }
    var dexCheck = ShortXUI.API.createDexBridge({});
    if (!dexCheck || dexCheck.ok !== false || String(dexCheck.code || "") !== "EXTERNAL_DEX_DISABLED") {
      throw "ShortXUI external DEX boundary verification failed";
    }
    writeLog(
      "ToolHub Beta phase7C entry ready version=" + String(ToolHubBetaPhase7C.VERSION) +
      " route=" + String(ToolHubBetaPhase7C.TARGET_ROUTE) +
      " api=" + String(ShortXUI.API_VERSION) +
      " runtime=" + String(ShortXUI.VERSION) +
      " detachDispose=true" +
      " dexExternal=false" +
      " entry=" + ENTRY_VERSION
    );
  } catch (eVerify) {
    throw "ToolHub Beta phase7C bootstrap failed: " + String(eVerify);
  }
  return baseResult;
}());
