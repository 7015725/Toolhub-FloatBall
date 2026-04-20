// @version 1.0.0
// =======================【设置面板：UI（右上角确认）】======================
FloatBallAppWM.prototype.createSectionHeader = function(item, parent) {
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var color = C.primary;

  var h = new android.widget.TextView(context);
  h.setText(String(item.name || ""));
  h.setTextColor(color);
  h.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
  h.setTypeface(null, android.graphics.Typeface.BOLD);
  h.setPadding(this.dp(16), this.dp(24), this.dp(16), this.dp(8));
  parent.addView(h);
};

FloatBallAppWM.prototype.createSettingItemView = function(item, parent, needDivider) {
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var textColor = isDark ? C.textPriDark : C.textPriLight;
  var secColor = isDark ? C.textSecDark : C.textSecLight;
  var dividerColor = isDark ? C.dividerDark : C.dividerLight;
  var primary = C.primary;
  var switchOff = isDark ? (0xFF555555 | 0) : (0xFFCCCCCC | 0);

  // 增加内边距
  var padH = this.dp(16);
  var padV = this.dp(16);

  // 分割线 (顶部)
  if (needDivider) {
      var line = new android.view.View(context);
      var lineLp = new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        1 // 1px
      );
      lineLp.setMargins(padH, 0, padH, 0);
      line.setLayoutParams(lineLp);
      line.setBackgroundColor(dividerColor);
      parent.addView(line);
  }

  // 容器
  var row = new android.widget.LinearLayout(context);
  row.setOrientation(android.widget.LinearLayout.VERTICAL);
  // 增加点击波纹反馈
  try {
      var outValue = new android.util.TypedValue();
      context.getTheme().resolveAttribute(android.R.attr.selectableItemBackground, outValue, true);
      row.setBackgroundResource(outValue.resourceId);
  } catch(e) {}

  row.setPadding(padH, padV, padH, padV);

  var self = this;

  if (item.type === "bool") {
    // === 开关类型 ===
    row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    row.setGravity(android.view.Gravity.CENTER_VERTICAL);
    row.setClickable(true);

    var tv = new android.widget.TextView(context);
    tv.setText(String(item.name));
    tv.setTextColor(textColor);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    var tvLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    tvLp.weight = 1;
    tv.setLayoutParams(tvLp);
    row.addView(tv);

    var sw = new android.widget.Switch(context);
    try { sw.setTextOn(""); sw.setTextOff(""); } catch (eT) {}

    // 优化开关颜色
    try {
        var states = [
            [android.R.attr.state_checked],
            [-android.R.attr.state_checked]
        ];
        var thumbColors = [primary, switchOff];
        var trackColors = [self.withAlpha(primary, 0.5), self.withAlpha(switchOff, 0.5)];

        var thumbList = new android.content.res.ColorStateList(states, thumbColors);
        var trackList = new android.content.res.ColorStateList(states, trackColors);

        sw.setThumbTintList(thumbList);
        sw.setTrackTintList(trackList);
    } catch(eColor) {}

    var cur = !!self.getPendingValue(item.key);
    sw.setChecked(cur);

    // 监听器
    sw.setOnCheckedChangeListener(new android.widget.CompoundButton.OnCheckedChangeListener({
      onCheckedChanged: function(btn, checked) {
        try {
          self.touchActivity();
          self.setPendingValue(item.key, !!checked);
          if (self.L) self.L.d("pending " + String(item.key) + "=" + String(!!checked));
        } catch (e0) {}
      }
    }));

    // 点击行也触发开关
    row.setOnClickListener(new android.view.View.OnClickListener({
      onClick: function(v) {
        sw.setChecked(!sw.isChecked());
      }
    }));

    row.addView(sw);
    parent.addView(row);

  } else if (item.type === "int" || item.type === "float") {
    // === 数值类型 (SeekBar) ===
    // 垂直布局：上面是 标题+数值，下面是 SeekBar

    // 第一行：标题 + 数值
    var line1 = new android.widget.LinearLayout(context);
    line1.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    line1.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
    ));

    var tv = new android.widget.TextView(context);
    tv.setText(String(item.name));
    tv.setTextColor(textColor);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    var tvLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    tvLp.weight = 1;
    tv.setLayoutParams(tvLp);
    line1.addView(tv);

    var valTv = new android.widget.TextView(context);
    valTv.setTextColor(primary);
    valTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    valTv.setTypeface(null, android.graphics.Typeface.BOLD);
    line1.addView(valTv);

    row.addView(line1);

    // 第二行：SeekBar
    var sb = new android.widget.SeekBar(context);
    var sbLp = new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
    );
    sbLp.topMargin = self.dp(16); // 增加间距
    sb.setLayoutParams(sbLp);

    // 优化 SeekBar 颜色
    try {
        sb.getThumb().setTint(primary);
        sb.getProgressDrawable().setTint(primary);
    } catch(eColor) {}

    // 配置 SeekBar
    var min = (item.min !== undefined) ? Number(item.min) : 0;
    var max = (item.max !== undefined) ? Number(item.max) : 100;
    var step = (item.step !== undefined) ? Number(item.step) : 1;

    var curV = Number(self.getPendingValue(item.key));
    if (isNaN(curV)) curV = min;
    curV = self.clamp(curV, min, max);

    var maxP = Math.floor((max - min) / step);
    if (maxP < 1) maxP = 1;
    sb.setMax(maxP);

    var curP = Math.floor((curV - min) / step);
    if (curP < 0) curP = 0;
    if (curP > maxP) curP = maxP;
    sb.setProgress(curP);

    function formatVal(v) {
        if (item.type === "float") return String(Math.round(v * 1000) / 1000);
        return String(Math.round(v));
    }
    function computeValByProgress(p) {
      var v = min + p * step;
      v = self.clamp(v, min, max);
      if (item.type === "int") v = Math.round(v);
      if (item.type === "float") v = Math.round(v * 1000) / 1000;
      return v;
    }

    valTv.setText(formatVal(curV));

    sb.setOnSeekBarChangeListener(new android.widget.SeekBar.OnSeekBarChangeListener({
      onProgressChanged: function(seek, progress, fromUser) {
        try {
          self.touchActivity();
          var v = computeValByProgress(progress);
          valTv.setText(formatVal(v));
          if (fromUser) {
            self.setPendingValue(item.key, v);
          }
        } catch (e1) {}
      },
      onStartTrackingTouch: function() { try { self.touchActivity(); } catch (e2) {} },
      onStopTrackingTouch: function() { try { self.touchActivity(); } catch (e3) {} }
    }));

    row.addView(sb);
    parent.addView(row);

  } else if (item.type === "action") {
    // === 动作按钮 ===
    row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    row.setGravity(android.view.Gravity.CENTER_VERTICAL);
    row.setClickable(true);

    var tv = new android.widget.TextView(context);
    tv.setText(String(item.name));
    tv.setTextColor(textColor);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    var tvLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    tvLp.weight = 1;
    tv.setLayoutParams(tvLp);
    row.addView(tv);

    // 样式化文本按钮
    var btn = new android.widget.TextView(context);
    btn.setText("打开");
    btn.setTextColor(primary);
    btn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    btn.setTypeface(null, android.graphics.Typeface.BOLD);
    btn.setGravity(android.view.Gravity.CENTER);
    btn.setPadding(self.dp(16), self.dp(8), self.dp(16), self.dp(8));
    // 透明波纹背景
    btn.setBackground(self.ui.createTransparentRippleDrawable(primary, self.dp(16)));

    btn.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function(v) {
            try {
              self.touchActivity();
              if (item.action === "open_btn_mgr") {
                self.showPanelAvoidBall("btn_editor");
              }
            } catch(e) {}
        }
    }));
    row.addView(btn);

    // 行点击也触发
    row.setOnClickListener(new android.view.View.OnClickListener({
      onClick: function(v) {
         try {
          self.touchActivity();
          if (item.action === "open_btn_mgr") {
            self.showPanelAvoidBall("btn_editor");
          }
        } catch(e) {}
      }
    }));

    parent.addView(row);
  } else if (item.type === "text") {
    // === 文本输入 ===
    var tv = new android.widget.TextView(context);
    tv.setText(String(item.name));
    tv.setTextColor(textColor);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    row.addView(tv);

    var et = new android.widget.EditText(context);
    var curVal = self.getPendingValue(item.key);
    if (curVal === undefined || curVal === null) curVal = "";
    et.setText(String(curVal));
    et.setTextColor(textColor);
    et.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    et.setBackground(self.ui.createRoundDrawable(isDark ? C.inputBgDark : C.inputBgLight, self.dp(6)));
    et.setPadding(self.dp(8), self.dp(8), self.dp(8), self.dp(8));
    et.setSingleLine(true);

    var etLp = new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
    );
    etLp.topMargin = self.dp(8);
    et.setLayoutParams(etLp);

    // Explicitly request keyboard on click
    et.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function(v) {
            try {
                v.requestFocus();
                var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
                imm.showSoftInput(v, 0);
            } catch(e) {}
        }
    }));

    et.addTextChangedListener(new android.text.TextWatcher({
        beforeTextChanged: function(s, start, count, after) {},
        onTextChanged: function(s, start, before, count) {},
        afterTextChanged: function(s) {
            try {
                self.touchActivity();
                self.setPendingValue(item.key, String(s));
            } catch (e) {}
        }
    }));

    row.addView(et);
    parent.addView(row);
  } else if (item.type === "single_choice") {
    // === 单选类型 (RadioGroup) ===
    var tv = new android.widget.TextView(context);
    tv.setText(String(item.name));
    tv.setTextColor(textColor);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    row.addView(tv);

    var rg = new android.widget.RadioGroup(context);
    rg.setOrientation(android.widget.RadioGroup.VERTICAL);
    var rgLp = new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
    );
    rgLp.topMargin = self.dp(8);
    rg.setLayoutParams(rgLp);

    var curVal = String(self.getPendingValue(item.key) || "");
    if (!curVal) curVal = "auto"; // default

    var options = item.options || [];
    for (var i = 0; i < options.length; i++) {
        (function(opt) {
            var rb = new android.widget.RadioButton(context);
            rb.setText(String(opt.label));
            rb.setTextColor(textColor);
            rb.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
            // 颜色优化
            try {
                var states = [[android.R.attr.state_checked], [-android.R.attr.state_checked]];
                var colors = [primary, secColor];
                rb.setButtonTintList(new android.content.res.ColorStateList(states, colors));
            } catch(eC){}

            rb.setId(android.view.View.generateViewId ? android.view.View.generateViewId() : i);

            // Check state
            if (String(opt.value) === curVal) {
                rb.setChecked(true);
            }

            rb.setOnCheckedChangeListener(new android.widget.CompoundButton.OnCheckedChangeListener({
                onCheckedChanged: function(btn, checked) {
                    if (checked) {
                        try {
                            self.touchActivity();
                            self.setPendingValue(item.key, String(opt.value));
                        } catch(e){}
                    }
                }
            }));
            rg.addView(rb);
        })(options[i]);
    }

    row.addView(rg);
    parent.addView(row);
  } else if (item.type === "ball_shortx_icon") {
    // === 悬浮球 ShortX 图标选择器（内嵌式，无 AlertDialog）===
    row.setOrientation(android.widget.LinearLayout.VERTICAL);
    var tv = new android.widget.TextView(context);
    tv.setText(String(item.name));
    tv.setTextColor(textColor);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    row.addView(tv);

    var iconRow = new android.widget.LinearLayout(context);
    iconRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    iconRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
    iconRow.setPadding(0, self.dp(8), 0, 0);

    var previewIv = new android.widget.ImageView(context);
    var previewIvLp = new android.widget.LinearLayout.LayoutParams(self.dp(36), self.dp(36));
    previewIvLp.rightMargin = self.dp(10);
    previewIv.setLayoutParams(previewIvLp);
    previewIv.setScaleType(android.widget.ImageView.ScaleType.FIT_CENTER);
    try {
        var curIconName0 = String(self.getPendingValue(item.key) || "");
        var curTint0 = String(self.getPendingValue("BALL_ICON_TINT_HEX") || "");
        if (curIconName0) {
            var dr0 = self.resolveShortXDrawable(curIconName0, curTint0);
            if (dr0) previewIv.setImageDrawable(dr0);
        }
    } catch(ePreview) {}
    iconRow.addView(previewIv);

    var nameTv = new android.widget.TextView(context);
    nameTv.setTextColor(secColor);
    nameTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
    nameTv.setText(String(self.getPendingValue(item.key) || "未选择"));
    var nameTvLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1);
    nameTv.setLayoutParams(nameTvLp);
    iconRow.addView(nameTv);

    // 展开/收起状态
    var iconPickerExpanded = false;

    var btnPick = self.ui.createFlatButton(self, "展开图标库", primary, function() {
        iconPickerExpanded = !iconPickerExpanded;
        btnPick.setText(iconPickerExpanded ? "收起图标库" : "展开图标库");
        iconPickerWrap.setVisibility(iconPickerExpanded ? android.view.View.VISIBLE : android.view.View.GONE);
        if (iconPickerExpanded) {
            try {
                if (!iconListView.getAdapter() || iconListView.getAdapter().getCount() === 0) {
                    var catalog0 = self.getShortXIconCatalog();
                    if (!catalog0 || catalog0.length === 0) {
                        self.toast("图标库未加载，请检查 ShortX 是否安装");
                        iconPickerExpanded = false;
                        btnPick.setText("展开图标库");
                        iconPickerWrap.setVisibility(android.view.View.GONE);
                        return;
                    }
                    var adapterData0 = [];
                    var ii;
                    for (ii = 0; ii < catalog0.length; ii++) {
                        adapterData0.push(String(catalog0[ii].shortName || catalog0[ii].name));
                    }
                    var adapter0 = new android.widget.ArrayAdapter(context, android.R.layout.simple_list_item_1, adapterData0);
                    iconListView.setAdapter(adapter0);
                }
            } catch(eLoad) {
                self.toast("加载图标库失败: " + String(eLoad));
            }
        }
    });
    iconRow.addView(btnPick);
    row.addView(iconRow);

    // 内嵌图标选择区域
    var iconPickerWrap = new android.widget.LinearLayout(context);
    iconPickerWrap.setOrientation(android.widget.LinearLayout.VERTICAL);
    iconPickerWrap.setVisibility(android.view.View.GONE);
    iconPickerWrap.setPadding(0, self.dp(8), 0, 0);

    var searchEt = new android.widget.EditText(context);
    searchEt.setHint("搜索图标...");
    searchEt.setTextColor(textColor);
    searchEt.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
    searchEt.setBackground(self.ui.createRoundDrawable(isDark ? C.inputBgDark : C.inputBgLight, self.dp(6)));
    searchEt.setPadding(self.dp(8), self.dp(6), self.dp(8), self.dp(6));
    searchEt.setSingleLine(true);
    iconPickerWrap.addView(searchEt);

    var iconListView = new android.widget.ListView(context);
    var listLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, self.dp(280));
    listLp.topMargin = self.dp(6);
    iconListView.setLayoutParams(listLp);
    iconPickerWrap.addView(iconListView);

    iconListView.setOnItemClickListener(new android.widget.AdapterView.OnItemClickListener({
        onItemClick: function(parent, view, position, id) {
            try {
                var adapter1 = iconListView.getAdapter();
                var selectedName = String(adapter1.getItem(position));
                self.setPendingValue(item.key, selectedName);
                nameTv.setText(selectedName);
                try {
                    var tint1 = String(self.getPendingValue("BALL_ICON_TINT_HEX") || "");
                    var dr1 = self.resolveShortXDrawable(selectedName, tint1);
                    if (dr1) previewIv.setImageDrawable(dr1);
                    else previewIv.setImageDrawable(null);
                } catch(eDr) {}
                iconPickerExpanded = false;
                btnPick.setText("展开图标库");
                iconPickerWrap.setVisibility(android.view.View.GONE);
                if (self.state.previewMode) self.rebuildBallForNewSize(true);
            } catch(eClick) {}
        }
    }));

    searchEt.addTextChangedListener(new android.text.TextWatcher({
        beforeTextChanged: function(s, start, count, after) {},
        onTextChanged: function(s, start, before, count) {},
        afterTextChanged: function(s) {
            try {
                var catalog1 = self.getShortXIconCatalog();
                var q = String(s).toLowerCase();
                var filtered = [];
                var j;
                for (j = 0; j < catalog1.length; j++) {
                    var n = String(catalog1[j].shortName || catalog1[j].name).toLowerCase();
                    if (n.indexOf(q) >= 0) filtered.push(String(catalog1[j].shortName || catalog1[j].name));
                }
                var newAdapter = new android.widget.ArrayAdapter(context, android.R.layout.simple_list_item_1, filtered);
                iconListView.setAdapter(newAdapter);
            } catch(eFilter) {}
        }
    }));

    row.addView(iconPickerWrap);
    parent.addView(row);

  } else if (item.type === "ball_color") {
    // === 悬浮球图标颜色选择器（内嵌式，无 AlertDialog）===
    row.setOrientation(android.widget.LinearLayout.VERTICAL);
    var tv = new android.widget.TextView(context);
    tv.setText(String(item.name));
    tv.setTextColor(textColor);
    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    row.addView(tv);

    var colorRow = new android.widget.LinearLayout(context);
    colorRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    colorRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
    colorRow.setPadding(0, self.dp(8), 0, 0);

    var colorDot = new android.view.View(context);
    var colorDotLp = new android.widget.LinearLayout.LayoutParams(self.dp(28), self.dp(28));
    colorDotLp.rightMargin = self.dp(10);
    colorDot.setLayoutParams(colorDotLp);
    try {
        var curHex0 = String(self.getPendingValue(item.key) || "");
        if (curHex0) {
            colorDot.setBackground(self.ui.createRoundDrawable(android.graphics.Color.parseColor(curHex0), self.dp(14)));
        } else {
            colorDot.setBackground(self.ui.createRoundDrawable(0xFFCCCCCC | 0, self.dp(14)));
        }
    } catch(eDot) {
        colorDot.setBackground(self.ui.createRoundDrawable(0xFFCCCCCC | 0, self.dp(14)));
    }
    colorRow.addView(colorDot);

    var colorValueTv = new android.widget.TextView(context);
    colorValueTv.setTextColor(secColor);
    colorValueTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
    colorValueTv.setText(String(self.getPendingValue(item.key) || "默认"));
    var colorValueLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1);
    colorValueTv.setLayoutParams(colorValueLp);
    colorRow.addView(colorValueTv);

    var paletteExpanded = false;

    var btnColor = self.ui.createFlatButton(self, "展开调色板", primary, function() {
        paletteExpanded = !paletteExpanded;
        btnColor.setText(paletteExpanded ? "收起调色板" : "展开调色板");
        paletteWrap.setVisibility(paletteExpanded ? android.view.View.VISIBLE : android.view.View.GONE);
    });
    colorRow.addView(btnColor);
    row.addView(colorRow);

    var paletteWrap = new android.widget.LinearLayout(context);
    paletteWrap.setOrientation(android.widget.LinearLayout.VERTICAL);
    paletteWrap.setVisibility(android.view.View.GONE);
    paletteWrap.setPadding(0, self.dp(8), 0, 0);

    var scroll = new android.widget.ScrollView(context);
    var scrollBox = new android.widget.LinearLayout(context);
    scrollBox.setOrientation(android.widget.LinearLayout.VERTICAL);
    scroll.addView(scrollBox);
    paletteWrap.addView(scroll);

    var grid = new android.widget.GridLayout(context);
    try { grid.setColumnCount(5); } catch(e){}
    var gridLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    grid.setLayoutParams(gridLp);
    scrollBox.addView(grid);

    var commonColors = [
        "#F44336", "#E91E63", "#9C27B0", "#673AB7", "#3F51B5",
        "#2196F3", "#03A9F4", "#00BCD4", "#009688", "#4CAF50",
        "#8BC34A", "#CDDC39", "#FFEB3B", "#FFC107", "#FF9800",
        "#FF5722", "#795548", "#9E9E9E", "#607D8B", "#000000", "#FFFFFF"
    ];

    var ci;
    for (ci = 0; ci < commonColors.length; ci++) {
        (function(hex) {
            var colorBtn = new android.widget.TextView(context);
            var colorBtnLp = new android.widget.GridLayout.LayoutParams();
            colorBtnLp.width = self.dp(44);
            colorBtnLp.height = self.dp(44);
            colorBtn.setLayoutParams(colorBtnLp);
            try {
                colorBtn.setBackground(self.ui.createRoundDrawable(android.graphics.Color.parseColor(hex), self.dp(8)));
            } catch(eBg) {}
            colorBtn.setOnClickListener(new android.view.View.OnClickListener({
                onClick: function(v) {
                    try {
                        self.setPendingValue(item.key, hex);
                        colorValueTv.setText(hex);
                        try { colorDot.setBackground(self.ui.createRoundDrawable(android.graphics.Color.parseColor(hex), self.dp(14))); } catch(eDot2) {}
                        if (self.state.previewMode) self.rebuildBallForNewSize(true);
                    } catch(eSet) {}
                }
            }));
            grid.addView(colorBtn);
        })(commonColors[ci]);
    }

    var inputEt = new android.widget.EditText(context);
    inputEt.setHint("手动输入 #RRGGBB");
    inputEt.setTextColor(textColor);
    inputEt.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
    inputEt.setBackground(self.ui.createRoundDrawable(isDark ? C.inputBgDark : C.inputBgLight, self.dp(6)));
    inputEt.setPadding(self.dp(8), self.dp(6), self.dp(8), self.dp(6));
    inputEt.setSingleLine(true);
    inputEt.setText(String(self.getPendingValue(item.key) || ""));
    var inputLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    inputLp.topMargin = self.dp(10);
    inputEt.setLayoutParams(inputLp);
    scrollBox.addView(inputEt);

    var btnRow = new android.widget.LinearLayout(context);
    btnRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    btnRow.setGravity(android.view.Gravity.END);
    btnRow.setPadding(0, self.dp(8), 0, 0);

    var btnConfirm = self.ui.createFlatButton(self, "确定", primary, function() {
        try {
            var val = String(inputEt.getText() || "").replace(/^\s+|\s+$/g, "");
            if (val) {
                if (val.indexOf("#") !== 0) val = "#" + val;
                android.graphics.Color.parseColor(val);
                self.setPendingValue(item.key, val);
                colorValueTv.setText(val);
                try { colorDot.setBackground(self.ui.createRoundDrawable(android.graphics.Color.parseColor(val), self.dp(14))); } catch(eDot3) {}
            } else {
                self.setPendingValue(item.key, "");
                colorValueTv.setText("默认");
                try { colorDot.setBackground(self.ui.createRoundDrawable(0xFFCCCCCC | 0, self.dp(14))); } catch(eDot4) {}
            }
            paletteExpanded = false;
            btnColor.setText("展开调色板");
            paletteWrap.setVisibility(android.view.View.GONE);
            if (self.state.previewMode) self.rebuildBallForNewSize(true);
        } catch(eOk) {
            self.toast("颜色格式无效");
        }
    });
    btnRow.addView(btnConfirm);

    var btnClear = self.ui.createFlatButton(self, "清空", secColor, function() {
        self.setPendingValue(item.key, "");
        colorValueTv.setText("默认");
        try { colorDot.setBackground(self.ui.createRoundDrawable(0xFFCCCCCC | 0, self.dp(14))); } catch(eDot5) {}
        inputEt.setText("");
        paletteExpanded = false;
        btnColor.setText("展开调色板");
        paletteWrap.setVisibility(android.view.View.GONE);
        if (self.state.previewMode) self.rebuildBallForNewSize(true);
    });
    btnRow.addView(btnClear);

    scrollBox.addView(btnRow);
    row.addView(paletteWrap);
    parent.addView(row);

  } else {
     // 兜底文本
     var tv = new android.widget.TextView(context);
     tv.setText(String(item.name));
     tv.setTextColor(secColor);
     row.addView(tv);
     parent.addView(row);
  }
};

