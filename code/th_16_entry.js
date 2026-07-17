// @version 1.0.17

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

function runOnMainSync(fn, timeoutMs, onLateSuccess) {
  if (!fn) return { ok: false, error: "empty-fn" };
  try {
    var mainLooper = android.os.Looper.getMainLooper();
    var myLooper = android.os.Looper.myLooper();
    if (mainLooper !== null && myLooper !== null && myLooper === mainLooper) {
      return { ok: true, value: fn(), direct: true };
    }
  } catch (eLoop) {}

  try {
    var box = { ok: false, value: null, error: null, active: true, started: false, completed: false, lateHandled: false };
    var latch = new java.util.concurrent.CountDownLatch(1);
    var h = new android.os.Handler(android.os.Looper.getMainLooper());
    var task = new java.lang.Runnable({
      run: function() {
        var value = null;
        var success = false;
        box.started = true;
        try {
          if (!box.active) return;
          value = fn();
          success = true;
          if (!box.active) {
            box.lateHandled = true;
            try { if (onLateSuccess) onLateSuccess(value); } catch (eLate) {
              try { safeLog(null, 'e', "late main task cleanup fail: " + String(eLate)); } catch (eLateLog) {}
            }
            return;
          }
          box.value = value;
          box.ok = true;
        } catch (eRun) {
          if (box.active) box.error = eRun;
        } finally {
          box.completed = true;
          if (!box.active && success && box.lateHandled !== true) {
            box.lateHandled = true;
            try { if (onLateSuccess) onLateSuccess(value); } catch (eLate2) {}
          }
          try { latch.countDown(); } catch (eCount) {}
        }
      }
    });
    var posted = h.post(task);
    if (!posted) return { ok: false, error: "post-failed" };
    var waitMs = timeoutMs || 1500;
    var done = latch.await(waitMs, java.util.concurrent.TimeUnit.MILLISECONDS);
    if (!done) {
      box.active = false;
      try { h.removeCallbacks(task); } catch (eRemove) {}
      return { ok: false, error: "timeout", timedOut: true, started: box.started === true };
    }
    box.active = false;
    if (!box.ok) return { ok: false, error: box.error };
    return box;
  } catch (e) {
    return { ok: false, error: e };
  }
}

function registerReceiverOnMain(actions, callback, allowExternal) {
  try {
    var appCtx = context.getApplicationContext();
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

    function unregisterLateReceiver() {
      try { appCtx.unregisterReceiver(rcv); } catch (eLateUnreg) {
        try { safeLog(null, 'w', "late receiver cleanup skipped: " + String(eLateUnreg)); } catch (eLateLog) {}
      }
    }

    var reg = runOnMainSync(function() {
      if (android.os.Build.VERSION.SDK_INT >= 33) {
        var receiverFlag = allowExternal === true
          ? android.content.Context.RECEIVER_EXPORTED
          : android.content.Context.RECEIVER_NOT_EXPORTED;
        appCtx.registerReceiver(rcv, f, receiverFlag);
      } else {
        appCtx.registerReceiver(rcv, f);
      }
      return true;
    }, 2000, unregisterLateReceiver);
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
  if (!this.state) return;
  if (this.state.closed === true) {
    try { if (typeof unregisterToolHubAppInstance === "function") unregisterToolHubAppInstance(this); } catch (eAlreadyUnreg) {}
    return;
  }
  if (this.state.closing) return;

  var self = this;
  var stateRef = this.state;
  stateRef.closing = true;
  safeLog(this.L, 'i', "close begin");

  function closeStep(name, fn) {
    try {
      if (fn) fn();
      return true;
    } catch (eStep) {
      try { safeLog(self.L, 'e', "close step fail name=" + String(name) + " err=" + String(eStep)); } catch (eLogStep) {}
      return false;
    }
  }

  try {
    closeStep("cancelDockTimer", function() { self.cancelDockTimer(); });
    closeStep("stopDisplayMonitor", function() { self.stopDisplayMonitor(); });
    closeStep("cancelConfiguredBallPositionApply", function() {
      if (typeof self.cancelConfiguredBallPositionApply === "function") self.cancelConfiguredBallPositionApply();
    });
    closeStep("cancelBallLayoutAnimation", function() {
      if (typeof self.cancelBallLayoutAnimation === "function") self.cancelBallLayoutAnimation("close");
    });

    closeStep("savePos", function() {
      if (stateRef.addedBall && stateRef.ballLp) self.savePos(stateRef.ballLp.x, stateRef.ballLp.y);
    });
    closeStep("flushDebouncedWrites", function() {
      if (FileIO.flushDebouncedWrites() === false) throw "flush returned false";
    });
    closeStep("disposeResultPreview", function() {
      if (typeof self.disposeResultPreview === "function") self.disposeResultPreview("ToolHub 关闭");
    });
    closeStep("disposePickwordModule", function() {
      if (typeof self.disposePickwordModule === "function") self.disposePickwordModule("ToolHub 关闭");
    });
    closeStep("closePointerTool", function() {
      if (typeof self.closePointerTool === "function") self.closePointerTool("ToolHub 关闭", true);
    });
    var allPanelsHidden = closeStep("hideAllPanels", function() { self.hideAllPanels(); });
    if (!allPanelsHidden) {
      closeStep("hideMainPanelFallback", function() { self.hideMainPanel(); });
      closeStep("hideSettingsPanelFallback", function() { self.hideSettingsPanel(); });
      closeStep("hideViewerPanelFallback", function() { self.hideViewerPanel(); });
      closeStep("hideMaskFallback", function() { self.hideMask(); });
    }

    function removeResidualView(viewKey, label) {
      var view = stateRef[viewKey];
      if (!view) return;
      var ret = self.safeRemoveView(view, label);
      if (ret && ret.ok === false) throw String(ret.err || (label + " remove failed"));
    }

    closeStep("removeResidualMainPanel", function() { removeResidualView("panel", "panel-close-residual"); });
    closeStep("removeResidualSettingsPanel", function() { removeResidualView("settingsPanel", "settingsPanel-close-residual"); });
    closeStep("removeResidualViewerPanel", function() { removeResidualView("viewerPanel", "viewerPanel-close-residual"); });
    closeStep("removeResidualMask", function() { removeResidualView("mask", "mask-close-residual"); });
    closeStep("removeBall", function() {
      if (!stateRef.ballRoot) return;
      var ballRet = self.safeRemoveView(stateRef.ballRoot, "ballRoot");
      if (ballRet && ballRet.ok === false) throw String(ballRet.err || "ball remove failed");
    });

    closeStep("unregisterReceivers", function() {
      if (!stateRef.receivers || stateRef.receivers.length <= 0) return;
      var list = stateRef.receivers.slice ? stateRef.receivers.slice(0) : stateRef.receivers;
      var unreg = runOnMainSync(function() {
        for (var i = 0; i < list.length; i++) {
          try { context.getApplicationContext().unregisterReceiver(list[i]); }
          catch (eOne) { try { safeLog(null, 'e', "unregisterReceiver fail: " + String(eOne)); } catch (eOneLog) {} }
        }
        return true;
      }, 2000);
      if (!unreg.ok) safeLog(self.L, 'e', "receiver cleanup incomplete: " + String(unreg.error));
    });

    closeStep("quitHandlerThread", function() {
      if (!stateRef.ht) return;
      if (android.os.Build.VERSION.SDK_INT >= 18) stateRef.ht.quitSafely();
      else stateRef.ht.quit();
    });
    closeStep("quitIconLoader", function() {
      if (!self._iconLoader || !self._iconLoader.ht) return;
      if (android.os.Build.VERSION.SDK_INT >= 18) self._iconLoader.ht.quitSafely();
      else self._iconLoader.ht.quit();
    });
    closeStep("quitShortcutIconLoader", function() {
      if (!self.__scIconLoaderSingleton || !self.__scIconLoaderSingleton.ht) return;
      if (android.os.Build.VERSION.SDK_INT >= 18) self.__scIconLoaderSingleton.ht.quitSafely();
      else self.__scIconLoaderSingleton.ht.quit();
    });
  } finally {
    closeStep("clearViewState", function() {
      stateRef.ballRoot = null;
      stateRef.ballContent = null;
      stateRef.ballLp = null;
      stateRef.addedBall = false;
      stateRef.panel = null;
      stateRef.panelLp = null;
      stateRef.addedPanel = false;
      stateRef.settingsPanel = null;
      stateRef.settingsPanelLp = null;
      stateRef.addedSettings = false;
      stateRef.viewerPanel = null;
      stateRef.viewerPanelLp = null;
      stateRef.viewerPanelType = null;
      stateRef.addedViewer = false;
      stateRef.mask = null;
      stateRef.maskLp = null;
      stateRef.addedMask = false;
      stateRef.toolAppRoot = null;
      stateRef.toolAppBody = null;
      stateRef.toolAppContentHost = null;
      stateRef.toolAppBackPreviewView = null;
      stateRef.toolAppBackPreviewRoute = null;
      stateRef.toolAppBackPreviewReady = false;
      stateRef.toolAppTitleView = null;
      stateRef.toolAppBackButton = null;
      stateRef.toolAppActive = false;
      stateRef.toolAppRoute = null;
      stateRef.toolAppNavStack = [];
      stateRef.panelBackCallbackEntries = [];
      stateRef.resultPreview = null;
      stateRef.pickword = null;
      stateRef.receivers = [];
      stateRef.ht = null;
      stateRef.h = null;
    });
    closeStep("clearLoaderState", function() {
      self.__scIconLoaderSingleton = null;
      self._iconLru = null;
      self._shortcutIconFailTs = {};
      if (typeof __scIconCache !== "undefined") __scIconCache = {};
      if (typeof __scAppLabelCache !== "undefined") __scAppLabelCache = {};
    });

    stateRef.closed = true;
    stateRef.closing = false;
    try { if (typeof unregisterToolHubAppInstance === "function") unregisterToolHubAppInstance(self); } catch (eUnregApp) {}
    safeLog(self.L, 'i', "close done");
  }
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
  }, true);
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
                try {
                  if (typeof self.onResultPreviewConfigurationChanged === "function") self.onResultPreviewConfigurationChanged();
                } catch (ePreviewReflow) {}
                try {
                  if (typeof self.onPickwordConfigurationChanged === "function") self.onPickwordConfigurationChanged();
                } catch (ePickwordReflow) {}
                self.touchActivity();
              }

              if (self.state.ballContent) self.updateBallContentBackground(self.state.ballContent);
              if (self.state.panel) self.updatePanelBackground(self.state.panel);
              if (self.state.settingsPanel) self.updatePanelBackground(self.state.settingsPanel);
              if (self.state.viewerPanel) {
                var viewerRef = self.state.viewerPanel;
                if (String(self.state.viewerPanelType || "") === "tool_app" && self.postToAndroidMain) {
                  self.postToAndroidMain(function() {
                    try {
                      if (self.state.viewerPanel === viewerRef) self.updatePanelBackground(viewerRef);
                    } catch (eViewerTheme) {}
                  });
                } else self.updatePanelBackground(viewerRef);
              }
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

  var startBox = { ok: false, err: "启动确认超时", added: false, active: true, timedOut: false };
  var startLatch = new java.util.concurrent.CountDownLatch(1);
  var startToken = Number(this.state.startGeneration || 0) + 1;
  this.state.startGeneration = startToken;
  var posted = false;
  var startTask = null;

  function isStartCurrent() {
    return startBox.active === true &&
      Number(self.state.startGeneration || 0) === startToken &&
      self.state.closing !== true &&
      self.state.closed !== true;
  }

  function closeLateStart(reason) {
    try {
      if (self.L) self.L.e("late start cancelled token=" + String(startToken) + " reason=" + String(reason || ""));
    } catch (eLogLate) {}
    try { self.close(); } catch (eCloseLate) {
      try { safeLog(self.L, 'e', "late start cleanup fail: " + String(eCloseLate)); } catch (eLogCloseLate) {}
    }
  }

  try {
    startTask = new JavaAdapter(java.lang.Runnable, {
      run: function() {
        try {
          if (!isStartCurrent()) return;
          self.state.wm = context.getSystemService(android.content.Context.WINDOW_SERVICE);
          self.state.density = context.getResources().getDisplayMetrics().density;

          if (self.L) self.L.updateConfig(self.config);

          self.state.screen = self.getScreenSizePx();
          self.state.lastRotation = self.getRotation();
          self.state.loadedPos = self.loadSavedPos();

          self.createBallViews();
          self.state.ballLp = self.createBallLayoutParams();
          if (!isStartCurrent()) {
            closeLateStart("before_add_view");
            return;
          }

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

          if (!isStartCurrent()) {
            closeLateStart("after_add_view");
            return;
          }

          self.setupDisplayMonitor();
          self.touchActivity();

          if (!isStartCurrent()) {
            closeLateStart("after_start_hooks");
            return;
          }

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
    });
    posted = h.post(startTask);
  } catch (ePost) {
    posted = false;
    startBox.ok = false;
    startBox.err = "启动任务投递失败: " + String(ePost);
    try { startLatch.countDown(); } catch (eLatch2) {}
  }

  if (!posted) {
    startBox.active = false;
    this.state.startGeneration = startToken + 1;
    startBox.ok = false;
    if (!startBox.err) startBox.err = "启动任务投递失败";
    try { this.close(); } catch (eClosePostFail) {}
  } else {
    try {
      var done = startLatch.await(2500, java.util.concurrent.TimeUnit.MILLISECONDS);
      if (!done) {
        startBox.active = false;
        startBox.timedOut = true;
        startBox.ok = false;
        startBox.err = "启动确认超时，已取消迟到启动";
        this.state.startGeneration = startToken + 1;
        try { h.removeCallbacks(startTask); } catch (eRemoveStart) {}
        try {
          h.post(new JavaAdapter(java.lang.Runnable, {
            run: function() { closeLateStart("confirm_timeout"); }
          }));
        } catch (ePostCleanup) {
          try { this.close(); } catch (eCloseTimeout) {}
        }
        if (self.L) self.L.e("start confirm timeout; late start invalidated token=" + String(startToken));
      }
    } catch (eWait) {
      startBox.active = false;
      startBox.ok = false;
      startBox.err = "启动确认等待异常: " + String(eWait);
      this.state.startGeneration = startToken + 1;
      try { h.removeCallbacks(startTask); } catch (eRemoveWait) {}
      try { this.close(); } catch (eCloseWait) {}
    }
  }

  return {
    ok: !!startBox.ok,
    err: String(startBox.err || ""),
    msg: startBox.ok ? "悬浮球 addView 已确认成功" : String(startBox.err || "启动失败"),
    startTimedOut: startBox.timedOut === true,
    startGeneration: startToken,
    preCloseBroadcastSent: preCloseSent,
    closeAction: String(this.config.ACTION_CLOSE_ALL),
    receiverRegisteredOnMain: {
      close: !!closeRcv,
      config: !!cfgRcv,
      systemDialogs: !!sysDlgRcv
    },
    cfgPanelKey: this.currentPanelKey,
    buttons: (this.panels && this.panels[this.currentPanelKey]) ? this.panels[this.currentPanelKey].length : 0,
    layout: (function(app) {
      try {
        var spec = app.getMainPanelResponsiveSpec
          ? app.getMainPanelResponsiveSpec(false)
          : null;
        return {
          mode: spec ? String(spec.layoutMode || "") : "adaptive_grid_sized",
          cols: spec ? Number(spec.cols || 0) : 0,
          rows: spec ? Number(spec.visibleRows || 0) : Number(app.config.PANEL_ROWS || 0)
        };
      } catch (eLayout) {
        return {
          mode: "adaptive_grid_sized",
          cols: 0,
          rows: Number(app.config.PANEL_ROWS || 0)
        };
      }
    })(this),
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

// =======================【ToolApp Android 主线程归属】=======================
FloatBallAppWM.prototype.isAndroidMainThread = function() {
  try { return android.os.Looper.myLooper() === android.os.Looper.getMainLooper(); }
  catch (e) { return false; }
};

FloatBallAppWM.prototype.isToolHubWmThread = function() {
  try {
    return !!(this.state && this.state.h &&
      android.os.Looper.myLooper() === this.state.h.getLooper());
  } catch (e) { return false; }
};

FloatBallAppWM.prototype.toolAppThreadInfo = function() {
  try {
    return "thread=" + String(java.lang.Thread.currentThread().getName()) +
      " javaTid=" + String(java.lang.Thread.currentThread().getId()) +
      " isMain=" + String(this.isAndroidMainThread());
  } catch (e) { return "thread=unknown"; }
};

FloatBallAppWM.prototype.makeToolAppRunnable = function(fn) {
  return new JavaAdapter(java.lang.Runnable, {
    run: function() {
      try { if (fn) fn(); }
      catch (eRun) {
        try { safeLog(null, 'e', "toolapp runnable fail: " + String(eRun)); } catch (eLog) {}
      }
    }
  });
};

FloatBallAppWM.prototype.postToAndroidMain = function(fn) {
  if (!fn) return false;
  if (this.isAndroidMainThread()) {
    fn();
    return true;
  }
  try {
    var h = new android.os.Handler(android.os.Looper.getMainLooper());
    return !!h.post(this.makeToolAppRunnable(fn));
  } catch (ePost) {
    safeLog(this.L, 'e', "post android main fail: " + String(ePost));
  }
  return false;
};

FloatBallAppWM.prototype.postToToolHubWm = function(fn) {
  if (!fn) return false;
  if (this.isToolHubWmThread()) {
    fn();
    return true;
  }
  try {
    return !!(this.state && this.state.h &&
      this.state.h.post(this.makeToolAppRunnable(fn)));
  } catch (ePost) {
    safeLog(this.L, 'e', "post toolhub wm fail: " + String(ePost));
  }
  return false;
};

FloatBallAppWM.prototype.runOnToolAppMainSync = function(fn, timeoutMs) {
  if (!fn) return { ok: false, error: "empty-fn" };
  if (this.isAndroidMainThread()) {
    try { return { ok: true, value: fn(), direct: true }; }
    catch (eDirect) { return { ok: false, error: eDirect }; }
  }
  try {
    if (typeof runOnMainSync === "function") {
      return runOnMainSync(fn, timeoutMs || 3000);
    }
  } catch (eMain) {
    return { ok: false, error: eMain };
  }
  return { ok: false, error: "main-helper-missing" };
};

FloatBallAppWM.prototype.prepareToolAppHostOnWm = function() {
  if (!this.state || this.state.closing || this.state.closed) return false;
  if (!this.isToolHubWmThread()) {
    safeLog(this.L, 'e', "prepare toolapp host blocked wrong thread " + this.toolAppThreadInfo());
    return false;
  }
  try { this.touchActivity(); } catch (eTouch) {}
  try { if (this.state.addedPanel) this.hideMainPanel(); } catch (eMainPanel) {}
  try { if (this.state.addedSettings) this.hideSettingsPanel(); } catch (eSettings) {}
  try { if (!this.state.addedMask) this.showMask(); } catch (eMask) {}
  return true;
};

FloatBallAppWM.prototype.showToolAppOnMain = function(route, resetStack, generation) {
  if (!this.isAndroidMainThread()) {
    throw "showToolAppOnMain requires android main";
  }
  if (!this.state || this.state.closing || this.state.closed) return false;
  var expectedGeneration = Number(generation || 0);
  if (expectedGeneration > 0 &&
      Number(this.state.toolAppUiGeneration || 0) !== expectedGeneration) {
    safeLog(this.L, 'd', "TOOLAPP_BUILD_DROPPED generation=" + String(expectedGeneration) +
      " current=" + String(this.state.toolAppUiGeneration || 0));
    return false;
  }
  var r = this.isToolAppRoute(route) ? String(route) : "settings";
  try {
    safeLog(this.L, 'i', "TOOLAPP_BUILD_BEGIN route=" + r + " " + this.toolAppThreadInfo());
    this.state.toolAppActive = true;
    this.state.toolAppRoute = r;
    if (r === "settings") this.state.settingsGroupKey = null;
    if (resetStack && r === "settings") {
      try {
        if (typeof this.onResultPreviewConfigurationChanged === "function") {
this.onResultPreviewConfigurationChanged({
  positionOnly: true,
  clearPositionPreview: true,
  reason: "settings_reset"
});
        }
      } catch(ePreviewReset) {}
      this.state.pendingUserCfg = null;
      this.state.pendingDirty = false;
      this.state.previewMode = false;
      this.state.toolAppScrollY = 0;
    }
    if (resetStack || !this.state.toolAppNavStack || !this.state.toolAppNavStack.length) {
      this.state.toolAppNavStack = [this.makeToolAppStackEntry(r)];
      try { this.bumpToolAppStackVersion(); } catch (eStackInit) {}
    }

    var raw = this.buildPanelView(r);
    var shell = this.ensureToolAppShell();
    if (!shell) throw "ToolApp shell missing";
    this.updateToolAppShellChrome(this.getToolAppTitle(r), this.state.toolAppNavStack.length > 1);
    this.setToolAppContent(raw);

    var layout = this.calculateToolAppLayout(shell);
    var lp0 = shell.getLayoutParams();
    if (!lp0) lp0 = new android.view.ViewGroup.LayoutParams(layout.width, layout.height);
    lp0.width = layout.width;
    lp0.height = layout.height;
    shell.setLayoutParams(lp0);

    if (!this.state.addedViewer || this.state.viewerPanel !== shell) {
      this.addPanel(shell, layout.x, layout.y, "tool_app");
    } else if (this.state.viewerPanelLp) {
      this.state.viewerPanelLp.width = layout.width;
      this.state.viewerPanelLp.height = layout.height;
      this.state.viewerPanelLp.x = layout.x;
      this.state.viewerPanelLp.y = layout.y;
      this.state.wm.updateViewLayout(shell, this.state.viewerPanelLp);
      try { shell.requestFocus(); } catch (eFocus) {}
    }
    this.state.toolAppUiOwner = "android_main";
    safeLog(this.L, 'i', "TOOLAPP_BUILD_DONE route=" + r + " " + this.toolAppThreadInfo());
    if (r === "settings" && resetStack === true && this.onToolHubSettingsEntered) {
      try { this.onToolHubSettingsEntered(); } catch(eSettingsEntered) { safeLog(this.L, 'w', "settings entered update check fail: " + String(eSettingsEntered)); }
    }
    return true;
  } catch (eShow) {
    this.state.toolAppActive = false;
    safeLog(this.L, 'e', "showToolAppOnMain fail route=" + r + " err=" + String(eShow));
    try { this.toast("设置页面显示失败: " + String(eShow)); } catch (eToast) {}
  }
  return false;
};

FloatBallAppWM.prototype.clearToolAppViewState = function() {
  var s = this.state;
  if (!s) return;
  s.viewerPanel = null;
  s.viewerPanelLp = null;
  s.viewerPanelType = null;
  s.addedViewer = false;
  s.toolAppRoot = null;
  s.toolAppBody = null;
  s.toolAppContentHost = null;
  s.toolAppBackPreviewView = null;
  s.toolAppBackPreviewRoute = null;
  s.toolAppBackPreviewReady = false;
  s.toolAppBackPreviewStackVersion = null;
  s.toolAppBackPreviewEntryKey = null;
  s.toolAppTitleView = null;
  s.toolAppBackButton = null;
  s.toolAppHelpButton = null;
  s.toolAppCloseButton = null;
  s.toolAppRightButton = null;
  s.settingsNoticeContainerRef = null;
  s.toolAppUiOwner = "";
};

FloatBallAppWM.prototype.removeToolAppOnMain = function(reason, immediate) {
  if (!this.isAndroidMainThread()) {
    throw "removeToolAppOnMain requires android main";
  }
  var s = this.state;
  if (!s) return true;
  try {
    if (typeof this.onResultPreviewConfigurationChanged === "function") {
      this.onResultPreviewConfigurationChanged({
        positionOnly: true,
        clearPositionPreview: true,
        reason: "toolapp_close"
      });
    }
  } catch(ePreviewPosition) {}
  var root = s.toolAppRoot ||
    (String(s.viewerPanelType || "") === "tool_app" ? s.viewerPanel : null);
  var generation = Number(s.toolAppUiGeneration || 0) + 1;
  if (generation > 1000000000) generation = 1;
  s.toolAppUiGeneration = generation;
  safeLog(this.L, 'i', "TOOLAPP_REMOVE_BEGIN reason=" + String(reason || "") +
    " " + this.toolAppThreadInfo());
  s.toolAppActive = false;
  s.toolAppRoute = null;
  s.toolAppNavStack = [];
  s.settingsGroupKey = null;
  s.settingsHomeSelectedItemId = null;
  try { this.bumpToolAppStackVersion(); } catch (eStack) {}

  if (root) {
    try {
      var focus = root.findFocus();
      var token = focus ? focus.getWindowToken() : root.getWindowToken();
      var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
      if (imm && token) imm.hideSoftInputFromWindow(token, 0);
      if (focus) focus.clearFocus();
    } catch (eIme) {}
    try { root.animate().cancel(); } catch (eAnim) {}
    try { root.clearAnimation(); } catch (eClear) {}
    try {
      if (this.unregisterPanelPredictiveBack) this.unregisterPanelPredictiveBack(root, false);
    } catch (eBack) {}
    try {
      if ((immediate === true || s.closing) && s.wm.removeViewImmediate) {
        s.wm.removeViewImmediate(root);
      } else {
        s.wm.removeView(root);
      }
    } catch (eRemove) {
      try { s.wm.removeViewImmediate(root); }
      catch (eFallback) {
        safeLog(this.L, 'w', "toolapp remove fail: " + String(eRemove) +
          "; fallback=" + String(eFallback));
      }
    }
  }

  this.clearToolAppViewState();
  var self = this;
  if (!s.closing && !s.closed) {
    this.postToToolHubWm(function() {
      try { self.hideMask(); } catch (eMask) {}
      try { self.touchActivity(); } catch (eTouch) {}
      try { self._clearHeavyCachesIfAllHidden("toolapp_remove"); } catch (eCache) {}
    });
  }
  safeLog(this.L, 'i', "TOOLAPP_REMOVE_DONE reason=" + String(reason || "") +
    " " + this.toolAppThreadInfo());
  return true;
};
