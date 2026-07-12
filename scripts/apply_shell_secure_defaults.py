#!/usr/bin/env python3
"""临时将 Shell 广播桥安全默认值应用到动作链和按钮编辑器。"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path, old, new, label):
    text = path.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit("missing patch anchor: %s in %s" % (label, path))
    if text.count(old) != 1:
        raise SystemExit("non-unique patch anchor: %s count=%d" % (label, text.count(old)))
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


action = ROOT / "code" / "th_11_action.js"
editor = ROOT / "code" / "th_14_button_editor.js"

replace_once(action, "// @version 1.0.6", "// @version 1.0.7", "action version")

replace_once(
    action,
    '''    var root = true;
    try {
      if (btn && btn.root !== undefined && btn.root !== null) {
        var rs = String(btn.root).replace(/^\\s+|\\s+$/g, "").toLowerCase();
        root = !(rs === "false" || rs === "0" || rs === "no" || rs === "off");
      }
    } catch(eRoot) { root = true; }''',
    '''    var root = false;
    try {
      if (btn && btn.root !== undefined && btn.root !== null) {
        var rs = String(btn.root).replace(/^\\s+|\\s+$/g, "").toLowerCase();
        root = (rs === "true" || rs === "1" || rs === "yes" || rs === "on");
      }
    } catch(eRoot) { root = false; }''',
    "diagnostic root default",
)

replace_once(
    action,
    '''    // # 旧按钮没有 root 字段时仍按 root 执行；新按钮可配置 root:false 走普通 shell。
    var needRoot = true;
    if (btn.root !== undefined && btn.root !== null) needRoot = parseBoolLike(btn.root, true);''',
    '''    // root 只接受按钮显式 true；旧按钮缺失 root 字段时使用普通权限。
    var needRoot = false;
    if (btn.root !== undefined && btn.root !== null) needRoot = parseBoolLike(btn.root, false);''',
    "shell button root default",
)

replace_once(
    action,
    '''        var bridgeMode = String(this.config.SHELL_BRIDGE_MODE || "compat");
        var targetPkg = String(this.config.SHELL_BRIDGE_TARGET_PACKAGE || "").replace(/^\\s+|\\s+$/g, "");
        var targetCls = String(this.config.SHELL_BRIDGE_TARGET_CLASS || "").replace(/^\\s+|\\s+$/g, "");
        var targetMode = "implicit";

        if (targetPkg && targetCls) {
          if (targetCls.charAt(0) === ".") targetCls = targetPkg + targetCls;
          it2.setComponent(new android.content.ComponentName(targetPkg, targetCls));
          targetMode = "component";
        } else if (targetPkg) {
          it2.setPackage(targetPkg);
          targetMode = "package";
        } else if (bridgeMode === "strict" || bridgeMode === "explicit") {
          shellBridgeBlockErr = "shell bridge target missing";
        }

        var tokenValue = String(this.config.SHELL_BRIDGE_TOKEN || "");
        var tokenKey = String(this.config.SHELL_BRIDGE_EXTRA_TOKEN || "token");
        if (tokenValue) {
          if (!tokenKey) tokenKey = "token";
          it2.putExtra(tokenKey, tokenValue);
        } else if (this.config.SHELL_BRIDGE_REQUIRE_TOKEN === true) {
          shellBridgeBlockErr = "shell bridge token missing";
        }''',
    '''        var bridgeMode = String(this.config.SHELL_BRIDGE_MODE || "strict");
        try { bridgeMode = bridgeMode.replace(/^\\s+|\\s+$/g, "").toLowerCase(); } catch(eMode) { bridgeMode = "strict"; }
        if (bridgeMode !== "compat" && bridgeMode !== "explicit" && bridgeMode !== "strict") bridgeMode = "strict";
        var targetPkg = String(this.config.SHELL_BRIDGE_TARGET_PACKAGE || "").replace(/^\\s+|\\s+$/g, "");
        var targetCls = String(this.config.SHELL_BRIDGE_TARGET_CLASS || "").replace(/^\\s+|\\s+$/g, "");
        var targetMode = "none";

        if (targetPkg && targetCls) {
          if (targetCls.charAt(0) === ".") targetCls = targetPkg + targetCls;
          it2.setComponent(new android.content.ComponentName(targetPkg, targetCls));
          targetMode = "component";
        } else if (targetPkg) {
          it2.setPackage(targetPkg);
          targetMode = "package";
        } else if (bridgeMode === "compat") {
          targetMode = "implicit";
        } else {
          shellBridgeBlockErr = "shell bridge target missing mode=" + bridgeMode;
        }

        var tokenValue = String(this.config.SHELL_BRIDGE_TOKEN || "");
        var tokenKey = String(this.config.SHELL_BRIDGE_EXTRA_TOKEN || "token");
        try { tokenValue = tokenValue.replace(/^\\s+|\\s+$/g, ""); } catch(eTokenTrim) {}
        try { tokenKey = tokenKey.replace(/^\\s+|\\s+$/g, ""); } catch(eTokenKeyTrim) {}
        var requireToken = (bridgeMode === "strict") || (this.config.SHELL_BRIDGE_REQUIRE_TOKEN === true);
        if (tokenValue) {
          if (!tokenKey) tokenKey = "token";
          it2.putExtra(tokenKey, tokenValue);
        } else if (requireToken) {
          shellBridgeBlockErr = "shell bridge token missing mode=" + bridgeMode;
        }''',
    "broadcast bridge target and token",
)

replace_once(
    action,
    '''        // # root：旧广播按钮没有 root 字段时仍默认 root=true；新按钮可在 btn.root 或 extra.root 中配置 false。
        try {
          if (!it2.hasExtra(kRoot)) {
            var bridgeNeedRoot = true;
            if (btn.root !== undefined && btn.root !== null) bridgeNeedRoot = parseBoolLike(btn.root, true);
            it2.putExtra(kRoot, bridgeNeedRoot);
          }
        } catch (eR0) {
          try {
            it2.putExtra(kRoot, true);
           } catch(eR1) { safeLog(null, 'e', "catch " + String(eR1)); }
        }''',
    '''        // root 只接受显式 true；缺失字段时使用普通权限。
        try {
          if (!it2.hasExtra(kRoot)) {
            var bridgeNeedRoot = false;
            if (btn.root !== undefined && btn.root !== null) bridgeNeedRoot = parseBoolLike(btn.root, false);
            it2.putExtra(kRoot, bridgeNeedRoot);
          }
        } catch (eR0) {
          try {
            it2.putExtra(kRoot, false);
           } catch(eR1) { safeLog(null, 'e', "catch " + String(eR1)); }
        }''',
    "broadcast root default",
)

replace_once(
    action,
    'it2.putExtra(kRoot, parseBoolLike(rawStr, true));',
    'it2.putExtra(kRoot, parseBoolLike(rawStr, false));',
    "broadcast root normalization",
)

replace_once(editor, "// @version 1.0.1", "// @version 1.0.2", "editor version")

replace_once(
    editor,
    '''    // # Root 开关已移除：广播桥接收端默认以 root 执行，开关无意义
    dynamicContainer.addView(shellWrap);''',
    '''    var shellRootRow = new android.widget.LinearLayout(context);
    shellRootRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    shellRootRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
    shellRootRow.setPadding(self.dp(10), self.dp(8), self.dp(6), self.dp(8));
    try { shellRootRow.setMinimumHeight(self.dp(48)); } catch(eRootRowH) {}
    var shellRootText = new android.widget.TextView(context);
    shellRootText.setText("使用 Root 权限");
    shellRootText.setTextColor(textColor);
    shellRootText.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    var shellRootTextLp = new android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
    shellRootTextLp.weight = 1;
    shellRootRow.addView(shellRootText, shellRootTextLp);
    var shellRootSwitch = new android.widget.Switch(context);
    var initialShellRoot = false;
    try {
      if (targetBtn.root !== undefined && targetBtn.root !== null) {
        var initialRootText = String(targetBtn.root).replace(/^\\s+|\\s+$/g, "").toLowerCase();
        initialShellRoot = (targetBtn.root === true || initialRootText === "true" || initialRootText === "1" || initialRootText === "yes" || initialRootText === "on");
      }
    } catch(eInitialRoot) { initialShellRoot = false; }
    shellRootSwitch.setChecked(initialShellRoot);
    try { shellRootSwitch.setContentDescription("Shell 使用 Root 权限"); } catch(eRootDesc) {}
    shellRootRow.setOnClickListener(new android.view.View.OnClickListener({ onClick: function() {
      try { shellRootSwitch.setChecked(!shellRootSwitch.isChecked()); self.touchActivity(); } catch(eRootToggle) {}
    }}));
    shellRootRow.addView(shellRootSwitch);
    shellWrap.addView(shellRootRow);
    dynamicContainer.addView(shellWrap);''',
    "root switch UI",
)

replace_once(
    editor,
    '''                else { inputShell.setError(null); newBtn.cmd = c; newBtn.cmd_b64 = encodeBase64Utf8(c); newBtn.root = true; }''',
    '''                else { inputShell.setError(null); newBtn.cmd = c; newBtn.cmd_b64 = encodeBase64Utf8(c); newBtn.root = !!shellRootSwitch.isChecked(); }''',
    "root switch save",
)

print("Shell secure defaults applied")
