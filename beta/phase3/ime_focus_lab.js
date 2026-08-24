// ToolHub Beta ShortXUI IME + Focus phase-3 lab. Rhino ES5.
(function (global) {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
  var proto = FloatBallAppWM.prototype;
  if (proto.__toolHubShortXUiImePhase3Installed === true) return;

  var phase = {
    VERSION: "0.4.0-beta-ime",
    STRESS_CYCLES: 20,
    POLL_INTERVAL_MS: 100,
    POLL_LIMIT: 30
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

  function capability() {
    var sx = null;
    var imm = null;
    try { sx = global.ShortXUI || null; } catch (e0) { sx = null; }
    try { imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE); } catch (e1) { imm = null; }
    return {
      ok: !!(sx && sx.WindowHost && typeof sx.WindowHost.create === "function" &&
        sx.Dispatcher && typeof sx.Dispatcher.fromHandler === "function" && imm),
      runtimeInstalled: !!sx,
      runtimeVersion: sx ? String(sx.VERSION || "") : "",
      hasWindowHost: !!(sx && sx.WindowHost && typeof sx.WindowHost.create === "function"),
      hasDispatcher: !!(sx && sx.Dispatcher && typeof sx.Dispatcher.fromHandler === "function"),
      hasInputMethodManager: !!imm,
      supportsInsetsIme: Number(android.os.Build.VERSION.SDK_INT) >= 30,
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

  function metrics() {
    return global.ShortXUI.Metrics.create(context);
  }

  function safeDispatcherDispose(dispatcher) {
    try { if (dispatcher) dispatcher.dispose(); } catch (e) {}
  }

  function currentGeometry(session) {
    if (!session || !session.host || !session.host.getParams) return null;
    var lp = null;
    try { lp = session.host.getParams(); } catch (e0) { lp = null; }
    if (!lp) return null;
    return {
      x: Number(lp.x || 0),
      y: Number(lp.y || 0),
      width: Number(lp.width || 0),
      height: Number(lp.height || 0)
    };
  }

  function sessionSnapshot(session) {
    if (!session) {
      return {
        state: "IDLE",
        open: false,
        focused: false,
        imeVisible: false,
        imeHeight: 0,
        adjusted: false,
        geometryRestored: true,
        stats: {
          focusRequests: 0,
          showRequests: 0,
          visibleConfirmed: 0,
          hideRequests: 0,
          hiddenConfirmed: 0,
          restorePasses: 0,
          normalCloses: 0,
          immediateCloses: 0,
          timeouts: 0,
          errors: 0
        },
        transitions: []
      };
    }
    var focused = false;
    try { focused = !!(session.edit && session.edit.hasFocus && session.edit.hasFocus()); } catch (e0) {}
    return {
      state: String(session.lifecycle || "IDLE"),
      open: !!(session.host && session.host.getState && session.host.getState() !== "DISPOSED"),
      focused: focused,
      imeVisible: session.imeVisible === true,
      imeHeight: Number(session.imeHeight || 0),
      adjusted: session.adjusted === true,
      geometryRestored: session.geometryRestored !== false,
      originalGeometry: session.originalGeometry || null,
      currentGeometry: currentGeometry(session),
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
      try {
        if (typeof getToolHubRootDir === "function") root = String(getToolHubRootDir() || "");
      } catch (e0) {}
      if (!root && typeof APP_ROOT_DIR !== "undefined") root = String(APP_ROOT_DIR || "");
      if (!root) return false;
      var target = new java.io.File(root + "/diagnostics/shortx-ui/latest.json");
      var parent = target.getParentFile();
      if (parent && !parent.exists() && !parent.mkdirs() && !parent.exists()) return false;
      temp = new java.io.File(target.getAbsolutePath() + ".tmp");
      var cap = capability();
      var payload = {
        schema: 4,
        runtimeVersion: cap.runtimeVersion,
        wrapperVersion: phase.VERSION,
        ok: cap.ok &&
          !(app.state.shortXUiLabLastResult && app.state.shortXUiLabLastResult.ok === false) &&
          !(app.state.shortXUiLabLastDispatcherResult && app.state.shortXUiLabLastDispatcherResult.ok === false) &&
          !(app.state.shortXUiLabLastWindowResult && app.state.shortXUiLabLastWindowResult.ok === false) &&
          !(app.state.shortXUiLabLastWindowStressResult && app.state.shortXUiLabLastWindowStressResult.ok === false) &&
          !(app.state.shortXUiImeLastResult && app.state.shortXUiImeLastResult.ok === false) &&
          !(app.state.shortXUiImeStressResult && app.state.shortXUiImeStressResult.ok === false),
        savedAt: now(),
        capability: cap,
        basic: app.state.shortXUiLabLastResult || null,
        dispatcher: app.state.shortXUiLabLastDispatcherResult || null,
        windowHost: app.state.shortXUiLabLastWindowResult || null,
        windowStress: app.state.shortXUiLabLastWindowStressResult || null,
        imeFocus: app.state.shortXUiImeLastResult || sessionSnapshot(app.state.shortXUiImeSession || null),
        imeStress: app.state.shortXUiImeStressResult || null
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
      try { safeLog(app && app.L, "w", "ShortXUI IME diagnostics save failed: " + errorText(error)); } catch (e1) {}
      return false;
    } finally {
      try { if (out) out.close(); } catch (e2) {}
      try { if (temp && temp.exists()) temp.delete(); } catch (e3) {}
    }
  }

  function format(app) {
    var cap = capability();
    var session = app && app.state ? app.state.shortXUiImeSession : null;
    var snap = sessionSnapshot(session);
    var stress = app && app.state ? app.state.shortXUiImeStressResult : null;
    var lines = [];
    lines.push("IME + Focus：" + (cap.ok ? "可用" : "不可用"));
    lines.push("Runtime=" + String(cap.runtimeVersion || "") + " SDK=" + String(cap.sdk));
    lines.push("状态=" + String(snap.state) + " open=" + String(snap.open) + " focus=" + String(snap.focused));
    lines.push("imeVisible=" + String(snap.imeVisible) + " imeHeight=" + String(snap.imeHeight));
    lines.push("adjusted=" + String(snap.adjusted) + " restored=" + String(snap.geometryRestored));
    lines.push("show=" + String(Number(snap.stats.showRequests || 0)) +
      " visible=" + String(Number(snap.stats.visibleConfirmed || 0)) +
      " hide=" + String(Number(snap.stats.hideRequests || 0)) +
      " hidden=" + String(Number(snap.stats.hiddenConfirmed || 0)));
    lines.push("timeout=" + String(Number(snap.stats.timeouts || 0)) +
      " errors=" + String(Number(snap.stats.errors || 0)));
    if (stress) {
      lines.push("");
      lines.push("压力测试：" + (stress.running ? "运行中" : (stress.ok ? "通过" : "失败")));
      lines.push("完成=" + String(Number(stress.cyclesCompleted || 0)) + "/" + String(Number(stress.cyclesRequested || 0)) +
        " visible=" + String(Number(stress.visiblePasses || 0)) +
        " restore=" + String(Number(stress.hideRestorePasses || 0)) +
        " closeVisible=" + String(Number(stress.closeWhileVisiblePasses || 0)));
    }
    if (!cap.ok) lines.push("Runtime/Lab 能力不完整，请完整停止并重新运行 Beta");
    return lines.join("\n");
  }

  function refreshStatus(app) {
    if (!app || !app.state) return;
    var status = app.state.shortXUiImeStatusView || null;
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

  function restoreGeometry(app, session) {
    if (!session || !session.host || !session.originalGeometry) return false;
    var original = session.originalGeometry;
    var result = session.host.update(function (lp) {
      lp.x = Number(original.x || 0);
      lp.y = Number(original.y || 0);
      lp.width = Number(original.width);
      lp.height = Number(original.height);
      lp.flags = Number(lp.flags || 0) | android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
      lp.flags = Number(lp.flags || 0) & ~android.view.WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM;
    }, 1800);
    try {
      if (session.edit) session.edit.clearFocus();
      if (session.root) session.root.requestFocus();
    } catch (e0) {}
    var current = currentGeometry(session);
    var restored = !!(result && result.ok && current &&
      Number(current.x) === Number(original.x) &&
      Number(current.y) === Number(original.y) &&
      Number(current.width) === Number(original.width) &&
      Number(current.height) === Number(original.height));
    session.geometryRestored = restored;
    session.adjusted = false;
    if (restored) session.stats.restorePasses += 1;
    else session.stats.errors += 1;
    return restored;
  }

  function applyAvoidance(app, session, imeInfo) {
    if (!session || !session.host || !session.root || !imeInfo || !imeInfo.visible) return false;
    var display = global.ShortXUI.Display.snapshot(context, app.state && app.state.wm ? app.state.wm : null);
    var rootHeight = 0;
    try { rootHeight = Number(session.root.getHeight() || 0); } catch (e0) { rootHeight = 0; }
    if (rootHeight <= 0) return false;
    var infoHeight = Math.max(0, Number(imeInfo.height || 0));
    var availableBottom = Math.max(0, Number(display.height || 0) - infoHeight);
    var topInset = 0;
    try { topInset = Number(display.safeBounds.top || display.insets.top || 0); } catch (e1) { topInset = 0; }
    var gap = metrics().dp(12);
    var current = currentGeometry(session);
    if (!current) return false;
    var targetY = Math.max(topInset + gap, availableBottom - rootHeight - gap);
    if (current.y + rootHeight <= availableBottom - gap) {
      session.adjusted = false;
      return true;
    }
    var updated = session.host.update(function (lp) {
      lp.y = Math.round(targetY);
    }, 1800);
    session.adjusted = !!(updated && updated.ok);
    session.geometryRestored = false;
    return session.adjusted;
  }

  function pollIme(app, session, desiredVisible, attempt, callback) {
    if (!session || session.cancelled || !session.dispatcher) {
      try { if (callback) callback(false, { visible: false, height: 0, source: "cancelled" }); } catch (e0) {}
      return;
    }
    session.dispatcher.postDelayed(function () {
      if (session.cancelled) return;
      var info = readIme(session);
      session.imeVisible = info.visible === true;
      session.imeHeight = Number(info.height || 0);
      session.imeSource = String(info.source || "");
      if (desiredVisible && info.visible) {
        session.stats.visibleConfirmed += 1;
        transition(session, "IME_VISIBLE", "ime-visible:" + info.source);
        applyAvoidance(app, session, info);
        app.state.shortXUiImeLastResult = { ok: true, code: "IME_VISIBLE", snapshot: sessionSnapshot(session) };
        persist(app);
        refreshStatus(app);
        try { if (callback) callback(true, info); } catch (e1) {}
        return;
      }
      if (!desiredVisible && !info.visible) {
        session.stats.hiddenConfirmed += 1;
        restoreGeometry(app, session);
        transition(session, "RESTORED", "ime-hidden:" + info.source);
        app.state.shortXUiImeLastResult = { ok: true, code: "RESTORED", snapshot: sessionSnapshot(session) };
        persist(app);
        refreshStatus(app);
        try { if (callback) callback(true, info); } catch (e2) {}
        return;
      }
      if (attempt + 1 >= phase.POLL_LIMIT) {
        session.stats.timeouts += 1;
        session.stats.errors += 1;
        transition(session, "ERROR", desiredVisible ? "ime-show-timeout" : "ime-hide-timeout");
        app.state.shortXUiImeLastResult = {
          ok: false,
          code: desiredVisible ? "IME_SHOW_TIMEOUT" : "IME_HIDE_TIMEOUT",
          snapshot: sessionSnapshot(session)
        };
        persist(app);
        refreshStatus(app);
        try { if (callback) callback(false, info); } catch (e3) {}
        return;
      }
      pollIme(app, session, desiredVisible, attempt + 1, callback);
    }, phase.POLL_INTERVAL_MS, "shortx-ui-ime-poll");
  }

  function requestShow(app, callback) {
    var session = app && app.state ? app.state.shortXUiImeSession : null;
    if (!session || !session.host || session.host.getState() !== "ATTACHED") {
      try { if (callback) callback(false, { code: "NOT_OPEN" }); } catch (e0) {}
      return { ok: false, code: "NOT_OPEN" };
    }
    transition(session, "FOCUS_REQUESTED", "show-ime");
    session.stats.focusRequests += 1;
    var focusable = session.host.update(function (lp) {
      lp.flags = Number(lp.flags || 0) & ~android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
      lp.flags = Number(lp.flags || 0) & ~android.view.WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM;
      lp.softInputMode = android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE |
        android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE;
    }, 1800);
    if (!focusable.ok) {
      session.stats.errors += 1;
      transition(session, "ERROR", "focusable-update-failed");
      try { if (callback) callback(false, focusable); } catch (e1) {}
      return { ok: false, code: "FOCUSABLE_UPDATE_FAILED", detail: focusable };
    }
    var requested = session.dispatcher.runSync(function () {
      session.root.setFocusableInTouchMode(true);
      session.edit.setFocusableInTouchMode(true);
      session.edit.requestFocus();
      try { session.edit.setSelection(session.edit.getText().length()); } catch (e2) {}
      var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
      return imm.showSoftInput(session.edit, android.view.inputmethod.InputMethodManager.SHOW_IMPLICIT);
    }, 1800);
    session.stats.showRequests += 1;
    transition(session, "IME_REQUESTED", "show-soft-input");
    app.state.shortXUiImeLastResult = { ok: requested.ok === true, code: "IME_REQUESTED", requested: requested, snapshot: sessionSnapshot(session) };
    persist(app);
    refreshStatus(app);
    pollIme(app, session, true, 0, callback);
    return { ok: requested.ok === true, code: "IME_REQUESTED", detail: requested };
  }

  function requestHide(app, callback) {
    var session = app && app.state ? app.state.shortXUiImeSession : null;
    if (!session || !session.host) {
      try { if (callback) callback(true, { code: "ALREADY_CLOSED" }); } catch (e0) {}
      return { ok: true, code: "ALREADY_CLOSED" };
    }
    transition(session, "IME_HIDING", "hide-ime");
    var hidden = session.dispatcher.runSync(function () {
      var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
      var token = null;
      try { token = session.edit.getWindowToken(); } catch (e1) { token = null; }
      if (token) return imm.hideSoftInputFromWindow(token, 0);
      return false;
    }, 1800);
    session.stats.hideRequests += 1;
    app.state.shortXUiImeLastResult = { ok: hidden.ok === true, code: "IME_HIDING", requested: hidden, snapshot: sessionSnapshot(session) };
    persist(app);
    refreshStatus(app);
    pollIme(app, session, false, 0, callback);
    return { ok: hidden.ok === true, code: "IME_HIDING", detail: hidden };
  }

  function createWindowBundle(app, session) {
    var m = metrics();
    var T = app.getSettingsColorScheme ? app.getSettingsColorScheme() : null;
    var primary = T ? T.primary : android.graphics.Color.parseColor("#FF6750A4");
    var surface = T ? T.surface : android.graphics.Color.parseColor("#FF202124");
    var onSurface = T ? T.onSurface : android.graphics.Color.WHITE;
    var outline = T ? T.outlineVariant : android.graphics.Color.GRAY;
    var root = new android.widget.LinearLayout(context);
    root.setOrientation(android.widget.LinearLayout.VERTICAL);
    root.setPadding(m.dp(14), m.dp(12), m.dp(14), m.dp(12));
    root.setFocusable(true);
    root.setFocusableInTouchMode(true);
    root.setBackground(global.ShortXUI.Shape.strokeRect(surface, outline, m.dp(1), m.dp(16)));

    var title = new android.widget.TextView(context);
    title.setText("ShortXUI IME + Focus");
    title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    title.setTypeface(null, android.graphics.Typeface.BOLD);
    global.ShortXUI.Color.applyText(title, onSurface);
    root.addView(title, new android.widget.LinearLayout.LayoutParams(-1, -2));

    var desc = new android.widget.TextView(context);
    desc.setText("Beta 独立可输入 Overlay\n不会接管正式 ToolHub 页面");
    desc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
    desc.setPadding(0, m.dp(5), 0, m.dp(8));
    global.ShortXUI.Color.applyText(desc, onSurface);
    root.addView(desc, new android.widget.LinearLayout.LayoutParams(-1, -2));

    var edit = new android.widget.EditText(context);
    edit.setHint("点击后输入测试文本");
    edit.setText("ShortXUI IME test");
    edit.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    edit.setSingleLine(false);
    edit.setMinLines(3);
    edit.setMaxLines(5);
    edit.setGravity(android.view.Gravity.TOP | android.view.Gravity.LEFT);
    edit.setInputType(android.text.InputType.TYPE_CLASS_TEXT |
      android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE |
      android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
    edit.setPadding(m.dp(10), m.dp(9), m.dp(10), m.dp(9));
    edit.setBackground(global.ShortXUI.Shape.strokeRect(surface, primary, m.dp(1), m.dp(12)));
    global.ShortXUI.Color.applyText(edit, onSurface);
    global.ShortXUI.Color.applyHint(edit, global.ShortXUI.Color.withAlpha(onSurface, 0.58));
    edit.setOnFocusChangeListener(new android.view.View.OnFocusChangeListener({
      onFocusChange: function (view, hasFocus) {
        session.focused = hasFocus === true;
        if (hasFocus) transition(session, "FOCUS_REQUESTED", "edit-focus");
        refreshStatus(app);
      }
    }));
    root.addView(edit, new android.widget.LinearLayout.LayoutParams(-1, m.dp(112)));

    var row = new android.widget.LinearLayout(context);
    row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    row.setPadding(0, m.dp(8), 0, 0);

    function actionButton(label, callback) {
      var view = new android.widget.TextView(context);
      view.setText(label);
      view.setGravity(android.view.Gravity.CENTER);
      view.setPadding(m.dp(8), m.dp(9), m.dp(8), m.dp(9));
      view.setBackground(global.ShortXUI.Shape.pressed(
        global.ShortXUI.Color.withAlpha(primary, 0.18),
        global.ShortXUI.Color.withAlpha(primary, 0.32),
        m.dp(10)
      ));
      global.ShortXUI.Color.applyText(view, onSurface);
      view.setOnClickListener(new android.view.View.OnClickListener({ onClick: callback }));
      return view;
    }

    var hide = actionButton("收起并恢复", function () { app.hideShortXUiIme(); });
    var close = actionButton("关闭窗口", function () { app.closeShortXUiImeWindow(true); });
    var hideLp = new android.widget.LinearLayout.LayoutParams(0, m.dp(42), 1);
    hideLp.rightMargin = m.dp(6);
    row.addView(hide, hideLp);
    row.addView(close, new android.widget.LinearLayout.LayoutParams(0, m.dp(42), 1));
    root.addView(row, new android.widget.LinearLayout.LayoutParams(-1, -2));

    var lp = new android.view.WindowManager.LayoutParams();
    lp.width = m.dp(310);
    lp.height = android.view.WindowManager.LayoutParams.WRAP_CONTENT;
    lp.type = android.os.Build.VERSION.SDK_INT >= 26 ?
      android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY :
      android.view.WindowManager.LayoutParams.TYPE_PHONE;
    lp.flags = android.view.WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
      android.view.WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN;
    lp.softInputMode = android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE |
      android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE;
    lp.format = android.graphics.PixelFormat.TRANSLUCENT;
    lp.gravity = android.view.Gravity.TOP | android.view.Gravity.LEFT;
    lp.x = m.dp(18);
    lp.y = m.dp(72);
    try { lp.setTitle("ShortXUI IME Focus Lab"); } catch (e0) {}

    session.root = root;
    session.edit = edit;
    return { view: root, params: lp };
  }

  proto.openShortXUiImeWindow = function (autoFocus) {
    if (!this.state) this.state = {};
    var cap = capability();
    if (!cap.ok) {
      var unavailable = { ok: false, code: "RUNTIME_MISMATCH", capability: cap };
      this.state.shortXUiImeLastResult = unavailable;
      persist(this);
      refreshStatus(this);
      return unavailable;
    }
    var old = this.state.shortXUiImeSession;
    if (old && old.host && old.host.getState && old.host.getState() !== "DISPOSED") {
      var already = { ok: true, code: "ALREADY_OPEN", snapshot: sessionSnapshot(old) };
      this.state.shortXUiImeLastResult = already;
      persist(this);
      refreshStatus(this);
      return already;
    }

    var dispatcher = global.ShortXUI.Dispatcher.fromHandler(this.state.h, "shortx-ui-ime-focus");
    var host = global.ShortXUI.WindowHost.create({
      name: "toolhub-ime-focus-lab",
      dispatcher: dispatcher,
      windowManager: this.state.wm,
      timeoutMs: 1800
    });
    var session = {
      lifecycle: "OPENING",
      host: host,
      dispatcher: dispatcher,
      root: null,
      edit: null,
      originalGeometry: null,
      imeVisible: false,
      imeHeight: 0,
      imeSource: "",
      adjusted: false,
      geometryRestored: true,
      cancelled: false,
      transitions: [],
      stats: {
        focusRequests: 0,
        showRequests: 0,
        visibleConfirmed: 0,
        hideRequests: 0,
        hiddenConfirmed: 0,
        restorePasses: 0,
        normalCloses: 0,
        immediateCloses: 0,
        timeouts: 0,
        errors: 0
      }
    };
    this.state.shortXUiImeSession = session;
    var self = this;
    var prepared = host.prepare(function () { return createWindowBundle(self, session); });
    var attached = prepared.ok ? host.attach(1800) : prepared;
    if (!attached.ok) {
      session.stats.errors += 1;
      transition(session, "ERROR", "attach-failed");
      try { host.dispose(1800); } catch (e0) {}
      safeDispatcherDispose(dispatcher);
      var failed = { ok: false, code: String(attached.code || "ATTACH_FAILED"), prepared: prepared, attached: attached, snapshot: sessionSnapshot(session) };
      this.state.shortXUiImeLastResult = failed;
      persist(this);
      refreshStatus(this);
      return failed;
    }
    session.originalGeometry = currentGeometry(session);
    transition(session, "ATTACHED", "window-attached");
    var result = { ok: true, code: "ATTACHED", prepared: prepared, attached: attached, snapshot: sessionSnapshot(session) };
    this.state.shortXUiImeLastResult = result;
    persist(this);
    refreshStatus(this);
    if (autoFocus === true) {
      dispatcher.postDelayed(function () { requestShow(self, null); }, 160, "shortx-ui-ime-autofocus");
    }
    return result;
  };

  proto.showShortXUiIme = function () {
    var open = this.openShortXUiImeWindow(false);
    if (!open.ok) return open;
    return requestShow(this, null);
  };

  proto.hideShortXUiIme = function () {
    return requestHide(this, null);
  };

  proto.refreshShortXUiImeState = function () {
    var session = this.state ? this.state.shortXUiImeSession : null;
    if (session) {
      var info = readIme(session);
      session.imeVisible = info.visible === true;
      session.imeHeight = Number(info.height || 0);
      session.imeSource = String(info.source || "");
    }
    var result = { ok: capability().ok, code: "REFRESHED", capability: capability(), snapshot: sessionSnapshot(session) };
    if (!this.state) this.state = {};
    this.state.shortXUiImeLastResult = result;
    persist(this);
    refreshStatus(this);
    return result;
  };

  proto.closeShortXUiImeWindow = function (immediate, preserveStress) {
    if (!this.state) this.state = {};
    var session = this.state.shortXUiImeSession;
    if (!session || !session.host) {
      var closed = { ok: true, code: "ALREADY_CLOSED", state: "DISPOSED" };
      this.state.shortXUiImeLastResult = closed;
      persist(this);
      refreshStatus(this);
      return closed;
    }
    if (preserveStress !== true) session.cancelled = true;
    transition(session, "CLOSING", immediate === true ? "close-immediate" : "close-normal");
    try {
      session.dispatcher.runSync(function () {
        var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
        var token = null;
        try { token = session.edit ? session.edit.getWindowToken() : null; } catch (e0) { token = null; }
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
    session.imeVisible = false;
    session.imeHeight = 0;
    var result = {
      ok: removed.ok === true && disposed.ok === true,
      code: String(removed.code || ""),
      immediate: immediate === true,
      removed: removed,
      disposed: disposed,
      snapshot: sessionSnapshot(session)
    };
    safeDispatcherDispose(session.dispatcher);
    this.state.shortXUiImeSession = null;
    this.state.shortXUiImeLastResult = result;
    persist(this);
    refreshStatus(this);
    return result;
  };

  proto.runShortXUiImeStress = function () {
    if (!this.state) this.state = {};
    var cap = capability();
    if (!cap.ok) {
      var unavailable = { schema: 1, ok: false, running: false, code: "RUNTIME_MISMATCH", capability: cap };
      this.state.shortXUiImeStressResult = unavailable;
      persist(this);
      refreshStatus(this);
      return unavailable;
    }
    var existing = this.state.shortXUiImeStressResult;
    if (existing && existing.running === true) return existing;
    try { this.closeShortXUiImeWindow(true); } catch (e0) {}

    var self = this;
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
    persist(this);
    refreshStatus(this);

    function failCycle(index, code, detail) {
      stress.running = false;
      stress.ok = false;
      stress.finishedAt = now();
      stress.durationMs = Math.max(0, stress.finishedAt - stress.startedAt);
      stress.errors += 1;
      stress.cycles.push({ index: index + 1, ok: false, code: String(code || "FAILED"), detail: detail || null });
      try { self.closeShortXUiImeWindow(true, true); } catch (e1) {}
      persist(self);
      refreshStatus(self);
    }

    function next(index) {
      if (index >= phase.STRESS_CYCLES) {
        stress.running = false;
        stress.ok = stress.cyclesCompleted === phase.STRESS_CYCLES &&
          stress.visiblePasses === phase.STRESS_CYCLES &&
          stress.hideRestorePasses === phase.STRESS_CYCLES / 2 &&
          stress.closeWhileVisiblePasses === phase.STRESS_CYCLES / 2 &&
          stress.errors === 0;
        stress.finishedAt = now();
        stress.durationMs = Math.max(0, stress.finishedAt - stress.startedAt);
        persist(self);
        refreshStatus(self);
        return;
      }

      var opened = self.openShortXUiImeWindow(false);
      if (!opened.ok) {
        failCycle(index, "OPEN_FAILED", opened);
        return;
      }
      var session = self.state.shortXUiImeSession;
      if (!session) {
        failCycle(index, "SESSION_MISSING", null);
        return;
      }

      requestShow(self, function (visibleOk, visibleInfo) {
        if (!visibleOk) {
          stress.timeouts += 1;
          failCycle(index, "IME_VISIBLE_FAILED", visibleInfo);
          return;
        }
        stress.visiblePasses += 1;
        var immediate = index % 4 === 1 || index % 4 === 2;
        var closeWhileVisible = index % 2 === 1;

        if (closeWhileVisible) {
          var closeVisible = self.closeShortXUiImeWindow(immediate, true);
          if (!closeVisible.ok) {
            failCycle(index, "CLOSE_VISIBLE_FAILED", closeVisible);
            return;
          }
          stress.closeWhileVisiblePasses += 1;
          if (immediate) stress.immediateCloses += 1;
          else stress.normalCloses += 1;
          stress.cyclesCompleted += 1;
          stress.cycles.push({
            index: index + 1,
            ok: true,
            mode: "close_while_visible",
            immediate: immediate,
            visibleSource: String(visibleInfo.source || ""),
            closeCode: String(closeVisible.code || "")
          });
          persist(self);
          refreshStatus(self);
          new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(new java.lang.Runnable({
            run: function () { next(index + 1); }
          }), 140);
          return;
        }

        requestHide(self, function (hiddenOk, hiddenInfo) {
          if (!hiddenOk) {
            stress.timeouts += 1;
            failCycle(index, "IME_HIDE_FAILED", hiddenInfo);
            return;
          }
          var beforeClose = self.state.shortXUiImeSession;
          var restored = beforeClose ? beforeClose.geometryRestored === true : false;
          var closeAfterHide = self.closeShortXUiImeWindow(immediate, true);
          if (!restored || !closeAfterHide.ok) {
            failCycle(index, "RESTORE_OR_CLOSE_FAILED", { restored: restored, close: closeAfterHide });
            return;
          }
          stress.hideRestorePasses += 1;
          if (immediate) stress.immediateCloses += 1;
          else stress.normalCloses += 1;
          stress.cyclesCompleted += 1;
          stress.cycles.push({
            index: index + 1,
            ok: true,
            mode: "hide_restore",
            immediate: immediate,
            hiddenSource: String(hiddenInfo.source || ""),
            geometryRestored: restored,
            closeCode: String(closeAfterHide.code || "")
          });
          persist(self);
          refreshStatus(self);
          new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(new java.lang.Runnable({
            run: function () { next(index + 1); }
          }), 140);
        });
      });
    }

    next(0);
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
        title.setText("IME + Focus 生命周期");
        title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        global.ShortXUI.Color.applyText(title, onSurface);
        box.addView(title, new android.widget.LinearLayout.LayoutParams(-1, -2));

        var desc = new android.widget.TextView(context);
        desc.setText("独立可输入 Overlay：焦点、键盘可见性、可逆避让、显示期间关闭和 20 次混合循环。");
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
        this.state.shortXUiImeStatusView = status;

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
          { title: "打开输入窗口", action: function () { self.openShortXUiImeWindow(false); refreshStatus(self); } },
          { title: "显示键盘", action: function () { self.showShortXUiIme(); refreshStatus(self); } }
        ]);
        addRow([
          { title: "收起并恢复", action: function () { self.hideShortXUiIme(); refreshStatus(self); } },
          { title: "刷新状态", action: function () { self.refreshShortXUiImeState(); } }
        ]);
        addRow([
          { title: "普通关闭", action: function () { self.closeShortXUiImeWindow(false); } },
          { title: "立即关闭", action: function () { self.closeShortXUiImeWindow(true); } }
        ]);
        addRow([
          { title: "运行 20 次 IME 循环", action: function () { self.runShortXUiImeStress(); refreshStatus(self); } }
        ]);

        var cap = capability();
        if (!cap.ok) {
          try { box.setAlpha(0.55); } catch (e0) {}
        }
        var boxLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
        boxLp.bottomMargin = m.dp(10);
        content.addView(box, boxLp);

        function patchBoundary(view) {
          if (!view) return;
          try {
            if (view instanceof android.widget.TextView) {
              var text = String(view.getText ? view.getText() : "");
              if (text.indexOf("Diagnostics / WindowHost") >= 0 && text.indexOf(" / IME") < 0) {
                text = text.replace("Diagnostics / WindowHost", "Diagnostics / WindowHost / IME");
              }
              text = text.replace("未启用：IME / Gesture / Canvas / DEX Bridge", "未启用：Gesture / Canvas / DEX Bridge");
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
        try { safeLog(this.L, "e", "build ShortXUI IME lab section failed: " + errorText(error)); } catch (e3) {}
      }
      return panel;
    };
  }

  var oldGetState = proto.getShortXUiLabState;
  if (typeof oldGetState === "function") {
    proto.getShortXUiLabState = function () {
      var state = oldGetState.call(this) || {};
      state.imeCapability = capability();
      state.imeFocus = this.state ? this.state.shortXUiImeLastResult || sessionSnapshot(this.state.shortXUiImeSession || null) : null;
      state.imeStress = this.state ? this.state.shortXUiImeStressResult || null : null;
      return state;
    };
  }

  var oldClose = proto.close;
  if (typeof oldClose === "function") {
    proto.close = function () {
      try {
        if (this.state && this.state.shortXUiImeSession) this.closeShortXUiImeWindow(true);
      } catch (e0) {
        try { safeLog(this.L, "w", "ShortXUI IME close cleanup failed: " + errorText(e0)); } catch (e1) {}
      }
      return oldClose.apply(this, arguments);
    };
  }

  global.ToolHubBetaPhase3 = phase;
  proto.__toolHubShortXUiImePhase3Installed = true;
  try { writeLog("ShortXUI IME phase3 installed version=" + phase.VERSION); } catch (e0) {}
}(function () { return this; }()));
