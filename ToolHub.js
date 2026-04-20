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
    BALL_INIT_X: { type: "int", min: 0, max: 2000, default: 0 },
    BALL_INIT_Y_DP: { type: "int", min: 0, max: 1000, default: 220 },

    // 面板布局配置
    PANEL_COLS: { type: "int", min: 1, max: 6, default: 1 },
    PANEL_ROWS: { type: "int", min: 1, max: 10, default: 6 },
    PANEL_BG_ALPHA: { type: "float", min: 0.1, max: 1.0, default: 0.85 },
    PANEL_ICON_SIZE_DP: { type: "int", min: 16, max: 64, default: 24 },
    PANEL_ITEM_SIZE_DP: { type: "int", min: 48, max: 120, default: 64 },
    PANEL_GAP_DP: { type: "int", min: 4, max: 24, default: 8 },
    PANEL_PADDING_DP: { type: "int", min: 8, max: 32, default: 12 },

    // 主题配置
    THEME_MODE: { type: "enum", values: [0, 1, 2], default: 1 },
    THEME_ACCENT_LIGHT: { type: "string", default: "#FF3A86FF" },
    THEME_ACCENT_DARK: { type: "string", default: "#FF90CAF9" },

    // 图标配置
    BALL_ICON_TYPE: { type: "enum", values: ["app", "file", "android", "shortx"], default: "app" },
    BALL_ICON_RES_ID: { type: "int", min: 0, max: 999999, default: 0 },
    BALL_ICON_SIZE_DP: { type: "int", min: 16, max: 64, default: 22 },
    BALL_PNG_MODE: { type: "int", min: 0, max: 2, default: 1 },

    // 交互配置
    LONG_PRESS_MS: { type: "int", min: 200, max: 2000, default: 600 },
    LONG_PRESS_VIBRATE_MS: { type: "int", min: 10, max: 100, default: 40 },
    CLICK_SLOP_DP: { type: "int", min: 2, max: 20, default: 6 },

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
    CONTENT_VIEWER_TEXT_SP: { type: "int", min: 8, max: 24, default: 12 },

    // ========== 以下配置在 Schema 中但原 ConfigValidator 中缺失 ==========
    // 图标文件配置
    BALL_ICON_FILE_PATH: { type: "string", default: "" },
    BALL_ICON_FILE_MAX_PX: { type: "int", min: 128, max: 2048, default: 512 },
    BALL_ICON_PKG: { type: "string", default: "" },
    BALL_ICON_RES_NAME: { type: "string", default: "" },
    BALL_ICON_TINT_HEX: { type: "string", default: "" },

    // 悬浮球外观
    BALL_IDLE_ALPHA: { type: "float", min: 0.1, max: 1.0, default: 0.6 },
    BALL_TEXT: { type: "string", default: "" },
    BALL_TEXT_COLOR_HEX: { type: "string", default: "" },
    BALL_TEXT_SIZE_SP: { type: "int", min: 6, max: 20, default: 10 },

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

function resolveToolHubRootDir() {
  try {
    if (typeof shortx !== "undefined" && shortx && typeof shortx.getShortXDir === "function") {
      var shortxDir = String(shortx.getShortXDir() || "");
      if (shortxDir) return shortxDir + "/ToolHub";
    }
  } catch (eShortX) {}

  try {
    var logDirFile = new java.io.File(
      Packages.tornaco.apps.shortx.core.OooO0O0.OooO00o().getLogDir()
    );
    var parent = logDirFile.getParentFile();
    if (parent == null) {
      return String(logDirFile.getAbsolutePath()) + "/ToolHub";
    }
    return String(parent.getAbsolutePath()) + "/ToolHub";
  } catch (eRoot2) {}

  return "/data/system/ShortX_ToolHub";
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
var CONST_BALL_ICON_TEXT_GAP_DP = 1;
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
        DOCK_ANIM_MS: 260,
        UNDOCK_ANIM_MS: 180,
        SAVE_THROTTLE_MS: 220,
        LONG_PRESS_HAPTIC_ENABLE: true,
        LONG_PRESS_VIBRATE_MS: 18,
        ENABLE_LONG_PRESS: true,
        LONG_PRESS_MS: 520,
        CLICK_SLOP_DP: 6,
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
        BALL_TEXT: "",
        BALL_TEXT_SIZE_SP: 10,
        BALL_TEXT_COLOR_HEX: "",
        BALL_IDLE_ALPHA: 0.6,
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
        PANEL_BG_FALLBACK_HEX: "#EE1E1E1E",
        PANEL_BG_ALPHA: 0.85,
        THEME_MODE: 1,
        THEME_DAY_BG_HEX: null,
        THEME_DAY_TEXT_HEX: null,
        THEME_NIGHT_BG_HEX: null,
        THEME_NIGHT_TEXT_HEX: null,
        BALL_PANEL_GAP_DP: 10,
        LOG_ENABLE: true,
        LOG_DEBUG: true,
        LOG_KEEP_DAYS: 3,
CONTENT_VIEWER_TEXT_SP: 12
    },
    defaultButtons: [
        // # 默认按钮已迁移至 buttons.json
        // # Default buttons migrated to buttons.json
    ],
    defaultSchema: [
        { type: "section", name: "外观" },
        { key: "THEME_MODE", name: "主题(0跟随/1白/2黑)", type: "int", min: 0, max: 2, step: 1 },
        { key: "THEME_DAY_BG_HEX", name: "日间背景色(#RRGGBB)", type: "text" },
        { key: "THEME_DAY_TEXT_HEX", name: "日间文字色(#RRGGBB)", type: "text" },
        { key: "THEME_NIGHT_BG_HEX", name: "夜间背景色(#RRGGBB)", type: "text" },
        { key: "THEME_NIGHT_TEXT_HEX", name: "夜间文字色(#RRGGBB)", type: "text" },
        { key: "PANEL_BG_ALPHA", name: "面板背景透明度(0.1~1.0)", type: "float", min: 0.1, max: 1.0, step: 0.05 },

        { type: "section", name: "悬浮球" },
        { key: "BALL_SIZE_DP", name: "悬浮球大小(dp)", type: "int", min: 28, max: 120, step: 1 },
        { key: "BALL_PANEL_GAP_DP", name: "球与面板间距(dp)", type: "int", min: 0, max: 60, step: 1 },
        { key: "BALL_ICON_TYPE", name: "图标类型(app/file/android/shortx)", type: "single_choice", options: [
            { label: "应用图标 (app)", value: "app" },
            { label: "文件图标 (file)", value: "file" },
            { label: "系统图标 (android)", value: "android" },
            { label: "ShortX内置 (shortx)", value: "shortx" }
        ]},
        { key: "BALL_ICON_PKG", name: "图标包名(app模式)", type: "text" },
        { key: "BALL_ICON_FILE_PATH", name: "图标路径(file模式)", type: "text" },
        { key: "BALL_ICON_RES_NAME", name: "ShortX图标名(file/shortx模式兜底)", type: "text" },
        { key: "BALL_ICON_TINT_HEX", name: "图标着色(#RRGGBB, 空不着色)", type: "text" },
        { key: "BALL_IDLE_ALPHA", name: "闲置不透明度(0.1~1.0)", type: "float", min: 0.1, max: 1.0, step: 0.05 },
        { key: "BALL_TEXT", name: "悬浮球文字", type: "text" },
        { key: "BALL_TEXT_SIZE_SP", name: "文字大小(sp)", type: "int", min: 6, max: 20, step: 1 },
        { key: "BALL_TEXT_COLOR_HEX", name: "文字颜色(#RRGGBB)", type: "text" },

        { type: "section", name: "面板布局" },
        { key: "PANEL_ROWS", name: "面板可视行数(超出滚动)", type: "int", min: 1, max: 12, step: 1 },
        { key: "PANEL_COLS", name: "面板列数", type: "int", min: 1, max: 6, step: 1 },
        { key: "PANEL_ITEM_SIZE_DP", name: "面板单元格(dp)", type: "int", min: 36, max: 120, step: 1 },
        { key: "PANEL_GAP_DP", name: "格子间距(dp)", type: "int", min: 0, max: 30, step: 1 },
        { key: "PANEL_PADDING_DP", name: "面板内边距(dp)", type: "int", min: 0, max: 40, step: 1 },
        { key: "PANEL_ICON_SIZE_DP", name: "图标大小(dp)", type: "int", min: 16, max: 80, step: 1 },

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
        { key: "EDGE_VISIBLE_RATIO", name: "吸边露出比例(0~1)", type: "float", min: 0.20, max: 1.00, step: 0.05 },
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

        { type: "section", name: "触摸与手势" },
        { key: "CLICK_SLOP_DP", name: "点击位移阈值(dp)", type: "int", min: 1, max: 40, step: 1 },
        { key: "ENABLE_LONG_PRESS", name: "启用长按", type: "bool" },
        { key: "LONG_PRESS_MS", name: "长按判定(ms)", type: "int", min: 200, max: 2000, step: 10 },
        { key: "LONG_PRESS_HAPTIC_ENABLE", name: "长按震动反馈", type: "bool" },
        { key: "LONG_PRESS_VIBRATE_MS", name: "震动时长(ms)", type: "int", min: 1, max: 120, step: 1 },

        { type: "section", name: "执行与查看器" },
{ key: "CONTENT_VIEWER_TEXT_SP", name: "查看器文字大小(sp)", type: "int", min: 9, max: 18, step: 1 },

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
        if (sStr.indexOf("ENABLE_SNAP_TO_EDGE") < 0 || sStr.indexOf("ENABLE_ANIMATIONS") < 0 || sStr.indexOf("BALL_IDLE_ALPHA") < 0 || sStr.indexOf("PANEL_POS_GRAVITY") < 0 || sStr.indexOf("single_choice") < 0) {
            needReset = true;
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
// # 这段代码的主要内容/用途：把 cmd_b64 还原成原始 shell 文本（仅用于 Action 优先路径；广播桥永远传 b64）
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
// =======================【日志：文件写入器（全局统一目录 + 分级）】=======================
// 优化后的日志系统（带缓冲，减少文件 IO）
function ToolHubLogger(procInfo) {
  this.proc = procInfo || {};
  this.dir = PATH_LOG_DIR;
  this.prefix = "ShortX_ToolHub";
  this.keepDays = 3;
  this.enable = true;
  this.debug = false;
  this.initOk = false;
  this.lastInitErr = "";

  // 新增：日志缓冲
  this._buffer = [];
  this._bufferSize = 20; // 每 20 条写一次磁盘
  this._flushTimer = null;

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

ToolHubLogger.prototype._line = function(level, msg) {
  var ts = this._now();
  var d = new Date(ts);
  function pad2(x) { return (x < 10 ? "0" : "") + x; }
  var t = d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) +
    " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
  return t + " [" + level + "] " + msg + "\n";
};

ToolHubLogger.prototype._scheduleFlush = function() {
  if (this._flushTimer) try { this._flushTimer.cancel(); } catch(e) {}
  var self = this;
  this._flushTimer = new java.util.Timer();
  this._flushTimer.schedule(new java.util.TimerTask({
    run: function() { self._flushBuffer(); }
  }), 3000); // 3秒后强制刷新
};

ToolHubLogger.prototype._flushBuffer = function() {
  if (this._buffer.length === 0) return;
  var content = this._buffer.join('');
  this._buffer = [];
  var path = this.dir + "/" + this.prefix + "_" + this._ymd() + ".log";
  FileIO.appendText(path, content);
};

ToolHubLogger.prototype._ymd = function() {
  var d = new Date();
  return "" + d.getFullYear() +
    ((d.getMonth() < 9 ? "0" : "") + (d.getMonth() + 1)) +
    ((d.getDate() < 10 ? "0" : "") + d.getDate());
};

ToolHubLogger.prototype._write = function(level, msg) {
  if (!this.enable) return false;
  this._buffer.push(this._line(level, msg));

  // 缓冲满或错误级别立即写入
  if (this._buffer.length >= this._bufferSize || level === 'F' || level === 'E') {
    this._flushBuffer();
  } else {
    this._scheduleFlush(); // 延迟写入
  }
  return true;
};

ToolHubLogger.prototype.d = function(msg) { if (this.debug) this._write("D", msg); };
ToolHubLogger.prototype.i = function(msg) { this._write("I", msg); };
ToolHubLogger.prototype.w = function(msg) { this._write("W", msg); };
ToolHubLogger.prototype.e = function(msg) { this._write("E", msg); };
ToolHubLogger.prototype.fatal = function(msg) { this._write("F", msg); this._flushBuffer(); };

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
  } catch (e) { return false; };
};

ToolHubLogger.prototype._filePathForToday = function() {
  var name = this.prefix + "_" + this._ymd(this._now()) + ".log";
  return this.dir + "/" + name;
};
ToolHubLogger.prototype._initOnce = function() {
  try {
    // # 尝试创建目录
    if (FileIO.ensureDir(this.dir)) {
      this.initOk = true;
      // # 清理旧日志
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
  return t + " [" + String(level) + "] " + String(msg) + proc + "\n";
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
function FloatBallAppWM(logger) {
  this.L = logger || null;

  // # 加载配置
  this.config = ConfigManager.loadSettings();
  this.currentPanelKey = "main";
  this.panels = { main: ConfigManager.loadButtons() };

  // # 更新 Logger 配置（因为 Logger 初始化时是默认值）
  if (this.L) this.L.updateConfig(this.config);

  this.state = {
    receivers: [], // 存储广播接收器引用，用于 close 时注销
    wm: null,
    dm: null,
    density: 1.0,

    screen: { w: 0, h: 0 },
    lastRotation: -1,
    lastMonitorTs: 0,

    ht: null,
    h: null,

    addedBall: false,
    addedPanel: false,
    addedSettings: false,
    addedViewer: false,
    addedMask: false,

    ballRoot: null,
    ballContent: null,
    ballLp: null,

    panel: null,
    panelLp: null,

    settingsPanel: null,
    settingsPanelLp: null,

    viewerPanel: null,
    viewerPanelLp: null,

    mask: null,
    maskLp: null,

    loadedPos: null,
    lastSaveTs: 0,

    dragging: false,
    rawX: 0,
    rawY: 0,
    downX: 0,
    downY: 0,

    docked: false,
    dockSide: null,

    lastMotionTs: 0,
    idleDockRunnable: null,

    longPressArmed: false,
    longPressTriggered: false,
    longPressRunnable: null,

    displayListener: null,

    // # 设置面板：临时编辑缓存
    pendingUserCfg: null,
    pendingDirty: false,

    closing: false
  };

  // # 创建实例独立的 UI 工具对象，避免多实例共享颜色状态
  this.ui = {};
  var protoUi = FloatBallAppWM.prototype.ui;
  for (var _uiKey in protoUi) {
    this.ui[_uiKey] = protoUi[_uiKey];
  }
  this.ui.colors = {};

  // # 初始化莫奈动态配色（传入当前主题避免重复检测）
  try { this.refreshMonetColors(this.isDarkTheme()); } catch (eM) {}
}

// =======================【工具：dp/now/clamp】======================
FloatBallAppWM.prototype.dp = function(v) { return Math.floor(Number(v) * this.state.density); };
FloatBallAppWM.prototype.sp = function(v) { try { return Math.floor(Number(v) * context.getResources().getDisplayMetrics().scaledDensity); } catch (e) { return Math.floor(Number(v) * this.state.density); } };
FloatBallAppWM.prototype.now = function() { return new Date().getTime(); };
FloatBallAppWM.prototype.clamp = function(v, min, max) { if (v < min) return min; if (v > max) return max; return v; };
FloatBallAppWM.prototype.rectIntersect = function(ax, ay, aw, ah, bx, by, bw, bh) {
  return !(ax + aw <= bx || bx + bw <= ax || ay + ah <= by || by + bh <= ay);
};

// # 这段代码的主要内容/用途：安全地在 UI 线程执行代码（用于后台线程回调更新 UI）
FloatBallAppWM.prototype.runOnUiThreadSafe = function(fn) {
  try {
    if (!fn) return;
    var self = this;
    // 优先使用 Activity 的 runOnUiThread，否则使用 View.post
    if (this.state && this.state.ballRoot) {
      this.state.ballRoot.post(new java.lang.Runnable({
        run: function() { try { fn.call(self); } catch(e) {} }
      }));
    } else {
      // 兜底：直接执行（如果已经在 UI 线程）或尝试使用 Handler
      try {
        var h = new android.os.Handler(android.os.Looper.getMainLooper());
        h.post(new java.lang.Runnable({
          run: function() { try { fn.call(self); } catch(e) {} }
        }));
      } catch(e) {
        // 最后兜底：直接执行
        try { fn.call(self); } catch(e2) {}
      }
    }
  } catch(e) {}
};

// # 这段代码的主要内容/用途：统一图标缓存（LRU），减少反复解码/反复走 PackageManager，降低卡顿与内存波动（不改变 UI 与功能）
// 优化后的图标缓存（带 Bitmap 回收，防止内存泄漏）
FloatBallAppWM.prototype._iconCache = {
  map: {},
  keys: [],
  max: 80,  // 减少缓存数量，降低内存压力

  get: function(key) {
    var item = this.map[key];
    if (!item) return null;
    // 移动到末尾（最近使用）
    var idx = this.keys.indexOf(key);
    if (idx > -1) {
      this.keys.splice(idx, 1);
      this.keys.push(key);
    }
    return item.dr;
  },

  put: function(key, drawable) {
    // 清理旧的
    if (this.map[key]) {
      this._remove(key);
    }

    // 空间检查：超过 80% 时批量清理 20%
    if (this.keys.length >= this.max * 0.8) {
      var removeCount = Math.floor(this.max * 0.2);
      for (var i = 0; i < removeCount && this.keys.length > 0; i++) {
        var oldKey = this.keys.shift();
        this._remove(oldKey);
      }
    }

    this.keys.push(key);
    this.map[key] = {dr: drawable, ts: Date.now()};
  },

  _remove: function(key) {
    var item = this.map[key];
    if (item && item.dr) {
      // 关键：回收 Bitmap，防止内存泄漏
      try {
        if (item.dr instanceof android.graphics.drawable.BitmapDrawable) {
          var bmp = item.dr.getBitmap();
          if (bmp && !bmp.isRecycled()) bmp.recycle();
        }
      } catch(e) {}
      delete this.map[key];
    }
  },

  clear: function() {
    for (var i = 0; i < this.keys.length; i++) {
      this._remove(this.keys[i]);
    }
    this.keys = [];
  }
};

// 兼容性封装（保持原有调用方式不变）
FloatBallAppWM.prototype._iconLruEnsure = function() {};
FloatBallAppWM.prototype._iconLruGet = function(key) {
  return this._iconCache.get(key);
};

FloatBallAppWM.prototype._iconLruPut = function(key, val) {
  try {
    this._iconLruEnsure(120);
    var k = String(key || "");
    if (!k) return;
    if (val == null) return;

    // # 若已存在，先移除旧顺序位置
    try {
      var ord = this._iconLru.order;
      for (var i = ord.length - 1; i >= 0; i--) {
        if (ord[i] === k) { ord.splice(i, 1); break; }
      }
      ord.push(k);
    } catch (eLru3) {}

    this._iconLru.map[k] = val;

    // # 超限清理：按最久未使用淘汰
    try {
      var maxN = Math.max(20, Math.floor(Number(this._iconLru.max || 120)));
      var ord2 = this._iconLru.order;
      while (ord2.length > maxN) {
        var oldK = ord2.shift();
        if (oldK != null) {
          try { delete this._iconLru.map[oldK]; } catch (eDel) {}
        }
      }
    } catch (eLru4) {}
  } catch (eLru5) {}
};


// =======================【工具：悬浮球图标（PNG 文件）】======================
// # 这段代码的主要内容/用途：从指定路径加载透明 PNG 作为悬浮球图标；带"文件大小/像素上限"保护；按目标尺寸采样解码，避免 system_server OOM。
FloatBallAppWM.prototype.loadBallIconDrawableFromFile = function(path, targetPx, maxBytes, maxPx) {
  try {
    var p = String(path || "");
    if (!p) return null;

    // # 统一 LRU 缓存：文件图标（按 path + targetPx + mtime + size 复用 Drawable，避免反复解码）
    var f = new java.io.File(p);
    if (!f.exists() || !f.isFile()) return null;

    var ckLru = null;
    try {
      ckLru = "file|" + p + "@" + String(targetPx == null ? "" : targetPx) + "@" + String(f.lastModified()) + "@" + String(f.length());
      var hitLru = this._iconLruGet(ckLru);
      if (hitLru) return hitLru;
    } catch (eLruF0) {}

    // # 文件大小限制（字节）
    var limitBytes = Math.max(0, Math.floor(Number(maxBytes || 0)));
    if (limitBytes > 0) {
      try {
        var sz = Number(f.length());
        if (sz > limitBytes) return null;
      } catch (eSz) { return null; }
    }

    // # 先只读尺寸（不解码）
    var opt = new android.graphics.BitmapFactory.Options();
    opt.inJustDecodeBounds = true;
    try { android.graphics.BitmapFactory.decodeFile(p, opt); } catch (eB0) { return null; }

    var w = Number(opt.outWidth || 0);
    var h = Number(opt.outHeight || 0);
    if (w <= 0 || h <= 0) return null;

    // # 像素边长上限（宽/高任意一边超限则拒绝）
    var limitPx = Math.max(0, Math.floor(Number(maxPx || 0)));
    if (limitPx > 0) {
      if (w > limitPx || h > limitPx) return null;
    }

    // # 计算采样倍率：按目标尺寸（一般为 iconSizePx）采样
    var tp = Math.max(1, Math.floor(Number(targetPx || 1)));
    // # 允许解码到目标的 2 倍以内，减少锯齿又不浪费内存
    var desired = Math.max(tp * 2, tp);

    var sample = 1;
    while ((w / sample) > desired || (h / sample) > desired) sample = sample * 2;
    if (sample < 1) sample = 1;

    var opt2 = new android.graphics.BitmapFactory.Options();
    opt2.inJustDecodeBounds = false;
    opt2.inSampleSize = sample;
    opt2.inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888;

    var bmp = null;
    try { bmp = android.graphics.BitmapFactory.decodeFile(p, opt2); } catch (eB1) { bmp = null; }
    if (bmp == null) return null;

    var d = new android.graphics.drawable.BitmapDrawable(context.getResources(), bmp);

    // # 写入统一 LRU 缓存
    try {
      if (ckLru) this._iconLruPut(ckLru, d);
    } catch (eLruF1) {}
    return d;
  } catch (e0) {
    return null;
  }
};

// =======================【工具：屏幕/旋转】======================
FloatBallAppWM.prototype.getScreenSizePx = function() {
  var m = new android.util.DisplayMetrics();
  try { this.state.wm.getDefaultDisplay().getRealMetrics(m); } catch (e) { this.state.wm.getDefaultDisplay().getMetrics(m); }
  return { w: m.widthPixels, h: m.heightPixels };
};
FloatBallAppWM.prototype.getRotation = function() { try { return this.state.wm.getDefaultDisplay().getRotation(); } catch (e) {} return -1; };

// =======================【工具：alpha/toast/vibrate】======================
FloatBallAppWM.prototype.withAlpha = function(colorInt, alpha01) { var a = Math.floor(Number(alpha01) * 255); return (colorInt & 0x00FFFFFF) | (a << 24); };
FloatBallAppWM.prototype.toast = function(msg) { try { android.widget.Toast.makeText(context, String(msg), 0).show(); } catch (e) {} };
FloatBallAppWM.prototype.vibrateOnce = function(ms) {
  if (!this.config.LONG_PRESS_HAPTIC_ENABLE) return;
  try {
    var vib = context.getSystemService(android.content.Context.VIBRATOR_SERVICE);
    if (!vib) return;
    var dur = Math.max(1, Math.floor(ms));
    if (android.os.Build.VERSION.SDK_INT >= 26) {
      var ve = android.os.VibrationEffect.createOneShot(dur, android.os.VibrationEffect.DEFAULT_AMPLITUDE);
      vib.vibrate(ve);
    } else {
      vib.vibrate(dur);
    }
  } catch (e) {}
};

// =======================【工具：UI样式辅助】======================
FloatBallAppWM.prototype.ui = {
    // 基础颜色
    colors: {
        // 以下为默认回退值，实例化时会被 refreshMonetColors() 覆盖为系统莫奈色
        primary: android.graphics.Color.parseColor("#005BC0"),
        primaryDark: android.graphics.Color.parseColor("#041E49"),
        accent: android.graphics.Color.parseColor("#00639B"),
        danger: android.graphics.Color.parseColor("#BA1A1A"),
        success: android.graphics.Color.parseColor("#15803d"),
        warning: android.graphics.Color.parseColor("#b45309"),

        bgLight: android.graphics.Color.parseColor("#F8F9FA"),
        bgDark: android.graphics.Color.parseColor("#131314"),

        cardLight: android.graphics.Color.parseColor("#E1E3E1"),
        cardDark: android.graphics.Color.parseColor("#49454F"),

        textPriLight: android.graphics.Color.parseColor("#1F1F1F"),
        textPriDark: android.graphics.Color.parseColor("#E3E3E3"),

        textSecLight: android.graphics.Color.parseColor("#5F6368"),
        textSecDark: android.graphics.Color.parseColor("#C4C7C5"),

        dividerLight: android.graphics.Color.parseColor("#747775"),
        dividerDark: android.graphics.Color.parseColor("#8E918F"),

        inputBgLight: android.graphics.Color.parseColor("#F8F9FA"),
        inputBgDark: android.graphics.Color.parseColor("#131314"),

        // Monet 扩展字段（供面板直接使用）
        _monetSurface: android.graphics.Color.parseColor("#F8F9FA"),
        _monetOnSurface: android.graphics.Color.parseColor("#1F1F1F"),
        _monetOutline: android.graphics.Color.parseColor("#747775"),
        _monetOnPrimary: android.graphics.Color.parseColor("#FFFFFF"),
        _monetPrimaryContainer: android.graphics.Color.parseColor("#D3E3FD"),
        _monetOnPrimaryContainer: android.graphics.Color.parseColor("#041E49"),
        _monetSecondary: android.graphics.Color.parseColor("#00639B"),
        _monetTertiary: android.graphics.Color.parseColor("#5C5891")
    },

    // 创建圆角背景 (Solid)
    createRoundDrawable: function(color, radiusPx) {
        var d = new android.graphics.drawable.GradientDrawable();
        d.setShape(android.graphics.drawable.GradientDrawable.RECTANGLE);
        d.setColor(color);
        d.setCornerRadius(radiusPx);
        return d;
    },

    // 创建圆角描边背景 (Stroke)
    createStrokeDrawable: function(fillColor, strokeColor, strokeWidthPx, radiusPx) {
        var d = new android.graphics.drawable.GradientDrawable();
        d.setShape(android.graphics.drawable.GradientDrawable.RECTANGLE);
        if (fillColor) d.setColor(fillColor);
        d.setCornerRadius(radiusPx);
        d.setStroke(strokeWidthPx, strokeColor);
        return d;
    },

    // 创建按压反馈背景 (StateList)
    createRippleDrawable: function(normalColor, pressedColor, radiusPx) {
        var sd = new android.graphics.drawable.StateListDrawable();
        var p = this.createRoundDrawable(pressedColor, radiusPx);
        var n = this.createRoundDrawable(normalColor, radiusPx);
        sd.addState([android.R.attr.state_pressed], p);
        sd.addState([], n);
        return sd;
    },

    // 创建纯色按压反馈 (StateList) - 用于透明背景按钮
    createTransparentRippleDrawable: function(pressedColor, radiusPx) {
        var sd = new android.graphics.drawable.StateListDrawable();
        var p = this.createRoundDrawable(pressedColor, radiusPx);
        var n = new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT);
        sd.addState([android.R.attr.state_pressed], p);
        sd.addState([], n);
        return sd;
    },

    // 辅助：创建扁平按钮
    createFlatButton: function(app, txt, txtColor, onClick) {
        var btn = new android.widget.TextView(context);
        btn.setText(txt);
        btn.setTextColor(txtColor);
        btn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
        btn.setPadding(app.dp(12), app.dp(6), app.dp(12), app.dp(6));
        btn.setGravity(android.view.Gravity.CENTER);
        // use divider color or just low alpha text color for ripple
        var rippleColor = app.withAlpha ? app.withAlpha(txtColor, 0.1) : 0x22888888;
        btn.setBackground(this.createTransparentRippleDrawable(rippleColor, app.dp(8)));
        btn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function(v) { app.touchActivity(); app.guardClick("ui_btn", INTERACTION_CONSTANTS.CLICK_COOLDOWN_MS, function(){ if(onClick) onClick(v); }); }
        }));
        return btn;
    },

    // 辅助：创建实心按钮
    createSolidButton: function(app, txt, bgColor, txtColor, onClick) {
        var btn = new android.widget.TextView(context);
        btn.setText(txt);
        btn.setTextColor(txtColor);
        btn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
        btn.setTypeface(null, android.graphics.Typeface.BOLD);
        btn.setPadding(app.dp(16), app.dp(8), app.dp(16), app.dp(8));
        btn.setGravity(android.view.Gravity.CENTER);
        var pressedColor = app.withAlpha ? app.withAlpha(bgColor, 0.8) : bgColor;
        btn.setBackground(this.createRippleDrawable(bgColor, pressedColor, app.dp(24)));
        try { btn.setElevation(app.dp(2)); } catch(e){}
        btn.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function(v) { app.touchActivity(); app.guardClick("ui_btn", INTERACTION_CONSTANTS.CLICK_COOLDOWN_MS, function(){ if(onClick) onClick(v); }); }
        }));
        return btn;
    },

    // 辅助：创建带标签的输入组（支持粘贴）
    createInputGroup: function(app, label, initVal, isMultiLine, hint) {
        var box = new android.widget.LinearLayout(context);
        box.setOrientation(android.widget.LinearLayout.VERTICAL);
        box.setPadding(0, 0, 0, app.dp(12));

        var topLine = new android.widget.LinearLayout(context);
        topLine.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        topLine.setGravity(android.view.Gravity.CENTER_VERTICAL);
        box.addView(topLine);

        var lb = new android.widget.TextView(context);
        lb.setText(label);
        lb.setTextColor(this.colors.textSecLight); // 默认用浅色主题副文本色，外部可覆盖
        try { if (app.isDarkTheme && app.isDarkTheme()) lb.setTextColor(this.colors.textSecDark); } catch(e){}
        lb.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
        var lpLb = new android.widget.LinearLayout.LayoutParams(0, -2);
        lpLb.weight = 1;
        topLine.addView(lb, lpLb);

        var et = new android.widget.EditText(context);
        et.setText(initVal ? String(initVal) : "");
        et.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
        et.setTextColor(this.colors.textPriLight);
        try { if (app.isDarkTheme && app.isDarkTheme()) et.setTextColor(this.colors.textPriDark); } catch(e){}

        // 输入框背景优化
        var strokeColor = this.colors.dividerLight;
        try { if (app.isDarkTheme && app.isDarkTheme()) strokeColor = this.colors.dividerDark; } catch(e){}

        var bg = this.createStrokeDrawable(this.colors.inputBgLight, strokeColor, app.dp(1), app.dp(8));
        try { if (app.isDarkTheme && app.isDarkTheme()) bg = this.createStrokeDrawable(this.colors.inputBgDark, strokeColor, app.dp(1), app.dp(8)); } catch(e){}
        et.setBackground(bg);

        et.setPadding(app.dp(8), app.dp(8), app.dp(8), app.dp(8));
        if (hint) et.setHint(hint);

        if (isMultiLine) {
            et.setSingleLine(false);
            et.setMaxLines(4);
        } else {
            et.setSingleLine(true);
        }

        // 粘贴功能
        var pasteBtn = this.createFlatButton(app, "粘贴", this.colors.accent, function() {
            try {
                var cb = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE);
                if (cb.hasPrimaryClip()) {
                    var item = cb.getPrimaryClip().getItemAt(0);
                    if (item) {
                        var txt = item.getText();
                        if (txt) {
                            var st = String(txt);
                            var old = String(et.getText());
                            if (old.length > 0) et.setText(old + st);
                            else et.setText(st);
                            et.setSelection(et.getText().length());
                        }
                    }
                } else {
                    app.toast("剪贴板为空");
                }
            } catch (eP) {
                app.toast("粘贴失败: " + eP);
            }
        });
        // 调整粘贴按钮样式使其更紧凑
        pasteBtn.setPadding(app.dp(8), app.dp(2), app.dp(8), app.dp(2));
        pasteBtn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
        topLine.addView(pasteBtn);

        box.addView(et);

        // 错误提示
        var errTv = new android.widget.TextView(context);
        errTv.setTextColor(this.colors.danger);
        errTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 10);
        errTv.setVisibility(android.view.View.GONE);
        box.addView(errTv);

        var self = this;
        return {
            view: box,
            input: et,
            getValue: function() { return String(et.getText()); },
            setError: function(msg) {
                if (msg) {
                    errTv.setText(msg);
                    errTv.setVisibility(android.view.View.VISIBLE);
                    et.setBackground(self.createRoundDrawable(app.withAlpha(self.colors.danger, 0.2), app.dp(4)));
                } else {
                    errTv.setVisibility(android.view.View.GONE);
                    var strokeColor = self.colors.dividerLight;
                    try { if (app.isDarkTheme && app.isDarkTheme()) strokeColor = self.colors.dividerDark; } catch(e){}

                    var normalBg = self.createStrokeDrawable(self.colors.inputBgLight, strokeColor, app.dp(1), app.dp(8));
                    try { if (app.isDarkTheme && app.isDarkTheme()) normalBg = self.createStrokeDrawable(self.colors.inputBgDark, strokeColor, app.dp(1), app.dp(8)); } catch(e){}
                    et.setBackground(normalBg);
                }
            }
        };
    },

    // 辅助：创建标准面板容器
    createStyledPanel: function(app, paddingDp) {
        var isDark = app.isDarkTheme();
        var bgColor = isDark ? this.colors.bgDark : this.colors.bgLight;

        var panel = new android.widget.LinearLayout(context);
        panel.setOrientation(android.widget.LinearLayout.VERTICAL);

        var bgDr = new android.graphics.drawable.GradientDrawable();
        bgDr.setColor(bgColor);
        bgDr.setCornerRadius(app.dp(16));
        panel.setBackground(bgDr);
        try { panel.setElevation(app.dp(8)); } catch(e){}

        var p = (paddingDp !== undefined) ? app.dp(paddingDp) : app.dp(16);
        panel.setPadding(p, p, p, p);

        return panel;
    },

    // 辅助：创建标准标题栏容器
    createStyledHeader: function(app, paddingBottomDp) {
        var header = new android.widget.LinearLayout(context);
        header.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        header.setGravity(android.view.Gravity.CENTER_VERTICAL);
        var pb = (paddingBottomDp !== undefined) ? app.dp(paddingBottomDp) : app.dp(8);
        header.setPadding(0, 0, 0, pb);
        return header;
    },

    // 辅助：创建占位符（撑开空间）
    createSpacer: function(app) {
        var dummy = new android.view.View(context);
        var dummyLp = new android.widget.LinearLayout.LayoutParams(0, 1);
        dummyLp.weight = 1;
        dummy.setLayoutParams(dummyLp);
        return dummy;
    }
};

// =======================【工具：主题/类莫奈颜色】======================
// # 主题调试日志工具（仅打印，不改变逻辑）
function _th_hex(c) {
  try {
    var Integer = Packages.java.lang.Integer;
    var s = Integer.toHexString(c);
    while (s.length < 8) s = "0" + s;
    return "0x" + s;
  } catch (e) {
    try { return String(c); } catch (e2) { return "<?>"; }
  }
}

function _th_argb(c) {
  try {
    var Color = Packages.android.graphics.Color;
    var ci = Math.floor(Number(c));
    if (isNaN(ci)) return "NaN";
    return "a=" + Color.alpha(ci) + " r=" + Color.red(ci) + " g=" + Color.green(ci) + " b=" + Color.blue(ci);
  } catch (e) {
    return "argb_err";
  }
}

function _th_log(L, level, msg) {
  try {
    if (!L) return;
    if (level === "e" && L.e) { L.e(msg); return; }
    if (level === "w" && L.w) { L.w(msg); return; }
    if (level === "i" && L.i) { L.i(msg); return; }
    if (L.d) { L.d(msg); return; }
  } catch (e) {}
}

// =======================【莫奈动态取色工具】======================
var MonetColorProvider = {
  _cacheLight: null,
  _cacheDark: null,

  _getResColor: function(resName, fallbackHex) {
    try {
      var res = android.content.res.Resources.getSystem();
      var id = res.getIdentifier(resName, "color", "android");
      if (id > 0) return res.getColor(id, null);
    } catch (e) {}
    try { return android.graphics.Color.parseColor(fallbackHex); } catch (e) { return 0; }
  },

  _getFallbackLight: function() {
    return {
      // 使用更接近 AOSP Monet 标准值的 fallback，日间 primary 更饱和、对比度更高
      primary: android.graphics.Color.parseColor("#005BC0"),
      onPrimary: android.graphics.Color.parseColor("#FFFFFF"),
      primaryContainer: android.graphics.Color.parseColor("#D3E3FD"),
      onPrimaryContainer: android.graphics.Color.parseColor("#041E49"),
      secondary: android.graphics.Color.parseColor("#00639B"),
      secondaryContainer: android.graphics.Color.parseColor("#C2E4FF"),
      tertiary: android.graphics.Color.parseColor("#5C5891"),
      surface: android.graphics.Color.parseColor("#F8F9FA"),
      onSurface: android.graphics.Color.parseColor("#1F1F1F"),
      surfaceVariant: android.graphics.Color.parseColor("#E1E3E1"),
      onSurfaceVariant: android.graphics.Color.parseColor("#5F6368"),
      outline: android.graphics.Color.parseColor("#747775"),
      outlineVariant: android.graphics.Color.parseColor("#C4C7C5"),
      error: android.graphics.Color.parseColor("#BA1A1A"),
      errorContainer: android.graphics.Color.parseColor("#F9DEDC"),
      onErrorContainer: android.graphics.Color.parseColor("#410E0B")
    };
  },

  _getFallbackDark: function() {
    return {
      primary: android.graphics.Color.parseColor("#A8C7FA"),
      onPrimary: android.graphics.Color.parseColor("#062E6F"),
      primaryContainer: android.graphics.Color.parseColor("#0842A0"),
      onPrimaryContainer: android.graphics.Color.parseColor("#D3E3FD"),
      secondary: android.graphics.Color.parseColor("#7FCFFF"),
      secondaryContainer: android.graphics.Color.parseColor("#004A77"),
      tertiary: android.graphics.Color.parseColor("#C2C5DD"),
      surface: android.graphics.Color.parseColor("#131314"),
      onSurface: android.graphics.Color.parseColor("#E3E3E3"),
      surfaceVariant: android.graphics.Color.parseColor("#49454F"),
      onSurfaceVariant: android.graphics.Color.parseColor("#C4C7C5"),
      outline: android.graphics.Color.parseColor("#8E918F"),
      outlineVariant: android.graphics.Color.parseColor("#49454F"),
      error: android.graphics.Color.parseColor("#F2B8B5"),
      errorContainer: android.graphics.Color.parseColor("#8C1D18"),
      onErrorContainer: android.graphics.Color.parseColor("#F9DEDC")
    };
  },

  _loadMonet: function(isDark) {
    var c = isDark ? this._getFallbackDark() : this._getFallbackLight();
    try {
      var res = android.content.res.Resources.getSystem();
      var map = isDark ? {
        primary: "system_accent1_200",
        onPrimary: "system_accent1_800",
        primaryContainer: "system_accent1_700",
        onPrimaryContainer: "system_accent1_100",
        secondary: "system_accent2_200",
        secondaryContainer: "system_accent2_700",
        tertiary: "system_accent3_200",
        surface: "system_neutral1_900",
        onSurface: "system_neutral1_100",
        surfaceVariant: "system_neutral2_700",
        onSurfaceVariant: "system_neutral2_200",
        outline: "system_neutral2_400",
        outlineVariant: "system_neutral2_700",
        error: "system_accent3_200",
        errorContainer: "system_accent3_800",
        onErrorContainer: "system_accent3_100"
      } : {
        primary: "system_accent1_600",
        onPrimary: "system_accent1_0",
        primaryContainer: "system_accent1_100",
        onPrimaryContainer: "system_accent1_900",
        secondary: "system_accent2_600",
        secondaryContainer: "system_accent2_100",
        tertiary: "system_accent3_600",
        surface: "system_neutral1_10",
        onSurface: "system_neutral1_900",
        surfaceVariant: "system_neutral2_100",
        onSurfaceVariant: "system_neutral2_700",
        outline: "system_neutral2_500",
        outlineVariant: "system_neutral2_200",
        error: "system_accent3_600",
        errorContainer: "system_accent3_100",
        onErrorContainer: "system_accent3_900"
      };
      for (var name in map) {
        try {
          var id = res.getIdentifier(map[name], "color", "android");
          if (id > 0) c[name] = res.getColor(id, null);
        } catch (e) {}
      }
    } catch (e) {}
    return c;
  },

  getColors: function(isDark) {
    if (isDark) {
      if (!this._cacheDark) this._cacheDark = this._loadMonet(true);
      return this._cacheDark;
    } else {
      if (!this._cacheLight) this._cacheLight = this._loadMonet(false);
      return this._cacheLight;
    }
  },

  invalidate: function() {
    this._cacheLight = null;
    this._cacheDark = null;
  }
};

// =======================【兼容兜底：themeTextInt/themeBgInt】======================
// 这段代码的主要内容/用途：兼容旧代码或异步回调里误引用 themeTextInt/themeBgInt 导致 ReferenceError 崩溃。
// 说明：当前版本文字色应通过 getPanelTextColorInt(bgInt) 获取；这里仅作为"兜底全局变量"，避免回调炸线程。

// 声明全局变量（避免 ReferenceError）
var themeBgInt = 0;
var themeTextInt = 0;

// =======================【API 兼容性辅助函数】======================
// 这段代码的主要内容/用途：处理 Android API 级别差异，避免在旧版本上崩溃

/**
 * 安全创建 UserHandle（兼容 API 17 以下）
 * @param {number} userId - 用户 ID
 * @returns {android.os.UserHandle} UserHandle 对象或 null
 */
function createUserHandle(userId) {
  try {
    // UserHandle.of 在 API 17+ 可用
    if (android.os.Build.VERSION.SDK_INT >= 17) {
      return android.os.UserHandle.of(userId);
    }
    // API 17 以下返回当前用户句柄
    return android.os.Process.myUserHandle();
  } catch (e) {
    return null;
  }
}

/**
 * 安全启动 Activity 跨用户（兼容 API 17 以下）
 * @param {Context} ctx - Context
 * @param {Intent} intent - Intent
 * @param {number} userId - 用户 ID（API 17+ 有效）
 */
function startActivityAsUserSafe(ctx, intent, userId) {
  try {
    if (android.os.Build.VERSION.SDK_INT >= 17 && userId !== 0) {
      var uh = android.os.UserHandle.of(userId);
      ctx.startActivityAsUser(intent, uh);
    } else {
      ctx.startActivity(intent);
    }
  } catch (e) {
    // 降级到普通启动
    try {
      ctx.startActivity(intent);
    } catch (e2) {}
  }
}

FloatBallAppWM.prototype.isDarkTheme = function() {
  // 0) 优先检查用户强制设置 (0=跟随系统, 1=白天, 2=黑夜)
  var mode = 0;
  try { mode = Math.floor(Number(this.config.THEME_MODE || 0)); } catch(e){}

  if (mode === 2) return true;
  if (mode === 1) return false;

  // mode === 0 (or others) -> Fallback to system detection
  // 这段代码的主要内容/用途：更稳健地判断当前是否处于"夜间/暗色"模式（并打印调试日志）。
  // 说明：system_server 场景下 Configuration.uiMode 偶发不一致，因此再用 UiModeManager 兜底交叉验证。
  var result = false;
  var from = "unknown";

  try {
    // # 1) 优先用 Configuration（最快）
    var uiMode = context.getResources().getConfiguration().uiMode;
    var nightMask = (uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK);
    if (nightMask === android.content.res.Configuration.UI_MODE_NIGHT_YES) { result = true; from = "Configuration(UI_MODE_NIGHT_YES)"; }
    else if (nightMask === android.content.res.Configuration.UI_MODE_NIGHT_NO) { result = false; from = "Configuration(UI_MODE_NIGHT_NO)"; }
  } catch (e1) {}

  if (from === "unknown") {
    try {
      // # 2) 再用 UiModeManager（更"系统态"）
      var um = context.getSystemService(android.content.Context.UI_MODE_SERVICE);
      if (um) {
        var nm = um.getNightMode();
        if (nm === android.app.UiModeManager.MODE_NIGHT_YES) { result = true; from = "UiModeManager(MODE_NIGHT_YES)"; }
        else if (nm === android.app.UiModeManager.MODE_NIGHT_NO) { result = false; from = "UiModeManager(MODE_NIGHT_NO)"; }
        else { from = "UiModeManager(mode=" + String(nm) + ")"; }
      }
    } catch (e2) {}
  }

  // # 3) 实在判断不了，就按"非暗色"处理，避免自动主题背景黑成一片
  if (from === "unknown") { result = false; from = "fallback(false)"; }

  // 仅在状态改变时打印日志，避免刷屏
  var logKey = String(result) + "|" + from + "|" + mode;
  if (this._lastDarkThemeLog !== logKey) {
      this._lastDarkThemeLog = logKey;
      try { _th_log(this.L, "d", "[theme] isDarkTheme=" + String(result) + " via=" + from + " mode=" + mode); } catch (e3) {}
  }

  // # 主题切换时刷新莫奈配色（传入 result 避免递归）
  // 注：构造函数中会初始化，这里只在构造完成后的切换时触发
  if (this._lastDarkResult !== undefined && this._lastDarkResult !== result) {
    this._lastDarkResult = result;
    try { this.refreshMonetColors(result); } catch (eM) {}
  } else if (this._lastDarkResult === undefined) {
    this._lastDarkResult = result;
  }

  return result;
};

FloatBallAppWM.prototype.refreshMonetColors = function(forceDark) {
  try {
    var isDark = (forceDark !== undefined) ? forceDark : this.isDarkTheme();
    var m = MonetColorProvider.getColors(isDark);
    var ml = MonetColorProvider.getColors(false);
    var md = MonetColorProvider.getColors(true);
    var c = this.ui.colors;

    // 浅色配色
    c.bgLight = ml.surface;
    c.cardLight = ml.surfaceVariant;
    c.textPriLight = ml.onSurface;
    c.textSecLight = ml.onSurfaceVariant;
    c.dividerLight = ml.outline;
    c.inputBgLight = ml.surface;

    // 深色配色
    c.bgDark = md.surface;
    c.cardDark = md.surfaceVariant;
    c.textPriDark = md.onSurface;
    c.textSecDark = md.onSurfaceVariant;
    c.dividerDark = md.outline;
    c.inputBgDark = md.surface;

    // 当前主题配色（随主题切换）
    c.primary = m.primary;
    // primaryDark 修正为 onPrimaryContainer：日间为深蓝(#041E49)，夜间为浅蓝(#D3E3FD)，符合"深色变体"语义
    c.primaryDark = m.onPrimaryContainer;
    c.accent = m.secondary;
    c.danger = m.error;
    // success/warning 优化对比度：日间更深确保可见，夜间保持适度亮度不刺眼
    c.success = isDark ? android.graphics.Color.parseColor("#4ade80") : android.graphics.Color.parseColor("#15803d");
    c.warning = isDark ? android.graphics.Color.parseColor("#fbbf24") : android.graphics.Color.parseColor("#b45309");

    // 扩展：完整 Monet 语义字段（供面板方法直接使用）
    c._monetSurface = m.surface;
    c._monetOnSurface = m.onSurface;
    c._monetOutline = m.outline;
    c._monetOnPrimary = m.onPrimary;
    c._monetPrimaryContainer = m.primaryContainer;
    c._monetOnPrimaryContainer = m.onPrimaryContainer;
    c._monetSecondary = m.secondary;
    c._monetTertiary = m.tertiary;

    try { _th_log(this.L, "d", "[monet] refreshed isDark=" + isDark + " primary=" + _th_hex(c.primary) + " primaryDark=" + _th_hex(c.primaryDark) + " accent=" + _th_hex(c.accent)); } catch (e) {}
  } catch (e) {
    try { _th_log(this.L, "e", "[monet] refresh err=" + String(e)); } catch (e2) {}
  }
};

FloatBallAppWM.prototype.getMonetAccentForBall = function() {
  // 这段代码的主要内容/用途：尝试读取系统动态强调色（Monet/accent）；失败则使用兜底颜色；并打印命中信息。
  // 优化点：
  //   1) 日间使用 500/600 档（更深、对比度更高），夜间使用 400/300 档（柔和、不刺眼）
  //   2) 移除 system_neutral1_* 中性灰色（不是强调色）
  var res = context.getResources();
  var dark = this.isDarkTheme();
  var names = dark
    ? ["system_accent1_400", "system_accent1_300", "system_accent2_400"]
    : ["system_accent1_500", "system_accent1_600", "system_accent2_500"];

  var i;
  for (i = 0; i < names.length; i++) {
    try {
      var id = res.getIdentifier(names[i], "color", "android");
      if (id > 0) {
        var c = res.getColor(id, null);
        var logKey = "hit|" + names[i] + "|" + c;
        if (this._lastAccentLog !== logKey) {
            this._lastAccentLog = logKey;
            try { _th_log(this.L, "d", "[theme] hit accent=" + names[i] + " id=" + String(id) + " c=" + _th_hex(c) + " " + _th_argb(c)); } catch (eL0) {}
        }
        return c;
      }
    } catch (e) {
      try { _th_log(this.L, "w", "[theme] err accent=" + names[i] + " e=" + String(e)); } catch (eL2) {}
    }
  }

  var fbHex = dark
    ? (this.config.BALL_FALLBACK_DARK || CONST_BALL_FALLBACK_DARK)
    : (this.config.BALL_FALLBACK_LIGHT || CONST_BALL_FALLBACK_LIGHT);
  var fb = android.graphics.Color.parseColor(fbHex);
  var logKeyFb = "miss_all|" + fb;
  if (this._lastAccentLog !== logKeyFb) {
      this._lastAccentLog = logKeyFb;
      try { _th_log(this.L, "w", "[theme] accent miss all, fallback=" + _th_hex(fb) + " " + _th_argb(fb)); } catch (eL3) {}
  }
  return fb;
};

FloatBallAppWM.prototype.updateBallContentBackground = function(contentView) {
  try {
    var ballColor = this.getMonetAccentForBall();
    var dark = this.isDarkTheme();
    var alpha01 = dark ? this.config.BALL_RIPPLE_ALPHA_DARK : this.config.BALL_RIPPLE_ALPHA_LIGHT;
    var rippleColor = this.withAlpha(ballColor, alpha01);

    // # 自定义 PNG/APP 模式下：背景透明
    var fillColor = ballColor;
    var _usedKind = "none";
    try { _usedKind = this.state.usedIconKind || "none"; } catch(eK){}

    try {
      var _pngModeBg = Number(this.config.BALL_PNG_MODE || 0);
      if ((_pngModeBg === 1 && _usedKind === "file") || _usedKind === "app") {
        fillColor = android.graphics.Color.TRANSPARENT;
      }
    } catch (eBg) {}

    var content = new android.graphics.drawable.GradientDrawable();
    content.setShape(android.graphics.drawable.GradientDrawable.OVAL);
    content.setColor(fillColor);

    // # 描边：根据球体颜色亮度自动选择白/黑描边，确保任何背景下都可见
    if (_usedKind !== "file" && _usedKind !== "app") {
      try {
        var Color = android.graphics.Color;
        var lum = (Color.red(fillColor)*0.299 + Color.green(fillColor)*0.587 + Color.blue(fillColor)*0.114) / 255.0;
        var strokeInt = lum > 0.55
          ? Color.parseColor("#33000000")   // 浅球用半透明黑边
          : Color.parseColor("#55FFFFFF");  // 深球用半透明白边
        content.setStroke(this.dp(1), strokeInt);
      } catch(eS){}
    }

    var mask = new android.graphics.drawable.GradientDrawable();
    mask.setShape(android.graphics.drawable.GradientDrawable.OVAL);
    mask.setColor(android.graphics.Color.WHITE);

    contentView.setBackground(new android.graphics.drawable.RippleDrawable(
      android.content.res.ColorStateList.valueOf(rippleColor),
      content,
      mask
    ));
  } catch (e) {}
};


FloatBallAppWM.prototype.safeParseColor = function(hex, fallbackInt) {
  // 这段代码的主要内容/用途：安全解析 #RRGGBB/#AARRGGBB，解析失败直接回退，避免 system_server 抛异常。
  try { return android.graphics.Color.parseColor(String(hex)); } catch (e) { return fallbackInt; }
};



FloatBallAppWM.prototype.getPanelBgColorInt = function() {
  // 这段代码的主要内容/用途：配合"白天/夜晚"两档主题，返回统一的背景颜色（不再依赖自动亮度推断）。
  var isDark = this.isDarkTheme();

  var dayBgHex = (this.config.THEME_DAY_BG_HEX != null) ? String(this.config.THEME_DAY_BG_HEX) : null;
  var nightBgHex = (this.config.THEME_NIGHT_BG_HEX != null) ? String(this.config.THEME_NIGHT_BG_HEX) : null;

  // # 兼容旧版默认配色：若仍为旧默认值，自动回退到莫奈色
  if (dayBgHex === "#FAF4E3") dayBgHex = null;
  if (nightBgHex === "#191928") nightBgHex = null;

  // # 未配置时使用莫奈 surface 色作为回退
  var dayFallback = this.ui.colors.bgLight || android.graphics.Color.parseColor("#F8F9FA");
  var nightFallback = this.ui.colors.bgDark || android.graphics.Color.parseColor("#131314");

  var base = isDark
    ? (nightBgHex ? this.safeParseColor(nightBgHex, nightFallback) : nightFallback)
    : (dayBgHex ? this.safeParseColor(dayBgHex, dayFallback) : dayFallback);

  // # 继承原配置：面板背景透明度（0~1）
  var a = 1.0;
  try { a = Number(this.config.PANEL_BG_ALPHA); } catch (e1) { a = 0.85; }
  if (!(a >= 0.0 && a <= 1.0)) a = 0.85;

  var out = this.withAlpha(base, a);

  try { _th_log(this.L, "d", "[t]bg isDark=" + isDark + " o=" + _th_hex(out)); } catch (e2) {}

  return out;
};

FloatBallAppWM.prototype.getPanelTextColorInt = function(bgInt) {
  // 这段代码的主要内容/用途：配合"白天/夜晚"两档主题，返回统一的文字颜色（不再依赖自动亮度推断）。
  var isDark = this.isDarkTheme();

  var dayTextHex = (this.config.THEME_DAY_TEXT_HEX != null) ? String(this.config.THEME_DAY_TEXT_HEX) : null;
  var nightTextHex = (this.config.THEME_NIGHT_TEXT_HEX != null) ? String(this.config.THEME_NIGHT_TEXT_HEX) : null;

  // # 兼容旧版默认配色：若仍为旧默认值，自动回退到莫奈色
  if (dayTextHex === "#333333") dayTextHex = null;
  if (nightTextHex === "#E6E6F0") nightTextHex = null;

  // # 未配置时使用莫奈 onSurface 色作为回退
  var dayFallback = this.ui.colors.textPriLight || android.graphics.Color.parseColor("#1F1F1F");
  var nightFallback = this.ui.colors.textPriDark || android.graphics.Color.parseColor("#E3E3E3");

  if (!isDark) return dayTextHex ? this.safeParseColor(dayTextHex, dayFallback) : dayFallback;
  return nightTextHex ? this.safeParseColor(nightTextHex, nightFallback) : nightFallback;
};

FloatBallAppWM.prototype.applyTextColorRecursive = function(v, colorInt) {
  // 这段代码的主要内容/用途：递归设置面板内所有 TextView 的文字颜色（标题/按钮文字/描述/设置项等）。
  try {
    if (!v) return;
    if (v instanceof android.widget.TextView) {
      v.setTextColor(colorInt);
    }
    if (v instanceof android.view.ViewGroup) {
      var i, n = v.getChildCount();
      for (i = 0; i < n; i++) {
        this.applyTextColorRecursive(v.getChildAt(i), colorInt);
      }
    }
  } catch (e0) {}
};

FloatBallAppWM.prototype.updatePanelBackground = function(panelView) {
  // 这段代码的主要内容/用途：统一为"主面板/设置面板/查看器面板"应用背景与文字颜色（自动/亮/暗三档），并输出调试日志（命中哪个颜色）。
  try {
    var bg = new android.graphics.drawable.GradientDrawable();
    bg.setCornerRadius(this.dp(22));

    var bgInt = this.getPanelBgColorInt();
    bg.setColor(bgInt);

    // 轻量描边：亮色时更明显，暗色时也保留一点边界（不提供自定义输入，避免设置页复杂化）
    var sw = this.dp(1);
    var isDark = this.isDarkTheme();
    var outlineColor = this.ui.colors._monetOutline || (isDark ? android.graphics.Color.parseColor("#8E918F") : android.graphics.Color.parseColor("#747775"));
    var stroke = this.withAlpha(outlineColor, isDark ? 0.26 : 0.20);
    try { bg.setStroke(sw, stroke); } catch (eS) {}

    panelView.setBackground(bg);

    var tc = this.getPanelTextColorInt(bgInt);
    try { themeBgInt = bgInt; themeTextInt = tc; } catch (eT) {}
    this.applyTextColorRecursive(panelView, tc);

    try { _th_log(this.L, "d", "[t]apply bg=" + _th_hex(bgInt) + " tx=" + _th_hex(tc)); } catch (e) {}


    try {
      _th_log(this.L, "d",
        "[theme:apply] isDark=" + isDark +
        " bg=" + _th_hex(bgInt) + " " + _th_argb(bgInt) +
        " text=" + _th_hex(tc) + " " + _th_argb(tc) +
        " stroke=" + _th_hex(stroke)
      );
    } catch (eL0) {}
  } catch (e) {
    try { _th_log(this.L, "e", "[theme:apply] err=" + String(e)); } catch (eL1) {}
  }
};

// =======================【工具：面板位置持久化】======================
FloatBallAppWM.prototype.savePanelState = function(key, state) {
  if (!key || !state) return;
  try {
    if (!this.config.PANEL_STATES) this.config.PANEL_STATES = {};
    this.config.PANEL_STATES[key] = state;
    // 节流或立即保存? 面板拖动结束通常不频繁，立即保存即可
    // 但为了避免连续事件，还是可以复用 savePos 的节流逻辑，或者直接保存
    ConfigManager.saveSettings(this.config);
  } catch (e) {}
};

FloatBallAppWM.prototype.loadPanelState = function(key) {
  if (!key || !this.config.PANEL_STATES) return null;
  return this.config.PANEL_STATES[key];
};

// =======================【工具：位置持久化】======================
FloatBallAppWM.prototype.savePos = function(x, y) {
  try {
    this.config.BALL_INIT_X = Math.floor(x);
    this.config.BALL_INIT_Y_DP = Math.floor(y / this.state.density);
    // # 节流保存
    return ConfigManager.saveSettings(this.config);
  } catch (e) { return false; }
};

FloatBallAppWM.prototype.loadSavedPos = function() {
  // # 直接从 config 返回，因为 config 已经是持久化的
  var x = Number(this.config.BALL_INIT_X || 0);
  var y = this.dp(Number(this.config.BALL_INIT_Y_DP || 100));
  return { x: x, y: y };
};

FloatBallAppWM.prototype.trySavePosThrottled = function(x, y) {
  var t = this.now();
  if (t - this.state.lastSaveTs < this.config.SAVE_THROTTLE_MS) return false;
  this.state.lastSaveTs = t;
  return this.savePos(x, y);
};

// =======================【工具：配置持久化】======================
FloatBallAppWM.prototype.saveConfig = function(obj) {
  try {
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) {
        this.config[k] = obj[k];
      }
    }
    if (this.L) this.L.updateConfig(this.config);
    return ConfigManager.saveSettings(this.config);
  } catch (e) { return false; }
};

// =======================【设置面板：schema】======================
FloatBallAppWM.prototype.getConfigSchema = function() {
  return ConfigManager.loadSchema();
};

// =======================【设置面板：临时编辑缓存】======================
FloatBallAppWM.prototype.beginEditConfig = function() {
  try {
    var schema = this.getConfigSchema();
    var p = {};
    var i;
    for (i = 0; i < schema.length; i++) {
      if (!schema[i] || !schema[i].key) continue;
      var k = String(schema[i].key);
      p[k] = this.config[k];
    }
    this.state.pendingUserCfg = p;
    this.state.pendingDirty = false;
    return true;
  } catch (e0) {
    this.state.pendingUserCfg = null;
    this.state.pendingDirty = false;
    return false;
  }
};
FloatBallAppWM.prototype.getPendingValue = function(k) {
  if (this.state.pendingUserCfg && this.state.pendingUserCfg.hasOwnProperty(k)) return this.state.pendingUserCfg[k];
  return this.config[k];
};
FloatBallAppWM.prototype.setPendingValue = function(k, v) {
  if (!this.state.pendingUserCfg) this.beginEditConfig();
  this.state.pendingUserCfg[k] = v;
  this.state.pendingDirty = true;
  if (this.state.previewMode) {
      this.refreshPreview(k);
  }
};

FloatBallAppWM.prototype.getEffectiveConfig = function() {
    if (!this.state.previewMode || !this.state.pendingUserCfg) return this.config;
    var cfg = {};
    for (var k in this.config) { cfg[k] = this.config[k]; }
    for (var k in this.state.pendingUserCfg) { cfg[k] = this.state.pendingUserCfg[k]; }
    return cfg;
};

FloatBallAppWM.prototype.refreshPreview = function(changedKey) {
    if (this.state.closing) return;
    var self = this;
    // Post to next tick to avoid destroying view during event dispatch (fixes crash on switch toggle)
    if (this.state.h) {
        this.state.h.post(new JavaAdapter(java.lang.Runnable, {
            run: function() { self._refreshPreviewInternal(changedKey); }
        }));
    } else {
        self._refreshPreviewInternal(changedKey);
    }
};

FloatBallAppWM.prototype._refreshPreviewInternal = function(changedKey) {
    if (this.state.closing) return;
    var originalConfig = this.config;
    try {
        // 使用临时配置
        this.config = this.getEffectiveConfig();

        var needBall = false;
        var needPanel = false;

        if (!changedKey) {
            needBall = true;
            needPanel = true;
        } else {
            // 根据修改的 key 判断需要刷新什么，避免全量刷新导致闪烁
            if (changedKey.indexOf("BALL_") === 0) needBall = true;
            if (changedKey.indexOf("PANEL_") === 0) needPanel = true;
            // 球大小改变会影响面板位置
            if (changedKey === "BALL_SIZE_DP") needPanel = true;
        }

        // 1. 刷新悬浮球 (保持面板不关闭)
        if (needBall) {
            this.rebuildBallForNewSize(true);
        }

        // 2. 刷新主面板预览
        if (needPanel) {
            // 如果当前没有显示主面板，则创建并显示；如果已显示，则替换

            var panel = this.buildPanelView("main");

            // 计算位置 (使用当前球的位置)
            var maxH = Math.floor(this.state.screen.h * 0.75);
            panel.measure(
                android.view.View.MeasureSpec.makeMeasureSpec(this.state.screen.w, android.view.View.MeasureSpec.AT_MOST),
                android.view.View.MeasureSpec.makeMeasureSpec(maxH, android.view.View.MeasureSpec.AT_MOST)
            );
            var pw = panel.getMeasuredWidth();
            var ph = panel.getMeasuredHeight();
            if (ph > maxH) ph = maxH;

            var bx = this.state.ballLp.x;
            var by = this.state.ballLp.y;
            var px = this.computePanelX(bx, pw);
            var py = by;

            // 尝试调整 Y
            var r = this.tryAdjustPanelY(px, py, pw, ph, bx, by);
            var finalX = r.ok ? r.x : px;
            var finalY = r.ok ? r.y : this.clamp(py, 0, this.state.screen.h - ph);

            // 优化闪烁：先添加新面板，再移除旧面板 (这样新面板会在最上层，符合预览需求)
            var oldPanel = this.state.panel;
            var oldAdded = this.state.addedPanel;

            // 添加新面板 (addPanel 会更新 this.state.panel)
            // 注意：addPanel 中已为 main 添加 FLAG_NOT_FOCUSABLE，所以即使在最上层也不会抢走 Settings 的输入焦点
            this.addPanel(panel, finalX, finalY, "main");

            // 移除旧面板
            if (oldAdded && oldPanel) {
                try { this.state.wm.removeView(oldPanel); } catch(e) {}
            }
        }

    } catch(e) {
        safeLog(this.L, 'e',  "refreshPreview err=" + e);
    } finally {
        this.config = originalConfig;
    }
};
FloatBallAppWM.prototype.persistUserCfgFromObject = function(obj) {
  // # 这段代码的主要内容/用途：从临时编辑对象里按 schema 白名单抽取并保存（跳过 section 标题等无 key 项）
  try {
    var schema = this.getConfigSchema();
    var out = {};
    var i;
    for (i = 0; i < schema.length; i++) {
      if (!schema[i] || !schema[i].key) continue;
      var k = String(schema[i].key);
      out[k] = obj[k];
    }
    return this.saveConfig(out);
  } catch (e0) { return false; }
};

FloatBallAppWM.prototype.applyImmediateEffectsForKey = function(k) {
  try {
    if (k === "LOG_ENABLE") {
      try {
        if (this.L) {
          this.L.enable = !!this.config.LOG_ENABLE;
          this.L.cfg.LOG_ENABLE = !!this.config.LOG_ENABLE;
          this.L.i("apply LOG_ENABLE=" + String(this.config.LOG_ENABLE));
        }
      } catch (eLE) {}
      return;
    }
    if (k === "LOG_DEBUG") {
      try {
        if (this.L) {
          this.L.debug = !!this.config.LOG_DEBUG;
          this.L.cfg.LOG_DEBUG = !!this.config.LOG_DEBUG;
          this.L.i("apply LOG_DEBUG=" + String(this.config.LOG_DEBUG));
        }
      } catch (eLD) {}
      return;
    }
    if (k === "LOG_KEEP_DAYS") {
      try {
        var n = Math.max(1, Math.floor(Number(this.config.LOG_KEEP_DAYS || 3)));
        this.config.LOG_KEEP_DAYS = n;
        if (this.L) {
          this.L.keepDays = n;
          this.L.cfg.LOG_KEEP_DAYS = n;
          this.L.i("apply LOG_KEEP_DAYS=" + String(n));
          this.L.cleanupOldFiles();
        }
      } catch (eLK) {}
      return;
    }
    if (k === "BALL_SIZE_DP" || k === "BALL_PNG_MODE" || k === "BALL_ICON_TYPE" || k === "BALL_ICON_PKG" || k === "BALL_ICON_FILE_PATH" || k === "BALL_ICON_RES_ID" || k === "BALL_ICON_RES_NAME" || k === "BALL_ICON_SIZE_DP" || k === "BALL_ICON_TINT_HEX" || k === "BALL_TEXT" || k === "BALL_TEXT_SIZE_SP" || k === "BALL_TEXT_COLOR_HEX" || k === "BALL_ICON_TEXT_GAP_DP") { this.rebuildBallForNewSize(); return; }

    if (k === "PANEL_ROWS" || k === "PANEL_COLS" ||
        k === "PANEL_ITEM_SIZE_DP" || k === "PANEL_GAP_DP" ||
        k === "PANEL_PADDING_DP" || k === "PANEL_ICON_SIZE_DP" ||
        k === "PANEL_LABEL_ENABLED" || k === "PANEL_LABEL_TEXT_SIZE_SP" ||
        k === "PANEL_LABEL_TOP_MARGIN_DP") {

      if (this.state.addedPanel) this.hideMainPanel();
      if (this.state.addedSettings) this.hideSettingsPanel();
      if (this.state.addedViewer) this.hideViewerPanel();
      return;
    }

    if (k === "EDGE_VISIBLE_RATIO") {
      if (this.state.addedBall && this.state.docked) {
        this.state.docked = false;
        this.snapToEdgeDocked(false);
      }
      return;
    }
  } catch (e0) {}
};

FloatBallAppWM.prototype.commitPendingUserCfg = function() {
  try {
    if (!this.state.pendingUserCfg) return { ok: false, reason: "no_pending" };

    var schema = this.getConfigSchema();
    var changedKeys = [];
    var i;

    for (i = 0; i < schema.length; i++) {
      if (!schema[i] || !schema[i].key) continue;
      var k = String(schema[i].key);
      var oldV = this.config[k];
      var newV = this.state.pendingUserCfg[k];
      if (String(oldV) !== String(newV)) {
        this.config[k] = newV;
        changedKeys.push(k);
      }
    }

    this.persistUserCfgFromObject(this.state.pendingUserCfg);

    var j;
    for (j = 0; j < changedKeys.length; j++) {
      if (changedKeys[j] === "BALL_SIZE_DP") { this.applyImmediateEffectsForKey("BALL_SIZE_DP"); break; }
    }
    for (j = 0; j < changedKeys.length; j++) {
      if (changedKeys[j] !== "BALL_SIZE_DP") this.applyImmediateEffectsForKey(changedKeys[j]);
    }

    this.state.pendingDirty = false;
    safeLog(this.L, 'i',  "commit settings changed=" + JSON.stringify(changedKeys));
    return { ok: true, changed: changedKeys };
  } catch (e0) {
    safeLog(this.L, 'e',  "commitPendingUserCfg err=" + String(e0));
    return { ok: false, err: String(e0) };
  }
};

// =======================【工具：吸边数据】======================
FloatBallAppWM.prototype.getDockInfo = function() {
  var ballSize = this.dp(this.config.BALL_SIZE_DP);
  var visible = Math.max(1, Math.round(ballSize * this.config.EDGE_VISIBLE_RATIO));
  var hidden = ballSize - visible;
  return { ballSize: ballSize, visiblePx: visible, hiddenPx: hidden };
};

// =======================【工具：图标解析】======================

// =======================【工具：快捷方式图标文件路径】======================
FloatBallAppWM.prototype.getShortcutIconFilePath = function(pkg, shortcutId, userId) {
  // # 主要用途：把快捷方式图标持久化到 shortcut_icons 目录，供按钮页/按钮管理页稳定显示（桌面移除后仍可显示）
  try {
    var p = (pkg == null) ? "" : String(pkg);
    var s = (shortcutId == null) ? "" : String(shortcutId);
    var u = (userId == null) ? "0" : String(userId);

    // # 文件名去非法字符，避免路径注入或创建失败
    function _sn(v) {
      try {
        var t = String(v == null ? "" : v);
        t = t.replace(/[^a-zA-Z0-9._-]+/g, "_");
        if (t.length > 120) t = t.substring(0, 120);
        return t;
      } catch(e) { return ""; }
    }

    var dir = String(APP_ROOT_DIR) + "/shortcut_icons";
    var fn = _sn(p) + "__" + _sn(s) + "__u" + _sn(u) + ".png";
    return dir + "/" + fn;
  } catch (e0) {
    return "";
  }
};

FloatBallAppWM.prototype.resolveIconDrawable = function(btn) {
  // # 主要用途：解析面板按钮图标（优先 app 包名图标，其次自定义 resId，最后兜底）
  try {
    if (!btn) return context.getResources().getDrawable(android.R.drawable.ic_menu_help, null);

    // # 0) 优先检查 iconPath (绝对路径)
    // # 引用优化：复用 loadBallIconDrawableFromFile 安全加载逻辑
    if (btn.iconPath) {
        try {
             var path = String(btn.iconPath);
             if (path) {
                 // targetPx: 面板图标大小; Limit: 1MB, 1024px
                 var sizeDp = this.config.PANEL_ICON_SIZE_DP || 32;
                 var dr = this.loadBallIconDrawableFromFile(path, this.dp(sizeDp), 1048576, 1024);
                 if (dr) return dr;
             }
        } catch (ePath) {}
    }


// # 1) type=app 且配置了 pkg：自动取应用图标
try {
  var t = (btn.type == null) ? "" : String(btn.type);
  if (t === "app") {
    var pkg = (btn.pkg == null) ? "" : String(btn.pkg);
    if (pkg.length > 0) {
      // # 统一 LRU 缓存：避免频繁走 PackageManager（Drawable 可复用）；并带容量上限，防止无限增长
      var kApp = "app|" + pkg;
      var hitApp = this._iconLruGet(kApp);
      if (hitApp) return hitApp;

      var pm = context.getPackageManager();
      var drApp = pm.getApplicationIcon(pkg);
      if (drApp != null) {
        this._iconLruPut(kApp, drApp);
        return drApp;
      }
    }
  }
} catch (eApp) {}


    // # 1.5) type=shortcut：尝试取 Shortcuts 快捷方式图标（显示与 shortcuts.js 页面一致）
    // # 说明：btn 需要包含 pkg + shortcutId；图标获取可能较重，因此做简单缓存，失败则回退到应用图标。
    try {
      var t2 = (btn.type == null) ? "" : String(btn.type);
      if (t2 === "shortcut") {
        var pkg2 = (btn.pkg == null) ? "" : String(btn.pkg);
        var sid2 = (btn.shortcutId == null) ? "" : String(btn.shortcutId);
        if (pkg2.length > 0 && sid2.length > 0) {
          // # 1.5.1) 优先从 shortcut_icons 持久化目录读取（桌面移除后仍可显示正确图标）
          try {
            var iconFilePath0 = this.getShortcutIconFilePath(pkg2, sid2, (btn.userId != null ? String(btn.userId) : "0"));
            if (iconFilePath0) {
              try {
                var f0 = new java.io.File(iconFilePath0);
                if (f0.exists() && f0.isFile()) {
                  var sizeDp0 = this.config.PANEL_ICON_SIZE_DP || 32;
                  var iconSizePx0 = this.dp(sizeDp0);
                  var dr0 = this.loadBallIconDrawableFromFile(iconFilePath0, iconSizePx0, 1048576, 1024);
                  if (dr0) {
                    // # 写入统一 LRU 缓存：同一个 shortcut 复用 Drawable，避免反复解码 PNG
                    try {
                      var sk0 = pkg2 + "@" + sid2 + "@" + (btn.userId != null ? String(btn.userId) : "");
                      this._iconLruPut("sc|" + sk0, dr0);
                    } catch (eSc0) {}
                    return dr0;
                  }
                }
              } catch(eF0) {}
            }
          } catch(eFile0) {}
var skey = pkg2 + "@" + sid2 + "@" + (btn.userId != null ? String(btn.userId) : "");
          var kSc = "sc|" + skey;
          var hitSc = this._iconLruGet(kSc);
          if (hitSc) return hitSc;
          // # 失败冷却：某些 ROM/桌面在短时间内反复查询 Shortcuts 会很慢或直接抛异常。
          // # 这里对同一个 shortcut key 做短暂冷却（默认 10 秒），避免面板频繁刷新导致卡顿/ANR 风险。
          if (!this._shortcutIconFailTs) this._shortcutIconFailTs = {};
          var nowTs = 0;
          try { nowTs = new Date().getTime(); } catch(eNow) { nowTs = 0; }
          var lastFailTs = this._shortcutIconFailTs[skey];
          if (lastFailTs && nowTs > 0 && (nowTs - lastFailTs) < 10000) {
            // # 冷却期内直接跳过 shortcut icon 查询，走回退逻辑（应用图标）
          } else {

          var la = context.getSystemService(android.content.Context.LAUNCHER_APPS_SERVICE);
          if (la) {

            // # 修复：按钮管理页/按钮面板中，微信小程序等 shortcut 图标显示成宿主 App 图标
            // # 根因（工作假设）：用 setShortcutIds() 精确查询时，部分 ROM 的实现会返回"退化"的 ShortcutInfo，
            // # getShortcutIconDrawable 结果被降级为宿主 App 图标。
            // # 方案：完全复用 shortcuts.js 的做法--先按 package + flags 拉取该包的 shortcuts 列表，再在列表里按 id 过滤命中项取图标。
            // # 注意：不依赖外部 buildShortcutItemsIndex()，避免主程序环境下未加载 shortcuts.js 导致直接回退。
                        // # 方案：完全复用"选择快捷方式列表"的取数路径，确保微信小程序等 pinned shortcut 能拿到正确的 ShortcutInfo
            // # 1) 优先直连 shortcut service（选择器同款：信息更完整）
            // # 2) 失败再回退 LauncherApps.getShortcuts
            var list = null;

            // # 1) shortcut service 直连（与选择器保持一致）
            try {
              var userIdIntForSvc = 0;
              try {
                var buid2 = null;
                if (btn.userId != null) buid2 = btn.userId;
                if (buid2 == null && btn.user != null) buid2 = btn.user;
                if (buid2 != null) {
                  var tmpUid2 = parseInt(String(buid2), 10);
                  if (!isNaN(tmpUid2)) userIdIntForSvc = tmpUid2;
                }
              } catch(eUidSvc) {}

              var sm2 = android.os.ServiceManager;
              var shortcutSvc = null;
              try { shortcutSvc = sm2.getService("shortcut"); } catch(eSm2) { shortcutSvc = null; }
              if (shortcutSvc) {
                var CFG_MATCH_ALL2 = 0x0000000F;
                var slice2 = null;
                try { slice2 = shortcutSvc.getShortcuts(String(pkg2), CFG_MATCH_ALL2, userIdIntForSvc); } catch(eS0b) { slice2 = null; }
                if (slice2) {
                  var listObj2 = null;
                  try { listObj2 = slice2.getList(); } catch(eS1b) { listObj2 = null; }
                  if (listObj2) list = listObj2;
                }
              }
            } catch(eSvc2) {}

            // # 2) LauncherApps 回退（当 shortcut service 不可用或返回空时）
            if (list == null) {
              var q = new android.content.pm.LauncherApps.ShortcutQuery();
              try { q.setPackage(pkg2); } catch(eSP) {}

              // # 重要：必须设置 QueryFlags，否则 getShortcuts 可能返回空（默认 flags=0）
              // # 兼容性：不同 Android/ROM 可能缺少部分 FLAG，逐个 try 叠加
              try {
                var qFlags = 0;
                try { qFlags = qFlags | android.content.pm.LauncherApps.ShortcutQuery.FLAG_MATCH_DYNAMIC; } catch(eF1) {}
                try { qFlags = qFlags | android.content.pm.LauncherApps.ShortcutQuery.FLAG_MATCH_PINNED; } catch(eF2) {}
                try { qFlags = qFlags | android.content.pm.LauncherApps.ShortcutQuery.FLAG_MATCH_MANIFEST; } catch(eF3) {}
                try { qFlags = qFlags | android.content.pm.LauncherApps.ShortcutQuery.FLAG_MATCH_CACHED; } catch(eF4) {}
                try { q.setQueryFlags(qFlags); } catch(eSF) {}
              } catch(eQF) {}

              // # 重要：用户句柄优先用按钮携带的 userId（如有），否则使用当前用户
              var uh = android.os.Process.myUserHandle();
              try {
                var buid = null;
                if (btn.userId != null) buid = btn.userId;
                if (buid == null && btn.user != null) buid = btn.user;
                if (buid != null) {
                  var uidInt = parseInt(String(buid), 10);
                  if (!isNaN(uidInt)) {
                    uh = android.os.UserHandle.of(uidInt);
                  }
                }
              } catch(eUH) {}

              try { list = la.getShortcuts(q, uh); } catch(eGS) { list = null; }
            }

if (list && list.size && list.size() > 0) {
              // # 在返回列表中按 shortcutId 精确命中
              var si = null;
              try {
                for (var kk = 0; kk < list.size(); kk++) {
                  var s0 = list.get(kk);
                  if (s0 != null) {
                    var id0 = "";
                    try { id0 = String(s0.getId()); } catch(eId0) { id0 = ""; }
                    if (id0 === sid2) { si = s0; break; }
                  }
                }
              } catch(eFind) { si = null; }
if (si != null) {
                // # 与 shortcuts.js 一致：优先 la.getShortcutIconDrawable(shortcutInfo, 0)，再兜底 Icon.loadDrawable
                var drSc = null;
                try { drSc = la.getShortcutIconDrawable(si, 0); } catch(eIcon0) { drSc = null; }
                if (drSc == null) {
                  try {
                    var ic = si.getIcon();
                    if (ic != null) {
                      var d2 = ic.loadDrawable(context);
                      if (d2 != null) drSc = d2;
                    }
                  } catch(eIcon1) {}
                }
                if (drSc != null) {
                  try { this._iconLruPut("sc|" + skey, drSc); } catch (eSc1) {}
                  return drSc;
                }
              }
            }
          }



// # 如果没拿到 shortcut 图标，记录一次失败时间，触发冷却
            try {
              if (nowTs > 0) this._shortcutIconFailTs[skey] = nowTs;
              else this._shortcutIconFailTs[skey] = new Date().getTime();
            } catch(eFT) {}
          }


          // # 回退：取应用图标，至少保证按钮有图标可见
          try {
            var pm2 = context.getPackageManager();
            var drApp2 = pm2.getApplicationIcon(pkg2);
            if (drApp2 != null) return drApp2;
          } catch(eFall) {}
        }
      }
    } catch (eSc) {}
    // # 2) 显式指定 iconResName (String) 或 iconResId (int)
    try {
      if (btn.iconResName) {
        var drShortx = this.resolveShortXDrawable(btn.iconResName, btn && btn.iconTint ? String(btn.iconTint) : "");
        if (drShortx != null) return drShortx;
        var name = this.normalizeShortXIconName(btn.iconResName, true);
        // # 回退到 android 系统图标
        var id = context.getResources().getIdentifier(name, "drawable", "android");
        if (id > 0) return context.getResources().getDrawable(id, null);
      }
      if (btn.iconResId) return context.getResources().getDrawable(btn.iconResId, null);
    } catch (e1) {}

    // # 3) 兜底
    return context.getResources().getDrawable(android.R.drawable.ic_menu_help, null);
  } catch (e2) {}
  return null;
};

FloatBallAppWM.prototype.getShortXResHandle = function() {
  if (this._shortxResHandle) return this._shortxResHandle;
  try {
    var flags = 0;
    try { flags = android.content.Context.CONTEXT_INCLUDE_CODE | android.content.Context.CONTEXT_IGNORE_SECURITY; } catch (eF) { flags = android.content.Context.CONTEXT_RESTRICTED; }
    var sxCtx = context.createPackageContext(CONST_SHORTX_PACKAGE, flags);
    this._shortxResHandle = {
      ctx: sxCtx,
      res: sxCtx.getResources(),
      cl: sxCtx.getClassLoader(),
      pkg: CONST_SHORTX_PACKAGE
    };
    return this._shortxResHandle;
  } catch (e) {
    safeLog(this.L, 'w', "getShortXResHandle failed: " + String(e));
    return null;
  }
};

FloatBallAppWM.prototype.normalizeShortXIconName = function(name, keepPrefix) {
  try {
    var s = String(name == null ? "" : name).replace(/^\s+|\s+$/g, "");
    if (!s) return "";
    if (s.indexOf("@drawable/") === 0) s = s.substring(10);
    if (s.indexOf(".") > 0) {
      var parts = s.split(".");
      s = parts[parts.length - 1];
    }
    if (s.indexOf("ic_remix_") === 0) {
      return keepPrefix ? s : s.substring("ic_remix_".length);
    }
    if (s.indexOf("ic_") === 0) {
      return s;
    }
    return keepPrefix ? ("ic_remix_" + s) : s;
  } catch (e) {}
  return "";
};

FloatBallAppWM.prototype.getShortXApkPaths = function() {
  var out = [];
  try {
    var handle = this.getShortXResHandle();
    var ai = null;
    try { if (handle && handle.ctx) ai = handle.ctx.getApplicationInfo(); } catch (eAi0) { ai = null; }
    if (ai == null) {
      try { ai = context.getPackageManager().getApplicationInfo(CONST_SHORTX_PACKAGE, 0); } catch (eAi1) { ai = null; }
    }
    function pushPath(p) {
      try {
        p = String(p || "");
        if (!p) return;
        if (out.indexOf(p) < 0) out.push(p);
      } catch (eP) {}
    }
    if (ai) {
      try { pushPath(ai.sourceDir); } catch (e0) {}
      try { pushPath(ai.publicSourceDir); } catch (e1) {}
      try {
        var ss = ai.splitSourceDirs;
        if (ss) {
          var i;
          for (i = 0; i < ss.length; i++) pushPath(ss[i]);
        }
      } catch (e2) {}
    }
  } catch (e) {}
  return out;
};

FloatBallAppWM.prototype.scanShortXIconsFromApk = function() {
  var out = [];
  var seen = {};
  var paths = this.getShortXApkPaths();
  var regex = /^res\/drawable[^\/]*\/(ic_remix_[a-z0-9_]+|ic_shortx|ic_launcher|ic_menu_preferences)\.(xml|png|webp|jpg|jpeg)$/;
  var lastErr = "";
  var pi;
  for (pi = 0; pi < paths.length; pi++) {
    var zip = null;
    try {
      zip = new java.util.zip.ZipFile(String(paths[pi]));
      var en = zip.entries();
      while (en.hasMoreElements()) {
        var ze = en.nextElement();
        var name = String(ze.getName());
        var m = regex.exec(name);
        if (!m) continue;
        var fullName = String(m[1]);
        if (seen[fullName]) continue;
        seen[fullName] = true;
        out.push({
          name: fullName,
          shortName: this.normalizeShortXIconName(fullName, false),
          id: 0
        });
      }
    } catch (eZip) {
      lastErr = String(eZip);
    } finally {
      try { if (zip) zip.close(); } catch (eClose) {}
    }
  }
  if ((!out || out.length === 0) && lastErr) this._shortxIconCatalogError = lastErr;
  return out;
};

FloatBallAppWM.prototype.getShortXIconLookupNames = function(name) {
  var out = [];
  try {
    var s = String(name == null ? "" : name).replace(/^\s+|\s+$/g, "");
    if (!s) return out;
    if (s.indexOf("@drawable/") === 0) s = s.substring(10);
    if (s.indexOf(".") > 0) {
      var parts = s.split(".");
      s = parts[parts.length - 1];
    }
    function add(v) {
      if (!v) return;
      if (out.indexOf(v) < 0) out.push(v);
    }
    add(s);
    if (s.indexOf("ic_remix_") === 0) {
      add(s.substring("ic_remix_".length));
    } else if (s.indexOf("ic_") !== 0) {
      add("ic_remix_" + s);
      add("ic_" + s);
    }
  } catch (e) {}
  return out;
};

FloatBallAppWM.prototype.resolveShortXDrawableResId = function(name) {
  try {
    var handle = this.getShortXResHandle();
    if (!handle || !handle.res) return 0;
    var cands = this.getShortXIconLookupNames(name);
    var i;
    for (i = 0; i < cands.length; i++) {
      var resId = 0;
      try { resId = handle.res.getIdentifier(String(cands[i]), "drawable", handle.pkg); } catch (e1) { resId = 0; }
      if (resId > 0) return resId;
    }
  } catch (e) {}
  return 0;
};

FloatBallAppWM.prototype.resolveShortXDrawable = function(name, tintHex) {
  try {
    var handle = this.getShortXResHandle();
    if (!handle || !handle.res) return null;
    var resId = this.resolveShortXDrawableResId(name);
    if (resId <= 0) return null;
    var dr = handle.res.getDrawable(resId, null);
    if (dr && tintHex) {
      try {
        dr = dr.mutate();
        dr.setColorFilter(android.graphics.Color.parseColor(String(tintHex)), android.graphics.PorterDuff.Mode.SRC_IN);
      } catch (eTint) {}
    }
    return dr;
  } catch (e) {}
  return null;
};

FloatBallAppWM.prototype.getShortXIconCatalog = function(forceReload) {
  if (!forceReload && this._shortxIconCatalog) return this._shortxIconCatalog;
  var out = [];
  this._shortxIconCatalogError = "";
  try {
    var handle = this.getShortXResHandle();
    if (handle && handle.cl) {
      try {
        var clz = handle.cl.loadClass(CONST_SHORTX_PACKAGE + ".R$drawable");
        var fields = clz.getFields();
        var i;
        for (i = 0; i < fields.length; i++) {
          try {
            var f = fields[i];
            var fname = String(f.getName());
            if (fname.indexOf("ic_remix_") !== 0 && fname !== "ic_shortx" && fname !== "ic_launcher" && fname !== "ic_menu_preferences") continue;
            out.push({
              name: fname,
              shortName: (fname.indexOf("ic_remix_") === 0) ? fname.substring("ic_remix_".length) : fname,
              id: f.getInt(null)
            });
          } catch (eField) {}
        }
      } catch (eClz) {
        this._shortxIconCatalogError = String(eClz);
        safeLog(this.L, 'w', "getShortXIconCatalog reflect failed: " + String(eClz));
      }
    }
    if (!out || out.length === 0) {
      out = this.scanShortXIconsFromApk();
    }
    out.sort(function(a, b) {
      var aw = a.name.indexOf("ic_remix_") === 0 ? 1 : 0;
      var bw = b.name.indexOf("ic_remix_") === 0 ? 1 : 0;
      if (aw !== bw) return aw - bw;
      var as = String(a.shortName || a.name);
      var bs = String(b.shortName || b.name);
      return as < bs ? -1 : (as > bs ? 1 : 0);
    });
    if (!out || out.length === 0) {
      if (!this._shortxIconCatalogError) this._shortxIconCatalogError = "反射与 APK 扫描均未获取到图标";
    } else {
      this._shortxIconCatalogError = "";
    }
  } catch (e) {
    this._shortxIconCatalogError = String(e);
    safeLog(this.L, 'w', "getShortXIconCatalog failed: " + String(e));
  }
  this._shortxIconCatalog = out;
  return out;
};

// =======================【工具：快捷方式选择器（内置，合并 shortcuts.js）】======================
// 这段代码的主要内容/用途：在 toolhub.js 内部提供与 shortcuts.js 等价的"快捷方式浏览/选择"页面（仅在点击"选择快捷方式"时触发）。
// 设计要点：
// 1) 双线程流水线：UI 线程专管 WM/View；BG 线程专管 icon 加载，避免卡顿/ANR 风险。
// 2) 稳定性：失败 TTL 熔断 + 限次重试 + icon LRU 上限；滚动触底用轮询，避免 interface listener 的 JavaAdapter 风险。
// 3) UI 风格：复用 ToolHub 主题（白天/夜晚），避免与主面板割裂；支持关闭与安全销毁。
// 4) 日志：复用 ToolHubLogger（self.L / _th_log）记录关键步骤与异常。
FloatBallAppWM.prototype.showShortcutPicker = function(opts) {
  var self = this;
  var opt = opts || {};
  var mode = (opt.mode != null) ? String(opt.mode) : "browse"; // "pick" | "browse"
  var onPick = (typeof opt.onPick === "function") ? opt.onPick : null;

  // # 会话隔离：生成唯一会话 ID，防止状态污染
  var sessionId = String(new Date().getTime()) + "_" + Math.random().toString(36).substr(2, 9);
  var currentSession = sessionId;

  // 保存当前会话 ID 到实例（用于新选择器）
  this.__currentShortcutSession = sessionId;

  // 会话检查函数：所有异步回调都必须检查
  function checkSession() {
    if (self.__currentShortcutSession !== currentSession) {
      safeLog(self.L, 'w', "Shortcut picker session expired, dropping callback");
      return false;
    }
    return true;
  }

  // 清理函数
  function destroySession() {
    if (self.__currentShortcutSession === currentSession) {
      self.__currentShortcutSession = null;
    }
  }

  // # 稳定性：复用单例选择器，避免频繁 add/remove View 与线程创建销毁导致 system_server 概率性崩溃
  try {
    if (self.__shortcutPickerSingleton && typeof self.__shortcutPickerSingleton.show === "function") {
      // # 新会话覆盖旧会话
      self.__shortcutPickerSingleton.show(opts);
      return;
    }
  } catch(eSingle) {}


  // # 兼容：toolhub.js 全局未必定义 Context 别名，这里显式绑定，避免 ReferenceError。
  var Context = android.content.Context;

  // # 常量：可按需调小以降低 system_server 内存峰值
  var CFG_PAGE_BATCH = 40;
  var CFG_ICON_CACHE_MAX = 120;
  var CFG_ICON_FAIL_TTL_MS = 15000;
  var CFG_ICON_FAIL_MAX_RETRY = 2;
  var CFG_ICON_LOAD_CONCURRENCY = 2;
  // # 这段代码的主要内容/用途：ShortcutService.getShortcuts 的匹配 flags（与 shortcuts.js 保持一致）
  // # 说明：使用 0x0000000F 可尽量覆盖 Dynamic / Manifest / Pinned / Cached 等类型
  var CFG_MATCH_ALL = 0x0000000F;

  function now() { try { return new Date().getTime(); } catch(e) { return 0; } }
  function lower(s) { try { return String(s || "").toLowerCase(); } catch(e) { return ""; } }
  function safeStr(s) { try { return String(s == null ? "" : s); } catch(e) { return ""; } }

  // # 增强版：动态获取系统用户目录（适配不同 ROM）
  function getSystemUserDir() {
    var candidates = [
      "/data/system_ce",           // 标准 AOSP
      "/data/system/users",      // 部分 MIUI/HyperOS
      "/data/data/system_ce"     // 极少数定制系统
    ];

    for (var i = 0; i < candidates.length; i++) {
      try {
        var f = new java.io.File(candidates[i]);
        if (f.exists() && f.isDirectory() && f.canRead()) {
          return candidates[i];
        }
      } catch(e) {}
    }

    // 反射获取环境变量（最可靠但较慢）
    try {
      var env = java.lang.System.getenv("ANDROID_DATA");
      if (env) {
        var envPath = String(env) + "/system_ce";
        var envDir = new java.io.File(envPath);
        if (envDir.exists() && envDir.isDirectory()) {
          return envPath;
        }
      }
    } catch(e) {}

    // 最终兜底
    return "/data/system_ce";
  }

  // ==================== Shortcut 枚举（system_ce + shortcut service） ====================
  function listUserIdsFromSystemCE() {
    // # 这段代码的主要内容/用途：扫描 /data/system_ce 下的用户目录，得到可用 userId 列表。
    var out = [];
    try {
      var basePath = getSystemUserDir();
      var base = new java.io.File(basePath);
      if (!base.exists() || !base.isDirectory()) return out;
      var arr = base.listFiles();
      if (!arr) return out;
      for (var i = 0; i < arr.length; i++) {
        var f = arr[i];
        if (!f || !f.isDirectory()) continue;
        var name = safeStr(f.getName());
        if (!name) continue;
        // 只收数字目录
        var ok = true;
        for (var j = 0; j < name.length; j++) {
          var c = name.charCodeAt(j);
          if (c < 48 || c > 57) { ok = false; break; }
        }
        if (!ok) continue;
        out.push(parseInt(name, 10));
      }
    } catch(e) {}
    // 默认兜底：至少有 user 0
    if (out.length === 0) out.push(0);
    return out;
  }

  function listPackagesHavingShortcuts(userId) {
    // # 这段代码的主要内容/用途：从 shortcut_service 的持久化目录推断哪些包存在快捷方式记录（快速筛选）。
    var out = [];
    try {
      // # 使用动态获取的系统用户目录
      var basePath = "/data/system_ce";
      try {
        if (typeof getSystemUserDir === "function") {
          basePath = getSystemUserDir();
        }
      } catch(eGSD2) {}

      var dir = new java.io.File(basePath + "/" + String(userId) + "/shortcut_service/packages");
      if (!dir.exists() || !dir.isDirectory()) return out;
      var fs = dir.listFiles();
      if (!fs) return out;
      for (var i = 0; i < fs.length; i++) {
        var f = fs[i];
        if (!f || !f.isFile()) continue;
        var name = safeStr(f.getName());
        if (!name) continue;
        if (name.indexOf(".xml") > 0) {
          var pkg = name.substring(0, name.length - 4);
          if (pkg && pkg.length > 0) out.push(pkg);
        }
      }
    } catch(e) {}
    return out;
  }

  function getShortcutServiceBinder() {
    // # 这段代码的主要内容/用途：获取 "shortcut" service 的 Binder（不同 ROM 上可能失败，失败则回退到 LauncherApps API 取 icon）。
    try {
      var sm = android.os.ServiceManager;
      return sm.getService("shortcut");
    } catch(e) {
      return null;
    }
  }

  function getShortcutsForPackage(pkg, userId) {
    // # 这段代码的主要内容/用途：尝试从 shortcut service 拉取指定包的 ShortcutInfo 列表。
    // 说明：此处采用"尽力而为"，因为 ROM 兼容性差；失败时返回空数组即可。
    var out = [];
    try {
      // # 修复：与 shortcuts.js 行为一致，优先走 shortcut 服务直连（可拿到"添加到桌面"的微信小程序这类入口）
      // # 说明：LauncherApps.getShortcuts 在部分 ROM/桌面上对非 Launcher 调用者可见性不足，导致列表缺项。
      try {
        var svc = getShortcutServiceBinder();
        if (svc) {
          var slice = null;
          try { slice = svc.getShortcuts(String(pkg), CFG_MATCH_ALL, parseInt(String(userId), 10)); } catch(eS0) { slice = null; }
          if (slice) {
            var listObj = null;
            try { listObj = slice.getList(); } catch(eS1) { listObj = null; }
            if (listObj) {
              try {
                var sz = listObj.size();
                for (var si0 = 0; si0 < sz; si0++) {
                  try {
                    var s0 = listObj.get(si0);
                    if (s0) out.push(s0);
                  } catch(eS2) {}
                }
              } catch(eS3) {}
              if (out.length > 0) return out;
            }
          }
        }
      } catch(eSvc) {
        // ignore and fallback
      }

      // # 兜底：走 LauncherApps.getShortcuts（某些 ROM 上 shortcut 服务直连可能不可用）
      var la = context.getSystemService(Context.LAUNCHER_APPS_SERVICE);
      if (!la) return out;

      var LauncherApps = android.content.pm.LauncherApps;
      var LauncherAppsShortcutQuery = android.content.pm.LauncherApps.ShortcutQuery;

      var q = new LauncherAppsShortcutQuery();
      // FLAG_MATCH_*：尽量全拿（动态/固定/清单）
      try {
        q.setQueryFlags(
          LauncherAppsShortcutQuery.FLAG_MATCH_DYNAMIC |
          LauncherAppsShortcutQuery.FLAG_MATCH_PINNED |
          LauncherAppsShortcutQuery.FLAG_MATCH_MANIFEST |
          LauncherAppsShortcutQuery.FLAG_MATCH_CACHED
        );
      } catch(eF) {
        // 某些 ROM 没有 FLAG_MATCH_CACHED
        try {
          q.setQueryFlags(
            LauncherAppsShortcutQuery.FLAG_MATCH_DYNAMIC |
            LauncherAppsShortcutQuery.FLAG_MATCH_PINNED |
            LauncherAppsShortcutQuery.FLAG_MATCH_MANIFEST
          );
        } catch(eF2) {}
      }
      try { q.setPackage(safeStr(pkg)); } catch(eP) {}

      // user 处理：尽量兼容多用户
      var userHandle = null;
      try {
        if (userId != null) {
          var UserHandle = android.os.UserHandle;
          userHandle = UserHandle.of(parseInt(String(userId), 10));
        }
      } catch(eU) { userHandle = null; }

      var list = null;
      try {
        if (userHandle) list = la.getShortcuts(q, userHandle);
        else list = la.getShortcuts(q, android.os.Process.myUserHandle());
      } catch(eQ) {
        list = null;
      }

      if (!list) return out;
      for (var i = 0; i < list.size(); i++) {
        try {
          var si = list.get(i);
          if (si) out.push(si);
        } catch(eI) {}
      }
    } catch(e) {}
    return out;
  }

  function getAppLabelAsUser(pkg, userId) {
    // # 这段代码的主要内容/用途：获取应用名称（用于分组/搜索显示），失败则返回包名。
    try {
      var pm = context.getPackageManager();
      var ai = pm.getApplicationInfo(String(pkg), 0);
      var lb = pm.getApplicationLabel(ai);
      if (lb != null) return String(lb);
    } catch(e) {}
    return String(pkg);
  }

  function buildShortcutItemsIndex() {
    // # 这段代码的主要内容/用途：汇总所有 userId 下的快捷方式为统一列表，结构与 shortcuts.js 保持一致。
    var items = [];
    var users = listUserIdsFromSystemCE();
    for (var ui = 0; ui < users.length; ui++) {
      var uid = users[ui];
      var pkgs = listPackagesHavingShortcuts(uid);
      for (var pi = 0; pi < pkgs.length; pi++) {
        var pkg = pkgs[pi];
        if (!pkg) continue;
        var sis = getShortcutsForPackage(pkg, uid);
        if (!sis || sis.length === 0) continue;
        for (var si = 0; si < sis.length; si++) {
          var sInfo = sis[si];
          if (!sInfo) continue;
          var id = "";
          var label = "";
          var intentUri = "";
          try { id = safeStr(sInfo.getId()); } catch(eId) { id = ""; }
          try { label = safeStr(sInfo.getShortLabel()); } catch(eLb) { label = ""; }
          try {
            var it = sInfo.getIntent();
            if (it) intentUri = safeStr(it.toUri(0));
          } catch(eIt) { intentUri = ""; }

          items.push({
            userId: uid,
            pkg: safeStr(pkg),
            id: id,
            label: label,
            intentUri: intentUri,
            shortcutInfo: sInfo
          });
        }
      }
    }
    return items;
  }

  // ==================== icon 加载（与 resolveIconDrawable 回退策略一致） ====================
  function loadShortcutIconDrawable(item) {
    // # 这段代码的主要内容/用途：尽力加载 shortcut icon；失败时回退到 app icon。
    try {
      if (!item) return null;
      var la = context.getSystemService(Context.LAUNCHER_APPS_SERVICE);
      if (la && item.shortcutInfo) {
        try {
          // density: 0 让系统自适应（部分 ROM 更稳）
          var dr = la.getShortcutIconDrawable(item.shortcutInfo, 0);
          if (dr) return dr;
        } catch(eLa) {}
      }
    } catch(e0) {}
    // fallback: app icon
    try {
      var pm = context.getPackageManager();
      return pm.getApplicationIcon(String(item.pkg));
    } catch(e1) {}
    return null;
  }

  // ==================== 分组/过滤 ====================
  function groupItems(items) {
    // # 这段代码的主要内容/用途：按应用分组，tab 显示用；同时保留 "__ALL__"。
    var groups = {};
    var order = [];
    function ensure(key, title) {
      if (groups[key]) return;
      groups[key] = { key: key, title: title, items: [] };
      order.push(key);
    }
    ensure("__ALL__", "全部");
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it) continue;
      groups["__ALL__"].items.push(it);
      var k = safeStr(it.pkg);
      if (!groups[k]) {
        ensure(k, getAppLabelAsUser(k, it.userId));
      }
      groups[k].items.push(it);
    }
    // 让 "__ALL__" 固定在第一位，其余按 title 排序（中文/英文混排就随缘）
    try {
      var rest = [];
      for (var j = 0; j < order.length; j++) if (order[j] !== "__ALL__") rest.push(order[j]);
      rest.sort(function(a, b) {
        var ta = safeStr(groups[a].title);
        var tb = safeStr(groups[b].title);
        return ta.localeCompare(tb);
      });
      order = ["__ALL__"].concat(rest);
    } catch(eS) {}
    return { groups: groups, order: order };
  }

  function filterItems(items, q) {
    var qLower = lower(q || "");
    if (!qLower) return items;
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it) continue;
      var hit = false;
      if (lower(it.label).indexOf(qLower) > -1) hit = true;
      else if (lower(it.pkg).indexOf(qLower) > -1) hit = true;
      else if (lower(it.id).indexOf(qLower) > -1) hit = true;
      else if (lower(it.intentUri).indexOf(qLower) > -1) hit = true;
      if (hit) out.push(it);
    }
    return out;
  }

  // ==================== 主 UI（WM 双线程 + 轮询触底） ====================
  var HandlerThread = android.os.HandlerThread;
  var Handler = android.os.Handler;
  var Runnable = java.lang.Runnable;
  var Thread = java.lang.Thread;

  var ht = new HandlerThread("sx-toolhub-shortcut-ui");
  ht.start();
  var h = new Handler(ht.getLooper());

  var bgHt = new HandlerThread("sx-toolhub-shortcut-bg");
  bgHt.start();
  var bgH = new Handler(bgHt.getLooper());

  var wm = context.getSystemService(Context.WINDOW_SERVICE);

  var state = {
    destroyed: false,
    hidden: false,
    // # 单例标识：用于避免旧实例的异步回调误操作新实例
    instanceId: String(now()) + "_" + String(Math.random()),
    root: null,
    params: null,
    isAdded: false,

    allItems: [],
    groups: null,
    groupOrder: [],
    currentGroupKey: "__ALL__",

    query: "",
    lastFilterToken: 0,

    iconCache: {},
    iconCacheOrder: [],
    iconCacheMax: CFG_ICON_CACHE_MAX,

    iconFail: {},

    iconQ: [],
    iconInFlight: 0,
    iconConc: CFG_ICON_LOAD_CONCURRENCY,

    grid: null,
    tvStat: null,
    etSearch: null,
    tabRow: null,
    scrollView: null,

    renderList: [],
    renderCursor: 0,
    isAppending: false,
    lastAppendTryTs: 0,

    scrollPollRunning: false,

    // # 回调：关闭/隐藏后通知外层恢复上层 UI（避免被新增按钮页遮挡）
    onDismiss: (opt && typeof opt.onDismiss === "function") ? opt.onDismiss : null,
    onDismissCalled: false
  };


  function Ld(msg) { try { if (self.L) self.L.d("[shortcut] " + msg); } catch(e) {} }
  function Li(msg) { try { if (self.L) self.L.i("[shortcut] " + msg); } catch(e) {} }
  function Le(msg) { try { if (self.L) self.L.e("[shortcut] " + msg); } catch(e) {} }

  function runOn(handler, fn) {
    try {
      handler.post(new JavaAdapter(Runnable, { run: function() { try { fn(); } catch(e) {} } }));
      return true;
    } catch(e) { return false; }
  }
  function hide() {
    // # 这段代码的主要内容/用途：隐藏"选择快捷方式"窗口（不 removeView、不销毁线程），显著降低 system_server 概率性崩溃
    runOn(h, function() {
      // # 会话检查：过期会话直接丢弃
      if (!checkSession()) return;

      if (state.destroyed) return;
      if (state.hidden) return;
      state.hidden = true;
      state.scrollPollRunning = false;

      // # 停止队列与异步：隐藏后不再触发 UI/图标加载逻辑
      try { h.removeCallbacksAndMessages(null); } catch(eCB0) {}
      try { bgH.removeCallbacksAndMessages(null); } catch(eCB1) {}

      // # 输入法/焦点：无论是否弹出输入法，都先退焦点并尝试隐藏软键盘
      try {
        if (state.etSearch) {
          try { state.etSearch.clearFocus(); } catch(eK0) {}
          try {
            var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
            if (imm) imm.hideSoftInputFromWindow(state.etSearch.getWindowToken(), 0);
          } catch(eK1) {}
        }
      } catch(eK2) {}

      // # 仅隐藏 View：不触碰 WM removeView，避免 WM/IME token 状态机被打乱
      try {
        if (state.root) {
          state.root.setVisibility(android.view.View.GONE);
        }
      } catch(eV0) {}

      // # 退出线程：hide 时也释放线程，避免反复打开/隐藏导致线程堆积
      try {
        var killer = new Thread(new JavaAdapter(Runnable, {
          run: function() {
            try { bgHt.quitSafely(); } catch(e2) {}
            try { ht.quitSafely(); } catch(e3) {}
          }
        }));
        killer.start();
      } catch(eQuit) {}

      // # 通知外层：选择器已隐藏，可恢复上层面板显示
      try {
        if (state.onDismiss && !state.onDismissCalled) {
          state.onDismissCalled = true;
          try { state.onDismiss(); } catch(eOD0) {}
        }
      } catch(eOD1) {}
    });
  }

  function destroy() {
    // # 会话清理：标记当前会话已结束
    destroySession();

    // # 这段代码的主要内容/用途：彻底销毁选择器（仅在 wm_add_failed 等失败场景使用）
    runOn(h, function() {
      if (state.destroyed) return;
      state.destroyed = true;
      state.hidden = true;
      state.scrollPollRunning = false;

      // # 清理消息队列
      try { h.removeCallbacksAndMessages(null); } catch(eCB0) {}
      try { bgH.removeCallbacksAndMessages(null); } catch(eCB1) {}

      try { state.iconQ = []; } catch(e0) {}
      state.iconInFlight = 0;

      // # 通知外层：选择器即将销毁，可恢复上层面板显示
      try {
        if (state.onDismiss && !state.onDismissCalled) {
          state.onDismissCalled = true;
          try { state.onDismiss(); } catch(eOD0) {}
        }
      } catch(eOD1) {}

      // # 输入法/焦点清理
      try {
        if (state.etSearch) {
          try { state.etSearch.clearFocus(); } catch(eK0) {}
          try {
            var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
            if (imm) imm.hideSoftInputFromWindow(state.etSearch.getWindowToken(), 0);
          } catch(eK1) {}
        }
      } catch(eK2) {}

      // # 尝试移除 View（失败也吞掉，避免把 system_server 再次打穿）
      var rootRef = state.root;
      var wasAdded = state.isAdded;
      try {
        if (rootRef && wasAdded) {
          try { wm.removeViewImmediate(rootRef); } catch(eR0) { try { wm.removeView(rootRef); } catch(eR1) {} }
        }
      } catch(eR2) {}

      state.isAdded = false;
      state.root = null;

      // # 单例清理
      try { if (self.__shortcutPickerSingleton && self.__shortcutPickerSingleton.instanceId === state.instanceId) self.__shortcutPickerSingleton = null; } catch(eS0) {}

      // # 退出线程
      var killer = new Thread(new JavaAdapter(Runnable, {
        run: function() {
          try { bgHt.quitSafely(); } catch(e2) {}
          try { ht.quitSafely(); } catch(e3) {}
        }
      }));
      killer.start();
    });
  }

function cacheGet(key) {
    if (state.iconCache.hasOwnProperty(key)) return state.iconCache[key];
    return null;
  }

  function cachePut(key, drawable) {
    state.iconCache[key] = drawable;
    var seen = false;
    for (var i = state.iconCacheOrder.length - 1; i >= 0; i--) {
      if (state.iconCacheOrder[i] === key) { seen = true; break; }
    }
    if (!seen) state.iconCacheOrder.push(key);

    while (state.iconCacheOrder.length > state.iconCacheMax) {
      var oldKey = state.iconCacheOrder.shift();
      if (oldKey == null) continue;
      if (oldKey === key) continue;
      try { delete state.iconCache[oldKey]; } catch(e1) { state.iconCache[oldKey] = null; }
      try { delete state.iconFail[oldKey]; } catch(e2) { state.iconFail[oldKey] = null; }
    }
  }

  function canTryLoadIcon(key) {
    var rec = state.iconFail[key];
    if (!rec) return true;
    var t = now();
    if (rec.count >= CFG_ICON_FAIL_MAX_RETRY) {
      if (t - rec.ts < 300000) return false;
      return true;
    }
    if (t - rec.ts < CFG_ICON_FAIL_TTL_MS) return false;
    return true;
  }

  function markIconFail(key) {
    var t = now();
    var rec = state.iconFail[key];
    if (!rec) rec = { ts: t, count: 1 };
    else { rec.ts = t; rec.count = (rec.count || 0) + 1; }
    state.iconFail[key] = rec;
  }

  function enqueueIconLoad(item, iv, key) {
    if (!item || !iv || !key) return;
    if (!canTryLoadIcon(key)) return;

    state.iconQ.push({ item: item, iv: iv, key: key });
    pumpIconQ();
  }

  function pumpIconQ() {
    if (state.destroyed) return;
    while (state.iconInFlight < state.iconConc && state.iconQ.length > 0) {
      var job = state.iconQ.shift();
      if (!job) continue;
      state.iconInFlight++;

      (function(j) {
        runOn(bgH, function() {
          var dr = null;
          try { dr = loadShortcutIconDrawable(j.item); } catch(e0) { dr = null; }
          runOn(h, function() {
            state.iconInFlight--;
            if (state.destroyed) return;

            if (dr) {
              try { j.iv.setImageDrawable(dr); } catch(e1) {}
              cachePut(j.key, dr);
            } else {
              markIconFail(j.key);
            }
            pumpIconQ();
          });
        });
      })(job);
    }
  }

  function setStat(text) { try { if (state.tvStat) state.tvStat.setText(String(text)); } catch(e) {} }

  function rebuildRenderList() {
    var g = state.groups ? state.groups[state.currentGroupKey] : null;
    var base = (g && g.items) ? g.items : state.allItems;
    var filtered = filterItems(base, state.query);

    state.renderList = filtered;
    state.renderCursor = 0;
    state.isAppending = false;
    state.lastAppendTryTs = 0;
  }

  function clearGrid() {
    try {
      if (state.grid) state.grid.removeAllViews();
    } catch(e) {}
  }

  function appendBatch() {
    if (state.destroyed) return;
    if (!state.grid) return;

    if (state.isAppending) return;
    state.isAppending = true;

    var start = state.renderCursor;
    var end = Math.min(state.renderCursor + CFG_PAGE_BATCH, state.renderList.length);

    for (var i = start; i < end; i++) {
      (function(idx) {
        var it = state.renderList[idx];

        var row = new android.widget.LinearLayout(context);
        row.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        row.setGravity(android.view.Gravity.CENTER_VERTICAL);

        // # 条目间距：卡片式列表，每条之间留 8dp 间隔
        try {
          var lpRow = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
          lpRow.setMargins(0, 0, 0, self.dp(8));
          row.setLayoutParams(lpRow);
        } catch(eLpR) {}

        row.setPadding(self.dp(12), self.dp(10), self.dp(12), self.dp(10));

        // # 行背景：与 ToolHub 卡片色一致，并加轻微描边增强层次
        try {
          var isDark = self.isDarkTheme();
          var bgColor = isDark ? self.ui.colors.cardDark : self.ui.colors.cardLight;
          var stroke = isDark ? self.ui.colors.dividerDark : self.ui.colors.dividerLight;
          row.setBackground(self.ui.createStrokeDrawable(bgColor, stroke, self.dp(1), self.dp(12)));
        } catch(eBg) {}

        var iv = new android.widget.ImageView(context);
        var lpI = new android.widget.LinearLayout.LayoutParams(self.dp(40), self.dp(40));
        lpI.setMargins(0, 0, self.dp(12), 0);
        iv.setLayoutParams(lpI);
        try { iv.setImageResource(android.R.drawable.sym_def_app_icon); } catch(eI0) {}

        var key = safeStr(it.pkg) + "@" + safeStr(it.id) + "@" + safeStr(it.userId);
        var cached = cacheGet(key);
        if (cached) {
          try { iv.setImageDrawable(cached); } catch(eIC) {}
        } else {
          enqueueIconLoad(it, iv, key);
        }

        var col = new android.widget.LinearLayout(context);
        col.setOrientation(android.widget.LinearLayout.VERTICAL);
        var lpC = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        lpC.weight = 1;
        col.setLayoutParams(lpC);

        var tv1 = new android.widget.TextView(context);
        tv1.setText(safeStr(it.label || it.id || it.pkg));
        tv1.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
        try { tv1.setTypeface(null, android.graphics.Typeface.BOLD); } catch(eB) {}
        try { tv1.setTextColor(self.isDarkTheme() ? self.ui.colors.textPriDark : self.ui.colors.textPriLight); } catch(eC1) {}
        tv1.setSingleLine(true);
        tv1.setEllipsize(android.text.TextUtils.TruncateAt.END);
        col.addView(tv1);

        var tv2 = new android.widget.TextView(context);
        tv2.setText(safeStr(it.pkg) + " / " + safeStr(it.id));
        tv2.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
        tv2.setSingleLine(true);
        tv2.setEllipsize(android.text.TextUtils.TruncateAt.END);
        try { tv2.setTextColor(self.isDarkTheme() ? self.ui.colors.textSecDark : self.ui.colors.textSecLight); } catch(eC2) {}
        col.addView(tv2);

        // # pick 模式：额外显示 userId，避免多用户/工作资料混淆
        if (mode === "pick") {
          var tv3 = new android.widget.TextView(context);
          tv3.setText("userId: " + safeStr(it.userId));
          tv3.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 10);
          tv3.setSingleLine(true);
          try { tv3.setTextColor(self.isDarkTheme() ? self.ui.colors.textSecDark : self.ui.colors.textSecLight); } catch(eC3) {}
          col.addView(tv3);
        }

        row.addView(iv);
        row.addView(col);

        // 点击：pick 模式回传；browse 模式尝试启动
        row.setOnClickListener(new android.view.View.OnClickListener({
          onClick: function() {
            try {
              if (mode === "pick") {
                if (onPick) onPick({ pkg: it.pkg, shortcutId: it.id, label: it.label, userId: it.userId, intentUri: it.intentUri });
                hide();
                return;
              }
              // browse：尽力启动（用 LauncherApps.startShortcut）
              try {
                var la = context.getSystemService(Context.LAUNCHER_APPS_SERVICE);
                if (la) {
                  var uh = android.os.UserHandle.of(parseInt(String(it.userId), 10));
                  la.startShortcut(String(it.pkg), String(it.id), null, null, uh);
                  self.toast("已尝试启动: " + safeStr(it.label || it.id));
                } else {
                  self.toast("LauncherApps 不可用");
                }
              } catch(eStart) {
                self.toast("启动失败: " + eStart);
              }
            } catch(eClick) {}
          }
        }));

        state.grid.addView(row);

      })(i);
    }

    state.renderCursor = end;
    state.isAppending = false;

    // 统计
    setStat("快捷方式: " + String(state.renderList.length) + "  已渲染: " + String(state.renderCursor));
  }

  function setupTabs() {
    try {
      if (!state.tabRow) return;
      state.tabRow.removeAllViews();
      var order = state.groupOrder || [];
      for (var i = 0; i < order.length; i++) {
        (function(key) {
          var g = state.groups[key];
          var tv = new android.widget.TextView(context);
          tv.setText(safeStr(g ? g.title : key));
          tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
          tv.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
          tv.setSingleLine(true);
          tv.setEllipsize(android.text.TextUtils.TruncateAt.END);

          var isSel = (key === state.currentGroupKey);
          var isDark = self.isDarkTheme();

          // # Tabs 选中态：用 accent 低透明底 + 更醒目的文字；未选中态：轻描边
          try {
            var tPri = isDark ? self.ui.colors.textPriDark : self.ui.colors.textPriLight;
            var tSec = isDark ? self.ui.colors.textSecDark : self.ui.colors.textSecLight;

            var bgColor = isSel ? self.withAlpha(self.ui.colors.accent, isDark ? 0.22 : 0.14)
                                : (isDark ? self.withAlpha(android.graphics.Color.BLACK, 0.10)
                                          : self.withAlpha(android.graphics.Color.BLACK, 0.04));
            var stroke = isDark ? self.ui.colors.dividerDark : self.ui.colors.dividerLight;

            tv.setTextColor(isSel ? tPri : tSec);
            tv.setBackground(self.ui.createStrokeDrawable(bgColor, stroke, self.dp(1), self.dp(16)));
          } catch(eBg) {}

          tv.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {
              state.currentGroupKey = key;
              rebuildRenderList();
              clearGrid();
              appendBatch();
              setupTabs();
            }
          }));

          var lp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
          lp.setMargins(0, 0, self.dp(8), 0);
          tv.setLayoutParams(lp);
          state.tabRow.addView(tv);
        })(order[i]);
      }
    } catch(e) {}
  }

  function startScrollPoll() {
    if (state.scrollPollRunning) return;
    state.scrollPollRunning = true;

    function tick() {
      if (!state.scrollPollRunning || state.destroyed) return;
      runOn(h, function() {
        try {
          if (!state.scrollView) { schedule(); return; }
          var sv = state.scrollView;
          var child = sv.getChildAt(0);
          if (!child) { schedule(); return; }

          var dy = sv.getScrollY();
          var vh = sv.getHeight();
          var ch = child.getHeight();

          // 触底阈值：80dp
          var near = (dy + vh) >= (ch - self.dp(80));
          if (near) {
            if (state.renderCursor < state.renderList.length) {
              appendBatch();
            }
          }
        } catch(e) {}
        schedule();
      });
    }

    function schedule() {
      try {
        h.postDelayed(new JavaAdapter(Runnable, { run: tick }), 180);
      } catch(e) {}
    }

    schedule();
  }

  function buildUI() {
    // # 这段代码的主要内容/用途：构建"选择快捷方式"页面 UI（颜色/间距/字体与 ToolHub 面板统一）。
    // 说明：尽量复用 ToolHub 的 UI helper 色板（light/dark），避免出现"黑底黑字/黄底刺眼"等问题。

    // # root（标准面板容器：圆角 + 轻阴影 + 统一 padding）
    var root = self.ui.createStyledPanel(self, 12);

    // # 顶栏（标题 + 右侧关闭）
    var top = self.ui.createStyledHeader(self, 10);

    var title = new android.widget.TextView(context);
    title.setText(mode === "pick" ? "选择快捷方式" : "快捷方式浏览器");
    title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
    try { title.setTypeface(null, android.graphics.Typeface.BOLD); } catch(e) {}
    try { title.setTextColor(self.isDarkTheme() ? self.ui.colors.textPriDark : self.ui.colors.textPriLight); } catch(e) {}

    var lpT = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    lpT.weight = 1;
    title.setLayoutParams(lpT);

    // 关闭按钮：用 flat 风格，颜色与危险色一致（更像"工具面板"的关闭）
    var btnClose = self.ui.createFlatButton(self, (mode === "pick" ? "取消" : "关闭"), self.ui.colors.danger, function() {
      hide();
    });
    try {
      btnClose.setPadding(self.dp(12), self.dp(6), self.dp(12), self.dp(6));
      btnClose.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
    } catch(e) {}

    top.addView(title);
    top.addView(btnClose);

    // # 搜索框（可聚焦 + 统一输入背景）
    var et = new android.widget.EditText(context);
    et.setHint("搜索：名称 / 包名 / ID");
    et.setSingleLine(true);
    et.setPadding(self.dp(12), self.dp(10), self.dp(12), self.dp(10));
    try {
      et.setTextColor(self.isDarkTheme() ? self.ui.colors.textPriDark : self.ui.colors.textPriLight);
      et.setHintTextColor(self.isDarkTheme() ? self.ui.colors.textSecDark : self.ui.colors.textSecLight);
    } catch(e) {}

    try {
      var inBg = self.ui.createRoundDrawable(self.isDarkTheme() ? self.ui.colors.inputBgDark : self.ui.colors.inputBgLight, self.dp(12));
      et.setBackground(inBg);
    } catch(eBg) {}

    // # Tabs（横向滚动：统一为"胶囊按钮"风格，选中态更明确）
    var tabSv = new android.widget.HorizontalScrollView(context);
    tabSv.setHorizontalScrollBarEnabled(false);
    tabSv.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);

    var tabRow = new android.widget.LinearLayout(context);
    tabRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    try { tabRow.setPadding(0, self.dp(8), 0, self.dp(6)); } catch(e) {}
    tabSv.addView(tabRow);

    // # 状态栏（数量/渲染进度）
    var tvStat = new android.widget.TextView(context);
    tvStat.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    try { tvStat.setTextColor(self.isDarkTheme() ? self.ui.colors.textSecDark : self.ui.colors.textSecLight); } catch(e) {}
    tvStat.setPadding(0, self.dp(6), 0, self.dp(6));

    // # 列表（卡片式条目列表）
    var sv = new android.widget.ScrollView(context);
    sv.setFillViewport(true);
    sv.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);

    var list = new android.widget.LinearLayout(context);
    list.setOrientation(android.widget.LinearLayout.VERTICAL);
    try { list.setPadding(0, self.dp(2), 0, self.dp(2)); } catch(e) {}
    sv.addView(list);

    // bind
    state.root = root;
    state.etSearch = et;
    state.tabRow = tabRow;
    state.tvStat = tvStat;
    state.grid = list;
    state.scrollView = sv;

    // listeners：实时过滤（TextWatcher）
    try {
      var TextWatcher = android.text.TextWatcher;
      et.addTextChangedListener(new JavaAdapter(TextWatcher, {
        beforeTextChanged: function() {},
        onTextChanged: function() {},
        afterTextChanged: function(s) {
          try {
            if (state.destroyed) return;
            state.query = safeStr(s);
            rebuildRenderList();
            clearGrid();
            appendBatch();
          } catch(e) {}
        }
      }));
    } catch(eTw) {}

    // layout
    root.addView(top);

    // 搜索框与 tabs 之间留一点呼吸空间
    try {
      var lpEt = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
      lpEt.setMargins(0, 0, 0, self.dp(8));
      et.setLayoutParams(lpEt);
    } catch(eLpEt) {}
    root.addView(et);

    root.addView(tabSv);
    root.addView(tvStat);

    var lpSv = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 0);
    lpSv.weight = 1;
    sv.setLayoutParams(lpSv);
    root.addView(sv);

    // 主题：用 ToolHub 现有的背景更新逻辑兜底（防止外部主题配置影响）
    try { self.updatePanelBackground(root); } catch(eTheme) {}

    return root;
  }

  function show() {
    runOn(h, function() {
      // # 会话检查：过期会话直接丢弃
      if (!checkSession()) return;

      // # 稳定性：复用已添加的 root，避免频繁 add/removeView 触发 system_server WM 状态机崩溃
      if (state.root && state.isAdded) {
        state.hidden = false;
        // # 每次显示前允许再次触发 onDismiss（用于外层恢复）
        state.onDismissCalled = false;
        // # UI 修复：每次重新显示时都重新把窗口定位到屏幕顶部（横向居中 + y=0），避免被其它面板遮挡或位置漂移
        try {
          if (state.params) {
            state.params.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
            // # UI 修复：复用显示时也强制关闭 IME 调整，避免上次输入导致位置被系统推下去
            try {
              state.params.softInputMode = android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING
                | android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN;
            } catch(eSIM1) {}
            try {
              state.params.flags = state.params.flags
                | android.view.WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                | android.view.WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS;
            } catch(eTop1) {}
            var sw2 = (self.state && self.state.screen && self.state.screen.w) ? self.state.screen.w : 0;
            if (sw2 > 0) state.params.x = Math.max(0, Math.round((sw2 - state.params.width) / 2));
            else state.params.x = 0;
            state.params.y = 0;
            wm.updateViewLayout(state.root, state.params);
          }
        } catch(ePos2) {}

        // # 层级修复：同类型(TYPE_APPLICATION_OVERLAY)窗口之间的上下层由 addView 顺序决定
        // # 说明：当"新增按钮页/主面板"在本窗口之后 addView 时，会把本窗口盖住；复用 show 仅 setVisibility 无法提升层级
        // # 处理：在 WM 线程内对本窗口做一次 removeViewImmediate + addView 以"提到最上层"（不在关闭时 remove，避免旧崩溃路径）
        try {
          var tsNow = now();
          if (!state.lastRaiseTs || (tsNow - state.lastRaiseTs) > 300) {
            state.lastRaiseTs = tsNow;
            try { wm.removeViewImmediate(state.root); } catch(eZ0) {}
            try { wm.addView(state.root, state.params); } catch(eZ1) {}
            state.isAdded = true;
          }
        } catch(eZ2) {}
try { state.root.setVisibility(android.view.View.VISIBLE); } catch(eVis) {}
        try {
          setStat("正在加载快捷方式...");
          Li("reloading shortcuts index...");
        } catch(e0) {}
        try {
          state.allItems = buildShortcutItemsIndex();
          var gg = groupItems(state.allItems);
          state.groups = gg.groups;
          state.groupOrder = gg.order;
        } catch(e1) {
          state.allItems = [];
          state.groups = groupItems([]).groups;
          state.groupOrder = ["__ALL__"];
          Le("build index err=" + String(e1));
        }
        try { setupTabs(); } catch(eT0) {}
        try { rebuildRenderList(); } catch(eT1) {}
        try { clearGrid(); } catch(eT2) {}
        try { appendBatch(); } catch(eT3) {}
        try { startScrollPoll(); } catch(eT4) {}
        Li("shortcut picker reused items=" + String(state.allItems.length));
        return;
      }

      try {
        // build data
        setStat("正在加载快捷方式...");
        Li("loading shortcuts index...");
      } catch(e0) {}

      try {
        state.allItems = buildShortcutItemsIndex();
        var gg = groupItems(state.allItems);
        state.groups = gg.groups;
        state.groupOrder = gg.order;
      } catch(e1) {
        state.allItems = [];
        state.groups = groupItems([]).groups;
        state.groupOrder = ["__ALL__"];
        Le("build index err=" + String(e1));
      }

      // build UI
      var root = buildUI();

      // wm params
      var p = new android.view.WindowManager.LayoutParams();
      p.type = android.view.WindowManager.LayoutParams.TYPE_SYSTEM_DIALOG; // 修改：提升窗口层级，确保多次打开后仍在最顶层
      // # 说明：TYPE_APPLICATION_OVERLAY 与其他面板同层时会按 add 顺序叠放，频繁开关后容易被后开的面板盖住。
      // #       TYPE_SYSTEM_DIALOG 层级更高，可稳定压过 ToolHub 其他面板（仍不频繁 add/remove，避免崩溃）。
      p.flags = android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
      p.format = android.graphics.PixelFormat.TRANSLUCENT;
      // # UI 修复：固定在顶部显示时，避免被输入法/系统 inset 影响导致二次打开位置下移
      // # 说明：不使用 ADJUST_RESIZE/ADJUST_PAN，让窗口位置不被 IME 推动；同时默认隐藏软键盘状态
      try {
        p.softInputMode = android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING
          | android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN;
      } catch(eSIM0) {}
      // # 允许窗口覆盖到屏幕顶部区域（含状态栏区域），避免视觉上"不是贴顶"
      try {
        p.flags = p.flags
          | android.view.WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
          | android.view.WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS;
      } catch(eTop0) {}
      p.width = self.dp(340);
      p.height = self.dp(520);
      // # UI 修复：选择快捷方式页应贴近屏幕顶部显示（与"新增按钮页"的顶部布局一致），而不是居中
      // # 说明：居中会让用户感觉"弹窗不是在顶部"，也更容易被其它面板遮挡。
      p.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
      try {
        var sw = (self.state && self.state.screen && self.state.screen.w) ? self.state.screen.w : 0;
        // 顶部显示：水平居中 + y=0
        if (sw > 0) p.x = Math.max(0, Math.round((sw - p.width) / 2));
        else p.x = 0;
        p.y = 0;
      } catch(ePos) {
        p.x = 0;
        p.y = 0;
      }

      // 允许输入法：搜索框要能聚焦
      try {
        p.flags = p.flags & (~android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE);
      } catch(eF) {}

      state.params = p;

      try {
        wm.addView(root, p);
        state.isAdded = true;
      } catch(eAdd) {
        Le("wm addView err=" + String(eAdd));
        destroy();
        self.toast("快捷方式选择器打开失败: wm_add_failed");
        return;
      }

      // tabs + first render
      setupTabs();
      rebuildRenderList();
      appendBatch();
      startScrollPoll();

      Li("shortcut picker shown items=" + String(state.allItems.length));
    });
  }

  // 入口
  // # 创建单例 API：后续再次打开直接复用已添加的 root 与线程，只做"显示/刷新"，不做 removeView
  var api = {
    instanceId: state.instanceId,
    show: function(newOpts) {
      try {
        var o = newOpts || {};
        mode = (o.mode != null) ? String(o.mode) : mode;
        onPick = (typeof o.onPick === "function") ? o.onPick : onPick;
      } catch(eOpt) {}
      // # 显示前先把隐藏标记清掉
      try { state.hidden = false; } catch(eH0) {}
      show();
    },
    hide: hide,
    destroy: destroy
  };
  try { self.__shortcutPickerSingleton = api; } catch(eSet) {}
  api.show(opts);
};

// =======================【Content：解析 settings URI】======================
// 这段代码的主要内容/用途：识别 content://settings/(system|secure|global)/KEY 并用 Settings.* get/put 更稳
FloatBallAppWM.prototype.parseSettingsUri = function(uriStr) {
  try {
    var s = String(uriStr || "");
    if (s.indexOf("content://settings/") !== 0) return null;

    // content://settings/system/accelerometer_rotation
    var rest = s.substring("content://settings/".length);
    var parts = rest.split("/");
    if (!parts || parts.length < 1) return null;

    var table = String(parts[0] || "");
    var key = "";
    if (parts.length >= 2) key = String(parts[1] || "");

    if (table !== "system" && table !== "secure" && table !== "global") return null;
    return { table: table, key: key };
  } catch (e) { return null; }
};

FloatBallAppWM.prototype.settingsGetStringByTable = function(table, key) {
  try {
    var cr = context.getContentResolver();
    if (table === "system") return android.provider.Settings.System.getString(cr, String(key));
    if (table === "secure") return android.provider.Settings.Secure.getString(cr, String(key));
    if (table === "global") return android.provider.Settings.Global.getString(cr, String(key));
    return null;
  } catch (e) { return null; }
};

FloatBallAppWM.prototype.settingsPutStringByTable = function(table, key, value) {
  try {
    var cr = context.getContentResolver();
    if (table === "system") return android.provider.Settings.System.putString(cr, String(key), String(value));
    if (table === "secure") return android.provider.Settings.Secure.putString(cr, String(key), String(value));
    if (table === "global") return android.provider.Settings.Global.putString(cr, String(key), String(value));
    return false;
  } catch (e) { return false; }
};

// =======================【Content：通用 query】======================
// 这段代码的主要内容/用途：ContentResolver.query 并把 Cursor 转成文本（用于查看器面板）
FloatBallAppWM.prototype.contentQueryToText = function(uriStr, projection, selection, selectionArgs, sortOrder, maxRows) {
  var out = { ok: false, uri: String(uriStr || ""), rows: 0, text: "", err: "" };
  var cr = null;
  var cur = null;

  try {
    cr = context.getContentResolver();
    var uri = android.net.Uri.parse(String(uriStr));

    var projArr = null;
    if (projection && projection.length) {
      projArr = java.lang.reflect.Array.newInstance(java.lang.String, projection.length);
      var i0;
      for (i0 = 0; i0 < projection.length; i0++) projArr[i0] = String(projection[i0]);
    }

    var sel = (selection === undefined || selection === null) ? null : String(selection);

    var selArgsArr = null;
    if (selectionArgs && selectionArgs.length) {
      selArgsArr = java.lang.reflect.Array.newInstance(java.lang.String, selectionArgs.length);
      var i1;
      for (i1 = 0; i1 < selectionArgs.length; i1++) selArgsArr[i1] = String(selectionArgs[i1]);
    }

    var so = (sortOrder === undefined || sortOrder === null) ? null : String(sortOrder);

    cur = cr.query(uri, projArr, sel, selArgsArr, so);
    if (!cur) {
      out.err = "query return null cursor";
      return out;
    }

    var colCount = cur.getColumnCount();
    var cols = [];
    var ci;
    for (ci = 0; ci < colCount; ci++) cols.push(String(cur.getColumnName(ci)));

    var sb = [];
    sb.push("URI: " + String(uriStr));
    sb.push("Columns(" + String(colCount) + "): " + cols.join(", "));
    sb.push("");

    var limit = Math.max(1, Math.floor(Number(maxRows || this.config.CONTENT_MAX_ROWS || 20)));
    var row = 0;

    while (cur.moveToNext()) {
      row++;
      sb.push("#" + String(row));
      var cj;
      for (cj = 0; cj < colCount; cj++) {
        var v = "";
        try {
          if (cur.isNull(cj)) v = "null";
          else v = String(cur.getString(cj));
        } catch (eV) {
          try { v = String(cur.getLong(cj)); } catch (eV2) { v = "<??>"; }
        }
        sb.push("  " + cols[cj] + " = " + v);
      }
      sb.push("");
      if (row >= limit) break;
    }

    out.ok = true;
    out.rows = row;
    out.text = sb.join("\n");
    return out;
  } catch (e) {
    out.err = String(e);
    return out;
  } finally {
    try { if (cur) cur.close(); } catch (eC) {}
  }
};

// =======================【Content：统一入口】======================
// 这段代码的主要内容/用途：处理按钮里的 type:"content"
FloatBallAppWM.prototype.execContentAction = function(btn) {
  var mode = btn.mode ? String(btn.mode) : ((btn.value !== undefined && btn.value !== null) ? "put" : "get");
  var uri = btn.uri ? String(btn.uri) : "";
  if (!uri) return { ok: false, err: "missing uri" };

  // settings uri 优先走 Settings API
  var su = this.parseSettingsUri(uri);

  if (mode === "get") {
    if (su && su.key) {
      var v = this.settingsGetStringByTable(su.table, su.key);
      return { ok: true, mode: "get", kind: "settings", table: su.table, key: su.key, value: (v === null ? "null" : String(v)) };
    }

    // 非 settings：尝试 query 一行
    var q1 = this.contentQueryToText(uri, btn.projection, btn.selection, btn.selectionArgs, btn.sortOrder, 1);
    if (!q1.ok) return { ok: false, mode: "get", kind: "query", err: q1.err };
    return { ok: true, mode: "get", kind: "query", text: q1.text, rows: q1.rows };
  }

  if (mode === "put") {
    var val = (btn.value === undefined || btn.value === null) ? "" : String(btn.value);

    if (su && su.key) {
      var ok = this.settingsPutStringByTable(su.table, su.key, val);
      return { ok: !!ok, mode: "put", kind: "settings", table: su.table, key: su.key, value: val };
    }

    // 非 settings：尽力走 update(ContentValues)
    try {
      var cr = context.getContentResolver();
      var u = android.net.Uri.parse(uri);
      var cv = new android.content.ContentValues();

      // 支持 btn.values = {col1: "...", col2: "..."}；否则写 value 列
      if (btn.values) {
        var k;
        for (k in btn.values) {
          if (!btn.values.hasOwnProperty(k)) continue;
          cv.put(String(k), String(btn.values[k]));
        }
      } else {
        cv.put("value", val);
      }

      var where = (btn.selection === undefined || btn.selection === null) ? null : String(btn.selection);

      var whereArgs = null;
      if (btn.selectionArgs && btn.selectionArgs.length) {
        whereArgs = java.lang.reflect.Array.newInstance(java.lang.String, btn.selectionArgs.length);
        var i2;
        for (i2 = 0; i2 < btn.selectionArgs.length; i2++) whereArgs[i2] = String(btn.selectionArgs[i2]);
      }

      var n = cr.update(u, cv, where, whereArgs);
      return { ok: true, mode: "put", kind: "update", updated: Number(n) };
    } catch (eU) {
      return { ok: false, mode: "put", kind: "update", err: String(eU) };
    }
  }

  if (mode === "query") {
    var maxRows = (btn.maxRows === undefined || btn.maxRows === null) ? this.config.CONTENT_MAX_ROWS : Number(btn.maxRows);
    var q = this.contentQueryToText(uri, btn.projection, btn.selection, btn.selectionArgs, btn.sortOrder, maxRows);
    if (!q.ok) return { ok: false, mode: "query", err: q.err };
    return { ok: true, mode: "query", rows: q.rows, text: q.text };
  }

  if (mode === "view") {
    try {
      var it = new android.content.Intent(android.content.Intent.ACTION_VIEW);
      it.setData(android.net.Uri.parse(uri));
      it.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
      context.startActivity(it);
      return { ok: true, mode: "view" };
    } catch (eV) {
      return { ok: false, mode: "view", err: String(eV) };
    }
  }

  return { ok: false, err: "unknown mode=" + mode };
};

/* =======================
   下面开始：WM 动画、面板、触摸、启动、输出
   ======================= */

FloatBallAppWM.prototype.animateBallLayout = function(toX, toY, toW, durMs, endCb) {
  var st = this.state;
  if (!st.addedBall || !st.ballRoot || !st.ballLp) { if (endCb) endCb(); return; }

  var fromX = st.ballLp.x;
  var fromY = st.ballLp.y;
  var fromW = st.ballLp.width;

  try {
    var va = android.animation.ValueAnimator.ofFloat(0.0, 1.0);
    va.setDuration(durMs);
    try {
        // 使用 OvershootInterpolator 产生轻微的回弹效果，更加生动
        // 0.7 的张力适中，不会过于夸张
        va.setInterpolator(new android.view.animation.OvershootInterpolator(0.7));
    } catch (eI) {
        try { va.setInterpolator(new android.view.animation.DecelerateInterpolator()); } catch (eI2) {}
    }

    var self = this;

    va.addUpdateListener(new android.animation.ValueAnimator.AnimatorUpdateListener({
      onAnimationUpdate: function(anim) {
        try {
          if (self.state.closing) return;
          if (!self.state.addedBall) return;

          var f = anim.getAnimatedValue();
          var nx = Math.round(fromX + (toX - fromX) * f);
          var ny = Math.round(fromY + (toY - fromY) * f);
          var nw = Math.round(fromW + (toW - fromW) * f);

          // 性能优化：只有坐标真正变化时才请求 WindowManager 更新
          if (nx !== self.state.ballLp.x || ny !== self.state.ballLp.y || nw !== self.state.ballLp.width) {
              self.state.ballLp.x = nx;
              self.state.ballLp.y = ny;
              self.state.ballLp.width = nw;
              // # 关键操作使用 safeOperation 封装
              safeOperation("dockAnimation.updateViewLayout", function() {
                self.state.wm.updateViewLayout(self.state.ballRoot, self.state.ballLp);
              }, true, self.L);
          }
        } catch (e) {}
      }
    }));

    va.addListener(new android.animation.Animator.AnimatorListener({
      onAnimationStart: function() {},
      onAnimationRepeat: function() {},
      onAnimationCancel: function() {},
      onAnimationEnd: function() {
        try {
          if (!self.state.closing && self.state.addedBall) {
            self.state.ballLp.x = toX;
            self.state.ballLp.y = toY;
            self.state.ballLp.width = toW;
            self.state.wm.updateViewLayout(self.state.ballRoot, self.state.ballLp);
            self.savePos(self.state.ballLp.x, self.state.ballLp.y);
          }
        } catch (e2) {}
        try { if (endCb) endCb(); } catch (eCb) { try { if (self && self.L && self.L.e) self.L.e("animateBallLayout endCb err=" + String(eCb)); } catch (eLog) {} }
      }
    }));

    va.start();
  } catch (e0) {
    try {
      st.ballLp.x = toX;
      st.ballLp.y = toY;
      st.ballLp.width = toW;
      st.wm.updateViewLayout(st.ballRoot, st.ballLp);
      this.savePos(st.ballLp.x, st.ballLp.y);
    } catch (e1) {}
    try { if (endCb) endCb(); } catch (eCb2) { try { if (this && this.L && this.L.e) this.L.e("animateBallLayout endCb err=" + String(eCb2)); } catch (eLog2) {} }
  }
};

FloatBallAppWM.prototype.playBounce = function(v) {
  if (!this.config.ENABLE_BOUNCE) return;
  if (!this.config.ENABLE_ANIMATIONS) return;

  try { v.animate().cancel(); } catch (e0) {}

  var self = this;
  var i = 0;

  function step() {
    if (self.state.closing) return;

    if (i >= self.config.BOUNCE_TIMES) {
      try { v.setScaleX(1); v.setScaleY(1); } catch (e2) {}
      return;
    }

    var amp = (self.config.BOUNCE_MAX_SCALE - 1) * Math.pow(self.config.BOUNCE_DECAY, i);
    var s = 1 + amp;

    v.animate()
      .scaleX(s)
      .scaleY(s)
      .setDuration(self.config.BOUNCE_STEP_MS)
      .setInterpolator(new android.view.animation.OvershootInterpolator())
      .withEndAction(new JavaAdapter(java.lang.Runnable, {
        run: function() {
          v.animate()
            .scaleX(1)
            .scaleY(1)
            .setDuration(self.config.BOUNCE_STEP_MS)
            .setInterpolator(new android.view.animation.AccelerateDecelerateInterpolator())
            .withEndAction(new JavaAdapter(java.lang.Runnable, {
              run: function() { i++; step(); }
            }))
            .start();
        }
      }))
      .start();
  }

  step();
};

FloatBallAppWM.prototype.safeRemoveView = function(v, whichName) {
  try {
    if (!v) return { ok: true, skipped: true };
    this.state.wm.removeView(v);
    return { ok: true };
  } catch (e) {
    safeLog(this.L, 'w',  "removeView fail which=" + String(whichName || "") + " err=" + String(e));
    return { ok: false, err: String(e), where: whichName || "" };
  }
};

FloatBallAppWM.prototype.hideMask = function() {
  if (!this.state.addedMask) return;
  if (!this.state.mask) return;

  this.safeRemoveView(this.state.mask, "mask");
  this.state.mask = null;
  this.state.maskLp = null;
  this.state.addedMask = false;
};

FloatBallAppWM.prototype.hideMainPanel = function() {
  if (!this.state.addedPanel) return;
  if (!this.state.panel) return;

  this.safeRemoveView(this.state.panel, "panel");
  this.state.panel = null;
  this.state.panelLp = null;
  this.state.addedPanel = false;

  this.hideMask();
  this.touchActivity();

  this._clearHeavyCachesIfAllHidden("hideMainPanel");
};

FloatBallAppWM.prototype.hideSettingsPanel = function() {
  if (!this.state.addedSettings) return;
  if (!this.state.settingsPanel) return;

  this.safeRemoveView(this.state.settingsPanel, "settingsPanel");
  this.state.settingsPanel = null;
  this.state.settingsPanelLp = null;
  this.state.addedSettings = false;

  this.state.pendingUserCfg = null;
  this.state.pendingDirty = false;

  this.hideMask();
  this.touchActivity();

  this._clearHeavyCachesIfAllHidden("hideSettingsPanel");
};

FloatBallAppWM.prototype.hideViewerPanel = function() {
  if (!this.state.addedViewer) return;
  if (!this.state.viewerPanel) return;

  this.safeRemoveView(this.state.viewerPanel, "viewerPanel");
  this.state.viewerPanel = null;
  this.state.viewerPanelLp = null;
  this.state.addedViewer = false;

  this.hideMask();
  this.touchActivity();

  this._clearHeavyCachesIfAllHidden("hideViewerPanel");
};

FloatBallAppWM.prototype.clearHeavyCaches = function(reason) {
  // 这段代码的主要内容/用途：在所有面板都关闭后，主动清理"图标/快捷方式"等重缓存，降低 system_server 常驻内存。
  // 说明：仅清理缓存引用，不强行 recycle Bitmap，避免误伤仍被使用的 Drawable。
  
  // # 防抖：5秒内相同 reason 不重复清理
  var now = Date.now();
  var cacheKey = "_lastClear_" + (reason || "default");
  var lastClear = this.state[cacheKey] || 0;
  if (now - lastClear < 5000) {
    return; // 5秒内已清理过，跳过
  }
  this.state[cacheKey] = now;
  
  try { this._iconLru = null; } catch (eLruClr) {}
  try { this._shortcutIconFailTs = {}; } catch (e2) {}

  // # Shortcuts 相关全局缓存（按钮编辑页/快捷方式选择器可能会创建）
  try { if (typeof __scIconCache !== "undefined") __scIconCache = {}; } catch (e3) {}
  try { if (typeof __scAppLabelCache !== "undefined") __scAppLabelCache = {}; } catch (e4) {}

  // # 记录一次清理日志（精简：只记录关键 reason，且 5秒防抖）
  var keyReasons = ["memory_pressure", "screen_changed", "close"];
  var isKeyReason = keyReasons.indexOf(reason) >= 0;
  try { 
    if (isKeyReason && this.L && this.L.i) {
      this.L.i("clearHeavyCaches reason=" + String(reason));
    }
  } catch (e5) {}
};

FloatBallAppWM.prototype._clearHeavyCachesIfAllHidden = function(reason) {
  // 这段代码的主要内容/用途：只在"主面板/设置/查看器"全部关闭后清理缓存，避免页面切换时反复重建导致卡顿。
  try {
    if (!this.state.addedPanel && !this.state.addedSettings && !this.state.addedViewer) {
      this.clearHeavyCaches(reason || "all_hidden");
    }
  } catch (e) {}
};

FloatBallAppWM.prototype.hideAllPanels = function() {
  this.hideMainPanel();
  this.hideSettingsPanel();
  this.hideViewerPanel();
  this.hideMask();

  this._clearHeavyCachesIfAllHidden("hideAllPanels");
};

FloatBallAppWM.prototype.showMask = function() {
  if (this.state.addedMask) return;
  if (this.state.closing) return;

  var self = this;
  var mask = new android.widget.FrameLayout(context);

  // 遮罩层背景：轻微的黑色半透明，提升层次感
  try { mask.setBackgroundColor(android.graphics.Color.parseColor("#33000000")); } catch (e0) {
      mask.setBackgroundColor(0x33000000);
  }

  mask.setOnTouchListener(new JavaAdapter(android.view.View.OnTouchListener, {
    onTouch: function(v, e) {
      var a = e.getAction();
      if (a === android.view.MotionEvent.ACTION_DOWN) {
        self.touchActivity();
        self.hideAllPanels();
        return true;
      }
      return true;
    }
  }));

  var lp = new android.view.WindowManager.LayoutParams(
    android.view.WindowManager.LayoutParams.MATCH_PARENT,
    android.view.WindowManager.LayoutParams.MATCH_PARENT,
    android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
    android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
    android.graphics.PixelFormat.TRANSLUCENT
  );

  lp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
  lp.x = 0;
  lp.y = 0;

  try {
    this.state.wm.addView(mask, lp);
    this.state.mask = mask;
    this.state.maskLp = lp;
    this.state.addedMask = true;

    // 简单的淡入动画
    try {
        if (this.config.ENABLE_ANIMATIONS) {
            mask.setAlpha(0);
            mask.animate().alpha(1).setDuration(200).start();
        } else {
            mask.setAlpha(1);
        }
    } catch(eAnim){}

  } catch (e1) {
    safeLog(this.L, 'e',  "add mask fail err=" + String(e1));
    this.state.addedMask = false;
  }
};

FloatBallAppWM.prototype.snapToEdgeDocked = function(withAnim, forceSide) {
  if (this.state.closing) return;
  // 移除对面板/Mask的检查，允许在任何情况下强制吸边（如果调用方逻辑正确）
  // 如果需要保护，调用方自己判断
  if (this.state.dragging) return;

  var di = this.getDockInfo();
  var ballSize = di.ballSize;
  var visible = di.visiblePx;
  var hidden = di.hiddenPx;

  var snapLeft;
  if (forceSide === "left") snapLeft = true;
  else if (forceSide === "right") snapLeft = false;
  else {
      // 默认根据中心点判断
      var centerX = this.state.ballLp.x + Math.round(ballSize / 2);
      snapLeft = centerX < Math.round(this.state.screen.w / 2);
  }

  var targetW = visible;
  var targetY = this.clamp(this.state.ballLp.y, 0, this.state.screen.h - ballSize);

  if (snapLeft) {
    this.state.dockSide = "left";
    this.state.docked = true;

    try { this.state.ballContent.setX(-hidden); } catch (eL) {}

    if (withAnim) {
      this.animateBallLayout(0, targetY, targetW, this.config.DOCK_ANIM_MS, null);
    } else {
      this.state.ballLp.x = 0;
      this.state.ballLp.y = targetY;
      this.state.ballLp.width = targetW;
      try { this.state.wm.updateViewLayout(this.state.ballRoot, this.state.ballLp); } catch (eU1) {}
      this.savePos(this.state.ballLp.x, this.state.ballLp.y);
    }

    safeLog(this.L, 'd',  "dock left x=0 y=" + String(targetY) + " w=" + String(targetW));

    // 闲置变暗
    try {
         if (this.config.ENABLE_ANIMATIONS) {
             this.state.ballContent.animate().alpha(this.config.BALL_IDLE_ALPHA).setDuration(300).start();
         } else {
             this.state.ballContent.setAlpha(this.config.BALL_IDLE_ALPHA);
         }
    } catch(eA) {}

    return;
  }

  this.state.dockSide = "right";
  this.state.docked = true;

  try { this.state.ballContent.setX(0); } catch (eR) {}

  var x2 = this.state.screen.w - visible;

  if (withAnim) {
    this.animateBallLayout(x2, targetY, targetW, this.config.DOCK_ANIM_MS, null);
  } else {
    this.state.ballLp.x = x2;
    this.state.ballLp.y = targetY;
    this.state.ballLp.width = targetW;
    try { this.state.wm.updateViewLayout(this.state.ballRoot, this.state.ballLp); } catch (eU2) {}
    this.savePos(this.state.ballLp.x, this.state.ballLp.y);
  }

  // # 日志精简：dock 事件添加防抖（10秒内不重复记录相同边）
  var dockNow = Date.now();
  var lastDock = this.state._lastDockLog || 0;
  if (dockNow - lastDock > 10000) {
    safeLog(this.L, 'i', "dock right x=" + String(x2) + " y=" + String(targetY));
    this.state._lastDockLog = dockNow;
  }

  // 闲置变暗
  try {
     if (this.config.ENABLE_ANIMATIONS) {
         this.state.ballContent.animate().alpha(this.config.BALL_IDLE_ALPHA).setDuration(300).start();
     } else {
         this.state.ballContent.setAlpha(this.config.BALL_IDLE_ALPHA);
     }
  } catch(eA) {}
};

FloatBallAppWM.prototype.undockToFull = function(withAnim, endCb) {
  if (this.state.closing) { if (endCb) endCb(); return; }
  if (!this.state.docked) { if (endCb) endCb(); return; }
  if (!this.state.addedBall) { if (endCb) endCb(); return; }

  var di = this.getDockInfo();
  var ballSize = di.ballSize;
  var targetW = ballSize;
  var targetY = this.clamp(this.state.ballLp.y, 0, this.state.screen.h - ballSize);

  try { this.state.ballContent.setX(0); } catch (e0) {}

  if (this.state.dockSide === "left") {
    this.state.docked = false;
    this.state.dockSide = null;

    if (withAnim) this.animateBallLayout(0, targetY, targetW, this.config.UNDOCK_ANIM_MS, endCb);
    else {
      this.state.ballLp.x = 0;
      this.state.ballLp.y = targetY;
      this.state.ballLp.width = targetW;
      try { this.state.wm.updateViewLayout(this.state.ballRoot, this.state.ballLp); } catch (eU1) {}
      this.savePos(this.state.ballLp.x, this.state.ballLp.y);
      if (endCb) endCb();
    }

    // 恢复不透明度
    try {
         if (withAnim && this.config.ENABLE_ANIMATIONS) {
             this.state.ballContent.animate().alpha(1.0).setDuration(150).start();
         } else {
             this.state.ballContent.setAlpha(1.0);
         }
    } catch(eA) {}

    safeLog(this.L, 'i', "undock from left");
    return;
  }

  var x = this.state.screen.w - ballSize;

  this.state.docked = false;
  this.state.dockSide = null;

  if (withAnim) this.animateBallLayout(x, targetY, targetW, this.config.UNDOCK_ANIM_MS, endCb);
  else {
    this.state.ballLp.x = x;
    this.state.ballLp.y = targetY;
    this.state.ballLp.width = targetW;
    try { this.state.wm.updateViewLayout(this.state.ballRoot, this.state.ballLp); } catch (eU2) {}
    this.savePos(this.state.ballLp.x, this.state.ballLp.y);
    if (endCb) endCb();
  }

  // 恢复不透明度
  try {
     if (withAnim && this.config.ENABLE_ANIMATIONS) {
         this.state.ballContent.animate().alpha(1.0).setDuration(150).start();
     } else {
         this.state.ballContent.setAlpha(1.0);
     }
  } catch(eA) {}

  // # 日志精简：undock 事件改为 INFO 级别，且记录方向
  var undockSide = this.state.dockSide || "right";
  safeLog(this.L, 'i', "undock from " + undockSide);
};

FloatBallAppWM.prototype.cancelDockTimer = function() {
  try { if (this.state.idleDockRunnable && this.state.h) this.state.h.removeCallbacks(this.state.idleDockRunnable); } catch (e) {}
  this.state.idleDockRunnable = null;
};

FloatBallAppWM.prototype.armDockTimer = function() {
  if (this.state.closing) return;
  if (!this.state.h) return;
  if (!this.state.addedBall) return;
  if (this.state.docked) return;

  this.cancelDockTimer();

  var hasPanel = (this.state.addedPanel || this.state.addedSettings || this.state.addedViewer || this.state.addedMask);
  var targetMs = hasPanel ? this.config.PANEL_IDLE_CLOSE_AND_DOCK_MS : this.config.DOCK_AFTER_IDLE_MS;

  var self = this;

  this.state.idleDockRunnable = new java.lang.Runnable({
    run: function() {
      try {
        if (self.state.closing) return;
        if (self.state.docked) return;
        if (self.state.dragging) return;

        var hasPanel2 = (self.state.addedPanel || self.state.addedSettings || self.state.addedViewer || self.state.addedMask);
        var needMs = hasPanel2 ? self.config.PANEL_IDLE_CLOSE_AND_DOCK_MS : self.config.DOCK_AFTER_IDLE_MS;

        var idle = self.now() - self.state.lastMotionTs;
        if (idle < needMs) { self.armDockTimer(); return; }

        // if (hasPanel2) self.hideAllPanels(); // 用户要求不再自动关闭面板
        if (self.config.ENABLE_SNAP_TO_EDGE) {
            self.snapToEdgeDocked(true);
        }
      } catch (e0) {
        if (self.L) self.L.e("dockTimer run err=" + String(e0));
      }
    }
  });

  this.state.h.postDelayed(this.state.idleDockRunnable, targetMs);
};

FloatBallAppWM.prototype.touchActivity = function() {
  this.state.lastMotionTs = this.now();
  this.armDockTimer();
}

// # 点击防抖与安全执行
// 这段代码的主要内容/用途：防止在悬浮面板上快速/乱点导致重复 add/remove、状态机被打穿，从而引发 system_server 异常重启。
FloatBallAppWM.prototype.guardClick = function(key, cooldownMs, fn) {
  try {
    var now = android.os.SystemClock.uptimeMillis();
    if (!this.state._clickGuards) this.state._clickGuards = {};
    var last = this.state._clickGuards[key] || 0;
    var cd = (cooldownMs != null ? cooldownMs : INTERACTION_CONSTANTS.CLICK_COOLDOWN_MS);
    if (now - last < cd) return false;
    this.state._clickGuards[key] = now;
    try {
      fn && fn();
    } catch (e1) {
      safeLog(this.L, 'e',  "guardClick err key=" + String(key) + " err=" + String(e1));
    }
    return true;
  } catch (e0) {
    // 兜底：绝不让点击回调异常冒泡到 system_server
    try { fn && fn(); } catch (e2) {}
    return true;
  }
};

FloatBallAppWM.prototype.safeUiCall = function(tag, fn) {
  try {
    fn && fn();
  } catch (e) {
    safeLog(this.L, 'e',  "safeUiCall err tag=" + String(tag || "") + " err=" + String(e));
  }
};

;

FloatBallAppWM.prototype.onScreenChangedReflow = function() {
  if (this.state.closing) return;
  if (!this.state.addedBall) return;

  var di = this.getDockInfo();

  var oldW = this.state.screen.w;
  var oldH = this.state.screen.h;

  var newScreen = this.getScreenSizePx();
  var newW = newScreen.w;
  var newH = newScreen.h;

  if (newW <= 0 || newH <= 0) return;
  if (oldW <= 0) oldW = newW;
  if (oldH <= 0) oldH = newH;

  this.state.screen = { w: newW, h: newH };

  var ballSize = di.ballSize;
  var visible = di.visiblePx;
  var hidden = di.hiddenPx;

  var oldMaxX = Math.max(1, oldW - ballSize);
  var oldMaxY = Math.max(1, oldH - ballSize);
  var newMaxX = Math.max(1, newW - ballSize);
  var newMaxY = Math.max(1, newH - ballSize);

  var xRatio = this.state.ballLp.x / oldMaxX;
  var yRatio = this.state.ballLp.y / oldMaxY;

  var mappedX = Math.round(xRatio * newMaxX);
  var mappedY = Math.round(yRatio * newMaxY);

  mappedX = this.clamp(mappedX, 0, newMaxX);
  mappedY = this.clamp(mappedY, 0, newMaxY);

  if (this.state.docked) {
    this.state.ballLp.y = mappedY;
    this.state.ballLp.width = visible;

    if (this.state.dockSide === "left") {
      this.state.ballLp.x = 0;
      try { this.state.ballContent.setX(-hidden); } catch (eL) {}
    } else {
      this.state.ballLp.x = newW - visible;
      try { this.state.ballContent.setX(0); } catch (eR) {}
    }
    // 重新进入闲置变暗逻辑（如果需要）
    try { this.state.ballContent.setAlpha(this.config.BALL_IDLE_ALPHA); } catch(eA) {}
  } else {
    this.state.ballLp.x = mappedX;
    this.state.ballLp.y = mappedY;
    this.state.ballLp.width = ballSize;
    try { this.state.ballContent.setX(0); } catch (e0) {}
    try { this.state.ballContent.setAlpha(1.0); } catch(eA) {}
  }

  try { this.state.wm.updateViewLayout(this.state.ballRoot, this.state.ballLp); } catch (eU) {}
  this.savePos(this.state.ballLp.x, this.state.ballLp.y);

  safeLog(this.L, 'i',  "screen reflow w=" + String(newW) + " h=" + String(newH) + " x=" + String(this.state.ballLp.x) + " y=" + String(this.state.ballLp.y));
};

FloatBallAppWM.prototype.setupDisplayMonitor = function() {
  if (this.state.closing) return;

  try {
    var dm = context.getSystemService(android.content.Context.DISPLAY_SERVICE);
    if (!dm) return;

    this.state.dm = dm;
    this.state.lastRotation = this.getRotation();

    var self = this;

    var listener = new JavaAdapter(android.hardware.display.DisplayManager.DisplayListener, {
      onDisplayAdded: function(displayId) {},
      onDisplayRemoved: function(displayId) {},
      onDisplayChanged: function(displayId) {
        try {
          if (self.state.closing) return;
          var nowTs = self.now();
          if (nowTs - self.state.lastMonitorTs < self.config.SCREEN_MONITOR_THROTTLE_MS) return;
          self.state.lastMonitorTs = nowTs;

          self.state.h.post(new JavaAdapter(java.lang.Runnable, {
            run: function() {
              try {
                if (self.state.closing) return;
                if (!self.state.addedBall) return;

                var rot = self.getRotation();
                var sz = self.getScreenSizePx();

                var changed = false;
                if (rot !== self.state.lastRotation) { self.state.lastRotation = rot; changed = true; }
                if (sz.w !== self.state.screen.w || sz.h !== self.state.screen.h) changed = true;

                if (changed) {
                  self.cancelDockTimer();
                  self.onScreenChangedReflow();
                  self.touchActivity();
                }
              } catch (e1) {
                if (self.L) self.L.e("displayChanged run err=" + String(e1));
              }
            }
          }));
        } catch (e0) {}
      }
    });

    this.state.displayListener = listener;
    dm.registerDisplayListener(listener, this.state.h);
    safeLog(this.L, 'i',  "display monitor registered");
  } catch (e2) {
    safeLog(this.L, 'e',  "setupDisplayMonitor err=" + String(e2));
  }
};

FloatBallAppWM.prototype.stopDisplayMonitor = function() {
  try { if (this.state.dm && this.state.displayListener) this.state.dm.unregisterDisplayListener(this.state.displayListener); } catch (e) {}
  this.state.displayListener = null;
  this.state.dm = null;
};

// =======================【Shell：智能执行（Action优先 + 广播桥兜底）】======================
// 这段代码的主要内容/用途：执行 Shell 按钮动作时，优先尝试 ShortX 的 ShellCommand Action（如可用）；失败则走自定义广播桥（由外部接收器实际执行）。
// 注意：system_server 进程本身不直接执行 shell；这里只负责"触发执行"。
// 这段代码的主要内容/用途：通过广播桥触发 Shell 执行（仅广播桥，不再使用 ShellCommand Action）。
// 注意：system_server 进程本身不直接执行 shell；外部接收器负责实际执行。
FloatBallAppWM.prototype.execShellSmart = function(cmdB64, needRoot) {
  var ret = { ok: false, via: "", err: "" };

  try {
    var action = String(this.config.SHELL_BRIDGE_ACTION || CONST_SHELL_BRIDGE_ACTION || "shortx.toolhub.SHELL");
    var it = new android.content.Intent(action);

    // # 固定广播协议：cmd_b64 + root + from（不再发送明文 cmd，避免协议漂移）
    it.putExtra(CONST_SHELL_BRIDGE_EXTRA_CMD, String(cmdB64));
    it.putExtra(CONST_SHELL_BRIDGE_EXTRA_ROOT, !!needRoot);
    // # from：来源标记，仅用于接收端识别/日志，不参与权限判断
    it.putExtra(CONST_SHELL_BRIDGE_EXTRA_FROM, "ToolHub");

    context.sendBroadcast(it);

    ret.ok = true;
    ret.via = "BroadcastBridge";
    safeLog(this.L, 'i',  "shell via broadcast ok action=" + action + " root=" + String(!!needRoot));
  } catch (eB) {
    ret.err = "Broadcast err=" + String(eB);
    safeLog(this.L, 'e',  "shell via broadcast fail err=" + String(eB));
  }

  return ret;
};


// =======================【WM 线程：按钮动作执行】======================
FloatBallAppWM.prototype.execButtonAction = function(btn, idx) {
  // # 点击防抖
  // 这段代码的主要内容/用途：防止在按钮面板上连续/乱点导致重复执行与 UI 状态机冲突（可能触发 system_server 异常重启）。
  if (!this.guardClick("btn_exec_" + String(idx), 380, null)) return;

  try {
  if (!btn || !btn.type) {
    this.toast("按钮#" + idx + " 未配置");
    safeLog(this.L, 'w',  "btn#" + String(idx) + " no type");
    return;
  }

  var t = String(btn.type);
  safeLog(this.L, 'i',  "btn click idx=" + String(idx) + " type=" + t + " title=" + String(btn.title || ""));

  if (t === "open_settings") {
    this.showPanelAvoidBall("settings");
    return;
  }

  if (t === "open_viewer") {
    var logPath = (this.L && this.L._filePathForToday) ? this.L._filePathForToday() : "";
    if (!logPath) logPath = PATH_LOG_DIR + "/ShortX_ToolHub_" + (new java.text.SimpleDateFormat("yyyyMMdd").format(new java.util.Date())) + ".log";

    var content = FileIO.readText(logPath);
    if (!content) content = "(日志文件不存在或为空: " + logPath + ")";

    if (content.length > 30000) {
        content = "[...前略...]\n" + content.substring(content.length - 30000);
    }

    // 简单的按行倒序，方便查看最新日志
    try {
        var lines = content.split("\n");
        if (lines.length > 1) {
             content = lines.reverse().join("\n");
        }
    } catch(eRev) {}

    this.showViewerPanel("今日日志 (倒序)", content);
    return;
  }

  if (t === "toast") {
    var msg = "";
    if (btn.text !== undefined && btn.text !== null) msg = String(btn.text);
    else if (btn.title) msg = String(btn.title);
    else msg = "按钮#" + idx;
    this.toast(msg);
    return;
  }

  if (t === "app") {
    var pkg = btn.pkg ? String(btn.pkg) : "";
    if (!pkg) { this.toast("按钮#" + idx + " 缺少 pkg"); return; }

    var it = context.getPackageManager().getLaunchIntentForPackage(pkg);
    if (!it) { this.toast("无法启动 " + pkg); return; }

    it.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);

// # 系统级跨用户启动：Context.startActivityAsUser
// 这段代码的主要内容/用途：支持"主应用/分身应用"选择，避免弹出选择器或误启动到另一用户。
// 说明：当未配置 launchUserId 时，默认使用 0（主用户）；失败则回退 startActivity。
var launchUid = 0;
try {
  if (btn.launchUserId != null && String(btn.launchUserId).length > 0) launchUid = parseInt(String(btn.launchUserId), 10);
} catch(eLU0) { launchUid = 0; }
if (isNaN(launchUid)) launchUid = 0;

try {
  // 运行日志：记录跨用户启动参数（便于定位分身启动失败原因）
  safeLog(this.L, 'i',  "startAsUser(app) idx=" + idx + " pkg=" + pkg + " launchUserId=" + launchUid);
  if (launchUid !== 0) {
    context.startActivityAsUser(it, android.os.UserHandle.of(launchUid));
  } else {
    context.startActivity(it);
  }
} catch (eA) {
  // # 兜底：某些 ROM/权限限制下 startActivityAsUser 可能抛异常，回退普通启动
  try { context.startActivity(it); } catch (eA2) {}
  this.toast("启动失败");
  safeLog(this.L, 'e',  "start app fail pkg=" + pkg + " uid=" + String(launchUid) + " err=" + String(eA));
}
return;
  }

  if (t === "shell") {
    // # 这段代码的主要内容/用途：执行 shell（支持 cmd 明文 与 cmd_b64；最终会确保发送/执行的是"真正的 base64"）
    // # 修复点：历史配置里有些按钮把"明文命令"误存进 cmd_b64（或 b64 被破坏），会导致广播接收端解码失败→看起来"没效果"。
    var cmdB64 = (btn.cmd_b64 !== undefined && btn.cmd_b64 !== null) ? String(btn.cmd_b64) : "";
    var cmdPlain = (btn.cmd !== undefined && btn.cmd !== null) ? String(btn.cmd) : "";

    // # 1) 只有明文但没有 b64：自动补齐 b64（避免特殊字符在多层字符串传递中被破坏）
    if ((!cmdB64 || cmdB64.length === 0) && cmdPlain && cmdPlain.length > 0) {
      try {
        var b64x = encodeBase64Utf8(cmdPlain);
        if (b64x && b64x.length > 0) cmdB64 = String(b64x);
      } catch (eB64a) {}
    }

    // # 2) cmd_b64 非空但无法解码：把它当作"明文命令"重新编码（保证广播桥/Action 都能吃到正确命令）
    // # 说明：decodeBase64Utf8 返回空串通常意味着 b64 非法或被破坏；而真实命令不太可能是空串。
    if (cmdB64 && cmdB64.length > 0) {
      try {
        var testPlain = decodeBase64Utf8(cmdB64);
        if ((!testPlain || testPlain.length === 0) && (!cmdPlain || cmdPlain.length === 0)) {
          cmdPlain = String(cmdB64);
          cmdB64 = "";
        }
      } catch (eB64b) {}
    }
    if ((!cmdB64 || cmdB64.length === 0) && cmdPlain && cmdPlain.length > 0) {
      try {
        var b64y = encodeBase64Utf8(cmdPlain);
        if (b64y && b64y.length > 0) cmdB64 = String(b64y);
      } catch (eB64c) {}
    }

    if (!cmdB64 || cmdB64.length === 0) {
      this.toast("按钮#" + idx + " 缺少 cmd/cmd_b64");
      safeLog(this.L, 'e',  "shell missing cmd idx=" + String(idx));
      return;
    }

    // # 广播桥接收端默认以 root 执行，强制使用 root
    var needRoot = true;

    var r = this.execShellSmart(cmdB64, needRoot);
    if (r && r.ok) return;

    this.toast("shell 失败（Action + 广播桥均失败）");
    safeLog(this.L, 'e',  "shell all failed cmd_b64=" + cmdB64 + " ret=" + JSON.stringify(r || {}));
    return;
  }

  if (t === "broadcast") {
    // 这段代码的主要内容/用途：发送自定义广播（兼容 btn.extra / btn.extras），并对 Shell 广播桥（shortx.toolhub.SHELL）做额外兼容（cmd/cmd_b64/root）。
    var action = btn.action ? String(btn.action) : "";
    if (!action) { this.toast("按钮#" + idx + " 缺少 action"); return; }

    var it2 = new android.content.Intent(action);

    // # 1) 兼容字段：extra / extras（两种都认）
    var ex = null;
    try {
      if (btn.extras) ex = btn.extras;
      else if (btn.extra) ex = btn.extra;
    } catch (eEx0) { ex = null; }

    // # 2) 写入 extras（支持 number / boolean / string；其他类型一律转字符串）
    if (ex) {
      try {
        var k;
        for (k in ex) {
          if (!ex.hasOwnProperty(k)) continue;
          var v = ex[k];

          if (typeof v === "number") it2.putExtra(String(k), Number(v));
          else if (typeof v === "boolean") it2.putExtra(String(k), !!v);
          else it2.putExtra(String(k), String(v));
        }
      } catch (eE) {}
    }

    // # 3) 对"Shell 广播桥"做额外兼容：
    //    - 你可以在 cfg 里写 extra.cmd（明文）或 extra.cmd_b64（Base64）
    //    - 同时会补齐 root/from，并且把 cmd 明文也塞一份，方便外部 MVEL 直接读取 cmd 进行验证
    try {
      var bridgeAction = String(this.config.SHELL_BRIDGE_ACTION || "shortx.toolhub.SHELL");
      if (action === bridgeAction) {
        var kCmdB64 = String(this.config.SHELL_BRIDGE_EXTRA_CMD || "cmd_b64");
        var kFrom = String(this.config.SHELL_BRIDGE_EXTRA_FROM || "from");
        var kRoot = String(this.config.SHELL_BRIDGE_EXTRA_ROOT || "root");

        var cmdPlain = "";
        var cmdB64 = "";

        try { cmdB64 = String(it2.getStringExtra(kCmdB64) || ""); } catch (eC0) { cmdB64 = ""; }
        try { cmdPlain = String(it2.getStringExtra("cmd") || ""); } catch (eC1) { cmdPlain = ""; }

        // # 有明文但没 b64：自动补 b64
        if ((!cmdB64 || cmdB64.length === 0) && cmdPlain && cmdPlain.length > 0) {
          try {
            var b64x = encodeBase64Utf8(cmdPlain);
            if (b64x && b64x.length > 0) {
              cmdB64 = b64x;
              it2.putExtra(kCmdB64, String(cmdB64));
            }
          } catch (eC2) {}
        }

        // # 有 b64 但没明文：也补一份明文（便于外部规则验证；真正执行仍建议用 cmd_b64）
        if ((!cmdPlain || cmdPlain.length === 0) && cmdB64 && cmdB64.length > 0) {
          try {
            var decoded = decodeBase64Utf8(cmdB64);
            if (decoded && decoded.length > 0) {
              cmdPlain = decoded;
              it2.putExtra("cmd", String(cmdPlain));
            }
          } catch (eC3) {}
        }

        // # root：广播桥接收端默认以 root 执行，强制传递 true
        try {
          if (!it2.hasExtra(kRoot)) {
            it2.putExtra(kRoot, true);
          }
        } catch (eR0) {
          try {
            it2.putExtra(kRoot, true);
          } catch (eR1) {}
        }


        // # root 类型纠正：如果外部 cfg 用了字符串 "true"/"false"，这里纠正为 boolean，避免外部 getBooleanExtra 读不到
        try {
          if (it2.hasExtra(kRoot)) {
            var bdl = it2.getExtras();
            if (bdl) {
              var raw = bdl.get(kRoot);
              if (raw != null) {
                var rawStr = String(raw);
                if (rawStr === "true" || rawStr === "false") {
                  it2.removeExtra(kRoot);
                  it2.putExtra(kRoot, rawStr === "true");
                }
              }
            }
          }
        } catch (eRB) {}

        // # from：标识来源（便于外部执行器做白名单/审计）
        try {
          if (!it2.hasExtra(kFrom)) it2.putExtra(kFrom, "ToolHub@system_server");
        } catch (eF0) { try { it2.putExtra(kFrom, "ToolHub@system_server"); } catch (eF1) {} }

        if (this.L) {
          try {
            this.L.i("broadcast(shell_bridge) action=" + action + " cmd_len=" + String(cmdPlain ? cmdPlain.length : 0) +
              " cmd_b64_len=" + String(cmdB64 ? cmdB64.length : 0) + " root=" + String(it2.getBooleanExtra(kRoot, false)));
          } catch (eLg) {}
        }
      }
    } catch (eSB) {}

    try { context.sendBroadcast(it2); } catch (eB) { this.toast("广播失败"); safeLog(this.L, 'e',  "broadcast fail action=" + action + " err=" + String(eB)); }
    return;
  }

  if (t === "shortcut") {
  // 这段代码的主要内容/用途：仅使用 JavaScript(startActivityAsUser) 执行快捷方式，取消 Shell 与所有兜底，避免弹出主/分身选择器。
  // 说明：
  // 1) 运行时只执行按钮字段 shortcutJsCode（由"选择快捷方式列表"点选自动生成，可手动微调）
  // 2) 不再调用 am start，不再回退 LauncherApps.startShortcut（用户要求：取消 shell、取消兜底）
  // 3) 目标 userId：launchUserId > userId（用于锁定主/分身）

  var spkg = btn.pkg ? String(btn.pkg) : "";
  var sid = btn.shortcutId ? String(btn.shortcutId) : "";
  var iu = (btn.intentUri != null) ? String(btn.intentUri) : "";

  var uid = 0;
  try { uid = (btn.userId != null) ? parseInt(String(btn.userId), 10) : 0; } catch(eUid0) { uid = 0; }
  if (isNaN(uid)) uid = 0;

  // # 启动 userId 优先级：launchUserId > userId
  try {
    if (btn.launchUserId != null && String(btn.launchUserId).length > 0) {
      var lu0 = parseInt(String(btn.launchUserId), 10);
      if (!isNaN(lu0)) uid = lu0;
    }
  } catch(eLu0) {}

  if (!spkg) { this.toast("按钮#" + idx + " 缺少 pkg"); return; }
  if (!sid) { this.toast("按钮#" + idx + " 缺少 shortcutId"); return; }

  // # JavaScript 执行：只执行 shortcutJsCode
  var jsCode = (btn.shortcutJsCode != null) ? String(btn.shortcutJsCode) : "";
  if (!jsCode || jsCode.length === 0) {
    this.toast("按钮#" + idx + " 未配置 JS 启动代码");
    return;
  }

  try {
    // # 提供少量上下文变量给脚本使用（可选）
    // - __sc_intentUri: 当前按钮 intentUri
    // - __sc_userId: 当前目标 userId（已合并 launchUserId）
    var __sc_intentUri = iu;
    var __sc_userId = uid;

    var rjs = eval(jsCode);

    // # 约定：返回值以 ok 开头视为成功；以 err 开头视为失败（失败也不兜底）
    var sret = (rjs == null) ? "" : String(rjs);
    if (sret.indexOf("ok") === 0) {
      safeLog(this.L, 'i',  "shortcut(js-only) ok pkg=" + spkg + " id=" + sid + " user=" + String(uid));
      return;
    }

    safeLog(this.L, 'e',  "shortcut(js-only) fail pkg=" + spkg + " id=" + sid + " user=" + String(uid) + " ret=" + sret);
    this.toast("快捷方式 JS 启动失败: " + sret);
    return;
  } catch (eJsSc) {
    safeLog(this.L, 'e',  "shortcut(js-only) exception pkg=" + spkg + " id=" + sid + " err=" + eJsSc);
    this.toast("快捷方式 JS 异常: " + String(eJsSc));
    return;
  }
}

  this.toast("未知 type=" + t);
  safeLog(this.L, 'w',  "unknown btn type=" + t);
  } catch (eBtn) {
    try { this.toast("按钮执行异常"); } catch (e0) {}
    safeLog(this.L, 'e',  "execButtonAction crash idx=" + String(idx) + " err=" + String(eBtn));
  }

};

// =======================【新增：改大小后安全重建悬浮球】======================
FloatBallAppWM.prototype.rebuildBallForNewSize = function(keepPanels) {
  if (this.state.closing) return false;
  if (!this.state.wm) return false;
  if (!this.state.addedBall) return false;
  if (!this.state.ballRoot) return false;
  if (!this.state.ballLp) return false;
  if (this.state.dragging) return false;

  var oldSize = this.state.ballLp.height;
  if (!oldSize || oldSize <= 0) oldSize = this.getDockInfo().ballSize;

  var oldX = this.state.ballLp.x;
  var oldY = this.state.ballLp.y;

  var oldCenterX = oldX + Math.round(oldSize / 2);
  var oldCenterY = oldY + Math.round(oldSize / 2);

  if (!keepPanels) {
    this.hideAllPanels();
  }
  this.cancelDockTimer();

  this.state.docked = false;
  this.state.dockSide = null;

  this.safeRemoveView(this.state.ballRoot, "ballRoot-rebuild");

  this.state.ballRoot = null;
  this.state.ballContent = null;
  this.state.ballLp = null;
  this.state.addedBall = false;

  this.createBallViews();

  var di = this.getDockInfo();
  var newSize = di.ballSize;

  var newX = oldCenterX - Math.round(newSize / 2);
  var newY = oldCenterY - Math.round(newSize / 2);

  var maxX = Math.max(0, this.state.screen.w - newSize);
  var maxY = Math.max(0, this.state.screen.h - newSize);

  newX = this.clamp(newX, 0, maxX);
  newY = this.clamp(newY, 0, maxY);

  var lp = new android.view.WindowManager.LayoutParams(
    newSize,
    newSize,
    android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
    android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
    android.graphics.PixelFormat.TRANSLUCENT
  );

  lp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
  lp.x = newX;
  lp.y = newY;

  try {
    this.state.wm.addView(this.state.ballRoot, lp);
    this.state.ballLp = lp;
    this.state.addedBall = true;
  } catch (eAdd) {
    try { this.toast("重建悬浮球失败: " + String(eAdd)); } catch (eT) {}
    safeLog(this.L, 'e',  "rebuildBall add fail err=" + String(eAdd));
    return false;
  }

  this.savePos(this.state.ballLp.x, this.state.ballLp.y);
  this.touchActivity();
  safeLog(this.L, 'i',  "rebuildBall ok size=" + String(newSize) + " x=" + String(newX) + " y=" + String(newY));
  return true;
};

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
  } else {
     // 兜底文本
     var tv = new android.widget.TextView(context);
     tv.setText(String(item.name));
     tv.setTextColor(secColor);
     row.addView(tv);
     parent.addView(row);
  }
};

FloatBallAppWM.prototype.buildSettingsPanelView = function() {
  this.beginEditConfig();

  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var bgColor = isDark ? C.bgDark : C.bgLight;
  var cardColor = isDark ? C.cardDark : C.cardLight;
  var textColor = isDark ? C.textPriDark : C.textPriLight;

  var panel = this.ui.createStyledPanel(this, 16);
  var header = this.ui.createStyledHeader(this, 8);

  // 内存显示
  var memTv = new android.widget.TextView(context);
  memTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 10);
  memTv.setTextColor(isDark ? C.textSecDark : C.textSecLight);
  memTv.setPadding(0, 0, this.dp(8), 0);

  function updateMem() {
      try {
          var rt = java.lang.Runtime.getRuntime();
          var total = rt.totalMemory() / 1024 / 1024;
          var free = rt.freeMemory() / 1024 / 1024;
          var used = total - free;
          var max = rt.maxMemory() / 1024 / 1024;
          memTv.setText("Mem: " + used.toFixed(0) + "/" + max.toFixed(0) + "M");
      } catch(e) { memTv.setText("Mem: ?"); }
  }
  updateMem();
  memTv.setOnClickListener(new android.view.View.OnClickListener({
      onClick: function() { updateMem(); self.toast("内存已刷新"); }
  }));
  header.addView(memTv);

  // 占位 View 顶替标题位置，让右侧按钮靠右
  header.addView(this.ui.createSpacer(this));

  var self = this;

  // # 固定按钮：项目文档（放在第一位）
  var btnDoc = this.ui.createFlatButton(this, "📖 文档", C.primary, function() {
      try {
          var intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
          intent.setData(android.net.Uri.parse("https://xin-blog.com/114.html"));
          intent.setFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
          context.startActivity(intent);
      } catch(e) {
          self.toast("无法打开文档链接");
      }
  });
  btnDoc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
  header.addView(btnDoc);

  // [恢复] 按钮管理
  var btnMgr = this.ui.createFlatButton(this, "按钮管理", C.primary, function() {
      self.hideSettingsPanel();
      self.showPanelAvoidBall("btn_editor");
  });
  btnMgr.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
  header.addView(btnMgr);

  // 预览模式开关
  var previewBox = new android.widget.LinearLayout(context);
  previewBox.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  previewBox.setGravity(android.view.Gravity.CENTER_VERTICAL);
  previewBox.setPadding(this.dp(8), this.dp(2), this.dp(4), this.dp(2));
  previewBox.setBackground(self.ui.createRoundDrawable(self.withAlpha(C.accent, 0.1), self.dp(16))); // 浅色背景提示

  var tvPreview = new android.widget.TextView(context);
  tvPreview.setText("实时预览");
  tvPreview.setTextColor(C.accent);
  tvPreview.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  tvPreview.setTypeface(null, android.graphics.Typeface.BOLD);
  tvPreview.setPadding(0, 0, this.dp(4), 0);
  previewBox.addView(tvPreview);

  var switchPreview = new android.widget.Switch(context);
  try { switchPreview.setTextOn(""); switchPreview.setTextOff(""); } catch (eT) {}
  try {
      var states = [[android.R.attr.state_checked], [-android.R.attr.state_checked]];
      var thumbColors = [C.accent, isDark ? (0xFF555555 | 0) : (0xFFCCCCCC | 0)];
      var trackColors = [self.withAlpha(C.accent, 0.5), self.withAlpha(isDark ? (0xFF555555 | 0) : (0xFFCCCCCC | 0), 0.5)];
      switchPreview.setThumbTintList(new android.content.res.ColorStateList(states, thumbColors));
      switchPreview.setTrackTintList(new android.content.res.ColorStateList(states, trackColors));
  } catch(e) {}

  switchPreview.setChecked(!!self.state.previewMode);
  switchPreview.setOnCheckedChangeListener(new android.widget.CompoundButton.OnCheckedChangeListener({
      onCheckedChanged: function(btn, checked) {
          self.touchActivity();
          self.state.previewMode = !!checked;
          if (checked) {
              self.toast("预览模式已开启：修改配置实时生效");
              tvPreview.setTextColor(C.accent);
              previewBox.setBackground(self.ui.createRoundDrawable(self.withAlpha(C.accent, 0.1), self.dp(16)));
              self.refreshPreview();
          } else {
              self.toast("预览模式已关闭");
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
  var btnOk = this.ui.createSolidButton(this, "保存", C.primary, android.graphics.Color.WHITE, function() {
      try {
        self.touchActivity();
        if (self.L) self.L.i("settings confirm click");

        var r = self.commitPendingUserCfg();
        self.state.previewMode = false;
        if (self.state.addedPanel) self.hideMainPanel();

        self.hideSettingsPanel();

        if (r && r.ok) self.toast("已确认并生效");
        else self.toast("确认失败: " + (r && r.reason ? r.reason : (r && r.err ? r.err : "unknown")));
      } catch (e0) {
        try { self.toast("确认异常: " + String(e0)); } catch (eT) {}
        if (self.L) self.L.e("settings confirm err=" + String(e0));
      }
  });
  btnOk.setPadding(self.dp(12), self.dp(6), self.dp(12), self.dp(6));
  btnOk.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
  header.addView(btnOk);

  // 暴露 Header
  panel.setTag(header);
  panel.addView(header);

  var scroll = new android.widget.ScrollView(context);
  try { scroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER); } catch (eOS) {}
  try { scroll.setVerticalScrollBarEnabled(false); } catch (eSB) {}

  var box = new android.widget.LinearLayout(context);
  box.setOrientation(android.widget.LinearLayout.VERTICAL);
  box.setPadding(0, this.dp(4), 0, this.dp(4));
  scroll.addView(box);

  scroll.setOnTouchListener(new JavaAdapter(android.view.View.OnTouchListener, {
    onTouch: function(v, e) { self.touchActivity(); return false; }
  }));

  var schema = this.getConfigSchema();
  var currentCard = null;

  function createCard() {
      var c = new android.widget.LinearLayout(context);
      c.setOrientation(android.widget.LinearLayout.VERTICAL);
      c.setBackground(self.ui.createRoundDrawable(cardColor, self.dp(12)));
      try { c.setElevation(self.dp(2)); } catch(e){}
      try { c.setClipToOutline(true); } catch(e){}
      var lp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
      lp.setMargins(self.dp(2), self.dp(6), self.dp(2), self.dp(6));
      c.setLayoutParams(lp);
      // Remove padding to allow items to be full-width (for ripple)
      c.setPadding(0, 0, 0, self.dp(4));
      return c;
  }

  for (var i = 0; i < schema.length; i++) {
    (function(item) {
      if (item && String(item.type) === "section") {
        currentCard = createCard();
        box.addView(currentCard);
        self.createSectionHeader(item, currentCard);
      } else {
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

  panel.addView(scroll);
  return panel;
};

// =======================【按钮编辑面板】======================
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

  // 颜色配置
  var bgColor = isDark ? C.bgDark : C.bgLight;
  var cardColor = isDark ? C.cardDark : C.cardLight;
  var textColor = isDark ? C.textPriDark : C.textPriLight;
  var subTextColor = isDark ? C.textSecDark : C.textSecLight;
  var dividerColor = isDark ? C.dividerDark : C.dividerLight;
  var inputBgColor = isDark ? C.inputBgDark : C.inputBgLight;

  var panel = this.ui.createStyledPanel(this, 16);

  // --- 标题栏 ---
  var header = this.ui.createStyledHeader(this, 12);

  // # 列表滚动位置保持：用于在刷新按钮列表（排序/删除/切换启用）后，恢复到用户当前滚动位置
  var __btnEditorListScroll = null;

  // Title removed to avoid duplication with wrapper
  // Placeholder to push buttons to the right
  header.addView(this.ui.createSpacer(this));

  // 刷新面板辅助函数
  function refreshPanel() {
    // # 列表滚动位置保持：刷新前记录当前 ScrollView 的 scrollY，避免操作后回到第一页
    try {
      if (__btnEditorListScroll) self.state.btnEditorListScrollY = __btnEditorListScroll.getScrollY();
    } catch(eSY) {}

    // 标记为刷新操作，保留 tempButtons 状态
    self.state.keepBtnEditorState = true;
    // 关闭当前面板并重新打开
    self.showPanelAvoidBall("btn_editor");
  }

  // --- 列表模式 ---
  if (!isEditing) {
    // 头部布局优化：[ 提示文字 ... 新增 ]
    header.removeAllViews(); // 清除之前的 dummy

    // 提示文字 (左侧)
    var hintTv = new android.widget.TextView(context);
    hintTv.setText("长按卡片排序");
    hintTv.setTextColor(subTextColor);
    hintTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    header.addView(hintTv);

    // Spacer
    header.addView(self.ui.createSpacer(self));

    // 新增按钮 (右侧)
    var btnAdd = self.ui.createSolidButton(self, "新增", C.primary, android.graphics.Color.WHITE, function() {
        self.state.editingButtonIndex = -1;
        refreshPanel();
    });
    // 调整新增按钮样式，使其更紧凑
    btnAdd.setPadding(self.dp(12), self.dp(6), self.dp(12), self.dp(6));
    btnAdd.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    header.addView(btnAdd);

    panel.addView(header);

    // 暴露 Header 给 DragListener
    panel.setTag(header);

    // 列表区域
    var scroll = new android.widget.ScrollView(context);
    __btnEditorListScroll = scroll; // # 列表滚动位置保持：让 refreshPanel 能拿到当前列表的滚动位置
    try { scroll.setVerticalScrollBarEnabled(false); } catch(e){}
    var list = new android.widget.LinearLayout(context);
    list.setOrientation(android.widget.LinearLayout.VERTICAL);
    list.setPadding(0, self.dp(2), 0, self.dp(2));

    for (var i = 0; i < buttons.length; i++) {
      (function(idx) {
        var btnCfg = buttons[idx];

        // # 启用/禁用状态：禁用项在按钮页不显示，但在管理页需要标识出来
        var __enabled = true;
        try { __enabled = (btnCfg && btnCfg.enabled === false) ? false : true; } catch(eEn) { __enabled = true; }

        // 卡片容器
        var card = new android.widget.LinearLayout(context);
        card.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        card.setGravity(android.view.Gravity.CENTER_VERTICAL);
        // 使用稍微不同的背景色以突出卡片
        var cardBgColor = isDark ? self.withAlpha(C.cardDark, 0.8) : self.withAlpha(C.cardLight, 0.8);
        card.setBackground(self.ui.createRoundDrawable(cardBgColor, self.dp(16)));
        try { card.setElevation(self.dp(4)); } catch(e){}

        var cardLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        cardLp.setMargins(self.dp(4), self.dp(4), self.dp(4), self.dp(4));
        card.setLayoutParams(cardLp);
        card.setPadding(self.dp(14), self.dp(10), self.dp(10), self.dp(10)); // # 行高优化：降低上下内边距，避免"按钮管理列表"单行过高

        // # 视觉提示：禁用项整体变淡，方便一眼区分
        if (!__enabled) {
            try { card.setAlpha(0.55); } catch(eA) {}
        } else {
            try { card.setAlpha(1.0); } catch(eA2) {}
        }

        // 点击编辑
        card.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {
                self.state.editingButtonIndex = idx;
                refreshPanel();
            }
        }));

        // # 左侧图标：按钮管理列表与按钮页一致显示其对应的 icon
        // # 说明：复用 resolveIconDrawable（支持 iconPath / app 图标 / shortcut 图标 / resId），避免重复实现与性能浪费
        var iconIv = new android.widget.ImageView(context);
        try {
            var dr0 = self.resolveIconDrawable(btnCfg);
            if (dr0) iconIv.setImageDrawable(dr0);
        } catch(eIcon0) {}
        try { iconIv.setScaleType(android.widget.ImageView.ScaleType.CENTER_INSIDE); } catch(eScale){}
        var iconSizeDp = 24;
        try { iconSizeDp = Number(self.config.PANEL_ICON_SIZE_DP || 24); } catch(eSz){}
        // # 管理页行高更紧凑：限制 icon 尺寸，避免挤占文字区域
        if (!iconSizeDp || iconSizeDp < 18) iconSizeDp = 24;
        if (iconSizeDp > 32) iconSizeDp = 32;
        var iconLp = new android.widget.LinearLayout.LayoutParams(self.dp(iconSizeDp), self.dp(iconSizeDp));
        iconLp.rightMargin = self.dp(10);
        iconIv.setLayoutParams(iconLp);
        card.addView(iconIv);

        // 中间文本信息
        var textContainer = new android.widget.LinearLayout(context);
        textContainer.setOrientation(android.widget.LinearLayout.VERTICAL);
        var textLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        textLp.weight = 1;
        textContainer.setLayoutParams(textLp);

        // 标题
        var infoTv = new android.widget.TextView(context);
        infoTv.setText(String(btnCfg.title || "无标题"));
        infoTv.setTextColor(textColor);
        infoTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 15);
        infoTv.setTypeface(null, android.graphics.Typeface.BOLD);
        textContainer.addView(infoTv);

        // 类型/详情描述
        var detailTv = new android.widget.TextView(context);
        var desc = "Shell";
        if(btnCfg.type === "app") desc = "应用: " + (btnCfg.pkg||"");
        else if(btnCfg.type === "broadcast") desc = "广播: " + (btnCfg.action||"");
        else if(btnCfg.type === "shortcut") desc = "快捷方式";
        else desc = "命令: " + (btnCfg.cmd || "").substring(0, 20) + "...";
        detailTv.setText(desc);
        detailTv.setTextColor(subTextColor);
        detailTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
        detailTv.setSingleLine(true);
        detailTv.setEllipsize(android.text.TextUtils.TruncateAt.END);
        textContainer.addView(detailTv);

        card.addView(textContainer);

        // 右侧操作区
        var actions = new android.widget.LinearLayout(context);
        actions.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        actions.setGravity(android.view.Gravity.CENTER_VERTICAL);        // 上移/下移（排序按钮布局优化：扩大点击面积，顶部/底部也占位，避免难点）
        // 说明：原先 ▲▼ 太小且只有可用时才出现，手指很难点中；这里改为固定 2 个大按钮（44dp），不可用则置灰禁用。
        var sortBox = new android.widget.LinearLayout(context);
        sortBox.setOrientation(android.widget.LinearLayout.HORIZONTAL); // # 排序按钮改为横向排列，减少占高
        sortBox.setGravity(android.view.Gravity.CENTER);

        // 按钮公共样式
        var mkSortBtn = function(txt, enabled, onClickFn) {
            var tv = new android.widget.TextView(context);
            tv.setText(txt);
            tv.setGravity(android.view.Gravity.CENTER);
            tv.setTextSize(12); // # 排序按钮适量缩小字号
            tv.setMinWidth(self.dp(36)); // # 排序按钮适量缩小点击块
            tv.setMinHeight(self.dp(36)); // # 排序按钮适量缩小点击块
            tv.setPadding(0, 0, 0, 0);

            // 轻量边框+圆角，提升"可点击"视觉
            try {
                var bg = new android.graphics.drawable.GradientDrawable();
                bg.setColor(android.graphics.Color.TRANSPARENT);
                bg.setCornerRadius(self.dp(8)); // # 小一点圆角更紧凑
                bg.setStroke(self.dp(1), self.withAlpha(subTextColor, 0.22));
                tv.setBackground(bg);
            } catch (eBg) {}

            if (!enabled) {
                tv.setEnabled(false);
                tv.setTextColor(self.withAlpha(subTextColor, 0.25));
            } else {
                tv.setEnabled(true);
                tv.setTextColor(subTextColor);
                tv.setOnClickListener(new android.view.View.OnClickListener({
                    onClick: function() {
                        try { onClickFn(); } catch (eSort) {}
                    }
                }));
            }
            return tv;
        };

        // 上移按钮（顶部也占位）
        var canUp = (idx > 0);
        var u = mkSortBtn("▲", canUp, function() {
            var temp = buttons[idx];
            buttons[idx] = buttons[idx - 1];
            buttons[idx - 1] = temp;
            refreshPanel();
        });
        sortBox.addView(u);

        // 下移按钮（底部也占位）
        var canDown = (idx < buttons.length - 1);
        var d = mkSortBtn("▼", canDown, function() {
            var temp = buttons[idx];
            buttons[idx] = buttons[idx + 1];
            buttons[idx + 1] = temp;
            refreshPanel();
        });
        // 两按钮之间留一点间距，避免误触
        try {
            var lpD = new android.widget.LinearLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT,
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT
            );
            lpD.leftMargin = self.dp(6); // # 横向排列：用左间距代替上间距
            d.setLayoutParams(lpD);
        } catch (eLp) {}
        sortBox.addView(d);

        actions.addView(sortBox);

        // # 禁用/启用：管理页直接切换显示状态（禁用后按钮页不显示该按钮）
        var btnToggle = new android.widget.TextView(context);
        btnToggle.setText(__enabled ? "禁用" : "启用");
        btnToggle.setGravity(android.view.Gravity.CENTER);
        btnToggle.setTextSize(12);
        btnToggle.setMinWidth(self.dp(44));
        btnToggle.setMinHeight(self.dp(36));
        btnToggle.setPadding(self.dp(6), 0, self.dp(6), 0);
        try {
            var tgBg = new android.graphics.drawable.GradientDrawable();
            tgBg.setColor(android.graphics.Color.TRANSPARENT);
            tgBg.setCornerRadius(self.dp(8));
            tgBg.setStroke(self.dp(1), self.withAlpha(subTextColor, 0.22));
            btnToggle.setBackground(tgBg);
        } catch (eTgBg) {}
        btnToggle.setTextColor(__enabled ? self.withAlpha(subTextColor, 0.9) : self.withAlpha(C.success, 0.9));
        try {
            var lpTg = new android.widget.LinearLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT,
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT
            );
            lpTg.leftMargin = self.dp(6);
            btnToggle.setLayoutParams(lpTg);
        } catch(eLpTg) {}
        btnToggle.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {
                try {
                    btnCfg.enabled = (btnCfg.enabled === false) ? true : false;
                    // # 立即持久化，避免面板关闭后丢失
                    ConfigManager.saveButtons(buttons);
                } catch(eTg) {}
                refreshPanel();
            }
        }));
        actions.addView(btnToggle);

        // 删除按钮
        var btnDel = new android.widget.TextView(context);
        btnDel.setText("✕"); // 垃圾桶图标更好，但这里用X
        btnDel.setTextColor(self.withAlpha(C.danger, 0.7));
        btnDel.setTextSize(16);
        btnDel.setPadding(self.dp(10), self.dp(10), self.dp(4), self.dp(10));
        btnDel.setOnClickListener(new android.view.View.OnClickListener({
            onClick: function() {
                 // 确认删除
                 buttons.splice(idx, 1);
                 refreshPanel();
            }
        }));
        actions.addView(btnDel);

        card.addView(actions);
        list.addView(card);

      })(i);
    }

    // 空状态提示
    if (buttons.length === 0) {
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
        emptyTv.setText("暂无按钮，点击右上角新增");
        emptyTv.setTextColor(subTextColor);
        emptyTv.setPadding(0, self.dp(16), 0, 0);
        emptyBox.addView(emptyTv);

        list.addView(emptyBox);
    }

    scroll.addView(list);
    // # 列表高度优化：限制"按钮管理列表"高度，避免列表区域过高导致底部操作区被顶到很下面
    // # 说明：原先使用 weight=1 会占满剩余空间，在不同机型上会显得"列表太高"；这里改为按屏幕高度自适应，并限制上下界
    var scrollLp;
    try {
        var dm2 = context.getResources().getDisplayMetrics();
        var hPx2 = dm2 ? dm2.heightPixels : 0;
        var targetPx2 = hPx2 > 0 ? Math.floor(hPx2 * 0.55) : self.dp(360);
        var minPx2 = self.dp(220);
        var maxPx2 = self.dp(520);
        if (targetPx2 < minPx2) targetPx2 = minPx2;
        if (targetPx2 > maxPx2) targetPx2 = maxPx2;
        scrollLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, targetPx2);
    } catch(eScrollH) {
        scrollLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, self.dp(360));
    }
    scroll.setLayoutParams(scrollLp);
    panel.addView(scroll);

    // # 列表滚动位置保持：刷新/返回列表后，恢复到上一次滚动位置（避免回到第一页）
    try {
        var _y = (self.state.btnEditorListScrollY !== undefined && self.state.btnEditorListScrollY !== null) ? Number(self.state.btnEditorListScrollY) : 0;
        if (_y > 0) {
            scroll.post(new java.lang.Runnable({
                run: function() {
                    try { scroll.scrollTo(0, _y); } catch(eSY2) {}
                }
            }));
        }
    } catch(eSY3) {}

    // 底部按钮栏
    var bottomBar = new android.widget.LinearLayout(context);
    bottomBar.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    bottomBar.setGravity(android.view.Gravity.END | android.view.Gravity.CENTER_VERTICAL);
    bottomBar.setPadding(0, self.dp(12), 0, 0);

    var btnListCancel = self.ui.createFlatButton(self, "取消更改", subTextColor, function() {
        self.state.tempButtons = null;
        self.toast("已取消更改");
        self.hideAllPanels();
    });
    bottomBar.addView(btnListCancel);

    // 间隔
    var space = new android.view.View(context);
    space.setLayoutParams(new android.widget.LinearLayout.LayoutParams(self.dp(12), 1));
    bottomBar.addView(space);

    var btnListSave = self.ui.createSolidButton(self, "保存所有", C.primary, android.graphics.Color.WHITE, function() {
        try {
            ConfigManager.saveButtons(buttons);
            self.panels.main = buttons;
            self.state.tempButtons = null;
            self.toast("保存成功");
            refreshPanel();
        } catch(e) { self.toast("保存失败:" + e); }
    });
    bottomBar.addView(btnListSave);

    panel.addView(bottomBar);

  } else {
    // --- 编辑模式 ---
    // panel.addView(header); // Removed empty header
    panel.setTag(header); // 暴露 Header

    var editIdx = this.state.editingButtonIndex;
    var targetBtn = (editIdx === -1) ? { type: "shell", title: "", cmd: "", iconResId: 0 } : JSON.parse(JSON.stringify(buttons[editIdx]));

    var scroll = new android.widget.ScrollView(context);
    try { scroll.setVerticalScrollBarEnabled(false); } catch(e){}
    var form = new android.widget.LinearLayout(context);
    form.setOrientation(android.widget.LinearLayout.VERTICAL);
    form.setPadding(self.dp(4), self.dp(4), self.dp(4), self.dp(4));

    // 操作提示
    var editHint = new android.widget.TextView(context);
    editHint.setText("提示：选择动作类型并填写相应参数，完成后点击底部暂存");
    editHint.setTextColor(subTextColor);
    editHint.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    editHint.setPadding(self.dp(4), 0, 0, self.dp(16));
    form.addView(editHint);

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

    var inputTitle = self.ui.createInputGroup(self, "标题 (Title)", targetBtn.title, false, "按钮上显示的文字");
    titleArea.addView(inputTitle.view);
    topArea.addView(titleArea);

    form.addView(topArea);

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
    rbIconFile.setText("文件路径");
    rbIconFile.setTextColor(textColor);
    rbIconFile.setTag("file");

    var rbIconShortX = new android.widget.RadioButton(context);
    rbIconShortX.setText("ShortX图标");
    rbIconShortX.setTextColor(textColor);
    rbIconShortX.setTag("shortx");

    iconRadioGroup.addView(rbIconFile);
    iconRadioGroup.addView(rbIconShortX);
    iconSelectWrap.addView(iconRadioGroup);
    form.addView(iconSelectWrap);

    // 1.5a 图标路径（文件方式）
    var inputIconPath = self.ui.createInputGroup(self, "图标路径 (绝对地址)", targetBtn.iconPath, false, "支持 PNG/JPG 绝对路径，自动安全加载");
    form.addView(inputIconPath.view);

    // 1.5b ShortX 内置图标名称
    var normalizedInitShortX = self.normalizeShortXIconName(targetBtn.iconResName, false);
    var inputShortXIcon = self.ui.createInputGroup(self, "ShortX 图标名称", normalizedInitShortX, false, "例如: share_line, save_fill, home_line");
    form.addView(inputShortXIcon.view);

    // # ShortX 图标快捷选择区
    var shortxPickerState = {
        expanded: false,
        lastQuery: "",
        iconList: null,
        previewIv: null,
        previewNameTv: null,
        statusTv: null,
        searchEt: null,
        grid: null,
        pickerWrap: null,
        toggleBtn: null,
        clearBtn: null,
        pageSize: 20,
        currentPage: 0,
        activeTab: "all",
        tabButtons: {},
        pageInfoTv: null,
        prevBtn: null,
        nextBtn: null
    };

    var shortxQuickRow = new android.widget.LinearLayout(context);
    shortxQuickRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    shortxQuickRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
    shortxQuickRow.setPadding(0, 0, 0, self.dp(8));
    form.addView(shortxQuickRow);

    var shortxPreviewCard = new android.widget.LinearLayout(context);
    shortxPreviewCard.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    shortxPreviewCard.setGravity(android.view.Gravity.CENTER_VERTICAL);
    shortxPreviewCard.setPadding(self.dp(10), self.dp(8), self.dp(10), self.dp(8));
    shortxPreviewCard.setBackground(self.ui.createRoundDrawable(self.withAlpha(C.primary, 0.08), self.dp(12)));
    var shortxPreviewLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    shortxPreviewLp.weight = 1;
    shortxQuickRow.addView(shortxPreviewCard, shortxPreviewLp);

    var shortxPreviewIv = new android.widget.ImageView(context);
    var shortxPreviewIvLp = new android.widget.LinearLayout.LayoutParams(self.dp(20), self.dp(20));
    shortxPreviewIvLp.rightMargin = self.dp(8);
    shortxPreviewIv.setLayoutParams(shortxPreviewIvLp);
    shortxPreviewCard.addView(shortxPreviewIv);
    shortxPickerState.previewIv = shortxPreviewIv;

    var shortxPreviewNameTv = new android.widget.TextView(context);
    shortxPreviewNameTv.setTextColor(textColor);
    shortxPreviewNameTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    try { shortxPreviewNameTv.setSingleLine(true); shortxPreviewNameTv.setEllipsize(android.text.TextUtils.TruncateAt.END); } catch(eEL0) {}
    shortxPreviewCard.addView(shortxPreviewNameTv, new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1));
    shortxPickerState.previewNameTv = shortxPreviewNameTv;

    var shortxBtnGap = new android.view.View(context);
    shortxBtnGap.setLayoutParams(new android.widget.LinearLayout.LayoutParams(self.dp(8), 1));
    shortxQuickRow.addView(shortxBtnGap);

    var btnBrowseShortXIcon = self.ui.createFlatButton(self, "图标库", C.primary, function() {
        self.touchActivity();
        shortxPickerState.expanded = !shortxPickerState.expanded;
        if (shortxPickerState.pickerWrap) {
            shortxPickerState.pickerWrap.setVisibility(shortxPickerState.expanded ? android.view.View.VISIBLE : android.view.View.GONE);
        }
        try { if (shortxPickerState.toggleBtn) shortxPickerState.toggleBtn.setText(shortxPickerState.expanded ? "收起" : "图标库"); } catch(eT1) {}
        if (shortxPickerState.expanded) renderShortXIconGrid();
    });
    shortxPickerState.toggleBtn = btnBrowseShortXIcon;
    shortxQuickRow.addView(btnBrowseShortXIcon);

    var shortxBtnGap2 = new android.view.View(context);
    shortxBtnGap2.setLayoutParams(new android.widget.LinearLayout.LayoutParams(self.dp(8), 1));
    shortxQuickRow.addView(shortxBtnGap2);

    var btnClearShortXIcon = self.ui.createFlatButton(self, "清空", subTextColor, function() {
        self.touchActivity();
        inputShortXIcon.input.setText("");
        updateShortXIconPreview();
    });
    shortxPickerState.clearBtn = btnClearShortXIcon;
    shortxQuickRow.addView(btnClearShortXIcon);

    var shortxPickerWrap = new android.widget.LinearLayout(context);
    shortxPickerWrap.setOrientation(android.widget.LinearLayout.VERTICAL);
    shortxPickerWrap.setPadding(0, 0, 0, self.dp(8));
    shortxPickerWrap.setVisibility(android.view.View.GONE);
    shortxPickerWrap.setBackground(self.ui.createRoundDrawable(self.withAlpha(cardColor, 0.92), self.dp(14)));
    form.addView(shortxPickerWrap);
    shortxPickerState.pickerWrap = shortxPickerWrap;

    var shortxPickerHead = new android.widget.TextView(context);
    shortxPickerHead.setText("ShortX 图标库（支持搜索，点击即回填）");
    shortxPickerHead.setTextColor(subTextColor);
    shortxPickerHead.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    shortxPickerHead.setPadding(self.dp(12), self.dp(10), self.dp(12), self.dp(6));
    shortxPickerWrap.addView(shortxPickerHead);

    var shortxSearchEt = new android.widget.EditText(context);
    shortxSearchEt.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
    shortxSearchEt.setTextColor(textColor);
    try { shortxSearchEt.setHintTextColor(subTextColor); } catch(eHintColor) {}
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

    var shortxTabsScroll = new android.widget.HorizontalScrollView(context);
    try { shortxTabsScroll.setHorizontalScrollBarEnabled(false); } catch(eTabSb) {}
    try { shortxTabsScroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER); } catch(eTabOs) {}
    var shortxTabsLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    shortxTabsLp.setMargins(self.dp(8), 0, self.dp(8), self.dp(6));
    shortxPickerWrap.addView(shortxTabsScroll, shortxTabsLp);

    var shortxTabsRow = new android.widget.LinearLayout(context);
    shortxTabsRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    shortxTabsRow.setPadding(self.dp(4), 0, self.dp(4), 0);
    shortxTabsScroll.addView(shortxTabsRow);

    var shortxPageBar = new android.widget.LinearLayout(context);
    shortxPageBar.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    shortxPageBar.setGravity(android.view.Gravity.CENTER_VERTICAL);
    shortxPageBar.setPadding(self.dp(8), 0, self.dp(8), self.dp(6));
    shortxPickerWrap.addView(shortxPageBar);

    function getShortXIconCategory(item) {
        var name = String((item && item.shortName) ? item.shortName : "").toLowerCase();
        if (!name) return "other";
        if (name.indexOf("arrow") >= 0 || name.indexOf("left") >= 0 || name.indexOf("right") >= 0 || name.indexOf("up") >= 0 || name.indexOf("down") >= 0) return "direction";
        if (name.indexOf("play") >= 0 || name.indexOf("pause") >= 0 || name.indexOf("music") >= 0 || name.indexOf("video") >= 0 || name.indexOf("sound") >= 0 || name.indexOf("volume") >= 0 || name.indexOf("camera") >= 0 || name.indexOf("image") >= 0) return "media";
        if (name.indexOf("home") >= 0 || name.indexOf("setting") >= 0 || name.indexOf("search") >= 0 || name.indexOf("user") >= 0 || name.indexOf("app") >= 0 || name.indexOf("menu") >= 0 || name.indexOf("notification") >= 0) return "system";
        if (name.indexOf("edit") >= 0 || name.indexOf("delete") >= 0 || name.indexOf("add") >= 0 || name.indexOf("save") >= 0 || name.indexOf("copy") >= 0 || name.indexOf("share") >= 0 || name.indexOf("download") >= 0 || name.indexOf("upload") >= 0) return "action";
        if (name.indexOf("wechat") >= 0 || name.indexOf("qq") >= 0 || name.indexOf("weibo") >= 0 || name.indexOf("douyin") >= 0 || name.indexOf("tiktok") >= 0 || name.indexOf("alipay") >= 0 || name.indexOf("github") >= 0 || name.indexOf("telegram") >= 0 || name.indexOf("youtube") >= 0 || name.indexOf("google") >= 0) return "brand";
        return "other";
    }

    var shortxTabDefs = [
        { key: "all", label: "全部" },
        { key: "system", label: "系统" },
        { key: "action", label: "操作" },
        { key: "direction", label: "方向" },
        { key: "media", label: "媒体" },
        { key: "brand", label: "品牌" },
        { key: "other", label: "其他" }
    ];

    function applyShortXTabStyles() {
        var i;
        for (i = 0; i < shortxTabDefs.length; i++) {
            var def = shortxTabDefs[i];
            var btn = shortxPickerState.tabButtons[def.key];
            if (!btn) continue;
            var active = shortxPickerState.activeTab === def.key;
            try {
                btn.setTextColor(active ? android.graphics.Color.WHITE : textColor);
                btn.setBackground(self.ui.createRoundDrawable(active ? C.primary : self.withAlpha(cardColor, 0.96), self.dp(16)));
            } catch(eTabStyle) {}
        }
    }

    function goShortXPage(delta) {
        shortxPickerState.currentPage = Math.max(0, Number(shortxPickerState.currentPage || 0) + Number(delta || 0));
        renderShortXIconGrid();
    }

    var btnPrevPage = self.ui.createFlatButton(self, "上一页", subTextColor, function() {
        self.touchActivity();
        goShortXPage(-1);
    });
    shortxPageBar.addView(btnPrevPage);
    shortxPickerState.prevBtn = btnPrevPage;

    var shortxPageInfo = new android.widget.TextView(context);
    shortxPageInfo.setTextColor(textColor);
    shortxPageInfo.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    shortxPageInfo.setGravity(android.view.Gravity.CENTER);
    shortxPageInfo.setPadding(self.dp(12), 0, self.dp(12), 0);
    shortxPageBar.addView(shortxPageInfo, new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1));
    shortxPickerState.pageInfoTv = shortxPageInfo;

    var btnNextPage = self.ui.createFlatButton(self, "下一页", C.primary, function() {
        self.touchActivity();
        goShortXPage(1);
    });
    shortxPageBar.addView(btnNextPage);
    shortxPickerState.nextBtn = btnNextPage;

    var iTab;
    for (iTab = 0; iTab < shortxTabDefs.length; iTab++) {
        (function(def) {
            var tabBtn = self.ui.createFlatButton(self, def.label, textColor, function() {
                self.touchActivity();
                shortxPickerState.activeTab = def.key;
                shortxPickerState.currentPage = 0;
                applyShortXTabStyles();
                renderShortXIconGrid();
            });
            tabBtn.setPadding(self.dp(10), self.dp(4), self.dp(10), self.dp(4));
            var lpTab = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
            lpTab.rightMargin = self.dp(6);
            shortxTabsRow.addView(tabBtn, lpTab);
            shortxPickerState.tabButtons[def.key] = tabBtn;
        })(shortxTabDefs[iTab]);
    }
    applyShortXTabStyles();

    var shortxGridScroll = new android.widget.ScrollView(context);
    try { shortxGridScroll.setVerticalScrollBarEnabled(false); } catch(eSG0) {}
    try { shortxGridScroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER); } catch(eSG1) {}
    var shortxGridScrollLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, self.dp(520));
    shortxGridScrollLp.setMargins(self.dp(8), 0, self.dp(8), self.dp(8));
    shortxPickerWrap.addView(shortxGridScroll, shortxGridScrollLp);

    var shortxGrid = new android.widget.GridLayout(context);
    try { shortxGrid.setColumnCount(4); } catch(eGC0) {}
    shortxGrid.setPadding(self.dp(4), self.dp(4), self.dp(4), self.dp(4));
    shortxGridScroll.addView(shortxGrid);
    shortxPickerState.grid = shortxGrid;

    function updateShortXIconPreview() {
        try {
            var rawName = String(inputShortXIcon.getValue() || "");
            var normalizedShort = self.normalizeShortXIconName(rawName, false);
            var tintHex = String(inputShortXIconTint.getValue() || "");
            if (shortxPickerState.previewNameTv) {
                shortxPickerState.previewNameTv.setText(normalizedShort ? ("已选: " + normalizedShort) : "未选择图标");
            }
            if (shortxPickerState.previewIv) {
                var drPreview = normalizedShort ? self.resolveShortXDrawable(normalizedShort, tintHex) : null;
                if (drPreview) {
                    shortxPickerState.previewIv.setImageDrawable(drPreview);
                    try { shortxPickerState.previewIv.setAlpha(1.0); } catch(eA1) {}
                } else {
                    shortxPickerState.previewIv.setImageDrawable(null);
                    try { shortxPickerState.previewIv.setAlpha(0.35); } catch(eA2) {}
                }
            }
        } catch(ePreview) {}
    }

    function renderShortXIconGrid() {
        try {
            if (!shortxPickerState.grid) return;
            shortxPickerState.grid.removeAllViews();
            try { shortxPickerState.grid.setColumnCount(4); } catch(eColSet) {}
            var icons = self.getShortXIconCatalog();
            shortxPickerState.iconList = icons;
            var query = "";
            try { query = String(shortxPickerState.searchEt.getText() || "").replace(/^\s+|\s+$/g, "").toLowerCase(); } catch(eQ0) {}
            shortxPickerState.lastQuery = query;
            var filtered = [];
            var totalMatch = 0;
            var i;
            for (i = 0; i < icons.length; i++) {
                var item = icons[i];
                var tabOk = (shortxPickerState.activeTab === "all") || (getShortXIconCategory(item) === shortxPickerState.activeTab);
                if (!tabOk) continue;
                var n1 = String(item.shortName || "").toLowerCase();
                var n2 = String(item.name || "").toLowerCase();
                if (!query || n1.indexOf(query) >= 0 || n2.indexOf(query) >= 0) {
                    totalMatch++;
                    filtered.push(item);
                }
            }
            var pageSize = Number(shortxPickerState.pageSize || 20);
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
                    shortxPickerState.statusTv.setText("分类[" + shortxPickerState.activeTab + "] 共 " + filtered.length + " 个，当前第 " + (shortxPickerState.currentPage + 1) + "/" + totalPages + " 页。");
                } else {
                    shortxPickerState.statusTv.setText("分类[" + shortxPickerState.activeTab + "] 搜索 [" + query + "] 命中 " + totalMatch + " 个，当前第 " + (shortxPickerState.currentPage + 1) + "/" + totalPages + " 页。");
                }
            }
            if (shortxPickerState.pageInfoTv) {
                shortxPickerState.pageInfoTv.setText((filtered.length > 0 ? (shortxPickerState.currentPage + 1) : 0) + " / " + totalPages + " · " + filtered.length + "项");
            }
            try { shortxPickerState.prevBtn.setEnabled(shortxPickerState.currentPage > 0); } catch(ePrev) {}
            try { shortxPickerState.nextBtn.setEnabled(shortxPickerState.currentPage < totalPages - 1); } catch(eNext) {}
            applyShortXTabStyles();
            var tintHex = String(inputShortXIconTint.getValue() || "");
            var selectedShort = self.normalizeShortXIconName(inputShortXIcon.getValue(), false);
            for (i = 0; i < result.length; i++) {
                (function(entry) {
                    var cell = new android.widget.LinearLayout(context);
                    cell.setOrientation(android.widget.LinearLayout.VERTICAL);
                    cell.setGravity(android.view.Gravity.CENTER_HORIZONTAL);
                    cell.setPadding(self.dp(8), self.dp(8), self.dp(8), self.dp(8));
                    var lp = new android.widget.GridLayout.LayoutParams();
                    lp.width = self.dp(76);
                    lp.height = self.dp(92);
                    lp.setMargins(self.dp(4), self.dp(4), self.dp(4), self.dp(4));
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
                    } catch(eIconDraw) {}
                    cell.addView(iv);

                    var tv = new android.widget.TextView(context);
                    tv.setText(String(entry.shortName));
                    tv.setTextColor(isSelected ? C.primary : textColor);
                    tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 10);
                    tv.setGravity(android.view.Gravity.CENTER);
                    try { tv.setLines(2); tv.setEllipsize(android.text.TextUtils.TruncateAt.END); } catch(eLines0) {}
                    cell.addView(tv, new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT));

                    cell.setClickable(true);
                    cell.setOnClickListener(new android.view.View.OnClickListener({
                        onClick: function() {
                            self.touchActivity();
                            try { inputShortXIcon.input.setText(String(entry.shortName)); } catch(eSetI) {}
                            updateShortXIconPreview();
                            shortxPickerState.expanded = false;
                            if (shortxPickerState.pickerWrap) shortxPickerState.pickerWrap.setVisibility(android.view.View.GONE);
                            try { if (shortxPickerState.toggleBtn) shortxPickerState.toggleBtn.setText("图标库"); } catch(eSetT) {}
                        }
                    }));
                    shortxPickerState.grid.addView(cell);
                })(result[i]);
            }
        } catch(eRenderIcons) {
            try { if (shortxPickerState.statusTv) shortxPickerState.statusTv.setText("图标库加载失败: " + eRenderIcons); } catch(eStatus0) {}
        }
    }

    try {
        shortxSearchEt.addTextChangedListener(new JavaAdapter(android.text.TextWatcher, {
            afterTextChanged: function(s) {
                shortxPickerState.currentPage = 0;
                renderShortXIconGrid();
            },
            beforeTextChanged: function(s, st, c, a) {},
            onTextChanged: function(s, st, b, c) {}
        }));
    } catch(eTwIcon0) {}

    try {
        inputShortXIcon.input.addTextChangedListener(new JavaAdapter(android.text.TextWatcher, {
            afterTextChanged: function(s) { updateShortXIconPreview(); },
            beforeTextChanged: function(s, st, c, a) {},
            onTextChanged: function(s, st, b, c) {}
        }));
    } catch(eTwIcon1) {}

    // # ShortX 图标颜色（默认跟随主题）
    var defaultTint = targetBtn.iconTint || "";
    if (!defaultTint) {
        // 默认使用主题强调色
        try {
            var themeColor = self.getMonetAccentForBall();
            defaultTint = _th_hex(themeColor).replace("0x", "#");
        } catch(e) { defaultTint = ""; }
    }
    var inputShortXIconTint = self.ui.createInputGroup(self, "图标颜色 (留空跟随主题)", defaultTint, false, "例如: #FF3A86FF（十六进制 ARGB）");
    form.addView(inputShortXIconTint.view);

    try {
        inputShortXIconTint.input.addTextChangedListener(new JavaAdapter(android.text.TextWatcher, {
            afterTextChanged: function(s) {
                updateShortXIconPreview();
                if (shortxPickerState.expanded) renderShortXIconGrid();
            },
            beforeTextChanged: function(s, st, c, a) {},
            onTextChanged: function(s, st, b, c) {}
        }));
    } catch(eTwIcon2) {}

    // 图标类型切换函数
    function updateIconInputs(type) {
        if (type === "file") {
            inputIconPath.view.setVisibility(android.view.View.VISIBLE);
            inputShortXIcon.view.setVisibility(android.view.View.GONE);
            shortxQuickRow.setVisibility(android.view.View.GONE);
            shortxPickerWrap.setVisibility(android.view.View.GONE);
            inputShortXIconTint.view.setVisibility(android.view.View.GONE);
            shortxPickerState.expanded = false;
            try { if (shortxPickerState.toggleBtn) shortxPickerState.toggleBtn.setText("图标库"); } catch(eBt0) {}
            // 清空另一种方式的值
            inputShortXIcon.input.setText("");
            inputShortXIconTint.input.setText("");
        } else if (type === "shortx") {
            inputIconPath.view.setVisibility(android.view.View.GONE);
            inputShortXIcon.view.setVisibility(android.view.View.VISIBLE);
            shortxQuickRow.setVisibility(android.view.View.VISIBLE);
            inputShortXIconTint.view.setVisibility(android.view.View.VISIBLE);
            shortxPickerState.expanded = true;
            shortxPickerWrap.setVisibility(android.view.View.VISIBLE);
            try { if (shortxPickerState.toggleBtn) shortxPickerState.toggleBtn.setText("收起"); } catch(eBt1) {}
            // 清空另一种方式的值
            inputIconPath.input.setText("");
            // # ShortX 图标颜色默认跟随主题
            try {
                if (!String(inputShortXIconTint.getValue() || "")) {
                    var themeColor = self.getMonetAccentForBall();
                    var hexColor = _th_hex(themeColor).replace("0x", "#");
                    inputShortXIconTint.input.setText(hexColor);
                }
            } catch(e) {}
            updateShortXIconPreview();
            renderShortXIconGrid();
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


    // 2. 动作类型（自动换行：用 GridLayout 稳定实现）
    // 这段代码的主要内容/用途：把「Shell/App/广播/Intent/快捷方式」做成会自动换行的单选框区域。
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
    } catch (eLpTW) {}

    var typeLbl = new android.widget.TextView(context);
    typeLbl.setText("动作类型 (Action Type)");
    typeLbl.setTextColor(subTextColor);
    typeLbl.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
    typeWrap.addView(typeLbl);

    // Grid 容器
    var typeGrid = new android.widget.GridLayout(context);
    try {
        typeGrid.setOrientation(android.widget.GridLayout.HORIZONTAL);
    } catch (eOri) {}
    try {
        var _lpTG = new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        );
        typeGrid.setLayoutParams(_lpTG);
    } catch (eLpTG) {}
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
        { id: 4, val: "shortcut", txt: "快捷方式" }
    ];

    // 初始化选中值
    try {
        for (var ti0 = 0; ti0 < types.length; ti0++) {
            if (targetBtn.type === types[ti0].val) {
                selectedTypeVal = types[ti0].val;
                break;
            }
        }
    } catch (eSel0) {}

    function applySelectedType(val) {
        // 这段代码的主要内容/用途：更新选中值并刷新动态输入区可见性。
        try {
            if (!val) val = "shell";
            selectedTypeVal = String(val);
            updateVisibility(selectedTypeVal);
        } catch (e) {}
    }

    // 创建 RadioButton（只创建一次）
    for (var i = 0; i < types.length; i++) {
        var rb = new android.widget.RadioButton(context);
        rb.setText(types[i].txt);
        rb.setTextColor(textColor);
        rb.setTag(types[i].val);
        try { rb.setChecked(types[i].val === selectedTypeVal); } catch (eC0) {}
        try { rb.setSingleLine(true); } catch (eSL) {}
        try { rb.setEllipsize(android.text.TextUtils.TruncateAt.END); } catch (eEl) {}
        try { rb.setMinWidth(0); } catch (eMW) {}
        try { rb.setMinHeight(self.dp(40)); } catch (eMH) {}
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
                                try { other.setChecked(false); } catch (eOff) {}
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
        try { typeGrid.removeAllViews(); } catch (e0) {}

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
        try { typeGrid.setColumnCount(cols); } catch (eC) {}

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
            } catch (eLP) {}

            try { typeGrid.addView(rb); } catch (eAdd) {}
        }
    }

    // 首次：先渲染一次（保证立即可见）
    try { rebuildTypeGrid(); } catch (eR0) {}

    // 布局变化时：重新计算列数（旋转/宽度变化/首次测量完成）
    try {
        typeWrap.addOnLayoutChangeListener(new android.view.View.OnLayoutChangeListener({
            onLayoutChange: function (v, l, t, r, b, ol, ot, orr, ob) {
                try {
                    if ((r - l) !== (orr - ol)) {
                        rebuildTypeGrid();
                    }
                } catch (eL) {}
            }
        }));
    } catch (eLC) {}
    form.addView(typeWrap);

    // 3. 动态输入区
    var dynamicContainer = new android.widget.LinearLayout(context);
    dynamicContainer.setOrientation(android.widget.LinearLayout.VERTICAL);
    form.addView(dynamicContainer);

    // --- Shell ---
    var shellWrap = new android.widget.LinearLayout(context);
    shellWrap.setOrientation(android.widget.LinearLayout.VERTICAL);
    var initCmd = targetBtn.cmd || "";
    if (targetBtn.cmd_b64) initCmd = decodeBase64Utf8(targetBtn.cmd_b64) || initCmd;
    var inputShell = self.ui.createInputGroup(self, "Shell 命令", initCmd, true, "支持常规 Shell 命令 (input, am, pm...)");
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
    try { inputScPkg.view.setVisibility(android.view.View.GONE); } catch(eHidePkg) {}
    try { inputScId.view.setVisibility(android.view.View.GONE); } catch(eHideId) {}

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
    try { inputScCmd.view.setVisibility(android.view.View.GONE); } catch(eHideScCmd) {}
    try {
        // # 命令框可编辑：允许你在配置时手动指定/微调启动命令（例如锁定分身/主微信）
        // # 注意：选择快捷方式后仍会自动刷新该字段；如需保留手动内容，可在选择后再修改。
        inputScCmd.input.setEnabled(true);
        inputScCmd.input.setFocusable(true);
        inputScCmd.input.setFocusableInTouchMode(true);
        try { inputScCmd.input.setSingleLine(false); } catch(eSL) {}
        try { inputScCmd.input.setMinLines(2); } catch(eML) {}
        try { inputScCmd.input.setHorizontallyScrolling(false); } catch(eHS) {}
        try { inputScCmd.input.setTextIsSelectable(true); } catch(eSel) {}
    } catch(eRO) {}

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
            } catch (eLuSc) {}

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
        } catch(eUpJs) {}
    }

    var inputScJsCode = self.ui.createInputGroup(self, "快捷方式 JS 启动代码 (startActivityAsUser)", (targetBtn.shortcutJsCode ? String(targetBtn.shortcutJsCode) : ""), false, "选择快捷方式后自动生成；你也可以手动改 userId 或其他参数");
    shortcutWrap.addView(inputScJsCode.view);

    try {
        // # JS 编辑框尺寸：与 Shell 命令框一致，避免过高占屏（用户可滚动查看完整内容）
        inputScJsCode.input.setEnabled(true);
        inputScJsCode.input.setFocusable(true);
        inputScJsCode.input.setFocusableInTouchMode(true);
        try { inputScJsCode.input.setSingleLine(false); } catch(eJsSL) {}
        try { inputScJsCode.input.setMinLines(2); } catch(eJsML) {}
        try { inputScJsCode.input.setMaxLines(4); } catch(eJsMXL) {}
        try { inputScJsCode.input.setHorizontallyScrolling(false); } catch(eJsHS) {}
        try { inputScJsCode.input.setTextIsSelectable(true); } catch(eJsSel) {}
    } catch(eJsBox) {}

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

// # 图标缓存与队列（避免每次重渲染都重复取 icon，减少卡顿）
// 这段代码的主要内容/用途：为内联列表提供轻量级 icon 缓存与串行加载队列，避免一次性开太多线程。
var scIconCache = {};
var scIconQueue = [];
var scIconWorkerRunning = false;
function __scIconKey(it) {
    try { return __scStr(it.pkg) + '|' + __scStr(it.shortcutId) + '|' + __scStr(it.userId); } catch(e) { return ''; }
}
function __scLoadIconForItem(it) {
    // 这段代码的主要内容/用途：优先取快捷方式图标，失败则回退到应用图标。
    try {
        if (!it) return null;
        if (it.shortcutInfo) {
            try {
                var la = context.getSystemService(android.content.Context.LAUNCHER_APPS_SERVICE);
                if (la) {
                    var dr = la.getShortcutIconDrawable(it.shortcutInfo, 0);
                    if (dr) return dr;
                }
            } catch(eS0) {}
        }
        try {
            var pm = context.getPackageManager();
            return pm.getApplicationIcon(__scStr(it.pkg));
        } catch(eA0) {}
    } catch(eAll0) {}
    return null;
}
function __scEnqueueIconLoad(it, iv) {
    try {
        var key = __scIconKey(it);
        if (!key) return;
        if (scIconCache[key]) {
            try { iv.setImageDrawable(scIconCache[key]); } catch(eSet0) {}
            return;
        }
        // # 记录 tag：防止滚动/重绘后错位
        try { iv.setTag(key); } catch(eTag0) {}
        scIconQueue.push({ key: key, it: it, iv: iv });
        if (!scIconWorkerRunning) {
            scIconWorkerRunning = true;
            new java.lang.Thread(new java.lang.Runnable({
                run: function() {
                    while (true) {
                        var job = null;
                        try { if (scIconQueue.length > 0) job = scIconQueue.shift(); } catch(eQ0) { job = null; }
                        if (!job) break;

                        var dr = null;
                        try { dr = __scLoadIconForItem(job.it); } catch(eLd0) { dr = null; }
                        if (dr) scIconCache[job.key] = dr;

                        try {
                            self.runOnUiThreadSafe(function() {
                                try {
                                    if (!job || !job.iv) return;
                                    var cur = null;
                                    try { cur = job.iv.getTag(); } catch(eTg0) { cur = null; }
                                    if (cur && String(cur) === String(job.key) && dr) {
                                        job.iv.setImageDrawable(dr);
                                    }
                                } catch(eUi0) {}
                            });
                        } catch(ePost0) {}
                    }
                    scIconWorkerRunning = false;
                }
            })).start();
        }
    } catch(eEnq0) {}
}

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
            // 清空 icon 缓存，避免旧图标占用内存且影响新列表显示
            try { scIconCache = {}; } catch(eC0) {}
            try { scIconQueue = []; } catch(eC1) {}
            try { scIconWorkerRunning = false; } catch(eC2) {}
            // 若当前已展开，立即触发重新加载与渲染
            if (scInlineState.expanded) __scEnsureLoadedAndRender();
        } catch(eR) {}
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
} catch(eH0) {}
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
} catch(eBg0) {}

// # ListView：真正的列表控件（支持框内纵向滚动）
var scList = new android.widget.ListView(context);
try { scList.setDivider(null); } catch(eDiv0) {}
try { scList.setVerticalScrollBarEnabled(true); } catch(eSb0) {}
try { scList.setOverScrollMode(android.view.View.OVER_SCROLL_IF_CONTENT_SCROLLS); } catch(eOver0) {}
try { scList.setCacheColorHint(android.graphics.Color.TRANSPARENT); } catch(eCch0) {}
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
                            try { p.requestDisallowInterceptTouchEvent(true); } catch(eReq) {}
                            try { p = p.getParent(); } catch(eUp) { p = null; }
                        }
                    } catch(ePar0) {}
                }
            } catch(eTouch0) {}
            // # 返回 false：让 ListView 自己处理滚动
            return false;
        }
    }));
} catch(eT0) {}

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
    } catch(eS) {}

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

    try { self.__scIconLoaderSingleton = obj; } catch(eSet) {}
    return obj;
})();

function __scPostIconLoad(fn) {
    try {
        if (__scIconLoader && __scIconLoader.h) {
            __scIconLoader.h.post(new java.lang.Runnable({ run: function() { try { fn(); } catch(e) {} } }));
            return true;
        }
    } catch(eP) {}
    return false;
}

function __scRequestIcon(it, imageView) {
    try {
        if (!it || !imageView) return;
        var key = String(it.pkg) + "|" + String(it.shortcutId);

        // 绑定 tag：后续回调时校验，避免复用行导致串图
        try { imageView.setTag(key); } catch(eTag0) {}

        // 命中缓存：直接显示
        var hit = __scGetIcon(key);
        if (hit) {
            try { imageView.setImageDrawable(hit); } catch(eSet0) {}
            return;
        }

        // 立即回退：先用 app icon（更快）
        try {
            if (__scPm) {
                var appDr = __scPm.getApplicationIcon(String(it.pkg));
                if (appDr) {
                    try { imageView.setImageDrawable(appDr); } catch(eSet1) {}
                }
            }
        } catch(eApp0) {}

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

            try { delete __scIconInFlight[key]; } catch(eDel0) {}

            try {
                // 回到 UI：只更新 tag 仍然匹配的行
                scList.post(new java.lang.Runnable({ run: function() {
                    try {
                        if (!dr) return;
                        var tag = null;
                        try { tag = imageView.getTag(); } catch(eTg) { tag = null; }
                        if (String(tag) === String(key)) {
                            try { imageView.setImageDrawable(dr); } catch(eSet2) {}
                        }
                    } catch(eUi0) {}
                }}));
            } catch(eUi1) {}
        });
    } catch(eR) {}
}
function __scPutIcon(k, d) {
    try {
        if (!k) return;
        if (__scIconCache[k]) return;
        __scIconCache[k] = d;
        __scIconKeys.push(k);
        if (__scIconKeys.length > __scIconMax) {
            var old = __scIconKeys.shift();
            try { delete __scIconCache[old]; } catch(eDel) {}
        }
    } catch(ePut) {}
}
function __scGetIcon(k) {
    try { return __scIconCache[k] || null; } catch(eGet) { return null; }
}

// # ListView 适配器数据
var __scData = [];
var __scLauncherApps = null;
var __scPm = null;
try { __scLauncherApps = context.getSystemService(android.content.Context.LAUNCHER_APPS_SERVICE); } catch(eLa0) {}
try { __scPm = context.getPackageManager(); } catch(ePm0) {}

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
            try { delete __scAppLabelCache[old]; } catch(eDel) {}
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
                } catch(eBg1) {}

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
        } catch(eRow0) {}

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
try { __scRequestIcon(it, holder.iv); } catch(eIconReq) {}
            }
        } catch(eBind) {}

        return row;
    }
});
try { scList.setAdapter(__scAdapter); } catch(eAd0) {}

try {
    scList.setOnItemClickListener(new android.widget.AdapterView.OnItemClickListener({
        onItemClick: function(parent, view, position, id) {
            try {
                var obj = __scData[position];
                if (!obj) return;

                try { inputScPkg.input.setText(String(obj.pkg)); } catch(eSet1) {}
                try { inputScId.input.setText(String(obj.shortcutId)); } catch(eSet2) {}
                // # 回填：用于"Shell am start"启动的 intentUri + userId（桌面移除后仍可启动）
                try { scSelectedIntentUri = obj.intentUri ? String(obj.intentUri) : ""; } catch(eSetIU) { scSelectedIntentUri = ""; }
                try { scSelectedUserId = (obj.userId != null) ? parseInt(String(obj.userId), 10) : 0; } catch(eSetUID) { scSelectedUserId = 0; }

                // # 同步刷新：启动命令展示框
                try { if (inputScCmd && inputScCmd.input) inputScCmd.input.setText(String(__scBuildLaunchCmd())); } catch(eUpCmd) {}

                // # 同步刷新：JS 启动代码（选择快捷方式后自动生成并回填）
                __scUpdateJsCodeSafe();

                // # 回填：同时把快捷方式 icon 导出到 shortcut_icons，并把图标路径写入"图标地址"编辑框
                // 这段代码的主要内容/用途：确保微信小程序等快捷方式在从桌面移除后，按钮页/按钮管理页仍能显示对应图标。
                try {
                    var __scIconPath = __scEnsureShortcutIconFile(obj);
                    if (__scIconPath) {
                        try { inputIconPath.input.setText(String(__scIconPath)); } catch(eSetIP) {}
                    }
                } catch(eExp0) {}

                // 可选：标题为空时自动填 label
                try {
                    var curTitle = String(inputTitle.getValue() || "");
                    if ((!curTitle || curTitle.trim().length === 0) && obj.label) {
                        inputTitle.input.setText(String(obj.label));
                    }
                } catch(eSet3) {}

                try { self.state.pendingDirty = true; } catch(eDirty) {}

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
                } catch(eFold) {}
            } catch(eCb) {
                try { self.toast("回填失败: " + eCb); } catch(eT) {}
            }
        }
    }));
} catch(eClk0) {}

// # 工具函数：安全字符串
function __scStr(v) { try { return String(v == null ? "" : v); } catch(e) { return ""; } }
function __scLower(v) { try { return __scStr(v).toLowerCase(); } catch(e) { return ""; } }

// # 工具函数：导出快捷方式图标到 shortcut_icons 并返回路径
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
        } catch(eMk) {}

        // # 与主程序同名规则：pkg__sid__u{uid}.png
        var fn = __scSanitizeFileName(pkg) + "__" + __scSanitizeFileName(sid) + "__u" + __scSanitizeFileName(uid) + ".png";
        var outPath = dir + "/" + fn;

        // # 已存在则直接复用
        try {
            var f = new java.io.File(outPath);
            if (f.exists() && f.isFile() && f.length() > 0) return outPath;
        } catch(eEx) {}

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
            try { fos.flush(); } catch(eFl) {}
            try { fos.close(); } catch(eCl) {}
            fos = null;
        } catch(eW) {
            try { if (fos) fos.close(); } catch(eCl2) {}
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
        } catch(eBD) {}

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
            } catch(eGSD) {}

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
        } catch(eU0) {}
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
                } catch(eGSD3) {}

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
            } catch(eP0) {}

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
                                } catch(eS3) {}
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
                try { q.setPackage(pkgName); } catch(eQ0) {}
                // # QueryFlags：尽量全拿（逐个 try，避免 ROM 缺字段）
                try {
                    var qFlags = 0;
                    try { qFlags = qFlags | ShortcutQuery.FLAG_MATCH_DYNAMIC; } catch(eF1) {}
                    try { qFlags = qFlags | ShortcutQuery.FLAG_MATCH_PINNED; } catch(eF2) {}
                    try { qFlags = qFlags | ShortcutQuery.FLAG_MATCH_MANIFEST; } catch(eF3) {}
                    try { qFlags = qFlags | ShortcutQuery.FLAG_MATCH_CACHED; } catch(eF4) {}
                    try { q.setQueryFlags(qFlags); } catch(eF5) {}
                } catch(eF0) {}

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
    } catch(eAll) {}
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
        } catch(eSame0) {}
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
                } catch(eM) {}
                if (hit) out.push(it);
                // # 性能保护：搜索时最多显示 300 条，避免 system_server 过载
                if (out.length >= 300) break;
            }
        }

        // 更新适配器数据
        __scData = out;
        try { __scAdapter.notifyDataSetChanged(); } catch(eN0) {}

        // # 修复：确保首次展开时 ListView 立即刷新布局，不依赖用户触摸触发重绘
        try { scInlineState.__scHasRendered = true; } catch(eHr1) {}
        try {
            scList.post(new java.lang.Runnable({
                run: function() {
                    try { scList.invalidateViews(); } catch(eInv0) {}
                    try { scList.requestLayout(); } catch(eReq0) {}
                }
            }));
        } catch(ePostInv0) {
            try { scList.invalidateViews(); } catch(eInv1) {}
        }

        // 提示信息
        try {
            if (out.length === 0) scHint.setText("无匹配结果（共 " + src.length + " 条）");
            else scHint.setText("共 " + src.length + " 条，显示 " + out.length + " 条（在框内滑动）");
        } catch(eH1) {}
    } catch(e0) {
        try { scHint.setText("渲染失败: " + e0); } catch(e1) {}
    }
}

function __scRenderList(query) {
    // # 这段代码的主要内容/用途：渲染去抖入口（合并 50ms 内的多次刷新请求）
    try { scInlineState.__scPendingQuery = query; } catch(ePQ0) {}

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
    } catch(eRm0) {}

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
    try { scHint.setText("正在加载快捷方式列表..."); } catch(eH0) {}

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
                } catch(eUi2) {}

                // # 关键修复：首次展开时也要触发渲染，否则会一直停留在"正在加载..."
                try {
                    // 优先用 ListView.post：保证在拥有 Looper 的 UI 线程执行
                    scList.post(new java.lang.Runnable({
                        run: function() {
                            try { __scRenderListNow(scSearchWrap.getValue()); } catch(eR0) {}
                        }
                    }));
                } catch(ePost0) {
                    // 再兜底：直接调用（若当前线程本就有 Looper 也能工作）
                    try { __scRenderList(scSearchWrap.getValue()); } catch(eR1) {}
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
                            try { scList.requestLayout(); } catch(eRq0) {}
                            try { scList.invalidateViews(); } catch(eIv0) {}
                        }
                    }));
                } catch(ePostRq0) {}
                scArrowTv.setText("▲");
                __scEnsureLoadedAndRender();
            } else {
                scBody.setVisibility(android.view.View.GONE);
                scArrowTv.setText("▼");
            }
        } catch(eTg) {}
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
                } catch(eRm) {}

                scInlineState.__scSearchRunnable = new java.lang.Runnable({
                    run: function() {
                        try {
                            // # 再次确认当前查询未变化（防抖期间用户继续输入）
                            __scRenderList(q);
                        } catch(eRun) {}
                    }
                });

                // # 180ms 防抖：既跟手又不抖 CPU
                try { scList.postDelayed(scInlineState.__scSearchRunnable, 180); } catch(ePost) { __scRenderList(q); }
            } catch(eW) {}
        }
    }));
} catch(eTw) {}

// # 组装到 shortcutWrap
shortcutWrap.addView(scHeader);
shortcutWrap.addView(scBody);

    dynamicContainer.addView(shortcutWrap);

// 联动逻辑
    function updateVisibility(typeVal) {
        shellWrap.setVisibility(typeVal === "shell" ? android.view.View.VISIBLE : android.view.View.GONE);
        appWrap.setVisibility(typeVal === "app" ? android.view.View.VISIBLE : android.view.View.GONE);
        bcWrap.setVisibility(typeVal === "broadcast" ? android.view.View.VISIBLE : android.view.View.GONE);
        shortcutWrap.setVisibility(typeVal === "shortcut" ? android.view.View.VISIBLE : android.view.View.GONE);
    }

    // 动作类型初始刷新：首次进入编辑页时立刻根据默认选中项显示对应输入区
    applySelectedType(selectedTypeVal);

    scroll.addView(form);
    var scrollLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 0);
    scrollLp.weight = 1;
    scroll.setLayoutParams(scrollLp);
    panel.addView(scroll);

    // 底部
    var bottomBar = new android.widget.LinearLayout(context);
    bottomBar.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    bottomBar.setGravity(android.view.Gravity.END | android.view.Gravity.CENTER_VERTICAL);
    bottomBar.setPadding(0, self.dp(12), 0, 0);

    var btnCancel = self.ui.createFlatButton(self, "取消", subTextColor, function() {
        self.state.editingButtonIndex = null;
        refreshPanel();
    });
    bottomBar.addView(btnCancel);

    var space = new android.view.View(context);
    space.setLayoutParams(new android.widget.LinearLayout.LayoutParams(self.dp(12), 1));
    bottomBar.addView(space);

    var btnSave = self.ui.createSolidButton(self, "暂存修改", C.primary, android.graphics.Color.WHITE, function() {
        try {
            var newBtn = targetBtn;
            newBtn.title = inputTitle.getValue();

            // # 根据选中的图标类型保存对应的值（二选一）
            var iconTypeSelected = rbIconShortX.isChecked() ? "shortx" : "file";
            if (iconTypeSelected === "file") {
                var ip = inputIconPath.getValue();
                if (ip) newBtn.iconPath = ip; else delete newBtn.iconPath;
                delete newBtn.iconResName; // 清除 ShortX 图标
            } else {
                var sxIcon = self.normalizeShortXIconName(inputShortXIcon.getValue(), false);
                if (sxIcon) newBtn.iconResName = sxIcon; else delete newBtn.iconResName;
                // 保存 ShortX 图标颜色
                var sxTint = inputShortXIconTint.getValue();
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
            delete newBtn.launchUserId;

            var isValid = true;

            if (newBtn.type === "shell") {
                var c = inputShell.getValue();
                if (!c) { inputShell.setError("请输入命令"); isValid=false; }
                else { inputShell.setError(null); newBtn.cmd = c; newBtn.cmd_b64 = encodeBase64Utf8(c); newBtn.root = true; }
            } else if (newBtn.type === "app") {
                var p = inputPkg.getValue();
                if (!p) { inputPkg.setError("请输入包名"); isValid=false; }
                else { inputPkg.setError(null); newBtn.pkg = p; }// # 保存：启动用户ID（可选）
try {
    var au = inputAppLaunchUser.getValue();
    au = (au != null) ? String(au).trim() : "";
    if (au && au.length > 0) {
        var aui = parseInt(au, 10);
        if (!isNaN(aui)) newBtn.launchUserId = aui;
    }
} catch(eAU) {}

            } else if (newBtn.type === "broadcast") {
                var a = inputAction.getValue();
                if (!a) { inputAction.setError("请输入 Action"); isValid=false; }
                else { inputAction.setError(null); newBtn.action = a; }

                var ex = inputExtras.getValue();
                if (ex) {
                    try { newBtn.extras = JSON.parse(ex); inputExtras.setError(null); }
                    catch(e) { inputExtras.setError("JSON 格式错误"); isValid=false; }
                }
            } else if (newBtn.type === "shortcut") {
                var sp = inputScPkg.getValue();
                var sid = inputScId.getValue();
                if (!sp) { inputScPkg.setError("请输入包名"); isValid=false; }
                else { inputScPkg.setError(null); newBtn.pkg = sp; }
                if (!sid) { inputScId.setError("请输入 shortcutId"); isValid=false; }
                else { inputScId.setError(null); newBtn.shortcutId = sid; }
                // # 保存：同时保存 intentUri/userId，供 JavaScript(startActivityAsUser) 脚本使用（锁定主/分身）
                try { if (scSelectedIntentUri && scSelectedIntentUri.length > 0) newBtn.intentUri = String(scSelectedIntentUri); } catch(eSIU2) {}
                try { newBtn.userId = scSelectedUserId; } catch(eSUID2) { newBtn.userId = 0; }
                // # 保存：快捷方式 JS 启动代码（自动生成/可手动编辑）
                try { if (inputScJsCode) newBtn.shortcutJsCode = String(inputScJsCode.getValue()); } catch(eSaveJs) {}
            }
                // # 保存：快捷方式仅使用 JavaScript 执行（取消 Shell/兜底）
                newBtn.shortcutRunMode = "js";
   if (!isValid) return;



            if (editIdx === -1) {
                buttons.push(newBtn);
            } else {
                buttons[editIdx] = newBtn;
            }

            self.state.editingButtonIndex = null;
            refreshPanel();
            self.toast("已暂存，请在列表页点击保存");
        } catch (e) {
            self.toast("暂存失败: " + e);
        }
    });
    bottomBar.addView(btnSave);

    panel.addView(bottomBar);
  }

  return panel;
};






// =======================【Schema 编辑面板】======================
FloatBallAppWM.prototype.buildSchemaEditorPanelView = function() {
  var self = this;
  if (this.state.editingSchemaIndex === undefined) {
    this.state.editingSchemaIndex = null;
  }

  if (!this.state.keepSchemaEditorState || !this.state.tempSchema) {
      var current = ConfigManager.loadSchema();
      this.state.tempSchema = JSON.parse(JSON.stringify(current));
  }
  this.state.keepSchemaEditorState = false;

  var schema = this.state.tempSchema;
  var isEditing = (this.state.editingSchemaIndex !== null);
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;

  var bgColor = isDark ? C.bgDark : C.bgLight;
  var cardColor = isDark ? C.cardDark : C.cardLight;
  var textColor = isDark ? C.textPriDark : C.textPriLight;
  var subTextColor = isDark ? C.textSecDark : C.textSecLight;
  var dividerColor = isDark ? C.dividerDark : C.dividerLight;
  var inputBgColor = isDark ? C.inputBgDark : C.inputBgLight;

  var panel = this.ui.createStyledPanel(this, 16);

  // --- Header ---
  var header = this.ui.createStyledHeader(this, 12);

  // Title removed to avoid redundancy with Wrapper Title
  // var titleTv = new android.widget.TextView(context);
  // titleTv.setText(isEditing ? (this.state.editingSchemaIndex === -1 ? "新增项" : "编辑项") : "设置布局管理");
  // ...
  // header.addView(titleTv);

  // Placeholder to push buttons to right
  header.addView(this.ui.createSpacer(this));

  function refreshPanel() {
    self.state.keepSchemaEditorState = true;
    self.showPanelAvoidBall("schema_editor");
  }

  if (!isEditing) {
    // List Mode
    header.addView(self.ui.createFlatButton(self, "重置", C.danger, function() {
        ConfigManager.resetSchema();
        self.state.tempSchema = null;
        self.toast("已重置为默认布局");
        refreshPanel();
    }));

    header.addView(self.ui.createFlatButton(self, "新增", C.primary, function() {
        self.state.editingSchemaIndex = -1;
        refreshPanel();
    }));

    var btnClose = self.ui.createFlatButton(self, "✕", C.textSecLight, function() {
        self.state.tempSchema = null;
        self.hideAllPanels();
    });
    header.addView(btnClose);
    panel.addView(header);
    panel.setTag(header); // 暴露 Header

    // Save Button
    var btnSaveAll = self.ui.createSolidButton(self, "保存生效", C.primary, android.graphics.Color.WHITE, function() {
         ConfigManager.saveSchema(schema);
         self.state.tempSchema = null;
         self.toast("布局已保存");
         self.hideAllPanels();
         self.showPanelAvoidBall("settings");
    });
    var saveLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    saveLp.setMargins(0, 0, 0, self.dp(8));
    btnSaveAll.setLayoutParams(saveLp);
    panel.addView(btnSaveAll);

    // List
    var scroll = new android.widget.ScrollView(context);
    try { scroll.setVerticalScrollBarEnabled(false); } catch(e){}
    var list = new android.widget.LinearLayout(context);
    list.setOrientation(android.widget.LinearLayout.VERTICAL);
    list.setPadding(0, self.dp(4), 0, self.dp(4));

    for (var i = 0; i < schema.length; i++) {
      (function(idx) {
        var item = schema[idx];

        var card = new android.widget.LinearLayout(context);
        card.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        card.setGravity(android.view.Gravity.CENTER_VERTICAL);
        card.setBackground(self.ui.createRoundDrawable(cardColor, self.dp(8)));
        try { card.setElevation(self.dp(2)); } catch(e){}

        var cardLp = new android.widget.LinearLayout.LayoutParams(android.widget.LinearLayout.LayoutParams.MATCH_PARENT, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        cardLp.setMargins(self.dp(2), self.dp(4), self.dp(2), self.dp(4));
        card.setLayoutParams(cardLp);
        card.setPadding(self.dp(12), self.dp(12), self.dp(8), self.dp(12));

        // Info
        var infoBox = new android.widget.LinearLayout(context);
        infoBox.setOrientation(android.widget.LinearLayout.VERTICAL);
        var infoLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        infoLp.weight = 1;
        infoBox.setLayoutParams(infoLp);

        var nameTv = new android.widget.TextView(context);
        nameTv.setText(String(item.name || item.key || "未命名"));
        nameTv.setTextColor(textColor);
        nameTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
        if (item.type === "section") nameTv.setTypeface(null, android.graphics.Typeface.BOLD);
        infoBox.addView(nameTv);

        var typeTv = new android.widget.TextView(context);
        var typeTxt = item.type;
        if (item.type !== "section") typeTxt += " (" + (item.key || "?") + ")";
        typeTv.setText(String(typeTxt));
        typeTv.setTextColor(subTextColor);
        typeTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
        infoBox.addView(typeTv);

        card.addView(infoBox);

        // Actions
        var actions = new android.widget.LinearLayout(context);
        actions.setOrientation(android.widget.LinearLayout.HORIZONTAL);

        if (idx > 0) {
            actions.addView(self.ui.createFlatButton(self, "↑", subTextColor, function() {
                var temp = schema[idx];
                schema[idx] = schema[idx - 1];
                schema[idx - 1] = temp;
                refreshPanel();
            }));
        }
        if (idx < schema.length - 1) {
             actions.addView(self.ui.createFlatButton(self, "↓", subTextColor, function() {
                var temp = schema[idx];
                schema[idx] = schema[idx + 1];
                schema[idx + 1] = temp;
                refreshPanel();
            }));
        }
        actions.addView(self.ui.createFlatButton(self, "✎", C.primary, function() {
            self.state.editingSchemaIndex = idx;
            refreshPanel();
        }));
        actions.addView(self.ui.createFlatButton(self, "✕", C.danger, function() {
            schema.splice(idx, 1);
            refreshPanel();
        }));

        card.addView(actions);
        list.addView(card);
      })(i);
    }
    scroll.addView(list);
    panel.addView(scroll);

  } else {
    // Edit Mode
    var editIdx = this.state.editingSchemaIndex;
    var editItem = (editIdx === -1) ? { type: "bool", name: "", key: "" } : JSON.parse(JSON.stringify(schema[editIdx]));

    var btnBack = self.ui.createFlatButton(self, "返回", C.textSecLight, function() {
        self.state.editingSchemaIndex = null;
        refreshPanel();
    });
    header.addView(btnBack);
    panel.addView(header);
    panel.setTag(header); // 暴露 Header

    var scroll = new android.widget.ScrollView(context);
    var form = new android.widget.LinearLayout(context);
    form.setOrientation(android.widget.LinearLayout.VERTICAL);
    scroll.addView(form);

    function createInput(label, key, inputType, hint) {
        var box = new android.widget.LinearLayout(context);
        box.setOrientation(android.widget.LinearLayout.VERTICAL);
        box.setPadding(0, 0, 0, self.dp(12));

        var lb = new android.widget.TextView(context);
        lb.setText(label);
        lb.setTextColor(subTextColor);
        lb.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
        box.addView(lb);

        var et = new android.widget.EditText(context);
        et.setText(String(editItem[key] !== undefined ? editItem[key] : ""));
        et.setTextColor(textColor);
        et.setHint(hint || "");
        et.setHintTextColor(self.withAlpha(subTextColor, 0.5));
        et.setBackground(self.ui.createRoundDrawable(inputBgColor, self.dp(8)));
        et.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
        if (inputType) et.setInputType(inputType);
        box.addView(et);

        form.addView(box);
        return {
            getValue: function() { return String(et.getText()); },
            getView: function() { return box; }
        };
    }

    // Type Selector
    var typeBox = new android.widget.LinearLayout(context);
    typeBox.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    typeBox.setGravity(android.view.Gravity.CENTER_VERTICAL);
    typeBox.setPadding(0, 0, 0, self.dp(12));
    var typeLb = new android.widget.TextView(context);
    typeLb.setText("类型: ");
    typeLb.setTextColor(textColor);
    typeBox.addView(typeLb);

    var types = ["section", "bool", "int", "float", "text", "action"];
    var typeBtn = self.ui.createSolidButton(self, editItem.type, C.accent, android.graphics.Color.WHITE, function(v) {
        var currIdx = types.indexOf(editItem.type);
        var nextIdx = (currIdx + 1) % types.length;
        editItem.type = types[nextIdx];
        refreshPanel();
    });
    typeBox.addView(typeBtn);
    form.addView(typeBox);

    var inputName = createInput("显示名称 (Name)", "name", android.text.InputType.TYPE_CLASS_TEXT, "例如：悬浮球大小");

    var inputKey = null;
    var inputMin = null;
    var inputMax = null;
    var inputStep = null;
    var inputAction = null;

    if (editItem.type !== "section") {
        inputKey = createInput("配置键名 (Key)", "key", android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS, "例如：BALL_SIZE_DP");
    }

    if (editItem.type === "int" || editItem.type === "float") {
        inputMin = createInput("最小值 (Min)", "min", android.text.InputType.TYPE_CLASS_NUMBER | android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL | android.text.InputType.TYPE_NUMBER_FLAG_SIGNED);
        inputMax = createInput("最大值 (Max)", "max", android.text.InputType.TYPE_CLASS_NUMBER | android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL | android.text.InputType.TYPE_NUMBER_FLAG_SIGNED);
        inputStep = createInput("步进 (Step)", "step", android.text.InputType.TYPE_CLASS_NUMBER | android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL);
    }

    if (editItem.type === "action") {
        inputAction = createInput("动作ID (Action)", "action", android.text.InputType.TYPE_CLASS_TEXT, "例如：open_btn_mgr");
    }

    panel.addView(scroll);

    // Save Button
    var btnSave = self.ui.createSolidButton(self, "暂存", C.primary, android.graphics.Color.WHITE, function() {
        try {
            editItem.name = inputName.getValue();
            if (inputKey) editItem.key = inputKey.getValue();

            if (inputMin) editItem.min = Number(inputMin.getValue());
            if (inputMax) editItem.max = Number(inputMax.getValue());
            if (inputStep) editItem.step = Number(inputStep.getValue());
            if (inputAction) editItem.action = inputAction.getValue();

            // Clean up properties based on type
            if (editItem.type === "section") { delete editItem.key; delete editItem.min; delete editItem.max; delete editItem.step; delete editItem.action; }
            else if (editItem.type === "bool") { delete editItem.min; delete editItem.max; delete editItem.step; delete editItem.action; }
            else if (editItem.type === "int" || editItem.type === "float") { delete editItem.action; }
            else if (editItem.type === "action") { delete editItem.min; delete editItem.max; delete editItem.step; }

            if (editIdx === -1) {
                schema.push(editItem);
            } else {
                schema[editIdx] = editItem;
            }

            self.state.editingSchemaIndex = null;
            refreshPanel();
            self.toast("已暂存，请在列表页点击保存生效");
        } catch (e) {
            self.toast("暂存失败: " + e);
        }
    });

    var bottomBar = new android.widget.LinearLayout(context);
    bottomBar.setOrientation(android.widget.LinearLayout.VERTICAL);
    bottomBar.setPadding(0, self.dp(8), 0, 0);
    bottomBar.addView(btnSave);
    panel.addView(bottomBar);
  }

  return panel;
};

// =======================【查看器面板：UI】======================
FloatBallAppWM.prototype.buildViewerPanelView = function(titleText, bodyText) {
  var self = this;
  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var bgColor = isDark ? C.bgDark : C.bgLight;
  var textColor = isDark ? C.textPriDark : C.textPriLight;
  var codeColor = isDark ? C.textSecDark : C.textSecLight;
  var dividerColor = isDark ? C.dividerDark : C.dividerLight;

  var panel = new android.widget.LinearLayout(context);
  panel.setOrientation(android.widget.LinearLayout.VERTICAL);

  // 面板背景
  var bgDr = new android.graphics.drawable.GradientDrawable();
  bgDr.setColor(bgColor);
  bgDr.setCornerRadius(this.dp(16));
  panel.setBackground(bgDr);
  try { panel.setElevation(this.dp(8)); } catch(e){}

  panel.setPadding(
    this.dp(16),
    this.dp(16),
    this.dp(16),
    this.dp(16)
  );

  // Header removed to avoid duplication with wrapper
  // var header = new android.widget.LinearLayout(context);
  // ...


  var sep = new android.view.View(context);
  sep.setLayoutParams(new android.widget.LinearLayout.LayoutParams(
    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
    1 // 1px
  ));
  sep.setBackgroundColor(dividerColor);
  panel.addView(sep);

  var scroll = new android.widget.ScrollView(context);
  try { scroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER); } catch (eOS) {}
  try { scroll.setVerticalScrollBarEnabled(true); } catch (eSB) {}

  // 给内容加一点边距
  var contentBox = new android.widget.LinearLayout(context);
  contentBox.setOrientation(android.widget.LinearLayout.VERTICAL);
  contentBox.setPadding(0, this.dp(12), 0, this.dp(12));
  scroll.addView(contentBox);

  var tv = new android.widget.TextView(context);
  tv.setText(String(bodyText || ""));
  tv.setTextColor(codeColor);
  tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, Number(this.config.CONTENT_VIEWER_TEXT_SP || 12));
  // 增加行距优化阅读
  try { tv.setLineSpacing(this.dp(4), 1.0); } catch(eLS) {}
  // 使用等宽字体显示代码/日志
  try { tv.setTypeface(android.graphics.Typeface.MONOSPACE); } catch(eTF) {}
  // WindowManager 环境下禁用文本选择，否则长按/选择会因缺少 Token 崩溃
  try { tv.setTextIsSelectable(false); } catch (eSel) {}

  contentBox.addView(tv);

  scroll.setOnTouchListener(new JavaAdapter(android.view.View.OnTouchListener, {
    onTouch: function(v, e) { self.touchActivity(); return false; }
  }));

  var scrollLp = new android.widget.LinearLayout.LayoutParams(
    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
    0
  );
  scrollLp.weight = 1;
  scroll.setLayoutParams(scrollLp);
  panel.addView(scroll);
  return panel;
};

// =======================【面板构建：主面板 / 设置面板】======================
FloatBallAppWM.prototype.buildPanelView = function(panelType) {
  if (panelType === "settings") return this.buildSettingsPanelView();
  if (panelType === "btn_editor") return this.buildButtonEditorPanelView();
  if (panelType === "schema_editor") return this.buildSchemaEditorPanelView();

  var isDark = this.isDarkTheme();
  var C = this.ui.colors;
  var bgColor = isDark ? C.bgDark : C.bgLight;
  var cardColor = isDark ? C.cardDark : C.cardLight;
  var textColor = isDark ? C.textPriDark : C.textPriLight;

  var panel = new android.widget.LinearLayout(context);
  panel.setOrientation(android.widget.LinearLayout.VERTICAL);

  // 面板背景
  var bgDr = new android.graphics.drawable.GradientDrawable();
  // bgDr.setColor(bgColor);
  bgDr.setColor(this.withAlpha(bgColor, this.config.PANEL_BG_ALPHA));
  bgDr.setCornerRadius(this.dp(16));
  panel.setBackground(bgDr);
  try { panel.setElevation(this.dp(8)); } catch(e){}

  var padDp = this.config.PANEL_PADDING_DP;
  panel.setPadding(
    this.dp(padDp),
    this.dp(padDp),
    this.dp(padDp),
    this.dp(padDp)
  );

  var rawBtns = [];
  try { if (this.panels && this.panels[this.currentPanelKey]) rawBtns = this.panels[this.currentPanelKey]; } catch (e0) { rawBtns = []; }

  // # 启用/禁用：按钮页只渲染启用项（enabled !== false）
  // # 说明：按钮管理页仍显示全部；这里只影响主面板显示，不改变按钮顺序与索引存储
  var btns = [];
  try {
    if (rawBtns && rawBtns.length) {
      for (var bi = 0; bi < rawBtns.length; bi++) {
        var bb = rawBtns[bi];
        if (bb && bb.enabled === false) continue;
        btns.push(bb);
      }
    }
  } catch (eF) { btns = rawBtns || []; }

  var cols2 = this.config.PANEL_COLS;
  var rows2 = this.config.PANEL_ROWS;

  var itemPx = this.dp(this.config.PANEL_ITEM_SIZE_DP);
  var gapPx = this.dp(this.config.PANEL_GAP_DP);

  var contentW = cols2 * itemPx + cols2 * 2 * gapPx;

  // 计算内容高度限制
  // 每一行的高度 = itemPx + 2 * gapPx
  var oneRowH = itemPx + gapPx * 2;

  // 实际按钮数量
  var totalBtns = (btns && btns.length) ? btns.length : 0;
  // 最小显示的格子数（填满 rows2）
  var minCells = cols2 * rows2;
  // 最终渲染的格子总数
  var totalCells = totalBtns > minCells ? totalBtns : minCells;
  // 最终行数
  var finalRows = Math.ceil(totalCells / cols2);

  var scrollH = android.widget.LinearLayout.LayoutParams.WRAP_CONTENT;
  if (finalRows > rows2) {
      scrollH = rows2 * oneRowH;
  }

  var scroll = new android.widget.ScrollView(context);
  try { scroll.setOverScrollMode(android.view.View.OVER_SCROLL_NEVER); } catch (eOS) {}
  try { scroll.setVerticalScrollBarEnabled(false); } catch (eSB) {}
  try { scroll.setFillViewport(true); } catch (eFV) {}

  var scrollLp = new android.widget.LinearLayout.LayoutParams(contentW, scrollH);
  scroll.setLayoutParams(scrollLp);

  var self = this;

  scroll.setOnTouchListener(new JavaAdapter(android.view.View.OnTouchListener, {
    onTouch: function(v, e) { self.touchActivity(); return false; }
  }));

  var grid = new android.widget.GridLayout(context);
  grid.setColumnCount(cols2);

  // var totalBtns = (btns && btns.length) ? btns.length : 0;
  // var minCells = cols2 * rows2;
  // var totalCells = totalBtns > minCells ? totalBtns : minCells;

  var rowCount = Math.ceil(totalCells / cols2);
  try { grid.setRowCount(rowCount); } catch (eRC) {}

  grid.setOnTouchListener(new JavaAdapter(android.view.View.OnTouchListener, {
    onTouch: function(v, e) { self.touchActivity(); return false; }
  }));

  var i;
  for (i = 0; i < totalCells; i++) {
    var btnCfg = (btns && i < totalBtns) ? btns[i] : null;

    var cell = new android.widget.LinearLayout(context);
    cell.setOrientation(android.widget.LinearLayout.VERTICAL);
    cell.setGravity(android.view.Gravity.CENTER);

    var lp = new android.widget.GridLayout.LayoutParams();
    lp.width = itemPx;
    lp.height = itemPx;
    lp.setMargins(gapPx, gapPx, gapPx, gapPx);
    cell.setLayoutParams(lp);

    // 单元格背景：如果是有功能的按钮，给个卡片背景；否则透明
    if (btnCfg) {
         cell.setBackground(self.ui.createRoundDrawable(cardColor, self.dp(12)));
         try { cell.setElevation(self.dp(2)); } catch(e){}
    } else {
         // 空格子占位
    }

    var iv = new android.widget.ImageView(context);
    var dr = this.resolveIconDrawable(btnCfg);
    if (dr) {
        iv.setImageDrawable(dr);
        // 如果图标是白色的（通常是系统图标），且我们在亮色卡片上，可能需要染色
        // 但 resolveIconDrawable 逻辑比较复杂，这里暂时不强制染色，除非用户配置了 TINT
        if (!isDark && btnCfg && !btnCfg.type && !btnCfg.pkg) {
             // 简单的系统图标在亮色模式下可能看不清，染成深色
             try { iv.setColorFilter(C.textPriLight, android.graphics.PorterDuff.Mode.SRC_IN); } catch(eCF){}
        }
    }

    var ivLp = new android.widget.LinearLayout.LayoutParams(
      this.dp(this.config.PANEL_ICON_SIZE_DP),
      this.dp(this.config.PANEL_ICON_SIZE_DP)
    );
    iv.setLayoutParams(ivLp);
    cell.addView(iv);

    if (this.config.PANEL_LABEL_ENABLED) {
      var tv = new android.widget.TextView(context);
      var title = (btnCfg && btnCfg.title) ? String(btnCfg.title) : "";
      tv.setText(title);
      tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, this.config.PANEL_LABEL_TEXT_SIZE_SP);
      tv.setTextColor(textColor);
      tv.setGravity(android.view.Gravity.CENTER);
      try { tv.setLines(1); tv.setEllipsize(android.text.TextUtils.TruncateAt.END); } catch(eL){}

      var tvLp = new android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT, // 宽度填满，方便居中
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
      );
      tvLp.topMargin = this.dp(this.config.PANEL_LABEL_TOP_MARGIN_DP);
      tv.setLayoutParams(tvLp);
      cell.addView(tv);
    }

    if (btnCfg) {
      (function(index, btnObj) {
        cell.setClickable(true);
        // 使用 Ripple 效果增强点击反馈
        var rippleDr = self.ui.createRippleDrawable(cardColor, self.withAlpha(C.primary, 0.2), self.dp(12));
        cell.setBackground(rippleDr);

        cell.setOnClickListener(new android.view.View.OnClickListener({
          onClick: function() {
            self.touchActivity();
            self.hideMainPanel();
            self.execButtonAction(btnObj, index);
          }
        }));
      })(i, btnCfg);
    } else {
      try { iv.setAlpha(0); } catch (eA0) {}
      try { cell.setClickable(false); } catch (eC0) {}
    }

    grid.addView(cell);
  }

  scroll.addView(grid);
  panel.addView(scroll);
  return panel;
};

FloatBallAppWM.prototype.getBestPanelPosition = function(pw, ph, bx, by, ballSize) {
  var mode = String(this.config.PANEL_POS_GRAVITY || "bottom").toLowerCase();
  var gap = this.dp(this.config.BALL_PANEL_GAP_DP);
  var sw = this.state.screen.w;
  var sh = this.state.screen.h;

  var candidates = [];

  function makeCand(type) {
      if (type === "bottom") {
          return {
              x: Math.max(0, Math.min(sw - pw, bx + (ballSize - pw) / 2)),
              y: by + ballSize + gap,
              type: "bottom"
          };
      }
      if (type === "top") {
          return {
              x: Math.max(0, Math.min(sw - pw, bx + (ballSize - pw) / 2)),
              y: by - ph - gap,
              type: "top"
          };
      }
      if (type === "right") {
          return {
              x: bx + ballSize + gap,
              y: by,
              type: "right"
          };
      }
      if (type === "left") {
          return {
              x: bx - pw - gap,
              y: by,
              type: "left"
          };
      }
      return null;
  }

  if (mode === "top") {
      candidates.push(makeCand("top"));
      candidates.push(makeCand("bottom"));
  } else if (mode === "left") {
      candidates.push(makeCand("left"));
      candidates.push(makeCand("right"));
      candidates.push(makeCand("bottom"));
  } else if (mode === "right") {
      candidates.push(makeCand("right"));
      candidates.push(makeCand("left"));
      candidates.push(makeCand("bottom"));
  } else {
      // Default bottom or auto
      candidates.push(makeCand("bottom"));
      candidates.push(makeCand("top"));
      candidates.push(makeCand("right"));
      candidates.push(makeCand("left"));
  }

  var diyY = this.dp(this.config.PANEL_CUSTOM_OFFSET_Y || 0);

  // Find first valid
  for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (c) {
          c.y += diyY;
          if (c.x >= 0 && c.x + pw <= sw && c.y >= 0 && c.y + ph <= sh) {
              return c;
          }
      }
  }

  // Fallback: pick primary and clamp
  var best = candidates[0];
  if (!best) best = { x: 0, y: 0 };
  best.x = Math.max(0, Math.min(sw - pw, best.x));
  best.y = Math.max(0, Math.min(sh - ph, best.y));
  return best;
};

FloatBallAppWM.prototype.computePanelX = function(ballX, panelW) {
  var gapPx = this.dp(this.config.BALL_PANEL_GAP_DP);
  var di = this.getDockInfo();
  var screenW = this.state.screen.w;

  // 1. 优先尝试放在右侧
  var rightX = ballX + di.ballSize + gapPx;
  if (rightX + panelW <= screenW) {
    return rightX;
  }

  // 2. 右侧放不下，尝试放在左侧
  var leftX = ballX - gapPx - panelW;
  if (leftX >= 0) {
    return leftX;
  }

  // 3. 两边都放不下（面板太宽），选择空间大的一侧
  var spaceRight = screenW - (ballX + di.ballSize + gapPx);
  var spaceLeft = ballX - gapPx;

  if (spaceLeft > spaceRight) {
    // 左侧空间大，靠左放（可能会覆盖球或被切断，但优先保证左对齐）
    // 为了防止左边被切断，max(0, leftX)
    return Math.max(0, leftX);
  } else {
    // 右侧空间大
    return Math.min(screenW - panelW, rightX);
  }
};

FloatBallAppWM.prototype.tryAdjustPanelY = function(px, py, pw, ph, bx, by) {
  var gapPx = this.dp(this.config.BALL_PANEL_GAP_DP);
  var di = this.getDockInfo();

  var minY = 0;
  var maxY = this.state.screen.h - ph;

  py = this.clamp(py, minY, maxY);

  if (!this.rectIntersect(px, py, pw, ph, bx, by, di.ballSize, di.ballSize)) return { ok: true, x: px, y: py };

  var pyAbove = by - gapPx - ph;
  if (pyAbove >= minY && pyAbove <= maxY) {
    if (!this.rectIntersect(px, pyAbove, pw, ph, bx, by, di.ballSize, di.ballSize)) return { ok: true, x: px, y: pyAbove };
  }

  var pyBelow = by + di.ballSize + gapPx;
  if (pyBelow >= minY && pyBelow <= maxY) {
    if (!this.rectIntersect(px, pyBelow, pw, ph, bx, by, di.ballSize, di.ballSize)) return { ok: true, x: px, y: pyBelow };
  }

  return { ok: false, x: px, y: py };
};

FloatBallAppWM.prototype.addPanel = function(panel, x, y, which) {
  if (this.state.closing) return;

  // Determine if this panel should be modal (blocking background touches, better for IME)
  var isModal = (which === "settings" || which === "btn_editor" || which === "schema_editor");

  var flags;
  if (isModal) {
    // Modal: blocks outside touches, dim background, ensures focus for IME
    flags = android.view.WindowManager.LayoutParams.FLAG_DIM_BEHIND;
  } else {
    // Non-modal: allow outside touches
    flags = android.view.WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
            android.view.WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH;
    // 主面板(预览)需要获取焦点以支持输入法，同时允许点击外部
    // if (which === "main") {
    //    flags |= android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
    // }
  }

  var lp = new android.view.WindowManager.LayoutParams(
    android.view.WindowManager.LayoutParams.WRAP_CONTENT,
    android.view.WindowManager.LayoutParams.WRAP_CONTENT,
    android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
    flags,
    android.graphics.PixelFormat.TRANSLUCENT
  );

  if (isModal) {
      lp.dimAmount = 0.5;
  }

  // Allow resizing for IME
  lp.softInputMode = android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE | android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE;

  lp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
  lp.x = x;
  lp.y = y;

  try { this.state.wm.addView(panel, lp); } catch (eAdd) { safeLog(this.L, 'e',  "addPanel fail which=" + String(which) + " err=" + String(eAdd)); return; }

  if (which === "main") { this.state.panel = panel; this.state.panelLp = lp; this.state.addedPanel = true; }
  else if (which === "settings") { this.state.settingsPanel = panel; this.state.settingsPanelLp = lp; this.state.addedSettings = true; }
  else { this.state.viewerPanel = panel; this.state.viewerPanelLp = lp; this.state.addedViewer = true; }

  try {
    if (this.config.ENABLE_ANIMATIONS) {
        panel.setScaleX(0.96);
        panel.setScaleY(0.96);
        panel.setAlpha(0);
        panel.animate()
          .scaleX(1)
          .scaleY(1)
          .alpha(1)
          .setDuration(180)
          .setInterpolator(new android.view.animation.AccelerateDecelerateInterpolator())
          .start();
    } else {
        panel.setScaleX(1);
        panel.setScaleY(1);
        panel.setAlpha(1);
    }
  } catch (eA) {}

  // # 日志防抖：5秒内相同面板类型不重复记录
  var now = Date.now();
  var lastPanelShow = this.state._lastPanelShow || {};
  var lastTime = lastPanelShow[which] || 0;
  if (now - lastTime > 5000) {
    safeLog(this.L, 'i', "panel show which=" + String(which) + " x=" + String(x) + " y=" + String(y));
    lastPanelShow[which] = now;
    this.state._lastPanelShow = lastPanelShow;
  }
};

FloatBallAppWM.prototype.showPanelAvoidBall = function(which) {
  if (this.state.closing) return;

  // 优化：如果是刷新编辑器面板（btn_editor/schema_editor），且面板已存在，则直接更新内容，避免闪烁
  if ((which === "btn_editor" || which === "schema_editor") && this.state.addedViewer && this.state.viewerPanel) {
      try {
          var self = this;
          var type = which;
          var newPanel = self.buildPanelView(type);

          // 限制高度逻辑 (复用下面的逻辑)
          var maxH = Math.floor(self.state.screen.h * 0.75);
          newPanel.measure(
            android.view.View.MeasureSpec.makeMeasureSpec(self.state.screen.w, android.view.View.MeasureSpec.AT_MOST),
            android.view.View.MeasureSpec.makeMeasureSpec(maxH, android.view.View.MeasureSpec.AT_MOST)
          );

          var pw = newPanel.getMeasuredWidth();
          var ph = newPanel.getMeasuredHeight();
          var finalPh = (ph > maxH) ? maxH : ph;

          // 更新现有面板内容 (Draggable Container 结构)
          var oldRoot = this.state.viewerPanel;
          // 查找内容容器：Root(FrameLayout) -> Container(LinearLayout) -> Content(Last Child)
          // 结构：Root -> [Container] -> [Header, Content]
          // 为了通用性，我们约定 Content 是 Container 的最后一个子 View

          // 检查是否是 Draggable 结构
          var container = null;
          if (oldRoot.getChildCount() > 0 && oldRoot.getChildAt(0) instanceof android.widget.LinearLayout) {
               container = oldRoot.getChildAt(0);
          }

          if (container && container.getChildCount() >= 2) {
               // 假设最后一个是 Content
               var oldContent = container.getChildAt(container.getChildCount() - 1);
               container.removeView(oldContent);

               // 准备新内容
               // newPanel 本身就是内容
               // 需要处理 newPanel 的 LayoutParams
               var contentLp = new android.widget.LinearLayout.LayoutParams(-1, 0);
               contentLp.weight = 1;
               try { newPanel.setBackground(null); } catch(e){} // 移除背景，使用 Container 背景
               try { newPanel.setElevation(0); } catch(e){}
               newPanel.setLayoutParams(contentLp);

               container.addView(newPanel);

               // 更新 Window LayoutParams (仅高度和位置)
               var lp = this.state.viewerPanelLp;
               if (lp) {
                   // 高度调整：如果是 wrap_content，需要重新计算；如果用户调整过大小(explicit)，则保持不变？
                   // 这里为了简单，如果是刷新，我们保持当前的 LayoutParams 尺寸，除非内容变大？
                   // 暂时策略：保持当前窗口大小，或者自适应
                   // 如果是编辑器，通常希望保持大小
                   // 所以这里不更新 lp.height 和 lp.width，只更新内容
               }
          } else {
               // 非 Draggable 结构（回退）
               // ... (原有逻辑)
          }

          self.touchActivity();
          return; // 刷新完成，直接返回
      } catch(e) {
          if (self.L) self.L.e("Refresh panel failed, fallback to recreate: " + String(e));
          // 如果失败，继续执行下面的销毁重建逻辑
      }
  }

  if (which === "main" && this.state.addedPanel) return;
  if (which === "settings" && this.state.addedSettings) return;

  this.touchActivity();

  if (which === "main") { this.hideSettingsPanel(); this.hideViewerPanel(); }
  if (which === "settings") { this.hideMainPanel(); this.hideViewerPanel(); }
  if (which === "btn_editor" || which === "schema_editor") { this.hideMainPanel(); this.hideSettingsPanel(); this.hideViewerPanel(); }

  var self = this;

  var doShow = function() {
    try {
      if (self.state.closing) return;

      self.showMask();

      var type = which;
      var rawPanel = self.buildPanelView(type);

      // 决定是否启用拖拽/缩放 (排除 main)
      var enableDrag = (which !== "main");
      var panelView = rawPanel;
      var dragHeader = null;
      var resizeHandles = null;

      if (enableDrag) {
          // 获取标题
          var titleMap = {
              "settings": "设置",
              "btn_editor": "按钮管理",
              "schema_editor": "布局管理"
          };
          var title = titleMap[which] || "面板";

          // 动态标题 for btn_editor
          if (which === "btn_editor") {
             if (self.state.editingButtonIndex !== null && self.state.editingButtonIndex !== undefined) {
                 title = (self.state.editingButtonIndex === -1) ? "新增按钮" : "编辑按钮";
             } else {
                 title = "按钮管理";
             }
          }

          var wrapped = self.wrapDraggablePanel(rawPanel, title, function() {
              if (which === "settings") self.hideSettingsPanel();
              else if (which === "main") self.hideMainPanel();
              else self.hideViewerPanel();
          });
          panelView = wrapped.view;
          dragHeader = wrapped.header;
          resizeHandles = wrapped.handles;
      }

      // # 限制面板最大高度
      var maxH = Math.floor(self.state.screen.h * 0.75);
      panelView.measure(
        android.view.View.MeasureSpec.makeMeasureSpec(self.state.screen.w, android.view.View.MeasureSpec.AT_MOST),
        android.view.View.MeasureSpec.makeMeasureSpec(maxH, android.view.View.MeasureSpec.AT_MOST)
      );

      var pw = panelView.getMeasuredWidth();
      var ph = panelView.getMeasuredHeight();

      // Load saved state
      var savedState = null;
      if (enableDrag && self.loadPanelState) {
          savedState = self.loadPanelState(which);
      }

      if (savedState && savedState.w && savedState.h) {
          pw = savedState.w;
          ph = savedState.h;
      } else {
           // 显式设置面板高度
          if (ph > maxH) {
              ph = maxH;
          }
      }

      var safeLp = panelView.getLayoutParams();
      if (!safeLp) safeLp = new android.view.ViewGroup.LayoutParams(pw, ph);
      else { safeLp.width = pw; safeLp.height = ph; }
      panelView.setLayoutParams(safeLp);

      var bx = self.state.ballLp.x;
      var by = self.state.ballLp.y;
      var di = self.getDockInfo();

      // 位置计算
      var pos = self.getBestPanelPosition(pw, ph, bx, by, di.ballSize);

      if (savedState && typeof savedState.x === 'number' && typeof savedState.y === 'number') {
          pos.x = savedState.x;
          pos.y = savedState.y;
      }

      self.addPanel(panelView, pos.x, pos.y, which);

      // 绑定拖拽事件
      if (enableDrag) {
          self.attachDragResizeListeners(panelView, dragHeader, resizeHandles, which);
      }

      self.touchActivity();
    } catch (e) {
      if (self.L) self.L.e("showPanelAvoidBall callback err=" + String(e));
      try { self.toast("面板显示失败: " + String(e)); } catch (et) {}
    }
  };

  if (which === "settings") {
      doShow();
  } else {
      this.undockToFull(true, doShow);
  }
};

// =======================【辅助：包装可拖拽面板】======================
FloatBallAppWM.prototype.wrapDraggablePanel = function(contentView, optionsOrTitle, onClose) {
    var self = this;
    // var context = this.context; // Remove this line to use global context
    var isDark = this.isDarkTheme();
    var C = this.ui.colors;

    var title = "";
    var hideHeader = false;

    if (typeof optionsOrTitle === "string") {
        title = optionsOrTitle;
    } else if (optionsOrTitle && typeof optionsOrTitle === "object") {
        title = optionsOrTitle.title || "";
        hideHeader = !!optionsOrTitle.hideHeader;
    }

    // Root FrameLayout (to hold content + resize handle)
    var root = new android.widget.FrameLayout(context);

    // Main Container (Header + Content)
    var container = new android.widget.LinearLayout(context);
    container.setOrientation(android.widget.LinearLayout.VERTICAL);

    // 背景设置在 Container 上
    var bgDr = new android.graphics.drawable.GradientDrawable();
    bgDr.setColor(isDark ? C.bgDark : C.bgLight);
    bgDr.setCornerRadius(this.dp(12));
    container.setBackground(bgDr);
    try { container.setElevation(this.dp(8)); } catch(e){}

    // Header
    var header = new android.widget.LinearLayout(context);
    header.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    header.setGravity(android.view.Gravity.CENTER_VERTICAL);
    header.setPadding(this.dp(12), this.dp(8), this.dp(8), this.dp(8));
    // 给 Header 一个背景色，区分度更好
    // header.setBackgroundColor(isDark ? 0x22FFFFFF : 0x11000000);

    var titleTv = new android.widget.TextView(context);
    titleTv.setText(String(title || "Panel"));
    titleTv.setTextColor(isDark ? C.textPriDark : C.textPriLight);
    titleTv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    titleTv.setTypeface(null, android.graphics.Typeface.BOLD);
    var titleLp = new android.widget.LinearLayout.LayoutParams(0, -2);
    titleLp.weight = 1;
    titleTv.setLayoutParams(titleLp);
    header.addView(titleTv);

    // Close Button
    var btnClose = this.ui.createFlatButton(this, "✕", C.textSecLight, function() {
        if (onClose) onClose();
        else self.hideAllPanels();
    });
    btnClose.setPadding(self.dp(8), self.dp(4), self.dp(8), self.dp(4));
    try { btnClose.setElevation(this.dp(25)); } catch(e){} // Ensure on top of resize handles
    header.addView(btnClose);

    // Spacer to avoid overlap with Top-Right resize handle
    var spacer = new android.view.View(context);
    spacer.setLayoutParams(new android.widget.LinearLayout.LayoutParams(this.dp(30), 1));
    header.addView(spacer);

    container.addView(header);

    if (hideHeader) {
        header.setVisibility(android.view.View.GONE);
    }

    // Add Content
    // 移除 content 原有的背景和 elevation，避免重复
    try { contentView.setBackground(null); } catch(e){}
    try { contentView.setElevation(0); } catch(e){}

    var contentLp = new android.widget.LinearLayout.LayoutParams(-1, 0);
    contentLp.weight = 1;
    contentView.setLayoutParams(contentLp);
    container.addView(contentView);

    // Container fill root
    root.addView(container, new android.widget.FrameLayout.LayoutParams(-1, -1));

    // Resize Handle (Bottom-Right Corner) - Invisible
    var handleBR = new android.view.View(context);
    try { handleBR.setElevation(this.dp(20)); } catch(e){}
    var handleBRLp = new android.widget.FrameLayout.LayoutParams(this.dp(30), this.dp(30));
    handleBRLp.gravity = android.view.Gravity.BOTTOM | android.view.Gravity.END;
    handleBRLp.rightMargin = 0;
    handleBRLp.bottomMargin = 0;
    root.addView(handleBR, handleBRLp);

    // Resize Handle (Bottom-Left Corner) - Invisible
    var handleBL = new android.view.View(context);
    try { handleBL.setElevation(this.dp(20)); } catch(e){}
    var handleBLLp = new android.widget.FrameLayout.LayoutParams(this.dp(30), this.dp(30));
    handleBLLp.gravity = android.view.Gravity.BOTTOM | android.view.Gravity.START;
    handleBLLp.bottomMargin = 0;
    handleBLLp.leftMargin = 0;
    root.addView(handleBL, handleBLLp);

    // Resize Handle (Top-Left Corner) - Invisible
    var handleTL = new android.view.View(context);
    try { handleTL.setElevation(this.dp(20)); } catch(e){}
    var handleTLLp = new android.widget.FrameLayout.LayoutParams(this.dp(30), this.dp(30));
    handleTLLp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
    handleTLLp.topMargin = 0;
    handleTLLp.leftMargin = 0;
    root.addView(handleTL, handleTLLp);

    // Resize Handle (Top-Right Corner) - Invisible
    var handleTR = new android.view.View(context);
    try { handleTR.setElevation(this.dp(20)); } catch(e){}
    var handleTRLp = new android.widget.FrameLayout.LayoutParams(this.dp(30), this.dp(30));
    handleTRLp.gravity = android.view.Gravity.TOP | android.view.Gravity.END;
    handleTRLp.topMargin = 0;
    handleTRLp.rightMargin = 0;
    root.addView(handleTR, handleTRLp);

    return {
        view: root,
        header: header,
        handles: {
            br: handleBR,
            bl: handleBL,
            tl: handleTL,
            tr: handleTR
        }
    };
};

// =======================【辅助：绑定拖拽/缩放事件】======================
FloatBallAppWM.prototype.attachDragResizeListeners = function(rootView, headerView, resizeHandles, panelKey) {
    var self = this;
    var wm = this.state.wm;

    // Helper to get LP safely (must be called after addView)
    var getLp = function() {
        return rootView.getLayoutParams();
    };

    // Helper to save state
    var saveState = function() {
        if (panelKey && self.savePanelState) {
            var lp = getLp();
            if (lp) {
                self.savePanelState(panelKey, {
                    x: lp.x,
                    y: lp.y,
                    w: rootView.getWidth(),
                    h: rootView.getHeight()
                });
            }
        }
    };

    // Drag Logic
    if (headerView) {
        var lastX = 0, lastY = 0;
        var initialX = 0, initialY = 0;
        var dragging = false;

        headerView.setOnTouchListener(new android.view.View.OnTouchListener({
            onTouch: function(v, e) {
                var action = e.getAction();
                var rawX = e.getRawX();
                var rawY = e.getRawY();

                if (action === android.view.MotionEvent.ACTION_DOWN) {
                    self.touchActivity();
                    lastX = rawX;
                    lastY = rawY;
                    var lp = getLp();
                    if (lp) {
                        initialX = lp.x;
                        initialY = lp.y;
                        dragging = false;
                        return true;
                    }
                } else if (action === android.view.MotionEvent.ACTION_MOVE) {
                    self.touchActivity();
                    var dx = rawX - lastX;
                    var dy = rawY - lastY;
                    if (!dragging && (Math.abs(dx) > self.dp(5) || Math.abs(dy) > self.dp(5))) {
                        dragging = true;
                    }
                    if (dragging) {
                        var lp = getLp();
                        if (lp) {
                            var targetX = Math.round(initialX + dx);
                            var targetY = Math.round(initialY + dy);

                            // 边界限制：防止完全拖出屏幕
                            // 至少保留 30dp 在屏幕内
                            var safeMargin = self.dp(30);
                            var screenW = self.state.screen.w;
                            var screenH = self.state.screen.h;
                            var curW = rootView.getWidth();

                            // X轴：左边缘不小于 -width + safeMargin, 右边缘不大于 screenW - safeMargin
                            targetX = Math.max(-curW + safeMargin, Math.min(targetX, screenW - safeMargin));
                            // Y轴：顶部不小于 0, 底部不大于 screenH - safeMargin
                            targetY = Math.max(0, Math.min(targetY, screenH - safeMargin));

                            lp.x = targetX;
                            lp.y = targetY;
                            try { wm.updateViewLayout(rootView, lp); } catch(e){}
                        }
                    }
                    return true;
                } else if (action === android.view.MotionEvent.ACTION_UP) {
                    self.touchActivity();
                    if (dragging) {
                        saveState();
                    }
                    dragging = false;
                    return true;
                }
                return false;
            }
        }));
    }

    // Resize Logic
    if (resizeHandles) {
        var handles = {};
        // Compatibility: if resizeHandles is a View, treat as 'br'
        if (resizeHandles instanceof android.view.View) {
            handles.br = resizeHandles;
        } else {
            handles = resizeHandles;
        }

        var setupResize = function(mode, handleView) {
            var lastRX = 0, lastRY = 0;
            var initialW = 0, initialH = 0;
            var initialX = 0, initialY = 0;
            var resizing = false;

            // Long Press Logic
            var longPressRunnable = null;
            var longPressTriggered = false;

            handleView.setOnTouchListener(new android.view.View.OnTouchListener({
                onTouch: function(v, e) {
                    var action = e.getAction();
                    var rawX = e.getRawX();
                    var rawY = e.getRawY();

                    if (action === android.view.MotionEvent.ACTION_DOWN) {
                        self.touchActivity();
                        lastRX = rawX;
                        lastRY = rawY;
                        var lp = getLp();
                        if (lp) {
                            initialW = rootView.getWidth();
                            initialH = rootView.getHeight();
                            initialX = lp.x;
                            initialY = lp.y;

                            resizing = false;
                            longPressTriggered = false;

                            // Start Long Press Timer
                            longPressRunnable = new java.lang.Runnable({
                                run: function() {
                                    try {
                                        longPressTriggered = true;
                                        self.vibrateOnce(40); // Haptic feedback

                                        // Switch to fixed size immediately
                                        var lpCur = getLp();
                                        if (lpCur) {
                                            lpCur.width = initialW;
                                            lpCur.height = initialH;
                                            lpCur.x = initialX;
                                            lpCur.y = initialY;
                                            try { wm.updateViewLayout(rootView, lpCur); } catch(e){}
                                        }
                                        resizing = true;
                                    } catch(e) {}
                                }
                            });
                            self.state.h.postDelayed(longPressRunnable, 300); // 300ms hold to activate resize

                            return true;
                        }
                    } else if (action === android.view.MotionEvent.ACTION_MOVE) {
                        self.touchActivity();
                        var dx = rawX - lastRX;
                        var dy = rawY - lastRY;

                        if (!longPressTriggered) {
                            // If moved significantly before long press triggers, cancel it
                            // Increased tolerance to 16dp to avoid accidental cancellation
                            if (Math.abs(dx) > self.dp(16) || Math.abs(dy) > self.dp(16)) {
                                if (longPressRunnable) {
                                    self.state.h.removeCallbacks(longPressRunnable);
                                    longPressRunnable = null;
                                }
                            }
                        }

                        if (resizing) {
                            var lp = getLp();
                            if (lp) {
                                var newW = initialW;
                                var newH = initialH;
                                var newX = initialX;
                                var newY = initialY;

                                // 1. Calculate raw new dimensions
                                if (mode === 'br') {
                                    newW = initialW + dx;
                                    newH = initialH + dy;
                                } else if (mode === 'r') {
                                    newW = initialW + dx;
                                } else if (mode === 'b') {
                                    newH = initialH + dy;
                                } else if (mode === 'bl') {
                                    newW = initialW - dx;
                                    newH = initialH + dy;
                                } else if (mode === 'tl') {
                                    newW = initialW - dx;
                                    newH = initialH - dy;
                                } else if (mode === 'tr') {
                                    newW = initialW + dx;
                                    newH = initialH - dy;
                                }

                                // 2. Constrain new dimensions
                                var screenW = self.state.screen.w;
                                var screenH = self.state.screen.h;
                                var constrainedW = Math.max(self.dp(200), Math.min(newW, screenW));
                                var constrainedH = Math.max(self.dp(150), Math.min(newH, screenH));

                                // 3. Calculate new position based on CONSTRAINED dimensions change
                                // If dragging left edge (bl, tl), X must shift by the amount WIDTH changed (constrained)
                                if (mode === 'bl' || mode === 'tl') {
                                    // newX = initialX - (change in width)
                                    // change in width = constrainedW - initialW
                                    newX = initialX - (constrainedW - initialW);
                                }

                                // If dragging top edge (tl, tr), Y must shift by the amount HEIGHT changed (constrained)
                                if (mode === 'tl' || mode === 'tr') {
                                    // newY = initialY - (change in height)
                                    // change in height = constrainedH - initialH
                                    newY = initialY - (constrainedH - initialH);
                                }

                                lp.width = Math.round(constrainedW);
                                lp.height = Math.round(constrainedH);

                                if (mode === 'bl' || mode === 'tl') {
                                    lp.x = Math.round(newX);
                                }
                                if (mode === 'tl' || mode === 'tr') {
                                    lp.y = Math.round(newY);
                                }

                                try { wm.updateViewLayout(rootView, lp); } catch(e){}
                            }
                        }
                        return true;
                    } else if (action === android.view.MotionEvent.ACTION_UP || action === android.view.MotionEvent.ACTION_CANCEL) {
                        self.touchActivity();

                        if (longPressRunnable) {
                            self.state.h.removeCallbacks(longPressRunnable);
                            longPressRunnable = null;
                        }

                        if (resizing) {
                            saveState();
                        }
                        resizing = false;
                        longPressTriggered = false;
                        return true;
                    }
                    return false;
                }
            }));
        };

        if (handles.br) setupResize('br', handles.br);
        if (handles.bl) setupResize('bl', handles.bl);
        if (handles.tl) setupResize('tl', handles.tl);
        if (handles.tr) setupResize('tr', handles.tr);
    }
};

// =======================【查看器面板：显示】======================
FloatBallAppWM.prototype.showViewerPanel = function(title, text) {
  if (this.state.closing) return;
  this.touchActivity();

  if (this.state.addedViewer) this.hideViewerPanel();
  this.hideMainPanel();
  this.hideSettingsPanel();

  var self = this;

  this.undockToFull(true, function() {
    if (self.state.closing) return;

    self.showMask();

    var rawPanel = self.buildViewerPanelView(title, text);

    // 使用 Draggable Wrapper
    var wrapped = self.wrapDraggablePanel(rawPanel, title || "Viewer", function() {
        self.hideViewerPanel();
    });

    var panelView = wrapped.view;

    panelView.measure(
      android.view.View.MeasureSpec.makeMeasureSpec(0, android.view.View.MeasureSpec.UNSPECIFIED),
      android.view.View.MeasureSpec.makeMeasureSpec(0, android.view.View.MeasureSpec.UNSPECIFIED)
    );

    var pw = panelView.getMeasuredWidth();
    var ph = panelView.getMeasuredHeight();

    // 限制初始大小
    var maxW = Math.floor(self.state.screen.w * 0.9);
    var maxH = Math.floor(self.state.screen.h * 0.7);
    if (pw > maxW) pw = maxW;
    if (ph > maxH) ph = maxH;

    // Load saved state
    var savedState = null;
    if (self.loadPanelState) {
        savedState = self.loadPanelState("viewer");
    }
    if (savedState && savedState.w && savedState.h) {
        pw = savedState.w;
        ph = savedState.h;
    }

    // 设置 LayoutParams 尺寸 (如果是 wrap_content 可能会超)
    var safeLp = new android.view.ViewGroup.LayoutParams(pw, ph);
    panelView.setLayoutParams(safeLp);

    var bx = self.state.ballLp.x;
    var by = self.state.ballLp.y;

    var finalX, finalY;

    if (savedState && typeof savedState.x === 'number' && typeof savedState.y === 'number') {
        finalX = savedState.x;
        finalY = savedState.y;
    } else {
        var px = self.computePanelX(bx, pw);
        var py = by;

        var r = self.tryAdjustPanelY(px, py, pw, ph, bx, by);
        if (r.ok) {
            finalX = r.x;
            finalY = r.y;
        } else {
            finalX = px;
            finalY = self.clamp(py, 0, self.state.screen.h - ph);
        }
    }

    self.addPanel(panelView, finalX, finalY, "viewer");

    // 绑定事件
    self.attachDragResizeListeners(panelView, wrapped.header, wrapped.handles, "viewer");

    self.touchActivity();
  });
};

FloatBallAppWM.prototype.cancelLongPressTimer = function() {
  try { if (this.state.longPressRunnable && this.state.h) this.state.h.removeCallbacks(this.state.longPressRunnable); } catch (e) {}
  this.state.longPressArmed = false;
  this.state.longPressRunnable = null;
};
FloatBallAppWM.prototype.resetLongPressState = function() {
  this.state.longPressArmed = false;
  this.state.longPressTriggered = false;
  this.state.longPressRunnable = null;
};

FloatBallAppWM.prototype.armLongPress = function() {
  if (!this.config.ENABLE_LONG_PRESS) return;

  this.resetLongPressState();
  this.state.longPressArmed = true;

  var self = this;

  var r = new java.lang.Runnable({
    run: function() {
      try {
        if (self.state.closing) return;
        if (!self.state.longPressArmed) return;
        if (self.state.dragging) return;

        self.state.longPressTriggered = true;
        self.vibrateOnce(self.config.LONG_PRESS_VIBRATE_MS);

        if (self.state.addedSettings) self.hideSettingsPanel();
        else self.showPanelAvoidBall("settings");

        if (self.L) self.L.i("longPress -> settings");
      } catch (e) {
        if (self.L) self.L.e("longPress run err=" + String(e));
      }
    }
  });

  this.state.longPressRunnable = r;
  this.state.h.postDelayed(r, this.config.LONG_PRESS_MS);
};

FloatBallAppWM.prototype.setupTouchListener = function() {
  var slop = this.dp(this.config.CLICK_SLOP_DP);
  var self = this;

  // 速度追踪
  var velocityTracker = null;
  var lastTouchX = 0;
  var lastTouchY = 0;

  // 限制 WM 更新频率，避免过热/卡顿
  var lastUpdateTs = 0;

  return new JavaAdapter(android.view.View.OnTouchListener, {
    onTouch: function(v, e) {
      if (self.state.closing) return false;

      var a = e.getAction();
      var di = self.getDockInfo();

      if (velocityTracker == null) {
          velocityTracker = android.view.VelocityTracker.obtain();
      }
      velocityTracker.addMovement(e);

      if (a === android.view.MotionEvent.ACTION_DOWN) {
        self.touchActivity();

        // 恢复不透明度
        try { v.setAlpha(1.0); } catch(eA) {}

        if (self.state.docked) {
          self.undockToFull(false, null);
          self.touchActivity();
        }

        self.state.rawX = e.getRawX();
        self.state.rawY = e.getRawY();
        self.state.downX = self.state.ballLp.x;
        self.state.downY = self.state.ballLp.y;
        self.state.dragging = false;

        lastTouchX = e.getRawX();
        lastTouchY = e.getRawY();

        try { v.setPressed(true); } catch (eP) {}
        try { v.drawableHotspotChanged(e.getX(), e.getY()); } catch (eH) {}

        // 按下缩小反馈
        if (self.config.ENABLE_ANIMATIONS) {
            try {
                v.animate().scaleX(0.9).scaleY(0.9).setDuration(100).start();
            } catch(eS){}
        }

        self.armLongPress();
        // # 日志精简：touch DOWN 只在 DEBUG 且非频繁触发时记录
        // if (self.L) self.L.d("touch DOWN rawX=" + String(self.state.rawX) + " rawY=" + String(self.state.rawY));
        return true;
      }

      if (a === android.view.MotionEvent.ACTION_MOVE) {
        self.touchActivity();

        var curRawX = e.getRawX();
        var curRawY = e.getRawY();
        var dx = Math.round(curRawX - self.state.rawX);
        var dy = Math.round(curRawY - self.state.rawY);

        lastTouchX = curRawX;
        lastTouchY = curRawY;

        if (!self.state.dragging) {
          if (Math.abs(dx) > slop || Math.abs(dy) > slop) {
            self.state.dragging = true;
            self.cancelLongPressTimer();
            // # 日志精简：drag start 只在 DEBUG 时记录
            // if (self.L) self.L.d("drag start dx=" + String(dx) + " dy=" + String(dy));
          }
        }

        if (self.state.dragging) {
          self.state.ballLp.x = self.state.downX + dx;
          self.state.ballLp.y = self.state.downY + dy;

          self.state.ballLp.x = self.clamp(self.state.ballLp.x, 0, self.state.screen.w - di.ballSize);
          self.state.ballLp.y = self.clamp(self.state.ballLp.y, 0, self.state.screen.h - di.ballSize);

          self.state.ballLp.width = di.ballSize;
          try { self.state.ballContent.setX(0); } catch (e0) {}

          var now = java.lang.System.currentTimeMillis();
          if (now - lastUpdateTs > 10) { // 10ms 节流
             try { self.state.wm.updateViewLayout(self.state.ballRoot, self.state.ballLp); } catch (eU) {}
             lastUpdateTs = now;
          }

          self.hideAllPanels();
          // 拖拽中不频繁保存位置，只在 UP 时保存
        }

        return true;
      }

      if (a === android.view.MotionEvent.ACTION_UP || a === android.view.MotionEvent.ACTION_CANCEL) {
        self.touchActivity();

        try { v.setPressed(false); } catch (eP2) {}
        self.cancelLongPressTimer();

        // 恢复缩放
        if (self.config.ENABLE_ANIMATIONS) {
            try {
                v.animate().scaleX(1.0).scaleY(1.0).setDuration(150).start();
            } catch(eS){}
        } else {
             try { v.setScaleX(1); v.setScaleY(1); } catch(eS){}
        }

        if (self.state.longPressTriggered) {
            self.resetLongPressState();
            if (velocityTracker) { velocityTracker.recycle(); velocityTracker = null; }
            return true;
        }

        if (!self.state.dragging && a === android.view.MotionEvent.ACTION_UP) {
          try { self.playBounce(v); } catch (eB) {}

          if (self.state.addedPanel) self.hideMainPanel();
          else self.showPanelAvoidBall("main");

          // # 日志精简：click 事件记录为 INFO 级别（关键操作）
          if (self.L) self.L.i("click -> toggle main");
        } else {
          // 拖拽结束
          // 确保最后位置被更新
          try { self.state.wm.updateViewLayout(self.state.ballRoot, self.state.ballLp); } catch (eU) {}

          var forceSide = null;
          // 计算速度
          if (velocityTracker) {
              velocityTracker.computeCurrentVelocity(1000);
              var vx = velocityTracker.getXVelocity();
              // 简单的 fling 判定
              if (vx > 1000) forceSide = "right";
              else if (vx < -1000) forceSide = "left";

          // # 日志精简：drag end 只在 DEBUG 时记录
              // if (self.L) self.L.d("drag end vx=" + vx);
          }

          if (self.config.ENABLE_SNAP_TO_EDGE) {
              // 立即吸附，带动画，支持 fling 方向
              self.snapToEdgeDocked(true, forceSide);
          } else {
              self.savePos(self.state.ballLp.x, self.state.ballLp.y);
          }
        }

        if (velocityTracker) {
            velocityTracker.recycle();
            velocityTracker = null;
        }

        self.state.dragging = false;
        self.touchActivity();
        self.resetLongPressState();
        return true;
      }

      return false;
    }
  });
};

FloatBallAppWM.prototype.createBallViews = function() {
  var di = this.getDockInfo();

  var root = new android.widget.FrameLayout(context);
  root.setClipToPadding(true);
  root.setClipChildren(true);
  try { root.setElevation(this.dp(6)); } catch(e){}

  var content = new android.widget.FrameLayout(context);
  var lp = new android.widget.FrameLayout.LayoutParams(di.ballSize, di.ballSize);
  content.setLayoutParams(lp);
// # 悬浮球内部内容（图标/文字）
try {
  var iconResId = Number(this.config.BALL_ICON_RES_ID || 0);
  var iconType = this.config.BALL_ICON_TYPE ? String(this.config.BALL_ICON_TYPE) : "android";
  var iconFilePath = (this.config.BALL_ICON_FILE_PATH == null) ? "" : String(this.config.BALL_ICON_FILE_PATH);
  var textStr = (this.config.BALL_TEXT == null) ? "" : String(this.config.BALL_TEXT);

  // # 是否显示图标：file 只看路径；app 优先看包名，其次可回退 iconResId；android 走 iconResId；shortx 总是显示
  var showIcon = false;
  if (iconType === "file") {
    showIcon = (iconFilePath.length > 0);
  } else if (iconType === "app") {
    var _pkg = this.config.BALL_ICON_PKG ? String(this.config.BALL_ICON_PKG) : "";
    showIcon = (_pkg.length > 0) || (iconResId > 0);
  } else if (iconType === "shortx") {
    showIcon = true;  // # ShortX 内置图标总是尝试显示
  } else {
    showIcon = (iconResId > 0);
  }

  if (!showIcon && textStr.length === 0) showIcon = true;

  var showText = textStr.length > 0;
  if (showIcon || showText) {
    var box = new android.widget.LinearLayout(context);
    box.setOrientation(android.widget.LinearLayout.VERTICAL);
    box.setGravity(android.view.Gravity.CENTER);
    var boxLp = new android.widget.FrameLayout.LayoutParams(
      android.view.ViewGroup.LayoutParams.WRAP_CONTENT,
      android.view.ViewGroup.LayoutParams.WRAP_CONTENT
    );
    boxLp.gravity = android.view.Gravity.CENTER;
    box.setLayoutParams(boxLp);

    var tintHex = (this.config.BALL_ICON_TINT_HEX == null) ? "" : String(this.config.BALL_ICON_TINT_HEX);
    var textColorHex = (this.config.BALL_TEXT_COLOR_HEX == null) ? "" : String(this.config.BALL_TEXT_COLOR_HEX);

    var defaultColor = android.graphics.Color.WHITE;

    if (showIcon) {
      var iv = new android.widget.ImageView(context);

      // # 悬浮球内部图标：支持系统 drawable / App 图标 / PNG 文件
      var usedDrawable = null;
      var usedKind = "none";

      // # 1) file：优先加载 PNG
      if (iconType === "file") {
        try {
          var pngMode0 = Number(this.config.BALL_PNG_MODE || 0);
          var iconSizePx0 = (pngMode0 === 0 || pngMode0 === 1) ? di.ballSize : this.dp(Number(this.config.BALL_ICON_SIZE_DP || 22));
          var maxBytes = Number(this.config.BALL_ICON_FILE_MAX_BYTES || 0);
          var maxPx = Number(this.config.BALL_ICON_FILE_MAX_PX || 0);
          usedDrawable = this.loadBallIconDrawableFromFile(iconFilePath, iconSizePx0, maxBytes, maxPx);
          if (usedDrawable != null) {
            usedKind = "file";
          } else {
            safeLog(this.L, 'w',  "Ball icon file load failed: " + iconFilePath);
          }
        } catch (eF) {}
      }

      // # 2) app：加载应用图标 (file 失败也会尝试 app)
      if (usedDrawable == null && (iconType === "app" || iconType === "file")) {
        try {
          var pkgName = this.config.BALL_ICON_PKG ? String(this.config.BALL_ICON_PKG) : "";
          if (pkgName) {
            var pm = context.getPackageManager();
            var appIcon = pm.getApplicationIcon(pkgName);
            if (appIcon != null) {
              usedDrawable = appIcon;
              usedKind = "app";
            }
          }
        } catch (eA) {}
      }

      // # 2.5) shortx：专门加载 ShortX 内置图标（也作为 file 模式的兜底）
      if (usedDrawable == null && (iconType === "shortx" || iconType === "file")) {
        try {
          // # 优先使用配置的图标名称
          var iconResName = this.config.BALL_ICON_RES_NAME ? String(this.config.BALL_ICON_RES_NAME) : "";
          if (iconResName) {
            usedDrawable = this.resolveShortXDrawable(iconResName, this.config.BALL_ICON_TINT_HEX ? String(this.config.BALL_ICON_TINT_HEX) : "");
          }
          // # 失败则使用默认图标
          if (usedDrawable == null) usedDrawable = this.resolveShortXDrawable("ic_shortx", this.config.BALL_ICON_TINT_HEX ? String(this.config.BALL_ICON_TINT_HEX) : "");
          if (usedDrawable == null) usedDrawable = this.resolveShortXDrawable("ic_launcher", this.config.BALL_ICON_TINT_HEX ? String(this.config.BALL_ICON_TINT_HEX) : "");
          if (usedDrawable == null) usedDrawable = this.resolveShortXDrawable("ic_menu_preferences", this.config.BALL_ICON_TINT_HEX ? String(this.config.BALL_ICON_TINT_HEX) : "");
          if (usedDrawable != null) {
            usedKind = iconType === "file" ? "file(shortx兜底)" : "shortx";
            if (iconType === "file") {
              safeLog(this.L, 'i', "File icon failed, fallback to shortx icon");
            }
          }
        } catch (eShortx2) {}
      }

      // # 3) android：或所有兜底，走资源 id（优先尝试 ShortX 内置图标）
      if (usedDrawable == null) {
        // # 优先从 ShortX 包加载内置图标
        try {
          usedDrawable = this.resolveShortXDrawable("ic_shortx", this.config.BALL_ICON_TINT_HEX ? String(this.config.BALL_ICON_TINT_HEX) : "");
          if (usedDrawable == null) {
            usedDrawable = this.resolveShortXDrawable("ic_launcher", this.config.BALL_ICON_TINT_HEX ? String(this.config.BALL_ICON_TINT_HEX) : "");
          }
          if (usedDrawable != null) {
            usedKind = "shortx";
          }
        } catch (eShortx) {}
      }

      if (usedDrawable != null) {
        iv.setImageDrawable(usedDrawable);
      } else if (iconResId > 0) {
        try { iv.setImageResource(iconResId); usedKind = "android"; } catch (eR) {}
      } else {
        // # 没有任何可用图标，直接不加到布局
        usedKind = "none";
      }

      this.state.usedIconKind = usedKind;

      if (usedKind !== "none") {
        var _pngMode1 = Number(this.config.BALL_PNG_MODE || 0);
        if (iconType === "file" && (_pngMode1 === 0 || _pngMode1 === 1)) {
          iv.setScaleType(android.widget.ImageView.ScaleType.FIT_XY);
          var iconSize = di.ballSize;
          var ivLp = new android.widget.LinearLayout.LayoutParams(iconSize, iconSize);
        } else {
          iv.setScaleType(android.widget.ImageView.ScaleType.CENTER_INSIDE);
          var iconSize = this.dp(Number(this.config.BALL_ICON_SIZE_DP || 22));
          var ivLp = new android.widget.LinearLayout.LayoutParams(iconSize, iconSize);
        }
        ivLp.gravity = android.view.Gravity.CENTER;
        iv.setLayoutParams(ivLp);

        // # 颜色滤镜策略：
        // # - android drawable：默认白色（保持旧行为）
        // # - app / file：默认不染色（避免把彩色图标洗成白）
        // # - 只有显式配置 BALL_ICON_TINT_HEX 才强制染色
        if (tintHex.length > 0) {
          try {
            var tintColor2 = android.graphics.Color.parseColor(tintHex);
            iv.setColorFilter(tintColor2, android.graphics.PorterDuff.Mode.SRC_IN);
          } catch (eTint2) {}
        } else if (usedKind === "android") {
          try { iv.setColorFilter(android.graphics.Color.WHITE, android.graphics.PorterDuff.Mode.SRC_IN); } catch (eCF) {}
        } else {
          try { iv.clearColorFilter(); } catch (eCL) {}
        }

        box.addView(iv);
      }
    }

    if (showText) {
      var tv = new android.widget.TextView(context);
      tv.setText(textStr);
      tv.setGravity(android.view.Gravity.CENTER);
      try { tv.setIncludeFontPadding(false); } catch (eFP) {}
      tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, Number(this.config.BALL_TEXT_SIZE_SP || 10));

      var txtColor = defaultColor;
      if (textColorHex.length > 0) {
        try { txtColor = android.graphics.Color.parseColor(textColorHex); } catch (eTC) {}
      } else if (tintHex.length > 0) {
        // # 如果没单独指定文字颜色，则跟随图标颜色
        try { txtColor = android.graphics.Color.parseColor(tintHex); } catch (eTC2) {}
      }
      tv.setTextColor(txtColor);

      // # 设置一点点阴影，提高可读性
      try { tv.setShadowLayer(1.2, 0, 1.0, 0x66000000); } catch (eSH) {}

      // # 图标与文字间距
      if (showIcon) {
        var gap = this.dp(Number(this.config.BALL_ICON_TEXT_GAP_DP || 1));
        var padTop = Math.max(0, gap);
        tv.setPadding(0, padTop, 0, 0);
      }

      box.addView(tv);
    }

    content.addView(box);
  }
} catch (eBallInner) {}


  this.updateBallContentBackground(content);

  // # 阴影控制：file/app 模式下不加阴影（避免透明背景带黑框）
  var _uk = this.state.usedIconKind;
  if (_uk !== "file" && _uk !== "app") {
    try { root.setElevation(this.dp(6)); } catch(e){}
  }

  content.setClickable(true);
  content.setOnTouchListener(this.setupTouchListener());

  root.addView(content);

  this.state.ballRoot = root;
  this.state.ballContent = content;
};

FloatBallAppWM.prototype.createBallLayoutParams = function() {
  var di = this.getDockInfo();

  var lp = new android.view.WindowManager.LayoutParams(
    di.ballSize,
    di.ballSize,
    android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
    android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
    android.graphics.PixelFormat.TRANSLUCENT
  );

  lp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;

  var initX = this.config.BALL_INIT_X;
  var initY = this.dp(this.config.BALL_INIT_Y_DP);

  if (this.state.loadedPos) { initX = this.state.loadedPos.x; initY = this.state.loadedPos.y; }

  lp.x = this.clamp(initX, 0, this.state.screen.w - di.ballSize);
  lp.y = this.clamp(initY, 0, this.state.screen.h - di.ballSize);

  return lp;
};

function runOnMainSync(fn, timeoutMs) {
  if (!fn) return { ok: false, error: "empty-fn" };
  try {
    var mainLooper = android.os.Looper.getMainLooper();
    var myLooper = android.os.Looper.myLooper();
    if (mainLooper !== null && myLooper !== null && myLooper === mainLooper) {
      return { ok: true, value: fn() };
    }
  } catch (eLoop) {}

  try {
    var box = { ok: false, value: null, error: null };
    var latch = new java.util.concurrent.CountDownLatch(1);
    var h = new android.os.Handler(android.os.Looper.getMainLooper());
    h.post(new java.lang.Runnable({
      run: function() {
        try {
          box.value = fn();
          box.ok = true;
        } catch (eRun) {
          box.error = eRun;
        } finally {
          latch.countDown();
        }
      }
    }));
    var waitMs = timeoutMs || 1500;
    var done = latch.await(waitMs, java.util.concurrent.TimeUnit.MILLISECONDS);
    if (!done) return { ok: false, error: "timeout" };
    if (!box.ok) return { ok: false, error: box.error };
    return box;
  } catch (e) {
    return { ok: false, error: e };
  }
}

function registerReceiverOnMain(actions, callback) {
  try {
    var rcv = new JavaAdapter(android.content.BroadcastReceiver, {
      onReceive: function(ctx, intent) {
        try { callback(ctx, intent); } catch (e) { safeLog(null, 'e', "receiver callback fail: " + String(e)); }
      }
    });

    var f = new android.content.IntentFilter();
    var isArray = false;
    try { isArray = (Object.prototype.toString.call(actions) === "[object Array]"); } catch (eArr0) { isArray = false; }
    var actList = isArray ? actions : [String(actions)];
    var i;
    for (i = 0; i < actList.length; i++) {
      f.addAction(String(actList[i]));
    }

    var reg = runOnMainSync(function() {
      context.getApplicationContext().registerReceiver(rcv, f);
      return true;
    }, 2000);
    if (!reg.ok) {
      safeLog(null, 'e', "registerReceiver fail: " + String(reg.error));
      return null;
    }
    return rcv;
  } catch (e) {
    safeLog(null, 'e', "registerReceiverOnMain fatal: " + String(e));
    return null;
  }
}

FloatBallAppWM.prototype.close = function() {
  if (this.state.closing) return;
  this.state.closing = true;

  safeLog(this.L, 'i',  "close begin");

  this.cancelDockTimer();
  this.stopDisplayMonitor();

  try {
    if (this.state.addedBall && this.state.ballLp) this.savePos(this.state.ballLp.x, this.state.ballLp.y);
  } catch (eS) {}
  try { FileIO.flushDebouncedWrites(); } catch (eFlushCfg) { safeLog(this.L, 'e', "flushDebouncedWrites fail: " + String(eFlushCfg)); }

  this.hideAllPanels();

  if (this.state.addedBall && this.state.ballRoot) this.safeRemoveView(this.state.ballRoot, "ballRoot");

  this.state.ballRoot = null;
  this.state.ballContent = null;
  this.state.ballLp = null;
  this.state.addedBall = false;

  // # 注销广播接收器 (修复内存泄漏)
  if (this.state.receivers && this.state.receivers.length > 0) {
    var list = this.state.receivers.slice ? this.state.receivers.slice(0) : this.state.receivers;
    var unreg = runOnMainSync(function() {
      for (var i = 0; i < list.length; i++) {
        try { context.getApplicationContext().unregisterReceiver(list[i]); } catch(e) { safeLog(null, 'e', "unregisterReceiver fail: " + String(e)); }
      }
      return true;
    }, 2000);
    if (!unreg.ok) safeLog(this.L, 'e', "receiver cleanup incomplete: " + String(unreg.error));
    this.state.receivers = [];
  }

  // # 清理 HandlerThread
  try {
    if (this.state.ht) {
      if (android.os.Build.VERSION.SDK_INT >= 18) this.state.ht.quitSafely();
      else this.state.ht.quit();
    }
  } catch (eQ) {}

  // # 清理图标加载线程
  try {
    if (this._iconLoader && this._iconLoader.ht) {
      if (android.os.Build.VERSION.SDK_INT >= 18) this._iconLoader.ht.quitSafely();
      else this._iconLoader.ht.quit();
    }
  } catch (eIcon) {}
  try {
    if (self.__scIconLoaderSingleton && self.__scIconLoaderSingleton.ht) {
      if (android.os.Build.VERSION.SDK_INT >= 18) self.__scIconLoaderSingleton.ht.quitSafely();
      else self.__scIconLoaderSingleton.ht.quit();
    }
  } catch (eScIcon) {}
  try { self.__scIconLoaderSingleton = null; } catch (eScIcon2) {}

  safeLog(this.L, 'i',  "close done");

  // # 清理日志定时器
  try {
    if (this.L) {
      try { this.L._flushBuffer(); } catch (eFlushLog0) { safeLog(this.L, 'e', "logger flush fail: " + String(eFlushLog0)); }
      if (this.L._flushTimer) {
        this.L._flushTimer.cancel();
        this.L._flushTimer = null;
      }
    }
  } catch (eLog) {}

  // # 清空缓存
  try {
    this._iconLru = null;
    this._shortcutIconFailTs = {};
    if (typeof __scIconCache !== "undefined") __scIconCache = {};
    if (typeof __scAppLabelCache !== "undefined") __scAppLabelCache = {};
  } catch (eCache) {}
};

/**
 * 完全销毁实例，释放所有资源
 * 用于长期运行后彻底清理，避免内存泄漏
 */
FloatBallAppWM.prototype.dispose = function() {
  // # 先执行标准关闭流程
  this.close();
  
  // # 清理单例引用
  try {
    if (self.__shortcutPickerSingleton === this.__shortcutPickerSingleton) {
      self.__shortcutPickerSingleton = null;
    }
  } catch (e) {}
  
  // # 清理配置缓存
  this._settingsCache = null;
  this._buttonsCache = null;
  
  // # 清理日志引用
  this.L = null;
  
  // # 标记已销毁
  this.state = { disposed: true };
};

FloatBallAppWM.prototype.startAsync = function(entryProcInfo, closeRule) {
  var self = this;

  var kv = {
    pkg: String((entryProcInfo && entryProcInfo.packageName) ? entryProcInfo.packageName : ""),
    proc: String((entryProcInfo && entryProcInfo.processName) ? entryProcInfo.processName : ""),
    uid: String((entryProcInfo && entryProcInfo.uid) ? entryProcInfo.uid : "")
  };
  var action = applyRule(closeRule, kv);
  if (!action) action = "shortx.wm.floatball.CLOSE";
  this.config.ACTION_CLOSE_ALL = String(action);

  var preCloseSent = false;
  try {
    context.sendBroadcast(new android.content.Intent(String(this.config.ACTION_CLOSE_ALL)));
    preCloseSent = true;
  } catch (e0) {
    try {
      if (typeof shell === "function") {
        shell("am broadcast -a " + String(this.config.ACTION_CLOSE_ALL));
        preCloseSent = true;
      }
    } catch (e1) {}
  }

  var ht = new android.os.HandlerThread(String(this.config.WM_THREAD_NAME));
  ht.start();

  var h = new android.os.Handler(ht.getLooper());

  this.state.ht = ht;
  this.state.h = h;

  // # 注册广播接收器（统一管理）
  var closeRcv = registerReceiverOnMain(this.config.ACTION_CLOSE_ALL, function(ctx, it) {
    try {
      h.post(new JavaAdapter(java.lang.Runnable, {
        run: function() { try { self.close(); } catch (e1) {} }
      }));
    } catch (e2) {}
  });
  if (closeRcv) this.state.receivers.push(closeRcv);

  var cfgRcv = registerReceiverOnMain(
    [android.content.Intent.ACTION_CONFIGURATION_CHANGED, android.content.Intent.ACTION_WALLPAPER_CHANGED],
    function(ctx, intent) {
      try {
        var act = String(intent.getAction());
        h.post(new JavaAdapter(java.lang.Runnable, {
          run: function() {
            try {
              if (self.state.closing) return;

              if (act === android.content.Intent.ACTION_CONFIGURATION_CHANGED) {
                self.cancelDockTimer();
                self.onScreenChangedReflow();
                self.touchActivity();
              }

              if (self.state.ballContent) self.updateBallContentBackground(self.state.ballContent);
              if (self.state.panel) self.updatePanelBackground(self.state.panel);
              if (self.state.settingsPanel) self.updatePanelBackground(self.state.settingsPanel);
              if (self.state.viewerPanel) self.updatePanelBackground(self.state.viewerPanel);
            } catch (e1) {}
          }
        }));
      } catch (e0) {}
    }
  );
  if (cfgRcv) this.state.receivers.push(cfgRcv);

  h.post(new JavaAdapter(java.lang.Runnable, {
    run: function() {
      try {
        self.state.wm = context.getSystemService(android.content.Context.WINDOW_SERVICE);
        self.state.density = context.getResources().getDisplayMetrics().density;

        if (self.L) self.L.updateConfig(self.config);

        self.state.loadedPos = self.loadSavedPos();

        self.state.screen = self.getScreenSizePx();
        self.state.lastRotation = self.getRotation();

        self.createBallViews();
        self.state.ballLp = self.createBallLayoutParams();

        try {
          self.state.wm.addView(self.state.ballRoot, self.state.ballLp);
          self.state.addedBall = true;
        } catch (eAdd) {
          try { self.toast("悬浮球 addView 失败: " + String(eAdd)); } catch (eT) {}
          if (self.L) self.L.fatal("addView ball fail err=" + String(eAdd));
          self.state.addedBall = false;
          try { self.close(); } catch (eC) {}
          return;
        }

        self.setupDisplayMonitor();
        self.touchActivity();

        if (self.L) {
          self.L.i("start ok actionClose=" + String(self.config.ACTION_CLOSE_ALL));
          self.L.i("ball x=" + String(self.state.ballLp.x) + " y=" + String(self.state.ballLp.y) + " sizeDp=" + String(self.config.BALL_SIZE_DP));
        }
      } catch (eAll) {
        try { self.toast("启动异常: " + String(eAll)); } catch (eTT2) {}
        if (self.L) self.L.fatal("start runnable err=" + String(eAll));
        try { self.close(); } catch (eC2) {}
      }
    }
  }));

  return {
    ok: true,
    msg: "已按 WM 专属 HandlerThread 模型启动（Shell 默认 Action，失败广播桥兜底；Content URI 已启用）",
    preCloseBroadcastSent: preCloseSent,
    closeAction: String(this.config.ACTION_CLOSE_ALL),
    receiverRegisteredOnMain: {
            // 修复：旧版本遗留变量 closeRegistered/cfgRegistered 可能未定义，避免触发 ReferenceError 导致重启
      close: (typeof closeRegistered !== "undefined") ? !!closeRegistered : false,
      config: (typeof cfgRegistered !== "undefined") ? !!cfgRegistered : false
    },
    cfgPanelKey: this.currentPanelKey,
    buttons: (this.panels && this.panels[this.currentPanelKey]) ? this.panels[this.currentPanelKey].length : 0,
    layout: { cols: this.config.PANEL_COLS, rows: this.config.PANEL_ROWS },
    threadModel: {
      entryThreadMustNotTouchWM: true,
      perOverlaySingleHandlerThread: true,
      wmThreadName: String(this.config.WM_THREAD_NAME)
    },
    shell: {
      useActionFirst: false, // 已移除 ShellCommand Action
      hasShellCommand: false, // 已移除 ShellCommand Action
      bridge: {
        action: String(this.config.SHELL_BRIDGE_ACTION),
        extraCmd: String(this.config.SHELL_BRIDGE_EXTRA_CMD),
        extraRoot: String(this.config.SHELL_BRIDGE_EXTRA_ROOT),
        defaultRoot: !!this.config.SHELL_BRIDGE_DEFAULT_ROOT
      }
    },
    content: {
      maxRows: Number(this.config.CONTENT_MAX_ROWS || 20),
      viewerTextSp: Number(this.config.CONTENT_VIEWER_TEXT_SP || 12)
    }
  };
};

// =======================【执行（入口线程）】======================
var __out = (function() {
  var entryInfo = getProcessInfo("entry");

  // # 初始化 logger
  var logger = new ToolHubLogger(entryInfo);
  // # 安装崩溃处理
  var crashHandlerInstalled = installCrashHandler(logger);

  // # 启动 app
  var app = new FloatBallAppWM(logger);

  // # 计算广播 action（支持规则）
  var closeRule = String(app.config.ACTION_CLOSE_ALL_RULE || "shortx.wm.floatball.CLOSE");

  var startRet = null;

  try {
    startRet = app.startAsync(entryInfo, closeRule);
  } catch (eTop) {
    try { logger.fatal("TOP startAsync crash err=" + String(eTop)); } catch (eLog) {}
    startRet = { ok: false, err: String(eTop) };
  }

  // # 中文摘要（方便 ShortX 日志/结果中快速识别）
  var _btnCount = (startRet && startRet.buttons != null) ? startRet.buttons : 0;
  var _layout = (startRet && startRet.layout) ? startRet.layout : { cols: app.config.PANEL_COLS, rows: app.config.PANEL_ROWS };
  var _closeAction = String(startRet && startRet.closeAction ? startRet.closeAction : "shortx.wm.floatball.CLOSE");
  var _logEnabled = !!app.config.LOG_ENABLE;
  var _logDays = Math.max(1, Math.floor(Number(app.config.LOG_KEEP_DAYS || 3)));

  // # 返回信息
  return {
    ok: true,
    result: startRet,
    process: entryInfo,
    crashHandlerInstalled: !!crashHandlerInstalled,
    log: {
      enable: _logEnabled,
      debug: !!app.config.LOG_DEBUG,
      keepDays: _logDays,
      dirActive: String(logger.dir || ""),
      prefix: String(app.config.LOG_PREFIX || "ShortX_ToolHub"),
      lastInitErr: String(logger.lastInitErr || "")
    },
    shell: {
      useActionFirstDefault: false,
      hasShellCommandClass: false,
      bridge: {
        action: String(app.config.SHELL_BRIDGE_ACTION),
        extraCmd: String(app.config.SHELL_BRIDGE_EXTRA_CMD),
        extraFrom: String(app.config.SHELL_BRIDGE_EXTRA_FROM),
        extraRoot: String(app.config.SHELL_BRIDGE_EXTRA_ROOT),
        defaultRoot: !!app.config.SHELL_BRIDGE_DEFAULT_ROOT
      }
    },
    content: {
      maxRows: Number(app.config.CONTENT_MAX_ROWS || 20),
      viewerTextSp: Number(app.config.CONTENT_VIEWER_TEXT_SP || 12)
    },
    suggestCloseShell: "am broadcast -a " + _closeAction,
    suggestTaskerProfile: {
      event: "Intent Received",
      action: String(app.config.SHELL_BRIDGE_ACTION),
      readExtras: [
        { key: String(app.config.SHELL_BRIDGE_EXTRA_CMD), var: "%cmd" },
        { key: String(app.config.SHELL_BRIDGE_EXTRA_ROOT), var: "%root" }
      ],
      exec: "Run Shell (root=%root)  cmd=%cmd"
    },
    // ========== 中文摘要（供 ShortX 结果查看）==========
    状态: (startRet && startRet.ok) ? "✅ 启动成功" : "❌ 启动失败",
    悬浮球: (startRet && startRet.ok) ? "已显示" : "未显示",
    关闭指令: "am broadcast -a " + _closeAction,
    按钮数量: String(_btnCount) + " 个",
    面板布局: String(_layout.cols) + " 列 × " + String(_layout.rows) + " 行",
    日志: (_logEnabled ? "📝 已启用" : "📝 已禁用") + " · 保留 " + String(_logDays) + " 天",
    崩溃处理: !!crashHandlerInstalled ? "🛡️ 已安装" : "⚠️ 未安装",
    线程模型: "HandlerThread（WM 专属）",
    消息: (startRet && startRet.msg) ? String(startRet.msg) : ""
  };
})();

JSON.stringify(__out);
