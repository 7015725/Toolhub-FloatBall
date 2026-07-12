#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CODE = ROOT / "code"


def fail(message):
    raise SystemExit("FAIL: " + message)


def read(path):
    return path.read_text(encoding="utf-8")


def write(path, text):
    path.write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail(label + " count=" + str(count))
    return text.replace(old, new, 1)


def replace_function(text, marker, replacement):
    start = text.find(marker)
    if start < 0:
        fail("function marker missing: " + marker)
    brace = text.find("{", start)
    if brace < 0:
        fail("function brace missing: " + marker)
    depth = 0
    state = "code"
    quote = ""
    escaped = False
    i = brace
    end = -1
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ""
        if state == "code":
            if ch == "/" and nxt == "/":
                state = "line"
                i += 2
                continue
            if ch == "/" and nxt == "*":
                state = "block"
                i += 2
                continue
            if ch in ("'", '"', "`"):
                state = "string"
                quote = ch
                escaped = False
                i += 1
                continue
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
            i += 1
            continue
        if state == "line":
            if ch in "\r\n":
                state = "code"
            i += 1
            continue
        if state == "block":
            if ch == "*" and nxt == "/":
                state = "code"
                i += 2
            else:
                i += 1
            continue
        if state == "string":
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                state = "code"
            i += 1
    if end < 0:
        fail("unterminated function: " + marker)
    while end < len(text) and text[end] in " \t":
        end += 1
    if end < len(text) and text[end] == ";":
        end += 1
    return text[:start] + replacement.rstrip() + text[end:]


NORMALIZER_AND_HELPERS = r'''function normalizeToolHubEnumValueBySchema(key, value) {
  try {
    if (typeof ConfigValidator === "undefined" || !ConfigValidator || !ConfigValidator.schemas) return value;
    var schema = ConfigValidator.schemas[String(key || "")];
    if (!schema || String(schema.type || "") !== "enum" || !schema.values) return value;
    for (var i = 0; i < schema.values.length; i++) {
      if (String(schema.values[i]) === String(value)) return schema.values[i];
    }
  } catch(e) {}
  return value;
}

FloatBallAppWM.prototype.isThemeEffectKey = function(k) {
  k = String(k || "");
  return k === "SETTINGS_THEME" ||
         k === "THEME_MODE" ||
         k === "THEME_DAY_BG_HEX" ||
         k === "THEME_DAY_TEXT_HEX" ||
         k === "THEME_NIGHT_BG_HEX" ||
         k === "THEME_NIGHT_TEXT_HEX" ||
         k === "PANEL_BG_ALPHA";
};

FloatBallAppWM.prototype.isPanelLayoutEffectKey = function(k) {
  k = String(k || "");
  return k === "PANEL_ROWS" ||
         k === "PANEL_COLS" ||
         k === "PANEL_ITEM_SIZE_DP" ||
         k === "PANEL_GAP_DP" ||
         k === "PANEL_PADDING_DP" ||
         k === "PANEL_ICON_SIZE_DP" ||
         k === "PANEL_LABEL_ENABLED" ||
         k === "PANEL_LABEL_TEXT_SIZE_SP" ||
         k === "PANEL_LABEL_TOP_MARGIN_DP" ||
         k === "PANEL_POS_GRAVITY" ||
         k === "PANEL_CUSTOM_OFFSET_Y" ||
         k === "BALL_PANEL_GAP_DP";
};

FloatBallAppWM.prototype.isPointerEffectKey = function(k) {
  k = String(k || "");
  return k.indexOf("POINTER_") === 0;
};

FloatBallAppWM.prototype.isBallVisualEffectKey = function(k) {
  k = String(k || "");
  return k === "BALL_SIZE_DP" ||
         k === "BALL_PNG_MODE" ||
         k === "BALL_ICON_TYPE" ||
         k === "BALL_ICON_FILE_PATH" ||
         k === "BALL_ICON_RES_ID" ||
         k === "BALL_ICON_RES_NAME" ||
         k === "BALL_ICON_SIZE_DP" ||
         k === "BALL_ICON_TINT_HEX" ||
         k === "BALL_BG_COLOR_HEX" ||
         k === "BALL_IDLE_ALPHA";
};

FloatBallAppWM.prototype.refreshPointerAfterSettingsChanged = function() {
  try {
    if (!this.state || !this.state.pointerTool) return false;
    var st = this.ensurePointerToolState ? this.ensurePointerToolState() : this.state.pointerTool;
    if (!st || !st.active) return false;
    if (st.lp) {
      st.lp.width = st.pointerW;
      st.lp.height = st.pointerH;
      try { if (st.root && st.wm) st.wm.updateViewLayout(st.root, st.lp); } catch(eUpdate) { safeLog(this.L, "w", "pointer update layout fail: " + String(eUpdate)); }
    }
    try { if (st.root) st.root.invalidate(); } catch(eInvalidate) {}
    return true;
  } catch(e) {
    safeLog(this.L, "w", "refreshPointerAfterSettingsChanged fail: " + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.refreshVisiblePanelsAfterSettingsChanged = function(reason) {
  try {
    if (!this.state || this.state.closing) return false;
    if (this.state.toolAppActive && this.replaceToolAppPage) {
      var route = "";
      try { route = String(this.state.toolAppRoute || ""); } catch(eRoute) { route = ""; }
      this.replaceToolAppPage(route || "settings");
      return true;
    }
    if (this.state.addedPanel) this.hideMainPanel();
    if (this.state.addedSettings) {
      this.hideSettingsPanel();
      this.showPanelAvoidBall("settings");
    }
    if (this.state.addedViewer) this.hideViewerPanel();
    return true;
  } catch(e) {
    safeLog(this.L, "w", "refreshVisiblePanelsAfterSettingsChanged fail reason=" + String(reason || "") + " err=" + String(e));
  }
  return false;
};

FloatBallAppWM.prototype.scheduleSettingsEffectRefresh = function(reason, themeChanged, panelChanged) {
  try {
    if (!this.state || this.state.closing) return false;
    if (themeChanged) {
      try { if (this.refreshMonetColors) this.refreshMonetColors(this.isDarkTheme()); } catch(eColor) {}
      try { if (this.state.ballContent && this.updateBallContentBackground) this.updateBallContentBackground(this.state.ballContent); } catch(eBallBg) {}
    }
    var self = this;
    if (this.state.settingsEffectRefreshPosted) return true;
    this.state.settingsEffectRefreshPosted = true;
    var run = function() {
      try { self.state.settingsEffectRefreshPosted = false; } catch(eFlag) {}
      try {
        if (self.refreshVisiblePanelsAfterSettingsChanged) self.refreshVisiblePanelsAfterSettingsChanged(reason);
      } catch(eRun) { safeLog(self.L, "w", "settings effect refresh run fail: " + String(eRun)); }
    };
    if (this.state.h) {
      this.state.h.post(new JavaAdapter(java.lang.Runnable, { run: run }));
    } else {
      run();
    }
    return true;
  } catch(e) {
    safeLog(this.L, "w", "scheduleSettingsEffectRefresh fail: " + String(e));
  }
  return false;
};
'''

SET_PENDING = r'''FloatBallAppWM.prototype.setPendingValue = function(k, v) {
  if (!this.state.pendingUserCfg) this.beginEditConfig();
  this.state.pendingUserCfg[k] = normalizeToolHubEnumValueBySchema(k, v);
  this.state.pendingDirty = true;

  // 设置页主题切换：不论 previewMode 都重建设置页 UI
  if (String(k) === "SETTINGS_THEME") {
      try {
          if (this.state.toolAppActive && this.replaceToolAppPage) {
              this.replaceToolAppPage(String(this.state.toolAppRoute || "settings_group"));
          } else {
              if (this.state.settingsPanel) {
                  this.safeRemoveView(this.state.settingsPanel, "settingsPanel");
                  this.state.settingsPanel = null;
                  this.state.settingsPanelLp = null;
                  this.state.addedSettings = false;
              }
              this.replaceToolAppPage("settings_group");
          }
      } catch(eReb) { safeLog(null, 'e', "catch " + String(eReb)); }
  } else {
      var keyStr = String(k);
      if (keyStr.indexOf("BALL_") === 0 && this.refreshBallPreviewInSettings) {
          try { this.refreshBallPreviewInSettings(); } catch(eBP) { safeLog(null, 'e', "catch " + String(eBP)); }
      }
      if (this.state.previewMode) {
          this.refreshPreview(k);
      }
  }
};'''

APPLY_EFFECTS = r'''FloatBallAppWM.prototype.applyImmediateEffectsForKey = function(k) {
  var key = String(k || "");
  try {
    if (this.isBallPositionEffectKey && this.isBallPositionEffectKey(key)) {
      return this.scheduleConfiguredBallPositionApply("settings:" + key, true);
    }

    if (key === "LOG_ENABLE") {
      try {
        if (this.L) {
          this.L.enable = !!this.config.LOG_ENABLE;
          this.L.i("apply LOG_ENABLE=" + String(this.config.LOG_ENABLE));
        }
      } catch(eLE) { safeLog(null, 'e', "catch " + String(eLE)); }
      return;
    }
    if (key === "LOG_DEBUG") {
      try {
        if (this.L) {
          this.L.debug = !!this.config.LOG_DEBUG;
          this.L.i("apply LOG_DEBUG=" + String(this.config.LOG_DEBUG));
        }
      } catch(eLD) { safeLog(null, 'e', "catch " + String(eLD)); }
      return;
    }
    if (key === "LOG_KEEP_DAYS") {
      try {
        var n = Math.max(1, Math.floor(Number(this.config.LOG_KEEP_DAYS || 3)));
        this.config.LOG_KEEP_DAYS = n;
        if (this.L) {
          this.L.keepDays = n;
          this.L.i("apply LOG_KEEP_DAYS=" + String(n));
          this.L.cleanupOldFiles();
        }
      } catch(eLK) { safeLog(null, 'e', "catch " + String(eLK)); }
      return;
    }

    var themeChanged = this.isThemeEffectKey && this.isThemeEffectKey(key);
    var panelChanged = this.isPanelLayoutEffectKey && this.isPanelLayoutEffectKey(key);
    var pointerChanged = this.isPointerEffectKey && this.isPointerEffectKey(key);
    var ballChanged = this.isBallVisualEffectKey && this.isBallVisualEffectKey(key);

    if (ballChanged) {
      try { this.rebuildBallForNewSize(); } catch(eBall) { safeLog(this.L, "w", "apply ball visual fail key=" + key + " err=" + String(eBall)); }
      return;
    }

    if (key === "TOOLAPP_BACK_EDGE_WIDTH_DP") return;

    if (key === "EDGE_VISIBLE_RATIO") {
      if (this.state.addedBall && this.state.docked) {
        this.state.docked = false;
        this.snapToEdgeDocked(false);
      }
      return;
    }

    if (pointerChanged) {
      if (this.refreshPointerAfterSettingsChanged) this.refreshPointerAfterSettingsChanged();
      return;
    }

    if (themeChanged || panelChanged) {
      if (this.scheduleSettingsEffectRefresh) this.scheduleSettingsEffectRefresh(key, themeChanged, panelChanged);
      return;
    }
  } catch(e0) {
    safeLog(null, 'e', "applyImmediateEffectsForKey catch key=" + key + " err=" + String(e0));
  }
};'''

TH12_SUFFIX = r'''// =======================【修复：设置枚举保存类型】======================
(function() {
  try {
    if (typeof ConfigValidator === "undefined" || !ConfigValidator || typeof ConfigValidator.validate !== "function") return;
    if (ConfigValidator.__toolHubEnumNormalizePatchInstalled === true) return;
    var oldValidate = ConfigValidator.validate;
    ConfigValidator.validate = function(key, value) {
      var normalized = value;
      try {
        if (typeof normalizeToolHubEnumValueBySchema === "function") normalized = normalizeToolHubEnumValueBySchema(key, value);
      } catch(eNormalize) { normalized = value; }
      return oldValidate.call(this, key, normalized);
    };
    ConfigValidator.__toolHubEnumNormalizePatchInstalled = true;
  } catch(eInstall) {
    try { safeLog(null, 'e', "install enum normalize patch fail: " + String(eInstall)); } catch(eLog) {}
  }
})();
'''


def update_th05():
    path = CODE / "th_05_persistence.js"
    text = read(path)
    text = replace_once(text, "// @version 1.0.1", "// @version 1.0.2", "th05 version")
    marker = "// =======================【设置面板：临时编辑缓存】======================"
    if "function normalizeToolHubEnumValueBySchema" in text:
        fail("th05 normalizer already exists")
    text = replace_once(text, marker, NORMALIZER_AND_HELPERS + "\n" + marker, "th05 helper insertion")
    text = replace_function(text, "FloatBallAppWM.prototype.setPendingValue = function(k, v)", SET_PENDING)
    text = replace_function(text, "FloatBallAppWM.prototype.applyImmediateEffectsForKey = function(k)", APPLY_EFFECTS)
    write(path, text.rstrip() + "\n")


def update_th12():
    path = CODE / "th_12_rebuild.js"
    text = read(path)
    text = replace_once(text, "// @version 1.0.3", "// @version 1.0.4", "th12 version")
    marker = "// =======================【修复：设置项保存与即时生效补丁】======================"
    pos = text.find(marker)
    if pos < 0:
        fail("th12 settings patch marker missing")
    text = text[:pos].rstrip() + "\n\n" + TH12_SUFFIX
    write(path, text)


def update_th15():
    path = CODE / "th_15_extra.js"
    text = read(path)
    text = replace_once(text, "// @version 1.1.6", "// @version 1.1.7", "th15 version")
    marker = "// =======================【固定位置预设与悬浮球手势收敛】======================="
    pos = text.find(marker)
    if pos < 0:
        fail("th15 fixed position wrapper marker missing")
    text = text[:pos].rstrip() + "\n"
    write(path, text)


def update_boundaries():
    path = ROOT / "MODULE_BOUNDARIES.json"
    data = json.loads(read(path))
    direct = data.setdefault("directOwners", {})
    direct["setPendingValue"] = "th_05_persistence.js"
    direct["applyImmediateEffectsForKey"] = "th_05_persistence.js"
    removed = []
    kept = []
    for row in data.get("duplicateDefinitions", []):
        if row.get("method") in ("setPendingValue", "applyImmediateEffectsForKey"):
            removed.append(row.get("method"))
        else:
            kept.append(row)
    if sorted(removed) != ["applyImmediateEffectsForKey", "setPendingValue"]:
        fail("boundary records removed mismatch: " + repr(removed))
    data["duplicateDefinitions"] = kept
    write(path, json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def update_protected_generator():
    path = ROOT / "scripts" / "report_protected_wrapper_chains.py"
    text = read(path)
    for method in ("applyImmediateEffectsForKey", "setPendingValue"):
        pattern = re.compile(r'\n    "' + re.escape(method) + r'": \(\n.*?\n    \),', re.S)
        text, count = pattern.subn("", text, count=1)
        if count != 1:
            fail("classification removal failed: " + method)
    text = replace_once(
        text,
        "这些链承担设置类型、指针/OCR、生命周期、页面状态或延迟加载职责。",
        "这些链承担指针/OCR、生命周期、页面状态或延迟加载职责。",
        "protected conclusion",
    )
    text = replace_once(
        text,
        'lines.append("1. `execButtonAction` 与 `execShellSmart` 诊断逻辑已并回基础实现。")\n    lines.append("2. 当前剩余 13 条包装链全部继续保留，不进入批量收敛流程。")\n    lines.append("3. 仅在出现明确重复、失效包装或回归证据时重新开启专项审查。")',
        'lines.append("1. 设置与类型包装已并回 `th_05_persistence.js`。")\n    lines.append("2. 当前剩余 11 条包装链全部继续保留，不进入批量收敛流程。")\n    lines.append("3. 指针/OCR、ToolApp 和 deferred wrapper 仅在明确回归证据下重新审查。")',
        "protected next steps",
    )
    write(path, text)


def update_dead_generator():
    path = ROOT / "scripts" / "report_dead_module_symbols.py"
    text = read(path)
    text = replace_once(
        text,
        'lines.append("1. 后续覆盖候选与 Shell 诊断包装收敛已完成。")\n    lines.append("2. 当前剩余 13 条受保护包装链均承担明确功能或生命周期职责。")',
        'lines.append("1. 后续覆盖候选、Shell 诊断和设置类型包装收敛已完成。")\n    lines.append("2. 当前剩余 11 条受保护包装链均承担明确功能或生命周期职责。")',
        "dead next steps",
    )
    write(path, text)


def update_schema_verifier():
    path = ROOT / "scripts" / "verify_schema_validator.py"
    text = read(path)
    text = replace_once(
        text,
        'BASE = ROOT / "code" / "th_01_base.js"\n',
        'BASE = ROOT / "code" / "th_01_base.js"\nPERSISTENCE = ROOT / "code" / "th_05_persistence.js"\nREBUILD = ROOT / "code" / "th_12_rebuild.js"\nEXTRA = ROOT / "code" / "th_15_extra.js"\n',
        "schema verifier paths",
    )
    text = replace_once(
        text,
        '    src = BASE.read_text(encoding="utf-8")\n    errors = []\n',
        '    src = BASE.read_text(encoding="utf-8")\n    persistence = PERSISTENCE.read_text(encoding="utf-8")\n    rebuild = REBUILD.read_text(encoding="utf-8")\n    extra = EXTRA.read_text(encoding="utf-8")\n    errors = []\n',
        "schema verifier reads",
    )
    insertion = r'''    required_persistence = [
        "function normalizeToolHubEnumValueBySchema(key, value)",
        "this.state.pendingUserCfg[k] = normalizeToolHubEnumValueBySchema(k, v)",
        "FloatBallAppWM.prototype.isThemeEffectKey = function(k)",
        "FloatBallAppWM.prototype.isPanelLayoutEffectKey = function(k)",
        "FloatBallAppWM.prototype.isPointerEffectKey = function(k)",
        "FloatBallAppWM.prototype.isBallVisualEffectKey = function(k)",
        "FloatBallAppWM.prototype.refreshPointerAfterSettingsChanged = function()",
        "FloatBallAppWM.prototype.refreshVisiblePanelsAfterSettingsChanged = function(reason)",
        "FloatBallAppWM.prototype.scheduleSettingsEffectRefresh = function(reason, themeChanged, panelChanged)",
        "this.isBallPositionEffectKey && this.isBallPositionEffectKey(key)",
        "this.scheduleConfiguredBallPositionApply(\"settings:\" + key, true)",
        "this.refreshPointerAfterSettingsChanged()",
        "this.scheduleSettingsEffectRefresh(key, themeChanged, panelChanged)",
        "BALL_IDLE_ALPHA",
    ]
    for marker in required_persistence:
        if marker not in persistence:
            errors.append("settings effect marker missing: " + marker)

    required_rebuild = [
        "ConfigValidator.validate = function(key, value)",
        "normalizeToolHubEnumValueBySchema(key, value)",
        "ConfigValidator.__toolHubEnumNormalizePatchInstalled = true",
    ]
    for marker in required_rebuild:
        if marker not in rebuild:
            errors.append("enum validator marker missing: " + marker)

    forbidden = {
        "th_12_rebuild.js": [
            "proto.setPendingValue = function(k, v)",
            "proto.applyImmediateEffectsForKey = function(k)",
            "__toolHubSetPendingValuePatched",
            "__toolHubApplyImmediateEffectsPatched",
            "__toolHubSettingsEffectPatchInstalled",
            "installSettingsEffectPatch()",
        ],
        "th_15_extra.js": [
            "proto.applyImmediateEffectsForKey = function(k)",
            "install fixed ball position patch fail",
        ],
    }
    for name, markers in forbidden.items():
        body = rebuild if name == "th_12_rebuild.js" else extra
        for marker in markers:
            if marker in body:
                errors.append(name + ": stale wrapper remains " + marker)

    combined = persistence + "\n" + rebuild + "\n" + extra
    pending_defs = len(re.findall(r"(?:FloatBallAppWM\\.prototype|proto)\\.setPendingValue\\s*=\\s*function\\s*\\(", combined))
    apply_defs = len(re.findall(r"(?:FloatBallAppWM\\.prototype|proto)\\.applyImmediateEffectsForKey\\s*=\\s*function\\s*\\(", combined))
    if pending_defs != 1:
        errors.append("setPendingValue definition count=" + str(pending_defs))
    if apply_defs != 1:
        errors.append("applyImmediateEffectsForKey definition count=" + str(apply_defs))
'''
    text = replace_once(text, "    if errors:\n", insertion + "    if errors:\n", "schema verifier checks")
    text = replace_once(
        text,
        '    print("schema_validator_ok keys=" + str(len(EXPECTED)))',
        '    print("schema_validator_ok keys=" + str(len(EXPECTED)) + " settings_effects=1")',
        "schema verifier output",
    )
    write(path, text)


def update_verify_workflow():
    path = ROOT / ".github" / "workflows" / "verify.yml"
    text = read(path)
    pattern = re.compile(
        r"\n      - name: Verify settings type wrapper analysis\n.*?\n      - name: Verify th_15 standalone audit",
        re.S,
    )
    text, count = pattern.subn("\n      - name: Verify th_15 standalone audit", text, count=1)
    if count != 1:
        fail("verify workflow settings analysis block removal failed")
    write(path, text)


def remove_stage_files():
    for rel in ("SETTINGS_TYPE_WRAPPER_ANALYSIS.md", "scripts/verify_settings_type_wrappers.py"):
        path = ROOT / rel
        if not path.exists():
            fail(rel + " missing")
        path.unlink()


def main():
    update_th05()
    update_th12()
    update_th15()
    update_boundaries()
    update_protected_generator()
    update_dead_generator()
    update_schema_verifier()
    update_verify_workflow()
    remove_stage_files()
    print("OK settings type wrapper cleanup applied")


if __name__ == "__main__":
    main()
