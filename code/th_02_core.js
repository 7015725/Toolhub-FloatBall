// @version 1.0.0
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
    viewerPanelType: null,
    panelBackCallbackEntries: [],
    predictiveBackIndicatorView: null,
    predictiveBackIndicatorLp: null,

    // 设置类 UI App 化：单窗口页面栈（settings -> 子页面 -> 编辑页）
    toolAppActive: false,
    toolAppNavStack: [],
    toolAppRoute: null,
    toolAppRoot: null,
    toolAppContentHost: null,
    toolAppTitleView: null,
    toolAppBackButton: null,
    settingsGroupKey: null,

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

    // 按钮管理首页：搜索过滤状态
    buttonManagerQuery: "",

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
  try { this.refreshMonetColors(this.isDarkTheme());  } catch(eM) { safeLog(null, 'e', "catch " + String(eM)); }
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
        run: function() { try { fn.call(self);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); } }
      }));
    } else {
      // 兜底：直接执行（如果已经在 UI 线程）或尝试使用 Handler
      try {
        var h = new android.os.Handler(android.os.Looper.getMainLooper());
        h.post(new java.lang.Runnable({
          run: function() { try { fn.call(self);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); } }
        }));
      } catch(e) {
        // 最后兜底：直接执行
        try { fn.call(self);  } catch(e2) { safeLog(null, 'e', "catch " + String(e2)); }
      }
    }
   } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
};

// # 这段代码的主要内容/用途：统一图标缓存（LRU），减少反复解码/反复走 PackageManager，降低卡顿与内存波动（不改变 UI 与功能）
// 优化后的图标缓存（带 Bitmap 回收，防止内存泄漏）
