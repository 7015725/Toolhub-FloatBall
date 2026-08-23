#!/usr/bin/env python3
"""Keep the reference pickword layout inside the existing Android/API verification surface."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "code" / "th_20_pickword.js"
IMAGE_VIEWER_VERIFY = ROOT / "scripts" / "verify_pickword_image_viewer.py"
CHANNEL_STORAGE_VERIFY = ROOT / "scripts" / "verify_channel_private_storage_isolation.py"


def require(condition, message):
    if not condition:
        raise SystemExit("pickword layout API fixup failed: " + message)


def patch_pickword():
    text = TARGET.read_text(encoding="utf-8")
    require(
        text.startswith("// @version 1.0.22\n") or text.startswith("// @version 1.0.23\n") or text.startswith("// @version 1.0.24\n") or text.startswith("// @version 1.0.25\n") or text.startswith("// @version 1.0.26\n") or text.startswith("// @version 1.0.27\n") or text.startswith("// @version 1.0.28\n") or text.startswith("// @version 1.0.29\n") or text.startswith("// @version 1.0.26\n") or text.startswith("// @version 1.0.27\n") or text.startswith("// @version 1.0.28\n") or text.startswith("// @version 1.0.29\n"),
        "expected th_20 version 1.0.22, 1.0.23, 1.0.24, or 1.0.25",
    )

    if "function findPickwordTextAction20(root, labels)" not in text:
        require("function performPickwordImagePageAction20(actionIndex, unavailableText)" in text, "fixed image action helper missing")
        if text.startswith("// @version 1.0.24\n") or text.startswith("// @version 1.0.25\n") or text.startswith("// @version 1.0.26\n") or text.startswith("// @version 1.0.27\n") or text.startswith("// @version 1.0.28\n") or text.startswith("// @version 1.0.29\n") or text.startswith("// @version 1.0.26\n") or text.startswith("// @version 1.0.27\n") or text.startswith("// @version 1.0.28\n") or text.startswith("// @version 1.0.29\n"):
            require("getPickwordQrActionState" in text, "QR state bridge missing")
            require("performPickwordQrAction20(\"decode\")" in text, "QR decode bridge missing")
            require("resolvePickwordShortXActionDrawable20" in text, "ShortX image-action icon resolver missing")
        else:
            require("root.getChildAt(2)" in text, "thumbnail QR child binding missing")
        return

    start = text.find("    function findPickwordTextAction20(root, labels) {")
    end = text.find("    function createPickwordImageActionTile20(labelText, iconKind, callback) {", start)
    require(start >= 0 and end > start, "helper block anchors")

    replacement = r'''    function collapsePickwordAuxView20(viewObj) {
        if (!viewObj) return;
        try { viewObj.setVisibility(View.GONE); } catch (eVisibility) {}
    }

    function normalizePickwordThumbnailChrome20(root) {
        pickwordQrTriggerView20 = null;
        if (!root) return root;
        try {
            var childCount = Number(root.getChildCount() || 0);
            if (childCount > 0) {
                var previewImage = root.getChildAt(0);
                var imageLp = previewImage ? previewImage.getLayoutParams() : null;
                if (imageLp && imageLp.bottomMargin !== undefined) {
                    imageLp.bottomMargin = 0;
                    previewImage.setLayoutParams(imageLp);
                }
            }
            if (childCount > 1) collapsePickwordAuxView20(root.getChildAt(1));
            if (childCount > 2) {
                pickwordQrTriggerView20 = root.getChildAt(2);
                collapsePickwordAuxView20(pickwordQrTriggerView20);
            }
        } catch (eChrome) {}
        return root;
    }

    function performPickwordQrAction20(thumbRoot) {
        try {
            if (!pickwordQrTriggerView20) normalizePickwordThumbnailChrome20(thumbRoot);
            var trigger = pickwordQrTriggerView20;
            if (!trigger) {
                showToast("二维码入口暂不可用");
                return false;
            }
            try { trigger.setVisibility(View.VISIBLE); } catch (eVisible) {}
            var clicked = false;
            try { clicked = trigger.performClick() === true; } catch (eClick) { clicked = false; }
            collapsePickwordAuxView20(trigger);
            return clicked;
        } catch (eQr) {
            showToast("二维码操作失败");
        }
        return false;
    }

    function performPickwordImagePageAction20(actionIndex, unavailableText) {
        try {
            if (!pickwordImagePage20) {
                showToast(String(unavailableText || "图片操作暂不可用"));
                return false;
            }
            var bottom = pickwordImagePage20.getChildAt(2);
            var actions = bottom ? bottom.getChildAt(0) : null;
            var action = actions ? actions.getChildAt(Number(actionIndex || 0)) : null;
            if (!action) {
                showToast(String(unavailableText || "图片操作暂不可用"));
                return false;
            }
            return action.performClick() === true;
        } catch (eAction) {}
        showToast(String(unavailableText || "图片操作失败"));
        return false;
    }

'''
    text = text[:start] + replacement + text[end:]
    text = text.replace(
        'performPickwordImagePageAction20(["分享"], "截图分享暂不可用");',
        'performPickwordImagePageAction20(0, "截图分享暂不可用");',
    )
    text = text.replace(
        'performPickwordImagePageAction20(["保存", "已保存"], "截图保存暂不可用");',
        'performPickwordImagePageAction20(1, "截图保存暂不可用");',
    )

    require("function findPickwordTextAction20(root, labels)" not in text, "text-scanning helper still present")
    require("node.getText" not in text, "generic View#getText call still present")
    require('performPickwordImagePageAction20(0, "截图分享暂不可用");' in text, "share action index")
    require('performPickwordImagePageAction20(1, "截图保存暂不可用");' in text, "save action index")
    TARGET.write_text(text, encoding="utf-8")


def patch_image_viewer_verifier():
    text = IMAGE_VIEWER_VERIFY.read_text(encoding="utf-8")
    old = "require('uiDp(108, 132)' in th20 and 'uiDp(156, 220)' in th20, \"compact thumbnail/text dimensions missing\")"
    reference_only = "require('uiDp(150, 188)' in th20 and 'uiDp(164, 220)' in th20, \"reference screenshot/text dimensions missing\")"
    flexible = (
        "compact_layout = 'uiDp(108, 132)' in th20 and 'uiDp(156, 220)' in th20\n"
        "reference_layout = 'uiDp(150, 188)' in th20 and 'uiDp(164, 220)' in th20\n"
        "require(compact_layout or reference_layout, \"supported thumbnail/text dimensions missing\")"
    )
    if old in text:
        text = text.replace(old, flexible, 1)
    elif reference_only in text:
        text = text.replace(reference_only, flexible, 1)
    require(
        "reference_layout = 'uiDp(150, 188)' in th20 and 'uiDp(164, 220)' in th20" in text,
        "image viewer verifier reference dimensions",
    )
    IMAGE_VIEWER_VERIFY.write_text(text, encoding="utf-8")


def patch_channel_storage_verifier():
    text = CHANNEL_STORAGE_VERIFY.read_text(encoding="utf-8")
    old = 'require(PICKWORD.splitlines()[0] == "// @version 1.0.21", "th_20_pickword.js version must be 1.0.21")'
    legacy = 'require(PICKWORD.splitlines()[0] in ("// @version 1.0.21", "// @version 1.0.22"), "th_20_pickword.js version must be 1.0.21 or 1.0.22")'
    new = 'require(PICKWORD.splitlines()[0] in ("// @version 1.0.21", "// @version 1.0.22", "// @version 1.0.23", "// @version 1.0.24", "// @version 1.0.25", "// @version 1.0.26", "// @version 1.0.27", "// @version 1.0.28", "// @version 1.0.29"), "th_20_pickword.js version must be 1.0.21, 1.0.22, 1.0.23, 1.0.24, or 1.0.25")'
    if old in text:
        text = text.replace(old, new, 1)
    elif legacy in text:
        text = text.replace(legacy, new, 1)
    require(new in text, "channel storage verifier version compatibility")
    CHANNEL_STORAGE_VERIFY.write_text(text, encoding="utf-8")


def main():
    patch_pickword()
    patch_image_viewer_verifier()
    patch_channel_storage_verifier()
    print("OK pickword reference layout API fixup hierarchy_actions=1 generic_getText=0 verifier=v1.0.21|v1.0.22|v1.0.23")


if __name__ == "__main__":
    main()
