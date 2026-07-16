// @version 1.0.4
// ToolHub - button shortcut inline selector module
// Stage 2 split: shortcut inline picker logic moved out of th_14_panels.js.

FloatBallAppWM.prototype.buildButtonShortcutPickerInline = function(opts) {
    var self = this;
    opts = opts || {};
    var targetBtn = opts.targetBtn || {};
    var dynamicContainer = opts.dynamicContainer;
    var inputTitle = opts.inputTitle;
    var inputIconPath = opts.inputIconPath;
    var C = opts.C || (self.ui && self.ui.colors) || {};
    var textColor = opts.textColor;
    var subTextColor = opts.subTextColor;

    function __scStr(v) {
        try { return String(v == null ? "" : v); } catch(e) { return ""; }
    }

    function __scLower(v) {
        try { return __scStr(v).toLowerCase(); } catch(e) { return ""; }
    }

    function __scTrim(v) {
        try { return __scStr(v).replace(/^\s+|\s+$/g, ""); } catch(e) { return ""; }
    }

    function __scNow() {
        try { return new Date().getTime(); } catch(e) { return 0; }
    }

    function __scThreadId() {
        try { return Number(java.lang.Thread.currentThread().getId()); } catch(e) { return 0; }
    }

    function __scSanitizeFileName(s) {
        try {
            var t = __scStr(s).replace(/[^a-zA-Z0-9._-]+/g, "_");
            if (t.length > 120) t = t.substring(0, 120);
            return t;
        } catch(e) { return ""; }
    }

    function __scDrawableToBitmap(drawable, targetPx) {
        try {
            if (!drawable) return null;
            try {
                if (drawable instanceof android.graphics.drawable.BitmapDrawable) {
                    var bitmap0 = drawable.getBitmap();
                    if (bitmap0) return bitmap0;
                }
            } catch(eBitmapDrawable) {}

            var width = 0;
            var height = 0;
            try { width = Number(drawable.getIntrinsicWidth()); } catch(eWidth) { width = 0; }
            try { height = Number(drawable.getIntrinsicHeight()); } catch(eHeight) { height = 0; }
            if (width <= 0 || height <= 0) {
                width = targetPx || 192;
                height = targetPx || 192;
            }

            var maxSide = targetPx || 192;
            var sourceSide = Math.max(width, height);
            var scale = sourceSide > maxSide ? maxSide / sourceSide : 1.0;
            var bitmapWidth = Math.max(1, Math.round(width * scale));
            var bitmapHeight = Math.max(1, Math.round(height * scale));
            var bitmap = android.graphics.Bitmap.createBitmap(bitmapWidth, bitmapHeight, android.graphics.Bitmap.Config.ARGB_8888);
            var canvas = new android.graphics.Canvas(bitmap);
            drawable.setBounds(0, 0, bitmapWidth, bitmapHeight);
            drawable.draw(canvas);
            return bitmap;
        } catch(e) { return null; }
    }

    var __scLauncherApps = null;
    var __scPm = null;
    try { __scLauncherApps = context.getSystemService(android.content.Context.LAUNCHER_APPS_SERVICE); } catch(eLauncherApps) {}
    try { __scPm = context.getPackageManager(); } catch(ePackageManager) {}

    function __scEnsureShortcutIconFile(item) {
        var output = null;
        try {
            if (!item) return "";
            var pkg = __scStr(item.pkg);
            var shortcutId = __scStr(item.shortcutId);
            var userId = item.userId != null ? __scStr(item.userId) : "0";
            if (!pkg || !shortcutId) return "";

            var dirPath = String(APP_ROOT_DIR) + "/shortcut_icons";
            var dir = new java.io.File(dirPath);
            if (!dir.exists() && !dir.mkdirs()) return "";
            var fileName = __scSanitizeFileName(pkg) + "__" + __scSanitizeFileName(shortcutId) + "__u" + __scSanitizeFileName(userId) + ".png";
            var outputPath = dirPath + "/" + fileName;
            var outputFile = new java.io.File(outputPath);
            if (outputFile.exists() && outputFile.isFile() && outputFile.length() > 0) return outputPath;

            var drawable = null;
            try {
                if (__scLauncherApps && item.shortcutInfo) drawable = __scLauncherApps.getShortcutIconDrawable(item.shortcutInfo, 0);
            } catch(eShortcutIcon) { drawable = null; }
            if (!drawable && __scPm) {
                try { drawable = __scPm.getApplicationIcon(pkg); } catch(eAppIcon) { drawable = null; }
            }
            if (!drawable) return "";

            var bitmap = __scDrawableToBitmap(drawable, 192);
            if (!bitmap) return "";
            output = new java.io.FileOutputStream(outputPath);
            if (!bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, output)) return "";
            output.flush();
            output.close();
            output = null;
            return outputPath;
        } catch(eWriteIcon) {
            safeLog(self.L, "w", "shortcut icon export fail: " + String(eWriteIcon));
            try { if (output) output.close(); } catch(eCloseOutput) {}
        }
        return "";
    }

    var shortcutWrap = new android.widget.LinearLayout(context);
    shortcutWrap.setOrientation(android.widget.LinearLayout.VERTICAL);

    var inputScPkg = self.ui.createInputGroup(self, "快捷方式包名 (Package)", targetBtn.pkg, false, "例如: com.tencent.mm");
    var inputScId = self.ui.createInputGroup(self, "快捷方式 ID (shortcutId)", targetBtn.shortcutId, false, "以系统查询结果为准");
    shortcutWrap.addView(inputScPkg.view);
    shortcutWrap.addView(inputScId.view);
    try { inputScPkg.view.setVisibility(android.view.View.GONE); } catch(eHidePkg) {}
    try { inputScId.view.setVisibility(android.view.View.GONE); } catch(eHideShortcutId) {}

    var scSelectedIntentUri = targetBtn.intentUri ? String(targetBtn.intentUri) : "";
    var scSelectedUserId = 0;
    try {
        scSelectedUserId = targetBtn.userId != null ? parseInt(String(targetBtn.userId), 10) : 0;
        if (isNaN(scSelectedUserId) || scSelectedUserId < 0) scSelectedUserId = 0;
    } catch(eSelectedUser) { scSelectedUserId = 0; }

    var legacyJsEnabled = false;
    try {
        var legacyMode = __scLower(__scTrim(targetBtn.shortcutExecMode));
        legacyJsEnabled = legacyMode === "legacy_js";
        if (!legacyJsEnabled && !scSelectedIntentUri && targetBtn.shortcutJsCode && String(targetBtn.shortcutRunMode || "") === "js") legacyJsEnabled = true;
    } catch(eLegacyMode) { legacyJsEnabled = false; }

    var legacyJsSwitch = null;
    var inputScJsCode = null;

    function __scSetLegacyJsEnabled(enabled) {
        legacyJsEnabled = !!enabled;
        try {
            if (legacyJsSwitch && legacyJsSwitch.isChecked() !== legacyJsEnabled) legacyJsSwitch.setChecked(legacyJsEnabled);
        } catch(eLegacyChecked) {}
        try {
            if (inputScJsCode && inputScJsCode.view) inputScJsCode.view.setVisibility(legacyJsEnabled ? android.view.View.VISIBLE : android.view.View.GONE);
        } catch(eLegacyVisible) {}
    }

    if (legacyJsEnabled) {
        var legacyJsWrap = new android.widget.LinearLayout(context);
        legacyJsWrap.setOrientation(android.widget.LinearLayout.VERTICAL);
        legacyJsWrap.setPadding(self.dp(10), self.dp(8), self.dp(10), self.dp(8));

        var legacyWarn = new android.widget.TextView(context);
        legacyWarn.setText("旧版 JS 兼容模式：仅用于没有 intentUri 的历史按钮。重新选择快捷方式后将自动关闭。");
        toolhubSafeSetTextColor(legacyWarn, subTextColor);
        legacyWarn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
        legacyWarn.setPadding(0, 0, 0, self.dp(6));
        legacyJsWrap.addView(legacyWarn);

        var legacyRow = new android.widget.LinearLayout(context);
        legacyRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        legacyRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
        var legacyTitle = new android.widget.TextView(context);
        legacyTitle.setText("保留旧版 JS 执行");
        toolhubSafeSetTextColor(legacyTitle, textColor);
        legacyTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
        var legacyTitleLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        legacyTitleLp.weight = 1;
        legacyRow.addView(legacyTitle, legacyTitleLp);
        legacyJsSwitch = new android.widget.Switch(context);
        legacyJsSwitch.setChecked(true);
        legacyRow.addView(legacyJsSwitch);
        legacyJsWrap.addView(legacyRow);

        inputScJsCode = self.ui.createInputGroup(self, "旧版快捷方式 JS", targetBtn.shortcutJsCode ? String(targetBtn.shortcutJsCode) : "", true, "仅为历史兼容保留");
        legacyJsWrap.addView(inputScJsCode.view);
        legacyJsSwitch.setOnCheckedChangeListener(new android.widget.CompoundButton.OnCheckedChangeListener({
            onCheckedChanged: function(buttonView, checked) {
                try { __scSetLegacyJsEnabled(!!checked); self.touchActivity(); } catch(eLegacyToggle) {}
            }
        }));
        shortcutWrap.addView(legacyJsWrap);
        __scSetLegacyJsEnabled(true);
    }

    var scInlineState = {
        expanded: false,
        loading: false,
        loaded: false,
        loadedTs: 0,
        allItems: [],
        generation: 0,
        disposed: false,
        reloadPending: false,
        ownerThreadId: __scThreadId(),
        renderRunnable: null,
        searchRunnable: null,
        pendingQuery: "",
        lastQuery: null,
        lastSourceSize: -1,
        rendered: false
    };

    var scHeader = new android.widget.LinearLayout(context);
    scHeader.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    scHeader.setGravity(android.view.Gravity.CENTER_VERTICAL);
    scHeader.setPadding(self.dp(10), self.dp(10), self.dp(10), self.dp(10));

    var scHeaderTv = new android.widget.TextView(context);
    scHeaderTv.setText("选择快捷方式（点击展开）");
    toolhubSafeSetTextColor(scHeaderTv, textColor);
    scHeaderTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    var scHeaderTvLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    scHeaderTvLp.weight = 1;
    scHeader.addView(scHeaderTv, scHeaderTvLp);

    var scRefreshTv = new android.widget.TextView(context);
    scRefreshTv.setText("刷新");
    toolhubSafeSetTextColor(scRefreshTv, subTextColor);
    scRefreshTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
    scRefreshTv.setPadding(self.dp(10), self.dp(6), self.dp(10), self.dp(6));
    scRefreshTv.setClickable(true);
    scHeader.addView(scRefreshTv);

    var scArrowTv = new android.widget.TextView(context);
    scArrowTv.setText("▼");
    toolhubSafeSetTextColor(scArrowTv, subTextColor);
    scArrowTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    scHeader.addView(scArrowTv);

    var scBody = new android.widget.LinearLayout(context);
    scBody.setOrientation(android.widget.LinearLayout.VERTICAL);
    scBody.setVisibility(android.view.View.GONE);
    scBody.setPadding(self.dp(10), 0, self.dp(10), self.dp(10));

    var scSearchWrap = self.ui.createInputGroup(self, "搜索", "", false, "输入关键词过滤：名称/包名/ID");
    scBody.addView(scSearchWrap.view);

    var scHint = new android.widget.TextView(context);
    scHint.setText("");
    toolhubSafeSetTextColor(scHint, subTextColor);
    scHint.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    scHint.setPadding(0, self.dp(6), 0, self.dp(6));
    scBody.addView(scHint);

    var scListBox = new android.widget.FrameLayout(context);
    try {
        var displayMetrics = context.getResources().getDisplayMetrics();
        var targetHeight = displayMetrics && displayMetrics.heightPixels ? Math.floor(displayMetrics.heightPixels * 0.45) : self.dp(260);
        targetHeight = Math.max(self.dp(180), Math.min(self.dp(420), targetHeight));
        scListBox.setLayoutParams(new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, targetHeight));
        var listBoxBackground = new android.graphics.drawable.GradientDrawable();
        listBoxBackground.setShape(android.graphics.drawable.GradientDrawable.RECTANGLE);
        listBoxBackground.setCornerRadius(self.dp(10));
        toolhubSafeSetColor(listBoxBackground, self.isDarkTheme() ? C.cardDark : C.cardLight);
        toolhubSafeSetStroke(listBoxBackground, self.dp(1), self.isDarkTheme() ? C.dividerDark : C.dividerLight);
        scListBox.setBackground(listBoxBackground);
        scListBox.setPadding(self.dp(6), self.dp(6), self.dp(6), self.dp(6));
    } catch(eListBox) {
        safeLog(self.L, "w", "shortcut picker list box build fail: " + String(eListBox));
    }

    var scList = new android.widget.ListView(context);
    try { scList.setDivider(null); } catch(eDivider) {}
    try { scList.setVerticalScrollBarEnabled(true); } catch(eScrollBar) {}
    try { scList.setOverScrollMode(android.view.View.OVER_SCROLL_IF_CONTENT_SCROLLS); } catch(eOverScroll) {}
    try { scList.setCacheColorHint(android.graphics.Color.TRANSPARENT); } catch(eCacheHint) {}
    try {
        scList.setOnTouchListener(new android.view.View.OnTouchListener({
            onTouch: function(v, event) {
                try {
                    var action = event.getActionMasked ? event.getActionMasked() : event.getAction();
                    if (action === android.view.MotionEvent.ACTION_DOWN || action === android.view.MotionEvent.ACTION_MOVE) {
                        var parent = v.getParent();
                        while (parent != null) {
                            try { parent.requestDisallowInterceptTouchEvent(true); } catch(eRequest) {}
                            try { parent = parent.getParent(); } catch(eParent) { parent = null; }
                        }
                    }
                } catch(eTouch) {}
                return false;
            }
        }));
    } catch(eTouchListener) {}
    scListBox.addView(scList, new android.widget.FrameLayout.LayoutParams(android.widget.FrameLayout.LayoutParams.MATCH_PARENT, android.widget.FrameLayout.LayoutParams.MATCH_PARENT));
    scBody.addView(scListBox);

    function __scIsAttached() {
        try {
            if (scInlineState.disposed || !scList) return false;
            if (scList.isAttachedToWindow) return !!scList.isAttachedToWindow();
            return scList.getWindowToken() != null;
        } catch(e) { return false; }
    }

    function __scIsGenerationCurrent(generation) {
        try {
            return !scInlineState.disposed && Number(generation) === Number(scInlineState.generation);
        } catch(e) { return false; }
    }

    function __scPostToOwnerView(generation, callback) {
        try {
            if (!callback || !__scIsGenerationCurrent(generation)) return false;
            var posted = scList.post(new java.lang.Runnable({
                run: function() {
                    try {
                        if (!__scIsGenerationCurrent(generation)) {
                            safeLog(self.L, "d", "shortcut picker callback dropped reason=stale_generation generation=" + String(generation));
                            return;
                        }
                        if (!__scIsAttached()) {
                            safeLog(self.L, "d", "shortcut picker callback dropped reason=detached generation=" + String(generation));
                            return;
                        }
                        callback();
                    } catch(eCallback) {
                        safeLog(self.L, "e", "shortcut picker owner callback fail generation=" + String(generation) + " err=" + String(eCallback));
                    }
                }
            }));
            if (posted === false) {
                safeLog(self.L, "w", "shortcut picker owner post rejected generation=" + String(generation));
                return false;
            }
            return true;
        } catch(ePost) {
            safeLog(self.L, "e", "shortcut picker owner post fail generation=" + String(generation) + " err=" + String(ePost));
        }
        return false;
    }

    var __scIconCache = {};
    var __scIconKeys = [];
    var __scIconInFlight = {};
    var __scIconMax = 120;
    var __scIconLoader = null;
    try {
        if (self.__scIconLoaderSingleton) {
            __scIconLoader = self.__scIconLoaderSingleton;
        } else {
            var iconThread = new android.os.HandlerThread("sx-toolhub-scicon-loader");
            iconThread.start();
            __scIconLoader = { ht: iconThread, h: new android.os.Handler(iconThread.getLooper()) };
            self.__scIconLoaderSingleton = __scIconLoader;
        }
    } catch(eIconLoader) { __scIconLoader = null; }

    function __scPutIcon(key, drawable) {
        try {
            if (!key || !drawable || __scIconCache[key]) return;
            __scIconCache[key] = drawable;
            __scIconKeys.push(key);
            if (__scIconKeys.length > __scIconMax) {
                var oldKey = __scIconKeys.shift();
                try { delete __scIconCache[oldKey]; } catch(eDeleteOldIcon) {}
            }
        } catch(e) {}
    }

    function __scRequestIcon(item, imageView) {
        try {
            if (!item || !imageView || scInlineState.disposed) return;
            var key = __scStr(item.pkg) + "|" + __scStr(item.shortcutId) + "|" + __scStr(item.userId);
            imageView.setTag(key);
            if (__scIconCache[key]) {
                imageView.setImageDrawable(__scIconCache[key]);
                return;
            }
            try {
                if (__scPm) {
                    var appIcon = __scPm.getApplicationIcon(__scStr(item.pkg));
                    if (appIcon) imageView.setImageDrawable(appIcon);
                }
            } catch(eAppIcon) {}
            if (__scIconInFlight[key] || !__scIconLoader || !__scIconLoader.h) return;
            __scIconInFlight[key] = true;
            __scIconLoader.h.post(new java.lang.Runnable({
                run: function() {
                    var drawable = null;
                    try {
                        if (__scLauncherApps && item.shortcutInfo) drawable = __scLauncherApps.getShortcutIconDrawable(item.shortcutInfo, 0);
                    } catch(eShortcutDrawable) { drawable = null; }
                    if (drawable) __scPutIcon(key, drawable);
                    try { delete __scIconInFlight[key]; } catch(eDeleteFlight) {}
                    try {
                        scList.post(new java.lang.Runnable({
                            run: function() {
                                try {
                                    if (!drawable || scInlineState.disposed || !__scIsAttached()) return;
                                    var currentTag = imageView.getTag();
                                    if (String(currentTag) === String(key)) imageView.setImageDrawable(drawable);
                                } catch(eApplyIcon) {}
                            }
                        }));
                    } catch(ePostIcon) {}
                }
            }));
        } catch(eRequestIcon) {}
    }

    var __scAppLabelCache = {};
    function __scGetAppLabel(pkg) {
        var packageName = __scStr(pkg);
        if (!packageName) return "";
        if (__scAppLabelCache[packageName]) return __scAppLabelCache[packageName];
        var label = packageName;
        try {
            if (__scPm) {
                var appInfo = __scPm.getApplicationInfo(packageName, 0);
                label = __scStr(__scPm.getApplicationLabel(appInfo)) || packageName;
            }
        } catch(eAppLabel) { label = packageName; }
        __scAppLabelCache[packageName] = label;
        return label;
    }

    var __scData = [];
    var __scAdapter = new android.widget.BaseAdapter({
        getCount: function() { return __scData.length; },
        getItem: function(position) { return __scData[position]; },
        getItemId: function(position) { return position; },
        getView: function(position, convertView, parent) {
            var row = convertView;
            var holder = null;
            if (row == null) {
                row = new android.widget.LinearLayout(context);
                row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
                row.setGravity(android.view.Gravity.CENTER_VERTICAL);
                row.setPadding(self.dp(10), self.dp(8), self.dp(10), self.dp(8));
                try { row.setBackground(self.ui.createRoundDrawable(self.isDarkTheme() ? C.cardDark : C.cardLight, self.dp(10))); } catch(eRowBackground) {}

                var icon = new android.widget.ImageView(context);
                var iconLp = new android.widget.LinearLayout.LayoutParams(self.dp(36), self.dp(36));
                iconLp.rightMargin = self.dp(10);
                row.addView(icon, iconLp);

                var textBox = new android.widget.LinearLayout(context);
                textBox.setOrientation(android.widget.LinearLayout.VERTICAL);
                var textBoxLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
                textBoxLp.weight = 1;
                row.addView(textBox, textBoxLp);

                var title = new android.widget.TextView(context);
                toolhubSafeSetTextColor(title, textColor);
                title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
                textBox.addView(title);

                var detail = new android.widget.TextView(context);
                toolhubSafeSetTextColor(detail, subTextColor);
                detail.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
                detail.setPadding(0, self.dp(2), 0, 0);
                textBox.addView(detail);

                holder = { icon: icon, title: title, detail: detail };
                row.setTag(holder);
            } else {
                holder = row.getTag();
            }

            var item = __scData[position];
            if (item && holder) {
                var appName = __scGetAppLabel(item.pkg);
                var shortcutName = __scStr(item.label || item.shortcutId || "(无名称)");
                holder.title.setText(appName ? appName + "/" + shortcutName : shortcutName);
                var launchLabel = item.intentUri ? "Launcher + Intent 后备" : "Launcher 启动";
                holder.detail.setText("用户 " + __scStr(item.userId) + " · " + launchLabel + "\npkg=" + __scStr(item.pkg) + "  id=" + __scStr(item.shortcutId));
                try { holder.icon.setImageResource(android.R.drawable.sym_def_app_icon); } catch(eDefaultIcon) {}
                __scRequestIcon(item, holder.icon);
            }
            return row;
        }
    });
    scList.setAdapter(__scAdapter);

    function __scCollectUsers() {
        var users = [];
        var seen = {};
        function addUser(value) {
            var userId = parseInt(__scStr(value), 10);
            if (isNaN(userId) || userId < 0 || seen[String(userId)]) return;
            seen[String(userId)] = true;
            users.push(userId);
        }
        try {
            var currentUser = android.os.Process.myUserHandle();
            if (currentUser && currentUser.getIdentifier) addUser(currentUser.getIdentifier());
        } catch(eCurrentUser) { addUser(0); }
        try {
            var userManager = context.getSystemService(android.content.Context.USER_SERVICE);
            var profiles = userManager ? userManager.getUserProfiles() : null;
            if (profiles) {
                for (var i = 0; i < profiles.size(); i++) {
                    var handle = profiles.get(i);
                    if (handle && handle.getIdentifier) addUser(handle.getIdentifier());
                }
            }
        } catch(eProfiles) {}
        try {
            var baseDir = new java.io.File("/data/system_ce");
            var files = baseDir.exists() && baseDir.isDirectory() ? baseDir.listFiles() : null;
            if (files) {
                for (var j = 0; j < files.length; j++) {
                    if (!files[j] || !files[j].isDirectory()) continue;
                    var name = __scStr(files[j].getName());
                    if (/^\d+$/.test(name)) addUser(name);
                }
            }
        } catch(eUserDir) {}
        if (users.length === 0) users.push(0);
        users.sort(function(a, b) { return Number(a) - Number(b); });
        return users;
    }

    function __scGetPackageNames(userId) {
        var packages = [];
        var seen = {};
        try {
            var dir = new java.io.File("/data/system_ce/" + String(userId) + "/shortcut_service/packages");
            var files = dir.exists() && dir.isDirectory() ? dir.listFiles() : null;
            if (files) {
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    if (!file || !file.isFile()) continue;
                    var name = __scStr(file.getName());
                    if (name.length <= 4 || name.substring(name.length - 4) !== ".xml") continue;
                    var pkg = name.substring(0, name.length - 4);
                    if (pkg && !seen[pkg]) {
                        seen[pkg] = true;
                        packages.push(pkg);
                    }
                }
            }
        } catch(ePackageNames) {}
        return packages;
    }

    function __scIntentUriFromInfo(info) {
        try {
            var intent = info && info.getIntent ? info.getIntent() : null;
            if (!intent) return "";
            var uri = String(intent.toUri(0));
            return uri && uri.indexOf("#Intent") === 0 ? "intent:" + uri : uri;
        } catch(e) { return ""; }
    }

    function __scPushUnique(items, dedupe, userId, pkg, info) {
        try {
            if (!info) return;
            var shortcutId = __scStr(info.getId());
            if (!pkg || !shortcutId) return;
            var key = String(userId) + "|" + String(pkg) + "|" + shortcutId;
            if (dedupe[key]) return;
            dedupe[key] = true;
            var label = "";
            try { label = __scStr(info.getShortLabel()); } catch(eLabel) { label = ""; }
            var intentUri = __scIntentUriFromInfo(info);
            items.push({
                userId: Number(userId),
                pkg: __scStr(pkg),
                shortcutId: shortcutId,
                label: label,
                intentUri: intentUri,
                shortcutInfo: info
            });
        } catch(ePush) {}
    }

    function __scLoadAllItems() {
        var items = [];
        var dedupe = {};
        var users = __scCollectUsers();
        var shortcutSvc = null;
        try { shortcutSvc = android.os.ServiceManager.getService("shortcut"); } catch(eShortcutService) { shortcutSvc = null; }
        var ShortcutQuery = android.content.pm.LauncherApps.ShortcutQuery;
        var matchAll = 0x0000000F;

        for (var userIndex = 0; userIndex < users.length; userIndex++) {
            var userId = users[userIndex];
            var packages = __scGetPackageNames(userId);
            for (var packageIndex = 0; packageIndex < packages.length; packageIndex++) {
                var packageName = packages[packageIndex];
                var serviceReturned = false;

                if (shortcutSvc) {
                    try {
                        var slice = shortcutSvc.getShortcuts(String(packageName), matchAll, parseInt(String(userId), 10));
                        var serviceList = slice && slice.getList ? slice.getList() : null;
                        if (serviceList) {
                            serviceReturned = true;
                            for (var serviceIndex = 0; serviceIndex < serviceList.size(); serviceIndex++) {
                                __scPushUnique(items, dedupe, userId, packageName, serviceList.get(serviceIndex));
                                if (items.length >= 5000) return items;
                            }
                        }
                    } catch(eServiceQuery) { serviceReturned = false; }
                }

                if (!serviceReturned && __scLauncherApps) {
                    try {
                        var query = new ShortcutQuery();
                        query.setPackage(packageName);
                        var flags = 0;
                        try { flags = flags | ShortcutQuery.FLAG_MATCH_DYNAMIC; } catch(eDynamicFlag) {}
                        try { flags = flags | ShortcutQuery.FLAG_MATCH_PINNED; } catch(ePinnedFlag) {}
                        try { flags = flags | ShortcutQuery.FLAG_MATCH_MANIFEST; } catch(eManifestFlag) {}
                        try { flags = flags | ShortcutQuery.FLAG_MATCH_CACHED; } catch(eCachedFlag) {}
                        query.setQueryFlags(flags);
                        var userHandle = android.os.UserHandle.of(parseInt(String(userId), 10));
                        var launcherList = __scLauncherApps.getShortcuts(query, userHandle);
                        if (launcherList) {
                            for (var launcherIndex = 0; launcherIndex < launcherList.size(); launcherIndex++) {
                                __scPushUnique(items, dedupe, userId, packageName, launcherList.get(launcherIndex));
                                if (items.length >= 5000) return items;
                            }
                        }
                    } catch(eLauncherQuery) {}
                }
            }
        }

        items.sort(function(a, b) {
            if (Number(a.userId) !== Number(b.userId)) return Number(a.userId) - Number(b.userId);
            var appA = __scLower(__scGetAppLabel(a.pkg));
            var appB = __scLower(__scGetAppLabel(b.pkg));
            if (appA < appB) return -1;
            if (appA > appB) return 1;
            var labelA = __scLower(a.label || a.shortcutId);
            var labelB = __scLower(b.label || b.shortcutId);
            if (labelA < labelB) return -1;
            if (labelA > labelB) return 1;
            return 0;
        });
        return items;
    }

    function __scRenderListNow(query) {
        var currentThreadId = __scThreadId();
        if (scInlineState.ownerThreadId > 0 && currentThreadId !== scInlineState.ownerThreadId) {
            safeLog(self.L, "e", "shortcut picker render blocked reason=wrong_thread ownerTid=" + String(scInlineState.ownerThreadId) + " currentTid=" + String(currentThreadId));
            return;
        }
        if (scInlineState.disposed) return;

        var normalizedQuery = __scLower(__scTrim(query));
        var source = scInlineState.allItems || [];
        if (scInlineState.rendered && scInlineState.lastQuery === normalizedQuery && scInlineState.lastSourceSize === source.length) return;

        var output = [];
        for (var i = 0; i < source.length; i++) {
            var item = source[i];
            if (!item) continue;
            if (normalizedQuery) {
                var haystack = __scLower(item.label) + " " + __scLower(item.pkg) + " " + __scLower(__scGetAppLabel(item.pkg)) + " " + __scLower(item.shortcutId) + " " + __scStr(item.userId);
                if (haystack.indexOf(normalizedQuery) < 0) continue;
            }
            output.push(item);
            if (output.length >= 300) break;
        }

        __scData = output;
        scInlineState.lastQuery = normalizedQuery;
        scInlineState.lastSourceSize = source.length;
        scInlineState.rendered = true;
        __scAdapter.notifyDataSetChanged();
        try { scList.invalidateViews(); } catch(eInvalidate) {}
        try { scList.requestLayout(); } catch(eRequestLayout) {}
        if (output.length === 0) scHint.setText("无匹配结果（共 " + String(source.length) + " 条）");
        else scHint.setText("共 " + String(source.length) + " 条，显示 " + String(output.length) + " 条（在框内滑动）");
    }

    function __scScheduleRender(query, delayMs) {
        try {
            scInlineState.pendingQuery = query;
            if (scInlineState.renderRunnable) scList.removeCallbacks(scInlineState.renderRunnable);
            scInlineState.renderRunnable = new java.lang.Runnable({
                run: function() {
                    try { __scRenderListNow(scInlineState.pendingQuery); } catch(eRender) {
                        safeLog(self.L, "e", "shortcut picker render fail: " + String(eRender));
                    }
                }
            });
            scList.postDelayed(scInlineState.renderRunnable, Number(delayMs || 0));
        } catch(eScheduleRender) {
            safeLog(self.L, "e", "shortcut picker render schedule fail: " + String(eScheduleRender));
        }
    }

    function __scFinishPendingReload() {
        if (!scInlineState.reloadPending || scInlineState.disposed) return;
        scInlineState.reloadPending = false;
        __scEnsureLoadedAndRender(true);
    }

    function __scEnsureLoadedAndRender(force) {
        try {
            force = !!force;
            if (scInlineState.disposed) return;
            if (scInlineState.loading) {
                if (force) scInlineState.reloadPending = true;
                return;
            }

            var now = __scNow();
            var stale = scInlineState.loadedTs > 0 && now > 0 && now - scInlineState.loadedTs > 8000;
            if (scInlineState.loaded && !force && !stale) {
                __scRenderListNow(scSearchWrap.getValue());
                return;
            }

            scInlineState.loading = true;
            scInlineState.reloadPending = false;
            scInlineState.generation = Number(scInlineState.generation || 0) + 1;
            var generation = scInlineState.generation;
            var startedAt = now;
            var hadOldData = scInlineState.loaded && scInlineState.allItems && scInlineState.allItems.length > 0;
            scHint.setText(force ? "正在刷新快捷方式列表..." : "正在加载快捷方式列表...");
            safeLog(self.L, "i", "shortcut picker load begin generation=" + String(generation) + " force=" + String(force) + " ownerTid=" + String(scInlineState.ownerThreadId));

            new java.lang.Thread(new java.lang.Runnable({
                run: function() {
                    var items = [];
                    var loadError = "";
                    try { items = __scLoadAllItems() || []; } catch(eLoad) { loadError = String(eLoad); items = []; }
                    var finishedAt = __scNow();
                    safeLog(self.L, loadError ? "e" : "i", "shortcut picker scan done generation=" + String(generation) + " count=" + String(items.length) + " costMs=" + String(finishedAt > 0 && startedAt > 0 ? finishedAt - startedAt : -1) + " workerTid=" + String(__scThreadId()) + (loadError ? " err=" + loadError : ""));

                    var posted = __scPostToOwnerView(generation, function() {
                        scInlineState.loading = false;
                        if (loadError) {
                            if (!hadOldData) scInlineState.loaded = false;
                            scHint.setText(hadOldData ? "刷新失败，已保留原列表" : "快捷方式加载失败，点击刷新重试");
                            __scFinishPendingReload();
                            return;
                        }

                        scInlineState.loaded = true;
                        scInlineState.loadedTs = __scNow();
                        scInlineState.allItems = items;
                        scInlineState.rendered = false;
                        __scRenderListNow(scSearchWrap.getValue());
                        safeLog(self.L, "i", "shortcut picker apply done generation=" + String(generation) + " count=" + String(items.length) + " ownerTid=" + String(__scThreadId()));
                        __scFinishPendingReload();
                    });

                    if (!posted && __scIsGenerationCurrent(generation)) {
                        scInlineState.loading = false;
                        safeLog(self.L, "w", "shortcut picker result dropped generation=" + String(generation));
                    }
                }
            }), "sx-toolhub-shortcut-picker").start();
        } catch(eDispatch) {
            scInlineState.loading = false;
            safeLog(self.L, "e", "shortcut picker load dispatch fail: " + String(eDispatch));
            try { scHint.setText("快捷方式加载失败，点击刷新重试"); } catch(eHintFailure) {}
        }
    }

    scList.setOnItemClickListener(new android.widget.AdapterView.OnItemClickListener({
        onItemClick: function(parent, view, position, id) {
            try {
                var item = __scData[position];
                if (!item) return;
                inputScPkg.input.setText(__scStr(item.pkg));
                inputScId.input.setText(__scStr(item.shortcutId));
                scSelectedIntentUri = __scStr(item.intentUri);
                scSelectedUserId = parseInt(__scStr(item.userId), 10);
                if (isNaN(scSelectedUserId) || scSelectedUserId < 0) scSelectedUserId = 0;
                safeLog(self.L, "i", "shortcut picker selected pkg=" + __scStr(item.pkg) + " id=" + __scStr(item.shortcutId) + " user=" + String(scSelectedUserId) + " intentUriLen=" + String(scSelectedIntentUri.length) + " launchMethod=" + (scSelectedIntentUri ? "launcher_intent" : "launcher"));
                __scSetLegacyJsEnabled(false);

                var iconPath = __scEnsureShortcutIconFile(item);
                if (iconPath && inputIconPath && inputIconPath.input) inputIconPath.input.setText(iconPath);
                try {
                    var currentTitle = inputTitle && inputTitle.getValue ? __scTrim(inputTitle.getValue()) : "";
                    if (!currentTitle && inputTitle && inputTitle.input && item.label) inputTitle.input.setText(__scStr(item.label));
                } catch(eTitleFill) {}

                scInlineState.expanded = false;
                scBody.setVisibility(android.view.View.GONE);
                scArrowTv.setText("▼");
                var appName = __scGetAppLabel(item.pkg);
                var shortcutName = __scStr(item.label || item.shortcutId || "快捷方式");
                scHeaderTv.setText("已选择：" + (appName ? appName + "/" : "") + shortcutName + "（点击展开）");
                try { self.state.pendingDirty = true; } catch(eDirty) {}
            } catch(eSelect) {
                safeLog(self.L, "e", "shortcut picker select fail: " + String(eSelect));
                try { self.toast("回填失败: " + String(eSelect)); } catch(eToastSelect) {}
            }
        }
    }));

    scRefreshTv.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function(v) {
            try {
                __scIconCache = {};
                __scIconKeys = [];
                __scIconInFlight = {};
                if (!scInlineState.expanded) {
                    scInlineState.expanded = true;
                    scBody.setVisibility(android.view.View.VISIBLE);
                    scArrowTv.setText("▲");
                }
                __scEnsureLoadedAndRender(true);
                try { self.toast("正在刷新快捷方式"); } catch(eToastRefresh) {}
            } catch(eRefresh) {
                safeLog(self.L, "e", "shortcut picker refresh fail: " + String(eRefresh));
            }
        }
    }));

    scHeader.setClickable(true);
    scHeader.setOnClickListener(new android.view.View.OnClickListener({
        onClick: function(v) {
            try {
                scInlineState.expanded = !scInlineState.expanded;
                scBody.setVisibility(scInlineState.expanded ? android.view.View.VISIBLE : android.view.View.GONE);
                scArrowTv.setText(scInlineState.expanded ? "▲" : "▼");
                if (scInlineState.expanded) __scEnsureLoadedAndRender(false);
                self.touchActivity();
            } catch(eToggle) {
                safeLog(self.L, "e", "shortcut picker toggle fail: " + String(eToggle));
            }
        }
    }));

    try {
        scSearchWrap.input.addTextChangedListener(new android.text.TextWatcher({
            beforeTextChanged: function() {},
            onTextChanged: function() {},
            afterTextChanged: function(s) {
                if (!scInlineState.loaded || scInlineState.disposed) return;
                try {
                    if (scInlineState.searchRunnable) scList.removeCallbacks(scInlineState.searchRunnable);
                    var query = __scStr(s);
                    scInlineState.searchRunnable = new java.lang.Runnable({
                        run: function() { __scScheduleRender(query, 0); }
                    });
                    scList.postDelayed(scInlineState.searchRunnable, 180);
                } catch(eSearch) {
                    safeLog(self.L, "w", "shortcut picker search schedule fail: " + String(eSearch));
                }
            }
        }));
    } catch(eWatcher) {}

    try {
        shortcutWrap.addOnAttachStateChangeListener(new android.view.View.OnAttachStateChangeListener({
            onViewAttachedToWindow: function(v) {
                scInlineState.disposed = false;
                scInlineState.ownerThreadId = __scThreadId();
                safeLog(self.L, "d", "shortcut picker attached ownerTid=" + String(scInlineState.ownerThreadId));
            },
            onViewDetachedFromWindow: function(v) {
                scInlineState.disposed = true;
                scInlineState.loading = false;
                scInlineState.reloadPending = false;
                scInlineState.generation = Number(scInlineState.generation || 0) + 1;
                try { if (scInlineState.renderRunnable) scList.removeCallbacks(scInlineState.renderRunnable); } catch(eRemoveRender) {}
                try { if (scInlineState.searchRunnable) scList.removeCallbacks(scInlineState.searchRunnable); } catch(eRemoveSearch) {}
                safeLog(self.L, "d", "shortcut picker disposed generation=" + String(scInlineState.generation));
            }
        }));
    } catch(eAttachListener) {
        safeLog(self.L, "w", "shortcut picker attach listener fail: " + String(eAttachListener));
    }

    shortcutWrap.addView(scHeader);
    shortcutWrap.addView(scBody);
    dynamicContainer.addView(shortcutWrap);

    return {
        wrap: shortcutWrap,
        getPkg: function() { try { return inputScPkg.getValue(); } catch(e) { return ""; } },
        setPkgError: function(message) { try { inputScPkg.setError(message); } catch(e) {} },
        getShortcutId: function() { try { return inputScId.getValue(); } catch(e) { return ""; } },
        setShortcutIdError: function(message) { try { inputScId.setError(message); } catch(e) {} },
        getIntentUri: function() { return __scStr(scSelectedIntentUri); },
        getUserId: function() {
            var userId = parseInt(__scStr(scSelectedUserId), 10);
            return isNaN(userId) || userId < 0 ? 0 : userId;
        },
        isLegacyJsEnabled: function() { return !!legacyJsEnabled; },
        getJsCode: function() { try { return inputScJsCode ? __scStr(inputScJsCode.getValue()) : ""; } catch(e) { return ""; } }
    };
};
