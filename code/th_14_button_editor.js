// @version 1.0.1
// ToolHub - button manager/editor module
// Stage 4: button manager/list/editor main page split from th_14_panels.js.

var TOOLHUB_BUTTON_EDITOR_MODULE_LOADED = true;

FloatBallAppWM.prototype.matchesButtonManagerQuery = function(btnCfg, query) {
  try {
    var q = String(query || "").replace(/^\s+|\s+$/g, "").toLowerCase();
    if (!q) return true;
    var b = btnCfg || {};
    var hay = String(b.title || "") + " " + String(b.type || "") + " " + String(b.cmd || "") + " " + String(b.pkg || "") + " " + String(b.action || "") + " " + String(b.intent || "") + " " + String(b.shortcutName || "") + " " + String(b.iconResName || "");
    return hay.toLowerCase().indexOf(q) >= 0;
  } catch(e) { return true; }
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
  try { tv.setMinHeight(this.dp(48)); tv.setMinimumHeight(this.dp(48)); } catch(eMinH) {}
  try { tv.setMinWidth(this.dp(48)); tv.setMinimumWidth(this.dp(48)); } catch(eMinW) {}
  try { tv.setIncludeFontPadding(false); } catch(eFontPad) {}
  try { tv.setContentDescription(String(text || "")); } catch(eDesc) {}
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
  try { tv.setMinHeight(this.dp(48)); tv.setMinimumHeight(this.dp(48)); } catch(eMinH) {}
  try { tv.setMinWidth(this.dp(48)); tv.setMinimumWidth(this.dp(48)); } catch(eMinW) {}
  try { tv.setIncludeFontPadding(false); } catch(eFontPad) {}
  try { tv.setContentDescription(String(text || "")); } catch(eDesc) {}
  tv.setPadding(this.dp(8), 0, this.dp(8), 0);
  if (onClickFn) {
    tv.setOnClickListener(new android.view.View.OnClickListener({ onClick: function() {
      try { onClickFn(); } catch(eClick) { safeLog(null, 'e', "catch " + String(eClick)); }
    }}));
  }
  return tv;
};


FloatBallAppWM.prototype.getButtonManagerTypeLabel = function(btnCfg) {
  try {
    var t = String((btnCfg && btnCfg.type) ? btnCfg.type : "shell");
    if (t === "open_settings") return "设置";
    if (t === "app") return "应用";
    if (t === "broadcast") return "广播";
    if (t === "shortcut") return "快捷方式";
    if (t === "intent") return "Intent";
    return "Shell";
  } catch(e) { return "Shell"; }
};

FloatBallAppWM.prototype.getButtonManagerSummary = function(btnCfg) {
  try {
    var b = btnCfg || {};
    var t = String(b.type || "shell");
    if (t === "open_settings") return "打开 ToolHub 设置";
    if (t === "app") return String(b.pkg || "未填写包名");
    if (t === "broadcast") return String(b.action || "未填写 Action");
    if (t === "shortcut") return String(b.shortcutName || b.title || b.pkg || "快捷方式");
    if (t === "intent") return String(b.intent || b.uri || "Intent");
    var c = String(b.cmd || "");
    if (b.cmd_b64 && (!c || c.length === 0)) c = "已保存 Base64 命令";
    if (c.length > 36) c = c.substring(0, 36) + "...";
    return c || "Shell 命令";
  } catch(e) { return ""; }
};

FloatBallAppWM.prototype.matchesButtonManagerFilter = function(btnCfg, filter) {
  try {
    var f = String(filter || "all");
    var b = btnCfg || {};
    var enabled = (b.enabled === false) ? false : true;
    var t = String(b.type || "shell");
    if (f === "all") return true;
    if (f === "enabled") return enabled;
    if (f === "disabled") return !enabled;
    if (f === "intent") return t === "intent" || !!b.intent || !!b.uri;
    return t === f;
  } catch(e) { return true; }
};

FloatBallAppWM.prototype.createButtonManagerStatusChip = function(enabled, onClickFn) {
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var T = this.getAnimalIslandTheme();
  this.applySettingsTheme(T, isDark, C, this.state.pendingUserCfg || this.config);
  var tv = new android.widget.TextView(context);
  var ok = enabled !== false;
  tv.setText(ok ? "启用" : "暂停");
  tv.setGravity(android.view.Gravity.CENTER);
  tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  tv.setTypeface(null, android.graphics.Typeface.BOLD);
  tv.setTextColor(ok ? T.primaryDeep : C.warning);
  try { tv.setMinHeight(this.dp(48)); tv.setMinimumHeight(this.dp(48)); } catch(eMinH) {}
  try { tv.setMinWidth(this.dp(58)); tv.setMinimumWidth(this.dp(58)); } catch(eMinW) {}
  try { tv.setIncludeFontPadding(false); } catch(eFontPad) {}
  try { tv.setContentDescription(ok ? "已启用，点击暂停" : "已暂停，点击启用"); } catch(eDesc) {}
  tv.setPadding(this.dp(10), 0, this.dp(10), 0);
  try {
    var bgColor = ok ? this.withAlpha(T.primaryDeep, isDark ? 0.18 : 0.12) : this.withAlpha(C.warning, isDark ? 0.20 : 0.12);
    var strokeColor = ok ? this.withAlpha(T.primaryDeep, isDark ? 0.34 : 0.24) : this.withAlpha(C.warning, isDark ? 0.40 : 0.28);
    tv.setBackground(this.ui.createStrokeDrawable(bgColor, strokeColor, this.dp(1), this.dp(16)));
  } catch(eBg) { safeLog(null, 'e', "catch " + String(eBg)); }
  if (onClickFn) {
    tv.setOnClickListener(new android.view.View.OnClickListener({ onClick: function() {
      try { onClickFn(); } catch(eClick) { safeLog(null, 'e', "catch " + String(eClick)); }
    }}));
  }
  return tv;
};

FloatBallAppWM.prototype.createButtonManagerMoreButton = function(onClickFn) {
  var T = this.getAnimalIslandTheme();
  this.applySettingsTheme(T, this.isDarkTheme(), this.ui.colors, this.state.pendingUserCfg || this.config);
  var tv = new android.widget.TextView(context);
  tv.setText("⋮");
  tv.setGravity(android.view.Gravity.CENTER);
  tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 22);
  tv.setTextColor(T.sub);
  try { tv.setMinHeight(this.dp(48)); tv.setMinimumHeight(this.dp(48)); } catch(eMinH) {}
  try { tv.setMinWidth(this.dp(48)); tv.setMinimumWidth(this.dp(48)); } catch(eMinW) {}
  try { tv.setIncludeFontPadding(false); } catch(eFontPad) {}
  try { tv.setContentDescription("更多操作"); } catch(eDesc) {}
  if (onClickFn) {
    tv.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
      try { onClickFn(v || tv); } catch(eClick) { safeLog(null, 'e', "catch " + String(eClick)); }
    }}));
  }
  return tv;
};

FloatBallAppWM.prototype.showButtonManagerDropdown = function(anchorView, opts) {
  var self = this;
  var opt = opts || {};
  var buttons = opt.buttons || [];
  var idx = Number(opt.index || 0);
  var btnCfg = buttons[idx] || {};
  function changed(msg, kind) {
    try { if (opt.onChanged) opt.onChanged(String(msg || ""), String(kind || "ok")); } catch(eChanged) { safeLog(null, 'e', "catch " + String(eChanged)); }
  }
  function swap(a, b) {
    try {
      var temp = buttons[a];
      buttons[a] = buttons[b];
      buttons[b] = temp;
      return true;
    } catch(eSwap) { safeLog(null, 'e', "catch " + String(eSwap)); }
    return false;
  }
  function runAction(itemKind) {
    try {
      if (itemKind === "up") {
        if (swap(idx, idx - 1)) changed("已上移，点保存布置生效", "ok");
      } else if (itemKind === "down") {
        if (swap(idx, idx + 1)) changed("已下移，点保存布置生效", "ok");
      } else if (itemKind === "copy") {
        try {
          var copy = JSON.parse(JSON.stringify(buttons[idx] || {}));
          copy.title = String(copy.title || "工具") + " 副本";
          buttons.splice(idx + 1, 0, copy);
          changed("已复制，点保存布置生效", "ok");
        } catch(eCopy) { changed("复制失败: " + String(eCopy), "error"); }
      } else if (itemKind === "toggle") {
        try {
          btnCfg.enabled = (btnCfg.enabled === false) ? true : false;
          changed((btnCfg.enabled === false) ? "已暂停，点保存布置生效" : "已启用，点保存布置生效", "ok");
        } catch(eToggle) { changed("切换失败: " + String(eToggle), "error"); }
      } else if (itemKind === "remove") {
        try {
          buttons.splice(idx, 1);
          changed("已移除，点保存布置生效；点不改了可撤销", "ok");
        } catch(eDel) { changed("移除失败: " + String(eDel), "error"); }
      }
    } catch(eRun) { safeLog(null, 'e', "catch " + String(eRun)); }
  }
  try {
    if (!anchorView) {
      try { this.showButtonManagerActionSheet(opt); } catch(eNoAnchorFallback) {}
      return;
    }
    var isDark = this.isDarkTheme();
    var C = this.ui.colors;
    var T = this.getAnimalIslandTheme();
    this.applySettingsTheme(T, isDark, C, this.state.pendingUserCfg || this.config);
    var menuItems = [
      { label: "上移", hint: "提前显示", icon: "↑", kind: "up", enabled: idx > 0, danger: false },
      { label: "下移", hint: "靠后显示", icon: "↓", kind: "down", enabled: idx < buttons.length - 1, danger: false },
      { label: "复制", hint: "创建副本", icon: "+", kind: "copy", enabled: true, danger: false },
      { label: (btnCfg.enabled === false) ? "启用" : "暂停", hint: (btnCfg.enabled === false) ? "恢复显示" : "临时隐藏", icon: (btnCfg.enabled === false) ? "✓" : "Ⅱ", kind: "toggle", enabled: true, danger: false },
      { label: "移除", hint: "从列表删除", icon: "×", kind: "remove", enabled: true, danger: true }
    ];
    var menuW = this.dp(224);
    var rowH = this.dp(52);
    var headerH = this.dp(54);
    var box = new android.widget.LinearLayout(context);
    box.setOrientation(android.widget.LinearLayout.VERTICAL);
    box.setPadding(this.dp(8), this.dp(8), this.dp(8), this.dp(8));
    try {
      var bg = this.ui.createStrokeDrawable(isDark ? C.cardDark : C.cardLight, this.withAlpha(T.stroke, isDark ? 0.28 : 0.38), this.dp(1), this.dp(18));
      box.setBackground(bg);
      try { box.setElevation(this.dp(10)); } catch(eElev) {}
      try { box.setClipToOutline(true); } catch(eClipOutline) {}
    } catch(eBg) { safeLog(null, 'e', "catch " + String(eBg)); }

    var headerBox = new android.widget.LinearLayout(context);
    headerBox.setOrientation(android.widget.LinearLayout.VERTICAL);
    headerBox.setGravity(android.view.Gravity.CENTER_VERTICAL);
    headerBox.setPadding(this.dp(10), 0, this.dp(10), this.dp(6));
    var titleTv = new android.widget.TextView(context);
    titleTv.setText(String(btnCfg.title || "管理工具"));
    titleTv.setTextColor(T.text);
    titleTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
    titleTv.setTypeface(null, android.graphics.Typeface.BOLD);
    titleTv.setSingleLine(true);
    titleTv.setEllipsize(android.text.TextUtils.TruncateAt.END);
    try { titleTv.setIncludeFontPadding(false); } catch(eTitlePad) {}
    headerBox.addView(titleTv);
    var subTv = new android.widget.TextView(context);
    subTv.setText("更多操作");
    subTv.setTextColor(T.sub);
    subTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
    subTv.setSingleLine(true);
    try { subTv.setIncludeFontPadding(false); } catch(eSubPad) {}
    var subLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    subLp.topMargin = this.dp(4);
    headerBox.addView(subTv, subLp);
    box.addView(headerBox, new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, headerH));

    var divider = new android.view.View(context);
    divider.setBackgroundColor(this.withAlpha(T.stroke, isDark ? 0.24 : 0.30));
    var dividerLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 1);
    dividerLp.setMargins(this.dp(6), 0, this.dp(6), this.dp(4));
    box.addView(divider, dividerLp);

    var popup = new android.widget.PopupWindow(context);
    for (var mi = 0; mi < menuItems.length; mi++) {
      (function(menuItem) {
        var row = new android.widget.LinearLayout(context);
        row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        row.setGravity(android.view.Gravity.CENTER_VERTICAL);
        row.setPadding(self.dp(10), 0, self.dp(10), 0);
        var rowColor = menuItem.danger ? C.danger : T.primaryDeep;
        try { row.setMinHeight(rowH); row.setMinimumHeight(rowH); } catch(eRowH) {}
        try { row.setContentDescription(String(menuItem.label || "")); } catch(eDesc) {}
        try {
          var rowBg = self.ui.createStrokeDrawable(self.withAlpha(rowColor, menuItem.enabled ? (menuItem.danger ? 0.09 : 0.07) : 0.03), self.withAlpha(rowColor, menuItem.enabled ? 0.16 : 0.08), self.dp(1), self.dp(14));
          row.setBackground(rowBg);
        } catch(eRowBg) {}

        var iconTv = new android.widget.TextView(context);
        iconTv.setText(String(menuItem.icon || ""));
        iconTv.setGravity(android.view.Gravity.CENTER);
        iconTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
        iconTv.setTypeface(null, android.graphics.Typeface.BOLD);
        iconTv.setTextColor(menuItem.enabled ? rowColor : self.withAlpha(rowColor, 0.34));
        try { iconTv.setIncludeFontPadding(false); } catch(eIconPad) {}
        try { iconTv.setBackground(self.ui.createRoundDrawable(self.withAlpha(rowColor, menuItem.enabled ? 0.13 : 0.05), self.dp(12))); } catch(eIconBg) {}
        var iconLp = new android.widget.LinearLayout.LayoutParams(self.dp(32), self.dp(32));
        iconLp.rightMargin = self.dp(10);
        row.addView(iconTv, iconLp);

        var textBox = new android.widget.LinearLayout(context);
        textBox.setOrientation(android.widget.LinearLayout.VERTICAL);
        textBox.setGravity(android.view.Gravity.CENTER_VERTICAL);
        var labelTv = new android.widget.TextView(context);
        labelTv.setText(String(menuItem.label || ""));
        labelTv.setGravity(android.view.Gravity.CENTER_VERTICAL);
        labelTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
        labelTv.setTypeface(null, android.graphics.Typeface.BOLD);
        labelTv.setTextColor(menuItem.enabled ? rowColor : self.withAlpha(rowColor, 0.34));
        labelTv.setSingleLine(true);
        try { labelTv.setIncludeFontPadding(false); } catch(eLabelPad) {}
        textBox.addView(labelTv);
        var hintTv = new android.widget.TextView(context);
        hintTv.setText(String(menuItem.hint || ""));
        hintTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
        hintTv.setTextColor(menuItem.enabled ? T.sub : self.withAlpha(T.sub, 0.38));
        hintTv.setSingleLine(true);
        try { hintTv.setIncludeFontPadding(false); } catch(eHintPad) {}
        var hintLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        hintLp.topMargin = self.dp(4);
        textBox.addView(hintTv, hintLp);
        var textBoxLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        textBoxLp.weight = 1;
        row.addView(textBox, textBoxLp);

        if (menuItem.enabled) {
          row.setOnClickListener(new android.view.View.OnClickListener({ onClick: function() {
            try { popup.dismiss(); } catch(eDismiss) {}
            try { runAction(String(menuItem.kind || "")); } catch(eAction) { safeLog(null, 'e', "catch " + String(eAction)); }
          }}));
        }
        var rowLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, rowH);
        rowLp.setMargins(0, self.dp(3), 0, self.dp(3));
        box.addView(row, rowLp);
      })(menuItems[mi]);
    }
    popup.setContentView(box);
    popup.setWidth(menuW);
    popup.setHeight(headerH + rowH * menuItems.length + this.dp(50));
    popup.setOutsideTouchable(true);
    popup.setFocusable(true);
    try { popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT)); } catch(eBack) {}
    try { popup.setClippingEnabled(true); } catch(eClip) {}
    popup.showAsDropDown(anchorView, -menuW + this.dp(48), this.dp(4));
  } catch(eDrop) {
    safeLog(null, 'e', "catch " + String(eDrop));
    try { self.showButtonManagerActionSheet(opt); } catch(eFallback) {}
  }
};

FloatBallAppWM.prototype.showButtonManagerActionSheet = function(opts) {
  var self = this;
  var opt = opts || {};
  var buttons = opt.buttons || [];
  var idx = Number(opt.index || 0);
  var btnCfg = buttons[idx] || {};
  var buttonName = String(btnCfg.title || "无标题");
  function changed(msg, kind) {
    try { if (opt.onChanged) opt.onChanged(String(msg || ""), String(kind || "ok")); } catch(eChanged) { safeLog(null, 'e', "catch " + String(eChanged)); }
  }
  function swap(a, b) {
    try {
      var temp = buttons[a];
      buttons[a] = buttons[b];
      buttons[b] = temp;
      return true;
    } catch(eSwap) { safeLog(null, 'e', "catch " + String(eSwap)); }
    return false;
  }
  try {
    this.showPopupOverlay({
      title: "管理工具",
      preferAllVisible: false,
      builder: function(content, closePopup) {
        var desc = new android.widget.TextView(context);
        desc.setText(buttonName);
        desc.setTextColor(self.getAnimalIslandTheme().sub);
        desc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
        desc.setSingleLine(true);
        desc.setEllipsize(android.text.TextUtils.TruncateAt.END);
        desc.setPadding(self.dp(12), self.dp(2), self.dp(12), self.dp(8));
        content.addView(desc);

        function addActionRow(label, color, enabled, fn) {
          var row = new android.widget.TextView(context);
          row.setText(String(label || ""));
          row.setGravity(android.view.Gravity.CENTER_VERTICAL);
          row.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
          row.setTextColor(enabled ? color : self.withAlpha(color, 0.34));
          row.setPadding(self.dp(16), 0, self.dp(16), 0);
          try { row.setMinHeight(self.dp(48)); row.setMinimumHeight(self.dp(48)); } catch(eMinH) {}
          try { row.setIncludeFontPadding(false); } catch(eFontPad) {}
          try { row.setBackground(self.ui.createStrokeDrawable(self.withAlpha(color, enabled ? 0.08 : 0.04), self.withAlpha(color, enabled ? 0.20 : 0.10), self.dp(1), self.dp(14))); } catch(eBg) {}
          if (enabled && fn) {
            row.setOnClickListener(new android.view.View.OnClickListener({ onClick: function() {
              try { closePopup(); } catch(eClose) {}
              try { fn(); } catch(eFn) { safeLog(null, 'e', "catch " + String(eFn)); }
            }}));
          }
          var lp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, self.dp(48));
          lp.setMargins(self.dp(10), self.dp(4), self.dp(10), self.dp(4));
          content.addView(row, lp);
        }

        var T2 = self.getAnimalIslandTheme();
        var C2 = self.ui.colors;
        var canUp = idx > 0;
        var canDown = idx < buttons.length - 1;
        addActionRow("上移", T2.primaryDeep, canUp, function() {
          if (swap(idx, idx - 1)) changed("已上移，点保存布置生效", "ok");
        });
        addActionRow("下移", T2.primaryDeep, canDown, function() {
          if (swap(idx, idx + 1)) changed("已下移，点保存布置生效", "ok");
        });
        addActionRow("复制", T2.primaryDeep, true, function() {
          try {
            var copy = JSON.parse(JSON.stringify(buttons[idx] || {}));
            copy.title = String(copy.title || "工具") + " 副本";
            buttons.splice(idx + 1, 0, copy);
            changed("已复制，点保存布置生效", "ok");
          } catch(eCopy) { changed("复制失败: " + String(eCopy), "error"); }
        });
        addActionRow((btnCfg.enabled === false) ? "启用" : "暂停", C2.warning, true, function() {
          try {
            btnCfg.enabled = (btnCfg.enabled === false) ? true : false;
            changed((btnCfg.enabled === false) ? "已暂停，点保存布置生效" : "已启用，点保存布置生效", "ok");
          } catch(eToggle) { changed("切换失败: " + String(eToggle), "error"); }
        });
        addActionRow("移除", C2.danger, true, function() {
          try {
            buttons.splice(idx, 1);
            changed("已移除，点保存布置生效；点不改了可撤销", "ok");
          } catch(eDel) { changed("移除失败: " + String(eDel), "error"); }
        });
      }
    });
  } catch(ePopup) {
    safeLog(null, 'e', "catch " + String(ePopup));
  }
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
    // 按钮管理紧凑列表：顶部统计 + 搜索筛选 + 一行卡片。
    header.removeAllViews();

    var enabledCount = 0;
    var disabledCount = 0;
    try {
      for (var ci = 0; ci < buttons.length; ci++) {
        if (buttons[ci] && buttons[ci].enabled === false) disabledCount++;
        else enabledCount++;
      }
    } catch(eCnt) { safeLog(null, 'e', "catch " + String(eCnt)); }

    var activeQuery = String(self.state.buttonManagerQuery || "");
    var activeFilter = String(self.state.buttonManagerFilter || "all");
    if (!activeFilter) activeFilter = "all";
    var sortMode = !!self.state.buttonManagerSortMode;

    var hintTv = new android.widget.TextView(context);
    hintTv.setText("共 " + buttons.length + " 个 · 启用 " + enabledCount + " · 暂停 " + disabledCount);
    hintTv.setTextColor(subTextColor);
    hintTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    header.addView(hintTv);

    header.addView(self.ui.createSpacer(self));

    var btnSortMode = self.ui.createFlatButton(self, sortMode ? "完成" : "排序", T.primaryDeep, function() {
      self.state.buttonManagerSortMode = !sortMode;
      self.state.btnEditorListScrollY = 0;
      refreshPanel();
    });
    var btnSortModeLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, self.dp(48));
    btnSortModeLp.rightMargin = self.dp(6);
    header.addView(btnSortMode, btnSortModeLp);

    var btnAdd = self.ui.createSolidButton(self, "添加", T.primary, T.onPrimary, function() {
        self.state.editingButtonIndex = -1;
        self.state.keepBtnEditorState = true;
        if (self.state.toolAppActive && self.pushToolAppPage) self.pushToolAppPage("btn_editor");
        else refreshPanel();
    });
    btnAdd.setPadding(self.dp(12), self.dp(6), self.dp(12), self.dp(6));
    btnAdd.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    header.addView(btnAdd, new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, self.dp(48)));

    panel.addView(header);
    addButtonEditorNotice(panel);

    panel.setTag(header);

    var searchSurface = new android.widget.LinearLayout(context);
    searchSurface.setOrientation(android.widget.LinearLayout.VERTICAL);
    searchSurface.setPadding(self.dp(12), self.dp(10), self.dp(12), self.dp(8));
    searchSurface.setBackground(self.ui.createStrokeDrawable(T.card, self.withAlpha(T.stroke, isDark ? 0.30 : 0.46), self.dp(1), self.dp(18)));
    var searchRow = new android.widget.LinearLayout(context);
    searchRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    searchRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
    var searchInput = self.ui.createInputGroup(self, "搜索工具", self.state.buttonManagerQuery || "", false, "名称 / 类型 / 包名 / 命令");
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
    var btnClearSearch = self.createButtonManagerActionChip("清空", subTextColor, self.withAlpha(subTextColor, 0.24), function() {
      self.state.buttonManagerQuery = "";
      self.state.buttonManagerFilter = "all";
      self.state.btnEditorListScrollY = 0;
      refreshPanel();
    });
    var btnClearLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    btnClearLp.leftMargin = self.dp(6);
    searchRow.addView(btnClearSearch, btnClearLp);
    searchSurface.addView(searchRow);

    var filterScroll = new android.widget.HorizontalScrollView(context);
    try { filterScroll.setHorizontalScrollBarEnabled(false); } catch(eHBar) {}
    var filterRow = new android.widget.LinearLayout(context);
    filterRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    filterRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
    filterRow.setPadding(0, self.dp(8), 0, 0);
    var filters = [
      { key: "all", label: "全部" },
      { key: "enabled", label: "启用" },
      { key: "disabled", label: "暂停" },
      { key: "app", label: "应用" },
      { key: "shell", label: "Shell" },
      { key: "open_settings", label: "设置" },
      { key: "shortcut", label: "快捷方式" },
      { key: "broadcast", label: "广播" }
    ];
    for (var fi = 0; fi < filters.length; fi++) {
      (function(filterItem) {
        var selected = activeFilter === String(filterItem.key || "all");
        var chipText = selected ? ("✓ " + filterItem.label) : filterItem.label;
        var chip = self.createButtonManagerActionChip(chipText, selected ? T.primaryDeep : subTextColor, selected ? self.withAlpha(T.primaryDeep, 0.38) : self.withAlpha(subTextColor, 0.20), function() {
          self.state.buttonManagerFilter = String(filterItem.key || "all");
          self.state.btnEditorListScrollY = 0;
          refreshPanel();
        });
        var chipLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        chipLp.rightMargin = self.dp(6);
        filterRow.addView(chip, chipLp);
      })(filters[fi]);
    }
    filterScroll.addView(filterRow);
    searchSurface.addView(filterScroll);

    var searchSurfaceLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    searchSurfaceLp.setMargins(self.dp(2), 0, self.dp(2), self.dp(8));
    panel.addView(searchSurface, searchSurfaceLp);

    var visibleCount = 0;

    var scroll = new android.widget.ScrollView(context);
    __btnEditorListScroll = scroll;
    try { scroll.setVerticalScrollBarEnabled(false);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    var list = new android.widget.LinearLayout(context);
    list.setOrientation(android.widget.LinearLayout.VERTICAL);
    list.setPadding(0, self.dp(2), 0, self.dp(2));

    for (var i = 0; i < buttons.length; i++) {
      (function(idx) {
        var btnCfg = buttons[idx];
        if (!self.matchesButtonManagerQuery(btnCfg, activeQuery)) return;
        if (!self.matchesButtonManagerFilter(btnCfg, activeFilter)) return;
        visibleCount++;

        var __enabled = true;
        try { __enabled = (btnCfg && btnCfg.enabled === false) ? false : true; } catch(eEn) { __enabled = true; }

        // 按钮管理紧凑列表卡片：信息 + 状态 + 更多。
        var card = new android.widget.LinearLayout(context);
        card.setOrientation(android.widget.LinearLayout.VERTICAL);
        card.setGravity(android.view.Gravity.CENTER_VERTICAL);
        var cardBgColor = cardColor;
        card.setBackground(self.ui.createStrokeDrawable(cardBgColor, self.withAlpha(T.stroke, isDark ? 0.28 : 0.45), self.dp(1), self.dp(18)));
        try { card.setElevation(self.dp(3));  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
        if (!__enabled) {
            try { card.setAlpha(0.62);  } catch(eA) { safeLog(null, 'e', "catch " + String(eA)); }
        } else {
            try { card.setAlpha(1.0);  } catch(eA2) { safeLog(null, 'e', "catch " + String(eA2)); }
        }

        var cardLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        cardLp.setMargins(self.dp(4), self.dp(3), self.dp(4), self.dp(3));
        card.setLayoutParams(cardLp);
        card.setPadding(self.dp(12), self.dp(8), self.dp(8), self.dp(8));
        try { card.setMinHeight(self.dp(64)); card.setMinimumHeight(self.dp(64)); } catch(eCardMin) {}

        var mainRow = new android.widget.LinearLayout(context);
        mainRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        mainRow.setGravity(android.view.Gravity.CENTER_VERTICAL);

        card.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {
                self.state.editingButtonIndex = idx;
                self.state.keepBtnEditorState = true;
                if (self.state.toolAppActive && self.pushToolAppPage) self.pushToolAppPage("btn_editor");
                else refreshPanel();
            }
        }));

        var iconIv = new android.widget.ImageView(context);
        try {
            var dr0 = self.resolveIconDrawable(btnCfg);
            if (dr0) iconIv.setImageDrawable(dr0);
         } catch(eIcon0) { safeLog(null, 'e', "catch " + String(eIcon0)); }
        try { iconIv.setScaleType(android.widget.ImageView.ScaleType.CENTER_INSIDE);  } catch(eScale) { safeLog(null, 'e', "catch " + String(eScale)); }
        var iconSizeDp = 32;
        try { iconSizeDp = Number(self.config.PANEL_ICON_SIZE_DP || 32);  } catch(eSz) { safeLog(null, 'e', "catch " + String(eSz)); }
        if (!iconSizeDp || iconSizeDp < 24) iconSizeDp = 32;
        if (iconSizeDp > 36) iconSizeDp = 36;
        var iconLp = new android.widget.LinearLayout.LayoutParams(self.dp(iconSizeDp), self.dp(iconSizeDp));
        iconLp.rightMargin = self.dp(10);
        iconIv.setLayoutParams(iconLp);
        mainRow.addView(iconIv);

        var textContainer = new android.widget.LinearLayout(context);
        textContainer.setOrientation(android.widget.LinearLayout.VERTICAL);
        var textLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        textLp.weight = 1;
        textContainer.setLayoutParams(textLp);

        var infoTv = new android.widget.TextView(context);
        infoTv.setText(String(btnCfg.title || "无标题"));
        infoTv.setTextColor(textColor);
        infoTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
        infoTv.setTypeface(null, android.graphics.Typeface.BOLD);
        infoTv.setSingleLine(true);
        infoTv.setEllipsize(android.text.TextUtils.TruncateAt.END);
        textContainer.addView(infoTv);

        var detailTv = new android.widget.TextView(context);
        var desc = self.getButtonManagerTypeLabel(btnCfg) + " · " + self.getButtonManagerSummary(btnCfg);
        detailTv.setText(desc);
        detailTv.setTextColor(subTextColor);
        detailTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
        detailTv.setSingleLine(true);
        detailTv.setEllipsize(android.text.TextUtils.TruncateAt.END);
        textContainer.addView(detailTv);

        mainRow.addView(textContainer);

        if (sortMode) {
          var sortActions = new android.widget.LinearLayout(context);
          sortActions.setOrientation(android.widget.LinearLayout.HORIZONTAL);
          sortActions.setGravity(android.view.Gravity.CENTER_VERTICAL);
          var canUp = (idx > 0);
          var btnUp = self.createButtonManagerTextAction("↑", canUp ? T.primaryDeep : self.withAlpha(subTextColor, 0.25), canUp ? function() {
              var temp = buttons[idx];
              buttons[idx] = buttons[idx - 1];
              buttons[idx - 1] = temp;
              setButtonEditorNotice("已上移，点保存布置生效", "ok");
              refreshPanel();
          } : null);
          try { btnUp.setEnabled(canUp); } catch(eUpEn) {}
          sortActions.addView(btnUp);
          var canDown = (idx < buttons.length - 1);
          var btnDown = self.createButtonManagerTextAction("↓", canDown ? T.primaryDeep : self.withAlpha(subTextColor, 0.25), canDown ? function() {
              var temp2 = buttons[idx];
              buttons[idx] = buttons[idx + 1];
              buttons[idx + 1] = temp2;
              setButtonEditorNotice("已下移，点保存布置生效", "ok");
              refreshPanel();
          } : null);
          try { btnDown.setEnabled(canDown); } catch(eDownEn) {}
          sortActions.addView(btnDown);
          mainRow.addView(sortActions);
        } else {
          var statusChip = self.createButtonManagerStatusChip(__enabled, function() {
              try {
                  btnCfg.enabled = (btnCfg.enabled === false) ? true : false;
                  setButtonEditorNotice((btnCfg.enabled === false) ? "已暂停，点保存布置生效" : "已启用，点保存布置生效", "ok");
              } catch(eTg) { setButtonEditorNotice("切换失败: " + String(eTg), "error"); }
              refreshPanel();
          });
          var statusLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
          statusLp.leftMargin = self.dp(8);
          mainRow.addView(statusChip, statusLp);

          var moreBtn = self.createButtonManagerMoreButton(function(anchorView) {
            self.showButtonManagerDropdown(anchorView, {
              buttons: buttons,
              index: idx,
              onChanged: function(msg, kind) {
                setButtonEditorNotice(msg, kind);
                refreshPanel();
              }
            });
          });
          mainRow.addView(moreBtn, new android.widget.LinearLayout.LayoutParams(self.dp(48), self.dp(48)));
        }

        card.addView(mainRow);
        list.addView(card);

      })(i);
    }

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
        var emptyMsg = activeQuery ? "没有匹配的工具，点清空查看全部" : (activeFilter !== "all" ? "当前筛选没有工具，切回全部查看" : "暂无按钮，点击右上角添加");
        emptyTv.setText(emptyMsg);
        emptyTv.setTextColor(subTextColor);
        emptyTv.setPadding(0, self.dp(16), 0, 0);
        emptyBox.addView(emptyTv);

        list.addView(emptyBox);
    }

    scroll.addView(list);
    var scrollLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 0);
    scrollLp.weight = 1;
    scroll.setLayoutParams(scrollLp);
    panel.addView(scroll);

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
    var btnListCancelLp = new android.widget.LinearLayout.LayoutParams(0, self.dp(48));
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
    var btnListSaveLp = new android.widget.LinearLayout.LayoutParams(0, self.dp(48));
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

    // Stage 3: icon source / ShortX icon / tint inline editor is implemented in th_14_button_icon_editor.js.
    var iconInline = self.buildButtonIconEditorInline({
        form: form,
        targetBtn: targetBtn,
        C: C,
        T: T,
        isDark: isDark,
        cardColor: cardColor,
        dividerColor: dividerColor,
        textColor: textColor,
        subTextColor: subTextColor
    });
    var inputIconPath = iconInline ? iconInline.inputIconPath : self.ui.createInputGroup(self, "图标路径 (绝对地址)", targetBtn.iconPath, false, "支持 PNG/JPG 绝对路径，自动安全加载");

    var actionSectionBody = self.createButtonEditorCollapsibleSection(form, "动作设置", "点击后做什么", true);

    // 2. 动作类型（自动换行：用 GridLayout 稳定实现）
    // 这段代码的主要内容/用途：把「Shell/App/广播/快捷方式/设置」做成会自动换行的单选框区域。
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
        { id: 4, val: "shortcut", txt: "快捷方式" },
        { id: 5, val: "open_settings", txt: "设置" }
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
        try { rb.setMinHeight(self.dp(48)); rb.setMinimumHeight(self.dp(48)); } catch(eMH) { safeLog(null, 'e', "catch " + String(eMH)); }
        try { rb.setContentDescription("动作类型：" + String(types[i].txt || "")); } catch(eRbDesc) {}
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
    // Stage 2: shortcut inline selector is implemented in th_14_button_shortcut.js.
    var shortcutInline = self.buildButtonShortcutPickerInline({
        targetBtn: targetBtn,
        dynamicContainer: dynamicContainer,
        inputTitle: inputTitle,
        inputIconPath: inputIconPath,
        C: C,
        textColor: textColor,
        subTextColor: subTextColor
    });

// 联动逻辑
    function updateVisibility(typeVal) {
        shellWrap.setVisibility(typeVal === "shell" ? android.view.View.VISIBLE : android.view.View.GONE);
        appWrap.setVisibility(typeVal === "app" ? android.view.View.VISIBLE : android.view.View.GONE);
        bcWrap.setVisibility(typeVal === "broadcast" ? android.view.View.VISIBLE : android.view.View.GONE);
        try { if (shortcutInline && shortcutInline.wrap) shortcutInline.wrap.setVisibility(typeVal === "shortcut" ? android.view.View.VISIBLE : android.view.View.GONE); } catch(eScVis) { safeLog(null, 'e', "catch " + String(eScVis)); }
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
    var btnCancelLp = new android.widget.LinearLayout.LayoutParams(0, self.dp(48));
    btnCancelLp.weight = 1;
    btnCancelLp.rightMargin = self.dp(8);
    bottomBar.addView(btnCancel, btnCancelLp);

    var btnSave = self.ui.createSolidButton(self, "先存起来", T.primary, T.onPrimary, function() {
        try {
            var newBtn = targetBtn;
            newBtn.title = inputTitle.getValue();

            // # 根据选中的图标类型保存对应的值（二选一）
            var iconTypeSelected = (iconInline && iconInline.isShortXSelected && iconInline.isShortXSelected()) ? "shortx" : "file";
            if (iconTypeSelected === "file") {
                var ip = iconInline && iconInline.getIconPath ? iconInline.getIconPath() : inputIconPath.getValue();
                if (ip) newBtn.iconPath = ip; else delete newBtn.iconPath;
                delete newBtn.iconResName; // 清除 ShortX 图标
                delete newBtn.iconTint;
            } else {
                var sxIcon = iconInline && iconInline.getShortXIconName ? iconInline.getShortXIconName() : "";
                if (sxIcon) newBtn.iconResName = sxIcon; else delete newBtn.iconResName;
                var sxTint = iconInline && iconInline.getShortXIconTint ? iconInline.getShortXIconTint() : "";
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
                var sp = shortcutInline ? shortcutInline.getPkg() : "";
                var sid = shortcutInline ? shortcutInline.getShortcutId() : "";
                if (!sp) { if (shortcutInline) shortcutInline.setPkgError("请先选择快捷方式"); markInvalid(null, "请先选择快捷方式"); }
                else { if (shortcutInline) shortcutInline.setPkgError(null); newBtn.pkg = sp; }
                if (!sid) { if (shortcutInline) shortcutInline.setShortcutIdError("请先选择快捷方式"); markInvalid(null, "请先选择快捷方式"); }
                else { if (shortcutInline) shortcutInline.setShortcutIdError(null); newBtn.shortcutId = sid; }
                // # 保存：同时保存 intentUri/userId，供 JavaScript(startActivityAsUser) 脚本使用（锁定主/分身）
                try { var _scIntentUri = shortcutInline ? shortcutInline.getIntentUri() : ""; if (_scIntentUri && _scIntentUri.length > 0) newBtn.intentUri = String(_scIntentUri);  } catch(eSIU2) { safeLog(null, 'e', "catch " + String(eSIU2)); }
                try { var _scUserId = shortcutInline ? shortcutInline.getUserId() : 0; newBtn.userId = _scUserId; newBtn.launchUserId = _scUserId; } catch(eSUID2) { newBtn.userId = 0; newBtn.launchUserId = 0; }
                // # 保存：快捷方式 JS 启动代码（自动生成/可手动编辑）
                try { if (shortcutInline) newBtn.shortcutJsCode = String(shortcutInline.getJsCode());  } catch(eSaveJs) { safeLog(null, 'e', "catch " + String(eSaveJs)); }
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

            // # 编辑页只写入 tempButtons，最终由列表页“保存布置”统一落盘。
            self.state.keepBtnEditorState = true;

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
    var btnSaveLp = new android.widget.LinearLayout.LayoutParams(0, self.dp(48));
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
