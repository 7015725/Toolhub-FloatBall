// ToolHub - 入口文件 (加载子模块并执行)
// 将本文件放入 ShortX 任务，th_*.js 放入 ShortX 数据根目录/ToolHub/code/ 文件夹

function loadScript(relPath) {
    try {
        var base = shortx.getShortXDir();
        var f = new java.io.File(base + "/ToolHub/code/" + relPath);
        if (!f.exists()) {
            throw "Not found: " + f.getAbsolutePath();
        }
        var r = new java.io.BufferedReader(new java.io.InputStreamReader(
            new java.io.FileInputStream(f), "UTF-8"));
        var sb = new java.lang.StringBuilder();
        var line;
        while ((line = r.readLine()) != null) {
            sb.append(line).append("\n");
        }
        r.close();
        var geval = eval;
        geval(String(sb.toString()));
    } catch(e) {
        throw "loadScript(" + relPath + ") failed: " + e;
    }
}

loadScript("th_1_base.js");
loadScript("th_2_core.js");
loadScript("th_3_panels.js");
loadScript("th_4_extra.js");
loadScript("th_5_entry.js");

var __out = (function() {
  var entryInfo = getProcessInfo("entry");
  var logger = new ToolHubLogger(entryInfo);
  installCrashHandler(logger);
  var app = new FloatBallAppWM(logger);
  var closeRule = String(app.config.ACTION_CLOSE_ALL_RULE || "shortx.wm.floatball.CLOSE");
  var startRet = null;

  try {
    startRet = app.startAsync(entryInfo, closeRule);
  } catch (eTop) {
    try { logger.fatal("TOP startAsync crash err=" + String(eTop)); } catch (eLog) {}
    startRet = { ok: false, err: String(eTop) };
  }

  function optStr(v) {
    return (v === undefined || v === null) ? "" : String(v);
  }

  var out = {
    ok: true,
    started: startRet && startRet.ok,
    msg: optStr(startRet && startRet.msg),
    closeAction: optStr(startRet && startRet.closeAction),
    layout: startRet && startRet.layout || null
  };

  if (!out.started) {
    out.err = optStr(startRet && startRet.err);
  }

  return out;
})();

JSON.stringify(__out);
