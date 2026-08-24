// ToolHub Beta ShortXUI Canvas + frame lifecycle phase-5 lab. Rhino ES5.
(function (global) {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
  if (!global.ShortXUI || global.ShortXUI.__runtimeInstalled !== true) return;

  var proto = FloatBallAppWM.prototype;
  if (proto.__toolHubShortXUiCanvasPhase5Installed === true) return;

  var phase = {
    VERSION: "0.6.0-beta-canvas",
    STRESS_CYCLES: 20,
    MOTION_DURATION_MS: 420,
    WAIT_INTERVAL_MS: 60,
    WAIT_TIMEOUT_MS: 5000,
    IDLE_OBSERVE_MS: 240,
    NO_CHANGE_OBSERVE_MS: 160,
    CLOSE_OBSERVE_MS: 200
  };

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

  function metrics() {
    return global.ShortXUI.Metrics.create(context);
  }

  function clamp01(value) {
    var n = Number(value || 0);
    if (!isFinite(n)) n = 0;
    return Math.max(0, Math.min(1, n));
  }

  function abs(value) {
    return Math.abs(Number(value || 0));
  }

  function copyPlain(value) {
    try { return JSON.parse(JSON.stringify(value || {})); } catch (e) { return {}; }
  }

  function transition(session, next, reason) {
    if (!session) return;
    var from = String(session.lifecycle || "IDLE");
    var to = String(next || from);
    if (from === to) return;
    session.transitions.push({ from: from, to: to, reason: String(reason || ""), at: now() });
    session.lifecycle = to;
  }

  function capability() {
    var sx = null;
    var hasCanvas = false;
    var hasChoreographer = false;
    try { sx = global.ShortXUI || null; } catch (e0) { sx = null; }
    try { hasCanvas = !!android.graphics.Canvas && !!android.graphics.Paint && !!android.graphics.RectF; } catch (e1) { hasCanvas = false; }
    try { hasChoreographer = !!android.view.Choreographer && typeof android.view.Choreographer.getInstance === "function"; } catch (e2) { hasChoreographer = false; }
    return {
      ok: !!(sx && sx.WindowHost && typeof sx.WindowHost.create === "function" &&
        sx.Dispatcher && typeof sx.Dispatcher.fromHandler === "function" &&
        hasCanvas && hasChoreographer),
      runtimeInstalled: !!sx,
      runtimeVersion: sx ? String(sx.VERSION || "") : "",
      hasWindowHost: !!(sx && sx.WindowHost && typeof sx.WindowHost.create === "function"),
      hasDispatcher: !!(sx && sx.Dispatcher && typeof sx.Dispatcher.fromHandler === "function"),
      hasCanvas: hasCanvas,
      hasChoreographer: hasChoreographer,
      sdk: Number(android.os.Build.VERSION.SDK_INT),
      wrapperVersion: phase.VERSION
    };
  }

  function defaultStats() {
    return {
      frameRequests: 0,
      framePosts: 0,
      frameCallbacks: 0,
      coalescedRequests: 0,
      changedFrames: 0,
      unchangedFrames: 0,
      invalidates: 0,
      draws: 0,
      idleStops: 0,
      noChangeStarts: 0,
      manualStops: 0,
      cancelledCallbacks: 0,
      lateCallbacks: 0,
      hardwareDraws: 0,
      normalCloses: 0,
      immediateCloses: 0,
      errors: 0
    };
  }

  function sessionSnapshot(session) {
    if (!session) {
      return {
        state: "IDLE",
        open: false,
        running: false,
        framePosted: false,
        position: 0,
        target: 0,
        hardwareCanvas: false,
        engineDisposed: true,
        stats: defaultStats(),
        transitions: []
      };
    }
    return {
      state: String(session.lifecycle || "IDLE"),
      open: !!(session.host && session.host.getState && session.host.getState() !== "DISPOSED"),
      running: session.motionActive === true,
      framePosted: session.framePosted === true,
      position: Number(session.position || 0),
      target: Number(session.target || 0),
      durationMs: Number(session.durationMs || 0),
      lastFrameAt: Number(session.lastFrameAt || 0),
      stableAt: Number(session.stableAt || 0),
      hardwareCanvas: session.hardwareCanvas === true,
      engineDisposed: session.engineDisposed === true,
      host: session.host && session.host.snapshot ? session.host.snapshot() : null,
      dispatcher: session.dispatcher && session.dispatcher.getState ? session.dispatcher.getState() : null,
      stats: copyPlain(session.stats),
      transitions: copyPlain(session.transitions)
    };
  }

  function diagnosticsRoot() {
    var root = "";
    try { if (typeof getToolHubRootDir === "function") root = String(getToolHubRootDir() || ""); } catch (e0) {}
    try { if (!root && typeof APP_ROOT_DIR !== "undefined") root = String(APP_ROOT_DIR || ""); } catch (e1) {}
    return root;
  }

  function persist(app) {
    var out = null;
    var temp = null;
    try {
      if (!app || !app.state) return false;
      var root = diagnosticsRoot();
      if (!root) return false;
      var target = new java.io.File(root + "/diagnostics/shortx-ui/latest.json");
      var parent = target.getParentFile();
      if (parent && !parent.exists() && !parent.mkdirs() && !parent.exists()) return false;
      temp = new java.io.File(target.getAbsolutePath() + ".tmp");
      var cap = capability();
      var payload = {
        schema: 6,
        runtimeVersion: cap.runtimeVersion,
        wrapperVersion: phase.VERSION,
        ok: cap.ok &&
          !(app.state.shortXUiLabLastResult && app.state.shortXUiLabLastResult.ok === false) &&
          !(app.state.shortXUiLabLastDispatcherResult && app.state.shortXUiLabLastDispatcherResult.ok === false) &&
          !(app.state.shortXUiLabLastWindowResult && app.state.shortXUiLabLastWindowResult.ok === false) &&
          !(app.state.shortXUiLabLastWindowStressResult && app.state.shortXUiLabLastWindowStressResult.ok === false) &&
          !(app.state.shortXUiImeLastResult && app.state.shortXUiImeLastResult.ok === false) &&
          !(app.state.shortXUiImeStressResult && app.state.shortXUiImeStressResult.ok === false) &&
          !(app.state.shortXUiGestureLastResult && app.state.shortXUiGestureLastResult.ok === false) &&
          !(app.state.shortXUiGestureStressResult && app.state.shortXUiGestureStressResult.ok === false) &&
          !(app.state.shortXUiCanvasLastResult && app.state.shortXUiCanvasLastResult.ok === false) &&
          !(app.state.shortXUiCanvasStressResult && app.state.shortXUiCanvasStressResult.ok === false),
        savedAt: now(),
        capability: cap,
        basic: app.state.shortXUiLabLastResult || null,
        dispatcher: app.state.shortXUiLabLastDispatcherResult || null,
        windowHost: app.state.shortXUiLabLastWindowResult || null,
        windowStress: app.state.shortXUiLabLastWindowStressResult || null,
        imeFocus: app.state.shortXUiImeLastResult || null,
        imeStress: app.state.shortXUiImeStressResult || null,
        gesture: app.state.shortXUiGestureLastResult || null,
        gestureStress: app.state.shortXUiGestureStressResult || null,
        canvas: app.state.shortXUiCanvasLastResult || sessionSnapshot(app.state.shortXUiCanvasSession || null),
        canvasStress: app.state.shortXUiCanvasStressResult || null
      };
      out = new java.io.OutputStreamWriter(new java.io.FileOutputStream(temp, false), "UTF-8");
      out.write(JSON.stringify(payload, null, 2) + "\n");
      out.flush();
      out.close();
      out = null;
      if (target.exists() && !target.delete()) throw "replace old diagnostics failed";
      if (!temp.renameTo(target)) throw "publish diagnostics failed";
      return true;
    } catch (error) {
      log(app, "w", "ShortXUI canvas diagnostics save failed: " + errorText(error));
      return false;
    } finally {
      try { if (out) out.close(); } catch (e2) {}
      try { if (temp && temp.exists()) temp.delete(); } catch (e3) {}
    }
  }

  function format(app) {
    var cap = capability();
    var session = app && app.state ? app.state.shortXUiCanvasSession : null;
    var snap = sessionSnapshot(session);
    var stress = app && app.state ? app.state.shortXUiCanvasStressResult : null;
    var stats = snap.stats || {};
    var lines = [];
    lines.push("Canvas + 帧生命周期：" + (cap.ok ? "可用" : "不可用"));
    lines.push("SDK=" + String(cap.sdk) + " Canvas=" + String(cap.hasCanvas) + " Choreographer=" + String(cap.hasChoreographer));
    lines.push("状态=" + String(snap.state) + " open=" + String(snap.open) + " running=" + String(snap.running));
    lines.push("position=" + Number(snap.position || 0).toFixed(3) + " target=" + Number(snap.target || 0).toFixed(3) + " posted=" + String(snap.framePosted));
    lines.push("request=" + String(Number(stats.frameRequests || 0)) + " post=" + String(Number(stats.framePosts || 0)) + " callback=" + String(Number(stats.frameCallbacks || 0)));
    lines.push("coalesced=" + String(Number(stats.coalescedRequests || 0)) + " changed=" + String(Number(stats.changedFrames || 0)) + " unchanged=" + String(Number(stats.unchangedFrames || 0)));
    lines.push("invalidate=" + String(Number(stats.invalidates || 0)) + " draw=" + String(Number(stats.draws || 0)) + " idleStop=" + String(Number(stats.idleStops || 0)));
    lines.push("noChange=" + String(Number(stats.noChangeStarts || 0)) + " cancel=" + String(Number(stats.cancelledCallbacks || 0)) + " late=" + String(Number(stats.lateCallbacks || 0)) + " errors=" + String(Number(stats.errors || 0)));
    if (stress) {
      lines.push("");
      lines.push("20 次帧测试：" + (stress.running ? "运行中" : (stress.ok ? "通过" : "失败")));
      lines.push("完成=" + String(Number(stress.cyclesCompleted || 0)) + "/" + String(Number(stress.cyclesRequested || 0)) +
        " settle=" + String(Number(stress.settlePasses || 0)) +
        " idle=" + String(Number(stress.idleStopPasses || 0)) +
        " noChange=" + String(Number(stress.noChangeStopPasses || 0)));
      lines.push("closeRunning=" + String(Number(stress.closeWhileRunningPasses || 0)) +
        " coalesce=" + String(Number(stress.coalescedPasses || 0)) +
        " late=" + String(Number(stress.lateCallbacks || 0)) +
        " timeout=" + String(Number(stress.timeouts || 0)) +
        " errors=" + String(Number(stress.errors || 0)));
    }
    if (!cap.ok) lines.push("Runtime/Lab 能力不完整，请完整停止并重新运行 Beta");
    return lines.join("\n");
  }

  function refreshStatus(app) {
    if (!app || !app.state) return;
    var status = app.state.shortXUiCanvasStatusView || null;
    if (!status) return;
    var update = function () {
      try { status.setText(format(app)); } catch (e0) {}
    };
    try {
      if (typeof app.postToAndroidMain === "function") {
        app.postToAndroidMain(update);
        return;
      }
    } catch (e1) {}
    try { new android.os.Handler(android.os.Looper.getMainLooper()).post(new java.lang.Runnable({ run: update })); } catch (e2) {}
  }

  function publishDeferred(app, session, code) {
    try {
      var generation = Number(session && session.generation || 0);
      new android.os.Handler(android.os.Looper.getMainLooper()).post(new java.lang.Runnable({ run: function () {
        try {
          if (!app || !app.state || !session || Number(session.generation || 0) !== generation) return;
          if (session.cancelled === true || app.state.shortXUiCanvasSession !== session) return;
          app.state.shortXUiCanvasLastResult = { ok: true, code: String(code || "UPDATED"), snapshot: sessionSnapshot(session) };
          persist(app);
          refreshStatus(app);
        } catch (e0) {}
      }}));
    } catch (e1) {}
  }

  function setPaint(paint, color, style, strokeWidth) {
    try { global.ShortXUI.Color.applyPaint(paint, color); } catch (e0) {}
    try { paint.setStyle(style); } catch (e1) {}
    try { if (strokeWidth !== undefined) paint.setStrokeWidth(Number(strokeWidth || 0)); } catch (e2) {}
    try { paint.setAntiAlias(true); } catch (e3) {}
    return paint;
  }

  function updateOverlayLabel(session) {
    if (!session || !session.overlayLabel) return;
    try {
      session.overlayLabel.setText(
        String(session.lifecycle || "") +
        "  position=" + Number(session.position || 0).toFixed(3) +
        "  callbacks=" + String(Number(session.stats.frameCallbacks || 0))
      );
    } catch (e) {}
  }

  function drawCanvas(session, canvas, view) {
    var m = metrics();
    var width = Math.max(1, Number(view.getWidth() || 0));
    var height = Math.max(1, Number(view.getHeight() || 0));
    var T = session.colors;
    var trackPaint = setPaint(new android.graphics.Paint(), T.outline, android.graphics.Paint.Style.FILL);
    var activePaint = setPaint(new android.graphics.Paint(), T.primary, android.graphics.Paint.Style.FILL);
    var ringPaint = setPaint(new android.graphics.Paint(), T.primary, android.graphics.Paint.Style.STROKE, m.dp(2));
    var textPaint = setPaint(new android.graphics.Paint(), T.onSurface2, android.graphics.Paint.Style.FILL);
    try { textPaint.setTextSize(m.sp(11)); } catch (eTextSize) {}

    var left = m.dp(24);
    var right = Math.max(left + m.dp(20), width - m.dp(24));
    var centerY = Math.max(m.dp(38), Math.min(height - m.dp(34), Math.round(height * 0.48)));
    var trackHeight = m.dp(10);
    var track = new android.graphics.RectF(left, centerY - trackHeight / 2, right, centerY + trackHeight / 2);
    try { canvas.drawRoundRect(track, trackHeight / 2, trackHeight / 2, trackPaint); } catch (eTrack) {}

    var position = clamp01(session.position);
    var x = left + (right - left) * position;
    var radius = m.dp(17);
    try { canvas.drawCircle(x, centerY, radius, activePaint); } catch (eCircle) {}
    try { canvas.drawCircle(x, centerY, radius + m.dp(5), ringPaint); } catch (eRing) {}

    var stateText = session.motionActive === true ? "RUNNING" : "STABLE / 无变化停帧";
    try { canvas.drawText(new java.lang.String(stateText), left, height - m.dp(12), textPaint); } catch (eText) {}
    session.stats.draws += 1;
    try {
      if (canvas.isHardwareAccelerated && canvas.isHardwareAccelerated() === true) {
        session.hardwareCanvas = true;
        session.stats.hardwareDraws += 1;
      }
    } catch (eHardware) {}
  }

  function easeOutCubic(value) {
    var t = clamp01(value);
    var inv = 1 - t;
    return 1 - inv * inv * inv;
  }

  function postFrameInternal(app, session, reason) {
    if (!session || session.cancelled === true || session.engineDisposed === true) return false;
    session.stats.frameRequests += 1;
    if (session.framePosted === true) {
      session.stats.coalescedRequests += 1;
      return true;
    }
    if (!session.choreographer || !session.frameCallback) {
      session.stats.errors += 1;
      return false;
    }
    try {
      session.choreographer.postFrameCallback(session.frameCallback);
      session.framePosted = true;
      session.stats.framePosts += 1;
      session.lastFrameReason = String(reason || "request");
      return true;
    } catch (error) {
      session.stats.errors += 1;
      log(app, "e", "Canvas frame post failed: " + errorText(error));
    }
    return false;
  }

  function handleFrame(app, session, frameTimeNanos) {
    if (!session) return;
    session.framePosted = false;
    session.stats.frameCallbacks += 1;
    session.lastFrameAt = now();
    if (session.cancelled === true || session.engineDisposed === true) {
      session.stats.lateCallbacks += 1;
      return;
    }

    var changed = false;
    if (session.motionActive === true) {
      var frameNanos = Number(frameTimeNanos || 0);
      if (!isFinite(frameNanos) || frameNanos <= 0) frameNanos = Number(java.lang.System.nanoTime());
      if (Number(session.motionStartNanos || 0) <= 0) session.motionStartNanos = frameNanos;
      var elapsedMs = Math.max(0, (frameNanos - Number(session.motionStartNanos || frameNanos)) / 1000000);
      var ratio = clamp01(elapsedMs / Math.max(1, Number(session.durationMs || phase.MOTION_DURATION_MS)));
      var next = Number(session.fromPosition || 0) +
        (Number(session.target || 0) - Number(session.fromPosition || 0)) * easeOutCubic(ratio);
      if (ratio >= 1) next = Number(session.target || 0);
      if (abs(next - Number(session.position || 0)) > 0.0001) {
        session.position = clamp01(next);
        changed = true;
        session.stats.changedFrames += 1;
      } else {
        session.stats.unchangedFrames += 1;
      }
      if (ratio >= 1) {
        session.position = clamp01(session.target);
        session.motionActive = false;
        session.motionStartNanos = 0;
      }
    } else {
      session.stats.unchangedFrames += 1;
    }

    if (changed === true || session.dirty === true) {
      session.dirty = false;
      try {
        if (session.view) {
          session.view.invalidate();
          session.stats.invalidates += 1;
        }
      } catch (errorInvalidate) {
        session.stats.errors += 1;
      }
    }
    updateOverlayLabel(session);

    if (session.motionActive === true) {
      postFrameInternal(app, session, "continue");
      return;
    }

    session.stableAt = now();
    session.stats.idleStops += 1;
    transition(session, "STABLE", "no-change-stop");
    log(app, "d", "CANVAS_FRAME_IDLE_STOP callbacks=" + String(session.stats.frameCallbacks) +
      " posts=" + String(session.stats.framePosts) + " position=" + Number(session.position || 0).toFixed(3));
    publishDeferred(app, session, "STABLE");
  }

  function ensureEngine(app, session) {
    if (!session || !session.dispatcher) return { ok: false, error: "session-unavailable" };
    return session.dispatcher.runSync(function () {
      if (session.engineDisposed === true) return false;
      if (!session.choreographer) session.choreographer = android.view.Choreographer.getInstance();
      if (!session.frameCallback) {
        session.frameCallback = new android.view.Choreographer.FrameCallback({
          doFrame: function (frameTimeNanos) {
            try { handleFrame(app, session, Number(frameTimeNanos)); }
            catch (error) {
              session.stats.errors += 1;
              transition(session, "ERROR", "frame-callback");
              log(app, "e", "Canvas frame callback failed: " + errorText(error));
            }
          }
        });
      }
      return !!session.choreographer && !!session.frameCallback;
    }, 1800);
  }

  function createWindowBundle(app, session) {
    var m = metrics();
    var T0 = app.getSettingsColorScheme ? app.getSettingsColorScheme() : null;
    var T = {
      primary: T0 ? T0.primary : android.graphics.Color.parseColor("#FF6750A4"),
      onPrimary: T0 ? T0.onPrimary : android.graphics.Color.WHITE,
      onSurface: T0 ? T0.onSurface : android.graphics.Color.WHITE,
      onSurface2: T0 ? T0.onSurface2 : android.graphics.Color.LTGRAY,
      surface: T0 ? T0.surface : android.graphics.Color.parseColor("#FF202124"),
      surface2: T0 ? T0.surface2 : android.graphics.Color.parseColor("#FF2B2C30"),
      outline: T0 ? T0.outlineVariant : android.graphics.Color.GRAY
    };
    session.colors = T;

    var root = new android.widget.LinearLayout(context);
    root.setOrientation(android.widget.LinearLayout.VERTICAL);
    root.setPadding(m.dp(12), m.dp(10), m.dp(12), m.dp(12));
    root.setBackground(global.ShortXUI.Shape.strokeRect(T.surface, T.outline, m.dp(1), m.dp(18)));

    var title = new android.widget.TextView(context);
    title.setText("ShortXUI Canvas Frame Lab");
    title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    title.setTypeface(null, android.graphics.Typeface.BOLD);
    global.ShortXUI.Color.applyText(title, T.onSurface);
    root.addView(title, new android.widget.LinearLayout.LayoutParams(-1, -2));

    var desc = new android.widget.TextView(context);
    desc.setText("Choreographer 单帧合并；仅视觉状态变化时 invalidate，稳定后不再申请下一帧。");
    desc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
    desc.setPadding(0, m.dp(3), 0, m.dp(7));
    global.ShortXUI.Color.applyText(desc, T.onSurface2);
    root.addView(desc, new android.widget.LinearLayout.LayoutParams(-1, -2));

    var CanvasView = new JavaAdapter(android.view.View, {
      onDraw: function (canvas) {
        try { drawCanvas(session, canvas, this); }
        catch (error) {
          session.stats.errors += 1;
          log(app, "e", "Canvas draw failed: " + errorText(error));
        }
      },
      onTouchEvent: function (event) {
        try {
          if (!event) return false;
          var action = event.getActionMasked ? event.getActionMasked() : event.getAction();
          if (Number(action) === Number(android.view.MotionEvent.ACTION_UP)) {
            var target = Number(session.target || 0) >= 0.5 ? 0 : 1;
            app.startShortXUiCanvasMotion(target, 1, "canvas_tap");
            return true;
          }
          if (Number(action) === Number(android.view.MotionEvent.ACTION_DOWN)) return true;
        } catch (errorTouch) {
          session.stats.errors += 1;
        }
        return true;
      }
    }, context);
    try { CanvasView.setWillNotDraw(false); CanvasView.setClickable(true); } catch (eView) {}
    CanvasView.setBackground(global.ShortXUI.Shape.roundRect(T.surface2, m.dp(14)));
    session.view = CanvasView;
    root.addView(CanvasView, new android.widget.LinearLayout.LayoutParams(-1, m.dp(142)));

    var overlayLabel = new android.widget.TextView(context);
    overlayLabel.setText("ATTACHED");
    overlayLabel.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 10);
    overlayLabel.setTypeface(android.graphics.Typeface.MONOSPACE);
    overlayLabel.setPadding(0, m.dp(5), 0, 0);
    global.ShortXUI.Color.applyText(overlayLabel, T.onSurface2);
    root.addView(overlayLabel, new android.widget.LinearLayout.LayoutParams(-1, -2));
    session.overlayLabel = overlayLabel;

    function button(label, callback) {
      var view = new android.widget.TextView(context);
      view.setText(label);
      view.setGravity(android.view.Gravity.CENTER);
      view.setPadding(m.dp(5), m.dp(8), m.dp(5), m.dp(8));
      view.setBackground(global.ShortXUI.Shape.pressed(
        global.ShortXUI.Color.withAlpha(T.primary, 0.18),
        global.ShortXUI.Color.withAlpha(T.primary, 0.32),
        m.dp(10)
      ));
      global.ShortXUI.Color.applyText(view, T.onSurface);
      view.setOnClickListener(new android.view.View.OnClickListener({ onClick: callback }));
      return view;
    }

    function row(leftText, leftAction, rightText, rightAction) {
      var line = new android.widget.LinearLayout(context);
      line.setOrientation(android.widget.LinearLayout.HORIZONTAL);
      line.setPadding(0, m.dp(7), 0, 0);
      var left = button(leftText, leftAction);
      var right = button(rightText, rightAction);
      var lpLeft = new android.widget.LinearLayout.LayoutParams(0, m.dp(42), 1);
      lpLeft.rightMargin = m.dp(6);
      line.addView(left, lpLeft);
      line.addView(right, new android.widget.LinearLayout.LayoutParams(0, m.dp(42), 1));
      root.addView(line, new android.widget.LinearLayout.LayoutParams(-1, -2));
    }

    row("正向动画", function () { app.startShortXUiCanvasMotion(1, 1, "button_forward"); },
      "反向动画", function () { app.startShortXUiCanvasMotion(0, 1, "button_reverse"); });
    row("重复当前目标", function () { app.startShortXUiCanvasMotion(session.target, 8, "button_no_change"); },
      "停在当前帧", function () { app.stopShortXUiCanvasMotion("button_stop"); });
    row("刷新状态", function () { app.refreshShortXUiCanvasState(); },
      "关闭实验窗", function () { app.closeShortXUiCanvasWindow(true, "button"); });

    var lp = new android.view.WindowManager.LayoutParams();
    lp.width = m.dp(340);
    lp.height = android.view.WindowManager.LayoutParams.WRAP_CONTENT;
    lp.type = android.os.Build.VERSION.SDK_INT >= 26 ?
      android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY :
      android.view.WindowManager.LayoutParams.TYPE_PHONE;
    lp.flags = android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
      android.view.WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
      android.view.WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN;
    lp.format = android.graphics.PixelFormat.TRANSLUCENT;
    lp.gravity = android.view.Gravity.TOP | android.view.Gravity.LEFT;
    lp.x = m.dp(14);
    lp.y = m.dp(86);
    try { lp.setTitle("ShortXUI Canvas Frame Lab"); } catch (eTitle) {}

    session.root = root;
    return { view: root, params: lp };
  }

  proto.openShortXUiCanvasWindow = function () {
    if (!this.state) this.state = {};
    var cap = capability();
    if (!cap.ok) {
      var unavailable = { ok: false, code: "RUNTIME_MISMATCH", capability: cap };
      this.state.shortXUiCanvasLastResult = unavailable;
      persist(this);
      refreshStatus(this);
      return unavailable;
    }
    var old = this.state.shortXUiCanvasSession;
    if (old && old.host && old.host.getState && old.host.getState() !== "DISPOSED") {
      var already = { ok: true, code: "ALREADY_OPEN", snapshot: sessionSnapshot(old) };
      this.state.shortXUiCanvasLastResult = already;
      persist(this);
      refreshStatus(this);
      return already;
    }

    var dispatcher = global.ShortXUI.Dispatcher.fromHandler(this.state.h, "shortx-ui-canvas-frame");
    var host = global.ShortXUI.WindowHost.create({
      name: "toolhub-canvas-frame-lab",
      dispatcher: dispatcher,
      windowManager: this.state.wm,
      timeoutMs: 1800
    });
    var session = {
      generation: now(),
      lifecycle: "OPENING",
      host: host,
      dispatcher: dispatcher,
      root: null,
      view: null,
      overlayLabel: null,
      colors: null,
      choreographer: null,
      frameCallback: null,
      framePosted: false,
      motionActive: false,
      engineDisposed: false,
      cancelled: false,
      position: 0,
      target: 0,
      fromPosition: 0,
      durationMs: phase.MOTION_DURATION_MS,
      motionStartNanos: 0,
      lastFrameAt: 0,
      stableAt: 0,
      lastFrameReason: "",
      dirty: true,
      hardwareCanvas: false,
      stats: defaultStats(),
      transitions: []
    };
    this.state.shortXUiCanvasSession = session;
    var self = this;
    var prepared = host.prepare(function () { return createWindowBundle(self, session); });
    var attached = prepared.ok ? host.attach(1800) : prepared;
    if (!attached.ok) {
      session.stats.errors += 1;
      transition(session, "ERROR", "attach-failed");
      try { host.dispose(1800); } catch (e0) {}
      try { dispatcher.dispose(); } catch (e1) {}
      this.state.shortXUiCanvasSession = null;
      var failed = { ok: false, code: String(attached.code || "ATTACH_FAILED"), prepared: prepared, attached: attached, snapshot: sessionSnapshot(session) };
      this.state.shortXUiCanvasLastResult = failed;
      persist(this);
      refreshStatus(this);
      return failed;
    }
    transition(session, "ATTACHED", "window-attached");
    var engine = ensureEngine(this, session);
    if (!engine.ok || engine.value !== true) {
      session.stats.errors += 1;
      transition(session, "ERROR", "engine-init-failed");
    } else {
      var initial = dispatcher.runSync(function () {
        try {
          if (session.view) {
            session.view.invalidate();
            session.stats.invalidates += 1;
          }
          updateOverlayLabel(session);
          return true;
        } catch (e2) { return false; }
      }, 1800);
      if (!initial.ok || initial.value !== true) session.stats.errors += 1;
    }
    var result = {
      ok: session.stats.errors === 0,
      code: session.stats.errors === 0 ? "ATTACHED" : "ENGINE_INIT_FAILED",
      prepared: prepared,
      attached: attached,
      snapshot: sessionSnapshot(session)
    };
    this.state.shortXUiCanvasLastResult = result;
    persist(this);
    refreshStatus(this);
    return result;
  };

  proto.startShortXUiCanvasMotion = function (target, burstCount, reason) {
    if (!this.state) this.state = {};
    var open = this.openShortXUiCanvasWindow();
    if (!open || open.ok !== true) return open;
    var session = this.state.shortXUiCanvasSession;
    if (!session || !session.dispatcher) return { ok: false, code: "NOT_OPEN" };
    var requestedTarget = clamp01(target);
    var burst = Math.max(1, Math.min(32, Number(burstCount || 1)));
    var self = this;
    var started = session.dispatcher.runSync(function () {
      if (session.cancelled === true || session.engineDisposed === true) return { ok: false, code: "ENGINE_DISPOSED" };
      var current = clamp01(session.position);
      session.target = requestedTarget;
      if (abs(requestedTarget - current) <= 0.0001 && session.motionActive !== true) {
        session.stats.noChangeStarts += 1;
        session.stableAt = now();
        transition(session, "STABLE", "no-change-request");
        updateOverlayLabel(session);
        return {
          ok: true,
          code: "NO_CHANGE_STABLE",
          framePosts: session.stats.framePosts,
          frameCallbacks: session.stats.frameCallbacks,
          invalidates: session.stats.invalidates
        };
      }
      session.fromPosition = current;
      session.motionStartNanos = 0;
      session.durationMs = phase.MOTION_DURATION_MS;
      session.motionActive = true;
      session.dirty = true;
      transition(session, "RUNNING", String(reason || "start"));
      var i;
      for (i = 0; i < burst; i += 1) postFrameInternal(self, session, i === 0 ? "start" : "burst");
      updateOverlayLabel(session);
      return { ok: true, code: "RUNNING", burst: burst };
    }, 1800);
    var result;
    if (!started.ok) result = { ok: false, code: "START_DISPATCH_FAILED", error: errorText(started.error), snapshot: sessionSnapshot(session) };
    else {
      result = started.value || { ok: false, code: "START_FAILED" };
      result.snapshot = sessionSnapshot(session);
    }
    this.state.shortXUiCanvasLastResult = result;
    persist(this);
    refreshStatus(this);
    return result;
  };

  proto.stopShortXUiCanvasMotion = function (reason) {
    var session = this.state ? this.state.shortXUiCanvasSession : null;
    if (!session || !session.dispatcher) return { ok: true, code: "ALREADY_STOPPED" };
    var stopped = session.dispatcher.runSync(function () {
      session.motionActive = false;
      session.target = clamp01(session.position);
      session.motionStartNanos = 0;
      if (session.framePosted === true && session.choreographer && session.frameCallback) {
        try {
          session.choreographer.removeFrameCallback(session.frameCallback);
          session.stats.cancelledCallbacks += 1;
        } catch (e0) { session.stats.errors += 1; }
        session.framePosted = false;
      }
      session.stats.manualStops += 1;
      session.stableAt = now();
      transition(session, "STABLE", String(reason || "manual-stop"));
      updateOverlayLabel(session);
      return true;
    }, 1800);
    var result = { ok: stopped.ok === true && stopped.value === true, code: stopped.ok ? "STABLE" : "STOP_FAILED", snapshot: sessionSnapshot(session) };
    this.state.shortXUiCanvasLastResult = result;
    persist(this);
    refreshStatus(this);
    return result;
  };

  proto.refreshShortXUiCanvasState = function () {
    if (!this.state) this.state = {};
    var session = this.state.shortXUiCanvasSession || null;
    var result = { ok: capability().ok, code: "REFRESHED", capability: capability(), snapshot: sessionSnapshot(session) };
    this.state.shortXUiCanvasLastResult = result;
    persist(this);
    refreshStatus(this);
    return result;
  };

  proto.closeShortXUiCanvasWindow = function (immediate, reason) {
    if (!this.state) this.state = {};
    var session = this.state.shortXUiCanvasSession;
    if (!session || !session.host) {
      var already = { ok: true, code: "ALREADY_CLOSED", state: "DISPOSED", reason: String(reason || "") };
      this.state.shortXUiCanvasLastResult = already;
      persist(this);
      refreshStatus(this);
      return already;
    }
    session.cancelled = true;
    transition(session, "CLOSING", String(reason || (immediate ? "close-immediate" : "close-normal")));
    var cleanup = session.dispatcher.runSync(function () {
      session.motionActive = false;
      if (session.framePosted === true && session.choreographer && session.frameCallback) {
        try {
          session.choreographer.removeFrameCallback(session.frameCallback);
          session.stats.cancelledCallbacks += 1;
        } catch (e0) { session.stats.errors += 1; }
      }
      session.framePosted = false;
      session.engineDisposed = true;
      session.frameCallback = null;
      session.choreographer = null;
      updateOverlayLabel(session);
      return true;
    }, 1800);
    if (!cleanup.ok || cleanup.value !== true) session.stats.errors += 1;
    var removed = session.host.remove(immediate === true, 1800);
    var disposed = removed.ok ? session.host.dispose(1800) : { ok: false, code: "NOT_DISPOSED" };
    if (immediate === true) session.stats.immediateCloses += 1;
    else session.stats.normalCloses += 1;
    if (!removed.ok || !disposed.ok) session.stats.errors += 1;
    transition(session, disposed.ok ? "DISPOSED" : "ERROR", disposed.ok ? "close-complete" : "close-failed");
    try { session.dispatcher.dispose(); } catch (e1) {}
    var result = {
      ok: removed.ok === true && disposed.ok === true && session.stats.errors === 0,
      code: String(removed.code || ""),
      immediate: immediate === true,
      reason: String(reason || ""),
      cleanup: cleanup,
      removed: removed,
      disposed: disposed,
      snapshot: sessionSnapshot(session)
    };
    this.state.shortXUiCanvasSession = null;
    this.state.shortXUiCanvasLastResult = result;
    persist(this);
    refreshStatus(this);
    return result;
  };

  proto.runShortXUiCanvasStress = function () {
    if (!this.state) this.state = {};
    var cap = capability();
    if (!cap.ok) {
      var unavailable = { schema: 1, ok: false, running: false, code: "RUNTIME_MISMATCH", capability: cap };
      this.state.shortXUiCanvasStressResult = unavailable;
      persist(this);
      refreshStatus(this);
      return unavailable;
    }
    var existing = this.state.shortXUiCanvasStressResult;
    if (existing && existing.running === true) return existing;
    try { this.closeShortXUiCanvasWindow(true, "stress-reset"); } catch (e0) {}

    var self = this;
    var handler = new android.os.Handler(android.os.Looper.getMainLooper());
    var stress = {
      schema: 1,
      runtimeVersion: cap.runtimeVersion,
      wrapperVersion: phase.VERSION,
      ok: false,
      running: true,
      startedAt: now(),
      finishedAt: 0,
      durationMs: 0,
      cyclesRequested: phase.STRESS_CYCLES,
      cyclesCompleted: 0,
      settlePasses: 0,
      idleStopPasses: 0,
      noChangeStopPasses: 0,
      closeWhileRunningPasses: 0,
      coalescedPasses: 0,
      normalCloses: 0,
      immediateCloses: 0,
      totalFrameCallbacks: 0,
      totalDraws: 0,
      totalCoalescedRequests: 0,
      lateCallbacks: 0,
      timeouts: 0,
      errors: 0,
      cycles: []
    };
    this.state.shortXUiCanvasStressResult = stress;
    persist(this);
    refreshStatus(this);

    function schedule(callback, delayMs) {
      handler.postDelayed(new java.lang.Runnable({ run: function () {
        try { callback(); }
        catch (error) { fail(-1, "UNCAUGHT", errorText(error)); }
      }}), Math.max(0, Number(delayMs || 0)));
    }

    function fail(index, code, detail) {
      if (stress.running !== true) return;
      stress.running = false;
      stress.ok = false;
      stress.finishedAt = now();
      stress.durationMs = Math.max(0, stress.finishedAt - stress.startedAt);
      stress.errors += 1;
      stress.cycles.push({ index: index >= 0 ? index + 1 : 0, ok: false, code: String(code || "FAILED"), detail: detail || null });
      try { self.closeShortXUiCanvasWindow(true, "stress-fail"); } catch (e0) {}
      persist(self);
      refreshStatus(self);
      log(self, "e", "CANVAS_STRESS_FAIL index=" + String(index + 1) + " code=" + String(code || "FAILED"));
    }

    function finish() {
      stress.running = false;
      stress.ok = stress.cyclesCompleted === phase.STRESS_CYCLES &&
        stress.settlePasses === phase.STRESS_CYCLES / 2 &&
        stress.idleStopPasses === phase.STRESS_CYCLES / 2 &&
        stress.noChangeStopPasses === phase.STRESS_CYCLES / 2 &&
        stress.closeWhileRunningPasses === phase.STRESS_CYCLES / 2 &&
        stress.coalescedPasses === phase.STRESS_CYCLES &&
        stress.normalCloses === phase.STRESS_CYCLES / 2 &&
        stress.immediateCloses === phase.STRESS_CYCLES / 2 &&
        stress.lateCallbacks === 0 && stress.timeouts === 0 && stress.errors === 0;
      stress.finishedAt = now();
      stress.durationMs = Math.max(0, stress.finishedAt - stress.startedAt);
      persist(self);
      refreshStatus(self);
      log(self, stress.ok ? "i" : "e", "CANVAS_STRESS_DONE ok=" + String(stress.ok) +
        " completed=" + String(stress.cyclesCompleted) + "/" + String(phase.STRESS_CYCLES) +
        " callbacks=" + String(stress.totalFrameCallbacks) + " late=" + String(stress.lateCallbacks));
    }

    function waitFor(index, name, predicate, onPass, startedAt) {
      if (stress.running !== true) return;
      var start = Number(startedAt || now());
      var passed = false;
      try { passed = predicate() === true; } catch (errorPredicate) {
        fail(index, name + "_PREDICATE_ERROR", errorText(errorPredicate));
        return;
      }
      if (passed) {
        onPass();
        return;
      }
      if (now() - start >= phase.WAIT_TIMEOUT_MS) {
        stress.timeouts += 1;
        fail(index, name + "_TIMEOUT", self.refreshShortXUiCanvasState());
        return;
      }
      schedule(function () { waitFor(index, name, predicate, onPass, start); }, phase.WAIT_INTERVAL_MS);
    }

    function accumulate(session) {
      var stats = session && session.stats ? session.stats : {};
      stress.totalFrameCallbacks += Number(stats.frameCallbacks || 0);
      stress.totalDraws += Number(stats.draws || 0);
      stress.totalCoalescedRequests += Number(stats.coalescedRequests || 0);
      stress.lateCallbacks += Number(stats.lateCallbacks || 0);
      if (Number(stats.coalescedRequests || 0) >= 8) stress.coalescedPasses += 1;
    }

    function closeAndNext(index, session, immediate, mode, extra) {
      var closeResult = self.closeShortXUiCanvasWindow(immediate, "stress_" + String(mode));
      if (!closeResult || closeResult.ok !== true) {
        fail(index, "CLOSE_FAILED", closeResult || null);
        return;
      }
      accumulate(session);
      if (immediate) stress.immediateCloses += 1;
      else stress.normalCloses += 1;
      stress.cyclesCompleted += 1;
      var row = {
        index: index + 1,
        ok: true,
        mode: String(mode),
        immediate: immediate === true,
        closeCode: String(closeResult.code || ""),
        callbacks: Number(session.stats.frameCallbacks || 0),
        draws: Number(session.stats.draws || 0),
        coalesced: Number(session.stats.coalescedRequests || 0),
        idleStops: Number(session.stats.idleStops || 0),
        noChangeStarts: Number(session.stats.noChangeStarts || 0),
        cancelledCallbacks: Number(session.stats.cancelledCallbacks || 0),
        lateCallbacks: Number(session.stats.lateCallbacks || 0)
      };
      var key;
      if (extra) for (key in extra) if (extra.hasOwnProperty(key)) row[key] = extra[key];
      stress.cycles.push(row);
      persist(self);
      refreshStatus(self);
      schedule(function () { next(index + 1); }, 140);
    }

    function runSettleCycle(index, session) {
      var started = self.startShortXUiCanvasMotion(1, 12, "stress_settle");
      if (!started || started.ok !== true || String(started.code || "") !== "RUNNING") {
        fail(index, "START_SETTLE_FAILED", started || null);
        return;
      }
      waitFor(index, "SETTLE", function () {
        return session.motionActive !== true && session.framePosted !== true &&
          String(session.lifecycle || "") === "STABLE" && abs(Number(session.position || 0) - 1) <= 0.0001;
      }, function () {
        stress.settlePasses += 1;
        var callbacksAtStable = Number(session.stats.frameCallbacks || 0);
        var postsAtStable = Number(session.stats.framePosts || 0);
        schedule(function () {
          if (Number(session.stats.frameCallbacks || 0) !== callbacksAtStable ||
              Number(session.stats.framePosts || 0) !== postsAtStable || session.framePosted === true) {
            fail(index, "IDLE_FRAME_CONTINUED", sessionSnapshot(session));
            return;
          }
          stress.idleStopPasses += 1;
          var repeat = self.startShortXUiCanvasMotion(1, 8, "stress_no_change");
          if (!repeat || repeat.ok !== true || String(repeat.code || "") !== "NO_CHANGE_STABLE") {
            fail(index, "NO_CHANGE_REQUEST_FAILED", repeat || null);
            return;
          }
          var callbacksBefore = Number(session.stats.frameCallbacks || 0);
          var postsBefore = Number(session.stats.framePosts || 0);
          var invalidatesBefore = Number(session.stats.invalidates || 0);
          schedule(function () {
            if (Number(session.stats.frameCallbacks || 0) !== callbacksBefore ||
                Number(session.stats.framePosts || 0) !== postsBefore ||
                Number(session.stats.invalidates || 0) !== invalidatesBefore || session.framePosted === true) {
              fail(index, "NO_CHANGE_SCHEDULED_FRAME", sessionSnapshot(session));
              return;
            }
            stress.noChangeStopPasses += 1;
            closeAndNext(index, session, false, "settle_idle", {
              callbacksAtStable: callbacksAtStable,
              postsAtStable: postsAtStable
            });
          }, phase.NO_CHANGE_OBSERVE_MS);
        }, phase.IDLE_OBSERVE_MS);
      }, now());
    }

    function runCloseWhileRunningCycle(index, session) {
      var started = self.startShortXUiCanvasMotion(1, 12, "stress_close_running");
      if (!started || started.ok !== true || String(started.code || "") !== "RUNNING") {
        fail(index, "START_RUNNING_FAILED", started || null);
        return;
      }
      waitFor(index, "RUNNING_FRAMES", function () {
        return session.motionActive === true && Number(session.stats.frameCallbacks || 0) >= 2;
      }, function () {
        var closeResult = self.closeShortXUiCanvasWindow(true, "stress_close_running");
        if (!closeResult || closeResult.ok !== true) {
          fail(index, "RUNNING_CLOSE_FAILED", closeResult || null);
          return;
        }
        schedule(function () {
          if (session.framePosted === true || session.engineDisposed !== true || Number(session.stats.lateCallbacks || 0) !== 0) {
            fail(index, "POST_CLOSE_FRAME_LEAK", sessionSnapshot(session));
            return;
          }
          stress.closeWhileRunningPasses += 1;
          accumulate(session);
          stress.immediateCloses += 1;
          stress.cyclesCompleted += 1;
          stress.cycles.push({
            index: index + 1,
            ok: true,
            mode: "close_while_running",
            immediate: true,
            closeCode: String(closeResult.code || ""),
            callbacks: Number(session.stats.frameCallbacks || 0),
            draws: Number(session.stats.draws || 0),
            coalesced: Number(session.stats.coalescedRequests || 0),
            cancelledCallbacks: Number(session.stats.cancelledCallbacks || 0),
            lateCallbacks: Number(session.stats.lateCallbacks || 0)
          });
          persist(self);
          refreshStatus(self);
          schedule(function () { next(index + 1); }, 140);
        }, phase.CLOSE_OBSERVE_MS);
      }, now());
    }

    function next(index) {
      if (stress.running !== true) return;
      if (index >= phase.STRESS_CYCLES) {
        finish();
        return;
      }
      var opened = self.openShortXUiCanvasWindow();
      if (!opened || opened.ok !== true) {
        fail(index, "OPEN_FAILED", opened || null);
        return;
      }
      var session = self.state ? self.state.shortXUiCanvasSession : null;
      if (!session) {
        fail(index, "SESSION_MISSING", null);
        return;
      }
      if (index % 2 === 0) runSettleCycle(index, session);
      else runCloseWhileRunningCycle(index, session);
    }

    log(this, "i", "CANVAS_STRESS_BEGIN cycles=" + String(phase.STRESS_CYCLES));
    schedule(function () { next(0); }, 0);
    return stress;
  };

  var oldBuildLab = proto.buildShortXUiLabPanelView;
  if (typeof oldBuildLab === "function") {
    proto.buildShortXUiLabPanelView = function () {
      var panel = oldBuildLab.call(this);
      var self = this;
      try {
        var scroll = panel.getChildAt(panel.getChildCount() - 1);
        var content = scroll && scroll.getChildCount ? scroll.getChildAt(0) : null;
        if (!content || !content.addView) return panel;
        var m = metrics();
        var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
        var primary = T ? T.primary : android.graphics.Color.parseColor("#FF6750A4");
        var onSurface = T ? T.onSurface : android.graphics.Color.WHITE;
        var onSurface2 = T ? T.onSurface2 : android.graphics.Color.LTGRAY;
        var surface = T ? T.surface : android.graphics.Color.parseColor("#FF202124");
        var surface2 = T ? T.surface2 : android.graphics.Color.parseColor("#FF2B2C30");
        var outline = T ? T.outlineVariant : android.graphics.Color.GRAY;

        var box = new android.widget.LinearLayout(context);
        box.setOrientation(android.widget.LinearLayout.VERTICAL);
        box.setPadding(m.dp(12), m.dp(10), m.dp(12), m.dp(12));
        box.setBackground(global.ShortXUI.Shape.strokeRect(surface2, outline, m.dp(1), m.dp(16)));

        var title = new android.widget.TextView(context);
        title.setText("Canvas + 动画帧生命周期");
        title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        global.ShortXUI.Color.applyText(title, onSurface);
        box.addView(title, new android.widget.LinearLayout.LayoutParams(-1, -2));

        var desc = new android.widget.TextView(context);
        desc.setText("独立 Canvas Overlay：Choreographer 帧合并、状态变化才 invalidate、稳定后无变化停帧、运行中关闭清理。Phase 4 r4 仍待最近任务/Home复测。");
        desc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
        desc.setPadding(0, m.dp(3), 0, m.dp(8));
        global.ShortXUI.Color.applyText(desc, onSurface2);
        box.addView(desc, new android.widget.LinearLayout.LayoutParams(-1, -2));

        var status = new android.widget.TextView(context);
        status.setText(format(this));
        status.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
        status.setTypeface(android.graphics.Typeface.MONOSPACE);
        status.setPadding(m.dp(10), m.dp(9), m.dp(10), m.dp(9));
        status.setBackground(global.ShortXUI.Shape.roundRect(surface, m.dp(12)));
        global.ShortXUI.Color.applyText(status, onSurface2);
        box.addView(status, new android.widget.LinearLayout.LayoutParams(-1, -2));
        this.state.shortXUiCanvasStatusView = status;

        function addRow(items) {
          var row = new android.widget.LinearLayout(context);
          row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
          var i;
          for (i = 0; i < items.length; i += 1) {
            var button = self.ui.createFlatButton(self, items[i].title, primary, items[i].action);
            var lp = new android.widget.LinearLayout.LayoutParams(0, m.dp(46), 1);
            if (i > 0) lp.leftMargin = m.dp(6);
            row.addView(button, lp);
          }
          var rowLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
          rowLp.topMargin = m.dp(7);
          box.addView(row, rowLp);
        }

        addRow([
          { title: "打开 Canvas 窗口", action: function () { self.openShortXUiCanvasWindow(); refreshStatus(self); } },
          { title: "正向动画", action: function () { self.startShortXUiCanvasMotion(1, 1, "lab_forward"); refreshStatus(self); } }
        ]);
        addRow([
          { title: "反向动画", action: function () { self.startShortXUiCanvasMotion(0, 1, "lab_reverse"); refreshStatus(self); } },
          { title: "重复当前目标", action: function () {
            var session = self.state ? self.state.shortXUiCanvasSession : null;
            self.startShortXUiCanvasMotion(session ? session.target : 0, 8, "lab_no_change");
            refreshStatus(self);
          } }
        ]);
        addRow([
          { title: "停在当前帧", action: function () { self.stopShortXUiCanvasMotion("lab_stop"); refreshStatus(self); } },
          { title: "关闭实验窗口", action: function () { self.closeShortXUiCanvasWindow(true, "lab_button"); } }
        ]);
        addRow([
          { title: "运行 20 次帧生命周期测试", action: function () { self.runShortXUiCanvasStress(); refreshStatus(self); } }
        ]);

        var cap = capability();
        if (!cap.ok) {
          try { box.setAlpha(0.55); } catch (eAlpha) {}
        }
        var boxLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
        boxLp.bottomMargin = m.dp(10);
        content.addView(box, boxLp);

        function patchBoundary(view) {
          if (!view) return;
          try {
            if (view instanceof android.widget.TextView) {
              var text = String(view.getText ? view.getText() : "");
              if (text.indexOf("Diagnostics / WindowHost / IME / Gesture") >= 0 && text.indexOf(" / Canvas") < 0) {
                text = text.replace("Diagnostics / WindowHost / IME / Gesture", "Diagnostics / WindowHost / IME / Gesture / Canvas");
              }
              text = text.replace("未启用：Canvas / DEX Bridge", "未启用：DEX Bridge");
              view.setText(text);
            }
          } catch (e0) {}
          try {
            if (view.getChildCount) {
              var j;
              for (j = 0; j < view.getChildCount(); j += 1) patchBoundary(view.getChildAt(j));
            }
          } catch (e1) {}
        }
        patchBoundary(panel);
      } catch (error) {
        log(this, "e", "build ShortXUI canvas lab section failed: " + errorText(error));
      }
      return panel;
    };
  }

  var oldGetState = proto.getShortXUiLabState;
  if (typeof oldGetState === "function") {
    proto.getShortXUiLabState = function () {
      var state = oldGetState.call(this) || {};
      state.canvasCapability = capability();
      state.canvas = this.state ? this.state.shortXUiCanvasLastResult || sessionSnapshot(this.state.shortXUiCanvasSession || null) : null;
      state.canvasStress = this.state ? this.state.shortXUiCanvasStressResult || null : null;
      return state;
    };
  }

  var oldClose = proto.close;
  if (typeof oldClose === "function") {
    proto.close = function () {
      try {
        if (this.state && this.state.shortXUiCanvasSession) this.closeShortXUiCanvasWindow(true, "toolhub_close");
      } catch (e0) {
        log(this, "w", "ShortXUI canvas close cleanup failed: " + errorText(e0));
      }
      return oldClose.apply(this, arguments);
    };
  }

  global.ToolHubBetaPhase5 = phase;
  proto.__toolHubShortXUiCanvasPhase5Installed = true;
  try { writeLog("ShortXUI Canvas phase5 installed version=" + phase.VERSION); } catch (eLog) {}
}(function () { return this; }()));
