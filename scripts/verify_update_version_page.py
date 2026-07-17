#!/usr/bin/env python3
"""Verify ToolHub update-and-version page integration contracts."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TH03 = (ROOT / "code" / "th_03_icon.js").read_text(encoding="utf-8")
TH14 = (ROOT / "code" / "th_14_panels.js").read_text(encoding="utf-8")
BOUNDARIES = (ROOT / "MODULE_BOUNDARIES.json").read_text(encoding="utf-8")
UPDATE_ENTRY_SECTION = TH14.split("FloatBallAppWM.prototype.createToolHubUpdateHomeEntry", 1)[1].split("FloatBallAppWM.prototype.buildToolHubUpdateVersionPanelView", 1)[0]

checks = {
    "旧轮询自动重启已删除": "__toolHubWatchRestartAfterUpdate" not in TH03,
    "更新页路由存在": 'var UPDATE_ROUTE = "update"' in TH14,
    "历史缓存目录存在": 'root + "/cache"' in TH14,
    "入口更新阻止自动重启": "after.entryUpdateAvailable === true" in TH14,
    "确定性事务返回值判断": "numberValue(ret.count) <= 0" in TH14,
    "分页固定十条": "var HISTORY_PAGE_SIZE = 10" in TH14,
    "历史失败熔断存在": "var HISTORY_RETRY_COOLDOWN_MS = 30000" in TH14 and "toolHubUpdateHistoryFailedAssetKey" in TH14,
    "自动检查不强制重复下载历史": "ensureToolHubUpdateHistoryLoaded(showToast === true)" in TH14,
    "更新页面刷新合并存在": "toolHubUpdateRefreshPending" in TH14 and "UPDATE_SURFACE_REFRESH_DELAY_MS = 48" in TH14,
    "设置首页更新状态局部刷新": "refreshToolHubUpdateHomeEntry" in TH14 and "toolHubUpdateHomeSummaryView" in TH14 and "toolHubUpdateHomeRedDotView" in TH14,
    "后台检查不重建设置首页": 'else if (route === "settings") self.replaceToolAppPage("settings");' not in TH14 and "update home entry refresh deferred" in TH14,
    "历史加载诊断日志存在": "update history fetch begin" in TH14 and "update history fetch fail" in TH14 and "update history fetch done" in TH14,
    "历史 SHA256 固定输出 64 位": "hex.length() === 1" in TH14 and "new java.lang.StringBuilder(digestLength * 2)" in TH14 and "md.update(bytes, 0, byteLength)" in TH14,
    "图标 SHA256 固定输出 64 位": "hex.length() === 1" in TH03 and "new java.lang.StringBuilder(len * 2)" in TH03,
    "禁止 Java String length 属性误用": "h.length < 2" not in TH14 and "h.length < 2" not in TH03,
    "历史哈希失败保留完整诊断": "expectedHashLen=" in TH14 and "actualHashLen=" in TH14,
    "禁止 Rhino 不兼容 ScrollView.LayoutParams": "android.widget.ScrollView.LayoutParams" not in TH14,
    "ScrollView 子布局使用 FrameLayout.LayoutParams": "scroll.addView(root, new android.widget.FrameLayout.LayoutParams(-1, -2));" in TH14,
    "更新入口复用统一设置项构建器": "normalizedUpdateEntry: true" in UPDATE_ENTRY_SECTION and "return this.createSettingsHomeEntry(parent" in UPDATE_ENTRY_SECTION,
    "更新入口不再维护独立列表布局": "new android.widget.LinearLayout" not in UPDATE_ENTRY_SECTION and "row.setBackground" not in UPDATE_ENTRY_SECTION,
    "统一设置项构建器支持红点": "entryOptions.showRedDot === true" in TH14 and "badgeBox.addView(dot, dotLp)" in TH14,
    "统一设置项保留卡片阴影": "row.setElevation(this.dp(1))" in TH14,
    "设置首页使用显式合理顺序": all(marker in TH14 for marker in [
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
    "旧设置更新胶囊已删除": "createToolHubUpdatePill" not in TH14 and "getToolHubUpdateVisual" not in TH14,
    "旧设置更新详情已删除": "createToolHubUpdateDetailBox" not in TH14 and "settingsUpdateExpanded" not in TH14,
    "旧设置构建期自动检查已删除": "maybeAutoCheckToolHubUpdatesFromSettings" not in TH14 and "settingsAutoUpdateCheckRunning" not in TH14,
    "旧检查入口委托新链路": "return this.runToolHubUpdateCheck ? this.runToolHubUpdateCheck(true) : false;" in TH14,
    "旧更新入口委托确定性事务": "return this.startToolHubModuleUpdateDeterministic ? this.startToolHubModuleUpdateDeterministic(anchorView) : false;" in TH14,
    "旧重启入口委托确定性重启": "return this.startToolHubDeterministicRestart ? this.startToolHubDeterministicRestart() : false;" in TH14,
    "无效设置访问计数已删除": "toolHubSettingsVisitSeq" not in TH14 and "toolHubSettingsCheckedSeq" not in TH14,
    "重复历史失败错误字段已删除": "toolHubUpdateHistoryLastFailureError" not in TH14,
    "旧延期包装边界已删除": '"method": "startToolHubModuleUpdateFromSettings"' not in BOUNDARIES,
}
failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(("PASS" if ok else "FAIL") + ": " + name)
if failed:
    raise SystemExit("update version page verification failed: " + ", ".join(failed))
print("Update version page verification passed.")
