#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, text):
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit("FAIL screenshot-cache-cleanup: %s expected=1 actual=%d" % (label, count))
    return text.replace(old, new, 1)


def replace_count(text, old, new, expected, label):
    count = text.count(old)
    if count != expected:
        raise SystemExit("FAIL screenshot-cache-cleanup: %s expected=%d actual=%d" % (label, expected, count))
    return text.replace(old, new)


th22_path = "code/th_22_image_viewer.js"
th23_path = "code/th_23_screenshot_manager.js"
viewer_verify_path = "scripts/verify_pickword_image_viewer.py"
manager_verify_path = "scripts/verify_screenshot_manager.py"
record_path = "updates/records/20260720-screenshot-cache-lifecycle-cleanup.json"

th22 = read(th22_path)
th23 = read(th23_path)
viewer_verify = read(viewer_verify_path)
manager_verify = read(manager_verify_path)

th22 = replace_once(th22, "// @version 1.3.1", "// @version 1.3.2", "th22 version")
th23 = replace_once(th23, "// @version 1.0.6", "// @version 1.0.7", "th23 version")

th22 = replace_once(
    th22,
    '''  function uriReadable22(rawUri) {\n    return uriReadableState22(rawUri).readable === true;\n  }\n\n''',
    "",
    "remove unused uriReadable22"
)

th22 = replace_once(
    th22,
    "  var savedThumbnailLocks22 = new java.util.concurrent.ConcurrentHashMap();\n",
    '''  var SAVED_THUMBNAIL_LOCK_STRIPE_COUNT22 = 32;\n  var savedThumbnailLockStripes22 = [];\n  for (var savedThumbnailLockIndex22 = 0; savedThumbnailLockIndex22 < SAVED_THUMBNAIL_LOCK_STRIPE_COUNT22; savedThumbnailLockIndex22++) {\n    savedThumbnailLockStripes22.push(new java.util.concurrent.locks.ReentrantLock());\n  }\n\n  function savedThumbnailLock22(internalPath) {\n    var key = thumbnailCacheKey22(internalPath);\n    var hash = 0;\n    for (var i = 0; i < key.length; i++) hash = ((hash * 31) + key.charCodeAt(i)) | 0;\n    var index = (hash & 0x7FFFFFFF) % SAVED_THUMBNAIL_LOCK_STRIPE_COUNT22;\n    return savedThumbnailLockStripes22[index];\n  }\n''',
    "replace thumbnail lock map"
)

old_clear = '''  function clearSavedThumbnail22(internalPath) {\n    var root = thumbnailCacheRoot22();\n    var prefix = thumbnailCacheKey22(internalPath) + "_";\n    var files = root.listFiles();\n    var result = { scanned: 0, deleted: 0, failed: 0 };\n    if (!files) return result;\n    for (var i = 0; i < files.length; i++) {\n      var file = files[i];\n      try {\n        if (!file || !file.isFile() || String(file.getName() || "").indexOf(prefix) !== 0) continue;\n        result.scanned++;\n        if (file.delete() || !file.exists()) result.deleted++;\n        else result.failed++;\n      } catch (eOne) {\n        result.failed++;\n      }\n    }\n    return result;\n  }\n'''
new_clear = '''  function clearSavedThumbnailUnlocked22(internalPath) {\n    var root = thumbnailCacheRoot22();\n    var prefix = thumbnailCacheKey22(internalPath) + "_";\n    var files = root.listFiles();\n    var result = { scanned: 0, deleted: 0, failed: 0 };\n    if (!files) return result;\n    for (var i = 0; i < files.length; i++) {\n      var file = files[i];\n      try {\n        if (!file || !file.isFile() || String(file.getName() || "").indexOf(prefix) !== 0) continue;\n        result.scanned++;\n        if (file.delete() || !file.exists()) result.deleted++;\n        else result.failed++;\n      } catch (eOne) {\n        result.failed++;\n      }\n    }\n    return result;\n  }\n\n  function clearSavedThumbnail22(internalPath) {\n    var path = String(normalizeInternalFile22(internalPath).getCanonicalPath());\n    var lock = savedThumbnailLock22(path);\n    lock.lock();\n    try {\n      return clearSavedThumbnailUnlocked22(path);\n    } finally {\n      try { lock.unlock(); } catch (eUnlock) {}\n    }\n  }\n'''
th22 = replace_once(th22, old_clear, new_clear, "lock thumbnail clear")

old_ensure = '''  function ensureSavedThumbnailCache22(appObj, sourceFile, internalPath, maxEdge) {\n    var cacheFile = thumbnailCacheFile22(internalPath, maxEdge);\n    if (cacheFile.exists() && cacheFile.isFile() && cacheFile.length() > 0) return true;\n    var bitmap = null;\n    try {\n      bitmap = decodeThumbnailFile22(sourceFile, maxEdge);\n      return bitmap ? writeThumbnailCache22(bitmap, cacheFile) : false;\n    } catch (e0) {\n      try { safeLog(appObj && appObj.L ? appObj.L : null, "w", "pickword image thumbnail cache fail path=" + String(internalPath || "") + " err=" + String(e0)); } catch (eLog) {}\n      return false;\n    } finally {\n      safeRecycle22(bitmap);\n    }\n  }\n'''
new_ensure = '''  function ensureSavedThumbnailCacheUnlocked22(appObj, sourceFile, internalPath, maxEdge) {\n    var path = String(normalizeInternalFile22(internalPath).getCanonicalPath());\n    if (!loadSavedCopy22(path)) return false;\n    var cacheFile = thumbnailCacheFile22(path, maxEdge);\n    if (cacheFile.exists() && cacheFile.isFile() && cacheFile.length() > 0) return true;\n    var bitmap = null;\n    try {\n      bitmap = decodeThumbnailFile22(sourceFile, maxEdge);\n      return bitmap ? writeThumbnailCache22(bitmap, cacheFile) : false;\n    } catch (e0) {\n      try { safeLog(appObj && appObj.L ? appObj.L : null, "w", "pickword image thumbnail cache fail path=" + path + " err=" + String(e0)); } catch (eLog) {}\n      return false;\n    } finally {\n      safeRecycle22(bitmap);\n    }\n  }\n\n  function ensureSavedThumbnailCache22(appObj, sourceFile, internalPath, maxEdge) {\n    var path = String(normalizeInternalFile22(internalPath).getCanonicalPath());\n    var lock = savedThumbnailLock22(path);\n    lock.lock();\n    try {\n      return ensureSavedThumbnailCacheUnlocked22(appObj, sourceFile, path, maxEdge);\n    } finally {\n      try { lock.unlock(); } catch (eUnlock) {}\n    }\n  }\n'''
th22 = replace_once(th22, old_ensure, new_ensure, "lock thumbnail ensure")

load_start = th22.find("  function loadSavedThumbnail22(appObj, internalPath, maxEdge) {")
load_end = th22.find("\n  function savePermanent22(appObj, sourceFile, session) {", load_start)
if load_start < 0 or load_end < 0:
    raise SystemExit("FAIL screenshot-cache-cleanup: locate loadSavedThumbnail22")
new_load = '''  function loadSavedThumbnail22(appObj, internalPath, maxEdge) {\n    var path = String(normalizeInternalFile22(internalPath).getCanonicalPath());\n    var lock = savedThumbnailLock22(path);\n    var bitmap = null;\n    var stage = null;\n    lock.lock();\n    try {\n      var row = loadSavedCopy22(path);\n      if (!row) throw new Error("已保存记录不存在");\n      row.internalPath = path;\n      var limit = Math.max(96, Math.min(1024, int22(maxEdge, 360)));\n      var cacheFile = thumbnailCacheFile22(path, limit);\n      var source = "";\n      var cached = false;\n      var failures = [];\n      try {\n        bitmap = decodeThumbnailFile22(cacheFile, limit);\n        if (bitmap) { source = "cache"; cached = true; }\n        else if (cacheFile.exists()) cacheFile.delete();\n      } catch (eCache) { failures.push("cache=" + String(eCache)); }\n      if (!bitmap && row.contentUri) {\n        try { bitmap = loadProviderThumbnail22(row.contentUri, limit); if (bitmap) source = "provider_thumbnail"; }\n        catch (eProvider) { failures.push("provider=" + String(eProvider)); }\n      }\n      if (!bitmap && row.contentUri) {\n        try { bitmap = decodeThumbnailUri22(row.contentUri, limit); if (bitmap) source = "uri_stream"; }\n        catch (eUri) { failures.push("uri=" + String(eUri)); }\n      }\n      if (!bitmap && row.publicPath) {\n        try { bitmap = decodeThumbnailFile22(normalizePublicFile22(row.publicPath), limit); if (bitmap) source = "java_file"; }\n        catch (ePublic) { failures.push("java=" + String(ePublic)); }\n      }\n      if (!bitmap) {\n        try {\n          var internalFile = normalizeInternalFile22(path);\n          if (isImageFile22(internalFile)) {\n            bitmap = decodeThumbnailFile22(internalFile, limit);\n            if (bitmap) source = "internal_proxy";\n          }\n        } catch (eInternal) { failures.push("internal=" + String(eInternal)); }\n      }\n      if (!bitmap) {\n        try {\n          stage = stageSavedThumbnailSource22(appObj, row, path);\n          bitmap = decodeThumbnailFile22(stage, limit);\n          if (bitmap) source = "root_stage";\n        } catch (eStage) { failures.push("stage=" + String(eStage)); }\n      }\n      if (!bitmap) throw new Error("已保存缩略图读取失败: " + failures.join("; "));\n      if (!cached) {\n        try { cached = writeThumbnailCache22(bitmap, cacheFile); }\n        catch (eWrite) { failures.push("write=" + String(eWrite)); cached = false; }\n      }\n      try { safeLog(appObj && appObj.L ? appObj.L : null, "i", "pickword image saved thumbnail loaded internalPath=" + path + " source=" + source + " cached=" + String(cached) + " failures=" + failures.join("|")); } catch (eLog) {}\n      return { ok: true, bitmap: bitmap, source: source, cached: cached, callerOwnsBitmap: true };\n    } finally {\n      try { if (stage && stage.exists()) stage.delete(); } catch (eStageDelete) {}\n      try { lock.unlock(); } catch (eUnlock) {}\n    }\n  }\n'''
th22 = th22[:load_start] + new_load + th22[load_end:]

th22 = replace_once(th22, "            internalAvailable: false,\n", "", "remove internalAvailable field")
th22 = replace_once(th22, "      try { row.internalAvailable = isImageFile22(normalizeInternalFile22(row.internalPath)); } catch (eInternal) {}\n", "", "remove internalAvailable probe")

th22 = replace_count(th22, '"1.3.1"', '"1.3.2"', 2, "th22 install versions")

th23 = replace_once(
    th23,
    '''    function modalChildIndex23(parent, child) {\n      try { return parent && child ? Number(parent.indexOfChild(child)) : -1; } catch (e0) {}\n      return -1;\n    }\n\n''',
    "",
    "remove modal child diagnostic helper"
)

old_modal_log = '''      safeActionLog23(self, "i", "screenshot manager modal show kind=" + activeModalKind +\n        " rootChildren=" + String(root.getChildCount()) +\n        " panelIndex=" + String(modalChildIndex23(root, panel)) +\n        " hostIndex=" + String(modalChildIndex23(root, modalHost)) +\n        " panelElevation=" + String(panel.getElevation ? panel.getElevation() : 0) +\n        " hostElevation=" + String(modalHost.getElevation ? modalHost.getElevation() : 0) +\n        " hostWidth=" + String(modalHost.getWidth()) +\n        " hostHeight=" + String(modalHost.getHeight()));\n'''
th23 = replace_once(
    th23,
    old_modal_log,
    '      safeActionLog23(self, "i", "screenshot manager modal show kind=" + activeModalKind);\n',
    "trim modal success diagnostics"
)

old_failure = '''            } else {\n              placeholder.setText(record.available === true ? "文件存在\\n缩略图受限" : "预览失败");\n              safeActionLog23(self, "w", "screenshot manager thumbnail fail error=" + String(finalError || "") + " " + actionContext23(record));\n            }\n'''
new_failure = '''            } else {\n              if (record.kind === "saved") {\n                record.thumbnailAvailable = false;\n                record.thumbnailSource = "";\n                meta.setText(formatDate23(timeValue) + "\\n" + formatSize23(record.fileSize) + " · " + savedStatus23(record) + (record.internalDeleted ? " · 内部截图已清理" : ""));\n              }\n              placeholder.setText(record.available === true ? "文件存在\\n缩略图受限" : "预览失败");\n              safeActionLog23(self, "w", "screenshot manager thumbnail fail error=" + String(finalError || "") + " " + actionContext23(record));\n            }\n'''
th23 = replace_once(th23, old_failure, new_failure, "synchronize thumbnail failure state")

viewer_verify = replace_count(viewer_verify, "1.3.1", "1.3.2", 3, "viewer verify version")
old_lock_assert = '''require('savedThumbnailLocks22.remove(lockKey)' not in th22, "saved thumbnail lock must remain stable while waiters can acquire it")\n'''
new_lock_assert = '''require('var SAVED_THUMBNAIL_LOCK_STRIPE_COUNT22 = 32' in th22 and 'savedThumbnailLockStripes22' in th22, "fixed thumbnail lock stripes missing")\nrequire('savedThumbnailLocks22' not in th22 and 'ConcurrentHashMap' not in th22, "unbounded thumbnail lock map must stay removed")\nrequire('function savedThumbnailLock22(internalPath)' in th22, "thumbnail stripe selector missing")\nrequire('function clearSavedThumbnailUnlocked22(internalPath)' in th22 and 'function clearSavedThumbnail22(internalPath)' in th22, "locked thumbnail clear path missing")\nrequire('function ensureSavedThumbnailCacheUnlocked22(appObj, sourceFile, internalPath, maxEdge)' in th22 and 'function ensureSavedThumbnailCache22(appObj, sourceFile, internalPath, maxEdge)' in th22, "locked thumbnail ensure path missing")\nload_thumb_start = th22.find('function loadSavedThumbnail22(appObj, internalPath, maxEdge)')\nload_thumb_end = th22.find('function savePermanent22(appObj, sourceFile, session)', load_thumb_start)\nrequire(load_thumb_start >= 0 and load_thumb_end > load_thumb_start, "saved thumbnail load body missing")\nload_thumb_body = th22[load_thumb_start:load_thumb_end]\nrequire(load_thumb_body.find('var lock = savedThumbnailLock22(path)') >= 0, "saved thumbnail load lock missing")\nrequire(load_thumb_body.find('lock.lock();') < load_thumb_body.find('var row = loadSavedCopy22(path)'), "saved record must be reloaded under thumbnail lock")\n'''
viewer_verify = replace_once(viewer_verify, old_lock_assert, new_lock_assert, "viewer lock assertions")
viewer_verify = replace_once(
    viewer_verify,
    'print("OK pickword-image-viewer saved_thumbnail=cache,provider,uri,java,internal,shell bitmap=caller_owned cleanup=7d")',
    'print("OK pickword-image-viewer saved_thumbnail=stripe_lock,cache,provider,uri,java,internal,shell bitmap=caller_owned cleanup=7d")',
    "viewer verify output"
)

manager_verify = replace_once(manager_verify, "require('// @version 1.3.1' in th22, 'th22 service version')", "require('// @version 1.3.2' in th22, 'th22 service version')", "manager th22 version")
manager_verify = replace_once(manager_verify, "require('// @version 1.0.6' in th23, 'th23 version')", "require('// @version 1.0.7' in th23, 'th23 version')", "manager th23 version")
manager_anchor = "require('function sample23(width, height, maxEdge)' in th23 and 'actual.inSampleSize = sample23(' in th23, 'internal thumbnail sampling helper missing')\n"
manager_extra = manager_anchor + '''require('internalAvailable' not in th22, 'unused saved internal availability state must stay removed')\nrequire('function uriReadable22(' not in th22 and 'function uriReadableState22(' in th22, 'unused URI readability wrapper must stay removed')\nrequire('modalChildIndex23' not in th23 and 'modalHost.bringToFront()' in th23 and 'modalHost.setElevation(dp23(self, 96))' in th23, 'modal diagnostics cleanup must preserve z-order behavior')\nrequire('record.thumbnailAvailable = false;' in th23 and 'record.thumbnailSource = "";' in th23, 'thumbnail failure state reset missing')\n'''
manager_verify = replace_once(manager_verify, manager_anchor, manager_extra, "manager cleanup assertions")
manager_verify = replace_once(
    manager_verify,
    "print('OK screenshot-manager saved_thumbnail=service,cache,provider,shell bitmap=caller_owned migration=3')",
    "print('OK screenshot-manager saved_thumbnail=service,stripe_lock,failure_sync diagnostics=trimmed migration=3')",
    "manager verify output"
)

write(th22_path, th22)
write(th23_path, th23)
write(viewer_verify_path, viewer_verify)
write(manager_verify_path, manager_verify)

record = {
    "schema": 1,
    "id": "20260720-screenshot-cache-lifecycle-cleanup",
    "type": "fix",
    "title": "收口截图缩略图缓存并清理冗余状态",
    "details": [
        "缩略图缓存从按文件名永久增长的锁表改为固定 32 条带锁，长期运行时锁对象数量保持有界。",
        "已保存记录在缩略图锁内重新读取，缓存加载、生成和删除共用同一路径锁，避免删除后旧任务重新写回孤儿缓存。",
        "移除未被消费的 internalAvailable 实时探测和未使用的 uriReadable22 薄封装，保留完整 URI 错误状态探测。",
        "已保存缩略图加载失败时同步清除缩略图可用状态并刷新卡片说明，避免可用与受限提示同时出现。",
        "精简截图管理器 Modal 成功层级诊断，保留 bringToFront、Elevation、TranslationZ 和焦点控制。",
        "不改变 ShareTemp、未验证旧 URI 回退、MediaStore/Java/Root 证据模型、公共副本删除验证和外部启动关闭链。"
    ]
}
record_file = ROOT / record_path
if record_file.exists():
    raise SystemExit("FAIL screenshot-cache-cleanup: update record already exists")
record_file.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

checks = {
    "th22_version": "// @version 1.3.2" in th22,
    "th23_version": "// @version 1.0.7" in th23,
    "stripe_count": "SAVED_THUMBNAIL_LOCK_STRIPE_COUNT22 = 32" in th22,
    "map_removed": "savedThumbnailLocks22" not in th22,
    "record_under_lock": th22.find("lock.lock();", th22.find("function loadSavedThumbnail22")) < th22.find("var row = loadSavedCopy22(path)", th22.find("function loadSavedThumbnail22")),
    "internal_available_removed": "internalAvailable" not in th22,
    "uri_wrapper_removed": "function uriReadable22(" not in th22,
    "modal_diagnostic_removed": "modalChildIndex23" not in th23,
    "failure_sync": "record.thumbnailAvailable = false;" in th23,
    "share_temp_preserved": 'preparePublicDir22(appObj, "ShareTemp", !scoped)' in th22,
    "unverified_uri_preserved": "unverified: true" in th22,
    "external_close_preserved": "function launchExternalAndClose23" in th23,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit("FAIL screenshot-cache-cleanup checks: " + ",".join(failed))

print("OK screenshot-cache-cleanup " + " ".join(sorted(checks)))
