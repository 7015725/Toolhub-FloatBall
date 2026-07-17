#!/usr/bin/env python3
# 一次性补丁：将拾字百度/有道翻译凭据接入 ToolHub 设置页与结构化 SQLite。

from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "code" / "th_01_base.js"
PANEL_UI = ROOT / "code" / "th_13_panel_ui.js"
PANELS = ROOT / "code" / "th_14_panels.js"
PICKWORD = ROOT / "code" / "th_20_pickword.js"
VERIFY_WORKFLOW = ROOT / ".github" / "workflows" / "verify.yml"
VERIFY_SCRIPT = ROOT / "scripts" / "verify_pickword_translate_settings.py"
RECORD = ROOT / "updates" / "records" / "feature-pickword-translate-settings.json"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("%s: expected one match, found %d" % (label, count))
    return text.replace(old, new, 1)


def sub_once(text, pattern, replacement, label, flags=0):
    out, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit("%s: expected one regex match, found %d" % (label, count))
    return out


base = BASE.read_text(encoding="utf-8")
panel_ui = PANEL_UI.read_text(encoding="utf-8")
panels = PANELS.read_text(encoding="utf-8")
pickword = PICKWORD.read_text(encoding="utf-8")
verify_workflow = VERIFY_WORKFLOW.read_text(encoding="utf-8")

# ---------------------------------------------------------------------------
# th_01_base.js：配置校验、默认值、Schema 与旧 Schema 自动刷新。
# ---------------------------------------------------------------------------
base = replace_once(base, "// @version 1.1.16", "// @version 1.1.17", "base version")
base = replace_once(
    base,
    '    CONTENT_MAX_ROWS: { type: "int", min: 5, max: 100, default: 20 },\n',
    '    CONTENT_MAX_ROWS: { type: "int", min: 5, max: 100, default: 20 },\n\n'
    '    // 拾字翻译配置（通过 ToolHub 设置页保存到结构化 SQLite）\n'
    '    PICKWORD_TRANSLATE_ENGINE: { type: "enum", values: ["baidu", "youdao"], default: "baidu" },\n'
    '    PICKWORD_BAIDU_APP_ID: { type: "string", default: "" },\n'
    '    PICKWORD_BAIDU_APP_SECRET: { type: "string", default: "" },\n'
    '    PICKWORD_YOUDAO_APP_KEY: { type: "string", default: "" },\n'
    '    PICKWORD_YOUDAO_APP_SECRET: { type: "string", default: "" },\n',
    "translate validators",
)
base = replace_once(
    base,
    '        POINTER_AREA_MIN_MOVE_DP: 24,\n        PANEL_WIDTH_PERCENT: 90,',
    '        POINTER_AREA_MIN_MOVE_DP: 24,\n'
    '        PICKWORD_TRANSLATE_ENGINE: "baidu",\n'
    '        PICKWORD_BAIDU_APP_ID: "",\n'
    '        PICKWORD_BAIDU_APP_SECRET: "",\n'
    '        PICKWORD_YOUDAO_APP_KEY: "",\n'
    '        PICKWORD_YOUDAO_APP_SECRET: "",\n'
    '        PANEL_WIDTH_PERCENT: 90,',
    "translate defaults",
)
base = replace_once(
    base,
    '        { type: "section", name: "面板布局" },',
    '        { type: "section", name: "拾字" },\n'
    '        { key: "PICKWORD_TRANSLATE_ENGINE", name: "翻译配置", type: "pickword_translate_settings" },\n'
    '        { key: "PICKWORD_BAIDU_APP_ID", name: "百度 APPID", type: "hidden" },\n'
    '        { key: "PICKWORD_BAIDU_APP_SECRET", name: "百度密钥", type: "hidden" },\n'
    '        { key: "PICKWORD_YOUDAO_APP_KEY", name: "有道 AppKey", type: "hidden" },\n'
    '        { key: "PICKWORD_YOUDAO_APP_SECRET", name: "有道应用密钥", type: "hidden" },\n\n'
    '        { type: "section", name: "面板布局" },',
    "translate schema",
)
base = replace_once(
    base,
    '            sStr.indexOf("POINTER_AREA_MIN_MOVE_DP") < 0\n',
    '            sStr.indexOf("POINTER_AREA_MIN_MOVE_DP") < 0 ||\n'
    '            sStr.indexOf("PICKWORD_TRANSLATE_ENGINE") < 0 ||\n'
    '            sStr.indexOf("PICKWORD_BAIDU_APP_ID") < 0 ||\n'
    '            sStr.indexOf("PICKWORD_BAIDU_APP_SECRET") < 0 ||\n'
    '            sStr.indexOf("PICKWORD_YOUDAO_APP_KEY") < 0 ||\n'
    '            sStr.indexOf("PICKWORD_YOUDAO_APP_SECRET") < 0 ||\n'
    '            sStr.indexOf("pickword_translate_settings") < 0\n',
    "translate schema completeness",
)
base = replace_once(
    base,
    '                schemaItemDiffers("POINTER_FRAME_AREA_HEX", ["name", "desc", "type"])) {',
    '                schemaItemDiffers("POINTER_FRAME_AREA_HEX", ["name", "desc", "type"]) ||\n'
    '                schemaItemDiffers("PICKWORD_TRANSLATE_ENGINE", ["name", "type"]) ||\n'
    '                schemaItemDiffers("PICKWORD_BAIDU_APP_ID", ["name", "type"]) ||\n'
    '                schemaItemDiffers("PICKWORD_BAIDU_APP_SECRET", ["name", "type"]) ||\n'
    '                schemaItemDiffers("PICKWORD_YOUDAO_APP_KEY", ["name", "type"]) ||\n'
    '                schemaItemDiffers("PICKWORD_YOUDAO_APP_SECRET", ["name", "type"])) {',
    "translate schema difference checks",
)

# ---------------------------------------------------------------------------
# th_14_panels.js：新增“拾字”设置分类。
# ---------------------------------------------------------------------------
panels = replace_once(panels, "// @version 1.1.8", "// @version 1.1.9", "panels version")
panels = replace_once(
    panels,
    '    { key: "pointer", title: "指针", desc: "大小、贴边、悬停、取字保护、OCR 阈值和颜色", sections: ["指针"] },\n',
    '    { key: "pointer", title: "指针", desc: "大小、贴边、悬停、取字保护、OCR 阈值和颜色", sections: ["指针"] },\n'
    '    { key: "pickword", title: "拾字", desc: "百度与有道翻译引擎、应用 ID 和密钥", sections: ["拾字"] },\n',
    "pickword settings group",
)
panels = replace_once(
    panels,
    '  if (t.indexOf("面板") >= 0) return "⌂";\n',
    '  if (t.indexOf("面板") >= 0) return "⌂";\n'
    '  if (t.indexOf("拾字") >= 0 || t.indexOf("翻译") >= 0) return "文";\n',
    "pickword settings icon",
)

# ---------------------------------------------------------------------------
# th_13_panel_ui.js：专用单选、条件显示、密码遮罩和测试按钮。
# ---------------------------------------------------------------------------
panel_ui = replace_once(panel_ui, "// @version 1.0.11", "// @version 1.0.12", "panel ui version")
translate_ui_helpers = r'''
// =======================【设置项：拾字翻译配置】=======================
FloatBallAppWM.prototype.createPickwordTranslateSettingsView = function(item, parent, needDivider) {
  var self = this;
  var isDark = this.isDarkTheme ? !!this.isDarkTheme() : false;
  var C = this.ui.colors;
  var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
  var textColor = T ? T.onSurface : (isDark ? C.textPriDark : C.textPriLight);
  var secColor = T ? T.onSurface2 : (isDark ? C.textSecDark : C.textSecLight);
  var dividerColor = T ? T.outlineVariant : (isDark ? C.dividerDark : C.dividerLight);
  var primary = T ? T.primary : C.primary;
  var onPrimary = T && T.onPrimary ? T.onPrimary : android.graphics.Color.WHITE;
  var inputBgColor = T ? T.surface2 : (isDark ? C.inputBgDark : C.inputBgLight);

  if (needDivider) {
    var divider = new android.view.View(context);
    var dividerLp = new android.widget.LinearLayout.LayoutParams(-1, 1);
    dividerLp.setMargins(this.dp(14), 0, this.dp(14), 0);
    divider.setLayoutParams(dividerLp);
    toolhubSafeSetBackgroundColor(divider, this.withAlpha ? this.withAlpha(dividerColor, isDark ? 0.36 : 0.28) : dividerColor);
    parent.addView(divider);
  }

  var root = new android.widget.LinearLayout(context);
  root.setOrientation(android.widget.LinearLayout.VERTICAL);
  root.setPadding(this.dp(14), this.dp(12), this.dp(14), this.dp(14));
  try { root.setMinimumHeight(this.dp(52)); } catch(eMin) {}

  var title = new android.widget.TextView(context);
  title.setText("翻译配置");
  toolhubSafeSetTextColor(title, textColor);
  title.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 16);
  title.setTypeface(null, android.graphics.Typeface.BOLD);
  root.addView(title);

  var desc = new android.widget.TextView(context);
  desc.setText("选择翻译引擎后，仅显示对应凭据；两套凭据会分别保存在 ToolHub SQLite 中。");
  toolhubSafeSetTextColor(desc, secColor);
  desc.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
  desc.setPadding(0, self.dp(3), 0, self.dp(8));
  root.addView(desc);

  var engineTitle = new android.widget.TextView(context);
  engineTitle.setText("翻译引擎");
  toolhubSafeSetTextColor(engineTitle, textColor);
  engineTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
  engineTitle.setTypeface(null, android.graphics.Typeface.BOLD);
  root.addView(engineTitle);

  var radioGroup = new android.widget.RadioGroup(context);
  radioGroup.setOrientation(android.widget.LinearLayout.HORIZONTAL);
  radioGroup.setGravity(android.view.Gravity.CENTER_VERTICAL);
  var radioLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
  radioLp.setMargins(0, self.dp(4), 0, self.dp(8));
  radioGroup.setLayoutParams(radioLp);

  function buildEngineRadio(label, idValue) {
    var rb = new android.widget.RadioButton(context);
    rb.setId(idValue);
    rb.setText(label);
    toolhubSafeSetTextColor(rb, textColor);
    rb.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    try {
      var states = [[android.R.attr.state_checked], [-android.R.attr.state_checked]];
      toolhubSafeApplyColorStateList(rb, "setButtonTintList", toolhubSafeColorStateListFromStates(states, [primary, secColor]));
    } catch(eTint) {}
    try { rb.setMinHeight(self.dp(44)); rb.setMinimumHeight(self.dp(44)); rb.setIncludeFontPadding(false); } catch(eSize) {}
    radioGroup.addView(rb, new android.widget.RadioGroup.LayoutParams(0, self.dp(44), 1));
    return rb;
  }

  var baiduId = 210701;
  var youdaoId = 210702;
  try {
    if (android.view.View.generateViewId) {
      baiduId = android.view.View.generateViewId();
      youdaoId = android.view.View.generateViewId();
    }
  } catch(eIds) {}
  var baiduRadio = buildEngineRadio("百度翻译", baiduId);
  var youdaoRadio = buildEngineRadio("有道翻译", youdaoId);
  root.addView(radioGroup);

  var credentialHost = new android.widget.LinearLayout(context);
  credentialHost.setOrientation(android.widget.LinearLayout.VERTICAL);
  credentialHost.setPadding(0, self.dp(2), 0, 0);
  root.addView(credentialHost, new android.widget.LinearLayout.LayoutParams(-1, -2));

  function createCredentialContainer(providerTitle, providerDesc) {
    var box = new android.widget.LinearLayout(context);
    box.setOrientation(android.widget.LinearLayout.VERTICAL);
    box.setPadding(self.dp(12), self.dp(10), self.dp(12), self.dp(12));
    try {
      box.setBackground(self.ui.createStrokeDrawable(
        inputBgColor,
        self.withAlpha(dividerColor, isDark ? 0.50 : 0.34),
        self.dp(1),
        self.dp(14)
      ));
    } catch(eBg) {}
    var h = new android.widget.TextView(context);
    h.setText(providerTitle);
    toolhubSafeSetTextColor(h, textColor);
    h.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    h.setTypeface(null, android.graphics.Typeface.BOLD);
    box.addView(h);
    var d = new android.widget.TextView(context);
    d.setText(providerDesc);
    toolhubSafeSetTextColor(d, secColor);
    d.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
    d.setPadding(0, self.dp(2), 0, self.dp(6));
    box.addView(d);
    return box;
  }

  function createCredentialField(box, labelText, key, secret, hintText) {
    var field = new android.widget.LinearLayout(context);
    field.setOrientation(android.widget.LinearLayout.VERTICAL);
    var fieldLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
    fieldLp.setMargins(0, self.dp(6), 0, 0);
    field.setLayoutParams(fieldLp);

    var label = new android.widget.TextView(context);
    label.setText(labelText);
    toolhubSafeSetTextColor(label, textColor);
    label.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 13);
    field.addView(label);

    var inputRow = new android.widget.LinearLayout(context);
    inputRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    inputRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
    var inputRowLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
    inputRowLp.setMargins(0, self.dp(5), 0, 0);
    inputRow.setLayoutParams(inputRowLp);

    var edit = new android.widget.EditText(context);
    var current = self.getPendingValue(key);
    if (current === undefined || current === null) current = "";
    edit.setText(String(current));
    edit.setHint(String(hintText || ""));
    toolhubSafeSetTextColor(edit, textColor);
    toolhubSafeSetHintTextColor(edit, secColor);
    edit.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
    edit.setSingleLine(true);
    edit.setPadding(self.dp(12), self.dp(8), self.dp(12), self.dp(8));
    edit.setBackground(self.ui.createStrokeDrawable(
      T ? T.surface : inputBgColor,
      self.withAlpha(dividerColor, isDark ? 0.52 : 0.36),
      self.dp(1),
      self.dp(12)
    ));
    try {
      edit.setInputType(android.text.InputType.TYPE_CLASS_TEXT | (secret ? android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD : android.text.InputType.TYPE_TEXT_VARIATION_NORMAL));
      if (secret) edit.setTransformationMethod(android.text.method.PasswordTransformationMethod.getInstance());
    } catch(eInputType) {}
    edit.addTextChangedListener(new android.text.TextWatcher({
      beforeTextChanged: function(s, start, count, after) {},
      onTextChanged: function(s, start, before, count) {},
      afterTextChanged: function(s) {
        try {
          self.touchActivity();
          self.setPendingValue(key, String(s));
        } catch(eText) { safeLog(null, "e", "pickword translate setting update failed key=" + String(key)); }
      }
    }));
    edit.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
      try {
        v.requestFocus();
        var imm = context.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
        imm.showSoftInput(v, 0);
      } catch(eKeyboard) {}
    }}));
    inputRow.addView(edit, new android.widget.LinearLayout.LayoutParams(0, -2, 1));

    if (secret) {
      var visible = false;
      var toggle = new android.widget.TextView(context);
      toggle.setText("显示");
      toggle.setGravity(android.view.Gravity.CENTER);
      toggle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 12);
      toggle.setTypeface(null, android.graphics.Typeface.BOLD);
      toolhubSafeSetTextColor(toggle, primary);
      toggle.setPadding(self.dp(10), self.dp(8), self.dp(10), self.dp(8));
      toggle.setBackground(self.ui.createTransparentPressedStateDrawable(self.withAlpha(primary, isDark ? 0.18 : 0.10), self.dp(12)));
      toggle.setOnClickListener(new android.view.View.OnClickListener({ onClick: function(v) {
        try {
          self.touchActivity();
          visible = !visible;
          if (visible) edit.setTransformationMethod(null);
          else edit.setTransformationMethod(android.text.method.PasswordTransformationMethod.getInstance());
          toggle.setText(visible ? "隐藏" : "显示");
          edit.setSelection(edit.getText().length());
        } catch(eToggle) {}
      }}));
      var toggleLp = new android.widget.LinearLayout.LayoutParams(self.dp(56), self.dp(44));
      toggleLp.setMargins(self.dp(6), 0, 0, 0);
      inputRow.addView(toggle, toggleLp);
    }

    field.addView(inputRow);
    box.addView(field);
    return edit;
  }

  var baiduBox = createCredentialContainer("百度翻译", "填写百度翻译开放平台的 APPID 与密钥。");
  createCredentialField(baiduBox, "百度 APPID", "PICKWORD_BAIDU_APP_ID", false, "输入 APPID");
  createCredentialField(baiduBox, "百度密钥", "PICKWORD_BAIDU_APP_SECRET", true, "输入密钥");
  credentialHost.addView(baiduBox, new android.widget.LinearLayout.LayoutParams(-1, -2));

  var youdaoBox = createCredentialContainer("有道翻译", "填写有道智云文本翻译服务的 AppKey 与应用密钥。");
  createCredentialField(youdaoBox, "有道 AppKey", "PICKWORD_YOUDAO_APP_KEY", false, "输入 AppKey");
  createCredentialField(youdaoBox, "有道应用密钥", "PICKWORD_YOUDAO_APP_SECRET", true, "输入应用密钥");
  var youdaoLp = new android.widget.LinearLayout.LayoutParams(-1, -2);
  credentialHost.addView(youdaoBox, youdaoLp);

  function refreshProviderVisibility(engineValue) {
    var engine = String(engineValue || "baidu") === "youdao" ? "youdao" : "baidu";
    baiduBox.setVisibility(engine === "baidu" ? android.view.View.VISIBLE : android.view.View.GONE);
    youdaoBox.setVisibility(engine === "youdao" ? android.view.View.VISIBLE : android.view.View.GONE);
  }

  var currentEngine = String(self.getPendingValue("PICKWORD_TRANSLATE_ENGINE") || "baidu");
  if (currentEngine !== "youdao") currentEngine = "baidu";
  baiduRadio.setChecked(currentEngine === "baidu");
  youdaoRadio.setChecked(currentEngine === "youdao");
  refreshProviderVisibility(currentEngine);

  radioGroup.setOnCheckedChangeListener(new android.widget.RadioGroup.OnCheckedChangeListener({
    onCheckedChanged: function(group, checkedId) {
      try {
        var nextEngine = checkedId === youdaoId ? "youdao" : "baidu";
        self.touchActivity();
        self.setPendingValue("PICKWORD_TRANSLATE_ENGINE", nextEngine);
        refreshProviderVisibility(nextEngine);
      } catch(eEngine) { safeLog(null, "e", "pickword translate engine switch failed"); }
    }
  }));

  var testing = false;
  var testButton = null;
  function finishTesting() {
    try {
      testing = false;
      if (testButton) {
        testButton.setEnabled(true);
        testButton.setAlpha(1.0);
        testButton.setText("测试翻译配置");
      }
    } catch(eFinish) {}
  }
  testButton = self.ui.createSolidButton(self, "测试翻译配置", primary, onPrimary, function() {
    if (testing) return;
    testing = true;
    try {
      testButton.setEnabled(false);
      testButton.setAlpha(0.65);
      testButton.setText("正在测试…");
    } catch(eBusy) {}
    var snapshot = {
      PICKWORD_TRANSLATE_ENGINE: String(self.getPendingValue("PICKWORD_TRANSLATE_ENGINE") || "baidu"),
      PICKWORD_BAIDU_APP_ID: String(self.getPendingValue("PICKWORD_BAIDU_APP_ID") || ""),
      PICKWORD_BAIDU_APP_SECRET: String(self.getPendingValue("PICKWORD_BAIDU_APP_SECRET") || ""),
      PICKWORD_YOUDAO_APP_KEY: String(self.getPendingValue("PICKWORD_YOUDAO_APP_KEY") || ""),
      PICKWORD_YOUDAO_APP_SECRET: String(self.getPendingValue("PICKWORD_YOUDAO_APP_SECRET") || "")
    };
    if (typeof self.testPickwordTranslateConfiguration !== "function") {
      if (self.setInlineNotice) self.setInlineNotice("翻译配置测试功能未加载", "error");
      finishTesting();
      return;
    }
    try {
      self.testPickwordTranslateConfiguration(snapshot, function() { finishTesting(); });
    } catch(eTest) {
      if (self.setInlineNotice) self.setInlineNotice("翻译配置测试启动失败", "error");
      finishTesting();
    }
  });
  var testLp = new android.widget.LinearLayout.LayoutParams(-1, self.dp(48));
  testLp.setMargins(0, self.dp(12), 0, 0);
  root.addView(testButton, testLp);

  parent.addView(root, new android.widget.LinearLayout.LayoutParams(-1, -2));
};

'''
panel_ui = replace_once(
    panel_ui,
    'FloatBallAppWM.prototype.createSettingItemView = function(item, parent, needDivider) {\n',
    translate_ui_helpers +
    'FloatBallAppWM.prototype.createSettingItemView = function(item, parent, needDivider) {\n'
    '  if (!item || String(item.type || "") === "hidden") return;\n'
    '  if (String(item.type || "") === "pickword_translate_settings") {\n'
    '    this.createPickwordTranslateSettingsView(item, parent, needDivider);\n'
    '    return;\n'
    '  }\n',
    "translate setting custom view hook",
)

# ---------------------------------------------------------------------------
# th_20_pickword.js：停止读取旧局部变量，按运行时配置快照翻译并暴露测试入口。
# ---------------------------------------------------------------------------
pickword = replace_once(pickword, "// @version 1.0.9", "// @version 1.0.10", "pickword version")
pickword = replace_once(
    pickword,
    '        // 翻译引擎选择：1 = 百度翻译，2 = 有道翻译。\n'
    '        // 也可在 ShortX 局部变量「翻译引擎」里填 1 或 2 覆盖这里。\n'
    '        TRANSLATE_API: typeof localVarOf$翻译引擎 !== \'undefined\' ? localVarOf$翻译引擎 : 1,\n\n',
    '',
    "remove legacy translate engine local variable",
)
translate_config_block = r'''    // 翻译 API 统一鉴权配置读取\n    var API_APP_ID = .*?\n    var API_APP_SECRET = .*?\n    var BD_API_URL = "https://fanyi-api.baidu.com/api/trans/vip/translate";\n    var YD_API_URL = "https://openapi.youdao.com/api";'''
translate_config_replacement = '''    // 翻译 API 配置只读取 ToolHub 设置；不再读取 ShortX 旧局部变量。
    var BD_API_URL = "https://fanyi-api.baidu.com/api/trans/vip/translate";
    var YD_API_URL = "https://openapi.youdao.com/api";

    function normalizePickwordTranslateEngine20(value) {
        return String(value || "baidu") === "youdao" ? "youdao" : "baidu";
    }

    function trimPickwordTranslateValue20(value) {
        try { return String(value == null ? "" : value).replace(/^\\s+|\\s+$/g, ""); } catch (e) { return ""; }
    }

    function getPickwordTranslateConfig20(appObj, overrideConfig) {
        var cfg = null;
        try {
            if (overrideConfig && typeof overrideConfig === "object") cfg = overrideConfig;
            else if (appObj && appObj.config) cfg = appObj.config;
        } catch (eCfg) { cfg = null; }
        if (!cfg) cfg = {};
        var engine = normalizePickwordTranslateEngine20(cfg.PICKWORD_TRANSLATE_ENGINE);
        var appId = engine === "youdao"
            ? trimPickwordTranslateValue20(cfg.PICKWORD_YOUDAO_APP_KEY)
            : trimPickwordTranslateValue20(cfg.PICKWORD_BAIDU_APP_ID);
        var secret = engine === "youdao"
            ? trimPickwordTranslateValue20(cfg.PICKWORD_YOUDAO_APP_SECRET)
            : trimPickwordTranslateValue20(cfg.PICKWORD_BAIDU_APP_SECRET);
        return {
            engine: engine,
            label: engine === "youdao" ? "有道翻译" : "百度翻译",
            appId: appId,
            secret: secret
        };
    }'''
pickword = sub_once(pickword, translate_config_block, translate_config_replacement, "runtime translate config", re.S)
pickword = sub_once(
    pickword,
    r'''    function buildBaiduParams\(q, fromLang, toLang\) \{.*?\n    \}\n\n    function buildYoudaoParams\(q, fromLang, toLang\) \{.*?\n    \}''',
    '''    function buildBaiduParams(auth, q, fromLang, toLang) {
        var salt = java.util.UUID.randomUUID().toString();
        var signStr = auth.appId + q + salt + auth.secret;
        var sign = md5(signStr);
        return { q: q, from: fromLang, to: toLang, appid: auth.appId, salt: salt, sign: sign };
    }

    function buildYoudaoParams(auth, q, fromLang, toLang) {
        var salt = java.util.UUID.randomUUID().toString();
        var curtime = String(Math.floor(Date.now() / 1000));
        var input = getYoudaoInput(q);
        var signStr = auth.appId + input + salt + curtime + auth.secret;
        var sign = sha256(signStr);
        return {
            q: q, from: fromLang, to: toLang, appKey: auth.appId,
            salt: salt, sign: sign, signType: "v3", curtime: curtime
        };
    }''',
    "translate signed params",
    re.S,
)
translate_sync_pattern = r'''        translateTextSync: function\(text\) \{.*?\n        \},\n\n        translateTextSyncWithRetry: function\(text\) \{.*?\n        \},\n\n        ensureKeepAlive:'''
translate_sync_replacement = '''        translateTextSync: function(text, authConfig) {
            var auth = authConfig || getPickwordTranslateConfig20(toolhubAppRef, null);
            if (!auth || !auth.appId || !auth.secret) {
                throw this.createTranslateError("CONFIG", "请先在 ToolHub 设置页配置" + (auth && auth.label ? auth.label : "翻译接口"));
            }
            var isCh = this.isChinese(String(text || ""));
            var source = "auto";
            var target = "";
            var params = null;
            var reqUrl = "";
            if (auth.engine === "youdao") {
                target = isCh ? "en" : "zh-CHS";
                params = buildYoudaoParams(auth, text, source, target);
                reqUrl = YD_API_URL;
            } else {
                target = isCh ? "en" : "zh";
                params = buildBaiduParams(auth, text, source, target);
                reqUrl = BD_API_URL;
            }

            var conn = null;
            var os = null;
            var reader = null;
            try {
                var formBody = urlEncodeForm(params);
                var url = new java.net.URL(reqUrl);
                conn = url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
                conn.setDoOutput(true);
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(30000);

                os = conn.getOutputStream();
                os.write(new java.lang.String(formBody).getBytes("UTF-8"));
                os.flush();
                os.close();
                os = null;

                var responseCode = conn.getResponseCode();
                var inputStream = responseCode === 200 ? conn.getInputStream() : conn.getErrorStream();
                reader = new java.io.BufferedReader(new java.io.InputStreamReader(inputStream, "UTF-8"));
                var line;
                var response = "";
                while ((line = reader.readLine()) != null) response += line;
                reader.close();
                reader = null;
                if (responseCode !== 200) throw this.createTranslateError("HTTP", "HTTP " + responseCode);

                var json = JSON.parse(response);
                var translatedText = "";
                if (auth.engine === "youdao") {
                    if (json.errorCode && String(json.errorCode) !== "0") throw this.createTranslateError(json.errorCode, "错误码 " + json.errorCode);
                    if (json.translation && json.translation.length > 0) translatedText = json.translation[0];
                } else {
                    if (json.error_code !== undefined && Number(json.error_code) !== 0) throw this.createTranslateError(json.error_code, "错误码 " + json.error_code);
                    if (json.trans_result && json.trans_result.length > 0) {
                        var parts = [];
                        for (var ti = 0; ti < json.trans_result.length; ti++) parts.push(json.trans_result[ti].dst);
                        translatedText = parts.join("\\n");
                    }
                }
                if (!translatedText) throw this.createTranslateError("EMPTY", "无效响应");
                return String(translatedText);
            } finally {
                try { if (reader) reader.close(); } catch (eReader) {}
                try { if (os) os.close(); } catch (eOutput) {}
                try { if (conn && conn.disconnect) conn.disconnect(); } catch (eDisconnect) {}
            }
        },

        translateTextSyncWithRetry: function(text, authConfig) {
            var auth = authConfig || getPickwordTranslateConfig20(toolhubAppRef, null);
            var retryDelays = [1200, 2500, 5000];
            var lastError = null;
            for (var attempt = 0; attempt <= retryDelays.length; attempt++) {
                try {
                    return this.translateTextSync(text, auth);
                } catch (e) {
                    lastError = e;
                    var code = e && e.code ? String(e.code) : "";
                    if (code !== "54003" || attempt >= retryDelays.length) throw e;
                    java.lang.Thread.sleep(retryDelays[attempt]);
                }
            }
            throw lastError;
        },

        ensureKeepAlive:'''
pickword = sub_once(pickword, translate_sync_pattern, translate_sync_replacement, "translate request implementation", re.S)

# 在实际翻译入口中创建一次凭据快照，并传给所有重试请求。
do_match = re.search(r'''(?P<head>        doTranslate:\s*function\(\)\s*\{)(?P<body>.*?)(?P<tail>\n        \},\n)''', pickword, re.S)
if not do_match:
    raise SystemExit("doTranslate function not found")
do_body = do_match.group("body")
old_config_check = re.compile(r'''\n            if \(!API_APP_ID \|\| !API_APP_SECRET\) \{\n.*?\n            \}''', re.S)
replacement_check = '''
            var translateAuth = getPickwordTranslateConfig20(toolhubAppRef, null);
            if (!translateAuth.appId || !translateAuth.secret) {
                showToast("请先在 ToolHub 设置页配置" + translateAuth.label);
                return;
            }'''
do_body, config_count = old_config_check.subn(replacement_check, do_body, count=1)
if config_count != 1:
    raise SystemExit("doTranslate legacy config check count=" + str(config_count))
do_body, call_count = re.subn(
    r'''(\b(?:self|this)\.translateTextSyncWithRetry\()([^,\n\)]+)(\))''',
    r'''\1\2, translateAuth\3''',
    do_body,
)
if call_count < 1:
    raise SystemExit("doTranslate translateTextSyncWithRetry call not found")
pickword = pickword[:do_match.start()] + do_match.group("head") + do_body + do_match.group("tail") + pickword[do_match.end():]

# 设置页测试入口：固定文本、自动检测方向、ToolHub 自动提醒。
test_method = r'''

            proto.testPickwordTranslateConfiguration = function(configSnapshot, callback) {
                var self = this;
                var auth = getPickwordTranslateConfig20(this, configSnapshot || {});
                var testText = "ToolHub 翻译测试";
                var done = typeof callback === "function" ? callback : null;
                if (!auth.appId || !auth.secret) {
                    try { if (this.setInlineNotice) this.setInlineNotice("翻译配置不可用\n" + auth.label + " · 请填写应用 ID 和密钥", "error"); } catch(eNotice0) {}
                    if (done) done({ ok: false, code: "CONFIG" });
                    return false;
                }
                try { if (this.setInlineNotice) this.setInlineNotice("正在测试" + auth.label + "…", "info"); } catch(eStartNotice) {}
                var worker = new java.lang.Thread(new java.lang.Runnable({
                    run: function() {
                        var result = { ok: false, engine: auth.engine, label: auth.label, text: "", code: "", error: "" };
                        try {
                            result.text = String(拾字Floaty.translateTextSync(testText, auth) || "");
                            result.ok = result.text.length > 0;
                            if (!result.ok) result.error = "返回结果为空";
                        } catch(eTest) {
                            result.code = eTest && eTest.code ? String(eTest.code) : "";
                            result.error = 拾字Floaty.getTranslateErrorMessage(eTest);
                        }
                        mainHandler.post(new java.lang.Runnable({
                            run: function() {
                                try {
                                    if (result.ok) {
                                        var displayText = result.text.length > 80 ? result.text.substring(0, 80) + "…" : result.text;
                                        if (self.setInlineNotice) self.setInlineNotice("翻译配置可用\n" + result.label + " · " + displayText, "ok");
                                    } else {
                                        var errorText = result.error || (result.code ? ("错误码 " + result.code) : "请求失败，请检查应用 ID、密钥和网络");
                                        if (self.setInlineNotice) self.setInlineNotice("翻译配置不可用\n" + result.label + " · " + errorText, "error");
                                    }
                                } catch(eNotice) {}
                                try { if (done) done(result); } catch(eDone) {}
                            }
                        }));
                    }
                }), "ToolHub-Pickword-Translate-Test");
                worker.start();
                return true;
            };
'''
pickword = replace_once(
    pickword,
    '            proto.onPickwordConfigurationChanged = function() {',
    test_method + '\n            proto.onPickwordConfigurationChanged = function() {',
    "translate test prototype method",
)

legacy_markers = [
    "localVarOf$翻译引擎",
    "localVarOf$应用ID",
    "localVarOf$应用秘钥",
    "API_APP_ID",
    "API_APP_SECRET",
    "DIY_CONFIG.TRANSLATE_API",
]
for marker in legacy_markers:
    if marker in pickword:
        raise SystemExit("legacy translate marker remains: " + marker)

# ---------------------------------------------------------------------------
# 永久专项校验与验证工作流挂接。
# ---------------------------------------------------------------------------
verify_script = r'''#!/usr/bin/env python3
"""Verify pickword translation settings, SQLite persistence, secret masking and runtime auth boundaries."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
BASE = (ROOT / "code" / "th_01_base.js").read_text(encoding="utf-8")
STORE = (ROOT / "code" / "th_02_core.js").read_text(encoding="utf-8")
UI = (ROOT / "code" / "th_13_panel_ui.js").read_text(encoding="utf-8")
PANELS = (ROOT / "code" / "th_14_panels.js").read_text(encoding="utf-8")
PICKWORD = (ROOT / "code" / "th_20_pickword.js").read_text(encoding="utf-8")

KEYS = [
    "PICKWORD_TRANSLATE_ENGINE",
    "PICKWORD_BAIDU_APP_ID",
    "PICKWORD_BAIDU_APP_SECRET",
    "PICKWORD_YOUDAO_APP_KEY",
    "PICKWORD_YOUDAO_APP_SECRET",
]


def main():
    errors = []
    for key in KEYS:
        if BASE.count(key) < 3:
            errors.append("config/schema key missing or incomplete: " + key)
    required_base = [
        'PICKWORD_TRANSLATE_ENGINE: { type: "enum", values: ["baidu", "youdao"], default: "baidu" }',
        'type: "pickword_translate_settings"',
        'type: "hidden"',
        'PICKWORD_TRANSLATE_ENGINE: "baidu"',
    ]
    for marker in required_base:
        if marker not in BASE:
            errors.append("base marker missing: " + marker)
    required_store = [
        "CREATE TABLE IF NOT EXISTS toolhub_settings",
        "INSERT INTO toolhub_settings(setting_key,value_type,value_integer,value_real,value_text,updated_at)",
        "for (var k in settings)",
    ]
    for marker in required_store:
        if marker not in STORE:
            errors.append("SQLite storage marker missing: " + marker)
    required_ui = [
        "createPickwordTranslateSettingsView",
        "new android.widget.RadioGroup",
        'setPendingValue("PICKWORD_TRANSLATE_ENGINE", nextEngine)',
        "baiduBox.setVisibility",
        "youdaoBox.setVisibility",
        "PasswordTransformationMethod.getInstance()",
        'toggle.setText(visible ? "隐藏" : "显示")',
        'PICKWORD_BAIDU_APP_SECRET',
        'PICKWORD_YOUDAO_APP_SECRET',
        'testPickwordTranslateConfiguration(snapshot',
        'testButton.setText("正在测试…")',
    ]
    for marker in required_ui:
        if marker not in UI:
            errors.append("settings UI marker missing: " + marker)
    if '{ key: "pickword", title: "拾字"' not in PANELS:
        errors.append("pickword settings group missing")
    required_runtime = [
        "getPickwordTranslateConfig20",
        'engine === "youdao"',
        "translateTextSync: function(text, authConfig)",
        "translateTextSyncWithRetry: function(text, authConfig)",
        "translateAuth",
        "testPickwordTranslateConfiguration",
        'var testText = "ToolHub 翻译测试"',
        "setInlineNotice",
        '"ok"',
        '"error"',
    ]
    for marker in required_runtime:
        if marker not in PICKWORD:
            errors.append("runtime marker missing: " + marker)
    forbidden = [
        "localVarOf$翻译引擎",
        "localVarOf$应用ID",
        "localVarOf$应用秘钥",
        "API_APP_ID",
        "API_APP_SECRET",
        "DIY_CONFIG.TRANSLATE_API",
    ]
    for marker in forbidden:
        if marker in PICKWORD:
            errors.append("legacy translate marker remains: " + marker)
    secret_log_patterns = [
        r"safeLog\([^\n]*(PICKWORD_BAIDU_APP_SECRET|PICKWORD_YOUDAO_APP_SECRET)",
        r"setInlineNotice\([^\n]*(\.secret|APP_SECRET)",
        r"showToast\([^\n]*(\.secret|APP_SECRET)",
    ]
    combined = UI + "\n" + PICKWORD
    for pattern in secret_log_patterns:
        if re.search(pattern, combined):
            errors.append("secret exposure pattern found: " + pattern)
    if errors:
        for error in errors:
            print("FAIL: " + error)
        return 1
    print("OK pickword_translate_settings keys=5 engines=2 sqlite=structured secrets=masked legacy_locals=0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
'''
VERIFY_SCRIPT.write_text(verify_script, encoding="utf-8")
verify_workflow = replace_once(
    verify_workflow,
    '            python3 scripts/verify_schema_validator.py\n',
    '            python3 scripts/verify_schema_validator.py\n'
    '            python3 scripts/verify_pickword_translate_settings.py\n',
    "verify workflow translate test",
)

# ---------------------------------------------------------------------------
# 写入文件与待签名更新记录。
# ---------------------------------------------------------------------------
BASE.write_text(base, encoding="utf-8")
PANEL_UI.write_text(panel_ui, encoding="utf-8")
PANELS.write_text(panels, encoding="utf-8")
PICKWORD.write_text(pickword, encoding="utf-8")
VERIFY_WORKFLOW.write_text(verify_workflow, encoding="utf-8")

record = {
    "schema": 1,
    "id": "feature-pickword-translate-settings",
    "type": "feature",
    "title": "新增拾字翻译引擎与凭据设置",
    "details": [
        "设置页新增拾字分类，使用单选框切换百度翻译与有道翻译，并只显示当前引擎对应的配置字段",
        "百度APPID/密钥与有道AppKey/应用密钥分别作为独立配置键写入ToolHub结构化SQLite",
        "密钥输入默认遮罩并提供显示/隐藏按钮，切换引擎不会清空另一平台已输入或已保存的凭据",
        "测试翻译配置使用当前未保存输入，固定测试文本为ToolHub翻译测试，并通过ToolHub自动提醒返回结果",
        "拾字运行时每次翻译读取已保存配置快照，停止读取ShortX旧翻译引擎、应用ID和应用秘钥局部变量",
        "保存后无需重启ToolHub即可生效，日志和提醒不输出完整ID、密钥、签名或请求参数"
    ],
    "manifestVersion": 0
}
RECORD.parent.mkdir(parents=True, exist_ok=True)
RECORD.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("OK applied pickword translate settings")
print("modules th_01=1.1.17 th_13=1.0.12 th_14=1.1.9 th_20=1.0.10")
