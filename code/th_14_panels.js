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

  if (String(groupKey || "") === "ball" && this.buildBallPreviewView) {
    try {
      var fixedPreview = this.buildBallPreviewView();
      var fixedPreviewLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
      fixedPreviewLp.setMargins(this.dp(2), this.dp(4), this.dp(2), this.dp(8));
      root.addView(fixedPreview, fixedPreviewLp);
    } catch(eFixedPreview) { safeLog(null, 'e', "catch " + String(eFixedPreview)); }
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
  var activeGroupKey = String(this.state.settingsGroupKey || "");

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

  if (activeGroupKey === "ball" && this.buildBallPreviewView) {
    try {
      var fixedPreview2 = this.buildBallPreviewView();
      var fixedPreviewLp2 = new android.widget.LinearLayout.LayoutParams(-1, -2);
      fixedPreviewLp2.setMargins(this.dp(2), this.dp(2), this.dp(2), this.dp(8));
      panel.addView(fixedPreview2, fixedPreviewLp2);
    } catch(eFixedPreview2) { safeLog(null, 'e', "catch " + String(eFixedPreview2)); }
  }

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
