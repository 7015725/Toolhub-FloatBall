#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def text(path):
    return (ROOT / path).read_text(encoding="utf-8")

def require(value, message):
    if not value:
        raise SystemExit("FAIL pickword-image-viewer: " + message)

th18 = text("code/th_18_pointer_ocr.js")
th20 = text("code/th_20_pickword.js")
th21 = text("code/th_21_result_preview.js")
th22 = text("code/th_22_image_viewer.js")
entry = text("ToolHub.js")

require('allowEmptyText: !hasText && screenshotOk' in th18, "OCR empty screenshot preview missing")
require('kind: hasText ? "text" : "image"' in th18, "OCR preview kind missing")
require('allowEmptyText: allowEmptyText' in th21, "preview normalized empty-image flag missing")
require('ocrStatus: String(src.ocrStatus' in th21, "preview OCR status missing")
require('allowEmptyText: payload.allowEmptyText === true' in th21, "preview handoff metadata missing")
require('addPickwordTextArea20(mainLayout, scrollView' in th20, "pickword text/image layout host missing")
require('openPickwordImagePage20' in th20 and 'restorePickwordResultPage20' in th20, "same-root image page state missing")
require('startBigBang(displayText, ps.meta)' in th20, "pickword metadata pipeline missing")
require('createPickwordImageController' in th22, "image controller missing")
require('BitmapRegionDecoder' in th22, "large image region decode missing")
require('ScaleGestureDetector' in th22 and 'GestureDetector' in th22, "image gestures missing")
require('th_22_image_viewer.js' in entry, "entry module list missing")
for banned in (r'\blet\b', r'\bconst\b', r'=>', r'`'):
    require(re.search(banned, th22) is None, "ES6 token in th_22: %s" % banned)
print("OK pickword-image-viewer stage1")
