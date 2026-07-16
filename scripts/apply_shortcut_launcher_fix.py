#!/usr/bin/env python3
"""Apply the launcher-native shortcut save/execute fix on the current branch."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def write(rel, text):
    (ROOT / rel).write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("FAIL patch %s: expected 1 match, got %d" % (label, count))
    return text.replace(old, new, 1)


def replace_between(text, start_marker, end_marker, replacement, label):
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit("FAIL patch %s: start marker missing" % label)
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit("FAIL patch %s: end marker missing" % label)
    return text[:start] + replacement + text[end:]


shortcut_path = "code/th_14_button_shortcut.js"
shortcut = read(shortcut_path)
shortcut = replace_once(shortcut, "// @version 1.0.2", "// @version 1.0.3", "shortcut version")
shortcut = replace_once(
    shortcut,
    '''            var label = "";
            try { label = __scStr(info.getShortLabel()); } catch(eLabel) { label = ""; }
            items.push({
                userId: Number(userId),
                pkg: __scStr(pkg),
                shortcutId: shortcutId,
                label: label,
                intentUri: __scIntentUriFromInfo(info),
                shortcutInfo: info
            });''',
    '''            var label = "";
            try { label = __scStr(info.getShortLabel()); } catch(eLabel) { label = ""; }
            var intentUri = __scIntentUriFromInfo(info);
            items.push({
                userId: Number(userId),
                pkg: __scStr(pkg),
                shortcutId: shortcutId,
                label: label,
                intentUri: intentUri,
                launchMethod: intentUri ? "launcher_intent" : "launcher",
                shortcutInfo: info
            });''',
    "shortcut item metadata",
)
shortcut = replace_once(
    shortcut,
    '                holder.detail.setText("pkg=" + __scStr(item.pkg) + "  id=" + __scStr(item.shortcutId) + "  u=" + __scStr(item.userId));',
    '                var launchLabel = item.intentUri ? "Launcher + Intent 后备" : "Launcher 启动";\n                holder.detail.setText("用户 " + __scStr(item.userId) + " · " + launchLabel + "\\npkg=" + __scStr(item.pkg) + "  id=" + __scStr(item.shortcutId));',
    "shortcut list launch label",
)
shortcut = replace_once(
    shortcut,
    '''                scSelectedUserId = parseInt(__scStr(item.userId), 10);
                if (isNaN(scSelectedUserId) || scSelectedUserId < 0) scSelectedUserId = 0;
                try { inputScCmd.input.setText(__scBuildLaunchCmd()); } catch(eUpdateCommand) {}''',
    '''                scSelectedUserId = parseInt(__scStr(item.userId), 10);
                if (isNaN(scSelectedUserId) || scSelectedUserId < 0) scSelectedUserId = 0;
                safeLog(self.L, "i", "shortcut picker selected pkg=" + __scStr(item.pkg) + " id=" + __scStr(item.shortcutId) + " user=" + String(scSelectedUserId) + " intentUriLen=" + String(scSelectedIntentUri.length) + " launchMethod=" + __scStr(item.launchMethod || (scSelectedIntentUri ? "launcher_intent" : "launcher")));
                try { inputScCmd.input.setText(__scBuildLaunchCmd()); } catch(eUpdateCommand) {}''',
    "shortcut selection diagnostics",
)
write(shortcut_path, shortcut)

editor_path = "code/th_14_button_editor.js"
editor = read(editor_path)
editor = replace_once(editor, "// @version 1.1.1", "// @version 1.1.2", "editor version")
editor = replace_once(
    editor,
    '''  var dividerColor = T.outlineVariant;
  var inputBgColor = T.surface2;''',
    '''  var dividerColor = T.outlineVariant;
  var inputBgColor = T.surface2;
  var dangerColor = T.danger || C.danger || android.graphics.Color.parseColor("#BA1A1A");''',
    "editor danger color",
)
editor = replace_once(
    editor,
    '''      var color = (kind === "error") ? C.error : (kind === "ok" ? T.primary : T.primary);
      var bg = (kind === "error") ? self.withAlpha(C.error, isDark ? 0.20 : 0.10) : self.withAlpha(T.primary, isDark ? 0.18 : 0.10);
      var stroke = (kind === "error") ? self.withAlpha(C.error, isDark ? 0.44 : 0.30) : self.withAlpha(T.primary, isDark ? 0.34 : 0.22);''',
    '''      var color = (kind === "error") ? dangerColor : (kind === "ok" ? T.primary : T.primary);
      var bg = (kind === "error") ? self.withAlpha(dangerColor, isDark ? 0.20 : 0.10) : self.withAlpha(T.primary, isDark ? 0.18 : 0.10);
      var stroke = (kind === "error") ? self.withAlpha(dangerColor, isDark ? 0.44 : 0.30) : self.withAlpha(T.primary, isDark ? 0.34 : 0.22);''',
    "editor stored notice colors",
)
editor = replace_once(
    editor,
    '''      var color2 = (k === "error") ? C.error : (k === "ok" ? T.primary : T.primary);
      var bg2 = (k === "error") ? self.withAlpha(C.error, isDark ? 0.20 : 0.10) : self.withAlpha(T.primary, isDark ? 0.18 : 0.10);
      var stroke2 = (k === "error") ? self.withAlpha(C.error, isDark ? 0.44 : 0.30) : self.withAlpha(T.primary, isDark ? 0.34 : 0.22);''',
    '''      var color2 = (k === "error") ? dangerColor : (k === "ok" ? T.primary : T.primary);
      var bg2 = (k === "error") ? self.withAlpha(dangerColor, isDark ? 0.20 : 0.10) : self.withAlpha(T.primary, isDark ? 0.18 : 0.10);
      var stroke2 = (k === "error") ? self.withAlpha(dangerColor, isDark ? 0.44 : 0.30) : self.withAlpha(T.primary, isDark ? 0.34 : 0.22);''',
    "editor inline notice colors",
)
editor = replace_once(
    editor,
    '''                } else {
                    if (!_scIntentUri) markInvalid(null, "请选择包含 intentUri 的快捷方式");
                    else newBtn.intentUri = _scIntentUri;
                    newBtn.shortcutExecMode = "intent";
                }''',
    '''                } else {
                    newBtn.shortcutExecMode = "intent";
                    if (_scIntentUri) newBtn.intentUri = _scIntentUri;
                    else delete newBtn.intentUri;
                }''',
    "editor optional intent uri",
)
editor = replace_once(
    editor,
    '''            if (!isValid) {
                finishButtonEditorSaveBusy();''',
    '''            if (!isValid) {
                var validationMeta = "";
                if (newBtn.type === "shortcut") {
                    validationMeta = " hasPkg=" + String(!!sp) + " hasShortcutId=" + String(!!sid) + " hasIntentUri=" + String(!!_scIntentUri) + " legacy=" + String(!!keepLegacyJs);
                }
                safeLog(self.L, "w", "button editor validation blocked type=" + String(newBtn.type || "") + validationMeta + " reason=" + String(validationMessage || "请补全必填项"));
                finishButtonEditorSaveBusy();''',
    "editor validation diagnostics",
)
write(editor_path, editor)

action_path = "code/th_11_action.js"
action = read(action_path)
action = replace_once(action, "// @version 1.1.0", "// @version 1.1.1", "action version")
new_shortcut_block = r'''  if (t === "shortcut") {
  // 结构化快捷方式优先使用 LauncherApps.startShortcut(pkg, id, user)。
  // intentUri 仅作为持久化后备；只有显式 legacy_js 才允许执行旧 shortcutJsCode。
  var spkg = btn.pkg ? String(btn.pkg) : "";
  var sid = btn.shortcutId ? String(btn.shortcutId) : "";
  var iu = (btn.intentUri != null) ? String(btn.intentUri) : "";

  if (!spkg) {
    this.toast("按钮#" + idx + " 缺少 pkg");
    safeLog(this.L, 'e', "shortcut missing pkg idx=" + String(idx));
    return;
  }
  if (!sid) {
    this.toast("按钮#" + idx + " 缺少 shortcutId");
    safeLog(this.L, 'e', "shortcut missing id pkg=" + spkg + " idx=" + String(idx));
    return;
  }

  var uid = 0;
  try { uid = (btn.userId != null) ? parseInt(String(btn.userId), 10) : 0; } catch(eUid0) { uid = 0; }
  if (isNaN(uid) || uid < 0) uid = 0;
  try {
    if (btn.launchUserId != null && String(btn.launchUserId).length > 0) {
      var lu0 = parseInt(String(btn.launchUserId), 10);
      if (!isNaN(lu0) && lu0 >= 0) uid = lu0;
    }
  } catch(eLu0) { safeLog(null, 'e', "catch " + String(eLu0)); }

  function normalizeShortcutExecMode(v) {
    var mode = "intent";
    try { mode = String(v == null ? "" : v).replace(/^\s+|\s+$/g, "").toLowerCase(); } catch(eNormalizeMode) { mode = "intent"; }
    if (mode === "legacy_js" || mode === "legacy" || mode === "js") return "legacy_js";
    return "intent";
  }

  var shortcutMode = "intent";
  try {
    if (this.config && this.config.SHORTCUT_EXEC_MODE != null) shortcutMode = normalizeShortcutExecMode(this.config.SHORTCUT_EXEC_MODE);
    if (btn.shortcutExecMode != null) shortcutMode = normalizeShortcutExecMode(btn.shortcutExecMode);
  } catch(eMode) { shortcutMode = "intent"; }

  var launcherErr = "";
  try {
    var launcherApps = context.getSystemService(android.content.Context.LAUNCHER_APPS_SERVICE);
    if (!launcherApps) throw "LauncherApps unavailable";
    var shortcutUser = android.os.UserHandle.of(uid);
    launcherApps.startShortcut(spkg, sid, null, null, shortcutUser);
    safeLog(this.L, 'i', "shortcut(launcherApps) ok pkg=" + spkg + " id=" + sid + " user=" + String(uid));
    return;
  } catch(eLauncherShortcut) {
    launcherErr = String(eLauncherShortcut);
    safeLog(this.L, 'w', "shortcut(launcherApps) fail pkg=" + spkg + " id=" + sid + " user=" + String(uid) + " err=" + launcherErr);
  }

  var intentErr = "";
  if (iu && iu.length > 0) {
    try {
      var dataIntent = android.content.Intent.parseUri(iu, 0);
      dataIntent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
      var dataUserHandle = android.os.UserHandle.of(uid);
      context.startActivityAsUser(dataIntent, dataUserHandle);
      safeLog(this.L, 'i', "shortcut(intentUri fallback) ok pkg=" + spkg + " id=" + sid + " user=" + String(uid));
      return;
    } catch(eDataSc) {
      intentErr = String(eDataSc);
      safeLog(this.L, 'w', "shortcut(intentUri fallback) fail pkg=" + spkg + " id=" + sid + " user=" + String(uid) + " err=" + intentErr);
      try {
        var dataIntent2 = android.content.Intent.parseUri(iu, 0);
        dataIntent2.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(dataIntent2);
        safeLog(this.L, 'i', "shortcut(intentUri main-user fallback) ok pkg=" + spkg + " id=" + sid + " user=" + String(uid));
        return;
      } catch(eDataFallback) {
        intentErr = intentErr + " | main=" + String(eDataFallback);
        safeLog(this.L, 'w', "shortcut(intentUri main-user fallback) fail pkg=" + spkg + " id=" + sid + " err=" + String(eDataFallback));
      }
    }
  } else {
    intentErr = "intentUri missing";
  }

  if (shortcutMode !== "legacy_js") {
    this.toast(iu ? "快捷方式启动失败" : "快捷方式已失效或不可访问");
    safeLog(this.L, 'e', "shortcut structured fail pkg=" + spkg + " id=" + sid + " user=" + String(uid) + " launcherErr=" + launcherErr + " intentErr=" + intentErr);
    return;
  }

  // 旧版兼容区：只有按钮或全局配置显式为 legacy_js 时可进入。
  var jsCode = (btn.shortcutJsCode != null) ? String(btn.shortcutJsCode) : "";
  if (!jsCode || jsCode.length === 0) {
    this.toast("按钮#" + idx + " 未配置旧版 JS 启动代码");
    safeLog(this.L, 'e', "shortcut legacy_js missing code pkg=" + spkg + " id=" + sid + " launcherErr=" + launcherErr + " intentErr=" + intentErr);
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
    safeLog(this.L, 'e', "shortcut(legacy_js) fail pkg=" + spkg + " id=" + sid + " user=" + String(uid) + " ret=" + sret + " launcherErr=" + launcherErr + " intentErr=" + intentErr);
    this.toast("旧版快捷方式 JS 启动失败: " + sret);
    return;
  } catch (eJsSc) {
    safeLog(this.L, 'e', "shortcut(legacy_js) exception pkg=" + spkg + " id=" + sid + " err=" + eJsSc + " launcherErr=" + launcherErr + " intentErr=" + intentErr);
    this.toast("旧版快捷方式 JS 异常: " + String(eJsSc));
    return;
  }
}'''
action = replace_between(
    action,
    '  if (t === "shortcut") {',
    '\n\n  this.toast("未知 type=" + t);',
    new_shortcut_block,
    "runtime shortcut block",
)
write(action_path, action)

security_path = "scripts/verify_shortcut_security.py"
security = read(security_path)
security = replace_once(
    security,
    '"""Verify Shortcut intent-only defaults, legacy migration and eval isolation."""',
    '"""Verify structured Shortcut defaults, Launcher execution and eval isolation."""',
    "security docstring",
)
security = replace_once(
    security,
    '''    eval_pos = action.find("eval(jsCode)")
    guard_pos = action.find('if (shortcutMode !== "legacy_js")')
    legacy_pos = action.find('var jsCode = (btn.shortcutJsCode')
    shortcut_version = re.search(r"^// @version\\s+(\\d+)\\.(\\d+)\\.(\\d+)", shortcut)''',
    '''    eval_pos = action.find("eval(jsCode)")
    guard_pos = action.find('if (shortcutMode !== "legacy_js")')
    legacy_pos = action.find('var jsCode = (btn.shortcutJsCode')
    launcher_pos = action.find("launcherApps.startShortcut(spkg, sid, null, null, shortcutUser)")
    intent_pos = action.find("android.content.Intent.parseUri(iu, 0)")
    shortcut_version = re.search(r"^// @version\\s+(\\d+)\\.(\\d+)\\.(\\d+)", shortcut)
    action_version = re.search(r"^// @version\\s+(\\d+)\\.(\\d+)\\.(\\d+)", action)''',
    "security positions",
)
security = replace_once(
    security,
    '''        ("eval is behind explicit legacy guard", guard_pos >= 0 and legacy_pos > guard_pos and eval_pos > legacy_pos),
        ("intent failure returns before legacy code", 'shortcutMode !== "legacy_js"' in action and 'shortcut intent-only fail' in action),''',
    '''        ("launcher start exists once", action.count("launcherApps.startShortcut(spkg, sid, null, null, shortcutUser)") == 1),
        ("launcher runs before intent fallback", launcher_pos >= 0 and intent_pos > launcher_pos),
        ("eval is behind explicit legacy guard", guard_pos >= 0 and legacy_pos > guard_pos and eval_pos > legacy_pos),
        ("structured failure returns before legacy code", 'shortcutMode !== "legacy_js"' in action and 'shortcut structured fail' in action),''',
    "security launcher checks",
)
security = replace_once(
    security,
    '''        ("editor requires intent uri outside legacy", '请选择包含 intentUri 的快捷方式' in editor),
        ("new shortcut UI does not generate js", '__scBuildDefaultJsCode' not in shortcut and '__scUpdateJsCodeSafe' not in shortcut),''',
    '''        ("editor allows launcher-only shortcuts", '请选择包含 intentUri 的快捷方式' not in editor and 'if (_scIntentUri) newBtn.intentUri = _scIntentUri;' in editor),
        ("editor clears stale optional intent", 'else delete newBtn.intentUri;' in editor),
        ("new shortcut UI does not generate js", '__scBuildDefaultJsCode' not in shortcut and '__scUpdateJsCodeSafe' not in shortcut),''',
    "security editor checks",
)
security = replace_once(
    security,
    '''        ("shortcut submodule has a real version", bool(shortcut_version) and tuple(map(int, shortcut_version.groups())) >= (1, 0, 2)),''',
    '''        ("shortcut submodule has a real version", bool(shortcut_version) and tuple(map(int, shortcut_version.groups())) >= (1, 0, 3)),
        ("action module version advanced", bool(action_version) and tuple(map(int, action_version.groups())) >= (1, 1, 1)),''',
    "security versions",
)
write(security_path, security)

launcher_verify = '''#!/usr/bin/env python3
"""Verify launcher-native Shortcut save and execution invariants."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def version_at_least(text, expected):
    match = re.search(r"^// @version\\s+(\\d+)\\.(\\d+)\\.(\\d+)", text)
    return bool(match) and tuple(map(int, match.groups())) >= expected


def main():
    action = read("code/th_11_action.js")
    editor = read("code/th_14_button_editor.js")
    picker = read("code/th_14_button_shortcut.js")

    launcher = action.find("launcherApps.startShortcut(spkg, sid, null, null, shortcutUser)")
    intent = action.find("android.content.Intent.parseUri(iu, 0)")
    guard = action.find('if (shortcutMode !== "legacy_js")')
    eval_pos = action.find("eval(jsCode)")

    checks = [
        ("launcher path exists once", action.count("launcherApps.startShortcut(spkg, sid, null, null, shortcutUser)") == 1),
        ("launcher precedes intent fallback", launcher >= 0 and intent > launcher),
        ("legacy eval remains guarded", guard > intent and eval_pos > guard),
        ("runtime requires package", 'shortcut missing pkg idx=' in action),
        ("runtime requires shortcut id", 'shortcut missing id pkg=' in action),
        ("runtime preserves intent fallback", 'shortcut(intentUri fallback) ok' in action),
        ("editor no longer requires intent uri", '请选择包含 intentUri 的快捷方式' not in editor),
        ("editor saves package and id", 'newBtn.pkg = sp' in editor and 'newBtn.shortcutId = sid' in editor),
        ("editor saves both user fields", 'newBtn.userId = _scUserId' in editor and 'newBtn.launchUserId = _scUserId' in editor),
        ("editor stores optional intent", 'if (_scIntentUri) newBtn.intentUri = _scIntentUri;' in editor),
        ("editor clears stale intent", 'else delete newBtn.intentUri;' in editor),
        ("validation logging is redacted", 'hasIntentUri=' in editor and 'button editor validation blocked' in editor),
        ("notice uses danger role", 'var dangerColor = T.danger || C.danger' in editor),
        ("picker records launch method", 'launchMethod: intentUri ? "launcher_intent" : "launcher"' in picker),
        ("picker logs uri length only", 'intentUriLen=' in picker and 'shortcut picker selected pkg=' in picker),
        ("picker labels launcher-only entries", 'Launcher + Intent 后备' in picker and 'Launcher 启动' in picker),
        ("action version advanced", version_at_least(action, (1, 1, 1))),
        ("editor version advanced", version_at_least(editor, (1, 1, 2))),
        ("picker version advanced", version_at_least(picker, (1, 0, 3))),
    ]

    failed = [name for name, ok in checks if not ok]
    if failed:
        print("Shortcut launcher verification FAILED:")
        for name in failed:
            print(" - " + name)
        return 1
    print("Shortcut launcher verification OK checks=%d" % len(checks))
    return 0


if __name__ == "__main__":
    sys.exit(main())
'''
write("scripts/verify_shortcut_launcher_path.py", launcher_verify)

workflow_path = ".github/workflows/verify.yml"
workflow = read(workflow_path)
workflow = replace_once(
    workflow,
    '''            python3 scripts/verify_shortcut_security.py
            python3 scripts/verify_content_security.py''',
    '''            python3 scripts/verify_shortcut_security.py
            python3 scripts/verify_shortcut_launcher_path.py
            python3 scripts/verify_content_security.py''',
    "verify workflow shortcut launcher",
)
write(workflow_path, workflow)

print("OK applied shortcut launcher save fix")
