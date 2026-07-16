#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "code" / "th_14_panels.js"
VERIFY = ROOT / "scripts" / "verify_update_version_page.py"

text = PATH.read_text(encoding="utf-8")
if "// @version 1.1.4" not in text:
    raise SystemExit("unexpected th_14_panels.js version")
text = text.replace("// @version 1.1.4", "// @version 1.1.5", 1)

start_marker = "FloatBallAppWM.prototype.getSettingsHomeCategoryDefs = function(useMonetHome) {"
end_marker = "\n\nFloatBallAppWM.prototype.startColorSafetyRuntimeSelfTestFromSettings"
start = text.find(start_marker)
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit("settings home category function not found")

replacement = '''FloatBallAppWM.prototype.getSettingsHomeCategoryDefs = function(useMonetHome) {
  var defs = this.getSettingsGroupDefs ? this.getSettingsGroupDefs() : [];
  var cats = [];
  var used = {};
  function addChild(arr, id, title, desc, icon, kind, key) {
    arr.push({ id: id, title: title, desc: desc, icon: icon, kind: kind, key: key });
  }
  function findDef(key) {
    for (var i = 0; i < defs.length; i++) if (defs[i] && String(defs[i].key) === String(key)) return defs[i];
    return null;
  }
  function addGroupChild(arr, key) {
    var d = findDef(key);
    if (!d) return;
    addChild(arr, String(d.key), d.title, d.desc, this.getSettingsHomeIcon ? this.getSettingsHomeIcon(d.title) : "✦", "group", d.key);
    used[String(d.key)] = true;
  }
  if (useMonetHome) {
    var all = [];
    addChild(all, "tools", "工具", "添加、整理和排序工具入口", "▣", "route", "btn_editor");
    addGroupChild.call(this, all, "ball");
    addGroupChild.call(this, all, "pointer");
    addGroupChild.call(this, all, "panel");
    addGroupChild.call(this, all, "motion");
    addGroupChild.call(this, all, "theme");
    addChild(all, "schema", "高级设置", "编辑设置页结构和高级配置", "◇", "route", "schema_editor");
    addChild(all, "update", "更新与版本", this.getToolHubUpdateHomeSummary ? this.getToolHubUpdateHomeSummary() : "查看版本、更新状态与历史记录", "↻", "route", "update");
    addGroupChild.call(this, all, "debug");
    for (var m = 0; m < defs.length; m++) {
      var dm = defs[m];
      if (!dm || used[String(dm.key)]) continue;
      addChild(all, String(dm.key), dm.title, dm.desc, this.getSettingsHomeIcon ? this.getSettingsHomeIcon(dm.title) : "✦", "group", dm.key);
      used[String(dm.key)] = true;
    }
    cats.push({ id: "all", icon: "▦", title: "工具与配置", desc: "集中管理全部设置入口", children: all });
    return cats;
  }

  var layout = [];
  addChild(layout, "tools", "工具", "添加、整理和排序工具入口", "▣", "route", "btn_editor");
  cats.push({ id: "layout", icon: "▣", title: "布局与管理", desc: "工具入口与面板结构", children: layout });

  var fun = [];
  addGroupChild.call(this, fun, "ball");
  addGroupChild.call(this, fun, "pointer");
  addGroupChild.call(this, fun, "panel");
  cats.push({ id: "fun", icon: "○", title: "悬浮球与面板", desc: "悬浮球、工具面板和位置行为", children: fun });

  var look = [];
  addGroupChild.call(this, look, "motion");
  addGroupChild.call(this, look, "theme");
  cats.push({ id: "look", icon: "◎", title: "互动与外观", desc: "动作、手势和视觉样式", children: look });

  var record = [];
  addChild(record, "schema", "高级设置", "编辑设置页结构和高级配置，适合进阶用户", "◇", "route", "schema_editor");
  addChild(record, "update", "更新与版本", this.getToolHubUpdateHomeSummary ? this.getToolHubUpdateHomeSummary() : "查看版本、更新状态与历史记录", "↻", "route", "update");
  addGroupChild.call(this, record, "debug");
  cats.push({ id: "record", icon: "☰", title: "高级与维护", desc: "高级设置、更新和运行记录", children: record });

  var other = [];
  for (var x = 0; x < defs.length; x++) {
    var dx = defs[x];
    if (!dx || used[String(dx.key)]) continue;
    addChild(other, String(dx.key), dx.title, dx.desc, this.getSettingsHomeIcon ? this.getSettingsHomeIcon(dx.title) : "✦", "group", dx.key);
  }
  if (other.length > 0) cats.push({ id: "other", icon: "✦", title: "其他可用分类", desc: "更多设置入口", children: other });
  return cats;
};'''

text = text[:start] + replacement + text[end:]
PATH.write_text(text, encoding="utf-8")

verify = VERIFY.read_text(encoding="utf-8")
anchor = '    "统一设置项保留卡片阴影": "row.setElevation(this.dp(1))" in TH14,\n'
addition = '''    "设置首页使用显式合理顺序": all(marker in TH14 for marker in [
        'addChild(all, "tools"',
        'addGroupChild.call(this, all, "ball")',
        'addGroupChild.call(this, all, "pointer")',
        'addGroupChild.call(this, all, "panel")',
        'addGroupChild.call(this, all, "motion")',
        'addGroupChild.call(this, all, "theme")',
        'addChild(all, "schema"',
        'addChild(all, "update"',
        'addGroupChild.call(this, all, "debug")',
    ]) and TH14.index('addChild(all, "tools"') < TH14.index('addGroupChild.call(this, all, "ball")') < TH14.index('addGroupChild.call(this, all, "pointer")') < TH14.index('addGroupChild.call(this, all, "panel")') < TH14.index('addGroupChild.call(this, all, "motion")') < TH14.index('addGroupChild.call(this, all, "theme")') < TH14.index('addChild(all, "schema"') < TH14.index('addChild(all, "update"') < TH14.index('addGroupChild.call(this, all, "debug")'),
'''
if anchor not in verify:
    raise SystemExit("verification anchor not found")
verify = verify.replace(anchor, anchor + addition, 1)
VERIFY.write_text(verify, encoding="utf-8")
print("settings home order patch applied")
