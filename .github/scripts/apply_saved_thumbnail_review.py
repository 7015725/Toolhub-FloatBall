#!/usr/bin/env python3
from pathlib import Path

ROOT = Path.cwd()


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, value):
    (ROOT / path).write_text(value, encoding="utf-8")


def replace_once(value, old, new, label):
    count = value.count(old)
    if count != 1:
        raise SystemExit("FAIL saved-thumbnail-review %s count=%d" % (label, count))
    return value.replace(old, new, 1)


th23_path = "code/th_23_screenshot_manager.js"
th23 = read(th23_path)
th23 = replace_once(
    th23,
    '''  function recycle23(bitmap) {
    try { if (bitmap && bitmap.recycle && (!bitmap.isRecycled || bitmap.isRecycled() !== true)) bitmap.recycle(); } catch (e0) {}
  }

  function decodeThumbnail23(record, maxEdge) {''',
    '''  function recycle23(bitmap) {
    try { if (bitmap && bitmap.recycle && (!bitmap.isRecycled || bitmap.isRecycled() !== true)) bitmap.recycle(); } catch (e0) {}
  }

  function sample23(width, height, maxEdge) {
    var sample = 1;
    var limit = Math.max(64, Number(maxEdge || 360));
    while (Math.max(width / sample, height / sample) > limit) sample *= 2;
    return sample;
  }

  function decodeThumbnail23(record, maxEdge) {''',
    "restore internal sample helper",
)
write(th23_path, th23)

th22_path = "code/th_22_image_viewer.js"
th22 = read(th22_path)
th22 = replace_once(
    th22,
    '''    var temp = new java.io.File(root, thumbnailCacheKey22(internalPath) + ".stage_" + String(now22()) + ".tmp").getCanonicalFile();''',
    '''    var stageToken = String(now22()) + "_" + String(java.lang.Thread.currentThread().getId()) + "_" + String(Math.floor(Math.random() * 1000000));
    var temp = new java.io.File(root, thumbnailCacheKey22(internalPath) + ".stage_" + stageToken + ".tmp").getCanonicalFile();''',
    "unique stage token",
)
th22 = replace_once(
    th22,
    '''      try { savedThumbnailLocks22.remove(lockKey); } catch (eRemove) {}
''',
    '''''',
    "retain stable per-key lock",
)
write(th22_path, th22)

viewer_test_path = "scripts/verify_pickword_image_viewer.py"
viewer_test = read(viewer_test_path)
viewer_test = replace_once(
    viewer_test,
    '''require('function cleanupThumbnailCache22()' in th22 and 'clearSavedThumbnail22(path)' in th22, "saved thumbnail lifecycle cleanup missing")
require('loadSavedThumbnail: function(internalPath, maxEdge)' in th22, "saved thumbnail service API missing")''',
    '''require('function cleanupThumbnailCache22()' in th22 and 'clearSavedThumbnail22(path)' in th22, "saved thumbnail lifecycle cleanup missing")
require('stageToken = String(now22())' in th22 and 'Thread.currentThread().getId()' in th22, "saved thumbnail staging token must be collision resistant")
require('savedThumbnailLocks22.remove(lockKey)' not in th22, "saved thumbnail lock must remain stable while waiters can acquire it")
require('loadSavedThumbnail: function(internalPath, maxEdge)' in th22, "saved thumbnail service API missing")''',
    "viewer concurrency assertions",
)
write(viewer_test_path, viewer_test)

manager_test_path = "scripts/verify_screenshot_manager.py"
manager_test = read(manager_test_path)
manager_test = replace_once(
    manager_test,
    '''require('decodeUri23' not in th23 and 'record.kind === "saved"' in th23, 'saved public decoding must leave UI module')''',
    '''require('decodeUri23' not in th23 and 'record.kind === "saved"' in th23, 'saved public decoding must leave UI module')
require('function sample23(width, height, maxEdge)' in th23 and 'actual.inSampleSize = sample23(' in th23, 'internal thumbnail sampling helper missing')''',
    "manager internal sample assertion",
)
write(manager_test_path, manager_test)

print("OK apply-saved-thumbnail-review")
