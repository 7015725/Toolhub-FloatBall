#!/usr/bin/env python3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "code" / "th_08_content.js"
VERIFY = ROOT / "scripts" / "verify_major_event_logging.py"
CONTENT_VERIFY = ROOT / "scripts" / "verify_content_security.py"

text = JS.read_text(encoding="utf-8")
text = text.replace("// @version 1.0.5", "// @version 1.0.6", 1)

anchor = '''  function recentSeverityEvents(app, limit, mode) {'''
if anchor not in text:
    raise SystemExit("recentSeverityEvents anchor missing")

helpers = r'''  function majorFaultSessionKey(item) {
    var root = String(item && (item.previousSid || item.sid) || "");
    if (root) return "session:" + root;
    return "fallback:" + [
      String(item && item.classification || ""),
      String(item && item.test || ""),
      String(item && (item.phase || item.lastPhase) || ""),
      String(item && item.target || ""),
      String(item && item.which || "")
    ].join(":");
  }
  function majorFaultDuplicateKey(item) {
    return [
      String(item && item.event || ""),
      String(item && item.type || ""),
      String(item && (item.phase || item.lastPhase) || ""),
      String(item && item.classification || ""),
      String(item && item.test || ""),
      String(item && item.target || ""),
      String(item && item.which || ""),
      String(item && item.status || ""),
      String(item && item.error || "")
    ].join("|");
  }
  function majorFaultPriority(item) {
    var severity = majorSeverityOf(item);
    var base = severity === "fatal" ? 300 : (severity === "error" ? 200 : 100);
    var event = String(item && item.event || "");
    if (event === "UNCAUGHT") return base + 60;
    if (event === "TEST_INTERRUPTED") return base + 50;
    if (event === "RECOVERED_INTERRUPTION") return base + 40;
    if (event === "INCIDENT") return base + 30;
    if (event === "TEST_END") return base + 20;
    if (event === "CHECKPOINT") return base + 10;
    return base;
  }
  function majorFaultEvidenceLabel(item) {
    var label = eventLabel(item && item.event);
    var phase = String(item && (item.phase || item.lastPhase) || "");
    var type = String(item && item.type || "");
    if (item && item.event === "CHECKPOINT" && phase) label += "(" + phase + ")";
    else if (item && item.event === "INCIDENT" && type) label += "(" + type + ")";
    return label;
  }
  function aggregateMajorAbnormalEvents(list, limit) {
    var groups = [], byKey = {};
    var n = Math.floor(Number(limit || 8));
    if (isNaN(n) || n < 1) n = 8;
    if (n > 12) n = 12;
    for (var i = 0; i < list.length; i++) {
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
          fingerprints: {}
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
    if (groups.length > n) groups = groups.slice(groups.length - n);
    return groups;
  }
  function formatMajorFaultGroup(group) {
    var item = group && group.representative ? group.representative : {};
    var parts = [];
    parts.push(String(group && group.lastTime || item.time || "").substring(5));
    parts.push("故障会话");
    if (item.classification) parts.push("分类=" + String(item.classification));
    if (item.test) parts.push("测试=" + String(item.test));
    if (item.lastPhase || item.phase) parts.push("最后阶段=" + String(item.lastPhase || item.phase));
    if (item.which) parts.push("面板=" + String(item.which));
    if (item.target) parts.push("目标=" + String(item.target));
    if (group && group.evidence && group.evidence.length) parts.push("证据=" + group.evidence.join(" > "));
    if (group && group.count > 1) parts.push("事件=" + String(group.count));
    if (group && group.duplicateCount > 0) parts.push("重复折叠=" + String(group.duplicateCount));
    return majorSeverityLabel(group && group.severity || majorSeverityOf(item)) + " " + parts.join(" · ");
  }
'''
text = text.replace(anchor, helpers + anchor, 1)

recent_pattern = re.compile(r'''  function recentSeverityEvents\(app, limit, mode\) \{.*?\n  \}\n  function severitySummary\(app, limit, mode\) \{.*?\n  \}''', re.S)
recent_replacement = r'''  function recentSeverityEvents(app, limit, mode) {
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
    if (mode !== "abnormal" && out.length > n) out = out.slice(out.length - n);
    return out;
  }
  function severitySummary(app, limit, mode) {
    try {
      var list = recentSeverityEvents(app, limit, mode);
      if (mode === "abnormal") {
        var groups = aggregateMajorAbnormalEvents(list, limit);
        if (!groups.length) return "暂无故障会话；正常会话与成功检查点已折叠";
        var faultLines = [];
        for (var gi = 0; gi < groups.length; gi++) faultLines.push(formatMajorFaultGroup(groups[gi]));
        return faultLines.join("\n");
      }
      if (!list.length) return "暂无重大事件记录";
      var lines = [];
      for (var i = 0; i < list.length; i++) lines.push(formatSeverityEvent(list[i]));
      return lines.join("\n");
    } catch (e) {
      return "读取重大事件失败：" + String(e);
    }
  }'''
text, count = recent_pattern.subn(recent_replacement, text, count=1)
if count != 1:
    raise SystemExit("severity summary block replacement failed")

text = text.replace('normalized === "all" ? "ToolHub 全部重大事件" : "ToolHub 异常事件"', 'normalized === "all" ? "ToolHub 全部重大事件" : "ToolHub 故障会话摘要"', 1)
text = text.replace('try { this.toast(normalized === "all" ? "全部重大事件已复制" : "异常事件已复制"); }', 'try { this.toast(normalized === "all" ? "全部重大事件已复制" : "故障会话摘要已复制"); }', 1)
text = text.replace('title.setText(showAll ? "全部重大事件" : "最近异常事件");', 'title.setText(showAll ? "全部重大事件" : "最近故障会话");', 1)

JS.write_text(text, encoding="utf-8")

verify = VERIFY.read_text(encoding="utf-8")
verify = verify.replace("< (1, 0, 5)", "< (1, 0, 6)", 1)
verify = verify.replace("baseline 1.0.5", "baseline 1.0.6", 1)
needle = '    "复制当前摘要",\n'
extra = '''    "majorFaultSessionKey",\n    "majorFaultDuplicateKey",\n    "aggregateMajorAbnormalEvents",\n    "formatMajorFaultGroup",\n    "最近故障会话",\n    "故障会话",\n    "重复折叠",\n'''
if needle not in verify:
    raise SystemExit("verify insertion anchor missing")
verify = verify.replace(needle, needle + extra, 1)
verify = verify.replace("severity_filter=1 details_toggle=1", "severity_filter=1 details_toggle=1 session_aggregation=1 duplicate_collapse=1", 1)
VERIFY.write_text(verify, encoding="utf-8")

content_verify = CONTENT_VERIFY.read_text(encoding="utf-8")
content_verify = content_verify.replace('// @version 1.0.5', '// @version 1.0.6')
content_verify = content_verify.replace('"// @version 1.0.5" in content', '"// @version 1.0.6" in content')
CONTENT_VERIFY.write_text(content_verify, encoding="utf-8")
