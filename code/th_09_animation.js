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

