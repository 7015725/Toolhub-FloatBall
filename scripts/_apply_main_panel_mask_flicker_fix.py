#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def fail(message):
    raise SystemExit("FAIL apply-main-panel-mask-flicker: " + message)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail("%s expected once, actual %d" % (label, count))
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label):
    new_text, count = re.subn(pattern, replacement, text, count=1, flags=re.S | re.M)
    if count != 1:
        fail("%s regex expected once, actual %d" % (label, count))
    return new_text


# th_09_animation.js: mask lifecycle and empty ToolApp guard.
th09_path = ROOT / "code" / "th_09_animation.js"
th09 = th09_path.read_text(encoding="utf-8")
th09 = replace_once(th09, "// @version 1.0.11", "// @version 1.0.12", "th09 version")

mask_lifecycle = r'''FloatBallAppWM.prototype.hideMask = function\(\) \{.*?^\};\n\nFloatBallAppWM.prototype.hideMaskIfNoPanelVisible = function\(\) \{.*?^\};'''
mask_lifecycle_new = '''FloatBallAppWM.prototype.hideMask = function(reason, expectedMask, expectedGeneration) {
  if (!this.state) return false;

  var mask = this.state.mask;
  var generation = Number(this.state.maskGeneration || 0);
  if (!this.state.addedMask || !mask) return false;

  if (expectedMask && expectedMask !== mask) {
    safeLog(this.L, 'd', "mask hide skipped identity mismatch reason=" + String(reason || "") +
      " generation=" + String(generation));
    return false;
  }
  if (expectedGeneration !== undefined && expectedGeneration !== null &&
      Number(expectedGeneration) !== generation) {
    safeLog(this.L, 'd', "mask hide skipped generation mismatch reason=" + String(reason || "") +
      " expected=" + String(expectedGeneration) + " actual=" + String(generation));
    return false;
  }

  try { mask.animate().cancel(); } catch (eAnim) {}
  try { mask.clearAnimation(); } catch (eClear) {}
  try { mask.setAlpha(0); } catch (eAlpha) {}
  try { mask.setVisibility(android.view.View.INVISIBLE); } catch (eVisibility) {}

  var removeResult = this.safeRemoveView(mask, "mask", {
    immediate: true,
    keepInvisible: true,
    resetVisual: false
  });
  var removed = !removeResult || removeResult.ok !== false;

  if (removed && this.state.mask === mask &&
      Number(this.state.maskGeneration || 0) === generation) {
    this.state.mask = null;
    this.state.maskLp = null;
    this.state.addedMask = false;
    this.state.maskOwner = null;
  }

  safeLog(this.L, removed ? 'd' : 'w',
    "mask hide reason=" + String(reason || "unspecified") +
    " generation=" + String(generation) +
    " removed=" + String(removed) +
    " immediate=" + String(!!(removeResult && removeResult.immediate)));
  return removed;
};

FloatBallAppWM.prototype.hideMaskIfNoPanelVisible = function(reason, expectedMask, expectedGeneration) {
  try {
    if (!this.state) return false;
    if (this.state.addedPanel) return false;
    if (this.state.addedSettings) return false;
    if (this.state.addedViewer) return false;
    return this.hideMask(reason || "no_panel_visible", expectedMask, expectedGeneration);
  } catch (e) {
    safeLog(this.L, 'w', "conditional mask hide fail: " + String(e));
  }
  return false;
};'''
th09 = regex_once(th09, mask_lifecycle, mask_lifecycle_new, "mask lifecycle")

th09 = replace_once(
    th09,
    'if (self.hideMaskIfNoPanelVisible) self.hideMaskIfNoPanelVisible();',
    'if (self.hideMaskIfNoPanelVisible) self.hideMaskIfNoPanelVisible("main_panel_exit");',
    "main panel mask cleanup reason",
)

old_viewer_guard = '''FloatBallAppWM.prototype.hideViewerPanel = function() {
  var __toolAppViewer = false;
  try {
    __toolAppViewer = String(this.state.viewerPanelType || "") === "tool_app" ||
      this.state.viewerPanel === this.state.toolAppRoot;
  } catch (eToolViewer) {}
  if (__toolAppViewer) {'''
new_viewer_guard = '''FloatBallAppWM.prototype.hideViewerPanel = function() {
  var __toolAppViewer = false;
  try {
    var __viewer = this.state ? this.state.viewerPanel : null;
    var __toolRoot = this.state ? this.state.toolAppRoot : null;
    __toolAppViewer = !!(this.state && this.state.addedViewer === true && (
      String(this.state.viewerPanelType || "") === "tool_app" ||
      (__viewer !== null && __viewer !== undefined &&
       __toolRoot !== null && __toolRoot !== undefined &&
       __viewer === __toolRoot)
    ));
  } catch (eToolViewer) {}
  if (__toolAppViewer) {'''
th09 = replace_once(th09, old_viewer_guard, new_viewer_guard, "empty ToolApp viewer guard")

show_mask_pattern = r'''FloatBallAppWM.prototype.showMask = function\(\) \{.*?^\};\n\nFloatBallAppWM.prototype.undockToFull'''
show_mask_new = '''FloatBallAppWM.prototype.showMask = function(options) {
  if (!this.state || this.state.closing) return null;

  var opts = options || {};
  var hidden = opts.hidden === true;
  var animate = hidden !== true && opts.animate !== false &&
    !!(this.config && this.config.ENABLE_ANIMATIONS);
  var reason = String(opts.reason || "unspecified");
  var owner = String(opts.owner || "panel");

  if (this.state.addedMask && this.state.mask) {
    var existing = this.state.mask;
    var existingGeneration = Number(this.state.maskGeneration || 0);
    var canPrepareHidden = hidden && !this.state.addedPanel &&
      !this.state.addedSettings && !this.state.addedViewer;
    if (canPrepareHidden) {
      try { existing.animate().cancel(); } catch (eExistingAnim) {}
      try { existing.clearAnimation(); } catch (eExistingClear) {}
      try { existing.setAlpha(0); } catch (eExistingAlpha) {}
      try { existing.setVisibility(android.view.View.INVISIBLE); } catch (eExistingVisibility) {}
      this.state.maskOwner = owner;
    }
    safeLog(this.L, 'd', "mask reuse reason=" + reason +
      " generation=" + String(existingGeneration) +
      " hidden=" + String(canPrepareHidden));
    return {
      mask: existing,
      generation: existingGeneration,
      created: false,
      hidden: canPrepareHidden
    };
  }

  if (this.state.addedMask && !this.state.mask) {
    this.state.addedMask = false;
    this.state.maskLp = null;
  }

  var self = this;
  var generation = Number(this.state.maskGeneration || 0) + 1;
  if (generation > 1000000000) generation = 1;
  var mask = new android.widget.FrameLayout(context);

  try { toolhubSafeSetBackgroundColor(mask, android.graphics.Color.parseColor("#33000000")); }
  catch (e0) { toolhubSafeSetBackgroundColor(mask, 0x33000000); }

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

  try { mask.animate().cancel(); } catch (ePrepareAnim) {}
  try { mask.clearAnimation(); } catch (ePrepareClear) {}
  if (hidden) {
    try { mask.setAlpha(0); } catch (eHiddenAlpha) {}
    try { mask.setVisibility(android.view.View.INVISIBLE); } catch (eHiddenVisibility) {}
  } else if (animate) {
    try { mask.setAlpha(0); } catch (eAnimatedAlpha) {}
    try { mask.setVisibility(android.view.View.VISIBLE); } catch (eAnimatedVisibility) {}
  } else {
    try { mask.setAlpha(1); } catch (eStableAlpha) {}
    try { mask.setVisibility(android.view.View.VISIBLE); } catch (eStableVisibility) {}
  }

  try {
    this.state.wm.addView(mask, lp);
    this.state.mask = mask;
    this.state.maskLp = lp;
    this.state.addedMask = true;
    this.state.maskGeneration = generation;
    this.state.maskOwner = owner;

    if (animate) {
      try {
        mask.animate().cancel();
        mask.animate().alpha(1).setDuration(200).start();
      } catch (eAnim) {
        try { mask.setAlpha(1); } catch (eAnimFallback) {}
      }
    }

    safeLog(this.L, 'd', "mask prepare reason=" + reason +
      " generation=" + String(generation) +
      " hidden=" + String(hidden) +
      " animate=" + String(animate) +
      " owner=" + owner);
    return {
      mask: mask,
      generation: generation,
      created: true,
      hidden: hidden
    };
  } catch (e1) {
    safeLog(this.L, 'e', "add mask fail err=" + String(e1));
    this.state.addedMask = false;
    return null;
  }
};

FloatBallAppWM.prototype.undockToFull'''
th09 = regex_once(th09, show_mask_pattern, show_mask_new, "showMask stable preparation")

th09_path.write_text(th09, encoding="utf-8")


# th_15_extra.js: build first, prepare hidden mask, add stable panel, then reveal.
th15_path = ROOT / "code" / "th_15_extra.js"
th15 = th15_path.read_text(encoding="utf-8")
th15 = replace_once(th15, "// @version 1.1.20", "// @version 1.1.21", "th15 version")

add_start = th15.find("FloatBallAppWM.prototype.addPanel = function(panel, x, y, which) {")
add_end = th15.find("// =======================【设置类 UI：App 页面栈实验框架】", add_start)
if add_start < 0 or add_end <= add_start:
    fail("cannot isolate addPanel")
add_block = th15[add_start:add_end]
add_block = replace_once(add_block, "  if (this.state.closing) return;", "  if (this.state.closing) return false;", "addPanel closing return")

prepare_marker = '''  try { if (this.attachPanelSystemKeyHandler) this.attachPanelSystemKeyHandler(panel, which); } catch (eKeyAttach) { safeLog(this.L, 'e', "attach panel key fail which=" + String(which) + " err=" + String(eKeyAttach)); }

  if (__toolAppPanel) safeLog(this.L, 'i', "TOOLAPP_WM_ADD_BEGIN " +'''
prepare_replacement = '''  var __stableOverlayRoot = __toolAppPanel || String(which || "") === "main";
  if (__stableOverlayRoot) {
    try { panel.animate().cancel(); } catch (eStableCancel) {}
    try { panel.clearAnimation(); } catch (eStableClear) {}
    try { panel.setTranslationX(0); } catch (eStableTx) {}
    try { panel.setTranslationY(0); } catch (eStableTy) {}
    try { panel.setScaleX(1); } catch (eStableSx) {}
    try { panel.setScaleY(1); } catch (eStableSy) {}
    try { panel.setAlpha(1); } catch (eStableAlpha) {}
    try { panel.setVisibility(android.view.View.VISIBLE); } catch (eStableVisibility) {}
    if (String(which || "") === "main") {
      safeLog(this.L, 'd', "main panel visual prepared alpha=1 scale=1 beforeAdd=true");
    }
  }

  try { if (this.attachPanelSystemKeyHandler) this.attachPanelSystemKeyHandler(panel, which); } catch (eKeyAttach) { safeLog(this.L, 'e', "attach panel key fail which=" + String(which) + " err=" + String(eKeyAttach)); }

  if (__toolAppPanel) safeLog(this.L, 'i', "TOOLAPP_WM_ADD_BEGIN " +'''
add_block = replace_once(add_block, prepare_marker, prepare_replacement, "stable panel pre-add state")

add_block = replace_once(
    add_block,
    '''  try { this.state.wm.addView(panel, lp); } catch (eAdd) { safeLog(this.L, 'e',  "addPanel fail which=" + String(which) + " err=" + String(eAdd)); return; }''',
    '''  try { this.state.wm.addView(panel, lp); } catch (eAdd) { safeLog(this.L, 'e',  "addPanel fail which=" + String(which) + " err=" + String(eAdd)); return false; }''',
    "addPanel failure result",
)

animation_pattern = r'''  try \{\n    if \(__toolAppPanel\) \{.*?  \} catch\(eA\) \{ safeLog\(null, 'e', "catch " \+ String\(eA\)\); \}\n'''
animation_new = '''  try {
    if (__stableOverlayRoot) {
      panel.setTranslationX(0);
      panel.setTranslationY(0);
      panel.setScaleX(1);
      panel.setScaleY(1);
      panel.setAlpha(1);
    } else if (this.config.ENABLE_ANIMATIONS) {
      panel.setScaleX(0.96);
      panel.setScaleY(0.96);
      panel.setAlpha(0);
      panel.animate()
        .scaleX(1)
        .scaleY(1)
        .alpha(1)
        .setDuration(180)
        .setInterpolator(new android.view.animation.AccelerateDecelerateInterpolator())
        .start();
    } else {
      panel.setTranslationX(0);
      panel.setTranslationY(0);
      panel.setScaleX(1);
      panel.setScaleY(1);
      panel.setAlpha(1);
    }
  } catch(eA) { safeLog(null, 'e', "catch " + String(eA)); }
'''
add_block = regex_once(add_block, animation_pattern, animation_new, "stable main panel post-add state")

add_tail = '''  if (now - lastTime > 5000) {
    safeLog(this.L, 'i', "panel show which=" + String(which) + " x=" + String(x) + " y=" + String(y));
    lastPanelShow[which] = now;
    this.state._lastPanelShow = lastPanelShow;
  }
};

'''
add_tail_new = '''  if (now - lastTime > 5000) {
    safeLog(this.L, 'i', "panel show which=" + String(which) + " x=" + String(x) + " y=" + String(y));
    lastPanelShow[which] = now;
    this.state._lastPanelShow = lastPanelShow;
  }
  return true;
};

'''
add_block = replace_once(add_block, add_tail, add_tail_new, "addPanel success result")
th15 = th15[:add_start] + add_block + th15[add_end:]

show_start = th15.find("FloatBallAppWM.prototype.showPanelAvoidBall = function(which) {")
show_end = th15.find("// =======================【辅助：包装可拖拽面板】", show_start)
if show_start < 0 or show_end <= show_start:
    fail("cannot isolate showPanelAvoidBall")
show_block = th15[show_start:show_end]
show_block = replace_once(
    show_block,
    '''  var doShow = function() {
    var maskAddedByCallback = false;
''',
    '''  var doShow = function() {
    var maskAddedByCallback = false;
    var preparedMask = null;
''',
    "prepared mask state",
)

old_early_mask = '''      if (typeof self.showMask !== "function") throw "showMask is not function";
      panelStage("PANEL_SHOW_MASK_BEGIN", {}, false);
      var maskWasAdded = self.state.addedMask === true;
      self.showMask();
      maskAddedByCallback = !maskWasAdded && self.state.addedMask === true;
      panelStage("PANEL_SHOW_MASK_DONE", { added: self.state.addedMask === true }, false);

'''
new_early_mask = '''      var maskWasAdded = self.state.addedMask === true;
      if (which !== "main") {
        if (typeof self.showMask !== "function") throw "showMask is not function";
        panelStage("PANEL_SHOW_MASK_BEGIN", { stage: "before_build" }, false);
        preparedMask = self.showMask({
          reason: "panel_prepare:" + String(which || ""),
          owner: String(which || "panel")
        });
        maskAddedByCallback = !!(preparedMask && preparedMask.created === true);
        panelStage("PANEL_SHOW_MASK_DONE", {
          added: self.state.addedMask === true,
          generation: preparedMask ? preparedMask.generation : 0,
          hidden: preparedMask ? preparedMask.hidden === true : false
        }, false);
      }

'''
show_block = replace_once(show_block, old_early_mask, new_early_mask, "defer main mask preparation")

old_add = '''      if (typeof self.addPanel !== "function") throw "addPanel is not function";
      panelStage("PANEL_ADD_CALL_BEGIN", { x: pos.x, y: pos.y }, false);
      self.addPanel(panelView, pos.x, pos.y, which);
      panelStage("PANEL_ADD_CALL_DONE", {
        x: pos.x,
        y: pos.y,
        added: which === "main" ? self.state.addedPanel === true :
(which === "settings" ? self.state.addedSettings === true : self.state.addedViewer === true)
      }, false);
'''
new_add = '''      if (which === "main") {
        if (typeof self.showMask !== "function") throw "showMask is not function";
        panelStage("PANEL_SHOW_MASK_BEGIN", { stage: "after_layout" }, false);
        preparedMask = self.showMask({
          hidden: true,
          animate: false,
          reason: "main_panel_prepare",
          owner: "main"
        });
        maskAddedByCallback = !!(preparedMask && preparedMask.created === true);
        panelStage("PANEL_SHOW_MASK_DONE", {
          added: self.state.addedMask === true,
          generation: preparedMask ? preparedMask.generation : 0,
          hidden: preparedMask ? preparedMask.hidden === true : false
        }, false);
      }

      if (typeof self.addPanel !== "function") throw "addPanel is not function";
      panelStage("PANEL_ADD_CALL_BEGIN", { x: pos.x, y: pos.y }, false);
      var addOk = self.addPanel(panelView, pos.x, pos.y, which) === true;
      var panelAdded = which === "main" ?
        (self.state.addedPanel === true && self.state.panel === panelView) :
        (which === "settings" ? self.state.addedSettings === true : self.state.addedViewer === true);
      panelStage("PANEL_ADD_CALL_DONE", {
        x: pos.x,
        y: pos.y,
        added: panelAdded,
        addOk: addOk
      }, false);

      if (which === "main") {
        var preparedIdentity = !!(preparedMask && preparedMask.mask &&
          self.state.mask === preparedMask.mask &&
          Number(self.state.maskGeneration || 0) === Number(preparedMask.generation || 0));
        if (addOk && panelAdded && preparedIdentity) {
          try { preparedMask.mask.animate().cancel(); } catch (eMaskAnim) {}
          try { preparedMask.mask.clearAnimation(); } catch (eMaskClear) {}
          try { preparedMask.mask.setAlpha(1); } catch (eMaskAlpha) {}
          try { preparedMask.mask.setVisibility(android.view.View.VISIBLE); } catch (eMaskVisibility) {}
          safeLog(self.L, 'd', "mask reveal reason=main_panel_added generation=" +
            String(preparedMask.generation || 0) + " panelAdded=true");
        } else if (preparedMask && typeof self.hideMask === "function") {
          self.hideMask("main_panel_add_failed", preparedMask.mask, preparedMask.generation);
        }
      }
'''
show_block = replace_once(show_block, old_add, new_add, "main mask reveal after panel add")

old_rollback = '''      if (maskAddedByCallback && typeof self.hideMaskIfNoPanelVisible === "function") {
        try { self.hideMaskIfNoPanelVisible(); } catch (eMaskRollback) {
try { safeLog(self.L, 'w', "panel mask rollback fail: " + String(eMaskRollback)); } catch (eRollbackLog) {}
        }
      }
'''
new_rollback = '''      var shouldRollbackMask = maskAddedByCallback || (which === "main" && !!preparedMask);
      if (shouldRollbackMask && typeof self.hideMaskIfNoPanelVisible === "function") {
        try {
          self.hideMaskIfNoPanelVisible(
            "panel_show_failed:" + String(which || ""),
            preparedMask ? preparedMask.mask : null,
            preparedMask ? preparedMask.generation : null
          );
        } catch (eMaskRollback) {
          try { safeLog(self.L, 'w', "panel mask rollback fail: " + String(eMaskRollback)); } catch (eRollbackLog) {}
        }
      }
'''
show_block = replace_once(show_block, old_rollback, new_rollback, "mask rollback identity")
th15 = th15[:show_start] + show_block + th15[show_end:]
th15_path.write_text(th15, encoding="utf-8")


# Expand the existing lifecycle verifier instead of adding another overlapping script.
verify_path = ROOT / "scripts" / "verify_main_panel_close_lifecycle.py"
verify = verify_path.read_text(encoding="utf-8")
verify = replace_once(
    verify,
    "# 验证主面板退出动画、预测性返回清理与 WindowManager 移除顺序。",
    "# 验证主面板稳定显示、mask 生命周期、退出清理与 WindowManager 移除顺序。",
    "verifier description",
)
verify = replace_once(
    verify,
    'MAIN_PANEL_PATH = ROOT / "code" / "th_15_main_panel.js"\n',
    'MAIN_PANEL_PATH = ROOT / "code" / "th_15_main_panel.js"\nEXTRA_PATH = ROOT / "code" / "th_15_extra.js"\n',
    "verifier extra path",
)
verify = replace_once(
    verify,
    'MAIN_PANEL = MAIN_PANEL_PATH.read_text(encoding="utf-8")\n',
    'MAIN_PANEL = MAIN_PANEL_PATH.read_text(encoding="utf-8")\nEXTRA = EXTRA_PATH.read_text(encoding="utf-8")\n',
    "verifier extra source",
)
verify = replace_once(
    verify,
    "if actual_version < (1, 0, 9):",
    "if actual_version < (1, 0, 12):",
    "verifier th09 minimum",
)
verify = replace_once(
    verify,
    'fail("expected th_09_animation.js version >= 1.0.9, actual %s" % version.group(1))',
    'fail("expected th_09_animation.js version >= 1.0.12, actual %s" % version.group(1))',
    "verifier th09 message",
)

insert_after_version = '''if actual_version < (1, 0, 12):
    fail("expected th_09_animation.js version >= 1.0.12, actual %s" % version.group(1))
'''
insert_version_new = insert_after_version + '''
extra_version = re.search(r"(?m)^// @version ([0-9]+\\.[0-9]+\\.[0-9]+)$", EXTRA)
if not extra_version:
    fail("th_15_extra.js version marker missing")
actual_extra_version = tuple(int(part) for part in extra_version.group(1).split("."))
if actual_extra_version < (1, 1, 21):
    fail("expected th_15_extra.js version >= 1.1.21, actual %s" % extra_version.group(1))
'''
verify = replace_once(verify, insert_after_version, insert_version_new, "verifier th15 version")

verifier_markers_anchor = '''    ("self.hideMaskIfNoPanelVisible(\"main_panel_exit\")", "conditional mask invocation"),
):
    require(SOURCE, marker, label)
'''
# The old file may still contain the no-argument marker before this patch.
if verifier_markers_anchor not in verify:
    verify = replace_once(
        verify,
        '    ("self.hideMaskIfNoPanelVisible()", "conditional mask invocation"),\n):\n    require(SOURCE, marker, label)\n',
        verifier_markers_anchor,
        "verifier mask reason marker",
    )

extra_checks = '''
for marker, label in (
    ("showMask = function(options)", "mask preparation options"),
    ("opts.hidden === true", "hidden mask preparation"),
    ("mask.setAlpha(0)", "mask alpha prepared before add"),
    ("mask.setVisibility(android.view.View.INVISIBLE)", "mask invisible preparation"),
    ("this.state.wm.addView(mask, lp)", "mask WindowManager add"),
    ("maskGeneration", "mask generation identity"),
    ("expectedMask && expectedMask !== mask", "mask View identity guard"),
    ("Number(expectedGeneration) !== generation", "mask generation guard"),
    ('this.safeRemoveView(mask, "mask", {', "captured mask removal"),
    ("immediate: true", "mask immediate removal"),
    ("keepInvisible: true", "mask invisible removal"),
    ("resetVisual: false", "mask no visual reset"),
    ("this.state.addedViewer === true", "ToolApp viewer presence guard"),
    ("__viewer !== null && __viewer !== undefined", "non-null viewer identity"),
):
    require(SOURCE, marker, label)

for marker, label in (
    ("var __stableOverlayRoot = __toolAppPanel || String(which || \"\") === \"main\"", "stable main overlay root"),
    ("main panel visual prepared alpha=1 scale=1 beforeAdd=true", "main pre-add visual log"),
    ("return false;", "addPanel failure result"),
    ("return true;", "addPanel success result"),
    ("hidden: true", "hidden main mask request"),
    ("reason: \"main_panel_prepare\"", "main mask preparation reason"),
    ("var addOk = self.addPanel(panelView, pos.x, pos.y, which) === true", "panel add result"),
    ("preparedMask.mask.setAlpha(1)", "mask reveal alpha"),
    ("preparedMask.mask.setVisibility(android.view.View.VISIBLE)", "mask reveal visibility"),
    ("mask reveal reason=main_panel_added", "mask reveal log"),
    ("main_panel_add_failed", "mask rollback on add failure"),
):
    require(EXTRA, marker, label)

show_start = EXTRA.find("FloatBallAppWM.prototype.showPanelAvoidBall = function(which)")
show_end = EXTRA.find("// =======================【辅助：包装可拖拽面板】", show_start)
if show_start < 0 or show_end <= show_start:
    fail("cannot isolate showPanelAvoidBall")
show_source = EXTRA[show_start:show_end]
build_pos = show_source.find('panelStage("PANEL_BUILD_CALL_BEGIN"')
main_mask_pos = show_source.find('reason: "main_panel_prepare"')
add_pos = show_source.find("var addOk = self.addPanel")
reveal_pos = show_source.find("preparedMask.mask.setVisibility(android.view.View.VISIBLE)")
if not (0 <= build_pos < main_mask_pos < add_pos < reveal_pos):
    fail("main open order must be build/layout -> hidden mask -> panel add -> mask reveal")

add_start = EXTRA.find("FloatBallAppWM.prototype.addPanel = function(panel, x, y, which)")
add_end = EXTRA.find("// =======================【设置类 UI：App 页面栈实验框架】", add_start)
if add_start < 0 or add_end <= add_start:
    fail("cannot isolate addPanel")
add_source = EXTRA[add_start:add_end]
visual_pos = add_source.find("main panel visual prepared alpha=1 scale=1 beforeAdd=true")
window_add_pos = add_source.find("this.state.wm.addView(panel, lp)")
if not (0 <= visual_pos < window_add_pos):
    fail("main panel stable alpha/scale must be applied before addView")
if "animateMainPanelEnter(panel" in add_source:
    fail("main panel root enter animation call must be removed from addPanel")

show_mask_start = SOURCE.find("FloatBallAppWM.prototype.showMask = function(options)")
show_mask_end = SOURCE.find("FloatBallAppWM.prototype.undockToFull", show_mask_start)
if show_mask_start < 0 or show_mask_end <= show_mask_start:
    fail("cannot isolate showMask")
show_mask_source = SOURCE[show_mask_start:show_mask_end]
hidden_alpha_pos = show_mask_source.find("mask.setAlpha(0)")
hidden_visibility_pos = show_mask_source.find("mask.setVisibility(android.view.View.INVISIBLE)")
mask_add_pos = show_mask_source.find("this.state.wm.addView(mask, lp)")
if not (0 <= hidden_alpha_pos < mask_add_pos and 0 <= hidden_visibility_pos < mask_add_pos):
    fail("mask alpha and visibility must be initialized before addView")
'''
verify = replace_once(
    verify,
    '\nhide_start = SOURCE.find(\n',
    extra_checks + '\nhide_start = SOURCE.find(\n',
    "verifier stable open checks",
)

verify = replace_once(
    verify,
    '    "OK main_panel_close_lifecycle "\n    "visual_reset=skipped immediate_remove=1 generation=guarded mask=conditional"\n',
    '    "OK main_panel_close_lifecycle "\n    "open=stable mask=identity_guarded reveal=after_panel immediate_remove=1 exit_generation=guarded"\n',
    "verifier summary",
)
verify_path.write_text(verify, encoding="utf-8")

print("OK applied main panel mask flicker fix")
