// ToolHub Beta Phase 4 final-case activation correction. Rhino ES5.
(function (global) {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
  if (!global.ToolHubBetaPhase4Final ||
      String(global.ToolHubBetaPhase4Final.VERSION || "") !== "0.5.2-beta-gesture-final" ||
      String(global.ToolHubBetaPhase4Final.PHYSICAL_DISPATCH_VERSION || "") !== "0.5.3-beta-gesture-physical-dispatch") return;

  var proto = FloatBallAppWM.prototype;
  if (proto.__toolHubShortXUiGestureFinalActivation054Installed === true) return;

  var VERSION = "0.5.4-beta-gesture-final-activation";
  var RETRY_MS = 120;
  var RETRY_LIMIT = 10;

  function errorText(error) {
    try {
      if (global.ShortXUI && global.ShortXUI.Core && global.ShortXUI.Core.errorText) {
        return String(global.ShortXUI.Core.errorText(error));
      }
    } catch (e0) {}
    try { return String(error); } catch (e1) { return "unknown"; }
  }

  function log(app, level, message) {
    try { safeLog(app && app.L, level || "i", String(message || "")); } catch (e) {}
  }

  function activeCaseName(app) {
    try {
      var report = app && app.state ? app.state.shortXUiGestureFinalReport : null;
      return report ? String(report.activeCase || "") : "";
    } catch (e) {}
    return "";
  }

  function isActivated(session) {
    return !!(session &&
      session.__physicalDefaultPriorityBound === true &&
      Number(session.callbackPriority || 0) === 0 &&
      (String(session.callbackType || "") === "animation_default" ||
       String(session.callbackType || "") === "invoked_default") &&
      session.__physicalProbeOutsideSuppressed === true);
  }

  function activate(app, expectedSession, attempt) {
    var session = null;
    try { session = app && app.state ? app.state.shortXUiGestureSession : null; } catch (e0) { session = null; }
    if (!session || session !== expectedSession || session.cancelled === true) return false;
    if (!activeCaseName(app)) return false;

    if (isActivated(session)) {
      log(app, "i",
        "GESTURE_FINAL_PHYSICAL_ACTIVATED case=" + activeCaseName(app) +
        " type=" + String(session.callbackType || "") +
        " priority=" + String(session.callbackPriority || 0) +
        " outsideSuppressed=true attempt=" + String(attempt || 0));
      return true;
    }

    try {
      if (typeof app.refreshShortXUiGestureState === "function") {
        app.refreshShortXUiGestureState();
      }
    } catch (eRefresh) {
      log(app, "w", "GESTURE_FINAL_PHYSICAL_REFRESH_FAILED error=" + errorText(eRefresh));
    }

    if (isActivated(session)) {
      log(app, "i",
        "GESTURE_FINAL_PHYSICAL_ACTIVATED case=" + activeCaseName(app) +
        " type=" + String(session.callbackType || "") +
        " priority=" + String(session.callbackPriority || 0) +
        " outsideSuppressed=true attempt=" + String(attempt || 0));
      return true;
    }

    if (Number(attempt || 0) + 1 >= RETRY_LIMIT) {
      log(app, "e",
        "GESTURE_FINAL_PHYSICAL_ACTIVATION_FAILED case=" + activeCaseName(app) +
        " type=" + String(session.callbackType || "") +
        " priority=" + String(session.callbackPriority || 0) +
        " outsideSuppressed=" + String(session.__physicalProbeOutsideSuppressed === true));
      return false;
    }

    try {
      var handler = new android.os.Handler(android.os.Looper.getMainLooper());
      handler.postDelayed(new java.lang.Runnable({
        run: function () {
          activate(app, expectedSession, Number(attempt || 0) + 1);
        }
      }), RETRY_MS);
      return true;
    } catch (eSchedule) {
      log(app, "e", "GESTURE_FINAL_PHYSICAL_ACTIVATION_SCHEDULE_FAILED error=" + errorText(eSchedule));
    }
    return false;
  }

  var oldStart = proto.startShortXUiGestureFinalCase;
  if (typeof oldStart === "function") {
    proto.startShortXUiGestureFinalCase = function (name) {
      var result = oldStart.apply(this, arguments);
      try {
        if (result && result.ok === true) {
          var session = this.state ? this.state.shortXUiGestureSession : null;
          if (session) activate(this, session, 0);
        }
      } catch (eActivate) {
        log(this, "e", "GESTURE_FINAL_PHYSICAL_START_PATCH_FAILED error=" + errorText(eActivate));
      }
      return result;
    };
  }

  global.ToolHubBetaPhase4Final.ACTIVATION_PATCH_VERSION = VERSION;
  proto.__toolHubShortXUiGestureFinalActivation054Installed = true;
  try { writeLog("ShortXUI Gesture final activation patch installed version=" + VERSION); } catch (eLog) {}
}(function () { return this; }()));
