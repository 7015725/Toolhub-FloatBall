// ToolHub Beta final one-pass acceptance entry r1.
// Loads verified Phase 7C r2, then public IME/Back controllers and final acceptance UI.
// Rhino ES5 / ShortX.
(function () {
  var ENTRY_VERSION = "0.9.0-beta-final-entry-r1";
  var SNAPSHOT = "a29c5fd801e98f75629fa18102df8b281b25ece0";
  var FILES = [
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/ToolHub-beta-phase7c.js",
      sha256: "a3b4e885169f5a7d07558bf99bc7a113c3d752ccda618196543ed1b90b67e55b",
      maxBytes: 65536,
      name: "phase7c-r2-entry"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/final/shortxui_final_acceptance.js",
      sha256: "30464789de843f43542559ea91e1dd6c5708b13deb1b57c43203ada79247e4f5",
      maxBytes: 131072,
      name: "final-acceptance"
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
      conn.setReadTimeout(30000);
      conn.setUseCaches(false);
      conn.setRequestProperty("Accept", "text/plain");
      conn.setRequestProperty("User-Agent", "ShortX-ToolHub-Beta-Final-R1");
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
  try { writeLog("ToolHub Beta final bootstrap reached entry=" + ENTRY_VERSION); } catch (eBaseLog) {}

  var finalText = downloadVerified(FILES[1]);
  try { writeLog("ToolHub Beta final acceptance payload verified"); } catch (eFinalLog) {}
  globalEval(String(finalText));

  try {
    if (typeof ToolHubBetaPhase7CR2 === "undefined" ||
        String(ToolHubBetaPhase7CR2.VERSION || "") !== "0.8.4-beta-route-lifecycle" ||
        ToolHubBetaPhase7CR2.STRICT_FRESH_WINDOW_CYCLES !== true) {
      throw "ShortXUI Phase7C r2 verification failed";
    }
    if (typeof ToolHubBetaFinalAcceptance === "undefined" ||
        String(ToolHubBetaFinalAcceptance.VERSION || "") !== "0.9.0-beta-final-acceptance" ||
        String(ToolHubBetaFinalAcceptance.API_VERSION || "") !== "0.4.0-beta" ||
        String(ToolHubBetaFinalAcceptance.IME_CONTROLLER_VERSION || "") !== "1.0.0-beta" ||
        String(ToolHubBetaFinalAcceptance.BACK_CONTROLLER_VERSION || "") !== "1.0.0-beta" ||
        ToolHubBetaFinalAcceptance.SINGLE_AUTOMATED_RUN !== true ||
        ToolHubBetaFinalAcceptance.SINGLE_MANUAL_ROUND !== true ||
        ToolHubBetaFinalAcceptance.EXTERNAL_DEX_PAYLOAD_ENABLED !== false) {
      throw "ShortXUI final acceptance verification failed";
    }
    if (typeof ShortXUI === "undefined" ||
        String(ShortXUI.VERSION || "") !== "0.2.0" ||
        String(ShortXUI.API_VERSION || "") !== "0.4.0-beta" ||
        !ShortXUI.API || !ShortXUI.ImeController || !ShortXUI.BackController ||
        typeof ShortXUI.API.createImeController !== "function" ||
        typeof ShortXUI.API.createBackController !== "function") {
      throw "ShortXUI final public API verification failed";
    }
    var dexCheck = ShortXUI.API.createDexBridge({});
    if (!dexCheck || dexCheck.ok !== false || String(dexCheck.code || "") !== "EXTERNAL_DEX_DISABLED") {
      throw "ShortXUI external DEX boundary verification failed";
    }
    writeLog(
      "ToolHub Beta final entry ready version=" + String(ToolHubBetaFinalAcceptance.VERSION) +
      " api=" + String(ShortXUI.API_VERSION) +
      " runtime=" + String(ShortXUI.VERSION) +
      " ime=" + String(ToolHubBetaFinalAcceptance.IME_CONTROLLER_VERSION) +
      " back=" + String(ToolHubBetaFinalAcceptance.BACK_CONTROLLER_VERSION) +
      " singleAutomatedRun=true singleManualRound=true dexExternal=false" +
      " entry=" + ENTRY_VERSION
    );
  } catch (eVerify) {
    throw "ToolHub Beta final bootstrap failed: " + String(eVerify);
  }
  return baseResult;
}());
