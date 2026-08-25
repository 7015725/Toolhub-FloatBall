// ToolHub Beta Phase 7B public FrameLoop + ReflectionBridge entry r2.
// Loads verified Phase 7A, then the verified public component exports and tests.
// Rhino ES5 / ShortX.
(function () {
  var ENTRY_VERSION = "0.8.2-phase7b-entry-r2";
  var SNAPSHOT = "956b06157f1ab8b7345b5869ab1cd1ed5ffa7f80";
  var FILES = [
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/ToolHub-beta-phase7.js",
      sha256: "d672fb5fdf6a199f21c411e022469253c712df739f5843bdd377d0b8365243c2",
      maxBytes: 65536,
      name: "phase7a-entry"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/phase7/shortxui_phase7b_components.js",
      sha256: "edc45892b9bcb467df736e42b926b1cec62e4680b6a0ba7550e7eda01d6ba8b6",
      maxBytes: 65536,
      name: "phase7b-components"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/phase7/phase7b_latest_reconcile_patch.js",
      sha256: "cb6d656917eea754b7d3066d0724fa27e87e88f91de64c43bb64f7c21db38f02",
      maxBytes: 16384,
      name: "phase7b-latest-reconcile"
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
      conn.setRequestProperty("User-Agent", "ShortX-ToolHub-Beta-Phase7B-R2");
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
  try { writeLog("ToolHub Beta phase7B bootstrap reached entry=" + ENTRY_VERSION); } catch (eBaseLog) {}

  var componentText = downloadVerified(FILES[1]);
  try { writeLog("ToolHub Beta phase7B component payload verified"); } catch (eComponentLog) {}
  globalEval(String(componentText));

  var reconcileText = downloadVerified(FILES[2]);
  try { writeLog("ToolHub Beta phase7B latest reconcile payload verified"); } catch (eReconcileLog) {}
  globalEval(String(reconcileText));

  try {
    if (typeof ToolHubBetaPhase7 === "undefined" ||
        String(ToolHubBetaPhase7.VERSION || "") !== "0.8.0-beta-api-facade" ||
        String(ToolHubBetaPhase7.API_VERSION || "") !== "0.3.0-beta") {
      throw "ShortXUI Phase7A verification failed";
    }
    if (typeof ToolHubBetaPhase7B === "undefined" ||
        String(ToolHubBetaPhase7B.VERSION || "") !== "0.8.1-beta-components" ||
        String(ToolHubBetaPhase7B.API_VERSION || "") !== "0.3.1-beta" ||
        String(ToolHubBetaPhase7B.FRAME_LOOP_VERSION || "") !== "1.0.0-beta" ||
        String(ToolHubBetaPhase7B.REFLECTION_BRIDGE_VERSION || "") !== "1.0.0-beta" ||
        ToolHubBetaPhase7B.EXTERNAL_DEX_PAYLOAD_ENABLED !== false ||
        String(ToolHubBetaPhase7B.LATEST_RECONCILE_VERSION || "") !== "0.8.2-beta-latest-reconcile") {
      throw "ShortXUI Phase7B component verification failed";
    }
    if (typeof ShortXUI === "undefined" ||
        String(ShortXUI.VERSION || "") !== "0.2.0" ||
        String(ShortXUI.API_VERSION || "") !== "0.3.1-beta" ||
        !ShortXUI.FrameLoop || !ShortXUI.ReflectionBridge ||
        !ShortXUI.API || typeof ShortXUI.API.createFrameLoop !== "function" ||
        typeof ShortXUI.API.createReflectionBridge !== "function") {
      throw "ShortXUI Phase7B public API verification failed";
    }
    var dexCheck = ShortXUI.API.createDexBridge({});
    if (!dexCheck || dexCheck.ok !== false || String(dexCheck.code || "") !== "EXTERNAL_DEX_DISABLED") {
      throw "ShortXUI external DEX boundary verification failed";
    }
    writeLog(
      "ToolHub Beta phase7B entry ready version=" + String(ToolHubBetaPhase7B.VERSION) +
      " api=" + String(ShortXUI.API_VERSION) +
      " runtime=" + String(ShortXUI.VERSION) +
      " frame=" + String(ToolHubBetaPhase7B.FRAME_LOOP_VERSION) +
      " reflection=" + String(ToolHubBetaPhase7B.REFLECTION_BRIDGE_VERSION) +
      " dexExternal=false" +
      " entry=" + ENTRY_VERSION
    );
  } catch (eVerify) {
    throw "ToolHub Beta phase7B bootstrap failed: " + String(eVerify);
  }
  return baseResult;
}());
