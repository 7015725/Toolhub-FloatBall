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



    return {
        wrap: shortcutWrap,
        getPkg: function() { try { return inputScPkg.getValue(); } catch(e) { return ""; } },
        setPkgError: function(msg) { try { inputScPkg.setError(msg); } catch(e) {} },
        getShortcutId: function() { try { return inputScId.getValue(); } catch(e) { return ""; } },
        setShortcutIdError: function(msg) { try { inputScId.setError(msg); } catch(e) {} },
        getIntentUri: function() { try { return scSelectedIntentUri ? String(scSelectedIntentUri) : ""; } catch(e) { return ""; } },
        getUserId: function() { try { var u = parseInt(String(scSelectedUserId), 10); return isNaN(u) ? 0 : u; } catch(e) { return 0; } },
        getJsCode: function() { try { return inputScJsCode ? String(inputScJsCode.getValue()) : ""; } catch(e) { return ""; } }
    };
};
