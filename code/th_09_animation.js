// @version 1.0.0
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
        try { va.setInterpolator(new android.view.animation.DecelerateInterpolator());  } catch(eI2) { safeLog(null, 'e', "catch " + String(eI2)); }
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
         } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
      }
    }));

    va.addListener(new android.animation.Animator.AnimatorListener({
      onAnimationStart: function() {},
      onAnimationRepeat: function() {},
      onAnimationCancel: function() {
        try { self.state.ballAnimator = null;  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
      },
      onAnimationEnd: function() {
        try { self.state.ballAnimator = null;  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
        try {
          if (!self.state.closing && self.state.addedBall) {
            self.state.ballLp.x = toX;
            self.state.ballLp.y = toY;
            self.state.ballLp.width = toW;
            self.state.wm.updateViewLayout(self.state.ballRoot, self.state.ballLp);
            self.savePos(self.state.ballLp.x, self.state.ballLp.y);
          }
         } catch(e2) { safeLog(null, 'e', "catch " + String(e2)); }
        try { if (endCb) endCb(); } catch (eCb) { try { if (self && self.L && self.L.e) self.L.e("animateBallLayout endCb err=" + String(eCb));  } catch(eLog) { safeLog(null, 'e', "catch " + String(eLog)); } }
      }
    }));

    this.state.ballAnimator = va;
    va.start();
  } catch (e0) {
    try {
      st.ballLp.x = toX;
      st.ballLp.y = toY;
      st.ballLp.width = toW;
      st.wm.updateViewLayout(st.ballRoot, st.ballLp);
      this.savePos(st.ballLp.x, st.ballLp.y);
     } catch(e1) { safeLog(null, 'e', "catch " + String(e1)); }
    try { if (endCb) endCb(); } catch (eCb2) { try { if (this && this.L && this.L.e) this.L.e("animateBallLayout endCb err=" + String(eCb2));  } catch(eLog2) { safeLog(null, 'e', "catch " + String(eLog2)); } }
  }
};

FloatBallAppWM.prototype.playBounce = function(v) {
  if (!this.config.ENABLE_BOUNCE) return;
  if (!this.config.ENABLE_ANIMATIONS) return;

  try { v.animate().cancel();  } catch(e0) { safeLog(null, 'e', "catch " + String(e0)); }

  var self = this;
  var i = 0;

  function step() {
    if (self.state.closing) return;

    if (i >= self.config.BOUNCE_TIMES) {
      try { v.setScaleX(1); v.setScaleY(1);  } catch(e2) { safeLog(null, 'e', "catch " + String(e2)); }
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
    try { if (this.unregisterPanelPredictiveBack) this.unregisterPanelPredictiveBack(v); } catch (eBack) {}
    try { if (whichName === "viewerPanel" && this.state && String(this.state.viewerPanelType || "") === "tool_app" && this.hideToolAppScreenBackStrips) this.hideToolAppScreenBackStrips(); } catch (eStrip) {}
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

  var oldViewerType = String(this.state.viewerPanelType || "");
  this.safeRemoveView(this.state.viewerPanel, "viewerPanel");
  this.state.viewerPanel = null;
  this.state.viewerPanelLp = null;
  this.state.viewerPanelType = null;
  if (oldViewerType === "tool_app") {
    this.state.toolAppRoot = null;
    this.state.toolAppBody = null;
    this.state.toolAppContentHost = null;
    this.state.toolAppBackPreviewView = null;
    this.state.toolAppBackPreviewRoute = null;
    this.state.toolAppBackPreviewReady = false;
    try { if (this.hideToolAppScreenBackStrips) this.hideToolAppScreenBackStrips(); } catch (eStrip) {}
    this.state.toolAppTitleView = null;
    this.state.toolAppBackButton = null;
  }
  this.state.addedViewer = false;

  this.hideMask();
  this.touchActivity();

  this._clearHeavyCachesIfAllHidden("hideViewerPanel");
};

FloatBallAppWM.prototype.handlePanelBack = function(which, reason) {
  // 这段代码的主要内容/用途：适配全面屏系统返回手势/返回键，让 ToolHub 设置类 UI 能按“上一级 -> 关闭”退出。
  try {
    if (this.state.closing) return false;
    var w = which ? String(which) : "";
    if (!w && this.state.addedViewer) w = String(this.state.viewerPanelType || "viewer");
    if (!w && this.state.addedSettings) w = "settings";
    if (!w && this.state.addedPanel) w = "main";

    if (this.state.addedViewer) {
      var vt = String(this.state.viewerPanelType || w || "viewer");
      if (vt === "tool_app" && this.state.toolAppActive && this.popToolAppPage) {
        return this.popToolAppPage(reason || "back_key");
      }
      if (vt === "btn_editor") {
        if (this.state.editingButtonIndex !== null && this.state.editingButtonIndex !== undefined) {
          this.state.editingButtonIndex = null;
          this.state.keepBtnEditorState = true;
          this.showPanelAvoidBall("btn_editor");
          return true;
        }
        this.hideViewerPanel();
        this.showPanelAvoidBall("settings");
        return true;
      }
      if (vt === "schema_editor") {
        if (this.state.editingSchemaIndex !== null && this.state.editingSchemaIndex !== undefined) {
          this.state.editingSchemaIndex = null;
          this.state.keepSchemaEditorState = true;
          this.showPanelAvoidBall("schema_editor");
          return true;
        }
        this.hideViewerPanel();
        this.showPanelAvoidBall("settings");
        return true;
      }
      this.hideViewerPanel();
      return true;
    }

    if (this.state.addedSettings) {
      this.state.previewMode = false;
      if (this.state.addedPanel) this.hideMainPanel();
      this.hideSettingsPanel();
      return true;
    }

    if (this.state.addedPanel) {
      this.hideMainPanel();
      return true;
    }
  } catch (e) {
    safeLog(this.L, 'e', "handlePanelBack fail reason=" + String(reason || "") + " err=" + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.handleSystemUiDismiss = function(reason) {
  // 这段代码的主要内容/用途：系统 Home/最近任务手势发生时关闭 ToolHub 面板，只保留悬浮球，避免 overlay 残留在桌面/多任务上。
  try {
    var r = String(reason || "");
    if (r === "homekey" || r === "recentapps" || r === "fs_gesture" || r === "gestureNav") {
      this.hideAllPanels();
      return true;
    }
  } catch (e) {
    safeLog(this.L, 'e', "handleSystemUiDismiss fail: " + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.hidePanelPredictiveBackIndicator = function() {
  try {
    var v = this.state.predictiveBackIndicatorView;
    if (v && this.state.wm) {
      try { this.state.wm.removeView(v); } catch (eRm) {}
    }
    this.state.predictiveBackIndicatorView = null;
    this.state.predictiveBackIndicatorLp = null;
  } catch (e) {}
};

FloatBallAppWM.prototype.showPanelPredictiveBackIndicator = function(edge) {
  try {
    if (!this.state.wm) return null;
    var v = this.state.predictiveBackIndicatorView;
    var lp = this.state.predictiveBackIndicatorLp;
    var size = this.dp(46);
    var edgeLeft = Number(edge) !== 1;
    if (!v) {
      v = new android.widget.TextView(context);
      v.setText(edgeLeft ? "‹" : "›");
      v.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 30);
      v.setTypeface(null, android.graphics.Typeface.BOLD);
      v.setGravity(android.view.Gravity.CENTER);
      v.setTextColor(android.graphics.Color.WHITE);
      try {
        var bg = new android.graphics.drawable.GradientDrawable();
        bg.setShape(android.graphics.drawable.GradientDrawable.OVAL);
        var c = (this.ui && this.ui.colors && this.ui.colors.primary) ? this.ui.colors.primary : android.graphics.Color.parseColor("#005BC0");
        bg.setColor(this.withAlpha ? this.withAlpha(c, 0.92) : c);
        v.setBackground(bg);
        v.setElevation(this.dp(12));
      } catch (eBg) {}
      lp = new android.view.WindowManager.LayoutParams(
        size,
        size,
        android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
          android.view.WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE |
          android.view.WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
        android.graphics.PixelFormat.TRANSLUCENT
      );
      lp.gravity = (edgeLeft ? android.view.Gravity.START : android.view.Gravity.END) | android.view.Gravity.CENTER_VERTICAL;
      lp.x = this.dp(6);
      lp.y = 0;
      v.setAlpha(0);
      try { this.state.wm.addView(v, lp); } catch (eAdd) { return null; }
      this.state.predictiveBackIndicatorView = v;
      this.state.predictiveBackIndicatorLp = lp;
    } else {
      try { v.setText(edgeLeft ? "‹" : "›"); } catch (eTxt) {}
      if (lp) {
        lp.gravity = (edgeLeft ? android.view.Gravity.START : android.view.Gravity.END) | android.view.Gravity.CENTER_VERTICAL;
      }
    }
    return v;
  } catch (e) {
    safeLog(this.L, 'w', "show predictive back indicator fail: " + String(e));
  }
  return null;
};

FloatBallAppWM.prototype.resetPanelPredictiveBackVisual = function(panel) {
  try {
    if (panel && this.state && this.state.toolAppRoot === panel && this.clearToolAppBackPreview) {
      this.clearToolAppBackPreview(true);
      this.hidePanelPredictiveBackIndicator();
      return;
    }
    if (panel) {
      panel.setAlpha(1.0);
      panel.setTranslationX(0);
      panel.setScaleX(1.0);
      panel.setScaleY(1.0);
    }
    this.hidePanelPredictiveBackIndicator();
  } catch (e) {}
};

FloatBallAppWM.prototype.applyPanelPredictiveBackProgress = function(panel, event) {
  try {
    if (!panel || !event) return;
    var p = 0;
    try { p = Number(event.getProgress()); } catch (eP) { p = 0; }
    if (isNaN(p)) p = 0;
    if (p < 0) p = 0;
    if (p > 1) p = 1;
    var edge = 0;
    try { edge = Number(event.getSwipeEdge()); } catch (eE) { edge = 0; }
    if (panel && this.state && this.state.toolAppRoot === panel && this.applyToolAppBackPreviewProgress && this.hasToolAppBackTarget && this.hasToolAppBackTarget()) {
      this.state.toolAppBackEdge = edge;
      this.applyToolAppBackPreviewProgress(edge, p);
      return;
    }
    var dir = edge === 1 ? -1 : 1;
    panel.setAlpha(1.0 - 0.18 * p);
    panel.setTranslationX(dir * this.dp(36) * p);
    var s = 1.0 - 0.025 * p;
    panel.setScaleX(s);
    panel.setScaleY(s);

    // overlay 窗口下系统自己的预测性返回箭头在部分 ColorOS 版本不可见，额外绘制一个轻量边缘提示。
    var ind = this.showPanelPredictiveBackIndicator(edge);
    if (ind) {
      ind.setAlpha(Math.min(1.0, 0.20 + 0.80 * p));
      ind.setScaleX(0.82 + 0.22 * p);
      ind.setScaleY(0.82 + 0.22 * p);
      ind.setTranslationX(dir * this.dp(18) * p);
    }
  } catch (e) {}
};

FloatBallAppWM.prototype.unregisterPanelPredictiveBack = function(panel) {
  try {
    var entries = this.state.panelBackCallbackEntries || [];
    var kept = [];
    for (var i = 0; i < entries.length; i++) {
      var it = entries[i];
      if (!it || it.view === panel) {
        try { if (it && it.dispatcher && it.callback) it.dispatcher.unregisterOnBackInvokedCallback(it.callback); } catch (eUnreg) {}
      } else {
        kept.push(it);
      }
    }
    this.state.panelBackCallbackEntries = kept;
    this.resetPanelPredictiveBackVisual(panel);
  } catch (e) {
    safeLog(this.L, 'w', "unregister predictive back fail: " + String(e));
  }
};

FloatBallAppWM.prototype.registerPanelPredictiveBack = function(panel, which) {
  // 返回注册优先级：Android 14+ OnBackAnimationCallback（有 progress）→ Android 13 OnBackInvokedCallback（仅最终返回）→ 旧系统 KEYCODE_BACK。
  try {
    if (!panel) return false;
    if (android.os.Build.VERSION.SDK_INT < 33) return false;
    // attach listener + post fallback may fire almost together; avoid unregister/register churn and duplicate logs.
    try {
      var nowReg = Date.now();
      var entries0 = this.state.panelBackCallbackEntries || [];
      for (var ei0 = 0; ei0 < entries0.length; ei0++) {
        var it0 = entries0[ei0];
        if (it0 && it0.view === panel && String(it0.which || "") === String(which || "") && (nowReg - Number(it0.registeredAt || 0)) < 300) {
          return true;
        }
      }
    } catch(eRegDebounce) {}
    this.unregisterPanelPredictiveBack(panel);
    var dispatcher = null;
    try { dispatcher = panel.findOnBackInvokedDispatcher(); } catch (eFind) { dispatcher = null; }
    if (!dispatcher) {
      safeLog(this.L, 'w', "predictive back dispatcher missing which=" + String(which || ""));
      return false;
    }

    var self = this;
    var cb = null;
    var mode = "none";
    var usedAnimation = false;

    function finishBack(reason) {
      if (String(which || "") === "tool_app" && self.finishToolAppBackPreview && self.hasToolAppBackTarget && self.hasToolAppBackTarget()) {
        var edge = 0;
        try { edge = Number(self.state.toolAppBackEdge || 0); } catch (eEdge) { edge = 0; }
        self.finishToolAppBackPreview(edge, true);
        return;
      }
      self.resetPanelPredictiveBackVisual(panel);
      self.handlePanelBack(which, reason || "predictive_back");
    }

    if (android.os.Build.VERSION.SDK_INT >= 34) {
      try {
        // 核心：优先创建真正的 android.window.OnBackAnimationCallback。
        // Class.forName 只用于预热/instanceof 校验；JavaAdapter 必须使用 Packages 下的接口对象。
        var animCls = java.lang.Class.forName("android.window.OnBackAnimationCallback");
        cb = new JavaAdapter(Packages.android.window.OnBackAnimationCallback, {
          onBackStarted: function(event) { self.applyPanelPredictiveBackProgress(panel, event); },
          onBackProgressed: function(event) { self.applyPanelPredictiveBackProgress(panel, event); },
          onBackCancelled: function() { self.resetPanelPredictiveBackVisual(panel); },
          onBackInvoked: function() { finishBack("predictive_back"); }
        });
        usedAnimation = !!animCls.isInstance(cb);
        mode = usedAnimation ? "OnBackAnimationCallback" : "OnBackAnimationCallback-proxy-not-instance";
        if (!usedAnimation) {
          safeLog(self.L, 'w', "OnBackAnimationCallback proxy not instance; fallback to final-only callback");
          cb = null;
        }
      } catch (eAnim) {
        safeLog(self.L, 'w', "create OnBackAnimationCallback fail: " + String(eAnim));
        cb = null;
      }
    }

    if (!cb) {
      try {
        var cbCls = java.lang.Class.forName("android.window.OnBackInvokedCallback");
        cb = new JavaAdapter(cbCls, {
          onBackInvoked: function() { finishBack("on_back_invoked"); }
        });
        mode = "OnBackInvokedCallback";
      } catch (eCb) {
        safeLog(self.L, 'w', "create OnBackInvokedCallback fail: " + String(eCb));
        cb = null;
      }
    }
    if (!cb) return false;

    var priority = 0;
    try {
      // 与规则文件实现保持一致：默认优先级最容易拿到系统 back pipeline；overlay priority 在 ColorOS 上可能只给最终回调。
      priority = android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT;
    } catch (ePri) { priority = 0; }
    dispatcher.registerOnBackInvokedCallback(priority, cb);
    if (!this.state.panelBackCallbackEntries) this.state.panelBackCallbackEntries = [];
    this.state.panelBackCallbackEntries.push({ view: panel, dispatcher: dispatcher, callback: cb, which: String(which || ""), animation: usedAnimation, mode: mode, registeredAt: Date.now() });
    safeLog(this.L, 'i', "back callback registered which=" + String(which || "") + " mode=" + mode + " priority=" + String(priority));
    return true;
  } catch (e) {
    safeLog(this.L, 'w', "register predictive back fail which=" + String(which || "") + " err=" + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.attachPanelSystemKeyHandler = function(panel, which) {
  try {
    if (!panel) return;
    var self = this;
    panel.setFocusable(true);
    panel.setFocusableInTouchMode(true);
    panel.setOnKeyListener(new android.view.View.OnKeyListener({
      onKey: function(v, keyCode, event) {
        try {
          if (!event) return false;
          if (event.getAction() !== android.view.KeyEvent.ACTION_UP) return false;
          if (keyCode === android.view.KeyEvent.KEYCODE_BACK) return self.handlePanelBack(which, "back_key");
          if (keyCode === android.view.KeyEvent.KEYCODE_ESCAPE) return self.handlePanelBack(which, "escape_key");
        } catch (e) { safeLog(self.L, 'e', "panel key handler fail: " + String(e)); }
        return false;
      }
    }));
    var registerAfterAttach = function() {
      try { panel.requestFocus(); } catch(eFocus) {}
      try { self.registerPanelPredictiveBack(panel, which); } catch(eBack) {
        try { safeLog(self.L, 'w', "panel predictive register after attach fail: " + String(eBack)); } catch(eLog) {}
      }
    };
    try {
      panel.addOnAttachStateChangeListener(new android.view.View.OnAttachStateChangeListener({
        onViewAttachedToWindow: function(v) {
          try { v.post(new java.lang.Runnable({ run: registerAfterAttach })); } catch(ePost) { registerAfterAttach(); }
        },
        onViewDetachedFromWindow: function(v) {
          try { self.unregisterPanelPredictiveBack(v); } catch(eUnreg) {}
        }
      }));
    } catch (eAttach) {
      safeLog(self.L, 'w', "add attach listener fail: " + String(eAttach));
    }
    panel.post(new java.lang.Runnable({ run: registerAfterAttach }));
  } catch (e) {
    safeLog(this.L, 'e', "attachPanelSystemKeyHandler fail which=" + String(which || "") + " err=" + String(e));
  }
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
  
  try { this._iconLru = null;  } catch(eLruClr) { safeLog(null, 'e', "catch " + String(eLruClr)); }
  try { this._shortcutIconFailTs = {};  } catch(e2) { safeLog(null, 'e', "catch " + String(e2)); }

  // # Shortcuts 相关全局缓存（按钮编辑页/快捷方式选择器可能会创建）
  try { if (typeof __scIconCache !== "undefined") __scIconCache = {};  } catch(e3) { safeLog(null, 'e', "catch " + String(e3)); }
  try { if (typeof __scAppLabelCache !== "undefined") __scAppLabelCache = {};  } catch(e4) { safeLog(null, 'e', "catch " + String(e4)); }

  // # 记录一次清理日志（精简：只记录关键 reason，且 5秒防抖）
  var keyReasons = ["memory_pressure", "screen_changed", "close"];
  var isKeyReason = keyReasons.indexOf(reason) >= 0;
  try { 
    if (isKeyReason && this.L && this.L.i) {
      this.L.i("clearHeavyCaches reason=" + String(reason));
    }
   } catch(e5) { safeLog(null, 'e', "catch " + String(e5)); }
};

FloatBallAppWM.prototype._clearHeavyCachesIfAllHidden = function(reason) {
  // 这段代码的主要内容/用途：只在"主面板/设置/查看器"全部关闭后清理缓存，避免页面切换时反复重建导致卡顿。
  try {
    if (!this.state.addedPanel && !this.state.addedSettings && !this.state.addedViewer) {
      this.clearHeavyCaches(reason || "all_hidden");
    }
   } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
};

FloatBallAppWM.prototype.hideAllPanels = function() {
  try { if (this.hideToolAppScreenBackStrips) this.hideToolAppScreenBackStrips(); } catch (eStrip) {}
  this.hideMainPanel();
  this.hideSettingsPanel();
  this.hideViewerPanel();
  this.state.toolAppActive = false;
  this.state.toolAppRoute = null;
  this.state.toolAppNavStack = [];
  this.state.settingsGroupKey = null;
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
     } catch(eAnim) { safeLog(null, 'e', "catch " + String(eAnim)); }

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

  try {
    var freshScreen = this.getScreenSizePx();
    if (freshScreen && freshScreen.w > 0 && freshScreen.h > 0) {
      this.state.screen = freshScreen;
    }
  } catch (eScreen) {}

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

    try { this.state.ballContent.setX(-hidden);  } catch(eL) { safeLog(null, 'e', "catch " + String(eL)); }

    if (withAnim) {
      this.animateBallLayout(0, targetY, targetW, this.config.DOCK_ANIM_MS, null);
    } else {
      this.state.ballLp.x = 0;
      this.state.ballLp.y = targetY;
      this.state.ballLp.width = targetW;
      try { this.state.wm.updateViewLayout(this.state.ballRoot, this.state.ballLp);  } catch(eU1) { safeLog(null, 'e', "catch " + String(eU1)); }
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
     } catch(eA) { safeLog(null, 'e', "catch " + String(eA)); }

    return;
  }

  this.state.dockSide = "right";
  this.state.docked = true;

  try { this.state.ballContent.setX(0);  } catch(eR) { safeLog(null, 'e', "catch " + String(eR)); }

  var x2 = this.state.screen.w - visible;

  if (withAnim) {
    this.animateBallLayout(x2, targetY, targetW, this.config.DOCK_ANIM_MS, null);
  } else {
    this.state.ballLp.x = x2;
    this.state.ballLp.y = targetY;
    this.state.ballLp.width = targetW;
    try { this.state.wm.updateViewLayout(this.state.ballRoot, this.state.ballLp);  } catch(eU2) { safeLog(null, 'e', "catch " + String(eU2)); }
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
   } catch(eA) { safeLog(null, 'e', "catch " + String(eA)); }
};

FloatBallAppWM.prototype.undockToFull = function(withAnim, endCb) {
  if (this.state.closing) { if (endCb) endCb(); return; }
  if (!this.state.docked) { if (endCb) endCb(); return; }
  if (!this.state.addedBall) { if (endCb) endCb(); return; }

  var di = this.getDockInfo();
  var ballSize = di.ballSize;
  var targetW = ballSize;
  var targetY = this.clamp(this.state.ballLp.y, 0, this.state.screen.h - ballSize);

  try { this.state.ballContent.setX(0);  } catch(e0) { safeLog(null, 'e', "catch " + String(e0)); }

  if (this.state.dockSide === "left") {
    this.state.docked = false;
    this.state.dockSide = null;

    if (withAnim) this.animateBallLayout(0, targetY, targetW, this.config.UNDOCK_ANIM_MS, endCb);
    else {
      this.state.ballLp.x = 0;
      this.state.ballLp.y = targetY;
      this.state.ballLp.width = targetW;
      try { this.state.wm.updateViewLayout(this.state.ballRoot, this.state.ballLp);  } catch(eU1) { safeLog(null, 'e', "catch " + String(eU1)); }
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
     } catch(eA) { safeLog(null, 'e', "catch " + String(eA)); }

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
    try { this.state.wm.updateViewLayout(this.state.ballRoot, this.state.ballLp);  } catch(eU2) { safeLog(null, 'e', "catch " + String(eU2)); }
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
   } catch(eA) { safeLog(null, 'e', "catch " + String(eA)); }

  // # 日志精简：undock 事件改为 INFO 级别，且记录方向
  var undockSide = this.state.dockSide || "right";
  safeLog(this.L, 'i', "undock from " + undockSide);
};

FloatBallAppWM.prototype.cancelDockTimer = function() {
  try { if (this.state.idleDockRunnable && this.state.h) this.state.h.removeCallbacks(this.state.idleDockRunnable);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
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
    try { fn && fn();  } catch(e2) { safeLog(null, 'e', "catch " + String(e2)); }
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

FloatBallAppWM.prototype.onScreenChangedReflow = function(reason) {
  if (this.state.closing) return;
  if (!this.state.addedBall) return;

  var oldW = this.state.screen.w;
  var oldH = this.state.screen.h;

  var newScreen = this.getScreenSizePx();
  var newW = newScreen.w;
  var newH = newScreen.h;

  if (newW <= 0 || newH <= 0) return;
  var rotNow = -1;
  try { rotNow = this.getRotation ? this.getRotation() : -1; } catch (eRotNow) { rotNow = -1; }
  try {
    var rotLandscape = (rotNow === android.view.Surface.ROTATION_90 || rotNow === android.view.Surface.ROTATION_270);
    var rotPortrait = (rotNow === android.view.Surface.ROTATION_0 || rotNow === android.view.Surface.ROTATION_180);
    if ((rotLandscape && newW < newH) || (rotPortrait && newW > newH)) {
      safeLog(this.L, 'w', "screen reflow skip unstable size reason=" + String(reason || "") + " new=" + newW + "x" + newH + " rot=" + String(rotNow));
      return;
    }
  } catch (eStable) {}
  if (oldW <= 0) oldW = newW;
  if (oldH <= 0) oldH = newH;

  this.state.screen = { w: newW, h: newH };

  var di = this.getDockInfo();

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
      try { this.state.ballContent.setX(-hidden);  } catch(eL) { safeLog(null, 'e', "catch " + String(eL)); }
    } else {
      this.state.ballLp.x = newW - visible;
      try { this.state.ballContent.setX(0);  } catch(eR) { safeLog(null, 'e', "catch " + String(eR)); }
    }
    // 重新进入闲置变暗逻辑（如果需要）
    try { this.state.ballContent.setAlpha(this.config.BALL_IDLE_ALPHA);  } catch(eA) { safeLog(null, 'e', "catch " + String(eA)); }
  } else {
    this.state.ballLp.x = mappedX;
    this.state.ballLp.y = mappedY;
    this.state.ballLp.width = ballSize;
    try { this.state.ballContent.setX(0);  } catch(e0) { safeLog(null, 'e', "catch " + String(e0)); }
    try { this.state.ballContent.setAlpha(1.0);  } catch(eA) { safeLog(null, 'e', "catch " + String(eA)); }
  }

  try { this.state.wm.updateViewLayout(this.state.ballRoot, this.state.ballLp);  } catch(eU) { safeLog(null, 'e', "catch " + String(eU)); }
  this.savePos(this.state.ballLp.x, this.state.ballLp.y);

  if (this.state.toolAppActive && this.refreshToolAppScreenBackStrips) {
    try { this.refreshToolAppScreenBackStrips(); } catch(eBackStrip) { safeLog(this.L, 'w', "screen reflow refresh tool app back strips fail: " + String(eBackStrip)); }
  }

  safeLog(this.L, 'i',
    "screen reflow reason=" + String(reason || "") +
    " old=" + oldW + "x" + oldH +
    " new=" + newW + "x" + newH +
    " rot=" + String(rotNow) +
    " docked=" + String(this.state.docked) +
    " side=" + String(this.state.dockSide || "") +
    " x=" + String(this.state.ballLp.x) +
    " y=" + String(this.state.ballLp.y)
  );
};

FloatBallAppWM.prototype.scheduleScreenReflow = function(reason) {
  try {
    var self = this;
    if (!this.state.h) {
      this.onScreenChangedReflow(reason);
      return;
    }

    this.onScreenChangedReflow(reason);

    this.state.h.postDelayed(new JavaAdapter(java.lang.Runnable, {
      run: function() {
        try {
          if (self.state.closing) return;
          self.onScreenChangedReflow(String(reason || "") + ":delayed");
        } catch (e) {
          safeLog(self.L, "w", "delayed screen reflow fail reason=" + String(reason || "") + " err=" + String(e));
        }
      }
    }), 260);
  } catch (e0) {
    try { this.onScreenChangedReflow(reason); } catch(e1) {}
  }
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
                  self.scheduleScreenReflow("display_changed");
                  self.touchActivity();
                }
              } catch (e1) {
                if (self.L) self.L.e("displayChanged run err=" + String(e1));
              }
            }
          }));
         } catch(e0) { safeLog(null, 'e', "catch " + String(e0)); }
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
  try { if (this.state.dm && this.state.displayListener) this.state.dm.unregisterDisplayListener(this.state.displayListener);  } catch(e) { safeLog(null, 'e', "catch " + String(e)); }
  this.state.displayListener = null;
  this.state.dm = null;
};

