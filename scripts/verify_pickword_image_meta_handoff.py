#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "code" / "th_20_pickword.js").read_text(encoding="utf-8")


def require(value, message):
    if not value:
        raise SystemExit("FAIL pickword-image-meta-handoff: " + message)


require(SOURCE.startswith("// @version 1.0.20\n"), "th_20 version must be 1.0.20")
match = re.search(
    r"function normalizePickwordImageMeta20\(meta\) \{(?P<body>.*?)\n    \}\n\n    function releasePickwordImageController20",
    SOURCE,
    re.S,
)
require(match is not None, "normalizer block missing")
body = match.group("body")
require('if (meta.internalPath)' in body, "normalized internalPath is not accepted")
require('meta.screenshotPath' in body, "raw screenshotPath fallback missing")
require(body.index('if (meta.internalPath)') < body.index('meta.screenshotPath'), "internalPath must be preferred")
require('internalPath: String(canonical)' in body, "canonical internalPath output missing")
require('APP_ROOT_DIR' in body and 'new java.io.File(rootText).getCanonicalFile(), "screenshots"' in body, "active-channel screenshot boundary missing")
require('ToolHub/screenshots' not in body and 'shortx.getShortXDir()' not in body, "stable screenshot root must not be accepted")
require('meta.deleted === true || meta.available === false' in body, "deleted/unavailable meta guard missing")
require('meta.imageOnly === true || meta.allowEmptyText === true' in body, "imageOnly state is not preserved")
require('sourceField = "internalPath"' in body and 'sourceField = "screenshotPath"' in body, "source-field classification missing")
require('pickword image meta normalized path=' in body, "normalization success log missing")
require('pickword image layout mode=text_only controller=false thumbnailAttached=false' in SOURCE, "text-only fallback log missing")
require('pickword image layout mode=' in SOURCE and 'thumbnailAttached=' in SOURCE, "actual layout attachment log missing")
require('currentPickwordMeta20 = normalizePickwordImageMeta20(meta);' in SOURCE, "second normalization path missing from test boundary")
print("OK pickword_image_meta_handoff idempotent=internalPath|screenshotPath logs=meta+layout")
