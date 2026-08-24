// @version 0.2.0
// ToolHub Beta adapter and ToolApp page for ShortXUI Phase 2 WindowHost lifecycle tests.
(function (global) {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
  if (!global.ShortXUI || global.ShortXUI.__runtimeInstalled !== true) return;

  var proto = FloatBallAppWM.prototype;
  if (proto.__shortXUiLabInstalled === true) return;

  global.ShortXUI.Color.installBridge({
    colorStateList: function (value) {
      return toolhubSafeColorStateList(value);
    },
    stateList: function (states, colors) {
      return toolhubSafeColorStateListFromStates(states, colors);
    },
    applyText: function (view, value) {
      return toolhubSafeSetTextColor(view, value);
    },
    applyHint: function (view, value) {
      return toolhubSafeSetHintTextColor(view, value);
    },
    applyPaint: function (paint, value) {
      return toolhubSafeSetPaintColor(paint, value);
    },
    applyBackground: function (view, value) {
      return toolhubSafeSetBackgroundColor(view, value);
    },
    applyGradient: function (drawable, value) {
      return toolhubSafeSetGradientColor(drawable, value);
    },
    applyStroke: function (drawable, widthPx, value) {
      return toolhubSafeSetGradientStroke(drawable, widthPx, value);
    }
  });

  function shortXUiLabWriteAtomic(app, value) {
    var out = null;
    var target = null;
    var temp = null;
    try {
      var root = "";
      try {
        if (typeof getToolHubRootDir === "function") root = String(getToolHubRootDir() || "");
      } catch (ignoredRoot) {}
      if (!root && typeof APP_ROOT_DIR !== "undefined") root = String(APP_ROOT_DIR || "");
      if (!root) return false;
      target = new java.io.File(root + "/diagnostics/shortx-ui/latest.json");
      var parent = target.getParentFile();
      if (parent && !parent.exists() && !parent.mkdirs() && !parent.exists()) throw "mkdirs failed";
      temp = new java.io.File(target.getAbsolutePath() + ".tmp");
      out = new java.io.OutputStreamWriter(new java.io.FileOutputStream(temp, false), "UTF-8");
      out.write(JSON.stringify(value, null, 2) + "\n");
      out.flush();
      out.close();
      out = null;
      if (target.exists() && !target.delete()) throw "replace old result failed";
      if (!temp.renameTo(target)) throw "publish result failed";
      return true;
    } catch (error) {
      try { safeLog(app && app.L, "w", "ShortXUI diagnostics save failed: " + String(error)); } catch (ignoredLog) {}
      return false;
    } finally {
      try { if (out) out.close(); } catch (ignoredClose) {}
      try { if (temp && temp.exists()) temp.delete(); } catch (ignoredTemp) {}
    }
  }

  function shortXUiLabFormat(value) {
    var lines = [];
    var checks = value && value.checks ? value.checks : [];
    var index;
    lines.push("ShortXUI " + String(value && value.runtimeVersion || "unknown"));
    lines.push("状态：" + (value && value.ok ? "通过" : "失败"));
    lines.push("耗时：" + String(Number(value && value.durationMs || 0)) + " ms");
    if (value && value.metrics) {
      lines.push("density=" + String(value.metrics.density) + " scaledDensity=" + String(value.metrics.scaledDensity) + " fontScale=" + String(value.metrics.fontScale));
    }
    if (value && value.display) {
      lines.push("显示：" + String(value.display.orientation) + " " + String(value.display.width) + "×" + String(value.display.height));
      lines.push("安全区域：" + String(value.display.safeWidth) + "×" + String(value.display.safeHeight) + " source=" + String(value.display.source));
    }
    for (index = 0; index < checks.length; index += 1) {
      lines.push((checks[index].ok ? "[OK] " : "[FAIL] ") + String(checks[index].name) + (checks[index].error ? " - " + String(checks[index].error) : ""));
    }
    return lines.join("\n");
  }


  function shortXUiLabPersistState(app) {
    if (!app.state) app.state = {};
    return shortXUiLabWriteAtomic(app, {
      schema: 2,
      runtimeVersion: global.ShortXUI.VERSION,
      ok: !(app.state.shortXUiLabLastResult && app.state.shortXUiLabLastResult.ok === false) &&
        !(app.state.shortXUiLabLastDispatcherResult && app.state.shortXUiLabLastDispatcherResult.ok === false) &&
        !(app.state.shortXUiLabLastWindowResult && app.state.shortXUiLabLastWindowResult.ok === false) &&
        !(app.state.shortXUiLabLastWindowStressResult && app.state.shortXUiLabLastWindowStressResult.ok === false),
      savedAt: Number(java.lang.System.currentTimeMillis()),
      basic: app.state.shortXUiLabLastResult || null,
      dispatcher: app.state.shortXUiLabLastDispatcherResult || null,
      windowHost: app.state.shortXUiLabLastWindowResult || null,
      windowStress: app.state.shortXUiLabLastWindowStressResult || null
    });
  }

  function shortXUiLabDispatcherFormat(value) {
    function one(name, item) {
      if (!item) return name + "：未运行";
      if (item.skipped) return name + "：跳过（" + String(item.reason || "") + "）";
      var result = item.result || {};
      var state = item.state || {};
      return name + "：" + (result.ok ? "通过" : "失败") +
        " · direct=" + String(Number(state.direct || 0)) +
        " posted=" + String(Number(state.posted || 0)) +
        " executed=" + String(Number(state.executed || 0)) +
        " timeout=" + String(Number(state.timedOut || 0)) +
        " errors=" + String(Number(state.errors || 0));
    }
    return ["Dispatcher：" + (value && value.ok ? "通过" : "失败"), one("Android Main", value && value.main), one("ToolHub WM", value && value.wm)].join("\n");
  }

  function shortXUiLabWindowFormat(value) {
    if (!value) return "WindowHost：尚未运行";
    var snapshot = value.snapshot || {};
    var stats = snapshot.stats || {};
    return [
      "WindowHost：" + (value.ok ? "通过" : "失败") + " · " + String(value.code || ""),
      "状态=" + String(snapshot.state || value.state || "") + " attached=" + String(snapshot.attached === true),
      "add=" + String(Number(stats.attachCalls || 0)) + " update=" + String(Number(stats.updateCalls || 0)) +
        " remove=" + String(Number(stats.removeCalls || 0)) + " detach=" + String(Number(stats.detached || 0)),
      "timeout=" + String(Number(stats.detachTimeouts || 0)) + " late=" + String(Number(stats.lateDetach || 0)) +
        " errors=" + String(Number(stats.errors || 0))
    ].join("\n");
  }

  function shortXUiLabWindowType() {
    if (android.os.Build.VERSION.SDK_INT >= 26) return android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
    return android.view.WindowManager.LayoutParams.TYPE_PHONE;
  }

  proto.runShortXUiLabBasicSelfTest = function () {
    var result;
    try {
      result = global.ShortXUI.Diagnostics.runBasic(context, this.state && this.state.wm ? this.state.wm : null);
    } catch (error) {
      result = {
        schema: 1,
        runtimeVersion: global.ShortXUI.VERSION,
        ok: false,
        durationMs: 0,
        checks: [],
        errors: [global.ShortXUI.Core.errorText(error)]
      };
    }
    if (!this.state) this.state = {};
    this.state.shortXUiLabLastResult = result;
    this.state.shortXUiLabRunCount = Number(this.state.shortXUiLabRunCount || 0) + 1;
    this.state.shortXUiLabLastAt = Number(java.lang.System.currentTimeMillis());
    shortXUiLabPersistState(this);
    return result;
  };


  proto.shortXUiLabCreateWindowBundle = function (label) {
    var metrics = global.ShortXUI.Metrics.create(context);
    var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
    var primary = T ? T.primary : android.graphics.Color.parseColor("#FF6750A4");
    var onSurface = T ? T.onSurface : android.graphics.Color.WHITE;
    var surface = T ? T.surface : android.graphics.Color.parseColor("#FF202124");
    var outline = T ? T.outlineVariant : android.graphics.Color.GRAY;
    var root = new android.widget.LinearLayout(context);
    root.setOrientation(android.widget.LinearLayout.VERTICAL);
    root.setPadding(metrics.dp(14), metrics.dp(12), metrics.dp(14), metrics.dp(12));
    root.setBackground(global.ShortXUI.Shape.strokeRect(surface, outline, metrics.dp(1), metrics.dp(16)));
    var title = new android.widget.TextView(context);
    title.setText("ShortXUI WindowHost");
    title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    title.setTypeface(null, android.graphics.Typeface.BOLD);
    global.ShortXUI.Color.applyText(title, onSurface);
    root.addView(title, new android.widget.LinearLayout.LayoutParams(-1, -2));
    var detail = new android.widget.TextView(context);
    detail.setText(String(label || "独立实验窗口") + "\n仅由 Beta 实验室 WindowHost 管理");
    detail.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    detail.setPadding(0, metrics.dp(6), 0, metrics.dp(10));
    global.ShortXUI.Color.applyText(detail, onSurface);
    root.addView(detail, new android.widget.LinearLayout.LayoutParams(-1, -2));
    var close = new android.widget.TextView(context);
    close.setText("关闭实验窗口");
    close.setGravity(android.view.Gravity.CENTER);
    close.setPadding(metrics.dp(12), metrics.dp(10), metrics.dp(12), metrics.dp(10));
    close.setBackground(global.ShortXUI.Shape.pressed(primary, global.ShortXUI.Color.withAlpha(primary, 0.72), metrics.dp(12)));
    global.ShortXUI.Color.applyText(close, T && T.onPrimary ? T.onPrimary : android.graphics.Color.WHITE);
    var self = this;
    close.setOnClickListener(new android.view.View.OnClickListener({
      onClick: function () { self.closeShortXUiLabWindowHost(true); }
    }));
    root.addView(close, new android.widget.LinearLayout.LayoutParams(-1, -2));

    var lp = new android.view.WindowManager.LayoutParams();
    lp.width = metrics.dp(270);
    lp.height = android.view.WindowManager.LayoutParams.WRAP_CONTENT;
    lp.type = shortXUiLabWindowType();
    lp.flags = android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
      android.view.WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
      android.view.WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN;
    lp.format = android.graphics.PixelFormat.TRANSLUCENT;
    lp.gravity = android.view.Gravity.TOP | android.view.Gravity.LEFT;
    lp.x = metrics.dp(20);
    lp.y = metrics.dp(110);
    try { lp.setTitle("ShortXUI WindowHost Lab"); } catch (ignoredTitle) {}
    return { view: root, params: lp };
  };

  proto.openShortXUiLabWindowHost = function () {
    if (!this.state) this.state = {};
    var existing = this.state.shortXUiLabWindowHost;
    if (existing && existing.getState && existing.getState() !== "DISPOSED") {
      var current = { ok: true, code: "ALREADY_OPEN", state: existing.getState(), snapshot: existing.snapshot() };
      this.state.shortXUiLabLastWindowResult = current;
      shortXUiLabPersistState(this);
      return current;
    }
    if (!this.state.wm || !this.state.h) {
      var unavailable = { ok: false, code: "WM_UNAVAILABLE", state: "NEW" };
      this.state.shortXUiLabLastWindowResult = unavailable;
      shortXUiLabPersistState(this);
      return unavailable;
    }
    var dispatcher = global.ShortXUI.Dispatcher.fromHandler(this.state.h, "shortx-ui-windowhost");
    var host = global.ShortXUI.WindowHost.create({
      name: "toolhub-windowhost-lab",
      dispatcher: dispatcher,
      windowManager: this.state.wm,
      timeoutMs: 1800
    });
    var self = this;
    var prepared = host.prepare(function () { return self.shortXUiLabCreateWindowBundle("手动验证"); });
    var attached = prepared.ok ? host.attach(1800) : prepared;
    var result = {
      ok: attached.ok === true,
      code: String(attached.code || ""),
      state: host.getState(),
      prepared: prepared,
      attached: attached,
      snapshot: host.snapshot()
    };
    this.state.shortXUiLabWindowDispatcher = dispatcher;
    this.state.shortXUiLabWindowHost = host;
    this.state.shortXUiLabLastWindowResult = result;
    shortXUiLabPersistState(this);
    return result;
  };

  proto.moveShortXUiLabWindowHost = function () {
    if (!this.state || !this.state.shortXUiLabWindowHost) return { ok: false, code: "NOT_OPEN" };
    var display = global.ShortXUI.Display.snapshot(context, this.state.wm);
    var metrics = global.ShortXUI.Metrics.create(context);
    var result = this.state.shortXUiLabWindowHost.update(function (lp) {
      var maxX = Math.max(0, Number(display.safeWidth || display.width || 0) - Math.max(metrics.dp(120), Number(lp.width || 0)));
      var maxY = Math.max(metrics.dp(80), Number(display.safeHeight || display.height || 0) - metrics.dp(180));
      lp.x = (Number(lp.x || 0) + metrics.dp(28)) % Math.max(1, maxX + 1);
      lp.y = metrics.dp(80) + ((Number(lp.y || 0) + metrics.dp(24)) % Math.max(1, maxY - metrics.dp(80) + 1));
    }, 1800);
    result.snapshot = this.state.shortXUiLabWindowHost.snapshot();
    this.state.shortXUiLabLastWindowResult = result;
    shortXUiLabPersistState(this);
    return result;
  };

  proto.closeShortXUiLabWindowHost = function (immediate) {
    if (!this.state || !this.state.shortXUiLabWindowHost) return { ok: true, code: "ALREADY_CLOSED" };
    var host = this.state.shortXUiLabWindowHost;
    var dispatcher = this.state.shortXUiLabWindowDispatcher;
    var removed = host.remove(immediate === true, 1800);
    var disposed = removed.ok ? host.dispose(1800) : { ok: false, code: "NOT_DISPOSED" };
    var result = {
      ok: removed.ok === true && disposed.ok === true,
      code: String(removed.code || ""),
      state: host.getState(),
      immediate: immediate === true,
      removed: removed,
      disposed: disposed,
      snapshot: host.snapshot()
    };
    if (disposed.ok) {
      try { if (dispatcher) dispatcher.dispose(); } catch (ignoredDispatcher) {}
      this.state.shortXUiLabWindowHost = null;
      this.state.shortXUiLabWindowDispatcher = null;
    }
    this.state.shortXUiLabLastWindowResult = result;
    shortXUiLabPersistState(this);
    return result;
  };

  proto.runShortXUiLabWindowHostStress = function () {
    var startedAt = Number(java.lang.System.currentTimeMillis());
    var cycles = [];
    var ok = true;
    var index;
    if (!this.state) this.state = {};
    this.closeShortXUiLabWindowHost(true);
    for (index = 0; index < 10; index += 1) {
      var dispatcher = global.ShortXUI.Dispatcher.fromHandler(this.state.h, "shortx-ui-windowhost-stress-" + String(index));
      var host = global.ShortXUI.WindowHost.create({ name: "stress-" + String(index), dispatcher: dispatcher, windowManager: this.state.wm, timeoutMs: 1800 });
      var self = this;
      var prepared = host.prepare(function () { return self.shortXUiLabCreateWindowBundle("循环 " + String(index + 1)); });
      var attached = prepared.ok ? host.attach(1800) : prepared;
      var updated = attached.ok ? host.update(function (lp) { lp.x = Number(lp.x || 0) + index; }, 1800) : { ok: false, code: "SKIPPED" };
      var removed = attached.ok ? host.remove(index % 2 === 1, 1800) : { ok: false, code: "SKIPPED" };
      var disposed = removed.ok ? host.dispose(1800) : { ok: false, code: "SKIPPED" };
      var cycleOk = prepared.ok && attached.ok && updated.ok && removed.ok && disposed.ok;
      cycles.push({ index: index + 1, ok: cycleOk, prepared: prepared.code, attached: attached.code, updated: updated.code, removed: removed.code, disposed: disposed.code, snapshot: host.snapshot() });
      if (!cycleOk) ok = false;
      try { dispatcher.dispose(); } catch (ignoredDispose) {}
      if (!cycleOk) break;
    }
    var result = {
      schema: 1,
      runtimeVersion: global.ShortXUI.VERSION,
      ok: ok && cycles.length === 10,
      cyclesRequested: 10,
      cyclesCompleted: cycles.length,
      durationMs: Math.max(0, Number(java.lang.System.currentTimeMillis()) - startedAt),
      cycles: cycles
    };
    this.state.shortXUiLabLastWindowStressResult = result;
    shortXUiLabPersistState(this);
    return result;
  };

  proto.runShortXUiLabDispatcherSelfTest = function () {
    var main = global.ShortXUI.Dispatcher.main();
    var wm = null;
    var result = {
      schema: 1,
      runtimeVersion: global.ShortXUI.VERSION,
      ok: true,
      main: null,
      wm: null,
      error: ""
    };
    try {
      var direct = main.runSync(function () {
        return String(java.lang.Thread.currentThread().getName());
      }, 1500);
      result.main = { result: direct, state: main.getState() };
      if (!direct.ok) result.ok = false;
      if (this.state && this.state.h) {
        wm = global.ShortXUI.Dispatcher.fromHandler(this.state.h, "toolhub-wm-lab");
        var wmResult = wm.runSync(function () {
          return String(java.lang.Thread.currentThread().getName());
        }, 1800);
        result.wm = { result: wmResult, state: wm.getState() };
        if (!wmResult.ok) result.ok = false;
      } else {
        result.wm = { skipped: true, reason: "wm-handler-unavailable" };
      }
    } catch (error) {
      result.ok = false;
      result.error = global.ShortXUI.Core.errorText(error);
    } finally {
      try { main.dispose(); } catch (ignoredMain) {}
      try { if (wm) wm.dispose(); } catch (ignoredWm) {}
    }
    if (!this.state) this.state = {};
    this.state.shortXUiLabLastDispatcherResult = result;
    shortXUiLabPersistState(this);
    return result;
  };

  proto.getShortXUiLabState = function () {
    return {
      installed: true,
      betaOnly: true,
      runtimeVersion: global.ShortXUI.VERSION,
      runCount: Number(this.state && this.state.shortXUiLabRunCount || 0),
      lastAt: Number(this.state && this.state.shortXUiLabLastAt || 0),
      lastResult: this.state ? this.state.shortXUiLabLastResult || null : null,
      lastDispatcherResult: this.state ? this.state.shortXUiLabLastDispatcherResult || null : null,
      lastWindowResult: this.state ? this.state.shortXUiLabLastWindowResult || null : null,
      lastWindowStressResult: this.state ? this.state.shortXUiLabLastWindowStressResult || null : null
    };
  };

  proto.buildShortXUiLabPanelView = function () {
    var self = this;
    var metrics = global.ShortXUI.Metrics.create(context);
    var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
    var primary = T ? T.primary : android.graphics.Color.parseColor("#FF6750A4");
    var onSurface = T ? T.onSurface : android.graphics.Color.WHITE;
    var onSurface2 = T ? T.onSurface2 : android.graphics.Color.LTGRAY;
    var surface = T ? T.surface : android.graphics.Color.parseColor("#FF202124");
    var surface2 = T ? T.surface2 : android.graphics.Color.parseColor("#FF2B2C30");
    var outline = T ? T.outlineVariant : android.graphics.Color.GRAY;
    var panel = this.ui && this.ui.createStyledPanel ? this.ui.createStyledPanel(this, 16) : new android.widget.LinearLayout(context);
    panel.setOrientation(android.widget.LinearLayout.VERTICAL);

    function text(value, sizeSp, color, bold) {
      var view = new android.widget.TextView(context);
      view.setText(String(value || ""));
      view.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, Number(sizeSp || 13));
      global.ShortXUI.Color.applyText(view, color);
      try { view.setIncludeFontPadding(false); } catch (ignoredPadding) {}
      if (bold) view.setTypeface(null, android.graphics.Typeface.BOLD);
      return view;
    }

    function section(title, desc) {
      var box = new android.widget.LinearLayout(context);
      box.setOrientation(android.widget.LinearLayout.VERTICAL);
      box.setPadding(metrics.dp(12), metrics.dp(10), metrics.dp(12), metrics.dp(12));
      box.setBackground(global.ShortXUI.Shape.strokeRect(surface2, outline, metrics.dp(1), metrics.dp(16)));
      var titleView = text(title, 15, onSurface, true);
      box.addView(titleView, new android.widget.LinearLayout.LayoutParams(-1, -2));
      if (desc) {
        var descView = text(desc, 11, onSurface2, false);
        descView.setPadding(0, metrics.dp(3), 0, metrics.dp(8));
        box.addView(descView, new android.widget.LinearLayout.LayoutParams(-1, -2));
      }
      var lp = new android.widget.LinearLayout.LayoutParams(-1, -2);
      lp.setMargins(0, 0, 0, metrics.dp(10));
      return { view: box, params: lp };
    }

    var header = new android.widget.LinearLayout(context);
    header.setOrientation(android.widget.LinearLayout.VERTICAL);
    var titleView = text("ShortX UI 实验室", 20, onSurface, true);
    header.addView(titleView, new android.widget.LinearLayout.LayoutParams(-1, -2));
    var subtitle = text("Beta 隔离实验 · 已加入独立 WindowHost，不替换正式 UI", 12, onSurface2, false);
    subtitle.setPadding(0, metrics.dp(4), 0, metrics.dp(12));
    header.addView(subtitle, new android.widget.LinearLayout.LayoutParams(-1, -2));
    panel.addView(header, new android.widget.LinearLayout.LayoutParams(-1, -2));

    var scroll = new android.widget.ScrollView(context);
    scroll.setFillViewport(true);
    var content = new android.widget.LinearLayout(context);
    content.setOrientation(android.widget.LinearLayout.VERTICAL);
    scroll.addView(content, new android.widget.FrameLayout.LayoutParams(-1, -2));

    var statusSection = section("运行环境", "检查 ShortXUI 版本、显示参数、颜色桥和 Shape 工厂。");
    var statusText = text("尚未运行", 11, onSurface2, false);
    statusText.setTypeface(android.graphics.Typeface.MONOSPACE);
    statusText.setTextIsSelectable(false);
    statusText.setPadding(metrics.dp(10), metrics.dp(9), metrics.dp(10), metrics.dp(9));
    statusText.setBackground(global.ShortXUI.Shape.roundRect(surface, metrics.dp(12)));
    statusSection.view.addView(statusText, new android.widget.LinearLayout.LayoutParams(-1, -2));

    var actionRow = new android.widget.LinearLayout(context);
    actionRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    actionRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
    actionRow.setPadding(0, metrics.dp(8), 0, 0);
    var runButton = this.ui.createSolidButton(this, "运行基础自检", primary, T && T.onPrimary ? T.onPrimary : android.graphics.Color.WHITE, function () {
      var result = self.runShortXUiLabBasicSelfTest();
      statusText.setText(shortXUiLabFormat(result));
    });
    var threadButton = this.ui.createFlatButton(this, "线程自检", primary, function () {
      var result = self.runShortXUiLabDispatcherSelfTest();
      statusText.setText(shortXUiLabFormat(self.state.shortXUiLabLastResult || self.runShortXUiLabBasicSelfTest()) + "\n\n" + shortXUiLabDispatcherFormat(result));
    });
    var runLp = new android.widget.LinearLayout.LayoutParams(0, metrics.dp(48), 1);
    runLp.setMargins(0, 0, metrics.dp(6), 0);
    actionRow.addView(runButton, runLp);
    actionRow.addView(threadButton, new android.widget.LinearLayout.LayoutParams(0, metrics.dp(48), 1));
    statusSection.view.addView(actionRow, new android.widget.LinearLayout.LayoutParams(-1, -2));
    content.addView(statusSection.view, statusSection.params);


    var windowSection = section("WindowHost 生命周期", "独立实验窗口：创建、移动、普通/立即移除和 detach 确认，不调用正式 safeRemoveView。");
    var windowStatus = text(shortXUiLabWindowFormat(this.state && this.state.shortXUiLabLastWindowResult), 11, onSurface2, false);
    windowStatus.setTypeface(android.graphics.Typeface.MONOSPACE);
    windowStatus.setPadding(metrics.dp(10), metrics.dp(9), metrics.dp(10), metrics.dp(9));
    windowStatus.setBackground(global.ShortXUI.Shape.roundRect(surface, metrics.dp(12)));
    windowSection.view.addView(windowStatus, new android.widget.LinearLayout.LayoutParams(-1, -2));

    function addWindowActionRow(items) {
      var row = new android.widget.LinearLayout(context);
      row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
      var itemIndex;
      for (itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
        var button = self.ui.createFlatButton(self, items[itemIndex].title, primary, items[itemIndex].action);
        var buttonLp = new android.widget.LinearLayout.LayoutParams(0, metrics.dp(46), 1);
        if (itemIndex > 0) buttonLp.leftMargin = metrics.dp(6);
        row.addView(button, buttonLp);
      }
      var rowLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
      rowLp.topMargin = metrics.dp(7);
      windowSection.view.addView(row, rowLp);
    }

    addWindowActionRow([
      { title: "打开实验窗口", action: function () { windowStatus.setText(shortXUiLabWindowFormat(self.openShortXUiLabWindowHost())); } },
      { title: "移动", action: function () { windowStatus.setText(shortXUiLabWindowFormat(self.moveShortXUiLabWindowHost())); } }
    ]);
    addWindowActionRow([
      { title: "普通移除", action: function () { windowStatus.setText(shortXUiLabWindowFormat(self.closeShortXUiLabWindowHost(false))); } },
      { title: "立即移除", action: function () { windowStatus.setText(shortXUiLabWindowFormat(self.closeShortXUiLabWindowHost(true))); } }
    ]);
    addWindowActionRow([
      { title: "运行 10 次循环", action: function () {
        var stress = self.runShortXUiLabWindowHostStress();
        windowStatus.setText("压力测试：" + (stress.ok ? "通过" : "失败") + "\\n完成=" + String(stress.cyclesCompleted) + "/" + String(stress.cyclesRequested) + " 耗时=" + String(stress.durationMs) + "ms");
      } }
    ]);
    content.addView(windowSection.view, windowSection.params);

    var colorSection = section("颜色与 Shape", "直接调用 ShortXUI.Color 与 ShortXUI.Shape，不经过 ToolHub 原有 UI 工厂。");
    var colorRow = new android.widget.LinearLayout(context);
    colorRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    colorRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
    var colors = [primary, global.ShortXUI.Color.withAlpha(primary, 0.24), onSurface2];
    var index;
    for (index = 0; index < colors.length; index += 1) {
      var swatch = new android.view.View(context);
      swatch.setBackground(global.ShortXUI.Shape.strokeRect(colors[index], outline, metrics.dp(1), metrics.dp(12)));
      var swatchLp = new android.widget.LinearLayout.LayoutParams(0, metrics.dp(52), 1);
      if (index > 0) swatchLp.leftMargin = metrics.dp(8);
      colorRow.addView(swatch, swatchLp);
    }
    colorSection.view.addView(colorRow, new android.widget.LinearLayout.LayoutParams(-1, -2));
    content.addView(colorSection.view, colorSection.params);

    var boundarySection = section("当前边界", "WindowHost 仅管理独立实验窗口；未接管悬浮球、主面板、设置页、正式 WindowManager 路径、IME、Canvas 或指针/OCR。");
    var boundaryText = text("已启用：Core / Dispatcher / Scope / Color / Metrics / Display / Shape / Diagnostics\n未启用：WindowHost / IME / Gesture / Canvas / DEX Bridge", 12, onSurface2, false);
    boundarySection.view.addView(boundaryText, new android.widget.LinearLayout.LayoutParams(-1, -2));
    content.addView(boundarySection.view, boundarySection.params);

    var lastResult = this.state ? this.state.shortXUiLabLastResult : null;
    if (lastResult) statusText.setText(shortXUiLabFormat(lastResult));
    panel.addView(scroll, new android.widget.LinearLayout.LayoutParams(-1, 0, 1));
    return panel;
  };

  var oldIsToolAppRoute = proto.isToolAppRoute;
  proto.isToolAppRoute = function (route) {
    if (String(route || "") === "shortx_ui_lab") return true;
    return oldIsToolAppRoute ? oldIsToolAppRoute.call(this, route) : false;
  };

  var oldGetToolAppTitle = proto.getToolAppTitle;
  proto.getToolAppTitle = function (route) {
    if (String(route || "") === "shortx_ui_lab") return "ShortX UI 实验室";
    return oldGetToolAppTitle ? oldGetToolAppTitle.call(this, route) : String(route || "");
  };

  var oldBuildPanelView = proto.buildPanelView;
  proto.buildPanelView = function (panelType) {
    if (String(panelType || "") === "shortx_ui_lab") return this.buildShortXUiLabPanelView();
    return oldBuildPanelView.call(this, panelType);
  };

  var oldGetSettingsHomeCategoryDefs = proto.getSettingsHomeCategoryDefs;
  proto.getSettingsHomeCategoryDefs = function (useMonetHome) {
    var categories = oldGetSettingsHomeCategoryDefs ? oldGetSettingsHomeCategoryDefs.call(this, useMonetHome) : [];
    var child = {
      id: "shortx_ui_lab",
      title: "ShortX UI 实验室",
      desc: "Beta 基础运行时、线程、Shape 与 WindowHost 生命周期自检",
      icon: "⚗",
      kind: "route",
      key: "shortx_ui_lab"
    };
    var category = null;
    var index;
    var childIndex;
    for (index = 0; index < categories.length; index += 1) {
      if (categories[index] && (String(categories[index].id) === "record" || String(categories[index].id) === "all")) {
        category = categories[index];
        if (String(categories[index].id) === "record") break;
      }
    }
    if (!category && categories.length > 0) category = categories[categories.length - 1];
    if (!category) {
      category = { id: "shortx_ui", icon: "⚗", title: "实验", desc: "Beta 实验入口", children: [] };
      categories.push(category);
    }
    if (!category.children) category.children = [];
    for (childIndex = 0; childIndex < category.children.length; childIndex += 1) {
      if (String(category.children[childIndex] && category.children[childIndex].key || "") === "shortx_ui_lab") return categories;
    }
    category.children.push(child);
    return categories;
  };

  proto.__shortXUiLabInstalled = true;
}(function () { return this; }()));
