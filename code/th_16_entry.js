// @version 1.0.7

// =======================【热修：按钮编辑保存返回保留临时按钮】=======================
// 这段代码的主要内容/用途：修复 ToolApp 页面栈在“添加工具→先存起来→返回列表”时恢复旧快照，导致 tempButtons 被重新从 buttons.json 覆盖的问题。
// 只处理 button_edit_save 场景，不影响普通返回/取消编辑。
(function() {
  try {
    if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
    var proto = FloatBallAppWM.prototype;
    if (proto.__toolHubButtonEditSaveStatePatchInstalled === true) return;
    if (typeof proto.popToolAppPage !== "function") return;

    proto.normalizeButtonEditorShortcutIntentModes = function() {
      try {
        var arr = this.state && this.state.tempButtons ? this.state.tempButtons : null;
        if (!arr || arr.length === undefined) return false;
        var changed = false;
        for (var i = 0; i < arr.length; i++) {
          var b = arr[i];
          if (!b) continue;
          var t = "";
          try { t = String(b.type || ""); } catch(eT) { t = ""; }
          if (t !== "shortcut") continue;
          var iu = "";
          try { iu = String(b.intentUri || ""); } catch(eIu) { iu = ""; }
          if (!iu || iu.length <= 0) continue;
          b.shortcutExecMode = "intent";
          b.shortcutRunMode = "intent";
          changed = true;
        }
        if (changed) {
          try { safeLog(this.L, 'i', "shortcut intent mode normalized on button_edit_save"); } catch(eLogNorm) {}
        }
        return changed;
      } catch(eNorm) {
        try { safeLog(this.L, 'w', "normalize shortcut intent mode fail: " + String(eNorm)); } catch(eLogNorm2) {}
      }
      return false;
    };

    var oldPopToolAppPage = proto.popToolAppPage;
    proto.popToolAppPage = function(reason) {
      var rs = String(reason || "");
      if (rs === "button_edit_save") {
        try {
          if (this.normalizeButtonEditorShortcutIntentModes) this.normalizeButtonEditorShortcutIntentModes();
        } catch(eNormCall) {
          try { safeLog(this.L, 'w', "button edit shortcut mode normalize call fail: " + String(eNormCall)); } catch(eLogN) {}
        }
        try {
          var st = this.state && this.state.toolAppNavStack ? this.state.toolAppNavStack : null;
          if (st && st.length > 1) {
            var prev = st[st.length - 2];
            if (prev && String(prev.route || "") === "btn_editor") {
              prev.editingButtonIndex = null;
              prev.keepBtnEditorState = true;
              prev.toolAppScrollY = 0;
            }
          }
          if (this.state) {
            this.state.editingButtonIndex = null;
            this.state.keepBtnEditorState = true;
          }
        } catch(ePatchBefore) {
          try { safeLog(this.L, 'w', "button edit save state patch before pop fail: " + String(ePatchBefore)); } catch(eLog0) {}
        }
      }

      var ret = oldPopToolAppPage.call(this, reason);

      if (rs === "button_edit_save") {
        try {
          if (this.state && String(this.state.toolAppRoute || "") === "btn_editor") {
            this.state.editingButtonIndex = null;
            this.state.keepBtnEditorState = true;
          }
        } catch(ePatchAfter) {
          try { safeLog(this.L, 'w', "button edit save state patch after pop fail: " + String(ePatchAfter)); } catch(eLog1) {}
        }
      }
      return ret;
    };

    proto.__toolHubButtonEditSaveStatePatchInstalled = true;
  } catch(eInstall) {
    try { safeLog(null, 'e', "install button edit save state patch fail: " + String(eInstall)); } catch(eLog2) {}
  }
})();

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

  try {
    if (typeof this.closePointerTool === "function") this.closePointerTool("ToolHub 关闭", true);
  } catch (ePointerClose) { safeLog(this.L, 'e', "closePointerTool fail: " + String(ePointerClose)); }

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
    if (this.__scIconLoaderSingleton && this.__scIconLoaderSingleton.ht) {
      if (android.os.Build.VERSION.SDK_INT >= 18) this.__scIconLoaderSingleton.ht.quitSafely();
      else this.__scIconLoaderSingleton.ht.quit();
    }
  } catch (eScIcon) {}
  try { this.__scIconLoaderSingleton = null; } catch (eScIcon2) {}

  safeLog(this.L, 'i',  "close done");
  this.state.closed = true;
  try { if (typeof unregisterToolHubAppInstance === "function") unregisterToolHubAppInstance(this); } catch (eUnregApp) {}

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
                self.scheduleScreenReflow("configuration_changed");
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

  var sysDlgRcv = registerReceiverOnMain("android.intent.action.CLOSE_SYSTEM_DIALOGS", function(ctx, intent) {
    try {
      var reason = "";
      try { reason = String(intent.getStringExtra("reason") || ""); } catch (eReason) { reason = ""; }
      h.post(new JavaAdapter(java.lang.Runnable, {
        run: function() { try { self.handleSystemUiDismiss(reason); } catch (eSysDlg) {} }
      }));
    } catch (eSysDlgOuter) {}
  });
  if (sysDlgRcv) this.state.receivers.push(sysDlgRcv);

  var startBox = { ok: false, err: "启动确认超时", added: false };
  var startLatch = new java.util.concurrent.CountDownLatch(1);
  var posted = false;
  try {
    posted = h.post(new JavaAdapter(java.lang.Runnable, {
      run: function() {
        try {
          self.state.wm = context.getSystemService(android.content.Context.WINDOW_SERVICE);
          self.state.density = context.getResources().getDisplayMetrics().density;

          if (self.L) self.L.updateConfig(self.config);

          self.state.screen = self.getScreenSizePx();
          self.state.lastRotation = self.getRotation();
          self.state.loadedPos = self.loadSavedPos();

          self.createBallViews();
          self.state.ballLp = self.createBallLayoutParams();

          try {
            self.state.wm.addView(self.state.ballRoot, self.state.ballLp);
            self.state.addedBall = true;
            startBox.added = true;
          } catch (eAdd) {
            startBox.ok = false;
            startBox.err = "悬浮球 addView 失败: " + String(eAdd);
            try { self.toast(startBox.err); } catch (eT) {}
            if (self.L) self.L.fatal("addView ball fail err=" + String(eAdd));
            self.state.addedBall = false;
            try { self.close(); } catch (eC) {}
            return;
          }

          self.setupDisplayMonitor();
          self.touchActivity();

          startBox.ok = true;
          startBox.err = "";
          if (self.L) {
            self.L.i("start ok actionClose=" + String(self.config.ACTION_CLOSE_ALL));
            self.L.i("ball x=" + String(self.state.ballLp.x) + " y=" + String(self.state.ballLp.y) + " sizeDp=" + String(self.config.BALL_SIZE_DP));
          }
        } catch (eAll) {
          startBox.ok = false;
          startBox.err = "启动异常: " + String(eAll);
          try { self.toast(startBox.err); } catch (eTT2) {}
          if (self.L) self.L.fatal("start runnable err=" + String(eAll));
          try { self.close(); } catch (eC2) {}
        } finally {
          try { startLatch.countDown(); } catch (eLatch) {}
        }
      }
    }));
  } catch (ePost) {
    posted = false;
    startBox.ok = false;
    startBox.err = "启动任务投递失败: " + String(ePost);
    try { startLatch.countDown(); } catch (eLatch2) {}
  }

  if (!posted) {
    startBox.ok = false;
    if (!startBox.err) startBox.err = "启动任务投递失败";
  } else {
    try {
      var done = startLatch.await(2500, java.util.concurrent.TimeUnit.MILLISECONDS);
      if (!done && self.L) self.L.e("start confirm timeout; addView result unknown");
    } catch (eWait) {
      startBox.ok = false;
      startBox.err = "启动确认等待异常: " + String(eWait);
    }
  }

  return {
    ok: !!startBox.ok,
    err: String(startBox.err || ""),
    msg: startBox.ok ? "悬浮球 addView 已确认成功" : String(startBox.err || "启动失败"),
    preCloseBroadcastSent: preCloseSent,
    closeAction: String(this.config.ACTION_CLOSE_ALL),
    receiverRegisteredOnMain: {
      close: !!closeRcv,
      config: !!cfgRcv,
      systemDialogs: !!sysDlgRcv
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
      hasContentAction: typeof this.execContentAction === "function",
      maxRows: Number(this.config.CONTENT_MAX_ROWS || 20),
      viewerTextSp: Number(this.config.CONTENT_VIEWER_TEXT_SP || 12)
    }
  };
};