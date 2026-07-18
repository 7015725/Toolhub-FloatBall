#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def text(path):
    return (ROOT / path).read_text(encoding="utf-8")

def require(value, message):
    if not value:
        raise SystemExit("FAIL pickword-image-viewer: " + message)

base = text("code/th_01_base.js")
ui = text("code/th_13_panel_ui.js")
panels = text("code/th_14_panels.js")
th18 = text("code/th_18_pointer_ocr.js")
th20 = text("code/th_20_pickword.js")
th21 = text("code/th_21_result_preview.js")
th22 = text("code/th_22_image_viewer.js")
entry = text("ToolHub.js")

require('allowEmptyText: !hasText && screenshotOk' in th18, "OCR empty screenshot preview missing")
require('kind: hasText ? "text" : "image"' in th18, "OCR preview kind missing")
require('allowEmptyText: allowEmptyText' in th21, "preview normalized empty-image flag missing")
require('allowEmptyText: payload.allowEmptyText === true' in th21, "preview handoff metadata missing")
require('addPickwordTextArea20(mainLayout, scrollView' in th20, "pickword text/image layout host missing")
require('meta.internalPath' in th20 and 'meta.screenshotPath' in th20, "pickword image meta idempotent path handoff missing")
require('sourceField=" + sourceField' in th20, "pickword image meta source-field log missing")
require('thumbnailAttached=" + String(!!(thumb && thumb.getParent()))' in th20, "thumbnail attachment log missing")
require('removePickwordImageAfterDelete20' in th20, "delete must preserve text and remove image host")
require('onSaved: function(info)' in th20 and 'onDeleted: function(info)' in th20, "stage2 callbacks missing")
require('createPickwordImageController' in th22, "image controller missing")
require('BitmapRegionDecoder' in th22, "large image region decode missing")
require('ScaleGestureDetector' in th22 and 'GestureDetector' in th22, "image gestures missing")
require('MediaStore.MediaColumns.RELATIVE_PATH' in th22, "MediaStore relative path missing")
require('MediaStore.MediaColumns.IS_PENDING' in th22, "MediaStore pending transaction missing")
require('Intent.EXTRA_STREAM' in th22 and 'FLAG_GRANT_READ_URI_PERMISSION' in th22, "content URI sharing missing")
require('ClipData.newRawUri' in th22, "share ClipData grant missing")
require('toolhub_pickword_images' in th22 and 'toolhub_pickword_image_exports' in th22, "image SQLite tables missing")
require('expiresAt = now22() + 24 * 60 * 60 * 1000' in th22, "24-hour share expiry missing")
require('PICKWORD_IMAGE_RETENTION_DAYS' in base and 'default: 7' in base, "7-day retention config missing")
require('PICKWORD_IMAGE_PUBLIC_DIR' in base and '/storage/emulated/0/Pictures/ToolHub' in base, "public directory config missing")
require('type: "pickword_image_settings"' in base, "image settings schema item missing")
require('createPickwordImageSettingsView' in ui, "image settings UI missing")
require('validatePickwordImagePublicDir' in th22 and 'runPickwordImageCleanupNow' in th22, "settings runtime methods missing")
require('公共保存副本不会被自动清理' in th22, "public-copy cleanup boundary missing")
require('normalizeInternalFile22(path)' in th22 and '截图路径越界' in th22, "internal delete boundary missing")
require('永久删除这张截图？' in th22, "delete confirmation missing")
require('ShareTemp' in th22, "share temp directory missing")
require('{ key: "pickword", title: "拾字"' in panels and '截图保存' in panels, "pickword settings description missing")
require('th_22_image_viewer.js' in entry, "entry module list missing")
require('file://' not in th22, "file URI sharing must not be used")
for banned in (r'\blet\b', r'\bconst\b', r'=>', r'`'):
    require(re.search(banned, th22) is None, "ES6 token in th_22: %s" % banned)
print("OK pickword-image-viewer stage2 save=media_store share=content_uri delete=internal sqlite=tracked cleanup=7d")
