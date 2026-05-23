// ToolHub - 颜色选择器弹窗模块
// 依赖：th_14_panels.js 中的 showPopupOverlay()、th_04_theme.js 主题工具、th_06_icon_parser.js 图标解析。

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
  var colorValueInput = null;
  var syncingColorInput = false;
  var alphaSeek = null;
  var alphaValTv = null;
  var updatePreviewFn = function() {};
  var updateValueTvFn = function() {};
  var refreshRecentGridFn = function() {};
  var refreshCommonGridFn = function() {};
  var syncRgbSeeksFn = function() {};

  // 操作按钮：对齐设置页/按钮管理页的 chip + 主按钮视觉。
  function createColorPanelActionButton(label, primary, onClick) {
    var b = new android.widget.TextView(context);
    b.setText(label);
    b.setGravity(android.view.Gravity.CENTER);
    b.setSingleLine(true);
    b.setTypeface(null, android.graphics.Typeface.BOLD);
    try { b.setIncludeFontPadding(false); } catch(eFontPad) {}
    if (primary) {
      b.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
      b.setTextColor(android.graphics.Color.WHITE);
      b.setPadding(self.dp(16), 0, self.dp(16), 0);
      try { b.setMinHeight(self.dp(50)); } catch(eMinH1) {}
      try { b.setBackground(self.ui.createStrokeDrawable(T.primaryDeep, self.withAlpha(T.brown || T.primaryDeep, isDark ? 0.28 : 0.18), self.dp(1), self.dp(26))); } catch(eBg1) {}
      try { b.setElevation(self.dp(1)); } catch(eElev) {}
    } else {
      b.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
      b.setTextColor(T.brown || T.sub);
      b.setPadding(self.dp(14), 0, self.dp(14), 0);
      try { b.setMinHeight(self.dp(50)); } catch(eMinH2) {}
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

  var popupResult = self.showPopupOverlay({
    title: "换颜色",
    preferAllVisible: true,
    onDismiss: onDismiss,
    builder: function(content, closePopup) {
      // 图标预览区
      var previewRow = new android.widget.LinearLayout(context);
      previewRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
      previewRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
      previewRow.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
      previewRow.setBackground(self.ui.createStrokeDrawable(T.primarySoft, self.withAlpha(T.primaryDeep, isDark ? 0.24 : 0.18), self.dp(1), self.dp(18)));

      var previewIv = new android.widget.ImageView(context);
      previewIv.setLayoutParams(new android.widget.LinearLayout.LayoutParams(self.dp(44), self.dp(44)));
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
      updatePreviewFn = updatePreview;
      updatePreview();

      // ========== 最近使用颜色 ==========
      var recentTitle = new android.widget.TextView(context);
      recentTitle.setText("最近用过的小颜色");
      recentTitle.setTextColor(subTextColor);
      recentTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      recentTitle.setPadding(self.dp(12), self.dp(6), self.dp(12), self.dp(3));
      content.addView(recentTitle);

      var recentGrid = new android.widget.GridLayout(context);
      recentGrid.setColumnCount(8);
      recentGrid.setPadding(self.dp(8), self.dp(3), self.dp(8), self.dp(3));
      content.addView(recentGrid);

      var recentEmptyTv = new android.widget.TextView(context);
      recentEmptyTv.setText("还没有最近颜色");
      recentEmptyTv.setTextColor(subTextColor);
      recentEmptyTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
      recentEmptyTv.setPadding(self.dp(12), self.dp(3), self.dp(12), self.dp(6));
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
      refreshRecentGridFn = refreshRecentGrid;
      refreshRecentGrid();

      // 21 色常用颜色
      var commonTitle = new android.widget.TextView(context);
      commonTitle.setText("糖果常用色");
      commonTitle.setTextColor(subTextColor);
      commonTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      commonTitle.setPadding(self.dp(12), self.dp(6), self.dp(12), self.dp(3));
      content.addView(commonTitle);

      var commonGrid = new android.widget.GridLayout(context);
      commonGrid.setColumnCount(7);
      commonGrid.setPadding(self.dp(8), self.dp(3), self.dp(8), self.dp(6));
      var ci;
      for (ci = 0; ci < commonTintHexValues.length; ci++) {
        (function(hex) {
          var cell = new android.widget.FrameLayout(context);
          var margin = self.dp(3);
          try {
            var lp = new android.widget.GridLayout.LayoutParams();
            lp.width = self.dp(30);
            lp.height = self.dp(30);
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
                border.setCornerRadius(self.dp(5));
                border.setStroke(self.dp(2), T.primaryDeep);
                matchedCell.setForeground(border);
               } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
            }
          }
         } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
      }
      refreshCommonGridFn = refreshCommonGrid;

      // 颜色值编辑：合并到颜色面板中，支持手动输入 #RRGGBB / #AARRGGBB。
      var valueTv = new android.widget.TextView(context);
      valueTv.setTextColor(textColor);
      valueTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      valueTv.setPadding(self.dp(12), self.dp(3), self.dp(12), self.dp(3));
      content.addView(valueTv);

      colorValueInput = new android.widget.EditText(context);
      colorValueInput.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
      colorValueInput.setTextColor(textColor);
      try { colorValueInput.setHintTextColor(subTextColor); } catch(eHintColorInput) { safeLog(null, 'e', "catch " + String(eHintColorInput)); }
      colorValueInput.setHint("留空 = 跟随主题；支持 #RRGGBB / #AARRGGBB");
      colorValueInput.setSingleLine(true);
      colorValueInput.setPadding(self.dp(10), self.dp(8), self.dp(10), self.dp(8));
      try { colorValueInput.setBackground(self.ui.createStrokeDrawable(isDark ? self.ui.colors.inputBgDark : self.ui.colors.inputBgLight, isDark ? self.ui.colors.dividerDark : self.ui.colors.dividerLight, self.dp(1), self.dp(10))); } catch(eColorInputBg) { safeLog(null, 'e', "catch " + String(eColorInputBg)); }
      var colorValueInputLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
      colorValueInputLp.setMargins(self.dp(12), 0, self.dp(12), self.dp(6));
      content.addView(colorValueInput, colorValueInputLp);

      function syncColorInputFromState() {
        try {
          if (!colorValueInput) return;
          syncingColorInput = true;
          colorValueInput.setText(isFollowTheme ? "" : String(selectedColor || ""));
          try { colorValueInput.setSelection(String(isFollowTheme ? "" : (selectedColor || "")).length); } catch(eSelInput) {}
        } catch(eInputSync) { safeLog(null, 'e', "catch " + String(eInputSync)); }
        syncingColorInput = false;
      }

      function updateValueTv() {
        valueTv.setText(isFollowTheme ? "当前：跟随岛屿主题" : ("当前：" + (selectedColor || "无")));
        syncColorInputFromState();
      }
      updateValueTvFn = updateValueTv;
      updateValueTv();

      try {
        colorValueInput.addTextChangedListener(new JavaAdapter(android.text.TextWatcher, {
          afterTextChanged: function(s) {
            if (syncingColorInput) return;
            var raw = String(s || "").replace(/^\s+|\s+$/g, "");
            if (!raw) {
              isFollowTheme = true;
              selectedColor = "";
              currentAlphaByte = 255;
              updatePreview();
              valueTv.setText("当前：跟随岛屿主题");
              refreshRecentGrid();
              refreshCommonGrid();
              syncRgbSeeks();
              try { if (alphaSeek) alphaSeek.setProgress(255); } catch(eAlphaEmpty) {}
              try { if (alphaValTv) alphaValTv.setText("255"); } catch(eAlphaEmptyTv) {}
              return;
            }
            var normalized = normalizeTintColorValue(raw);
            if (!normalized) {
              valueTv.setText("当前：" + raw + "（格式无效）");
              return;
            }
            isFollowTheme = false;
            selectedColor = normalized;
            currentBaseRgbHex = extractTintRgbHex(normalized);
            currentAlphaByte = extractTintAlphaByte(normalized);
            updatePreview();
            valueTv.setText("当前：" + selectedColor);
            refreshRecentGrid();
            refreshCommonGrid();
            syncRgbSeeks();
            try { if (alphaSeek) alphaSeek.setProgress(currentAlphaByte); } catch(eAlphaNorm) {}
            try { if (alphaValTv) alphaValTv.setText(String(currentAlphaByte)); } catch(eAlphaNormTv) {}
          },
          beforeTextChanged: function(s, st, c, a) {},
          onTextChanged: function(s, st, b, c) {}
        }));
      } catch(eColorInputWatcher) { safeLog(null, 'e', "catch " + String(eColorInputWatcher)); }

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
          row.setPadding(self.dp(12), self.dp(2), self.dp(12), self.dp(2));

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
      syncRgbSeeksFn = syncRgbSeeks;
      syncRgbSeeks();

      // 透明度滑块
      var alphaRow = new android.widget.LinearLayout(context);
      alphaRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
      alphaRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
      alphaRow.setPadding(self.dp(12), self.dp(2), self.dp(12), self.dp(4));

      var alphaLabel = new android.widget.TextView(context);
      alphaLabel.setText("A");
      alphaLabel.setTextColor(textColor);
      alphaLabel.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      alphaLabel.setMinWidth(self.dp(20));
      alphaRow.addView(alphaLabel);

      alphaSeek = new android.widget.SeekBar(context);
      alphaSeek.setMax(255);
      var alphaSeekLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1);
      alphaSeekLp.setMargins(self.dp(8), 0, self.dp(8), 0);
      alphaSeek.setLayoutParams(alphaSeekLp);
      alphaRow.addView(alphaSeek);

      alphaValTv = new android.widget.TextView(context);
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

      // 底部操作按钮放到 showPopupOverlay 的固定 footer 中，避免默认首屏看不到。
    },
    footerBuilder: function(footer, closePopup) {
      var actionRow = new android.widget.LinearLayout(context);
      actionRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
      actionRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
      actionRow.setPadding(self.dp(10), self.dp(6), self.dp(10), self.dp(4));

      var btnClear = createColorPanelActionButton("恢复默认", false, function() {
        isFollowTheme = true;
        selectedColor = "";
        currentAlphaByte = 255;
        try { updatePreviewFn(); } catch(eUp) {}
        try { updateValueTvFn(); } catch(eVal) {}
        try { refreshRecentGridFn(); } catch(eRecent) {}
        try { refreshCommonGridFn(); } catch(eCommon) {}
        try { syncRgbSeeksFn(); } catch(eSync) {}
        try { if (alphaSeek) alphaSeek.setProgress(255); } catch(eAlphaSeek) {}
        try { if (alphaValTv) alphaValTv.setText("255"); } catch(eAlphaTv) {}
      });
      var clearLp = new android.widget.LinearLayout.LayoutParams(0, self.dp(50));
      clearLp.weight = 1;
      clearLp.setMargins(0, 0, self.dp(6), 0);
      actionRow.addView(btnClear, clearLp);

      var btnOk = createColorPanelActionButton("保存颜色", true, function() {
        try {
          var finalColor = isFollowTheme ? "" : String(selectedColor || "");
          if (!isFollowTheme && selectedColor) pushRecentColor(selectedColor);
          if (typeof onSelect === "function") {
            try { onSelect(finalColor); } catch(eOnSelect) { safeLog(self.L, 'e', "colorPicker onSelect err=" + String(eOnSelect)); }
          }
        } catch(e) {
          safeLog(self.L, 'e', "colorPicker confirm err=" + String(e));
        }
        closePopup();
      });
      var okLp = new android.widget.LinearLayout.LayoutParams(0, self.dp(50));
      okLp.weight = 1;
      okLp.setMargins(self.dp(6), 0, 0, 0);
      actionRow.addView(btnOk, okLp);

      footer.addView(actionRow, new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
      ));
    }
  });

  return popupResult;
};
