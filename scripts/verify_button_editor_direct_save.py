#!/usr/bin/env python3
# 验证新增/编辑按钮页直接保存、应用选择器和按钮类型清理。

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "code" / "th_14_button_editor.js"
ACTION_PATH = ROOT / "code" / "th_11_action.js"
WORKFLOW_PATH = ROOT / ".github" / "workflows" / "verify.yml"
ENTRY_PATH = ROOT / "ToolHub.js"
LAYOUT_VERIFY_PATH = ROOT / "scripts" / "verify_button_editor_layout.py"
README_PATH = ROOT / "README.md"
ARCH_PATH = ROOT / "ARCHITECTURE.md"

SOURCE = MODULE_PATH.read_text(encoding="utf-8")
ACTION = ACTION_PATH.read_text(encoding="utf-8")
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
if not version or version.group(1) != "1.1.3":
    fail("expected th_14_button_editor.js version 1.1.3")

action_version = re.search(r"(?m)^// @version ([0-9]+\.[0-9]+\.[0-9]+)$", ACTION)
if not action_version or action_version.group(1) != "1.1.1":
    fail("expected th_11_action.js version 1.1.1")

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
    ("this.normalizeButtonEditorButtons(nextButtons)", "save normalization"),
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
    ("ConfigManager.saveButtons(normalizedButtons)", "normalized list persistence"),
    ("点保存布置生效", "deferred list operations retained"),
):
    require(SOURCE, marker, label)

for marker, label in (
    ("FloatBallAppWM.prototype.normalizeButtonEditorButtons", "legacy type normalizer"),
    ('if (t === "open_settings")', "internal settings removal"),
    ('if (t === "intent")', "legacy intent migration"),
    ('b.cmd = "am start " + shellQuote(legacyIntent)', "intent-to-shell conversion"),
    ("FloatBallAppWM.prototype.buildButtonAppPickerInline", "app picker helper"),
    ("launcherApps.getActivityList(null, userHandle)", "per-user app enumeration"),
    ("列出用户应用", "user app filter"),
    ("列出系统应用", "system app filter"),
    ("列出分身/其他用户应用", "other-user app filter"),
    ("selectedPkg: str(targetBtn.pkg)", "picker package state"),
    ("selectedUserId: initialUserId", "picker user state"),
    ("getPkg: function()", "picker package getter"),
    ("getUserId: function()", "picker user getter"),
    ("appPickerInline.getPkg()", "picker package save"),
    ("appPickerInline.getUserId()", "picker user save"),
):
    require(SOURCE, marker, label)

for fragment, label in (
    ('val: "open_settings"', "user-facing settings type"),
    ('{ key: "open_settings", label: "设置" }', "settings manager filter"),
    ('if (t === "intent") return "Intent"', "intent type label"),
    ('if (t === "intent") return String(b.intent', "intent summary"),
    ('应用包名 (Package)', "app package editor field"),
    ('启动用户ID (', "app user editor field"),
    ("inputPkg", "app package input object"),
    ("inputAppLaunchUser", "app user input object"),
    ("先存起来", "old temporary button wording"),
    ("已暂存，请在列表页点击保存布置", "old second-save notice"),
    ("编辑页只写入 tempButtons", "old temporary-only contract"),
):
    forbid(SOURCE, fragment, label)

# 快捷方式保存以 pkg + shortcutId + userId 为结构化标识；intentUri 仅作为可选后备。
require(SOURCE, 'newBtn.shortcutExecMode = "intent"', "shortcut structured mode retained")
require(SOURCE, "if (_scIntentUri) newBtn.intentUri = _scIntentUri", "optional shortcut intentUri save")
require(SOURCE, "else delete newBtn.intentUri", "missing shortcut intentUri accepted")
forbid(SOURCE, "请选择包含 intentUri 的快捷方式", "obsolete mandatory intentUri validation")
require(SOURCE, "button editor validation blocked type=", "validation diagnostics")
require(SOURCE, "var dangerColor = T.danger || C.danger", "visible danger notice color")

for marker, label in (
    ("launcherApps.getActivityList(pkg, userHandle)", "profile launch activity resolution"),
    ("context.startActivityAsUser(it, userHandle)", "profile startActivityAsUser"),
    ("launcherApps.startMainActivity", "profile launcher fallback"),
    ("分身启动失败时不能回退到主用户", "no wrong-user fallback contract"),
    ("launcherApps.startShortcut(spkg, sid, null, null, shortcutUser)", "shortcut launcher primary path"),
    ("shortcut(intentUri fallback)", "shortcut intentUri fallback path"),
):
    require(ACTION, marker, label)

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
    "var TOOLHUB_ENTRY_VERSION = 20260718213000;",
    "current entry version",
)
require(README, "新增和编辑按钮直接保存", "README direct-save note")
require(ARCH, "按钮编辑页", "architecture direct-save note")

for path in (MODULE_PATH, ACTION_PATH):
    raw = path.read_bytes()
    if not raw.endswith(b"\n") or raw.endswith(b"\n\n"):
        fail("%s EOF must be exactly one LF" % path.name)

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
    "add=transactional edit=transactional list_batch=normalized "
    "app_picker=users_system_profiles app_fields=picker_only "
    "shortcut=launcher_primary_intent_optional intent_type=removed settings_type=removed"
)
