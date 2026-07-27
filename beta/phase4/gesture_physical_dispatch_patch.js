// ToolHub Beta Phase 4 physical back dispatch correction for ColorOS overlays. Rhino ES5.
(function (global) {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
  if (!global.ToolHubBetaPhase4 || String(global.ToolHubBetaPhase4.VERSION || "") !== "0.5.0-beta-gesture") return;
  if (!global.ToolHubBetaPhase4Final || String(global.ToolHubBetaPhase4Final.VERSION || "") !== "0.5.2-beta-gesture-final") return;

  var proto = FloatBallAppWM.prototype;
  if (proto.__toolHubShortXUiGesturePhysicalDispatch053Installed === true) return;

  var VERSION = "0.5.3-beta-gesture-physical-dispatch";
  var REBIND_DELAY_MS = 180;
  var REBIND_RETRY_MS = 120;
  var REBIND_RETRY_LIMIT = 12;

  function now() {
    return Number(java.lang.System.currentTimeMillis());
  }

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

  function finalCaseActive(app) {
    try {
      var report = app && app.state ? app.state.shortXUiGestureFinalReport : null;
      return !!(report && String(report.activeCase || ""));
    } catch (e) {}
    return false;
  }

  function transition(session, next, reason) {
    if (!session) return;
    var from = String(session.lifecycle || "IDLE");
    var to = String(next || from);
    if (from === to) return;
    if (!session.transitions) session.transitions = [];
    session.transitions.push({
      from: from,
      to: to,
      reason: String(reason || ""),
      at: now()
    });
    session.lifecycle = to;
  }

  function resetVisual(session) {
    if (!session || !session.card) return;
    try { session.card.animate().cancel(); } catch (e0) {}
    try { session.card.setScaleX(1); } catch (e1) {}
    try { session.card.setScaleY(1); } catch (e2) {}
    try { session.card.setTranslationX(0); } catch (e3) {}
    try { session.card.setAlpha(1); } catch (e4) {}
    session.progress = 0;
  }

  function applyVisual(session, event) {
    if (!session || !session.card) return;
    var progress = 0;
    var edge = 0;
    try { progress = Number(event && event.getProgress ? event.getProgress() : 0); } catch (e0) {}
    try { edge = Number(event && event.getSwipeEdge ? event.getSwipeEdge() : 0); } catch (e1) {}
    if (!isFinite(progress)) progress = 0;
    progress = Math.max(0, Math.min(1, progress));
    var direction = edge === 1 ? -1 : 1;
    var distance = 0;
    try { distance = global.ShortXUI.Metrics.create(context).dp(20); } catch (e2) { distance = 20; }
    try { session.card.setScaleX(1 - progress * 0.04); } catch (e3) {}
    try { session.card.setScaleY(1 - progress * 0.04); } catch (e4) {}
    try { session.card.setTranslationX(direction * distance * progress); } catch (e5) {}
    try { session.card.setAlpha(1 - progress * 0.12); } catch (e6) {}
    session.progress = progress;
    if (!session.stats) session.stats = {};
    if (progress > Number(session.stats.maxProgress || 0)) session.stats.maxProgress = progress;
  }

  function suppressOutsideDismiss(app, session) {
    if (!session || !session.host || !finalCaseActive(app)) return false;
    try {
      var updated = session.host.update(function (lp) {
        lp.flags = Number(lp.flags || 0) &
          ~Number(android.view.WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH);
      }, 1800);
      session.__physicalProbeOutsideSuppressed = !!(updated && updated.ok === true);
    } catch (eUpdate) {
      session.__physicalProbeOutsideSuppressed = false;
      log(app, "w", "GESTURE_PHYSICAL_CLEAR_OUTSIDE_FLAG_FAILED error=" + errorText(eUpdate));
    }
    try {
      if (session.root) {
        session.root.setOnTouchListener(new android.view.View.OnTouchListener({
          onTouch: function (view, event) {
            try {
              if (event && Number(event.getAction()) === Number(android.view.MotionEvent.ACTION_OUTSIDE)) {
                session.__physicalProbeOutsideEvents = Number(session.__physicalProbeOutsideEvents || 0) + 1;
                log(app, "i", "GESTURE_PHYSICAL_OUTSIDE_SUPPRESSED activeCase=true");
                return true;
              }
            } catch (eTouch) {}
            return false;
          }
        }));
      }
    } catch (eListener) {
      log(app, "w", "GESTURE_PHYSICAL_OUTSIDE_LISTENER_FAILED error=" + errorText(eListener));
    }
    try {
      if (session.root) session.root.requestFocus();
    } catch (eFocus) {}
    return session.__physicalProbeOutsideSuppressed === true;
  }

  function unregisterCurrent(session) {
    if (!session) return;
    try {
      if (session.backDispatcher && session.backCallback) {
        session.backDispatcher.unregisterOnBackInvokedCallback(session.backCallback);
      }
    } catch (e0) {}
    session.callbackRegistered = false;
    session.backCallback = null;
  }

  function bindDefaultPriority(app, session, attempt) {
    if (!session || session.cancelled === true || !session.root) return false;
    if (!finalCaseActive(app)) return false;
    var dispatcher = null;
    try { dispatcher = session.root.findOnBackInvokedDispatcher(); } catch (eFind) { dispatcher = null; }
    if (!dispatcher) {
      if (Number(attempt || 0) + 1 < REBIND_RETRY_LIMIT && session.dispatcher) {
        session.dispatcher.postDelayed(function () {
          bindDefaultPriority(app, session, Number(attempt || 0) + 1);
        }, REBIND_RETRY_MS, "shortx-ui-gesture-physical-rebind");
      }
      return false;
    }

    unregisterCurrent(session);

    var callback = null;
    var callbackType = "invoked_default";
    try {
      if (Number(android.os.Build.VERSION.SDK_INT) >= 34 &&
          Packages.android.window.OnBackAnimationCallback) {
        callback = new JavaAdapter(Packages.android.window.OnBackAnimationCallback, {
          onBackStarted: function (event) {
            if (!session.stats) session.stats = {};
            session.stats.backStarted = Number(session.stats.backStarted || 0) + 1;
            session.progress = 0;
            transition(session, "BACK_STARTED", "predictive_default");
            log(app, "i", "GESTURE_PHYSICAL_BACK_STARTED priority=default");
          },
          onBackProgressed: function (event) {
            if (!session.stats) session.stats = {};
            session.stats.backProgressed = Number(session.stats.backProgressed || 0) + 1;
            applyVisual(session, event);
          },
          onBackCancelled: function () {
            if (!session.stats) session.stats = {};
            session.stats.backCancelled = Number(session.stats.backCancelled || 0) + 1;
            resetVisual(session);
            transition(session, "BACK_CANCELLED", "predictive_default");
            log(app, "i", "GESTURE_PHYSICAL_BACK_CANCELLED priority=default");
          },
          onBackInvoked: function () {
            log(app, "i", "GESTURE_PHYSICAL_BACK_INVOKED priority=default");
            try {
              if (typeof app.simulateShortXUiGestureBack === "function") {
                app.simulateShortXUiGestureBack();
              }
            } catch (eInvoke) {
              if (!session.stats) session.stats = {};
              session.stats.errors = Number(session.stats.errors || 0) + 1;
              log(app, "e", "GESTURE_PHYSICAL_BACK_INVOKE_FAILED error=" + errorText(eInvoke));
            }
          }
        });
        callbackType = "animation_default";
      }
    } catch (eAnimation) {
      callback = null;
      log(app, "w", "GESTURE_PHYSICAL_ANIMATION_CALLBACK_FAILED error=" + errorText(eAnimation));
    }

    if (!callback) {
      try {
        callback = new JavaAdapter(Packages.android.window.OnBackInvokedCallback, {
          onBackInvoked: function () {
            log(app, "i", "GESTURE_PHYSICAL_BACK_INVOKED priority=default finalOnly=true");
            try {
              if (typeof app.simulateShortXUiGestureBack === "function") {
                app.simulateShortXUiGestureBack();
              }
            } catch (eInvoke) {
              if (!session.stats) session.stats = {};
              session.stats.errors = Number(session.stats.errors || 0) + 1;
            }
          }
        });
        callbackType = "invoked_default";
      } catch (eInvoked) {
        log(app, "e", "GESTURE_PHYSICAL_INVOKED_CALLBACK_FAILED error=" + errorText(eInvoked));
        return false;
      }
    }

    var priority = 0;
    try {
      priority = Number(Packages.android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT);
      if (!isFinite(priority)) priority = 0;
    } catch (ePriority) { priority = 0; }

    try {
      dispatcher.registerOnBackInvokedCallback(priority, callback);
    } catch (eRegister) {
      log(app, "e", "GESTURE_PHYSICAL_DEFAULT_REGISTER_FAILED error=" + errorText(eRegister));
      return false;
    }

    session.backDispatcher = dispatcher;
    session.backCallback = callback;
    session.callbackPriority = priority;
    session.callbackType = callbackType;
    session.callbackRegistered = true;
    session.__physicalDefaultPriorityBound = true;
    transition(session, "BACK_REGISTERED", callbackType);
    log(app, "i",
      "GESTURE_PHYSICAL_DEFAULT_REGISTERED type=" + callbackType +
      " priority=" + String(priority) +
      " outsideSuppressed=" + String(session.__physicalProbeOutsideSuppressed === true));
    return true;
  }

  function scheduleRebind(app, session) {
    if (!session || !session.dispatcher) return;
    session.dispatcher.postDelayed(function () {
      if (!session || session.cancelled === true) return;
      suppressOutsideDismiss(app, session);
      bindDefaultPriority(app, session, 0);
    }, REBIND_DELAY_MS, "shortx-ui-gesture-physical-rebind");
  }

  var oldOpen = proto.openShortXUiGestureWindow;
  if (typeof oldOpen === "function") {
    proto.openShortXUiGestureWindow = function (depth) {
      var result = oldOpen.apply(this, arguments);
      try {
        var session = this.state ? this.state.shortXUiGestureSession : null;
        if (result && result.ok === true && session && finalCaseActive(this)) {
          scheduleRebind(this, session);
        }
      } catch (ePatch) {
        log(this, "e", "GESTURE_PHYSICAL_OPEN_PATCH_FAILED error=" + errorText(ePatch));
      }
      return result;
    };
  }

  var oldRefresh = proto.refreshShortXUiGestureState;
  if (typeof oldRefresh === "function") {
    proto.refreshShortXUiGestureState = function () {
      var session = this.state ? this.state.shortXUiGestureSession : null;
      if (session && finalCaseActive(this) && session.__physicalDefaultPriorityBound !== true) {
        suppressOutsideDismiss(this, session);
        bindDefaultPriority(this, session, 0);
      }
      return oldRefresh.apply(this, arguments);
    };
  }

  global.ToolHubBetaPhase4Final.PHYSICAL_DISPATCH_VERSION = VERSION;
  global.ToolHubBetaPhase4Final.PHYSICAL_BACK_PRIORITY = 0;
  proto.__toolHubShortXUiGesturePhysicalDispatch053Installed = true;
  try { writeLog("ShortXUI Gesture physical dispatch patch installed version=" + VERSION); } catch (eLog) {}
}(function () { return this; }()));
