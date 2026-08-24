// ToolHub Beta ShortXUI Gesture + system back phase-4 lab. Rhino ES5.
(function (global) {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
  var proto = FloatBallAppWM.prototype;
  if (proto.__toolHubShortXUiGesturePhase4Installed === true) return;

  var phase = {
    VERSION: "0.5.0-beta-gesture",
    STRESS_CYCLES: 30,
    REGISTER_RETRY_MS: 120,
    REGISTER_RETRY_LIMIT: 12
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

  function capability() {
    var sx = null;
    var hasBackApi = false;
    var hasAnimationApi = false;
    try { sx = global.ShortXUI || null; } catch (e0) { sx = null; }
    try {
      hasBackApi = Number(android.os.Build.VERSION.SDK_INT) >= 33 &&
        !!Packages.android.window.OnBackInvokedCallback &&
        !!Packages.android.window.OnBackInvokedDispatcher;
    } catch (e1) { hasBackApi = false; }
    try {
      hasAnimationApi = Number(android.os.Build.VERSION.SDK_INT) >= 34 &&
        !!Packages.android.window.OnBackAnimationCallback;
    } catch (e2) { hasAnimationApi = false; }
    return {
      ok: !!(sx && sx.WindowHost && typeof sx.WindowHost.create === "function" &&
        sx.Dispatcher && typeof sx.Dispatcher.fromHandler === "function"),
      runtimeInstalled: !!sx,
      runtimeVersion: sx ? String(sx.VERSION || "") : "",
      hasWindowHost: !!(sx && sx.WindowHost && typeof sx.WindowHost.create === "function"),
      hasDispatcher: !!(sx && sx.Dispatcher && typeof sx.Dispatcher.fromHandler === "function"),
      hasOnBackInvoked: hasBackApi,
      hasOnBackAnimation: hasAnimationApi,
      supportsOutsideTouch: true,
      sdk: Number(android.os.Build.VERSION.SDK_INT),
      wrapperVersion: phase.VERSION
    };
  }

  function transition(session, next, reason) {
    if (!session) return;
    var from = String(session.lifecycle || "IDLE");
    var to = String(next || from);
    if (from === to) return;
    session.transitions.push({ from: from, to: to, reason: String(reason || ""), at: now() });
    session.lifecycle = to;
  }

  function readIme(session) {
    var result = { visible: false, height: 0, source: "none" };
    if (!session || !session.root) return result;
    try {
      if (android.os.Build.VERSION.SDK_INT >= 30) {
        var insets = session.root.getRootWindowInsets();
        if (insets) {
          var type = android.view.WindowInsets.Type.ime();
          result.visible = insets.isVisible(type) === true;
          result.height = Number(insets.getInsets(type).bottom || 0);
          result.source = "window_insets";
          return result;
        }
      }
    } catch (e0) {}
    try {
      var rect = new android.graphics.Rect();
      session.root.getWindowVisibleDisplayFrame(rect);
      var rootHeight = Number(session.root.getRootView().getHeight() || 0);
      var diff = Math.max(0, rootHeight - Number(rect.bottom || 0));
      result.height = diff;
      result.visible = diff > metrics().dp(100);
      result.source = "visible_frame";
    } catch (e1) {}
    return result;
  }

  function resetBackVisual(session) {
    if (!session || !session.card) return;
    try {
      session.card.animate().cancel();
      session.card.setScaleX(1);
      session.card.setScaleY(1);
      session.card.setTranslationX(0);
      session.card.setAlpha(1);
    } catch (e) {}
    session.progress = 0;
  }

  function applyBackVisual(session, progress, edge) {
    if (!session || !session.card) return;
    var p = Math.max(0, Math.min(1, Number(progress || 0)));
    var direction = Number(edge || 0) === 1 ? -1 : 1;
    try {
      session.card.setScaleX(1 - p * 0.04);
      session.card.setScaleY(1 - p * 0.04);
      session.card.setTranslationX(direction * metrics().dp(20) * p);
      session.card.setAlpha(1 - p * 0.12);
    } catch (e) {}
    session.progress = p;
    if (p > Number(session.stats.maxProgress || 0)) session.stats.maxProgress = p;
  }

  function sessionSnapshot(session) {
    if (!session) {
      return {
        state: "IDLE",
        open: false,
        depth: 0,
        imeVisible: false,
        callbackRegistered: false,
        callbackType: "none",
        receiverRegistered: false,
        stats: {
          backStarted: 0,
          backProgressed: 0,
          backCancelled: 0,
          backInvoked: 0,
          imePriority: 0,
          pagePops: 0,
          rootCloses: 0,
          outsideDismisses: 0,
          recentsDismisses: 0,
          homeDismisses: 0,
          callbackRegisterErrors: 0,
          errors: 0
        },
        transitions: []
      };
    }
    var ime = readIme(session);
    return {
      state: String(session.lifecycle || "IDLE"),
      open: !!(session.host && session.host.getState && session.host.getState() !== "DISPOSED"),
      depth: Number(session.depth || 0),
      imeVisible: ime.visible === true,
      imeHeight: Number(ime.height || 0),
      imeSource: String(ime.source || ""),
      focused: !!(session.edit && session.edit.hasFocus && session.edit.hasFocus()),
      callbackRegistered: session.callbackRegistered === true,
      callbackType: String(session.callbackType || "none"),
      callbackPriority: Number(session.callbackPriority || 0),
      receiverRegistered: session.receiverRegistered === true,
      progress: Number(session.progress || 0),
      host: session.host && session.host.snapshot ? session.host.snapshot() : null,
      dispatcher: session.dispatcher && session.dispatcher.getState ? session.dispatcher.getState() : null,
      stats: JSON.parse(JSON.stringify(session.stats || {})),
      transitions: JSON.parse(JSON.stringify(session.transitions || []))
    };
  }

  function persist(app) {
    var out = null;
    var temp = null;
    try {
      if (!app || !app.state) return false;
      var root = "";
      try { if (typeof getToolHubRootDir === "function") root = String(getToolHubRootDir() || ""); } catch (e0) {}
      if (!root && typeof APP_ROOT_DIR !== "undefined") root = String(APP_ROOT_DIR || "");
      if (!root) return false;
      var target = new java.io.File(root + "/diagnostics/shortx-ui/latest.json");
      var parent = target.getParentFile();
      if (parent && !parent.exists() && !parent.mkdirs() && !parent.exists()) return false;
      temp = new java.io.File(target.getAbsolutePath() + ".tmp");
      var cap = capability();
      var payload = {
        schema: 5,
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
          !(app.state.shortXUiGestureStressResult && app.state.shortXUiGestureStressResult.ok === false),
        savedAt: now(),
        capability: cap,
        basic: app.state.shortXUiLabLastResult || null,
        dispatcher: app.state.shortXUiLabLastDispatcherResult || null,
        windowHost: app.state.shortXUiLabLastWindowResult || null,
        windowStress: app.state.shortXUiLabLastWindowStressResult || null,
        imeFocus: app.state.shortXUiImeLastResult || null,
        imeStress: app.state.shortXUiImeStressResult || null,
        gesture: app.state.shortXUiGestureLastResult || sessionSnapshot(app.state.shortXUiGestureSession || null),
        gestureStress: app.state.shortXUiGestureStressResult || null
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
      log(app, "w", "ShortXUI gesture diagnostics save failed: " + errorText(error));
      return false;
    } finally {
      try { if (out) out.close(); } catch (e1) {}
      try { if (temp && temp.exists()) temp.delete(); } catch (e2) {}
    }
  }

  function format(app) {
    var cap = capability();
    var session = app && app.state ? app.state.shortXUiGestureSession : null;
    var snap = sessionSnapshot(session);
    var stress = app && app.state ? app.state.shortXUiGestureStressResult : null;
    var lines = [];
    lines.push("Gesture + 系统返回：" + (cap.ok ? "可用" : "不可用"));
    lines.push("SDK=" + String(cap.sdk) + " predictive=" + String(cap.hasOnBackInvoked) + " animation=" + String(cap.hasOnBackAnimation));
    lines.push("状态=" + String(snap.state) + " open=" + String(snap.open) + " depth=" + String(snap.depth));
    lines.push("callback=" + String(snap.callbackRegistered) + " type=" + String(snap.callbackType));
    lines.push("IME=" + String(snap.imeVisible) + " focus=" + String(snap.focused) + " progress=" + Number(snap.progress || 0).toFixed(2));
    lines.push("started=" + String(Number(snap.stats.backStarted || 0)) +
      " progress=" + String(Number(snap.stats.backProgressed || 0)) +
      " cancel=" + String(Number(snap.stats.backCancelled || 0)) +
      " invoke=" + String(Number(snap.stats.backInvoked || 0)));
    lines.push("imeBack=" + String(Number(snap.stats.imePriority || 0)) +
      " pop=" + String(Number(snap.stats.pagePops || 0)) +
      " close=" + String(Number(snap.stats.rootCloses || 0)) +
      " outside=" + String(Number(snap.stats.outsideDismisses || 0)));
    lines.push("recents=" + String(Number(snap.stats.recentsDismisses || 0)) +
      " home=" + String(Number(snap.stats.homeDismisses || 0)) +
      " errors=" + String(Number(snap.stats.errors || 0)));
    if (stress) {
      lines.push("");
      lines.push("逻辑压力测试：" + (stress.running ? "运行中" : (stress.ok ? "通过" : "失败")));
      lines.push("完成=" + String(Number(stress.cyclesCompleted || 0)) + "/" + String(Number(stress.cyclesRequested || 0)) +
        " register=" + String(Number(stress.callbackRegistrations || 0)) +
        " ime=" + String(Number(stress.imePriorityPasses || 0)) +
        " pop=" + String(Number(stress.pagePopPasses || 0)) +
        " close=" + String(Number(stress.rootClosePasses || 0)));
    }
    if (!cap.ok) lines.push("Runtime/Lab 能力不完整，请完整停止并重新运行 Beta");
    return lines.join("\n");
  }

  function refreshStatus(app) {
    if (!app || !app.state) return;
    var status = app.state.shortXUiGestureStatusView || null;
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
    try { update(); } catch (e2) {}
  }

  function updatePage(session) {
    if (!session) return;
    try {
      if (session.pageTitle) session.pageTitle.setText("实验层级 " + String(Number(session.depth || 1)) + " / 3");
      if (session.pageDesc) {
        session.pageDesc.setText(Number(session.depth || 1) > 1 ?
          "系统返回应先退回上一层，不关闭窗口。" :
          "当前为根层；系统返回应关闭实验窗口。");
      }
    } catch (e) {}
  }

  function scheduleClose(app, immediate, reason) {
    try {
      var handler = new android.os.Handler(android.os.Looper.getMainLooper());
      handler.post(new java.lang.Runnable({
        run: function () {
          try { app.closeShortXUiGestureWindow(immediate === true, reason || "scheduled"); }
          catch (error) { log(app, "e", "Gesture scheduled close failed: " + errorText(error)); }
        }
      }));
      return true;
    } catch (errorOuter) {
      log(app, "e", "Gesture schedule close failed: " + errorText(errorOuter));
    }
    return false;
  }

  function performBackAction(app, session, source) {
    if (!session || session.cancelled === true) return { ok: false, code: "SESSION_UNAVAILABLE" };
    resetBackVisual(session);
    var ime = readIme(session);
    var focused = false;
    try { focused = !!(session.edit && session.edit.hasFocus && session.edit.hasFocus()); } catch (e0) {}
    if (session.syntheticImeVisible === true || ime.visible === true || focused) {
      session.syntheticImeVisible = false;
      try {
        var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
        var token = session.edit ? session.edit.getWindowToken() : null;
        if (token) imm.hideSoftInputFromWindow(token, 0);
      } catch (e1) {}
      try { if (session.edit) session.edit.clearFocus(); } catch (e2) {}
      try { if (session.root) session.root.requestFocus(); } catch (e3) {}
      session.stats.imePriority += 1;
      transition(session, "IME_HIDDEN", "back:" + String(source || "unknown"));
      var imeResult = { ok: true, code: "IME_HIDDEN", source: String(source || ""), snapshot: sessionSnapshot(session) };
      app.state.shortXUiGestureLastResult = imeResult;
      persist(app);
      refreshStatus(app);
      return imeResult;
    }
    if (Number(session.depth || 1) > 1) {
      session.depth = Number(session.depth || 1) - 1;
      session.stats.pagePops += 1;
      transition(session, "PAGE_POPPED", "back:" + String(source || "unknown"));
      updatePage(session);
      var popResult = { ok: true, code: "PAGE_POPPED", depth: session.depth, source: String(source || ""), snapshot: sessionSnapshot(session) };
      app.state.shortXUiGestureLastResult = popResult;
      persist(app);
      refreshStatus(app);
      return popResult;
    }
    session.stats.rootCloses += 1;
    transition(session, "ROOT_BACK", "back:" + String(source || "unknown"));
    var closeScheduled = scheduleClose(app, false, "system_back:" + String(source || "unknown"));
    var rootResult = { ok: closeScheduled, code: "ROOT_CLOSE_SCHEDULED", source: String(source || ""), snapshot: sessionSnapshot(session) };
    app.state.shortXUiGestureLastResult = rootResult;
    persist(app);
    refreshStatus(app);
    return rootResult;
  }

  function unregisterBackCallback(session) {
    if (!session || !session.dispatcher || !session.backDispatcher || !session.backCallback) return true;
    var result = session.dispatcher.runSync(function () {
      try { session.backDispatcher.unregisterOnBackInvokedCallback(session.backCallback); } catch (e0) {}
      return true;
    }, 1800);
    session.callbackRegistered = false;
    session.backDispatcher = null;
    session.backCallback = null;
    return !result || result.ok !== false;
  }

  function registerBackCallback(app, session, attempt) {
    if (!session || session.cancelled || session.callbackRegistered) return;
    var cap = capability();
    if (!cap.hasOnBackInvoked) {
      session.callbackType = "key_fallback";
      refreshStatus(app);
      return;
    }
    session.dispatcher.postDelayed(function () {
      if (!session || session.cancelled || session.callbackRegistered || !session.root) return;
      try {
        var backDispatcher = session.root.findOnBackInvokedDispatcher();
        if (!backDispatcher) {
          if (Number(attempt || 0) + 1 < phase.REGISTER_RETRY_LIMIT) {
            registerBackCallback(app, session, Number(attempt || 0) + 1);
            return;
          }
          session.stats.callbackRegisterErrors += 1;
          session.stats.errors += 1;
          session.callbackType = "dispatcher_unavailable";
          transition(session, "ERROR", "back-dispatcher-unavailable");
          app.state.shortXUiGestureLastResult = { ok: false, code: "BACK_DISPATCHER_UNAVAILABLE", snapshot: sessionSnapshot(session) };
          persist(app);
          refreshStatus(app);
          return;
        }

        var priority = 0;
        try {
          priority = Number(Packages.android.window.OnBackInvokedDispatcher.PRIORITY_OVERLAY);
          if (!isFinite(priority)) priority = 0;
        } catch (ePriority) { priority = 0; }
        var callback = null;
        if (cap.hasOnBackAnimation) {
          callback = new JavaAdapter(Packages.android.window.OnBackAnimationCallback, {
            onBackStarted: function (event) {
              session.stats.backStarted += 1;
              session.progress = 0;
              transition(session, "BACK_STARTED", "predictive");
              refreshStatus(app);
            },
            onBackProgressed: function (event) {
              var progress = 0;
              var edge = 0;
              try { progress = Number(event.getProgress() || 0); } catch (eProgress) {}
              try { edge = Number(event.getSwipeEdge() || 0); } catch (eEdge) {}
              session.stats.backProgressed += 1;
              applyBackVisual(session, progress, edge);
              refreshStatus(app);
            },
            onBackCancelled: function () {
              session.stats.backCancelled += 1;
              resetBackVisual(session);
              transition(session, "BACK_CANCELLED", "predictive");
              app.state.shortXUiGestureLastResult = { ok: true, code: "BACK_CANCELLED", snapshot: sessionSnapshot(session) };
              persist(app);
              refreshStatus(app);
            },
            onBackInvoked: function () {
              session.stats.backInvoked += 1;
              performBackAction(app, session, "predictive");
            }
          });
          session.callbackType = "animation";
        } else {
          callback = new JavaAdapter(Packages.android.window.OnBackInvokedCallback, {
            onBackInvoked: function () {
              session.stats.backInvoked += 1;
              performBackAction(app, session, "invoked");
            }
          });
          session.callbackType = "invoked";
        }
        backDispatcher.registerOnBackInvokedCallback(priority, callback);
        session.backDispatcher = backDispatcher;
        session.backCallback = callback;
        session.callbackPriority = priority;
        session.callbackRegistered = true;
        transition(session, "BACK_REGISTERED", session.callbackType);
        app.state.shortXUiGestureLastResult = { ok: true, code: "BACK_REGISTERED", snapshot: sessionSnapshot(session) };
        persist(app);
        refreshStatus(app);
        log(app, "i", "GESTURE_BACK_REGISTERED type=" + session.callbackType + " priority=" + String(priority));
      } catch (error) {
        session.stats.callbackRegisterErrors += 1;
        session.stats.errors += 1;
        session.callbackType = "register_failed";
        transition(session, "ERROR", "back-register-failed");
        app.state.shortXUiGestureLastResult = { ok: false, code: "BACK_REGISTER_FAILED", error: errorText(error), snapshot: sessionSnapshot(session) };
        persist(app);
        refreshStatus(app);
        log(app, "e", "Gesture back registration failed: " + errorText(error));
      }
    }, Number(attempt || 0) === 0 ? 120 : phase.REGISTER_RETRY_MS, "shortx-ui-gesture-back-register");
  }

  function registerSystemDialogs(app, session) {
    if (!app || !session || session.receiverRegistered) return false;
    try {
      var appContext = context.getApplicationContext();
      var filter = new android.content.IntentFilter("android.intent.action.CLOSE_SYSTEM_DIALOGS");
      var receiver = new JavaAdapter(android.content.BroadcastReceiver, {
        onReceive: function (ctx, intent) {
          var reason = "";
          try { reason = String(intent.getStringExtra("reason") || ""); } catch (e0) {}
          log(app, "i", "GESTURE_SYSTEM_DIALOG reason=" + reason);
          if (reason === "recentapps" || reason === "recent_apps") {
            session.stats.recentsDismisses += 1;
            scheduleClose(app, true, "recentapps");
          } else if (reason === "homekey" || reason === "home") {
            session.stats.homeDismisses += 1;
            scheduleClose(app, true, "homekey");
          }
          persist(app);
          refreshStatus(app);
        }
      });
      var mainHandler = new android.os.Handler(android.os.Looper.getMainLooper());
      mainHandler.post(new java.lang.Runnable({
        run: function () {
          try {
            if (android.os.Build.VERSION.SDK_INT >= 33) {
              appContext.registerReceiver(receiver, filter, android.content.Context.RECEIVER_NOT_EXPORTED);
            } else appContext.registerReceiver(receiver, filter);
            session.systemDialogReceiver = receiver;
            session.receiverRegistered = true;
            refreshStatus(app);
          } catch (error) {
            session.stats.errors += 1;
            log(app, "w", "Gesture system dialog receiver register failed: " + errorText(error));
          }
        }
      }));
      return true;
    } catch (errorOuter) {
      session.stats.errors += 1;
      log(app, "w", "Gesture system dialog receiver setup failed: " + errorText(errorOuter));
    }
    return false;
  }

  function unregisterSystemDialogs(session) {
    if (!session || !session.systemDialogReceiver) return true;
    try {
      var appContext = context.getApplicationContext();
      var receiver = session.systemDialogReceiver;
      var mainLooper = android.os.Looper.getMainLooper();
      if (android.os.Looper.myLooper() === mainLooper) {
        try { appContext.unregisterReceiver(receiver); } catch (eDirect) {}
      } else {
        var latch = new java.util.concurrent.CountDownLatch(1);
        new android.os.Handler(mainLooper).post(new java.lang.Runnable({
          run: function () {
            try { appContext.unregisterReceiver(receiver); } catch (e0) {}
            try { latch.countDown(); } catch (e1) {}
          }
        }));
        try { latch.await(1200, java.util.concurrent.TimeUnit.MILLISECONDS); } catch (e2) {}
      }
    } catch (e3) {}
    session.systemDialogReceiver = null;
    session.receiverRegistered = false;
    return true;
  }

  function createWindowBundle(app, session) {
    var m = metrics();
    var T = app.getSettingsColorScheme ? app.getSettingsColorScheme() : null;
    var primary = T ? T.primary : android.graphics.Color.parseColor("#FF6750A4");
    var surface = T ? T.surface : android.graphics.Color.parseColor("#FF202124");
    var surface2 = T ? T.surface2 : android.graphics.Color.parseColor("#FF2B2C30");
    var onSurface = T ? T.onSurface : android.graphics.Color.WHITE;
    var onSurface2 = T ? T.onSurface2 : android.graphics.Color.LTGRAY;
    var outline = T ? T.outlineVariant : android.graphics.Color.GRAY;

    var root = new android.widget.FrameLayout(context);
    root.setFocusable(true);
    root.setFocusableInTouchMode(true);

    var card = new android.widget.LinearLayout(context);
    card.setOrientation(android.widget.LinearLayout.VERTICAL);
    card.setPadding(m.dp(14), m.dp(12), m.dp(14), m.dp(12));
    card.setBackground(global.ShortXUI.Shape.strokeRect(surface, outline, m.dp(1), m.dp(18)));
    root.addView(card, new android.widget.FrameLayout.LayoutParams(-1, -2));

    var title = new android.widget.TextView(context);
    title.setText("ShortXUI Gesture + Back");
    title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    title.setTypeface(null, android.graphics.Typeface.BOLD);
    global.ShortXUI.Color.applyText(title, onSurface);
    card.addView(title, new android.widget.LinearLayout.LayoutParams(-1, -2));

    var pageTitle = new android.widget.TextView(context);
    pageTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    pageTitle.setTypeface(null, android.graphics.Typeface.BOLD);
    pageTitle.setPadding(0, m.dp(8), 0, 0);
    global.ShortXUI.Color.applyText(pageTitle, primary);
    card.addView(pageTitle, new android.widget.LinearLayout.LayoutParams(-1, -2));

    var pageDesc = new android.widget.TextView(context);
    pageDesc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
    pageDesc.setPadding(0, m.dp(3), 0, m.dp(8));
    global.ShortXUI.Color.applyText(pageDesc, onSurface2);
    card.addView(pageDesc, new android.widget.LinearLayout.LayoutParams(-1, -2));

    var edit = new android.widget.EditText(context);
    edit.setHint("聚焦后测试：第一次返回只收起输入法");
    edit.setSingleLine(true);
    edit.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
    edit.setPadding(m.dp(10), m.dp(8), m.dp(10), m.dp(8));
    edit.setBackground(global.ShortXUI.Shape.strokeRect(surface2, primary, m.dp(1), m.dp(12)));
    global.ShortXUI.Color.applyText(edit, onSurface);
    global.ShortXUI.Color.applyHint(edit, global.ShortXUI.Color.withAlpha(onSurface, 0.58));
    card.addView(edit, new android.widget.LinearLayout.LayoutParams(-1, m.dp(48)));

    var row = new android.widget.LinearLayout(context);
    row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    row.setPadding(0, m.dp(8), 0, 0);

    function actionButton(label, callback) {
      var view = new android.widget.TextView(context);
      view.setText(label);
      view.setGravity(android.view.Gravity.CENTER);
      view.setPadding(m.dp(6), m.dp(8), m.dp(6), m.dp(8));
      view.setBackground(global.ShortXUI.Shape.pressed(
        global.ShortXUI.Color.withAlpha(primary, 0.18),
        global.ShortXUI.Color.withAlpha(primary, 0.32),
        m.dp(10)
      ));
      global.ShortXUI.Color.applyText(view, onSurface);
      view.setOnClickListener(new android.view.View.OnClickListener({ onClick: callback }));
      return view;
    }

    var push = actionButton("进入下一层", function () {
      if (session.depth < 3) session.depth += 1;
      transition(session, "PAGE_PUSHED", "button");
      updatePage(session);
      app.state.shortXUiGestureLastResult = { ok: true, code: "PAGE_PUSHED", depth: session.depth, snapshot: sessionSnapshot(session) };
      persist(app);
      refreshStatus(app);
    });
    var ime = actionButton("显示输入法", function () { app.showShortXUiGestureIme(); });
    var lpPush = new android.widget.LinearLayout.LayoutParams(0, m.dp(42), 1);
    lpPush.rightMargin = m.dp(6);
    row.addView(push, lpPush);
    row.addView(ime, new android.widget.LinearLayout.LayoutParams(0, m.dp(42), 1));
    card.addView(row, new android.widget.LinearLayout.LayoutParams(-1, -2));

    var row2 = new android.widget.LinearLayout(context);
    row2.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    row2.setPadding(0, m.dp(7), 0, 0);
    var simulate = actionButton("模拟返回", function () {
      session.stats.backInvoked += 1;
      performBackAction(app, session, "simulated_button");
    });
    var close = actionButton("关闭实验窗", function () { app.closeShortXUiGestureWindow(true, "button"); });
    var lpSim = new android.widget.LinearLayout.LayoutParams(0, m.dp(42), 1);
    lpSim.rightMargin = m.dp(6);
    row2.addView(simulate, lpSim);
    row2.addView(close, new android.widget.LinearLayout.LayoutParams(0, m.dp(42), 1));
    card.addView(row2, new android.widget.LinearLayout.LayoutParams(-1, -2));

    root.setOnTouchListener(new android.view.View.OnTouchListener({
      onTouch: function (view, event) {
        try {
          if (event && Number(event.getAction()) === Number(android.view.MotionEvent.ACTION_OUTSIDE)) {
            session.stats.outsideDismisses += 1;
            transition(session, "OUTSIDE_DISMISS", "action_outside");
            app.state.shortXUiGestureLastResult = { ok: true, code: "OUTSIDE_DISMISS", snapshot: sessionSnapshot(session) };
            persist(app);
            refreshStatus(app);
            scheduleClose(app, true, "outside_touch");
          }
        } catch (error) {
          session.stats.errors += 1;
          log(app, "e", "Gesture outside touch failed: " + errorText(error));
        }
        return false;
      }
    }));

    root.setOnKeyListener(new android.view.View.OnKeyListener({
      onKey: function (view, keyCode, event) {
        try {
          if (session.callbackRegistered === true) return false;
          if (Number(keyCode) === Number(android.view.KeyEvent.KEYCODE_BACK) &&
              event && Number(event.getAction()) === Number(android.view.KeyEvent.ACTION_UP)) {
            session.stats.backInvoked += 1;
            performBackAction(app, session, "key_fallback");
            return true;
          }
        } catch (error) {
          session.stats.errors += 1;
        }
        return false;
      }
    }));

    var lp = new android.view.WindowManager.LayoutParams();
    lp.width = m.dp(330);
    lp.height = android.view.WindowManager.LayoutParams.WRAP_CONTENT;
    lp.type = android.os.Build.VERSION.SDK_INT >= 26 ?
      android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY :
      android.view.WindowManager.LayoutParams.TYPE_PHONE;
    lp.flags = android.view.WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
      android.view.WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH |
      android.view.WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN;
    lp.softInputMode = android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE;
    lp.format = android.graphics.PixelFormat.TRANSLUCENT;
    lp.gravity = android.view.Gravity.TOP | android.view.Gravity.LEFT;
    lp.x = m.dp(16);
    lp.y = m.dp(84);
    try { lp.setTitle("ShortXUI Gesture Back Lab"); } catch (eTitle) {}

    session.root = root;
    session.card = card;
    session.edit = edit;
    session.pageTitle = pageTitle;
    session.pageDesc = pageDesc;
    updatePage(session);
    return { view: root, params: lp };
  }

  proto.openShortXUiGestureWindow = function (depth) {
    if (!this.state) this.state = {};
    var cap = capability();
    if (!cap.ok) {
      var unavailable = { ok: false, code: "RUNTIME_MISMATCH", capability: cap };
      this.state.shortXUiGestureLastResult = unavailable;
      persist(this);
      refreshStatus(this);
      return unavailable;
    }
    var old = this.state.shortXUiGestureSession;
    if (old && old.host && old.host.getState && old.host.getState() !== "DISPOSED") {
      var already = { ok: true, code: "ALREADY_OPEN", snapshot: sessionSnapshot(old) };
      this.state.shortXUiGestureLastResult = already;
      persist(this);
      refreshStatus(this);
      return already;
    }

    var dispatcher = global.ShortXUI.Dispatcher.fromHandler(this.state.h, "shortx-ui-gesture-back");
    var host = global.ShortXUI.WindowHost.create({
      name: "toolhub-gesture-back-lab",
      dispatcher: dispatcher,
      windowManager: this.state.wm,
      timeoutMs: 1800
    });
    var session = {
      lifecycle: "OPENING",
      host: host,
      dispatcher: dispatcher,
      root: null,
      card: null,
      edit: null,
      pageTitle: null,
      pageDesc: null,
      depth: Math.max(1, Math.min(3, Number(depth || 3))),
      progress: 0,
      callbackRegistered: false,
      callbackType: "pending",
      callbackPriority: 0,
      backDispatcher: null,
      backCallback: null,
      receiverRegistered: false,
      systemDialogReceiver: null,
      syntheticImeVisible: false,
      cancelled: false,
      transitions: [],
      stats: {
        backStarted: 0,
        backProgressed: 0,
        backCancelled: 0,
        backInvoked: 0,
        maxProgress: 0,
        imePriority: 0,
        pagePops: 0,
        rootCloses: 0,
        outsideDismisses: 0,
        recentsDismisses: 0,
        homeDismisses: 0,
        callbackRegisterErrors: 0,
        normalCloses: 0,
        immediateCloses: 0,
        errors: 0
      }
    };
    this.state.shortXUiGestureSession = session;
    var self = this;
    var prepared = host.prepare(function () { return createWindowBundle(self, session); });
    var attached = prepared.ok ? host.attach(1800) : prepared;
    if (!attached.ok) {
      session.stats.errors += 1;
      transition(session, "ERROR", "attach-failed");
      try { host.dispose(1800); } catch (e0) {}
      try { dispatcher.dispose(); } catch (e1) {}
      this.state.shortXUiGestureSession = null;
      var failed = { ok: false, code: String(attached.code || "ATTACH_FAILED"), prepared: prepared, attached: attached, snapshot: sessionSnapshot(session) };
      this.state.shortXUiGestureLastResult = failed;
      persist(this);
      refreshStatus(this);
      return failed;
    }
    transition(session, "ATTACHED", "window-attached");
    registerBackCallback(this, session, 0);
    registerSystemDialogs(this, session);
    var result = { ok: true, code: "ATTACHED", prepared: prepared, attached: attached, snapshot: sessionSnapshot(session) };
    this.state.shortXUiGestureLastResult = result;
    persist(this);
    refreshStatus(this);
    return result;
  };

  proto.showShortXUiGestureIme = function () {
    if (!this.state) this.state = {};
    var open = this.openShortXUiGestureWindow(3);
    if (!open.ok) return open;
    var session = this.state.shortXUiGestureSession;
    if (!session || !session.host || session.host.getState() !== "ATTACHED") return { ok: false, code: "NOT_OPEN" };
    var updated = session.host.update(function (lp) {
      lp.flags = Number(lp.flags || 0) & ~android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
      lp.flags = Number(lp.flags || 0) & ~android.view.WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM;
      lp.softInputMode = android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE |
        android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE;
    }, 1800);
    if (!updated.ok) return { ok: false, code: "FOCUSABLE_UPDATE_FAILED", detail: updated };
    var request = session.dispatcher.runSync(function () {
      session.edit.setFocusableInTouchMode(true);
      session.edit.requestFocus();
      var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
      return imm.showSoftInput(session.edit, android.view.inputmethod.InputMethodManager.SHOW_IMPLICIT);
    }, 1800);
    transition(session, "IME_REQUESTED", "button");
    var result = { ok: request.ok === true, code: "IME_REQUESTED", detail: request, snapshot: sessionSnapshot(session) };
    this.state.shortXUiGestureLastResult = result;
    persist(this);
    refreshStatus(this);
    return result;
  };

  proto.simulateShortXUiGestureBack = function () {
    var session = this.state ? this.state.shortXUiGestureSession : null;
    if (!session) return { ok: false, code: "NOT_OPEN" };
    session.stats.backInvoked += 1;
    return performBackAction(this, session, "simulated_api");
  };

  proto.refreshShortXUiGestureState = function () {
    var session = this.state ? this.state.shortXUiGestureSession : null;
    var result = { ok: capability().ok, code: "REFRESHED", capability: capability(), snapshot: sessionSnapshot(session) };
    if (!this.state) this.state = {};
    this.state.shortXUiGestureLastResult = result;
    persist(this);
    refreshStatus(this);
    return result;
  };

  proto.closeShortXUiGestureWindow = function (immediate, reason) {
    if (!this.state) this.state = {};
    var session = this.state.shortXUiGestureSession;
    if (!session || !session.host) {
      var already = { ok: true, code: "ALREADY_CLOSED", state: "DISPOSED", reason: String(reason || "") };
      this.state.shortXUiGestureLastResult = already;
      persist(this);
      refreshStatus(this);
      return already;
    }
    session.cancelled = true;
    transition(session, "CLOSING", String(reason || (immediate ? "close-immediate" : "close-normal")));
    resetBackVisual(session);
    unregisterBackCallback(session);
    unregisterSystemDialogs(session);
    try {
      session.dispatcher.runSync(function () {
        var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
        var token = null;
        try { token = session.edit ? session.edit.getWindowToken() : null; } catch (e0) {}
        try { if (token) imm.hideSoftInputFromWindow(token, 0); } catch (e1) {}
        try { if (session.edit) session.edit.clearFocus(); } catch (e2) {}
        return true;
      }, 1800);
    } catch (e3) {}
    var removed = session.host.remove(immediate === true, 1800);
    var disposed = removed.ok ? session.host.dispose(1800) : { ok: false, code: "NOT_DISPOSED" };
    if (immediate === true) session.stats.immediateCloses += 1;
    else session.stats.normalCloses += 1;
    if (!removed.ok || !disposed.ok) session.stats.errors += 1;
    transition(session, disposed.ok ? "DISPOSED" : "ERROR", disposed.ok ? "close-complete" : "close-failed");
    var result = {
      ok: removed.ok === true && disposed.ok === true,
      code: String(removed.code || ""),
      immediate: immediate === true,
      reason: String(reason || ""),
      removed: removed,
      disposed: disposed,
      snapshot: sessionSnapshot(session)
    };
    try { session.dispatcher.dispose(); } catch (e4) {}
    this.state.shortXUiGestureSession = null;
    this.state.shortXUiGestureLastResult = result;
    persist(this);
    refreshStatus(this);
    return result;
  };

  proto.runShortXUiGestureStress = function () {
    if (!this.state) this.state = {};
    var cap = capability();
    if (!cap.ok) {
      var unavailable = { schema: 1, ok: false, running: false, code: "RUNTIME_MISMATCH", capability: cap };
      this.state.shortXUiGestureStressResult = unavailable;
      persist(this);
      refreshStatus(this);
      return unavailable;
    }
    var existing = this.state.shortXUiGestureStressResult;
    if (existing && existing.running === true) return existing;
    try { this.closeShortXUiGestureWindow(true, "stress-reset"); } catch (e0) {}

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
      callbackRegistrations: 0,
      imePriorityPasses: 0,
      pagePopPasses: 0,
      rootClosePasses: 0,
      normalCloses: 0,
      immediateCloses: 0,
      timeouts: 0,
      errors: 0,
      cycles: []
    };
    this.state.shortXUiGestureStressResult = stress;
    persist(this);
    refreshStatus(this);

    function schedule(callback, delayMs) {
      handler.postDelayed(new java.lang.Runnable({
        run: function () {
          try { callback(); }
          catch (error) { fail(-1, "UNCAUGHT", errorText(error)); }
        }
      }), Math.max(0, Number(delayMs || 0)));
    }

    function finish() {
      stress.running = false;
      stress.ok = stress.cyclesCompleted === phase.STRESS_CYCLES &&
        stress.callbackRegistrations === phase.STRESS_CYCLES &&
        stress.imePriorityPasses === phase.STRESS_CYCLES &&
        stress.pagePopPasses === phase.STRESS_CYCLES * 2 &&
        stress.rootClosePasses === phase.STRESS_CYCLES &&
        stress.normalCloses === phase.STRESS_CYCLES / 2 &&
        stress.immediateCloses === phase.STRESS_CYCLES / 2 &&
        stress.timeouts === 0 && stress.errors === 0;
      stress.finishedAt = now();
      stress.durationMs = Math.max(0, stress.finishedAt - stress.startedAt);
      persist(self);
      refreshStatus(self);
      log(self, stress.ok ? "i" : "e", "GESTURE_STRESS_DONE ok=" + String(stress.ok) + " completed=" + String(stress.cyclesCompleted));
    }

    function fail(index, code, detail) {
      if (stress.running !== true) return;
      stress.running = false;
      stress.ok = false;
      stress.finishedAt = now();
      stress.durationMs = Math.max(0, stress.finishedAt - stress.startedAt);
      stress.errors += 1;
      stress.cycles.push({ index: index >= 0 ? index + 1 : 0, ok: false, code: String(code || "FAILED"), detail: detail || null });
      try { self.closeShortXUiGestureWindow(true, "stress-fail"); } catch (e0) {}
      persist(self);
      refreshStatus(self);
      log(self, "e", "GESTURE_STRESS_FAIL index=" + String(index + 1) + " code=" + String(code || "FAILED"));
    }

    function waitRegistered(index, startedAt) {
      if (stress.running !== true) return;
      var session = self.state ? self.state.shortXUiGestureSession : null;
      if (session && (session.callbackRegistered === true || capability().hasOnBackInvoked !== true)) {
        stress.callbackRegistrations += 1;
        runPriority(index, session);
        return;
      }
      if (now() - startedAt >= 2600) {
        stress.timeouts += 1;
        fail(index, "BACK_REGISTER_TIMEOUT", sessionSnapshot(session));
        return;
      }
      schedule(function () { waitRegistered(index, startedAt); }, 100);
    }

    function runPriority(index, session) {
      session.syntheticImeVisible = true;
      var imeResult = performBackAction(self, session, "stress_ime");
      if (!imeResult || imeResult.code !== "IME_HIDDEN" || session.depth !== 3) {
        fail(index, "IME_PRIORITY_FAILED", imeResult || null);
        return;
      }
      stress.imePriorityPasses += 1;
      var pop1 = performBackAction(self, session, "stress_pop_1");
      var pop2 = performBackAction(self, session, "stress_pop_2");
      if (!pop1 || pop1.code !== "PAGE_POPPED" || !pop2 || pop2.code !== "PAGE_POPPED" || session.depth !== 1) {
        fail(index, "PAGE_POP_FAILED", { first: pop1, second: pop2, depth: session.depth });
        return;
      }
      stress.pagePopPasses += 2;
      session.stats.rootCloses += 1;
      stress.rootClosePasses += 1;
      var immediate = index % 2 === 1;
      var closeResult = self.closeShortXUiGestureWindow(immediate, "stress_root_close");
      if (!closeResult || closeResult.ok !== true) {
        fail(index, "ROOT_CLOSE_FAILED", closeResult || null);
        return;
      }
      if (immediate) stress.immediateCloses += 1;
      else stress.normalCloses += 1;
      stress.cyclesCompleted += 1;
      stress.cycles.push({
        index: index + 1,
        ok: true,
        callbackType: String(session.callbackType || ""),
        imePriority: true,
        pagePops: 2,
        immediate: immediate,
        closeCode: String(closeResult.code || "")
      });
      persist(self);
      refreshStatus(self);
      schedule(function () { next(index + 1); }, 150);
    }

    function next(index) {
      if (stress.running !== true) return;
      if (index >= phase.STRESS_CYCLES) {
        finish();
        return;
      }
      var opened = self.openShortXUiGestureWindow(3);
      if (!opened || opened.ok !== true) {
        fail(index, "OPEN_FAILED", opened || null);
        return;
      }
      waitRegistered(index, now());
    }

    log(this, "i", "GESTURE_STRESS_BEGIN cycles=" + String(phase.STRESS_CYCLES));
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
        title.setText("Gesture + 系统返回生命周期");
        title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        global.ShortXUI.Color.applyText(title, onSurface);
        box.addView(title, new android.widget.LinearLayout.LayoutParams(-1, -2));

        var desc = new android.widget.TextView(context);
        desc.setText("独立 Overlay：预测性返回进度/取消/提交、IME→页面→根关闭优先级、无全屏遮罩的外部点击、最近任务与 Home 清理。");
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
        this.state.shortXUiGestureStatusView = status;

        function addRow(items) {
          var row = new android.widget.LinearLayout(context);
          row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
          for (var i = 0; i < items.length; i++) {
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
          { title: "打开三层窗口", action: function () { self.openShortXUiGestureWindow(3); refreshStatus(self); } },
          { title: "显示输入法", action: function () { self.showShortXUiGestureIme(); refreshStatus(self); } }
        ]);
        addRow([
          { title: "模拟系统返回", action: function () { self.simulateShortXUiGestureBack(); refreshStatus(self); } },
          { title: "刷新状态", action: function () { self.refreshShortXUiGestureState(); } }
        ]);
        addRow([
          { title: "普通关闭", action: function () { self.closeShortXUiGestureWindow(false, "lab_button"); } },
          { title: "立即关闭", action: function () { self.closeShortXUiGestureWindow(true, "lab_button"); } }
        ]);
        addRow([
          { title: "运行 30 次优先级循环", action: function () { self.runShortXUiGestureStress(); refreshStatus(self); } }
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
              if (text.indexOf("Diagnostics / WindowHost / IME") >= 0 && text.indexOf(" / Gesture") < 0) {
                text = text.replace("Diagnostics / WindowHost / IME", "Diagnostics / WindowHost / IME / Gesture");
              }
              text = text.replace("未启用：Gesture / Canvas / DEX Bridge", "未启用：Canvas / DEX Bridge");
              view.setText(text);
            }
          } catch (e1) {}
          try {
            if (view.getChildCount) {
              for (var j = 0; j < view.getChildCount(); j++) patchBoundary(view.getChildAt(j));
            }
          } catch (e2) {}
        }
        patchBoundary(panel);
      } catch (error) {
        log(this, "e", "build ShortXUI gesture lab section failed: " + errorText(error));
      }
      return panel;
    };
  }

  var oldGetState = proto.getShortXUiLabState;
  if (typeof oldGetState === "function") {
    proto.getShortXUiLabState = function () {
      var state = oldGetState.call(this) || {};
      state.gestureCapability = capability();
      state.gesture = this.state ? this.state.shortXUiGestureLastResult || sessionSnapshot(this.state.shortXUiGestureSession || null) : null;
      state.gestureStress = this.state ? this.state.shortXUiGestureStressResult || null : null;
      return state;
    };
  }

  var oldClose = proto.close;
  if (typeof oldClose === "function") {
    proto.close = function () {
      try {
        if (this.state && this.state.shortXUiGestureSession) this.closeShortXUiGestureWindow(true, "toolhub_close");
      } catch (e0) {
        log(this, "w", "ShortXUI gesture close cleanup failed: " + errorText(e0));
      }
      return oldClose.apply(this, arguments);
    };
  }

  global.ToolHubBetaPhase4 = phase;
  proto.__toolHubShortXUiGesturePhase4Installed = true;
  try { writeLog("ShortXUI Gesture phase4 installed version=" + phase.VERSION); } catch (eLog) {}
}(function () { return this; }()));
