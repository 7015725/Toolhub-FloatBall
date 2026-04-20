// @version 1.0.0
FloatBallAppWM.prototype.buildViewerPanelView = function(titleText, bodyText) {
  var self = this;
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var bgColor = isDark ? C.bgDark : C.bgLight;
  var textColor = isDark ? C.textPriDark : C.textPriLight;
  var codeColor = isDark ? C.textSecDark : C.textSecLight;
  var dividerColor = isDark ? C.dividerDark : C.dividerLight;

  var panel = new android.widget.LinearLayout(context);
  panel.setOrientation(android.widget.LinearLayout.VERTICAL);

  // 面板背景
  var bgDr = new android.graphics.drawable.GradientDrawable();
  bgDr.setColor(bgColor);
  bgDr.setCornerRadius(this.dp(16));
  panel.setBackground(bgDr);
  try { panel.setElevation(this.dp(8));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

  panel.setPadding(
    this.dp(16),
    this.dp(16),
    this.dp(16),
    this.dp(16)
  );

  // Header removed to avoid duplication with wrapper
  // var header = new android.widget.LinearLayout(context);
  // ...


  var sep = new android.view.View(context);
  sep.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
    1 // 1px
  ));
  sep.setBackgroundColor(dividerColor);
  panel.addView(sep);

  var scroll = new android.widget.ScrollView(context);
  try { scroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);  } catch(eOS) { safeLog(null, 'e', "catch " + String(eOS)); }
  try { scroll.setVerticalScrollBarEnabled(true);  } catch(eSB) { safeLog(null, 'e', "catch " + String(eSB)); }

  // 给内容加一点边距
  var contentBox = new android.widget.LinearLayout(context);
  contentBox.setOrientation(android.widget.LinearLayout.VERTICAL);
  contentBox.setPadding(0, this.dp(12), 0, this.dp(12));
  scroll.addView(contentBox);

  var tv = new android.widget.TextView(context);
  tv.setText(String(bodyText || ""));
  tv.setTextColor(codeColor);
  tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, Number(this.config.CONTENT_VIEWER_TEXT_SP || 12));
  // 增加行距优化阅读
  try { tv.setLineSpacing(this.dp(4), 1.0);  } catch(eLS) { safeLog(null, 'e', "catch " + String(eLS)); }
  // 使用等宽字体显示代码/日志
  try { tv.setTypeface(android.graphics.Typeface.MONOSPACE);  } catch(eTF) { safeLog(null, 'e', "catch " + String(eTF)); }
  // WindowManager 环境下禁用文本选择，否则长按/选择会因缺少 Token 崩溃
  try { tv.setTextIsSelectable(false);  } catch(eSel) { safeLog(null, 'e', "catch " + String(eSel)); }

  contentBox.addView(tv);

  scroll.setOnTouchListener(new JavaAdapter(android.view.View.OnTouchListener, {
    onTouch: function(v, e) { self.touchActivity(); return false; }
  }));

  var scrollLp = new android.widget.LinearLayout.LayoutParams(
    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
    0
  );
  scrollLp.weight = 1;
  scroll.setLayoutParams(scrollLp);
  panel.addView(scroll);
  return panel;
};

// =======================【面板构建：主面板 / 设置面板】======================
FloatBallAppWM.prototype.buildPanelView = function(panelType) {
  if (panelType === "settings") return this.buildSettingsPanelView();
  if (panelType === "btn_editor") return this.buildButtonEditorPanelView();
  if (panelType === "schema_editor") return this.buildSchemaEditorPanelView();

  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var bgColor = isDark ? C.bgDark : C.bgLight;
  var cardColor = isDark ? C.cardDark : C.cardLight;
  var textColor = isDark ? C.textPriDark : C.textPriLight;

  var panel = new android.widget.LinearLayout(context);
  panel.setOrientation(android.widget.LinearLayout.VERTICAL);

  // 面板背景
  var bgDr = new android.graphics.drawable.GradientDrawable();
  // bgDr.setColor(bgColor);
  bgDr.setColor(this.withAlpha(bgColor, this.config.PANEL_BG_ALPHA));
  bgDr.setCornerRadius(this.dp(16));
  panel.setBackground(bgDr);
  try { panel.setElevation(this.dp(8));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

  var padDp = this.config.PANEL_PADDING_DP;
  panel.setPadding(
    this.dp(padDp),
    this.dp(padDp),
    this.dp(padDp),
    this.dp(padDp)
  );

  var rawBtns = [];
  try { if (this.panels && this.panels[this.currentPanelKey]) rawBtns = this.panels[this.currentPanelKey]; } catch (e0) { rawBtns = []; }

  // # 启用/禁用：按钮页只渲染启用项（enabled !== false）
  // # 说明：按钮管理页仍显示全部；这里只影响主面板显示，不改变按钮顺序与索引存储
  var btns = [];
  try {
    if (rawBtns && rawBtns.length) {
      for (var bi = 0; bi < rawBtns.length; bi++) {
        var bb = rawBtns[bi];
        if (bb && bb.enabled === false) continue;
        btns.push(bb);
      }
    }
  } catch (eF) { btns = rawBtns || []; }

  var cols2 = this.config.PANEL_COLS;
  var rows2 = this.config.PANEL_ROWS;

  var itemPx = this.dp(this.config.PANEL_ITEM_SIZE_DP);
  var gapPx = this.dp(this.config.PANEL_GAP_DP);

  var contentW = cols2 * itemPx + cols2 * 2 * gapPx;

  // 计算内容高度限制
  // 每一行的高度 = itemPx + 2 * gapPx
  var oneRowH = itemPx + gapPx * 2;

  // 实际按钮数量
  var totalBtns = (btns && btns.length) ? btns.length : 0;
  // 最小显示的格子数（填满 rows2）
  var minCells = cols2 * rows2;
  // 最终渲染的格子总数
  var totalCells = totalBtns > minCells ? totalBtns : minCells;
  // 最终行数
  var finalRows = Math.ceil(totalCells / cols2);

  var scrollH = android.widget.LinearLayout.LayoutParams.WRAP_CONTENT;
  if (finalRows > rows2) {
      scrollH = rows2 * oneRowH;
  }

  var scroll = new android.widget.ScrollView(context);
  try { scroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);  } catch(eOS) { safeLog(null, 'e', "catch " + String(eOS)); }
  try { scroll.setVerticalScrollBarEnabled(false);  } catch(eSB) { safeLog(null, 'e', "catch " + String(eSB)); }
  try { scroll.setFillViewport(true);  } catch(eFV) { safeLog(null, 'e', "catch " + String(eFV)); }

  var scrollLp = new android.widget.LinearLayout.LayoutParams(contentW, scrollH);
  scroll.setLayoutParams(scrollLp);

  var self = this;

  scroll.setOnTouchListener(new JavaAdapter(android.view.View.OnTouchListener, {
    onTouch: function(v, e) { self.touchActivity(); return false; }
  }));

  var grid = new android.widget.GridLayout(context);
  grid.setColumnCount(cols2);

  // var totalBtns = (btns && btns.length) ? btns.length : 0;
  // var minCells = cols2 * rows2;
  // var totalCells = totalBtns > minCells ? totalBtns : minCells;

  var rowCount = Math.ceil(totalCells / cols2);
  try { grid.setRowCount(rowCount);  } catch(eRC) { safeLog(null, 'e', "catch " + String(eRC)); }

  grid.setOnTouchListener(new JavaAdapter(android.view.View.OnTouchListener, {
    onTouch: function(v, e) { self.touchActivity(); return false; }
  }));

  var i;
  for (i = 0; i < totalCells; i++) {
    var btnCfg = (btns && i < totalBtns) ? btns[i] : null;

    var cell = new android.widget.LinearLayout(context);
    cell.setOrientation(android.widget.LinearLayout.VERTICAL);
    cell.setGravity(android.view.Gravity.CENTER);

    var lp = new android.widget.GridLayout.LayoutParams();
    lp.width = itemPx;
    lp.height = itemPx;
    lp.setMargins(gapPx, gapPx, gapPx, gapPx);
    cell.setLayoutParams(lp);

    // 单元格背景：如果是有功能的按钮，给个卡片背景；否则透明
    if (btnCfg) {
         cell.setBackground(self.ui.createRoundDrawable(cardColor, self.dp(12)));
         try { cell.setElevation(self.dp(2));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    } else {
         // 空格子占位
    }

    var iv = new android.widget.ImageView(context);
    var dr = this.resolveIconDrawable(btnCfg);
    if (dr) {
        iv.setImageDrawable(dr);
        // 如果图标是白色的（通常是系统图标），且我们在亮色卡片上，可能需要染色
        // 但 resolveIconDrawable 逻辑比较复杂，这里暂时不强制染色，除非用户配置了 TINT
        if (!isDark && btnCfg && !btnCfg.type && !btnCfg.pkg) {
             // 简单的系统图标在亮色模式下可能看不清，染成深色
             try { iv.setColorFilter(C.textPriLight, android.graphics.PorterDuff.Mode.SRC_IN);  } catch(eCF) { safeLog(null, 'e', "catch " + String(eCF)); }
        }
    }

    var ivLp = new android.widget.LinearLayout.LayoutParams(
      this.dp(this.config.PANEL_ICON_SIZE_DP),
      this.dp(this.config.PANEL_ICON_SIZE_DP)
    );
    iv.setLayoutParams(ivLp);
    cell.addView(iv);

    if (this.config.PANEL_LABEL_ENABLED) {
      var tv = new android.widget.TextView(context);
      var title = (btnCfg && btnCfg.title) ? String(btnCfg.title) : "";
      tv.setText(title);
      tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, this.config.PANEL_LABEL_TEXT_SIZE_SP);
      tv.setTextColor(textColor);
      tv.setGravity(android.view.Gravity.CENTER);
      try { tv.setLines(1); tv.setEllipsize(android.text.TextUtils.TruncateAt.END);  } catch(eL) { safeLog(null, 'e', "catch " + String(eL)); }

      var tvLp = new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT, // 宽度填满，方便居中
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
      );
      tvLp.topMargin = this.dp(this.config.PANEL_LABEL_TOP_MARGIN_DP);
      tv.setLayoutParams(tvLp);
      cell.addView(tv);
    }

    if (btnCfg) {
      (function(index, btnObj) {
        cell.setClickable(true);
        // 使用 Ripple 效果增强点击反馈
        var rippleDr = self.ui.createRippleDrawable(cardColor, self.withAlpha(C.primary, 0.2), self.dp(12));
        cell.setBackground(rippleDr);

        cell.setOnClickListener(new android.view.View.OnClickListener({
          onClick: function() {
            self.touchActivity();
            self.hideMainPanel();
            self.execButtonAction(btnObj, index);
          }
        }));
      })(i, btnCfg);
    } else {
      try { iv.setAlpha(0);  } catch(eA0) { safeLog(null, 'e', "catch " + String(eA0)); }
      try { cell.setClickable(false);  } catch(eC0) { safeLog(null, 'e', "catch " + String(eC0)); }
    }

    grid.addView(cell);
  }

  scroll.addView(grid);
  panel.addView(scroll);
  return panel;
};

FloatBallAppWM.prototype.getBestPanelPosition = function(pw, ph, bx, by, ballSize) {
  var mode = String(this.config.PANEL_POS_GRAVITY || "bottom").toLowerCase();
  var gap = this.dp(this.config.BALL_PANEL_GAP_DP);
  var sw = this.state.screen.w;
  var sh = this.state.screen.h;

  var candidates = [];

  function makeCand(type) {
      if (type === "bottom") {
          return {
              x: Math.max(0, Math.min(sw - pw, bx + (ballSize - pw) / 2)),
              y: by + ballSize + gap,
              type: "bottom"
          };
      }
      if (type === "top") {
          return {
              x: Math.max(0, Math.min(sw - pw, bx + (ballSize - pw) / 2)),
              y: by - ph - gap,
              type: "top"
          };
      }
      if (type === "right") {
          return {
              x: bx + ballSize + gap,
              y: by,
              type: "right"
          };
      }
      if (type === "left") {
          return {
              x: bx - pw - gap,
              y: by,
              type: "left"
          };
      }
      return null;
  }

  if (mode === "top") {
      candidates.push(makeCand("top"));
      candidates.push(makeCand("bottom"));
  } else if (mode === "left") {
      candidates.push(makeCand("left"));
      candidates.push(makeCand("right"));
      candidates.push(makeCand("bottom"));
  } else if (mode === "right") {
      candidates.push(makeCand("right"));
      candidates.push(makeCand("left"));
      candidates.push(makeCand("bottom"));
  } else {
      // Default bottom or auto
      candidates.push(makeCand("bottom"));
      candidates.push(makeCand("top"));
      candidates.push(makeCand("right"));
      candidates.push(makeCand("left"));
  }

  var diyY = this.dp(this.config.PANEL_CUSTOM_OFFSET_Y || 0);

  // Find first valid
  for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (c) {
          c.y += diyY;
          if (c.x >= 0 && c.x + pw <= sw && c.y >= 0 && c.y + ph <= sh) {
              return c;
          }
      }
  }

  // Fallback: pick primary and clamp
  var best = candidates[0];
  if (!best) best = { x: 0, y: 0 };
  best.x = Math.max(0, Math.min(sw - pw, best.x));
  best.y = Math.max(0, Math.min(sh - ph, best.y));
  return best;
};

FloatBallAppWM.prototype.computePanelX = function(ballX, panelW) {
  var gapPx = this.dp(this.config.BALL_PANEL_GAP_DP);
  var di = this.getDockInfo();
  var screenW = this.state.screen.w;

  // 1. 优先尝试放在右侧
  var rightX = ballX + di.ballSize + gapPx;
  if (rightX + panelW <= screenW) {
    return rightX;
  }

  // 2. 右侧放不下，尝试放在左侧
  var leftX = ballX - gapPx - panelW;
  if (leftX >= 0) {
    return leftX;
  }

  // 3. 两边都放不下（面板太宽），选择空间大的一侧
  var spaceRight = screenW - (ballX + di.ballSize + gapPx);
  var spaceLeft = ballX - gapPx;

  if (spaceLeft > spaceRight) {
    // 左侧空间大，靠左放（可能会覆盖球或被切断，但优先保证左对齐）
    // 为了防止左边被切断，max(0, leftX)
    return Math.max(0, leftX);
  } else {
    // 右侧空间大
    return Math.min(screenW - panelW, rightX);
  }
};

FloatBallAppWM.prototype.tryAdjustPanelY = function(px, py, pw, ph, bx, by) {
  var gapPx = this.dp(this.config.BALL_PANEL_GAP_DP);
  var di = this.getDockInfo();

  var minY = 0;
  var maxY = this.state.screen.h - ph;

  py = this.clamp(py, minY, maxY);

  if (!this.rectIntersect(px, py, pw, ph, bx, by, di.ballSize, di.ballSize)) return { ok: true, x: px, y: py };

  var pyAbove = by - gapPx - ph;
  if (pyAbove >= minY && pyAbove <= maxY) {
    if (!this.rectIntersect(px, pyAbove, pw, ph, bx, by, di.ballSize, di.ballSize)) return { ok: true, x: px, y: pyAbove };
  }

  var pyBelow = by + di.ballSize + gapPx;
  if (pyBelow >= minY && pyBelow <= maxY) {
    if (!this.rectIntersect(px, pyBelow, pw, ph, bx, by, di.ballSize, di.ballSize)) return { ok: true, x: px, y: pyBelow };
  }

  return { ok: false, x: px, y: py };
};

FloatBallAppWM.prototype.addPanel = function(panel, x, y, which) {
  if (this.state.closing) return;

  // Determine if this panel should be modal (blocking background touches, better for IME)
  var isModal = (which === "settings" || which === "btn_editor" || which === "schema_editor");

  var flags;
  if (isModal) {
    // Modal: blocks outside touches, dim background, ensures focus for IME
    flags = android.view.WindowManager.LayoutParams.FLAG_DIM_BEHIND;
  } else {
    // Non-modal: allow outside touches
    flags = android.view.WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
            android.view.WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH;
    // 主面板(预览)需要获取焦点以支持输入法，同时允许点击外部
    // if (which === "main") {
    //    flags |= android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
    // }
  }

  var lp = new android.view.WindowManager.LayoutParams(
    android.view.WindowManager.LayoutParams.WRAP_CONTENT,
    android.view.WindowManager.LayoutParams.WRAP_CONTENT,
    android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
    flags,
    android.graphics.PixelFormat.TRANSLUCENT
  );

  if (isModal) {
      lp.dimAmount = 0.5;
  }

  // Allow resizing for IME
  lp.softInputMode = android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE | android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE;

  lp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
  lp.x = x;
  lp.y = y;

  try { this.state.wm.addView(panel, lp); } catch (eAdd) { safeLog(this.L, 'e',  "addPanel fail which=" + String(which) + " err=" + String(eAdd)); return; }

  if (which === "main") { this.state.panel = panel; this.state.panelLp = lp; this.state.addedPanel = true; }
  else if (which === "settings") { this.state.settingsPanel = panel; this.state.settingsPanelLp = lp; this.state.addedSettings = true; }
  else { this.state.viewerPanel = panel; this.state.viewerPanelLp = lp; this.state.addedViewer = true; }

  try {
    if (this.config.ENABLE_ANIMATIONS) {
        panel.setScaleX(0.96);
        panel.setScaleY(0.96);
        panel.setAlpha(0);
        panel.animate()
          .scaleX(1)
          .scaleY(1)
          .alpha(1)
          .setDuration(180)
          .setInterpolator(new android.view.animation.AccelerateDecelerateInterpolator())
          .start();
    } else {
        panel.setScaleX(1);
        panel.setScaleY(1);
        panel.setAlpha(1);
    }
   } catch(eA) { safeLog(null, 'e', "catch " + String(eA)); }

  // # 日志防抖：5秒内相同面板类型不重复记录
  var now = Date.now();
  var lastPanelShow = this.state._lastPanelShow || {};
  var lastTime = lastPanelShow[which] || 0;
  if (now - lastTime > 5000) {
    safeLog(this.L, 'i', "panel show which=" + String(which) + " x=" + String(x) + " y=" + String(y));
    lastPanelShow[which] = now;
    this.state._lastPanelShow = lastPanelShow;
  }
};

FloatBallAppWM.prototype.showPanelAvoidBall = function(which) {
  if (this.state.closing) return;

  // 优化：如果是刷新编辑器面板（btn_editor/schema_editor），且面板已存在，则直接更新内容，避免闪烁
  if ((which === "btn_editor" || which === "schema_editor") && this.state.addedViewer && this.state.viewerPanel) {
      try {
          var self = this;
          var type = which;
          var newPanel = self.buildPanelView(type);

          // 限制高度逻辑 (复用下面的逻辑)
          var maxH = Math.floor(self.state.screen.h * 0.75);
          newPanel.measure(
            android.view.View.MeasureSpec.makeMeasureSpec(self.state.screen.w, android.view.View.MeasureSpec.AT_MOST),
            android.view.View.MeasureSpec.makeMeasureSpec(maxH, android.view.View.MeasureSpec.AT_MOST)
          );

          var pw = newPanel.getMeasuredWidth();
          var ph = newPanel.getMeasuredHeight();
          var finalPh = (ph > maxH) ? maxH : ph;

          // 更新现有面板内容 (Draggable Container 结构)
          var oldRoot = this.state.viewerPanel;
          // 查找内容容器：Root(FrameLayout) -> Container(LinearLayout) -> Content(Last Child)
          // 结构：Root -> [Container] -> [Header, Content]
          // 为了通用性，我们约定 Content 是 Container 的最后一个子 View

          // 检查是否是 Draggable 结构
          var container = null;
          if (oldRoot.getChildCount() > 0 && oldRoot.getChildAt(0) instanceof android.widget.LinearLayout) {
               container = oldRoot.getChildAt(0);
          }

          if (container && container.getChildCount() >= 2) {
               // 假设最后一个是 Content
               var oldContent = container.getChildAt(container.getChildCount() - 1);
               container.removeView(oldContent);

               // 准备新内容
               // newPanel 本身就是内容
               // 需要处理 newPanel 的 LayoutParams
               var contentLp = new android.widget.LinearLayout.LayoutParams(-1, 0);
               contentLp.weight = 1;
               try { newPanel.setBackground(null);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); } // 移除背景，使用 Container 背景
               try { newPanel.setElevation(0);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
               newPanel.setLayoutParams(contentLp);

               container.addView(newPanel);

               // 更新 Window LayoutParams (仅高度和位置)
               var lp = this.state.viewerPanelLp;
               if (lp) {
                   // 高度调整：如果是 wrap_content，需要重新计算；如果用户调整过大小(explicit)，则保持不变？
                   // 这里为了简单，如果是刷新，我们保持当前的 LayoutParams 尺寸，除非内容变大？
                   // 暂时策略：保持当前窗口大小，或者自适应
                   // 如果是编辑器，通常希望保持大小
                   // 所以这里不更新 lp.height 和 lp.width，只更新内容
               }
          } else {
               // 非 Draggable 结构（回退）
               // ... (原有逻辑)
          }

          self.touchActivity();
          return; // 刷新完成，直接返回
      } catch(e) {
          if (self.L) self.L.e("Refresh panel failed, fallback to recreate: " + String(e));
          // 如果失败，继续执行下面的销毁重建逻辑
      }
  }

  if (which === "main" && this.state.addedPanel) return;
  if (which === "settings" && this.state.addedSettings) return;

  this.touchActivity();

  if (which === "main") { this.hideSettingsPanel(); this.hideViewerPanel(); }
  if (which === "settings") { this.hideMainPanel(); this.hideViewerPanel(); }
  if (which === "btn_editor" || which === "schema_editor") { this.hideMainPanel(); this.hideSettingsPanel(); this.hideViewerPanel(); }

  var self = this;

  var doShow = function() {
    try {
      if (self.state.closing) return;

      self.showMask();

      var type = which;
      var rawPanel = self.buildPanelView(type);

      // 决定是否启用拖拽/缩放 (排除 main)
      var enableDrag = (which !== "main");
      var panelView = rawPanel;
      var dragHeader = null;
      var resizeHandles = null;

      if (enableDrag) {
          // 获取标题
          var titleMap = {
              "settings": "设置",
              "btn_editor": "按钮管理",
              "schema_editor": "布局管理"
          };
          var title = titleMap[which] || "面板";

          // 动态标题 for btn_editor
          if (which === "btn_editor") {
             if (self.state.editingButtonIndex !== null && self.state.editingButtonIndex !== undefined) {
                 title = (self.state.editingButtonIndex === -1) ? "新增按钮" : "编辑按钮";
             } else {
                 title = "按钮管理";
             }
          }

          var wrapped = self.wrapDraggablePanel(rawPanel, title, function() {
              if (which === "settings") self.hideSettingsPanel();
              else if (which === "main") self.hideMainPanel();
              else self.hideViewerPanel();
          });
          panelView = wrapped.view;
          dragHeader = wrapped.header;
          resizeHandles = wrapped.handles;
      }

      // # 限制面板最大高度
      var maxH = Math.floor(self.state.screen.h * 0.75);
      panelView.measure(
        android.view.View.MeasureSpec.makeMeasureSpec(self.state.screen.w, android.view.View.MeasureSpec.AT_MOST),
        android.view.View.MeasureSpec.makeMeasureSpec(maxH, android.view.View.MeasureSpec.AT_MOST)
      );

      var pw = panelView.getMeasuredWidth();
      var ph = panelView.getMeasuredHeight();

      // Load saved state
      var savedState = null;
      if (enableDrag && self.loadPanelState) {
          savedState = self.loadPanelState(which);
      }

      if (savedState && savedState.w && savedState.h) {
          pw = savedState.w;
          ph = savedState.h;
      } else {
           // 显式设置面板高度
          if (ph > maxH) {
              ph = maxH;
          }
      }

      var safeLp = panelView.getLayoutParams();
      if (!safeLp) safeLp = new android.view.ViewGroup.LayoutParams(pw, ph);
      else { safeLp.width = pw; safeLp.height = ph; }
      panelView.setLayoutParams(safeLp);

      var bx = self.state.ballLp.x;
      var by = self.state.ballLp.y;
      var di = self.getDockInfo();

      // 位置计算
      var pos = self.getBestPanelPosition(pw, ph, bx, by, di.ballSize);

      if (savedState && typeof savedState.x === 'number' && typeof savedState.y === 'number') {
          pos.x = savedState.x;
          pos.y = savedState.y;
      }

      self.addPanel(panelView, pos.x, pos.y, which);

      // 绑定拖拽事件
      if (enableDrag) {
          self.attachDragResizeListeners(panelView, dragHeader, resizeHandles, which);
      }

      self.touchActivity();
    } catch (e) {
      if (self.L) self.L.e("showPanelAvoidBall callback err=" + String(e));
      try { self.toast("面板显示失败: " + String(e));  } catch(et) { safeLog(null, 'e', "catch " + String(et)); }
    }
  };

  if (which === "settings") {
      doShow();
  } else {
      this.undockToFull(true, doShow);
  }
};

// =======================【辅助：包装可拖拽面板】======================
FloatBallAppWM.prototype.wrapDraggablePanel = function(contentView, optionsOrTitle, onClose) {
    var self = this;
    // var context = this.context; // Remove this line to use global context
    var isDark = this.isDarkTheme();
    var C = this.ui.colors;

    var title = "";
    var hideHeader = false;

    if (typeof optionsOrTitle === "string") {
        title = optionsOrTitle;
    } else if (optionsOrTitle && typeof optionsOrTitle === "object") {
        title = optionsOrTitle.title || "";
        hideHeader = !!optionsOrTitle.hideHeader;
    }

    // Root FrameLayout (to hold content + resize handle)
    var root = new android.widget.FrameLayout(context);

    // Main Container (Header + Content)
    var container = new android.widget.LinearLayout(context);
    container.setOrientation(android.widget.LinearLayout.VERTICAL);

    // 背景设置在 Container 上
    var bgDr = new android.graphics.drawable.GradientDrawable();
    bgDr.setColor(isDark ? C.bgDark : C.bgLight);
    bgDr.setCornerRadius(this.dp(12));
    container.setBackground(bgDr);
    try { container.setElevation(this.dp(8));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

    // Header
    var header = new android.widget.LinearLayout(context);
    header.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    header.setGravity(android.view.Gravity.CENTER_VERTICAL);
    header.setPadding(this.dp(12), this.dp(8), this.dp(8), this.dp(8));
    // 给 Header 一个背景色，区分度更好
    // header.setBackgroundColor(isDark ? 0x22FFFFFF : 0x11000000);

    var titleTv = new android.widget.TextView(context);
    titleTv.setText(String(title || "Panel"));
    titleTv.setTextColor(isDark ? C.textPriDark : C.textPriLight);
    titleTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    titleTv.setTypeface(null, android.graphics.Typeface.BOLD);
    var titleLp = new android.widget.LinearLayout.LayoutParams(0, -2);
    titleLp.weight = 1;
    titleTv.setLayoutParams(titleLp);
    header.addView(titleTv);

    // Close Button
    var btnClose = this.ui.createFlatButton(this, "✕", C.textSecLight, function() {
        if (onClose) onClose();
        else self.hideAllPanels();
    });
    btnClose.setPadding(self.dp(8), self.dp(4), self.dp(8), self.dp(4));
    try { btnClose.setElevation(this.dp(25));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); } // Ensure on top of resize handles
    header.addView(btnClose);

    // Spacer to avoid overlap with Top-Right resize handle
    var spacer = new android.view.View(context);
    spacer.setLayoutParams(new android.widget.LinearLayout.LayoutParams(this.dp(30), 1));
    header.addView(spacer);

    container.addView(header);

    if (hideHeader) {
        header.setVisibility(android.view.View.GONE);
    }

    // Add Content
    // 移除 content 原有的背景和 elevation，避免重复
    try { contentView.setBackground(null);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    try { contentView.setElevation(0);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

    var contentLp = new android.widget.LinearLayout.LayoutParams(-1, 0);
    contentLp.weight = 1;
    contentView.setLayoutParams(contentLp);
    container.addView(contentView);

    // Container fill root
    root.addView(container, new android.widget.FrameLayout.LayoutParams(-1, -1));

    // Resize Handle (Bottom-Right Corner) - Invisible
    var handleBR = new android.view.View(context);
    try { handleBR.setElevation(this.dp(20));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    var handleBRLp = new android.widget.FrameLayout.LayoutParams(this.dp(30), this.dp(30));
    handleBRLp.gravity = android.view.Gravity.BOTTOM | android.view.Gravity.END;
    handleBRLp.rightMargin = 0;
    handleBRLp.bottomMargin = 0;
    root.addView(handleBR, handleBRLp);

    // Resize Handle (Bottom-Left Corner) - Invisible
    var handleBL = new android.view.View(context);
    try { handleBL.setElevation(this.dp(20));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    var handleBLLp = new android.widget.FrameLayout.LayoutParams(this.dp(30), this.dp(30));
    handleBLLp.gravity = android.view.Gravity.BOTTOM | android.view.Gravity.START;
    handleBLLp.bottomMargin = 0;
    handleBLLp.leftMargin = 0;
    root.addView(handleBL, handleBLLp);

    // Resize Handle (Top-Left Corner) - Invisible
    var handleTL = new android.view.View(context);
    try { handleTL.setElevation(this.dp(20));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    var handleTLLp = new android.widget.FrameLayout.LayoutParams(this.dp(30), this.dp(30));
    handleTLLp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
    handleTLLp.topMargin = 0;
    handleTLLp.leftMargin = 0;
    root.addView(handleTL, handleTLLp);

    // Resize Handle (Top-Right Corner) - Invisible
    var handleTR = new android.view.View(context);
    try { handleTR.setElevation(this.dp(20));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    var handleTRLp = new android.widget.FrameLayout.LayoutParams(this.dp(30), this.dp(30));
    handleTRLp.gravity = android.view.Gravity.TOP | android.view.Gravity.END;
    handleTRLp.topMargin = 0;
    handleTRLp.rightMargin = 0;
    root.addView(handleTR, handleTRLp);

    return {
        view: root,
        header: header,
        handles: {
            br: handleBR,
            bl: handleBL,
            tl: handleTL,
            tr: handleTR
        }
    };
};

// =======================【辅助：绑定拖拽/缩放事件】======================
FloatBallAppWM.prototype.attachDragResizeListeners = function(rootView, headerView, resizeHandles, panelKey) {
    var self = this;
    var wm = this.state.wm;

    // Helper to get LP safely (must be called after addView)
    var getLp = function() {
        return rootView.getLayoutParams();
    };

    // Helper to save state
    var saveState = function() {
        if (panelKey && self.savePanelState) {
            var lp = getLp();
            if (lp) {
                self.savePanelState(panelKey, {
                    x: lp.x,
                    y: lp.y,
                    w: rootView.getWidth(),
                    h: rootView.getHeight()
                });
            }
        }
    };

    // Drag Logic
    if (headerView) {
        var lastX = 0, lastY = 0;
        var initialX = 0, initialY = 0;
        var dragging = false;

        headerView.setOnTouchListener(new android.view.View.OnTouchListener({
            onTouch: function(v, e) {
                var action = e.getAction();
                var rawX = e.getRawX();
                var rawY = e.getRawY();

                if (action === android.view.MotionEvent.ACTION_DOWN) {
                    self.touchActivity();
                    lastX = rawX;
                    lastY = rawY;
                    var lp = getLp();
                    if (lp) {
                        initialX = lp.x;
                        initialY = lp.y;
                        dragging = false;
                        return true;
                    }
                } else if (action === android.view.MotionEvent.ACTION_MOVE) {
                    self.touchActivity();
                    var dx = rawX - lastX;
                    var dy = rawY - lastY;
                    if (!dragging && (Math.abs(dx) > self.dp(5) || Math.abs(dy) > self.dp(5))) {
                        dragging = true;
                    }
                    if (dragging) {
                        var lp = getLp();
                        if (lp) {
                            var targetX = Math.round(initialX + dx);
                            var targetY = Math.round(initialY + dy);

                            // 边界限制：防止完全拖出屏幕
                            // 至少保留 30dp 在屏幕内
                            var safeMargin = self.dp(30);
                            var screenW = self.state.screen.w;
                            var screenH = self.state.screen.h;
                            var curW = rootView.getWidth();

                            // X轴：左边缘不小于 -width + safeMargin, 右边缘不大于 screenW - safeMargin
                            targetX = Math.max(-curW + safeMargin, Math.min(targetX, screenW - safeMargin));
                            // Y轴：顶部不小于 0, 底部不大于 screenH - safeMargin
                            targetY = Math.max(0, Math.min(targetY, screenH - safeMargin));

                            lp.x = targetX;
                            lp.y = targetY;
                            try { wm.updateViewLayout(rootView, lp);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
                        }
                    }
                    return true;
                } else if (action === android.view.MotionEvent.ACTION_UP) {
                    self.touchActivity();
                    if (dragging) {
                        saveState();
                    }
                    dragging = false;
                    return true;
                }
                return false;
            }
        }));
    }

    // Resize Logic
    if (resizeHandles) {
        var handles = {};
        // Compatibility: if resizeHandles is a View, treat as 'br'
        if (resizeHandles instanceof android.view.View) {
            handles.br = resizeHandles;
        } else {
            handles = resizeHandles;
        }

        var setupResize = function(mode, handleView) {
            var lastRX = 0, lastRY = 0;
            var initialW = 0, initialH = 0;
            var initialX = 0, initialY = 0;
            var resizing = false;

            // Long Press Logic
            var longPressRunnable = null;
            var longPressTriggered = false;

            handleView.setOnTouchListener(new android.view.View.OnTouchListener({
                onTouch: function(v, e) {
                    var action = e.getAction();
                    var rawX = e.getRawX();
                    var rawY = e.getRawY();

                    if (action === android.view.MotionEvent.ACTION_DOWN) {
                        self.touchActivity();
                        lastRX = rawX;
                        lastRY = rawY;
                        var lp = getLp();
                        if (lp) {
                            initialW = rootView.getWidth();
                            initialH = rootView.getHeight();
                            initialX = lp.x;
                            initialY = lp.y;

                            resizing = false;
                            longPressTriggered = false;

                            // Start Long Press Timer
                            longPressRunnable = new java.lang.Runnable({
                                run: function() {
                                    try {
                                        longPressTriggered = true;
                                        self.vibrateOnce(40); // Haptic feedback

                                        // Switch to fixed size immediately
                                        var lpCur = getLp();
                                        if (lpCur) {
                                            lpCur.width = initialW;
                                            lpCur.height = initialH;
                                            lpCur.x = initialX;
                                            lpCur.y = initialY;
                                            try { wm.updateViewLayout(rootView, lpCur);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
                                        }
                                        resizing = true;
                                     } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
                                }
                            });
                            self.state.h.postDelayed(longPressRunnable, 300); // 300ms hold to activate resize

                            return true;
                        }
                    } else if (action === android.view.MotionEvent.ACTION_MOVE) {
                        self.touchActivity();
                        var dx = rawX - lastRX;
                        var dy = rawY - lastRY;

                        if (!longPressTriggered) {
                            // If moved significantly before long press triggers, cancel it
                            // Increased tolerance to 16dp to avoid accidental cancellation
                            if (Math.abs(dx) > self.dp(16) || Math.abs(dy) > self.dp(16)) {
                                if (longPressRunnable) {
                                    self.state.h.removeCallbacks(longPressRunnable);
                                    longPressRunnable = null;
                                }
                            }
                        }

                        if (resizing) {
                            var lp = getLp();
                            if (lp) {
                                var newW = initialW;
                                var newH = initialH;
                                var newX = initialX;
                                var newY = initialY;

                                // 1. Calculate raw new dimensions
                                if (mode === 'br') {
                                    newW = initialW + dx;
                                    newH = initialH + dy;
                                } else if (mode === 'r') {
                                    newW = initialW + dx;
                                } else if (mode === 'b') {
                                    newH = initialH + dy;
                                } else if (mode === 'bl') {
                                    newW = initialW - dx;
                                    newH = initialH + dy;
                                } else if (mode === 'tl') {
                                    newW = initialW - dx;
                                    newH = initialH - dy;
                                } else if (mode === 'tr') {
                                    newW = initialW + dx;
                                    newH = initialH - dy;
                                }

                                // 2. Constrain new dimensions
                                var screenW = self.state.screen.w;
                                var screenH = self.state.screen.h;
                                var constrainedW = Math.max(self.dp(200), Math.min(newW, screenW));
                                var constrainedH = Math.max(self.dp(150), Math.min(newH, screenH));

                                // 3. Calculate new position based on CONSTRAINED dimensions change
                                // If dragging left edge (bl, tl), X must shift by the amount WIDTH changed (constrained)
                                if (mode === 'bl' || mode === 'tl') {
                                    // newX = initialX - (change in width)
                                    // change in width = constrainedW - initialW
                                    newX = initialX - (constrainedW - initialW);
                                }

                                // If dragging top edge (tl, tr), Y must shift by the amount HEIGHT changed (constrained)
                                if (mode === 'tl' || mode === 'tr') {
                                    // newY = initialY - (change in height)
                                    // change in height = constrainedH - initialH
                                    newY = initialY - (constrainedH - initialH);
                                }

                                lp.width = Math.round(constrainedW);
                                lp.height = Math.round(constrainedH);

                                if (mode === 'bl' || mode === 'tl') {
                                    lp.x = Math.round(newX);
                                }
                                if (mode === 'tl' || mode === 'tr') {
                                    lp.y = Math.round(newY);
                                }

                                try { wm.updateViewLayout(rootView, lp);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
                            }
                        }
                        return true;
                    } else if (action === android.view.MotionEvent.ACTION_UP || action === android.view.MotionEvent.ACTION_CANCEL) {
                        self.touchActivity();

                        if (longPressRunnable) {
                            self.state.h.removeCallbacks(longPressRunnable);
                            longPressRunnable = null;
                        }

                        if (resizing) {
                            saveState();
                        }
                        resizing = false;
                        longPressTriggered = false;
                        return true;
                    }
                    return false;
                }
            }));
        };

        if (handles.br) setupResize('br', handles.br);
        if (handles.bl) setupResize('bl', handles.bl);
        if (handles.tl) setupResize('tl', handles.tl);
        if (handles.tr) setupResize('tr', handles.tr);
    }
};

// =======================【查看器面板：显示】======================
FloatBallAppWM.prototype.showViewerPanel = function(title, text) {
  if (this.state.closing) return;
  this.touchActivity();

  if (this.state.addedViewer) this.hideViewerPanel();
  this.hideMainPanel();
  this.hideSettingsPanel();

  var self = this;

  this.undockToFull(true, function() {
    if (self.state.closing) return;

    self.showMask();

    var rawPanel = self.buildViewerPanelView(title, text);

    // 使用 Draggable Wrapper
    var wrapped = self.wrapDraggablePanel(rawPanel, title || "Viewer", function() {
        self.hideViewerPanel();
    });

    var panelView = wrapped.view;

    panelView.measure(
      android.view.View.MeasureSpec.makeMeasureSpec(0, android.view.View.MeasureSpec.UNSPECIFIED),
      android.view.View.MeasureSpec.makeMeasureSpec(0, android.view.View.MeasureSpec.UNSPECIFIED)
    );

    var pw = panelView.getMeasuredWidth();
    var ph = panelView.getMeasuredHeight();

    // 限制初始大小
    var maxW = Math.floor(self.state.screen.w * 0.9);
    var maxH = Math.floor(self.state.screen.h * 0.7);
    if (pw > maxW) pw = maxW;
    if (ph > maxH) ph = maxH;

    // Load saved state
    var savedState = null;
    if (self.loadPanelState) {
        savedState = self.loadPanelState("viewer");
    }
    if (savedState && savedState.w && savedState.h) {
        pw = savedState.w;
        ph = savedState.h;
    }

    // 设置 LayoutParams 尺寸 (如果是 wrap_content 可能会超)
    var safeLp = new android.view.ViewGroup.LayoutParams(pw, ph);
    panelView.setLayoutParams(safeLp);

    var bx = self.state.ballLp.x;
    var by = self.state.ballLp.y;

    var finalX, finalY;

    if (savedState && typeof savedState.x === 'number' && typeof savedState.y === 'number') {
        finalX = savedState.x;
        finalY = savedState.y;
    } else {
        var px = self.computePanelX(bx, pw);
        var py = by;

        var r = self.tryAdjustPanelY(px, py, pw, ph, bx, by);
        if (r.ok) {
            finalX = r.x;
            finalY = r.y;
        } else {
            finalX = px;
            finalY = self.clamp(py, 0, self.state.screen.h - ph);
        }
    }

    self.addPanel(panelView, finalX, finalY, "viewer");

    // 绑定事件
    self.attachDragResizeListeners(panelView, wrapped.header, wrapped.handles, "viewer");

    self.touchActivity();
  });
};

FloatBallAppWM.prototype.cancelLongPressTimer = function() {
  try { if (this.state.longPressRunnable && this.state.h) this.state.h.removeCallbacks(this.state.longPressRunnable);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
  this.state.longPressArmed = false;
  this.state.longPressRunnable = null;
};
FloatBallAppWM.prototype.resetLongPressState = function() {
  this.state.longPressArmed = false;
  this.state.longPressTriggered = false;
  this.state.longPressRunnable = null;
};

FloatBallAppWM.prototype.armLongPress = function() {
  if (!this.config.ENABLE_LONG_PRESS) return;

  this.resetLongPressState();
  this.state.longPressArmed = true;

  var self = this;

  var r = new java.lang.Runnable({
    run: function() {
      try {
        if (self.state.closing) return;
        if (!self.state.longPressArmed) return;
        if (self.state.dragging) return;

        self.state.longPressTriggered = true;
        self.vibrateOnce(self.config.LONG_PRESS_VIBRATE_MS);

        if (self.state.addedSettings) self.hideSettingsPanel();
        else self.showPanelAvoidBall("settings");

        if (self.L) self.L.i("longPress -> settings");
      } catch (e) {
        if (self.L) self.L.e("longPress run err=" + String(e));
      }
    }
  });

  this.state.longPressRunnable = r;
  this.state.h.postDelayed(r, this.config.LONG_PRESS_MS);
};

FloatBallAppWM.prototype.setupTouchListener = function() {
  var slop = this.dp(this.config.CLICK_SLOP_DP);
  var self = this;

  // 速度追踪
  var velocityTracker = null;
  var lastTouchX = 0;
  var lastTouchY = 0;

  // 限制 WM 更新频率，避免过热/卡顿
  var lastUpdateTs = 0;

  return new JavaAdapter(android.view.View.OnTouchListener, {
    onTouch: function(v, e) {
      if (self.state.closing) return false;

      var a = e.getAction();
      var di = self.getDockInfo();

      if (velocityTracker == null) {
          velocityTracker = android.view.VelocityTracker.obtain();
      }
      velocityTracker.addMovement(e);

      if (a === android.view.MotionEvent.ACTION_DOWN) {
        self.touchActivity();

        // 恢复不透明度
        try { v.setAlpha(1.0);  } catch(eA) { safeLog(null, 'e', "catch " + String(eA)); }

        if (self.state.docked) {
          self.undockToFull(false, null);
          self.touchActivity();
        }

        self.state.rawX = e.getRawX();
        self.state.rawY = e.getRawY();
        self.state.downX = self.state.ballLp.x;
        self.state.downY = self.state.ballLp.y;
        self.state.dragging = false;

        lastTouchX = e.getRawX();
        lastTouchY = e.getRawY();

        try { v.setPressed(true);  } catch(eP) { safeLog(null, 'e', "catch " + String(eP)); }
        try { v.drawableHotspotChanged(e.getX(), e.getY());  } catch(eH) { safeLog(null, 'e', "catch " + String(eH)); }

        // 按下缩小反馈
        if (self.config.ENABLE_ANIMATIONS) {
            try {
                v.animate().scaleX(0.9).scaleY(0.9).setDuration(100).start();
             } catch(eS) { safeLog(null, 'e', "catch " + String(eS)); }
        }

        self.armLongPress();
        // # 日志精简：touch DOWN 只在 DEBUG 且非频繁触发时记录
        // if (self.L) self.L.d("touch DOWN rawX=" + String(self.state.rawX) + " rawY=" + String(self.state.rawY));
        return true;
      }

      if (a === android.view.MotionEvent.ACTION_MOVE) {
        self.touchActivity();

        var curRawX = e.getRawX();
        var curRawY = e.getRawY();
        var dx = Math.round(curRawX - self.state.rawX);
        var dy = Math.round(curRawY - self.state.rawY);

        lastTouchX = curRawX;
        lastTouchY = curRawY;

        if (!self.state.dragging) {
          if (Math.abs(dx) > slop || Math.abs(dy) > slop) {
            self.state.dragging = true;
            self.cancelLongPressTimer();
            // # 日志精简：drag start 只在 DEBUG 时记录
            // if (self.L) self.L.d("drag start dx=" + String(dx) + " dy=" + String(dy));
          }
        }

        if (self.state.dragging) {
          self.state.ballLp.x = self.state.downX + dx;
          self.state.ballLp.y = self.state.downY + dy;

          self.state.ballLp.x = self.clamp(self.state.ballLp.x, 0, self.state.screen.w - di.ballSize);
          self.state.ballLp.y = self.clamp(self.state.ballLp.y, 0, self.state.screen.h - di.ballSize);

          self.state.ballLp.width = di.ballSize;
          try { self.state.ballContent.setX(0);  } catch(e0) { safeLog(null, 'e', "catch " + String(e0)); }

          var now = java.lang.System.currentTimeMillis();
          if (now - lastUpdateTs > 10) { // 10ms 节流
             try { self.state.wm.updateViewLayout(self.state.ballRoot, self.state.ballLp);  } catch(eU) { safeLog(null, 'e', "catch " + String(eU)); }
             lastUpdateTs = now;
          }

          self.hideAllPanels();
          // 拖拽中不频繁保存位置，只在 UP 时保存
        }

        return true;
      }

      if (a === android.view.MotionEvent.ACTION_UP || a === android.view.MotionEvent.ACTION_CANCEL) {
        self.touchActivity();

        try { v.setPressed(false);  } catch(eP2) { safeLog(null, 'e', "catch " + String(eP2)); }
        self.cancelLongPressTimer();

        // 恢复缩放
        if (self.config.ENABLE_ANIMATIONS) {
            try {
                v.animate().scaleX(1.0).scaleY(1.0).setDuration(150).start();
             } catch(eS) { safeLog(null, 'e', "catch " + String(eS)); }
        } else {
             try { v.setScaleX(1); v.setScaleY(1);  } catch(eS) { safeLog(null, 'e', "catch " + String(eS)); }
        }

        if (self.state.longPressTriggered) {
            self.resetLongPressState();
            if (velocityTracker) { velocityTracker.recycle(); velocityTracker = null; }
            return true;
        }

        if (!self.state.dragging && a === android.view.MotionEvent.ACTION_UP) {
          try { self.playBounce(v);  } catch(eB) { safeLog(null, 'e', "catch " + String(eB)); }

          if (self.state.addedPanel) self.hideMainPanel();
          else self.showPanelAvoidBall("main");

          // # 日志精简：click 事件记录为 INFO 级别（关键操作）
          if (self.L) self.L.i("click -> toggle main");
        } else {
          // 拖拽结束
          // 确保最后位置被更新
          try { self.state.wm.updateViewLayout(self.state.ballRoot, self.state.ballLp);  } catch(eU) { safeLog(null, 'e', "catch " + String(eU)); }

          var forceSide = null;
          // 计算速度
          if (velocityTracker) {
              velocityTracker.computeCurrentVelocity(1000);
              var vx = velocityTracker.getXVelocity();
              // 简单的 fling 判定
              if (vx > 1000) forceSide = "right";
              else if (vx < -1000) forceSide = "left";

          // # 日志精简：drag end 只在 DEBUG 时记录
              // if (self.L) self.L.d("drag end vx=" + vx);
          }

          if (self.config.ENABLE_SNAP_TO_EDGE) {
              // 立即吸附，带动画，支持 fling 方向
              self.snapToEdgeDocked(true, forceSide);
          } else {
              self.savePos(self.state.ballLp.x, self.state.ballLp.y);
          }
        }

        if (velocityTracker) {
            velocityTracker.recycle();
            velocityTracker = null;
        }

        self.state.dragging = false;
        self.touchActivity();
        self.resetLongPressState();
        return true;
      }

      return false;
    }
  });
};

FloatBallAppWM.prototype.createBallViews = function() {
  var di = this.getDockInfo();

  var root = new android.widget.FrameLayout(context);
  root.setClipToPadding(true);
  root.setClipChildren(true);
  try { root.setElevation(this.dp(6));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

  var content = new android.widget.FrameLayout(context);
  var lp = new android.widget.FrameLayout.LayoutParams(di.ballSize, di.ballSize);
  content.setLayoutParams(lp);
// # 悬浮球内部内容（图标/文字）
try {
  var iconResId = Number(this.config.BALL_ICON_RES_ID || 0);
  var iconType = this.config.BALL_ICON_TYPE ? String(this.config.BALL_ICON_TYPE) : "android";
  var iconFilePath = (this.config.BALL_ICON_FILE_PATH == null) ? "" : String(this.config.BALL_ICON_FILE_PATH);

  // # 是否显示图标：file 只看路径；app 优先看包名，其次可回退 iconResId；android 走 iconResId；shortx 总是显示
  var showIcon = false;
  if (iconType === "file") {
    showIcon = (iconFilePath.length > 0);
  } else if (iconType === "app") {
    var _pkg = this.config.BALL_ICON_PKG ? String(this.config.BALL_ICON_PKG) : "";
    showIcon = (_pkg.length > 0) || (iconResId > 0);
  } else if (iconType === "shortx") {
    showIcon = true;  // # ShortX 内置图标总是尝试显示
  } else {
    showIcon = (iconResId > 0);
  }

  if (!showIcon) showIcon = true;

  if (showIcon) {
    var box = new android.widget.LinearLayout(context);
    box.setOrientation(android.widget.LinearLayout.VERTICAL);
    box.setGravity(android.view.Gravity.CENTER);
    var boxLp = new android.widget.FrameLayout.LayoutParams(
      android.view.ViewGroup.LayoutParams.WRAP_CONTENT,
      android.view.ViewGroup.LayoutParams.WRAP_CONTENT
    );
    boxLp.gravity = android.view.Gravity.CENTER;
    box.setLayoutParams(boxLp);

    var tintHex = (this.config.BALL_ICON_TINT_HEX == null) ? "" : String(this.config.BALL_ICON_TINT_HEX);

    if (showIcon) {
      var iv = new android.widget.ImageView(context);

      // # 悬浮球内部图标：支持系统 drawable / App 图标 / PNG 文件
      var usedDrawable = null;
      var usedKind = "none";

      // # 1) file：优先加载 PNG
      if (iconType === "file") {
        try {
          var pngMode0 = Number(this.config.BALL_PNG_MODE || 0);
          var iconSizePx0 = (pngMode0 === 0 || pngMode0 === 1) ? di.ballSize : this.dp(Number(this.config.BALL_ICON_SIZE_DP || 22));
          var maxBytes = Number(this.config.BALL_ICON_FILE_MAX_BYTES || 0);
          var maxPx = Number(this.config.BALL_ICON_FILE_MAX_PX || 0);
          usedDrawable = this.loadBallIconDrawableFromFile(iconFilePath, iconSizePx0, maxBytes, maxPx);
          if (usedDrawable != null) {
            usedKind = "file";
          } else {
            safeLog(this.L, 'w',  "Ball icon file load failed: " + iconFilePath);
          }
         } catch(eF) { safeLog(null, 'e', "catch " + String(eF)); }
      }

      // # 2) app：加载应用图标 (file 失败也会尝试 app)
      if (usedDrawable == null && (iconType === "app" || iconType === "file")) {
        try {
          var pkgName = this.config.BALL_ICON_PKG ? String(this.config.BALL_ICON_PKG) : "";
          if (pkgName) {
            var pm = context.getPackageManager();
            var appIcon = pm.getApplicationIcon(pkgName);
            if (appIcon != null) {
              usedDrawable = appIcon;
              usedKind = "app";
            }
          }
         } catch(eA) { safeLog(null, 'e', "catch " + String(eA)); }
      }

      // # 2.5) shortx：专门加载 ShortX 内置图标（也作为 file 模式的兜底）
      if (usedDrawable == null && (iconType === "shortx" || iconType === "file")) {
        try {
          // # 优先使用配置的图标名称
          var iconResName = this.config.BALL_ICON_RES_NAME ? String(this.config.BALL_ICON_RES_NAME) : "";
          if (iconResName) {
            usedDrawable = this.resolveShortXDrawable(iconResName, this.config.BALL_ICON_TINT_HEX ? String(this.config.BALL_ICON_TINT_HEX) : "");
          }
          // # 失败则使用默认图标
          if (usedDrawable == null) usedDrawable = this.resolveShortXDrawable("ic_shortx", this.config.BALL_ICON_TINT_HEX ? String(this.config.BALL_ICON_TINT_HEX) : "");
          if (usedDrawable == null) usedDrawable = this.resolveShortXDrawable("ic_launcher", this.config.BALL_ICON_TINT_HEX ? String(this.config.BALL_ICON_TINT_HEX) : "");
          if (usedDrawable == null) usedDrawable = this.resolveShortXDrawable("ic_menu_preferences", this.config.BALL_ICON_TINT_HEX ? String(this.config.BALL_ICON_TINT_HEX) : "");
          if (usedDrawable != null) {
            usedKind = iconType === "file" ? "file(shortx兜底)" : "shortx";
            if (iconType === "file") {
              safeLog(this.L, 'i', "File icon failed, fallback to shortx icon");
            }
          }
         } catch(eShortx2) { safeLog(null, 'e', "catch " + String(eShortx2)); }
      }

      // # 3) android：或所有兜底，走资源 id（优先尝试 ShortX 内置图标）
      if (usedDrawable == null) {
        // # 优先从 ShortX 包加载内置图标
        try {
          usedDrawable = this.resolveShortXDrawable("ic_shortx", this.config.BALL_ICON_TINT_HEX ? String(this.config.BALL_ICON_TINT_HEX) : "");
          if (usedDrawable == null) {
            usedDrawable = this.resolveShortXDrawable("ic_launcher", this.config.BALL_ICON_TINT_HEX ? String(this.config.BALL_ICON_TINT_HEX) : "");
          }
          if (usedDrawable != null) {
            usedKind = "shortx";
          }
         } catch(eShortx) { safeLog(null, 'e', "catch " + String(eShortx)); }
      }

      if (usedDrawable != null) {
        iv.setImageDrawable(usedDrawable);
      } else if (iconResId > 0) {
        try { iv.setImageResource(iconResId); usedKind = "android";  } catch(eR) { safeLog(null, 'e', "catch " + String(eR)); }
      } else {
        // # 没有任何可用图标，直接不加到布局
        usedKind = "none";
      }

      this.state.usedIconKind = usedKind;

      if (usedKind !== "none") {
        var _pngMode1 = Number(this.config.BALL_PNG_MODE || 0);
        if (iconType === "file" && (_pngMode1 === 0 || _pngMode1 === 1)) {
          iv.setScaleType(android.widget.ImageView.ScaleType.FIT_XY);
          var iconSize = di.ballSize;
          var ivLp = new android.widget.LinearLayout.LayoutParams(iconSize, iconSize);
        } else {
          iv.setScaleType(android.widget.ImageView.ScaleType.CENTER_INSIDE);
          var iconSize = this.dp(Number(this.config.BALL_ICON_SIZE_DP || 22));
          var ivLp = new android.widget.LinearLayout.LayoutParams(iconSize, iconSize);
        }
        ivLp.gravity = android.view.Gravity.CENTER;
        iv.setLayoutParams(ivLp);

        // # 颜色滤镜策略：
        // # - android drawable：默认白色（保持旧行为）
        // # - app / file：默认不染色（避免把彩色图标洗成白）
        // # - 只有显式配置 BALL_ICON_TINT_HEX 才强制染色
        if (tintHex.length > 0) {
          try {
            var tintColor2 = android.graphics.Color.parseColor(tintHex);
            iv.setColorFilter(tintColor2, android.graphics.PorterDuff.Mode.SRC_IN);
           } catch(eTint2) { safeLog(null, 'e', "catch " + String(eTint2)); }
        } else if (usedKind === "android") {
          try { iv.setColorFilter(android.graphics.Color.WHITE, android.graphics.PorterDuff.Mode.SRC_IN);  } catch(eCF) { safeLog(null, 'e', "catch " + String(eCF)); }
        } else {
          try { iv.clearColorFilter();  } catch(eCL) { safeLog(null, 'e', "catch " + String(eCL)); }
        }

        box.addView(iv);
      }
    }

    content.addView(box);
  }
 } catch(eBallInner) { safeLog(null, 'e', "catch " + String(eBallInner)); }


  this.updateBallContentBackground(content);

  // # 阴影控制：file/app 模式下不加阴影（避免透明背景带黑框）
  var _uk = this.state.usedIconKind;
  if (_uk !== "file" && _uk !== "app") {
    try { root.setElevation(this.dp(6));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
  }

  content.setClickable(true);
  content.setOnTouchListener(this.setupTouchListener());

  root.addView(content);

  this.state.ballRoot = root;
  this.state.ballContent = content;
};

FloatBallAppWM.prototype.createBallLayoutParams = function() {
  var di = this.getDockInfo();

  var lp = new android.view.WindowManager.LayoutParams(
    di.ballSize,
    di.ballSize,
    android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
    android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
    android.graphics.PixelFormat.TRANSLUCENT
  );

  lp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;

  var initX = this.config.BALL_INIT_X;
  var initY = this.dp(this.config.BALL_INIT_Y_DP);

  if (this.state.loadedPos) { initX = this.state.loadedPos.x; initY = this.state.loadedPos.y; }

  lp.x = this.clamp(initX, 0, this.state.screen.w - di.ballSize);
  lp.y = this.clamp(initY, 0, this.state.screen.h - di.ballSize);

  return lp;
};

