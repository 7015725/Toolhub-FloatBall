// @version 1.0.3
// =======================【取字 / OCR 顶部结果预览】=======================
// 全自绘单实例悬浮预览；点击后把完整文本传给 th_20_pickword.js。
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
        payload: null,
        root: null,
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
    return st;
  }

  function isDark21() {
    try {
      var cfg = context.getResources().getConfiguration();
      var mode = cfg.uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK;
      return mode === android.content.res.Configuration.UI_MODE_NIGHT_YES;
    } catch (e0) {}
    return false;
  }

  function colors21() {
    var dark = isDark21();
    return {
      bg: android.graphics.Color.parseColor(dark ? "#F21B1B1F" : "#F7FFFFFF"),
      stroke: android.graphics.Color.parseColor(dark ? "#3DFFFFFF" : "#22000000"),
      text: android.graphics.Color.parseColor(dark ? "#FFF8FAFC" : "#FF111827"),
      secondary: android.graphics.Color.parseColor(dark ? "#FFCBD5E1" : "#FF475569"),
      pressed: android.graphics.Color.parseColor(dark ? "#2638BDF8" : "#1A0EA5E9")
    };
  }

  // Rhino 在 Android 29+ 可能把 Paint.setColor(int) 错配到 setColor(long ColorLong)。
  // 明确拆分 ARGB 通道并调用无重载歧义的 setARGB(int, int, int, int)。
  function setPaintColor21(paint, color) {
    if (!paint) return false;
    var value = Number(color);
    if (isNaN(value)) value = 0;
    value = value | 0;
    try {
      paint.setARGB(
        (value >>> 24) & 255,
        (value >>> 16) & 255,
        (value >>> 8) & 255,
        value & 255
      );
      return true;
    } catch (eArgb) {}
    return false;
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

  function drawPreview21(appObj, st, canvas, view) {
    var c = colors21();
    var width = view.getWidth();
    var height = view.getHeight();
    if (width <= 0 || height <= 0) return;
    var bg = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
    var rect = new android.graphics.RectF(dp21(appObj, 1), dp21(appObj, 1), width - dp21(appObj, 1), height - dp21(appObj, 1));
    bg.setStyle(android.graphics.Paint.Style.FILL);
    setPaintColor21(bg, c.bg);
    canvas.drawRoundRect(rect, dp21(appObj, 12), dp21(appObj, 12), bg);
    bg.setStyle(android.graphics.Paint.Style.STROKE);
    bg.setStrokeWidth(dp21(appObj, 1));
    setPaintColor21(bg, c.stroke);
    canvas.drawRoundRect(rect, dp21(appObj, 12), dp21(appObj, 12), bg);

    var textPaint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
    setPaintColor21(textPaint, c.text);
    textPaint.setTextSize(sp21(14));
    var x = dp21(appObj, 14);
    if (st.line2) {
      canvas.drawText(new java.lang.String(st.line1), x, dp21(appObj, 25), textPaint);
      setPaintColor21(textPaint, c.secondary);
      canvas.drawText(new java.lang.String(st.line2), x, dp21(appObj, 47), textPaint);
    } else {
      canvas.drawText(new java.lang.String(st.line1), x, dp21(appObj, 30), textPaint);
    }
  }

  function createView21(appObj, st) {
    var self = appObj;
    var PreviewView = new JavaAdapter(android.view.View, {
      onDraw: function(canvas) {
        st.drawCount = Number(st.drawCount || 0) + 1;
        if (st.firstDrawLogged !== true) {
          st.firstDrawLogged = true;
          try {
            safeLog(self.L, 'i',
              "result preview first draw" +
              " width=" + String(this.getWidth()) +
              " height=" + String(this.getHeight()) +
              " alpha=" + String(this.getAlpha()) +
              " visibility=" + String(this.getVisibility()) +
              " lpY=" + String(st.lp ? st.lp.y : -1) +
              " drawCount=" + String(st.drawCount));
          } catch (eFirstDrawLog) {}
        }
        try { drawPreview21(self, st, canvas, this); } catch (eDraw) {
          try { safeLog(self.L, 'e', "result preview draw fail: " + String(eDraw)); } catch (eDrawLog) {}
        }
      },
      onTouchEvent: function(event) {
        try {
          var action = event.getActionMasked ? event.getActionMasked() : event.getAction();
          if (action === android.view.MotionEvent.ACTION_DOWN) {
            st.downX = event.getX();
            st.downY = event.getY();
            st.downRawX = event.getRawX();
            st.downRawY = event.getRawY();
            st.downAt = now21();
            st.touchMoved = false;
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
            try { this.animate().scaleX(1).scaleY(1).setDuration(80).start(); } catch (eUpScale) {}
            if (!st.touchMoved && st.clickLocked !== true) {
              self.openResultPreviewPrimaryAction();
            }
            return true;
          }
          if (action === android.view.MotionEvent.ACTION_CANCEL) {
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
    try { PreviewView.setLayerType(android.view.View.LAYER_TYPE_SOFTWARE, null); } catch (eLayer) {}
    return PreviewView;
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
      android.graphics.PixelFormat.TRANSLUCENT
    );
    lp.gravity = android.view.Gravity.TOP | android.view.Gravity.CENTER_HORIZONTAL;
    lp.x = 0;
    lp.y = topInset21(st.root) + dp21(appObj, 8);
    try { lp.setTitle("ToolHub result preview"); } catch (eTitle) {}
    return lp;
  }

  function cancelDismiss21(st) {
    if (!st) return;
    try {
      if (st.handler && st.dismissRunnable) st.handler.removeCallbacks(st.dismissRunnable);
    } catch (e0) {}
    st.dismissRunnable = null;
  }

  function cancelVisibilityFallback21(st) {
    if (!st) return;
    try {
      if (st.handler && st.visibilityFallbackRunnable) {
        st.handler.removeCallbacks(st.visibilityFallbackRunnable);
      }
    } catch (e0) {}
    st.visibilityFallbackRunnable = null;
  }

  function scheduleVisibilityFallback21(appObj, st, rootRef) {
    if (!st || !rootRef) return false;
    cancelVisibilityFallback21(st);
    var token = Number(st.generation || 0);
    st.visibilityFallbackRunnable = new java.lang.Runnable({ run: function() {
      try {
        st.visibilityFallbackRunnable = null;
        if (Number(st.generation || 0) !== token) return;
        if (st.added !== true || st.root !== rootRef) return;

        try { rootRef.animate().cancel(); } catch (eCancel) {}
        try { rootRef.setVisibility(android.view.View.VISIBLE); } catch (eVisible) {}
        try { rootRef.setAlpha(1); } catch (eAlpha) {}
        try { rootRef.setTranslationY(0); } catch (eTranslation) {}
        try { rootRef.requestLayout(); } catch (eLayout) {}
        try { rootRef.invalidate(); } catch (eInvalidate) {}

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
            " drawCount=" + String(st.drawCount || 0));
        } catch (eLog) {}
      } catch (eFallback) {
        try { safeLog(appObj.L, 'e', "result preview visibility fallback fail: " + String(eFallback)); } catch (eFallbackLog) {}
      }
    }});
    try {
      return st.handler.postDelayed(st.visibilityFallbackRunnable, 260) === true;
    } catch (ePost) {
      st.visibilityFallbackRunnable = null;
    }
    return false;
  }

  function removeView21(appObj, st) {
    if (!st) return false;
    cancelDismiss21(st);
    cancelVisibilityFallback21(st);
    try {
      if (st.added && st.root && st.wm) st.wm.removeView(st.root);
    } catch (eRemove) {
      try {
        if (typeof appObj.safeRemoveView === "function" && st.root) appObj.safeRemoveView(st.root, "resultPreview");
      } catch (eSafe) {}
    }
    st.root = null;
    st.lp = null;
    st.added = false;
    st.visible = false;
    st.entering = false;
    st.exiting = false;
    st.clickLocked = false;
    st.drawCount = 0;
    st.firstDrawLogged = false;
    return true;
  }

  function timeoutMs21(appObj) {
    var seconds = 3;
    try { seconds = Number(appObj && appObj.config ? appObj.config.POINTER_RESULT_PREVIEW_TIMEOUT_SEC : 3); } catch (e0) { seconds = 3; }
    if (isNaN(seconds)) seconds = 3;
    seconds = clamp21(seconds, 1, 10);
    return Math.round(seconds * 1000);
  }

  function scheduleDismiss21(appObj, st) {
    cancelDismiss21(st);
    var token = Number(st.generation || 0);
    st.dismissRunnable = new java.lang.Runnable({ run: function() {
      try {
        if (Number(st.generation || 0) !== token) return;
        appObj.dismissResultPreview("timeout", true);
      } catch (e0) {}
    }});
    try { st.handler.postDelayed(st.dismissRunnable, timeoutMs21(appObj)); } catch (ePost) { st.dismissRunnable = null; }
  }

  function showState21(appObj, st) {
    if (!st || !st.payload || !st.payload.text) return false;
    prepareLines21(appObj, st);
    try { st.wm = st.wm || (appObj.state && appObj.state.wm) || context.getSystemService(android.content.Context.WINDOW_SERVICE); } catch (eWm) {}
    if (!st.wm) return false;

    if (!st.root) st.root = createView21(appObj, st);
    if (!st.lp) st.lp = createLp21(appObj, st);
    st.lp.width = st.measuredWidth;
    st.lp.height = st.measuredHeight;
    st.lp.y = topInset21(st.root) + dp21(appObj, 8);

    if (!st.added) {
      st.wm.addView(st.root, st.lp);
      st.added = true;
      st.visible = true;
      st.entering = true;
      try {
        st.root.setVisibility(android.view.View.VISIBLE);
        st.root.setAlpha(0.78);
        st.root.setTranslationY(-dp21(appObj, 8));
        st.root.requestLayout();
        st.root.invalidate();
        st.root.animate()
          .alpha(1)
          .translationY(0)
          .setDuration(180)
          .setInterpolator(new android.view.animation.DecelerateInterpolator())
          .start();
      } catch (eEnter) {
        try {
          st.root.setVisibility(android.view.View.VISIBLE);
          st.root.setAlpha(1);
          st.root.setTranslationY(0);
          st.root.requestLayout();
          st.root.invalidate();
        } catch (eEnterFallback) {}
      }
      scheduleVisibilityFallback21(appObj, st, st.root);
      st.entering = false;
    } else {
      try {
        st.root.setVisibility(android.view.View.VISIBLE);
        st.root.setAlpha(1);
        st.root.setTranslationY(0);
      } catch (eExistingVisible) {}
      try { st.wm.updateViewLayout(st.root, st.lp); } catch (eUpdate) {}
      try { st.root.requestLayout(); st.root.invalidate(); } catch (eInvalidate) {}
      try {
        st.root.animate().cancel();
        st.root.setAlpha(0.86);
        st.root.setScaleX(0.985);
        st.root.setScaleY(0.985);
        st.root.animate().alpha(1).scaleX(1).scaleY(1).setDuration(120).start();
      } catch (ePulse) {}
      scheduleVisibilityFallback21(appObj, st, st.root);
      st.visible = true;
    }
    scheduleDismiss21(appObj, st);
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
        st.generation = Number(st.generation || 0) + 1;
        cancelDismiss21(st);
        st.lastReason = String(reason || "");
        runOnMain21(function() {
          var current = ensureState21(self);
          if (!current || !current.root || !current.added) {
            if (current) removeView21(self, current);
            return;
          }
          if (animate !== false) {
            current.exiting = true;
            var rootRef = current.root;
            var generation = Number(current.generation || 0);
            try {
              rootRef.animate().cancel();
              rootRef.animate()
                .alpha(0)
                .translationY(-dp21(self, 8))
                .setDuration(160)
                .setInterpolator(new android.view.animation.AccelerateInterpolator())
                .withEndAction(new java.lang.Runnable({ run: function() {
                  try {
                    if (Number(current.generation || 0) !== generation) return;
                    removeView21(self, current);
                  } catch (eEnd) {}
                }}))
                .start();
              return;
            } catch (eAnim) {}
          }
          removeView21(self, current);
        });
        return true;
      };

      proto.openResultPreviewPrimaryAction = function() {
        var st = ensureState21(this);
        if (!st || !st.payload || st.clickLocked === true) return false;
        st.clickLocked = true;
        cancelDismiss21(st);
        st.generation = Number(st.generation || 0) + 1;
        var payload = st.payload;
        var ret = null;
        var removedForHandoff = false;
        try {
          removedForHandoff = removeView21(this, st) === true;
          safeLog(this.L, 'i',
            "result preview primary handoff removed=" + String(removedForHandoff));
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
        try { this.publishResultPreview(payload); } catch (eRestore) {
          try { scheduleDismiss21(this, st); } catch (eRestoreSchedule) {}
        }
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
            if (!current || !current.payload || !current.root || !current.added) return;
            prepareLines21(self, current);
            current.lp.width = current.measuredWidth;
            current.lp.height = current.measuredHeight;
            current.lp.y = topInset21(current.root) + dp21(self, 8);
            current.wm.updateViewLayout(current.root, current.lp);
            current.root.invalidate();
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
