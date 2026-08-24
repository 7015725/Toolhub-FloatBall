// ToolHub Beta Phase 7C lifecycle closure entry r2.
// Loads verified Phase 7C r1, then reconciles lifecycle snapshots and strict fresh-window stress.
// Rhino ES5 / ShortX.
(function () {
  var ENTRY_VERSION = "0.8.4-phase7c-entry-r2";
  var SNAPSHOT = "3a42490c626fbbc81433fa9833ed309f40f50371";
  var FILES = [
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/ToolHub-beta-phase7c.js",
      sha256: "a4c66b5c6583b4ab94e01c8cd03935d5379dd9aaf9bb03741797ece3c7ac3b7e",
      maxBytes: 65536,
      name: "phase7c-r1-entry"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/phase7/phase7c_lifecycle_r2_patch.js",
      sha256: "75db56adc2cb37bc4c566a510eafe5963882ce73fcf55f091a92bcf127b8f63f",
      maxBytes: 65536,
      name: "phase7c-lifecycle-r2"
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
      conn.setRequestProperty("User-Agent", "ShortX-ToolHub-Beta-Phase7C-R2");
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
  try { writeLog("ToolHub Beta phase7C r2 bootstrap reached entry=" + ENTRY_VERSION); } catch (eBaseLog) {}

  var patchText = downloadVerified(FILES[1]);
  try { writeLog("ToolHub Beta phase7C lifecycle r2 payload verified"); } catch (ePatchLog) {}
  globalEval(String(patchText));

  try {
    if (typeof ToolHubBetaPhase7C === "undefined" ||
        String(ToolHubBetaPhase7C.VERSION || "") !== "0.8.3-beta-route-integration" ||
        String(ToolHubBetaPhase7C.LIFECYCLE_PATCH_VERSION || "") !== "0.8.4-beta-route-lifecycle" ||
        ToolHubBetaPhase7C.DISPOSED_ATTACHED_FALSE !== true ||
        ToolHubBetaPhase7C.STRICT_FRESH_WINDOW_CYCLES !== true) {
      throw "ShortXUI Phase7C base/patch verification failed";
    }
    if (typeof ToolHubBetaPhase7CR2 === "undefined" ||
        String(ToolHubBetaPhase7CR2.VERSION || "") !== "0.8.4-beta-route-lifecycle" ||
        String(ToolHubBetaPhase7CR2.BASE_VERSION || "") !== "0.8.3-beta-route-integration" ||
        String(ToolHubBetaPhase7CR2.TARGET_ROUTE || "") !== "shortx_ui_lab" ||
        ToolHubBetaPhase7CR2.DISPOSED_ATTACHED_FALSE !== true ||
        ToolHubBetaPhase7CR2.STRICT_FRESH_WINDOW_CYCLES !== true ||
        Number(ToolHubBetaPhase7CR2.STRESS_CYCLES) !== 10) {
      throw "ShortXUI Phase7C r2 verification failed";
    }
    if (typeof ShortXUI === "undefined" ||
        String(ShortXUI.VERSION || "") !== "0.2.0" ||
        String(ShortXUI.API_VERSION || "") !== "0.3.1-beta" ||
        !ShortXUI.API || !ShortXUI.FrameLoop || !ShortXUI.WindowHost || !ShortXUI.Scope) {
      throw "ShortXUI Phase7C r2 public API verification failed";
    }
    var dexCheck = ShortXUI.API.createDexBridge({});
    if (!dexCheck || dexCheck.ok !== false || String(dexCheck.code || "") !== "EXTERNAL_DEX_DISABLED") {
      throw "ShortXUI external DEX boundary verification failed";
    }
    writeLog(
      "ToolHub Beta phase7C r2 entry ready version=" + String(ToolHubBetaPhase7CR2.VERSION) +
      " base=" + String(ToolHubBetaPhase7CR2.BASE_VERSION) +
      " route=" + String(ToolHubBetaPhase7CR2.TARGET_ROUTE) +
      " strictFreshWindowCycles=true" +
      " disposedAttachedFalse=true" +
      " api=" + String(ShortXUI.API_VERSION) +
      " runtime=" + String(ShortXUI.VERSION) +
      " dexExternal=false" +
      " entry=" + ENTRY_VERSION
    );
  } catch (eVerify) {
    throw "ToolHub Beta phase7C r2 bootstrap failed: " + String(eVerify);
  }
  return baseResult;
}());
