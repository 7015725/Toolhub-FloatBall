// @version 1.0.0
// ToolHub - button icon editor module
// Stage 3: icon source / ShortX icon preview / tint inline editor split from th_14_panels.js.

var TOOLHUB_BUTTON_ICON_EDITOR_MODULE_LOADED = true;

FloatBallAppWM.prototype.buildButtonIconEditorInline = function(opts) {
    opts = opts || {};
    var self = this;
    var form = opts.form;
    var targetBtn = opts.targetBtn || {};
    var C = opts.C || self.ui.colors;
    var T = opts.T || self.getAnimalIslandTheme();
    var isDark = !!opts.isDark;
    var cardColor = opts.cardColor;
    var dividerColor = opts.dividerColor;
    var textColor = opts.textColor;
    var subTextColor = opts.subTextColor;
    if (!form) return null;

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
    shortxQuickRow.setOrientation(android.widget.LinearLayout.VERTICAL);
    shortxQuickRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
    shortxQuickRow.setPadding(0, 0, 0, self.dp(8));
    iconSectionBody.addView(shortxQuickRow);

    // 图标预览独占一行，避免右侧按钮挤压预览图。
    var shortxPreviewCard = new android.widget.LinearLayout(context);
    shortxPreviewCard.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    shortxPreviewCard.setGravity(android.view.Gravity.CENTER_VERTICAL);
    shortxPreviewCard.setPadding(self.dp(12), self.dp(10), self.dp(12), self.dp(10));
    shortxPreviewCard.setMinimumHeight(self.dp(58));
    shortxPreviewCard.setBackground(self.ui.createRoundDrawable(self.withAlpha(C.primary, 0.08), self.dp(12)));
    var shortxPreviewLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    shortxPreviewLp.setMargins(0, 0, 0, self.dp(8));
    shortxQuickRow.addView(shortxPreviewCard, shortxPreviewLp);

    var shortxPreviewIv = new android.widget.ImageView(context);
    var shortxPreviewIvLp = new android.widget.LinearLayout.LayoutParams(self.dp(38), self.dp(38));
    shortxPreviewIvLp.rightMargin = self.dp(10);
    shortxPreviewIv.setLayoutParams(shortxPreviewIvLp);
    try { shortxPreviewIv.setScaleType(android.widget.ImageView.ScaleType.CENTER_INSIDE); } catch(eScalePrev) { safeLog(null, 'e', "catch " + String(eScalePrev)); }
    shortxPreviewCard.addView(shortxPreviewIv);
    shortxPickerState.previewIv = shortxPreviewIv;

    var shortxPreviewNameTv = new android.widget.TextView(context);
    shortxPreviewNameTv.setTextColor(textColor);
    shortxPreviewNameTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    try { shortxPreviewNameTv.setSingleLine(true); shortxPreviewNameTv.setEllipsize(android.text.TextUtils.TruncateAt.END);  } catch(eEL0) { safeLog(null, 'e', "catch " + String(eEL0)); }
    shortxPreviewCard.addView(shortxPreviewNameTv, new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1));
    shortxPickerState.previewNameTv = shortxPreviewNameTv;

    var shortxActionRow = new android.widget.LinearLayout(context);
    shortxActionRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    shortxActionRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
    shortxQuickRow.addView(shortxActionRow, new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT));

    var btnBrowseShortXIcon = self.ui.createFlatButton(self, "展开图标库", C.primary, function() {
        self.touchActivity();
        self.showShortXIconPickerPopup({
            currentName: currentShortXIconName,
            currentTint: (inputShortXIconTint && inputShortXIconTint.input) ? String(inputShortXIconTint.input.getText() || "") : "",
            onSelect: function(name) {
                currentShortXIconName = name;
                updateShortXIconPreview();
                try { if (shortxPickerState.toggleBtn) shortxPickerState.toggleBtn.setText(getShortXPickerClosedLabel());  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
                // # 选中 ShortX 图标后自动切换到 ShortX 图标模式，避免保存时走 file 分支导致颜色丢失
                try { rbIconShortX.setChecked(true);  } catch(eRb) { safeLog(null, 'e', "catch " + String(eRb)); }
                try { updateIconInputs("shortx");  } catch(eUp) { safeLog(null, 'e', "catch " + String(eUp)); }
            }
        });
    });
    shortxPickerState.toggleBtn = btnBrowseShortXIcon;
    try { btnBrowseShortXIcon.setContentDescription("打开 ShortX 图标库"); } catch(eBrowseDesc) {}
    var browseIconLp = new android.widget.LinearLayout.LayoutParams(0, self.dp(48));
    browseIconLp.weight = 1;
    browseIconLp.rightMargin = self.dp(6);
    shortxActionRow.addView(btnBrowseShortXIcon, browseIconLp);

    function clearShortXIconOnly() {
        currentShortXIconName = "";
        updateShortXIconPreview();
        try { if (shortxPickerState.toggleBtn) shortxPickerState.toggleBtn.setText(getShortXPickerClosedLabel());  } catch(eClearToggle) { safeLog(null, 'e', "catch " + String(eClearToggle)); }
    }

    var btnClearShortXIcon = self.ui.createFlatButton(self, "清空", subTextColor, function() {
        self.touchActivity();
        clearShortXIconOnly();
    });
    shortxPickerState.clearBtn = btnClearShortXIcon;
    try { btnClearShortXIcon.setContentDescription("清空 ShortX 图标"); } catch(eClearDesc) {}
    var clearIconLp = new android.widget.LinearLayout.LayoutParams(0, self.dp(48));
    clearIconLp.weight = 1;
    clearIconLp.leftMargin = self.dp(6);
    clearIconLp.rightMargin = self.dp(6);
    shortxActionRow.addView(btnClearShortXIcon, clearIconLp);

    var btnColorShortX = self.ui.createFlatButton(self, "颜色", C.primary, function() {
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
    try { btnColorShortX.setContentDescription("选择图标颜色"); } catch(eColorDesc) {}
    var colorIconLp = new android.widget.LinearLayout.LayoutParams(0, self.dp(48));
    colorIconLp.weight = 1;
    colorIconLp.leftMargin = self.dp(6);
    shortxActionRow.addView(btnColorShortX, colorIconLp);

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
    try { btnPrevPage.setContentDescription("上一页"); } catch(ePrevDesc) {}
    shortxPageBar.addView(btnPrevPage, new android.widget.LinearLayout.LayoutParams(self.dp(82), self.dp(48)));
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
    try { btnNextPage.setContentDescription("下一页"); } catch(eNextDesc) {}
    shortxPageBar.addView(btnNextPage, new android.widget.LinearLayout.LayoutParams(self.dp(82), self.dp(48)));
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
    // 颜色文本编辑框不再占用图标外观主页面，已合并到“颜色”弹窗中；这里保留隐藏输入作为保存桥接状态。
    try { inputShortXIconTint.view.setVisibility(android.view.View.GONE); } catch(eTintHide0) { safeLog(null, 'e', "catch " + String(eTintHide0)); }
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
        try { if (tintPaletteState.toggleBtn) tintPaletteState.toggleBtn.setText(getTintPaletteClosedLabel());  } catch(eTintPopupBtn0) { safeLog(null, 'e', "catch " + String(eTintPopupBtn0)); }
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

    var tintPaletteWrap = null;
    tintPaletteState.pickerWrap = null;
    renderRecentTintGrid();
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
            try { inputShortXIconTint.view.setVisibility(android.view.View.GONE); } catch(eTintVisFile) { safeLog(null, 'e', "catch " + String(eTintVisFile)); }
            if (tintPaletteWrap) tintPaletteWrap.setVisibility(android.view.View.GONE);
            shortxPickerState.expanded = false;
            try { if (shortxPickerState.toggleBtn) shortxPickerState.toggleBtn.setText(getShortXPickerClosedLabel());  } catch(eBt0) { safeLog(null, 'e', "catch " + String(eBt0)); }
            currentShortXIconName = "";
            inputShortXIconTint.input.setText("");
        } else if (type === "shortx") {
            inputIconPath.view.setVisibility(android.view.View.GONE);
            shortxQuickRow.setVisibility(android.view.View.VISIBLE);
            try { inputShortXIconTint.view.setVisibility(android.view.View.GONE); } catch(eTintVisShort) { safeLog(null, 'e', "catch " + String(eTintVisShort)); }
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



    return {
        inputIconPath: inputIconPath,
        isShortXSelected: function() { try { return rbIconShortX.isChecked() ? true : false; } catch(e) { return false; } },
        getIconPath: function() { try { return inputIconPath.getValue(); } catch(e) { return ""; } },
        getShortXIconName: function() { try { return self.normalizeShortXIconName(currentShortXIconName, false); } catch(e) { return ""; } },
        getShortXIconTint: function() {
            var sxTint = currentShortXIconTint || targetBtn.iconTint || "";
            if (!sxTint) { try { sxTint = inputShortXIconTint.getValue(); } catch(eGetTint) { safeLog(null, 'e', "catch " + String(eGetTint)); } }
            return sxTint || "";
        },
        updateIconInputs: function(type) { try { updateIconInputs(type); } catch(e) { safeLog(null, 'e', "catch " + String(e)); } }
    };
};
