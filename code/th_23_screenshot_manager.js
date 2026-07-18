// @version 1.0.0
// =======================【截图管理器：内部截图 / 已保存】=======================
(function() {
  function dp23(appObj, value) {
    try { if (appObj && appObj.dp) return appObj.dp(value); } catch (e0) {}
    var density = 1;
    try { density = Number(context.getResources().getDisplayMetrics().density || 1); } catch (e1) {}
    return Math.max(1, Math.round(Number(value || 0) * density));
  }

  function colors23(appObj) {
    try {
      var scheme = appObj.getSettingsColorScheme();
      if (scheme) return scheme;
    } catch (e0) {}
    return {
      background: (0xFFF8FAFC | 0), surface: (0xFFFFFFFF | 0), surface2: (0xFFF1F5F9 | 0),
      onSurface: (0xFF111827 | 0), onSurface2: (0xFF64748B | 0), primary: (0xFF005BC0 | 0),
      onPrimary: (0xFFFFFFFF | 0), danger: (0xFFBA1A1A | 0), outlineVariant: (0x22000000 | 0)
    };
  }

  function safeText23(view, color) {
    try { toolhubSafeSetTextColor(view, Number(color) | 0); } catch (e0) {}
  }

  function round23(appObj, fill, stroke, radius) {
    var gd = new android.graphics.drawable.GradientDrawable();
    try { toolhubSafeSetGradientColor(gd, Number(fill) | 0); } catch (e0) {}
    try { gd.setCornerRadius(dp23(appObj, radius || 14)); } catch (e1) {}
    try { toolhubSafeSetGradientStroke(gd, dp23(appObj, 1), Number(stroke) | 0); } catch (e2) {}
    return gd;
  }

  function formatSize23(value) {
    var n = Math.max(0, Number(value || 0));
    if (n >= 1024 * 1024) return String(Math.round(n / 1024 / 1024 * 10) / 10) + " MB";
    if (n >= 1024) return String(Math.round(n / 1024 * 10) / 10) + " KB";
    return String(Math.round(n)) + " B";
  }

  function formatDate23(value) {
    var ts = Number(value || 0);
    if (ts <= 0) return "时间未知";
    try {
      return String(new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.getDefault()).format(new java.util.Date(ts)));
    } catch (e0) {}
    return String(ts);
  }

  function displayName23(record) {
    var path = String(record && (record.publicPath || record.internalPath) || "");
    try { return String(new java.io.File(path).getName() || "截图"); } catch (e0) {}
    return "截图";
  }

  function recycle23(bitmap) {
    try { if (bitmap && bitmap.recycle && (!bitmap.isRecycled || bitmap.isRecycled() !== true)) bitmap.recycle(); } catch (e0) {}
  }

  function close23(stream) {
    try { if (stream) stream.close(); } catch (e0) {}
  }

  function sample23(width, height, maxEdge) {
    var sample = 1;
    var limit = Math.max(64, Number(maxEdge || 360));
    while (Math.max(width / sample, height / sample) > limit) sample *= 2;
    return sample;
  }

  function decodeThumbnail23(record, maxEdge) {
    var opts = new android.graphics.BitmapFactory.Options();
    opts.inJustDecodeBounds = true;
    var input = null;
    try {
      if (String(record.kind || "") === "saved" && record.contentUri) {
        input = context.getContentResolver().openInputStream(android.net.Uri.parse(String(record.contentUri)));
        android.graphics.BitmapFactory.decodeStream(input, null, opts);
      } else {
        var path = String(record.kind === "saved" ? record.publicPath : record.internalPath);
        android.graphics.BitmapFactory.decodeFile(path, opts);
      }
    } finally { close23(input); }
    if (opts.outWidth <= 0 || opts.outHeight <= 0) return null;
    var actual = new android.graphics.BitmapFactory.Options();
    actual.inSampleSize = sample23(opts.outWidth, opts.outHeight, maxEdge);
    actual.inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888;
    if (String(record.kind || "") === "saved" && record.contentUri) {
      try {
        input = context.getContentResolver().openInputStream(android.net.Uri.parse(String(record.contentUri)));
        return android.graphics.BitmapFactory.decodeStream(input, null, actual);
      } finally { close23(input); }
    }
    return android.graphics.BitmapFactory.decodeFile(String(record.kind === "saved" ? record.publicPath : record.internalPath), actual);
  }

  function textButton23(appObj, label, color, onClick) {
    var view = new android.widget.TextView(context);
    view.setText(String(label || ""));
    view.setGravity(android.view.Gravity.CENTER);
    view.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    view.setTypeface(null, android.graphics.Typeface.BOLD);
    safeText23(view, color);
    view.setMinHeight(dp23(appObj, 44));
    view.setPadding(dp23(appObj, 10), 0, dp23(appObj, 10), 0);
    try { view.setBackground(round23(appObj, 0x00000000, color, 12)); } catch (eBg) {}
    view.setOnClickListener(new android.view.View.OnClickListener({ onClick: function() {
      try { onClick(); } catch (e0) { try { safeLog(appObj.L, "w", "screenshot manager action fail " + String(e0)); } catch (e1) {} }
    }}));
    return view;
  }

  FloatBallAppWM.prototype.buildScreenshotManagerPanelView = function() {
    var self = this;
    var service = this.getPickwordImageService ? this.getPickwordImageService() : null;
    if (!service) throw new Error("截图服务未加载：th_22_image_viewer.js");
    if (!this.state) this.state = {};
    var tab = String(this.state.screenshotManagerTab || "internal");
    if (tab !== "saved") tab = "internal";
    this.state.screenshotManagerTab = tab;
    var colors = colors23(this);
    var handler = new android.os.Handler(android.os.Looper.getMainLooper());
    var listExecutor = java.util.concurrent.Executors.newSingleThreadExecutor();
    var thumbExecutor = java.util.concurrent.Executors.newFixedThreadPool(2);
    var actionExecutor = java.util.concurrent.Executors.newSingleThreadExecutor();
    var generation = Number(this.state.screenshotManagerGeneration || 0) + 1;
    if (generation > 1000000000) generation = 1;
    this.state.screenshotManagerGeneration = generation;
    var detached = false;
    var actionBusy = false;
    var bitmaps = [];
    var activeController = null;
    var activeOverlay = null;

    var root = new android.widget.FrameLayout(context);
    var panel = this.ui.createStyledPanel(this, 12);
    try { panel.setBackground(round23(this, colors.background, colors.outlineVariant, 18)); } catch (ePanel) {}
    root.addView(panel, new android.widget.FrameLayout.LayoutParams(-1, -1));

    var tabs = new android.widget.LinearLayout(context);
    tabs.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    tabs.setGravity(android.view.Gravity.CENTER_VERTICAL);
    tabs.setPadding(0, 0, 0, dp23(this, 8));
    panel.addView(tabs, new android.widget.LinearLayout.LayoutParams(-1, dp23(this, 52)));

    function tabView(label, value) {
      var selected = tab === value;
      var tv = textButton23(self, selected ? ("✓ " + label) : label, selected ? colors.primary : colors.onSurface2, function() {
        if (String(self.state.screenshotManagerTab || "internal") === value) return;
        self.state.screenshotManagerTab = value;
        self.showToolApp("screenshot_manager", false);
      });
      if (selected) {
        try { tv.setBackground(round23(self, colors.surface2, colors.primary, 14)); } catch (eBg) {}
      }
      return tv;
    }

    tabs.addView(tabView("内部截图", "internal"), new android.widget.LinearLayout.LayoutParams(0, dp23(this, 44), 1));
    var savedLp = new android.widget.LinearLayout.LayoutParams(0, dp23(this, 44), 1);
    savedLp.leftMargin = dp23(this, 6);
    tabs.addView(tabView("已保存", "saved"), savedLp);
    var refresh = textButton23(this, "刷新", colors.primary, function() { loadRecords(); });
    var refreshLp = new android.widget.LinearLayout.LayoutParams(dp23(this, 72), dp23(this, 44));
    refreshLp.leftMargin = dp23(this, 6);
    tabs.addView(refresh, refreshLp);

    var status = new android.widget.TextView(context);
    status.setText("正在读取截图…");
    status.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    safeText23(status, colors.onSurface2);
    status.setPadding(dp23(this, 4), 0, dp23(this, 4), dp23(this, 8));
    panel.addView(status, new android.widget.LinearLayout.LayoutParams(-1, -2));

    var scroll = new android.widget.ScrollView(context);
    try { scroll.setVerticalScrollBarEnabled(false); } catch (eScroll) {}
    var list = new android.widget.LinearLayout(context);
    list.setOrientation(android.widget.LinearLayout.VERTICAL);
    list.setPadding(0, 0, 0, dp23(this, 12));
    scroll.addView(list);
    panel.addView(scroll, new android.widget.LinearLayout.LayoutParams(-1, 0, 1));

    function isCurrent(token) {
      return !detached && Number(self.state.screenshotManagerGeneration || 0) === generation && token === generation;
    }

    function post(fn) {
      handler.post(new java.lang.Runnable({ run: function() { if (!detached) fn(); } }));
    }

    function closeImageOverlay(refreshAfter) {
      try { if (activeController) activeController.release("manager_close"); } catch (eRelease) {}
      activeController = null;
      try { if (activeOverlay && activeOverlay.getParent()) activeOverlay.getParent().removeView(activeOverlay); } catch (eRemove) {}
      activeOverlay = null;
      if (refreshAfter) loadRecords();
    }

    function showConfirm(titleText, bodyText, confirmText, strong, onConfirm) {
      if (activeOverlay || detached) return;
      var overlay = new android.widget.FrameLayout(context);
      activeOverlay = overlay;
      try { toolhubSafeSetBackgroundColor(overlay, 0x99000000 | 0); } catch (eBg) {}
      var card = new android.widget.LinearLayout(context);
      card.setOrientation(android.widget.LinearLayout.VERTICAL);
      card.setPadding(dp23(self, 18), dp23(self, 16), dp23(self, 18), dp23(self, 14));
      card.setBackground(round23(self, colors.surface, colors.outlineVariant, 18));
      var title = new android.widget.TextView(context);
      title.setText(String(titleText || "确认操作"));
      title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 17);
      title.setTypeface(null, android.graphics.Typeface.BOLD);
      safeText23(title, strong ? colors.danger : colors.onSurface);
      card.addView(title);
      var body = new android.widget.TextView(context);
      body.setText(String(bodyText || ""));
      body.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
      body.setLineSpacing(dp23(self, 3), 1.0);
      safeText23(body, colors.onSurface2);
      var bodyLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
      bodyLp.topMargin = dp23(self, 10);
      card.addView(body, bodyLp);
      var row = new android.widget.LinearLayout(context);
      row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
      row.setGravity(android.view.Gravity.END);
      var cancel = textButton23(self, "取消", colors.onSurface2, function() { closeImageOverlay(false); });
      row.addView(cancel, new android.widget.LinearLayout.LayoutParams(dp23(self, 88), dp23(self, 46)));
      var confirm = textButton23(self, confirmText || "删除", strong ? colors.danger : colors.primary, function() {
        try { if (overlay.getParent()) overlay.getParent().removeView(overlay); } catch (eRm) {}
        activeOverlay = null;
        onConfirm();
      });
      var confirmLp = new android.widget.LinearLayout.LayoutParams(dp23(self, strong ? 150 : 104), dp23(self, 46));
      confirmLp.leftMargin = dp23(self, 8);
      row.addView(confirm, confirmLp);
      var rowLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
      rowLp.topMargin = dp23(self, 14);
      card.addView(row, rowLp);
      var cardLp = new android.widget.FrameLayout.LayoutParams(Math.min(dp23(self, 420), Math.max(dp23(self, 280), Number(self.state.screen && self.state.screen.w || 720) - dp23(self, 48))), -2, android.view.Gravity.CENTER);
      overlay.addView(card, cardLp);
      root.addView(overlay, new android.widget.FrameLayout.LayoutParams(-1, -1));
    }

    function runAction(label, worker, done) {
      if (actionBusy || detached) return;
      actionBusy = true;
      status.setText(String(label || "正在处理…"));
      actionExecutor.execute(new java.lang.Runnable({ run: function() {
        var result = null;
        var error = null;
        try { result = worker(); } catch (e0) { error = e0; }
        post(function() {
          actionBusy = false;
          if (error) {
            status.setText("操作失败：" + String(error));
            try { self.toast("操作失败"); } catch (eToast) {}
            return;
          }
          try { done(result); } catch (eDone) { status.setText("操作失败：" + String(eDone)); }
        });
      }}));
    }

    function openInternal(record) {
      if (activeOverlay || detached) return;
      try {
        var overlay = new android.widget.FrameLayout(context);
        activeOverlay = overlay;
        activeController = self.createPickwordImageController({
          context: context,
          handler: handler,
          session: {
            internalPath: String(record.internalPath || ""),
            createdAt: Number(record.createdAt || 0),
            source: String(record.source || "screenshot_manager")
          },
          onBack: function() { closeImageOverlay(true); },
          onCloseSession: function() { closeImageOverlay(true); },
          onSaved: function() { status.setText("保存成功"); },
          onShared: function() { status.setText("已打开分享面板"); },
          onDeleted: function() { closeImageOverlay(true); },
          onError: function(stage, error) { status.setText(String(stage || "图片") + "失败：" + String(error || "")); }
        });
        if (!activeController || activeController.hasImage() !== true) throw new Error("截图不可用");
        var full = activeController.createFullView();
        overlay.addView(full, new android.widget.FrameLayout.LayoutParams(-1, -1));
        root.addView(overlay, new android.widget.FrameLayout.LayoutParams(-1, -1));
        activeController.open();
      } catch (e0) {
        closeImageOverlay(false);
        status.setText("无法打开截图：" + String(e0));
      }
    }

    function createCard(record) {
      var card = new android.widget.LinearLayout(context);
      card.setOrientation(android.widget.LinearLayout.VERTICAL);
      card.setPadding(dp23(self, 10), dp23(self, 10), dp23(self, 10), dp23(self, 8));
      card.setBackground(round23(self, colors.surface, colors.outlineVariant, 16));
      var cardLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
      cardLp.setMargins(dp23(self, 2), dp23(self, 4), dp23(self, 2), dp23(self, 4));
      card.setLayoutParams(cardLp);

      var main = new android.widget.LinearLayout(context);
      main.setOrientation(android.widget.LinearLayout.HORIZONTAL);
      main.setGravity(android.view.Gravity.CENTER_VERTICAL);
      var thumbWrap = new android.widget.FrameLayout(context);
      thumbWrap.setBackground(round23(self, colors.surface2, colors.outlineVariant, 12));
      var image = new android.widget.ImageView(context);
      image.setScaleType(android.widget.ImageView.ScaleType.CENTER_INSIDE);
      thumbWrap.addView(image, new android.widget.FrameLayout.LayoutParams(-1, -1));
      var placeholder = new android.widget.TextView(context);
      placeholder.setText(record.available === false ? "不可用" : "载入中");
      placeholder.setGravity(android.view.Gravity.CENTER);
      placeholder.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
      safeText23(placeholder, colors.onSurface2);
      thumbWrap.addView(placeholder, new android.widget.FrameLayout.LayoutParams(-1, -1));
      main.addView(thumbWrap, new android.widget.LinearLayout.LayoutParams(dp23(self, 88), dp23(self, 88)));

      var info = new android.widget.LinearLayout(context);
      info.setOrientation(android.widget.LinearLayout.VERTICAL);
      info.setPadding(dp23(self, 12), 0, 0, 0);
      var name = new android.widget.TextView(context);
      name.setText(displayName23(record));
      name.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
      name.setTypeface(null, android.graphics.Typeface.BOLD);
      name.setSingleLine(true);
      name.setEllipsize(android.text.TextUtils.TruncateAt.END);
      safeText23(name, colors.onSurface);
      info.addView(name);
      var meta = new android.widget.TextView(context);
      var timeValue = record.kind === "saved" ? record.savedAt : record.createdAt;
      var statusText = record.kind === "saved"
        ? (record.available ? "公共副本可用" : "公共副本不可用")
        : (record.savedAt > 0 ? "已保存公共副本" : (record.tracked ? "内部记录" : "未登记文件"));
      meta.setText(formatDate23(timeValue) + "\n" + formatSize23(record.fileSize) + " · " + statusText);
      meta.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      meta.setLineSpacing(dp23(self, 2), 1.0);
      safeText23(meta, colors.onSurface2);
      var metaLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
      metaLp.topMargin = dp23(self, 6);
      info.addView(meta, metaLp);
      main.addView(info, new android.widget.LinearLayout.LayoutParams(0, -2, 1));
      card.addView(main);

      var actions = new android.widget.LinearLayout(context);
      actions.setOrientation(android.widget.LinearLayout.HORIZONTAL);
      actions.setGravity(android.view.Gravity.END);
      actions.setPadding(0, dp23(self, 8), 0, 0);

      function addAction(label, color, fn) {
        var btn = textButton23(self, label, color, fn);
        var lp = new android.widget.LinearLayout.LayoutParams(0, dp23(self, 44), 1);
        lp.leftMargin = dp23(self, 5);
        actions.addView(btn, lp);
      }

      if (record.kind === "internal") {
        addAction("查看", colors.primary, function() { openInternal(record); });
        addAction(record.savedAt > 0 ? "已保存" : "保存", colors.primary, function() {
          if (record.savedAt > 0) { status.setText("该截图已保存到公共目录"); return; }
          runAction("正在保存…", function() { return service.saveInternal(record.internalPath); }, function() { status.setText("保存成功"); loadRecords(); });
        });
        addAction("分享", colors.primary, function() {
          runAction("正在准备分享…", function() { return service.prepareShareInternal(record.internalPath); }, function(result) { service.launchShare(result); status.setText("已打开分享面板"); });
        });
        addAction("删除", colors.danger, function() {
          showConfirm("删除内部截图？", "将删除 ToolHub 内部截图文件。已保存到系统相册的公共副本不会删除。", "删除", false, function() {
            runAction("正在删除内部截图…", function() { return service.deleteInternal(record.internalPath); }, function() { status.setText("内部截图已删除"); loadRecords(); });
          });
        });
      } else {
        addAction("打开", colors.primary, function() {
          runAction("正在打开公共副本…", function() { return service.prepareSavedUri(record.internalPath); }, function(result) { service.launchView(result); status.setText("已交给系统图片查看器"); });
        });
        addAction("分享", colors.primary, function() {
          runAction("正在准备分享…", function() { return service.prepareSavedUri(record.internalPath); }, function(result) { service.launchShare(result); status.setText("已打开分享面板"); });
        });
        addAction("删除公共副本", colors.danger, function() {
          showConfirm("永久删除已保存副本？", "此操作会从系统相册或公共保存目录永久删除该图片，无法撤销。ToolHub 内部截图如仍存在将继续保留。", "永久删除公共副本", true, function() {
            runAction("正在删除公共副本…", function() { return service.deleteSaved(record.internalPath); }, function() { status.setText("公共副本已删除"); loadRecords(); });
          });
        });
      }
      card.addView(actions, new android.widget.LinearLayout.LayoutParams(-1, dp23(self, 52)));

      if (record.available !== false) {
        thumbExecutor.execute(new java.lang.Runnable({ run: function() {
          var bitmap = null;
          try { bitmap = decodeThumbnail23(record, 360); } catch (eDecode) { bitmap = null; }
          var finalBitmap = bitmap;
          post(function() {
            if (detached) { recycle23(finalBitmap); return; }
            if (finalBitmap) {
              bitmaps.push(finalBitmap);
              image.setImageBitmap(finalBitmap);
              placeholder.setVisibility(android.view.View.GONE);
            } else {
              placeholder.setText("预览失败");
            }
          });
        }}));
      }
      return card;
    }

    function loadRecords() {
      if (detached) return;
      generation = Number(self.state.screenshotManagerGeneration || 0) + 1;
      if (generation > 1000000000) generation = 1;
      self.state.screenshotManagerGeneration = generation;
      var token = generation;
      list.removeAllViews();
      for (var bi = 0; bi < bitmaps.length; bi++) recycle23(bitmaps[bi]);
      bitmaps = [];
      status.setText(tab === "saved" ? "正在读取已保存图片…" : "正在扫描内部截图…");
      listExecutor.execute(new java.lang.Runnable({ run: function() {
        var records = [];
        var error = null;
        var stats = null;
        try {
          records = tab === "saved" ? service.listSaved() : service.listInternal();
          stats = service.getStats();
        } catch (e0) { error = e0; }
        post(function() {
          if (!isCurrent(token)) return;
          if (error) { status.setText("读取失败：" + String(error)); return; }
          var suffix = stats ? (" · 记录 " + String(stats.tracked || 0) + " · 已保存 " + String(stats.saved || 0)) : "";
          status.setText((tab === "saved" ? "已保存 " : "内部截图 ") + String(records.length) + " 张" + suffix);
          if (!records.length) {
            var empty = new android.widget.TextView(context);
            empty.setText(tab === "saved" ? "还没有保存到公共目录的截图" : "当前没有内部截图");
            empty.setGravity(android.view.Gravity.CENTER);
            empty.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
            safeText23(empty, colors.onSurface2);
            list.addView(empty, new android.widget.LinearLayout.LayoutParams(-1, dp23(self, 180)));
            return;
          }
          for (var i = 0; i < records.length; i++) list.addView(createCard(records[i]));
        });
      }}));
    }

    root.addOnAttachStateChangeListener(new android.view.View.OnAttachStateChangeListener({
      onViewAttachedToWindow: function(v) {},
      onViewDetachedFromWindow: function(v) {
        detached = true;
        try { if (activeController) activeController.release("manager_detach"); } catch (eController) {}
        activeController = null;
        try { listExecutor.shutdownNow(); } catch (eList) {}
        try { thumbExecutor.shutdownNow(); } catch (eThumb) {}
        try { actionExecutor.shutdownNow(); } catch (eAction) {}
        for (var i = 0; i < bitmaps.length; i++) recycle23(bitmaps[i]);
        bitmaps = [];
      }
    }));

    loadRecords();
    return root;
  };
})();
