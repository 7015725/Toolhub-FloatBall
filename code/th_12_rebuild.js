// @version 1.0.2
// =======================【安全兼容配置安装器】======================
// 这段代码的主要内容/用途：在不改变现有执行逻辑的前提下，注入后续 Shell / Shortcut / Content 加固需要的配置项。
// 默认值全部保持兼容：Shell=compat，Shortcut=compat，Content=audit，ToolApp 横滑比例仍为 1.08。
(function() {
  function putSchema(key, schema) {
    try {
      if (typeof ConfigValidator === "undefined" || !ConfigValidator || !ConfigValidator.schemas) return;
      if (typeof ConfigValidator.schemas[key] === "undefined") ConfigValidator.schemas[key] = schema;
    } catch(e) {}
  }

  function putDefault(key, value) {
    try {
      if (typeof ConfigManager === "undefined" || !ConfigManager || !ConfigManager.defaultSettings) return;
      if (typeof ConfigManager.defaultSettings[key] === "undefined") ConfigManager.defaultSettings[key] = value;
    } catch(e) {}
  }

  putSchema("TOOLAPP_BACK_SURFACE_DOMINANCE", { type: "float", min: 1.0, max: 3.0, default: 1.08 });
  putSchema("SHELL_BRIDGE_MODE", { type: "enum", values: ["compat", "explicit", "strict"], default: "compat" });
  putSchema("SHELL_BRIDGE_TARGET_PACKAGE", { type: "string", default: "" });
  putSchema("SHELL_BRIDGE_TARGET_CLASS", { type: "string", default: "" });
  putSchema("SHELL_BRIDGE_EXTRA_TOKEN", { type: "string", default: "token" });
  putSchema("SHELL_BRIDGE_TOKEN", { type: "string", default: "" });
  putSchema("SHELL_BRIDGE_REQUIRE_TOKEN", { type: "bool", default: false });
  putSchema("SHORTCUT_EXEC_MODE", { type: "enum", values: ["compat", "strict"], default: "compat" });
  putSchema("CONTENT_SECURITY_MODE", { type: "enum", values: ["off", "audit", "strict"], default: "audit" });
  putSchema("CONTENT_URI_ALLOWLIST", { type: "string", default: "content://settings/system/|content://settings/secure/|content://settings/global/" });

  putDefault("TOOLAPP_BACK_SURFACE_DOMINANCE", 1.08);
  putDefault("SHELL_BRIDGE_MODE", "compat");
  putDefault("SHELL_BRIDGE_TARGET_PACKAGE", "");
  putDefault("SHELL_BRIDGE_TARGET_CLASS", "");
  putDefault("SHELL_BRIDGE_EXTRA_TOKEN", "token");
  putDefault("SHELL_BRIDGE_TOKEN", "");
  putDefault("SHELL_BRIDGE_REQUIRE_TOKEN", false);
  putDefault("SHORTCUT_EXEC_MODE", "compat");
  putDefault("CONTENT_SECURITY_MODE", "audit");
  putDefault("CONTENT_URI_ALLOWLIST", "content://settings/system/|content://settings/secure/|content://settings/global/");
})();

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
    try { this.toast("重建悬浮球失败: " + String(eAdd));  } catch(eT) { safeLog(null, 'e', "catch " + String(eT)); }
    safeLog(this.L, 'e',  "rebuildBall add fail err=" + String(eAdd));
    return false;
  }

  this.savePos(this.state.ballLp.x, this.state.ballLp.y);
  this.touchActivity();
  safeLog(this.L, 'i',  "rebuildBall ok size=" + String(newSize) + " x=" + String(newX) + " y=" + String(newY));
  return true;
};

// =======================【可选扩展：指针文本识别】======================
try {
  if (typeof loadScript === "function") loadScript("th_18_pointer_ocr.js");
} catch(ePointerTextExt) {
  try { safeLog(null, 'w', "optional pointer text extension skipped: " + String(ePointerTextExt)); } catch(eLog) {}
}
