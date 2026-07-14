#!/usr/bin/env python3
# 验证主面板固定操作收纳到更多菜单，编辑模式保存/取消入口保持固定。

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "code" / "th_15_main_panel.js"
WORKFLOW_PATH = ROOT / ".github" / "workflows" / "verify.yml"
SOURCE = MODULE_PATH.read_text(encoding="utf-8")
WORKFLOW = WORKFLOW_PATH.read_text(encoding="utf-8")


def fail(message):
    raise SystemExit("FAIL main-panel-more-menu: " + message)


def require(text, fragment, label):
    if fragment not in text:
        fail("missing %s: %s" % (label, fragment))


def forbid(text, fragment, label):
    if fragment in text:
        fail("forbidden %s: %s" % (label, fragment))


version = re.search(r"(?m)^// @version ([0-9]+\.[0-9]+\.[0-9]+)$", SOURCE)
if not version or version.group(1) != "1.5.5":
    fail("expected th_15_main_panel.js version 1.5.5")

if SOURCE.count("FloatBallAppWM.prototype.showMainPanelMoreMenu = function") != 1:
    fail("showMainPanelMoreMenu must have exactly one definition")

forbid(
    SOURCE,
    "createMainPanelToolbarButton('⚙', '设置'",
    "fixed settings toolbar button",
)
forbid(
    SOURCE,
    "createMainPanelToolbarButton('≡', '编辑布局'",
    "fixed edit-layout toolbar button",
)

for marker, label in (
    ("普通模式只保留更多和关闭；设置与编辑布局收纳到更多菜单", "toolbar rationale"),
    ("createMainPanelToolbarButton('⋮', '更多'", "overflow toolbar button"),
    ("createMainPanelToolbarButton('×', '关闭'", "close toolbar button"),
    ("createMainPanelToolbarButton('×', '取消排序'", "edit cancel toolbar action"),
    ("createMainPanelToolbarButton('✓', '保存排序'", "edit save toolbar action"),
    ("row.setClickable(true)", "menu click semantics"),
    ("row.setFocusable(true)", "menu focus semantics"),
    ("row.setContentDescription(String(label))", "menu accessibility description"),
    ("function addDivider()", "menu divider builder"),
    ("addItem('设置'", "settings menu entry"),
    ("addItem('编辑布局'", "edit-layout menu entry"),
    ("addDivider();", "primary/secondary menu divider"),
    ("addItem('按钮管理'", "button manager retained"),
    ("addItem('刷新面板'", "refresh retained"),
    ("addItem('帮助'", "help retained"),
    ("this.dp(editMode === true ? 180 : 236)", "unchanged toolbar width floor"),
):
    require(SOURCE, marker, label)

menu_start = SOURCE.find("FloatBallAppWM.prototype.showMainPanelMoreMenu = function")
menu_end = SOURCE.find("FloatBallAppWM.prototype.updateMainPanelPageDots = function", menu_start)
if menu_start < 0 or menu_end <= menu_start:
    fail("cannot isolate more menu")
menu = SOURCE[menu_start:menu_end]

ordered = (
    "addItem('设置'",
    "addItem('编辑布局'",
    "addDivider();",
    "addItem('按钮管理'",
    "addItem('刷新面板'",
    "addItem('帮助'",
)
last = -1
for fragment in ordered:
    pos = menu.find(fragment)
    if pos < 0 or pos <= last:
        fail("menu order invalid at: " + fragment)
    last = pos

settings_start = menu.find("addItem('设置'")
settings_end = menu.find("addItem('编辑布局'", settings_start)
settings = menu[settings_start:settings_end]
hide_pos = settings.find("self.hideMainPanel(true)")
show_pos = settings.find("self.showPanelAvoidBall('settings')")
if hide_pos < 0 or show_pos < 0 or hide_pos >= show_pos:
    fail("settings action must close main panel before opening settings")

edit_start = menu.find("addItem('编辑布局'")
edit_end = menu.find("addDivider();", edit_start)
edit_action = menu[edit_start:edit_end]
require(edit_action, "self.startMainPanelEditMode()", "edit mode action")
forbid(edit_action, "self.hideMainPanel(true)", "duplicate edit-mode close")

item_start = menu.find("function addItem(label, action)")
item_end = menu.find("function addDivider()", item_start)
item = menu[item_start:item_end]
dismiss_pos = item.find("popup.dismiss()")
action_pos = item.find("action();")
if dismiss_pos < 0 or action_pos < 0 or dismiss_pos >= action_pos:
    fail("menu item must dismiss popup before executing action")

require(
    WORKFLOW,
    "python3 scripts/verify_main_panel_more_menu.py",
    "workflow verification",
)

raw = MODULE_PATH.read_bytes()
if not raw.endswith(b"\n") or raw.endswith(b"\n\n"):
    fail("module EOF must be exactly one LF")

print(
    "OK main_panel_more_menu toolbar=more+close "
    "primary=settings+edit secondary=manager+refresh+help"
)
