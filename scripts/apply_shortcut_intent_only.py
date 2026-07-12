#!/usr/bin/env python3
"""临时应用 Shortcut intent-only 与 legacy_js 隔离补丁。"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path, old, new, label):
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit("patch anchor %s count=%d in %s" % (label, count, path))
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def replace_between(path, start_marker, end_marker, new_block, label):
    text = path.read_text(encoding="utf-8")
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit("missing start marker %s in %s" % (label, path))
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit("missing end marker %s in %s" % (label, path))
    path.write_text(text[:start] + new_block + text[end:], encoding="utf-8")


base = ROOT / "code" / "th_01_base.js"
action = ROOT / "code" / "th_11_action.js"
editor = ROOT / "code" / "th_14_button_editor.js"
shortcut = ROOT / "code" / "th_14_button_shortcut.js"

replace_once(base, "// @version 1.1.2", "// @version 1.1.3", "base version")
replace_once(action, "// @version 1.0.7", "// @version 1.0.8", "action version")
replace_once(editor, "// @version 1.0.2", "// @version 1.0.3", "editor version")
replace_once(shortcut, "// ToolHub - button shortcut inline selector module", "// @version 1.0.0\n// ToolHub - button shortcut inline selector module", "shortcut version")

replace_once(
    base,
    '''                if (b.type === "shell" && b.cmd && !b.cmd_b64) {
                    b.cmd_b64 = encodeBase64Utf8(b.cmd);
                    dirty = true;
                }
''',
    '''                if (b.type === "shell" && b.cmd && !b.cmd_b64) {
                    b.cmd_b64 = encodeBase64Utf8(b.cmd);
                    dirty = true;
                }

                // Shortcut 安全迁移：有 intentUri 的按钮固定走结构化启动；仅无 intentUri 且已有旧 JS 的按钮保留 legacy_js。
                if (String(b.type || "") === "shortcut") {
                    var shortcutIntent = "";
                    var shortcutJs = "";
                    var shortcutMode = "";
                    try { shortcutIntent = String(b.intentUri || "").replace(/^\\s+|\\s+$/g, ""); } catch (eScIntent) { shortcutIntent = ""; }
                    try { shortcutJs = String(b.shortcutJsCode || "").replace(/^\\s+|\\s+$/g, ""); } catch (eScJs) { shortcutJs = ""; }
                    try { shortcutMode = String(b.shortcutExecMode || "").replace(/^\\s+|\\s+$/g, "").toLowerCase(); } catch (eScMode) { shortcutMode = ""; }

                    var normalizedShortcutMode = "intent";
                    if (shortcutMode === "legacy_js" || shortcutMode === "legacy" || shortcutMode === "js") {
                        normalizedShortcutMode = "legacy_js";
                    } else if (!shortcutIntent && shortcutJs) {
                        normalizedShortcutMode = "legacy_js";
                    }

                    if (String(b.shortcutExecMode || "") !== normalizedShortcutMode) {
                        b.shortcutExecMode = normalizedShortcutMode;
                        dirty = true;
                    }
                    if (typeof b.shortcutRunMode !== "undefined") {
                        try { delete b.shortcutRunMode; } catch (eScRunMode) { b.shortcutRunMode = null; }
                        dirty = true;
                    }
                }
''',
    "button shortcut migration",
)

replace_once(
    base,
    '''            }
        }

        if (dirty) {
''',
    '''            }

            if (buttonMigrationVersion < 2) {
                try {
                    if (!cfgForButtonMigration) cfgForButtonMigration = this.loadSettings();
                    cfgForButtonMigration.BUTTONS_MIGRATION_VERSION = 2;
                    this.saveSettings(cfgForButtonMigration);
                } catch (eShortcutMigrationVersion) {}
            }
        }

        if (dirty) {
''',
    "button migration version 2",
)

shortcut_runtime = '''  if (t === "shortcut") {
  // 快捷方式默认只使用结构化 intentUri。只有显式 legacy_js 模式才允许执行旧 shortcutJsCode。
  // 旧 compat/strict/data/未知值全部收敛为 intent，避免失败时静默进入 eval。
  var spkg = btn.pkg ? String(btn.pkg) : "";
  var sid = btn.shortcutId ? String(btn.shortcutId) : "";
  var iu = (btn.intentUri != null) ? String(btn.intentUri) : "";

  var uid = 0;
  try { uid = (btn.userId != null) ? parseInt(String(btn.userId), 10) : 0; } catch(eUid0) { uid = 0; }
  if (isNaN(uid)) uid = 0;
  try {
    if (btn.launchUserId != null && String(btn.launchUserId).length > 0) {
      var lu0 = parseInt(String(btn.launchUserId), 10);
      if (!isNaN(lu0)) uid = lu0;
    }
  } catch(eLu0) { safeLog(null, 'e', "catch " + String(eLu0)); }

  function normalizeShortcutExecMode(v) {
    var mode = "intent";
    try { mode = String(v == null ? "" : v).replace(/^\\s+|\\s+$/g, "").toLowerCase(); } catch(eNormalizeMode) { mode = "intent"; }
    if (mode === "legacy_js" || mode === "legacy" || mode === "js") return "legacy_js";
    return "intent";
  }

  var shortcutMode = "intent";
  try {
    if (this.config && this.config.SHORTCUT_EXEC_MODE != null) shortcutMode = normalizeShortcutExecMode(this.config.SHORTCUT_EXEC_MODE);
    if (btn.shortcutExecMode != null) shortcutMode = normalizeShortcutExecMode(btn.shortcutExecMode);
  } catch(eMode) { shortcutMode = "intent"; }

  var dataErr = "";
  if (iu && iu.length > 0) {
    try {
      var dataIntent = android.content.Intent.parseUri(iu, 0);
      dataIntent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
      var dataUserHandle = android.os.UserHandle.of(uid);
      context.startActivityAsUser(dataIntent, dataUserHandle);
      safeLog(this.L, 'i', "shortcut(intentUri) ok pkg=" + spkg + " id=" + sid + " user=" + String(uid));
      return;
    } catch(eDataSc) {
      dataErr = String(eDataSc);
      safeLog(this.L, 'w', "shortcut(intentUri) fail pkg=" + spkg + " id=" + sid + " user=" + String(uid) + " err=" + dataErr);
      try {
        var dataIntent2 = android.content.Intent.parseUri(iu, 0);
        dataIntent2.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(dataIntent2);
        safeLog(this.L, 'i', "shortcut(intentUri startActivity fallback) ok pkg=" + spkg + " id=" + sid + " user=" + String(uid));
        return;
      } catch(eDataFallback) {
        dataErr = dataErr + " | fallback=" + String(eDataFallback);
        safeLog(this.L, 'w', "shortcut(intentUri startActivity fallback) fail pkg=" + spkg + " id=" + sid + " err=" + String(eDataFallback));
      }
    }
  } else {
    dataErr = "intentUri missing";
  }

  if (shortcutMode !== "legacy_js") {
    this.toast(iu ? "快捷方式 intentUri 启动失败" : "快捷方式缺少 intentUri");
    safeLog(this.L, 'e', "shortcut intent-only fail pkg=" + spkg + " id=" + sid + " user=" + String(uid) + " err=" + dataErr);
    return;
  }

  // 旧版兼容区：只有按钮或全局配置显式为 legacy_js 时才可进入。
  if (!spkg) { this.toast("按钮#" + idx + " 缺少 pkg"); return; }
  if (!sid) { this.toast("按钮#" + idx + " 缺少 shortcutId"); return; }

  var jsCode = (btn.shortcutJsCode != null) ? String(btn.shortcutJsCode) : "";
  if (!jsCode || jsCode.length === 0) {
    this.toast("按钮#" + idx + " 未配置旧版 JS 启动代码");
    safeLog(this.L, 'e', "shortcut legacy_js missing code pkg=" + spkg + " id=" + sid + " dataErr=" + dataErr);
    return;
  }

  try {
    var __sc_intentUri = iu;
    var __sc_userId = uid;
    var rjs = eval(jsCode);
    var sret = (rjs == null) ? "" : String(rjs);
    if (sret.indexOf("ok") === 0) {
      safeLog(this.L, 'i', "shortcut(legacy_js) ok pkg=" + spkg + " id=" + sid + " user=" + String(uid));
      return;
    }
    safeLog(this.L, 'e', "shortcut(legacy_js) fail pkg=" + spkg + " id=" + sid + " user=" + String(uid) + " ret=" + sret + " dataErr=" + dataErr);
    this.toast("旧版快捷方式 JS 启动失败: " + sret);
    return;
  } catch (eJsSc) {
    safeLog(this.L, 'e', "shortcut(legacy_js) exception pkg=" + spkg + " id=" + sid + " err=" + eJsSc + " dataErr=" + dataErr);
    this.toast("旧版快捷方式 JS 异常: " + String(eJsSc));
    return;
  }
}

'''
replace_between(
    action,
    '  if (t === "shortcut") {',
    '  this.toast("未知 type=" + t);',
    shortcut_runtime,
    "shortcut runtime",
)

replace_once(
    editor,
    '''            delete newBtn.shortcutId;
            delete newBtn.shortcutRunMode;
            delete newBtn.launchUserId;
''',
    '''            delete newBtn.shortcutId;
            delete newBtn.shortcutRunMode;
            delete newBtn.shortcutExecMode;
            delete newBtn.shortcutJsCode;
            delete newBtn.intentUri;
            delete newBtn.userId;
            delete newBtn.launchUserId;
''',
    "editor shortcut cleanup",
)

replace_once(
    editor,
    '''            } else if (newBtn.type === "shortcut") {
                var sp = shortcutInline ? shortcutInline.getPkg() : "";
                var sid = shortcutInline ? shortcutInline.getShortcutId() : "";
                if (!sp) { if (shortcutInline) shortcutInline.setPkgError("请先选择快捷方式"); markInvalid(null, "请先选择快捷方式"); }
                else { if (shortcutInline) shortcutInline.setPkgError(null); newBtn.pkg = sp; }
                if (!sid) { if (shortcutInline) shortcutInline.setShortcutIdError("请先选择快捷方式"); markInvalid(null, "请先选择快捷方式"); }
                else { if (shortcutInline) shortcutInline.setShortcutIdError(null); newBtn.shortcutId = sid; }
                // # 保存：同时保存 intentUri/userId，供 JavaScript(startActivityAsUser) 脚本使用（锁定主/分身）
                try { var _scIntentUri = shortcutInline ? shortcutInline.getIntentUri() : ""; if (_scIntentUri && _scIntentUri.length > 0) newBtn.intentUri = String(_scIntentUri);  } catch(eSIU2) { safeLog(null, 'e', "catch " + String(eSIU2)); }
                try { var _scUserId = shortcutInline ? shortcutInline.getUserId() : 0; newBtn.userId = _scUserId; newBtn.launchUserId = _scUserId; } catch(eSUID2) { newBtn.userId = 0; newBtn.launchUserId = 0; }
                // # 保存：快捷方式 JS 启动代码（自动生成/可手动编辑）
                try { if (shortcutInline) newBtn.shortcutJsCode = String(shortcutInline.getJsCode());  } catch(eSaveJs) { safeLog(null, 'e', "catch " + String(eSaveJs)); }
                // # 保存：快捷方式仅使用 JavaScript 执行（取消 Shell/兜底）
                newBtn.shortcutRunMode = "js";
            }
''',
    '''            } else if (newBtn.type === "shortcut") {
                var sp = shortcutInline ? shortcutInline.getPkg() : "";
                var sid = shortcutInline ? shortcutInline.getShortcutId() : "";
                var keepLegacyJs = false;
                try { keepLegacyJs = !!(shortcutInline && shortcutInline.isLegacyJsEnabled && shortcutInline.isLegacyJsEnabled()); } catch(eLegacyFlag) { keepLegacyJs = false; }

                if (!sp) { if (shortcutInline) shortcutInline.setPkgError("请先选择快捷方式"); markInvalid(null, "请先选择快捷方式"); }
                else { if (shortcutInline) shortcutInline.setPkgError(null); newBtn.pkg = sp; }
                if (!sid) { if (shortcutInline) shortcutInline.setShortcutIdError("请先选择快捷方式"); markInvalid(null, "请先选择快捷方式"); }
                else { if (shortcutInline) shortcutInline.setShortcutIdError(null); newBtn.shortcutId = sid; }

                var _scIntentUri = "";
                try { _scIntentUri = shortcutInline ? String(shortcutInline.getIntentUri() || "") : ""; } catch(eSIU2) { _scIntentUri = ""; }
                try { var _scUserId = shortcutInline ? shortcutInline.getUserId() : 0; newBtn.userId = _scUserId; newBtn.launchUserId = _scUserId; } catch(eSUID2) { newBtn.userId = 0; newBtn.launchUserId = 0; }

                if (keepLegacyJs) {
                    var legacyCode = "";
                    try { legacyCode = shortcutInline ? String(shortcutInline.getJsCode() || "") : ""; } catch(eLegacyCode) { legacyCode = ""; }
                    if (!legacyCode.replace(/^\\s+|\\s+$/g, "")) markInvalid(null, "旧版 JS 代码不能为空");
                    else {
                        newBtn.shortcutExecMode = "legacy_js";
                        newBtn.shortcutJsCode = legacyCode;
                        if (_scIntentUri) newBtn.intentUri = _scIntentUri;
                    }
                } else {
                    if (!_scIntentUri) markInvalid(null, "请选择包含 intentUri 的快捷方式");
                    else newBtn.intentUri = _scIntentUri;
                    newBtn.shortcutExecMode = "intent";
                }
            }
''',
    "editor shortcut save",
)

legacy_ui = '''// # 旧版 JS 兼容区：仅对已迁移为 legacy_js 的历史按钮显示；新建快捷方式不提供任意 JS 编辑入口。
    var legacyJsEnabled = false;
    try {
        var legacyMode0 = String(targetBtn.shortcutExecMode || "").replace(/^\\s+|\\s+$/g, "").toLowerCase();
        legacyJsEnabled = (legacyMode0 === "legacy_js");
        if (!legacyJsEnabled && !scSelectedIntentUri && targetBtn.shortcutJsCode && String(targetBtn.shortcutRunMode || "") === "js") legacyJsEnabled = true;
    } catch(eLegacyMode0) { legacyJsEnabled = false; }

    var legacyJsWrap = null;
    var legacyJsSwitch = null;
    var inputScJsCode = null;

    function __scSetLegacyJsEnabled(enabled) {
        legacyJsEnabled = !!enabled;
        try { if (legacyJsSwitch && legacyJsSwitch.isChecked() !== legacyJsEnabled) legacyJsSwitch.setChecked(legacyJsEnabled); } catch(eLegacyCheck) {}
        try { if (inputScJsCode && inputScJsCode.view) inputScJsCode.view.setVisibility(legacyJsEnabled ? android.view.View.VISIBLE : android.view.View.GONE); } catch(eLegacyVis) {}
    }

    if (legacyJsEnabled) {
        legacyJsWrap = new android.widget.LinearLayout(context);
        legacyJsWrap.setOrientation(android.widget.LinearLayout.VERTICAL);
        legacyJsWrap.setPadding(self.dp(10), self.dp(8), self.dp(10), self.dp(8));

        var legacyWarn = new android.widget.TextView(context);
        legacyWarn.setText("旧版 JS 兼容模式：仅用于没有 intentUri 的历史按钮。重新选择快捷方式后将自动关闭。");
        legacyWarn.setTextColor(subTextColor);
        legacyWarn.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
        legacyWarn.setPadding(0, 0, 0, self.dp(6));
        legacyJsWrap.addView(legacyWarn);

        var legacyRow = new android.widget.LinearLayout(context);
        legacyRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        legacyRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
        var legacyTitle = new android.widget.TextView(context);
        legacyTitle.setText("保留旧版 JS 执行");
        legacyTitle.setTextColor(textColor);
        legacyTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
        var legacyTitleLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        legacyTitleLp.weight = 1;
        legacyRow.addView(legacyTitle, legacyTitleLp);
        legacyJsSwitch = new android.widget.Switch(context);
        legacyJsSwitch.setChecked(true);
        legacyRow.addView(legacyJsSwitch);
        legacyJsWrap.addView(legacyRow);

        inputScJsCode = self.ui.createInputGroup(self, "旧版快捷方式 JS", (targetBtn.shortcutJsCode ? String(targetBtn.shortcutJsCode) : ""), true, "仅为历史兼容保留；建议重新选择快捷方式迁移为 intentUri");
        legacyJsWrap.addView(inputScJsCode.view);
        legacyJsSwitch.setOnCheckedChangeListener(new android.widget.CompoundButton.OnCheckedChangeListener({
            onCheckedChanged: function(buttonView, checked) {
                try { __scSetLegacyJsEnabled(!!checked); self.touchActivity(); } catch(eLegacyToggle) {}
            }
        }));
        shortcutWrap.addView(legacyJsWrap);
        __scSetLegacyJsEnabled(true);
    }

'''
replace_between(
    shortcut,
    '// # 快捷方式 JS 启动代码（自动生成，可手动微调）',
    '// # 快捷方式选择器（内联折叠版）',
    legacy_ui,
    "shortcut legacy UI",
)

replace_once(
    shortcut,
    '''                // # 同步刷新：JS 启动代码（选择快捷方式后自动生成并回填）
                __scUpdateJsCodeSafe();
''',
    '''                // 重新选择到有效 intentUri 后，自动退出旧版 JS 兼容模式。
                __scSetLegacyJsEnabled(false);
''',
    "shortcut selection disables legacy",
)

replace_once(
    shortcut,
    '''        getIntentUri: function() { try { return scSelectedIntentUri ? String(scSelectedIntentUri) : ""; } catch(e) { return ""; } },
        getUserId: function() { try { var u = parseInt(String(scSelectedUserId), 10); return isNaN(u) ? 0 : u; } catch(e) { return 0; } },
        getJsCode: function() { try { return inputScJsCode ? String(inputScJsCode.getValue()) : ""; } catch(e) { return ""; } }
''',
    '''        getIntentUri: function() { try { return scSelectedIntentUri ? String(scSelectedIntentUri) : ""; } catch(e) { return ""; } },
        getUserId: function() { try { var u = parseInt(String(scSelectedUserId), 10); return isNaN(u) ? 0 : u; } catch(e) { return 0; } },
        isLegacyJsEnabled: function() { try { return !!legacyJsEnabled; } catch(e) { return false; } },
        getJsCode: function() { try { return inputScJsCode ? String(inputScJsCode.getValue()) : ""; } catch(e) { return ""; } }
''',
    "shortcut return legacy state",
)

print("Shortcut intent-only patch applied")
