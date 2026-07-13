// @version 1.0.0
// ToolHub - ShortX 图标选择器模块
//
// 阶段 1：承载 showShortXIconPickerPopup。
// 目的：在新增模块下载、验签、eval 链路已稳定后，迁移 ShortX 图标选择器主体。
// 注意：加载顺序必须位于 th_14_panels.js 之后、th_15_extra.js 之前。

FloatBallAppWM.prototype.showShortXIconPickerPopup = function(opts) {
  var self = this;
  var opt = opts || {};
  var currentName = String(opt.currentName || "");
  var onSelect = (typeof opt.onSelect === "function") ? opt.onSelect : null;
  var onDismissCb = (typeof opt.onDismiss === "function") ? opt.onDismiss : null;

  var catalog = [];
  try { catalog = self.getShortXIconCatalog() || [];  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
  if (!catalog.length) {
    try { catalog = self.getShortXIconCatalog(true) || [];  } catch(e2) { safeLog(null, 'e', "catch " + String(e2)); }
  }
  if (!catalog.length) {
    self.toast("图标库未加载");
    return null;
  }

  var selectedName = currentName;
  var popupState = { currentPage: 0, filter: "全部" };
  var PT = self.getIslandPickerTheme ? self.getIslandPickerTheme() : null;
  var isDark = PT ? PT.isDark : self.isDarkTheme();
  var C = self.ui.colors;
  var T = PT ? PT.T : self.getSettingsColorScheme();
  var textColor = PT ? PT.text : (isDark ? C.textPriDark : C.textPriLight);
  var subTextColor = PT ? PT.sub : (isDark ? C.textSecDark : C.textSecLight);
  var cardColor = PT ? PT.card2 : (isDark ? C.cardDark : C.cardLight);
  var wm = self.state.wm;
  var filterTags = ["全部", "常用", "最近", "收藏", "线框", "实心"];
  var filterViews = [];
  var FAVORITE_ICONS_KEY = "shortx_icon_favorites";
  var favoriteIcons = [];
  var favoriteMap = {};

  function rebuildFavoriteMap() {
    favoriteMap = {};
    for (var fi = 0; fi < favoriteIcons.length; fi++) {
      var fn = String(favoriteIcons[fi] || "");
      if (fn) favoriteMap[fn] = true;
    }
  }

  function loadFavoriteIcons() {
    favoriteIcons = [];
    try {
      var saved = self.loadPanelState ? self.loadPanelState(FAVORITE_ICONS_KEY) : null;
      var arr = saved && saved.icons ? saved.icons : [];
      for (var li = 0; li < arr.length && favoriteIcons.length < 300; li++) {
        var name = String(arr[li] || "");
        if (name && !favoriteMap[name]) {
          favoriteIcons.push(name);
          favoriteMap[name] = true;
        }
      }
    } catch(eFavLoad) { safeLog(null, 'e', "catch " + String(eFavLoad)); }
    rebuildFavoriteMap();
  }

  function saveFavoriteIcons() {
    try {
      if (self.savePanelState) self.savePanelState(FAVORITE_ICONS_KEY, { icons: favoriteIcons.slice(0, 300) });
    } catch(eFavSave) { safeLog(null, 'e', "catch " + String(eFavSave)); }
  }

  function isFavoriteIcon(name) {
    return !!favoriteMap[String(name || "")];
  }

  function toggleFavoriteIcon(name) {
    name = String(name || "");
    if (!name) return false;
    var next = [];
    var existed = false;
    for (var ti = 0; ti < favoriteIcons.length; ti++) {
      var oldName = String(favoriteIcons[ti] || "");
      if (!oldName) continue;
      if (oldName === name) { existed = true; continue; }
      next.push(oldName);
    }
    if (!existed) next.unshift(name);
    favoriteIcons = next.slice(0, 300);
    rebuildFavoriteMap();
    saveFavoriteIcons();
    return !existed;
  }
  loadFavoriteIcons();

  function matchesFilter(entry, f) {
    if (!entry) return false;
    if (!f || f === "全部") return true;
    var n = String(entry.shortName || entry.name || "").toLowerCase();
    if (f === "常用") return n.indexOf("home") >= 0 || n.indexOf("share") >= 0 || n.indexOf("search") >= 0 || n.indexOf("settings") >= 0 || n.indexOf("add") >= 0 || n.indexOf("back") >= 0 || n.indexOf("close") >= 0;
    if (f === "最近") return selectedName && String(entry.name) === String(selectedName);
    if (f === "收藏") return isFavoriteIcon(entry.name);
    if (f === "线框") return n.indexOf("outline") >= 0 || n.indexOf("line") >= 0 || n.indexOf("stroke") >= 0 || n.indexOf("border") >= 0;
    if (f === "实心") return n.indexOf("fill") >= 0 || n.indexOf("solid") >= 0 || n.indexOf("round") >= 0;
    return true;
  }

  function filterCatalog(q) {
    var qLower = String(q || "").toLowerCase();
    var out = [];
    for (var i = 0; i < catalog.length; i++) {
      var entry = catalog[i];
      if (!entry) continue;
      if (!matchesFilter(entry, popupState.filter)) continue;
      if (qLower) {
        var n = String(entry.shortName || entry.name).toLowerCase();
        if (n.indexOf(qLower) < 0) continue;
      }
      out.push(entry);
    }
    return out;
  }

  var dm = context.getResources().getDisplayMetrics();
  var sw = dm.widthPixels;
  var sh = dm.heightPixels;
  var panelWidth = Math.round(sw * 0.92);
  var panelHeight = Math.round(sh * 0.90);
  try {
    if (self.calculateToolAppLayout) {
      var toolLayout = self.calculateToolAppLayout(null);
      if (toolLayout && toolLayout.width > 0) panelWidth = toolLayout.width;
      if (toolLayout && toolLayout.height > 0) panelHeight = toolLayout.height;
    }
  } catch(eLayout) { safeLog(null, 'e', "catch " + String(eLayout)); }
  if (panelWidth > self.dp(560)) panelWidth = self.dp(560);
  if (panelWidth < self.dp(320)) panelWidth = Math.min(sw - self.dp(16), self.dp(320));
  if (panelHeight > sh - self.dp(24)) panelHeight = sh - self.dp(24);
  if (panelHeight < self.dp(460)) panelHeight = Math.min(sh - self.dp(16), self.dp(460));

  var padH = self.dp(14);
  var padV = self.dp(12);
  var gap = self.dp(8);
  var colCount = 5;
  var availW = panelWidth - padH * 2 - self.dp(10) * 2;
  var cellW = Math.floor((availW - gap * (colCount - 1)) / colCount);
  if (cellW < self.dp(46)) cellW = self.dp(46);
  var iconSize = Math.max(self.dp(23), Math.min(self.dp(30), Math.floor(cellW * 0.46)));
  var cellH = self.dp(70);
  var headerH = self.dp(176);
  var bottomH = self.dp(58);
  var maxGridH = Math.max(self.dp(250), panelHeight - headerH - bottomH);
  var rowCount = Math.max(3, Math.floor(maxGridH / (cellH + gap)));
  var pageSize = colCount * rowCount;

  var rootOverlay = new android.widget.FrameLayout(context);
  try { rootOverlay.setBackgroundColor(self.withAlpha(isDark ? 0xFF000000 : 0xFFFFFFFF, isDark ? 0.58 : 0.42)); }
  catch(eOverlayBg) { rootOverlay.setBackgroundColor(0x33000000); }
  rootOverlay.setClickable(true);

  var card = new android.widget.LinearLayout(context);
  card.setOrientation(android.widget.LinearLayout.VERTICAL);
  card.setPadding(padH, padV, padH, padV);
  card.setBackground(self.ui.createStrokeDrawable(T.card, self.withAlpha(T.primaryDeep, isDark ? 0.28 : 0.22), self.dp(1), self.dp(24)));
  try { card.setElevation(self.dp(10)); } catch(eCardElev) { safeLog(null, 'e', "catch " + String(eCardElev)); }

  var cardLp = new android.widget.FrameLayout.LayoutParams(panelWidth, panelHeight);
  cardLp.gravity = android.view.Gravity.CENTER;
  card.setLayoutParams(cardLp);
  rootOverlay.addView(card);

  var overlayLp = new android.view.WindowManager.LayoutParams(
    android.view.WindowManager.LayoutParams.MATCH_PARENT,
    android.view.WindowManager.LayoutParams.MATCH_PARENT,
    android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
    android.view.WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
    android.graphics.PixelFormat.TRANSLUCENT
  );
  overlayLp.softInputMode = android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING
    | android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN;

  try { wm.addView(rootOverlay, overlayLp); } catch(eAdd) {
    safeLog(self.L, 'e', "icon picker addView fail: " + String(eAdd));
    return null;
  }

  var isDismissed = false;
  function dismiss() {
    if (isDismissed) return;
    isDismissed = true;
    try { wm.removeView(rootOverlay);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
    if (typeof onDismissCb === "function") {
      try { onDismissCb();  } catch(eD) { safeLog(null, 'e', "catch " + String(eD)); }
    }
  }
  rootOverlay.setOnClickListener(new android.view.View.OnClickListener({ onClick: function() { dismiss(); } }));
  card.setOnClickListener(new android.view.View.OnClickListener({ onClick: function() { } }));

  var header = new android.widget.LinearLayout(context);
  header.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  header.setGravity(android.view.Gravity.CENTER_VERTICAL);

  var titleBox = new android.widget.LinearLayout(context);
  titleBox.setOrientation(android.widget.LinearLayout.VERTICAL);
  titleBox.setGravity(android.view.Gravity.CENTER_VERTICAL);
  titleBox.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1));

  var titleTv = new android.widget.TextView(context);
  titleTv.setText("岛上图标库");
  titleTv.setTextColor(textColor);
  titleTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 17);
  titleTv.setTypeface(null, android.graphics.Typeface.BOLD);
  titleBox.addView(titleTv);

  var countTv = new android.widget.TextView(context);
  countTv.setText("共 " + catalog.length + " 个图标");
  countTv.setTextColor(subTextColor);
  countTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
  titleBox.addView(countTv);
  header.addView(titleBox);

  var closeBtn = self.ui.createCompactFlatButton ? self.ui.createCompactFlatButton(self, "×", T.primaryDeep, function() { dismiss(); }) : self.ui.createFlatButton(self, "×", T.primaryDeep, function() { dismiss(); });
  closeBtn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 18);
  closeBtn.setTypeface(null, android.graphics.Typeface.BOLD);
  closeBtn.setPadding(self.dp(8), 0, self.dp(8), 0);
  try { closeBtn.setContentDescription("关闭图标库"); } catch(eCloseDesc) {}
  try { closeBtn.setBackground(self.ui.createStrokeDrawable(T.primarySoft, self.withAlpha(T.primaryDeep, isDark ? 0.30 : 0.22), self.dp(1), self.dp(18))); } catch(eCloseBg) {}
  header.addView(closeBtn, new android.widget.LinearLayout.LayoutParams(self.dp(48), self.dp(48)));
  card.addView(header);

  var searchEt = new android.widget.EditText(context);
  searchEt.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
  searchEt.setTextColor(textColor);
  try { searchEt.setHintTextColor(subTextColor);  } catch(eHint) { safeLog(null, 'e', "catch " + String(eHint)); }
  searchEt.setHint("寻找岛上图标，如 share / home");
  searchEt.setSingleLine(true);
  searchEt.setFocusable(true);
  searchEt.setFocusableInTouchMode(true);
  searchEt.setPadding(self.dp(14), self.dp(10), self.dp(14), self.dp(10));
  searchEt.setBackground(self.ui.createStrokeDrawable(T.card2, self.withAlpha(T.primaryDeep, isDark ? 0.24 : 0.18), self.dp(1), self.dp(20)));
  var searchLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, self.dp(46));
  searchLp.setMargins(0, self.dp(10), 0, self.dp(8));
  card.addView(searchEt, searchLp);
  searchEt.setOnClickListener(new android.view.View.OnClickListener({
    onClick: function(v) {
      self.touchActivity();
      try {
        v.requestFocus();
        var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
        if (imm) imm.showSoftInput(v, android.view.inputmethod.InputMethodManager.SHOW_IMPLICIT);
      } catch(eIme) { safeLog(null, 'e', "catch " + String(eIme)); }
    }
  }));

  var filterScroll = new android.widget.HorizontalScrollView(context);
  filterScroll.setHorizontalScrollBarEnabled(false);
  var filterRow = new android.widget.LinearLayout(context);
  filterRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  filterRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
  filterRow.setPadding(0, 0, 0, 0);
  filterScroll.addView(filterRow);
  var filterLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, self.dp(48));
  filterLp.setMargins(0, 0, 0, self.dp(4));
  card.addView(filterScroll, filterLp);

  function refreshFilterTags() {
    try {
      for (var i = 0; i < filterViews.length; i++) {
        var item = filterViews[i];
        if (!item || !item.view) continue;
        var active = item.name === popupState.filter;
        item.view.setTextColor(active ? T.onPrimary : T.primaryDeep);
        item.view.setTypeface(null, active ? android.graphics.Typeface.BOLD : android.graphics.Typeface.NORMAL);
        item.view.setBackground(self.ui.createStrokeDrawable(active ? T.primary : T.primarySoft, self.withAlpha(T.primaryDeep, active ? 0.36 : 0.18), self.dp(1), self.dp(16)));
      }
    } catch(eTags) { safeLog(null, 'e', "catch " + String(eTags)); }
  }

  for (var ft = 0; ft < filterTags.length; ft++) {
    (function(tag) {
      var chip = new android.widget.TextView(context);
      chip.setText(tag);
      chip.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      chip.setGravity(android.view.Gravity.CENTER);
      chip.setPadding(self.dp(12), 0, self.dp(12), 0);
      chip.setSingleLine(true);
      chip.setClickable(true);
      try { chip.setMinHeight(self.dp(48)); chip.setMinimumHeight(self.dp(48)); } catch(eMinH) {}
      try { chip.setMinWidth(self.dp(48)); chip.setMinimumWidth(self.dp(48)); } catch(eMinW) {}
      try { chip.setIncludeFontPadding(false); } catch(eFontPad) {}
      try { chip.setContentDescription("筛选：" + String(tag)); } catch(eDesc) {}
      chip.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function() {
          self.touchActivity();
          popupState.filter = tag;
          popupState.currentPage = 0;
          refreshFilterTags();
          renderGrid();
        }
      }));
      var chipLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, self.dp(48));
      chipLp.setMargins(0, 0, self.dp(7), 0);
      filterRow.addView(chip, chipLp);
      filterViews.push({ name: tag, view: chip });
    })(filterTags[ft]);
  }
  refreshFilterTags();

  var pageBar = new android.widget.LinearLayout(context);
  pageBar.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  pageBar.setGravity(android.view.Gravity.CENTER_VERTICAL);
  pageBar.setPadding(self.dp(2), 0, self.dp(2), self.dp(4));
  var pageBarLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, self.dp(48));
  card.addView(pageBar, pageBarLp);

  var btnPrev = self.ui.createFlatButton(self, "上一页", self.withAlpha(T.primaryDeep, 0.72), function() {
    if (popupState.currentPage > 0) { popupState.currentPage--; renderGrid(); }
  });
  try { btnPrev.setContentDescription("上一页"); } catch(ePrevDesc) {}
  pageBar.addView(btnPrev, new android.widget.LinearLayout.LayoutParams(self.dp(78), self.dp(48)));

  var pageInfo = new android.widget.TextView(context);
  pageInfo.setTextColor(self.withAlpha(textColor, 0.76));
  pageInfo.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  pageInfo.setGravity(android.view.Gravity.CENTER);
  pageInfo.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1));
  pageBar.addView(pageInfo);

  var btnNext = self.ui.createFlatButton(self, "下一页", self.withAlpha(T.primaryDeep, 0.72), function() {
    popupState.currentPage++;
    renderGrid();
  });
  try { btnNext.setContentDescription("下一页"); } catch(eNextDesc) {}
  pageBar.addView(btnNext, new android.widget.LinearLayout.LayoutParams(self.dp(78), self.dp(48)));

  var gridScroll = new android.widget.ScrollView(context);
  gridScroll.setVerticalScrollBarEnabled(false);
  gridScroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
  gridScroll.setLayoutParams(new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 0, 1));
  card.addView(gridScroll);

  var grid = new android.widget.GridLayout(context);
  grid.setColumnCount(colCount);
  grid.setPadding(self.dp(10), self.dp(6), self.dp(10), self.dp(8));
  gridScroll.addView(grid);

  var selectRow = new android.widget.LinearLayout(context);
  selectRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  selectRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
  selectRow.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
  selectRow.setBackground(self.ui.createStrokeDrawable(T.card2, self.withAlpha(T.primaryDeep, isDark ? 0.22 : 0.16), self.dp(1), self.dp(22)));
  var selectRowLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, self.dp(58));
  selectRowLp.setMargins(0, self.dp(6), 0, 0);
  card.addView(selectRow, selectRowLp);

  var selectNameTv = new android.widget.TextView(context);
  selectNameTv.setTextColor(textColor);
  selectNameTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
  selectNameTv.setSingleLine(true);
  try { selectNameTv.setEllipsize(android.text.TextUtils.TruncateAt.END); } catch(eEll) {}
  selectNameTv.setLayoutParams(new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1));
  selectRow.addView(selectNameTv);

  var selectConfirm = self.ui.createSolidButton(self, "带回小岛", T.primary, T.onPrimary, function() {
    self.touchActivity();
    try {
      if (typeof onSelect === "function") onSelect(selectedName);
    } catch(eSelect) {
      safeLog(self.L, 'e', "icon onSelect err=" + String(eSelect));
    }
    dismiss();
  });
  try { selectConfirm.setContentDescription("确认选择图标"); } catch(eConfirmDesc) {}
  var confirmLp = new android.widget.LinearLayout.LayoutParams(self.dp(104), self.dp(48));
  confirmLp.setMargins(self.dp(10), 0, 0, 0);
  selectRow.addView(selectConfirm, confirmLp);

  function updateSelectedLabel() {
    try {
      selectNameTv.setText(selectedName ? ("已选：" + String(selectedName)) : "还没选图标");
    } catch(eLabel) { safeLog(null, 'e', "catch " + String(eLabel)); }
  }
  updateSelectedLabel();

  function renderGrid() {
    try {
      grid.removeAllViews();
      var q = String(searchEt.getText() || "");
      var matched = filterCatalog(q);
      var totalPages = Math.max(1, Math.ceil(matched.length / pageSize));
      if (popupState.currentPage >= totalPages) popupState.currentPage = totalPages - 1;
      if (popupState.currentPage < 0) popupState.currentPage = 0;
      var start = popupState.currentPage * pageSize;
      var pageItems = matched.slice(start, start + pageSize);

      pageInfo.setText("第 " + (popupState.currentPage + 1) + " / " + totalPages + " 页");
      btnPrev.setEnabled(popupState.currentPage > 0);
      btnNext.setEnabled(popupState.currentPage < totalPages - 1);

      if (pageItems.length === 0) {
        var emptyTv = new android.widget.TextView(context);
        emptyTv.setText(popupState.filter === "收藏" ? "收藏夹还空着，点图标左上角星标收藏" : "没有找到这枚小图标");
        emptyTv.setTextColor(subTextColor);
        emptyTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
        emptyTv.setGravity(android.view.Gravity.CENTER);
        emptyTv.setPadding(0, self.dp(60), 0, self.dp(60));
        grid.addView(emptyTv);
        return;
      }

      grid.setColumnCount(colCount);
      for (var idx = 0; idx < pageItems.length; idx++) {
        (function(item) {
          var frame = new android.widget.FrameLayout(context);
          frame.setClickable(true);
          var isSelected = selectedName === item.name;
          var frameBg = isSelected ? T.primarySoft : self.withAlpha(cardColor, 0.96);
          var frameStroke = isSelected ? self.withAlpha(T.primaryDeep, isDark ? 0.50 : 0.42) : self.withAlpha(T.primaryDeep, isDark ? 0.18 : 0.12);
          frame.setBackground(self.ui.createStrokeDrawable(frameBg, frameStroke, isSelected ? self.dp(2) : self.dp(1), self.dp(15)));

          var cell = new android.widget.LinearLayout(context);
          cell.setOrientation(android.widget.LinearLayout.VERTICAL);
          cell.setGravity(android.view.Gravity.CENTER);
          cell.setPadding(self.dp(4), self.dp(6), self.dp(4), self.dp(5));
          frame.addView(cell, new android.widget.FrameLayout.LayoutParams(android.widget.FrameLayout.LayoutParams.MATCH_PARENT, android.widget.FrameLayout.LayoutParams.MATCH_PARENT));

          var iv = new android.widget.ImageView(context);
          iv.setLayoutParams(new android.widget.LinearLayout.LayoutParams(iconSize, iconSize));
          iv.setScaleType(android.widget.ImageView.ScaleType.FIT_CENTER);
          try {
            var dr = self.getShortXIconDrawable(item.name);
            if (dr) { iv.setImageDrawable(dr); }
          } catch(eIcon) { safeLog(null, 'e', "catch " + String(eIcon)); }
          cell.addView(iv);

          var tv = new android.widget.TextView(context);
          tv.setText(String(item.shortName || item.name));
          tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 9);
          tv.setGravity(android.view.Gravity.CENTER);
          tv.setMaxLines(1);
          try { tv.setEllipsize(android.text.TextUtils.TruncateAt.END); } catch(eTvEll) {}
          tv.setPadding(self.dp(2), self.dp(5), self.dp(2), 0);
          tv.setTextColor(isSelected ? T.primaryDeep : subTextColor);
          cell.addView(tv, new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT));

          var favBtn = new android.widget.TextView(context);
          favBtn.setText(isFavoriteIcon(item.name) ? "★" : "☆");
          favBtn.setTextColor(isFavoriteIcon(item.name) ? T.primaryDeep : self.withAlpha(T.primaryDeep, 0.52));
          favBtn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
          favBtn.setGravity(android.view.Gravity.CENTER);
          favBtn.setTypeface(null, android.graphics.Typeface.BOLD);
          favBtn.setBackground(self.ui.createRoundDrawable(isFavoriteIcon(item.name) ? T.primarySoft : self.withAlpha(T.card, 0.88), self.dp(9)));
          favBtn.setClickable(true);
          try { favBtn.setContentDescription((isFavoriteIcon(item.name) ? "取消收藏" : "收藏") + String(item.shortName || item.name || "图标")); } catch(eFavDesc) {}
          favBtn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {
              self.touchActivity();
              var added = toggleFavoriteIcon(item.name);
              try { self.toast(added ? "已收藏到小岛" : "已取消收藏"); } catch(eFavToast) {}
              if (popupState.filter === "收藏") popupState.currentPage = 0;
              renderGrid();
            }
          }));
          var favLp = new android.widget.FrameLayout.LayoutParams(self.dp(18), self.dp(18));
          favLp.gravity = android.view.Gravity.TOP | android.view.Gravity.LEFT;
          favLp.setMargins(self.dp(4), self.dp(4), 0, 0);
          frame.addView(favBtn, favLp);

          if (isSelected) {
            var badge = new android.widget.TextView(context);
            badge.setText("✓");
            badge.setTextColor(T.onPrimary);
            badge.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 10);
            badge.setGravity(android.view.Gravity.CENTER);
            badge.setTypeface(null, android.graphics.Typeface.BOLD);
            badge.setBackground(self.ui.createRoundDrawable(T.primary, self.dp(9)));
            var badgeLp = new android.widget.FrameLayout.LayoutParams(self.dp(18), self.dp(18));
            badgeLp.gravity = android.view.Gravity.TOP | android.view.Gravity.RIGHT;
            badgeLp.setMargins(0, self.dp(4), self.dp(4), 0);
            frame.addView(badge, badgeLp);
          }

          frame.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {
              self.touchActivity();
              selectedName = item.name;
              updateSelectedLabel();
              renderGrid();
            }
          }));
          try { frame.setContentDescription("选择图标" + String(item.shortName || item.name || "")); } catch(eFrameDesc) {}

          var cellLp = new android.widget.GridLayout.LayoutParams();
          cellLp.width = cellW;
          cellLp.height = cellH;
          var col = idx % colCount;
          var mr = (col === colCount - 1) ? 0 : gap;
          cellLp.setMargins(0, 0, mr, gap);
          frame.setLayoutParams(cellLp);
          grid.addView(frame);
        })(pageItems[idx]);
      }
    } catch(eRender) {
      safeLog(self.L, 'e', "renderShortXIconGrid err=" + String(eRender));
    }
  }

  searchEt.addTextChangedListener(new android.text.TextWatcher({
    beforeTextChanged: function() {},
    onTextChanged: function() {
      self.touchActivity();
      popupState.currentPage = 0;
      renderGrid();
    },
    afterTextChanged: function() {}
  }));

  renderGrid();

  return { close: dismiss };
};
