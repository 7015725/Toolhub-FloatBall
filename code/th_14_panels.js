// @version 1.1.5


FloatBallAppWM.prototype.getSettingsResponsiveSpec = function() {
  try {
    if (this.getToolAppResponsiveSpec) return this.getToolAppResponsiveSpec();
  } catch(e) {}
  var sw = Math.max(1, Number(this.state.screen && this.state.screen.w || 0));
  var sh = Math.max(1, Number(this.state.screen && this.state.screen.h || 0));
  return {
    screenW: sw, screenH: sh, isLandscape: sw > sh,
    isCompactWidth: sw < this.dp(600),
    isMediumWidth: sw >= this.dp(600) && sw < this.dp(840),
    isExpandedWidth: sw >= this.dp(840) && sw < this.dp(1200),
    isWideWidth: sw >= this.dp(1200),
    gridColumnCount: sw >= this.dp(840) ? 2 : 1,
    useSideBySide: sw > sh && sw >= this.dp(840),
    leftPaneWidth: sw >= this.dp(1200) ? this.dp(340) : this.dp(300),
    cardRadius: sw >= this.dp(840) ? this.dp(20) : this.dp(24),
    itemRadius: sw >= this.dp(840) ? this.dp(16) : this.dp(18),
    cardGap: sw >= this.dp(840) ? this.dp(14) : this.dp(8)
  };
};

FloatBallAppWM.prototype.createSettingsGridContainer = function(columns) {
  var grid = new android.widget.GridLayout(context);
  grid.setColumnCount(Math.max(1, Number(columns || 1)));
  grid.setUseDefaultMargins(false);
  grid.setAlignmentMode(android.widget.GridLayout.ALIGN_BOUNDS);
  return grid;
};

FloatBallAppWM.prototype.addSettingsGridChild = function(parent, child, columns) {
  try {
    var isGrid = parent && String(parent.getClass && parent.getClass().getName && parent.getClass().getName()).indexOf("GridLayout") >= 0;
    if (isGrid) {
      var glp = new android.widget.GridLayout.LayoutParams();
      glp.width = 0;
      glp.height = android.widget.GridLayout.LayoutParams.WRAP_CONTENT;
      glp.columnSpec = android.widget.GridLayout.spec(android.widget.GridLayout.UNDEFINED, 1, 1);
      glp.setMargins(this.dp(6), this.dp(6), this.dp(6), this.dp(6));
      parent.addView(child, glp);
      return;
    }
  } catch(eGrid) {}
  var lp = new android.widget.LinearLayout.LayoutParams(-1, -2);
  lp.setMargins(this.dp(2), this.dp(4), this.dp(2), this.dp(4));
  parent.addView(child, lp);
};

FloatBallAppWM.prototype.getSettingsGroupDefs = function() {
  return [
    { key: "ball", title: "悬浮球", desc: "大小、图标、颜色、位置和面板距离", sections: ["悬浮球"] },
    { key: "pointer", title: "指针", desc: "大小、贴边、悬停、取字保护、OCR 阈值和颜色", sections: ["指针"] },
    { key: "panel", title: "面板", desc: "排列、文字、位置和吸边行为", sections: ["面板布局", "面板文字", "吸边与位置"] },
    { key: "theme", title: "外观", desc: "系统动态配色与背景透明度", sections: ["外观"] },
    { key: "motion", title: "动作与手势", desc: "点击、长按、动画和贴边回弹", sections: ["动画", "动作与手势"] },
    { key: "debug", title: "运行记录", desc: "查看日志与当前状态", sections: ["日志"] }
  ];
};

FloatBallAppWM.prototype.getSettingsGroupDef = function(key) {
  var defs = this.getSettingsGroupDefs();
  var k = String(key || "");
  for (var i = 0; i < defs.length; i++) {
    if (defs[i] && String(defs[i].key) === k) return defs[i];
  }
  return null;
};

FloatBallAppWM.prototype.getSettingsGroupTitle = function(key) {
  var d = this.getSettingsGroupDef(key);
  return d ? d.title : "设置分组";
};

FloatBallAppWM.prototype.isSchemaSectionInSettingsGroup = function(sectionName, groupKey) {
  var d = this.getSettingsGroupDef(groupKey);
  if (!d || !d.sections) return false;
  var n = String(sectionName || "");
  for (var i = 0; i < d.sections.length; i++) {
    if (String(d.sections[i]) === n) return true;
  }
  return false;
};


FloatBallAppWM.prototype.getPointerSettingsBlocks = function() {
  return [
    {
      key: "base",
      title: "基础",
      desc: "指针大小和贴边范围",
      keys: [
        "POINTER_SCALE_PERCENT",
        "POINTER_EDGE_ZONE_X_DP",
        "POINTER_EDGE_ZONE_Y_DP"
      ]
    },
    {
      key: "hover",
      title: "悬停",
      desc: "同一文字边框内稳定悬停达到设定时间后，松手才能取字；框选 OCR 使用独立时间",
      keys: [
        "POINTER_TEXT_HOVER_MS",
        "POINTER_AREA_HOVER_MS"
      ]
    },
    {
      key: "result_preview",
      title: "结果预览",
      desc: "取字或框选 OCR 成功后，在状态栏下方显示两行预览；点击进入拾字",
      keys: [
        "POINTER_RESULT_PREVIEW_TIMEOUT_SEC"
      ]
    },
    {
      key: "text_guard",
      title: "取字保护",
      desc: "小框误触时回退显示原文字预览",
      keys: [
        "POINTER_AREA_SMALL_FALLBACK_TEXT"
      ]
    },
    {
      key: "ocr_threshold",
      title: "框选 OCR",
      desc: "大于阈值才执行截图 OCR",
      keys: [
        "POINTER_AREA_MIN_WIDTH_DP",
        "POINTER_AREA_MIN_HEIGHT_DP",
        "POINTER_AREA_MIN_AREA_DP2",
        "POINTER_AREA_MIN_MOVE_DP"
      ]
    },
    {
      key: "pointer_color",
      title: "指针颜色",
      desc: "设置指针本体在普通、取字就绪、框选就绪和框选拖动状态下的颜色",
      keys: [
        "POINTER_COLOR_NORMAL_HEX",
        "POINTER_COLOR_TEXT_READY_HEX",
        "POINTER_COLOR_AREA_READY_HEX",
        "POINTER_COLOR_AREA_HEX"
      ]
    },
    {
      key: "pointer_frame_color",
      title: "边框颜色",
      desc: "设置文字悬停、取字或框选就绪，以及框选区域的边框颜色",
      keys: [
        "POINTER_FRAME_TEXT_HOVER_HEX",
        "POINTER_FRAME_TEXT_READY_HEX",
        "POINTER_FRAME_AREA_HEX"
      ]
    }
  ];
};

FloatBallAppWM.prototype.getPointerSettingsBlockDefForItem = function(item) {
  if (!item || item.type === "section") return null;
  var k = String(item.key || "");
  var blocks = this.getPointerSettingsBlocks ? this.getPointerSettingsBlocks() : [];
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    if (!b || !b.keys) continue;
    for (var j = 0; j < b.keys.length; j++) {
      if (String(b.keys[j]) === k) return b;
    }
  }
  return { key: "other", title: "其他", desc: "", keys: [] };
};

FloatBallAppWM.prototype.createPointerSettingsBlockDesc = function(parent, blockDef) {
  if (!parent || !blockDef || !blockDef.desc) return;
  try {
    var isDark = this.isDarkTheme();
    var C = this.ui.colors;
    var T = this.getSettingsColorScheme();
    var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
    var tv = new android.widget.TextView(context);
    tv.setText(String(blockDef.desc || ""));
    toolhubSafeSetTextColor(tv, T.onSurface2);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    tv.setPadding(this.dp(16), 0, this.dp(16), this.dp(8));
    parent.addView(tv, new android.widget.LinearLayout.LayoutParams(-1, -2));
  } catch(eDesc) { safeLog(null, 'e', "catch " + String(eDesc)); }
};

FloatBallAppWM.prototype.getBallSettingsSubtabs = function() {
  return [
    { key: "shape", title: "外形", desc: "大小、背景、透明度和距离", keys: ["BALL_SIZE_DP", "BALL_BG_COLOR_HEX", "BALL_IDLE_ALPHA", "BALL_PANEL_GAP_DP"] },
    { key: "badge", title: "徽章", desc: "图标来源、岛上图标、颜色和大小", keys: ["BALL_ICON_TYPE", "BALL_ICON_FILE_PATH", "BALL_ICON_RES_NAME", "BALL_ICON_TINT_HEX", "BALL_ICON_SIZE_DP"] },
    { key: "position", title: "位置", desc: "选择停靠边缘和统一高度位置", keys: ["BALL_POSITION_SIDE", "BALL_POSITION_PERCENT"] }
  ];
};

FloatBallAppWM.prototype.getActiveBallSettingsSubtab = function() {
  var tabs = this.getBallSettingsSubtabs ? this.getBallSettingsSubtabs() : [];
  var cur = "";
  try { cur = String(this.state.settingsBallSubtab || ""); } catch(eCur) { cur = ""; }
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i] && String(tabs[i].key) === cur) return cur;
  }
  return tabs.length > 0 ? String(tabs[0].key) : "";
};

FloatBallAppWM.prototype.getBallSettingsSubtabDef = function(key) {
  var tabs = this.getBallSettingsSubtabs ? this.getBallSettingsSubtabs() : [];
  var k = String(key || "");
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i] && String(tabs[i].key) === k) return tabs[i];
  }
  return tabs.length > 0 ? tabs[0] : null;
};

FloatBallAppWM.prototype.isSchemaItemInBallSubtab = function(item, tabKey) {
  if (!item || item.type === "section") return true;
  var d = this.getBallSettingsSubtabDef ? this.getBallSettingsSubtabDef(tabKey) : null;
  if (!d || !d.keys) return true;
  var k = String(item.key || "");
  for (var i = 0; i < d.keys.length; i++) {
    if (String(d.keys[i]) === k) return true;
  }
  return false;
};

FloatBallAppWM.prototype.createBallSettingsSubtabBar = function(parent, onChange) {
  var self = this;
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getSettingsColorScheme();
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  var tabs = this.getBallSettingsSubtabs ? this.getBallSettingsSubtabs() : [];
  if (!tabs || tabs.length <= 1) return;
  var active = this.getActiveBallSettingsSubtab ? this.getActiveBallSettingsSubtab() : String(tabs[0].key);

  var wrap = new android.widget.HorizontalScrollView(context);
  try { wrap.setHorizontalScrollBarEnabled(false); wrap.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER); } catch(eHS) {}
  var row = new android.widget.LinearLayout(context);
  row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  row.setGravity(android.view.Gravity.CENTER_VERTICAL);
  row.setPadding(this.dp(1), this.dp(1), this.dp(1), this.dp(1));
  wrap.addView(row, new android.widget.FrameLayout.LayoutParams(-2, -2));

  for (var i = 0; i < tabs.length; i++) {
    (function(tab) {
      var selected = String(tab.key) === active;
      var chip = new android.widget.TextView(context);
      chip.setText(String(tab.title || tab.key));
      chip.setGravity(android.view.Gravity.CENTER);
      chip.setSingleLine(true);
      chip.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
      chip.setTypeface(null, selected ? android.graphics.Typeface.BOLD : android.graphics.Typeface.NORMAL);
      toolhubSafeSetTextColor(chip, selected ? T.onPrimary : T.primary);
      chip.setPadding(self.dp(12), self.dp(6), self.dp(12), self.dp(6));
      try { chip.setMinHeight(self.dp(44)); chip.setMinimumHeight(self.dp(44)); } catch(eMinH) {}
      try { chip.setMinWidth(self.dp(44)); chip.setMinimumWidth(self.dp(44)); } catch(eMinW) {}
      try { chip.setIncludeFontPadding(false); } catch(eFontPad) {}
      try { chip.setContentDescription("切换到" + String(tab.title || tab.key)); } catch(eDesc) {}
      try { chip.setClickable(true); chip.setFocusable(true); } catch(eClickable) {}
      var bg = selected ? T.primary : self.withAlpha(T.primaryContainer, isDark ? 0.70 : 0.94);
      var stroke = selected ? T.primary : self.withAlpha(T.primary, isDark ? 0.28 : 0.18);
      chip.setBackground(self.ui.createStrokeDrawable(bg, stroke, self.dp(1), self.dp(16)));
      chip.setOnClickListener(new JavaAdapter(android.view.View.OnClickListener, { onClick: function(v) {
        try {
          self.touchActivity();
          var nextKey = String(tab.key || "shape");
          if (String(self.state.settingsBallSubtab || "") === nextKey) return;
          self.state.settingsBallSubtab = nextKey;
          if (onChange) onChange(nextKey);
        } catch(eClick) { safeLog(null, 'e', "catch " + String(eClick)); }
      }}));
      var lp = new android.widget.LinearLayout.LayoutParams(-2, self.dp(44));
      lp.setMargins(0, 0, self.dp(6), 0);
      row.addView(chip, lp);
    })(tabs[i]);
  }
  var wrapLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
  wrapLp.setMargins(this.dp(2), this.dp(0), this.dp(2), this.dp(6));
  parent.addView(wrap, wrapLp);
};

FloatBallAppWM.prototype.refreshBallSettingsSubtabPage = function() {
  try {
    if (this.state && this.state.toolAppActive && this.replaceToolAppPage) {
      this.replaceToolAppPage("settings_group");
      return true;
    }
    if (this.state && this.state.addedSettings && this.state.settingsPanel) {
      try {
        this.safeRemoveView(this.state.settingsPanel, "settingsPanel");
        this.state.settingsPanel = null;
        this.state.settingsPanelLp = null;
        this.state.addedSettings = false;
      } catch(eRemove) { safeLog(null, 'e', "catch " + String(eRemove)); }
      this.showPanelAvoidBall("settings");
      return true;
    }
  } catch(eRefresh) { safeLog(null, 'e', "catch " + String(eRefresh)); }
  return false;
};

FloatBallAppWM.prototype.getSettingsHomeIcon = function(title) {
  var t = String(title || "");
  if (t.indexOf("工具") >= 0) return "▣";
  if (t.indexOf("结构") >= 0 || t.indexOf("配置") >= 0) return "◇";
  if (t.indexOf("悬浮") >= 0 || t.indexOf("球") >= 0) return "○";
  if (t.indexOf("面板") >= 0) return "⌂";
  if (t.indexOf("换装") >= 0 || t.indexOf("装饰") >= 0 || t.indexOf("外观") >= 0) return "◎";
  if (t.indexOf("动作") >= 0 || t.indexOf("手势") >= 0) return "↯";
  if (t.indexOf("记录") >= 0 || t.indexOf("日志") >= 0) return "☰";
  return "✦";
};

FloatBallAppWM.prototype.createSettingsHomeSectionHeader = function(parent, icon, title) {
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getSettingsColorScheme();
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  var row = new android.widget.LinearLayout(context);
  row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  row.setGravity(android.view.Gravity.CENTER_VERTICAL);
  row.setPadding(this.dp(4), this.dp(10), this.dp(4), this.dp(5));
  var tvIcon = new android.widget.TextView(context);
  tvIcon.setText(String(icon || "✦"));
  tvIcon.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
  toolhubSafeSetTextColor(tvIcon, T.primary);
  tvIcon.setGravity(android.view.Gravity.CENTER);
  tvIcon.setBackground(this.ui.createRoundDrawable(T.primaryContainer, this.dp(10)));
  var iconLp = new android.widget.LinearLayout.LayoutParams(this.dp(26), this.dp(26));
  iconLp.setMargins(0, 0, this.dp(8), 0);
  row.addView(tvIcon, iconLp);
  var tv = new android.widget.TextView(context);
  tv.setText(String(title || ""));
  toolhubSafeSetTextColor(tv, T.onSurface);
  tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
  tv.setTypeface(null, android.graphics.Typeface.BOLD);
  row.addView(tv, new android.widget.LinearLayout.LayoutParams(0, -2, 1));
  parent.addView(row, new android.widget.LinearLayout.LayoutParams(-1, -2));
};


FloatBallAppWM.prototype.getIslandPickerTheme = function() {
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getSettingsColorScheme();
  var cfgTpl = null;
  try { cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config; } catch(eCfg) { cfgTpl = this.config; }
  return {
    isDark: isDark,
    C: C,
    T: T,
    bg: T.background,
    card: T.surface,
    card2: T.surface2,
    text: T.onSurface,
    sub: T.onSurface2,
    primary: T.primary,
    primaryDeep: T.primary,
    primarySoft: T.primaryContainer,
    stroke: T.outlineVariant,
    onPrimary: T.onPrimary
  };
};

FloatBallAppWM.prototype.createSettingsHomeEntry = function(parent, title, desc, actionText, onClick, options) {
  var entryOptions = options || {};
  if (String(title || "") === "更新与版本" && entryOptions.normalizedUpdateEntry !== true && this.createToolHubUpdateHomeEntry) return this.createToolHubUpdateHomeEntry(parent, title, this.getToolHubUpdateHomeSummary ? this.getToolHubUpdateHomeSummary() : desc, onClick);
  var self = this;
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getSettingsColorScheme();
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  var useMonet = true ? true : false;
  var row = new android.widget.LinearLayout(context);
  row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  row.setGravity(android.view.Gravity.CENTER_VERTICAL);
  var spec = this.getSettingsResponsiveSpec ? this.getSettingsResponsiveSpec() : null;
  var itemRadius = spec ? spec.itemRadius : this.dp(18);
  row.setPadding(this.dp(12), spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(8) : this.dp(10), this.dp(10), spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(8) : this.dp(10));
  row.setMinimumHeight(spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(72) : this.dp(76));
  row.setBackground(this.ui.createPressedStateDrawable(T.surface, this.withAlpha(T.primary, isDark ? 0.14 : 0.08), itemRadius));
  try { row.setElevation(this.dp(1)); } catch(eElev) { safeLog(null, 'e', "catch " + String(eElev)); }
  var badge = new android.widget.TextView(context);
  badge.setText(entryOptions.iconText !== undefined && entryOptions.iconText !== null ? String(entryOptions.iconText) : (this.getSettingsHomeIcon ? this.getSettingsHomeIcon(title) : "✦"));
  toolhubSafeSetTextColor(badge, T.primary);
  badge.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 18);
  badge.setGravity(android.view.Gravity.CENTER);
  badge.setTypeface(null, android.graphics.Typeface.BOLD);
  badge.setBackground(this.ui.createStrokeDrawable(T.primaryContainer, this.withAlpha(T.primary, isDark ? 0.22 : 0.16), this.dp(1), this.dp(13)));
  var iconSize = spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(38) : this.dp(40);
  if (entryOptions.showRedDot === true) {
    var badgeBox = new android.widget.FrameLayout(context);
    badgeBox.addView(badge, new android.widget.FrameLayout.LayoutParams(iconSize, iconSize, android.view.Gravity.CENTER));
    var dot = new android.view.View(context);
    var danger = T.danger || android.graphics.Color.parseColor("#BA1A1A");
    dot.setBackground(this.ui.createRoundDrawable(danger, this.dp(5)));
    var dotLp = new android.widget.FrameLayout.LayoutParams(this.dp(10), this.dp(10), android.view.Gravity.TOP | android.view.Gravity.RIGHT);
    badgeBox.addView(dot, dotLp);
    var badgeBoxLp = new android.widget.LinearLayout.LayoutParams(iconSize, iconSize);
    badgeBoxLp.setMargins(0, 0, this.dp(10), 0);
    row.addView(badgeBox, badgeBoxLp);
  } else {
    var badgeLp = new android.widget.LinearLayout.LayoutParams(iconSize, iconSize);
    badgeLp.setMargins(0, 0, this.dp(10), 0);
    row.addView(badge, badgeLp);
  }
  var texts = new android.widget.LinearLayout(context);
  texts.setOrientation(android.widget.LinearLayout.VERTICAL);
  var tvTitle = new android.widget.TextView(context);
  tvTitle.setText(String(title || ""));
  toolhubSafeSetTextColor(tvTitle, T.onSurface);
  tvTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
  tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);
  texts.addView(tvTitle);
  var tvDesc = new android.widget.TextView(context);
  tvDesc.setText(String(desc || ""));
  toolhubSafeSetTextColor(tvDesc, T.onSurface2);
  tvDesc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  tvDesc.setPadding(0, this.dp(2), this.dp(6), 0);
  try { tvDesc.setSingleLine(false); } catch(eSL) { safeLog(null, 'e', "catch " + String(eSL)); }
  texts.addView(tvDesc);
  row.addView(texts, new android.widget.LinearLayout.LayoutParams(0, -2, 1));
  var tvGo = new android.widget.TextView(context);
  tvGo.setText("›");
  toolhubSafeSetTextColor(tvGo, T.primary);
  tvGo.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 22);
  tvGo.setTypeface(null, android.graphics.Typeface.BOLD);
  tvGo.setGravity(android.view.Gravity.CENTER);
  row.addView(tvGo, new android.widget.LinearLayout.LayoutParams(this.dp(24), -1));
  row.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
    try { self.touchActivity(); } catch(eT) {}
    try { if (onClick) onClick(); } catch(eC) { try { self.toast("打开失败: " + String(eC)); } catch(eToast) {} }
  }}));
  if (this.addSettingsGridChild) this.addSettingsGridChild(parent, row, spec ? spec.gridColumnCount : 1);
  else {
    var lp = new android.widget.LinearLayout.LayoutParams(-1, -2);
    lp.setMargins(this.dp(2), this.dp(4), this.dp(2), this.dp(4));
    parent.addView(row, lp);
  }
};

FloatBallAppWM.prototype.getToolHubUpdateState = function() {
  var fallback = {
    ok: true,
    status: "unknown",
    source: "",
    mode: 0,
    modeText: "",
    version: 0,
    title: "",
    date: "",
    changes: [],
    updatedCount: 0,
    updatedModules: [],
    availableCount: 0,
    availableModules: [],
    availableDetails: [],
    bootFixedCount: 0,
    bootFixedModules: [],
    needRestart: false,
    lastCheckAt: 0,
    securityText: "",
    error: ""
  };
  function copyList(src) {
    var outList = [];
    if (!src || src.length === undefined) return outList;
    for (var i = 0; i < src.length; i++) {
      if (src[i] !== undefined && src[i] !== null && String(src[i]).length > 0) outList.push(String(src[i]));
    }
    return outList;
  }
  function copyDetailList(src) {
    var outList = [];
    if (!src || src.length === undefined) return outList;
    for (var i = 0; i < src.length; i++) {
      var item = src[i] || {};
      var name = item.module === undefined || item.module === null ? "" : String(item.module);
      if (!name) continue;
      outList.push({
        module: name,
        localVersion: item.localVersion === undefined || item.localVersion === null ? "" : String(item.localVersion),
        remoteVersion: item.remoteVersion === undefined || item.remoteVersion === null ? "" : String(item.remoteVersion),
        reason: item.reason === undefined || item.reason === null ? "" : String(item.reason)
      });
    }
    return outList;
  }
  try {
    if (typeof TOOLHUB_UPDATE_STATE !== "object" || !TOOLHUB_UPDATE_STATE) return fallback;
    var raw = TOOLHUB_UPDATE_STATE;
    var out = {
      ok: raw.ok !== false,
      status: raw.status === undefined || raw.status === null ? "unknown" : String(raw.status),
      source: raw.source === undefined || raw.source === null ? "" : String(raw.source),
      mode: Number(raw.mode || 0),
      modeText: raw.modeText === undefined || raw.modeText === null ? "" : String(raw.modeText),
      version: Number(raw.version || 0),
      title: raw.title === undefined || raw.title === null ? "" : String(raw.title),
      date: raw.date === undefined || raw.date === null ? "" : String(raw.date),
      changes: copyList(raw.changes || []),
      updatedCount: Number(raw.updatedCount || 0),
      updatedModules: copyList(raw.updatedModules || []),
      availableCount: Number(raw.availableCount || 0),
      availableModules: copyList(raw.availableModules || []),
      availableDetails: copyDetailList(raw.availableDetails || []),
      bootFixedCount: Number(raw.bootFixedCount || 0),
      bootFixedModules: copyList(raw.bootFixedModules || []),
      needRestart: raw.needRestart === true,
      lastCheckAt: Number(raw.lastCheckAt || 0),
      securityText: raw.securityText === undefined || raw.securityText === null ? "" : String(raw.securityText),
      error: raw.error === undefined || raw.error === null ? "" : String(raw.error)
    };
    if (isNaN(out.mode)) out.mode = 0;
    if (isNaN(out.version)) out.version = 0;
    if (isNaN(out.updatedCount)) out.updatedCount = 0;
    if (isNaN(out.availableCount)) out.availableCount = 0;
    if (isNaN(out.bootFixedCount)) out.bootFixedCount = 0;
    if (isNaN(out.lastCheckAt)) out.lastCheckAt = 0;
    return out;
  } catch(eState) {}
  return fallback;
};

FloatBallAppWM.prototype.getToolHubUpdateVisual = function(updateState, T, isDark) {
  var C = this.ui.colors || {};
  var dangerColor = T.danger || C.danger || android.graphics.Color.parseColor("#BA1A1A");
  var warningColor = T.warning || C.warning || android.graphics.Color.parseColor(isDark ? "#FBBF24" : "#B45309");
  var successColor = T.success || C.success || android.graphics.Color.parseColor(isDark ? "#4ADE80" : "#15803D");
  var primaryColor = T.primary;
  var visual = {
    icon: "✓",
    label: "尚未检查更新",
    sub: "详情",
    iconColor: primaryColor,
    labelColor: T.onSurface,
    detailColor: T.onSurface2,
    bg: T.primaryContainer,
    stroke: this.withAlpha(primaryColor, isDark ? 0.24 : 0.16)
  };

  function applyStatus(app, color, container) {
    visual.iconColor = color;
    visual.labelColor = T.onSurface;
    visual.detailColor = T.onSurface2;
    visual.bg = container;
    visual.stroke = app.withAlpha(color, isDark ? 0.30 : 0.20);
  }

  var s = updateState ? String(updateState.status || "unknown") : "unknown";
  if (s === "checking") {
    visual.icon = "…";
    visual.label = "检查中";
    visual.sub = "稍候";
    applyStatus(this, warningColor, T.warningContainer || this.withAlpha(warningColor, isDark ? 0.20 : 0.12));
  } else if (s === "available") {
    visual.icon = "↓";
    visual.label = "发现新版本";
    visual.sub = updateState && Number(updateState.availableCount || 0) > 0 ? (String(updateState.availableCount) + "项") : "更新";
    applyStatus(this, warningColor, T.warningContainer || this.withAlpha(warningColor, isDark ? 0.20 : 0.12));
  } else if (s === "installing") {
    visual.icon = "…";
    visual.label = "正在更新";
    visual.sub = "稍候";
    applyStatus(this, warningColor, T.warningContainer || this.withAlpha(warningColor, isDark ? 0.20 : 0.12));
  } else if (s === "restarting") {
    visual.icon = "↻";
    visual.label = "正在重启";
    visual.sub = "稍候";
    applyStatus(this, warningColor, T.warningContainer || this.withAlpha(warningColor, isDark ? 0.20 : 0.12));
  } else if (s === "updated") {
    visual.icon = "↻";
    visual.label = updateState && updateState.needRestart ? "已更新，重启生效" : "模块已更新";
    visual.sub = updateState && updateState.needRestart ? "重启" : (updateState && Number(updateState.updatedCount || 0) > 0 ? (String(updateState.updatedCount) + "项") : "完成");
    applyStatus(this, successColor, T.successContainer || this.withAlpha(successColor, isDark ? 0.20 : 0.12));
  } else if (s === "latest") {
    visual.icon = "✓";
    visual.label = "已是最新";
    applyStatus(this, successColor, T.successContainer || this.withAlpha(successColor, isDark ? 0.20 : 0.12));
  } else if (s === "plain") {
    visual.icon = "⚠";
    visual.label = "普通模式";
    applyStatus(this, warningColor, T.warningContainer || this.withAlpha(warningColor, isDark ? 0.20 : 0.12));
  } else if (s === "error") {
    visual.icon = "!";
    visual.label = "更新异常";
    applyStatus(this, dangerColor, this.withAlpha(dangerColor, isDark ? 0.18 : 0.10));
  }

  if (s !== "available" && s !== "installing" && s !== "updated" &&
      updateState && Number(updateState.version || 0) > 0) {
    visual.sub = "v" + String(Math.floor(Number(updateState.version || 0)));
  }
  return visual;
};

FloatBallAppWM.prototype.createToolHubUpdatePill = function(expanded, compact, onToggle) {
  return null;
  var self = this;
  var isDark = this.isDarkTheme();
  var T = this.getSettingsColorScheme();
  var C = this.ui.colors;
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  var updateState = this.getToolHubUpdateState ? this.getToolHubUpdateState() : null;
  var visual = this.getToolHubUpdateVisual ? this.getToolHubUpdateVisual(updateState, T, isDark) : null;
  var pill = new android.widget.LinearLayout(context);
  pill.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  pill.setGravity(android.view.Gravity.CENTER_VERTICAL);
  pill.setClickable(true);
  pill.setPadding(this.dp(10), this.dp(5), this.dp(8), this.dp(5));
  pill.setMinimumHeight(this.dp(48));
  pill.setBackground(this.ui.createStrokeDrawable(visual.bg, visual.stroke, this.dp(1), this.dp(18)));
  try { pill.setContentDescription((expanded ? "收起" : "查看") + "ToolHub更新详情"); } catch(eDesc) {}

  var iconTv = new android.widget.TextView(context);
  iconTv.setText(String(visual.icon || "✓"));
  toolhubSafeSetTextColor(iconTv, visual.iconColor);
  iconTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, compact ? 12 : 13);
  iconTv.setGravity(android.view.Gravity.CENTER);
  iconTv.setTypeface(null, android.graphics.Typeface.BOLD);
  pill.addView(iconTv, new android.widget.LinearLayout.LayoutParams(this.dp(20), -2));

  var labelTv = new android.widget.TextView(context);
  labelTv.setText(String(visual.label || "更新状态"));
  toolhubSafeSetTextColor(labelTv, visual.labelColor);
  labelTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, compact ? 11 : 12);
  labelTv.setTypeface(null, android.graphics.Typeface.BOLD);
  labelTv.setSingleLine(true);
  try { labelTv.setEllipsize(android.text.TextUtils.TruncateAt.END); } catch(eEll) {}
  var labelLp = new android.widget.LinearLayout.LayoutParams(0, -2, 1);
  labelLp.setMargins(this.dp(4), 0, this.dp(6), 0);
  pill.addView(labelTv, labelLp);

  var detailTv = new android.widget.TextView(context);
  detailTv.setText(expanded ? "收起" : String(visual.sub || "详情"));
  toolhubSafeSetTextColor(detailTv, visual.detailColor);
  detailTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
  detailTv.setGravity(android.view.Gravity.CENTER);
  detailTv.setSingleLine(true);
  detailTv.setPadding(this.dp(7), this.dp(3), this.dp(7), this.dp(3));
  detailTv.setBackground(this.ui.createRoundDrawable(this.withAlpha(visual.iconColor, isDark ? 0.12 : 0.08), this.dp(12)));
  pill.addView(detailTv, new android.widget.LinearLayout.LayoutParams(-2, -2));

  pill.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
    try { self.touchActivity(); } catch(eTouch) {}
    try { self.state.settingsUpdateExpanded = !expanded; } catch(eSet) {}
    try { if (onToggle) onToggle(!!self.state.settingsUpdateExpanded); } catch(eToggle) {}
  }}));
  return pill;
};


FloatBallAppWM.prototype.startToolHubUpdateCheckFromSettings = function(anchorView) {
  var self = this;
  try {
    if (typeof checkToolHubModuleUpdatesNow !== "function") {
      try { this.toast("检查模块未加载，请重启 ToolHub"); } catch(eToast0) {}
      return;
    }
    var cur = this.getToolHubUpdateState ? this.getToolHubUpdateState() : null;
    var statusText = cur ? String(cur.status || "") : "";
    if (statusText === "checking") {
      try { this.toast("检查正在进行"); } catch(eToast1) {}
      return;
    }
    if (statusText === "installing") {
      try { this.toast("正在更新模块"); } catch(eToast2) {}
      return;
    }
    try {
      if (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) {
        TOOLHUB_UPDATE_STATE.status = "checking";
        TOOLHUB_UPDATE_STATE.error = "";
      }
    } catch(eState0) {}
    try { this.state.settingsUpdateExpanded = true; } catch(eExpand) {}
    try { this.toast("正在检查更新"); } catch(eToast3) {}
    try { if (this.replaceToolAppPage) this.replaceToolAppPage("settings"); } catch(eRefresh0) {}
    new java.lang.Thread(new java.lang.Runnable({
      run: function() {
        var ret = null;
        try {
          ret = checkToolHubModuleUpdatesNow();
        } catch(eRun) {
          ret = { ok: false, msg: "检查失败：" + String(eRun), error: String(eRun) };
          try {
            if (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) {
              TOOLHUB_UPDATE_STATE.ok = false;
              TOOLHUB_UPDATE_STATE.status = "error";
              TOOLHUB_UPDATE_STATE.error = String(eRun);
            }
          } catch(eState1) {}
        }
        try {
          self.runOnUiThreadSafe(function() {
            try { self.state.settingsUpdateExpanded = true; } catch(eExpand2) {}
            try { if (ret && ret.ok === false) self.toast("检查失败，详情见更新卡片"); else self.toast("检查完成"); } catch(eToast4) {}
            try { if (self.replaceToolAppPage) self.replaceToolAppPage("settings"); } catch(eRefresh1) {}
          });
        } catch(eUi) {
          try { if (anchorView && anchorView.post) anchorView.post(new java.lang.Runnable({ run: function() { try { if (ret && ret.ok === false) self.toast("检查失败，详情见更新卡片"); else self.toast("检查完成"); if (self.replaceToolAppPage) self.replaceToolAppPage("settings"); } catch(ePostUi) {} } })); } catch(ePost) {}
        }
      }
    })).start();
  } catch(eStart) {
    try { this.toast("启动检查失败"); safeLog(this.L, "e", "start check thread fail err=" + String(eStart)); } catch(eToast5) {}
  }
};

FloatBallAppWM.prototype.maybeAutoCheckToolHubUpdatesFromSettings = function() {
  return false;
  var self = this;
  try {
    if (typeof checkToolHubModuleUpdatesNow !== "function") return;
    if (!this.state) return;
    if (this.state.settingsAutoUpdateCheckRunning) return;
    var cur = this.getToolHubUpdateState ? this.getToolHubUpdateState() : null;
    var statusText = cur ? String(cur.status || "") : "";
    if (statusText === "checking" || statusText === "installing") return;
    var now = java.lang.System.currentTimeMillis();
    var last = cur ? Number(cur.lastCheckAt || 0) : 0;
    if (isNaN(last)) last = 0;
    if (last > 0 && Number(now) - last < 30 * 60 * 1000) return;
    this.state.settingsAutoUpdateCheckRunning = true;
    try {
      if (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) {
        TOOLHUB_UPDATE_STATE.status = "checking";
        TOOLHUB_UPDATE_STATE.error = "";
      }
    } catch(eState0) {}
    new java.lang.Thread(new java.lang.Runnable({
      run: function() {
        try { checkToolHubModuleUpdatesNow(); } catch(eRun) {}
        try { self.state.settingsAutoUpdateCheckRunning = false; } catch(eFlag) {}
        try {
          self.runOnUiThreadSafe(function() {
            try {
              var route = self.state && self.state.toolAppRoute ? String(self.state.toolAppRoute) : "";
              if (self.state && self.state.toolAppActive && route === "settings" && self.replaceToolAppPage) self.replaceToolAppPage("settings");
            } catch(eRefresh) {}
          });
        } catch(eUi) {}
      }
    })).start();
  } catch(eAuto) {
    try { this.state.settingsAutoUpdateCheckRunning = false; } catch(eFlag2) {}
  }
};

FloatBallAppWM.prototype.startToolHubModuleUpdateFromSettings = function(anchorView) {
  if (this.startToolHubModuleUpdateDeterministic) return this.startToolHubModuleUpdateDeterministic(anchorView);
  var self = this;
  try {
    if (typeof installPendingModuleUpdates !== "function") {
      try { this.toast("更新模块未加载，请重启 ToolHub"); } catch(eToast0) {}
      return;
    }
    var cur = this.getToolHubUpdateState ? this.getToolHubUpdateState() : null;
    var statusText = cur ? String(cur.status || "") : "";
    if (statusText === "installing") {
      try { this.toast("更新正在进行"); } catch(eToast1) {}
      return;
    }
    if (statusText === "checking") {
      try { this.toast("检查正在进行"); } catch(eToastCheck) {}
      return;
    }
    try {
      if (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) {
        TOOLHUB_UPDATE_STATE.status = "installing";
        TOOLHUB_UPDATE_STATE.error = "";
      }
    } catch(eState0) {}
    try { this.state.settingsUpdateExpanded = true; } catch(eExpand) {}
    try { this.toast("正在更新模块"); } catch(eToast2) {}
    try { if (this.replaceToolAppPage) this.replaceToolAppPage("settings"); } catch(eRefresh0) {}
    new java.lang.Thread(new java.lang.Runnable({
      run: function() {
        var ret = null;
        try {
          ret = installPendingModuleUpdates();
        } catch(eRun) {
          ret = { ok: false, msg: "更新失败：" + String(eRun), error: String(eRun) };
          try {
            if (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) {
              TOOLHUB_UPDATE_STATE.ok = false;
              TOOLHUB_UPDATE_STATE.status = "error";
              TOOLHUB_UPDATE_STATE.error = String(eRun);
            }
          } catch(eState1) {}
        }
        try {
          self.runOnUiThreadSafe(function() {
            try { self.state.settingsUpdateExpanded = true; } catch(eExpand2) {}
            try { if (ret && ret.ok === false) self.toast("更新失败，详情见更新卡片"); else self.toast("更新完成"); } catch(eToast3) {}
            try { if (self.replaceToolAppPage) self.replaceToolAppPage("settings"); } catch(eRefresh1) {}
          });
        } catch(eUi) {
          try { if (anchorView && anchorView.post) anchorView.post(new java.lang.Runnable({ run: function() { try { if (ret && ret.ok === false) self.toast("更新失败，详情见更新卡片"); else self.toast("更新完成"); if (self.replaceToolAppPage) self.replaceToolAppPage("settings"); } catch(ePostUi) {} } })); } catch(ePost) {}
        }
      }
    })).start();
  } catch(eStart) {
    try { this.toast("启动更新失败"); safeLog(this.L, "e", "start update thread fail err=" + String(eStart)); } catch(eToast4) {}
  }
};

FloatBallAppWM.prototype.startToolHubRestartFromSettings = function(anchorView) {
  var self = this;
  try {
    if (typeof restartToolHubFromSettings !== "function") {
      try { this.toast("重启模块未加载，请重新运行 ToolHub 入口"); } catch(eToast0) {}
      return;
    }
    var cur = this.getToolHubUpdateState ? this.getToolHubUpdateState() : null;
    var statusText = cur ? String(cur.status || "") : "";
    if (statusText === "checking") {
      try { this.toast("检查正在进行"); } catch(eToast1) {}
      return;
    }
    if (statusText === "installing") {
      try { this.toast("更新正在进行"); } catch(eToast2) {}
      return;
    }
    try { this.toast("正在重启 ToolHub"); } catch(eToast3) {}
    try {
      if (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) {
        TOOLHUB_UPDATE_STATE.status = "restarting";
        TOOLHUB_UPDATE_STATE.error = "";
      }
    } catch(eState0) {}
    try { if (this.replaceToolAppPage) this.replaceToolAppPage("settings"); } catch(eRefresh0) {}
    new java.lang.Thread(new java.lang.Runnable({
      run: function() {
        var ret = null;
        try {
          ret = restartToolHubFromSettings();
        } catch(eRun) {
          ret = { ok: false, msg: "重启失败：" + String(eRun), error: String(eRun) };
          try {
            if (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) {
              TOOLHUB_UPDATE_STATE.ok = false;
              TOOLHUB_UPDATE_STATE.status = "error";
              TOOLHUB_UPDATE_STATE.error = String(eRun);
            }
          } catch(eState1) {}
        }
        if (ret && ret.ok === false) {
          try {
            self.runOnUiThreadSafe(function() {
              try { self.toast(ret.msg || "重启失败"); } catch(eToast4) {}
              try { if (self.replaceToolAppPage) self.replaceToolAppPage("settings"); } catch(eRefresh1) {}
            });
          } catch(eUi) {
            try { if (anchorView && anchorView.post) anchorView.post(new java.lang.Runnable({ run: function() { try { self.toast(ret.msg || "重启失败"); } catch(ePostToast) {} } })); } catch(ePost) {}
          }
        }
      }
    })).start();
  } catch(eStart) {
    try { this.toast("启动重启失败"); safeLog(this.L, "e", "start restart thread fail err=" + String(eStart)); } catch(eToast5) {}
  }
};

FloatBallAppWM.prototype.createToolHubUpdateDetailBox = function() {
  var self = this;
  var isDark = this.isDarkTheme();
  var T = this.getSettingsColorScheme();
  var C = this.ui.colors;
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  var updateState = this.getToolHubUpdateState ? this.getToolHubUpdateState() : null;
  var visual = this.getToolHubUpdateVisual ? this.getToolHubUpdateVisual(updateState, T, isDark) : null;
  var box = new android.widget.LinearLayout(context);
  box.setOrientation(android.widget.LinearLayout.VERTICAL);
  box.setPadding(this.dp(12), this.dp(10), this.dp(12), this.dp(10));
  box.setBackground(this.ui.createStrokeDrawable(this.withAlpha(T.surface2, isDark ? 0.80 : 0.96), this.withAlpha(visual.stroke, isDark ? 0.46 : 0.28), this.dp(1), this.dp(18)));

  function addLine(app, parent, textValue, colorValue, spValue, bold) {
    var tv = new android.widget.TextView(context);
    tv.setText(String(textValue || ""));
    toolhubSafeSetTextColor(tv, colorValue);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, spValue);
    tv.setLineSpacing(app.dp(1), 1.04);
    if (bold) tv.setTypeface(null, android.graphics.Typeface.BOLD);
    parent.addView(tv, new android.widget.LinearLayout.LayoutParams(-1, -2));
    return tv;
  }

  var headText = updateState && updateState.title ? String(updateState.title) : "更新详情";
  if (updateState && updateState.date) headText += " · " + String(updateState.date);
  addLine(this, box, headText, T.onSurface, 13, true);

  if (updateState && updateState.changes && updateState.changes.length > 0) {
    var changeHead = addLine(this, box, "更新内容", T.onSurface, 12, true);
    changeHead.setPadding(0, this.dp(8), 0, this.dp(2));
    var maxChanges = Math.min(3, updateState.changes.length);
    for (var ci = 0; ci < maxChanges; ci++) {
      addLine(this, box, "• " + String(updateState.changes[ci]), T.onSurface2, 12, false);
    }
    if (updateState.changes.length > maxChanges) addLine(this, box, "+" + String(updateState.changes.length - maxChanges) + " 项", T.onSurface2, 12, false);
  }

  if (updateState && updateState.availableDetails && updateState.availableDetails.length > 0) {
    var detailHead = addLine(this, box, "版本差异", T.onSurface, 12, true);
    detailHead.setPadding(0, this.dp(8), 0, this.dp(2));
    var maxDetails = Math.min(4, updateState.availableDetails.length);
    for (var di = 0; di < maxDetails; di++) {
      var detail = updateState.availableDetails[di] || {};
      var modName = detail.module ? String(detail.module) : "模块";
      var localText = detail.localVersion ? String(detail.localVersion) : "0.0.0";
      var remoteText = detail.remoteVersion ? String(detail.remoteVersion) : "清单版本";
      var reasonText = detail.reason === "missing" ? "缺失" : (detail.reason === "hash" ? "哈希变更" : "版本升级");
      addLine(this, box, "• " + modName + "  " + localText + " → " + remoteText + " · " + reasonText, T.onSurface2, 12, false);
    }
    if (updateState.availableDetails.length > maxDetails) addLine(this, box, "+" + String(updateState.availableDetails.length - maxDetails) + " 个模块", T.onSurface2, 12, false);
  } else if (updateState && updateState.availableModules && updateState.availableModules.length > 0) {
    var availableTv = addLine(this, box, "可更新模块：" + updateState.availableModules.join("、"), T.onSurface2, 12, false);
    availableTv.setPadding(0, this.dp(8), 0, 0);
    try { availableTv.setMaxLines(2); availableTv.setEllipsize(android.text.TextUtils.TruncateAt.END); } catch(eAvail) {}
  }

  if (updateState && updateState.updatedModules && updateState.updatedModules.length > 0) {
    var modsTv = addLine(this, box, "已处理模块：" + updateState.updatedModules.join("、"), T.onSurface2, 12, false);
    modsTv.setPadding(0, this.dp(8), 0, 0);
    try { modsTv.setMaxLines(2); modsTv.setEllipsize(android.text.TextUtils.TruncateAt.END); } catch(eMods) {}
  }

  if (updateState && updateState.bootFixedModules && updateState.bootFixedModules.length > 0) {
    var fixedTv = addLine(this, box, "启动修复：" + updateState.bootFixedModules.join("、"), T.onSurface2, 12, false);
    fixedTv.setPadding(0, this.dp(6), 0, 0);
    try { fixedTv.setMaxLines(2); fixedTv.setEllipsize(android.text.TextUtils.TruncateAt.END); } catch(eFixed) {}
  }

  var metaText = "来源：" + String(updateState && updateState.source ? updateState.source : "未知") + " · " + String(updateState && updateState.modeText ? updateState.modeText : "更新模式待确认");
  var metaTv = addLine(this, box, metaText, T.onSurface2, 11, false);
  metaTv.setPadding(0, this.dp(8), 0, 0);
  if (updateState && updateState.securityText) addLine(this, box, "校验状态：" + String(updateState.securityText), T.onSurface2, 11, false);
  if (updateState && updateState.error) addLine(this, box, "错误：" + String(updateState.error), T.danger || C.danger, 11, false);

  var statusName = updateState ? String(updateState.status || "") : "";
  function addActionButton(labelText, bgColor, textColor, descText, onClickFn, topMarginDp) {
    var actionBtn = self.ui.createSolidButton(self, labelText, bgColor, textColor, onClickFn);
    try { actionBtn.setContentDescription(descText); } catch(eDescBtn) {}
    var actionLp = new android.widget.LinearLayout.LayoutParams(-1, self.dp(48));
    actionLp.setMargins(0, self.dp(topMarginDp), 0, 0);
    box.addView(actionBtn, actionLp);
    return actionBtn;
  }
  if (statusName === "checking") {
    var checkingTv = addLine(this, box, "正在后台检查更新，请稍候。", T.primary, 12, true);
    checkingTv.setPadding(0, this.dp(10), 0, 0);
  } else if (statusName === "installing") {
    var runningTv = addLine(this, box, "正在后台下载并校验模块，请稍候。", T.primary, 12, true);
    runningTv.setPadding(0, this.dp(10), 0, 0);
  } else if (statusName === "restarting") {
    var restartingTv = addLine(this, box, "正在关闭旧悬浮球并重新启动 ToolHub。", T.primary, 12, true);
    restartingTv.setPadding(0, this.dp(10), 0, 0);
  } else if (updateState && updateState.needRestart) {
    var restartTv = addLine(this, box, "更新已下载完成，重启 ToolHub 后生效。", T.primary, 12, true);
    restartTv.setPadding(0, this.dp(10), 0, 0);
    addActionButton("重启 ToolHub", T.primary, T.onPrimary, "关闭并重新启动 ToolHub", function(v) {
      try { self.startToolHubRestartFromSettings(v); } catch(eRestartBtn) { try { self.toast("启动重启失败"); safeLog(self.L, "e", "restart button fail err=" + String(eRestartBtn)); } catch(eToastRestartBtn) {} }
    }, 10);
  } else {
    var hasAvailableUpdates = (statusName === "available" || (updateState && Number(updateState.availableCount || 0) > 0));
    if (hasAvailableUpdates) {
      addActionButton("立即更新", T.primary, T.onPrimary, "立即更新 ToolHub 模块", function(v) {
        try { self.startToolHubModuleUpdateFromSettings(v); } catch(eStartBtn) { try { self.toast("启动更新失败"); safeLog(self.L, "e", "start update button fail err=" + String(eStartBtn)); } catch(eToastBtn) {} }
      }, 10);
      addActionButton("重新检查", T.primaryContainer || T.primary, T.primary || T.onPrimary, "重新检查 ToolHub 更新", function(v) {
        try { self.startToolHubUpdateCheckFromSettings(v); } catch(eCheckBtn) { try { self.toast("启动检查失败"); safeLog(self.L, "e", "start check button fail err=" + String(eCheckBtn)); } catch(eToastCheckBtn) {} }
      }, 8);
    } else {
      addActionButton("检查更新", T.primaryContainer || T.primary, T.primary || T.onPrimary, "检查 ToolHub 更新", function(v) {
        try { self.startToolHubUpdateCheckFromSettings(v); } catch(eCheckBtn2) { try { self.toast("启动检查失败"); safeLog(self.L, "e", "start check button fail err=" + String(eCheckBtn2)); } catch(eToastCheckBtn2) {} }
      }, 10);
    }
  }
  return box;
};

FloatBallAppWM.prototype.createSettingsConfigStatusPill = function(statusLabel, statusValue, statusBg, statusStroke, statusValueColor, compact) {
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getSettingsColorScheme();
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  var pill = new android.widget.LinearLayout(context);
  pill.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  pill.setGravity(android.view.Gravity.CENTER_VERTICAL);
  pill.setMinimumHeight(this.dp(compact ? 36 : 40));
  pill.setPadding(this.dp(9), this.dp(5), this.dp(9), this.dp(5));
  pill.setBackground(this.ui.createStrokeDrawable(statusBg || T.surface, this.withAlpha(statusStroke || T.outlineVariant, isDark ? 0.34 : 0.24), this.dp(1), this.dp(18)));

  var dot = new android.widget.TextView(context);
  dot.setText("●");
  toolhubSafeSetTextColor(dot, statusValueColor || T.primary);
  dot.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 9);
  dot.setGravity(android.view.Gravity.CENTER);
  pill.addView(dot, new android.widget.LinearLayout.LayoutParams(this.dp(14), -2));

  var texts = new android.widget.LinearLayout(context);
  texts.setOrientation(android.widget.LinearLayout.VERTICAL);
  texts.setGravity(android.view.Gravity.CENTER_VERTICAL);
  var labelTv = new android.widget.TextView(context);
  labelTv.setText(String(statusLabel || "已保存"));
  toolhubSafeSetTextColor(labelTv, T.onSurface2);
  labelTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 9);
  labelTv.setSingleLine(true);
  try { labelTv.setMaxWidth(this.dp(compact ? 74 : 92)); labelTv.setEllipsize(android.text.TextUtils.TruncateAt.END); } catch(eLabelEll) {}
  texts.addView(labelTv, new android.widget.LinearLayout.LayoutParams(-2, -2));
  var valueTv = new android.widget.TextView(context);
  valueTv.setText(String(statusValue || "当前生效"));
  toolhubSafeSetTextColor(valueTv, statusValueColor || T.onSurface);
  valueTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, compact ? 11 : 12);
  valueTv.setTypeface(null, android.graphics.Typeface.BOLD);
  valueTv.setSingleLine(true);
  try { valueTv.setMaxWidth(this.dp(compact ? 74 : 92)); valueTv.setEllipsize(android.text.TextUtils.TruncateAt.END); } catch(eValueEll) {}
  texts.addView(valueTv, new android.widget.LinearLayout.LayoutParams(-2, -2));
  var textsLp = new android.widget.LinearLayout.LayoutParams(-2, -2);
  textsLp.setMargins(this.dp(2), 0, 0, 0);
  pill.addView(texts, textsLp);
  return pill;
};

FloatBallAppWM.prototype.createIslandWelcomeCard = function(parent, statusLabel, statusValue, statusBg, statusStroke, statusValueColor) {
  var self = this;
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getSettingsColorScheme();
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  var spec = this.getSettingsResponsiveSpec ? this.getSettingsResponsiveSpec() : null;
  var compactWelcome = spec && (spec.isLandscape || spec.isExpandedWidth || spec.isWideWidth);
  var tightWidth = spec && spec.isCompactWidth;
  var card = new android.widget.LinearLayout(context);
  card.setOrientation(android.widget.LinearLayout.VERTICAL);
  card.setGravity(android.view.Gravity.CENTER_VERTICAL);
  card.setMinimumHeight(compactWelcome ? this.dp(102) : this.dp(112));
  card.setPadding(this.dp(14), this.dp(10), this.dp(14), this.dp(10));
  card.setBackground(this.ui.createStrokeDrawable(T.surface, this.withAlpha(T.outlineVariant, isDark ? 0.14 : 0.12), this.dp(1), spec ? spec.cardRadius : this.dp(24)));
  try { card.setElevation(this.dp(compactWelcome ? 2 : 4)); } catch(eElev) {}

  var topRow = new android.widget.LinearLayout(context);
  topRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  topRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
  card.addView(topRow, new android.widget.LinearLayout.LayoutParams(-1, -2));

  var island = new android.widget.TextView(context);
  island.setText("✦");
  island.setGravity(android.view.Gravity.CENTER);
  island.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, compactWelcome ? 22 : 24);
  toolhubSafeSetTextColor(island, T.primary);
  island.setTypeface(null, android.graphics.Typeface.BOLD);
  island.setBackground(this.ui.createStrokeDrawable(T.primaryContainer, this.withAlpha(T.primary, isDark ? 0.22 : 0.16), this.dp(1), this.dp(18)));
  var iconSize = compactWelcome ? this.dp(48) : this.dp(50);
  var islandLp = new android.widget.LinearLayout.LayoutParams(iconSize, iconSize);
  islandLp.setMargins(0, 0, this.dp(12), 0);
  topRow.addView(island, islandLp);

  var textsCol = new android.widget.LinearLayout(context);
  textsCol.setOrientation(android.widget.LinearLayout.VERTICAL);
  textsCol.setGravity(android.view.Gravity.CENTER_VERTICAL);
  var titleMain = new android.widget.TextView(context);
  titleMain.setText("ToolHub 设置");
  toolhubSafeSetTextColor(titleMain, T.onSurface);
  titleMain.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, compactWelcome ? 17 : 20);
  titleMain.setTypeface(null, android.graphics.Typeface.BOLD);
  titleMain.setSingleLine(true);
  try { titleMain.setEllipsize(android.text.TextUtils.TruncateAt.END); } catch(eTitleEll) {}
  textsCol.addView(titleMain, new android.widget.LinearLayout.LayoutParams(-1, -2));
  var titleSub = new android.widget.TextView(context);
  titleSub.setText("管理工具、外观与更新");
  toolhubSafeSetTextColor(titleSub, T.onSurface2);
  titleSub.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  titleSub.setSingleLine(true);
  titleSub.setPadding(0, this.dp(3), 0, 0);
  try { titleSub.setEllipsize(android.text.TextUtils.TruncateAt.END); } catch(eSubEll) {}
  textsCol.addView(titleSub, new android.widget.LinearLayout.LayoutParams(-1, -2));
  topRow.addView(textsCol, new android.widget.LinearLayout.LayoutParams(0, -2, 1));

  var statusPill = this.createSettingsConfigStatusPill ? this.createSettingsConfigStatusPill(statusLabel, statusValue, statusBg, statusStroke, statusValueColor, true) : null;
  if (statusPill) {
    var statusLp = new android.widget.LinearLayout.LayoutParams(tightWidth ? this.dp(104) : this.dp(116), -2);
    statusLp.setMargins(this.dp(10), 0, 0, 0);
    topRow.addView(statusPill, statusLp);
  }

  var updatePill = this.createToolHubUpdatePill ? this.createToolHubUpdatePill(!!this.state.settingsUpdateExpanded, compactWelcome, function() {
    try { if (self.replaceToolAppPage) self.replaceToolAppPage("settings"); } catch(eReplace) {}
  }) : null;
  if (updatePill) {
    var updateLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
    updateLp.setMargins(0, this.dp(8), 0, 0);
    card.addView(updatePill, updateLp);
  }

  if (this.state.settingsUpdateExpanded && this.createToolHubUpdateDetailBox) {
    var detailBox = this.createToolHubUpdateDetailBox();
    var detailLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
    detailLp.setMargins(0, this.dp(10), 0, 0);
    card.addView(detailBox, detailLp);
  }

  var lp = new android.widget.LinearLayout.LayoutParams(-1, -2);
  lp.setMargins(0, compactWelcome ? this.dp(4) : this.dp(8), 0, compactWelcome ? this.dp(8) : this.dp(12));
  parent.addView(card, lp);
};

FloatBallAppWM.prototype.getSettingsHomeCategoryDefs = function(useMonetHome) {
  var defs = this.getSettingsGroupDefs ? this.getSettingsGroupDefs() : [];
  var cats = [];
  var used = {};
  function addChild(arr, id, title, desc, icon, kind, key) {
    arr.push({ id: id, title: title, desc: desc, icon: icon, kind: kind, key: key });
  }
  function findDef(key) {
    for (var i = 0; i < defs.length; i++) if (defs[i] && String(defs[i].key) === String(key)) return defs[i];
    return null;
  }
  function addGroupChild(arr, key) {
    var d = findDef(key);
    if (!d) return;
    addChild(arr, String(d.key), d.title, d.desc, this.getSettingsHomeIcon ? this.getSettingsHomeIcon(d.title) : "✦", "group", d.key);
    used[String(d.key)] = true;
  }
  if (useMonetHome) {
    var all = [];
    addChild(all, "tools", "工具", "添加、整理和排序工具入口", "▣", "route", "btn_editor");
    addGroupChild.call(this, all, "ball");
    addGroupChild.call(this, all, "pointer");
    addGroupChild.call(this, all, "panel");
    addGroupChild.call(this, all, "motion");
    addGroupChild.call(this, all, "theme");
    addChild(all, "schema", "高级设置", "编辑设置页结构和高级配置", "◇", "route", "schema_editor");
    addChild(all, "update", "更新与版本", this.getToolHubUpdateHomeSummary ? this.getToolHubUpdateHomeSummary() : "查看版本、更新状态与历史记录", "↻", "route", "update");
    addGroupChild.call(this, all, "debug");
    for (var m = 0; m < defs.length; m++) {
      var dm = defs[m];
      if (!dm || used[String(dm.key)]) continue;
      addChild(all, String(dm.key), dm.title, dm.desc, this.getSettingsHomeIcon ? this.getSettingsHomeIcon(dm.title) : "✦", "group", dm.key);
      used[String(dm.key)] = true;
    }
    cats.push({ id: "all", icon: "▦", title: "工具与配置", desc: "集中管理全部设置入口", children: all });
    return cats;
  }

  var layout = [];
  addChild(layout, "tools", "工具", "添加、整理和排序工具入口", "▣", "route", "btn_editor");
  cats.push({ id: "layout", icon: "▣", title: "布局与管理", desc: "工具入口与面板结构", children: layout });

  var fun = [];
  addGroupChild.call(this, fun, "ball");
  addGroupChild.call(this, fun, "pointer");
  addGroupChild.call(this, fun, "panel");
  cats.push({ id: "fun", icon: "○", title: "悬浮球与面板", desc: "悬浮球、工具面板和位置行为", children: fun });

  var look = [];
  addGroupChild.call(this, look, "motion");
  addGroupChild.call(this, look, "theme");
  cats.push({ id: "look", icon: "◎", title: "互动与外观", desc: "动作、手势和视觉样式", children: look });

  var record = [];
  addChild(record, "schema", "高级设置", "编辑设置页结构和高级配置，适合进阶用户", "◇", "route", "schema_editor");
  addChild(record, "update", "更新与版本", this.getToolHubUpdateHomeSummary ? this.getToolHubUpdateHomeSummary() : "查看版本、更新状态与历史记录", "↻", "route", "update");
  addGroupChild.call(this, record, "debug");
  cats.push({ id: "record", icon: "☰", title: "高级与维护", desc: "高级设置、更新和运行记录", children: record });

  var other = [];
  for (var x = 0; x < defs.length; x++) {
    var dx = defs[x];
    if (!dx || used[String(dx.key)]) continue;
    addChild(other, String(dx.key), dx.title, dx.desc, this.getSettingsHomeIcon ? this.getSettingsHomeIcon(dx.title) : "✦", "group", dx.key);
  }
  if (other.length > 0) cats.push({ id: "other", icon: "✦", title: "其他可用分类", desc: "更多设置入口", children: other });
  return cats;
};

FloatBallAppWM.prototype.startColorSafetyRuntimeSelfTestFromSettings = function() {
  return false;
};

FloatBallAppWM.prototype.copyColorSafetyRuntimeSelfTestSummaryFromSettings = function() {
  return false;
};

FloatBallAppWM.prototype.startSettingsInteractionStressTestFromSettings = function() {
  return false;
};

FloatBallAppWM.prototype.copySettingsInteractionStressSummaryFromSettings = function() {
  return false;
};

FloatBallAppWM.prototype.createColorSafetyRuntimeDiagnosticCard = function() {
  var isDark = this.isDarkTheme();
  var T = this.getSettingsColorScheme();
  var card = new android.widget.LinearLayout(context);
  card.setOrientation(android.widget.LinearLayout.VERTICAL);
  card.setPadding(this.dp(14), this.dp(12), this.dp(14), this.dp(12));
  card.setBackground(this.ui.createStrokeDrawable(
    T.surface,
    this.withAlpha(T.primary, isDark ? 0.28 : 0.18),
    this.dp(1),
    this.dp(18)
  ));
  try { card.setContentDescription("ToolHub 运行记录"); } catch(eDesc) {}
  return card;
};

FloatBallAppWM.prototype.buildSettingsGroupDetailPane = function(groupKey, title, desc) {
  var self = this;
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getSettingsColorScheme();
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  var spec = this.getSettingsResponsiveSpec ? this.getSettingsResponsiveSpec() : null;
  var columns = (spec && spec.isWideWidth) ? 2 : 1;
  var cardRadius = spec ? spec.cardRadius : this.dp(18);
  var root = new android.widget.LinearLayout(context);
  root.setOrientation(android.widget.LinearLayout.VERTICAL);
  root.setPadding(0, 0, 0, 0);

  var top = new android.widget.LinearLayout(context);
  top.setOrientation(android.widget.LinearLayout.VERTICAL);
  top.setPadding(this.dp(2), 0, this.dp(2), this.dp(8));
  var crumb = new android.widget.TextView(context);
  crumb.setText("‹ 返回分类");
  toolhubSafeSetTextColor(crumb, T.primary);
  crumb.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  crumb.setTypeface(null, android.graphics.Typeface.BOLD);
  crumb.setPadding(0, 0, 0, this.dp(4));
  crumb.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
    try { self.touchActivity(); self.state.settingsHomeSelectedItemId = null; if (self.replaceToolAppPage) self.replaceToolAppPage("settings"); } catch(e) {}
  }}));
  top.addView(crumb, new android.widget.LinearLayout.LayoutParams(-1, -2));
  var tvTitle = new android.widget.TextView(context);
  tvTitle.setText(String(title || this.getSettingsGroupTitle(groupKey) || "设置详情"));
  toolhubSafeSetTextColor(tvTitle, T.onSurface);
  tvTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 18);
  tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);
  top.addView(tvTitle, new android.widget.LinearLayout.LayoutParams(-1, -2));
  var tvDesc = new android.widget.TextView(context);
  tvDesc.setText(String(desc || "在右侧整理这一组设置，左侧目录保持常驻"));
  toolhubSafeSetTextColor(tvDesc, T.onSurface2);
  tvDesc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  tvDesc.setPadding(0, this.dp(4), 0, 0);
  top.addView(tvDesc, new android.widget.LinearLayout.LayoutParams(-1, -2));
  root.addView(top, new android.widget.LinearLayout.LayoutParams(-1, -2));
  var groupDetailNotice = new android.widget.LinearLayout(context);
  groupDetailNotice.setOrientation(android.widget.LinearLayout.VERTICAL);
  groupDetailNotice.setVisibility(android.view.View.GONE);
  root.addView(groupDetailNotice, new android.widget.LinearLayout.LayoutParams(-1, -2));
  function setGroupDetailNotice(msg, kind) {
    try {
      groupDetailNotice.removeAllViews();
      var k = String(kind || "info");
      var color = (k === "error") ? C.error : T.primary;
      var bg = (k === "error") ? self.withAlpha(C.error, isDark ? 0.20 : 0.10) : self.withAlpha(T.primary, isDark ? 0.18 : 0.10);
      var stroke = (k === "error") ? self.withAlpha(C.error, isDark ? 0.44 : 0.30) : self.withAlpha(T.primary, isDark ? 0.34 : 0.22);
      var tv = new android.widget.TextView(context);
      tv.setText(String(msg || ""));
      toolhubSafeSetTextColor(tv, color);
      tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      tv.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
      tv.setBackground(self.ui.createStrokeDrawable(bg, stroke, self.dp(1), self.dp(14)));
      var lp = new android.widget.LinearLayout.LayoutParams(-1, -2);
      lp.setMargins(self.dp(2), self.dp(6), self.dp(2), self.dp(8));
      groupDetailNotice.addView(tv, lp);
      groupDetailNotice.setVisibility(android.view.View.VISIBLE);
    } catch(eGDN) { safeLog(null, 'e', "catch " + String(eGDN)); }
  }


  if (String(groupKey || "") === "ball" && this.buildBallPreviewView) {
    try {
      var fixedPreview = this.buildBallPreviewView();
      var fixedPreviewLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
      fixedPreviewLp.setMargins(this.dp(2), this.dp(4), this.dp(2), this.dp(8));
      root.addView(fixedPreview, fixedPreviewLp);
    } catch(eFixedPreview) { safeLog(null, 'e', "catch " + String(eFixedPreview)); }
    try { if (this.createBallSettingsSubtabBar) this.createBallSettingsSubtabBar(root, function(k) { if (self.refreshBallSettingsSubtabPage) self.refreshBallSettingsSubtabPage(); }); } catch(eBallTabs) { safeLog(null, 'e', "catch " + String(eBallTabs)); }
  }

  var scroll = new android.widget.ScrollView(context);
  try { scroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER); scroll.setVerticalScrollBarEnabled(false); } catch(eOS) {}
  var box = columns > 1 ? this.createSettingsGridContainer(columns) : new android.widget.LinearLayout(context);
  if (columns <= 1) box.setOrientation(android.widget.LinearLayout.VERTICAL);
  box.setPadding(0, this.dp(2), 0, this.dp(16));
  scroll.addView(box);

  if (String(groupKey || "") === "debug" && this.createColorSafetyRuntimeDiagnosticCard) {
    try {
      var colorSafetyCard = this.createColorSafetyRuntimeDiagnosticCard();
      var colorSafetyCardLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
      colorSafetyCardLp.setMargins(this.dp(2), this.dp(4), this.dp(2), this.dp(8));
      box.addView(colorSafetyCard, colorSafetyCardLp);
    } catch(eColorSafetyCard) { safeLog(this.L, "e", "create runtime records card fail error=" + String(eColorSafetyCard)); }
  }
  scroll.setOnTouchListener(new JavaAdapter(android.view.View.OnTouchListener, { onTouch: function(v, e) { self.touchActivity(); return false; }}));

  var schema = this.getConfigSchema();
  var currentCard = null;
  var includeSection = false;
  function createCard() {
    var c = new android.widget.LinearLayout(context);
    c.setOrientation(android.widget.LinearLayout.VERTICAL);
    c.setBackground(self.ui.createStrokeDrawable(T.surface, self.withAlpha(T.outlineVariant, isDark ? 0.14 : 0.12), self.dp(1), cardRadius));
    try { c.setElevation(self.dp(1)); } catch(e) {}
    try { c.setClipToOutline(true); } catch(e2) {}
    if (columns > 1) {
      var glp = new android.widget.GridLayout.LayoutParams();
      glp.width = 0;
      glp.height = android.widget.GridLayout.LayoutParams.WRAP_CONTENT;
      glp.columnSpec = android.widget.GridLayout.spec(android.widget.GridLayout.UNDEFINED, 1, 1);
      glp.setMargins(self.dp(4), self.dp(4), self.dp(4), self.dp(6));
      c.setLayoutParams(glp);
    } else {
      var lp = new android.widget.LinearLayout.LayoutParams(-1, -2);
      lp.setMargins(self.dp(2), self.dp(4), self.dp(2), self.dp(6));
      c.setLayoutParams(lp);
    }
    c.setPadding(0, 0, 0, self.dp(2));
    return c;
  }
  var activeGroupKey = String(groupKey || "");
  var activeBallSubtab = activeGroupKey === "ball" && this.getActiveBallSettingsSubtab ? this.getActiveBallSettingsSubtab() : "";
  var activeBallSubtabDef = activeGroupKey === "ball" && this.getBallSettingsSubtabDef ? this.getBallSettingsSubtabDef(activeBallSubtab) : null;
  var activePointerBlockKey = "";
  for (var i = 0; i < schema.length; i++) {
    (function(item) {
      if (item && String(item.type) === "section") {
        includeSection = self.isSchemaSectionInSettingsGroup(String(item.name || ""), activeGroupKey);
        if (!includeSection) { currentCard = null; return; }
        if (activeGroupKey === "pointer") {
          currentCard = null;
          activePointerBlockKey = "";
          return;
        }
        currentCard = createCard();
        box.addView(currentCard);
        if (activeGroupKey === "ball" && activeBallSubtabDef) self.createSectionHeader({ type: "section", name: String(activeBallSubtabDef.title || "悬浮球") }, currentCard);
        else self.createSectionHeader(item, currentCard);
      } else {
        if (!includeSection) return;
        if (activeGroupKey === "ball" && self.isSchemaItemInBallSubtab && !self.isSchemaItemInBallSubtab(item, activeBallSubtab)) return;
        if (activeGroupKey === "pointer" && self.getPointerSettingsBlockDefForItem) {
          var pBlock = self.getPointerSettingsBlockDefForItem(item);
          var nextBlockKey = pBlock ? String(pBlock.key || "other") : "other";
          if (!currentCard || String(activePointerBlockKey || "") !== nextBlockKey) {
            currentCard = createCard();
            box.addView(currentCard);
            activePointerBlockKey = nextBlockKey;
            self.createSectionHeader({ type: "section", name: pBlock ? String(pBlock.title || "其他") : "其他" }, currentCard);
            if (self.createPointerSettingsBlockDesc) self.createPointerSettingsBlockDesc(currentCard, pBlock);
          }
          var needDividerPointer = (currentCard.getChildCount() > 0);
          if (currentCard.getChildCount() <= 2) needDividerPointer = false;
          self.createSettingItemView(item, currentCard, needDividerPointer);
          return;
        }
        if (!currentCard) { currentCard = createCard(); box.addView(currentCard); }
        var needDivider = (currentCard.getChildCount() > 0);
        if (currentCard.getChildCount() === 1) needDivider = false;
        self.createSettingItemView(item, currentCard, needDivider);
      }
    })(schema[i]);
  }
  root.addView(scroll, new android.widget.LinearLayout.LayoutParams(-1, 0, 1));

  var saveRow = new android.widget.LinearLayout(context);
  saveRow.setGravity(android.view.Gravity.RIGHT | android.view.Gravity.CENTER_VERTICAL);
  saveRow.setPadding(0, this.dp(8), 0, 0);
  var btnSave = this.ui.createSolidButton(this, "保存设置", T.primary, T.onPrimary, function() {
    try {
      self.touchActivity();
      var r = self.commitPendingUserCfg();
      self.state.previewMode = false;
      if (self.state.addedPanel) self.hideMainPanel();
      if (r && r.ok) setGroupDetailNotice("已保存并生效", "ok");
      else setGroupDetailNotice("保存失败: " + (r && r.reason ? r.reason : (r && r.err ? r.err : "unknown")), "error");
    } catch(e0) { setGroupDetailNotice("保存异常: " + String(e0), "error"); }
  });
  var saveLp = new android.widget.LinearLayout.LayoutParams(this.dp(spec && spec.isWideWidth ? 300 : 260), this.dp(48));
  saveRow.addView(btnSave, saveLp);
  root.addView(saveRow, new android.widget.LinearLayout.LayoutParams(-1, -2));
  return root;
};

FloatBallAppWM.prototype.buildSettingsRouteDetailPane = function(route, title, desc) {
  var self = this;
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getSettingsColorScheme();
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  var root = new android.widget.LinearLayout(context);
  root.setOrientation(android.widget.LinearLayout.VERTICAL);
  root.setPadding(0, 0, 0, 0);
  var top = new android.widget.LinearLayout(context);
  top.setOrientation(android.widget.LinearLayout.VERTICAL);
  top.setPadding(this.dp(2), 0, this.dp(2), this.dp(8));
  var crumb = new android.widget.TextView(context);
  crumb.setText("‹ 返回分类");
  toolhubSafeSetTextColor(crumb, T.primary);
  crumb.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  crumb.setTypeface(null, android.graphics.Typeface.BOLD);
  crumb.setPadding(0, 0, 0, this.dp(4));
  crumb.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
    try { self.touchActivity(); self.state.settingsHomeSelectedItemId = null; if (self.replaceToolAppPage) self.replaceToolAppPage("settings"); } catch(e) {}
  }}));
  top.addView(crumb, new android.widget.LinearLayout.LayoutParams(-1, -2));
  var tvTitle = new android.widget.TextView(context);
  tvTitle.setText(String(title || this.getToolAppTitle(route) || "详情"));
  toolhubSafeSetTextColor(tvTitle, T.onSurface);
  tvTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 18);
  tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);
  top.addView(tvTitle, new android.widget.LinearLayout.LayoutParams(-1, -2));
  var tvDesc = new android.widget.TextView(context);
  tvDesc.setText(String(desc || "在右侧窗格内完成这一项设置"));
  toolhubSafeSetTextColor(tvDesc, T.onSurface2);
  tvDesc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  tvDesc.setPadding(0, this.dp(4), 0, 0);
  top.addView(tvDesc, new android.widget.LinearLayout.LayoutParams(-1, -2));
  root.addView(top, new android.widget.LinearLayout.LayoutParams(-1, -2));
  var oldRoute = this.state.toolAppRoute;
  try { this.state.toolAppRoute = String(route || ""); } catch(eR) {}
  var raw = this.buildPanelView(route);
  try { raw.setBackground(null); raw.setElevation(0); } catch(eRaw) {}
  try { this.state.toolAppRoute = oldRoute; } catch(eRR) {}
  root.addView(raw, new android.widget.LinearLayout.LayoutParams(-1, 0, 1));
  return root;
};

FloatBallAppWM.prototype.createSettingsMasterMenuItem = function(parent, cat, selected, onClick) {
  var self = this;
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getSettingsColorScheme();
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  var row = new android.widget.LinearLayout(context);
  row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  row.setGravity(android.view.Gravity.CENTER_VERTICAL);
  row.setPadding(this.dp(10), this.dp(7), this.dp(10), this.dp(7));
  row.setMinimumHeight(this.dp(64));
  var bg = selected ? T.primaryContainer : T.surface;
  var stroke = selected ? this.withAlpha(T.primary, isDark ? 0.30 : 0.24) : this.withAlpha(T.outlineVariant, isDark ? 0.14 : 0.12);
  row.setBackground(this.ui.createStrokeDrawable(bg, stroke, this.dp(1), this.dp(18)));
  try { row.setElevation(this.dp(selected ? 2 : 0)); } catch(eElev) {}
  var mark = new android.view.View(context);
  mark.setBackground(this.ui.createRoundDrawable(selected ? T.primary : this.withAlpha(T.primary, 0.0), this.dp(3)));
  var markLp = new android.widget.LinearLayout.LayoutParams(this.dp(4), -1);
  markLp.setMargins(0, this.dp(8), this.dp(8), this.dp(8));
  row.addView(mark, markLp);
  var icon = new android.widget.TextView(context);
  icon.setText(String(cat && cat.icon || "✦"));
  icon.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 17);
  toolhubSafeSetTextColor(icon, selected ? T.primary : T.onSurface);
  icon.setGravity(android.view.Gravity.CENTER);
  icon.setBackground(this.ui.createRoundDrawable(selected ? T.surface : T.primaryContainer, this.dp(13)));
  var iconLp = new android.widget.LinearLayout.LayoutParams(this.dp(38), this.dp(38));
  iconLp.setMargins(0, 0, this.dp(8), 0);
  row.addView(icon, iconLp);
  var texts = new android.widget.LinearLayout(context);
  texts.setOrientation(android.widget.LinearLayout.VERTICAL);
  var title = new android.widget.TextView(context);
  title.setText(String(cat && cat.title || ""));
  toolhubSafeSetTextColor(title, T.onSurface);
  title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
  title.setTypeface(null, android.graphics.Typeface.BOLD);
  texts.addView(title, new android.widget.LinearLayout.LayoutParams(-1, -2));
  var desc = new android.widget.TextView(context);
  desc.setText(String(cat && cat.desc || ""));
  toolhubSafeSetTextColor(desc, T.onSurface2);
  desc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
  desc.setPadding(0, this.dp(2), 0, 0);
  try { desc.setMaxLines(2); } catch(eMax) {}
  texts.addView(desc, new android.widget.LinearLayout.LayoutParams(-1, -2));
  row.addView(texts, new android.widget.LinearLayout.LayoutParams(0, -2, 1));
  row.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
    try { self.touchActivity(); } catch(eT) {}
    try { if (onClick) onClick(); } catch(eC) { try { self.toast("切换失败: " + String(eC)); } catch(eToast) {} }
  }}));
  try { row.setContentDescription("打开" + String(cat && cat.title || "设置项")); } catch(eRowDesc) {}
  var lp = new android.widget.LinearLayout.LayoutParams(-1, -2);
  lp.setMargins(0, 0, 0, this.dp(8));
  parent.addView(row, lp);
};

FloatBallAppWM.prototype.buildSettingsHomePanelView = function() {
  if (!this.state.pendingUserCfg) this.beginEditConfig();
  var self = this;
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getSettingsColorScheme();
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  var spec = this.getSettingsResponsiveSpec ? this.getSettingsResponsiveSpec() : null;
  var useMonetHome = true ? true : false;
  var useMasterDetail = spec && spec.useSideBySide;
  var columns = spec ? spec.gridColumnCount : 1;
  var cardRadius = spec ? spec.cardRadius : this.dp(24);
  var gap = spec ? spec.cardGap : this.dp(8);
  var cats = this.getSettingsHomeCategoryDefs(useMonetHome);
  if (cats.length > 0) {
    var savedCat = String(this.state.settingsHomeSelectedCategoryId || "");
    var exists = false;
    for (var ci = 0; ci < cats.length; ci++) if (String(cats[ci].id) === savedCat) exists = true;
    if (!exists) this.state.settingsHomeSelectedCategoryId = String(cats[0].id);
  }

  var panel = this.ui.createStyledPanel(this, 16);
  try { panel.setBackground(this.ui.createRoundDrawable(T.background, spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(18) : this.dp(24))); } catch(ePanelBg) {}
  panel.setPadding(spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(4) : this.dp(8), spec && spec.isLandscape ? this.dp(2) : this.dp(6), spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(4) : this.dp(8), this.dp(4));

  var statusLabel = "已保存";
  var statusValue = "当前生效";
  var statusBg = T.surface;
  var statusStroke = T.outlineVariant;
  var statusValueColor = T.onSurface;
  try {
    if (this.state.previewMode) {
      statusLabel = "预览中"; statusValue = "未保存";
      statusBg = T.primaryContainer; statusStroke = T.primary; statusValueColor = T.primary;
    } else if (this.state.pendingDirty) {
      statusLabel = "有修改"; statusValue = "待保存";
      statusBg = T.primaryContainer; statusStroke = T.primary; statusValueColor = T.primary;
    }
  } catch(eStatus) {}

  try { if (this.maybeAutoCheckToolHubUpdatesFromSettings) this.maybeAutoCheckToolHubUpdatesFromSettings(); } catch(eAutoCheckSettings) {}

  var settingsNoticeContainer = null;
  function setSettingsInlineNotice(msg, kind) {
    try {
      if (self.setInlineNotice) self.setInlineNotice(String(msg || ""), kind || "info");
      else safeLog(self.L, kind === "error" ? "e" : "i", "settings notice: " + String(msg || ""));
    } catch(eNotice) { safeLog(null, 'e', "catch " + String(eNotice)); }
  }

  function saveSettingsNow() {
    try {
      self.touchActivity();
      var r = self.commitPendingUserCfg();
      self.state.previewMode = false;
      if (r && r.ok) {
        safeLog(self.L, "i", "settings saved");
        if (self.state.addedPanel) self.hideMainPanel();
        return;
      }
      setSettingsInlineNotice("保存失败: " + (r && r.reason ? r.reason : (r && r.err ? r.err : "unknown")), "error");
    } catch(e0) { setSettingsInlineNotice("保存异常: " + String(e0), "error"); }
  }
  function addChildEntry(parent, child) {
    self.createSettingsHomeEntry(parent, child.title, child.desc, "", function() {
      if (useMasterDetail) {
        self.state.settingsHomeSelectedItemId = String(child.id || child.key || "");
        renderMasterDetail();
        return;
      }
      if (String(child.kind) === "group") { if (self.pushToolAppSettingsGroup) self.pushToolAppSettingsGroup(child.key); }
      else self.pushToolAppPage(child.key);
    });
  }

  settingsNoticeContainer = new android.widget.LinearLayout(context);
  settingsNoticeContainer.setOrientation(android.widget.LinearLayout.VERTICAL);
  settingsNoticeContainer.setVisibility(android.view.View.GONE);
  var noticeLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
  noticeLp.setMargins(this.dp(2), 0, this.dp(2), this.dp(8));
  panel.addView(settingsNoticeContainer, noticeLp);
  try { this.state.settingsNoticeContainerRef = settingsNoticeContainer; } catch(eNoticeRef) {}
  var pendingNotice = this.consumeInlineNotice ? this.consumeInlineNotice(8000) : null;
  if (pendingNotice && pendingNotice.msg) {
    try {
      this.state.inlineNoticeMsg = String(pendingNotice.msg || "");
      this.state.inlineNoticeKind = String(pendingNotice.kind || "info");
      this.state.inlineNoticeAt = Number(pendingNotice.at || java.lang.System.currentTimeMillis());
      if (this.renderInlineNoticeNow) this.renderInlineNoticeNow();
    } catch(eRenderPending) {}
  }

  if (useMasterDetail) {
    var root = new android.widget.LinearLayout(context);
    root.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    root.setGravity(android.view.Gravity.CENTER);
    panel.addView(root, new android.widget.LinearLayout.LayoutParams(-1, 0, 1));

    var navCard = new android.widget.LinearLayout(context);
    navCard.setOrientation(android.widget.LinearLayout.VERTICAL);
    navCard.setPadding(this.dp(12), this.dp(12), this.dp(12), this.dp(12));
    navCard.setBackground(this.ui.createStrokeDrawable(T.surface, this.withAlpha(T.outlineVariant, isDark ? 0.22 : 0.28), this.dp(1), cardRadius));
    try { navCard.setElevation(this.dp(1)); } catch(eNavElev) {}
    var navTitle = new android.widget.TextView(context);
    navTitle.setText("设置目录");
    toolhubSafeSetTextColor(navTitle, T.onSurface);
    navTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    navTitle.setTypeface(null, android.graphics.Typeface.BOLD);
    navCard.addView(navTitle, new android.widget.LinearLayout.LayoutParams(-1, -2));
    var navSub = new android.widget.TextView(context);
    navSub.setText("选择左侧分类，右侧整理对应设置");
    toolhubSafeSetTextColor(navSub, T.onSurface2);
    navSub.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
    navSub.setPadding(0, this.dp(3), 0, this.dp(10));
    navCard.addView(navSub, new android.widget.LinearLayout.LayoutParams(-1, -2));
    try {
      var navStatusPill = this.createSettingsConfigStatusPill ? this.createSettingsConfigStatusPill(statusLabel, statusValue, statusBg, statusStroke, statusValueColor, true) : null;
      if (navStatusPill) {
        var navStatusPillLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
        navStatusPillLp.setMargins(0, 0, 0, this.dp(8));
        navCard.addView(navStatusPill, navStatusPillLp);
      }
      var updateNavPill = this.createToolHubUpdatePill ? this.createToolHubUpdatePill(!!this.state.settingsUpdateExpanded, true, function() {
        try { if (self.replaceToolAppPage) self.replaceToolAppPage("settings"); } catch(eReplaceNav) {}
      }) : null;
      if (updateNavPill) {
        var updateNavPillLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
        updateNavPillLp.setMargins(0, 0, 0, this.dp(8));
        navCard.addView(updateNavPill, updateNavPillLp);
      }
      if (this.state.settingsUpdateExpanded && this.createToolHubUpdateDetailBox) {
        var updateNavDetail = this.createToolHubUpdateDetailBox();
        var updateNavDetailLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
        updateNavDetailLp.setMargins(0, 0, 0, this.dp(10));
        navCard.addView(updateNavDetail, updateNavDetailLp);
      }
    } catch(eUpdateNav) { safeLog(null, 'e', "catch " + String(eUpdateNav)); }
    var navScroll = new android.widget.ScrollView(context);
    try { navScroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER); navScroll.setVerticalScrollBarEnabled(false); } catch(eNS) {}
    var navList = new android.widget.LinearLayout(context);
    navList.setOrientation(android.widget.LinearLayout.VERTICAL);
    navScroll.addView(navList);
    navCard.addView(navScroll, new android.widget.LinearLayout.LayoutParams(-1, 0, 1));

    var detailCard = new android.widget.LinearLayout(context);
    detailCard.setOrientation(android.widget.LinearLayout.VERTICAL);
    detailCard.setPadding(this.dp(14), this.dp(12), this.dp(14), this.dp(12));
    detailCard.setBackground(this.ui.createStrokeDrawable(T.surface, this.withAlpha(T.outlineVariant, isDark ? 0.22 : 0.26), this.dp(1), cardRadius));
    try { detailCard.setElevation(this.dp(1)); } catch(eDetElev) {}

    function renderMasterDetail() {
      navList.removeAllViews();
      detailCard.removeAllViews();
      var selectedId = String(self.state.settingsHomeSelectedCategoryId || (cats.length ? cats[0].id : ""));
      var selectedCat = cats.length ? cats[0] : null;
      for (var n = 0; n < cats.length; n++) {
        if (String(cats[n].id) === selectedId) selectedCat = cats[n];
      }
      for (var mi = 0; mi < cats.length; mi++) {
        (function(cat) {
          self.createSettingsMasterMenuItem(navList, cat, String(cat.id) === String(selectedCat && selectedCat.id), function() {
            self.state.settingsHomeSelectedCategoryId = String(cat.id);
            self.state.settingsHomeSelectedItemId = null;
            renderMasterDetail();
          });
        })(cats[mi]);
      }

      var selectedItemId = String(self.state.settingsHomeSelectedItemId || "");
      var selectedChild = null;
      if (selectedItemId) {
        var selectedChildren = selectedCat && selectedCat.children ? selectedCat.children : [];
        for (var si = 0; si < selectedChildren.length; si++) {
          if (String(selectedChildren[si].id) === selectedItemId) selectedChild = selectedChildren[si];
        }
        if (!selectedChild) {
          self.state.settingsHomeSelectedItemId = null;
          selectedItemId = "";
        }
      }
      if (selectedChild) {
        if (String(selectedChild.kind) === "group") {
          detailCard.addView(self.buildSettingsGroupDetailPane(selectedChild.key, selectedChild.title, String(selectedCat.title || "") + " / " + String(selectedChild.title || "")), new android.widget.LinearLayout.LayoutParams(-1, -1));
        } else {
          detailCard.addView(self.buildSettingsRouteDetailPane(selectedChild.key, selectedChild.title, String(selectedCat.title || "") + " / " + String(selectedChild.title || "")), new android.widget.LinearLayout.LayoutParams(-1, -1));
        }
        try { detailCard.setAlpha(0.98); detailCard.animate().alpha(1.0).setDuration(90).start(); } catch(eAnimDetail) {}
        return;
      }
      var head = new android.widget.LinearLayout(context);
      head.setOrientation(android.widget.LinearLayout.HORIZONTAL);
      head.setGravity(android.view.Gravity.CENTER_VERTICAL);
      head.setPadding(self.dp(2), 0, self.dp(2), self.dp(10));
      var hIcon = new android.widget.TextView(context);
      hIcon.setText(String(selectedCat && selectedCat.icon || "✦"));
      hIcon.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 20);
      hIcon.setGravity(android.view.Gravity.CENTER);
      toolhubSafeSetTextColor(hIcon, T.primary);
      hIcon.setBackground(self.ui.createRoundDrawable(T.primaryContainer, self.dp(15)));
      var hIconLp = new android.widget.LinearLayout.LayoutParams(self.dp(46), self.dp(46));
      hIconLp.setMargins(0, 0, self.dp(12), 0);
      head.addView(hIcon, hIconLp);
      var hTexts = new android.widget.LinearLayout(context);
      hTexts.setOrientation(android.widget.LinearLayout.VERTICAL);
      var hTitle = new android.widget.TextView(context);
      hTitle.setText(String(selectedCat && selectedCat.title || "设置分类"));
      toolhubSafeSetTextColor(hTitle, T.onSurface);
      hTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 18);
      hTitle.setTypeface(null, android.graphics.Typeface.BOLD);
      hTexts.addView(hTitle, new android.widget.LinearLayout.LayoutParams(-1, -2));
      var hDesc = new android.widget.TextView(context);
      hDesc.setText(String(selectedCat && selectedCat.desc || ""));
      toolhubSafeSetTextColor(hDesc, T.onSurface2);
      hDesc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      hDesc.setPadding(0, self.dp(3), 0, 0);
      hTexts.addView(hDesc, new android.widget.LinearLayout.LayoutParams(-1, -2));
      head.addView(hTexts, new android.widget.LinearLayout.LayoutParams(0, -2, 1));
      detailCard.addView(head, new android.widget.LinearLayout.LayoutParams(-1, -2));

      var scroll = new android.widget.ScrollView(context);
      try { scroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER); scroll.setVerticalScrollBarEnabled(false); } catch(eDS) {}
      var gridCols = (spec && spec.isWideWidth) ? 2 : 1;
      var list = gridCols > 1 ? self.createSettingsGridContainer(gridCols) : new android.widget.LinearLayout(context);
      if (gridCols <= 1) list.setOrientation(android.widget.LinearLayout.VERTICAL);
      list.setPadding(0, self.dp(2), 0, self.dp(16));
      scroll.addView(list);
      var children = selectedCat && selectedCat.children ? selectedCat.children : [];
      for (var ci2 = 0; ci2 < children.length; ci2++) addChildEntry(list, children[ci2]);
      detailCard.addView(scroll, new android.widget.LinearLayout.LayoutParams(-1, 0, 1));

      var saveRow = new android.widget.LinearLayout(context);
      saveRow.setGravity(android.view.Gravity.RIGHT | android.view.Gravity.CENTER_VERTICAL);
      saveRow.setPadding(0, self.dp(8), 0, 0);
      var btnSave = self.ui.createSolidButton(self, "保存设置", T.primary, T.onPrimary, saveSettingsNow);
      btnSave.setPadding(self.dp(18), 0, self.dp(18), 0);
      try { btnSave.setBackground(self.ui.createStrokeDrawable(T.primary, self.withAlpha(T.primary, isDark ? 0.22 : 0.16), self.dp(1), self.dp(24))); } catch(eSaveBg) {}
      try { btnSave.setElevation(self.dp(1)); } catch(eSaveElev) {}
      var saveLp = new android.widget.LinearLayout.LayoutParams(self.dp(spec && spec.isWideWidth ? 300 : 260), self.dp(48));
      saveRow.addView(btnSave, saveLp);
      detailCard.addView(saveRow, new android.widget.LinearLayout.LayoutParams(-1, -2));
      try { detailCard.setAlpha(0.98); detailCard.animate().alpha(1.0).setDuration(90).start(); } catch(eAnim) {}
    }

    renderMasterDetail();
    var navWidth = spec && spec.isWideWidth ? this.dp(340) : this.dp(310);
    var navLp = new android.widget.LinearLayout.LayoutParams(navWidth, -1);
    navLp.setMargins(0, 0, gap, 0);
    root.addView(navCard, navLp);
    root.addView(detailCard, new android.widget.LinearLayout.LayoutParams(0, -1, 1));
    return panel;
  }

  this.createIslandWelcomeCard(panel, statusLabel, statusValue, statusBg, statusStroke, statusValueColor);

  var contentCard = new android.widget.LinearLayout(context);
  contentCard.setOrientation(android.widget.LinearLayout.VERTICAL);
  contentCard.setPadding(spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(10) : this.dp(12), spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(8) : this.dp(10), spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(10) : this.dp(12), this.dp(10));
  contentCard.setBackground(this.ui.createStrokeDrawable(T.surface, this.withAlpha(T.outlineVariant, isDark ? 0.24 : 0.26), this.dp(1), cardRadius));
  try { contentCard.setElevation(this.dp(useMonetHome ? 1 : ((spec && (spec.isExpandedWidth || spec.isWideWidth)) ? 1 : 3))); } catch(eContentElev) {}

  var scroll = new android.widget.ScrollView(context);
  try { scroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER); scroll.setVerticalScrollBarEnabled(false); } catch(eOS) {}
  var box = new android.widget.LinearLayout(context);
  box.setOrientation(android.widget.LinearLayout.VERTICAL);
  box.setPadding(0, 0, 0, this.dp(8));
  scroll.addView(box);
  scroll.setOnTouchListener(new JavaAdapter(android.view.View.OnTouchListener, { onTouch: function(v, e) { self.touchActivity(); return false; }}));

  for (var cidx = 0; cidx < cats.length; cidx++) {
    var cat0 = cats[cidx];
    this.createSettingsHomeSectionHeader(box, cat0.icon, cat0.title);
    var grid = columns > 1 ? this.createSettingsGridContainer(columns) : new android.widget.LinearLayout(context);
    if (columns <= 1) grid.setOrientation(android.widget.LinearLayout.VERTICAL);
    box.addView(grid, new android.widget.LinearLayout.LayoutParams(-1, -2));
    for (var ch = 0; ch < cat0.children.length; ch++) addChildEntry(grid, cat0.children[ch]);
  }

  contentCard.addView(scroll, new android.widget.LinearLayout.LayoutParams(-1, 0, 1));
  panel.addView(contentCard, new android.widget.LinearLayout.LayoutParams(-1, 0, 1));

  var bottom = new android.widget.LinearLayout(context);
  bottom.setOrientation(android.widget.LinearLayout.VERTICAL);
  bottom.setGravity(android.view.Gravity.CENTER);
  bottom.setPadding(this.dp(14), spec && spec.isLandscape ? this.dp(4) : this.dp(8), this.dp(14), spec && spec.isLandscape ? this.dp(8) : this.dp(14));
  bottom.setBackground(this.ui.createRoundDrawable(this.withAlpha(T.background, isDark ? 0.70 : 0.82), this.dp(20)));
  var deco = new android.widget.TextView(context);
  deco.setText(spec && (spec.isExpandedWidth || spec.isWideWidth) ? "────────        ────────" : "──────              ──────");
  deco.setGravity(android.view.Gravity.CENTER);
  toolhubSafeSetTextColor(deco, this.withAlpha(T.primary, isDark ? 0.30 : 0.24));
  deco.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 10);
  if (!(spec && spec.isLandscape)) bottom.addView(deco, new android.widget.LinearLayout.LayoutParams(-1, this.dp(14)));
  var bottomSave = this.ui.createSolidButton(this, "保存设置", T.primary, T.onPrimary, saveSettingsNow);
  bottomSave.setPadding(this.dp(18), 0, this.dp(18), 0);
  try { bottomSave.setBackground(this.ui.createStrokeDrawable(T.primary, this.withAlpha(T.primary, isDark ? 0.22 : 0.16), this.dp(1), this.dp(23))); } catch(eSaveBg2) {}
  try { bottomSave.setElevation(this.dp(1)); } catch(eSaveElev2) {}
  var saveLp2 = new android.widget.LinearLayout.LayoutParams(-1, this.dp(48));
  saveLp2.setMargins(spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(80) : this.dp(34), this.dp(4), spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(80) : this.dp(34), 0);
  bottom.addView(bottomSave, saveLp2);
  var bottomLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
  bottomLp.setMargins(this.dp(2), this.dp(4), this.dp(2), 0);
  panel.addView(bottom, bottomLp);
  return panel;
};

FloatBallAppWM.prototype.buildSettingsPanelView = function() {
  if (!this.state.settingsGroupKey) return this.buildSettingsHomePanelView();
  return this.buildSettingsGroupPanelView();
};

FloatBallAppWM.prototype.buildSettingsGroupPanelView = function() {
  if (!this.state.pendingUserCfg) this.beginEditConfig();

  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getSettingsColorScheme();

  // 设置页主题切换：animal（默认动物岛风）或 monet（系统莫奈色）
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;

  var bgColor = T.background;
  var cardColor = T.surface;
  var textColor = T.onSurface;
  var spec = this.getSettingsResponsiveSpec ? this.getSettingsResponsiveSpec() : null;
  var columns = spec ? spec.gridColumnCount : 1;
  var cardRadius = spec ? spec.cardRadius : this.dp(18);
  var activeGroupKey = String(this.state.settingsGroupKey || "");

  var panel = this.ui.createStyledPanel(this, 16);
  try { panel.setBackground(this.ui.createRoundDrawable(T.background, spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(16) : this.dp(18))); } catch(ePanelBg) {}
  panel.setPadding(spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(4) : this.dp(8), spec && spec.isLandscape ? this.dp(2) : this.dp(6), spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(4) : this.dp(8), this.dp(4));
  var settingsGroupNotice = null;
  function setSettingsGroupNotice(msg, kind) {
    try {
      if (!settingsGroupNotice) return;
      settingsGroupNotice.removeAllViews();
      var k = String(kind || "info");
      var color = (k === "error") ? C.error : T.primary;
      var bg = (k === "error") ? self.withAlpha(C.error, isDark ? 0.20 : 0.10) : self.withAlpha(T.primary, isDark ? 0.18 : 0.10);
      var stroke = (k === "error") ? self.withAlpha(C.error, isDark ? 0.44 : 0.30) : self.withAlpha(T.primary, isDark ? 0.34 : 0.22);
      var tv = new android.widget.TextView(context);
      tv.setText(String(msg || ""));
      toolhubSafeSetTextColor(tv, color);
      tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      tv.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
      tv.setBackground(self.ui.createStrokeDrawable(bg, stroke, self.dp(1), self.dp(14)));
      settingsGroupNotice.addView(tv, new android.widget.LinearLayout.LayoutParams(-1, -2));
      settingsGroupNotice.setVisibility(android.view.View.VISIBLE);
    } catch(eSGN) { safeLog(null, 'e', "catch " + String(eSGN)); }
  }
  var header = this.ui.createStyledHeader(this, spec && spec.isLandscape ? 4 : 8);

  // 占位 View 顶替标题位置，让右侧按钮靠右
  header.addView(this.ui.createSpacer(this));

  var self = this;

  // 分组页顶部只保留预览与保存，文档/按钮管理已移动到设置首页入口。

  // 预览模式开关
  var previewBox = new android.widget.LinearLayout(context);
  previewBox.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  previewBox.setGravity(android.view.Gravity.CENTER_VERTICAL);
  previewBox.setPadding(this.dp(8), this.dp(2), this.dp(4), this.dp(2));
  previewBox.setBackground(self.ui.createRoundDrawable(self.withAlpha(T.primaryContainer, isDark ? 0.70 : 0.95), self.dp(16))); // 浅色背景提示

  var tvPreview = new android.widget.TextView(context);
  tvPreview.setText("边调边看");
  toolhubSafeSetTextColor(tvPreview, T.primary);
  tvPreview.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  tvPreview.setTypeface(null, android.graphics.Typeface.BOLD);
  tvPreview.setPadding(0, 0, this.dp(4), 0);
  previewBox.addView(tvPreview);

  var switchPreview = new android.widget.Switch(context);
  try { switchPreview.setTextOn(""); switchPreview.setTextOff("");  } catch(eT) { safeLog(null, 'e', "catch " + String(eT)); }
  try {
      var states = [[android.R.attr.state_checked], [-android.R.attr.state_checked]];
      var thumbColors = [T.primary, isDark ? T.surface2 : (0xFFCCCCCC | 0)];
      var trackColors = [self.withAlpha(T.primary, 0.5), self.withAlpha(isDark ? T.surface2 : (0xFFCCCCCC | 0), 0.5)];
      toolhubSafeApplyColorStateList(switchPreview, "setThumbTintList", toolhubSafeColorStateListFromStates(states, thumbColors));
      toolhubSafeApplyColorStateList(switchPreview, "setTrackTintList", toolhubSafeColorStateListFromStates(states, trackColors));
   } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

  switchPreview.setChecked(!!self.state.previewMode);
  switchPreview.setOnCheckedChangeListener(new android.widget.CompoundButton.OnCheckedChangeListener({
      onCheckedChanged: function(btn, checked) {
          self.touchActivity();
          self.state.previewMode = !!checked;
          if (checked) {
              setSettingsGroupNotice("边调边看已开启", "ok");
              toolhubSafeSetTextColor(tvPreview, T.primary);
              previewBox.setBackground(self.ui.createRoundDrawable(self.withAlpha(T.primaryContainer, isDark ? 0.70 : 0.95), self.dp(16)));
              self.refreshPreview();
          } else {
              setSettingsGroupNotice("预览模式已关闭", "info");
              toolhubSafeSetTextColor(tvPreview, 0xFF888888 | 0);
              previewBox.setBackground(null);
              if (self.state.addedPanel) self.hideMainPanel();
              self.rebuildBallForNewSize(true);
          }
      }
  }));
  previewBox.addView(switchPreview);

  header.addView(previewBox);

  // [恢复] 保存按钮（放在最后一位）
  var btnOk = this.ui.createSolidButton(this, "保存设置", T.primary, T.onPrimary, function() {
      try {
        self.touchActivity();
        if (self.L) self.L.i("settings confirm click");

        var r = self.commitPendingUserCfg();
        self.state.previewMode = false;
        if (self.state.addedPanel) self.hideMainPanel();

        if (r && r.ok) setSettingsGroupNotice("已保存并生效", "ok");
        else setSettingsGroupNotice("保存失败: " + (r && r.reason ? r.reason : (r && r.err ? r.err : "unknown")), "error");
      } catch (e0) {
        setSettingsGroupNotice("保存异常: " + String(e0), "error");
        if (self.L) self.L.e("settings confirm err=" + String(e0));
      }
  });
  btnOk.setPadding(self.dp(12), self.dp(6), self.dp(12), self.dp(6));
  btnOk.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
  header.addView(btnOk);

  // 暴露 Header
  panel.setTag(header);
  panel.addView(header);
  settingsGroupNotice = new android.widget.LinearLayout(context);
  settingsGroupNotice.setOrientation(android.widget.LinearLayout.VERTICAL);
  settingsGroupNotice.setVisibility(android.view.View.GONE);
  var settingsGroupNoticeLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
  settingsGroupNoticeLp.setMargins(this.dp(2), this.dp(2), this.dp(2), this.dp(8));
  panel.addView(settingsGroupNotice, settingsGroupNoticeLp);


  if (activeGroupKey === "ball" && this.buildBallPreviewView) {
    try {
      var fixedPreview2 = this.buildBallPreviewView();
      var fixedPreviewLp2 = new android.widget.LinearLayout.LayoutParams(-1, -2);
      fixedPreviewLp2.setMargins(this.dp(2), this.dp(2), this.dp(2), this.dp(8));
      panel.addView(fixedPreview2, fixedPreviewLp2);
    } catch(eFixedPreview2) { safeLog(null, 'e', "catch " + String(eFixedPreview2)); }
    try { if (this.createBallSettingsSubtabBar) this.createBallSettingsSubtabBar(panel, function(k) { if (self.refreshBallSettingsSubtabPage) self.refreshBallSettingsSubtabPage(); }); } catch(eBallTabs2) { safeLog(null, 'e', "catch " + String(eBallTabs2)); }
  }

  var scroll = new android.widget.ScrollView(context);
  try { scroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);  } catch(eOS) { safeLog(null, 'e', "catch " + String(eOS)); }
  try { scroll.setVerticalScrollBarEnabled(false);  } catch(eSB) { safeLog(null, 'e', "catch " + String(eSB)); }

  var box = columns > 1 ? this.createSettingsGridContainer(columns) : new android.widget.LinearLayout(context);
  if (columns <= 1) box.setOrientation(android.widget.LinearLayout.VERTICAL);
  box.setPadding(0, this.dp(4), 0, this.dp(12));
  scroll.addView(box);

  if (activeGroupKey === "debug" && this.createColorSafetyRuntimeDiagnosticCard) {
    try {
      var colorSafetyCardCompact = this.createColorSafetyRuntimeDiagnosticCard();
      var colorSafetyCardCompactLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
      colorSafetyCardCompactLp.setMargins(this.dp(2), this.dp(2), this.dp(2), this.dp(8));
      box.addView(colorSafetyCardCompact, colorSafetyCardCompactLp);
    } catch(eColorSafetyCardCompact) {
      safeLog(this.L, "e", "create compact runtime records card fail error=" + String(eColorSafetyCardCompact));
    }
  }

  scroll.setOnTouchListener(new JavaAdapter(android.view.View.OnTouchListener, {
    onTouch: function(v, e) { self.touchActivity(); return false; }
  }));

  var schema = this.getConfigSchema();
  var activeBallSubtab = activeGroupKey === "ball" && this.getActiveBallSettingsSubtab ? this.getActiveBallSettingsSubtab() : "";
  var activeBallSubtabDef = activeGroupKey === "ball" && this.getBallSettingsSubtabDef ? this.getBallSettingsSubtabDef(activeBallSubtab) : null;
  var currentCard = null;
  var includeSection = false;
  var activePointerBlockKey = "";

  function createCard() {
      var c = new android.widget.LinearLayout(context);
      c.setOrientation(android.widget.LinearLayout.VERTICAL);
      c.setBackground(self.ui.createStrokeDrawable(cardColor, self.withAlpha(T.outlineVariant, isDark ? 0.22 : 0.30), self.dp(1), cardRadius));
      try { c.setElevation(self.dp((spec && (spec.isExpandedWidth || spec.isWideWidth)) ? 1 : 2));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
      try { c.setClipToOutline(true);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
      if (columns > 1) {
        var glp = new android.widget.GridLayout.LayoutParams();
        glp.width = 0;
        glp.height = android.widget.GridLayout.LayoutParams.WRAP_CONTENT;
        glp.columnSpec = android.widget.GridLayout.spec(android.widget.GridLayout.UNDEFINED, 1, 1);
        glp.setMargins(self.dp(6), self.dp(6), self.dp(6), self.dp(8));
        c.setLayoutParams(glp);
      } else {
        var lp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.setMargins(self.dp(2), self.dp(6), self.dp(2), self.dp(6));
        c.setLayoutParams(lp);
      }
      // Remove padding to allow items to be full-width (for ripple)
      c.setPadding(0, 0, 0, self.dp(4));
      return c;
  }

  for (var i = 0; i < schema.length; i++) {
    (function(item) {
      if (item && String(item.type) === "section") {
        includeSection = self.isSchemaSectionInSettingsGroup(String(item.name || ""), activeGroupKey);
        if (!includeSection) { currentCard = null; return; }
        if (activeGroupKey === "pointer") {
          currentCard = null;
          activePointerBlockKey = "";
          return;
        }
        currentCard = createCard();
        box.addView(currentCard);
        if (activeGroupKey === "ball" && activeBallSubtabDef) self.createSectionHeader({ type: "section", name: String(activeBallSubtabDef.title || "悬浮球") }, currentCard);
        else self.createSectionHeader(item, currentCard);
      } else {
        if (!includeSection) return;
        if (activeGroupKey === "ball" && self.isSchemaItemInBallSubtab && !self.isSchemaItemInBallSubtab(item, activeBallSubtab)) return;
        if (activeGroupKey === "pointer" && self.getPointerSettingsBlockDefForItem) {
          var pBlock = self.getPointerSettingsBlockDefForItem(item);
          var nextBlockKey = pBlock ? String(pBlock.key || "other") : "other";
          if (!currentCard || String(activePointerBlockKey || "") !== nextBlockKey) {
            currentCard = createCard();
            box.addView(currentCard);
            activePointerBlockKey = nextBlockKey;
            self.createSectionHeader({ type: "section", name: pBlock ? String(pBlock.title || "其他") : "其他" }, currentCard);
            if (self.createPointerSettingsBlockDesc) self.createPointerSettingsBlockDesc(currentCard, pBlock);
          }
          var needDividerPointer = (currentCard.getChildCount() > 0);
          if (currentCard.getChildCount() <= 2) needDividerPointer = false;
          self.createSettingItemView(item, currentCard, needDividerPointer);
          return;
        }
        if (!currentCard) {
            currentCard = createCard();
            box.addView(currentCard);
        }
        var needDivider = (currentCard.getChildCount() > 0);
        if (currentCard.getChildCount() === 1) needDivider = false;
        self.createSettingItemView(item, currentCard, needDivider);
      }
    })(schema[i]);
  }

  panel.addView(scroll, new android.widget.LinearLayout.LayoutParams(-1, 0, 1));
  return panel;
};

// =======================【按钮编辑面板】======================

FloatBallAppWM.prototype.showPopupOverlay = function(opts) {
  var self = this;
  var opt = opts || {};
  var title = String(opt.title || "");
  var onDismiss = (typeof opt.onDismiss === "function") ? opt.onDismiss : null;
  var builder = (typeof opt.builder === "function") ? opt.builder : null;
  var footerBuilder = (typeof opt.footerBuilder === "function") ? opt.footerBuilder : null;

  var PT = this.getIslandPickerTheme ? this.getIslandPickerTheme() : null;
  var isDark = PT ? PT.isDark : this.isDarkTheme();
  var C = this.ui.colors;
  var T = PT ? PT.T : this.getSettingsColorScheme();
  var wm = this.state.wm;

  var dm = context.getResources().getDisplayMetrics();
  var sw = Number(dm.widthPixels || 0);
  var sh = Number(dm.heightPixels || 0);
  try {
    if (self.getScreenSizePx) {
      var ss = self.getScreenSizePx();
      if (ss && ss.w > 0 && ss.h > 0) { sw = ss.w; sh = ss.h; }
    }
  } catch(eScreenSize) { safeLog(null, 'e', "catch " + String(eScreenSize)); }
  if (sw <= 0) sw = self.dp(360);
  if (sh <= 0) sh = self.dp(640);
  var preferAllVisible = !!opt.preferAllVisible;
  var panelWidth = Math.round(sw * 0.92);
  var panelHeight = preferAllVisible ? Math.min(self.dp(590), sh - self.dp(36)) : Math.min(self.dp(520), Math.round(sh * 0.68));
  if (panelWidth > self.dp(420)) panelWidth = self.dp(420);
  if (panelWidth < self.dp(300)) panelWidth = Math.min(sw - self.dp(16), self.dp(300));
  if (preferAllVisible) {
    if (panelHeight < self.dp(540)) panelHeight = Math.min(sh - self.dp(24), self.dp(540));
  } else {
    if (panelHeight > sh - self.dp(48)) panelHeight = sh - self.dp(48);
    if (panelHeight < self.dp(420)) panelHeight = Math.min(sh - self.dp(24), self.dp(420));
  }

  var popupClosed = false;
  var popupBackDispatcher = null;
  var popupBackCallback = null;
  var popupHomeDownX = 0;
  var popupHomeDownY = 0;
  var popupHomeEligible = false;
  var popupHomeActive = false;
  var root = new JavaAdapter(android.widget.FrameLayout, {
    onInterceptTouchEvent: function(ev) {
      try {
        if (!ev || popupClosed) return false;
        var action = ev.getActionMasked();
        if (action === android.view.MotionEvent.ACTION_DOWN) {
          popupHomeDownX = ev.getX();
          popupHomeDownY = ev.getY();
          popupHomeEligible = false;
          popupHomeActive = false;
          var h = 0;
          try { h = this.getHeight(); } catch(eH) { h = 0; }
          var bottomEdge = self.dp(72);
          if (h > 0 && popupHomeDownY >= h - bottomEdge) popupHomeEligible = true;
          return false;
        }
        if (action === android.view.MotionEvent.ACTION_MOVE) {
          if (!popupHomeEligible) return false;
          var dx = ev.getX() - popupHomeDownX;
          var dy = ev.getY() - popupHomeDownY;
          var adx = Math.abs(dx);
          var ady = Math.abs(dy);
          var slop = Math.max(self.dp(12), self.dp(Number(self.config.CLICK_SLOP_DP || 6)) * 2);
          if (dy < -slop && ady > adx * 1.15) {
            popupHomeActive = true;
            return true;
          }
        }
      } catch(eRootIntercept) { try { safeLog(self.L, 'w', 'popup root intercept fail: ' + String(eRootIntercept)); } catch(eLogRootInt) {} }
      return false;
    },
    onTouchEvent: function(ev) {
      try {
        if (!ev || !popupHomeActive) return false;
        var action = ev.getActionMasked();
        if (action === android.view.MotionEvent.ACTION_MOVE) {
          var my = ev.getY() - popupHomeDownY;
          var mx = ev.getX() - popupHomeDownX;
          if (my < -self.dp(36) && Math.abs(my) > Math.abs(mx) * 1.1) {
            closePopup();
            popupHomeActive = false;
            popupHomeEligible = false;
          }
          return true;
        }
        if (action === android.view.MotionEvent.ACTION_UP || action === android.view.MotionEvent.ACTION_CANCEL) {
          var uy0 = ev.getY() - popupHomeDownY;
          var ux0 = ev.getX() - popupHomeDownX;
          if (action === android.view.MotionEvent.ACTION_UP && uy0 < -self.dp(36) && Math.abs(uy0) > Math.abs(ux0) * 1.1) closePopup();
          popupHomeActive = false;
          popupHomeEligible = false;
          return true;
        }
        return true;
      } catch(eRootTouch) {
        popupHomeActive = false;
        popupHomeEligible = false;
        try { safeLog(self.L, 'w', 'popup root touch fail: ' + String(eRootTouch)); } catch(eLogRootTouch) {}
      }
      return false;
    },
    onWindowFocusChanged: function(hasFocus) {
      try {
        android.widget.FrameLayout.prototype.onWindowFocusChanged.call(this, hasFocus);
      } catch(eSuperFocus) {}
      try {
        if (popupClosed) return;
        // 用户底部上滑回主页 / 进入后台时，overlay 往往会失去焦点；弹窗应自动关闭。
        if (!hasFocus) this.post(new java.lang.Runnable({ run: function() { closePopup(); } }));
      } catch(eFocusClose) {}
    },
    onWindowVisibilityChanged: function(visibility) {
      try {
        android.widget.FrameLayout.prototype.onWindowVisibilityChanged.call(this, visibility);
      } catch(eSuperVis) {}
      try {
        if (popupClosed) return;
        if (visibility !== android.view.View.VISIBLE) this.post(new java.lang.Runnable({ run: function() { closePopup(); } }));
      } catch(eVisClose) {}
    },
    onDetachedFromWindow: function() {
      try { popupClosed = true; } catch(eMarkDetached) {}
      try {
        android.widget.FrameLayout.prototype.onDetachedFromWindow.call(this);
      } catch(eSuperDetach) {}
    }
  }, context);
  toolhubSafeSetBackgroundColor(root, self.withAlpha(isDark ? 0xFF000000 : 0xFFFFFFFF, isDark ? 0.58 : 0.42));
  root.setClickable(true);
  try { root.setFocusable(true); root.setFocusableInTouchMode(true); } catch(eRootFocus) {}
  try {
    root.setOnKeyListener(new android.view.View.OnKeyListener({
      onKey: function(v, keyCode, event) {
        try {
          if (keyCode === android.view.KeyEvent.KEYCODE_BACK && event && event.getAction && event.getAction() === android.view.KeyEvent.ACTION_UP) {
            closePopup();
            return true;
          }
        } catch(eKey) {}
        return false;
      }
    }));
  } catch(eRootKey) {}

  var popupBackDownX = 0;
  var popupBackDownY = 0;
  var popupBackEdge = -1;
  var popupBackEligible = false;
  var popupBackActive = false;
  var popupBackMoved = false;
  var card = new JavaAdapter(android.widget.LinearLayout, {
    onInterceptTouchEvent: function(ev) {
      try {
        if (!ev) return false;
        var action = ev.getActionMasked();
        if (action === android.view.MotionEvent.ACTION_DOWN) {
          popupBackDownX = ev.getX();
          popupBackDownY = ev.getY();
          popupBackEdge = -1;
          popupBackEligible = false;
          popupBackActive = false;
          popupBackMoved = false;
          var edgeW = self.dp(56);
          var cw = 0;
          try { cw = this.getWidth(); } catch(eW) { cw = 0; }
          if (popupBackDownX <= edgeW) { popupBackEdge = 0; popupBackEligible = true; }
          else if (cw > 0 && popupBackDownX >= cw - edgeW) { popupBackEdge = 1; popupBackEligible = true; }
          return false;
        }
        if (action === android.view.MotionEvent.ACTION_MOVE) {
          if (!popupBackEligible) return false;
          var dx = ev.getX() - popupBackDownX;
          var dy = ev.getY() - popupBackDownY;
          var adx = Math.abs(dx);
          var ady = Math.abs(dy);
          var validDir = (popupBackEdge === 0 && dx > 0) || (popupBackEdge === 1 && dx < 0);
          var slop = Math.max(self.dp(8), self.dp(Number(self.config.CLICK_SLOP_DP || 6)));
          if (validDir && adx > slop && adx > ady * 0.9) {
            popupBackActive = true;
            popupBackMoved = true;
            // 只识别滑动关闭手势，不再跟手平移卡片；ColorOS overlay 平移会留下上一帧拖影。
            try { this.setTranslationX(0); this.setAlpha(1); } catch(eTx) {}
            return true;
          }
        }
      } catch(eIntercept) { try { safeLog(self.L, 'w', 'popup back intercept fail: ' + String(eIntercept)); } catch(eLog) {} }
      return false;
    },
    onTouchEvent: function(ev) {
      try {
        if (!ev || !popupBackActive) return false;
        var action = ev.getActionMasked();
        if (action === android.view.MotionEvent.ACTION_MOVE) {
          var mx = ev.getX() - popupBackDownX;
          var my = ev.getY() - popupBackDownY;
          var validDir2 = (popupBackEdge === 0 && mx > 0) || (popupBackEdge === 1 && mx < 0);
          if (validDir2 && Math.abs(mx) > Math.abs(my) * 0.9) {
            popupBackMoved = true;
            // 手势过程中保持卡片固定，避免 overlay translation 产生拖影/重复影像。
            try { this.setTranslationX(0); this.setAlpha(1); } catch(eMoveReset) {}
          }
          return true;
        }
        if (action === android.view.MotionEvent.ACTION_UP || action === android.view.MotionEvent.ACTION_CANCEL) {
          var ux = ev.getX() - popupBackDownX;
          var uy = ev.getY() - popupBackDownY;
          var okDir = (popupBackEdge === 0 && ux > self.dp(72)) || (popupBackEdge === 1 && ux < -self.dp(72));
          var ok = action === android.view.MotionEvent.ACTION_UP && popupBackMoved && okDir && Math.abs(ux) > Math.abs(uy) * 0.9;
          popupBackActive = false;
          popupBackEligible = false;
          popupBackMoved = false;
          popupBackEdge = -1;
          if (ok) {
            try { this.setTranslationX(0); this.setAlpha(1); } catch(eOkReset) {}
            closePopup();
          } else {
            try { this.setTranslationX(0); this.setAlpha(1); } catch(eCancelReset) {}
          }
          return true;
        }
        return true;
      } catch(eTouch) {
        popupBackActive = false;
        popupBackEligible = false;
        popupBackMoved = false;
        popupBackEdge = -1;
        try { this.setTranslationX(0); this.setAlpha(1); } catch(eReset) {}
        try { safeLog(self.L, 'w', 'popup back touch fail: ' + String(eTouch)); } catch(eLog2) {}
      }
      return false;
    }
  }, context);
  card.setOrientation(android.widget.LinearLayout.VERTICAL);
  var cardLp = new android.widget.FrameLayout.LayoutParams(panelWidth, panelHeight);
  cardLp.gravity = android.view.Gravity.CENTER;
  card.setLayoutParams(cardLp);
  card.setBackground(self.ui.createStrokeDrawable(T.surface, self.withAlpha(T.primary, isDark ? 0.28 : 0.22), self.dp(1), self.dp(24)));
  card.setPadding(self.dp(14), self.dp(12), self.dp(14), self.dp(12));
  try { card.setElevation(self.dp(10)); } catch(eCardElev) {}

  var header = new android.widget.LinearLayout(context);
  header.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  header.setGravity(android.view.Gravity.CENTER_VERTICAL);
  var titleTv = new android.widget.TextView(context);
  titleTv.setText(String(title || ""));
  toolhubSafeSetTextColor(titleTv, T.onSurface);
  titleTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
  titleTv.setTypeface(null, android.graphics.Typeface.BOLD);
  header.addView(titleTv, new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1));

  var closeBtn = self.ui.createCompactFlatButton ? self.ui.createCompactFlatButton(self, "×", T.primary, function() {
    closePopup();
  }) : self.ui.createFlatButton(self, "×", T.primary, function() {
    closePopup();
  });
  closeBtn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 18);
  closeBtn.setTypeface(null, android.graphics.Typeface.BOLD);
  closeBtn.setGravity(android.view.Gravity.CENTER);
  closeBtn.setPadding(0, 0, 0, 0);
  try { closeBtn.setContentDescription("关闭弹窗"); } catch(eCloseDesc) {}
  try { closeBtn.setMinWidth(self.dp(48)); closeBtn.setMinHeight(self.dp(48)); } catch(eCloseMin) {}
  try { closeBtn.setBackground(self.ui.createStrokeDrawable(T.primaryContainer, self.withAlpha(T.primary, isDark ? 0.30 : 0.22), self.dp(1), self.dp(22))); } catch(eCloseBg) {}
  header.addView(closeBtn, new android.widget.LinearLayout.LayoutParams(self.dp(48), self.dp(48)));
  card.addView(header);

  var scroll = new android.widget.ScrollView(context);
  try { scroll.setFillViewport(false); } catch(eFill) {}
  try { scroll.setVerticalScrollBarEnabled(false); } catch(eBar) {}
  var scrollLp = new android.widget.LinearLayout.LayoutParams(
    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
    0
  );
  scrollLp.weight = 1;
  scroll.setLayoutParams(scrollLp);

  var content = new android.widget.LinearLayout(context);
  content.setOrientation(android.widget.LinearLayout.VERTICAL);
  content.setPadding(0, self.dp(8), 0, 0);
  scroll.addView(content, new android.widget.FrameLayout.LayoutParams(
    android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
    android.widget.FrameLayout.LayoutParams.WRAP_CONTENT
  ));
  card.addView(scroll);

  var footer = new android.widget.LinearLayout(context);
  footer.setOrientation(android.widget.LinearLayout.VERTICAL);
  footer.setVisibility(android.view.View.GONE);
  try { footer.setPadding(0, self.dp(6), 0, 0); } catch(eFooterPad) {}
  card.addView(footer, new android.widget.LinearLayout.LayoutParams(
    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
  ));

  root.addView(card);

  root.setOnClickListener(new android.view.View.OnClickListener({
    onClick: function(v) { closePopup(); }
  }));
  card.setOnClickListener(new android.view.View.OnClickListener({
    onClick: function(v) { /* 阻止冒泡 */ }
  }));

  var lp = new android.view.WindowManager.LayoutParams(
    android.view.WindowManager.LayoutParams.MATCH_PARENT,
    android.view.WindowManager.LayoutParams.MATCH_PARENT,
    android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
    android.view.WindowManager.LayoutParams.FLAG_DIM_BEHIND,
    android.graphics.PixelFormat.TRANSLUCENT
  );
  lp.dimAmount = isDark ? 0.55 : 0.38;
  lp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
  lp.x = 0;
  lp.y = 0;
  lp.softInputMode = android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING
    | android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN;

  try { wm.addView(root, lp); } catch(eAdd) { safeLog(self.L, 'e', "popup addView fail: " + String(eAdd)); return null; }
  try {
    if (!self.state) self.state = {};
    // 接入 ToolHub 统一面板关闭链路：handleSystemUiDismiss()/hideAllPanels() 会关闭临时弹窗。
    // 不在颜色面板里另起 ACTION_CLOSE_SYSTEM_DIALOGS receiver，避免和设置主页/ToolApp 的返回机制分叉。
    self.state.activePopupDismiss = function() { closePopup(); };
  } catch(ePopupState) { try { safeLog(self.L, 'w', 'popup dismiss hook fail: ' + String(ePopupState)); } catch(eLogPopupState) {} }
  try {
    root.requestFocus();
    root.post(new java.lang.Runnable({ run: function() {
      try {
        if (popupClosed) return;
        var dispatcher = null;
        try { dispatcher = root.findOnBackInvokedDispatcher(); } catch(eFindBack) { dispatcher = null; }
        if (!dispatcher) return;
        var cbCls = java.lang.Class.forName("android.window.OnBackInvokedCallback");
        var cb = new JavaAdapter(cbCls, { onBackInvoked: function() { closePopup(); } });
        var priority = 0;
        try { priority = android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT; } catch(ePri) { priority = 0; }
        dispatcher.registerOnBackInvokedCallback(priority, cb);
        popupBackDispatcher = dispatcher;
        popupBackCallback = cb;
      } catch(eRegPopupBack) {
        try { safeLog(self.L, 'w', 'popup back callback register fail: ' + String(eRegPopupBack)); } catch(eLogReg) {}
      }
    }}));
  } catch(eReqFocus) {}

  function closePopup() {
    if (popupClosed) return;
    popupClosed = true;
    try {
      if (popupBackDispatcher && popupBackCallback) popupBackDispatcher.unregisterOnBackInvokedCallback(popupBackCallback);
    } catch(eUnregPopupBack) {}
    popupBackDispatcher = null;
    popupBackCallback = null;
    try {
      if (self.state && self.state.activePopupDismiss) self.state.activePopupDismiss = null;
    } catch(eClearPopupHook) {}
    try { wm.removeView(root);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    if (typeof onDismiss === "function") {
      try { onDismiss();  } catch(eD) { safeLog(null, 'e', "catch " + String(eD)); }
    }
  }

  if (typeof builder === "function") {
    try { builder(content, closePopup); } catch(eB) { safeLog(self.L, 'e', "popup builder fail: " + String(eB)); }
  }
  if (typeof footerBuilder === "function") {
    try {
      footerBuilder(footer, closePopup);
      if (footer.getChildCount && footer.getChildCount() > 0) footer.setVisibility(android.view.View.VISIBLE);
    } catch(eF) { safeLog(self.L, 'e', "popup footer builder fail: " + String(eF)); }
  }

  return { close: closePopup, content: content, footer: footer };
};

// =======================【更新与版本页面】=======================
(function() {
  var UPDATE_ROUTE = "update";
  var HISTORY_PAGE_SIZE = 10;
  var HISTORY_FILE_NAME = "update_history.json";
  var HISTORY_META_NAME = "update_history.meta.json";
  var HISTORY_RETRY_COOLDOWN_MS = 30000;
  var UPDATE_SURFACE_REFRESH_DELAY_MS = 48;

  function safeArray(value) {
    return value && value.length !== undefined ? value : [];
  }

  function textValue(value) {
    return value === undefined || value === null ? "" : String(value);
  }

  function numberValue(value) {
    var n = Number(value || 0);
    return isNaN(n) ? 0 : n;
  }

  function typeLabel(value) {
    var t = textValue(value);
    if (t === "feature") return "功能";
    if (t === "fix") return "修复";
    if (t === "security") return "安全";
    return "优化";
  }

  function reasonLabel(value) {
    var t = textValue(value);
    if (t === "missing") return "本地缺失";
    if (t === "hash") return "内容更新";
    return "版本升级";
  }

  function sha256Text(text) {
    var bytes = new java.lang.String(String(text || "")).getBytes("UTF-8");
    var byteLength = Number(java.lang.reflect.Array.getLength(bytes));
    var md = java.security.MessageDigest.getInstance("SHA-256");
    md.update(bytes, 0, byteLength);
    var digest = md.digest();
    var digestLength = Number(java.lang.reflect.Array.getLength(digest));
    var out = new java.lang.StringBuilder(digestLength * 2);
    for (var i = 0; i < digestLength; i++) {
      var hex = java.lang.Integer.toHexString(0xFF & digest[i]);
      if (hex.length() === 1) out.append("0");
      out.append(hex);
    }
    return String(out.toString()).toLowerCase();
  }

  function utf8Size(text) {
    try { return Number(new java.lang.String(String(text || "")).getBytes("UTF-8").length || 0); }
    catch (e) { return 0; }
  }

  FloatBallAppWM.prototype.ensureToolHubUpdateUiState = function() {
    if (!this.state) return;
    if (this.state.toolHubUpdateUiReady === true) return;
    this.state.toolHubUpdateUiReady = true;
    this.state.toolHubSettingsVisitSeq = 0;
    this.state.toolHubSettingsCheckedSeq = 0;
    this.state.toolHubSettingsCheckRunning = false;
    this.state.toolHubLastKnownAttention = false;
    this.state.toolHubUpdateConfirmVisible = false;
    this.state.toolHubUpdateHistoryData = null;
    this.state.toolHubUpdateHistoryState = "idle";
    this.state.toolHubUpdateHistoryError = "";
    this.state.toolHubUpdateHistorySource = "";
    this.state.toolHubUpdateHistoryAssetKey = "";
    this.state.toolHubUpdateHistoryRequestKey = "";
    this.state.toolHubUpdateHistoryGeneration = 0;
    this.state.toolHubUpdateHistoryFailedAssetKey = "";
    this.state.toolHubUpdateHistoryLastFailureAt = 0;
    this.state.toolHubUpdateHistoryLastFailureError = "";
    this.state.toolHubUpdateRefreshPending = false;
  };

  FloatBallAppWM.prototype.getToolHubUpdateStateExtended = function() {
    this.ensureToolHubUpdateUiState();
    var base = null;
    try { base = this.getToolHubUpdateState ? this.getToolHubUpdateState() : null; } catch (eBase) { base = null; }
    if (!base) base = {};
    try {
      if (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) {
        var raw = TOOLHUB_UPDATE_STATE;
        base.entryUpdateAvailable = raw.entryUpdateAvailable === true;
        base.entryLocalVersion = numberValue(raw.entryLocalVersion);
        base.entryRemoteVersion = numberValue(raw.entryRemoteVersion);
        base.entryName = textValue(raw.entryName || "ToolHub.js");
        base.entrySha256 = textValue(raw.entrySha256);
        base.entrySize = numberValue(raw.entrySize);
        base.entryManualUpdate = raw.entryManualUpdate !== false;
        base.entryMessage = textValue(raw.entryMessage);
      }
    } catch (eRaw) {}
    return base;
  };

  FloatBallAppWM.prototype.hasToolHubUpdateAttention = function() {
    this.ensureToolHubUpdateUiState();
    var st = this.getToolHubUpdateStateExtended();
    var status = textValue(st.status);
    var live = numberValue(st.availableCount) > 0 || st.entryUpdateAvailable === true || st.needRestart === true;
    if (status !== "error" && status !== "checking") this.state.toolHubLastKnownAttention = live;
    if (status === "error") return this.state.toolHubLastKnownAttention === true;
    return live;
  };

  FloatBallAppWM.prototype.getToolHubUpdateHomeSummary = function() {
    var st = this.getToolHubUpdateStateExtended();
    var status = textValue(st.status);
    var count = numberValue(st.availableCount);
    if (status === "checking") return "正在检查最新版本";
    if (status === "installing") return "正在更新子模块";
    if (status === "restarting") return "正在重启 ToolHub";
    if (count > 0 && st.entryUpdateAvailable === true) return "有 " + count + " 个模块及入口文件更新";
    if (count > 0) return "有 " + count + " 个模块可更新";
    if (st.entryUpdateAvailable === true) return "入口文件需要手动替换";
    if (st.needRestart === true) return "更新完成，等待重启";
    if (status === "error") return "检查失败，点击查看";
    if (status === "latest") return "当前已是最新版本";
    return "查看版本、更新状态与历史记录";
  };

  FloatBallAppWM.prototype.refreshToolHubUpdateSurface = function(reason) {
    this.ensureToolHubUpdateUiState();
    try {
      if (!this.state || !this.state.toolAppActive || !this.replaceToolAppPage) return false;
      if (this.state.toolHubUpdateRefreshPending === true) return false;
      this.state.toolHubUpdateRefreshPending = true;
      var self = this;
      var task = new java.lang.Runnable({ run: function() {
        try {
          self.state.toolHubUpdateRefreshPending = false;
          if (!self.state.toolAppActive || !self.replaceToolAppPage) return;
          var route = textValue(self.state.toolAppRoute);
          if (route === UPDATE_ROUTE) self.replaceToolAppPage(UPDATE_ROUTE);
          else if (route === "settings") self.replaceToolAppPage("settings");
        } catch (eRun) {
          try { self.state.toolHubUpdateRefreshPending = false; } catch (eFlag) {}
          try { safeLog(self.L, "w", "refresh update surface fail reason=" + textValue(reason) + " error=" + String(eRun)); } catch (eLog) {}
        }
      }});
      var handler = new android.os.Handler(android.os.Looper.getMainLooper());
      handler.postDelayed(task, UPDATE_SURFACE_REFRESH_DELAY_MS);
      return true;
    } catch (e) {
      try { this.state.toolHubUpdateRefreshPending = false; } catch (eFlag2) {}
      try { safeLog(this.L, "w", "schedule update surface refresh fail reason=" + textValue(reason) + " error=" + String(e)); } catch (eLog2) {}
      return false;
    }
  };

  FloatBallAppWM.prototype.runToolHubUpdateCheck = function(showToast) {
    this.ensureToolHubUpdateUiState();
    var self = this;
    if (this.state.toolHubSettingsCheckRunning === true) {
      if (showToast) try { this.toast("检查正在进行"); } catch (eToast0) {}
      return false;
    }
    if (typeof checkToolHubModuleUpdatesNow !== "function") {
      if (showToast) try { this.toast("检查模块未加载"); } catch (eToast1) {}
      return false;
    }
    this.state.toolHubSettingsCheckRunning = true;
    try {
      if (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) {
        TOOLHUB_UPDATE_STATE.status = "checking";
        TOOLHUB_UPDATE_STATE.error = "";
      }
    } catch (eState) {}
    if (showToast) try { this.toast("正在检查更新"); } catch (eToast2) {}
    this.refreshToolHubUpdateSurface();
    try {
      new java.lang.Thread(new java.lang.Runnable({ run: function() {
        var ret = null;
        try { ret = checkToolHubModuleUpdatesNow(); }
        catch (eRun) { ret = { ok: false, error: String(eRun), msg: "检查失败：" + String(eRun) }; }
        try { self.state.toolHubSettingsCheckRunning = false; } catch (eFlag) {}
        try {
          self.runOnUiThreadSafe(function() {
            try {
              var st = self.getToolHubUpdateStateExtended();
              if (ret && ret.ok !== false) self.state.toolHubLastKnownAttention = numberValue(st.availableCount) > 0 || st.entryUpdateAvailable === true || st.needRestart === true;
              if (showToast) self.toast(ret && ret.ok === false ? "检查失败" : "检查完成");
              self.refreshToolHubUpdateSurface();
              if (textValue(self.state.toolAppRoute) === UPDATE_ROUTE) self.ensureToolHubUpdateHistoryLoaded(showToast === true);
            } catch (eUi) {}
          });
        } catch (ePost) {}
      }})).start();
      return true;
    } catch (eThread) {
      this.state.toolHubSettingsCheckRunning = false;
      return false;
    }
  };

  FloatBallAppWM.prototype.onToolHubSettingsEntered = function() {
    this.ensureToolHubUpdateUiState();
    this.state.toolHubSettingsVisitSeq = numberValue(this.state.toolHubSettingsVisitSeq) + 1;
    this.state.toolHubSettingsCheckedSeq = this.state.toolHubSettingsVisitSeq;
    this.runToolHubUpdateCheck(false);
  };

  FloatBallAppWM.prototype.getToolHubUpdateCacheDir = function() {
    var root = typeof APP_ROOT_DIR !== "undefined" ? String(APP_ROOT_DIR) : (typeof getToolHubRootDir === "function" ? String(getToolHubRootDir()) : "");
    return root ? root + "/cache" : "";
  };

  FloatBallAppWM.prototype.getToolHubUpdateHistoryPaths = function() {
    var dir = this.getToolHubUpdateCacheDir();
    return { dir: dir, history: dir + "/" + HISTORY_FILE_NAME, meta: dir + "/" + HISTORY_META_NAME };
  };

  FloatBallAppWM.prototype.getToolHubUpdateHistoryAsset = function() {
    try {
      if (typeof __trustedManifest === "undefined" || !__trustedManifest) return null;
      var assets = __trustedManifest.assets || {};
      var asset = assets.updateHistory || null;
      if (!asset || !asset.name || !asset.sha256) return null;
      return {
        name: textValue(asset.name),
        schema: numberValue(asset.schema),
        version: numberValue(asset.version),
        sha256: textValue(asset.sha256).toLowerCase(),
        size: numberValue(asset.size)
      };
    } catch (e) {}
    return null;
  };

  FloatBallAppWM.prototype.validateToolHubUpdateHistory = function(obj) {
    if (!obj || Number(obj.schema || 0) !== 1 || !obj.records || obj.records.length === undefined) return false;
    var records = obj.records;
    var seen = {};
    for (var i = 0; i < records.length; i++) {
      var item = records[i] || {};
      var id = textValue(item.id);
      if (!id || seen[id]) return false;
      seen[id] = true;
      if (numberValue(item.manifestVersion) <= 0) return false;
      if (!textValue(item.date) || !textValue(item.title)) return false;
      var type = textValue(item.type);
      if (type !== "feature" && type !== "fix" && type !== "optimize" && type !== "security") return false;
      if (!item.details || item.details.length === undefined || item.details.length <= 0) return false;
    }
    return true;
  };

  FloatBallAppWM.prototype.readToolHubUpdateHistoryCache = function() {
    this.ensureToolHubUpdateUiState();
    var paths = this.getToolHubUpdateHistoryPaths();
    if (!paths.dir) return false;
    try {
      var historyText = FileIO.readText(paths.history);
      var metaText = FileIO.readText(paths.meta);
      if (!historyText || !metaText) return false;
      var meta = JSON.parse(String(metaText));
      var actualHash = sha256Text(historyText);
      if (actualHash !== textValue(meta.sha256).toLowerCase()) return false;
      if (numberValue(meta.size) !== utf8Size(historyText)) return false;
      var obj = JSON.parse(String(historyText));
      if (!this.validateToolHubUpdateHistory(obj)) return false;
      this.state.toolHubUpdateHistoryData = obj;
      this.state.toolHubUpdateHistoryState = "ready";
      this.state.toolHubUpdateHistoryError = "";
      this.state.toolHubUpdateHistorySource = "cache";
      this.state.toolHubUpdateHistoryAssetKey = actualHash;
      return true;
    } catch (e) {
      this.state.toolHubUpdateHistoryError = String(e);
      return false;
    }
  };

  FloatBallAppWM.prototype.writeToolHubUpdateHistoryCache = function(text, asset) {
    var paths = this.getToolHubUpdateHistoryPaths();
    if (!paths.dir) return false;
    try {
      var dir = new java.io.File(paths.dir);
      if (!dir.exists() && !dir.mkdirs()) throw "cache mkdir failed";
      if (!FileIO.writeTextAtomic(paths.history, String(text))) throw "history write failed";
      var meta = {
        schema: 1,
        historyVersion: numberValue(asset.version),
        manifestVersion: this.getToolHubUpdateStateExtended().version || 0,
        fetchedAt: Number(java.lang.System.currentTimeMillis()),
        sha256: textValue(asset.sha256).toLowerCase(),
        size: numberValue(asset.size)
      };
      if (!FileIO.writeTextAtomic(paths.meta, JSON.stringify(meta, null, 2))) throw "meta write failed";
      return true;
    } catch (e) {
      try { safeLog(this.L, "w", "update history cache write fail: " + String(e)); } catch (eLog) {}
      return false;
    }
  };

  FloatBallAppWM.prototype.ensureToolHubUpdateHistoryLoaded = function(forceRefresh) {
    this.ensureToolHubUpdateUiState();
    var self = this;
    if (!this.state.toolHubUpdateHistoryData) this.readToolHubUpdateHistoryCache();
    var asset = this.getToolHubUpdateHistoryAsset();
    if (!asset) return false;
    var assetKey = textValue(asset.sha256) + "@" + String(asset.version);
    var now = Number(java.lang.System.currentTimeMillis());
    if (this.state.toolHubUpdateHistoryFailedAssetKey && this.state.toolHubUpdateHistoryFailedAssetKey !== assetKey) {
      this.state.toolHubUpdateHistoryFailedAssetKey = "";
      this.state.toolHubUpdateHistoryLastFailureAt = 0;
      this.state.toolHubUpdateHistoryLastFailureError = "";
    }
    if (!forceRefresh && this.state.toolHubUpdateHistoryAssetKey === asset.sha256 && this.state.toolHubUpdateHistoryData) return true;
    if (!forceRefresh && this.state.toolHubUpdateHistoryFailedAssetKey === assetKey && now - numberValue(this.state.toolHubUpdateHistoryLastFailureAt) < HISTORY_RETRY_COOLDOWN_MS) {
      return false;
    }
    if (this.state.toolHubUpdateHistoryRequestKey === assetKey) return true;
    this.state.toolHubUpdateHistoryRequestKey = assetKey;
    this.state.toolHubUpdateHistoryGeneration = numberValue(this.state.toolHubUpdateHistoryGeneration) + 1;
    var generation = this.state.toolHubUpdateHistoryGeneration;
    if (!this.state.toolHubUpdateHistoryData) this.state.toolHubUpdateHistoryState = "loading";
    try { safeLog(this.L, "i", "update history fetch begin assetVersion=" + asset.version + " expectedSize=" + asset.size + " generation=" + generation + " force=" + String(forceRefresh === true)); } catch (eLogBegin) {}
    try {
      new java.lang.Thread(new java.lang.Runnable({ run: function() {
        var startedAt = Number(java.lang.System.currentTimeMillis());
        var text = "";
        var error = "";
        var obj = null;
        var actualSize = 0;
        var expectedHash = textValue(asset.sha256).toLowerCase();
        var actualHash = "";
        try {
          if (typeof downloadText !== "function") throw "downloadText unavailable";
          text = downloadText(String(GIT_ROOT) + textValue(asset.name));
          actualSize = utf8Size(text);
          if (numberValue(asset.size) > 0 && actualSize !== numberValue(asset.size)) throw "history size mismatch";
          actualHash = sha256Text(text);
          if (actualHash !== expectedHash) throw "history sha256 mismatch expected=" + expectedHash + " actual=" + actualHash + " expectedLen=" + expectedHash.length + " actualLen=" + actualHash.length;
          obj = JSON.parse(String(text));
          if (!self.validateToolHubUpdateHistory(obj)) throw "history schema invalid";
          if (!self.writeToolHubUpdateHistoryCache(text, asset)) throw "history cache write failed";
        } catch (eLoad) { error = String(eLoad); obj = null; }
        var costMs = Number(java.lang.System.currentTimeMillis()) - startedAt;
        try {
          if (obj) safeLog(self.L, "i", "update history fetch done assetVersion=" + asset.version + " actualSize=" + actualSize + " actualHash=" + actualHash + " hashLen=" + actualHash.length + " generation=" + generation + " costMs=" + costMs);
          else safeLog(self.L, "w", "update history fetch fail assetVersion=" + asset.version + " expectedSize=" + asset.size + " actualSize=" + actualSize + " expectedHash=" + expectedHash + " actualHash=" + actualHash + " expectedHashLen=" + expectedHash.length + " actualHashLen=" + actualHash.length + " generation=" + generation + " costMs=" + costMs + " error=" + error);
        } catch (eLogResult) {}
        try {
          self.runOnUiThreadSafe(function() {
            if (numberValue(self.state.toolHubUpdateHistoryGeneration) !== generation) return;
            self.state.toolHubUpdateHistoryRequestKey = "";
            if (obj) {
              self.state.toolHubUpdateHistoryData = obj;
              self.state.toolHubUpdateHistoryState = "ready";
              self.state.toolHubUpdateHistoryError = "";
              self.state.toolHubUpdateHistorySource = "remote";
              self.state.toolHubUpdateHistoryAssetKey = textValue(asset.sha256).toLowerCase();
              self.state.toolHubUpdateHistoryFailedAssetKey = "";
              self.state.toolHubUpdateHistoryLastFailureAt = 0;
              self.state.toolHubUpdateHistoryLastFailureError = "";
            } else {
              self.state.toolHubUpdateHistoryState = self.state.toolHubUpdateHistoryData ? "ready" : "error";
              self.state.toolHubUpdateHistoryError = error.indexOf("sha256 mismatch") >= 0 ? "更新记录校验失败，请重新检查" : error;
              self.state.toolHubUpdateHistoryFailedAssetKey = assetKey;
              self.state.toolHubUpdateHistoryLastFailureAt = Number(java.lang.System.currentTimeMillis());
              self.state.toolHubUpdateHistoryLastFailureError = error;
              if (self.state.toolHubUpdateHistoryData) self.state.toolHubUpdateHistorySource = "cache";
            }
            self.refreshToolHubUpdateSurface(obj ? "history_loaded" : "history_failed");
          });
        } catch (eUi) {}
      }})).start();
      return true;
    } catch (eThread) {
      this.state.toolHubUpdateHistoryRequestKey = "";
      this.state.toolHubUpdateHistoryState = this.state.toolHubUpdateHistoryData ? "ready" : "error";
      this.state.toolHubUpdateHistoryError = String(eThread);
      this.state.toolHubUpdateHistoryFailedAssetKey = assetKey;
      this.state.toolHubUpdateHistoryLastFailureAt = Number(java.lang.System.currentTimeMillis());
      this.state.toolHubUpdateHistoryLastFailureError = String(eThread);
      try { safeLog(this.L, "w", "update history thread start fail assetVersion=" + asset.version + " generation=" + generation + " error=" + String(eThread)); } catch (eLogThread) {}
      this.refreshToolHubUpdateSurface("history_thread_fail");
      return false;
    }
  };

  FloatBallAppWM.prototype.getToolHubCurrentHistoryRecord = function() {
    var data = this.state ? this.state.toolHubUpdateHistoryData : null;
    var version = this.getToolHubUpdateStateExtended().version;
    var records = data && data.records ? data.records : [];
    for (var i = 0; i < records.length; i++) {
      if (numberValue(records[i] && records[i].manifestVersion) === numberValue(version)) return records[i];
    }
    return null;
  };

  FloatBallAppWM.prototype.startToolHubDeterministicRestart = function() {
    try {
      if (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) {
        TOOLHUB_UPDATE_STATE.status = "restarting";
        TOOLHUB_UPDATE_STATE.error = "";
      }
      this.toast("更新完成，正在重启 ToolHub");
      if (typeof restartToolHubFromSettings === "function") return restartToolHubFromSettings();
    } catch (e) {
      try { this.toast("自动重启失败，请手动重启 ToolHub"); } catch (eToast) {}
    }
    return null;
  };

  FloatBallAppWM.prototype.startToolHubModuleUpdateDeterministic = function(anchorView) {
    this.ensureToolHubUpdateUiState();
    var self = this;
    var st = this.getToolHubUpdateStateExtended();
    if (textValue(st.status) === "installing") { try { this.toast("更新正在进行"); } catch (e0) {} return false; }
    if (textValue(st.status) === "checking") { try { this.toast("检查正在进行"); } catch (e1) {} return false; }
    if (typeof installPendingModuleUpdates !== "function") { try { this.toast("更新模块未加载"); } catch (e2) {} return false; }
    this.state.toolHubUpdateConfirmVisible = false;
    try {
      if (typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE) {
        TOOLHUB_UPDATE_STATE.status = "installing";
        TOOLHUB_UPDATE_STATE.error = "";
      }
    } catch (eState) {}
    this.refreshToolHubUpdateSurface();
    try {
      new java.lang.Thread(new java.lang.Runnable({ run: function() {
        var ret = null;
        try { ret = installPendingModuleUpdates(); }
        catch (eRun) { ret = { ok: false, error: String(eRun), msg: "更新失败：" + String(eRun) }; }
        try {
          self.runOnUiThreadSafe(function() {
            try {
              if (!ret || ret.ok === false) {
                self.toast(ret && ret.msg ? ret.msg : "更新失败");
                self.refreshToolHubUpdateSurface();
                return;
              }
              if (numberValue(ret.count) <= 0) {
                self.toast("子模块已是最新");
                self.refreshToolHubUpdateSurface();
                return;
              }
              var after = self.getToolHubUpdateStateExtended();
              if (after.entryUpdateAvailable === true) {
                self.toast("子模块已更新，请先替换 ToolHub.js 后重新运行");
                self.refreshToolHubUpdateSurface();
                return;
              }
              self.startToolHubDeterministicRestart();
            } catch (eUi) {
              try { self.toast("更新完成状态处理失败"); } catch (eToast) {}
            }
          });
        } catch (ePost) {}
      }})).start();
      return true;
    } catch (eThread) { return false; }
  };

  FloatBallAppWM.prototype.createToolHubUpdateHomeEntry = function(parent, title, desc, onClick) {
    var summary = this.getToolHubUpdateHomeSummary ? this.getToolHubUpdateHomeSummary() : desc;
    return this.createSettingsHomeEntry(parent, title || "更新与版本", summary, "", onClick, {
      normalizedUpdateEntry: true,
      iconText: "↻",
      showRedDot: this.hasToolHubUpdateAttention ? this.hasToolHubUpdateAttention() : false
    });
  };

  FloatBallAppWM.prototype.buildToolHubUpdateVersionPanelView = function() {
    this.ensureToolHubUpdateUiState();
    this.ensureToolHubUpdateHistoryLoaded(false);
    var self = this;
    var T = this.getSettingsColorScheme();
    var isDark = this.isDarkTheme();
    var st = this.getToolHubUpdateStateExtended();
    var panel = this.ui.createStyledPanel(this, 16);
    panel.setPadding(this.dp(10), this.dp(8), this.dp(10), this.dp(10));
    var scroll = new android.widget.ScrollView(context);
    scroll.setFillViewport(true);
    var root = new android.widget.LinearLayout(context);
    root.setOrientation(android.widget.LinearLayout.VERTICAL);
    scroll.addView(root, new android.widget.FrameLayout.LayoutParams(-1, -2));
    panel.addView(scroll, new android.widget.LinearLayout.LayoutParams(-1, 0, 1));

    function addText(parent, value, size, color, bold) {
      var tv = new android.widget.TextView(context);
      tv.setText(String(value || ""));
      toolhubSafeSetTextColor(tv, color || T.onSurface);
      tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, size || 12);
      tv.setLineSpacing(self.dp(1), 1.05);
      if (bold) tv.setTypeface(null, android.graphics.Typeface.BOLD);
      parent.addView(tv, new android.widget.LinearLayout.LayoutParams(-1, -2));
      return tv;
    }

    function addCard(title) {
      var card = new android.widget.LinearLayout(context);
      card.setOrientation(android.widget.LinearLayout.VERTICAL);
      card.setPadding(self.dp(12), self.dp(10), self.dp(12), self.dp(10));
      card.setBackground(self.ui.createStrokeDrawable(T.surface, self.withAlpha(T.outlineVariant, isDark ? 0.24 : 0.20), self.dp(1), self.dp(18)));
      var lp = new android.widget.LinearLayout.LayoutParams(-1, -2);
      lp.setMargins(0, 0, 0, self.dp(10));
      root.addView(card, lp);
      if (title) addText(card, title, 14, T.onSurface, true);
      return card;
    }

    function addButton(parent, label, onClick, enabled) {
      var btn = self.ui.createFlatButton(self, label, enabled === false ? T.onSurface2 : T.primary, function() {
        if (enabled === false) return;
        try { onClick(); } catch (e) { try { self.toast("操作失败: " + String(e)); } catch (eToast) {} }
      });
      btn.setEnabled(enabled !== false);
      parent.addView(btn, new android.widget.LinearLayout.LayoutParams(0, self.dp(44), 1));
      return btn;
    }

    var statusCard = addCard("当前版本");
    var localManifestVersion = 0;
    try { if (typeof getTrustedVersion === "function") localManifestVersion = numberValue(getTrustedVersion()); } catch (eLocal) {}
    addText(statusCard, "本地清单版本：" + (localManifestVersion > 0 ? String(localManifestVersion) : "未知"), 12, T.onSurface2, false);
    addText(statusCard, "GitHub 清单版本：" + (numberValue(st.version) > 0 ? String(st.version) : "尚未获取"), 12, T.onSurface2, false);
    addText(statusCard, "安全状态：" + (textValue(st.securityText) || "尚未校验"), 12, T.onSurface2, false);
    var currentRecord = this.getToolHubCurrentHistoryRecord();
    if (currentRecord) {
      addText(statusCard, textValue(currentRecord.title), 13, T.onSurface, true).setPadding(0, this.dp(8), 0, 0);
      var currentDetails = safeArray(currentRecord.details);
      for (var cd = 0; cd < currentDetails.length; cd++) addText(statusCard, "• " + textValue(currentDetails[cd]), 12, T.onSurface2, false);
    } else if (st.title) {
      addText(statusCard, textValue(st.title), 13, T.onSurface, true).setPadding(0, this.dp(8), 0, 0);
      var stateChanges = safeArray(st.changes);
      for (var sc = 0; sc < stateChanges.length; sc++) addText(statusCard, "• " + textValue(stateChanges[sc]), 12, T.onSurface2, false);
    }
    if (st.entryUpdateAvailable === true) {
      addText(statusCard, "入口文件：" + numberValue(st.entryLocalVersion) + " → " + numberValue(st.entryRemoteVersion), 12, T.danger || T.primary, true).setPadding(0, this.dp(8), 0, 0);
      addText(statusCard, textValue(st.entryMessage) || "请手动替换 ShortX 任务中的 ToolHub.js", 12, T.onSurface2, false);
    }
    var statusButtons = new android.widget.LinearLayout(context);
    statusButtons.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    var statusButtonsLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
    statusButtonsLp.setMargins(0, this.dp(8), 0, 0);
    statusCard.addView(statusButtons, statusButtonsLp);
    addButton(statusButtons, textValue(st.status) === "checking" ? "检查中" : "重新检查", function() { self.runToolHubUpdateCheck(true); }, textValue(st.status) !== "checking" && textValue(st.status) !== "installing");

    var pendingCard = addCard("待更新内容");
    var details = safeArray(st.availableDetails);
    if (details.length <= 0) addText(pendingCard, st.entryUpdateAvailable === true ? "子模块已是最新，入口文件需要手动替换。" : "当前没有待更新子模块。", 12, T.onSurface2, false);
    for (var di = 0; di < details.length; di++) {
      var detail = details[di] || {};
      addText(pendingCard, "• " + textValue(detail.module) + "  " + (textValue(detail.localVersion) || "0.0.0") + " → " + (textValue(detail.remoteVersion) || "清单版本") + " · " + reasonLabel(detail.reason), 12, T.onSurface2, false);
    }
    if (details.length > 0 && !this.state.toolHubUpdateConfirmVisible) {
      var prepareRow = new android.widget.LinearLayout(context);
      prepareRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
      var prepareLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
      prepareLp.setMargins(0, this.dp(8), 0, 0);
      pendingCard.addView(prepareRow, prepareLp);
      addButton(prepareRow, "准备更新", function() { self.state.toolHubUpdateConfirmVisible = true; self.refreshToolHubUpdateSurface(); }, true);
    }
    if (details.length > 0 && this.state.toolHubUpdateConfirmVisible) {
      addText(pendingCard, "确认后将事务更新以上 " + details.length + " 个子模块。", 12, T.onSurface, true).setPadding(0, this.dp(8), 0, this.dp(6));
      var confirmRow = new android.widget.LinearLayout(context);
      confirmRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
      addButton(confirmRow, "取消", function() { self.state.toolHubUpdateConfirmVisible = false; self.refreshToolHubUpdateSurface(); }, true);
      var gap = new android.view.View(context);
      confirmRow.addView(gap, new android.widget.LinearLayout.LayoutParams(self.dp(8), 1));
      addButton(confirmRow, "确认更新", function() { self.startToolHubModuleUpdateDeterministic(null); }, true);
      pendingCard.addView(confirmRow, new android.widget.LinearLayout.LayoutParams(-1, -2));
    }
    if (st.needRestart === true && st.entryUpdateAvailable !== true && details.length <= 0) {
      var restartRow = new android.widget.LinearLayout(context);
      restartRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
      restartRow.setPadding(0, this.dp(8), 0, 0);
      pendingCard.addView(restartRow, new android.widget.LinearLayout.LayoutParams(-1, -2));
      addButton(restartRow, "立即重启 ToolHub", function() { self.startToolHubDeterministicRestart(); }, true);
    }

    var historyCard = addCard("更新记录");
    var historyData = this.state.toolHubUpdateHistoryData;
    var records = historyData && historyData.records ? historyData.records : [];
    if (!historyData) {
      var loadText = this.state.toolHubUpdateHistoryState === "error" ? "暂时无法加载更新记录" : "正在加载更新记录";
      addText(historyCard, loadText, 12, T.onSurface2, false);
      if (this.state.toolHubUpdateHistoryError) addText(historyCard, textValue(this.state.toolHubUpdateHistoryError), 11, T.onSurface2, false);
    } else {
      var sourceText = this.state.toolHubUpdateHistorySource === "remote" ? "已从 GitHub 更新" : "使用本地缓存";
      addText(historyCard, sourceText, 11, T.onSurface2, false);
      var pageCount = Math.max(1, Math.ceil(records.length / HISTORY_PAGE_SIZE));
      var page = numberValue(this.state.toolAppSubPage);
      if (page < 1) page = 1;
      if (page > pageCount) page = pageCount;
      this.state.toolAppSubPage = page;
      var start = (page - 1) * HISTORY_PAGE_SIZE;
      var end = Math.min(records.length, start + HISTORY_PAGE_SIZE);
      for (var ri = start; ri < end; ri++) {
        (function(record) {
          var item = new android.widget.LinearLayout(context);
          item.setOrientation(android.widget.LinearLayout.VERTICAL);
          item.setPadding(self.dp(10), self.dp(9), self.dp(10), self.dp(9));
          item.setBackground(self.ui.createPressedStateDrawable(T.surface2, self.withAlpha(T.primary, isDark ? 0.12 : 0.07), self.dp(14)));
          var itemLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
          itemLp.setMargins(0, self.dp(6), 0, 0);
          historyCard.addView(item, itemLp);
          var header = new android.widget.TextView(context);
          header.setText("[" + typeLabel(record.type) + "] " + textValue(record.title));
          toolhubSafeSetTextColor(header, T.onSurface);
          header.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
          header.setTypeface(null, android.graphics.Typeface.BOLD);
          item.addView(header, new android.widget.LinearLayout.LayoutParams(-1, -2));
          addText(item, textValue(record.date) + " · 版本 " + String(numberValue(record.manifestVersion)), 11, T.onSurface2, false);
          var expanded = textValue(self.state.toolAppSubKey) === textValue(record.id);
          if (expanded) {
            var recordDetails = safeArray(record.details);
            for (var rd = 0; rd < recordDetails.length; rd++) addText(item, "• " + textValue(recordDetails[rd]), 12, T.onSurface2, false);
            var modules = safeArray(record.modules);
            if (modules.length > 0) addText(item, "模块变化", 12, T.onSurface, true).setPadding(0, self.dp(6), 0, 0);
            for (var rm = 0; rm < modules.length; rm++) {
              var m = modules[rm] || {};
              addText(item, "• " + textValue(m.name) + "：" + (textValue(m.from) || "缺失") + " → " + (textValue(m.to) || "删除"), 11, T.onSurface2, false);
            }
          }
          item.setOnClickListener(new android.view.View.OnClickListener({ onClick: function() {
            self.state.toolAppSubKey = expanded ? "" : textValue(record.id);
            self.refreshToolHubUpdateSurface();
          }}));
        })(records[ri]);
      }
      var pager = new android.widget.LinearLayout(context);
      pager.setOrientation(android.widget.LinearLayout.HORIZONTAL);
      pager.setGravity(android.view.Gravity.CENTER_VERTICAL);
      pager.setPadding(0, this.dp(10), 0, 0);
      addButton(pager, "上一页", function() { if (page > 1) { self.state.toolAppSubPage = page - 1; self.state.toolAppSubKey = ""; self.refreshToolHubUpdateSurface(); } }, page > 1);
      var pageText = new android.widget.TextView(context);
      pageText.setText("第 " + page + " / " + pageCount + " 页");
      toolhubSafeSetTextColor(pageText, T.onSurface2);
      pageText.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      pageText.setGravity(android.view.Gravity.CENTER);
      pager.addView(pageText, new android.widget.LinearLayout.LayoutParams(self.dp(110), self.dp(44)));
      addButton(pager, "下一页", function() { if (page < pageCount) { self.state.toolAppSubPage = page + 1; self.state.toolAppSubKey = ""; self.refreshToolHubUpdateSurface(); } }, page < pageCount);
      historyCard.addView(pager, new android.widget.LinearLayout.LayoutParams(-1, -2));
    }
    return panel;
  };
})();
