// @version 1.5.8
// ToolHub - 主按钮面板第十阶段：标题栏操作收纳

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

FloatBallAppWM.prototype.getMainPanelResponsiveSpec = function(editMode) {
  var safe = this.getMainPanelSafeBounds();
  var density = Number(this.state && this.state.density ? this.state.density : 1);
  if (density <= 0 || isNaN(density)) density = 1;
  var landscape = safe.width > safe.height;

  function readLayoutNumber(value, fallback, minValue, maxValue, integerOnly) {
    var n = Number(value);
    if (isNaN(n)) n = Number(fallback);
    if (integerOnly === true) n = Math.round(n);
    if (n < minValue) n = minValue;
    if (n > maxValue) n = maxValue;
    return n;
  }

  var widthPercent = readLayoutNumber(
    this.config.PANEL_WIDTH_PERCENT,
    90,
    35,
    100,
    true
  );
  var autoMaxCols = readLayoutNumber(
    this.config.PANEL_AUTO_MAX_COLS,
    6,
    1,
    10,
    true
  );
  var minCardWidthDp = readLayoutNumber(
    this.config.PANEL_MIN_CARD_WIDTH_DP,
    92,
    48,
    200,
    true
  );
  var cardHeightDp = readLayoutNumber(
    this.config.PANEL_CARD_HEIGHT_DP,
    78,
    48,
    160,
    true
  );
  var gapDp = readLayoutNumber(
    this.config.PANEL_GAP_DP,
    8,
    4,
    24,
    true
  );
  var paddingDp = readLayoutNumber(
    this.config.PANEL_PADDING_DP,
    12,
    8,
    32,
    true
  );

  // 宽度占比只定义可用预算，不再直接作为最终面板宽度。
  var panelWidthBudget = Math.floor(safe.width * widthPercent / 100);
  var minimumPanelWidth = Math.min(safe.width, this.dp(160));
  panelWidthBudget = Math.min(
    safe.width,
    Math.max(minimumPanelWidth, panelWidthBudget)
  );

  var panelPadding = this.dp(paddingDp);
  var minimumGridWidth = this.dp(72);
  var maximumPadding = Math.max(
    this.dp(4),
    Math.floor((panelWidthBudget - minimumGridWidth) / 2)
  );
  if (panelPadding > maximumPadding) panelPadding = maximumPadding;

  var gridWidthBudget = Math.max(
    1,
    panelWidthBudget - panelPadding * 2
  );
  var gap = this.dp(gapDp);
  var gapBefore = Math.floor(gap / 2);
  var gapAfter = gap - gapBefore;
  var minCardWidth = this.dp(minCardWidthDp);

  // 预算只负责确定列数；最终宽度由卡片和精确 margin 反推。
  var cols = Math.floor(
    (gridWidthBudget + gap) / (minCardWidth + gap)
  );
  if (cols < 1) cols = 1;
  if (cols > autoMaxCols) cols = autoMaxCols;

  var minimumTouchWidth = this.dp(48);
  var cardWidth = 0;
  while (cols > 1) {
    cardWidth = Math.floor(
      (gridWidthBudget - cols * gap) / cols
    );
    if (cardWidth >= minimumTouchWidth) break;
    cols--;
  }
  cardWidth = Math.max(
    minimumTouchWidth,
    Math.floor((gridWidthBudget - cols * gap) / cols)
  );

  // 工具栏只提供网格最低宽度；需要扩展时把差值平均分配给各列。
  var toolbarMinGridWidth = Math.min(
    gridWidthBudget,
    this.dp(editMode === true ? 180 : 236)
  );
  var naturalGridWidth = cols * (cardWidth + gap);
  if (naturalGridWidth < toolbarMinGridWidth) {
    var expandedCardWidth = Math.ceil(
      (toolbarMinGridWidth - cols * gap) / cols
    );
    var expandedGridWidth = cols * (expandedCardWidth + gap);
    if (expandedGridWidth <= gridWidthBudget) {
      cardWidth = expandedCardWidth;
    }
  }

  var cellOuterWidth = cardWidth + gapBefore + gapAfter;
  var gridWidth = cols * cellOuterWidth;
  var panelWidth = panelPadding * 2 + gridWidth;

  var cardHeight = this.dp(cardHeightDp);
  var cellOuterHeight = cardHeight + gapBefore + gapAfter;
  var rowUnit = cellOuterHeight;
  var headerHeight = this.dp(56);
  var footerHeight = this.dp(24);
  var singlePageFooterHeight = this.dp(8);
  var panelTopPadding = this.dp(8);
  var panelBottomPadding = this.dp(8);
  var dividerHeight = 1;
  var dividerBottomMargin = this.dp(4);
  var maxPanelHeight = Math.min(
    safe.height,
    Math.max(this.dp(220), Math.floor(safe.height * 0.78))
  );
  var fixedVerticalHeight =
    panelTopPadding +
    headerHeight +
    dividerHeight +
    dividerBottomMargin +
    footerHeight +
    panelBottomPadding;
  var maxGridHeight = Math.max(
    rowUnit,
    maxPanelHeight - fixedVerticalHeight
  );

  var configuredRows = readLayoutNumber(
    this.config.PANEL_ROWS,
    4,
    1,
    10,
    true
  );
  var visibleRows = Math.max(
    1,
    Math.min(
      configuredRows,
      Math.floor(maxGridHeight / rowUnit)
    )
  );

  return {
    safe: safe,
    layoutMode: 'adaptive_grid_sized',
    widthPercent: widthPercent,
    panelWidthBudget: panelWidthBudget,
    gridWidthBudget: gridWidthBudget,
    autoMaxCols: autoMaxCols,
    minCardWidth: minCardWidth,
    minCardWidthDp: minCardWidthDp,
    cardHeightDp: cardHeightDp,
    cols: cols,
    panelWidth: panelWidth,
    panelPadding: panelPadding,
    gap: gap,
    gapBefore: gapBefore,
    gapAfter: gapAfter,
    gridWidth: gridWidth,
    cardWidth: cardWidth,
    cardHeight: cardHeight,
    cellOuterWidth: cellOuterWidth,
    cellOuterHeight: cellOuterHeight,
    rowUnit: rowUnit,
    headerHeight: headerHeight,
    footerHeight: footerHeight,
    singlePageFooterHeight: singlePageFooterHeight,
    panelTopPadding: panelTopPadding,
    panelBottomPadding: panelBottomPadding,
    dividerHeight: dividerHeight,
    dividerBottomMargin: dividerBottomMargin,
    visibleRows: visibleRows,
    maxPanelHeight: maxPanelHeight,
    maxGridHeight: maxGridHeight,
    landscape: landscape,
    safeWidthDp: safe.width / density
  };
};

FloatBallAppWM.prototype.createMainPanelPressedBackground = function(fillColor, strokeColor, pressedOverlayColor, radiusPx) {
  try {
    var normal = this.ui.createStrokeDrawable(fillColor, strokeColor, this.dp(1), radiusPx);
    var pressedFill = toolhubCompositeColor(pressedOverlayColor, fillColor);
    var pressed = this.ui.createStrokeDrawable(pressedFill, strokeColor, this.dp(1), radiusPx);
    var states = new android.graphics.drawable.StateListDrawable();
    states.addState(toolhubJintArray([android.R.attr.state_pressed]), pressed);
    states.addState(toolhubJintArray([]), normal);
    return states;
  } catch (e) {
    safeLog(this.L, 'w', 'main panel stable press background fallback: ' + String(e));
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
  toolhubSafeSetTextColor(v, textColor);
  v.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, text === '×' ? 23 : 19);
  v.setGravity(android.view.Gravity.CENTER);
  v.setPadding(0, 0, 0, 0);
  v.setMinWidth(this.dp(40));
  v.setMinimumWidth(this.dp(40));
  v.setMinHeight(this.dp(40));
  v.setMinimumHeight(this.dp(40));
  try { v.setIncludeFontPadding(false); } catch (ePad) {}
  try { v.setContentDescription(String(description || text || '')); } catch (eDesc) {}
  try { v.setBackground(this.ui.createTransparentPressedStateDrawable(pressColor, this.dp(12))); } catch (eBg) {}
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
      toolhubSafeSetTextColor(row, textColor);
      row.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
      row.setGravity(android.view.Gravity.CENTER_VERTICAL);
      row.setPadding(self.dp(14), 0, self.dp(14), 0);
      row.setMinHeight(self.dp(48));
      row.setClickable(true);
      row.setFocusable(true);
      try { row.setContentDescription(String(label)); } catch (eItemDesc) {}
      row.setBackground(self.ui.createTransparentPressedStateDrawable(self.withAlpha(textColor, isDark ? 0.15 : 0.09), self.dp(12)));
      row.setOnClickListener(new android.view.View.OnClickListener({ onClick: function() {
        try { if (popup) popup.dismiss(); } catch (eDismiss) {}
        try { action(); } catch (eAction) { safeLog(self.L, 'e', 'main more action fail: ' + String(eAction)); }
      }}));
      box.addView(row, new android.widget.LinearLayout.LayoutParams(-1, self.dp(48)));
    }

    function addDivider() {
      var line = new android.view.View(context);
      toolhubSafeSetBackgroundColor(line, strokeColor);
      var lineLp = new android.widget.LinearLayout.LayoutParams(-1, 1);
      lineLp.leftMargin = self.dp(10);
      lineLp.rightMargin = self.dp(10);
      lineLp.topMargin = self.dp(4);
      lineLp.bottomMargin = self.dp(4);
      box.addView(line, lineLp);
    }

    addItem('设置', function() {
      self.hideMainPanel(true);
      self.showPanelAvoidBall('settings');
    });
    addItem('编辑布局', function() {
      self.startMainPanelEditMode();
    });
    addDivider();

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

FloatBallAppWM.prototype.updateMainPanelPageDots = function(dotViews, activeIndex, targetViews, pageCount) {
  try {
    if (!dotViews || !dotViews.length) return;
    var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
    var active = T && T.primary ? T.primary : this.ui.colors.primary;
    var inactive = T && T.outlineVariant ? this.withAlpha(T.outlineVariant, 0.42) : this.withAlpha(active, 0.28);
    var count = Number(pageCount || dotViews.length || 1);
    if (isNaN(count) || count < 1) count = dotViews.length || 1;
    for (var i = 0; i < dotViews.length; i++) {
      var selected = i === activeIndex;
      var size = this.dp(selected ? 7 : 5);
      var lp = dotViews[i].getLayoutParams();
      lp.width = size;
      lp.height = size;
      dotViews[i].setLayoutParams(lp);
      dotViews[i].setBackground(this.ui.createRoundDrawable(selected ? active : inactive, Math.floor(size / 2)));
      try { dotViews[i].setSelected(selected); } catch (eSelected) {}
      try {
        if (targetViews && targetViews[i]) {
          targetViews[i].setSelected(selected);
          targetViews[i].setContentDescription(
            '第 ' + String(i + 1) + ' 页，共 ' + String(count) + ' 页' + (selected ? '，当前页' : '')
          );
        }
      } catch (eTarget) {}
    }
  } catch (e) {}
};


FloatBallAppWM.prototype.getMainPanelRuntimeStatusSnapshot = function() {
  var state = this.state || {};
  var update = {};
  try {
    if (typeof TOOLHUB_UPDATE_STATE !== 'undefined' && TOOLHUB_UPDATE_STATE) update = TOOLHUB_UPDATE_STATE;
  } catch (eUpdateState) { update = {}; }

  var loadCount = 0;
  var loadNames = [];
  try {
    if (typeof loadErrors !== 'undefined' && loadErrors && loadErrors.length !== undefined) {
      loadCount = Number(loadErrors.length || 0);
      for (var li = 0; li < loadErrors.length && li < 3; li++) {
        var loadItem = loadErrors[li] || {};
        if (loadItem.module) loadNames.push(String(loadItem.module));
      }
    }
  } catch (eLoadErrors) {
    loadCount = 0;
    loadNames = [];
  }

  var moduleCount = 0;
  try {
    if (typeof modules !== 'undefined' && modules && modules.length !== undefined) moduleCount = Number(modules.length || 0);
  } catch (eModules) { moduleCount = 0; }

  var manualRunning = false;
  var checkRunning = false;
  try { manualRunning = typeof __manualUpdateRunning !== 'undefined' && __manualUpdateRunning === true; } catch (eManual) {}
  try { checkRunning = typeof __runtimeUpdateCheckRunning !== 'undefined' && __runtimeUpdateCheckRunning === true; } catch (eCheck) {}

  var updateStatus = '';
  var availableCount = 0;
  var updatedCount = 0;
  var needRestart = false;
  var securityText = '';
  var errorText = '';
  try {
    updateStatus = String(update.status || '');
    availableCount = Number(update.availableCount || 0);
    updatedCount = Number(update.updatedCount || 0);
    needRestart = update.needRestart === true;
    securityText = String(update.securityText || '');
    errorText = String(update.error || '');
  } catch (eUpdateFields) {}

  if (isNaN(availableCount) || availableCount < 0) availableCount = 0;
  if (isNaN(updatedCount) || updatedCount < 0) updatedCount = 0;

  function joinDetail(prefix) {
    var parts = [];
    if (prefix) parts.push(String(prefix));
    if (moduleCount > 0) parts.push(String(moduleCount) + ' 个模块');
    if (securityText) parts.push(securityText);
    return parts.join(' · ');
  }

  function makeStatus(key, label, colorText, detail) {
    var color = android.graphics.Color.GRAY;
    try { color = android.graphics.Color.parseColor(String(colorText)); } catch (eColor) {}
    return {
      key: String(key || 'unknown'),
      text: String(label || '状态未知'),
      color: color,
      detail: String(detail || label || '状态未知'),
      moduleCount: moduleCount,
      availableCount: availableCount,
      updatedCount: updatedCount,
      needRestart: needRestart,
      updateStatus: updateStatus
    };
  }

  if (state.closed === true) {
    return makeStatus('stopped', '已停止', '#9CA3AF', joinDetail('ToolHub 已停止'));
  }
  if (state.closing === true) {
    return makeStatus('closing', '正在关闭', '#94A3B8', joinDetail('ToolHub 正在关闭'));
  }
  if (loadCount > 0) {
    var loadDetail = '有 ' + String(loadCount) + ' 个子模块加载失败';
    if (loadNames.length > 0) loadDetail += '：' + loadNames.join('、');
    return makeStatus('degraded', '降级运行', '#F59E0B', loadDetail);
  }
  if (manualRunning) {
    return makeStatus('updating', '正在更新', '#3B82F6', joinDetail('正在事务更新子模块'));
  }
  if (checkRunning) {
    return makeStatus('checking', '检查更新', '#3B82F6', joinDetail('正在检查 GitHub 子模块更新'));
  }
  if (updateStatus === 'error' || update.ok === false) {
    return makeStatus('error', '更新异常', '#EF4444', errorText ? ('更新异常：' + errorText) : joinDetail('更新状态异常'));
  }
  if (needRestart) {
    var restartDetail = updatedCount > 0
      ? ('已更新 ' + String(updatedCount) + ' 个子模块，重启 ToolHub 后生效')
      : '子模块更新已完成，重启 ToolHub 后生效';
    return makeStatus('restart', '待重启', '#F59E0B', restartDetail);
  }
  if (availableCount > 0 || updateStatus === 'available') {
    var availableDetail = availableCount > 0
      ? ('发现 ' + String(availableCount) + ' 个可更新子模块，可在设置页安装')
      : '发现可更新子模块，可在设置页安装';
    return makeStatus('available', '发现更新', '#F59E0B', availableDetail);
  }
  if (updateStatus === 'plain' || (updateStatus && updateStatus !== 'unknown' && Number(update.mode) === 0)) {
    return makeStatus('plain', '普通模式', '#F59E0B', joinDetail('普通更新模式，未启用完整签名校验'));
  }
  if (updateStatus === 'updated' && updatedCount > 0) {
    return makeStatus('updated', '更新完成', '#22C55E', joinDetail('启动阶段已补全或修复 ' + String(updatedCount) + ' 个子模块'));
  }
  return makeStatus('healthy', '运行正常', '#22C55E', joinDetail('ToolHub 运行正常'));
};

FloatBallAppWM.prototype.applyMainPanelRuntimeStatusSnapshot = function(snapshot) {
  try {
    if (!snapshot || !this.state) return false;
    var dot = this.state.mainPanelStatusDot;
    var textView = this.state.mainPanelStatusText;
    var target = this.state.mainPanelStatusTarget;
    if (!dot || !textView) return false;

    var key = String(snapshot.key || '');
    var text = String(snapshot.text || '状态未知');
    var detail = String(snapshot.detail || text);
    var changed = String(this.state.mainPanelStatusRenderKey || '') !== (key + '|' + text + '|' + detail);

    if (changed) {
      var dotSize = this.dp(6);
      dot.setBackground(this.ui.createRoundDrawable(snapshot.color, Math.floor(dotSize / 2)));
      textView.setText(text);
      toolhubSafeSetTextColor(textView, snapshot.color);
      try { textView.setContentDescription(text); } catch (eTextDesc) {}
      try {
        if (target) target.setContentDescription('ToolHub，' + text + '。点击查看状态详情');
      } catch (eTargetDesc) {}
      this.state.mainPanelStatusRenderKey = key + '|' + text + '|' + detail;
    }

    this.state.mainPanelRuntimeStatus = snapshot;
    return true;
  } catch (e) {
    safeLog(this.L, 'w', 'apply main panel runtime status fail: ' + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.refreshMainPanelRuntimeStatus = function() {
  try {
    var snapshot = this.getMainPanelRuntimeStatusSnapshot();
    this.applyMainPanelRuntimeStatusSnapshot(snapshot);
    return snapshot;
  } catch (e) {
    safeLog(this.L, 'w', 'refresh main panel runtime status fail: ' + String(e));
  }
  return null;
};

FloatBallAppWM.prototype.showMainPanelRuntimeStatusDetail = function() {
  try {
    this.touchActivity();
    var snapshot = this.refreshMainPanelRuntimeStatus();
    if (!snapshot) return false;
    var detail = String(snapshot.detail || snapshot.text || '状态未知');
    if (detail.length > 220) detail = detail.substring(0, 217) + '...';
    this.toast(detail);
    return true;
  } catch (e) {
    safeLog(this.L, 'w', 'show main panel runtime status detail fail: ' + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.stopMainPanelRuntimeStatusTicker = function(panel) {
  try {
    if (!this.state) return false;
    var currentPanel = this.state.mainPanelStatusPanel;
    if (panel && currentPanel && currentPanel !== panel) return false;

    var runner = this.state.mainPanelStatusRunnable;
    try {
      if (runner && this.state.h) this.state.h.removeCallbacks(runner);
    } catch (eRemove) {}

    this.state.mainPanelStatusGeneration = Number(this.state.mainPanelStatusGeneration || 0) + 1;
    this.state.mainPanelStatusRunnable = null;
    this.state.mainPanelStatusPanel = null;
    this.state.mainPanelStatusLine = null;
    this.state.mainPanelStatusDot = null;
    this.state.mainPanelStatusText = null;
    this.state.mainPanelStatusTarget = null;
    this.state.mainPanelStatusRenderKey = '';
    return true;
  } catch (e) {
    safeLog(this.L, 'w', 'stop main panel runtime status ticker fail: ' + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.startMainPanelRuntimeStatusTicker = function(panel) {
  try {
    if (!panel || !this.state || !this.state.h) return false;

    var line = this.state.mainPanelStatusLine;
    var dot = this.state.mainPanelStatusDot;
    var textView = this.state.mainPanelStatusText;
    var target = this.state.mainPanelStatusTarget;

    this.stopMainPanelRuntimeStatusTicker();

    this.state.mainPanelStatusPanel = panel;
    this.state.mainPanelStatusLine = line;
    this.state.mainPanelStatusDot = dot;
    this.state.mainPanelStatusText = textView;
    this.state.mainPanelStatusTarget = target;
    this.state.mainPanelStatusRenderKey = '';

    var self = this;
    var generation = Number(this.state.mainPanelStatusGeneration || 0) + 1;
    this.state.mainPanelStatusGeneration = generation;
    this.refreshMainPanelRuntimeStatus();

    var runner = null;
    runner = new java.lang.Runnable({ run: function() {
      try {
        if (!self.state || Number(self.state.mainPanelStatusGeneration || 0) !== generation) return;
        if (self.state.closing || self.state.closed || self.state.panel !== panel || !self.state.addedPanel) {
          self.stopMainPanelRuntimeStatusTicker(panel);
          return;
        }
        self.refreshMainPanelRuntimeStatus();
        if (self.state.h && Number(self.state.mainPanelStatusGeneration || 0) === generation) {
          self.state.h.postDelayed(runner, 800);
        }
      } catch (eRun) {
        safeLog(self.L, 'w', 'main panel runtime status tick fail: ' + String(eRun));
        self.stopMainPanelRuntimeStatusTicker(panel);
      }
    }});

    this.state.mainPanelStatusRunnable = runner;
    this.state.h.postDelayed(runner, 800);
    return true;
  } catch (e) {
    safeLog(this.L, 'w', 'start main panel runtime status ticker fail: ' + String(e));
  }
  return false;
};



FloatBallAppWM.prototype.clampMainPanelPageIndex = function(index, pageCount) {
  var count = Number(pageCount || 1);
  var value = Number(index || 0);
  if (isNaN(count) || count < 1) count = 1;
  if (isNaN(value)) value = 0;
  value = Math.round(value);
  if (value < 0) value = 0;
  if (value >= count) value = count - 1;
  return value;
};

FloatBallAppWM.prototype.getMainPanelPageHeight = function(pageContext) {
  try {
    if (!pageContext) return 1;
    var visibleRows = Number(pageContext.visibleRows || 1);
    var rowUnit = Number(pageContext.spec && pageContext.spec.rowUnit ? pageContext.spec.rowUnit : 1);
    if (isNaN(visibleRows) || visibleRows < 1) visibleRows = 1;
    if (isNaN(rowUnit) || rowUnit < 1) rowUnit = 1;
    return Math.max(1, Math.floor(visibleRows * rowUnit));
  } catch (e) {}
  return 1;
};

FloatBallAppWM.prototype.getMainPanelPageMaxScrollY = function(pageContext) {
  try {
    if (!pageContext) return 0;
    var pageRows = Number(pageContext.pageRows || pageContext.rows || 1);
    var rowUnit = Number(pageContext.spec && pageContext.spec.rowUnit ? pageContext.spec.rowUnit : 1);
    var viewport = Number(pageContext.gridHeight || 0);
    if (isNaN(pageRows) || pageRows < 1) pageRows = 1;
    if (isNaN(rowUnit) || rowUnit < 1) rowUnit = 1;
    if (isNaN(viewport) || viewport < 0) viewport = 0;
    return Math.max(0, Math.floor(pageRows * rowUnit - viewport));
  } catch (e) {}
  return 0;
};

FloatBallAppWM.prototype.getMainPanelPageIndexForScrollY = function(pageContext, scrollY) {
  try {
    if (!pageContext) return 0;
    var y = Number(scrollY || 0);
    if (isNaN(y)) y = 0;
    var maxY = this.getMainPanelPageMaxScrollY(pageContext);
    if (y < 0) y = 0;
    if (y > maxY) y = maxY;
    var pageHeight = this.getMainPanelPageHeight(pageContext);
    return this.clampMainPanelPageIndex(Math.round(y / pageHeight), pageContext.pageCount);
  } catch (e) {}
  return 0;
};

FloatBallAppWM.prototype.rememberMainPanelPageIndex = function(pageContext, index) {
  try {
    if (!this.state || !pageContext) return false;
    var value = this.clampMainPanelPageIndex(index, pageContext.pageCount);
    if (pageContext.editMode) this.state.mainPanelEditPageIndex = value;
    else this.state.mainPanelPageIndex = value;
    pageContext.activePage = value;
    return true;
  } catch (e) {}
  return false;
};

FloatBallAppWM.prototype.updateMainPanelPageNavigation = function(pageContext, scrollY) {
  try {
    if (!pageContext) return 0;
    var active = this.getMainPanelPageIndexForScrollY(pageContext, scrollY);
    this.rememberMainPanelPageIndex(pageContext, active);
    this.updateMainPanelPageDots(
      pageContext.dotViews,
      active,
      pageContext.dotTargets,
      pageContext.pageCount
    );
    return active;
  } catch (e) {
    safeLog(this.L, 'w', 'update main panel page navigation fail: ' + String(e));
  }
  return 0;
};

FloatBallAppWM.prototype.cancelMainPanelPageSnap = function(pageContext) {
  try {
    var current = pageContext || (this.state ? this.state.mainPanelPagingContext : null);
    if (!current) return false;
    var runner = current.snapRunnable;
    try {
      if (runner && this.state && this.state.h) this.state.h.removeCallbacks(runner);
    } catch (eRemove) {}
    current.snapGeneration = Number(current.snapGeneration || 0) + 1;
    current.snapRunnable = null;
    return true;
  } catch (e) {}
  return false;
};

FloatBallAppWM.prototype.scrollMainPanelToPage = function(pageContext, index, animate, reason) {
  try {
    if (!pageContext || !pageContext.scroll) return false;
    this.cancelMainPanelPageSnap(pageContext);

    var page = this.clampMainPanelPageIndex(index, pageContext.pageCount);
    var pageHeight = this.getMainPanelPageHeight(pageContext);
    var maxY = this.getMainPanelPageMaxScrollY(pageContext);
    var targetY = Math.min(maxY, Math.max(0, Math.floor(page * pageHeight)));

    pageContext.programmaticScroll = true;
    var finishGeneration = Number(pageContext.finishGeneration || 0) + 1;
    pageContext.finishGeneration = finishGeneration;

    if (animate === true && pageContext.scroll.smoothScrollTo) {
      pageContext.scroll.smoothScrollTo(0, targetY);
    } else {
      pageContext.scroll.scrollTo(0, targetY);
    }

    this.rememberMainPanelPageIndex(pageContext, page);
    this.updateMainPanelPageDots(
      pageContext.dotViews,
      page,
      pageContext.dotTargets,
      pageContext.pageCount
    );

    var self = this;
    var finishAttempts = 0;
    var finishStableSamples = 0;
    var finishLastY = null;
    var finish = null;
    finish = new java.lang.Runnable({ run: function() {
      try {
        if (!self.state || self.state.mainPanelPagingContext !== pageContext) return;
        if (Number(pageContext.finishGeneration || 0) !== finishGeneration) return;

        var currentY = Number(pageContext.scroll.getScrollY() || 0);
        if (isNaN(currentY)) currentY = 0;
        if (finishLastY !== null && Math.abs(currentY - finishLastY) <= 1) {
          finishStableSamples++;
        } else {
          finishStableSamples = 0;
        }
        finishLastY = currentY;
        finishAttempts++;

        var reachedTarget = Math.abs(currentY - targetY) <= 1;
        if ((reachedTarget && finishStableSamples >= 1) || finishAttempts >= 24) {
          pageContext.programmaticScroll = false;
          self.updateMainPanelPageNavigation(pageContext, currentY);
          return;
        }

        if (self.state.h) self.state.h.postDelayed(finish, 32);
        else {
          pageContext.programmaticScroll = false;
          self.updateMainPanelPageNavigation(pageContext, currentY);
        }
      } catch (eFinish) {
        pageContext.programmaticScroll = false;
      }
    }});
    if (this.state && this.state.h) this.state.h.postDelayed(finish, animate === true ? 32 : 16);
    else {
      pageContext.programmaticScroll = false;
      this.updateMainPanelPageNavigation(pageContext, targetY);
    }

    safeLog(this.L, 'd', 'main panel page scroll page=' + String(page) + ' reason=' + String(reason || ''));
    return true;
  } catch (e) {
    safeLog(this.L, 'w', 'scroll main panel to page fail: ' + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.scheduleMainPanelPageSnap = function(pageContext, delayMs, reason) {
  try {
    if (!pageContext || Number(pageContext.pageCount || 1) <= 1) return false;
    if (pageContext.touching === true) return false;
    try {
      if (this.state && this.state.mainPanelEditDrag && this.state.mainPanelEditDrag.started) return false;
    } catch (eDrag) {}

    this.cancelMainPanelPageSnap(pageContext);
    var self = this;
    var generation = Number(pageContext.snapGeneration || 0) + 1;
    pageContext.snapGeneration = generation;
    var delay = Number(delayMs || 0);
    if (isNaN(delay) || delay < 40) delay = 40;
    var startedAt = java.lang.System.currentTimeMillis();
    var lastY = null;
    var stableSamples = 0;

    var runner = null;
    runner = new java.lang.Runnable({ run: function() {
      try {
        if (!self.state || self.state.mainPanelPagingContext !== pageContext) return;
        if (Number(pageContext.snapGeneration || 0) !== generation) return;
        if (self.state.panel !== pageContext.panel || !self.state.addedPanel) return;
        if (pageContext.touching === true) return;
        if (self.state.mainPanelEditDrag && self.state.mainPanelEditDrag.started) return;

        var elapsed = java.lang.System.currentTimeMillis() - startedAt;
        if (pageContext.programmaticScroll === true && elapsed < 1200) {
          if (self.state.h) self.state.h.postDelayed(runner, 60);
          return;
        }

        var currentY = Number(pageContext.scroll.getScrollY() || 0);
        if (isNaN(currentY)) currentY = 0;
        if (lastY !== null && Math.abs(currentY - lastY) <= 1) {
          stableSamples++;
        } else {
          stableSamples = 0;
        }
        lastY = currentY;

        if (stableSamples < 2 && elapsed < 1200) {
          if (self.state.h) self.state.h.postDelayed(runner, 60);
          return;
        }

        pageContext.snapRunnable = null;
        var page = self.getMainPanelPageIndexForScrollY(pageContext, currentY);
        var pageHeight = self.getMainPanelPageHeight(pageContext);
        var maxY = self.getMainPanelPageMaxScrollY(pageContext);
        var targetY = Math.min(maxY, Math.max(0, Math.floor(page * pageHeight)));

        if (Math.abs(targetY - currentY) <= 1) {
          self.updateMainPanelPageNavigation(pageContext, currentY);
          return;
        }
        self.scrollMainPanelToPage(pageContext, page, true, reason || 'snap');
      } catch (eRun) {
        safeLog(self.L, 'w', 'main panel page snap fail: ' + String(eRun));
      }
    }});

    pageContext.snapRunnable = runner;
    if (this.state && this.state.h) this.state.h.postDelayed(runner, delay);
    else runner.run();
    return true;
  } catch (e) {
    safeLog(this.L, 'w', 'schedule main panel page snap fail: ' + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.restoreMainPanelPage = function(pageContext) {
  try {
    if (!pageContext || !pageContext.scroll) return false;
    if (pageContext.initialPageReady === true || pageContext.initialPageScheduled === true) return true;

    var saved = Number(pageContext.initialPage || 0);
    if (pageContext.editMode) saved = Number(this.state.mainPanelEditPageIndex || saved);
    else saved = Number(this.state.mainPanelPageIndex || saved);
    saved = this.clampMainPanelPageIndex(saved, pageContext.pageCount);
    pageContext.initialPage = saved;

    var self = this;
    pageContext.scroll.post(new java.lang.Runnable({ run: function() {
      try {
        if (!self.state || self.state.mainPanelPagingContext !== pageContext) return;
        if (self.state.panel !== pageContext.panel || !self.state.addedPanel) return;
        self.scrollMainPanelToPage(pageContext, saved, false, 'restore_fallback');
        pageContext.initialPageReady = true;
      } catch (eRestore) {}
    }}));
    return true;
  } catch (e) {
    safeLog(this.L, 'w', 'restore main panel page fail: ' + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.disposeMainPanelPaging = function(panel) {
  try {
    if (!this.state) return false;
    var pageContext = this.state.mainPanelPagingContext;
    if (!pageContext) return false;
    if (panel && pageContext.panel !== panel) return false;
    this.cancelMainPanelPageSnap(pageContext);
    try {
      var initialPageListener = pageContext.initialPageListener;
      var initialPageObserver = pageContext.scroll && pageContext.scroll.getViewTreeObserver
        ? pageContext.scroll.getViewTreeObserver()
        : null;
      if (initialPageListener && initialPageObserver && initialPageObserver.isAlive()) {
        initialPageObserver.removeOnPreDrawListener(initialPageListener);
      }
    } catch (eInitialDispose) {}
    pageContext.initialPageListener = null;
    pageContext.initialPageScheduled = false;
    pageContext.finishGeneration = Number(pageContext.finishGeneration || 0) + 1;
    pageContext.touching = false;
    pageContext.programmaticScroll = false;
    this.state.mainPanelPagingContext = null;
    return true;
  } catch (e) {
    safeLog(this.L, 'w', 'dispose main panel paging fail: ' + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.isMainPanelEditMode = function() {
  try {
    return !!(this.state &&
      this.state.mainPanelEditMode === true &&
      this.state.mainPanelEditButtons &&
      this.state.mainPanelEditButtons.length !== undefined);
  } catch (e) {}
  return false;
};

FloatBallAppWM.prototype.getMainPanelEditPermutationSignature = function(buttons) {
  var parts = [];
  try {
    var list = buttons || [];
    for (var i = 0; i < list.length; i++) {
      parts.push(JSON.stringify(list[i] === undefined ? null : list[i]));
    }
    parts.sort();
    return parts.join('\u001e');
  } catch (e) {
    safeLog(this.L, 'w', 'main panel edit signature fail: ' + String(e));
  }
  return '';
};

FloatBallAppWM.prototype.cloneMainPanelButtonsForEdit = function() {
  try {
    var source = null;
    try {
      if (this.panels && this.panels.main) source = this.panels.main;
    } catch (ePanels) { source = null; }
    if (!source && typeof ConfigManager !== 'undefined' && ConfigManager && ConfigManager.loadButtons) {
      source = ConfigManager.loadButtons();
    }
    if (!source || source.length === undefined) source = [];
    return JSON.parse(JSON.stringify(source));
  } catch (e) {
    safeLog(this.L, 'e', 'clone main panel buttons for edit fail: ' + String(e));
  }
  return null;
};

FloatBallAppWM.prototype.clearMainPanelEditState = function(reason) {
  try {
    if (!this.state) return false;
    this.state.mainPanelEditRenderGeneration = Number(this.state.mainPanelEditRenderGeneration || 0) + 1;
    this.state.mainPanelEditMode = false;
    this.state.mainPanelEditButtons = null;
    this.state.mainPanelEditOriginalSignature = '';
    this.state.mainPanelEditDirty = false;
    this.state.mainPanelEditDrag = null;
    this.state.mainPanelEditDropTargetView = null;
    this.state.mainPanelEditStatusText = null;
    this.state.mainPanelEditPreserveDetachPanel = null;
    safeLog(this.L, 'i', 'main panel edit state cleared reason=' + String(reason || ''));
    return true;
  } catch (e) {
    safeLog(this.L, 'w', 'clear main panel edit state fail: ' + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.rebuildMainPanelForEditMode = function(preserveEdit, reason) {
  try {
    if (!this.state || this.state.closing || this.state.closed) return false;
    var self = this;
    var oldPanel = this.state.panel;
    if (preserveEdit === true && oldPanel) {
      this.state.mainPanelEditPreserveDetachPanel = oldPanel;
    }

    this.hideMainPanel(true);

    var generation = Number(this.state.mainPanelEditRebuildGeneration || 0) + 1;
    this.state.mainPanelEditRebuildGeneration = generation;
    var run = new java.lang.Runnable({ run: function() {
      try {
        if (!self.state || Number(self.state.mainPanelEditRebuildGeneration || 0) !== generation) return;
        if (self.state.closing || self.state.closed) return;
        self.showPanelAvoidBall('main');
        if (self.state.mainPanelEditPreserveDetachPanel === oldPanel) {
          self.state.mainPanelEditPreserveDetachPanel = null;
        }
        safeLog(self.L, 'i', 'main panel rebuilt for edit reason=' + String(reason || ''));
      } catch (eRun) {
        safeLog(self.L, 'e', 'rebuild main panel for edit run fail: ' + String(eRun));
      }
    }});

    if (this.state.h) this.state.h.postDelayed(run, 50);
    else run.run();
    return true;
  } catch (e) {
    safeLog(this.L, 'e', 'rebuild main panel for edit fail: ' + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.startMainPanelEditMode = function() {
  try {
    if (this.isMainPanelEditMode()) return true;
    if (String(this.currentPanelKey || 'main') !== 'main') {
      this.toast('当前面板不支持排序');
      return false;
    }

    var buttons = this.cloneMainPanelButtonsForEdit();
    if (!buttons) {
      this.toast('无法读取按钮布局');
      return false;
    }

    this.state.mainPanelEditButtons = buttons;
    this.state.mainPanelEditOriginalSignature = this.getMainPanelEditPermutationSignature(buttons);
    this.state.mainPanelEditDirty = false;
    this.state.mainPanelEditMode = true;
    this.state.mainPanelEditDrag = null;
    this.state.mainPanelEditDropTargetView = null;
    this.toast('拖动卡片调整顺序');
    return this.rebuildMainPanelForEditMode(true, 'start');
  } catch (e) {
    safeLog(this.L, 'e', 'start main panel edit mode fail: ' + String(e));
    try { this.toast('无法进入布局编辑'); } catch (eToast) {}
  }
  return false;
};

FloatBallAppWM.prototype.cancelMainPanelEditMode = function() {
  try {
    if (!this.isMainPanelEditMode()) return false;
    this.clearMainPanelEditState('cancel');
    this.toast('已取消布局调整');
    return this.rebuildMainPanelForEditMode(false, 'cancel');
  } catch (e) {
    safeLog(this.L, 'e', 'cancel main panel edit mode fail: ' + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.saveMainPanelEditMode = function() {
  try {
    if (!this.isMainPanelEditMode()) return false;
    var edited = this.state.mainPanelEditButtons;
    var originalSignature = String(this.state.mainPanelEditOriginalSignature || '');
    var editedSignature = this.getMainPanelEditPermutationSignature(edited);
    if (!originalSignature || editedSignature !== originalSignature) {
      throw '按钮集合校验失败，已阻止保存';
    }

    var savedButtons = JSON.parse(JSON.stringify(edited));
    var saveOk = ConfigManager.saveButtons(savedButtons);
    if (saveOk === false) throw '按钮顺序写入失败';

    if (!this.panels) this.panels = {};
    this.panels.main = savedButtons;
    this.clearMainPanelEditState('save');
    this.toast('布局已保存');
    return this.rebuildMainPanelForEditMode(false, 'save');
  } catch (e) {
    safeLog(this.L, 'e', 'save main panel edit mode fail: ' + String(e));
    try { this.toast('保存失败：' + String(e)); } catch (eToast) {}
  }
  return false;
};

FloatBallAppWM.prototype.handleMainPanelEditPanelDetached = function(panel) {
  try {
    if (!this.state) return false;
    if (this.state.mainPanelEditPreserveDetachPanel === panel) {
      this.state.mainPanelEditPreserveDetachPanel = null;
      return true;
    }
    if (this.isMainPanelEditMode()) {
      this.clearMainPanelEditState('panel_detached');
      return true;
    }
  } catch (e) {
    safeLog(this.L, 'w', 'handle main panel edit detach fail: ' + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.buildMainPanelRenderItems = function(rawButtons, editMode) {
  var items = [];
  var raw = rawButtons || [];
  try {
    for (var i = 0; i < raw.length; i++) {
      var b = raw[i];
      if (!b || b.enabled === false) continue;
      if (String(b.id || '') === 'builtin_settings' && String(b.type || '') === 'open_settings') continue;
      items.push({ config: b, rawIndex: i, add: false, empty: false });
    }
  } catch (e) {
    safeLog(this.L, 'w', 'build main panel render items fail: ' + String(e));
  }

  if (editMode === true) {
    if (items.length === 0) items.push({ config: null, rawIndex: -1, add: false, empty: true });
  } else {
    items.push({ config: null, rawIndex: -1, add: true, empty: false });
  }
  return items;
};

FloatBallAppWM.prototype.getMainPanelEditVisibleSlots = function(items) {
  var slots = [];
  try {
    var list = items || [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (!item || item.add || item.empty || Number(item.rawIndex) < 0) continue;
      slots.push(Number(item.rawIndex));
    }
    slots.sort(function(a, b) { return a - b; });
  } catch (e) {
    slots = [];
  }
  return slots;
};

FloatBallAppWM.prototype.reorderMainPanelEditItems = function(editContext, fromIndex, toIndex) {
  try {
    if (!this.isMainPanelEditMode() || !editContext) return false;
    var items = editContext.items || [];
    var from = Number(fromIndex);
    var to = Number(toIndex);
    if (isNaN(from) || isNaN(to) || from < 0 || to < 0 ||
        from >= items.length || to >= items.length || from === to) return false;
    if (!items[from] || items[from].empty || items[from].add ||
        !items[to] || items[to].empty || items[to].add) return false;

    var slots = this.getMainPanelEditVisibleSlots(items);
    if (slots.length !== items.length) return false;

    var moved = items.splice(from, 1)[0];
    items.splice(to, 0, moved);

    var raw = this.state.mainPanelEditButtons;
    for (var i = 0; i < slots.length; i++) {
      raw[slots[i]] = items[i].config;
      items[i].rawIndex = slots[i];
      items[i].visibleIndex = i;
    }

    this.state.mainPanelEditDirty = true;
    try {
      if (this.state.mainPanelEditStatusText) {
        this.state.mainPanelEditStatusText.setText('已调整，点击 ✓ 保存');
      }
    } catch (eStatus) {}
    safeLog(this.L, 'i', 'main panel edit reorder from=' + String(from) + ' to=' + String(to));
    return true;
  } catch (e) {
    safeLog(this.L, 'e', 'reorder main panel edit items fail: ' + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.findMainPanelDragTargetIndex = function(grid, rawX, rawY, count) {
  try {
    if (!grid) return -1;
    var max = Math.min(Number(count || 0), Number(grid.getChildCount ? grid.getChildCount() : 0));
    var best = -1;
    var bestDistance = Number.MAX_VALUE;
    var loc = java.lang.reflect.Array.newInstance(java.lang.Integer.TYPE, 2);

    for (var i = 0; i < max; i++) {
      var child = grid.getChildAt(i);
      if (!child) continue;
      child.getLocationOnScreen(loc);
      var left = Number(loc[0]);
      var top = Number(loc[1]);
      var right = left + Number(child.getWidth ? child.getWidth() : 0);
      var bottom = top + Number(child.getHeight ? child.getHeight() : 0);
      if (Number(rawX) >= left && Number(rawX) <= right &&
          Number(rawY) >= top && Number(rawY) <= bottom) return i;

      var cx = (left + right) / 2;
      var cy = (top + bottom) / 2;
      var dx = Number(rawX) - cx;
      var dy = Number(rawY) - cy;
      var distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    return best;
  } catch (e) {
    safeLog(this.L, 'w', 'find main panel drag target fail: ' + String(e));
  }
  return -1;
};

FloatBallAppWM.prototype.applyMainPanelEditDragVisual = function(view, active) {
  try {
    if (!view) return;
    view.animate().cancel();
    view.animate()
      .scaleX(active ? 1.05 : 1.0)
      .scaleY(active ? 1.05 : 1.0)
      .alpha(active ? 0.90 : 1.0)
      .setDuration(active ? 90 : 120)
      .start();
    try { view.setElevation(this.dp(active ? 9 : (this.isDarkTheme() ? 0 : 1))); } catch (eElev) {}
  } catch (e) {}
};

FloatBallAppWM.prototype.updateMainPanelEditDropTarget = function(targetView, dragView) {
  try {
    if (!this.state) return;
    var old = this.state.mainPanelEditDropTargetView;
    if (old && old !== dragView && old !== targetView) {
      old.animate().cancel();
      old.animate().scaleX(1.0).scaleY(1.0).alpha(1.0).setDuration(90).start();
    }
    if (targetView && targetView !== dragView) {
      targetView.animate().cancel();
      targetView.animate().scaleX(1.03).scaleY(1.03).alpha(0.72).setDuration(80).start();
      this.state.mainPanelEditDropTargetView = targetView;
    } else {
      this.state.mainPanelEditDropTargetView = null;
    }
  } catch (e) {}
};

FloatBallAppWM.prototype.clearMainPanelEditDropTarget = function(dragView) {
  try {
    if (!this.state) return;
    var target = this.state.mainPanelEditDropTargetView;
    if (target && target !== dragView) {
      target.animate().cancel();
      target.animate().scaleX(1.0).scaleY(1.0).alpha(1.0).setDuration(90).start();
    }
    this.state.mainPanelEditDropTargetView = null;
  } catch (e) {}
};

FloatBallAppWM.prototype.autoScrollMainPanelEdit = function(scroll, rawY) {
  try {
    if (!scroll) return false;
    var loc = java.lang.reflect.Array.newInstance(java.lang.Integer.TYPE, 2);
    scroll.getLocationOnScreen(loc);
    var top = Number(loc[1]);
    var bottom = top + Number(scroll.getHeight ? scroll.getHeight() : 0);
    var zone = this.dp(36);
    var step = this.dp(18);
    var delta = 0;
    if (Number(rawY) < top + zone) delta = -step;
    else if (Number(rawY) > bottom - zone) delta = step;
    if (delta !== 0) {
      scroll.scrollBy(0, delta);
      return true;
    }
  } catch (e) {}
  return false;
};

FloatBallAppWM.prototype.postMainPanelEditGridRender = function(editContext) {
  try {
    if (!this.state || !editContext || !editContext.render) return false;
    var self = this;
    var generation = Number(this.state.mainPanelEditRenderGeneration || 0) + 1;
    this.state.mainPanelEditRenderGeneration = generation;
    var run = new java.lang.Runnable({ run: function() {
      try {
        if (!self.state || Number(self.state.mainPanelEditRenderGeneration || 0) !== generation) return;
        if (!self.isMainPanelEditMode()) return;
        if (self.state.panel !== editContext.panel || !self.state.addedPanel) return;
        editContext.render();
      } catch (eRun) {
        safeLog(self.L, 'w', 'main panel edit grid render fail: ' + String(eRun));
      }
    }});
    if (this.state.h) this.state.h.post(run);
    else run.run();
    return true;
  } catch (e) {
    safeLog(this.L, 'w', 'post main panel edit grid render fail: ' + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.createMainPanelFunctionCard = function(item, spec, colors, editContext) {
  var self = this;
  var editMode = !!(editContext && editContext.editMode && item && !item.add && !item.empty);
  var frame = new android.widget.FrameLayout(context);
  var gp = new android.widget.GridLayout.LayoutParams();
  gp.width = spec.cardWidth;
  gp.height = spec.cardHeight;
  gp.setMargins(
    spec.gapBefore,
    spec.gapBefore,
    spec.gapAfter,
    spec.gapAfter
  );
  frame.setLayoutParams(gp);
  frame.setClickable(!item.empty);
  frame.setFocusable(!item.empty);
  var radius = this.dp(14);
  frame.setBackground(this.createMainPanelPressedBackground(colors.card, colors.stroke, colors.ripple, radius));
  try { frame.setElevation(this.dp(this.isDarkTheme() ? 0 : 1)); frame.setClipToOutline(true); } catch (eElev) {}

  var body = new android.widget.LinearLayout(context);
  body.setOrientation(android.widget.LinearLayout.VERTICAL);
  body.setGravity(android.view.Gravity.CENTER);
  body.setPadding(this.dp(6), this.dp(editMode ? 10 : 7), this.dp(6), this.dp(6));
  frame.addView(body, new android.widget.FrameLayout.LayoutParams(-1, -1));

  var iconSize = this.dp(Math.max(24, Math.min(30, Number(this.config.PANEL_ICON_SIZE_DP || 28))));
  var iv = null;
  if (item.empty) {
    var emptyIcon = new android.widget.TextView(context);
    emptyIcon.setText('—');
    toolhubSafeSetTextColor(emptyIcon, colors.secondaryText);
    emptyIcon.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 22);
    emptyIcon.setGravity(android.view.Gravity.CENTER);
    try { emptyIcon.setIncludeFontPadding(false); } catch (eEmptyPad) {}
    body.addView(emptyIcon, new android.widget.LinearLayout.LayoutParams(iconSize, iconSize));
  } else if (item.add) {
    var plus = new android.widget.TextView(context);
    plus.setText('+');
    toolhubSafeSetTextColor(plus, colors.secondaryText);
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

  if (this.config.PANEL_LABEL_ENABLED !== false || item.empty) {
    var tv = new android.widget.TextView(context);
    var labelText = item.empty
      ? '暂无可排序按钮'
      : (item.add ? '添加功能' : ((item.config && item.config.title) || '工具'));
    tv.setText(String(labelText));
    toolhubSafeSetTextColor(tv, (item.add || item.empty) ? colors.secondaryText : colors.text);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, Math.max(10, Math.min(13, Number(this.config.PANEL_LABEL_TEXT_SIZE_SP || 12))));
    tv.setGravity(android.view.Gravity.CENTER);
    tv.setSingleLine(true);
    tv.setEllipsize(android.text.TextUtils.TruncateAt.END);
    try { tv.setIncludeFontPadding(false); } catch (eTextPad) {}
    var tvLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
    tvLp.topMargin = this.dp(Math.max(3, Number(this.config.PANEL_LABEL_TOP_MARGIN_DP || 4)));
    body.addView(tv, tvLp);
  }

  if (editMode) {
    var orderBadge = new android.widget.TextView(context);
    orderBadge.setText(String(Number(item.visibleIndex || 0) + 1));
    toolhubSafeSetTextColor(orderBadge, colors.secondaryText);
    orderBadge.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 9);
    orderBadge.setGravity(android.view.Gravity.CENTER);
    try { orderBadge.setIncludeFontPadding(false); } catch (eOrderPad) {}
    try { orderBadge.setBackground(this.ui.createRoundDrawable(this.withAlpha(colors.secondaryText, 0.12), this.dp(8))); } catch (eOrderBg) {}
    var orderLp = new android.widget.FrameLayout.LayoutParams(this.dp(18), this.dp(18), android.view.Gravity.TOP | android.view.Gravity.START);
    orderLp.leftMargin = this.dp(6);
    orderLp.topMargin = this.dp(6);
    frame.addView(orderBadge, orderLp);

    var dragHandle = new android.widget.TextView(context);
    dragHandle.setText('⋮⋮');
    toolhubSafeSetTextColor(dragHandle, colors.secondaryText);
    dragHandle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    dragHandle.setGravity(android.view.Gravity.CENTER);
    try { dragHandle.setIncludeFontPadding(false); } catch (eHandlePad) {}
    var handleLp = new android.widget.FrameLayout.LayoutParams(this.dp(24), this.dp(22), android.view.Gravity.TOP | android.view.Gravity.END);
    handleLp.rightMargin = this.dp(4);
    handleLp.topMargin = this.dp(4);
    frame.addView(dragHandle, handleLp);
  }

  var description = item.empty
    ? '暂无可排序按钮'
    : (item.add ? '添加功能' : ((item.config && item.config.title) || '工具'));
  if (editMode) description = '拖动调整顺序：' + String(description) + '，第 ' + String(Number(item.visibleIndex || 0) + 1) + ' 个';
  try { frame.setContentDescription(String(description)); } catch (eDesc) {}

  if (editMode) {
    frame.setOnTouchListener(new android.view.View.OnTouchListener({ onTouch: function(v, event) {
      try {
        var action = event.getActionMasked();
        var drag = self.state.mainPanelEditDrag;
        if (action === android.view.MotionEvent.ACTION_DOWN) {
          self.touchActivity();
          try { v.getParent().requestDisallowInterceptTouchEvent(true); } catch (eParentDown) {}
          self.state.mainPanelEditDrag = {
            view: v,
            item: item,
            fromIndex: Number(item.visibleIndex || 0),
            targetIndex: Number(item.visibleIndex || 0),
            downX: Number(event.getRawX()),
            downY: Number(event.getRawY()),
            started: false
          };
          v.animate().cancel();
          v.animate().scaleX(0.98).scaleY(0.98).setDuration(60).start();
          return true;
        }

        if (!drag || drag.view !== v) return true;

        if (action === android.view.MotionEvent.ACTION_MOVE) {
          var dx = Number(event.getRawX()) - Number(drag.downX || 0);
          var dy = Number(event.getRawY()) - Number(drag.downY || 0);
          if (!drag.started && (dx * dx + dy * dy) >= self.dp(5) * self.dp(5)) {
            drag.started = true;
            try { v.performHapticFeedback(android.view.HapticFeedbackConstants.LONG_PRESS); } catch (eHaptic) {}
            self.applyMainPanelEditDragVisual(v, true);
          }
          if (drag.started) {
            var targetIndex = self.findMainPanelDragTargetIndex(
              editContext.grid,
              event.getRawX(),
              event.getRawY(),
              editContext.items.length
            );
            if (targetIndex >= 0) {
              drag.targetIndex = targetIndex;
              self.updateMainPanelEditDropTarget(editContext.grid.getChildAt(targetIndex), v);
            }
            self.autoScrollMainPanelEdit(editContext.scroll, event.getRawY());
          }
          return true;
        }

        if (action === android.view.MotionEvent.ACTION_UP || action === android.view.MotionEvent.ACTION_CANCEL) {
          try { v.getParent().requestDisallowInterceptTouchEvent(false); } catch (eParentUp) {}
          self.applyMainPanelEditDragVisual(v, false);
          self.clearMainPanelEditDropTarget(v);
          self.state.mainPanelEditDrag = null;

          if (action === android.view.MotionEvent.ACTION_UP) {
            if (drag.started && Number(drag.targetIndex) !== Number(drag.fromIndex)) {
              if (self.reorderMainPanelEditItems(editContext, drag.fromIndex, drag.targetIndex)) {
                self.toast('顺序已调整，点击 ✓ 保存');
                self.postMainPanelEditGridRender(editContext);
              }
            } else if (!drag.started) {
              self.toast('拖动卡片调整顺序');
            }
          }
          return true;
        }
      } catch (eTouch) {
        safeLog(self.L, 'w', 'main panel edit touch fail: ' + String(eTouch));
        try { self.state.mainPanelEditDrag = null; } catch (eClearDrag) {}
      }
      return true;
    }}));
  } else if (!item.empty) {
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
  } else {
    try { frame.setAlpha(0.64); } catch (eEmptyAlpha) {}
  }

  return frame;
};

FloatBallAppWM.prototype.createMainPanelPageSpacer = function(spec) {
  var spacer = new android.view.View(context);
  var lp = new android.widget.GridLayout.LayoutParams();
  lp.width = spec.cardWidth;
  lp.height = spec.cardHeight;
  lp.setMargins(
    spec.gapBefore,
    spec.gapBefore,
    spec.gapAfter,
    spec.gapAfter
  );
  spacer.setLayoutParams(lp);
  spacer.setVisibility(android.view.View.INVISIBLE);
  spacer.setClickable(false);
  spacer.setFocusable(false);
  return spacer;
};

FloatBallAppWM.prototype.buildMainPanelView = function() {
  var self = this;
  var editMode = this.isMainPanelEditMode();
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
  var spec = this.getMainPanelResponsiveSpec(editMode);
  safeLog(this.L, 'd',
    'main panel adaptive layout cols=' + String(spec.cols) +
    ' widthPercent=' + String(spec.widthPercent) +
    ' card=' + String(spec.cardWidth) + 'x' + String(spec.cardHeight) +
    ' safeWidthDp=' + String(Math.round(spec.safeWidthDp || 0)));
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
  panel.setPadding(
    spec.panelPadding,
    spec.panelTopPadding,
    spec.panelPadding,
    spec.panelBottomPadding
  );
  panel.setBackground(this.ui.createStrokeDrawable(
    this.withAlpha(panelBase, alpha),
    this.withAlpha(outline, isDark ? 0.30 : 0.24),
    this.dp(1),
    this.dp(22)
  ));
  try { panel.setElevation(this.dp(isDark ? 3 : 6)); panel.setClipToOutline(true); } catch (ePanelElev) {}
  // 最终精确宽高在网格行数和页数确定后统一设置。

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
  title.setText(editMode ? '编辑布局' : 'ToolHub');
  toolhubSafeSetTextColor(title, text);
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
  dot.setBackground(this.ui.createRoundDrawable(secondaryText, Math.floor(dotSize / 2)));
  statusLine.addView(dot, new android.widget.LinearLayout.LayoutParams(dotSize, dotSize));

  var statusText = new android.widget.TextView(context);
  statusText.setText('读取状态');
  toolhubSafeSetTextColor(statusText, secondaryText);
  statusText.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 10);
  statusText.setSingleLine(true);
  statusText.setEllipsize(android.text.TextUtils.TruncateAt.END);
  try { statusText.setIncludeFontPadding(false); } catch (eStatusPad) {}
  var statusTextLp = new android.widget.LinearLayout.LayoutParams(0, -2);
  statusTextLp.weight = 1;
  statusTextLp.leftMargin = this.dp(5);
  statusLine.addView(statusText, statusTextLp);

  if (editMode) {
    dot.setBackground(this.ui.createRoundDrawable(primary, Math.floor(dotSize / 2)));
    statusText.setText(this.state.mainPanelEditDirty ? '已调整，点击 ✓ 保存' : '拖动卡片调整顺序');
    toolhubSafeSetTextColor(statusText, primary);
    this.state.mainPanelEditStatusText = statusText;
    try {
      titleBox.setClickable(false);
      titleBox.setFocusable(false);
      titleBox.setContentDescription('主面板布局编辑模式');
    } catch (eEditStatusTarget) {}
    try { this.stopMainPanelRuntimeStatusTicker(); } catch (eStopTicker) {}
  } else {
    try {
      titleBox.setClickable(true);
      titleBox.setFocusable(true);
      titleBox.setContentDescription('ToolHub 运行状态，点击查看详情');
      titleBox.setBackground(this.ui.createTransparentPressedStateDrawable(this.withAlpha(primary, isDark ? 0.16 : 0.10), this.dp(10)));
    } catch (eStatusTarget) {}
    titleBox.setOnClickListener(new android.view.View.OnClickListener({ onClick: function() {
      self.guardClick('main_runtime_status_detail', 260, function() {
        self.showMainPanelRuntimeStatusDetail();
      });
    }}));

    this.state.mainPanelStatusPanel = panel;
    this.state.mainPanelStatusLine = statusLine;
    this.state.mainPanelStatusDot = dot;
    this.state.mainPanelStatusText = statusText;
    this.state.mainPanelStatusTarget = titleBox;
    this.state.mainPanelStatusRenderKey = '';
    this.refreshMainPanelRuntimeStatus();
  }

  if (editMode) {
    header.addView(this.createMainPanelToolbarButton('×', '取消排序', function() {
      self.cancelMainPanelEditMode();
    }), new android.widget.LinearLayout.LayoutParams(this.dp(40), this.dp(40)));
    header.addView(this.createMainPanelToolbarButton('✓', '保存排序', function() {
      self.saveMainPanelEditMode();
    }), new android.widget.LinearLayout.LayoutParams(this.dp(40), this.dp(40)));
  } else {
    // 普通模式只保留更多和关闭；设置与编辑布局收纳到更多菜单。
    header.addView(this.createMainPanelToolbarButton('⋮', '更多', function(v) {
      self.showMainPanelMoreMenu(v);
    }), new android.widget.LinearLayout.LayoutParams(this.dp(40), this.dp(40)));
    header.addView(this.createMainPanelToolbarButton('×', '关闭', function() {
      self.hideMainPanel();
    }), new android.widget.LinearLayout.LayoutParams(this.dp(40), this.dp(40)));
  }

  var divider = new android.view.View(context);
  toolhubSafeSetBackgroundColor(divider, this.withAlpha(outline, isDark ? 0.22 : 0.16));
  var dividerLp = new android.widget.LinearLayout.LayoutParams(-1, 1);
  dividerLp.bottomMargin = this.dp(4);
  panel.addView(divider, dividerLp);

  var raw = [];
  if (editMode) {
    try { raw = this.state.mainPanelEditButtons || []; } catch (eEditRaw) { raw = []; }
  } else {
    try { raw = (this.panels && this.panels[this.currentPanelKey]) ? this.panels[this.currentPanelKey] : []; } catch (eRaw) { raw = []; }
  }
  var items = this.buildMainPanelRenderItems(raw, editMode);

  var rows = Math.max(1, Math.ceil(items.length / spec.cols));
  var visibleRows = Math.min(rows, spec.visibleRows);
  var viewportHeight = visibleRows * spec.rowUnit;
  var pageCount = Math.max(1, Math.ceil(rows / visibleRows));
  var pageRows = pageCount * visibleRows;
  var fullGridHeight = pageRows * spec.rowUnit;
  var initialPage = editMode
    ? Number(this.state.mainPanelEditPageIndex || 0)
    : Number(this.state.mainPanelPageIndex || 0);
  initialPage = this.clampMainPanelPageIndex(initialPage, pageCount);
  var footerHeight = pageCount > 1
    ? spec.footerHeight
    : spec.singlePageFooterHeight;
  var panelHeight =
    spec.panelTopPadding +
    spec.headerHeight +
    spec.dividerHeight +
    spec.dividerBottomMargin +
    viewportHeight +
    footerHeight +
    spec.panelBottomPadding;

  panel.setLayoutParams(
    new android.view.ViewGroup.LayoutParams(
      spec.panelWidth,
      panelHeight
    )
  );

  safeLog(this.L, 'd',
    'main panel grid sizing cols=' + String(spec.cols) +
    ' grid=' + String(spec.gridWidth) + 'x' + String(fullGridHeight) +
    ' rows=' + String(rows) + '/' + String(pageRows) +
    ' viewport=' + String(spec.gridWidth) + 'x' + String(viewportHeight) +
    ' panel=' + String(spec.panelWidth) + 'x' + String(panelHeight));

  var pageContext = null;

  var scroll = new android.widget.ScrollView(context);
  scroll.setFillViewport(false);
  scroll.setVerticalScrollBarEnabled(false);
  scroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
  try { toolhubSafeSetBackgroundColor(scroll, this.withAlpha(panelBase, 1.0)); } catch (eViewportBg) {}
  scroll.setOnTouchListener(new android.view.View.OnTouchListener({ onTouch: function(v, event) {
    self.touchActivity();
    try {
      if (pageContext) {
        var action = event.getActionMasked();
        if (action === android.view.MotionEvent.ACTION_DOWN) {
          pageContext.touching = true;
          pageContext.finishGeneration = Number(pageContext.finishGeneration || 0) + 1;
          pageContext.programmaticScroll = false;
          self.cancelMainPanelPageSnap(pageContext);
        } else if (action === android.view.MotionEvent.ACTION_UP ||
                   action === android.view.MotionEvent.ACTION_CANCEL) {
          pageContext.touching = false;
          self.scheduleMainPanelPageSnap(pageContext, 80, 'touch_release');
        }
      }
    } catch (ePageTouch) {}
    return false;
  }}));
  panel.addView(
    scroll,
    new android.widget.LinearLayout.LayoutParams(
      spec.gridWidth,
      viewportHeight
    )
  );

  var grid = new android.widget.GridLayout(context);
  grid.setColumnCount(spec.cols);
  try { grid.setRowCount(pageRows); } catch (eRows) {}
  scroll.addView(
    grid,
    new android.widget.FrameLayout.LayoutParams(
      spec.gridWidth,
      fullGridHeight
    )
  );

  pageContext = {
    panel: panel,
    scroll: scroll,
    grid: grid,
    spec: spec,
    rows: rows,
    pageRows: pageRows,
    visibleRows: visibleRows,
    gridHeight: viewportHeight,
    fullGridHeight: fullGridHeight,
    panelHeight: panelHeight,
    pageCount: pageCount,
    dotViews: [],
    dotTargets: [],
    editMode: editMode,
    activePage: initialPage,
    initialPage: initialPage,
    initialPageReady: initialPage === 0,
    initialPageScheduled: false,
    initialPageListener: null,
    touching: false,
    programmaticScroll: false,
    snapGeneration: 0,
    finishGeneration: 0,
    snapRunnable: null
  };
  this.state.mainPanelPagingContext = pageContext;

  var editContext = editMode ? {
    editMode: true,
    panel: panel,
    grid: grid,
    scroll: scroll,
    items: items,
    spec: spec,
    colors: colors,
    render: null
  } : null;

  function renderMainPanelEditGrid() {
    if (!editContext || !self.isMainPanelEditMode()) return;
    var oldY = 0;
    try { oldY = Number(scroll.getScrollY() || 0); } catch (eOldY) { oldY = 0; }

    var nextItems = self.buildMainPanelRenderItems(self.state.mainPanelEditButtons || [], true);
    editContext.items = nextItems;
    grid.removeAllViews();
    var nextRows = Math.max(1, Math.ceil(nextItems.length / spec.cols));
    try { grid.setRowCount(pageContext.pageRows); } catch (eNextRows) {}
    for (var ri = 0; ri < nextItems.length; ri++) {
      nextItems[ri].visibleIndex = ri;
      grid.addView(self.createMainPanelFunctionCard(nextItems[ri], spec, colors, editContext));
    }
    for (var rf = nextItems.length; rf < pageContext.pageRows * spec.cols; rf++) {
      grid.addView(self.createMainPanelPageSpacer(spec));
    }
    try {
      scroll.post(new java.lang.Runnable({ run: function() {
        try {
          scroll.scrollTo(0, oldY);
          self.scheduleMainPanelPageSnap(pageContext, 60, 'edit_render');
        } catch (eRestoreY) {}
      }}));
    } catch (ePostY) {}
    try {
      if (self.state.mainPanelEditStatusText) {
        self.state.mainPanelEditStatusText.setText(self.state.mainPanelEditDirty ? '已调整，点击 ✓ 保存' : '拖动卡片调整顺序');
      }
    } catch (eStatusText) {}
    grid.requestLayout();
    grid.invalidate();
  }

  if (editContext) editContext.render = renderMainPanelEditGrid;
  for (var j = 0; j < items.length; j++) {
    items[j].visibleIndex = j;
    grid.addView(this.createMainPanelFunctionCard(items[j], spec, colors, editContext));
  }
  for (var filler = items.length; filler < pageRows * spec.cols; filler++) {
    grid.addView(this.createMainPanelPageSpacer(spec));
  }

  // 单页没有分页语义，不创建绿色圆点；只保留 8dp 底部呼吸空间。
  // 多页才显示可点击圆点。旧灰色“把手”没有拖动行为，移除以免产生错误暗示。
  var footer = new android.widget.LinearLayout(context);
  footer.setOrientation(android.widget.LinearLayout.VERTICAL);
  footer.setGravity(android.view.Gravity.CENTER);
  panel.addView(
    footer,
    new android.widget.LinearLayout.LayoutParams(-1, footerHeight)
  );

  var dotViews = [];
  var dotTargets = [];
  if (pageCount > 1) {
    var dots = new android.widget.LinearLayout(context);
    dots.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    dots.setGravity(android.view.Gravity.CENTER);
    footer.addView(
      dots,
      new android.widget.LinearLayout.LayoutParams(-1, this.dp(14))
    );

    for (var p = 0; p < pageCount; p++) {
      var dotTarget = new android.widget.FrameLayout(context);
      dotTarget.setClickable(pageCount > 1);
      dotTarget.setFocusable(pageCount > 1);
      var targetLp = new android.widget.LinearLayout.LayoutParams(
        this.dp(24),
        this.dp(14)
      );
      dots.addView(dotTarget, targetLp);

      var pageDot = new android.view.View(context);
      var pdLp = new android.widget.FrameLayout.LayoutParams(
        this.dp(5),
        this.dp(5),
        android.view.Gravity.CENTER
      );
      dotTarget.addView(pageDot, pdLp);
      dotViews.push(pageDot);
      dotTargets.push(dotTarget);

      (function(pageIndex, targetView) {
        targetView.setOnClickListener(
          new android.view.View.OnClickListener({ onClick: function() {
            self.touchActivity();
            self.guardClick(
              'main_page_dot_' + String(pageIndex),
              180,
              function() {
                self.scrollMainPanelToPage(
                  pageContext,
                  pageIndex,
                  true,
                  'dot_click'
                );
              }
            );
          }})
        );
      })(p, dotTarget);
    }
    this.updateMainPanelPageDots(
      dotViews,
      initialPage,
      dotTargets,
      pageCount
    );
  }
  pageContext.dotViews = dotViews;
  pageContext.dotTargets = dotTargets;

  if (initialPage > 0) {
    try {
      var initialPageObserver = scroll.getViewTreeObserver();
      var initialPageListener = null;
      initialPageListener = new android.view.ViewTreeObserver.OnPreDrawListener({ onPreDraw: function() {
        try {
          var activeObserver = scroll.getViewTreeObserver();
          if (activeObserver && activeObserver.isAlive()) {
            activeObserver.removeOnPreDrawListener(initialPageListener);
          }
        } catch (eInitialRemove) {}
        pageContext.initialPageListener = null;
        pageContext.initialPageScheduled = false;
        try {
          self.scrollMainPanelToPage(
            pageContext,
            pageContext.initialPage,
            false,
            'initial_pre_draw'
          );
          pageContext.initialPageReady = true;
          scroll.invalidate();
          return false;
        } catch (eInitialRestore) {
          pageContext.initialPageReady = true;
          safeLog(self.L, 'w', 'main panel initial page pre-draw fail: ' + String(eInitialRestore));
        }
        return true;
      }});
      if (initialPageObserver && initialPageObserver.isAlive()) {
        initialPageObserver.addOnPreDrawListener(initialPageListener);
        pageContext.initialPageListener = initialPageListener;
        pageContext.initialPageScheduled = true;
      }
    } catch (eInitialObserver) {
      pageContext.initialPageScheduled = false;
      safeLog(this.L, 'w', 'main panel initial page observer fail: ' + String(eInitialObserver));
    }
  }

  if (pageCount > 1 && android.os.Build.VERSION.SDK_INT >= 23) {
    try {
      scroll.setOnScrollChangeListener(new android.view.View.OnScrollChangeListener({ onScrollChange: function(v, sx, sy) {
        self.updateMainPanelPageNavigation(pageContext, sy);
        if (!pageContext.touching && !pageContext.programmaticScroll) {
          self.scheduleMainPanelPageSnap(pageContext, 90, 'scroll_idle');
        }
      }}));
    } catch (eScrollListener) {}
  }

  this.state.mainPanelResponsiveSpec = spec;

  try {
    panel.addOnAttachStateChangeListener(new android.view.View.OnAttachStateChangeListener({
      onViewAttachedToWindow: function(v) {
        try { self.restoreMainPanelPage(pageContext); } catch (eRestorePage) {}
        if (!editMode) {
          try { self.startMainPanelRuntimeStatusTicker(panel); } catch (eStartStatus) {}
        }
      },
      onViewDetachedFromWindow: function(v) {
        try { self.stopMainPanelRuntimeStatusTicker(panel); } catch (eStopStatus) {}
        try { self.disposeMainPanelPaging(panel); } catch (eDisposePage) {}
        try { self.handleMainPanelEditPanelDetached(panel); } catch (eEditDetach) {}
      }
    }));
  } catch (eAttachStatus) {
    safeLog(this.L, 'w', 'main panel lifecycle attach listener fail: ' + String(eAttachStatus));
  }

  if (!editMode) {
    try {
      panel.post(new java.lang.Runnable({ run: function() {
        try {
          if (self.state && self.state.panel === panel && self.state.addedPanel) {
            self.startMainPanelRuntimeStatusTicker(panel);
          }
        } catch (ePostStatus) {}
      }}));
    } catch (ePostStatusOuter) {}
  }

  return panel;
};

FloatBallAppWM.prototype.getMainPanelPosition = function(pw, ph, bx, by, ballSize) {
  var safe = this.getMainPanelSafeBounds();
  var side = '';
  try { side = String(this.state.dockSide || ''); } catch (eSide) { side = ''; }
  if (side !== 'left' && side !== 'right') {
    try { side = String(this.config.BALL_POSITION_SIDE || ''); } catch (eCfgSide) { side = ''; }
  }
  if (side !== 'left' && side !== 'right') {
    side = (Number(bx) + Number(ballSize) / 2) <= Number(this.state.screen.w) / 2 ? 'left' : 'right';
  }

  var minX = Number(safe.left);
  var maxX = Math.max(minX, Number(safe.right) - Number(pw));
  var x;
  if (side === 'left') {
    x = minX;
    this.state.mainPanelExpandSide = 'from_left';
  } else {
    x = maxX;
    this.state.mainPanelExpandSide = 'from_right';
  }
  x = this.clamp(Math.floor(x), minX, maxX);

  var ballCenterY = Number(by) + Number(ballSize) / 2;
  var y = Math.floor(ballCenterY - ph / 2);
  y = this.clamp(y, safe.top, Math.max(safe.top, safe.bottom - ph));
  this.state.mainPanelBallCenterY = ballCenterY;
  this.state.mainPanelPosition = { x: x, y: y, width: pw, height: ph, ballSide: side };
  safeLog(this.L, 'd',
    'main panel edge align side=' + String(side) +
    ' x=' + String(x) +
    ' range=' + String(minX) + '..' + String(maxX) +
    ' width=' + String(pw));
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
