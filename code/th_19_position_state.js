// @version 1.0.0
// =======================【悬浮球固定位置状态机】=======================
(function() {
  if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;

  var proto = FloatBallAppWM.prototype;
  var LEGACY_POSITION_KEYS = [
    "BALL_INIT_X",
    "BALL_INIT_Y_DP",
    "BALL_POS_SCREEN_W",
    "BALL_POS_SCREEN_H",
    "BALL_POS_X_RATIO",
    "BALL_POS_Y_RATIO",
    "BALL_POS_DOCKED",
    "BALL_POS_DOCK_SIDE"
  ];

  function logPosition(appObj, level, message) {
    try { safeLog(appObj && appObj.L, level, message); } catch (e0) {}
  }

  function nowPosition() {
    try { return Number(android.os.SystemClock.uptimeMillis()); } catch (e0) {}
    try { return Number(java.lang.System.currentTimeMillis()); } catch (e1) {}
    return new Date().getTime();
  }

  function numberOr(value, fallback) {
    var n = Number(value);
    return isNaN(n) ? Number(fallback) : n;
  }

  function removeLegacyDefaults() {
    var i;
    try {
      if (typeof ConfigManager !== "undefined" && ConfigManager && ConfigManager.defaultSettings) {
        for (i = 0; i < LEGACY_POSITION_KEYS.length; i++) {
          try { delete ConfigManager.defaultSettings[LEGACY_POSITION_KEYS[i]]; } catch (eDefault) {}
        }
      }
    } catch (eDefaults) {}
    try {
      if (typeof ConfigValidator !== "undefined" && ConfigValidator && ConfigValidator.schemas) {
        for (i = 0; i < LEGACY_POSITION_KEYS.length; i++) {
          try { delete ConfigValidator.schemas[LEGACY_POSITION_KEYS[i]]; } catch (eSchema) {}
        }
      }
    } catch (eSchemas) {}
  }

  removeLegacyDefaults();

  // th_18 的旧固定边缘触摸补丁可能在后台线程延迟安装。
  // 预先设置安装标记，确保后续只使用本模块的唯一触摸状态机。
  proto.__toolHubFixedEdgePointerPatchInstalled = true;
  proto.__toolHubPositionStateMachineInstalled = true;

  proto.isBallPositionEffectKey = function(key) {
    var k = String(key || "");
    return k === "BALL_POSITION_SIDE" || k === "BALL_POSITION_PERCENT";
  };

  proto.getConfiguredBallPosition = function(cfg) {
    var c = cfg || this.config || {};
    var di = this.getDockInfo();
    var sw = Number(this.state && this.state.screen ? this.state.screen.w : 0);
    var sh = Number(this.state && this.state.screen ? this.state.screen.h : 0);
    var side = String(c.BALL_POSITION_SIDE || "right");
    if (side !== "left") side = "right";

    var percent = numberOr(c.BALL_POSITION_PERCENT, 22);
    percent = this.clamp(percent, 0, 100);

    var maxX = Math.max(0, sw - di.ballSize);
    var maxY = Math.max(0, sh - di.ballSize);
    var y = Math.round(maxY * percent / 100);

    return {
      side: side,
      percent: percent,
      logicalX: side === "left" ? 0 : maxX,
      dockWindowX: side === "left" ? 0 : Math.max(0, sw - di.visiblePx),
      y: this.clamp(y, 0, maxY),
      ballSize: di.ballSize,
      visiblePx: di.visiblePx,
      hiddenPx: di.hiddenPx
    };
  };

  proto.pruneLegacyBallPositionState = function() {
    if (!this.config || this.state._legacyBallPositionPruned === true) return false;
    var changed = false;
    for (var i = 0; i < LEGACY_POSITION_KEYS.length; i++) {
      var key = LEGACY_POSITION_KEYS[i];
      if (typeof this.config[key] !== "undefined") {
        try { delete this.config[key]; changed = true; } catch (eDelete) {}
      }
    }
    this.state._legacyBallPositionPruned = true;
    if (changed) {
      try { ConfigManager.saveSettings(this.config); } catch (eSave) {}
      logPosition(this, "i", "legacy ball position fields removed");
    }
    return changed;
  };

  // 固定位置模式不再持久化临时像素坐标。
  proto.savePos = function() {
    return true;
  };

  proto.loadSavedPos = function() {
    try { this.pruneLegacyBallPositionState(); } catch (ePrune) {}
    var pos = this.getConfiguredBallPosition();
    return { x: pos.logicalX, y: pos.y };
  };

  proto.cancelConfiguredBallPositionApply = function() {
    try {
      if (this.state && this.state.configuredBallPositionRunnable && this.state.h) {
        this.state.h.removeCallbacks(this.state.configuredBallPositionRunnable);
      }
    } catch (e0) {}
    if (this.state) this.state.configuredBallPositionRunnable = null;
  };

  proto.cancelBallLayoutAnimation = function(reason) {
    if (!this.state) return false;
    this.state.ballAnimationToken = Number(this.state.ballAnimationToken || 0) + 1;
    var animator = this.state.ballAnimator;
    this.state.ballAnimator = null;
    if (!animator) return false;
    try { animator.cancel(); } catch (eCancel) {
      logPosition(this, "w", "cancel ball animation fail reason=" + String(reason || "") + " err=" + String(eCancel));
    }
    return true;
  };

  proto.animateBallLayout = function(toX, toY, toW, durMs, endCb) {
    var st = this.state;
    if (!st || !st.addedBall || !st.ballRoot || !st.ballLp) {
      try { if (endCb) endCb(); } catch (eNoView) {}
      return false;
    }

    this.cancelBallLayoutAnimation("replace");
    var token = Number(st.ballAnimationToken || 0) + 1;
    st.ballAnimationToken = token;

    var fromX = Number(st.ballLp.x || 0);
    var fromY = Number(st.ballLp.y || 0);
    var fromW = Number(st.ballLp.width || toW);
    var duration = Math.max(0, numberOr(durMs, 0));
    var cancelled = false;
    var self = this;

    try {
      var va = android.animation.ValueAnimator.ofFloat(0.0, 1.0);
      va.setDuration(duration);
      try { va.setInterpolator(new android.view.animation.DecelerateInterpolator()); } catch (eInterpolator) {}

      va.addUpdateListener(new android.animation.ValueAnimator.AnimatorUpdateListener({
        onAnimationUpdate: function(anim) {
          try {
            if (cancelled || self.state.closing || !self.state.addedBall) return;
            if (Number(self.state.ballAnimationToken || 0) !== token) return;
            if (self.state.ballAnimator !== va) return;
            var f = Number(anim.getAnimatedValue());
            var nx = Math.round(fromX + (toX - fromX) * f);
            var ny = Math.round(fromY + (toY - fromY) * f);
            var nw = Math.round(fromW + (toW - fromW) * f);
            if (nx === self.state.ballLp.x && ny === self.state.ballLp.y && nw === self.state.ballLp.width) return;
            self.state.ballLp.x = nx;
            self.state.ballLp.y = ny;
            self.state.ballLp.width = nw;
            self.state.wm.updateViewLayout(self.state.ballRoot, self.state.ballLp);
          } catch (eUpdate) {
            logPosition(self, "w", "ball animation update fail: " + String(eUpdate));
          }
        }
      }));

      va.addListener(new android.animation.Animator.AnimatorListener({
        onAnimationStart: function() {},
        onAnimationRepeat: function() {},
        onAnimationCancel: function() {
          cancelled = true;
          try { if (self.state.ballAnimator === va) self.state.ballAnimator = null; } catch (eClearCancel) {}
        },
        onAnimationEnd: function() {
          try {
            if (cancelled) return;
            if (Number(self.state.ballAnimationToken || 0) !== token) return;
            if (self.state.ballAnimator !== va) return;
            self.state.ballAnimator = null;
            if (self.state.closing || !self.state.addedBall) return;
            self.state.ballLp.x = toX;
            self.state.ballLp.y = toY;
            self.state.ballLp.width = toW;
            self.state.wm.updateViewLayout(self.state.ballRoot, self.state.ballLp);
            try { if (endCb) endCb(); } catch (eCb) {}
          } catch (eEnd) {
            logPosition(self, "w", "ball animation end fail: " + String(eEnd));
          }
        }
      }));

      st.ballAnimator = va;
      va.start();
      return true;
    } catch (eStart) {
      try {
        if (Number(st.ballAnimationToken || 0) === token && !st.closing && st.addedBall) {
          st.ballAnimator = null;
          st.ballLp.x = toX;
          st.ballLp.y = toY;
          st.ballLp.width = toW;
          st.wm.updateViewLayout(st.ballRoot, st.ballLp);
        }
      } catch (eFallback) {}
      try { if (endCb) endCb(); } catch (eFallbackCb) {}
      logPosition(this, "w", "ball animation fallback: " + String(eStart));
      return false;
    }
  };

  proto.applyConfiguredBallPosition = function(withAnim, reason) {
    try {
      if (!this.state || this.state.closing) return false;
      if (!this.state.addedBall || !this.state.ballRoot || !this.state.ballContent || !this.state.ballLp) return false;

      try {
        var fresh = this.getScreenSizePx();
        if (fresh && fresh.w > 0 && fresh.h > 0) this.state.screen = fresh;
      } catch (eScreen) {}

      var pos = this.getConfiguredBallPosition();
      this.cancelDockTimer();
      this.cancelBallLayoutAnimation("apply:" + String(reason || ""));

      this.state.docked = true;
      this.state.dockSide = pos.side;
      this.state.ballLp.height = pos.ballSize;
      try { this.state.ballContent.setX(pos.side === "left" ? -pos.hiddenPx : 0); } catch (eX) {}
      try { this.state.ballContent.setAlpha(numberOr(this.config.BALL_IDLE_ALPHA, 0.6)); } catch (eAlpha) {}

      if (withAnim && this.config.ENABLE_ANIMATIONS) {
        this.animateBallLayout(pos.dockWindowX, pos.y, pos.visiblePx, numberOr(this.config.DOCK_ANIM_MS, 260), null);
      } else {
        this.state.ballLp.x = pos.dockWindowX;
        this.state.ballLp.y = pos.y;
        this.state.ballLp.width = pos.visiblePx;
        this.state.wm.updateViewLayout(this.state.ballRoot, this.state.ballLp);
      }

      logPosition(this, "i",
        "apply configured ball position reason=" + String(reason || "") +
        " side=" + pos.side +
        " percent=" + String(pos.percent) +
        " y=" + String(pos.y)
      );
      return true;
    } catch (eApply) {
      logPosition(this, "e", "apply configured ball position fail: " + String(eApply));
    }
    return false;
  };

  proto.scheduleConfiguredBallPositionApply = function(reason, withAnim) {
    try {
      this.cancelConfiguredBallPositionApply();
      var self = this;
      var run = new java.lang.Runnable({ run: function() {
        try {
          self.state.configuredBallPositionRunnable = null;
          self.applyConfiguredBallPosition(!!withAnim, reason);
        } catch (eRun) {
          logPosition(self, "e", "configured position runnable fail: " + String(eRun));
        }
      }});
      this.state.configuredBallPositionRunnable = run;
      if (this.state.h) this.state.h.postDelayed(run, 60);
      else run.run();
      return true;
    } catch (eSchedule) {
      return this.applyConfiguredBallPosition(!!withAnim, reason);
    }
  };

  proto.createBallLayoutParams = function() {
    try { this.pruneLegacyBallPositionState(); } catch (ePrune) {}
    var pos = this.getConfiguredBallPosition();
    var lp = new android.view.WindowManager.LayoutParams(
      pos.visiblePx,
      pos.ballSize,
      android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      android.view.WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
      android.graphics.PixelFormat.TRANSLUCENT
    );
    lp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
    lp.x = pos.dockWindowX;
    lp.y = pos.y;
    this.state.docked = true;
    this.state.dockSide = pos.side;
    try { this.state.ballContent.setX(pos.side === "left" ? -pos.hiddenPx : 0); } catch (eX) {}
    try { this.state.ballContent.setAlpha(numberOr(this.config.BALL_IDLE_ALPHA, 0.6)); } catch (eAlpha) {}
    return lp;
  };

  proto.snapToEdgeDocked = function(withAnim) {
    return this.applyConfiguredBallPosition(!!withAnim, "snap");
  };

  proto.armLongPress = function() {
    try { this.cancelLongPressTimer(); } catch (eCancel) {}
    try { this.resetLongPressState(); } catch (eReset) {}
    return false;
  };

  proto.movePointerFromRaw = function(rawX, rawY, immediate) {
    try {
      if (!this.ensurePointerToolState) return false;
      var st = this.ensurePointerToolState();
      if (!st.active || st.closed) return false;
      if (!st.root || !st.lp) {
        if (!this.showPointerWindow || !this.showPointerWindow(st)) return false;
      }

      var sw = Math.max(1, Number(this.state.screen && this.state.screen.w || 0));
      var sh = Math.max(1, Number(this.state.screen && this.state.screen.h || 0));
      var hx = Math.round(numberOr(st.handleLocalX, 0));
      var hy = Math.round(numberOr(st.handleLocalY, 0));
      var ax = Math.round(numberOr(st.anchorLocalX, 0));
      var ay = Math.round(numberOr(st.anchorLocalY, 0));
      var rx = this.clamp(Math.round(numberOr(rawX, 0)), 0, Math.max(0, sw - 1));
      var ry = this.clamp(Math.round(numberOr(rawY, 0)), 0, Math.max(0, sh - 1));
      var xByHandle = Math.round(numberOr(rawX, 0)) - hx;
      var yByHandle = Math.round(numberOr(rawY, 0)) - hy;
      var x = xByHandle;
      var y = yByHandle;
      var leftTarget = -ax;
      var rightTarget = sw - 1 - ax;
      var topTarget = -ay;
      var bottomTarget = sh - 1 - ay;
      var zoneXdp = this.clamp(numberOr(this.config.POINTER_EDGE_ZONE_X_DP, 48), 16, 96);
      var zoneYdp = this.clamp(numberOr(this.config.POINTER_EDGE_ZONE_Y_DP, 72), 24, 128);
      var zoneX = this.dp(zoneXdp);
      var zoneY = this.dp(zoneYdp);

      function ease(t) {
        var v = t;
        if (v < 0) v = 0;
        if (v > 1) v = 1;
        return v * v * (3 - 2 * v);
      }
      function mix(a, b, t) {
        var e = ease(t);
        return a + (b - a) * e;
      }

      if (rx <= zoneX) x = mix(xByHandle, leftTarget, (zoneX - rx) / Math.max(1, zoneX));
      else if (rx >= sw - 1 - zoneX) x = mix(xByHandle, rightTarget, (rx - (sw - 1 - zoneX)) / Math.max(1, zoneX));
      if (ry <= zoneY) y = mix(yByHandle, topTarget, (zoneY - ry) / Math.max(1, zoneY));
      else if (ry >= sh - 1 - zoneY) y = mix(yByHandle, bottomTarget, (ry - (sh - 1 - zoneY)) / Math.max(1, zoneY));

      st.pendingPointerX = Math.round(this.clamp(x, leftTarget, rightTarget));
      st.pendingPointerY = Math.round(this.clamp(y, topTarget, bottomTarget));
      st.pointerX = st.pendingPointerX;
      st.pointerY = st.pendingPointerY;

      var now = nowPosition();
      var lastVisual = Number(st.__toolHubPointerVisualAt || 0);
      if (immediate === true || now - lastVisual >= 12) {
        st.__toolHubPointerVisualAt = now;
        st.lp.x = st.pendingPointerX;
        st.lp.y = st.pendingPointerY;
        try { if (st.root && st.wm) st.wm.updateViewLayout(st.root, st.lp); } catch (eVisual) {}
      }

      if (!st.handler) st.handler = this.state.h || new android.os.Handler(android.os.Looper.getMainLooper());
      if (st.__toolHubPointerSemanticPosted === true) return true;
      st.__toolHubPointerSemanticPosted = true;
      var self = this;
      var delay = st.mode === "area_capture" ? 18 : 24;
      st.__toolHubPointerSemanticRunnable = new java.lang.Runnable({ run: function() {
        try {
          st.__toolHubPointerSemanticPosted = false;
          if (!st.active || st.closed || !st.root || !st.lp) return;
          if (st.lp.x !== st.pendingPointerX || st.lp.y !== st.pendingPointerY) {
            st.lp.x = st.pendingPointerX;
            st.lp.y = st.pendingPointerY;
            st.pointerX = st.lp.x;
            st.pointerY = st.lp.y;
            try { if (st.wm) st.wm.updateViewLayout(st.root, st.lp); } catch (eLayout) {}
          }
          if (st.mode === "area_capture") {
            if (self.updatePointerAreaSelection) self.updatePointerAreaSelection();
          } else {
            if (self.updatePointerAreaHoldCandidate) self.updatePointerAreaHoldCandidate();
            if (self.scheduleDraggingInspect) self.scheduleDraggingInspect();
          }
        } catch (eSemantic) {
          logPosition(self, "w", "pointer semantic update fail: " + String(eSemantic));
        }
      }});
      try { st.handler.postDelayed(st.__toolHubPointerSemanticRunnable, delay); }
      catch (ePost) { st.__toolHubPointerSemanticPosted = false; }
      return true;
    } catch (eMove) {
      logPosition(this, "e", "move pointer from raw fail: " + String(eMove));
    }
    return false;
  };

  proto.setupTouchListener = function() {
    var self = this;
    var slop = this.dp(numberOr(this.config.CLICK_SLOP_DP, 6));
    var startRawX = 0;
    var startRawY = 0;
    var downSide = "right";
    var pointerActiveDown = false;
    var pointerStarted = false;
    var moved = false;

    function cancelPressAnimation() {
      try { self.cancelBallLayoutAnimation("touch_down"); } catch (eCancelLayout) {}
      try {
        if (self.state.ballContent) {
          self.state.ballContent.animate().cancel();
          self.state.ballContent.setScaleX(1.0);
          self.state.ballContent.setScaleY(1.0);
        }
      } catch (eCancelView) {}
    }

    function preparePointerState() {
      var st = self.ensurePointerToolState ? self.ensurePointerToolState() : null;
      if (!st) return null;
      st.__th18FixedEdgePointerMode = false;
      st.__toolHubFixedBallDrag = true;
      st.dragging = true;
      st.dragStarted = true;
      st.moved = true;
      try { if (self.resetPointerAreaHold) self.resetPointerAreaHold(); } catch (eHold) {}
      return st;
    }

    function startPointer(rawX, rawY) {
      if (pointerStarted) return true;
      try {
        self.cancelLongPressTimer();
        self.hideAllPanels();
        self.applyConfiguredBallPosition(false, "pointer_start");
        var result = self.startPointerTool({ mode: "text_pick", source: "edge_drag" });
        if (!result || result.ok === false) return false;
        preparePointerState();
        pointerStarted = true;
        self.state.dragging = true;
        self.movePointerFromRaw(rawX, rawY, true);
        logPosition(self, "i", "edge inward drag -> pointer side=" + downSide);
        return true;
      } catch (eStart) {
        logPosition(self, "e", "start pointer from fixed ball fail: " + String(eStart));
      }
      return false;
    }

    return new JavaAdapter(android.view.View.OnTouchListener, {
      onTouch: function(v, event) {
        if (self.state.closing) return false;
        var action = event.getAction();
        var rawX = event.getRawX();
        var rawY = event.getRawY();

        if (action === android.view.MotionEvent.ACTION_DOWN) {
          self.touchActivity();
          cancelPressAnimation();
          try { self.cancelLongPressTimer(); } catch (eLong) {}
          try { v.setPressed(true); v.setAlpha(1.0); } catch (ePressed) {}
          var pos = self.getConfiguredBallPosition();
          startRawX = rawX;
          startRawY = rawY;
          downSide = String(self.state.dockSide || pos.side || "right");
          pointerActiveDown = false;
          pointerStarted = false;
          moved = false;
          self.state.dragging = false;
          try {
            pointerActiveDown = typeof self.isPointerToolActive === "function" && self.isPointerToolActive();
          } catch (eActive) { pointerActiveDown = false; }
          if (pointerActiveDown) preparePointerState();
          return true;
        }

        if (action === android.view.MotionEvent.ACTION_MOVE) {
          self.touchActivity();
          var dx = Math.round(rawX - startRawX);
          var dy = Math.round(rawY - startRawY);
          var adx = Math.abs(dx);
          var ady = Math.abs(dy);
          if (adx > slop || ady > slop) moved = true;

          if (pointerActiveDown || pointerStarted) {
            if (moved) self.state.dragging = true;
            self.movePointerFromRaw(rawX, rawY, false);
            return true;
          }

          if (moved) {
            var posMove = self.getConfiguredBallPosition();
            var inward = downSide === "left" ? dx : -dx;
            var trigger = Math.max(slop, Math.round(Number(posMove.hiddenPx || 0) * 0.55), self.dp(8));
            if (inward >= trigger && adx >= ady * 1.10) {
              startPointer(rawX, rawY);
              return true;
            }
            self.state.dragging = true;
          }
          return true;
        }

        if (action === android.view.MotionEvent.ACTION_UP || action === android.view.MotionEvent.ACTION_CANCEL) {
          self.touchActivity();
          try { v.setPressed(false); } catch (eRelease) {}
          try { self.cancelLongPressTimer(); } catch (eCancelLong) {}
          try {
            if (self.config.ENABLE_ANIMATIONS) {
              v.animate().cancel();
              v.animate().scaleX(1.0).scaleY(1.0).setDuration(120).start();
            } else {
              v.setScaleX(1.0);
              v.setScaleY(1.0);
            }
          } catch (eScale) {}

          var pointerActiveUp = false;
          try { pointerActiveUp = typeof self.isPointerToolActive === "function" && self.isPointerToolActive(); }
          catch (ePointerActive) { pointerActiveUp = false; }

          if (pointerActiveUp) {
            self.movePointerFromRaw(rawX, rawY, true);
            if (!moved && action === android.view.MotionEvent.ACTION_UP) {
              try { self.onPointerBallTap(rawX, rawY); } catch (eTap) {}
            } else {
              try { self.onPointerBallDragEnd(rawX, rawY, action); }
              catch (eEnd) { logPosition(self, "e", "pointer drag end fail: " + String(eEnd)); }
            }
            try {
              var pointerState = self.ensurePointerToolState ? self.ensurePointerToolState() : null;
              if (pointerState) pointerState.__toolHubFixedBallDrag = false;
            } catch (eState) {}
            self.state.dragging = false;
            pointerActiveDown = false;
            pointerStarted = false;
            moved = false;
            self.applyConfiguredBallPosition(true, "pointer_end");
            return true;
          }

          if (!moved && action === android.view.MotionEvent.ACTION_UP) {
            try { self.playBounce(v); } catch (eBounce) {}
            if (self.state.addedPanel) {
              self.hideMainPanel();
              self.applyConfiguredBallPosition(true, "main_panel_close");
            } else {
              self.showPanelAvoidBall("main");
            }
            logPosition(self, "i", "click -> toggle main");
          } else {
            self.applyConfiguredBallPosition(true, "gesture_cancel");
          }

          self.state.dragging = false;
          pointerActiveDown = false;
          pointerStarted = false;
          moved = false;
          try { self.resetLongPressState(); } catch (eReset) {}
          return true;
        }

        return false;
      }
    });
  };

  proto.onScreenChangedReflow = function(reason) {
    if (!this.state || this.state.closing || !this.state.addedBall) return false;
    var oldW = Number(this.state.screen && this.state.screen.w || 0);
    var oldH = Number(this.state.screen && this.state.screen.h || 0);
    var next = this.getScreenSizePx();
    var newW = Number(next && next.w || 0);
    var newH = Number(next && next.h || 0);
    if (newW <= 0 || newH <= 0) return false;

    var rotation = -1;
    try { rotation = this.getRotation ? this.getRotation() : -1; } catch (eRotation) {}
    try {
      var landscape = rotation === android.view.Surface.ROTATION_90 || rotation === android.view.Surface.ROTATION_270;
      var portrait = rotation === android.view.Surface.ROTATION_0 || rotation === android.view.Surface.ROTATION_180;
      if ((landscape && newW < newH) || (portrait && newW > newH)) return false;
    } catch (eStable) {}

    if (oldW <= 0) oldW = newW;
    if (oldH <= 0) oldH = newH;
    this.state.screen = { w: newW, h: newH };

    try {
      if (typeof this.onPointerScreenChangedReflow === "function") {
        this.onPointerScreenChangedReflow(reason, oldW, oldH, newW, newH);
      }
    } catch (ePointer) {
      logPosition(this, "w", "pointer screen reflow hook fail: " + String(ePointer));
    }

    var applied = this.applyConfiguredBallPosition(false, "screen_reflow:" + String(reason || ""));
    logPosition(this, "i",
      "fixed screen reflow reason=" + String(reason || "") +
      " old=" + oldW + "x" + oldH +
      " new=" + newW + "x" + newH +
      " applied=" + String(applied === true)
    );
    return applied;
  };

  proto.scheduleScreenReflow = function(reason) {
    try {
      var self = this;
      this.state.screenReflowToken = Number(this.state.screenReflowToken || 0) + 1;
      var token = this.state.screenReflowToken;
      try {
        if (this.state.screenReflowRunnable && this.state.h) {
          this.state.h.removeCallbacks(this.state.screenReflowRunnable);
        }
      } catch (eRemove) {}
      this.onScreenChangedReflow(reason);
      if (!this.state.h) return true;
      var run = new java.lang.Runnable({ run: function() {
        try {
          if (self.state.closing) return;
          if (Number(self.state.screenReflowToken || 0) !== token) return;
          self.state.screenReflowRunnable = null;
          self.onScreenChangedReflow(String(reason || "") + ":stable");
        } catch (eRun) {
          logPosition(self, "w", "stable screen reflow fail: " + String(eRun));
        }
      }});
      this.state.screenReflowRunnable = run;
      this.state.h.postDelayed(run, 260);
      return true;
    } catch (eSchedule) {
      try { return this.onScreenChangedReflow(reason); } catch (eFallback) {}
    }
    return false;
  };

  proto.rebuildBallForNewSize = function(keepPanels) {
    if (!this.state || this.state.closing || !this.state.wm || !this.state.addedBall || !this.state.ballRoot || this.state.dragging) return false;
    try {
      if (!keepPanels) this.hideAllPanels();
      this.cancelDockTimer();
      this.cancelConfiguredBallPositionApply();
      this.cancelBallLayoutAnimation("rebuild");
      this.safeRemoveView(this.state.ballRoot, "ballRoot-rebuild-fixed");
      this.state.ballRoot = null;
      this.state.ballContent = null;
      this.state.ballLp = null;
      this.state.addedBall = false;
      this.createBallViews();
      var lp = this.createBallLayoutParams();
      this.state.wm.addView(this.state.ballRoot, lp);
      this.state.ballLp = lp;
      this.state.addedBall = true;
      this.touchActivity();
      logPosition(this, "i", "rebuild fixed ball ok size=" + String(lp.height) + " x=" + String(lp.x) + " y=" + String(lp.y));
      return true;
    } catch (eRebuild) {
      logPosition(this, "e", "rebuild fixed ball fail: " + String(eRebuild));
      try { this.toast("重建悬浮球失败: " + String(eRebuild)); } catch (eToast) {}
    }
    return false;
  };

  logPosition(null, "i", "ball position state machine installed");
})();
