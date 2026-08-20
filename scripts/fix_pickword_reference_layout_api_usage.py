#!/usr/bin/env python3
"""Keep the reference pickword layout inside the existing Android API policy surface."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "code" / "th_20_pickword.js"


def require(condition, message):
    if not condition:
        raise SystemExit("pickword layout API fixup failed: " + message)


def main():
    text = TARGET.read_text(encoding="utf-8")
    require(text.startswith("// @version 1.0.22\n"), "expected th_20 version 1.0.22")

    if "function findPickwordTextAction20(root, labels)" not in text:
        require("function performPickwordImagePageAction20(actionIndex, unavailableText)" in text, "fixed image action helper missing")
        require("root.getChildAt(2)" in text, "thumbnail QR child binding missing")
        print("OK pickword reference layout API fixup already applied")
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
    text = text.replace('performPickwordImagePageAction20(["分享"], "截图分享暂不可用");', 'performPickwordImagePageAction20(0, "截图分享暂不可用");')
    text = text.replace('performPickwordImagePageAction20(["保存", "已保存"], "截图保存暂不可用");', 'performPickwordImagePageAction20(1, "截图保存暂不可用");')

    require("function findPickwordTextAction20(root, labels)" not in text, "text-scanning helper still present")
    require("node.getText" not in text, "generic View#getText call still present")
    require('performPickwordImagePageAction20(0, "截图分享暂不可用");' in text, "share action index")
    require('performPickwordImagePageAction20(1, "截图保存暂不可用");' in text, "save action index")
    TARGET.write_text(text, encoding="utf-8")
    print("OK pickword reference layout API fixup hierarchy_actions=1 generic_getText=0")


if __name__ == "__main__":
    main()
