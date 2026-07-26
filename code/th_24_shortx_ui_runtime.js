// @version 0.1.2
// ShortX UI Runtime Phase 1: Core / Dispatcher / Scope / Color / Metrics / Display / Shape / Diagnostics.
// Beta-only experimental module. It does not replace ToolHub production UI paths.
(function (global) {
  if (global.ShortXUI && global.ShortXUI.__runtimeInstalled === true) return;

  var Build = Packages.android.os.Build;
  var Looper = Packages.android.os.Looper;
  var Handler = Packages.android.os.Handler;
  var CountDownLatch = Packages.java.util.concurrent.CountDownLatch;
  var TimeUnit = Packages.java.util.concurrent.TimeUnit;
  var JInteger = Packages.java.lang.Integer;
  var JArray = Packages.java.lang.reflect.Array;
  var Color = Packages.android.graphics.Color;
  var GradientDrawable = Packages.android.graphics.drawable.GradientDrawable;
  var StateListDrawable = Packages.android.graphics.drawable.StateListDrawable;
  var DisplayMetrics = Packages.android.util.DisplayMetrics;
  var WindowInsets = Packages.android.view.WindowInsets;
  var sxuiColorBridge = null;

  function sxuiErrorText(error) {
    try {
      if (error && error.javaException && error.javaException.getClass) {
        return String(error.javaException.getClass().getName()) + ": " + String(error);
      }
    } catch (ignoredJava) {}
    try { return String(error); } catch (ignoredString) { return "unknown"; }
  }

  function sxuiNumber(value, fallback) {
    var number = Number(value);
    return isFinite(number) ? number : Number(fallback || 0);
  }

  function sxuiClamp(value, minimum, maximum) {
    var number = sxuiNumber(value, minimum);
    var low = sxuiNumber(minimum, 0);
    var high = sxuiNumber(maximum, low);
    if (high < low) high = low;
    return Math.max(low, Math.min(high, number));
  }

  function sxuiColorInt(value, fallback) {
    var number;
    var text;
    try {
      if (value === null || value === undefined) return sxuiColorInt(fallback, 0);
      if (typeof value === "number") return Number(value) | 0;
      try {
        if (value instanceof JInteger) return Number(value.intValue()) | 0;
      } catch (ignoredInstance) {}
      text = String(value).replace(/^\s+|\s+$/g, "");
      if (!text) return sxuiColorInt(fallback, 0);
      if (text.charAt(0) === "#") return Number(Color.parseColor(text)) | 0;
      if (/^-?\d+$/.test(text)) {
        number = Number(text);
        return isFinite(number) ? (number | 0) : sxuiColorInt(fallback, 0);
      }
      return Number(Color.parseColor(text)) | 0;
    } catch (error) {
      if (fallback !== value) {
        try { return sxuiColorInt(fallback, 0); } catch (ignoredFallback) {}
      }
      return 0;
    }
  }

  function sxuiJintArray(values) {
    var source = values || [];
    var output = JArray.newInstance(JInteger.TYPE, Number(source.length || 0));
    var index;
    for (index = 0; index < source.length; index += 1) {
      output[index] = Number(source[index]) | 0;
    }
    return output;
  }

  function sxuiJint2Array(values) {
    var source = values || [];
    var intArrayClass = sxuiJintArray([]).getClass();
    var output = JArray.newInstance(intArrayClass, Number(source.length || 0));
    var index;
    for (index = 0; index < source.length; index += 1) {
      output[index] = sxuiJintArray(source[index] || []);
    }
    return output;
  }

  function sxuiColorStateList(value) {
    if (!sxuiColorBridge || typeof sxuiColorBridge.colorStateList !== "function") {
      throw new Error("ShortXUI color bridge is not installed");
    }
    return sxuiColorBridge.colorStateList(value);
  }

  function sxuiStateList(states, colors) {
    if (!sxuiColorBridge || typeof sxuiColorBridge.stateList !== "function") {
      throw new Error("ShortXUI color bridge is not installed");
    }
    return sxuiColorBridge.stateList(states || [], colors || []);
  }

  function sxuiSafeSetTextColor(view, value) {
    if (!sxuiColorBridge || typeof sxuiColorBridge.applyText !== "function") return false;
    return sxuiColorBridge.applyText(view, value) === true;
  }

  function sxuiSafeSetHintColor(view, value) {
    if (!sxuiColorBridge || typeof sxuiColorBridge.applyHint !== "function") return false;
    return sxuiColorBridge.applyHint(view, value) === true;
  }

  function sxuiSafeSetGradientColor(drawable, value) {
    if (!sxuiColorBridge || typeof sxuiColorBridge.applyGradient !== "function") return false;
    return sxuiColorBridge.applyGradient(drawable, value) === true;
  }

  function sxuiSafeSetGradientStroke(drawable, widthPx, value) {
    if (!sxuiColorBridge || typeof sxuiColorBridge.applyStroke !== "function") return false;
    return sxuiColorBridge.applyStroke(drawable, widthPx, value) === true;
  }

  function sxuiMakeRunnable(callback, onError) {
    return new Packages.java.lang.Runnable({
      run: function () {
        try { callback(); }
        catch (error) {
          try { if (onError) onError(error); } catch (ignoredHandler) {}
        }
      }
    });
  }

  var SXUI = {
    VERSION: "0.1.2",
    MODULE_VERSION: 1,
    __runtimeInstalled: true
  };

  SXUI.Core = {
    now: function () { return Number(Packages.java.lang.System.currentTimeMillis()); },
    text: function (value, fallback) {
      if (value === null || value === undefined) return String(fallback || "");
      try { return String(value); } catch (ignored) { return String(fallback || ""); }
    },
    number: sxuiNumber,
    bool: function (value, fallback) {
      if (value === true || value === false) return value;
      if (value === null || value === undefined) return fallback === true;
      var text = String(value).toLowerCase();
      if (text === "true" || text === "1" || text === "yes" || text === "on") return true;
      if (text === "false" || text === "0" || text === "no" || text === "off") return false;
      return fallback === true;
    },
    clamp: sxuiClamp,
    clamp01: function (value) { return sxuiClamp(value, 0, 1); },
    errorText: sxuiErrorText,
    closeQuietly: function (resource) {
      try { if (resource && resource.close) resource.close(); } catch (ignored) {}
    }
  };

  SXUI.Dispatcher = {
    fromHandler: function (handler, name) {
      var disposed = false;
      var nextToken = 1;
      var tasks = {};
      var state = {
        name: String(name || "dispatcher"),
        posted: 0,
        executed: 0,
        direct: 0,
        cancelled: 0,
        timedOut: 0,
        late: 0,
        errors: 0
      };

      function isOwnerThread() {
        try {
          return handler && handler.getLooper && Looper.myLooper() === handler.getLooper();
        } catch (ignored) { return false; }
      }

      function cancel(token) {
        var key = String(token || "");
        var task = tasks[key];
        if (!task || !handler) return false;
        try { handler.removeCallbacks(task); } catch (ignored) {}
        delete tasks[key];
        state.cancelled += 1;
        return true;
      }

      function postInternal(callback, delayMs, tokenHint) {
        if (disposed || !handler || typeof callback !== "function") return null;
        var token = String(tokenHint || (state.name + "#" + String(nextToken++)));
        cancel(token);
        var runnable = sxuiMakeRunnable(function () {
          delete tasks[token];
          if (disposed) {
            state.late += 1;
            return;
          }
          state.executed += 1;
          callback();
        }, function () { state.errors += 1; });
        tasks[token] = runnable;
        var posted = false;
        try {
          posted = Number(delayMs || 0) > 0 ?
            handler.postDelayed(runnable, Number(delayMs)) : handler.post(runnable);
        } catch (error) {
          state.errors += 1;
          posted = false;
        }
        if (!posted) {
          delete tasks[token];
          return null;
        }
        state.posted += 1;
        return token;
      }

      return {
        name: state.name,
        isOwnerThread: isOwnerThread,
        post: function (callback, tokenHint) {
          if (isOwnerThread() && !tokenHint && !disposed) {
            state.direct += 1;
            try { callback(); state.executed += 1; return "direct"; }
            catch (error) { state.errors += 1; return null; }
          }
          return postInternal(callback, 0, tokenHint);
        },
        postDelayed: function (callback, delayMs, tokenHint) {
          return postInternal(callback, delayMs, tokenHint);
        },
        cancel: cancel,
        runSync: function (callback, timeoutMs, onLateSuccess) {
          if (disposed || typeof callback !== "function") {
            return { ok: false, error: "dispatcher-unavailable" };
          }
          if (isOwnerThread()) {
            try {
              state.direct += 1;
              state.executed += 1;
              return { ok: true, value: callback(), direct: true };
            } catch (errorDirect) {
              state.errors += 1;
              return { ok: false, error: errorDirect };
            }
          }
          var box = { active: true, started: false, ok: false, value: null, error: null };
          var latch = new CountDownLatch(1);
          var runnable = new Packages.java.lang.Runnable({
            run: function () {
              var value = null;
              var success = false;
              box.started = true;
              try {
                value = callback();
                success = true;
                if (box.active) {
                  box.value = value;
                  box.ok = true;
                  state.executed += 1;
                } else {
                  state.late += 1;
                  try { if (onLateSuccess) onLateSuccess(value); } catch (ignoredLate) {}
                }
              } catch (errorRun) {
                if (box.active) box.error = errorRun;
                state.errors += 1;
              } finally {
                if (!box.active && success) state.late += 0;
                try { latch.countDown(); } catch (ignoredCount) {}
              }
            }
          });
          var posted = false;
          try { posted = handler.post(runnable); } catch (errorPost) { box.error = errorPost; }
          if (!posted) return { ok: false, error: box.error || "post-failed" };
          state.posted += 1;
          var done = false;
          try {
            done = latch.await(Math.max(1, Number(timeoutMs || 2000)), TimeUnit.MILLISECONDS);
          } catch (errorWait) {
            box.error = errorWait;
          }
          if (!done) {
            box.active = false;
            state.timedOut += 1;
            try { handler.removeCallbacks(runnable); } catch (ignoredRemove) {}
            return { ok: false, error: "timeout", timedOut: true, started: box.started === true };
          }
          box.active = false;
          return box.ok ? { ok: true, value: box.value } : { ok: false, error: box.error };
        },
        dispose: function () {
          var key;
          disposed = true;
          for (key in tasks) {
            if (tasks.hasOwnProperty(key)) cancel(key);
          }
          return true;
        },
        getState: function () {
          var pending = 0;
          var key;
          for (key in tasks) if (tasks.hasOwnProperty(key)) pending += 1;
          return {
            name: state.name,
            disposed: disposed,
            posted: state.posted,
            executed: state.executed,
            direct: state.direct,
            cancelled: state.cancelled,
            timedOut: state.timedOut,
            late: state.late,
            errors: state.errors,
            pending: pending
          };
        }
      };
    },
    main: function () {
      return SXUI.Dispatcher.fromHandler(new Handler(Looper.getMainLooper()), "android-main");
    }
  };

  SXUI.Scope = {
    create: function (name) {
      var generation = 1;
      var disposed = false;
      var cleanups = [];
      var tasks = {};
      return {
        name: String(name || "scope"),
        generation: function () { return generation; },
        isDisposed: function () { return disposed; },
        guard: function (callback) {
          var expected = generation;
          return function () {
            if (disposed || expected !== generation) return false;
            callback();
            return true;
          };
        },
        post: function (dispatcher, key, callback, delayMs) {
          if (disposed || !dispatcher || typeof callback !== "function") return null;
          var taskKey = String(key || ("task-" + String(SXUI.Core.now())));
          if (tasks[taskKey]) dispatcher.cancel(tasks[taskKey]);
          var expected = generation;
          var token = dispatcher.postDelayed(function () {
            delete tasks[taskKey];
            if (!disposed && expected === generation) callback();
          }, Number(delayMs || 0), String(name || "scope") + ":" + taskKey);
          if (token) tasks[taskKey] = token;
          return token;
        },
        cancel: function (dispatcher, key) {
          var taskKey = String(key || "");
          if (!tasks[taskKey] || !dispatcher) return false;
          var result = dispatcher.cancel(tasks[taskKey]);
          delete tasks[taskKey];
          return result;
        },
        defer: function (cleanup) {
          if (typeof cleanup === "function") cleanups.push(cleanup);
          return cleanup;
        },
        invalidate: function () {
          generation += 1;
          return generation;
        },
        dispose: function () {
          var index;
          if (disposed) return false;
          disposed = true;
          generation += 1;
          for (index = cleanups.length - 1; index >= 0; index -= 1) {
            try { cleanups[index](); } catch (ignoredCleanup) {}
          }
          cleanups = [];
          tasks = {};
          return true;
        }
      };
    }
  };

  SXUI.Color = {
    installBridge: function (bridge) {
      var required = ["colorStateList", "stateList", "applyText", "applyHint",
        "applyPaint", "applyBackground", "applyGradient", "applyStroke"];
      var index;
      if (!bridge) throw new Error("ShortXUI color bridge is required");
      for (index = 0; index < required.length; index += 1) {
        if (typeof bridge[required[index]] !== "function") {
          throw new Error("ShortXUI color bridge method missing: " + required[index]);
        }
      }
      sxuiColorBridge = bridge;
      return true;
    },
    hasBridge: function () { return sxuiColorBridge !== null; },
    int: sxuiColorInt,
    jintArray: sxuiJintArray,
    jint2Array: sxuiJint2Array,
    stateList: sxuiStateList,
    colorStateList: sxuiColorStateList,
    alpha: function (value) { return (sxuiColorInt(value, 0) >>> 24) & 255; },
    red: function (value) { return (sxuiColorInt(value, 0) >>> 16) & 255; },
    green: function (value) { return (sxuiColorInt(value, 0) >>> 8) & 255; },
    blue: function (value) { return sxuiColorInt(value, 0) & 255; },
    withAlpha: function (value, alpha) {
      var color = sxuiColorInt(value, 0);
      var a = Math.round(sxuiClamp(alpha, 0, 1) * 255);
      return ((a << 24) | (color & 0x00FFFFFF)) | 0;
    },
    luminance: function (value) {
      var color = sxuiColorInt(value, 0);
      return ((((color >>> 16) & 255) * 0.299) +
        (((color >>> 8) & 255) * 0.587) + ((color & 255) * 0.114)) / 255;
    },
    applyText: sxuiSafeSetTextColor,
    applyHint: sxuiSafeSetHintColor,
    applyPaint: function (paint, value) {
      if (!sxuiColorBridge || typeof sxuiColorBridge.applyPaint !== "function") return false;
      return sxuiColorBridge.applyPaint(paint, value) === true;
    },
    applyBackground: function (view, value) {
      if (!sxuiColorBridge || typeof sxuiColorBridge.applyBackground !== "function") return false;
      return sxuiColorBridge.applyBackground(view, value) === true;
    },
    applyGradient: sxuiSafeSetGradientColor,
    applyStroke: sxuiSafeSetGradientStroke
  };

  SXUI.Metrics = {
    create: function (ctx) {
      var resourceMetrics = ctx.getResources().getDisplayMetrics();
      var density = Math.max(0.01, sxuiNumber(resourceMetrics.density, 1));
      var scaledDensity = Math.max(0.01, sxuiNumber(resourceMetrics.scaledDensity, density));
      var fontScale = 1;
      try { fontScale = sxuiNumber(ctx.getResources().getConfiguration().fontScale, 1); }
      catch (ignoredFont) {}
      return {
        density: density,
        scaledDensity: scaledDensity,
        fontScale: fontScale,
        dp: function (value) { return Math.max(0, Math.floor(sxuiNumber(value, 0) * density + 0.5)); },
        sp: function (value) { return Math.max(0, Math.floor(sxuiNumber(value, 0) * scaledDensity + 0.5)); },
        pxToDp: function (value) { return sxuiNumber(value, 0) / density; },
        pxToSp: function (value) { return sxuiNumber(value, 0) / scaledDensity; },
        snapshot: function () {
          return { density: density, scaledDensity: scaledDensity, fontScale: fontScale };
        }
      };
    }
  };

  SXUI.Display = {
    snapshot: function (ctx, wm) {
      var metrics = new DisplayMetrics();
      var bounds = { left: 0, top: 0, right: 0, bottom: 0 };
      var insets = { left: 0, top: 0, right: 0, bottom: 0 };
      var source = "resources";
      try {
        if (Build.VERSION.SDK_INT >= 30 && wm && wm.getCurrentWindowMetrics) {
          var current = wm.getCurrentWindowMetrics();
          var rect = current.getBounds();
          bounds = { left: Number(rect.left), top: Number(rect.top), right: Number(rect.right), bottom: Number(rect.bottom) };
          var wi = current.getWindowInsets();
          if (wi) {
            var mask = WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout();
            var insetValue = wi.getInsetsIgnoringVisibility(mask);
            insets = { left: Number(insetValue.left), top: Number(insetValue.top), right: Number(insetValue.right), bottom: Number(insetValue.bottom) };
          }
          source = "window_metrics";
        }
      } catch (ignoredWindowMetrics) {}
      if (bounds.right <= bounds.left || bounds.bottom <= bounds.top) {
        try {
          if (wm && wm.getDefaultDisplay) wm.getDefaultDisplay().getRealMetrics(metrics);
          else metrics = ctx.getResources().getDisplayMetrics();
        } catch (ignoredReal) { metrics = ctx.getResources().getDisplayMetrics(); }
        bounds = { left: 0, top: 0, right: Number(metrics.widthPixels || 0), bottom: Number(metrics.heightPixels || 0) };
      }
      var safe = {
        left: bounds.left + insets.left,
        top: bounds.top + insets.top,
        right: bounds.right - insets.right,
        bottom: bounds.bottom - insets.bottom
      };
      return {
        source: source,
        bounds: bounds,
        insets: insets,
        safeBounds: safe,
        width: Math.max(0, bounds.right - bounds.left),
        height: Math.max(0, bounds.bottom - bounds.top),
        safeWidth: Math.max(0, safe.right - safe.left),
        safeHeight: Math.max(0, safe.bottom - safe.top),
        orientation: (bounds.right - bounds.left) > (bounds.bottom - bounds.top) ? "landscape" : "portrait"
      };
    }
  };

  SXUI.Shape = {
    roundRect: function (fillColor, radiusPx) {
      var drawable = new GradientDrawable();
      drawable.setShape(GradientDrawable.RECTANGLE);
      sxuiSafeSetGradientColor(drawable, fillColor);
      drawable.setCornerRadius(Math.max(0, sxuiNumber(radiusPx, 0)));
      return drawable;
    },
    strokeRect: function (fillColor, strokeColor, strokeWidthPx, radiusPx) {
      var drawable = SXUI.Shape.roundRect(fillColor, radiusPx);
      sxuiSafeSetGradientStroke(drawable, strokeWidthPx, strokeColor);
      return drawable;
    },
    pressed: function (normalColor, pressedColor, radiusPx) {
      var drawable = new StateListDrawable();
      drawable.addState(sxuiJintArray([Packages.android.R.attr.state_pressed]), SXUI.Shape.roundRect(pressedColor, radiusPx));
      drawable.addState(sxuiJintArray([]), SXUI.Shape.roundRect(normalColor, radiusPx));
      return drawable;
    },
    transparentPressed: function (pressedColor, radiusPx) {
      return SXUI.Shape.pressed(Color.TRANSPARENT, pressedColor, radiusPx);
    }
  };

  SXUI.Diagnostics = {
    runBasic: function (ctx, wm) {
      var startedAt = SXUI.Core.now();
      var checks = [];
      var errors = [];
      function check(name, callback) {
        try {
          var value = callback();
          checks.push({ name: String(name), ok: true, value: value === undefined ? null : value });
        } catch (error) {
          checks.push({ name: String(name), ok: false, error: sxuiErrorText(error) });
          errors.push(String(name) + ": " + sxuiErrorText(error));
        }
      }
      var metrics = null;
      var display = null;
      check("metrics", function () { metrics = SXUI.Metrics.create(ctx); return metrics.snapshot(); });
      check("display", function () { display = SXUI.Display.snapshot(ctx, wm); return display; });
      check("color_parse", function () { return SXUI.Color.int("#FF6750A4", 0); });
      check("color_state_list", function () {
        return Number(SXUI.Color.stateList([[Packages.android.R.attr.state_pressed], []], ["#FF6750A4", "#FF49454F"]).getDefaultColor());
      });
      check("shape_round_rect", function () { return String(SXUI.Shape.roundRect("#FF6750A4", metrics ? metrics.dp(12) : 12).getClass().getName()); });
      return {
        schema: 1,
        runtimeVersion: SXUI.VERSION,
        ok: errors.length === 0,
        startedAt: startedAt,
        durationMs: Math.max(0, SXUI.Core.now() - startedAt),
        checks: checks,
        errors: errors,
        metrics: metrics ? metrics.snapshot() : null,
        display: display
      };
    }
  };

  global.ShortXUI = SXUI;
}(function () { return this; }()));
