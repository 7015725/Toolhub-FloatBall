// @version 1.0.0
// =======================【拾字截图：单图缩略图与原图查看】=======================
// 仅消费 ToolHub/screenshots 内已落盘图片；不负责截图、保存、分享、删除或历史列表。
(function() {
  function now22() {
    try { return java.lang.System.currentTimeMillis(); } catch (e0) {}
    return (new Date()).getTime();
  }

  function clamp22(value, min, max) {
    var n = Number(value);
    if (isNaN(n)) n = min;
    if (n < min) n = min;
    if (n > max) n = max;
    return n;
  }

  function int22(value, fallback) {
    var n = Number(value);
    if (isNaN(n)) n = Number(fallback || 0);
    if (isNaN(n)) n = 0;
    return Math.round(n);
  }

  function dp22(value) {
    var density = 1;
    try { density = Number(context.getResources().getDisplayMetrics().density || 1); } catch (e0) { density = 1; }
    return Math.max(1, Math.round(Number(value || 0) * density));
  }

  function safeText22(view, color) {
    try { toolhubSafeSetTextColor(view, Number(color) | 0); } catch (e0) {}
  }

  function theme22(appObj) {
    var dark = false;
    try { dark = !!(appObj && appObj.isDarkTheme && appObj.isDarkTheme()); } catch (e0) {}
    var out = {
      bg: dark ? (0xFF111318 | 0) : (0xFFF8FAFC | 0),
      card: dark ? (0xFF1C1F26 | 0) : (0xFFFFFFFF | 0),
      text: dark ? (0xFFF1F5F9 | 0) : (0xFF111827 | 0),
      secondary: dark ? (0xFFCBD5E1 | 0) : (0xFF64748B | 0),
      primary: dark ? (0xFFA8C7FA | 0) : (0xFF005BC0 | 0),
      stroke: dark ? (0x55FFFFFF | 0) : (0x22000000 | 0)
    };
    try {
      if (appObj && appObj.getSettingsColorScheme) {
        var s = appObj.getSettingsColorScheme();
        if (s) {
          out.bg = Number(s.surface) | 0;
          out.card = Number(s.surface2 || s.surface) | 0;
          out.text = Number(s.onSurface) | 0;
          out.secondary = Number(s.onSurface2 || s.onSurface) | 0;
          out.primary = Number(s.primary) | 0;
          out.stroke = Number(s.outlineVariant) | 0;
        }
      }
    } catch (e1) {}
    return out;
  }

  function roundBg22(color, stroke, radius) {
    var gd = new android.graphics.drawable.GradientDrawable();
    try { toolhubSafeSetGradientColor(gd, Number(color) | 0); } catch (e0) {}
    try { gd.setCornerRadius(dp22(radius || 12)); } catch (e1) {}
    try { toolhubSafeSetGradientStroke(gd, dp22(1), Number(stroke) | 0); } catch (e2) {}
    return gd;
  }

  function sampleSize22(width, height, maxEdge) {
    var sample = 1;
    var limit = Math.max(64, Number(maxEdge || 2048));
    while (Math.max(width / sample, height / sample) > limit) sample *= 2;
    return sample;
  }

  function floorPowerTwo22(value) {
    var n = Math.max(1, Math.floor(Number(value || 1)));
    var p = 1;
    while (p * 2 <= n) p *= 2;
    return p;
  }

  function safeRecycle22(bitmap) {
    try {
      if (bitmap && bitmap.recycle && (!bitmap.isRecycled || bitmap.isRecycled() !== true)) bitmap.recycle();
    } catch (e0) {}
  }

  function safeClose22(decoder) {
    try { if (decoder && decoder.recycle) decoder.recycle(); } catch (e0) {}
    try { if (decoder && decoder.close) decoder.close(); } catch (e1) {}
  }

  function fileSizeText22(bytes) {
    var n = Math.max(0, Number(bytes || 0));
    if (n >= 1024 * 1024) return String(Math.round(n / 1024 / 1024 * 10) / 10) + " MB";
    if (n >= 1024) return String(Math.round(n / 1024 * 10) / 10) + " KB";
    return String(Math.round(n)) + " B";
  }

  function install22() {
    try {
      if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return false;
      var proto = FloatBallAppWM.prototype;
      if (proto.__toolHubPickwordImageViewerInstalled === true) return true;

      proto.createPickwordImageController = function(options) {
        var appObj = this;
        var opts = options || {};
        var session = opts.session || {};
        var path = String(session.internalPath || "");
        var file = new java.io.File(path);
        var handler = opts.handler || new android.os.Handler(android.os.Looper.getMainLooper());
        var executor = java.util.concurrent.Executors.newSingleThreadExecutor();
        var colors = theme22(appObj);
        var generation = 1;
        var released = false;
        var boundsReady = false;
        var sourceWidth = 0;
        var sourceHeight = 0;
        var fileSize = 0;
        var baseSample = 1;
        var thumbBitmap = null;
        var baseBitmap = null;
        var regionBitmap = null;
        var regionRect = null;
        var regionSample = 1;
        var regionDecoder = null;
        var regionSerial = 0;
        var regionRunnable = null;
        var thumbnailRoot = null;
        var thumbnailImage = null;
        var thumbnailStatus = null;
        var fullRoot = null;
        var imageCanvas = null;
        var infoView = null;
        var viewW = 0;
        var viewH = 0;
        var scale = 1;
        var minScale = 1;
        var maxScale = 8;
        var tx = 0;
        var ty = 0;
        var lastX = 0;
        var lastY = 0;
        var panning = false;
        var scaling = false;
        var initialized = false;

        function log(level, msg) {
          try { safeLog(appObj.L, level, "pickword image " + String(msg)); } catch (e0) {}
        }

        function error(stage, err) {
          log('w', "stage=" + String(stage || "") + " err=" + String(err || ""));
          try { if (typeof opts.onError === "function") opts.onError(stage, err); } catch (e0) {}
        }

        function post(fn) {
          try {
            return handler.post(new java.lang.Runnable({ run: function() {
              try { fn(); } catch (eRun) { error("ui", eRun); }
            }})) === true;
          } catch (e0) {}
          return false;
        }

        function readBounds() {
          if (boundsReady) return true;
          var o = new android.graphics.BitmapFactory.Options();
          o.inJustDecodeBounds = true;
          android.graphics.BitmapFactory.decodeFile(path, o);
          sourceWidth = Math.max(0, Number(o.outWidth || 0));
          sourceHeight = Math.max(0, Number(o.outHeight || 0));
          try { fileSize = Number(file.length() || 0); } catch (e0) { fileSize = 0; }
          boundsReady = sourceWidth > 0 && sourceHeight > 0;
          return boundsReady;
        }

        function updateInfo() {
          if (!infoView) return;
          var text = sourceWidth > 0 ? (String(sourceWidth) + " × " + String(sourceHeight) + "  ·  " + fileSizeText22(fileSize)) : "图片信息不可用";
          try { infoView.setText(text); } catch (e0) {}
        }

        function fitTransform() {
          if (!baseBitmap || viewW <= 0 || viewH <= 0) return;
          var bw = Math.max(1, Number(baseBitmap.getWidth()));
          var bh = Math.max(1, Number(baseBitmap.getHeight()));
          minScale = Math.min(viewW / bw, viewH / bh);
          if (!(minScale > 0)) minScale = 1;
          maxScale = Math.max(minScale * 8, 8 / Math.max(1, baseSample));
          scale = minScale;
          tx = (viewW - bw * scale) / 2;
          ty = (viewH - bh * scale) / 2;
          initialized = true;
        }

        function clampTranslation() {
          if (!baseBitmap || viewW <= 0 || viewH <= 0) return;
          var dw = baseBitmap.getWidth() * scale;
          var dh = baseBitmap.getHeight() * scale;
          if (dw <= viewW) tx = (viewW - dw) / 2;
          else tx = clamp22(tx, viewW - dw, 0);
          if (dh <= viewH) ty = (viewH - dh) / 2;
          else ty = clamp22(ty, viewH - dh, 0);
        }

        function setScaleAround(next, fx, fy) {
          if (!baseBitmap) return;
          var old = scale;
          next = clamp22(next, minScale, maxScale);
          if (!(old > 0)) old = next;
          var bx = (fx - tx) / old;
          var by = (fy - ty) / old;
          scale = next;
          tx = fx - bx * scale;
          ty = fy - by * scale;
          clampTranslation();
          try { if (imageCanvas) imageCanvas.invalidate(); } catch (e0) {}
          scheduleRegionDecode();
        }

        function visibleSourceRect() {
          if (!baseBitmap || !boundsReady || viewW <= 0 || viewH <= 0 || !(scale > 0)) return null;
          var left = Math.floor(Math.max(0, ((0 - tx) / scale) * baseSample));
          var top = Math.floor(Math.max(0, ((0 - ty) / scale) * baseSample));
          var right = Math.ceil(Math.min(sourceWidth, ((viewW - tx) / scale) * baseSample));
          var bottom = Math.ceil(Math.min(sourceHeight, ((viewH - ty) / scale) * baseSample));
          if (right <= left || bottom <= top) return null;
          var padX = Math.max(8, Math.round((right - left) * 0.08));
          var padY = Math.max(8, Math.round((bottom - top) * 0.08));
          left = Math.max(0, left - padX);
          top = Math.max(0, top - padY);
          right = Math.min(sourceWidth, right + padX);
          bottom = Math.min(sourceHeight, bottom + padY);
          return new android.graphics.Rect(left, top, right, bottom);
        }

        function scheduleRegionDecode() {
          if (!regionDecoder || released || !baseBitmap) return;
          regionSerial++;
          var serial = regionSerial;
          if (regionRunnable) {
            try { handler.removeCallbacks(regionRunnable); } catch (e0) {}
          }
          regionRunnable = new java.lang.Runnable({ run: function() {
            regionRunnable = null;
            if (released || serial !== regionSerial) return;
            var rect = visibleSourceRect();
            if (!rect) return;
            var desired = Math.max(1, floorPowerTwo22(baseSample / Math.max(scale, 0.01)));
            if (desired >= baseSample && scale <= minScale * 1.15) return;
            try {
              executor.execute(new java.lang.Runnable({ run: function() {
                var decoded = null;
                try {
                  var o = new android.graphics.BitmapFactory.Options();
                  o.inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888;
                  o.inSampleSize = desired;
                  decoded = regionDecoder.decodeRegion(rect, o);
                } catch (eDecode) {
                  error("region_decode", eDecode);
                }
                finalApply(decoded, rect, desired, serial);
              }}));
            } catch (eExec) { error("region_schedule", eExec); }
          }});
          try { handler.postDelayed(regionRunnable, 90); } catch (ePost) {}
        }

        function finalApply(decoded, rect, sampleValue, serial) {
          post(function() {
            if (released || serial !== regionSerial) {
              safeRecycle22(decoded);
              return;
            }
            safeRecycle22(regionBitmap);
            regionBitmap = decoded;
            regionRect = rect;
            regionSample = sampleValue;
            try { if (imageCanvas) imageCanvas.invalidate(); } catch (e0) {}
          });
        }

        function decodeThumbnail() {
          var token = generation;
          try {
            executor.execute(new java.lang.Runnable({ run: function() {
              var bitmap = null;
              try {
                if (!readBounds()) throw new Error("图片尺寸读取失败");
                var o = new android.graphics.BitmapFactory.Options();
                o.inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888;
                o.inSampleSize = sampleSize22(sourceWidth, sourceHeight, 512);
                bitmap = android.graphics.BitmapFactory.decodeFile(path, o);
                if (!bitmap) throw new Error("缩略图解码为空");
              } catch (eDecode) {
                error("thumbnail_decode", eDecode);
              }
              post(function() {
                if (released || token !== generation) {
                  safeRecycle22(bitmap);
                  return;
                }
                safeRecycle22(thumbBitmap);
                thumbBitmap = bitmap;
                if (thumbnailImage && bitmap) thumbnailImage.setImageBitmap(bitmap);
                if (thumbnailStatus) thumbnailStatus.setText(bitmap ? "点击查看原图" : "截图不可用");
                updateInfo();
              });
            }}));
          } catch (eExec) { error("thumbnail_schedule", eExec); }
        }

        function decodeFull() {
          if (baseBitmap || released) return;
          var token = generation;
          try {
            executor.execute(new java.lang.Runnable({ run: function() {
              var bitmap = null;
              var decoder = null;
              var sampleValue = 1;
              try {
                if (!readBounds()) throw new Error("图片尺寸读取失败");
                sampleValue = sampleSize22(sourceWidth, sourceHeight, 4096);
                var o = new android.graphics.BitmapFactory.Options();
                o.inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888;
                o.inSampleSize = sampleValue;
                bitmap = android.graphics.BitmapFactory.decodeFile(path, o);
                if (!bitmap) throw new Error("原图解码为空");
                if (sampleValue > 1) {
                  try { decoder = android.graphics.BitmapRegionDecoder.newInstance(path, false); } catch (eRegion) { decoder = null; }
                }
              } catch (eDecode) {
                error("full_decode", eDecode);
              }
              post(function() {
                if (released || token !== generation) {
                  safeRecycle22(bitmap);
                  safeClose22(decoder);
                  return;
                }
                baseBitmap = bitmap;
                baseSample = sampleValue;
                regionDecoder = decoder;
                if (baseBitmap && imageCanvas) {
                  fitTransform();
                  imageCanvas.invalidate();
                  scheduleRegionDecode();
                }
                updateInfo();
              });
            }}));
          } catch (eExec) { error("full_schedule", eExec); }
        }

        var scaleListener = new JavaAdapter(android.view.ScaleGestureDetector.SimpleOnScaleGestureListener, {
          onScaleBegin: function(detector) { scaling = true; return true; },
          onScale: function(detector) {
            try { setScaleAround(scale * Number(detector.getScaleFactor()), detector.getFocusX(), detector.getFocusY()); } catch (e0) {}
            return true;
          },
          onScaleEnd: function(detector) { scaling = false; scheduleRegionDecode(); }
        });
        var scaleDetector = new android.view.ScaleGestureDetector(opts.context || context, scaleListener);

        var gestureListener = new JavaAdapter(android.view.GestureDetector.SimpleOnGestureListener, {
          onDown: function(event) { return true; },
          onDoubleTap: function(event) {
            var target = scale > minScale * 1.4 ? minScale : Math.min(maxScale, minScale * 3);
            setScaleAround(target, event.getX(), event.getY());
            return true;
          }
        });
        var gestureDetector = new android.view.GestureDetector(opts.context || context, gestureListener);

        function createCanvas() {
          var CanvasView = new JavaAdapter(android.view.View, {
            onSizeChanged: function(w, h, oldw, oldh) {
              viewW = Number(w || 0);
              viewH = Number(h || 0);
              if (baseBitmap) {
                if (!initialized) fitTransform();
                else clampTranslation();
                scheduleRegionDecode();
              }
            },
            onDraw: function(canvas) {
              try {
                canvas.drawARGB(255, (colors.bg >>> 16) & 255, (colors.bg >>> 8) & 255, colors.bg & 255);
                var cell = dp22(18);
                var p = new android.graphics.Paint();
                for (var yy = 0; yy < getHeight(); yy += cell) {
                  for (var xx = 0; xx < getWidth(); xx += cell) {
                    var v = (((xx / cell) + (yy / cell)) % 2 === 0) ? 20 : 8;
                    p.setARGB(v, 128, 128, 128);
                    canvas.drawRect(xx, yy, xx + cell, yy + cell, p);
                  }
                }
                if (!baseBitmap) {
                  var t = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
                  t.setARGB(255, (colors.secondary >>> 16) & 255, (colors.secondary >>> 8) & 255, colors.secondary & 255);
                  t.setTextSize(dp22(15));
                  t.setTextAlign(android.graphics.Paint.Align.CENTER);
                  canvas.drawText(new java.lang.String("正在载入截图…"), getWidth() / 2, getHeight() / 2, t);
                  return;
                }
                canvas.save();
                canvas.translate(tx, ty);
                canvas.scale(scale, scale);
                canvas.drawBitmap(baseBitmap, 0, 0, null);
                canvas.restore();
                if (regionBitmap && regionRect) {
                  var left = tx + (Number(regionRect.left) / baseSample) * scale;
                  var top = ty + (Number(regionRect.top) / baseSample) * scale;
                  var right = tx + (Number(regionRect.right) / baseSample) * scale;
                  var bottom = ty + (Number(regionRect.bottom) / baseSample) * scale;
                  var dst = new android.graphics.RectF(left, top, right, bottom);
                  canvas.drawBitmap(regionBitmap, null, dst, null);
                }
              } catch (eDraw) { error("draw", eDraw); }
            },
            onTouchEvent: function(event) {
              try { scaleDetector.onTouchEvent(event); } catch (eScale) {}
              try { gestureDetector.onTouchEvent(event); } catch (eGesture) {}
              var action = event.getActionMasked ? event.getActionMasked() : event.getAction();
              if (action === android.view.MotionEvent.ACTION_DOWN) {
                lastX = event.getX();
                lastY = event.getY();
                panning = true;
                return true;
              }
              if (action === android.view.MotionEvent.ACTION_MOVE && panning && !scaling && event.getPointerCount() === 1) {
                var nx = event.getX();
                var ny = event.getY();
                tx += nx - lastX;
                ty += ny - lastY;
                lastX = nx;
                lastY = ny;
                clampTranslation();
                invalidate();
                scheduleRegionDecode();
                return true;
              }
              if (action === android.view.MotionEvent.ACTION_UP || action === android.view.MotionEvent.ACTION_CANCEL) {
                panning = false;
                scheduleRegionDecode();
                return true;
              }
              return true;
            }
          }, opts.context || context);
          CanvasView.setClickable(true);
          return CanvasView;
        }

        function button(label, callback) {
          var tv = new android.widget.TextView(opts.context || context);
          tv.setText(label);
          safeText22(tv, colors.primary);
          tv.setTextSize(14);
          tv.setGravity(android.view.Gravity.CENTER);
          tv.setPadding(dp22(12), dp22(8), dp22(12), dp22(8));
          tv.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
            try { callback(); } catch (e0) { error("button", e0); }
          }}));
          return tv;
        }

        var controller = {
          hasImage: function() {
            try { return !released && file.exists() && file.isFile() && file.length() > 0; } catch (e0) {}
            return false;
          },
          createThumbnailView: function() {
            if (thumbnailRoot) return thumbnailRoot;
            var root = new android.widget.FrameLayout(opts.context || context);
            thumbnailRoot = root;
            root.setBackground(roundBg22(colors.card, colors.stroke, 14));
            root.setPadding(dp22(6), dp22(6), dp22(6), dp22(6));
            var image = new android.widget.ImageView(opts.context || context);
            thumbnailImage = image;
            image.setScaleType(android.widget.ImageView.ScaleType.CENTER_INSIDE);
            root.addView(image, new android.widget.FrameLayout.LayoutParams(-1, -1));
            var status = new android.widget.TextView(opts.context || context);
            thumbnailStatus = status;
            status.setText("正在读取截图…");
            safeText22(status, colors.secondary);
            status.setTextSize(11);
            status.setGravity(android.view.Gravity.CENTER);
            var statusLp = new android.widget.FrameLayout.LayoutParams(-1, dp22(30), android.view.Gravity.BOTTOM);
            root.addView(status, statusLp);
            root.setClickable(true);
            root.setContentDescription("截图缩略图，点击查看原图");
            root.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
              try { if (typeof opts.onOpen === "function") opts.onOpen(); } catch (e0) { error("open_callback", e0); }
            }}));
            decodeThumbnail();
            return root;
          },
          createFullView: function() {
            if (fullRoot) return fullRoot;
            var root = new android.widget.FrameLayout(opts.context || context);
            fullRoot = root;
            imageCanvas = createCanvas();
            root.addView(imageCanvas, new android.widget.FrameLayout.LayoutParams(-1, -1));

            var top = new android.widget.LinearLayout(opts.context || context);
            top.setOrientation(android.widget.LinearLayout.HORIZONTAL);
            top.setGravity(android.view.Gravity.CENTER_VERTICAL);
            top.setPadding(dp22(6), dp22(4), dp22(6), dp22(4));
            top.setBackground(roundBg22(colors.card, colors.stroke, 0));
            top.addView(button("返回", function() {
              try { if (typeof opts.onBack === "function") opts.onBack(); } catch (e0) { error("back_callback", e0); }
            }), new android.widget.LinearLayout.LayoutParams(dp22(72), dp22(48)));
            var title = new android.widget.TextView(opts.context || context);
            title.setText("截图原图");
            safeText22(title, colors.text);
            title.setTextSize(16);
            title.setGravity(android.view.Gravity.CENTER);
            top.addView(title, new android.widget.LinearLayout.LayoutParams(0, dp22(48), 1));
            top.addView(button("关闭", function() {
              try { if (typeof opts.onCloseSession === "function") opts.onCloseSession(); } catch (e0) { error("close_callback", e0); }
            }), new android.widget.LinearLayout.LayoutParams(dp22(72), dp22(48)));
            root.addView(top, new android.widget.FrameLayout.LayoutParams(-1, dp22(56), android.view.Gravity.TOP));

            infoView = new android.widget.TextView(opts.context || context);
            safeText22(infoView, colors.secondary);
            infoView.setTextSize(11);
            infoView.setGravity(android.view.Gravity.CENTER);
            infoView.setPadding(dp22(8), dp22(4), dp22(8), dp22(4));
            infoView.setBackground(roundBg22(colors.card, colors.stroke, 0));
            infoView.setText("双指缩放 · 单指平移 · 双击放大或复位");
            root.addView(infoView, new android.widget.FrameLayout.LayoutParams(-1, dp22(42), android.view.Gravity.BOTTOM));
            updateInfo();
            return root;
          },
          open: function() {
            if (released) return false;
            decodeFull();
            try { if (fullRoot) fullRoot.setVisibility(android.view.View.VISIBLE); } catch (e0) {}
            return true;
          },
          back: function(reason) {
            try { if (fullRoot) fullRoot.setVisibility(android.view.View.GONE); } catch (e0) {}
            return true;
          },
          refreshLayout: function() {
            colors = theme22(appObj);
            try { if (thumbnailRoot) thumbnailRoot.setBackground(roundBg22(colors.card, colors.stroke, 14)); } catch (e0) {}
            try { if (imageCanvas) imageCanvas.invalidate(); } catch (e1) {}
            return true;
          },
          getImageInfo: function() {
            try { readBounds(); } catch (e0) {}
            return {
              path: path,
              width: sourceWidth,
              height: sourceHeight,
              fileSize: fileSize,
              sampleSize: baseSample,
              createdAt: Number(session.createdAt || 0)
            };
          },
          release: function(reason) {
            if (released) return true;
            released = true;
            generation++;
            regionSerial++;
            try { if (regionRunnable) handler.removeCallbacks(regionRunnable); } catch (e0) {}
            regionRunnable = null;
            try { executor.shutdownNow(); } catch (e1) {}
            try { if (thumbnailImage) thumbnailImage.setImageDrawable(null); } catch (e2) {}
            safeRecycle22(thumbBitmap);
            safeRecycle22(regionBitmap);
            safeRecycle22(baseBitmap);
            safeClose22(regionDecoder);
            thumbBitmap = null;
            regionBitmap = null;
            baseBitmap = null;
            regionDecoder = null;
            thumbnailRoot = null;
            thumbnailImage = null;
            thumbnailStatus = null;
            fullRoot = null;
            imageCanvas = null;
            infoView = null;
            log('i', "released reason=" + String(reason || "") + " path=" + path);
            return true;
          }
        };

        log('i', "controller created path=" + path + " createdAt=" + String(now22()));
        return controller;
      };

      proto.__toolHubPickwordImageViewerInstalled = true;
      return true;
    } catch (eInstall) {
      try { safeLog(null, 'e', "install pickword image viewer fail: " + String(eInstall)); } catch (e0) {}
    }
    return false;
  }

  install22();
})();
