// @version 1.1.2
// =======================【取字 / OCR 顶部结果预览】=======================
// Canvas 全自绘单实例悬浮预览；点击后把完整文本传给 th_20_pickword.js。
(function() {
  function now21() {
    try { return java.lang.System.currentTimeMillis(); } catch (e0) {}
    return (new Date()).getTime();
  }

  function int21(value, fallback) {
    var n = Number(value);
    if (isNaN(n)) n = Number(fallback || 0);
    if (isNaN(n)) n = 0;
    return Math.round(n);
  }

  function clamp21(value, min, max) {
    var n = Number(value);
    if (isNaN(n)) n = min;
    if (n < min) n = min;
    if (n > max) n = max;
    return n;
  }

  function dp21(appObj, value) {
    try {
      if (appObj && typeof appObj.dp === "function") return Math.max(1, int21(appObj.dp(value), value));
    } catch (e0) {}
    var density = 1;
    try { density = Number(context.getResources().getDisplayMetrics().density || 1); } catch (e1) { density = 1; }
    return Math.max(1, Math.round(Number(value || 0) * density));
  }

  function sp21(value) {
    var scaled = 1;
    try { scaled = Number(context.getResources().getDisplayMetrics().scaledDensity || 1); } catch (e0) { scaled = 1; }
    return Math.max(1, Number(value || 0) * scaled);
  }

  function cleanPreviewText21(text) {
    var value = "";
    try { value = String(text === null || text === undefined ? "" : text); } catch (e0) { value = ""; }
    return value
      .replace(/\r\n|\r|\n/g, " ")
      .replace(/\t/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^\s+|\s+$/g, "");
  }

  function cloneRect21(rect) {
    if (!rect) return null;
    try {
      var left = int21(rect.left, 0);
      var top = int21(rect.top, 0);
      var right = int21(rect.right, 0);
      var bottom = int21(rect.bottom, 0);
      if (right <= left || bottom <= top) return null;
      return { left: left, top: top, right: right, bottom: bottom };
    } catch (e0) {}
    return null;
  }

  function mainHandler21() {
    return new android.os.Handler(android.os.Looper.getMainLooper());
  }

  function runOnMain21(fn) {
    try {
      var mainLooper = android.os.Looper.getMainLooper();
      var myLooper = android.os.Looper.myLooper();
      if (mainLooper !== null && myLooper !== null && mainLooper === myLooper) {
        fn();
        return true;
      }
    } catch (e0) {}
    try {
      return mainHandler21().post(new java.lang.Runnable({ run: function() {
        try { fn(); } catch (eRun) {}
      }})) === true;
    } catch (e1) {}
    return false;
  }

  function runOnMainSync21(fn, timeoutMs) {
    try {
      var mainLooper = android.os.Looper.getMainLooper();
      var myLooper = android.os.Looper.myLooper();
      if (mainLooper !== null && myLooper !== null && mainLooper === myLooper) {
        return { ok: true, value: fn() };
      }
    } catch (e0) {}

    var box = { ok: false, value: null, error: null };
    try {
      var latch = new java.util.concurrent.CountDownLatch(1);
      var h = mainHandler21();
      var task = new java.lang.Runnable({ run: function() {
        try {
          box.value = fn();
          box.ok = true;
        } catch (eRun) {
          box.error = eRun;
        } finally {
          try { latch.countDown(); } catch (eCount) {}
        }
      }});
      if (h.post(task) !== true) return { ok: false, error: "post-failed" };
      var done = latch["await"](Math.max(200, Number(timeoutMs || 2000)), java.util.concurrent.TimeUnit.MILLISECONDS);
      if (!done) {
        try { h.removeCallbacks(task); } catch (eRemove) {}
        return { ok: false, error: "timeout" };
      }
      return box;
    } catch (e1) {
      return { ok: false, error: e1 };
    }
  }

  function ensureState21(appObj) {
    if (!appObj || !appObj.state) return null;
    if (!appObj.state.resultPreview) {
      appObj.state.resultPreview = {
        generation: 0,
        sequence: 0,
        rootSequence: 0,
        rootToken: 0,
        payload: null,
        root: null,
        rootRender: null,
        lp: null,
        wm: null,
        added: false,
        visible: false,
        entering: false,
        exiting: false,
        clickLocked: false,
        dismissRunnable: null,
        visibilityFallbackRunnable: null,
        handler: null,
        drawCount: 0,
        firstDrawLogged: false,
        visibleStartedAt: 0,
        dismissScheduledAt: 0,
        renderRebuildCount: 0,
        line1: "",
        line2: "",
        measuredWidth: 0,
        measuredHeight: 0,
        downX: 0,
        downY: 0,
        downRawX: 0,
        downRawY: 0,
        downAt: 0,
        touchMoved: false,
        lastReason: ""
      };
    }
    var st = appObj.state.resultPreview;
    if (!st.handler) st.handler = mainHandler21();
    if (st.rootSequence === undefined) st.rootSequence = 0;
    if (st.rootToken === undefined) st.rootToken = 0;
    if (st.renderRebuildCount === undefined) st.renderRebuildCount = 0;
    return st;
  }

  function colorSpec21(a, r, g, b, hex) {
    return {
      a: int21(a, 0) & 255,
      r: int21(r, 0) & 255,
      g: int21(g, 0) & 255,
      b: int21(b, 0) & 255,
      hex: String(hex || "")
    };
  }

  function colors21(appObj) {
    var dark = false;
    var themeSource = "toolhub_unavailable";
    try {
      if (appObj && typeof appObj.isDarkTheme === "function") {
        dark = appObj.isDarkTheme() === true;
        themeSource = "toolhub";
      }
    } catch (eTheme) {
      dark = false;
      themeSource = "toolhub_error";
    }
    return {
      bg: dark ? colorSpec21(255, 27, 27, 31, "#FF1B1B1F") : colorSpec21(255, 255, 255, 255, "#FFFFFFFF"),
      stroke: dark ? colorSpec21(61, 255, 255, 255, "#3DFFFFFF") : colorSpec21(34, 0, 0, 0, "#22000000"),
      text: dark ? colorSpec21(255, 248, 250, 252, "#FFF8FAFC") : colorSpec21(255, 17, 24, 39, "#FF111827"),
      secondary: dark ? colorSpec21(255, 203, 213, 225, "#FFCBD5E1") : colorSpec21(255, 71, 85, 105, "#FF475569"),
      pressed: dark ? colorSpec21(38, 56, 189, 248, "#2638BDF8") : colorSpec21(26, 14, 165, 233, "#1A0EA5E9"),
      themeDark: dark,
      themeSource: themeSource
    };
  }

  function packArgb21(color) {
    if (!color) return 0;
    return (((Number(color.a || 0) & 255) << 24) |
      ((Number(color.r || 0) & 255) << 16) |
      ((Number(color.g || 0) & 255) << 8) |
      (Number(color.b || 0) & 255)) | 0;
  }

  function argbHex21(value) {
    var n = Number(value);
    if (isNaN(n)) n = 0;
    var hex = (n >>> 0).toString(16).toUpperCase();
    while (hex.length < 8) hex = "0" + hex;
    return "0x" + hex;
  }

  // 明确使用 ARGB 通道，随后读取 Paint 实际颜色校验，避免 Rhino 重载或 OEM 颜色转换静默失效。
  function setPaintColor21(paint, color) {
    var expected = packArgb21(color);
    var result = {
      ok: false,
      expected: expected,
      actual: 0,
      expectedHex: argbHex21(expected),
      actualHex: "",
      error: ""
    };
    if (!paint || !color) {
      result.error = "paint_or_color_missing";
      return result;
    }
    try {
      paint.setARGB(color.a, color.r, color.g, color.b);
    } catch (eArgb) {
      result.error = "setARGB:" + String(eArgb);
      return result;
    }
    try {
      result.actual = Number(paint.getColor()) | 0;
      result.actualHex = argbHex21(result.actual);
      result.ok = (result.actual | 0) === (expected | 0);
      if (!result.ok) result.error = "paint_color_mismatch";
    } catch (eRead) {
      result.error = "getColor:" + String(eRead);
    }
    return result;
  }

  function topInset21(root) {
    var top = 0;
    try {
      if (root && root.getRootWindowInsets) {
        var insets = root.getRootWindowInsets();
        if (insets) {
          if (android.os.Build.VERSION.SDK_INT >= 30) {
            var types = android.view.WindowInsets.Type.statusBars() | android.view.WindowInsets.Type.displayCutout();
            var v = insets.getInsets(types);
            if (v) top = Math.max(top, int21(v.top, 0));
          } else {
            top = Math.max(top, int21(insets.getSystemWindowInsetTop(), 0));
          }
          try {
            var cutout = insets.getDisplayCutout();
            if (cutout) top = Math.max(top, int21(cutout.getSafeInsetTop(), 0));
          } catch (eCutout) {}
        }
      }
    } catch (eRootInsets) {}

    try {
      if (android.os.Build.VERSION.SDK_INT >= 30) {
        var wm = context.getSystemService(android.content.Context.WINDOW_SERVICE);
        var metrics = wm.getCurrentWindowMetrics();
        var wi = metrics.getWindowInsets();
        var mv = wi.getInsets(android.view.WindowInsets.Type.statusBars() | android.view.WindowInsets.Type.displayCutout());
        if (mv) top = Math.max(top, int21(mv.top, 0));
      }
    } catch (eMetrics) {}

    if (top <= 0) {
      try {
        var id = context.getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (id > 0) top = context.getResources().getDimensionPixelSize(id);
      } catch (eResource) {}
    }
    return Math.max(0, top);
  }

  function screenWidth21(appObj) {
    try {
      if (appObj && appObj.state && appObj.state.screen && Number(appObj.state.screen.w || 0) > 0) {
        return Number(appObj.state.screen.w);
      }
    } catch (e0) {}
    try { return context.getResources().getDisplayMetrics().widthPixels; } catch (e1) {}
    return dp21(appObj, 360);
  }

  function fitLine21(paint, text, maxWidth, appendEllipsis) {
    var value = String(text || "");
    if (!value) return { line: "", used: 0, remaining: "" };
    var count = value.length;
    try {
      var measuredWidth = java.lang.reflect.Array.newInstance(java.lang.Float.TYPE, 1);
      count = paint.breakText(new java.lang.String(value), true, Math.max(1, maxWidth), measuredWidth);
    } catch (e0) { count = value.length; }
    if (count >= value.length) return { line: value, used: value.length, remaining: "" };
    if (count < 1) count = 1;
    var line = value.substring(0, count);
    var remaining = value.substring(count).replace(/^\s+/, "");
    if (appendEllipsis) {
      var ellipsis = "…";
      while (line.length > 0) {
        var candidate = line.replace(/\s+$/, "") + ellipsis;
        try {
          if (paint.measureText(candidate) <= maxWidth) {
            line = candidate;
            break;
          }
        } catch (e1) {
          line = candidate;
          break;
        }
        line = line.substring(0, line.length - 1);
      }
      if (!line) line = ellipsis;
    }
    return { line: line, used: count, remaining: remaining };
  }

  function prepareLines21(appObj, st) {
    var text = cleanPreviewText21(st.payload && st.payload.previewText ? st.payload.previewText : (st.payload && st.payload.text));
    var paint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
    paint.setTextSize(sp21(14));
    var sw = Math.max(dp21(appObj, 200), screenWidth21(appObj));
    var maxViewWidth = Math.round(sw * 0.88);
    var minViewWidth = dp21(appObj, 160);
    var horizontalPadding = dp21(appObj, 14) * 2;
    var maxTextWidth = Math.max(dp21(appObj, 100), maxViewWidth - horizontalPadding);
    var first = fitLine21(paint, text, maxTextWidth, false);
    var second = fitLine21(paint, first.remaining, maxTextWidth, first.remaining.length > 0);
    if (second.remaining) second = fitLine21(paint, first.remaining, maxTextWidth, true);
    st.line1 = first.line || "";
    st.line2 = second.line || "";

    var w1 = 0;
    var w2 = 0;
    try { w1 = paint.measureText(st.line1); } catch (e1) {}
    try { w2 = paint.measureText(st.line2); } catch (e2) {}
    var natural = Math.ceil(Math.max(w1, w2)) + horizontalPadding;
    st.measuredWidth = int21(clamp21(natural, minViewWidth, maxViewWidth), maxViewWidth);
    st.measuredHeight = st.line2 ? dp21(appObj, 62) : dp21(appObj, 48);
  }

  function syncRender21(render, st) {
    if (!render || !st) return;
    render.generation = Number(st.generation || 0);
    render.payloadId = String(st.payload && st.payload.id ? st.payload.id : "");
    render.line1 = String(st.line1 || "");
    render.line2 = String(st.line2 || "");
    render.drawCount = 0;
    render.firstDrawAt = 0;
    render.firstDrawLogged = false;
    render.visibleStartedAt = 0;
    render.pressed = false;
    render.themeDark = false;
    render.themeSource = "";
    render.bgApplyOk = false;
    render.strokeApplyOk = false;
    render.textApplyOk = false;
    render.bgExpectedHex = "";
    render.bgActualHex = "";
    render.textExpectedHex = "";
    render.textActualHex = "";
    render.canvasHardware = false;
    render.windowFormat = 0;
    render.forceDarkDisabled = false;
    render.disposed = false;
    render.attachedAt = now21();
    st.drawCount = 0;
    st.firstDrawLogged = false;
    st.visibleStartedAt = 0;
    st.dismissScheduledAt = 0;
  }

  function isCurrentRoot21(st, rootRef, render) {
    if (!st || !rootRef || !render) return false;
    if (render.disposed === true) return false;
    if (st.root !== rootRef || st.rootRender !== render) return false;
    if (Number(st.rootToken || 0) !== Number(render.rootToken || 0)) return false;
    if (Number(st.generation || 0) !== Number(render.generation || 0)) return false;
    return true;
  }

  function drawPreview21(appObj, st, canvas, view, render) {
    var c = colors21(appObj);
    if (render) {
      render.themeDark = c.themeDark === true;
      render.themeSource = String(c.themeSource || "");
      try { render.canvasHardware = canvas && canvas.isHardwareAccelerated ? canvas.isHardwareAccelerated() === true : false; } catch (eHardware) { render.canvasHardware = false; }
      try { render.windowFormat = st && st.lp ? Number(st.lp.format || 0) : 0; } catch (eFormat) { render.windowFormat = 0; }
    }
    var width = view.getWidth();
    var height = view.getHeight();
    if (width <= 0 || height <= 0) return false;

    var bg = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
    var rect = new android.graphics.RectF(dp21(appObj, 1), dp21(appObj, 1), width - dp21(appObj, 1), height - dp21(appObj, 1));
    bg.setStyle(android.graphics.Paint.Style.FILL);
    var bgApply = setPaintColor21(bg, c.bg);
    if (render) {
      render.bgApplyOk = bgApply.ok === true;
      render.bgExpectedHex = String(bgApply.expectedHex || "");
      render.bgActualHex = String(bgApply.actualHex || "");
    }
    if (!bgApply.ok) {
      try { safeLog(appObj.L, 'e', "result preview background color apply fail expected=" + String(bgApply.expectedHex || "") + " actual=" + String(bgApply.actualHex || "") + " err=" + String(bgApply.error || "")); } catch (eBgLog) {}
      return false;
    }
    canvas.drawRoundRect(rect, dp21(appObj, 12), dp21(appObj, 12), bg);

    bg.setStyle(android.graphics.Paint.Style.STROKE);
    bg.setStrokeWidth(dp21(appObj, 1));
    var strokeApply = setPaintColor21(bg, c.stroke);
    if (render) render.strokeApplyOk = strokeApply.ok === true;
    if (!strokeApply.ok) {
      try { safeLog(appObj.L, 'e', "result preview stroke color apply fail expected=" + String(strokeApply.expectedHex || "") + " actual=" + String(strokeApply.actualHex || "") + " err=" + String(strokeApply.error || "")); } catch (eStrokeLog) {}
      return false;
    }
    canvas.drawRoundRect(rect, dp21(appObj, 12), dp21(appObj, 12), bg);

    var textPaint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
    var textApply = setPaintColor21(textPaint, c.text);
    if (render) {
      render.textApplyOk = textApply.ok === true;
      render.textExpectedHex = String(textApply.expectedHex || "");
      render.textActualHex = String(textApply.actualHex || "");
    }
    if (!textApply.ok) {
      try { safeLog(appObj.L, 'e', "result preview text color apply fail expected=" + String(textApply.expectedHex || "") + " actual=" + String(textApply.actualHex || "") + " err=" + String(textApply.error || "")); } catch (eTextLog) {}
      return false;
    }
    textPaint.setTextSize(sp21(14));
    var x = dp21(appObj, 14);
    var line1 = String(render && render.line1 !== undefined ? render.line1 : st.line1 || "");
    var line2 = String(render && render.line2 !== undefined ? render.line2 : st.line2 || "");
    if (line2) {
      canvas.drawText(new java.lang.String(line1), x, dp21(appObj, 25), textPaint);
      var secondaryApply = setPaintColor21(textPaint, c.secondary);
      if (!secondaryApply.ok) {
        if (render) render.textApplyOk = false;
        try { safeLog(appObj.L, 'e', "result preview secondary color apply fail expected=" + String(secondaryApply.expectedHex || "") + " actual=" + String(secondaryApply.actualHex || "") + " err=" + String(secondaryApply.error || "")); } catch (eSecondaryLog) {}
        return false;
      }
      canvas.drawText(new java.lang.String(line2), x, dp21(appObj, 47), textPaint);
    } else {
      canvas.drawText(new java.lang.String(line1), x, dp21(appObj, 30), textPaint);
    }
    return true;
  }

  function cancelDismiss21(st) {
    if (!st) return;
    try {
      if (st.handler && st.dismissRunnable) st.handler.removeCallbacks(st.dismissRunnable);
    } catch (e0) {}
    st.dismissRunnable = null;
    st.dismissScheduledAt = 0;
  }

  function cancelVisibilityFallback21(st) {
    if (!st) return;
    try {
      if (st.handler && st.visibilityFallbackRunnable) st.handler.removeCallbacks(st.visibilityFallbackRunnable);
    } catch (e0) {}
    st.visibilityFallbackRunnable = null;
  }

  function timeoutMs21(appObj) {
    var seconds = 3;
    try { seconds = Number(appObj && appObj.config ? appObj.config.POINTER_RESULT_PREVIEW_TIMEOUT_SEC : 3); } catch (e0) { seconds = 3; }
    if (isNaN(seconds)) seconds = 3;
    seconds = clamp21(seconds, 1, 10);
    return Math.round(seconds * 1000);
  }

  function scheduleDismiss21(appObj, st, rootRef, render) {
    cancelDismiss21(st);
    if (!isCurrentRoot21(st, rootRef, render)) return false;
    if (Number(render.firstDrawAt || 0) <= 0) return false;
    var token = Number(st.generation || 0);
    var rootToken = Number(render.rootToken || 0);
    var timeoutMs = timeoutMs21(appObj);
    st.dismissScheduledAt = now21();
    st.dismissRunnable = new java.lang.Runnable({ run: function() {
      try {
        if (Number(st.generation || 0) !== token) return;
        if (!isCurrentRoot21(st, rootRef, render)) return;
        var visibleMs = Math.max(0, now21() - Number(render.firstDrawAt || now21()));
        try {
          safeLog(appObj.L, 'i',
            "result preview timeout" +
            " id=" + String(render.payloadId || "") +
            " generation=" + String(token) +
            " rootToken=" + String(rootToken) +
            " visibleMs=" + String(visibleMs) +
            " timeoutMs=" + String(timeoutMs));
        } catch (eLog) {}
        appObj.dismissResultPreview("timeout", true);
      } catch (e0) {}
    }});
    try {
      var posted = st.handler.postDelayed(st.dismissRunnable, timeoutMs) === true;
      if (posted) {
        try {
          safeLog(appObj.L, 'i',
            "result preview dismiss scheduled" +
            " id=" + String(render.payloadId || "") +
            " generation=" + String(token) +
            " rootToken=" + String(rootToken) +
            " timeoutMs=" + String(timeoutMs));
        } catch (eLogSchedule) {}
      }
      return posted;
    } catch (ePost) {
      st.dismissRunnable = null;
      st.dismissScheduledAt = 0;
    }
    return false;
  }

  function startEnterAnimation21(appObj, st, rootRef, render) {
    if (!isCurrentRoot21(st, rootRef, render)) return false;
    if (render.enterStarted === true) return true;
    render.enterStarted = true;
    try {
      rootRef.animate().cancel();
      rootRef.setVisibility(android.view.View.VISIBLE);
      rootRef.setAlpha(1);
      rootRef.setScaleX(0.985);
      rootRef.setScaleY(0.985);
      rootRef.setTranslationY(-dp21(appObj, 6));
      rootRef.animate()
        .scaleX(1)
        .scaleY(1)
        .translationY(0)
        .setDuration(140)
        .setInterpolator(new android.view.animation.DecelerateInterpolator())
        .start();
      return true;
    } catch (eEnter) {
      try {
        rootRef.setVisibility(android.view.View.VISIBLE);
        rootRef.setAlpha(1);
        rootRef.setScaleX(1);
        rootRef.setScaleY(1);
        rootRef.setTranslationY(0);
      } catch (eFallback) {}
    }
    return false;
  }

  function markFirstDraw21(appObj, st, rootRef, render) {
    if (!isCurrentRoot21(st, rootRef, render)) {
      try {
        safeLog(appObj.L, 'd',
          "result preview stale draw ignored" +
          " id=" + String(render && render.payloadId || "") +
          " generation=" + String(render && render.generation || 0) +
          " rootToken=" + String(render && render.rootToken || 0));
      } catch (eStaleLog) {}
      return false;
    }
    st.drawCount = Number(render.drawCount || 0);
    if (Number(render.firstDrawAt || 0) > 0) return true;

    render.firstDrawAt = now21();
    render.visibleStartedAt = render.firstDrawAt;
    render.firstDrawLogged = true;
    st.firstDrawLogged = true;
    st.visible = true;
    st.visibleStartedAt = render.firstDrawAt;
    cancelVisibilityFallback21(st);

    var attached = false;
    try {
      attached = rootRef.isAttachedToWindow ? rootRef.isAttachedToWindow() === true : rootRef.getWindowToken() !== null;
    } catch (eAttached) {}
    try {
      safeLog(appObj.L, 'i',
        "result preview first draw" +
        " id=" + String(render.payloadId || "") +
        " generation=" + String(render.generation || 0) +
        " rootToken=" + String(render.rootToken || 0) +
        " attached=" + String(attached) +
        " attachCostMs=" + String(Math.max(0, render.firstDrawAt - Number(render.attachedAt || render.firstDrawAt))) +
        " width=" + String(rootRef.getWidth()) +
        " height=" + String(rootRef.getHeight()) +
        " alpha=" + String(rootRef.getAlpha()) +
        " visibility=" + String(rootRef.getVisibility()) +
        " lpY=" + String(st.lp ? st.lp.y : -1) +
        " drawCount=" + String(render.drawCount) +
        " theme=" + String(render.themeDark === true ? "dark" : "light") +
        " themeSource=" + String(render.themeSource || "") +
        " bgApply=" + String(render.bgApplyOk === true) +
        " bgExpected=" + String(render.bgExpectedHex || "") +
        " bgActual=" + String(render.bgActualHex || "") +
        " strokeApply=" + String(render.strokeApplyOk === true) +
        " textApply=" + String(render.textApplyOk === true) +
        " textExpected=" + String(render.textExpectedHex || "") +
        " textActual=" + String(render.textActualHex || "") +
        " canvasHardware=" + String(render.canvasHardware === true) +
        " windowFormat=" + String(render.windowFormat || 0) +
        " forceDarkDisabled=" + String(render.forceDarkDisabled === true));
    } catch (eFirstDrawLog) {}

    scheduleDismiss21(appObj, st, rootRef, render);
    try {
      st.handler.post(new java.lang.Runnable({ run: function() {
        try { startEnterAnimation21(appObj, st, rootRef, render); } catch (eEnter) {}
      }}));
    } catch (ePostEnter) {
      startEnterAnimation21(appObj, st, rootRef, render);
    }
    return true;
  }

  function createView21(appObj, st) {
    var self = appObj;
    var render = {
      rootToken: Number(st.rootToken || 0),
      generation: Number(st.generation || 0),
      payloadId: String(st.payload && st.payload.id ? st.payload.id : ""),
      line1: String(st.line1 || ""),
      line2: String(st.line2 || ""),
      drawCount: 0,
      firstDrawAt: 0,
      firstDrawLogged: false,
      visibleStartedAt: 0,
      attachedAt: now21(),
      pressed: false,
      themeDark: false,
      themeSource: "",
      bgApplyOk: false,
      strokeApplyOk: false,
      textApplyOk: false,
      bgExpectedHex: "",
      bgActualHex: "",
      textExpectedHex: "",
      textActualHex: "",
      canvasHardware: false,
      windowFormat: 0,
      forceDarkDisabled: false,
      disposed: false,
      enterStarted: false
    };
    var PreviewView = new JavaAdapter(android.view.View, {
      onDraw: function(canvas) {
        var current = isCurrentRoot21(st, this, render);
        if (current) render.drawCount = Number(render.drawCount || 0) + 1;
        var drawn = false;
        try { drawn = drawPreview21(self, st, canvas, this, render) === true; } catch (eDraw) {
          try { safeLog(self.L, 'e', "result preview draw fail: " + String(eDraw)); } catch (eDrawLog) {}
        }
        if (current && drawn) markFirstDraw21(self, st, this, render);
      },
      onTouchEvent: function(event) {
        if (!isCurrentRoot21(st, this, render)) return false;
        try {
          var action = event.getActionMasked ? event.getActionMasked() : event.getAction();
          if (action === android.view.MotionEvent.ACTION_DOWN) {
            st.downX = event.getX();
            st.downY = event.getY();
            st.downRawX = event.getRawX();
            st.downRawY = event.getRawY();
            st.downAt = now21();
            st.touchMoved = false;
            render.pressed = true;
            try { this.invalidate(); } catch (eInvalidateDown) {}
            try { this.animate().cancel(); } catch (eCancel) {}
            try { this.animate().scaleX(0.97).scaleY(0.97).setDuration(70).start(); } catch (eScale) {}
            return true;
          }
          if (action === android.view.MotionEvent.ACTION_MOVE) {
            var dx = event.getRawX() - st.downRawX;
            var dy = event.getRawY() - st.downRawY;
            var slop = dp21(self, 8);
            if (dx * dx + dy * dy > slop * slop) st.touchMoved = true;
            return true;
          }
          if (action === android.view.MotionEvent.ACTION_UP) {
            render.pressed = false;
            try { this.invalidate(); } catch (eInvalidateUp) {}
            try { this.animate().scaleX(1).scaleY(1).setDuration(80).start(); } catch (eUpScale) {}
            if (!st.touchMoved && st.clickLocked !== true) self.openResultPreviewPrimaryAction();
            return true;
          }
          if (action === android.view.MotionEvent.ACTION_CANCEL) {
            render.pressed = false;
            try { this.invalidate(); } catch (eInvalidateCancel) {}
            try { this.animate().scaleX(1).scaleY(1).setDuration(80).start(); } catch (eCancelScale) {}
            st.touchMoved = false;
            return true;
          }
        } catch (eTouch) {}
        return true;
      }
    }, context);
    PreviewView.setClickable(true);
    PreviewView.setFocusable(false);
    try { PreviewView.setWillNotDraw(false); } catch (eWillNotDraw) {}
    try { PreviewView.setVisibility(android.view.View.VISIBLE); } catch (eVisible) {}
    try {
      if (android.os.Build.VERSION.SDK_INT >= 29) {
        PreviewView.setForceDarkAllowed(false);
        render.forceDarkDisabled = true;
      }
    } catch (eForceDark) { render.forceDarkDisabled = false; }
    // 不创建软件离屏图层；保持 Canvas 全自绘，但让 WindowManager 正常驱动首帧 traversal。
    try { PreviewView.setLayerType(android.view.View.LAYER_TYPE_NONE, null); } catch (eLayer) {}
    return { view: PreviewView, render: render };
  }

  function createLp21(appObj, st) {
    var flags = android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
      android.view.WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
      android.view.WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN;
    var lp = new android.view.WindowManager.LayoutParams(
      Math.max(1, int21(st.measuredWidth, dp21(appObj, 260))),
      Math.max(1, int21(st.measuredHeight, dp21(appObj, 62))),
      android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      flags,
      android.graphics.PixelFormat.RGBA_8888
    );
    lp.gravity = android.view.Gravity.TOP | android.view.Gravity.CENTER_HORIZONTAL;
    lp.x = 0;
    lp.y = topInset21(st.root) + dp21(appObj, 8);
    try { lp.setTitle("ToolHub result preview"); } catch (eTitle) {}
    return lp;
  }

  function detachRoot21(appObj, st, rootRef, render) {
    if (render) render.disposed = true;
    try {
      if (rootRef && st.wm) st.wm.removeView(rootRef);
    } catch (eRemove) {
      try {
        if (typeof appObj.safeRemoveView === "function" && rootRef) appObj.safeRemoveView(rootRef, "resultPreview");
      } catch (eSafe) {}
    }
    if (st.root === rootRef) {
      st.root = null;
      st.rootRender = null;
      st.added = false;
      st.visible = false;
      st.entering = false;
      st.exiting = false;
    }
    return true;
  }

  function removeView21(appObj, st) {
    if (!st) return false;
    cancelDismiss21(st);
    cancelVisibilityFallback21(st);
    var rootRef = st.root;
    var render = st.rootRender;
    detachRoot21(appObj, st, rootRef, render);
    st.lp = null;
    st.clickLocked = false;
    st.drawCount = 0;
    st.firstDrawLogged = false;
    st.visibleStartedAt = 0;
    st.dismissScheduledAt = 0;
    return true;
  }

  function forceRootTraversal21(appObj, st, rootRef, render, attempt) {
    if (!isCurrentRoot21(st, rootRef, render)) return false;
    try { rootRef.animate().cancel(); } catch (eCancel) {}
    try { rootRef.setVisibility(android.view.View.VISIBLE); } catch (eVisible) {}
    try { rootRef.setAlpha(1); } catch (eAlpha) {}
    try { rootRef.setScaleX(0.985); } catch (eScaleX) {}
    try { rootRef.setScaleY(0.985); } catch (eScaleY) {}
    try { rootRef.setTranslationY(-dp21(appObj, 6)); } catch (eTranslation) {}
    try { rootRef.setLayerType(android.view.View.LAYER_TYPE_NONE, null); } catch (eLayer) {}
    try { rootRef.requestLayout(); } catch (eLayout) {}
    try { rootRef.invalidate(); } catch (eInvalidate) {}
    try {
      if (rootRef.postInvalidateOnAnimation) rootRef.postInvalidateOnAnimation();
    } catch (ePostInvalidate) {}
    try {
      if (st.wm && st.lp) st.wm.updateViewLayout(rootRef, st.lp);
    } catch (eUpdate) {}
    try {
      safeLog(appObj.L, 'w',
        "result preview draw stalled" +
        " id=" + String(render.payloadId || "") +
        " generation=" + String(render.generation || 0) +
        " rootToken=" + String(render.rootToken || 0) +
        " attempt=" + String(attempt) +
        " drawCount=" + String(render.drawCount || 0));
    } catch (eLog) {}
    return true;
  }

  function attachNewRoot21(appObj, st) {
    st.rootSequence = Number(st.rootSequence || 0) + 1;
    st.rootToken = Number(st.rootSequence || 0);
    var built = createView21(appObj, st);
    st.root = built.view;
    st.rootRender = built.render;
    syncRender21(st.rootRender, st);
    st.rootRender.rootToken = Number(st.rootToken || 0);
    st.rootRender.enterStarted = false;
    if (!st.lp) st.lp = createLp21(appObj, st);
    st.lp.width = st.measuredWidth;
    st.lp.height = st.measuredHeight;
    st.lp.y = topInset21(st.root) + dp21(appObj, 8);

    st.root.setVisibility(android.view.View.VISIBLE);
    st.root.setAlpha(1);
    st.root.setScaleX(0.985);
    st.root.setScaleY(0.985);
    st.root.setTranslationY(-dp21(appObj, 6));
    st.wm.addView(st.root, st.lp);
    st.added = true;
    st.visible = false;
    st.entering = true;
    st.rootRender.attachedAt = now21();
    try { st.root.requestLayout(); } catch (eLayout) {}
    try { st.root.invalidate(); } catch (eInvalidate) {}
    try { if (st.root.postInvalidateOnAnimation) st.root.postInvalidateOnAnimation(); } catch (ePostInvalidate) {}
    scheduleVisibilityFallback21(appObj, st, st.root, st.rootRender, 1);
    st.entering = false;
    return true;
  }

  function rebuildRoot21(appObj, st, rootRef, render) {
    if (!isCurrentRoot21(st, rootRef, render)) return false;
    cancelVisibilityFallback21(st);
    st.renderRebuildCount = Number(st.renderRebuildCount || 0) + 1;
    try {
      safeLog(appObj.L, 'w',
        "result preview root rebuild" +
        " id=" + String(render.payloadId || "") +
        " generation=" + String(render.generation || 0) +
        " oldRootToken=" + String(render.rootToken || 0) +
        " rebuild=" + String(st.renderRebuildCount));
    } catch (eLog) {}
    detachRoot21(appObj, st, rootRef, render);
    return attachNewRoot21(appObj, st);
  }

  function failRender21(appObj, st, rootRef, render) {
    if (!isCurrentRoot21(st, rootRef, render)) return false;
    try {
      safeLog(appObj.L, 'e',
        "result preview render failed" +
        " id=" + String(render.payloadId || "") +
        " generation=" + String(render.generation || 0) +
        " rootToken=" + String(render.rootToken || 0) +
        " rebuilds=" + String(st.renderRebuildCount || 0));
    } catch (eLog) {}
    cancelVisibilityFallback21(st);
    detachRoot21(appObj, st, rootRef, render);
    st.lp = null;
    return false;
  }

  function scheduleVisibilityFallback21(appObj, st, rootRef, render, attempt) {
    if (!st || !rootRef || !render) return false;
    cancelVisibilityFallback21(st);
    var token = Number(st.generation || 0);
    var rootToken = Number(render.rootToken || 0);
    var attemptNo = Math.max(1, Number(attempt || 1));
    var delayMs = attemptNo === 1 ? 260 : 360;
    st.visibilityFallbackRunnable = new java.lang.Runnable({ run: function() {
      try {
        st.visibilityFallbackRunnable = null;
        if (Number(st.generation || 0) !== token) return;
        if (!isCurrentRoot21(st, rootRef, render)) return;
        if (Number(render.firstDrawAt || 0) > 0) return;

        var attached = false;
        try {
          attached = rootRef.isAttachedToWindow ? rootRef.isAttachedToWindow() === true : rootRef.getWindowToken() !== null;
        } catch (eAttached) {}
        try {
          safeLog(appObj.L, 'i',
            "result preview visual check" +
            " attached=" + String(attached) +
            " visibility=" + String(rootRef.getVisibility()) +
            " alpha=" + String(rootRef.getAlpha()) +
            " width=" + String(rootRef.getWidth()) +
            " height=" + String(rootRef.getHeight()) +
            " lpY=" + String(st.lp ? st.lp.y : -1) +
            " drawCount=" + String(render.drawCount || 0) +
            " generation=" + String(token) +
            " rootToken=" + String(rootToken) +
            " attempt=" + String(attemptNo));
        } catch (eVisualLog) {}

        forceRootTraversal21(appObj, st, rootRef, render, attemptNo);
        if (attemptNo === 1) {
          scheduleVisibilityFallback21(appObj, st, rootRef, render, 2);
          return;
        }
        if (Number(st.renderRebuildCount || 0) < 1) {
          rebuildRoot21(appObj, st, rootRef, render);
          return;
        }
        failRender21(appObj, st, rootRef, render);
      } catch (eFallback) {
        try { safeLog(appObj.L, 'e', "result preview visibility fallback fail: " + String(eFallback)); } catch (eFallbackLog) {}
      }
    }});
    try {
      return st.handler.postDelayed(st.visibilityFallbackRunnable, delayMs) === true;
    } catch (ePost) {
      st.visibilityFallbackRunnable = null;
    }
    return false;
  }

  function showState21(appObj, st) {
    if (!st || !st.payload || !st.payload.text) return false;
    prepareLines21(appObj, st);
    cancelDismiss21(st);
    cancelVisibilityFallback21(st);
    try { st.wm = st.wm || (appObj.state && appObj.state.wm) || context.getSystemService(android.content.Context.WINDOW_SERVICE); } catch (eWm) {}
    if (!st.wm) return false;

    if (!st.root || !st.added || !st.rootRender) {
      st.renderRebuildCount = 0;
      return attachNewRoot21(appObj, st);
    }

    var rootRef = st.root;
    var render = st.rootRender;
    syncRender21(render, st);
    render.rootToken = Number(st.rootToken || 0);
    render.enterStarted = true;
    st.renderRebuildCount = 0;
    st.lp.width = st.measuredWidth;
    st.lp.height = st.measuredHeight;
    st.lp.y = topInset21(rootRef) + dp21(appObj, 8);

    try {
      rootRef.animate().cancel();
      rootRef.setVisibility(android.view.View.VISIBLE);
      rootRef.setAlpha(1);
      rootRef.setScaleX(1);
      rootRef.setScaleY(1);
      rootRef.setTranslationY(0);
      st.wm.updateViewLayout(rootRef, st.lp);
      rootRef.requestLayout();
      rootRef.invalidate();
      if (rootRef.postInvalidateOnAnimation) rootRef.postInvalidateOnAnimation();
      rootRef.setScaleX(0.985);
      rootRef.setScaleY(0.985);
      rootRef.animate()
        .scaleX(1)
        .scaleY(1)
        .setDuration(120)
        .setInterpolator(new android.view.animation.DecelerateInterpolator())
        .start();
    } catch (eUpdate) {
      try { rootRef.requestLayout(); rootRef.invalidate(); } catch (eInvalidate) {}
    }
    scheduleVisibilityFallback21(appObj, st, rootRef, render, 1);
    st.visible = false;
    return true;
  }

  function normalizePayload21(appObj, input) {
    var src = input || {};
    var text = "";
    try { text = String(src.text === null || src.text === undefined ? "" : src.text); } catch (eText) { text = ""; }
    if (!text) return null;
    var st = ensureState21(appObj);
    if (!st) return null;
    st.sequence = Number(st.sequence || 0) + 1;
    var id = String(src.id || ("result_" + String(now21()) + "_" + String(st.sequence)));
    return {
      id: id,
      kind: String(src.kind || "text"),
      source: String(src.source || "pointer_text"),
      text: text,
      previewText: cleanPreviewText21(src.previewText || text),
      screenshotPath: String(src.screenshotPath || ""),
      rect: cloneRect21(src.rect),
      primaryAction: String(src.primaryAction || "pickword"),
      actions: src.actions && src.actions.length !== undefined ? src.actions : [],
      createdAt: Number(src.createdAt || now21())
    };
  }

  function install21() {
    try {
      if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return false;
      var proto = FloatBallAppWM.prototype;
      if (proto.__toolHubResultPreviewInstalled === true) return true;

      proto.publishResultPreview = function(payload) {
        var normalized = normalizePayload21(this, payload);
        if (!normalized) return { ok: false, code: "EMPTY_PREVIEW_TEXT", previewId: "" };
        var st = ensureState21(this);
        st.generation = Number(st.generation || 0) + 1;
        st.payload = normalized;
        st.clickLocked = false;
        st.renderRebuildCount = 0;
        cancelDismiss21(st);
        cancelVisibilityFallback21(st);
        var self = this;
        runOnMain21(function() {
          try {
            if (!self.state || self.state.closed === true || self.state.closing === true) return;
            var current = ensureState21(self);
            if (!current || !current.payload || String(current.payload.id) !== String(normalized.id)) return;
            var shown = showState21(self, current);
            try {
              safeLog(self.L, shown ? 'i' : 'w',
                "result preview publish id=" + normalized.id +
                " source=" + normalized.source +
                " textLen=" + String(normalized.text.length) +
                " generation=" + String(current.generation || 0) +
                " shown=" + String(shown === true));
            } catch (eLog) {}
          } catch (eShow) {
            try { safeLog(self.L, 'e', "result preview show fail: " + String(eShow)); } catch (eLogShow) {}
          }
        });
        return { ok: true, code: "RESULT_PREVIEW_QUEUED", previewId: normalized.id };
      };

      proto.dismissResultPreview = function(reason, animate) {
        var self = this;
        var st = ensureState21(this);
        if (!st) return false;
        var visibleMs = Math.max(0, now21() - Number(st.visibleStartedAt || now21()));
        st.generation = Number(st.generation || 0) + 1;
        cancelDismiss21(st);
        cancelVisibilityFallback21(st);
        st.lastReason = String(reason || "");
        try {
          safeLog(this.L, 'i',
            "result preview dismiss" +
            " reason=" + String(reason || "") +
            " visibleMs=" + String(visibleMs) +
            " rootToken=" + String(st.rootToken || 0));
        } catch (eDismissLog) {}
        runOnMain21(function() {
          var current = ensureState21(self);
          if (!current || !current.root || !current.added) {
            if (current) removeView21(self, current);
            return;
          }
          var rootRef = current.root;
          var render = current.rootRender;
          var generation = Number(current.generation || 0);
          var rootToken = Number(current.rootToken || 0);
          if (render) render.disposed = true;
          if (animate !== false) {
            current.exiting = true;
            try {
              rootRef.animate().cancel();
              rootRef.setAlpha(1);
              rootRef.setScaleX(1);
              rootRef.setScaleY(1);
              rootRef.setTranslationY(0);
              rootRef.animate()
                .scaleX(0.985)
                .scaleY(0.985)
                .translationY(-dp21(self, 6))
                .setDuration(120)
                .setInterpolator(new android.view.animation.AccelerateInterpolator())
                .withEndAction(new java.lang.Runnable({ run: function() {
                  try {
                    if (Number(current.generation || 0) !== generation) return;
                    if (current.root !== rootRef || Number(current.rootToken || 0) !== rootToken) return;
                    removeView21(self, current);
                  } catch (eEnd) {}
                }}))
                .start();
              return;
            } catch (eAnim) {}
          }
          if (current.root === rootRef && Number(current.rootToken || 0) === rootToken) removeView21(self, current);
        });
        return true;
      };

      proto.openResultPreviewPrimaryAction = function() {
        var st = ensureState21(this);
        if (!st || !st.payload || st.clickLocked === true) return false;
        st.clickLocked = true;
        cancelDismiss21(st);
        cancelVisibilityFallback21(st);
        st.generation = Number(st.generation || 0) + 1;
        var payload = st.payload;
        var ret = null;
        var removedForHandoff = false;
        try {
          removedForHandoff = removeView21(this, st) === true;
          safeLog(this.L, 'i', "result preview primary handoff removed=" + String(removedForHandoff));
        } catch (eHandoff) {
          try { this.dismissResultPreview("primary_action_handoff", false); } catch (eDismissFallback) {}
        }
        try {
          if (String(payload.primaryAction || "pickword") === "pickword" && typeof this.showPickwordText === "function") {
            ret = this.showPickwordText(payload.text, {
              source: String(payload.source || ""),
              previewId: String(payload.id || ""),
              screenshotPath: String(payload.screenshotPath || ""),
              rect: cloneRect21(payload.rect)
            });
          } else {
            ret = { ok: false, code: "PREVIEW_ACTION_UNAVAILABLE" };
          }
        } catch (eAction) {
          ret = { ok: false, code: "PREVIEW_ACTION_FAILED", message: String(eAction) };
        }
        if (ret && ret.ok === true) return true;
        st.clickLocked = false;
        try { this.publishResultPreview(payload); } catch (eRestore) {}
        try { this.toast("拾字打开失败"); } catch (eToast) {}
        return false;
      };

      proto.disposeResultPreview = function(reason) {
        var self = this;
        var st = ensureState21(this);
        if (!st) return true;
        st.generation = Number(st.generation || 0) + 1;
        st.payload = null;
        st.lastReason = String(reason || "dispose");
        var result = runOnMainSync21(function() { return removeView21(self, st); }, 2000);
        if (!result.ok) {
          try { safeLog(this.L, 'w', "dispose result preview incomplete: " + String(result.error)); } catch (eLog) {}
          return false;
        }
        return true;
      };

      proto.onResultPreviewConfigurationChanged = function() {
        var self = this;
        var st = ensureState21(this);
        if (!st || !st.payload) return false;
        runOnMain21(function() {
          try {
            var current = ensureState21(self);
            if (!current || !current.payload || !current.root || !current.added || !current.rootRender) return;
            current.generation = Number(current.generation || 0) + 1;
            prepareLines21(self, current);
            syncRender21(current.rootRender, current);
            current.rootRender.rootToken = Number(current.rootToken || 0);
            current.rootRender.enterStarted = true;
            current.lp.width = current.measuredWidth;
            current.lp.height = current.measuredHeight;
            current.lp.y = topInset21(current.root) + dp21(self, 8);
            current.wm.updateViewLayout(current.root, current.lp);
            current.root.requestLayout();
            current.root.invalidate();
            if (current.root.postInvalidateOnAnimation) current.root.postInvalidateOnAnimation();
            scheduleVisibilityFallback21(self, current, current.root, current.rootRender, 1);
          } catch (eReflow) {
            try { safeLog(self.L, 'w', "result preview reflow fail: " + String(eReflow)); } catch (eLog) {}
          }
        });
        return true;
      };

      proto.__toolHubResultPreviewInstalled = true;
      return true;
    } catch (eInstall) {
      try { safeLog(null, 'e', "install result preview fail: " + String(eInstall)); } catch (eLogInstall) {}
    }
    return false;
  }

  install21();
})();
