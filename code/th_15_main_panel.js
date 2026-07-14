// @version 1.0.1
// ToolHub - 主按钮面板第一阶段：顶部工具栏、自适应网格、安全区域与方向动画

var TOOLHUB_MAIN_PANEL_MODULE_LOADED = true;

FloatBallAppWM.prototype.getMainPanelSafeBounds = function() {
  var margin = this.dp(12);
  var sw = Number(this.state && this.state.screen ? this.state.screen.w : 0);
  var sh = Number(this.state && this.state.screen ? this.state.screen.h : 0);
  var left = margin;
  var top = margin;
  var right = Math.max(left + 1, sw - margin);
  var bottom = Math.max(top + 1, sh - margin);

  try {
    if (android.os.Build.VERSION.SDK_INT >= 30 && this.state && this.state.wm && this.state.wm.getCurrentWindowMetrics) {
      var metrics = this.state.wm.getCurrentWindowMetrics();
      var bounds = metrics.getBounds();
      var wi = metrics.getWindowInsets();
      var typeMask = android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.displayCutout();
      var insets = wi.getInsetsIgnoringVisibility(typeMask);
      left = Number(bounds.left) + Number(insets.left) + margin;
      top = Number(bounds.top) + Number(insets.top) + margin;
      right = Number(bounds.right) - Number(insets.right) - margin;
      bottom = Number(bounds.bottom) - Number(insets.bottom) - margin;
    }
  } catch (eMetrics) {
    safeLog(this.L, 'w', 'main panel safe bounds fallback: ' + String(eMetrics));
  }

  if (right <= left) { left = margin; right = Math.max(left + 1, sw - margin); }
  if (bottom <= top) { top = margin; bottom = Math.max(top + 1, sh - margin); }

  return {
    left: Math.floor(left),
    top: Math.floor(top),
    right: Math.floor(right),
    bottom: Math.floor(bottom),
    width: Math.max(1, Math.floor(right - left)),
    height: Math.max(1, Math.floor(bottom - top))
  };
};

FloatBallAppWM.prototype.getMainPanelResponsiveSpec = function() {
  var safe = this.getMainPanelSafeBounds();
  var density = Number(this.state.density || 1);
  if (density <= 0) density = 1;
  var safeWidthDp = safe.width / density;
  var landscape = safe.width > safe.height;
  var cols = 3;
  var targetWidthDp = 344;
  var gapDp = 8;
  var cardHeightDp = 78;

  if (safeWidthDp < 348) {
    cols = 2;
    targetWidthDp = 304;
    cardHeightDp = 78;
  } else if (safeWidthDp >= 600 || (landscape && safeWidthDp >= 520)) {
    cols = 4;
    targetWidthDp = 424;
    gapDp = 10;
    cardHeightDp = 80;
  }

  var panelWidth = Math.min(this.dp(targetWidthDp), safe.width);
  var panelPadding = this.dp(12);
  var gap = this.dp(gapDp);
  var innerWidth = Math.max(this.dp(200), panelWidth - panelPadding * 2);
  var cellArea = Math.floor(innerWidth / cols);
  var cardWidth = Math.max(this.dp(72), cellArea - gap);
  var rowUnit = this.dp(cardHeightDp) + gap;
  var headerHeight = this.dp(56);
  var footerHeight = this.dp(24);
  var maxPanelHeight = Math.min(
    safe.height,
    Math.max(this.dp(220), Math.floor(safe.height * 0.78))
  );
  var maxGridHeight = Math.max(rowUnit, maxPanelHeight - headerHeight - footerHeight - panelPadding * 2 - this.dp(8));
  var configuredRows = Number(this.config.PANEL_ROWS || 4);
  if (isNaN(configuredRows) || configuredRows < 1) configuredRows = 4;
  if (configuredRows > 6) configuredRows = 6;
  var visibleRows = Math.max(1, Math.min(configuredRows, Math.floor(maxGridHeight / rowUnit)));

  return {
    safe: safe,
    cols: cols,
    panelWidth: panelWidth,
    panelPadding: panelPadding,
    gap: gap,
    cardWidth: cardWidth,
    cardHeight: this.dp(cardHeightDp),
    rowUnit: rowUnit,
    headerHeight: headerHeight,
    footerHeight: footerHeight,
    visibleRows: visibleRows,
    maxPanelHeight: maxPanelHeight,
    maxGridHeight: maxGridHeight,
    landscape: landscape
  };
};

FloatBallAppWM.prototype.createMainPanelRippleBackground = function(fillColor, strokeColor, rippleColor, radiusPx) {
  try {
    var content = this.ui.createStrokeDrawable(fillColor, strokeColor, this.dp(1), radiusPx);
    if (android.os.Build.VERSION.SDK_INT >= 21) {
      var mask = this.ui.createRoundDrawable(android.graphics.Color.WHITE, radiusPx);
      var colors = android.content.res.ColorStateList.valueOf(rippleColor);
      return new android.graphics.drawable.RippleDrawable(colors, content, mask);
    }
    return content;
  } catch (e) {
    return this.ui.createRoundDrawable(fillColor, radiusPx);
  }
};

FloatBallAppWM.prototype.createMainPanelToolbarButton = function(text, description, onClick) {
  var self = this;
  var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
  var C = this.ui.colors;
  var textColor = T && T.onSurface2 ? T.onSurface2 : (this.isDarkTheme() ? C.textSecDark : C.textSecLight);
  var pressColor = this.withAlpha(textColor, this.isDarkTheme() ? 0.18 : 0.12);
  var v = new android.widget.TextView(context);
  v.setText(String(text || ''));
  v.setTextColor(textColor);
  v.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, text === '×' ? 23 : 19);
  v.setGravity(android.view.Gravity.CENTER);
  v.setPadding(0, 0, 0, 0);
  v.setMinWidth(this.dp(40));
  v.setMinimumWidth(this.dp(40));
  v.setMinHeight(this.dp(40));
  v.setMinimumHeight(this.dp(40));
  try { v.setIncludeFontPadding(false); } catch (ePad) {}
  try { v.setContentDescription(String(description || text || '')); } catch (eDesc) {}
  try { v.setBackground(this.ui.createTransparentRippleDrawable(pressColor, this.dp(12))); } catch (eBg) {}
  v.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(anchor) {
    self.touchActivity();
    self.guardClick('main_toolbar_' + String(description || text || ''), 220, function() {
      try { if (onClick) onClick(anchor || v); } catch (eClick) { safeLog(self.L, 'e', 'main toolbar click fail: ' + String(eClick)); }
    });
  }}));
  return v;
};

FloatBallAppWM.prototype.openMainPanelButtonManager = function(addNew) {
  try {
    this.hideMainPanel(true);
    this.state.editingButtonIndex = addNew ? -1 : null;
    this.state.keepBtnEditorState = !!addNew;
    if (this.showToolApp) this.showToolApp('btn_editor', true);
    else this.showPanelAvoidBall('btn_editor');
    return true;
  } catch (e) {
    safeLog(this.L, 'e', 'open button manager from main panel fail: ' + String(e));
    try { this.toast('无法打开按钮管理'); } catch (eToast) {}
  }
  return false;
};

FloatBallAppWM.prototype.showMainPanelMoreMenu = function(anchorView) {
  var self = this;
  try {
    if (this.state.activePopupDismiss) {
      try { this.state.activePopupDismiss(); } catch (eDismissOld) {}
    }
    var isDark = this.isDarkTheme();
    var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
    var C = this.ui.colors;
    var bgColor = T && T.surface ? T.surface : (isDark ? C.cardDark : C.cardLight);
    var textColor = T && T.onSurface ? T.onSurface : (isDark ? C.textPriDark : C.textPriLight);
    var strokeColor = T && T.outlineVariant ? this.withAlpha(T.outlineVariant, 0.34) : this.withAlpha(textColor, 0.20);
    var box = new android.widget.LinearLayout(context);
    box.setOrientation(android.widget.LinearLayout.VERTICAL);
    box.setPadding(this.dp(6), this.dp(6), this.dp(6), this.dp(6));
    box.setBackground(this.ui.createStrokeDrawable(bgColor, strokeColor, this.dp(1), this.dp(16)));
    try { box.setElevation(this.dp(10)); box.setClipToOutline(true); } catch (eElev) {}

    var popup = null;
    function addItem(label, action) {
      var row = new android.widget.TextView(context);
      row.setText(String(label));
      row.setTextColor(textColor);
      row.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
      row.setGravity(android.view.Gravity.CENTER_VERTICAL);
      row.setPadding(self.dp(14), 0, self.dp(14), 0);
      row.setMinHeight(self.dp(48));
      row.setBackground(self.ui.createTransparentRippleDrawable(self.withAlpha(textColor, isDark ? 0.15 : 0.09), self.dp(12)));
      row.setOnClickListener(new android.view.View.OnClickListener({ onClick: function() {
        try { if (popup) popup.dismiss(); } catch (eDismiss) {}
        try { action(); } catch (eAction) { safeLog(self.L, 'e', 'main more action fail: ' + String(eAction)); }
      }}));
      box.addView(row, new android.widget.LinearLayout.LayoutParams(-1, self.dp(48)));
    }

    addItem('按钮管理', function() { self.openMainPanelButtonManager(false); });
    addItem('刷新面板', function() {
      self.hideMainPanel(true);
      var run = new java.lang.Runnable({ run: function() { try { self.showPanelAvoidBall('main'); } catch (eShow) {} }});
      if (self.state.h) self.state.h.postDelayed(run, 90); else run.run();
    });
    addItem('帮助', function() {
      self.hideMainPanel(true);
      if (self.openToolHubManual) self.openToolHubManual();
    });

    popup = new android.widget.PopupWindow(box, this.dp(176), android.view.ViewGroup.LayoutParams.WRAP_CONTENT, true);
    popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
    popup.setOutsideTouchable(true);
    popup.setFocusable(true);
    try { popup.setElevation(this.dp(10)); } catch (ePopupElev) {}
    popup.setOnDismissListener(new android.widget.PopupWindow.OnDismissListener({ onDismiss: function() {
      try { if (self.state.activePopupDismiss) self.state.activePopupDismiss = null; } catch (eClear) {}
    }}));
    this.state.activePopupDismiss = function() { try { if (popup && popup.isShowing()) popup.dismiss(); } catch (eDismiss) {} };
    popup.showAsDropDown(anchorView, -this.dp(136), -this.dp(4));
    return true;
  } catch (e) {
    safeLog(this.L, 'w', 'show main panel more menu fail: ' + String(e));
    try { this.toast('更多菜单打开失败'); } catch (eToast) {}
  }
  return false;
};

FloatBallAppWM.prototype.updateMainPanelPageDots = function(dotViews, activeIndex) {
  try {
    if (!dotViews || !dotViews.length) return;
    var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
    var active = T && T.primary ? T.primary : this.ui.colors.primary;
    var inactive = T && T.outlineVariant ? this.withAlpha(T.outlineVariant, 0.42) : this.withAlpha(active, 0.28);
    for (var i = 0; i < dotViews.length; i++) {
      var size = this.dp(i === activeIndex ? 7 : 5);
      var lp = dotViews[i].getLayoutParams();
      lp.width = size;
      lp.height = size;
      dotViews[i].setLayoutParams(lp);
      dotViews[i].setBackground(this.ui.createRoundDrawable(i === activeIndex ? active : inactive, Math.floor(size / 2)));
    }
  } catch (e) {}
};

FloatBallAppWM.prototype.createMainPanelFunctionCard = function(item, spec, colors) {
  var self = this;
  var frame = new android.widget.FrameLayout(context);
  var gp = new android.widget.GridLayout.LayoutParams();
  gp.width = spec.cardWidth;
  gp.height = spec.cardHeight;
  var halfGap = Math.max(1, Math.floor(spec.gap / 2));
  gp.setMargins(halfGap, halfGap, halfGap, halfGap);
  frame.setLayoutParams(gp);
  frame.setClickable(true);
  frame.setFocusable(true);
  var radius = this.dp(14);
  frame.setBackground(this.createMainPanelRippleBackground(colors.card, colors.stroke, colors.ripple, radius));
  try { frame.setElevation(this.dp(this.isDarkTheme() ? 0 : 1)); frame.setClipToOutline(true); } catch (eElev) {}

  var body = new android.widget.LinearLayout(context);
  body.setOrientation(android.widget.LinearLayout.VERTICAL);
  body.setGravity(android.view.Gravity.CENTER);
  body.setPadding(this.dp(6), this.dp(7), this.dp(6), this.dp(6));
  frame.addView(body, new android.widget.FrameLayout.LayoutParams(-1, -1));

  var iconSize = this.dp(Math.max(24, Math.min(30, Number(this.config.PANEL_ICON_SIZE_DP || 28))));
  var iv = null;
  if (item.add) {
    var plus = new android.widget.TextView(context);
    plus.setText('+');
    plus.setTextColor(colors.secondaryText);
    plus.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 27);
    plus.setGravity(android.view.Gravity.CENTER);
    plus.setTypeface(null, android.graphics.Typeface.NORMAL);
    try { plus.setIncludeFontPadding(false); } catch (ePlusPad) {}
    body.addView(plus, new android.widget.LinearLayout.LayoutParams(iconSize, iconSize));
  } else {
    iv = new android.widget.ImageView(context);
    var dr = this.resolveIconDrawable(item.config);
    if (dr) iv.setImageDrawable(dr);
    iv.setScaleType(android.widget.ImageView.ScaleType.CENTER_INSIDE);
    body.addView(iv, new android.widget.LinearLayout.LayoutParams(iconSize, iconSize));
  }

  if (this.config.PANEL_LABEL_ENABLED !== false) {
    var tv = new android.widget.TextView(context);
    tv.setText(String(item.add ? '添加功能' : ((item.config && item.config.title) || '工具')));
    tv.setTextColor(item.add ? colors.secondaryText : colors.text);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, Math.max(10, Math.min(13, Number(this.config.PANEL_LABEL_TEXT_SIZE_SP || 12))));
    tv.setGravity(android.view.Gravity.CENTER);
    tv.setSingleLine(true);
    tv.setEllipsize(android.text.TextUtils.TruncateAt.END);
    try { tv.setIncludeFontPadding(false); } catch (eTextPad) {}
    var tvLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
    tvLp.topMargin = this.dp(Math.max(3, Number(this.config.PANEL_LABEL_TOP_MARGIN_DP || 4)));
    body.addView(tv, tvLp);
  }

  try { frame.setContentDescription(String(item.add ? '添加功能' : ((item.config && item.config.title) || '工具'))); } catch (eDesc) {}
  frame.setOnTouchListener(new android.view.View.OnTouchListener({ onTouch: function(v, event) {
    try {
      var action = event.getActionMasked();
      if (action === android.view.MotionEvent.ACTION_DOWN) {
        v.animate().cancel();
        v.animate().scaleX(0.97).scaleY(0.97).setDuration(70).start();
      } else if (action === android.view.MotionEvent.ACTION_UP || action === android.view.MotionEvent.ACTION_CANCEL) {
        v.animate().cancel();
        v.animate().scaleX(1).scaleY(1).setDuration(100).start();
      }
    } catch (eTouch) {}
    return false;
  }}));
  frame.setOnClickListener(new android.view.View.OnClickListener({ onClick: function() {
    self.touchActivity();
    if (item.add) {
      self.openMainPanelButtonManager(true);
      return;
    }
    self.hideMainPanel(true);
    self.execButtonAction(item.config, item.rawIndex);
  }}));
  return frame;
};

FloatBallAppWM.prototype.buildMainPanelView = function() {
  var self = this;
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
  var spec = this.getMainPanelResponsiveSpec();
  var alpha = Number(this.config.PANEL_BG_ALPHA || 0.90);
  if (isNaN(alpha)) alpha = 0.90;
  if (alpha < 0.35) alpha = 0.35;
  if (alpha > 1) alpha = 1;

  var panelBase = T && T.background ? T.background : (isDark ? C.bgDark : C.bgLight);
  var surface = T && T.surface2 ? T.surface2 : (T && T.surface ? T.surface : (isDark ? C.cardDark : C.cardLight));
  var text = T && T.onSurface ? T.onSurface : (isDark ? C.textPriDark : C.textPriLight);
  var secondaryText = T && T.onSurface2 ? T.onSurface2 : (isDark ? C.textSecDark : C.textSecLight);
  var outline = T && T.outlineVariant ? T.outlineVariant : (isDark ? C.dividerDark : C.dividerLight);
  var primary = T && T.primary ? T.primary : C.primary;
  var colors = {
    card: this.withAlpha(surface, isDark ? 0.78 : 0.94),
    stroke: this.withAlpha(outline, isDark ? 0.27 : 0.22),
    ripple: this.withAlpha(primary, isDark ? 0.22 : 0.14),
    text: text,
    secondaryText: secondaryText
  };

  var panel = new android.widget.LinearLayout(context);
  panel.setOrientation(android.widget.LinearLayout.VERTICAL);
  panel.setPadding(spec.panelPadding, this.dp(8), spec.panelPadding, this.dp(8));
  panel.setBackground(this.ui.createStrokeDrawable(
    this.withAlpha(panelBase, alpha),
    this.withAlpha(outline, isDark ? 0.30 : 0.24),
    this.dp(1),
    this.dp(22)
  ));
  try { panel.setElevation(this.dp(isDark ? 3 : 6)); panel.setClipToOutline(true); } catch (ePanelElev) {}
  panel.setLayoutParams(new android.view.ViewGroup.LayoutParams(spec.panelWidth, -2));

  var header = new android.widget.LinearLayout(context);
  header.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  header.setGravity(android.view.Gravity.CENTER_VERTICAL);
  header.setPadding(this.dp(4), 0, 0, 0);
  panel.addView(header, new android.widget.LinearLayout.LayoutParams(-1, spec.headerHeight));

  var titleBox = new android.widget.LinearLayout(context);
  titleBox.setOrientation(android.widget.LinearLayout.VERTICAL);
  titleBox.setGravity(android.view.Gravity.CENTER_VERTICAL);
  var titleLp = new android.widget.LinearLayout.LayoutParams(0, -1);
  titleLp.weight = 1;
  header.addView(titleBox, titleLp);

  var title = new android.widget.TextView(context);
  title.setText('ToolHub');
  title.setTextColor(text);
  title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
  title.setTypeface(null, android.graphics.Typeface.BOLD);
  title.setSingleLine(true);
  try { title.setIncludeFontPadding(false); } catch (eTitlePad) {}
  titleBox.addView(title, new android.widget.LinearLayout.LayoutParams(-1, -2));

  var statusLine = new android.widget.LinearLayout(context);
  statusLine.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  statusLine.setGravity(android.view.Gravity.CENTER_VERTICAL);
  var statusLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
  statusLp.topMargin = this.dp(2);
  titleBox.addView(statusLine, statusLp);
  var dot = new android.view.View(context);
  var dotSize = this.dp(6);
  dot.setBackground(this.ui.createRoundDrawable(android.graphics.Color.parseColor('#22C55E'), Math.floor(dotSize / 2)));
  statusLine.addView(dot, new android.widget.LinearLayout.LayoutParams(dotSize, dotSize));
  var statusText = new android.widget.TextView(context);
  statusText.setText('运行中');
  statusText.setTextColor(secondaryText);
  statusText.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 10);
  try { statusText.setIncludeFontPadding(false); } catch (eStatusPad) {}
  var statusTextLp = new android.widget.LinearLayout.LayoutParams(-2, -2);
  statusTextLp.leftMargin = this.dp(5);
  statusLine.addView(statusText, statusTextLp);

  header.addView(this.createMainPanelToolbarButton('⚙', '设置', function() {
    self.hideMainPanel(true);
    self.showPanelAvoidBall('settings');
  }), new android.widget.LinearLayout.LayoutParams(this.dp(40), this.dp(40)));
  header.addView(this.createMainPanelToolbarButton('≡', '编辑布局', function() {
    self.openMainPanelButtonManager(false);
  }), new android.widget.LinearLayout.LayoutParams(this.dp(40), this.dp(40)));
  header.addView(this.createMainPanelToolbarButton('⋮', '更多', function(v) {
    self.showMainPanelMoreMenu(v);
  }), new android.widget.LinearLayout.LayoutParams(this.dp(40), this.dp(40)));
  header.addView(this.createMainPanelToolbarButton('×', '关闭', function() {
    self.hideMainPanel();
  }), new android.widget.LinearLayout.LayoutParams(this.dp(40), this.dp(40)));

  var divider = new android.view.View(context);
  divider.setBackgroundColor(this.withAlpha(outline, isDark ? 0.22 : 0.16));
  var dividerLp = new android.widget.LinearLayout.LayoutParams(-1, 1);
  dividerLp.bottomMargin = this.dp(4);
  panel.addView(divider, dividerLp);

  var items = [];
  var raw = [];
  try { raw = (this.panels && this.panels[this.currentPanelKey]) ? this.panels[this.currentPanelKey] : []; } catch (eRaw) { raw = []; }
  for (var i = 0; i < raw.length; i++) {
    var b = raw[i];
    if (!b || b.enabled === false) continue;
    if (String(b.id || '') === 'builtin_settings' && String(b.type || '') === 'open_settings') continue;
    items.push({ config: b, rawIndex: i, add: false });
  }
  items.push({ config: null, rawIndex: -1, add: true });

  var rows = Math.max(1, Math.ceil(items.length / spec.cols));
  var visibleRows = Math.min(rows, spec.visibleRows);
  var gridHeight = visibleRows * spec.rowUnit;
  var pageCount = Math.max(1, Math.ceil(rows / visibleRows));

  var scroll = new android.widget.ScrollView(context);
  scroll.setFillViewport(false);
  scroll.setVerticalScrollBarEnabled(false);
  scroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
  scroll.setOnTouchListener(new android.view.View.OnTouchListener({ onTouch: function() { self.touchActivity(); return false; }}));
  panel.addView(scroll, new android.widget.LinearLayout.LayoutParams(-1, gridHeight));

  var grid = new android.widget.GridLayout(context);
  grid.setColumnCount(spec.cols);
  try { grid.setRowCount(rows); } catch (eRows) {}
  scroll.addView(grid, new android.widget.FrameLayout.LayoutParams(-1, -2));
  for (var j = 0; j < items.length; j++) {
    grid.addView(this.createMainPanelFunctionCard(items[j], spec, colors));
  }

  var footer = new android.widget.LinearLayout(context);
  footer.setOrientation(android.widget.LinearLayout.VERTICAL);
  footer.setGravity(android.view.Gravity.CENTER);
  panel.addView(footer, new android.widget.LinearLayout.LayoutParams(-1, spec.footerHeight));
  var dots = new android.widget.LinearLayout(context);
  dots.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  dots.setGravity(android.view.Gravity.CENTER);
  footer.addView(dots, new android.widget.LinearLayout.LayoutParams(-1, this.dp(14)));
  var dotViews = [];
  for (var p = 0; p < pageCount; p++) {
    var pageDot = new android.view.View(context);
    var pdLp = new android.widget.LinearLayout.LayoutParams(this.dp(5), this.dp(5));
    pdLp.leftMargin = this.dp(3);
    pdLp.rightMargin = this.dp(3);
    dots.addView(pageDot, pdLp);
    dotViews.push(pageDot);
  }
  this.updateMainPanelPageDots(dotViews, 0);

  var handle = new android.view.View(context);
  handle.setBackground(this.ui.createRoundDrawable(this.withAlpha(secondaryText, 0.38), this.dp(2)));
  var handleLp = new android.widget.LinearLayout.LayoutParams(this.dp(24), this.dp(3));
  handleLp.topMargin = this.dp(2);
  footer.addView(handle, handleLp);

  if (pageCount > 1 && android.os.Build.VERSION.SDK_INT >= 23) {
    try {
      scroll.setOnScrollChangeListener(new android.view.View.OnScrollChangeListener({ onScrollChange: function(v, sx, sy) {
        var pageHeight = Math.max(1, visibleRows * spec.rowUnit);
        var active = Math.round(Number(sy || 0) / pageHeight);
        if (active < 0) active = 0;
        if (active >= pageCount) active = pageCount - 1;
        self.updateMainPanelPageDots(dotViews, active);
      }}));
    } catch (eScrollListener) {}
  }

  this.state.mainPanelResponsiveSpec = spec;
  return panel;
};

FloatBallAppWM.prototype.getMainPanelPosition = function(pw, ph, bx, by, ballSize) {
  var safe = this.getMainPanelSafeBounds();
  var gap = this.dp(this.config.BALL_PANEL_GAP_DP || 10);
  var side = '';
  try { side = String(this.state.dockSide || ''); } catch (eSide) { side = ''; }
  if (side !== 'left' && side !== 'right') {
    try { side = String(this.config.BALL_POSITION_SIDE || ''); } catch (eCfgSide) { side = ''; }
  }
  if (side !== 'left' && side !== 'right') {
    side = (Number(bx) + Number(ballSize) / 2) <= Number(this.state.screen.w) / 2 ? 'left' : 'right';
  }

  var x;
  if (side === 'left') {
    x = Number(bx) + Number(ballSize) + gap;
    if (x + pw > safe.right) x = safe.right - pw;
    this.state.mainPanelExpandSide = 'from_left';
  } else {
    x = Number(bx) - pw - gap;
    if (x < safe.left) x = safe.left;
    this.state.mainPanelExpandSide = 'from_right';
  }
  x = this.clamp(Math.floor(x), safe.left, Math.max(safe.left, safe.right - pw));
  var ballCenterY = Number(by) + Number(ballSize) / 2;
  var y = Math.floor(ballCenterY - ph / 2);
  y = this.clamp(y, safe.top, Math.max(safe.top, safe.bottom - ph));
  this.state.mainPanelBallCenterY = ballCenterY;
  this.state.mainPanelPosition = { x: x, y: y, width: pw, height: ph, ballSide: side };
  return { x: x, y: y, type: side === 'left' ? 'right' : 'left' };
};

FloatBallAppWM.prototype.animateMainPanelEnter = function(panel, x, y) {
  try {
    if (!panel) return false;
    var fromLeft = String(this.state.mainPanelExpandSide || '') === 'from_left';
    var w = Number(panel.getWidth ? panel.getWidth() : 0);
    var h = Number(panel.getHeight ? panel.getHeight() : 0);
    if (w <= 0 && this.state.panelLp) w = Number(this.state.panelLp.width || 0);
    if (h <= 0 && this.state.panelLp) h = Number(this.state.panelLp.height || 0);
    var ballCenterY = Number(this.state.mainPanelBallCenterY || (Number(y) + h / 2));
    var pivotY = this.clamp(ballCenterY - Number(y), this.dp(24), Math.max(this.dp(24), h - this.dp(24)));
    panel.setPivotX(fromLeft ? 0 : Math.max(0, w));
    panel.setPivotY(pivotY);
    panel.setTranslationX(fromLeft ? -this.dp(12) : this.dp(12));
    panel.setScaleX(0.94);
    panel.setScaleY(0.94);
    panel.setAlpha(0);
    panel.animate().translationX(0).scaleX(1).scaleY(1).alpha(1).setDuration(175)
      .setInterpolator(new android.view.animation.DecelerateInterpolator()).start();
    return true;
  } catch (e) {
    safeLog(this.L, 'w', 'main panel enter animation fail: ' + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.animateMainPanelExit = function(panel, endFn) {
  try {
    if (!panel || !this.config.ENABLE_ANIMATIONS) {
      if (endFn) endFn();
      return false;
    }
    var fromLeft = String(this.state.mainPanelExpandSide || '') === 'from_left';
    panel.animate().cancel();
    panel.animate()
      .translationX(fromLeft ? -this.dp(8) : this.dp(8))
      .scaleX(0.97)
      .scaleY(0.97)
      .alpha(0)
      .setDuration(130)
      .setInterpolator(new android.view.animation.AccelerateInterpolator())
      .withEndAction(new java.lang.Runnable({ run: function() { try { if (endFn) endFn(); } catch (eEnd) {} }}))
      .start();
    return true;
  } catch (e) {
    safeLog(this.L, 'w', 'main panel exit animation fail: ' + String(e));
    try { if (endFn) endFn(); } catch (eEnd2) {}
  }
  return false;
};
