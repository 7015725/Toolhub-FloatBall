#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "code" / "th_08_content.js"
VERIFY_MAJOR = ROOT / "scripts" / "verify_major_event_logging.py"
VERIFY_CONTENT = ROOT / "scripts" / "verify_content_security.py"

text = CONTENT.read_text(encoding="utf-8")
if "__toolHubMajorSeverityPatch" in text:
    raise SystemExit("major-event severity patch already installed")

old_version = "// @version 1.0.4"
new_version = "// @version 1.0.5"
if old_version not in text:
    raise SystemExit("unexpected th_08_content.js version")
text = text.replace(old_version, new_version, 1)

runtime_marker = "  function patchRuntime() {\n"
if text.count(runtime_marker) != 1:
    raise SystemExit("patchRuntime marker count mismatch")

severity_code = r'''  function majorSeverityOf(item) {
    var event = String(item && item.event || "");
    var phase = String(item && (item.phase || item.lastPhase) || "");
    var status = String(item && item.status || "").toLowerCase();
    if (event === "UNCAUGHT" || event === "RECOVERED_INTERRUPTION" || event === "TEST_INTERRUPTED") return "fatal";
    if (event === "INCIDENT") return "error";
    if (event === "TEST_END" && status && status !== "passed") return "error";
    if (event === "SESSION_END" && status && status !== "clean") return "error";
    if (event === "CHECKPOINT" && (phase.indexOf("_FAIL") >= 0 || phase === "PANEL_BUILD_FAIL")) return "error";
    return "info";
  }
  function majorSeverityLabel(level) {
    if (level === "fatal") return "[严重]";
    if (level === "error") return "[异常]";
    return "[信息]";
  }
  function isMajorAbnormalEvent(item) {
    return majorSeverityOf(item) !== "info";
  }
  function formatSeverityEvent(item) {
    return majorSeverityLabel(majorSeverityOf(item)) + " " + formatEvent(item);
  }
  function recentSeverityEvents(app, limit, mode) {
    var n = Math.floor(Number(limit || 8));
    if (isNaN(n) || n < 1) n = 8;
    if (n > 20) n = 20;
    var all = [];
    try { all = app.L && app.L.getRecentMajorEvents ? app.L.getRecentMajorEvents(30) : []; } catch (e) { all = []; }
    var out = [];
    for (var i = 0; i < all.length; i++) {
      if (mode === "abnormal" && !isMajorAbnormalEvent(all[i])) continue;
      out.push(all[i]);
    }
    if (out.length > n) out = out.slice(out.length - n);
    return out;
  }
  function severitySummary(app, limit, mode) {
    try {
      var list = recentSeverityEvents(app, limit, mode);
      if (!list.length) {
        return mode === "abnormal"
          ? "暂无异常事件；正常会话与成功检查点已折叠"
          : "暂无重大事件记录";
      }
      var lines = [];
      for (var i = 0; i < list.length; i++) lines.push(formatSeverityEvent(list[i]));
      return lines.join("\n");
    } catch (e) {
      return "读取重大事件失败：" + String(e);
    }
  }
  function installMajorSeverityRuntimeCard(proto) {
    if (!proto || proto.__toolHubMajorSeverityPatch === true) return;
    proto.getRecentAbnormalEventSummary = function(limit) {
      return severitySummary(this, limit || 8, "abnormal");
    };
    proto.getRecentMajorEventDetailSummary = function(limit) {
      return severitySummary(this, limit || 16, "all");
    };
    proto.copyCurrentMajorEventSummary = function(mode) {
      try {
        var normalized = String(mode || "abnormal") === "all" ? "all" : "abnormal";
        var text = normalized === "all"
          ? this.getRecentMajorEventDetailSummary(20)
          : this.getRecentAbnormalEventSummary(12);
        if (!text) return false;
        var clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE);
        if (!clipboard) throw "clipboard service unavailable";
        clipboard.setPrimaryClip(android.content.ClipData.newPlainText(
          normalized === "all" ? "ToolHub 全部重大事件" : "ToolHub 异常事件",
          text
        ));
        try { this.toast(normalized === "all" ? "全部重大事件已复制" : "异常事件已复制"); } catch (eToast) {}
        return true;
      } catch (e) {
        safeLog(this.L, "e", "copy severity major events fail error=" + String(e));
        try { this.toast("复制重大事件失败"); } catch (eToast2) {}
      }
      return false;
    };

    var oldCard = proto.createColorSafetyRuntimeDiagnosticCard;
    if (typeof oldCard === "function" && oldCard.__majorSeverityWrapped !== true) {
      var severityCard = function() {
        var card = oldCard.apply(this, arguments);
        try {
          var self = this;
          var title = null, summary = null, copyButton = null;
          var count = card && card.getChildCount ? card.getChildCount() : 0;
          for (var i = 0; i < count; i++) {
            var child = card.getChildAt(i);
            var childText = "";
            try { if (child && child.getText) childText = String(child.getText() || ""); } catch (eText) {}
            if (childText === "最近重大事件") {
              title = child;
              if (i + 1 < count) summary = card.getChildAt(i + 1);
              if (i + 2 < count) copyButton = card.getChildAt(i + 2);
              break;
            }
          }
          if (!title || !summary) return card;

          var showAll = false;
          var T = this.getSettingsColorScheme ? this.getSettingsColorScheme() : null;
          var C = this.ui && this.ui.colors ? this.ui.colors : null;
          var bg = T && T.surface2 ? T.surface2 : (T && T.primaryContainer ? T.primaryContainer : android.graphics.Color.LTGRAY);
          var fg = T && T.onSurface ? T.onSurface : (C ? C.textPriLight : android.graphics.Color.DKGRAY);

          function refreshSeverityView() {
            try {
              title.setText(showAll ? "全部重大事件" : "最近异常事件");
              summary.setText(showAll
                ? self.getRecentMajorEventDetailSummary(16)
                : self.getRecentAbnormalEventSummary(8));
              if (toggleButton) toggleButton.setText(showAll ? "只看异常" : "查看全部事件");
            } catch (eRefresh) {
              safeLog(self.L, "w", "refresh major severity view fail error=" + String(eRefresh));
            }
          }

          if (copyButton && copyButton.setText && copyButton.setOnClickListener) {
            copyButton.setText("复制当前摘要");
            copyButton.setOnClickListener(new android.view.View.OnClickListener({
              onClick: function() { self.copyCurrentMajorEventSummary(showAll ? "all" : "abnormal"); }
            }));
          }

          var toggleButton = this.ui.createSolidButton(this, "查看全部事件", bg, fg, function() {
            showAll = !showAll;
            refreshSeverityView();
          });
          var toggleLp = new android.widget.LinearLayout.LayoutParams(-1, this.dp(46));
          toggleLp.setMargins(0, this.dp(8), 0, 0);
          card.addView(toggleButton, toggleLp);
          refreshSeverityView();
        } catch (eCard) {
          safeLog(this.L, "w", "install major severity card fail error=" + String(eCard));
        }
        return card;
      };
      severityCard.__majorSeverityWrapped = true;
      proto.createColorSafetyRuntimeDiagnosticCard = severityCard;
    }
    proto.__toolHubMajorSeverityPatch = true;
  }

'''
text = text.replace(runtime_marker, severity_code + runtime_marker, 1)

close_marker = "\n    });\n  }\n\n  var BaseLogger = ToolHubLogger;"
if text.count(close_marker) != 1:
    raise SystemExit("patchRuntime close marker count mismatch")
text = text.replace(
    close_marker,
    "\n    });\n    installMajorSeverityRuntimeCard(p);\n  }\n\n  var BaseLogger = ToolHubLogger;",
    1,
)
CONTENT.write_text(text, encoding="utf-8")

major = VERIFY_MAJOR.read_text(encoding="utf-8")
major = major.replace("< (1, 0, 4)", "< (1, 0, 5)", 1)
major = major.replace(
    "version below major-event test lifecycle baseline 1.0.4",
    "version below major-event severity baseline 1.0.5",
    1,
)
needle = '    "复制最近重大事件",\n'
if needle not in major:
    raise SystemExit("verify_major_event_logging token marker missing")
major = major.replace(
    needle,
    needle
    + '    "majorSeverityOf",\n'
    + '    "isMajorAbnormalEvent",\n'
    + '    "getRecentAbnormalEventSummary",\n'
    + '    "getRecentMajorEventDetailSummary",\n'
    + '    "copyCurrentMajorEventSummary",\n'
    + '    "__toolHubMajorSeverityPatch",\n'
    + '    "最近异常事件",\n'
    + '    "查看全部事件",\n'
    + '    "只看异常",\n'
    + '    "复制当前摘要",\n',
    1,
)
major = major.replace(
    "runtime_records=1 crash_handler_singleton=1",
    "runtime_records=1 severity_filter=1 details_toggle=1 crash_handler_singleton=1",
    1,
)
VERIFY_MAJOR.write_text(major, encoding="utf-8")

content_verify = VERIFY_CONTENT.read_text(encoding="utf-8")
content_verify = content_verify.replace(
    '("content module version advanced", "// @version 1.0.4" in content)',
    '("content module version advanced", "// @version 1.0.5" in content)',
    1,
)
VERIFY_CONTENT.write_text(content_verify, encoding="utf-8")

print("OK applied major-event severity filter patch")
