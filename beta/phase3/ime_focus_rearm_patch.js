// ToolHub Beta ShortXUI IME re-arm and owner-thread close patch. Rhino ES5.
(function (global) {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
  var proto = FloatBallAppWM.prototype;
  if (proto.__toolHubShortXUiImeRearmPatchInstalled === true) return;

  var PATCH_VERSION = "0.4.1-beta-ime-rearm";
  var STRESS_CYCLES = 20;
  var WAIT_INTERVAL_MS = 100;
  var WAIT_TIMEOUT_MS = 4000;
  var oldOpen = proto.openShortXUiImeWindow;

  function now() {
    return Number(java.lang.System.currentTimeMillis());
  }

  function log(app, level, message) {
    try { safeLog(app && app.L, level || "i", String(message || "")); } catch (e) {}
  }

  function publish(app) {
    try {
      if (app && typeof app.refreshShortXUiImeState === "function") {
        app.refreshShortXUiImeState();
        return true;
      }
    } catch (e0) {
      log(app, "w", "ShortXUI IME publish failed: " + String(e0));
    }
    return false;
  }

  function installTapRearm(app) {
    try {
      if (!app || !app.state) return false;
      var session = app.state.shortXUiImeSession || null;
      if (!session || !session.edit || session.__tapRearmInstalled === true) return false;
      session.__tapRearmInstalled = true;
      session.__lastTapRearmAt = 0;
      var edit = session.edit;
      edit.setOnTouchListener(new android.view.View.OnTouchListener({
        onTouch: function (view, event) {
          try {
            if (!event || Number(event.getAction()) !== Number(android.view.MotionEvent.ACTION_DOWN)) return false;
            var current = app.state ? app.state.shortXUiImeSession : null;
            if (!current || current !== session || current.cancelled === true) return false;
            var focused = false;
            try { focused = !!(current.edit && current.edit.hasFocus && current.edit.hasFocus()); } catch (eFocus) {}
            var needsRearm = current.lifecycle === "RESTORED" || current.imeVisible !== true || !focused;
            if (!needsRearm) return false;
            var timestamp = now();
            if (timestamp - Number(current.__lastTapRearmAt || 0) < 250) return false;
            current.__lastTapRearmAt = timestamp;
            var result = app.showShortXUiIme();
            log(app, result && result.ok === false ? "w" : "d",
              "IME_TAP_REARM state=" + String(current.lifecycle || "") +
              " code=" + String(result && result.code ? result.code : "") +
              " ok=" + String(!(result && result.ok === false)));
          } catch (error) {
            log(app, "e", "IME tap re-arm failed: " + String(error));
          }
          return false;
        }
      }));
      log(app, "d", "ShortXUI IME tap re-arm listener installed");
      return true;
    } catch (errorOuter) {
      log(app, "e", "Install IME tap re-arm listener failed: " + String(errorOuter));
    }
    return false;
  }

  if (typeof oldOpen === "function") {
    proto.openShortXUiImeWindow = function (autoFocus) {
      var result = oldOpen.call(this, autoFocus);
      installTapRearm(this);
      return result;
    };
  }

  proto.runShortXUiImeStress = function () {
    if (!this.state) this.state = {};
    var existing = this.state.shortXUiImeStressResult;
    if (existing && existing.running === true) return existing;

    var capOk = false;
    try {
      capOk = !!(global.ShortXUI && global.ShortXUI.WindowHost &&
        typeof global.ShortXUI.WindowHost.create === "function" &&
        global.ShortXUI.Dispatcher &&
        typeof global.ShortXUI.Dispatcher.fromHandler === "function");
    } catch (eCap) { capOk = false; }
    if (!capOk) {
      var unavailable = {
        schema: 2,
        runtimeVersion: "",
        wrapperVersion: PATCH_VERSION,
        ok: false,
        running: false,
        code: "RUNTIME_MISMATCH",
        cyclesRequested: STRESS_CYCLES,
        cyclesCompleted: 0,
        errors: 1
      };
      this.state.shortXUiImeStressResult = unavailable;
      publish(this);
      return unavailable;
    }

    try { this.closeShortXUiImeWindow(true); } catch (eCloseOld) {}

    var self = this;
    var mainHandler = new android.os.Handler(android.os.Looper.getMainLooper());
    var stress = {
      schema: 2,
      runtimeVersion: String(global.ShortXUI.VERSION || ""),
      wrapperVersion: PATCH_VERSION,
      ok: false,
      running: true,
      startedAt: now(),
      finishedAt: 0,
      durationMs: 0,
      cyclesRequested: STRESS_CYCLES,
      cyclesCompleted: 0,
      visiblePasses: 0,
      hideRestorePasses: 0,
      closeWhileVisiblePasses: 0,
      normalCloses: 0,
      immediateCloses: 0,
      timeouts: 0,
      errors: 0,
      cycles: []
    };
    this.state.shortXUiImeStressResult = stress;
    publish(this);

    function schedule(callback, delayMs) {
      mainHandler.postDelayed(new java.lang.Runnable({
        run: function () {
          try { callback(); }
          catch (error) { fail(-1, "UNCAUGHT", String(error)); }
        }
      }), Math.max(0, Number(delayMs || 0)));
    }

    function finish() {
      stress.running = false;
      stress.ok = stress.cyclesCompleted === STRESS_CYCLES &&
        stress.visiblePasses === STRESS_CYCLES &&
        stress.hideRestorePasses === STRESS_CYCLES / 2 &&
        stress.closeWhileVisiblePasses === STRESS_CYCLES / 2 &&
        stress.normalCloses === STRESS_CYCLES / 2 &&
        stress.immediateCloses === STRESS_CYCLES / 2 &&
        stress.timeouts === 0 && stress.errors === 0;
      stress.finishedAt = now();
      stress.durationMs = Math.max(0, stress.finishedAt - stress.startedAt);
      publish(self);
      log(self, stress.ok ? "i" : "e",
        "IME_STRESS_MAIN_DONE ok=" + String(stress.ok) +
        " completed=" + String(stress.cyclesCompleted) + "/" + String(STRESS_CYCLES));
    }

    function fail(index, code, detail) {
      if (stress.running !== true) return;
      stress.running = false;
      stress.ok = false;
      stress.finishedAt = now();
      stress.durationMs = Math.max(0, stress.finishedAt - stress.startedAt);
      stress.errors += 1;
      stress.cycles.push({
        index: index >= 0 ? index + 1 : 0,
        ok: false,
        code: String(code || "FAILED"),
        detail: detail || null
      });
      try { self.closeShortXUiImeWindow(true, true); } catch (eClose) {}
      publish(self);
      log(self, "e", "IME_STRESS_MAIN_FAIL index=" + String(index + 1) + " code=" + String(code || "FAILED"));
    }

    function waitFor(index, name, predicate, onPass, startedAt) {
      if (stress.running !== true) return;
      var waitStarted = startedAt || now();
      var passed = false;
      try { passed = predicate() === true; } catch (ePredicate) {
        fail(index, name + "_PREDICATE_ERROR", String(ePredicate));
        return;
      }
      if (passed) {
        onPass();
        return;
      }
      if (now() - waitStarted >= WAIT_TIMEOUT_MS) {
        stress.timeouts += 1;
        fail(index, name + "_TIMEOUT", null);
        return;
      }
      schedule(function () { waitFor(index, name, predicate, onPass, waitStarted); }, WAIT_INTERVAL_MS);
    }

    function closeAndRecord(index, mode, immediate, extra) {
      var closeResult = self.closeShortXUiImeWindow(immediate, true);
      if (!closeResult || closeResult.ok !== true) {
        fail(index, "CLOSE_FAILED", closeResult || null);
        return;
      }
      if (immediate) stress.immediateCloses += 1;
      else stress.normalCloses += 1;
      stress.cyclesCompleted += 1;
      var row = {
        index: index + 1,
        ok: true,
        mode: String(mode),
        immediate: immediate === true,
        closeCode: String(closeResult.code || "")
      };
      if (extra) {
        var key;
        for (key in extra) if (extra.hasOwnProperty(key)) row[key] = extra[key];
      }
      stress.cycles.push(row);
      publish(self);
      schedule(function () { next(index + 1); }, 160);
    }

    function next(index) {
      if (stress.running !== true) return;
      if (index >= STRESS_CYCLES) {
        finish();
        return;
      }

      var opened = self.openShortXUiImeWindow(false);
      if (!opened || opened.ok !== true) {
        fail(index, "OPEN_FAILED", opened || null);
        return;
      }
      installTapRearm(self);
      var shown = self.showShortXUiIme();
      if (!shown || shown.ok !== true) {
        fail(index, "SHOW_REQUEST_FAILED", shown || null);
        return;
      }

      waitFor(index, "IME_VISIBLE", function () {
        var session = self.state ? self.state.shortXUiImeSession : null;
        return !!(session && session.imeVisible === true && session.lifecycle === "IME_VISIBLE");
      }, function () {
        stress.visiblePasses += 1;
        var immediate = index % 4 === 1 || index % 4 === 2;
        var closeWhileVisible = index % 2 === 1;
        if (closeWhileVisible) {
          stress.closeWhileVisiblePasses += 1;
          closeAndRecord(index, "close_while_visible", immediate, null);
          return;
        }

        var hidden = self.hideShortXUiIme();
        if (!hidden || hidden.ok !== true) {
          fail(index, "HIDE_REQUEST_FAILED", hidden || null);
          return;
        }
        waitFor(index, "IME_RESTORED", function () {
          var session = self.state ? self.state.shortXUiImeSession : null;
          return !!(session && session.lifecycle === "RESTORED" &&
            session.imeVisible !== true && session.geometryRestored === true);
        }, function () {
          stress.hideRestorePasses += 1;
          closeAndRecord(index, "hide_restore", immediate, { geometryRestored: true });
        });
      });
    }

    log(this, "i", "IME_STRESS_MAIN_BEGIN cycles=" + String(STRESS_CYCLES));
    schedule(function () { next(0); }, 0);
    return stress;
  };

  proto.__toolHubShortXUiImeRearmPatchInstalled = true;
  if (global.ToolHubBetaPhase3) {
    global.ToolHubBetaPhase3.PATCH_VERSION = PATCH_VERSION;
  }
  try { writeLog("ShortXUI IME re-arm patch installed version=" + PATCH_VERSION); } catch (eLog) {}
}(function () { return this; }()));
