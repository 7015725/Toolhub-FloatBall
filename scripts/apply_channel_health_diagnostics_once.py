#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
th08_path = ROOT / "code" / "th_08_content.js"
verify_path = ROOT / "scripts" / "verify_channel_health_diagnostics.py"
workflow_path = ROOT / ".github" / "workflows" / "verify.yml"

text = th08_path.read_text(encoding="utf-8")
if "// @version 1.0.8" not in text:
    raise SystemExit("unexpected th_08_content.js version")
text = text.replace("// @version 1.0.8", "// @version 1.0.9", 1)

anchor = '    if (typeof p.getRecentMajorEventSummary !== "function") {'
if text.count(anchor) != 1:
    raise SystemExit("health method anchor mismatch")

methods = r'''    if (typeof p.buildToolHubChannelHealthReport !== "function") {
      p.buildToolHubChannelHealthReport = function() {
        var result = {
          schemaVersion: 1,
          completedAt: Number(java.lang.System.currentTimeMillis()),
          status: "error",
          channel: "stable",
          branch: "",
          rootDir: "",
          databasePath: "",
          trustedVersion: 0,
          installedVersion: 0,
          moduleCount: 0,
          errorCount: 0,
          warningCount: 0,
          checks: [],
          text: ""
        };
        function textValue(value) {
          try { return String(value === undefined || value === null ? "" : value); } catch (e) { return ""; }
        }
        function numberValue(value) {
          var n = Number(value || 0);
          return isNaN(n) ? 0 : n;
        }
        function addCheck(code, title, ok, severity, actual, expected) {
          var item = {
            code: textValue(code),
            title: textValue(title),
            ok: ok === true,
            severity: textValue(severity || "warning"),
            actual: textValue(actual),
            expected: textValue(expected)
          };
          result.checks.push(item);
          if (!item.ok) {
            if (item.severity === "error") result.errorCount++;
            else result.warningCount++;
          }
        }
        try {
          var channel = "stable";
          try { channel = normalizeToolHubUpdateChannel(TOOLHUB_UPDATE_CHANNEL); } catch (eChannel) {}
          var spec = null;
          try { spec = getToolHubChannelSpec(channel); } catch (eSpec) {}
          var expectedBranch = spec ? textValue(spec.branch) : (channel === "beta" ? "beta" : "main");
          var expectedRootName = spec ? textValue(spec.rootName) : (channel === "beta" ? "ToolHub-Beta" : "ToolHub");
          var expectedSuffix = "/" + expectedRootName;
          var branch = "";
          try { branch = textValue(TOOLHUB_UPDATE_BRANCH); } catch (eBranch) {}
          var rootDir = "";
          try { rootDir = textValue(getToolHubRootDir()).replace(/\/+$/g, ""); } catch (eRoot) {}
          var appRoot = "";
          try { appRoot = textValue(APP_ROOT_DIR).replace(/\/+$/g, ""); } catch (eAppRoot) {}
          var channelState = null;
          try { channelState = typeof readToolHubChannelState === "function" ? readToolHubChannelState() : TOOLHUB_CHANNEL_STATE; } catch (eState) { channelState = null; }
          var updateState = null;
          try { updateState = typeof TOOLHUB_UPDATE_STATE === "object" && TOOLHUB_UPDATE_STATE ? TOOLHUB_UPDATE_STATE : null; } catch (eUpdateState) { updateState = null; }
          var trustedVersion = 0;
          try { trustedVersion = typeof getTrustedManifestVersionNumber === "function" ? numberValue(getTrustedManifestVersionNumber()) : numberValue(__trustedManifest && __trustedManifest.version); } catch (eTrusted) {}
          var installedVersion = 0;
          try {
            var installed = typeof readInstalledManifest === "function" ? readInstalledManifest() : null;
            installedVersion = numberValue(installed && installed.version);
          } catch (eInstalled) {}
          var moduleCount = 0;
          try { moduleCount = modules && modules.length !== undefined ? numberValue(modules.length) : 0; } catch (eModules) {}
          var loadErrorCount = 0;
          try { loadErrorCount = loadErrors && loadErrors.length !== undefined ? numberValue(loadErrors.length) : 0; } catch (eLoadErrors) {}
          var storageInfo = null;
          try { storageInfo = ConfigManager && ConfigManager.getStorageInfo ? ConfigManager.getStorageInfo() : null; } catch (eStorage) { storageInfo = null; }
          var dbPath = storageInfo ? textValue(storageInfo.databasePath) : (rootDir ? rootDir + "/toolhub.db" : "");

          result.channel = channel;
          result.branch = branch;
          result.rootDir = rootDir;
          result.databasePath = dbPath;
          result.trustedVersion = trustedVersion;
          result.installedVersion = installedVersion;
          result.moduleCount = moduleCount;

          addCheck("channel", "活动通道有效", channel === "stable" || channel === "beta", "error", channel, "stable 或 beta");
          addCheck("branch", "更新分支匹配通道", branch === expectedBranch, "error", branch, expectedBranch);
          addCheck("root", "运行根目录匹配通道", !!rootDir && rootDir.lastIndexOf(expectedSuffix) === rootDir.length - expectedSuffix.length, "error", rootDir, "*" + expectedSuffix);
          addCheck("app_root", "模块根目录与入口一致", !!appRoot && appRoot === rootDir, "error", appRoot, rootDir);
          addCheck("state_active", "启动状态活动通道一致", !!channelState && textValue(channelState.activeChannel) === channel, "error", channelState ? textValue(channelState.activeChannel) : "", channel);
          addCheck("state_pending", "不存在未完成切换", !channelState || !textValue(channelState.pendingChannel), "error", channelState ? textValue(channelState.pendingChannel) : "", "空");
          addCheck("state_good", "最后正常通道一致", !channelState || textValue(channelState.lastGoodChannel) === channel, "error", channelState ? textValue(channelState.lastGoodChannel) : "", channel);
          addCheck("update_channel", "更新状态通道一致", !updateState || textValue(updateState.channel) === channel, "error", updateState ? textValue(updateState.channel) : "", channel);
          addCheck("update_branch", "更新状态分支一致", !updateState || textValue(updateState.branch) === expectedBranch, "error", updateState ? textValue(updateState.branch) : "", expectedBranch);
          addCheck("update_root", "更新状态根目录一致", !updateState || !textValue(updateState.rootDir) || textValue(updateState.rootDir).replace(/\/+$/g, "") === rootDir, "error", updateState ? textValue(updateState.rootDir) : "", rootDir);
          addCheck("manifest", "可信签名清单已加载", trustedVersion > 0, "warning", trustedVersion, "> 0");
          addCheck("installed", "本地安装清单有效", installedVersion > 0, "warning", installedVersion, "> 0");
          addCheck("modules", "子模块清单非空", moduleCount > 0, "error", moduleCount, "> 0");
          addCheck("load_errors", "子模块无加载错误", loadErrorCount === 0, "error", loadErrorCount, "0");
          addCheck("database_path", "SQLite 路径属于当前通道", !!dbPath && !!rootDir && dbPath.indexOf(rootDir + "/") === 0, "error", dbPath, rootDir + "/toolhub.db");
          addCheck("database_health", "SQLite 当前可用", !storageInfo || storageInfo.databaseHealthy === true, "warning", storageInfo ? textValue(storageInfo.databaseHealthy) : "未知", "true");
          var checkStatus = updateState ? textValue(updateState.channelCheckStatus) : "";
          addCheck("post_switch_check", "最近切换后检查无错误", checkStatus !== "error", "warning", checkStatus || "未执行", "非 error");

          result.status = result.errorCount > 0 ? "error" : (result.warningCount > 0 ? "warning" : "healthy");
          var lines = [];
          lines.push("ToolHub 通道健康报告");
          lines.push("状态：" + (result.status === "healthy" ? "正常" : (result.status === "warning" ? "警告" : "异常")));
          lines.push("时间戳：" + String(result.completedAt));
          lines.push("通道：" + channel + " / " + textValue(spec && spec.label));
          lines.push("分支：" + branch);
          lines.push("根目录：" + rootDir);
          lines.push("数据库：" + dbPath);
          lines.push("可信清单版本：" + String(trustedVersion));
          lines.push("安装清单版本：" + String(installedVersion));
          lines.push("子模块数量：" + String(moduleCount));
          lines.push("异常：" + String(result.errorCount) + "，警告：" + String(result.warningCount));
          lines.push("");
          lines.push("检查项：");
          for (var i = 0; i < result.checks.length; i++) {
            var one = result.checks[i];
            var mark = one.ok ? "PASS" : (one.severity === "error" ? "FAIL" : "WARN");
            var line = "[" + mark + "] " + one.title;
            if (!one.ok) line += "；实际=" + one.actual + "；期望=" + one.expected;
            lines.push(line);
          }
          lines.push("");
          lines.push("说明：报告不包含翻译密钥、按钮内容或其他敏感配置。");
          result.text = lines.join("\n");
        } catch (eReport) {
          result.status = "error";
          result.errorCount++;
          result.text = "ToolHub 通道健康报告\n状态：异常\n错误：" + String(eReport);
        }
        return result;
      };
    }

    if (typeof p.runToolHubChannelHealthCheck !== "function") {
      p.runToolHubChannelHealthCheck = function() {
        var result = this.buildToolHubChannelHealthReport ? this.buildToolHubChannelHealthReport() : null;
        if (!result) return { status: "error", text: "通道健康报告生成失败", errorCount: 1, warningCount: 0 };
        var savePath = "";
        var saved = false;
        try {
          var rootText = String(APP_ROOT_DIR || "").replace(/\/+$/g, "");
          if (rootText) {
            savePath = rootText + "/diagnostics/channel-health-last.txt";
            if (typeof writeTextFile === "function") saved = writeTextFile(savePath, String(result.text || "")) === true;
          }
        } catch (eSave) {
          saved = false;
        }
        result.saved = saved;
        result.savePath = savePath;
        try { if (!this.state) this.state = {}; this.state.toolHubChannelHealthResult = result; } catch (eState) {}
        safeLog(this.L, result.status === "error" ? "e" : (result.status === "warning" ? "w" : "i"), "TH_CHANNEL event=HEALTH_CHECK_DONE status=" + String(result.status) + " channel=" + String(result.channel || "") + " errors=" + String(result.errorCount || 0) + " warnings=" + String(result.warningCount || 0) + " saved=" + String(saved));
        return result;
      };
    }

    if (typeof p.copyToolHubChannelHealthReport !== "function") {
      p.copyToolHubChannelHealthReport = function() {
        try {
          var result = this.state && this.state.toolHubChannelHealthResult ? this.state.toolHubChannelHealthResult : this.runToolHubChannelHealthCheck();
          var text = result && result.text ? String(result.text) : "";
          if (!text) throw "empty channel health report";
          var clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE);
          if (!clipboard) throw "clipboard service unavailable";
          clipboard.setPrimaryClip(android.content.ClipData.newPlainText("ToolHub 通道健康报告", text));
          try { this.toast("通道健康报告已复制"); } catch (eToast) {}
          return true;
        } catch (eCopy) {
          safeLog(this.L, "e", "copy channel health report fail error=" + String(eCopy));
          try { this.toast("复制通道健康报告失败"); } catch (eToast2) {}
        }
        return false;
      };
    }

'''
text = text.replace(anchor, methods + anchor, 1)

ui_anchor = '''          var copyLp = new android.widget.LinearLayout.LayoutParams(-1, this.dp(46));
          copyLp.setMargins(0, this.dp(8), 0, 0);
          card.addView(copyButton, copyLp);
'''
if text.count(ui_anchor) != 1:
    raise SystemExit("health UI anchor mismatch")

ui = ui_anchor + r'''

          var healthTitle = new android.widget.TextView(context);
          healthTitle.setText("通道健康自检");
          toolhubSafeSetTextColor(healthTitle, T && T.onSurface ? T.onSurface : (C ? C.textPriLight : android.graphics.Color.DKGRAY));
          healthTitle.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 14);
          healthTitle.setTypeface(null, android.graphics.Typeface.BOLD);
          healthTitle.setPadding(0, this.dp(16), 0, this.dp(4));
          card.addView(healthTitle, new android.widget.LinearLayout.LayoutParams(-1, -2));

          var healthSummary = new android.widget.TextView(context);
          var lastHealth = null;
          try { lastHealth = this.state && this.state.toolHubChannelHealthResult ? this.state.toolHubChannelHealthResult : null; } catch (eLastHealth) {}
          healthSummary.setText(lastHealth ? ("状态：" + String(lastHealth.status || "unknown") + " · 异常 " + String(lastHealth.errorCount || 0) + " · 警告 " + String(lastHealth.warningCount || 0)) : "尚未执行。自检只读取当前运行状态，不联网、不自动修复。");
          toolhubSafeSetTextColor(healthSummary, T && T.onSurface2 ? T.onSurface2 : (C ? C.textSecLight : android.graphics.Color.GRAY));
          healthSummary.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11);
          try { healthSummary.setLineSpacing(this.dp(2), 1.0); } catch (eHealthSpace) {}
          card.addView(healthSummary, new android.widget.LinearLayout.LayoutParams(-1, -2));

          var healthRunButton = this.ui.createSolidButton(this, "运行通道自检", bg, fg, function() {
            var ret = self.runToolHubChannelHealthCheck ? self.runToolHubChannelHealthCheck() : null;
            if (ret) {
              healthSummary.setText("状态：" + String(ret.status || "unknown") + " · 异常 " + String(ret.errorCount || 0) + " · 警告 " + String(ret.warningCount || 0) + (ret.saved ? "\n已保存：" + String(ret.savePath || "") : "\n报告未保存，可直接复制"));
              try { self.toast(ret.status === "healthy" ? "通道健康自检正常" : (ret.status === "warning" ? "通道健康自检有警告" : "通道健康自检发现异常")); } catch (eHealthToast) {}
            }
          });
          var healthRunLp = new android.widget.LinearLayout.LayoutParams(-1, this.dp(46));
          healthRunLp.setMargins(0, this.dp(8), 0, 0);
          card.addView(healthRunButton, healthRunLp);

          var healthCopyButton = this.ui.createSolidButton(this, "复制通道诊断报告", bg, fg, function() {
            if (self.copyToolHubChannelHealthReport) self.copyToolHubChannelHealthReport();
          });
          var healthCopyLp = new android.widget.LinearLayout.LayoutParams(-1, this.dp(46));
          healthCopyLp.setMargins(0, this.dp(8), 0, 0);
          card.addView(healthCopyButton, healthCopyLp);
'''
text = text.replace(ui_anchor, ui, 1)
th08_path.write_text(text, encoding="utf-8")

verify_path.write_text(r'''#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TH08 = (ROOT / "code" / "th_08_content.js").read_text(encoding="utf-8")
VERIFY = (ROOT / ".github" / "workflows" / "verify.yml").read_text(encoding="utf-8")

checks = {
    "模块版本已提升": "// @version 1.0.9" in TH08,
    "健康报告构建器存在": "buildToolHubChannelHealthReport" in TH08,
    "健康自检入口存在": "runToolHubChannelHealthCheck" in TH08,
    "诊断复制入口存在": "copyToolHubChannelHealthReport" in TH08,
    "报告按活动根目录保存": 'rootText + "/diagnostics/channel-health-last.txt"' in TH08,
    "报告不固定 Stable 路径": 'ToolHub/diagnostics/channel-health-last.txt' not in TH08,
    "检查通道分支根目录": all(marker in TH08 for marker in ['"branch"', '"root"', '"app_root"', '"state_active"', '"state_pending"']),
    "检查更新与签名状态": all(marker in TH08 for marker in ['"update_channel"', '"manifest"', '"installed"', '"post_switch_check"']),
    "检查 SQLite 通道路径": '"database_path"' in TH08 and 'dbPath.indexOf(rootDir + "/") === 0' in TH08,
    "结构化健康日志存在": "TH_CHANNEL event=HEALTH_CHECK_DONE" in TH08,
    "运行记录 UI 存在": "通道健康自检" in TH08 and "复制通道诊断报告" in TH08,
    "敏感信息排除说明存在": "报告不包含翻译密钥、按钮内容或其他敏感配置" in TH08,
    "验证工作流已接入": "python3 scripts/verify_channel_health_diagnostics.py" in VERIFY,
}
failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(("PASS" if ok else "FAIL") + ": " + name)
if failed:
    raise SystemExit("channel health diagnostics verification failed: " + ", ".join(failed))
print("Channel health diagnostics verification passed.")
''', encoding="utf-8")

workflow = workflow_path.read_text(encoding="utf-8")
workflow_anchor = "            python3 scripts/verify_major_event_logging.py\n"
if workflow.count(workflow_anchor) != 1:
    raise SystemExit("verify workflow anchor mismatch")
workflow = workflow.replace(workflow_anchor, workflow_anchor + "            python3 scripts/verify_channel_health_diagnostics.py\n", 1)
workflow_path.write_text(workflow, encoding="utf-8")

print("channel health diagnostics patch applied")
