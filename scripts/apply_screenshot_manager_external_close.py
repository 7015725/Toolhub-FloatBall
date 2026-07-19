#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path, old, new, label):
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit("FAIL external-close: %s count=%d" % (label, count))
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


def require(condition, message):
    if not condition:
        raise SystemExit("FAIL external-close: " + message)


th23_path = "code/th_23_screenshot_manager.js"
verify_path = "scripts/verify_screenshot_manager.py"
record_path = ROOT / "updates/records/20260720-screenshot-manager-external-close.json"

replace_once(
    th23_path,
    "// @version 1.0.5",
    "// @version 1.0.6",
    "th23 version",
)

replace_once(
    th23_path,
    '    var activeModalKind = "";\n',
    '    var activeModalKind = "";\n    var externalLaunchClosing = false;\n',
    "external close state",
)

post_anchor = '''    function postAlways23(fn) {
      try {
        return handler.post(new java.lang.Runnable({ run: function() {
          try { fn(); } catch (eRun) {}
        }})) === true;
      } catch (ePost) {}
      return false;
    }

'''
post_insert = post_anchor + '''    function closeAfterExternalLaunch23(actionId, record) {
      if (externalLaunchClosing || detached) return false;
      if (!self.state || self.state.toolAppActive !== true ||
          String(self.state.toolAppRoute || "") !== "screenshot_manager") {
        safeActionLog23(self, "w", "screenshot manager external close skipped action=" +
          String(actionId || "unknown") + " reason=route_not_active " + actionContext23(record));
        return false;
      }
      externalLaunchClosing = true;
      safeActionLog23(self, "i", "screenshot manager external launch success action=" +
        String(actionId || "unknown") + " closeToolApp=true " + actionContext23(record));
      try {
        if (typeof self.closeToolApp !== "function") throw new Error("ToolApp关闭入口不可用");
        self.closeToolApp();
        return true;
      } catch (eClose) {
        externalLaunchClosing = false;
        safeActionLog23(self, "w", "screenshot manager external close fail action=" +
          String(actionId || "unknown") + " error=" + String(eClose));
        throw eClose;
      }
    }

    function launchExternalAndClose23(actionId, record, launcher, result) {
      if (typeof launcher !== "function") throw new Error("系统页面启动入口不可用");
      var launched = launcher(result);
      if (launched !== true) throw new Error("系统页面启动失败");
      closeAfterExternalLaunch23(actionId, record);
      return true;
    }

'''
replace_once(th23_path, post_anchor, post_insert, "external close helpers")

replace_once(
    th23_path,
    '          onShared: function() { status.setText("已打开分享面板"); },',
    '          onShared: function(result) { closeAfterExternalLaunch23("share_internal_viewer", record); },',
    "internal viewer share callback",
)

replace_once(
    th23_path,
    '          runAction("share_internal", "正在准备分享…", record, function() { return service.prepareShareInternal(record.internalPath); }, function(result) { service.launchShare(result); status.setText("已打开分享面板"); });',
    '          runAction("share_internal", "正在准备分享…", record, function() { return service.prepareShareInternal(record.internalPath); }, function(result) { launchExternalAndClose23("share_internal_card", record, service.launchShare, result); });',
    "internal card share",
)

replace_once(
    th23_path,
    '          runAction("open_saved", "正在打开公共副本…", record, function() { return service.prepareSavedUri(record.internalPath); }, function(result) { service.launchView(result); status.setText("已交给系统图片查看器"); });',
    '          runAction("open_saved", "正在打开公共副本…", record, function() { return service.prepareSavedUri(record.internalPath); }, function(result) { launchExternalAndClose23("open_saved", record, service.launchView, result); });',
    "saved open",
)

replace_once(
    th23_path,
    '          runAction("share_saved", "正在准备分享…", record, function() { return service.prepareSavedUri(record.internalPath); }, function(result) { service.launchShare(result); status.setText("已打开分享面板"); });',
    '          runAction("share_saved", "正在准备分享…", record, function() { return service.prepareSavedUri(record.internalPath); }, function(result) { launchExternalAndClose23("share_saved", record, service.launchShare, result); });',
    "saved share",
)

replace_once(
    verify_path,
    "require('// @version 1.0.5' in th23, 'th23 version')",
    "require('// @version 1.0.6' in th23, 'th23 version')",
    "verify th23 version",
)

verify_anchor = "require('screenshot manager action fail action=' in th23 and 'actionContext23(record)' in th23, 'manager action diagnostics missing')\n"
verify_insert = verify_anchor + '''require('var externalLaunchClosing = false' in th23, 'external launch close reentry guard missing')
require('function closeAfterExternalLaunch23(actionId, record)' in th23, 'external launch close helper missing')
require('function launchExternalAndClose23(actionId, record, launcher, result)' in th23, 'external launcher helper missing')
require('String(self.state.toolAppRoute || "") !== "screenshot_manager"' in th23, 'external close route guard missing')
require('typeof self.closeToolApp !== "function"' in th23 and 'self.closeToolApp();' in th23, 'ToolApp close path missing')
require('share_internal_card' in th23 and 'share_internal_viewer' in th23 and 'open_saved' in th23 and 'share_saved' in th23, 'external entry close coverage missing')
require('onShared: function(result) { closeAfterExternalLaunch23("share_internal_viewer", record); }' in th23, 'viewer share close callback missing')
require('launchExternalAndClose23("share_internal_card", record, service.launchShare, result)' in th23, 'internal card share close missing')
require('launchExternalAndClose23("open_saved", record, service.launchView, result)' in th23, 'saved open close missing')
require('launchExternalAndClose23("share_saved", record, service.launchShare, result)' in th23, 'saved share close missing')
require('service.launchShare(result); status.setText("已打开分享面板");' not in th23, 'share success must not update detached status')
require('service.launchView(result); status.setText("已交给系统图片查看器");' not in th23, 'view success must not update detached status')
require('closeToolApp' not in th22, 'image service must not own screenshot manager lifecycle')
'''
replace_once(verify_path, verify_anchor, verify_insert, "verify external close assertions")

th23 = (ROOT / th23_path).read_text(encoding="utf-8")
verify = (ROOT / verify_path).read_text(encoding="utf-8")
require('// @version 1.0.6' in th23, 'updated th23 version missing')
require('closeAfterExternalLaunch23' in th23 and 'launchExternalAndClose23' in th23, 'helpers missing after patch')
require('share_internal_card' in th23 and 'share_internal_viewer' in th23, 'internal share coverage missing')
require('launchExternalAndClose23("open_saved"' in th23, 'saved open coverage missing')
require('launchExternalAndClose23("share_saved"' in th23, 'saved share coverage missing')
require("@version 1.0.6" in verify, 'verifier version assertion missing')

if record_path.exists():
    raise SystemExit("FAIL external-close: update record already exists")
record = {
    "schema": 1,
    "id": "20260720-screenshot-manager-external-close",
    "type": "fix",
    "title": "截图管理器外部打开后自动关闭",
    "details": [
        "截图管理器内部截图卡片分享成功拉起系统分享面板后，关闭整个截图管理器 ToolApp。",
        "内部截图原图查看器分享成功后，通过外层回调关闭截图管理器，不让图片服务直接管理 ToolApp 生命周期。",
        "已保存分类的打开和分享在系统相册、图片查看器或分享面板成功启动后关闭截图管理器。",
        "系统 Intent 启动失败时保留当前页面并显示原有错误，不提前关闭截图管理器。",
        "关闭统一复用 closeToolApp 与页面 detach 清理链，释放 Controller、Bitmap、线程池和 modalHost，仅保留悬浮球。"
    ],
    "manifestVersion": 0,
    "date": "2026-07-20",
    "modules": [
        {
            "name": "th_23_screenshot_manager.js",
            "from": "1.0.5",
            "to": "1.0.6",
            "change": "updated"
        }
    ],
    "entry": {
        "changed": False,
        "from": 20260719024500,
        "to": 20260719024500
    }
}
record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("OK external-close th23=1.0.6 entries=4 service_unchanged=true")
