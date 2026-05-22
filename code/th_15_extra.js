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
  if (panelType === "settings" || panelType === "settings_group") return this.buildSettingsPanelView();
  if (panelType === "btn_editor") return this.buildButtonEditorPanelView();
  if (panelType === "schema_editor") return this.buildSchemaEditorPanelView();

  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var settTheme = "animal";
  try { settTheme = String(this.config.SETTINGS_THEME || "animal"); } catch(eSetTheme) { settTheme = "animal"; }
  var useAnimalPanel = (settTheme === "animal" && this.getAnimalIslandTheme);
  var TPanel = null;
  try { if (useAnimalPanel) TPanel = this.getAnimalIslandTheme(); } catch(eTPanel) { TPanel = null; useAnimalPanel = false; }

  var bgColor = isDark ? C.bgDark : C.bgLight;
  var cardColor = isDark ? C.cardDark : C.cardLight;
  var textColor = isDark ? C.textPriDark : C.textPriLight;
  var panelStrokeColor = isDark ? C.dividerDark : C.dividerLight;
  var cardStrokeColor = isDark ? C.dividerDark : C.dividerLight;
  var pressedCardColor = this.withAlpha(C.primary, 0.20);
  var panelRadiusDp = 22;
  var cardRadiusDp = 12;
  var panelElevationDp = 8;
  var cardElevationDp = 2;

  if (useAnimalPanel && TPanel) {
    var Color = android.graphics.Color;
    bgColor = Color.parseColor(isDark ? "#27362E" : "#E4F1DF");
    cardColor = Color.parseColor(isDark ? "#34463A" : "#FFFDF4");
    textColor = Color.parseColor(isDark ? "#F5EBD2" : "#3F3528");
    panelStrokeColor = this.withAlpha(Color.parseColor(isDark ? "#526454" : "#E8DEC8"), isDark ? 0.50 : 0.52);
    cardStrokeColor = this.withAlpha(Color.parseColor(isDark ? "#526454" : "#E8DEC8"), isDark ? 0.52 : 0.56);
    pressedCardColor = this.withAlpha(Color.parseColor(isDark ? "#526454" : "#DDEEDB"), isDark ? 0.36 : 0.42);
    panelRadiusDp = 30;
    cardRadiusDp = 20;
    panelElevationDp = isDark ? 1 : 2;
    cardElevationDp = isDark ? 1 : 2;
  }

  var panel = new android.widget.LinearLayout(context);
  panel.setOrientation(android.widget.LinearLayout.VERTICAL);

  // 面板背景：走统一主题色 API（支持 Monet/动物岛/自定义）
  // 先设一个柔和临时背景避免裸窗口闪烁，最后再由 updatePanelBackground 统一兜底
  try {
    var tmpBg = this.ui.createStrokeDrawable(bgColor, panelStrokeColor, this.dp(1), this.dp(panelRadiusDp));
    panel.setBackground(tmpBg);
  } catch(eTmp) {};
  try { panel.setElevation(this.dp(panelElevationDp));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

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

  function makePanelCellDrawable(fillColor, pressColor, strokeColor, radiusDp) {
    var sd = new android.graphics.drawable.StateListDrawable();
    var p = self.ui.createStrokeDrawable(pressColor, strokeColor, self.dp(1), self.dp(radiusDp));
    var n = self.ui.createStrokeDrawable(fillColor, strokeColor, self.dp(1), self.dp(radiusDp));
    sd.addState([android.R.attr.state_pressed], p);
    sd.addState([], n);
    return sd;
  }

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

    // 单元格背景：如果是有功能的按钮，给柔和卡片背景；否则透明
    if (btnCfg) {
         cell.setBackground(makePanelCellDrawable(cardColor, pressedCardColor, cardStrokeColor, cardRadiusDp));
         try { cell.setElevation(self.dp(cardElevationDp));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    } else {
         // 空格子占位
    }

    var iv = new android.widget.ImageView(context);
    var dr = this.resolveIconDrawable(btnCfg);
    if (dr) {
        iv.setImageDrawable(dr);
        // 主面板是高频工具入口：默认保留图标原色；仅 resolveIconDrawable 内显式 iconTint 时才染色。
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
        var rippleDr = makePanelCellDrawable(cardColor, pressedCardColor, cardStrokeColor, cardRadiusDp);
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
  // 对主面板/查看器面板应用统一主题色（支持 Monet、模板、自定义）
  try { this.updatePanelBackground(panel); } catch(eTheme) { safeLog(null, 'e', "catch " + String(eTheme)); }
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
  var isModal = (which === "settings" || which === "btn_editor" || which === "schema_editor" || which === "tool_app");

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

  var panelLp0 = null;
  try { panelLp0 = panel.getLayoutParams(); } catch (ePanelLp) { panelLp0 = null; }
  var panelW = (panelLp0 && Number(panelLp0.width) > 0) ? Number(panelLp0.width) : android.view.WindowManager.LayoutParams.WRAP_CONTENT;
  var panelH = (panelLp0 && Number(panelLp0.height) > 0) ? Number(panelLp0.height) : android.view.WindowManager.LayoutParams.WRAP_CONTENT;

  var lp = new android.view.WindowManager.LayoutParams(
    panelW,
    panelH,
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

  try { if (this.attachPanelSystemKeyHandler) this.attachPanelSystemKeyHandler(panel, which); } catch (eKeyAttach) { safeLog(this.L, 'e', "attach panel key fail which=" + String(which) + " err=" + String(eKeyAttach)); }

  try { this.state.wm.addView(panel, lp); } catch (eAdd) { safeLog(this.L, 'e',  "addPanel fail which=" + String(which) + " err=" + String(eAdd)); return; }

  if (which === "main") { this.state.panel = panel; this.state.panelLp = lp; this.state.addedPanel = true; }
  else if (which === "settings") { this.state.settingsPanel = panel; this.state.settingsPanelLp = lp; this.state.addedSettings = true; }
  else { this.state.viewerPanel = panel; this.state.viewerPanelLp = lp; this.state.viewerPanelType = which; this.state.addedViewer = true; }

  try { panel.requestFocus(); } catch (eReqFocus) {}

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

// =======================【设置类 UI：App 页面栈实验框架】======================
FloatBallAppWM.prototype.isToolAppRoute = function(route) {
  var r = String(route || "");
  return r === "settings" || r === "settings_group" || r === "btn_editor" || r === "schema_editor";
};

FloatBallAppWM.prototype.getToolAppTitle = function(route) {
  var r = String(route || "settings");
  if (r === "settings") return "岛屿设置";
  if (r === "settings_group") return this.getSettingsGroupTitle ? this.getSettingsGroupTitle(this.state.settingsGroupKey) : "岛屿分区";
  if (r === "btn_editor") {
    if (this.state.editingButtonIndex !== null && this.state.editingButtonIndex !== undefined) {
      return (this.state.editingButtonIndex === -1) ? "添加工具伙伴" : "整理工具伙伴";
    }
    return "工具小屋";
  }
  if (r === "schema_editor") {
    if (this.state.editingSchemaIndex !== null && this.state.editingSchemaIndex !== undefined) {
      return (this.state.editingSchemaIndex === -1) ? "新增蓝图项" : "编辑蓝图项";
    }
    return "高级蓝图";
  }
  return "ToolHub";
};

FloatBallAppWM.prototype.closeToolApp = function() {
  try {
    this.state.toolAppActive = false;
    this.state.toolAppRoute = null;
    this.state.toolAppNavStack = [];
    this.state.settingsGroupKey = null;
    this.state.settingsHomeSelectedItemId = null;
    this.hideViewerPanel();
    this.state.toolAppRoot = null;
    this.state.toolAppBody = null;
    this.state.toolAppContentHost = null;
    this.state.toolAppBackPreviewView = null;
    this.state.toolAppBackPreviewRoute = null;
    this.state.toolAppBackPreviewReady = false;
    try { if (this.hideToolAppScreenBackStrips) this.hideToolAppScreenBackStrips(); } catch (eStrip) {}
    this.state.toolAppTitleView = null;
    this.state.toolAppBackButton = null;
  } catch (e) { safeLog(this.L, 'e', "closeToolApp fail: " + String(e)); }
};

FloatBallAppWM.prototype.clearToolAppBackPreview = function(resetCurrent) {
  try {
    try { this.resetToolAppBackWindowFollow(); } catch(eFollowClear) {}
    var prev = this.state.toolAppBackPreviewView;
    var root = this.state.toolAppRoot;
    if (prev && root) {
      try { root.removeView(prev); } catch (eRm) {}
    }
    this.state.toolAppBackPreviewView = null;
    this.state.toolAppBackPreviewRoute = null;
    this.state.toolAppBackPreviewReady = false;
    if (resetCurrent && root) {
      try { root.animate().cancel(); } catch (eCancelRoot) {}
      try { root.setTranslationX(0); root.setAlpha(1); root.setScaleX(1); root.setScaleY(1); } catch (eRoot) {}
    }
    var body = this.state.toolAppBody;
    if (resetCurrent && body) {
      try { body.animate().cancel(); } catch (eCancel) {}
      try { body.setTranslationX(0); body.setAlpha(1); body.setScaleX(1); body.setScaleY(1); } catch (eBody) {}
    }
  } catch (e) { safeLog(this.L, 'w', "clear tool app back preview fail: " + String(e)); }
};

FloatBallAppWM.prototype.getToolAppPreviousStackEntry = function() {
  try {
    var st = this.state.toolAppNavStack || [];
    if (!st || st.length <= 1) return null;
    return st[st.length - 2];
  } catch (e) {}
  return null;
};

FloatBallAppWM.prototype.hasToolAppPaneBackTarget = function() {
  try {
    var r = String(this.state.toolAppRoute || "");
    if (r !== "settings") return false;
    if (!this.state.settingsHomeSelectedItemId) return false;
    var spec = this.getSettingsResponsiveSpec ? this.getSettingsResponsiveSpec() : (this.getToolAppResponsiveSpec ? this.getToolAppResponsiveSpec() : null);
    return !!(spec && spec.useSideBySide);
  } catch (e) {}
  return false;
};

FloatBallAppWM.prototype.hasToolAppBackTarget = function() {
  try {
    if (this.getToolAppPreviousStackEntry && this.getToolAppPreviousStackEntry()) return true;
    if (this.hasToolAppPaneBackTarget && this.hasToolAppPaneBackTarget()) return true;
  } catch (e) {}
  return false;
};

FloatBallAppWM.prototype.captureToolAppPageSnapshot = function(route) {
  var r = this.isToolAppRoute(route) ? String(route) : (this.isToolAppRoute(this.state.toolAppRoute) ? String(this.state.toolAppRoute) : "settings");
  var s = this.state || {};
  var entry = {
    route: r,
    settingsGroupKey: (s.settingsGroupKey !== undefined && s.settingsGroupKey !== null) ? String(s.settingsGroupKey) : "",
    settingsHomeSelectedItemId: (s.settingsHomeSelectedItemId !== undefined) ? s.settingsHomeSelectedItemId : null,
    editingButtonIndex: (s.editingButtonIndex !== undefined) ? s.editingButtonIndex : null,
    editingSchemaIndex: (s.editingSchemaIndex !== undefined) ? s.editingSchemaIndex : null,
    keepBtnEditorState: !!s.keepBtnEditorState,
    keepSchemaEditorState: !!s.keepSchemaEditorState,
    toolAppSubRoute: (s.toolAppSubRoute !== undefined) ? s.toolAppSubRoute : null,
    toolAppSubPage: (s.toolAppSubPage !== undefined) ? s.toolAppSubPage : null,
    toolAppSubKey: (s.toolAppSubKey !== undefined) ? s.toolAppSubKey : null,
    toolAppSubPayload: (s.toolAppSubPayload !== undefined) ? s.toolAppSubPayload : null
  };
  if (r !== "settings_group") entry.settingsGroupKey = "";
  if (r !== "settings") entry.settingsHomeSelectedItemId = null;
  if (r !== "btn_editor") { entry.editingButtonIndex = null; entry.keepBtnEditorState = false; }
  if (r !== "schema_editor") { entry.editingSchemaIndex = null; entry.keepSchemaEditorState = false; }
  return entry;
};

FloatBallAppWM.prototype.makeToolAppStackEntry = function(route) {
  return this.captureToolAppPageSnapshot(route);
};

FloatBallAppWM.prototype.applyToolAppPageSnapshot = function(entry) {
  try {
    if (!entry || typeof entry !== "object") return false;
    var r = this.isToolAppRoute(entry.route) ? String(entry.route) : "settings";
    this.state.toolAppRoute = r;
    this.state.settingsGroupKey = (entry.settingsGroupKey !== undefined && entry.settingsGroupKey !== null) ? String(entry.settingsGroupKey) : "";
    this.state.settingsHomeSelectedItemId = (entry.settingsHomeSelectedItemId !== undefined) ? entry.settingsHomeSelectedItemId : null;
    this.state.editingButtonIndex = (entry.editingButtonIndex !== undefined) ? entry.editingButtonIndex : null;
    this.state.editingSchemaIndex = (entry.editingSchemaIndex !== undefined) ? entry.editingSchemaIndex : null;
    this.state.keepBtnEditorState = !!entry.keepBtnEditorState;
    this.state.keepSchemaEditorState = !!entry.keepSchemaEditorState;
    this.state.toolAppSubRoute = (entry.toolAppSubRoute !== undefined) ? entry.toolAppSubRoute : null;
    this.state.toolAppSubPage = (entry.toolAppSubPage !== undefined) ? entry.toolAppSubPage : null;
    this.state.toolAppSubKey = (entry.toolAppSubKey !== undefined) ? entry.toolAppSubKey : null;
    this.state.toolAppSubPayload = (entry.toolAppSubPayload !== undefined) ? entry.toolAppSubPayload : null;
    return true;
  } catch(e) { safeLog(this.L, 'w', "apply tool app snapshot fail: " + String(e)); }
  return false;
};

FloatBallAppWM.prototype.cloneToolAppPageSnapshot = function(entry) {
  if (!entry || typeof entry !== "object") return this.makeToolAppStackEntry("settings");
  return {
    route: this.isToolAppRoute(entry.route) ? String(entry.route) : "settings",
    settingsGroupKey: (entry.settingsGroupKey !== undefined && entry.settingsGroupKey !== null) ? String(entry.settingsGroupKey) : "",
    settingsHomeSelectedItemId: (entry.settingsHomeSelectedItemId !== undefined) ? entry.settingsHomeSelectedItemId : null,
    editingButtonIndex: (entry.editingButtonIndex !== undefined) ? entry.editingButtonIndex : null,
    editingSchemaIndex: (entry.editingSchemaIndex !== undefined) ? entry.editingSchemaIndex : null,
    keepBtnEditorState: !!entry.keepBtnEditorState,
    keepSchemaEditorState: !!entry.keepSchemaEditorState,
    toolAppSubRoute: (entry.toolAppSubRoute !== undefined) ? entry.toolAppSubRoute : null,
    toolAppSubPage: (entry.toolAppSubPage !== undefined) ? entry.toolAppSubPage : null,
    toolAppSubKey: (entry.toolAppSubKey !== undefined) ? entry.toolAppSubKey : null,
    toolAppSubPayload: (entry.toolAppSubPayload !== undefined) ? entry.toolAppSubPayload : null
  };
};

FloatBallAppWM.prototype.buildToolAppPreviewBody = function(entry) {
  var self = this;
  var oldSnap = null;
  var r = "settings";
  try {
    oldSnap = this.captureToolAppPageSnapshot ? this.captureToolAppPageSnapshot(this.state.toolAppRoute || "settings") : null;
    if (entry && typeof entry === "object") {
      if (this.applyToolAppPageSnapshot) this.applyToolAppPageSnapshot(entry);
      r = this.isToolAppRoute(entry.route) ? String(entry.route) : "settings";
    } else {
      r = this.isToolAppRoute(entry) ? String(entry) : "settings";
      if (this.applyToolAppPageSnapshot) this.applyToolAppPageSnapshot(this.makeToolAppStackEntry(r));
    }
    var spec = null;
    try {
      spec = this.getToolAppResponsiveSpec ? this.getToolAppResponsiveSpec() : null;
    } catch(eSpec) {
      spec = null;
    }
    var topBarHeight = spec ? spec.topBarHeight : this.dp(56);

    var isDark = this.isDarkTheme();
    var C = this.ui.colors;
    var T = this.getAnimalIslandTheme();
    var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
    try { if (this.applySettingsTheme) this.applySettingsTheme(T, isDark, C, cfgTpl); } catch(eTheme) { safeLog(null, 'e', "catch " + String(eTheme)); }

    var body = new android.widget.LinearLayout(context);
    body.setOrientation(android.widget.LinearLayout.VERTICAL);
    body.setPadding(this.dp(6), this.dp(6), this.dp(6), this.dp(8));
    body.setBackground(this.ui.createStrokeDrawable(T.bg, this.withAlpha(T.stroke, isDark ? 0.42 : 0.70), this.dp(1), this.dp(26)));
    try { body.setClipToOutline(true); } catch(eClip) {}
    try { body.setElevation(this.dp((spec && (spec.isExpandedWidth || spec.isWideWidth)) ? 7 : 10)); } catch (eElev) {}

    var bar = new android.widget.LinearLayout(context);
    bar.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    bar.setGravity(android.view.Gravity.CENTER_VERTICAL);
    bar.setPadding(this.dp(10), (spec && spec.isLandscape) ? this.dp(6) : this.dp(10), this.dp(10), this.dp(6));
    bar.setBackground(this.ui.createStrokeDrawable(T.card, this.withAlpha(T.stroke, isDark ? 0.30 : 0.45), this.dp(1), this.dp(20)));
    try { bar.setElevation(this.dp((spec && (spec.isExpandedWidth || spec.isWideWidth)) ? 1 : 2)); } catch(eBarElev) {}

    function handlePreviewBackClick() {
      try { self.toast("这是返回预览，松手后才会返回"); } catch(eToast) {}
    }
    var btnBack = this.ui.createFlatButton(this, "‹", T.brown, handlePreviewBackClick);
    btnBack.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 24);
    btnBack.setPadding(this.dp(8), 0, this.dp(8), 0);
    try { btnBack.setAlpha(0.62); } catch(eBackClick) {}
    try { btnBack.setBackground(this.ui.createStrokeDrawable(T.primarySoft, this.withAlpha(T.primaryDeep, isDark ? 0.30 : 0.22), this.dp(1), this.dp(18))); } catch(eBackBg) {}
    bar.addView(btnBack, new android.widget.LinearLayout.LayoutParams(this.dp(42), this.dp(38)));

    var tvTitle = new android.widget.TextView(context);
    var titleText = String(this.getToolAppTitle(r) || "ToolHub");
    if (r === "settings") titleText = "❧ 岛屿设置 ❧";
    tvTitle.setText(titleText);
    tvTitle.setTextColor(T.text);
    tvTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 17);
    tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);
    tvTitle.setGravity(android.view.Gravity.CENTER);
    var titleLp = new android.widget.LinearLayout.LayoutParams(0, -1);
    titleLp.weight = 1;
    bar.addView(tvTitle, titleLp);

    var rightText = r === "settings" ? "📖 岛务手册" : "✕";
    function handlePreviewRightClick() {
      try {
        if (r === "settings") {
          var intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
          intent.setData(android.net.Uri.parse("https://xin-blog.com/114.html"));
          intent.setFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
          context.startActivity(intent);
          return;
        }
        self.toast("这是返回预览，松手后才会返回");
      } catch(eDoc) { try { self.toast("无法打开文档链接"); } catch(eToast) {} }
    }
    var btnClose = this.ui.createFlatButton(this, rightText, T.primaryDeep, handlePreviewRightClick);
    btnClose.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, r === "settings" ? 12 : 18);
    btnClose.setTypeface(null, android.graphics.Typeface.BOLD);
    btnClose.setPadding(this.dp(10), 0, this.dp(10), 0);
    try { btnClose.setAlpha(0.62); } catch(eRightClick) {}
    try { btnClose.setBackground(this.ui.createStrokeDrawable(T.primarySoft, this.withAlpha(T.primaryDeep, isDark ? 0.30 : 0.22), this.dp(1), this.dp(18))); } catch(eRightBg) {}
    bar.addView(btnClose, new android.widget.LinearLayout.LayoutParams(this.dp(104), this.dp(38)));
    var barLp = new android.widget.LinearLayout.LayoutParams(-1, topBarHeight);
    barLp.setMargins(this.dp(8), this.dp(8), this.dp(8), this.dp(4));
    body.addView(bar, barLp);

    var host = new android.widget.FrameLayout(context);
    var raw = this.buildPanelView(r);
    try { raw.setBackground(null); } catch (eBg) {}
    try { raw.setElevation(0); } catch (eEl) {}
    host.addView(raw, new android.widget.FrameLayout.LayoutParams(-1, -1));
    var hostLp = new android.widget.LinearLayout.LayoutParams(-1, 0, 1);
    hostLp.setMargins((spec && (spec.isExpandedWidth || spec.isWideWidth)) ? this.dp(4) : this.dp(6), 0, (spec && (spec.isExpandedWidth || spec.isWideWidth)) ? this.dp(4) : this.dp(6), (spec && (spec.isExpandedWidth || spec.isWideWidth)) ? this.dp(4) : this.dp(6));
    body.addView(host, hostLp);
    return body;
  } catch (e) {
    safeLog(this.L, 'w', "build tool app preview body fail route=" + String(r || "") + " err=" + String(e));
  } finally {
    if (oldSnap && this.applyToolAppPageSnapshot) {
      try { this.applyToolAppPageSnapshot(oldSnap); } catch (eRestore) {}
    }
  }
  return null;
};

FloatBallAppWM.prototype.prepareToolAppBackPreview = function(edge) {
  try {
    if (this.state.toolAppBackPreviewReady) return true;
    var root = this.state.toolAppRoot;
    var body = this.state.toolAppBody;
    var prevEntry = this.getToolAppPreviousStackEntry();
    var isPaneBack = false;
    if ((!prevEntry || !prevEntry.route) && this.hasToolAppPaneBackTarget && this.hasToolAppPaneBackTarget()) {
      prevEntry = this.makeToolAppStackEntry ? this.makeToolAppStackEntry("settings") : { route: "settings", settingsGroupKey: "" };
      isPaneBack = true;
    }
    if (!root || !body || !prevEntry || !prevEntry.route) return false;
    var prevRoute = isPaneBack ? "settings:pane" : String(prevEntry.route || "settings");
    var oldPaneItem = null;
    var hasOldPaneItem = false;
    var prevBody = null;
    try {
      if (isPaneBack) {
        oldPaneItem = this.state.settingsHomeSelectedItemId;
        hasOldPaneItem = true;
        this.state.settingsHomeSelectedItemId = null;
      }
      prevBody = this.buildToolAppPreviewBody(prevEntry);
    } finally {
      if (hasOldPaneItem) {
        try { this.state.settingsHomeSelectedItemId = oldPaneItem; } catch(eRestorePane) {}
      }
    }
    if (!prevBody) return false;
    var lp = new android.widget.FrameLayout.LayoutParams(-1, -1);
    prevBody.setAlpha(0.88);
    prevBody.setScaleX(0.975);
    prevBody.setScaleY(0.975);
    prevBody.setTranslationX((Number(edge) === 1 ? 1 : -1) * this.dp(24));
    try {
      root.addView(prevBody, 0, lp);
    } catch (eAddIdx) {
      try { root.addView(prevBody, lp); } catch (eAdd) { return false; }
      try { prevBody.bringToFront(); body.bringToFront(); } catch (eFront) {}
    }
    try { body.bringToFront(); } catch (eBodyFront) {}
    this.state.toolAppBackPreviewView = prevBody;
    this.state.toolAppBackPreviewRoute = prevRoute;
    this.state.toolAppBackPreviewReady = true;
    return true;
  } catch (e) {
    safeLog(this.L, 'w', "prepare tool app back preview fail: " + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.applyToolAppBackWindowFollow = function(edge, dragPx) {
  try {
    if (!this.state || !this.state.wm || !this.state.viewerPanel || !this.state.viewerPanelLp) return false;

    var lp = this.state.viewerPanelLp;
    var dir = Number(edge) === 1 ? -1 : 1;

    if (this.state.toolAppBackPreviewOriginX === null || this.state.toolAppBackPreviewOriginX === undefined) {
      this.state.toolAppBackPreviewOriginX = Number(lp.x || 0);
    }

    var raw = Number(dragPx || 0);
    if (isNaN(raw)) raw = 0;
    if (raw < 0) raw = -raw;

    var maxFollow = this.dp(160);
    try {
      var w = Number(lp.width || 0);
      if (w > 0) maxFollow = Math.min(maxFollow, Math.floor(w * 0.38));
    } catch(eW) {}

    var follow = Math.min(raw, maxFollow);
    var nx = Math.round(Number(this.state.toolAppBackPreviewOriginX || 0) + dir * follow);

    if (lp.x !== nx) {
      lp.x = nx;
      this.state.wm.updateViewLayout(this.state.viewerPanel, lp);
    }

    return true;
  } catch(e) {
    safeLog(this.L, 'w', 'apply tool app window follow fail: ' + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.resetToolAppBackWindowFollow = function() {
  try {
    if (!this.state || !this.state.wm || !this.state.viewerPanel || !this.state.viewerPanelLp) return false;
    if (this.state.toolAppBackPreviewOriginX === null || this.state.toolAppBackPreviewOriginX === undefined) return false;

    var lp = this.state.viewerPanelLp;
    var ox = Number(this.state.toolAppBackPreviewOriginX || 0);
    if (lp.x !== ox) {
      lp.x = ox;
      this.state.wm.updateViewLayout(this.state.viewerPanel, lp);
    }
    this.state.toolAppBackPreviewOriginX = null;
    return true;
  } catch(e) {
    safeLog(this.L, 'w', 'reset tool app window follow fail: ' + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.applyToolAppBackPreviewProgress = function(edge, progress, dragPx) {
  try {
    var p = Number(progress || 0);
    if (isNaN(p)) p = 0;
    if (p < 0) p = 0;
    if (p > 1) p = 1;
    var previewReady = false;
    try {
      previewReady = this.prepareToolAppBackPreview(edge);
    } catch(ePrepare) {
      previewReady = false;
    }
    var eased = 1 - Math.pow(1 - p, 2.2);
    var body = this.state.toolAppBody;
    var prev = previewReady ? this.state.toolAppBackPreviewView : null;
    var dir = Number(edge) === 1 ? -1 : 1;
    var w = 0;
    try { w = Number((this.state.viewerPanelLp && this.state.viewerPanelLp.width) || 0); } catch (eW0) {}
    if (!w || w < this.dp(120)) {
      try { w = Number((this.state.toolAppRoot && this.state.toolAppRoot.getWidth && this.state.toolAppRoot.getWidth()) || 0); } catch (eW1) {}
    }
    if (!w || w < this.dp(120)) w = this.dp(320);
    /* 不再移动 WindowManager 窗口，避免 prevBody 和当前页面一起跑。 */
    /* try { this.applyToolAppBackWindowFollow(edge, dragPx); } catch(eFollow) {} */

    try {
      var nowLog = Date.now();
      if (!this.state._lastBackPreviewLog || nowLog - this.state._lastBackPreviewLog > 300) {
        safeLog(this.L, 'd',
          'back preview progress edge=' + String(edge) +
          ' p=' + String(p) +
          ' dragPx=' + String(dragPx) +
          ' previewReady=' + String(previewReady)
        );
        this.state._lastBackPreviewLog = nowLog;
      }
    } catch(eLog) {}

    var root = this.state.toolAppRoot;
    var bodyMove = dir * w * eased * 0.42;
    try {
      if (dragPx !== undefined && dragPx !== null) {
        var rawDrag = Number(dragPx || 0);
        if (isNaN(rawDrag)) rawDrag = 0;
        if (rawDrag < 0) rawDrag = -rawDrag;
        bodyMove = dir * Math.min(rawDrag, Math.floor(w * 0.45));
      }
    } catch(eBodyMove) {}

    if (root) {
      try { root.animate().cancel(); } catch(eCancelRoot) {}
      try { root.setTranslationX(0); } catch(eRootReset) {}
    }

    if (body) {
      try { body.animate().cancel(); } catch(eCancelBody) {}
      body.setTranslationX(bodyMove);
      body.setAlpha(1.0 - 0.10 * eased);
      var s = 1.0 - 0.015 * eased;
      body.setScaleX(s);
      body.setScaleY(s);
    }

    try {
      var rootTx = root ? root.getTranslationX() : 0;
      var bodyTx = body ? body.getTranslationX() : 0;
      var prevTx = prev ? prev.getTranslationX() : 0;
      var lpX = (this.state.viewerPanelLp ? this.state.viewerPanelLp.x : 0);
      var nowLog2 = Date.now();
      if (!this.state._lastBackMoveLog || nowLog2 - this.state._lastBackMoveLog > 300) {
        safeLog(this.L, 'd',
          'back move apply edge=' + String(edge) +
          ' bodyMove=' + String(bodyMove) +
          ' rootTx=' + String(rootTx) +
          ' bodyTx=' + String(bodyTx) +
          ' prevTx=' + String(prevTx) +
          ' lpX=' + String(lpX)
        );
        this.state._lastBackMoveLog = nowLog2;
      }
    } catch(eMoveLog) {}
    if (prev) {
      prev.setAlpha(0.88 + 0.12 * eased);
      prev.setTranslationX(-dir * this.dp(24) * (1.0 - eased));
      var ps = 0.975 + 0.025 * eased;
      prev.setScaleX(ps);
      prev.setScaleY(ps);
    }
    return true;
  } catch (e) { safeLog(this.L, 'w', "apply tool app back preview fail: " + String(e)); }
  return false;
};

FloatBallAppWM.prototype.finishToolAppBackPreview = function(edge, complete) {
  try {
    var self = this;
    var root = this.state.toolAppRoot;
    var body = this.state.toolAppBody;
    var prev = this.state.toolAppBackPreviewView;
    var dir = Number(edge) === 1 ? -1 : 1;
    var decel = new android.view.animation.DecelerateInterpolator();
    if (complete && body) {
      var w = 0;
      try { w = Number((this.state.viewerPanelLp && this.state.viewerPanelLp.width) || 0); } catch (eW0) {}
      if (!w || w < this.dp(120)) {
        try { w = Number((this.state.toolAppRoot && this.state.toolAppRoot.getWidth && this.state.toolAppRoot.getWidth()) || 0); } catch (eW1) {}
      }
      if (!w || w < this.dp(120)) w = this.dp(320);
      try { if (prev) prev.animate().translationX(0).alpha(1).scaleX(1).scaleY(1).setDuration(180).setInterpolator(decel).start(); } catch(ePrev) {}
      body.animate().translationX(dir * w).alpha(0.90).scaleX(0.985).scaleY(0.985).setDuration(180).setInterpolator(decel).withEndAction(new java.lang.Runnable({
        run: function() {
          try { self.resetToolAppBackWindowFollow(); } catch(eResetFollow) {}
          try {
            if (self.state.toolAppRoot) self.state.toolAppRoot.setTranslationX(0);
            if (self.state.toolAppBody) {
              self.state.toolAppBody.setTranslationX(0);
              self.state.toolAppBody.setAlpha(1);
              self.state.toolAppBody.setScaleX(1);
              self.state.toolAppBody.setScaleY(1);
            }
          } catch(eResetView) {}
          try { self.clearToolAppBackPreview(true); } catch (eClear) {}
          try { self.popToolAppPage("edge_swipe_back"); } catch (ePop) {}
        }
      })).start();
      return;
    }
    if (body) {
      var cancelInterp = new android.view.animation.AccelerateDecelerateInterpolator();
      try { if (prev) prev.animate().translationX(-dir * self.dp(24)).alpha(0.88).scaleX(0.975).scaleY(0.975).setDuration(200).setInterpolator(cancelInterp).start(); } catch(ePrev2) {}
      body.animate().translationX(0).alpha(1).scaleX(1).scaleY(1).setDuration(200).setInterpolator(cancelInterp).withEndAction(new java.lang.Runnable({
        run: function() {
          try { self.resetToolAppBackWindowFollow(); } catch(eResetFollow2) {}
          try {
            if (self.state.toolAppRoot) self.state.toolAppRoot.setTranslationX(0);
            if (self.state.toolAppBody) {
              self.state.toolAppBody.setTranslationX(0);
              self.state.toolAppBody.setAlpha(1);
              self.state.toolAppBody.setScaleX(1);
              self.state.toolAppBody.setScaleY(1);
            }
          } catch(eResetView2) {}
          try { self.clearToolAppBackPreview(true); } catch (eClear2) {}
        }
      })).start();
      return;
    }
    this.clearToolAppBackPreview(true);
  } catch (e) {
    try { this.resetToolAppBackWindowFollow(); } catch(eResetFollow3) {}
    try { if (this.state.toolAppRoot) this.state.toolAppRoot.setTranslationX(0); } catch(eRootCatch) {}
    try { if (this.state.toolAppBody) this.state.toolAppBody.setTranslationX(0); } catch(eBodyCatch) {}
    this.clearToolAppBackPreview(true);
    safeLog(this.L, 'w', "finish tool app back preview fail: " + String(e));
  }
};

FloatBallAppWM.prototype.createToolAppEdgeBackStrip = function(edge) {
  var self = this;
  var strip = new android.view.View(context);
  strip.setBackgroundColor(android.graphics.Color.TRANSPARENT);
  var downX = 0;
  var downY = 0;
  var active = false;
  var moved = false;
  strip.setOnTouchListener(new android.view.View.OnTouchListener({
    onTouch: function(v, event) {
      try {
        if (!event) return false;
        var action = event.getActionMasked();
        if (action === android.view.MotionEvent.ACTION_DOWN) {
          downX = event.getRawX();
          downY = event.getRawY();
          active = !!(self.state && self.state.toolAppActive && self.hasToolAppBackTarget && self.hasToolAppBackTarget());
          moved = false;
          if (active) self.prepareToolAppBackPreview(edge);
          return active;
        }
        if (!active) return false;
        if (action === android.view.MotionEvent.ACTION_MOVE) {
          var mx = event.getRawX() - downX;
          var my = event.getRawY() - downY;
          var validDir = (edge === 0 && mx > 0) || (edge === 1 && mx < 0);
          if (validDir && Math.abs(mx) > self.dp(3) && Math.abs(mx) > Math.abs(my) * 0.85) {
            if (!moved) {
              try { safeLog(self.L, 'd', 'edge strip move edge=' + String(edge) + ' mx=' + String(mx)); } catch(eMoveLog) {}
            }
            moved = true;
            var triggerDp = Number(self.config.TOOLAPP_BACK_PROGRESS_DISTANCE_DP || 96);
            if (isNaN(triggerDp)) triggerDp = 96;
            if (triggerDp < 1) triggerDp = 1;
            if (triggerDp > 720) triggerDp = 720;
            var triggerDistance = self.dp(triggerDp);
            var p = Math.min(1, Math.abs(mx) / triggerDistance);
            self.applyToolAppBackPreviewProgress(edge, p, Math.abs(mx));
          }
          return true;
        }
        if (action === android.view.MotionEvent.ACTION_UP || action === android.view.MotionEvent.ACTION_CANCEL) {
          var ux = event.getRawX() - downX;
          var uy = event.getRawY() - downY;
          var commitDp = Number(self.config.TOOLAPP_BACK_COMMIT_DISTANCE_DP || 36);
          if (isNaN(commitDp)) commitDp = 36;
          if (commitDp < 1) commitDp = 1;
          if (commitDp > 480) commitDp = 480;
          var completeDistance = self.dp(commitDp);
          var okDir = (edge === 0 && ux > completeDistance) || (edge === 1 && ux < -completeDistance);
          var ok = (action === android.view.MotionEvent.ACTION_UP) && moved && okDir && Math.abs(ux) > Math.abs(uy) * 0.85;
          active = false;
          self.finishToolAppBackPreview(edge, ok);
          return true;
        }
      } catch (e) {
        try { self.clearToolAppBackPreview(true); } catch (eClear) {}
        try { safeLog(self.L, 'w', "tool app edge back fail: " + String(e)); } catch(eLog) {}
      }
      return false;
    }
  }));
  return strip;
};

FloatBallAppWM.prototype.hideToolAppScreenBackStrips = function() {
  try {
    var arr = this.state.toolAppScreenBackStrips || [];
    for (var i = 0; i < arr.length; i++) {
      try { if (arr[i] && this.state.wm) this.state.wm.removeView(arr[i]); } catch (eRm) {}
    }
    this.state.toolAppScreenBackStrips = [];
  } catch (e) { safeLog(this.L, 'w', "hide tool app screen back strips fail: " + String(e)); }
};

FloatBallAppWM.prototype.getToolAppBackEdgeWidthPx = function() {
  var stripDp = 72;
  try {
    stripDp = Number(this.config.TOOLAPP_BACK_EDGE_WIDTH_DP || 72);
    if (isNaN(stripDp)) stripDp = 72;
    if (stripDp < 1) stripDp = 1;
    if (stripDp > 120) stripDp = 120;
  } catch(e) {
    stripDp = 72;
  }
  return this.dp(stripDp);
};

FloatBallAppWM.prototype.isToolAppScreenBackStripsEnabled = function() {
  try { return parseBooleanLike(this.config.ENABLE_TOOLAPP_SCREEN_BACK_STRIPS); } catch(e) {}
  try { return String(this.config.ENABLE_TOOLAPP_SCREEN_BACK_STRIPS || "true") === "true"; } catch(e2) {}
  return true;
};

FloatBallAppWM.prototype.showToolAppScreenBackStrips = function() {
  // 只在 ToolApp 面板左右的屏幕空白区创建触摸层；绝不覆盖 ToolApp 矩形内部控件区域。
  try {
    this.hideToolAppScreenBackStrips();
    if (!this.state || !this.state.wm || !this.state.viewerPanelLp) return false;
    var lp0 = this.state.viewerPanelLp;
    var sw = Math.max(1, Number(this.state.screen && this.state.screen.w || 0));
    var sh = Math.max(1, Number(this.state.screen && this.state.screen.h || 0));
    if (sw <= 1 || sh <= 1) {
      try { var ss = this.getScreenSizePx(); sw = ss.w; sh = ss.h; } catch(eScreen) {}
    }
    var px = Number(lp0.x || 0);
    var pw = Number(lp0.width || 0);
    if (isNaN(px)) px = 0;
    if (isNaN(pw) || pw <= 0) return false;
    var minBlank = this.dp(3);
    var leftW = Math.max(0, Math.floor(px));
    var rightX = Math.floor(px + pw);
    var rightW = Math.max(0, Math.floor(sw - rightX));
    var made = false;
    var arr = [];
    var addBlankStrip = function(self, edge, x, w) {
      if (!w || w < minBlank) return false;
      var strip = self.createToolAppEdgeBackStrip(edge);
      var flags = android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
              android.view.WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL;
      var lp = new android.view.WindowManager.LayoutParams(
        w,
        sh,
        android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        flags,
        android.graphics.PixelFormat.TRANSLUCENT
      );
      lp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
      lp.x = x;
      lp.y = 0;
      try { self.state.wm.addView(strip, lp); arr.push(strip); return true; } catch(eAdd) { safeLog(self.L, 'w', 'add blank screen back strip fail edge=' + String(edge) + ' err=' + String(eAdd)); }
      return false;
    };
    if (addBlankStrip(this, 0, 0, leftW)) made = true;
    if (addBlankStrip(this, 1, rightX, rightW)) made = true;
    this.state.toolAppScreenBackStrips = arr;
    try { if (made) safeLog(this.L, 'd', 'blank screen back strips leftW=' + String(leftW) + ' rightW=' + String(rightW) + ' panelX=' + String(px) + ' panelW=' + String(pw)); } catch(eLog) {}
    return made;
  } catch(e) {
    try { this.hideToolAppScreenBackStrips(); } catch(eHide2) {}
    safeLog(this.L, 'w', "show blank screen back strips fail: " + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.refreshToolAppScreenBackStrips = function() {
  try {
    this.hideToolAppScreenBackStrips();
    if (!this.state.toolAppActive) return false;
    if (!this.hasToolAppBackTarget || !this.hasToolAppBackTarget()) return false;
    if (!this.isToolAppScreenBackStripsEnabled || !this.isToolAppScreenBackStripsEnabled()) return false;
    return this.showToolAppScreenBackStrips();
  } catch(e) {
    try { this.hideToolAppScreenBackStrips(); } catch(eHide) {}
    safeLog(this.L, 'w', "refresh tool app screen back strips fail: " + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.getToolAppResponsiveSpec = function() {
  var sw = Math.max(1, Number(this.state.screen && this.state.screen.w || 0));
  var sh = Math.max(1, Number(this.state.screen && this.state.screen.h || 0));
  if (sw <= 1 || sh <= 1) {
    try { var ss = this.getScreenSizePx(); sw = ss.w; sh = ss.h; } catch (eScreen) {}
  }
  var isLandscape = sw > sh;
  var isCompactWidth = sw < this.dp(600);
  var isMediumWidth = sw >= this.dp(600) && sw < this.dp(840);
  var isExpandedWidth = sw >= this.dp(840) && sw < this.dp(1200);
  var isWideWidth = sw >= this.dp(1200);
  return {
    screenW: sw, screenH: sh, isLandscape: isLandscape,
    isCompactWidth: isCompactWidth, isMediumWidth: isMediumWidth,
    isExpandedWidth: isExpandedWidth, isWideWidth: isWideWidth,
    contentMaxWidth: isWideWidth ? this.dp(1080) : (isExpandedWidth ? this.dp(960) : (isMediumWidth ? this.dp(680) : this.dp(560))),
    gridColumnCount: (isExpandedWidth || isWideWidth) ? 2 : 1,
    useSideBySide: isLandscape && (isExpandedWidth || isWideWidth),
    leftPaneWidth: isWideWidth ? this.dp(340) : this.dp(300),
    outerRadius: (isExpandedWidth || isWideWidth) ? this.dp(30) : this.dp(26),
    cardRadius: (isExpandedWidth || isWideWidth) ? this.dp(20) : this.dp(24),
    itemRadius: (isExpandedWidth || isWideWidth) ? this.dp(16) : this.dp(18),
    shellPadding: (isExpandedWidth || isWideWidth) ? this.dp(4) : this.dp(6),
    cardGap: (isExpandedWidth || isWideWidth) ? this.dp(14) : this.dp(8),
    topBarHeight: (isLandscape && isCompactWidth) ? this.dp(50) : this.dp(56)
  };
};

FloatBallAppWM.prototype.getToolAppBackGestureMode = function() {
  var mode = "surface";
  try { mode = String(this.config.TOOLAPP_BACK_GESTURE_MODE || "surface"); } catch(e) { mode = "surface"; }
  if (mode !== "edge" && mode !== "surface" && mode !== "off") mode = "surface";
  return mode;
};

FloatBallAppWM.prototype.isToolAppBackInteractiveView = function(v) {
  try {
    if (!v) return false;
    try { if (v instanceof android.widget.SeekBar) return true; } catch(eSeek) {}
    try { if (v instanceof android.widget.CompoundButton) return true; } catch(eComp) {}
    try { if (v instanceof android.widget.Switch) return true; } catch(eSw) {}
    try { if (v instanceof android.widget.EditText) return true; } catch(eEdit) {}
    try { if (v instanceof android.widget.Button) return true; } catch(eBtn) {}
    try { if (v instanceof android.widget.AbsListView) return true; } catch(eAbs) {}
    try { if (v instanceof android.widget.ListView) return true; } catch(eList) {}
    try { if (v instanceof android.widget.HorizontalScrollView) return true; } catch(eHsv) {}
    try {
      var rvCls = java.lang.Class.forName("androidx.recyclerview.widget.RecyclerView");
      if (rvCls && rvCls.isInstance(v)) return true;
    } catch(eRv1) {}
    try {
      var rvCls2 = java.lang.Class.forName("android.support.v7.widget.RecyclerView");
      if (rvCls2 && rvCls2.isInstance(v)) return true;
    } catch(eRv2) {}
    // 不把所有 clickable/longClickable 都当成阻断项：ToolHub 大量卡片/容器为了 ripple 都会 setClickable(true)，
    // 若在 surface 横滑模式下阻断它们，几乎整页都会 rootBackBlocked=true，导致滑动返回一直触发不了。
    // DOWN 已经放行给子控件，只有超过横滑阈值后才拦截，所以保留按钮/Switch/SeekBar/EditText/列表等强交互控件即可。
    /* try { if (v.isClickable && v.isClickable()) return true; } catch(eClick) {} */
    /* try { if (v.isLongClickable && v.isLongClickable()) return true; } catch(eLong) {} */
  } catch(e) {}
  return false;
};

FloatBallAppWM.prototype.findToolAppTouchedChild = function(v, rawX, rawY) {
  try {
    if (!v || !v.getVisibility || v.getVisibility() !== android.view.View.VISIBLE) return null;
    var loc = java.lang.reflect.Array.newInstance(java.lang.Integer.TYPE, 2);
    try { v.getLocationOnScreen(loc); } catch(eLoc) { return null; }
    var l = Number(loc[0] || 0), t = Number(loc[1] || 0);
    var r = l + Number(v.getWidth ? v.getWidth() : 0);
    var b = t + Number(v.getHeight ? v.getHeight() : 0);
    if (rawX < l || rawX > r || rawY < t || rawY > b) return null;
    try {
      if (v instanceof android.view.ViewGroup) {
        var count = v.getChildCount ? v.getChildCount() : 0;
        for (var i = count - 1; i >= 0; i--) {
          var child = v.getChildAt(i);
          var hit = this.findToolAppTouchedChild(child, rawX, rawY);
          if (hit) return hit;
        }
      }
    } catch(eGroup) {}
    return v;
  } catch(e) {}
  return null;
};

FloatBallAppWM.prototype.isToolAppBackBlockedAt = function(root, rawX, rawY) {
  try {
    var v = this.findToolAppTouchedChild(root, rawX, rawY);
    while (v && v !== root) {
      if (this.isToolAppBackInteractiveView && this.isToolAppBackInteractiveView(v)) return true;
      try { v = v.getParent ? v.getParent() : null; } catch(eParent) { v = null; }
    }
  } catch(e) {}
  return false;
};

FloatBallAppWM.prototype.buildToolAppShell = function(contentView, title, canBack) {
  var self = this;
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getAnimalIslandTheme();
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  try { if (this.applySettingsTheme) this.applySettingsTheme(T, isDark, C, cfgTpl); } catch(eTheme) { safeLog(null, 'e', "catch " + String(eTheme)); }
  var spec = this.getToolAppResponsiveSpec ? this.getToolAppResponsiveSpec() : null;
  var shellPad = spec ? spec.shellPadding : this.dp(6);
  var outerRadius = spec ? spec.outerRadius : this.dp(26);
  var topBarHeight = spec ? spec.topBarHeight : this.dp(56);
  var rootDownX = 0;
  var rootDownY = 0;
  var rootDownRawX = 0;
  var rootDownRawY = 0;
  var rootEdge = -1;
  var rootBackMode = "surface";
  var rootBackActive = false;
  var rootBackEligible = false;
  var rootBackBlocked = false;
  var rootBackMoved = false;
  var root = new JavaAdapter(android.widget.FrameLayout, {
    onInterceptTouchEvent: function(ev) {
      try {
        if (!ev) return false;
        var action = ev.getActionMasked();
        if (action === android.view.MotionEvent.ACTION_DOWN) {
          rootDownX = ev.getX();
          rootDownY = ev.getY();
          rootDownRawX = ev.getRawX();
          rootDownRawY = ev.getRawY();
          rootBackActive = false;
          rootBackEligible = false;
          rootBackBlocked = false;
          rootBackMoved = false;
          rootEdge = -1;
          rootBackMode = self.getToolAppBackGestureMode ? self.getToolAppBackGestureMode() : "surface";
          if (rootBackMode === "off") return false;
          var canBackNow = !!(self.state && self.state.toolAppActive && self.hasToolAppBackTarget && self.hasToolAppBackTarget());
          if (!canBackNow) return false;
          var edgeW = self.getToolAppBackEdgeWidthPx ? self.getToolAppBackEdgeWidthPx() : self.dp(72);
          var rw = 0;
          try { rw = this.getWidth(); } catch(eW) { rw = 0; }
          if (rootBackMode === "edge") {
            if (rootDownX <= edgeW) { rootEdge = 0; rootBackEligible = true; }
            else if (rw > 0 && rootDownX >= rw - edgeW) { rootEdge = 1; rootBackEligible = true; }
          } else {
            rootBackEligible = true;
            rootBackBlocked = !!(self.isToolAppBackBlockedAt && self.isToolAppBackBlockedAt(this, rootDownRawX, rootDownRawY));
          }
          // DOWN 必须放行给子控件，surface 模式也不抢按钮/列表/Switch/SeekBar 原始点击。
          return false;
        }
        if (action === android.view.MotionEvent.ACTION_MOVE) {
          if (!rootBackEligible || rootBackBlocked || rootBackMode === "off") return false;
          if (!(self.hasToolAppBackTarget && self.hasToolAppBackTarget())) return false;
          var dx = ev.getX() - rootDownX;
          var dy = ev.getY() - rootDownY;
          var adx = Math.abs(dx);
          var ady = Math.abs(dy);
          var edge = rootEdge;
          var validDir = false;
          if (rootBackMode === "surface") {
            edge = dx >= 0 ? 0 : 1;
            validDir = (dx !== 0);
          } else {
            validDir = (edge === 0 && dx > 0) || (edge === 1 && dx < 0);
          }
          var shouldIntercept = false;
          if (rootBackMode === "surface") {
            shouldIntercept = validDir && adx > self.dp(48) && adx > ady * 1.2;
          } else {
            var slopDp = Number(self.config.CLICK_SLOP_DP || 6);
            if (isNaN(slopDp)) slopDp = 6;
            if (slopDp < 1) slopDp = 1;
            if (slopDp > 40) slopDp = 40;
            var touchSlop = Math.max(self.dp(8), self.dp(slopDp));
            shouldIntercept = validDir && adx > touchSlop && adx > ady * 0.75;
          }
          if (shouldIntercept) {
            rootEdge = edge;
            rootBackActive = true;
            rootBackMoved = true;
            try { self.prepareToolAppBackPreview(edge); } catch(ePrep) { try { safeLog(self.L, 'w', 'root back preview prepare fail: ' + String(ePrep)); } catch(eLogPrep) {} }
            try {
              var triggerDp0 = Number(self.config.TOOLAPP_BACK_PROGRESS_DISTANCE_DP || 96);
              if (isNaN(triggerDp0)) triggerDp0 = 96;
              if (triggerDp0 < 1) triggerDp0 = 1;
              if (triggerDp0 > 720) triggerDp0 = 720;
              var triggerDistance0 = self.dp(triggerDp0);
              var p0 = Math.min(1, adx / triggerDistance0);
              self.applyToolAppBackPreviewProgress(edge, p0, adx);
            } catch(eFirstMove) {}
            try { safeLog(self.L, 'd', 'root back intercept mode=' + String(rootBackMode) + ' edge=' + String(edge) + ' dx=' + String(dx)); } catch(eMoveLog) {}
            return true;
          }
          return false;
        }
        return false;
      } catch(e) {
        try { safeLog(self.L, 'w', 'tool app root intercept fail: ' + String(e)); } catch(eLog) {}
      }
      return false;
    },
    onTouchEvent: function(ev) {
      try {
        if (!ev) return false;
        var action = ev.getActionMasked();
        if (!rootBackActive) return false;
        if (action === android.view.MotionEvent.ACTION_MOVE) {
          var mx = ev.getX() - rootDownX;
          var my = ev.getY() - rootDownY;
          var validDir2 = (rootEdge === 0 && mx > 0) || (rootEdge === 1 && mx < 0);
          var dominance = rootBackMode === "surface" ? 1.2 : 0.75;
          if (validDir2 && Math.abs(mx) > Math.abs(my) * dominance) {
            var triggerDp = Number(self.config.TOOLAPP_BACK_PROGRESS_DISTANCE_DP || 96);
            if (isNaN(triggerDp)) triggerDp = 96;
            if (triggerDp < 1) triggerDp = 1;
            if (triggerDp > 720) triggerDp = 720;
            var triggerDistance = self.dp(triggerDp);
            var p = Math.min(1, Math.abs(mx) / triggerDistance);
            self.applyToolAppBackPreviewProgress(rootEdge, p, Math.abs(mx));
          }
          return true;
        }
        if (action === android.view.MotionEvent.ACTION_UP || action === android.view.MotionEvent.ACTION_CANCEL) {
          var ux = ev.getX() - rootDownX;
          var uy = ev.getY() - rootDownY;
          var commitDp = Number(self.config.TOOLAPP_BACK_COMMIT_DISTANCE_DP || 36);
          if (isNaN(commitDp)) commitDp = 36;
          if (commitDp < 1) commitDp = 1;
          if (commitDp > 480) commitDp = 480;
          var completeDistance = self.dp(commitDp);
          var okDir = (rootEdge === 0 && ux > completeDistance) || (rootEdge === 1 && ux < -completeDistance);
          var ratio = rootBackMode === "surface" ? 1.2 : 0.75;
          var ok = (action === android.view.MotionEvent.ACTION_UP) && rootBackMoved && okDir && Math.abs(ux) > Math.abs(uy) * ratio;
          var edgeDone = rootEdge;
          rootBackActive = false;
          rootBackEligible = false;
          rootBackBlocked = false;
          rootBackMoved = false;
          rootEdge = -1;
          self.finishToolAppBackPreview(edgeDone, ok);
          return true;
        }
        return true;
      } catch(e2) {
        try { self.clearToolAppBackPreview(true); } catch(eClear) {}
        try { safeLog(self.L, 'w', 'tool app root back touch fail: ' + String(e2)); } catch(eLog2) {}
      }
      rootBackActive = false;
      rootBackEligible = false;
      rootBackBlocked = false;
      rootBackMoved = false;
      rootEdge = -1;
      return false;
    }
  }, context);
  var body = new android.widget.LinearLayout(context);
  body.setOrientation(android.widget.LinearLayout.VERTICAL);
  // 外层薄荷容器本身就是整张“岛屿设置”卡片：四角统一圆角，并给底部留出完整收口。
  body.setPadding(shellPad, shellPad, shellPad, shellPad);
  body.setBackground(this.ui.createStrokeDrawable(T.bg, this.withAlpha(T.stroke, isDark ? 0.30 : 0.46), this.dp(1), outerRadius));
  try { body.setClipToOutline(true); } catch(eClip) {}
  try { body.setElevation(this.dp((spec && (spec.isExpandedWidth || spec.isWideWidth)) ? 7 : 10)); } catch(eElev) { safeLog(null, 'e', "catch " + String(eElev)); }
  root.addView(body, new android.widget.FrameLayout.LayoutParams(-1, -1));

  var bar = new android.widget.LinearLayout(context);
  bar.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  bar.setGravity(android.view.Gravity.CENTER_VERTICAL);
  bar.setPadding(this.dp(10), (spec && spec.isLandscape) ? this.dp(6) : this.dp(10), this.dp(10), this.dp(6));
  bar.setBackground(this.ui.createStrokeDrawable(T.card, this.withAlpha(T.stroke, isDark ? 0.30 : 0.45), this.dp(1), this.dp(20)));
  try { bar.setElevation(this.dp((spec && (spec.isExpandedWidth || spec.isWideWidth)) ? 1 : 2)); } catch(eBarElev) {}

  var btnBack = this.ui.createFlatButton(this, "‹", T.brown, function() {
    self.popToolAppPage("topbar");
  });
  btnBack.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 24);
  btnBack.setPadding(this.dp(8), 0, this.dp(8), 0);
  try { btnBack.setBackground(this.ui.createStrokeDrawable(T.primarySoft, this.withAlpha(T.primaryDeep, isDark ? 0.30 : 0.22), this.dp(1), this.dp(18))); } catch(eBackBg) {}
  bar.addView(btnBack, new android.widget.LinearLayout.LayoutParams(this.dp(42), this.dp(38)));

  var tvTitle = new android.widget.TextView(context);
  tvTitle.setText(String(title || "ToolHub"));
  tvTitle.setTextColor(T.text);
  tvTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 17);
  tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);
  tvTitle.setGravity(android.view.Gravity.CENTER);
  var titleLp = new android.widget.LinearLayout.LayoutParams(0, -1);
  titleLp.weight = 1;
  bar.addView(tvTitle, titleLp);

  var btnClose = this.ui.createFlatButton(this, "📖 岛务手册", T.primaryDeep, function() {
    try {
      if (String(self.state.toolAppRoute || "") === "settings") {
        var intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
        intent.setData(android.net.Uri.parse("https://xin-blog.com/114.html"));
        intent.setFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
        return;
      }
    } catch(eDoc) { try { self.toast("无法打开文档链接"); } catch(eToast) {} return; }
    self.closeToolApp();
  });
  btnClose.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  btnClose.setTypeface(null, android.graphics.Typeface.BOLD);
  btnClose.setPadding(this.dp(10), 0, this.dp(10), 0);
  try { btnClose.setBackground(this.ui.createStrokeDrawable(T.primarySoft, this.withAlpha(T.primaryDeep, isDark ? 0.30 : 0.22), this.dp(1), this.dp(18))); } catch(eRightBg) {}
  bar.addView(btnClose, new android.widget.LinearLayout.LayoutParams(this.dp(104), this.dp(38)));
  var barLp = new android.widget.LinearLayout.LayoutParams(-1, topBarHeight);
  barLp.setMargins(this.dp(8), this.dp(8), this.dp(8), this.dp(4));
  body.addView(bar, barLp);

  var host = new android.widget.FrameLayout(context);
  if (contentView) {
    try { contentView.setBackground(null); } catch(eBg) { safeLog(null, 'e', "catch " + String(eBg)); }
    try { contentView.setElevation(0); } catch(eEl) { safeLog(null, 'e', "catch " + String(eEl)); }
    host.addView(contentView, new android.widget.FrameLayout.LayoutParams(-1, -1));
  }
  var hostLp = new android.widget.LinearLayout.LayoutParams(-1, 0, 1);
  hostLp.setMargins((spec && (spec.isExpandedWidth || spec.isWideWidth)) ? this.dp(4) : this.dp(6), 0, (spec && (spec.isExpandedWidth || spec.isWideWidth)) ? this.dp(4) : this.dp(6), (spec && (spec.isExpandedWidth || spec.isWideWidth)) ? this.dp(4) : this.dp(6));
  body.addView(host, hostLp);

  // 兼容旧设置：不再添加页面内透明返回热区。
  // 返回手势由 root.onInterceptTouchEvent 延迟拦截；surface 模式会排除交互控件，edge 模式保留边缘起手。
  try {
    this.state.toolAppInnerBackLeftStrip = null;
    this.state.toolAppInnerBackRightStrip = null;
  } catch (eStrip) { safeLog(this.L, 'w', "clear edge back strip state fail: " + String(eStrip)); }

  this.state.toolAppRoot = root;
  this.state.toolAppBody = body;
  this.state.toolAppContentHost = host;
  this.state.toolAppTitleView = tvTitle;
  this.state.toolAppBackButton = btnBack;
  this.state.toolAppRightButton = btnClose;
  this.updateToolAppShellChrome(title, canBack);
  return root;
};

FloatBallAppWM.prototype.updateToolAppInnerBackEdgeWidth = function() {
  try {
    var w = this.getToolAppBackEdgeWidthPx ? this.getToolAppBackEdgeWidthPx() : this.dp(48);

    var left = this.state.toolAppInnerBackLeftStrip;
    var right = this.state.toolAppInnerBackRightStrip;

    if (left) {
      var lpL = left.getLayoutParams();
      if (lpL) {
        lpL.width = w;
        left.setLayoutParams(lpL);
      }
    }

    if (right) {
      var lpR = right.getLayoutParams();
      if (lpR) {
        lpR.width = w;
        right.setLayoutParams(lpR);
      }
    }

    return true;
  } catch(e) {
    safeLog(this.L, "w", "update inner back edge width fail: " + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.ensureToolAppShell = function() {
  try {
    if (this.state.toolAppRoot && this.state.toolAppContentHost) return this.state.toolAppRoot;
    return this.buildToolAppShell(null, "ToolHub", false);
  } catch (e) {
    safeLog(this.L, 'e', "ensureToolAppShell fail: " + String(e));
  }
  return null;
};

FloatBallAppWM.prototype.updateToolAppShellChrome = function(title, canBack) {
  try {
    var r = String(this.state.toolAppRoute || "");
    var titleText = String(title || "ToolHub");
    if (r === "settings") titleText = "❧ 岛屿设置 ❧";
    var hasBack = false;
    try { hasBack = !!(this.hasToolAppBackTarget && this.hasToolAppBackTarget()); } catch(eHasBack) { hasBack = !!canBack; }
    if (this.state.toolAppTitleView) this.state.toolAppTitleView.setText(titleText);
    if (this.state.toolAppBackButton) {
      this.state.toolAppBackButton.setText(hasBack ? "‹" : "✕");
      this.state.toolAppBackButton.setVisibility(android.view.View.VISIBLE);
      this.state.toolAppBackButton.setEnabled(true);
      try { this.state.toolAppBackButton.setAlpha(1.0); } catch(eAlpha) {}
    }
    if (this.state.toolAppRightButton) {
      if (r === "settings") this.state.toolAppRightButton.setText("📖 岛务手册");
      else this.state.toolAppRightButton.setText("✕");
    }
  } catch (e) { safeLog(this.L, 'w', "updateToolAppShellChrome fail: " + String(e)); }
};

FloatBallAppWM.prototype.setToolAppContent = function(contentView) {
  try {
    var host = this.state.toolAppContentHost;
    if (!host || !contentView) return false;
    host.removeAllViews();
    try { contentView.setBackground(null); } catch(eBg) { safeLog(null, 'e', "catch " + String(eBg)); }
    try { contentView.setElevation(0); } catch(eEl) { safeLog(null, 'e', "catch " + String(eEl)); }
    host.addView(contentView, new android.widget.FrameLayout.LayoutParams(-1, -1));
    return true;
  } catch (e) {
    safeLog(this.L, 'e', "setToolAppContent fail: " + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.calculateToolAppLayout = function(shell) {
  var sw = Math.max(1, Number(this.state.screen && this.state.screen.w || 0));
  var sh = Math.max(1, Number(this.state.screen && this.state.screen.h || 0));
  if (sw <= 1 || sh <= 1) {
    try { var ss = this.getScreenSizePx(); sw = ss.w; sh = ss.h; } catch (eScreen) {}
  }
  var spec = this.getToolAppResponsiveSpec ? this.getToolAppResponsiveSpec() : null;
  var isLandscape = spec ? spec.isLandscape : (sw > sh);
  var shortSide = Math.min(sw, sh);
  var longSide = Math.max(sw, sh);
  var marginX = this.dp(12), marginTop = this.dp(14), marginBottom = this.dp(14);
  var targetW, targetH;
  if (spec && (spec.isCompactWidth || shortSide < this.dp(420))) {
    marginX = this.dp(isLandscape ? 8 : 10); marginTop = this.dp(isLandscape ? 6 : 14); marginBottom = this.dp(isLandscape ? 6 : 14);
    targetW = Math.min(spec.contentMaxWidth, sw - marginX * 2);
    targetH = isLandscape ? (sh - marginTop - marginBottom) : Math.min(Math.floor(sh * 0.92), sh - marginTop - marginBottom);
  } else if (spec && spec.isMediumWidth) {
    marginX = this.dp(18); marginTop = this.dp(isLandscape ? 10 : 18); marginBottom = this.dp(isLandscape ? 10 : 18);
    targetW = Math.min(spec.contentMaxWidth, sw - marginX * 2); targetH = sh - marginTop - marginBottom;
  } else if (spec && (spec.isExpandedWidth || shortSide >= this.dp(720))) {
    marginX = this.dp(22); marginTop = this.dp(isLandscape ? 18 : 24); marginBottom = this.dp(isLandscape ? 18 : 24);
    targetW = Math.min(spec.contentMaxWidth, sw - marginX * 2); targetH = sh - marginTop - marginBottom;
  } else {
    marginX = this.dp(30); marginTop = this.dp(24); marginBottom = this.dp(24);
    targetW = Math.min(spec ? spec.contentMaxWidth : this.dp(1080), sw - marginX * 2);
    targetH = Math.min(this.dp(860), sh - marginTop - marginBottom);
  }
  targetW = Math.max(this.dp(300), Math.min(targetW, sw - marginX * 2));
  targetH = Math.max(this.dp(320), Math.min(targetH, sh - marginTop - marginBottom));
  var x = Math.floor((sw - targetW) / 2);
  var y = Math.floor((sh - targetH) / 2);
  if (x < marginX) x = marginX;
  if (y < marginTop) y = marginTop;
  if (x + targetW > sw - marginX) x = Math.max(0, sw - marginX - targetW);
  if (y + targetH > sh - marginBottom) y = Math.max(0, sh - marginBottom - targetH);
  if (spec) this.state.toolAppResponsiveSpec = spec;
  return { width: targetW, height: targetH, x: x, y: y, marginX: marginX, marginTop: marginTop, marginBottom: marginBottom, isLandscape: isLandscape, shortSide: Math.min(sw, sh), longSide: Math.max(sw, sh) };
};

FloatBallAppWM.prototype.showToolApp = function(route, resetStack) {
  if (this.state.closing) return;
  var r = this.isToolAppRoute(route) ? String(route) : "settings";
  try {
    this.touchActivity();
    this.hideMainPanel();
    this.hideSettingsPanel();
    this.showMask();
    this.state.toolAppActive = true;
    this.state.toolAppRoute = r;
    if (r === "settings") this.state.settingsGroupKey = null;
    if (resetStack && r === "settings") {
      this.state.pendingUserCfg = null;
      this.state.pendingDirty = false;
      this.state.previewMode = false;
    }
    if (resetStack || !this.state.toolAppNavStack || !this.state.toolAppNavStack.length) {
      this.state.toolAppNavStack = [this.makeToolAppStackEntry(r)];
    }

    var raw = this.buildPanelView(r);
    var shell = this.ensureToolAppShell();
    if (!shell) throw "ToolApp shell missing";
    this.updateToolAppShellChrome(this.getToolAppTitle(r), this.state.toolAppNavStack.length > 1);
    this.setToolAppContent(raw);

    var layout = this.calculateToolAppLayout(shell);
    var lp0 = shell.getLayoutParams();
    if (!lp0) lp0 = new android.view.ViewGroup.LayoutParams(layout.width, layout.height);
    lp0.width = layout.width; lp0.height = layout.height;
    shell.setLayoutParams(lp0);

    if (!this.state.addedViewer || this.state.viewerPanel !== shell) {
      this.addPanel(shell, layout.x, layout.y, "tool_app");
    } else {
      try {
        if (this.state.viewerPanelLp) {
          this.state.viewerPanelLp.width = layout.width;
          this.state.viewerPanelLp.height = layout.height;
          this.state.viewerPanelLp.x = layout.x;
          this.state.viewerPanelLp.y = layout.y;
          this.state.wm.updateViewLayout(shell, this.state.viewerPanelLp);
        }
      } catch (eUpd) { safeLog(this.L, 'w', "tool_app update layout fail: " + String(eUpd)); }
      try { shell.requestFocus(); } catch (eFocus) {}
    }
    try { this.refreshToolAppScreenBackStrips(); } catch (eScreenBack) { safeLog(this.L, 'w', "screen edge back strip update fail: " + String(eScreenBack)); }
  } catch (e) {
    this.state.toolAppActive = false;
    safeLog(this.L, 'e', "showToolApp fail route=" + r + " err=" + String(e));
    try { this.toast("设置页面显示失败: " + String(e)); } catch(et) {}
  }
};

FloatBallAppWM.prototype.pushToolAppPage = function(route) {
  if (!this.isToolAppRoute(route)) return;
  if (!this.state.toolAppNavStack) this.state.toolAppNavStack = [];
  if (this.state.toolAppNavStack.length <= 0) {
    this.state.toolAppNavStack.push(this.makeToolAppStackEntry(this.state.toolAppRoute || "settings"));
  }
  var nextEntry = this.makeToolAppStackEntry(route);
  this.state.toolAppNavStack.push(nextEntry);
  if (this.applyToolAppPageSnapshot) this.applyToolAppPageSnapshot(nextEntry);
  this.showToolApp(route, false);
};

FloatBallAppWM.prototype.pushToolAppSettingsGroup = function(groupKey) {
  this.state.settingsGroupKey = String(groupKey || "");
  this.pushToolAppPage("settings_group");
};

FloatBallAppWM.prototype.replaceToolAppPage = function(route) {
  if (!this.isToolAppRoute(route)) return;
  var entry = this.makeToolAppStackEntry(route);
  if (!this.state.toolAppNavStack || !this.state.toolAppNavStack.length) this.state.toolAppNavStack = [entry];
  else this.state.toolAppNavStack[this.state.toolAppNavStack.length - 1] = entry;
  if (this.applyToolAppPageSnapshot) this.applyToolAppPageSnapshot(entry);
  this.showToolApp(route, false);
};

FloatBallAppWM.prototype.popToolAppPage = function(reason) {
  try {
    var curRoute = this.state.toolAppRoute ? String(this.state.toolAppRoute) : "";
    try {
      var specBack = this.getSettingsResponsiveSpec ? this.getSettingsResponsiveSpec() : null;
      if (curRoute === "settings" && specBack && specBack.useSideBySide && this.state.settingsHomeSelectedItemId) {
        this.state.settingsHomeSelectedItemId = null;
        if (this.state.toolAppNavStack && this.state.toolAppNavStack.length > 0) {
          this.state.toolAppNavStack[this.state.toolAppNavStack.length - 1] = this.makeToolAppStackEntry("settings");
        }
        this.showToolApp("settings", false);
        return true;
      }
    } catch(ePaneBack) {}
    if (!this.state.toolAppNavStack || this.state.toolAppNavStack.length <= 1) {
      this.closeToolApp();
      return true;
    }
    this.state.toolAppNavStack.pop();
    var top = this.state.toolAppNavStack[this.state.toolAppNavStack.length - 1];
    var target = this.cloneToolAppPageSnapshot ? this.cloneToolAppPageSnapshot(top) : top;
    var nextRoute = target && target.route ? String(target.route) : "settings";
    if (this.applyToolAppPageSnapshot) this.applyToolAppPageSnapshot(target);
    this.showToolApp(nextRoute, false);
    return true;
  } catch (e) {
    safeLog(this.L, 'e', "popToolAppPage fail reason=" + String(reason || "") + " err=" + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.showPanelAvoidBall = function(which) {
  if (this.state.closing) return;

  // 设置入口先走 AppShell + 页面栈；子页面在 AppShell 内刷新，逐步替换旧多浮窗模式。
  if (this.isToolAppRoute && this.isToolAppRoute(which)) {
    if (which === "settings" && !this.state.toolAppActive) {
      this.showToolApp("settings", true);
      return;
    }
    if (this.state.toolAppActive) {
      this.replaceToolAppPage(which);
      return;
    }
  }

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
              "schema_editor": "高级蓝图"
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
  var velocityTracker = null;
  var lastUpdateTs = 0;
  var downDocked = false;
  var downDockSide = null;
  var startRawX = 0;
  var startRawY = 0;
  var logicalDownX = 0;
  var logicalDownY = 0;
  var grabOffsetX = 0;
  var grabOffsetY = 0;

  function recycleVelocityTracker() {
    try { if (velocityTracker) velocityTracker.recycle(); } catch (e) { safeLog(null, "e", "velocityTracker recycle fail: " + String(e)); }
    velocityTracker = null;
  }

  function cancelBallAnimator() {
    try {
      if (self.state.ballAnimator) {
        self.state.ballAnimator.cancel();
        self.state.ballAnimator = null;
      }
      if (self.state.ballContent) {
        try { self.state.ballContent.animate().cancel(); } catch (eAnim) {}
        try { self.state.ballContent.setScaleX(1.0); self.state.ballContent.setScaleY(1.0); } catch (eScale) {}
      }
    } catch (e) { safeLog(null, "e", "cancelBallAnimator fail: " + String(e)); }
  }

  function getLogicalBallX(di) {
    try {
      if (self.state.docked) {
        if (self.state.dockSide === "right") return self.state.screen.w - di.ballSize;
        return 0;
      }
      return self.state.ballLp.x;
    } catch (e) { return 0; }
  }


  return new JavaAdapter(android.view.View.OnTouchListener, {
    onTouch: function(v, e) {
      if (self.state.closing) return false;

      var a = e.getAction();
      var di = self.getDockInfo();

      if (a === android.view.MotionEvent.ACTION_DOWN) {
        recycleVelocityTracker();
        try {
          velocityTracker = android.view.VelocityTracker.obtain();
          velocityTracker.addMovement(e);
        } catch (eVT) { velocityTracker = null; }

        self.touchActivity();
        cancelBallAnimator();
        try { v.setAlpha(1.0); } catch (eA0) {}
        try { v.setPressed(true); } catch (eP0) {}
        try { v.drawableHotspotChanged(e.getX(), e.getY()); } catch (eH0) {}

        downDocked = !!self.state.docked;
        downDockSide = self.state.dockSide;
        startRawX = e.getRawX();
        startRawY = e.getRawY();
        logicalDownX = getLogicalBallX(di);
        logicalDownY = self.state.ballLp.y;
        grabOffsetX = startRawX - logicalDownX;
        grabOffsetY = startRawY - logicalDownY;

        self.state.rawX = startRawX;
        self.state.rawY = startRawY;
        self.state.downX = logicalDownX;
        self.state.downY = logicalDownY;
        self.state.dragging = false;
        lastUpdateTs = 0;

        if (self.config.ENABLE_ANIMATIONS && !downDocked) {
          try { v.animate().cancel(); v.animate().scaleX(0.9).scaleY(0.9).setDuration(100).start(); }
          catch (eS0) { safeLog(null, "e", "press scale fail: " + String(eS0)); }
        } else {
          try { v.animate().cancel(); v.setScaleX(1.0); v.setScaleY(1.0); } catch (eS1) {}
        }

        self.armLongPress();
        return true;
      }

      try { if (velocityTracker) velocityTracker.addMovement(e); } catch (eVT2) {}

      if (a === android.view.MotionEvent.ACTION_MOVE) {
        self.touchActivity();
        var curRawX = e.getRawX();
        var curRawY = e.getRawY();
        var dx = Math.round(curRawX - startRawX);
        var dy = Math.round(curRawY - startRawY);

        var longPressMoveSlopDp = Number(self.config.LONG_PRESS_TRIGGERED_MOVE_SLOP_DP || 28);
        if (isNaN(longPressMoveSlopDp)) longPressMoveSlopDp = 28;
        if (longPressMoveSlopDp < 8) longPressMoveSlopDp = 8;
        if (longPressMoveSlopDp > 80) longPressMoveSlopDp = 80;
        var longPressMoveSlop = self.dp(longPressMoveSlopDp);

        if (self.state.longPressTriggered) {
          // 长按已经触发设置页后，手指未抬起期间的移动全部消费，避免进入普通拖动逻辑并误关设置页。
          if (Math.abs(dx) <= longPressMoveSlop && Math.abs(dy) <= longPressMoveSlop) {
            return true;
          }
          return true;
        }

        if (!self.state.dragging) {
          if (Math.abs(dx) > slop || Math.abs(dy) > slop) {
            self.state.dragging = true;
            self.cancelLongPressTimer();
            try { self.hideAllPanels(); } catch (eHide) {}
            cancelBallAnimator();
            // 吸边态拖拽不再弹出完整球；先保持可见条沿边移动，彻底避免“弹到手指处”的首帧闪现。
          }
        }

        if (self.state.dragging) {
          if (downDocked) {
            var edgeY = self.clamp(logicalDownY + dy, 0, self.state.screen.h - di.ballSize);
            self.state.docked = true;
            self.state.dockSide = downDockSide || self.state.dockSide || "right";
            self.state.ballLp.width = di.visiblePx;
            self.state.ballLp.y = edgeY;
            if (self.state.dockSide === "left") {
              self.state.ballLp.x = 0;
              try { self.state.ballContent.setX(-di.hiddenPx); } catch (eLX) {}
            } else {
              self.state.ballLp.x = self.state.screen.w - di.visiblePx;
              try { self.state.ballContent.setX(0); } catch (eRX) {}
            }
            try { self.state.ballContent.setAlpha(1.0); } catch (eAEdge) {}
          } else {
            var targetX = Math.round(curRawX - grabOffsetX);
            var targetY = Math.round(curRawY - grabOffsetY);
            self.state.docked = false;
            self.state.dockSide = null;
            self.state.ballLp.width = di.ballSize;
            self.state.ballLp.x = self.clamp(targetX, 0, self.state.screen.w - di.ballSize);
            self.state.ballLp.y = self.clamp(targetY, 0, self.state.screen.h - di.ballSize);
            try { self.state.ballContent.setX(0); } catch (eX2) {}
            try { self.state.ballContent.setAlpha(1.0); } catch (eA2) {}
          }

          var now = java.lang.System.currentTimeMillis();
          if (lastUpdateTs === 0 || now - lastUpdateTs > 10) {
            try { self.state.wm.updateViewLayout(self.state.ballRoot, self.state.ballLp); }
            catch (eU) { safeLog(null, "e", "drag updateViewLayout fail: " + String(eU)); }
            lastUpdateTs = now;
          }
        }
        return true;
      }

      if (a === android.view.MotionEvent.ACTION_UP || a === android.view.MotionEvent.ACTION_CANCEL) {
        self.touchActivity();
        try { v.setPressed(false); } catch (eP2) {}
        self.cancelLongPressTimer();

        if (self.config.ENABLE_ANIMATIONS) {
          try { v.animate().cancel(); v.animate().scaleX(1.0).scaleY(1.0).setDuration(150).start(); }
          catch (eS2) { safeLog(null, "e", "release scale fail: " + String(eS2)); }
        } else {
          try { v.setScaleX(1); v.setScaleY(1); } catch (eS3) {}
        }

        if (self.state.longPressTriggered) {
          self.resetLongPressState();
          recycleVelocityTracker();
          return true;
        }

        if (!self.state.dragging && a === android.view.MotionEvent.ACTION_UP) {
          if (downDocked && self.state.docked) {
            try { self.undockToFull(false, null); } catch (eUndock) {}
          }
          try { self.playBounce(v); } catch (eB) {}
          if (self.state.addedPanel) self.hideMainPanel();
          else self.showPanelAvoidBall("main");
          if (self.L) self.L.i("click -> toggle main");
        } else if (self.state.dragging) {
          try { self.state.wm.updateViewLayout(self.state.ballRoot, self.state.ballLp); } catch (eU2) {}
          var forceSide = null;
          try {
            if (velocityTracker) {
              velocityTracker.computeCurrentVelocity(1000);
              var vx = velocityTracker.getXVelocity();
              if (vx > 1000) forceSide = "right";
              else if (vx < -1000) forceSide = "left";
            }
          } catch (eV) {}

          self.state.dragging = false;
          if (self.config.ENABLE_SNAP_TO_EDGE) self.snapToEdgeDocked(true, forceSide);
          else self.savePos(self.state.ballLp.x, self.state.ballLp.y);
        }

        recycleVelocityTracker();
        self.state.dragging = false;
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

