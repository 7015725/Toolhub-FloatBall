// @version 1.0.2
// ToolHub - Android 悬浮球工具 (ShortX / Rhino ES5)
// 来源: 阿然 (xin-blog.com)
//
// ============================================================================
// 【操作方法】
//
// 1. 悬浮球手势
//    - 单击: 打开/关闭主面板
//    - 长按: 打开设置面板
//    - 拖拽: 移动悬浮球位置
//
// 2. 按钮编辑
//    - 长按悬浮球 → 设置面板 → 按钮管理
//    - 支持类型: Shell / App / Broadcast / Intent / Content / Shortcut
//
// ============================================================================

// =======================【优化：工具函数】======================
// 统一的空日志写入（避免到处写 if (this.L) this.L.xxx）
function safeLog(logger, level, msg) {
  if (!logger || !logger[level]) return;
  try { logger[level](msg); } catch(e) {}
}

var TOOLHUB_DEBUG_LOG = false;

function debugLog(logger, msg) {
  try {
    if (TOOLHUB_DEBUG_LOG && logger && logger.d) logger.d(String(msg));
  } catch(e) {}
}

// # 分级操作封装：关键业务抛出错误，非关键业务静默处理
function safeOperation(opName, fn, critical, logger) {
  try {
    return fn();
  } catch (e) {
    if (critical) {
      // 关键业务：记录详细堆栈并重新抛出
      var stack = "";
      try {
        var sw = new java.io.StringWriter();
        var pw = new java.io.PrintWriter(sw);
        e.printStackTrace(pw);
        stack = String(sw.toString());
      } catch(e2) {}
      safeLog(logger, 'e', opName + " CRITICAL: " + String(e) + "\n" + stack);
      throw e;
    } else {
      // 非关键业务：静默记录并返回 null
      safeLog(logger, 'd', opName + " skipped: " + String(e));
      return null;
    }
  }
}

function parseBooleanLike(value) {
  if (value === true || value === false) return value;
  if (value == null) return false;
  if (typeof value === "number") return value !== 0;
  try {
    var s = String(value).replace(/^\s+|\s+$/g, "").toLowerCase();
    if (s === "" || s === "0" || s === "false" || s === "no" || s === "off" || s === "null" || s === "undefined") return false;
    if (s === "1" || s === "true" || s === "yes" || s === "on") return true;
  } catch (e) {}
  return !!value;
}

// # 配置校验层：防止用户手动编辑 JSON 导致崩溃
var ConfigValidator = {
  schemas: {
    // 悬浮球核心配置
    BALL_SIZE_DP: { type: "int", min: 20, max: 200, default: 45 },
    BALL_INIT_X: { type: "int", min: 0, max: 10000, default: 0 },
    BALL_INIT_Y_DP: { type: "int", min: 0, max: 2000, default: 220 },
    BALL_POS_SCREEN_W: { type: "int", min: 0, max: 10000, default: 0 },
    BALL_POS_SCREEN_H: { type: "int", min: 0, max: 10000, default: 0 },
    BALL_POS_X_RATIO: { type: "float", min: 0, max: 1, default: 0 },
    BALL_POS_Y_RATIO: { type: "float", min: 0, max: 1, default: 0 },
    BALL_POS_DOCKED: { type: "bool", default: false },
    BALL_POS_DOCK_SIDE: { type: "enum", values: ["", "left", "right"], default: "" },

    // 面板布局配置
    PANEL_COLS: { type: "int", min: 1, max: 6, default: 1 },
    PANEL_ROWS: { type: "int", min: 1, max: 10, default: 6 },
    PANEL_BG_ALPHA: { type: "float", min: 0.1, max: 1.0, default: 0.85 },
    PANEL_ICON_SIZE_DP: { type: "int", min: 16, max: 64, default: 24 },
    PANEL_ITEM_SIZE_DP: { type: "int", min: 48, max: 120, default: 64 },
    PANEL_GAP_DP: { type: "int", min: 4, max: 24, default: 8 },
    PANEL_PADDING_DP: { type: "int", min: 8, max: 32, default: 12 },

    // 主题配置
    SETTINGS_THEME: { type: "enum", values: ["animal", "monet"], default: "animal" },
    THEME_MODE: { type: "enum", values: [0, 1, 2], default: 1 },
    THEME_ACCENT_LIGHT: { type: "string", default: "#FF3A86FF" },
    THEME_ACCENT_DARK: { type: "string", default: "#FF90CAF9" },

    // 图标配置
    BALL_ICON_TYPE: { type: "enum", values: ["app", "file", "android", "shortx"], default: "app" },
    BALL_ICON_RES_ID: { type: "int", min: 0, max: 999999, default: 0 },
    BALL_ICON_SIZE_DP: { type: "int", min: 12, max: 80, default: 22 },
    BALL_PNG_MODE: { type: "int", min: 0, max: 2, default: 1 },
    BALL_IDLE_ALPHA: { type: "float", min: 0.1, max: 1.0, default: 0.6 },

    // 交互配置
    LONG_PRESS_MS: { type: "int", min: 200, max: 2000, default: 600 },
    LONG_PRESS_TRIGGERED_MOVE_SLOP_DP: { type: "int", min: 8, max: 80, default: 28 },
    LONG_PRESS_VIBRATE_MS: { type: "int", min: 10, max: 100, default: 40 },
    CLICK_SLOP_DP: { type: "int", min: 2, max: 20, default: 6 },
    TOOLAPP_BACK_GESTURE_MODE: { type: "enum", values: ["edge", "surface", "off"], default: "surface" },
    TOOLAPP_BACK_EDGE_WIDTH_DP: { type: "int", min: 1, max: 120, default: 72 },
    TOOLAPP_BACK_COMMIT_DISTANCE_DP: { type: "int", min: 1, max: 480, default: 36 },
    TOOLAPP_BACK_SURFACE_SLOP_DP: { type: "int", min: 8, max: 96, default: 24 },
    TOOLAPP_BACK_PROGRESS_DISTANCE_DP: { type: "int", min: 1, max: 720, default: 96 },

    // 功能开关
    ENABLE_SNAP_TO_EDGE: { type: "bool", default: true },
    ENABLE_ANIMATIONS: { type: "bool", default: true },
    ENABLE_LONG_PRESS: { type: "bool", default: true },
    ENABLE_AUTO_IDLE_DOCK: { type: "bool", default: true },

    // 边缘吸附配置
    EDGE_VISIBLE_RATIO: { type: "float", min: 0.3, max: 1.0, default: 0.70 },
    IDLE_TIMEOUT_MS: { type: "int", min: 500, max: 5000, default: 1500 },

    // 面板位置配置
    PANEL_POS_GRAVITY: { type: "enum", values: ["top", "bottom", "left", "right", "auto"], default: "bottom" },
    PANEL_CUSTOM_OFFSET_Y: { type: "int", min: -500, max: 500, default: 0 },
    BALL_PANEL_GAP_DP: { type: "int", min: 0, max: 50, default: 8 },

    // 日志配置
    LOG_ENABLE: { type: "bool", default: true },
    LOG_DEBUG: { type: "bool", default: false },
    LOG_KEEP_DAYS: { type: "int", min: 1, max: 30, default: 3 },

    // 内容查看器配置
    CONTENT_MAX_ROWS: { type: "int", min: 5, max: 100, default: 20 },

    // ========== 以下配置在 Schema 中但原 ConfigValidator 中缺失 ==========
    // 图标文件配置
    BALL_ICON_FILE_PATH: { type: "string", default: "" },
    BALL_ICON_FILE_MAX_PX: { type: "int", min: 128, max: 2048, default: 512 },
    BALL_ICON_PKG: { type: "string", default: "" },
    BALL_ICON_RES_NAME: { type: "string", default: "" },
    BALL_ICON_TINT_HEX: { type: "string", default: "" },
    BALL_BG_COLOR_HEX: { type: "string", default: "" },

    // 回弹动画配置
    BOUNCE_DECAY: { type: "float", min: 0.3, max: 0.95, default: 0.72 },
    BOUNCE_MAX_SCALE: { type: "float", min: 0.6, max: 0.99, default: 0.88 },
    BOUNCE_STEP_MS: { type: "int", min: 20, max: 500, default: 90 },
    BOUNCE_TIMES: { type: "int", min: 1, max: 8, default: 2 },
    ENABLE_BOUNCE: { type: "bool", default: true },

    // 动画时长配置
    DOCK_AFTER_IDLE_MS: { type: "int", min: 200, max: 8000, default: 1500 },
    DOCK_ANIM_MS: { type: "int", min: 50, max: 2000, default: 260 },
    UNDOCK_ANIM_MS: { type: "int", min: 50, max: 2000, default: 180 },
    SAVE_THROTTLE_MS: { type: "int", min: 0, max: 5000, default: 220 },

    // 长按配置
    LONG_PRESS_HAPTIC_ENABLE: { type: "bool", default: true },

    // 面板配置
    PANEL_IDLE_CLOSE_AND_DOCK_MS: { type: "int", min: 200, max: 12000, default: 5000 },
    PANEL_LABEL_ENABLED: { type: "bool", default: true },
    PANEL_LABEL_TEXT_SIZE_SP: { type: "int", min: 8, max: 24, default: 12 },
    PANEL_LABEL_TOP_MARGIN_DP: { type: "int", min: 0, max: 20, default: 4 },

    // 主题颜色配置（留空则使用系统莫奈色）
    THEME_DAY_BG_HEX: { type: "string", default: null },
    THEME_DAY_TEXT_HEX: { type: "string", default: null },
    THEME_NIGHT_BG_HEX: { type: "string", default: null },
    THEME_NIGHT_TEXT_HEX: { type: "string", default: null }
  },

  validate: function(key, value) {
    var schema = this.schemas[key];
    if (!schema) return { valid: true, value: value }; // 未知 key 放行

    var val = value;

    // 类型转换
    if (schema.type === "int") {
      val = parseInt(String(value), 10);
      if (isNaN(val)) return { valid: false, error: "必须为整数", fallback: schema.default };
    } else if (schema.type === "float") {
      val = parseFloat(String(value));
      if (isNaN(val)) return { valid: false, error: "必须为数字", fallback: schema.default };
    } else if (schema.type === "bool") {
      val = parseBooleanLike(value);
    } else if (schema.type === "string") {
      val = String(value == null ? "" : value);
    }

    // 范围检查
    if (schema.min !== undefined && val < schema.min) {
      return { valid: false, error: "最小值为 " + schema.min, fallback: schema.min };
    }
    if (schema.max !== undefined && val > schema.max) {
      return { valid: false, error: "最大值为 " + schema.max, fallback: schema.max };
    }

    // 枚举检查
    if (schema.type === "enum" && schema.values.indexOf(val) < 0) {
      return { valid: false, error: "可选值: " + schema.values.join(", "), fallback: schema.default };
    }

    return { valid: true, value: val };
  },

  sanitizeConfig: function(config) {
    var out = {};
    for (var k in config) {
      var res = this.validate(k, config[k]);
      if (res.valid) {
        out[k] = res.value;
      } else {
        safeLog(null, 'w', "Config validation failed for " + k + ": " + res.error + ", using fallback");
        out[k] = res.fallback !== undefined ? res.fallback : config[k];
      }
    }
    return out;
  }
};

// 安全获取嵌套对象属性
function safeGet(obj, path, defaultVal) {
  try {
    var parts = path.split('.');
    var curr = obj;
    for (var i = 0; i < parts.length; i++) {
      if (curr == null) return defaultVal;
      curr = curr[parts[i]];
    }
    return curr !== undefined ? curr : defaultVal;
  } catch(e) { return defaultVal; }
}

// 全局反射缓存（避免重复 Class.forName）
var ReflectionCache = {
  _cache: {},
  get: function(className) {
    if (this._cache[className]) return this._cache[className];
    try {
      var clz = java.lang.Class.forName(className);
      this._cache[className] = clz;
      return clz;
    } catch(e) { return null; }
  },
  getMethod: function(className, methodName, paramTypes) {
    var key = className + '#' + methodName;
    if (this._cache[key]) return this._cache[key];
    try {
      var clz = this.get(className);
      if (!clz) return null;
      var method = clz.getMethod(methodName, paramTypes);
      this._cache[key] = method;
      return method;
    } catch(e) { return null; }
  }
};

// 优化的防抖函数（使用 Handler 替代 Timer，避免线程泄漏）
function createDebouncedWriter(fn, delay) {
  var _handler = null;
  var _lastRunnable = null;
  var _ht = null; // 保存 HandlerThread 引用以便清理

  var writer = function(arg) {
    // 延迟初始化 Handler，复用实例
    if (!_handler) {
      try {
        _handler = new android.os.Handler(android.os.Looper.getMainLooper());
      } catch(e) {
        // 兜底：创建独立的 HandlerThread（仅创建一次）
        _ht = new android.os.HandlerThread("debounced-writer");
        _ht.start();
        _handler = new android.os.Handler(_ht.getLooper());
      }
    }

    // 取消上一次的任务
    if (_lastRunnable) {
      try { _handler.removeCallbacks(_lastRunnable); } catch(e) {}
      _lastRunnable = null;
    }

    var self = this;
    var runnable = new java.lang.Runnable({
      run: function() { fn.call(self, arg); }
    });
    _lastRunnable = runnable;

    _handler.postDelayed(runnable, delay || 250);
  };

  writer.dispose = function() {
    try {
      if (_handler && _lastRunnable) _handler.removeCallbacks(_lastRunnable);
    } catch (e0) {}
    _lastRunnable = null;
    try {
      if (_ht) {
        if (android.os.Build.VERSION.SDK_INT >= 18) _ht.quitSafely();
        else _ht.quit();
      }
    } catch (e1) {}
    _ht = null;
    _handler = null;
  };

  return writer;
}

function canWriteToolHubDir(path) {
  try {
    if (!path) return false;
    var dir = new java.io.File(String(path));
    if (!dir.exists() && !dir.mkdirs()) return false;
    if (!dir.isDirectory()) return false;
    var probe = new java.io.File(dir, ".write_probe_" + java.lang.System.currentTimeMillis());
    var out = new java.io.FileOutputStream(probe, false);
    out.write(49);
    out.close();
    try { probe.delete(); } catch (eDelProbe) {}
    return true;
  } catch (eProbe) { return false; }
}

function getToolHubAndroidContext() {
  try {
    var app = Packages.android.app.ActivityThread.currentApplication();
    if (app) return app.getApplicationContext ? app.getApplicationContext() : app;
  } catch (eApp) {}
  try {
    var ctx = Packages.tornaco.apps.shortx.core.OooO0O0.OooO00o();
    if (ctx && ctx.getApplicationContext) return ctx.getApplicationContext();
    return ctx;
  } catch (eCtx) {}
  return null;
}

function resolveToolHubRootDir() {
  var candidates = [];
  try {
    if (typeof shortx !== "undefined" && shortx && typeof shortx.getShortXDir === "function") {
      var shortxDir = String(shortx.getShortXDir() || "");
      if (shortxDir) candidates.push(shortxDir + "/ToolHub");
    }
  } catch (eShortX) {}

  try {
    var ctx = getToolHubAndroidContext();
    if (ctx) {
      var ext = ctx.getExternalFilesDir(null);
      if (ext) candidates.push(String(ext.getAbsolutePath()) + "/ToolHub");
      var files = ctx.getFilesDir();
      if (files) candidates.push(String(files.getAbsolutePath()) + "/ToolHub");
    }
  } catch (eCtxRoot) {}

  try {
    var logDirFile = new java.io.File(
      Packages.tornaco.apps.shortx.core.OooO0O0.OooO00o().getLogDir()
    );
    var parent = logDirFile.getParentFile();
    if (parent == null) candidates.push(String(logDirFile.getAbsolutePath()) + "/ToolHub");
    else candidates.push(String(parent.getAbsolutePath()) + "/ToolHub");
  } catch (eRoot2) {}

  candidates.push("/sdcard/Android/data/tornaco.apps.shortx/files/ToolHub");
  candidates.push("/data/system/ShortX_ToolHub");

  for (var i = 0; i < candidates.length; i++) {
    var p = String(candidates[i]);
    if (canWriteToolHubDir(p)) return p;
  }

  return String(candidates[0] || "/data/system/ShortX_ToolHub");
}


// =======================【全局路径与配置】======================
// 这段代码的主要内容/用途：动态获取 ShortX 根目录，并将 ToolHub 工作目录固定到「ShortX根目录/ToolHub」。
// 说明：使用 ShortX 内部 API 获取日志目录的上级目录作为根目录，避免硬编码路径导致 ROM/版本差异问题。
var APP_ROOT_DIR = resolveToolHubRootDir();
var PATH_SETTINGS = APP_ROOT_DIR + "/settings.json";
var PATH_BUTTONS = APP_ROOT_DIR + "/buttons.json";
var PATH_SCHEMA = APP_ROOT_DIR + "/schema.json";
var PATH_LOG_DIR = APP_ROOT_DIR + "/logs";

// =======================【内部常量配置（不开放 Settings）】======================
var CONST_BALL_ICON_RES_ID = 0;
var CONST_BALL_ICON_FILE_MAX_BYTES = 524288;
var CONST_BALL_ICON_FILE_MAX_PX = 512;
var CONST_BALL_PNG_MODE = 1;
var CONST_BALL_INIT_X = 0;
var CONST_BALL_INIT_Y_DP = 220;
var CONST_BALL_FALLBACK_LIGHT = "#FF005BC0";
var CONST_BALL_FALLBACK_DARK = "#FFA8C7FA";
var CONST_SHORTX_PACKAGE = "tornaco.apps.shortx";
var CONST_BALL_RIPPLE_ALPHA_LIGHT = 0.22;
var CONST_BALL_RIPPLE_ALPHA_DARK = 0.28;
var CONST_ACTION_CLOSE_ALL_RULE = "shortx.wm.floatball.CLOSE";
var CONST_WM_THREAD_NAME = "SX-WM-FLOATBALL-HT";
var CONST_LOG_PREFIX = "ShortX_ToolHub";
var CONST_SHELL_BRIDGE_ACTION = "shortx.toolhub.SHELL";
var CONST_SHELL_BRIDGE_EXTRA_CMD = "cmd_b64";
var CONST_SHELL_BRIDGE_EXTRA_FROM = "from";
var CONST_SHELL_BRIDGE_EXTRA_ROOT = "root";
var CONST_SHELL_BRIDGE_DEFAULT_ROOT = true;
var CONST_CONTENT_MAX_ROWS = 20;
var CONST_CONFIG_SAVE_DEBOUNCE_MS = 250;

// # 交互常量配置：集中管理所有硬编码参数，便于维护和调优
var INTERACTION_CONSTANTS = {
  // 触摸与手势
  TOUCH_SLOP_DP: 6,
  CLICK_SLOP_DP: 6,
  LONG_PRESS_TIMEOUT_MS: 520,
  CLICK_COOLDOWN_MS: 280,
  FLING_VELOCITY_THRESHOLD: 1000,

  // 动画时长
  DOCK_ANIMATION_MS: 260,
  UNDOCK_ANIMATION_MS: 180,
  BOUNCE_STEP_MS: 90,
  PANEL_ANIMATION_MS: 180,
  DIALOG_ANIMATION_MS: 150,

  // 自动吸附与超时
  IDLE_DOCK_TIMEOUT_MS: 1500,
  PANEL_IDLE_TIMEOUT_MS: 5000,
  EDGE_VISIBLE_RATIO: 0.70,
  SNAP_ANIMATION_MS: 260,

  // 防抖与节流
  SAVE_THROTTLE_MS: 250,
  SCREEN_MONITOR_THROTTLE_MS: 300,
  DEBOUNCE_WRITE_MS: 250,
  WM_UPDATE_THROTTLE_MS: 10,

  // 尺寸限制
  MIN_PANEL_WIDTH_DP: 200,
  MIN_PANEL_HEIGHT_DP: 150,
  MAX_PANEL_HEIGHT_RATIO: 0.75,
  MAX_PANEL_WIDTH_RATIO: 0.9,

  // 缓存与性能
  ICON_CACHE_MAX_SIZE: 120,
  ICON_LRU_MAX: 80,
  CFG_PAGE_BATCH: 40,
  CFG_ICON_CACHE_MAX: 120,
  CFG_ICON_FAIL_TTL_MS: 15000,
  CFG_ICON_FAIL_MAX_RETRY: 2,
  CFG_ICON_LOAD_CONCURRENCY: 2,

  // 日志与监控
  LOG_KEEP_DAYS: 3,
  MAX_LOG_ROWS: 20,
  MEMORY_CHECK_INTERVAL_MS: 30000,
  MEMORY_HIGH_THRESHOLD: 0.75
};

// # 配置落盘：去抖合并写入延迟（ms）
// =======================【文件 IO 工具】======================
var FileIO = {
    ensureDir: function(dir) {
        try {
            var f = new java.io.File(dir);
            if (!f.exists()) f.mkdirs();
            return f.exists();
        } catch (e) { return false; }
    },
    readText: function(path) {
        // 这段代码的主要内容/用途：读取 UTF-8 文本文件内容，并确保流被正确关闭，避免 system_server 长时间运行下的句柄泄漏。
        var fis = null;
        var isr = null;
        var br = null;
        try {
            var f = new java.io.File(path);
            if (!f.exists()) return null;
            fis = new java.io.FileInputStream(f);
            isr = new java.io.InputStreamReader(fis, "UTF-8");
            br = new java.io.BufferedReader(isr);
            var sb = new java.lang.StringBuilder();
            var line;
            while ((line = br.readLine()) != null) sb.append(line).append("\n");
            return sb.toString();
        } catch (e) {
            return null;
        } finally {
            try { if (br) br.close(); } catch (e1) {}
            try { if (isr) isr.close(); } catch (e2) {}
            try { if (fis) fis.close(); } catch (e3) {}
        }
    },
    writeText: function(path, content) {
        // 这段代码的主要内容/用途：写入 UTF-8 文本文件内容，并确保流被正确关闭，避免 system_server 资源泄漏。
        var fos = null;
        var osw = null;
        try {
            var f = new java.io.File(path);
            var p = f.getParentFile();
            if (p && !p.exists()) p.mkdirs();
            fos = new java.io.FileOutputStream(f);
            osw = new java.io.OutputStreamWriter(fos, "UTF-8");
            osw.write(String(content));
            osw.flush();
            return true;
        } catch (e) {
            return false;
        } finally {
            try { if (osw) osw.close(); } catch (e1) {}
            try { if (fos) fos.close(); } catch (e2) {}
        }
    },

    // =======================【文件写入：原子写 + 去抖合并】=======================
    // 这段代码的主要内容/用途：提供"原子写入"和"去抖合并写入"，降低频繁写 JSON 配置带来的卡顿/抖动风险。
    // # 注意：为保证功能与 UI 不受影响，本次仅替换配置落盘方式，不改变上层调用时机与数据结构。
    // # 兼容性：系统 Server 常驻环境下优先保证"尽量不写坏文件"，失败时回退到普通 writeText。
    _debounceTimer: null,
    _debounceJobs: {},
    _ensureDebounceTimer: function() {
        try {
            if (!this._debounceTimer) {
                this._debounceTimer = new java.util.Timer("sx-toolhub-filewrite", true);
            }
        } catch (e) {
            // ignore
        }
    },
    writeTextAtomic: function(path, content) {
        // 这段代码的主要内容/用途：原子写入 UTF-8 文本：写临时文件 -> flush+sync -> rename 覆盖。
        var fos = null;
        var osw = null;
        var tmpFile = null;
        var bakFile = null;
        try {
            var target = new java.io.File(String(path));
            var dir = target.getParentFile();
            if (dir && !dir.exists()) dir.mkdirs();

            var tmpName = target.getName() + ".tmp." + String(java.lang.System.nanoTime());
            tmpFile = new java.io.File(dir, tmpName);

            fos = new java.io.FileOutputStream(tmpFile);
            osw = new java.io.OutputStreamWriter(fos, "UTF-8");
            osw.write(String(content));
            osw.flush();
            try { fos.getFD().sync(); } catch (eSync) {}

            try { if (osw) osw.close(); } catch (eC1) {}
            try { if (fos) fos.close(); } catch (eC2) {}
            osw = null;
            fos = null;

            // # 备份旧文件，避免 rename 覆盖失败时丢失
            bakFile = new java.io.File(dir, target.getName() + ".bak");
            try { if (bakFile.exists()) bakFile["delete"](); } catch (eDelBak0) {}

            var hasBackup = false;
            if (target.exists()) {
                try { hasBackup = target.renameTo(bakFile); } catch (eMv0) { hasBackup = false; }
                if (!hasBackup) {
                    try { if (tmpFile && tmpFile.exists()) tmpFile["delete"](); } catch (eDel0) {}
                    return this.writeText(path, content);
                }
            }

            var ok = false;
            try { ok = tmpFile.renameTo(target); } catch (eRn0) { ok = false; }
            if (!ok) {
                // # 恢复备份
                try {
                    if (hasBackup && bakFile && bakFile.exists() && !target.exists()) {
                        bakFile.renameTo(target);
                    }
                } catch (eRv0) {}
                try { if (tmpFile && tmpFile.exists()) tmpFile["delete"](); } catch (eDelTmp0) {}
                // # 回退普通写（尽力而为）
                return this.writeText(path, content);
            }

            try { if (bakFile && bakFile.exists()) bakFile["delete"](); } catch (eDelBak1) {}
            return true;
        } catch (e) {
            try { if (osw) osw.close(); } catch (e1) {}
            try { if (fos) fos.close(); } catch (e2) {}
            try { if (tmpFile && tmpFile.exists()) tmpFile["delete"](); } catch (e3) {}
            // # 原子写失败则回退普通写
            return this.writeText(path, content);
        }
    },
    writeTextDebounced: function(path, content, delayMs) {
        // 这段代码的主要内容/用途：对同一路径的连续写请求做去抖合并，只落盘最后一次内容。
        var p = String(path);
        var d = 0;
        try { d = parseInt(String(delayMs), 10); } catch (eD0) { d = 0; }
        if (isNaN(d) || d < 0) d = 0;

        this._ensureDebounceTimer();

        var old = this._debounceJobs[p];
        if (old && old.task) {
            try { old.task.cancel(); } catch (eC0) {}
        }

        var self = this;
        var payload = String(content);
        var version = 0;
        try {
            if (old && old.version) version = old.version;
        } catch (eV0) { version = 0; }
        version = version + 1;
        var task = null;
        try {
            task = new JavaAdapter(java.util.TimerTask, {
                run: function() {
                    var liveJob = null;
                    try { liveJob = self._debounceJobs[p]; } catch (eR0) { liveJob = null; }
                    if (!liveJob || liveJob.version !== version) return;
                    try { self.writeTextAtomic(p, payload); } catch (eW0) { try { self.writeText(p, payload); } catch (eW0b) {} }
                    try {
                        if (self._debounceJobs[p] && self._debounceJobs[p].version === version) delete self._debounceJobs[p];
                    } catch (eW1) { self._debounceJobs[p] = null; }
                }
            });
        } catch (eT0) {
            // # JavaAdapter 失败则直接写入（仍保证功能不受影响）
            try { self.writeTextAtomic(p, payload); } catch (eT1) { self.writeText(p, payload); }
            try { delete self._debounceJobs[p]; } catch (eT2) {}
            return true;
        }

        var tsNow = 0;
        try { tsNow = new Date().getTime(); } catch (eNow0) { tsNow = 0; }

        this._debounceJobs[p] = { task: task, ts: tsNow, payload: payload, version: version, delayMs: d, path: p };

        // # 修复：Rhino 作用域下 now() 未定义导致"保存所有"报错，改用 Date.getTime() 生成时间戳

        try {
            if (this._debounceTimer) this._debounceTimer.schedule(task, d);
            else this.writeTextAtomic(p, payload);
        } catch (eS0) {
            // # schedule 失败则立即写入
            try { this.writeTextAtomic(p, payload); } catch (eS1) { this.writeText(p, payload); }
            try { delete this._debounceJobs[p]; } catch (eS2) {}
        }
        return true;
    },
    flushDebouncedWrites: function() {
        // 这段代码的主要内容/用途：立即落盘所有待写内容，并清空待写队列，确保 close/dispose 前最后一次修改不会丢失。
        try {
            for (var k in this._debounceJobs) {
                var job = this._debounceJobs[k];
                if (!job) continue;
                try { if (job.task) job.task.cancel(); } catch (eC0) {}
                try {
                    if (job.payload != null) this.writeTextAtomic(k, job.payload);
                } catch (eW0) {
                    try { this.writeText(k, job.payload); } catch (eW1) {}
                }
                try { delete this._debounceJobs[k]; } catch (eD0) { this._debounceJobs[k] = null; }
            }
            if (this._debounceTimer) {
                try { this._debounceTimer.cancel(); } catch (eC1) {}
                try { this._debounceTimer.purge(); } catch (eP0) {}
                this._debounceTimer = null;
            }
        } catch (e) {}
    },
    appendText: function(path, content) {
        // 这段代码的主要内容/用途：追加 UTF-8 文本到文件，并确保流被正确关闭，避免 system_server 资源泄漏。
        var fos = null;
        var osw = null;
        try {
            var f = new java.io.File(path);
            var p = f.getParentFile();
            if (p && !p.exists()) p.mkdirs();
            fos = new java.io.FileOutputStream(f, true);
            osw = new java.io.OutputStreamWriter(fos, "UTF-8");
            osw.write(String(content));
            osw.flush();
            return true;
        } catch (e) {
            return false;
        } finally {
            try { if (osw) osw.close(); } catch (e1) {}
            try { if (fos) fos.close(); } catch (e2) {}
        }
    }
};


// =======================【工具：Base64 编码（UTF-8）】=======================
function encodeBase64Utf8(str) {
  try {
    var s = String(str || "");
    var bytes = new java.lang.String(s).getBytes("UTF-8");
    return java.lang.String(android.util.Base64.encode(bytes, android.util.Base64.NO_WRAP));
  } catch (e) { return ""; }
}


// # 系统级跨用户启动（可供快捷方式 JS 模板调用）
// 这段代码的主要内容/用途：在指定 userId 下解析并启动 intentUri，优先使用 Context.startActivityAsUser；失败时返回 err 供上层选择是否回退 Shell。
function startIntentAsUserByUri(intentUri, userId) {
  // # 局部反射缓存（避免每次点击都重复 Class.forName/getMethod/getField）
  var __th_cache = startIntentAsUserByUri.__cache;
  if (!__th_cache) {
    __th_cache = { ok: false };
    try {
      var I0 = java.lang.Class.forName("android.content.Intent");
      var U0 = java.lang.Class.forName("android.os.UserHandle");
      var S0 = java.lang.Class.forName("java.lang.String");
      var T0 = java.lang.Integer.TYPE;
      __th_cache.IntentClz = I0;
      __th_cache.UserHandleClz = U0;
      __th_cache.StringClz = S0;
      __th_cache.IntType = T0;
      __th_cache.parseUriM = I0.getMethod("parseUri", S0, T0);
      __th_cache.flagNewTask = I0.getField("FLAG_ACTIVITY_NEW_TASK").getInt(null);
      __th_cache.ofM = U0.getMethod("of", T0);
      __th_cache.startAsUserM = context.getClass().getMethod("startActivityAsUser", I0, U0);
      __th_cache.zeroInt = new java.lang.Integer(0);
      __th_cache.ok = true;
      startIntentAsUserByUri.__cache = __th_cache;
    } catch (eInit) {
      __th_cache.ok = false;
      __th_cache.err = String(eInit);
      startIntentAsUserByUri.__cache = __th_cache;
    }
  }

  var ret = { ok: false, err: "", via: "" };
  try {
    var u = 0;
    try { u = parseInt(String(userId), 10); } catch(eU0) { u = 0; }
    if (isNaN(u)) u = 0;

    var it;
    var uh;
    if (__th_cache && __th_cache.ok) {
      it = __th_cache.parseUriM.invoke(null, String(intentUri), __th_cache.zeroInt);
      it.addFlags(__th_cache.flagNewTask);
      uh = __th_cache.ofM.invoke(null, new java.lang.Integer(u));
      __th_cache.startAsUserM.invoke(context, it, uh);
    } else {
      var I = java.lang.Class.forName("android.content.Intent");
      var U = java.lang.Class.forName("android.os.UserHandle");
      var S = java.lang.Class.forName("java.lang.String");
      var T = java.lang.Integer.TYPE;
      it = I.getMethod("parseUri", S, T).invoke(null, String(intentUri), new java.lang.Integer(0));
      it.addFlags(I.getField("FLAG_ACTIVITY_NEW_TASK").getInt(null));
      uh = U.getMethod("of", T).invoke(null, new java.lang.Integer(u));
      context.getClass().getMethod("startActivityAsUser", I, U).invoke(context, it, uh);
    }

    ret.ok = true;
    ret.via = "js_startActivityAsUser";
    return ret;
  } catch (e) {
    ret.ok = false;
    ret.err = String(e);
    ret.via = "js_startActivityAsUser";
    return ret;
  }
}

// =======================【配置管理】======================
var ConfigManager = {
    _settingsCache: null,
    _buttonsCache: null,
    defaultSettings: {
        DOCK_AFTER_IDLE_MS: 1500,
        PANEL_IDLE_CLOSE_AND_DOCK_MS: 5000,
        EDGE_VISIBLE_RATIO: 0.70,
        ENABLE_SNAP_TO_EDGE: true,
        ENABLE_ANIMATIONS: true,
        DOCK_ANIM_MS: 260,
        UNDOCK_ANIM_MS: 180,
        SAVE_THROTTLE_MS: 220,
        LONG_PRESS_HAPTIC_ENABLE: true,
        LONG_PRESS_VIBRATE_MS: 18,
        ENABLE_LONG_PRESS: true,
        LONG_PRESS_MS: 520,
        LONG_PRESS_TRIGGERED_MOVE_SLOP_DP: 28,
        CLICK_SLOP_DP: 6,
        TOOLAPP_BACK_GESTURE_MODE: "surface",
        TOOLAPP_BACK_EDGE_WIDTH_DP: 72,
        TOOLAPP_BACK_COMMIT_DISTANCE_DP: 36,
        TOOLAPP_BACK_SURFACE_SLOP_DP: 24,
        TOOLAPP_BACK_PROGRESS_DISTANCE_DP: 96,
        ENABLE_BOUNCE: true,
        BOUNCE_TIMES: 2,
        BOUNCE_MAX_SCALE: 0.88,
        BOUNCE_STEP_MS: 90,
        BOUNCE_DECAY: 0.72,
        BALL_SIZE_DP: 45,
        BALL_ICON_TYPE: "app",
        BALL_ICON_PKG: CONST_SHORTX_PACKAGE,
        BALL_ICON_FILE_PATH: APP_ROOT_DIR + "/ball.png",
        BALL_ICON_FILE_MAX_PX: 512,
        BALL_ICON_RES_NAME: "",
        BALL_ICON_SIZE_DP: 22,
        BALL_ICON_TINT_HEX: "",
        BALL_BG_COLOR_HEX: "",
        BALL_IDLE_ALPHA: 0.6,
        POINTER_SCALE_PERCENT: 100,
        POINTER_EDGE_ZONE_X_DP: 48,
        POINTER_EDGE_ZONE_Y_DP: 72,
        POINTER_TEXT_HOVER_MS: 800,
        POINTER_AREA_HOVER_MS: 1000,
        POINTER_COLOR_NORMAL_HEX: "",
        POINTER_COLOR_HIT_HEX: "",
        POINTER_COLOR_AREA_HEX: "",
        PANEL_POS_GRAVITY: "bottom",
        PANEL_CUSTOM_OFFSET_Y: 0,
        PANEL_COLS: 1,
        PANEL_ROWS: 4,
        PANEL_ITEM_SIZE_DP: 60,
        PANEL_GAP_DP: 5,
        PANEL_PADDING_DP: 7,
        PANEL_ICON_SIZE_DP: 32,
        PANEL_LABEL_ENABLED: true,
        PANEL_LABEL_TEXT_SIZE_SP: 12,
        PANEL_LABEL_TOP_MARGIN_DP: 4,
        PANEL_BG_ALPHA: 0.85,
        SETTINGS_THEME: "animal",
        THEME_MODE: 1,
        THEME_DAY_BG_HEX: null,
        THEME_DAY_TEXT_HEX: null,
        THEME_NIGHT_BG_HEX: null,
        THEME_NIGHT_TEXT_HEX: null,
        BALL_PANEL_GAP_DP: 10,
        LOG_ENABLE: true,
        LOG_DEBUG: true,
        LOG_KEEP_DAYS: 3
    },
    defaultButtons: [
        // # 默认按钮已迁移至 buttons.json
        // # Default buttons migrated to buttons.json
    ],
    defaultSchema: [
        { type: "section", name: "外观" },
        { key: "SETTINGS_THEME", name: "设置页主题", type: "single_choice", options: [
            { label: "动物岛风", value: "animal" },
            { label: "系统莫奈色", value: "monet" }
        ]},
        { key: "THEME_MODE", name: "主题模式", type: "single_choice", options: [
            { label: "跟随系统", value: 0 },
            { label: "浅色", value: 1 },
            { label: "深色", value: 2 }
        ]},
        { key: "THEME_DAY_BG_HEX", name: "日间背景色(#RRGGBB)", type: "text" },
        { key: "THEME_DAY_TEXT_HEX", name: "日间文字色(#RRGGBB)", type: "text" },
        { key: "THEME_NIGHT_BG_HEX", name: "夜间背景色(#RRGGBB)", type: "text" },
        { key: "THEME_NIGHT_TEXT_HEX", name: "夜间文字色(#RRGGBB)", type: "text" },
        { key: "PANEL_BG_ALPHA", name: "面板背景透明度(0.1~1.0)", type: "float", min: 0.1, max: 1.0, step: 0.05 },

        { type: "section", name: "悬浮球" },
        { key: "BALL_SIZE_DP", name: "悬浮球大小", type: "int", min: 20, max: 200, step: 1 },
        { key: "BALL_PANEL_GAP_DP", name: "球与面板距离", type: "int", min: 0, max: 50, step: 1 },
        { key: "BALL_ICON_TYPE", name: "悬浮球图标来源", type: "single_choice", options: [
            { label: "应用图标", value: "app" },
            { label: "本地文件", value: "file" },
            { label: "内置图标库", value: "shortx" }
        ]},
        { key: "BALL_ICON_FILE_PATH", name: "已选择的图标文件", type: "text" },
        { key: "BALL_ICON_RES_NAME", name: "内置图标", type: "ball_shortx_icon" },
        { key: "BALL_ICON_TINT_HEX", name: "图标颜色", type: "ball_color" },
        { key: "BALL_ICON_SIZE_DP", name: "图标大小", type: "int", min: 12, max: 80, step: 1 },
        { key: "BALL_BG_COLOR_HEX", name: "球体背景", type: "ball_color" },
        { key: "BALL_IDLE_ALPHA", name: "安静时透明度", type: "float", min: 0.1, max: 1.0, step: 0.05 },

        { type: "section", name: "指针" },
        { key: "POINTER_SCALE_PERCENT", name: "指针大小(%)", type: "int", min: 70, max: 140, step: 5 },
        { key: "POINTER_EDGE_ZONE_X_DP", name: "横向贴边范围(dp)", type: "int", min: 16, max: 96, step: 1 },
        { key: "POINTER_EDGE_ZONE_Y_DP", name: "纵向贴边范围(dp)", type: "int", min: 24, max: 128, step: 1 },
        { key: "POINTER_TEXT_HOVER_MS", name: "悬停取字时间(ms)", type: "int", min: 300, max: 1500, step: 50 },
        { key: "POINTER_AREA_HOVER_MS", name: "悬停框选时间(ms)", type: "int", min: 500, max: 2000, step: 50 },
        { key: "POINTER_COLOR_NORMAL_HEX", name: "指针普通颜色", type: "ball_color" },
        { key: "POINTER_COLOR_HIT_HEX", name: "取字命中颜色", type: "ball_color" },
        { key: "POINTER_COLOR_AREA_HEX", name: "框选状态颜色", type: "ball_color" },

        { type: "section", name: "面板布局" },
        { key: "PANEL_ROWS", name: "面板可视行数", type: "int", min: 1, max: 10, step: 1 },
        { key: "PANEL_COLS", name: "面板列数", type: "int", min: 1, max: 6, step: 1 },
        { key: "PANEL_ITEM_SIZE_DP", name: "面板单元格(dp)", type: "int", min: 48, max: 120, step: 1 },
        { key: "PANEL_GAP_DP", name: "按钮间距(dp)", type: "int", min: 4, max: 24, step: 1 },
        { key: "PANEL_PADDING_DP", name: "面板内边距(dp)", type: "int", min: 8, max: 32, step: 1 },
        { key: "PANEL_ICON_SIZE_DP", name: "面板图标大小(dp)", type: "int", min: 16, max: 64, step: 1 },

        { type: "section", name: "面板文字" },
        { key: "PANEL_LABEL_ENABLED", name: "显示按钮文字", type: "bool" },
        { key: "PANEL_LABEL_TEXT_SIZE_SP", name: "文字大小(sp)", type: "int", min: 8, max: 24, step: 1 },
        { key: "PANEL_LABEL_TOP_MARGIN_DP", name: "文字上边距(dp)", type: "int", min: 0, max: 20, step: 1 },

        { type: "section", name: "吸边与位置" },
        { key: "PANEL_POS_GRAVITY", name: "面板默认位置", type: "single_choice", options: [
            { label: "自动 (Auto)", value: "auto" },
            { label: "下方 (Bottom)", value: "bottom" },
            { label: "上方 (Top)", value: "top" }
        ]},
        { key: "PANEL_CUSTOM_OFFSET_Y", name: "手动垂直偏移(dp)", type: "int", min: -500, max: 500, step: 1 },
        { key: "ENABLE_SNAP_TO_EDGE", name: "启用自动吸边", type: "bool" },
        { key: "DOCK_AFTER_IDLE_MS", name: "无操作吸边延迟(ms)", type: "int", min: 200, max: 8000, step: 100 },
        { key: "PANEL_IDLE_CLOSE_AND_DOCK_MS", name: "面板无操作：关面板再吸边(ms)", type: "int", min: 200, max: 12000, step: 100 },
        { key: "EDGE_VISIBLE_RATIO", name: "吸边露出比例", type: "float", min: 0.30, max: 1.00, step: 0.05 },
        { key: "SAVE_THROTTLE_MS", name: "保存位置节流(ms)", type: "int", min: 0, max: 5000, step: 10 },

        { type: "section", name: "动画" },
        { key: "ENABLE_ANIMATIONS", name: "启用动画效果", type: "bool" },
        { key: "DOCK_ANIM_MS", name: "吸边动画时长(ms)", type: "int", min: 50, max: 2000, step: 10 },
        { key: "UNDOCK_ANIM_MS", name: "退出吸边动画时长(ms)", type: "int", min: 50, max: 2000, step: 10 },
        { key: "ENABLE_BOUNCE", name: "启用点击回弹", type: "bool" },
        { key: "BOUNCE_TIMES", name: "回弹次数", type: "int", min: 1, max: 8, step: 1 },
        { key: "BOUNCE_MAX_SCALE", name: "回弹最小缩放(0~1)", type: "float", min: 0.60, max: 0.99, step: 0.01 },
        { key: "BOUNCE_STEP_MS", name: "回弹步进时长(ms)", type: "int", min: 20, max: 500, step: 10 },
        { key: "BOUNCE_DECAY", name: "回弹衰减(0~1)", type: "float", min: 0.30, max: 0.95, step: 0.01 },

        { type: "section", name: "动作与手势" },
        { key: "CLICK_SLOP_DP", name: "点击位移阈值(dp)", type: "int", min: 2, max: 20, step: 1 },
        { key: "TOOLAPP_BACK_GESTURE_MODE", name: "设置页滑动返回模式", type: "single_choice", options: [
            { label: "全表面横滑", value: "surface" },
            { label: "仅面板内部左右边缘", value: "edge" },
            { label: "关闭", value: "off" }
        ]},
        { key: "TOOLAPP_BACK_EDGE_WIDTH_DP", name: "内部边缘起手宽度", type: "int", min: 1, max: 120, step: 1 },
        { key: "TOOLAPP_BACK_COMMIT_DISTANCE_DP", name: "设置页返回触发距离", type: "int", min: 1, max: 480, step: 1 },
        { key: "TOOLAPP_BACK_SURFACE_SLOP_DP", name: "表面横滑起手阈值", type: "int", min: 8, max: 96, step: 1 },
        { key: "TOOLAPP_BACK_PROGRESS_DISTANCE_DP", name: "设置页返回动画距离", type: "int", min: 1, max: 720, step: 1 },
        { key: "ENABLE_LONG_PRESS", name: "启用长按", type: "bool" },
        { key: "LONG_PRESS_MS", name: "长按判定(ms)", type: "int", min: 200, max: 2000, step: 10 },
        { key: "LONG_PRESS_TRIGGERED_MOVE_SLOP_DP", name: "长按后抖动容忍距离", type: "int", min: 8, max: 80, step: 1 },
        { key: "LONG_PRESS_HAPTIC_ENABLE", name: "长按震动反馈", type: "bool" },
        { key: "LONG_PRESS_VIBRATE_MS", name: "长按震动时长(ms)", type: "int", min: 10, max: 100, step: 1 },

        { type: "section", name: "日志" },
        { key: "LOG_ENABLE", name: "写文件日志", type: "bool" },
        { key: "LOG_DEBUG", name: "详细日志（DEBUG）", type: "bool" },
        { key: "LOG_KEEP_DAYS", name: "日志保留天数", type: "int", min: 1, max: 30, step: 1 }
    ],
    _schemaCache: null,
    loadSchema: function(forceReload) {
        if (!forceReload && this._schemaCache) return this._schemaCache;
        var txt = FileIO.readText(PATH_SCHEMA);

        // # 容错重试
        if (!txt) {
            try {
                var f = new java.io.File(PATH_SCHEMA);
                if (f.exists()) {
                    java.lang.Thread.sleep(200);
                    txt = FileIO.readText(PATH_SCHEMA);
                }
            } catch(e) {}
        }

        var s = null;
        if (txt) {
            try { s = JSON.parse(txt); } catch (e) {}
        }

        // 检查 Schema 完整性：如果缺少新添加的关键字段，则强制更新
    // 这解决了脚本更新后，旧的 schema.json 缓存导致新开关不显示的问题
    var needReset = false;
    if (s) {
        var sStr = JSON.stringify(s);
        if (sStr.indexOf("ENABLE_SNAP_TO_EDGE") < 0 || sStr.indexOf("ENABLE_ANIMATIONS") < 0 || sStr.indexOf("BALL_IDLE_ALPHA") < 0 || sStr.indexOf("PANEL_POS_GRAVITY") < 0 || sStr.indexOf("single_choice") < 0 || sStr.indexOf("ball_shortx_icon") < 0 || sStr.indexOf("ball_color") < 0 || sStr.indexOf("SETTINGS_THEME") < 0 || sStr.indexOf("BALL_BG_COLOR_HEX") < 0 || sStr.indexOf("BALL_ICON_SIZE_DP") < 0 || sStr.indexOf("TOOLAPP_BACK_GESTURE_MODE") < 0 || sStr.indexOf("TOOLAPP_BACK_EDGE_WIDTH_DP") < 0 || sStr.indexOf("TOOLAPP_BACK_COMMIT_DISTANCE_DP") < 0 || sStr.indexOf("TOOLAPP_BACK_SURFACE_SLOP_DP") < 0 || sStr.indexOf("TOOLAPP_BACK_PROGRESS_DISTANCE_DP") < 0 || sStr.indexOf("LONG_PRESS_TRIGGERED_MOVE_SLOP_DP") < 0 || sStr.indexOf("POINTER_SCALE_PERCENT") < 0) {
            needReset = true;
        }
        if (!needReset && (sStr.indexOf("ENABLE_TOOLAPP_INNER_BACK_STRIPS") >= 0 || sStr.indexOf("ENABLE_TOOLAPP_SCREEN_BACK_STRIPS") >= 0)) {
            needReset = true;
        }

        // 旧 schema.json 可能已经含有 key，但 UI 文案/范围仍是旧值；关键字段不一致时也强制刷新
        var findSchemaItemByKey = function(arr, key) {
            if (!arr) return null;
            for (var i = 0; i < arr.length; i++) {
                var it = arr[i];
                if (it && it.key === key) return it;
                var child = null;
                if (it && it.children) child = findSchemaItemByKey(it.children, key);
                if (!child && it && it.items) child = findSchemaItemByKey(it.items, key);
                if (child) return child;
            }
            return null;
        };
        var schemaItemDiffers = function(key, fields) {
            var cur = findSchemaItemByKey(s, key);
            var def = findSchemaItemByKey(ConfigManager.defaultSchema, key);
            if (!cur || !def) return true;
            for (var i = 0; i < fields.length; i++) {
                var f = fields[i];
                if (typeof def[f] !== "undefined" && String(cur[f]) !== String(def[f])) return true;
            }
            return false;
        };
        if (!needReset) {
            if (schemaItemDiffers("BALL_ICON_TINT_HEX", ["name", "type"]) ||
                schemaItemDiffers("BALL_ICON_SIZE_DP", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("BALL_BG_COLOR_HEX", ["name", "type"]) ||
                schemaItemDiffers("TOOLAPP_BACK_GESTURE_MODE", ["name", "type"]) ||
                schemaItemDiffers("TOOLAPP_BACK_EDGE_WIDTH_DP", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("TOOLAPP_BACK_COMMIT_DISTANCE_DP", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("TOOLAPP_BACK_SURFACE_SLOP_DP", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("TOOLAPP_BACK_PROGRESS_DISTANCE_DP", ["name", "type", "min", "max", "step"]) ||
                schemaItemDiffers("LONG_PRESS_TRIGGERED_MOVE_SLOP_DP", ["name", "type", "min", "max", "step"])) {
                needReset = true;
            }
        }
    } else {
        // # 仅当文件不存在时才标记为需要重置（新建），避免因读取失败导致覆盖
        try {
            var f = new java.io.File(PATH_SCHEMA);
            if (!f.exists()) needReset = true;
        } catch(e) { needReset = true; }
    }

        if (needReset) {
            s = JSON.parse(JSON.stringify(this.defaultSchema));
            // # 原子写：避免 schema.json 写一半导致后续解析失败
            FileIO.writeTextAtomic(PATH_SCHEMA, JSON.stringify(s, null, 2));
        }

        this._schemaCache = s;
        return s;
    },
    saveSchema: function(s) {
        this._schemaCache = s;
        // # 去抖合并：短时间多次保存仅落盘最后一次（不影响 UI/功能）
        return FileIO.writeTextDebounced(PATH_SCHEMA, JSON.stringify(s, null, 2), CONST_CONFIG_SAVE_DEBOUNCE_MS);
    },
    resetSchema: function() {
        var s = JSON.parse(JSON.stringify(this.defaultSchema));
        this.saveSchema(s);
        return s;
    },
    loadSettings: function(forceReload) {
        if (!forceReload && this._settingsCache) return this._settingsCache;

        var txt = FileIO.readText(PATH_SETTINGS);
        // # 容错重试：如果读取失败但文件存在（可能是启动时 IO 繁忙），稍后重试一次
        if (!txt) {
            try {
                var f = new java.io.File(PATH_SETTINGS);
                if (f.exists()) {
                    java.lang.Thread.sleep(200);
                    txt = FileIO.readText(PATH_SETTINGS);
                }
            } catch(e) {}
        }

        var merged = JSON.parse(JSON.stringify(this.defaultSettings));
        var loaded = false;

        if (txt) {
            try {
                var user = JSON.parse(txt);
                // 合并用户设置（允许新增键值）
                for (var k in user) {
                    merged[k] = user[k];
                }
                loaded = true;
            } catch (e) {}
        }

        // # 仅当文件不存在时才写入默认值，避免因读取失败导致用户配置被覆盖
        if (!loaded) {
             try {
                 var f = new java.io.File(PATH_SETTINGS);
                 if (!f.exists()) {
                     // # 原子写：避免 settings.json 写一半导致配置损坏
                     FileIO.writeTextAtomic(PATH_SETTINGS, JSON.stringify(merged, null, 2));
                 }
             } catch(e) {}
        }

        this._settingsCache = ConfigValidator.sanitizeConfig(merged);
        return this._settingsCache;
    },
    saveSettings: function(obj) {
        // # 保存前进行配置校验，防止无效值写入
        var sanitized = ConfigValidator.sanitizeConfig(obj);
        this._settingsCache = sanitized;
        // # 去抖合并：短时间多次保存仅落盘最后一次（不影响 UI/功能）
        return FileIO.writeTextDebounced(PATH_SETTINGS, JSON.stringify(sanitized, null, 2), CONST_CONFIG_SAVE_DEBOUNCE_MS);
    },
    saveButtons: function(btns) {
        this._buttonsCache = btns;
        // # 去抖合并：短时间多次保存仅落盘最后一次（不影响 UI/功能）
        return FileIO.writeTextDebounced(PATH_BUTTONS, JSON.stringify(btns, null, 2), CONST_CONFIG_SAVE_DEBOUNCE_MS);
    },
    loadButtons: function(forceReload) {
        if (!forceReload && this._buttonsCache) return this._buttonsCache;

        var txt = FileIO.readText(PATH_BUTTONS);
        // # 容错重试
        if (!txt) {
            try {
                var f = new java.io.File(PATH_BUTTONS);
                if (f.exists()) {
                    java.lang.Thread.sleep(200);
                    txt = FileIO.readText(PATH_BUTTONS);
                }
            } catch(e) {}
        }

        var btns = null;
        if (txt) {
            try { btns = JSON.parse(txt); } catch (e) {}
        }

        var dirty = false;
        if (!btns) {
            // # 仅当文件不存在时才使用默认值并写入
            try {
                var f = new java.io.File(PATH_BUTTONS);
                if (!f.exists()) {
                    btns = JSON.parse(JSON.stringify(this.defaultButtons));
                    dirty = true;
                }
            } catch(e) {}

            // # 如果 btns 仍为空（读取失败且文件存在），则暂时返回默认值但不回写 dirty
            if (!btns) {
                // # 救援模式：如果配置文件损坏，提供一个"关闭"按钮，防止无法退出
                btns = [
                    { title: "Rescue: Close", type: "broadcast", action: "shortx.wm.floatball.CLOSE", iconResName: "ic_menu_close_clear_cancel" }
                ];
                // dirty = false; // 默认就是 false
            }
        }

        // Upgrade
        if (btns) {
            for (var i=0; i<btns.length; i++) {
                var b = btns[i];

                // # 兼容升级：增加 enabled 字段（按钮管理页可禁用/启用；禁用后按钮页不显示）
                // # 说明：旧版 buttons.json 没有 enabled，默认视为启用=true
                if (typeof b.enabled === "undefined") {
                    b.enabled = true;
                    dirty = true;
                }

                if (b.type === "shell" && b.cmd && !b.cmd_b64) {
                    b.cmd_b64 = encodeBase64Utf8(b.cmd);
                    dirty = true;
                }
            }
        }

        if (dirty) {
            // # 原子写：升级修复字段时落盘，避免写坏 buttons.json
            FileIO.writeTextAtomic(PATH_BUTTONS, JSON.stringify(btns, null, 2));
        }

        this._buttonsCache = btns;
        return btns;
    }
};

// =======================【基础工具：进程输出】=======================
function getProcessInfo(tag) {
  var info = {
    tag: tag || "",
    uid: -1,
    pid: -1,
    tid: -1,
    packageName: "",
    processName: "",
    threadName: "",
    hasMyLooper: false,
    looperIsMain: false
  };

  try { info.uid = android.os.Process.myUid(); } catch (e0) {}
  try { info.pid = android.os.Process.myPid(); } catch (e1) {}
  try { info.tid = android.os.Process.myTid(); } catch (e2) {}

  try { info.packageName = String(context.getPackageName()); } catch (e3) {}
  try { info.threadName = String(java.lang.Thread.currentThread().getName()); } catch (e4) {}
  try { info.hasMyLooper = (android.os.Looper.myLooper() !== null); } catch (e5) {}
  try {
    var mainLooper = android.os.Looper.getMainLooper();
    var myLooper = android.os.Looper.myLooper();
    info.looperIsMain = (myLooper !== null && mainLooper !== null && myLooper === mainLooper);
  } catch (e6) {}

  try {
    var fis = new java.io.FileInputStream("/proc/self/cmdline");
    var bos = new java.io.ByteArrayOutputStream();
    var buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 256);
    while (true) {
      var n = fis.read(buf);
      if (n <= 0) break;
      bos.write(buf, 0, n);
      if (bos.size() >= 4096) break;
    }
    try { fis.close(); } catch (eC) {}
    var raw = new java.lang.String(bos.toByteArray());
    var p = String(raw).split("\u0000")[0];
    if (p && p.length > 0) info.processName = p;
  } catch (e7) {}

  if (!info.processName) {
    try {
      var am = context.getSystemService(android.content.Context.ACTIVITY_SERVICE);
      var list = am.getRunningAppProcesses();
      if (list) {
        var i;
        for (i = 0; i < list.size(); i++) {
          var rp = list.get(i);
          if (rp && rp.pid === info.pid) {
            info.processName = String(rp.processName);
            break;
          }
        }
      }
    } catch (e8) {}
  }

  return info;
}


// =======================【工具：Base64 解码（UTF-8）】=======================
// # 这段代码的主要内容/用途：把 cmd_b64 还原成原始 shell 文本
function decodeBase64Utf8(b64) {
  try {
    var s = String(b64 || "");
    if (!s) return "";
    // # 兼容：优先按 NO_WRAP 解码（与 encodeBase64Utf8 一致），失败再用 DEFAULT 兜底
    var bytes = null;
    try {
      bytes = android.util.Base64.decode(s, android.util.Base64.NO_WRAP);
    } catch (e0) {
      bytes = android.util.Base64.decode(s, android.util.Base64.DEFAULT);
    }
    return new java.lang.String(bytes, "UTF-8");
  } catch (e) {
    return "";
  }
}

// =======================【工具：字符串替换占位符】=======================
function applyRule(rule, kv) {
  var s = String(rule || "");
  if (!s) return s;
  var k;
  for (k in kv) {
    if (!kv.hasOwnProperty(k)) continue;
    var token = "{" + String(k) + "}";
    s = s.split(token).join(String(kv[k]));
  }
  return s;
}

// =======================【日志：文件写入器（尽力落盘 + 自动清理旧日志）】=======================
function sanitizeLogMessage(msg) {
  try {
    var s = String(msg == null ? "" : msg);
    s = s.replace(/(authorization\s*[:=]\s*bearer\s+)[^\s,;]+/ig, "$1[REDACTED]");
    s = s.replace(/((access_)?token|api[_-]?key|password|passwd|secret)(\s*[=:]\s*)[^\s,;]+/ig, "$1$3[REDACTED]");
    return s;
  } catch (e) { return String(msg == null ? "" : msg); }
}

function ToolHubLogger(procInfo) {
  this.proc = procInfo || {};
  this.dir = PATH_LOG_DIR;
  this.prefix = "ShortX_ToolHub";
  this.keepDays = 3;
  this.enable = true;
  this.debug = false;
  this.initOk = false;
  this.lastInitErr = "";
  this._initOnce();
}

ToolHubLogger.prototype._now = function() { return new Date().getTime(); };
ToolHubLogger.prototype._initOnce = function() {
  try {
    if (FileIO.ensureDir(this.dir)) {
      this.initOk = true;
      this.cleanupOldFiles();
    } else {
      this.initOk = false;
      this.lastInitErr = "Mkdirs failed: " + this.dir;
    }
  } catch (e) {
    this.initOk = false;
    this.lastInitErr = String(e);
  }
};
ToolHubLogger.prototype.updateConfig = function(cfg) {
  if (!cfg) return;
  if (typeof cfg.LOG_KEEP_DAYS === "number") this.keepDays = cfg.LOG_KEEP_DAYS;
  if (typeof cfg.LOG_ENABLE !== "undefined") this.enable = !!cfg.LOG_ENABLE;
  if (typeof cfg.LOG_DEBUG !== "undefined") this.debug = !!cfg.LOG_DEBUG;
};
ToolHubLogger.prototype._ymd = function() {
  var d = new Date();
  return "" + d.getFullYear() +
    ((d.getMonth() < 9 ? "0" : "") + (d.getMonth() + 1)) +
    ((d.getDate() < 10 ? "0" : "") + d.getDate());
};
ToolHubLogger.prototype._filePathForToday = function() {
  var name = this.prefix + "_" + this._ymd() + ".log";
  return this.dir + "/" + name;
};
ToolHubLogger.prototype._line = function(level, msg) {
  var ts = this._now();
  var d = new Date(ts);
  function pad2(x) { return (x < 10 ? "0" : "") + x; }
  var t = d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) +
    " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
  var proc = "";
  try {
    proc = " uid=" + String(this.proc.uid) + " pid=" + String(this.proc.pid) + " tid=" + String(this.proc.tid) +
      " th=" + String(this.proc.threadName) + " proc=" + String(this.proc.processName);
  } catch (e0) {}
  return t + " [" + String(level) + "] " + sanitizeLogMessage(msg) + proc + "\n";
};
ToolHubLogger.prototype._writeRaw = function(level, msg) {
  if (!this.initOk) return false;
  var p = this._filePathForToday();
  return FileIO.appendText(p, this._line(level, msg));
};
ToolHubLogger.prototype._write = function(level, msg) {
  if (!this.enable) return false;
  return this._writeRaw(level, msg);
};
ToolHubLogger.prototype.d = function(msg) { if (this.debug) this._write("D", msg); };
ToolHubLogger.prototype.i = function(msg) { this._write("I", msg); };
ToolHubLogger.prototype.w = function(msg) { this._write("W", msg); };
ToolHubLogger.prototype.e = function(msg) { this._write("E", msg); };
ToolHubLogger.prototype.fatal = function(msg) { this._writeRaw("F", msg); };
ToolHubLogger.prototype.cleanupOldFiles = function() {
  try {
    if (!this.initOk) return false;
    var dirF = new java.io.File(this.dir);
    var files = dirF.listFiles();
    if (!files) return false;
    var now = this._now();
    var cutoff = now - this.keepDays * 24 * 60 * 60 * 1000;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (f && f.isFile() && f.getName().indexOf(this.prefix) === 0 && f.lastModified() < cutoff) {
        f["delete"]();
      }
    }
    return true;
  } catch (e) { return false; }
};

// =======================【崩溃兜底：线程 UncaughtExceptionHandler】=======================
function installCrashHandler(logger) {
  try {
    if (!logger) return false;
    var old = java.lang.Thread.getDefaultUncaughtExceptionHandler();
    var h = new JavaAdapter(java.lang.Thread.UncaughtExceptionHandler, {
      uncaughtException: function(t, e) {
        try {
          var tn = "";
          try { tn = (t ? String(t.getName()) : ""); } catch (eT) {}
          var es = "";
          try { es = (e ? String(e) : ""); } catch (eE) {}
          logger.fatal("UNCAUGHT thread=" + tn + " err=" + es);
          try {
            var sw = new java.io.StringWriter();
            var pw = new java.io.PrintWriter(sw);
            e.printStackTrace(pw);
            pw.flush();
            logger.fatal("STACKTRACE " + String(sw.toString()));
          } catch (eST) {}
        } catch (e0) {}
        try { if (old) old.uncaughtException(t, e); } catch (e1) {}
      }
    });
    java.lang.Thread.setDefaultUncaughtExceptionHandler(h);
    return true;
  } catch (e) { return false; }
}

// =======================【主类：WM 专属线程模型】=======================
