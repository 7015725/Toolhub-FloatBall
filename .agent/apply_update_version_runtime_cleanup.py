#!/usr/bin/env python3
"""One-shot cleanup of unreachable legacy update UI/runtime code."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TH14 = ROOT / "code" / "th_14_panels.js"
VERIFY = ROOT / "scripts" / "verify_update_version_page.py"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError("%s anchor count=%d" % (label, count))
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label):
    out, count = re.subn(pattern, replacement, text, count=1, flags=re.S | re.M)
    if count != 1:
        raise RuntimeError("%s regex count=%d" % (label, count))
    return out


def patch_th14():
    text = TH14.read_text(encoding="utf-8")
    text = replace_once(text, "// @version 1.1.5", "// @version 1.1.6", "module version")

    text = regex_once(
        text,
        r"\nFloatBallAppWM\.prototype\.getToolHubUpdateVisual = function\(updateState, T, isDark\) \{.*?\n\};\n\nFloatBallAppWM\.prototype\.createToolHubUpdatePill = function\(expanded, compact, onToggle\) \{.*?\n\};\n\n",
        "\n",
        "legacy update pill and visual",
    )

    wrappers = '''FloatBallAppWM.prototype.startToolHubUpdateCheckFromSettings = function(anchorView) {
  return this.runToolHubUpdateCheck ? this.runToolHubUpdateCheck(true) : false;
};

FloatBallAppWM.prototype.startToolHubModuleUpdateFromSettings = function(anchorView) {
  return this.startToolHubModuleUpdateDeterministic ? this.startToolHubModuleUpdateDeterministic(anchorView) : false;
};

FloatBallAppWM.prototype.startToolHubRestartFromSettings = function(anchorView) {
  return this.startToolHubDeterministicRestart ? this.startToolHubDeterministicRestart() : false;
};

FloatBallAppWM.prototype.createSettingsConfigStatusPill = function'''
    text = regex_once(
        text,
        r"FloatBallAppWM\.prototype\.startToolHubUpdateCheckFromSettings = function\(anchorView\) \{.*?\nFloatBallAppWM\.prototype\.createSettingsConfigStatusPill = function",
        wrappers,
        "legacy update operation and detail block",
    )

    text = regex_once(
        text,
        r"\n  var updatePill = this\.createToolHubUpdatePill.*?\n  var lp = new android\.widget\.LinearLayout\.LayoutParams",
        "\n\n  var lp = new android.widget.LinearLayout.LayoutParams",
        "welcome update pill block",
    )

    text = replace_once(
        text,
        '  try { if (this.maybeAutoCheckToolHubUpdatesFromSettings) this.maybeAutoCheckToolHubUpdatesFromSettings(); } catch(eAutoCheckSettings) {}\n\n',
        '',
        'settings build auto-check call',
    )

    text = regex_once(
        text,
        r"\n      var updateNavPill = this\.createToolHubUpdatePill.*?\n      if \(this\.state\.settingsUpdateExpanded && this\.createToolHubUpdateDetailBox\) \{.*?\n      \}\n",
        "\n",
        "wide navigation legacy update block",
    )

    text = text.replace("    this.state.toolHubSettingsVisitSeq = 0;\n", "")
    text = text.replace("    this.state.toolHubSettingsCheckedSeq = 0;\n", "")
    text = regex_once(
        text,
        r"  FloatBallAppWM\.prototype\.onToolHubSettingsEntered = function\(\) \{\n    this\.ensureToolHubUpdateUiState\(\);\n    this\.state\.toolHubSettingsVisitSeq = numberValue\(this\.state\.toolHubSettingsVisitSeq\) \+ 1;\n    this\.state\.toolHubSettingsCheckedSeq = this\.state\.toolHubSettingsVisitSeq;\n    this\.runToolHubUpdateCheck\(false\);\n  \};",
        "  FloatBallAppWM.prototype.onToolHubSettingsEntered = function() {\n    this.ensureToolHubUpdateUiState();\n    this.runToolHubUpdateCheck(false);\n  };",
        "settings entered counters",
    )

    text = re.sub(r"^\s*(?:this|self)\.state\.toolHubUpdateHistoryLastFailureError = .*?;\n", "", text, flags=re.M)

    forbidden = [
        "createToolHubUpdatePill",
        "getToolHubUpdateVisual",
        "createToolHubUpdateDetailBox",
        "maybeAutoCheckToolHubUpdatesFromSettings",
        "settingsUpdateExpanded",
        "settingsAutoUpdateCheckRunning",
        "toolHubSettingsVisitSeq",
        "toolHubSettingsCheckedSeq",
        "toolHubUpdateHistoryLastFailureError",
    ]
    remaining = [token for token in forbidden if token in text]
    if remaining:
        raise RuntimeError("legacy tokens remain: " + ", ".join(remaining))
    for token in (
        "startToolHubUpdateCheckFromSettings",
        "startToolHubModuleUpdateFromSettings",
        "startToolHubRestartFromSettings",
        "buildToolHubUpdateVersionPanelView",
        "runToolHubUpdateCheck",
        "startToolHubModuleUpdateDeterministic",
        "startToolHubDeterministicRestart",
    ):
        if token not in text:
            raise RuntimeError("required compatibility/current method missing: " + token)
    TH14.write_text(text, encoding="utf-8")


def patch_verifier():
    text = VERIFY.read_text(encoding="utf-8")
    anchor = '    "旧延期包装边界已删除": \'"method": "startToolHubModuleUpdateFromSettings"\' not in BOUNDARIES,\n'
    addition = '''    "旧设置更新胶囊已删除": "createToolHubUpdatePill" not in TH14 and "getToolHubUpdateVisual" not in TH14,
    "旧设置更新详情已删除": "createToolHubUpdateDetailBox" not in TH14 and "settingsUpdateExpanded" not in TH14,
    "旧设置构建期自动检查已删除": "maybeAutoCheckToolHubUpdatesFromSettings" not in TH14 and "settingsAutoUpdateCheckRunning" not in TH14,
    "旧检查入口委托新链路": "return this.runToolHubUpdateCheck ? this.runToolHubUpdateCheck(true) : false;" in TH14,
    "旧更新入口委托确定性事务": "return this.startToolHubModuleUpdateDeterministic ? this.startToolHubModuleUpdateDeterministic(anchorView) : false;" in TH14,
    "旧重启入口委托确定性重启": "return this.startToolHubDeterministicRestart ? this.startToolHubDeterministicRestart() : false;" in TH14,
    "无效设置访问计数已删除": "toolHubSettingsVisitSeq" not in TH14 and "toolHubSettingsCheckedSeq" not in TH14,
    "重复历史失败错误字段已删除": "toolHubUpdateHistoryLastFailureError" not in TH14,
'''
    text = replace_once(text, anchor, addition + anchor, "verifier cleanup checks")
    VERIFY.write_text(text, encoding="utf-8")


def main():
    patch_th14()
    patch_verifier()
    print("Applied bounded update/version runtime dead-code cleanup.")


if __name__ == "__main__":
    main()
