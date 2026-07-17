#!/usr/bin/env python3
from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, got {count}: {old[:120]!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "code/th_05_persistence.js",
    '''        this.onResultPreviewConfigurationChanged({
positionOnly: true,
clearPositionPreview: true,
reason: "settings_commit"
        });''',
    '''        this.onResultPreviewConfigurationChanged({
          positionOnly: true,
          clearPositionPreview: true,
          reason: "settings_commit"
        });''',
)

replace_once(
    "code/th_13_panel_ui.js",
    '''        try {
self.touchActivity();
if (String(item.key || "") === "POINTER_RESULT_PREVIEW_POSITION_PERCENT" &&
    typeof self.onResultPreviewConfigurationChanged === "function") {
  self.onResultPreviewConfigurationChanged({
    positionOnly: true,
    positionPreviewPercent: computeValByProgress(seek.getProgress()),
    reason: "settings_seek_stop"
  });
}
        } catch(e3)''',
    '''        try {
          self.touchActivity();
          if (String(item.key || "") === "POINTER_RESULT_PREVIEW_POSITION_PERCENT" &&
              typeof self.onResultPreviewConfigurationChanged === "function") {
            self.onResultPreviewConfigurationChanged({
              positionOnly: true,
              positionPreviewPercent: computeValByProgress(seek.getProgress()),
              reason: "settings_seek_stop"
            });
          }
        } catch(e3)''',
)

replace_once(
    "code/th_16_entry.js",
    '''        if (typeof this.onResultPreviewConfigurationChanged === "function") {
this.onResultPreviewConfigurationChanged({
  positionOnly: true,
  clearPositionPreview: true,
  reason: "settings_reset"
});
        }''',
    '''        if (typeof this.onResultPreviewConfigurationChanged === "function") {
          this.onResultPreviewConfigurationChanged({
            positionOnly: true,
            clearPositionPreview: true,
            reason: "settings_reset"
          });
        }''',
)

replace_once(
    "code/th_21_result_preview.js",
    '''        if (bounds) {
left = int21(bounds.left, 0);
top = int21(bounds.top, 0);
width = Math.max(0, int21(bounds.right, 0) - left);
height = Math.max(0, int21(bounds.bottom, 0) - top);
source = "window_metrics";
        }''',
    '''        if (bounds) {
          left = int21(bounds.left, 0);
          top = int21(bounds.top, 0);
          width = Math.max(0, int21(bounds.right, 0) - left);
          height = Math.max(0, int21(bounds.bottom, 0) - top);
          source = "window_metrics";
        }''',
)

replace_once(
    "code/th_21_result_preview.js",
    '''        if (size) {
left = 0;
top = 0;
width = Math.max(0, int21(size.w, 0));
height = Math.max(0, int21(size.h, 0));
source = "real_metrics";
        }''',
    '''        if (size) {
          left = 0;
          top = 0;
          width = Math.max(0, int21(size.w, 0));
          height = Math.max(0, int21(size.h, 0));
          source = "real_metrics";
        }''',
)

replace_once(
    "code/th_21_result_preview.js",
    '''        var types = android.view.WindowInsets.Type.statusBars() |
android.view.WindowInsets.Type.navigationBars() |
android.view.WindowInsets.Type.displayCutout();''',
    '''        var types = android.view.WindowInsets.Type.statusBars() |
          android.view.WindowInsets.Type.navigationBars() |
          android.view.WindowInsets.Type.displayCutout();''',
)

replace_once(
    "code/th_21_result_preview.js",
    '''        if (value) {
out.top = Math.max(out.top, int21(value.top, 0));
out.bottom = Math.max(out.bottom, int21(value.bottom, 0));
out.left = Math.max(out.left, int21(value.left, 0));
out.right = Math.max(out.right, int21(value.right, 0));
        }''',
    '''        if (value) {
          out.top = Math.max(out.top, int21(value.top, 0));
          out.bottom = Math.max(out.bottom, int21(value.bottom, 0));
          out.left = Math.max(out.left, int21(value.left, 0));
          out.right = Math.max(out.right, int21(value.right, 0));
        }''',
)

replace_once(
    "code/th_21_result_preview.js",
    '''        safeLog(appObj.L, info.degraded ? "w" : "i",
"result preview position" +
" reason=" + String(opts.reason || "") +
" percent=" + String(info.percent) +
" screenH=" + String(info.screenHeight) +
" screenSource=" + String(info.screenSource || "") +
" previewH=" + String(info.previewHeight) +
" safeTop=" + String(info.safeTop) +
" safeBottom=" + String(info.safeBottom) +
" insetSource=" + String(info.insetSource || "") +
" targetCenterY=" + String(info.targetCenterY) +
" candidateY=" + String(info.candidateTopY) +
" finalY=" + String(info.finalTopY) +
" clamped=" + String(info.clamped === true) +
" degraded=" + String(info.degraded === true));''',
    '''        safeLog(appObj.L, info.degraded ? "w" : "i",
          "result preview position" +
          " reason=" + String(opts.reason || "") +
          " percent=" + String(info.percent) +
          " screenH=" + String(info.screenHeight) +
          " screenSource=" + String(info.screenSource || "") +
          " previewH=" + String(info.previewHeight) +
          " safeTop=" + String(info.safeTop) +
          " safeBottom=" + String(info.safeBottom) +
          " insetSource=" + String(info.insetSource || "") +
          " targetCenterY=" + String(info.targetCenterY) +
          " candidateY=" + String(info.candidateTopY) +
          " finalY=" + String(info.finalTopY) +
          " clamped=" + String(info.clamped === true) +
          " degraded=" + String(info.degraded === true));''',
)

replace_once(
    "code/th_21_result_preview.js",
    '''        if (opts.positionPreviewPercent !== undefined && opts.positionPreviewPercent !== null) {
st.positionPreviewPercent = resolvePreviewPositionPercent21(this, st, opts.positionPreviewPercent);
        }
        if (opts.positionOnly === true) {
runOnMain21(function() {
  try {
    var currentPosition = ensureState21(self);
    if (!currentPosition) return;
    applyPreviewPosition21(self, currentPosition, {
      reason: String(opts.reason || "position_only"),
      clearPositionPreview: opts.clearPositionPreview === true,
      positionPreviewPercent: opts.positionPreviewPercent
    });
  } catch (ePositionOnly) {
    try { safeLog(self.L, "w", "result preview position-only update fail: " + String(ePositionOnly)); } catch (eLogPositionOnly) {}
  }
});
return true;
        }''',
    '''        if (opts.positionPreviewPercent !== undefined && opts.positionPreviewPercent !== null) {
          st.positionPreviewPercent = resolvePreviewPositionPercent21(this, st, opts.positionPreviewPercent);
        }
        if (opts.positionOnly === true) {
          runOnMain21(function() {
            try {
              var currentPosition = ensureState21(self);
              if (!currentPosition) return;
              applyPreviewPosition21(self, currentPosition, {
                reason: String(opts.reason || "position_only"),
                clearPositionPreview: opts.clearPositionPreview === true,
                positionPreviewPercent: opts.positionPreviewPercent
              });
            } catch (ePositionOnly) {
              try { safeLog(self.L, "w", "result preview position-only update fail: " + String(ePositionOnly)); } catch (eLogPositionOnly) {}
            }
          });
          return true;
        }''',
)

replace_once(
    "code/th_21_result_preview.js",
    '''        runOnMain21(function() {
try {
  var current = ensureState21(self);
  if (!current || !current.payload || !current.root || !current.added || !current.rootRender) return;
  current.generation = Number(current.generation || 0) + 1;
  prepareLines21(self, current);
  syncRender21(current.rootRender, current);
  current.rootRender.rootToken = Number(current.rootToken || 0);
  current.rootRender.enterStarted = true;
  current.lp.width = current.measuredWidth;
  current.lp.height = current.measuredHeight;
  applyPreviewPosition21(self, current, {
    reason: String(opts.reason || "configuration_changed"),
    updateLayout: false
  });
  current.wm.updateViewLayout(current.root, current.lp);
  current.root.requestLayout();
  current.root.invalidate();
  if (current.root.postInvalidateOnAnimation) current.root.postInvalidateOnAnimation();
  scheduleVisibilityFallback21(self, current, current.root, current.rootRender, 1);
  scheduleStablePosition21(self, current, String(opts.reason || "configuration_changed"));
} catch (eReflow) {
  try { safeLog(self.L, 'w', "result preview reflow fail: " + String(eReflow)); } catch (eLog) {}
}
        });''',
    '''        runOnMain21(function() {
          try {
            var current = ensureState21(self);
            if (!current || !current.payload || !current.root || !current.added || !current.rootRender) return;
            current.generation = Number(current.generation || 0) + 1;
            prepareLines21(self, current);
            syncRender21(current.rootRender, current);
            current.rootRender.rootToken = Number(current.rootToken || 0);
            current.rootRender.enterStarted = true;
            current.lp.width = current.measuredWidth;
            current.lp.height = current.measuredHeight;
            applyPreviewPosition21(self, current, {
              reason: String(opts.reason || "configuration_changed"),
              updateLayout: false
            });
            current.wm.updateViewLayout(current.root, current.lp);
            current.root.requestLayout();
            current.root.invalidate();
            if (current.root.postInvalidateOnAnimation) current.root.postInvalidateOnAnimation();
            scheduleVisibilityFallback21(self, current, current.root, current.rootRender, 1);
            scheduleStablePosition21(self, current, String(opts.reason || "configuration_changed"));
          } catch (eReflow) {
            try { safeLog(self.L, 'w', "result preview reflow fail: " + String(eReflow)); } catch (eLog) {}
          }
        });''',
)
