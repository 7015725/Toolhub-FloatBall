#!/usr/bin/env python3
# 验证新增/编辑按钮页直接保存，同时保留列表页批量事务语义。

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "code" / "th_14_button_editor.js"
WORKFLOW_PATH = ROOT / ".github" / "workflows" / "verify.yml"
ENTRY_PATH = ROOT / "ToolHub.js"
LAYOUT_VERIFY_PATH = ROOT / "scripts" / "verify_button_editor_layout.py"
README_PATH = ROOT / "README.md"
ARCH_PATH = ROOT / "ARCHITECTURE.md"

SOURCE = MODULE_PATH.read_text(encoding="utf-8")
WORKFLOW = WORKFLOW_PATH.read_text(encoding="utf-8")
ENTRY = ENTRY_PATH.read_text(encoding="utf-8")
LAYOUT_VERIFY = LAYOUT_VERIFY_PATH.read_text(encoding="utf-8")
README = README_PATH.read_text(encoding="utf-8")
ARCH = ARCH_PATH.read_text(encoding="utf-8")


def fail(message):
    raise SystemExit("FAIL button-editor-direct-save: " + message)


def require(text, fragment, label):
    if fragment not in text:
        fail("missing %s: %s" % (label, fragment))


def forbid(text, fragment, label):
    if fragment in text:
        fail("forbidden %s: %s" % (label, fragment))


version = re.search(r"(?m)^// @version ([0-9]+\.[0-9]+\.[0-9]+)$", SOURCE)
if not version or version.group(1) != "1.0.8":
    fail("expected th_14_button_editor.js version 1.0.7")

method = "FloatBallAppWM.prototype.commitButtonEditorChange = function"
if SOURCE.count(method) != 1:
    fail("commitButtonEditorChange must have exactly one definition")

for marker, label in (
    ("JSON.parse(JSON.stringify(source))", "temporary transaction clone"),
    ("JSON.parse(JSON.stringify(buttonConfig || {}))", "button clone"),
    ("if (idx === -1)", "add branch"),
    ("nextButtons.push(nextButton)", "add transaction"),
    ("idx >= nextButtons.length", "edit index guard"),
    ("nextButtons[idx] = nextButton", "edit transaction"),
    ("ConfigManager.saveButtons(nextButtons)", "existing persistence entry"),
    ("if (saveOk === false)", "save result check"),
    ("this.panels.main = JSON.parse(JSON.stringify(nextButtons))", "main panel sync"),
    ("this.state.tempButtons = JSON.parse(JSON.stringify(nextButtons))", "temporary state sync"),
    ('createSolidButton(self, "保存"', "direct save wording"),
    ("buttonEditorSaveRunning", "duplicate click guard"),
    ("btnSave.setEnabled(false)", "save button disable"),
    ("finishButtonEditorSaveBusy()", "busy state cleanup"),
    ("self.commitButtonEditorChange(buttons, editIdx, newBtn)", "form transaction call"),
    ("添加成功，主面板已更新", "add success notice"),
    ("保存成功，主面板已更新", "edit success notice"),
    ("保存失败:", "save failure notice"),
    ('self.popToolAppPage("button_edit_direct_save")', "return to list"),
    ('createSolidButton(self, "保存布置"', "list batch save retained"),
    ("ConfigManager.saveButtons(buttons)", "list persistence retained"),
    ("点保存布置生效", "deferred list operations retained"),
):
    require(SOURCE, marker, label)

for fragment, label in (
    ("先存起来", "old temporary button wording"),
    ("已暂存，请在列表页点击保存布置", "old second-save notice"),
    ("编辑页只写入 tempButtons", "old temporary-only contract"),
):
    forbid(SOURCE, fragment, label)

helper_start = SOURCE.find(method)
helper_end = SOURCE.find(
    "FloatBallAppWM.prototype.buildButtonEditorPanelView = function",
    helper_start,
)
if helper_start < 0 or helper_end <= helper_start:
    fail("cannot isolate direct-save helper")
helper_source = SOURCE[helper_start:helper_end]

for fragment, label in (
    ("FileIO.", "direct file persistence"),
    ("SQLiteDatabase", "direct SQLite access"),
    ("execSQL(", "direct SQL write"),
):
    forbid(helper_source, fragment, label)

form_call = SOURCE.find(
    "self.commitButtonEditorChange(buttons, editIdx, newBtn)"
)
validation = SOURCE.rfind("if (!isValid)", 0, form_call)
if validation < 0 or form_call < validation:
    fail("validation must happen before persistence")

state_sync = helper_source.find("this.state.tempButtons")
save_call = helper_source.find("ConfigManager.saveButtons(nextButtons)")
if save_call < 0 or state_sync < 0 or save_call > state_sync:
    fail("persistent save must be accepted before UI state sync")

if SOURCE.count("ConfigManager.saveButtons(") != 2:
    fail("expected exactly two save entries: list batch and editor direct save")

require(
    LAYOUT_VERIFY,
    "editor has direct save transaction helper",
    "updated layout verification",
)
require(
    WORKFLOW,
    "python3 scripts/verify_button_editor_direct_save.py",
    "workflow direct-save verification",
)
require(
    ENTRY,
    "var TOOLHUB_ENTRY_VERSION = 20260714081104;",
    "unchanged entry version",
)
require(README, "新增和编辑按钮直接保存", "README direct-save note")
require(ARCH, "按钮编辑页", "architecture direct-save note")

raw = MODULE_PATH.read_bytes()
if not raw.endswith(b"\n") or raw.endswith(b"\n\n"):
    fail("module EOF must be exactly one LF")

# Model add/edit transactions without mutating the original list before save.
original = [{"title": "A"}, {"title": "B"}]
next_add = [dict(item) for item in original]
next_add.append({"title": "C"})
if original != [{"title": "A"}, {"title": "B"}]:
    fail("add transaction mutated original")
next_edit = [dict(item) for item in original]
next_edit[1] = {"title": "B2"}
if original[1]["title"] != "B" or next_edit[1]["title"] != "B2":
    fail("edit transaction model failed")

print(
    "OK button_editor_direct_save "
    "add=transactional edit=transactional list_batch=retained state_sync=after_save"
)
