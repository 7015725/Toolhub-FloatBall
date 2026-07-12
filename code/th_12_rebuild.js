// @version 1.0.7
// =======================【安全配置安装器】======================
// 这段代码的主要内容/用途：注入 Shell / Shortcut / Content 加固需要的配置项。
// Shell 默认 strict；Shortcut 默认仅使用结构化 intentUri，旧 JS 仅允许显式 legacy_js。
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
  putSchema("SHELL_BRIDGE_MODE", { type: "enum", values: ["compat", "explicit", "strict"], default: "strict" });
  putSchema("SHELL_BRIDGE_TARGET_PACKAGE", { type: "string", default: "" });
  putSchema("SHELL_BRIDGE_TARGET_CLASS", { type: "string", default: "" });
  putSchema("SHELL_BRIDGE_EXTRA_TOKEN", { type: "string", default: "token" });
  putSchema("SHELL_BRIDGE_TOKEN", { type: "string", default: "" });
  putSchema("SHELL_BRIDGE_REQUIRE_TOKEN", { type: "bool", default: true });
  putSchema("SHORTCUT_EXEC_MODE", { type: "enum", values: ["intent", "legacy_js"], default: "intent" });
  putSchema("CONTENT_SECURITY_MODE", { type: "enum", values: ["strict", "compat_audit", "off"], default: "strict" });
  putSchema("CONTENT_URI_ALLOWLIST", { type: "string", default: "content://settings/system/|content://settings/secure/|content://settings/global/" });
  putSchema("CONTENT_WRITE_URI_ALLOWLIST", { type: "string", default: "" });

  putDefault("TOOLAPP_BACK_SURFACE_DOMINANCE", 1.08);
  putDefault("SHELL_BRIDGE_MODE", "strict");
  putDefault("SHELL_BRIDGE_TARGET_PACKAGE", "");
  putDefault("SHELL_BRIDGE_TARGET_CLASS", "");
  putDefault("SHELL_BRIDGE_EXTRA_TOKEN", "token");
  putDefault("SHELL_BRIDGE_TOKEN", "");
  putDefault("SHELL_BRIDGE_REQUIRE_TOKEN", true);
  putDefault("SHORTCUT_EXEC_MODE", "intent");
  putDefault("CONTENT_SECURITY_MODE", "strict");
  putDefault("CONTENT_URI_ALLOWLIST", "content://settings/system/|content://settings/secure/|content://settings/global/");
  putDefault("CONTENT_WRITE_URI_ALLOWLIST", "");

  // 紧凑布局兼容：默认值 7 不应被 schema 最小值 8 静默抬高。
  try {
    if (ConfigValidator && ConfigValidator.schemas && ConfigValidator.schemas.PANEL_PADDING_DP) {
      ConfigValidator.schemas.PANEL_PADDING_DP.min = 4;
    }
    if (ConfigManager && ConfigManager.defaultSchema) {
      for (var i = 0; i < ConfigManager.defaultSchema.length; i++) {
        var it = ConfigManager.defaultSchema[i];
        if (it && String(it.key || "") === "PANEL_PADDING_DP") it.min = 4;
      }
    }
  } catch(ePad) {}
})();

// =======================【修复：设置枚举保存类型】======================
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
