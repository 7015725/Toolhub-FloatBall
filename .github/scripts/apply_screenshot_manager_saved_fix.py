#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]


def fail(message):
    raise SystemExit("FAIL screenshot-manager-saved-fix: " + message)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail("%s expected once, found %d" % (label, count))
    return text.replace(old, new, 1)


def patch_th22():
    path = ROOT / "code" / "th_22_image_viewer.js"
    text = path.read_text(encoding="utf-8")
    text = replace_once(text, "// @version 1.2.7", "// @version 1.2.8", "th22 version")

    old_load = '''  function loadSaved22(internalPath) {
    return withDb22(function(db) {
      var cursor = null;
      try {
        cursor = db.rawQuery("SELECT saved_public_path,saved_content_uri,saved_at FROM toolhub_pickword_images WHERE internal_path=? AND deleted_at=0", stringArgs22([internalPath]));
        if (!cursor.moveToFirst()) return null;
        return {
          publicPath: String(cursor.getString(0) || ""),
          contentUri: String(cursor.getString(1) || ""),
          savedAt: Number(cursor.getLong(2) || 0)
        };
      } finally {
        try { if (cursor) cursor.close(); } catch (eClose) {}
      }
    }, null);
  }
'''
    new_load = '''  function loadSavedCopy22(internalPath) {
    return withDb22(function(db) {
      var cursor = null;
      try {
        cursor = db.rawQuery("SELECT saved_public_path,saved_content_uri,saved_at,deleted_at FROM toolhub_pickword_images WHERE internal_path=? AND saved_at>0 AND (saved_public_path<>'' OR saved_content_uri<>'') LIMIT 1", stringArgs22([internalPath]));
        if (!cursor.moveToFirst()) return null;
        return {
          publicPath: String(cursor.getString(0) || ""),
          contentUri: String(cursor.getString(1) || ""),
          savedAt: Number(cursor.getLong(2) || 0),
          internalDeleted: Number(cursor.getLong(3) || 0) > 0
        };
      } finally {
        try { if (cursor) cursor.close(); } catch (eClose) {}
      }
    }, null);
  }
'''
    text = replace_once(text, old_load, new_load, "saved-copy query")
    text = text.replace("loadSaved22(", "loadSavedCopy22(")
    if "loadSaved22(" in text:
        fail("legacy loadSaved22 call remains")

    clear_anchor = '''  function clearImageSaved22(internalPath) {
    return withDb22(function(db) {
      var stmt = null;
      try {
        stmt = db.compileStatement("UPDATE toolhub_pickword_images SET saved_public_path='', saved_content_uri='', saved_at=0, last_access_at=? WHERE internal_path=?");
        stmt.bindLong(1, now22());
        bindText22(stmt, 2, internalPath);
        return Number(stmt.executeUpdateDelete()) > 0;
      } finally {
        try { if (stmt) stmt.close(); } catch (eClose) {}
      }
    }, false);
  }
'''
    clear_replacement = clear_anchor + '''
  function clearSavedRecord22(internalPath) {
    var path = String(internalPath || "");
    var row = loadSavedCopy22(path);
    if (!row) return { ok: true, alreadyMissing: true, internalPath: path };
    if (!clearImageSaved22(path)) throw new Error("保存记录清理失败");
    return { ok: true, recordCleared: true, internalPath: path, clearedAt: now22() };
  }
'''
    text = replace_once(text, clear_anchor, clear_replacement, "clear saved record helper")

    old_delete = '''  function deleteSavedImage22(appObj, internalPath) {
    var row = loadSavedCopy22(String(internalPath || ""));
    if (!row) return { ok: true, missing: true, internalPath: String(internalPath || "") };
    var safeUri = safeMediaUri22(row.contentUri);
    var safePath = "";
    if (row.publicPath) {
      try { safePath = String(normalizePublicFile22(row.publicPath).getCanonicalPath()); } catch (ePath) { safePath = ""; }
    }
    if (!safeUri && !safePath) throw new Error("公共副本路径不安全");
    var deleted = deleteContent22(appObj, safeUri, safePath);
    if (!deleted) throw new Error("公共副本删除失败");
    clearImageSaved22(String(internalPath || ""));
    return { ok: true, internalPath: String(internalPath || ""), deletedAt: now22() };
  }
'''
    new_delete = '''  function deleteSavedImage22(appObj, internalPath) {
    var path = String(internalPath || "");
    var row = loadSavedCopy22(path);
    if (!row) return { ok: true, alreadyMissing: true, internalPath: path };
    var safeUri = safeMediaUri22(row.contentUri);
    var safePath = "";
    if (row.publicPath) {
      try { safePath = String(normalizePublicFile22(row.publicPath).getCanonicalPath()); } catch (ePath) { safePath = ""; }
    }
    if (!safeUri && !safePath) throw new Error("公共副本路径不安全");
    var deleted = deleteContent22(appObj, safeUri, safePath);
    if (!deleted) {
      var stillAvailable = false;
      try { stillAvailable = !!(safeUri && uriReadable22(safeUri)); } catch (eUri) {}
      if (!stillAvailable && safePath) {
        try { stillAvailable = isImageFile22(new java.io.File(safePath)); } catch (eFile) {}
      }
      if (stillAvailable) throw new Error("公共副本删除失败");
      if (!clearImageSaved22(path)) throw new Error("公共副本已不存在，但保存记录清理失败");
      return { ok: true, alreadyMissing: true, recordCleared: true, internalPath: path, deletedAt: now22() };
    }
    if (!clearImageSaved22(path)) throw new Error("公共副本已删除，但保存记录清理失败");
    return { ok: true, recordCleared: true, internalPath: path, deletedAt: now22() };
  }
'''
    text = replace_once(text, old_delete, new_delete, "saved-copy delete")

    service_old = '''          prepareSavedUri: function(internalPath) { return prepareSavedUri22(appObj, internalPath); },
          deleteSaved: function(internalPath) { return deleteSavedImage22(appObj, internalPath); },
          launchShare: function(result) { return launchShare22(result); },
'''
    service_new = '''          prepareSavedUri: function(internalPath) { return prepareSavedUri22(appObj, internalPath); },
          deleteSaved: function(internalPath) { return deleteSavedImage22(appObj, internalPath); },
          clearSavedRecord: function(internalPath) { return clearSavedRecord22(internalPath); },
          launchShare: function(result) { return launchShare22(result); },
'''
    text = replace_once(text, service_old, service_new, "service clearSavedRecord")

    missing_old = '''            if (!target.exists()) return { ok: true, alreadyMissing: true, internalPath: path };
            if (!target.isFile()) throw new Error("截图不是文件");
'''
    missing_new = '''            if (!target.exists()) {
              markImageDeleted22(path, now22());
              return { ok: true, alreadyMissing: true, internalPath: path };
            }
            if (!target.isFile()) throw new Error("截图不是文件");
'''
    text = replace_once(text, missing_old, missing_new, "missing internal delete state")

    text = replace_once(text,
        'if (String(proto.__toolHubPickwordImageViewerVersion || "") === "1.2.7") return true;',
        'if (String(proto.__toolHubPickwordImageViewerVersion || "") === "1.2.8") return true;',
        "th22 install guard")
    text = replace_once(text,
        'proto.__toolHubPickwordImageViewerVersion = "1.2.7";',
        'proto.__toolHubPickwordImageViewerVersion = "1.2.8";',
        "th22 installed version")

    path.write_text(text, encoding="utf-8")


def patch_th23():
    path = ROOT / "code" / "th_23_screenshot_manager.js"
    text = path.read_text(encoding="utf-8")
    text = replace_once(text, "// @version 1.0.1", "// @version 1.0.2", "th23 version")

    old_decode = '''  function decodeThumbnail23(record, maxEdge) {
    var opts = new android.graphics.BitmapFactory.Options();
    opts.inJustDecodeBounds = true;
    var input = null;
    try {
      if (String(record.kind || "") === "saved" && record.contentUri) {
        input = context.getContentResolver().openInputStream(android.net.Uri.parse(String(record.contentUri)));
        android.graphics.BitmapFactory.decodeStream(input, null, opts);
      } else {
        var path = String(record.kind === "saved" ? record.publicPath : record.internalPath);
        android.graphics.BitmapFactory.decodeFile(path, opts);
      }
    } finally { close23(input); }
    if (opts.outWidth <= 0 || opts.outHeight <= 0) return null;
    var actual = new android.graphics.BitmapFactory.Options();
    actual.inSampleSize = sample23(opts.outWidth, opts.outHeight, maxEdge);
    actual.inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888;
    if (String(record.kind || "") === "saved" && record.contentUri) {
      try {
        input = context.getContentResolver().openInputStream(android.net.Uri.parse(String(record.contentUri)));
        return android.graphics.BitmapFactory.decodeStream(input, null, actual);
      } finally { close23(input); }
    }
    return android.graphics.BitmapFactory.decodeFile(String(record.kind === "saved" ? record.publicPath : record.internalPath), actual);
  }
'''
    new_decode = '''  function decodeUri23(rawUri, options) {
    var input = null;
    try {
      input = context.getContentResolver().openInputStream(android.net.Uri.parse(String(rawUri || "")));
      if (!input) return null;
      return android.graphics.BitmapFactory.decodeStream(input, null, options);
    } finally { close23(input); }
  }

  function decodeThumbnail23(record, maxEdge) {
    var saved = String(record.kind || "") === "saved";
    var sourceMode = "";
    var path = String(saved ? record.publicPath : record.internalPath);
    var bounds = new android.graphics.BitmapFactory.Options();
    bounds.inJustDecodeBounds = true;
    if (saved && record.contentUri) {
      try {
        decodeUri23(record.contentUri, bounds);
        if (bounds.outWidth > 0 && bounds.outHeight > 0) sourceMode = "uri";
      } catch (eUriBounds) {}
    }
    if (!sourceMode) {
      bounds = new android.graphics.BitmapFactory.Options();
      bounds.inJustDecodeBounds = true;
      try { android.graphics.BitmapFactory.decodeFile(path, bounds); } catch (eFileBounds) {}
      if (bounds.outWidth > 0 && bounds.outHeight > 0) sourceMode = "file";
    }
    if (!sourceMode) return null;
    var actual = new android.graphics.BitmapFactory.Options();
    actual.inSampleSize = sample23(bounds.outWidth, bounds.outHeight, maxEdge);
    actual.inPreferredConfig = android.graphics.Bitmap.Config.ARGB_8888;
    if (sourceMode === "uri") {
      try {
        var uriBitmap = decodeUri23(record.contentUri, actual);
        if (uriBitmap) return uriBitmap;
      } catch (eUriDecode) {}
      if (!path) return null;
    }
    return android.graphics.BitmapFactory.decodeFile(path, actual);
  }
'''
    text = replace_once(text, old_decode, new_decode, "thumbnail URI fallback")

    helper_anchor = '''  function textButton23(appObj, label, color, onClick) {
'''
    helpers = '''  function safeActionLog23(appObj, level, message) {
    try { safeLog(appObj && appObj.L ? appObj.L : null, level, String(message || "")); } catch (e0) {}
  }

  function actionContext23(record) {
    var item = record || {};
    return "kind=" + String(item.kind || "") +
      " available=" + String(item.available === true) +
      " internalDeleted=" + String(item.internalDeleted === true) +
      " internalPath=" + String(item.internalPath || "") +
      " publicPath=" + String(item.publicPath || "") +
      " contentUriPresent=" + String(!!item.contentUri);
  }

  function setActionEnabled23(view, enabled) {
    var active = enabled !== false;
    try { view.setEnabled(active); } catch (e0) {}
    try { view.setClickable(active); } catch (e1) {}
    try { view.setAlpha(active ? 1.0 : 0.38); } catch (e2) {}
  }

'''
    text = replace_once(text, helper_anchor, helpers + helper_anchor, "action helpers")

    old_run = '''    function runAction(label, worker, done) {
      if (actionBusy || detached) return;
      actionBusy = true;
      status.setText(String(label || "正在处理…"));
      actionExecutor.execute(new java.lang.Runnable({ run: function() {
        var result = null;
        var error = null;
        try { result = worker(); } catch (e0) { error = e0; }
        post(function() {
          actionBusy = false;
          if (error) {
            status.setText("操作失败：" + String(error));
            try { self.toast("操作失败"); } catch (eToast) {}
            return;
          }
          try { done(result); } catch (eDone) { status.setText("操作失败：" + String(eDone)); }
        });
      }}));
    }
'''
    new_run = '''    function runAction(actionId, label, record, worker, done) {
      if (actionBusy || detached) return false;
      actionBusy = true;
      status.setText(String(label || "正在处理…"));
      safeActionLog23(self, "i", "screenshot manager action begin action=" + String(actionId || "unknown") + " " + actionContext23(record));
      try {
        actionExecutor.execute(new java.lang.Runnable({ run: function() {
          var result = null;
          var error = null;
          try { result = worker(); } catch (e0) { error = e0; }
          var posted = post(function() {
            actionBusy = false;
            if (error) {
              safeActionLog23(self, "w", "screenshot manager action fail action=" + String(actionId || "unknown") + " " + actionContext23(record) + " error=" + String(error));
              status.setText("操作失败：" + String(error));
              try { self.toast("操作失败"); } catch (eToast) {}
              return;
            }
            try {
              done(result);
            } catch (eDone) {
              safeActionLog23(self, "w", "screenshot manager action done fail action=" + String(actionId || "unknown") + " " + actionContext23(record) + " error=" + String(eDone));
              status.setText("操作失败：" + String(eDone));
            }
          });
          if (!posted) {
            actionBusy = false;
            safeActionLog23(self, "w", "screenshot manager action post fail action=" + String(actionId || "unknown") + " " + actionContext23(record));
          }
        }}));
        return true;
      } catch (eSchedule) {
        actionBusy = false;
        safeActionLog23(self, "w", "screenshot manager action schedule fail action=" + String(actionId || "unknown") + " " + actionContext23(record) + " error=" + String(eSchedule));
        status.setText("操作失败：" + String(eSchedule));
        return false;
      }
    }
'''
    text = replace_once(text, old_run, new_run, "manager runAction")

    old_status = '''      var statusText = record.kind === "saved"
        ? (record.available ? "公共副本可用" : "公共副本不可用")
        : (record.savedAt > 0 ? "已保存公共副本" : (record.tracked ? "内部记录" : "未登记文件"));
'''
    new_status = '''      var statusText = record.kind === "saved"
        ? ((record.available ? "公共副本可用" : "公共副本不可用") + (record.internalDeleted ? " · 内部截图已清理" : ""))
        : (record.savedAt > 0 ? "已保存公共副本" : (record.tracked ? "内部记录" : "未登记文件"));
'''
    text = replace_once(text, old_status, new_status, "saved status text")

    old_add = '''      function addAction(label, color, fn) {
        var btn = textButton23(self, label, color, fn);
        var lp = new android.widget.LinearLayout.LayoutParams(0, dp23(self, 44), 1);
        lp.leftMargin = dp23(self, 5);
        actions.addView(btn, lp);
      }
'''
    new_add = '''      function addAction(label, color, fn, enabled) {
        var btn = textButton23(self, label, color, fn);
        setActionEnabled23(btn, enabled !== false);
        var lp = new android.widget.LinearLayout.LayoutParams(0, dp23(self, 44), 1);
        lp.leftMargin = dp23(self, 5);
        actions.addView(btn, lp);
        return btn;
      }
'''
    text = replace_once(text, old_add, new_add, "action enabled state")

    old_actions = '''      if (record.kind === "internal") {
        addAction("查看", colors.primary, function() { openInternal(record); });
        addAction(record.savedAt > 0 ? "已保存" : "保存", colors.primary, function() {
          runAction("正在校验并保存…", function() { return service.saveInternal(record.internalPath); }, function(result) {
            status.setText(result && result.reused ? "公共副本仍可用" : "保存成功");
            loadRecords();
          });
        });
        addAction("分享", colors.primary, function() {
          runAction("正在准备分享…", function() { return service.prepareShareInternal(record.internalPath); }, function(result) { service.launchShare(result); status.setText("已打开分享面板"); });
        });
        addAction("删除", colors.danger, function() {
          showConfirm("删除内部截图？", "将删除 ToolHub 内部截图文件。已保存到系统相册的公共副本不会删除。", "删除", false, function() {
            runAction("正在删除内部截图…", function() { return service.deleteInternal(record.internalPath); }, function() { status.setText("内部截图已删除"); loadRecords(); });
          });
        });
      } else {
        addAction("打开", colors.primary, function() {
          runAction("正在打开公共副本…", function() { return service.prepareSavedUri(record.internalPath); }, function(result) { service.launchView(result); status.setText("已交给系统图片查看器"); });
        });
        addAction("分享", colors.primary, function() {
          runAction("正在准备分享…", function() { return service.prepareSavedUri(record.internalPath); }, function(result) { service.launchShare(result); status.setText("已打开分享面板"); });
        });
        addAction("删除公共副本", colors.danger, function() {
          showConfirm("永久删除已保存副本？", "此操作会从系统相册或公共保存目录永久删除该图片，无法撤销。ToolHub 内部截图如仍存在将继续保留。", "永久删除公共副本", true, function() {
            runAction("正在删除公共副本…", function() { return service.deleteSaved(record.internalPath); }, function() { status.setText("公共副本已删除"); loadRecords(); });
          });
        });
      }
'''
    new_actions = '''      if (record.kind === "internal") {
        addAction("查看", colors.primary, function() { openInternal(record); }, true);
        addAction(record.savedAt > 0 ? "已保存" : "保存", colors.primary, function() {
          runAction("save_internal", "正在校验并保存…", record, function() { return service.saveInternal(record.internalPath); }, function(result) {
            status.setText(result && result.reused ? "公共副本仍可用" : "保存成功");
            loadRecords();
          });
        }, true);
        addAction("分享", colors.primary, function() {
          runAction("share_internal", "正在准备分享…", record, function() { return service.prepareShareInternal(record.internalPath); }, function(result) { service.launchShare(result); status.setText("已打开分享面板"); });
        }, true);
        addAction("删除", colors.danger, function() {
          showConfirm("删除内部截图？", "将删除 ToolHub 内部截图文件。已保存到系统相册的公共副本不会删除。", "删除", false, function() {
            runAction("delete_internal", "正在删除内部截图…", record, function() { return service.deleteInternal(record.internalPath); }, function() { status.setText("内部截图已删除"); loadRecords(); });
          });
        }, true);
      } else {
        var savedAvailable = record.available === true;
        addAction("打开", colors.primary, function() {
          runAction("open_saved", "正在打开公共副本…", record, function() { return service.prepareSavedUri(record.internalPath); }, function(result) { service.launchView(result); status.setText("已交给系统图片查看器"); });
        }, savedAvailable);
        addAction("分享", colors.primary, function() {
          runAction("share_saved", "正在准备分享…", record, function() { return service.prepareSavedUri(record.internalPath); }, function(result) { service.launchShare(result); status.setText("已打开分享面板"); });
        }, savedAvailable);
        if (savedAvailable) {
          addAction("删除公共副本", colors.danger, function() {
            showConfirm("永久删除已保存副本？", "此操作会从系统相册或公共保存目录永久删除该图片，无法撤销。ToolHub 内部截图如仍存在将继续保留。", "永久删除公共副本", true, function() {
              runAction("delete_saved", "正在删除公共副本…", record, function() { return service.deleteSaved(record.internalPath); }, function(result) {
                status.setText(result && result.alreadyMissing ? "公共副本记录已清理" : "公共副本已删除");
                loadRecords();
              });
            });
          }, true);
        } else {
          addAction("清理记录", colors.danger, function() {
            showConfirm("清理失效记录？", "只清理 ToolHub 中无法访问的公共副本记录，不会删除任何仍可访问的图片文件。", "清理记录", false, function() {
              runAction("clear_saved_record", "正在清理失效记录…", record, function() { return service.clearSavedRecord(record.internalPath); }, function() {
                status.setText("失效记录已清理");
                loadRecords();
              });
            });
          }, true);
        }
      }
'''
    text = replace_once(text, old_actions, new_actions, "manager actions")
    path.write_text(text, encoding="utf-8")


def patch_verify():
    path = ROOT / "scripts" / "verify_screenshot_manager.py"
    text = path.read_text(encoding="utf-8")
    text = replace_once(text, "require('// @version 1.2.7' in th22, 'th22 service version')", "require('// @version 1.2.8' in th22, 'th22 service version')", "verify th22 version")
    text = replace_once(text, "require('// @version 1.0.1' in th23, 'th23 version')", "require('// @version 1.0.2' in th23, 'th23 version')", "verify th23 version")
    text = replace_once(text,
        "for marker in ('listInternal', 'listSaved', 'saveInternal', 'prepareShareInternal', 'deleteInternal', 'prepareSavedUri', 'deleteSaved', 'launchShare', 'launchView'):",
        "for marker in ('listInternal', 'listSaved', 'saveInternal', 'prepareShareInternal', 'deleteInternal', 'prepareSavedUri', 'deleteSaved', 'clearSavedRecord', 'launchShare', 'launchView'):",
        "verify service markers")
    anchor = "require('result && result.reused ? \"公共副本仍可用\" : \"保存成功\"' in th23, 'saved copy revalidation result missing')\n"
    addition = anchor + '''require('function loadSavedCopy22(internalPath)' in th22, 'saved-copy query helper missing')
require("saved_at>0 AND (saved_public_path<>'' OR saved_content_uri<>'')" in th22, 'saved-copy query must use public-copy state')
require('internal_path=? AND deleted_at=0' not in th22, 'saved-copy query must not depend on internal deletion state')
require('clearSavedRecord22' in th22 and 'clearSavedRecord: function' in th22, 'stale saved-record cleanup API missing')
require('record.available === true' in th23 and '清理失效记录？' in th23, 'saved action availability boundary missing')
require('screenshot manager action fail action=' in th23 and 'actionContext23(record)' in th23, 'manager action diagnostics missing')
require('sourceMode === "uri"' in th23 and 'if (!path) return null' in th23, 'saved thumbnail URI-to-path fallback missing')
'''
    text = replace_once(text, anchor, addition, "verify saved-state assertions")
    text = replace_once(text,
        "print('OK screenshot-manager tabs=internal,saved actions=view,save,share,delete migration=3')",
        "print('OK screenshot-manager tabs=internal,saved actions=view,save,share,delete,clear saved_state=independent migration=3')",
        "verify summary")
    path.write_text(text, encoding="utf-8")


def create_pending_record():
    path = ROOT / "updates" / "records" / "20260719-screenshot-manager-saved-state.json"
    if path.exists():
        fail("pending release record already exists")
    data = {
        "schema": 1,
        "id": "20260719-screenshot-manager-saved-state",
        "type": "fix",
        "title": "修复截图管理已保存副本状态与失效操作",
        "details": [
            "公共副本查询不再依赖内部截图 deleted_at 状态，内部截图手动删除或自动清理后仍可打开、分享和删除已保存副本。",
            "公共副本已经在系统相册中消失时，删除操作会幂等清理 SQLite 保存字段，避免假成功后记录反复出现。",
            "已保存记录不可访问时禁用打开与分享，并提供只清理 ToolHub 元数据的失效记录入口。",
            "截图管理动作日志增加动作类型、记录状态、路径与异常正文，连续操作失败可直接定位具体阶段。",
            "缩略图在旧 Content URI 失效但公共文件仍有效时回退到文件路径解码。"
        ],
        "manifestVersion": 0
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    patch_th22()
    patch_th23()
    patch_verify()
    create_pending_record()
    print("OK screenshot-manager-saved-fix applied")


if __name__ == "__main__":
    main()
