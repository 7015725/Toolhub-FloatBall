// @version 1.0.0
// =======================【悬浮球固定边缘 / 拖动拉出指针】======================
// 交互：单击悬浮球打开主面板；长按打开设置；按住拖动悬浮球时球固定边缘，指针跟手移动。
(function() {
  function log19(level, msg) { try { safeLog(null, level || 'i', String(msg)); } catch(e) {} }
  function int19(v) { var n = parseInt(String(v), 10); return isNaN(n) ? 0 : n; }
  function dp19(app, v) { try { return app.dp(v); } catch(e) { return Math.max(1, Math.round(Number(v || 0))); } }

  function inferBallSide19(app) {
    try {
      var s = app.state && app.state.dockSide ? String(app.state.dockSide) : "";
      if (s === "left" || s === "right") return s;
      var lp = app.state.ballLp;
      var sw = Number(app.state.screen && app.state.screen.w || 0);
      if (lp && sw > 0) return (Number(lp.x || 0) + Number(lp.width || 0) / 2 < sw / 2) ? "left" : "right";
    } catch(e) {}
    return "right";
  }

  function keepBallOnEdge19(app, side, alpha) {
    try {
      if (!app || !app.state || !app.state.ballLp) return false;
      var di = app.getDockInfo ? app.getDockInfo() : null;
      var lp = app.state.ballLp;
      var sw = Math.max(1, Number(app.state.screen && app.state.screen.w || 0));
      var sh = Math.max(1, Number(app.state.screen && app.state.screen.h || 0));
      var ballSize = Math.max(1, Number((di && di.ballSize) || lp.height || lp.width || dp19(app, 56)));
      var visiblePx = Math.max(1, Number((di && di.visiblePx) || lp.width || ballSize));
      var hiddenPx = Math.max(0, Number((di && di.hiddenPx) || 0));
      var y = int19(lp.y);
      y = app.clamp ? app.clamp(y, 0, Math.max(0, sh - ballSize)) : Math.max(0, Math.min(Math.max(0, sh - ballSize), y));
      var s = (side === "left") ? "left" : "right";
      app.state.docked = true;
      app.state.dockSide = s;
      lp.width = visiblePx;
      lp.height = ballSize;
      lp.y = y;
      if (s === "left") {
        lp.x = 0;
        try { if (app.state.ballContent) app.state.ballContent.setX(-hiddenPx); } catch(eL) {}
      } else {
        lp.x = sw - visiblePx;
        try { if (app.state.ballContent) app.state.ballContent.setX(0); } catch(eR) {}
      }
      try { if (app.state.ballContent) app.state.ballContent.setAlpha(alpha === undefined ? 1.0 : Number(alpha)); } catch(eA) {}
      try { if (app.state.wm && app.state.ballRoot) app.state.wm.updateViewLayout(app.state.ballRoot, lp); } catch(eU) {}
      return true;
    } catch(e) { log19('w', 'keepBallOnEdge fail: ' + String(e)); }
    return false;
  }

  function restoreBall19(app) {
    try {
      keepBallOnEdge19(app, inferBallSide19(app), 1.0);
      try { if (app.state.ballContent) { app.state.ballContent.setScaleX(1.0); app.state.ballContent.setScaleY(1.0); } } catch(eS) {}
      try { if (app.touchActivity) app.touchActivity(); } catch(eT) {}
    } catch(e) {}
  }

  function setPointerHotspot19(app, rawX, rawY) {
    try {
      if (!app || !app.ensurePointerToolState) return false;
      var st = app.ensurePointerToolState();
      if (!st || !st.active || st.closed) return false;
      if (!st.root || !st.lp) app.showPointerWindow(st);
      var sw = Math.max(1, Number(app.state.screen && app.state.screen.w || 0));
      var sh = Math.max(1, Number(app.state.screen && app.state.screen.h || 0));
      var x = int19(Number(rawX || 0) - Number(st.anchorLocalX || 0));
      var y = int19(Number(rawY || 0) - Number(st.anchorLocalY || 0));
      if (app.clamp) {
        x = app.clamp(x, 0, Math.max(0, sw - Number(st.pointerW || 1)));
        y = app.clamp(y, 0, Math.max(0, sh - Number(st.pointerH || 1)));
      } else {
        x = Math.max(0, Math.min(Math.max(0, sw - Number(st.pointerW || 1)), x));
        y = Math.max(0, Math.min(Math.max(0, sh - Number(st.pointerH || 1)), y));
      }
      st.pendingPointerX = x;
      st.pendingPointerY = y;
      st.pointerX = x;
      st.pointerY = y;
      if (st.lp) { st.lp.x = x; st.lp.y = y; }
      try { if (st.root && st.wm && st.lp) st.wm.updateViewLayout(st.root, st.lp); } catch(eU) {}
      return true;
    } catch(e) { log19('w', 'setPointerHotspot fail: ' + String(e)); }
    return false;
  }

  function startPointerDrag19(app, rawX, rawY) {
    try {
      if (!app || !app.startPointerTool) return false;
      var active = false;
      try { active = app.isPointerToolActive && app.isPointerToolActive(); } catch(eA) { active = false; }
      if (!active) {
        var ret = app.startPointerTool({ mode: "text_pick", source: "ball_drag" });
        if (!ret || ret.ok === false) return false;
      }
      var st = app.ensurePointerToolState();
      st.__th19FixedEdgeDrag = true;
      st.dragging = true;
      st.dragStarted = true;
      st.moved = true;
      st.clickCount = 0;
      try { app.resetPointerAreaHold(); } catch(eHold) {}
      setPointerHotspot19(app, rawX, rawY);
      try {
        if (st.mode === "area_capture") app.updatePointerAreaSelection(rawX, rawY);
        else { app.updatePointerAreaHoldCandidate(); app.scheduleDraggingInspect(); }
      } catch(eUpd) {}
      return true;
    } catch(e) { log19('e', 'startPointerDrag fail: ' + String(e)); }
    return false;
  }

  function movePointerDrag19(app, rawX, rawY) {
    try {
      var st = app.ensurePointerToolState();
      if (!st || !st.active || st.closed) return false;
      st.__th19FixedEdgeDrag = true;
      st.dragging = true;
      st.dragStarted = true;
      st.moved = true;
      setPointerHotspot19(app, rawX, rawY);
      if (st.mode === "area_capture") app.updatePointerAreaSelection(rawX, rawY);
      else { app.updatePointerAreaHoldCandidate(); app.scheduleDraggingInspect(); }
      return true;
    } catch(e) { log19('w', 'movePointerDrag fail: ' + String(e)); }
    return false;
  }

  function endPointerDrag19(app, rawX, rawY, action) {
    try {
      var st = app.ensurePointerToolState();
      if (!st || !st.active || st.closed) return false;
      setPointerHotspot19(app, rawX, rawY);
      st.dragging = false;
      try { if (st.root) st.root.invalidate(); } catch(eInv) {}
      if (action === android.view.MotionEvent.ACTION_CANCEL) {
        app.setPointerToolResult({ ok: false, type: "cancel", code: "ACTION_CANCEL", message: "指针取消" });
        try { app.toast("指针已取消"); } catch(eToast) {}
        app.closePointerTool("ACTION_CANCEL", true);
        return true;
      }
      if (st.mode === "area_capture") app.finishPointerAreaCapture();
      else if (st.mode === "text_pick") app.scheduleFinishPointerTextPick();
      return true;
    } catch(e) { log19('e', 'endPointerDrag fail: ' + String(e)); }
    return false;
  }

  function makeTouchListener19(app, oldSetup) {
    var slop = dp19(app, Number(app.config && app.config.CLICK_SLOP_DP || 6));
    var startRawX = 0, startRawY = 0;
    var dragging = false;
    var pointerStarted = false;
    var side = "right";
    return new JavaAdapter(android.view.View.OnTouchListener, {
      onTouch: function(v, e) {
        try {
          if (!app || app.state.closing) return false;
          var a = e.getAction();
          if (a === android.view.MotionEvent.ACTION_DOWN) {
            startRawX = e.getRawX();
            startRawY = e.getRawY();
            dragging = false;
            pointerStarted = false;
            side = inferBallSide19(app);
            try { app.touchActivity(); } catch(eTouch) {}
            try { if (app.state.ballAnimator) { app.state.ballAnimator.cancel(); app.state.ballAnimator = null; } } catch(eAnim) {}
            try { v.setPressed(true); v.setAlpha(1.0); v.drawableHotspotChanged(e.getX(), e.getY()); } catch(eView) {}
            try { if (app.state.ballContent) { app.state.ballContent.animate().cancel(); app.state.ballContent.setScaleX(0.94); app.state.ballContent.setScaleY(0.94); } } catch(eScale) {}
            try { if (app.armLongPress) app.armLongPress(); } catch(eLong) {}
            return true;
          }
          if (a === android.view.MotionEvent.ACTION_MOVE) {
            var rawX = e.getRawX(), rawY = e.getRawY();
            var dx = Math.round(rawX - startRawX), dy = Math.round(rawY - startRawY);
            try { app.touchActivity(); } catch(eTM) {}
            if (app.state.longPressTriggered) return true;
            if (!dragging && (Math.abs(dx) > slop || Math.abs(dy) > slop)) {
              dragging = true;
              try { app.cancelLongPressTimer(); } catch(eCancelLong) {}
              try { app.hideAllPanels(); } catch(eHide) {}
              keepBallOnEdge19(app, side, 0.58);
              pointerStarted = startPointerDrag19(app, rawX, rawY);
              try { safeLog(app.L, 'i', 'ball drag -> fixed-edge pointer side=' + side); } catch(eLog) {}
              return true;
            }
            if (dragging) {
              keepBallOnEdge19(app, side, 0.58);
              if (!pointerStarted) pointerStarted = startPointerDrag19(app, rawX, rawY);
              else movePointerDrag19(app, rawX, rawY);
              return true;
            }
            return true;
          }
          if (a === android.view.MotionEvent.ACTION_UP || a === android.view.MotionEvent.ACTION_CANCEL) {
            var upRawX = e.getRawX(), upRawY = e.getRawY();
            try { app.touchActivity(); } catch(eTU) {}
            try { v.setPressed(false); } catch(eP) {}
            try { app.cancelLongPressTimer(); } catch(eCancel) {}
            try { if (app.state.ballContent) { app.state.ballContent.setScaleX(1.0); app.state.ballContent.setScaleY(1.0); } } catch(eSU) {}
            if (app.state.longPressTriggered) {
              try { app.resetLongPressState(); } catch(eReset) {}
              restoreBall19(app);
              dragging = false; pointerStarted = false;
              return true;
            }
            if (pointerStarted) {
              endPointerDrag19(app, upRawX, upRawY, a);
              restoreBall19(app);
              dragging = false; pointerStarted = false;
              try { app.resetLongPressState(); } catch(eReset2) {}
              return true;
            }
            if (!dragging && a === android.view.MotionEvent.ACTION_UP) {
              var active = false;
              try { active = app.isPointerToolActive && app.isPointerToolActive(); } catch(eActive) { active = false; }
              if (!active) {
                try { if (app.playBounce) app.playBounce(v); } catch(eB) {}
                try { if (app.state.addedPanel) app.hideMainPanel(); else app.showPanelAvoidBall("main"); } catch(ePanel) { log19('e', 'toggle main fail: ' + String(ePanel)); }
                try { safeLog(app.L, 'i', 'click -> toggle main'); } catch(eLog2) {}
              }
            }
            restoreBall19(app);
            dragging = false; pointerStarted = false;
            try { app.resetLongPressState(); } catch(eReset3) {}
            return true;
          }
        } catch(err) {
          log19('e', 'fixed edge touch fail: ' + String(err));
          try { restoreBall19(app); } catch(eRestore) {}
        }
        return true;
      }
    });
  }

  function installGesture19() {
    try {
      if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return false;
      var proto = FloatBallAppWM.prototype;
      if (proto.__toolHubFixedEdgePointerGesturePatchInstalled === true) return true;
      if (typeof proto.setupTouchListener !== "function") return false;
      var oldSetup = proto.setupTouchListener;
      proto.setupTouchListener = function() {
        try { return makeTouchListener19(this, oldSetup); }
        catch(eMake) { log19('e', 'makeTouchListener19 fail: ' + String(eMake)); return oldSetup.call(this); }
      };
      proto.rebindFixedEdgePointerGesture = function() {
        try {
          if (this.state && this.state.ballContent) {
            this.state.ballContent.setOnTouchListener(this.setupTouchListener());
            return true;
          }
        } catch(eRebind) { log19('w', 'rebind gesture fail: ' + String(eRebind)); }
        return false;
      };
      var oldCreateBallViews = proto.createBallViews;
      if (typeof oldCreateBallViews === "function") {
        proto.createBallViews = function() {
          var ret = oldCreateBallViews.call(this);
          try { this.rebindFixedEdgePointerGesture(); } catch(eRebind2) {}
          return ret;
        };
      }
      proto.__toolHubFixedEdgePointerGesturePatchInstalled = true;
      try { if (typeof TOOLHUB_ACTIVE_APP !== "undefined" && TOOLHUB_ACTIVE_APP && TOOLHUB_ACTIVE_APP.rebindFixedEdgePointerGesture) TOOLHUB_ACTIVE_APP.rebindFixedEdgePointerGesture(); } catch(eActive) {}
      log19('i', 'fixed edge pointer gesture patch installed');
      return true;
    } catch(e) { log19('e', 'installGesture19 fail: ' + String(e)); }
    return false;
  }

  try {
    new java.lang.Thread(new java.lang.Runnable({ run: function() {
      for (var i = 0; i < 60; i++) {
        try { if (installGesture19()) return; } catch(eLoop) {}
        try { java.lang.Thread.sleep(200); } catch(eSleep) {}
      }
      log19('w', 'fixed edge pointer gesture patch not installed after retry');
    }})).start();
  } catch(eThread) {
    try { installGesture19(); } catch(eDirect) {}
  }
})();
