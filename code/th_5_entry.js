// @version 1.0.0
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

