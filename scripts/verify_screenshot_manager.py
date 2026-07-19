#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding="utf-8")

def require(value, message):
    if not value:
        raise SystemExit("FAIL screenshot-manager: " + message)

base = read("code/th_01_base.js")
action = read("code/th_11_action.js")
editor = read("code/th_14_button_editor.js")
routes = read("code/th_15_extra.js")
th22 = read("code/th_22_image_viewer.js")
th23 = read("code/th_23_screenshot_manager.js")
entry = read("ToolHub.js")
generator = read("scripts/generate_signed_manifest.py")
boundaries = read("MODULE_BOUNDARIES.json")
workflow = read(".github/workflows/verify.yml")

require('// @version 1.3.1' in th22, 'th22 service version')
require('// @version 1.0.5' in th23, 'th23 version')
require('getPickwordImageService' in th22, 'service API')
for marker in ('listInternal', 'listSaved', 'saveInternal', 'prepareShareInternal', 'deleteInternal', 'loadSavedThumbnail', 'prepareSavedUri', 'deleteSaved', 'clearSavedRecord', 'launchShare', 'launchView'):
    require(marker in th22, 'service method ' + marker)
require('normalizeInternalFile22' in th22 and '截图路径越界' in th22, 'internal boundary')
require('normalizePublicFile22' in th22 and '公共图片路径越界' in th22, 'public boundary')
require('safeMediaUri22' in th22 and 'authority.indexOf("media")' in th22, 'media URI boundary')
require('buildScreenshotManagerPanelView' in th23, 'manager panel')
require('内部截图' in th23 and '已保存' in th23, 'dual tabs')
require('永久删除已保存副本？' in th23 and '永久删除公共副本' in th23, 'saved delete extra warning')
require('已保存到系统相册的公共副本不会删除' in th23, 'internal delete boundary copy')
require('createPickwordImageController' in th23, 'internal original viewer reuse')
require('var modalHost = new android.widget.FrameLayout(context)' in th23 and 'showModal23("viewer", overlay)' in th23, 'manager modal host missing')
require('modalHost.bringToFront()' in th23 and 'modalHost.setElevation(dp23(self, 96))' in th23, 'manager modal z-order enforcement missing')
require('screenshot manager confirm show action=' in th23 and 'screenshot manager confirm accept action=' in th23, 'manager confirm diagnostics missing')
require('toolhubSafeSetBackgroundColor(overlay, 0x99000000 | 0)' in th23, 'manager confirm scrim missing')
require('activeOverlay' not in th23 and 'activeViewerView' in th23 and 'activeManagerConfirm' in th23, 'manager overlay states must be separated')
require('function postAlways23(fn)' in th23, 'cleanup callback dispatcher missing')
require('function createCard(record, token)' in th23 and 'createCard(records[i], token)' in th23, 'thumbnail generation token missing')
require('detached || !isCurrent(token)' in th23 and 'if (!posted) recycle23(finalBitmap)' in th23, 'stale thumbnail recycle missing')
require('if (record.savedAt > 0) { status.setText' not in th23, 'saved marker must not bypass availability validation')
require('result && result.reused ? "公共副本仍可用" : "保存成功"' in th23, 'saved copy revalidation result missing')
require('function loadSavedCopy22(internalPath)' in th22, 'saved-copy query helper missing')
require("saved_at>0 AND (saved_public_path<>'' OR saved_content_uri<>'')" in th22, 'saved-copy query must use public-copy state')
require('internal_path=? AND deleted_at=0' not in th22, 'saved-copy query must not depend on internal deletion state')
require('clearSavedRecord22' in th22 and 'clearSavedRecord: function' in th22, 'stale saved-record cleanup API missing')
require('record.available === true' in th23 and '清理失效记录？' in th23, 'saved action availability boundary missing')
require('function queryMediaUriState22(rawUri)' in th22 and 'function rootPublicFileState22(appObj, rawPath)' in th22, 'saved-copy multi-source probes missing')
require('function probeSavedCopy22(appObj, row, stage)' in th22 and 'definitiveMissing' in th22 and 'uncertain' in th22, 'saved-copy evidence state missing')
require('function listSavedImages22(appObj)' in th22 and 'probeSavedCopy22(appObj, row, "list_saved")' in th22, 'saved-list app-context probe missing')
require('公共副本状态未确认，不能清理记录' in th22 and 'clearSavedRecord22(appObj, internalPath)' in th22, 'clear record second verification missing')
require('var canClearSaved = !savedAvailable && record.definitiveMissing === true' in th23, 'clear action must require definitive missing state')
require('公共副本存在 · 预览受限' in th23 and '公共副本状态待确认' in th23, 'saved state UI distinction missing')
require('deleted = !file.exists() || file.delete();' not in th22, 'Java-invisible public file must not count as deleted')
require('function rootDeleteInternal22(appObj, rawPath)' in th22 and 'deleteInternalImage22(appObj, internalPath)' in th22, 'internal delete Java-to-Shell fallback missing')
require('content delete --uri' in th22 and 'rootDeletePublic22(appObj, publicPath, safeUri)' in th22, 'public delete Shell bridge must remove provider row and files')
require('function verifySavedDelete22(appObj, row)' in th22 and 'delete_saved_verify_' in th22, 'public delete post-verification missing')
require('mediaRowExists' in th22 and '!state.mediaRowExists' in th22, 'definitive missing must require MediaStore row absence')
require('var deletion = emptyRecord ? { ok: true } : deleteContent22' in th22 and 'deletion.ok === true' in th22, 'share export cleanup must honor structured delete result')
require('screenshot manager action fail action=' in th23 and 'actionContext23(record)' in th23, 'manager action diagnostics missing')
require('service.loadSavedThumbnail(record.internalPath, 360)' in th23, 'saved thumbnail must use service layer')
require('公共副本存在 · 缩略图可用' in th23 and 'thumbnailSource' in th23, 'saved thumbnail UI state missing')
require('decodeUri23' not in th23 and 'record.kind === "saved"' in th23, 'saved public decoding must leave UI module')
require('open_screenshot_manager' in action and 'showToolApp("screenshot_manager", true)' in action, 'button action')
require('screenshot_manager' in routes and '截图管理器' in routes, 'toolapp route')
require('builtin_screenshot_manager' in base and 'BUTTONS_MIGRATION_VERSION = 3' in base, 'button migration v3')
require('open_screenshot_manager' in editor and '截图管理' in editor, 'button editor support')
require('th_23_screenshot_manager.js' in entry and 'th_23_screenshot_manager.js' in generator, 'module lists')
require('buildScreenshotManagerPanelView' in boundaries and 'getPickwordImageService' in boundaries, 'module owners')
require('verify_screenshot_manager.py' in workflow, 'workflow verification')
for source, name in ((th22, 'th22'), (th23, 'th23')):
    for banned in (r'\blet\b', r'\bconst\b', r'=>', r'`'):
        require(re.search(banned, source) is None, name + ' ES6 token ' + banned)
print('OK screenshot-manager saved_thumbnail=service,cache,provider,shell bitmap=caller_owned migration=3')
