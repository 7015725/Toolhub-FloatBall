#!/usr/bin/env python3
import pathlib
import sys

root = pathlib.Path(__file__).resolve().parents[1]
panel_text = (root / "code" / "th_14_panels.js").read_text(encoding="utf-8")
icon_text = (root / "code" / "th_14_button_icon_editor.js").read_text(encoding="utf-8")
button_text = (root / "code" / "th_14_button_editor.js").read_text(encoding="utf-8")
text = panel_text + "\n" + icon_text + "\n" + button_text

checks = [
    ("manager has action chip helper for search/filter", "createButtonManagerActionChip" in text),
    ("manager has text action helper for sort mode", "createButtonManagerTextAction" in text),
    ("manager has type label helper", "getButtonManagerTypeLabel" in button_text),
    ("manager has compact summary helper", "getButtonManagerSummary" in button_text),
    ("manager has filter matcher", "matchesButtonManagerFilter" in button_text),
    ("manager has status chip helper", "createButtonManagerStatusChip" in button_text),
    ("manager has more button helper", "createButtonManagerMoreButton" in button_text),
    ("manager has action sheet fallback helper", "showButtonManagerActionSheet" in button_text),
    ("manager has dropdown helper", "showButtonManagerDropdown" in button_text),
    ("manager dropdown uses PopupWindow", "new android.widget.PopupWindow(context)" in button_text),
    ("manager dropdown passes anchor view", "onClickFn(v || tv)" in button_text),
    ("manager dropdown anchors to more button", "showAsDropDown(anchorView" in button_text),
    ("manager dropdown keeps fallback action sheet", "showButtonManagerActionSheet(opt)" in button_text),
    ("manager dropdown has polished header", "更多操作" in button_text and "headerH" in button_text and "btnCfg.title" in button_text),
    ("manager dropdown has icon and hint rows", "iconTv" in button_text and "hintTv" in button_text and "提前显示" in button_text and "从列表删除" in button_text),
    ("manager dropdown uses wider rounded menu", "var menuW = this.dp(224)" in button_text and "this.dp(18)" in button_text and "box.setClipToOutline(true)" in button_text),
    ("manager uses compact card marker", "按钮管理紧凑列表卡片：信息 + 状态 + 更多" in button_text),
    ("manager shows enabled/disabled count", "共 \" + buttons.length + \" 个 · 启用 \" + enabledCount + \" · 暂停 \" + disabledCount" in button_text),
    ("manager has filter chips", "buttonManagerFilter" in button_text and "快捷方式" in button_text and "broadcast" in button_text),
    ("manager has sort mode", "buttonManagerSortMode" in button_text and "sortMode ? \"完成\" : \"排序\"" in button_text),
    ("manager action sheet keeps deferred save wording", "点保存布置生效" in button_text and "点不改了可撤销" in button_text),
    ("manager list item toggle is deferred", "已暂停，点保存布置生效" in button_text and "已启用，点保存布置生效" in button_text),
    ("manager save buttons only from list footer", button_text.count("ConfigManager.saveButtons(buttons)") == 1),
    ("editor save writes tempButtons only", "编辑页只写入 tempButtons" in button_text and "已暂存，请在列表页点击保存布置" in button_text),
    ("manager no old two-row card marker", "按钮管理列表卡片：上信息、下操作" not in button_text),
    ("manager no old always-visible card action row", "actions.setPadding(self.dp(42), 0, 0, 0)" not in button_text),
    ("manager no false long-press sort text", "长按卡片排序" not in text),
    ("manager no homepage block text", "按钮管理首页" not in text),
    ("manager list footer uses remaining-height scroll", "scrollLp.weight = 1" in button_text),
    ("manager list footer has equal buttons and bottom gap", "btnListCancelLp.weight = 1" in button_text and "btnListSaveLp.weight = 1" in button_text and "listBottomLp.setMargins(0, self.dp(6), 0, self.dp(12))" in button_text),
    ("editor no useless workbench", "按钮编辑工作台" not in text and "createButtonEditorHeroCard" not in text),
    ("editor has field spacing helper", "addButtonEditorField" in text),
    ("editor fixed footer has equal buttons and 48dp touch height", "btnCancelLp.weight = 1" in text and "btnSaveLp.weight = 1" in text and "var btnCancelLp = new android.widget.LinearLayout.LayoutParams(0, self.dp(48))" in text and "var btnSaveLp = new android.widget.LinearLayout.LayoutParams(0, self.dp(48))" in text),
    ("editor section descriptions are concise", "按钮名称" in text and "图标和颜色" in text and "点击后做什么" in text and "先填写名称，便于在按钮管理列表中识别" not in text and "选择点击后执行的动作类型与参数" not in text),
]

failed = [name for name, ok in checks if not ok]
if failed:
    print("Button manager/editor layout verification FAILED:")
    for name in failed:
        print(" - " + name)
    sys.exit(1)
print("Button manager/editor layout verification OK")
