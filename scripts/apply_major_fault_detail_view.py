#!/usr/bin/env python3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "code" / "th_08_content.js"
VERIFY = ROOT / "scripts" / "verify_major_event_logging.py"
CONTENT_VERIFY = ROOT / "scripts" / "verify_content_security.py"

text = JS.read_text(encoding="utf-8")

if "// @version 1.0.6" not in text:
    raise SystemExit("th_08_content.js baseline 1.0.6 not found")
text = text.replace("// @version 1.0.6", "// @version 1.0.7", 1)

old_limit = "    if (n > 30) n = 30;\n    return M.recentEvents(this, n);"
new_limit = "    if (n > 80) n = 80;\n    return M.recentEvents(this, n);"
if old_limit not in text:
    raise SystemExit("logger recent event limit anchor missing")
text = text.replace(old_limit, new_limit, 1)

block_pattern = re.compile(
    r"  function aggregateMajorAbnormalEvents\(list, limit\) \{.*?\n  \}\n"
    r"  function formatMajorFaultGroup\(group\) \{.*?\n  \}\n"
    r"  function recentSeverityEvents\(app, limit, mode\) \{.*?\n  \}\n"
    r"  function severitySummary\(app, limit, mode\) \{.*?\n  \}",
    re.S,
)

replacement = r'''  function aggregateMajorAbnormalEvents(list, limit) {
    var groups = [], byKey = {};
    var n = Math.floor(Number(limit || 8));
    if (isNaN(n) || n < 1) n = 8;
    if (n > 12) n = 12;
    var i;
    for (i = 0; i < list.length; i++) {
      var item = list[i];
      if (!isMajorAbnormalEvent(item)) continue;
      var key = majorFaultSessionKey(item);
      var group = byKey[key];
      if (!group) {
        group = {
          key: key,
          firstTime: item.time || "",
          lastTime: item.time || "",
          severity: majorSeverityOf(item),
          representative: item,
          priority: majorFaultPriority(item),
          count: 0,
          duplicateCount: 0,
          evidence: [],
          fingerprints: {},
          events: [],
          boot: "",
          oldPid: "",
          newPid: "",
          sameBoot: "",
          classification: ""
        };
        byKey[key] = group;
        groups.push(group);
      }
      group.count++;
      group.lastTime = item.time || group.lastTime;
      var priority = majorFaultPriority(item);
      if (priority > group.priority) {
        group.priority = priority;
        group.severity = majorSeverityOf(item);
        group.representative = item;
      }
      var fingerprint = majorFaultDuplicateKey(item);
      if (group.fingerprints[fingerprint]) {
        group.duplicateCount++;
      } else {
        group.fingerprints[fingerprint] = true;
        if (group.evidence.length < 6) group.evidence.push(majorFaultEvidenceLabel(item));
      }
    }
    for (i = 0; i < list.length; i++) {
      var rawItem = list[i];
      var rawGroup = byKey[majorFaultSessionKey(rawItem)];
      if (!rawGroup) continue;
      rawGroup.events.push(rawItem);
      if (!rawGroup.boot && rawItem.boot) rawGroup.boot = String(rawItem.boot);
      if (rawItem.oldPid !== undefined && rawItem.oldPid !== "") rawGroup.oldPid = rawItem.oldPid;
      if (rawItem.newPid !== undefined && rawItem.newPid !== "") rawGroup.newPid = rawItem.newPid;
      if (rawItem.sameBoot !== undefined && rawItem.sameBoot !== "") rawGroup.sameBoot = rawItem.sameBoot;
      if (!rawGroup.classification && rawItem.classification) rawGroup.classification = String(rawItem.classification);
      if (!rawGroup.firstTime && rawItem.time) rawGroup.firstTime = rawItem.time;
      if (rawItem.time) rawGroup.lastTime = rawItem.time;
    }
    if (groups.length > n) groups = groups.slice(groups.length - n);
    return groups;
  }
  function formatMajorFaultGroup(group) {
    var item = group && group.representative ? group.representative : {};
    var parts = [];
    parts.push(String(group && group.lastTime || item.time || "").substring(5));
    parts.push("故障会话");
    if (item.classification || group.classification) parts.push("分类=" + String(item.classification || group.classification));
    if (item.test) parts.push("测试=" + String(item.test));
    if (item.lastPhase || item.phase) parts.push("最后阶段=" + String(item.lastPhase || item.phase));
    if (item.which) parts.push("面板=" + String(item.which));
    if (item.target) parts.push("目标=" + String(item.target));
    if (group && group.evidence && group.evidence.length) parts.push("证据=" + group.evidence.join(" > "));
    if (group && group.count > 1) parts.push("事件=" + String(group.count));
    if (group && group.duplicateCount > 0) parts.push("重复折叠=" + String(group.duplicateCount));
    return majorSeverityLabel(group && group.severity || majorSeverityOf(item)) + " " + parts.join(" · ");
  }
  function majorFaultBootLabel(value) {
    var s = String(value === undefined || value === null ? "" : value).toLowerCase();
    if (s === "true" || s === "1") return "同一 Boot ID（设备未完整重启）";
    if (s === "false" || s === "0") return "Boot ID 已变化（设备发生重启）";
    return "Boot ID 判断未知";
  }
  function formatMajorFaultEventDetail(item, index) {
    var parts = [];
    parts.push("#" + String(index + 1));
    parts.push(String(item && item.time || ""));
    parts.push(majorSeverityLabel(majorSeverityOf(item)) + " " + eventLabel(item && item.event));
    if (item && item.seq !== undefined && item.seq !== "") parts.push("seq=" + String(item.seq));
    if (item && item.type) parts.push("type=" + String(item.type));
    if (item && item.classification) parts.push("分类=" + String(item.classification));
    if (item && item.status) parts.push("状态=" + String(item.status));
    if (item && item.phase) parts.push("阶段=" + String(item.phase));
    if (item && item.lastPhase) parts.push("最后阶段=" + String(item.lastPhase));
    if (item && item.test) parts.push("测试=" + String(item.test));
    if (item && item.progress !== undefined && item.progress !== "") parts.push("进度=" + String(item.progress) + "%");
    if (item && item.loops !== undefined && item.loops !== "") parts.push("循环=" + String(item.loops));
    if (item && item.target) parts.push("目标=" + String(item.target));
    if (item && item.which) parts.push("面板=" + String(item.which));
    if (item && item.route) parts.push("页面=" + String(item.route));
    if (item && item.oldPid !== undefined && item.oldPid !== "") parts.push("旧PID=" + String(item.oldPid));
    if (item && item.newPid !== undefined && item.newPid !== "") parts.push("新PID=" + String(item.newPid));
    if (item && item.sameBoot !== undefined && item.sameBoot !== "") parts.push("Boot判断=" + majorFaultBootLabel(item.sameBoot));
    if (item && item.boot) parts.push("BootID=" + String(item.boot));
    if (item && item.durationMs !== undefined && item.durationMs !== "") parts.push("耗时=" + String(item.durationMs) + "ms");
    if (item && item.error) parts.push("错误=" + String(item.error));
    if (item && item.message) parts.push("消息=" + String(item.message));
    if (item && item.exception) parts.push("异常=" + String(item.exception));
    if (item && item.thread) parts.push("线程=" + String(item.thread));
    return parts.join(" · ");
  }
  function formatMajorFaultGroupDetail(group) {
    var item = group && group.representative ? group.representative : {};
    var events = group && group.events ? group.events : [];
    var lines = [];
    var sessionKey = String(group && group.key || "");
    if (sessionKey.indexOf("session:") === 0) sessionKey = sessionKey.substring(8);
    var oldPid = group && group.oldPid !== "" ? group.oldPid : item.oldPid;
    var newPid = group && group.newPid !== "" ? group.newPid : item.newPid;
    var sameBoot = group && group.sameBoot !== "" ? group.sameBoot : item.sameBoot;
    lines.push("故障会话详情");
    lines.push("");
    lines.push("等级：" + majorSeverityLabel(group && group.severity || majorSeverityOf(item)));
    lines.push("会话：" + (sessionKey || "未知"));
    lines.push("时间：" + String(group && group.firstTime || "") + " → " + String(group && group.lastTime || ""));
    if (group && group.classification || item.classification) lines.push("分类：" + String(group.classification || item.classification));
    if (item.test) lines.push("测试：" + String(item.test));
    if (item.lastPhase || item.phase) lines.push("最后阶段：" + String(item.lastPhase || item.phase));
    if (oldPid !== undefined && oldPid !== "") lines.push("进程：" + String(oldPid) + " → " + String(newPid === undefined || newPid === "" ? "未知" : newPid));
    lines.push("Boot 判断：" + majorFaultBootLabel(sameBoot));
    if (group && group.boot) lines.push("上次 Boot ID：" + String(group.boot));
    lines.push("异常事件：" + String(group && group.count || 0));
    lines.push("原始事件：" + String(events.length));
    lines.push("重复折叠：" + String(group && group.duplicateCount || 0));
    if (group && group.evidence && group.evidence.length) lines.push("证据链：" + group.evidence.join(" > "));
    lines.push("");
    lines.push("完整事件顺序");
    lines.push("----------------");
    if (!events.length) {
      lines.push("没有可用的原始事件记录");
    } else {
      for (var i = 0; i < events.length; i++) lines.push(formatMajorFaultEventDetail(events[i], i));
    }
    lines.push("");
    lines.push("来源：ToolHub 每日运行日志（只读解析）");
    return lines.join("\n");
  }
  function makeMajorFaultClickableSpan(app, group, color) {
    return new JavaAdapter(android.text.style.ClickableSpan, {
      onClick: function(widget) {
        try { app.showMajorFaultSessionDetail(group); }
        catch (e) { safeLog(app.L, "e", "show major fault detail click fail error=" + String(e)); }
      },
      updateDrawState: function(ds) {
        try {
          ds.setColor(color);
          ds.setUnderlineText(false);
        } catch (e) {}
      }
    });
  }
  function buildMajorFaultClickableSummary(app, groups, color) {
    var builder = new android.text.SpannableStringBuilder();
    for (var i = 0; i < groups.length; i++) {
      var start = builder.length();
      builder.append(formatMajorFaultGroup(groups[i]));
      var end = builder.length();
      try {
        builder.setSpan(
          makeMajorFaultClickableSpan(app, groups[i], color),
          start,
          end,
          android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
        );
      } catch (eSpan) {
        safeLog(app.L, "w", "create major fault clickable span fail error=" + String(eSpan));
      }
      if (i + 1 < groups.length) builder.append("\n");
    }
    if (groups.length) builder.append("\n\n点击任一故障会话查看详情");
    return builder;
  }
  function recentSeverityEvents(app, limit, mode) {
    var n = Math.floor(Number(limit || 8));
    if (isNaN(n) || n < 1) n = 8;
    if (n > 80) n = 80;
    var all = [];
    try { all = app.L && app.L.getRecentMajorEvents ? app.L.getRecentMajorEvents(80) : []; } catch (e) { all = []; }
    var out = [];
    for (var i = 0; i < all.length; i++) {
      if (mode === "abnormal" && !isMajorAbnormalEvent(all[i])) continue;
      out.push(all[i]);
    }
    if (mode !== "abnormal" && out.length > n) out = out.slice(out.length - n);
    return out;
  }
  function severitySummary(app, limit, mode) {
    try {
      if (mode === "abnormal") {
        var groups = aggregateMajorAbnormalEvents(recentSeverityEvents(app, 80, "all"), limit);
        if (!groups.length) return "暂无故障会话；正常会话与成功检查点已折叠";
        var faultLines = [];
        for (var gi = 0; gi < groups.length; gi++) faultLines.push(formatMajorFaultGroup(groups[gi]));
        return faultLines.join("\n");
      }
      var list = recentSeverityEvents(app, limit, mode);
      if (!list.length) return "暂无重大事件记录";
      var lines = [];
      for (var i = 0; i < list.length; i++) lines.push(formatSeverityEvent(list[i]));
      return lines.join("\n");
    } catch (e) {
      return "读取重大事件失败：" + String(e);
    }
  }'''

text, count = block_pattern.subn(lambda match: replacement, text, count=1)
if count != 1:
    raise SystemExit("major fault aggregation block replacement failed")

install_anchor = '''  function installMajorSeverityRuntimeCard(proto) {
    if (!proto || proto.__toolHubMajorSeverityPatch === true) return;
    proto.getRecentAbnormalEventSummary = function(limit) {'''
install_replacement = '''  function installMajorSeverityRuntimeCard(proto) {
    if (!proto || proto.__toolHubMajorSeverityPatch === true) return;
    proto.getRecentMajorFaultGroups = function(limit) {
      try { return aggregateMajorAbnormalEvents(recentSeverityEvents(this, 80, "all"), limit || 8); }
      catch (e) { safeLog(this.L, "e", "get major fault groups fail error=" + String(e)); }
      return [];
    };
    proto.getMajorFaultSessionDetail = function(group) {
      try { return formatMajorFaultGroupDetail(group); }
      catch (e) { return "读取故障会话详情失败：" + String(e); }
    };
    proto.showMajorFaultSessionDetail = function(group) {
      try {
        if (!group) return false;
        var self = this;
        var detail = this.getMajorFaultSessionDetail(group);
        try { if (this.hideViewerPanel) this.hideViewerPanel(); } catch (eHide) {}
        var panel = this.buildViewerPanelView("故障会话详情", detail);
        var wrapped = null;
        if (this.wrapDraggablePanel) {
          wrapped = this.wrapDraggablePanel(panel, "故障会话详情", function() { self.hideViewerPanel(); });
          if (wrapped && wrapped.view) panel = wrapped.view;
        }
        var sw = Math.max(this.dp(320), Number(this.state && this.state.screen && this.state.screen.w || 0));
        var sh = Math.max(this.dp(480), Number(this.state && this.state.screen && this.state.screen.h || 0));
        var maxW = Math.max(this.dp(300), Math.floor(sw * 0.92));
        var maxH = Math.max(this.dp(320), Math.floor(sh * 0.80));
        panel.measure(
          android.view.View.MeasureSpec.makeMeasureSpec(maxW, android.view.View.MeasureSpec.AT_MOST),
          android.view.View.MeasureSpec.makeMeasureSpec(maxH, android.view.View.MeasureSpec.AT_MOST)
        );
        var pw = Math.max(this.dp(300), Math.min(maxW, Number(panel.getMeasuredWidth() || maxW)));
        var ph = Math.max(this.dp(320), Math.min(maxH, Number(panel.getMeasuredHeight() || maxH)));
        var lp = panel.getLayoutParams();
        if (!lp) lp = new android.view.ViewGroup.LayoutParams(pw, ph);
        else { lp.width = pw; lp.height = ph; }
        panel.setLayoutParams(lp);
        var pos = { x: Math.max(0, Math.floor((sw - pw) / 2)), y: Math.max(0, Math.floor((sh - ph) / 2)) };
        try {
          if (this.state && this.state.ballLp && this.getDockInfo && this.getBestPanelPosition) {
            var dock = this.getDockInfo();
            pos = this.getBestPanelPosition(pw, ph, this.state.ballLp.x, this.state.ballLp.y, dock.ballSize);
          }
        } catch (ePos) {}
        this.addPanel(panel, pos.x, pos.y, "major_fault_detail");
        if (wrapped && this.attachDragResizeListeners) {
          this.attachDragResizeListeners(panel, wrapped.header, wrapped.handles, "major_fault_detail");
        }
        try { this.touchActivity(); } catch (eTouch) {}
        return !!(this.state && this.state.addedViewer && this.state.viewerPanel === panel);
      } catch (e) {
        safeLog(this.L, "e", "show major fault session detail fail error=" + String(e));
        try { this.toast("故障会话详情显示失败"); } catch (eToast) {}
      }
      return false;
    };
    proto.getRecentAbnormalEventSummary = function(limit) {'''
if install_anchor not in text:
    raise SystemExit("major severity install anchor missing")
text = text.replace(install_anchor, install_replacement, 1)

refresh_pattern = re.compile(
    r'''          function refreshSeverityView\(\) \{\n            try \{.*?\n            \} catch \(eRefresh\) \{\n              safeLog\(self\.L, "w", "refresh major severity view fail error=" \+ String\(eRefresh\)\);\n            \}\n          \}''',
    re.S,
)
refresh_replacement = r'''          function refreshSeverityView() {
            try {
              title.setText(showAll ? "全部重大事件" : "最近故障会话");
              if (showAll) {
                try { summary.setMovementMethod(null); } catch (eMovementAll) {}
                summary.setText(self.getRecentMajorEventDetailSummary(16));
                try { summary.setContentDescription("全部重大事件"); } catch (eDescAll) {}
              } else {
                var groups = self.getRecentMajorFaultGroups ? self.getRecentMajorFaultGroups(8) : [];
                if (groups && groups.length) {
                  summary.setText(buildMajorFaultClickableSummary(self, groups, fg));
                  try { summary.setMovementMethod(android.text.method.LinkMovementMethod.getInstance()); } catch (eMovement) {}
                  try { summary.setLinksClickable(true); } catch (eLinks) {}
                  try { summary.setHighlightColor(android.graphics.Color.TRANSPARENT); } catch (eHighlight) {}
                  try { summary.setContentDescription("最近故障会话，点击任一会话查看详情"); } catch (eDesc) {}
                } else {
                  try { summary.setMovementMethod(null); } catch (eMovementEmpty) {}
                  summary.setText("暂无故障会话；正常会话与成功检查点已折叠");
                  try { summary.setContentDescription("暂无故障会话"); } catch (eDescEmpty) {}
                }
              }
              if (toggleButton) toggleButton.setText(showAll ? "只看异常" : "查看全部事件");
            } catch (eRefresh) {
              safeLog(self.L, "w", "refresh major severity view fail error=" + String(eRefresh));
            }
          }'''
text, count = refresh_pattern.subn(lambda match: refresh_replacement, text, count=1)
if count != 1:
    raise SystemExit("major fault clickable summary refresh replacement failed")

JS.write_text(text, encoding="utf-8")

verify = VERIFY.read_text(encoding="utf-8")
verify = verify.replace("< (1, 0, 6)", "< (1, 0, 7)", 1)
verify = verify.replace("baseline 1.0.6", "baseline 1.0.7", 1)
needle = '    "重复折叠",\n'
extra = '''    "getRecentMajorFaultGroups",\n    "getMajorFaultSessionDetail",\n    "showMajorFaultSessionDetail",\n    "formatMajorFaultGroupDetail",\n    "formatMajorFaultEventDetail",\n    "buildMajorFaultClickableSummary",\n    "android.text.style.ClickableSpan",\n    "android.text.method.LinkMovementMethod",\n    "故障会话详情",\n    "点击任一故障会话查看详情",\n    "完整事件顺序",\n    "Boot 判断",\n'''
if needle not in verify:
    raise SystemExit("major verifier detail insertion anchor missing")
verify = verify.replace(needle, needle + extra, 1)
verify = verify.replace(
    "session_aggregation=1 duplicate_collapse=1 crash_handler_singleton=1",
    "session_aggregation=1 duplicate_collapse=1 detail_view=1 clickable_fault_sessions=1 raw_event_order=1 pid_boot_evidence=1 crash_handler_singleton=1",
    1,
)
VERIFY.write_text(verify, encoding="utf-8")

content_verify = CONTENT_VERIFY.read_text(encoding="utf-8")
content_verify = content_verify.replace('// @version 1.0.6', '// @version 1.0.7', 1)
CONTENT_VERIFY.write_text(content_verify, encoding="utf-8")
