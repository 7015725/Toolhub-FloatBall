// ToolHub Beta Phase4 system-dialog close deadlock patch. Rhino ES5.
(function (global) {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
  var proto = FloatBallAppWM.prototype;
  if (proto.__toolHubShortXUiGestureSystemClosePatchInstalled === true) return;

  var PATCH_VERSION = "0.5.1-beta-system-close";
  var oldClose = proto.closeShortXUiGestureWindow;
  if (typeof oldClose !== "function") return;

  function now() {
    return Number(java.lang.System.currentTimeMillis());
  }

  function log(app, level, message) {
    try { safeLog(app && app.L, level || "i", String(message || "")); } catch (e) {}
  }

  function snapshot(session) {
    if (!session) return null;
    try {
      return {
        state: String(session.lifecycle || ""),
        depth: Number(session.depth || 0),
        callbackRegistered: session.callbackRegistered === true,
        receiverRegistered: session.receiverRegistered === true,
        systemCloseWorkerRunning: session.__systemCloseWorkerRunning === true,
        systemCloseRequestedAt: Number(session.__systemCloseRequestedAt || 0)
      };
    } catch (e) {}
    return null;
  }

  proto.closeShortXUiGestureWindow = function (immediate, reason) {
    var closeReason = String(reason || "");
    var isSystemDialogClose = closeReason === "recentapps" || closeReason === "homekey";
    var session = this.state ? this.state.shortXUiGestureSession : null;

    if (!isSystemDialogClose || !session || !session.host) {
      return oldClose.apply(this, arguments);
    }

    if (session.__systemCloseWorkerRunning === true) {
      return {
        ok: true,
        code: "SYSTEM_CLOSE_ALREADY_SCHEDULED",
        immediate: true,
        reason: closeReason,
        snapshot: snapshot(session)
      };
    }

    session.__systemCloseWorkerRunning = true;
    session.__systemCloseRequestedAt = now();

    var self = this;
    try {
      var worker = new java.lang.Thread(new java.lang.Runnable({
        run: function () {
          var result = null;
          try {
            result = oldClose.call(self, true, closeReason + "_async_worker");
            log(self, result && result.ok === true ? "i" : "e",
              "GESTURE_SYSTEM_CLOSE_DONE reason=" + closeReason +
              " ok=" + String(!!(result && result.ok === true)) +
              " code=" + String(result && result.code ? result.code : ""));
          } catch (error) {
            try { session.__systemCloseWorkerRunning = false; } catch (eFlag) {}
            log(self, "e", "GESTURE_SYSTEM_CLOSE_FAILED reason=" + closeReason + " error=" + String(error));
          }
        }
      }), "ToolHub-Gesture-SystemClose");
      worker.start();
      log(this, "i", "GESTURE_SYSTEM_CLOSE_ASYNC reason=" + closeReason);
      return {
        ok: true,
        code: "SYSTEM_CLOSE_ASYNC_SCHEDULED",
        immediate: true,
        reason: closeReason,
        scheduledAt: Number(session.__systemCloseRequestedAt || 0),
        snapshot: snapshot(session)
      };
    } catch (errorStart) {
      session.__systemCloseWorkerRunning = false;
      log(this, "w", "GESTURE_SYSTEM_CLOSE_FALLBACK reason=" + closeReason + " error=" + String(errorStart));
      return oldClose.call(this, true, closeReason + "_fallback");
    }
  };

  proto.__toolHubShortXUiGestureSystemClosePatchInstalled = true;
  if (global.ToolHubBetaPhase4) {
    global.ToolHubBetaPhase4.PATCH_VERSION = PATCH_VERSION;
  }
  try { writeLog("ShortXUI Gesture system close patch installed version=" + PATCH_VERSION); } catch (eLog) {}
}(function () { return this; }()));
