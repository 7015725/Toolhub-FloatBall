// ToolHub Beta ShortXUI WindowHost phase-2 hardening. Rhino ES5.
(function (global) {
  var phase = global.ToolHubBetaPhase2;
  if (!phase || typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
  var proto = FloatBallAppWM.prototype;
  if (proto.__toolHubShortXUiPhase2HardeningInstalled === true) return;

  function cleanupRecovery(app) {
    try {
      if (!app || !app.state) return true;
      var host = app.state.shortXUiLabStressRecoveryHost || null;
      var dispatcher = app.state.shortXUiLabStressRecoveryDispatcher || null;
      if (host) {
        try { host.remove(true, 1800); } catch (e0) {}
        try { host.dispose(1800); } catch (e1) {}
      }
      try { if (dispatcher) dispatcher.dispose(); } catch (e2) {}
      app.state.shortXUiLabStressRecoveryHost = null;
      app.state.shortXUiLabStressRecoveryDispatcher = null;
      return true;
    } catch (e3) {}
    return false;
  }

  var oldOpen = proto.openShortXUiLabWindowHost;
  var oldMove = proto.moveShortXUiLabWindowHost;
  var oldCloseWindow = proto.closeShortXUiLabWindowHost;
  var oldBuildLab = proto.buildShortXUiLabPanelView;
  var oldCloseApp = proto.close;

  proto.getShortXUiWindowHostCapability = function () { return phase.capability(); };

  if (typeof oldOpen === "function") {
    proto.openShortXUiLabWindowHost = function () {
      if (!phase.capability().ok) return phase.mismatch(this, "open");
      return oldOpen.call(this);
    };
  }

  if (typeof oldMove === "function") {
    proto.moveShortXUiLabWindowHost = function () {
      if (!phase.capability().ok) return phase.mismatch(this, "move");
      return oldMove.call(this);
    };
  }

  if (typeof oldCloseWindow === "function") {
    proto.closeShortXUiLabWindowHost = function (immediate) {
      if (!phase.capability().ok) {
        if (!this.state || !this.state.shortXUiLabWindowHost) return { ok: true, code: "ALREADY_CLOSED", state: "UNAVAILABLE" };
        return phase.mismatch(this, "close");
      }
      return oldCloseWindow.call(this, immediate);
    };
  }

  proto.runShortXUiLabWindowHostStress = function () {
    var cap = phase.capability();
    if (!cap.ok) return phase.mismatch(this, "stress");
    var startedAt = Number(java.lang.System.currentTimeMillis());
    var cycles = [];
    var ok = true;
    var normalRemoves = 0;
    var immediateRemoves = 0;
    var repeatedRemovePasses = 0;
    var repeatedDisposePasses = 0;
    var sx = ShortXUI;
    if (!this.state) this.state = {};
    cleanupRecovery(this);
    try { this.closeShortXUiLabWindowHost(true); } catch (eClose) {}

    for (var index = 0; index < phase.STRESS_CYCLES; index++) {
      var dispatcher = sx.Dispatcher.fromHandler(this.state.h, "shortx-ui-windowhost-stress-" + String(index));
      var host = sx.WindowHost.create({ name: "stress-" + String(index), dispatcher: dispatcher, windowManager: this.state.wm, timeoutMs: 1800 });
      var self = this;
      var prepared = host.prepare(function () { return self.shortXUiLabCreateWindowBundle("循环 " + String(index + 1) + "/" + String(phase.STRESS_CYCLES)); });
      var attached = prepared.ok ? host.attach(1800) : prepared;
      var updated = attached.ok ? host.update(function (lp) {
        lp.x = Number(lp.x || 0) + (index % 13);
        lp.y = Number(lp.y || 0) + (index % 7);
      }, 1800) : { ok: false, code: "SKIPPED" };
      var immediate = index % 2 === 1;
      var removed = attached.ok ? host.remove(immediate, 1800) : { ok: false, code: "SKIPPED" };
      var repeatedRemove = removed.ok ? host.remove(immediate, 1800) : { ok: false, code: "SKIPPED" };
      var disposed = removed.ok ? host.dispose(1800) : { ok: false, code: "SKIPPED" };
      var repeatedDispose = disposed.ok ? host.dispose(1800) : { ok: false, code: "SKIPPED" };
      var cycleOk = prepared.ok && attached.ok && updated.ok && removed.ok && repeatedRemove.ok && disposed.ok && repeatedDispose.ok;
      cycles.push({
        index: index + 1,
        ok: cycleOk,
        immediate: immediate,
        prepared: prepared.code,
        attached: attached.code,
        updated: updated.code,
        removed: removed.code,
        repeatedRemove: repeatedRemove.code,
        disposed: disposed.code,
        repeatedDispose: repeatedDispose.code,
        snapshot: host.snapshot()
      });
      if (immediate) immediateRemoves++; else normalRemoves++;
      if (repeatedRemove.ok) repeatedRemovePasses++;
      if (repeatedDispose.ok) repeatedDisposePasses++;
      if (!cycleOk) {
        ok = false;
        this.state.shortXUiLabStressRecoveryHost = host;
        this.state.shortXUiLabStressRecoveryDispatcher = dispatcher;
        break;
      }
      try { dispatcher.dispose(); } catch (eDispatcher) {}
    }

    var result = {
      schema: 2,
      runtimeVersion: cap.runtimeVersion,
      wrapperVersion: phase.VERSION,
      ok: ok && cycles.length === phase.STRESS_CYCLES,
      cyclesRequested: phase.STRESS_CYCLES,
      cyclesCompleted: cycles.length,
      normalRemoves: normalRemoves,
      immediateRemoves: immediateRemoves,
      repeatedRemovePasses: repeatedRemovePasses,
      repeatedDisposePasses: repeatedDisposePasses,
      durationMs: Math.max(0, Number(java.lang.System.currentTimeMillis()) - startedAt),
      cycles: cycles
    };
    this.state.shortXUiLabLastWindowStressResult = result;
    phase.persist(this);
    return result;
  };

  if (typeof oldBuildLab === "function") {
    proto.buildShortXUiLabPanelView = function () {
      var view = oldBuildLab.call(this);
      phase.patchTextTree(view, phase.capability());
      return view;
    };
  }

  if (typeof oldCloseApp === "function") {
    proto.close = function () {
      try {
        if (this.state && this.state.shortXUiLabWindowHost && typeof this.closeShortXUiLabWindowHost === "function") this.closeShortXUiLabWindowHost(true);
      } catch (e0) {
        try { safeLog(this.L, "w", "ShortXUI WindowHost close cleanup fail: " + String(e0)); } catch (e1) {}
      }
      try { cleanupRecovery(this); } catch (e2) {}
      return oldCloseApp.apply(this, arguments);
    };
  }

  proto.__toolHubShortXUiPhase2HardeningInstalled = true;
  try { writeLog("ShortXUI WindowHost phase2 hardening installed version=" + phase.VERSION); } catch (eLog) {}
}(function () { return this; }()));
