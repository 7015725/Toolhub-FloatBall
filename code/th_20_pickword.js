// @version 1.0.11
// ==========================================
// 拾字 - 文字选择工具
// ShortX / Rhino ES5 悬浮文字选择与翻译脚本
// 如拾贝壳，收集文字
// ==========================================
// 来源: 阿然博客 xin-blog.com
// ==========================================

(function() {
    'use strict';

    // ==========================================
    // 拾字 - DIY 自定义配置区
    // ==========================================
    var DIY_CONFIG = {
        // ===== 新增：Canvas 主文本区字间距 =====
        // 半角字符字间距比例。1.00 = 默认；1.5 = 英文/数字/半角符号按 1.5 倍字符步进绘制。
        // 只作用于主文本加载区；预览区、钉屏 UI、复制/翻译内容均保持原文。
        HALF_WIDTH_CHAR_SPACING_SCALE: 1.5,

        // 全角字符字间距比例。中文/全角字符默认保持 1.00，不建议改大。
        FULL_WIDTH_CHAR_SPACING_SCALE: 1.00,

        // ===== 新增：Canvas 主文本区性能参数 =====
        // 普通滑动/显示时，只绘制可见区域上下各 N 行，避免 8000 字全文每帧重绘。
        // 数值越大快速滑动越稳，绘制成本也越高。建议 40~60。
        CANVAS_VISIBLE_LINE_BUFFER: 50,

        // 长按拖选 + 放大镜期间的可见行缓冲。数值越小越流畅，太小可能边缘高亮不够及时。
        // 建议 4~12；当前 8 是流畅性和显示稳定性的折中值。
        CANVAS_DRAG_HIGHLIGHT_INTERVAL_MS: 40,

        // Canvas 滚动兜底刷新间隔(ms)。用于修复快速滑动后新露出区域不自动重绘的问题。
        // 16 ≈ 60fps；如果发热/掉帧可调到 24。
        CANVAS_SCROLL_REFRESH_INTERVAL_MS: 16,

        // 滚动停止后继续补刷的帧数。用于 fling 后最后一屏补绘。
        // 建议 6~12；数值越大越稳，刷新也越多。
        CANVAS_SCROLL_REFRESH_IDLE_FRAMES: 8,

        // 大文本状态下放大镜刷新间隔(ms)。降低系统 Magnifier 捕获频率，减少拖选掉帧。
        // 建议 48~80。
        CANVAS_LARGE_TEXT_MAGNIFIER_INTERVAL_MS: 64,

        // 长按拖选时放大镜刷新间隔(ms)。如果放大镜掉帧，优先调大到 80。
        CANVAS_DRAG_MAGNIFIER_INTERVAL_MS: 64,

        // 手指移动小于该距离(dp)，且字符索引没变时，不重复刷新放大镜。
        CANVAS_DRAG_MAGNIFIER_MOVE_SLOP_DP: 3,

        // 中文/全角字符宽度缓存。true = 用“中”的宽度复用大部分 CJK 字符，提升大文本排版速度。
        // 如果个别字体下中文宽度差异很明显，可改 false，但 8000 字加载会更慢。
        CANVAS_FAST_FULL_WIDTH_CACHE: true,

        // ===== 新增：钉屏 UI 参数 =====
        // 钉屏浮窗最大宽度(dp)。窗口实际宽度由文本内容 + 自适应，超过该宽度后自动换行。
        // 不是固定宽度；只是宽度上限。
        PIN_WINDOW_MAX_WIDTH_DP: 340,

        // 钉屏浮窗最大高度(dp)。内容超过该高度后，钉屏内部 ScrollView 滚动。
        // 不是固定高度；短文本会按内容高度自适应。默认约 6 行文本高度。
        PIN_WINDOW_MAX_HEIGHT_DP: 160,

        // 钉屏文字大小(sp)。当前按需求固定为 14sp。
        PIN_TEXT_SIZE_SP: 14,

        // 钉屏文本左右(dp)。用于控制文字和卡片边缘的距离。
        // 宽度自适应时，最终宽度 = 文本实际宽度 + 左右，且不超过最大宽度。
        PIN_TEXT_PADDING_HORIZONTAL_DP: 8,

        // 钉屏文本上下(dp)。用于避免一行/两行/三行文字被裁切。
        PIN_TEXT_PADDING_VERTICAL_DP: 6,

        // 钉屏文本额外行距(dp)。多行文本显示不完整时可适当增大到 3~4。
        PIN_TEXT_LINE_SPACING_EXTRA_DP: 2,

        // 钉屏长文本是否分批加载。true = 先显示首批，再分批 append，减少钉屏首次显示卡顿。
        PIN_BATCH_LOAD_ENABLE: true,

        // 钉屏首批立即显示字符数。数值越大首屏内容越多，但首次 setText 越重。
        PIN_BATCH_FIRST_CHARS: 1000,

        // 钉屏后续每批追加字符数。越大加载越快但越容易卡顿；越小越平滑。
        PIN_BATCH_CHARS: 1000,

        // 钉屏每批追加之间的延迟(ms)。建议 16~32。
        PIN_BATCH_DELAY_MS: 24,

        // 钉屏长文本加载时是否显示底部进度。
        PIN_BATCH_SHOW_PROGRESS: true,

        // ===== 原有：主文本加载参数 =====
        // 最大允许载入的字符数。数值越大可处理长文越多，但首次排版、选区刷新、放大镜镜像都会更吃性能。
        // 建议：普通手机 3000~5000；性能较好可 8000；如果首屏仍慢，可先降到 3000 验证。
        MAX_CHAR_LIMIT: 8000,

        // 主文本区最大高度(dp)。数值越大，单屏显示行数越多，但窗口更高、布局测量更重。
        // 建议：手机 360~420；平板 480~560；如果遮挡严重可调小。
        TEXT_AREA_HEIGHT_DP: 320,

        // 边缘下拉/上推滚动时的自动滚动刷新延迟(ms)。
        // 数值越小滚动越丝滑，但 MOVE/选区/放大镜刷新更频繁，更吃 CPU。
        // 建议：60Hz 用 16~24；90Hz 用 11~16；120Hz 用 8~12；卡顿时优先调大到 16 或 24。
        SCROLL_DELAY_MS: 10
    };

    var appContext;
    try {
        if (typeof context === 'undefined' || context == null) {
            return;
        }
        appContext = context.getApplicationContext ? context.getApplicationContext() : context;
    } catch (e) {
        return;
    }

    var LayoutParams = android.view.WindowManager.LayoutParams;
    var LinearLayout = android.widget.LinearLayout;
    var TextView = android.widget.TextView;
    var Button = android.widget.Button;
    var ScrollView = android.widget.ScrollView;
    var GradientDrawable = android.graphics.drawable.GradientDrawable;
    var Color = android.graphics.Color;
    var Paint = android.graphics.Paint;
    var RectF = android.graphics.RectF;
    var Rect = android.graphics.Rect;
    var MotionEvent = android.view.MotionEvent;
    var Gravity = android.view.Gravity;
    var TypedValue = android.util.TypedValue;
    var View = android.view.View;
    var Handler = android.os.Handler;
    var Looper = android.os.Looper;
    var ColorStateList = android.content.res.ColorStateList;
    var JavaArray = java.lang.reflect.Array;

    // ColorOS / realmeOS 稳定性修复：避免 Rhino 直接调用 Android UI 的 int 颜色重载。
    // 颜色统一走 ColorStateList / ARGB 对象路径，降低 system_server 软重启风险。
    function toColorInt(colorValue) {
        try { return colorValue | 0; } catch (e) { return colorValue; }
    }

    function jintArray(values) {
        var arr = JavaArray.newInstance(java.lang.Integer.TYPE, values.length);
        for (var i = 0; i < values.length; i++) {
            arr[i] = toColorInt(values[i]);
        }
        return arr;
    }

    function jint2Array(rows) {
        var outer = JavaArray.newInstance(java.lang.Class.forName("[I"), rows.length);
        for (var i = 0; i < rows.length; i++) {
            outer[i] = jintArray(rows[i]);
        }
        return outer;
    }

    function safeColorStateList(colorValue) {
        var safeColor = toColorInt(colorValue);
        var states = jint2Array([
            [android.R.attr.state_pressed],
            [android.R.attr.state_focused],
            [android.R.attr.state_selected],
            []
        ]);
        var colors = jintArray([safeColor, safeColor, safeColor, safeColor]);
        return toolhubSafeColorStateListFromStates(states, colors);
    }

    function safeTextColor(viewObj, colorValue) {
        try { toolhubSafeSetTextColor(viewObj, safeColorStateList(colorValue)); } catch (e) {}
    }

    function safeGdColor(drawableObj, colorValue) {
        try { toolhubSafeSetColor(drawableObj, safeColorStateList(colorValue)); } catch (e) {}
    }

    var mainHandler = new Handler(Looper.getMainLooper());
    var keepAliveTimer = null;

    var PREFS_NAME = "拾字Prefs";
    var KEY_FONT_SIZE = "fontSize";
    // 字号范围：设置面板里的滑块上下限。调太小不易点选，调太大容易增加排版高度。
    var MIN_FONT_SIZE = 12;
    var MAX_FONT_SIZE = 32;
    var DEFAULT_FONT_SIZE = 20;      // 默认字号；首次使用或读取失败时采用此值，后续会记住用户滑块选择。
    var currentFontSize = DEFAULT_FONT_SIZE;
    var windowManager = null;
    var mainLayout = null;
    var layoutParams = null;
    var textView = null;
    var textCanvasControl = null;
    var canvasScrollRefreshRunnable = null;
    var canvasScrollRefreshRunning = false;
    var canvasLastScrollY = -1;
    var canvasScrollIdleFrames = 0;
    var previewTextView = null;
    var previewTextOverride = null;
    var previewSelectionSignature = "";
    var seekBar = null;
    var fontSizeLabel = null;
    var scrollView = null;
    var countLabelView = null;
    var copyActionBtn = null;
    var translateActionBtn = null;
    var selectAllActionBtn = null;
    var clearActionBtn = null;
    var pinActionBtn = null;
    var loadedRemoveSpaceBtn = null;
    var loadedRemoveNewlineBtn = null;
    var previewRemoveSpaceBtn = null;
    var previewRemoveNewlineBtn = null;
    var previewEditBtn = null;
    var cleanUndoStack = [];
    var pinLayout = null;
    var pinLayoutParams = null;
    var pinTextView = null;
    var pinScrollView = null;
    var pinProgressView = null;
    var pinWindowManager = null;
    var pinBatchLoadRunnable = null;
    var pinLoadToken = 0;
    var pinnedText = "";
    var titleBarRefs = { normalMode: null, settingMode: null };
    var toolhubAppRef = null;
    var previewBoxView = null;
    var copyAllActionBtn = null;
    var cleanupActionBtn = null;
    var shareActionBtn = null;
    var fontSizeSelectorView = null;
    var fontSizeDropdownView = null;
    var fontSizeDropdownCardView = null;
    var fontSizePopupWindow = null;
    var fontSizeOptionViews = [];
    var titleAccentView = null;
    var resultDividerView = null;
    var closeActionView = null;
    var textAreaMinHeight = 0;

    var fullText = "";
    var selectedIndices = [];
    var lastTranslationState = null;

    var isDragging = false;
    var isTranslating = false; // 并发锁
    var dragStartIndex = -1;
    var dragSnapshot = [];
    var longPressHandler = null;
    var touchDownTime = 0;
    var touchDownX = 0;
    var touchDownY = 0;
    var touchDownRawX = 0;
    var touchDownRawY = 0;
    var isShowing = false;
    var selectedSet = {};
    var dragSelectionCount = 0;
    var lastDragVisualMin = -1;
    var lastDragVisualMax = -1;
    var dragSnapshotSet = null;
    var dragSnapshotCount = 0;
    var dragStartWasSelected = false;
    var dragPendingDirtyMin = -1;
    var dragPendingDirtyMax = -1;

    var pendingAdjustRunnable = null;

    var lastDragUpdateTime = 0;
    // 拖选刷新节流(ms)：会优先读取 DIY_CONFIG.CANVAS_DRAG_HIGHLIGHT_INTERVAL_MS。
    var DRAG_UPDATE_INTERVAL = 40;
    var pendingDragUpdate = null;
    var lastDragEnd = -1;

    var autoScrollRunnable = null;
    var lastTouchX = 0;
    var lastTouchY = 0;
    var lastTouchRawX = 0;
    var lastTouchRawY = 0;
    var isAutoScrolling = false;
    // 边缘自动滚动触发区比例：0.15 表示顶部/底部 15% 区域触发自动滚动。
    // 调大更容易触发滚动；调小可减少误触。
    var SCROLL_EDGE_TOP = 0.15;
    var SCROLL_EDGE_BOTTOM = 0.15;
    // 自动滚动速度范围(dp/帧近似值)：数值越大，拖到边缘时滚动越快。
    var SCROLL_MIN_SPEED = 5;
    var SCROLL_MAX_SPEED = 25;

    var fingerPreviewLastIndex = -1;
    var fingerPreviewLastUpdateTime = 0;
    var fingerPreviewLastContentUpdateTime = 0;
    var fingerPreviewLastShownX = -99999;
    var fingerPreviewLastShownY = -99999;
    var fingerPreviewCreateErrorShown = false;
    var systemMagnifier = null;
    var systemMagnifierEnabled = false;
    var magnifierUseAdvancedShow = false; // true 时才使用 API 29+ 的 show(x,y,centerX,centerY)
    var magnifierErrorToastLastTime = 0;
    var MAGNIFIER_ERROR_TOAST_INTERVAL_MS = 2000;
    // 稳定性保护：连续异常达到阈值后自动禁用系统放大镜，避免个别机型异常导致黑屏/软重启风险放大
    var MAGNIFIER_AUTO_DISABLE_ON_ERROR = true; // 是否启用“异常自动禁用”熔断开关（true=开启保护）
    var MAGNIFIER_MAX_ERROR_COUNT = 3; // 连续异常计数阈值：达到该次数后禁用系统放大镜
    var magnifierErrorCount = 0; // 当前会话中的放大镜异常累计计数（创建/显示/更新都会累加）
    var magnifierDisabledByError = false; // 是否已因异常触发自动禁用（true 时不再尝试创建）
    var magnifierSafeMode = false; // 安全模式：仅使用最保守系统调用，优先稳定
    var magnifierLogFilePath = "/storage/emulated/0/Download/shortx_magnifier_error.log";
    var romProfile = { isXiaomi: false, isOplus: false, isColorOS: false, isRealme: false, api: 0, summary: "" };
    // 系统放大镜总开关：false=默认开启/允许创建，true=强制关闭。
    // 仍保留 localVarOf$禁用系统放大镜=1 的手动禁用入口。
    var forceDisableSystemMagnifier = false;
    var forceDisableMagnifierToastShown = false;

    // 放大镜大小(dp)：越大越容易看清，但全屏 overlay 与镜像 TextView 绘制成本更高。
    var FINGER_PREVIEW_SIZE_DP = 90;
    // 放大镜相对手指的上移距离(dp)：越大越靠上，避免被手指挡住；太大可能贴近屏幕顶部。
    var FINGER_PREVIEW_OFFSET_Y_DP = 60;
    // 放大倍数：越大文字越清楚，但镜像内容尺寸越大、首次同步越重。
    var FINGER_PREVIEW_ZOOM = 1.35;
    // 放大镜位置刷新间隔(ms)：16 约等于 60fps；卡顿时可调 24~33。
    var FINGER_PREVIEW_INTERVAL = 16;
    // 放大镜内容/选中态刷新间隔(ms)：越小同步越及时，越大越省性能。
    var FINGER_PREVIEW_CONTENT_INTERVAL = 24;

    // ===== 系统放大镜外观 DIY 参数（胶囊形） =====
    // 高度 = FINGER_PREVIEW_SIZE_DP * MAGNIFIER_HEIGHT_RATIO（再受最小高度限制）
    var MAGNIFIER_HEIGHT_RATIO = 0.72;
    // 宽度 = 高度 * MAGNIFIER_WIDTH_RATIO（再受最小宽度补偿限制）
    var MAGNIFIER_WIDTH_RATIO = 2.1;
    // 最小高度下限(dp)：会在创建时换算为 px，跨设备观感更一致
    var MAGNIFIER_MIN_HEIGHT_DP = 36;
    // 宽度额外补偿(dp)：会在创建时换算为 px，避免过窄
    var MAGNIFIER_MIN_WIDTH_EXTRA_DP = 24;
    // 胶囊圆角比例：0.5 表示半高圆角（标准胶囊）
    var MAGNIFIER_CORNER_RATIO = 0.5;

    // 长文本首屏加载策略：窗口显示前同步排版前 N 字，并一次确定稳定文本区高度。
    // TEXT_AREA_HEIGHT_DP 仅作为最大高度；短文本按实际高度，长文本超出后在内部滚动。
    var INITIAL_TEXT_FAST_LIMIT = 1500;
    // 完整长文本补全延迟(ms)。补全文时保持首次文本区高度不变，避免外层窗口二次伸缩。
    var FULL_TEXT_DELAY_MS = 1200;
    var pendingFullTextRunnable = null;
    var pendingFingerPreviewWarmupRunnable = null;
    var isPartialTextLoaded = false;
    var originalFullText = "";

    // 翻译 API 配置只读取 ToolHub 设置；不再读取 ShortX 旧局部变量。
    var BD_API_URL = "https://fanyi-api.baidu.com/api/trans/vip/translate";
    var YD_API_URL = "https://openapi.youdao.com/api";

    function normalizePickwordTranslateEngine20(value) {
        return String(value || "baidu") === "youdao" ? "youdao" : "baidu";
    }

    function trimPickwordTranslateValue20(value) {
        try { return String(value == null ? "" : value).replace(/^\s+|\s+$/g, ""); } catch (e) { return ""; }
    }

    function getPickwordTranslateConfig20(appObj, overrideConfig) {
        var cfg = null;
        try {
            if (overrideConfig && typeof overrideConfig === "object") cfg = overrideConfig;
            else if (appObj && appObj.config) cfg = appObj.config;
        } catch (eCfg) { cfg = null; }
        if (!cfg) cfg = {};
        var engine = normalizePickwordTranslateEngine20(cfg.PICKWORD_TRANSLATE_ENGINE);
        var appId = engine === "youdao"
            ? trimPickwordTranslateValue20(cfg.PICKWORD_YOUDAO_APP_KEY)
            : trimPickwordTranslateValue20(cfg.PICKWORD_BAIDU_APP_ID);
        var secret = engine === "youdao"
            ? trimPickwordTranslateValue20(cfg.PICKWORD_YOUDAO_APP_SECRET)
            : trimPickwordTranslateValue20(cfg.PICKWORD_BAIDU_APP_SECRET);
        return {
            engine: engine,
            label: engine === "youdao" ? "有道翻译" : "百度翻译",
            appId: appId,
            secret: secret
        };
    }

    // ==========================================
    // 翻译引擎核心辅助函数
    // ==========================================
    function md5(str) {
        try {
            var md = java.security.MessageDigest.getInstance("MD5");
            md.update(new java.lang.String(str).getBytes("UTF-8"));
            var bytes = md.digest();
            var sb = new java.lang.StringBuilder();
            for (var i = 0; i < bytes.length; i++) {
                var tmp = java.lang.Integer.toHexString(bytes[i] & 0xFF);
                if (tmp.length() == 1) { sb.append("0"); }
                sb.append(tmp);
            }
            return sb.toString();
        } catch (e) { return ""; }
    }

    function sha256(str) {
        try {
            var md = java.security.MessageDigest.getInstance("SHA-256");
            md.update(new java.lang.String(str).getBytes("UTF-8"));
            var bytes = md.digest();
            var sb = new java.lang.StringBuilder();
            for (var i = 0; i < bytes.length; i++) {
                var tmp = java.lang.Integer.toHexString(bytes[i] & 0xFF);
                if (tmp.length() == 1) { sb.append("0"); }
                sb.append(tmp);
            }
            return sb.toString();
        } catch (e) { return ""; }
    }

    function getYoudaoInput(q) {
        if (q == null) return "";
        var len = q.length;
        if (len <= 20) { return q; }
        return q.substring(0, 10) + len + q.substring(len - 10, len);
    }

    function buildBaiduParams(auth, q, fromLang, toLang) {
        var salt = java.util.UUID.randomUUID().toString();
        var signStr = auth.appId + q + salt + auth.secret;
        var sign = md5(signStr);
        return { q: q, from: fromLang, to: toLang, appid: auth.appId, salt: salt, sign: sign };
    }

    function buildYoudaoParams(auth, q, fromLang, toLang) {
        var salt = java.util.UUID.randomUUID().toString();
        var curtime = String(Math.floor(Date.now() / 1000));
        var input = getYoudaoInput(q);
        var signStr = auth.appId + input + salt + curtime + auth.secret;
        var sign = sha256(signStr);
        return {
            q: q, from: fromLang, to: toLang, appKey: auth.appId,
            salt: salt, sign: sign, signType: "v3", curtime: curtime
        };
    }

    function urlEncodeForm(params) {
        var pairs = [];
        var keys = [];
        for (var k in params) {
            if (Object.prototype.hasOwnProperty.call(params, k)) { keys.push(k); }
        }
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            var v = params[k];
            if (v !== undefined && v !== null) {
                pairs.push(java.net.URLEncoder.encode(String(k), "UTF-8") + "=" + java.net.URLEncoder.encode(String(v), "UTF-8"));
            }
        }
        return pairs.join("&");
    }

    function setToArray(set) {
        var result = [];
        for (var key in set) {
            if (Object.prototype.hasOwnProperty.call(set, key) && set[key] === true) {
                result.push(parseInt(key, 10));
            }
        }
        return result.sort(function(a, b) { return a - b; });
    }


    var LONG_PRESS_TIME = 300;
    var TOUCH_SLOP = 12;

    var isDark = false;
    try {
        var uiMode = appContext.getResources().getConfiguration().uiMode;
        isDark = (uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK) === android.content.res.Configuration.UI_MODE_NIGHT_YES;
    } catch (e) {
        isDark = false;
    }

    var Colors = {
        bg: isDark ? Color.parseColor("#131314") : Color.parseColor("#f8f9fa"),
        surface: isDark ? Color.parseColor("#1b1b1f") : Color.parseColor("#f1f3f4"),
        surfaceVariant: isDark ? Color.parseColor("#2b2c30") : Color.parseColor("#e6e8ea"),
        text: isDark ? Color.parseColor("#e7e9ec") : Color.parseColor("#25272a"),
        textSecondary: isDark ? Color.parseColor("#adb3ba") : Color.parseColor("#666b70"),
        textTertiary: isDark ? Color.parseColor("#8e949b") : Color.parseColor("#7b8086"),
        primary: isDark ? Color.parseColor("#a8c7fa") : Color.parseColor("#005bc0"),
        primaryLight: isDark ? Color.parseColor("#26354d") : Color.parseColor("#dce8f8"),
        onPrimary: isDark ? Color.parseColor("#062e6f") : Color.WHITE,
        selectionBg: isDark ? Color.parseColor("#a8c7fa") : Color.parseColor("#005bc0"),
        selectionText: isDark ? Color.parseColor("#062e6f") : Color.WHITE,
        success: isDark ? Color.parseColor("#4ade80") : Color.parseColor("#15803d"),
        warning: isDark ? Color.parseColor("#fbbf24") : Color.parseColor("#b45309"),
        outline: isDark ? Color.parseColor("#49454f") : Color.parseColor("#c4c7c5"),
        btnPrimaryBg: isDark ? Color.parseColor("#a8c7fa") : Color.parseColor("#005bc0"),
        btnPrimaryPressed: isDark ? Color.parseColor("#7fcfff") : Color.parseColor("#00639b"),
        btnSecondaryBg: isDark ? Color.parseColor("#2b2c30") : Color.parseColor("#e6e8ea"),
        btnSecondaryPressed: isDark ? Color.parseColor("#26354d") : Color.parseColor("#dce8f8")
    };

    function applyPickwordColorScheme20(appObj) {
        var scheme = null;
        try {
            if (appObj && typeof appObj.getSettingsColorScheme === "function") {
                scheme = appObj.getSettingsColorScheme();
            }
        } catch (eScheme) {
            scheme = null;
        }

        if (scheme) {
            isDark = scheme.dark === true;
            Colors.bg = scheme.background || scheme.surface;
            Colors.surface = scheme.surface || scheme.background;
            Colors.surfaceVariant = scheme.surface2 || scheme.primaryContainer || Colors.surface;
            Colors.text = scheme.onSurface;
            Colors.textSecondary = scheme.onSurface2 || scheme.onSurface;
            Colors.textTertiary = scheme.onSurface2 || scheme.onSurface;
            Colors.primary = scheme.primary;
            Colors.primaryLight = scheme.primaryContainer || scheme.surface2 || Colors.surface;
            Colors.onPrimary = scheme.onPrimary;
            Colors.selectionBg = scheme.primary;
            Colors.selectionText = scheme.onPrimary;
            Colors.success = scheme.success;
            Colors.warning = scheme.warning;
            Colors.outline = scheme.outlineVariant || scheme.outline;
            Colors.btnPrimaryBg = scheme.primary;
            Colors.btnPrimaryPressed = scheme.secondary || scheme.primary;
            Colors.btnSecondaryBg = scheme.surface2 || scheme.surface;
            Colors.btnSecondaryPressed = scheme.primaryContainer || scheme.surface2 || scheme.surface;
            return true;
        }

        try {
            var uiMode = appContext.getResources().getConfiguration().uiMode;
            isDark = (uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK) === android.content.res.Configuration.UI_MODE_NIGHT_YES;
        } catch (eMode) {
            isDark = false;
        }
        Colors.bg = isDark ? Color.parseColor("#131314") : Color.parseColor("#f8f9fa");
        Colors.surface = isDark ? Color.parseColor("#1b1b1f") : Color.parseColor("#f1f3f4");
        Colors.surfaceVariant = isDark ? Color.parseColor("#2b2c30") : Color.parseColor("#e6e8ea");
        Colors.text = isDark ? Color.parseColor("#e7e9ec") : Color.parseColor("#25272a");
        Colors.textSecondary = isDark ? Color.parseColor("#adb3ba") : Color.parseColor("#666b70");
        Colors.textTertiary = isDark ? Color.parseColor("#8e949b") : Color.parseColor("#7b8086");
        Colors.primary = isDark ? Color.parseColor("#a8c7fa") : Color.parseColor("#005bc0");
        Colors.primaryLight = isDark ? Color.parseColor("#26354d") : Color.parseColor("#dce8f8");
        Colors.onPrimary = isDark ? Color.parseColor("#062e6f") : Color.WHITE;
        Colors.selectionBg = Colors.primary;
        Colors.selectionText = Colors.onPrimary;
        Colors.success = isDark ? Color.parseColor("#4ade80") : Color.parseColor("#15803d");
        Colors.warning = isDark ? Color.parseColor("#fbbf24") : Color.parseColor("#b45309");
        Colors.outline = isDark ? Color.parseColor("#49454f") : Color.parseColor("#c4c7c5");
        Colors.btnPrimaryBg = Colors.primary;
        Colors.btnPrimaryPressed = isDark ? Color.parseColor("#7fcfff") : Color.parseColor("#00639b");
        Colors.btnSecondaryBg = Colors.surfaceVariant;
        Colors.btnSecondaryPressed = Colors.primaryLight;
        return false;
    }

    function dp(value) {
        return TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, appContext.getResources().getDisplayMetrics());
    }

    var screenWidth = 0;
    var screenHeight = 0;
    var isTablet = false;
    var windowWidth = 0;
    var maxWindowHeight = 0;
    var textAreaHeight = 0;
    var uiScale = 1.0;
    var screenCategory = "phone";

    function uiTextSize(phoneSp, tabletSp) {
        var base = isTablet ? tabletSp : phoneSp;
        return Math.max(9, Math.round(base * uiScale));
    }

    function uiDp(phoneDp, tabletDp) {
        var base = isTablet ? tabletDp : phoneDp;
        return dp(base * uiScale);
    }

    function getAdaptiveDefaultFontSize() {
        var adaptive = Math.round(DEFAULT_FONT_SIZE * uiScale);
        if (adaptive < MIN_FONT_SIZE) adaptive = MIN_FONT_SIZE;
        if (adaptive > MAX_FONT_SIZE) adaptive = MAX_FONT_SIZE;
        return adaptive;
    }


    function sp(value) {
        return TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, value, appContext.getResources().getDisplayMetrics());
    }

    function createCanvasTextControl() {
        var state = {
            text: "",
            textSizeSp: currentFontSize,
            lines: [],
            contentHeight: 0,
            contentWidth: 0,
            layoutDirty: true,
            measuredWidth: 0,
            lineHeight: 0,
            widthCache: {}
        };

        var textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        var bgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        var rectF = new RectF();
        var clipRect = new Rect();

        function resetPaint() {
            try {
                textPaint.setTextSize(sp(state.textSizeSp));
                try { textPaint.setSubpixelText(true); } catch (e0) {}
                try { textPaint.setLinearText(true); } catch (e1) {}
            } catch (e2) {}
        }

        function getPaddingInfo(viewObj) {
            return {
                left: viewObj ? viewObj.getPaddingLeft() : Math.round(uiDp(12, 14)),
                right: viewObj ? viewObj.getPaddingRight() : Math.round(uiDp(12, 14)),
                top: viewObj ? viewObj.getPaddingTop() : Math.round(uiDp(12, 14)),
                bottom: viewObj ? viewObj.getPaddingBottom() : Math.round(uiDp(12, 14))
            };
        }

        function getCharAdvance(ch) {
            if (ch === "\n" || ch === "\r") return 0;
            var code = 0;
            try { code = ch.charCodeAt(0); } catch (eCode) { code = 0; }
            var fastFullWidth = false;
            try {
                fastFullWidth = DIY_CONFIG.CANVAS_FAST_FULL_WIDTH_CACHE === true && code >= 0x2E80 && code !== 0x3000 && !(code >= 0xFF61 && code <= 0xFFDC);
            } catch (eFast) { fastFullWidth = false; }

            var key = fastFullWidth ? (state.textSizeSp + "#FULL_WIDTH") : (state.textSizeSp + "#" + ch);
            if (state.widthCache[key] !== undefined) return state.widthCache[key];
            var base = 0;
            try {
                if (fastFullWidth) base = textPaint.measureText(new java.lang.String("中"));
                else base = textPaint.measureText(new java.lang.String(ch));
            } catch (e0) {
                try {
                    if (fastFullWidth) base = textPaint.measureText("中");
                    else base = textPaint.measureText(String(ch));
                } catch (e1) { base = sp(state.textSizeSp) * (fastFullWidth ? 1.0 : 0.55); }
            }
            if (base < 1) base = sp(state.textSizeSp) * (fastFullWidth ? 1.0 : 0.55);
            var scale = getCharSpacingScale(ch);
            var adv = base;
            if (Math.abs(scale - 1.0) > 0.001) adv = base * scale;
            state.widthCache[key] = adv;
            return adv;
        }

        function pushLine(start, end, xs, widthValue, topValue) {
            state.lines.push({
                start: start,
                end: end,
                xs: xs,
                width: widthValue,
                top: topValue,
                bottom: topValue + state.lineHeight,
                baseline: topValue + state.baselineOffset
            });
        }

        function rebuildLayout(widthValue, viewObj) {
            resetPaint();
            var padding = getPaddingInfo(viewObj);
            var available = widthValue - padding.left - padding.right;
            if (available <= 0) available = Math.max(1, Math.round(windowWidth - padding.left - padding.right - uiDp(32, 40)));

            var fm = textPaint.getFontMetrics();
            var fontHeight = Math.max(1, fm.descent - fm.ascent);
            state.lineHeight = Math.max(Math.round(fontHeight * 1.18 + uiDp(3, 4)), Math.round(sp(state.textSizeSp) * 1.35));
            state.baselineOffset = Math.round((state.lineHeight - fontHeight) / 2 - fm.ascent);
            state.lines = [];
            state.contentWidth = widthValue;

            var source = String(state.text || "");
            var len = source.length;
            var y = padding.top;
            var lineStart = 0;
            var lineX = 0;
            var xs = [0];
            var i = 0;

            if (len === 0) {
                pushLine(0, 0, [0], 0, y);
                state.contentHeight = Math.round(y + state.lineHeight + padding.bottom);
                state.layoutDirty = false;
                return;
            }

            while (i < len) {
                var ch = source.charAt(i);
                if (ch === "\r" || ch === "\n") {
                    pushLine(lineStart, i, xs, lineX, y);
                    y += state.lineHeight;
                    if (ch === "\r" && i + 1 < len && source.charAt(i + 1) === "\n") i++;
                    i++;
                    lineStart = i;
                    lineX = 0;
                    xs = [0];
                    continue;
                }

                var adv = getCharAdvance(ch);
                if (lineX > 0 && lineX + adv > available) {
                    pushLine(lineStart, i, xs, lineX, y);
                    y += state.lineHeight;
                    lineStart = i;
                    lineX = 0;
                    xs = [0];
                    continue;
                }

                lineX += adv;
                xs.push(lineX);
                i++;
            }

            pushLine(lineStart, len, xs, lineX, y);
            state.contentHeight = Math.round(y + state.lineHeight + padding.bottom);
            state.layoutDirty = false;
        }

        function ensureLayout(viewObj) {
            var w = 0;
            try { w = viewObj.getWidth(); } catch (e0) { w = 0; }
            if (w <= 0) w = state.measuredWidth;
            if (w <= 0) w = Math.round(windowWidth - uiDp(32, 40));
            if (state.layoutDirty || state.contentWidth !== w || state.lines.length === 0) {
                rebuildLayout(w, viewObj);
            }
        }

        function isIndexSelectedForCanvas(indexValue) {
            try {
                if (isDragging && dragSnapshotSet && dragStartIndex >= 0 && lastDragVisualMin >= 0 && lastDragVisualMax >= 0) {
                    if (indexValue >= lastDragVisualMin && indexValue <= lastDragVisualMax) {
                        return !dragStartWasSelected;
                    }
                    return dragSnapshotSet[indexValue] === true;
                }
            } catch (e0) {}
            return selectedSet[indexValue] === true;
        }

        function drawSelectionForLine(canvas, line, paddingLeft) {
            try {
                var runStart = -1;
                var i;
                for (i = line.start; i <= line.end; i++) {
                    var selected = (i < line.end && isIndexSelectedForCanvas(i));
                    if (selected && runStart < 0) runStart = i;
                    if ((!selected || i === line.end) && runStart >= 0) {
                        var runEnd = i;
                        var leftIndex = runStart - line.start;
                        var rightIndex = runEnd - line.start;
                        if (leftIndex < 0) leftIndex = 0;
                        if (rightIndex >= line.xs.length) rightIndex = line.xs.length - 1;
                        var l = paddingLeft + line.xs[leftIndex];
                        var r = paddingLeft + line.xs[rightIndex];
                        if (r < l + 1) r = l + 1;
                        rectF.set(l, line.top + 1, r, line.bottom - 1);
                        setPaintColor(bgPaint, Colors.selectionBg, 220);
                        canvas.drawRoundRect(rectF, uiDp(3, 4), uiDp(3, 4), bgPaint);
                        runStart = -1;
                    }
                }
            } catch (e) {}
        }

        var canvasView = new JavaAdapter(View, {
            onMeasure: function(widthMeasureSpec, heightMeasureSpec) {
                try {
                    var w = android.view.View.MeasureSpec.getSize(widthMeasureSpec);
                    if (w <= 0) w = Math.round(windowWidth - uiDp(32, 40));
                    state.measuredWidth = w;
                    if (state.layoutDirty || state.contentWidth !== w || state.lines.length === 0) {
                        rebuildLayout(w, this);
                    }
                    var h = Math.max(Math.round(state.contentHeight), Math.round(uiDp(80, 96)));
                    this.setMeasuredDimension(w, h);
                } catch (e) {
                    this.setMeasuredDimension(Math.round(windowWidth - uiDp(32, 40)), Math.round(uiDp(120, 150)));
                }
            },
            onSizeChanged: function(w, h, oldw, oldh) {
                try {
                    if (w !== oldw) {
                        state.layoutDirty = true;
                        ensureLayout(this);
                    }
                } catch (e) {}
            },
            onDraw: function(canvas) {
                try {
                    ensureLayout(this);
                    var padding = getPaddingInfo(this);
                    var hasClip = false;
                    try { hasClip = canvas.getClipBounds(clipRect); } catch (e0) { hasClip = false; }
                    var clipTop = hasClip ? clipRect.top : 0;
                    var clipBottom = hasClip ? clipRect.bottom : this.getHeight();
                    try {
                        if (scrollView) {
                            var svTop = scrollView.getScrollY();
                            var svBottom = svTop + scrollView.getHeight();
                            if (svBottom > svTop) {
                                clipTop = Math.max(clipTop, svTop);
                                clipBottom = Math.min(clipBottom, svBottom);
                                if (clipBottom <= clipTop) {
                                    clipTop = svTop;
                                    clipBottom = svBottom;
                                }
                            }
                        }
                    } catch (eClip) {}

                    resetPaint();
                    var source = String(state.text || "");
                    var lastSelected = null;
                    var bufferLines = 50;
                    try {
                        if (isDragging) bufferLines = parseInt(String(DIY_CONFIG.CANVAS_DRAG_VISIBLE_LINE_BUFFER), 10);
                        else bufferLines = parseInt(String(DIY_CONFIG.CANVAS_VISIBLE_LINE_BUFFER), 10);
                    } catch (eBuf) { bufferLines = isDragging ? 8 : 50; }
                    if (isNaN(bufferLines) || bufferLines < 0) bufferLines = isDragging ? 8 : 50;
                    if (isDragging && bufferLines > 24) bufferLines = 24;
                    if (!isDragging && bufferLines > 120) bufferLines = 120;
                    var startLine = Math.floor((clipTop - padding.top) / Math.max(1, state.lineHeight)) - bufferLines;
                    var endLine = Math.ceil((clipBottom - padding.top) / Math.max(1, state.lineHeight)) + bufferLines;
                    if (startLine < 0) startLine = 0;
                    if (endLine >= state.lines.length) endLine = state.lines.length - 1;
                    for (var li = startLine; li <= endLine; li++) {
                        var line = state.lines[li];
                        if (!line) continue;

                        drawSelectionForLine(canvas, line, padding.left);
                        var x = padding.left;
                        for (var idx = line.start; idx < line.end; idx++) {
                            var ch = source.charAt(idx);
                            var selected = isIndexSelectedForCanvas(idx);
                            if (lastSelected !== selected) {
                                setPaintColor(textPaint, selected ? Colors.selectionText : Colors.text, 255);
                                lastSelected = selected;
                            }
                            try { canvas.drawText(new java.lang.String(ch), x, line.baseline, textPaint); } catch (e1) {
                                try { canvas.drawText(String(ch), x, line.baseline, textPaint); } catch (e2) {}
                            }
                            var pos = idx - line.start;
                            if (pos + 1 < line.xs.length) x = padding.left + line.xs[pos + 1];
                        }
                    }
                } catch (e3) {}
            }
        }, appContext);

        canvasView.setPadding(uiDp(12, 14), uiDp(12, 14), uiDp(12, 14), uiDp(12, 14));
        canvasView.setBackground(createRoundRectDrawable(Colors.surface, isTablet ? 12 : 8));
        canvasView.setClickable(true);
        canvasView.setLongClickable(false);
        canvasView.setFocusable(false);
        try { canvasView.setWillNotDraw(false); } catch (eWill) {}

        return {
            view: canvasView,
            setText: function(textValue) {
                state.text = String(textValue == null ? "" : textValue);
                state.layoutDirty = true;
                try { canvasView.requestLayout(); } catch (e0) {}
                try { canvasView.invalidate(); } catch (e1) {}
                try { if (拾字Floaty && 拾字Floaty.startCanvasScrollRefresh) 拾字Floaty.startCanvasScrollRefresh(); } catch (e2) {}
            },
            setTextSize: function(sizeValue) {
                state.textSizeSp = sizeValue;
                state.widthCache = {};
                state.layoutDirty = true;
                try { canvasView.requestLayout(); } catch (e0) {}
                try { canvasView.invalidate(); } catch (e1) {}
            },
            getContentHeight: function() {
                try { ensureLayout(canvasView); } catch (e0) {}
                return state.contentHeight;
            },
            getLineCount: function() {
                try { ensureLayout(canvasView); } catch (e0) {}
                return state.lines.length;
            },
            getCharIndexAt: function(x, y) {
                try {
                    ensureLayout(canvasView);
                    var lines = state.lines;
                    if (!lines || lines.length === 0) return -1;
                    var lineIndex = Math.floor((y - canvasView.getPaddingTop()) / Math.max(1, state.lineHeight));
                    if (lineIndex < 0) lineIndex = 0;
                    if (lineIndex >= lines.length) lineIndex = lines.length - 1;
                    var line = lines[lineIndex];
                    if (!line) return -1;
                    if (line.end <= line.start) return line.start >= 0 && line.start < state.text.length ? line.start : -1;
                    var localX = x - canvasView.getPaddingLeft();
                    if (localX < 0) localX = 0;
                    var xs = line.xs;
                    var lo = 0;
                    var hi = xs.length - 2;
                    var answer = hi;
                    while (lo <= hi) {
                        var midIndex = Math.floor((lo + hi) / 2);
                        var mid = (xs[midIndex] + xs[midIndex + 1]) / 2;
                        if (localX < mid) {
                            answer = midIndex;
                            hi = midIndex - 1;
                        } else {
                            lo = midIndex + 1;
                        }
                    }
                    return Math.max(line.start, Math.min(line.start + answer, state.text.length - 1));
                } catch (e) { return -1; }
            },
            invalidateVisible: function() {
                try {
                    var top = 0;
                    var bottom = canvasView.getHeight();
                    if (scrollView) {
                        top = Math.max(0, scrollView.getScrollY() - state.lineHeight * 4);
                        bottom = Math.min(canvasView.getHeight(), scrollView.getScrollY() + scrollView.getHeight() + state.lineHeight * 4);
                    }
                    var width = Math.max(1, canvasView.getWidth());
                    var itop = Math.round(top);
                    var ibottom = Math.round(bottom);
                    if (ibottom <= itop) ibottom = Math.min(canvasView.getHeight(), itop + Math.max(1, state.lineHeight * 8));
                    try { canvasView.invalidate(0, itop, width, ibottom); } catch (e2) { canvasView.invalidate(); }
                    // 快速滚动时部分 ROM / 硬件加速路径不会主动重绘新露出的子区域，父容器也补一次 invalidate。
                    // 但长按拖选 + 放大镜期间如果每帧补父容器和动画刷新，会明显掉帧，所以拖选时只刷新子 View 局部。
                    if (!isDragging) {
                        try { if (scrollView) scrollView.invalidate(); } catch (e3) {}
                        try { if (android.os.Build.VERSION.SDK_INT >= 16) canvasView.postInvalidateOnAnimation(); } catch (e4) {}
                    }
                } catch (e0) { try { canvasView.invalidate(); } catch (e1) {} }
            },
            invalidateCharRange: function(startIndex, endIndex) {
                try {
                    ensureLayout(canvasView);
                    if (startIndex === undefined || startIndex === null || endIndex === undefined || endIndex === null || startIndex < 0 || endIndex < 0) {
                        this.invalidateVisible();
                        return;
                    }
                    if (startIndex > endIndex) { var tmp = startIndex; startIndex = endIndex; endIndex = tmp; }
                    var lines = state.lines;
                    if (!lines || lines.length === 0) { this.invalidateVisible(); return; }
                    var startLine = Math.floor((Math.max(0, startIndex) / Math.max(1, state.text.length)) * lines.length);
                    var endLine = Math.floor((Math.max(0, endIndex) / Math.max(1, state.text.length)) * lines.length);
                    if (startLine < 0) startLine = 0;
                    if (endLine < 0) endLine = 0;
                    if (startLine >= lines.length) startLine = lines.length - 1;
                    if (endLine >= lines.length) endLine = lines.length - 1;
                    while (startLine > 0 && lines[startLine].start > startIndex) startLine--;
                    while (startLine + 1 < lines.length && lines[startLine].end <= startIndex) startLine++;
                    while (endLine > 0 && lines[endLine].start > endIndex) endLine--;
                    while (endLine + 1 < lines.length && lines[endLine].end <= endIndex) endLine++;
                    var top = Math.max(0, lines[startLine].top - state.lineHeight * 2);
                    var bottom = Math.min(canvasView.getHeight(), lines[endLine].bottom + state.lineHeight * 2);
                    canvasView.invalidate(0, Math.round(top), Math.max(1, canvasView.getWidth()), Math.round(bottom));
                } catch (e0) { this.invalidateVisible(); }
            },
            invalidate: function() {
                try { this.invalidateVisible(); } catch (e0) { try { canvasView.invalidate(); } catch (e1) {} }
            },
            requestLayout: function() {
                try { canvasView.requestLayout(); } catch (e0) {}
            }
        };
    }

    function detectScreenSize() {
        try {
            var wm = appContext.getSystemService(appContext.WINDOW_SERVICE);
            var display = wm.getDefaultDisplay();
            var metrics = new android.util.DisplayMetrics();
            display.getMetrics(metrics);

            screenWidth = metrics.widthPixels;
            screenHeight = metrics.heightPixels;
            var widthDp = screenWidth / metrics.density;
            var heightDp = screenHeight / metrics.density;
            var smallestWidth = Math.min(widthDp, heightDp);
            var shortestPx = Math.min(screenWidth, screenHeight);
            isTablet = smallestWidth >= 600;

            if (isTablet) {
                if (smallestWidth >= 900) { screenCategory = "large_tablet"; uiScale = 1.28; }
                else { screenCategory = "tablet"; uiScale = 1.16; }
            } else if (smallestWidth <= 360 || shortestPx <= 720) {
                screenCategory = "small_phone"; uiScale = 0.92;
            } else if (smallestWidth >= 480) {
                screenCategory = "large_phone"; uiScale = 1.08;
            } else {
                screenCategory = "phone"; uiScale = 1.0;
            }

            if (isTablet) {
                windowWidth = Math.min(screenWidth * 0.78, dp(smallestWidth >= 900 ? 920 : 760));
                maxWindowHeight = screenHeight * 0.85;
                textAreaHeight = uiDp(DIY_CONFIG.TEXT_AREA_HEIGHT_DP, smallestWidth >= 900 ? DIY_CONFIG.TEXT_AREA_HEIGHT_DP + 100 : DIY_CONFIG.TEXT_AREA_HEIGHT_DP);
            } else if (screenCategory === "large_phone") {
                windowWidth = screenWidth * 0.88;
                maxWindowHeight = screenHeight * 0.85;
                textAreaHeight = uiDp(DIY_CONFIG.TEXT_AREA_HEIGHT_DP, DIY_CONFIG.TEXT_AREA_HEIGHT_DP);
            } else if (screenCategory === "small_phone") {
                windowWidth = screenWidth * 0.97;
                maxWindowHeight = screenHeight * 0.90;
                textAreaHeight = uiDp(DIY_CONFIG.TEXT_AREA_HEIGHT_DP - 50, DIY_CONFIG.TEXT_AREA_HEIGHT_DP - 50);
            } else {
                windowWidth = screenWidth * 0.92;
                maxWindowHeight = screenHeight * 0.85;
                textAreaHeight = uiDp(DIY_CONFIG.TEXT_AREA_HEIGHT_DP, DIY_CONFIG.TEXT_AREA_HEIGHT_DP);
            }
        } catch (e) {
            screenCategory = "phone"; uiScale = 1.0;
            windowWidth = dp(360); maxWindowHeight = dp(600); textAreaHeight = dp(280);
        }
    }

    function createRoundRectDrawable(color, radiusDp) {
        var drawable = new GradientDrawable();
        drawable.setShape(GradientDrawable.RECTANGLE);
        safeGdColor(drawable, color);
        drawable.setCornerRadius(dp(radiusDp));
        return drawable;
    }

    function createStrokeRoundRectDrawable(color, strokeColor, radiusDp, strokeDp) {
        var drawable = new GradientDrawable();
        drawable.setShape(GradientDrawable.RECTANGLE);
        safeGdColor(drawable, color);
        drawable.setCornerRadius(dp(radiusDp));
        try { toolhubSafeSetStroke(drawable, Math.max(1, Math.round(dp(strokeDp || 1))), toColorInt(strokeColor)); } catch (e) {}
        return drawable;
    }

    function createPressableDrawable(normalColor, pressedColor, radiusDp) {
        var StateListDrawable = android.graphics.drawable.StateListDrawable;
        var drawable = new StateListDrawable();
        var pressed = new GradientDrawable();
        pressed.setShape(GradientDrawable.RECTANGLE);
        safeGdColor(pressed, pressedColor);
        pressed.setCornerRadius(dp(radiusDp));
        var normal = new GradientDrawable();
        normal.setShape(GradientDrawable.RECTANGLE);
        safeGdColor(normal, normalColor);
        normal.setCornerRadius(dp(radiusDp));
        drawable.addState(jintArray([android.R.attr.state_pressed]), pressed);
        drawable.addState(jintArray([]), normal);
        return drawable;
    }

    function alphaColor20(colorValue, alphaValue) {
        var c = toColorInt(colorValue);
        var a = Math.max(0, Math.min(255, Math.round(Number(alphaValue || 0))));
        return ((a << 24) | (c & 0x00FFFFFF));
    }

    function replicaAccent20() {
        return isDark ? Color.parseColor("#70C9C6") : Color.parseColor("#3DA6A4");
    }

    function replicaAccentEnd20() {
        return isDark ? Color.parseColor("#4BAEAB") : Color.parseColor("#79C6C3");
    }

    function replicaAccentPressed20() {
        return isDark ? Color.parseColor("#3C918F") : Color.parseColor("#2E8E8C");
    }

    function replicaOutline20() {
        return alphaColor20(Colors.outline, isDark ? 150 : 92);
    }

    function replicaSoftSurface20() {
        return isDark ? Color.parseColor("#202124") : Color.parseColor("#FFFFFF");
    }

    function createReplicaGradient20(startColor, endColor, radiusDp) {
        try {
            var gd = new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, jintArray([startColor, endColor]));
            gd.setCornerRadius(dp(radiusDp));
            return gd;
        } catch (eGradient) {
            return createRoundRectDrawable(startColor, radiusDp);
        }
    }

    function createReplicaPrimaryBackground20(radiusDp) {
        try {
            var states = new android.graphics.drawable.StateListDrawable();
            states.addState(jintArray([android.R.attr.state_pressed]), createRoundRectDrawable(replicaAccentPressed20(), radiusDp));
            states.addState(jintArray([]), createReplicaGradient20(replicaAccent20(), replicaAccentEnd20(), radiusDp));
            return states;
        } catch (eState) {
            return createPressableDrawable(replicaAccent20(), replicaAccentPressed20(), radiusDp);
        }
    }

    function resolveReplicaIconColor20(styleKind) {
        if (styleKind === "primary") return Colors.onPrimary;
        if (styleKind === "pin") return replicaAccent20();
        return Colors.text;
    }

    function createReplicaIcon20(kind, styleKind, sizeDp) {
        var paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        var rect = new RectF();
        var iconView = new JavaAdapter(View, {
            onDraw: function(canvas) {
                try {
                    var w = this.getWidth();
                    var h = this.getHeight();
                    var s = Math.min(w, h) * 0.76;
                    var cx = w / 2;
                    var cy = h / 2;
                    var left = cx - s / 2;
                    var top = cy - s / 2;
                    var right = cx + s / 2;
                    var bottom = cy + s / 2;
                    var stroke = Math.max(dp(1.45), s * 0.075);
                    paint.setStrokeWidth(stroke);
                    paint.setStrokeCap(Paint.Cap.ROUND);
                    paint.setStrokeJoin(Paint.Join.ROUND);
                    paint.setStyle(Paint.Style.STROKE);
                    setPaintColor(paint, resolveReplicaIconColor20(styleKind), 255);

                    if (kind === "copy") {
                        rect.set(left + s * 0.08, top + s * 0.02, right - s * 0.20, bottom - s * 0.18);
                        canvas.drawRoundRect(rect, s * 0.10, s * 0.10, paint);
                        rect.set(left + s * 0.22, top + s * 0.18, right - s * 0.04, bottom - s * 0.02);
                        canvas.drawRoundRect(rect, s * 0.10, s * 0.10, paint);
                    } else if (kind === "cleanup") {
                        canvas.drawLine(left + s * 0.04, top + s * 0.20, left + s * 0.58, top + s * 0.20, paint);
                        canvas.drawLine(left + s * 0.04, cy, left + s * 0.50, cy, paint);
                        canvas.drawLine(left + s * 0.04, bottom - s * 0.20, left + s * 0.58, bottom - s * 0.20, paint);
                        var pClean = new android.graphics.Path();
                        pClean.moveTo(left + s * 0.58, top + s * 0.34);
                        pClean.lineTo(right - s * 0.05, top + s * 0.34);
                        pClean.quadTo(right - s * 0.01, top + s * 0.34, right - s * 0.01, top + s * 0.48);
                        pClean.lineTo(right - s * 0.01, bottom - s * 0.18);
                        pClean.moveTo(right - s * 0.01, bottom - s * 0.18);
                        pClean.lineTo(right - s * 0.18, bottom - s * 0.34);
                        pClean.moveTo(right - s * 0.01, bottom - s * 0.18);
                        pClean.lineTo(right - s * 0.18, bottom - s * 0.02);
                        canvas.drawPath(pClean, paint);
                    } else if (kind === "share") {
                        var r = s * 0.10;
                        canvas.drawLine(left + s * 0.25, cy, right - s * 0.24, top + s * 0.24, paint);
                        canvas.drawLine(left + s * 0.25, cy, right - s * 0.24, bottom - s * 0.24, paint);
                        paint.setStyle(Paint.Style.FILL);
                        canvas.drawCircle(left + s * 0.18, cy, r, paint);
                        canvas.drawCircle(right - s * 0.16, top + s * 0.18, r, paint);
                        canvas.drawCircle(right - s * 0.16, bottom - s * 0.18, r, paint);
                    } else if (kind === "pin") {
                        paint.setStyle(Paint.Style.FILL);
                        var pPin = new android.graphics.Path();
                        pPin.moveTo(cx - s * 0.20, top + s * 0.06);
                        pPin.lineTo(cx + s * 0.20, top + s * 0.06);
                        pPin.lineTo(cx + s * 0.14, top + s * 0.34);
                        pPin.lineTo(cx + s * 0.30, cy + s * 0.05);
                        pPin.lineTo(cx - s * 0.30, cy + s * 0.05);
                        pPin.lineTo(cx - s * 0.14, top + s * 0.34);
                        pPin.close();
                        canvas.drawPath(pPin, paint);
                        paint.setStyle(Paint.Style.STROKE);
                        canvas.drawLine(cx, cy + s * 0.05, cx, bottom - s * 0.04, paint);
                    } else if (kind === "globe") {
                        canvas.drawCircle(cx, cy, s * 0.43, paint);
                        rect.set(cx - s * 0.18, top + s * 0.07, cx + s * 0.18, bottom - s * 0.07);
                        canvas.drawOval(rect, paint);
                        canvas.drawLine(left + s * 0.10, cy, right - s * 0.10, cy, paint);
                    } else if (kind === "select") {
                        var d = s * 0.27;
                        canvas.drawLine(left, top + d, left, top, paint);
                        canvas.drawLine(left, top, left + d, top, paint);
                        canvas.drawLine(right - d, top, right, top, paint);
                        canvas.drawLine(right, top, right, top + d, paint);
                        canvas.drawLine(left, bottom - d, left, bottom, paint);
                        canvas.drawLine(left, bottom, left + d, bottom, paint);
                        canvas.drawLine(right - d, bottom, right, bottom, paint);
                        canvas.drawLine(right, bottom - d, right, bottom, paint);
                    } else if (kind === "trash") {
                        rect.set(left + s * 0.20, top + s * 0.28, right - s * 0.20, bottom - s * 0.04);
                        canvas.drawRoundRect(rect, s * 0.06, s * 0.06, paint);
                        canvas.drawLine(left + s * 0.12, top + s * 0.22, right - s * 0.12, top + s * 0.22, paint);
                        canvas.drawLine(cx - s * 0.14, top + s * 0.10, cx + s * 0.14, top + s * 0.10, paint);
                        canvas.drawLine(cx - s * 0.12, top + s * 0.10, cx - s * 0.08, top + s * 0.22, paint);
                        canvas.drawLine(cx + s * 0.12, top + s * 0.10, cx + s * 0.08, top + s * 0.22, paint);
                        canvas.drawLine(cx - s * 0.10, top + s * 0.40, cx - s * 0.10, bottom - s * 0.16, paint);
                        canvas.drawLine(cx + s * 0.10, top + s * 0.40, cx + s * 0.10, bottom - s * 0.16, paint);
                    }
                } catch (eDrawIcon) {}
            }
        }, appContext);
        iconView.setMinimumWidth(uiDp(sizeDp, sizeDp + 2));
        iconView.setMinimumHeight(uiDp(sizeDp, sizeDp + 2));
        iconView.setClickable(false);
        return iconView;
    }

    function styleReplicaButton20(viewObj, styleKind) {
        if (!viewObj) return;
        try {
            var label = viewObj.getTag();
            if (styleKind === "primary") {
                viewObj.setBackground(createReplicaPrimaryBackground20(isTablet ? 16 : 14));
                if (label) safeTextColor(label, Colors.onPrimary);
            } else if (styleKind === "outline") {
                viewObj.setBackground(createStrokeRoundRectDrawable(replicaSoftSurface20(), replicaOutline20(), isTablet ? 16 : 14, 1));
                if (label) safeTextColor(label, Colors.text);
            } else if (styleKind === "pin") {
                viewObj.setBackground(createStrokeRoundRectDrawable(Color.TRANSPARENT, replicaAccent20(), isTablet ? 13 : 11, 1));
                if (label) safeTextColor(label, replicaAccent20());
            } else if (styleKind === "selector") {
                viewObj.setBackground(createStrokeRoundRectDrawable(replicaSoftSurface20(), replicaOutline20(), isTablet ? 15 : 13, 1));
                if (label) safeTextColor(label, Colors.text);
            } else {
                viewObj.setBackground(createPressableDrawable(Color.TRANSPARENT, alphaColor20(Colors.outline, isDark ? 46 : 28), isTablet ? 10 : 8));
                if (label) safeTextColor(label, Colors.text);
            }
            try {
                var childCount = viewObj.getChildCount ? viewObj.getChildCount() : 0;
                for (var iStyle = 0; iStyle < childCount; iStyle++) {
                    var childStyle = viewObj.getChildAt(iStyle);
                    if (childStyle) childStyle.invalidate();
                }
            } catch (eChildren) {}
        } catch (eStyle) {}
    }

    function createReplicaButton20(textValue, iconKind, styleKind, callback, longCallback) {
        var row = new LinearLayout(appContext);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER);
        row.setClickable(true);
        row.setFocusable(true);
        var compactInline = styleKind === "inline";
        var compactPin = styleKind === "pin";
        var iconSize = compactInline ? (isTablet ? 18 : 14) : (compactPin ? (isTablet ? 18 : 15) : (isTablet ? 24 : 17));
        var icon = createReplicaIcon20(iconKind, styleKind, iconSize);
        var iconLp = new LinearLayout.LayoutParams(uiDp(iconSize, iconSize + 2), uiDp(iconSize, iconSize + 2));
        row.addView(icon, iconLp);
        var label = new TextView(appContext);
        label.setText(String(textValue));
        label.setTextSize(compactInline ? uiTextSize(9, 12) : (compactPin ? uiTextSize(10, 12) : uiTextSize(12, 15)));
        label.setSingleLine(true);
        label.setGravity(Gravity.CENTER_VERTICAL);
        label.setPadding(compactInline ? uiDp(3, 7) : (compactPin ? uiDp(4, 7) : uiDp(4, 9)), 0, 0, 0);
        row.addView(label);
        row.setTag(label);
        row.setContentDescription(String(textValue));
        var horizontalPad = compactInline ? uiDp(3, 7) : (compactPin ? uiDp(4, 7) : uiDp(4, 16));
        row.setPadding(horizontalPad, 0, horizontalPad, 0);
        styleReplicaButton20(row, styleKind);
        row.setOnClickListener(new View.OnClickListener({ onClick: function(v) {
            hapticFeedback(v);
            try { callback(); } catch (eCallback) { showToast("操作失败"); }
        } }));
        if (longCallback) {
            row.setOnLongClickListener(new View.OnLongClickListener({
                onLongClick: function(v) {
                    hapticFeedback(v);
                    try { longCallback(); } catch (eLong) { showToast("操作失败"); }
                    return true;
                },
                // Android 14 / API 34 新增的 boolean 回调。Rhino 动态代理必须显式返回，
                // 否则缺失方法会产生 null，并在 system_server 主线程转换 boolean 时崩溃。
                // 当前监听器已主动执行 VIRTUAL_KEY 震动，因此禁止系统再追加默认长按震动。
                onLongClickUseDefaultHapticFeedback: function(v) {
                    return false;
                }
            }));
        }
        applyButtonAnimation(row);
        return row;
    }

    function setReplicaButtonText20(viewObj, textValue) {
        if (!viewObj) return;
        try {
            var label = viewObj.getTag();
            if (label) label.setText(String(textValue));
            viewObj.setContentDescription(String(textValue));
        } catch (eLabel) {}
    }

    function createReplicaSeparator20(vertical) {
        var divider = new View(appContext);
        divider.setBackground(createRoundRectDrawable(alphaColor20(Colors.outline, isDark ? 92 : 52), 0));
        var lp = vertical
            ? new LinearLayout.LayoutParams(Math.max(1, Math.round(dp(1))), uiDp(28, 32))
            : new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, Math.max(1, Math.round(dp(1))));
        if (vertical) lp.setMargins(uiDp(2, 6), 0, uiDp(2, 6), 0);
        divider.setLayoutParams(lp);
        return divider;
    }

    function setCountLabel20(countValue) {
        if (!countLabelView) return;
        var countText = String(Math.max(0, Number(countValue || 0)));
        var full = countText + " 字";
        try {
            var styled = new android.text.SpannableString(new java.lang.String(full));
            styled.setSpan(new android.text.style.RelativeSizeSpan(2.15), 0, countText.length, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            styled.setSpan(new android.text.style.StyleSpan(android.graphics.Typeface.BOLD), 0, countText.length, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            countLabelView.setText(styled);
        } catch (eSpan) {
            countLabelView.setText(full);
        }
    }

    function getFontSizeLevel20() {
        if (currentFontSize <= 18) return "小";
        if (currentFontSize <= 22) return "中";
        if (currentFontSize <= 26) return "大";
        return "超大";
    }

    function updateFontSizeSelector20() {
        if (!fontSizeSelectorView) return;
        try {
            var level = getFontSizeLevel20();
            fontSizeSelectorView.setText("字号   " + level + "  ▾");
            fontSizeSelectorView.setContentDescription("字号下拉菜单，当前" + level);
        } catch (eSizeLabel) {}
    }

    function refreshFontSizeDropdown20() {
        try {
            if (fontSizeDropdownCardView) {
                fontSizeDropdownCardView.setBackground(createStrokeRoundRectDrawable(
                    replicaSoftSurface20(), replicaOutline20(), isTablet ? 15 : 13, 1));
            }
            for (var iPreset = 0; iPreset < fontSizeOptionViews.length; iPreset++) {
                var option = fontSizeOptionViews[iPreset];
                if (!option) continue;
                var meta = String(option.getTag() || "").split("|");
                var label = meta.length > 0 ? meta[0] : "";
                var size = meta.length > 1 ? parseInt(meta[1], 10) : 0;
                var selected = size === currentFontSize;
                option.setText((selected ? "✓  " : "    ") + label + "   " + size + "sp");
                safeTextColor(option, selected ? replicaAccent20() : Colors.text);
                option.setTypeface(null, selected ? android.graphics.Typeface.BOLD : android.graphics.Typeface.NORMAL);
                option.setBackground(createPressableDrawable(
                    selected ? alphaColor20(replicaAccent20(), isDark ? 38 : 22) : Color.TRANSPARENT,
                    alphaColor20(replicaAccent20(), isDark ? 58 : 34),
                    isTablet ? 11 : 9));
            }
        } catch (eDropdownTheme) {}
    }

    function applyVisiblePickwordTheme20() {
        try {
            if (mainLayout) mainLayout.setBackground(createRoundRectDrawable(replicaSoftSurface20(), isTablet ? 28 : 24));
            if (scrollView) scrollView.setBackground(createStrokeRoundRectDrawable(replicaSoftSurface20(), replicaOutline20(), isTablet ? 18 : 15, 1));
            if (previewBoxView) previewBoxView.setBackground(createRoundRectDrawable(Color.TRANSPARENT, 0));
            if (titleAccentView) titleAccentView.setBackground(createRoundRectDrawable(replicaAccent20(), isTablet ? 5 : 4));
            if (fontSizeSelectorView) fontSizeSelectorView.setBackground(createStrokeRoundRectDrawable(replicaSoftSurface20(), replicaOutline20(), isTablet ? 15 : 13, 1));
            refreshFontSizeDropdown20();
            if (closeActionView) safeTextColor(closeActionView, Colors.text);
            if (countLabelView) safeTextColor(countLabelView, Colors.text);
            if (previewTextView) safeTextColor(previewTextView, selectedIndices.length > 0 ? Colors.text : Colors.textSecondary);
            if (resultDividerView) resultDividerView.setBackground(createRoundRectDrawable(alphaColor20(Colors.outline, isDark ? 92 : 52), 0));
            styleReplicaButton20(copyAllActionBtn, "inline");
            styleReplicaButton20(cleanupActionBtn, "inline");
            styleReplicaButton20(shareActionBtn, "inline");
            styleReplicaButton20(pinActionBtn, "pin");
            styleReplicaButton20(copyActionBtn, "primary");
            styleReplicaButton20(translateActionBtn, "outline");
            styleReplicaButton20(selectAllActionBtn, "outline");
            styleReplicaButton20(clearActionBtn, "outline");
            if (fontSizeLabel) safeTextColor(fontSizeLabel, replicaAccent20());
            if (pinLayout) pinLayout.setBackground(createRoundRectDrawable(Colors.surface, isTablet ? 16 : 14));
            if (pinTextView) safeTextColor(pinTextView, Colors.text);
            if (pinProgressView) safeTextColor(pinProgressView, Colors.textTertiary);
            if (textCanvasControl && textCanvasControl.view) textCanvasControl.view.invalidate();
        } catch (eThemeApply) {}
    }

    // 钉屏与拾字根窗口均静态显示，避免透明 Overlay 属性动画。
    function animateWindowEnter(view) {
        if (!view) return;
        try { view.animate().cancel(); } catch (eCancel) {}
        try { view.clearAnimation(); } catch (eClear) {}
        try {
            view.setVisibility(View.VISIBLE);
            view.setAlpha(1);
            view.setScaleX(1);
            view.setScaleY(1);
            view.setTranslationY(0);
        } catch (eStable) {}
    }

    // 主拾字窗口保持静态、完全不透明，避免 WindowManager 根 Surface 属性动画闪烁。
    function animatePickwordMainEnter(view) {
        if (!view) return;
        try { view.animate().cancel(); } catch (eCancel) {}
        try { view.clearAnimation(); } catch (eClear) {}
        try {
            view.setVisibility(View.VISIBLE);
            view.setAlpha(1);
            view.setScaleX(1);
            view.setScaleY(1);
            view.setTranslationY(0);
        } catch (eStable) {}
    }

    // 按压反馈交给 StateListDrawable；不再缩放子 View，避免浮窗合成抖动。
    function applyButtonAnimation(btn) {
        if (!btn) return;
        try { btn.setClickable(true); } catch (eClickable) {}
    }

    function hapticFeedback(view) {
        try { view.performHapticFeedback(android.view.HapticFeedbackConstants.VIRTUAL_KEY); } catch (e) {}
    }

    function setPaintColor(paintObj, colorValue, alphaOverride) {
        try {
            // Canvas Paint 颜色不要再调用 Android Color.red/green/blue，
            // 部分 Rhino/ROM 下静态 int 重载解析失败会让 Paint 保持默认黑色。
            // 这里直接用 JS 位运算拆 ARGB，稳定传给 Paint.setARGB(a,r,g,b)。
            var c = toColorInt(colorValue);
            var a = alphaOverride;
            if (a === undefined || a === null) a = (c >>> 24) & 255;
            var r = (c >> 16) & 255;
            var g = (c >> 8) & 255;
            var b = c & 255;
            paintObj.setARGB(a, r, g, b);
        } catch (e) {}
    }

    function createFontSizeCanvasSlider(owner) {
        var maxProgress = MAX_FONT_SIZE - MIN_FONT_SIZE;
        var state = {
            progress: currentFontSize - MIN_FONT_SIZE,
            dragging: false
        };
        var paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        var rect = new RectF();

        function clampProgress(value) {
            var p = Math.round(Number(value));
            if (p < 0) p = 0;
            if (p > maxProgress) p = maxProgress;
            return p;
        }

        function progressFromX(viewObj, xValue) {
            var w = viewObj.getWidth();
            var pad = uiDp(18, 20);
            var left = pad;
            var right = Math.max(left + 1, w - pad);
            var x = xValue;
            if (x < left) x = left;
            if (x > right) x = right;
            return clampProgress(((x - left) * maxProgress) / (right - left));
        }

        function applyProgress(viewObj, progressValue, fromUser, saveNow) {
            var p = clampProgress(progressValue);
            state.progress = p;
            try { viewObj.invalidate(); } catch (e0) {}
            if (fromUser && owner) {
                var size = MIN_FONT_SIZE + p;
                owner.updateFontSize(size, true);
                if (saveNow) saveFontSize(size);
            }
        }

        var sliderView = new JavaAdapter(View, {
            onDraw: function(canvas) {
                try {
                    var w = this.getWidth();
                    var h = this.getHeight();
                    var pad = uiDp(18, 20);
                    var left = pad;
                    var right = Math.max(left + 1, w - pad);
                    var centerY = Math.round(h / 2);
                    var trackH = uiDp(5, 6);
                    var activeH = uiDp(7, 8);
                    var radius = Math.round(trackH / 2);
                    var activeRadius = Math.round(activeH / 2);
                    var ratio = maxProgress <= 0 ? 0 : state.progress / maxProgress;
                    var thumbX = Math.round(left + (right - left) * ratio);
                    var thumbR = uiDp(10, 11);

                    rect.set(left, centerY - Math.round(trackH / 2), right, centerY + Math.round(trackH / 2));
                    setPaintColor(paint, Colors.surfaceVariant, isDark ? 155 : 185);
                    canvas.drawRoundRect(rect, radius, radius, paint);

                    rect.set(left, centerY - Math.round(activeH / 2), thumbX, centerY + Math.round(activeH / 2));
                    setPaintColor(paint, Colors.primary, 255);
                    canvas.drawRoundRect(rect, activeRadius, activeRadius, paint);

                    setPaintColor(paint, Colors.primary, isDark ? 95 : 80);
                    canvas.drawCircle(thumbX, centerY, thumbR + uiDp(4, 4), paint);
                    setPaintColor(paint, Colors.primary, 255);
                    canvas.drawCircle(thumbX, centerY, thumbR, paint);
                    setPaintColor(paint, Colors.bg, 245);
                    canvas.drawCircle(thumbX, centerY, thumbR - uiDp(6, 6), paint);
                } catch (eDraw) {}
            },
            onTouchEvent: function(event) {
                try {
                    var action = event.getActionMasked ? event.getActionMasked() : event.getAction();
                    if (action === MotionEvent.ACTION_DOWN) {
                        state.dragging = true;
                        try { this.getParent().requestDisallowInterceptTouchEvent(true); } catch (e0) {}
                        hapticFeedback(this);
                        applyProgress(this, progressFromX(this, event.getX()), true, false);
                        return true;
                    }
                    if (action === MotionEvent.ACTION_MOVE && state.dragging) {
                        applyProgress(this, progressFromX(this, event.getX()), true, false);
                        return true;
                    }
                    if (action === MotionEvent.ACTION_UP || action === MotionEvent.ACTION_CANCEL) {
                        if (state.dragging) {
                            applyProgress(this, progressFromX(this, event.getX()), true, action === MotionEvent.ACTION_UP);
                        }
                        state.dragging = false;
                        try { this.getParent().requestDisallowInterceptTouchEvent(false); } catch (e1) {}
                        return true;
                    }
                } catch (eTouch) {}
                return true;
            }
        }, appContext);

        sliderView.setMinimumHeight(uiDp(32, 36));
        sliderView.setClickable(true);
        try { sliderView.setLayerType(View.LAYER_TYPE_SOFTWARE, null); } catch (eLayer) {}

        return {
            view: sliderView,
            setProgress: function(progressValue) { applyProgress(sliderView, progressValue, false, false); },
            getProgress: function() { return state.progress; }
        };
    }

    function showToast(msg) {
        if (!mainHandler || !appContext) return;
        mainHandler.post(new java.lang.Runnable({
            run: function() {
                android.widget.Toast.makeText(appContext, String(msg), android.widget.Toast.LENGTH_SHORT).show();
            }
        }));
    }

    function getSystemProp(key, defVal) {
        try {
            var cls = java.lang.Class.forName("android.os.SystemProperties");
            var m = cls.getMethod("get", java.lang.String.class, java.lang.String.class);
            var v = m.invoke(null, key, defVal || "");
            return String(v == null ? "" : v);
        } catch (e) {
            return defVal || "";
        }
    }

    function appendMagnifierErrorLog(tag, err, extra) {
        try {
            var now = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS").format(new java.util.Date());
            var model = "";
            var brand = "";
            var manu = "";
            var api = 0;
            try { model = String(android.os.Build.MODEL || ""); } catch (e0) {}
            try { brand = String(android.os.Build.BRAND || ""); } catch (e1) {}
            try { manu = String(android.os.Build.MANUFACTURER || ""); } catch (e2) {}
            try { api = android.os.Build.VERSION.SDK_INT; } catch (e3) {}
            var msg = "";
            try { msg = err ? String(err.message || err) : ""; } catch (e4) { msg = ""; }
            var line = now + " [" + String(tag || "MAG") + "] " + msg +
                " | api=" + api + " brand=" + brand + " manu=" + manu + " model=" + model +
                " | safeMode=" + magnifierSafeMode + " enabled=" + systemMagnifierEnabled + " disabledByError=" + magnifierDisabledByError +
                " | extra=" + String(extra || "") + "\n";

            var f = new java.io.File(magnifierLogFilePath);
            var p = f.getParentFile();
            if (p && !p.exists()) p.mkdirs();
            var fw = new java.io.FileWriter(f, true);
            fw.write(line);
            fw.flush();
            fw.close();

            try {
                if (previewTextView) {
                    previewTextView.setText("放大镜异常: " + msg + "\n已自动降级，详情见: " + magnifierLogFilePath);
                }
            } catch (e5) {}
        } catch (e6) {}
    }

    function detectRomProfile() {
        var manu = "";
        var brand = "";
        var model = "";
        var display = "";
        var api = 0;
        try { manu = String(android.os.Build.MANUFACTURER || "").toLowerCase(); } catch (e0) {}
        try { brand = String(android.os.Build.BRAND || "").toLowerCase(); } catch (e1) {}
        try { model = String(android.os.Build.MODEL || "").toLowerCase(); } catch (eModel) {}
        try { display = String(android.os.Build.DISPLAY || "").toLowerCase(); } catch (e2) {}
        try { api = android.os.Build.VERSION.SDK_INT; } catch (e3) {}

        var miuiCode = getSystemProp("ro.miui.ui.version.code", "");
        var modDevice = getSystemProp("ro.product.mod_device", "").toLowerCase();
        var oplusRom = getSystemProp("ro.build.version.oplusrom", "");
        var coloros = getSystemProp("ro.build.version.coloros", "");
        var realmeUi = getSystemProp("ro.build.version.realmeui", "");
        var realmeRom = getSystemProp("ro.build.version.realmerom", "");
        var marketName = getSystemProp("ro.product.marketname", "").toLowerCase();
        var productBrand = getSystemProp("ro.product.brand", "").toLowerCase();
        var productManu = getSystemProp("ro.product.manufacturer", "").toLowerCase();
        var productDevice = getSystemProp("ro.product.device", "").toLowerCase();
        var oplusOsDisplay = getSystemProp("ro.build.display.id", "").toLowerCase();

        var isXiaomi = (manu.indexOf("xiaomi") >= 0) || (brand.indexOf("xiaomi") >= 0) ||
            (manu.indexOf("redmi") >= 0) || (brand.indexOf("redmi") >= 0) ||
            (display.indexOf("hyperos") >= 0) || (display.indexOf("miui") >= 0) ||
            (String(miuiCode).length > 0) || (String(modDevice).length > 0);

        var isColorOS = (String(coloros).length > 0) || (display.indexOf("coloros") >= 0);

        var isOplus = (manu.indexOf("oppo") >= 0) || (brand.indexOf("oppo") >= 0) ||
            (manu.indexOf("oneplus") >= 0) || (brand.indexOf("oneplus") >= 0) ||
            (String(oplusRom).length > 0) || (String(coloros).length > 0);

        var isRealme = (manu.indexOf("realme") >= 0) || (brand.indexOf("realme") >= 0) ||
            (model.indexOf("rmx") >= 0) ||
            (display.indexOf("realme") >= 0) || (marketName.indexOf("realme") >= 0) ||
            (productBrand.indexOf("realme") >= 0) || (productManu.indexOf("realme") >= 0) ||
            (productDevice.indexOf("rmx") >= 0) || (oplusOsDisplay.indexOf("rmx") >= 0) ||
            (String(realmeUi).length > 0) || (String(realmeRom).length > 0);

        return {
            isXiaomi: isXiaomi,
            isOplus: isOplus,
            isColorOS: isColorOS,
            isRealme: isRealme,
            api: api,
            summary: "api=" + api + ", manu=" + manu + ", brand=" + brand + ", model=" + model + ", display=" + display + ", miuiCode=" + miuiCode + ", modDevice=" + modDevice + ", oplusRom=" + oplusRom + ", coloros=" + coloros + ", realmeUi=" + realmeUi + ", realmeRom=" + realmeRom + ", market=" + marketName + ", pBrand=" + productBrand + ", pManu=" + productManu + ", pDev=" + productDevice + ", buildId=" + oplusOsDisplay + ", realme=" + isRealme
        };
    }

    function applyMagnifierSafetyProfile() {
        romProfile = detectRomProfile();
        // 手动强制禁用（localVarOf$禁用系统放大镜=1）优先级最高
        var userDisableMagnifier = false;
        try {
            userDisableMagnifier = (typeof localVarOf$禁用系统放大镜 !== 'undefined') && (String(localVarOf$禁用系统放大镜) === "1");
        } catch (eUser) { userDisableMagnifier = false; }
        if (userDisableMagnifier) {
            forceDisableSystemMagnifier = true;
            magnifierSafeMode = true;
            MAGNIFIER_MAX_ERROR_COUNT = 1;
            FINGER_PREVIEW_INTERVAL = 40;
            FINGER_PREVIEW_CONTENT_INTERVAL = 80;
            return;
        }

        // realme 默认也开启系统放大镜，但使用安全模式/低频率，避免复杂参数触发 ROM 风险。
        if (romProfile.isRealme) {
            magnifierSafeMode = true;
            MAGNIFIER_MAX_ERROR_COUNT = 1;
            FINGER_PREVIEW_INTERVAL = 40;
            FINGER_PREVIEW_CONTENT_INTERVAL = 80;
            return;
        }

        // 保留 HyperOS/MIUI 兼容路径
        if (romProfile.isXiaomi) {
            magnifierSafeMode = true;
            MAGNIFIER_MAX_ERROR_COUNT = 1;
            FINGER_PREVIEW_INTERVAL = 33;
            FINGER_PREVIEW_CONTENT_INTERVAL = 66;
            return;
        }

        // 保留 ColorOS 兼容：仅走保守参数，不强制禁用放大镜
        if (romProfile.isColorOS) {
            magnifierSafeMode = true;
            MAGNIFIER_MAX_ERROR_COUNT = 2;
            FINGER_PREVIEW_INTERVAL = 28;
            FINGER_PREVIEW_CONTENT_INTERVAL = 56;
            return;
        }

        // 其余机型走默认策略
    }

    function setClipboard(text) {
        try {
            if (typeof setClip === 'function') {
                setClip(text);
                return true;
            } else {
                var cm = appContext.getSystemService(appContext.CLIPBOARD_SERVICE);
                if (cm) {
                    var clip = android.content.ClipData.newPlainText("拾字", String(text));
                    cm.setPrimaryClip(clip);
                    return true;
                }
            }
        } catch (e) {
            showToast("复制失败: " + e.message);
        }
        return false;
    }

    function runUi(action) {
        mainHandler.post(new java.lang.Runnable({ run: action }));
    }

    function getSharedPrefs() {
        return appContext.getSharedPreferences(PREFS_NAME, appContext.MODE_PRIVATE);
    }

    function getFontSizeStoreFile() {
        try {
            if (typeof shortx !== 'undefined' && shortx && shortx.getShortXDir) {
                return new java.io.File(shortx.getShortXDir() + "/data/pickword_font_size.txt");
            }
        } catch (e) {}
        return null;
    }

    function readFontSizeFromFile() {
        var file = getFontSizeStoreFile();
        if (!file || !file.exists()) return -1;
        try {
            var reader = new java.io.BufferedReader(new java.io.FileReader(file));
            var line = reader.readLine();
            reader.close();
            if (!line) return -1;
            var size = parseInt(String(line).replace(/\s+/g, ""), 10);
            return isNaN(size) ? -1 : size;
        } catch (e) {
            return -1;
        }
    }

    function writeFontSizeToFile(size) {
        var file = getFontSizeStoreFile();
        if (!file) return false;
        try {
            var parent = file.getParentFile();
            if (parent && !parent.exists()) { parent.mkdirs(); }
            var writer = new java.io.FileWriter(file, false);
            writer.write(String(size));
            writer.flush();
            writer.close();
            return true;
        } catch (e) {
            return false;
        }
    }

    function loadFontSize() {
        try {
            var defaultSize = getAdaptiveDefaultFontSize();
            var savedSize = readFontSizeFromFile();
            if (savedSize < 0) {
                try {
                    var prefs = getSharedPrefs();
                    savedSize = prefs.getInt(KEY_FONT_SIZE, -1);
                } catch (e1) { savedSize = -1; }
            }
            if (savedSize >= MIN_FONT_SIZE && savedSize <= MAX_FONT_SIZE) {
                currentFontSize = savedSize;
            } else {
                currentFontSize = defaultSize;
            }
        } catch (e) {
            currentFontSize = getAdaptiveDefaultFontSize();
        }
        return currentFontSize;
    }

    function saveFontSize(size) {
        var saved = writeFontSizeToFile(size);
        try {
            var prefs = getSharedPrefs();
            var editor = prefs.edit();
            editor.putInt(KEY_FONT_SIZE, size);
            editor.apply();
        } catch (e) {}
        return saved;
    }

    function getSafeScaleValue(value, fallbackValue) {
        var n = parseFloat(String(value));
        if (isNaN(n) || n <= 0) return fallbackValue;
        if (n < 0.5) n = 0.5;
        if (n > 2.0) n = 2.0;
        return n;
    }

    function getCharSpacingScale(ch) {
        if (!ch || ch.length === 0) return 1.0;
        var code = ch.charCodeAt(0);
        if (code === 10 || code === 13 || code === 9 || code === 32 || code === 0x3000) return 1.0;
        if ((code >= 0x21 && code <= 0x7E) || (code >= 0xFF61 && code <= 0xFFDC)) {
            return getSafeScaleValue(DIY_CONFIG.HALF_WIDTH_CHAR_SPACING_SCALE, 1.0);
        }
        if (code >= 0x2E80 || code > 0xFF00) {
            return getSafeScaleValue(DIY_CONFIG.FULL_WIDTH_CHAR_SPACING_SCALE, 1.0);
        }
        return 1.0;
    }

    function rebuildSelectedSetFromIndices(indices) {
        var result = {};
        for (var i = 0; i < indices.length; i++) {
            result[indices[i]] = true;
        }
        return result;
    }

    function countSelectedSet(setObj) {
        var count = 0;
        try {
            for (var k in setObj) {
                if (Object.prototype.hasOwnProperty.call(setObj, k) && setObj[k] === true) count++;
            }
        } catch (e) {}
        return count;
    }

    function countSelectedInRange(setObj, startIndex, endIndex) {
        if (!setObj) return 0;
        if (startIndex > endIndex) { var tmp = startIndex; startIndex = endIndex; endIndex = tmp; }
        if (startIndex < 0) startIndex = 0;
        var count = 0;
        try {
            for (var i = startIndex; i <= endIndex; i++) {
                if (setObj[i] === true) count++;
            }
        } catch (e) {}
        return count;
    }

    function calcDragSelectionCount(minIndex, maxIndex) {
        if (!dragSnapshotSet || minIndex < 0 || maxIndex < 0) return selectedIndices.length;
        if (minIndex > maxIndex) { var tmp = minIndex; minIndex = maxIndex; maxIndex = tmp; }
        var selectedInRange = countSelectedInRange(dragSnapshotSet, minIndex, maxIndex);
        var rangeLen = maxIndex - minIndex + 1;
        if (dragStartWasSelected) return Math.max(0, dragSnapshotCount - selectedInRange);
        return Math.max(0, dragSnapshotCount + rangeLen - selectedInRange);
    }

    var dragUpdateProcessor = new java.lang.Runnable({
        run: function() {
            pendingDragUpdate = null;
            var dmin = dragPendingDirtyMin;
            var dmax = dragPendingDirtyMax;
            dragPendingDirtyMin = -1;
            dragPendingDirtyMax = -1;
            if (dmin < 0 || dmax < 0) {
                dmin = lastDragVisualMin;
                dmax = lastDragVisualMax;
            }
            lastDragUpdateTime = Date.now();
            拾字Floaty.updateSelectionSpans(dmin, dmax);
            拾字Floaty.updatePreviewDuringDrag();
        }
    });

    var 拾字Floaty = {
        // 动态动画流参数
        currentScrollDirection: 0,
        currentScrollSpeed: 0,
        exactScrollY: 0,

        show: function(text) {
            if (mainLayout !== null) {
                isShowing = true;
                this.resetTextLoadState((typeof text === 'string') ? text : String(text || ""));
                selectedIndices = [];
                selectedSet = {};
                previewTextOverride = null;
                previewSelectionSignature = "";
                cleanUndoStack = [];
                isDragging = false;
                dragStartIndex = -1;
                isAutoScrolling = false;
                lastTouchX = 0;
                lastTouchY = 0;
                lastTouchRawX = 0;
                lastTouchRawY = 0;
                fingerPreviewLastIndex = -1;
                fingerPreviewLastUpdateTime = 0;
                lastDragEnd = -1;
                dragSnapshotSet = null;
                dragSnapshotCount = 0;
                dragStartWasSelected = false;
                dragPendingDirtyMin = -1;
                dragPendingDirtyMax = -1;
                lastTranslationState = null;
                this.currentScrollDirection = 0;
                this.currentScrollSpeed = 0;

                loadFontSize();
                var self = this;
                runUi(function() {
                    try {
                        if (seekBar) seekBar.setProgress(currentFontSize - MIN_FONT_SIZE);
                        if (fontSizeLabel) fontSizeLabel.setText(currentFontSize + "sp");
                        updateFontSizeSelector20();
                        if (textCanvasControl) textCanvasControl.setTextSize(currentFontSize);
                        self.scheduleInitialTextLoad();
                        mainLayout.setVisibility(View.VISIBLE);
                        animatePickwordMainEnter(mainLayout);
                    } catch (e) {
                        showToast("显示窗口失败: " + e.message);
                        isShowing = false;
                    }
                });
                return;
            }

            if (isShowing) {
                showToast("拾字已在运行");
                return;
            }

            loadFontSize();
            if (android.os.Build.VERSION.SDK_INT >= 23) {
                if (!android.provider.Settings.canDrawOverlays(appContext)) {
                    showToast("请先授予悬浮窗权限");
                    var intent = new android.content.Intent(android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                    intent.setData(android.net.Uri.parse("package:" + appContext.getPackageName()));
                    intent.setFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                    appContext.startActivity(intent);
                    return;
                }
            }

            isShowing = true;
            this.resetTextLoadState((typeof text === 'string') ? text : String(text || ""));
            selectedIndices = [];
            selectedSet = {};
            previewTextOverride = null;
            previewSelectionSignature = "";
            cleanUndoStack = [];
                isDragging = false;
            dragStartIndex = -1;
            isAutoScrolling = false;
            lastTouchX = 0;
            lastTouchY = 0;
            lastTouchRawX = 0;
            lastTouchRawY = 0;
            fingerPreviewLastIndex = -1;
            fingerPreviewLastUpdateTime = 0;
            lastDragEnd = -1;
            dragSnapshotSet = null;
            dragSnapshotCount = 0;
            dragStartWasSelected = false;
            dragPendingDirtyMin = -1;
            dragPendingDirtyMax = -1;
            lastTranslationState = null;
            this.currentScrollDirection = 0;
            this.currentScrollSpeed = 0;

            var self = this;
            runUi(function() {
                try {
                    self.createWindow();
                    animatePickwordMainEnter(mainLayout);
                } catch (e) {
                    showToast("创建窗口失败: " + e.message);
                    isShowing = false;
                }
            });
        },

        hide: function() {
            if (windowManager !== null && mainLayout !== null) {
                runUi(function() {
                    try {
                        if (longPressHandler) {
                            mainHandler.removeCallbacks(longPressHandler);
                            longPressHandler = null;
                        }
                        if (autoScrollRunnable) {
                            mainHandler.removeCallbacks(autoScrollRunnable);
                            autoScrollRunnable = null;
                        }
                        if (keepAliveTimer && pinLayout === null) {
                            mainHandler.removeCallbacks(keepAliveTimer);
                            keepAliveTimer = null;
                        }
                        if (pendingFullTextRunnable) {
                            mainHandler.removeCallbacks(pendingFullTextRunnable);
                            pendingFullTextRunnable = null;
                        }
                        if (pendingFingerPreviewWarmupRunnable) {
                            mainHandler.removeCallbacks(pendingFingerPreviewWarmupRunnable);
                            pendingFingerPreviewWarmupRunnable = null;
                        }
                        拾字Floaty.stopCanvasScrollRefresh();

                        拾字Floaty.removeFingerPreview();
                        try {
                            if (fontSizePopupWindow && fontSizePopupWindow.isShowing()) fontSizePopupWindow.dismiss();
                        } catch (eFontPopup) {}
                        fontSizePopupWindow = null;

                        windowManager.removeView(mainLayout);
                        mainLayout = null;
                        previewBoxView = null;
                        copyAllActionBtn = null;
                        cleanupActionBtn = null;
                        shareActionBtn = null;
                        fontSizeSelectorView = null;
                        titleAccentView = null;
                        resultDividerView = null;
                        closeActionView = null;
                        titleBarRefs = { normalMode: null, settingMode: null };
                    fontSizeDropdownView = null;
                    fontSizeDropdownCardView = null;
                    fontSizePopupWindow = null;
                    fontSizeOptionViews = [];
                        textView = null;
                        textCanvasControl = null;
                        scrollView = null;
                        previewTextView = null;

                    } catch (e) {}
                    isShowing = false;
                });
            }
        },

        resetTextLoadState: function(text) {
            if (pendingFullTextRunnable) {
                try { mainHandler.removeCallbacks(pendingFullTextRunnable); } catch (e) {}
                pendingFullTextRunnable = null;
            }
            if (pendingFingerPreviewWarmupRunnable) {
                try { mainHandler.removeCallbacks(pendingFingerPreviewWarmupRunnable); } catch (e1) {}
                pendingFingerPreviewWarmupRunnable = null;
            }
            originalFullText = String(text || "");
            isPartialTextLoaded = false;
            fullText = originalFullText;
        },

        scheduleFingerPreviewWarmup: function(delayMs) {
            var self = this;
            if (pendingFingerPreviewWarmupRunnable) {
                try { mainHandler.removeCallbacks(pendingFingerPreviewWarmupRunnable); } catch (e0) {}
                pendingFingerPreviewWarmupRunnable = null;
            }
            pendingFingerPreviewWarmupRunnable = new java.lang.Runnable({
                run: function() {
                    pendingFingerPreviewWarmupRunnable = null;
                    try {
                        if (!isShowing || !mainLayout || !windowManager || (systemMagnifierEnabled && systemMagnifier)) return;
                        self.createFingerPreview();
                    } catch (e1) {}
                }
            });
            mainHandler.postDelayed(pendingFingerPreviewWarmupRunnable, delayMs || 900);
        },

        loadFullTextNow: function(showMsg, preserveHeight) {
            try {
                if (!isShowing || !textView || !isPartialTextLoaded) return false;
                if (isDragging || selectedIndices.length > 0) {
                    return false;
                }
                if (pendingFullTextRunnable) {
                    try { mainHandler.removeCallbacks(pendingFullTextRunnable); } catch (e0) {}
                    pendingFullTextRunnable = null;
                }
                fullText = String(originalFullText || fullText || "");
                isPartialTextLoaded = false;
                selectedIndices = [];
                selectedSet = {};
                previewTextOverride = null;
                previewSelectionSignature = "";
                cleanUndoStack = [];
                this.updateTextView(true);
                this.updateActionButtons();
                if (preserveHeight !== true) this.adjustScrollViewHeight();
                if (showMsg) showToast("长文本已加载完整");
                return true;
            } catch (e1) {
                if (showMsg) showToast("加载全文失败: " + e1.message);
                return false;
            }
        },

        scheduleInitialTextLoad: function() {
            var self = this;
            if (pendingFullTextRunnable) {
                try { mainHandler.removeCallbacks(pendingFullTextRunnable); } catch (e0) {}
                pendingFullTextRunnable = null;
            }
            try {
                var source = String(originalFullText || fullText || "");
                if (source.length > INITIAL_TEXT_FAST_LIMIT) {
                    isPartialTextLoaded = true;
                    fullText = source.substring(0, INITIAL_TEXT_FAST_LIMIT);
                } else {
                    isPartialTextLoaded = false;
                    fullText = source;
                }

                this.updateTextView(true);
                this.updateActionButtons();
                this.applyScrollViewHeightNow();
                this.scheduleFingerPreviewWarmup(isPartialTextLoaded ? 900 : 700);

                if (isPartialTextLoaded) {
                    pendingFullTextRunnable = new java.lang.Runnable({
                        run: function() {
                            try {
                                if (!isShowing || !textView) return;
                                if (isDragging || selectedIndices.length > 0) {
                                    mainHandler.postDelayed(pendingFullTextRunnable, 600);
                                    return;
                                }
                                // 首批文本已经确定外层窗口高度；补全全文只扩展内部可滚动内容。
                                self.loadFullTextNow(false, true);
                            } catch (e1) {}
                        }
                    });
                    mainHandler.postDelayed(pendingFullTextRunnable, FULL_TEXT_DELAY_MS);
                }
            } catch (e2) {
                showToast("加载文本失败: " + e2.message);
            }
        },

        installCanvasScrollRefreshHooks: function() {
            try {
                if (!scrollView) return;
                var self = this;
                if (android.os.Build.VERSION.SDK_INT >= 23) {
                    try {
                        scrollView.setOnScrollChangeListener(new View.OnScrollChangeListener({
                            onScrollChange: function(v, scrollX, scrollY, oldScrollX, oldScrollY) {
                                try {
                                    if (scrollY !== oldScrollY && textCanvasControl) {
                                        textCanvasControl.invalidateVisible();
                                        self.startCanvasScrollRefresh();
                                    }
                                } catch (e0) {}
                            }
                        }));
                    } catch (e1) {}
                }
                // 触摸兜底：部分 ROM 的快速 fling 不稳定触发子 View 重绘，按下/移动期间启动短轮询。
                try {
                    scrollView.setOnTouchListener(new View.OnTouchListener({
                        onTouch: function(v, event) {
                            try {
                                var action = event.getAction();
                                if (action === MotionEvent.ACTION_DOWN || action === MotionEvent.ACTION_MOVE || action === MotionEvent.ACTION_UP || action === MotionEvent.ACTION_CANCEL) {
                                    self.startCanvasScrollRefresh();
                                }
                            } catch (e2) {}
                            return false;
                        }
                    }));
                } catch (e3) {}
            } catch (e) {}
        },

        startCanvasScrollRefresh: function() {
            try {
                if (!mainHandler || !scrollView || !textCanvasControl) return;
                canvasScrollIdleFrames = 0;
                if (canvasScrollRefreshRunning) return;
                canvasScrollRefreshRunning = true;
                canvasLastScrollY = -1;
                var self = this;
                canvasScrollRefreshRunnable = new java.lang.Runnable({
                    run: function() {
                        try {
                            if (!isShowing || !scrollView || !textCanvasControl) {
                                canvasScrollRefreshRunning = false;
                                canvasScrollRefreshRunnable = null;
                                return;
                            }
                            var currentY = 0;
                            try { currentY = scrollView.getScrollY(); } catch (e0) { currentY = 0; }
                            if (currentY !== canvasLastScrollY) {
                                canvasLastScrollY = currentY;
                                canvasScrollIdleFrames = 0;
                                try { textCanvasControl.invalidateVisible(); } catch (e1) {}
                            } else {
                                canvasScrollIdleFrames++;
                                // 停止前再补几帧，修复快速 fling 后新露出的区域没有绘制的问题。
                                try { textCanvasControl.invalidateVisible(); } catch (e2) {}
                            }

                            var idleLimit = 8;
                            try { idleLimit = parseInt(String(DIY_CONFIG.CANVAS_SCROLL_REFRESH_IDLE_FRAMES), 10); } catch (e3) { idleLimit = 8; }
                            if (isNaN(idleLimit) || idleLimit < 2) idleLimit = 8;
                            if (idleLimit > 20) idleLimit = 20;

                            // 普通拖选时不再让滚动兜底轮询常驻刷新；只有真正滚动/自动滚动时才继续。
                            // 否则拖选 + 放大镜会叠加每 16ms 可见区重绘，导致明显掉帧。
                            if (isAutoScrolling || canvasScrollIdleFrames < idleLimit) {
                                var delay = 16;
                                try { delay = parseInt(String(DIY_CONFIG.CANVAS_SCROLL_REFRESH_INTERVAL_MS), 10); } catch (e4) { delay = 16; }
                                if (isNaN(delay) || delay < 8) delay = 16;
                                if (delay > 40) delay = 40;
                                mainHandler.postDelayed(canvasScrollRefreshRunnable, delay);
                            } else {
                                canvasScrollRefreshRunning = false;
                                canvasScrollRefreshRunnable = null;
                            }
                        } catch (e5) {
                            canvasScrollRefreshRunning = false;
                            canvasScrollRefreshRunnable = null;
                        }
                    }
                });
                mainHandler.post(canvasScrollRefreshRunnable);
            } catch (e6) {}
        },

        stopCanvasScrollRefresh: function() {
            canvasScrollRefreshRunning = false;
            canvasScrollIdleFrames = 0;
            canvasLastScrollY = -1;
            if (canvasScrollRefreshRunnable) {
                try { mainHandler.removeCallbacks(canvasScrollRefreshRunnable); } catch (e0) {}
                canvasScrollRefreshRunnable = null;
            }
        },

        createWindow: function() {
            detectScreenSize();
            applyPickwordColorScheme20(toolhubAppRef);
            windowManager = appContext.getSystemService(appContext.WINDOW_SERVICE);

            windowWidth = Math.round(screenWidth * (isTablet ? 0.92 : 0.94));
            var maxReplicaWidth = Math.round(uiDp(620, 980));
            if (windowWidth > maxReplicaWidth) windowWidth = maxReplicaWidth;
            if (windowWidth < Math.round(uiDp(300, 520))) windowWidth = Math.round(screenWidth * 0.96);
            textAreaHeight = Math.min(Math.round(screenHeight * (isTablet ? 0.34 : 0.30)), Math.round(uiDp(250, 330)));
            // 与 CanvasView.onMeasure() 使用同一最小高度，避免 ScrollView 高于子 View 后露出底部背景空条。
            textAreaMinHeight = Math.min(textAreaHeight, Math.round(uiDp(80, 96)));

            layoutParams = new LayoutParams(
                windowWidth, LayoutParams.WRAP_CONTENT,
                LayoutParams.TYPE_APPLICATION_OVERLAY,
                LayoutParams.FLAG_NOT_FOCUSABLE | LayoutParams.FLAG_DIM_BEHIND,
                android.graphics.PixelFormat.TRANSLUCENT
            );
            layoutParams.gravity = Gravity.CENTER;
            layoutParams.x = 0;
            layoutParams.y = 0;
            layoutParams.dimAmount = 0.18;

            mainLayout = new LinearLayout(appContext);
            mainLayout.setOrientation(LinearLayout.VERTICAL);
            mainLayout.setBackground(createRoundRectDrawable(replicaSoftSurface20(), isTablet ? 28 : 24));
            mainLayout.setElevation(uiDp(8, 12));
            mainLayout.setPadding(uiDp(18, 28), uiDp(18, 24), uiDp(18, 28), uiDp(18, 24));

            var titleBar = this.createTitleBar();
            mainLayout.addView(titleBar);

            // 字号菜单使用锚定 PopupWindow，不能加入主 LinearLayout 参与窗口测量。

            scrollView = new ScrollView(appContext);
            var scrollParams = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, uiDp(60, 72));
            scrollParams.height = textAreaMinHeight;
            scrollParams.setMargins(0, uiDp(18, 22), 0, uiDp(12, 16));
            scrollView.setLayoutParams(scrollParams);
            scrollView.setBackground(createStrokeRoundRectDrawable(replicaSoftSurface20(), replicaOutline20(), isTablet ? 18 : 15, 1));
            try { scrollView.setFillViewport(false); } catch (eFill) {}
            try { scrollView.setClipToPadding(false); } catch (eClip) {}
            this.installCanvasScrollRefreshHooks();

            textCanvasControl = createCanvasTextControl();
            textView = textCanvasControl.view;
            textCanvasControl.setTextSize(currentFontSize);
            textView.setPadding(uiDp(16, 22), uiDp(16, 20), uiDp(16, 22), uiDp(16, 20));
            textView.setContentDescription("点击或长按文字进行选择");
            this.setupTextViewTouch();

            scrollView.addView(textView);
            mainLayout.addView(scrollView);

            var previewBox = this.createPreviewBox();
            mainLayout.addView(previewBox);

            var self = this;
            var actionBar = new LinearLayout(appContext);
            actionBar.setOrientation(LinearLayout.HORIZONTAL);
            actionBar.setGravity(Gravity.CENTER_VERTICAL);
            actionBar.setPadding(0, uiDp(14, 18), 0, 0);

            copyActionBtn = this.createPrimaryBtn("复制", function() { self.doCopy(); });
            translateActionBtn = this.createIconBtn("翻译", "globe", function() {
                if (lastTranslationState) { self.undoLastTranslation(); } else { self.doTranslate(); }
            });
            selectAllActionBtn = this.createIconBtn("全选", "select", function() { self.selectAll(); });
            clearActionBtn = this.createIconBtn("清空", "trash", function() { self.clear(); });

            var bottomButtons = [copyActionBtn, translateActionBtn, selectAllActionBtn, clearActionBtn];
            for (var iBottom = 0; iBottom < bottomButtons.length; iBottom++) {
                var bottomLp = new LinearLayout.LayoutParams(0, uiDp(52, 60), 1);
                if (iBottom > 0) bottomLp.setMargins(uiDp(7, 10), 0, 0, 0);
                bottomButtons[iBottom].setLayoutParams(bottomLp);
                actionBar.addView(bottomButtons[iBottom]);
            }
            mainLayout.addView(actionBar);
            this.updateActionButtons();

            this.scheduleInitialTextLoad();
            windowManager.addView(mainLayout, layoutParams);
        },

        createTitleBar: function() {
            var titleBar = new LinearLayout(appContext);
            titleBar.setOrientation(LinearLayout.HORIZONTAL);
            titleBar.setGravity(Gravity.CENTER_VERTICAL);
            var self = this;

            var normalMode = new LinearLayout(appContext);
            normalMode.setOrientation(LinearLayout.HORIZONTAL);
            normalMode.setGravity(Gravity.CENTER_VERTICAL);
            normalMode.setLayoutParams(new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

            titleAccentView = new View(appContext);
            titleAccentView.setBackground(createRoundRectDrawable(replicaAccent20(), isTablet ? 5 : 4));
            var accentLp = new LinearLayout.LayoutParams(uiDp(6, 8), uiDp(28, 36));
            accentLp.setMargins(0, 0, uiDp(12, 16), 0);
            normalMode.addView(titleAccentView, accentLp);

            var titleText = new TextView(appContext);
            titleText.setText("拾字");
            safeTextColor(titleText, Colors.text);
            titleText.setTextSize(uiTextSize(22, 27));
            titleText.setTypeface(null, android.graphics.Typeface.BOLD);
            titleText.setGravity(Gravity.CENTER_VERTICAL);
            titleText.setContentDescription("拾字；点击复制博客链接");
            titleText.setOnClickListener(new View.OnClickListener({ onClick: function(v) {
                try { setClipboard("https://xin-blog.com"); showToast("链接已复制"); } catch (eLink) {}
            } }));
            titleText.setLayoutParams(new LinearLayout.LayoutParams(0, LayoutParams.WRAP_CONTENT, 1));
            normalMode.addView(titleText);

            fontSizeSelectorView = new TextView(appContext);
            updateFontSizeSelector20();
            safeTextColor(fontSizeSelectorView, Colors.text);
            fontSizeSelectorView.setTextSize(uiTextSize(12, 14));
            fontSizeSelectorView.setGravity(Gravity.CENTER);
            fontSizeSelectorView.setSingleLine(true);
            fontSizeSelectorView.setPadding(uiDp(14, 18), 0, uiDp(14, 18), 0);
            fontSizeSelectorView.setBackground(createStrokeRoundRectDrawable(replicaSoftSurface20(), replicaOutline20(), isTablet ? 15 : 13, 1));
            fontSizeSelectorView.setContentDescription("字号设置，当前" + getFontSizeLevel20());
            var selectorLp = new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, uiDp(42, 50));
            selectorLp.setMargins(uiDp(8, 12), 0, uiDp(10, 14), 0);
            normalMode.addView(fontSizeSelectorView, selectorLp);
            // 原字号滑杆按钮入口暂时屏蔽；当前入口只打开四档字号下拉菜单。
            fontSizeSelectorView.setOnClickListener(new View.OnClickListener({ onClick: function(v) { hapticFeedback(v); self.toggleFontSizeDropdown(); } }));
            applyButtonAnimation(fontSizeSelectorView);

            closeActionView = new TextView(appContext);
            closeActionView.setText("×");
            safeTextColor(closeActionView, Colors.text);
            closeActionView.setTextSize(uiTextSize(28, 34));
            closeActionView.setGravity(Gravity.CENTER);
            closeActionView.setContentDescription("关闭拾字");
            closeActionView.setBackground(createPressableDrawable(Color.TRANSPARENT, alphaColor20(Colors.outline, isDark ? 60 : 34), isTablet ? 14 : 12));
            var closeLp = new LinearLayout.LayoutParams(uiDp(42, 50), uiDp(42, 50));
            normalMode.addView(closeActionView, closeLp);
            closeActionView.setOnClickListener(new View.OnClickListener({ onClick: function(v) { hapticFeedback(v); self.hide(); } }));
            applyButtonAnimation(closeActionView);

            var settingMode = new LinearLayout(appContext);
            settingMode.setOrientation(LinearLayout.HORIZONTAL);
            settingMode.setGravity(Gravity.CENTER_VERTICAL);
            settingMode.setLayoutParams(new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));
            settingMode.setVisibility(View.GONE);

            var settingTitle = new TextView(appContext);
            settingTitle.setText("字号");
            settingTitle.setTextSize(uiTextSize(13, 15));
            settingTitle.setTypeface(null, android.graphics.Typeface.BOLD);
            safeTextColor(settingTitle, Colors.text);
            settingTitle.setPadding(0, 0, uiDp(10, 14), 0);
            settingMode.addView(settingTitle);

            seekBar = createFontSizeCanvasSlider(self);
            seekBar.setProgress(currentFontSize - MIN_FONT_SIZE);
            var sliderLp = new LinearLayout.LayoutParams(0, uiDp(36, 42), 1);
            seekBar.view.setLayoutParams(sliderLp);
            settingMode.addView(seekBar.view);

            fontSizeLabel = new TextView(appContext);
            fontSizeLabel.setText(currentFontSize + "sp");
            safeTextColor(fontSizeLabel, replicaAccent20());
            fontSizeLabel.setTextSize(uiTextSize(11, 12));
            fontSizeLabel.setTypeface(null, android.graphics.Typeface.BOLD);
            fontSizeLabel.setGravity(Gravity.CENTER);
            fontSizeLabel.setPadding(uiDp(8, 10), 0, uiDp(8, 10), 0);
            var labelLp = new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, uiDp(34, 40));
            labelLp.setMargins(uiDp(8, 10), 0, uiDp(4, 6), 0);
            settingMode.addView(fontSizeLabel, labelLp);

            loadedRemoveSpaceBtn = self.createSettingChipBtn("去空格", function() { self.removeLoadedSpaces(); });
            loadedRemoveNewlineBtn = self.createSettingChipBtn("去换行", function() { self.removeLoadedNewlines(); });
            settingMode.addView(loadedRemoveSpaceBtn);
            settingMode.addView(loadedRemoveNewlineBtn);

            var confirmBtn = new TextView(appContext);
            confirmBtn.setText("完成");
            safeTextColor(confirmBtn, replicaAccent20());
            confirmBtn.setTextSize(uiTextSize(11, 12));
            confirmBtn.setGravity(Gravity.CENTER);
            confirmBtn.setPadding(uiDp(9, 12), 0, uiDp(6, 8), 0);
            confirmBtn.setBackground(createPressableDrawable(Color.TRANSPARENT, alphaColor20(replicaAccent20(), 32), isTablet ? 10 : 8));
            var confirmLp = new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, uiDp(34, 40));
            settingMode.addView(confirmBtn, confirmLp);
            confirmBtn.setOnClickListener(new View.OnClickListener({ onClick: function(v) {
                hapticFeedback(v);
                if (seekBar) saveFontSize(MIN_FONT_SIZE + seekBar.getProgress());
                updateFontSizeSelector20();
                self.toggleFontSizePanel();
            } }));
            applyButtonAnimation(confirmBtn);

            titleBar.addView(normalMode);
            titleBar.addView(settingMode);
            titleBarRefs.normalMode = normalMode;
            titleBarRefs.settingMode = settingMode;

            var touchStartX = 0, touchStartY = 0, layoutStartX = 0, layoutStartY = 0, isDraggingWindow = false;
            titleBar.setOnTouchListener(new View.OnTouchListener({ onTouch: function(v, event) {
                var action = event.getAction();
                if (action === MotionEvent.ACTION_DOWN) {
                    touchStartX = event.getRawX(); touchStartY = event.getRawY();
                    layoutStartX = layoutParams.x; layoutStartY = layoutParams.y;
                    isDraggingWindow = true; return true;
                } else if (action === MotionEvent.ACTION_MOVE && isDraggingWindow) {
                    layoutParams.x = layoutStartX + (event.getRawX() - touchStartX);
                    layoutParams.y = layoutStartY + (event.getRawY() - touchStartY);
                    windowManager.updateViewLayout(mainLayout, layoutParams); return true;
                } else if (action === MotionEvent.ACTION_UP || action === MotionEvent.ACTION_CANCEL) {
                    isDraggingWindow = false; return true;
                }
                return false;
            } }));
            return titleBar;
        },

        createFontSizeDropdown: function() {
            var self = this;
            var card = new LinearLayout(appContext);
            fontSizeDropdownView = card;
            fontSizeDropdownCardView = card;
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(uiDp(4, 5), uiDp(4, 5), uiDp(4, 5), uiDp(4, 5));
            card.setBackground(createStrokeRoundRectDrawable(replicaSoftSurface20(), replicaOutline20(), isTablet ? 15 : 13, 1));
            try { card.setElevation(uiDp(8, 10)); } catch (eElevation) {}

            fontSizeOptionViews = [];
            var presets = [
                { label: "小", size: 16 },
                { label: "中", size: 20 },
                { label: "大", size: 24 },
                { label: "超大", size: 28 }
            ];
            for (var iPreset = 0; iPreset < presets.length; iPreset++) {
                (function(preset) {
                    var option = new TextView(appContext);
                    option.setTag(preset.label + "|" + preset.size);
                    option.setTextSize(uiTextSize(12, 14));
                    option.setGravity(Gravity.LEFT | Gravity.CENTER_VERTICAL);
                    option.setSingleLine(true);
                    option.setPadding(uiDp(12, 16), 0, uiDp(12, 16), 0);
                    option.setContentDescription("字号" + preset.label + "，" + preset.size + "sp");
                    option.setOnClickListener(new View.OnClickListener({ onClick: function(v) {
                        hapticFeedback(v);
                        self.updateFontSize(preset.size, false);
                        saveFontSize(preset.size);
                        updateFontSizeSelector20();
                        refreshFontSizeDropdown20();
                        try {
                            if (fontSizePopupWindow && fontSizePopupWindow.isShowing()) fontSizePopupWindow.dismiss();
                        } catch (eDismissOption) {}
                        showToast("字号已切换为" + preset.label);
                    } }));
                    applyButtonAnimation(option);
                    fontSizeOptionViews.push(option);
                    card.addView(option, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, uiDp(38, 44)));
                })(presets[iPreset]);
            }

            refreshFontSizeDropdown20();
            return card;
        },

        toggleFontSizeDropdown: function() {
            if (!fontSizeSelectorView) return false;
            try {
                if (fontSizePopupWindow && fontSizePopupWindow.isShowing()) {
                    fontSizePopupWindow.dismiss();
                    return false;
                }
                if (titleBarRefs.settingMode) titleBarRefs.settingMode.setVisibility(View.GONE);
                if (titleBarRefs.normalMode) titleBarRefs.normalMode.setVisibility(View.VISIBLE);

                var popupWidth = uiDp(136, 164);
                var content = this.createFontSizeDropdown();
                refreshFontSizeDropdown20();
                var popup = new android.widget.PopupWindow(
                    content,
                    popupWidth,
                    android.view.ViewGroup.LayoutParams.WRAP_CONTENT,
                    true
                );
                popup.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(Color.TRANSPARENT));
                popup.setOutsideTouchable(true);
                popup.setFocusable(true);
                try { popup.setElevation(uiDp(8, 10)); } catch (ePopupElevation) {}
                try { popup.setClippingEnabled(true); } catch (ePopupClip) {}
                popup.setOnDismissListener(new android.widget.PopupWindow.OnDismissListener({ onDismiss: function() {
                    if (fontSizePopupWindow === popup) fontSizePopupWindow = null;
                    fontSizeDropdownView = null;
                    fontSizeDropdownCardView = null;
                    fontSizePopupWindow = null;
                    fontSizeOptionViews = [];
                } }));
                fontSizePopupWindow = popup;

                var anchorWidth = 0;
                try { anchorWidth = fontSizeSelectorView.getWidth(); } catch (eAnchorWidth) { anchorWidth = 0; }
                var xOffset = Math.min(0, anchorWidth - popupWidth);
                popup.showAsDropDown(fontSizeSelectorView, xOffset, uiDp(6, 8));
                return true;
            } catch (eDropdown) {
                try {
                    if (fontSizePopupWindow && fontSizePopupWindow.isShowing()) fontSizePopupWindow.dismiss();
                } catch (eDismissFail) {}
                fontSizePopupWindow = null;
                fontSizeDropdownView = null;
                fontSizeDropdownCardView = null;
                fontSizeOptionViews = [];
                showToast("字号菜单打开失败");
            }
            return false;
        },

        toggleFontSizePanel: function() {
            // 旧滑杆式字号入口暂时屏蔽，代码保留供后续独立清理。
            return false;
            if (!titleBarRefs.normalMode) return;
            var isSetting = titleBarRefs.settingMode.getVisibility() === View.VISIBLE;
            if (isSetting) {
                titleBarRefs.normalMode.setVisibility(View.VISIBLE);
                titleBarRefs.settingMode.setVisibility(View.GONE);
            } else {
                titleBarRefs.normalMode.setVisibility(View.GONE);
                titleBarRefs.settingMode.setVisibility(View.VISIBLE);
                seekBar.setProgress(currentFontSize - MIN_FONT_SIZE); fontSizeLabel.setText(currentFontSize + "sp");
            }
        },

        updateFontSize: function(size, skipAdjust) {
            currentFontSize = size;
            if (fontSizeLabel) fontSizeLabel.setText(size + "sp");
            updateFontSizeSelector20();
            if (textCanvasControl) {
                textCanvasControl.setTextSize(size);
                if (!skipAdjust) this.adjustScrollViewHeight();
            }
        },

        applyScrollViewHeightNow: function() {
            if (!scrollView || !textCanvasControl) return 0;
            try {
                var contentHeight = textCanvasControl.getContentHeight();
                // contentHeight 已包含 Canvas 上下内边距，不再额外补高，确保父子高度一致。
                var adaptiveHeight = Math.min(contentHeight, textAreaHeight);
                var newHeight = Math.min(Math.max(adaptiveHeight, textAreaMinHeight), textAreaHeight);
                var params = scrollView.getLayoutParams();
                if (params.height !== newHeight) {
                    params.height = newHeight;
                    scrollView.setLayoutParams(params);
                }
                return newHeight;
            } catch (e) {}
            return 0;
        },

        adjustScrollViewHeight: function() {
            if (!scrollView || !textCanvasControl) return;
            if (pendingAdjustRunnable) { mainHandler.removeCallbacks(pendingAdjustRunnable); pendingAdjustRunnable = null; }
            var self = this;
            pendingAdjustRunnable = new java.lang.Runnable({
                run: function() {
                    pendingAdjustRunnable = null;
                    try { self.applyScrollViewHeightNow(); } catch (e) {}
                }
            });
            mainHandler.postDelayed(pendingAdjustRunnable, 50);
        },

        createPreviewBox: function() {
            var self = this;
            var previewBox = new LinearLayout(appContext);
            previewBoxView = previewBox;
            previewBox.setOrientation(LinearLayout.VERTICAL);
            previewBox.setBackground(createRoundRectDrawable(Color.TRANSPARENT, 0));
            previewBox.setPadding(0, 0, 0, 0);
            previewBox.setLayoutParams(new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

            var metaRow = new LinearLayout(appContext);
            metaRow.setOrientation(LinearLayout.HORIZONTAL);
            metaRow.setGravity(Gravity.CENTER_VERTICAL);

            countLabelView = new TextView(appContext);
            countLabelView.setTextSize(uiTextSize(12, 13));
            safeTextColor(countLabelView, Colors.text);
            countLabelView.setGravity(Gravity.LEFT | Gravity.CENTER_VERTICAL);
            setCountLabel20(0);
            var countLp = new LinearLayout.LayoutParams(0, uiDp(44, 50), 1);
            metaRow.addView(countLabelView, countLp);

            var inlineActions = new LinearLayout(appContext);
            inlineActions.setOrientation(LinearLayout.HORIZONTAL);
            inlineActions.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);

            copyAllActionBtn = createReplicaButton20("复制全部", "copy", "inline", function() { self.copyAllText(); }, null);
            cleanupActionBtn = createReplicaButton20("去重换行", "cleanup", "inline", function() { self.cleanReplicaNewlines(); }, function() { self.cleanReplicaSpaces(); });
            shareActionBtn = createReplicaButton20("分享", "share", "inline", function() { self.sharePickwordText(); }, null);
            pinActionBtn = createReplicaButton20("钉屏", "pin", "pin", function() { self.pinSelectedText(); }, null);

            inlineActions.addView(copyAllActionBtn, new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, uiDp(38, 44)));
            inlineActions.addView(createReplicaSeparator20(true));
            inlineActions.addView(cleanupActionBtn, new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, uiDp(38, 44)));
            inlineActions.addView(createReplicaSeparator20(true));
            inlineActions.addView(shareActionBtn, new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, uiDp(38, 44)));
            inlineActions.addView(createReplicaSeparator20(true));
            inlineActions.addView(pinActionBtn, new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, uiDp(40, 46)));
            metaRow.addView(inlineActions);
            previewBox.addView(metaRow);

            previewTextView = new TextView(appContext);
            previewTextView.setText("点击文字选择");
            safeTextColor(previewTextView, Colors.textSecondary);
            previewTextView.setTextSize(uiTextSize(12, 13));
            previewTextView.setLineSpacing(uiDp(1, 2), 1);
            previewTextView.setPadding(0, uiDp(8, 10), 0, uiDp(12, 14));
            previewTextView.setMaxLines(2);
            try { previewTextView.setEllipsize(android.text.TextUtils.TruncateAt.END); } catch (eEllipsize) {}
            previewTextView.setContentDescription("选中文字预览；点击编辑，长按去空格");
            previewTextView.setOnClickListener(new View.OnClickListener({ onClick: function(v) {
                if (selectedIndices.length > 0) { hapticFeedback(v); self.editPreviewText(); }
            } }));
            previewTextView.setOnLongClickListener(new View.OnLongClickListener({
                onLongClick: function(v) {
                    if (selectedIndices.length > 0) { hapticFeedback(v); self.removeSelectedSpaces(); return true; }
                    return false;
                },
                // 与按钮长按保持同一 API 34 兼容策略；业务已自行提供触觉反馈。
                onLongClickUseDefaultHapticFeedback: function(v) {
                    return false;
                }
            }));
            previewBox.addView(previewTextView, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

            resultDividerView = createReplicaSeparator20(false);
            previewBox.addView(resultDividerView);
            return previewBox;
        },

        createPrimaryBtn: function(textValue, callback) {
            return createReplicaButton20(textValue, "copy", "primary", callback, null);
        },

        createIconBtn: function(textValue, iconKind, callback) {
            return createReplicaButton20(textValue, iconKind, "outline", callback, null);
        },

        createMiniHeaderBtn: function(textValue, callback) {
            return createReplicaButton20(textValue, "cleanup", "inline", callback, null);
        },

        createSettingChipBtn: function(textValue, callback) {
            var btn = new TextView(appContext);
            btn.setText(textValue);
            safeTextColor(btn, Colors.textSecondary);
            btn.setTextSize(uiTextSize(10, 11));
            btn.setGravity(Gravity.CENTER);
            btn.setSingleLine(true);
            btn.setPadding(uiDp(7, 9), 0, uiDp(7, 9), 0);
            btn.setBackground(createPressableDrawable(Color.TRANSPARENT, alphaColor20(Colors.outline, isDark ? 46 : 28), isTablet ? 9 : 7));
            var params = new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, uiDp(34, 40));
            params.setMargins(uiDp(3, 4), 0, 0, 0);
            btn.setLayoutParams(params);
            btn.setOnClickListener(new View.OnClickListener({ onClick: function(v) { hapticFeedback(v); try { callback(); } catch (e) { showToast("操作失败"); } } }));
            applyButtonAnimation(btn);
            return btn;
        },

        createFingerPreview: function() {
            if (systemMagnifierEnabled && systemMagnifier) return; // 已创建且可用：直接复用，避免重复创建
            if (magnifierDisabledByError) return; // 已触发熔断禁用：不再尝试创建，优先保稳定
            if (forceDisableSystemMagnifier) {
                systemMagnifierEnabled = false;
                magnifierUseAdvancedShow = false;
                systemMagnifier = null;
                if (!forceDisableMagnifierToastShown) {
                    forceDisableMagnifierToastShown = true;
                    showToast("系统放大镜已手动关闭，继续使用无放大镜模式");
                }
                return;
            }
            try {
                if (!textView) return; // 文本视图不存在时无法绑定放大镜
                var sdkInt = android.os.Build.VERSION.SDK_INT;
                if (sdkInt < 28) {
                    systemMagnifierEnabled = false; // 低于 API 28 明确标记不可用
                    magnifierUseAdvancedShow = false;
                    if (!fingerPreviewCreateErrorShown) {
                        fingerPreviewCreateErrorShown = true; // 仅提示一次，避免频繁弹窗
                        showToast("系统放大镜需要 Android 9+ (API 28)"); // 告知版本门槛
                    }
                    return; // 低版本直接退出
                }
                var Magnifier = android.widget.Magnifier;
                systemMagnifier = null;
                magnifierUseAdvancedShow = false;

                // API 28 也支持 Magnifier，但 Builder/四参数 show 在部分版本/ROM 上不稳定。
                // 因此：API 29+ 且非安全模式才使用 Builder 外观参数；API 28 或安全模式走最保守构造与 show(x,y)。
                if (sdkInt >= 29 && !magnifierSafeMode) {
                    try {
                        var builder = new Magnifier.Builder(textView);
                        try { builder.setInitialZoom(FINGER_PREVIEW_ZOOM); } catch (e0) {}
                        try {
                            var baseSize = Math.round(uiDp(FINGER_PREVIEW_SIZE_DP, FINGER_PREVIEW_SIZE_DP));
                            if (baseSize > 0) {
                                var minHeightPx = Math.round(uiDp(MAGNIFIER_MIN_HEIGHT_DP, MAGNIFIER_MIN_HEIGHT_DP));
                                var minWidthExtraPx = Math.round(uiDp(MAGNIFIER_MIN_WIDTH_EXTRA_DP, MAGNIFIER_MIN_WIDTH_EXTRA_DP));
                                var magnifierHeight = Math.max(minHeightPx, Math.round(baseSize * MAGNIFIER_HEIGHT_RATIO));
                                var magnifierWidth = Math.max(magnifierHeight + minWidthExtraPx, Math.round(magnifierHeight * MAGNIFIER_WIDTH_RATIO));
                                builder.setSize(magnifierWidth, magnifierHeight);
                                try { builder.setCornerRadius(Math.round(magnifierHeight * MAGNIFIER_CORNER_RATIO)); } catch (e2) {}
                            }
                            try {
                                var offsetY = -Math.round(uiDp(FINGER_PREVIEW_OFFSET_Y_DP, FINGER_PREVIEW_OFFSET_Y_DP));
                                builder.setDefaultSourceToMagnifierOffset(0, offsetY);
                            } catch (e3) {}
                        } catch (e1) {}
                        systemMagnifier = builder.build();
                        magnifierUseAdvancedShow = true;
                    } catch (eBuilder) {
                        appendMagnifierErrorLog("CREATE_BUILDER_FALLBACK", eBuilder, "profile=" + romProfile.summary);
                        magnifierSafeMode = true;
                        systemMagnifier = null;
                        magnifierUseAdvancedShow = false;
                    }
                }

                if (!systemMagnifier) {
                    systemMagnifier = new Magnifier(textView); // API 28+ 保守路径：默认开启且兼容 Android 9
                    magnifierUseAdvancedShow = false;
                    magnifierSafeMode = true;
                }

                systemMagnifierEnabled = true; // 创建成功：标记可用
                magnifierErrorCount = 0; // 创建成功后清空异常计数（解除历史失败影响）
            } catch (e) {
                systemMagnifier = null; // 创建失败：确保实例清空
                systemMagnifierEnabled = false; // 创建失败：确保可用标记关闭
                magnifierUseAdvancedShow = false;
                magnifierSafeMode = true; // 创建异常后立即切入安全模式，后续只走保守调用
                magnifierErrorCount++; // 记录一次创建异常
                appendMagnifierErrorLog("CREATE", e, "profile=" + romProfile.summary);
                if (MAGNIFIER_AUTO_DISABLE_ON_ERROR && magnifierErrorCount >= MAGNIFIER_MAX_ERROR_COUNT) {
                    magnifierDisabledByError = true; // 达到阈值：触发熔断禁用
                }
                if (!fingerPreviewCreateErrorShown) {
                    fingerPreviewCreateErrorShown = true; // 创建失败提示仍然只弹一次
                    showToast("系统放大镜创建失败，已自动降级: " + e.message);
                }
                if (magnifierDisabledByError) {
                    showToast("系统放大镜已自动禁用，请继续使用无放大镜模式"); // 告知已进入保护态
                }
            }
        },

        showFingerPreview: function(rawX, rawY, index) {
            // 兼容旧调用签名：rawX/rawY/index 目前不直接使用，统一以 lastTouchX/lastTouchY 为准。
            try {
                this.createFingerPreview();
                if (!systemMagnifierEnabled || !systemMagnifier) return;
                var sx = lastTouchX;
                var sy = lastTouchY;
                if (sx < 0) sx = 0;
                if (sy < 0) sy = 0;
                // 关键：每次 show 都显式传入放大镜中心坐标，确保 FINGER_PREVIEW_OFFSET_Y_DP 改动立即生效
                if (magnifierUseAdvancedShow) {
                    var offsetY = -Math.round(uiDp(FINGER_PREVIEW_OFFSET_Y_DP, FINGER_PREVIEW_OFFSET_Y_DP));
                    systemMagnifier.show(sx, sy, sx, sy + offsetY);
                } else {
                    systemMagnifier.show(sx, sy);
                }
                fingerPreviewLastShownX = sx;
                fingerPreviewLastShownY = sy;
            } catch (e) {
                magnifierSafeMode = true; // 出现异常后自动切入安全模式
                magnifierUseAdvancedShow = false;
                magnifierErrorCount++; // 显示阶段异常：累计错误次数
                appendMagnifierErrorLog("SHOW", e, "x=" + sx + ",y=" + sy + ",index=" + index);
                if (MAGNIFIER_AUTO_DISABLE_ON_ERROR && magnifierErrorCount >= MAGNIFIER_MAX_ERROR_COUNT) {
                    magnifierDisabledByError = true; // 达到阈值：标记熔断禁用
                    systemMagnifierEnabled = false; // 立即关闭可用状态，阻止后续继续调用
                    try { if (systemMagnifier) systemMagnifier.dismiss(); } catch (e0) {} // 尝试收起系统放大镜窗口
                    systemMagnifier = null; // 清空实例引用，避免继续使用异常对象
                }
                var nowErr1 = Date.now(); // 记录本次异常时间
                if (nowErr1 - magnifierErrorToastLastTime >= MAGNIFIER_ERROR_TOAST_INTERVAL_MS) {
                    magnifierErrorToastLastTime = nowErr1; // 更新上次提示时间戳
                    showToast(magnifierDisabledByError ? "放大镜异常已禁用，继续无放大镜模式" : ("放大镜异常已降级: " + e.message)); // 熔断后给固定提示，未熔断则回显错误
                }
            }
        },

        updateFingerPreview: function(rawX, rawY, index, force) {
            // 兼容旧调用签名：rawX/rawY 目前不直接使用，坐标统一取 lastTouchX/lastTouchY。
            if (!systemMagnifierEnabled || !systemMagnifier) return;
            try {
                var now = Date.now();
                var previewInterval = FINGER_PREVIEW_INTERVAL;
                try {
                    if (fullText && fullText.length > INITIAL_TEXT_FAST_LIMIT) {
                        var largeInterval = parseInt(String(DIY_CONFIG.CANVAS_LARGE_TEXT_MAGNIFIER_INTERVAL_MS), 10);
                        if (!isNaN(largeInterval) && largeInterval > previewInterval) previewInterval = largeInterval;
                    }
                    if (isDragging) {
                        var dragInterval = parseInt(String(DIY_CONFIG.CANVAS_DRAG_MAGNIFIER_INTERVAL_MS), 10);
                        if (!isNaN(dragInterval) && dragInterval > previewInterval) previewInterval = dragInterval;
                    }
                } catch (eInterval) {}

                var sx = lastTouchX;
                var sy = lastTouchY;
                if (sx < 0) sx = 0;
                if (sy < 0) sy = 0;

                if (!force && isDragging) {
                    var slopPx = 0;
                    try { slopPx = dp(parseFloat(String(DIY_CONFIG.CANVAS_DRAG_MAGNIFIER_MOVE_SLOP_DP))); } catch (eSlop) { slopPx = dp(3); }
                    if (isNaN(slopPx) || slopPx < 0) slopPx = dp(3);
                    var movedEnough = Math.abs(sx - fingerPreviewLastShownX) >= slopPx || Math.abs(sy - fingerPreviewLastShownY) >= slopPx;
                    if (!movedEnough && index === fingerPreviewLastIndex) return;
                }
                if (!force && now - fingerPreviewLastUpdateTime < previewInterval) return;
                fingerPreviewLastUpdateTime = now;

                if (magnifierUseAdvancedShow) {
                    var offsetY = -Math.round(uiDp(FINGER_PREVIEW_OFFSET_Y_DP, FINGER_PREVIEW_OFFSET_Y_DP));
                    systemMagnifier.show(sx, sy, sx, sy + offsetY);
                } else {
                    systemMagnifier.show(sx, sy);
                }
                fingerPreviewLastShownX = sx;
                fingerPreviewLastShownY = sy;

                if (force || index !== fingerPreviewLastIndex || now - fingerPreviewLastContentUpdateTime >= FINGER_PREVIEW_CONTENT_INTERVAL) {
                    fingerPreviewLastIndex = index;
                    fingerPreviewLastContentUpdateTime = now;
                }
            } catch (e) {
                magnifierSafeMode = true; // 更新异常后自动切入安全模式
                magnifierUseAdvancedShow = false;
                magnifierErrorCount++; // 更新阶段异常：累计错误次数
                appendMagnifierErrorLog("UPDATE", e, "x=" + sx + ",y=" + sy + ",index=" + index + ",force=" + force);
                if (MAGNIFIER_AUTO_DISABLE_ON_ERROR && magnifierErrorCount >= MAGNIFIER_MAX_ERROR_COUNT) {
                    magnifierDisabledByError = true; // 达到阈值：标记熔断禁用
                    systemMagnifierEnabled = false; // 立即关闭可用状态，阻止继续 update/show
                    try { if (systemMagnifier) systemMagnifier.dismiss(); } catch (e0) {} // 尝试先关闭系统放大镜窗口
                    systemMagnifier = null; // 清空实例，避免后续误用
                }
                var nowErr2 = Date.now(); // 记录本次异常时间
                if (nowErr2 - magnifierErrorToastLastTime >= MAGNIFIER_ERROR_TOAST_INTERVAL_MS) {
                    magnifierErrorToastLastTime = nowErr2; // 更新时间戳，控制提示频率
                    showToast(magnifierDisabledByError ? "放大镜异常已禁用，继续无放大镜模式" : ("放大镜更新异常已降级: " + e.message)); // 根据是否熔断给不同提示文案
                }
            }
        },

        hideFingerPreview: function() {
            fingerPreviewLastIndex = -1;
            fingerPreviewLastUpdateTime = 0;
            fingerPreviewLastContentUpdateTime = 0;
            fingerPreviewLastShownX = -99999;
            fingerPreviewLastShownY = -99999;
            try {
                if (systemMagnifierEnabled && systemMagnifier) {
                    systemMagnifier.dismiss();
                }
            } catch (e) {}
        },

        removeFingerPreview: function() {
            try {
                if (systemMagnifier) {
                    systemMagnifier.dismiss();
                    systemMagnifier.destroy();
                }
            } catch (e2) {}
            systemMagnifier = null;
            systemMagnifierEnabled = false;
            magnifierUseAdvancedShow = false;
            fingerPreviewLastIndex = -1;
            fingerPreviewLastUpdateTime = 0;
            fingerPreviewLastContentUpdateTime = 0;
            fingerPreviewLastShownX = -99999;
            fingerPreviewLastShownY = -99999;
            fingerPreviewCreateErrorShown = false;
            magnifierErrorCount = 0; // 主动移除时清空异常计数，避免影响下次新会话
            magnifierDisabledByError = false; // 主动移除时解除熔断状态，允许后续重新创建
        },

        setupTextViewTouch: function() {
            var self = this;
            var longPressRunnable = null;
            var isPressed = false;
            var lastValidIndex = -1;
            var onTouch = new View.OnTouchListener({
                onTouch: function(v, event) {
                    var action = event.getAction(); var x = event.getX(); var y = event.getY();
                    var rawX = event.getRawX(); var rawY = event.getRawY();
                    var currentIndex = -1;
                    if (action === MotionEvent.ACTION_UP) currentIndex = self.getCharIndexAtPosition(x, y);

                    switch(action) {
                        case MotionEvent.ACTION_DOWN:
                            isPressed = true; isDragging = false; dragStartIndex = -1; dragSnapshot = []; dragSnapshotSet = null; dragSnapshotCount = 0; dragStartWasSelected = false; dragPendingDirtyMin = -1; dragPendingDirtyMax = -1; lastValidIndex = -1; dragSelectionCount = selectedIndices.length; lastDragVisualMin = -1; lastDragVisualMax = -1;
                            touchDownTime = Date.now(); touchDownX = x; touchDownY = y; touchDownRawX = rawX; touchDownRawY = rawY;
                            lastTouchX = x; lastTouchY = y; lastTouchRawX = rawX; lastTouchRawY = rawY;
                            if (scrollView) scrollView.requestDisallowInterceptTouchEvent(true);
                            if (longPressRunnable) mainHandler.removeCallbacks(longPressRunnable);
                            var textViewRef = textView;
                            longPressRunnable = new java.lang.Runnable({
                                run: function() {
                                    if (!isPressed || !textViewRef) return;
                                    var indexAtLongPress = self.getCharIndexAtPosition(touchDownX, touchDownY);
                                    if (indexAtLongPress < 0) {
                                        for (var offset = 10; offset <= 50; offset += 10) {
                                            if ((indexAtLongPress = self.getCharIndexAtPosition(touchDownX + offset, touchDownY)) >= 0) break;
                                            if ((indexAtLongPress = self.getCharIndexAtPosition(touchDownX - offset, touchDownY)) >= 0) break;
                                            if ((indexAtLongPress = self.getCharIndexAtPosition(touchDownX, touchDownY + offset)) >= 0) break;
                                            if ((indexAtLongPress = self.getCharIndexAtPosition(touchDownX, touchDownY - offset)) >= 0) break;
                                        }
                                    }
                                    if (indexAtLongPress < 0) return;
                                    isDragging = true; lastValidIndex = indexAtLongPress; dragStartIndex = indexAtLongPress; dragSnapshot = setToArray(selectedSet);
                                    dragSnapshotSet = rebuildSelectedSetFromIndices(dragSnapshot);
                                    dragSnapshotCount = dragSnapshot.length;
                                    dragStartWasSelected = dragSnapshotSet[dragStartIndex] === true;
                                    dragPendingDirtyMin = -1;
                                    dragPendingDirtyMax = -1;
                                    try { textViewRef.performHapticFeedback(android.view.HapticFeedbackConstants.LONG_PRESS);
                                    } catch (e) {}
                                    if (dragStartIndex >= 0) {
                                        lastDragVisualMin = dragStartIndex;
                                        lastDragVisualMax = dragStartIndex;
                                        dragSelectionCount = calcDragSelectionCount(lastDragVisualMin, lastDragVisualMax);
                                        self.updateSelectionSpans(dragStartIndex, dragStartIndex);
                                        self.updatePreviewDuringDrag();
                                        self.showFingerPreview(touchDownRawX, touchDownRawY, dragStartIndex);
                                    }
                                }
                            });
                            longPressHandler = longPressRunnable;
                            mainHandler.postDelayed(longPressRunnable, LONG_PRESS_TIME);
                            return true;

                        case MotionEvent.ACTION_MOVE:
                            if (!isPressed) return true;
                            lastTouchX = x; lastTouchY = y; lastTouchRawX = rawX; lastTouchRawY = rawY;
                            var moveIndex = self.getCharIndexAtPosition(x, y, isDragging);
                            if (moveIndex < 0 && isDragging) {
                                if (lastValidIndex >= 0) moveIndex = lastValidIndex;
                                if (moveIndex < 0) {
                                    for (var offset = 5; offset <= 40; offset += 5) {
                                        if ((moveIndex = self.getCharIndexAtPosition(x + offset, y, true)) >= 0) break;
                                        if ((moveIndex = self.getCharIndexAtPosition(x - offset, y, true)) >= 0) break;
                                        if ((moveIndex = self.getCharIndexAtPosition(x, y + offset, true)) >= 0) break;
                                        if ((moveIndex = self.getCharIndexAtPosition(x, y - offset, true)) >= 0) break;
                                    }
                                }
                            }
                            if (moveIndex >= 0) lastValidIndex = moveIndex;
                            var dx = Math.abs(x - touchDownX); var dy = Math.abs(y - touchDownY);
                            if (!isDragging && (dx > dp(TOUCH_SLOP) || dy > dp(TOUCH_SLOP))) {
                                if (longPressRunnable) { mainHandler.removeCallbacks(longPressRunnable);
                                longPressRunnable = null; longPressHandler = null; }
                                if (scrollView) scrollView.requestDisallowInterceptTouchEvent(false);
                                self.startCanvasScrollRefresh();
                            }
                            if (isDragging && moveIndex >= 0) { self.updateDragSelection(dragStartIndex, moveIndex, dragSnapshot);
                                self.updateFingerPreview(rawX, rawY, moveIndex, false);
                                self.checkAndScroll(x, y); }
                            return true;
                        case MotionEvent.ACTION_UP:
                        case MotionEvent.ACTION_CANCEL:
                            isPressed = false;
                            if (scrollView) scrollView.requestDisallowInterceptTouchEvent(false);
                            if (longPressRunnable) { mainHandler.removeCallbacks(longPressRunnable); longPressRunnable = null; longPressHandler = null;
                            }

                            if (action === MotionEvent.ACTION_UP && !isDragging && (Date.now() - touchDownTime) < LONG_PRESS_TIME && Math.abs(x - touchDownX) < dp(TOUCH_SLOP) && Math.abs(y - touchDownY) < dp(TOUCH_SLOP)) {
                                if (currentIndex >= 0) self.toggleSelection(currentIndex);
                            }

                            if (isDragging) {
                                if (pendingDragUpdate) { mainHandler.removeCallbacks(dragUpdateProcessor);
                                pendingDragUpdate = null; }
                                self.commitDragSelection();
                                self.updateSelectionSpans(lastDragVisualMin, lastDragVisualMax);
                                self.updatePreview();
                            }
                            self.stopAutoScroll();
                            self.hideFingerPreview();
                            isDragging = false; dragStartIndex = -1; dragSnapshot = []; dragSnapshotSet = null; dragSnapshotCount = 0; dragStartWasSelected = false; lastValidIndex = -1;
                            lastTouchX = 0; lastTouchY = 0; lastTouchRawX = 0; lastTouchRawY = 0;
                            lastDragEnd = -1; lastDragUpdateTime = 0; lastDragVisualMin = -1; lastDragVisualMax = -1; dragPendingDirtyMin = -1; dragPendingDirtyMax = -1; dragSelectionCount = selectedIndices.length;
                            return true;
                    }
                    return false;
                }
            });
            textView.setOnTouchListener(onTouch);
        },

        updateDragSelection: function(start, end, snapshot) {
            if (end === lastDragEnd) return;
            var oldMin = lastDragVisualMin;
            var oldMax = lastDragVisualMax;
            lastDragEnd = end;
            var currentMin = Math.min(start, end);
            var currentMax = Math.max(start, end);

            if (!dragSnapshotSet) {
                dragSnapshotSet = rebuildSelectedSetFromIndices(snapshot || []);
                dragSnapshotCount = snapshot ? snapshot.length : countSelectedSet(selectedSet);
                dragStartWasSelected = dragSnapshotSet[start] === true;
            }

            dragSelectionCount = calcDragSelectionCount(currentMin, currentMax);
            lastDragVisualMin = currentMin;
            lastDragVisualMax = currentMax;

            var dirtyMin = currentMin;
            var dirtyMax = currentMax;
            if (oldMin >= 0 && oldMax >= 0) {
                if (oldMin < dirtyMin) dirtyMin = oldMin;
                if (oldMax > dirtyMax) dirtyMax = oldMax;
            }

            if (dragPendingDirtyMin < 0 || dirtyMin < dragPendingDirtyMin) dragPendingDirtyMin = dirtyMin;
            if (dragPendingDirtyMax < 0 || dirtyMax > dragPendingDirtyMax) dragPendingDirtyMax = dirtyMax;

            var interval = DRAG_UPDATE_INTERVAL;
            try {
                var cfgInterval = parseInt(String(DIY_CONFIG.CANVAS_DRAG_HIGHLIGHT_INTERVAL_MS), 10);
                if (!isNaN(cfgInterval) && cfgInterval >= 16) interval = cfgInterval;
            } catch (eInt) {}
            if (interval < 16) interval = 16;
            if (interval > 80) interval = 80;

            var now = Date.now();
            if (now - lastDragUpdateTime < interval) {
                if (pendingDragUpdate) mainHandler.removeCallbacks(dragUpdateProcessor);
                pendingDragUpdate = true;
                mainHandler.postDelayed(dragUpdateProcessor, interval);
            } else {
                var dmin = dragPendingDirtyMin;
                var dmax = dragPendingDirtyMax;
                dragPendingDirtyMin = -1;
                dragPendingDirtyMax = -1;
                lastDragUpdateTime = now;
                this.updateSelectionSpans(dmin, dmax);
                this.updatePreviewDuringDrag();
            }
        },

        commitDragSelection: function() {
            if (!dragSnapshotSet || lastDragVisualMin < 0 || lastDragVisualMax < 0) {
                selectedIndices = setToArray(selectedSet);
                dragSelectionCount = selectedIndices.length;
                return;
            }
            var result = {};
            try {
                for (var k in dragSnapshotSet) {
                    if (Object.prototype.hasOwnProperty.call(dragSnapshotSet, k) && dragSnapshotSet[k] === true) result[k] = true;
                }
                var minIndex = lastDragVisualMin;
                var maxIndex = lastDragVisualMax;
                if (minIndex > maxIndex) { var tmp = minIndex; minIndex = maxIndex; maxIndex = tmp; }
                for (var i = minIndex; i <= maxIndex; i++) {
                    if (dragStartWasSelected) delete result[i];
                    else result[i] = true;
                }
            } catch (e) {}
            selectedSet = result;
            selectedIndices = setToArray(selectedSet);
            dragSelectionCount = selectedIndices.length;
        },

        checkAndScroll: function(touchX, touchY) {
            if (!scrollView || !isDragging || !textView) { this.stopAutoScroll();
                return; }
            lastTouchX = touchX;
            lastTouchY = touchY;
            var relativeY = touchY + textView.getTop() - scrollView.getScrollY();
            var scrollViewHeight = scrollView.getHeight();
            var topZone = scrollViewHeight * SCROLL_EDGE_TOP;
            var bottomZone = scrollViewHeight * (1 - SCROLL_EDGE_BOTTOM);

            var newDirection = 0; var newSpeed = 0;
            if (relativeY < topZone) {
                newDirection = -1;
                newSpeed = SCROLL_MIN_SPEED + (SCROLL_MAX_SPEED - SCROLL_MIN_SPEED) * ((topZone - relativeY) / topZone);
            } else if (relativeY > bottomZone) {
                newDirection = 1;
                newSpeed = SCROLL_MIN_SPEED + (SCROLL_MAX_SPEED - SCROLL_MIN_SPEED) * ((relativeY - bottomZone) / (scrollViewHeight - bottomZone));
            }

            this.currentScrollDirection = newDirection;
            this.currentScrollSpeed = newSpeed;

            if (newDirection !== 0) {
                this.startAutoScroll();
            } else {
                this.stopAutoScroll();
            }
        },

        startAutoScroll: function() {
            if (isAutoScrolling) return;
            isAutoScrolling = true;
            this.exactScrollY = scrollView.getScrollY();

            var self = this;
            autoScrollRunnable = new java.lang.Runnable({
                run: function() {
                    if (!isDragging || !isAutoScrolling || !scrollView || self.currentScrollDirection === 0) {
                        isAutoScrolling = false; return;
                    }

                    var maxScroll = Math.max(0, textView.getHeight() - scrollView.getHeight());

                    // 完美的浮点累加滚动像素，适配不同的手机帧率
                    var step = dp(self.currentScrollSpeed) * 0.4;

                    if (self.currentScrollDirection < 0) {
                        self.exactScrollY -= step;
                    } else {
                        self.exactScrollY += step;
                    }

                    if (self.exactScrollY < 0) self.exactScrollY = 0;
                    if (self.exactScrollY > maxScroll) self.exactScrollY = maxScroll;

                    var newIntY = Math.round(self.exactScrollY);
                    var currentIntY = scrollView.getScrollY();

                    if (newIntY !== currentIntY) {
                        scrollView.scrollTo(0, newIntY);
                        try { if (textCanvasControl) textCanvasControl.invalidateVisible(); } catch (eInv) {}
                        self.startCanvasScrollRefresh();
                        var moveIndex = self.getCharIndexAtPosition(lastTouchX, lastTouchY, true);
                        if (moveIndex >= 0 && dragStartIndex >= 0) {
                            self.updateDragSelection(dragStartIndex, moveIndex, dragSnapshot);
                            self.updateFingerPreview(lastTouchRawX, lastTouchRawY, moveIndex, false);
                        }
                    }

                    if (self.exactScrollY > 0 && self.exactScrollY < maxScroll) {
                        mainHandler.postDelayed(autoScrollRunnable, DIY_CONFIG.SCROLL_DELAY_MS);
                    } else {
                        isAutoScrolling = false;
                    }
                }
            });
            mainHandler.postDelayed(autoScrollRunnable, DIY_CONFIG.SCROLL_DELAY_MS);
        },

        stopAutoScroll: function() {
            isAutoScrolling = false;
            this.currentScrollDirection = 0;
            if (autoScrollRunnable) {
                mainHandler.removeCallbacks(autoScrollRunnable);
                autoScrollRunnable = null;
            }
        },

        getCharIndexAtPosition: function(x, y, useCachedLayout) {
            if (!textCanvasControl || !fullText || fullText.length === 0) return -1;
            try {
                var offset = textCanvasControl.getCharIndexAt(x, y);
                if (offset < 0) return -1;
                if (offset >= fullText.length) offset = fullText.length - 1;
                return offset;
            } catch (e) { return -1; }
        },

        toggleSelection: function(index) {
            if (textView) hapticFeedback(textView);
            if (selectedSet[index]) this.removeFromSelection(index); else this.addToSelection(index);
        },

        addToSelection: function(index) {
            if (index < 0 || index >= fullText.length || selectedSet[index]) return;
            selectedSet[index] = true; selectedIndices = setToArray(selectedSet); dragSelectionCount = selectedIndices.length; this.updateSelectionSpans(index, index); this.updatePreview();
        },

        removeFromSelection: function(index) {
            if (index < 0 || index >= fullText.length || !selectedSet[index]) return;
            delete selectedSet[index]; selectedIndices = setToArray(selectedSet); dragSelectionCount = selectedIndices.length; this.updateSelectionSpans(index, index); this.updatePreview();
        },

        // Canvas 文本区：选区高亮由 onDraw 根据 selectedSet 自绘。
        updateSelectionSpans: function(startIndex, endIndex) {
            try {
                if (textCanvasControl) {
                    if (startIndex !== undefined && endIndex !== undefined && startIndex !== null && endIndex !== null && startIndex >= 0 && endIndex >= 0) {
                        textCanvasControl.invalidateCharRange(startIndex, endIndex);
                    } else {
                        textCanvasControl.invalidateVisible();
                    }
                }
            } catch (e) {}
        },

        updateTextView: function(skipAdjust) {
                if (textCanvasControl) {
                textCanvasControl.setText(fullText);
            }
            dragSelectionCount = selectedIndices.length;
            this.updatePreview();
            if (!skipAdjust) this.adjustScrollViewHeight();
        },

        collectSelectedRanges: function() {
            if (selectedIndices.length === 0) return [];
            var sorted = selectedIndices.slice(0).sort(function(a, b) { return a - b; });
            var ranges = [];
            var start = sorted[0];
            var end = sorted[0] + 1;
            for (var i = 1; i < sorted.length; i++) {
                var idx = sorted[i];
                if (idx === end) {
                    end = idx + 1;
                } else {
                    ranges.push({ start: start, end: end, text: fullText.substring(start, end) });
                    start = idx;
                    end = idx + 1;
                }
            }
            ranges.push({ start: start, end: end, text: fullText.substring(start, end) });
            return ranges;
        },

                        getPreviewSelectionSignature: function() {
            if (selectedIndices.length === 0) return "";
            var sorted = selectedIndices.slice(0).sort(function(a, b) { return a - b; });
            return String(fullText.length) + ":" + sorted.join(",");
        },

        getSelectedTextRaw: function() {
            var ranges = this.collectSelectedRanges();
            if (ranges.length === 0) return "";
            var parts = [];
            for (var i = 0; i < ranges.length; i++) {
                parts.push(ranges[i].text);
            }
            return parts.join("\n");
        },

        getSelectedText: function() {
            var sig = this.getPreviewSelectionSignature();
            if (previewTextOverride !== null && sig !== "" && sig === previewSelectionSignature) return String(previewTextOverride);
            return this.getSelectedTextRaw();
        },

        hasPreviewTextOverride: function() {
            var sig = this.getPreviewSelectionSignature();
            return previewTextOverride !== null && sig !== "" && sig === previewSelectionSignature;
        },

        collectSelectedUnionRange: function() {
            var ranges = this.collectSelectedRanges();
            if (ranges.length === 0) return null;
            var start = ranges[0].start;
            var end = ranges[ranges.length - 1].end;
            return { start: start, end: end, text: fullText.substring(start, end), ranges: ranges };
        },

        splitRangeTextForTranslate: function(text) {
            var raw = String(text == null ? "" : text);
            var prefix = "";
            var suffix = "";
            while (raw.length > 0) {
                var first = raw.charAt(0);
                if (first === "\r" || first === "\n") {
                    prefix += first;
                    raw = raw.substring(1);
                } else {
                    break;
                }
            }
            while (raw.length > 0) {
                var last = raw.charAt(raw.length - 1);
                if (last === "\r" || last === "\n") {
                    suffix = last + suffix;
                    raw = raw.substring(0, raw.length - 1);
                } else {
                    break;
                }
            }
            return { prefix: prefix, core: raw, suffix: suffix };
        },

        buildTranslatedRangeText: function(parts, translatedText) {
            var core = String(translatedText == null ? "" : translatedText);
            return String(parts.prefix || "") + core + String(parts.suffix || "");
        },

        getLineBreakAfterRange: function(range) {
            if (!range || range.end >= fullText.length) return "";
            var first = fullText.charAt(range.end);
            if (first === "\r") {
                if (range.end + 1 < fullText.length && fullText.charAt(range.end + 1) === "\n") return "\r\n";
                return "\r";
            }
            if (first === "\n") return "\n";
            return "";
        },

        prepareRangeForTranslate: function(range) {
            var parts = this.splitRangeTextForTranslate(range.text);
            var structuralSuffix = "";
            if (!parts.suffix) structuralSuffix = this.getLineBreakAfterRange(range);
            range.translateParts = parts;
            range.textToTranslate = parts.core;
            range.replaceEnd = range.end + structuralSuffix.length;
            range.structuralSuffix = structuralSuffix;
        },

        cloneSelectedSet: function(srcSet) {
            var copy = {};
            for (var k in srcSet) {
                if (srcSet.hasOwnProperty(k) && srcSet[k]) copy[k] = true;
            }
            return copy;
        },

        getTopCleanUndoState: function() {
            while (cleanUndoStack.length > 0) {
                var state = cleanUndoStack[cleanUndoStack.length - 1];
                if (!state) { cleanUndoStack.pop(); continue; }
                if (state.scope === "preview") {
                    var sig = "";
                    try { sig = this.getPreviewSelectionSignature(); } catch (e0) { sig = ""; }
                    if (state.selectionSignature !== sig) { cleanUndoStack.pop(); continue; }
                }
                return state;
            }
            return null;
        },

        pushCleanUndoState: function(state) {
            if (!state) return;
            cleanUndoStack.push(state);
            if (cleanUndoStack.length > 20) cleanUndoStack.shift();
        },

        clearCleanUndoStack: function(scope) {
            if (!scope) {
                cleanUndoStack = [];
                return;
            }
            var kept = [];
            for (var i = 0; i < cleanUndoStack.length; i++) {
                if (cleanUndoStack[i] && cleanUndoStack[i].scope !== scope) kept.push(cleanUndoStack[i]);
            }
            cleanUndoStack = kept;
        },

        updateCleanButtons: function() {
            var previewSig = "";
            try { previewSig = this.getPreviewSelectionSignature(); } catch (e0) { previewSig = ""; }
            var hasPreviewSelection = selectedIndices.length > 0;
            var hasLoadedText = fullText && fullText.length > 0;
            this.updateCleanButtonView(loadedRemoveSpaceBtn, "loaded", "spaces", "去空格", hasLoadedText, false);
            this.updateCleanButtonView(loadedRemoveNewlineBtn, "loaded", "newlines", "去换行", hasLoadedText, false);
            this.updateCleanButtonView(previewRemoveSpaceBtn, "preview", "spaces", "去空格", hasPreviewSelection, true, previewSig);
            this.updateCleanButtonView(previewRemoveNewlineBtn, "preview", "newlines", "去换行", hasPreviewSelection, true, previewSig);
            if (previewEditBtn) {
                try {
                    previewEditBtn.setText("编辑");
                    previewEditBtn.setEnabled(!!hasPreviewSelection);
                    previewEditBtn.setAlpha(hasPreviewSelection ? 1.0 : 0.45);
                    safeTextColor(previewEditBtn, Colors.onPrimary);
                } catch (eEditBtn) {}
            }
        },

        updateCleanButtonView: function(btn, scope, mode, normalText, enabled, isPreview, previewSig) {
            if (!btn) return;
            try {
                var topState = this.getTopCleanUndoState();
                var isUndo = !!topState && topState.scope === scope && topState.mode === mode;
                if (isUndo && scope === "preview" && topState.selectionSignature !== previewSig) isUndo = false;
                btn.setText(isUndo ? "↶ 撤销" : normalText);
                btn.setEnabled(!!enabled || isUndo);
                btn.setAlpha((enabled || isUndo) ? 1.0 : 0.45);
                if (isUndo) safeTextColor(btn, Colors.success);
                else safeTextColor(btn, isPreview ? Colors.onPrimary : Colors.textSecondary);
            } catch (e) {}
        },

        isCleanUndoTarget: function(scope, mode) {
            var topState = this.getTopCleanUndoState();
            if (!topState || topState.scope !== scope || topState.mode !== mode) return false;
            if (scope === "preview" && topState.selectionSignature !== this.getPreviewSelectionSignature()) return false;
            return true;
        },

        undoLastClean: function() {
            var state = this.getTopCleanUndoState();
            if (!state) {
                return;
            }
            var self = this;
            try {
                cleanUndoStack.pop();
                if (state.scope === "preview") {
                    if (state.selectionSignature !== this.getPreviewSelectionSignature()) {
                        this.updateCleanButtons();
                        return;
                    }
                    previewTextOverride = state.previewTextOverride;
                    previewSelectionSignature = state.previewSelectionSignature || this.getPreviewSelectionSignature();
                    this.updatePreview();
                    this.updateCleanButtons();
                    return;
                }
                if (state.scope === "loaded") {
                    fullText = state.fullText;
                    originalFullText = state.originalFullText;
                    isPartialTextLoaded = !!state.isPartialTextLoaded;
                    selectedIndices = state.selectedIndices ? state.selectedIndices.slice(0) : [];
                    selectedSet = this.cloneSelectedSet(state.selectedSet || rebuildSelectedSetFromIndices(selectedIndices));
                    previewTextOverride = state.previewTextOverride;
                    previewSelectionSignature = state.previewSelectionSignature || "";
                    runUi(function() {
                        try {
                            self.updateTextView();
                            self.updateSelectionSpans();
                            self.adjustScrollViewHeight();
                            if (scrollView) scrollView.scrollTo(0, state.scrollY || 0);
                            self.updateActionButtons();
                            self.updateCleanButtons();
                        } catch (e1) {
                        }
                    });
                    return;
                }
            } catch (e) {
            }
        },

        setActionEnabled: function(view, enabled) {
            if (!view) return;
            try { view.setEnabled(enabled); view.setAlpha(enabled ? 1.0 : 0.45); } catch (e) {}
        },

        updateActionButtons: function() {
            var hasSelection = (isDragging ? dragSelectionCount : selectedIndices.length) > 0;
            var hasText = !!(fullText && fullText.length > 0);
            var hasUndo = !!lastTranslationState;
            setReplicaButtonText20(translateActionBtn, hasUndo ? "撤销翻译" : "翻译");
            this.setActionEnabled(copyActionBtn, hasSelection);
            this.setActionEnabled(translateActionBtn, hasSelection || hasUndo);
            this.setActionEnabled(selectAllActionBtn, hasText);
            this.setActionEnabled(clearActionBtn, hasSelection);
            this.setActionEnabled(copyAllActionBtn, hasText);
            this.setActionEnabled(cleanupActionBtn, hasText);
            this.setActionEnabled(shareActionBtn, hasSelection || hasText);
            this.setActionEnabled(pinActionBtn, hasSelection);
            this.updateCleanButtons();
        },

        applyReplacementsToText: function(sourceText, replacements) {
            var result = String(sourceText == null ? "" : sourceText);
            for (var i = replacements.length - 1; i >= 0; i--) {
                var item = replacements[i];
                var start = item.start;
                var end = item.end;
                if (start < 0) start = 0;
                if (end < start) end = start;
                if (start > result.length) start = result.length;
                if (end > result.length) end = result.length;
                result = result.substring(0, start) + String(item.translatedText == null ? "" : item.translatedText) + result.substring(end);
            }
            return result;
        },

        replaceSelectedRanges: function(replacements) {
            if (!replacements || replacements.length === 0) return false;
            var oldFullText = fullText;
            var oldOriginalFullText = originalFullText;
            var oldSelectedIndices = selectedIndices.slice(0);
            var oldSelectedSet = this.cloneSelectedSet(selectedSet);
            var oldScrollY = 0;
            try { if (scrollView) oldScrollY = scrollView.getScrollY(); } catch (e0) { oldScrollY = 0; }
            var oldIsPartialTextLoaded = isPartialTextLoaded;

            lastTranslationState = {
                fullText: oldFullText,
                originalFullText: oldOriginalFullText,
                selectedIndices: oldSelectedIndices,
                selectedSet: oldSelectedSet,
                scrollY: oldScrollY,
                isPartialTextLoaded: oldIsPartialTextLoaded
            };

            fullText = this.applyReplacementsToText(oldFullText, replacements);
            originalFullText = this.applyReplacementsToText(oldOriginalFullText || oldFullText, replacements);
            selectedIndices = [];
            selectedSet = {};
            previewTextOverride = null;
            previewSelectionSignature = "";
            cleanUndoStack = [];

            var shift = 0;
            for (var i = 0; i < replacements.length; i++) {
                var item = replacements[i];
                var newStart = item.start + shift;
                var replacement = String(item.translatedText == null ? "" : item.translatedText);
                var selectedLen = replacement.length;
                if (item.selectedTextLength !== undefined && item.selectedTextLength !== null) selectedLen = item.selectedTextLength;
                if (selectedLen < 0) selectedLen = 0;
                if (selectedLen > replacement.length) selectedLen = replacement.length;
                for (var j = 0; j < selectedLen; j++) {
                    selectedIndices.push(newStart + j);
                    selectedSet[newStart + j] = true;
                }
                shift += replacement.length - (item.end - item.start);
            }
            selectedIndices.sort(function(a, b) { return a - b; });

            var self = this;
            runUi(function() {
                try {
                    self.updateTextView();
                    self.updateSelectionSpans();
                    self.adjustScrollViewHeight();
                    self.updateActionButtons();
                } catch (e) {
                    showToast("替换失败");
                }
            });
            return true;
        },

        replaceSelectedText: function(newText) {
            var ranges = this.collectSelectedRanges();
            if (ranges.length === 0) return false;
            var replacements = [];
            for (var i = 0; i < ranges.length; i++) {
                replacements.push({ start: ranges[i].start, end: ranges[i].end, translatedText: String(newText == null ? "" : newText) });
            }
            return this.replaceSelectedRanges(replacements);
        },

        undoLastTranslation: function() {
            if (!lastTranslationState) { showToast("没有可撤销内容");
            return; }
            fullText = lastTranslationState.fullText;
            originalFullText = lastTranslationState.originalFullText;
            isPartialTextLoaded = !!lastTranslationState.isPartialTextLoaded;
            selectedIndices = lastTranslationState.selectedIndices.slice(0);
            selectedSet = this.cloneSelectedSet(lastTranslationState.selectedSet || rebuildSelectedSetFromIndices(selectedIndices));
            var restoreScrollY = lastTranslationState.scrollY || 0;
            lastTranslationState = null;
            var self = this;
            runUi(function() {
                try {
                    self.updateTextView();
                    self.updateSelectionSpans();
                    self.adjustScrollViewHeight();
                    if (scrollView) {
                        scrollView.post(new java.lang.Runnable({ run: function() { try { scrollView.scrollTo(0, restoreScrollY); } catch (e1) {} } }));
                    }
                    self.updateActionButtons();
                    showToast("已撤销");
                } catch (e) {}
            });
        },

        updatePreviewDuringDrag: function() {
            var count = isDragging ? dragSelectionCount : selectedIndices.length;
            setCountLabel20(count);
            this.updateActionButtons();
            try {
                if (previewTextView) {
                    if (count > 0) {
                        previewTextView.setText("正在拖选…已选 " + count + " 字，松手后显示预览");
                        safeTextColor(previewTextView, Colors.textSecondary);
                    } else {
                        previewTextView.setText("点击文字选择");
                        safeTextColor(previewTextView, Colors.textSecondary);
                    }
                }
            } catch (e) {}
        },

        updatePreview: function() {
            var count = selectedIndices.length;
            setCountLabel20(count);
            this.updateActionButtons();
            if (count === 0) {
                previewTextOverride = null;
                previewSelectionSignature = "";
                this.clearCleanUndoStack("preview");
                this.updateCleanButtons();
                if (isPartialTextLoaded) previewTextView.setText("长文本自动加载中，先显示前" + fullText.length + "字…");
                else previewTextView.setText("点击文字选择");
                safeTextColor(previewTextView, Colors.textSecondary);
                return;
            }

            var sig = this.getPreviewSelectionSignature();
            if (previewTextOverride !== null && sig === previewSelectionSignature) {
                previewTextView.setText(String(previewTextOverride));
                safeTextColor(previewTextView, Colors.text);
                return;
            }
            previewTextOverride = null;
            previewSelectionSignature = sig;
            this.clearCleanUndoStack("preview");
            previewTextView.setText(this.getSelectedTextRaw());
            safeTextColor(previewTextView, Colors.text);
        },

        editPreviewText: function() {
            var self = this;
            try {
                if (selectedIndices.length === 0) return;
                var sig = this.getPreviewSelectionSignature();
                var oldText = this.getSelectedText();
                runUi(function() {
                    try {
                        var dialogContext = appContext;
                        try { if (typeof context !== 'undefined' && context != null) dialogContext = context; } catch (eCtx) {}
                        var dialog = new android.app.Dialog(dialogContext);
                        try { dialog.requestWindowFeature(android.view.Window.FEATURE_NO_TITLE); } catch (eFeature) {}

                        var root = new LinearLayout(appContext);
                        root.setOrientation(LinearLayout.VERTICAL);
                        root.setPadding(uiDp(14, 18), uiDp(12, 16), uiDp(14, 18), uiDp(12, 16));
                        root.setBackground(createRoundRectDrawable(Colors.surface, isTablet ? 18 : 14));
                        try { root.setElevation(uiDp(3, 4)); } catch (eElev) {}

                        var header = new LinearLayout(appContext);
                        header.setOrientation(LinearLayout.HORIZONTAL);
                        header.setGravity(Gravity.CENTER_VERTICAL);
                        header.setPadding(0, 0, 0, uiDp(10, 12));

                        var icon = new TextView(appContext);
                        icon.setText("✎");
                        icon.setGravity(Gravity.CENTER);
                        icon.setTextSize(uiTextSize(16, 18));
                        safeTextColor(icon, Colors.onPrimary);
                        icon.setBackground(createRoundRectDrawable(Colors.btnPrimaryBg, isTablet ? 13 : 11));
                        var iconLp = new LinearLayout.LayoutParams(uiDp(32, 38), uiDp(32, 38));
                        iconLp.setMargins(0, 0, uiDp(10, 12), 0);
                        icon.setVisibility(View.GONE);

                        var titleWrap = new LinearLayout(appContext);
                        titleWrap.setOrientation(LinearLayout.VERTICAL);
                        titleWrap.setGravity(Gravity.CENTER_VERTICAL);
                        titleWrap.setLayoutParams(new LinearLayout.LayoutParams(0, LayoutParams.WRAP_CONTENT, 1));

                        var title = new TextView(appContext);
                        title.setText("编辑预览文字");
                        safeTextColor(title, Colors.text);
                        title.setTextSize(uiTextSize(16, 18));
                        try { title.setTypeface(null, android.graphics.Typeface.BOLD); } catch (eType) {}
                        titleWrap.addView(title);

                        var subtitle = new TextView(appContext);
                        subtitle.setText("仅修改预览结果，原文保持不变");
                        safeTextColor(subtitle, Colors.textSecondary);
                        subtitle.setTextSize(uiTextSize(11, 12));
                        subtitle.setPadding(0, uiDp(2, 3), 0, 0);
                        titleWrap.addView(subtitle);
                        header.addView(titleWrap);
                        root.addView(header);

                        var inputCard = new LinearLayout(appContext);
                        inputCard.setOrientation(LinearLayout.VERTICAL);
                        inputCard.setPadding(uiDp(10, 12), uiDp(8, 10), uiDp(10, 12), uiDp(8, 10));
                        inputCard.setBackground(createRoundRectDrawable(Colors.surfaceVariant, isTablet ? 12 : 10));

                        var edit = new android.widget.EditText(appContext);
                        edit.setText(String(oldText == null ? "" : oldText));
                        edit.setTextSize(uiTextSize(14, 16));
                        safeTextColor(edit, Colors.text);
                        try { toolhubSafeSetHintTextColor(edit, safeColorStateList(Colors.textSecondary)); } catch (eHint) {}
                        edit.setGravity(Gravity.TOP | Gravity.START);
                        edit.setMinLines(5);
                        edit.setMaxLines(10);
                        edit.setSingleLine(false);
                        try { edit.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE | android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES); } catch (eInput) {}
                        edit.setPadding(0, 0, 0, 0);
                        try { toolhubSafeSetBackgroundColor(edit, Color.TRANSPARENT); } catch (eBg) {}
                        var editLp = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, uiDp(150, 210));
                        inputCard.addView(edit, editLp);

                        var metaRow = new LinearLayout(appContext);
                        metaRow.setOrientation(LinearLayout.HORIZONTAL);
                        metaRow.setGravity(Gravity.CENTER_VERTICAL);
                        metaRow.setPadding(0, uiDp(8, 10), 0, 0);
                        var hint = new TextView(appContext);
                        hint.setText("编辑撤销在此区域操作");
                        safeTextColor(hint, Colors.textTertiary);
                        hint.setTextSize(uiTextSize(10, 11));
                        hint.setLayoutParams(new LinearLayout.LayoutParams(0, LayoutParams.WRAP_CONTENT, 1));
                        metaRow.addView(hint);
                        var editUndoBtn = new TextView(appContext);
                        editUndoBtn.setText("↶ 撤销编辑");
                        editUndoBtn.setGravity(Gravity.CENTER);
                        editUndoBtn.setTextSize(uiTextSize(10, 11));
                        editUndoBtn.setPadding(uiDp(8, 10), uiDp(3, 4), uiDp(8, 10), uiDp(3, 4));
                        var editUndoState = self.isCleanUndoTarget("preview", "edit");
                        safeTextColor(editUndoBtn, editUndoState ? Colors.success : Colors.textTertiary);
                        editUndoBtn.setAlpha(editUndoState ? 1.0 : 0.45);
                        editUndoBtn.setBackground(createRoundRectDrawable(editUndoState ? Colors.primaryLight : Colors.btnSecondaryBg, isTablet ? 12 : 10));
                        editUndoBtn.setEnabled(editUndoState);
                        var undoLp = new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
                        undoLp.setMargins(0, 0, uiDp(6, 8), 0);
                        metaRow.addView(editUndoBtn, undoLp);
                        var countChip = new TextView(appContext);
                        countChip.setText(String(oldText == null ? "" : oldText).length + " 字");
                        safeTextColor(countChip, Colors.primary);
                        countChip.setTextSize(uiTextSize(10, 11));
                        countChip.setGravity(Gravity.CENTER);
                        countChip.setPadding(uiDp(8, 10), uiDp(3, 4), uiDp(8, 10), uiDp(3, 4));
                        countChip.setBackground(createRoundRectDrawable(Colors.primaryLight, isTablet ? 12 : 10));
                        metaRow.addView(countChip);
                        inputCard.addView(metaRow);
                        try {
                            edit.addTextChangedListener(new android.text.TextWatcher({
                                beforeTextChanged: function(s, start, count, after) {},
                                onTextChanged: function(s, start, before, count) {
                                    try { countChip.setText(String(edit.getText().toString()).length + " 字"); } catch (eCount) {}
                                },
                                afterTextChanged: function(s) {}
                            }));
                        } catch (eWatch) {}
                        editUndoBtn.setOnClickListener(new View.OnClickListener({ onClick: function(v) {
                            hapticFeedback(v);
                            try {
                                if (!self.isCleanUndoTarget("preview", "edit")) return;
                                self.undoLastClean();
                                var restoredText = String(self.getSelectedText());
                                edit.setText(restoredText);
                                try { countChip.setText(restoredText.length + " 字"); } catch (eCount2) {}
                                editUndoBtn.setEnabled(false);
                                editUndoBtn.setAlpha(0.45);
                                safeTextColor(editUndoBtn, Colors.textTertiary);
                                editUndoBtn.setBackground(createRoundRectDrawable(Colors.btnSecondaryBg, isTablet ? 12 : 10));
                            } catch (eUndoEdit) {}
                        } }));
                        applyButtonAnimation(editUndoBtn);

                        var inputLp = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
                        inputLp.setMargins(0, 0, 0, uiDp(12, 14));
                        root.addView(inputCard, inputLp);

                        var row = new LinearLayout(appContext);
                        row.setOrientation(LinearLayout.HORIZONTAL);
                        row.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);

                        var cancelBtn = new TextView(appContext);
                        cancelBtn.setText("取消");
                        cancelBtn.setGravity(Gravity.CENTER);
                        cancelBtn.setTextSize(uiTextSize(12, 13));
                        safeTextColor(cancelBtn, Colors.textSecondary);
                        cancelBtn.setPadding(uiDp(14, 18), uiDp(7, 9), uiDp(14, 18), uiDp(7, 9));
                        cancelBtn.setBackground(createPressableDrawable(Colors.btnSecondaryBg, Colors.btnSecondaryPressed, isTablet ? 14 : 12));
                        cancelBtn.setOnClickListener(new View.OnClickListener({ onClick: function(v) { hapticFeedback(v); try { dialog.dismiss(); } catch (eCancel) {} } }));
                        applyButtonAnimation(cancelBtn);

                        var saveBtn = new TextView(appContext);
                        saveBtn.setText("保存");
                        saveBtn.setGravity(Gravity.CENTER);
                        saveBtn.setTextSize(uiTextSize(12, 13));
                        try { saveBtn.setTypeface(null, android.graphics.Typeface.BOLD); } catch (eType2) {}
                        safeTextColor(saveBtn, Colors.onPrimary);
                        saveBtn.setPadding(uiDp(16, 20), uiDp(7, 9), uiDp(16, 20), uiDp(7, 9));
                        saveBtn.setBackground(createPressableDrawable(Colors.btnPrimaryBg, Colors.btnPrimaryPressed, isTablet ? 14 : 12));
                        saveBtn.setOnClickListener(new View.OnClickListener({ onClick: function(v) {
                            hapticFeedback(v);
                            try {
                                var newText = String(edit.getText().toString());
                                var currentText = String(self.getSelectedText());
                                if (newText !== currentText) {
                                    self.pushCleanUndoState({
                                        scope: "preview",
                                        mode: "edit",
                                        selectionSignature: sig,
                                        previewTextOverride: previewTextOverride,
                                        previewSelectionSignature: previewSelectionSignature
                                    });
                                    previewTextOverride = newText;
                                    previewSelectionSignature = sig;
                                    if (previewTextView) {
                                        previewTextView.setText(newText);
                                        safeTextColor(previewTextView, Colors.text);
                                    }
                                    self.updateCleanButtons();
                                }
                                dialog.dismiss();
                            } catch (eSave) {
                                try { dialog.dismiss(); } catch (eDismiss) {}
                            }
                        } }));
                        applyButtonAnimation(saveBtn);

                        var cancelLp = new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
                        cancelLp.setMargins(0, 0, uiDp(8, 10), 0);
                        row.addView(cancelBtn, cancelLp);
                        row.addView(saveBtn);
                        root.addView(row);

                        dialog.setContentView(root);
                        try {
                            var win = dialog.getWindow();
                            if (win) {
                                win.setType(LayoutParams.TYPE_APPLICATION_OVERLAY);
                                win.setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE | android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
                                win.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(Color.TRANSPARENT));
                            }
                        } catch (eWin0) {}
                        dialog.show();
                        try {
                            var win2 = dialog.getWindow();
                            if (win2) {
                                win2.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(Color.TRANSPARENT));
                                win2.setDimAmount(0.28);
                                win2.addFlags(android.view.WindowManager.LayoutParams.FLAG_DIM_BEHIND);
                                win2.setLayout(Math.min(screenWidth - uiDp(36, 56), uiDp(350, 480)), LayoutParams.WRAP_CONTENT);
                            }
                        } catch (eWin1) {}
                        try { edit.requestFocus(); } catch (eFocus) {}
                    } catch (eDialog) {
                    }
                });
            } catch (e) {
            }
        },

        transformTextByMode: function(source, mode) {
            var text = String(source == null ? "" : source);
            if (mode === "spaces") return text.replace(/[ \t\f\v\u00A0\u3000]+/g, "");
            if (mode === "newlines") return text.replace(/[\r\n]+/g, "");
            return text;
        },

        getTransformLabel: function(mode) {
            if (mode === "spaces") return "空格";
            if (mode === "newlines") return "换行";
            return "文本";
        },

        applyPreviewTextTransform: function(mode) {
            try {
                if (this.isCleanUndoTarget("preview", mode)) {
                    this.undoLastClean();
                    return;
                }
                if (selectedIndices.length === 0) {
                    return;
                }
                var beforeOverride = previewTextOverride;
                var beforeSignature = previewSelectionSignature;
                var currentSignature = this.getPreviewSelectionSignature();
                var source = this.getSelectedText();
                var transformed = this.transformTextByMode(source, mode);
                var label = this.getTransformLabel(mode);
                var removed = source.length - transformed.length;
                if (removed <= 0) {
                    return;
                }
                this.pushCleanUndoState({
                    scope: "preview",
                    mode: mode,
                    selectionSignature: currentSignature,
                    previewTextOverride: beforeOverride,
                    previewSelectionSignature: beforeSignature
                });
                previewTextOverride = transformed;
                previewSelectionSignature = currentSignature;
                if (previewTextView) {
                    previewTextView.setText(transformed);
                    safeTextColor(previewTextView, Colors.text);
                }
                this.updateCleanButtons();
            } catch (e) {
            }
        },

        applyLoadedTextTransform: function(mode) {
            var self = this;
            try {
                if (this.isCleanUndoTarget("loaded", mode)) {
                    this.undoLastClean();
                    return;
                }
                var oldFullText = fullText;
                var oldOriginalFullText = originalFullText;
                var oldSelectedIndices = selectedIndices.slice(0);
                var oldSelectedSet = this.cloneSelectedSet(selectedSet);
                var oldScrollY = 0;
                try { if (scrollView) oldScrollY = scrollView.getScrollY(); } catch (eScroll) { oldScrollY = 0; }
                var oldIsPartialTextLoaded = isPartialTextLoaded;
                var oldPreviewTextOverride = previewTextOverride;
                var oldPreviewSelectionSignature = previewSelectionSignature;
                var source = String(originalFullText || fullText || "");
                var beforeLen = source.length;
                var transformed = this.transformTextByMode(source, mode);
                var label = this.getTransformLabel(mode);
                if (mode !== "spaces" && mode !== "newlines") return;
                var removed = beforeLen - transformed.length;
                if (removed <= 0) {
                    return;
                }
                this.pushCleanUndoState({
                    scope: "loaded",
                    mode: mode,
                    fullText: oldFullText,
                    originalFullText: oldOriginalFullText,
                    selectedIndices: oldSelectedIndices,
                    selectedSet: oldSelectedSet,
                    scrollY: oldScrollY,
                    isPartialTextLoaded: oldIsPartialTextLoaded,
                    previewTextOverride: oldPreviewTextOverride,
                    previewSelectionSignature: oldPreviewSelectionSignature
                });
                if (pendingFullTextRunnable) {
                    try { mainHandler.removeCallbacks(pendingFullTextRunnable); } catch (e0) {}
                    pendingFullTextRunnable = null;
                }
                originalFullText = transformed;
                fullText = transformed;
                isPartialTextLoaded = false;
                selectedIndices = [];
                selectedSet = {};
                previewTextOverride = null;
                previewSelectionSignature = "";
                lastTranslationState = null;
                runUi(function() {
                    try {
                        self.updateTextView();
                        self.updateActionButtons();
                        self.updateCleanButtons();
                        self.adjustScrollViewHeight();
                        if (scrollView) scrollView.scrollTo(0, 0);
                    } catch (e1) {
                    }
                });
            } catch (e) {
            }
        },

        removeSelectedSpaces: function() {
            this.applyPreviewTextTransform("spaces");
        },

        removeSelectedNewlines: function() {
            this.applyPreviewTextTransform("newlines");
        },

        removeLoadedSpaces: function() {
            this.applyLoadedTextTransform("spaces");
        },

        removeLoadedNewlines: function() {
            this.applyLoadedTextTransform("newlines");
        },

        selectAll: function() {
            selectedSet = {};
            selectedIndices = [];
            for (var i = 0; i < fullText.length; i++) { selectedSet[i] = true; selectedIndices.push(i);
            }
            this.updateSelectionSpans(); this.updatePreview();
            showToast("已全选 " + selectedIndices.length + " 个字");
        },

        clear: function() {
            selectedIndices = [];
            selectedSet = {};
            previewTextOverride = null;
            previewSelectionSignature = "";
            cleanUndoStack = [];
            this.updateSelectionSpans(); this.updatePreview();
        },

        isChinese: function(text) {
            for (var i = 0; i < text.length; i++) {
                var code = text.charCodeAt(i);
                if (code >= 0x4E00 && code <= 0x9FA5) return true;
            }
            return false;
        },

        createTranslateError: function(code, message) {
            var err = { code: String(code || ""), message: String(message || "") };
            err.toString = function() { return err.message || ("错误码 " + err.code); };
            return err;
        },

        getTranslateErrorMessage: function(e) {
            var code = e && e.code ? String(e.code) : "";
            if (code === "54003") return "翻译接口访问过快，请稍后再试";
            if (e && e.message) return String(e.message);
            return String(e);
        },

        translateTextSync: function(text, authConfig) {
            var auth = authConfig || getPickwordTranslateConfig20(toolhubAppRef, null);
            if (!auth || !auth.appId || !auth.secret) {
                throw this.createTranslateError("CONFIG", "请先在 ToolHub 设置页配置" + (auth && auth.label ? auth.label : "翻译接口"));
            }
            var isCh = this.isChinese(String(text || ""));
            var source = "auto";
            var target = "";
            var params = null;
            var reqUrl = "";
            if (auth.engine === "youdao") {
                target = isCh ? "en" : "zh-CHS";
                params = buildYoudaoParams(auth, text, source, target);
                reqUrl = YD_API_URL;
            } else {
                target = isCh ? "en" : "zh";
                params = buildBaiduParams(auth, text, source, target);
                reqUrl = BD_API_URL;
            }

            var conn = null;
            var os = null;
            var reader = null;
            try {
                var formBody = urlEncodeForm(params);
                var url = new java.net.URL(reqUrl);
                conn = url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
                conn.setDoOutput(true);
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(30000);

                os = conn.getOutputStream();
                os.write(new java.lang.String(formBody).getBytes("UTF-8"));
                os.flush();
                os.close();
                os = null;

                var responseCode = conn.getResponseCode();
                var inputStream = responseCode === 200 ? conn.getInputStream() : conn.getErrorStream();
                reader = new java.io.BufferedReader(new java.io.InputStreamReader(inputStream, "UTF-8"));
                var line;
                var response = "";
                while ((line = reader.readLine()) != null) response += line;
                reader.close();
                reader = null;
                if (responseCode !== 200) throw this.createTranslateError("HTTP", "HTTP " + responseCode);

                var json = JSON.parse(response);
                var translatedText = "";
                if (auth.engine === "youdao") {
                    if (json.errorCode && String(json.errorCode) !== "0") throw this.createTranslateError(json.errorCode, "错误码 " + json.errorCode);
                    if (json.translation && json.translation.length > 0) translatedText = json.translation[0];
                } else {
                    if (json.error_code !== undefined && Number(json.error_code) !== 0) throw this.createTranslateError(json.error_code, "错误码 " + json.error_code);
                    if (json.trans_result && json.trans_result.length > 0) {
                        var parts = [];
                        for (var ti = 0; ti < json.trans_result.length; ti++) parts.push(json.trans_result[ti].dst);
                        translatedText = parts.join("\n");
                    }
                }
                if (!translatedText) throw this.createTranslateError("EMPTY", "无效响应");
                return String(translatedText);
            } finally {
                try { if (reader) reader.close(); } catch (eReader) {}
                try { if (os) os.close(); } catch (eOutput) {}
                try { if (conn && conn.disconnect) conn.disconnect(); } catch (eDisconnect) {}
            }
        },

        translateTextSyncWithRetry: function(text, authConfig) {
            var auth = authConfig || getPickwordTranslateConfig20(toolhubAppRef, null);
            var retryDelays = [1200, 2500, 5000];
            var lastError = null;
            for (var attempt = 0; attempt <= retryDelays.length; attempt++) {
                try {
                    return this.translateTextSync(text, auth);
                } catch (e) {
                    lastError = e;
                    var code = e && e.code ? String(e.code) : "";
                    if (code !== "54003" || attempt >= retryDelays.length) throw e;
                    java.lang.Thread.sleep(retryDelays[attempt]);
                }
            }
            throw lastError;
        },

        ensureKeepAlive: function() {
            // ToolHub 主实例负责生命周期；子模块不得创建独立保活循环。
            return true;
        },

        releaseKeepAliveIfIdle: function() {
            try {
                if (keepAliveTimer) mainHandler.removeCallbacks(keepAliveTimer);
            } catch (e) {}
            keepAliveTimer = null;
            return true;
        },

        cancelPinnedTextBatchLoad: function() {
            try {
                pinLoadToken++;
                if (pinBatchLoadRunnable) {
                    try { mainHandler.removeCallbacks(pinBatchLoadRunnable); } catch (e0) {}
                    pinBatchLoadRunnable = null;
                }
            } catch (e) {}
        },

        updatePinProgress: function(loaded, total, done) {
            try {
                if (!pinProgressView) return;
                if (!DIY_CONFIG.PIN_BATCH_SHOW_PROGRESS) {
                    pinProgressView.setVisibility(View.GONE);
                    return;
                }
                total = Math.max(0, parseInt(String(total), 10) || 0);
                loaded = Math.max(0, parseInt(String(loaded), 10) || 0);
                if (total <= 0 || loaded >= total || done) {
                    pinProgressView.setText("已加载完整");
                    var progressRef = pinProgressView;
                    mainHandler.postDelayed(new java.lang.Runnable({
                        run: function() {
                            try { if (progressRef === pinProgressView && pinProgressView) pinProgressView.setVisibility(View.GONE); } catch (e0) {}
                        }
                    }), 500);
                    return;
                }
                pinProgressView.setVisibility(View.VISIBLE);
                pinProgressView.setText("加载 " + loaded + "/" + total);
            } catch (e) {}
        },

        startPinnedTextBatchLoad: function(text) {
            try {
                this.cancelPinnedTextBatchLoad();
                if (!pinTextView) return;
                var source = String(text == null ? "" : text);
                var total = source.length;
                var firstChars = parseInt(String(DIY_CONFIG.PIN_BATCH_FIRST_CHARS), 10);
                var batchChars = parseInt(String(DIY_CONFIG.PIN_BATCH_CHARS), 10);
                var delayMs = parseInt(String(DIY_CONFIG.PIN_BATCH_DELAY_MS), 10);
                if (isNaN(firstChars) || firstChars < 200) firstChars = 1200;
                if (isNaN(batchChars) || batchChars < 200) batchChars = 1000;
                if (isNaN(delayMs) || delayMs < 0) delayMs = 24;

                var enableBatch = DIY_CONFIG.PIN_BATCH_LOAD_ENABLE !== false && total > firstChars;
                if (!enableBatch) {
                    pinTextView.setText(new java.lang.String(source));
                    if (pinProgressView) pinProgressView.setVisibility(View.GONE);
                    return;
                }

                var token = pinLoadToken;
                var offset = Math.min(firstChars, total);
                pinTextView.setText(new java.lang.String(source.substring(0, offset)));
                this.updatePinProgress(offset, total, false);

                var self = this;
                pinBatchLoadRunnable = new java.lang.Runnable({
                    run: function() {
                        try {
                            if (token !== pinLoadToken || pinLayout === null || pinTextView === null) return;
                            var end = offset + batchChars;
                            if (end > total) end = total;
                            if (end > offset) {
                                pinTextView.append(new java.lang.String(source.substring(offset, end)));
                                offset = end;
                                self.updatePinProgress(offset, total, offset >= total);
                            }
                            if (offset < total && token === pinLoadToken && pinLayout !== null && pinTextView !== null) {
                                mainHandler.postDelayed(pinBatchLoadRunnable, delayMs);
                            } else {
                                pinBatchLoadRunnable = null;
                            }
                        } catch (eRun) {
                            pinBatchLoadRunnable = null;
                            try { if (pinProgressView) pinProgressView.setText("加载中断"); } catch (e0) {}
                        }
                    }
                });
                mainHandler.postDelayed(pinBatchLoadRunnable, delayMs);
            } catch (e) {
                try {
                    if (pinTextView) pinTextView.setText(new java.lang.String(String(text == null ? "" : text)));
                    if (pinProgressView) pinProgressView.setVisibility(View.GONE);
                } catch (e1) {}
            }
        },


        pinSelectedText: function() {
            if (selectedIndices.length === 0) {
                showToast("请先选择文字");
                return;
            }
            var text = this.getSelectedText();
            if (!text || text.length === 0) {
                showToast("选中文字为空");
                return;
            }
            this.showPinnedTextWindow(text);
        },

        showPinnedTextWindow: function(text) {
            var self = this;
            runUi(function() {
                try {
                    pinnedText = String(text == null ? "" : text);
                    if (pinnedText.length === 0) {
                        showToast("钉屏文本为空");
                        return;
                    }
                    self.cancelPinnedTextBatchLoad();
                    detectScreenSize();
                    pinWindowManager = pinWindowManager || windowManager || appContext.getSystemService(appContext.WINDOW_SERVICE);

                    var pinTextSizeSp = 14;
                    try {
                        pinTextSizeSp = parseFloat(String(DIY_CONFIG.PIN_TEXT_SIZE_SP));
                        if (isNaN(pinTextSizeSp) || pinTextSizeSp <= 0) pinTextSizeSp = 14;
                    } catch (eSize) {
                        pinTextSizeSp = 14;
                    }

                    var textLen = pinnedText.length;

                    function readPinNumber(value, fallbackValue, minValue) {
                        try {
                            var n = parseFloat(String(value));
                            if (isNaN(n)) return fallbackValue;
                            if (minValue !== undefined && n < minValue) return fallbackValue;
                            return n;
                        } catch (e0) {
                            return fallbackValue;
                        }
                    }

                    var targetPinMaxWidthDp = readPinNumber(DIY_CONFIG.PIN_WINDOW_MAX_WIDTH_DP, 340, 120);
                    var targetPinMaxHeightDp = readPinNumber(DIY_CONFIG.PIN_WINDOW_MAX_HEIGHT_DP, 160, 120);
                    var pinPaddingHorizontalDp = readPinNumber(DIY_CONFIG.PIN_TEXT_PADDING_HORIZONTAL_DP, 18, 0);
                    var pinPaddingVerticalDp = readPinNumber(DIY_CONFIG.PIN_TEXT_PADDING_VERTICAL_DP, 14, 0);
                    var pinLineExtraDp = readPinNumber(DIY_CONFIG.PIN_TEXT_LINE_SPACING_EXTRA_DP, 2, 0);

                    var maxPinWidth = Math.round(Math.min(screenWidth * 0.88, uiDp(targetPinMaxWidthDp, Math.max(targetPinMaxWidthDp, 560))));
                    var maxPinHeight = Math.round(Math.min(screenHeight * 0.68, uiDp(targetPinMaxHeightDp, targetPinMaxHeightDp)));
                    var pinPaddingX = Math.round(uiDp(pinPaddingHorizontalDp, pinPaddingHorizontalDp + 2));
                    var pinPaddingY = Math.round(uiDp(pinPaddingVerticalDp, pinPaddingVerticalDp + 2));
                    var pinLineExtraPx = Math.round(uiDp(pinLineExtraDp, pinLineExtraDp + 1));
                    var contentMaxWidth = Math.max(Math.round(uiDp(80, 96)), maxPinWidth - pinPaddingX * 2);

                    var measurePaint = null;
                    try {
                        measurePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
                        measurePaint.setTextSize(dp(pinTextSizeSp));
                        measurePaint.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
                    } catch (ePaint) {
                        measurePaint = null;
                    }

                    function measurePinTextWidth(str) {
                        try {
                            if (measurePaint) return Math.ceil(measurePaint.measureText(String(str == null ? "" : str)));
                        } catch (e0) {}
                        return Math.ceil(String(str == null ? "" : str).length * Math.max(uiDp(7, 8), Math.round(dp(pinTextSizeSp * 0.62))));
                    }

                    var maxNaturalLineWidth = 0;
                    var lineCount = 1;
                    try {
                        var calcLines = pinnedText.split(/\r\n|\r|\n/);
                        lineCount = 0;
                        for (var iCalc = 0; iCalc < calcLines.length; iCalc++) {
                            var oneLine = String(calcLines[iCalc]);
                            var oneWidth = measurePinTextWidth(oneLine);
                            if (oneWidth > maxNaturalLineWidth) maxNaturalLineWidth = oneWidth;
                            lineCount += Math.max(1, Math.ceil(Math.max(1, oneWidth) / Math.max(1, contentMaxWidth)));
                        }
                    } catch (eCalc) {
                        maxNaturalLineWidth = measurePinTextWidth(pinnedText);
                        lineCount = Math.max(1, Math.ceil(Math.max(1, maxNaturalLineWidth) / Math.max(1, contentMaxWidth)));
                    }

                    var lineHeightPx = Math.max(uiDp(21, 24), Math.round(dp(pinTextSizeSp * 1.55)) + pinLineExtraPx);
                    var naturalTextHeight = Math.round(lineCount * lineHeightPx) + pinPaddingY * 2 + Math.round(uiDp(4, 6));
                    var progressReservePx = (DIY_CONFIG.PIN_BATCH_SHOW_PROGRESS !== false && textLen > 0) ? Math.round(uiDp(22, 26)) : 0;
                    var maxScrollHeight = Math.max(Math.round(uiDp(56, 68)), maxPinHeight - progressReservePx);
                    var needPinScrollLimit = naturalTextHeight > maxScrollHeight;
                    var pinScrollHeight = needPinScrollLimit ? maxScrollHeight : LayoutParams.WRAP_CONTENT;

                    pinLayoutParams = new LayoutParams(
                        LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT,
                        LayoutParams.TYPE_APPLICATION_OVERLAY,
                        LayoutParams.FLAG_NOT_FOCUSABLE,
                        android.graphics.PixelFormat.TRANSLUCENT
                    );
                    pinLayoutParams.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
                    pinLayoutParams.x = 0;
                    pinLayoutParams.y = uiDp(128, 144);

                    if (pinLayout !== null) {
                        try { pinWindowManager.removeView(pinLayout); } catch (eOld) {}
                        pinLayout = null;
                        pinTextView = null;
                    }

                    pinLayout = new LinearLayout(appContext);
                    pinLayout.setOrientation(LinearLayout.VERTICAL);
                    // 钉屏窗口不使用固定宽高；卡片尺寸由文本实际测量 + TextView 自适应，最大宽高由 DIY 限制。
                    pinLayout.setGravity(Gravity.TOP);
                    pinLayout.setBackground(createRoundRectDrawable(Colors.surface, isTablet ? 16 : 14));
                    pinLayout.setElevation(uiDp(3, 4));
                    pinLayout.setPadding(0, 0, 0, 0);

                    pinTextView = new TextView(appContext);
                    // 钉屏窗口使用纯字符串，不参与主文本区 Canvas 字间距逻辑，避免钉屏文字显示错位。
                    safeTextColor(pinTextView, Colors.text);
                    pinTextView.setTextSize(TypedValue.COMPLEX_UNIT_SP, pinTextSizeSp);
                    pinTextView.setLineSpacing(pinLineExtraPx, 1.08);
                    pinTextView.setGravity(Gravity.TOP | Gravity.LEFT);
                    pinTextView.setTextIsSelectable(false);
                    pinTextView.setSingleLine(false);
                    pinTextView.setPadding(pinPaddingX, pinPaddingY, pinPaddingX, pinPaddingY);
                    try { pinTextView.setMaxWidth(contentMaxWidth + pinPaddingX * 2); } catch (eMaxWidth) {}
                    try { pinTextView.setHorizontallyScrolling(false); } catch (eScroll) {}
                    try { pinTextView.setIncludeFontPadding(true); } catch (eFontPad) {}
                    try { pinTextView.setBreakStrategy(android.text.Layout.BREAK_STRATEGY_SIMPLE); } catch (eBreak) {}
                    try { pinTextView.setHyphenationFrequency(android.text.Layout.HYPHENATION_FREQUENCY_NONE); } catch (eHyphen) {}

                    pinScrollView = new ScrollView(appContext);
                    pinScrollView.setFillViewport(false);
                    try { pinScrollView.setSmoothScrollingEnabled(true); } catch (eSmooth) {}
                    try { pinScrollView.setOverScrollMode(View.OVER_SCROLL_IF_CONTENT_SCROLLS); } catch (eOver) {}
                    var scrollLp = new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, pinScrollHeight);
                    pinScrollView.setLayoutParams(scrollLp);
                    var textLp = new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
                    pinTextView.setLayoutParams(textLp);
                    pinScrollView.addView(pinTextView);
                    pinLayout.addView(pinScrollView);

                    pinProgressView = new TextView(appContext);
                    pinProgressView.setText("加载中…");
                    safeTextColor(pinProgressView, Colors.textTertiary);
                    pinProgressView.setTextSize(uiTextSize(10, 11));
                    pinProgressView.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);
                    pinProgressView.setSingleLine(true);
                    pinProgressView.setPadding(pinPaddingX, uiDp(3, 4), pinPaddingX, uiDp(6, 8));
                    pinProgressView.setVisibility(View.GONE);
                    var progressLp = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
                    pinProgressView.setLayoutParams(progressLp);
                    pinLayout.addView(pinProgressView);

                    var touchStartX = 0;
                    var touchStartY = 0;
                    var layoutStartX = 0;
                    var layoutStartY = 0;
                    var draggingPin = false;
                    var movedPin = false;
                    var pinTouchMode = 0; // 0=未决，1=拖动浮窗，2=文本滚动
                    var lastTapTime = 0;
                    var lastTapX = 0;
                    var lastTapY = 0;
                    var tapSlop = Math.max(TOUCH_SLOP, Math.round(uiDp(10, 12)));
                    var doubleTapTimeout = 320;

                    function isPinContentScrollableNow() {
                        try {
                            if (!pinScrollView || !pinTextView) return false;
                            return pinTextView.getHeight() > pinScrollView.getHeight() + Math.round(uiDp(6, 8));
                        } catch (e0) {
                            return false;
                        }
                    }

                    function handlePinDoubleTap(v, event) {
                        try {
                            var nowTap = Date.now();
                            var tapDx = event.getRawX() - lastTapX;
                            var tapDy = event.getRawY() - lastTapY;
                            if (lastTapTime > 0 && (nowTap - lastTapTime) <= doubleTapTimeout && Math.abs(tapDx) <= tapSlop && Math.abs(tapDy) <= tapSlop) {
                                lastTapTime = 0;
                                hapticFeedback(v);
                                self.removePinnedTextWindow();
                                return true;
                            }
                            lastTapTime = nowTap;
                            lastTapX = event.getRawX();
                            lastTapY = event.getRawY();
                        } catch (e0) {}
                        return false;
                    }

                    var pinTouchListener = new View.OnTouchListener({
                        onTouch: function(v, event) {
                            try {
                                var action = event.getAction();
                                var isTextScrollTarget = (v === pinScrollView || v === pinTextView);
                                if (action === MotionEvent.ACTION_DOWN) {
                                    touchStartX = event.getRawX();
                                    touchStartY = event.getRawY();
                                    layoutStartX = pinLayoutParams.x;
                                    layoutStartY = pinLayoutParams.y;
                                    draggingPin = true;
                                    movedPin = false;
                                    pinTouchMode = 0;
                                    // 文本区域先放行给 ScrollView，这样长文本可以正常滚动；外层空白区仍可直接拖动浮窗。
                                    return !isTextScrollTarget;
                                }
                                if (action === MotionEvent.ACTION_MOVE && draggingPin) {
                                    var dx = event.getRawX() - touchStartX;
                                    var dy = event.getRawY() - touchStartY;
                                    var absDx = Math.abs(dx);
                                    var absDy = Math.abs(dy);
                                    if (absDx > tapSlop || absDy > tapSlop) movedPin = true;

                                    if (pinTouchMode === 0 && movedPin) {
                                        if (isTextScrollTarget && isPinContentScrollableNow() && absDy > absDx * 1.15) {
                                            pinTouchMode = 2;
                                            return false;
                                        }
                                        pinTouchMode = 1;
                                        try { v.getParent().requestDisallowInterceptTouchEvent(true); } catch (e0) {}
                                    }

                                    if (pinTouchMode === 1) {
                                        pinLayoutParams.x = layoutStartX + dx;
                                        pinLayoutParams.y = layoutStartY + dy;
                                        try { pinWindowManager.updateViewLayout(pinLayout, pinLayoutParams); } catch (e1) {}
                                        return true;
                                    }
                                    return false;
                                }
                                if (action === MotionEvent.ACTION_UP || action === MotionEvent.ACTION_CANCEL) {
                                    var wasDragWindow = pinTouchMode === 1;
                                    draggingPin = false;
                                    pinTouchMode = 0;
                                    try { v.getParent().requestDisallowInterceptTouchEvent(false); } catch (e2) {}
                                    if (action === MotionEvent.ACTION_UP && !movedPin) {
                                        if (handlePinDoubleTap(v, event)) return true;
                                    }
                                    return wasDragWindow || !isTextScrollTarget;
                                }
                            } catch (eTouch) {}
                            return false;
                        }
                    });
                    pinLayout.setOnTouchListener(pinTouchListener);
                    pinTextView.setOnTouchListener(pinTouchListener);
                    try { pinScrollView.setOnTouchListener(pinTouchListener); } catch (ePinScrollTouch) {}

                    self.startPinnedTextBatchLoad(pinnedText);

                    pinWindowManager.addView(pinLayout, pinLayoutParams);
                    animateWindowEnter(pinLayout);
                    self.ensureKeepAlive();
                    mainHandler.postDelayed(new java.lang.Runnable({
                        run: function() {
                            try { self.hide(); } catch (eHide) {}
                        }
                    }), 60);
                    showToast("已钉到屏幕，双击钉屏可关闭");
                } catch (e) {
                    showToast("钉屏失败: " + e.message);
                }
            });
        },

        removePinnedTextWindow: function() {
            try {
                if (pinWindowManager !== null && pinLayout !== null) {
                    try { pinWindowManager.removeView(pinLayout); } catch (e0) {}
                }
            } catch (e) {}
            this.cancelPinnedTextBatchLoad();
            pinLayout = null;
            pinLayoutParams = null;
            pinTextView = null;
            pinScrollView = null;
            pinProgressView = null;
            pinnedText = "";
            this.releaseKeepAliveIfIdle();
        },

        copyAllText: function() {
            var textValue = String(originalFullText || fullText || "");
            if (!textValue) { showToast("没有可复制的文字"); return; }
            if (setClipboard(textValue)) showToast("已复制全部文字");
        },

        cleanReplicaNewlines: function() {
            if (selectedIndices.length > 0) this.removeSelectedNewlines();
            else this.removeLoadedNewlines();
        },

        cleanReplicaSpaces: function() {
            if (selectedIndices.length > 0) this.removeSelectedSpaces();
            else this.removeLoadedSpaces();
        },

        sharePickwordText: function() {
            var textValue = selectedIndices.length > 0 ? this.getSelectedText() : String(originalFullText || fullText || "");
            if (!textValue) { showToast("没有可分享的文字"); return; }
            try {
                var sendIntent = new android.content.Intent(android.content.Intent.ACTION_SEND);
                sendIntent.setType("text/plain");
                sendIntent.putExtra(android.content.Intent.EXTRA_TEXT, String(textValue));
                var chooser = android.content.Intent.createChooser(sendIntent, "分享文字");
                chooser.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                appContext.startActivity(chooser);
            } catch (eShare) {
                showToast("分享失败: " + eShare.message);
            }
        },

        doTranslate: function() {
            try {
                if (selectedIndices.length === 0) { showToast("请先选择文字");
                return; }
            var translateAuth = getPickwordTranslateConfig20(toolhubAppRef, null);
            if (!translateAuth.appId || !translateAuth.secret) {
                showToast("请先在 ToolHub 设置页配置" + translateAuth.label);
                return;
            }
                if (isTranslating) { showToast("正在翻译中，请稍候...");
                return; }

                var self = this;
                var usePreviewOverride = this.hasPreviewTextOverride();

                if (usePreviewOverride) {
                    var unionRange = this.collectSelectedUnionRange();
                    if (!unionRange) { showToast("请先选择文字"); return; }
                    var previewRange = {
                        start: unionRange.start,
                        end: unionRange.end,
                        text: this.getSelectedText()
                    };
                    this.prepareRangeForTranslate(previewRange);
                    if (previewRange.textToTranslate.length > 5000) { showToast("单段文本过长，最多支持5000字符"); return; }
                    if (previewRange.textToTranslate.length === 0) { showToast("请先选择文字"); return; }

                    isTranslating = true;
                    showToast("正在翻译预览文字...");
                    new java.lang.Thread(new java.lang.Runnable({
                        run: function() {
                            try {
                                var translatedText = self.translateTextSyncWithRetry(previewRange.textToTranslate, translateAuth);
                                translatedText = self.buildTranslatedRangeText(previewRange.translateParts, translatedText);
                                translatedText = String(translatedText == null ? "" : translatedText) + String(previewRange.structuralSuffix || "");
                                self.replaceSelectedRanges([{
                                    start: previewRange.start,
                                    end: previewRange.replaceEnd,
                                    translatedText: translatedText,
                                    selectedTextLength: translatedText.length - String(previewRange.structuralSuffix || "").length
                                }]);
                                showToast("翻译并替换完成");
                            } catch (ePreview) {
                                showToast(self.getTranslateErrorMessage(ePreview));
                            } finally {
                                isTranslating = false;
                            }
                        }
                    })).start();
                    return;
                }

                var ranges = this.collectSelectedRanges();
                if (ranges.length === 0) { showToast("请先选择文字"); return; }
                var translatableCount = 0;
                for (var ri = 0; ri < ranges.length; ri++) {
                    this.prepareRangeForTranslate(ranges[ri]);
                    if (ranges[ri].textToTranslate.length > 5000) { showToast("单段文本过长，最多支持5000字符"); return; }
                    if (ranges[ri].textToTranslate.length > 0) translatableCount++;
                }
                if (translatableCount === 0) { showToast("请先选择文字"); return; }

                isTranslating = true;
                showToast(ranges.length > 1 ? ("正在分段翻译 " + ranges.length + " 段...") : "正在翻译...");

                new java.lang.Thread(new java.lang.Runnable({
                    run: function() {
                        try {
                            var replacements = [];
                            var translatedCount = 0;
                            for (var i = 0; i < ranges.length; i++) {
                                var translatedText = ranges[i].text;
                                if (ranges[i].textToTranslate.length > 0) {
                                    if (translatedCount > 0) java.lang.Thread.sleep(1200);
                                    translatedText = self.translateTextSyncWithRetry(ranges[i].textToTranslate, translateAuth);
                                    translatedText = self.buildTranslatedRangeText(ranges[i].translateParts, translatedText);
                                    translatedCount++;
                                }
                                translatedText = String(translatedText == null ? "" : translatedText) + String(ranges[i].structuralSuffix || "");
                                replacements.push({
                                    start: ranges[i].start,
                                    end: ranges[i].replaceEnd,
                                    translatedText: translatedText,
                                    selectedTextLength: translatedText.length - String(ranges[i].structuralSuffix || "").length
                                });
                            }
                            self.replaceSelectedRanges(replacements);
                            showToast(ranges.length > 1 ? ("翻译并替换完成，共" + ranges.length + "段") : "翻译并替换完成");
                        } catch (e) {
                            showToast(self.getTranslateErrorMessage(e));
                        } finally {
                            isTranslating = false;
                        }
                    }
                })).start();
            } catch (e) {
                isTranslating = false;
                showToast("翻译启动失败: " + e.message);
            }
        },

        doCopy: function() {
            if (selectedIndices.length === 0) { showToast("请先选择文字");
            return; }
            var text = this.getSelectedText(); setClipboard(text); showToast("已复制"); this.hide();
        }
    };

    function refreshPickwordTheme20() {
        applyPickwordColorScheme20(toolhubAppRef);
        applyVisiblePickwordTheme20();
    }

    function normalizePickwordInput20(text) {
        if (typeof text === 'function') text = text();
        if (text === null || text === undefined) return "";
        return typeof text === 'string' ? text : String(text);
    }

    function startBigBang(text) {
        var raw = "";
        var loaded = "";
        try {
            raw = normalizePickwordInput20(text);
            if (!raw) return { ok: false, code: "EMPTY_TEXT", message: "文本为空" };

            loaded = raw;
            if (loaded.length > DIY_CONFIG.MAX_CHAR_LIMIT) {
                loaded = loaded.substring(0, DIY_CONFIG.MAX_CHAR_LIMIT);
                showToast("文本过长，拾字已载入前" + DIY_CONFIG.MAX_CHAR_LIMIT + "字");
            }

            refreshPickwordTheme20();
            拾字Floaty.show(loaded);
            return {
                ok: true,
                code: "PICKWORD_SHOWN",
                originalLength: raw.length,
                loadedLength: loaded.length,
                truncated: loaded.length !== raw.length
            };
        } catch (e) {
            appendMagnifierErrorLog("START", e, "startBigBang");
            showToast("启动失败: " + e.message);
            return { ok: false, code: "PICKWORD_FAILED", message: String(e) };
        }
    }

    function cancelPickwordCallbacks20() {
        try { if (longPressHandler) mainHandler.removeCallbacks(longPressHandler); } catch (e0) {}
        try { if (autoScrollRunnable) mainHandler.removeCallbacks(autoScrollRunnable); } catch (e1) {}
        try { if (keepAliveTimer) mainHandler.removeCallbacks(keepAliveTimer); } catch (e2) {}
        try { if (pendingFullTextRunnable) mainHandler.removeCallbacks(pendingFullTextRunnable); } catch (e3) {}
        try { if (pendingFingerPreviewWarmupRunnable) mainHandler.removeCallbacks(pendingFingerPreviewWarmupRunnable); } catch (e4) {}
        try { if (pendingAdjustRunnable) mainHandler.removeCallbacks(pendingAdjustRunnable); } catch (e5) {}
        try { if (pendingDragUpdate) mainHandler.removeCallbacks(pendingDragUpdate); } catch (e6) {}
        try { if (pinBatchLoadRunnable) mainHandler.removeCallbacks(pinBatchLoadRunnable); } catch (e7) {}
        try { 拾字Floaty.stopCanvasScrollRefresh(); } catch (e8) {}
        longPressHandler = null;
        autoScrollRunnable = null;
        keepAliveTimer = null;
        pendingFullTextRunnable = null;
        pendingFingerPreviewWarmupRunnable = null;
        pendingAdjustRunnable = null;
        pendingDragUpdate = null;
        pinBatchLoadRunnable = null;
        pinLoadToken++;
    }

    function installPickword20() {
        try {
            if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return false;
            var proto = FloatBallAppWM.prototype;
            if (proto.__toolHubPickwordInstalled === true) return true;

            proto.showPickwordText = function(text, meta) {
                toolhubAppRef = this;
                var raw = normalizePickwordInput20(text);
                if (!raw) return { ok: false, code: "EMPTY_TEXT", message: "文本为空" };
                if (!this.state) return { ok: false, code: "APP_STATE_UNAVAILABLE", message: "ToolHub 状态不可用" };
                if (!this.state.pickword) {
                    this.state.pickword = {
                        generation: 0,
                        showing: false,
                        fullText: "",
                        loadedText: "",
                        meta: null,
                        lastResult: null
                    };
                }
                var ps = this.state.pickword;
                ps.generation = Number(ps.generation || 0) + 1;
                ps.fullText = raw;
                ps.loadedText = raw.length > DIY_CONFIG.MAX_CHAR_LIMIT
                    ? raw.substring(0, DIY_CONFIG.MAX_CHAR_LIMIT)
                    : raw;
                ps.meta = meta || null;
                var ret = startBigBang(raw);
                ps.lastResult = ret;
                ps.showing = !!(ret && ret.ok);
                try {
                    safeLog(this.L, ret && ret.ok ? 'i' : 'w',
                        "pickword show ok=" + String(!!(ret && ret.ok)) +
                        " originalLen=" + String(raw.length) +
                        " loadedLen=" + String(ps.loadedText.length));
                } catch (eLog) {}
                return ret;
            };

            proto.isPickwordShowing = function() {
                return isShowing === true && mainLayout !== null;
            };

            proto.hidePickwordWindow = function(reason) {
                try { 拾字Floaty.hide(); } catch (eHide) {}
                try {
                    if (this.state && this.state.pickword) {
                        this.state.pickword.showing = false;
                        this.state.pickword.lastHideReason = String(reason || "");
                    }
                } catch (eState) {}
                return true;
            };

            proto.disposePickwordModule = function(reason) {
                var self = this;
                var cleanup = function() {
                    cancelPickwordCallbacks20();
                    try { 拾字Floaty.removeFingerPreview(); } catch (ePreview) {}
                    try { 拾字Floaty.hide(); } catch (eHide) {}
                    try { 拾字Floaty.removePinnedTextWindow(); } catch (ePin) {}
                    try {
                        if (fontSizePopupWindow && fontSizePopupWindow.isShowing()) fontSizePopupWindow.dismiss();
                    } catch (eFontPopup) {}
                    fontSizePopupWindow = null;
                    try {
                        if (windowManager !== null && mainLayout !== null) windowManager.removeView(mainLayout);
                    } catch (eMainRemove) {}
                    try {
                        if (pinLayout !== null) (pinWindowManager || windowManager).removeView(pinLayout);
                    } catch (ePinRemove) {}
                    mainLayout = null;
                    previewBoxView = null;
                    copyAllActionBtn = null;
                    cleanupActionBtn = null;
                    shareActionBtn = null;
                    fontSizeSelectorView = null;
                    titleAccentView = null;
                    resultDividerView = null;
                    closeActionView = null;
                    titleBarRefs = { normalMode: null, settingMode: null };
                    fontSizeDropdownView = null;
                    fontSizeDropdownCardView = null;
                    fontSizePopupWindow = null;
                    fontSizeOptionViews = [];
                    textView = null;
                    textCanvasControl = null;
                    scrollView = null;
                    previewTextView = null;
                    pinLayout = null;
                    pinLayoutParams = null;
                    pinTextView = null;
                    pinScrollView = null;
                    pinProgressView = null;
                    pinnedText = "";
                    isShowing = false;
                    isDragging = false;
                    isTranslating = false;
                    return true;
                };

                try {
                    if (typeof runOnMainSync === "function") {
                        var syncRet = runOnMainSync(cleanup, 2000);
                        if (!syncRet || syncRet.ok !== true) cleanup();
                    } else {
                        cleanup();
                    }
                } catch (eCleanup) {
                    try { cleanup(); } catch (eCleanupFallback) {}
                }

                try {
                    if (self.state && self.state.pickword) {
                        self.state.pickword.generation = Number(self.state.pickword.generation || 0) + 1;
                        self.state.pickword.showing = false;
                        self.state.pickword.fullText = "";
                        self.state.pickword.loadedText = "";
                        self.state.pickword.meta = null;
                        self.state.pickword.lastDisposeReason = String(reason || "");
                    }
                } catch (eStateDispose) {}
                return true;
            };



            proto.testPickwordTranslateConfiguration = function(configSnapshot, callback) {
                var self = this;
                var auth = getPickwordTranslateConfig20(this, configSnapshot || {});
                var testText = "ToolHub 翻译测试";
                var done = typeof callback === "function" ? callback : null;
                if (!auth.appId || !auth.secret) {
                    try { if (this.setInlineNotice) this.setInlineNotice("翻译配置不可用\n" + auth.label + " · 请填写应用 ID 和密钥", "error"); } catch(eNotice0) {}
                    if (done) done({ ok: false, code: "CONFIG" });
                    return false;
                }
                try { if (this.setInlineNotice) this.setInlineNotice("正在测试" + auth.label + "…", "info"); } catch(eStartNotice) {}
                var worker = new java.lang.Thread(new java.lang.Runnable({
                    run: function() {
                        var result = { ok: false, engine: auth.engine, label: auth.label, text: "", code: "", error: "" };
                        try {
                            result.text = String(拾字Floaty.translateTextSync(testText, auth) || "");
                            result.ok = result.text.length > 0;
                            if (!result.ok) result.error = "返回结果为空";
                        } catch(eTest) {
                            result.code = eTest && eTest.code ? String(eTest.code) : "";
                            result.error = 拾字Floaty.getTranslateErrorMessage(eTest);
                        }
                        mainHandler.post(new java.lang.Runnable({
                            run: function() {
                                try {
                                    if (result.ok) {
                                        var displayText = result.text.length > 80 ? result.text.substring(0, 80) + "…" : result.text;
                                        if (self.setInlineNotice) self.setInlineNotice("翻译配置可用\n" + result.label + " · " + displayText, "ok");
                                    } else {
                                        var errorText = result.error || (result.code ? ("错误码 " + result.code) : "请求失败，请检查应用 ID、密钥和网络");
                                        if (self.setInlineNotice) self.setInlineNotice("翻译配置不可用\n" + result.label + " · " + errorText, "error");
                                    }
                                } catch(eNotice) {}
                                try { if (done) done(result); } catch(eDone) {}
                            }
                        }));
                    }
                }), "ToolHub-Pickword-Translate-Test");
                worker.start();
                return true;
            };

            proto.onPickwordConfigurationChanged = function() {
                try {
                    if (fontSizePopupWindow && fontSizePopupWindow.isShowing()) fontSizePopupWindow.dismiss();
                } catch (eFontPopup) {}
                fontSizePopupWindow = null;
                refreshPickwordTheme20();
                try { if (textCanvasControl && textCanvasControl.view) textCanvasControl.view.invalidate(); } catch (eCanvas) {}
                try { if (mainLayout) mainLayout.invalidate(); } catch (eMain) {}
                try { if (pinLayout) pinLayout.invalidate(); } catch (ePin) {}
                return true;
            };

            proto.__toolHubPickwordInstalled = true;
            return true;
        } catch (eInstall) {
            try { safeLog(null, 'e', "install pickword module fail: " + String(eInstall)); } catch (eLog) {}
        }
        return false;
    }

    applyMagnifierSafetyProfile();
    installPickword20();

})();
