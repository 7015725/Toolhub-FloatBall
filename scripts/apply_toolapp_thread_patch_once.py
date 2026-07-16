#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "code" / "th_16_entry.js"
VERIFY = ROOT / "scripts" / "verify_toolapp_thread_affinity.py"
MARKER = "__toolHubToolAppMainThreadPatchInstalled"

PATCH = r'''

// =======================【ToolApp：Android 主线程归属修复】=======================
// 这段代码的主要内容/用途：让包含 EditText 的 ToolApp 完整 View 生命周期归属
// system_server 主线程，避免 IME/Insets 在主线程更新由 HandlerThread 创建的
// ViewRoot 时触发 CalledFromWrongThreadException。悬浮球、主面板、指针和 Canvas
// 继续使用 ToolHub WM HandlerThread；SQLite 保存通过同步桥回到 WM 线程。
(function() {
  try {
    if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
    var proto = FloatBallAppWM.prototype;
    if (proto.__toolHubToolAppMainThreadPatchInstalled === true) return;

    var oldHideViewerPanel = proto.hideViewerPanel;
    var oldSafeRemoveView = proto.safeRemoveView;
    var oldClose = proto.close;
    var oldUpdatePanelBackground = proto.updatePanelBackground;
    var oldRenderInlineNoticeNow = proto.renderInlineNoticeNow;

    proto.isAndroidMainThread = function() {
      try {
        var mainLooper = android.os.Looper.getMainLooper();
        var currentLooper = android.os.Looper.myLooper();
        return mainLooper !== null && currentLooper !== null && currentLooper === mainLooper;
      } catch(e) {}
      return false;
    };

    proto.getToolAppThreadMeta = function() {
      var ret = { isMain: false, javaTid: 0, name: "" };
      try { ret.isMain = this.isAndroidMainThread(); } catch(eMain) {}
      try { ret.javaTid = Number(java.lang.Thread.currentThread().getId()); } catch(eTid) {}
      try { ret.name = String(java.lang.Thread.currentThread().getName() || ""); } catch(eName) {}
      return ret;
    };

    proto.logToolAppThread = function(phase, route, generation, extra) {
      try {
        var meta = this.getToolAppThreadMeta();
        safeLog(this.L, meta.isMain ? "d" : "w",
          "toolapp thread phase=" + String(phase || "") +
          " route=" + String(route || this.state.toolAppRoute || "") +
          " generation=" + String(generation || this.state.toolAppUiGeneration || 0) +
          " isMain=" + String(meta.isMain) +
          " javaTid=" + String(meta.javaTid) +
          " thread=" + String(meta.name) +
          (extra ? " " + String(extra) : ""));
      } catch(e) {}
    };

    proto.postToAndroidMain = function(fn, label) {
      if (!fn) return false;
      var self = this;
      try {
        if (this.isAndroidMainThread()) {
          fn();
          return true;
        }
        var handler = new android.os.Handler(android.os.Looper.getMainLooper());
        return !!handler.post(new java.lang.Runnable({
          run: function() {
            try { fn(); }
            catch(eRun) {
              try { safeLog(self.L, "e", "android main task fail label=" + String(label || "") + " err=" + String(eRun)); } catch(eLog) {}
            }
          }
        }));
      } catch(ePost) {
        try { safeLog(this.L, "e", "android main post fail label=" + String(label || "") + " err=" + String(ePost)); } catch(eLog2) {}
      }
      return false;
    };

    proto.postToToolAppUi = function(fn, label) {
      if (!fn) return false;
      try {
        if (this.isAndroidMainThread()) {
          fn();
          return true;
        }
        var root = this.state ? this.state.toolAppRoot : null;
        if (root) {
          var self = this;
          return !!root.post(new java.lang.Runnable({
            run: function() {
              try { fn(); }
              catch(eRun) { try { safeLog(self.L, "e", "toolapp owner task fail label=" + String(label || "") + " err=" + String(eRun)); } catch(eLog) {} }
            }
          }));
        }
      } catch(eRootPost) {}
      return this.postToAndroidMain(fn, label || "toolapp_ui");
    };

    proto.runOnToolHubWmSync = function(fn, timeoutMs) {
      if (!fn) return { ok: false, error: "empty-fn" };
      var self = this;
      try {
        var h = this.state ? this.state.h : null;
        if (!h) return { ok: false, error: "wm-handler-missing" };
        var currentLooper = android.os.Looper.myLooper();
        var wmLooper = h.getLooper();
        if (currentLooper !== null && wmLooper !== null && currentLooper === wmLooper) {
          return { ok: true, value: fn(), direct: true };
        }
        var box = { ok: false, value: null, error: null, active: true };
        var latch = new java.util.concurrent.CountDownLatch(1);
        var task = new java.lang.Runnable({
          run: function() {
            try {
              if (!box.active) return;
              box.value = fn();
              box.ok = true;
            } catch(eRun) {
              box.error = eRun;
            } finally {
              try { latch.countDown(); } catch(eCount) {}
            }
          }
        });
        if (!h.post(task)) return { ok: false, error: "wm-post-failed" };
        var waitMs = Math.max(250, Number(timeoutMs || 4000));
        var done = latch.await(waitMs, java.util.concurrent.TimeUnit.MILLISECONDS);
        if (!done) {
          box.active = false;
          try { h.removeCallbacks(task); } catch(eRemove) {}
          return { ok: false, error: "wm-timeout", timedOut: true };
        }
        box.active = false;
        if (!box.ok) return { ok: false, error: box.error };
        return box;
      } catch(e) {
        try { safeLog(self.L, "e", "wm sync bridge fail: " + String(e)); } catch(eLog) {}
        return { ok: false, error: e };
      }
    };

    proto.bumpToolAppUiGeneration = function(reason) {
      var next = 1;
      try {
        next = Number(this.state.toolAppUiGeneration || 0) + 1;
        if (next > 1000000000) next = 1;
        this.state.toolAppUiGeneration = next;
        this.state.toolAppUiGenerationReason = String(reason || "");
      } catch(e) {}
      return next;
    };

    proto.prepareToolAppState = function(route, resetStack) {
      var r = this.isToolAppRoute(route) ? String(route) : "settings";
      this.state.toolAppActive = true;
      this.state.toolAppRoute = r;
      this.state.toolAppUiOwner = "android_main";
      if (r === "settings") this.state.settingsGroupKey = null;
      if (resetStack && r === "settings") {
        this.state.pendingUserCfg = null;
        this.state.pendingDirty = false;
        this.state.previewMode = false;
        this.state.toolAppScrollY = 0;
      }
      if (resetStack || !this.state.toolAppNavStack || !this.state.toolAppNavStack.length) {
        this.state.toolAppNavStack = [this.makeToolAppStackEntry(r)];
        try { this.bumpToolAppStackVersion(); } catch(eStack) {}
      }
      return r;
    };

    proto.prepareToolAppRouteData = function(route) {
      var r = String(route || "");
      if (r !== "btn_editor") return true;
      if (this.state.keepBtnEditorState && this.state.tempButtons) return true;
      var self = this;
      function loadButtonsSnapshot() {
        var current = ConfigManager.loadButtons();
        var cloned = JSON.parse(JSON.stringify(current || []));
        var normalized = self.normalizeButtonEditorButtons(cloned);
        self.state.tempButtons = normalized.buttons;
        self.state.keepBtnEditorState = true;
        return true;
      }
      if (this.isAndroidMainThread()) {
        var ret = this.runOnToolHubWmSync(loadButtonsSnapshot, 5000);
        if (!ret.ok) throw "按钮配置预取失败: " + String(ret.error || "unknown");
        return true;
      }
      return loadButtonsSnapshot();
    };

    proto.addToolAppPanelOnMain = function(shell, layout, generation) {
      if (!this.isAndroidMainThread()) throw "ToolApp addView must run on Android main";
      if (!shell || !layout) throw "ToolApp shell/layout missing";
      if (Number(generation) !== Number(this.state.toolAppUiGeneration || 0)) return false;

      var flags = android.view.WindowManager.LayoutParams.FLAG_DIM_BEHIND;
      var lp = new android.view.WindowManager.LayoutParams(
        Number(layout.width),
        Number(layout.height),
        android.view.WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        flags,
        android.graphics.PixelFormat.TRANSLUCENT
      );
      lp.dimAmount = 0.5;
      lp.softInputMode = android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE |
        android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN;
      lp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
      lp.x = Number(layout.x || 0);
      lp.y = Number(layout.y || 0);

      try { if (this.attachPanelSystemKeyHandler) this.attachPanelSystemKeyHandler(shell, "tool_app"); }
      catch(eKey) { safeLog(this.L, "w", "toolapp key attach fail: " + String(eKey)); }

      this.logToolAppThread("WM_ADD_BEGIN", this.state.toolAppRoute, generation,
        "x=" + String(lp.x) + " y=" + String(lp.y) + " w=" + String(lp.width) + " h=" + String(lp.height));
      this.state.wm.addView(shell, lp);
      this.state.viewerPanel = shell;
      this.state.viewerPanelLp = lp;
      this.state.viewerPanelType = "tool_app";
      this.state.addedViewer = true;

      try {
        if (this.config.ENABLE_ANIMATIONS) {
          shell.setScaleX(0.96);
          shell.setScaleY(0.96);
          shell.setAlpha(0);
          shell.animate().scaleX(1).scaleY(1).alpha(1).setDuration(180)
            .setInterpolator(new android.view.animation.AccelerateDecelerateInterpolator()).start();
        } else {
          shell.setTranslationX(0);
          shell.setScaleX(1);
          shell.setScaleY(1);
          shell.setAlpha(1);
        }
      } catch(eAnim) {}
      this.logToolAppThread("WM_ADD_DONE", this.state.toolAppRoute, generation, "which=tool_app");
      return true;
    };

    proto.showToolAppOnMain = function(route, resetStack, generation) {
      var r = String(route || "settings");
      if (!this.isAndroidMainThread()) throw "showToolAppOnMain called off main";
      if (this.state.closing) return false;
      if (Number(generation) !== Number(this.state.toolAppUiGeneration || 0)) return false;
      this.logToolAppThread("BUILD_BEGIN", r, generation, "reset=" + String(!!resetStack));

      var raw = this.buildPanelView(r);
      var shell = this.ensureToolAppShell();
      if (!shell) throw "ToolApp shell missing";
      if (Number(generation) !== Number(this.state.toolAppUiGeneration || 0)) return false;

      this.updateToolAppShellChrome(this.getToolAppTitle(r), this.state.toolAppNavStack.length > 1);
      this.setToolAppContent(raw);
      var layout = this.calculateToolAppLayout(shell);
      var lp0 = shell.getLayoutParams();
      if (!lp0) lp0 = new android.view.ViewGroup.LayoutParams(layout.width, layout.height);
      lp0.width = layout.width;
      lp0.height = layout.height;
      shell.setLayoutParams(lp0);

      if (!this.state.addedViewer || this.state.viewerPanel !== shell) {
        this.addToolAppPanelOnMain(shell, layout, generation);
      } else if (this.state.viewerPanelLp) {
        this.state.viewerPanelLp.width = layout.width;
        this.state.viewerPanelLp.height = layout.height;
        this.state.viewerPanelLp.x = layout.x;
        this.state.viewerPanelLp.y = layout.y;
        this.state.wm.updateViewLayout(shell, this.state.viewerPanelLp);
      }
      this.logToolAppThread("BUILD_DONE", r, generation, "attached=" + String(!!this.state.addedViewer));
      return true;
    };

    proto.showToolApp = function(route, resetStack) {
      if (!this.state || this.state.closing) return false;
      var self = this;
      var r = this.isToolAppRoute(route) ? String(route) : "settings";
      var generation = this.bumpToolAppUiGeneration("show:" + r);
      try {
        if (this.isAndroidMainThread()) {
          this.prepareToolAppState(r, resetStack);
          this.prepareToolAppRouteData(r);
          if (!this.state.addedMask && this.state.h) {
            try {
              this.state.h.post(new java.lang.Runnable({ run: function() {
                try { if (!self.state.closing) self.showMask(); } catch(eMask) {}
              }}));
            } catch(ePostMask) {}
          }
          return this.showToolAppOnMain(r, resetStack, generation);
        }

        this.touchActivity();
        this.hideMainPanel();
        this.hideSettingsPanel();
        this.showMask();
        this.prepareToolAppState(r, resetStack);
        this.prepareToolAppRouteData(r);
        return this.postToAndroidMain(function() {
          if (Number(generation) !== Number(self.state.toolAppUiGeneration || 0)) return;
          try { self.showToolAppOnMain(r, resetStack, generation); }
          catch(eBuild) {
            self.state.toolAppActive = false;
            safeLog(self.L, "e", "showToolApp main fail route=" + r + " err=" + String(eBuild));
            try { self.toast("设置页面显示失败: " + String(eBuild)); } catch(eToast) {}
          }
        }, "show_toolapp:" + r);
      } catch(e) {
        this.state.toolAppActive = false;
        safeLog(this.L, "e", "showToolApp dispatch fail route=" + r + " err=" + String(e));
        try { this.toast("设置页面显示失败: " + String(e)); } catch(eToast2) {}
      }
      return false;
    };

    proto.removeToolAppOnMain = function(reason, rootOverride) {
      if (!this.isAndroidMainThread()) throw "ToolApp removeView must run on Android main";
      var root = rootOverride || this.state.toolAppRoot ||
        (String(this.state.viewerPanelType || "") === "tool_app" ? this.state.viewerPanel : null);
      if (!root) return true;
      var generation = this.bumpToolAppUiGeneration("remove:" + String(reason || ""));
      this.logToolAppThread("REMOVE_BEGIN", this.state.toolAppRoute, generation, "reason=" + String(reason || ""));

      try {
        var focused = root.findFocus ? root.findFocus() : null;
        if (focused) {
          try {
            var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
            var token = focused.getWindowToken ? focused.getWindowToken() : root.getWindowToken();
            if (imm && token) imm.hideSoftInputFromWindow(token, 0);
          } catch(eIme) {}
          try { focused.clearFocus(); } catch(eClearFocus) {}
        }
      } catch(eFocus) {}
      try { root.animate().cancel(); } catch(eAnim) {}
      try { root.clearAnimation(); } catch(eClearAnim) {}
      try { if (this.clearToolAppBackPreview) this.clearToolAppBackPreview(false); } catch(ePreview) {}
      try { if (this.unregisterPanelPredictiveBack) this.unregisterPanelPredictiveBack(root, false); } catch(eBack) {}

      try {
        if (this.state.wm && this.state.wm.removeViewImmediate) this.state.wm.removeViewImmediate(root);
        else if (this.state.wm) this.state.wm.removeView(root);
      } catch(eRemove) {
        var removeText = String(eRemove || "");
        if (removeText.indexOf("not attached") < 0 && removeText.indexOf("not currently attached") < 0) {
          safeLog(this.L, "w", "toolapp remove fail reason=" + String(reason || "") + " err=" + removeText);
        }
      }

      if (this.state.viewerPanel === root) {
        this.state.viewerPanel = null;
        this.state.viewerPanelLp = null;
        this.state.viewerPanelType = null;
        this.state.addedViewer = false;
      }
      if (this.state.toolAppRoot === root) {
        this.state.toolAppRoot = null;
        this.state.toolAppBody = null;
        this.state.toolAppContentHost = null;
        this.state.toolAppBackPreviewView = null;
        this.state.toolAppBackPreviewRoute = null;
        this.state.toolAppBackPreviewReady = false;
        this.state.toolAppBackPreviewStackVersion = null;
        this.state.toolAppBackPreviewEntryKey = null;
        this.state.toolAppTitleView = null;
        this.state.toolAppBackButton = null;
        this.state.toolAppHelpButton = null;
        this.state.toolAppCloseButton = null;
        this.state.toolAppRightButton = null;
      }
      this.state.toolAppActive = false;
      this.logToolAppThread("REMOVE_DONE", "", generation, "reason=" + String(reason || ""));

      var self = this;
      try {
        if (this.state.h) this.state.h.post(new java.lang.Runnable({ run: function() {
          try {
            if (self.hideMaskIfNoPanelVisible) self.hideMaskIfNoPanelVisible();
            else if (!self.state.addedPanel && !self.state.addedSettings && !self.state.addedViewer) self.hideMask();
            self.touchActivity();
            if (self._clearHeavyCachesIfAllHidden) self._clearHeavyCachesIfAllHidden("removeToolAppOnMain");
          } catch(eWmCleanup) {}
        }}));
      } catch(ePostCleanup) {}
      return true;
    };

    proto.closeToolApp = function() {
      try {
        this.state.toolAppActive = false;
        this.state.toolAppRoute = null;
        this.state.toolAppNavStack = [];
        try { this.bumpToolAppStackVersion(); } catch(eStack) {}
        this.state.settingsGroupKey = null;
        this.state.settingsHomeSelectedItemId = null;
        var self = this;
        var root = this.state.toolAppRoot ||
          (String(this.state.viewerPanelType || "") === "tool_app" ? this.state.viewerPanel : null);
        if (this.isAndroidMainThread()) return this.removeToolAppOnMain("close_toolapp", root);
        return this.postToAndroidMain(function() { self.removeToolAppOnMain("close_toolapp", root); }, "close_toolapp");
      } catch(e) {
        safeLog(this.L, "e", "closeToolApp main-thread patch fail: " + String(e));
      }
      return false;
    };

    proto.hideViewerPanel = function() {
      try {
        var isToolApp = String(this.state.viewerPanelType || "") === "tool_app" ||
          (this.state.toolAppRoot && this.state.viewerPanel === this.state.toolAppRoot);
        if (isToolApp) {
          var self = this;
          var root = this.state.toolAppRoot || this.state.viewerPanel;
          if (this.isAndroidMainThread()) return this.removeToolAppOnMain("hide_viewer", root);
          this.postToAndroidMain(function() { self.removeToolAppOnMain("hide_viewer", root); }, "hide_toolapp_viewer");
          return true;
        }
      } catch(eDetect) {}
      return oldHideViewerPanel ? oldHideViewerPanel.apply(this, arguments) : false;
    };

    proto.safeRemoveView = function(v, whichName, options) {
      try {
        var isToolApp = !!v && (
          v === this.state.toolAppRoot ||
          (String(this.state.viewerPanelType || "") === "tool_app" && v === this.state.viewerPanel)
        );
        if (isToolApp) {
          var self = this;
          var captured = v;
          if (this.isAndroidMainThread()) {
            this.removeToolAppOnMain(whichName || "safe_remove", captured);
            return { ok: true, toolAppMain: true };
          }
          var posted = this.postToAndroidMain(function() {
            self.removeToolAppOnMain(whichName || "safe_remove", captured);
          }, "safe_remove_toolapp");
          return { ok: !!posted, deferred: !!posted, toolAppMain: true };
        }
      } catch(eDetect) {}
      return oldSafeRemoveView ? oldSafeRemoveView.apply(this, arguments) : { ok: false, err: "safeRemoveView missing" };
    };

    if (oldUpdatePanelBackground) {
      proto.updatePanelBackground = function(panel) {
        try {
          if (panel && panel === this.state.toolAppRoot && !this.isAndroidMainThread()) {
            var self = this;
            return this.postToAndroidMain(function() {
              try { oldUpdatePanelBackground.call(self, panel); } catch(eRun) { safeLog(self.L, "w", "toolapp background update fail: " + String(eRun)); }
            }, "toolapp_background");
          }
        } catch(eDetect) {}
        return oldUpdatePanelBackground.apply(this, arguments);
      };
    }

    if (oldRenderInlineNoticeNow) {
      proto.renderInlineNoticeNow = function() {
        if (!this.state || !this.state.settingsNoticeContainerRef || !this.state.toolAppActive) {
          return oldRenderInlineNoticeNow.apply(this, arguments);
        }
        var self = this;
        var msg = String(this.state.inlineNoticeMsg || "");
        var kind = String(this.state.inlineNoticeKind || "info");
        return this.postToToolAppUi(function() {
          try {
            var box = self.state.settingsNoticeContainerRef;
            if (!box) return;
            box.removeAllViews();
            if (!msg) { box.setVisibility(android.view.View.GONE); return; }
            var isDark = self.isDarkTheme ? self.isDarkTheme() : false;
            var C = self.ui && self.ui.colors ? self.ui.colors : {};
            var T = self.getSettingsColorScheme ? self.getSettingsColorScheme() : null;
            var primary = T && T.primary ? T.primary : (C.primary || android.graphics.Color.parseColor("#005BC0"));
            var error = T && T.danger ? T.danger : (C.danger || android.graphics.Color.parseColor("#BA1A1A"));
            var okColor = T && T.success ? T.success : (C.success || primary);
            var color = kind === "error" ? error : (kind === "ok" ? okColor : primary);
            var bg = self.withAlpha ? self.withAlpha(color, isDark ? 0.20 : 0.10) : color;
            var stroke = self.withAlpha ? self.withAlpha(color, isDark ? 0.44 : 0.28) : color;
            var tv = new android.widget.TextView(context);
            tv.setText(msg);
            toolhubSafeSetTextColor(tv, color);
            tv.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
            tv.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
            tv.setGravity(android.view.Gravity.CENTER_VERTICAL);
            if (self.ui && self.ui.createStrokeDrawable) tv.setBackground(self.ui.createStrokeDrawable(bg, stroke, self.dp(1), self.dp(14)));
            box.addView(tv, new android.widget.LinearLayout.LayoutParams(-1, -2));
            box.setVisibility(android.view.View.VISIBLE);
          } catch(eRun) { safeLog(self.L, "e", "toolapp inline notice fail: " + String(eRun)); }
        }, "toolapp_inline_notice");
      };
    }

    proto.close = function() {
      var self = this;
      var root = null;
      try {
        root = this.state ? (this.state.toolAppRoot ||
          (String(this.state.viewerPanelType || "") === "tool_app" ? this.state.viewerPanel : null)) : null;
      } catch(eRoot) { root = null; }

      if (this.isAndroidMainThread()) {
        try { if (root) this.removeToolAppOnMain("app_close_main", root); } catch(eRemoveMain) {}
        try {
          if (this.state && this.state.h) {
            return this.state.h.post(new java.lang.Runnable({ run: function() {
              try { oldClose.call(self); } catch(eOldClose) { safeLog(self.L, "e", "deferred close fail: " + String(eOldClose)); }
            }}));
          }
        } catch(ePostClose) {}
      } else if (root && typeof runOnMainSync === "function") {
        var rm = runOnMainSync(function() {
          return self.removeToolAppOnMain("app_close", root);
        }, 2200);
        if (!rm || !rm.ok) {
          try { safeLog(this.L, "w", "toolapp close main barrier incomplete: " + String(rm && rm.error || "unknown")); } catch(eLogBarrier) {}
        }
      }
      return oldClose.apply(this, arguments);
    };

    try {
      if (typeof ConfigManager !== "undefined" && ConfigManager && typeof ConfigManager.saveButtons === "function" &&
          ConfigManager.__toolHubMainThreadSaveBridgeInstalled !== true) {
        var oldSaveButtons = ConfigManager.saveButtons;
        ConfigManager.saveButtons = function(buttons) {
          var app = null;
          try { app = (typeof TOOLHUB_ACTIVE_APP !== "undefined") ? TOOLHUB_ACTIVE_APP : null; } catch(eApp) { app = null; }
          if (app && app.state && app.state.h && app.isAndroidMainThread && app.isAndroidMainThread() && !app.state.closing) {
            var snapshot = JSON.parse(JSON.stringify(buttons || []));
            var ret = app.runOnToolHubWmSync(function() {
              return oldSaveButtons.call(ConfigManager, snapshot);
            }, 6000);
            if (!ret.ok) throw "按钮配置后台写入失败: " + String(ret.error || "unknown");
            return ret.value;
          }
          return oldSaveButtons.apply(ConfigManager, arguments);
        };
        ConfigManager.__toolHubMainThreadSaveBridgeInstalled = true;
      }
    } catch(eSaveBridge) {
      try { safeLog(null, "e", "install button save thread bridge fail: " + String(eSaveBridge)); } catch(eLogSave) {}
    }

    proto.__toolHubToolAppMainThreadPatchInstalled = true;
  } catch(eInstall) {
    try { safeLog(null, "e", "install toolapp main-thread patch fail: " + String(eInstall)); } catch(eLog) {}
  }
})();
'''

VERIFY_TEXT = r'''#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
ENTRY = ROOT / "code" / "th_16_entry.js"


def main():
    text = ENTRY.read_text(encoding="utf-8")
    marker = text.find("// =======================【ToolApp：Android 主线程归属修复】")
    patch = text[marker:] if marker >= 0 else ""
    checks = [
        ("patch marker", marker >= 0),
        ("main looper dispatcher", "proto.postToAndroidMain = function" in patch),
        ("toolapp owner dispatcher", "proto.postToToolAppUi = function" in patch),
        ("wm sync bridge", "proto.runOnToolHubWmSync = function" in patch),
        ("main-only builder", "proto.showToolAppOnMain = function" in patch),
        ("main-only add", "proto.addToolAppPanelOnMain = function" in patch),
        ("main-only remove", "proto.removeToolAppOnMain = function" in patch),
        ("ime starts hidden", "SOFT_INPUT_STATE_ALWAYS_HIDDEN" in patch),
        ("no forced focus in patch", ".requestFocus()" not in patch),
        ("button persistence bridge", "ConfigManager.__toolHubMainThreadSaveBridgeInstalled" in patch),
        ("generation guard", "toolAppUiGeneration" in patch),
        ("installed marker", "proto.__toolHubToolAppMainThreadPatchInstalled = true" in patch),
        ("wrong helper excluded", "runOnUiThreadSafe" not in patch),
    ]
    version = re.search(r"^// @version\s+(\d+)\.(\d+)\.(\d+)", text)
    checks.append(("entry module version", bool(version) and tuple(map(int, version.groups())) >= (1, 0, 14)))
    failed = [name for name, ok in checks if not ok]
    if failed:
        print("ToolApp thread affinity verification FAILED")
        for name in failed:
            print(" - " + name)
        return 1
    print("ToolApp thread affinity verification OK checks=%d" % len(checks))
    return 0


if __name__ == "__main__":
    sys.exit(main())
'''


def main():
    text = ENTRY.read_text(encoding="utf-8")
    if MARKER not in text:
        m = re.search(r"^// @version\s+(\d+)\.(\d+)\.(\d+)", text, re.M)
        if not m:
            raise SystemExit("th_16_entry.js version marker missing")
        major, minor, patch = map(int, m.groups())
        new_version = "%d.%d.%d" % (major, minor, patch + 1)
        text = text[:m.start()] + "// @version " + new_version + text[m.end():]
        text = text.rstrip() + PATCH + "\n"
        ENTRY.write_text(text, encoding="utf-8")
    VERIFY.write_text(VERIFY_TEXT, encoding="utf-8")
    print("patched", ENTRY)
    print("wrote", VERIFY)


if __name__ == "__main__":
    main()
