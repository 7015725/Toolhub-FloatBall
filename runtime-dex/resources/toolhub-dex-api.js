// ToolHub DEX stable ABI adapter. Rhino ES5 only.
(function(global) {
  var API_VERSION = 1;
  var ADAPTER_VERSION = "0.9.2-beta-dex-api-1";

  function now() {
    return Number(java.lang.System.currentTimeMillis());
  }

  function text(value) {
    try { return String(value === null || value === undefined ? "" : value); }
    catch (e) { return ""; }
  }

  function app() {
    try {
      if (typeof TOOLHUB_ACTIVE_APP !== "undefined" && TOOLHUB_ACTIVE_APP) return TOOLHUB_ACTIVE_APP;
    } catch (e) {}
    return null;
  }

  function parseArgs(raw) {
    var source = text(raw).replace(/^\s+|\s+$/g, "");
    if (!source) return {};
    try {
      var parsed = JSON.parse(source);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      return { __parseError: text(e), __raw: source };
    }
  }

  function error(code, message, detail) {
    var out = {
      ok: false,
      code: text(code || "ERROR"),
      error: text(message || "unknown"),
      at: now()
    };
    if (detail !== undefined) out.detail = detail;
    return out;
  }

  function ok(code, extra) {
    var out = { ok: true, code: text(code || "OK"), at: now() };
    if (extra && typeof extra === "object") {
      for (var key in extra) {
        try {
          if (!extra.hasOwnProperty || extra.hasOwnProperty(key)) out[key] = extra[key];
        } catch (e) {}
      }
    }
    return out;
  }

  function log(one, level, message) {
    try {
      if (typeof safeLog === "function") safeLog(one && one.L, level || "i", "DEX_API " + text(message));
    } catch (e) {}
  }

  function status() {
    var one = app();
    var state = one && one.state ? one.state : null;
    var root = state ? state.ballRoot : null;
    var visibility = -1;
    try { if (root) visibility = Number(root.getVisibility()); } catch (eVisibility) {}
    return {
      ok: !!(one && state && state.closed !== true),
      code: one ? "STATUS" : "NOT_STARTED",
      apiVersion: API_VERSION,
      adapterVersion: ADAPTER_VERSION,
      runtimeVersion: text(typeof __toolHubDexRuntimeVersion !== "undefined" ? __toolHubDexRuntimeVersion : ""),
      runtimeSha256: text(typeof __toolHubDexRuntimeSha256 !== "undefined" ? __toolHubDexRuntimeSha256 : ""),
      runtimeStartedAt: Number(typeof __toolHubDexStartedAt !== "undefined" ? __toolHubDexStartedAt : 0),
      instancePresent: !!one,
      closing: !!(state && state.closing === true),
      closed: !!(state && state.closed === true),
      ballAttached: !!(state && state.addedBall === true && root),
      ballVisible: !!(root && visibility === android.view.View.VISIBLE),
      ballVisibility: visibility,
      mainPanelVisible: !!(state && state.addedPanel === true),
      settingsPanelVisible: !!(state && state.addedSettings === true),
      viewerPanelVisible: !!(state && state.addedViewer === true),
      toolAppActive: !!(state && state.toolAppActive === true),
      toolAppRoute: text(state && state.toolAppRoute),
      startupResult: text(typeof __toolHubDexStartupResult !== "undefined" ? __toolHubDexStartupResult : ""),
      at: now()
    };
  }

  function runOnWm(name, operation) {
    var one = app();
    if (!one || !one.state) return error("NOT_STARTED", "ToolHub instance is unavailable");
    if (one.state.closed === true || one.state.closing === true) {
      return error("INSTANCE_CLOSED", "ToolHub instance is closing or closed");
    }

    try {
      if (typeof one.isToolHubWmThread === "function" && one.isToolHubWmThread()) {
        var directValue = operation(one);
        return ok(name + "_DONE", { accepted: true, direct: true, value: directValue });
      }
    } catch (eDirect) {
      return error(name + "_FAILED", text(eDirect));
    }

    var task = function() {
      try {
        operation(one);
        log(one, "i", name + " completed");
      } catch (eRun) {
        log(one, "e", name + " failed: " + text(eRun));
      }
    };

    try {
      if (typeof one.postToToolHubWm === "function") {
        var postedByApi = one.postToToolHubWm(task);
        if (postedByApi) return ok(name + "_ACCEPTED", { accepted: true, direct: false });
      }
    } catch (ePostApi) {}

    try {
      if (one.state.h) {
        var posted = one.state.h.post(new java.lang.Runnable({ run: task }));
        if (posted) return ok(name + "_ACCEPTED", { accepted: true, direct: false });
      }
    } catch (ePost) {
      return error(name + "_POST_FAILED", text(ePost));
    }
    return error(name + "_POST_FAILED", "ToolHub WM handler is unavailable");
  }

  function show() {
    return runOnWm("SHOW", function(one) {
      var root = one.state.ballRoot;
      if (!root || one.state.addedBall !== true) throw "floating ball is not attached";
      root.setVisibility(android.view.View.VISIBLE);
      try { root.setAlpha(1.0); } catch (eAlpha) {}
      try { one.touchActivity(); } catch (eTouch) {}
      return true;
    });
  }

  function hide() {
    return runOnWm("HIDE", function(one) {
      try { if (typeof one.hideAllPanels === "function") one.hideAllPanels(); } catch (ePanels) {}
      var root = one.state.ballRoot;
      if (!root || one.state.addedBall !== true) throw "floating ball is not attached";
      root.setVisibility(android.view.View.GONE);
      return true;
    });
  }

  function toggle() {
    return runOnWm("TOGGLE", function(one) {
      var root = one.state.ballRoot;
      if (!root || one.state.addedBall !== true) throw "floating ball is not attached";
      var visible = Number(root.getVisibility()) === Number(android.view.View.VISIBLE);
      if (visible) {
        try { if (typeof one.hideAllPanels === "function") one.hideAllPanels(); } catch (ePanels) {}
        root.setVisibility(android.view.View.GONE);
      } else {
        root.setVisibility(android.view.View.VISIBLE);
        try { root.setAlpha(1.0); } catch (eAlpha) {}
        try { one.touchActivity(); } catch (eTouch) {}
      }
      return !visible;
    });
  }

  function stop() {
    var one = app();
    if (!one) return ok("ALREADY_STOPPED", { accepted: false });
    try {
      if (one.state && one.state.h) {
        var posted = one.state.h.post(new java.lang.Runnable({ run: function() {
          try { one.close(); } catch (eClose) { log(one, "e", "STOP failed: " + text(eClose)); }
        }}));
        if (posted) return ok("STOP_ACCEPTED", { accepted: true, direct: false });
      }
      one.close();
      return ok("STOP_DONE", { accepted: true, direct: true });
    } catch (e) {
      return error("STOP_FAILED", text(e));
    }
  }

  function openMain() {
    return runOnWm("OPEN_MAIN", function(one) {
      var root = one.state.ballRoot;
      if (root) root.setVisibility(android.view.View.VISIBLE);
      if (typeof one.showMainPanel !== "function") throw "showMainPanel is unavailable";
      one.showMainPanel();
      return true;
    });
  }

  function openRoute(args) {
    var route = text(args && args.route || "settings");
    return runOnWm("OPEN_ROUTE", function(one) {
      var root = one.state.ballRoot;
      if (root) root.setVisibility(android.view.View.VISIBLE);
      if (typeof one.showToolApp === "function") {
        one.showToolApp(route, true);
        return route;
      }
      if (route === "settings" && typeof one.showSettingsPanel === "function") {
        one.showSettingsPanel();
        return route;
      }
      throw "showToolApp is unavailable";
    });
  }

  function closePanels() {
    return runOnWm("CLOSE_PANELS", function(one) {
      if (typeof one.hideAllPanels !== "function") throw "hideAllPanels is unavailable";
      one.hideAllPanels();
      return true;
    });
  }

  function invoke(command, rawArgs) {
    var cmd = text(command).replace(/^\s+|\s+$/g, "").toLowerCase();
    var args = parseArgs(rawArgs);
    if (args.__parseError) return error("INVALID_JSON_ARGS", args.__parseError, { raw: args.__raw });
    if (cmd === "status") return status();
    if (cmd === "show") return show();
    if (cmd === "hide") return hide();
    if (cmd === "toggle") return toggle();
    if (cmd === "stop") return stop();
    if (cmd === "open_main") return openMain();
    if (cmd === "open_settings") return openRoute({ route: "settings" });
    if (cmd === "open_route") return openRoute(args);
    if (cmd === "close_panels") return closePanels();
    return error("UNKNOWN_COMMAND", "Unsupported DEX command: " + cmd, {
      supported: ["status", "show", "hide", "toggle", "stop", "open_main", "open_settings", "open_route", "close_panels"]
    });
  }

  global.ToolHubDexApi = {
    API_VERSION: API_VERSION,
    VERSION: ADAPTER_VERSION,
    invoke: invoke,
    status: status
  };
})(this);
