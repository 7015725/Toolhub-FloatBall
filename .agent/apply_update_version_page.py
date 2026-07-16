#!/usr/bin/env python3
"""One-shot repository migration for the ToolHub update-and-version page."""
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def write(rel, text):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError("%s anchor count=%d" % (label, count))
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label):
    out, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError("%s regex count=%d" % (label, count))
    return out


def patch_runtime():
    th03 = read("code/th_03_icon.js")
    th03 = replace_once(th03, "// @version 2.0.0", "// @version 2.0.1", "th03 version")
    marker = "// =======================【更新完成后自动重启生效】======================="
    if marker not in th03:
        raise RuntimeError("th03 auto restart marker missing")
    th03 = th03.split(marker, 1)[0].rstrip() + "\n"
    write("code/th_03_icon.js", th03)

    th14 = read("code/th_14_panels.js")
    th14 = replace_once(th14, "// @version 1.0.27", "// @version 1.1.0", "th14 version")
    th14 = replace_once(
        th14,
        "FloatBallAppWM.prototype.createSettingsHomeEntry = function(parent, title, desc, actionText, onClick) {\n  var self = this;",
        "FloatBallAppWM.prototype.createSettingsHomeEntry = function(parent, title, desc, actionText, onClick) {\n  if (String(title || \"\") === \"更新与版本\" && this.createToolHubUpdateHomeEntry) return this.createToolHubUpdateHomeEntry(parent, title, this.getToolHubUpdateHomeSummary ? this.getToolHubUpdateHomeSummary() : desc, onClick);\n  var self = this;",
        "settings update home entry",
    )
    th14 = replace_once(
        th14,
        "FloatBallAppWM.prototype.createToolHubUpdatePill = function(expanded, compact, onToggle) {\n  var self = this;",
        "FloatBallAppWM.prototype.createToolHubUpdatePill = function(expanded, compact, onToggle) {\n  return null;\n  var self = this;",
        "disable old update pill",
    )
    th14 = replace_once(
        th14,
        "FloatBallAppWM.prototype.maybeAutoCheckToolHubUpdatesFromSettings = function() {\n  var self = this;",
        "FloatBallAppWM.prototype.maybeAutoCheckToolHubUpdatesFromSettings = function() {\n  return false;\n  var self = this;",
        "disable build-time update check",
    )
    th14 = replace_once(
        th14,
        "FloatBallAppWM.prototype.startToolHubModuleUpdateFromSettings = function(anchorView) {\n  var self = this;",
        "FloatBallAppWM.prototype.startToolHubModuleUpdateFromSettings = function(anchorView) {\n  if (this.startToolHubModuleUpdateDeterministic) return this.startToolHubModuleUpdateDeterministic(anchorView);\n  var self = this;",
        "delegate legacy update entry",
    )
    th14 = replace_once(
        th14,
        "  if (useMonetHome) {\n    var all = [];",
        "  if (useMonetHome) {\n    var all = [];\n    addChild(all, \"update\", \"更新与版本\", this.getToolHubUpdateHomeSummary ? this.getToolHubUpdateHomeSummary() : \"查看版本、更新状态与历史记录\", \"↻\", \"route\", \"update\");",
        "insert update home category",
    )
    extension = read(".agent/update_extension.js")
    split_marker = "  function installUpdatePageIntegrationOnce()"
    if split_marker not in extension:
        raise RuntimeError("update extension split marker missing")
    extension = extension.split(split_marker, 1)[0].rstrip() + "\n})();\n"
    if "【更新与版本页面】" not in th14:
        th14 = th14.rstrip() + "\n\n" + extension
    write("code/th_14_panels.js", th14)

    th15 = read("code/th_15_extra.js")
    th15 = replace_once(th15, "// @version 1.1.18", "// @version 1.1.19", "th15 version")
    th15 = replace_once(
        th15,
        '  if (type === "settings" || type === "settings_group") return this.buildSettingsPanelView();',
        '  if (type === "settings" || type === "settings_group") return this.buildSettingsPanelView();\n  if (type === "update") return this.buildToolHubUpdateVersionPanelView();',
        "build update route",
    )
    th15 = replace_once(
        th15,
        '  return r === "settings" || r === "settings_group" || r === "btn_editor" || r === "schema_editor";',
        '  return r === "settings" || r === "settings_group" || r === "btn_editor" || r === "schema_editor" || r === "update";',
        "register update route",
    )
    th15 = replace_once(
        th15,
        '  if (r === "settings") return "设置";',
        '  if (r === "settings") return "设置";\n  if (r === "update") return "更新与版本";',
        "update route title",
    )
    th15 = replace_once(
        th15,
        "FloatBallAppWM.prototype.pushToolAppPage = function(route) {\n  if (!this.isToolAppRoute(route)) return;",
        "FloatBallAppWM.prototype.pushToolAppPage = function(route) {\n  if (!this.isToolAppRoute(route)) return;\n  if (String(route || \"\") === \"update\") {\n    try { if (this.ensureToolHubUpdateUiState) this.ensureToolHubUpdateUiState(); } catch(eUpdateInit) {}\n    this.state.toolAppSubPage = 1;\n    this.state.toolAppSubKey = \"\";\n    this.state.toolHubUpdateConfirmVisible = false;\n    try { if (this.ensureToolHubUpdateHistoryLoaded) this.ensureToolHubUpdateHistoryLoaded(false); } catch(eHistoryInit) {}\n  }",
        "initialize update route",
    )
    write("code/th_15_extra.js", th15)

    th16 = read("code/th_16_entry.js")
    th16 = replace_once(th16, "// @version 1.0.15", "// @version 1.0.16", "th16 version")
    th16 = replace_once(
        th16,
        '    safeLog(this.L, \'i\', "TOOLAPP_BUILD_DONE route=" + r + " " + this.toolAppThreadInfo());\n    return true;',
        '    safeLog(this.L, \'i\', "TOOLAPP_BUILD_DONE route=" + r + " " + this.toolAppThreadInfo());\n    if (r === "settings" && resetStack === true && this.onToolHubSettingsEntered) {\n      try { this.onToolHubSettingsEntered(); } catch(eSettingsEntered) { safeLog(this.L, \'w\', "settings entered update check fail: " + String(eSettingsEntered)); }\n    }\n    return true;',
        "settings entered hook",
    )
    write("code/th_16_entry.js", th16)

    boundaries_path = ROOT / "MODULE_BOUNDARIES.json"
    boundaries = json.loads(boundaries_path.read_text(encoding="utf-8"))
    duplicates = boundaries.get("duplicateDefinitions") or []
    boundaries["duplicateDefinitions"] = [item for item in duplicates if str(item.get("method", "")) != "startToolHubModuleUpdateFromSettings"]
    boundaries_path.write_text(json.dumps(boundaries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def patch_automation():
    shutil.copyfile(ROOT / ".agent" / "generate_signed_manifest.py", ROOT / "scripts" / "generate_signed_manifest.py")
    shutil.copyfile(ROOT / ".agent" / "verify_manifest.py", ROOT / "scripts" / "verify_manifest.py")

    sign = read(".github/workflows/sign-toolhub.yml")
    current_step = '''      - name: Check current generated artifacts
        id: current-generated
        shell: bash
        run: |
          current=false
          if python3 scripts/verify_manifest.py && python3 .github/scripts/verify_manifest_signature.py; then
            current=true
          fi
          echo "current_generated=$current"
          echo "current=$current" >> "$GITHUB_OUTPUT"

      - name: Generate signed manifest'''
    sign = regex_once(
        sign,
        r"      - name: Check current generated artifacts\n.*?\n      - name: Generate signed manifest",
        current_step,
        "sign current generated step",
    )
    sign = replace_once(
        sign,
        "      - name: Verify generated storage and position\n",
        "      - name: Verify update history and page\n        shell: bash\n        run: |\n          python3 scripts/verify_update_history.py\n          python3 scripts/verify_update_version_page.py\n\n      - name: Verify generated storage and position\n",
        "sign update verifiers",
    )
    sign = replace_once(
        sign,
        "          git add manifest.json manifest.sig ToolHub.js.sha256",
        "          git add manifest.json manifest.sig ToolHub.js.sha256 update_history.json updates/records",
        "sign git add",
    )
    sign = sign.replace('git commit -m "统一 Rhino UI 颜色安全调用"', 'git commit -m "生成更新记录与签名产物"')
    write(".github/workflows/sign-toolhub.yml", sign)

    rollback = read(".github/workflows/rollback-toolhub.yml")
    rollback = replace_once(
        rollback,
        '          python3 scripts/generate_signed_manifest.py --yes --title "$title" --change "$CHANGE"',
        '          python3 scripts/create_update_record.py --non-interactive --id "rollback-${GITHUB_RUN_ID}" --type fix --title "$title" --detail "$CHANGE"\n          python3 scripts/generate_signed_manifest.py --yes --title "$title" --change "$CHANGE"',
        "rollback record creation",
    )
    rollback = replace_once(
        rollback,
        "          git add ToolHub.js ToolHub.js.sha256 manifest.json manifest.sig code",
        "          git add ToolHub.js ToolHub.js.sha256 manifest.json manifest.sig update_history.json updates/records code",
        "rollback git add",
    )
    write(".github/workflows/rollback-toolhub.yml", rollback)

    publish = read(".github/workflows/publish-release.yml")
    publish = publish.replace("ToolHub.js ToolHub.js.sha256 manifest.json manifest.sig --clobber", "ToolHub.js ToolHub.js.sha256 manifest.json manifest.sig update_history.json --clobber")
    publish = publish.replace("ToolHub.js ToolHub.js.sha256 manifest.json manifest.sig --target main", "ToolHub.js ToolHub.js.sha256 manifest.json manifest.sig update_history.json --target main")
    write(".github/workflows/publish-release.yml", publish)


def patch_docs():
    readme = read("README.md")
    section = '''

## 更新与版本

设置首页提供“更新与版本”入口。进入设置页时会从 GitHub 检查已签名清单；发现子模块或入口文件更新时显示红点。更新页支持查看完整待更新模块、确认后事务更新、入口文件手动替换提示，以及每页 10 条的历史记录。

历史记录缓存目录：

```text
shortx.getShortXDir()/ToolHub/cache/
├── update_history.json
└── update_history.meta.json
```

维护更新记录可运行：

```bash
python3 scripts/create_update_record.py
```

GitHub Actions 会补全日期、manifest 版本、模块版本差异和入口版本差异，并生成受签名清单保护的 `update_history.json`。
'''
    if "## 更新与版本" not in readme:
        readme = readme.rstrip() + section
    write("README.md", readme)

    structure = read("STRUCTURE.md")
    section2 = '''

## 更新记录与缓存

仓库中的 `updates/records/*.json` 是更新记录源数据，`update_history.json` 是自动聚合产物。运行设备将已校验历史缓存到 `ToolHub/cache/`；缓存损坏或网络失败不会影响子模块启动和事务更新。
'''
    if "## 更新记录与缓存" not in structure:
        structure = structure.rstrip() + section2
    write("STRUCTURE.md", structure)


def cleanup():
    for rel in (
        ".agent/update_extension.js",
        ".agent/generate_signed_manifest.py",
        ".agent/verify_manifest.py",
        ".agent/apply_update_version_page.py",
        ".github/workflows/agent-apply-update-version-page.yml",
    ):
        path = ROOT / rel
        if path.exists():
            path.unlink()
    agent = ROOT / ".agent"
    if agent.exists() and not any(agent.iterdir()):
        agent.rmdir()


def main():
    patch_runtime()
    patch_automation()
    patch_docs()
    cleanup()
    print("ToolHub update-and-version page migration applied.")


if __name__ == "__main__":
    main()
