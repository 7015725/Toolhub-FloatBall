// ToolHub Beta final one-pass acceptance entry r3.
// Loads verified final r2, then routes all back/Home/recents dismiss paths through the manual IME overlay.
// Rhino ES5 / ShortX.
(function () {
  var ENTRY_VERSION = "0.9.2-beta-final-entry-r3";
  var SNAPSHOT = "aa1dd7454f20493f47099c5397d5b4e748290105";
  var FILES = [
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/ToolHub-beta-final.js",
      sha256: "806186f2b4a79c2f49bc7da3f061eea914576aa67e8cca196df5c4523fa1b0c5",
      maxBytes: 65536,
      name: "final-r2-entry"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/final/final_acceptance_r3_dismiss_patch.js",
      sha256: "4b2b3930f50e59066453e53303451495c198386d5539a1b4fa86aa1685f34722",
      maxBytes: 65536,
      name: "final-r3-dismiss-fix"
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
      conn.setRequestProperty("User-Agent", "ShortX-ToolHub-Beta-Final-R3");
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
  try { writeLog("ToolHub Beta final r3 bootstrap reached entry=" + ENTRY_VERSION); } catch (eBaseLog) {}

  var patchText = downloadVerified(FILES[1]);
  try { writeLog("ToolHub Beta final r3 dismiss-fix payload verified"); } catch (ePatchLog) {}
  globalEval(String(patchText));

  try {
    if (typeof ToolHubBetaFinalAcceptance === "undefined" ||
        String(ToolHubBetaFinalAcceptance.VERSION || "") !== "0.9.0-beta-final-acceptance" ||
        String(ToolHubBetaFinalAcceptance.BACK_FIX_VERSION || "") !== "0.9.1-beta-final-back-fix" ||
        ToolHubBetaFinalAcceptance.MANUAL_IME_PHYSICAL_BACK !== true ||
        ToolHubBetaFinalAcceptance.TOOLAPP_BACK_REARM !== true ||
        ToolHubBetaFinalAcceptance.FROZEN_EVIDENCE_RECOVERY !== true ||
        String(ToolHubBetaFinalAcceptance.DISMISS_FIX_VERSION || "") !== "0.9.2-beta-final-dismiss-fix" ||
        ToolHubBetaFinalAcceptance.IME_BACK_ROUTES_THROUGH_TOOLAPP !== true ||
        ToolHubBetaFinalAcceptance.IME_CLOSE_ON_HOME_RECENTS !== true ||
        ToolHubBetaFinalAcceptance.DIAGNOSTICS_RECONCILE_AFTER_IME !== true) {
      throw "ShortXUI final r3 base/patch verification failed";
    }
    if (typeof ToolHubBetaFinalR2 === "undefined" ||
        String(ToolHubBetaFinalR2.VERSION || "") !== "0.9.1-beta-final-back-fix" ||
        String(ToolHubBetaFinalR2.BASE_VERSION || "") !== "0.9.0-beta-final-acceptance" ||
        ToolHubBetaFinalR2.MANUAL_IME_PHYSICAL_BACK !== true ||
        ToolHubBetaFinalR2.TOOLAPP_BACK_REARM !== true ||
        ToolHubBetaFinalR2.FROZEN_EVIDENCE_RECOVERY !== true ||
        ToolHubBetaFinalR2.EXTERNAL_DEX_PAYLOAD_ENABLED !== false) {
      throw "ShortXUI final r2 verification failed";
    }
    if (typeof ToolHubBetaFinalR3 === "undefined" ||
        String(ToolHubBetaFinalR3.VERSION || "") !== "0.9.2-beta-final-dismiss-fix" ||
        String(ToolHubBetaFinalR3.BASE_VERSION || "") !== "0.9.1-beta-final-back-fix" ||
        ToolHubBetaFinalR3.IME_BACK_ROUTES_THROUGH_TOOLAPP !== true ||
        ToolHubBetaFinalR3.IME_CLOSE_ON_HOME_RECENTS !== true ||
        ToolHubBetaFinalR3.KEY_FALLBACK_ENABLED !== true ||
        ToolHubBetaFinalR3.DIAGNOSTICS_RECONCILE_AFTER_IME !== true ||
        ToolHubBetaFinalR3.EXTERNAL_DEX_PAYLOAD_ENABLED !== false) {
      throw "ShortXUI final r3 verification failed";
    }
    if (typeof ShortXUI === "undefined" ||
        String(ShortXUI.VERSION || "") !== "0.2.0" ||
        String(ShortXUI.API_VERSION || "") !== "0.4.0-beta" ||
        !ShortXUI.API || !ShortXUI.ImeController || !ShortXUI.BackController) {
      throw "ShortXUI final r3 public API verification failed";
    }
    var dexCheck = ShortXUI.API.createDexBridge({});
    if (!dexCheck || dexCheck.ok !== false || String(dexCheck.code || "") !== "EXTERNAL_DEX_DISABLED") {
      throw "ShortXUI external DEX boundary verification failed";
    }
    writeLog(
      "ToolHub Beta final r3 entry ready version=" + String(ToolHubBetaFinalR3.VERSION) +
      " base=" + String(ToolHubBetaFinalR3.BASE_VERSION) +
      " api=" + String(ShortXUI.API_VERSION) +
      " runtime=" + String(ShortXUI.VERSION) +
      " manualImePhysicalBack=true" +
      " backRoutesThroughToolApp=true" +
      " homeRecentsCloseIme=true" +
      " keyFallback=true" +
      " diagnosticsReconcile=true" +
      " dexExternal=false" +
      " entry=" + ENTRY_VERSION
    );
  } catch (eVerify) {
    throw "ToolHub Beta final r3 bootstrap failed: " + String(eVerify);
  }
  return baseResult;
}());
