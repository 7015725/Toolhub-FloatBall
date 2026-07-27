// ToolHub Beta Phase 7A public API facade entry r1.
// Loads verified Phase 6 baseline, then the verified API facade and boundary lab.
// Rhino ES5 / ShortX.
(function () {
  var ENTRY_VERSION = "0.8.0-phase7-entry-r1";
  var SNAPSHOT = "e3fd7e7689150917702d56fb515a78e5f94dbb1b";
  var FILES = [
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/ToolHub-beta-phase6.js",
      sha256: "aed2e7b7e44f11a69ad921f6c6f7e142f27a819f13f56dec911d915322d782f4",
      maxBytes: 65536,
      name: "phase6-entry"
    },
    {
      url: "https://raw.githubusercontent.com/7015725/Toolhub-FloatBall/" + SNAPSHOT + "/beta/phase7/shortxui_api_facade_lab.js",
      sha256: "01e20885db44ed4f1607ae650cfc20cafa984863cd0489cc3c8d979b463dcec0",
      maxBytes: 65536,
      name: "phase7-api-facade"
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
      conn.setRequestProperty("User-Agent", "ShortX-ToolHub-Beta-Phase7-R1");
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
  try { writeLog("ToolHub Beta phase7 bootstrap reached entry=" + ENTRY_VERSION); } catch (eBaseLog) {}

  var facadeText = downloadVerified(FILES[1]);
  try { writeLog("ToolHub Beta phase7 API facade payload verified"); } catch (eFacadeLog) {}
  globalEval(String(facadeText));

  try {
    if (typeof ToolHubBetaPhase6 === "undefined" ||
        String(ToolHubBetaPhase6.VERSION || "") !== "0.7.6-beta-dex-minimal") {
      throw "ShortXUI Phase6 baseline verification failed";
    }
    if (typeof ToolHubBetaPhase7 === "undefined" ||
        String(ToolHubBetaPhase7.VERSION || "") !== "0.8.0-beta-api-facade" ||
        String(ToolHubBetaPhase7.API_VERSION || "") !== "0.3.0-beta" ||
        String(ToolHubBetaPhase7.PHASE || "") !== "7A") {
      throw "ShortXUI Phase7 API facade verification failed";
    }
    if (typeof ShortXUI === "undefined" ||
        String(ShortXUI.VERSION || "") !== "0.2.0" ||
        String(ShortXUI.API_VERSION || "") !== "0.3.0-beta" ||
        !ShortXUI.API || !ShortXUI.Errors || !ShortXUI.Lifecycle || !ShortXUI.Result) {
      throw "ShortXUI public API verification failed";
    }
    writeLog(
      "ToolHub Beta phase7 entry ready facade=" + String(ToolHubBetaPhase7.VERSION) +
      " api=" + String(ShortXUI.API_VERSION) +
      " runtime=" + String(ShortXUI.VERSION) +
      " phase4=" + String(ToolHubBetaPhase7.PHASE4_STATUS.code) +
      " entry=" + ENTRY_VERSION
    );
  } catch (eVerify) {
    throw "ToolHub Beta phase7 bootstrap failed: " + String(eVerify);
  }
  return baseResult;
}());
