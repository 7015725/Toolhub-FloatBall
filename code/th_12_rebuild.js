// @version 1.2.3
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

// =======================【第一阶段：设置页统一配色契约】======================
// 只建立语义色 Scheme；暂不删除主题配置、Schema 或 SQLite 数据。
(function() {
  try {
    if (typeof FloatBallAppWM === "undefined" || !FloatBallAppWM || !FloatBallAppWM.prototype) return;
    var proto = FloatBallAppWM.prototype;
    var settingsColorSchemeVersion = "1.2.3";
    if (String(proto.__toolHubSettingsColorSchemeVersion || "") === settingsColorSchemeVersion) return;

    function parseColor(hex, fallbackInt) {
      try { return android.graphics.Color.parseColor(String(hex)); } catch(e) { return fallbackInt; }
    }

    function toOpaqueColor(value, fallbackInt) {
      var n = Number(value);
      if (isNaN(n) || n === 0) n = Number(fallbackInt);
      if (isNaN(n) || n === 0) n = android.graphics.Color.BLACK;
      n = n | 0;
      return (n & 0x00FFFFFF) | 0xFF000000;
    }

    function colorOr(value, fallbackInt) {
      if (value === undefined || value === null || value === "") {
        return toOpaqueColor(fallbackInt, android.graphics.Color.BLACK);
      }
      return toOpaqueColor(value, fallbackInt);
    }

    function clampRatio(value) {
      var n = Number(value);
      if (isNaN(n)) n = 0;
      if (n < 0) n = 0;
      if (n > 1) n = 1;
      return n;
    }

    function mixColor(baseColor, overlayColor, ratio) {
      try {
        var Color = android.graphics.Color;
        var base = toOpaqueColor(baseColor, Color.BLACK);
        var overlay = toOpaqueColor(overlayColor, base);
        var p = clampRatio(ratio);
        var q = 1 - p;
        var r = Math.max(0, Math.min(255, Math.round(Color.red(base) * q + Color.red(overlay) * p)));
        var g = Math.max(0, Math.min(255, Math.round(Color.green(base) * q + Color.green(overlay) * p)));
        var b = Math.max(0, Math.min(255, Math.round(Color.blue(base) * q + Color.blue(overlay) * p)));

        // 使用 32 位 ARGB 位运算，避免 Rhino 误选浮点颜色重载。
        return (0xFF000000 | (r << 16) | (g << 8) | b);
      } catch(e) {
        return toOpaqueColor(baseColor, android.graphics.Color.BLACK);
      }
    }

    function linearChannel(value) {
      var x = Number(value) / 255;
      if (x <= 0.03928) return x / 12.92;
      return Math.pow((x + 0.055) / 1.055, 2.4);
    }

    proto.getSettingsColorLuminance = function(colorInt) {
      try {
        var Color = android.graphics.Color;
        return 0.2126 * linearChannel(Color.red(colorInt)) +
               0.7152 * linearChannel(Color.green(colorInt)) +
               0.0722 * linearChannel(Color.blue(colorInt));
      } catch(e) {
        return 0;
      }
    };

    proto.getSettingsColorContrastRatio = function(colorA, colorB) {
      try {
        var l1 = this.getSettingsColorLuminance(colorA);
        var l2 = this.getSettingsColorLuminance(colorB);
        var hi = Math.max(l1, l2);
        var lo = Math.min(l1, l2);
        return (hi + 0.05) / (lo + 0.05);
      } catch(e) {
        return 1;
      }
    };

    proto.getSettingsBestTextColor = function(bgColor) {
      var Color = android.graphics.Color;
      var darkText = parseColor("#25272A", Color.BLACK);
      var lightText = parseColor("#E7E9EC", Color.WHITE);
      var darkRatio = this.getSettingsColorContrastRatio(bgColor, darkText);
      var lightRatio = this.getSettingsColorContrastRatio(bgColor, lightText);
      var preferred = darkRatio >= lightRatio ? darkText : lightText;
      var preferredRatio = Math.max(darkRatio, lightRatio);
      if (preferredRatio >= 4.5) return preferred;

      var blackRatio = this.getSettingsColorContrastRatio(bgColor, Color.BLACK);
      var whiteRatio = this.getSettingsColorContrastRatio(bgColor, Color.WHITE);
      return blackRatio >= whiteRatio ? Color.BLACK : Color.WHITE;
    };

    proto.repairSettingsPrimaryColor = function(rawPrimary, surface, isDark, candidates) {
      var minTextRatio = 4.5;
      var minSurfaceRatio = 1.55;
      var neutralAnchor = parseColor(isDark ? "#E7E9EC" : "#25272A", isDark ? android.graphics.Color.WHITE : android.graphics.Color.BLACK);

      function buildResult(app, color, source, repaired) {
        var onColor = app.getSettingsBestTextColor(color);
        return {
          color: color,
          onColor: onColor,
          repaired: repaired,
          source: source,
          textRatio: app.getSettingsColorContrastRatio(color, onColor),
          surfaceRatio: app.getSettingsColorContrastRatio(color, surface)
        };
      }

      var raw = buildResult(this, rawPrimary, "raw", false);
      if (raw.textRatio >= minTextRatio && raw.surfaceRatio >= minSurfaceRatio) return raw;

      var steps = [0.08, 0.16, 0.24, 0.32, 0.42, 0.52, 0.64];
      var best = raw;
      var bestScore = raw.textRatio * 2 + raw.surfaceRatio;
      for (var i = 0; i < steps.length; i++) {
        var ratio = steps[i];
        var adjusted = mixColor(rawPrimary, neutralAnchor, ratio);
        var result = buildResult(this, adjusted, "neutral_mix_" + String(Math.round(ratio * 100)), true);
        var score = (result.textRatio >= minTextRatio ? 100 : 0) +
                    (result.surfaceRatio >= minSurfaceRatio ? 100 : 0) +
                    result.textRatio * 2 + result.surfaceRatio;
        if (score > bestScore) {
          bestScore = score;
          best = result;
        }
        if (result.textRatio >= minTextRatio && result.surfaceRatio >= minSurfaceRatio) return result;
      }
      return best;
    };

    proto.getSettingsColorScheme = function(forceDark) {
      var Color = android.graphics.Color;
      var isDark = false;
      if (forceDark === true || forceDark === false) isDark = forceDark;
      else {
        try { isDark = this.isDarkTheme ? this.isDarkTheme() : false; } catch(eDark) { isDark = false; }
      }

      var fallback = isDark ? {
        background: parseColor("#131314", Color.BLACK),
        surface: parseColor("#1B1B1F", Color.BLACK),
        surface2: parseColor("#2B2C30", Color.DKGRAY),
        onSurface: parseColor("#E3E3E3", Color.WHITE),
        onSurface2: parseColor("#C4C7C5", Color.LTGRAY),
        primary: parseColor("#A8C7FA", Color.WHITE),
        onPrimary: parseColor("#062E6F", Color.BLACK),
        primaryContainer: parseColor("#0842A0", Color.DKGRAY),
        onPrimaryContainer: parseColor("#D3E3FD", Color.WHITE),
        secondary: parseColor("#7FCFFF", Color.WHITE),
        tertiary: parseColor("#C2C5DD", Color.WHITE),
        outline: parseColor("#8E918F", Color.GRAY),
        outlineVariant: parseColor("#49454F", Color.DKGRAY),
        danger: parseColor("#F2B8B5", Color.RED),
        dangerContainer: parseColor("#8C1D18", Color.RED),
        onDangerContainer: parseColor("#F9DEDC", Color.WHITE),
        success: parseColor("#4ADE80", Color.GREEN),
        warning: parseColor("#FBBF24", Color.YELLOW)
      } : {
        background: parseColor("#F8F9FA", Color.WHITE),
        surface: parseColor("#F1F3F4", Color.WHITE),
        surface2: parseColor("#E6E8EA", Color.LTGRAY),
        onSurface: parseColor("#1F1F1F", Color.BLACK),
        onSurface2: parseColor("#5F6368", Color.DKGRAY),
        primary: parseColor("#005BC0", Color.BLUE),
        onPrimary: Color.WHITE,
        primaryContainer: parseColor("#D3E3FD", Color.LTGRAY),
        onPrimaryContainer: parseColor("#041E49", Color.BLACK),
        secondary: parseColor("#00639B", Color.BLUE),
        tertiary: parseColor("#5C5891", Color.DKGRAY),
        outline: parseColor("#747775", Color.GRAY),
        outlineVariant: parseColor("#C4C7C5", Color.LTGRAY),
        danger: parseColor("#BA1A1A", Color.RED),
        dangerContainer: parseColor("#F9DEDC", Color.LTGRAY),
        onDangerContainer: parseColor("#410E0B", Color.BLACK),
        success: parseColor("#15803D", Color.GREEN),
        warning: parseColor("#B45309", Color.DKGRAY)
      };

      var monet = null;
      try {
        if (typeof MonetColorProvider !== "undefined" && MonetColorProvider && MonetColorProvider.getColors) {
          monet = MonetColorProvider.getColors(isDark);
        }
      } catch(eMonet) { monet = null; }

      var colors = null;
      try { colors = this.ui && this.ui.colors ? this.ui.colors : null; } catch(eColors) { colors = null; }
      if (!colors) colors = {};

      var background = colorOr(monet && monet.surface, colorOr(isDark ? colors.bgDark : colors.bgLight, fallback.background));
      var surface = colorOr(monet && (monet.surfaceContainerLow || monet.surfaceVariant), colorOr(isDark ? colors.cardDark : colors.cardLight, fallback.surface));
      var surface2 = colorOr(monet && (monet.surfaceContainerHigh || monet.surfaceVariant), colorOr(isDark ? colors.inputBgDark : colors.inputBgLight, fallback.surface2));
      // 正文和说明文字使用稳定中性色，不再随强调色色相偏移。
      var preferredPrimaryText = parseColor(isDark ? "#E7E9EC" : "#25272A", fallback.onSurface);
      var preferredSecondaryText = parseColor(isDark ? "#ADB3BA" : "#666B70", fallback.onSurface2);
      var onBackground = preferredPrimaryText;
      var onSurface = preferredPrimaryText;
      var onSurface2 = preferredSecondaryText;

      if (this.getSettingsColorContrastRatio(background, onBackground) < 7.0) onBackground = this.getSettingsBestTextColor(background);
      if (this.getSettingsColorContrastRatio(surface, onSurface) < 7.0) onSurface = this.getSettingsBestTextColor(surface);
      if (this.getSettingsColorContrastRatio(surface, onSurface2) < 4.5 ||
          this.getSettingsColorContrastRatio(surface2, onSurface2) < 4.5) {
        onSurface2 = onSurface;
      }

      var rawPrimary = colorOr(monet && monet.primary, colorOr(colors.primary, fallback.primary));
      var secondary = colorOr(monet && monet.secondary, colorOr(colors.accent, fallback.secondary));
      var tertiary = colorOr(monet && monet.tertiary, colorOr(colors._monetTertiary, fallback.tertiary));
      var repair = this.repairSettingsPrimaryColor(rawPrimary, surface, isDark, null);
      var primary = repair.color;
      var onPrimary = repair.onColor;

      // 弱强调色始终由最终 primary 派生，避免主色与容器色跨色相。
      var primaryContainer = mixColor(surface, primary, isDark ? 0.24 : 0.13);
      var onPrimaryContainer = onSurface;
      if (this.getSettingsColorContrastRatio(primaryContainer, onPrimaryContainer) < 4.5) {
        onPrimaryContainer = this.getSettingsBestTextColor(primaryContainer);
      }

      var outline = colorOr(monet && monet.outline, colorOr(colors._monetOutline, fallback.outline));
      var outlineVariant = colorOr(monet && (monet.outlineVariant || monet.outline), colorOr(colors._monetOutlineVariant, fallback.outlineVariant));
      var danger = colorOr(monet && monet.error, colorOr(colors.danger, fallback.danger));
      var onDanger = this.getSettingsBestTextColor(danger);
      var dangerContainer = colorOr(monet && monet.errorContainer, fallback.dangerContainer);
      var onDangerContainer = colorOr(monet && monet.onErrorContainer, fallback.onDangerContainer);
      if (this.getSettingsColorContrastRatio(dangerContainer, onDangerContainer) < 4.5) {
        onDangerContainer = this.getSettingsBestTextColor(dangerContainer);
      }

      var success = colorOr(colors.success, fallback.success);
      var warning = colorOr(colors.warning, fallback.warning);
      var successContainer = mixColor(surface, success, isDark ? 0.20 : 0.12);
      var warningContainer = mixColor(surface, warning, isDark ? 0.20 : 0.12);
      var onSuccessContainer = onSurface;
      var onWarningContainer = onSurface;
      if (this.getSettingsColorContrastRatio(successContainer, onSuccessContainer) < 4.5) {
        onSuccessContainer = this.getSettingsBestTextColor(successContainer);
      }
      if (this.getSettingsColorContrastRatio(warningContainer, onWarningContainer) < 4.5) {
        onWarningContainer = this.getSettingsBestTextColor(warningContainer);
      }

      return {
        dark: isDark,
        background: background,
        onBackground: onBackground,
        surface: surface,
        onSurface: onSurface,
        surface2: surface2,
        onSurface2: onSurface2,
        primary: primary,
        onPrimary: onPrimary,
        primaryContainer: primaryContainer,
        onPrimaryContainer: onPrimaryContainer,
        outline: outline,
        outlineVariant: outlineVariant,
        secondary: secondary,
        tertiary: tertiary,
        success: success,
        successContainer: successContainer,
        onSuccessContainer: onSuccessContainer,
        warning: warning,
        warningContainer: warningContainer,
        onWarningContainer: onWarningContainer,
        danger: danger,
        onDanger: onDanger,
        dangerContainer: dangerContainer,
        onDangerContainer: onDangerContainer,
        primaryRepaired: repair.repaired,
        primaryRepairSource: repair.source,
        primaryTextRatio: repair.textRatio,
        primarySurfaceRatio: repair.surfaceRatio

      };
    };

    proto.__toolHubSettingsColorSchemeInstalled = true;
    proto.__toolHubSettingsColorSchemeVersion = settingsColorSchemeVersion;
  } catch(eInstall) {
    try { safeLog(null, 'e', "install settings color scheme fail: " + String(eInstall)); } catch(eLog) {}
  }
})();
