// @version 1.0.0

// 根据当前 SETTINGS_THEME 覆盖 T（Animal Island 配色对象），
// 使设置页所有 UI 元素（首页/分组页/入口卡片）统一跟随主题切换。
// 传入 T、isDark、C(this.ui.colors)、cfgTpl(配置源)，直接修改 T 的字段。
FloatBallAppWM.prototype.applySettingsTheme = function(T, isDark, C, cfgTpl) {
  var settTheme = String((cfgTpl || this.config).SETTINGS_THEME || "animal");
  if (settTheme !== "monet") return;
  try {
    var Color = android.graphics.Color;
    var monetBg = isDark ? C.bgDark : C.bgLight;
    var monetTxt = isDark ? C.textPriDark : C.textPriLight;
    var monetSub = isDark ? C.textSecDark : C.textSecLight;
    var monetCard = C._monetSurfaceContainerLow || (isDark ? C.cardDark : C.cardLight);
    var monetCard2 = C._monetSurfaceContainerHigh || (isDark ? C.inputBgDark : C.inputBgLight);
    var monetPrimary = C.primary;
    var monetPrimaryContainer = C._monetPrimaryContainer || this.withAlpha(monetPrimary, isDark ? 0.28 : 0.14);
    var monetOnPrimaryContainer = C._monetOnPrimaryContainer || monetPrimary;
    var monetOnP = C._monetOnPrimary || (isDark ? Color.parseColor("#062E6F") : Color.WHITE);
    T.bg = monetBg;
    T.card = monetCard;
    T.card2 = monetCard2;
    T.text = monetTxt;
    T.sub = monetSub;
    T.primary = monetPrimary;
    T.primaryDeep = monetOnPrimaryContainer;
    T.primarySoft = monetPrimaryContainer;
    T.brown = monetOnPrimaryContainer;
    T.stroke = C._monetOutlineVariant || (isDark ? this.withAlpha(monetTxt, 0.16) : this.withAlpha(monetTxt, 0.12));
    T.onPrimary = monetOnP;
  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
};

FloatBallAppWM.prototype.isSettingsMonetTheme = function(cfgTpl) {
  try { return String((cfgTpl || this.config).SETTINGS_THEME || "animal") === "monet"; } catch(e) { return false; }
};


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
  var cfgTpl = null;
  try { cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config; } catch(eCfg) { cfgTpl = this.config; }
  if (this.isSettingsMonetTheme && this.isSettingsMonetTheme(cfgTpl)) {
    return [
      { key: "ball", title: "悬浮球", desc: "大小、图标、颜色和跟随距离", sections: ["悬浮球"] },
      { key: "panel", title: "面板", desc: "排列、文字、位置和吸边行为", sections: ["面板布局", "面板文字", "吸边与位置"] },
      { key: "theme", title: "外观", desc: "颜色、背景、透明度和动态取色", sections: ["外观"] },
      { key: "motion", title: "动作与手势", desc: "点击、长按、动画和贴边回弹", sections: ["动画", "触摸与手势"] },
      { key: "debug", title: "运行记录", desc: "查看日志与当前状态", sections: ["日志"] }
    ];
  }
  return [
    { key: "ball", title: "漂浮气球", desc: "调整气球大小、图标和跟随距离", sections: ["悬浮球"] },
    { key: "panel", title: "面板小屋", desc: "调整面板排列、文字、位置和吸边", sections: ["面板布局", "面板文字", "吸边与位置"] },
    { key: "theme", title: "换装与装饰", desc: "更换颜色、背景和透明度", sections: ["外观"] },
    { key: "motion", title: "动作与手势", desc: "调整点击、长按和贴边回弹效果", sections: ["动画", "触摸与手势"] },
    { key: "debug", title: "岛务记录", desc: "查看运行记录和岛屿状态", sections: ["日志"] }
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

FloatBallAppWM.prototype.getSettingsHomeIcon = function(title) {
  var t = String(title || "");
  if (t.indexOf("工具伙伴") >= 0 || t.indexOf("工具") >= 0) return "🧰";
  if (t.indexOf("蓝图") >= 0 || t.indexOf("配置") >= 0) return "🗺";
  if (t.indexOf("气球") >= 0 || t.indexOf("悬浮") >= 0 || t.indexOf("球") >= 0) return "🎈";
  if (t.indexOf("面板") >= 0 || t.indexOf("小屋") >= 0) return "🏡";
  if (t.indexOf("换装") >= 0 || t.indexOf("装饰") >= 0 || t.indexOf("外观") >= 0) return "👕";
  if (t.indexOf("动作") >= 0 || t.indexOf("手势") >= 0) return "👆";
  if (t.indexOf("记录") >= 0 || t.indexOf("日志") >= 0) return "📒";
  return "✦";
};

FloatBallAppWM.prototype.createSettingsHomeSectionHeader = function(parent, icon, title) {
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getAnimalIslandTheme();
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  this.applySettingsTheme(T, isDark, C, cfgTpl);
  var row = new android.widget.LinearLayout(context);
  row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  row.setGravity(android.view.Gravity.CENTER_VERTICAL);
  row.setPadding(this.dp(4), this.dp(12), this.dp(4), this.dp(6));
  var tvIcon = new android.widget.TextView(context);
  tvIcon.setText(String(icon || "✦"));
  tvIcon.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
  tvIcon.setTextColor(T.primaryDeep);
  tvIcon.setGravity(android.view.Gravity.CENTER);
  tvIcon.setBackground(this.ui.createRoundDrawable(T.primarySoft, this.dp(10)));
  var iconLp = new android.widget.LinearLayout.LayoutParams(this.dp(28), this.dp(28));
  iconLp.setMargins(0, 0, this.dp(8), 0);
  row.addView(tvIcon, iconLp);
  var tv = new android.widget.TextView(context);
  tv.setText(String(title || ""));
  tv.setTextColor(T.primaryDeep);
  tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
  tv.setTypeface(null, android.graphics.Typeface.BOLD);
  row.addView(tv, new android.widget.LinearLayout.LayoutParams(0, -2, 1));
  parent.addView(row, new android.widget.LinearLayout.LayoutParams(-1, -2));
};

FloatBallAppWM.prototype.addSettingsHomeDashedDivider = function(parent) {
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getAnimalIslandTheme();
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  this.applySettingsTheme(T, isDark, C, cfgTpl);
  var line = new android.widget.TextView(context);
  line.setText("· · · · · · · · · · · · · · · · · · · ·");
  line.setGravity(android.view.Gravity.CENTER);
  line.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 10);
  line.setTextColor(this.withAlpha(T.primaryDeep, isDark ? 0.34 : 0.26));
  var lp = new android.widget.LinearLayout.LayoutParams(-1, this.dp(16));
  lp.setMargins(this.dp(4), this.dp(2), this.dp(4), this.dp(2));
  parent.addView(line, lp);
};


FloatBallAppWM.prototype.getIslandPickerTheme = function() {
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getAnimalIslandTheme();
  var cfgTpl = null;
  try { cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config; } catch(eCfg) { cfgTpl = this.config; }
  try { this.applySettingsTheme(T, isDark, C, cfgTpl); } catch(eTheme) {}
  return {
    isDark: isDark,
    C: C,
    T: T,
    bg: T.bg,
    card: T.card,
    card2: T.card2,
    text: T.text,
    sub: T.sub,
    primary: T.primary,
    primaryDeep: T.primaryDeep,
    primarySoft: T.primarySoft,
    stroke: T.stroke,
    onPrimary: T.onPrimary
  };
};

FloatBallAppWM.prototype.createSettingsHomeEntry = function(parent, title, desc, actionText, onClick) {
  var self = this;
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getAnimalIslandTheme();
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  this.applySettingsTheme(T, isDark, C, cfgTpl);
  var useMonet = this.isSettingsMonetTheme ? this.isSettingsMonetTheme(cfgTpl) : false;
  var row = new android.widget.LinearLayout(context);
  row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  row.setGravity(android.view.Gravity.CENTER_VERTICAL);
  var spec = this.getSettingsResponsiveSpec ? this.getSettingsResponsiveSpec() : null;
  var itemRadius = spec ? spec.itemRadius : this.dp(18);
  row.setPadding(this.dp(14), spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(10) : this.dp(12), this.dp(12), spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(10) : this.dp(12));
  row.setMinimumHeight(spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(76) : this.dp(82));
  row.setBackground(this.ui.createRippleDrawable(T.card, this.withAlpha(T.primary, isDark ? 0.18 : 0.12), itemRadius));
  try { row.setElevation(this.dp(useMonet ? 1 : ((spec && (spec.isExpandedWidth || spec.isWideWidth)) ? 1 : 3))); } catch(eElev) { safeLog(null, 'e', "catch " + String(eElev)); }
  var badge = new android.widget.TextView(context);
  badge.setText(this.getSettingsHomeIcon ? this.getSettingsHomeIcon(title) : "✦");
  badge.setTextColor(T.primaryDeep);
  badge.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 20);
  badge.setGravity(android.view.Gravity.CENTER);
  badge.setTypeface(null, android.graphics.Typeface.BOLD);
  badge.setBackground(this.ui.createStrokeDrawable(T.primarySoft, this.withAlpha(T.primaryDeep, isDark ? 0.30 : 0.22), this.dp(1), this.dp(14)));
  var iconSize = spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(42) : this.dp(44);
  var badgeLp = new android.widget.LinearLayout.LayoutParams(iconSize, iconSize);
  badgeLp.setMargins(0, 0, this.dp(12), 0);
  row.addView(badge, badgeLp);
  var texts = new android.widget.LinearLayout(context);
  texts.setOrientation(android.widget.LinearLayout.VERTICAL);
  var tvTitle = new android.widget.TextView(context);
  tvTitle.setText(String(title || ""));
  tvTitle.setTextColor(T.text);
  tvTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
  tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);
  texts.addView(tvTitle);
  var tvDesc = new android.widget.TextView(context);
  tvDesc.setText(String(desc || ""));
  tvDesc.setTextColor(T.sub);
  tvDesc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  tvDesc.setPadding(0, this.dp(3), this.dp(8), 0);
  try { tvDesc.setSingleLine(false); } catch(eSL) { safeLog(null, 'e', "catch " + String(eSL)); }
  texts.addView(tvDesc);
  row.addView(texts, new android.widget.LinearLayout.LayoutParams(0, -2, 1));
  var tvGo = new android.widget.TextView(context);
  tvGo.setText("›");
  tvGo.setTextColor(T.primaryDeep);
  tvGo.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 24);
  tvGo.setTypeface(null, android.graphics.Typeface.BOLD);
  tvGo.setGravity(android.view.Gravity.CENTER);
  row.addView(tvGo, new android.widget.LinearLayout.LayoutParams(this.dp(26), -1));
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

FloatBallAppWM.prototype.createIslandWelcomeCard = function(parent, statusLabel, statusValue, statusBg, statusStroke, statusValueColor) {
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getAnimalIslandTheme();
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  this.applySettingsTheme(T, isDark, C, cfgTpl);
  var spec = this.getSettingsResponsiveSpec ? this.getSettingsResponsiveSpec() : null;
  var compactWelcome = spec && (spec.isLandscape || spec.isExpandedWidth || spec.isWideWidth);
  var card = new android.widget.LinearLayout(context);
  card.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  card.setGravity(android.view.Gravity.CENTER_VERTICAL);
  card.setPadding(this.dp(14), compactWelcome ? this.dp(10) : this.dp(14), this.dp(14), compactWelcome ? this.dp(10) : this.dp(14));
  card.setBackground(this.ui.createStrokeDrawable(T.card, this.withAlpha(T.primaryDeep, isDark ? 0.22 : 0.18), this.dp(1), spec ? spec.cardRadius : this.dp(24)));
  try { card.setElevation(this.dp(compactWelcome ? 2 : 4)); } catch(eElev) {}
  var island = new android.widget.TextView(context);
  island.setText("☁  ︵\n🌴🏠⛱\n≈≈≈≈");
  island.setGravity(android.view.Gravity.CENTER);
  island.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, compactWelcome ? 16 : 20);
  island.setTextColor(T.primaryDeep);
  island.setBackground(this.ui.createRoundDrawable(this.withAlpha(T.primarySoft, isDark ? 0.78 : 0.96), this.dp(22)));
  var islandLp = new android.widget.LinearLayout.LayoutParams(compactWelcome ? this.dp(76) : this.dp(104), compactWelcome ? this.dp(64) : this.dp(88));
  islandLp.setMargins(0, 0, this.dp(14), 0);
  card.addView(island, islandLp);
  var right = new android.widget.LinearLayout(context);
  right.setOrientation(android.widget.LinearLayout.VERTICAL);
  right.setGravity(android.view.Gravity.CENTER_VERTICAL);
  var titleMain = new android.widget.TextView(context);
  titleMain.setText("欢迎回来，岛主");
  titleMain.setTextColor(T.text);
  titleMain.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, compactWelcome ? 17 : 21);
  titleMain.setTypeface(null, android.graphics.Typeface.BOLD);
  right.addView(titleMain, new android.widget.LinearLayout.LayoutParams(-1, -2));
  var titleSub = new android.widget.TextView(context);
  titleSub.setText("今天也来整理你的小工具吧");
  titleSub.setTextColor(T.sub);
  titleSub.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  titleSub.setPadding(0, this.dp(3), 0, compactWelcome ? this.dp(6) : this.dp(10));
  right.addView(titleSub, new android.widget.LinearLayout.LayoutParams(-1, -2));
  var statusBar = new android.widget.LinearLayout(context);
  statusBar.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  statusBar.setGravity(android.view.Gravity.CENTER_VERTICAL);
  statusBar.setPadding(this.dp(10), this.dp(6), this.dp(8), this.dp(6));
  statusBar.setBackground(this.ui.createStrokeDrawable(statusBg, this.withAlpha(statusStroke, isDark ? 0.34 : 0.24), this.dp(1), this.dp(16)));
  var dot = new android.widget.TextView(context);
  dot.setText("●");
  dot.setTextColor(T.primaryDeep);
  dot.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  dot.setGravity(android.view.Gravity.CENTER);
  statusBar.addView(dot, new android.widget.LinearLayout.LayoutParams(this.dp(20), -2));
  var st = new android.widget.TextView(context);
  st.setText(String(statusValue || "当前生效"));
  st.setTextColor(statusValueColor);
  st.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  st.setTypeface(null, android.graphics.Typeface.BOLD);
  statusBar.addView(st, new android.widget.LinearLayout.LayoutParams(0, -2, 1));
  var ok = new android.widget.TextView(context);
  ok.setText("✓");
  ok.setTextColor(T.onPrimary);
  ok.setGravity(android.view.Gravity.CENTER);
  ok.setTypeface(null, android.graphics.Typeface.BOLD);
  ok.setBackground(this.ui.createRoundDrawable(T.primary, this.dp(12)));
  statusBar.addView(ok, new android.widget.LinearLayout.LayoutParams(this.dp(24), this.dp(24)));
  right.addView(statusBar, new android.widget.LinearLayout.LayoutParams(-1, -2));
  card.addView(right, new android.widget.LinearLayout.LayoutParams(0, -1, 1));
  var lp = new android.widget.LinearLayout.LayoutParams(-1, compactWelcome ? this.dp(92) : this.dp(120));
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
  if (useMonetHome) {
    var all = [];
    addChild(all, "tools", "工具", "添加、整理和排序工具入口", "🧰", "route", "btn_editor");
    for (var m = 0; m < defs.length; m++) {
      var dm = defs[m];
      if (!dm) continue;
      addChild(all, String(dm.key), dm.title, dm.desc, this.getSettingsHomeIcon ? this.getSettingsHomeIcon(dm.title) : "✦", "group", dm.key);
      used[String(dm.key)] = true;
    }
    addChild(all, "schema", "高级设置", "编辑设置页结构和高级配置", "⚙", "route", "schema_editor");
    cats.push({ id: "all", icon: "▦", title: "工具与配置", desc: "集中管理全部设置入口", children: all });
    return cats;
  }
  var layout = [];
  addChild(layout, "tools", "工具伙伴", "添加、整理和安排你的工具伙伴", "🧰", "route", "btn_editor");
  cats.push({ id: "layout", icon: "🧰", title: "布局与管理", desc: "工具伙伴与岛屿结构", children: layout });

  var fun = [];
  for (var i = 0; i < defs.length; i++) {
    var d = defs[i];
    if (!d) continue;
    if (String(d.key) === "theme" || String(d.key) === "motion" || String(d.key) === "debug") continue;
    addChild(fun, String(d.key), d.title, d.desc, this.getSettingsHomeIcon ? this.getSettingsHomeIcon(d.title) : "✦", "group", d.key);
    used[String(d.key)] = true;
  }
  cats.push({ id: "fun", icon: "🎈", title: "趣味元素", desc: "漂浮气球和面板小屋", children: fun });

  var look = [];
  for (var j = 0; j < defs.length; j++) {
    var d2 = defs[j];
    if (!d2) continue;
    if (String(d2.key) !== "theme" && String(d2.key) !== "motion") continue;
    addChild(look, String(d2.key), d2.title, d2.desc, this.getSettingsHomeIcon ? this.getSettingsHomeIcon(d2.title) : "✦", "group", d2.key);
    used[String(d2.key)] = true;
  }
  cats.push({ id: "look", icon: "👕", title: "外观与互动", desc: "换装、装饰、动作与手势", children: look });

  var record = [];
  for (var k = 0; k < defs.length; k++) {
    var d3 = defs[k];
    if (!d3) continue;
    if (String(d3.key) !== "debug") continue;
    addChild(record, String(d3.key), d3.title, d3.desc, this.getSettingsHomeIcon ? this.getSettingsHomeIcon(d3.title) : "✦", "group", d3.key);
    used[String(d3.key)] = true;
  }
  addChild(record, "schema", "高级蓝图", "编辑设置页结构和高级配置，适合进阶用户", "🗺", "route", "schema_editor");
  cats.push({ id: "record", icon: "📒", title: "记录与状态", desc: "岛务记录和高级蓝图", children: record });

  var other = [];
  for (var x = 0; x < defs.length; x++) {
    var dx = defs[x];
    if (!dx) continue;
    if (used[String(dx.key)]) continue;
    addChild(other, String(dx.key), dx.title, dx.desc, this.getSettingsHomeIcon ? this.getSettingsHomeIcon(dx.title) : "✦", "group", dx.key);
  }
  if (other.length > 0) cats.push({ id: "other", icon: "✦", title: "其他可用分类", desc: "更多设置入口", children: other });
  return cats;
};


FloatBallAppWM.prototype.findSettingsHomeCategoryAndChild = function(cats, itemId) {
  var target = String(itemId || "");
  for (var i = 0; i < (cats || []).length; i++) {
    var cat = cats[i];
    var children = cat && cat.children ? cat.children : [];
    for (var j = 0; j < children.length; j++) {
      if (String(children[j].id) === target) return { category: cat, child: children[j] };
    }
  }
  return null;
};

FloatBallAppWM.prototype.buildSettingsGroupDetailPane = function(groupKey, title, desc) {
  var self = this;
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getAnimalIslandTheme();
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  this.applySettingsTheme(T, isDark, C, cfgTpl);
  var spec = this.getSettingsResponsiveSpec ? this.getSettingsResponsiveSpec() : null;
  var columns = (spec && spec.isWideWidth) ? 2 : 1;
  var cardRadius = spec ? spec.cardRadius : this.dp(18);
  var root = new android.widget.LinearLayout(context);
  root.setOrientation(android.widget.LinearLayout.VERTICAL);
  root.setPadding(0, 0, 0, 0);

  var top = new android.widget.LinearLayout(context);
  top.setOrientation(android.widget.LinearLayout.VERTICAL);
  top.setPadding(this.dp(2), 0, this.dp(2), this.dp(10));
  var crumb = new android.widget.TextView(context);
  crumb.setText("‹ 返回分类");
  crumb.setTextColor(T.primaryDeep);
  crumb.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  crumb.setTypeface(null, android.graphics.Typeface.BOLD);
  crumb.setPadding(0, 0, 0, this.dp(4));
  crumb.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
    try { self.touchActivity(); self.state.settingsHomeSelectedItemId = null; if (self.replaceToolAppPage) self.replaceToolAppPage("settings"); } catch(e) {}
  }}));
  top.addView(crumb, new android.widget.LinearLayout.LayoutParams(-1, -2));
  var tvTitle = new android.widget.TextView(context);
  tvTitle.setText(String(title || this.getSettingsGroupTitle(groupKey) || "设置详情"));
  tvTitle.setTextColor(T.text);
  tvTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 18);
  tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);
  top.addView(tvTitle, new android.widget.LinearLayout.LayoutParams(-1, -2));
  var tvDesc = new android.widget.TextView(context);
  tvDesc.setText(String(desc || "在右侧整理这一组设置，左侧目录保持常驻"));
  tvDesc.setTextColor(T.sub);
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
      var color = (k === "error") ? C.error : T.primaryDeep;
      var bg = (k === "error") ? self.withAlpha(C.error, isDark ? 0.20 : 0.10) : self.withAlpha(T.primaryDeep, isDark ? 0.18 : 0.10);
      var stroke = (k === "error") ? self.withAlpha(C.error, isDark ? 0.44 : 0.30) : self.withAlpha(T.primaryDeep, isDark ? 0.34 : 0.22);
      var tv = new android.widget.TextView(context);
      tv.setText(String(msg || ""));
      tv.setTextColor(color);
      tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      tv.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
      tv.setBackground(self.ui.createStrokeDrawable(bg, stroke, self.dp(1), self.dp(14)));
      var lp = new android.widget.LinearLayout.LayoutParams(-1, -2);
      lp.setMargins(self.dp(2), self.dp(6), self.dp(2), self.dp(8));
      groupDetailNotice.addView(tv, lp);
      groupDetailNotice.setVisibility(android.view.View.VISIBLE);
    } catch(eGDN) { safeLog(null, 'e', "catch " + String(eGDN)); }
  }

  var scroll = new android.widget.ScrollView(context);
  try { scroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER); scroll.setVerticalScrollBarEnabled(false); } catch(eOS) {}
  var box = columns > 1 ? this.createSettingsGridContainer(columns) : new android.widget.LinearLayout(context);
  if (columns <= 1) box.setOrientation(android.widget.LinearLayout.VERTICAL);
  box.setPadding(0, this.dp(4), 0, this.dp(20));
  scroll.addView(box);
  scroll.setOnTouchListener(new JavaAdapter(android.view.View.OnTouchListener, { onTouch: function(v, e) { self.touchActivity(); return false; }}));

  var schema = this.getConfigSchema();
  var currentCard = null;
  var includeSection = false;
  function createCard() {
    var c = new android.widget.LinearLayout(context);
    c.setOrientation(android.widget.LinearLayout.VERTICAL);
    c.setBackground(self.ui.createStrokeDrawable(T.card, self.withAlpha(T.stroke, isDark ? 0.22 : 0.30), self.dp(1), cardRadius));
    try { c.setElevation(self.dp(1)); } catch(e) {}
    try { c.setClipToOutline(true); } catch(e2) {}
    if (columns > 1) {
      var glp = new android.widget.GridLayout.LayoutParams();
      glp.width = 0;
      glp.height = android.widget.GridLayout.LayoutParams.WRAP_CONTENT;
      glp.columnSpec = android.widget.GridLayout.spec(android.widget.GridLayout.UNDEFINED, 1, 1);
      glp.setMargins(self.dp(6), self.dp(6), self.dp(6), self.dp(8));
      c.setLayoutParams(glp);
    } else {
      var lp = new android.widget.LinearLayout.LayoutParams(-1, -2);
      lp.setMargins(self.dp(2), self.dp(6), self.dp(2), self.dp(8));
      c.setLayoutParams(lp);
    }
    c.setPadding(0, 0, 0, self.dp(4));
    return c;
  }
  var activeGroupKey = String(groupKey || "");
  for (var i = 0; i < schema.length; i++) {
    (function(item) {
      if (item && String(item.type) === "section") {
        includeSection = self.isSchemaSectionInSettingsGroup(String(item.name || ""), activeGroupKey);
        if (!includeSection) { currentCard = null; return; }
        currentCard = createCard();
        box.addView(currentCard);
        self.createSectionHeader(item, currentCard);
      } else {
        if (!includeSection) return;
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
  var btnSave = this.ui.createSolidButton(this, "💾  保存布置", T.primary, T.onPrimary, function() {
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
  var T = this.getAnimalIslandTheme();
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  this.applySettingsTheme(T, isDark, C, cfgTpl);
  var root = new android.widget.LinearLayout(context);
  root.setOrientation(android.widget.LinearLayout.VERTICAL);
  root.setPadding(0, 0, 0, 0);
  var top = new android.widget.LinearLayout(context);
  top.setOrientation(android.widget.LinearLayout.VERTICAL);
  top.setPadding(this.dp(2), 0, this.dp(2), this.dp(8));
  var crumb = new android.widget.TextView(context);
  crumb.setText("‹ 返回分类");
  crumb.setTextColor(T.primaryDeep);
  crumb.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  crumb.setTypeface(null, android.graphics.Typeface.BOLD);
  crumb.setPadding(0, 0, 0, this.dp(4));
  crumb.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
    try { self.touchActivity(); self.state.settingsHomeSelectedItemId = null; if (self.replaceToolAppPage) self.replaceToolAppPage("settings"); } catch(e) {}
  }}));
  top.addView(crumb, new android.widget.LinearLayout.LayoutParams(-1, -2));
  var tvTitle = new android.widget.TextView(context);
  tvTitle.setText(String(title || this.getToolAppTitle(route) || "详情"));
  tvTitle.setTextColor(T.text);
  tvTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 18);
  tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);
  top.addView(tvTitle, new android.widget.LinearLayout.LayoutParams(-1, -2));
  var tvDesc = new android.widget.TextView(context);
  tvDesc.setText(String(desc || "在右侧窗格内完成这一项设置"));
  tvDesc.setTextColor(T.sub);
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
  var T = this.getAnimalIslandTheme();
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  this.applySettingsTheme(T, isDark, C, cfgTpl);
  var row = new android.widget.LinearLayout(context);
  row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  row.setGravity(android.view.Gravity.CENTER_VERTICAL);
  row.setPadding(this.dp(10), this.dp(8), this.dp(10), this.dp(8));
  row.setMinimumHeight(this.dp(68));
  var bg = selected ? T.primarySoft : T.card;
  var stroke = selected ? this.withAlpha(T.primaryDeep, isDark ? 0.52 : 0.36) : this.withAlpha(T.stroke, isDark ? 0.20 : 0.24);
  row.setBackground(this.ui.createStrokeDrawable(bg, stroke, this.dp(1), this.dp(18)));
  try { row.setElevation(this.dp(selected ? 2 : 0)); } catch(eElev) {}
  var mark = new android.view.View(context);
  mark.setBackground(this.ui.createRoundDrawable(selected ? T.primaryDeep : this.withAlpha(T.primaryDeep, 0.0), this.dp(3)));
  var markLp = new android.widget.LinearLayout.LayoutParams(this.dp(4), -1);
  markLp.setMargins(0, this.dp(8), this.dp(8), this.dp(8));
  row.addView(mark, markLp);
  var icon = new android.widget.TextView(context);
  icon.setText(String(cat && cat.icon || "✦"));
  icon.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 18);
  icon.setTextColor(selected ? T.primaryDeep : T.text);
  icon.setGravity(android.view.Gravity.CENTER);
  icon.setBackground(this.ui.createRoundDrawable(selected ? T.card : T.primarySoft, this.dp(14)));
  var iconLp = new android.widget.LinearLayout.LayoutParams(this.dp(42), this.dp(42));
  iconLp.setMargins(0, 0, this.dp(10), 0);
  row.addView(icon, iconLp);
  var texts = new android.widget.LinearLayout(context);
  texts.setOrientation(android.widget.LinearLayout.VERTICAL);
  var title = new android.widget.TextView(context);
  title.setText(String(cat && cat.title || ""));
  title.setTextColor(selected ? T.primaryDeep : T.text);
  title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
  title.setTypeface(null, android.graphics.Typeface.BOLD);
  texts.addView(title, new android.widget.LinearLayout.LayoutParams(-1, -2));
  var desc = new android.widget.TextView(context);
  desc.setText(String(cat && cat.desc || ""));
  desc.setTextColor(T.sub);
  desc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
  desc.setPadding(0, this.dp(2), 0, 0);
  try { desc.setMaxLines(2); } catch(eMax) {}
  texts.addView(desc, new android.widget.LinearLayout.LayoutParams(-1, -2));
  row.addView(texts, new android.widget.LinearLayout.LayoutParams(0, -2, 1));
  row.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
    try { self.touchActivity(); } catch(eT) {}
    try { if (onClick) onClick(); } catch(eC) { try { self.toast("切换失败: " + String(eC)); } catch(eToast) {} }
  }}));
  var lp = new android.widget.LinearLayout.LayoutParams(-1, -2);
  lp.setMargins(0, 0, 0, this.dp(8));
  parent.addView(row, lp);
};

FloatBallAppWM.prototype.buildSettingsHomePanelView = function() {
  if (!this.state.pendingUserCfg) this.beginEditConfig();
  var self = this;
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getAnimalIslandTheme();
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  this.applySettingsTheme(T, isDark, C, cfgTpl);
  var spec = this.getSettingsResponsiveSpec ? this.getSettingsResponsiveSpec() : null;
  var useMonetHome = this.isSettingsMonetTheme ? this.isSettingsMonetTheme(cfgTpl) : false;
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
  try { panel.setBackground(this.ui.createRoundDrawable(T.bg, spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(18) : this.dp(24))); } catch(ePanelBg) {}
  panel.setPadding(spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(4) : this.dp(8), spec && spec.isLandscape ? this.dp(2) : this.dp(6), spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(4) : this.dp(8), this.dp(4));

  var settingsNoticeContainer = null;
  function setSettingsInlineNotice(msg, kind) {
    try {
      if (!settingsNoticeContainer) return;
      settingsNoticeContainer.removeAllViews();
      var k = String(kind || "info");
      var color = (k === "error") ? C.error : T.primaryDeep;
      var bg = (k === "error") ? self.withAlpha(C.error, isDark ? 0.20 : 0.10) : self.withAlpha(T.primaryDeep, isDark ? 0.18 : 0.10);
      var stroke = (k === "error") ? self.withAlpha(C.error, isDark ? 0.44 : 0.30) : self.withAlpha(T.primaryDeep, isDark ? 0.34 : 0.22);
      var tv = new android.widget.TextView(context);
      tv.setText(String(msg || ""));
      tv.setTextColor(color);
      tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      tv.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
      tv.setGravity(android.view.Gravity.CENTER_VERTICAL);
      tv.setBackground(self.ui.createStrokeDrawable(bg, stroke, self.dp(1), self.dp(14)));
      settingsNoticeContainer.addView(tv, new android.widget.LinearLayout.LayoutParams(-1, -2));
      settingsNoticeContainer.setVisibility(android.view.View.VISIBLE);
    } catch(eNotice) { safeLog(null, 'e', "catch " + String(eNotice)); }
  }

  function saveSettingsNow() {
    try {
      self.touchActivity();
      var r = self.commitPendingUserCfg();
      self.state.previewMode = false;
      if (self.state.addedPanel) self.hideMainPanel();
      if (r && r.ok) setSettingsInlineNotice("已保存并生效", "ok");
      else setSettingsInlineNotice("保存失败: " + (r && r.reason ? r.reason : (r && r.err ? r.err : "unknown")), "error");
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

  if (useMasterDetail) {
    var root = new android.widget.LinearLayout(context);
    root.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    root.setGravity(android.view.Gravity.CENTER);
    panel.addView(root, new android.widget.LinearLayout.LayoutParams(-1, 0, 1));

    var navCard = new android.widget.LinearLayout(context);
    navCard.setOrientation(android.widget.LinearLayout.VERTICAL);
    navCard.setPadding(this.dp(12), this.dp(12), this.dp(12), this.dp(12));
    navCard.setBackground(this.ui.createStrokeDrawable(T.card, this.withAlpha(T.stroke, isDark ? 0.22 : 0.28), this.dp(1), cardRadius));
    try { navCard.setElevation(this.dp(1)); } catch(eNavElev) {}
    var navTitle = new android.widget.TextView(context);
    navTitle.setText(useMonetHome ? "设置目录" : "岛屿目录");
    navTitle.setTextColor(T.text);
    navTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    navTitle.setTypeface(null, android.graphics.Typeface.BOLD);
    navCard.addView(navTitle, new android.widget.LinearLayout.LayoutParams(-1, -2));
    var navSub = new android.widget.TextView(context);
    navSub.setText("选择左侧分类，右侧整理对应设置");
    navSub.setTextColor(T.sub);
    navSub.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
    navSub.setPadding(0, this.dp(3), 0, this.dp(10));
    navCard.addView(navSub, new android.widget.LinearLayout.LayoutParams(-1, -2));
    var navScroll = new android.widget.ScrollView(context);
    try { navScroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER); navScroll.setVerticalScrollBarEnabled(false); } catch(eNS) {}
    var navList = new android.widget.LinearLayout(context);
    navList.setOrientation(android.widget.LinearLayout.VERTICAL);
    navScroll.addView(navList);
    navCard.addView(navScroll, new android.widget.LinearLayout.LayoutParams(-1, 0, 1));

    var detailCard = new android.widget.LinearLayout(context);
    detailCard.setOrientation(android.widget.LinearLayout.VERTICAL);
    detailCard.setPadding(this.dp(14), this.dp(12), this.dp(14), this.dp(12));
    detailCard.setBackground(this.ui.createStrokeDrawable(T.card, this.withAlpha(T.stroke, isDark ? 0.22 : 0.26), this.dp(1), cardRadius));
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
      hIcon.setTextColor(T.primaryDeep);
      hIcon.setBackground(self.ui.createRoundDrawable(T.primarySoft, self.dp(15)));
      var hIconLp = new android.widget.LinearLayout.LayoutParams(self.dp(46), self.dp(46));
      hIconLp.setMargins(0, 0, self.dp(12), 0);
      head.addView(hIcon, hIconLp);
      var hTexts = new android.widget.LinearLayout(context);
      hTexts.setOrientation(android.widget.LinearLayout.VERTICAL);
      var hTitle = new android.widget.TextView(context);
      hTitle.setText(String(selectedCat && selectedCat.title || "设置分类"));
      hTitle.setTextColor(T.text);
      hTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 18);
      hTitle.setTypeface(null, android.graphics.Typeface.BOLD);
      hTexts.addView(hTitle, new android.widget.LinearLayout.LayoutParams(-1, -2));
      var hDesc = new android.widget.TextView(context);
      hDesc.setText(String(selectedCat && selectedCat.desc || ""));
      hDesc.setTextColor(T.sub);
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
      var btnSave = self.ui.createSolidButton(self, useMonetHome ? "保存" : "💾  保存布置", T.primary, T.onPrimary, saveSettingsNow);
      btnSave.setPadding(self.dp(18), 0, self.dp(18), 0);
      try { btnSave.setBackground(self.ui.createStrokeDrawable(T.primary, self.withAlpha(T.primaryDeep, isDark ? 0.22 : 0.16), self.dp(1), self.dp(24))); } catch(eSaveBg) {}
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

  var statusLabel = "已保存";
  var statusValue = "当前生效";
  var statusBg = T.card;
  var statusStroke = T.stroke;
  var statusValueColor = T.text;
  try {
    if (this.state.previewMode) {
      statusLabel = "预览中"; statusValue = "未保存";
      statusBg = T.primarySoft; statusStroke = T.primaryDeep; statusValueColor = T.primaryDeep;
    } else if (this.state.pendingDirty) {
      statusLabel = "有修改"; statusValue = "待保存";
      statusBg = T.primarySoft; statusStroke = T.primaryDeep; statusValueColor = T.primaryDeep;
    }
  } catch(eStatus) {}
  this.createIslandWelcomeCard(panel, statusLabel, statusValue, statusBg, statusStroke, statusValueColor);
  settingsNoticeContainer = new android.widget.LinearLayout(context);
  settingsNoticeContainer.setOrientation(android.widget.LinearLayout.VERTICAL);
  settingsNoticeContainer.setVisibility(android.view.View.GONE);
  var noticeLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
  noticeLp.setMargins(this.dp(2), 0, this.dp(2), this.dp(8));
  panel.addView(settingsNoticeContainer, noticeLp);

  var contentCard = new android.widget.LinearLayout(context);
  contentCard.setOrientation(android.widget.LinearLayout.VERTICAL);
  contentCard.setPadding(spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(10) : this.dp(12), spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(8) : this.dp(10), spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(10) : this.dp(12), this.dp(10));
  contentCard.setBackground(this.ui.createStrokeDrawable(T.card, this.withAlpha(T.stroke, isDark ? 0.24 : 0.26), this.dp(1), cardRadius));
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
  bottom.setBackground(this.ui.createRoundDrawable(this.withAlpha(T.bg, isDark ? 0.70 : 0.82), this.dp(20)));
  var deco = new android.widget.TextView(context);
  deco.setText(spec && (spec.isExpandedWidth || spec.isWideWidth) ? "🌿        ✿        🌿" : "🌿  ✿                 ✿  🌿");
  deco.setGravity(android.view.Gravity.CENTER);
  deco.setTextColor(this.withAlpha(T.primaryDeep, isDark ? 0.30 : 0.24));
  deco.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 10);
  if (!(spec && spec.isLandscape)) bottom.addView(deco, new android.widget.LinearLayout.LayoutParams(-1, this.dp(14)));
  var bottomSave = this.ui.createSolidButton(this, useMonetHome ? "保存" : "💾  保存布置", T.primary, T.onPrimary, saveSettingsNow);
  bottomSave.setPadding(this.dp(18), 0, this.dp(18), 0);
  try { bottomSave.setBackground(this.ui.createStrokeDrawable(T.primary, this.withAlpha(T.primaryDeep, isDark ? 0.22 : 0.16), this.dp(1), this.dp(23))); } catch(eSaveBg2) {}
  try { bottomSave.setElevation(this.dp(1)); } catch(eSaveElev2) {}
  var saveLp2 = new android.widget.LinearLayout.LayoutParams(-1, this.dp(44));
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
  var T = this.getAnimalIslandTheme();

  // 设置页主题切换：animal（默认动物岛风）或 monet（系统莫奈色）
  var cfgTpl = this.state.pendingUserCfg ? this.state.pendingUserCfg : this.config;
  this.applySettingsTheme(T, isDark, C, cfgTpl);

  var bgColor = T.bg;
  var cardColor = T.card;
  var textColor = T.text;
  var spec = this.getSettingsResponsiveSpec ? this.getSettingsResponsiveSpec() : null;
  var columns = spec ? spec.gridColumnCount : 1;
  var cardRadius = spec ? spec.cardRadius : this.dp(18);

  var panel = this.ui.createStyledPanel(this, 16);
  try { panel.setBackground(this.ui.createRoundDrawable(T.bg, spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(16) : this.dp(18))); } catch(ePanelBg) {}
  panel.setPadding(spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(4) : this.dp(8), spec && spec.isLandscape ? this.dp(2) : this.dp(6), spec && (spec.isExpandedWidth || spec.isWideWidth) ? this.dp(4) : this.dp(8), this.dp(4));
  var settingsGroupNotice = null;
  function setSettingsGroupNotice(msg, kind) {
    try {
      if (!settingsGroupNotice) return;
      settingsGroupNotice.removeAllViews();
      var k = String(kind || "info");
      var color = (k === "error") ? C.error : T.primaryDeep;
      var bg = (k === "error") ? self.withAlpha(C.error, isDark ? 0.20 : 0.10) : self.withAlpha(T.primaryDeep, isDark ? 0.18 : 0.10);
      var stroke = (k === "error") ? self.withAlpha(C.error, isDark ? 0.44 : 0.30) : self.withAlpha(T.primaryDeep, isDark ? 0.34 : 0.22);
      var tv = new android.widget.TextView(context);
      tv.setText(String(msg || ""));
      tv.setTextColor(color);
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
  previewBox.setBackground(self.ui.createRoundDrawable(self.withAlpha(T.primarySoft, isDark ? 0.70 : 0.95), self.dp(16))); // 浅色背景提示

  var tvPreview = new android.widget.TextView(context);
  tvPreview.setText("边调边看");
  tvPreview.setTextColor(T.primaryDeep);
  tvPreview.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  tvPreview.setTypeface(null, android.graphics.Typeface.BOLD);
  tvPreview.setPadding(0, 0, this.dp(4), 0);
  previewBox.addView(tvPreview);

  var switchPreview = new android.widget.Switch(context);
  try { switchPreview.setTextOn(""); switchPreview.setTextOff("");  } catch(eT) { safeLog(null, 'e', "catch " + String(eT)); }
  try {
      var states = [[android.R.attr.state_checked], [-android.R.attr.state_checked]];
      var thumbColors = [T.primary, isDark ? T.card2 : (0xFFCCCCCC | 0)];
      var trackColors = [self.withAlpha(T.primary, 0.5), self.withAlpha(isDark ? T.card2 : (0xFFCCCCCC | 0), 0.5)];
      switchPreview.setThumbTintList(new android.content.res.ColorStateList(states, thumbColors));
      switchPreview.setTrackTintList(new android.content.res.ColorStateList(states, trackColors));
   } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

  switchPreview.setChecked(!!self.state.previewMode);
  switchPreview.setOnCheckedChangeListener(new android.widget.CompoundButton.OnCheckedChangeListener({
      onCheckedChanged: function(btn, checked) {
          self.touchActivity();
          self.state.previewMode = !!checked;
          if (checked) {
              setSettingsGroupNotice("边调边看已开启", "ok");
              tvPreview.setTextColor(T.primaryDeep);
              previewBox.setBackground(self.ui.createRoundDrawable(self.withAlpha(T.primarySoft, isDark ? 0.70 : 0.95), self.dp(16)));
              self.refreshPreview();
          } else {
              setSettingsGroupNotice("预览模式已关闭", "info");
              tvPreview.setTextColor(0xFF888888 | 0);
              previewBox.setBackground(null);
              if (self.state.addedPanel) self.hideMainPanel();
              self.rebuildBallForNewSize(true);
          }
      }
  }));
  previewBox.addView(switchPreview);

  header.addView(previewBox);

  // [恢复] 保存按钮（放在最后一位）
  var btnOk = this.ui.createSolidButton(this, "保存装扮", T.primary, T.onPrimary, function() {
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

  var scroll = new android.widget.ScrollView(context);
  try { scroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);  } catch(eOS) { safeLog(null, 'e', "catch " + String(eOS)); }
  try { scroll.setVerticalScrollBarEnabled(false);  } catch(eSB) { safeLog(null, 'e', "catch " + String(eSB)); }

  var box = columns > 1 ? this.createSettingsGridContainer(columns) : new android.widget.LinearLayout(context);
  if (columns <= 1) box.setOrientation(android.widget.LinearLayout.VERTICAL);
  box.setPadding(0, this.dp(4), 0, this.dp(12));
  scroll.addView(box);

  scroll.setOnTouchListener(new JavaAdapter(android.view.View.OnTouchListener, {
    onTouch: function(v, e) { self.touchActivity(); return false; }
  }));

  var schema = this.getConfigSchema();
  var activeGroupKey = String(this.state.settingsGroupKey || "");
  var currentCard = null;
  var includeSection = false;

  function createCard() {
      var c = new android.widget.LinearLayout(context);
      c.setOrientation(android.widget.LinearLayout.VERTICAL);
      c.setBackground(self.ui.createStrokeDrawable(cardColor, self.withAlpha(T.stroke, isDark ? 0.22 : 0.30), self.dp(1), cardRadius));
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
        currentCard = createCard();
        box.addView(currentCard);
        self.createSectionHeader(item, currentCard);
      } else {
        if (!includeSection) return;
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

    function normalizeTintColorValue(v, allowEmpty) {
        var s = (v === undefined || v === null) ? "" : String(v);
        s = s.replace(/^\s+|\s+$/g, "").toUpperCase();
        if (!s) return allowEmpty ? "" : null;
        if (s.charAt(0) !== "#") s = "#" + s;
        if (/^#[0-9A-F]{6}$/.test(s)) return "#FF" + s.substring(1);
        if (/^#[0-9A-F]{8}$/.test(s)) return s;
        return null;
    }

    function extractTintAlphaByte(hex) {
        var n = normalizeTintColorValue(hex, false);
        if (!n) return 255;
        return parseInt(n.substring(1, 3), 16);
    }

    function extractTintRgbHex(hex) {
        var n = normalizeTintColorValue(hex, false);
        if (!n) return "#FFFFFF";
        return "#" + n.substring(3);
    }

    function buildArgbHex(alphaByte, rgbHex) {
        var a = Number(alphaByte);
        if (isNaN(a) || a < 0) a = 0;
        if (a > 255) a = 255;
        var rgb = String(rgbHex || "#FFFFFF").toUpperCase();
        if (rgb.charAt(0) !== "#") rgb = "#" + rgb;
        if (!/^#[0-9A-F]{6}$/.test(rgb)) rgb = "#FFFFFF";
        var aHex = java.lang.Integer.toHexString(a & 255).toUpperCase();
        if (aHex.length < 2) aHex = "0" + aHex;
        return "#" + aHex + rgb.substring(1);
    }

function __scStr(v) { try { return String(v == null ? "" : v); } catch(e) { return ""; } }

function __scLower(v) { try { return __scStr(v).toLowerCase(); } catch(e) { return ""; } }

function __scEnsureShortcutIconFile(item) {
    // 这段代码的主要内容/用途：把 Launcher Shortcuts 的图标在"可见时"持久化为 PNG，后续按钮页直接读文件显示，避免桌面移除后图标退化/缺失。
    try {
        if (!item) return "";
        var pkg = __scStr(item.pkg);
        var sid = __scStr(item.shortcutId);
        var uid = (item.userId != null) ? __scStr(item.userId) : "0";
        if (!pkg || !sid) return "";

        var dir = String(APP_ROOT_DIR) + "/shortcut_icons";
        try {
            var d = new java.io.File(dir);
            if (!d.exists()) d.mkdirs();
         } catch(eMk) { safeLog(null, 'e', "catch " + String(eMk)); }

        // # 与主程序同名规则：pkg__sid__u{uid}.png
        var fn = __scSanitizeFileName(pkg) + "__" + __scSanitizeFileName(sid) + "__u" + __scSanitizeFileName(uid) + ".png";
        var outPath = dir + "/" + fn;

        // # 已存在则直接复用
        try {
            var f = new java.io.File(outPath);
            if (f.exists() && f.isFile() && f.length() > 0) return outPath;
         } catch(eEx) { safeLog(null, 'e', "catch " + String(eEx)); }

        // # 获取 Drawable（优先 shortcut icon，失败则回退 app icon）
        var dr = null;
        try {
            if (__scLauncherApps && item.shortcutInfo) {
                try { dr = __scLauncherApps.getShortcutIconDrawable(item.shortcutInfo, 0); } catch(eD0) { dr = null; }
            }
        } catch(eLA) { dr = null; }
        if (!dr) {
            try {
                var pm = context.getPackageManager();
                dr = pm.getApplicationIcon(pkg);
            } catch(eApp) { dr = null; }
        }
        if (!dr) return "";

        // # Drawable -> Bitmap -> PNG
        var bmp = null;
        try { bmp = __scDrawableToBitmap(dr, 192); } catch(eBmp) { bmp = null; }
        if (!bmp) return "";

        var fos = null;
        try {
            fos = new java.io.FileOutputStream(outPath);
            bmp.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, fos);
            try { fos.flush();  } catch(eFl) { safeLog(null, 'e', "catch " + String(eFl)); }
            try { fos.close();  } catch(eCl) { safeLog(null, 'e', "catch " + String(eCl)); }
            fos = null;
        } catch(eW) {
            try { if (fos) fos.close();  } catch(eCl2) { safeLog(null, 'e', "catch " + String(eCl2)); }
            fos = null;
            return "";
        }

        return outPath;
    } catch(eAll) {
        return "";
    }
}

function __scSanitizeFileName(s) {
    try {
        var t = __scStr(s);
        t = t.replace(/[^a-zA-Z0-9._-]+/g, "_");
        if (t.length > 120) t = t.substring(0, 120);
        return t;
    } catch(e) { return ""; }
}

function __scDrawableToBitmap(drawable, targetPx) {
    // 这段代码的主要内容/用途：把任意 Drawable 安全绘制成 Bitmap，便于持久化保存 PNG。
    try {
        if (!drawable) return null;

        // BitmapDrawable 直接取
        try {
            if (drawable instanceof android.graphics.drawable.BitmapDrawable) {
                var b = drawable.getBitmap();
                if (b) return b;
            }
         } catch(eBD) { safeLog(null, 'e', "catch " + String(eBD)); }

        var w = 0, h = 0;
        try { w = drawable.getIntrinsicWidth(); } catch(eW) { w = 0; }
        try { h = drawable.getIntrinsicHeight(); } catch(eH) { h = 0; }

        if (w <= 0 || h <= 0) {
            w = targetPx || 192;
            h = targetPx || 192;
        }

        // # 过大的直接缩到 targetPx 附近，避免 PNG 体积过大
        var maxSide = targetPx || 192;
        var side = Math.max(w, h);
        var scale = side > maxSide ? (maxSide / side) : 1.0;
        var bw = Math.max(1, Math.round(w * scale));
        var bh = Math.max(1, Math.round(h * scale));

        var bmp = android.graphics.Bitmap.createBitmap(bw, bh, android.graphics.Bitmap.Config.ARGB_8888);
        var canvas = new android.graphics.Canvas(bmp);
        drawable.setBounds(0, 0, bw, bh);
        drawable.draw(canvas);
        return bmp;
    } catch(eAll) {
        return null;
    }
}


FloatBallAppWM.prototype.matchesButtonManagerQuery = function(btnCfg, query) {
  try {
    var q = String(query || "").replace(/^\s+|\s+$/g, "").toLowerCase();
    if (!q) return true;
    var b = btnCfg || {};
    var hay = String(b.title || "") + " " + String(b.type || "") + " " + String(b.cmd || "") + " " + String(b.pkg || "") + " " + String(b.action || "") + " " + String(b.intent || "") + " " + String(b.shortcutName || "") + " " + String(b.iconResName || "");
    return hay.toLowerCase().indexOf(q) >= 0;
  } catch(e) { return true; }
};

FloatBallAppWM.prototype.createButtonManagerSummaryCard = function(parent, totalCount, enabledCount, disabledCount) {
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getAnimalIslandTheme();
  this.applySettingsTheme(T, isDark, C, this.state.pendingUserCfg || this.config);
  var card = new android.widget.LinearLayout(context);
  card.setOrientation(android.widget.LinearLayout.VERTICAL);
  card.setPadding(this.dp(14), this.dp(10), this.dp(14), this.dp(10));
  card.setBackground(this.ui.createStrokeDrawable(T.card, this.withAlpha(T.stroke, isDark ? 0.34 : 0.50), this.dp(1), this.dp(18)));
  try { card.setElevation(this.dp(3)); } catch(eElev) { safeLog(null, 'e', "catch " + String(eElev)); }

  var title = new android.widget.TextView(context);
  title.setText("按钮统计");
  title.setTextColor(T.text);
  title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
  title.setTypeface(null, android.graphics.Typeface.BOLD);
  card.addView(title);

  var sub = new android.widget.TextView(context);
  sub.setText("共 " + totalCount + " 个 · 已启用 " + enabledCount + " · 已禁用 " + disabledCount);
  sub.setTextColor(T.sub);
  sub.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  sub.setPadding(0, this.dp(4), 0, 0);
  card.addView(sub);

  var lp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
  lp.setMargins(this.dp(2), this.dp(2), this.dp(2), this.dp(8));
  parent.addView(card, lp);
};

FloatBallAppWM.prototype.createButtonManagerActionChip = function(text, textColor, strokeColor, onClickFn) {
  var T = this.getAnimalIslandTheme();
  this.applySettingsTheme(T, this.isDarkTheme(), this.ui.colors, this.state.pendingUserCfg || this.config);
  var tv = new android.widget.TextView(context);
  tv.setText(String(text || ""));
  tv.setGravity(android.view.Gravity.CENTER);
  tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  tv.setTypeface(null, android.graphics.Typeface.BOLD);
  tv.setTextColor(textColor);
  tv.setMinHeight(this.dp(34));
  tv.setPadding(this.dp(10), 0, this.dp(10), 0);
  try {
    var bg = new android.graphics.drawable.GradientDrawable();
    bg.setColor(this.withAlpha(T.primarySoft, this.isDarkTheme() ? 0.62 : 0.95));
    bg.setCornerRadius(this.dp(14));
    bg.setStroke(this.dp(1), strokeColor || this.withAlpha(T.primaryDeep, 0.32));
    tv.setBackground(bg);
    try { tv.setElevation(this.dp(1)); } catch(eElev) {}
  } catch(eBg) { safeLog(null, 'e', "catch " + String(eBg)); }
  if (onClickFn) {
    tv.setOnClickListener(new android.view.View.OnClickListener({ onClick: function() {
      try { onClickFn(); } catch(eClick) { safeLog(null, 'e', "catch " + String(eClick)); }
    }}));
  }
  return tv;
};


FloatBallAppWM.prototype.createButtonManagerTextAction = function(text, textColor, onClickFn) {
  var tv = new android.widget.TextView(context);
  tv.setText(String(text || ""));
  tv.setGravity(android.view.Gravity.CENTER);
  tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  tv.setTextColor(textColor);
  tv.setMinHeight(this.dp(30));
  tv.setPadding(this.dp(8), 0, this.dp(8), 0);
  if (onClickFn) {
    tv.setOnClickListener(new android.view.View.OnClickListener({ onClick: function() {
      try { onClickFn(); } catch(eClick) { safeLog(null, 'e', "catch " + String(eClick)); }
    }}));
  }
  return tv;
};

FloatBallAppWM.prototype.createButtonManagerPolishedCard = function(parent, title, subtitle, statText) {
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getAnimalIslandTheme();
  this.applySettingsTheme(T, isDark, C, this.state.pendingUserCfg || this.config);
  var card = new android.widget.LinearLayout(context);
  card.setOrientation(android.widget.LinearLayout.VERTICAL);
  card.setPadding(this.dp(14), this.dp(12), this.dp(14), this.dp(12));
  card.setBackground(this.ui.createStrokeDrawable(T.card, this.withAlpha(T.stroke, isDark ? 0.32 : 0.48), this.dp(1), this.dp(20)));
  try { card.setElevation(this.dp(3)); } catch(eElev) {}
  var tv = new android.widget.TextView(context);
  tv.setText(String(title || ""));
  tv.setTextColor(T.text);
  tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
  tv.setTypeface(null, android.graphics.Typeface.BOLD);
  card.addView(tv);
  var sub = new android.widget.TextView(context);
  sub.setText(String(subtitle || ""));
  sub.setTextColor(T.sub);
  sub.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  sub.setPadding(0, this.dp(4), 0, 0);
  card.addView(sub);
  if (statText) {
    var chip = this.createButtonManagerActionChip(String(statText), T.primaryDeep, this.withAlpha(T.primaryDeep, 0.32), null);
    var chipLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    chipLp.setMargins(0, this.dp(10), 0, 0);
    card.addView(chip, chipLp);
  }
  var lp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
  lp.setMargins(this.dp(2), this.dp(2), this.dp(2), this.dp(8));
  parent.addView(card, lp);
  return card;
};

FloatBallAppWM.prototype.addButtonEditorField = function(parent, view) {
  try {
    var lp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    lp.setMargins(0, this.dp(4), 0, this.dp(8));
    parent.addView(view, lp);
  } catch (e) {
    try { parent.addView(view); } catch(e2) {}
  }
};

FloatBallAppWM.prototype.createButtonEditorSectionCard = function(parent, title, desc) {
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getAnimalIslandTheme();
  this.applySettingsTheme(T, isDark, C, this.state.pendingUserCfg || this.config);
  var box = new android.widget.LinearLayout(context);
  box.setOrientation(android.widget.LinearLayout.VERTICAL);
  box.setPadding(this.dp(12), this.dp(10), this.dp(12), this.dp(10));
  box.setBackground(this.ui.createStrokeDrawable(T.card, this.withAlpha(T.stroke, isDark ? 0.30 : 0.46), this.dp(1), this.dp(18)));
  var tv = new android.widget.TextView(context);
  tv.setText(String(title || ""));
  tv.setTextColor(T.text);
  tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
  tv.setTypeface(null, android.graphics.Typeface.BOLD);
  box.addView(tv);
  if (desc) {
    var dv = new android.widget.TextView(context);
    dv.setText(String(desc));
    dv.setTextColor(T.sub);
    dv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
    dv.setPadding(0, this.dp(3), 0, 0);
    box.addView(dv);
  }
  var lp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
  lp.setMargins(0, this.dp(8), 0, this.dp(8));
  parent.addView(box, lp);
  return box;
};


FloatBallAppWM.prototype.createButtonEditorCollapsibleSection = function(parent, title, desc, defaultExpanded) {
  var self = this;
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getAnimalIslandTheme();
  this.applySettingsTheme(T, isDark, C, this.state.pendingUserCfg || this.config);
  var expanded = defaultExpanded !== false;
  var card = new android.widget.LinearLayout(context);
  card.setOrientation(android.widget.LinearLayout.VERTICAL);
  card.setPadding(this.dp(12), this.dp(10), this.dp(12), this.dp(10));
  card.setBackground(this.ui.createStrokeDrawable(T.card, this.withAlpha(T.stroke, isDark ? 0.30 : 0.46), this.dp(1), this.dp(18)));
  try { card.setElevation(this.dp(2)); } catch(eCardElev) {}

  var header = new android.widget.LinearLayout(context);
  header.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  header.setGravity(android.view.Gravity.CENTER_VERTICAL);
  var titleBox = new android.widget.LinearLayout(context);
  titleBox.setOrientation(android.widget.LinearLayout.VERTICAL);
  var tv = new android.widget.TextView(context);
  tv.setText(String(title || ""));
  tv.setTextColor(T.text);
  tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
  tv.setTypeface(null, android.graphics.Typeface.BOLD);
  titleBox.addView(tv);
  if (desc) {
    var dv = new android.widget.TextView(context);
    dv.setText(String(desc));
    dv.setTextColor(T.sub);
    dv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
    dv.setPadding(0, this.dp(3), this.dp(8), 0);
    titleBox.addView(dv);
  }
  var titleLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
  titleLp.weight = 1;
  header.addView(titleBox, titleLp);
  var toggleTv = new android.widget.TextView(context);
  toggleTv.setText(expanded ? "折叠 ▲" : "展开 ▼");
  toggleTv.setTextColor(T.primaryDeep);
  toggleTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  toggleTv.setTypeface(null, android.graphics.Typeface.BOLD);
  header.addView(toggleTv);
  card.addView(header);

  var body = new android.widget.LinearLayout(context);
  body.setOrientation(android.widget.LinearLayout.VERTICAL);
  body.setPadding(0, this.dp(8), 0, 0);
  if (!expanded) body.setVisibility(android.view.View.GONE);
  card.addView(body);

  header.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
    try {
      expanded = !expanded;
      body.setVisibility(expanded ? android.view.View.VISIBLE : android.view.View.GONE);
      toggleTv.setText(expanded ? "折叠 ▲" : "展开 ▼");
      self.touchActivity();
    } catch(eToggle) { safeLog(null, 'e', "catch " + String(eToggle)); }
  }}));

  var lp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
  lp.setMargins(0, this.dp(8), 0, this.dp(8));
  parent.addView(card, lp);
  return body;
};

FloatBallAppWM.prototype.buildButtonEditorPanelView = function() {
  var self = this;
  // # 状态管理：editingIndex (null=列表, -1=新增, >=0=编辑)
  if (this.state.editingButtonIndex === undefined) {
    this.state.editingButtonIndex = null;
  }

  // # 事务状态管理：确保操作的是临时副本
  if (!this.state.keepBtnEditorState || !this.state.tempButtons) {
      // 首次进入或非刷新状态，克隆一份配置作为临时状态
      var current = ConfigManager.loadButtons();
      this.state.tempButtons = JSON.parse(JSON.stringify(current));
  }
  this.state.keepBtnEditorState = false; // 重置标志

  var buttons = this.state.tempButtons;
  var isEditing = (this.state.editingButtonIndex !== null);
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getAnimalIslandTheme();
  this.applySettingsTheme(T, isDark, C, this.state.pendingUserCfg || this.config);

  // 颜色配置
  var bgColor = T.bg;
  var cardColor = T.card;
  var textColor = T.text;
  var subTextColor = T.sub;
  var dividerColor = T.stroke;
  var inputBgColor = T.card2;

  var panel = this.ui.createStyledPanel(this, 16);
  try { panel.setBackground(this.ui.createRoundDrawable(bgColor, this.dp(18))); } catch(ePanelBg) {}

  // --- 标题栏 ---
  var header = this.ui.createStyledHeader(this, 12);

  // # 列表滚动位置保持：用于在刷新按钮列表（排序/删除/切换启用）后，恢复到用户当前滚动位置
  var __btnEditorListScroll = null;

  // Title removed to avoid duplication with wrapper
  // Placeholder to push buttons to the right
  header.addView(this.ui.createSpacer(this));

  function setButtonEditorNotice(msg, kind) {
    try {
      self.state.buttonEditorNotice = {
        msg: String(msg || ""),
        kind: String(kind || "info")
      };
    } catch(eNotice0) { safeLog(null, 'e', "catch " + String(eNotice0)); }
  }

  function clearButtonEditorNotice() {
    try { self.state.buttonEditorNotice = null; } catch(eNotice1) {}
  }

  function addButtonEditorNotice(parent) {
    try {
      var n = self.state.buttonEditorNotice;
      if (!n || !n.msg) return null;
      var kind = String(n.kind || "info");
      var color = (kind === "error") ? C.error : (kind === "ok" ? T.primaryDeep : T.primaryDeep);
      var bg = (kind === "error") ? self.withAlpha(C.error, isDark ? 0.20 : 0.10) : self.withAlpha(T.primaryDeep, isDark ? 0.18 : 0.10);
      var stroke = (kind === "error") ? self.withAlpha(C.error, isDark ? 0.44 : 0.30) : self.withAlpha(T.primaryDeep, isDark ? 0.34 : 0.22);
      var box = new android.widget.TextView(context);
      box.setText(String(n.msg));
      box.setTextColor(color);
      box.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      box.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
      box.setGravity(android.view.Gravity.CENTER_VERTICAL);
      box.setBackground(self.ui.createStrokeDrawable(bg, stroke, self.dp(1), self.dp(14)));
      var lp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
      lp.setMargins(self.dp(2), self.dp(2), self.dp(2), self.dp(8));
      parent.addView(box, lp);
      return box;
    } catch(eNotice2) {
      safeLog(null, 'e', "catch " + String(eNotice2));
      return null;
    }
  }

  function updateInlineNotice(tv, msg, kind) {
    try {
      if (!tv) { setButtonEditorNotice(msg, kind); return; }
      var k = String(kind || "info");
      var color2 = (k === "error") ? C.error : (k === "ok" ? T.primaryDeep : T.primaryDeep);
      var bg2 = (k === "error") ? self.withAlpha(C.error, isDark ? 0.20 : 0.10) : self.withAlpha(T.primaryDeep, isDark ? 0.18 : 0.10);
      var stroke2 = (k === "error") ? self.withAlpha(C.error, isDark ? 0.44 : 0.30) : self.withAlpha(T.primaryDeep, isDark ? 0.34 : 0.22);
      tv.setText(String(msg || ""));
      tv.setTextColor(color2);
      tv.setBackground(self.ui.createStrokeDrawable(bg2, stroke2, self.dp(1), self.dp(14)));
      tv.setVisibility(android.view.View.VISIBLE);
      setButtonEditorNotice(msg, kind);
    } catch(eNotice3) { safeLog(null, 'e', "catch " + String(eNotice3)); }
  }

  // 刷新面板辅助函数
  function refreshPanel() {
    // # 列表滚动位置保持：刷新前记录当前 ScrollView 的 scrollY，避免操作后回到第一页
    try {
      if (__btnEditorListScroll) self.state.btnEditorListScrollY = __btnEditorListScroll.getScrollY();
     } catch(eSY) { safeLog(null, 'e', "catch " + String(eSY)); }

    // 标记为刷新操作，保留 tempButtons 状态
    self.state.keepBtnEditorState = true;
    // 关闭当前面板并重新打开
    self.showPanelAvoidBall("btn_editor");
  }

  // --- 列表模式 ---
  if (!isEditing) {
    // 头部布局优化：[ 提示文字 ... 新增 ]
    header.removeAllViews(); // 清除之前的 dummy

    // 提示文字 (左侧)
    var hintTv = new android.widget.TextView(context);
    hintTv.setText("共 " + buttons.length + " 个工具伙伴");
    hintTv.setTextColor(subTextColor);
    hintTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    header.addView(hintTv);

    // Spacer
    header.addView(self.ui.createSpacer(self));

    // 新增按钮 (右侧)
    var btnAdd = self.ui.createSolidButton(self, "添加", T.primary, T.onPrimary, function() {
        self.state.editingButtonIndex = -1;
        if (self.state.toolAppActive && self.pushToolAppPage) self.pushToolAppPage("btn_editor");
        else refreshPanel();
    });
    // 调整新增按钮样式，使其更紧凑
    btnAdd.setPadding(self.dp(12), self.dp(6), self.dp(12), self.dp(6));
    btnAdd.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    header.addView(btnAdd);

    panel.addView(header);
    addButtonEditorNotice(panel);

    // 暴露 Header 给 DragListener
    panel.setTag(header);

    var enabledCount = 0;
    var disabledCount = 0;
    try {
      for (var ci = 0; ci < buttons.length; ci++) {
        if (buttons[ci] && buttons[ci].enabled === false) disabledCount++;
        else enabledCount++;
      }
    } catch(eCnt) { safeLog(null, 'e', "catch " + String(eCnt)); }
    // 按钮管理搜索卡片：搜索输入与操作按钮收在同一张卡片里，避免顶部显得零散。
    var searchSurface = new android.widget.LinearLayout(context);
    searchSurface.setOrientation(android.widget.LinearLayout.VERTICAL);
    searchSurface.setPadding(self.dp(12), self.dp(10), self.dp(12), self.dp(10));
    searchSurface.setBackground(self.ui.createStrokeDrawable(T.card, self.withAlpha(T.stroke, isDark ? 0.30 : 0.46), self.dp(1), self.dp(18)));
    var searchRow = new android.widget.LinearLayout(context);
    searchRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    searchRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
    var searchInput = self.ui.createInputGroup(self, "寻找工具", self.state.buttonManagerQuery || "", false, "名称 / 类型 / 包名 / 命令");
    var searchInputLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    searchInputLp.weight = 1;
    searchRow.addView(searchInput.view, searchInputLp);
    var btnSearch = self.createButtonManagerActionChip("搜索", T.primaryDeep, self.withAlpha(T.primaryDeep, 0.32), function() {
      try { self.state.buttonManagerQuery = String(searchInput.getValue ? searchInput.getValue() : ""); } catch(eQ) { self.state.buttonManagerQuery = ""; }
      self.state.btnEditorListScrollY = 0;
      refreshPanel();
    });
    var btnSearchLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    btnSearchLp.leftMargin = self.dp(8);
    searchRow.addView(btnSearch, btnSearchLp);
    var btnClearSearch = self.createButtonManagerActionChip("重置", subTextColor, self.withAlpha(subTextColor, 0.24), function() {
      self.state.buttonManagerQuery = "";
      self.state.btnEditorListScrollY = 0;
      refreshPanel();
    });
    var btnClearLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    btnClearLp.leftMargin = self.dp(6);
    searchRow.addView(btnClearSearch, btnClearLp);
    searchSurface.addView(searchRow);
    var searchSurfaceLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    searchSurfaceLp.setMargins(self.dp(2), 0, self.dp(2), self.dp(8));
    panel.addView(searchSurface, searchSurfaceLp);

    var activeQuery = String(self.state.buttonManagerQuery || "");
    var visibleCount = 0;

    // 列表区域
    var scroll = new android.widget.ScrollView(context);
    __btnEditorListScroll = scroll; // # 列表滚动位置保持：让 refreshPanel 能拿到当前列表的滚动位置
    try { scroll.setVerticalScrollBarEnabled(false);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    var list = new android.widget.LinearLayout(context);
    list.setOrientation(android.widget.LinearLayout.VERTICAL);
    list.setPadding(0, self.dp(2), 0, self.dp(2));

    for (var i = 0; i < buttons.length; i++) {
      (function(idx) {
        var btnCfg = buttons[idx];
        if (!self.matchesButtonManagerQuery(btnCfg, activeQuery)) return;
        visibleCount++;

        // # 启用/禁用状态：禁用项在按钮页不显示，但在管理页需要标识出来
        var __enabled = true;
        try { __enabled = (btnCfg && btnCfg.enabled === false) ? false : true; } catch(eEn) { __enabled = true; }

        // 按钮管理列表卡片：上信息、下操作；避免图标、标题、排序、删除全部挤在同一条线上。
        var card = new android.widget.LinearLayout(context);
        card.setOrientation(android.widget.LinearLayout.VERTICAL);
        card.setGravity(android.view.Gravity.CENTER_VERTICAL);
        // 使用稍微不同的背景色以突出卡片
        var cardBgColor = cardColor;
        card.setBackground(self.ui.createStrokeDrawable(cardBgColor, self.withAlpha(T.stroke, isDark ? 0.28 : 0.45), self.dp(1), self.dp(18)));
        try { card.setElevation(self.dp(4));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

        var cardLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        cardLp.setMargins(self.dp(4), self.dp(4), self.dp(4), self.dp(4));
        card.setLayoutParams(cardLp);
        card.setPadding(self.dp(14), self.dp(10), self.dp(10), self.dp(10));

        var mainRow = new android.widget.LinearLayout(context);
        mainRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        mainRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
        mainRow.setPadding(0, 0, 0, self.dp(8));

        // # 视觉提示：禁用项整体变淡，方便一眼区分
        if (!__enabled) {
            try { card.setAlpha(0.55);  } catch(eA) { safeLog(null, 'e', "catch " + String(eA)); }
        } else {
            try { card.setAlpha(1.0);  } catch(eA2) { safeLog(null, 'e', "catch " + String(eA2)); }
        }

        // 点击编辑
        card.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {
                self.state.editingButtonIndex = idx;
                if (self.state.toolAppActive && self.pushToolAppPage) self.pushToolAppPage("btn_editor");
                else refreshPanel();
            }
        }));

        // # 左侧图标：按钮管理列表与按钮页一致显示其对应的 icon
        // # 说明：复用 resolveIconDrawable（支持 iconPath / app 图标 / shortcut 图标 / resId），避免重复实现与性能浪费
        var iconIv = new android.widget.ImageView(context);
        try {
            var dr0 = self.resolveIconDrawable(btnCfg);
            if (dr0) iconIv.setImageDrawable(dr0);
         } catch(eIcon0) { safeLog(null, 'e', "catch " + String(eIcon0)); }
        try { iconIv.setScaleType(android.widget.ImageView.ScaleType.CENTER_INSIDE);  } catch(eScale) { safeLog(null, 'e', "catch " + String(eScale)); }
        var iconSizeDp = 24;
        try { iconSizeDp = Number(self.config.PANEL_ICON_SIZE_DP || 24);  } catch(eSz) { safeLog(null, 'e', "catch " + String(eSz)); }
        // # 管理页行高更紧凑：限制 icon 尺寸，避免挤占文字区域
        if (!iconSizeDp || iconSizeDp < 18) iconSizeDp = 24;
        if (iconSizeDp > 32) iconSizeDp = 32;
        var iconLp = new android.widget.LinearLayout.LayoutParams(self.dp(iconSizeDp), self.dp(iconSizeDp));
        iconLp.rightMargin = self.dp(10);
        iconIv.setLayoutParams(iconLp);
        mainRow.addView(iconIv);

        // 中间文本信息
        var textContainer = new android.widget.LinearLayout(context);
        textContainer.setOrientation(android.widget.LinearLayout.VERTICAL);
        var textLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        textLp.weight = 1;
        textContainer.setLayoutParams(textLp);

        // 标题
        var infoTv = new android.widget.TextView(context);
        infoTv.setText(String(btnCfg.title || "无标题"));
        infoTv.setTextColor(textColor);
        infoTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
        infoTv.setTypeface(null, android.graphics.Typeface.BOLD);
        textContainer.addView(infoTv);

        // 类型/详情描述
        var detailTv = new android.widget.TextView(context);
        var desc = "Shell";
        if(btnCfg.type === "app") desc = "应用: " + (btnCfg.pkg||"");
        else if(btnCfg.type === "broadcast") desc = "广播: " + (btnCfg.action||"");
        else if(btnCfg.type === "shortcut") desc = "快捷方式";
        else desc = "命令: " + (btnCfg.cmd || "").substring(0, 20) + "...";
        detailTv.setText(desc);
        detailTv.setTextColor(subTextColor);
        detailTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
        detailTv.setSingleLine(true);
        detailTv.setEllipsize(android.text.TextUtils.TruncateAt.END);
        textContainer.addView(detailTv);

        mainRow.addView(textContainer);

        // 操作区：文字 chip 横排，替代孤立箭头，降低别扭感。
        var actions = new android.widget.LinearLayout(context);
        actions.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        actions.setGravity(android.view.Gravity.RIGHT | android.view.Gravity.CENTER_VERTICAL);
        actions.setPadding(self.dp(42), 0, 0, 0);

        var canUp = (idx > 0);
        var btnUp = self.createButtonManagerTextAction("上搬", canUp ? subTextColor : self.withAlpha(subTextColor, 0.25), canUp ? function() {
            var temp = buttons[idx];
            buttons[idx] = buttons[idx - 1];
            buttons[idx - 1] = temp;
            refreshPanel();
        } : null);
        try { btnUp.setEnabled(canUp); } catch(eUpEn) {}
        actions.addView(btnUp);

        var canDown = (idx < buttons.length - 1);
        var btnDown = self.createButtonManagerTextAction("下搬", canDown ? subTextColor : self.withAlpha(subTextColor, 0.25), canDown ? function() {
            var temp = buttons[idx];
            buttons[idx] = buttons[idx + 1];
            buttons[idx + 1] = temp;
            refreshPanel();
        } : null);
        try {
            var lpDown = new android.widget.LinearLayout.LayoutParams(android.view.ViewGroup.LayoutParams.WRAP_CONTENT, android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
            lpDown.leftMargin = self.dp(6);
            btnDown.setLayoutParams(lpDown);
            btnDown.setEnabled(canDown);
        } catch(eDownLp) {}
        actions.addView(btnDown);

        var btnToggle = self.createButtonManagerTextAction(__enabled ? "暂停" : "启用", __enabled ? self.withAlpha(subTextColor, 0.9) : self.withAlpha(C.success, 0.9), function() {
            try {
                btnCfg.enabled = (btnCfg.enabled === false) ? true : false;
                ConfigManager.saveButtons(buttons);
            } catch(eTg) { safeLog(null, 'e', "catch " + String(eTg)); }
            refreshPanel();
        });
        try {
            var lpTg = new android.widget.LinearLayout.LayoutParams(android.view.ViewGroup.LayoutParams.WRAP_CONTENT, android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
            lpTg.leftMargin = self.dp(6);
            btnToggle.setLayoutParams(lpTg);
        } catch(eLpTg) {}
        actions.addView(btnToggle);

        var btnDel = self.createButtonManagerTextAction("移除", self.withAlpha(C.danger, 0.85), function() {
            buttons.splice(idx, 1);
            refreshPanel();
        });
        try {
            var lpDel = new android.widget.LinearLayout.LayoutParams(android.view.ViewGroup.LayoutParams.WRAP_CONTENT, android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
            lpDel.leftMargin = self.dp(6);
            btnDel.setLayoutParams(lpDel);
        } catch(eLpDel) {}
        actions.addView(btnDel);

        card.addView(mainRow);
        card.addView(actions);
        list.addView(card);

      })(i);
    }

    // 空状态提示
    if (visibleCount === 0) {
        var emptyBox = new android.widget.LinearLayout(context);
        emptyBox.setOrientation(android.widget.LinearLayout.VERTICAL);
        emptyBox.setGravity(android.view.Gravity.CENTER);
        emptyBox.setPadding(0, self.dp(48), 0, self.dp(48));

        var emptyIcon = new android.widget.ImageView(context);
        emptyIcon.setImageResource(android.R.drawable.ic_menu_add);
        emptyIcon.setColorFilter(subTextColor);
        var eiLp = new android.widget.LinearLayout.LayoutParams(self.dp(48), self.dp(48));
        emptyIcon.setLayoutParams(eiLp);
        emptyBox.addView(emptyIcon);

        var emptyTv = new android.widget.TextView(context);
        emptyTv.setText(activeQuery ? "没有匹配的按钮，点清空查看全部" : "暂无按钮，点击右上角新增");
        emptyTv.setTextColor(subTextColor);
        emptyTv.setPadding(0, self.dp(16), 0, 0);
        emptyBox.addView(emptyTv);

        list.addView(emptyBox);
    }

    scroll.addView(list);
    // 列表页采用固定底栏：滚动区吃掉剩余高度，避免“取消更改/保存所有”被挤到屏幕外。
    var scrollLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 0);
    scrollLp.weight = 1;
    scroll.setLayoutParams(scrollLp);
    panel.addView(scroll);

    // # 列表滚动位置保持：刷新/返回列表后，恢复到上一次滚动位置（避免回到第一页）
    try {
        var _y = (self.state.btnEditorListScrollY !== undefined && self.state.btnEditorListScrollY !== null) ? Number(self.state.btnEditorListScrollY) : 0;
        if (_y > 0) {
            scroll.post(new java.lang.Runnable({
                run: function() {
                    try { scroll.scrollTo(0, _y);  } catch(eSY2) { safeLog(null, 'e', "catch " + String(eSY2)); }
                }
            }));
        }
     } catch(eSY3) { safeLog(null, 'e', "catch " + String(eSY3)); }

    // 底部按钮栏
    var bottomBar = new android.widget.LinearLayout(context);
    bottomBar.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    bottomBar.setGravity(android.view.Gravity.CENTER_VERTICAL);
    bottomBar.setPadding(self.dp(4), self.dp(8), self.dp(4), self.dp(8));
    bottomBar.setBackground(self.ui.createRoundDrawable(isDark ? C.bgDark : C.bgLight, self.dp(12)));

    var btnListCancel = self.ui.createFlatButton(self, "不改了", subTextColor, function() {
        self.state.tempButtons = null;
        clearButtonEditorNotice();
        self.hideAllPanels();
    });
    var btnListCancelLp = new android.widget.LinearLayout.LayoutParams(0, self.dp(44));
    btnListCancelLp.weight = 1;
    btnListCancelLp.rightMargin = self.dp(8);
    bottomBar.addView(btnListCancel, btnListCancelLp);

    var btnListSave = self.ui.createSolidButton(self, "保存布置", T.primary, T.onPrimary, function() {
        try {
            ConfigManager.saveButtons(buttons);
            self.panels.main = buttons;
            self.state.tempButtons = null;
            setButtonEditorNotice("保存成功，按钮页已更新", "ok");
            refreshPanel();
        } catch(e) { setButtonEditorNotice("保存失败: " + e, "error"); refreshPanel(); }
    });
    var btnListSaveLp = new android.widget.LinearLayout.LayoutParams(0, self.dp(44));
    btnListSaveLp.weight = 1;
    bottomBar.addView(btnListSave, btnListSaveLp);

    var listBottomLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    listBottomLp.setMargins(0, self.dp(6), 0, self.dp(12));
    panel.addView(bottomBar, listBottomLp);

  } else {
    // --- 编辑模式 ---
    // panel.addView(header); // Removed empty header
    panel.setTag(header); // 暴露 Header

    var editIdx = this.state.editingButtonIndex;
    var targetBtn = (editIdx === -1) ? { type: "shell", title: "", cmd: "", iconResId: 0 } : JSON.parse(JSON.stringify(buttons[editIdx]));

    var scroll = new android.widget.ScrollView(context);
    try { scroll.setVerticalScrollBarEnabled(false);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    var form = new android.widget.LinearLayout(context);
    form.setOrientation(android.widget.LinearLayout.VERTICAL);
    form.setPadding(self.dp(4), self.dp(4), self.dp(4), self.dp(18));

    var basicSectionBody = self.createButtonEditorCollapsibleSection(form, "基础信息", "按钮名称", true);

    // 1. 标题 (Title)
    var topArea = new android.widget.LinearLayout(context);
    topArea.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    topArea.setGravity(android.view.Gravity.TOP);

    // 标题输入
    var titleArea = new android.widget.LinearLayout(context);
    titleArea.setOrientation(android.widget.LinearLayout.VERTICAL);
    var titleLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    titleLp.weight = 1;
    // titleLp.rightMargin = self.dp(16); // No need for margin if no icon area
    titleArea.setLayoutParams(titleLp);

    var inputTitle = self.ui.createInputGroup(self, "按钮名字", targetBtn.title, false, "写在按钮上的名字");
    self.addButtonEditorField(titleArea, inputTitle.view);
    topArea.addView(titleArea);

    basicSectionBody.addView(topArea);

    var iconSectionBody = self.createButtonEditorCollapsibleSection(form, "图标外观", "图标和颜色", false);

    // 1.5 图标选择（文件路径 或 ShortX 内置图标 二选一）
    var iconSelectWrap = new android.widget.LinearLayout(context);
    iconSelectWrap.setOrientation(android.widget.LinearLayout.VERTICAL);
    iconSelectWrap.setPadding(0, self.dp(8), 0, self.dp(8));

    var iconSelectLabel = new android.widget.TextView(context);
    iconSelectLabel.setText("图标来源");
    iconSelectLabel.setTextColor(subTextColor);
    iconSelectLabel.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    iconSelectWrap.addView(iconSelectLabel);

    var iconRadioGroup = new android.widget.RadioGroup(context);
    iconRadioGroup.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    iconRadioGroup.setPadding(0, self.dp(4), 0, self.dp(8));

    var rbIconFile = new android.widget.RadioButton(context);
    rbIconFile.setText("本地图片\nPNG/JPG 绝对路径");
    rbIconFile.setTextColor(textColor);
    rbIconFile.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    rbIconFile.setTag("file");
    rbIconFile.setPadding(self.dp(10), self.dp(8), self.dp(10), self.dp(8));
    try { rbIconFile.setButtonDrawable(null);  } catch(eRbFileStyle0) { safeLog(null, 'e', "catch " + String(eRbFileStyle0)); }

    var rbIconShortX = new android.widget.RadioButton(context);
    rbIconShortX.setText("ShortX 内置\n可点选图标 + 调色");
    rbIconShortX.setTextColor(textColor);
    rbIconShortX.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    rbIconShortX.setTag("shortx");
    rbIconShortX.setPadding(self.dp(10), self.dp(8), self.dp(10), self.dp(8));
    try { rbIconShortX.setButtonDrawable(null);  } catch(eRbShortStyle0) { safeLog(null, 'e', "catch " + String(eRbShortStyle0)); }

    var iconSourceOptionLp1 = new android.widget.RadioGroup.LayoutParams(0, android.widget.RadioGroup.LayoutParams.WRAP_CONTENT);
    iconSourceOptionLp1.weight = 1;
    iconSourceOptionLp1.rightMargin = self.dp(6);
    var iconSourceOptionLp2 = new android.widget.RadioGroup.LayoutParams(0, android.widget.RadioGroup.LayoutParams.WRAP_CONTENT);
    iconSourceOptionLp2.weight = 1;
    iconSourceOptionLp2.leftMargin = self.dp(6);
    iconRadioGroup.addView(rbIconFile, iconSourceOptionLp1);
    iconRadioGroup.addView(rbIconShortX, iconSourceOptionLp2);
    iconSelectWrap.addView(iconRadioGroup);
    iconSectionBody.addView(iconSelectWrap);

    // 1.5a 图标路径（文件方式）
    var inputIconPath = self.ui.createInputGroup(self, "图标路径 (绝对地址)", targetBtn.iconPath, false, "支持 PNG/JPG 绝对路径，自动安全加载");
    iconSectionBody.addView(inputIconPath.view);

    // 1.5b ShortX 内置图标选择（取消手动名称输入，改为预览 + 图标库选择）
    var normalizedInitShortX = self.normalizeShortXIconName(targetBtn.iconResName, false);
    var currentShortXIconName = normalizedInitShortX ? String(normalizedInitShortX) : "";

    var shortxPickerState = {
        expanded: false,
        lastQuery: "",
        iconList: null,
        previewIv: null,
        previewNameTv: null,
        statusTv: null,
        searchEt: null,
        grid: null,
        gridScroll: null,
        pickerWrap: null,
        toggleBtn: null,
        clearBtn: null,
        pageSize: 0,
        currentPage: 0,
        pageInfoTv: null,
        prevBtn: null,
        nextBtn: null,
        pageCols: 0,
        pageRows: 0,
        cellMinWidthDp: 72,
        cellWidthPx: 0,
        cellHeightDp: 92,
        cellMarginDp: 4,
        lastMeasuredGridWidth: 0,
        lastMeasuredGridHeight: 0
    };

    var tintPalettePanelKey = "button_editor_icon_tint_palette";
    var tintSavedState = null;
    try { tintSavedState = self.loadPanelState(tintPalettePanelKey); } catch(eTintState0) { tintSavedState = null; }
    var tintPaletteState = {
        expanded: false,
        recentColors: [],
        syncing: false,
        currentBaseRgbHex: "",
        wrap: null,
        body: null,
        toggleBtn: null,
        previewDot: null,
        previewTextTv: null,
        alphaSeek: null,
        alphaValueTv: null,
        redSeek: null,
        greenSeek: null,
        blueSeek: null,
        redValueTv: null,
        greenValueTv: null,
        blueValueTv: null,
        recentGrid: null,
        recentEmptyTv: null,
        commonGrid: null,
        commonCols: 0,
        commonCellWidthPx: 0,
        commonMinCellWidthDp: 72,
        commonLastMeasuredWidth: 0
    };

    function getShortXPickerClosedLabel() {
        return "展开图标库";
    }

    function getShortXPickerOpenedLabel() {
        return "收起图标库";
    }

    function getTintPaletteClosedLabel() {
        return "展开调色板";
    }

    function getTintPaletteOpenedLabel() {
        return "收起调色板";
    }





    function getThemeTintHex() {
        try {
            return _th_hex(self.getMonetAccentForBall()).replace("0x", "#").toUpperCase();
        } catch(eThemeHex0) {
            return "#FF6366F1";
        }
    }

    function saveTintPaletteState() {
        try {
            self.savePanelState(tintPalettePanelKey, {
                expanded: !!tintPaletteState.expanded,
                recentColors: tintPaletteState.recentColors || []
            });
         } catch(eTintSave0) { safeLog(null, 'e', "catch " + String(eTintSave0)); }
    }

    function pushRecentTintColor(hex) {
        var normalized = normalizeTintColorValue(hex, false);
        if (!normalized) return;
        var next = [normalized];
        var oldList = tintPaletteState.recentColors || [];
        var i;
        for (i = 0; i < oldList.length; i++) {
            var item = normalizeTintColorValue(oldList[i], false);
            if (!item || item === normalized) continue;
            next.push(item);
            if (next.length >= 5) break;
        }
        tintPaletteState.recentColors = next;
        renderRecentTintGrid();
        saveTintPaletteState();
    }

    function scrollShortXGridToTop() {
        try {
            if (shortxPickerState.gridScroll) {
                shortxPickerState.gridScroll.post(new java.lang.Runnable({
                    run: function() {
                        try { shortxPickerState.gridScroll.fullScroll(android.view.View.FOCUS_UP);  } catch(eScroll0) { safeLog(null, 'e', "catch " + String(eScroll0)); }
                        try { shortxPickerState.gridScroll.scrollTo(0, 0);  } catch(eScroll1) { safeLog(null, 'e', "catch " + String(eScroll1)); }
                    }
                }));
            }
         } catch(eScrollWrap) { safeLog(null, 'e', "catch " + String(eScrollWrap)); }
    }

    function resolveShortXPickerPageSize() {
        var fallbackWidth = self.dp(320);
        var fallbackHeight = self.dp(520);
        var rawWidth = 0;
        var rawHeight = 0;
        try { if (shortxPickerState.gridScroll) rawWidth = Number(shortxPickerState.gridScroll.getWidth() || 0);  } catch(eW0) { safeLog(null, 'e', "catch " + String(eW0)); }
        try { if (shortxPickerState.gridScroll) rawHeight = Number(shortxPickerState.gridScroll.getHeight() || 0);  } catch(eH0) { safeLog(null, 'e', "catch " + String(eH0)); }
        if (rawWidth <= 0) rawWidth = fallbackWidth;
        if (rawHeight <= 0) rawHeight = fallbackHeight;
        var marginPx = self.dp(Number(shortxPickerState.cellMarginDp || 4));
        var minCellWidthPx = self.dp(Number(shortxPickerState.cellMinWidthDp || 72));
        var cellOuterMinWidth = minCellWidthPx + marginPx * 2;
        if (cellOuterMinWidth <= 0) cellOuterMinWidth = self.dp(80);
        var innerWidth = rawWidth - self.dp(8);
        if (innerWidth <= 0) innerWidth = rawWidth;
        var cols = Math.max(1, Math.floor(innerWidth / cellOuterMinWidth));
        var cellWidthPx = Math.floor(innerWidth / cols) - marginPx * 2;
        if (cellWidthPx < self.dp(56)) cellWidthPx = self.dp(56);
        var cellOuterHeight = self.dp(Number(shortxPickerState.cellHeightDp || 92)) + marginPx * 2;
        if (cellOuterHeight <= 0) cellOuterHeight = self.dp(100);
        var rows = Math.max(1, Math.floor(rawHeight / cellOuterHeight));
        var size = Math.max(cols, rows * cols);
        shortxPickerState.pageCols = cols;
        shortxPickerState.pageRows = rows;
        shortxPickerState.cellWidthPx = cellWidthPx;
        shortxPickerState.lastMeasuredGridWidth = rawWidth;
        shortxPickerState.lastMeasuredGridHeight = rawHeight;
        shortxPickerState.pageSize = size;
        return size;
    }

    function setShortXPickerExpanded(expanded, doRender) {
        shortxPickerState.expanded = !!expanded;
        if (shortxPickerState.pickerWrap) {
            shortxPickerState.pickerWrap.setVisibility(shortxPickerState.expanded ? android.view.View.VISIBLE : android.view.View.GONE);
        }
        try {
            if (shortxPickerState.toggleBtn) shortxPickerState.toggleBtn.setText(shortxPickerState.expanded ? getShortXPickerOpenedLabel() : getShortXPickerClosedLabel());
         } catch(eToggleTxt) { safeLog(null, 'e', "catch " + String(eToggleTxt)); }
        if (shortxPickerState.expanded && doRender !== false) {
            resolveShortXPickerPageSize();
            renderShortXIconGrid();
        }
    }

    var shortxQuickRow = new android.widget.LinearLayout(context);
    shortxQuickRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    shortxQuickRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
    shortxQuickRow.setPadding(0, 0, 0, self.dp(8));
    iconSectionBody.addView(shortxQuickRow);

    var shortxPreviewCard = new android.widget.LinearLayout(context);
    shortxPreviewCard.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    shortxPreviewCard.setGravity(android.view.Gravity.CENTER_VERTICAL);
    shortxPreviewCard.setPadding(self.dp(10), self.dp(8), self.dp(10), self.dp(8));
    shortxPreviewCard.setBackground(self.ui.createRoundDrawable(self.withAlpha(C.primary, 0.08), self.dp(12)));
    var shortxPreviewLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    shortxPreviewLp.weight = 1;
    shortxQuickRow.addView(shortxPreviewCard, shortxPreviewLp);

    var shortxPreviewIv = new android.widget.ImageView(context);
    var shortxPreviewIvLp = new android.widget.LinearLayout.LayoutParams(self.dp(34), self.dp(34));
    shortxPreviewIvLp.rightMargin = self.dp(10);
    shortxPreviewIv.setLayoutParams(shortxPreviewIvLp);
    shortxPreviewCard.addView(shortxPreviewIv);
    shortxPickerState.previewIv = shortxPreviewIv;

    var shortxPreviewNameTv = new android.widget.TextView(context);
    shortxPreviewNameTv.setTextColor(textColor);
    shortxPreviewNameTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    try { shortxPreviewNameTv.setSingleLine(true); shortxPreviewNameTv.setEllipsize(android.text.TextUtils.TruncateAt.END);  } catch(eEL0) { safeLog(null, 'e', "catch " + String(eEL0)); }
    shortxPreviewCard.addView(shortxPreviewNameTv, new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1));
    shortxPickerState.previewNameTv = shortxPreviewNameTv;

    var shortxBtnGap = new android.view.View(context);
    shortxBtnGap.setLayoutParams(new android.widget.LinearLayout.LayoutParams(self.dp(8), 1));
    shortxQuickRow.addView(shortxBtnGap);

    var btnBrowseShortXIcon = self.ui.createFlatButton(self, "选择图标", C.primary, function() {
        self.touchActivity();
        self.showShortXIconPickerPopup({
            currentName: currentShortXIconName,
            currentTint: (inputShortXIconTint && inputShortXIconTint.input) ? String(inputShortXIconTint.input.getText() || "") : "",
            onSelect: function(name) {
                currentShortXIconName = name;
                updateShortXIconPreview();
                try { if (shortxPickerState.toggleBtn) shortxPickerState.toggleBtn.setText(name || "\u9009\u62e9\u56fe\u6807");  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
                // # 选中 ShortX 图标后自动切换到 ShortX 图标模式，避免保存时走 file 分支导致颜色丢失
                try { rbIconShortX.setChecked(true);  } catch(eRb) { safeLog(null, 'e', "catch " + String(eRb)); }
                try { updateIconInputs("shortx");  } catch(eUp) { safeLog(null, 'e', "catch " + String(eUp)); }
            }
        });
    });
    shortxPickerState.toggleBtn = btnBrowseShortXIcon;
    shortxQuickRow.addView(btnBrowseShortXIcon);

    var shortxBtnGap2 = new android.view.View(context);
    shortxBtnGap2.setLayoutParams(new android.widget.LinearLayout.LayoutParams(self.dp(8), 1));
    shortxQuickRow.addView(shortxBtnGap2);

    function clearShortXIconOnly() {
        currentShortXIconName = "";
        updateShortXIconPreview();
    }

    var btnClearShortXIcon = self.ui.createFlatButton(self, "\u6e05\u7a7a", subTextColor, function() {
        self.touchActivity();
        clearShortXIconOnly();
    });
    shortxPickerState.clearBtn = btnClearShortXIcon;
    shortxQuickRow.addView(btnClearShortXIcon);

    var shortxBtnGap3 = new android.view.View(context);
    shortxBtnGap3.setLayoutParams(new android.widget.LinearLayout.LayoutParams(self.dp(8), 1));
    shortxQuickRow.addView(shortxBtnGap3);

    var btnColorShortX = self.ui.createFlatButton(self, "\u989c\u8272", C.primary, function() {
        self.touchActivity();
        var currentTint = currentShortXIconTint || "";
        self.showColorPickerPopup({
            currentColor: currentTint,
            currentIconName: currentShortXIconName,
            onSelect: function(colorHex) {
                try {
                    applyTintSelectionFromPopup(colorHex);
                } catch(eSelect) {
                    safeLog(self.L, 'e', "colorPicker callback err=" + String(eSelect));
                }
            }
        });
    });
    shortxQuickRow.addView(btnColorShortX);

    var shortxPickerWrap = new android.widget.LinearLayout(context);
    shortxPickerWrap.setOrientation(android.widget.LinearLayout.VERTICAL);
    shortxPickerWrap.setPadding(0, 0, 0, self.dp(8));
    shortxPickerWrap.setVisibility(android.view.View.GONE);
    shortxPickerWrap.setBackground(self.ui.createRoundDrawable(self.withAlpha(cardColor, 0.92), self.dp(14)));
    // [Popup] ShortX icon picker moved to showShortXIconPickerPopup() — no longer embedded
    // form.addView(shortxPickerWrap);
    shortxPickerState.pickerWrap = shortxPickerWrap;

    var shortxPickerHead = new android.widget.TextView(context);
    shortxPickerHead.setText("ShortX 图标库（分页模式，按宽度自动排列，支持搜索 / 分类 / 点击即选中）");
    shortxPickerHead.setTextColor(subTextColor);
    shortxPickerHead.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    shortxPickerHead.setPadding(self.dp(12), self.dp(10), self.dp(12), self.dp(6));
    shortxPickerWrap.addView(shortxPickerHead);

    var shortxSearchEt = new android.widget.EditText(context);
    shortxSearchEt.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
    shortxSearchEt.setTextColor(textColor);
    try { shortxSearchEt.setHintTextColor(subTextColor);  } catch(eHintColor) { safeLog(null, 'e', "catch " + String(eHintColor)); }
    shortxSearchEt.setHint("搜索图标名，如 share / home / save");
    shortxSearchEt.setSingleLine(true);
    shortxSearchEt.setPadding(self.dp(10), self.dp(8), self.dp(10), self.dp(8));
    shortxSearchEt.setBackground(self.ui.createStrokeDrawable(isDark ? self.ui.colors.inputBgDark : self.ui.colors.inputBgLight, isDark ? self.ui.colors.dividerDark : self.ui.colors.dividerLight, self.dp(1), self.dp(10)));
    var shortxSearchLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    shortxSearchLp.setMargins(self.dp(12), 0, self.dp(12), self.dp(6));
    shortxPickerWrap.addView(shortxSearchEt, shortxSearchLp);
    shortxPickerState.searchEt = shortxSearchEt;

    var shortxStatusTv = new android.widget.TextView(context);
    shortxStatusTv.setTextColor(subTextColor);
    shortxStatusTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
    shortxStatusTv.setPadding(self.dp(12), 0, self.dp(12), self.dp(6));
    shortxPickerWrap.addView(shortxStatusTv);
    shortxPickerState.statusTv = shortxStatusTv;

    var shortxPageBar = new android.widget.LinearLayout(context);
    shortxPageBar.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    shortxPageBar.setGravity(android.view.Gravity.CENTER_VERTICAL);
    shortxPageBar.setPadding(self.dp(8), 0, self.dp(8), self.dp(6));
    shortxPickerWrap.addView(shortxPageBar);

    function goShortXPage(delta) {
        shortxPickerState.currentPage = Math.max(0, Number(shortxPickerState.currentPage || 0) + Number(delta || 0));
        scrollShortXGridToTop();
        renderShortXIconGrid();
    }

    var btnPrevPage = self.ui.createFlatButton(self, "\u4e0a\u4e00\u9875", subTextColor, function() {
        self.touchActivity();
        goShortXPage(-1);
    });
    shortxPageBar.addView(btnPrevPage);
    shortxPickerState.prevBtn = btnPrevPage;

    var shortxPageInfo = new android.widget.TextView(context);
    shortxPageInfo.setTextColor(textColor);
    shortxPageInfo.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    shortxPageInfo.setGravity(android.view.Gravity.CENTER);
    shortxPageInfo.setPadding(self.dp(12), 0, self.dp(12), 0);
    shortxPageBar.addView(shortxPageInfo, new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1));
    shortxPickerState.pageInfoTv = shortxPageInfo;

    var btnNextPage = self.ui.createFlatButton(self, "\u4e0b\u4e00\u9875", C.primary, function() {
        self.touchActivity();
        goShortXPage(1);
    });
    shortxPageBar.addView(btnNextPage);
    shortxPickerState.nextBtn = btnNextPage;

    var shortxGridScroll = new android.widget.ScrollView(context);
    try { shortxGridScroll.setVerticalScrollBarEnabled(false);  } catch(eSG0) { safeLog(null, 'e', "catch " + String(eSG0)); }
    try { shortxGridScroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);  } catch(eSG1) { safeLog(null, 'e', "catch " + String(eSG1)); }
    var shortxGridScrollLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, self.dp(520));
    shortxGridScrollLp.setMargins(self.dp(8), 0, self.dp(8), self.dp(8));
    shortxPickerWrap.addView(shortxGridScroll, shortxGridScrollLp);
    shortxPickerState.gridScroll = shortxGridScroll;

    var shortxGrid = new android.widget.GridLayout(context);
    try { shortxGrid.setColumnCount(Math.max(1, Number(shortxPickerState.pageCols || 1)));  } catch(eGC0) { safeLog(null, 'e', "catch " + String(eGC0)); }
    shortxGrid.setPadding(self.dp(4), self.dp(4), self.dp(4), self.dp(4));
    shortxGridScroll.addView(shortxGrid);
    shortxPickerState.grid = shortxGrid;

    function updateShortXIconPreview() {
        try {
            var normalizedShort = currentShortXIconName ? self.normalizeShortXIconName(currentShortXIconName, false) : "";
            if (shortxPickerState.previewNameTv) {
                shortxPickerState.previewNameTv.setText(normalizedShort ? ("\u5df2\u9009: " + normalizedShort) : "\u672a\u9009\u62e9\u56fe\u6807");
            }
            if (shortxPickerState.previewIv) {
                var tintHex = currentShortXIconTint || "";
                var drPreview = normalizedShort ? self.resolveShortXDrawable(normalizedShort, tintHex) : null;
                if (drPreview) {
                    shortxPickerState.previewIv.setImageDrawable(drPreview);
                    try { shortxPickerState.previewIv.setAlpha(1.0);  } catch(eA1) { safeLog(null, 'e', "catch " + String(eA1)); }
                } else {
                    shortxPickerState.previewIv.setImageDrawable(null);
                    try { shortxPickerState.previewIv.setAlpha(0.35);  } catch(eA2) { safeLog(null, 'e', "catch " + String(eA2)); }
                }
            }
        } catch(ePreview) {
            safeLog(self.L, 'e', "updateShortXIconPreview err=" + String(ePreview));
        }
    }

    function renderShortXIconGrid() {
        try {
            if (!shortxPickerState.grid) return;
            shortxPickerState.grid.removeAllViews();
            try { shortxPickerState.grid.setColumnCount(Math.max(1, Number(shortxPickerState.pageCols || 1)));  } catch(eColSet) { safeLog(null, 'e', "catch " + String(eColSet)); }
            var icons = self.getShortXIconCatalog();
            shortxPickerState.iconList = icons;
            var query = "";
            try { query = String(shortxPickerState.searchEt.getText() || "").replace(/^\s+|\s+$/g, "").toLowerCase();  } catch(eQ0) { safeLog(null, 'e', "catch " + String(eQ0)); }
            shortxPickerState.lastQuery = query;
            var filtered = [];
            var totalMatch = 0;
            var i;
            for (i = 0; i < icons.length; i++) {
                var item = icons[i];
                var n1 = String(item.shortName || "").toLowerCase();
                var n2 = String(item.name || "").toLowerCase();
                if (!query || n1.indexOf(query) >= 0 || n2.indexOf(query) >= 0) {
                    totalMatch++;
                    filtered.push(item);
                }
            }
            var pageSize = resolveShortXPickerPageSize();
            if (pageSize < 1) pageSize = 20;
            var totalPages = filtered.length > 0 ? Math.ceil(filtered.length / pageSize) : 1;
            if (shortxPickerState.currentPage >= totalPages) shortxPickerState.currentPage = totalPages - 1;
            if (shortxPickerState.currentPage < 0) shortxPickerState.currentPage = 0;
            var start = shortxPickerState.currentPage * pageSize;
            var end = Math.min(start + pageSize, filtered.length);
            var result = filtered.slice(start, end);
            if (shortxPickerState.statusTv) {
                if (!icons || icons.length === 0) {
                    var errMsg = self._shortxIconCatalogError ? String(self._shortxIconCatalogError) : "未知原因";
                    shortxPickerState.statusTv.setText("ShortX 图标反射失败/为空：" + errMsg);
                } else if (!query) {
                    shortxPickerState.statusTv.setText("\u5171 " + filtered.length + " \u4e2a\uff0c\u6309\u5bbd\u5ea6\u81ea\u52a8\u6392\u6210 " + shortxPickerState.pageCols + " \u5217\uff0c\u6bcf\u9875 " + pageSize + " \u4e2a\uff08" + shortxPickerState.pageRows + " \u884c\uff09\uff0c\u5f53\u524d\u7b2c " + (shortxPickerState.currentPage + 1) + "/" + totalPages + " \u9875\u3002");
                } else {
                    shortxPickerState.statusTv.setText("\u641c\u7d22 [" + query + "] \u547d\u4e2d " + totalMatch + " \u4e2a\uff0c\u5f53\u524d\u6309\u5bbd\u5ea6\u81ea\u52a8\u6392\u6210 " + shortxPickerState.pageCols + " \u5217\uff0c\u6bcf\u9875 " + pageSize + " \u4e2a\uff0c\u5f53\u524d\u7b2c " + (shortxPickerState.currentPage + 1) + "/" + totalPages + " \u9875\u3002");
                }
            }
            if (shortxPickerState.pageInfoTv) {
                shortxPickerState.pageInfoTv.setText((filtered.length > 0 ? (shortxPickerState.currentPage + 1) : 0) + " / " + totalPages + " \u00b7 " + filtered.length + "\u9879 \u00b7 " + shortxPickerState.pageCols + "\u5217 \u00b7 \u6bcf\u9875" + pageSize + "\u4e2a");
            }
            try { shortxPickerState.prevBtn.setEnabled(shortxPickerState.currentPage > 0);  } catch(ePrev) { safeLog(null, 'e', "catch " + String(ePrev)); }
            try { shortxPickerState.nextBtn.setEnabled(shortxPickerState.currentPage < totalPages - 1);  } catch(eNext) { safeLog(null, 'e', "catch " + String(eNext)); }
            var tintHex = currentShortXIconTint || "";
            var selectedShort = currentShortXIconName ? self.normalizeShortXIconName(currentShortXIconName, false) : "";
            for (i = 0; i < result.length; i++) {
                (function(entry) {
                    var cell = new android.widget.LinearLayout(context);
                    cell.setOrientation(android.widget.LinearLayout.VERTICAL);
                    cell.setGravity(android.view.Gravity.CENTER_HORIZONTAL);
                    cell.setPadding(self.dp(8), self.dp(8), self.dp(8), self.dp(8));
                    var lp = new android.widget.GridLayout.LayoutParams();
                    lp.width = Number(shortxPickerState.cellWidthPx || self.dp(Number(shortxPickerState.cellMinWidthDp || 72)));
                    lp.height = self.dp(Number(shortxPickerState.cellHeightDp || 92));
                    lp.setMargins(self.dp(Number(shortxPickerState.cellMarginDp || 4)), self.dp(Number(shortxPickerState.cellMarginDp || 4)), self.dp(Number(shortxPickerState.cellMarginDp || 4)), self.dp(Number(shortxPickerState.cellMarginDp || 4)));
                    cell.setLayoutParams(lp);
                    var isSelected = selectedShort && selectedShort === String(entry.shortName);
                    cell.setBackground(self.ui.createRoundDrawable(self.withAlpha(isSelected ? C.primary : cardColor, isSelected ? 0.18 : 0.96), self.dp(12)));

                    var iv = new android.widget.ImageView(context);
                    var ivLp = new android.widget.LinearLayout.LayoutParams(self.dp(24), self.dp(24));
                    ivLp.bottomMargin = self.dp(6);
                    iv.setLayoutParams(ivLp);
                    try {
                        var drIcon = self.resolveShortXDrawable(entry.name, tintHex);
                        if (drIcon) iv.setImageDrawable(drIcon);
                     } catch(eIconDraw) { safeLog(null, 'e', "catch " + String(eIconDraw)); }
                    cell.addView(iv);

                    var tv = new android.widget.TextView(context);
                    tv.setText(String(entry.shortName));
                    tv.setTextColor(isSelected ? C.primary : textColor);
                    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 10);
                    tv.setGravity(android.view.Gravity.CENTER);
                    try { tv.setLines(2); tv.setEllipsize(android.text.TextUtils.TruncateAt.END);  } catch(eLines0) { safeLog(null, 'e', "catch " + String(eLines0)); }
                    cell.addView(tv, new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT));

                    cell.setClickable(true);
                    cell.setOnClickListener(new android.view.View.OnClickListener({
                        onClick: function() {
                            self.touchActivity();
                            currentShortXIconName = String(entry.shortName || "");
                            updateShortXIconPreview();
                            scrollShortXGridToTop();
                            setShortXPickerExpanded(false, false);
                        }
                    }));
                    shortxPickerState.grid.addView(cell);
                })(result[i]);
            }
        } catch(eRenderIcons) {
            try { if (shortxPickerState.statusTv) shortxPickerState.statusTv.setText("图标库加载失败: " + eRenderIcons);  } catch(eStatus0) { safeLog(null, 'e', "catch " + String(eStatus0)); }
        }
    }

    try {
        shortxSearchEt.addTextChangedListener(new JavaAdapter(android.text.TextWatcher, {
            afterTextChanged: function(s) {
                shortxPickerState.currentPage = 0;
                scrollShortXGridToTop();
                renderShortXIconGrid();
            },
            beforeTextChanged: function(s, st, c, a) {},
            onTextChanged: function(s, st, b, c) {}
        }));
     } catch(eTwIcon0) { safeLog(null, 'e', "catch " + String(eTwIcon0)); }

    try {
        shortxGridScroll.getViewTreeObserver().addOnGlobalLayoutListener(new android.view.ViewTreeObserver.OnGlobalLayoutListener({
            onGlobalLayout: function() {
                if (!shortxPickerState.expanded) return;
                var oldSize = Number(shortxPickerState.pageSize || 0);
                var oldCols = Number(shortxPickerState.pageCols || 0);
                var oldWidth = Number(shortxPickerState.lastMeasuredGridWidth || 0);
                var newSize = resolveShortXPickerPageSize();
                if (newSize > 0 && (newSize !== oldSize || oldCols !== Number(shortxPickerState.pageCols || 0) || oldWidth !== Number(shortxPickerState.lastMeasuredGridWidth || 0))) {
                    shortxPickerState.currentPage = 0;
                    renderShortXIconGrid();
                }
            }
        }));
     } catch(eGridLayoutWatch) { safeLog(null, 'e', "catch " + String(eGridLayoutWatch)); }

    // # ShortX 图标颜色（留空跟随主题）
    var defaultTint = targetBtn.iconTint ? String(targetBtn.iconTint) : "";
    var currentShortXIconTint = defaultTint;
    var inputShortXIconTint = self.ui.createInputGroup(self, "图标颜色 (留空 = 跟随主题色)", defaultTint, false, "支持 #RRGGBB / #AARRGGBB；也可点右侧“颜色”选择");
    iconSectionBody.addView(inputShortXIconTint.view);
    // # 避免 Rhino 闭包问题：将输入框引用存储到 self.state，供颜色选择器回调使用
    self.state._btnEditorTintInput = inputShortXIconTint;

    function updateTintPaletteToggleText() {
        try {
            if (tintPaletteState.toggleBtn) tintPaletteState.toggleBtn.setText(tintPaletteState.expanded ? getTintPaletteOpenedLabel() : getTintPaletteClosedLabel());
         } catch(eTintToggle0) { safeLog(null, 'e', "catch " + String(eTintToggle0)); }
    }

    function setTintPaletteExpanded(expanded) {
        tintPaletteState.expanded = !!expanded;
        try {
            if (tintPaletteState.body) tintPaletteState.body.setVisibility(tintPaletteState.expanded ? android.view.View.VISIBLE : android.view.View.GONE);
         } catch(eTintBody0) { safeLog(null, 'e', "catch " + String(eTintBody0)); }
        updateTintPaletteToggleText();
        saveTintPaletteState();
    }

    function setTintSeekProgress(progress) {
        try {
            if (tintPaletteState.alphaSeek) tintPaletteState.alphaSeek.setProgress(Number(progress || 0));
         } catch(eTintSeek0) { safeLog(null, 'e', "catch " + String(eTintSeek0)); }
    }

    function setRgbSeekProgress(which, value) {
        var v = Number(value || 0);
        if (isNaN(v) || v < 0) v = 0;
        if (v > 255) v = 255;
        try {
            if (which === "r" && tintPaletteState.redSeek) tintPaletteState.redSeek.setProgress(v);
            if (which === "g" && tintPaletteState.greenSeek) tintPaletteState.greenSeek.setProgress(v);
            if (which === "b" && tintPaletteState.blueSeek) tintPaletteState.blueSeek.setProgress(v);
         } catch(eTintRgbSeek0) { safeLog(null, 'e', "catch " + String(eTintRgbSeek0)); }
    }

    function updateTintAlphaLabel(alphaByte) {
        var a = Number(alphaByte || 0);
        if (isNaN(a) || a < 0) a = 0;
        if (a > 255) a = 255;
        var pct = Math.round((a / 255) * 100);
        try {
            if (tintPaletteState.alphaValueTv) tintPaletteState.alphaValueTv.setText("透明度 " + pct + "%（" + a + "/255）");
         } catch(eTintAlpha0) { safeLog(null, 'e', "catch " + String(eTintAlpha0)); }
    }

    function updateRgbValueLabel(which, value) {
        var v = Number(value || 0);
        if (isNaN(v) || v < 0) v = 0;
        if (v > 255) v = 255;
        try {
            if (which === "r" && tintPaletteState.redValueTv) tintPaletteState.redValueTv.setText("R " + v);
            if (which === "g" && tintPaletteState.greenValueTv) tintPaletteState.greenValueTv.setText("G " + v);
            if (which === "b" && tintPaletteState.blueValueTv) tintPaletteState.blueValueTv.setText("B " + v);
         } catch(eTintRgbLbl0) { safeLog(null, 'e', "catch " + String(eTintRgbLbl0)); }
    }

    function updateRgbLabelsFromHex(rgbHex) {
        var rgb = String(rgbHex || "#FFFFFF").toUpperCase();
        if (rgb.charAt(0) !== "#") rgb = "#" + rgb;
        if (!/^#[0-9A-F]{6}$/.test(rgb)) rgb = "#FFFFFF";
        updateRgbValueLabel("r", parseInt(rgb.substring(1, 3), 16));
        updateRgbValueLabel("g", parseInt(rgb.substring(3, 5), 16));
        updateRgbValueLabel("b", parseInt(rgb.substring(5, 7), 16));
    }

    function updateTintPalettePreviewText(normalizedHex, isThemeFollow, invalidRaw) {
        var effectiveHex = normalizedHex || getThemeTintHex();
        var colorInt = 0;
        try { colorInt = android.graphics.Color.parseColor(effectiveHex); } catch(eColor0) { colorInt = C.primary; }
        try {
            if (tintPaletteState.previewDot) tintPaletteState.previewDot.setBackground(self.ui.createRoundDrawable(colorInt, self.dp(12)));
         } catch(eTintPrevDot0) { safeLog(null, 'e', "catch " + String(eTintPrevDot0)); }
        var msg = "";
        if (invalidRaw) {
            msg = "当前：" + invalidRaw + "（格式无效）";
        } else if (isThemeFollow) {
            msg = "当前：跟随主题（" + effectiveHex + "）";
        } else {
            var pct = Math.round((extractTintAlphaByte(effectiveHex) / 255) * 100);
            msg = "当前：" + effectiveHex + " · 透明度 " + pct + "%";
        }
        try {
            if (tintPaletteState.previewTextTv) tintPaletteState.previewTextTv.setText(msg);
         } catch(eTintPrevTv0) { safeLog(null, 'e', "catch " + String(eTintPrevTv0)); }
    }

    function syncTintUiFromInput(pushRecent) {
        var raw = "";
        try { raw = String(inputShortXIconTint.getValue() || "").replace(/^\s+|\s+$/g, "");  } catch(eTintRaw0) { safeLog(null, 'e', "catch " + String(eTintRaw0)); }
        var normalized = normalizeTintColorValue(raw, true);
        if (raw && !normalized) {
            currentShortXIconTint = raw;
            updateTintAlphaLabel(0);
            updateTintPalettePreviewText("", false, raw);
            updateShortXIconPreview();
            if (shortxPickerState.expanded) renderShortXIconGrid();
            return;
        }
        currentShortXIconTint = normalized || "";
        var effectiveHex = normalized || getThemeTintHex();
        var alphaByte = extractTintAlphaByte(effectiveHex);
        tintPaletteState.currentBaseRgbHex = extractTintRgbHex(effectiveHex);
        tintPaletteState.syncing = true;
        setTintSeekProgress(alphaByte);
        setRgbSeekProgress("r", parseInt(tintPaletteState.currentBaseRgbHex.substring(1, 3), 16));
        setRgbSeekProgress("g", parseInt(tintPaletteState.currentBaseRgbHex.substring(3, 5), 16));
        setRgbSeekProgress("b", parseInt(tintPaletteState.currentBaseRgbHex.substring(5, 7), 16));
        tintPaletteState.syncing = false;
        updateTintAlphaLabel(alphaByte);
        updateRgbLabelsFromHex(tintPaletteState.currentBaseRgbHex);
        updateTintPalettePreviewText(normalized, !normalized, null);
        updateShortXIconPreview();
        if (shortxPickerState.expanded) renderShortXIconGrid();
        if (pushRecent && normalized) pushRecentTintColor(normalized);
    }

    function applyTintHexValue(hexValue, pushRecent) {
        currentShortXIconTint = String(hexValue || "");
        try {
            tintPaletteState.syncing = true;
            inputShortXIconTint.input.setText(currentShortXIconTint);
         } catch(eSetTint0) { safeLog(null, 'e', "catch " + String(eSetTint0)); }
        tintPaletteState.syncing = false;
        syncTintUiFromInput(!!pushRecent);
    }

    function applyTintSelectionFromPopup(colorHex) {
        var safeColor = normalizeTintColorValue(colorHex, true);
        if (safeColor === null) safeColor = "";
        currentShortXIconTint = safeColor;
        if (safeColor) targetBtn.iconTint = safeColor;
        else delete targetBtn.iconTint;
        try {
            tintPaletteState.syncing = true;
            if (inputShortXIconTint && inputShortXIconTint.input) {
                inputShortXIconTint.input.setText(safeColor);
                try { inputShortXIconTint.input.setSelection(String(safeColor).length);  } catch(eSelTint0) { safeLog(null, 'e', "catch " + String(eSelTint0)); }
                try { inputShortXIconTint.input.invalidate();  } catch(eInvTint0) { safeLog(null, 'e', "catch " + String(eInvTint0)); }
                try { inputShortXIconTint.input.requestLayout();  } catch(eReqTint0) { safeLog(null, 'e', "catch " + String(eReqTint0)); }
            }
        } catch(eSetTint1) {
            safeLog(self.L, 'e', "applyTintSelectionFromPopup setText err=" + String(eSetTint1));
        }
        tintPaletteState.syncing = false;
        try { syncTintUiFromInput(!!safeColor); } catch(eSyncTint1) { safeLog(self.L, 'e', "applyTintSelectionFromPopup sync err=" + String(eSyncTint1)); }
        try { if (rbIconShortX) rbIconShortX.setChecked(true);  } catch(eRbTint0) { safeLog(null, 'e', "catch " + String(eRbTint0)); }
        try { updateIconInputs("shortx");  } catch(eIconInputTint0) { safeLog(null, 'e', "catch " + String(eIconInputTint0)); }
        try { if (tintPaletteState.toggleBtn) tintPaletteState.toggleBtn.setText(safeColor || "\u9009\u62e9\u989c\u8272");  } catch(eTintPopupBtn0) { safeLog(null, 'e', "catch " + String(eTintPopupBtn0)); }
        try {
            if (shortxPickerState.previewIv) {
                var normalizedShort = currentShortXIconName ? self.normalizeShortXIconName(currentShortXIconName, false) : "";
                var drDirect = normalizedShort ? self.resolveShortXDrawable(normalizedShort, currentShortXIconTint || "") : null;
                shortxPickerState.previewIv.setImageDrawable(drDirect);
                try { shortxPickerState.previewIv.invalidate();  } catch(ePrevInv0) { safeLog(null, 'e', "catch " + String(ePrevInv0)); }
            }
        } catch(eTintDirect0) {
            safeLog(self.L, 'e', "applyTintSelectionFromPopup directPreview err=" + String(eTintDirect0));
        }
        try { updateShortXIconPreview(); } catch(eTintPopupPreview0) { safeLog(self.L, 'e', "applyTintSelectionFromPopup preview err=" + String(eTintPopupPreview0)); }
        try { if (shortxPickerState.expanded) renderShortXIconGrid();  } catch(eTintGrid0) { safeLog(null, 'e', "catch " + String(eTintGrid0)); }
        safeLog(self.L, 'i', "applyTintSelectionFromPopup color=" + String(safeColor) + ", icon=" + String(currentShortXIconName || ""));
    }

    function applyTintFromCurrentBase(pushRecent) {
        var baseRgb = tintPaletteState.currentBaseRgbHex || extractTintRgbHex(getThemeTintHex());
        var alphaByte = 255;
        try { alphaByte = Number(tintPaletteState.alphaSeek.getProgress() || 0); } catch(eTintAlpha1) { alphaByte = 255; }
        updateRgbLabelsFromHex(baseRgb);
        applyTintHexValue(buildArgbHex(alphaByte, baseRgb), !!pushRecent);
    }

    function applyTintFromRgbSeekbars(pushRecent) {
        var r = 255, g = 255, b = 255, alphaByte = 255;
        try { r = Number(tintPaletteState.redSeek.getProgress() || 0); } catch(eTintR0) { r = 255; }
        try { g = Number(tintPaletteState.greenSeek.getProgress() || 0); } catch(eTintG0) { g = 255; }
        try { b = Number(tintPaletteState.blueSeek.getProgress() || 0); } catch(eTintB0) { b = 255; }
        try { alphaByte = Number(tintPaletteState.alphaSeek.getProgress() || 0); } catch(eTintA0) { alphaByte = 255; }
        var rgbHex = "#";
        var parts = [r, g, b];
        var i;
        for (i = 0; i < parts.length; i++) {
            var hx = java.lang.Integer.toHexString(parts[i] & 255).toUpperCase();
            if (hx.length < 2) hx = "0" + hx;
            rgbHex += hx;
        }
        tintPaletteState.currentBaseRgbHex = rgbHex;
        updateRgbLabelsFromHex(rgbHex);
        applyTintHexValue(buildArgbHex(alphaByte, rgbHex), !!pushRecent);
    }

    function createTintSwatchCell(label, hexValue, isFollowTheme, cellWidthPx) {
        var wrap = new android.widget.LinearLayout(context);
        wrap.setOrientation(android.widget.LinearLayout.VERTICAL);
        wrap.setGravity(android.view.Gravity.CENTER_HORIZONTAL);
        wrap.setPadding(self.dp(6), self.dp(6), self.dp(6), self.dp(6));
        var lp = new android.widget.GridLayout.LayoutParams();
        if (cellWidthPx && Number(cellWidthPx) > 0) lp.width = Number(cellWidthPx);
        lp.setMargins(self.dp(4), self.dp(4), self.dp(4), self.dp(4));
        wrap.setLayoutParams(lp);
        try { wrap.setBackground(self.ui.createRoundDrawable(self.withAlpha(cardColor, 0.96), self.dp(10)));  } catch(eTintSwBg0) { safeLog(null, 'e', "catch " + String(eTintSwBg0)); }

        var effectiveHex = isFollowTheme ? getThemeTintHex() : normalizeTintColorValue(hexValue, false);
        var dot = new android.view.View(context);
        var dotLp = new android.widget.LinearLayout.LayoutParams(self.dp(24), self.dp(24));
        dotLp.bottomMargin = self.dp(4);
        try {
            var dotColorInt = effectiveHex ? android.graphics.Color.parseColor(effectiveHex) : self.withAlpha(C.primary, 0.18);
            dot.setBackground(self.ui.createRoundDrawable(dotColorInt, self.dp(12)));
         } catch(eTintSwDot0) { safeLog(null, 'e', "catch " + String(eTintSwDot0)); }
        wrap.addView(dot, dotLp);

        var tv = new android.widget.TextView(context);
        tv.setText(String(label));
        tv.setTextColor(textColor);
        tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 10);
        tv.setGravity(android.view.Gravity.CENTER);
        wrap.addView(tv);

        wrap.setClickable(true);
        wrap.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {
                self.touchActivity();
                if (isFollowTheme) {
                    applyTintHexValue("", false);
                } else {
                    var alphaByte = 255;
                    try { alphaByte = Number(tintPaletteState.alphaSeek.getProgress() || 0); } catch(eTintSwAlpha0) { alphaByte = 255; }
                    tintPaletteState.currentBaseRgbHex = extractTintRgbHex(hexValue);
                    applyTintHexValue(buildArgbHex(alphaByte, tintPaletteState.currentBaseRgbHex), true);
                }
            }
        }));
        return wrap;
    }

    function renderRecentTintGrid() {
        if (!tintPaletteState.recentGrid) return;
        try { tintPaletteState.recentGrid.removeAllViews();  } catch(eTintRecent0) { safeLog(null, 'e', "catch " + String(eTintRecent0)); }
        var list = tintPaletteState.recentColors || [];
        var i;
        if (!list.length) {
            try { if (tintPaletteState.recentEmptyTv) tintPaletteState.recentEmptyTv.setVisibility(android.view.View.VISIBLE);  } catch(eTintRecent1) { safeLog(null, 'e', "catch " + String(eTintRecent1)); }
            return;
        }
        try { if (tintPaletteState.recentEmptyTv) tintPaletteState.recentEmptyTv.setVisibility(android.view.View.GONE);  } catch(eTintRecent2) { safeLog(null, 'e', "catch " + String(eTintRecent2)); }
        for (i = 0; i < list.length && i < 5; i++) {
            tintPaletteState.recentGrid.addView(createTintSwatchCell("最近" + (i + 1), list[i], false, 0));
        }
    }

    if (tintSavedState && tintSavedState.recentColors && tintSavedState.recentColors.length) {
        var tintRecentIn = tintSavedState.recentColors;
        var tintRi;
        for (tintRi = 0; tintRi < tintRecentIn.length && tintPaletteState.recentColors.length < 5; tintRi++) {
            var tintNorm = normalizeTintColorValue(tintRecentIn[tintRi], false);
            if (tintNorm) tintPaletteState.recentColors.push(tintNorm);
        }
    }

    var tintPaletteWrap = new android.widget.LinearLayout(context);
    tintPaletteWrap.setOrientation(android.widget.LinearLayout.VERTICAL);
    tintPaletteWrap.setPadding(0, 0, 0, self.dp(12));
    tintPaletteWrap.setBackground(self.ui.createRoundDrawable(self.withAlpha(cardColor, 0.92), self.dp(14)));
    // 旧版内嵌“完整调色板”与上方“颜色”按钮功能重复；保留逻辑用于状态同步，但不再挂载到图标外观区块。
    // iconSectionBody.addView(tintPaletteWrap);
    tintPaletteState.pickerWrap = tintPaletteWrap;

    var tintPaletteHead = new android.widget.LinearLayout(context);
    tintPaletteHead.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    tintPaletteHead.setGravity(android.view.Gravity.CENTER_VERTICAL);
    tintPaletteHead.setPadding(self.dp(12), self.dp(10), self.dp(12), self.dp(10));
    tintPaletteWrap.addView(tintPaletteHead);

    var tintHeadTitle = new android.widget.TextView(context);
    tintHeadTitle.setText("完整调色板");
    tintHeadTitle.setTextColor(textColor);
    tintHeadTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
    tintPaletteHead.addView(tintHeadTitle, new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1));

    var tintToggleBtn = self.ui.createFlatButton(self, "\u9009\u62e9\u989c\u8272", C.primary, function() {
        self.touchActivity();
        var currentTint = currentShortXIconTint || "";
        self.showColorPickerPopup({
            currentColor: currentTint,
            currentIconName: currentShortXIconName,
            onSelect: function(colorHex) {
                try {
                    applyTintSelectionFromPopup(colorHex);
                } catch(eSelect) {
                    safeLog(self.L, 'e', "colorPicker callback err=" + String(eSelect));
                }
            }
        });
    });
    tintPaletteHead.addView(tintToggleBtn);
    tintPaletteState.toggleBtn = tintToggleBtn;

    var tintPaletteBody = new android.widget.LinearLayout(context);
    tintPaletteBody.setOrientation(android.widget.LinearLayout.VERTICAL);
    tintPaletteBody.setPadding(self.dp(12), 0, self.dp(12), self.dp(12));
    tintPaletteWrap.addView(tintPaletteBody);
    tintPaletteState.body = tintPaletteBody;
    tintPaletteBody.setVisibility(android.view.View.GONE);

    var tintPreviewCard = new android.widget.LinearLayout(context);
    tintPreviewCard.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    tintPreviewCard.setGravity(android.view.Gravity.CENTER_VERTICAL);
    tintPreviewCard.setPadding(self.dp(10), self.dp(8), self.dp(10), self.dp(8));
    try { tintPreviewCard.setBackground(self.ui.createRoundDrawable(self.withAlpha(C.primary, 0.08), self.dp(12)));  } catch(eTintPrevCard0) { safeLog(null, 'e', "catch " + String(eTintPrevCard0)); }
    tintPaletteBody.addView(tintPreviewCard);

    var tintPalettePreviewDot = new android.view.View(context);
    var tintPalettePreviewDotLp = new android.widget.LinearLayout.LayoutParams(self.dp(24), self.dp(24));
    tintPalettePreviewDotLp.rightMargin = self.dp(8);
    tintPreviewCard.addView(tintPalettePreviewDot, tintPalettePreviewDotLp);
    tintPaletteState.previewDot = tintPalettePreviewDot;

    var tintPalettePreviewText = new android.widget.TextView(context);
    tintPalettePreviewText.setTextColor(textColor);
    tintPalettePreviewText.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    tintPreviewCard.addView(tintPalettePreviewText, new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1));
    tintPaletteState.previewTextTv = tintPalettePreviewText;

    var tintAlphaRow = new android.widget.LinearLayout(context);
    tintAlphaRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    tintAlphaRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
    tintAlphaRow.setPadding(0, self.dp(10), 0, self.dp(6));
    tintPaletteBody.addView(tintAlphaRow);

    var tintAlphaTitle = new android.widget.TextView(context);
    tintAlphaTitle.setText("透明度");
    tintAlphaTitle.setTextColor(subTextColor);
    tintAlphaTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    tintAlphaRow.addView(tintAlphaTitle);

    var tintAlphaValue = new android.widget.TextView(context);
    tintAlphaValue.setTextColor(textColor);
    tintAlphaValue.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    tintAlphaValue.setPadding(self.dp(8), 0, 0, 0);
    tintAlphaRow.addView(tintAlphaValue);
    tintPaletteState.alphaValueTv = tintAlphaValue;

    var tintSeek = new android.widget.SeekBar(context);
    try { tintSeek.setMax(255);  } catch(eTintSeekMax0) { safeLog(null, 'e', "catch " + String(eTintSeekMax0)); }
    var tintSeekLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    tintSeekLp.setMargins(0, 0, 0, self.dp(8));
    tintPaletteBody.addView(tintSeek, tintSeekLp);
    tintPaletteState.alphaSeek = tintSeek;

    try {
        tintSeek.setOnSeekBarChangeListener(new android.widget.SeekBar.OnSeekBarChangeListener({
            onProgressChanged: function(seekBar, progress, fromUser) {
                updateTintAlphaLabel(progress);
                if (tintPaletteState.syncing) return;
                if (fromUser) applyTintFromCurrentBase(false);
            },
            onStartTrackingTouch: function(seekBar) {},
            onStopTrackingTouch: function(seekBar) {
                if (tintPaletteState.syncing) return;
                applyTintFromCurrentBase(true);
            }
        }));
     } catch(eTintSeekListener0) { safeLog(null, 'e', "catch " + String(eTintSeekListener0)); }

    function createRgbControlRow(label, key, accentHex) {
        var row = new android.widget.LinearLayout(context);
        row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        row.setGravity(android.view.Gravity.CENTER_VERTICAL);
        row.setPadding(0, self.dp(4), 0, self.dp(2));

        var title = new android.widget.TextView(context);
        title.setText(String(label));
        title.setTextColor(subTextColor);
        title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
        title.setPadding(0, 0, self.dp(8), 0);
        row.addView(title);

        var valueTv = new android.widget.TextView(context);
        valueTv.setTextColor(textColor);
        valueTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
        valueTv.setPadding(0, 0, self.dp(8), 0);
        row.addView(valueTv);

        var seek = new android.widget.SeekBar(context);
        try { seek.setMax(255);  } catch(eTintRgbMax0) { safeLog(null, 'e', "catch " + String(eTintRgbMax0)); }
        row.addView(seek, new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1));

        if (key === "r") { tintPaletteState.redSeek = seek; tintPaletteState.redValueTv = valueTv; }
        else if (key === "g") { tintPaletteState.greenSeek = seek; tintPaletteState.greenValueTv = valueTv; }
        else if (key === "b") { tintPaletteState.blueSeek = seek; tintPaletteState.blueValueTv = valueTv; }

        updateRgbValueLabel(key, 255);

        try {
            seek.setOnSeekBarChangeListener(new android.widget.SeekBar.OnSeekBarChangeListener({
                onProgressChanged: function(seekBar, progress, fromUser) {
                    updateRgbValueLabel(key, progress);
                    if (tintPaletteState.syncing) return;
                    if (fromUser) applyTintFromRgbSeekbars(false);
                },
                onStartTrackingTouch: function(seekBar) {},
                onStopTrackingTouch: function(seekBar) {
                    if (tintPaletteState.syncing) return;
                    applyTintFromRgbSeekbars(true);
                }
            }));
         } catch(eTintRgbListener0) { safeLog(null, 'e', "catch " + String(eTintRgbListener0)); }
        return row;
    }

    var tintRgbTitle = new android.widget.TextView(context);
    tintRgbTitle.setText("RGB 调色器（0-255）");
    tintRgbTitle.setTextColor(subTextColor);
    tintRgbTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    tintRgbTitle.setPadding(0, 0, 0, self.dp(4));
    tintPaletteBody.addView(tintRgbTitle);
    tintPaletteBody.addView(createRgbControlRow("红", "r", "#FFE53935"));
    tintPaletteBody.addView(createRgbControlRow("绿", "g", "#FF43A047"));
    tintPaletteBody.addView(createRgbControlRow("蓝", "b", "#FF1E88E5"));

    var tintRecentTitle = new android.widget.TextView(context);
    tintRecentTitle.setText("最近使用（最多 5 个）");
    tintRecentTitle.setTextColor(subTextColor);
    tintRecentTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    tintRecentTitle.setPadding(0, 0, 0, self.dp(4));
    tintPaletteBody.addView(tintRecentTitle);

    var tintRecentEmptyTv = new android.widget.TextView(context);
    tintRecentEmptyTv.setText("暂无最近颜色");
    tintRecentEmptyTv.setTextColor(subTextColor);
    tintRecentEmptyTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
    tintRecentEmptyTv.setPadding(0, 0, 0, self.dp(4));
    tintPaletteBody.addView(tintRecentEmptyTv);
    tintPaletteState.recentEmptyTv = tintRecentEmptyTv;

    var tintRecentGrid = new android.widget.GridLayout(context);
    try { tintRecentGrid.setColumnCount(5);  } catch(eTintRecentCols0) { safeLog(null, 'e', "catch " + String(eTintRecentCols0)); }
    tintPaletteBody.addView(tintRecentGrid);
    tintPaletteState.recentGrid = tintRecentGrid;

    var tintCommonTitle = new android.widget.TextView(context);
    tintCommonTitle.setText("常用颜色");
    tintCommonTitle.setTextColor(subTextColor);
    tintCommonTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    tintCommonTitle.setPadding(0, self.dp(8), 0, self.dp(4));
    tintPaletteBody.addView(tintCommonTitle);

    var tintCommonGrid = new android.widget.GridLayout(context);
    try { tintCommonGrid.setColumnCount(1);  } catch(eTintCommonCols0) { safeLog(null, 'e', "catch " + String(eTintCommonCols0)); }
    tintPaletteBody.addView(tintCommonGrid);
    tintPaletteState.commonGrid = tintCommonGrid;

    function resolveTintCommonGridLayout() {
        var rawWidth = 0;
        try { if (tintPaletteState.commonGrid) rawWidth = Number(tintPaletteState.commonGrid.getWidth() || 0);  } catch(eTintCommonW0) { safeLog(null, 'e', "catch " + String(eTintCommonW0)); }
        if (rawWidth <= 0) {
            try { if (tintPaletteState.body) rawWidth = Number(tintPaletteState.body.getWidth() || 0);  } catch(eTintCommonW1) { safeLog(null, 'e', "catch " + String(eTintCommonW1)); }
        }
        if (rawWidth <= 0) rawWidth = self.dp(320);
        var marginPx = self.dp(4);
        var minCellWidthPx = self.dp(Number(tintPaletteState.commonMinCellWidthDp || 72));
        var cellOuterMinWidth = minCellWidthPx + marginPx * 2;
        var innerWidth = rawWidth - self.dp(4);
        if (innerWidth <= 0) innerWidth = rawWidth;
        var cols = Math.max(1, Math.floor(innerWidth / cellOuterMinWidth));
        var cellWidthPx = Math.floor(innerWidth / cols) - marginPx * 2;
        if (cellWidthPx < self.dp(56)) cellWidthPx = self.dp(56);
        tintPaletteState.commonCols = cols;
        tintPaletteState.commonCellWidthPx = cellWidthPx;
        tintPaletteState.commonLastMeasuredWidth = rawWidth;
        return { cols: cols, cellWidthPx: cellWidthPx };
    }

    function getTintSortInfo(hexValue) {
        var normalized = normalizeTintColorValue(hexValue, false);
        if (!normalized) return { hue: 999, sat: -1, val: -1 };
        var rgb = normalized.substring(3);
        var r = parseInt(rgb.substring(0, 2), 16) / 255.0;
        var g = parseInt(rgb.substring(2, 4), 16) / 255.0;
        var b = parseInt(rgb.substring(4, 6), 16) / 255.0;
        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var d = max - min;
        var h = 0;
        if (d === 0) {
            h = 999;
        } else if (max === r) {
            h = ((g - b) / d) % 6;
        } else if (max === g) {
            h = ((b - r) / d) + 2;
        } else {
            h = ((r - g) / d) + 4;
        }
        if (h !== 999) {
            h = h * 60;
            if (h < 0) h += 360;
        }
        var s = max === 0 ? 0 : d / max;
        var v = max;
        return { hue: h, sat: s, val: v };
    }

    function sortTintCommonDefs(defs) {
        var fixed = [];
        var auto = [];
        var i;
        for (i = 0; i < defs.length; i++) {
            var item = defs[i];
            if (!item) continue;
            if (item.followTheme) fixed.push(item);
            else {
                var sortInfo = getTintSortInfo(item.hex);
                item.__sortHue = sortInfo.hue;
                item.__sortSat = sortInfo.sat;
                item.__sortVal = sortInfo.val;
                auto.push(item);
            }
        }
        auto.sort(function(a, b) {
            if (a.__sortHue !== b.__sortHue) return a.__sortHue - b.__sortHue;
            if (a.__sortSat !== b.__sortSat) return b.__sortSat - a.__sortSat;
            return b.__sortVal - a.__sortVal;
        });
        return fixed.concat(auto);
    }

    var tintCommonDefs = sortTintCommonDefs([
        { label: "跟随主题", hex: "", followTheme: true },
        { label: "白色", hex: "#FFFFFFFF" },
        { label: "黑色", hex: "#FF000000" },
        { label: "灰色", hex: "#FF6B7280" },
        { label: "红色", hex: "#FFE53935" },
        { label: "橙色", hex: "#FFFB8C00" },
        { label: "琥珀", hex: "#FFF59E0B" },
        { label: "黄色", hex: "#FFFDD835" },
        { label: "黄绿", hex: "#FFA3E635" },
        { label: "绿色", hex: "#FF43A047" },
        { label: "青绿", hex: "#FF10B981" },
        { label: "青色", hex: "#FF00ACC1" },
        { label: "天蓝", hex: "#FF38BDF8" },
        { label: "蓝色", hex: "#FF1E88E5" },
        { label: "靛蓝", hex: "#FF4F46E5" },
        { label: "紫色", hex: "#FF8E24AA" },
        { label: "洋红", hex: "#FFC026D3" },
        { label: "粉色", hex: "#FFD81B60" },
        { label: "棕色", hex: "#FF8D6E63" },
        { label: "银灰", hex: "#FFCBD5E1" }
    ]);

    function renderTintCommonGrid() {
        if (!tintPaletteState.commonGrid) return;
        var layoutInfo = resolveTintCommonGridLayout();
        try {
            tintPaletteState.commonGrid.removeAllViews();
            tintPaletteState.commonGrid.setColumnCount(Math.max(1, Number(layoutInfo.cols || 1)));
         } catch(eTintCommonRender0) { safeLog(null, 'e', "catch " + String(eTintCommonRender0)); }
        var tintCi;
        for (tintCi = 0; tintCi < tintCommonDefs.length; tintCi++) {
            tintPaletteState.commonGrid.addView(createTintSwatchCell(tintCommonDefs[tintCi].label, tintCommonDefs[tintCi].hex, !!tintCommonDefs[tintCi].followTheme, layoutInfo.cellWidthPx));
        }
    }

    renderRecentTintGrid();
    renderTintCommonGrid();
    setTintPaletteExpanded(tintPaletteState.expanded);
    syncTintUiFromInput(false);

    try {
        inputShortXIconTint.input.addTextChangedListener(new JavaAdapter(android.text.TextWatcher, {
            afterTextChanged: function(s) {
                if (tintPaletteState.syncing) return;
                syncTintUiFromInput(false);
            },
            beforeTextChanged: function(s, st, c, a) {},
            onTextChanged: function(s, st, b, c) {}
        }));
     } catch(eTwIcon2) { safeLog(null, 'e', "catch " + String(eTwIcon2)); }
    try {
        tintCommonGrid.getViewTreeObserver().addOnGlobalLayoutListener(new android.view.ViewTreeObserver.OnGlobalLayoutListener({
            onGlobalLayout: function() {
                if (!tintPaletteState.expanded) return;
                var oldCols = Number(tintPaletteState.commonCols || 0);
                var oldWidth = Number(tintPaletteState.commonLastMeasuredWidth || 0);
                var info = resolveTintCommonGridLayout();
                if (Number(info.cols || 0) !== oldCols || Number(tintPaletteState.commonLastMeasuredWidth || 0) !== oldWidth) {
                    renderTintCommonGrid();
                }
            }
        }));
     } catch(eTintCommonLayout0) { safeLog(null, 'e', "catch " + String(eTintCommonLayout0)); }
    function setIconSourceCardSelected(type) {
        try {
            var fileSelected = (type === "file");
            var shortxSelected = (type === "shortx");
            rbIconFile.setTextColor(fileSelected ? C.primary : textColor);
            rbIconShortX.setTextColor(shortxSelected ? C.primary : textColor);
            rbIconFile.setBackground(self.ui.createStrokeDrawable(self.withAlpha(fileSelected ? C.primary : cardColor, fileSelected ? 0.16 : 0.80), fileSelected ? C.primary : dividerColor, self.dp(1), self.dp(12)));
            rbIconShortX.setBackground(self.ui.createStrokeDrawable(self.withAlpha(shortxSelected ? C.primary : cardColor, shortxSelected ? 0.16 : 0.80), shortxSelected ? C.primary : dividerColor, self.dp(1), self.dp(12)));
        } catch(eIconSourceStyle0) { safeLog(null, 'e', "catch " + String(eIconSourceStyle0)); }
    }

    // 图标类型切换函数
    function updateIconInputs(type) {
        setIconSourceCardSelected(type);
        if (type === "file") {
            inputIconPath.view.setVisibility(android.view.View.VISIBLE);
            shortxQuickRow.setVisibility(android.view.View.GONE);
            shortxPickerWrap.setVisibility(android.view.View.GONE);
            inputShortXIconTint.view.setVisibility(android.view.View.GONE);
            if (tintPaletteWrap) tintPaletteWrap.setVisibility(android.view.View.GONE);
            shortxPickerState.expanded = false;
            try { if (shortxPickerState.toggleBtn) shortxPickerState.toggleBtn.setText(getShortXPickerClosedLabel());  } catch(eBt0) { safeLog(null, 'e', "catch " + String(eBt0)); }
            currentShortXIconName = "";
            inputShortXIconTint.input.setText("");
        } else if (type === "shortx") {
            inputIconPath.view.setVisibility(android.view.View.GONE);
            shortxQuickRow.setVisibility(android.view.View.VISIBLE);
            inputShortXIconTint.view.setVisibility(android.view.View.VISIBLE);
            if (tintPaletteWrap) tintPaletteWrap.setVisibility(android.view.View.GONE);
            inputIconPath.input.setText("");
            syncTintUiFromInput(false);
            updateShortXIconPreview();
        }
    }

    updateShortXIconPreview();

    // 根据初始值设置选中状态
    var hasIconPath = targetBtn.iconPath && String(targetBtn.iconPath).length > 0;
    var hasShortXIcon = normalizedInitShortX && String(normalizedInitShortX).length > 0;

    if (hasShortXIcon) {
        rbIconShortX.setChecked(true);
        updateIconInputs("shortx");
    } else {
        // 默认选中文件路径（或都不选）
        rbIconFile.setChecked(true);
        updateIconInputs("file");
    }

    // 监听切换
    iconRadioGroup.setOnCheckedChangeListener(new android.widget.RadioGroup.OnCheckedChangeListener({
        onCheckedChanged: function(group, checkedId) {
            var checkedRb = group.findViewById(checkedId);
            if (checkedRb) {
                var tag = String(checkedRb.getTag());
                updateIconInputs(tag);
            }
        }
    }));


    var actionSectionBody = self.createButtonEditorCollapsibleSection(form, "动作设置", "点击后做什么", true);

    // 2. 动作类型（自动换行：用 GridLayout 稳定实现）
    // 这段代码的主要内容/用途：把「Shell/App/广播/Intent/快捷方式」做成会自动换行的单选框区域。
    // 说明：之前用"多行 LinearLayout + 手工测量"在部分 ROM/布局时序下会出现宽度为 0 或不渲染，导致"单选框看不见"。
    //      改为 GridLayout：先计算列数(1~3)，再按固定单元宽度填充，保证必定可见且可换行。
    var typeWrap = new android.widget.LinearLayout(context);
    typeWrap.setOrientation(android.widget.LinearLayout.VERTICAL);
    typeWrap.setPadding(0, self.dp(8), 0, self.dp(16));
    try {
        var _lpTW = new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        );
        typeWrap.setLayoutParams(_lpTW);
     } catch(eLpTW) { safeLog(null, 'e', "catch " + String(eLpTW)); }

    var typeLbl = new android.widget.TextView(context);
    typeLbl.setText("按下后要做什么");
    typeLbl.setTextColor(subTextColor);
    typeLbl.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    typeWrap.addView(typeLbl);

    // Grid 容器
    var typeGrid = new android.widget.GridLayout(context);
    try {
        typeGrid.setOrientation(android.widget.GridLayout.HORIZONTAL);
     } catch(eOri) { safeLog(null, 'e', "catch " + String(eOri)); }
    try {
        var _lpTG = new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        );
        typeGrid.setLayoutParams(_lpTG);
     } catch(eLpTG) { safeLog(null, 'e', "catch " + String(eLpTG)); }
    typeGrid.setPadding(0, self.dp(6), 0, 0);
    typeWrap.addView(typeGrid);

    // 动作类型单选按钮列表（用于互斥选择）
    var typeRbList = [];
    var selectedTypeVal = "shell";
    var _typeChanging = false;

    var types = [
        { id: 1, val: "shell", txt: "Shell" },
        { id: 2, val: "app", txt: "App" },
        { id: 3, val: "broadcast", txt: "发送广播" },
        { id: 4, val: "shortcut", txt: "快捷方式" }
    ];

    // 初始化选中值
    try {
        for (var ti0 = 0; ti0 < types.length; ti0++) {
            if (targetBtn.type === types[ti0].val) {
                selectedTypeVal = types[ti0].val;
                break;
            }
        }
     } catch(eSel0) { safeLog(null, 'e', "catch " + String(eSel0)); }

    function applySelectedType(val) {
        // 这段代码的主要内容/用途：更新选中值并刷新动态输入区可见性。
        try {
            if (!val) val = "shell";
            selectedTypeVal = String(val);
            updateVisibility(selectedTypeVal);
         } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    }

    // 创建 RadioButton（只创建一次）
    for (var i = 0; i < types.length; i++) {
        var rb = new android.widget.RadioButton(context);
        rb.setText(types[i].txt);
        rb.setTextColor(textColor);
        rb.setTag(types[i].val);
        try { rb.setChecked(types[i].val === selectedTypeVal);  } catch(eC0) { safeLog(null, 'e', "catch " + String(eC0)); }
        try { rb.setSingleLine(true);  } catch(eSL) { safeLog(null, 'e', "catch " + String(eSL)); }
        try { rb.setEllipsize(android.text.TextUtils.TruncateAt.END);  } catch(eEl) { safeLog(null, 'e', "catch " + String(eEl)); }
        try { rb.setMinWidth(0);  } catch(eMW) { safeLog(null, 'e', "catch " + String(eMW)); }
        try { rb.setMinHeight(self.dp(40));  } catch(eMH) { safeLog(null, 'e', "catch " + String(eMH)); }
        rb.setPadding(self.dp(8), self.dp(6), self.dp(8), self.dp(6));

        // 互斥选择
        try {
            rb.setOnCheckedChangeListener(new android.widget.CompoundButton.OnCheckedChangeListener({
                onCheckedChanged: function (buttonView, isChecked) {
                    try {
                        if (_typeChanging) return;
                        if (!isChecked) return;

                        _typeChanging = true;

                        var v = null;
                        try { v = buttonView.getTag(); } catch (eTag) { v = null; }
                        if (v != null) selectedTypeVal = String(v);

                        for (var k = 0; k < typeRbList.length; k++) {
                            var other = typeRbList[k];
                            if (other && other !== buttonView) {
                                try { other.setChecked(false);  } catch(eOff) { safeLog(null, 'e', "catch " + String(eOff)); }
                            }
                        }

                        _typeChanging = false;
                        applySelectedType(selectedTypeVal);
                    } catch (eChg) {
                        _typeChanging = false;
                    }
                }
            }));
        } catch (eLis) {
            // 兜底：如果某些 ROM 不接受接口对象，至少不影响渲染
        }

        typeRbList.push(rb);
    }

    function rebuildTypeGrid() {
        // 这段代码的主要内容/用途：按当前宽度计算列数(1~3)，重建 GridLayout，实现自动换行。
        try { typeGrid.removeAllViews();  } catch(e0) { safeLog(null, 'e', "catch " + String(e0)); }

        var availW = 0;
        try { availW = typeWrap.getWidth() - self.dp(8); } catch (e1) { availW = 0; }

        // 这段代码的主要内容/用途：宽度未量出时，用屏幕宽度兜底，避免首次渲染列数/单元宽度异常导致看不见或布局挤压。
        // 说明：部分 ROM/时序下 typeWrap.getWidth() 在首次调用时可能为 0，此时用 DisplayMetrics 保证可见。
        if (!availW || availW <= 0) {
            try {
                var dm = context.getResources().getDisplayMetrics();
                availW = (dm && dm.widthPixels) ? (dm.widthPixels - self.dp(48)) : self.dp(320);
            } catch (eDm) {
                availW = self.dp(320);
            }
        }

        // 宽度未量出时：先按 2 列兜底（保证能看见）
        var cols = 2;
        if (availW && availW > self.dp(240)) {
            var minCell = self.dp(120);
            cols = Math.floor(availW / minCell);
            if (cols < 1) cols = 1;
            if (cols > 3) cols = 3;
        }
        try { typeGrid.setColumnCount(cols);  } catch(eC) { safeLog(null, 'e', "catch " + String(eC)); }

        // 单元宽度：按列数均分
        var cellW = 0;
        try {
            var gap = self.dp(8);
            cellW = Math.floor((availW - gap * (cols - 1)) / cols);
            if (!cellW || cellW < self.dp(90)) cellW = self.dp(140);
        } catch (eW) {
            cellW = self.dp(140);
        }

        for (var i = 0; i < typeRbList.length; i++) {
            var rb = typeRbList[i];
            if (!rb) continue;

            try {
                var lp = new android.widget.GridLayout.LayoutParams();
                lp.width = cellW;
                lp.height = android.widget.LinearLayout.LayoutParams.WRAP_CONTENT;
                lp.setMargins(0, self.dp(6), self.dp(8), 0);
                rb.setLayoutParams(lp);
             } catch(eLP) { safeLog(null, 'e', "catch " + String(eLP)); }

            try { typeGrid.addView(rb);  } catch(eAdd) { safeLog(null, 'e', "catch " + String(eAdd)); }
        }
    }

    // 首次：先渲染一次（保证立即可见）
    try { rebuildTypeGrid();  } catch(eR0) { safeLog(null, 'e', "catch " + String(eR0)); }

    // 布局变化时：重新计算列数（旋转/宽度变化/首次测量完成）
    try {
        typeWrap.addOnLayoutChangeListener(new android.view.View.OnLayoutChangeListener({
            onLayoutChange: function (v, l, t, r, b, ol, ot, orr, ob) {
                try {
                    if ((r - l) !== (orr - ol)) {
                        rebuildTypeGrid();
                    }
                 } catch(eL) { safeLog(null, 'e', "catch " + String(eL)); }
            }
        }));
     } catch(eLC) { safeLog(null, 'e', "catch " + String(eLC)); }
    actionSectionBody.addView(typeWrap);

    // 3. 动态输入区
    var dynamicContainer = new android.widget.LinearLayout(context);
    dynamicContainer.setOrientation(android.widget.LinearLayout.VERTICAL);
    actionSectionBody.addView(dynamicContainer);

    // --- Shell ---
    var shellWrap = new android.widget.LinearLayout(context);
    shellWrap.setOrientation(android.widget.LinearLayout.VERTICAL);
    var initCmd = targetBtn.cmd || "";
    if (targetBtn.cmd_b64) initCmd = decodeBase64Utf8(targetBtn.cmd_b64) || initCmd;
    var inputShell = self.ui.createInputGroup(self, "Shell 命令", initCmd, true, "input / am / pm 等命令");
    shellWrap.addView(inputShell.view);

    // # Root 开关已移除：广播桥接收端默认以 root 执行，开关无意义
    dynamicContainer.addView(shellWrap);

    // --- App ---
    var appWrap = new android.widget.LinearLayout(context);
    appWrap.setOrientation(android.widget.LinearLayout.VERTICAL);
    var inputPkg = self.ui.createInputGroup(self, "应用包名 (Package)", targetBtn.pkg, false, "例如: com.tencent.mm");
    appWrap.addView(inputPkg.view);
// # 启动用户（主应用/分身应用）
// 这段代码的主要内容/用途：为"启动应用"提供跨用户启动选择。主用户一般为 0；分身/工作资料用户因 ROM 不同可能是 10/999 等。
// 说明：这里只做"手动指定"，避免在 system_server 里做复杂探测导致不稳定。
var inputAppLaunchUser = self.ui.createInputGroup(self, "启动用户ID (主=0 / 分身=10/999 等)", (targetBtn.launchUserId != null ? String(targetBtn.launchUserId) : ""), false, "留空默认 0（主用户）");
appWrap.addView(inputAppLaunchUser.view);

    dynamicContainer.addView(appWrap);

    // --- Broadcast ---
    var bcWrap = new android.widget.LinearLayout(context);
    bcWrap.setOrientation(android.widget.LinearLayout.VERTICAL);
    var inputAction = self.ui.createInputGroup(self, "广播 Action", targetBtn.action, false, "例如: com.example.TEST_ACTION");
    bcWrap.addView(inputAction.view);
    var initExtras = "";
    if (targetBtn.extras) initExtras = JSON.stringify(targetBtn.extras);
    else if (targetBtn.extra) initExtras = JSON.stringify(targetBtn.extra);
    var inputExtras = self.ui.createInputGroup(self, "Extras (JSON, 选填)", initExtras, true, "例如: {\"key\": \"value\"}");
    bcWrap.addView(inputExtras.view);
    dynamicContainer.addView(bcWrap);

    // --- Shortcut ---
    // 新增：启动系统/应用快捷方式（Launcher Shortcuts）
    // 字段说明：
    // - pkg: 目标应用包名
    // - shortcutId: 快捷方式 ID（可从 LauncherApps/Shortcuts 列表中获取）
    var shortcutWrap = new android.widget.LinearLayout(context);
    shortcutWrap.setOrientation(android.widget.LinearLayout.VERTICAL);
    var inputScPkg = self.ui.createInputGroup(self, "快捷方式包名 (Package)", targetBtn.pkg, false, "例如: com.tencent.mm");
    // # 选择快捷方式后用于保存的启动参数（intentUri/userId）
    var scSelectedIntentUri = targetBtn.intentUri ? String(targetBtn.intentUri) : "";
    var scSelectedUserId = (targetBtn.userId != null) ? parseInt(String(targetBtn.userId), 10) : 0;
    shortcutWrap.addView(inputScPkg.view);
    var inputScId = self.ui.createInputGroup(self, "快捷方式 ID (shortcutId)", targetBtn.shortcutId, false, "例如: com.tencent.mm:shortcut_xxx 或内部ID（以实际查询结果为准）");
    shortcutWrap.addView(inputScId.view);

    // # UI 优化：快捷方式类型下，包名与 shortcutId 属于"内部字段"，不再在界面上占空间显示
    // # 需求：当按钮类型选中快捷方式时，UI 不显示包名/ID，改为显示快捷方式的启动命令（am start intent）
    // # 说明：仍然保留 pkg/shortcutId 用于数据保存与图标解析，但将输入框隐藏。
    try { inputScPkg.view.setVisibility(android.view.View.GONE);  } catch(eHidePkg) { safeLog(null, 'e', "catch " + String(eHidePkg)); }
    try { inputScId.view.setVisibility(android.view.View.GONE);  } catch(eHideId) { safeLog(null, 'e', "catch " + String(eHideId)); }

    // # 显示：快捷方式启动命令（只读展示，方便复制/核对）
    function __scBuildLaunchCmd() {
        try {
            var u = (scSelectedUserId != null) ? parseInt(String(scSelectedUserId), 10) : 0;
            if (isNaN(u)) u = 0;
            var iu = scSelectedIntentUri ? String(scSelectedIntentUri) : "";
            if (!iu || iu.length === 0) return "（未选择快捷方式）";
            // # 注意：intentUri 中可能包含 ; 等字符，使用单引号包裹更安全
            return "am start --user " + String(u) + " '" + iu + "'";
        } catch(eCmd) {
            return "（命令生成失败）";
        }
    }

    var inputScCmd = self.ui.createInputGroup(self, "快捷方式启动命令 (am start)", __scBuildLaunchCmd(), false, "选择快捷方式后自动生成，可复制到 Termux 验证");
    shortcutWrap.addView(inputScCmd.view);
    // # 需求：快捷方式只使用 JavaScript 执行，取消 Shell，因此隐藏 am start 命令框
    try { inputScCmd.view.setVisibility(android.view.View.GONE);  } catch(eHideScCmd) { safeLog(null, 'e', "catch " + String(eHideScCmd)); }
    try {
        // # 命令框可编辑：允许你在配置时手动指定/微调启动命令（例如锁定分身/主微信）
        // # 注意：选择快捷方式后仍会自动刷新该字段；如需保留手动内容，可在选择后再修改。
        inputScCmd.input.setEnabled(true);
        inputScCmd.input.setFocusable(true);
        inputScCmd.input.setFocusableInTouchMode(true);
        try { inputScCmd.input.setSingleLine(false);  } catch(eSL) { safeLog(null, 'e', "catch " + String(eSL)); }
        try { inputScCmd.input.setMinLines(2);  } catch(eML) { safeLog(null, 'e', "catch " + String(eML)); }
        try { inputScCmd.input.setHorizontallyScrolling(false);  } catch(eHS) { safeLog(null, 'e', "catch " + String(eHS)); }
        try { inputScCmd.input.setTextIsSelectable(true);  } catch(eSel) { safeLog(null, 'e', "catch " + String(eSel)); }
     } catch(eRO) { safeLog(null, 'e', "catch " + String(eRO)); }

// # 快捷方式 JS 启动代码（自动生成，可手动微调）
    // 这段代码的主要内容/用途：为"快捷方式按钮"提供可执行的 JS 启动脚本（默认走 startIntentAsUserByUri），用于精确指定主/分身 userId 并避免弹选择器。
    // 说明：
    // 1) 选择快捷方式后会自动生成并回填；
    // 2) 保存按钮会把该脚本写入按钮配置字段 shortcutJsCode；
    // 3) 运行时优先执行该脚本，失败才回退 Shell am start，保证桌面移除后仍可启动。
    function __scBuildDefaultJsCode() {
        // # 这段代码的主要内容/用途：为"快捷方式按钮"生成"自包含"的 JavaScript 启动脚本（严格按用户成功示例写法），并确保字符串安全转义
        try {
            var u0 = (scSelectedUserId != null) ? parseInt(String(scSelectedUserId), 10) : 0;
            if (isNaN(u0)) u0 = 0;

            // # 优先使用 launchUserId（你在按钮配置里锁定主/分身时用），否则回退 userId
            try {
                if (targetBtn && targetBtn.launchUserId != null && String(targetBtn.launchUserId).length > 0) {
                    var lu = parseInt(String(targetBtn.launchUserId), 10);
                    if (!isNaN(lu)) u0 = lu;
                }
             } catch(eLuSc) { safeLog(null, 'e', "catch " + String(eLuSc)); }

            var iu0 = scSelectedIntentUri ? String(scSelectedIntentUri) : "";
            if (!iu0 || iu0.length === 0) {
                return "// # 这段代码的主要内容/用途：未选择快捷方式，暂无可生成的启动脚本\n\n'err_no_shortcut'\n";
            }

            // # 用 JSON.stringify 做安全转义，避免 intentUri 中包含引号/反斜杠/换行导致脚本语法错误
            var sIntent = JSON.stringify(iu0);
            var sUser = String(u0);

            // # 生成"自包含"脚本：严格按用户成功示例（Intent.parseUri + UserHandle.of + context.startActivityAsUser）
            var out = "";
            out += "// # 这段代码的主要内容/用途：在指定用户(UserHandle)下启动快捷方式（自动生成，自包含，可复制到独立 JS 任务中运行）\n";
            out += "importClass(android.content.Intent);\n";
            out += "importClass(android.os.UserHandle);\n\n";
            out += "var r = 'ok';\n";
            out += "try {\n";
            out += "  var myIntent = Intent.parseUri(" + sIntent + ", 0);\n";
            out += "  myIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);\n";
            out += "  var userHandle = UserHandle.of(" + sUser + ");\n";
            out += "  context.startActivityAsUser(myIntent, userHandle);\n";
            out += "  r = 'ok_user_' + String(" + sUser + ");\n";
            out += "} catch (e) {\n";
            out += "  r = 'err_' + e;\n";
            out += "}\n";
            out += "r\n";
            return out;
        } catch (eBuildJs) {
            return "// # 这段代码的主要内容/用途：生成快捷方式启动脚本失败\n\n'err_build_js'\n";
        }
    }

    // # 安全回填 JS 编辑框：集中处理，避免重复代码与空指针崩溃：集中处理，避免重复代码与空指针崩溃
    function __scUpdateJsCodeSafe() {
        try {
            if (inputScJsCode && inputScJsCode.input) {
                inputScJsCode.input.setText(String(__scBuildDefaultJsCode()));
            }
         } catch(eUpJs) { safeLog(null, 'e', "catch " + String(eUpJs)); }
    }

    var inputScJsCode = self.ui.createInputGroup(self, "快捷方式 JS 启动代码 (startActivityAsUser)", (targetBtn.shortcutJsCode ? String(targetBtn.shortcutJsCode) : ""), false, "选择快捷方式后自动生成；你也可以手动改 userId 或其他参数");
    shortcutWrap.addView(inputScJsCode.view);

    try {
        // # JS 编辑框尺寸：与 Shell 命令框一致，避免过高占屏（用户可滚动查看完整内容）
        inputScJsCode.input.setEnabled(true);
        inputScJsCode.input.setFocusable(true);
        inputScJsCode.input.setFocusableInTouchMode(true);
        try { inputScJsCode.input.setSingleLine(false);  } catch(eJsSL) { safeLog(null, 'e', "catch " + String(eJsSL)); }
        try { inputScJsCode.input.setMinLines(2);  } catch(eJsML) { safeLog(null, 'e', "catch " + String(eJsML)); }
        try { inputScJsCode.input.setMaxLines(4);  } catch(eJsMXL) { safeLog(null, 'e', "catch " + String(eJsMXL)); }
        try { inputScJsCode.input.setHorizontallyScrolling(false);  } catch(eJsHS) { safeLog(null, 'e', "catch " + String(eJsHS)); }
        try { inputScJsCode.input.setTextIsSelectable(true);  } catch(eJsSel) { safeLog(null, 'e', "catch " + String(eJsSel)); }
     } catch(eJsBox) { safeLog(null, 'e', "catch " + String(eJsBox)); }

// # 快捷方式选择器（内联折叠版）：在"新增/编辑按钮页"内部展开/收起列表，并回填 pkg/shortcutId
// 这段代码的主要内容/用途：把原先"弹出选择器窗口"的方式改为"折叠展开在本页下方显示"，避免上下层遮挡问题。
// 设计要点：
// 1) 不再依赖 WindowManager 叠层，直接作为本页 UI 的一部分渲染；
// 2) 数据加载放到子线程，避免卡住 UI；
// 3) 关闭/收起只是隐藏列表，不会触发频繁 add/remove View 的不稳定路径。
var scInlineState = {
    expanded: false,
    loading: false,
    loaded: false,
    // # 新增：记录上次加载时间，用于判断是否需要刷新（例如你刚把微信小程序"添加到桌面"后）
    loadedTs: 0,
    // # 新增：手动触发强制刷新（点击"刷新"按钮）
    forceReload: false,
    allItems: [],
    lastQuery: ""
};

// # 图标缓存与加载已统一使用下方 __scIconLoader / __scRequestIcon，避免维护两套后台线程队列。
// # 折叠头部（点击展开/收起）
var scHeader = new android.widget.LinearLayout(context);
scHeader.setOrientation(android.widget.LinearLayout.HORIZONTAL);
scHeader.setGravity(android.view.Gravity.CENTER_VERTICAL);
scHeader.setPadding(self.dp(10), self.dp(10), self.dp(10), self.dp(10));

var scHeaderTv = new android.widget.TextView(context);
scHeaderTv.setText("选择快捷方式（点击展开）");
scHeaderTv.setTextColor(textColor);
scHeaderTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
var scHeaderTvLp = new android.widget.LinearLayout.LayoutParams(0, -2);
scHeaderTvLp.weight = 1;
scHeaderTv.setLayoutParams(scHeaderTvLp);
scHeader.addView(scHeaderTv);

var scRefreshTv = new android.widget.TextView(context);
// 这段代码的主要内容/用途：手动刷新快捷方式列表（用于你"添加到桌面"后立即重新加载）
scRefreshTv.setText("刷新");
scRefreshTv.setTextColor(subTextColor);
scRefreshTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
scRefreshTv.setPadding(self.dp(10), self.dp(6), self.dp(10), self.dp(6));
scRefreshTv.setClickable(true);
scRefreshTv.setOnClickListener(new android.view.View.OnClickListener({
    onClick: function(v) {
        try {
            scInlineState.forceReload = true;
            scInlineState.loaded = false;
            // 清空当前内联列表的图标缓存，避免旧图标占用内存且影响新列表显示
            try { __scIconCache = {};  } catch(eC0) { safeLog(null, 'e', "catch " + String(eC0)); }
            try { __scIconKeys = [];  } catch(eC1) { safeLog(null, 'e', "catch " + String(eC1)); }
            try { __scIconInFlight = {};  } catch(eC2) { safeLog(null, 'e', "catch " + String(eC2)); }
            // 点击刷新时给用户即时反馈；折叠状态下自动展开并加载，避免看起来无效。
            if (!scInlineState.expanded) {
                scInlineState.expanded = true;
                try { scBody.setVisibility(android.view.View.VISIBLE); } catch(eV) { safeLog(null, 'e', "catch " + String(eV)); }
                try { scArrowTv.setText("▲"); } catch(eA) { safeLog(null, 'e', "catch " + String(eA)); }
            }
            __scEnsureLoadedAndRender();
            try { self.toast("正在刷新快捷方式"); } catch(eToast) {}
         } catch(eR) { safeLog(null, 'e', "catch " + String(eR)); }
    }
}));
scHeader.addView(scRefreshTv);
var scArrowTv = new android.widget.TextView(context);
scArrowTv.setText("▼");
scArrowTv.setTextColor(subTextColor);
scArrowTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
scHeader.addView(scArrowTv);

// # 折叠内容容器（默认隐藏）
var scBody = new android.widget.LinearLayout(context);
scBody.setOrientation(android.widget.LinearLayout.VERTICAL);
scBody.setVisibility(android.view.View.GONE);
scBody.setPadding(self.dp(10), 0, self.dp(10), self.dp(10));

// # 搜索框（内联）
var scSearchWrap = self.ui.createInputGroup(self, "搜索", "", false, "输入关键词过滤：名称/包名/ID");
scBody.addView(scSearchWrap.view);

// # 状态提示
var scHint = new android.widget.TextView(context);
scHint.setText("");
scHint.setTextColor(subTextColor);
scHint.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
scHint.setPadding(0, self.dp(6), 0, self.dp(6));
scBody.addView(scHint);

// # 列表框容器（内部纵向滚动）
// 这段代码的主要内容/用途：在"新增/编辑按钮页"内部提供一个固定高度的列表框，让列表在框内纵向滚动，避免把整页撑得很长。
// # 列表框（ListView 方案）：用 ListView 代替 ScrollView+LinearLayout，避免父级 ScrollView 抢手势导致"滚不动/卡住"
// 这段代码的主要内容/用途：把快捷方式列表渲染成真正可滚动的列表控件，滚动只发生在列表框内部。
var scListBox = new android.widget.FrameLayout(context);
try {
    // # 高度智能自适应：取屏幕高度的 45%，并限制在 [180dp, 420dp] 区间
    var dm = context.getResources().getDisplayMetrics();
    var hPx = dm ? dm.heightPixels : 0;
    var targetPx = hPx > 0 ? Math.floor(hPx * 0.45) : self.dp(260);
    var minPx = self.dp(180);
    var maxPx = self.dp(420);
    if (targetPx < minPx) targetPx = minPx;
    if (targetPx > maxPx) targetPx = maxPx;
    var lpBox = new android.widget.LinearLayout.LayoutParams(-1, targetPx);
    scListBox.setLayoutParams(lpBox);
 } catch(eH0) { safeLog(null, 'e', "catch " + String(eH0)); }
try {
    // # 列表框描边+圆角
    var gdBox = new android.graphics.drawable.GradientDrawable();
    gdBox.setShape(android.graphics.drawable.GradientDrawable.RECTANGLE);
    gdBox.setCornerRadius(self.dp(10));
    var _isDark0 = self.isDarkTheme();
    gdBox.setColor(_isDark0 ? C.cardDark : C.cardLight);
    gdBox.setStroke(self.dp(1), _isDark0 ? C.dividerDark : C.dividerLight);
    scListBox.setBackground(gdBox);
    scListBox.setPadding(self.dp(6), self.dp(6), self.dp(6), self.dp(6));
 } catch(eBg0) { safeLog(null, 'e', "catch " + String(eBg0)); }

// # ListView：真正的列表控件（支持框内纵向滚动）
var scList = new android.widget.ListView(context);
try { scList.setDivider(null);  } catch(eDiv0) { safeLog(null, 'e', "catch " + String(eDiv0)); }
try { scList.setVerticalScrollBarEnabled(true);  } catch(eSb0) { safeLog(null, 'e', "catch " + String(eSb0)); }
try { scList.setOverScrollMode(android.view.View.OVER_SCROLL_IF_CONTENT_SCROLLS);  } catch(eOver0) { safeLog(null, 'e', "catch " + String(eOver0)); }
try { scList.setCacheColorHint(android.graphics.Color.TRANSPARENT);  } catch(eCch0) { safeLog(null, 'e', "catch " + String(eCch0)); }
try {
    // # 关键：列表内滑动时，禁止父容器拦截触摸事件（DOWN/MOVE 都做）
    scList.setOnTouchListener(new android.view.View.OnTouchListener({
        onTouch: function(v, ev) {
            try {
                var act = ev.getActionMasked ? ev.getActionMasked() : ev.getAction();
                if (act === android.view.MotionEvent.ACTION_DOWN || act === android.view.MotionEvent.ACTION_MOVE) {
                    try {
                        // # 向上递归，避免多层父布局抢事件
                        var p = v.getParent();
                        while (p != null) {
                            try { p.requestDisallowInterceptTouchEvent(true);  } catch(eReq) { safeLog(null, 'e', "catch " + String(eReq)); }
                            try { p = p.getParent(); } catch(eUp) { p = null; }
                        }
                     } catch(ePar0) { safeLog(null, 'e', "catch " + String(ePar0)); }
                }
             } catch(eTouch0) { safeLog(null, 'e', "catch " + String(eTouch0)); }
            // # 返回 false：让 ListView 自己处理滚动
            return false;
        }
    }));
 } catch(eT0) { safeLog(null, 'e', "catch " + String(eT0)); }

scListBox.addView(scList, new android.widget.FrameLayout.LayoutParams(-1, -1));

// # 放入折叠内容区
scBody.addView(scListBox);

// # 图标缓存（简单 LRU）
var __scIconCache = {};
var __scIconKeys = [];
var __scIconMax = 120;

// # 图标异步加载器（单例，限制并发，避免在 getView 里同步 Binder 调用造成卡顿）
// 这段代码的主要内容/用途：把 shortcut icon 的获取放到后台线程，UI 线程只设置占位/回退图标，加载完成后仅更新对应行的 ImageView。
var __scIconInFlight = {};
var __scIconLoader = (function() {
    try {
        if (self.__scIconLoaderSingleton) return self.__scIconLoaderSingleton;
     } catch(eS) { safeLog(null, 'e', "catch " + String(eS)); }

    var obj = { ht: null, h: null };
    try {
        var HandlerThread = android.os.HandlerThread;
        var Handler = android.os.Handler;
        obj.ht = new HandlerThread("sx-toolhub-scicon-loader");
        obj.ht.start();
        obj.h = new Handler(obj.ht.getLooper());
    } catch(eT) {
        obj.ht = null;
        obj.h = null;
    }

    try { self.__scIconLoaderSingleton = obj;  } catch(eSet) { safeLog(null, 'e', "catch " + String(eSet)); }
    return obj;
})();

function __scPostIconLoad(fn) {
    try {
        if (__scIconLoader && __scIconLoader.h) {
            __scIconLoader.h.post(new java.lang.Runnable({ run: function() { try { fn();  } catch(e) { safeLog(null, 'e', "catch " + String(e)); } } }));
            return true;
        }
     } catch(eP) { safeLog(null, 'e', "catch " + String(eP)); }
    return false;
}

function __scRequestIcon(it, imageView) {
    try {
        if (!it || !imageView) return;
        var key = String(it.pkg) + "|" + String(it.shortcutId);

        // 绑定 tag：后续回调时校验，避免复用行导致串图
        try { imageView.setTag(key);  } catch(eTag0) { safeLog(null, 'e', "catch " + String(eTag0)); }

        // 命中缓存：直接显示
        var hit = __scGetIcon(key);
        if (hit) {
            try { imageView.setImageDrawable(hit);  } catch(eSet0) { safeLog(null, 'e', "catch " + String(eSet0)); }
            return;
        }

        // 立即回退：先用 app icon（更快）
        try {
            if (__scPm) {
                var appDr = __scPm.getApplicationIcon(String(it.pkg));
                if (appDr) {
                    try { imageView.setImageDrawable(appDr);  } catch(eSet1) { safeLog(null, 'e', "catch " + String(eSet1)); }
                }
            }
         } catch(eApp0) { safeLog(null, 'e', "catch " + String(eApp0)); }

        // 已在加载中：不重复排队
        if (__scIconInFlight[key]) return;
        __scIconInFlight[key] = 1;

        // 后台加载 shortcut icon（成功则写入缓存，并只更新当前 tag 匹配的 ImageView）
        __scPostIconLoad(function() {
            var dr = null;
            try {
                if (__scLauncherApps && it.shortcutInfo) {
                    dr = __scLauncherApps.getShortcutIconDrawable(it.shortcutInfo, 0);
                }
            } catch(eIc0) { dr = null; }

            if (dr) __scPutIcon(key, dr);

            try { delete __scIconInFlight[key];  } catch(eDel0) { safeLog(null, 'e', "catch " + String(eDel0)); }

            try {
                // 回到 UI：只更新 tag 仍然匹配的行
                scList.post(new java.lang.Runnable({ run: function() {
                    try {
                        if (!dr) return;
                        var tag = null;
                        try { tag = imageView.getTag(); } catch(eTg) { tag = null; }
                        if (String(tag) === String(key)) {
                            try { imageView.setImageDrawable(dr);  } catch(eSet2) { safeLog(null, 'e', "catch " + String(eSet2)); }
                        }
                     } catch(eUi0) { safeLog(null, 'e', "catch " + String(eUi0)); }
                }}));
             } catch(eUi1) { safeLog(null, 'e', "catch " + String(eUi1)); }
        });
     } catch(eR) { safeLog(null, 'e', "catch " + String(eR)); }
}
function __scPutIcon(k, d) {
    try {
        if (!k) return;
        if (__scIconCache[k]) return;
        __scIconCache[k] = d;
        __scIconKeys.push(k);
        if (__scIconKeys.length > __scIconMax) {
            var old = __scIconKeys.shift();
            try { delete __scIconCache[old];  } catch(eDel) { safeLog(null, 'e', "catch " + String(eDel)); }
        }
     } catch(ePut) { safeLog(null, 'e', "catch " + String(ePut)); }
}
function __scGetIcon(k) {
    try { return __scIconCache[k] || null; } catch(eGet) { return null; }
}

// # ListView 适配器数据
var __scData = [];
var __scLauncherApps = null;
var __scPm = null;
try { __scLauncherApps = context.getSystemService(android.content.Context.LAUNCHER_APPS_SERVICE);  } catch(eLa0) { safeLog(null, 'e', "catch " + String(eLa0)); }
try { __scPm = context.getPackageManager();  } catch(ePm0) { safeLog(null, 'e', "catch " + String(ePm0)); }

// # 新增：应用名缓存
// 这段代码的主要内容/用途：把包名解析成应用名（ApplicationLabel），并做缓存，避免列表滚动时频繁调用 PackageManager。
var __scAppLabelCache = {};
var __scAppLabelCacheKeys = [];
var __scAppLabelCacheMax = 200;

function __scGetAppLabel(pkg) {
    try {
        var p = String(pkg || "");
        if (!p) return "";
        if (__scAppLabelCache[p]) return __scAppLabelCache[p];
        if (!__scPm) {
            __scAppLabelCache[p] = p;
            return p;
        }
        var ai = null;
        try { ai = __scPm.getApplicationInfo(p, 0); } catch(eAi) { ai = null; }
        if (!ai) {
            __scAppLabelCache[p] = p;
            return p;
        }
        var lb = "";
        try { lb = String(__scPm.getApplicationLabel(ai)); } catch(eLb) { lb = ""; }
        if (!lb) lb = p;
        
        // # 缓存写入，带 LRU 清理
        __scAppLabelCache[p] = lb;
        __scAppLabelCacheKeys.push(p);
        if (__scAppLabelCacheKeys.length > __scAppLabelCacheMax) {
            var old = __scAppLabelCacheKeys.shift();
            try { delete __scAppLabelCache[old];  } catch(eDel) { safeLog(null, 'e', "catch " + String(eDel)); }
        }
        
        return lb;
    } catch(e0) {
        try { return String(pkg || ""); } catch(e1) { return ""; }
    }
}

var __scAdapter = new android.widget.BaseAdapter({
    getCount: function() { try { return __scData.length; } catch(e) { return 0; } },
    getItem: function(pos) { try { return __scData[pos]; } catch(e) { return null; } },
    getItemId: function(pos) { return pos; },
    getView: function(pos, convertView, parent) {
        var row = convertView;
        var holder = null;
        try {
            if (row == null) {
                row = new android.widget.LinearLayout(context);
                row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
                row.setGravity(android.view.Gravity.CENTER_VERTICAL);
                row.setPadding(self.dp(10), self.dp(8), self.dp(10), self.dp(8));
                try {
                    var _isDark1 = self.isDarkTheme();
                    var bg = self.ui.createRoundDrawable(_isDark1 ? C.cardDark : C.cardLight, self.dp(10));
                    row.setBackground(bg);
                 } catch(eBg1) { safeLog(null, 'e', "catch " + String(eBg1)); }

                var iv = new android.widget.ImageView(context);
                var lpIv = new android.widget.LinearLayout.LayoutParams(self.dp(36), self.dp(36));
                lpIv.rightMargin = self.dp(10);
                iv.setLayoutParams(lpIv);
                row.addView(iv);

                var vv = new android.widget.LinearLayout(context);
                vv.setOrientation(android.widget.LinearLayout.VERTICAL);
                var lpVv = new android.widget.LinearLayout.LayoutParams(0, -2);
                lpVv.weight = 1;
                vv.setLayoutParams(lpVv);

                var t1 = new android.widget.TextView(context);
                t1.setTextColor(textColor);
                t1.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
                vv.addView(t1);

                var t2 = new android.widget.TextView(context);
                t2.setTextColor(subTextColor);
                t2.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
                t2.setPadding(0, self.dp(2), 0, 0);
                vv.addView(t2);

                row.addView(vv);

                holder = { iv: iv, t1: t1, t2: t2 };
                row.setTag(holder);
            } else {
                holder = row.getTag();
            }
         } catch(eRow0) { safeLog(null, 'e', "catch " + String(eRow0)); }

        try {
            var it = __scData[pos];
            if (it && holder) {
                // # 优化：显示为「应用名/快捷方式名」，例如「微信/扫一扫」
                // 这段代码的主要内容/用途：让列表更容易辨认来源应用，并与用户期望一致。
                var appName = "";
                try { appName = __scGetAppLabel(it.pkg); } catch(eApp0) { appName = ""; }
                var scName = String(it.label || "(无名称)");
                if (appName && appName.length > 0) holder.t1.setText(String(appName) + "/" + scName);
                else holder.t1.setText(scName);
                holder.t2.setText("pkg=" + String(it.pkg) + "  id=" + String(it.shortcutId) + "  u=" + String(it.userId));

                // # icon：异步加载 shortcut icon，UI 线程先回退 app icon，避免滚动/渲染卡顿
// 这段代码的主要内容/用途：把耗时的 shortcut icon 获取移到后台线程，列表滚动更顺滑、system_server 占用更稳。
try { __scRequestIcon(it, holder.iv);  } catch(eIconReq) { safeLog(null, 'e', "catch " + String(eIconReq)); }
            }
         } catch(eBind) { safeLog(null, 'e', "catch " + String(eBind)); }

        return row;
    }
});
try { scList.setAdapter(__scAdapter);  } catch(eAd0) { safeLog(null, 'e', "catch " + String(eAd0)); }

try {
    scList.setOnItemClickListener(new android.widget.AdapterView.OnItemClickListener({
        onItemClick: function(parent, view, position, id) {
            try {
                var obj = __scData[position];
                if (!obj) return;

                try { inputScPkg.input.setText(String(obj.pkg));  } catch(eSet1) { safeLog(null, 'e', "catch " + String(eSet1)); }
                try { inputScId.input.setText(String(obj.shortcutId));  } catch(eSet2) { safeLog(null, 'e', "catch " + String(eSet2)); }
                // # 回填：用于"Shell am start"启动的 intentUri + userId（桌面移除后仍可启动）
                try { scSelectedIntentUri = obj.intentUri ? String(obj.intentUri) : ""; } catch(eSetIU) { scSelectedIntentUri = ""; }
                try { scSelectedUserId = (obj.userId != null) ? parseInt(String(obj.userId), 10) : 0; } catch(eSetUID) { scSelectedUserId = 0; }

                // # 同步刷新：启动命令展示框
                try { if (inputScCmd && inputScCmd.input) inputScCmd.input.setText(String(__scBuildLaunchCmd()));  } catch(eUpCmd) { safeLog(null, 'e', "catch " + String(eUpCmd)); }

                // # 同步刷新：JS 启动代码（选择快捷方式后自动生成并回填）
                __scUpdateJsCodeSafe();

                // # 回填：同时把快捷方式 icon 导出到 shortcut_icons，并把图标路径写入"图标地址"编辑框
                // 这段代码的主要内容/用途：确保微信小程序等快捷方式在从桌面移除后，按钮页/按钮管理页仍能显示对应图标。
                try {
                    var __scIconPath = __scEnsureShortcutIconFile(obj);
                    if (__scIconPath) {
                        try { inputIconPath.input.setText(String(__scIconPath));  } catch(eSetIP) { safeLog(null, 'e', "catch " + String(eSetIP)); }
                    }
                 } catch(eExp0) { safeLog(null, 'e', "catch " + String(eExp0)); }

                // 可选：标题为空时自动填 label
                try {
                    var curTitle = String(inputTitle.getValue() || "");
                    if ((!curTitle || curTitle.trim().length === 0) && obj.label) {
                        inputTitle.input.setText(String(obj.label));
                    }
                 } catch(eSet3) { safeLog(null, 'e', "catch " + String(eSet3)); }

                try { self.state.pendingDirty = true;  } catch(eDirty) { safeLog(null, 'e', "catch " + String(eDirty)); }

                // # 收起列表
                try {
                    scInlineState.expanded = false;
                    scBody.setVisibility(android.view.View.GONE);
                    scArrowTv.setText("▼");
                    // # 优化：标题同样显示为「应用名/快捷方式名」
                    // 这段代码的主要内容/用途：避免选中后标题只显示快捷方式名，导致不清楚来自哪个应用。
                    var _app = "";
                    try { _app = __scGetAppLabel(obj.pkg); } catch(eApp1) { _app = ""; }
                    var _nm = String(obj.label || obj.shortcutId || "快捷方式");
                    if (_app && _app.length > 0) scHeaderTv.setText("已选择：" + String(_app) + "/" + _nm + "（点击展开）");
                    else scHeaderTv.setText("已选择：" + _nm + "（点击展开）");
                 } catch(eFold) { safeLog(null, 'e', "catch " + String(eFold)); }
            } catch(eCb) {
                try { self.toast("回填失败: " + eCb);  } catch(eT) { safeLog(null, 'e', "catch " + String(eT)); }
            }
        }
    }));
 } catch(eClk0) { safeLog(null, 'e', "catch " + String(eClk0)); }

// # 工具函数：安全字符串

// # 工具函数：导出快捷方式图标到 shortcut_icons 并返回路径



// # 数据拉取：枚举 userId + packages + LauncherApps.getShortcuts
function __scLoadAllItems() {
    // 这段代码的主要内容/用途：尽力枚举系统已知快捷方式，失败则返回空数组（不影响主流程）。
    var items = [];
    try {
        // # userId 来自 /data/system_ce（和 shortcuts.js 同源思路）
        var users = [];
        try {
            // # 使用动态获取的系统用户目录（适配不同 ROM）
            var basePath = "/data/system_ce";
            try {
                // 优先使用已定义的 getSystemUserDir（如果在同一作用域）
                if (typeof getSystemUserDir === "function") {
                    basePath = getSystemUserDir();
                }
             } catch(eGSD) { safeLog(null, 'e', "catch " + String(eGSD)); }

            var base = new java.io.File(basePath);
            if (base.exists() && base.isDirectory()) {
                var arr = base.listFiles();
                if (arr) {
                    for (var i = 0; i < arr.length; i++) {
                        var f = arr[i];
                        if (!f || !f.isDirectory()) continue;
                        var nm = __scStr(f.getName());
                        if (!nm) continue;
                        var ok = true;
                        for (var j = 0; j < nm.length; j++) {
                            var c = nm.charCodeAt(j);
                            if (c < 48 || c > 57) { ok = false; break; }
                        }
                        if (ok) users.push(parseInt(nm, 10));
                    }
                }
            }
         } catch(eU0) { safeLog(null, 'e', "catch " + String(eU0)); }
        if (users.length === 0) users.push(0);
        // # 修复：与 shortcuts.js 一致，优先使用 shortcut 系统服务直连获取（可见性更全，能覆盖"微信小程序添加到桌面"这类入口）
        // # 说明：LauncherApps.getShortcuts 在部分 ROM/桌面上返回不全，因此这里先走 IShortcutService.getShortcuts。
        var shortcutSvc = null;
        try { shortcutSvc = android.os.ServiceManager.getService("shortcut"); } catch(eSvc0) { shortcutSvc = null; }
        var CFG_MATCH_ALL = 0x0000000F;

        var la = context.getSystemService(android.content.Context.LAUNCHER_APPS_SERVICE);
        // # 说明：la 作为兜底来源；若 la 也不可用则返回空数组，不影响新增按钮页其它功能。
        if (!la && !shortcutSvc) return items;
        var ShortcutQuery = android.content.pm.LauncherApps.ShortcutQuery;
        var UserHandle = android.os.UserHandle;

        // # 逐用户扫描 shortcut_service 的包名列表（快速筛）
        for (var ui = 0; ui < users.length; ui++) {
            var uid = users[ui];
            var pkgs = [];
            try {
                // # 使用动态获取的系统用户目录
                var basePath2 = "/data/system_ce";
                try {
                    if (typeof getSystemUserDir === "function") {
                        basePath2 = getSystemUserDir();
                    }
                 } catch(eGSD3) { safeLog(null, 'e', "catch " + String(eGSD3)); }

                var dir = new java.io.File(basePath2 + "/" + String(uid) + "/shortcut_service/packages");
                if (dir.exists() && dir.isDirectory()) {
                    var fs = dir.listFiles();
                    if (fs) {
                        for (var pi = 0; pi < fs.length; pi++) {
                            var pf = fs[pi];
                            if (!pf || !pf.isFile()) continue;
                            var pn = __scStr(pf.getName());
                            if (pn && pn.indexOf(".xml") > 0) {
                                var pkg = pn.substring(0, pn.length - 4);
                                if (pkg) pkgs.push(pkg);
                            }
                        }
                    }
                }
             } catch(eP0) { safeLog(null, 'e', "catch " + String(eP0)); }

            for (var p = 0; p < pkgs.length; p++) {
                var pkgName = pkgs[p];
                if (!pkgName) continue;

                // # 优先走 shortcut 服务直连
                if (shortcutSvc) {
                    try {
                        var slice = null;
                        try { slice = shortcutSvc.getShortcuts(String(pkgName), CFG_MATCH_ALL, parseInt(String(uid), 10)); } catch(eS0) { slice = null; }
                        if (slice) {
                            var listObj = null;
                            try { listObj = slice.getList(); } catch(eS1) { listObj = null; }
                            if (listObj) {
                                try {
                                    var sz = listObj.size();
                                    for (var si0 = 0; si0 < sz; si0++) {
                                        var info0 = null;
                                        try { info0 = listObj.get(si0); } catch(eS2) { info0 = null; }
                                        if (!info0) continue;

                                        var sid0 = "";
                                        var slb0 = "";
                                        try { sid0 = __scStr(info0.getId()); } catch(eId0) { sid0 = ""; }
                                        try { slb0 = __scStr(info0.getShortLabel()); } catch(eLb0) { slb0 = ""; }

                                        // # 取启动 Intent（用于 Shell am start 方案，桌面移除后仍可启动）
                                        var iu0 = "";
                                        try {
                                            var it0 = info0.getIntent ? info0.getIntent() : null;
                                            if (it0) {
                                                var s0 = String(it0.toUri(0));
                                                iu0 = (s0 && s0.indexOf("#Intent") === 0) ? ("intent:" + s0) : s0;
                                            }
                                        } catch(eIU0) { iu0 = ""; }

                                        items.push({
                                            userId: uid,
                                            pkg: __scStr(pkgName),
                                            shortcutId: sid0,
                                            label: slb0,
                                            intentUri: iu0,
                                            shortcutInfo: info0
                                        });

                                        // # 安全阈值：避免极端情况下数据量过大导致 UI/内存压力
                                        if (items.length > 5000) return items;
                                    }
                                 } catch(eS3) { safeLog(null, 'e', "catch " + String(eS3)); }
                                // # 已拿到则直接处理下一个包，避免重复从 LauncherApps 再取一遍
                                continue;
                            }
                        }
                    } catch(eSvc1) {
                        // ignore and fallback to LauncherApps
                    }
                }
                // # 兜底：若没有 LauncherApps 服务，则无法走 fallback，直接跳过（上面 shortcutSvc 已尽力）
                if (!la) continue;
                var q = new ShortcutQuery();
                try { q.setPackage(pkgName);  } catch(eQ0) { safeLog(null, 'e', "catch " + String(eQ0)); }
                // # QueryFlags：尽量全拿（逐个 try，避免 ROM 缺字段）
                try {
                    var qFlags = 0;
                    try { qFlags = qFlags | ShortcutQuery.FLAG_MATCH_DYNAMIC;  } catch(eF1) { safeLog(null, 'e', "catch " + String(eF1)); }
                    try { qFlags = qFlags | ShortcutQuery.FLAG_MATCH_PINNED;  } catch(eF2) { safeLog(null, 'e', "catch " + String(eF2)); }
                    try { qFlags = qFlags | ShortcutQuery.FLAG_MATCH_MANIFEST;  } catch(eF3) { safeLog(null, 'e', "catch " + String(eF3)); }
                    try { qFlags = qFlags | ShortcutQuery.FLAG_MATCH_CACHED;  } catch(eF4) { safeLog(null, 'e', "catch " + String(eF4)); }
                    try { q.setQueryFlags(qFlags);  } catch(eF5) { safeLog(null, 'e', "catch " + String(eF5)); }
                 } catch(eF0) { safeLog(null, 'e', "catch " + String(eF0)); }

                var uh = null;
                try { uh = UserHandle.of(parseInt(String(uid), 10)); } catch(eUH) { uh = null; }

                var list = null;
                try { list = la.getShortcuts(q, uh ? uh : android.os.Process.myUserHandle()); } catch(eGS) { list = null; }
                if (!list) continue;

                for (var si = 0; si < list.size(); si++) {
                    var info = null;
                    try { info = list.get(si); } catch(eG1) { info = null; }
                    if (!info) continue;

                    var sid = "";
                    var slb = "";
                    try { sid = __scStr(info.getId()); } catch(eId) { sid = ""; }
                    try { slb = __scStr(info.getShortLabel()); } catch(eLb) { slb = ""; }

                    // # 取启动 Intent（用于 Shell am start 方案，桌面移除后仍可启动）
                    var iu = "";
                    try {
                        var it1 = info.getIntent ? info.getIntent() : null;
                        if (it1) {
                            var s1 = String(it1.toUri(0));
                            iu = (s1 && s1.indexOf("#Intent") === 0) ? ("intent:" + s1) : s1;
                        }
                    } catch(eIU1) { iu = ""; }

                    items.push({
                                userId: uid,
                                pkg: __scStr(pkgName),
                                shortcutId: sid,
                                label: slb,
                                // # 新增：保留 ShortcutInfo，用于取快捷方式 icon
                                shortcutInfo: info
                            });

                    // # 安全阈值：避免极端情况下数据量过大导致 UI/内存压力
                    if (items.length > 5000) return items;
                }
            }
        }
     } catch(eAll) { safeLog(null, 'e', "catch " + String(eAll)); }
    return items;
}

// =======================【快捷方式选择列表：渲染去抖】======================
// # 这段代码的主要内容/用途：对搜索输入触发的列表刷新做轻量去抖（50ms 合并一次），减少频繁 notifyDataSetChanged 与重复过滤带来的卡顿/内存抖动。
// # 注意：只优化刷新时机，不改变任何数据/显示逻辑，确保功能与 UI 观感完全一致。
var __scRenderHandler = null;
var __scRenderRunnable = null;

function __scRenderListNow(query) {
    // 这段代码的主要内容/用途：根据搜索关键字刷新 ListView 数据（不再手工 addView），确保列表框内可稳定纵向滚动。
    try {
        var q = __scLower(__scStr(query));

        // # 性能优化：相同查询不重复刷新（减少 notifyDataSetChanged 频率）
        try {
            // # 修复：首次展开时列表可能还未完成首帧渲染，不能因为"查询相同"而跳过 notifyDataSetChanged
            // # 说明：避免出现"展开后空白，需要触摸滑动才显示"的现象（功能/UI不变，只保证首帧必渲染）
            var hasRendered = false;
            try { hasRendered = !!scInlineState.__scHasRendered; } catch(eHr0) { hasRendered = false; }
            if (hasRendered && scInlineState.__scLastQuery === q && scInlineState.__scLastSrcSize === ((scInlineState.allItems || []).length)) {
                return;
            }
         } catch(eSame0) { safeLog(null, 'e', "catch " + String(eSame0)); }
        scInlineState.__scLastQuery = q;
        try { scInlineState.__scLastSrcSize = (scInlineState.allItems || []).length; } catch(eSz0) { scInlineState.__scLastSrcSize = 0; }

        var src = scInlineState.allItems || [];
        var out = [];
        if (!q) {
            for (var i = 0; i < src.length; i++) out.push(src[i]);
        } else {
            for (var i = 0; i < src.length; i++) {
                var it = src[i];
                if (!it) continue;
                var hit = false;
                try {
                    if (__scLower(it.label).indexOf(q) >= 0) hit = true;
                    else if (__scLower(it.pkg).indexOf(q) >= 0) hit = true;
                    else if (__scLower(__scGetAppLabel(it.pkg)).indexOf(q) >= 0) hit = true;
                    else if (__scLower(it.shortcutId).indexOf(q) >= 0) hit = true;
                 } catch(eM) { safeLog(null, 'e', "catch " + String(eM)); }
                if (hit) out.push(it);
                // # 性能保护：搜索时最多显示 300 条，避免 system_server 过载
                if (out.length >= 300) break;
            }
        }

        // 更新适配器数据
        __scData = out;
        try { __scAdapter.notifyDataSetChanged();  } catch(eN0) { safeLog(null, 'e', "catch " + String(eN0)); }

        // # 修复：确保首次展开时 ListView 立即刷新布局，不依赖用户触摸触发重绘
        try { scInlineState.__scHasRendered = true;  } catch(eHr1) { safeLog(null, 'e', "catch " + String(eHr1)); }
        try {
            scList.post(new java.lang.Runnable({
                run: function() {
                    try { scList.invalidateViews();  } catch(eInv0) { safeLog(null, 'e', "catch " + String(eInv0)); }
                    try { scList.requestLayout();  } catch(eReq0) { safeLog(null, 'e', "catch " + String(eReq0)); }
                }
            }));
        } catch(ePostInv0) {
            try { scList.invalidateViews();  } catch(eInv1) { safeLog(null, 'e', "catch " + String(eInv1)); }
        }

        // 提示信息
        try {
            if (out.length === 0) scHint.setText("无匹配结果（共 " + src.length + " 条）");
            else scHint.setText("共 " + src.length + " 条，显示 " + out.length + " 条（在框内滑动）");
         } catch(eH1) { safeLog(null, 'e', "catch " + String(eH1)); }
    } catch(e0) {
        try { scHint.setText("渲染失败: " + e0);  } catch(e1) { safeLog(null, 'e', "catch " + String(e1)); }
    }
}

function __scRenderList(query) {
    // # 这段代码的主要内容/用途：渲染去抖入口（合并 50ms 内的多次刷新请求）
    try { scInlineState.__scPendingQuery = query;  } catch(ePQ0) { safeLog(null, 'e', "catch " + String(ePQ0)); }

    // # 初始化 Handler（主线程）
    try {
        if (!__scRenderHandler) {
            __scRenderHandler = new android.os.Handler(android.os.Looper.getMainLooper());
        }
    } catch(eH0) { __scRenderHandler = null; }

    // # 取消上一次未执行的刷新
    try {
        if (__scRenderHandler && __scRenderRunnable) {
            __scRenderHandler.removeCallbacks(__scRenderRunnable);
        }
     } catch(eRm0) { safeLog(null, 'e', "catch " + String(eRm0)); }

    // # 创建新的 runnable（始终使用最新 query）
    __scRenderRunnable = new java.lang.Runnable({
        run: function() {
            var q0 = "";
            try { q0 = scInlineState.__scPendingQuery; } catch(ePQ1) { q0 = ""; }
            __scRenderListNow(q0);
        }
    });

    // # 延迟合并（50ms）：输入法连击/快速打字不会重复做过滤与刷新
    try {
        if (__scRenderHandler) __scRenderHandler.postDelayed(__scRenderRunnable, 50);
        else __scRenderListNow(query);
    } catch(ePost0) {
        __scRenderListNow(query);
    }
}


function __scEnsureLoadedAndRender() {
    // 这段代码的主要内容/用途：首次展开时异步加载数据，加载完成后渲染；再次展开直接渲染。
    if (scInlineState.loading) return;

    if (scInlineState.loaded) {
        // # 新增：自动刷新策略（不影响原功能）
        // 说明：你把"微信小程序添加到桌面"后，旧缓存不会自动出现；这里用时间阈值+手动强刷解决。
        var nowTs = 0;
        try { nowTs = new Date().getTime(); } catch(eT0) { nowTs = 0; }
        var stale = false;
        try { stale = (scInlineState.loadedTs > 0) && (nowTs > 0) && ((nowTs - scInlineState.loadedTs) > 8000); } catch(eSt) { stale = false; }

        if (!scInlineState.forceReload && !stale) {
            // # 优化：展开时立即渲染一次（不走 50ms 去抖），避免出现"展开空白，触摸后才显示"
            __scRenderListNow(scSearchWrap.getValue());
            return;
        }

        // 需要刷新：标记为未加载并继续走下面的加载流程
        scInlineState.forceReload = false;
        scInlineState.loaded = false;
    }

    scInlineState.loading = true;
    try { scHint.setText("正在加载快捷方式列表...");  } catch(eH0) { safeLog(null, 'e', "catch " + String(eH0)); }

    new java.lang.Thread(new java.lang.Runnable({
        run: function() {
            var arr = [];
            try { arr = __scLoadAllItems(); } catch(eL0) { arr = []; }
            // 回到 UI 线程：此处运行在 system_server 的 WM/UI 线程不一定有 Looper，因此用 viewerPanel 的 handler 托管更稳。
            try {
                self.runOnUiThreadSafe(function() {
                    scInlineState.loading = false;
                    scInlineState.loaded = true;
                    try { scInlineState.loadedTs = new Date().getTime(); } catch(eTs1) { scInlineState.loadedTs = 0; }
                    try { scInlineState.loadedTs = new Date().getTime(); } catch(eTs0) { scInlineState.loadedTs = 0; }
                    scInlineState.allItems = arr || [];
                    // # 优化：数据加载完成后立即渲染首帧，避免首次展开空白
                    __scRenderListNow(scSearchWrap.getValue());
                });
            } catch(eUi) {
                // # 兜底：如果 self.runOnUiThreadSafe 不存在/不可用，使用 View.post 回到当前面板的 UI 线程刷新
                try {
                    scInlineState.loading = false;
                    scInlineState.loaded = true;
                    scInlineState.allItems = arr || [];
                 } catch(eUi2) { safeLog(null, 'e', "catch " + String(eUi2)); }

                // # 关键修复：首次展开时也要触发渲染，否则会一直停留在"正在加载..."
                try {
                    // 优先用 ListView.post：保证在拥有 Looper 的 UI 线程执行
                    scList.post(new java.lang.Runnable({
                        run: function() {
                            try { __scRenderListNow(scSearchWrap.getValue());  } catch(eR0) { safeLog(null, 'e', "catch " + String(eR0)); }
                        }
                    }));
                } catch(ePost0) {
                    // 再兜底：直接调用（若当前线程本就有 Looper 也能工作）
                    try { __scRenderList(scSearchWrap.getValue());  } catch(eR1) { safeLog(null, 'e', "catch " + String(eR1)); }
                }
            }
        }
    })).start();
}

// # 折叠点击逻辑
scHeader.setClickable(true);
scHeader.setOnClickListener(new android.view.View.OnClickListener({
    onClick: function(v) {
        try {
            scInlineState.expanded = !scInlineState.expanded;
            if (scInlineState.expanded) {
                scBody.setVisibility(android.view.View.VISIBLE);
                // # 优化：展开时主动触发布局与重绘，避免需要触摸滑动才显示列表
                try {
                    scList.post(new java.lang.Runnable({
                        run: function() {
                            try { scList.requestLayout();  } catch(eRq0) { safeLog(null, 'e', "catch " + String(eRq0)); }
                            try { scList.invalidateViews();  } catch(eIv0) { safeLog(null, 'e', "catch " + String(eIv0)); }
                        }
                    }));
                 } catch(ePostRq0) { safeLog(null, 'e', "catch " + String(ePostRq0)); }
                scArrowTv.setText("▲");
                __scEnsureLoadedAndRender();
            } else {
                scBody.setVisibility(android.view.View.GONE);
                scArrowTv.setText("▼");
            }
         } catch(eTg) { safeLog(null, 'e', "catch " + String(eTg)); }
    }
}));

// # 搜索变化即刷新（内联列表最多 120 条，搜索可快速定位）
try {
    scSearchWrap.input.addTextChangedListener(new android.text.TextWatcher({
        beforeTextChanged: function() {},
        onTextChanged: function() {},
        afterTextChanged: function(s) {
            // 这段代码的主要内容/用途：搜索输入做去抖（debounce），避免每敲一个字就全量过滤导致卡顿与高占用。
            try {
                if (!scInlineState.loaded) return;
                var q = __scStr(s);

                // # 取消上一次排队的渲染
                try {
                    if (scInlineState.__scSearchRunnable) {
                        scList.removeCallbacks(scInlineState.__scSearchRunnable);
                    }
                 } catch(eRm) { safeLog(null, 'e', "catch " + String(eRm)); }

                scInlineState.__scSearchRunnable = new java.lang.Runnable({
                    run: function() {
                        try {
                            // # 再次确认当前查询未变化（防抖期间用户继续输入）
                            __scRenderList(q);
                         } catch(eRun) { safeLog(null, 'e', "catch " + String(eRun)); }
                    }
                });

                // # 180ms 防抖：既跟手又不抖 CPU
                try { scList.postDelayed(scInlineState.__scSearchRunnable, 180); } catch(ePost) { __scRenderList(q); }
             } catch(eW) { safeLog(null, 'e', "catch " + String(eW)); }
        }
    }));
 } catch(eTw) { safeLog(null, 'e', "catch " + String(eTw)); }

// # 组装到 shortcutWrap
shortcutWrap.addView(scHeader);
shortcutWrap.addView(scBody);

    dynamicContainer.addView(shortcutWrap);

// 联动逻辑
    function updateVisibility(typeVal) {
        shellWrap.setVisibility(typeVal === "shell" ? android.view.View.VISIBLE : android.view.View.GONE);
        appWrap.setVisibility(typeVal === "app" ? android.view.View.VISIBLE : android.view.View.GONE);
        bcWrap.setVisibility(typeVal === "broadcast" ? android.view.View.VISIBLE : android.view.View.GONE);
        shortcutWrap.setVisibility(typeVal === "shortcut" ? android.view.View.VISIBLE : android.view.View.GONE);
    }

    // 动作类型初始刷新：首次进入编辑页时立刻根据默认选中项显示对应输入区
    applySelectedType(selectedTypeVal);

    var editInlineNotice = new android.widget.TextView(context);
    editInlineNotice.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    editInlineNotice.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
    editInlineNotice.setGravity(android.view.Gravity.CENTER_VERTICAL);
    editInlineNotice.setVisibility(android.view.View.GONE);
    form.addView(editInlineNotice, new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT));

    scroll.addView(form);
    var scrollLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 0);
    scrollLp.weight = 1;
    scroll.setLayoutParams(scrollLp);
    panel.addView(scroll);

    // 底部
    var bottomBar = new android.widget.LinearLayout(context);
    bottomBar.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    bottomBar.setGravity(android.view.Gravity.CENTER_VERTICAL);
    bottomBar.setPadding(self.dp(4), self.dp(8), self.dp(4), self.dp(8));
    bottomBar.setBackground(self.ui.createRoundDrawable(isDark ? C.bgDark : C.bgLight, self.dp(12)));

    var btnCancel = self.ui.createFlatButton(self, "不改了", subTextColor, function() {
        self.state.editingButtonIndex = null;
        if (self.state.toolAppActive && self.popToolAppPage) {
            self.state.keepBtnEditorState = true;
            self.popToolAppPage("button_edit_cancel");
        } else refreshPanel();
    });
    var btnCancelLp = new android.widget.LinearLayout.LayoutParams(0, self.dp(44));
    btnCancelLp.weight = 1;
    btnCancelLp.rightMargin = self.dp(8);
    bottomBar.addView(btnCancel, btnCancelLp);

    var btnSave = self.ui.createSolidButton(self, "先存起来", T.primary, T.onPrimary, function() {
        try {
            var newBtn = targetBtn;
            newBtn.title = inputTitle.getValue();

            // # 根据选中的图标类型保存对应的值（二选一）
            var iconTypeSelected = rbIconShortX.isChecked() ? "shortx" : "file";
            if (iconTypeSelected === "file") {
                var ip = inputIconPath.getValue();
                if (ip) newBtn.iconPath = ip; else delete newBtn.iconPath;
                delete newBtn.iconResName; // 清除 ShortX 图标
            } else {
                var sxIcon = self.normalizeShortXIconName(currentShortXIconName, false);
                if (sxIcon) newBtn.iconResName = sxIcon; else delete newBtn.iconResName;
                // # 保存 ShortX 图标颜色：优先使用 targetBtn.iconTint（颜色选择器已更新），回退到输入框
                var sxTint = currentShortXIconTint || targetBtn.iconTint || "";
                if (!sxTint) {
                    try { sxTint = inputShortXIconTint.getValue();  } catch(eGetTint) { safeLog(null, 'e', "catch " + String(eGetTint)); }
                }
                if (sxTint && sxTint.length > 0) newBtn.iconTint = sxTint; else delete newBtn.iconTint;
                delete newBtn.iconPath; // 清除文件路径
            }

            newBtn.type = selectedTypeVal || "shell";

            // 清理旧数据
            delete newBtn.cmd; delete newBtn.cmd_b64; delete newBtn.root;
            delete newBtn.pkg;
            delete newBtn.action; delete newBtn.extras; delete newBtn.extra;
            delete newBtn.uri;
            delete newBtn.shortcutId;
            delete newBtn.shortcutRunMode;
            delete newBtn.launchUserId;

            var isValid = true;
            var validationMessage = "";
            function markInvalid(inputObj, msg) {
                isValid = false;
                if (!validationMessage) validationMessage = String(msg || "请补全必填项");
                try { if (inputObj && inputObj.setError) inputObj.setError(String(msg || "必填")); } catch(eMark) { safeLog(null, 'e', "catch " + String(eMark)); }
            }

            if (newBtn.type === "shell") {
                var c = inputShell.getValue();
                if (!c) { markInvalid(inputShell, "请输入命令"); }
                else { inputShell.setError(null); newBtn.cmd = c; newBtn.cmd_b64 = encodeBase64Utf8(c); newBtn.root = true; }
            } else if (newBtn.type === "app") {
                var p = inputPkg.getValue();
                if (!p) { markInvalid(inputPkg, "请输入包名"); }
                else { inputPkg.setError(null); newBtn.pkg = p; }// # 保存：启动用户ID（可选）
try {
    var au = inputAppLaunchUser.getValue();
    au = (au != null) ? String(au).trim() : "";
    if (au && au.length > 0) {
        var aui = parseInt(au, 10);
        if (!isNaN(aui)) newBtn.launchUserId = aui;
    }
 } catch(eAU) { safeLog(null, 'e', "catch " + String(eAU)); }

            } else if (newBtn.type === "broadcast") {
                var a = inputAction.getValue();
                if (!a) { markInvalid(inputAction, "请输入 Action"); }
                else { inputAction.setError(null); newBtn.action = a; }

                var ex = inputExtras.getValue();
                if (ex) {
                    try { newBtn.extras = JSON.parse(ex); inputExtras.setError(null); }
                    catch(e) { markInvalid(inputExtras, "JSON 格式错误"); }
                }
            } else if (newBtn.type === "shortcut") {
                var sp = inputScPkg.getValue();
                var sid = inputScId.getValue();
                if (!sp) { markInvalid(inputScPkg, "请先选择快捷方式"); }
                else { inputScPkg.setError(null); newBtn.pkg = sp; }
                if (!sid) { markInvalid(inputScId, "请先选择快捷方式"); }
                else { inputScId.setError(null); newBtn.shortcutId = sid; }
                // # 保存：同时保存 intentUri/userId，供 JavaScript(startActivityAsUser) 脚本使用（锁定主/分身）
                try { if (scSelectedIntentUri && scSelectedIntentUri.length > 0) newBtn.intentUri = String(scSelectedIntentUri);  } catch(eSIU2) { safeLog(null, 'e', "catch " + String(eSIU2)); }
                try { newBtn.userId = scSelectedUserId; } catch(eSUID2) { newBtn.userId = 0; }
                // # 保存：快捷方式 JS 启动代码（自动生成/可手动编辑）
                try { if (inputScJsCode) newBtn.shortcutJsCode = String(inputScJsCode.getValue());  } catch(eSaveJs) { safeLog(null, 'e', "catch " + String(eSaveJs)); }
                // # 保存：快捷方式仅使用 JavaScript 执行（取消 Shell/兜底）
                newBtn.shortcutRunMode = "js";
            }
            if (!isValid) {
                updateInlineNotice(editInlineNotice, validationMessage || "请补全必填项", "error");
                try { scroll.post(new java.lang.Runnable({ run: function() { try { scroll.fullScroll(android.view.View.FOCUS_DOWN); } catch(eScrollNotice) {} } })); } catch(ePostNotice) {}
                return;
            }



            if (editIdx === -1) {
                buttons.push(newBtn);
            } else {
                buttons[editIdx] = newBtn;
            }

            // # 立即持久化，避免 refreshPanel 重新加载时丢失（keepBtnEditorState=false 会触发重新克隆）
            ConfigManager.saveButtons(buttons);

            self.state.editingButtonIndex = null;
            setButtonEditorNotice("已暂存，请在列表页点击保存布置", "ok");
            if (self.state.toolAppActive && self.popToolAppPage) {
                self.state.keepBtnEditorState = true;
                self.popToolAppPage("button_edit_save");
            } else refreshPanel();
        } catch (e) {
            updateInlineNotice(editInlineNotice, "暂存失败: " + e, "error");
            try { scroll.post(new java.lang.Runnable({ run: function() { try { scroll.fullScroll(android.view.View.FOCUS_DOWN); } catch(eScrollFail) {} } })); } catch(ePostFail) {}
        }
    });
    var btnSaveLp = new android.widget.LinearLayout.LayoutParams(0, self.dp(44));
    btnSaveLp.weight = 1;
    bottomBar.addView(btnSave, btnSaveLp);

    var bottomLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    bottomLp.setMargins(0, self.dp(6), 0, self.dp(12));
    panel.addView(bottomBar, bottomLp);
  }

  return panel;
};






// Schema 编辑器已拆分到 th_14_schema_editor.js。
// 保留 th_14_panels.js 专注设置/按钮面板与共用 picker 外壳。



// =======================【弹出式选择器（WindowManager 覆盖层）】======================
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
  var T = PT ? PT.T : this.getAnimalIslandTheme();
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
  // 弹窗尺寸只做“内容可用的上限”，不要按屏幕比例强行拉满。
  // 上一版 84% 屏高会在高屏手机上显得过长；颜色面板内容交给 ScrollView 溢出滚动。
  var panelWidth = Math.round(sw * 0.92);
  var panelHeight = Math.min(self.dp(520), Math.round(sh * 0.68));
  if (panelWidth > self.dp(420)) panelWidth = self.dp(420);
  if (panelWidth < self.dp(300)) panelWidth = Math.min(sw - self.dp(16), self.dp(300));
  if (panelHeight > sh - self.dp(48)) panelHeight = sh - self.dp(48);
  if (panelHeight < self.dp(420)) panelHeight = Math.min(sh - self.dp(24), self.dp(420));

  var root = new android.widget.FrameLayout(context);
  root.setBackgroundColor(self.withAlpha(isDark ? 0xFF000000 : 0xFFFFFFFF, isDark ? 0.58 : 0.42));
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
            try { this.animate().cancel(); } catch(eCancel) {}
            try { this.setTranslationX(dx); } catch(eTx) {}
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
            var maxMove = Math.floor(panelWidth * 0.62);
            var tx = mx;
            if (tx > maxMove) tx = maxMove;
            if (tx < -maxMove) tx = -maxMove;
            this.setTranslationX(tx);
          }
          return true;
        }
        if (action === android.view.MotionEvent.ACTION_UP || action === android.view.MotionEvent.ACTION_CANCEL) {
          var ux = ev.getX() - popupBackDownX;
          var uy = ev.getY() - popupBackDownY;
          var okDir = (popupBackEdge === 0 && ux > self.dp(72)) || (popupBackEdge === 1 && ux < -self.dp(72));
          var ok = action === android.view.MotionEvent.ACTION_UP && popupBackMoved && okDir && Math.abs(ux) > Math.abs(uy) * 0.9;
          var dir = popupBackEdge === 1 ? -1 : 1;
          popupBackActive = false;
          popupBackEligible = false;
          popupBackMoved = false;
          popupBackEdge = -1;
          if (ok) {
            this.animate().translationX(dir * panelWidth).alpha(0.96).setDuration(150).withEndAction(new java.lang.Runnable({ run: function() { closePopup(); } })).start();
          } else {
            this.animate().translationX(0).alpha(1).setDuration(160).start();
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
  card.setBackground(self.ui.createStrokeDrawable(T.card, self.withAlpha(T.primaryDeep, isDark ? 0.28 : 0.22), self.dp(1), self.dp(24)));
  card.setPadding(self.dp(14), self.dp(12), self.dp(14), self.dp(12));
  try { card.setElevation(self.dp(10)); } catch(eCardElev) {}

  var header = new android.widget.LinearLayout(context);
  header.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  header.setGravity(android.view.Gravity.CENTER_VERTICAL);
  var titleTv = new android.widget.TextView(context);
  titleTv.setText("❧ " + title + " ❧");
  titleTv.setTextColor(T.text);
  titleTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
  titleTv.setTypeface(null, android.graphics.Typeface.BOLD);
  header.addView(titleTv, new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1));

  var closeBtn = self.ui.createFlatButton(self, "✕", T.primaryDeep, function() {
    closePopup();
  });
  closeBtn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 18);
  closeBtn.setTypeface(null, android.graphics.Typeface.BOLD);
  closeBtn.setGravity(android.view.Gravity.CENTER);
  closeBtn.setPadding(0, 0, 0, 0);
  try { closeBtn.setMinWidth(self.dp(44)); closeBtn.setMinHeight(self.dp(44)); } catch(eCloseMin) {}
  try { closeBtn.setBackground(self.ui.createStrokeDrawable(T.primarySoft, self.withAlpha(T.primaryDeep, isDark ? 0.30 : 0.22), self.dp(1), self.dp(22))); } catch(eCloseBg) {}
  header.addView(closeBtn, new android.widget.LinearLayout.LayoutParams(self.dp(44), self.dp(44)));
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

  function closePopup() {
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

// 兼容旧入口：旧 ToolHub.js 不会自动加载新增 th_14_color_picker.js，
// 因此这里保留颜色选择器挂载；新入口加载独立模块时会用同名实现覆盖。
FloatBallAppWM.prototype.showColorPickerPopup = function(opts) {
  var self = this;
  var opt = opts || {};
  var currentColor = String(opt.currentColor || "");
  var currentIconName = String(opt.currentIconName || "");
  var onSelect = (typeof opt.onSelect === "function") ? opt.onSelect : null;
  var onDismiss = (typeof opt.onDismiss === "function") ? opt.onDismiss : null;

  var PT = this.getIslandPickerTheme ? this.getIslandPickerTheme() : null;
  var isDark = PT ? PT.isDark : this.isDarkTheme();
  var C = this.ui.colors;
  var T = PT ? PT.T : this.getAnimalIslandTheme();
  var textColor = PT ? PT.text : (isDark ? C.textPriDark : C.textPriLight);
  var subTextColor = PT ? PT.sub : (isDark ? C.textSecDark : C.textSecLight);

  function getThemeTintHex() {
    try {
      if (self.ui.colors && self.ui.colors.accent) {
        var c = self.ui.colors.accent;
        return "#" + ("00000000" + (c >>> 0).toString(16)).slice(-8);
      }
     } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    return "#FF4081";
  }

  function buildArgbHex(alphaByte, rgbHex) {
    var a = ("00" + (Math.max(0, Math.min(255, Number(alphaByte || 0))) >>> 0).toString(16)).slice(-2);
    var rgb = String(rgbHex || "000000").replace(/^#/, "");
    if (rgb.length === 3) rgb = rgb.split("").map(function(c){ return c+c; }).join("");
    if (rgb.length > 6) rgb = rgb.slice(-6);
    while (rgb.length < 6) rgb = "0" + rgb;
    return "#" + a + rgb;
  }

  function extractTintRgbHex(hex) {
    var h = String(hex || "").replace(/^#/, "");
    if (h.length >= 8) return h.slice(-6);
    if (h.length === 6) return h;
    if (h.length === 3) return h.split("").map(function(c){ return c+c; }).join("");
    return "000000";
  }

  function extractTintAlphaByte(hex) {
    var h = String(hex || "").replace(/^#/, "");
    if (h.length >= 8) return parseInt(h.slice(0, 2), 16);
    return 255;
  }

  function normalizeTintColorValue(val) {
    var s = String(val || "").trim();
    if (!s) return "";
    if (s.charAt(0) === "#") s = s.substring(1);
    if (/^[0-9A-Fa-f]{1,8}$/.test(s)) {
      while (s.length < 6) s = "0" + s;
      if (s.length === 6) s = "FF" + s;
      else if (s.length > 8) s = s.substring(0, 8);
      return "#" + s.toUpperCase();
    }
    return "";
  }

  var commonTintHexValues = [
    "#FFFF0000", "#FFFF5722", "#FFFF9800", "#FFFFC107", "#FFFFEB3B",
    "#FFCDDC39", "#FF8BC34A", "#FF4CAF50", "#FF009688", "#FF00BCD4",
    "#FF03A9F4", "#FF2196F3", "#FF3F51B5", "#FF673AB7", "#FF9C27B0",
    "#FFE91E63", "#FF795548", "#FF9E9E9E", "#FF607D8B", "#FF000000", "#FFFFFFFF"
  ];

  // ========== 最近使用颜色 ==========
  var RECENT_COLORS_KEY = "color_picker_recent";
  var MAX_RECENT_COLORS = 8;
  var recentColors = [];
  try {
    var recentSaved = self.loadPanelState(RECENT_COLORS_KEY);
    if (recentSaved && recentSaved.colors && recentSaved.colors.length) {
      var rc;
      for (rc = 0; rc < recentSaved.colors.length && rc < MAX_RECENT_COLORS; rc++) {
        var rn = normalizeTintColorValue(recentSaved.colors[rc], false);
        if (rn) recentColors.push(rn);
      }
    }
   } catch(eRecentLoad) { safeLog(null, 'e', "catch " + String(eRecentLoad)); }

  function saveRecentColors() {
    try {
      self.savePanelState(RECENT_COLORS_KEY, { colors: recentColors.slice(0, MAX_RECENT_COLORS) });
     } catch(eRecentSave) { safeLog(null, 'e', "catch " + String(eRecentSave)); }
  }

  function pushRecentColor(hex) {
    var normalized = normalizeTintColorValue(hex, false);
    if (!normalized) return;
    var next = [normalized];
    var i;
    for (i = 0; i < recentColors.length; i++) {
      if (recentColors[i] !== normalized) {
        next.push(recentColors[i]);
      }
      if (next.length >= MAX_RECENT_COLORS) break;
    }
    recentColors = next;
    saveRecentColors();
  }

  var selectedColor = currentColor;
  var isFollowTheme = !currentColor;
  var currentBaseRgbHex = extractTintRgbHex(currentColor);
  var currentAlphaByte = extractTintAlphaByte(currentColor);

  var popupResult = self.showPopupOverlay({
    title: "换颜色",
    onDismiss: onDismiss,
    builder: function(content, closePopup) {
      // 图标预览区
      var previewRow = new android.widget.LinearLayout(context);
      previewRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
      previewRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
      previewRow.setPadding(self.dp(12), self.dp(10), self.dp(12), self.dp(10));
      previewRow.setBackground(self.ui.createStrokeDrawable(T.primarySoft, self.withAlpha(T.primaryDeep, isDark ? 0.24 : 0.18), self.dp(1), self.dp(18)));

      var previewIv = new android.widget.ImageView(context);
      previewIv.setLayoutParams(new android.widget.LinearLayout.LayoutParams(self.dp(48), self.dp(48)));
      previewIv.setScaleType(android.widget.ImageView.ScaleType.FIT_CENTER);
      previewRow.addView(previewIv);

      var previewLabel = new android.widget.TextView(context);
      previewLabel.setText("小图标试衣间");
      previewLabel.setTextColor(subTextColor);
      previewLabel.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      previewLabel.setPadding(self.dp(12), 0, 0, 0);
      previewRow.addView(previewLabel);

      content.addView(previewRow);

      function updatePreview() {
        try {
          var dr = null;
          if (currentIconName) {
            try { dr = self.getShortXIconDrawable(currentIconName);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
          }
          if (dr) {
            if (!isFollowTheme && selectedColor) {
              try {
                var parsed = android.graphics.Color.parseColor(selectedColor);
                dr.setColorFilter(parsed, android.graphics.PorterDuff.Mode.SRC_IN);
               } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
            } else {
              try { dr.clearColorFilter();  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
            }
            previewIv.setImageDrawable(dr);
          } else {
            previewIv.setImageDrawable(null);
          }
         } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
      }
      updatePreview();

      // ========== 最近使用颜色 ==========
      var recentTitle = new android.widget.TextView(context);
      recentTitle.setText("最近用过的小颜色");
      recentTitle.setTextColor(subTextColor);
      recentTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      recentTitle.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(4));
      content.addView(recentTitle);

      var recentGrid = new android.widget.GridLayout(context);
      recentGrid.setColumnCount(8);
      recentGrid.setPadding(self.dp(8), self.dp(4), self.dp(8), self.dp(4));
      content.addView(recentGrid);

      var recentEmptyTv = new android.widget.TextView(context);
      recentEmptyTv.setText("还没有最近颜色");
      recentEmptyTv.setTextColor(subTextColor);
      recentEmptyTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
      recentEmptyTv.setPadding(self.dp(12), self.dp(4), self.dp(12), self.dp(8));
      recentEmptyTv.setVisibility(android.view.View.GONE);
      content.addView(recentEmptyTv);

      function refreshRecentGrid() {
        try {
          recentGrid.removeAllViews();
          if (!recentColors.length) {
            recentEmptyTv.setVisibility(android.view.View.VISIBLE);
            return;
          }
          recentEmptyTv.setVisibility(android.view.View.GONE);
          var ri;
          for (ri = 0; ri < recentColors.length && ri < MAX_RECENT_COLORS; ri++) {
            (function(hex) {
              var cell = new android.widget.FrameLayout(context);
              var margin = self.dp(3);
              try {
                var lp = new android.widget.GridLayout.LayoutParams();
                lp.width = self.dp(28);
                lp.height = self.dp(28);
                lp.setMargins(margin, margin, margin, margin);
                cell.setLayoutParams(lp);
               } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

              var swatch = new android.view.View(context);
              swatch.setLayoutParams(new android.widget.FrameLayout.LayoutParams(android.widget.FrameLayout.LayoutParams.MATCH_PARENT, android.widget.FrameLayout.LayoutParams.MATCH_PARENT));
              try {
                var bg = new android.graphics.drawable.GradientDrawable();
                bg.setColor(android.graphics.Color.parseColor(hex));
                bg.setCornerRadius(self.dp(5));
                swatch.setBackground(bg);
               } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
              cell.addView(swatch);

              if (selectedColor === hex) {
                try {
                  var border = new android.graphics.drawable.GradientDrawable();
                  border.setColor(android.graphics.Color.TRANSPARENT);
                  border.setCornerRadius(self.dp(5));
                  border.setStroke(self.dp(2), T.primaryDeep);
                  cell.setForeground(border);
                 } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
              }

              cell.setOnClickListener(new android.view.View.OnClickListener({
                onClick: function() {
                  self.touchActivity();
                  isFollowTheme = false;
                  selectedColor = hex;
                  currentBaseRgbHex = extractTintRgbHex(hex);
                  currentAlphaByte = extractTintAlphaByte(hex);
                  updatePreview();
                  updateValueTv();
                  refreshRecentGrid();
                  refreshCommonGrid();
                  syncRgbSeeks();
                }
              }));
              recentGrid.addView(cell);
            })(recentColors[ri]);
          }
         } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
      }
      refreshRecentGrid();

      // 21 色常用颜色
      var commonTitle = new android.widget.TextView(context);
      commonTitle.setText("糖果常用色");
      commonTitle.setTextColor(subTextColor);
      commonTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      commonTitle.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(4));
      content.addView(commonTitle);

      var commonGrid = new android.widget.GridLayout(context);
      commonGrid.setColumnCount(7);
      commonGrid.setPadding(self.dp(8), self.dp(4), self.dp(8), self.dp(8));
      var ci;
      for (ci = 0; ci < commonTintHexValues.length; ci++) {
        (function(hex) {
          var cell = new android.widget.FrameLayout(context);
          var margin = self.dp(4);
          try {
            var lp = new android.widget.GridLayout.LayoutParams();
            lp.width = self.dp(32);
            lp.height = self.dp(32);
            lp.setMargins(margin, margin, margin, margin);
            cell.setLayoutParams(lp);
           } catch(e) { safeLog(null, 'e', "catch " + String(e)); }

          var swatch = new android.view.View(context);
          swatch.setLayoutParams(new android.widget.FrameLayout.LayoutParams(android.widget.FrameLayout.LayoutParams.MATCH_PARENT, android.widget.FrameLayout.LayoutParams.MATCH_PARENT));
          try {
            var bg = new android.graphics.drawable.GradientDrawable();
            bg.setColor(android.graphics.Color.parseColor(hex));
            bg.setCornerRadius(self.dp(6));
            swatch.setBackground(bg);
           } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
          cell.addView(swatch);

          if (selectedColor === hex) {
            try {
              var border = new android.graphics.drawable.GradientDrawable();
              border.setColor(android.graphics.Color.TRANSPARENT);
              border.setCornerRadius(self.dp(6));
              border.setStroke(self.dp(3), T.primaryDeep);
              cell.setForeground(border);
             } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
          }

          cell.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {
              self.touchActivity();
              isFollowTheme = false;
              selectedColor = hex;
              currentBaseRgbHex = extractTintRgbHex(hex);
              currentAlphaByte = extractTintAlphaByte(hex);
              updatePreview();
              updateValueTv();
              refreshRecentGrid();
              refreshCommonGrid();
              syncRgbSeeks();
            }
          }));
          commonGrid.addView(cell);
        })(commonTintHexValues[ci]);
      }
      content.addView(commonGrid);

      function refreshCommonGrid() {
        try {
          var count = commonGrid.getChildCount();
          var i;
          for (i = 0; i < count; i++) {
            var cell = commonGrid.getChildAt(i);
            if (!cell) continue;
            try { cell.setForeground(null);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
          }
          var idx = commonTintHexValues.indexOf(selectedColor);
          if (idx >= 0 && idx < count) {
            var matchedCell = commonGrid.getChildAt(idx);
            if (matchedCell) {
              try {
                var border = new android.graphics.drawable.GradientDrawable();
                border.setColor(android.graphics.Color.TRANSPARENT);
                border.setCornerRadius(self.dp(6));
                border.setStroke(self.dp(3), T.primaryDeep);
                matchedCell.setForeground(border);
               } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
            }
          }
         } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
      }

      // 颜色值显示
      var valueTv = new android.widget.TextView(context);
      valueTv.setTextColor(textColor);
      valueTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
      valueTv.setPadding(self.dp(12), self.dp(4), self.dp(12), self.dp(4));
      content.addView(valueTv);

      function updateValueTv() {
        valueTv.setText(isFollowTheme ? "当前：跟随岛屿主题" : ("当前：" + (selectedColor || "无")));
      }
      updateValueTv();

      // RGB 滑块
      var rgbLabels = ["R", "G", "B"];
      var rgbSeeks = [];
      var rgbValTvs = [];
      var ri;
      for (ri = 0; ri < 3; ri++) {
        (function(idx) {
          var row = new android.widget.LinearLayout(context);
          row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
          row.setGravity(android.view.Gravity.CENTER_VERTICAL);
          row.setPadding(self.dp(12), self.dp(4), self.dp(12), self.dp(4));

          var label = new android.widget.TextView(context);
          label.setText(rgbLabels[idx]);
          label.setTextColor(textColor);
          label.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
          label.setMinWidth(self.dp(20));
          row.addView(label);

          var seek = new android.widget.SeekBar(context);
          seek.setMax(255);
          var seekLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1);
          seekLp.setMargins(self.dp(8), 0, self.dp(8), 0);
          seek.setLayoutParams(seekLp);
          row.addView(seek);
          rgbSeeks.push(seek);

          var valTv = new android.widget.TextView(context);
          valTv.setTextColor(subTextColor);
          valTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
          valTv.setMinWidth(self.dp(28));
          row.addView(valTv);
          rgbValTvs.push(valTv);

          seek.setOnSeekBarChangeListener(new android.widget.SeekBar.OnSeekBarChangeListener({
            onProgressChanged: function(s, progress, fromUser) {
              if (!fromUser) return;
              valTv.setText(String(progress));
              var r = rgbSeeks[0].getProgress();
              var g = rgbSeeks[1].getProgress();
              var b = rgbSeeks[2].getProgress();
              var hex = ("00" + (r >>> 0).toString(16)).slice(-2) + ("00" + (g >>> 0).toString(16)).slice(-2) + ("00" + (b >>> 0).toString(16)).slice(-2);
              currentBaseRgbHex = hex;
              isFollowTheme = false;
              selectedColor = buildArgbHex(currentAlphaByte, currentBaseRgbHex);
              updatePreview();
              updateValueTv();
              refreshRecentGrid();
              refreshCommonGrid();
            },
            onStartTrackingTouch: function() {},
            onStopTrackingTouch: function() {}
          }));

          content.addView(row);
        })(ri);
      }

      function syncRgbSeeks() {
        try {
          var initR = parseInt(currentBaseRgbHex.slice(0, 2), 16) || 0;
          var initG = parseInt(currentBaseRgbHex.slice(2, 4), 16) || 0;
          var initB = parseInt(currentBaseRgbHex.slice(4, 6), 16) || 0;
          rgbSeeks[0].setProgress(initR);
          rgbSeeks[1].setProgress(initG);
          rgbSeeks[2].setProgress(initB);
          rgbValTvs[0].setText(String(initR));
          rgbValTvs[1].setText(String(initG));
          rgbValTvs[2].setText(String(initB));
         } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
      }
      syncRgbSeeks();

      // 透明度滑块
      var alphaRow = new android.widget.LinearLayout(context);
      alphaRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
      alphaRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
      alphaRow.setPadding(self.dp(12), self.dp(4), self.dp(12), self.dp(8));

      var alphaLabel = new android.widget.TextView(context);
      alphaLabel.setText("A");
      alphaLabel.setTextColor(textColor);
      alphaLabel.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      alphaLabel.setMinWidth(self.dp(20));
      alphaRow.addView(alphaLabel);

      var alphaSeek = new android.widget.SeekBar(context);
      alphaSeek.setMax(255);
      var alphaSeekLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1);
      alphaSeekLp.setMargins(self.dp(8), 0, self.dp(8), 0);
      alphaSeek.setLayoutParams(alphaSeekLp);
      alphaRow.addView(alphaSeek);

      var alphaValTv = new android.widget.TextView(context);
      alphaValTv.setTextColor(subTextColor);
      alphaValTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
      alphaValTv.setMinWidth(self.dp(28));
      alphaRow.addView(alphaValTv);

      alphaSeek.setOnSeekBarChangeListener(new android.widget.SeekBar.OnSeekBarChangeListener({
        onProgressChanged: function(s, progress, fromUser) {
          if (!fromUser) return;
          alphaValTv.setText(String(progress));
          currentAlphaByte = progress;
          isFollowTheme = false;
          selectedColor = buildArgbHex(currentAlphaByte, currentBaseRgbHex);
          updatePreview();
          updateValueTv();
          refreshRecentGrid();
          refreshCommonGrid();
        },
        onStartTrackingTouch: function() {},
        onStopTrackingTouch: function() {}
      }));

      alphaSeek.setProgress(currentAlphaByte);
      alphaValTv.setText(String(currentAlphaByte));
      content.addView(alphaRow);

      // 操作按钮：对齐设置页/按钮管理页的 chip + 主按钮视觉。
      function createColorPanelActionButton(label, primary, onClick) {
        var b = new android.widget.TextView(context);
        b.setText(label);
        b.setGravity(android.view.Gravity.CENTER);
        b.setSingleLine(true);
        b.setTypeface(null, android.graphics.Typeface.BOLD);
        try { b.setIncludeFontPadding(false); } catch(eFontPad) {}
        if (primary) {
          // 与设置页底部“保存布置”一致：主色胶囊、44dp 高、轻描边。
          b.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
          // 颜色面板里不用高饱和青色，改成更沉稳的深绿主按钮。
          b.setTextColor(android.graphics.Color.WHITE);
          b.setPadding(self.dp(18), 0, self.dp(18), 0);
          try { b.setMinHeight(self.dp(52)); } catch(eMinH1) {}
          try { b.setBackground(self.ui.createStrokeDrawable(T.primaryDeep, self.withAlpha(T.brown || T.primaryDeep, isDark ? 0.28 : 0.18), self.dp(1), self.dp(26))); } catch(eBg1) {}
          try { b.setElevation(self.dp(1)); } catch(eElev) {}
        } else {
          // 与设置页按钮一致：次级也用大圆角按钮，不再做小 chip。
          b.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
          // 次级按钮走设置页里的奶油/描边感，不再用薄荷绿底。
          b.setTextColor(T.brown || T.sub);
          b.setPadding(self.dp(16), 0, self.dp(16), 0);
          try { b.setMinHeight(self.dp(52)); } catch(eMinH2) {}
          try { b.setBackground(self.ui.createStrokeDrawable(T.card2 || T.card, self.withAlpha(T.stroke || T.brown, isDark ? 0.42 : 0.55), self.dp(1), self.dp(26))); } catch(eBg2) {}
          try { b.setElevation(self.dp(1)); } catch(eElev2) {}
        }
        try { b.setClickable(true); b.setFocusable(true); } catch(eClickable) {}
        b.setOnClickListener(new android.view.View.OnClickListener({
          onClick: function(v) {
            self.touchActivity();
            try { if (onClick) onClick(v); } catch(eBtn) { safeLog(self.L, 'e', "color panel action err=" + String(eBtn)); }
          }
        }));
        return b;
      }

      var actionRow = new android.widget.LinearLayout(context);
      actionRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
      actionRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
      actionRow.setPadding(self.dp(10), self.dp(10), self.dp(10), self.dp(12));

      var btnClear = createColorPanelActionButton("恢复默认", false, function() {
        isFollowTheme = true;
        selectedColor = "";
        updatePreview();
        updateValueTv();
        refreshRecentGrid();
        refreshCommonGrid();
        syncRgbSeeks();
        alphaSeek.setProgress(255);
        alphaValTv.setText("255");
        currentAlphaByte = 255;
      });
      var clearLp = new android.widget.LinearLayout.LayoutParams(0, self.dp(52));
      clearLp.weight = 1;
      clearLp.setMargins(0, 0, self.dp(6), 0);
      actionRow.addView(btnClear, clearLp);

      var btnOk = createColorPanelActionButton("保存颜色", true, function() {
        try {
          var finalColor = isFollowTheme ? "" : String(selectedColor || "");
          if (!isFollowTheme && selectedColor) {
            pushRecentColor(selectedColor);
          }
          if (typeof onSelect === "function") {
            try { onSelect(finalColor); } catch(eOnSelect) {
              safeLog(self.L, 'e', "colorPicker onSelect err=" + String(eOnSelect));
            }
          }
        } catch(e) {
          safeLog(self.L, 'e', "colorPicker confirm err=" + String(e));
        }
        closePopup();
      });
      var okLp = new android.widget.LinearLayout.LayoutParams(0, self.dp(52));
      okLp.weight = 1;
      okLp.setMargins(self.dp(6), 0, 0, 0);
      actionRow.addView(btnOk, okLp);

      content.addView(actionRow, new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
      ));
    }
  });

  return popupResult;
};



// =======================【查看器面板：UI】======================
