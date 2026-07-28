// ToolHub Beta final one-pass acceptance entry r2.
// Loads verified final r1, then fixes physical back for the manual IME overlay and restores frozen diagnostics.
// Rhino ES5 / ShortX.
(function () {
  var ENTRY_VERSION = "0.9.1-beta-final-entry-r2";
  var SNAPSHOT = "c4e2d5831d20225863af4f83e908e5236c4e7c28";
  var FILES = [
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/ToolHub-beta-final.js",
      sha256: "264a0c67103e6db280e35f662419a7fbad85b5f1f4e96e00f452071f02b4f61e",
      maxBytes: 65536,
      name: "final-r1-entry"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/final/final_acceptance_r2_patch.js",
      sha256: "fa789136e3a0d1ac5534d5efab56f26dfdcf072b4a99f973d86ba18e4b242742",
      maxBytes: 65536,
      name: "final-r2-back-fix"
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
      conn.setRequestProperty("User-Agent", "ShortX-ToolHub-Beta-Final-R2");
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
  try { writeLog("ToolHub Beta final r2 bootstrap reached entry=" + ENTRY_VERSION); } catch (eBaseLog) {}

  var patchText = downloadVerified(FILES[1]);
  try { writeLog("ToolHub Beta final r2 back-fix payload verified"); } catch (ePatchLog) {}
  globalEval(String(patchText));

  try {
    if (typeof ToolHubBetaFinalAcceptance === "undefined" ||
        String(ToolHubBetaFinalAcceptance.VERSION || "") !== "0.9.0-beta-final-acceptance" ||
        String(ToolHubBetaFinalAcceptance.BACK_FIX_VERSION || "") !== "0.9.1-beta-final-back-fix" ||
        ToolHubBetaFinalAcceptance.MANUAL_IME_PHYSICAL_BACK !== true ||
        ToolHubBetaFinalAcceptance.TOOLAPP_BACK_REARM !== true ||
        ToolHubBetaFinalAcceptance.FROZEN_EVIDENCE_RECOVERY !== true) {
      throw "ShortXUI final r2 base/patch verification failed";
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
    if (typeof ShortXUI === "undefined" ||
        String(ShortXUI.VERSION || "") !== "0.2.0" ||
        String(ShortXUI.API_VERSION || "") !== "0.4.0-beta" ||
        !ShortXUI.API || !ShortXUI.ImeController || !ShortXUI.BackController) {
      throw "ShortXUI final r2 public API verification failed";
    }
    var dexCheck = ShortXUI.API.createDexBridge({});
    if (!dexCheck || dexCheck.ok !== false || String(dexCheck.code || "") !== "EXTERNAL_DEX_DISABLED") {
      throw "ShortXUI external DEX boundary verification failed";
    }
    writeLog(
      "ToolHub Beta final r2 entry ready version=" + String(ToolHubBetaFinalR2.VERSION) +
      " base=" + String(ToolHubBetaFinalR2.BASE_VERSION) +
      " api=" + String(ShortXUI.API_VERSION) +
      " runtime=" + String(ShortXUI.VERSION) +
      " manualImePhysicalBack=true" +
      " toolAppBackRearm=true" +
      " frozenEvidenceRecovery=true" +
      " imeBackPriority=" + String(ToolHubBetaFinalR2.IME_BACK_PRIORITY) +
      " dexExternal=false" +
      " entry=" + ENTRY_VERSION
    );
  } catch (eVerify) {
    throw "ToolHub Beta final r2 bootstrap failed: " + String(eVerify);
  }
  return baseResult;
}());
